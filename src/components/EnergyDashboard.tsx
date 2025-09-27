import React, { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Battery, House, Sun, Monitor, Zap, TrendingUp, TrendingDown, Minus, AlertCircle } from 'lucide-react';
import SolarPanel from '@/components/ui/SolarPanel';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { useRealTimeEnergy } from '@/hooks/useRealTimeEnergy';
import { useProfile } from '@/hooks/useProfile';
import { useEnergyProvider } from '@/contexts/EnergyProviderContext';
import { useMeter } from '@/contexts/MeterContext'; // Import meter context
import { format } from 'date-fns';
import { useIsMobile } from '@/hooks/use-mobile';
import RealTimeInsights from './RealTimeInsights';

// Memoized components for better mobile performance
const StatCard = memo(({ icon: Icon, title, value, color, trend, isEmpty = false }: {
  icon: React.ElementType;
  title: string;
  value: string;
  color: string;
  trend?: 'up' | 'down' | 'stable';
  isEmpty?: boolean;
}) => (
  <Card className={`bg-aurora-card border-${color}/20 aurora-glow ${isEmpty ? 'opacity-60' : ''}`}>
    <CardContent className="p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Icon className={`h-6 w-6 sm:h-8 sm:w-8 text-${color} ${isEmpty ? 'opacity-50' : ''}`} />
          <div>
            <p className="text-xs sm:text-sm text-muted-foreground">{title}</p>
            <p className={`text-lg sm:text-2xl font-bold text-${color} ${isEmpty ? 'opacity-50' : ''}`}>{value}</p>
          </div>
        </div>
        {trend && !isEmpty && (
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

interface EnergyDashboardProps {
  energyProvider?: string;
}

const EnergyDashboard = () => {
  const { provider: energyProvider } = useEnergyProvider();
  const { status: meterStatus, deviceType, meterNumber } = useMeter(); // Get meter status from context
  const { energyData, recentReadings, analytics, loading, getNewReading } = useRealTimeEnergy(energyProvider);
  const { profile } = useProfile();
  const isMobile = useIsMobile();
  const [showAllDevices, setShowAllDevices] = React.useState(false);

  // Determine if meter is connected based on meter context
  const hasMeterConnected = meterStatus === 'connected';
  const meterConnectionChecked = meterStatus !== 'checking';

  // Safe energy data with fallbacks
  const safeEnergyData = {
    current_usage: energyData?.current_usage || 0,
    daily_total: energyData?.daily_total || 0,
    daily_cost: energyData?.daily_cost || 0,
    efficiency_score: energyData?.efficiency_score || 0,
    weekly_average: energyData?.weekly_average || 0,
    monthly_total: energyData?.monthly_total || 0,
    peak_usage_time: energyData?.peak_usage_time || '00:00',
    cost_trend: energyData?.cost_trend || 'stable'
  };

  // Transform recent readings for charts - with error handling
  const chartData = React.useMemo(() => {
    try {
      if (!recentReadings || recentReadings.length === 0) {
        // Return empty data points for better chart display
        return Array.from({ length: isMobile ? 4 : 6 }, (_, i) => ({
          time: `${String(i * 4).padStart(2, '0')}:00`,
          usage: 0,
          cost: 0
        }));
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
      return Array.from({ length: isMobile ? 4 : 6 }, (_, i) => ({
        time: `${String(i * 4).padStart(2, '0')}:00`,
        usage: 0,
        cost: 0
      }));
    }
  }, [recentReadings, isMobile]);

  // Safe analytics data with fallbacks
  const safeAnalytics = {
    hourlyPattern: analytics?.hourlyPattern || [],
    weeklyTrend: analytics?.weeklyTrend || [],
    deviceBreakdown: analytics?.deviceBreakdown || [
      { device: 'HVAC', percentage: 0, cost: 0 },
      { device: 'Lighting', percentage: 0, cost: 0 },
      { device: 'Appliances', percentage: 0, cost: 0 },
      { device: 'Electronics', percentage: 0, cost: 0 }
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

  // Show no meter connected state
  if (meterConnectionChecked && !hasMeterConnected) {
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
                    {energyProvider === 'Solar' ? 'No Solar Inverter Connected' : 'No Smart Meter Connected'}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {energyProvider === 'Solar'
                      ? 'Connect your solar inverter to start monitoring real solar energy generation'
                      : 'Connect your Kenya Power smart meter to start monitoring real energy usage'}
                  </p>
                </div>
              </div>
              <Button
                onClick={() => window.location.hash = '#meter'}
                className="bg-aurora-green hover:bg-aurora-green/80"
              >
                {energyProvider === 'Solar' ? (
                  <>
                    <Sun className="h-4 w-4 mr-2" />
                    Setup Inverter
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Setup Meter
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Empty Stats - Mobile Optimized */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {energyProvider === 'Solar' ? (
            <>
              <StatCard
                icon={Battery}
                title="Battery State"
                value="— %"
                color="aurora-green-light"
                isEmpty={true}
              />
              <StatCard
                icon={Sun}
                title="Power Generated"
                value="— kW"
                color="aurora-blue-light"
                isEmpty={true}
              />
              <StatCard
                icon={House}
                title="Batteries Connected"
                value="—"
                color="aurora-purple-light"
                isEmpty={true}
              />
              <StatCard
                icon={Monitor}
                title="Load Consumption"
                value="— kW"
                color="emerald-400"
                isEmpty={true}
              />
            </>
          ) : (
            <>
              <StatCard
                icon={Battery}
                title="Current Usage"
                value="— kW"
                color="aurora-green-light"
                isEmpty={true}
              />

              <StatCard
                icon={House}
                title="Daily Total"
                value="— kWh"
                color="aurora-blue-light"
                isEmpty={true}
              />

              <StatCard
                icon={Sun}
                title="Cost Today"
                value="KSh —"
                color="aurora-purple-light"
                isEmpty={true}
              />

              <StatCard
                icon={Monitor}
                title="Efficiency"
                value="—%"
                color="emerald-400"
                isEmpty={true}
              />
            </>
          )}
        </div>

        {/* Empty Chart */}
        <Card className="bg-aurora-card border-aurora-green/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg sm:text-xl text-aurora-green-light">
              {energyProvider === 'Solar' ? 'Real-time Solar Generation' : 'Real-time Energy Usage'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`${isMobile ? 'h-48' : 'h-64'} flex items-center justify-center`}>
              <div className="text-center">
                {energyProvider === 'Solar' ? (
                  <>
                    <Sun className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground">No solar data available</p>
                    <p className="text-sm text-muted-foreground mt-2">Connect your solar inverter to see real-time generation</p>
                  </>
                ) : (
                  <>
                    <Zap className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground">No usage data available</p>
                    <p className="text-sm text-muted-foreground mt-2">Connect your smart meter to see real-time usage</p>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Information Cards */}
        <div className={`grid grid-cols-1 ${isMobile ? 'gap-4' : 'lg:grid-cols-2 gap-6'}`}>
          <Card className="bg-aurora-card border-aurora-blue/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg sm:text-xl text-aurora-blue-light">
                {energyProvider === 'Solar' ? 'Solar Monitoring Benefits' : 'What You\'ll Get'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {energyProvider === 'Solar' ? (
                  <>
                    <div className="flex items-start space-x-3">
                      <Sun className="h-5 w-5 text-aurora-green mt-1" />
                      <div>
                        <h4 className="font-medium">Real-time Solar Generation</h4>
                        <p className="text-sm text-muted-foreground">Track your solar energy production as it happens</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <Battery className="h-5 w-5 text-aurora-blue mt-1" />
                      <div>
                        <h4 className="font-medium">Battery Monitoring</h4>
                        <p className="text-sm text-muted-foreground">Monitor your battery charge levels and health</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <Monitor className="h-5 w-5 text-aurora-purple mt-1" />
                      <div>
                        <h4 className="font-medium">Consumption Analytics</h4>
                        <p className="text-sm text-muted-foreground">Understand your energy consumption patterns</p>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-start space-x-3">
                      <TrendingUp className="h-5 w-5 text-aurora-green mt-1" />
                      <div>
                        <h4 className="font-medium">Real-time Monitoring</h4>
                        <p className="text-sm text-muted-foreground">Track your electricity usage as it happens</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <Battery className="h-5 w-5 text-aurora-blue mt-1" />
                      <div>
                        <h4 className="font-medium">Usage Analytics</h4>
                        <p className="text-sm text-muted-foreground">Detailed breakdowns and efficiency scores</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <Sun className="h-5 w-5 text-aurora-purple mt-1" />
                      <div>
                        <h4 className="font-medium">Cost Optimization</h4>
                        <p className="text-sm text-muted-foreground">Identify peak hours and reduce bills</p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-aurora-card border-aurora-purple/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg sm:text-xl text-aurora-purple-light">
                {energyProvider === 'Solar' ? 'Solar Setup Guide' : 'Getting Started'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {energyProvider === 'Solar' ? (
                  <>
                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 bg-aurora-green rounded-full flex items-center justify-center text-xs font-bold text-black">1</div>
                      <div>
                        <h4 className="font-medium">Find Your Inverter ID</h4>
                        <p className="text-sm text-muted-foreground">Check your solar inverter display or documentation</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 bg-aurora-blue rounded-full flex items-center justify-center text-xs font-bold text-black">2</div>
                      <div>
                        <h4 className="font-medium">Setup Your Profile</h4>
                        <p className="text-sm text-muted-foreground">Enter your details and solar system information</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 bg-aurora-purple rounded-full flex items-center justify-center text-xs font-bold text-black">3</div>
                      <div>
                        <h4 className="font-medium">Start Monitoring</h4>
                        <p className="text-sm text-muted-foreground">Begin tracking your solar energy generation and consumption</p>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 bg-aurora-green rounded-full flex items-center justify-center text-xs font-bold text-black">1</div>
                      <div>
                        <h4 className="font-medium">Find Your Meter Number</h4>
                        <p className="text-sm text-muted-foreground">Check your Kenya Power bill or meter display</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 bg-aurora-blue rounded-full flex items-center justify-center text-xs font-bold text-black">2</div>
                      <div>
                        <h4 className="font-medium">Setup Your Profile</h4>
                        <p className="text-sm text-muted-foreground">Enter your details and meter category</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 bg-aurora-purple rounded-full flex items-center justify-center text-xs font-bold text-black">3</div>
                      <div>
                        <h4 className="font-medium">Start Monitoring</h4>
                        <p className="text-sm text-muted-foreground">Begin tracking your energy usage and costs</p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
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
                {hasMeterConnected ? energyProvider === 'Solar' ? 'Live Solar Data' : 'Live Smart Meter Data' : 'Demo Smart Meter Data'}
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
              disabled={!hasMeterConnected}
            >
              <Zap className="h-4 w-4 mr-2" />
              {hasMeterConnected ? energyProvider === 'Solar' ? 'Get Solar Reading' : 'Get Reading' : 'Setup Required'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Header Stats - Mobile Optimized */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {energyProvider === 'Solar' ? (
          <>
            <StatCard
              icon={Battery}
              title="Battery State"
              value={`${energyData?.battery_state || 0}%`}
              color="aurora-green-light"
              isEmpty={energyData?.battery_state === undefined || energyData?.battery_state === 0}
            />
            <StatCard
              icon={Sun}
              title="Power Generated"
              value={`${energyData?.power_generated?.toFixed(1) || 0} kW`}
              color="aurora-blue-light"
              isEmpty={energyData?.power_generated === undefined || energyData?.power_generated === 0}
            />
            <StatCard
              icon={House}
              title="Batteries Connected"
              value={`${energyData?.battery_count || 1}`}
              color="aurora-purple-light"
              isEmpty={energyData?.battery_count === undefined || energyData?.battery_count === 0}
            />
            <StatCard
              icon={Monitor}
              title="Load Consumption"
              value={`${energyData?.load_consumption?.toFixed(1) || 0} kW`}
              color="emerald-400"
              isEmpty={energyData?.load_consumption === undefined || energyData?.load_consumption === 0}
            />
          </>
        ) : (
          <>
            <StatCard
              icon={Battery}
              title="Current Usage"
              value={`${safeEnergyData.current_usage.toFixed(1)} kW`}
              color="aurora-green-light"
              trend={safeEnergyData.current_usage > 0 ? safeEnergyData.cost_trend : undefined}
              isEmpty={safeEnergyData.current_usage === 0}
            />

            <StatCard
              icon={House}
              title="Daily Total"
              value={`${safeEnergyData.daily_total.toFixed(1)} kWh`}
              color="aurora-blue-light"
              isEmpty={safeEnergyData.daily_total === 0}
            />

            <StatCard
              icon={Sun}
              title="Cost Today"
              value={`KSh ${safeEnergyData.daily_cost.toFixed(2)}`}
              color="aurora-purple-light"
              trend={safeEnergyData.daily_cost > 0 ? safeEnergyData.cost_trend : undefined}
              isEmpty={safeEnergyData.daily_cost === 0}
            />

            <StatCard
              icon={Monitor}
              title="Efficiency"
              value={`${safeEnergyData.efficiency_score}%`}
              color="emerald-400"
              isEmpty={safeEnergyData.efficiency_score === 0}
            />
          </>
        )}
      </div>

      {/* Additional Mobile Stats */}
      {isMobile && (
        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-aurora-card border-aurora-green/20">
            <CardContent className="p-3">
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Weekly Avg</p>
                <p className={`text-lg font-bold text-aurora-green-light ${safeEnergyData.weekly_average === 0 ? 'opacity-50' : ''}`}>
                  {safeEnergyData.weekly_average > 0 ? `${safeEnergyData.weekly_average.toFixed(1)} kWh` : '— kWh'}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-aurora-card border-aurora-blue/20">
            <CardContent className="p-3">
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Peak Time</p>
                <p className={`text-lg font-bold text-aurora-blue-light ${safeEnergyData.peak_usage_time === '00:00' ? 'opacity-50' : ''}`}>
                  {safeEnergyData.peak_usage_time !== '00:00' ? safeEnergyData.peak_usage_time : '—'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Real-time Usage Chart - Mobile Optimized */}
      <Card className="bg-aurora-card border-aurora-green/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg sm:text-xl text-aurora-green-light">
            {energyProvider === 'Solar' ? 'Real-time Solar Generation' : 'Real-time Energy Usage'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`${isMobile ? 'h-48' : 'h-64'}`}>
            {chartData.some(d => d.usage > 0) ? (
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
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Battery className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">
                    {energyProvider === 'Solar' ? 'No solar generation data yet' : 'No usage data yet'}
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    {energyProvider === 'Solar' ? 'Start generating solar energy to see your generation pattern' : 'Start using energy to see your usage pattern'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Hourly Pattern Chart - Only show if we have data */}
      {safeAnalytics.hourlyPattern.length > 0 && (
        <Card className="bg-aurora-card border-aurora-blue/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg sm:text-xl text-aurora-blue-light">
              {energyProvider === 'Solar' ? '24-Hour Solar Generation Pattern' : '24-Hour Usage Pattern'}
            </CardTitle>
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
                    fill={energyProvider === 'Solar' ? "#f59e0b" : "#3b82f6"}
                    name={energyProvider === 'Solar' ? "Generation (kW)" : "Usage (kWh)"}
                    radius={[2, 2, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      <div className={`grid grid-cols-1 ${isMobile ? 'gap-4' : 'lg:grid-cols-2 gap-6'}`}>
        {/* Device Usage Breakdown */}
        <Card className="bg-aurora-card border-aurora-blue/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg sm:text-xl text-aurora-blue-light">
              {energyProvider === 'Solar' ? 'Solar Load Breakdown' : 'Device Usage Breakdown'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {safeAnalytics.deviceBreakdown.some(d => d.cost > 0) ? (
              <>
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
                  {safeAnalytics.deviceBreakdown.slice(0, 5).map((device, index) => (
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
                        <p className="text-xs text-muted-foreground">
                          {energyProvider === 'Solar' ? `${device.cost.toFixed(2)} kW` : `KSh ${device.cost.toFixed(2)}`}
                        </p>
                      </div>
                    </div>
                  ))}
                  {safeAnalytics.deviceBreakdown.length > 5 && (
                    <button
                      className="mt-2 text-sm text-blue-500 hover:underline"
                      onClick={() => setShowAllDevices(!showAllDevices)}
                    >
                      {showAllDevices ? 'Show Less' : 'Show More'}
                    </button>
                  )}
                  {showAllDevices && safeAnalytics.deviceBreakdown.slice(5).map((device, index) => (
                    <div key={`extra-${index}`} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: ['#10b981', '#3b82f6', '#a855f7', '#f59e0b'][(index + 4) % 4] }}
                        />
                        <span className="text-sm">{device.device}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-medium">{device.percentage}%</span>
                        <p className="text-xs text-muted-foreground">
                          {energyProvider === 'Solar' ? `${device.cost.toFixed(2)} kW` : `KSh ${device.cost.toFixed(2)}`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  {energyProvider === 'Solar' ? (
                    <>
                      <Sun className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                      <p className="text-muted-foreground">No solar load data yet</p>
                      <p className="text-sm text-muted-foreground mt-2">Use your solar system to see load breakdown</p>
                    </>
                  ) : (
                    <>
                      <House className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                      <p className="text-muted-foreground">No device data yet</p>
                      <p className="text-sm text-muted-foreground mt-2">Use energy to see device breakdown</p>
                    </>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Weekly Trend Analysis */}
        <Card className="bg-aurora-card border-aurora-purple/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg sm:text-xl text-aurora-purple-light">
              {energyProvider === 'Solar' ? 'Solar Weekly Trend' : 'Weekly Trend'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {safeAnalytics.weeklyTrend.length > 0 && safeAnalytics.weeklyTrend.some(d => d.usage > 0) ? (
              <div className={`${isMobile ? 'h-48' : 'h-64'}`}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={safeAnalytics.weeklyTrend}>
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
                      stroke={energyProvider === 'Solar' ? "#f59e0b" : "#a855f7"}
                      strokeWidth={isMobile ? 2 : 3}
                      dot={{ fill: energyProvider === 'Solar' ? '#f59e0b' : '#a855f7', strokeWidth: 2, r: isMobile ? 3 : 4 }}
                      activeDot={{ r: isMobile ? 4 : 6, stroke: energyProvider === 'Solar' ? '#f59e0b' : '#a855f7', strokeWidth: 2 }}
                      name={energyProvider === 'Solar' ? "Generation (kW)" : "Usage (kWh)"}
                    />
                    {(energyProvider !== 'Solar') && (
                      <Line
                        type="monotone"
                        dataKey="efficiency"
                        stroke="#10b981"
                        strokeWidth={isMobile ? 2 : 3}
                        dot={{ fill: '#10b981', strokeWidth: 2, r: isMobile ? 3 : 4 }}
                        activeDot={{ r: isMobile ? 4 : 6, stroke: '#10b981', strokeWidth: 2 }}
                        name="Efficiency (%)"
                      />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  {energyProvider === 'Solar' ? (
                    <>
                      <SolarPanel className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                      <p className="text-muted-foreground">No solar weekly data yet</p>
                      <p className="text-sm text-muted-foreground mt-2">Use your solar system for a week to see trends</p>
                    </>
                  ) : (
                    <>
                      <TrendingUp className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                      <p className="text-muted-foreground">No weekly data yet</p>
                      <p className="text-sm text-muted-foreground mt-2">Use your meter for a week to see trends</p>
                    </>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Real-time Insights - Only show if we have data */}
      {safeEnergyData.daily_total > 0 && <RealTimeInsights />}
    </div>
  );
};

export default EnergyDashboard;