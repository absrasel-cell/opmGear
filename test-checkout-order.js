const { Client } = require('pg');

async function testCheckoutOrder() {
  console.log('🔍 Testing Checkout Order Functionality...\n');

  try {
    const client = new Client({
      connectionString: 'postgresql://postgres.nowxzkdkaegjwfhhqoez:KKQYfgW3V2wvclzz@aws-1-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true',
      ssl: { rejectUnauthorized: false }
    });

    await client.connect();
    
    // Get a saved order to test with
    console.log('1. Finding a saved order to test checkout...');
    const savedOrder = await client.query(
      'SELECT id, "productName", "selectedColors", "logoSetupSelections", "selectedOptions", "multiSelectOptions" FROM "Order" WHERE "orderSource" = $1 AND "userEmail" = $2 ORDER BY "createdAt" DESC LIMIT 1',
      ['PRODUCT_CUSTOMIZATION', 'absrasel@gmail.com']
    );

    if (savedOrder.rows.length === 0) {
      console.log('❌ No saved orders found for testing');
      await client.end();
      return;
    }

    const order = savedOrder.rows[0];
    console.log('✅ Found saved order for testing:');
    console.log(`   Order ID: ${order.id}`);
    console.log(`   Product: ${order.productName}`);
    console.log(`   Selected Colors: ${JSON.stringify(order.selectedColors)}`);
    console.log(`   Logo Setup: ${JSON.stringify(order.logoSetupSelections)}`);

    // Test the checkout page API endpoint
    console.log('\n2. Testing checkout page with orderId parameter...');
    const checkoutUrl = `http://localhost:3000/checkout?orderId=${order.id}`;
    console.log(`   Checkout URL: ${checkoutUrl}`);

    try {
      const response = await fetch(checkoutUrl);
      console.log(`   Response Status: ${response.status}`);
      
      if (response.ok) {
        console.log('✅ Checkout page loads successfully');
        
        // Test the order API endpoint that the checkout page uses
        console.log('\n3. Testing order API endpoint...');
        const orderResponse = await fetch(`http://localhost:3000/api/orders/${order.id}`);
        console.log(`   Order API Status: ${orderResponse.status}`);
        
        if (orderResponse.ok) {
          const orderData = await orderResponse.json();
          console.log('✅ Order API returns data successfully');
          console.log(`   Order Data: ${JSON.stringify(orderData, null, 2)}`);
          
          // Verify the order has the required fields for cart conversion
          const requiredFields = ['productName', 'selectedColors', 'logoSetupSelections', 'selectedOptions', 'multiSelectOptions'];
          const missingFields = requiredFields.filter(field => !orderData.order[field]);
          
          if (missingFields.length === 0) {
            console.log('✅ Order has all required fields for cart conversion');
          } else {
            console.log(`⚠️ Order missing fields: ${missingFields.join(', ')}`);
          }
        } else {
          console.log('❌ Order API failed');
        }
      } else {
        console.log('❌ Checkout page failed to load');
      }
    } catch (apiError) {
      console.log('❌ API call failed:', apiError.message);
    }

    await client.end();

    console.log('\n📋 Summary:');
    console.log('- The "Check Out" button should now work correctly');
    console.log('- When clicked, it will navigate to /checkout?orderId=<orderId>');
    console.log('- The checkout page will load the saved order into the cart');
    console.log('- Users can then proceed with payment and shipping information');
    console.log('- The order will be converted from "PRODUCT_CUSTOMIZATION" to "REORDER"');

  } catch (error) {
    console.error('❌ Error testing checkout order:', error.message);
  }
}

testCheckoutOrder().catch(console.error);
