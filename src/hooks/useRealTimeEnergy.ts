import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../integrations/supabase/client';
import { useAuthenticatedApi } from './useAuthenticatedApi';
import { useToast } from './use-toast';
import { useMeter } from '../contexts/MeterContext'; // Import meter context

// Get the Supabase anon key from environment or use a fallback
const SUPABASE_ANON_KEY = (typeof process !== 'undefined' && process.env.VITE_SUPABASE_ANON_KEY) || 'fallback-key';

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

interface EnergyAnalytics {
  hourlyPattern: Array<{ hour: number; usage: number; cost: number }>;
  weeklyTrend: Array<{ day: string; usage: number; cost: number; efficiency: number }>;
  monthlyComparison: Array<{ month: string; usage: number; cost: number }>;
  deviceBreakdown: Array<{ device: string; percentage: number; cost: number }>;
  peakHours: Array<{ hour: number; usage: number }>;
}

interface ProfileData {
  meter_number: string;
  meter_category?: string;
  industry_type?: string;
}

// No need for hardcoded values - we use the supabase client from integrations

// Empty/zero state for when no meter is connected
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
  battery_count: 0
};

const EMPTY_ANALYTICS: EnergyAnalytics = {
  hourlyPattern: [],
  weeklyTrend: [],
  monthlyComparison: [],
  deviceBreakdown: [],
  peakHours: []
};

