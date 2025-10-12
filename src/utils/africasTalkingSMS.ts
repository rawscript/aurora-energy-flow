import { supabase } from '../integrations/supabase/client';

// Africa's Talking SMS API configuration
const AT_API_KEY = import.meta.env.VITE_AFRICAS_TALKING_API_KEY;
const AT_USERNAME = import.meta.env.VITE_AFRICAS_TALKING_USERNAME;
const AT_BASE_URL = 'https://api.africastalking.com/version1';

// KPLC SMS number
const KPLC_SMS_NUMBER = '95551';

// SMS response patterns for KPLC
const SMS_PATTERNS = {
  BALANCE: /balance.*?(\d+(?:\.\d+)?)/i,
  TOKEN: /token.*?(\d{20})/i,
  UNITS: /units.*?(\d+(?:\.\d+)?)/i,
  METER_READING: /reading.*?(\d+)/i,
  BILL_AMOUNT: /bill.*?(\d+(?:\.\d+)?)/i,
  DUE_DATE: /due.*?(\d{1,2}\/\d{1,2}\/\d{4})/i,
  ACCOUNT: /account.*?(\d+)/i,
  REFERENCE: /ref(?:erence)?.*?([A-Z0-9]+)/i
};

export interface KPLCSMSData {
  accountName?: string;
  accountNumber?: string;
  meterNumber: string;
  currentReading?: number;
  previousReading?: number;
  consumption?: number;
  billAmount?: number;
  dueDate?: string;
  billingPeriod?: string;
  lastPaymentDate?: string;
  lastPaymentAmount?: number;
  outstandingBalance?: number;
  address?: string;
  tariff?: string;
  status: 'active' | 'inactive' | 'disconnected';
  fetchedAt: string;
  source: 'sms';
}

export interface KPLCTokenData {
  tokenCode: string;
  referenceNumber: string;
  amount: number;
  units: number;
  timestamp: string;
  source: 'sms';
}

export class AfricasTalkingSMSService {
  private apiKey: string;
  private username: string;

  constructor() {
    this.apiKey = AT_API_KEY || '';
    this.username = AT_USERNAME || '';
    
    if (!this.apiKey || !this.username) {
      console.warn('Africa\'s Talking credentials not configured. SMS fallback will not work.');
    }
  }

