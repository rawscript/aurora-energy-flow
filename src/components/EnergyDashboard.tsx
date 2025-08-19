import React, { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Battery, House, Sun, Monitor, Zap, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { useRealTimeEnergy } from '@/hooks/useRealTimeEnergy';
import { useProfile } from '@/hooks/useProfile';
import { format } from 'date-fns';
import { useIsMobile } from '@/hooks/use-mobile';
import RealTimeInsights from './RealTimeInsights';

// Memoized components for better mobile performance
const StatCard = memo(({ icon: Icon, title, value, color, trend }: {
  icon: React.ElementType;
  title: string;
  value: string;
  color: string;
  trend?: 'up' | 'down' | 'stable';
}) => (
  <Card className={`bg-aurora-card border-${color}/20 aurora-glow`}>
    <CardContent className="p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Icon className={`h-6 w-6 sm:h-8 sm:w-8 text-${color}`} />
          <div>
            <p className="text-xs sm:text-sm text-muted-foreground">{title}</p>
            <p className={`text-lg sm:text-2xl font-bold text-${color}`}>{value}</p>
          </div>
        </div>
        {trend && (
          <div className="flex items-center">
            {trend === 'up' && <TrendingUp className="h-4 w-4 text-red-500" />}
            {trend === 'down' && <TrendingDown className="h-4 w-4 text-green-500" />}
            {trend === 'stable' && <Minus className="h-4 w-4 text-gray-500" />}
          </div>
        )}
      </div>
    </CardContent>
  </Card>
));

const EnergyDashboard = () => {
  const { energyData, recentReadings, analytics, loading, getNewReading, hasMeterConnected } = useRealTimeEnergy();
  const { profile } = useProfile(); // Add profile hook for better error handling
  const isMobile = useIsMobile();

  // Safe energy data with fallbacks
  const safeEnergyData = {
    current_usage: energyData?.current_usage || 0,
    daily_total: energyData?.daily_total || 0,
    daily_cost: energyData?.daily_cost || 0,
    efficiency_score: energyData?.efficiency_score || 0,
    weekly_average: energyData?.weekly_average || 0,
    monthly_total: energyData?.monthly_total || 0,
    peak_usage_time: energyData?.peak_usage_time || '18:00',
    cost_trend: energyData?.cost_trend || 'stable'
  };

  // Transform recent readings for charts - optimized for mobile and with error handling
  const chartData = React.useMemo(() => {
    try {
      if (!recentReadings || recentReadings.length === 0) {
        // Return sample data for better UX when no data is available
        return [
          { time: '00:00', usage: 0, cost: 0 },
          { time: '06:00', usage: 0, cost: 0 },
          { time: '12:00', usage: 0, cost: 0 },
          { time: '18:00', usage: 0, cost: 0 }
        ];
      }
      
      return recentReadings
        .slice(0, isMobile ? 8 : 12)
        .reverse()
        .map(reading => {
          try {
            return {
              time: format(new Date(reading.reading_date), isMobile ? 'HH:mm' : 'HH:mm'),
              usage: Number(reading.kwh_consumed) || 0,
              cost: Number(reading.total_cost) || 0,
            };
          } catch (err) {
            console.error('Error processing reading:', err);
            return {
              time: 'Error',
              usage: 0,
              cost: 0
            };
          }
        });
    } catch (error) {
      console.error('Error processing chart data:', error);
      return [
        { time: '00:00', usage: 0, cost: 0 },
        { time: '06:00', usage: 0, cost: 0 },
        { time: '12:00', usage: 0, cost: 0 },
        { time: '18:00', usage: 0, cost: 0 }
      ];
    }
  }, [recentReadings, isMobile]);

  // Safe analytics data with fallbacks
  const safeAnalytics = {
    hourlyPattern: analytics?.hourlyPattern || [],
    weeklyTrend: analytics?.weeklyTrend || [],
    deviceBreakdown: analytics?.deviceBreakdown || [
      { device: 'HVAC', percentage: 30, cost: safeEnergyData.daily_cost * 0.3 },
      { device: 'Lighting', percentage: 25, cost: safeEnergyData.daily_cost * 0.25 },
      { device: 'Appliances', percentage: 25, cost: safeEnergyData.daily_cost * 0.25 },
      { device: 'Electronics', percentage: 20, cost: safeEnergyData.daily_cost * 0.2 }
    ],
    peakHours: analytics?.peakHours || []
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32 sm:h-64">
        <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-b-2 border-aurora-green-light"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Real-time Status Banner */}
      <Card className="bg-aurora-card border-aurora-green/20 aurora-glow">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full animate-pulse ${hasMeterConnected ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
              <span className="text-sm text-aurora-green-light">
                {hasMeterConnected ? 'Live Smart Meter Data' : 'Demo Smart Meter Data'}
              </span>
              {!hasMeterConnected && (
                <span className="text-xs text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded-full">
                  Setup meter for real data
                </span>
              )}
            </div>
            <Button
              onClick={getNewReading}
              size="sm"
              className="bg-aurora-green hover:bg-aurora-green/80"
            >
              <Zap className="h-4 w-4 mr-2" />
              {hasMeterConnected ? 'Get Reading' : 'Simulate Reading'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Header Stats - Mobile Optimized */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          icon={Battery}
          title="Current Usage"
          value={`${safeEnergyData.current_usage.toFixed(1)} kW`}
          color="aurora-green-light"
          trend={safeEnergyData.cost_trend}
        />

        <StatCard
          icon={House}
          title="Daily Total"
          value={`${safeEnergyData.daily_total.toFixed(1)} kWh`}
          color="aurora-blue-light"
        />

        <StatCard
          icon={Sun}
          title="Cost Today"
          value={`KSh ${safeEnergyData.daily_cost.toFixed(2)}`}
          color="aurora-purple-light"
          trend={safeEnergyData.cost_trend}
        />

        <StatCard
          icon={Monitor}
          title="Efficiency"
          value={`${safeEnergyData.efficiency_score}%`}
          color="emerald-400"
        />
      </div>

      {/* Additional Mobile Stats */}
      {isMobile && (
        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-aurora-card border-aurora-green/20">
            <CardContent className="p-3">
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Weekly Avg</p>
                <p className="text-lg font-bold text-aurora-green-light">
                  {safeEnergyData.weekly_average.toFixed(1)} kWh
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-aurora-card border-aurora-blue/20">
            <CardContent className="p-3">
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Peak Time</p>
                <p className="text-lg font-bold text-aurora-blue-light">
                  {safeEnergyData.peak_usage_time}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Real-time Usage Chart - Mobile Optimized */}
      <Card className="bg-aurora-card border-aurora-green/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg sm:text-xl text-aurora-green-light">Real-time Energy Usage</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`${isMobile ? 'h-48' : 'h-64'}`}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorUsage" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.1} />
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
                    border: '1px solid #10b981',
                    borderRadius: '8px',
                    fontSize: isMobile ? '12px' : '14px'
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="usage"
                  stroke="#10b981"
                  fillOpacity={1}
                  fill="url(#colorUsage)"
                  strokeWidth={isMobile ? 2 : 3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Hourly Pattern Chart - New Analytics */}
      {safeAnalytics.hourlyPattern.length > 0 && (
        <Card className="bg-aurora-card border-aurora-blue/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg sm:text-xl text-aurora-blue-light">24-Hour Usage Pattern</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`${isMobile ? 'h-48' : 'h-64'}`}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={safeAnalytics.hourlyPattern}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis
                    dataKey="hour"
                    stroke="#9ca3af"
                    fontSize={isMobile ? 10 : 12}
                    tickFormatter={(hour) => `${hour}:00`}
                  />
                  <YAxis stroke="#9ca3af" fontSize={isMobile ? 10 : 12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1f2937',
                      border: '1px solid #3b82f6',
                      borderRadius: '8px',
                      fontSize: isMobile ? '12px' : '14px'
                    }}
                    labelFormatter={(hour) => `${hour}:00`}
                  />
                  <Bar
                    dataKey="usage"
                    fill="#3b82f6"
                    name="Usage (kWh)"
                    radius={[2, 2, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      <div className={`grid grid-cols-1 ${isMobile ? 'gap-4' : 'lg:grid-cols-2 gap-6'}`}>
        {/* Device Usage Breakdown - Real Analytics */}
        <Card className="bg-aurora-card border-aurora-blue/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg sm:text-xl text-aurora-blue-light">Device Usage Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`${isMobile ? 'h-48' : 'h-64'}`}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={safeAnalytics.deviceBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={isMobile ? 40 : 60}
                    outerRadius={isMobile ? 70 : 100}
                    paddingAngle={5}
                    dataKey="percentage"
                  >
                    {safeAnalytics.deviceBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={['#10b981', '#3b82f6', '#a855f7', '#f59e0b'][index]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name) => [`${value}%`, name]}
                    contentStyle={{
                      backgroundColor: '#1f2937',
                      border: '1px solid #3b82f6',
                      borderRadius: '8px',
                      fontSize: isMobile ? '12px' : '14px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className={`mt-4 space-y-2 ${isMobile ? 'text-sm' : ''}`}>
              {safeAnalytics.deviceBreakdown.map((device, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: ['#10b981', '#3b82f6', '#a855f7', '#f59e0b'][index] }}
                    />
                    <span className="text-sm">{device.device}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-medium">{device.percentage}%</span>
                    <p className="text-xs text-muted-foreground">KSh {device.cost.toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Weekly Trend Analysis */}
        <Card className="bg-aurora-card border-aurora-purple/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg sm:text-xl text-aurora-purple-light">Weekly Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`${isMobile ? 'h-48' : 'h-64'}`}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={safeAnalytics.weeklyTrend.length > 0 ? safeAnalytics.weeklyTrend : [
                  { day: 'Mon', usage: 0, efficiency: 0 },
                  { day: 'Tue', usage: 0, efficiency: 0 },
                  { day: 'Wed', usage: 0, efficiency: 0 },
                  { day: 'Thu', usage: 0, efficiency: 0 },
                  { day: 'Fri', usage: 0, efficiency: 0 },
                  { day: 'Sat', usage: 0, efficiency: 0 },
                  { day: 'Sun', usage: 0, efficiency: 0 }
                ]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis
                    dataKey="day"
                    stroke="#9ca3af"
                    fontSize={isMobile ? 10 : 12}
                  />
                  <YAxis stroke="#9ca3af" fontSize={isMobile ? 10 : 12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1f2937',
                      border: '1px solid #a855f7',
                      borderRadius: '8px',
                      fontSize: isMobile ? '12px' : '14px'
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="usage"
                    stroke="#a855f7"
                    strokeWidth={isMobile ? 2 : 3}
                    dot={{ fill: '#a855f7', strokeWidth: 2, r: isMobile ? 3 : 4 }}
                    activeDot={{ r: isMobile ? 4 : 6, stroke: '#a855f7', strokeWidth: 2 }}
                    name="Usage (kWh)"
                  />
                  <Line
                    type="monotone"
                    dataKey="efficiency"
                    stroke="#10b981"
                    strokeWidth={isMobile ? 2 : 3}
                    dot={{ fill: '#10b981', strokeWidth: 2, r: isMobile ? 3 : 4 }}
                    activeDot={{ r: isMobile ? 4 : 6, stroke: '#10b981', strokeWidth: 2 }}
                    name="Efficiency (%)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Real-time Insights */}
      <RealTimeInsights />
    </div>
  );
};

export default EnergyDashboard;