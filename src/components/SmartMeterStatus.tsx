
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff, Zap, Clock, AlertTriangle, Link } from 'lucide-react';
import { useRealTimeEnergy } from '@/hooks/useRealTimeEnergy';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';

interface SmartMeterStatusProps {
  onNavigateToMeter?: () => void;
}

const SmartMeterStatus = ({ onNavigateToMeter }: SmartMeterStatusProps) => {
  const { recentReadings, hasMeterConnected, error, loading } = useRealTimeEnergy();
  const { user } = useAuth();
  
  const lastReading = recentReadings[0];
  const isConnected = hasMeterConnected && lastReading && 
    new Date().getTime() - new Date(lastReading.reading_date).getTime() < 300000; // 5 minutes

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
            <Wifi className="h-5 w-5 text-aurora-green-light" />
          ) : (
            <WifiOff className="h-5 w-5 text-red-400" />
          )}
          <span>Smart Meter Status</span>
      
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
              <span className="text-sm text-muted-foreground">Meter Number</span>
              <span className="text-sm font-mono">{lastReading.meter_number}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Last Reading</span>
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  {new Date(lastReading.reading_date).toLocaleTimeString()}
                </span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Latest Consumption</span>
              <div className="flex items-center space-x-2">
                <Zap className="h-4 w-4 text-aurora-green-light" />
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
              Connect Real Smart Meter
            </Button>
          </div>
        )}
        
        <div className="pt-2 border-t border-slate-700">
          <div className="text-xs text-muted-foreground">
            {loading 
              ? 'Loading meter status...'
              : error 
                ? 'Unable to connect to meter. Please check your setup.'
                : !hasMeterConnected 
                  ? 'No meter connected. Set up your smart meter to get real-time data.'
                  : isConnected
                    ? 'Real-time data from Kenya Power smart meters'
                    : 'Meter connected but no recent readings. Checking connection...'}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SmartMeterStatus;
