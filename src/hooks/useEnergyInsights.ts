import { useState, useCallback, useEffect } from 'react';
import { useAuthenticatedApi } from '@/hooks/useAuthenticatedApi';
import { useToast } from '@/hooks/use-toast';
import { energyInsightsService, EnergyInsight, EnergyFetchRequest } from '@/services/EnergyInsightsService';

interface UseEnergyInsightsReturn {
  // State
  insights: EnergyInsight | null;
  loading: boolean;
  error: string | null;
  hasRecentData: boolean;
  canFetchMore: boolean;
  timeUntilNextFetch: number;

  // Actions
  fetchFreshInsights: (phoneNumber: string, requestType?: 'current' | 'detailed' | 'history') => Promise<void>;
  refreshFromCache: () => void;
  clearError: () => void;
}

export const useEnergyInsights = (meterNumber: string): UseEnergyInsightsReturn => {
  const { user, isAuthenticated, hasValidSession } = useAuthenticatedApi();
  const { toast } = useToast();

  const [insights, setInsights] = useState<EnergyInsight | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeUntilNextFetch, setTimeUntilNextFetch] = useState(0);

  const userId = user?.id;

  // Check if we have recent data
  const hasRecentData = insights?.status === 'fresh' || false;

  // Check if user can fetch more data
  const canFetchMore = userId && meterNumber ?
    energyInsightsService.canMakeRequest(userId, meterNumber) : false;

  // Load cached/stored insights on mount - NO automatic API calls
  useEffect(() => {
    if (!userId || !meterNumber || !hasValidSession()) return;

    const loadInitialData = async () => {
      try {
        // First check cache
        const cached = energyInsightsService.getCachedInsights(userId, meterNumber);
        if (cached) {
          console.log('Loading cached insights for meter:', meterNumber);
          setInsights(cached);
          return;
        }

        // Then check stored data (single DB call, no polling)
        const stored = await energyInsightsService.loadStoredInsights(userId, meterNumber);
        if (stored) {
          console.log('Loading stored insights for meter:', meterNumber);
          setInsights(stored);
        } else {
          console.log('No cached or stored insights found for meter:', meterNumber);
          // Explicitly set to null to indicate idle state
          setInsights(null);
        }
      } catch (err) {
        console.error('Error loading initial insights:', err);
        // Don't set error for initial load failure, just stay in idle state
        setInsights(null);
      }
    };

    loadInitialData();
  }, [userId, meterNumber, hasValidSession]);

  // Update time until next fetch
  useEffect(() => {
    if (!userId || !meterNumber) return;

    const updateTimer = () => {
      const timeLeft = energyInsightsService.getTimeUntilNextRequest(userId, meterNumber);
      setTimeUntilNextFetch(timeLeft);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [userId, meterNumber, insights?.lastUpdated]);

  // Fetch fresh insights - ONLY when user explicitly requests
  const fetchFreshInsights = useCallback(async (
    phoneNumber: string,
    requestType: 'current' | 'detailed' | 'history' = 'current'
  ) => {
    if (!userId || !meterNumber) {
      setError('User ID and meter number are required');
      return;
    }

    if (!phoneNumber) {
      setError('Phone number is required for SMS requests');
      return;
    }

    // Check rate limiting
    if (!energyInsightsService.canMakeRequest(userId, meterNumber)) {
      const waitTime = Math.ceil(energyInsightsService.getTimeUntilNextRequest(userId, meterNumber) / 1000 / 60);
      setError(`Please wait ${waitTime} minutes before making another request`);
      toast({
        title: 'Rate Limited',
        description: `Please wait ${waitTime} minutes before fetching new data`,
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const request: EnergyFetchRequest = {
        userId,
        meterNumber,
        phoneNumber,
        requestType
      };

      toast({
        title: 'Fetching Energy Data',
        description: 'Sending SMS request to KPLC...',
      });

      const freshInsights = await energyInsightsService.fetchFreshInsights(request);
      setInsights(freshInsights);

      toast({
        title: 'Data Updated',
        description: `Fresh energy data received from KPLC via SMS`,
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch energy insights';
      setError(errorMessage);

      toast({
        title: 'Fetch Failed',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [userId, meterNumber, toast]);

  // Refresh from cache (no API calls)
  const refreshFromCache = useCallback(() => {
    if (!userId || !meterNumber) return;

    const cached = energyInsightsService.getCachedInsights(userId, meterNumber);
    if (cached) {
      setInsights(cached);
      setError(null);
    }
  }, [userId, meterNumber]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // State
    insights,
    loading,
    error,
    hasRecentData,
    canFetchMore,
    timeUntilNextFetch,

    // Actions
    fetchFreshInsights,
    refreshFromCache,
    clearError
  };
};