import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Lightbulb, AlertTriangle, Info, ExternalLink, Sun, Zap, Cpu } from 'lucide-react';
import { useRealTimeEnergy } from '@/hooks/useRealTimeEnergy';
import { useProfile } from '@/hooks/useProfile';
import { useEnergyProvider } from '@/contexts/EnergyProviderContext'; // Import energy provider context
import { generateMeterSpecificInsights, getCategoryDisplayName, type MeterCategory, type IndustryType } from '@/utils/meterInsights';
import { enhancedAIService, type MLInsight, type EnergyReading } from '@/services/EnhancedAIService';

const RealTimeInsights = () => {
  const { provider: energyProvider, providerConfig } = useEnergyProvider(); // Get energy provider from context
  const { energyData, analytics, hasMeterConnected, error, loading, recentReadings } = useRealTimeEnergy(energyProvider || 'KPLC');
  const { profile } = useProfile();

  // Get meter category and industry type from profile with fallbacks
  const meterCategory = (profile?.meter_category as MeterCategory) || 'household';
  const industryType = profile?.industry_type as IndustryType;

  // State for ML insights
  const [mlInsights, setMlInsights] = useState<MLInsight[]>([]);
  const [mlLoading, setMlLoading] = useState(false);

  // Generate meter-specific insights
  const insights = generateMeterSpecificInsights(
    energyData,
    analytics,
    meterCategory,
    industryType,
    hasMeterConnected,
    energyProvider // Pass energy provider to generate solar-specific insights
  );

  // Generate ML insights when we have enough data
  useEffect(() => {
    const generateMLInsightsData = async () => {
      if (hasMeterConnected && recentReadings && recentReadings.length >= 7) {
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

          const generatedInsights = await enhancedAIService.generateMLInsights(
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
  }, [hasMeterConnected, recentReadings, meterCategory, industryType]);

  // Handle error state by adding error insight
  if (error && insights.length > 0) {
    insights.unshift({
      id: 'error',
      type: 'alert',
      title: 'Data Unavailable',
      description: error,
      icon: AlertTriangle,
      severity: 'alert',
      category: meterCategory,
      industryType,
      priority: 10
    });
  }

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
        {insights.length > 0 || mlInsights.length > 0 ? (
          <>
            {/* Category Badge */}
            <div className="flex items-center justify-between mb-4">
              <Badge variant="outline" className="bg-aurora-purple/20 text-aurora-purple-light border-aurora-purple/30">
                {getCategoryDisplayName(meterCategory, industryType)} Insights
              </Badge>
              {hasMeterConnected && (
                <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500/30">
                  Live Data
                </Badge>
              )}
            </div>

            {/* ML Insights Section */}
            {mlInsights.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-md font-semibold text-aurora-green-light flex items-center">
                    <Cpu className="h-4 w-4 mr-2" />
                    AI-Powered ML Insights
                  </h3>
                  <Badge variant="outline" className="bg-aurora-green/20 text-aurora-green-light border-aurora-green/30">
                    {mlInsights.length} insights
                  </Badge>
                </div>

                {mlInsights.map((insight) => {
                  const IconComponent = insight.icon;
                  return (
                    <div
                      key={`ml-${insight.id}`}
                      className={`p-3 rounded-lg border transition-all hover:border-opacity-50 mb-3 ${insight.severity === 'alert' ? 'bg-red-500/10 border-red-500/20 hover:bg-red-500/15' :
                        insight.severity === 'warning' ? 'bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/15' :
                          insight.severity === 'success' ? 'bg-green-500/10 border-green-500/20 hover:bg-green-500/15' :
                            'bg-blue-500/10 border-blue-500/20 hover:bg-blue-500/15'
                        }`}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="mt-0.5">
                          <IconComponent className={`h-5 w-5 ${insight.severity === 'alert' ? 'text-red-400' :
                            insight.severity === 'warning' ? 'text-amber-400' :
                              insight.severity === 'success' ? 'text-green-400' :
                                'text-blue-400'
                            }`} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className={`font-medium ${insight.severity === 'alert' ? 'text-red-400' :
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
              </div>
            )}

            {/* Traditional Insights */}
            {insights.map((insight) => {
              const IconComponent = insight.icon;
              return (
                <div
                  key={insight.id}
                  className={`p-3 rounded-lg border transition-all hover:border-opacity-50 ${insight.severity === 'alert' ? 'bg-red-500/10 border-red-500/20 hover:bg-red-500/15' :
                    insight.severity === 'warning' ? 'bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/15' :
                      insight.severity === 'success' ? 'bg-green-500/10 border-green-500/20 hover:bg-green-500/15' :
                        'bg-blue-500/10 border-blue-500/20 hover:bg-blue-500/15'
                    }`}
                >
                  <div className="flex items-start space-x-3">
                    <div className="mt-0.5">
                      <IconComponent className={`h-5 w-5 ${insight.severity === 'alert' ? 'text-red-400' :
                        insight.severity === 'warning' ? 'text-amber-400' :
                          insight.severity === 'success' ? 'text-green-400' :
                            'text-blue-400'
                        }`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className={`font-medium ${insight.severity === 'alert' ? 'text-red-400' :
                            insight.severity === 'warning' ? 'text-amber-400' :
                              insight.severity === 'success' ? 'text-green-400' :
                                'text-blue-400'
                            }`}>
                            {insight.title}
                          </h4>
                          <p className="text-sm text-muted-foreground mt-1">{insight.description}</p>

                          {/* Recommendation */}
                          {insight.recommendation && (
                            <div className="mt-2 p-2 bg-slate-800/50 rounded border border-slate-700/50">
                              <p className="text-xs text-gray-300">
                                <strong className="text-aurora-green-light">Recommendation:</strong> {insight.recommendation}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Action Button */}
                        {insight.actionable && !hasMeterConnected && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="ml-3 text-xs border-aurora-green/30 hover:bg-aurora-green/10"
                            onClick={() => window.location.hash = '#meter'}
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            Setup
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </>
        ) : (
          <div className="text-center py-8">
            <Info className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">No insights available</p>
            <p className="text-sm text-muted-foreground mt-2">
              {hasMeterConnected
                ? 'Start using energy to generate insights'
                : energyProvider === 'Solar'
                  ? 'Connect your solar inverter to get personalized insights'
                  : `Connect your ${providerConfig.terminology.device} to get personalized insights`}
            </p>
          </div>
        )}

        <div className="pt-2 text-xs text-muted-foreground border-t border-slate-700/50">
          {hasMeterConnected
            ? `Insights are tailored for ${getCategoryDisplayName(meterCategory, industryType).toLowerCase()} usage patterns based on your actual energy data.`
            : energyProvider === 'Solar'
              ? 'Connect your solar inverter to get personalized insights based on your actual solar generation patterns.'
              : `Connect your ${providerConfig.terminology.device} to get personalized insights based on your actual usage patterns.`}
        </div>
      </CardContent>
    </Card>
  );
};

export default RealTimeInsights;