import { TrendingUp, TrendingDown, Lightbulb, AlertTriangle, Info, Factory, Building, Home, Zap, Clock, DollarSign, Battery, Sun } from 'lucide-react';

// Meter category types
export type MeterCategory = 'household' | 'SME' | 'industry';
export type IndustryType = 'heavyduty' | 'medium' | 'light';

// Insight types
export interface EnergyInsight {
  id: string;
  type: 'efficiency' | 'cost' | 'peak' | 'device' | 'trend' | 'recommendation' | 'alert' | 'info';
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  severity: 'success' | 'warning' | 'alert' | 'info';
  category: MeterCategory;
  industryType?: IndustryType;
  priority: number; // 1-10, higher is more important
  actionable?: boolean;
  recommendation?: string;
}

// Meter-specific thresholds and benchmarks
export const METER_BENCHMARKS = {
  household: {
    dailyUsage: { low: 5, normal: 15, high: 25 }, // kWh
    dailyCost: { low: 125, normal: 375, high: 625 }, // KSh
    efficiency: { excellent: 90, good: 75, poor: 60 }, // %
    peakHours: ['18:00', '19:00', '20:00', '21:00'], // Common household peak times
    monthlyBudget: 3000, // KSh
    deviceBreakdown: {
      lighting: { normal: 15, high: 25 },
      appliances: { normal: 40, high: 60 },
      hvac: { normal: 30, high: 50 },
      electronics: { normal: 15, high: 25 }
    }
  },
  SME: {
    dailyUsage: { low: 20, normal: 50, high: 100 }, // kWh
    dailyCost: { low: 500, normal: 1250, high: 2500 }, // KSh
    efficiency: { excellent: 85, good: 70, poor: 55 }, // %
    peakHours: ['08:00', '09:00', '14:00', '15:00', '16:00'], // Business hours
    monthlyBudget: 15000, // KSh
    deviceBreakdown: {
      lighting: { normal: 20, high: 35 },
      equipment: { normal: 45, high: 65 },
      hvac: { normal: 25, high: 40 },
      electronics: { normal: 10, high: 20 }
    }
  },
  industry: {
    heavyduty: {
      dailyUsage: { low: 200, normal: 500, high: 1000 }, // kWh
      dailyCost: { low: 5000, normal: 12500, high: 25000 }, // KSh
      efficiency: { excellent: 80, good: 65, poor: 50 }, // %
      peakHours: ['06:00', '07:00', '08:00', '14:00', '15:00', '22:00'], // Industrial shifts
      monthlyBudget: 150000, // KSh
      deviceBreakdown: {
        machinery: { normal: 60, high: 80 },
        hvac: { normal: 20, high: 30 },
        lighting: { normal: 10, high: 15 },
        auxiliary: { normal: 10, high: 15 }
      }
    },
    medium: {
      dailyUsage: { low: 100, normal: 250, high: 500 }, // kWh
      dailyCost: { low: 2500, normal: 6250, high: 12500 }, // KSh
      efficiency: { excellent: 82, good: 67, poor: 52 }, // %
      peakHours: ['07:00', '08:00', '09:00', '15:00', '16:00'], // Standard industrial
      monthlyBudget: 75000, // KSh
      deviceBreakdown: {
        machinery: { normal: 50, high: 70 },
        hvac: { normal: 25, high: 35 },
        lighting: { normal: 15, high: 20 },
        auxiliary: { normal: 10, high: 15 }
      }
    },
    light: {
      dailyUsage: { low: 50, normal: 120, high: 250 }, // kWh
      dailyCost: { low: 1250, normal: 3000, high: 6250 }, // KSh
      efficiency: { excellent: 85, good: 70, poor: 55 }, // %
      peakHours: ['08:00', '09:00', '14:00', '15:00'], // Light industrial
      monthlyBudget: 37500, // KSh
      deviceBreakdown: {
        machinery: { normal: 40, high: 60 },
        hvac: { normal: 30, high: 40 },
        lighting: { normal: 20, high: 25 },
        auxiliary: { normal: 10, high: 15 }
      }
    }
  }
};

// Get appropriate benchmark based on meter type
export const getBenchmark = (category: MeterCategory, industryType?: IndustryType) => {
  if (category === 'industry' && industryType) {
    return METER_BENCHMARKS.industry[industryType];
  }
  return METER_BENCHMARKS[category];
};

