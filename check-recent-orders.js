/**
 * Check Recent Orders in Database
 * Direct database query to see if AI orders are being saved
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkRecentOrders() {
  console.log('🔍 Checking recent orders in database...');
  
  try {
    // Get the 10 most recent orders
    const recentOrders = await prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        customerInfo: true,
        selectedColors: true,
        customerTotal: true,
        totalUnits: true,
        status: true,
        orderType: true,
        orderSource: true,
        createdAt: true,
        additionalInstructions: true
      }
    });
    
    console.log(`\n📊 Found ${recentOrders.length} recent orders:`);
    
    recentOrders.forEach((order, index) => {
      console.log(`\n${index + 1}. Order ID: ${order.id}`);
      console.log(`   Reference: ORD-${order.id.slice(-6).toUpperCase()}`);
      console.log(`   Customer: ${order.customerInfo?.name || 'No name'} (${order.customerInfo?.email || 'No email'})`);
      console.log(`   Type: ${order.orderType} | Source: ${order.orderSource}`);
      console.log(`   Status: ${order.status}`);
      console.log(`   Total: $${order.customerTotal || 0}`);
      console.log(`   Created: ${new Date(order.createdAt).toLocaleString()}`);
      
      // Check if this looks like an AI order
      const isAiOrder = order.customerInfo?.email?.includes('ai-generated-order') ||
                       order.customerInfo?.name?.includes('AI Order Customer') ||
                       order.additionalInstructions?.includes('Order created via AI Assistant');
      
      if (isAiOrder) {
        console.log(`   🤖 AI ORDER DETECTED!`);
        
        // Show color breakdown
        if (order.selectedColors) {
          console.log(`   Colors:`, Object.keys(order.selectedColors));
          const totalQuantity = Object.values(order.selectedColors).reduce((sum, colorData) => {
            return sum + Object.values(colorData.sizes || {}).reduce((sizeSum, qty) => sizeSum + (parseInt(qty) || 0), 0);
          }, 0);
          console.log(`   Total Quantity: ${totalQuantity} caps`);
        }
      }
    });
    
    // Check specifically for recent AI orders
    const aiOrders = recentOrders.filter(order => 
      order.customerInfo?.email?.includes('ai-generated-order') ||
      order.customerInfo?.name?.includes('AI Order Customer') ||
      order.additionalInstructions?.includes('Order created via AI Assistant')
    );
    
    console.log(`\n🤖 AI Orders found: ${aiOrders.length}`);
    if (aiOrders.length === 0) {
      console.log('❌ No AI orders found in recent orders');
    } else {
      console.log('✅ AI orders are being saved to database correctly');
    }
    
  } catch (error) {
    console.error('❌ Database check failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkRecentOrders();