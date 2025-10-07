/**
 * Kenyan Electricity Bill Calculator
 * Provides detailed breakdown of Kenyan electricity bills following Kenya Power tariff structure
 */

export interface KenyanBillBreakdown {
  // Energy Charge
  energyCharge: number;
  energyChargeRate: number;
  energyChargeKwh: number;
  
  // Levies & Adjustments
  fuelLevy: number;
  fuelLevyRate: number;
  forexLevy: number;
  forexLevyRate: number;
  inflationAdjustment: number;
  inflationAdjustmentRate: number;
  epraLevy: number;
  epraLevyRate: number;
  wraLevy: number;
  wraLevyRate: number;
  repLevy: number;
  repLevyRate: number;
  
  // Subtotal before VAT
  subtotalBeforeVat: number;
  
  // VAT Calculation
  vatBase: number;
  vatRate: number;
  vatAmount: number;
  
  // Final Total
  finalTotal: number;
  
  // Additional information
  totalKwh: number;
  costPerKwh: number;
}

/**
 * Calculate detailed Kenyan electricity bill breakdown
 * @param kwh - Total kWh consumed
 * @param rate - Energy charge rate per kWh (optional, defaults to KES 10.00)
 * @param excludeLevies - Whether to exclude levies and taxes (for solar providers)
 * @returns Detailed breakdown of the bill components
 */
export const calculateKenyanElectricityBill = (kwh: number, rate: number = 10.00, excludeLevies: boolean = false): KenyanBillBreakdown => {
  // Energy Charge
  const energyCharge = kwh * rate;
  const energyChargeRate = rate;
  const energyChargeKwh = kwh;
  
  if (excludeLevies) {
    // For solar providers, exclude all levies and taxes
    return {
      // Energy Charge
      energyCharge,
      energyChargeRate,
      energyChargeKwh,
      
      // Levies & Adjustments (set to 0 for solar)
      fuelLevy: 0,
      fuelLevyRate: 0,
      forexLevy: 0,
      forexLevyRate: 0,
      inflationAdjustment: 0,
      inflationAdjustmentRate: 0,
      epraLevy: 0,
      epraLevyRate: 0,
      wraLevy: 0,
      wraLevyRate: 0,
      repLevy: 0,
      repLevyRate: 0,
      
      // Subtotal before VAT
      subtotalBeforeVat: energyCharge,
      
      // VAT Calculation (0 for solar)
      vatBase: 0,
      vatRate: 0,
      vatAmount: 0,
      
      // Final Total
      finalTotal: energyCharge,
      
      // Additional information
      totalKwh: kwh,
      costPerKwh: rate
    };
  }
  
  // Levies & Adjustments (based on the provided example)
  const fuelLevyRate = 4.00;
  const fuelLevy = kwh * fuelLevyRate;
  
  const forexLevyRate = 0.50;
  const forexLevy = kwh * forexLevyRate;
  
  const inflationAdjustmentRate = 2.00;
  const inflationAdjustment = kwh * inflationAdjustmentRate;
  
  const epraLevyRate = 3.00;
  const epraLevy = kwh * epraLevyRate;
  
  const wraLevyRate = 1.00;
  const wraLevy = kwh * wraLevyRate;
  
  const repLevyRate = 0.50;
  const repLevy = kwh * repLevyRate;
  
  // Subtotal before VAT
  const subtotalBeforeVat = energyCharge + fuelLevy + forexLevy + inflationAdjustment + epraLevy + wraLevy + repLevy;
  
  // VAT Calculation (16% on Energy Charge + Fuel Levy + Forex Levy + Inflation Adjustment)
  const vatBase = energyCharge + fuelLevy + forexLevy + inflationAdjustment;
  const vatRate = 0.16;
  const vatAmount = vatBase * vatRate;
  
  // Final Total
  const finalTotal = subtotalBeforeVat + vatAmount;
  
  // Additional information
  const totalKwh = kwh;
  const costPerKwh = finalTotal / kwh;
  
  return {
    // Energy Charge
    energyCharge,
    energyChargeRate,
    energyChargeKwh,
    
    // Levies & Adjustments
    fuelLevy,
    fuelLevyRate,
    forexLevy,
    forexLevyRate,
    inflationAdjustment,
    inflationAdjustmentRate,
    epraLevy,
    epraLevyRate,
    wraLevy,
    wraLevyRate,
    repLevy,
    repLevyRate,
    
    // Subtotal before VAT
    subtotalBeforeVat,
    
    // VAT Calculation
    vatBase,
    vatRate,
    vatAmount,
    
    // Final Total
    finalTotal,
    
    // Additional information
    totalKwh,
    costPerKwh
  };
};

/**
 * Format currency for Kenyan Shillings
 * @param amount - Amount to format
 * @returns Formatted currency string
 */
export const formatKES = (amount: number): string => {
  return `KSh ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

/**
 * Format kWh values
 * @param kwh - kWh value to format
 * @returns Formatted kWh string
 */
export const formatKwh = (kwh: number): string => {
  return `${kwh.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} kWh`;
};