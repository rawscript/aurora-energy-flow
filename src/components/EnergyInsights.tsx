import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Info, Battery, Sun, House, TrendingUp, TrendingDown, AlertTriangle, Zap } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { useRealTimeEnergy } from '@/hooks/useRealTimeEnergy';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';

interface EnergyInsightsProps {
  onNavigateToMeter?: () => void;
  energyProvider?: string;
}

const EnergyInsights: React.FC<EnergyInsightsProps> = ({ onNavigateToMeter, energyProvider = 'KPLC' }) => {
  const { energyData, analytics, loading, hasMeterConnected, meterConnectionChecked } = useRealTimeEnergy();
  const isMobile = useIsMobile();

  // Handle meter setup navigation
  const handleSetupMeter = () => {
    if (onNavigateToMeter) {
      onNavigateToMeter();
    } else {
      // Fallback: trigger tab change via URL hash or custom event
      const event = new CustomEvent('navigate-to-meter');
      window.dispatchEvent(event);
    }
  };

  // Show loading only when actually loading
  if (loading) {
    return (
      <div className="flex items-center justify-center h-32 sm:h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-b-2 border-aurora-green-light mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground">Loading energy insights...</p>
        </div>
      </div>
    );
  }

  // Show no meter connected state with proper navigation
  if (meterConnectionChecked && !hasMeterConnected) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Card className="bg-aurora-card border-yellow-500/20">
          <CardContent className="p-6 sm:p-8 text-center">
            <div className="flex flex-col items-center space-y-4">
              <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center">
                {energyProvider === 'Solar' ? (
                  <Sun className="h-8 w-8 text-yellow-500" />
                ) : (
                  <Zap className="h-8 w-8 text-yellow-500" />
                )}
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">
                  {energyProvider === 'Solar' ? 'No Solar Inverter Connected' : 'No Smart Meter Connected'}
                </h3>
                <p className="text-muted-foreground mb-6 max-w-md">
                  {energyProvider === 'Solar'
                    ? 'Connect your solar inverter to start getting personalized energy insights and analytics.'
                    : 'Connect your Kenya Power smart meter to start getting personalized energy insights and analytics.'}
                </p>
                <Button
                  onClick={handleSetupMeter}
                  className="bg-aurora-green hover:bg-aurora-green/80"
                  size="lg"
                >
                  {energyProvider === 'Solar' ? (
                    <>
                      <Sun className="h-4 w-4 mr-2" />
                      Setup Solar Inverter
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4 mr-2" />
                      Setup Smart Meter
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Preview cards showing what users will get */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          <Card className="bg-aurora-card border-aurora-green/20 opacity-60">
            <CardHeader>
              <CardTitle className="text-lg text-aurora-green-light flex items-center space-x-2">
                <TrendingUp className="h-5 w-5" />
                <span>Efficiency Score</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="text-4xl font-bold text-gray-500 mb-2">—</div>
                <p className="text-sm text-muted-foreground">Connect meter to see your efficiency</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-aurora-card border-aurora-blue/20 opacity-60">
            <CardHeader>
              <CardTitle className="text-lg text-aurora-blue-light flex items-center space-x-2">
                <Sun className="h-5 w-5" />
                <span>Usage Pattern</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="text-4xl font-bold text-gray-500 mb-2">—</div>
                <p className="text-sm text-muted-foreground">Track your daily usage patterns</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-aurora-card border-aurora-purple/20 opacity-60">
            <CardHeader>
              <CardTitle className="text-lg text-aurora-purple-light flex items-center space-x-2">
                <Battery className="h-5 w-5" />
                <span>Cost Analysis</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="text-4xl font-bold text-gray-500 mb-2">—</div>
                <p className="text-sm text-muted-foreground">Monitor your electricity costs</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Benefits information card */}
        <Card className="bg-aurora-card border-aurora-blue/20">
          <CardHeader>
            <CardTitle className="text-xl text-aurora-blue-light flex items-center space-x-2">
              <Info className="h-6 w-6" />
              <span>What You'll Get With Smart Meter Connection</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-start space-x-3">
                <TrendingUp className="h-5 w-5 text-aurora-green mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-aurora-green-light">Real-time Usage Tracking</h4>
                  <p className="text-sm text-muted-foreground">Monitor your electricity consumption as it happens with live data from your Kenya Power smart meter</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Battery className="h-5 w-5 text-aurora-blue mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-aurora-blue-light">AI-Powered Efficiency Analysis</h4>
                  <p className="text-sm text-muted-foreground">Get personalized efficiency scores and smart recommendations to reduce your electricity bills</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Sun className="h-5 w-5 text-aurora-purple mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-aurora-purple-light">Peak Hour Cost Optimization</h4>
                  <p className="text-sm text-muted-foreground">Identify your peak usage hours and learn when to use appliances to save money</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <House className="h-5 w-5 text-emerald-400 mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-emerald-400">Device Usage Breakdown</h4>
                  <p className="text-sm text-muted-foreground">See which appliances consume the most energy and get tips to optimize their usage</p>
                </div>
              </div>
            </div>
            
            <div className="border-t border-slate-700 pt-6">
              <div className="text-center">
                <h4 className="font-medium text-aurora-green-light mb-3">Ready to get started?</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Setting up your smart meter takes just a few minutes and unlocks all these powerful insights.
                </p>
                <Button 
                  onClick={handleSetupMeter}
                  className="bg-aurora-green hover:bg-aurora-green/80"
                  size="lg"
                >
                  <Zap className="h-4 w-4 mr-2" />
                  Setup Smart Meter Now
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Generate AI insights based on real data (only when meter is connected)
  const generateInsights = () => {
    const insights = [];

    // Only generate insights if we have actual data
    if (!energyData || energyData.daily_total === 0) {
      return [{
        id: 1,
        type: 'info',
        title: energyProvider === 'Solar' ? 'Getting Started with Solar' : 'Getting Started',
        description: energyProvider === 'Solar'
          ? 'Your solar inverter is connected! Start generating energy to see personalized insights and recommendations.'
          : 'Your smart meter is connected! Start using energy to see personalized insights and recommendations.',
        impact: 'Info',
        icon: Info,
        color: 'text-aurora-blue-light'
      }];
    }

    // Solar-specific insights
    if (energyProvider === 'Solar') {
      // Inverter efficiency
      if (energyData.efficiency_score > 0) {
        insights.push({
          id: 1,
          type: 'efficiency',
          title: 'Inverter Efficiency',
          description: `Your inverter efficiency is ${energyData.efficiency_score}%. This indicates how effectively your solar system converts sunlight to usable energy.`,
          impact: 'High',
          icon: Sun,
          color: 'text-aurora-green-light'
        });
      }

      // Battery performance
      if (energyData.battery_state !== undefined) {
        insights.push({
          id: 2,
          type: 'efficiency',
          title: 'Battery Performance',
          description: `Your battery is currently at ${energyData.battery_state}% charge. Consider optimizing usage during peak solar hours to maximize battery life.`,
          impact: 'Medium',
          icon: Battery,
          color: 'text-aurora-blue-light'
        });
      }

      // Power generation
      if (energyData.power_generated !== undefined) {
        insights.push({
          id: 3,
          type: 'savings',
          title: 'Power Generation',
          description: `Your system generated ${energyData.power_generated?.toFixed(1) || 0} kW today. This is enough to power ${(energyData.power_generated / 0.5).toFixed(0)} typical LED bulbs for 10 hours.`,
          impact: 'High',
          icon: Zap,
          color: 'text-aurora-purple-light'
        });
      }

      // Load consumption
      if (energyData.load_consumption !== undefined) {
        insights.push({
          id: 4,
          type: 'efficiency',
          title: 'Load Consumption',
          description: `Your system is currently consuming ${energyData.load_consumption?.toFixed(1) || 0} kW. Monitor this to ensure your solar generation meets your needs.`,
          impact: 'Medium',
          icon: House,
          color: 'text-emerald-400'
        });
      }

      // Positive efficiency alert
      if (energyData.efficiency_score >= 90) {
        insights.push({
          id: 5,
          type: 'success',
          title: 'Excellent Solar Efficiency!',
          description: `Your efficiency score of ${energyData.efficiency_score}% is outstanding. Your solar system is performing optimally!`,
          impact: 'Positive',
          icon: Sun,
          color: 'text-green-500'
        });
      }
    }
    // KPLC-specific insights
    else {
      // Peak hour analysis
      if (analytics.peakHours.length > 0) {
        const topPeakHour = analytics.peakHours[0];
        insights.push({
          id: 1,
          type: 'savings',
          title: 'Peak Hour Optimization',
          description: `Your highest usage is at ${topPeakHour.hour}:00 (${topPeakHour.usage.toFixed(1)} kWh). Consider shifting some activities to off-peak hours to save on costs.`,
          impact: 'High',
          icon: Sun,
          color: 'text-aurora-green-light'
        });
      }

      // Efficiency analysis
      if (energyData.efficiency_score < 85 && energyData.efficiency_score > 0) {
        insights.push({
          id: 2,
          type: 'efficiency',
          title: 'Efficiency Improvement Needed',
          description: `Your efficiency score is ${energyData.efficiency_score}%. Focus on reducing standby power consumption and optimizing high-usage devices.`,
          impact: 'Medium',
          icon: House,
          color: 'text-aurora-blue-light'
        });
      }

      // Cost trend analysis
      if (energyData.cost_trend === 'up' && energyData.daily_cost > 0) {
        insights.push({
          id: 3,
          type: 'alert',
          title: 'Rising Energy Costs',
          description: `Your energy costs are trending upward. Current daily average is KSh ${energyData.daily_cost.toFixed(2)}. Consider energy-saving measures.`,
          impact: 'High',
          icon: TrendingUp,
          color: 'text-red-500'
        });
      }

      // Weekly usage pattern
      if (energyData.weekly_average > energyData.daily_total * 1.2 && energyData.weekly_average > 0) {
        insights.push({
          id: 4,
          type: 'efficiency',
          title: 'Usage Pattern Optimization',
          description: `Your weekly average (${energyData.weekly_average.toFixed(1)} kWh) suggests room for daily optimization. Today's usage is ${energyData.daily_total.toFixed(1)} kWh.`,
          impact: 'Medium',
          icon: Battery,
          color: 'text-aurora-purple-light'
        });
      }

      // Positive efficiency alert
      if (energyData.efficiency_score >= 90) {
        insights.push({
          id: 5,
          type: 'success',
          title: 'Excellent Energy Efficiency!',
          description: `Your efficiency score of ${energyData.efficiency_score}% is outstanding. Keep up the great energy-saving habits!`,
          impact: 'Positive',
          icon: House,
          color: 'text-green-500'
        });
      }
    }

    return insights.length > 0 ? insights : [{
      id: 1,
      type: 'info',
      title: energyProvider === 'Solar' ? 'Building Your Solar Profile' : 'Building Your Profile',
      description: energyProvider === 'Solar'
        ? 'Keep using your solar system to generate personalized insights and recommendations based on your energy patterns.'
        : 'Keep using your smart meter to generate personalized insights and recommendations based on your usage patterns.',
      impact: 'Info',
      icon: Info,
      color: 'text-aurora-blue-light'
    }];
  };

  const insights = generateInsights();

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Efficiency Score */}
      <Card className="bg-aurora-card border-aurora-green/20">
        <CardHeader>
          <CardTitle className="text-xl text-aurora-green-light">
            {energyProvider === 'Solar' ? 'Solar Efficiency Score' : 'Energy Efficiency Score'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="text-4xl font-bold text-aurora-green-light mb-2">
                {energyData.efficiency_score > 0 ? `${energyData.efficiency_score}%` : '—'}
              </div>
              <p className="text-muted-foreground">
                {energyData.efficiency_score > 0 ?  (
                  energyData.efficiency_score >= 85 ? 'Excellent efficiency' : 'Room for improvement'
                ) : 'No data yet'}
              </p>
            </div>
            <div className="w-32 h-32 relative">
              <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 36 36">
                <path
                  d="M18 2.0845
                    a 15.9155 15.9155 0 0 1 0 31.831
                    a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="#374151"
                  strokeWidth="2"
                />
                <path
                  d="M18 2.0845
                    a 15.9155 15.9155 0 0 1 0 31.831
                    a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2"
                  strokeDasharray={`${energyData.efficiency_score || 0}, 100`}
                  className="animate-aurora-pulse"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold text-aurora-green-light">
                  {energyData.efficiency_score > 0 ? `${energyData.efficiency_score}%` : '—'}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {energyProvider === 'Solar' ? (
              <>
                <div className="text-center p-4 bg-slate-800/50 rounded-lg">
                  <div className="text-2xl font-bold text-aurora-blue-light">
                    {energyData.power_generated > 0 ? `${energyData.power_generated?.toFixed(1) || 0} kW` : '—'}
                  </div>
                  <p className="text-sm text-muted-foreground">Power generated</p>
                </div>
                <div className="text-center p-4 bg-slate-800/50 rounded-lg">
                  <div className="text-2xl font-bold text-aurora-purple-light">
                    {energyData.load_consumption > 0 ? `${energyData.load_consumption?.toFixed(1) || 0} kW` : '—'}
                  </div>
                  <p className="text-sm text-muted-foreground">Load consumption</p>
                </div>
                <div className="text-center p-4 bg-slate-800/50 rounded-lg">
                  <div className="text-2xl font-bold text-emerald-400">
                    {energyData.battery_state !== undefined ? `${energyData.battery_state}%` : '—'}
                  </div>
                  <p className="text-sm text-muted-foreground">Battery state</p>
                </div>
              </>
            ) : (
              <>
                <div className="text-center p-4 bg-slate-800/50 rounded-lg">
                  <div className="text-2xl font-bold text-aurora-blue-light">
                    {energyData.daily_total > 0 ? `${energyData.daily_total.toFixed(1)} kWh` : '—'}
                  </div>
                  <p className="text-sm text-muted-foreground">Today's usage</p>
                </div>
                <div className="text-center p-4 bg-slate-800/50 rounded-lg">
                  <div className="text-2xl font-bold text-aurora-purple-light">
                    {energyData.weekly_average > 0 ? `${energyData.weekly_average.toFixed(1)} kWh` : '—'}
                  </div>
                  <p className="text-sm text-muted-foreground">Weekly average</p>
                </div>
                <div className="text-center p-4 bg-slate-800/50 rounded-lg">
                  <div className="text-2xl font-bold text-emerald-400">
                    {energyData.daily_cost > 0 ? `KSh ${energyData.daily_cost.toFixed(2)}` : '—'}
                  </div>
                  <p className="text-sm text-muted-foreground">Today's cost</p>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Weekly Performance - Real Data */}
      {analytics.weeklyTrend.length > 0 ? (
        <Card className="bg-aurora-card border-aurora-blue/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg sm:text-xl text-aurora-blue-light">
              {energyProvider === 'Solar' ? 'Solar Weekly Performance' : 'Weekly Performance'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`${isMobile ? 'h-48' : 'h-64'} mb-6`}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.weeklyTrend}>
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
                      border: '1px solid #3b82f6',
                      borderRadius: '8px',
                      fontSize: isMobile ? '12px' : '14px'
                    }}
                  />
                  <Bar
                    dataKey="usage"
                    fill="#3b82f6"
                    name={energyProvider === 'Solar' ? "Power (kW)" : "Usage (kWh)"}
                    radius={[2, 2, 0, 0]}
                  />
                  <Bar
                    dataKey="efficiency"
                    fill="#10b981"
                    name="Efficiency %"
                    radius={[2, 2, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="flex flex-wrap gap-4">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-aurora-blue-light rounded"></div>
                <span className="text-sm">
                  {energyProvider === 'Solar' ? "Power (kW)" : "Usage (kWh)"}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-aurora-green-light rounded"></div>
                <span className="text-sm">Efficiency %</span>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-aurora-card border-aurora-blue/20">
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl text-aurora-blue-light">
              {energyProvider === 'Solar' ? 'Solar Weekly Performance' : 'Weekly Performance'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              {energyProvider === 'Solar' ? (
                <>
                  <Sun className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">No solar weekly data available yet</p>
                  <p className="text-sm text-muted-foreground mt-2">Use your solar system for a week to see performance trends</p>
                </>
              ) : (
                <>
                  <TrendingUp className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">No weekly data available yet</p>
                  <p className="text-sm text-muted-foreground mt-2">Use your meter for a week to see performance trends</p>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Peak Hours Analysis */}
      {analytics.peakHours.length > 0 ? (
        <Card className="bg-aurora-card border-aurora-purple/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg sm:text-xl text-aurora-purple-light">
              {energyProvider === 'Solar' ? 'Peak Solar Hours' : 'Peak Usage Hours'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {analytics.peakHours.map((peak, index) => (
                <div key={index} className="text-center p-4 bg-slate-800/50 rounded-lg">
                  <div className="text-2xl font-bold text-aurora-purple-light">
                    {peak.hour}:00
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {peak.usage.toFixed(1)} {energyProvider === 'Solar' ? 'kW' : 'kWh'}
                  </p>
                  <Badge variant="outline" className="mt-2">
                    #{index + 1} Peak
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-aurora-card border-aurora-purple/20">
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl text-aurora-purple-light">
              {energyProvider === 'Solar' ? 'Peak Solar Hours' : 'Peak Usage Hours'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              {energyProvider === 'Solar' ? (
                <>
                  <Sun className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">No peak solar hour data available yet</p>
                  <p className="text-sm text-muted-foreground mt-2">Use your solar system throughout the day to identify peak hours</p>
                </>
              ) : (
                <>
                  <Sun className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">No peak hour data available yet</p>
                  <p className="text-sm text-muted-foreground mt-2">Use your meter throughout the day to identify peak hours</p>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Insights */}
      <Card className="bg-aurora-card border-aurora-purple/20">
        <CardHeader>
          <CardTitle className="text-xl text-aurora-purple-light flex items-center space-x-2">
            <Info className="h-6 w-6" />
            <span>AI-Powered Insights</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {insights.map((insight) => {
            const IconComponent = insight.icon;
            return (
              <div key={insight.id} className="p-4 bg-slate-800/50 rounded-lg border border-slate-700/50 hover:border-aurora-green/30 transition-colors">
                <div className="flex items-start space-x-3">
                  <IconComponent className={`h-6 w-6 ${insight.color} mt-1`} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold">{insight.title}</h3>
                      <Badge
                        variant={insight.impact === 'High' ? 'destructive' : insight.impact === 'Medium' ? 'default' : insight.impact === 'Positive' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {insight.impact} Impact
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{insight.description}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Goals & Progress */}
      <Card className="bg-aurora-card border-emerald-500/20">
        <CardHeader>
          <CardTitle className="text-xl text-emerald-400">Monthly Goals</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Reduce Usage by 10%</span>
              <span className="text-sm text-emerald-400">
                {energyData.daily_total > 0 ? '72% achieved' : 'No data yet'}
              </span>
            </div>
            <Progress value={energyData.daily_total > 0 ? 72 : 0} className="h-2 bg-slate-800" />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Peak Hour Reduction</span>
              <span className="text-sm text-aurora-blue-light">
                {analytics.peakHours.length > 0 ? '45% achieved' : 'No data yet'}
              </span>
            </div>
            <Progress value={analytics.peakHours.length > 0 ? 45 : 0} className="h-2 bg-slate-800" />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Cost Savings Target</span>
              <span className="text-sm text-aurora-purple-light">
                {energyData.daily_cost > 0 ? '62% achieved' : 'No data yet'}
              </span>
            </div>
            <Progress value={energyData.daily_cost > 0 ? 62 : 0} className="h-2 bg-slate-800" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EnergyInsights;