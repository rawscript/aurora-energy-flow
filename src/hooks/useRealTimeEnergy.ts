import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuthenticatedApi } from './useAuthenticatedApi';
import { useToast } from './use-toast';
import { useMeter } from '../contexts/MeterContext';
import { KPLCSMSService } from '../utils/kplcSMSService';

// SMS/USSD API Integration
interface SMSEnergyService {
  fetchEnergyData: (meterNumber: string, phoneNumber: string) => Promise<EnergyData>;
  fetchBalance: (meterNumber: string, phoneNumber: string) => Promise<number>;
  purchaseTokens: (meterNumber: string, amount: number, phoneNumber: string) => Promise<TokenPurchaseResult>;
}

interface EnergyData {
  current_usage: number;
  daily_total: number;
  daily_cost: number;
  efficiency_score: number;
  weekly_average: number;
  monthly_total: number;
  peak_usage_time: string;
  cost_trend: 'up' | 'down' | 'stable';
  battery_state?: number;
  power_generated?: number;
  load_consumption?: number;
  battery_count?: number;
  last_updated: string;
  source: 'sms' | 'ussd' | 'cache';
}

interface EnergyReading {
  id: string;
  user_id: string;
  meter_number: string;
  kwh_consumed: number;
  total_cost: number;
  reading_date: string;
  cost_per_kwh: number;
  peak_usage?: number;
  off_peak_usage?: number;
  battery_state?: number;
  power_generated?: number;
  load_consumption?: number;
  battery_count?: number;
}

interface TokenPurchaseResult {
  success: boolean;
  token_code?: string;
  amount: number;
  units: number;
  error?: string;
}

// Empty state for when no meter is connected
const EMPTY_ENERGY_DATA: EnergyData = {
  current_usage: 0,
  daily_total: 0,
  daily_cost: 0,
  efficiency_score: 0,
  weekly_average: 0,
  monthly_total: 0,
  peak_usage_time: '00:00',
  cost_trend: 'stable',
  battery_state: 0,
  power_generated: 0,
  load_consumption: 0,
  battery_count: 0,
  last_updated: new Date().toISOString(),
  source: 'cache'
};

// SMS/USSD Service Implementation using existing KPLC service
class KPLCEnergyService implements SMSEnergyService {
  private kplcService: KPLCSMSService;

  constructor() {
    this.kplcService = KPLCSMSService.getInstance();
  }

  async fetchEnergyData(meterNumber: string, phoneNumber: string): Promise<EnergyData> {
    try {
      // Use existing KPLC SMS service to fetch bill data
      const billData = await this.kplcService.fetchBillData(meterNumber, phoneNumber, 'user-id');

      // Convert KPLC bill data to energy data format
      return this.convertBillToEnergyData(billData);

    } catch (error) {
      console.error('KPLC SMS fetch failed:', error);
      // Return fallback data with current timestamp
      return {
        ...EMPTY_ENERGY_DATA,
        last_updated: new Date().toISOString(),
        source: 'cache'
      };
    }
  }

  async fetchBalance(meterNumber: string, phoneNumber: string): Promise<number> {
    try {
      const energyData = await this.fetchEnergyData(meterNumber, phoneNumber);
      return energyData.daily_total;
    } catch (error) {
      console.error('Balance fetch failed:', error);
      return 0;
    }
  }

  async purchaseTokens(meterNumber: string, amount: number, phoneNumber: string): Promise<TokenPurchaseResult> {
    try {
      // Use existing KPLC SMS service for token purchase
      const tokenData = await this.kplcService.purchaseTokens(meterNumber, amount, phoneNumber, 'user-id');

      return {
        success: tokenData.status === 'success',
        token_code: tokenData.tokenCode,
        amount: amount,
        units: tokenData.units,
        error: tokenData.status === 'failed' ? 'Purchase failed' : undefined
      };

    } catch (error) {
      console.error('Token purchase failed:', error);
      return {
        success: false,
        amount: amount,
        units: 0,
        error: error instanceof Error ? error.message : 'Purchase failed'
      };
    }
  }

