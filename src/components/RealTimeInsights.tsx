import { useEffect, useState } from 'react';
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
      <Card className="neo-card bg-[#facc15] border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <CardHeader className="pb-2">
          <CardTitle className="text-xl font-black uppercase text-black flex items-center gap-2">
            <div className="p-1.5 bg-black text-[#facc15] neo-brutal shadow-none">
              <Lightbulb className="h-5 w-5" />
            </div>
            NEURAL ANALYSIS
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8">
            <div className="relative">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-black border-t-transparent"></div>
              <Cpu className="h-6 w-6 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-black" />
            </div>
            <p className="mt-4 font-black uppercase text-xs tracking-widest text-black">DECODING ENERGY VECTORS...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="neo-card border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] bg-white dark:bg-slate-900 overflow-hidden">
      <CardHeader className="pb-3 border-b-2 border-black bg-slate-50 dark:bg-slate-800">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-black uppercase text-black dark:text-white flex items-center gap-2 tracking-tight">
            <div className="p-2 bg-black text-white neo-brutal shadow-none">
              <Lightbulb className="h-5 w-5" />
            </div>
            REAL-TIME INTELLIGENCE
          </CardTitle>
          {!hasMeterConnected && (
            <div className="bg-[#facc15] text-black text-[10px] font-black px-2 py-0.5 border-2 border-black uppercase rotate-2">
              SIMULATION MODE
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {insights.length > 0 || mlInsights.length > 0 ? (
          <>
            {/* Category Badge & Status */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="bg-black text-white text-[10px] font-black px-3 py-1 border-2 border-black uppercase">
                {getCategoryDisplayName(meterCategory, industryType).toUpperCase()} CONTEXT
              </div>
              {hasMeterConnected && (
                <div className="bg-aurora-green text-white text-[10px] font-black px-3 py-1 border-2 border-black uppercase flex items-center gap-1">
                  <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
                  LIVE FEED
                </div>
              )}
            </div>

            {/* AI/ML Insights Section */}
            {mlInsights.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center">
                    <Cpu className="h-4 w-4 mr-2" />
                    AI-POWERED PREDICTIONS
                  </h3>
                </div>

                {mlInsights.map((insight) => {
                  const IconComponent = insight.icon;
                  const severityColors = {
                    alert: 'bg-red-500 text-white',
                    warning: 'bg-[#facc15] text-black',
                    success: 'bg-aurora-green text-white',
                    info: 'bg-aurora-blue text-white'
                  };

                  return (
                    <div
                      key={`ml-${insight.id}`}
                      className="border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white dark:bg-slate-800 p-0 overflow-hidden"
                    >
                      <div className={`p-2 border-b-2 border-black flex items-center gap-2 ${severityColors[insight.severity] || severityColors.info}`}>
                         <IconComponent className="h-4 w-4" />
                         <span className="font-black text-[10px] uppercase tracking-tighter">{insight.title}</span>
                      </div>
                      <div className="p-4">
                        <p className="font-bold text-sm text-black dark:text-white leading-tight mb-3">
                          {insight.description}
                        </p>

                        {/* Model Specs */}
                        <div className="flex flex-wrap items-center gap-4 mb-3">
                          <div className="flex flex-col">
                            <span className="text-[8px] font-black uppercase text-slate-500 tracking-widest">Confidence</span>
                            <span className="font-black text-xs text-black dark:text-white">{insight.confidence.toFixed(1)}%</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[8px] font-black uppercase text-slate-500 tracking-widest">Model Architecture</span>
                            <span className="font-black text-xs text-black dark:text-white uppercase">{insight.mlModel}</span>
                          </div>
                        </div>

                        {/* Recommendation */}
                        {insight.recommendation && (
                          <div className="bg-slate-100 dark:bg-black p-3 border-2 border-black border-dashed">
                             <p className="text-[10px] font-black text-slate-500 uppercase mb-1">AI STRATEGY:</p>
                             <p className="font-bold text-xs text-black dark:text-white italic">
                               "{insight.recommendation}"
                             </p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Traditional Rule-Based Insights */}
            <div className="space-y-4">
               {mlInsights.length > 0 && <div className="h-[2px] bg-black dark:bg-slate-700 border-dashed border-b border-black"></div>}
               <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center">
                  <Info className="h-4 w-4 mr-2" />
                  HEURISTIC OBSERVATIONS
               </h3>

              {insights.map((insight) => {
                const IconComponent = insight.icon;
                const severityBorders = {
                  alert: 'border-red-600 bg-red-50 dark:bg-red-900/10',
                  warning: 'border-[#facc15] bg-yellow-50 dark:bg-[#facc15]/5',
                  success: 'border-aurora-green bg-green-50 dark:bg-green-900/10',
                  info: 'border-black bg-white dark:bg-slate-800'
                };

                return (
                  <div
                    key={insight.id}
                    className={`p-4 border-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none ${severityBorders[insight.severity] || severityBorders.info}`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="p-2 bg-black text-white neo-brutal shadow-none shrink-0">
                        <IconComponent className="h-5 w-5" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-start justify-between">
                          <h4 className="font-black text-sm uppercase tracking-tight text-black dark:text-white">
                            {insight.title}
                          </h4>
                          {insight.actionable && !hasMeterConnected && (
                            <Button
                              onClick={() => window.location.hash = '#meter'}
                              className="neo-button h-6 px-2 bg-black text-white text-[8px] font-black shadow-[2px_2px_0px_0px_rgba(255,255,255,0.2)]"
                            >
                              RESOLVE
                            </Button>
                          )}
                        </div>
                        <p className="font-bold text-xs text-slate-600 dark:text-slate-400">
                          {insight.description}
                        </p>
                        {insight.recommendation && (
                          <div className="mt-2 text-[10px] font-black uppercase py-1 px-2 bg-black/5 dark:bg-white/5 inline-block">
                             ACTION: {insight.recommendation}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="text-center py-12 border-2 border-dashed border-slate-300 dark:border-slate-700">
            <div className="bg-slate-100 dark:bg-slate-800 p-4 neo-brutal shadow-none text-slate-400 inline-block mb-4">
              <Info className="h-10 w-10" />
            </div>
            <p className="font-black uppercase text-sm text-black dark:text-white mb-2">TELEMETRY SILENCE</p>
            <p className="text-xs font-bold text-slate-500 max-w-xs mx-auto mb-6">
              {hasMeterConnected
                ? 'Awaiting more data packets to generate high-fidelity behavioral projections.'
                : 'Connect your upstream hardware to broadcast live energy vectors into the neural engine.'}
            </p>
            {!hasMeterConnected && (
               <Button
                 onClick={() => window.location.hash = '#meter'}
                 className="neo-button bg-[#facc15] text-black hover:bg-black hover:text-white font-black uppercase text-xs shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
               >
                 LINK HARDWARE
               </Button>
            )}
          </div>
        )}

        <div className="pt-4 border-t-2 border-black border-dashed">
          <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 leading-relaxed italic">
            [NOTICE] These projections are synthesized via real-time vector analysis and historical usage patterns. Logic is calibrated for {getCategoryDisplayName(meterCategory, industryType).toUpperCase()} architecture.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default RealTimeInsights;