import React, { useEffect, useState } from 'react';
import { useRealTimeEnergy } from '@/hooks/useRealTimeEnergy';
import { useMeter } from '@/contexts/MeterContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const TestRealTime = () => {
  const { status: meterStatus, meterNumber } = useMeter();
  const { 
    energyData, 
    recentReadings, 
    loading, 
    error, 
    refreshData, 
    getNewReading,
    hasMeterConnected 
  } = useRealTimeEnergy('KPLC');
  
  const [subscriptionStatus, setSubscriptionStatus] = useState<string>('Unknown');
  const [lastUpdate, setLastUpdate] = useState<string>('Never');

  // Log updates for debugging
  useEffect(() => {
    console.log('Energy data updated:', energyData);
    console.log('Recent readings updated:', recentReadings);
    if (recentReadings.length > 0) {
      setLastUpdate(new Date().toLocaleTimeString());
    }
  }, [energyData, recentReadings]);

  // Test function to simulate a new reading
  const simulateNewReading = async () => {
    try {
      await getNewReading();
    } catch (err) {
      console.error('Error getting new reading:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-aurora-green-light">Real-Time Energy Test</h1>
        
        {/* Connection Status */}
        <Card className="bg-slate-800/50 border-aurora-green/20">
          <CardHeader>
            <CardTitle className="text-aurora-green-light">Connection Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-gray-300">Meter Status:</span>
              <span className={meterStatus === 'connected' ? 'text-green-400' : 'text-red-400'}>
                {meterStatus}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">Meter Number:</span>
              <span className="text-aurora-green-light">{meterNumber || 'None'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">Subscription Status:</span>
              <span className="text-aurora-green-light">{subscriptionStatus}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">Last Update:</span>
              <span className="text-aurora-green-light">{lastUpdate}</span>
            </div>
          </CardContent>
        </Card>

        {/* Current Energy Data */}
        <Card className="bg-slate-800/50 border-aurora-green/20">
          <CardHeader>
            <CardTitle className="text-aurora-green-light">Current Energy Data</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading ? (
              <p className="text-gray-400">Loading...</p>
            ) : error ? (
              <p className="text-red-400">Error: {error}</p>
            ) : (
              <>
                <div className="flex justify-between">
                  <span className="text-gray-300">Current Usage:</span>
                  <span className="text-aurora-green-light">{energyData.current_usage.toFixed(2)} kWh</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Daily Total:</span>
                  <span className="text-aurora-green-light">{energyData.daily_total.toFixed(2)} kWh</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Daily Cost:</span>
                  <span className="text-aurora-green-light">KSh {energyData.daily_cost.toFixed(2)}</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Recent Readings */}
        <Card className="bg-slate-800/50 border-aurora-green/20">
          <CardHeader>
            <CardTitle className="text-aurora-green-light">Recent Readings ({recentReadings.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {recentReadings.length === 0 ? (
              <p className="text-gray-400">No readings available</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {recentReadings.slice(0, 10).map((reading) => (
                  <div key={reading.id} className="flex justify-between text-sm p-2 bg-slate-700/50 rounded">
                    <span>{(() => {
                      try {
                        if (!reading.reading_date) return 'Unknown time';
                        const date = new Date(reading.reading_date);
                        return isNaN(date.getTime()) ? 'Unknown time' : date.toLocaleTimeString();
                      } catch (error) {
                        return 'Unknown time';
                      }
                    })()}</span>
                    <span className="text-aurora-green-light">{reading.kwh_consumed.toFixed(2)} kWh</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Test Controls */}
        <div className="flex flex-wrap gap-4">
          <Button 
            onClick={refreshData} 
            disabled={loading || !hasMeterConnected}
            className="bg-aurora-green hover:bg-aurora-green/80"
          >
            Refresh Data
          </Button>
          <Button 
            onClick={simulateNewReading} 
            disabled={loading || !hasMeterConnected}
            className="bg-aurora-blue hover:bg-aurora-blue/80"
          >
            Get New Reading
          </Button>
        </div>

        {/* Instructions */}
        <Card className="bg-slate-800/50 border-yellow-500/20">
          <CardHeader>
            <CardTitle className="text-yellow-500">Test Instructions</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-gray-300 space-y-2">
            <p>1. Make sure your smart meter or inverter is properly connected</p>
            <p>2. Send a test reading from your smart meter simulator</p>
            <p>3. Watch this page for real-time updates</p>
            <p>4. If you don't see updates, check the browser console for errors</p>
            <p>5. Use "Get New Reading" to simulate a reading if you don't have a physical device</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TestRealTime;