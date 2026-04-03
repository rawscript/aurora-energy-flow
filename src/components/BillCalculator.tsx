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
      <div className="space-y-8 animate-fade-in py-4">
        {/* Credits Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="hover:scale-[1.02] transition-transform duration-500">
            <CardContent className="p-8 text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-aurora-green/10 rounded-full blur-2xl"></div>
              <Zap className="h-10 w-10 text-aurora-green-light mx-auto mb-4" />
              <p className="text-xs text-slate-400 uppercase tracking-[0.2em] mb-2">Current Balance</p>
              <p className="text-3xl font-bold text-white tracking-tight">KSh 1,240.00</p>
            </CardContent>
          </Card>

          <Card className="hover:scale-[1.02] transition-transform duration-500">
            <CardContent className="p-8 text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-aurora-blue/10 rounded-full blur-2xl"></div>
              <Clock className="h-10 w-10 text-aurora-blue-light mx-auto mb-4" />
              <p className="text-xs text-slate-400 uppercase tracking-[0.2em] mb-2">Days Remaining</p>
              <p className="text-3xl font-bold text-white tracking-tight">14 Days</p>
            </CardContent>
          </Card>

          <Card className="hover:scale-[1.02] transition-transform duration-500">
            <CardContent className="p-8 text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-aurora-purple/10 rounded-full blur-2xl"></div>
              <Battery className="h-10 w-10 text-aurora-purple-light mx-auto mb-4" />
              <p className="text-xs text-slate-400 uppercase tracking-[0.2em] mb-2">System Health</p>
              <p className="text-3xl font-bold text-white tracking-tight">Optimal</p>
            </CardContent>
          </Card>
        </div>

        {/* Top-up Form */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-6 border-b border-white/5 bg-white/5">
            <CardTitle className="text-2xl text-white font-bold flex items-center space-x-4">
              <div className="p-2 rounded-xl bg-aurora-green/10 border border-aurora-green/20">
                <DollarSign className="h-6 w-6 text-aurora-green-light" />
              </div>
              <span>{providerConfig.name} Credit Sync</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-8 pt-8 px-8 pb-8">
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {['200', '500', '1000', '2000'].map((amt) => (
                  <Button
                    key={amt}
                    variant={creditAmount === amt ? 'default' : 'outline'}
                    className={`h-12 text-base font-bold ${creditAmount === amt ? 'bg-aurora-green text-white border-transparent' : 'border-white/10 hover:bg-white/5 text-slate-300'}`}
                    onClick={() => setCreditAmount(amt)}
                  >
                    KSh {amt}
                  </Button>
                ))}
              </div>

              <div className="space-y-3">
                <Label htmlFor="custom-amount" className="font-bold text-xs uppercase tracking-widest text-slate-500">Custom Allocation (KSh)</Label>
                <Input
                  id="custom-amount"
                  type="number"
                  placeholder="Enter amount"
                  value={creditAmount}
                  onChange={(e) => setCreditAmount(e.target.value)}
                  className="h-14 glass-input text-lg font-bold"
                />
              </div>

              <Button
                onClick={handleTopUp}
                disabled={isProcessing || !creditAmount}
                className="w-full h-16 text-xl font-bold tracking-wider"
              >
                {isProcessing ? (
                  <>
                    <Zap className="mr-3 h-6 w-6 animate-spin" />
                    PROCESSING SYNC...
                  </>
                ) : (
                  <>
                    <Zap className="mr-3 h-6 w-6" />
                    INITIALIZE TOP-UP
                  </>
                )}
              </Button>
            </div>

            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <h4 className="text-sm font-bold text-aurora-green-light mb-3 flex items-center uppercase tracking-wider">
                <Lightbulb className="h-4 w-4 mr-2" />
                PAYGO PROTOCOLS
              </h4>
              <p className="text-sm text-slate-400 font-medium leading-relaxed">
                Your {providerConfig.name} synchronization is currently active. To avoid neural power interruption, ensure your balance remains above KSh 100. Credits are typically applied within 300 seconds of purchase.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Benefits Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="pb-4 border-b border-white/5 bg-white/5">
              <CardTitle className="text-lg text-aurora-blue-light font-bold">Inverter Performance</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-400 font-medium">Total Generation:</span>
                  <span className="text-sm font-bold text-white">428.5 kWh</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-400 font-medium">Self-Consumption:</span>
                  <span className="text-sm font-bold text-white">85%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-400 font-medium">CO2 Prevented:</span>
                  <span className="text-sm font-bold text-emerald-400">12.4 kg</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-4 border-b border-white/5 bg-white/5">
              <CardTitle className="text-lg text-aurora-purple-light font-bold">Sync History</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {[
                  { date: '2026-03-28', amount: 'KSh 500' },
                  { date: '2026-03-15', amount: 'KSh 1,000' }
                ].map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center">
                    <span className="text-sm text-slate-400 font-medium">{item.date}</span>
                    <span className="text-sm font-bold text-white">{item.amount}</span>
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
    <div className="space-y-8 animate-fade-in py-4">
      <Card>
        <CardHeader className="pb-6 border-b border-white/5 bg-white/5">
          <CardTitle className="text-2xl text-white font-bold flex items-center space-x-4">
            <div className="p-2 rounded-xl bg-aurora-green/10 border border-aurora-green/20">
              <Calculator className="h-6 w-6 text-aurora-green-light" />
            </div>
            <span>Energy Forecast Module</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-8 pt-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-3">
              <Label htmlFor="usage" className="font-bold text-xs uppercase tracking-widest text-slate-500">Daily Intake (kWh)</Label>
              <Input
                id="usage"
                type="number"
                placeholder="0.0"
                value={usage}
                onChange={(e) => setUsage(e.target.value)}
                className="h-12 glass-input font-bold"
              />
            </div>
            
            <div className="space-y-3">
              <Label htmlFor="rate" className="font-bold text-xs uppercase tracking-widest text-slate-500">Unit Cost (Ksh/kWh)</Label>
              <Input
                id="rate"
                type="number"
                step="0.01"
                placeholder="10.00"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                className="h-12 glass-input font-bold"
              />
            </div>
            
            <div className="space-y-3">
              <Label htmlFor="days" className="font-bold text-xs uppercase tracking-widest text-slate-500">Forecast Horizon (Days)</Label>
              <Input
                id="days"
                type="number"
                placeholder="30"
                value={days}
                onChange={(e) => setDays(e.target.value)}
                className="h-12 glass-input font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
            <div className="rounded-3xl bg-gradient-to-br from-aurora-blue/20 to-aurora-green/5 border border-white/10 p-8 text-center relative overflow-hidden group">
              <div className="absolute inset-0 bg-aurora-blue/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
              <DollarSign className="h-12 w-12 text-aurora-blue-light mx-auto mb-4 relative z-10" />
              <p className="text-xs text-slate-400 font-bold uppercase tracking-[0.2em] mb-2 relative z-10">Estimated Expenditure</p>
              <p className="text-4xl font-bold text-white tracking-tighter relative z-10">
                {formatKES(estimatedBill)}
              </p>
            </div>

            <div className="rounded-3xl bg-gradient-to-br from-aurora-green/20 to-aurora-purple/5 border border-white/10 p-8 text-center relative overflow-hidden group">
              <div className="absolute inset-0 bg-aurora-green/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
              <TrendingDown className="h-12 w-12 text-aurora-green-light mx-auto mb-4 relative z-10" />
              <p className="text-xs text-slate-400 font-bold uppercase tracking-[0.2em] mb-2 relative z-10">Optimization Potential</p>
              <p className="text-4xl font-bold text-white tracking-tighter relative z-10">
                {formatKES(savings)}
              </p>
            </div>
          </div>

          {/* Detailed Bill Breakdown */}
          {billBreakdown && (
            <Card className="mt-8 overflow-hidden bg-white/5 border-white/10">
              <CardHeader className="pb-4 border-b border-white/5 bg-white/5">
                <CardTitle className="text-lg text-white font-bold uppercase tracking-wider">Neural Cost Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <h3 className="font-bold text-xs uppercase tracking-[0.2em] text-aurora-blue-light">Core Energy Charge</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Unit Rate:</span>
                        <span className="text-white font-medium">{formatKES(billBreakdown.energyChargeRate)}/kWh</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Total Volume:</span>
                        <span className="text-white font-medium">{formatKwh(billBreakdown.energyChargeKwh)}</span>
                      </div>
                    </div>
                    <div className="flex justify-between border-t border-white/5 pt-3">
                      <span className="font-bold text-white">Sub-total:</span>
                      <span className="font-bold text-aurora-blue-light">{formatKES(billBreakdown.energyCharge)}</span>
                    </div>
                  </div>
                  
                  {provider !== 'Solar' && (
                    <div className="space-y-4">
                      <h3 className="font-bold text-xs uppercase tracking-[0.2em] text-aurora-purple-light">Levies & Externalities</h3>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Fuel Energy Charge:</span>
                          <span className="text-white font-medium">{formatKES(billBreakdown.fuelLevy)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Forex Adjustment:</span>
                          <span className="text-white font-medium">{formatKES(billBreakdown.forexLevy)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Inflation Correction:</span>
                          <span className="text-white font-medium">{formatKES(billBreakdown.inflationAdjustment)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Regulatory Levies (EPRA/WRA/REP):</span>
                          <span className="text-white font-medium">{formatKES(billBreakdown.epraLevy + billBreakdown.wraLevy + billBreakdown.repLevy)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="border-t border-white/10 pt-6">
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mb-1">Projected Total Sync Cost</p>
                      <p className="text-4xl font-bold text-aurora-green-light tracking-tighter">{formatKES(billBreakdown.finalTotal)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mb-1">Effective Sync Rate</p>
                      <p className="text-lg font-bold text-white opacity-80">{formatKES(billBreakdown.costPerKwh)}/kWh</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="rounded-2xl bg-white/5 border border-white/10 p-8">
            <h3 className="text-sm font-bold text-white uppercase tracking-[0.2em] mb-6">Usage Architecture</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Monthly Volume</p>
                <p className="text-xl font-bold text-white">{formatKwh((parseFloat(usage) || 0) * parseInt(days))}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Daily Burn Rate</p>
                <p className="text-xl font-bold text-white">{formatKES(estimatedBill / parseInt(days) || 0)}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Base Protocol Rate</p>
                <p className="text-xl font-bold text-white">{formatKES(parseFloat(rate) || 10.00)}/kWh</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-6 border-b border-white/5 bg-white/5">
          <CardTitle className="text-lg text-aurora-purple-light font-bold uppercase tracking-wider">Efficiency Optimization Tips</CardTitle>
        </CardHeader>
        <CardContent className="pt-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="flex items-start space-x-4">
                <div className="w-1.5 h-1.5 bg-aurora-green-light rounded-full mt-2 shadow-[0_0_8px_#10b981]"></div>
                <div>
                  <p className="font-bold text-white text-base">Climate Control Tuning</p>
                  <p className="text-sm text-slate-400 font-medium leading-relaxed">Adjust thermal setpoints by 1-2°C to reduce consumption by up to 10%.</p>
                </div>
              </div>
              <div className="flex items-start space-x-4">
                <div className="w-1.5 h-1.5 bg-aurora-blue-light rounded-full mt-2 shadow-[0_0_8px_#3b82f6]"></div>
                <div>
                  <p className="font-bold text-white text-base">Luminescent Efficiency</p>
                  <p className="text-sm text-slate-400 font-medium leading-relaxed">Transition to high-efficiency SSL (LED) to minimize lighting expenditure.</p>
                </div>
              </div>
            </div>
            <div className="space-y-6">
              <div className="flex items-start space-x-4">
                <div className="w-1.5 h-1.5 bg-aurora-purple-light rounded-full mt-2 shadow-[0_0_8px_#a855f7]"></div>
                <div>
                  <p className="font-bold text-white text-base">Phantom Load Termination</p>
                  <p className="text-sm text-slate-400 font-medium leading-relaxed">Isolate inactive hardware to eliminate parasitic standby consumption.</p>
                </div>
              </div>
              <div className="flex items-start space-x-4">
                <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full mt-2 shadow-[0_0_8px_#34d399]"></div>
                <div>
                  <p className="font-bold text-white text-base">Peak-Load Management</p>
                  <p className="text-sm text-slate-400 font-medium leading-relaxed">Reschedule intensive operations to off-peak slots for tariff optimization.</p>
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
};

export default BillCalculator;