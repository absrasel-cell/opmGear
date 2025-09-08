// Test user invoice creation directly with cookies
const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');
const { promises: fs } = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function testUserInvoiceCreation() {
  console.log('🧪 Testing user invoice creation directly...\n');

  try {
    // 1. Get a real order first
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { data: order, error: orderError } = await supabase
      .from('Order')
      .select('*')
      .eq('id', 'a14b4f63-931b-4912-9302-429303d9ff6e')
      .single();

    if (orderError || !order) {
      console.error('❌ Order not found:', orderError);
      return;
    }

    console.log('✅ Found order:', {
      id: order.id,
      userId: order.userId,
      productName: order.productName,
      total: order.calculatedTotal
    });

    // 2. Get user details
    const { data: user, error: userError } = await supabase
      .from('User')
      .select('*')
      .eq('id', order.userId)
      .single();

    if (userError || !user) {
      console.error('❌ User not found:', userError);
      return;
    }

    console.log('✅ Found user:', {
      email: user.email,
      accessRole: user.accessRole,
      customerRole: user.customerRole
    });

    // 3. Test API endpoints directly
    console.log('\n🔍 Testing API endpoints...');
    
    // Test without authentication first
    console.log('1️⃣ Testing /api/user/invoices (no auth)...');
    let response = await fetch('http://localhost:3001/api/user/invoices', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        orderId: order.id
      })
    });

    console.log('Response status:', response.status);
    const responseText = await response.text();
    console.log('Response body:', responseText);

    // 4. Test admin endpoint without auth
    console.log('\n2️⃣ Testing /api/invoices (no auth)...');
    response = await fetch('http://localhost:3001/api/invoices', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        orderId: order.id,
        simple: true
      })
    });

    console.log('Response status:', response.status);
    const adminResponseText = await response.text();
    console.log('Response body:', adminResponseText);

    // 5. Check what authentication looks like
    console.log('\n3️⃣ Checking current session endpoint...');
    response = await fetch('http://localhost:3001/api/auth/session');
    console.log('Session response status:', response.status);
    const sessionText = await response.text();
    console.log('Session response:', sessionText);

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testUserInvoiceCreation().catch(console.error);