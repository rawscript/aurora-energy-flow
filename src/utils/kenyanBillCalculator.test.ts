/**
 * Test file for Kenyan Electricity Bill Calculator
 */

import { calculateKenyanElectricityBill, formatKES, formatKwh } from './kenyanBillCalculator';

// Test the example provided: 1000 kWh at KES 10.00/kWh
const testBill = calculateKenyanElectricityBill(1000, 10.00);

console.log('=== Kenyan Electricity Bill Calculation Test ===');
console.log('Input: 1000 kWh at KES 10.00/kWh');
console.log();

console.log('1. Energy Charge');
console.log(`   Rate: ${formatKES(testBill.energyChargeRate)}/kWh`);
console.log(`   Calculation: 1000 × 10.00 = ${formatKES(testBill.energyCharge)}`);
console.log();

console.log('2. Levies & Adjustments');
console.log(`   Fuel Levy: 1000 × 4.00 = ${formatKES(testBill.fuelLevy)}`);
console.log(`   Forex Levy: 1000 × 0.50 = ${formatKES(testBill.forexLevy)}`);
console.log(`   Inflation Adjustment: 1000 × 2.00 = ${formatKES(testBill.inflationAdjustment)}`);
console.log(`   EPRA Levy: 1000 × 3.00 = ${formatKES(testBill.epraLevy)}`);
console.log(`   WRA Levy: 1000 × 1.00 = ${formatKES(testBill.wraLevy)}`);
console.log(`   REP Levy: 1000 × 0.50 = ${formatKES(testBill.repLevy)}`);
console.log();

console.log('   Subtotal (before VAT):');
console.log(`   ${formatKES(testBill.energyCharge)} + ${formatKES(testBill.fuelLevy)} + ${formatKES(testBill.forexLevy)} + ${formatKES(testBill.inflationAdjustment)} + ${formatKES(testBill.epraLevy)} + ${formatKES(testBill.wraLevy)} + ${formatKES(testBill.repLevy)} = ${formatKES(testBill.subtotalBeforeVat)}`);
console.log();

console.log('3. VAT Calculation');
console.log('   Applicable on: Energy Charge + Fuel Levy + Forex Levy + Inflation Adjustment');
console.log(`   Total VAT Base: ${formatKES(testBill.energyCharge)} + ${formatKES(testBill.fuelLevy)} + ${formatKES(testBill.forexLevy)} + ${formatKES(testBill.inflationAdjustment)} = ${formatKES(testBill.vatBase)}`);
console.log(`   VAT Rate: ${(testBill.vatRate * 100).toFixed(0)}%`);
console.log(`   VAT Amount: 0.16 × ${formatKES(testBill.vatBase)} = ${formatKES(testBill.vatAmount)}`);
console.log();

console.log('4. Total Bill');
console.log(`   Final Total: ${formatKES(testBill.subtotalBeforeVat)} + ${formatKES(testBill.vatAmount)} = ${formatKES(testBill.finalTotal)}`);
console.log();

console.log('=== Verification ===');
console.log(`Expected Final Total: KSh 23,640.00`);
console.log(`Actual Final Total: ${formatKES(testBill.finalTotal)}`);
console.log(`Match: ${testBill.finalTotal === 23640 ? '✅ PASS' : '❌ FAIL'}`);