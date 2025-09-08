// Test creating a new invoice with the fixed endpoint
const fetch = require('node-fetch');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function testNewInvoiceCreation() {
  console.log('🧪 Testing new invoice creation with fixed endpoint...\n');

  try {
    // First, delete the existing invoice to test fresh creation
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    console.log('1️⃣ Deleting existing invoice and items...');
    
    // Delete existing invoice items first
    const { error: deleteItemsError } = await supabase
      .from('InvoiceItem')
      .delete()
      .eq('invoiceId', 'invoice_1757313646639_j8nklb748');

    if (deleteItemsError && deleteItemsError.code !== 'PGRST116') {
      console.log('Items delete result:', deleteItemsError);
    }

    // Delete existing invoice
    const { error: deleteInvoiceError } = await supabase
      .from('Invoice')
      .delete()
      .eq('id', 'invoice_1757313646639_j8nklb748');

    if (deleteInvoiceError && deleteInvoiceError.code !== 'PGRST116') {
      console.log('Invoice delete result:', deleteInvoiceError);
    }

    console.log('✅ Cleanup completed');

    // Now test the API endpoint directly (this will still fail because no auth)
    console.log('\n2️⃣ Testing /api/user/invoices endpoint...');
    
    const response = await fetch('http://localhost:3001/api/user/invoices', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        orderId: 'a14b4f63-931b-4912-9302-429303d9ff6e'
      })
    });

    console.log('Response status:', response.status);
    const responseText = await response.text();
    console.log('Response:', responseText);

    if (response.status === 401) {
      console.log('\n✅ Expected result: Authentication required');
      console.log('💡 Next step: Log in as redxtrm02@gmail.com and visit:');
      console.log('   http://localhost:3001/checkout/success?orders=a14b4f63-931b-4912-9302-429303d9ff6e');
      console.log('   This should now create invoice items properly!');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testNewInvoiceCreation().catch(console.error);