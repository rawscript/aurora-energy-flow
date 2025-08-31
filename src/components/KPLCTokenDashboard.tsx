import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Zap,
  CreditCard,
  TrendingUp,
  TrendingDown,
  Calendar,
  AlertTriangle,
  ShoppingCart,
  Clock,
  Wallet,
  Phone,
  CheckCircle,
  RefreshCw,
  Wifi,
  WifiOff,
  Database,
  Cloud,
  Sun,
  BatteryFull,
  BatteryLow,
  BatteryMedium,
  BatteryWarning
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { useKPLCTokens } from '@/hooks/useKPLCTokens';
import { formatDistanceToNow, format } from 'date-fns';
import { useIsMobile } from '@/hooks/use-mobile';

interface KPLCTokenDashboardProps {
  energyProvider?: 'KPLC' | 'SunCulture' | 'M-KOPA Solar' | 'Other';
}

const KPLCTokenDashboard: React.FC<KPLCTokenDashboardProps> = ({ energyProvider = '' }) => {
  const { 
    analytics, 
    transactions, 
    kplcBalance,
    loading, 
    purchasing, 
    error,
    purchaseTokens,
    checkKPLCBalance,
    fetchTokenAnalytics,
    hasValidSession
  } = useKPLCTokens(energyProvider);
  
  const isMobile = useIsMobile();
  const [purchaseDialogOpen, setPurchaseDialogOpen] = useState(false);
  const [purchaseAmount, setPurchaseAmount] = useState('200');
  const [paymentMethod, setPaymentMethod] = useState('M-PESA');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Handle token purchase
  const handlePurchaseTokens = useCallback(async () => {
    const amount = parseFloat(purchaseAmount);

    if (isNaN(amount) || amount < 10) {
      return;
    }

    const result = await purchaseTokens(amount, paymentMethod, phoneNumber, energyProvider as any);

    if (result) {
      setPurchaseDialogOpen(false);
      setPurchaseAmount('200'); // Reset to default
      setPhoneNumber('');
    }
  }, [purchaseAmount, paymentMethod, phoneNumber, purchaseTokens, energyProvider]);

  // Handle manual refresh
  const handleRefresh = useCallback(async () => {
    if (refreshing) return;
    
    setRefreshing(true);
    try {
      await Promise.all([
        fetchTokenAnalytics(),
        checkKPLCBalance()
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [refreshing, fetchTokenAnalytics, checkKPLCBalance]);

  // Quick purchase amounts
  const quickAmounts = [100, 200, 500, 1000];

  // Get data source icon
  const getDataSourceIcon = (source?: string) => {
    switch (source) {
      case 'cache':
        return <Database className="h-4 w-4 text-blue-400" />;
      case 'kplc_api':
        return <Cloud className="h-4 w-4 text-green-400" />;
      case 'solar_api':
        return <Sun className="h-4 w-4 text-yellow-400" />;
      case 'database':
        return <Wifi className="h-4 w-4 text-purple-400" />;
      case 'no_meter':
        return <WifiOff className="h-4 w-4 text-gray-400" />;
      default:
        return <Database className="h-4 w-4 text-gray-400" />;
    }
  };

  const getDataSourceText = (source?: string, cacheHit?: boolean) => {
    if (cacheHit) return 'Cached data';
    
    switch (source) {
      case 'cache':
        return 'Cached data';
      case 'kplc_api':
        return 'Live KPLC data';
      case 'database':
        return 'Database';
      case 'no_meter':
        return 'No meter connected';
      default:
        return 'Loading...';
    }
  };

  // Auto-refresh every 5 minutes (much less frequent)
  useEffect(() => {
    if (!hasValidSession || !analytics) return;

    const interval = setInterval(() => {
      console.log('Auto-refreshing token data...');
      fetchTokenAnalytics();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [hasValidSession, analytics, fetchTokenAnalytics, energyProvider]);

  if (loading && !analytics) {
    return (
      <div className="flex items-center justify-center h-32 sm:h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-b-2 border-aurora-green-light mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground">
            Loading {energyProvider === 'KPLC' ? 'token' : 'solar'} data...
          </p>
        </div>
      </div>
    );
  }

  if (!hasValidSession) {
    return (
      <div className="text-center py-8">
        <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-yellow-500" />
        <p className="text-muted-foreground">
          Please sign in to view {energyProvider === 'KPLC' ? 'token' : 'solar'} data
        </p>
      </div>
    );
  }

  if (!analytics || analytics.data_source === 'no_meter') {
    return (
      <div className="text-center py-8">
        <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-yellow-500" />
        <p className="text-muted-foreground">
          No {energyProvider === 'KPLC' ? 'token' : 'solar'} data available
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          Set up your {energyProvider === 'KPLC' ? 'meter' : 'inverter'} to start tracking usage
        </p>
        <Button
          onClick={handleRefresh}
          disabled={refreshing}
          className="mt-4"
          variant="outline"
        >
          {refreshing ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Checking...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Check Again
            </>
          )}
        </Button>
      </div>
    );
  }

  const balancePercentage = Math.min(100, (analytics.current_balance / 500) * 100);

  // Get provider icon
  const getProviderIcon = () => {
    switch (energyProvider) {
      case 'Solar':
      case 'SunCulture':
        return <Sun className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-400" />;
      case 'M-KOPA Solar':
        return <BatteryFull className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-400" />;
      case 'KPLC':
      case '':
      default:
        return <Zap className="h-6 w-6 sm:h-8 sm:w-8 text-aurora-green-light" />;
    }
  };
  
  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing': return <TrendingUp className="h-4 w-4 text-red-500" />;
      case 'decreasing': return <TrendingDown className="h-4 w-4 text-green-500" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getBalanceColor = (balance: number) => {
    if (balance <= 50) return 'text-red-500';
    if (balance <= 150) return 'text-yellow-500';
    return 'text-green-500';
  };

  // Prepare chart data from transactions
  const chartData = transactions
    .filter(t => t.transaction_type === 'purchase')
    .slice(0, 10)
    .reverse()
    .map(t => ({
      date: format(new Date(t.transaction_date), 'MMM dd'),
      balance: t.balance_after,
      amount: t.amount
    }));

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      {/* Data Source and Refresh Header */}
      <Card className="bg-aurora-card border-aurora-green/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {getDataSourceIcon(analytics.data_source)}
              <div>
                <p className="text-sm font-medium">
                  {getDataSourceText(analytics.data_source, analytics.cache_hit)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {analytics.last_updated ? 
                    `Updated ${formatDistanceToNow(new Date(analytics.last_updated), { addSuffix: true })}` :
                    'No recent updates'
                  }
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {error && (
                <Badge variant="destructive" className="text-xs">
                  {error}
                </Badge>
              )}
              <Button
                onClick={handleRefresh}
                disabled={refreshing}
                size="sm"
                variant="outline"
              >
                {refreshing ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Token Balance Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="bg-aurora-card border-aurora-green/20 aurora-glow">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Zap className="h-6 w-6 sm:h-8 sm:w-8 text-aurora-green-light" />
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Token Balance</p>
                  <p className={`text-lg sm:text-2xl font-bold ${getBalanceColor(analytics.current_balance)}`}>
                    KSh {analytics.current_balance.toFixed(2)}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <Progress value={balancePercentage} className="w-16 h-2 mb-1" />
                <span className="text-xs text-muted-foreground">{balancePercentage.toFixed(0)}%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-aurora-card border-aurora-blue/20 aurora-glow">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center space-x-2">
              <Calendar className="h-6 w-6 sm:h-8 sm:w-8 text-aurora-blue-light" />
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Days Remaining</p>
                <p className="text-lg sm:text-2xl font-bold text-aurora-blue-light">
                  {analytics.estimated_days_remaining}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-aurora-card border-aurora-purple/20 aurora-glow">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CreditCard className="h-6 w-6 sm:h-8 sm:w-8 text-aurora-purple-light" />
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Daily Avg</p>
                  <p className="text-lg sm:text-2xl font-bold text-aurora-purple-light">
                    KSh {analytics.daily_consumption_avg.toFixed(2)}
                  </p>
                </div>
              </div>
              {getTrendIcon(analytics.consumption_trend)}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-aurora-card border-emerald-500/20 aurora-glow">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center space-x-2">
              <ShoppingCart className="h-6 w-6 sm:h-8 sm:w-8 text-emerald-400" />
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Monthly Spend</p>
                <p className="text-lg sm:text-2xl font-bold text-emerald-400">
                  KSh {analytics.monthly_spending.toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Provider Live Balance */}
      {kplcBalance && (
        <Card className="bg-aurora-card border-green-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {getProviderIcon()}
                <div>
                  <p className="text-sm font-medium">
                    Live {energyProvider === 'KPLC' ? 'KPLC' : 'Solar'} Balance
                  </p>
                  <p className="text-2xl font-bold text-green-400">
                    KSh {kplcBalance.balance.toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    From {kplcBalance.source} • {formatDistanceToNow(new Date(kplcBalance.last_updated), { addSuffix: true })}
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="text-green-400 border-green-400/50">
                Live Data
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card className="bg-aurora-card border-aurora-green/20">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-center justify-between space-y-3 sm:space-y-0">
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${analytics.current_balance > 100 ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`}></div>
              <span className="text-sm">
                {analytics.current_balance > 100
                  ? `${energyProvider === 'KPLC' ? 'Token' : 'Solar'} balance is healthy`
                  : `Low ${energyProvider === 'KPLC' ? 'token' : 'solar'} balance - consider purchasing`}
              </span>
            </div>
            <div className="flex space-x-2">
              {energyProvider === 'KPLC' && (
                <Button
                  onClick={checkKPLCBalance}
                  size="sm"
                  variant="outline"
                  disabled={refreshing}
                >
                  <Cloud className="h-4 w-4 mr-2" />
                  Check KPLC
                </Button>
              )}
              <Dialog open={purchaseDialogOpen} onOpenChange={setPurchaseDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    size="sm"
                    className="bg-aurora-green hover:bg-aurora-green/80"
                    disabled={purchasing}
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    {purchasing ? 'Processing...' : `Buy ${energyProvider === 'KPLC' ? 'Tokens' : 'Credits'}`}
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md bg-aurora-card border-aurora-green/20">
                  <DialogHeader>
                    <DialogTitle className="text-aurora-green-light">
                      Purchase {energyProvider === 'KPLC' ? 'KPLC Tokens' : 'Solar Credits'}
                    </DialogTitle>
                    <DialogDescription>
                      {energyProvider === 'KPLC'
                        ? 'Buy electricity tokens directly from KPLC. You\'ll receive a token code to enter in your meter.'
                        : 'Buy solar credits for your solar provider. You\'ll receive a transaction reference.'}
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4">
                    {/* Provider Selection for Solar */}
                    {(energyProvider === 'Solar' || energyProvider === 'SunCulture' || energyProvider === 'M-KOPA Solar') && (
                      <div>
                        <Label className="text-sm font-medium">Solar Provider</Label>
                        <Select value={energyProvider} onValueChange={(value) => { /* Handle provider change */ }}>
                          <SelectTrigger className="mt-1 bg-slate-800 border-aurora-green/30">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-800 border-aurora-green/30">
                            <SelectItem value="Solar">Generic Solar</SelectItem>
                            <SelectItem value="SunCulture">
                              <div className="flex items-center space-x-2">
                                <Sun className="h-4 w-4 text-yellow-500" />
                                <span>SunCulture</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="M-KOPA Solar">
                              <div className="flex items-center space-x-2">
                                <BatteryFull className="h-4 w-4 text-yellow-500" />
                                <span>M-KOPA Solar</span>
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Quick Amount Buttons */}
                    <div>
                      <Label className="text-sm font-medium">Quick Amounts</Label>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        {quickAmounts.map((amount) => (
                          <Button
                            key={amount}
                            variant={purchaseAmount === amount.toString() ? "default" : "outline"}
                            size="sm"
                            onClick={() => setPurchaseAmount(amount.toString())}
                            className="text-sm"
                          >
                            KSh {amount}
                          </Button>
                        ))}
                      </div>
                    </div>

                    {/* Custom Amount */}
                    <div>
                      <Label htmlFor="amount" className="text-sm font-medium">Custom Amount (KSh)</Label>
                      <Input
                        id="amount"
                        type="number"
                        min="10"
                        max="10000"
                        value={purchaseAmount}
                        onChange={(e) => setPurchaseAmount(e.target.value)}
                        className="mt-1 bg-slate-800 border-aurora-green/30"
                        placeholder="Enter amount"
                      />
                    </div>

                    {/* Payment Method */}
                    <div>
                      <Label className="text-sm font-medium">Payment Method</Label>
                      <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                        <SelectTrigger className="mt-1 bg-slate-800 border-aurora-green/30">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-aurora-green/30">
                          <SelectItem value="M-PESA">
                            <div className="flex items-center space-x-2">
                              <Phone className="h-4 w-4 text-green-500" />
                              <span>M-PESA</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="Airtel Money">
                            <div className="flex items-center space-x-2">
                              <Phone className="h-4 w-4 text-red-500" />
                              <span>Airtel Money</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="Bank Transfer">
                            <div className="flex items-center space-x-2">
                              <Wallet className="h-4 w-4 text-blue-500" />
                              <span>Bank Transfer</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Phone Number for Mobile Money */}
                    {(paymentMethod === 'M-PESA' || paymentMethod === 'Airtel Money') && (
                      <div>
                        <Label htmlFor="phone" className="text-sm font-medium">Phone Number</Label>
                        <Input
                          id="phone"
                          type="tel"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          className="mt-1 bg-slate-800 border-aurora-green/30"
                          placeholder="254712345678"
                        />
                      </div>
                    )}

                    {/* Purchase Summary */}
                    <div className="p-3 bg-slate-800/50 rounded-lg border border-aurora-green/20">
                      <div className="flex justify-between items-center text-sm">
                        <span>Amount:</span>
                        <span className="font-medium">KSh {parseFloat(purchaseAmount || '0').toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm mt-1">
                        <span>{energyProvider === 'KPLC' ? 'Token Units' : 'Credits'}:</span>
                        <span className="font-medium">{parseFloat(purchaseAmount || '0').toFixed(2)} units</span>
                      </div>
                      <div className="flex justify-between items-center text-sm mt-1">
                        <span>Payment Method:</span>
                        <span className="font-medium">{paymentMethod}</span>
                      </div>
                      {energyProvider !== 'KPLC' && (
                        <div className="flex justify-between items-center text-sm mt-1">
                          <span>Provider:</span>
                          <span className="font-medium">{energyProvider}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setPurchaseDialogOpen(false)}
                      disabled={purchasing}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handlePurchaseTokens}
                      disabled={purchasing || !purchaseAmount || parseFloat(purchaseAmount) < 10}
                      className="bg-aurora-green hover:bg-aurora-green/80"
                    >
                      {purchasing ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Processing...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          {energyProvider === 'KPLC' ? 'Purchase Tokens' : 'Buy Credits'}
                        </>
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Balance Trend Chart */}
      {chartData.length > 0 && (
        <Card className="bg-aurora-card border-aurora-blue/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg sm:text-xl text-aurora-blue-light">
              {energyProvider === 'KPLC' ? 'Token Balance History' : 'Solar Credit History'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`${isMobile ? 'h-48' : 'h-64'}`}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis
                    dataKey="date"
                    stroke="#9ca3af"
                    fontSize={isMobile ? 10 : 12}
                  />
                  <YAxis stroke="#9ca3af" fontSize={isMobile ? 10 : 12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1f2937',
                      border: '1px solid #3b82f6',
                      borderRadius: '8px',
                      fontSize: isMobile ? '12px' : '14px'
                    }}
                    formatter={(value) => [`KSh ${Number(value).toFixed(2)}`, energyProvider === 'KPLC' ? 'Balance' : 'Credits']}
                  />
                  <Area
                    type="monotone"
                    dataKey="balance"
                    stroke="#3b82f6"
                    fillOpacity={1}
                    fill="url(#colorBalance)"
                    strokeWidth={isMobile ? 2 : 3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Transactions */}
      <Card className="bg-aurora-card border-aurora-purple/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg sm:text-xl text-aurora-purple-light">
            Recent {energyProvider === 'KPLC' ? 'Transactions' : 'Solar Transactions'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {transactions.slice(0, isMobile ? 5 : 8).map((transaction) => (
              <div key={transaction.id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-full ${
                    transaction.transaction_type === 'purchase' ? 'bg-green-500/20' :
                    transaction.transaction_type === 'consumption' ? 'bg-red-500/20' :
                    'bg-blue-500/20'
                  }`}>
                    {transaction.transaction_type === 'purchase' ? (
                      <CreditCard className="h-4 w-4 text-green-500" />
                    ) : transaction.transaction_type === 'consumption' ? (
                      <Zap className="h-4 w-4 text-red-500" />
                    ) : (
                      <TrendingUp className="h-4 w-4 text-blue-500" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-sm">
                      {transaction.transaction_type === 'purchase'
                        ? energyProvider === 'KPLC' ? 'Token Purchase' : 'Solar Credit Purchase'
                        : transaction.transaction_type === 'consumption'
                          ? 'Energy Consumption'
                          : transaction.transaction_type === 'refund'
                            ? 'Refund'
                            : 'Adjustment'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(transaction.transaction_date), { addSuffix: true })}
                    </p>
                    {transaction.reference_number && (
                      <p className="text-xs text-muted-foreground">Ref: {transaction.reference_number}</p>
                    )}
                    {transaction.token_code && (
                      <p className="text-xs text-aurora-green-light font-mono">
                        {energyProvider === 'KPLC' ? 'Code' : 'Ref'}: {transaction.token_code}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-medium text-sm ${
                    transaction.transaction_type === 'purchase' ? 'text-green-500' : 'text-red-500'
                  }`}>
                    {transaction.transaction_type === 'purchase' ? '+' : '-'}KSh {transaction.amount.toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Balance: KSh {transaction.balance_after.toFixed(2)}
                  </p>
                  <Badge
                    variant={transaction.status === 'completed' ? 'default' : 'secondary'}
                    className="text-xs mt-1"
                  >
                    {transaction.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>

          {transactions.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              {energyProvider === 'KPLC' ? (
                <>
                  <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No transactions yet</p>
                  <p className="text-sm mt-2">Purchase your first tokens to get started</p>
                </>
              ) : (
                <>
                  <Sun className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No solar transactions yet</p>
                  <p className="text-sm mt-2">Purchase your first solar credits to get started</p>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Last Purchase Info */}
      {analytics.last_purchase_date && (
        <Card className="bg-aurora-card border-emerald-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Calendar className="h-5 w-5 text-emerald-400" />
                <div>
                  <p className="text-sm font-medium">
                    Last {energyProvider === 'KPLC' ? 'Token' : 'Solar Credit'} Purchase
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(analytics.last_purchase_date), { addSuffix: true })}
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="text-emerald-400 border-emerald-400/50">
                {analytics.consumption_trend}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default KPLCTokenDashboard;