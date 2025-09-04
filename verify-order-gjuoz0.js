/**
 * Verify Order ORD-GJU0Z0 in Database
 */

const fetch = require('node-fetch');

async function verifyOrder() {
  console.log('🔍 Verifying Order ORD-GJU0Z0...\n');
  
  try {
    // Check orders API
    const response = await fetch('http://localhost:3001/api/orders', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      console.log(`❌ Admin orders API failed: ${response.status}`);
      return;
    }

    const orders = await response.json();
    console.log(`📊 Total orders in database: ${orders.length}`);
    
    // Look for the specific order
    const targetOrder = orders.find(order => 
      order.orderReference === 'ORD-GJU0Z0' ||
      order.id === 'ORD-GJU0Z0' ||
      String(order.orderReference).includes('GJU0Z0')
    );
    
    if (targetOrder) {
      console.log('✅ ORDER FOUND:');
      console.log('=====================================');
      console.log(JSON.stringify(targetOrder, null, 2));
      console.log('=====================================\n');
      
      console.log('📋 ORDER SUMMARY:');
      console.log(`- ID: ${targetOrder.id}`);
      console.log(`- Reference: ${targetOrder.orderReference}`);
      console.log(`- Total Cost: $${targetOrder.totalCost}`);
      console.log(`- Quantity: ${targetOrder.quantity}`);
      console.log(`- Status: ${targetOrder.status}`);
      console.log(`- Customer Email: ${targetOrder.customerEmail}`);
      console.log(`- Created: ${targetOrder.createdAt}`);
      console.log(`- Customizations: ${targetOrder.customizations ? 'Yes' : 'No'}`);
      
      if (targetOrder.customizations) {
        console.log(`\n🎨 CUSTOMIZATIONS:`);
        console.log(JSON.stringify(targetOrder.customizations, null, 2));
      }
      
    } else {
      console.log('❌ ORDER NOT FOUND');
      console.log('\n📋 Available Orders:');
      orders.slice(0, 5).forEach(order => {
        console.log(`- ${order.orderReference || order.id} | $${order.totalCost} | ${order.status}`);
      });
      
      if (orders.length > 5) {
        console.log(`... and ${orders.length - 5} more orders`);
      }
    }
    
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
  }
}

verifyOrder();