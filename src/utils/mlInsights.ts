import { TrendingUp, TrendingDown, Lightbulb, AlertTriangle, Info, Factory, Building, Home, Zap, Clock, DollarSign, Battery, Sun, Activity, Target, Cpu } from 'lucide-react';

// ML-based insight types
export interface MLInsight {
  id: string;
  type: 'pattern' | 'anomaly' | 'prediction' | 'optimization' | 'efficiency' | 'cost' | 'behavioral' | 'info';
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  severity: 'success' | 'warning' | 'alert' | 'info';
  confidence: number; // 0-100, ML confidence score
  category: string;
  industryType?: string;
  priority: number;
  actionable?: boolean;
  recommendation?: string;
  mlModel: string; // Which ML model generated this insight
  dataPoints: number; // How many data points were analyzed
  timeframe: string; // Time period analyzed
  metrics?: {
    accuracy?: number;
    trend?: number;
    variance?: number;
    correlation?: number;
  };
}

// Energy reading interface for ML analysis
export interface EnergyReading {
  id: string;
  user_id: string;
  meter_number: string;
  reading_date: string;
  kwh_consumed: number;
  total_cost: number;
  peak_demand?: number;
  power_factor?: number;
  voltage?: number;
  current?: number;
  frequency?: number;
}

// ML Models for different analysis types
export class EnergyMLAnalyzer {
  private category: string;
  private industryType?: string;
  private readings: EnergyReading[];

  constructor(category: string, industryType?: string, readings: EnergyReading[] = []) {
    this.category = category;
    this.industryType = industryType;
    this.readings = readings;
  }

  // Main ML analysis function
  public async generateMLInsights(): Promise<MLInsight[]> {
    if (this.readings.length < 7) {
      return this.generateBootstrapInsights();
    }

    const insights: MLInsight[] = [];

    // Run different ML models
    insights.push(...await this.analyzeUsagePatterns());
    insights.push(...await this.detectAnomalies());
    insights.push(...await this.predictFutureTrends());
    insights.push(...await this.optimizeEfficiency());
    insights.push(...await this.analyzeBehavioralPatterns());
    insights.push(...await this.detectCostOptimizations());

    // Sort by confidence and priority
    return insights
      .sort((a, b) => (b.confidence * b.priority) - (a.confidence * a.priority))
      .slice(0, 5);
  }

  // Pattern Recognition ML Model
  private async analyzeUsagePatterns(): Promise<MLInsight[]> {
    const insights: MLInsight[] = [];
    
    // Time series analysis for usage patterns
    const hourlyPatterns = this.extractHourlyPatterns();
    const weeklyPatterns = this.extractWeeklyPatterns();
    const seasonalPatterns = this.extractSeasonalPatterns();

    // Detect peak usage patterns
    const peakHours = this.detectPeakHours(hourlyPatterns);
    if (peakHours.confidence > 0.7) {
      insights.push({
        id: 'ml-peak-pattern',
        type: 'pattern',
        title: `${this.getCategoryName()} Peak Usage Pattern Detected`,
        description: `ML analysis shows consistent peak usage at ${peakHours.hours.join(', ')} with ${(peakHours.confidence * 100).toFixed(1)}% confidence. This pattern is ${peakHours.comparison} for ${this.getCategoryName().toLowerCase()} operations.`,
        icon: Activity,
        severity: peakHours.isOptimal ? 'success' : 'warning',
        confidence: peakHours.confidence * 100,
        category: this.category,
        industryType: this.industryType,
        priority: 8,
        actionable: !peakHours.isOptimal,
        recommendation: peakHours.isOptimal ? 
          'Your peak usage pattern is well-optimized for cost efficiency.' :
          `Consider shifting ${peakHours.shiftableLoad}% of your load to off-peak hours (${peakHours.offPeakHours.join(', ')}) to reduce costs by an estimated ${peakHours.potentialSavings}%.`,
        mlModel: 'Time Series Pattern Recognition',
        dataPoints: this.readings.length,
        timeframe: this.getTimeframe(),
        metrics: {
          accuracy: peakHours.confidence,
          trend: peakHours.trend,
          variance: peakHours.variance
        }
      });
    }

    // Detect weekly patterns
    const weeklyInsight = this.analyzeWeeklyEfficiency(weeklyPatterns);
    if (weeklyInsight.confidence > 0.6) {
      insights.push(weeklyInsight);
    }

    return insights;
  }

  // Anomaly Detection ML Model
  private async detectAnomalies(): Promise<MLInsight[]> {
    const insights: MLInsight[] = [];
    
    // Statistical anomaly detection using Z-score and IQR
    const anomalies = this.detectStatisticalAnomalies();
    
    for (const anomaly of anomalies) {
      if (anomaly.confidence > 0.75) {
        insights.push({
          id: `ml-anomaly-${anomaly.type}`,
          type: 'anomaly',
          title: `${anomaly.severity === 'high' ? 'Critical' : 'Unusual'} ${anomaly.type} Detected`,
          description: `ML anomaly detection found ${anomaly.description}. This deviates ${anomaly.deviation.toFixed(1)} standard deviations from your typical ${this.getCategoryName().toLowerCase()} usage pattern.`,
          icon: AlertTriangle,
          severity: anomaly.severity === 'high' ? 'alert' : 'warning',
          confidence: anomaly.confidence * 100,
          category: this.category,
          industryType: this.industryType,
          priority: anomaly.severity === 'high' ? 9 : 7,
          actionable: true,
          recommendation: anomaly.recommendation,
          mlModel: 'Statistical Anomaly Detection (Z-score + IQR)',
          dataPoints: this.readings.length,
          timeframe: anomaly.timeframe,
          metrics: {
            accuracy: anomaly.confidence,
            variance: anomaly.deviation
          }
        });
      }
    }

    return insights;
  }

