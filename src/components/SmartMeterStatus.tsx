import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff, Zap, Clock, AlertTriangle, Link, Sun } from 'lucide-react';
import { useRealTimeEnergy } from '@/hooks/useRealTimeEnergy';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useEnergyProvider } from '@/contexts/EnergyProviderContext';
import SolarPanel from '@/components/ui/SolarPanel';

interface SmartMeterStatusProps {
  onNavigateToMeter?: () => void;
}

const SmartMeterStatus = ({ onNavigateToMeter }: SmartMeterStatusProps) => {
  const { user } = useAuth();
  const { provider, providerConfig } = useEnergyProvider();
  const { recentReadings, hasMeterConnected, error, loading } = useRealTimeEnergy(provider || 'KPLC');
  
  const lastReading = recentReadings[0];
  const isConnected = hasMeterConnected && lastReading && (() => {
    try {
      if (!lastReading.reading_date) return false;
      const readingDate = new Date(lastReading.reading_date);
      if (isNaN(readingDate.getTime())) return false;
      return new Date().getTime() - readingDate.getTime() < 300000; // 5 minutes
    } catch (error) {
      return false;
    }
  })();

  const isSolarProvider = providerConfig.type === 'solar';
  const deviceLabel = isSolarProvider ? 'Inverter' : 'Meter';
  const connectionLabel = isSolarProvider ? 'Inverter' : 'Smart Meter';
  const statusTitle = isSolarProvider ? 'Solar Inverter Status' : 'Smart Meter Status';

  const handleSetupMeter = () => {
    if (onNavigateToMeter) {
      onNavigateToMeter();
    }
  };

  return (
    <Card className="overflow-hidden border-white/5 bg-white/5 backdrop-blur-md">
      <CardHeader className="pb-4 border-b border-white/5 bg-white/5">
        <CardTitle className="text-lg flex items-center space-x-3 text-white font-bold">
          <div className="p-2 rounded-xl bg-white/5 border border-white/10">
            {isConnected ? (
              isSolarProvider ? (
                <Sun className="h-5 w-5 text-aurora-green-light" />
              ) : (
                <Wifi className="h-5 w-5 text-aurora-green-light" />
              )
            ) : isSolarProvider ? (
              <AlertTriangle className="h-5 w-5 text-amber-400" />
            ) : (
              <WifiOff className="h-5 w-5 text-red-400" />
            )}
          </div>
          <span>{statusTitle}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 pt-6">
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-400 font-medium">Connection Status</span>
          <Badge 
            variant={isConnected ? "default" : "destructive"}
            className={isConnected 
              ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30 font-bold" 
              : "bg-red-500/20 text-red-400 border-red-500/30 font-bold"}
          >
            {isConnected ? "Connected" : "Disconnected"}
          </Badge>
        </div>
        
        {lastReading && (
          <div className="space-y-4 rounded-2xl bg-white/5 border border-white/10 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400 font-medium">
                {isSolarProvider ? 'Inverter ID' : 'Meter Number'}
              </span>
              <span className="text-sm font-mono text-white bg-white/5 px-2 py-1 rounded-lg border border-white/10">{lastReading.meter_number}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400 font-medium">Last Reading</span>
              <div className="flex items-center space-x-2 text-white">
                <Clock className="h-4 w-4 text-slate-400" />
                <span className="text-sm font-medium">
                  {(() => {
                    try {
                      if (!lastReading.reading_date) return 'Unknown time';
                      const date = new Date(lastReading.reading_date);
                      return isNaN(date.getTime()) ? 'Unknown time' : date.toLocaleTimeString();
                    } catch (error) {
                      return 'Unknown time';
                    }
                  })()}
                </span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400 font-medium">
                {isSolarProvider ? 'Latest Generation' : 'Latest Consumption'}
              </span>
              <div className="flex items-center space-x-2 text-emerald-400">
                {isSolarProvider ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Zap className="h-4 w-4" />
                )}
                <span className="text-sm font-bold">
                  {Number(lastReading.kwh_consumed).toFixed(2)} kWh
                </span>
              </div>
            </div>
          </div>
        )}
        
        {user && (
          <div className="pt-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full"
              onClick={handleSetupMeter}
            >
              <Link className="h-4 w-4 mr-2" />
              {isSolarProvider ? 'Connect Real Inverter' : 'Connect Real Meter'}
            </Button>
          </div>
        )}
        
        <div className="pt-4 border-t border-white/5">
          <div className="text-xs text-slate-500 font-medium leading-relaxed">
            {loading 
              ? `Loading ${connectionLabel.toLowerCase()} status...`
              : error 
                ? `Unable to connect to ${connectionLabel.toLowerCase()}. Please check your setup.`
                : !hasMeterConnected 
                  ? `No ${connectionLabel.toLowerCase()} connected. Set up your ${isSolarProvider ? 'solar inverter' : 'smart meter'} to get real-time data.`
                  : isConnected
                    ? isSolarProvider 
                      ? 'Real-time data from solar inverter'
                      : 'Real-time data from Kenya Power smart meters'
                    : `${deviceLabel} connected but no recent readings. Checking connection...`}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SmartMeterStatus;