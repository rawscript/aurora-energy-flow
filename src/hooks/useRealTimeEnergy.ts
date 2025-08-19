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

export const useRealTimeEnergy = () => {
  const [energyData, setEnergyData] = useState<EnergyData>({
    current_usage: 0,
    daily_total: 0,
    daily_cost: 0,
    efficiency_score: 0,
    weekly_average: 0,
    monthly_total: 0,
    peak_usage_time: '18:00',
    cost_trend: 'stable'
  });
  const [recentReadings, setRecentReadings] = useState<EnergyReading[]>([]);
  const [analytics, setAnalytics] = useState<EnergyAnalytics>({
    hourlyPattern: [],
    weeklyTrend: [],
    monthlyComparison: [],
    deviceBreakdown: [],
    peakHours: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [hasMeterConnected, setHasMeterConnected] = useState(false);
  const { user, session } = useAuth(); // Get both user and session for protected routes
  const { toast } = useToast();
  const meterNumber = useRef<string | null>(null);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const connectionAttempts = useRef(0);
  const maxConnectionAttempts = 3;
  const isInitialized = useRef(false);

  // Helper function to get authenticated headers for protected routes
  const getAuthHeaders = useCallback(async () => {
    if (!session?.access_token) {
      // Try to get fresh session
      const { data: { session: freshSession }, error } = await supabase.auth.getSession();
      if (error || !freshSession?.access_token) {
        throw new Error('No valid authentication session found');
      }
      return {
        'Authorization': `Bearer ${freshSession.access_token}`,
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY
      };
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

  // Calculate analytics based on readings
  const calculateAnalytics = useCallback((readings: EnergyReading[]) => {
    if (readings.length === 0) {
      setAnalytics({
        hourlyPattern: [],
        weeklyTrend: [],
        monthlyComparison: [],
        deviceBreakdown: [],
        peakHours: []
      });
      return;
    }

    // Calculate hourly patterns
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
      // Industrial usage patterns
      hvacPercentage = 45;
      lightingPercentage = 15;
      appliancesPercentage = 30;
      electronicsPercentage = 10;
    } else if (meterCategory === 'SME') {
      // SME usage patterns
      hvacPercentage = 35;
      lightingPercentage = 25;
      appliancesPercentage = 25;
      electronicsPercentage = 15;
    } else {
      // Household usage patterns
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
      monthlyComparison: [], // Would be calculated from historical data
      deviceBreakdown,
      peakHours
    });
  }, [energyData.daily_cost, profileData?.meter_category]);

  // Fetch user profile data with proper authentication
  const fetchProfileData = useCallback(async () => {
    if (!user || !session) return null;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('meter_number, meter_category, industry_type')
        .eq('id', user.id)
        .maybeSingle();
        
      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }
      
      setProfileData(data);
      return data;
    } catch (error) {
      console.error('Exception fetching profile:', error);
      return null;
    }
  }, [user, session]);

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
    
    // Show notification for new reading
    toast({
      title: "New Reading Received",
      description: `Received ${reading.kwh_consumed.toFixed(2)} kWh reading from meter ${reading.meter_number}`,
    });
  }, [calculateAnalytics, toast]);

  // Fetch real energy readings from the database with proper authentication
  const fetchRealEnergyData = useCallback(async () => {
    if (!user || !session) {
      setLoading(false);
      setError('User not authenticated');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Clear any existing loading timeout
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
      
      // Set a timeout to prevent infinite loading
      loadingTimeoutRef.current = setTimeout(() => {
        setLoading(false);
        setError('Request timeout - please try again');
      }, 15000); // 15 second timeout
      
      // Get the meter number to use
      const currentMeterNumber = meterNumber.current;
      
      if (!currentMeterNumber) {
        if (loadingTimeoutRef.current) {
          clearTimeout(loadingTimeoutRef.current);
        }
        setLoading(false);
        setError('No meter connected. Please set up your smart meter first.');
        return;
      }
      
      console.log(`Fetching real data for meter: ${currentMeterNumber}`);
      
      // Fetch the latest energy data using the database function with proper auth
      const { data: latestData, error: latestError } = await supabase
        .rpc('get_latest_energy_data', { 
          p_user_id: user.id
        });
      
      if (latestError) {
        console.error('Error fetching latest energy data:', latestError);
      }
      
      // Fetch recent readings for the past week for this specific meter
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      
      const { data: readings, error: readingsError } = await supabase
        .from('energy_readings')
        .select('*')
        .eq('user_id', user.id)
        .eq('meter_number', currentMeterNumber)
        .gte('reading_date', oneWeekAgo.toISOString())
        .order('reading_date', { ascending: false })
        .limit(168); // One week of hourly readings
      
      if (readingsError) {
        console.error('Error fetching energy readings:', readingsError);
        throw readingsError;
      }
      
      // If we have latest data from the function
      if (latestData && latestData.length > 0) {
        const latest = latestData[0];
        
        // Calculate weekly and monthly averages from readings
        let weeklyTotal = 0;
        let monthlyTotal = 0;
        
        if (readings && readings.length > 0) {
          // Set recent readings
          setRecentReadings(readings);
          
          // Calculate weekly and monthly totals
          const now = new Date();
          const oneMonthAgo = new Date();
          oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
          
          readings.forEach(reading => {
            const readingDate = new Date(reading.reading_date);
            
            // Count for weekly average (last 7 days)
            if ((now.getTime() - readingDate.getTime()) / (1000 * 60 * 60 * 24) <= 7) {
              weeklyTotal += reading.kwh_consumed;
            }
            
            // Count for monthly total
            if (readingDate >= oneMonthAgo) {
              monthlyTotal += reading.kwh_consumed;
            }
          });
        }
        
        // Determine cost trend by comparing recent readings
        let costTrend: 'up' | 'down' | 'stable' = 'stable';
        
        if (readings && readings.length >= 2) {
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
        if (readings && readings.length > 0) {
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
        }
        
        // Set energy data with real values
        setEnergyData({
          current_usage: latest.current_usage || 0,
          daily_total: latest.daily_total || 0,
          daily_cost: latest.daily_cost || 0,
          efficiency_score: latest.efficiency_score || 87,
          weekly_average: weeklyTotal / 7, // Average daily usage over a week
          monthly_total: monthlyTotal,
          peak_usage_time: peakHour,
          cost_trend: costTrend
        });
        
        // Calculate analytics based on real readings
        if (readings && readings.length > 0) {
          calculateAnalytics(readings);
        }
      } else if (readings && readings.length > 0) {
        // If no data from function but we have readings, calculate from readings
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
        setEnergyData({
          current_usage: currentUsage,
          daily_total: dailyTotal,
          daily_cost: dailyCost,
          efficiency_score: efficiencyScore,
          weekly_average: weeklyAverage,
          monthly_total: monthlyTotal,
          peak_usage_time: peakHour,
          cost_trend: costTrend
        });
        
        // Calculate analytics
        calculateAnalytics(readings);
      } else {
        // No data available from meter
        setError('No energy data available from your meter. Please check your meter connection.');
        
        // Reset to empty state
        setEnergyData({
          current_usage: 0,
          daily_total: 0,
          daily_cost: 0,
          efficiency_score: 0,
          weekly_average: 0,
          monthly_total: 0,
          peak_usage_time: '18:00',
          cost_trend: 'stable'
        });
        setRecentReadings([]);
        setAnalytics({
          hourlyPattern: [],
          weeklyTrend: [],
          monthlyComparison: [],
          deviceBreakdown: [],
          peakHours: []
        });
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
      setEnergyData({
        current_usage: 0,
        daily_total: 0,
        daily_cost: 0,
        efficiency_score: 0,
        weekly_average: 0,
        monthly_total: 0,
        peak_usage_time: '18:00',
        cost_trend: 'stable'
      });
      setRecentReadings([]);
      setAnalytics({
        hourlyPattern: [],
        weeklyTrend: [],
        monthlyComparison: [],
        deviceBreakdown: [],
        peakHours: []
      });
    } finally {
      setLoading(false);
    }
  }, [user, session, calculateAnalytics, profileData?.meter_category]);

  // Get a new energy reading from the meter with proper authentication
  const getNewReading = async () => {
    try {
      // Check if we have a meter connected and proper authentication
      if (!user || !session || !meterNumber.current) {
        toast({
          title: 'No Meter Connected',
          description: 'Please set up your smart meter first to get readings.',
          variant: 'destructive'
        });
        return;
      }
      
      console.log(`Fetching real reading from meter ${meterNumber.current}`);
      
      // Try to fetch a real reading from the smart meter webhook function with proper auth
      try {
        const headers = await getAuthHeaders();
        
        const response = await fetch(`${SUPABASE_URL}/functions/v1/smart-meter-webhook?user_id=${user.id}`, {
          method: 'GET',
          headers
        });
        
        if (response.ok) {
          const result = await response.json();
          
          if (result.success && result.readings && result.readings.length > 0) {
            // We got real readings from the meter
            const latestReading = result.readings[0];
            
            toast({
              title: 'Reading Received',
              description: `Received ${latestReading.kwh_consumed.toFixed(2)} kWh reading from meter ${meterNumber.current}`,
            });
            
            // Refresh the data to show the latest reading
            await fetchRealEnergyData();
            return;
          }
        } else if (response.status === 401 || response.status === 403) {
          throw new Error('Authentication failed - please sign in again');
        } else {
          throw new Error(`API request failed with status ${response.status}`);
        }
      } catch (apiError) {
        console.log('Smart meter API call failed:', apiError);
        throw apiError;
      }
    } catch (error) {
      console.error('Reading error:', error);
      
      // Handle authentication errors specifically
      if (error instanceof Error && error.message.includes('Authentication')) {
        toast({
          title: 'Authentication Error',
          description: 'Please sign in again to access your meter data.',
          variant: 'destructive'
        });
      } else {
        toast({
          title: 'Reading Failed',
          description: 'Could not get a reading from your meter. Please check your meter connection.',
          variant: 'destructive'
        });
      }
    }
  };
  
  // Refresh data from the meter
  const refreshData = useCallback(async () => {
    await fetchRealEnergyData();
  }, [fetchRealEnergyData]);

  // Record a real reading in the database with proper authentication
  const recordRealReading = useCallback(async (
    usage: number, 
    costPerKwh: number = 25, 
    totalCost: number = 0,
    readingDate: string = new Date().toISOString()
   ) => {
    if (!user || !session) return null;
    
    // Get the current meter number
    const currentMeterNumber = meterNumber.current;
    
    if (!currentMeterNumber) {
      // Try to get the meter number from profile
      const profile = await fetchProfileData();
      
      if (!profile?.meter_number) {
        throw new Error('No meter number found');
      }
      
      meterNumber.current = profile.meter_number;
    }
    
    // Calculate total cost if not provided
    const finalTotalCost = totalCost > 0 ? totalCost : usage * costPerKwh;
    
    console.log(`Recording reading: ${usage} kWh at KSh ${costPerKwh}/kWh = KSh ${finalTotalCost}`);
    
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
      .single();
    
    if (error) {
      console.error('Error recording reading:', error);
      throw error;
    }
    
    // Process the new reading immediately
    if (data) {
      processNewReading(data);
    }
    
    return data;
  }, [user, session, processNewReading, fetchProfileData]);

  // Function to connect to meter with proper authentication
  const connectToMeter = useCallback(async (meter: string) => {
    try {
      console.log(`Connecting to meter: ${meter}`);
      
      // Check authentication first
      if (!user || !session) {
        throw new Error('User not authenticated');
      }
      
      // Reset connection state first
      setHasMeterConnected(false);
      setError(null);
      setLoading(true);
      
      // Clear any existing loading timeout
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
      
      // Disconnect from any previous meter by clearing the meter number first
      const previousMeter = meterNumber.current;
      if (previousMeter && previousMeter !== meter) {
        console.log(`Disconnecting from previous meter: ${previousMeter}`);
      }
      
      // Set the new meter number (this ensures only this meter is connected)
      meterNumber.current = meter;
      
      // Reset connection attempts for new meter
      connectionAttempts.current = 0;
      
      // Fetch real data from the specific meter
      await fetchRealEnergyData();
      
      // If we get here, connection was successful
      setHasMeterConnected(true);
      setLoading(false);
      
      return true;
    } catch (error) {
      console.error(`Error connecting to meter ${meter}:`, error);
      
      // Increment connection attempts
      connectionAttempts.current += 1;
      
      setLoading(false);
      
      // Handle authentication errors specifically
      if (error instanceof Error && error.message.includes('authenticated')) {
        setError('Authentication required - please sign in again');
        setHasMeterConnected(false);
        
        toast({
          title: "Authentication Error",
          description: "Please sign in again to connect to your meter.",
          variant: "destructive"
        });
        return false;
      }
      
      // If we've tried too many times, show error
      if (connectionAttempts.current >= maxConnectionAttempts) {
        setError(`Could not connect to meter ${meter} after multiple attempts`);
        setHasMeterConnected(false);
        
        toast({
          title: "Connection Failed",
          description: `Could not connect to meter ${meter} after multiple attempts. Please check your meter connection.`,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Connection Issue",
          description: `Trouble connecting to meter ${meter}. Retrying...`,
          variant: "destructive"
        });
        
        // Try again after a delay
        setTimeout(() => connectToMeter(meter), 5000);
      }
      
      return false;
    }
  }, [user, session, fetchRealEnergyData, toast]);

  // Initial data loading with proper authentication check
  useEffect(() => {
    if (!user || !session || isInitialized.current) {
      if (!user || !session) {
        setLoading(false);
        setError('Please log in to view energy data');
      }
      return;
    }
    
    const initializeData = async () => {
      try {
        isInitialized.current = true;
        
        // First fetch profile to determine if we have a meter set up
        const profile = await fetchProfileData();
        
        // If we have a meter number, connect to the real meter
        if (profile?.meter_number) {
          meterNumber.current = profile.meter_number;
          setHasMeterConnected(true);
          await fetchRealEnergyData();
        } else {
          // No meter set up, show message
          setLoading(false);
          setError('No meter connected. Please set up your smart meter first.');
        }
      } catch (error) {
        console.error('Error in initial data loading:', error);
        setLoading(false);
        setError('Failed to initialize energy data');
      }
    };
    
    // Initialize with a slight delay to prevent race conditions with auth
    const initTimer = setTimeout(() => {
      initializeData();
    }, 1000);
    
    return () => clearTimeout(initTimer);
  }, [user, session, fetchProfileData, fetchRealEnergyData]);

  // Set up real-time data subscription and periodic refresh with proper authentication
  useEffect(() => {
    if (!user || !session || !hasMeterConnected || !meterNumber.current) return;
    
    // Set up a periodic refresh (every 5 minutes)
    const refreshInterval = setInterval(async () => {
      try {
        await refreshData();
      } catch (error) {
        console.error('Error refreshing data:', error);
      }
    }, 5 * 60 * 1000);
    
    // Set up real-time data subscriptions
    let readingsSubscription: ReturnType<typeof supabase.channel> | null = null;
    let meterSubscription: ReturnType<typeof supabase.channel> | null = null;
    
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
            // Process the validated reading
            processNewReading(payload.new);
          } else {
            console.warn('Invalid energy reading received from subscription:', payload.new);
          }
        })
        .subscribe();
        
      // Subscribe to meter status changes
      meterSubscription = supabase
        .channel('meter_status_changes')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`
        }, (payload) => {
          console.log('Meter status changed:', payload);
          
          // If meter number changed, reconnect to the new meter
          if (payload.new && 
              typeof payload.new === 'object' && 
              'meter_number' in payload.new && 
              payload.new.meter_number && 
              payload.new.meter_number !== meterNumber.current) {
            connectToMeter(payload.new.meter_number as string);
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
      
      if (meterSubscription) {
        try {
          supabase.removeChannel(meterSubscription);
        } catch (error) {
          console.error('Error removing meter subscription:', error);
        }
      }
    };
  }, [user, session, hasMeterConnected, refreshData, connectToMeter, processNewReading]);

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
    recordRealReading,
    connectToMeter,
    meterNumber: meterNumber.current
  };
};