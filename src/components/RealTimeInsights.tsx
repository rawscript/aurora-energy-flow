import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Lightbulb, AlertTriangle, Info } from 'lucide-react';
import { useRealTimeEnergy } from '@/hooks/useRealTimeEnergy';

const RealTimeInsights = () => {
  const { energyData, analytics, hasMeterConnected, error, loading } = useRealTimeEnergy();
  
  // Generate insights based on data patterns
  const generateInsights = () => {
    const insights = [];
    
    // If no meter connected, add a clear indicator
    if (!hasMeterConnected) {
      insights.push({
        type: 'no-meter',
        title: 'No Meter Connected',
        description: 'Connect your smart meter to get personalized energy insights and real-time data.',
        icon: <Info className="h-5 w-5 text-amber-400" />,
        severity: 'warning'
      });
      return insights;
    }
    
    // If there's an error, show it
    if (error) {
      insights.push({
        type: 'error',
        title: 'Data Unavailable',
        description: error,
        icon: <AlertTriangle className="h-5 w-5 text-red-400" />,
        severity: 'alert'
      });
      return insights;
    }
    
    // Check for peak usage times
    if (analytics.peakHours?.length > 0) {
      const firstPeak = analytics.peakHours[0];
      if (firstPeak && typeof firstPeak.hour === 'number') {
        insights.push({
          type: 'peak',
          title: 'Peak Usage Detected',
          description: `Your highest energy usage occurs at ${firstPeak.hour}:00. Consider shifting some activities to off-peak hours.`,
          icon: <TrendingUp className="h-5 w-5 text-amber-400" />,
          severity: 'warning'
        });
      }
    }
    
    // Check for cost trends
    if (energyData.cost_trend === 'up') {
      insights.push({
        type: 'cost',
        title: 'Rising Energy Costs',
        description: 'Your energy costs are trending upward. Check for devices that might be using more power than usual.',
        icon: <TrendingUp className="h-5 w-5 text-red-400" />,
        severity: 'alert'
      });
    } else if (energyData.cost_trend === 'down') {
      insights.push({
        type: 'cost',
        title: 'Decreasing Energy Costs',
        description: 'Your energy costs are trending downward. Keep up the good work!',
        icon: <TrendingDown className="h-5 w-5 text-green-400" />,
        severity: 'success'
      });
    }
    
    // Check for efficiency score
    if (energyData.efficiency_score < 70) {
      insights.push({
        type: 'efficiency',
        title: 'Low Efficiency Score',
        description: 'Your energy efficiency score is below average. Consider upgrading to energy-efficient appliances.',
        icon: <AlertTriangle className="h-5 w-5 text-red-400" />,
        severity: 'alert'
      });
    } else if (energyData.efficiency_score > 90) {
      insights.push({
        type: 'efficiency',
        title: 'Excellent Efficiency',
        description: 'Your energy efficiency score is excellent. You\'re using energy wisely!',
        icon: <Lightbulb className="h-5 w-5 text-green-400" />,
        severity: 'success'
      });
    }
    
    // Check device breakdown for optimization opportunities
    if (analytics.deviceBreakdown && analytics.deviceBreakdown.length > 0) {
      const highestDevice = analytics.deviceBreakdown.reduce((prev, current) => 
        (prev.percentage > current.percentage) ? prev : current
      );
      
      if (highestDevice.percentage > 40) {
        insights.push({
          type: 'device',
          title: `High ${highestDevice.device} Usage`,
          description: `${highestDevice.device} accounts for ${highestDevice.percentage}% of your energy usage. Consider optimizing this category.`,
          icon: <Info className="h-5 w-5 text-blue-400" />,
          severity: 'info'
        });
      }
    }
    
    // If no insights, add a default one
    if (insights.length === 0) {
      insights.push({
        type: 'default',
        title: 'Energy Usage Normal',
        description: 'Your energy usage patterns appear normal. Continue monitoring for future insights.',
        icon: <Info className="h-5 w-5 text-blue-400" />,
        severity: 'info'
      });
    }
    
    return insights;
  };
  
  const insights = generateInsights();
  
  if (loading) {
    return (
      <Card className="bg-aurora-card border-aurora-purple/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg text-aurora-purple-light flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Real-Time Energy Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-aurora-purple-light mx-auto mb-4"></div>
              <p className="text-sm text-muted-foreground">Loading energy insights...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="bg-aurora-card border-aurora-purple/20">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg text-aurora-purple-light flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Real-Time Energy Insights
          </CardTitle>
          {!hasMeterConnected && (
            <Badge variant="outline" className="bg-amber-500/20 text-amber-400 border-amber-500/30">
              No Meter
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {insights.map((insight, index) => (
          <div 
            key={index} 
            className={`p-3 rounded-lg flex items-start space-x-3 ${
              insight.severity === 'alert' ? 'bg-red-500/10 border border-red-500/20' :
              insight.severity === 'warning' ? 'bg-amber-500/10 border border-amber-500/20' :
              insight.severity === 'success' ? 'bg-green-500/10 border border-green-500/20' :
              'bg-blue-500/10 border border-blue-500/20'
            }`}
          >
            <div className="mt-0.5">{insight.icon}</div>
            <div>
              <h4 className={`font-medium ${
                insight.severity === 'alert' ? 'text-red-400' :
                insight.severity === 'warning' ? 'text-amber-400' :
                insight.severity === 'success' ? 'text-green-400' :
                'text-blue-400'
              }`}>
                {insight.title}
              </h4>
              <p className="text-sm text-muted-foreground">{insight.description}</p>
            </div>
          </div>
        ))}
        
        <div className="pt-2 text-xs text-muted-foreground">
          {hasMeterConnected 
            ? 'Insights are generated based on your actual energy usage patterns.'
            : 'Connect your smart meter to get personalized insights based on your actual usage.'}
        </div>
      </CardContent>
    </Card>
  );
};

export default RealTimeInsights;