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

interface TokenBalance {
  id: string;
  user_id: string;
  meter_number: string;
  current_balance: number;
  daily_consumption_avg: number;
  estimated_days_remaining: number;
  low_balance_threshold: number;
  last_updated: string;
}

export const useKPLCTokens = () => {
  const [analytics, setAnalytics] = useState<TokenAnalytics | null>(null);
  const [transactions, setTransactions] = useState<TokenTransaction[]>([]);
  const [balance, setBalance] = useState<TokenBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const { user, session } = useAuth();
  const { toast } = useToast();
  const isInitialized = useRef(false);
  const subscriptionRef = useRef<any>(null);

  // Get user's meter number from profile
  const getMeterNumber = useCallback(async (): Promise<string | null> => {
    if (!user) return null;

    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('meter_number')
        .eq('id', user.id)
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
  }, [user]);

  // Fetch token analytics
  const fetchTokenAnalytics = useCallback(async () => {
    if (!user || !session) {
      setAnalytics(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Try to get analytics from the database function
      const { data, error } = await supabase.rpc('get_token_analytics', {
        p_user_id: user.id
      });

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching token analytics:', error);
        // Fall back to manual calculation
        await fetchTokenAnalyticsManual();
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
          last_updated: analyticsData.last_updated
        });
      } else {
        // No data available, set empty analytics
        setAnalytics({
          current_balance: 0,
          daily_consumption_avg: 0,
          estimated_days_remaining: 0,
          monthly_spending: 0,
          last_purchase_date: null,
          consumption_trend: 'stable',
          last_updated: null
        });
      }
    } catch (error) {
      console.error('Error fetching token analytics:', error);
      await fetchTokenAnalyticsManual();
    } finally {
      setLoading(false);
    }
  }, [user, session]);

  // Manual fallback for analytics calculation
  const fetchTokenAnalyticsManual = useCallback(async () => {
    if (!user) return;

    try {
      const meterNumber = await getMeterNumber();
      if (!meterNumber) {
        setAnalytics({
          current_balance: 0,
          daily_consumption_avg: 0,
          estimated_days_remaining: 0,
          monthly_spending: 0,
          last_purchase_date: null,
          consumption_trend: 'stable',
          last_updated: null
        });
        return;
      }

      // Get token balance
      const { data: balanceData, error: balanceError } = await supabase
        .from('token_balances')
        .select('*')
        .eq('user_id', user.id)
        .eq('meter_number', meterNumber)
        .maybeSingle();

      if (balanceError && balanceError.code !== 'PGRST116') {
        console.error('Error fetching token balance:', balanceError);
      }

      // Get monthly spending
      const { data: transactionData, error: transactionError } = await supabase
        .from('kplc_token_transactions')
        .select('amount')
        .eq('user_id', user.id)
        .eq('transaction_type', 'purchase')
        .gte('transaction_date', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString());

      if (transactionError && transactionError.code !== 'PGRST116') {
        console.error('Error fetching monthly spending:', transactionError);
      }

      // Get last purchase date
      const { data: lastPurchaseData, error: lastPurchaseError } = await supabase
        .from('kplc_token_transactions')
        .select('transaction_date')
        .eq('user_id', user.id)
        .eq('transaction_type', 'purchase')
        .order('transaction_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (lastPurchaseError && lastPurchaseError.code !== 'PGRST116') {
        console.error('Error fetching last purchase:', lastPurchaseError);
      }

      const monthlySpending = (transactionData || []).reduce((sum, t) => sum + t.amount, 0);

      setAnalytics({
        current_balance: balanceData?.current_balance || 0,
        daily_consumption_avg: balanceData?.daily_consumption_avg || 0,
        estimated_days_remaining: balanceData?.estimated_days_remaining || 0,
        monthly_spending: monthlySpending,
        last_purchase_date: lastPurchaseData?.transaction_date || null,
        consumption_trend: 'stable', // Simplified for manual calculation
        last_updated: balanceData?.last_updated || null
      });

      if (balanceData) {
        setBalance(balanceData);
      }
    } catch (error) {
      console.error('Error in manual analytics calculation:', error);
      setAnalytics({
        current_balance: 0,
        daily_consumption_avg: 0,
        estimated_days_remaining: 0,
        monthly_spending: 0,
        last_purchase_date: null,
        consumption_trend: 'stable',
        last_updated: null
      });
    }
  }, [user, getMeterNumber]);

  // Fetch token transactions
  const fetchTransactions = useCallback(async () => {
    if (!user || !session) {
      setTransactions([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('kplc_token_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('transaction_date', { ascending: false })
        .limit(20);

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching transactions:', error);
        return;
      }

      setTransactions(data || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  }, [user, session]);

  // Purchase tokens
  const purchaseTokens = useCallback(async (amount: number, paymentMethod: string = 'M-PESA') => {
    if (!user || !session || purchasing) return null;

    try {
      setPurchasing(true);

      const meterNumber = await getMeterNumber();
      if (!meterNumber) {
        toast({
          title: 'Meter Setup Required',
          description: 'Please set up your meter number in Settings before purchasing tokens.',
          variant: 'destructive'
        });
        return null;
      }

      // Call the purchase function
      const { data, error } = await supabase.rpc('purchase_tokens', {
        p_user_id: user.id,
        p_meter_number: meterNumber,
        p_amount: amount,
        p_payment_method: paymentMethod,
        p_vendor: paymentMethod
      });

      if (error) {
        console.error('Error purchasing tokens:', error);
        throw error;
      }

      const result = data;

      toast({
        title: 'Token Purchase Successful',
        description: `Successfully purchased KSh ${amount} worth of tokens.`,
      });

      // Show token code in a separate toast
      setTimeout(() => {
        toast({
          title: 'Token Code',
          description: `Enter this code in your meter: ${result.token_code}`,
          duration: 15000, // Show for 15 seconds
        });
      }, 1000);

      // Refresh data
      await Promise.all([
        fetchTokenAnalytics(),
        fetchTransactions()
      ]);

      return result;
    } catch (error) {
      console.error('Error purchasing tokens:', error);
      toast({
        title: 'Purchase Failed',
        description: error instanceof Error ? error.message : 'Failed to purchase tokens. Please try again.',
        variant: 'destructive'
      });
      return null;
    } finally {
      setPurchasing(false);
    }
  }, [user, session, purchasing, getMeterNumber, toast, fetchTokenAnalytics, fetchTransactions]);

  // Record token consumption
  const recordConsumption = useCallback(async (amount: number) => {
    if (!user || !session) return;

    try {
      const meterNumber = await getMeterNumber();
      if (!meterNumber) return;

      // Get current balance
      const { data: balanceData } = await supabase
        .from('token_balances')
        .select('current_balance')
        .eq('user_id', user.id)
        .eq('meter_number', meterNumber)
        .maybeSingle();

      const balanceBefore = balanceData?.current_balance || 0;
      const balanceAfter = Math.max(0, balanceBefore - amount);

      // Record consumption transaction
      await supabase
        .from('kplc_token_transactions')
        .insert({
          user_id: user.id,
          meter_number: meterNumber,
          transaction_type: 'consumption',
          amount: amount,
          token_units: amount, // Simplified 1:1 ratio
          balance_before: balanceBefore,
          balance_after: balanceAfter,
          status: 'completed'
        });

      // Update balance
      await supabase.rpc('update_token_balance', {
        p_user_id: user.id,
        p_meter_number: meterNumber,
        p_amount: amount,
        p_transaction_type: 'consumption'
      });

      // Refresh data
      await Promise.all([
        fetchTokenAnalytics(),
        fetchTransactions()
      ]);
    } catch (error) {
      console.error('Error recording consumption:', error);
    }
  }, [user, session, getMeterNumber, fetchTokenAnalytics, fetchTransactions]);

  // Initialize data
  useEffect(() => {
    if (!isInitialized.current && user && session) {
      isInitialized.current = true;
      Promise.all([
        fetchTokenAnalytics(),
        fetchTransactions()
      ]);
    } else if (!user) {
      setAnalytics(null);
      setTransactions([]);
      setBalance(null);
      setLoading(false);
      isInitialized.current = false;
    }
  }, [user, session, fetchTokenAnalytics, fetchTransactions]);

  // Set up real-time subscription
  useEffect(() => {
    if (!user || !session) return;

    // Clean up existing subscription
    if (subscriptionRef.current) {
      supabase.removeChannel(subscriptionRef.current);
    }

    // Subscribe to token-related changes
    subscriptionRef.current = supabase
      .channel('token_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'kplc_token_transactions',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        console.log('Token transaction change received:', payload);
        fetchTransactions();
        fetchTokenAnalytics();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'token_balances',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        console.log('Token balance change received:', payload);
        fetchTokenAnalytics();
      })
      .subscribe();

    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
      }
    };
  }, [user, session, fetchTokenAnalytics, fetchTransactions]);

  return {
    analytics,
    transactions,
    balance,
    loading,
    purchasing,
    purchaseTokens,
    recordConsumption,
    fetchTokenAnalytics,
    fetchTransactions,
    getMeterNumber
  };
};