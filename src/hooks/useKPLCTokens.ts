import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface TokenAnalytics {
  current_balance: number;
  daily_consumption_avg: number;
  estimated_days_remaining: number;
  monthly_spending: number;
  last_purchase_date: string | null;
  consumption_trend: 'increasing' | 'decreasing' | 'stable';
  last_updated: string | null;
  data_source: 'cache' | 'database' | 'kplc_api' | 'no_meter';
  cache_hit: boolean;
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
}

interface KPLCBalance {
  success: boolean;
  balance: number;
  meter_number: string;
  last_updated: string;
  source: 'cache' | 'kplc_api' | 'mock';
}

export const useKPLCTokens = () => {
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

      // Use the cached analytics function
      const { data, error } = await supabase.rpc('get_token_analytics_cached', {
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

      if (data && data.length > 0) {
        const analyticsData = data[0];
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
        // No data available
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

      const { data, error } = await supabase.rpc('get_token_transactions_cached', {
        p_user_id: user!.id,
        p_limit: limit,
        p_offset: offset
      });

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching transactions:', error);
        return;
      }

      setTransactions(data || []);
      console.log(`Loaded ${(data || []).length} transactions`);
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

      const { data, error } = await supabase.rpc('check_kplc_balance', {
        p_user_id: user!.id,
        p_meter_number: meterNumber
      });

      if (error) {
        console.error('Error checking KPLC balance:', error);
        return null;
      }

      const balanceData: KPLCBalance = {
        success: data.success,
        balance: data.balance,
        meter_number: data.meter_number,
        last_updated: data.last_updated,
        source: data.source
      };

      setKplcBalance(balanceData);
      console.log(`KPLC balance loaded from ${data.source}: KSh ${data.balance}`);

      return balanceData;
    } catch (error) {
      console.error('Exception checking KPLC balance:', error);
      return null;
    }
  }, [hasValidSession, user, getMeterNumber]);

  // Purchase tokens via KPLC API
  const purchaseTokens = useCallback(async (
    amount: number, 
    paymentMethod: string = 'M-PESA',
    phoneNumber?: string
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

      console.log(`Purchasing KSh ${amount} tokens for meter ${meterNumber}`);

      // Call the enhanced purchase function
      const { data, error } = await supabase.rpc('purchase_tokens_kplc', {
        p_user_id: user!.id,
        p_meter_number: meterNumber,
        p_amount: amount,
        p_payment_method: paymentMethod,
        p_phone_number: phoneNumber
      });

      if (error) {
        console.error('Error purchasing tokens:', error);
        throw new Error(error.message || 'Token purchase failed');
      }

      if (!data.success) {
        throw new Error(data.error || 'Token purchase failed');
      }

      console.log('Token purchase successful:', data);

      toast({
        title: 'Token Purchase Successful! 🎉',
        description: `Successfully purchased KSh ${amount} worth of tokens.`,
      });

      // Show token code in a separate toast
      setTimeout(() => {
        toast({
          title: 'Token Code Ready',
          description: `Enter this code in your meter: ${data.token_code}`,
          duration: 15000, // Show for 15 seconds
        });
      }, 1000);

      // Refresh data after successful purchase
      setTimeout(() => {
        fetchTokenAnalytics(true); // Force refresh
        fetchTransactions();
        checkKPLCBalance();
      }, 2000);

      return data;
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

      // Update token balance
      await supabase.rpc('update_token_balance', {
        p_user_id: user!.id,
        p_meter_number: meterNumber,
        p_amount: amount,
        p_transaction_type: 'consumption'
      });

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