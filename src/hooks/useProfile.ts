import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import type { Tables } from '@/integrations/supabase/types';

type Profile = Tables<'profiles'>;

export const useProfile = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  // Fetch profile data
  const fetchProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Profile doesn't exist, create one
          const newProfile = {
            id: user.id,
            email: user.email,
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
            toast({
              title: "Profile Error",
              description: "Could not create user profile.",
              variant: "destructive"
            });
          } else {
            setProfile(createdProfile);
          }
        } else {
          console.error('Error fetching profile:', error);
          toast({
            title: "Profile Error",
            description: "Could not load user profile.",
            variant: "destructive"
          });
        }
      } else {
        setProfile(data);
      }
    } catch (error) {
      console.error('Unexpected error fetching profile:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while loading profile.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  // Update profile data
  const updateProfile = async (updates: Partial<Omit<Profile, 'id' | 'created_at'>>) => {
    if (!user || !profile) return false;

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
        console.error('Error updating profile:', error);
        toast({
          title: "Update Failed",
          description: error.message,
          variant: "destructive"
        });
        return false;
      } else {
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
        title: "Error",
        description: "An unexpected error occurred while updating profile.",
        variant: "destructive"
      });
      return false;
    }
  };

  // Setup meter information
  const setupMeter = async (meterData: {
    meter_number: string;
    meter_category: string;
    industry_type?: string;
  }) => {
    return await updateProfile(meterData);
  };

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return {
    profile,
    loading,
    updateProfile,
    setupMeter,
    refetch: fetchProfile
  };
};