export const useRealTimeEnergy = (energyProvider: string = 'KPLC') => {
  const [energyData, setEnergyData] = useState<EnergyData>(EMPTY_ENERGY_DATA);
  const [recentReadings, setRecentReadings] = useState<EnergyReading[]>([]);
  const [analytics, setAnalytics] = useState<EnergyAnalytics>(EMPTY_ANALYTICS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  
  const { user, userId, hasValidSession, query } = useAuthenticatedApi();
  const { toast } = useToast();
  const { status: meterStatus, meterNumber: contextMeterNumber } = useMeter(); // Get meter status from context
  
  const meterNumber = useRef<string | null>(null);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialized = useRef(false);
  const lastFetchTime = useRef<number>(0);
  const dataCache = useRef<{ data: EnergyData; readings: EnergyReading[]; timestamp: number; userId?: string } | null>(null);
  const CACHE_DURATION = 10 * 60 * 1000; // Increased cache duration to 10 minutes

  // Update the meterNumber ref when context meter number changes
  useEffect(() => {
    meterNumber.current = contextMeterNumber;
  }, [contextMeterNumber]);
  
  // Determine if meter is connected based on context
  const hasMeterConnected = meterStatus === 'connected';
  const meterConnectionChecked = meterStatus !== 'checking';
  
  // Calculate analytics based on readings
  const calculateAnalytics = useCallback((readings: EnergyReading[]) => {
    if (readings.length === 0) {
      setAnalytics(EMPTY_ANALYTICS);
      return;
    }

    // Calculate real analytics from readings
    const hourlyData = new Map<number, { usage: number; cost: number; count: number }>();
    const weeklyData = new Map<string, { usage: number; cost: number; count: number }>();
    
    readings.forEach(reading => {
      const date = new Date(reading.reading_date);
      const hour = date.getHours();
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
      
      // Hourly pattern
      const hourData = hourlyData.get(hour) || { usage: 0, cost: 0, count: 0 };
      hourData.usage += reading.kwh_consumed;
      hourData.cost += reading.total_cost;
      hourData.count += 1;
      hourlyData.set(hour, hourData);
      
      // Weekly trend
      const weekData = weeklyData.get(dayName) || { usage: 0, cost: 0, count: 0 };
      weekData.usage += reading.kwh_consumed;
      weekData.cost += reading.total_cost;
      weekData.count += 1;
      weeklyData.set(dayName, weekData);
    });

    // Convert to arrays and calculate averages
    const hourlyPattern = Array.from(hourlyData.entries()).map(([hour, data]) => ({
      hour,
      usage: data.usage / data.count,
      cost: data.cost / data.count
    })).sort((a, b) => a.hour - b.hour);

    const weeklyTrend = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => {
      const data = weeklyData.get(day) || { usage: 0, cost: 0, count: 1 };
      return {
        day,
        usage: data.usage / data.count,
        cost: data.cost / data.count,
        efficiency: Math.max(60, Math.min(100, 100 - (data.usage / data.count) * 2))
      };
    });

    // Find peak hours
    const peakHours = hourlyPattern
      .sort((a, b) => b.usage - a.usage)
      .slice(0, 3)
      .map(({ hour, usage }) => ({ hour, usage }));

    // Calculate device breakdown based on usage patterns and meter category
    const totalDailyCost = energyData.daily_cost;
    
    let hvacPercentage = 0;
    let lightingPercentage = 0;
    let appliancesPercentage = 0;
    let electronicsPercentage = 0;
    
    // Adjust device breakdown based on meter category
    const meterCategory = profileData?.meter_category || 'household';
    
    if (meterCategory === 'industry') {
      hvacPercentage = 45;
      lightingPercentage = 15;
      appliancesPercentage = 30;
      electronicsPercentage = 10;
    } else if (meterCategory === 'SME') {
      hvacPercentage = 35;
      lightingPercentage = 25;
      appliancesPercentage = 25;
      electronicsPercentage = 15;
    } else {
      hvacPercentage = 30;
      lightingPercentage = 25;
      appliancesPercentage = 25;
      electronicsPercentage = 20;
    }
    
    const deviceBreakdown = [
      { device: 'HVAC', percentage: hvacPercentage, cost: totalDailyCost * (hvacPercentage / 100) },
      { device: 'Lighting', percentage: lightingPercentage, cost: totalDailyCost * (lightingPercentage / 100) },
      { device: 'Appliances', percentage: appliancesPercentage, cost: totalDailyCost * (appliancesPercentage / 100) },
      { device: 'Electronics', percentage: electronicsPercentage, cost: totalDailyCost * (electronicsPercentage / 100) }
    ];

    setAnalytics({
      hourlyPattern,
      weeklyTrend,
      monthlyComparison: [],
      deviceBreakdown,
      peakHours
    });
  }, [energyData.daily_cost, profileData?.meter_category]);

  // Process a new reading from the meter or inverter
  const processNewReading = useCallback((reading: EnergyReading) => {
    // Enhanced type guard function to validate EnergyReading with additional checks
    const isValidEnergyReading = (obj: unknown): obj is EnergyReading => {
      if (!obj || typeof obj !== 'object' || obj === null) {
        return false;
      }

      const reading = obj as any;

      // Check required fields
      const requiredFields = [
        'id', 'user_id', 'meter_number', 'kwh_consumed',
        'total_cost', 'reading_date', 'cost_per_kwh'
      ];

      for (const field of requiredFields) {
        if (!(field in reading)) {
          console.warn(`Missing required field: ${field}`);
          return false;
        }
      }

      // Check field types
      if (
        typeof reading.id !== 'string' ||
        typeof reading.user_id !== 'string' ||
        typeof reading.meter_number !== 'string' ||
        typeof reading.kwh_consumed !== 'number' ||
        typeof reading.total_cost !== 'number' ||
        typeof reading.reading_date !== 'string' ||
        typeof reading.cost_per_kwh !== 'number'
      ) {
        console.warn('Invalid field types in energy reading');
        return false;
      }

      // Check for valid values
      if (
        reading.kwh_consumed < 0 ||
        reading.total_cost < 0 ||
        reading.cost_per_kwh <= 0
      ) {
        console.warn('Invalid values in energy reading (negative or zero values)');
        return false;
      }

      // Check if reading_date is a valid ISO date string
      try {
        new Date(reading.reading_date);
      } catch (e) {
        console.warn('Invalid reading_date format');
        return false;
      }

      // Optional fields validation
      if (reading.peak_usage !== undefined && typeof reading.peak_usage !== 'number') {
        console.warn('Invalid peak_usage type');
        return false;
      }

      if (reading.off_peak_usage !== undefined && typeof reading.off_peak_usage !== 'number') {
        console.warn('Invalid off_peak_usage type');
        return false;
      }

      return true;
    };

    if (!isValidEnergyReading(reading)) {
      console.error('Invalid reading received:', reading);
      return;
    }

    console.log('Processing new reading:', reading);

    // Add the new reading to the state
    setRecentReadings(prev => {
      const newReadings = [reading, ...prev.slice(0, 167)];
      // Calculate analytics with updated readings
      calculateAnalytics(newReadings);
      return newReadings;
    });

    // Update the energy data - we need to recalculate the daily totals properly
    // For now, we'll just update the current usage and let fetchRealEnergyData handle the daily totals
    setEnergyData(prev => ({
      ...prev,
      current_usage: reading.kwh_consumed,
      battery_state: energyProvider !== 'KPLC' ? reading.battery_state || prev.battery_state : prev.battery_state,
      power_generated: energyProvider !== 'KPLC' ? reading.power_generated || prev.power_generated : prev.power_generated,
      load_consumption: energyProvider !== 'KPLC' ? reading.load_consumption || prev.load_consumption : prev.load_consumption,
      battery_count: energyProvider !== 'KPLC' ? reading.battery_count || prev.battery_count : prev.battery_count
    }));

    // Clear cache when new data arrives
    dataCache.current = null;

    // Show notification for new reading
    toast({
      title: "New Reading Received",
      description: energyProvider === 'KPLC'
        ? `Received ${reading.kwh_consumed.toFixed(2)} kWh reading from meter ${reading.meter_number}`
        : `Received solar reading: ${reading.power_generated?.toFixed(2) || '0.00'} kW generated, ${reading.battery_state || 0}% battery`,
    });
  }, [calculateAnalytics, toast, energyProvider]);

  // Fetch real energy readings from the database (only when meter is connected)
  const fetchRealEnergyData = useCallback(async (forceRefresh = false, page = 1, pageSize = 50) => {
    if (!hasValidSession() || !userId || !hasMeterConnected || !meterNumber.current) {
      console.log('Skipping data fetch - no meter connected or not authenticated');
      setLoading(false);
      return;
    }

    // Check cache first unless force refresh
    const now = Date.now();
    if (!forceRefresh && dataCache.current) {
      // Validate cache data before using it
      const cacheAge = now - dataCache.current.timestamp;
      const isCacheValid = cacheAge < CACHE_DURATION;

      // Also check if the cache data is still relevant (e.g., same day)
      const cacheDate = new Date(dataCache.current.data.daily_total > 0 ?
        dataCache.current.readings[0]?.reading_date : now);
      const today = new Date();
      const isSameDay = cacheDate.getDate() === today.getDate() &&
                      cacheDate.getMonth() === today.getMonth() &&
                      cacheDate.getFullYear() === today.getFullYear();

      if (isCacheValid && isSameDay) {
        console.log('Using cached energy data (valid and relevant)');
        setEnergyData(dataCache.current.data);
        setRecentReadings(dataCache.current.readings);
        calculateAnalytics(dataCache.current.readings);
        setLoading(false);
        return;
      } else {
        console.log(`Cache invalid: ${!isCacheValid ? 'expired' : 'not same day'}`);
      }
    }

    // Prevent too frequent requests (rate limiting)
    if (!forceRefresh && (now - lastFetchTime.current) < 60000) { // Increased to 1 minute
      console.log('Skipping fetch - too soon since last request (rate limiting)');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      lastFetchTime.current = now;

      // Clear any existing loading timeout
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }

      // Set a timeout to prevent infinite loading
      loadingTimeoutRef.current = setTimeout(() => {
        setLoading(false);
        setError('Request timeout - please try again');
      }, 15000); // Increased timeout to 15 seconds

      console.log(`Fetching real data for meter: ${meterNumber.current}, page: ${page}, pageSize: ${pageSize}`);

      // Fetch recent readings with pagination
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      // First try to fetch with basic columns only
      const selectQuery = `
        id,
        user_id,
        meter_number,
        kwh_consumed,
        cost_per_kwh,
        total_cost,
        reading_date,
        billing_period_start,
        billing_period_end,
        peak_usage,
        off_peak_usage,
        created_at
      `;

      const queryResult = await query('energy_readings')
        .select(selectQuery, { count: 'exact', head: false })
        .eq('user_id', userId)
        .eq('meter_number', meterNumber.current)
        .gte('reading_date', oneWeekAgo.toISOString())
        .order('reading_date', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);
    
    const { data: readings, error: readingsError } = queryResult;
    
    // Handle the case where we have readings
    if (readings && Array.isArray(readings) && readings.length > 0) {
      // Validate that we have actual reading objects, not error objects
      const validReadings = readings.filter(r => 
        r && typeof r === 'object' && 'id' in r && 'user_id' in r
      );
      
      if (validReadings.length === 0) {
        throw new Error('No valid readings found');
      }
      
      console.log(`Found ${validReadings.length} energy readings`);
      setRecentReadings(validReadings);
      
      // Calculate basic stats from readings
      const dailyReadings = validReadings.filter(r => {
        const readingDate = new Date(r.reading_date);
        const today = new Date();
        return readingDate.getDate() === today.getDate() &&
               readingDate.getMonth() === today.getMonth() &&
               readingDate.getFullYear() === today.getFullYear();
      });
      
      const dailyTotal = dailyReadings.reduce((sum, r) => sum + r.kwh_consumed, 0);
      const dailyCost = dailyReadings.reduce((sum, r) => sum + r.total_cost, 0);
      const currentUsage = validReadings[0]?.kwh_consumed || 0;
      
      // Calculate weekly average
      const weeklyReadings = validReadings.filter(r => {
        const readingDate = new Date(r.reading_date);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - readingDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= 7;
      });
      
      const weeklyTotal = weeklyReadings.reduce((sum, r) => sum + r.kwh_consumed, 0);
      const weeklyAverage = weeklyTotal / 7;
      
      // Calculate monthly total
      const monthlyReadings = validReadings.filter(r => {
        const readingDate = new Date(r.reading_date);
        const now = new Date();
        return readingDate.getMonth() === now.getMonth() &&
               readingDate.getFullYear() === now.getFullYear();
      });
      
      const monthlyTotal = monthlyReadings.reduce((sum, r) => sum + r.kwh_consumed, 0);
      
      // Calculate efficiency score based on usage patterns
      const avgDailyUsage = weeklyTotal / 7;
      let efficiencyScore = 87; // Default
      
      if (profileData?.meter_category === 'household') {
        efficiencyScore = avgDailyUsage < 10 ? 95 : avgDailyUsage < 20 ? 87 : 75;
      } else if (profileData?.meter_category === 'SME') {
        efficiencyScore = avgDailyUsage < 50 ? 90 : avgDailyUsage < 100 ? 80 : 70;
      } else if (profileData?.meter_category === 'industry') {
        efficiencyScore = avgDailyUsage < 200 ? 85 : avgDailyUsage < 500 ? 75 : 65;
      }
      
      // Determine cost trend
      let costTrend: 'up' | 'down' | 'stable' = 'stable';
      if (validReadings.length >= 2) {
        const recent = validReadings[0].total_cost;
        const previous = validReadings[1].total_cost;
        
        if (recent > previous * 1.1) {
          costTrend = 'up';
        } else if (recent < previous * 0.9) {
          costTrend = 'down';
        }
      }
      
      // Find peak usage time
      let peakHour = '18:00'; // Default
      const hourlyUsage = new Map<number, number>();
      
      validReadings.forEach(reading => {
        const hour = new Date(reading.reading_date).getHours();
        hourlyUsage.set(hour, (hourlyUsage.get(hour) || 0) + reading.kwh_consumed);
      });
      
      let maxUsage = 0;
      let maxHour = 18;
      
      hourlyUsage.forEach((usage, hour) => {
        if (usage > maxUsage) {
          maxUsage = usage;
          maxHour = hour;
        }
      });
      
      peakHour = `${maxHour.toString().padStart(2, '0')}:00`;
      
      // Set energy data
      const newEnergyData = {
        current_usage: currentUsage,
        daily_total: dailyTotal,
        daily_cost: dailyCost,
        efficiency_score: efficiencyScore,
        weekly_average: weeklyAverage,
        monthly_total: monthlyTotal,
        peak_usage_time: peakHour,
        cost_trend: costTrend,
        // Add solar-specific data if applicable (set to undefined for KPLC meters)
        battery_state: energyProvider !== 'KPLC' ? (validReadings[0] as any)?.battery_state || 0 : undefined,
        power_generated: energyProvider !== 'KPLC' ? (validReadings[0] as any)?.power_generated || 0 : undefined,
        load_consumption: energyProvider !== 'KPLC' ? (validReadings[0] as any)?.load_consumption || 0 : undefined,
        battery_count: energyProvider !== 'KPLC' ? (validReadings[0] as any)?.battery_count || 0 : undefined
      };

      setEnergyData(newEnergyData);
      
      // Cache the data with additional metadata for validation
      dataCache.current = {
        data: newEnergyData,
        readings: validReadings,
        timestamp: now,
        userId: userId
      };
      
      // Calculate analytics
      calculateAnalytics(validReadings);
    } else if (readingsError && readingsError.code !== 'PGRST116') {
      console.error('Error fetching energy readings:', readingsError);
      throw new Error(`Failed to fetch energy readings: ${readingsError.message}`);
    } else {
      // No readings found, but meter is connected - show zero state
      console.log('No energy readings found for connected meter');
      setEnergyData(EMPTY_ENERGY_DATA);
      setRecentReadings([]);
      setAnalytics(EMPTY_ANALYTICS);
      setError(null); // Don't show error for empty data
    }
    
    // Clear loading timeout on success
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
    }
  } catch (error) {
    console.error('Error fetching real energy data:', error);
    
    // Clear loading timeout
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
    }
    
    setError('Failed to load energy data from your meter');
    
    // Reset to empty state on error
    setEnergyData(EMPTY_ENERGY_DATA);
    setRecentReadings([]);
    setAnalytics(EMPTY_ANALYTICS);
  } finally {
    setLoading(false);
  }
}, [userId, hasValidSession, hasMeterConnected, calculateAnalytics, profileData?.meter_category, query, energyProvider]);

  // Get a new energy reading from the meter or inverter
  const getNewReading = async () => {
    try {
      // Check if we have a meter connected and proper authentication
      if (!hasValidSession() || !userId || !hasMeterConnected || !meterNumber.current) {
        toast({
          title: energyProvider === 'KPLC' ? 'No Meter Connected' : 'No Inverter Connected',
          description: energyProvider === 'KPLC'
            ? 'Please set up your smart meter first to get readings.'
            : 'Please set up your solar inverter first to get readings.',
          variant: 'destructive'
        });
        return;
      }

      console.log(`Getting new reading from ${energyProvider === 'KPLC' ? 'meter' : 'inverter'} ${meterNumber.current}`);

      // For KPLC meters, we should fetch real data from the smart meter
      // In a real implementation, this would be handled by the smart meter webhook
      if (energyProvider === 'KPLC') {
        // Check if we can fetch real data from the database (smart meter should have sent it)
        await fetchRealEnergyData(true); // Force refresh to get latest data
        
        // If we still don't have data, show a message to the user
        if (!energyData || (energyData.current_usage === 0 && energyData.daily_total === 0)) {
          toast({
            title: 'No Recent Data',
            description: 'Your smart meter hasn\'t sent any recent readings. Please ensure your meter is properly connected and transmitting data.',
            variant: 'destructive'
          });
        } else {
          toast({
            title: 'Latest Reading',
            description: `Current usage: ${energyData.current_usage.toFixed(2)} kW, Today: ${energyData.daily_total.toFixed(2)} kWh (KSh ${energyData.daily_cost.toFixed(2)})`,
          });
        }
      } else {
        // For solar inverters, we should fetch real data from the inverter
        // Check if we can fetch real data from the database (inverter should have sent it)
        await fetchRealEnergyData(true); // Force refresh to get latest data
        
        // If we still don't have data, show a message to the user
        if (!energyData || (energyData.power_generated === 0 && energyData.load_consumption === 0)) {
          toast({
            title: 'No Recent Data',
            description: 'Your solar inverter hasn\'t sent any recent readings. Please ensure your inverter is properly connected and transmitting data.',
            variant: 'destructive'
          });
        } else {
          toast({
            title: 'Latest Reading',
            description: `Solar generated: ${energyData.power_generated?.toFixed(2) || '0.00'} kW, Battery: ${energyData.battery_state || 0}%`,
          });
        }
      }
    } catch (error) {
      console.error('Reading error:', error);
      toast({
        title: 'Reading Failed',
        description: energyProvider === 'KPLC'
          ? 'Could not get a reading from your meter. Please try again.'
          : 'Could not get a reading from your inverter. Please try again.',
        variant: 'destructive'
      });
    }
  };
  
  // Refresh data from the meter
  const refreshData = useCallback(async () => {
    if (hasMeterConnected) {
      await fetchRealEnergyData(true); // Force refresh
    }
  }, [fetchRealEnergyData, hasMeterConnected]);

  // Record a real reading in the database with enhanced validation
  const recordRealReading = useCallback(async (
    usage: number,
    costPerKwh: number = 25,
    totalCost: number = 0,
    readingDate: string = new Date().toISOString(),
    batteryState?: number,
    powerGenerated?: number,
    loadConsumption?: number,
    batteryCount?: number
   ) => {
    if (!hasValidSession() || !userId || !hasMeterConnected || !meterNumber.current) {
      console.error('Cannot record reading: missing required parameters');
      return null;
    }

    // Validate input parameters
    if (usage <= 0) {
      throw new Error('Usage must be a positive number');
    }

    if (costPerKwh <= 0) {
      throw new Error('Cost per kWh must be a positive number');
    }

    if (totalCost < 0) {
      throw new Error('Total cost cannot be negative');
    }

    try {
      // Validate reading date format
      new Date(readingDate);
    } catch (e) {
      throw new Error('Invalid reading date format');
    }

    // Calculate total cost if not provided
    const finalTotalCost = totalCost > 0 ? totalCost : usage * costPerKwh;

    // Validate calculated total cost
    if (finalTotalCost <= 0) {
      throw new Error('Calculated total cost must be positive');
    }

    console.log(`Recording reading: ${usage} kWh at KSh ${costPerKwh}/kWh = KSh ${finalTotalCost}`);

    try {
      // Prepare the reading data
      const readingData = {
        user_id: userId,
        meter_number: meterNumber.current,
        kwh_consumed: usage,
        cost_per_kwh: costPerKwh,
        total_cost: finalTotalCost,
        reading_date: readingDate,
        battery_state: energyProvider !== 'KPLC' ? batteryState : undefined,
        power_generated: energyProvider !== 'KPLC' ? powerGenerated : undefined,
        load_consumption: energyProvider !== 'KPLC' ? loadConsumption : undefined,
        battery_count: energyProvider !== 'KPLC' ? batteryCount : undefined
      };

      // Validate the reading data before sending
      const isValidEnergyReading = (obj: unknown): obj is EnergyReading => {
        if (!obj || typeof obj !== 'object' || obj === null) {
          return false;
        }

        const reading = obj as any;

        // Check required fields
        const requiredFields = [
          'id', 'user_id', 'meter_number', 'kwh_consumed',
          'total_cost', 'reading_date', 'cost_per_kwh'
        ];

        for (const field of requiredFields) {
          if (!(field in reading)) {
            console.warn(`Missing required field: ${field}`);
            return false;
          }
        }

        // Check field types
        if (
          typeof reading.id !== 'string' ||
          typeof reading.user_id !== 'string' ||
          typeof reading.meter_number !== 'string' ||
          typeof reading.kwh_consumed !== 'number' ||
          typeof reading.total_cost !== 'number' ||
          typeof reading.reading_date !== 'string' ||
          typeof reading.cost_per_kwh !== 'number'
        ) {
          console.warn('Invalid field types in energy reading');
          return false;
        }

        // Check for valid values
        if (
          reading.kwh_consumed < 0 ||
          reading.total_cost < 0 ||
          reading.cost_per_kwh <= 0
        ) {
          console.warn('Invalid values in energy reading (negative or zero values)');
          return false;
        }

        // Check if reading_date is a valid ISO date string
        try {
          new Date(reading.reading_date);
        } catch (e) {
          console.warn('Invalid reading_date format');
          return false;
        }

        // Optional fields validation
        if (reading.peak_usage !== undefined && typeof reading.peak_usage !== 'number') {
          console.warn('Invalid peak_usage type');
          return false;
        }

        if (reading.off_peak_usage !== undefined && typeof reading.off_peak_usage !== 'number') {
          console.warn('Invalid off_peak_usage type');
          return false;
        }

        return true;
      };

      if (!isValidEnergyReading({
        ...readingData,
        id: 'temp', // Temporary ID for validation
        created_at: new Date().toISOString()
      })) {
        throw new Error('Invalid reading data');
      }

      // Insert the reading into the database
      const { data, error } = await query('energy_readings')
        .insert(readingData)
        .select()
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error recording reading:', error);

        // Provide more specific error messages
        let errorMessage = 'Failed to record reading';
        if (error.message.includes('violates check constraint')) {
          errorMessage = 'Invalid reading values';
        } else if (error.message.includes('network')) {
          errorMessage = 'Network error while recording reading';
        }

        throw new Error(`${errorMessage}: ${error.message}`);
      }

      // Process the new reading immediately
      const newReading: EnergyReading = {
        id: data?.id || `temp-${Date.now()}`,
        user_id: userId,
        meter_number: meterNumber.current,
        kwh_consumed: usage,
        total_cost: finalTotalCost,
        reading_date: readingDate,
        cost_per_kwh: costPerKwh,
        battery_state: energyProvider !== 'KPLC' ? batteryState : undefined,
        power_generated: energyProvider !== 'KPLC' ? powerGenerated : undefined,
        load_consumption: energyProvider !== 'KPLC' ? loadConsumption : undefined,
        battery_count: energyProvider !== 'KPLC' ? batteryCount : undefined
      };

      // Validate the new reading before processing
      if (!isValidEnergyReading(newReading)) {
        console.error('Validation failed for new reading:', newReading);
        throw new Error('Validation failed for the created reading');
      }

      processNewReading(newReading);
      return newReading;
    } catch (error) {
      console.error('Exception recording reading:', error);

      // Provide more detailed error information
      let errorMessage = 'Failed to record reading';
      if (error instanceof Error) {
        errorMessage = error.message;
      }

      throw new Error(`Reading recording failed: ${errorMessage}`);
    }
  }, [userId, hasValidSession, hasMeterConnected, meterNumber.current, processNewReading, energyProvider, query]);

  // Function to connect to meter
  const connectToMeter = useCallback(async (meter: string) => {
    try {
      console.log(`Connecting to meter: ${meter}`);
      
      // Check authentication first
      if (!hasValidSession() || !userId) {
        throw new Error('User not authenticated');
      }
      
      // Set the new meter number
      meterNumber.current = meter;
      // Note: In the new context-based approach, we would call a context method to update the status
      // For now, we'll just update the ref and let the context handle the state
      setError(null);
      
      // Fetch data from the specific meter
      await fetchRealEnergyData(true); // Force refresh
      
      return true;
    } catch (error) {
      console.error(`Error connecting to meter ${meter}:`, error);
      // Note: In the new context-based approach, we would call a context method to update the status
      // For now, we'll just let the context handle the state
      
      // Reset to empty state on connection failure
      setEnergyData(EMPTY_ENERGY_DATA);
      setRecentReadings([]);
      setAnalytics(EMPTY_ANALYTICS);
      
      return false;
    }
  }, [userId, hasValidSession, fetchRealEnergyData]);

  // Initial setup - check meter connection first
  useEffect(() => {
    if (isInitialized.current) return;

    const initializeData = async () => {
      try {
        isInitialized.current = true;

        if (userId && hasValidSession()) {
          // Check if user has a meter connected
          const hasMeter = meterStatus === 'connected';

          if (hasMeter) {
            // Meter is connected, fetch real data
            await fetchRealEnergyData();
          } else {
            // No meter connected, show empty state
            console.log('No meter connected - showing empty state');
            setEnergyData(EMPTY_ENERGY_DATA);
            setRecentReadings([]);
            setAnalytics(EMPTY_ANALYTICS);
            setLoading(false);
          }
        } else {
          // Not authenticated, show empty state
          console.log('Not authenticated - showing empty state');
          setEnergyData(EMPTY_ENERGY_DATA);
          setRecentReadings([]);
          setAnalytics(EMPTY_ANALYTICS);
          setLoading(false);
        }
      } catch (error) {
        console.error('Error in initial data loading:', error);
        // Show empty state on error
        setEnergyData(EMPTY_ENERGY_DATA);
        setRecentReadings([]);
        setAnalytics(EMPTY_ANALYTICS);
        setLoading(false);
      }
    };

    // Initialize immediately
    initializeData();
  }, [userId, hasValidSession(), fetchRealEnergyData, energyProvider, meterStatus]);

  // Set up real-time data subscription (only when meter is connected) - IMPROVED VERSION
  useEffect(() => {
    // Only set up subscription if we have all required conditions
    if (!userId || !hasValidSession() || !hasMeterConnected || !meterNumber.current) {
      console.log('Skipping energy subscription setup - not ready', { 
        userId, 
        hasValidSession: hasValidSession(), 
        hasMeterConnected, 
        meterNumber: meterNumber.current 
      });
      return;
    }

    // Clear cache when energyProvider changes
    dataCache.current = null;

    // Set up a periodic refresh (every 30 minutes) - only when meter is connected
    const refreshInterval = setInterval(async () => {
      try {
        // Only refresh if we haven't had recent activity
        const now = Date.now();
        if (now - lastFetchTime.current > 15 * 60 * 1000) { // Only if last fetch was more than 15 minutes ago
          await refreshData();
        }
      } catch (error) {
        console.error('Error refreshing data:', error);
      }
    }, 30 * 60 * 1000); // 30 minutes instead of 15

    // Set up real-time data subscriptions with better error handling
    let readingsSubscription: ReturnType<typeof supabase.channel> | null = null;
    let subscriptionActive = true;
    let debounceTimeout: NodeJS.Timeout | null = null;
    let subscriptionSetupInProgress = false;

    // Prevent multiple concurrent subscription setups
    if (subscriptionSetupInProgress) {
      console.log('Energy subscription setup already in progress, skipping');
      clearInterval(refreshInterval);
      return;
    }

    subscriptionSetupInProgress = true;

    try {
      // Subscribe to real-time updates for energy_readings table with a more specific filter
      readingsSubscription = supabase
        .channel(`energy_readings_${userId}_${meterNumber.current}_${energyProvider}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'energy_readings',
          filter: `user_id=eq.${userId}&meter_number=eq.${meterNumber.current}`
        }, (payload) => {
          if (!subscriptionActive) return;

          console.log('New energy reading received:', payload.eventType);

          // Enhanced type guard function to validate EnergyReading with additional checks
          const isValidEnergyReading = (obj: unknown): obj is EnergyReading => {
            if (!obj || typeof obj !== 'object' || obj === null) {
              return false;
            }

            const reading = obj as any;

            // Check required fields
            const requiredFields = [
              'id', 'user_id', 'meter_number', 'kwh_consumed',
              'total_cost', 'reading_date', 'cost_per_kwh'
            ];

            for (const field of requiredFields) {
              if (!(field in reading)) {
                console.warn(`Missing required field: ${field}`);
                return false;
              }
            }

            // Check field types
            if (
              typeof reading.id !== 'string' ||
              typeof reading.user_id !== 'string' ||
              typeof reading.meter_number !== 'string' ||
              typeof reading.kwh_consumed !== 'number' ||
              typeof reading.total_cost !== 'number' ||
              typeof reading.reading_date !== 'string' ||
              typeof reading.cost_per_kwh !== 'number'
            ) {
              console.warn('Invalid field types in energy reading');
              return false;
            }

            // Check for valid values
            if (
              reading.kwh_consumed < 0 ||
              reading.total_cost < 0 ||
              reading.cost_per_kwh <= 0
            ) {
              console.warn('Invalid values in energy reading (negative or zero values)');
              return false;
            }

            // Check if reading_date is a valid ISO date string
            try {
              new Date(reading.reading_date);
            } catch (e) {
              console.warn('Invalid reading_date format');
              return false;
            }

            // Optional fields validation
            if (reading.peak_usage !== undefined && typeof reading.peak_usage !== 'number') {
              console.warn('Invalid peak_usage type');
              return false;
            }

            if (reading.off_peak_usage !== undefined && typeof reading.off_peak_usage !== 'number') {
              console.warn('Invalid off_peak_usage type');
              return false;
            }

            return true;
          };

          // Validate payload.new before processing
          if (isValidEnergyReading(payload.new)) {
            // Cancel any pending debounce
            if (debounceTimeout) {
              clearTimeout(debounceTimeout);
            }

            // Create a properly typed EnergyReading object
            const reading: EnergyReading = {
              id: payload.new.id,
              user_id: payload.new.user_id,
              meter_number: payload.new.meter_number,
              kwh_consumed: payload.new.kwh_consumed,
              total_cost: payload.new.total_cost,
              reading_date: payload.new.reading_date,
              cost_per_kwh: payload.new.cost_per_kwh,
              peak_usage: payload.new.peak_usage,
              off_peak_usage: payload.new.off_peak_usage,
              battery_state: payload.new.battery_state,
              power_generated: payload.new.power_generated,
              load_consumption: payload.new.load_consumption,
              battery_count: payload.new.battery_count
            };

            // Set up a new debounce
            debounceTimeout = setTimeout(() => {
              processNewReading(reading);
            }, 1000); // Increased debounce to 1 second
          } else {
            console.warn('Invalid energy reading received from subscription:', payload.new);
          }
        })
        .subscribe((status: string) => {
          console.log(`Energy readings subscription status: ${status}`);
          subscriptionSetupInProgress = false;
          
          // Handle subscription errors
          if (status === 'CHANNEL_ERROR') {
            console.error('Energy readings subscription failed');
            toast({
              title: 'Connection Error',
              description: 'Failed to establish real-time connection to energy data',
              variant: 'destructive'
            });
          } else if (status === 'CLOSED') {
            console.log('Energy readings subscription closed');
          }
        });
    } catch (error) {
      console.error('Error setting up real-time energy subscriptions:', error);
      subscriptionSetupInProgress = false;
      
      toast({
        title: 'Connection Error',
        description: 'Failed to establish real-time connection to energy data',
        variant: 'destructive'
      });
    }

    // Clean up subscriptions and intervals
    return () => {
      subscriptionActive = false;
      subscriptionSetupInProgress = false;
      clearInterval(refreshInterval);

      // Clear any pending debounce
      if (debounceTimeout) {
        clearTimeout(debounceTimeout);
      }

      if (readingsSubscription) {
        try {
          supabase.removeChannel(readingsSubscription);
          console.log('Successfully removed energy readings subscription');
        } catch (error) {
          console.error('Error removing energy readings subscription:', error);
        }
      }
    };
  }, [userId, hasValidSession, hasMeterConnected, meterNumber.current, refreshData, processNewReading, energyProvider, toast]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, []);

  return {
    energyData,
    recentReadings,
    analytics,
    loading,
    error,
    refreshData,
    getNewReading,
    // hasMeterConnected and meterConnectionChecked are now derived from context
    // We still return them for backward compatibility
    hasMeterConnected,
    meterConnectionChecked,
    recordRealReading,
    connectToMeter,
    meterNumber: meterNumber.current
  };
};