// Generate meter-specific insights
export const generateMeterSpecificInsights = (
  energyData: any,
  analytics: any,
  category: MeterCategory,
  industryType?: IndustryType,
  hasMeterConnected: boolean = false
): EnergyInsight[] => {
  const insights: EnergyInsight[] = [];
  
  // If no meter connected, return category-specific setup insights
  if (!hasMeterConnected) {
    return generateSetupInsights(category, industryType);
  }

  const benchmark = getBenchmark(category, industryType);
  
  // Daily usage insights
  if (energyData.daily_total > 0) {
    if (energyData.daily_total > benchmark.dailyUsage.high) {
      insights.push({
        id: 'high-usage',
        type: 'alert',
        title: `High ${getCategoryDisplayName(category, industryType)} Usage`,
        description: `Your daily usage of ${energyData.daily_total.toFixed(1)} kWh is above the typical ${getCategoryDisplayName(category, industryType).toLowerCase()} range of ${benchmark.dailyUsage.normal} kWh.`,
        icon: AlertTriangle,
        severity: 'alert',
        category,
        industryType,
        priority: 9,
        actionable: true,
        recommendation: getUsageRecommendation(category, industryType, 'high')
      });
    } else if (energyData.daily_total < benchmark.dailyUsage.low) {
      insights.push({
        id: 'low-usage',
        type: 'info',
        title: `Efficient ${getCategoryDisplayName(category, industryType)} Usage`,
        description: `Your daily usage of ${energyData.daily_total.toFixed(1)} kWh is below typical ${getCategoryDisplayName(category, industryType).toLowerCase()} usage. Great job!`,
        icon: Lightbulb,
        severity: 'success',
        category,
        industryType,
        priority: 3
      });
    }
  }

  // Cost insights
  if (energyData.daily_cost > 0) {
    const monthlyCostProjection = energyData.daily_cost * 30;
    if (monthlyCostProjection > benchmark.monthlyBudget) {
      insights.push({
        id: 'high-cost',
        type: 'cost',
        title: 'Budget Exceeded',
        description: `At KSh ${energyData.daily_cost.toFixed(2)}/day, your monthly cost will be KSh ${monthlyCostProjection.toFixed(2)}, exceeding the typical ${getCategoryDisplayName(category, industryType).toLowerCase()} budget of KSh ${benchmark.monthlyBudget.toLocaleString()}.`,
        icon: DollarSign,
        severity: 'warning',
        category,
        industryType,
        priority: 8,
        actionable: true,
        recommendation: getCostRecommendation(category, industryType)
      });
    }
  }

  // Efficiency insights
  if (energyData.efficiency_score > 0) {
    if (energyData.efficiency_score >= benchmark.efficiency.excellent) {
      insights.push({
        id: 'excellent-efficiency',
        type: 'efficiency',
        title: `Excellent ${getCategoryDisplayName(category, industryType)} Efficiency`,
        description: `Your efficiency score of ${energyData.efficiency_score}% is excellent for ${getCategoryDisplayName(category, industryType).toLowerCase()} operations.`,
        icon: Lightbulb,
        severity: 'success',
        category,
        industryType,
        priority: 4
      });
    } else if (energyData.efficiency_score < benchmark.efficiency.poor) {
      insights.push({
        id: 'poor-efficiency',
        type: 'efficiency',
        title: 'Efficiency Improvement Needed',
        description: `Your efficiency score of ${energyData.efficiency_score}% is below the ${getCategoryDisplayName(category, industryType).toLowerCase()} average of ${benchmark.efficiency.good}%.`,
        icon: AlertTriangle,
        severity: 'warning',
        category,
        industryType,
        priority: 7,
        actionable: true,
        recommendation: getEfficiencyRecommendation(category, industryType)
      });
    }
  }

  // Peak hours insights
  if (analytics.peakHours?.length > 0) {
    const userPeakHour = analytics.peakHours[0]?.hour;
    if (userPeakHour && benchmark.peakHours.includes(`${userPeakHour.toString().padStart(2, '0')}:00`)) {
      insights.push({
        id: 'peak-alignment',
        type: 'peak',
        title: 'Peak Hour Usage Detected',
        description: `Your peak usage at ${userPeakHour}:00 aligns with typical ${getCategoryDisplayName(category, industryType).toLowerCase()} peak hours. Consider load shifting to reduce costs.`,
        icon: Clock,
        severity: 'warning',
        category,
        industryType,
        priority: 6,
        actionable: true,
        recommendation: getPeakHourRecommendation(category, industryType)
      });
    }
  }

  // Device breakdown insights
  if (analytics.deviceBreakdown?.length > 0) {
    const deviceInsights = generateDeviceInsights(analytics.deviceBreakdown, category, industryType, benchmark);
    insights.push(...deviceInsights);
  }

  // Trend insights
  if (energyData.cost_trend) {
    const trendInsight = generateTrendInsight(energyData.cost_trend, category, industryType);
    if (trendInsight) insights.push(trendInsight);
  }

  // Sort by priority (highest first) and return top 5
  return insights.sort((a, b) => b.priority - a.priority).slice(0, 5);
};

