/**
 * Test AI Order Calculation Logic
 * Tests what the GPT prompt actually receives
 */

const path = require('path');

// Mock the environment to load the modules
process.env.NODE_ENV = 'development';
process.chdir('F:\\Custom Cap - github\\USCC');

async function testAIOrderCalculation() {
  console.log('🤖 TESTING AI ORDER CALCULATION LOGIC');
  console.log('=' .repeat(60));
  
  try {
    // Import the order AI core
    const { 
      parseOrderRequirements,
      calculatePreciseOrderEstimateWithMessage
    } = await import('./src/lib/order-ai-core.ts');
    
    // Test the exact message from the error report
    const testMessage = "7-Panel Cap, Polyester/Laser Cut Fabric, Black/Grey, Size: 59 cm, Slight Curved. Leather Patch Front, 3D Embroidery on Left, Flat Embroidery on Right, Rubber patch on back. Closure Fitted. Hang Tag, Sticker.";
    
    console.log('\n1. PARSING ORDER REQUIREMENTS');
    const requirements = parseOrderRequirements(testMessage);
    
    // Set quantities to test
    requirements.quantity = 288; // First test case
    
    console.log('   Parsed requirements:');
    console.log(`     Quantity: ${requirements.quantity}`);
    console.log(`     Logo Type: ${requirements.logoType}`);
    console.log(`     Fabric Type: ${requirements.fabricType}`);
    console.log(`     Closure Type: ${requirements.closureType}`);
    console.log(`     Multi-logo Setup:`, requirements.multiLogoSetup ? Object.keys(requirements.multiLogoSetup) : 'None');
    
    console.log('\n2. CALCULATING 288 PIECES ORDER');
    const result288 = await calculatePreciseOrderEstimateWithMessage(requirements, testMessage);
    
    console.log('   Cost Breakdown:');
    console.log(`     Base Product: $${result288.costBreakdown.baseProductTotal?.toFixed(2)}`);
    console.log(`     Logo Setup: $${result288.costBreakdown.logoSetupTotal?.toFixed(2)}`);
    console.log(`     Premium Fabric: $${result288.costBreakdown.premiumFabricTotal?.toFixed(2)}`);
    console.log(`     Closure: $${result288.costBreakdown.closureTotal?.toFixed(2)}`);
    console.log(`     Accessories: $${result288.costBreakdown.accessoriesTotal?.toFixed(2)}`);
    console.log(`     Delivery: $${result288.costBreakdown.deliveryTotal?.toFixed(2)}`);
    console.log(`     TOTAL: $${result288.costBreakdown.totalCost?.toFixed(2)}`);
    
    // Test detailed breakdown for GPT prompt
    if (result288.costBreakdown.detailedBreakdown) {
      console.log('\n   Detailed Breakdown (for GPT prompt):');
      const detail = result288.costBreakdown.detailedBreakdown;
      
      if (detail.blankCaps) {
        console.log(`     Blank caps: $${detail.blankCaps.unitPrice} per cap × ${requirements.quantity} = $${detail.blankCaps.total}`);
      }
      
      if (detail.premiumFabric) {
        console.log(`     Premium fabric: $${detail.premiumFabric.unitPrice} per cap × ${requirements.quantity} = $${detail.premiumFabric.total}`);
      }
      
      if (detail.logos && detail.logos.length > 0) {
        detail.logos.forEach(logo => {
          console.log(`     ${logo.type} (${logo.position}): $${logo.unitPrice} per cap × ${requirements.quantity} = $${logo.totalCost}`);
        });
      }
      
      if (detail.accessories && detail.accessories.length > 0) {
        detail.accessories.forEach(acc => {
          console.log(`     ${acc.name}: $${acc.unitPrice} per cap × ${requirements.quantity} = $${acc.totalCost}`);
        });
      }
    }
    
    console.log('\n3. CALCULATING 2500 PIECES ORDER');
    requirements.quantity = 2500;
    const result2500 = await calculatePreciseOrderEstimateWithMessage(requirements, testMessage);
    
    console.log('   Cost Breakdown:');
    console.log(`     Base Product: $${result2500.costBreakdown.baseProductTotal?.toFixed(2)}`);
    console.log(`     Logo Setup: $${result2500.costBreakdown.logoSetupTotal?.toFixed(2)}`);
    console.log(`     Premium Fabric: $${result2500.costBreakdown.premiumFabricTotal?.toFixed(2)}`);
    console.log(`     Closure: $${result2500.costBreakdown.closureTotal?.toFixed(2)}`);
    console.log(`     Accessories: $${result2500.costBreakdown.accessoriesTotal?.toFixed(2)}`);
    console.log(`     Delivery: $${result2500.costBreakdown.deliveryTotal?.toFixed(2)}`);
    console.log(`     TOTAL: $${result2500.costBreakdown.totalCost?.toFixed(2)}`);
    
    // Validate the key issues
    console.log('\n4. VALIDATION');
    const errors = [];
    
    // Check if base cap pricing is correct (Tier 3)
    const expected288BasePrice = 4.25;
    const expected2500BasePrice = 3.60;
    
    const actual288BasePrice = result288.costBreakdown.detailedBreakdown?.blankCaps?.unitPrice || 0;
    const actual2500BasePrice = result2500.costBreakdown.detailedBreakdown?.blankCaps?.unitPrice || 0;
    
    if (Math.abs(actual288BasePrice - expected288BasePrice) > 0.01) {
      errors.push(`❌ 288 pieces base cap: Got $${actual288BasePrice}, expected $${expected288BasePrice}`);
    } else {
      console.log(`   ✅ 288 pieces base cap: $${actual288BasePrice}`);
    }
    
    if (Math.abs(actual2500BasePrice - expected2500BasePrice) > 0.01) {
      errors.push(`❌ 2500 pieces base cap: Got $${actual2500BasePrice}, expected $${expected2500BasePrice}`);
    } else {
      console.log(`   ✅ 2500 pieces base cap: $${actual2500BasePrice}`);
    }
    
    // Check fabric pricing
    const actual288FabricPrice = result288.costBreakdown.detailedBreakdown?.premiumFabric?.unitPrice || 0;
    const actual2500FabricPrice = result2500.costBreakdown.detailedBreakdown?.premiumFabric?.unitPrice || 0;
    
    // Polyester/Laser Cut: Should be $1.00 for 288, $0.70 for 2500
    const expected288FabricPrice = 1.00;
    const expected2500FabricPrice = 0.70;
    
    if (Math.abs(actual288FabricPrice - expected288FabricPrice) > 0.01) {
      errors.push(`❌ 288 pieces fabric: Got $${actual288FabricPrice}, expected $${expected288FabricPrice}`);
    } else {
      console.log(`   ✅ 288 pieces fabric: $${actual288FabricPrice}`);
    }
    
    if (Math.abs(actual2500FabricPrice - expected2500FabricPrice) > 0.01) {
      errors.push(`❌ 2500 pieces fabric: Got $${actual2500FabricPrice}, expected $${expected2500FabricPrice}`);
    } else {
      console.log(`   ✅ 2500 pieces fabric: $${actual2500FabricPrice}`);
    }
    
    console.log('\n' + '='.repeat(60));
    if (errors.length === 0) {
      console.log('🎉 AI ORDER CALCULATION IS CORRECT!');
      console.log('The pricing engine provides correct data to GPT prompts.');
      process.exit(0);
    } else {
      console.log(`🚨 ${errors.length} ISSUES IN AI ORDER CALCULATION:`);
      errors.forEach(error => console.log(`   ${error}`));
      process.exit(1);
    }
    
  } catch (error) {
    console.error('💥 TEST FAILED:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testAIOrderCalculation();