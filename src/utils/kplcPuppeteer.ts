import { supabase } from '@/integrations/supabase/client';
import { kplcSMSService } from './kplcSMSService';

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
  | 'UNKNOWN_ERROR'
  | 'UNSUPPORTED_PROVIDER';

// Enhanced service that uses SMS-only approach (no more Puppeteer)
export class KPLCSMSOnlyService {
  // Fetch bill data from KPLC via SMS - SMS ONLY approach
  async fetchBillData(meterNumber: string, userId?: string, energyProvider?: string, phoneNumber?: string): Promise<{ data?: KPLCBillData; error?: KPLCError; message?: string }> {
    try {
      // For KPLC, use SMS-only approach (no more Puppeteer)
      if (energyProvider === 'KPLC' || !energyProvider) {
        console.log('🚀 Using SMS-only approach for KPLC...');
        
        if (!phoneNumber) {
          // Try to get phone number from user profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('phone_number')
            .eq('id', userId)
            .single();
          
          phoneNumber = profile?.phone_number;
        }
        
        if (!phoneNumber) {
          return { 
            error: 'INVALID_CREDENTIALS', 
            message: 'Phone number is required for SMS-based KPLC operations. Please update your profile.' 
          };
        }
        
        const smsResult = await this.fetchBillDataViaSMS(meterNumber, phoneNumber, userId);
        return smsResult;
      }

      // For non-KPLC providers, return error (Puppeteer removed)
      return { 
        error: 'UNSUPPORTED_PROVIDER', 
        message: `Provider ${energyProvider} is not supported. Only KPLC via SMS is currently available.` 
      };
      
    } catch (error: any) {
      console.error('Exception in fetchBillData:', error);
      return { error: 'UNKNOWN_ERROR', message: `Failed to fetch data: ${error.message || 'Unknown error'}` };
    }
  }



  // Fetch bill data via SMS
  private async fetchBillDataViaSMS(meterNumber: string, phoneNumber: string, userId?: string): Promise<{ data?: KPLCBillData; error?: KPLCError; message?: string }> {
    try {
      // Use the new SMS service
      const smsData = await kplcSMSService.fetchBillData(meterNumber, phoneNumber, userId || '');
      
      // Convert SMS data format to the expected format
      const billData: KPLCBillData = {
        accountName: smsData.accountName,
        accountNumber: smsData.accountNumber,
        meterNumber: smsData.meterNumber,
        currentReading: smsData.currentReading,
        previousReading: smsData.previousReading,
        consumption: smsData.consumption,
        billAmount: smsData.billAmount,
        outstandingBalance: smsData.outstandingBalance,
        dueDate: smsData.dueDate,
        billingPeriod: smsData.billingPeriod,
        lastPaymentDate: smsData.lastPaymentDate,
        lastPaymentAmount: smsData.lastPaymentAmount,
        status: smsData.status,
        fetchedAt: smsData.fetchedAt,
        source: 'sms',
        address: smsData.address,
        tariff: smsData.tariff
      };

      return { data: billData };
    } catch (error: any) {
      console.error('Exception calling SMS service:', error);
      return { error: 'UNKNOWN_ERROR', message: `Failed to fetch data via SMS: ${error.message || 'Unknown error'}` };
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
export const kplcService = new KPLCSMSOnlyService();

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