// Generate setup insights for users without connected meters
const generateSetupInsights = (category: MeterCategory, industryType?: IndustryType): EnergyInsight[] => {
  const categoryName = getCategoryDisplayName(category, industryType);
  const benchmark = getBenchmark(category, industryType);
  
  return [
    {
      id: 'setup-required',
      type: 'info',
      title: `${categoryName} Meter Setup Required`,
      description: `Connect your ${categoryName.toLowerCase()} smart meter to get personalized insights and real-time monitoring tailored to your usage patterns.`,
      icon: Info,
      severity: 'info',
      category,
      industryType,
      priority: 10,
      actionable: true,
      recommendation: 'Go to Settings → Meter Setup to connect your smart meter and start monitoring your energy usage.'
    },
    {
      id: 'category-benefits',
      type: 'info',
      title: `${categoryName} Energy Monitoring Benefits`,
      description: `Once connected, you'll get insights specific to ${categoryName.toLowerCase()} usage patterns, including peak hour analysis, cost optimization, and efficiency benchmarking.`,
      icon: Lightbulb,
      severity: 'info',
      category,
      industryType,
      priority: 8
    },
    {
      id: 'expected-usage',
      type: 'info',
      title: `Typical ${categoryName} Usage`,
      description: `${categoryName} meters typically use ${benchmark.dailyUsage.normal} kWh/day (KSh ${benchmark.dailyCost.normal}/day). Connect your meter to see how you compare.`,
      icon: Battery,
      severity: 'info',
      category,
      industryType,
      priority: 6
    }
  ];
};

// Helper functions
const getCategoryDisplayName = (category: MeterCategory, industryType?: IndustryType): string => {
  if (category === 'industry' && industryType) {
    return `${industryType.charAt(0).toUpperCase() + industryType.slice(1)} Industry`;
  }
  return category === 'SME' ? 'SME' : category.charAt(0).toUpperCase() + category.slice(1);
};

const getUsageRecommendation = (category: MeterCategory, industryType?: IndustryType, level: 'high' | 'low'): string => {
  if (level === 'high') {
    switch (category) {
      case 'household':
        return 'Check for energy-hungry appliances, improve insulation, and consider LED lighting upgrades.';
      case 'SME':
        return 'Audit office equipment, optimize HVAC schedules, and implement energy-efficient practices.';
      case 'industry':
        return industryType === 'heavyduty' 
          ? 'Review machinery efficiency, implement load scheduling, and consider power factor correction.'
          : 'Optimize production schedules, maintain equipment regularly, and consider energy recovery systems.';
      default:
        return 'Review your energy usage patterns and identify opportunities for optimization.';
    }
  }
  return 'Continue your efficient energy practices and consider sharing tips with others.';
};

const getCostRecommendation = (category: MeterCategory, industryType?: IndustryType): string => {
  switch (category) {
    case 'household':
      return 'Use appliances during off-peak hours (10 PM - 6 AM), unplug devices when not in use, and consider solar water heating.';
    case 'SME':
      return 'Implement time-of-use scheduling, upgrade to energy-efficient equipment, and consider demand response programs.';
    case 'industry':
      return industryType === 'heavyduty'
        ? 'Negotiate better tariff rates, implement power factor correction, and consider on-site renewable energy.'
        : 'Optimize production schedules for off-peak hours and implement energy management systems.';
    default:
      return 'Monitor your usage patterns and shift high-energy activities to off-peak hours.';
  }
};

