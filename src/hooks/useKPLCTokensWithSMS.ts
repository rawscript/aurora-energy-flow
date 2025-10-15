import { useState, useCallback } from 'react';
import { supabase } from '../integrations/supabase/client';
import { useAuthenticatedApi } from './useAuthenticatedApi';
import { useToast } from '../hooks/use-toast';
import { shouldUseSMSFallback } from '../utils/africasTalkingSMS';

export interface TokenPurchaseData {
  tokenCode: string;
  referenceNumber: string;
  amount: number;
  units: number;
  timestamp: string;
  source: 'puppeteer' | 'sms';
}

export const useKPLCTokensWithSMS = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { hasValidSession, user } = useAuthenticatedApi();
  const { toast } = useToast();

  // Purchase tokens with SMS fallback
  const purchaseTokens = useCallback(async (
    amount: number,
    meterNumber: string,
    phoneNumber: string,
    energyProvider: string = 'KPLC'
  ): Promise<TokenPurchaseData | null> => {
    if (!hasValidSession() || !user) {
      setError('Please sign in to purchase tokens');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      // Get user profile for ID number
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id_number, phone_number')
        .eq('id', user.id)
        .single();

      if (profileError) {
        throw new Error('Failed to fetch user profile');
      }

      const idNumber = profileData.id_number || profileData.phone_number;
      let result;

      // For KPLC, ALWAYS try SMS first if configured
      if (shouldUseSMSFallback(energyProvider)) {
        console.log('🚀 Using SMS-first approach for token purchase...');
        result = await purchaseTokensViaSMS(meterNumber, amount, phoneNumber, user.id);

        // If SMS fails, try Puppeteer as backup
        if (!result) {
          console.log('⚠️ SMS token purchase failed, trying Puppeteer backup...');
          result = await purchaseTokensViaPuppeteer(meterNumber, idNumber, amount, phoneNumber, user.id);
        }
      } else {
        // For non-KPLC providers, use Puppeteer only
        console.log('🔧 Using Puppeteer for non-KPLC provider...');
        result = await purchaseTokensViaPuppeteer(meterNumber, idNumber, amount, phoneNumber, user.id);
      }

      if (result) {
        toast({
          title: 'Purchase Successful!',
          description: `Successfully purchased KSh ${amount} worth of tokens via ${result.source.toUpperCase()}.`,
        });

        // Show token notification
        setTimeout(() => {
          toast({
            title: 'Token Code Ready',
            description: `Your token: ${result.tokenCode}`,
            duration: 10000,
          });
        }, 1000);

        return result;
      } else {
        throw new Error('Failed to purchase tokens through all available methods');
      }
    } catch (error: any) {
      console.error('Token purchase error:', error);
      const errorMessage = error.message || 'Failed to purchase tokens. Please try again.';

      toast({
        title: 'Purchase Failed',
        description: errorMessage,
        variant: 'destructive'
      });

      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [hasValidSession, user, toast]);

  // Purchase tokens via Puppeteer
  const purchaseTokensViaPuppeteer = async (
    meterNumber: string,
    idNumber: string,
    amount: number,
    phoneNumber: string,
    userId: string
  ): Promise<TokenPurchaseData | null> => {
    try {
      const { data, error: rpcError } = await supabase.functions.invoke('puppeteer_kplc_service', {
        body: {
          action: 'purchase_tokens',
          meter_number: meterNumber,
          id_number: idNumber,
          amount: amount,
          phone_number: phoneNumber,
          user_id: userId
        }
      });

      if (rpcError) {
        console.error('Error purchasing tokens via Puppeteer:', rpcError);
        throw new Error(rpcError.message || 'Puppeteer service failed');
      }

      if (data && data.success) {
        return {
          ...data.data,
          source: 'puppeteer' as const
        };
      }

      return null;
    } catch (error) {
      console.error('Puppeteer token purchase error:', error);
      throw error;
    }
  };

  // Purchase tokens via SMS
  const purchaseTokensViaSMS = async (
    meterNumber: string,
    amount: number,
    phoneNumber: string,
    userId: string
  ): Promise<TokenPurchaseData | null> => {
    try {
      const { data, error: rpcError } = await supabase.functions.invoke('kplc_sms_service', {
        body: {
          action: 'purchase_tokens',
          meter_number: meterNumber,
          amount: amount,
          phone_number: phoneNumber,
          user_id: userId
        }
      });

      if (rpcError) {
        console.error('Error purchasing tokens via SMS:', rpcError);
        throw new Error(rpcError.message || 'SMS service failed');
      }

      if (data && data.success) {
        return {
          ...data.data,
          source: 'sms' as const
        };
      }

      // Handle specific SMS service errors
      if (data && data.code === 'NO_SMS_RESPONSE') {
        throw new Error(data.error || 'No token response received from KPLC via SMS');
      }

      return null;
    } catch (error) {
      console.error('SMS token purchase error:', error);
      throw error;
    }
  };

  // Check balance with SMS fallback
  const checkBalance = useCallback(async (
    meterNumber: string,
    energyProvider: string = 'KPLC'
  ) => {
    if (!hasValidSession() || !user) {
      setError('Please sign in to check balance');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      let result;

      // For KPLC, ALWAYS try SMS first if configured
      if (shouldUseSMSFallback(energyProvider)) {
        console.log('🚀 Using SMS-first approach for balance check...');
        result = await checkBalanceViaSMS(meterNumber, user.id);

        // If SMS fails, try Puppeteer as backup
        if (!result) {
          console.log('⚠️ SMS balance check failed, trying Puppeteer backup...');
          result = await checkBalanceViaPuppeteer(meterNumber, user.id);
        }
      } else {
        // For non-KPLC providers, use Puppeteer only
        console.log('🔧 Using Puppeteer for non-KPLC provider...');
        result = await checkBalanceViaPuppeteer(meterNumber, user.id);
      }

      if (result) {
        toast({
          title: 'Balance Retrieved',
          description: `Balance fetched successfully via ${result.source?.toUpperCase() || 'API'}.`,
        });
      }

      return result;
    } catch (error: any) {
      console.error('Balance check error:', error);
      const errorMessage = error.message || 'Failed to check balance. Please try again.';

      toast({
        title: 'Balance Check Failed',
        description: errorMessage,
        variant: 'destructive'
      });

      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [hasValidSession, user, toast]);

  // Check balance via Puppeteer
  const checkBalanceViaPuppeteer = async (meterNumber: string, userId: string) => {
    try {
      const { data, error: rpcError } = await supabase.functions.invoke('puppeteer_kplc_service', {
        body: {
          action: 'fetch_bill_data',
          meter_number: meterNumber,
          user_id: userId
        }
      });

      if (rpcError) {
        console.error('Error checking balance via Puppeteer:', rpcError);
        throw new Error(rpcError.message || 'Puppeteer service failed');
      }

      if (data && data.success) {
        return {
          ...data.data,
          source: 'puppeteer' as const
        };
      }

      return null;
    } catch (error) {
      console.error('Puppeteer balance check error:', error);
      throw error;
    }
  };

  // Check balance via SMS
  const checkBalanceViaSMS = async (meterNumber: string, userId: string) => {
    try {
      // Get user's phone number
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('phone_number')
        .eq('id', userId)
        .single();

      if (profileError || !profileData.phone_number) {
        throw new Error('Phone number required for SMS service');
      }

      const { data, error: rpcError } = await supabase.functions.invoke('kplc_sms_service', {
        body: {
          action: 'fetch_bill_data',
          meter_number: meterNumber,
          phone_number: profileData.phone_number,
          user_id: userId
        }
      });

      if (rpcError) {
        console.error('Error checking balance via SMS:', rpcError);
        throw new Error(rpcError.message || 'SMS service failed');
      }

      if (data && data.success) {
        return {
          ...data.data,
          source: 'sms' as const
        };
      }

      // Handle specific SMS service errors
      if (data && data.code === 'NO_SMS_RESPONSE') {
        throw new Error(data.error || 'No balance response received from KPLC via SMS');
      }

      return null;
    } catch (error) {
      console.error('SMS balance check error:', error);
      throw error;
    }
  };

  return {
    purchaseTokens,
    checkBalance,
    loading,
    error
  };
};