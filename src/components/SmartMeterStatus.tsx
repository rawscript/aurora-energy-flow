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
  const { recentReadings, hasMeterConnected, error, loading } = useRealTimeEnergy(provider || 'KPLC');
  const { user } = useAuth();
  const { provider, providerConfig } = useEnergyProvider();
  
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
    <Card className="bg-aurora-card border-aurora-green/20">
      <CardHeader>
        <CardTitle className="text-lg flex items-center space-x-2">
          {isConnected ? (
            isSolarProvider ? (
              <Sun className="h-5 w-5 text-aurora-green-light" />
            ) : (
              <Wifi className="h-5 w-5 text-aurora-green-light" />
            )
          ) : isSolarProvider ? (
            <AlertTriangle className="h-5 w-5 text-yellow-400" />
          ) : (
            <WifiOff className="h-5 w-5 text-red-400" />
          )}
          <span>{statusTitle}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Connection Status</span>
          <Badge 
            variant={isConnected ? "default" : "destructive"}
            className={isConnected ? "bg-green-500" : ""}
          >
            {isConnected ? "Connected" : "Disconnected"}
          </Badge>
        </div>
        
        {lastReading && (
          <>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {isSolarProvider ? 'Inverter ID' : 'Meter Number'}
              </span>
              <span className="text-sm font-mono">{lastReading.meter_number}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Last Reading</span>
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
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
              <span className="text-sm text-muted-foreground">
                {isSolarProvider ? 'Latest Generation' : 'Latest Consumption'}
              </span>
              <div className="flex items-center space-x-2">
                {isSolarProvider ? (
                  <Sun className="h-4 w-4 text-aurora-green-light" />
                ) : (
                  <Zap className="h-4 w-4 text-aurora-green-light" />
                )}
                <span className="text-sm font-semibold">
                  {Number(lastReading.kwh_consumed).toFixed(2)} kWh
                </span>
              </div>
            </div>
          </>
        )}
        
        {user && (
          <div className="pt-2 pb-1">
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full border-aurora-green/30 hover:bg-aurora-green/20"
              onClick={handleSetupMeter}
            >
              <Link className="h-4 w-4 mr-2" />
              {isSolarProvider ? 'Connect Real Solar Inverter' : 'Connect Real Smart Meter'}
            </Button>
          </div>
        )}
        
        <div className="pt-2 border-t border-slate-700">
          <div className="text-xs text-muted-foreground">
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