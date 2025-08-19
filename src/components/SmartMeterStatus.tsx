
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff, Zap, Clock, AlertTriangle, Link } from 'lucide-react';
import { useRealTimeEnergy } from '@/hooks/useRealTimeEnergy';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const SmartMeterStatus = () => {
  const { recentReadings, useMockData } = useRealTimeEnergy();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const lastReading = recentReadings[0];
  const isConnected = lastReading && 
    new Date().getTime() - new Date(lastReading.reading_date).getTime() < 300000; // 5 minutes

  const handleSetupMeter = () => {
    navigate('/meter-setup');
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
          {useMockData && (
            <Badge variant="outline" className="ml-2 bg-amber-500/20 text-amber-400 border-amber-500/30">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Simulated
            </Badge>
          )}
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
        
        {useMockData && user && (
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
            {useMockData 
              ? 'Using simulated data. Connect a real meter for accurate insights.'
              : 'Real-time data from Kenya Power smart meters'}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SmartMeterStatus;