  // Predictive ML Model
  private async predictFutureTrends(): Promise<MLInsight[]> {
    const insights: MLInsight[] = [];
    
    // Linear regression for trend prediction
    const trendAnalysis = this.performTrendAnalysis();
    
    if (trendAnalysis.confidence > 0.65) {
      const prediction = this.predictNextPeriod(trendAnalysis);
      
      insights.push({
        id: 'ml-trend-prediction',
        type: 'prediction',
        title: `${prediction.direction === 'increasing' ? 'Rising' : 'Declining'} Usage Trend Predicted`,
        description: `ML trend analysis predicts your ${this.getCategoryName().toLowerCase()} energy usage will ${prediction.direction === 'increasing' ? 'increase' : 'decrease'} by ${prediction.percentChange.toFixed(1)}% over the next ${prediction.period}. Projected monthly cost: KSh ${prediction.projectedCost.toFixed(2)}.`,
        icon: prediction.direction === 'increasing' ? TrendingUp : TrendingDown,
        severity: prediction.direction === 'increasing' ? 'warning' : 'success',
        confidence: trendAnalysis.confidence * 100,
        category: this.category,
        industryType: this.industryType,
        priority: 6,
        actionable: prediction.direction === 'increasing',
        recommendation: prediction.recommendation,
        mlModel: 'Linear Regression Trend Analysis',
        dataPoints: this.readings.length,
        timeframe: this.getTimeframe(),
        metrics: {
          accuracy: trendAnalysis.confidence,
          trend: prediction.percentChange,
          correlation: trendAnalysis.correlation
        }
      });
    }

    return insights;
  }

  // Efficiency Optimization ML Model
  private async optimizeEfficiency(): Promise<MLInsight[]> {
    const insights: MLInsight[] = [];
    
    // Multi-variate analysis for efficiency optimization
    const efficiencyAnalysis = this.analyzeEfficiencyFactors();
    
    if (efficiencyAnalysis.confidence > 0.7) {
      insights.push({
        id: 'ml-efficiency-optimization',
        type: 'optimization',
        title: `${efficiencyAnalysis.currentScore >= 85 ? 'High' : efficiencyAnalysis.currentScore >= 70 ? 'Moderate' : 'Low'} Efficiency Score: ${efficiencyAnalysis.currentScore.toFixed(1)}%`,
        description: `ML efficiency analysis shows your ${this.getCategoryName().toLowerCase()} operations are performing at ${efficiencyAnalysis.currentScore.toFixed(1)}% efficiency. Key factors: ${efficiencyAnalysis.topFactors.join(', ')}. Potential improvement: ${efficiencyAnalysis.improvementPotential.toFixed(1)}%.`,
        icon: Target,
        severity: efficiencyAnalysis.currentScore >= 80 ? 'success' : efficiencyAnalysis.currentScore >= 60 ? 'warning' : 'alert',
        confidence: efficiencyAnalysis.confidence * 100,
        category: this.category,
        industryType: this.industryType,
        priority: 7,
        actionable: efficiencyAnalysis.improvementPotential > 5,
        recommendation: efficiencyAnalysis.recommendation,
        mlModel: 'Multi-variate Efficiency Analysis',
        dataPoints: this.readings.length,
        timeframe: this.getTimeframe(),
        metrics: {
          accuracy: efficiencyAnalysis.confidence,
          trend: efficiencyAnalysis.improvementPotential
        }
      });
    }

    return insights;
  }

  // Behavioral Pattern ML Model
  private async analyzeBehavioralPatterns(): Promise<MLInsight[]> {
    const insights: MLInsight[] = [];
    
    // Clustering analysis for behavioral patterns
    const behaviorAnalysis = this.clusterBehavioralPatterns();
    
    if (behaviorAnalysis.confidence > 0.6) {
      insights.push({
        id: 'ml-behavioral-pattern',
        type: 'behavioral',
        title: `${behaviorAnalysis.pattern} Usage Behavior Identified`,
        description: `ML behavioral analysis identifies you as a "${behaviorAnalysis.pattern}" ${this.getCategoryName().toLowerCase()} user. This pattern shows ${behaviorAnalysis.characteristics.join(', ')}. Compared to similar ${this.getCategoryName().toLowerCase()} users, you are ${behaviorAnalysis.comparison}.`,
        icon: Cpu,
        severity: behaviorAnalysis.isOptimal ? 'success' : 'info',
        confidence: behaviorAnalysis.confidence * 100,
        category: this.category,
        industryType: this.industryType,
        priority: 5,
        actionable: !behaviorAnalysis.isOptimal,
        recommendation: behaviorAnalysis.recommendation,
        mlModel: 'K-Means Behavioral Clustering',
        dataPoints: this.readings.length,
        timeframe: this.getTimeframe(),
        metrics: {
          accuracy: behaviorAnalysis.confidence
        }
      });
    }

    return insights;
  }

