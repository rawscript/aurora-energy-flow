import React, { useState, useEffect } from 'react';
import { useKPLCSMS } from '../hooks/useKPLCSMS';
import { useProfile } from '../hooks/useProfile';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Separator } from './ui/separator';
import { Badge } from './ui/badge';
import { Loader2, Zap, CreditCard, Phone, Hash, AlertCircle, CheckCircle, Clock } from 'lucide-react';

interface KPLCSMSManagerProps {
  className?: string;
}

export const KPLCSMSManager: React.FC<KPLCSMSManagerProps> = ({ className = '' }) => {
  const { profile } = useProfile();
  const {
    loading,
    error,
    billData,
    tokenData,
    unitsData,
    fetchBillData,
    purchaseTokens,
    checkUnits,
    clearError,
    clearData
  } = useKPLCSMS();

  const [meterNumber, setMeterNumber] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [tokenAmount, setTokenAmount] = useState('');
  const [activeTab, setActiveTab] = useState<'bill' | 'tokens' | 'units'>('bill');

  useEffect(() => {
    // Pre-fill from profile if available
    if (profile) {
      if (profile.meter_number) setMeterNumber(profile.meter_number);
      if (profile.phone_number) setPhoneNumber(profile.phone_number);
    }
  }, [profile]);

  const handleFetchBill = async () => {
    if (!meterNumber || !phoneNumber) return;
    clearError();
    await fetchBillData(meterNumber, phoneNumber);
  };

  const handlePurchaseTokens = async () => {
    if (!meterNumber || !phoneNumber || !tokenAmount) return;
    const amount = parseFloat(tokenAmount);
    if (isNaN(amount) || amount < 10) return;
    
    clearError();
    await purchaseTokens(meterNumber, amount, phoneNumber);
  };

  const handleCheckUnits = async () => {
    if (!meterNumber || !phoneNumber) return;
    clearError();
    await checkUnits(meterNumber, phoneNumber);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-green-100 text-green-800">Active</Badge>;
      case 'inactive':
        return <Badge variant="secondary" className="bg-red-100 text-red-800">Inactive</Badge>;
      case 'disconnected':
        return <Badge variant="destructive">Disconnected</Badge>;
      case 'success':
        return <Badge variant="default" className="bg-green-100 text-green-800">Success</Badge>;
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-KE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-blue-600" />
            KPLC SMS Service
          </CardTitle>
          <p className="text-sm text-gray-600">
            Manage your KPLC account using SMS commands. No web scraping required.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="meter-number">Meter Number</Label>
              <div className="flex items-center space-x-2">
                <Hash className="h-4 w-4 text-gray-400" />
                <Input
                  id="meter-number"
                  value={meterNumber}
                  onChange={(e) => setMeterNumber(e.target.value)}
                  placeholder="Enter meter number"
                  className="flex-1"
                />
              </div>
            </div>
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
          </div>

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

      {/* Action Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        <button
          onClick={() => setActiveTab('bill')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'bill'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Bill Data
        </button>
        <button
          onClick={() => setActiveTab('tokens')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'tokens'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Buy Tokens
        </button>
        <button
          onClick={() => setActiveTab('units')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'units'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Check Units
        </button>
      </div>

      {/* Bill Data Tab */}
      {activeTab === 'bill' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Bill Information</span>
              <Button
                onClick={handleFetchBill}
                disabled={loading || !meterNumber || !phoneNumber}
                size="sm"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Fetching...
                  </>
                ) : (
                  'Fetch Bill Data'
                )}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {billData ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-600 font-medium">Outstanding Balance</p>
                    <p className="text-2xl font-bold text-blue-900">
                      {formatCurrency(billData.outstandingBalance)}
                    </p>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg">
                    <p className="text-sm text-green-600 font-medium">Current Reading</p>
                    <p className="text-2xl font-bold text-green-900">
                      {billData.currentReading.toLocaleString()} kWh
                    </p>
                  </div>
                  <div className="p-3 bg-purple-50 rounded-lg">
                    <p className="text-sm text-purple-600 font-medium">Consumption</p>
                    <p className="text-2xl font-bold text-purple-900">
                      {billData.consumption.toLocaleString()} kWh
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-medium text-gray-700">Account Details</p>
                    <div className="mt-2 space-y-1">
                      <p><span className="text-gray-500">Account:</span> {billData.accountNumber}</p>
                      <p><span className="text-gray-500">Meter:</span> {billData.meterNumber}</p>
                      <p><span className="text-gray-500">Status:</span> {getStatusBadge(billData.status)}</p>
                      <p><span className="text-gray-500">Tariff:</span> {billData.tariff}</p>
                    </div>
                  </div>
                  <div>
                    <p className="font-medium text-gray-700">Billing Information</p>
                    <div className="mt-2 space-y-1">
                      <p><span className="text-gray-500">Period:</span> {billData.billingPeriod}</p>
                      <p><span className="text-gray-500">Due Date:</span> {formatDate(billData.dueDate)}</p>
                      <p><span className="text-gray-500">Bill Amount:</span> {formatCurrency(billData.billAmount)}</p>
                      <p><span className="text-gray-500">Fetched:</span> {formatDate(billData.fetchedAt)}</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Zap className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Click "Fetch Bill Data" to retrieve your KPLC bill information via SMS</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Token Purchase Tab */}
      {activeTab === 'tokens' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Purchase Tokens
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="token-amount">Amount (KES)</Label>
                <Input
                  id="token-amount"
                  type="number"
                  value={tokenAmount}
                  onChange={(e) => setTokenAmount(e.target.value)}
                  placeholder="Enter amount (min. 10)"
                  min="10"
                  step="10"
                />
                <p className="text-xs text-gray-500 mt-1">Minimum purchase amount is KES 10</p>
              </div>

              <Button
                onClick={handlePurchaseTokens}
                disabled={loading || !meterNumber || !phoneNumber || !tokenAmount || parseFloat(tokenAmount) < 10}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  `Purchase KES ${tokenAmount || '0'} Tokens`
                )}
              </Button>

              {tokenData && (
                <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <h3 className="font-medium text-green-900">Token Purchase Result</h3>
                    {getStatusBadge(tokenData.status)}
                  </div>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">Token Code:</span> <code className="bg-white px-2 py-1 rounded text-green-800 font-mono">{tokenData.tokenCode}</code></p>
                    <p><span className="font-medium">Reference:</span> {tokenData.referenceNumber}</p>
                    <p><span className="font-medium">Amount:</span> {formatCurrency(tokenData.amount)}</p>
                    <p><span className="font-medium">Units:</span> {tokenData.units} kWh</p>
                    <p><span className="font-medium">Time:</span> {formatDate(tokenData.timestamp)}</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Units Check Tab */}
      {activeTab === 'units' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Current Units
              </div>
              <Button
                onClick={handleCheckUnits}
                disabled={loading || !meterNumber || !phoneNumber}
                size="sm"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Checking...
                  </>
                ) : (
                  'Check Units'
                )}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {unitsData ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-blue-50 rounded-lg text-center">
                    <p className="text-sm text-blue-600 font-medium">Current Units</p>
                    <p className="text-3xl font-bold text-blue-900">{unitsData.currentUnits}</p>
                    <p className="text-sm text-blue-600">kWh</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg text-center">
                    <p className="text-sm text-gray-600 font-medium">Last Reading</p>
                    <p className="text-3xl font-bold text-gray-900">{unitsData.lastReading.toLocaleString()}</p>
                    <p className="text-sm text-gray-600">kWh</p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">Meter Status</p>
                    <p className="text-sm text-gray-600">Last checked: {formatDate(unitsData.timestamp)}</p>
                  </div>
                  {getStatusBadge(unitsData.status)}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Clock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Click "Check Units" to get your current electricity units via SMS</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Clear Data Button */}
      {(billData || tokenData || unitsData) && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={clearData}>
            Clear All Data
          </Button>
        </div>
      )}
    </div>
  );
};