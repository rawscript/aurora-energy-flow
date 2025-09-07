// Enhanced Supabase client with improved error handling and transaction support
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database, CustomSupabaseClient } from './types';

// Use environment variables for security
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLIC_KEY;

// Validate environment variables
if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  throw new Error('Supabase configuration is missing. Please check your environment variables.');
}

// Create the Supabase client with optimized configuration
const supabase = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce'
    },
    global: {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    },
    db: {
      schema: 'public'
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  }
) as CustomSupabaseClient;

// Enhanced error handling class
class SupabaseError extends Error {
  constructor(
    message: string,
    public code: string,
    public details: any,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'SupabaseError';
  }
}

// Enhanced query builder with better error handling and transaction support
const originalFrom = supabase.from;
supabase.from = function(table) {
  const query = originalFrom.call(this, table);

  // Add error handling to all query types
  const methodsToWrap = ['select', 'insert', 'update', 'upsert', 'delete', 'rpc'];

  methodsToWrap.forEach(method => {
    if (query[method]) {
      const originalMethod = query[method];
      query[method] = function(...args) {
        const result = originalMethod.apply(this, args);

        // Wrap the then method to add error handling
        const originalThen = result.then;
        result.then = function(onFulfilled, onRejected) {
          return originalThen.call(
            this,
            (result) => {
              if (result.error) {
                // Enhanced error logging with context
                const errorContext = {
                  table: table,
                  method: method,
                  args: args,
                  error: result.error
                };

                // Only log non-PGRST116 errors (PGRST116 is "no rows found" which is expected)
                if (result.error.code !== 'PGRST116') {
                  console.error(`Supabase ${method} error for ${table}:`, errorContext);
                }

                // Convert to our enhanced error format
                if (onFulfilled) {
                  return onFulfilled({
                    ...result,
                    error: new SupabaseError(
                      result.error.message,
                      result.error.code,
                      errorContext,
                      result.error
                    )
                  });
                }
              }
              return onFulfilled ? onFulfilled(result) : result;
            },
            onRejected
          );
        };

        return result;
      };
    }
  });

  return query;
};

// Type for safe_update_profile parameters with enhanced validation
type SafeUpdateProfileParams = {
  p_user_id: string;
  p_updates: {
    energy_provider?: 'KPLC' | 'Solar' | 'KenGEn' | 'IPP' | 'Other' | '';
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
};

// Add transaction support using the new execute_transaction endpoint
supabase.transaction = async function<T>(operations: Array<{ query: string; params: any }>, user_id: string): Promise<any> {
  try {
    const { data, error } = await supabase.rpc('execute_transaction', {
      p_operations: operations,
      p_user_id: user_id,
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error in transaction:', error);
    throw new SupabaseError(
      error.message,
      error.code || 'TRANSACTION_FAILED',
      { operations, user_id, originalError: error }
    );
  }
};

// Add helper functions for common operations
supabase.energy = {
  /**
   * Purchase tokens with enhanced error handling
   */
  purchaseTokens: async function(params: {
    user_id: string;
    meter_number: string;
    amount: number;
    payment_method?: string;
    vendor?: string;
    phone_number?: string;
  }) {
    try {
      const { data, error } = await supabase.rpc('purchase_tokens_improved', {
        p_user_id: params.user_id,
        p_meter_number: params.meter_number,
        p_amount: params.amount,
        p_payment_method: params.payment_method || 'M-PESA',
        p_vendor: params.vendor || 'M-PESA',
        p_phone_number: params.phone_number
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error in purchaseTokens:', error);
      throw new SupabaseError(
        error.message,
        error.code || 'PURCHASE_FAILED',
        { params: params, originalError: error }
      );
    }
  },

  /**
   * Get token analytics with caching
   */
  getTokenAnalytics: async function(user_id: string, forceRefresh = false) {
    try {
      const { data, error } = await supabase.rpc('get_token_analytics_improved', {
        p_user_id: user_id,
        p_force_refresh: forceRefresh
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error in getTokenAnalytics:', error);
      throw new SupabaseError(
        error.message,
        error.code || 'ANALYTICS_FAILED',
        { user_id, forceRefresh, originalError: error }
      );
    }
  },

  /**
   * Update profile with enhanced validation
   */
  updateProfile: async function(params: SafeUpdateProfileParams) {
    try {
      const { data, error } = await supabase.rpc('safe_update_profile', params);

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error in updateProfile:', error);
      throw new SupabaseError(
        error.message,
        error.code || 'PROFILE_UPDATE_FAILED',
        { params: params, originalError: error }
      );
    }
  },

  /**
   * Insert energy reading with validation
   */
  insertEnergyReading: async function(params: {
    user_id: string;
    meter_number: string;
    kwh_consumed: number;
    cost_per_kwh?: number;
  }) {
    try {
      const { data, error } = await supabase.rpc('insert_energy_reading_improved', {
        p_user_id: params.user_id,
        p_meter_number: params.meter_number,
        p_kwh_consumed: params.kwh_consumed,
        p_cost_per_kwh: params.cost_per_kwh || 25.0
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error in insertEnergyReading:', error);
      throw new SupabaseError(
        error.message,
        error.code || 'READING_INSERT_FAILED',
        { params: params, originalError: error }
      );
    }
  }
};

// Add notifications helper
supabase.notifications = {
  /**
   * Process notification queue
   */
  processQueue: async function(limit = 10) {
    try {
      const { data, error } = await supabase.rpc('process_notification_queue', {
        p_limit: limit
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error in processQueue:', error);
      throw new SupabaseError(
        error.message,
        error.code || 'QUEUE_PROCESSING_FAILED',
        { limit, originalError: error }
      );
    }
  },

  /**
   * Get notification history
   */
  getHistory: async function(user_id: string, limit = 10) {
    try {
      const { data, error } = await supabase.rpc('get_energy_settings_history', {
        p_user_id: user_id,
        p_limit: limit
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error in getHistory:', error);
      throw new SupabaseError(
        error.message,
        error.code || 'HISTORY_FETCH_FAILED',
        { user_id, limit, originalError: error }
      );
    }
  },

  /**
   * Revert to previous settings
   */
  revertSettings: async function(user_id: string, version: number) {
    try {
      const { data, error } = await supabase.rpc('revert_energy_settings', {
        p_user_id: user_id,
        p_version: version
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error in revertSettings:', error);
      throw new SupabaseError(
        error.message,
        error.code || 'REVERT_FAILED',
        { user_id, version, originalError: error }
      );
    }
  }
};

// Export the enhanced supabase client
export { supabase, SupabaseError };
