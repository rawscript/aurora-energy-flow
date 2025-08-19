import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import type { Tables } from '@/integrations/supabase/types';

type Profile = Tables<'profiles'>;

export const useProfile = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user, session } = useAuth();
  const { toast } = useToast();
  const isInitialized = useRef(false);
  const fetchingRef = useRef(false);

  // Fetch or create profile using safe database function
  const fetchProfile = useCallback(async (showToasts = false) => {
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
      const { data, error } = await supabase
        .rpc('get_or_create_profile', {
          p_user_id: user.id,
          p_email: user.email,
          p_full_name: user.user_metadata?.full_name,
          p_phone_number: user.user_metadata?.phone_number,
          p_meter_number: user.user_metadata?.meter_number
        });

      if (error) {
        console.error('Error fetching/creating profile:', error);
        setError('Could not load user profile');
        
        if (showToasts) {
          toast({
            title: "Profile Error",
            description: "Could not load user profile. Some features may be limited.",
            variant: "destructive"
          });
        }
      } else if (data && data.length > 0) {
        const profileData = data[0];
        console.log('Profile loaded/created successfully');
        setProfile(profileData);
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
      setError('Connection error loading profile');
      
      if (showToasts) {
        toast({
          title: "Connection Error",
          description: "Could not connect to profile service. Please check your connection.",
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
        const updatedProfile = data[0];
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
      setTimeout(() => {
        fetchProfile(false); // Don't show toasts on initial load
      }, 500); // Reduced delay
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