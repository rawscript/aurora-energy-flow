import { supabase } from '@/integrations/supabase/client';
import { AlertType } from '../hooks/useAuroraSMS';

export interface QuickAlertOptions {
  phoneNumber: string;
  userId?: string;
  metadata?: any;
}

export class AuroraSMSUtils {
  private static async sendAlert(
    phoneNumber: string,
    message: string,
    alertType: AlertType,
    userId?: string,
    metadata?: any
  ) {
    const { data, error } = await supabase.functions.invoke('aurora_sms_alerts', {
      body: {
        action: 'send_alert',
        user_id: userId,
        phone_number: phoneNumber,
        message: message,
        alert_type: alertType,
        metadata: metadata || {}
      }
    });

    if (error) {
      throw new Error(error.message || 'Failed to send SMS alert');
    }

    if (!data.success) {
      throw new Error(data.data?.error || 'Failed to send SMS alert');
    }

    return data.data;
  }

  /**
   * Send energy low alert
   */
  static async sendEnergyLowAlert(options: QuickAlertOptions & { units: number }) {
    const message = `⚡ AURORA ALERT: Your energy balance is low (${options.units} units remaining). Consider purchasing more tokens to avoid disconnection.`;
    
    return this.sendAlert(
      options.phoneNumber,
      message,
      'energy_low',
      options.userId,
      { ...options.metadata, units: options.units }
    );
  }

  /**
   * Send bill due alert
   */
  static async sendBillDueAlert(options: QuickAlertOptions & { amount: number; dueDate: string }) {
    const message = `💡 AURORA ALERT: Your electricity bill of KSh ${options.amount} is due on ${options.dueDate}. Pay now to avoid late fees.`;
    
    return this.sendAlert(
      options.phoneNumber,
      message,
      'bill_due',
      options.userId,
      { ...options.metadata, amount: options.amount, dueDate: options.dueDate }
    );
  }

  /**
   * Send token purchase confirmation
   */
  static async sendTokenPurchaseAlert(options: QuickAlertOptions & { 
    amount: number; 
    units: number; 
    token: string;
    referenceNumber?: string;
  }) {
    const message = `✅ AURORA ALERT: Token purchase successful! KSh ${options.amount} = ${options.units} units. Token: ${options.token}`;
    
    return this.sendAlert(
      options.phoneNumber,
      message,
      'token_purchase',
      options.userId,
      { 
        ...options.metadata, 
        amount: options.amount, 
        units: options.units, 
        token: options.token,
        referenceNumber: options.referenceNumber
      }
    );
  }

  /**
   * Send system alert
   */
  static async sendSystemAlert(options: QuickAlertOptions & { message: string }) {
    const alertMessage = `🔔 AURORA SYSTEM: ${options.message}`;
    
    return this.sendAlert(
      options.phoneNumber,
      alertMessage,
      'system_alert',
      options.userId,
      { ...options.metadata, originalMessage: options.message }
    );
  }

  /**
   * Send maintenance alert
   */
  static async sendMaintenanceAlert(options: QuickAlertOptions & { 
    startTime: string; 
    duration: string;
    affectedServices?: string[];
  }) {
    const message = `🔧 AURORA MAINTENANCE: Scheduled maintenance from ${options.startTime} for ${options.duration}. Service may be temporarily unavailable.`;
    
    return this.sendAlert(
      options.phoneNumber,
      message,
      'maintenance',
      options.userId,
      { 
        ...options.metadata, 
        startTime: options.startTime, 
        duration: options.duration,
        affectedServices: options.affectedServices
      }
    );
  }

  /**
   * Send emergency alert
   */
  static async sendEmergencyAlert(options: QuickAlertOptions & { message: string; severity?: 'low' | 'medium' | 'high' | 'critical' }) {
    const alertMessage = `🚨 AURORA EMERGENCY: ${options.message} Please take immediate action.`;
    
    return this.sendAlert(
      options.phoneNumber,
      alertMessage,
      'emergency',
      options.userId,
      { 
        ...options.metadata, 
        originalMessage: options.message,
        severity: options.severity || 'medium'
      }
    );
  }

