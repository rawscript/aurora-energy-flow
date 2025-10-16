import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, Smartphone, Clock, Zap, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';
import { useEnergyInsights } from '@/hooks/useEnergyInsights';
import { useAuthenticatedApi } from '@/hooks/useAuthenticatedApi';

interface DemandDrivenEnergyDataProps {
  meterNumber: string;
}

/**
 * Demand-driven energy data component for SMS/USSD workflow
 * Only fetches data when user explicitly requests it
 */
export const DemandDrivenEnergyData: React.FC<DemandDrivenEnergyDataProps> = ({ meterNumber }) => {
  const { user } = useAuthenticatedApi();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [requestType, setRequestType] = useState<'current' | 'detailed' | 'history'>('current');

  const {
    insights,
    loading,
    error,
    hasRecentData,
    canFetchMore,
    timeUntilNextFetch,
    fetchFreshInsights,
    refreshFromCache,
    clearError
  } = useEnergyInsights(meterNumber);

  const handleFetchData = async () => {
    if (!phoneNumber) {
      return;
    }
    
    await fetchFreshInsights(phoneNumber, requestType);
  };

  const formatTime = (milliseconds: number): string => {
    const minutes = Math.ceil(milliseconds / 1000 / 60);
    if (minutes < 1) return 'now';
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Energy Data via SMS/USSD
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Request fresh energy data from KPLC via SMS. Data takes 1-2 minutes to arrive.
          </p>
        </CardHeader>
      </Card>

      {/* Current Data Display */}
      {insights && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Current Energy Data
              </span>
              <Badge variant={hasRecentData ? 'default' : 'secondary'}>
                {hasRecentData ? 'Fresh' : 'Stale'}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {insights.currentUsage.toFixed(2)}
                </div>
                <div className="text-sm text-muted-foreground">kW Current</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {insights.dailyTotal.toFixed(2)}
                </div>
                <div className="text-sm text-muted-foreground">kWh Today</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  KSh {insights.dailyCost.toFixed(2)}
                </div>
                <div className="text-sm text-muted-foreground">Cost Today</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {insights.efficiencyScore}%
                </div>
                <div className="text-sm text-muted-foreground">Efficiency</div>
              </div>
            </div>
            
            <div className="mt-4 text-xs text-muted-foreground">
              Last updated: {(() => {
                try {
                  if (!insights.lastUpdated) return 'Unknown';
                  const date = new Date(insights.lastUpdated);
                  return isNaN(date.getTime()) ? 'Invalid date' : date.toLocaleString();
                } catch (error) {
                  return 'Error formatting date';
                }
              })()}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Request Fresh Data */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Request Fresh Data
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Phone Number Input */}
          <div>
            <Label htmlFor="phone">Phone Number (for SMS)</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="e.g., +254712345678"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              disabled={loading}
            />
          </div>

          {/* Request Type */}
          <div>
            <Label>Data Type</Label>
            <div className="flex gap-2 mt-2">
              <Button
                variant={requestType === 'current' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setRequestType('current')}
                disabled={loading}
              >
                Current
              </Button>
              <Button
                variant={requestType === 'detailed' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setRequestType('detailed')}
                disabled={loading}
              >
                Detailed
              </Button>
              <Button
                variant={requestType === 'history' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setRequestType('history')}
                disabled={loading}
              >
                History
              </Button>
            </div>
          </div>

          {/* Rate Limiting Info */}
          {!canFetchMore && timeUntilNextFetch > 0 && (
            <Alert>
              <Clock className="h-4 w-4" />
              <AlertDescription>
                Next request available in {formatTime(timeUntilNextFetch)}
              </AlertDescription>
            </Alert>
          )}

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>{error}</span>
                <Button variant="outline" size="sm" onClick={clearError}>
                  Dismiss
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              onClick={handleFetchData}
              disabled={loading || !canFetchMore || !phoneNumber}
              className="flex-1"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending SMS...
                </>
              ) : (
                <>
                  <Smartphone className="h-4 w-4 mr-2" />
                  Request via SMS
                </>
              )}
            </Button>

            {insights && (
              <Button
                variant="outline"
                onClick={refreshFromCache}
                disabled={loading}
              >
                Refresh Cache
              </Button>
            )}
          </div>

          {/* Instructions */}
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>How it works:</strong> We'll send an SMS to KPLC requesting your energy data. 
              The response will arrive in 1-2 minutes and be automatically processed.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* No Data State */}
      {!insights && !loading && (
        <Card>
          <CardContent className="text-center py-8">
            <Smartphone className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Energy Data</h3>
            <p className="text-muted-foreground mb-4">
              Request fresh energy data from KPLC to get started
            </p>
            <p className="text-sm text-muted-foreground">
              Enter your phone number above and click "Request via SMS"
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};export
 default DemandDrivenEnergyData;