import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '../hooks/use-toast';
import { 
  FileText, 
  RefreshCw, 
  Loader2, 
  AlertTriangle, 
  Calendar, 
  Zap, 
  CreditCard, 
  Home, 
  TrendingUp, 
  TrendingDown 
} from 'lucide-react';
import { useKPLCPuppeteer } from '../hooks/useKPLCPuppeteer';
import { format, formatDistanceToNow } from 'date-fns';

const KPLCBillDashboard: React.FC = () => {
  const { 
    billData, 
    loading, 
    error, 
    lastFetched, 
    fetchBillData, 
    getLatestBillData, 
    getUserCredentials 
  } = useKPLCPuppeteer();
  
  const { toast } = useToast();
  const [meterNumber, setMeterNumber] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [isFetching, setIsFetching] = useState(false);

  // Load user credentials on mount
  useEffect(() => {
    const loadCredentials = async () => {
      const { meterNumber: savedMeter, idNumber: savedId } = await getUserCredentials();
      if (savedMeter) setMeterNumber(savedMeter);
      if (savedId) setIdNumber(savedId);
      
      // If we have credentials, try to load latest data
      if (savedMeter) {
        await getLatestBillData(savedMeter);
      }
    };

    loadCredentials();
  }, [getUserCredentials, getLatestBillData]);

  // Handle fetch bill data
  const handleFetchBillData = async () => {
    if (!meterNumber || !idNumber) {
      toast({
        title: "Missing Information",
        description: "Please enter both meter number and ID number.",
        variant: "destructive",
      });
      return;
    }

    setIsFetching(true);
    try {
      await fetchBillData(meterNumber, idNumber);
    } finally {
      setIsFetching(false);
    }
  };

  // Handle refresh
  const handleRefresh = async () => {
    if (!meterNumber || !idNumber) {
      toast({
        title: "Missing Information",
        description: "Please enter both meter number and ID number.",
        variant: "destructive",
      });
      return;
    }

    setIsFetching(true);
    try {
      await fetchBillData(meterNumber, idNumber);
    } finally {
      setIsFetching(false);
    }
  };

  if (loading && !billData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-aurora-green-light mx-auto mb-4"></div>
          <p className="text-muted-foreground">Fetching KPLC bill data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Credentials Input */}
      <Card className="bg-aurora-card border-aurora-green/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg sm:text-xl text-aurora-green-light flex items-center gap-2">
            <FileText className="h-5 w-5 sm:h-6 sm:w-6" />
            KPLC Bill Credentials
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="meterNumber" className="text-sm font-medium">Meter Number</Label>
              <Input
                id="meterNumber"
                value={meterNumber}
                onChange={(e) => setMeterNumber(e.target.value)}
                placeholder="Enter your meter number"
                className="mt-1 bg-slate-800 border-aurora-green/30"
              />
            </div>
            <div>
              <Label htmlFor="idNumber" className="text-sm font-medium">ID Number</Label>
              <Input
                id="idNumber"
                value={idNumber}
                onChange={(e) => setIdNumber(e.target.value)}
                placeholder="Enter your ID number"
                className="mt-1 bg-slate-800 border-aurora-green/30"
              />
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={handleFetchBillData}
              disabled={isFetching || loading}
              className="bg-aurora-green hover:bg-aurora-green/80 flex-1"
            >
              {isFetching ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Fetching...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  Fetch Bill Data
                </>
              )}
            </Button>
            
            {billData && (
              <Button
                onClick={handleRefresh}
                disabled={isFetching || loading}
                variant="outline"
                className="border-aurora-green/30 hover:bg-aurora-green/10 flex-1"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            )}
          </div>
          
          {lastFetched && (
            <p className="text-sm text-muted-foreground">
              Last fetched: {formatDistanceToNow(new Date(lastFetched), { addSuffix: true })}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="bg-aurora-card border-red-500/20">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 text-red-400">
              <AlertTriangle className="h-5 w-5" />
              <span className="font-medium">Error</span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Bill Data Display */}
      {billData && (
        <div className="space-y-6">
          {/* Account Information */}
          <Card className="bg-aurora-card border-aurora-green/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg sm:text-xl text-aurora-green-light">
                Account Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Account Name</p>
                  <p className="font-medium">{billData.accountName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Account Number</p>
                  <p className="font-medium">{billData.accountNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Meter Number</p>
                  <p className="font-medium">{billData.meterNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Address</p>
                  <p className="font-medium">{billData.address}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tariff</p>
                  <p className="font-medium">{billData.tariff}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <p className={`font-medium ${billData.status === 'active' ? 'text-green-500' : 'text-red-500'}`}>
                    {billData.status.charAt(0).toUpperCase() + billData.status.slice(1)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Billing Information */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Current Bill */}
            <Card className="bg-aurora-card border-aurora-blue/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg sm:text-xl text-aurora-blue-light flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Current Bill
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Bill Amount</span>
                  <span className="text-xl font-bold text-aurora-blue-light">
                    KSh {billData.billAmount.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Due Date</span>
                  <span className="font-medium">
                    {billData.dueDate ? format(new Date(billData.dueDate), 'MMM dd, yyyy') : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Billing Period</span>
                  <span className="font-medium">{billData.billingPeriod}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Consumption</span>
                  <span className="font-medium">{billData.consumption} kWh</span>
                </div>
              </CardContent>
            </Card>

            {/* Meter Readings */}
            <Card className="bg-aurora-card border-aurora-purple/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg sm:text-xl text-aurora-purple-light flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Meter Readings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Current Reading</span>
                  <span className="font-medium">{billData.currentReading} kWh</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Previous Reading</span>
                  <span className="font-medium">{billData.previousReading} kWh</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Consumption</span>
                  <span className="font-medium">{billData.consumption} kWh</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Outstanding Balance</span>
                  <span className={`font-medium ${billData.outstandingBalance > 0 ? 'text-red-500' : 'text-green-500'}`}>
                    KSh {billData.outstandingBalance.toLocaleString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Payment History */}
          <Card className="bg-aurora-card border-aurora-green/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg sm:text-xl text-aurora-green-light flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Recent Payment
              </CardTitle>
            </CardHeader>
            <CardContent>
              {billData.lastPaymentDate ? (
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">KSh {billData.lastPaymentAmount.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">
                      Paid {formatDistanceToNow(new Date(billData.lastPaymentDate), { addSuffix: true })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Payment Date</p>
                    <p className="font-medium">
                      {format(new Date(billData.lastPaymentDate), 'MMM dd, yyyy')}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">No payment history available</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Empty State */}
      {!billData && !loading && (
        <Card className="bg-aurora-card border-aurora-green/20">
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">No Bill Data</h3>
            <p className="text-muted-foreground mb-4">
              Enter your meter number and ID number to fetch your KPLC bill information.
            </p>
            <Button
              onClick={handleFetchBillData}
              disabled={isFetching || loading || !meterNumber || !idNumber}
              className="bg-aurora-green hover:bg-aurora-green/80"
            >
              <FileText className="h-4 w-4 mr-2" />
              Fetch Bill Data
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default KPLCBillDashboard;