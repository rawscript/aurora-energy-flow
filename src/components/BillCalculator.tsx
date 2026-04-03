import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DollarSign, Calculator, Sun, Battery, Zap, Lightbulb, TrendingDown, Clock } from 'lucide-react';
import { calculateKenyanElectricityBill, formatKES, formatKwh } from '@/utils/kenyanBillCalculator';
import { useEnergyProvider } from '@/contexts/EnergyProviderContext'; // Import energy provider context

const BillCalculator = () => {
  const [usage, setUsage] = useState<string>('');
  const [rate, setRate] = useState<string>('10.00'); // Updated default rate to KES 10.00 per kWh
  const [days, setDays] = useState<string>('30');
  const [estimatedBill, setEstimatedBill] = useState<number>(0);
  const [savings, setSavings] = useState<number>(0);
  const [billBreakdown, setBillBreakdown] = useState<ReturnType<typeof calculateKenyanElectricityBill> | null>(null);
  
  const { provider, providerConfig } = useEnergyProvider(); // Get current provider and config

  // For Solar providers, show information instead of calculator
  const isSolarProvider = provider === 'Solar' || provider === 'SunCulture' || provider === 'M-KOPA Solar';

  const calculateBill = useCallback(() => {
    // Only calculate for non-solar providers
    if (isSolarProvider) return;
    
    const dailyUsage = parseFloat(usage) || 0;
    const energyRate = parseFloat(rate) || 10.00; // Updated default rate
    const billingDays = parseInt(days) || 30;
    
    const monthlyUsage = dailyUsage * billingDays;
    const bill = monthlyUsage * energyRate;
    const potentialSavings = bill * 0.15; // 15% savings potential
    
    setEstimatedBill(bill);
    setSavings(potentialSavings);
    
    // Calculate detailed Kenyan bill breakdown
    if (monthlyUsage > 0) {
      // Check if provider is solar to exclude levies
      const isSolar = provider === 'Solar';
      const breakdown = calculateKenyanElectricityBill(monthlyUsage, energyRate, isSolar);
      setBillBreakdown(breakdown);
    } else {
      setBillBreakdown(null);
    }
  }, [usage, rate, days, provider, isSolarProvider]);

  useEffect(() => {
    calculateBill();
  }, [usage, rate, days, provider, isSolarProvider, calculateBill]);

  const [creditAmount, setCreditAmount] = useState<string>('500');
  const [isProcessing, setIsProcessing] = useState(false);

  // Render Credits & Top-up content for Solar providers
  if (isSolarProvider) {
    const handleTopUp = () => {
      setIsProcessing(true);
      setTimeout(() => {
        setIsProcessing(false);
        // In a real app, this would trigger a payment gateway or API call
        alert(`Successfully topped up KSh ${creditAmount} to your ${providerConfig.name} account!`);
      }, 1500);
    };

    return (
      <div className="space-y-6 animate-fade-in">
        {/* Credits Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-aurora-card border-aurora-green/20 aurora-glow">
            <CardContent className="p-6 text-center">
              <Zap className="h-8 w-8 text-aurora-green-light mx-auto mb-2" />
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Current Balance</p>
              <p className="text-2xl font-bold text-aurora-green-light">KSh 1,240.00</p>
            </CardContent>
          </Card>

          <Card className="bg-aurora-card border-aurora-blue/20">
            <CardContent className="p-6 text-center">
              <Clock className="h-8 w-8 text-aurora-blue-light mx-auto mb-2" />
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Est. Days Remaining</p>
              <p className="text-2xl font-bold text-aurora-blue-light">14 Days</p>
            </CardContent>
          </Card>

          <Card className="bg-aurora-card border-aurora-purple/20">
            <CardContent className="p-6 text-center">
              <Battery className="h-8 w-8 text-aurora-purple-light mx-auto mb-2" />
              <p className="text-xs text-muted-foreground uppercase tracking-wider">System Health</p>
              <p className="text-2xl font-bold text-aurora-purple-light">Optimal</p>
            </CardContent>
          </Card>
        </div>

        {/* Top-up Form */}
        <Card className="bg-aurora-card border-aurora-green/20">
          <CardHeader>
            <CardTitle className="text-xl text-aurora-green-light flex items-center space-x-2">
              <DollarSign className="h-6 w-6" />
              <span>{providerConfig.name} Credit Top-up</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {['200', '500', '1000', '2000'].map((amt) => (
                  <Button
                    key={amt}
                    variant={creditAmount === amt ? 'default' : 'outline'}
                    className={creditAmount === amt ? 'bg-aurora-green hover:bg-aurora-green/90' : 'border-aurora-green/30 text-aurora-green-light'}
                    onClick={() => setCreditAmount(amt)}
                  >
                    KSh {amt}
                  </Button>
                ))}
              </div>

              <div className="space-y-2">
                <Label htmlFor="custom-amount">Custom Amount (KSh)</Label>
                <Input
                  id="custom-amount"
                  type="number"
                  placeholder="Enter amount"
                  value={creditAmount}
                  onChange={(e) => setCreditAmount(e.target.value)}
                  className="bg-slate-800 border-aurora-green/30"
                />
              </div>

              <Button
                onClick={handleTopUp}
                disabled={isProcessing || !creditAmount}
                className="w-full bg-aurora-green hover:bg-aurora-green/80 h-12 text-lg font-semibold"
              >
                {isProcessing ? (
                  <>
                    <Zap className="mr-2 h-5 w-5 animate-spin" />
                    Processing Payment...
                  </>
                ) : (
                  <>
                    <Zap className="mr-2 h-5 w-5" />
                    Top up Now
                  </>
                )}
              </Button>
            </div>

            <div className="p-4 bg-slate-800/50 rounded-lg border border-aurora-green/20">
              <h4 className="text-sm font-medium text-aurora-green-light mb-2 flex items-center">
                <Lightbulb className="h-4 w-4 mr-2" />
                PAYGO Information
              </h4>
              <p className="text-xs text-muted-foreground">
                Your {providerConfig.name} account is currently active. To avoid power interruption, ensure your balance remains above KSh 100. Credits are typically applied within 5-10 minutes of purchase.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Benefits Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-aurora-card border-aurora-blue/20">
            <CardHeader>
              <CardTitle className="text-lg text-aurora-blue-light">Inverter Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Total Generation:</span>
                  <span className="font-medium">428.5 kWh</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Self-Consumption:</span>
                  <span className="font-medium">85%</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">CO2 Saved:</span>
                  <span className="font-medium text-emerald-400">12.4 kg</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-aurora-card border-aurora-purple/20">
            <CardHeader>
              <CardTitle className="text-lg text-aurora-purple-light">Recent Top-ups</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { date: '2026-03-28', amount: 'KSh 500' },
                  { date: '2026-03-15', amount: 'KSh 1,000' }
                ].map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">{item.date}</span>
                    <span className="font-medium">{item.amount}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Render calculator for non-Solar providers
  return (
    <div className="space-y-6 animate-fade-in">
      <Card className="bg-aurora-card border-aurora-green/20">
        <CardHeader>
          <CardTitle className="text-xl text-aurora-green-light flex items-center space-x-2">
            <Calculator className="h-6 w-6" />
            <span>Energy Bill Calculator</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="usage">Daily Usage (kWh)</Label>
              <Input
                id="usage"
                type="number"
                placeholder="Enter daily kWh"
                value={usage}
                onChange={(e) => setUsage(e.target.value)}
                className="bg-slate-800 border-aurora-green/30"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="rate">Rate (Ksh/kWh)</Label>
              <Input
                id="rate"
                type="number"
                step="0.01"
                placeholder="Energy rate"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                className="bg-slate-800 border-aurora-blue/30"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="days">Billing Period (days)</Label>
              <Input
                id="days"
                type="number"
                placeholder="Number of days"
                value={days}
                onChange={(e) => setDays(e.target.value)}
                className="bg-slate-800 border-aurora-purple/30"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
            <Card className="bg-gradient-to-r from-aurora-blue/20 to-aurora-green/20 border-aurora-blue/30">
              <CardContent className="p-6 text-center">
                <DollarSign className="h-12 w-12 text-aurora-blue-light mx-auto mb-2" />
                <p className="text-sm text-muted-foreground mb-1">Estimated Bill</p>
                <p className="text-3xl font-bold text-aurora-blue-light">
                  {formatKES(estimatedBill)}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-aurora-green/20 to-aurora-purple/20 border-aurora-green/30">
              <CardContent className="p-6 text-center">
                <div className="h-12 w-12 bg-aurora-green-light/20 rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-aurora-green-light font-bold text-lg">%</span>
                </div>
                <p className="text-sm text-muted-foreground mb-1">Potential Savings</p>
                <p className="text-3xl font-bold text-aurora-green-light">
                  {formatKES(savings)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Bill Breakdown */}
          {billBreakdown && (
            <Card className="bg-slate-800/50 border-aurora-green/30 mt-6">
              <CardHeader>
                <CardTitle className="text-lg text-aurora-green-light">Detailed Bill Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <h3 className="font-semibold text-aurora-blue-light">Energy Charge</h3>
                    <div className="flex justify-between">
                      <span>Rate: {formatKES(billBreakdown.energyChargeRate)}/kWh</span>
                      <span>{formatKwh(billBreakdown.energyChargeKwh)}</span>
                    </div>
                    <div className="flex justify-between font-medium">
                      <span>Total:</span>
                      <span>{formatKES(billBreakdown.energyCharge)}</span>
                    </div>
                  </div>
                  
                  {/* Only show levies for non-solar providers */}
                  {provider !== 'Solar' && (
                    <div className="space-y-3">
                      <h3 className="font-semibold text-aurora-purple-light">Levies & Adjustments</h3>
                      <div className="flex justify-between">
                        <span>Fuel Levy ({formatKES(billBreakdown.fuelLevyRate)}/kWh):</span>
                        <span>{formatKES(billBreakdown.fuelLevy)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Forex Levy ({formatKES(billBreakdown.forexLevyRate)}/kWh):</span>
                        <span>{formatKES(billBreakdown.forexLevy)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Inflation Adjustment ({formatKES(billBreakdown.inflationAdjustmentRate)}/kWh):</span>
                        <span>{formatKES(billBreakdown.inflationAdjustment)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>EPRA Levy ({formatKES(billBreakdown.epraLevyRate)}/kWh):</span>
                        <span>{formatKES(billBreakdown.epraLevy)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>WRA Levy ({formatKES(billBreakdown.wraLevyRate)}/kWh):</span>
                        <span>{formatKES(billBreakdown.wraLevy)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>REP Levy ({formatKES(billBreakdown.repLevyRate)}/kWh):</span>
                        <span>{formatKES(billBreakdown.repLevy)}</span>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="border-t border-slate-700 pt-3">
                  <div className="flex justify-between font-medium">
                    <span>Subtotal (before VAT):</span>
                    <span>{formatKES(billBreakdown.subtotalBeforeVat)}</span>
                  </div>
                </div>
                
                {/* Only show VAT section for non-solar providers */}
                {provider !== 'Solar' && (
                  <div className="space-y-2">
                    <h3 className="font-semibold text-amber-400">VAT Calculation</h3>
                    <div className="flex justify-between">
                      <span>Applicable on: Energy Charge + Fuel Levy + Forex Levy + Inflation Adjustment</span>
                    </div>
                    <div className="flex justify-between">
                      <span>VAT Base:</span>
                      <span>{formatKES(billBreakdown.vatBase)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>VAT Rate: {(billBreakdown.vatRate * 100).toFixed(0)}%</span>
                    </div>
                    <div className="flex justify-between font-medium">
                      <span>VAT Amount:</span>
                      <span>{formatKES(billBreakdown.vatAmount)}</span>
                    </div>
                  </div>
                )}
                
                <div className="border-t border-slate-700 pt-3">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Final Total:</span>
                    <span className="text-aurora-green-light">{formatKES(billBreakdown.finalTotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground mt-1">
                    <span>Effective Rate:</span>
                    <span>{formatKES(billBreakdown.costPerKwh)}/kWh</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="bg-slate-800/50 rounded-lg p-6 mt-6">
            <h3 className="text-lg font-semibold text-aurora-green-light mb-4">Usage Breakdown</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Estimated Monthly Usage:</span>
                <span className="font-medium">{formatKwh((parseFloat(usage) || 0) * parseInt(days))}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Average Daily Cost:</span>
                <span className="font-medium">{formatKES(estimatedBill / parseInt(days) || 0)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Energy Rate:</span>
                <span className="font-medium">{formatKES(parseFloat(rate) || 10.00)}/kWh</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-aurora-card border-aurora-purple/20">
        <CardHeader>
          <CardTitle className="text-lg text-aurora-purple-light">Energy Saving Tips</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-aurora-green-light rounded-full mt-2"></div>
                <div>
                  <p className="font-medium">Optimize HVAC Usage</p>
                  <p className="text-sm text-muted-foreground">Adjust temperature by 1-2°F to save 5-10%</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-aurora-blue-light rounded-full mt-2"></div>
                <div>
                  <p className="font-medium">Use LED Lighting</p>
                  <p className="text-sm text-muted-foreground">Replace incandescent bulbs to save 75% on lighting</p>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-aurora-purple-light rounded-full mt-2"></div>
                <div>
                  <p className="font-medium">Unplug Devices</p>
                  <p className="text-sm text-muted-foreground">Eliminate phantom loads from standby devices</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-emerald-400 rounded-full mt-2"></div>
                <div>
                  <p className="font-medium">Peak Hour Management</p>
                  <p className="text-sm text-muted-foreground">Shift usage to off-peak hours for lower rates</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BillCalculator;