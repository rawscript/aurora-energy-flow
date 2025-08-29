import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';
import type { Tables } from '@/integrations/supabase/types';
import { getEnergySettings } from '@/utils/energySettings';

// Base profile type from Supabase
type BaseProfile = Tables<'profiles'>;

// Extended profile type with energy settings
type Profile = BaseProfile & {
  energy_provider: string;
  notifications_enabled: boolean;
  auto_optimize: boolean;
  energy_rate: number;
};

export const useProfile = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user, session } = useAuth();
  const { toast } = useToast();
  const isInitialized = useRef(false);
  const fetchingRef = useRef(false);

  // Fetch or create profile using safe database function with improved error handling
  const fetchProfile = useCallback(async (showToasts: boolean = false) => {
    if (!user || !session) {
      setProfile(null);
      setLoading(false);
      setError(null);
      return;
    }

    // Prevent concurrent fetches
    if (fetchingRef.current) {
      console.log('Profile fetch already in progress, skipping');
      return;
    }

    try {
      fetchingRef.current = true;
      setLoading(true);
      setError(null);

      console.log('Fetching/creating profile for user:', user.id);

      // Use the safe database function to get or create profile
      const { data, error: createError } = await supabase
        .rpc('get_or_create_profile', {
          p_user_id: user.id,
          p_email: user.email,
          p_full_name: user.user_metadata?.full_name,
          p_phone_number: user.user_metadata?.phone_number,
          p_meter_number: user.user_metadata?.meter_number
        });

      if (createError) {
        console.error('Error fetching/creating profile:', createError);

        // Provide more specific error messages
        let errorMessage = "Could not load user profile";
        if (createError.code === 'PGRST116') {
          errorMessage = "Profile not found";
        } else if (createError.message.includes('network')) {
          errorMessage = "Network error. Please check your connection.";
        } else if (createError.message.includes('timeout')) {
          errorMessage = "Request timed out. Please try again.";
        } else if (createError.message.includes('auth')) {
          errorMessage = "Authentication error. Please sign in again.";
        }

        setError(errorMessage);

        if (showToasts) {
          toast({
            title: "Profile Error",
            description: errorMessage,
            variant: "destructive"
          });
        }
      } else if (data && data.length > 0) {
        const profileData = data[0] as BaseProfile;

        // Get energy settings
        const energySettings = await getEnergySettings(user.id);

        // Create complete profile with default values for energy settings
        const completeProfile: Profile = {
          ...profileData,
          energy_provider: energySettings?.energy_provider || 'KPLC',
          notifications_enabled: energySettings?.notifications_enabled || true,
          auto_optimize: energySettings?.auto_optimize || false,
          energy_rate: energySettings?.energy_rate || 0.15
        };

        console.log('Profile loaded/created successfully');
        setProfile(completeProfile);
        setError(null);
      } else {
        console.error('No profile data returned');
        setError('No profile data available');

        if (showToasts) {
          toast({
            title: "Profile Error",
            description: "No profile data available. Please try again.",
            variant: "destructive"
          });
        }
      }
    } catch (error) {
      console.error('Unexpected error fetching profile:', error);

      // Provide more specific error messages
      let errorMessage = "Connection error loading profile";
      if (error instanceof Error) {
        if (error.message.includes('network')) {
          errorMessage = "Network error. Please check your internet connection.";
        } else if (error.message.includes('timeout')) {
          errorMessage = "Request timed out. Please try again.";
        } else if (error.message.includes('auth')) {
          errorMessage = "Authentication error. Please sign in again.";
        }
      }

      setError(errorMessage);

      if (showToasts) {
        toast({
          title: "Connection Error",
          description: errorMessage,
          variant: "destructive"
        });
      }
    } finally {
      setLoading(false);
      fetchingRef.current = false;
      if (!isInitialized.current) {
        isInitialized.current = true;
      }
    }
  }, [user, session, toast]);

  // Update profile using safe database function
  const updateProfile = useCallback(async (updates: Partial<Omit<Profile, 'id' | 'created_at'>>) => {
    if (!user || !session) {
      toast({
        title: "Authentication Error",
        description: "Please sign in to update your profile.",
        variant: "destructive"
      });
      return false;
    }

    try {
      console.log('Updating profile with:', updates);

      // Use the safe update function
      const { data, error } = await supabase
        .rpc('safe_update_profile', {
          p_user_id: user.id,
          p_updates: updates
        });

      if (error) {
        console.error('Error updating profile:', error);
        toast({
          title: "Update Failed",
          description: error.message || "Could not update profile.",
          variant: "destructive"
        });
        return false;
      } else if (data && data.length > 0) {
        const updatedProfile = data[0] as Profile;
        console.log('Profile updated successfully');
        setProfile(updatedProfile);
        toast({
          title: "Profile Updated",
          description: "Your profile has been updated successfully."
        });
        return true;
      } else {
        toast({
          title: "Update Failed",
          description: "No data returned after update.",
          variant: "destructive"
        });
        return false;
      }
    } catch (error) {
      console.error('Unexpected error updating profile:', error);
      toast({
        title: "Update Error",
        description: "An unexpected error occurred while updating profile.",
        variant: "destructive"
      });
      return false;
    }
  }, [user, session, toast]);

  // Setup meter information
  const setupMeter = useCallback(async (meterData: {
    meter_number: string;
    meter_category: string;
    industry_type?: string;
  }) => {
    console.log('Setting up meter:', meterData);
    return await updateProfile(meterData);
  }, [updateProfile]);

  // Check profile status
  const checkProfileStatus = useCallback(async () => {
    if (!user || !session) return null;

    try {
      const { data, error } = await supabase
        .rpc('check_profile_status', {
          p_user_id: user.id
        });

      if (error) {
        console.error('Error checking profile status:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Exception checking profile status:', error);
      return null;
    }
  }, [user, session]);

  // Initialize profile when user changes
  useEffect(() => {
    if (user && session && !isInitialized.current) {
      // Delay initial fetch to avoid conflicts with auth
      const timer = setTimeout(() => {
        fetchProfile(false); // Don't show toasts on initial load
      }, 500); // Reduced delay

      return () => clearTimeout(timer);
    } else if (!user) {
      // Clear profile when user logs out
      setProfile(null);
      setLoading(false);
      setError(null);
      isInitialized.current = false;
      fetchingRef.current = false;
    }
  }, [user, session, fetchProfile]);

  return {
    profile,
    loading,
    error,
    updateProfile,
    setupMeter,
    checkProfileStatus,
    refetch: () => fetchProfile(true) // Show toasts when manually refetching
  };
};
