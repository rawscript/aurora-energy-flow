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

    console.log(`Fetching energy insights via SMS for meter ${meterNumber}`);

    try {
      // Use SMS service to fetch bill data from KPLC
      const billData = await kplcSMSService.fetchBillData(meterNumber, phoneNumber, userId);

      // Transform to energy insight format
      const insight: EnergyInsight = {
        id: `insight_${Date.now()}`,
        userId,
        meterNumber,
        currentUsage: billData.currentReading - billData.previousReading,
        dailyTotal: billData.consumption,
        dailyCost: billData.billAmount,
        weeklyAverage: billData.consumption * 7, // Estimate
        monthlyTotal: billData.consumption * 30, // Estimate
        efficiencyScore: this.calculateEfficiencyScore(billData.consumption),
        lastUpdated: new Date().toISOString(),
        source: 'sms',
        status: 'fresh'
      };

      // Store in database for persistence
      await this.storeInsight(insight);

      return insight;
    } catch (error) {
      console.error('Error fetching energy insights:', error);
      
      // Return stale data if available, otherwise throw
      const cached = this.getCachedInsights(userId, meterNumber);
      if (cached) {
        return { ...cached, status: 'stale' };
      }
      
      throw new Error(`Failed to fetch energy data: ${error.message}`);
    }
  }

  /**
   * Calculate efficiency score based on consumption
   */
  private calculateEfficiencyScore(consumption: number): number {
    // Simple efficiency calculation - can be enhanced
    if (consumption < 10) return 95;
    if (consumption < 20) return 85;
    if (consumption < 50) return 75;
    if (consumption < 100) return 65;
    return 55;
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
      }
    } catch (error) {
      console.error('Error storing energy insight:', error);
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

// Export types
export type { EnergyFetchRequest };