const getEfficiencyRecommendation = (category: MeterCategory, industryType?: IndustryType): string => {
  switch (category) {
    case 'household':
      return 'Upgrade to LED bulbs, use energy-efficient appliances, and improve home insulation.';
    case 'SME':
      return 'Conduct an energy audit, upgrade office equipment, and train staff on energy-saving practices.';
    case 'industry':
      return industryType === 'heavyduty'
        ? 'Implement energy management systems, optimize machinery operation, and consider waste heat recovery.'
        : 'Regular equipment maintenance, process optimization, and energy-efficient technology upgrades.';
    default:
      return 'Focus on energy-efficient practices and equipment upgrades.';
  }
};

const getPeakHourRecommendation = (category: MeterCategory, industryType?: IndustryType): string => {
  switch (category) {
    case 'household':
      return 'Shift laundry, dishwashing, and water heating to off-peak hours (10 PM - 6 AM) to save on costs.';
    case 'SME':
      return 'Schedule non-critical operations during off-peak hours and implement flexible work arrangements.';
    case 'industry':
      return industryType === 'heavyduty'
        ? 'Implement load shifting strategies and consider energy storage for peak shaving.'
        : 'Schedule maintenance and non-critical processes during off-peak hours.';
    default:
      return 'Consider shifting energy-intensive activities to off-peak hours.';
  }
};

const generateDeviceInsights = (
  deviceBreakdown: any[],
  category: MeterCategory,
  industryType: IndustryType | undefined,
  benchmark: any
): EnergyInsight[] => {
  const insights: EnergyInsight[] = [];
  
  deviceBreakdown.forEach(device => {
    const deviceName = device.device.toLowerCase();
    let benchmarkKey = deviceName;
    
    // Map device names to benchmark keys
    if (category === 'industry') {
      if (deviceName.includes('hvac') || deviceName.includes('cooling')) benchmarkKey = 'hvac';
      else if (deviceName.includes('machine') || deviceName.includes('equipment')) benchmarkKey = 'machinery';
      else if (deviceName.includes('light')) benchmarkKey = 'lighting';
      else benchmarkKey = 'auxiliary';
    } else {
      if (deviceName.includes('appliance')) benchmarkKey = 'appliances';
      else if (deviceName.includes('hvac') || deviceName.includes('cooling')) benchmarkKey = 'hvac';
      else if (deviceName.includes('light')) benchmarkKey = 'lighting';
      else if (deviceName.includes('electronic')) benchmarkKey = 'electronics';
    }
    
    const deviceBenchmark = benchmark.deviceBreakdown[benchmarkKey];
    if (deviceBenchmark && device.percentage > deviceBenchmark.high) {
      insights.push({
        id: `high-${deviceName}`,
        type: 'device',
        title: `High ${device.device} Usage`,
        description: `${device.device} accounts for ${device.percentage}% of your usage (KSh ${device.cost.toFixed(2)}), above the typical ${deviceBenchmark.normal}% for ${getCategoryDisplayName(category, industryType).toLowerCase()}.`,
        icon: Zap,
        severity: 'warning',
        category,
        industryType,
        priority: 5,
        actionable: true,
        recommendation: `Consider optimizing ${device.device.toLowerCase()} usage or upgrading to more efficient alternatives.`
      });
    }
  });
  
  return insights;
};

const generateTrendInsight = (
  trend: 'up' | 'down' | 'stable',
  category: MeterCategory,
  industryType?: IndustryType
): EnergyInsight | null => {
  const categoryName = getCategoryDisplayName(category, industryType);
  
  switch (trend) {
    case 'up':
      return {
        id: 'cost-trend-up',
        type: 'trend',
        title: 'Rising Energy Costs',
        description: `Your ${categoryName.toLowerCase()} energy costs are trending upward. This may indicate increased usage or equipment inefficiency.`,
        icon: TrendingUp,
        severity: 'warning',
        category,
        industryType,
        priority: 7,
        actionable: true,
        recommendation: 'Monitor your usage patterns and check for any equipment that might be consuming more energy than usual.'
      };
    case 'down':
      return {
        id: 'cost-trend-down',
        type: 'trend',
        title: 'Decreasing Energy Costs',
        description: `Your ${categoryName.toLowerCase()} energy costs are trending downward. Keep up the excellent energy management!`,
        icon: TrendingDown,
        severity: 'success',
        category,
        industryType,
        priority: 3
      };
    default:
      return null;
  }
};

// Export utility functions
export {
  getCategoryDisplayName,
  getUsageRecommendation,
  getCostRecommendation,
  getEfficiencyRecommendation,
  getPeakHourRecommendation
};