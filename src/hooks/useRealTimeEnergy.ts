import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuthenticatedApi } from './useAuthenticatedApi';
import { useToast } from './use-toast';
import { useMeter } from '../contexts/MeterContext';
import { KPLCSMSService } from '../utils/kplcSMSService';
import { supabase } from '@/integrations/supabase/client';

// SMS/USSD API Integration
interface SMSEnergyService {
  fetchEnergyData: (meterNumber: string, phoneNumber: string) => Promise<EnergyData>;
  fetchBalance: (meterNumber: string, phoneNumber: string) => Promise<number>;
  purchaseTokens: (meterNumber: string, amount: number, phoneNumber: string) => Promise<TokenPurchaseResult>;
}

interface EnergyData {
  current_usage: number;
  daily_total?: number;
  daily_cost: number;
  efficiency_score?: number;
  weekly_average?: number;
  weekly_cost: number;
  monthly_total?: number;
  monthly_cost: number;
  balance?: number;
  meter_reading?: number;
  units_remaining?: number;
  peak_usage_time: string;
  cost_trend: 'up' | 'down' | 'stable';
  battery_state?: number;
  power_generated?: number;
  load_consumption?: number;
  battery_count?: number;
  meter_category?: string;
  industry_type?: string;
  last_updated: string;
  source: 'sms' | 'ussd' | 'cache' | 'smart_meter';
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
  weekly_cost: 0,
  monthly_total: 0,
  monthly_cost: 0,
  peak_usage_time: '00:00',
  cost_trend: 'stable',
  battery_state: 0,
  power_generated: 0,
  load_consumption: 0,
  battery_count: 0,
  meter_category: 'household',
  industry_type: undefined,
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
      efficiency_score: billData.consumption > 0 ? Math.min(100, Math.max(0, 100 - (billData.consumption / 10))) : 0, // Calculate based on consumption
      weekly_average: (billData.consumption || 0) * 7,
      weekly_cost: (billData.billAmount || 0) * 7,
      monthly_total: (billData.consumption || 0) * 30,
      monthly_cost: (billData.billAmount || 0) * 30,
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

  // Determine which service to use based on energy provider
  const shouldUseSMSService = useCallback(() => {
    return energyProvider === 'KPLC';
  }, [energyProvider]);

  // Fetch energy data via SMS/USSD for KPLC or smart-meter-webhook for others
  const fetchEnergyData = useCallback(async (phoneNumber: string, forceRefresh = false) => {
    // Prevent concurrent fetches
    if (fetchInProgress.current) {
      console.log('Fetch already in progress, skipping');
      return;
    }

    // Debug logging
    console.log('Energy Data Fetch Debug:', {
      energyProvider,
      shouldUseSMS: shouldUseSMSService(),
      userId,
      hasUser: !!user,
      hasMeterConnected,
      meterNumber: meterNumber.current,
      phoneNumber,
      meterStatus
    });

    // More lenient authentication check - just need userId and user object
    if (!userId || !user) {
      const errorMsg = `Authentication required. UserId: ${!!userId}, User: ${!!user}`;
      console.error(errorMsg);
      setError(errorMsg);
      return;
    }

    // For KPLC, use SMS/USSD service
    if (shouldUseSMSService()) {
      await fetchEnergyDataViaSMS(phoneNumber, forceRefresh);
    } else {
      // For Solar/Other providers, use smart-meter-webhook
      await fetchEnergyDataViaWebhook(forceRefresh);
    }
  }, [energyProvider, shouldUseSMSService, userId, user, hasMeterConnected, meterStatus]);

