import React, { useState } from 'react';
import { useRealTimeEnergy } from '@/hooks/useRealTimeEnergy';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Zap, 
  RefreshCw, 
  Phone, 
  Hash, 
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface SMSEnergyDashboardProps {
  meterNumber?: string;
  className?: string;
}

export const SMSEnergyDashboard: React.FC<SMSEnergyDashboardProps> = ({ 
  meterNumber = '', 
  className = '' 
}) => {
  const {
    energyData,
    loading,
    error,
    hasMeterConnected,
    fetchEnergyData,
    purchaseTokens,
    clearError,
    canFetch,
    timeUntilNextFetch
  } = useRealTimeEnergy('KPLC');

  const [phoneNumber, setPhoneNumber] = useState('');
  const [tokenAmount, setTokenAmount] = useState('');

  // Format time until next fetch
  const formatTimeUntilNext = (milliseconds: number): string => {
    if (milliseconds <= 0) return 'Now';
    
    const minutes = Math.ceil(milliseconds / 1000 / 60);
    if (minutes < 60) return `${minutes}m`;
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  // Handle fetch energy data
  const handleFetchData = async () => {
    if (!phoneNumber) {
      return;
    }
    
    clearError();
    await fetchEnergyData(phoneNumber, true);
  };

  // Handle token purchase
  const handlePurchaseTokens = async () => {
    if (!phoneNumber || !tokenAmount) {
      return;
    }
    
    try {
      await purchaseTokens(parseInt(tokenAmount), phoneNumber);
      setTokenAmount('');
    } catch (error) {
      console.error('Token purchase failed:', error);
    }
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
            SMS Energy Dashboard
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Fetch real-time energy data from KPLC via SMS. No automatic polling - completely demand-driven.
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

          {/* Fetch Button */}
          <div className="mt-4 flex items-center gap-4">
            <Button
              onClick={handleFetchData}
              disabled={loading || !canFetch() || !phoneNumber || !hasMeterConnected}
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

            {!canFetch() && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                Next request in: {formatTimeUntilNext(timeUntilNextFetch())}
              </div>
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

      {/* Energy Data Display */}
      {energyData.current_usage > 0 && (
        <Card className="bg-aurora-card border-aurora-blue/20">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Current Energy Data</span>
              <Badge 
                variant="default"
                className="bg-green-100 text-green-800"
              >
                {energyData.source.toUpperCase()}
              </Badge>
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
                  {energyData.current_usage.toFixed(1)} kWh
                </p>
              </div>

              <div className="p-4 bg-green-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-600">Daily Total</span>
                </div>
                <p className="text-2xl font-bold text-green-900">
                  {energyData.daily_total.toFixed(1)} kWh
                </p>
              </div>

              <div className="p-4 bg-purple-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Hash className="h-4 w-4 text-purple-600" />
                  <span className="text-sm font-medium text-purple-600">Daily Cost</span>
                </div>
                <p className="text-2xl font-bold text-purple-900">
                  {formatCurrency(energyData.daily_cost)}
                </p>
              </div>

              <div className="p-4 bg-orange-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <RefreshCw className="h-4 w-4 text-orange-600" />
                  <span className="text-sm font-medium text-orange-600">Efficiency</span>
                </div>
                <p className="text-2xl font-bold text-orange-900">
                  {energyData.efficiency_score}%
                </p>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
              <span>Last Updated: {formatDistanceToNow(new Date(energyData.last_updated), { addSuffix: true })}</span>
              <span>Source: {energyData.source.toUpperCase()}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Token Purchase */}
      <Card className="bg-aurora-card border-aurora-purple/20">
        <CardHeader>
          <CardTitle>Purchase Tokens</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="token-amount">Amount (KES)</Label>
              <Input
                id="token-amount"
                type="number"
                value={tokenAmount}
                onChange={(e) => setTokenAmount(e.target.value)}
                placeholder="100"
                min="50"
                max="10000"
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={handlePurchaseTokens}
                disabled={loading || !phoneNumber || !tokenAmount || !hasMeterConnected}
                className="bg-aurora-purple hover:bg-aurora-purple/80"
              >
                {loading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  'Buy Tokens'
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Connection Status */}
      <Card className="bg-aurora-card border-aurora-green/20">
        <CardHeader>
          <CardTitle>Connection Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            {hasMeterConnected ? (
              <>
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-green-700">Meter Connected</span>
              </>
            ) : (
              <>
                <AlertCircle className="h-4 w-4 text-red-500" />
                <span className="text-red-700">No Meter Connected</span>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SMSEnergyDashboard;