import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthenticatedApi } from '@/hooks/useAuthenticatedApi';
import { useToast } from '@/hooks/use-toast';
import { TokenAnalytics, TokenTransaction, KPLCBalance, isTokenAnalytics, isTokenTransaction, isKPLCBalance } from '@/integrations/supabase/tokenTypes';

export const useKPLCTokens = (energyProvider: string = '') => {
  const [analytics, setAnalytics] = useState<TokenAnalytics | null>(null);
  const [transactions, setTransactions] = useState<TokenTransaction[]>([]);
  const [kplcBalance, setKplcBalance] = useState<KPLCBalance | null>(null);
  const [loading, setLoading] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { user, session, isAuthenticated, hasValidSession } = useAuthenticatedApi();
  const { toast } = useToast();
  const isInitialized = useRef(false);
  const lastFetchTime = useRef<number>(0);
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const subscriptionRef = useRef<any>(null);
  const retryCount = useRef(0);
  const MAX_RETRIES = 3;

  // Get user's meter number safely with retry logic
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
        // Retry once if it's a network error
        if (error.message.includes('network') && retryCount.current < MAX_RETRIES) {
          retryCount.current++;
          await new Promise(resolve => setTimeout(resolve, 1000));
          return getMeterNumber();
        }
        return null;
      }

      return profile?.meter_number || null;
    } catch (error) {
      console.error('Exception fetching meter number:', error);
      // Retry once if it's a network error
      if (error.message.includes('network') && retryCount.current < MAX_RETRIES) {
        retryCount.current++;
        await new Promise(resolve => setTimeout(resolve, 1000));
        return getMeterNumber();
      }
      return null;
    } finally {
      retryCount.current = 0;
    }
  }, [hasValidSession(), user]);

  // Fetch token analytics with caching and improved error handling
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

      console.log(`Fetching token analytics for user ${user!.id}...`);

      // Use the improved analytics function
      let { data, error } = { data: null, error: null };

      try {
        ({ data, error } = await supabase.rpc('get_token_analytics_improved', {
          p_user_id: user!.id,
          p_force_refresh: forceRefresh
        }));
        console.log('Token analytics data:', data);
      } catch (rpcError) {
        console.error('RPC function not found, falling back to direct query:', rpcError);
        error = { message: 'RPC function not found' };
      }

      // Clear timeout on response
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
        fetchTimeoutRef.current = null;
      }

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching token analytics:', error);
        setError(error.message || 'Failed to load token data');

        // Retry once if it's a network error
        if (error.message.includes('network') && retryCount.current < MAX_RETRIES) {
          retryCount.current++;
          await new Promise(resolve => setTimeout(resolve, 1000));
          return fetchTokenAnalytics(forceRefresh);
        }

        // Fallback to default analytics if RPC fails
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
        const updatedAnalytics: TokenAnalytics = {
          current_balance: analyticsData.current_balance || 0,
          daily_consumption_avg: analyticsData.daily_consumption_avg || 0,
          estimated_days_remaining: analyticsData.estimated_days_remaining || 0,
          monthly_spending: analyticsData.monthly_spending || 0,
          last_purchase_date: analyticsData.last_purchase_date,
          consumption_trend: analyticsData.consumption_trend || 'stable',
          last_updated: analyticsData.last_updated,
          data_source: analyticsData.data_source || 'database',
          cache_hit: analyticsData.cache_hit || false
        };

        // Add optional fields if they exist
        if (analyticsData.weekly_kwh_consumed !== undefined) {
          (updatedAnalytics as any).weekly_kwh_consumed = analyticsData.weekly_kwh_consumed;
        }
        if (analyticsData.weekly_cost !== undefined) {
          (updatedAnalytics as any).weekly_cost = analyticsData.weekly_cost;
        }

        setAnalytics(updatedAnalytics);
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
      setError(error.message || 'Connection error loading token data');

      // Clear timeout
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
        fetchTimeoutRef.current = null;
      }
    } finally {
      retryCount.current = 0;
    }
  }, [hasValidSession(), user]);

  // Fetch token transactions with pagination and improved error handling
  const fetchTransactions = useCallback(async (limit: number = 20, offset: number = 0) => {
    if (!hasValidSession()) {
      setTransactions([]);
      return;
    }

    try {
      console.log(`Fetching token transactions for user ${user!.id} (limit: ${limit}, offset: ${offset})...`);

      // Call the transactions function with proper error handling
      let { data, error } = { data: null, error: null };

      try {
        ({ data, error } = await supabase.rpc('get_token_transactions_cached', {
          p_user_id: user!.id,
          p_limit: limit,
          p_offset: offset
        }));
        console.log('Token transactions data:', data);
      } catch (rpcError) {
        console.error('RPC function not found, falling back to direct query:', rpcError);
        error = { message: 'RPC function not found' };
      }

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching transactions:', error);
        // Retry once if it's a network error
        if (error.message.includes('network') && retryCount.current < MAX_RETRIES) {
          retryCount.current++;
          console.log(`Retrying fetchTransactions (attempt ${retryCount.current})...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
          return fetchTransactions(limit, offset);
        }
        setError(error.message || 'Failed to load transactions');
        return;
      }

      // Handle different data formats that might be returned
      let transactionsData: TokenTransaction[] = [];

      if (Array.isArray(data)) {
        // Validate and transform each item
        transactionsData = data
          .filter(isTokenTransaction)
          .map(item => {
            // Explicitly cast each item to TokenTransaction
            const transaction = item as unknown as TokenTransaction;
            return {
              id: transaction.id || '',
              transaction_type: transaction.transaction_type || 'purchase',
              amount: transaction.amount || 0,
              token_units: transaction.token_units,
              token_code: transaction.token_code,
              transaction_date: transaction.transaction_date || new Date().toISOString(),
              reference_number: transaction.reference_number,
              vendor: transaction.vendor,
              payment_method: transaction.payment_method,
              balance_before: transaction.balance_before || 0,
              balance_after: transaction.balance_after || 0,
              status: transaction.status || 'unknown',
              metadata: transaction.metadata,
              provider: transaction.provider || energyProvider
            };
          });
      }

      // Ensure transactionsData is always an array
      setTransactions(transactionsData || []);

      console.log(`Successfully loaded ${transactionsData.length} transactions`);
    } catch (error) {
      console.error('Exception fetching transactions:', error);
      // Retry once if it's a network error
      if (error.message.includes('network') && retryCount.current < MAX_RETRIES) {
        retryCount.current++;
        console.log(`Retrying fetchTransactions (attempt ${retryCount.current})...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return fetchTransactions(limit, offset);
      }
      setError(error.message || 'Connection error loading transactions');
    } finally {
      retryCount.current = 0;
    }
  }, [hasValidSession(), user, energyProvider, setTransactions, setError, retryCount, MAX_RETRIES]);

  // Check KPLC balance via API with improved error handling
  const checkKPLCBalance = useCallback(async () => {
    if (!hasValidSession()) return null;

    try {
      const meterNumber = await getMeterNumber();
      if (!meterNumber) {
        console.log('No meter number available for balance check');
        return null;
      }

      console.log('Checking KPLC balance...');

      // Use the improved balance check function
      const { data, error } = await supabase.rpc('check_kplc_balance_improved', {
        p_user_id: user!.id,
        p_meter_number: meterNumber
      });

      if (error) {
        console.error('Error checking KPLC balance:', error);
        // Retry once if it's a network error
        if (error.message.includes('network') && retryCount.current < MAX_RETRIES) {
          retryCount.current++;
          await new Promise(resolve => setTimeout(resolve, 1000));
          return checkKPLCBalance();
        }
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

        // Add our_balance if it exists
        if (balanceDataRaw.our_balance !== undefined) {
          (balanceData as any).our_balance = balanceDataRaw.our_balance;
        }

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
      // Retry once if it's a network error
      if (error.message.includes('network') && retryCount.current < MAX_RETRIES) {
        retryCount.current++;
        await new Promise(resolve => setTimeout(resolve, 1000));
        return checkKPLCBalance();
      }
      return null;
    } finally {
      retryCount.current = 0;
    }
  }, [hasValidSession(), user, getMeterNumber]);

  // Purchase tokens via KPLC API with improved transaction support
  const purchaseTokens = useCallback(async (
    amount: number,
    paymentMethod: string = 'M-PESA',
    phoneNumber?: string,
    provider: 'KPLC' | 'Solar' | 'SunCulture' | 'M-KOPA Solar' | 'IPP' | 'Other' | '' = ''
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

      // Use the improved purchase function
      const { data, error } = await supabase.energy.purchaseTokens({
        user_id: user!.id,
        meter_number: meterNumber,
        amount: amount,
        payment_method: paymentMethod,
        vendor: effectiveProvider,
        phone_number: phoneNumber
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

      // Show appropriate success message based on provider
      const successMessage = effectiveProvider === 'KPLC' || provider === ''
        ? `Successfully purchased KSh ${amount} worth of tokens.`
        : `Successfully purchased KSh ${amount} worth of ${effectiveProvider} credits.`;

      toast({
        title: 'Purchase Successful! 🎉',
        description: successMessage,
      });

      // Show transaction reference or token code in a separate toast
      const tokenValue = purchaseData.token_code || purchaseData.transaction_reference || 'N/A';
      const tokenFieldName = effectiveProvider === 'KPLC' || provider === ''
        ? 'Token Code'
        : 'Transaction Reference';

      setTimeout(() => {
        toast({
          title: `${tokenFieldName} Ready`,
          description: effectiveProvider === 'KPLC' || provider === ''
            ? `Enter this code in your meter: ${tokenValue}`
            : `Your ${effectiveProvider} transaction reference is: ${tokenValue}`,
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
      retryCount.current = 0;
    }
  }, [hasValidSession(), user, purchasing, getMeterNumber, toast, fetchTokenAnalytics, fetchTransactions, checkKPLCBalance]);

  // Record token consumption (for meter readings) with improved error handling
  const recordConsumption = useCallback(async (amount: number) => {
    if (!hasValidSession()) return;

    try {
      const meterNumber = await getMeterNumber();
      if (!meterNumber) return;

      console.log(`Recording consumption: KSh ${amount}`);

      // Use the improved update function
      const { data, error } = await supabase.energy.insertEnergyReading({
        user_id: user!.id,
        meter_number: meterNumber,
        kwh_consumed: amount,
        cost_per_kwh: 25.0
      });

      if (error) {
        console.error('Error recording consumption:', error);
        // Retry once if it's a network error
        if (error.message.includes('network') && retryCount.current < MAX_RETRIES) {
          retryCount.current++;
          await new Promise(resolve => setTimeout(resolve, 1000));
          return recordConsumption(amount);
        }
        return;
      }

      // Refresh analytics after consumption
      setTimeout(() => {
        fetchTokenAnalytics(true);
      }, 1000);
    } catch (error) {
      console.error('Error recording consumption:', error);
      // Retry once if it's a network error
      if (error.message.includes('network') && retryCount.current < MAX_RETRIES) {
        retryCount.current++;
        await new Promise(resolve => setTimeout(resolve, 1000));
        return recordConsumption(amount);
      }
    } finally {
      retryCount.current = 0;
    }
  }, [hasValidSession(), user, getMeterNumber, fetchTokenAnalytics]);

  // Initialize data on mount with improved error handling
  useEffect(() => {
    if (!isInitialized.current && hasValidSession()) {
      isInitialized.current = true;
      setLoading(true);

      console.log('Initializing KPLC tokens data...');

      // Use Promise.allSettled to handle errors in individual promises
      Promise.allSettled([
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

  // Set up real-time subscription with improved error handling
  useEffect(() => {
    if (!hasValidSession()) return;

    // Clean up existing subscription
    if (subscriptionRef.current) {
      supabase.removeChannel(subscriptionRef.current);
    }

    return () => {
      // Clean up on unmount
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
      }
    };
  }, [hasValidSession]);

  return {
    analytics,
    transactions,
    kplcBalance,
    loading,
    purchasing,
    error,
    hasValidSession,
    fetchTokenAnalytics,
    fetchTransactions,
    checkKPLCBalance,
    purchaseTokens,
    recordConsumption
  };
}