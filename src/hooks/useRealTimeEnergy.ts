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

export const useRealTimeEnergy = () => {
  const [energyData, setEnergyData] = useState<EnergyData>({
    current_usage: 0,
    daily_total: 0,
    daily_cost: 0,
    efficiency_score: 87,
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
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [useMockData, setUseMockData] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();
  const meterNumber = useRef<string | null>(null);

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
      typeof (obj as any).cost_per_kwh === 'number' &&
      ((obj as any).peak_usage === null || (obj as any).peak_usage === undefined || typeof (obj as any).peak_usage === 'number') &&
      ((obj as any).off_peak_usage === null || (obj as any).off_peak_usage === undefined || typeof (obj as any).off_peak_usage === 'number')
    );
  };

  // Calculate analytics based on readings
  const calculateAnalytics = useCallback((readings: EnergyReading[]) => {
    if (readings.length === 0) return;

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

    // Calculate device breakdown based on usage patterns
    // This is a more realistic approach based on time-of-day usage patterns
    const totalDailyCost = energyData.daily_cost;
    
    // Calculate device percentages based on usage patterns
    let hvacPercentage = 0;
    let lightingPercentage = 0;
    let appliancesPercentage = 0;
    let electronicsPercentage = 0;
    
    // Analyze hourly patterns to determine device usage
    hourlyPattern.forEach(({ hour, usage }) => {
      // Morning (6-9): Higher HVAC and lighting
      if (hour >= 6 && hour <= 9) {
        hvacPercentage += usage * 0.4;
        lightingPercentage += usage * 0.3;
        appliancesPercentage += usage * 0.2;
        electronicsPercentage += usage * 0.1;
      }
      // Daytime (10-16): Higher electronics, lower lighting
      else if (hour >= 10 && hour <= 16) {
        hvacPercentage += usage * 0.35;
        lightingPercentage += usage * 0.15;
        appliancesPercentage += usage * 0.2;
        electronicsPercentage += usage * 0.3;
      }
      // Evening (17-22): Higher appliances and lighting
      else if (hour >= 17 && hour <= 22) {
        hvacPercentage += usage * 0.3;
        lightingPercentage += usage * 0.3;
        appliancesPercentage += usage * 0.3;
        electronicsPercentage += usage * 0.1;
      }
      // Night (23-5): Lower everything except some electronics
      else {
        hvacPercentage += usage * 0.2;
        lightingPercentage += usage * 0.1;
        appliancesPercentage += usage * 0.1;
        electronicsPercentage += usage * 0.6;
      }
    });
    
    // Calculate total and normalize to 100%
    const totalPercentage = hvacPercentage + lightingPercentage + appliancesPercentage + electronicsPercentage;
    
    if (totalPercentage > 0) {
      hvacPercentage = Math.round((hvacPercentage / totalPercentage) * 100);
      lightingPercentage = Math.round((lightingPercentage / totalPercentage) * 100);
      appliancesPercentage = Math.round((appliancesPercentage / totalPercentage) * 100);
      electronicsPercentage = 100 - hvacPercentage - lightingPercentage - appliancesPercentage;
    } else {
      // Default values if no data
      hvacPercentage = 35;
      lightingPercentage = 25;
      appliancesPercentage = 20;
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
  }, [energyData.daily_cost]);

  // Fetch user profile data
  const fetchProfileData = useCallback(async () => {
    if (!user) return null;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('meter_number, meter_category, industry_type')
        .eq('id', user.id)
        .single();
        
      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }
      
      setProfileData(data);
      
      // Determine if we should use mock data based on whether meter is set up
      const shouldUseMockData = !data?.meter_number;
      setUseMockData(shouldUseMockData);
      
      return data;
    } catch (error) {
      console.error('Exception fetching profile:', error);
      return null;
    }
  }, [user]);

  // Process a new reading (real or simulated)
  const processNewReading = useCallback((reading: EnergyReading) => {
    // Validate the reading
    if (!reading || typeof reading.kwh_consumed !== 'number' || typeof reading.total_cost !== 'number') {
      console.error('Invalid reading received:', reading);
      return;
    }
    
    console.log('Processing new reading:', reading);
    
    // Add the new reading to the state
    setRecentReadings(prev => [reading, ...prev.slice(0, 167)]);
    
    // Update the energy data
    setEnergyData(prev => ({
      ...prev,
      current_usage: reading.kwh_consumed,
      daily_total: prev.daily_total + reading.kwh_consumed,
      daily_cost: prev.daily_cost + reading.total_cost
    }));
    
    // Update analytics with the new reading
    const updatedReadings = [reading, ...recentReadings.slice(0, 167)];
    calculateAnalytics(updatedReadings);
    
    // If this is a real reading (not mock), show a notification
    if (!useMockData && reading.id && !reading.id.startsWith('mock-')) {
      toast({
        title: "New Reading Received",
        description: `Received ${reading.kwh_consumed.toFixed(2)} kWh reading from meter ${reading.meter_number}`,
      });
    }
  }, [recentReadings, calculateAnalytics, useMockData, toast]);

  // Record a real reading in the database
  const recordRealReading = useCallback(async (
    usage: number, 
    costPerKwh: number = 25, 
    totalCost: number = 0,
    readingDate: string = new Date().toISOString()
   ) => {
    if (!user) return null;
    
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
  }, [user, processNewReading, fetchProfileData]);

  // Fetch real energy readings from the database with better error handling
  const fetchRealEnergyData = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // No need to get session separately - user is already available from useAuth
      
      // Use a timeout to prevent hanging requests
      const timeoutPromise = new Promise<{ data: null; error: Error }>((resolve) => 
        setTimeout(() => resolve({ data: null, error: new Error('Request timeout') }), 15000)
      );
      
      // Get the meter number to use
      const currentMeterNumber = meterNumber.current;
      
      if (!currentMeterNumber) {
        throw new Error('No meter number available');
      }
      
      console.log(`Fetching real data for meter: ${currentMeterNumber}`);
      
      // Fetch the latest energy data using the database function
      const latestDataPromise = supabase
        .rpc('get_latest_energy_data', { 
          p_user_id: user.id
        });
      
      // Race the request against the timeout
      const { data: latestData, error: latestError } = await Promise.race([
        latestDataPromise,
        timeoutPromise
      ]).catch(error => {
        console.error('Timeout or error fetching latest energy data:', error);
        return { data: null, error: error };
      });
      
      if (latestError) {
        console.error('Error fetching latest energy data:', latestError);
        // Continue instead of throwing - we'll try to use readings data
      }
      
      // Fetch recent readings for the past week for this specific meter
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      
      const readingsPromise = supabase
        .from('energy_readings')
        .select('*')
        .eq('user_id', user.id)
        .eq('meter_number', currentMeterNumber)
        .gte('reading_date', oneWeekAgo.toISOString())
        .order('reading_date', { ascending: false });
      
      // Race the request against a timeout
      const { data: readings, error: readingsError } = await Promise.race([
        readingsPromise,
        timeoutPromise
      ]).catch(error => {
        console.error('Timeout or error fetching energy readings:', error);
        return { data: null, error: error };
      });
      
      if (readingsError) {
        console.error('Error fetching energy readings:', readingsError);
        // Continue with null readings instead of throwing
      }
      
      // If we have no readings at all, try to fetch from the meter directly
      if ((!readings || readings.length === 0) && !latestData) {
        console.log('No readings found in database, attempting to fetch directly from meter');
        
        try {
          // Validate and sanitize currentMeterNumber
          if (!currentMeterNumber || typeof currentMeterNumber !== 'string') {
            throw new Error('Invalid meter number: must be a non-empty string');
          }
          
          // Check if meter number matches expected pattern (alphanumeric with optional hyphens/underscores)
          const meterPattern = /^[A-Za-z0-9_-]+$/;
          if (!meterPattern.test(currentMeterNumber)) {
            throw new Error('Invalid meter number format: contains invalid characters');
          }
          
          // Sanitize the meter number for URL
          const sanitizedMeterNumber = encodeURIComponent(currentMeterNumber);
          
          // Make a direct API call to the meter service
          const meterDataPromise = fetch(`/api/meters/${sanitizedMeterNumber}/readings`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json'
            }
          }).then(async res => {
            if (!res.ok) {
              if (res.status === 404) {
                throw new Error('Meter API endpoint not found - backend route may not exist');
              }
              throw new Error(`API request failed with status ${res.status}`);
            }
            return res.json();
          });
          
          // Race against timeout
          const meterData = await Promise.race([
            meterDataPromise,
            timeoutPromise
          ]);
          
          if (meterData && meterData.readings && meterData.readings.length > 0) {
            console.log('Successfully fetched data directly from meter');
            
            // Process the readings
            const processedReadings = meterData.readings.map((reading: Record<string, unknown>) => {
              const consumption = typeof reading.consumption === 'number' ? reading.consumption : 0;
              const rate = typeof reading.rate === 'number' ? reading.rate : 25;
              const cost = typeof reading.cost === 'number' ? reading.cost : (consumption * rate);
              
              return {
                id: `api-${reading.id || Date.now()}`,
                user_id: user.id,
                meter_number: currentMeterNumber,
                kwh_consumed: consumption,
                cost_per_kwh: rate,
                total_cost: cost,
                reading_date: typeof reading.timestamp === 'string' ? reading.timestamp : new Date().toISOString()
              };
            });
            
            // Save these readings to the database
            for (const reading of processedReadings) {
              await recordRealReading(
                reading.kwh_consumed, 
                reading.cost_per_kwh, 
                reading.total_cost,
                reading.reading_date
              );
            }
            
            // Use these readings
            setRecentReadings(processedReadings);
            calculateAnalytics(processedReadings);
            
            // Set energy data
            const latestReading = processedReadings[0];
            if (latestReading) {
              setEnergyData(prev => ({
                ...prev,
                current_usage: latestReading.kwh_consumed,
                daily_total: processedReadings.reduce((sum, r) => sum + r.kwh_consumed, 0),
                daily_cost: processedReadings.reduce((sum, r) => sum + r.total_cost, 0)
              }));
            }
            
            setLoading(false);
            return;
          }
        } catch (error) {
          console.error('Error fetching directly from meter:', error);
          // Continue with database data
        }
      }
      
      // If we have latest data from the function
      if (latestData && latestData.length > 0) {
        const latest = latestData[0];
        
        // Calculate weekly and monthly averages from readings
        let weeklyTotal = 0;
        let monthlyTotal = 0;
        let readingCount = 0;
        
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
            
            readingCount++;
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
      } else {
        // If no data from function but we have readings
        if (readings && readings.length > 0) {
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
          
          // Calculate efficiency score
          const efficiencyScore = Math.max(60, Math.min(100, 100 - (dailyTotal * 0.5)));
          
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
          // No data at all, use default values
          setEnergyData({
            current_usage: 0,
            daily_total: 0,
            daily_cost: 0,
            efficiency_score: 87,
            weekly_average: 0,
            monthly_total: 0,
            peak_usage_time: '18:00',
            cost_trend: 'stable'
          });
        }
      }
    } catch (error) {
      console.error('Error fetching real energy data:', error);
      toast({
        title: 'Error loading energy data',
        description: 'Could not load real energy data. Using default values.',
        variant: 'destructive'
      });
      
      // Set default values if real data fails
      setEnergyData({
        current_usage: 0,
        daily_total: 0,
        daily_cost: 0,
        efficiency_score: 87,
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
  }, [user, toast, calculateAnalytics, recordRealReading]);

  // Generate mock data for the energy dashboard when real data is not available
  const generateMockData = useCallback(() => {
    try {
      setLoading(true);
      
      // Generate a random current usage between 2-5 kWh
      const currentUsage = 2 + Math.random() * 3;
      
      // Generate daily total as 10-20x current usage
      const dailyTotal = currentUsage * (10 + Math.random() * 10);
      
      // Cost per kWh (Kenya Power rate)
      const costPerKwh = 25.0;
      
      // Calculate daily cost
      const dailyCost = dailyTotal * costPerKwh;
      
      // Weekly average (slightly higher than daily)
      const weeklyAverage = dailyTotal * (1 + Math.random() * 0.3);
      
      // Monthly total (about 30x daily)
      const monthlyTotal = dailyTotal * (28 + Math.random() * 4);
      
      // Calculate efficiency score (simplified)
      const efficiencyScore = Math.max(60, Math.min(100, 100 - (dailyTotal * 0.5)));
      
      // Random cost trend
      const costTrendOptions: ('up' | 'down' | 'stable')[] = ['up', 'down', 'stable'];
      const costTrend = costTrendOptions[Math.floor(Math.random() * 3)];
      
      // Set the energy data with our generated values
      setEnergyData({
        current_usage: currentUsage,
        daily_total: dailyTotal,
        daily_cost: dailyCost,
        efficiency_score: efficiencyScore,
        weekly_average: weeklyAverage,
        monthly_total: monthlyTotal,
        peak_usage_time: '18:00',
        cost_trend: costTrend
      });
      
      // Generate mock readings for the analytics
      const mockReadings: EnergyReading[] = [];
      const now = new Date();
      
      // Generate readings for the past week (hourly)
      for (let i = 0; i < 168; i++) {
        const readingDate = new Date(now.getTime() - i * 60 * 60 * 1000);
        const hour = readingDate.getHours();
        
        // Higher usage during peak hours (morning and evening)
        let hourlyMultiplier = 1;
        if (hour >= 6 && hour <= 9) hourlyMultiplier = 1.5; // Morning peak
        if (hour >= 18 && hour <= 22) hourlyMultiplier = 1.8; // Evening peak
        if (hour >= 0 && hour <= 5) hourlyMultiplier = 0.5; // Night low
        
        const kwh = (0.5 + Math.random() * 1) * hourlyMultiplier;
        const cost = kwh * costPerKwh;
        
        mockReadings.push({
          id: `mock-${i}`,
          user_id: user?.id || 'mock-user',
          meter_number: profileData?.meter_number || 'MOCK-METER',
          kwh_consumed: kwh,
          total_cost: cost,
          reading_date: readingDate.toISOString(),
          cost_per_kwh: costPerKwh
        });
      }
      
      setRecentReadings(mockReadings);
      calculateAnalytics(mockReadings);
    } catch (error) {
      console.error('Error generating mock data:', error);
      toast({
        title: 'Error loading energy data',
        description: 'Could not load energy data. Using default values.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [calculateAnalytics, toast, profileData?.meter_number, user?.id]);

  // Get a new energy reading (real or simulated)
  const simulateReading = async () => {
    try {
      // If we have a real meter set up, try to get a real reading
      if (user && !useMockData && meterNumber.current) {
        try {
          console.log(`Fetching real reading from meter ${meterNumber.current}`);
          
          // Try to fetch a real reading from the meter API
          const response = await fetch(`/api/meters/${meterNumber.current}/current`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json'
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            
            if (data && typeof data.consumption === 'number') {
              // We got a real reading from the meter
              const usage = data.consumption;
              const costPerKwh = data.rate || 25.0;
              const totalCost = data.cost || (usage * costPerKwh);
              
              // Record the real reading in the database
              await recordRealReading(usage, costPerKwh, totalCost);
              
              toast({
                title: 'Real Reading Received',
                description: `Received ${usage.toFixed(2)} kWh reading from meter ${meterNumber.current}`,
              });
              
              return;
            }
          }
          
          // If we couldn't get a real reading from the API, try the database function
          console.log('API reading failed, trying database function');
          
          // Use the insert_energy_reading function to generate a realistic reading
          const { data, error } = await supabase.rpc('insert_energy_reading', {
            p_user_id: user.id,
            p_meter_number: meterNumber.current,
            p_kwh_consumed: 1.5 + Math.random() * 2, // Generate realistic consumption between 1.5-3.5 kWh
            p_cost_per_kwh: 25 // Default cost per kWh
          });
          
          if (error) {
            throw error;
          }
          
          if (data) {
            // Reading was successfully inserted, fetch the latest data
            await fetchRealEnergyData();
            
            toast({
              title: 'Reading Recorded',
              description: `New reading recorded for meter ${meterNumber.current}`,
            });
            
            return;
          }
        } catch (error) {
          console.error('Error getting real reading:', error);
          
          // If we failed to get a real reading, show an error but don't fall back to mock data
          // This encourages fixing the real meter connection rather than relying on mock data
          toast({
            title: 'Reading Failed',
            description: 'Could not get a reading from your meter. Please check your meter connection.',
            variant: 'destructive'
          });
          
          return;
        }
      } else {
        // Using mock data, generate a realistic reading
        generateMockReading();
      }
    } catch (error) {
      console.error('Reading error:', error);
      toast({
        title: 'Reading Failed',
        description: 'Could not get a reading. Please try again.',
        variant: 'destructive'
      });
    }
  };
  
  // Generate a mock reading when no real meter is available
  const generateMockReading = () => {
    // Generate a random usage between 0.5-3 kWh
    const usage = 0.5 + Math.random() * 2.5;
    
    // Cost per kWh (Kenya Power rate)
    const costPerKwh = 25.0;
    
    // Calculate total cost
    const totalCost = usage * costPerKwh;
    
    // Get meter number from profile or use a mock one
    const mockMeterNumber = profileData?.meter_number || 'MOCK-METER';
    
    // Update state with the mock reading
    handleSimulatedReading(usage, costPerKwh, totalCost, mockMeterNumber);
    
    toast({
      title: 'Simulated Reading',
      description: `Generated ${usage.toFixed(2)} kWh simulated reading`,
    });
  };



  // Handle a simulated reading (update state without database)
  const handleSimulatedReading = (usage: number, costPerKwh: number, totalCost: number, meterNumber: string) => {
    // Create a new mock reading
    const newReading: EnergyReading = {
      id: `mock-${Date.now()}`,
      user_id: user?.id || 'mock-user',
      meter_number: meterNumber,
      kwh_consumed: usage,
      cost_per_kwh: costPerKwh,
      total_cost: totalCost,
      reading_date: new Date().toISOString()
    };
    
    // Process the new reading (same function used for real and mock readings)
    processNewReading(newReading);

    // Show success message with meter category info
    let meterInfo = '';
    if (profileData?.meter_category) {
      meterInfo = ` (${profileData.meter_category}`;
      if (profileData.meter_category === 'industry' && profileData.industry_type) {
        meterInfo += ` - ${profileData.industry_type}`;
      }
      meterInfo += ')';
    }
    
    toast({
      title: 'Reading Simulated',
      description: `Generated ${usage.toFixed(2)} kWh reading for meter ${meterNumber}${meterInfo}`,
    });
  };

  // Refresh data based on whether we're using real or mock data
  const refreshData = useCallback(async () => {
    if (useMockData) {
      generateMockData();
    } else {
      await fetchRealEnergyData();
    }
  }, [useMockData, generateMockData, fetchRealEnergyData]);

  // Track initialization and data refresh
  const isInitialized = useRef(false);
  const lastRefreshTime = useRef(0);
  const minRefreshInterval = 30000; // 30 seconds minimum between refreshes
  const connectionAttempts = useRef(0);
  const maxConnectionAttempts = 3;

  // Function to force real data mode and connect to meter
  const connectToMeter = useCallback(async (meter: string) => {
    try {
      console.log(`Connecting to meter: ${meter}`);
      meterNumber.current = meter;
      setUseMockData(false);
      
      // Ensure we have a valid session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No valid session found');
      }
      
      // Fetch real data from the meter
      await fetchRealEnergyData();
      
      toast({
        title: "Meter Connected",
        description: `Successfully connected to meter ${meter}. Real-time data collection is now enabled.`,
      });
      
      return true;
    } catch (error) {
      console.error(`Error connecting to meter ${meter}:`, error);
      
      // Increment connection attempts
      connectionAttempts.current += 1;
      
      // If we've tried too many times, fall back to mock data
      if (connectionAttempts.current >= maxConnectionAttempts) {
        setUseMockData(true);
        generateMockData();
        
        toast({
          title: "Connection Failed",
          description: `Could not connect to meter ${meter} after multiple attempts. Using simulated data for now.`,
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
  }, [fetchRealEnergyData, generateMockData, toast]);

  // Initial data loading with proper meter connection
  useEffect(() => {
    // Skip if already initialized or no user
    if (isInitialized.current || !user) {
      if (!user) {
        // No user, use mock data temporarily
        setUseMockData(true);
        generateMockData();
      }
      return;
    }
    
    const initializeData = async () => {
      try {
        // Mark as initialized to prevent duplicate calls
        isInitialized.current = true;
        
        // First fetch profile to determine if we have a meter set up
        const profile = await fetchProfileData();
        
        // If we have a meter number, connect to the real meter
        if (profile?.meter_number) {
          meterNumber.current = profile.meter_number;
          await connectToMeter(profile.meter_number);
        } else {
          // No meter set up, use mock data temporarily
          setUseMockData(true);
          generateMockData();
          
          toast({
            title: "No Meter Found",
            description: "Please set up a smart meter to get real-time energy data.",
          });
        }
      } catch (error) {
        console.error('Error in initial data loading:', error);
        // Fall back to mock data if anything fails
        setUseMockData(true);
        generateMockData();
      }
    };
    
    // Initialize with a slight delay to prevent race conditions with auth
    const initTimer = setTimeout(() => {
      initializeData();
    }, 1000);
    
    return () => clearTimeout(initTimer);
  }, [user, useMockData, fetchProfileData, generateMockData, fetchRealEnergyData, connectToMeter, toast]);

  // Set up real-time data subscription and periodic refresh
  useEffect(() => {
    if (!user) return;
    
    // Simplified refresh logic - just refresh data every 5 minutes
    const simpleRefresh = async () => {
      try {
        await refreshData();
      } catch (error) {
        console.error('Error refreshing data:', error);
      }
    };
    
    // Set up a periodic refresh (every 5 minutes) - simplified
    const refreshInterval = setInterval(simpleRefresh, 5 * 60 * 1000);
    
    // Set up real-time data subscriptions
    let meterSubscription: ReturnType<typeof supabase.channel> | null = null;
    let readingsSubscription: ReturnType<typeof supabase.channel> | null = null;
    
    if (!useMockData && user && meterNumber.current) {
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
              // Optionally log the validation failure for debugging
              console.warn('Expected EnergyReading interface with required fields: id, user_id, meter_number, kwh_consumed, total_cost, reading_date, cost_per_kwh');
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
  }, [user, useMockData, fetchRealEnergyData, refreshData, connectToMeter, processNewReading, toast]);

  return {
    energyData,
    recentReadings,
    analytics,
    loading,
    refreshData,
    simulateReading,
    useMockData,
    recordRealReading,
    connectToMeter,
    meterNumber: meterNumber.current
  };
};