  /**
   * Send bulk alerts to multiple users
   */
  static async sendBulkAlert(
    recipients: Array<{ phoneNumber: string; userId?: string; customMessage?: string }>,
    defaultMessage: string,
    alertType: AlertType = 'general',
    metadata?: any
  ) {
    const formattedRecipients = recipients.map(recipient => ({
      phone_number: recipient.phoneNumber,
      message: recipient.customMessage || defaultMessage,
      user_id: recipient.userId
    }));

    const { data, error } = await supabase.functions.invoke('aurora_sms_alerts', {
      body: {
        action: 'send_bulk_alerts',
        recipients: formattedRecipients,
        alert_type: alertType,
        metadata: metadata || {}
      }
    });

    if (error) {
      throw new Error(error.message || 'Failed to send bulk SMS alerts');
    }

    if (!data.success) {
      throw new Error(data.data?.error || 'Failed to send bulk SMS alerts');
    }

    return data.data;
  }

  /**
   * Format phone number to Kenya format
   */
  static formatPhoneNumber(phoneNumber: string): string {
    // Remove any spaces, dashes, or other characters
    let cleaned = phoneNumber.replace(/[\s\-\(\)]/g, '');
    
    // Handle different formats
    if (cleaned.startsWith('0')) {
      // Convert 0712345678 to +254712345678
      cleaned = '+254' + cleaned.substring(1);
    } else if (cleaned.startsWith('254')) {
      // Convert 254712345678 to +254712345678
      cleaned = '+' + cleaned;
    } else if (!cleaned.startsWith('+254')) {
      // Assume it's a local number and add +254
      cleaned = '+254' + cleaned;
    }
    
    return cleaned;
  }

  /**
   * Validate phone number format
   */
  static isValidPhoneNumber(phoneNumber: string): boolean {
    const formatted = this.formatPhoneNumber(phoneNumber);
    // Kenya mobile numbers: +254 7XX XXX XXX or +254 1XX XXX XXX
    const kenyaPattern = /^\+254[71]\d{8}$/;
    return kenyaPattern.test(formatted);
  }

  /**
   * Get SMS cost estimate (approximate)
   */
  static estimateSMSCost(message: string): number {
    const messageLength = message.length;
    const smsCount = Math.ceil(messageLength / 160);
    const costPerSMS = 1.0; // Approximate cost in KES
    return smsCount * costPerSMS;
  }

  /**
   * Check if user has SMS alerts enabled
   */
  static async isUserSMSEnabled(userId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('profiles')
      .select('sms_alerts_enabled')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error checking SMS enabled status:', error);
      return false;
    }

    return data?.sms_alerts_enabled ?? true;
  }

  /**
   * Get user alert preferences
   */
  static async getUserAlertPreferences(userId: string): Promise<Record<AlertType, boolean> | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('alert_preferences')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error getting alert preferences:', error);
      return null;
    }

    return data?.alert_preferences || {
      general: true,
      energy_low: true,
      bill_due: true,
      token_purchase: true,
      system_alert: true,
      maintenance: false,
      emergency: true
    };
  }

  /**
   * Check if user wants to receive specific alert type
   */
  static async shouldSendAlert(userId: string, alertType: AlertType): Promise<boolean> {
    const [isEnabled, preferences] = await Promise.all([
      this.isUserSMSEnabled(userId),
      this.getUserAlertPreferences(userId)
    ]);

    if (!isEnabled) return false;
    if (!preferences) return true; // Default to true if preferences not found

    return preferences[alertType] ?? true;
  }
}

// Export individual functions for convenience
export const {
  sendEnergyLowAlert,
  sendBillDueAlert,
  sendTokenPurchaseAlert,
  sendSystemAlert,
  sendMaintenanceAlert,
  sendEmergencyAlert,
  sendBulkAlert,
  formatPhoneNumber,
  isValidPhoneNumber,
  estimateSMSCost,
  isUserSMSEnabled,
  getUserAlertPreferences,
  shouldSendAlert
} = AuroraSMSUtils;