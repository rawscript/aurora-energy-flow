import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthenticatedApi } from '@/hooks/useAuthenticatedApi';
import { useToast } from '@/hooks/use-toast';

// Solar provider payment status interface
interface SolarPaymentStatus {
  total_paid: number;
  total_cost: number;
  remaining_balance: number;
  ownership_percentage: number;
  next_payment_amount: number;
  next_payment_date: string | null;
  payment_frequency: 'daily' | 'weekly' | 'monthly';
  last_payment_date: string | null;
  last_payment_amount: number;
  payment_status: 'current' | 'overdue' | 'delinquent';
  system_size_kw: number;
  installation_date: string;
  warranty_end_date: string;
  maintenance_schedule: string;
}

// Solar transaction interface
interface SolarTransaction {
  id: string;
  transaction_type: 'payment' | 'maintenance' | 'service' | 'adjustment';
  amount: number;
  transaction_date: string;
  reference_number: string;
  payment_method: string;
  balance_before: number;
  balance_after: number;
  status: string;
  description: string;
  system_performance: number; // Percentage
}

// M-KOPA Solar API response types
interface MkopaPaymentStatus {
  total_paid: number;
  total_cost: number;
  remaining_balance: number;
  ownership_percentage: number;
  next_payment_amount: number;
  next_payment_date: string;
  payment_frequency: string;
  last_payment_date: string;
  last_payment_amount: number;
  payment_status: string;
  system_size_kw: number;
  installation_date: string;
  warranty_end_date: string;
  maintenance_schedule: string;
}

interface MkopaTransaction {
  id: string;
  type: string;
  amount: number;
  date: string;
  reference: string;
  payment_method: string;
  balance_before: number;
  balance_after: number;
  status: string;
  description: string;
  system_performance: number;
}

