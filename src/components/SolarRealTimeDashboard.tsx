import React, { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Battery, Sun, Zap, Monitor, AlertCircle, Loader2, House } from 'lucide-react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useRealTimeEnergy } from '@/hooks/useRealTimeEnergy';
import { useProfile } from '@/hooks/useProfile';
import { useEnergyProvider } from '@/contexts/EnergyProviderContext';
import { useMeter } from '@/contexts/MeterContext';
import { format } from 'date-fns';
import { useIsMobile } from '@/hooks/use-mobile';
import RealTimeInsights from './RealTimeInsights';

interface SolarRealTimeDashboardProps {
  energyProvider?: string;
}

const SolarRealTimeDashboard: React.FC<SolarRealTimeDashboardProps> = ({ energyProvider = 'Solar' }) => {
  const { provider: contextProvider } = useEnergyProvider();
  const provider = energyProvider || contextProvider;
  const { status: meterStatus, deviceType, meterNumber } = useMeter();
  const { energyData, recentReadings, analytics, loading, getNewReading, hasMeterConnected, meterConnectionChecked, refreshData } = useRealTimeEnergy(provider || 'KPLC');
  const { profile } = useProfile();
  const isMobile = useIsMobile();

  // Add effect to refresh data when meter connection changes
  useEffect(() => {
    if (hasMeterConnected) {
      refreshData();
    }
  }, [hasMeterConnected, refreshData]);

  // Safe energy data with fallbacks for solar-specific data
  const safeEnergyData = {
    current_usage: energyData?.current_usage || 0,
    daily_total: energyData?.daily_total || 0,
    battery_state: energyData?.battery_state || 0,
    power_generated: energyData?.power_generated || 0,
    load_consumption: energyData?.load_consumption || 0,
    battery_count: energyData?.battery_count || 0,
    efficiency_score: energyData?.efficiency_score || 0,
    weekly_average: energyData?.weekly_average || 0,
    monthly_total: energyData?.monthly_total || 0,
    peak_usage_time: energyData?.peak_usage_time || '00:00'
  };

  // Transform recent readings for charts - with error handling
  const chartData = React.useMemo(() => {
    try {
      if (!recentReadings || recentReadings.length === 0) {
        // Return empty data points for better chart display
        return Array.from({ length: isMobile ? 4 : 6 }, (_, i) => ({
          time: `${String(i * 4).padStart(2, '0')}:00`,
          usage: 0,
          generation: 0,
          battery: 0
        }));
      }
      
      return recentReadings
        .slice(0, isMobile ? 8 : 12)
        .reverse()
        .map(reading => {
          try {
            if (!reading.reading_date) {
              return {
                time: 'Unknown',
                usage: Number(reading.kwh_consumed) || 0,
                generation: Number(reading.power_generated) || 0,
                battery: Number(reading.battery_state) || 0
              };
            }
            const date = new Date(reading.reading_date);
            if (isNaN(date.getTime())) {
              return {
                time: 'Invalid',
                usage: Number(reading.kwh_consumed) || 0,
                generation: Number(reading.power_generated) || 0,
                battery: Number(reading.battery_state) || 0
              };
            }
            return {
              time: format(date, isMobile ? 'HH:mm' : 'HH:mm'),
              usage: Number(reading.kwh_consumed) || 0,
              generation: Number(reading.power_generated) || 0,
              battery: Number(reading.battery_state) || 0
            };
          } catch (err) {
            console.error('Error processing reading:', err);
            return {
              time: 'Error',
              usage: 0,
              generation: 0,
              battery: 0
            };
          }
        });
    } catch (error) {
      console.error('Error processing chart data:', error);
      return Array.from({ length: isMobile ? 4 : 6 }, (_, i) => ({
        time: `${String(i * 4).padStart(2, '0')}:00`,
        usage: 0,
        generation: 0,
        battery: 0
      }));
    }
  }, [recentReadings, isMobile]);

  // Show loading state
  if (loading && !energyData) {
    return (
      <div className="flex items-center justify-center h-32 sm:h-64">
        <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-b-2 border-aurora-green-light"></div>
      </div>
    );
  }

  // Show no meter connected state
  if (!loading && meterConnectionChecked && !hasMeterConnected) {
    return (
      <div className="space-y-6 animate-fade-in">
        {/* No Meter Connected Banner */}
        <Card className="bg-aurora-card border-yellow-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-yellow-500/20 rounded-full flex items-center justify-center">
                  <AlertCircle className="h-6 w-6 text-yellow-500" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">
                    No Solar Inverter Connected
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Connect your solar inverter to start monitoring real solar energy generation
                  </p>
                </div>
              </div>
              <Button
                onClick={() => window.location.hash = '#meter'}
                className="bg-aurora-green hover:bg-aurora-green/80"
              >
                <Sun className="h-4 w-4 mr-2" />
                Setup Inverter
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Empty Stats - Mobile Optimized */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card className="bg-aurora-card border-aurora-green/20 opacity-60">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center space-x-2">
                <Battery className="h-6 w-6 sm:h-8 sm:w-8 text-aurora-green-light opacity-50" />
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Battery State</p>
                  <p className="text-lg sm:text-2xl font-bold text-aurora-green-light opacity-50">— %</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-aurora-card border-aurora-blue/20 opacity-60">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center space-x-2">
                <Sun className="h-6 w-6 sm:h-8 sm:w-8 text-aurora-blue-light opacity-50" />
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Power Generated</p>
                  <p className="text-lg sm:text-2xl font-bold text-aurora-blue-light opacity-50">— kW</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-aurora-card border-aurora-purple/20 opacity-60">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center space-x-2">
                <Battery className="h-6 w-6 sm:h-8 sm:w-8 text-aurora-purple-light opacity-50" />
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Batteries Connected</p>
                  <p className="text-lg sm:text-2xl font-bold text-aurora-purple-light opacity-50">—</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-aurora-card border-emerald-500/20 opacity-60">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center space-x-2">
                <Monitor className="h-6 w-6 sm:h-8 sm:w-8 text-emerald-400 opacity-50" />
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Load Consumption</p>
                  <p className="text-lg sm:text-2xl font-bold text-emerald-400 opacity-50">— kW</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Empty Chart */}
        <Card className="bg-aurora-card border-aurora-green/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg sm:text-xl text-aurora-green-light">
              Real-time Solar Generation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`${isMobile ? 'h-48' : 'h-64'} flex items-center justify-center`}>
              <div className="text-center">
                <Sun className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">No solar data available</p>
                <p className="text-sm text-muted-foreground mt-2">Connect your solar inverter to see real-time generation</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show connected meter dashboard
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Real-time Status Banner */}
      <Card className="bg-aurora-card border-aurora-green/20 aurora-glow">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full animate-pulse ${hasMeterConnected ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
              <span className="text-sm text-aurora-green-light">
                {hasMeterConnected ? 'Live Solar Data' : 'Demo Solar Data'}
              </span>
              {safeEnergyData.daily_total === 0 && (
                <span className="text-xs text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded-full">
                  No usage data yet
                </span>
              )}
            </div>
            <Button
              onClick={getNewReading}
              size="sm"
              className="bg-aurora-green hover:bg-aurora-green/80"
              disabled={!hasMeterConnected || loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Zap className="h-4 w-4 mr-2" />
              )}
              {hasMeterConnected ? 'Get Solar Reading' : 'Setup Required'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Header Stats - Mobile Optimized */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="bg-aurora-card border-aurora-green/20 aurora-glow">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Battery className="h-6 w-6 sm:h-8 sm:w-8 text-aurora-green-light" />
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Battery State</p>
                  <p className={`text-lg sm:text-2xl font-bold text-aurora-green-light ${safeEnergyData.battery_state === 0 ? 'opacity-50' : ''}`}>
                    {safeEnergyData.battery_state.toFixed(0)}%
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-aurora-card border-aurora-blue/20 aurora-glow">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Sun className="h-6 w-6 sm:h-8 sm:w-8 text-aurora-blue-light" />
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Power Generated</p>
                  <p className={`text-lg sm:text-2xl font-bold text-aurora-blue-light ${safeEnergyData.power_generated === 0 ? 'opacity-50' : ''}`}>
                    {safeEnergyData.power_generated.toFixed(1)} kW
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-aurora-card border-aurora-purple/20 aurora-glow">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Battery className="h-6 w-6 sm:h-8 sm:w-8 text-aurora-purple-light" />
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Batteries Connected</p>
                  <p className={`text-lg sm:text-2xl font-bold text-aurora-purple-light ${safeEnergyData.battery_count === 0 ? 'opacity-50' : ''}`}>
                    {safeEnergyData.battery_count}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-aurora-card border-emerald-500/20 aurora-glow">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Monitor className="h-6 w-6 sm:h-8 sm:w-8 text-emerald-400" />
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Load Consumption</p>
                  <p className={`text-lg sm:text-2xl font-bold text-emerald-400 ${safeEnergyData.load_consumption === 0 ? 'opacity-50' : ''}`}>
                    {safeEnergyData.load_consumption.toFixed(1)} kW
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Mobile Stats */}
      {isMobile && (
        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-aurora-card border-aurora-green/20">
            <CardContent className="p-3">
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Daily Total</p>
                <p className={`text-lg font-bold text-aurora-green-light ${safeEnergyData.daily_total === 0 ? 'opacity-50' : ''}`}>
                  {safeEnergyData.daily_total > 0 ? `${safeEnergyData.daily_total.toFixed(1)} kWh` : '— kWh'}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-aurora-card border-aurora-blue/20">
            <CardContent className="p-3">
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Weekly Avg</p>
                <p className={`text-lg font-bold text-aurora-blue-light ${safeEnergyData.weekly_average === 0 ? 'opacity-50' : ''}`}>
                  {safeEnergyData.weekly_average > 0 ? `${safeEnergyData.weekly_average.toFixed(1)} kWh` : '— kWh'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Real-time Solar Generation Chart */}
      <Card className="bg-aurora-card border-aurora-green/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg sm:text-xl text-aurora-green-light">
            Real-time Solar Generation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`${isMobile ? 'h-48' : 'h-64'}`}>
            {chartData.some(d => d.generation > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorGeneration" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis
                    dataKey="time"
                    stroke="#9ca3af"
                    fontSize={isMobile ? 10 : 12}
                    interval={isMobile ? 1 : 0}
                  />
                  <YAxis stroke="#9ca3af" fontSize={isMobile ? 10 : 12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1f2937',
                      border: '1px solid #f59e0b',
                      borderRadius: '8px',
                      fontSize: isMobile ? '12px' : '14px'
                    }}
                    formatter={(value, name) => {
                      if (name === 'generation') return [`${value} kW`, 'Generation'];
                      if (name === 'battery') return [`${value}%`, 'Battery'];
                      return [`${value} kWh`, 'Consumption'];
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="generation"
                    stroke="#f59e0b"
                    fillOpacity={1}
                    fill="url(#colorGeneration)"
                    strokeWidth={isMobile ? 2 : 3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Sun className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">
                    No solar generation data yet
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Start generating solar energy to see your generation pattern
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Battery State Chart */}
      <Card className="bg-aurora-card border-aurora-blue/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg sm:text-xl text-aurora-blue-light">
            Battery Charge Level
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`${isMobile ? 'h-48' : 'h-64'}`}>
            {chartData.some(d => d.battery > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis
                    dataKey="time"
                    stroke="#9ca3af"
                    fontSize={isMobile ? 10 : 12}
                  />
                  <YAxis stroke="#9ca3af" fontSize={isMobile ? 10 : 12} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1f2937',
                      border: '1px solid #3b82f6',
                      borderRadius: '8px',
                      fontSize: isMobile ? '12px' : '14px'
                    }}
                    formatter={(value) => [`${value}%`, 'Battery']}
                  />
                  <Line
                    type="monotone"
                    dataKey="battery"
                    stroke="#3b82f6"
                    strokeWidth={isMobile ? 2 : 3}
                    dot={{ fill: '#3b82f6', strokeWidth: 2, r: isMobile ? 3 : 4 }}
                    activeDot={{ r: isMobile ? 4 : 6, stroke: '#3b82f6', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Battery className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">
                    No battery data yet
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Connect your battery system to see charge levels
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Real-time Insights - Only show if we have data */}
      {safeEnergyData.daily_total > 0 && <RealTimeInsights />}
    </div>
  );
};

export default SolarRealTimeDashboard;