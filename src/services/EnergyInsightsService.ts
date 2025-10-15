import { supabase } from '@/integrations/supabase/client';
import { kplcSMSService } from '@/utils/kplcSMSService';

// Microservice for Energy Insights - Demand-driven approach
export interface EnergyInsight {
  id: string;
  userId: string;
  meterNumber: string;
  currentUsage: number;
  dailyTotal: number;
  dailyCost: number;
  weeklyAverage: number;
  monthlyTotal: number;
  efficiencyScore: number;
  lastUpdated: string;
  source: 'sms' | 'ussd' | 'manual';
  status: 'fresh' | 'stale' | 'pending';
}

export interface EnergyFetchRequest {
  userId: string;
  meterNumber: string;
  phoneNumber: string;
  requestType: 'current' | 'detailed' | 'history';
}

class EnergyInsightsService {
  private static instance: EnergyInsightsService;
  private pendingRequests = new Map<string, Promise<EnergyInsight>>();
  private cache = new Map<string, { data: EnergyInsight; timestamp: number }>();
  private readonly CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
  private readonly REQUEST_COOLDOWN = 5 * 60 * 1000; // 5 minutes between requests

  static getInstance(): EnergyInsightsService {
    if (!EnergyInsightsService.instance) {
      EnergyInsightsService.instance = new EnergyInsightsService();
    }
    return EnergyInsightsService.instance;
  }

  /**
   * Get cached energy insights - NO automatic fetching
   */
  getCachedInsights(userId: string, meterNumber: string): EnergyInsight | null {
    const cacheKey = `${userId}_${meterNumber}`;
    const cached = this.cache.get(cacheKey);

    if (cached && (Date.now() - cached.timestamp) < this.CACHE_DURATION) {
      return cached.data;
    }

    return null;
  }

  /**
   * Check if we have recent data (within last 30 minutes)
   */
  hasRecentData(userId: string, meterNumber: string): boolean {
    const cached = this.getCachedInsights(userId, meterNumber);
    return cached !== null && cached.status === 'fresh';
  }

  /**
   * Get the last update time for insights
   */
  getLastUpdateTime(userId: string, meterNumber: string): Date | null {
    const cached = this.getCachedInsights(userId, meterNumber);
    return cached ? new Date(cached.lastUpdated) : null;
  }

  /**
   * Check if user can make a new request (rate limiting)
   */
  canMakeRequest(userId: string, meterNumber: string): boolean {
    const lastUpdate = this.getLastUpdateTime(userId, meterNumber);
    if (!lastUpdate) return true;

    return (Date.now() - lastUpdate.getTime()) > this.REQUEST_COOLDOWN;
  }

  /**
   * Get time until next request is allowed
   */
  getTimeUntilNextRequest(userId: string, meterNumber: string): number {
    const lastUpdate = this.getLastUpdateTime(userId, meterNumber);
    if (!lastUpdate) return 0;

    const timeSinceLastRequest = Date.now() - lastUpdate.getTime();
    return Math.max(0, this.REQUEST_COOLDOWN - timeSinceLastRequest);
  }

  /**
   * Fetch fresh insights from KPLC via SMS/USSD - ONLY when explicitly requested
   */
  async fetchFreshInsights(request: EnergyFetchRequest): Promise<EnergyInsight> {
    const { userId, meterNumber, phoneNumber, requestType } = request;
    const requestKey = `${userId}_${meterNumber}`;

    // Check if request is already in progress
    if (this.pendingRequests.has(requestKey)) {
      console.log('Request already in progress, returning existing promise');
      return this.pendingRequests.get(requestKey)!;
    }

    // Check rate limiting
    if (!this.canMakeRequest(userId, meterNumber)) {
      const waitTime = this.getTimeUntilNextRequest(userId, meterNumber);
      throw new Error(`Please wait ${Math.ceil(waitTime / 1000 / 60)} minutes before making another request`);
    }

    // Create the request promise
    const requestPromise = this.performEnergyFetch(request);
    this.pendingRequests.set(requestKey, requestPromise);

    try {
      const result = await requestPromise;

      // Cache the result
      this.cache.set(requestKey, {
        data: result,
        timestamp: Date.now()
      });

      return result;
    } finally {
      // Clean up pending request
      this.pendingRequests.delete(requestKey);
    }
  }