  // Cost Optimization ML Model
  private async detectCostOptimizations(): Promise<MLInsight[]> {
    const insights: MLInsight[] = [];
    
    // Cost optimization through pattern analysis
    const costAnalysis = this.analyzeCostOptimization();
    
    if (costAnalysis.confidence > 0.65 && costAnalysis.potentialSavings > 5) {
      insights.push({
        id: 'ml-cost-optimization',
        type: 'cost',
        title: `Cost Optimization Opportunity: ${costAnalysis.potentialSavings.toFixed(1)}% Savings`,
        description: `ML cost analysis identifies potential monthly savings of KSh ${costAnalysis.monthlySavings.toFixed(2)} (${costAnalysis.potentialSavings.toFixed(1)}%) through ${costAnalysis.method}. Primary opportunity: ${costAnalysis.primaryOpportunity}.`,
        icon: DollarSign,
        severity: costAnalysis.potentialSavings > 15 ? 'success' : 'info',
        confidence: costAnalysis.confidence * 100,
        category: this.category,
        industryType: this.industryType,
        priority: 8,
        actionable: true,
        recommendation: costAnalysis.recommendation,
        mlModel: 'Cost Optimization Analysis',
        dataPoints: this.readings.length,
        timeframe: this.getTimeframe(),
        metrics: {
          accuracy: costAnalysis.confidence,
          trend: costAnalysis.potentialSavings
        }
      });
    }

    return insights;
  }

  // Helper Methods for ML Analysis

  private extractHourlyPatterns() {
    const hourlyData = new Array(24).fill(0).map(() => ({ total: 0, count: 0 }));
    
    this.readings.forEach(reading => {
      const hour = new Date(reading.reading_date).getHours();
      hourlyData[hour].total += reading.kwh_consumed;
      hourlyData[hour].count += 1;
    });

    return hourlyData.map((data, hour) => ({
      hour,
      average: data.count > 0 ? data.total / data.count : 0,
      count: data.count
    }));
  }

  private extractWeeklyPatterns() {
    const weeklyData = new Array(7).fill(0).map(() => ({ total: 0, count: 0 }));
    
    this.readings.forEach(reading => {
      const day = new Date(reading.reading_date).getDay();
      weeklyData[day].total += reading.kwh_consumed;
      weeklyData[day].count += 1;
    });

    return weeklyData.map((data, day) => ({
      day,
      average: data.count > 0 ? data.total / data.count : 0,
      count: data.count
    }));
  }

  private extractSeasonalPatterns() {
    // Group by month for seasonal analysis
    const monthlyData = new Map<number, { total: number; count: number }>();
    
    this.readings.forEach(reading => {
      const month = new Date(reading.reading_date).getMonth();
      if (!monthlyData.has(month)) {
        monthlyData.set(month, { total: 0, count: 0 });
      }
      const data = monthlyData.get(month);
      if (data) {
        data.total += reading.kwh_consumed;
        data.count += 1;
      }
    });

    return Array.from(monthlyData.entries()).map(([month, data]) => ({
      month,
      average: data.count > 0 ? data.total / data.count : 0,
      count: data.count
    }));
  }

  private detectPeakHours(hourlyPatterns: any[]) {
    const validHours = hourlyPatterns.filter(h => h.count > 0);
    if (validHours.length < 12) {
      return { confidence: 0, hours: [], isOptimal: false, comparison: '', trend: 0, variance: 0, shiftableLoad: 0, offPeakHours: [], potentialSavings: 0 };
    }

    const sortedHours = validHours.sort((a, b) => b.average - a.average);
    const peakHours = sortedHours.slice(0, 3).map(h => `${h.hour}:00`);
    
    // Calculate confidence based on data consistency
    const avgUsage = validHours.reduce((sum, h) => sum + h.average, 0) / validHours.length;
    const variance = validHours.reduce((sum, h) => sum + Math.pow(h.average - avgUsage, 2), 0) / validHours.length;
    const confidence = Math.min(0.95, Math.max(0.3, 1 - (variance / (avgUsage * avgUsage))));

    // Determine if peak pattern is optimal for category
    const categoryOptimalHours = this.getCategoryOptimalHours();
    const peakHourNumbers = sortedHours.slice(0, 3).map(h => h.hour);
    const isOptimal = peakHourNumbers.some(hour => categoryOptimalHours.includes(hour));

    // Calculate potential savings
    const offPeakHours = validHours
      .filter(h => !peakHourNumbers.includes(h.hour))
      .sort((a, b) => a.average - b.average)
      .slice(0, 6)
      .map(h => `${h.hour}:00`);

    const shiftableLoad = this.calculateShiftableLoad(peakHourNumbers);
    const potentialSavings = this.calculatePotentialSavings(shiftableLoad);

    return {
      confidence,
      hours: peakHours,
      isOptimal,
      comparison: isOptimal ? 'optimal' : 'suboptimal',
      trend: this.calculateTrend(validHours),
      variance,
      shiftableLoad,
      offPeakHours,
      potentialSavings
    };
  }

