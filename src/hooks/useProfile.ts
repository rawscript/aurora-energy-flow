import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import type { Tables } from '@/integrations/supabase/types';

type Profile = Tables<'profiles'>;

export const useProfile = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const { user, session } = useAuth();
  const { toast } = useToast();
  const isInitialized = useRef(false);
  const retryCount = useRef(0);
  const maxRetries = 3;

  // Fetch profile data with better error handling
  const fetchProfile = useCallback(async () => {
    if (!user || !session) {
      setProfile(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log('Fetching profile for user:', user.id);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle(); // Use maybeSingle instead of single to avoid errors when no profile exists

      if (error) {
        console.error('Error fetching profile:', error);
        
        // If profile doesn't exist, create one
        if (error.code === 'PGRST116' || error.message?.includes('No rows found')) {
          console.log('Profile not found, creating new profile...');
          await createProfile();
        } else {
          // For other errors, show toast only if we've initialized
          if (isInitialized.current && retryCount.current < maxRetries) {
            retryCount.current++;
            console.log(`Retrying profile fetch (${retryCount.current}/${maxRetries})`);
            setTimeout(() => fetchProfile(), 2000); // Retry after 2 seconds
            return;
          } else if (isInitialized.current) {
            toast({
              title: "Profile Error",
              description: "Could not load user profile. Using default settings.",
              variant: "destructive"
            });
          }
        }
      } else if (data) {
        console.log('Profile loaded successfully:', data);
        setProfile(data);
        retryCount.current = 0; // Reset retry count on success
      } else {
        // No data returned, create profile
        console.log('No profile data returned, creating new profile...');
        await createProfile();
      }
    } catch (error) {
      console.error('Unexpected error fetching profile:', error);
      
      if (isInitialized.current && retryCount.current < maxRetries) {
        retryCount.current++;
        console.log(`Retrying profile fetch after error (${retryCount.current}/${maxRetries})`);
        setTimeout(() => fetchProfile(), 2000);
        return;
      } else if (isInitialized.current) {
        toast({
          title: "Connection Error",
          description: "Could not connect to profile service. Using default settings.",
          variant: "destructive"
        });
      }
    } finally {
      setLoading(false);
      isInitialized.current = true;
    }
  }, [user, session, toast]);

  // Create a new profile
  const createProfile = useCallback(async () => {
    if (!user) return;

    try {
      console.log('Creating new profile for user:', user.id);
      
      const newProfile = {
        id: user.id,
        email: user.email || '',
        full_name: user.user_metadata?.full_name || null,
        phone_number: user.user_metadata?.phone_number || null,
        meter_number: user.user_metadata?.meter_number || null,
        meter_category: null,
        industry_type: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data: createdProfile, error: createError } = await supabase
        .from('profiles')
        .insert(newProfile)
        .select()
        .single();

      if (createError) {
        console.error('Error creating profile:', createError);
        
        // If profile already exists (race condition), try to fetch it
        if (createError.code === '23505' || createError.message?.includes('duplicate key')) {
          console.log('Profile already exists, fetching existing profile...');
          const { data: existingProfile, error: fetchError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
          
          if (!fetchError && existingProfile) {
            setProfile(existingProfile);
            return;
          }
        }
        
        // Only show error toast if we've initialized
        if (isInitialized.current) {
          toast({
            title: "Profile Setup Error",
            description: "Could not create user profile. Some features may be limited.",
            variant: "destructive"
          });
        }
      } else {
        console.log('Profile created successfully:', createdProfile);
        setProfile(createdProfile);
        
        if (isInitialized.current) {
          toast({
            title: "Welcome!",
            description: "Your profile has been set up successfully."
          });
        }
      }
    } catch (error) {
      console.error('Unexpected error creating profile:', error);
      
      if (isInitialized.current) {
        toast({
          title: "Setup Error",
          description: "Could not complete profile setup. Please try again later.",
          variant: "destructive"
        });
      }
    }
  }, [user, toast]);

  // Update profile data with better error handling
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
        console.error('Error updating profile:', error);
        
        // If profile doesn't exist, create it first
        if (error.code === 'PGRST116' || error.message?.includes('No rows found')) {
          console.log('Profile not found during update, creating profile first...');
          await createProfile();
          
          // Try update again after creating profile
          const { data: retryData, error: retryError } = await supabase
            .from('profiles')
            .update({
              ...updates,
              updated_at: new Date().toISOString()
            })
            .eq('id', user.id)
            .select()
            .single();
          
          if (retryError) {
            console.error('Error updating profile after creation:', retryError);
            toast({
              title: "Update Failed",
              description: "Could not update profile. Please try again.",
              variant: "destructive"
            });
            return false;
          } else {
            setProfile(retryData);
            toast({
              title: "Profile Updated",
              description: "Your profile has been updated successfully."
            });
            return true;
          }
        } else {
          toast({
            title: "Update Failed",
            description: error.message || "Could not update profile.",
            variant: "destructive"
          });
          return false;
        }
      } else {
        console.log('Profile updated successfully:', data);
        setProfile(data);
        toast({
          title: "Profile Updated",
          description: "Your profile has been updated successfully."
        });
        return true;
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
  }, [user, session, toast, createProfile]);

  // Setup meter information
  const setupMeter = useCallback(async (meterData: {
    meter_number: string;
    meter_category: string;
    industry_type?: string;
  }) => {
    console.log('Setting up meter:', meterData);
    return await updateProfile(meterData);
  }, [updateProfile]);

  // Initialize profile when user changes
  useEffect(() => {
    if (user && session && !isInitialized.current) {
      retryCount.current = 0; // Reset retry count for new user
      fetchProfile();
    } else if (!user) {
      // Clear profile when user logs out
      setProfile(null);
      setLoading(false);
      isInitialized.current = false;
      retryCount.current = 0;
    }
  }, [user, session, fetchProfile]);

  return {
    profile,
    loading,
    updateProfile,
    setupMeter,
    refetch: fetchProfile
  };
};