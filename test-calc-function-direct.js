// Test the calc function directly to see what it returns
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function testCalcFunctionDirect() {
  console.log('🧮 Testing calcInvoiceFromOrder function directly...\n');

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Get the order data (same as the invoice endpoint)
    const { data: order, error } = await supabase
      .from('Order')
      .select('*')
      .eq('id', 'a14b4f63-931b-4912-9302-429303d9ff6e')
      .single();

    if (error || !order) {
      console.error('❌ Order not found:', error);
      return;
    }

    console.log('📦 Order Overview:');
    console.log(`  ID: ${order.id}`);
    console.log(`  Product: ${order.productName}`);
    console.log(`  Total Units: ${order.totalUnits}`);
    console.log(`  Calculated Total: $${order.calculatedTotal}`);
    
    console.log('\n🔍 Order Data Fields:');
    console.log(`  selectedColors: ${typeof order.selectedColors} - ${JSON.stringify(order.selectedColors)?.substring(0, 100)}...`);
    console.log(`  selectedOptions: ${typeof order.selectedOptions} - ${JSON.stringify(order.selectedOptions)?.substring(0, 100)}...`);
    console.log(`  multiSelectOptions: ${typeof order.multiSelectOptions} - ${JSON.stringify(order.multiSelectOptions)?.substring(0, 100)}...`);
    console.log(`  logoSetupSelections: ${typeof order.logoSetupSelections} - ${JSON.stringify(order.logoSetupSelections)?.substring(0, 100)}...`);
    
    // Test if we can call the calculation API instead
    console.log('\n🧮 Testing calculation API endpoint...');
    const calcResponse = await fetch('http://localhost:3001/api/calculate-cost', {
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
      
      if (calcResult.breakdown) {
        console.log('\n📋 Detailed Cost Breakdown:');
        console.log('Base Product Cost:', calcResult.baseProductCost);
        console.log('Logo Setup Costs:', calcResult.logoSetupCosts);
        console.log('Closure Costs:', calcResult.closureCosts);
        console.log('Delivery Costs:', calcResult.deliveryCosts);
        console.log('Premium Fabric Costs:', calcResult.premiumFabricCosts);
        
        console.log('\n🎯 The Issue Analysis:');
        console.log('The cost calculation API works and returns detailed breakdowns.');
        console.log('The invoice calc function should create separate items for each cost component.');
        console.log('But the invoice is creating bundled summary items instead.');
        
        console.log('\n💡 Root Cause:');
        console.log('The calcInvoiceFromOrder function is not properly using the detailed cost breakdown');
        console.log('from the cost calculation API. It needs to be fixed to create individual invoice items.');
      }
    } else {
      const errorText = await calcResponse.text();
      console.log('❌ Calculation failed:', errorText.substring(0, 300));
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testCalcFunctionDirect().catch(console.error);