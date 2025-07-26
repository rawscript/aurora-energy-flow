
import React, { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Battery, House, Sun, Monitor, Zap, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { useRealTimeEnergy } from '@/hooks/useRealTimeEnergy';
import { format } from 'date-fns';
import { useIsMobile } from '@/hooks/use-mobile';

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
  const { energyData, recentReadings, analytics, loading, simulateReading } = useRealTimeEnergy();
  const isMobile = useIsMobile();

  // Transform recent readings for charts - optimized for mobile
  const chartData = recentReadings.slice(0, isMobile ? 8 : 12).reverse().map(reading => ({
    time: format(new Date(reading.reading_date), isMobile ? 'HH:mm' : 'HH:mm'),
    usage: Number(reading.kwh_consumed),
    cost: Number(reading.total_cost),
  }));

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
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-aurora-green-light">Live Smart Meter Data</span>
            </div>
            <Button
              onClick={simulateReading}
              size="sm"
              className="bg-aurora-green hover:bg-aurora-green/80"
            >
              <Zap className="h-4 w-4 mr-2" />
              Live feed Reading
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Header Stats - Mobile Optimized */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          icon={Battery}
          title="Current Usage"
          value={`${energyData.current_usage.toFixed(1)} kW`}
          color="aurora-green-light"
          trend={energyData.cost_trend}
        />

        <StatCard
          icon={House}
          title="Daily Total"
          value={`${energyData.daily_total.toFixed(1)} kWh`}
          color="aurora-blue-light"
        />

        <StatCard
          icon={Sun}
          title="Cost Today"
          value={`KSh ${energyData.daily_cost.toFixed(2)}`}
          color="aurora-purple-light"
          trend={energyData.cost_trend}
        />

        <StatCard
          icon={Monitor}
          title="Efficiency"
          value={`${energyData.efficiency_score}%`}
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
                  {energyData.weekly_average.toFixed(1)} kWh
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-aurora-card border-aurora-blue/20">
            <CardContent className="p-3">
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Peak Time</p>
                <p className="text-lg font-bold text-aurora-blue-light">
                  {energyData.peak_usage_time}
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
              <AreaChart data={chartData.length > 0 ? chartData : [{ time: 'No data', usage: 0 }]}>
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
      {analytics.hourlyPattern.length > 0 && (
        <Card className="bg-aurora-card border-aurora-blue/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg sm:text-xl text-aurora-blue-light">24-Hour Usage Pattern</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`${isMobile ? 'h-48' : 'h-64'}`}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.hourlyPattern}>
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
                    data={analytics.deviceBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={isMobile ? 40 : 60}
                    outerRadius={isMobile ? 70 : 100}
                    paddingAngle={5}
                    dataKey="percentage"
                  >
                    {analytics.deviceBreakdown.map((entry, index) => (
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
              {analytics.deviceBreakdown.map((device, index) => (
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
                <LineChart data={analytics.weeklyTrend}>
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
    </div>
  );
};

export default EnergyDashboard;
