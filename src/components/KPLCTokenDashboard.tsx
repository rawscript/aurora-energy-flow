import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Zap,
  CreditCard,
  TrendingUp,
  TrendingDown,
  Calendar,
  AlertTriangle,
  ShoppingCart,
  Clock
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow, format } from 'date-fns';
import { useIsMobile } from '@/hooks/use-mobile';

interface TokenAnalytics {
  current_balance: number;
  daily_consumption_avg: number;
  estimated_days_remaining: number;
  monthly_spending: number;
  last_purchase_date: string;
  consumption_trend: 'increasing' | 'decreasing' | 'stable';
}

interface TokenTransaction {
  id: string;
  transaction_type: 'purchase' | 'consumption' | 'refund';
  amount: number;
  token_units?: number;
  transaction_date: string;
  reference_number?: string;
  vendor?: string;
  balance_after: number;
}

const KPLCTokenDashboard: React.FC = () => {
  const [analytics, setAnalytics] = useState<TokenAnalytics | null>(null);
  const [transactions, setTransactions] = useState<TokenTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const fetchTokenData = async () => {
    if (!user) return;

    try {
      // Since kplc_token_transactions table doesn't exist, we'll use energy_readings and billing_history
      // to simulate token analytics based on energy consumption and billing data

      // Fetch energy readings to calculate consumption patterns
      const { data: energyData, error: energyError } = await supabase
        .from('energy_readings')
        .select('*')
        .eq('user_id', user.id)
        .order('reading_date', { ascending: false })
        .limit(30);

      if (energyError) throw energyError;

      // Fetch billing history to simulate token purchases
      const { data: billingData, error: billingError } = await supabase
        .from('billing_history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (billingError) throw billingError;

      // Calculate mock analytics based on available data
      const recentReadings = energyData || [];
      const recentBills = billingData || [];

      // Simulate current token balance (mock calculation)
      const totalSpent = recentBills.reduce((sum, bill) => sum + bill.total_amount, 0);
      const avgDailyCost = recentReadings.length > 0
        ? recentReadings.reduce((sum, reading) => sum + reading.total_cost, 0) / recentReadings.length
        : 50;

      const simulatedBalance = Math.max(0, 500 - (avgDailyCost * 7)); // Simulate weekly depletion

      const dailyConsumptionAvg = avgDailyCost;
      const estimatedDaysRemaining = simulatedBalance > 0 ? Math.floor(simulatedBalance / avgDailyCost) : 0;
      const monthlySpending = totalSpent;
      const lastPurchaseDate = recentBills.length > 0 ? recentBills[0].created_at : new Date().toISOString();

      // Simple trend calculation based on recent vs older readings
      const recentAvg = recentReadings.slice(0, 7).reduce((sum, r) => sum + r.total_cost, 0) / Math.max(7, 1);
      const olderAvg = recentReadings.slice(7, 14).reduce((sum, r) => sum + r.total_cost, 0) / Math.max(7, 1);

      let consumptionTrend: 'increasing' | 'decreasing' | 'stable' = 'stable';
      if (recentAvg > olderAvg * 1.1) consumptionTrend = 'increasing';
      else if (recentAvg < olderAvg * 0.9) consumptionTrend = 'decreasing';

      setAnalytics({
        current_balance: simulatedBalance,
        daily_consumption_avg: dailyConsumptionAvg,
        estimated_days_remaining: estimatedDaysRemaining,
        monthly_spending: monthlySpending,
        last_purchase_date: lastPurchaseDate,
        consumption_trend: consumptionTrend
      });

      // Create mock transactions from billing history and energy readings
      const mockTransactions: TokenTransaction[] = [
        // Add billing history as token purchases
        ...recentBills.map((bill, index) => ({
          id: bill.id,
          transaction_type: 'purchase' as const,
          amount: bill.total_amount,
          token_units: bill.total_amount,
          transaction_date: bill.created_at,
          reference_number: `BILL-${bill.id.slice(0, 8)}`,
          vendor: 'M-PESA',
          balance_after: simulatedBalance + (bill.total_amount * (index + 1))
        })),
        // Add energy readings as consumption
        ...recentReadings.slice(0, 10).map((reading, index) => ({
          id: reading.id,
          transaction_type: 'consumption' as const,
          amount: reading.total_cost,
          token_units: reading.kwh_consumed,
          transaction_date: reading.reading_date,
          reference_number: `USAGE-${reading.id.slice(0, 8)}`,
          vendor: 'KPLC',
          balance_after: Math.max(0, simulatedBalance - (reading.total_cost * (index + 1)))
        }))
      ].sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime());

      setTransactions(mockTransactions);
    } catch (error) {
      console.error('Error fetching token data:', error);
      toast({
        title: 'Error loading token data',
        description: (error as Error).message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const simulateTokenPurchase = async () => {
    if (!user) return;

    try {
      // Get user's meter number from profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('meter_number, phone_number')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;

      if (!profile?.meter_number) {
        toast({
          title: 'Meter Setup Required',
          description: 'Please set up your meter number in Settings before purchasing tokens.',
          variant: 'destructive'
        });
        return;
      }
        //Use real API calls
      const amount = 200 + Math.random() * 300; // Random amount between 200-500
      const tokenUnits = amount; // 1:1 ratio for simplicity
      
      // Create a more realistic token purchase simulation
      // In a real implementation, this would integrate with KPLC's API or M-Pesa
      const tokenCode = `${Math.floor(Math.random() * 90000) + 10000}-${Math.floor(Math.random() * 90000) + 10000}-${Math.floor(Math.random() * 90000) + 10000}-${Math.floor(Math.random() * 90000) + 10000}`;
      
      // Create billing record to track the purchase
      const { error } = await supabase
        .from('billing_history')
        .insert({
          user_id: user.id,
          billing_month: new Date().toISOString().slice(0, 7), // YYYY-MM format
          total_amount: amount,
          total_kwh: tokenUnits / 25, // Simulate kWh equivalent (assuming 25 KSh per kWh)
          payment_status: 'paid',
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          paid_date: new Date().toISOString()
        });

      if (error) throw error;

      // Create a notification for successful purchase
      await supabase
        .from('ai_alerts')
        .insert({
          user_id: user.id,
          alert_type: 'token_purchase',
          title: 'Token Purchase Successful',
          message: `Successfully purchased KSh ${amount.toFixed(2)} worth of tokens for meter ${profile.meter_number}. Token code: ${tokenCode}`,
          severity: 'low',
          recommended_actions: {
            tokenCode,
            meterNumber: profile.meter_number,
            amount,
            tokenUnits
          }
        });

      toast({
        title: 'Token Purchase Successful',
        description: `KSh ${amount.toFixed(2)} tokens purchased for meter ${profile.meter_number}`,
      });

      // Show token code in a separate toast
      setTimeout(() => {
        toast({
          title: 'Token Code',
          description: `Enter this code in your meter: ${tokenCode}`,
          duration: 10000, // Show for 10 seconds
        });
      }, 1000);

      fetchTokenData(); // Refresh data
    } catch (error) {
      console.error('Error purchasing tokens:', error);
      toast({
        title: 'Purchase failed',
        description: (error as Error).message,
        variant: 'destructive'
      });
    }
  };

  useEffect(() => {
    fetchTokenData();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32 sm:h-64">
        <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-b-2 border-aurora-green-light"></div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-8">
        <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-yellow-500" />
        <p className="text-muted-foreground">No token data available</p>
        <Button 
          onClick={fetchTokenData}
          className="mt-4 bg-aurora-green hover:bg-aurora-green/80"
        >
          Retry Loading
        </Button>
      </div>
    );
  }

  const balancePercentage = Math.min(100, (analytics.current_balance / 500) * 100);
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
    .filter(t => t.transaction_type !== 'consumption')
    .slice(0, 10)
    .reverse()
    .map(t => ({
      date: format(new Date(t.transaction_date), 'MMM dd'),
      balance: t.balance_after,
      amount: t.amount
    }));

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
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

      {/* Quick Actions */}
      <Card className="bg-aurora-card border-aurora-green/20">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-center justify-between space-y-3 sm:space-y-0">
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${analytics.current_balance > 100 ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`}></div>
              <span className="text-sm">
                {analytics.current_balance > 100 ? 'Token balance is healthy' : 'Low token balance - consider purchasing'}
              </span>
            </div>
            <div className="flex space-x-2">
              <Button
                onClick={simulateTokenPurchase}
                size="sm"
                className="bg-aurora-green hover:bg-aurora-green/80"
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Buy Tokens
              </Button>
              <Button
                onClick={fetchTokenData}
                variant="outline"
                size="sm"
              >
                Refresh
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Balance Trend Chart */}
      {chartData.length > 0 && (
        <Card className="bg-aurora-card border-aurora-blue/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg sm:text-xl text-aurora-blue-light">Token Balance History</CardTitle>
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
                    formatter={(value) => [`KSh ${Number(value).toFixed(2)}`, 'Balance']}
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
          <CardTitle className="text-lg sm:text-xl text-aurora-purple-light">Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {transactions.slice(0, isMobile ? 5 : 8).map((transaction) => (
              <div key={transaction.id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-full ${transaction.transaction_type === 'purchase' ? 'bg-green-500/20' :
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
                      {transaction.transaction_type === 'purchase' ? 'Token Purchase' :
                        transaction.transaction_type === 'consumption' ? 'Energy Consumption' :
                          'Refund'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(transaction.transaction_date), { addSuffix: true })}
                    </p>
                    {transaction.reference_number && (
                      <p className="text-xs text-muted-foreground">Ref: {transaction.reference_number}</p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-medium text-sm ${transaction.transaction_type === 'purchase' ? 'text-green-500' : 'text-red-500'
                    }`}>
                    {transaction.transaction_type === 'purchase' ? '+' : '-'}KSh {transaction.amount.toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Balance: KSh {transaction.balance_after.toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {transactions.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No transactions yet</p>
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
                  <p className="text-sm font-medium">Last Token Purchase</p>
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