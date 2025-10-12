import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Info, Battery, Sun, House, TrendingUp, TrendingDown, AlertTriangle, Zap, Cpu } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { useRealTimeEnergy } from '@/hooks/useRealTimeEnergy';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { useEnergyProvider } from '@/contexts/EnergyProviderContext';
import { useMeter } from '@/contexts/MeterContext'; // Import meter context
import { generateMLInsights, type MLInsight, type EnergyReading } from '@/utils/mlInsights';

interface EnergyInsightsProps {
  onNavigateToMeter?: () => void;
}

// Generate AI insights based on real data (only when meter is connected)
const generateInsights = () => {
  const insights = [];

  // Example insight
  insights.push({
    id: '1',
    icon: TrendingUp,
    title: 'Usage Increased',
    description: 'Your energy usage has increased by 15% compared to last week.',
    color: 'text-aurora-green',
    impact: 'Medium',
  });

  // Add more insights as needed

  return insights;
};

const EnergyInsights: React.FC<EnergyInsightsProps> = ({ onNavigateToMeter }) => {
  const { provider: energyProvider, providerConfig } = useEnergyProvider();
  const { status: meterStatus, deviceType } = useMeter(); // Get meter status from context
  const { energyData, analytics, loading, recentReadings } = useRealTimeEnergy(energyProvider);
  const isMobile = useIsMobile();
  
  // State for ML insights
  const [mlInsights, setMlInsights] = useState<MLInsight[]>([]);
  const [mlLoading, setMlLoading] = useState(false);
  
  // Get meter category from energy data or fallback
  const meterCategory = energyData.meter_category || 'household';
  const industryType = energyData.industry_type;

  // Generate ML insights when we have enough data
  useEffect(() => {
    const generateMLInsightsData = async () => {
      if (meterStatus === 'connected' && recentReadings && recentReadings.length >= 7) {
        try {
          setMlLoading(true);
          // Convert energy readings to the format expected by ML insights
          const energyReadings: EnergyReading[] = recentReadings.map(reading => ({
            id: reading.id,
            user_id: reading.user_id,
            meter_number: reading.meter_number,
            reading_date: reading.reading_date,
            kwh_consumed: reading.kwh_consumed,
            total_cost: reading.total_cost,
            peak_demand: reading.peak_usage,
            power_factor: 0.8, // Default value, would come from actual data
            voltage: 240, // Default value, would come from actual data
            current: reading.kwh_consumed / 240, // Rough calculation, would come from actual data
            frequency: 50 // Default value, would come from actual data
          }));
          
          const generatedInsights = await generateMLInsights(
            meterCategory,
            industryType,
            energyReadings
          );
          
          setMlInsights(generatedInsights);
        } catch (error) {
          console.error('Error generating ML insights:', error);
        } finally {
          setMlLoading(false);
        }
      }
    };
    
    generateMLInsightsData();
  }, [meterStatus, recentReadings, meterCategory, industryType]);

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

  // Determine if meter is connected based on context
  const hasMeterConnected = meterStatus === 'connected';
  const meterConnectionChecked = meterStatus !== 'checking';

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
                  {energyProvider === 'Solar' ? 'No Solar Inverter Connected' : `No ${providerConfig.name} ${providerConfig.terminology.device.charAt(0).toUpperCase() + providerConfig.terminology.device.slice(1)} Connected`}
                </h3>
                <p className="text-muted-foreground mb-6 max-w-md">
                  {energyProvider === 'Solar'
                    ? 'Connect your solar inverter to start getting personalized energy insights and analytics.'
                    : `Connect your ${providerConfig.name} ${providerConfig.terminology.device} to start getting personalized energy insights and analytics.`}
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
                      {`Setup ${providerConfig.terminology.device.charAt(0).toUpperCase() + providerConfig.terminology.device.slice(1)}`}
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
              <span>What You'll Get With {providerConfig.name} Connection</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-start space-x-3">
                <TrendingUp className="h-5 w-5 text-aurora-green mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-aurora-green-light">Real-time Usage Tracking</h4>
                  <p className="text-sm text-muted-foreground">Monitor your electricity consumption as it happens with live data from your {providerConfig.name} {providerConfig.terminology.device}</p>
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
                  {`Setting up your ${providerConfig.terminology.device} takes just a few minutes and unlocks all these powerful insights.`}
                </p>
                <Button 
                  onClick={handleSetupMeter}
                  className="bg-aurora-green hover:bg-aurora-green/80"
                  size="lg"
                >
                  <Zap className="h-4 w-4 mr-2" />
                  {`Setup ${providerConfig.name} ${providerConfig.terminology.device.charAt(0).toUpperCase() + providerConfig.terminology.device.slice(1)} Now`}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const insights = generateInsights();

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Generate AI insights based on real data (only when meter is connected) */}
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

      {/* ML Insights Section */}
      {mlInsights.length > 0 && (
        <Card className="bg-aurora-card border-aurora-purple/20">
          <CardHeader>
            <CardTitle className="text-xl text-aurora-purple-light flex items-center space-x-2">
              <Cpu className="h-6 w-6" />
              <span>AI-Powered ML Insights</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {mlInsights.map((insight) => {
              const IconComponent = insight.icon;
              return (
                <div 
                  key={`ml-${insight.id}`} 
                  className={`p-4 rounded-lg border transition-all hover:border-opacity-50 ${
                    insight.severity === 'alert' ? 'bg-red-500/10 border-red-500/20 hover:bg-red-500/15' :
                    insight.severity === 'warning' ? 'bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/15' :
                    insight.severity === 'success' ? 'bg-green-500/10 border-green-500/20 hover:bg-green-500/15' :
                    'bg-blue-500/10 border-blue-500/20 hover:bg-blue-500/15'
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <div className="mt-0.5">
                      <IconComponent className={`h-6 w-6 ${
                        insight.severity === 'alert' ? 'text-red-400' :
                        insight.severity === 'warning' ? 'text-amber-400' :
                        insight.severity === 'success' ? 'text-green-400' :
                        'text-blue-400'
                      }`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className={`font-medium ${
                            insight.severity === 'alert' ? 'text-red-400' :
                            insight.severity === 'warning' ? 'text-amber-400' :
                            insight.severity === 'success' ? 'text-green-400' :
                            'text-blue-400'
                          }`}>
                            {insight.title}
                          </h4>
                          <p className="text-sm text-muted-foreground mt-1">{insight.description}</p>
                          
                          {/* Confidence and Model Info */}
                          <div className="flex items-center mt-2 text-xs text-gray-400">
                            <span className="mr-3">Confidence: {insight.confidence.toFixed(1)}%</span>
                            <span>Model: {insight.mlModel}</span>
                          </div>
                          
                          {/* Recommendation */}
                          {insight.recommendation && (
                            <div className="mt-2 p-2 bg-slate-800/50 rounded border border-slate-700/50">
                              <p className="text-xs text-gray-300">
                                <strong className="text-aurora-green-light">Recommendation:</strong> {insight.recommendation}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Efficiency Score */}
      <Card className="bg-aurora-card border-aurora-green/20">
        <CardHeader>
          <CardTitle className="text-xl text-aurora-green-light">
            {energyProvider === 'Solar' ? 'Solar Efficiency Score' : `${providerConfig.name} Efficiency Score`}
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
              {energyProvider === 'Solar' ? 'Solar Weekly Performance' : `${providerConfig.name} Weekly Performance`}
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
              {energyProvider === 'Solar' ? 'Solar Weekly Performance' : `${providerConfig.name} Weekly Performance`}
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
                  <p className="text-sm text-muted-foreground mt-2">Use your {providerConfig.terminology.device} for a week to see performance trends</p>
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
              {energyProvider === 'Solar' ? 'Peak Solar Hours' : `Peak ${providerConfig.name} Hours`}
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
              {energyProvider === 'Solar' ? 'Peak Solar Hours' : `Peak ${providerConfig.name} Hours`}
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
                  <p className="text-sm text-muted-foreground mt-2">Use your {providerConfig.terminology.device} throughout the day to identify peak hours</p>
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
              <div key={`insight-${insight.id}`} className="p-4 bg-slate-800/50 rounded-lg border border-slate-700/50 hover:border-aurora-green/30 transition-colors">
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