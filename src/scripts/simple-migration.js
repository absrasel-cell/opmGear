/**
 * Simple migration to mark orders as needing calculation
 * The actual calculation will happen on-demand in the optimized API
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Preparing orders for optimized calculation...');
  
  try {
    // Get count of orders
    const totalOrders = await prisma.order.count();
    console.log(`Found ${totalOrders} orders`);
    
    // Mark all orders as needing calculation by setting lastCalculatedAt to null
    const result = await prisma.order.updateMany({
      where: {},
      data: {
        lastCalculatedAt: null,
        totalCalculationHash: null
      }
    });
    
    console.log(`✅ Updated ${result.count} orders`);
    console.log('Orders will be calculated on-demand when the dashboard loads');
    
    console.log('🎉 Migration completed successfully!');
    console.log('');
    console.log('Performance improvements:');
    console.log('- Orders will be calculated and cached automatically');
    console.log('- Dashboard loading will be much faster');
    console.log('- Background calculations will keep data fresh');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();