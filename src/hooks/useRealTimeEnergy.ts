import { useState, useEffect, useCallback } from 'react';
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
  const { user } = useAuth();
  const { toast } = useToast();

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

    // Simulate device breakdown (in real app, this would come from smart meter data)
    const deviceBreakdown = [
      { device: 'HVAC', percentage: 35, cost: energyData.daily_cost * 0.35 },
      { device: 'Lighting', percentage: 25, cost: energyData.daily_cost * 0.25 },
      { device: 'Appliances', percentage: 20, cost: energyData.daily_cost * 0.20 },
      { device: 'Electronics', percentage: 20, cost: energyData.daily_cost * 0.20 }
    ];

    setAnalytics({
      hourlyPattern,
      weeklyTrend,
      monthlyComparison: [], // Would be calculated from historical data
      deviceBreakdown,
      peakHours
    });
  }, [energyData.daily_cost]);

  const fetchLatestData = async () => {
    if (!user) return;

    try {
      // Fetch summary data via RPC
      const { data: summaryData, error: summaryError } = await supabase
        .rpc('get_latest_energy_data', { p_user_id: user.id });

      if (summaryError) {
        console.error('Summary fetch error:', summaryError);
      } else if (summaryData?.[0]) {
        const baseData = summaryData[0];
        
        // Calculate additional analytics
        const { data: weeklyData } = await supabase
          .from('energy_readings')
          .select('kwh_consumed, total_cost')
          .eq('user_id', user.id)
          .gte('reading_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

        const { data: monthlyData } = await supabase
          .from('energy_readings')
          .select('kwh_consumed, total_cost')
          .eq('user_id', user.id)
          .gte('reading_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

        const weeklyAverage = weeklyData?.reduce((sum, r) => sum + r.kwh_consumed, 0) / 7 || 0;
        const monthlyTotal = monthlyData?.reduce((sum, r) => sum + r.kwh_consumed, 0) || 0;
        
        // Determine cost trend
        const recentCosts = weeklyData?.slice(-3).map(r => r.total_cost) || [];
        const costTrend = recentCosts.length >= 2 
          ? recentCosts[recentCosts.length - 1] > recentCosts[0] ? 'up' : 'down'
          : 'stable';

        setEnergyData({
          ...baseData,
          weekly_average: weeklyAverage,
          monthly_total: monthlyTotal,
          peak_usage_time: '18:00', // Would be calculated from hourly data
          cost_trend: costTrend
        });
      }

      // Fetch readings directly from Supabase
      const { data: readingsData, error: readingsError } = await supabase
        .from('energy_readings')
        .select('*')
        .eq('user_id', user.id)
        .order('reading_date', { ascending: false })
        .limit(168); // 1 week of hourly data

      if (readingsError) {
        throw new Error(readingsError.message);
      }

      const readings = readingsData || [];
      setRecentReadings(readings);
      calculateAnalytics(readings);
    } catch (error) {
      console.error('Fetch error:', error);
      toast({
        title: 'Error loading readings',
        description: (error as Error).message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const simulateReading = async () => {
    if (!user) return;

    try {
      // Simulate realistic energy reading
      const baseUsage = 2 + Math.random() * 3; // 2-5 kWh
      const timeOfDay = new Date().getHours();
      const peakMultiplier = (timeOfDay >= 17 && timeOfDay <= 21) ? 1.5 : 1;
      const usage = baseUsage * peakMultiplier;

      const { error } = await supabase.rpc('insert_energy_reading', {
        p_user_id: user.id,
        p_meter_number: 'METER001',
        p_kwh_consumed: usage,
        p_cost_per_kwh: 25.0
      });

      if (error) throw error;

      toast({
        title: 'Reading Simulated',
        description: `Generated ${usage.toFixed(2)} kWh reading`,
      });
      
      // Refresh data after simulation
      fetchLatestData();
    } catch (error) {
      console.error('Simulation error:', error);
      toast({
        title: 'Simulation failed',
        description: (error as Error).message,
        variant: 'destructive'
      });
    }
  };

  useEffect(() => {
    if (!user) return;

    fetchLatestData();

    // Set up real-time listener
    const channel = supabase
      .channel('energy-readings-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'energy_readings',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const newReading = payload.new as EnergyReading;
          setRecentReadings(prev => [newReading, ...prev.slice(0, 167)]);
          fetchLatestData(); // Refresh summary

          toast({
            title: 'New Energy Reading',
            description: `${newReading.kwh_consumed.toFixed(2)} kWh consumed`,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, toast, calculateAnalytics]);

  return {
    energyData,
    recentReadings,
    analytics,
    loading,
    refreshData: fetchLatestData,
    simulateReading
  };
};
