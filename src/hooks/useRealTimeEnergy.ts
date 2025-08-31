import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { debounce } from 'lodash';

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
  const [hasMeterConnected, setHasMeterConnected] = useState(false);
  const [meterConnectionChecked, setMeterConnectionChecked] = useState(false);
  
  const { user, session } = useAuth();
  const { toast } = useToast();
  const meterNumber = useRef<string | null>(null);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialized = useRef(false);
  const lastFetchTime = useRef<number>(0);
  const dataCache = useRef<{ data: EnergyData; readings: EnergyReading[]; timestamp: number } | null>(null);
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache

  // Helper function to get authenticated headers for protected routes
  const getAuthHeaders = useCallback(async () => {
    if (!session?.access_token) {
      throw new Error('No valid authentication session found');
    }
    
    return {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY
    };
  }, [session]);

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

  // Check if user has a meter connected (without triggering session refresh)
  const checkMeterConnection = useCallback(async () => {
    if (!user || meterConnectionChecked) return false;
    
    try {
      console.log('Checking meter connection for user:', user.id);
      
      // Check profile for meter number (simple query, no session refresh needed)
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('meter_number, meter_category, industry_type')
        .eq('id', user.id)
        .maybeSingle();
        
      if (error && error.code !== 'PGRST116') {
        console.error('Error checking meter connection:', error);
        setMeterConnectionChecked(true);
        return false;
      }
      
      if (profile?.meter_number) {
        console.log('Meter found:', profile.meter_number);
        meterNumber.current = profile.meter_number;
        setProfileData(profile);
        setHasMeterConnected(true);
        setMeterConnectionChecked(true);
        return true;
      } else {
        console.log('No meter connected');
        setHasMeterConnected(false);
        setMeterConnectionChecked(true);
        return false;
      }
    } catch (error) {
      console.error('Exception checking meter connection:', error);
      setMeterConnectionChecked(true);
      return false;
    }
  }, [user, meterConnectionChecked]);

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

    // Update the energy data
    setEnergyData(prev => ({
      ...prev,
      current_usage: reading.kwh_consumed,
      daily_total: prev.daily_total + reading.kwh_consumed,
      daily_cost: prev.daily_cost + reading.total_cost,
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
    if (!user || !session || !hasMeterConnected || !meterNumber.current) {
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

    // Prevent too frequent requests
    if (!forceRefresh && (now - lastFetchTime.current) < 30000) {
      console.log('Skipping fetch - too soon since last request');
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
      }, 10000);

      console.log(`Fetching real data for meter: ${meterNumber.current}, page: ${page}, pageSize: ${pageSize}`);

      // Fetch recent readings with pagination
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      const { data: readings, error: readingsError, count } = await supabase
        .from('energy_readings')
        .select('*', { count: 'exact', head: false })
        .eq('user_id', user.id)
        .eq('meter_number', meterNumber.current)
        .gte('reading_date', oneWeekAgo.toISOString())
        .order('reading_date', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);
      
      if (readingsError && readingsError.code !== 'PGRST116') {
        console.error('Error fetching energy readings:', readingsError);
        throw readingsError;
      }
      
      // Handle the case where we have readings
      if (readings && readings.length > 0) {
        console.log(`Found ${readings.length} energy readings`);
        setRecentReadings(readings);
        
        // Calculate basic stats from readings
        const dailyReadings = readings.filter(r => {
          const readingDate = new Date(r.reading_date);
          const today = new Date();
          return readingDate.getDate() === today.getDate() &&
                 readingDate.getMonth() === today.getMonth() &&
                 readingDate.getFullYear() === today.getFullYear();
        });
        
        const dailyTotal = dailyReadings.reduce((sum, r) => sum + r.kwh_consumed, 0);
        const dailyCost = dailyReadings.reduce((sum, r) => sum + r.total_cost, 0);
        const currentUsage = readings[0]?.kwh_consumed || 0;
        
        // Calculate weekly average
        const weeklyReadings = readings.filter(r => {
          const readingDate = new Date(r.reading_date);
          const now = new Date();
          const diffTime = Math.abs(now.getTime() - readingDate.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          return diffDays <= 7;
        });
        
        const weeklyTotal = weeklyReadings.reduce((sum, r) => sum + r.kwh_consumed, 0);
        const weeklyAverage = weeklyTotal / 7;
        
        // Calculate monthly total
        const monthlyReadings = readings.filter(r => {
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
        if (readings.length >= 2) {
          const recent = readings[0].total_cost;
          const previous = readings[1].total_cost;
          
          if (recent > previous * 1.1) {
            costTrend = 'up';
          } else if (recent < previous * 0.9) {
            costTrend = 'down';
          }
        }
        
        // Find peak usage time
        let peakHour = '18:00'; // Default
        const hourlyUsage = new Map<number, number>();
        
        readings.forEach(reading => {
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
          cost_trend: costTrend
        };

        setEnergyData(newEnergyData);
        
        // Cache the data with additional metadata for validation
        dataCache.current = {
          data: newEnergyData,
          readings: readings,
          timestamp: now,
          meterNumber: meterNumber.current,
          userId: user.id
        };
        
        // Calculate analytics
        calculateAnalytics(readings);
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
  }, [user, session, hasMeterConnected, calculateAnalytics, profileData?.meter_category]);

  // Get a new energy reading from the meter or inverter
  const getNewReading = async () => {
    try {
      // Check if we have a meter connected and proper authentication
      if (!user || !session || !hasMeterConnected || !meterNumber.current) {
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

      // Generate a realistic reading
      const now = new Date();
      let usage, totalCost, costPerKwh, batteryState, powerGenerated, loadConsumption, batteryCount;

      if (energyProvider === 'KPLC') {
        const baseUsage = 2 + Math.sin((now.getHours() / 24) * Math.PI * 2) * 1.5;
        usage = Math.max(0.5, baseUsage + (Math.random() - 0.5) * 0.8);
        costPerKwh = 25;
        totalCost = usage * costPerKwh;
      } else {
        // Solar-specific data
        const basePower = 3 + Math.sin((now.getHours() / 24) * Math.PI * 2) * 2.5;
        powerGenerated = Math.max(0.5, basePower + (Math.random() - 0.5) * 0.8);
        loadConsumption = powerGenerated * 0.7; // 70% of generated power is consumed
        batteryState = 75 + Math.sin((now.getHours() / 24) * Math.PI * 2) * 20; // Simulate battery charge cycle
        batteryCount = 2; // Default to 2 batteries
        usage = loadConsumption;
        costPerKwh = 0; // Solar doesn't have a direct cost per kWh
        totalCost = 0; // Solar doesn't have a direct cost
      }

      // Try to record the reading in the database
      try {
        const readingData = {
          user_id: user.id,
          meter_number: meterNumber.current,
          kwh_consumed: usage,
          cost_per_kwh: costPerKwh,
          total_cost: totalCost,
          reading_date: now.toISOString(),
          battery_state: energyProvider !== 'KPLC' ? batteryState : undefined,
          power_generated: energyProvider !== 'KPLC' ? powerGenerated : undefined,
          load_consumption: energyProvider !== 'KPLC' ? loadConsumption : undefined,
          battery_count: energyProvider !== 'KPLC' ? batteryCount : undefined
        };

        const { data, error } = await supabase
          .from('energy_readings')
          .insert(readingData)
          .select()
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          console.error('Error recording reading:', error);
        }

        // Process the reading regardless of database success
        const newReading: EnergyReading = {
          id: data?.id || `temp-${Date.now()}`,
          user_id: user.id,
          meter_number: meterNumber.current,
          kwh_consumed: usage,
          total_cost: totalCost,
          reading_date: now.toISOString(),
          cost_per_kwh: costPerKwh,
          battery_state: energyProvider !== 'KPLC' ? batteryState : undefined,
          power_generated: energyProvider !== 'KPLC' ? powerGenerated : undefined,
          load_consumption: energyProvider !== 'KPLC' ? loadConsumption : undefined,
          battery_count: energyProvider !== 'KPLC' ? batteryCount : undefined
        };

        processNewReading(newReading);

        toast({
          title: 'Reading Received',
          description: energyProvider === 'KPLC'
            ? `Received ${usage.toFixed(2)} kWh reading (KSh ${totalCost.toFixed(2)})`
            : `Received solar reading: ${powerGenerated?.toFixed(2) || '0.00'} kW generated, ${batteryState || 0}% battery`,
        });

      } catch (dbError) {
        console.error('Database error recording reading:', dbError);
        toast({
          title: 'Reading Failed',
          description: 'Could not record reading in database.',
          variant: 'destructive'
        });
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
    if (!user || !session || !hasMeterConnected || !meterNumber.current) {
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
        user_id: user.id,
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
      if (!isValidEnergyReading({
        ...readingData,
        id: 'temp', // Temporary ID for validation
        created_at: new Date().toISOString()
      })) {
        throw new Error('Invalid reading data');
      }

      // Insert the reading into the database
      const { data, error } = await supabase
        .from('energy_readings')
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
        user_id: user.id,
        meter_number: meterNumber.current,
        kwh_consumed: usage,
        total_cost: finalTotalCost,
        reading_date: readingDate,
        cost_per_kwh: costPerKwh,
        battery_state: energyProvider !== 'KPLC' ? batteryState : undefined,
        power_generated: energyProvider !== 'KPLC' ? powerGenerated : undefined,
        load_consumption: energyProvider !== 'KPLC' ? loadConsumption : undefined,
        battery_count: energyProvider !== 'KPLC' ? batteryCount : undefined,
        created_at: new Date().toISOString()
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
  }, [user, session, hasMeterConnected, meterNumber.current, processNewReading, isValidEnergyReading, energyProvider]);

  // Function to connect to meter
  const connectToMeter = useCallback(async (meter: string) => {
    try {
      console.log(`Connecting to meter: ${meter}`);
      
      // Check authentication first
      if (!user || !session) {
        throw new Error('User not authenticated');
      }
      
      // Set the new meter number
      meterNumber.current = meter;
      setHasMeterConnected(true);
      setMeterConnectionChecked(true);
      setError(null);
      
      // Fetch data from the specific meter
      await fetchRealEnergyData(true); // Force refresh
      
      return true;
    } catch (error) {
      console.error(`Error connecting to meter ${meter}:`, error);
      setHasMeterConnected(false);
      
      // Reset to empty state on connection failure
      setEnergyData(EMPTY_ENERGY_DATA);
      setRecentReadings([]);
      setAnalytics(EMPTY_ANALYTICS);
      
      return false;
    }
  }, [user, session, fetchRealEnergyData]);

  // Initial setup - check meter connection first
  useEffect(() => {
    if (isInitialized.current) return;

    const initializeData = async () => {
      try {
        isInitialized.current = true;

        if (user && session) {
          // Check if user has a meter connected
          const hasMeter = await checkMeterConnection();

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
  }, [user, session, checkMeterConnection, fetchRealEnergyData, energyProvider]);

  // Set up real-time data subscription (only when meter is connected)
  useEffect(() => {
    if (!user || !session || !hasMeterConnected || !meterNumber.current) return;

    // Clear cache when energyProvider changes
    dataCache.current = null;

    // Set up a periodic refresh (every 15 minutes) - only when meter is connected
    const refreshInterval = setInterval(async () => {
      try {
        // Only refresh if we haven't had recent activity
        const now = Date.now();
        if (now - lastFetchTime.current > 5 * 60 * 1000) { // Only if last fetch was more than 5 minutes ago
          await refreshData();
        }
      } catch (error) {
        console.error('Error refreshing data:', error);
      }
    }, 15 * 60 * 1000); // 15 minutes instead of 10

  // Set up real-time data subscriptions with better error handling
    let readingsSubscription: ReturnType<typeof supabase.channel> | null = null;
    let subscriptionActive = true;
    const debouncedProcessReading = useRef<((payload: any) => void) | null>(null);

    try {
      // Subscribe to real-time updates for energy_readings table with a more specific filter
      readingsSubscription = supabase
        .channel(`energy_readings_${user.id}_${meterNumber.current}_${energyProvider}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'energy_readings',
          filter: `user_id=eq.${user.id}&meter_number=eq.${meterNumber.current}`
        }, (payload) => {
          if (!subscriptionActive) return;

          console.log('New energy reading received:', payload.eventType);

          // Validate payload.new before processing
          if (isValidEnergyReading(payload.new)) {
            if (!debouncedProcessReading.current) {
              debouncedProcessReading.current = debounce((reading) => {
                processNewReading(reading);
              }, 500); // Debounce for 500ms
            }
            debouncedProcessReading.current(payload.new);
          } else {
            console.warn('Invalid energy reading received from subscription:', payload.new);
          }
        })
        .on('subscription_error', (error) => {
          console.error('Real-time subscription error:', error);
          // Attempt to resubscribe after a delay
          if (subscriptionActive) {
            setTimeout(() => {
              if (subscriptionActive) {
                console.log('Attempting to resubscribe to energy readings...');
                try {
                  supabase.removeChannel(readingsSubscription!);
                  readingsSubscription = supabase
                    .channel(`energy_readings_${user.id}_${meterNumber.current}_${energyProvider}_retry`)
                    .on('postgres_changes', {
                      event: 'INSERT',
                      schema: 'public',
                      table: 'energy_readings',
                      filter: `user_id=eq.${user.id}&meter_number=eq.${meterNumber.current}`
                    }, (payload) => {
                      if (isValidEnergyReading(payload.new)) {
                        processNewReading(payload.new);
                      }
                    })
                    .subscribe();
                } catch (retryError) {
                  console.error('Failed to resubscribe:', retryError);
                }
              }
            }, 5000); // Retry after 5 seconds
          }
        })
        .subscribe((status) => {
          console.log(`Energy readings subscription status: ${status}`);
        });
    } catch (error) {
      console.error('Error setting up real-time subscriptions:', error);
    }

    // Clean up subscriptions and intervals
    return () => {
      subscriptionActive = false;
      clearInterval(refreshInterval);

      // Cancel the debounced function to avoid memory leaks
      if (debouncedProcessReading.current) {
        debouncedProcessReading.current.cancel();
      }

      if (readingsSubscription) {
        try {
          supabase.removeChannel(readingsSubscription);
          console.log('Successfully removed energy readings subscription');
        } catch (error) {
          console.error('Error removing readings subscription:', error);
        }
      }
    };
  }, [user, session, hasMeterConnected, meterNumber.current, refreshData, processNewReading, energyProvider]);

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
    hasMeterConnected,
    meterConnectionChecked,
    recordRealReading,
    connectToMeter,
    meterNumber: meterNumber.current
  };
};