// Basic Supabase types for the Aurora Energy Flow project
import { SupabaseClient } from '@supabase/supabase-js';

// Define the Database type structure
export type Database = {
  public: {
    Tables: {
      // Add table definitions as needed
      profiles: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          email: string | null;
          full_name: string | null;
          phone_number: string | null;
          meter_number: string | null;
          meter_category: string | null;
          industry_type: string | null;
          energy_provider: string | null;
          notifications_enabled: boolean | null;
          auto_optimize: boolean | null;
          energy_rate: number | null;
          notification_preferences: any | null;
          kplc_meter_type: string | null;
          low_balance_threshold: number | null;
        };
        Insert: {
          id: string;
          created_at?: string;
          updated_at?: string;
          email?: string | null;
          full_name?: string | null;
          phone_number?: string | null;
          meter_number?: string | null;
          meter_category?: string | null;
          industry_type?: string | null;
          energy_provider?: string | null;
          notifications_enabled?: boolean | null;
          auto_optimize?: boolean | null;
          energy_rate?: number | null;
          notification_preferences?: any | null;
          kplc_meter_type?: string | null;
          low_balance_threshold?: number | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          email?: string | null;
          full_name?: string | null;
          phone_number?: string | null;
          meter_number?: string | null;
          meter_category?: string | null;
          industry_type?: string | null;
          energy_provider?: string | null;
          notifications_enabled?: boolean | null;
          auto_optimize?: boolean | null;
          energy_rate?: number | null;
          notification_preferences?: any | null;
          kplc_meter_type?: string | null;
          low_balance_threshold?: number | null;
        };
      };
      kplc_bills: {
        Row: {
          id: string;
          user_id: string;
          account_name: string | null;
          account_number: string | null;
          meter_number: string;
          current_reading: number | null;
          previous_reading: number | null;
          consumption: number | null;
          bill_amount: number | null;
          due_date: string | null;
          billing_period: string | null;
          last_payment_date: string | null;
          last_payment_amount: number | null;
          outstanding_balance: number | null;
          address: string | null;
          tariff: string | null;
          status: string | null;
          fetched_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          account_name?: string | null;
          account_number?: string | null;
          meter_number: string;
          current_reading?: number | null;
          previous_reading?: number | null;
          consumption?: number | null;
          bill_amount?: number | null;
          due_date?: string | null;
          billing_period?: string | null;
          last_payment_date?: string | null;
          last_payment_amount?: number | null;
          outstanding_balance?: number | null;
          address?: string | null;
          tariff?: string | null;
          status?: string | null;
          fetched_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          account_name?: string | null;
          account_number?: string | null;
          meter_number?: string;
          current_reading?: number | null;
          previous_reading?: number | null;
          consumption?: number | null;
          bill_amount?: number | null;
          due_date?: string | null;
          billing_period?: string | null;
          last_payment_date?: string | null;
          last_payment_amount?: number | null;
          outstanding_balance?: number | null;
          address?: string | null;
          tariff?: string | null;
          status?: string | null;
          fetched_at?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {
      // Add view definitions as needed
    };
    Functions: {
      // RPC functions
      execute_transaction: {
        Args: {
          p_operations: any[];
          p_user_id: string;
        };
        Returns: any;
      };
      purchase_tokens_improved: {
        Args: {
          p_user_id: string;
          p_meter_number: string;
          p_amount: number;
          p_payment_method: string;
          p_vendor: string;
          p_phone_number: string;
        };
        Returns: any;
      };
      get_token_analytics_improved: {
        Args: {
          p_user_id: string;
          p_force_refresh: boolean;
        };
        Returns: any;
      };
      safe_update_profile: {
        Args: {
          p_user_id: string;
          p_updates: any;
        };
        Returns: any;
      };
      insert_energy_reading_improved: {
        Args: {
          p_user_id: string;
          p_meter_number: string;
          p_kwh_consumed: number;
          p_cost_per_kwh: number;
        };
        Returns: any;
      };
      process_notification_queue: {
        Args: {
          p_limit: number;
        };
        Returns: any;
      };
      get_energy_settings_history: {
        Args: {
          p_user_id: string;
          p_limit: number;
        };
        Returns: any;
      };
      revert_energy_settings: {
        Args: {
          p_user_id: string;
          p_version: number;
        };
        Returns: any;
      };
    };
  };
};

// Define CustomSupabaseClient type
export type CustomSupabaseClient = SupabaseClient<Database> & {
  // Add custom methods and properties
  transaction?: <T>(operations: Array<{ query: string; params: any }>, user_id: string) => Promise<any>;
  energy?: {
    purchaseTokens: (params: {
      user_id: string;
      meter_number: string;
      amount: number;
      payment_method?: string;
      vendor?: string;
      phone_number?: string;
    }) => Promise<any>;
    getTokenAnalytics: (user_id: string, forceRefresh?: boolean) => Promise<any>;
    updateProfile: (params: any) => Promise<any>;
    insertEnergyReading: (params: {
      user_id: string;
      meter_number: string;
      kwh_consumed: number;
      cost_per_kwh?: number;
    }) => Promise<any>;
  };
  notifications?: {
    processQueue: (limit?: number) => Promise<any>;
    getHistory: (user_id: string, limit?: number) => Promise<any>;
    revertSettings: (user_id: string, version: number) => Promise<any>;
  };
};