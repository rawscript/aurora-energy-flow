import { useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export type AlertType = 'general' | 'energy_low' | 'bill_due' | 'token_purchase' | 'system_alert' | 'maintenance' | 'emergency';

export interface SMSAlert {
  id: string;
  phone_number: string;
  message: string;
  alert_type: AlertType;
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'expired';
  message_id?: string;
  cost?: number;
  sent_at?: string;
  delivered_at?: string;
  failed_at?: string;
  created_at: string;
  metadata?: any;
}

export interface SMSStats {
  total_sent: number;
  total_delivered: number;
  total_failed: number;
  total_cost: number;
  last_alert_sent?: string;
}

export interface BulkRecipient {
  phone_number: string;
  message: string;
  user_id?: string;
}

export interface SendSMSOptions {
  alert_type?: AlertType;
  metadata?: any;
}

export interface SendBulkSMSOptions extends SendSMSOptions {
  recipients: BulkRecipient[];
}

export const useAuroraSMS = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendSMSAlert = useCallback(async (
    phoneNumber: string,
    message: string,
    options: SendSMSOptions = {}
  ) => {
    if (!user) {
      throw new Error('User must be authenticated to send SMS alerts');
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: functionError } = await supabase.functions.invoke('aurora_sms_alerts', {
        body: {
          action: 'send_alert',
          user_id: user.id,
          phone_number: phoneNumber,
          message: message,
          alert_type: options.alert_type || 'general',
          metadata: options.metadata || {}
        }
      });

      if (functionError) {
        throw new Error(functionError.message || 'Failed to send SMS alert');
      }

      if (!data.success) {
        throw new Error(data.data?.error || 'Failed to send SMS alert');
      }

      return data.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const sendBulkSMSAlerts = useCallback(async (options: SendBulkSMSOptions) => {
    if (!user) {
      throw new Error('User must be authenticated to send bulk SMS alerts');
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: functionError } = await supabase.functions.invoke('aurora_sms_alerts', {
        body: {
          action: 'send_bulk_alerts',
          recipients: options.recipients,
          alert_type: options.alert_type || 'general',
          metadata: options.metadata || {}
        }
      });

      if (functionError) {
        throw new Error(functionError.message || 'Failed to send bulk SMS alerts');
      }

      if (!data.success) {
        throw new Error(data.data?.error || 'Failed to send bulk SMS alerts');
      }

      return data.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const getAlertStatus = useCallback(async (alertId: string) => {
    if (!user) {
      throw new Error('User must be authenticated to get alert status');
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: functionError } = await supabase.functions.invoke('aurora_sms_alerts', {
        body: {
          action: 'get_alert_status',
          alert_id: alertId
        }
      });

      if (functionError) {
        throw new Error(functionError.message || 'Failed to get alert status');
      }

      if (!data.success) {
        throw new Error(data.data?.error || 'Failed to get alert status');
      }

      return data.data.alert as SMSAlert;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const getUserSMSStats = useCallback(async (): Promise<SMSStats> => {
    if (!user) {
      throw new Error('User must be authenticated to get SMS stats');
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase.rpc('get_user_sms_stats', {
        p_user_id: user.id
      });

      if (rpcError) {
        throw new Error(rpcError.message || 'Failed to get SMS stats');
      }

      return data[0] || {
        total_sent: 0,
        total_delivered: 0,
        total_failed: 0,
        total_cost: 0
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const getUserAlerts = useCallback(async (limit = 50): Promise<SMSAlert[]> => {
    if (!user) {
      throw new Error('User must be authenticated to get alerts');
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: queryError } = await supabase
        .from('sms_alerts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (queryError) {
        throw new Error(queryError.message || 'Failed to get user alerts');
      }

      return data || [];
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const updateAlertPreferences = useCallback(async (preferences: Record<AlertType, boolean>) => {
    if (!user) {
      throw new Error('User must be authenticated to update alert preferences');
    }

    setLoading(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          alert_preferences: preferences
        })
        .eq('id', user.id);

      if (updateError) {
        throw new Error(updateError.message || 'Failed to update alert preferences');
      }

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const enableSMSAlerts = useCallback(async (enabled: boolean) => {
    if (!user) {
      throw new Error('User must be authenticated to enable/disable SMS alerts');
    }

    setLoading(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          sms_alerts_enabled: enabled
        })
        .eq('id', user.id);

      if (updateError) {
        throw new Error(updateError.message || 'Failed to update SMS alerts setting');
      }

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Predefined alert templates
  const alertTemplates = {
    energyLow: (units: number) => 
      `⚡ AURORA ALERT: Your energy balance is low (${units} units remaining). Consider purchasing more tokens to avoid disconnection.`,
    
    billDue: (amount: number, dueDate: string) => 
      `💡 AURORA ALERT: Your electricity bill of KSh ${amount} is due on ${dueDate}. Pay now to avoid late fees.`,
    
    tokenPurchase: (amount: number, units: number, token: string) => 
      `✅ AURORA ALERT: Token purchase successful! KSh ${amount} = ${units} units. Token: ${token}`,
    
    systemAlert: (message: string) => 
      `🔔 AURORA SYSTEM: ${message}`,
    
    maintenance: (startTime: string, duration: string) => 
      `🔧 AURORA MAINTENANCE: Scheduled maintenance from ${startTime} for ${duration}. Service may be temporarily unavailable.`,
    
    emergency: (message: string) => 
      `🚨 AURORA EMERGENCY: ${message} Please take immediate action.`
  };

  return {
    sendSMSAlert,
    sendBulkSMSAlerts,
    getAlertStatus,
    getUserSMSStats,
    getUserAlerts,
    updateAlertPreferences,
    enableSMSAlerts,
    alertTemplates,
    loading,
    error
  };
};