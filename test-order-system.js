// Test Order System - Verifies Supabase order creation and retrieval
// Run: node test-order-system.js

const { createClient } = require('@supabase/supabase-js');

// Supabase configuration (using environment variables if available)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tfiemrpfsvxvzgbqisdp.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required for testing');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

// Test data for creating an order
const testOrderData = {
  productName: 'Test Baseball Cap',
  selectedColors: {
    'Navy Blue': {
      sizes: {
        'S/M': 5,
        'L/XL': 10
      }
    }
  },
  logoSetupSelections: {
    'front-logo': {
      position: 'Front',
      size: 'Medium',
      application: 'Embroidery'
    }
  },
  selectedOptions: {
    'fabric-setup': 'Cotton Twill',
    'closure-type': 'Snapback',
    'priceTier': 'Tier 2'
  },
  multiSelectOptions: {
    'logo-setup': ['front-logo'],
    'accessories': [],
    'closures': ['snapback'],
    'delivery': ['regular-delivery']
  },
  customerInfo: {
    name: 'Test Customer',
    email: 'test@example.com',
    phone: '555-0123',
    company: 'Test Company',
    address: {
      street: '123 Test St',
      city: 'Test City',
      state: 'TS',
      zipCode: '12345',
      country: 'USA'
    }
  },
  uploadedLogoFiles: [],
  additionalInstructions: 'This is a test order to verify the system works',
  userId: null, // Guest order
  userEmail: 'test@example.com',
  orderType: 'GUEST',
  orderSource: 'PRODUCT_CUSTOMIZATION',
  status: 'PENDING',
  shipmentId: null,
  ipAddress: '127.0.0.1',
  userAgent: 'test-script',
  totalUnits: 15,
  calculatedTotal: 299.99,
  paymentProcessed: true,
  processedAt: new Date().toISOString()
};

async function testOrderCreation() {
  console.log('🧪 Testing order creation in Supabase...');
  
  try {
    // Create a test order
    const { data: order, error } = await supabaseAdmin
      .from('Order')
      .insert(testOrderData)
      .select()
      .single();
    
    if (error) {
      console.error('❌ Order creation failed:', error);
      return null;
    }
    
    console.log('✅ Order created successfully:', order.id);
    console.log('📊 Order details:', {
      id: order.id,
      productName: order.productName,
      customerEmail: order.userEmail,
      status: order.status,
      totalUnits: order.totalUnits,
      calculatedTotal: order.calculatedTotal,
      createdAt: order.createdAt
    });
    
    return order;
    
  } catch (error) {
    console.error('❌ Unexpected error during order creation:', error);
    return null;
  }
}

async function testOrderRetrieval() {
  console.log('\n🧪 Testing order retrieval from Supabase...');
  
  try {
    // Fetch recent orders
    const { data: orders, error, count } = await supabaseAdmin
      .from('Order')
      .select('*', { count: 'exact' })
      .order('createdAt', { ascending: false })
      .limit(5);
    
    if (error) {
      console.error('❌ Order retrieval failed:', error);
      return;
    }
    
    console.log(`✅ Retrieved ${orders.length} orders (total: ${count})`);
    
    if (orders.length > 0) {
      console.log('📋 Recent orders:');
      orders.forEach(order => {
        console.log(`  - ${order.id}: ${order.productName} (${order.status}) - ${order.userEmail}`);
      });
    } else {
      console.log('📭 No orders found in database');
    }
    
  } catch (error) {
    console.error('❌ Unexpected error during order retrieval:', error);
  }
}

async function testOrderAssetTable() {
  console.log('\n🧪 Testing OrderAsset table structure...');
  
  try {
    // Test if we can query the OrderAsset table (should be empty initially)
    const { data, error, count } = await supabaseAdmin
      .from('OrderAsset')
      .select('*', { count: 'exact' })
      .limit(1);
    
    if (error) {
      console.error('❌ OrderAsset table query failed:', error);
      return;
    }
    
    console.log(`✅ OrderAsset table accessible (${count} records)`);
    
  } catch (error) {
    console.error('❌ Unexpected error querying OrderAsset table:', error);
  }
}

async function testOrderDeletion(orderId) {
  console.log(`\n🧪 Testing order deletion (cleanup)...`);
  
  try {
    const { error } = await supabaseAdmin
      .from('Order')
      .delete()
      .eq('userEmail', 'test@example.com') // Clean up all test orders
      .eq('orderSource', 'PRODUCT_CUSTOMIZATION');
    
    if (error) {
      console.error('❌ Order deletion failed:', error);
      return;
    }
    
    console.log('✅ Test orders cleaned up successfully');
    
  } catch (error) {
    console.error('❌ Unexpected error during order deletion:', error);
  }
}

async function runTests() {
  console.log('=== Order System Test Suite ===\n');
  
  // Test 1: Order creation
  const createdOrder = await testOrderCreation();
  
  // Test 2: Order retrieval
  await testOrderRetrieval();
  
  // Test 3: OrderAsset table
  await testOrderAssetTable();
  
  // Test 4: Cleanup (delete test order)
  if (createdOrder) {
    await testOrderDeletion(createdOrder.id);
  }
  
  console.log('\n=== Test Suite Complete ===');
  console.log('🎯 If all tests passed, your order system is ready!');
  console.log('📝 Next steps:');
  console.log('   1. Run the schema SQL in Supabase if you haven\'t already');
  console.log('   2. Test order creation from the checkout page');
  console.log('   3. Verify orders appear in admin/member dashboards');
}

// Run the test suite
runTests().catch(error => {
  console.error('💥 Test suite failed:', error);
  process.exit(1);
});