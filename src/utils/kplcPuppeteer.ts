import puppeteer, { Browser, Page } from 'puppeteer';
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

export class KPLCPuppeteerService {
  private browser: Browser | null = null;
  private isInitialized = false;

  // Initialize Puppeteer browser
  async initialize() {
    if (this.isInitialized) return;
    
    try {
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ]
      });
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize Puppeteer:', error);
      throw new Error('Failed to initialize browser automation');
    }
  }

  // Close browser
  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.isInitialized = false;
    }
  }

  // Fetch bill data from KPLC portal
  async fetchBillData(meterNumber: string, idNumber: string): Promise<{ data?: KPLCBillData; error?: KPLCError; message?: string }> {
    if (!this.isInitialized || !this.browser) {
      await this.initialize();
    }

    let page: Page | null = null;
    
    try {
      page = await this.browser.newPage();
      
      // Set viewport and user agent
      await page.setViewport({ width: 1920, height: 1080 });
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      
      // Set timeout
      page.setDefaultTimeout(30000);
      
      // Navigate to KPLC self-service portal
      await page.goto('https://selfservice.kplc.co.ke/', { waitUntil: 'networkidle2' });
      
      // Wait for login form
      await page.waitForSelector('#meterno', { timeout: 10000 });
      
      // Fill in meter number
      await page.type('#meterno', meterNumber);
      
      // Fill in ID number
      await page.type('#idno', idNumber);
      
      // Submit form
      await Promise.all([
        page.click('#btnlogin'),
        page.waitForNavigation({ waitUntil: 'networkidle2' })
      ]);
      
      // Check if login was successful
      const errorElement = await page.$('.alert-danger');
      if (errorElement) {
        const errorMessage = await page.evaluate(el => el.textContent, errorElement);
        if (errorMessage?.includes('Invalid')) {
          return { error: 'INVALID_CREDENTIALS', message: 'Invalid meter number or ID number' };
        }
        return { error: 'UNKNOWN_ERROR', message: 'Login failed' };
      }
      
      // Wait for dashboard to load
      await page.waitForSelector('.dashboard-content', { timeout: 15000 });
      
      // Extract bill data
      const billData = await page.evaluate(() => {
        const getText = (selector: string) => {
          const element = document.querySelector(selector);
          return element ? element.textContent?.trim() || '' : '';
        };
        
        const getNumber = (selector: string) => {
          const text = getText(selector);
          const number = text.replace(/[^\d.-]/g, '');
          return number ? parseFloat(number) : 0;
        };
        
        return {
          accountName: getText('#accountName'),
          accountNumber: getText('#accountNumber'),
          meterNumber: getText('#meterNumber'),
          currentReading: getNumber('#currentReading'),
          previousReading: getNumber('#previousReading'),
          consumption: getNumber('#consumption'),
          billAmount: getNumber('#billAmount'),
          dueDate: getText('#dueDate'),
          billingPeriod: getText('#billingPeriod'),
          lastPaymentDate: getText('#lastPaymentDate'),
          lastPaymentAmount: getNumber('#lastPaymentAmount'),
          outstandingBalance: getNumber('#outstandingBalance'),
          address: getText('#address'),
          tariff: getText('#tariff'),
          status: getText('#status').toLowerCase().includes('active') ? 'active' : 'inactive',
          fetchedAt: new Date().toISOString()
        } as KPLCBillData;
      });
      
      // Validate data
      if (!billData.accountNumber || !billData.meterNumber) {
        return { error: 'ACCOUNT_NOT_FOUND', message: 'Could not extract account information' };
      }
      
      return { data: billData };
      
    } catch (error: any) {
      console.error('Puppeteer error:', error);
      
      // Handle specific errors
      if (error.name === 'TimeoutError') {
        return { error: 'TIMEOUT', message: 'Request timed out. KPLC portal may be slow or unavailable.' };
      }
      
      if (error.message?.includes('net::ERR_')) {
        return { error: 'NETWORK_ERROR', message: 'Network error connecting to KPLC portal.' };
      }
      
      return { error: 'UNKNOWN_ERROR', message: `Failed to fetch data: ${error.message || 'Unknown error'}` };
    } finally {
      // Close page
      if (page) {
        await page.close();
      }
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
    // Try to fetch from Puppeteer
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