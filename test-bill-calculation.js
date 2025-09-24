// Simple test for Kenyan bill calculation
const { calculateKenyanElectricityBill } = require('./dist/utils/kenyanBillCalculator.js');

// Test with the example: 1000 kWh at KES 10.00/kWh
const testBill = calculateKenyanElectricityBill(1000, 10.00);

console.log('=== Kenyan Electricity Bill Calculation Test ===');
console.log('Input: 1000 kWh at KES 10.00/kWh');
console.log();

console.log('1. Energy Charge');
console.log(`   Rate: KSh 10.00/kWh`);
console.log(`   Calculation: 1000 × 10.00 = KSh ${testBill.energyCharge.toFixed(2)}`);
console.log();

console.log('2. Levies & Adjustments');
console.log(`   Fuel Levy: 1000 × 4.00 = KSh ${testBill.fuelLevy.toFixed(2)}`);
console.log(`   Forex Levy: 1000 × 0.50 = KSh ${testBill.forexLevy.toFixed(2)}`);
console.log(`   Inflation Adjustment: 1000 × 2.00 = KSh ${testBill.inflationAdjustment.toFixed(2)}`);
console.log(`   EPRA Levy: 1000 × 3.00 = KSh ${testBill.epraLevy.toFixed(2)}`);
console.log(`   WRA Levy: 1000 × 1.00 = KSh ${testBill.wraLevy.toFixed(2)}`);
console.log(`   REP Levy: 1000 × 0.50 = KSh ${testBill.repLevy.toFixed(2)}`);
console.log();

console.log('   Subtotal (before VAT):');
console.log(`   ${testBill.energyCharge.toFixed(2)} + ${testBill.fuelLevy.toFixed(2)} + ${testBill.forexLevy.toFixed(2)} + ${testBill.inflationAdjustment.toFixed(2)} + ${testBill.epraLevy.toFixed(2)} + ${testBill.wraLevy.toFixed(2)} + ${testBill.repLevy.toFixed(2)} = ${testBill.subtotalBeforeVat.toFixed(2)}`);
console.log();

console.log('3. VAT Calculation');
console.log('   Applicable on: Energy Charge + Fuel Levy + Forex Levy + Inflation Adjustment');
console.log(`   Total VAT Base: ${testBill.energyCharge.toFixed(2)} + ${testBill.fuelLevy.toFixed(2)} + ${testBill.forexLevy.toFixed(2)} + ${testBill.inflationAdjustment.toFixed(2)} = ${testBill.vatBase.toFixed(2)}`);
console.log(`   VAT Rate: ${(testBill.vatRate * 100).toFixed(0)}%`);
console.log(`   VAT Amount: 0.16 × ${testBill.vatBase.toFixed(2)} = ${testBill.vatAmount.toFixed(2)}`);
console.log();

console.log('4. Total Bill');
console.log(`   Final Total: ${testBill.subtotalBeforeVat.toFixed(2)} + ${testBill.vatAmount.toFixed(2)} = ${testBill.finalTotal.toFixed(2)}`);
console.log();

console.log('=== Verification ===');
console.log(`Expected Final Total: 23,640.00`);
console.log(`Actual Final Total: ${testBill.finalTotal.toFixed(2)}`);
console.log(`Match: ${testBill.finalTotal === 23640 ? '✅ PASS' : '❌ FAIL'}`);