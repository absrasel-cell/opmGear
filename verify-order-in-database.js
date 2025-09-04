/**
 * Verify Order in Database
 * Check if the order was properly saved and can be retrieved
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function verifyOrderInDatabase() {
  console.log('🔍 Checking for recent orders in database...\n');

  try {
    // Get the most recent orders
    const recentOrders = await prisma.order.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            email: true,
            name: true
          }
        }
      }
    });

    console.log(`📋 Found ${recentOrders.length} recent orders:\n`);

    recentOrders.forEach((order, index) => {
      console.log(`${index + 1}. Order ID: ${order.id}`);
      console.log(`   Customer: ${order.user?.name || 'N/A'} (${order.user?.email || 'N/A'})`);
      console.log(`   Total Cost: $${order.customerTotal?.toFixed(2) || order.calculatedTotal?.toFixed(2) || 'N/A'}`);
      console.log(`   Status: ${order.status}`);
      console.log(`   Created: ${order.createdAt}`);
      console.log(`   Product: ${order.productName || 'N/A'}`);
      console.log(`   Colors: ${JSON.stringify(order.selectedColors) || 'N/A'}`);
      console.log(`   Cost Breakdown: ${order.costBreakdown ? 'Available' : 'N/A'}`);
      console.log('   ---');
    });

    // Check specifically for our test order
    const testOrderId = '697c6836-74b5-4197-9ba1-413aae016539';
    const testOrder = await prisma.order.findUnique({
      where: { id: testOrderId },
      include: {
        user: {
          select: {
            email: true,
            name: true
          }
        }
      }
    });

    console.log('\n🎯 Checking for specific test order:', testOrderId);
    if (testOrder) {
      console.log('✅ Test order found in database!');
      console.log(`   Customer: ${testOrder.user?.email || 'N/A'}`);
      console.log(`   Total Cost: $${testOrder.customerTotal?.toFixed(2) || testOrder.calculatedTotal?.toFixed(2) || 'N/A'}`);
      console.log(`   Status: ${testOrder.status}`);
      console.log(`   Product: ${testOrder.productName || 'N/A'}`);
      console.log(`   Cost Breakdown: ${testOrder.costBreakdown ? JSON.stringify(testOrder.costBreakdown, null, 2) : 'N/A'}`);
    } else {
      console.log('❌ Test order not found in database');
    }

    // Check for orders with the test email
    const emailOrders = await prisma.order.findMany({
      where: {
        user: {
          email: 'redxtrm02@gmail.com'
        }
      },
      include: {
        user: {
          select: {
            email: true,
            name: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`\n📧 Orders for redxtrm02@gmail.com: ${emailOrders.length} found`);
    emailOrders.forEach((order, index) => {
      console.log(`${index + 1}. Order ID: ${order.id}`);
      console.log(`   Total Cost: $${order.customerTotal?.toFixed(2) || order.calculatedTotal?.toFixed(2) || 'N/A'}`);
      console.log(`   Status: ${order.status}`);
      console.log(`   Created: ${order.createdAt}`);
      console.log(`   Product: ${order.productName || 'N/A'}`);
    });

  } catch (error) {
    console.error('❌ Database error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the verification
verifyOrderInDatabase().catch(console.error);