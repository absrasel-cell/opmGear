/**
 * Background job to recalculate order totals
 * Can be run as a cron job or scheduled task
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function runBackgroundCalculation() {
  console.log('🔄 Starting background order total calculation...');
  
  try {
    // Import the calculation function
    const { recalculateAllOrderTotals } = require('../lib/order-total-calculator');
    
    // Run the background calculation
    await recalculateAllOrderTotals();
    
    // Get stats
    const totalOrders = await prisma.order.count();
    const calculatedOrders = await prisma.order.count({
      where: {
        calculatedTotal: { not: null }
      }
    });
    
    const staleOrders = await prisma.order.count({
      where: {
        OR: [
          { lastCalculatedAt: null },
          { lastCalculatedAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } }
        ]
      }
    });
    
    console.log('📊 Background calculation summary:');
    console.log(`   Total orders: ${totalOrders}`);
    console.log(`   Calculated: ${calculatedOrders} (${Math.round((calculatedOrders / totalOrders) * 100)}%)`);
    console.log(`   Stale calculations: ${staleOrders}`);
    console.log(`   Fresh calculations: ${totalOrders - staleOrders}`);
    
    console.log('✅ Background calculation completed successfully');
    
  } catch (error) {
    console.error('❌ Background calculation failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  runBackgroundCalculation();
}

module.exports = { runBackgroundCalculation };