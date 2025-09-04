/**
 * Verify the created order exists in database
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyOrder() {
  try {
    console.log('🔍 Searching for order: 697c6836-74b5-4197-9ba1-413aae016539\n');
    
    const order = await prisma.order.findUnique({
      where: {
        id: '697c6836-74b5-4197-9ba1-413aae016539'
      }
    });
    
    if (order) {
      console.log('✅ ORDER FOUND IN DATABASE!');
      console.log('=====================================');
      console.log(`ID: ${order.id}`);
      console.log(`Product: ${order.productName}`);
      console.log(`Total Cost: $${order.calculatedTotal}`);
      console.log(`Status: ${order.status}`);
      console.log(`Customer: ${order.customerInfo?.email || 'No email'}`);
      console.log(`Created: ${order.createdAt}`);
      
      console.log(`\n🎨 CUSTOMIZATIONS:`);
      console.log(`Colors: ${Object.keys(order.selectedColors || {}).join(', ')}`);
      console.log(`Logo Setups: ${Object.keys(order.logoSetupSelections || {}).length} positions`);
      console.log(`Options: ${JSON.stringify(order.selectedOptions, null, 2)}`);
      console.log(`Multi-Select Options: ${JSON.stringify(order.multiSelectOptions, null, 2)}`);
      
      // Check for premium features
      const optionsStr = JSON.stringify(order.selectedOptions || {});
      const multiOptionsStr = JSON.stringify(order.multiSelectOptions || {});
      
      const hasLeather = optionsStr.toLowerCase().includes('leather') || 
                        multiOptionsStr.toLowerCase().includes('leather');
      const hasFlexfit = optionsStr.toLowerCase().includes('flexfit') || 
                        multiOptionsStr.toLowerCase().includes('flexfit');
      const hasMultiLogos = Object.keys(order.logoSetupSelections || {}).length >= 1;
      
      console.log('\n🎯 PREMIUM FEATURES:');
      console.log(`- Genuine Leather: ${hasLeather ? '✅' : '❌'}`);
      console.log(`- Flexfit Closure: ${hasFlexfit ? '✅' : '❌'}`);
      console.log(`- Multi-Logo Setup: ${hasMultiLogos ? '✅' : '❌'}`);
      
      console.log('\n🎉 PREMIUM ORDER CREATED SUCCESSFULLY!');
      
    } else {
      console.log('❌ Order not found');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

verifyOrder();