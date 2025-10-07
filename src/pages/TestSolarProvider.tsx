import React from 'react';
import { useSolarProvider } from '@/hooks/useSolarProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';

const TestSolarProvider = () => {
  const { 
    paymentStatus, 
    transactions, 
    loading, 
    error, 
    purchasing,
    fetchPaymentStatus, 
    fetchTransactions, 
    purchaseCredits 
  } = useSolarProvider('M-KOPA Solar');
  
  const { user } = useAuth();

  const handleTestPurchase = async () => {
    const result = await purchaseCredits(500, 'M-PESA', '254712345678');
    console.log('Purchase result:', result);
  };

  // Wrapper functions for button handlers
  const handleRefreshTransactions = () => {
    fetchTransactions(20); // Pass default limit
  };

  const handleRetry = () => {
    fetchPaymentStatus();
    fetchTransactions(20); // Pass default limit
  };

  // Show authentication warning if user is not logged in
  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center p-6 bg-yellow-500/20 rounded-lg max-w-md">
          <h2 className="text-xl font-bold text-yellow-500 mb-2">Authentication Required</h2>
          <p className="text-yellow-300 mb-4">Please sign in to test the solar provider functionality.</p>
          <Button onClick={() => window.location.hash = '#/auth'} variant="outline">
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  if (loading && !paymentStatus) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-aurora-green-light mx-auto mb-4"></div>
          <p>Loading solar provider data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center p-6 bg-red-500/20 rounded-lg max-w-md">
          <h2 className="text-xl font-bold text-red-500 mb-2">Error</h2>
          <p className="text-red-300 mb-4">{error}</p>
          <Button onClick={handleRetry} variant="outline">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-aurora-green-light mb-2">Solar Provider Test</h1>
        <p className="text-muted-foreground">Testing M-KOPA Solar integration</p>
        {user && (
          <p className="text-sm text-aurora-blue-light mt-2">Logged in as: {user.email}</p>
        )}
      </div>

      <div className="flex gap-4 justify-center flex-wrap">
        <Button onClick={fetchPaymentStatus} disabled={loading}>
          {loading ? 'Loading...' : 'Refresh Payment Status'}
        </Button>
        <Button onClick={handleRefreshTransactions} disabled={loading}>
          {loading ? 'Loading...' : 'Refresh Transactions'}
        </Button>
        <Button onClick={handleTestPurchase} disabled={purchasing}>
          {purchasing ? 'Processing...' : 'Test Purchase (KSh 500)'}
        </Button>
      </div>

      {paymentStatus && (
        <Card className="bg-aurora-card border-aurora-green/20">
          <CardHeader>
            <CardTitle className="text-aurora-green-light">Payment Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Total Paid</p>
                <p className="text-xl font-bold">KSh {paymentStatus.total_paid.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Remaining Balance</p>
                <p className="text-xl font-bold">KSh {paymentStatus.remaining_balance.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ownership Percentage</p>
                <p className="text-xl font-bold">{paymentStatus.ownership_percentage}%</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Next Payment</p>
                <p className="text-xl font-bold">KSh {paymentStatus.next_payment_amount.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Next Payment Date</p>
                <p className="text-xl font-bold">
                  {paymentStatus.next_payment_date 
                    ? format(new Date(paymentStatus.next_payment_date), 'MMM dd, yyyy')
                    : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Payment Status</p>
                <p className="text-xl font-bold capitalize">{paymentStatus.payment_status}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">System Size</p>
                <p className="text-xl font-bold">{paymentStatus.system_size_kw} kW</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Payment Frequency</p>
                <p className="text-xl font-bold capitalize">{paymentStatus.payment_frequency}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {transactions.length > 0 && (
        <Card className="bg-aurora-card border-aurora-blue/20">
          <CardHeader>
            <CardTitle className="text-aurora-blue-light">Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {transactions.slice(0, 5).map((transaction) => (
                <div key={transaction.id} className="p-3 bg-slate-800/50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium capitalize">{transaction.transaction_type}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(transaction.transaction_date), 'MMM dd, yyyy HH:mm')}
                      </p>
                      {transaction.reference_number && (
                        <p className="text-xs text-aurora-green-light">
                          Ref: {transaction.reference_number}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-medium">KSh {transaction.amount.toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">
                        Balance: KSh {transaction.balance_after.toLocaleString()}
                      </p>
                      {transaction.system_performance && (
                        <p className="text-xs text-aurora-purple-light">
                          {transaction.system_performance}% efficiency
                        </p>
                      )}
                    </div>
                  </div>
                  {transaction.description && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {transaction.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {!paymentStatus && !transactions.length && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No data available. Click "Refresh Payment Status" to load data.</p>
        </div>
      )}
    </div>
  );
};

export default TestSolarProvider;