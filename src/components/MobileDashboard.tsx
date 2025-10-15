import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Battery,
  House,
  Sun,
  Monitor,
  Zap,
  TrendingUp,
  TrendingDown,
  Bell,
  CreditCard,
  BarChart3,
  Settings,
  Plus
} from 'lucide-react';
import { useRealTimeEnergy } from '@/hooks/useRealTimeEnergy';
import { useNotifications } from '@/hooks/useNotifications';
import { useProfile } from '@/hooks/useProfile';
import { useEnergyProvider } from '@/contexts/EnergyProviderContext';
import { format } from 'date-fns';

interface MobileDashboardProps {
  onNavigate: (tab: string) => void;
}

const MobileDashboard: React.FC<MobileDashboardProps> = ({ onNavigate }) => {
  const { profile } = useProfile();
  const { provider } = useEnergyProvider();
  
  // Use provider from context, fallback to profile, then to KPLC
  const energyProvider = useMemo(() => {
    return provider || profile?.energy_provider || 'KPLC';
  }, [provider, profile?.energy_provider]);
  
  const { energyData, recentReadings, loading, hasMeterConnected, getNewReading } = useRealTimeEnergy(energyProvider);
  const { unreadCount } = useNotifications();
  const [useMockData, setUseMockData] = useState(!hasMeterConnected);

  const handleNavigation = (tab: string) => {
    try {
      onNavigate(tab);
    } catch (error) {
      console.error('Navigation error:', error);
    }
  };

  const simulateReading = () => {
    if (hasMeterConnected) {
      getNewReading();
    } else {
      // In a real implementation, this would simulate data
      console.log("Simulating energy reading");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-aurora-green-light"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-20">
      {/* Status Banner */}
      <Card className="bg-aurora-card border-aurora-green/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-aurora-green-light">
                {useMockData ? 'Simulated Data' : 'Live Data'}
              </span>
              {useMockData && (
                <Badge variant="outline" className="text-xs bg-amber-500/20 text-amber-400 border-amber-500/30">
                  Demo
                </Badge>
              )}
            </div>
            <Button 
              onClick={simulateReading}
              size="sm"
              className="bg-aurora-green hover:bg-aurora-green/80 text-xs px-3 py-1"
            >
              <Zap className="h-3 w-3 mr-1" />
              {useMockData ? 'Simulate' : 'Update'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-aurora-card border-aurora-green/20">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Battery className="h-5 w-5 text-aurora-green-light" />
              <div>
                <p className="text-xs text-muted-foreground">Current</p>
                <p className="text-lg font-bold text-aurora-green-light">
                  {energyData.current_usage.toFixed(1)} kW
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-aurora-card border-aurora-blue/20">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <House className="h-5 w-5 text-aurora-blue-light" />
              <div>
                <p className="text-xs text-muted-foreground">Daily Total</p>
                <p className="text-lg font-bold text-aurora-blue-light">
                  {energyData.daily_total.toFixed(1)} kWh
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-aurora-card border-aurora-purple/20">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Sun className="h-5 w-5 text-aurora-purple-light" />
              <div>
                <p className="text-xs text-muted-foreground">Cost Today</p>
                <p className="text-lg font-bold text-aurora-purple-light">
                  KSh {energyData.daily_cost.toFixed(0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-aurora-card border-emerald-500/20">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Monitor className="h-5 w-5 text-emerald-400" />
              <div>
                <p className="text-xs text-muted-foreground">Efficiency</p>
                <p className="text-lg font-bold text-emerald-400">
                  {energyData.efficiency_score}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          onClick={() => handleNavigation('tokens')}
          className="h-16 bg-aurora-green hover:bg-aurora-green/80 flex flex-col items-center justify-center space-y-1"
        >
          <CreditCard className="h-5 w-5" />
          <span className="text-xs">Buy Tokens</span>
        </Button>

        <Button
          onClick={() => handleNavigation('notifications')}
          variant="outline"
          className="h-16 border-aurora-blue/30 hover:bg-aurora-blue/10 flex flex-col items-center justify-center space-y-1 relative"
        >
          <Bell className="h-5 w-5" />
          <span className="text-xs">Alerts</span>
          {unreadCount > 0 && (
            <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </div>
          )}
        </Button>
      </div>

      {/* Recent Usage */}
      <Card className="bg-aurora-card border-aurora-blue/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg text-aurora-blue-light">Recent Usage</CardTitle>
            <Button
              onClick={() => handleNavigation('insights')}
              variant="ghost"
              size="sm"
              className="text-xs"
            >
              <BarChart3 className="h-4 w-4 mr-1" />
              View All
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {recentReadings.slice(0, 3).map((reading, index) => (
            <div key={reading.id} className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg">
              <div>
                <p className="text-sm font-medium">
                  {(() => {
                    try {
                      if (!reading.reading_date) return 'Unknown date';
                      const date = new Date(reading.reading_date);
                      return isNaN(date.getTime()) ? 'Invalid date' : format(date, 'MMM dd, HH:mm');
                    } catch (error) {
                      return 'Error formatting date';
                    }
                  })()}
                </p>
                <p className="text-xs text-muted-foreground">
                  {reading.kwh_consumed.toFixed(2)} kWh
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-aurora-green-light">
                  KSh {reading.total_cost.toFixed(2)}
                </p>
                <div className="flex items-center space-x-1">
                  {index === 0 && energyData.cost_trend === 'up' && (
                    <TrendingUp className="h-3 w-3 text-red-500" />
                  )}
                  {index === 0 && energyData.cost_trend === 'down' && (
                    <TrendingDown className="h-3 w-3 text-green-500" />
                  )}
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Weekly Summary */}
      <Card className="bg-aurora-card border-aurora-purple/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg text-aurora-purple-light">This Week</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-aurora-green-light">
                {energyData.weekly_average.toFixed(0)}
              </p>
              <p className="text-xs text-muted-foreground">kWh Avg</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-aurora-blue-light">
                {energyData.peak_usage_time}
              </p>
              <p className="text-xs text-muted-foreground">Peak Time</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-400">
                KSh {(energyData.weekly_average * 25).toFixed(0)}
              </p>
              <p className="text-xs text-muted-foreground">Est. Cost</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Tips */}
      <Card className="bg-aurora-card border-yellow-500/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg text-yellow-400">💡 Energy Tip</CardTitle>
            {useMockData && (
              <Badge variant="outline" className="text-xs bg-amber-500/20 text-amber-400 border-amber-500/30">
                Simulated
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-300">
            Your peak usage is at {energyData.peak_usage_time}. Consider shifting some activities to off-peak hours to save on costs.
          </p>
          {useMockData && (
            <p className="text-xs text-amber-400 mt-2">
              Connect a real meter for personalized energy tips based on your actual usage patterns.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MobileDashboard;