// Check actual Order table schema
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkOrderSchema() {
  console.log('🔍 Checking Order table schema...\n');

  try {
    // Get one order record to see all columns
    const { data: orders, error: orderError } = await supabase
      .from('Order')
      .select('*')
      .limit(1);

    if (orderError) {
      console.error('❌ Error fetching orders:', orderError);
      return;
    }

    if (!orders || orders.length === 0) {
      console.log('⚠️ No orders found in database');
      return;
    }

    const order = orders[0];
    console.log('📋 Order columns:');
    Object.keys(order).forEach(key => {
      console.log(`   ${key}: ${typeof order[key]} = ${order[key]}`);
    });

    console.log('\n🎯 Key fields for invoice creation:');
    console.log(`   id: ${order.id}`);
    console.log(`   userId: ${order.userId}`);
    console.log(`   productName: ${order.productName}`);
    
    // Look for cost/total fields
    const costFields = Object.keys(order).filter(key => 
      key.toLowerCase().includes('cost') || 
      key.toLowerCase().includes('total') || 
      key.toLowerCase().includes('price')
    );
    
    console.log('\n💰 Cost/total related fields:');
    costFields.forEach(field => {
      console.log(`   ${field}: ${order[field]}`);
    });

  } catch (error) {
    console.error('❌ Schema check failed:', error);
  }
}

checkOrderSchema().catch(console.error);