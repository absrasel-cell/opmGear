// Test new invoice creation with detailed line items
const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function testNewInvoiceCreation() {
  console.log('🧾 Testing new invoice creation with detailed line items...\n');

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    console.log('1️⃣ Creating invoice via API call...');
    
    // Test creating invoice (will fail due to authentication, but we can see the structure)
    const response = await fetch('http://localhost:3004/api/user/invoices', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        orderId: 'a14b4f63-931b-4912-9302-429303d9ff6e'
      })
    });

    console.log('📊 Response status:', response.status);
    
    if (response.status === 401) {
      console.log('✅ Expected: Authentication required (this is correct)');
      console.log('ℹ️  To test properly, visit: http://localhost:3004/checkout/success?orderId=a14b4f63-931b-4912-9302-429303d9ff6e');
      console.log('ℹ️  While logged in as redxtrm02@gmail.com');
    } else {
      const result = await response.text();
      console.log('📄 Response:', result.substring(0, 500));
    }
    
    console.log('\n2️⃣ Checking for any new invoices in database...');
    
    // Check if any new invoices were created recently
    const { data: recentInvoices, error } = await supabase
      .from('Invoice')
      .select('*')
      .eq('orderId', 'a14b4f63-931b-4912-9302-429303d9ff6e')
      .order('createdAt', { ascending: false });

    if (recentInvoices && recentInvoices.length > 0) {
      const latestInvoice = recentInvoices[0];
      console.log(`📄 Found invoice: ${latestInvoice.id} (${latestInvoice.number})`);
      console.log(`   Total: $${latestInvoice.total}`);
      console.log(`   Status: ${latestInvoice.status}`);
      console.log(`   Created: ${latestInvoice.createdAt}`);
      
      // Get invoice items
      const { data: items } = await supabase
        .from('InvoiceItem')
        .select('*')
        .eq('invoiceId', latestInvoice.id)
        .order('id');

      console.log(`\n📋 Invoice Items (${items?.length || 0}):`);
      if (items && items.length > 0) {
        items.forEach((item, index) => {
          console.log(`\n  ${index + 1}. ${item.name}`);
          console.log(`     Description: ${item.description}`);
          console.log(`     Quantity: ${item.quantity}`);
          console.log(`     Unit Price: $${item.unitPrice}`);
          console.log(`     Total: $${item.total}`);
        });
        
        console.log('\n🎯 Analysis:');
        if (items.length >= 4) {
          console.log('✅ SUCCESS: Invoice has detailed line items (4+)');
          console.log('✅ Expected items: Base Product, Logo Setup, Closure, Delivery, Mold Charge');
        } else {
          console.log(`❌ ISSUE: Only ${items.length} items found, expected at least 4`);
        }
      } else {
        console.log('❌ No invoice items found');
      }
    } else {
      console.log('ℹ️  No invoices found for this order yet');
    }

    console.log('\n💡 Next Steps:');
    console.log('1. Log in as redxtrm02@gmail.com in your browser');
    console.log('2. Visit: http://localhost:3004/checkout/success?orderId=a14b4f63-931b-4912-9302-429303d9ff6e');
    console.log('3. Check if invoice gets created with detailed line items');
    console.log('4. Download PDF to verify detailed cost breakdown displays');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testNewInvoiceCreation().catch(console.error);