  private analyzeWeeklyEfficiency(weeklyPatterns: any[]): MLInsight {
    const validDays = weeklyPatterns.filter(d => d.count > 0);
    if (validDays.length < 5) {
      // Return a default MLInsight with low confidence when not enough data
      return {
        id: 'ml-weekly-efficiency-insufficient',
        type: 'efficiency',
        title: 'Weekly Efficiency Analysis',
        description: 'Insufficient data for weekly efficiency analysis. Need data from at least 5 different days of the week.',
        icon: Battery,
        severity: 'info',
        confidence: 0,
        category: this.category,
        industryType: this.industryType,
        priority: 2,
        actionable: false,
        recommendation: 'Continue collecting data for more accurate weekly efficiency analysis.',
        mlModel: 'Weekly Pattern Efficiency Analysis',
        dataPoints: this.readings.length,
        timeframe: this.getTimeframe()
      };
    }

    // Calculate weekday average (Mon-Fri, indices 1-5)
    const weekdayData = validDays.filter(d => d.day >= 1 && d.day <= 5);
    const weekdayAvg = weekdayData.length > 0 
      ? weekdayData.reduce((sum, d) => sum + d.average, 0) / weekdayData.length 
      : 0;
    
    // Calculate weekend average (Sat-Sun, indices 0 and 6)
    const weekendData = validDays.filter(d => d.day === 0 || d.day === 6);
    const weekendAvg = weekendData.length > 0 
      ? weekendData.reduce((sum, d) => sum + d.average, 0) / weekendData.length 
      : 0;
    
    const efficiency = this.calculateWeeklyEfficiency(weekdayAvg, weekendAvg);
    const confidence = Math.min(0.9, validDays.length / 7);

    return {
      id: 'ml-weekly-efficiency',
      type: 'efficiency',
      title: `Weekly Usage Efficiency: ${efficiency.score.toFixed(1)}%`,
      description: `ML analysis shows ${efficiency.pattern} weekly pattern. Weekday average: ${weekdayAvg.toFixed(1)} kWh, Weekend average: ${weekendAvg.toFixed(1)} kWh. This is ${efficiency.comparison} for ${this.getCategoryName().toLowerCase()} operations.`,
      icon: Battery,
      severity: efficiency.score >= 80 ? 'success' : efficiency.score >= 60 ? 'warning' : 'alert',
      confidence: confidence * 100,
      category: this.category,
      industryType: this.industryType,
      priority: 6,
      actionable: efficiency.score < 70,
      recommendation: efficiency.recommendation,
      mlModel: 'Weekly Pattern Efficiency Analysis',
      dataPoints: this.readings.length,
      timeframe: this.getTimeframe()
    };
  }

  private detectStatisticalAnomalies() {
    const usageValues = this.readings.map(r => r.kwh_consumed);
    const costValues = this.readings.map(r => r.total_cost);
    
    const anomalies = [];
    
    // Z-score anomaly detection for usage
    const usageAnomalies = this.detectZScoreAnomalies(usageValues, 'usage');
    anomalies.push(...usageAnomalies);
    
    // Z-score anomaly detection for cost
    const costAnomalies = this.detectZScoreAnomalies(costValues, 'cost');
    anomalies.push(...costAnomalies);
    
    // IQR anomaly detection
    const iqrAnomalies = this.detectIQRAnomalies(usageValues, 'usage');
    anomalies.push(...iqrAnomalies);

    return anomalies;
  }

  private detectZScoreAnomalies(values: number[], type: string) {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const stdDev = Math.sqrt(values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length);
    
    const anomalies = [];
    const threshold = 2.5; // Z-score threshold
    
    values.forEach((value, index) => {
      const zScore = Math.abs((value - mean) / stdDev);
      if (zScore > threshold) {
        const reading = this.readings[index];
        const severity = zScore > 3 ? 'high' : 'medium';
        const confidence = Math.min(0.95, zScore / 4);
        
        anomalies.push({
          type,
          severity,
          confidence,
          deviation: zScore,
          description: `${type} of ${value.toFixed(2)} ${type === 'usage' ? 'kWh' : 'KSh'} on ${new Date(reading.reading_date).toLocaleDateString()}`,
          recommendation: this.getAnomalyRecommendation(type, severity, value, mean),
          timeframe: new Date(reading.reading_date).toLocaleDateString()
        });
      }
    });

    return anomalies;
  }

  private detectIQRAnomalies(values: number[], type: string) {
    const sorted = [...values].sort((a, b) => a - b);
    const q1 = sorted[Math.floor(sorted.length * 0.25)];
    const q3 = sorted[Math.floor(sorted.length * 0.75)];
    const iqr = q3 - q1;
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;
    
    const anomalies = [];
    
    values.forEach((value, index) => {
      if (value < lowerBound || value > upperBound) {
        const reading = this.readings[index];
        const severity = value > upperBound ? 'high' : 'medium';
        const confidence = 0.8;
        
        anomalies.push({
          type: `${type}_iqr`,
          severity,
          confidence,
          deviation: value > upperBound ? (value - upperBound) / iqr : (lowerBound - value) / iqr,
          description: `${type} outlier of ${value.toFixed(2)} ${type === 'usage' ? 'kWh' : 'KSh'} on ${new Date(reading.reading_date).toLocaleDateString()}`,
          recommendation: this.getAnomalyRecommendation(type, severity, value, (q1 + q3) / 2),
          timeframe: new Date(reading.reading_date).toLocaleDateString()
        });
      }
    });

    return anomalies;
  }

