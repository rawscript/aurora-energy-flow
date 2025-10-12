import { supabase } from '@/integrations/supabase/client';
import { africasTalkingSMSService, shouldUseSMSFallback } from './africasTalkingSMS';

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
  source?: 'puppeteer' | 'sms';
}

// Error types
export type KPLCError = 
  | 'INVALID_CREDENTIALS'
  | 'ACCOUNT_NOT_FOUND'
  | 'SERVICE_UNAVAILABLE'
  | 'TIMEOUT'
  | 'NETWORK_ERROR'
  | 'UNKNOWN_ERROR';

// Enhanced service that supports both Puppeteer and SMS fallback
export class KPLCPuppeteerService {
  // Fetch bill data from KPLC portal - SMS FIRST approach
  async fetchBillData(meterNumber: string, userId?: string, energyProvider?: string): Promise<{ data?: KPLCBillData; error?: KPLCError; message?: string }> {
    try {
      // For KPLC, ALWAYS try SMS first if configured
      if (shouldUseSMSFallback(energyProvider || 'KPLC')) {
        console.log('🚀 Using SMS-first approach for KPLC...');
        const smsResult = await this.fetchBillDataViaSMS(meterNumber, userId);
        
        // If SMS works, return it
        if (smsResult.data) {
          console.log('✅ SMS method successful');
          return smsResult;
        }
        
        // If SMS fails, try Puppeteer as backup
        console.log('⚠️ SMS failed, trying Puppeteer backup...');
        const puppeteerResult = await this.fetchBillDataViaPuppeteer(meterNumber, userId);
        
        if (puppeteerResult.data) {
          console.log('✅ Puppeteer backup successful');
          return puppeteerResult;
        }
        
        // Both failed, return SMS error (more informative)
        return smsResult;
      }

      // For non-KPLC providers, use Puppeteer only
      console.log('🔧 Using Puppeteer for non-KPLC provider...');
      return await this.fetchBillDataViaPuppeteer(meterNumber, userId);
      
    } catch (error: any) {
      console.error('Exception in fetchBillData:', error);
      
      // Try SMS as last resort if available
      if (shouldUseSMSFallback(energyProvider || 'KPLC')) {
        console.log('🆘 Exception occurred, trying SMS as last resort...');
        return await this.fetchBillDataViaSMS(meterNumber, userId);
      }
      
      return { error: 'UNKNOWN_ERROR', message: `Failed to fetch data: ${error.message || 'Unknown error'}` };
    }
  }

  // Fetch bill data via Puppeteer (original method)
  private async fetchBillDataViaPuppeteer(meterNumber: string, userId?: string): Promise<{ data?: KPLCBillData; error?: KPLCError; message?: string }> {
    try {
      const { data, error } = await supabase.functions.invoke('puppeteer_kplc_service', {
        body: {
          action: 'fetch_bill_data',
          meter_number: meterNumber,
          user_id: userId
        }
      });

      if (error) {
        console.error('Error calling Puppeteer service:', error);
        return { error: 'UNKNOWN_ERROR', message: error.message || 'Failed to fetch bill data' };
      }

      if (data && data.success) {
        const billData = { ...data.data, source: 'puppeteer' as const };
        return { data: billData };
      } else {
        return { error: 'UNKNOWN_ERROR', message: data?.error || 'Failed to fetch bill data' };
      }
    } catch (error: any) {
      console.error('Exception calling Puppeteer service:', error);
      throw error;
    }
  }

  // Fetch bill data via SMS
  private async fetchBillDataViaSMS(meterNumber: string, userId?: string): Promise<{ data?: KPLCBillData; error?: KPLCError; message?: string }> {
    try {
      // Get user's phone number
      const phoneNumber = await this.getUserPhoneNumber(userId);
      if (!phoneNumber) {
        return { error: 'INVALID_CREDENTIALS', message: 'Phone number required for SMS service' };
      }

      // Use SMS service
      const { data, error } = await supabase.functions.invoke('kplc_sms_service', {
        body: {
          action: 'fetch_bill_data',
          meter_number: meterNumber,
          user_id: userId,
          phone_number: phoneNumber
        }
      });

      if (error) {
        console.error('Error calling SMS service:', error);
        return { error: 'UNKNOWN_ERROR', message: error.message || 'Failed to fetch bill data via SMS' };
      }

      if (data && data.success) {
        const billData = { ...data.data, source: 'sms' as const };
        return { data: billData };
      } else {
        return { error: 'UNKNOWN_ERROR', message: data?.error || 'Failed to fetch bill data via SMS' };
      }
    } catch (error: any) {
      console.error('Exception calling SMS service:', error);
      return { error: 'UNKNOWN_ERROR', message: `Failed to fetch data via SMS: ${error.message || 'Unknown error'}` };
    }
  }

  // Get user's phone number for SMS service
  private async getUserPhoneNumber(userId?: string): Promise<string | null> {
    if (!userId) return null;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('phone_number')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching user phone number:', error);
        return null;
      }

      return data?.phone_number || null;
    } catch (error) {
      console.error('Exception fetching user phone number:', error);
      return null;
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
  meterNumber: string
): Promise<{ data?: KPLCBillData; error?: KPLCError; message?: string }> => {
  try {
    // Try to fetch from backend Puppeteer service
    const result = await kplcService.fetchBillData(meterNumber, userId);
    
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