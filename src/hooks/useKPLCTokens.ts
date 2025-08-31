import { useState, useEffect, useCallback, useRef } from 'react';
import { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

// Extend Supabase client type to include custom RPC functions
type CustomSupabaseClient = SupabaseClient & {
  rpc<Args extends Record<string, any>, Returns>(
    fn: 'get_token_analytics_cached',
    args?: Args
  ): Promise<{ data: Returns[] | Returns | null; error: any }>;
  
  rpc<Args extends Record<string, any>, Returns>(
    fn: 'get_token_transactions_cached',
    args?: Args
  ): Promise<{ data: Returns[] | Returns | null; error: any }>;
  
  rpc<Args extends Record<string, any>, Returns>(
    fn: 'check_kplc_balance',
    args?: Args
  ): Promise<{ data: Returns[] | Returns | null; error: any }>;
  
  rpc<Args extends Record<string, any>, Returns>(
    fn: 'purchase_tokens_kplc' | 'purchase_tokens_solar',
    args?: Args
  ): Promise<{ data: Returns[] | Returns | null; error: any }>;
  
  rpc<Args extends Record<string, any>, Returns>(
    fn: 'update_token_balance',
    args?: Args
  ): Promise<{ data: Returns[] | Returns | null; error: any }>;
};

// Cast supabase client to include custom RPC types
const typedSupabase = supabase as CustomSupabaseClient;

interface TokenAnalytics {
  current_balance: number;
  daily_consumption_avg: number;
  estimated_days_remaining: number;
  monthly_spending: number;
  last_purchase_date: string | null;
  consumption_trend: 'increasing' | 'decreasing' | 'stable';
  last_updated: string | null;
  data_source: 'cache' | 'database' | 'kplc_api' | 'solar_api' | 'no_meter';
  cache_hit: boolean;
}

// Type guard for TokenAnalytics
function isTokenAnalytics(obj: any): obj is TokenAnalytics {
  return obj && 
    typeof obj === 'object' &&
    typeof obj.current_balance === 'number' &&
    typeof obj.daily_consumption_avg === 'number' &&
    typeof obj.estimated_days_remaining === 'number' &&
    typeof obj.monthly_spending === 'number';
}

interface TokenTransaction {
  id: string;
  transaction_type: 'purchase' | 'consumption' | 'refund' | 'adjustment';
  amount: number;
  token_units?: number;
  token_code?: string;
  transaction_date: string;
  reference_number?: string;
  vendor?: string;
  payment_method?: string;
  balance_before: number;
  balance_after: number;
  status: string;
  metadata?: any;
  provider?: 'KPLC' | 'Solar' | 'SunCulture' | 'M-KOPA Solar' | 'KenGEn' | 'IPP' | 'Other' | '';
}

// Type guard for TokenTransaction
function isTokenTransaction(obj: any): obj is TokenTransaction {
  return obj && 
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    typeof obj.transaction_type === 'string' &&
    typeof obj.amount === 'number' &&
    typeof obj.transaction_date === 'string' &&
    typeof obj.balance_before === 'number' &&
    typeof obj.balance_after === 'number' &&
    typeof obj.status === 'string';
}

interface KPLCBalance {
  success: boolean;
  balance: number;
  meter_number: string;
  last_updated: string;
  source: 'cache' | 'kplc_api' | 'solar_api' | 'mock';
}

// Type guard for KPLCBalance
function isKPLCBalance(obj: any): obj is KPLCBalance {
  return obj && 
    typeof obj === 'object' &&
    typeof obj.success === 'boolean' &&
    typeof obj.balance === 'number' &&
    typeof obj.meter_number === 'string' &&
    typeof obj.last_updated === 'string' &&
    typeof obj.source === 'string';
}

export const useKPLCTokens = (energyProvider: string = '') => {
  const [analytics, setAnalytics] = useState<TokenAnalytics | null>(null);
  const [transactions, setTransactions] = useState<TokenTransaction[]>([]);
  const [kplcBalance, setKplcBalance] = useState<KPLCBalance | null>(null);
  const [loading, setLoading] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { user, session } = useAuth();
  const { toast } = useToast();
  
  const isInitialized = useRef(false);
  const lastFetchTime = useRef<number>(0);
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const subscriptionRef = useRef<any>(null);

  // Safe session check without triggering auth issues
  const hasValidSession = useCallback(() => {
    return user && session && !loading;
  }, [user, session, loading]);

  // Get user's meter number safely
  const getMeterNumber = useCallback(async (): Promise<string | null> => {
    if (!hasValidSession()) return null;

    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('meter_number')
        .eq('id', user!.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching meter number:', error);
        return null;
      }

      return profile?.meter_number || null;
    } catch (error) {
      console.error('Exception fetching meter number:', error);
      return null;
    }
  }, [hasValidSession, user]);

  // Fetch token analytics with caching
  const fetchTokenAnalytics = useCallback(async (forceRefresh = false) => {
    if (!hasValidSession()) {
      setAnalytics(null);
      return;
    }

    // Prevent too frequent requests
    const now = Date.now();
    if (!forceRefresh && (now - lastFetchTime.current) < 30000) { // 30 seconds cooldown
      console.log('Skipping analytics fetch - too soon since last request');
      return;
    }

    try {
      setError(null);
      lastFetchTime.current = now;

      // Clear any existing timeout
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }

      // Set timeout to prevent hanging
      fetchTimeoutRef.current = setTimeout(() => {
        console.log('Analytics fetch timeout');
        setError('Request timeout - using cached data');
      }, 8000);

      console.log('Fetching token analytics...');

      // Use the cached analytics function - with proper error handling
      const { data, error } = await typedSupabase.rpc('get_token_analytics_cached', {
        p_user_id: user!.id,
        p_force_refresh: forceRefresh
      });

      // Clear timeout on response
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
        fetchTimeoutRef.current = null;
      }

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching token analytics:', error);
        setError('Failed to load token data');
        return;
      }

      // Handle different data formats that might be returned
      let analyticsData;
      if (Array.isArray(data) && data.length > 0) {
        analyticsData = data[0];
      } else if (data && typeof data === 'object' && !Array.isArray(data)) {
        analyticsData = data;
      } else {
        analyticsData = null;
      }

      if (analyticsData && isTokenAnalytics(analyticsData)) {
        setAnalytics({
          current_balance: analyticsData.current_balance || 0,
          daily_consumption_avg: analyticsData.daily_consumption_avg || 0,
          estimated_days_remaining: analyticsData.estimated_days_remaining || 0,
          monthly_spending: analyticsData.monthly_spending || 0,
          last_purchase_date: analyticsData.last_purchase_date,
          consumption_trend: analyticsData.consumption_trend || 'stable',
          last_updated: analyticsData.last_updated,
          data_source: analyticsData.data_source || 'database',
          cache_hit: analyticsData.cache_hit || false
        });

        console.log(`Analytics loaded from ${analyticsData.data_source} (cache hit: ${analyticsData.cache_hit})`);
      } else {
        // No data available or invalid data
        setAnalytics({
          current_balance: 0,
          daily_consumption_avg: 0,
          estimated_days_remaining: 0,
          monthly_spending: 0,
          last_purchase_date: null,
          consumption_trend: 'stable',
          last_updated: null,
          data_source: 'no_meter',
          cache_hit: false
        });
      }
    } catch (error) {
      console.error('Exception fetching token analytics:', error);
      setError('Connection error loading token data');
      
      // Clear timeout
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
        fetchTimeoutRef.current = null;
      }
    }
  }, [hasValidSession, user]);

  // Fetch token transactions with pagination
  const fetchTransactions = useCallback(async (limit = 20, offset = 0) => {
    if (!hasValidSession()) {
      setTransactions([]);
      return;
    }

    try {
      console.log('Fetching token transactions...');

      // Call the transactions function with proper error handling
      const { data, error } = await typedSupabase.rpc('get_token_transactions_cached', {
        p_user_id: user!.id,
        p_limit: limit,
        p_offset: offset
      });

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching transactions:', error);
        return;
      }

      // Handle different data formats that might be returned
      let transactionsData: TokenTransaction[] = [];
      if (Array.isArray(data)) {
        transactionsData = data
          .filter(isTokenTransaction)
          .map(item => ({
            id: item.id || '',
            transaction_type: item.transaction_type || 'purchase',
            amount: item.amount || 0,
            token_units: item.token_units,
            token_code: item.token_code,
            transaction_date: item.transaction_date || new Date().toISOString(),
            reference_number: item.reference_number,
            vendor: item.vendor,
            payment_method: item.payment_method,
            balance_before: item.balance_before || 0,
            balance_after: item.balance_after || 0,
            status: item.status || 'unknown',
            metadata: item.metadata,
            provider: item.provider
          }));
      }

      setTransactions(transactionsData);
      console.log(`Loaded ${transactionsData.length} transactions`);
    } catch (error) {
      console.error('Exception fetching transactions:', error);
    }
  }, [hasValidSession, user]);

  // Check KPLC balance via API
  const checkKPLCBalance = useCallback(async () => {
    if (!hasValidSession()) return null;

    try {
      const meterNumber = await getMeterNumber();
      if (!meterNumber) {
        console.log('No meter number available for balance check');
        return null;
      }

      console.log('Checking KPLC balance...');

      // Call the balance check function with proper error handling
      const { data, error } = await typedSupabase.rpc('check_kplc_balance', {
        p_user_id: user!.id,
        p_meter_number: meterNumber
      });

      if (error) {
        console.error('Error checking KPLC balance:', error);
        return null;
      }

      // Handle different data formats that might be returned
      let balanceDataRaw;
      if (Array.isArray(data) && data.length > 0) {
        balanceDataRaw = data[0];
      } else if (data && typeof data === 'object' && !Array.isArray(data)) {
        balanceDataRaw = data;
      } else {
        balanceDataRaw = null;
      }

      if (!balanceDataRaw) {
        console.error('No balance data returned');
        return null;
      }

      // Validate the data with type guard
      if (isKPLCBalance(balanceDataRaw)) {
        const balanceData: KPLCBalance = {
          success: balanceDataRaw.success,
          balance: balanceDataRaw.balance,
          meter_number: balanceDataRaw.meter_number,
          last_updated: balanceDataRaw.last_updated,
          source: balanceDataRaw.source
        };

        setKplcBalance(balanceData);
        console.log(`KPLC balance loaded from ${balanceData.source}: KSh ${balanceData.balance}`);

        return balanceData;
      } else {
        // Fallback for invalid data
        const balanceData: KPLCBalance = {
          success: true,
          balance: 0,
          meter_number: meterNumber,
          last_updated: new Date().toISOString(),
          source: 'mock'
        };

        setKplcBalance(balanceData);
        console.log(`Mock KPLC balance loaded: KSh ${balanceData.balance}`);

        return balanceData;
      }
    } catch (error) {
      console.error('Exception checking KPLC balance:', error);
      return null;
    }
  }, [hasValidSession, user, getMeterNumber]);

  // Purchase tokens via KPLC API
  const purchaseTokens = useCallback(async (
    amount: number,
    paymentMethod: string = 'M-PESA',
    phoneNumber?: string,
    provider: 'KPLC' | 'Solar' | 'SunCulture' | 'M-KOPA Solar' | 'KenGEn' | 'IPP' | 'Other' | '' = ''
  ) => {
    if (!hasValidSession() || purchasing) return null;

    try {
      setPurchasing(true);
      setError(null);

      const meterNumber = await getMeterNumber();
      if (!meterNumber) {
        toast({
          title: 'Meter Setup Required',
          description: 'Please set up your meter number in Settings before purchasing tokens.',
          variant: 'destructive'
        });
        return null;
      }

      // Default to KPLC if provider is empty
      const effectiveProvider = provider || 'KPLC';

      console.log(`Purchasing KSh ${amount} tokens for meter ${meterNumber} via ${effectiveProvider}`);

      let purchaseFunction: 'purchase_tokens_kplc' | 'purchase_tokens_solar' = 'purchase_tokens_kplc';
      let successMessage = `Successfully purchased KSh ${amount} worth of tokens.`;
      let tokenCodeField = 'token_code';

      // Use the appropriate purchase function based on the provider
      if (effectiveProvider === 'Solar' || effectiveProvider === 'SunCulture' || effectiveProvider === 'M-KOPA Solar') {
        purchaseFunction = 'purchase_tokens_solar';
        successMessage = `Successfully purchased KSh ${amount} worth of solar credits.`;
        tokenCodeField = 'transaction_reference';
      }

      // Call the appropriate purchase function with proper error handling
      const { data, error } = await typedSupabase.rpc(purchaseFunction, {
        p_user_id: user!.id,
        p_meter_number: meterNumber,
        p_amount: amount,
        p_payment_method: paymentMethod,
        p_phone_number: phoneNumber,
        p_provider: effectiveProvider
      });

      if (error) {
        console.error('Error purchasing tokens:', error);
        throw new Error(error.message || 'Token purchase failed');
      }

      // Handle different data formats that might be returned
      let purchaseData;
      if (Array.isArray(data) && data.length > 0) {
        purchaseData = data[0];
      } else if (data && typeof data === 'object' && !Array.isArray(data)) {
        purchaseData = data;
      } else {
        purchaseData = null;
      }

      if (!purchaseData) {
        throw new Error('No data returned from purchase function');
      }

      const isSuccess = purchaseData.success !== undefined ? Boolean(purchaseData.success) : true;
      if (!isSuccess) {
        const errorMessage = purchaseData.error || 'Token purchase failed';
        throw new Error(errorMessage);
      }

      console.log('Token purchase successful:', purchaseData);

      toast({
        title: 'Purchase Successful! 🎉',
        description: successMessage,
      });

      // Show transaction reference or token code in a separate toast
      const tokenValue = purchaseData[tokenCodeField] || purchaseData.token_code || purchaseData.transaction_reference || 'N/A';
      setTimeout(() => {
        toast({
          title: (effectiveProvider === 'KPLC' || provider === '') ? 'Token Code Ready' : 'Transaction Reference',
          description: (effectiveProvider === 'KPLC' || provider === '')
            ? `Enter this code in your meter: ${tokenValue}`
            : `Your transaction reference is: ${tokenValue}`,
          duration: 15000, // Show for 15 seconds
        });
      }, 1000);

      // Refresh data after successful purchase
      setTimeout(() => {
        fetchTokenAnalytics(true); // Force refresh
        fetchTransactions();
        if (effectiveProvider === 'KPLC' || provider === '') checkKPLCBalance();
      }, 2000);

      return purchaseData;
    } catch (error) {
      console.error('Error purchasing tokens:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to purchase tokens. Please try again.';

      toast({
        title: 'Purchase Failed',
        description: errorMessage,
        variant: 'destructive'
      });

      setError(errorMessage);
      return null;
    } finally {
      setPurchasing(false);
    }
  }, [hasValidSession, user, purchasing, getMeterNumber, toast, fetchTokenAnalytics, fetchTransactions, checkKPLCBalance]);

  // Record token consumption (for meter readings)
  const recordConsumption = useCallback(async (amount: number) => {
    if (!hasValidSession()) return;

    try {
      const meterNumber = await getMeterNumber();
      if (!meterNumber) return;

      console.log(`Recording consumption: KSh ${amount}`);

      // Update token balance with proper error handling
      const { data, error } = await typedSupabase.rpc('update_token_balance', {
        p_user_id: user!.id,
        p_meter_number: meterNumber,
        p_amount: amount,
        p_transaction_type: 'consumption'
      });

      if (error) {
        console.error('Error recording consumption:', error);
        return;
      }

      // Refresh analytics after consumption
      setTimeout(() => {
        fetchTokenAnalytics(true);
      }, 1000);
    } catch (error) {
      console.error('Error recording consumption:', error);
    }
  }, [hasValidSession, user, getMeterNumber, fetchTokenAnalytics]);

  // Initialize data on mount
  useEffect(() => {
    if (!isInitialized.current && hasValidSession()) {
      isInitialized.current = true;
      setLoading(true);
      
      console.log('Initializing KPLC tokens data...');
      
      Promise.all([
        fetchTokenAnalytics(),
        fetchTransactions()
      ]).finally(() => {
        setLoading(false);
      });
    } else if (!user) {
      // Reset state when user logs out
      setAnalytics(null);
      setTransactions([]);
      setKplcBalance(null);
      setError(null);
      setLoading(false);
      isInitialized.current = false;
      lastFetchTime.current = 0;
    }
  }, [hasValidSession, user, fetchTokenAnalytics, fetchTransactions]);

  // Set up minimal real-time subscription (only for critical updates)
  useEffect(() => {
    if (!hasValidSession()) return;

    // Clean up existing subscription
    if (subscriptionRef.current) {
      supabase.removeChannel(subscriptionRef.current);
      subscriptionRef.current = null;
    }

    // Only subscribe to purchase transactions (not all changes)
    subscriptionRef.current = supabase
      .channel('token_purchases')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'kplc_token_transactions',
        filter: `user_id=eq.${user!.id} AND transaction_type=eq.purchase`
      }, (payload) => {
        console.log('New token purchase detected:', payload);
        
        // Only refresh if it's a recent transaction (within last 5 minutes)
        const transactionDate = new Date(payload.new.transaction_date);
        const now = new Date();
        const diffMinutes = (now.getTime() - transactionDate.getTime()) / (1000 * 60);
        
        if (diffMinutes <= 5) {
          setTimeout(() => {
            fetchTokenAnalytics(true);
            fetchTransactions();
          }, 2000);
        }
      })
      .subscribe();

    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }
    };
  }, [hasValidSession, user, fetchTokenAnalytics, fetchTransactions]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, []);

  return {
    analytics,
    transactions,
    kplcBalance,
    loading,
    purchasing,
    error,
    purchaseTokens,
    recordConsumption,
    checkKPLCBalance,
    fetchTokenAnalytics: () => fetchTokenAnalytics(true),
    fetchTransactions,
    getMeterNumber,
    hasValidSession: hasValidSession()
  };
};