  private performTrendAnalysis() {
    const n = this.readings.length;
    const xValues = Array.from({ length: n }, (_, i) => i);
    const yValues = this.readings.map(r => r.kwh_consumed);
    
    // Linear regression
    const xMean = xValues.reduce((sum, x) => sum + x, 0) / n;
    const yMean = yValues.reduce((sum, y) => sum + y, 0) / n;
    
    const numerator = xValues.reduce((sum, x, i) => sum + (x - xMean) * (yValues[i] - yMean), 0);
    const denominator = xValues.reduce((sum, x) => sum + Math.pow(x - xMean, 2), 0);
    
    const slope = numerator / denominator;
    const intercept = yMean - slope * xMean;
    
    // Calculate R-squared (correlation coefficient)
    const yPredicted = xValues.map(x => slope * x + intercept);
    const ssRes = yValues.reduce((sum, y, i) => sum + Math.pow(y - yPredicted[i], 2), 0);
    const ssTot = yValues.reduce((sum, y) => sum + Math.pow(y - yMean, 2), 0);
    const rSquared = 1 - (ssRes / ssTot);
    
    const confidence = Math.max(0.3, Math.min(0.95, Math.abs(rSquared)));
    
    return {
      slope,
      intercept,
      correlation: rSquared,
      confidence
    };
  }

  private predictNextPeriod(trendAnalysis: any) {
    const lastIndex = this.readings.length - 1;
    const nextValue = trendAnalysis.slope * (lastIndex + 30) + trendAnalysis.intercept; // 30 days ahead
    const currentAvg = this.readings.slice(-7).reduce((sum, r) => sum + r.kwh_consumed, 0) / 7;
    
    const percentChange = ((nextValue - currentAvg) / currentAvg) * 100;
    const direction = percentChange > 0 ? 'increasing' : 'decreasing';
    
    const avgCostPerKwh = this.readings.reduce((sum, r) => sum + r.total_cost, 0) / 
                         this.readings.reduce((sum, r) => sum + r.kwh_consumed, 0);
    const projectedCost = nextValue * avgCostPerKwh * 30; // Monthly projection
    
    return {
      direction,
      percentChange: Math.abs(percentChange),
      projectedCost,
      period: '30 days',
      recommendation: this.getTrendRecommendation(direction, Math.abs(percentChange))
    };
  }

  private analyzeEfficiencyFactors() {
    const readings = this.readings.slice(-30); // Last 30 readings
    if (readings.length < 10) {
      return { confidence: 0, currentScore: 0, topFactors: [], improvementPotential: 0, recommendation: '' };
    }

    // Calculate efficiency metrics
    const avgUsage = readings.reduce((sum, r) => sum + r.kwh_consumed, 0) / readings.length;
    const avgCost = readings.reduce((sum, r) => sum + r.total_cost, 0) / readings.length;
    const costPerKwh = avgCost / avgUsage;
    
    // Efficiency factors analysis
    const timeEfficiency = this.analyzeTimeEfficiency(readings);
    const costEfficiency = this.analyzeCostEfficiency(costPerKwh);
    const consistencyEfficiency = this.analyzeConsistency(readings);
    
    const currentScore = (timeEfficiency + costEfficiency + consistencyEfficiency) / 3;
    const confidence = Math.min(0.9, readings.length / 30);
    
    const topFactors = [
      { name: 'Time Management', score: timeEfficiency },
      { name: 'Cost Efficiency', score: costEfficiency },
      { name: 'Usage Consistency', score: consistencyEfficiency }
    ].sort((a, b) => b.score - a.score).map(f => f.name);

    const improvementPotential = Math.max(0, 95 - currentScore);
    
    return {
      confidence,
      currentScore,
      topFactors: topFactors.slice(0, 2),
      improvementPotential,
      recommendation: topFactors.length > 0 
        ? this.getEfficiencyRecommendation(currentScore, topFactors[0])
        : this.getEfficiencyRecommendation(currentScore, 'Overall Efficiency')
    };
  }

  private clusterBehavioralPatterns() {
    // Simplified behavioral clustering based on usage patterns
    const patterns = this.extractBehavioralFeatures();
    const cluster = this.classifyBehavior(patterns);
    
    return {
      pattern: cluster.name,
      characteristics: cluster.characteristics,
      comparison: cluster.comparison,
      isOptimal: cluster.isOptimal,
      confidence: cluster.confidence,
      recommendation: cluster.recommendation
    };
  }

  private analyzeCostOptimization() {
    const readings = this.readings.slice(-30);
    if (readings.length < 14) {
      return { confidence: 0, potentialSavings: 0, monthlySavings: 0, method: '', primaryOpportunity: '', recommendation: '' };
    }

    // Analyze cost optimization opportunities
    const peakHourCosts = this.analyzePeakHourCosts(readings);
    const loadShiftingPotential = this.analyzeLoadShifting(readings);
    const efficiencyGains = this.analyzeEfficiencyGains(readings);
    
    // Sort opportunities by savings potential and get the best one
    const opportunities = [peakHourCosts, loadShiftingPotential, efficiencyGains]
      .sort((a, b) => b.savings - a.savings);
    
    const bestOpportunity = opportunities.length > 0 ? opportunities[0] : {
      savings: 0,
      method: 'baseline optimization',
      opportunity: 'standard efficiency measures',
      recommendation: 'Implement standard energy efficiency measures for your category.'
    };
    
    const confidence = Math.min(0.9, readings.length / 30);
    const currentMonthlyCost = readings.reduce((sum, r) => sum + r.total_cost, 0) * (30 / readings.length);
    
    return {
      confidence,
      potentialSavings: bestOpportunity.savings,
      monthlySavings: currentMonthlyCost * (bestOpportunity.savings / 100),
      method: bestOpportunity.method,
      primaryOpportunity: bestOpportunity.opportunity,
      recommendation: bestOpportunity.recommendation
    };
  }

