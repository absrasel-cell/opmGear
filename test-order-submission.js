const { Client } = require('pg');

async function testOrderSubmission() {
  console.log('🔍 Testing Order Submission Process...\n');

  try {
    const client = new Client({
      connectionString: 'postgresql://postgres.nowxzkdkaegjwfhhqoez:KKQYfgW3V2wvclzz@aws-1-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true',
      ssl: { rejectUnauthorized: false }
    });

    await client.connect();
    
    // Check existing orders
    console.log('1. Checking existing orders in database...');
    const existingOrders = await client.query(
      'SELECT id, "productName", "orderSource", status, "userId", "userEmail", "createdAt" FROM "Order" ORDER BY "createdAt" DESC LIMIT 10'
    );

    console.log(`Found ${existingOrders.rows.length} orders in database:`);
    existingOrders.rows.forEach((order, index) => {
      console.log(`   ${index + 1}. ID: ${order.id}`);
      console.log(`      Product: ${order.productName}`);
      console.log(`      Source: ${order.orderSource}`);
      console.log(`      Status: ${order.status}`);
      console.log(`      User ID: ${order.userId}`);
      console.log(`      User Email: ${order.userEmail}`);
      console.log(`      Created: ${order.createdAt}`);
      console.log('');
    });

    // Check orders for the specific user
    console.log('2. Checking orders for absrasel@gmail.com...');
    const userOrders = await client.query(
      'SELECT id, "productName", "orderSource", status, "userId", "userEmail", "createdAt" FROM "Order" WHERE "userEmail" = $1 ORDER BY "createdAt" DESC',
      ['absrasel@gmail.com']
    );

    console.log(`Found ${userOrders.rows.length} orders for absrasel@gmail.com:`);
    userOrders.rows.forEach((order, index) => {
      console.log(`   ${index + 1}. ID: ${order.id}`);
      console.log(`      Product: ${order.productName}`);
      console.log(`      Source: ${order.orderSource}`);
      console.log(`      Status: ${order.status}`);
      console.log(`      Created: ${order.createdAt}`);
    });

    // Test order submission via API
    console.log('\n3. Testing order submission via API...');
    const testOrderData = {
      productName: 'Test Cap Product',
      selectedColors: { 'Red': { 'Medium': 48 } },
      logoSetupSelections: {},
      selectedOptions: {},
      multiSelectOptions: {},
      customerInfo: {
        name: 'Test User',
        email: 'absrasel@gmail.com',
        phone: '123-456-7890',
        company: 'Test Company'
      },
      orderSource: 'PRODUCT_CUSTOMIZATION'
    };

    try {
      const response = await fetch('http://localhost:3000/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testOrderData)
      });

      const result = await response.json();
      console.log('API Response Status:', response.status);
      console.log('API Response:', JSON.stringify(result, null, 2));

      if (response.ok) {
        console.log('✅ Order submission successful');
        
        // Check if the order was actually saved
        if (result.orderId && !result.orderId.startsWith('temp_')) {
          console.log('✅ Order saved to database with ID:', result.orderId);
        } else {
          console.log('⚠️ Order saved temporarily (database maintenance mode)');
        }
      } else {
        console.log('❌ Order submission failed');
      }
    } catch (apiError) {
      console.log('❌ API call failed:', apiError.message);
    }

    await client.end();

    console.log('\n📋 Analysis:');
    console.log('- If orders are not updating, check the browser console for errors');
    console.log('- Verify that the orderSource field is being set correctly');
    console.log('- Check if the member dashboard is refreshing data properly');
    console.log('- Ensure the user is properly authenticated when submitting orders');

  } catch (error) {
    console.error('❌ Error testing order submission:', error.message);
  }
}

testOrderSubmission().catch(console.error);