export const useSolarProvider = (providerName: string = 'Solar') => {
  const [paymentStatus, setPaymentStatus] = useState<SolarPaymentStatus | null>(null);
  const [transactions, setTransactions] = useState<SolarTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [purchasing, setPurchasing] = useState(false);

  const { user, hasValidSession } = useAuthenticatedApi();
  const { toast } = useToast();

  // Helper function to convert M-KOPA API response to our internal format
  const convertMkopaPaymentStatus = (mkopaData: MkopaPaymentStatus): SolarPaymentStatus => {
    return {
      total_paid: mkopaData.total_paid,
      total_cost: mkopaData.total_cost,
      remaining_balance: mkopaData.remaining_balance,
      ownership_percentage: mkopaData.ownership_percentage,
      next_payment_amount: mkopaData.next_payment_amount,
      next_payment_date: mkopaData.next_payment_date,
      payment_frequency: mkopaData.payment_frequency as 'daily' | 'weekly' | 'monthly',
      last_payment_date: mkopaData.last_payment_date,
      last_payment_amount: mkopaData.last_payment_amount,
      payment_status: mkopaData.payment_status as 'current' | 'overdue' | 'delinquent',
      system_size_kw: mkopaData.system_size_kw,
      installation_date: mkopaData.installation_date,
      warranty_end_date: mkopaData.warranty_end_date,
      maintenance_schedule: mkopaData.maintenance_schedule
    };
  };

  // Helper function to convert M-KOPA transaction to our internal format
  const convertMkopaTransaction = (mkopaTx: MkopaTransaction): SolarTransaction => {
    return {
      id: mkopaTx.id,
      transaction_type: mkopaTx.type as 'payment' | 'maintenance' | 'service' | 'adjustment',
      amount: mkopaTx.amount,
      transaction_date: mkopaTx.date,
      reference_number: mkopaTx.reference,
      payment_method: mkopaTx.payment_method,
      balance_before: mkopaTx.balance_before,
      balance_after: mkopaTx.balance_after,
      status: mkopaTx.status,
      description: mkopaTx.description,
      system_performance: mkopaTx.system_performance
    };
  };

  // Simulate API delay for realistic UX
  const simulateApiDelay = (ms: number = 1000) => {
    return new Promise(resolve => setTimeout(resolve, ms));
  };

  // Fetch solar payment status from M-KOPA API or other providers
  const fetchPaymentStatus = useCallback(async () => {
    if (!hasValidSession() || !user) {
      setPaymentStatus(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Simulate network delay for realistic UX
      await simulateApiDelay(800);

      // Handle different solar providers
      if (providerName === 'M-KOPA Solar') {
        // M-KOPA Solar with ownership percentage tracking
        const simulatedStatus: SolarPaymentStatus = {
          total_paid: 15000,
          total_cost: 25000,
          remaining_balance: 10000,
          ownership_percentage: 60,
          next_payment_amount: 500,
          next_payment_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week from now
          payment_frequency: 'daily',
          last_payment_date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
          last_payment_amount: 500,
          payment_status: 'current',
          system_size_kw: 3.5,
          installation_date: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year ago
          warranty_end_date: new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000).toISOString(), // 2 years from now
          maintenance_schedule: 'Monthly system check and annual deep cleaning'
        };

        setPaymentStatus(simulatedStatus);
      } else if (providerName === 'SunCulture' || providerName === 'SunKing') {
        // SunCulture and SunKing without ownership percentage tracking
        const genericStatus: SolarPaymentStatus = {
          total_paid: 8000,
          total_cost: 15000,
          remaining_balance: 7000,
          ownership_percentage: 0, // No ownership tracking
          next_payment_amount: 300,
          next_payment_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
          payment_frequency: 'monthly',
          last_payment_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
          last_payment_amount: 300,
          payment_status: 'current',
          system_size_kw: 2.0,
          installation_date: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(), // 6 months ago
          warranty_end_date: new Date(Date.now() + 3 * 365 * 24 * 60 * 60 * 1000).toISOString(), // 3 years from now
          maintenance_schedule: 'Quarterly system check and annual deep cleaning'
        };

        setPaymentStatus(genericStatus);
      } else {
        // Generic solar provider
        const genericStatus: SolarPaymentStatus = {
          total_paid: 8000,
          total_cost: 15000,
          remaining_balance: 7000,
          ownership_percentage: 53,
          next_payment_amount: 300,
          next_payment_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
          payment_frequency: 'monthly',
          last_payment_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
          last_payment_amount: 300,
          payment_status: 'current',
          system_size_kw: 2.0,
          installation_date: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(), // 6 months ago
          warranty_end_date: new Date(Date.now() + 3 * 365 * 24 * 60 * 60 * 1000).toISOString(), // 3 years from now
          maintenance_schedule: 'Quarterly system check and annual deep cleaning'
        };

        setPaymentStatus(genericStatus);
      }
    } catch (err) {
      console.error('Error fetching solar payment status:', err);
      setError('Failed to load payment status. Please try again.');
      setPaymentStatus(null);
    } finally {
      setLoading(false);
    }
  }, [hasValidSession, user, providerName]);

  // Fetch solar transactions from M-KOPA API or other providers
  const fetchTransactions = useCallback(async (limit: number = 20) => {
    if (!hasValidSession() || !user) {
      setTransactions([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Simulate network delay for realistic UX
      await simulateApiDelay(600);

      // For demo purposes, we'll create simulated transactions
      const simulatedTransactions: SolarTransaction[] = [
        {
          id: '1',
          transaction_type: 'payment',
          amount: 500,
          transaction_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          reference_number: 'MKP-2025-001',
          payment_method: 'M-PESA',
          balance_before: 14500,
          balance_after: 15000,
          status: 'completed',
          description: 'Daily solar system payment',
          system_performance: 95
        },
        {
          id: '2',
          transaction_type: 'payment',
          amount: 500,
          transaction_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          reference_number: 'MKP-2025-002',
          payment_method: 'M-PESA',
          balance_before: 14000,
          balance_after: 14500,
          status: 'completed',
          description: 'Daily solar system payment',
          system_performance: 92
        },
        {
          id: '3',
          transaction_type: 'maintenance',
          amount: 0,
          transaction_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          reference_number: 'MNT-2025-001',
          payment_method: 'Service Credit',
          balance_before: 14000,
          balance_after: 14000,
          status: 'completed',
          description: 'Monthly system check and cleaning',
          system_performance: 98
        },
        {
          id: '4',
          transaction_type: 'payment',
          amount: 500,
          transaction_date: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
          reference_number: 'MKP-2025-003',
          payment_method: 'M-PESA',
          balance_before: 13500,
          balance_after: 14000,
          status: 'completed',
          description: 'Daily solar system payment',
          system_performance: 90
        }
      ];

      setTransactions(simulatedTransactions);
    } catch (err) {
      console.error('Error fetching solar transactions:', err);
      setError('Failed to load transactions. Please try again.');
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, [hasValidSession, user]);

  // Purchase solar credits through M-KOPA API or other providers
  const purchaseCredits = useCallback(async (
    amount: number,
    paymentMethod: string = 'M-PESA',
    phoneNumber?: string
  ) => {
    if (!hasValidSession() || !user || purchasing) return false;

    try {
      setPurchasing(true);
      setError(null);

      // Validate input
      if (amount < 10) {
        toast({
          title: "Invalid Amount",
          description: "Minimum payment amount is KSh 10.",
          variant: "destructive",
        });
        return false;
      }

      // Simulate network delay for realistic UX
      await simulateApiDelay(1500);

      // In a real implementation, this would call the solar provider's API
      // For demo purposes, we'll simulate a successful purchase
      toast({
        title: 'Payment Successful! 🎉',
        description: `Successfully paid KSh ${amount} for your solar system.`,
      });

      // Update payment status to reflect the new payment
      if (paymentStatus) {
        const updatedStatus = {
          ...paymentStatus,
          total_paid: paymentStatus.total_paid + amount,
          remaining_balance: paymentStatus.remaining_balance - amount,
          ownership_percentage: Math.min(100, Math.round(((paymentStatus.total_paid + amount) / paymentStatus.total_cost) * 100)),
          last_payment_date: new Date().toISOString(),
          last_payment_amount: amount
        };
        setPaymentStatus(updatedStatus);
      }

      // Add new transaction to the list
      const newTransaction: SolarTransaction = {
        id: `txn-${Date.now()}`,
        transaction_type: 'payment',
        amount: amount,
        transaction_date: new Date().toISOString(),
        reference_number: `PAY-${Date.now().toString().slice(-6)}`,
        payment_method: paymentMethod,
        balance_before: paymentStatus?.total_paid || 0,
        balance_after: (paymentStatus?.total_paid || 0) + amount,
        status: 'completed',
        description: `Payment of KSh ${amount} via ${paymentMethod}`,
        system_performance: 95 // Simulated system performance
      };

      setTransactions(prev => [newTransaction, ...prev]);

      return true;
    } catch (err) {
      console.error('Error purchasing solar credits:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to process payment. Please try again.';
      
      toast({
        title: 'Payment Failed',
        description: errorMessage,
        variant: 'destructive'
      });

      setError(errorMessage);
      return false;
    } finally {
      setPurchasing(false);
    }
  }, [hasValidSession, user, purchasing, toast, paymentStatus]);

  // Initialize data
  useEffect(() => {
    if (hasValidSession() && user) {
      fetchPaymentStatus();
      fetchTransactions();
    }
  }, [hasValidSession, user, fetchPaymentStatus, fetchTransactions]);

  return {
    paymentStatus,
    transactions,
    loading,
    error,
    purchasing,
    fetchPaymentStatus,
    fetchTransactions,
    purchaseCredits
  };
};