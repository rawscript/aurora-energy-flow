import { useCallback, useMemo, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

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
const DEFAULT_CACHE_DURATION = 30000; // 30 seconds

/**
 * Production-ready authenticated API hook
 * - Centralizes authentication logic
 * - Prevents duplicate auth calls
 * - Implements caching to reduce API overhead
 * - Optimized session validation
 */
export const useAuthenticatedApi = () => {
  const { user, session, isAuthenticated } = useAuth();
  const { toast } = useToast();
  
  // Cache session validity to prevent frequent checks
  const sessionValidityCache = useRef<{ isValid: boolean; timestamp: number } | null>(null);
  const VALIDITY_CACHE_DURATION = 5000; // 5 seconds

  // Memoized user ID to prevent unnecessary re-renders
  const userId = useMemo(() => user?.id || null, [user?.id]);

  // Optimized session validation with caching
  const hasValidSession = useCallback(() => {
    const now = Date.now();
    
    // Use cached result if it's recent
    if (sessionValidityCache.current && (now - sessionValidityCache.current.timestamp) < VALIDITY_CACHE_DURATION) {
      return sessionValidityCache.current.isValid;
    }

    // Perform validation
    if (!isAuthenticated || !user || !session) {
      sessionValidityCache.current = { isValid: false, timestamp: now };
      return false;
    }

    const nowSeconds = Math.floor(now / 1000);
    const expiresAt = session.expires_at || 0;
    const isValid = expiresAt > (nowSeconds + 300); // 5-minute buffer

    // Cache the result
    sessionValidityCache.current = { isValid, timestamp: now };
    return isValid;
  }, [isAuthenticated, user, session]);

  // Clear caches when session changes
  const clearCache = useCallback(() => {
    rpcCache.clear();
    sessionValidityCache.current = null;
    console.log('Cleared API caches due to session change');
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

    console.log(`Using cached result for: ${cacheKey}`);
    return cached.data;
  }, []);

  // Set cached RPC result
  const setCachedResult = useCallback((cacheKey: string, data: any, cacheDuration: number) => {
    const now = Date.now();
    rpcCache.set(cacheKey, {
      data,
      timestamp: now,
      expiresAt: now + cacheDuration
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
      'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || ''
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
      console.log(`Calling RPC: ${functionName}${cacheKey ? ` (cache: ${cacheKey})` : ''}`);
      
      const { data, error } = await supabase.rpc(functionName, {
        ...params,
        p_user_id: params.p_user_id || userId
      });

      if (error) {
        console.error(`RPC call ${functionName} failed:`, error);
        if (showErrorToast) {
          toast({
            title: "Operation Failed",
            description: error.message || `Failed to execute ${functionName}`,
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
      console.error(`Error calling ${functionName}:`, error);
      
      // Only show toast for first retry attempt
      if (showErrorToast && retryCount === 0) {
        toast({
          title: "Request Failed",
          description: `Could not complete ${functionName}. Please try again.`,
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

  // Clear session validity cache when session changes
  useMemo(() => {
    sessionValidityCache.current = null;
  }, [session?.access_token]);

  return {
    // Status checks (optimized)
    isAuthenticated,
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