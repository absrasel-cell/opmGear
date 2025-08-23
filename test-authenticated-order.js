const { Client } = require('pg');

async function testAuthenticatedOrder() {
  console.log('🔍 Testing Authenticated Order Submission...\n');

  try {
    const client = new Client({
      connectionString: 'postgresql://postgres.nowxzkdkaegjwfhhqoez:KKQYfgW3V2wvclzz@aws-1-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true',
      ssl: { rejectUnauthorized: false }
    });

    await client.connect();
    
    // First, let's check the current user's orders
    console.log('1. Checking current orders for absrasel@gmail.com...');
    const currentOrders = await client.query(
      'SELECT id, "productName", "orderSource", status, "userId", "userEmail", "createdAt" FROM "Order" WHERE "userEmail" = $1 ORDER BY "createdAt" DESC',
      ['absrasel@gmail.com']
    );

    console.log(`Found ${currentOrders.rows.length} orders for absrasel@gmail.com:`);
    currentOrders.rows.forEach((order, index) => {
      console.log(`   ${index + 1}. ID: ${order.id}`);
      console.log(`      Product: ${order.productName}`);
      console.log(`      Source: ${order.orderSource}`);
      console.log(`      Status: ${order.status}`);
      console.log(`      User ID: ${order.userId || 'null'}`);
      console.log(`      Created: ${order.createdAt}`);
    });

    // Test order submission with authentication (simulating logged-in user)
    console.log('\n2. Testing authenticated order submission...');
    const authenticatedOrderData = {
      productName: 'Authenticated Test Cap',
      selectedColors: { 'Blue': { 'Large': 24 } },
      logoSetupSelections: {},
      selectedOptions: {},
      multiSelectOptions: {},
      customerInfo: {
        name: 'Rasel Miah',
        email: 'absrasel@gmail.com',
        phone: '123-456-7890',
        company: 'Test Company'
      },
      userId: '34040f7b-1686-41c6-bf44-a1257d738d98', // The admin user ID
      orderSource: 'PRODUCT_CUSTOMIZATION'
    };

    try {
      const response = await fetch('http://localhost:3000/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authenticatedOrderData)
      });

      const result = await response.json();
      console.log('API Response Status:', response.status);
      console.log('API Response:', JSON.stringify(result, null, 2));

      if (response.ok) {
        console.log('✅ Authenticated order submission successful');
        
        if (result.orderId && !result.orderId.startsWith('temp_')) {
          console.log('✅ Order saved to database with ID:', result.orderId);
          console.log('✅ Order Type:', result.order.orderType);
          console.log('✅ User ID:', result.order.userId);
        } else {
          console.log('⚠️ Order saved temporarily (database maintenance mode)');
        }
      } else {
        console.log('❌ Order submission failed');
      }
    } catch (apiError) {
      console.log('❌ API call failed:', apiError.message);
    }

    // Check orders again after submission
    console.log('\n3. Checking orders after submission...');
    const updatedOrders = await client.query(
      'SELECT id, "productName", "orderSource", status, "userId", "userEmail", "createdAt" FROM "Order" WHERE "userEmail" = $1 ORDER BY "createdAt" DESC',
      ['absrasel@gmail.com']
    );

    console.log(`Found ${updatedOrders.rows.length} orders for absrasel@gmail.com:`);
    updatedOrders.rows.forEach((order, index) => {
      console.log(`   ${index + 1}. ID: ${order.id}`);
      console.log(`      Product: ${order.productName}`);
      console.log(`      Source: ${order.orderSource}`);
      console.log(`      Status: ${order.status}`);
      console.log(`      User ID: ${order.userId || 'null'}`);
      console.log(`      Created: ${order.createdAt}`);
    });

    await client.end();

    console.log('\n📋 Summary:');
    console.log('- Orders should now appear in the member dashboard');
    console.log('- Both authenticated and guest orders will be shown');
    console.log('- Use the Refresh button in the dashboard to update data');
    console.log('- Check the "Saved Orders" and "Checkout Orders" filters');

  } catch (error) {
    console.error('❌ Error testing authenticated order:', error.message);
  }
}

testAuthenticatedOrder().catch(console.error);
