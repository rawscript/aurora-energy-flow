import React, { useState } from 'react';
import { useEnergyInsights } from '@/hooks/useEnergyInsights';
import { useProfile } from '@/hooks/useProfile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Zap, 
  RefreshCw, 
  Clock, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle,
  Phone,
  Hash,
  Calendar,
  DollarSign
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface EnergyInsightsDashboardProps {
  meterNumber: string;
  className?: string;
}

export const EnergyInsightsDashboard: React.FC<EnergyInsightsDashboardProps> = ({ 
  meterNumber, 
  className = '' 
}) => {
  const { profile } = useProfile();
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

  const [phoneNumber, setPhoneNumber] = useState(profile?.phone_number || '');
  const [requestType, setRequestType] = useState<'current' | 'detailed' | 'history'>('current');

  // Format time until next fetch
  const formatTimeUntilNext = (milliseconds: number): string => {
    if (milliseconds <= 0) return 'Now';
    
    const minutes = Math.ceil(milliseconds / 1000 / 60);
    if (minutes < 60) return `${minutes}m`;
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  // Handle fetch request
  const handleFetchData = async () => {
    if (!phoneNumber) {
      return;
    }
    
    clearError();
    await fetchFreshInsights(phoneNumber, requestType);
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header Card */}
      <Card className="bg-aurora-card border-aurora-green/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-aurora-green-light" />
            Energy Insights - Demand Driven
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Fetch fresh energy data from KPLC via SMS when you need it. No automatic polling.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="phone-number">Phone Number</Label>
              <div className="flex items-center space-x-2">
                <Phone className="h-4 w-4 text-gray-400" />
                <Input
                  id="phone-number"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+254712345678"
                  className="flex-1"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="meter-display">Meter Number</Label>
              <div className="flex items-center space-x-2">
                <Hash className="h-4 w-4 text-gray-400" />
                <Input
                  id="meter-display"
                  value={meterNumber}
                  disabled
                  className="flex-1 bg-gray-50"
                />
              </div>
            </div>
          </div>

          {/* Request Type Selection */}
          <div className="mt-4">
            <Label>Request Type</Label>
            <div className="flex gap-2 mt-2">
              {(['current', 'detailed', 'history'] as const).map((type) => (
                <Button
                  key={type}
                  variant={requestType === type ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setRequestType(type)}
                  className="capitalize"
                >
                  {type}
                </Button>
              ))}
            </div>
          </div>

          {/* Fetch Button */}
          <div className="mt-4 flex items-center gap-4">
            <Button
              onClick={handleFetchData}
              disabled={loading || !canFetchMore || !phoneNumber}
              className="bg-aurora-green hover:bg-aurora-green/80"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Fetching via SMS...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Get Fresh Data
                </>
              )}
            </Button>

            {!canFetchMore && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                Next request in: {formatTimeUntilNext(timeUntilNextFetch)}
              </div>
            )}

            {insights && (
              <Button
                variant="outline"
                size="sm"
                onClick={refreshFromCache}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Cache
              </Button>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <span className="text-sm text-red-700">{error}</span>
              <Button variant="ghost" size="sm" onClick={clearError} className="ml-auto">
                Dismiss
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Data Status Card */}
      <Card className="bg-aurora-card border-aurora-blue/20">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Data Status</span>
            {insights && (
              <Badge 
                variant={hasRecentData ? 'default' : 'secondary'}
                className={hasRecentData ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}
              >
                {hasRecentData ? 'Fresh' : 'Stale'}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {insights ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Last Updated</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {formatDistanceToNow(new Date(insights.lastUpdated), { addSuffix: true })}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-blue-500" />
                  <span className="text-sm">Source</span>
                </div>
                <Badge variant="outline" className="text-xs">
                  {insights.source.toUpperCase()}
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-purple-500" />
                  <span className="text-sm">Efficiency Score</span>
                </div>
                <span className="text-sm font-medium">
                  {insights.efficiencyScore}%
                </span>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Zap className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No energy data available</p>
              <p className="text-sm">Click "Get Fresh Data" to fetch from KPLC</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Energy Insights Display */}
      {insights && (
        <Card className="bg-aurora-card border-aurora-purple/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-aurora-purple-light" />
              Energy Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-600">Current Usage</span>
                </div>
                <p className="text-2xl font-bold text-blue-900">
                  {insights.currentUsage.toFixed(1)} kWh
                </p>
              </div>

              <div className="p-4 bg-green-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-600">Daily Total</span>
                </div>
                <p className="text-2xl font-bold text-green-900">
                  {insights.dailyTotal.toFixed(1)} kWh
                </p>
              </div>

              <div className="p-4 bg-purple-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="h-4 w-4 text-purple-600" />
                  <span className="text-sm font-medium text-purple-600">Daily Cost</span>
                </div>
                <p className="text-2xl font-bold text-purple-900">
                  {formatCurrency(insights.dailyCost)}
                </p>
              </div>

              <div className="p-4 bg-orange-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-orange-600" />
                  <span className="text-sm font-medium text-orange-600">Efficiency</span>
                </div>
                <p className="text-2xl font-bold text-orange-900">
                  {insights.efficiencyScore}%
                </p>
              </div>
            </div>

            <Separator className="my-6" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-3">Weekly & Monthly</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Weekly Average:</span>
                    <span>{insights.weeklyAverage.toFixed(1)} kWh</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Monthly Total:</span>
                    <span>{insights.monthlyTotal.toFixed(1)} kWh</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-3">Data Info</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Meter:</span>
                    <span>{insights.meterNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Source:</span>
                    <span className="capitalize">{insights.source}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status:</span>
                    <Badge 
                      variant={insights.status === 'fresh' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {insights.status}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instructions Card */}
      <Card className="bg-aurora-card border-aurora-green/20">
        <CardHeader>
          <CardTitle className="text-lg">How It Works</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-aurora-green/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-medium text-aurora-green">1</span>
              </div>
              <div>
                <p className="font-medium">On-Demand Fetching</p>
                <p className="text-muted-foreground">Data is only fetched when you click "Get Fresh Data" - no automatic polling</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-aurora-green/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-medium text-aurora-green">2</span>
              </div>
              <div>
                <p className="font-medium">SMS/USSD Integration</p>
                <p className="text-muted-foreground">Uses SMS service to fetch real data from KPLC - no web scraping</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-aurora-green/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-medium text-aurora-green">3</span>
              </div>
              <div>
                <p className="font-medium">Rate Limited</p>
                <p className="text-muted-foreground">5-minute cooldown between requests to prevent API abuse</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};