  /**
   * Perform the actual energy fetch via SMS/USSD
   */
  private async performEnergyFetch(request: EnergyFetchRequest): Promise<EnergyInsight> {
    const { userId, meterNumber, phoneNumber, requestType } = request;

    console.log(`Fetching energy insights via SMS for meter ${meterNumber}, type: ${requestType}`);

    try {
      // Use SMS service to fetch bill data from KPLC based on request type
      const billData = await this.fetchDataByType(meterNumber, phoneNumber, userId, requestType);

      // Transform to energy insight format - DAILY DATA ONLY
      const todayConsumption = this.calculateDailyConsumption(billData);
      const todayCost = this.calculateDailyCost(billData);

      const insight: EnergyInsight = {
        id: `insight_${Date.now()}`,
        userId,
        meterNumber,
        currentUsage: todayConsumption, // Today's usage only
        dailyTotal: todayConsumption, // Same as current usage for daily view
        dailyCost: todayCost, // Today's cost only
        weeklyAverage: todayConsumption, // Will be calculated from historical daily data
        monthlyTotal: todayConsumption * 30, // Estimate based on today's usage
        efficiencyScore: this.calculateEfficiencyScore(todayConsumption),
        lastUpdated: new Date().toISOString(),
        source: 'sms',
        status: 'fresh'
      };

      // Store in database for persistence (non-blocking)
      await this.storeInsight(insight);

      return insight;
    } catch (error) {
      console.error('Error fetching energy insights:', error);

      // Return stale data if available, otherwise throw
      const cached = this.getCachedInsights(userId, meterNumber);
      if (cached) {
        return { ...cached, status: 'stale' };
      }

      throw new Error(`Failed to fetch energy data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Fetch data based on request type
   */
  private async fetchDataByType(
    meterNumber: string,
    phoneNumber: string,
    userId: string,
    requestType: 'current' | 'detailed' | 'history'
  ) {
    switch (requestType) {
      case 'current':
        // Fetch current bill data
        return await kplcSMSService.fetchBillData(meterNumber, phoneNumber, userId);

      case 'detailed':
        // For detailed, we could fetch additional data or use different SMS commands
        // For now, use the same service but could be enhanced
        return await kplcSMSService.fetchBillData(meterNumber, phoneNumber, userId);

      case 'history':
        // For history, we could implement historical data fetching
        // For now, use the same service but could be enhanced
        return await kplcSMSService.fetchBillData(meterNumber, phoneNumber, userId);

      default:
        return await kplcSMSService.fetchBillData(meterNumber, phoneNumber, userId);
    }
  }

  /**
   * Calculate daily consumption from bill data (not lifetime)
   */
  private calculateDailyConsumption(billData: any): number {
    // Extract today's consumption only, not lifetime meter reading
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // If bill data has daily breakdown, use it
    if (billData.dailyConsumption) {
      return billData.dailyConsumption;
    }

    // Otherwise, estimate from recent consumption
    // This should be enhanced to get actual daily data from KPLC
    return billData.consumption || 0;
  }

  /**
   * Calculate daily cost from bill data (not lifetime)
   */
  private calculateDailyCost(billData: any): number {
    const dailyConsumption = this.calculateDailyConsumption(billData);
    const costPerKwh = billData.costPerKwh || 25; // Default KSh 25 per kWh

    return dailyConsumption * costPerKwh;
  }

  /**
   * Calculate efficiency score based on daily consumption
   */
  private calculateEfficiencyScore(dailyConsumption: number): number {
    // Efficiency based on daily usage (not lifetime)
    if (dailyConsumption < 5) return 95;   // Very efficient
    if (dailyConsumption < 10) return 85;  // Good
    if (dailyConsumption < 20) return 75;  // Average
    if (dailyConsumption < 30) return 65;  // High usage
    return 55; // Very high usage
  }

  /**
   * Store insight in database
   */
  private async storeInsight(insight: EnergyInsight): Promise<void> {
    try {
      const { error } = await supabase
        .from('energy_insights')
        .upsert({
          id: insight.id,
          user_id: insight.userId,
          meter_number: insight.meterNumber,
          current_usage: insight.currentUsage,
          daily_total: insight.dailyTotal,
          daily_cost: insight.dailyCost,
          weekly_average: insight.weeklyAverage,
          monthly_total: insight.monthlyTotal,
          efficiency_score: insight.efficiencyScore,
          last_updated: insight.lastUpdated,
          source: insight.source,
          status: insight.status
        }, {
          onConflict: 'user_id,meter_number'
        });

      if (error) {
        console.error('Error storing energy insight:', error);
        // Don't throw here - we still want to return the insight even if storage fails
      }
    } catch (error) {
      console.error('Error storing energy insight:', error);
      // Don't throw here - we still want to return the insight even if storage fails
    }
  }

  /**
   * Load insights from database (for app startup)
   */
  async loadStoredInsights(userId: string, meterNumber: string): Promise<EnergyInsight | null> {
    try {
      const { data, error } = await supabase
        .from('energy_insights')
        .select('*')
        .eq('user_id', userId)
        .eq('meter_number', meterNumber)
        .order('last_updated', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !data) {
        return null;
      }

      const insight: EnergyInsight = {
        id: data.id,
        userId: data.user_id,
        meterNumber: data.meter_number,
        currentUsage: data.current_usage,
        dailyTotal: data.daily_total,
        dailyCost: data.daily_cost,
        weeklyAverage: data.weekly_average,
        monthlyTotal: data.monthly_total,
        efficiencyScore: data.efficiency_score,
        lastUpdated: data.last_updated,
        source: data.source,
        status: this.isDataFresh(data.last_updated) ? 'fresh' : 'stale'
      };

      // Cache it
      const cacheKey = `${userId}_${meterNumber}`;
      this.cache.set(cacheKey, {
        data: insight,
        timestamp: Date.now()
      });

      return insight;
    } catch (error) {
      console.error('Error loading stored insights:', error);
      return null;
    }
  }

  /**
   * Check if data is fresh (within last 30 minutes)
   */
  private isDataFresh(lastUpdated: string): boolean {
    const updateTime = new Date(lastUpdated).getTime();
    return (Date.now() - updateTime) < this.CACHE_DURATION;
  }

  /**
   * Clear cache for a specific user/meter
   */
  clearCache(userId: string, meterNumber: string): void {
    const cacheKey = `${userId}_${meterNumber}`;
    this.cache.delete(cacheKey);
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Export singleton instance
export const energyInsightsService = EnergyInsightsService.getInstance();

// Types are already exported above with the interface declaration