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

      console.log('Checking KPLC balance via Puppeteer service...');

      // Call our Supabase function that integrates with the actual Puppeteer service
      const { data, error: rpcError } = await supabase.functions.invoke('puppeteer_kplc_service', {
        body: {
          action: 'fetch_bill_data',
          meter_number: meterNumber
        }
      });

      if (rpcError) {
        console.error('Error checking KPLC balance:', rpcError);
        setError(rpcError.message || 'Failed to check KPLC balance');
        return null;
      }

      if (data && data.success) {
        // Extract balance from the response with correct structure
        const balanceData: KPLCBalance = {
          success: true,
          balance: data.data.outstandingBalance || 0,
          meter_number: data.data.meterNumber || meterNumber,
          last_updated: data.data.fetchedAt || new Date().toISOString(),
          source: 'kplc_api' // Using kplc_api to indicate it came from KPLC via Puppeteer
        };

        // Update state
        setKplcBalance(balanceData);
        return balanceData;
      } else {
        console.error('Failed to fetch balance data:', data?.error);
        setError(data?.error || 'Failed to fetch balance data');
        return null;
      }
    } catch (error: any) {
      console.error('Exception checking KPLC balance:', error);
      setError(error.message || 'Connection error checking KPLC balance');
      return null;
    }
  }, [hasValidSession(), user, getMeterNumber]);

  // Purchase tokens with improved error handling and Puppeteer integration
  const purchaseTokens = useCallback(async (
    amount: number,
    paymentMethod: string = 'M-PESA',
    vendor: string = 'M-PESA',
    phoneNumber?: string
  ) => {
    if (!hasValidSession() || purchasing) return null;

    try {
      setPurchasing(true);
      setError(null);

      const meterNumber = await getMeterNumber();
      if (!meterNumber) {
        toast({
          title: 'Purchase Failed',
          description: 'No meter number found. Please set up your meter first.',
          variant: 'destructive'
        });
        return null;
      }

      console.log(`Purchasing KPLC tokens: KSh ${amount} for meter ${meterNumber}`);

      // Call our Supabase function that integrates with the actual Puppeteer service
      const { data, error: rpcError } = await supabase.functions.invoke('puppeteer_kplc_service', {
        body: {
          action: 'purchase_tokens',
          meter_number: meterNumber,
          amount: amount,
          phone_number: phoneNumber,
          payment_method: paymentMethod,
          vendor: vendor
        }
      });

      if (rpcError) {
        console.error('Error purchasing tokens:', rpcError);
        const errorMessage = rpcError.message || 'Failed to purchase tokens. Please try again.';
        
        toast({
          title: 'Purchase Failed',
          description: errorMessage,
          variant: 'destructive'
        });

        setError(errorMessage);
        return null;
      }

      if (data && data.success) {
        const purchaseData = data.data;
        const tokenValue = purchaseData.tokenCode;
        const tokenFieldName = energyProvider === 'KPLC' || energyProvider === '' ? 'Token Code' : 'Reference';

        toast({
          title: 'Purchase Successful!',
          description: `Successfully purchased KSh ${amount} worth of tokens.`,
        });

        // Show token code after a short delay
        setTimeout(() => {
          toast({
            title: `${tokenFieldName} Ready`,
            description: energyProvider === 'KPLC' || energyProvider === ''
              ? `Enter this code in your meter: ${tokenValue}`
              : `Your ${energyProvider} transaction reference is: ${tokenValue}`,
            duration: 15000, // Show for 15 seconds
          });
        }, 1000);

        // Refresh data after successful purchase
        setTimeout(() => {
          fetchTokenAnalytics(true); // Force refresh
          fetchTransactions();
          if (energyProvider === 'KPLC' || energyProvider === '') checkKPLCBalance();
        }, 2000);

        return purchaseData;
      } else {
        const errorMessage = data?.error || 'Failed to purchase tokens. Please try again.';
        
        toast({
          title: 'Purchase Failed',
          description: errorMessage,
          variant: 'destructive'
        });

        setError(errorMessage);
        return null;
      }
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
  }, [hasValidSession(), user, purchasing, getMeterNumber, toast, fetchTokenAnalytics, fetchTransactions, checkKPLCBalance, energyProvider]);

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