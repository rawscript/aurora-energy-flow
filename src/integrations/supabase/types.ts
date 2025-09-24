import { SupabaseClient } from '@supabase/supabase-js';

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      ai_alerts: {
        Row: {
          alert_type: string
          created_at: string
          expires_at: string | null
          id: string
          is_read: boolean
          message: string
          prediction_confidence: number | null
          recommended_actions: Json | null
          severity: string
          title: string
          user_id: string
        }
        Insert: {
          alert_type: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_read?: boolean
          message: string
          prediction_confidence?: number | null
          recommended_actions?: Json | null
          severity: string
          title: string
          user_id: string
        }
        Update: {
          alert_type?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_read?: boolean
          message?: string
          prediction_confidence?: number | null
          recommended_actions?: Json | null
          severity?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_alerts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_history: {
        Row: {
          billing_month: string
          created_at: string
          due_date: string
          id: string
          paid_date: string | null
          payment_status: string
          total_amount: number
          total_kwh: number
          user_id: string
        }
        Insert: {
          billing_month: string
          created_at?: string
          due_date: string
          id?: string
          paid_date?: string | null
          payment_status?: string
          total_amount: number
          total_kwh: number
          user_id: string
        }
        Update: {
          billing_month?: string
          created_at?: string
          due_date?: string
          id?: string
          paid_date?: string | null
          payment_status?: string
          total_amount?: number
          total_kwh?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      energy_readings: {
        Row: {
          billing_period_end: string | null
          billing_period_start: string | null
          cost_per_kwh: number
          created_at: string
          id: string
          kwh_consumed: number
          meter_number: string
          off_peak_usage: number | null
          peak_usage: number | null
          reading_date: string
          total_cost: number
          user_id: string
        }
        Insert: {
          billing_period_end?: string | null
          billing_period_start?: string | null
          cost_per_kwh: number
          created_at?: string
          id?: string
          kwh_consumed: number
          meter_number: string
          off_peak_usage?: number | null
          peak_usage?: number | null
          reading_date?: string
          total_cost: number
          user_id: string
        }
        Update: {
          billing_period_end?: string | null
          billing_period_start?: string | null
          cost_per_kwh?: number
          created_at?: string
          id?: string
          kwh_consumed?: number
          meter_number?: string
          off_peak_usage?: number | null
          peak_usage?: number | null
          reading_date?: string
          total_cost?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "energy_readings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      kplc_token_transactions: {
        Row: {
          amount: number
          balance_after: number
          balance_before: number
          created_at: string
          id: string
          metadata: Json | null
          meter_number: string
          payment_method: string | null
          reference_number: string | null
          status: string
          token_code: string | null
          token_units: number | null
          transaction_date: string
          transaction_type: string
          updated_at: string
          user_id: string
          vendor: string | null
        }
        Insert: {
          amount: number
          balance_after?: number
          balance_before?: number
          created_at?: string
          id?: string
          metadata?: Json | null
          meter_number: string
          payment_method?: string | null
          reference_number?: string | null
          status?: string
          token_code?: string | null
          token_units?: number | null
          transaction_date?: string
          transaction_type: string
          updated_at?: string
          user_id: string
          vendor?: string | null
        }
        Update: {
          amount?: number
          balance_after?: number
          balance_before?: number
          created_at?: string
          id?: string
          metadata?: Json | null
          meter_number?: string
          payment_method?: string | null
          reference_number?: string | null
          status?: string
          token_code?: string | null
          token_units?: number | null
          transaction_date?: string
          transaction_type?: string
          updated_at?: string
          user_id?: string
          vendor?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          estimated_days: number | null
          expires_at: string | null
          id: string
          is_read: boolean
          message: string
          metadata: Json | null
          severity: string
          title: string
          token_balance: number | null
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          estimated_days?: number | null
          expires_at?: string | null
          id?: string
          is_read?: boolean
          message: string
          metadata?: Json | null
          severity?: string
          title: string
          token_balance?: number | null
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          estimated_days?: number | null
          expires_at?: string | null
          id?: string
          is_read?: boolean
          message?: string
          metadata?: Json | null
          severity?: string
          title?: string
          token_balance?: number | null
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          industry_type: string | null
          meter_category: string | null
          meter_number: string | null
          phone_number: string | null
          updated_at: string
          energy_provider: string | null
          notifications_enabled: boolean | null
          auto_optimize: boolean | null
          energy_rate: number | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          industry_type?: string | null
          meter_category?: string | null
          meter_number?: string | null
          phone_number?: string | null
          updated_at?: string
          energy_provider?: string | null
          notifications_enabled?: boolean | null
          auto_optimize?: boolean | null
          energy_rate?: number | null
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          industry_type?: string | null
          meter_category?: string | null
          meter_number?: string | null
          phone_number?: string | null
          updated_at?: string
          energy_provider?: string | null
          notifications_enabled?: boolean | null
          auto_optimize?: boolean | null
          energy_rate?: number | null
        }
        Relationships: []
      }
      token_balances: {
        Row: {
          created_at: string
          current_balance: number
          daily_consumption_avg: number
          estimated_days_remaining: number
          id: string
          last_updated: string
          low_balance_threshold: number
          meter_number: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_balance?: number
          daily_consumption_avg?: number
          estimated_days_remaining?: number
          id?: string
          last_updated?: string
          low_balance_threshold?: number
          meter_number: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_balance?: number
          daily_consumption_avg?: number
          estimated_days_remaining?: number
          id?: string
          last_updated?: string
          low_balance_threshold?: number
          meter_number?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_notifications_status: {
        Args: {
          p_user_id: string
        }
        Returns: Json
      }
      check_profile_status: {
        Args: {
          p_user_id: string
        }
        Returns: Json
      }
      check_user_notification_initialization: {
        Args: {
          p_user_id: string
        }
        Returns: boolean
      }
      cleanup_expired_notifications: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      create_notification: {
        Args: {
          p_user_id: string
          p_title: string
          p_message: string
          p_type?: string
          p_severity?: string
          p_token_balance?: number
          p_estimated_days?: number
          p_metadata?: Json
          p_expires_at?: string
        }
        Returns: string
      }
      delete_notification: {
        Args: {
          p_user_id: string
          p_notification_id: string
        }
        Returns: boolean
      }
      delete_read_notifications: {
        Args: {
          p_user_id: string
        }
        Returns: number
      }
      ensure_notifications_table: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      ensure_user_profile: {
        Args: {
          p_user_id: string
          p_email?: string
          p_full_name?: string
          p_phone_number?: string
          p_meter_number?: string
        }
        Returns: Json
      }
      get_latest_energy_data: {
        Args: { p_user_id: string }
        Returns: {
          current_usage: number
          daily_total: number
          daily_cost: number
          efficiency_score: number
        }[]
      }
      get_notification_preferences: {
        Args: {
          p_user_id: string
        }
        Returns: Json
      }
      get_notification_stats: {
        Args: {
          p_user_id: string
        }
        Returns: Json
      }
      get_or_create_profile: {
        Args: {
          p_user_id: string
          p_email?: string
          p_full_name?: string
          p_phone_number?: string
          p_meter_number?: string
        }
        Returns: {
          id: string
          email: string | null
          full_name: string | null
          phone_number: string | null
          meter_number: string | null
          meter_category: string | null
          industry_type: string | null
          energy_provider: string | null
          notifications_enabled: boolean | null
          auto_optimize: boolean | null
          energy_rate: number | null
          created_at: string
          updated_at: string
        }[]
      }
      get_token_analytics: {
        Args: { p_user_id: string }
        Returns: Json
      }
      get_user_notifications: {
        Args: {
          p_user_id: string
          p_limit?: number
          p_unread_only?: boolean
        }
        Returns: {
          id: string
          title: string
          message: string
          type: string
          severity: string
          is_read: boolean
          token_balance: number | null
          estimated_days: number | null
          metadata: Json | null
          created_at: string
          updated_at: string
          expires_at: string | null
        }[]
      }
      get_user_notifications_safe: {
        Args: {
          p_user_id: string
          p_limit?: number
          p_unread_only?: boolean
        }
        Returns: {
          id: string
          title: string
          message: string
          type: string
          severity: string
          is_read: boolean
          token_balance: number | null
          estimated_days: number | null
          metadata: Json | null
          created_at: string
          updated_at: string
          expires_at: string | null
          source_table: string
        }[]
      }
      initialize_user_notifications: {
        Args: {
          p_user_id: string
        }
        Returns: Json
      }
      insert_energy_reading: {
        Args: {
          p_user_id: string
          p_meter_number: string
          p_kwh_consumed: number
          p_cost_per_kwh?: number
        }
        Returns: string
      }
      mark_all_notifications_read: {
        Args: {
          p_user_id: string
        }
        Returns: number
      }
      mark_notification_read: {
        Args: {
          p_user_id: string
          p_notification_id: string
        }
        Returns: boolean
      }
      purchase_tokens: {
        Args: {
          p_user_id: string
          p_meter_number: string
          p_amount: number
          p_payment_method?: string
          p_vendor?: string
        }
        Returns: Json
      }
      safe_update_profile: {
        Args: {
          p_user_id: string
          p_updates: {
            energy_provider?: string
            notifications_enabled?: boolean
            auto_optimize?: boolean
            energy_rate?: number
            email?: string
            full_name?: string
            phone_number?: string
            meter_number?: string
            meter_category?: string
            industry_type?: string
          }
        }
        Returns: {
          id: string
          email: string | null
          full_name: string | null
          phone_number: string | null
          meter_number: string | null
          meter_category: string | null
          industry_type: string | null
          energy_provider: string | null
          notifications_enabled: boolean | null
          auto_optimize: boolean | null
          energy_rate: number | null
          created_at: string
          updated_at: string
        }[]
      }
      update_token_balance: {
        Args: {
          p_user_id: string
          p_meter_number: string
          p_amount: number
          p_transaction_type?: string
        }
        Returns: number
      },
      execute_transaction: {
        Args: {
          p_operations: Json[]
          p_user_id: string
        }
        Returns: Json
      },
      purchase_tokens_improved: {
        Args: {
          p_user_id: string
          p_meter_number: string
          p_amount: number
          p_payment_method?: string
          p_vendor?: string
          p_phone_number?: string
        }
        Returns: Json
      },
      get_token_analytics_improved: {
        Args: {
          p_user_id: string
          p_force_refresh?: boolean
        }
        Returns: Json
      },
      insert_energy_reading_improved: {
        Args: {
          p_user_id: string
          p_meter_number: string
          p_kwh_consumed: number
          p_cost_per_kwh?: number
        }
        Returns: string
      },
      get_energy_settings_history: {
        Args: {
          p_user_id: string
          p_limit?: number
        }
        Returns: Json
      },
      revert_energy_settings: {
        Args: {
          p_user_id: string
          p_version: number
        }
        Returns: Json
      },
      get_token_transactions_cached: {
        Args: {
          p_user_id: string
          p_limit?: number
          p_offset?: number
        }
        Returns: Json
      },
      check_kplc_balance_improved: {
        Args: {
          p_user_id: string
          p_meter_number: string
        }
        Returns: Json
      },
      process_notification_queue: {
        Args: {
          p_limit: number
        }
        Returns: Json
      },
      get_user_notification_dashboard: {
        Args: {
          p_user_id: string
          p_limit?: number
        }
        Returns: {
          notifications: {
            id: string
            title: string
            message: string
            type: string
            severity: string
            is_read: boolean
            token_balance: number | null
            estimated_days: number | null
            metadata: Json | null
            created_at: string
            updated_at: string
            expires_at: string | null
            source_table: string
          }[],
          preferences: Json | null
        }
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

// Define a custom type that extends the default SupabaseClient
export type CustomSupabaseClient = {
  transaction: (operations: Array<{ query: string; params: any }>, user_id: string) => Promise<any>;
  energy: {
    purchaseTokens: (params: {
      user_id: string;
      meter_number: string;
      amount: number;
      payment_method?: string;
      vendor?: string;
      phone_number?: string;
    }) => Promise<any>;
    getTokenAnalytics: (user_id: string, forceRefresh?: boolean) => Promise<any>;
    updateProfile: (params: {
      p_user_id: string;
      p_updates: {
        energy_provider?: 'KPLC' | 'Solar' | 'IPP' | 'Other' | '';
        notifications_enabled?: boolean;
        auto_optimize?: boolean;
        energy_rate?: number;
        email?: string;
        full_name?: string;
        phone_number?: string;
        meter_number?: string;
        meter_category?: string;
        industry_type?: string;
        notification_preferences?: Record<string, any>;
        kplc_meter_type?: string;
        low_balance_threshold?: number;
      };
    }) => Promise<any>;
    insertEnergyReading: (params: {
      user_id: string;
      meter_number: string;
      kwh_consumed: number;
      cost_per_kwh?: number;
    }) => Promise<any>;
  };
  notifications: {
    processQueue: (limit?: number) => Promise<any>;
    getHistory: (user_id: string, limit?: number) => Promise<any>;
    revertSettings: (user_id: string, version: number) => Promise<any>;
  };
} & import('@supabase/supabase-js').SupabaseClient<Database>;