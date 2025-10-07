import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  Sun,
  BatteryFull,
  Zap,
  CreditCard,
  Calendar,
  TrendingUp,
  TrendingDown,
  Phone,
  CheckCircle,
  RefreshCw,
  Wrench,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { useSolarProvider } from '@/hooks/useSolarProvider';
import { formatDistanceToNow, format } from 'date-fns';
import { useIsMobile } from '@/hooks/use-mobile';
import { useProfile } from '@/hooks/useProfile';
// Remove SolarPanel import since it's no longer used here

interface SolarDashboardProps {
  energyProvider?: string;
}

const SolarDashboard: React.FC<SolarDashboardProps> = ({ energyProvider = 'Solar' }) => {
  const { paymentStatus, transactions, loading, purchasing, error, fetchPaymentStatus, fetchTransactions, purchaseCredits } = useSolarProvider(energyProvider);
  const { profile } = useProfile();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [purchaseDialogOpen, setPurchaseDialogOpen] = useState(false);
  const [purchaseAmount, setPurchaseAmount] = useState('500');
  const [paymentMethod, setPaymentMethod] = useState('M-PESA');
  const [phoneNumber, setPhoneNumber] = useState('');

  // Handle credit purchase
  const handlePurchaseCredits = async () => {
    const amount = parseFloat(purchaseAmount);

    // Validate amount
    if (isNaN(amount) || amount < 10) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount (minimum KSh 10).",
        variant: "destructive",
      });
      return;
    }

    // Validate phone number if using mobile money
    if ((paymentMethod === 'M-PESA' || paymentMethod === 'Airtel Money') && (!phoneNumber || phoneNumber.length < 10)) {
      toast({
        title: "Invalid Phone Number",
        description: "Please enter a valid phone number for mobile money payments.",
        variant: "destructive",
      });
      return;
    }

    const result = await purchaseCredits(amount, paymentMethod, phoneNumber);

    if (result) {
      toast({
        title: "Payment Successful",
        description: `Successfully paid KSh ${amount} for your solar system.`,
      });
      setPurchaseDialogOpen(false);
      setPurchaseAmount('500'); // Reset to default
      setPhoneNumber('');
    } else {
      toast({
        title: "Payment Failed",
        description: "Failed to process your payment. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Quick purchase amounts
  const quickAmounts = [500, 1000, 2000, 5000];

  // Handle retry
  const handleRetry = () => {
    fetchPaymentStatus();
    fetchTransactions();
  };

  if (loading && !paymentStatus) {
    return (
      <div className="flex items-center justify-center h-32 sm:h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-b-2 border-aurora-green-light mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground">
            Loading solar data...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-yellow-500" />
        <p className="text-muted-foreground">
          {error}
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          There was an issue loading your solar data
        </p>
        <Button
          onClick={handleRetry}
          className="mt-4"
          variant="outline"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      </div>
    );
  }

  if (!paymentStatus) {
    return (
      <div className="text-center py-8">
        <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-yellow-500" />
        <p className="text-muted-foreground">
          No solar data available
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          Connect your solar system to start tracking payments
        </p>
        <Button
          onClick={fetchPaymentStatus}
          className="mt-4"
          variant="outline"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Check Again
        </Button>
      </div>
    );
  }

  // Prepare chart data from transactions
  const chartData = transactions
    .filter(t => t.transaction_type === 'payment')
    .slice(0, 10)
    .reverse()
    .map(t => ({
      date: format(new Date(t.transaction_date), 'MMM dd'),
      balance: t.balance_after,
      amount: t.amount,
      performance: t.system_performance
    }));

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      {/* Ownership Progress */}
      <Card className="bg-aurora-card border-aurora-green/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg sm:text-xl text-aurora-green-light flex items-center gap-2">
            <Sun className="h-5 w-5 sm:h-6 sm:w-6" />
            System Ownership Progress
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <div className="relative inline-block">
              <Progress value={paymentStatus.ownership_percentage} className="w-32 h-32 rounded-full" />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-aurora-green-light">{paymentStatus.ownership_percentage}%</span>
                <span className="text-xs text-muted-foreground">Owned</span>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="text-center p-3 bg-slate-800/50 rounded-lg">
              <p className="text-sm text-muted-foreground">Total Paid</p>
              <p className="text-xl font-bold text-aurora-green-light">KSh {paymentStatus.total_paid.toLocaleString()}</p>
            </div>
            <div className="text-center p-3 bg-slate-800/50 rounded-lg">
              <p className="text-sm text-muted-foreground">Remaining</p>
              <p className="text-xl font-bold text-amber-400">KSh {paymentStatus.remaining_balance.toLocaleString()}</p>
            </div>
            <div className="text-center p-3 bg-slate-800/50 rounded-lg">
              <p className="text-sm text-muted-foreground">System Size</p>
              <p className="text-xl font-bold text-blue-400">{paymentStatus.system_size_kw} kW</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Status */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="bg-aurora-card border-aurora-green/20 aurora-glow">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CreditCard className="h-6 w-6 sm:h-8 sm:w-8 text-aurora-green-light" />
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Next Payment</p>
                  <p className="text-lg sm:text-2xl font-bold text-aurora-green-light">
                    KSh {paymentStatus.next_payment_amount.toLocaleString()}
                  </p>
                </div>
              </div>
              <Badge 
                className={paymentStatus.payment_status === 'current' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}
              >
                {paymentStatus.payment_status === 'current' ? 'Current' : 'Overdue'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-aurora-card border-aurora-blue/20 aurora-glow">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center space-x-2">
              <Calendar className="h-6 w-6 sm:h-8 sm:w-8 text-aurora-blue-light" />
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Due Date</p>
                <p className="text-lg sm:text-2xl font-bold text-aurora-blue-light">
                  {paymentStatus.next_payment_date 
                    ? format(new Date(paymentStatus.next_payment_date), 'MMM dd, yyyy')
                    : 'N/A'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-aurora-card border-aurora-purple/20 aurora-glow">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Sun className="h-6 w-6 sm:h-8 sm:w-8 text-aurora-purple-light" />
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Last Payment</p>
                  <p className="text-lg sm:text-2xl font-bold text-aurora-purple-light">
                    KSh {paymentStatus.last_payment_amount.toLocaleString()}
                  </p>
                </div>
              </div>
              {paymentStatus.last_payment_date && (
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(paymentStatus.last_payment_date), { addSuffix: true })}
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-aurora-card border-emerald-500/20 aurora-glow">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center space-x-2">
              <Wrench className="h-6 w-6 sm:h-8 sm:w-8 text-emerald-400" />
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Maintenance</p>
                <p className="text-lg sm:text-2xl font-bold text-emerald-400">
                  Scheduled
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
              <div className={`w-3 h-3 rounded-full ${paymentStatus.payment_status === 'current' ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`}></div>
              <span className="text-sm">
                {paymentStatus.payment_status === 'current'
                  ? 'Payments are current'
                  : 'Payment overdue - please make payment'}
              </span>
            </div>
            <div className="flex space-x-2">
              <Button
                onClick={fetchPaymentStatus}
                size="sm"
                variant="outline"
                className="border-aurora-blue/30 hover:bg-aurora-blue/10"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Refresh
              </Button>
              <Dialog open={purchaseDialogOpen} onOpenChange={setPurchaseDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    size="sm"
                    className="bg-aurora-green hover:bg-aurora-green/80"
                    disabled={purchasing}
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    {purchasing ? 'Processing...' : 'Make Payment'}
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md bg-aurora-card border-aurora-green/20">
                  <DialogHeader>
                    <DialogTitle className="text-aurora-green-light">
                      Pay for Solar System
                    </DialogTitle>
                    <DialogDescription>
                      Make a payment toward your solar system ownership.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4">
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
                            KSh {amount.toLocaleString()}
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
                        max="100000"
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
                              <CreditCard className="h-4 w-4 text-blue-500" />
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
                        <span className="font-medium">KSh {parseFloat(purchaseAmount || '0').toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm mt-1">
                        <span>Payment Method:</span>
                        <span className="font-medium">{paymentMethod}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm mt-1">
                        <span>Provider:</span>
                        <span className="font-medium">{energyProvider}</span>
                      </div>
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
                      onClick={handlePurchaseCredits}
                      disabled={purchasing || !purchaseAmount || parseFloat(purchaseAmount) < 10 || 
                        ((paymentMethod === 'M-PESA' || paymentMethod === 'Airtel Money') && (!phoneNumber || phoneNumber.length < 10))}
                      className="bg-aurora-green hover:bg-aurora-green/80"
                    >
                      {purchasing ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Make Payment
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

      {/* Payment History Chart */}
      {chartData.length > 0 && (
        <Card className="bg-aurora-card border-aurora-blue/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg sm:text-xl font-bold flex items-center">
              <CreditCard className="h-5 w-5 sm:h-6 sm:w-6 mr-2 text-aurora-green-light" />
              Payment History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`${isMobile ? 'h-48' : 'h-64'}`}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.1} />
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
                      border: '1px solid #10b981',
                      borderRadius: '8px',
                      fontSize: isMobile ? '12px' : '14px'
                    }}
                    formatter={(value) => [`KSh ${Number(value).toLocaleString()}`, 'Balance']}
                  />
                  <Area
                    type="monotone"
                    dataKey="balance"
                    stroke="#10b981"
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
            Recent Transactions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {transactions.slice(0, isMobile ? 5 : 8).map((transaction) => (
              <div key={transaction.id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-full ${
                    transaction.transaction_type === 'payment' ? 'bg-green-500/20' :
                    transaction.transaction_type === 'maintenance' ? 'bg-blue-500/20' :
                    'bg-amber-500/20'
                  }`}>
                    {transaction.transaction_type === 'payment' ? (
                      <CreditCard className="h-4 w-4 text-green-500" />
                    ) : transaction.transaction_type === 'maintenance' ? (
                      <Wrench className="h-4 w-4 text-blue-500" />
                    ) : (
                      <TrendingUp className="h-4 w-4 text-amber-500" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-sm">
                      {transaction.transaction_type === 'payment'
                        ? 'System Payment'
                        : transaction.transaction_type === 'maintenance'
                          ? 'Maintenance Service'
                          : 'System Adjustment'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(transaction.transaction_date), { addSuffix: true })}
                    </p>
                    {transaction.reference_number && (
                      <p className="text-xs text-muted-foreground">Ref: {transaction.reference_number}</p>
                    )}
                    <p className="text-xs text-aurora-green-light">
                      {transaction.description}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-medium text-sm ${
                    transaction.transaction_type === 'payment' ? 'text-green-500' : 'text-blue-500'
                  }`}>
                    {transaction.transaction_type === 'payment' ? '+' : ''}KSh {transaction.amount.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Balance: KSh {transaction.balance_after.toLocaleString()}
                  </p>
                  {transaction.system_performance && (
                    <Badge
                      variant="outline"
                      className="text-xs mt-1"
                      style={{
                        color: transaction.system_performance > 90 ? '#10b981' : 
                               transaction.system_performance > 80 ? '#f59e0b' : '#ef4444',
                        borderColor: transaction.system_performance > 90 ? '#10b981' : 
                                     transaction.system_performance > 80 ? '#f59e0b' : '#ef4444'
                      }}
                    >
                      {transaction.system_performance}% Efficiency
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>

          {transactions.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No transactions yet</p>
              <p className="text-sm mt-2">Make your first payment to get started</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* System Information */}
      <Card className="bg-aurora-card border-aurora-blue/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg sm:text-xl text-aurora-blue-light">
            System Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Installation Date:</span>
                <span>
                  {paymentStatus.installation_date 
                    ? format(new Date(paymentStatus.installation_date), 'MMM dd, yyyy')
                    : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Warranty End:</span>
                <span>
                  {paymentStatus.warranty_end_date 
                    ? format(new Date(paymentStatus.warranty_end_date), 'MMM dd, yyyy')
                    : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Payment Frequency:</span>
                <span className="capitalize">{paymentStatus.payment_frequency}</span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total System Cost:</span>
                <span>KSh {paymentStatus.total_cost.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Maintenance Schedule:</span>
                <span className="text-right text-sm">{paymentStatus.maintenance_schedule}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SolarDashboard;