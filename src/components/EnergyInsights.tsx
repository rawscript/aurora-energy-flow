
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Info, Battery, Sun, House, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { useRealTimeEnergy } from '@/hooks/useRealTimeEnergy';
import { useIsMobile } from '@/hooks/use-mobile';

const EnergyInsights = () => {
  const { energyData, analytics, loading } = useRealTimeEnergy();
  const isMobile = useIsMobile();

  // Generate AI insights based on real data
  const generateInsights = () => {
    const insights = [];

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
    if (energyData.efficiency_score < 85) {
      insights.push({
        id: 2,
        type: 'efficiency',
        title: 'Efficiency Improvement Needed',
        description: `Your estimated efficiency score is ${energyData.efficiency_score}%. Focus on reducing standby power consumption and optimizing high-usage devices.`,
        impact: 'Medium',
        icon: House,
        color: 'text-aurora-blue-light'
      });
    }

    // Cost trend analysis
    if (energyData.cost_trend === 'up') {
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
    if (energyData.weekly_average > energyData.daily_total * 1.2) {
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

    return insights;
  };

  const insights = generateInsights();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32 sm:h-64">
        <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-b-2 border-aurora-green-light"></div>
      </div>
    );
  }
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Efficiency Score */}
      <Card className="bg-aurora-card border-aurora-green/20">
        <CardHeader>
          <CardTitle className="text-xl text-aurora-green-light">Estimated Energy Efficiency Score</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="text-4xl font-bold text-aurora-green-light mb-2">87%</div>
              <p className="text-muted-foreground">Above average efficiency</p>
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
                  strokeDasharray="87, 100"
                  className="animate-aurora-pulse"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                {/* <span className="text-2xl font-bold text-aurora-green-light"> 
                  {}
                </span>estimated  **/}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-slate-800/50 rounded-lg">
              <div className="text-2xl font-bold text-aurora-blue-light">+12%</div>
              <p className="text-sm text-muted-foreground">vs last month</p>
            </div>
            <div className="text-center p-4 bg-slate-800/50 rounded-lg">
              <div className="text-2xl font-bold text-aurora-purple-light">
                {/*
                implement logic to show position in neighbourhood
                */}
              </div>
              <p className="text-sm text-muted-foreground">in neighborhood</p>
            </div>
            <div className="text-center p-4 bg-slate-800/50 rounded-lg">
              <div className="text-2xl font-bold text-emerald-400">
                {/*update call to show what has been saved */}
              </div>
              <p className="text-sm text-muted-foreground">saved this month</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Weekly Performance - Real Data */}
      <Card className="bg-aurora-card border-aurora-blue/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg sm:text-xl text-aurora-blue-light">Weekly Performance</CardTitle>
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
                <Bar dataKey="usage" fill="#3b82f6" name="Usage (kWh)" radius={[2, 2, 0, 0]} />
                <Bar dataKey="efficiency" fill="#10b981" name="Efficiency %" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="flex flex-wrap gap-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-aurora-blue-light rounded"></div>
              <span className="text-sm">Usage (kWh)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-aurora-green-light rounded">
                {/*potentially redudant */}
              </div>
              <span className="text-sm">Efficiency %</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Peak Hours Analysis */}
      {analytics.peakHours.length > 0 && (
        <Card className="bg-aurora-card border-aurora-purple/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg sm:text-xl text-aurora-purple-light">Peak Usage Hours</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {analytics.peakHours.map((peak, index) => (
                <div key={index} className="text-center p-4 bg-slate-800/50 rounded-lg">
                  <div className="text-2xl font-bold text-aurora-purple-light">
                    {peak.hour}:00
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {peak.usage.toFixed(1)} kWh
                  </p>
                  <Badge variant="outline" className="mt-2">
                    #{index + 1} Peak
                  </Badge>
                </div>
              ))}
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
                        variant={insight.impact === 'High' ? 'destructive' : insight.impact === 'Medium' ? 'default' : 'secondary'}
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
              <span className="text-sm font-medium">{/*Reduce Usage by X add logic to track this*/}</span>
              <span className="text-sm text-emerald-400">{/* X% achieved logic to show what percent of goals has been achieved*/}</span>
            </div>
            <Progress value={72} className="h-2 bg-slate-800" />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Peak Hour Reduction</span>
              <span className="text-sm text-aurora-blue-light">{/*X% achieved of performance reduction logic */}</span>
            </div>
            <Progress value={45} className="h-2 bg-slate-800" />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Cost Savings Target</span>
              <span className="text-sm text-aurora-purple-light">{/*X% achieved logic to calculate*/}</span>
            </div>
            <Progress value={62} className="h-2 bg-slate-800" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EnergyInsights;
{/*Add logic to calculate percentage of goals achieved with a differenciated parameter to ensure that the function is reuseable in Bill calculator
  Update logic to calculate savings */}