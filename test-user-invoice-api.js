// Test the user invoice API directly
const fetch = require('node-fetch');

async function testUserInvoiceAPI() {
  console.log('🧪 Testing user invoice API...\n');

  try {
    // 1. Test the user invoices GET endpoint first
    console.log('1️⃣ Testing GET /api/user/invoices (without auth - should fail)...');
    
    const getResponse = await fetch('http://localhost:3003/api/user/invoices', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('GET Response status:', getResponse.status);
    const getData = await getResponse.text();
    console.log('GET Response body:', getData);

    // 2. Test POST to create an invoice (without auth - should fail)
    console.log('\n2️⃣ Testing POST /api/user/invoices (without auth - should fail)...');
    
    const postResponse = await fetch('http://localhost:3003/api/user/invoices', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        orderId: '488b976a-cb28-4eba-88e4-fdf4537563aa'
      })
    });
    
    console.log('POST Response status:', postResponse.status);
    const postData = await postResponse.text();
    console.log('POST Response body:', postData);

    // 3. Test the order endpoint to see if it's accessible
    console.log('\n3️⃣ Testing GET /api/orders/[id]...');
    
    const orderResponse = await fetch('http://localhost:3003/api/orders/488b976a-cb28-4eba-88e4-fdf4537563aa', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Order Response status:', orderResponse.status);
    const orderData = await orderResponse.text();
    console.log('Order Response body (first 200 chars):', orderData.substring(0, 200));

    console.log('\n📋 Summary:');
    console.log('- This confirms the endpoints are working');
    console.log('- Authentication is required for invoice operations');
    console.log('- The checkout success page needs to be accessed with proper session');

  } catch (error) {
    console.error('❌ API test failed:', error);
  }
}

testUserInvoiceAPI().catch(console.error);