  // Send SMS to KPLC for balance inquiry
  async checkBalance(meterNumber: string, phoneNumber: string): Promise<{ success: boolean; data?: KPLCSMSData; error?: string }> {
    try {
      const message = `BAL ${meterNumber}`;
      const smsResponse = await this.sendSMS(KPLC_SMS_NUMBER, message, phoneNumber);
      
      if (!smsResponse.success) {
        return { success: false, error: smsResponse.error };
      }

      // Wait for response SMS (in real implementation, this would be handled by webhook)
      await this.delay(5000); // Wait 5 seconds for KPLC response
      
      const responseData = await this.getLatestSMSResponse(phoneNumber, 'balance');
      
      if (responseData) {
        const parsedData = this.parseBalanceResponse(responseData, meterNumber);
        return { success: true, data: parsedData };
      }

      return { success: false, error: 'No response received from KPLC' };
    } catch (error) {
      console.error('Error checking balance via SMS:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Send SMS to KPLC for token purchase
  async purchaseTokens(
    meterNumber: string, 
    amount: number, 
    phoneNumber: string
  ): Promise<{ success: boolean; data?: KPLCTokenData; error?: string }> {
    try {
      const message = `BUY ${meterNumber} ${amount}`;
      const smsResponse = await this.sendSMS(KPLC_SMS_NUMBER, message, phoneNumber);
      
      if (!smsResponse.success) {
        return { success: false, error: smsResponse.error };
      }

      // Wait for response SMS
      await this.delay(10000); // Wait 10 seconds for token generation
      
      const responseData = await this.getLatestSMSResponse(phoneNumber, 'token');
      
      if (responseData) {
        const parsedData = this.parseTokenResponse(responseData, amount);
        return { success: true, data: parsedData };
      }

      return { success: false, error: 'No token response received from KPLC' };
    } catch (error) {
      console.error('Error purchasing tokens via SMS:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Send USSD request via Africa's Talking
  async sendUSSDRequest(ussdCode: string, phoneNumber: string): Promise<{ success: boolean; data?: string; error?: string }> {
    try {
      const response = await fetch(`${AT_BASE_URL}/ussd/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'apiKey': this.apiKey,
          'Accept': 'application/json'
        },
        body: new URLSearchParams({
          username: this.username,
          phoneNumber: phoneNumber,
          ussdCode: ussdCode
        })
      });

      const result = await response.json();
      
      if (result.status === 'Success') {
        return { success: true, data: result.response };
      } else {
        return { success: false, error: result.description || 'USSD request failed' };
      }
    } catch (error) {
      console.error('Error sending USSD request:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Send SMS via Africa's Talking
  private async sendSMS(to: string, message: string, from: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${AT_BASE_URL}/messaging`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'apiKey': this.apiKey,
          'Accept': 'application/json'
        },
        body: new URLSearchParams({
          username: this.username,
          to: to,
          message: message,
          from: from
        })
      });

      const result = await response.json();
      
      if (result.SMSMessageData && result.SMSMessageData.Recipients) {
        const recipient = result.SMSMessageData.Recipients[0];
        if (recipient.status === 'Success') {
          return { success: true };
        } else {
          return { success: false, error: recipient.status };
        }
      }
      
      return { success: false, error: 'Invalid response format' };
    } catch (error) {
      console.error('Error sending SMS:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Get latest SMS response from database (would be populated by webhook)
  private async getLatestSMSResponse(phoneNumber: string, type: 'balance' | 'token'): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('sms_responses')
        .select('message')
        .eq('phone_number', phoneNumber)
        .eq('type', type)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        console.error('Error fetching SMS response:', error);
        return null;
      }

      return data?.message || null;
    } catch (error) {
      console.error('Error getting SMS response:', error);
      return null;
    }
  }

  // Parse balance response from KPLC SMS
  private parseBalanceResponse(message: string, meterNumber: string): KPLCSMSData {
    const balance = this.extractPattern(message, SMS_PATTERNS.BALANCE);
    const reading = this.extractPattern(message, SMS_PATTERNS.METER_READING);
    const billAmount = this.extractPattern(message, SMS_PATTERNS.BILL_AMOUNT);
    const dueDate = this.extractPattern(message, SMS_PATTERNS.DUE_DATE);
    const accountNumber = this.extractPattern(message, SMS_PATTERNS.ACCOUNT);

    return {
      meterNumber,
      accountNumber: accountNumber || 'Unknown',
      currentReading: reading ? parseInt(reading) : 0,
      billAmount: billAmount ? parseFloat(billAmount) : 0,
      outstandingBalance: balance ? parseFloat(balance) : 0,
      dueDate: dueDate || '',
      status: balance && parseFloat(balance) > 0 ? 'active' : 'inactive',
      fetchedAt: new Date().toISOString(),
      source: 'sms'
    };
  }

  // Parse token response from KPLC SMS
  private parseTokenResponse(message: string, amount: number): KPLCTokenData {
    const tokenCode = this.extractPattern(message, SMS_PATTERNS.TOKEN);
    const units = this.extractPattern(message, SMS_PATTERNS.UNITS);
    const reference = this.extractPattern(message, SMS_PATTERNS.REFERENCE);

    return {
      tokenCode: tokenCode || this.generateFallbackToken(amount),
      referenceNumber: reference || `SMS${Date.now()}`,
      amount,
      units: units ? parseFloat(units) : amount, // Assume 1:1 ratio if not specified
      timestamp: new Date().toISOString(),
      source: 'sms'
    };
  }

  // Extract pattern from SMS message
  private extractPattern(message: string, pattern: RegExp): string | null {
    const match = message.match(pattern);
    return match ? match[1] : null;
  }

  // Generate fallback token if parsing fails
  private generateFallbackToken(amount: number): string {
    const timestamp = Date.now().toString();
    const amountStr = amount.toString().padStart(4, '0');
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${amountStr}${timestamp.slice(-8)}${random}`.substring(0, 20);
  }

  // Utility delay function
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Check if SMS service is configured
  isConfigured(): boolean {
    return !!(this.apiKey && this.username);
  }
}

// Create singleton instance
export const africasTalkingSMSService = new AfricasTalkingSMSService();

// Utility function to check if SMS fallback should be used
export const shouldUseSMSFallback = (energyProvider: string): boolean => {
  return energyProvider === 'KPLC' && africasTalkingSMSService.isConfigured();
};