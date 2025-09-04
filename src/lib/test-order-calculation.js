/**
 * EMERGENCY TEST: Order #f00e08d3-8364-4f2d-b4b9-b7ef4ddec116 Calculation Analysis
 * 
 * This script tests the specific order that has calculation discrepancies
 */

// Test data based on the actual order
const testOrderData = {
  orderId: 'f00e08d3-8364-4f2d-b4b9-b7ef4ddec116',
  
  // Different totals reported across systems
  reportedTotals: {
    costCalculator: 436.36,
    cartPage: 484.36,
    checkoutPage: 484.46,
    adminDashboard: 465.16,
    orderReceipt: 484.46
  },
  
  // Reported components
  reportedComponents: {
    baseProduct: 230.40, // Should be consistent
    premiumFabric: {
      version1: 48.00, // One system shows this
      version2: 24.00  // Another system shows this
    },
    delivery: {
      individual: 205.96, // Individual order quantity pricing
      combined: 144.00    // Combined/bulk quantity pricing
    }
  },
  
  // The missing money in checkout breakdown
  checkoutMath: {
    displayedBreakdown: 230.40 + 24.00 + 144.00, // = $398.40
    actualTotal: 484.46,
    missingAmount: 484.46 - (230.40 + 24.00 + 144.00) // = $86.06
  }
};

console.log('🔍 EMERGENCY ORDER ANALYSIS - Order #f00e08d3-8364-4f2d-b4b9-b7ef4ddec116');
console.log('');

console.log('📊 REPORTED TOTALS ACROSS SYSTEMS:');
Object.entries(testOrderData.reportedTotals).forEach(([system, total]) => {
  console.log(`  ${system}: $${total.toFixed(2)}`);
});

console.log('');
console.log('🧮 CHECKOUT MATH BREAKDOWN ANALYSIS:');
console.log(`  Base Product: $${testOrderData.reportedComponents.baseProduct.toFixed(2)}`);
console.log(`  Premium Fabric: $${testOrderData.reportedComponents.premiumFabric.version2.toFixed(2)} (checkout shows this)`);
console.log(`  Delivery: $${testOrderData.reportedComponents.delivery.combined.toFixed(2)} (checkout shows this)`);
console.log(`  ────────────────────────────────────`);
console.log(`  Sum of breakdown: $${testOrderData.checkoutMath.displayedBreakdown.toFixed(2)}`);
console.log(`  Actual checkout total: $${testOrderData.checkoutMath.actualTotal.toFixed(2)}`);
console.log(`  🚨 MISSING MONEY: $${testOrderData.checkoutMath.missingAmount.toFixed(2)}`);

console.log('');
console.log('🔍 ROOT CAUSE ANALYSIS:');
console.log('1. Cart shows delivery at $205.96 (individual order pricing)');
console.log('2. Checkout shows delivery at $144.00 (combined/bulk pricing)');
console.log('3. Premium fabric: $48.00 vs $24.00 in different systems');
console.log('4. Checkout breakdown components don\'t add up to total');
console.log('5. Different systems are using different calculation methods');

console.log('');
console.log('💡 SOLUTION REQUIREMENTS:');
console.log('1. ✅ Created unified cost calculator');
console.log('2. ✅ Fixed cart page to use consistent calculation');
console.log('3. ✅ Fixed checkout page to use consistent calculation');
console.log('4. 🔄 Need to fix delivery pricing consistency');
console.log('5. 🔄 Need to test with actual order data');

console.log('');
console.log('🎯 NEXT STEPS:');
console.log('1. Determine if delivery should use individual or combined pricing');
console.log('2. Ensure premium fabric costs are consistent');
console.log('3. Verify all margin applications are correct');
console.log('4. Test the unified calculator with this specific order');

// Test calculation consistency
function testCalculationConsistency() {
  console.log('');
  console.log('🧪 TESTING CALCULATION CONSISTENCY:');
  
  // Simulate the breakdown sum
  const components = {
    base: 230.40,
    fabric: 24.00, // Using checkout version
    delivery: 144.00 // Using checkout version
  };
  
  const manualSum = Object.values(components).reduce((sum, cost) => sum + cost, 0);
  const expectedTotal = 484.46;
  const difference = expectedTotal - manualSum;
  
  console.log(`  Manual sum of displayed components: $${manualSum.toFixed(2)}`);
  console.log(`  Expected total: $${expectedTotal.toFixed(2)}`);
  console.log(`  Difference: $${difference.toFixed(2)}`);
  
  if (Math.abs(difference) > 0.01) {
    console.log(`  🚨 INCONSISTENCY: $${Math.abs(difference).toFixed(2)} missing from breakdown`);
    console.log('  This suggests additional costs are not being displayed in the breakdown');
  } else {
    console.log('  ✅ Breakdown is mathematically consistent');
  }
}

testCalculationConsistency();

module.exports = { testOrderData, testCalculationConsistency };