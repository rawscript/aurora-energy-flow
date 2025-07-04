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
      // Fetch summary data via RPC
      const { data: summaryData, error: summaryError } = await supabase
        .rpc('get_latest_energy_data', { p_user_id: user.id });

      if (summaryError) {
        console.error('Summary fetch error:', summaryError);
      } else if (summaryData?.[0]) {
        setEnergyData(summaryData[0]);
      }

      // Fetch readings directly from Supabase
      const { data: readingsData, error: readingsError } = await supabase
        .from('energy_readings')
        .select('*')
        .eq('user_id', user.id)
        .order('reading_date', { ascending: false })
        .limit(24);

      if (readingsError) {
        throw new Error(readingsError.message);
      }

      setRecentReadings(readingsData || []);
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
          setRecentReadings(prev => [newReading, ...prev.slice(0, 23)]);
          fetchLatestData(); // optionally refresh summary

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
  }, [user, toast]);

  return {
    energyData,
    recentReadings,
    loading,
    refreshData: fetchLatestData
  };
};