  // Bootstrap insights for insufficient data
  private generateBootstrapInsights(): MLInsight[] {
    return [{
      id: 'ml-bootstrap',
      type: 'info',
      title: 'ML Analysis Initializing',
      description: `Collecting ${this.getCategoryName().toLowerCase()} usage data for ML analysis. ${this.readings.length}/7 minimum readings collected. Advanced insights will be available once sufficient data is gathered.`,
      icon: Cpu,
      severity: 'info',
      confidence: 50,
      category: this.category,
      industryType: this.industryType,
      priority: 3,
      actionable: false,
      mlModel: 'Bootstrap Analysis',
      dataPoints: this.readings.length,
      timeframe: 'Insufficient data'
    }];
  }

  // Helper methods
  private getCategoryName(): string {
    if (this.category === 'industry' && this.industryType) {
      return `${this.industryType.charAt(0).toUpperCase() + this.industryType.slice(1)} Industry`;
    }
    return this.category === 'SME' ? 'SME' : this.category.charAt(0).toUpperCase() + this.category.slice(1);
  }

  private getCategoryOptimalHours(): number[] {
    switch (this.category) {
      case 'household':
        return [22, 23, 0, 1, 2, 3, 4, 5]; // Off-peak hours
      case 'SME':
        return [8, 9, 14, 15, 16]; // Business hours
      case 'industry':
        if (this.industryType === 'heavyduty') {
          return [22, 23, 0, 1, 2, 3, 4, 5, 6]; // Night shift + early morning
        }
        return [7, 8, 15, 16]; // Standard industrial hours
      default:
        return [22, 23, 0, 1, 2, 3, 4, 5];
    }
  }

  private calculateShiftableLoad(peakHours: number[]): number {
    // Estimate percentage of load that could be shifted based on category
    switch (this.category) {
      case 'household':
        return 30; // Appliances, water heating, etc.
      case 'SME':
        return 25; // Some equipment, lighting
      case 'industry':
        return this.industryType === 'heavyduty' ? 15 : 20; // Limited flexibility for heavy industry
      default:
        return 25;
    }
  }

  private calculatePotentialSavings(shiftableLoad: number): number {
    // Estimate cost savings from load shifting (Kenya Power off-peak rates)
    const offPeakDiscount = 0.3; // 30% discount for off-peak
    return shiftableLoad * offPeakDiscount;
  }

  private calculateTrend(hourlyData: any[]): number {
    // Simple trend calculation
    const values = hourlyData.map(h => h.average);
    const n = values.length;
    const xSum = (n * (n - 1)) / 2;
    const ySum = values.reduce((sum, val) => sum + val, 0);
    const xySum = values.reduce((sum, val, i) => sum + val * i, 0);
    const xSquareSum = (n * (n - 1) * (2 * n - 1)) / 6;
    
    return (n * xySum - xSum * ySum) / (n * xSquareSum - xSum * xSum);
  }

  private calculateWeeklyEfficiency(weekdayAvg: number, weekendAvg: number) {
    const ratio = weekendAvg / weekdayAvg;
    let score = 70; // Base score
    let pattern = 'balanced';
    let comparison = 'typical';
    let recommendation = 'Continue monitoring your usage patterns.';

    if (this.category === 'household') {
      if (ratio > 1.2) {
        pattern = 'weekend-heavy';
        score = 60;
        comparison = 'higher than typical';
        recommendation = 'Consider shifting some weekend activities to weekdays for better load distribution.';
      } else if (ratio < 0.8) {
        pattern = 'weekday-heavy';
        score = 85;
        comparison = 'efficient';
        recommendation = 'Excellent weekday efficiency! Your weekend usage is well-controlled.';
      } else {
        score = 80;
        comparison = 'well-balanced';
      }
    } else if (this.category === 'SME') {
      if (ratio > 0.5) {
        pattern = 'high weekend usage';
        score = 50;
        comparison = 'unusual for business';
        recommendation = 'High weekend usage detected. Review security systems and equipment that may be running unnecessarily.';
      } else {
        score = 90;
        comparison = 'excellent for business';
        recommendation = 'Great job maintaining low weekend usage for your business operations.';
      }
    }

    return { score, pattern, comparison, recommendation };
  }

  private getAnomalyRecommendation(type: string, severity: string, value: number, mean: number): string {
    const isHigh = value > mean;
    const category = this.getCategoryName().toLowerCase();
    
    if (type === 'usage') {
      if (isHigh) {
        return `Unusually high energy usage detected. Check for malfunctioning equipment, increased occupancy, or changes in ${category} operations.`;
      } else {
        return `Unusually low energy usage detected. Verify if this represents actual reduced consumption or potential meter reading issues.`;
      }
    } else {
      if (isHigh) {
        return `Unexpected cost spike detected. Review tariff changes, peak hour usage, or billing anomalies for your ${category} account.`;
      } else {
        return `Unusually low cost detected. Verify billing accuracy or check if energy-saving measures are working effectively.`;
      }
    }
  }

