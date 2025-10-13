import { useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { kplcSMSService, KPLCBillData, KPLCTokenData, KPLCUnitsData } from '../utils/kplcSMSService';
import { toast } from 'react-hot-toast';

export interface KPLCSMSHookReturn {
  // State
  loading: boolean;
  error: string | null;
  billData: KPLCBillData | null;
  tokenData: KPLCTokenData | null;
  unitsData: KPLCUnitsData | null;
  
  // Actions
  fetchBillData: (meterNumber: string, phoneNumber: string) => Promise<KPLCBillData | null>;
  purchaseTokens: (meterNumber: string, amount: number, phoneNumber: string) => Promise<KPLCTokenData | null>;
  checkUnits: (meterNumber: string, phoneNumber: string) => Promise<KPLCUnitsData | null>;
  clearError: () => void;
  clearData: () => void;
}

export const useKPLCSMS = (): KPLCSMSHookReturn => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [billData, setBillData] = useState<KPLCBillData | null>(null);
  const [tokenData, setTokenData] = useState<KPLCTokenData | null>(null);
  const [unitsData, setUnitsData] = useState<KPLCUnitsData | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const clearData = useCallback(() => {
    setBillData(null);
    setTokenData(null);
    setUnitsData(null);
    setError(null);
  }, []);

  const fetchBillData = useCallback(async (meterNumber: string, phoneNumber: string): Promise<KPLCBillData | null> => {
    if (!user) {
      const errorMsg = 'User must be authenticated to fetch bill data';
      setError(errorMsg);
      toast.error(errorMsg);
      return null;
    }

    if (!meterNumber || !phoneNumber) {
      const errorMsg = 'Meter number and phone number are required';
      setError(errorMsg);
      toast.error(errorMsg);
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      toast.loading('Sending SMS to KPLC...', { id: 'kplc-sms' });
      
      const data = await kplcSMSService.fetchBillData(meterNumber, phoneNumber, user.id);
      
      setBillData(data);
      toast.success('Bill data retrieved successfully!', { id: 'kplc-sms' });
      
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch bill data';
      setError(errorMessage);
      toast.error(errorMessage, { id: 'kplc-sms' });
      return null;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const purchaseTokens = useCallback(async (meterNumber: string, amount: number, phoneNumber: string): Promise<KPLCTokenData | null> => {
    if (!user) {
      const errorMsg = 'User must be authenticated to purchase tokens';
      setError(errorMsg);
      toast.error(errorMsg);
      return null;
    }

    if (!meterNumber || !amount || !phoneNumber) {
      const errorMsg = 'Meter number, amount, and phone number are required';
      setError(errorMsg);
      toast.error(errorMsg);
      return null;
    }

    if (amount < 10) {
      const errorMsg = 'Minimum token purchase amount is KSh 10';
      setError(errorMsg);
      toast.error(errorMsg);
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      toast.loading(`Purchasing KSh ${amount} tokens via SMS...`, { id: 'kplc-token' });
      
      const data = await kplcSMSService.purchaseTokens(meterNumber, amount, phoneNumber, user.id);
      
      setTokenData(data);
      
      if (data.status === 'success') {
        toast.success(`Token purchased successfully! Code: ${data.tokenCode}`, { 
          id: 'kplc-token',
          duration: 10000 // Show for 10 seconds
        });
      } else {
        toast.loading('Token purchase in progress. You will receive SMS confirmation shortly.', { 
          id: 'kplc-token',
          duration: 5000
        });
      }
      
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to purchase tokens';
      setError(errorMessage);
      toast.error(errorMessage, { id: 'kplc-token' });
      return null;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const checkUnits = useCallback(async (meterNumber: string, phoneNumber: string): Promise<KPLCUnitsData | null> => {
    if (!user) {
      const errorMsg = 'User must be authenticated to check units';
      setError(errorMsg);
      toast.error(errorMsg);
      return null;
    }

    if (!meterNumber || !phoneNumber) {
      const errorMsg = 'Meter number and phone number are required';
      setError(errorMsg);
      toast.error(errorMsg);
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      toast.loading('Checking current units via SMS...', { id: 'kplc-units' });
      
      const data = await kplcSMSService.checkUnits(meterNumber, phoneNumber, user.id);
      
      setUnitsData(data);
      toast.success(`Current units: ${data.currentUnits} kWh`, { id: 'kplc-units' });
      
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to check units';
      setError(errorMessage);
      toast.error(errorMessage, { id: 'kplc-units' });
      return null;
    } finally {
      setLoading(false);
    }
  }, [user]);

  return {
    // State
    loading,
    error,
    billData,
    tokenData,
    unitsData,
    
    // Actions
    fetchBillData,
    purchaseTokens,
    checkUnits,
    clearError,
    clearData
  };
};