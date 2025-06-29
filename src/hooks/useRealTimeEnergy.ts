
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface EnergyData {
  current_usage: number;
  daily_total: number;
  daily_cost: number;
  efficiency_score: number;
}

interface EnergyReading {
  id: string;
  user_id: string;
  meter_number: string;
  kwh_consumed: number;
  total_cost: number;
  reading_date: string;
  cost_per_kwh: number;
}

export const useRealTimeEnergy = () => {
  const [energyData, setEnergyData] = useState<EnergyData>({
    current_usage: 0,
    daily_total: 0,
    daily_cost: 0,
    efficiency_score: 87
  });
  const [recentReadings, setRecentReadings] = useState<EnergyReading[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchLatestData = async () => {
    if (!user) return;

    try {
      // Get latest energy data summary
      const { data: summaryData, error: summaryError } = await supabase
        .rpc('get_latest_energy_data', { p_user_id: user.id });

      if (summaryError) {
        console.error('Error fetching energy summary:', summaryError);
        return;
      }

      if (summaryData && summaryData.length > 0) {
        setEnergyData(summaryData[0]);
      }

      // Get recent readings for charts
      const { data: readingsData, error: readingsError } = await supabase
        .from('energy_readings')
        .select('*')
        .eq('user_id', user.id)
        .order('reading_date', { ascending: false })
        .limit(24); // Last 24 readings

      if (readingsError) {
        console.error('Error fetching readings:', readingsError);
        return;
      }

      setRecentReadings(readingsData || []);
    } catch (error) {
      console.error('Error in fetchLatestData:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;

    fetchLatestData();

    // Set up real-time subscription
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
          console.log('New energy reading:', payload);
          
          // Update recent readings
          setRecentReadings(prev => [payload.new as EnergyReading, ...prev.slice(0, 23)]);
          
          // Refresh summary data
          fetchLatestData();
          
          // Show toast notification
          toast({
            title: "New Energy Reading",
            description: `${(payload.new as EnergyReading).kwh_consumed.toFixed(2)} kWh consumed`,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, toast]);

  const simulateReading = async () => {
    if (!user) return;

    try {
      const response = await fetch(
        `https://cjdvaksjtpxyulxzttmr.supabase.co/functions/v1/smart-meter-webhook?user_id=${user.id}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${supabase.supabaseKey}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to simulate reading');
      }

      const result = await response.json();
      console.log('Simulated reading result:', result);
    } catch (error) {
      console.error('Error simulating reading:', error);
      toast({
        title: "Error",
        description: "Failed to simulate smart meter reading",
        variant: "destructive"
      });
    }
  };

  return {
    energyData,
    recentReadings,
    loading,
    simulateReading,
    refreshData: fetchLatestData
  };
};