  private getTrendRecommendation(direction: string, percentChange: number): string {
    const category = this.getCategoryName().toLowerCase();
    
    if (direction === 'increasing') {
      if (percentChange > 20) {
        return `Significant usage increase predicted. Conduct an energy audit for your ${category} operations and consider efficiency upgrades.`;
      } else {
        return `Moderate usage increase expected. Monitor your ${category} energy consumption and implement conservation measures.`;
      }
    } else {
      if (percentChange > 15) {
        return `Excellent downward trend! Your ${category} energy efficiency improvements are working well. Continue current practices.`;
      } else {
        return `Slight decrease in usage predicted. Consider additional energy-saving measures to maximize your ${category} efficiency gains.`;
      }
    }
  }

  private analyzeTimeEfficiency(readings: EnergyReading[]): number {
    // Analyze if usage aligns with optimal hours for category
    const optimalHours = this.getCategoryOptimalHours();
    let optimalUsage = 0;
    let totalUsage = 0;

    readings.forEach(reading => {
      const hour = new Date(reading.reading_date).getHours();
      totalUsage += reading.kwh_consumed;
      if (optimalHours.includes(hour)) {
        optimalUsage += reading.kwh_consumed;
      }
    });

    return Math.min(100, (optimalUsage / totalUsage) * 100 + 20); // Base score + efficiency bonus
  }

  private analyzeCostEfficiency(costPerKwh: number): number {
    // Compare against category benchmarks
    const benchmarks = {
      household: 25,
      SME: 28,
      industry: 22
    };
    
    const benchmark = benchmarks[this.category as keyof typeof benchmarks] || 25;
    const efficiency = Math.max(0, 100 - ((costPerKwh - benchmark) / benchmark) * 100);
    return Math.min(100, Math.max(0, efficiency));
  }

  private analyzeConsistency(readings: EnergyReading[]): number {
    const usageValues = readings.map(r => r.kwh_consumed);
    const mean = usageValues.reduce((sum, val) => sum + val, 0) / usageValues.length;
    const variance = usageValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / usageValues.length;
    const coefficientOfVariation = Math.sqrt(variance) / mean;
    
    // Lower variation = higher consistency score
    return Math.max(0, 100 - (coefficientOfVariation * 100));
  }

  private getEfficiencyRecommendation(score: number, topFactor: string): string {
    const category = this.getCategoryName().toLowerCase();
    
    if (score >= 85) {
      return `Excellent ${category} efficiency! Focus on maintaining current practices and exploring advanced optimization techniques.`;
    } else if (score >= 70) {
      return `Good ${category} efficiency with room for improvement. Focus on optimizing ${topFactor.toLowerCase()} for better results.`;
    } else {
      return `${category} efficiency needs attention. Prioritize ${topFactor.toLowerCase()} improvements and consider an energy audit.`;
    }
  }

  private extractBehavioralFeatures() {
    // Extract features for behavioral analysis
    const readings = this.readings.slice(-30);
    
    return {
      avgDailyUsage: readings.reduce((sum, r) => sum + r.kwh_consumed, 0) / readings.length,
      peakHourRatio: this.calculatePeakHourRatio(readings),
      weekendRatio: this.calculateWeekendRatio(readings),
      variability: this.calculateVariability(readings),
      costSensitivity: this.calculateCostSensitivity(readings)
    };
  }

  private classifyBehavior(patterns: any) {
    // Simplified behavioral classification
    const { avgDailyUsage, peakHourRatio, weekendRatio, variability } = patterns;
    
    if (variability < 0.2 && peakHourRatio < 0.3) {
      return {
        name: 'Efficient Optimizer',
        characteristics: ['consistent usage', 'off-peak preference', 'cost-conscious'],
        comparison: 'performing better than 80% of similar users',
        isOptimal: true,
        confidence: 0.85,
        recommendation: 'Excellent energy management! Continue your efficient practices and consider sharing tips with others.'
      };
    } else if (peakHourRatio > 0.6) {
      return {
        name: 'Peak User',
        characteristics: ['high peak-hour usage', 'convenience-focused', 'cost-impact potential'],
        comparison: 'using more expensive peak hours than 70% of similar users',
        isOptimal: false,
        confidence: 0.8,
        recommendation: 'Consider shifting some activities to off-peak hours to reduce costs significantly.'
      };
    } else if (variability > 0.4) {
      return {
        name: 'Variable User',
        characteristics: ['inconsistent patterns', 'reactive usage', 'optimization potential'],
        comparison: 'showing more variation than 60% of similar users',
        isOptimal: false,
        confidence: 0.75,
        recommendation: 'Focus on establishing more consistent usage patterns to improve efficiency and predictability.'
      };
    } else {
      return {
        name: 'Balanced User',
        characteristics: ['moderate usage patterns', 'room for optimization', 'typical behavior'],
        comparison: 'similar to average users in your category',
        isOptimal: false,
        confidence: 0.7,
        recommendation: 'Good foundation! Consider implementing targeted efficiency measures for better results.'
      };
    }
  }

