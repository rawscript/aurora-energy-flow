import * as React from 'react';
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useEnergyProvider } from './EnergyProviderContext';
import { supabase } from '../integrations/supabase/client';

// Meter connection status types
type MeterConnectionStatus = 'checking' | 'connected' | 'disconnected' | 'error';

// Meter device types based on energy provider
type MeterDeviceType = 'smart_meter' | 'solar_inverter' | 'unknown';

interface MeterContextType {
  status: MeterConnectionStatus;
  deviceType: MeterDeviceType;
  meterNumber: string | null;
  lastChecked: Date | null;
  error: string | null;
  checkConnection: () => Promise<void>;
  connectMeter: (meterNumber: string) => Promise<boolean>;
  disconnectMeter: () => Promise<void>;
  refreshConnection: () => Promise<void>;
}

const MeterContext = createContext<MeterContextType | undefined>(undefined);

interface MeterProviderProps {
  children: ReactNode;
}

export const MeterProvider: React.FC<MeterProviderProps> = ({ children }) => {
  const [status, setStatus] = useState<MeterConnectionStatus>('checking');
  const [deviceType, setDeviceType] = useState<MeterDeviceType>('unknown');
  const [meterNumber, setMeterNumber] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { provider, providerConfig } = useEnergyProvider();

  // Determine device type based on energy provider
  useEffect(() => {
    if (provider) {
      const device = providerConfig.terminology.device === 'meter' ? 'smart_meter' : 'solar_inverter';
      setDeviceType(device);
    } else {
      setDeviceType('unknown');
    }
  }, [provider, providerConfig]);

  // Check if user has a meter connected
  const checkConnection = useCallback(async () => {
    // If no user, we can immediately set to disconnected
    if (!user) {
      setStatus('disconnected');
      setMeterNumber(null);
      setLastChecked(new Date());
      return;
    }

    setStatus('checking');
    setError(null);

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('meter_number')
        .eq('id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking meter connection:', error);
        setStatus('error');
        setError('Failed to check meter connection');
      } else if (data?.meter_number) {
        setStatus('connected');
        setMeterNumber(data.meter_number);
      } else {
        setStatus('disconnected');
        setMeterNumber(null);
      }
    } catch (err) {
      console.error('Exception checking meter connection:', err);
      setStatus('error');
      setError('Failed to check meter connection');
    } finally {
      setLastChecked(new Date());
    }
  }, [user]);

  // Connect a meter
  const connectMeter = useCallback(async (newMeterNumber: string): Promise<boolean> => {
    if (!user) {
      setError('User not authenticated');
      return false;
    }

    setStatus('checking');
    setError(null);

    try {
      // Update profile with new meter number
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          meter_number: newMeterNumber,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (updateError) {
        console.error('Error connecting meter:', updateError);
        setError('Failed to connect meter');
        setStatus('error');
        return false;
      }

      // Update state
      setStatus('connected');
      setMeterNumber(newMeterNumber);
      setLastChecked(new Date());
      
      // Dispatch custom event for components that need to react
      window.dispatchEvent(new CustomEvent('meterConnected', { 
        detail: { meterNumber: newMeterNumber, deviceType }
      }));

      return true;
    } catch (err) {
      console.error('Exception connecting meter:', err);
      setError('Failed to connect meter');
      setStatus('error');
      return false;
    }
  }, [user, deviceType]);

  // Disconnect meter
  const disconnectMeter = useCallback(async () => {
    if (!user) return;

    try {
      // Clear meter number from profile
      const { error } = await supabase
        .from('profiles')
        .update({ 
          meter_number: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) {
        console.error('Error disconnecting meter:', error);
        setError('Failed to disconnect meter');
        return;
      }

      // Update state
      setStatus('disconnected');
      setMeterNumber(null);
      setLastChecked(new Date());
      
      // Dispatch custom event
      window.dispatchEvent(new CustomEvent('meterDisconnected'));
    } catch (err) {
      console.error('Exception disconnecting meter:', err);
      setError('Failed to disconnect meter');
    }
  }, [user]);

  // Refresh connection status
  const refreshConnection = useCallback(async () => {
    await checkConnection();
  }, [checkConnection]);

  // Initialize connection check when user changes, but preserve connection state
  useEffect(() => {
    if (user && status === 'checking') {
      checkConnection();
    }
  }, [user, checkConnection]);

  // Periodic connection health check (every 30 seconds) but don't reset connected state
  useEffect(() => {
    if (!user || status !== 'connected') return;
    
    const interval = setInterval(() => {
      // Only refresh if we don't have a recent check
      if (lastChecked && (Date.now() - lastChecked.getTime()) > 30000) {
        checkConnection();
      }
    }, 30000);
    
    return () => clearInterval(interval);
  }, [user, status, lastChecked, checkConnection]);

  const contextValue: MeterContextType = {
    status,
    deviceType,
    meterNumber,
    lastChecked,
    error,
    checkConnection,
    connectMeter,
    disconnectMeter,
    refreshConnection
  };

  return (
    <MeterContext.Provider value={contextValue}>
      {children}
    </MeterContext.Provider>
  );
};

export const useMeter = (): MeterContextType => {
  const context = useContext(MeterContext);
  if (context === undefined) {
    throw new Error('useMeter must be used within a MeterProvider');
  }
  return context;
};