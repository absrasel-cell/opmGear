// Quick test script to verify order system is working
// Run: node test-order-system-simple.js

async function testOrderSystem() {
  try {
    console.log('🧪 Testing Order System...');
    
    // Test GET /api/orders (should return orders now)
    console.log('📋 Testing order retrieval...');
    const getResponse = await fetch('http://localhost:3000/api/orders?all=true');
    const getData = await getResponse.json();
    
    if (getResponse.ok) {
      console.log('✅ GET /api/orders working');
      console.log(`📊 Found ${getData.orders?.length || 0} orders in database`);
      if (getData.orders?.length > 0) {
        console.log('📝 Latest order:', getData.orders[0].id);
      }
    } else {
      console.log('❌ GET /api/orders failed:', getData);
    }
    
    // Test POST /api/orders (create a test order)
    console.log('\n🛒 Testing order creation...');
    const testOrder = {
      productName: 'Test Order - System Verification',
      selectedColors: { 'Black': { sizes: { 'L': 10 } } },
      logoSetupSelections: {},
      selectedOptions: { priceTier: 'Tier 2' },
      multiSelectOptions: {},
      customerInfo: {
        name: 'Test Customer',
        email: 'test@example.com',
        phone: '555-1234',
        address: {
          street: '123 Test St',
          city: 'Test City',
          state: 'TS',
          zipCode: '12345',
          country: 'United States'
        }
      },
      userId: null,
      userEmail: 'test@example.com',
      orderType: 'GUEST',
      orderSource: 'CHECKOUT_ORDER',
      status: 'CONFIRMED',
      paymentProcessed: true,
      processedAt: new Date().toISOString()
    };
    
    const postResponse = await fetch('http://localhost:3000/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testOrder)
    });
    
    const postData = await postResponse.json();
    
    if (postResponse.ok && !postData.orderId?.startsWith('temp-')) {
      console.log('✅ POST /api/orders working');
      console.log('🎉 Test order created:', postData.orderId);
      console.log('📧 Order saved to database successfully!');
      
      // Verify the order was saved
      const verifyResponse = await fetch('http://localhost:3000/api/orders?all=true');
      const verifyData = await verifyResponse.json();
      const foundOrder = verifyData.orders?.find(o => o.id === postData.orderId);
      
      if (foundOrder) {
        console.log('✅ Order verification successful - found in database');
      } else {
        console.log('⚠️ Order created but not found in retrieval');
      }
      
    } else {
      console.log('❌ POST /api/orders failed or returned temp ID:', postData);
    }
    
  } catch (error) {
    console.error('💥 Test failed:', error);
    console.log('\n🔧 Make sure:');
    console.log('1. Development server is running (npm run dev)');
    console.log('2. Supabase schema has been applied');
    console.log('3. Environment variables are correct');
  }
}

// Run the test
testOrderSystem();