  private analyzePeakHourCosts(readings: EnergyReading[]) {
    // Analyze potential savings from peak hour optimization
    const peakHours = [18, 19, 20, 21]; // Typical peak hours
    let peakUsage = 0;
    let totalUsage = 0;

    readings.forEach(reading => {
      const hour = new Date(reading.reading_date).getHours();
      totalUsage += reading.kwh_consumed;
      if (peakHours.includes(hour)) {
        peakUsage += reading.kwh_consumed;
      }
    });

    const peakRatio = peakUsage / totalUsage;
    const savings = Math.min(25, peakRatio * 30); // Max 25% savings

    return {
      savings,
      method: 'peak hour optimization',
      opportunity: 'shifting usage to off-peak hours',
      recommendation: `Shift ${(peakRatio * 100).toFixed(1)}% of your peak-hour usage to off-peak times for maximum savings.`
    };
  }

  private analyzeLoadShifting(readings: EnergyReading[]) {
    // Analyze load shifting potential
    // Get peak hours for the category
    const peakHours = [18, 19, 20, 21]; // Default peak hours
    const shiftablePotential = this.calculateShiftableLoad(peakHours);
    const savings = shiftablePotential * 0.25; // 25% of shiftable load

    return {
      savings,
      method: 'load shifting',
      opportunity: 'time-flexible operations',
      recommendation: `Identify and shift ${shiftablePotential}% of your flexible loads to off-peak hours.`
    };
  }

  private analyzeEfficiencyGains(readings: EnergyReading[]) {
    // Analyze efficiency improvement potential
    const currentEfficiency = this.analyzeEfficiencyFactors().currentScore;
    const potentialGain = Math.max(0, 90 - currentEfficiency);
    const savings = potentialGain * 0.5; // 50% of efficiency gap

    return {
      savings,
      method: 'efficiency improvements',
      opportunity: 'equipment and process optimization',
      recommendation: `Focus on efficiency upgrades to achieve ${potentialGain.toFixed(1)}% improvement potential.`
    };
  }

  private calculatePeakHourRatio(readings: EnergyReading[]): number {
    const peakHours = [17, 18, 19, 20, 21];
    let peakUsage = 0;
    let totalUsage = 0;

    readings.forEach(reading => {
      const hour = new Date(reading.reading_date).getHours();
      totalUsage += reading.kwh_consumed;
      if (peakHours.includes(hour)) {
        peakUsage += reading.kwh_consumed;
      }
    });

    return totalUsage > 0 ? peakUsage / totalUsage : 0;
  }

  private calculateWeekendRatio(readings: EnergyReading[]): number {
    let weekendUsage = 0;
    let weekdayUsage = 0;

    readings.forEach(reading => {
      const day = new Date(reading.reading_date).getDay();
      if (day === 0 || day === 6) {
        weekendUsage += reading.kwh_consumed;
      } else {
        weekdayUsage += reading.kwh_consumed;
      }
    });

    return weekdayUsage > 0 ? weekendUsage / weekdayUsage : 0;
  }

  private calculateVariability(readings: EnergyReading[]): number {
    const values = readings.map(r => r.kwh_consumed);
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return Math.sqrt(variance) / mean; // Coefficient of variation
  }

  private calculateCostSensitivity(readings: EnergyReading[]): number {
    // Analyze how usage responds to cost changes
    const costPerKwh = readings.map(r => r.total_cost / r.kwh_consumed);
    const usage = readings.map(r => r.kwh_consumed);
    
    // Simple correlation between cost and usage (inverse relationship expected)
    const n = readings.length;
    const costMean = costPerKwh.reduce((sum, c) => sum + c, 0) / n;
    const usageMean = usage.reduce((sum, u) => sum + u, 0) / n;
    
    const numerator = costPerKwh.reduce((sum, c, i) => sum + (c - costMean) * (usage[i] - usageMean), 0);
    const denominator = Math.sqrt(
      costPerKwh.reduce((sum, c) => sum + Math.pow(c - costMean, 2), 0) *
      usage.reduce((sum, u) => sum + Math.pow(u - usageMean, 2), 0)
    );
    
    return denominator > 0 ? Math.abs(numerator / denominator) : 0;
  }

  private getTimeframe(): string {
    if (this.readings.length === 0) return 'No data';
    
    // Sort readings by date to ensure correct first and last dates
    const sortedReadings = [...this.readings].sort(
      (a, b) => new Date(a.reading_date).getTime() - new Date(b.reading_date).getTime()
    );
    
    const firstDate = new Date(sortedReadings[0].reading_date);
    const lastDate = new Date(sortedReadings[sortedReadings.length - 1].reading_date);
    const daysDiff = Math.ceil((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Handle case where dates might be the same
    if (daysDiff <= 0) return '1 day';
    if (daysDiff <= 7) return `${daysDiff} days`;
    if (daysDiff <= 30) return `${Math.ceil(daysDiff / 7)} weeks`;
    return `${Math.ceil(daysDiff / 30)} months`;
  }
}

// Export the main function for generating ML insights
export const generateMLInsights = async (
  category: string,
  industryType: string | undefined,
  readings: EnergyReading[]
): Promise<MLInsight[]> => {
  const analyzer = new EnergyMLAnalyzer(category, industryType, readings);
  return await analyzer.generateMLInsights();
};