  private convertBillToEnergyData(billData: any): EnergyData {
    const now = new Date();

    return {
      current_usage: billData.consumption || 0,
      daily_total: billData.consumption || 0,
      daily_cost: billData.billAmount || 0,
      efficiency_score: Math.floor(Math.random() * 40) + 60, // 60-100%
      weekly_average: (billData.consumption || 0) * 7,
      monthly_total: (billData.consumption || 0) * 30,
      peak_usage_time: '18:00',
      cost_trend: billData.billAmount > 1000 ? 'up' : billData.billAmount < 500 ? 'down' : 'stable',
      battery_state: undefined, // KPLC doesn't have battery data
      power_generated: undefined,
      load_consumption: undefined,
      battery_count: undefined,
      last_updated: now.toISOString(),
      source: 'sms'
    };
  }
}

export const useRealTimeEnergy = (energyProvider: string = 'KPLC') => {
  const [energyData, setEnergyData] = useState<EnergyData>(EMPTY_ENERGY_DATA);
  const [recentReadings, setRecentReadings] = useState<EnergyReading[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { user, userId, hasValidSession } = useAuthenticatedApi();
  const { toast } = useToast();
  const { status: meterStatus, meterNumber: contextMeterNumber } = useMeter();

  // Refs to prevent loops and manage state
  const meterNumber = useRef<string | null>(null);
  const lastFetchTime = useRef<number>(0);
  const isInitialized = useRef(false);
  const smsService = useRef<KPLCEnergyService>(new KPLCEnergyService());
  const fetchInProgress = useRef(false);

  // Rate limiting constants
  const MIN_FETCH_INTERVAL = 5 * 60 * 1000; // 5 minutes between fetches
  const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes cache

  // Update meter number from context (only when it actually changes)
  useEffect(() => {
    if (contextMeterNumber !== meterNumber.current) {
      meterNumber.current = contextMeterNumber;
      // Clear cache when meter changes
      setEnergyData(EMPTY_ENERGY_DATA);
      setRecentReadings([]);
      setError(null);
    }
  }, [contextMeterNumber]);

  // Check if meter is connected
  const hasMeterConnected = meterStatus === 'connected' && meterNumber.current;

  // Fetch energy data via SMS/USSD (demand-driven only)
  const fetchEnergyData = useCallback(async (phoneNumber: string, forceRefresh = false) => {
    // Prevent concurrent fetches
    if (fetchInProgress.current) {
      console.log('Fetch already in progress, skipping');
      return;
    }

    if (!hasValidSession() || !userId || !hasMeterConnected || !meterNumber.current) {
      setError('Authentication or meter connection required');
      return;
    }

    if (!phoneNumber) {
      setError('Phone number required for SMS/USSD requests');
      return;
    }

    // Rate limiting
    const now = Date.now();
    if (!forceRefresh && (now - lastFetchTime.current) < MIN_FETCH_INTERVAL) {
      const waitTime = Math.ceil((MIN_FETCH_INTERVAL - (now - lastFetchTime.current)) / 1000 / 60);
      setError(`Please wait ${waitTime} minutes before next request`);
      return;
    }

    fetchInProgress.current = true;
    setLoading(true);
    setError(null);

    try {
      console.log(`Fetching energy data via SMS/USSD for meter: ${meterNumber.current}`);

      const freshData = await smsService.current.fetchEnergyData(
        meterNumber.current,
        phoneNumber
      );

      setEnergyData(freshData);
      lastFetchTime.current = now;

      // Create a reading record
      const newReading: EnergyReading = {
        id: `reading-${now}`,
        user_id: userId,
        meter_number: meterNumber.current,
        kwh_consumed: freshData.current_usage,
        total_cost: freshData.daily_cost,
        reading_date: freshData.last_updated,
        cost_per_kwh: 25, // Standard KPLC rate
        peak_usage: freshData.current_usage,
        battery_state: freshData.battery_state,
        power_generated: freshData.power_generated,
        load_consumption: freshData.load_consumption,
        battery_count: freshData.battery_count
      };

      setRecentReadings(prev => [newReading, ...prev.slice(0, 9)]); // Keep last 10 readings

      toast({
        title: 'Energy Data Updated',
        description: `Fresh data received via ${freshData.source.toUpperCase()}`,
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch energy data';
      setError(errorMessage);

      toast({
        title: 'Fetch Failed',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
      fetchInProgress.current = false;
    }
  }, [hasValidSession, userId, hasMeterConnected, toast]);

  // Purchase tokens via SMS
  const purchaseTokens = useCallback(async (amount: number, phoneNumber: string) => {
    if (!hasValidSession() || !userId || !hasMeterConnected || !meterNumber.current) {
      throw new Error('Authentication or meter connection required');
    }

    if (!phoneNumber) {
      throw new Error('Phone number required for SMS purchase');
    }

    setLoading(true);
    try {
      const result = await smsService.current.purchaseTokens(
        meterNumber.current,
        amount,
        phoneNumber
      );

      if (result.success) {
        toast({
          title: 'Tokens Purchased',
          description: `${result.units} units purchased. Token: ${result.token_code}`,
        });
      } else {
        throw new Error(result.error || 'Purchase failed');
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Purchase failed';
      toast({
        title: 'Purchase Failed',
        description: errorMessage,
        variant: 'destructive'
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [hasValidSession, userId, hasMeterConnected, toast]);

  // Get current balance via SMS
  const getCurrentBalance = useCallback(async (phoneNumber: string) => {
    if (!hasValidSession() || !userId || !hasMeterConnected || !meterNumber.current) {
      throw new Error('Authentication or meter connection required');
    }

    try {
      const balance = await smsService.current.fetchBalance(meterNumber.current, phoneNumber);
      return balance;
    } catch (error) {
      console.error('Balance fetch failed:', error);
      return 0;
    }
  }, [hasValidSession, userId, hasMeterConnected]);

  // Initialize with empty state (no automatic fetching)
  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;

    // Only set empty state, no automatic API calls
    if (!hasMeterConnected) {
      setEnergyData(EMPTY_ENERGY_DATA);
      setRecentReadings([]);
    }
  }, [hasMeterConnected]);

  // Clear error when meter status changes
  useEffect(() => {
    if (hasMeterConnected && error) {
      setError(null);
    }
  }, [hasMeterConnected, error]);

  // Refresh data function (alias for fetchEnergyData with user's phone)
  const refreshData = useCallback(async () => {
    // Get user's phone number from user profile or context
    const phoneNumber = user?.phone || user?.user_metadata?.phone_number || '';
    
    if (!phoneNumber) {
      setError('Phone number required for data refresh');
      return;
    }
    
    await fetchEnergyData(phoneNumber, false);
  }, [fetchEnergyData, user]);

  // Get new reading function (alias for refreshData)
  const getNewReading = useCallback(async () => {
    await refreshData();
  }, [refreshData]);

  return {
    // State
    energyData,
    recentReadings,
    loading,
    error,
    hasMeterConnected,
    meterConnectionChecked: true, // Always true since we check meter status

    // Actions (all demand-driven)
    fetchEnergyData,
    refreshData,
    getNewReading,
    purchaseTokens,
    getCurrentBalance,

    // Analytics (computed from current data)
    analytics: {
      daily_usage: energyData.daily_total,
      weekly_usage: energyData.weekly_average,
      monthly_usage: energyData.monthly_total,
      efficiency_score: energyData.efficiency_score,
      cost_trend: energyData.cost_trend,
      peak_usage_time: energyData.peak_usage_time
    },

    // Utilities
    clearError: () => setError(null),
    canFetch: () => {
      const now = Date.now();
      return (now - lastFetchTime.current) >= MIN_FETCH_INTERVAL;
    },
    timeUntilNextFetch: () => {
      const now = Date.now();
      const timeSinceLastFetch = now - lastFetchTime.current;
      return Math.max(0, MIN_FETCH_INTERVAL - timeSinceLastFetch);
    }
  };
};