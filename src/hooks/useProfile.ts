import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthenticatedApi } from '@/hooks/useAuthenticatedApi';
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
  const { user, userId, hasValidSession, callRpc, query } = useAuthenticatedApi();
  const { toast } = useToast();
  
  // Control refs
  const isInitialized = useRef(false);
  const fetchingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastUserIdRef = useRef<string | null>(null);

  // Stable user ID reference to prevent unnecessary re-fetches
  const currentUserId = userId;

  // Optimized fetch function using centralized auth
  const fetchProfile = useCallback(async (showToasts: boolean = false) => {
    // Early returns to prevent unnecessary calls
    if (!userId || !hasValidSession()) {
      setProfile(null);
      setLoading(false);
      setError(null);
      return;
    }

    // Prevent concurrent fetches for the same user
    if (fetchingRef.current && lastUserIdRef.current === userId) {
      console.log('Profile fetch already in progress for current user, skipping');
      return;
    }

    fetchingRef.current = true;
    lastUserIdRef.current = userId;
    setLoading(true);
    setError(null);

    try {
      console.log('Fetching/creating profile for user:', userId);

      // Use centralized auth for RPC call with caching
      const profileData = await callRpc('get_or_create_profile', {
        p_email: user?.email,
        p_full_name: user?.user_metadata?.full_name,
        p_phone_number: user?.user_metadata?.phone_number,
        p_meter_number: user?.user_metadata?.meter_number
      }, {
        showErrorToast: showToasts,
        cacheKey: `profile_${userId}`,
        cacheDuration: 300000 // Cache for 5 minutes
      });

      if (profileData && profileData.length > 0) {
        const profileDataItem = profileData[0] as BaseProfile;

        // Get energy settings without awaiting to avoid blocking
        let energySettings = null;
        try {
          energySettings = await getEnergySettings(userId);
        } catch (energyError) {
          console.warn('Could not fetch energy settings:', energyError);
        }

        // Create complete profile with default values
        const completeProfile: Profile = {
          ...profileDataItem,
          energy_provider: energySettings?.energy_provider || profileDataItem.energy_provider || 'KPLC',
          notifications_enabled: energySettings?.notifications_enabled ?? profileDataItem.notifications_enabled ?? true,
          auto_optimize: energySettings?.auto_optimize ?? profileDataItem.auto_optimize ?? false,
          energy_rate: energySettings?.energy_rate ?? profileDataItem.energy_rate ?? 0.15,
          meter_category: profileDataItem.meter_category || '',
          industry_type: profileDataItem.industry_type || '',
          notification_preferences: profileDataItem.notification_preferences || {
            token_low: true,
            token_depleted: true,
            power_restored: true,
            energy_alert: true,
            low_balance_alert: true
          },
          kplc_meter_type: profileDataItem.kplc_meter_type || 'prepaid',
          low_balance_threshold: profileDataItem.low_balance_threshold || 100
        };

        console.log('Profile loaded/created successfully');
        setProfile(completeProfile);
        setError(null);
      } else {
        throw new Error('No profile data returned');
      }

    } catch (error: any) {
      console.error('Error fetching profile:', error);
      
      let errorMessage = "Could not load user profile";
      
      // More specific error handling
      if (error.message?.includes('timeout')) {
        errorMessage = "Request timed out. Please try again.";
      } else if (error.message?.includes('network')) {
        errorMessage = "Network error. Please check your connection.";
      } else if (error.code === 'PGRST116') {
        errorMessage = "Profile not found";
      } else if (error.code === 'PGRST202') {
        errorMessage = "Database function not available";
      }

      setError(errorMessage);

      if (showToasts) {
        toast({
          title: "Profile Error",
          description: errorMessage,
          variant: "destructive"
        });
      }
    } finally {
      fetchingRef.current = false;
      setLoading(false);
      
      if (!isInitialized.current) {
        isInitialized.current = true;
      }
    }
  }, [userId, hasValidSession, callRpc, user?.email, user?.user_metadata, toast]);

  // Optimized update function using centralized auth
  const updateProfile = useCallback(async (updates: Partial<Omit<Profile, 'id' | 'created_at'>>) => {
    if (!userId || !hasValidSession()) {
      toast({
        title: "Authentication Error",
        description: "Please sign in to update your profile.",
        variant: "destructive"
      });
      return false;
    }

    try {
      console.log('Updating profile with:', updates);

      // Input validation
      if (updates.energy_rate !== undefined && (typeof updates.energy_rate !== 'number' || updates.energy_rate < 0)) {
        toast({
          title: "Validation Error",
          description: "Energy rate must be a positive number.",
          variant: "destructive"
        });
        return false;
      }

      if (updates.energy_provider && !['', 'KPLC', 'Solar', 'KenGEn', 'IPP', 'Other'].includes(updates.energy_provider)) {
        toast({
          title: "Validation Error",
          description: "Please select a valid energy provider from the dropdown.",
          variant: "destructive"
        });
        return false;
      }

      // Use centralized auth for query
      const { data, error } = await query('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      if (data) {
        console.log('Profile updated successfully');
        setProfile(data as Profile);
        toast({
          title: "Profile Updated",
          description: "Your profile has been updated successfully."
        });
        return true;
      }

      return false;
    } catch (error: any) {
      console.error('Error updating profile:', error);
      
      let errorMessage = "Could not update profile";
      if (error.message?.includes('timeout')) {
        errorMessage = "Update timed out. Please try again.";
      } else if (error.message?.includes('network')) {
        errorMessage = "Network error. Please check your connection.";
      }

      toast({
        title: "Update Failed",
        description: errorMessage,
        variant: "destructive"
      });
      return false;
    }
  }, [userId, hasValidSession, query, toast]);

  // Setup meter with validation
  const setupMeter = useCallback(async (meterData: {
    meter_number: string;
    meter_category: string;
    industry_type?: string;
    energy_provider?: string;
  }) => {
    if (!meterData.meter_number?.trim()) {
      toast({
        title: "Validation Error",
        description: "Meter number is required.",
        variant: "destructive"
      });
      return false;
    }

    if (!meterData.meter_category?.trim()) {
      toast({
        title: "Validation Error", 
        description: "Meter category is required.",
        variant: "destructive"
      });
      return false;
    }

    return await updateProfile(meterData);
  }, [updateProfile, toast]);

  // Simplified profile status check using centralized auth
  const checkProfileStatus = useCallback(async () => {
    if (!userId || !hasValidSession()) return null;

    try {
      const data = await callRpc('check_profile_status', {}, {
        showErrorToast: false,
        cacheKey: `profile_status_${userId}`,
        cacheDuration: 60000 // Cache for 1 minute
      });

      return data;
    } catch (error) {
      console.error('Exception checking profile status:', error);
      return null;
    }
  }, [userId, hasValidSession, callRpc]);

  // Effect for initialization - only run when user ID actually changes
  useEffect(() => {
    // Clean up on user change
    if (lastUserIdRef.current && lastUserIdRef.current !== currentUserId) {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      setProfile(null);
      setLoading(false);
      setError(null);
      isInitialized.current = false;
      fetchingRef.current = false;
    }

    // Initialize for new user
    if (currentUserId && hasValidSession() && !isInitialized.current) {
      const timer = setTimeout(() => {
        if (currentUserId === userId) { // Double-check user hasn't changed
          fetchProfile(false);
        }
      }, 100); // Minimal delay

      return () => clearTimeout(timer);
    }
    
    // Clear state when no user
    if (!currentUserId) {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      setProfile(null);
      setLoading(false);
      setError(null);
      isInitialized.current = false;
      fetchingRef.current = false;
      lastUserIdRef.current = null;
    }
  }, [currentUserId, hasValidSession, userId, fetchProfile]); // Updated dependencies

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    profile,
    loading,
    error,
    updateProfile,
    setupMeter,
    checkProfileStatus,
    refetch: () => fetchProfile(true)
  };
};