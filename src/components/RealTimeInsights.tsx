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
      <Card className="overflow-hidden animate-pulse">
        <CardHeader className="pb-6 border-b border-white/5 bg-white/5">
          <CardTitle className="text-xl font-bold text-white flex items-center gap-3">
            <div className="p-2 rounded-xl bg-aurora-green/10 border border-aurora-green/20">
              <Lightbulb className="h-5 w-5 text-aurora-green-light" />
            </div>
            AI ANALYSIS
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-8">
          <div className="flex flex-col items-center justify-center py-12">
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-aurora-green/20 rounded-full blur-xl animate-pulse"></div>
              <div className="relative p-4 bg-white/5 rounded-full border border-white/10">
                <Cpu className="h-8 w-8 text-aurora-green-light animate-spin-slow" />
              </div>
            </div>
            <p className="font-bold text-xs tracking-widest text-slate-400 uppercase">Synchronizing neural pathways...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border-white/10">
      <CardHeader className="pb-6 border-b border-white/5 bg-white/5">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-bold text-white flex items-center gap-3 tracking-tight">
            <div className="p-2 rounded-xl bg-aurora-green/10 border border-aurora-green/20">
              <Lightbulb className="h-5 w-5 text-aurora-green-light transition-transform hover:scale-110" />
            </div>
            NEURAL INTELLIGENCE
          </CardTitle>
          {!hasMeterConnected && (
            <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20 font-bold text-[10px] uppercase tracking-widest px-3 py-1">
              SIMULATION
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-8">
        {insights.length > 0 || mlInsights.length > 0 ? (
          <>
            {/* Context Header */}
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="secondary" className="bg-white/5 text-slate-300 border-white/10 font-bold text-[10px] uppercase tracking-widest px-3 py-1">
                {getCategoryDisplayName(meterCategory, industryType).toUpperCase()} NODE
              </Badge>
              {hasMeterConnected && (
                <Badge variant="secondary" className="bg-aurora-green/10 text-aurora-green-light border-aurora-green/20 font-bold text-[10px] uppercase tracking-widest px-3 py-1 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-aurora-green-light rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                  LIVE FEED
                </Badge>
              )}
            </div>

            {/* AI/ML Predictions Section */}
            {mlInsights.length > 0 && (
              <div className="space-y-6">
                <div className="flex items-center space-x-3">
                   <div className="w-8 h-[1px] bg-aurora-green/30"></div>
                   <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 flex items-center">
                    <Cpu className="h-4 w-4 mr-2 text-aurora-green-light" />
                    PREDICTIVE VECTORS
                  </h3>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {mlInsights.map((insight) => {
                    const IconComponent = insight.icon;
                    const severityStyles = {
                      alert: 'bg-red-500/10 border-red-500/20 text-red-400',
                      warning: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400',
                      success: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
                      info: 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                    };

                    return (
                      <div
                        key={`ml-${insight.id}`}
                        className="rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden group hover:border-white/10 transition-all duration-300"
                      >
                        <div className={`p-4 border-b border-white/5 flex items-center justify-between ${severityStyles[insight.severity] || severityStyles.info}`}>
                           <div className="flex items-center gap-3">
                             <IconComponent className="h-5 w-5" />
                             <span className="font-bold text-xs uppercase tracking-widest">{insight.title}</span>
                           </div>
                           <Badge variant="outline" className="text-[10px] font-bold uppercase border-current/20 bg-current/5">
                             {insight.confidence.toFixed(0)}% MATCH
                           </Badge>
                        </div>
                        <div className="p-5">
                          <p className="font-medium text-sm text-slate-300 leading-relaxed mb-6">
                            {insight.description}
                          </p>

                          <div className="grid grid-cols-2 gap-6 mb-6">
                            <div className="space-y-1">
                              <span className="text-[9px] font-bold uppercase text-slate-500 tracking-wider block">Neural Model</span>
                              <span className="font-bold text-xs text-white uppercase tracking-tight">{insight.mlModel}</span>
                            </div>
                            <div className="space-y-1">
                              <span className="text-[9px] font-bold uppercase text-slate-500 tracking-wider block">Protocol</span>
                              <span className="font-bold text-xs text-white uppercase tracking-tight">Active Sync</span>
                            </div>
                          </div>

                          {insight.recommendation && (
                            <div className="bg-aurora-green/5 p-4 rounded-xl border border-aurora-green/10 relative overflow-hidden group-hover:bg-aurora-green/10 transition-colors">
                               <div className="absolute top-0 right-0 p-2 opacity-10">
                                 <Cpu className="h-8 w-8 text-aurora-green-light" />
                               </div>
                               <p className="text-[10px] font-bold text-aurora-green-light uppercase tracking-widest mb-2">OPTIMIZATION PROTOCOL:</p>
                               <p className="font-medium text-xs text-slate-200 italic leading-relaxed">
                                 "{insight.recommendation}"
                               </p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Observations Section */}
            <div className="space-y-6">
               <div className="flex items-center space-x-3">
                  <div className="w-8 h-[1px] bg-slate-700"></div>
                  <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 flex items-center">
                    <Info className="h-4 w-4 mr-2" />
                    PATTERN RECOGNITION
                  </h3>
               </div>

              <div className="grid grid-cols-1 gap-4">
                {insights.map((insight) => {
                  const IconComponent = insight.icon;
                  const severityStyles = {
                    alert: 'bg-red-500/10 border-red-500/20 text-red-400',
                    warning: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400',
                    success: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
                    info: 'bg-white/5 border-white/10 text-white'
                  };

                  return (
                    <div
                      key={insight.id}
                      className={`p-5 rounded-2xl border transition-all duration-300 hover:bg-white/[0.05] group ${severityStyles[insight.severity] || severityStyles.info}`}
                    >
                      <div className="flex items-start gap-5">
                        <div className="p-3 rounded-xl bg-black/20 border border-white/10 group-hover:scale-110 transition-transform">
                          <IconComponent className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-bold text-sm uppercase tracking-tight text-white truncate mr-4">
                              {insight.title}
                            </h4>
                            {insight.actionable && !hasMeterConnected && (
                              <Button
                                onClick={() => window.location.hash = '#meter'}
                                variant="outline"
                                className="h-7 px-3 border-current/30 hover:bg-current/10 text-[10px] font-bold uppercase tracking-widest"
                              >
                                RESOLVE
                              </Button>
                            )}
                          </div>
                          <p className="font-medium text-xs text-slate-400 leading-relaxed mb-4">
                            {insight.description}
                          </p>
                          {insight.recommendation && (
                            <Badge variant="outline" className="bg-white/5 text-[9px] font-bold uppercase tracking-widest px-3 py-1 border-white/5 text-slate-300">
                               STRATEGY: {insight.recommendation}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-24 px-6 rounded-3xl bg-white/[0.02] border border-dashed border-white/10">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6 mx-auto relative">
              <div className="absolute inset-0 bg-slate-500/10 rounded-full blur-2xl"></div>
              <Info className="h-10 w-10 text-slate-500 relative z-10" />
            </div>
            <h3 className="text-lg font-bold text-white mb-3 uppercase tracking-widest">Telemetry Silence</h3>
            <p className="text-sm font-medium text-slate-400 max-w-sm mx-auto mb-10 leading-relaxed">
              {hasMeterConnected
                ? 'The neural engine is accumulating data packets. Pattern manifestation will occur shortly.'
                : 'Neural downlink inactive. Establish a connection to broadcast real-time energy vectors into the core.'}
            </p>
            {!hasMeterConnected && (
               <Button
                 onClick={() => window.location.hash = '#meter'}
                 className="h-12 px-10 font-bold uppercase tracking-widest rounded-2xl"
               >
                 LINK HARDWARE
               </Button>
            )}
          </div>
        )}

        <div className="pt-8 border-t border-white/5">
          <div className="flex items-start gap-3 p-4 rounded-xl bg-white/[0.02] border border-white/5">
            <Cpu className="h-4 w-4 text-slate-500 mt-0.5" />
            <p className="text-[10px] font-medium uppercase tracking-[0.05em] text-slate-500 leading-relaxed italic">
              AI PROTOCOL ADVISORY: THESE PROJECTIONS ARE SYNTHESIZED VIA REAL-TIME VECTOR ANALYSIS. CALIBRATION TARGET: {getCategoryDisplayName(meterCategory, industryType).toUpperCase()} ARCHITECTURE.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default RealTimeInsights;