  // Fetch energy data via SMS/USSD (KPLC only)
  const fetchEnergyDataViaSMS = useCallback(async (phoneNumber: string, forceRefresh = false) => {
    // For SMS testing, use a default meter number if none is set
    const testMeterNumber = meterNumber.current || '12345678901'; // Default test meter number

    if (!hasMeterConnected) {
      console.warn('No meter connected, using test meter number for SMS:', testMeterNumber);
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
      console.log(`Fetching energy data via USSD for meter: ${testMeterNumber}`);

      // Call USSD service directly via Supabase function
      const { data, error } = await supabase.functions.invoke('kplc_sms_service', {
        body: {
          action: 'fetch_bill_data',
          user_id: userId,
          meter_number: testMeterNumber,
          phone_number: phoneNumber
        }
      });

      if (error) {
        throw new Error(error.message || 'Failed to fetch USSD data');
      }

      if (!data.success) {
        throw new Error(data.error || 'USSD request failed');
      }

      // Transform USSD response to energy data format
      const billData = data.data;
      const freshData: EnergyData = {
        current_usage: billData.consumption || 0,
        daily_cost: billData.billAmount || 0,
        weekly_cost: (billData.billAmount || 0) * 7,
        monthly_cost: (billData.billAmount || 0) * 30,
        last_updated: new Date().toISOString(),
        source: 'ussd',
        peak_usage_time: new Date().toLocaleTimeString(),
        cost_trend: 'stable',
        battery_state: 0, // No battery data from USSD
        power_generated: 0,
        load_consumption: billData.consumption || 0,
        battery_count: 0,
        balance: billData.outstandingBalance || 0,
        meter_reading: billData.currentReading || 0,
        units_remaining: Math.max(0, (billData.outstandingBalance || 0) / 25) // Estimate units
      };

      setEnergyData(freshData);
      lastFetchTime.current = now;

      // Create a reading record
      const newReading: EnergyReading = {
        id: `reading-${now}`,
        user_id: userId,
        meter_number: testMeterNumber,
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
        title: 'Balance Updated via USSD',
        description: `Balance: KSh ${freshData.balance?.toFixed(2) || '0.00'} | Units: ${freshData.units_remaining?.toFixed(1) || '0.0'} kWh`,
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
  }, [userId, user, hasMeterConnected, toast]);

  // Fetch energy data via smart-meter-webhook (Solar/Other providers)
  const fetchEnergyDataViaWebhook = useCallback(async (forceRefresh = false) => {
    const testMeterNumber = meterNumber.current || 'SOLAR_001'; // Default test meter for non-KPLC

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
      console.log('Fetching energy data via smart-meter-webhook for meter:', testMeterNumber);

      // For non-KPLC providers, we simulate or fetch from smart meter webhook
      // In a real implementation, this would connect to the actual smart meter or solar inverter
      const simulatedData = {
        meter_number: testMeterNumber,
        kwh_consumed: Math.random() * 50 + 10, // Random consumption between 10-60 kWh
        user_id: userId,
        cost_per_kwh: energyProvider === 'Solar' ? 0 : 25 // Solar is free, others cost money
      };

      // Call smart-meter-webhook to store the reading
      const { data, error } = await supabase.functions.invoke('smart-meter-webhook', {
        body: simulatedData
      });

      if (error) {
        console.error('Smart meter webhook error:', error);
        throw new Error(error.message || 'Failed to fetch energy data via smart meter');
      }

      console.log('Smart meter webhook response:', data);

      // Create energy data for non-KPLC providers
      const freshData: EnergyData = {
        current_usage: simulatedData.kwh_consumed,
        daily_cost: simulatedData.kwh_consumed * simulatedData.cost_per_kwh,
        weekly_cost: simulatedData.kwh_consumed * simulatedData.cost_per_kwh * 7,
        monthly_cost: simulatedData.kwh_consumed * simulatedData.cost_per_kwh * 30,
        last_updated: new Date().toISOString(),
        source: 'smart_meter',
        peak_usage_time: energyProvider === 'Solar' ? '12:00' : '18:00',
        cost_trend: 'stable',
        battery_state: energyProvider === 'Solar' ? Math.random() * 100 : 0,
        power_generated: energyProvider === 'Solar' ? Math.random() * 30 + 20 : 0,
        load_consumption: simulatedData.kwh_consumed,
        battery_count: energyProvider === 'Solar' ? 4 : 0,
        balance: energyProvider === 'Solar' ? 0 : simulatedData.kwh_consumed * simulatedData.cost_per_kwh,
        meter_reading: Math.floor(Math.random() * 10000) + 5000,
        units_remaining: energyProvider === 'Solar' ? 999 : Math.random() * 100
      };

      setEnergyData(freshData);
      lastFetchTime.current = now;

      // Create a reading record
      const newReading: EnergyReading = {
        id: `reading-${now}`,
        user_id: userId,
        meter_number: testMeterNumber,
        kwh_consumed: freshData.current_usage,
        total_cost: freshData.daily_cost,
        reading_date: freshData.last_updated,
        cost_per_kwh: simulatedData.cost_per_kwh,
        peak_usage: freshData.current_usage,
        battery_state: freshData.battery_state,
        power_generated: freshData.power_generated,
        load_consumption: freshData.load_consumption,
        battery_count: freshData.battery_count
      };

      setRecentReadings(prev => [newReading, ...prev.slice(0, 9)]); // Keep last 10 readings

      toast({
        title: 'Energy Data Updated',
        description: energyProvider === 'Solar'
          ? `Generated: ${freshData.power_generated?.toFixed(1)} kWh, Battery: ${freshData.battery_state?.toFixed(0)}%`
          : `Usage: ${freshData.current_usage.toFixed(1)} kWh, Cost: KSh ${freshData.daily_cost.toFixed(2)}`,
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
  }, [userId, energyProvider, toast]);

  // Purchase tokens via SMS
  const purchaseTokens = useCallback(async (amount: number, phoneNumber: string) => {
    if (!userId || !user || !hasMeterConnected || !meterNumber.current) {
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
  }, [userId, user, hasMeterConnected, toast]);

  // Get current balance via SMS
  const getCurrentBalance = useCallback(async (phoneNumber: string) => {
    if (!userId || !user || !hasMeterConnected || !meterNumber.current) {
      throw new Error('Authentication or meter connection required');
    }

    try {
      const balance = await smsService.current.fetchBalance(meterNumber.current, phoneNumber);
      return balance;
    } catch (error) {
      console.error('Balance fetch failed:', error);
      return 0;
    }
  }, [userId, user, hasMeterConnected]);

  // Initialize with empty state (no automatic fetching)
  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;

    // Always set empty state, never make automatic API calls
    setEnergyData(EMPTY_ENERGY_DATA);
    setRecentReadings([]);
  }, []);

  // Clear error when meter status changes
  useEffect(() => {
    if (hasMeterConnected && error) {
      setError(null);
    }
  }, [hasMeterConnected, error]);

  // Refresh data function (alias for fetchEnergyData with user's phone)
  const refreshData = useCallback(async () => {
    // Get user's phone number from user profile or context, with fallback
    const userPhone = user?.phone || user?.user_metadata?.phone_number || '';
    // Use your phone number as fallback for Africa's Talking API
    const phoneNumber = userPhone || '+254114841437'; // Your phone number for Africa's Talking API requests

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
      peak_usage_time: energyData.peak_usage_time,
      weeklyTrend: recentReadings.slice(0, 7).map((reading, index) => ({
        day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][index] || `Day ${index + 1}`,
        usage: reading.kwh_consumed || 0,
        efficiency: Math.min(100, Math.max(0, (reading.kwh_consumed || 0) > 0 ? Math.max(0, 100 - (reading.kwh_consumed || 0) / 5) : 0))
      })),
      peakHours: recentReadings.length > 0 ? [
        { hour: 18, usage: Math.max(...recentReadings.map(r => r.kwh_consumed || 0)) },
        { hour: 19, usage: Math.max(...recentReadings.map(r => r.kwh_consumed || 0)) * 0.9 },
        { hour: 20, usage: Math.max(...recentReadings.map(r => r.kwh_consumed || 0)) * 0.8 }
      ] : []
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