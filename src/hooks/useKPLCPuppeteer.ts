import { useState, useCallback } from 'react';
import { useAuthenticatedApi } from './useAuthenticatedApi';
import { useToast } from '../hooks/use-toast';
import { kplcService, KPLCBillData, KPLCError } from '../utils/kplcPuppeteer';
import { supabase } from '../integrations/supabase/client';
import type { Database } from '../integrations/supabase/types';

export const useKPLCPuppeteer = () => {
  const [billData, setBillData] = useState<KPLCBillData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<string | null>(null);

  const { user, hasValidSession } = useAuthenticatedApi();
  const { toast } = useToast();

  // Fetch bill data from KPLC portal using actual Puppeteer service
  const fetchBillData = useCallback(async (meterNumber: string, idNumber: string) => {
    if (!hasValidSession() || !user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to fetch KPLC bill data.",
        variant: "destructive",
      });
      return { error: 'AUTHENTICATION_REQUIRED' };
    }

    try {
      setLoading(true);
      setError(null);

      // Instead of using the local Puppeteer service, call our Supabase function
      // that integrates with the actual Puppeteer service
      const { data, error: rpcError } = await supabase.functions.invoke('puppeteer_kplc_service', {
        body: {
          action: 'fetch_bill_data',
          user_id: user.id,
          meter_number: meterNumber
        }
      });

      if (rpcError) {
        const message = rpcError.message || 'Failed to fetch bill data from KPLC portal.';
        setError(message);
        toast({
          title: "Fetch Failed",
          description: message,
          variant: "destructive",
        });

        return { error: 'UNKNOWN_ERROR' as KPLCError, message };
      }

      if (data && data.success) {
        // Save to database
        await kplcService.saveBillData(user.id, data.data);
        
        // Update state
        setBillData(data.data);
        setLastFetched(data.data.fetchedAt);
        
        toast({
          title: "Success",
          description: "Successfully fetched KPLC bill data.",
        });

        return { data: data.data };
      } else {
        const errorMessage = data?.error || 'No data returned from KPLC portal.';
        setError(errorMessage);
        toast({
          title: "Fetch Failed",
          description: errorMessage,
          variant: "destructive",
        });

        return { error: 'UNKNOWN_ERROR' as KPLCError, message: errorMessage };
      }
    } catch (err) {
      console.error('Error fetching KPLC bill data:', err);
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      setError(message);
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
      return { error: 'UNKNOWN_ERROR' as KPLCError, message };
    } finally {
      setLoading(false);
    }
  }, [hasValidSession, user, toast]);

  // Get latest bill data from database
  const getLatestBillData = useCallback(async (meterNumber: string) => {
    if (!hasValidSession() || !user) {
      return null;
    }

    try {
      setLoading(true);
      setError(null);

      const data = await kplcService.getLatestBillData(user.id, meterNumber);
      
      if (data) {
        // Convert to KPLCBillData format
        const billData: KPLCBillData = {
          accountName: (data as any).account_name || '',
          accountNumber: (data as any).account_number || '',
          meterNumber: (data as any).meter_number || '',
          currentReading: Number((data as any).current_reading) || 0,
          previousReading: Number((data as any).previous_reading) || 0,
          consumption: Number((data as any).consumption) || 0,
          billAmount: Number((data as any).bill_amount) || 0,
          dueDate: (data as any).due_date || '',
          billingPeriod: (data as any).billing_period || '',
          lastPaymentDate: (data as any).last_payment_date || '',
          lastPaymentAmount: Number((data as any).last_payment_amount) || 0,
          outstandingBalance: Number((data as any).outstanding_balance) || 0,
          address: (data as any).address || '',
          tariff: (data as any).tariff || '',
          status: ((data as any).status as 'active' | 'inactive' | 'disconnected') || 'inactive',
          fetchedAt: (data as any).fetched_at || new Date().toISOString()
        };

        setBillData(billData);
        setLastFetched((data as any).fetched_at || new Date().toISOString());
        return billData;
      }

      return null;
    } catch (err) {
      console.error('Error fetching latest bill data:', err);
      const message = err instanceof Error ? err.message : 'Failed to fetch latest bill data.';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [hasValidSession, user]);

  // Get user's meter number and ID number
  const getUserCredentials = useCallback(async () => {
    if (!hasValidSession() || !user) {
      return { meterNumber: null, idNumber: null };
    }

    try {
      // Get meter number from profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('meter_number, phone_number')
        .eq('id', user.id)
        .maybeSingle<Database['public']['Tables']['profiles']['Row']>();

      if (profileError) {
        console.error('Error fetching user credentials:', profileError);
        return { meterNumber: null, idNumber: null };
      }

      return {
        meterNumber: profile?.meter_number || null,
        idNumber: profile?.phone_number || null
      };
    } catch (err) {
      console.error('Exception fetching user credentials:', err);
      return { meterNumber: null, idNumber: null };
    }
  }, [hasValidSession, user]);

  return {
    billData,
    loading,
    error,
    lastFetched,
    fetchBillData,
    getLatestBillData,
    getUserCredentials
  };
};