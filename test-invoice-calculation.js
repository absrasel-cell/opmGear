// Test what the invoice calculation function returns
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Import the calculation function (simulate the import)
async function testInvoiceCalculation() {
  console.log('🧪 Testing invoice calculation function...\n');

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Get the order data
    const { data: order, error } = await supabase
      .from('Order')
      .select('*')
      .eq('id', 'a14b4f63-931b-4912-9302-429303d9ff6e')
      .single();

    if (error || !order) {
      console.error('❌ Order not found:', error);
      return;
    }

    console.log('📦 Order found:', {
      id: order.id,
      productName: order.productName,
      totalUnits: order.totalUnits,
      calculatedTotal: order.calculatedTotal
    });

    // Test the calculation by calling the API endpoint that uses the same function
    console.log('\n🔧 Testing calculation API...');
    
    const calcResponse = await fetch('http://localhost:3004/api/calculate-cost', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        selectedColors: order.selectedColors,
        logoSetupSelections: order.logoSetupSelections,
        selectedOptions: order.selectedOptions,
        multiSelectOptions: order.multiSelectOptions,
        baseProductPricing: {}
      })
    });

    if (calcResponse.ok) {
      const calcResult = await calcResponse.json();
      console.log('✅ Calculation successful');
      console.log('💰 Cost Breakdown:');
      console.log(`  Base Product Cost: $${calcResult.baseProductCost}`);
      console.log(`  Logo Setup Costs: ${calcResult.logoSetupCosts} items`);
      console.log(`  Closure Costs: ${calcResult.closureCosts} items`);
      console.log(`  Delivery Costs: ${calcResult.deliveryCosts} items`);
      console.log(`  Total Cost: $${calcResult.totalCost}`);
      
      if (calcResult.breakdown) {
        console.log('\n📋 Detailed Breakdown:');
        console.log(JSON.stringify(calcResult.breakdown, null, 2));
      }
    } else {
      const errorText = await calcResponse.text();
      console.log('❌ Calculation failed:', errorText.substring(0, 300));
    }

    console.log('\n🎯 The issue:');
    console.log('The calculation works but the invoice creation creates:');
    console.log('- 2 identical summary items instead of separate detailed items');
    console.log('- Each item bundles all costs together rather than separating them');

    console.log('\n💡 Solution needed:');
    console.log('Modify the invoice calculation to return separate items for:');
    console.log('1. Base Product: 6P Flat Bill - 144 units × unit price');
    console.log('2. Logo Setup: Large Leather Patch + Run - 144 units × $2.88');
    console.log('3. Closure: Stretched - 144 units × $0.88');
    console.log('4. Delivery: Regular Delivery - 144 units × $3.29');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testInvoiceCalculation().catch(console.error);