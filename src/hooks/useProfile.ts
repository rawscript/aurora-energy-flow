import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';
import type { Tables } from '@/integrations/supabase/types';
import { getEnergySettings } from '@/utils/energySettings';

// Explicitly define the BaseProfile type with all required properties
type BaseProfile = {
  id: string;
  created_at: string;
  updated_at: string;
  email: string;
  full_name: string;
  phone_number: string;
  meter_number: string;
  meter_category: string;
  industry_type: string;
  energy_provider: string;
  notifications_enabled: boolean;
  auto_optimize: boolean;
  energy_rate: number;
  notification_preferences?: Record<string, any>;
  kplc_meter_type?: string;
  low_balance_threshold?: number;
};

// Extended profile type with energy settings
type Profile = BaseProfile & {
  energy_provider: string;
  notifications_enabled: boolean;
  auto_optimize: boolean;
  energy_rate: number;
  battery_count?: number;
  meter_category?: string;
  industry_type?: string;
  notification_preferences?: Record<string, any>;
  kplc_meter_type?: string;
  low_balance_threshold?: number;
};

export const useProfile = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user, session } = useAuth();
  const { toast } = useToast();
  const isInitialized = useRef(false);
  const fetchingRef = useRef(false);
  const retryCount = useRef(0);
  const MAX_RETRIES = 3;

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

    fetchingRef.current = true;
    setLoading(true);
    setError(null);

    console.log('Fetching/creating profile for user:', user.id);

    // Use the safe database function to get or create profile
    let profileData = null;
    let createError = null;

    try {
      const { data, error } = await supabase
        .rpc('get_or_create_profile', {
          p_user_id: user.id,
          p_email: user.email,
          p_full_name: user.user_metadata?.full_name,
          p_phone_number: user.user_metadata?.phone_number,
          p_meter_number: user.user_metadata?.meter_number
        });

      profileData = data;
      createError = error;
    } catch (error) {
      console.error('Error calling get_or_create_profile:', error);
      createError = error;
    }

    // If get_or_create_profile fails, try fetching directly from the profiles table as fallback
    if (createError) {
      console.error('Error fetching/creating profile:', createError);

      // Check if the error is a 404 (function not found)
      if (createError.code === 'PGRST202' || createError.message.includes('404')) {
        console.log('get_or_create_profile not found, using fallback to fetch from profiles table');

        // Try fetching the profile directly from the profiles table
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (fallbackError) {
          console.error('Error fetching profile from profiles table:', fallbackError);

          // If profile doesn't exist, create a new one
          if (fallbackError.code === 'PGRST116') {
            console.log('Profile not found, creating a new one');

            // Create a new profile with default values
            const newProfile = {
              id: user.id,
              email: user.email,
              full_name: user.user_metadata?.full_name || '',
              phone_number: user.user_metadata?.phone_number || '',
              meter_number: user.user_metadata?.meter_number || '',
              meter_category: 'residential',
              industry_type: 'home',
              energy_provider: 'KPLC',
              notifications_enabled: true,
              auto_optimize: false,
              energy_rate: 0.15,
              notification_preferences: {
                token_low: true,
                token_depleted: true,
                power_restored: true,
                energy_alert: true,
                low_balance_alert: true
              },
              kplc_meter_type: 'prepaid',
              low_balance_threshold: 100
            };

            // Insert the new profile
            const { data: insertData, error: insertError } = await supabase
              .from('profiles')
              .insert(newProfile)
              .select();

            if (insertError) {
              console.error('Error creating new profile:', insertError);
              let errorMessage = "Could not create user profile";
              if (insertError.message.includes('network')) {
                errorMessage = "Network error. Please check your connection.";
              } else if (insertError.message.includes('timeout')) {
                errorMessage = "Request timed out. Please try again.";
              } else if (insertError.message.includes('auth')) {
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
            } else {
              profileData = insertData;
              console.log('New profile created successfully');
            }
          } else {
            let errorMessage = "Could not load user profile";
            if (fallbackError.message.includes('network')) {
              errorMessage = "Network error. Please check your connection.";
            } else if (fallbackError.message.includes('timeout')) {
              errorMessage = "Request timed out. Please try again.";
            } else if (fallbackError.message.includes('auth')) {
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
          }
        } else if (fallbackData) {
          profileData = [fallbackData];
          console.log('Profile fetched successfully from profiles table');
        }
      } else {
        // Provide more specific error messages for other errors
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

        // Retry once if it's a network error
        if (createError.message.includes('network') && retryCount.current < MAX_RETRIES) {
          retryCount.current++;
          await new Promise(resolve => setTimeout(resolve, 1000));
          return fetchProfile(showToasts);
        }
      }
    }

    if (profileData && profileData.length > 0) {
      const profileDataItem = profileData[0] as BaseProfile;

      // Get energy settings with fallback to profile data
      const energySettings = await getEnergySettings(user.id);

      // Create complete profile with default values for energy settings
      const completeProfile: Profile = {
        ...profileDataItem,
        energy_provider: energySettings?.energy_provider || profileDataItem.energy_provider || 'KPLC',
        notifications_enabled: energySettings?.notifications_enabled || profileDataItem.notifications_enabled || true,
        auto_optimize: energySettings?.auto_optimize || profileDataItem.auto_optimize || false,
        energy_rate: energySettings?.energy_rate || profileDataItem.energy_rate || 0.15,
        meter_category: profileDataItem.meter_category || '',
        industry_type: profileDataItem.industry_type || '',
        notification_preferences: profileDataItem.notification_preferences ||
          { token_low: true, token_depleted: true, power_restored: true },
        kplc_meter_type: profileDataItem.kplc_meter_type || 'prepaid',
        low_balance_threshold: profileDataItem.low_balance_threshold || 100
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

    fetchingRef.current = false;
    setLoading(false);
    if (!isInitialized.current) {
      isInitialized.current = true;
    }
  }, [user, session, toast]);

  // Update profile using safe database function with improved error handling
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

      // Validate energy rate if provided
      if (updates.energy_rate !== undefined && (typeof updates.energy_rate !== 'number' || updates.energy_rate < 0)) {
        toast({
          title: "Validation Error",
          description: "Energy rate must be a positive number.",
          variant: "destructive"
        });
        return false;
      }

      // Validate energy provider if provided
      if (updates.energy_provider && !['', 'KPLC', 'Solar', 'KenGEn', 'IPP', 'Other'].includes(updates.energy_provider)) {
        toast({
          title: "Validation Error",
          description: "Please select a valid energy provider from the dropdown.",
          variant: "destructive"
        });
        return false;
      }

      // First try using the safe_update_profile function
      let retryCount = 0;
      const maxRetries = 3;
      let success = false;

      while (retryCount < maxRetries && !success) {
        try {
          const { data, error } = await supabase
            .rpc('safe_update_profile', {
              p_user_id: user.id,
              p_updates: updates
            });

          if (error) {
            console.error(`Attempt ${retryCount + 1}: Error updating profile:`, error);
            // Only retry on network errors
            if (error.message.includes('network') || error.message.includes('timeout')) {
              retryCount++;
              await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
              continue;
            } else {
              // Don't retry on other errors, try direct update
              break;
            }
          } else if (data && data.length > 0) {
            const updatedProfile = data[0] as Profile;
            console.log('Profile updated successfully via RPC');
            setProfile(updatedProfile);
            toast({
              title: "Profile Updated",
              description: "Your profile has been updated successfully."
            });
            return true;
          }
        } catch (error) {
          console.error(`Attempt ${retryCount + 1}: Unexpected error updating profile:`, error);
          retryCount++;
          await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
        }
      }

      // If RPC failed, try direct update
      if (!success) {
        console.log('RPC update failed, trying direct update');
        try {
          const { data, error } = await supabase
            .from('profiles')
            .update({
              ...updates,
              updated_at: new Date().toISOString()
            })
            .eq('id', user.id)
            .select()
            .single();

          if (error) {
            console.error('Error with direct profile update:', error);
            toast({
              title: "Update Failed",
              description: error.message || "Could not update profile.",
              variant: "destructive"
            });
            return false;
          } else if (data) {
            console.log('Profile updated successfully via direct update');
            setProfile(data as Profile);
            toast({
              title: "Profile Updated",
              description: "Your profile has been updated successfully."
            });
            return true;
          }
        } catch (error) {
          console.error('Unexpected error with direct profile update:', error);
          toast({
            title: "Update Error",
            description: "An unexpected error occurred while updating profile.",
            variant: "destructive"
          });
          return false;
        }
      }

      return false;
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

  // Setup meter information with improved error handling
  const setupMeter = useCallback(async (meterData: {
    meter_number: string;
    meter_category: string;
    industry_type?: string;
    energy_provider?: string;
  }) => {
    console.log('Setting up meter:', meterData);

    // Validate meter number
    if (!meterData.meter_number || meterData.meter_number.trim().length === 0) {
      toast({
        title: "Validation Error",
        description: "Meter number is required.",
        variant: "destructive"
      });
      return false;
    }

    // Validate meter category
    if (!meterData.meter_category || meterData.meter_category.trim().length === 0) {
      toast({
        title: "Validation Error",
        description: "Meter category is required.",
        variant: "destructive"
      });
      return false;
    }

    return await updateProfile(meterData);
  }, [updateProfile, toast]);

  // Check profile status with improved error handling
  const checkProfileStatus = useCallback(async () => {
    if (!user || !session) return null;

    try {
      const { data, error } = await supabase
        .rpc('check_profile_status', {
          p_user_id: user.id
        });

      if (error) {
        console.error('Error checking profile status:', error);
        // Retry once if it's a network error
        if (error.message.includes('network') && retryCount.current < MAX_RETRIES) {
          retryCount.current++;
          await new Promise(resolve => setTimeout(resolve, 1000));
          return checkProfileStatus();
        }
        return null;
      }

      return data;
    } catch (error) {
      console.error('Exception checking profile status:', error);
      // Retry once if it's a network error
      if (error.message.includes('network') && retryCount.current < MAX_RETRIES) {
        retryCount.current++;
        await new Promise(resolve => setTimeout(resolve, 1000));
        return checkProfileStatus();
      }
      return null;
    } finally {
      retryCount.current = 0;
    }
  }, [user, session]);

  // Initialize profile when user changes with improved error handling
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
      retryCount.current = 0;
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
