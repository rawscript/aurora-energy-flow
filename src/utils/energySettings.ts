/**
 * Utility functions for managing energy settings
 */

import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

// Type for energy settings
export interface EnergySettings {
  energy_provider: string;
  notifications_enabled: boolean;
  auto_optimize: boolean;
  energy_rate: number;
}

// Type for Supabase profile with energy settings
type ProfileWithEnergySettings = Database['public']['Tables']['profiles']['Row'] & {
  energy_provider?: string;
  notifications_enabled?: boolean;
  auto_optimize?: boolean;
  energy_rate?: number;
};

// Type for safe_update_profile parameters
type SafeUpdateProfileParams = {
  p_user_id: string;
  p_updates: {
    energy_provider?: string;
    notifications_enabled?: boolean;
    auto_optimize?: boolean;
    energy_rate?: number;
    email?: string;
    full_name?: string;
    phone_number?: string;
    meter_number?: string;
    meter_category?: string;
    industry_type?: string;
  };
};

/**
 * Get energy settings for a user
 * @param userId The user ID
 * @returns Energy settings object or null
 */
export async function getEnergySettings(userId: string): Promise<EnergySettings | null> {
  try {
    const { data: profile, error } = await supabase
      .rpc('get_or_create_profile', {
        p_user_id: userId
      });

    if (error) {
      console.error("Error fetching profile:", error);
      return null;
    }

    if (profile && profile.length > 0) {
      const userProfile = profile[0] as ProfileWithEnergySettings;

      const settings: EnergySettings = {
        energy_provider: userProfile.energy_provider || '',
        notifications_enabled: userProfile.notifications_enabled ?? true,
        auto_optimize: userProfile.auto_optimize ?? false,
        energy_rate: userProfile.energy_rate ?? 0.15
      };

      return settings;
    }
  } catch (error) {
    console.error("Unexpected error fetching profile:", error);
    return null;
  }

  return null;
}

/**
 * Save energy settings for a user
 * @param userId The user ID
 * @param settings The settings to save
 * @returns True if successful, false otherwise
 */
export async function saveEnergySettings(userId: string, settings: EnergySettings): Promise<boolean> {
  try {
    // Convert settings to the format expected by Supabase
    const updates: SafeUpdateProfileParams['p_updates'] = {
      energy_provider: settings.energy_provider,
      notifications_enabled: settings.notifications_enabled,
      auto_optimize: settings.auto_optimize,
      energy_rate: settings.energy_rate
    };

    // Update in Supabase
    const params: SafeUpdateProfileParams = {
      p_user_id: userId,
      p_updates: updates
    };

    const { error } = await supabase.rpc('safe_update_profile', params);

    if (error) {
      console.error("Error updating profile:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Unexpected error saving settings:", error);
    return false;
  }
}
