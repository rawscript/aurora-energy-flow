import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../integrations/supabase/client';
import { useToast } from './use-toast';
import type { Database } from '../integrations/supabase/types';

// Define the type for allowed RPC function names
type RpcFunctionName = keyof Database['public']['Functions'];
// Define the type for allowed table names
type TableName = keyof Database['public']['Tables'];

interface RpcOptions {
  showErrorToast?: boolean;
  cacheKey?: string;
  cacheDuration?: number;
  retryCount?: number;
}

interface CacheEntry {
  data: any;
  timestamp: number;
  expiresAt: number;
}

// Global cache for RPC results to prevent duplicate calls
const rpcCache = new Map<string, CacheEntry>();
const DEFAULT_CACHE_DURATION = 120000; // Increase to 2 minutes (increased from 1 minute)
const MAX_CACHE_DURATION = 600000; // Increase to 10 minutes maximum cache

// Fallback data for missing RPC functions
const getFallbackData = (functionName: string): any => {
  switch (functionName) {
    case 'get_or_create_profile':
      return {
        id: 'fallback-profile',
        user_id: null,
        meter_number: null,
        phone_number: null,
        energy_provider: 'kplc',
        notifications_enabled: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

    case 'initialize_user_notifications':
      console.log('Using fallback for initialize_user_notifications');
      return { 
        success: true, 
        message: 'Notifications initialized (fallback)',
        welcome_notification_id: 'fallback-notification'
      };

    case 'get_user_notifications_safe':
      console.log('Using fallback for get_user_notifications_safe');
      return [
        {
          id: 'fallback-welcome',
          title: 'Welcome to Aurora Energy Flow!',
          message: 'Your account has been set up successfully. Start managing your energy consumption today.',
          type: 'welcome',
          severity: 'low',
          is_read: false,
          token_balance: null,
          estimated_days: null,
          metadata: { is_welcome: true, setup_complete: true },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          expires_at: null,
          source_table: 'fallback'
        }
      ];

    case 'check_user_notification_initialization':
      return { 
        initialized: true,
        profile_exists: true,
        notification_count: 1,
        has_notifications: true
      };

    case 'get_notification_preferences':
      return {
        email_notifications: true,
        sms_notifications: true,
        push_notifications: true,
        low_balance_alerts: true,
        token_purchase_confirmations: true,
        system_updates: true,
        marketing_communications: false
      };

    case 'get_energy_data':
      return {
        current_usage: 0,
        daily_total: 0,
        weekly_average: 0,
        monthly_total: 0,
        efficiency_score: 75
      };

    case 'get_token_analytics_cached':
      return {
        current_balance: 0,
        daily_usage: 0,
        weekly_usage: 0,
        monthly_usage: 0,
        estimated_days_remaining: 0,
        last_purchase_date: null,
        total_purchases: 0
      };

    default:
      console.warn(`No fallback data defined for function: ${functionName}`);
      return null;
  }
};

/**
 * Simplified authenticated API hook
 * - Works with new AuthContext
 * - Reduced complexity and caching conflicts
 * - Better session validation
 */
export const useAuthenticatedApi = () => {
  const { user, session, isAuthenticated } = useAuth();
  const { toast } = useToast();

  // Memoized user ID to prevent unnecessary re-renders
  const userId = useMemo(() => user?.id || null, [user?.id]);

  // Track last session to prevent excessive cache clearing
  const lastSessionIdRef = useRef<string | undefined>(undefined);

  // Simple session validation - no caching to prevent conflicts
  const hasValidSession = useCallback(() => {
    if (!isAuthenticated || !user || !session) {
      return false;
    }

    const nowSeconds = Math.floor(Date.now() / 1000);
    const expiresAt = session.expires_at || 0;
    const isValid = expiresAt > nowSeconds;

    return isValid;
  }, [isAuthenticated, user, session]);

  // Check if user is authenticated (simple check)
  const isUserAuthenticated = useCallback(() => {
    return isAuthenticated;
  }, [isAuthenticated]);

  // Clear caches when session changes
  const clearCache = useCallback(() => {
    rpcCache.clear();
    // Only log cache clearing when debugging
    // console.log('Cleared API caches due to session change');
  }, []);

  // Get cached RPC result
  const getCachedResult = useCallback((cacheKey: string): any | null => {
    const cached = rpcCache.get(cacheKey);
    if (!cached) return null;

    const now = Date.now();
    if (now > cached.expiresAt) {
      rpcCache.delete(cacheKey);
      return null;
    }

    // Only log cache usage for debugging when needed
    // console.log(`Using cached result for: ${cacheKey}`);
    return cached.data;
  }, []);

  // Set cached RPC result
  const setCachedResult = useCallback((cacheKey: string, data: any, cacheDuration: number) => {
    const now = Date.now();
    // Cap cache duration to prevent overly long caching
    const effectiveCacheDuration = Math.min(cacheDuration, MAX_CACHE_DURATION);
    rpcCache.set(cacheKey, {
      data,
      timestamp: now,
      expiresAt: now + effectiveCacheDuration
    });
  }, []);

  // Memoized auth headers to prevent regeneration
  const authHeaders = useMemo(() => {
    if (!hasValidSession() || !session?.access_token) {
      return null;
    }

    return {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
      'apikey': (typeof process !== 'undefined' && process.env.VITE_SUPABASE_ANON_KEY) || ''
    };
  }, [session?.access_token, hasValidSession]);

  // Get authenticated headers for API calls
  const getAuthHeaders = useCallback(() => {
    if (!authHeaders) {
      throw new Error('No valid authentication session');
    }
    return authHeaders;
  }, [authHeaders]);

  // Enhanced RPC call with caching and error handling
  const callRpc = useCallback(async (
    functionName: RpcFunctionName,
    params: Record<string, any> = {},
    options: RpcOptions = {}
  ) => {
    const {
      showErrorToast = true,
      cacheKey,
      cacheDuration = DEFAULT_CACHE_DURATION,
      retryCount = 0
    } = options;

    // Check cache first if cacheKey is provided
    if (cacheKey) {
      const cachedResult = getCachedResult(cacheKey);
      if (cachedResult !== null) {
        return cachedResult;
      }
    }

    if (!hasValidSession()) {
      const error = new Error('Authentication required');
      if (showErrorToast) {
        toast({
          title: "Authentication Required",
          description: "Please sign in to continue.",
          variant: "destructive"
        });
      }
      throw error;
    }

    try {
      // Only log RPC calls when explicitly requested to reduce console noise
      // console.log(`Calling RPC: ${functionName}${cacheKey ? ` (cache: ${cacheKey})` : ''}`);

      const { data, error } = await supabase.rpc(functionName, {
        ...params,
        p_user_id: params.p_user_id || userId
      });

      if (error) {
        console.error(`RPC call ${String(functionName)} failed:`, error);

        // Check if this is a missing function error (404/PGRST202)
        if (error.code === 'PGRST202' || error.message?.includes('Could not find the function')) {
          console.log(`Missing RPC function: ${String(functionName)} - using fallback`);

          // Return appropriate fallback data for missing functions
          const fallbackData = getFallbackData(String(functionName));
          if (fallbackData !== null) {
            console.log(`Using fallback data for ${String(functionName)}`);
            return fallbackData;
          }
        }

        // Check if this is an authentication error
        if (error.message && (error.message.includes('JWT') || error.message.includes('token') || error.message.includes('auth') || error.message.includes('401') || error.message.includes('403'))) {
          console.log('Authentication error detected in RPC call');
        }

        if (showErrorToast) {
          toast({
            title: "Operation Failed",
            description: error.message || `Failed to execute ${String(functionName)}`,
            variant: "destructive"
          });
        }
        throw error;
      }

      // Cache successful results
      if (cacheKey && data !== null) {
        setCachedResult(cacheKey, data, cacheDuration);
      }

      return data;
    } catch (error) {
      console.error(`Error calling ${String(functionName)}:`, error);

      // Check if this is an authentication error
      if (error.message && (error.message.includes('JWT') || error.message.includes('token') || error.message.includes('auth') || error.message.includes('401') || error.message.includes('403'))) {
        console.log('Authentication error detected in RPC call catch block');
      }

      // Only show toast for first retry attempt
      if (showErrorToast && retryCount === 0) {
        toast({
          title: "Request Failed",
          description: `Could not complete ${String(functionName)}. Please try again.`,
          variant: "destructive"
        });
      }

      throw error;
    }
  }, [hasValidSession, userId, toast, getCachedResult, setCachedResult]);

  // Authenticated query builder
  const query = useCallback(<T extends TableName>(table: T) => {
    if (!hasValidSession()) {
      throw new Error('Authentication required');
    }

    return supabase.from(table);
  }, [hasValidSession]);

  // Batch RPC calls to reduce API overhead
  const batchRpc = useCallback(async (
    calls: Array<{
      functionName: RpcFunctionName;
      params?: Record<string, any>;
      options?: RpcOptions
    }>
  ) => {
    if (!hasValidSession()) {
      throw new Error('Authentication required');
    }

    console.log(`Executing batch RPC with ${calls.length} calls`);

    const results = await Promise.allSettled(
      calls.map(({ functionName, params = {}, options = {} }) =>
        callRpc(functionName, params, { ...options, showErrorToast: false })
      )
    );

    return results.map((result, index) => ({
      functionName: calls[index].functionName,
      success: result.status === 'fulfilled',
      data: result.status === 'fulfilled' ? result.value : null,
      error: result.status === 'rejected' ? result.reason : null
    }));
  }, [hasValidSession, callRpc]);

  // Get current user data (cached from auth context)
  const getCurrentUser = useCallback(() => {
    return hasValidSession() ? user : null;
  }, [hasValidSession, user]);

  // Get current session data (cached from auth context)
  const getCurrentSession = useCallback(() => {
    return hasValidSession() ? session : null;
  }, [hasValidSession, session]);

  // Clear cache when session changes - with intelligent filtering
  useEffect(() => {
    const currentUserId = session?.user?.id;

    // Only clear cache if user actually changed (not just token refresh)
    if (currentUserId !== lastSessionIdRef.current) {
      if (lastSessionIdRef.current !== undefined) {
        console.log('User changed, clearing API cache');
        clearCache();
      }
      lastSessionIdRef.current = currentUserId;
    }
  }, [session?.user?.id, clearCache]);

  return {
    // Status checks (optimized)
    isAuthenticated: isUserAuthenticated,
    hasValidSession,

    // User data (from context, no API calls)
    user: getCurrentUser(),
    session: getCurrentSession(),
    userId,

    // API methods (enhanced)
    callRpc,
    query,
    getAuthHeaders,
    batchRpc,

    // Cache management
    clearCache,

    // Utility methods
    getCachedResult,
    setCachedResult
  };
};