import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DollarSign, Calculator } from 'lucide-react';
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

  const calculateBill = useCallback(() => {
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
      const isSolarProvider = provider === 'Solar';
      const breakdown = calculateKenyanElectricityBill(monthlyUsage, energyRate, isSolarProvider);
      setBillBreakdown(breakdown);
    } else {
      setBillBreakdown(null);
    }
  }, [usage, rate, days, provider]);

  useEffect(() => {
    calculateBill();
  }, [usage, rate, days, provider, calculateBill]);

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