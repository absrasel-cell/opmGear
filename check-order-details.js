// Check what detailed cost data is available in the order
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function checkOrderDetails() {
  console.log('🔍 Checking order cost breakdown details...\n');

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    
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
    console.log(`  Product: ${order.productName}`);
    console.log(`  Total Units: ${order.totalUnits}`);
    console.log(`  Calculated Total: $${order.calculatedTotal}`);
    console.log(`  Status: ${order.status}`);
    
    console.log('\n🎨 Selected Colors:');
    console.log(JSON.stringify(order.selectedColors, null, 2));
    
    console.log('\n⚙️ Selected Options:');
    console.log(JSON.stringify(order.selectedOptions, null, 2));
    
    console.log('\n🔧 Multi-Select Options:');
    console.log(JSON.stringify(order.multiSelectOptions, null, 2));
    
    console.log('\n🏷️ Logo Setup Selections:');
    console.log(JSON.stringify(order.logoSetupSelections, null, 2));
    
    if (order.costBreakdown) {
      console.log('\n💰 Cost Breakdown:');
      console.log(JSON.stringify(order.costBreakdown, null, 2));
    } else {
      console.log('\n❌ No cost breakdown found in order');
    }

    console.log('\n📊 What the PDF should show:');
    console.log('1. Base Product Cost: 6P Flat Bill - 144 units × $4.00 = $576.00');
    console.log('2. Logo Setup: Large Leather Patch + Run - 144 units × $2.88 = $414.72');
    console.log('3. Closure: Stretched - 144 units × $0.88 = $126.72');
    console.log('4. Delivery: Regular Delivery - 144 units × $3.29 = $473.76');
    console.log('5. Total: $1,671.20');

  } catch (error) {
    console.error('❌ Check failed:', error);
  }
}

checkOrderDetails().catch(console.error);