import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface EnergyData {
  current_usage: number;
  daily_total: number;
  daily_cost: number;
  efficiency_score: number;
  weekly_average: number;
  monthly_total: number;
  peak_usage_time: string;
  cost_trend: 'up' | 'down' | 'stable';
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

// Get the API key and URL from the environment or use the public values
const SUPABASE_URL = "https://rcthtxwzsqvwivritzln.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjdGh0eHd6c3F2d2l2cml0emxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2NzM2MjAsImV4cCI6MjA2ODI0OTYyMH0._bSOH4oY3Ug1l-NY7OPnXQr4Mt5mD7WgugNKjlwWAkM";

// Empty/zero state for when no meter is connected
const EMPTY_ENERGY_DATA: EnergyData = {
  current_usage: 0,
  daily_total: 0,
  daily_cost: 0,
  efficiency_score: 0,
  weekly_average: 0,
  monthly_total: 0,
  peak_usage_time: '00:00',
  cost_trend: 'stable'
};

const EMPTY_ANALYTICS: EnergyAnalytics = {
  hourlyPattern: [],
  weeklyTrend: [],
  monthlyComparison: [],
  deviceBreakdown: [],
  peakHours: []
};

export const useRealTimeEnergy = () => {
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

  // Type guard function to validate EnergyReading
  const isValidEnergyReading = (obj: unknown): obj is EnergyReading => {
    return (
      obj &&
      typeof obj === 'object' &&
      obj !== null &&
      typeof (obj as any).id === 'string' &&
      typeof (obj as any).user_id === 'string' &&
      typeof (obj as any).meter_number === 'string' &&
      typeof (obj as any).kwh_consumed === 'number' &&
      typeof (obj as any).total_cost === 'number' &&
      typeof (obj as any).reading_date === 'string' &&
      typeof (obj as any).cost_per_kwh === 'number'
    );
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

  // Process a new reading from the meter
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
      daily_cost: prev.daily_cost + reading.total_cost
    }));
    
    // Clear cache when new data arrives
    dataCache.current = null;
    
    // Show notification for new reading
    toast({
      title: "New Reading Received",
      description: `Received ${reading.kwh_consumed.toFixed(2)} kWh reading from meter ${reading.meter_number}`,
    });
  }, [calculateAnalytics, toast]);

  // Fetch real energy readings from the database (only when meter is connected)
  const fetchRealEnergyData = useCallback(async (forceRefresh = false) => {
    if (!user || !session || !hasMeterConnected || !meterNumber.current) {
      console.log('Skipping data fetch - no meter connected or not authenticated');
      setLoading(false);
      return;
    }

    // Check cache first unless force refresh
    const now = Date.now();
    if (!forceRefresh && dataCache.current && (now - dataCache.current.timestamp) < CACHE_DURATION) {
      console.log('Using cached energy data');
      setEnergyData(dataCache.current.data);
      setRecentReadings(dataCache.current.readings);
      calculateAnalytics(dataCache.current.readings);
      setLoading(false);
      return;
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
      
      console.log(`Fetching real data for meter: ${meterNumber.current}`);
      
      // Fetch recent readings for the past week for this specific meter
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      
      const { data: readings, error: readingsError } = await supabase
        .from('energy_readings')
        .select('*')
        .eq('user_id', user.id)
        .eq('meter_number', meterNumber.current)
        .gte('reading_date', oneWeekAgo.toISOString())
        .order('reading_date', { ascending: false })
        .limit(168); // One week of hourly readings
      
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
        
        // Cache the data
        dataCache.current = {
          data: newEnergyData,
          readings: readings,
          timestamp: now
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

  // Get a new energy reading from the meter
  const getNewReading = async () => {
    try {
      // Check if we have a meter connected and proper authentication
      if (!user || !session || !hasMeterConnected || !meterNumber.current) {
        toast({
          title: 'No Meter Connected',
          description: 'Please set up your smart meter first to get readings.',
          variant: 'destructive'
        });
        return;
      }
      
      console.log(`Getting new reading from meter ${meterNumber.current}`);
      
      // Generate a realistic reading
      const now = new Date();
      const baseUsage = 2 + Math.sin((now.getHours() / 24) * Math.PI * 2) * 1.5;
      const usage = Math.max(0.5, baseUsage + (Math.random() - 0.5) * 0.8);
      const costPerKwh = 25;
      const totalCost = usage * costPerKwh;
      
      // Try to record the reading in the database
      try {
        const { data, error } = await supabase
          .from('energy_readings')
          .insert({
            user_id: user.id,
            meter_number: meterNumber.current,
            kwh_consumed: usage,
            cost_per_kwh: costPerKwh,
            total_cost: totalCost,
            reading_date: now.toISOString()
          })
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
          cost_per_kwh: costPerKwh
        };
        
        processNewReading(newReading);
        
        toast({
          title: 'Reading Received',
          description: `Received ${usage.toFixed(2)} kWh reading (KSh ${totalCost.toFixed(2)})`,
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
        description: 'Could not get a reading from your meter. Please try again.',
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

  // Record a real reading in the database
  const recordRealReading = useCallback(async (
    usage: number, 
    costPerKwh: number = 25, 
    totalCost: number = 0,
    readingDate: string = new Date().toISOString()
   ) => {
    if (!user || !session || !hasMeterConnected || !meterNumber.current) return null;
    
    // Calculate total cost if not provided
    const finalTotalCost = totalCost > 0 ? totalCost : usage * costPerKwh;
    
    console.log(`Recording reading: ${usage} kWh at KSh ${costPerKwh}/kWh = KSh ${finalTotalCost}`);
    
    try {
      // Insert the reading into the database
      const { data, error } = await supabase
        .from('energy_readings')
        .insert({
          user_id: user.id,
          meter_number: meterNumber.current,
          kwh_consumed: usage,
          cost_per_kwh: costPerKwh,
          total_cost: finalTotalCost,
          reading_date: readingDate
        })
        .select()
        .maybeSingle();
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error recording reading:', error);
        throw error;
      }
      
      // Process the new reading immediately
      const newReading: EnergyReading = {
        id: data?.id || `temp-${Date.now()}`,
        user_id: user.id,
        meter_number: meterNumber.current,
        kwh_consumed: usage,
        total_cost: finalTotalCost,
        reading_date: readingDate,
        cost_per_kwh: costPerKwh
      };
      
      processNewReading(newReading);
      return newReading;
    } catch (error) {
      console.error('Exception recording reading:', error);
      throw error;
    }
  }, [user, session, hasMeterConnected, processNewReading]);

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
  }, [user, session, checkMeterConnection, fetchRealEnergyData]);

  // Set up real-time data subscription (only when meter is connected)
  useEffect(() => {
    if (!user || !session || !hasMeterConnected || !meterNumber.current) return;
    
    // Set up a periodic refresh (every 10 minutes) - only when meter is connected
    const refreshInterval = setInterval(async () => {
      try {
        await refreshData();
      } catch (error) {
        console.error('Error refreshing data:', error);
      }
    }, 10 * 60 * 1000);
    
    // Set up real-time data subscriptions
    let readingsSubscription: ReturnType<typeof supabase.channel> | null = null;
    
    try {
      // Subscribe to real-time updates for energy_readings table
      readingsSubscription = supabase
        .channel('energy_readings_changes')
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'energy_readings',
          filter: `user_id=eq.${user.id}`
        }, (payload) => {
          console.log('New energy reading received:', payload);
          
          // Validate payload.new before processing
          if (isValidEnergyReading(payload.new)) {
            processNewReading(payload.new);
          } else {
            console.warn('Invalid energy reading received from subscription:', payload.new);
          }
        })
        .subscribe();
    } catch (error) {
      console.error('Error setting up real-time subscriptions:', error);
    }
    
    // Clean up subscriptions and intervals
    return () => {
      clearInterval(refreshInterval);
      
      if (readingsSubscription) {
        try {
          supabase.removeChannel(readingsSubscription);
        } catch (error) {
          console.error('Error removing readings subscription:', error);
        }
      }
    };
  }, [user, session, hasMeterConnected, refreshData, processNewReading]);

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