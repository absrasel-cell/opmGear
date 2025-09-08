// Test PDF generation after server restart
const fetch = require('node-fetch');

async function testPdfGeneration() {
  console.log('🧪 Testing PDF generation after server restart...\n');

  try {
    // Test if we can create a new invoice first via checkout success (will still need auth)
    console.log('1️⃣ Testing invoice creation endpoint...');
    
    const response = await fetch('http://localhost:3001/api/user/invoices', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        orderId: 'a14b4f63-931b-4912-9302-429303d9ff6e'
      })
    });

    console.log('Invoice creation response status:', response.status);
    
    if (response.status === 401) {
      console.log('✅ Expected: Authentication required');
    } else {
      const text = await response.text();
      console.log('Response:', text.substring(0, 200));
    }

    // Test if the existing invoice PDF endpoint works
    console.log('\n2️⃣ Testing PDF generation for existing invoice...');
    
    // First, let's find an existing invoice
    const { createClient } = require('@supabase/supabase-js');
    require('dotenv').config({ path: '.env.local' });

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: invoices, error } = await supabase
      .from('Invoice')
      .select('id, number')
      .limit(1);

    if (invoices && invoices.length > 0) {
      const invoice = invoices[0];
      console.log(`Found invoice: ${invoice.number} (${invoice.id})`);
      
      // Test PDF generation
      const pdfResponse = await fetch(`http://localhost:3001/api/invoices/${invoice.id}/pdf`, {
        headers: {
          'Accept': 'application/pdf'
        }
      });

      console.log('PDF response status:', pdfResponse.status);
      
      if (pdfResponse.status === 403 || pdfResponse.status === 401) {
        console.log('✅ Expected: Authentication/authorization required for PDF');
      } else if (pdfResponse.status === 200) {
        console.log('✅ PDF generated successfully!');
        console.log('Content-Type:', pdfResponse.headers.get('content-type'));
      } else {
        const errorText = await pdfResponse.text();
        console.log('❌ PDF generation failed:', errorText.substring(0, 300));
      }
    } else {
      console.log('❌ No invoices found to test PDF generation');
    }

    console.log('\n🎯 Next steps:');
    console.log('1. Log in as redxtrm02@gmail.com in your browser');
    console.log('2. Visit: http://localhost:3001/checkout/success?orders=a14b4f63-931b-4912-9302-429303d9ff6e');
    console.log('3. Invoice should create with proper items and PDF should download');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testPdfGeneration().catch(console.error);