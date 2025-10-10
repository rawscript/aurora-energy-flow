import { supabase } from '@/integrations/supabase/client';

// KPLC bill data interface
export interface KPLCBillData {
  accountName: string;
  accountNumber: string;
  meterNumber: string;
  currentReading: number;
  previousReading: number;
  consumption: number;
  billAmount: number;
  dueDate: string;
  billingPeriod: string;
  lastPaymentDate: string;
  lastPaymentAmount: number;
  outstandingBalance: number;
  address: string;
  tariff: string;
  status: 'active' | 'inactive' | 'disconnected';
  fetchedAt: string;
}

// Error types
export type KPLCError = 
  | 'INVALID_CREDENTIALS'
  | 'ACCOUNT_NOT_FOUND'
  | 'SERVICE_UNAVAILABLE'
  | 'TIMEOUT'
  | 'NETWORK_ERROR'
  | 'UNKNOWN_ERROR';

// Simplified service that calls the backend Puppeteer function instead of running Puppeteer directly
export class KPLCPuppeteerService {
  // Fetch bill data from KPLC portal via backend function
  async fetchBillData(meterNumber: string, idNumber: string): Promise<{ data?: KPLCBillData; error?: KPLCError; message?: string }> {
    try {
      // Call the backend Puppeteer service instead of running Puppeteer directly
      const { data, error } = await supabase.functions.invoke('puppeteer_kplc_service', {
        body: {
          action: 'fetch_bill_data',
          meter_number: meterNumber,
          id_number: idNumber
        }
      });

      if (error) {
        console.error('Error calling Puppeteer service:', error);
        return { error: 'UNKNOWN_ERROR', message: error.message || 'Failed to fetch bill data' };
      }

      if (data && data.success) {
        return { data: data.data };
      } else {
        return { error: 'UNKNOWN_ERROR', message: data?.error || 'Failed to fetch bill data' };
      }
    } catch (error: any) {
      console.error('Exception calling Puppeteer service:', error);
      return { error: 'UNKNOWN_ERROR', message: `Failed to fetch data: ${error.message || 'Unknown error'}` };
    }
  }

  // Save bill data to Supabase
  async saveBillData(userId: string, billData: KPLCBillData) {
    try {
      const { data, error } = await supabase
        .from('kplc_bills')
        .insert({
          user_id: userId,
          account_name: billData.accountName,
          account_number: billData.accountNumber,
          meter_number: billData.meterNumber,
          current_reading: billData.currentReading,
          previous_reading: billData.previousReading,
          consumption: billData.consumption,
          bill_amount: billData.billAmount,
          due_date: billData.dueDate,
          billing_period: billData.billingPeriod,
          last_payment_date: billData.lastPaymentDate,
          last_payment_amount: billData.lastPaymentAmount,
          outstanding_balance: billData.outstandingBalance,
          address: billData.address,
          tariff: billData.tariff,
          status: billData.status,
          fetched_at: billData.fetchedAt
        })
        .select()
        .single();

      if (error) {
        console.error('Error saving bill data:', error);
        throw new Error('Failed to save bill data');
      }

      return data;
    } catch (error) {
      console.error('Exception saving bill data:', error);
      throw error;
    }
  }

  // Get latest bill data from Supabase
  async getLatestBillData(userId: string, meterNumber: string) {
    try {
      const { data, error } = await supabase
        .from('kplc_bills')
        .select('*')
        .eq('user_id', userId)
        .eq('meter_number', meterNumber)
        .order('fetched_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching bill data:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Exception fetching bill data:', error);
      return null;
    }
  }
}

// Create singleton instance
export const kplcService = new KPLCPuppeteerService();

// Utility function to fetch and save KPLC data
export const fetchAndSaveKPLCData = async (
  userId: string,
  meterNumber: string,
  idNumber: string
): Promise<{ data?: KPLCBillData; error?: KPLCError; message?: string }> => {
  try {
    // Try to fetch from backend Puppeteer service
    const result = await kplcService.fetchBillData(meterNumber, idNumber);
    
    if (result.data) {
      // Save to Supabase
      await kplcService.saveBillData(userId, result.data);
      return result;
    }
    
    return result;
  } catch (error) {
    console.error('Error in fetchAndSaveKPLCData:', error);
    return { error: 'UNKNOWN_ERROR', message: 'Failed to fetch and save KPLC data' };
  }
};