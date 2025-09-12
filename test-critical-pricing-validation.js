/**
 * CRITICAL PRICING VALIDATION TEST
 * This will test the exact scenarios that are failing and validate against CSV data
 */

// Import the AI pricing functions
const { 
  getAIBlankCapPrice, 
  getAIFabricPrice,
  getAILogoPrice,
  getAIDeliveryPrice,
  findProductTierFromDescription
} = require('./src/lib/ai-pricing-service.js');

async function validateCriticalPricingScenarios() {
  console.log('🚨 CRITICAL PRICING VALIDATION - Testing Exact Failure Scenarios\n');
  
  // Test scenarios from error report
  const testScenarios = [
    {
      name: '576 Pieces - Acrylic Fabric with 3D Embroidery',
      quantity: 576,
      description: 'Acrylic fabric, Red/White, Large size caps with 3D Embroidery',
      expectedTier: 'Tier 1',
      expectedBlankCapPrice: 3.63,  // From CSV: Tier 1, price576
      expectedAcrylicPrice: 0.88,   // From CSV: Acrylic, price576 
      expectedEmbroideryPrice: 1.18, // From CSV: 3D Embroidery Small Direct, price576
      expectedDeliveryPrice: 2.71,   // From CSV: Regular Delivery, price576
      expectedTotals: {
        caps: 2090.88,      // 576 × 3.63
        fabric: 506.88,     // 576 × 0.88 
        embroidery: 679.68, // 576 × 1.18
        delivery: 1558.80,  // 576 × 2.71
        total: 4835.24
      }
    },
    {
      name: '1400 Pieces - Acrylic Fabric with 3D Embroidery', 
      quantity: 1400,
      description: 'Acrylic fabric, Red/White, Large size caps with 3D Embroidery',
      expectedTier: 'Tier 1',
      expectedBlankCapPrice: 3.55,  // From CSV: Tier 1, price1152 
      expectedAcrylicPrice: 1.75,   // From CSV: Acrylic, price1152
      expectedEmbroideryPrice: 1.00, // From CSV: 3D Embroidery Small Direct, price1152
      expectedDeliveryPrice: 2.64,   // From CSV: Regular Delivery, price1152
      expectedTotals: {
        caps: 4970.00,      // 1400 × 3.55
        fabric: 2450.00,    // 1400 × 1.75
        embroidery: 1400.00, // 1400 × 1.00
        delivery: 3696.00,  // 1400 × 2.64
        total: 12516.00
      }
    },
    {
      name: '3200 Pieces - Acrylic Fabric with 3D Embroidery',
      quantity: 3200, 
      description: 'Acrylic fabric, Red/White, Large size caps with 3D Embroidery',
      expectedTier: 'Tier 1',
      expectedBlankCapPrice: 3.45,  // From CSV: Tier 1, price2880
      expectedAcrylicPrice: 1.63,   // From CSV: Acrylic, price2880  
      expectedEmbroideryPrice: 0.88, // From CSV: 3D Embroidery Small Direct, price2880
      expectedDeliveryPrice: 2.57,   // From CSV: Regular Delivery, price2880
      expectedTotals: {
        caps: 11040.00,     // 3200 × 3.45
        fabric: 5216.00,    // 3200 × 1.63
        embroidery: 2816.00, // 3200 × 0.88
        delivery: 8224.00,  // 3200 × 2.57
        total: 27296.00
      }
    }
  ];

  let allTestsPassed = true;

  for (const scenario of testScenarios) {
    console.log(`\n🧪 Testing: ${scenario.name}`);
    console.log(`   Quantity: ${scenario.quantity}`);
    console.log(`   Description: "${scenario.description}"`);
    
    try {
      // Test tier detection
      const detectedTier = await findProductTierFromDescription(scenario.description);
      console.log(`   ✅ Tier Detection: ${detectedTier} (expected: ${scenario.expectedTier})`);
      
      if (detectedTier !== scenario.expectedTier) {
        console.log(`   ❌ TIER MISMATCH! Got ${detectedTier}, expected ${scenario.expectedTier}`);
        allTestsPassed = false;
      }
      
      // Test blank cap pricing
      const blankCapPrice = await getAIBlankCapPrice(detectedTier, scenario.quantity, scenario.description);
      console.log(`   💰 Blank Cap Price: $${blankCapPrice} (expected: $${scenario.expectedBlankCapPrice})`);
      
      if (Math.abs(blankCapPrice - scenario.expectedBlankCapPrice) > 0.01) {
        console.log(`   ❌ BLANK CAP PRICE MISMATCH! Got $${blankCapPrice}, expected $${scenario.expectedBlankCapPrice}`);
        allTestsPassed = false;
      }
      
      // Test fabric pricing
      const fabricPrice = await getAIFabricPrice('Acrylic', scenario.quantity);
      console.log(`   🧵 Acrylic Fabric Price: $${fabricPrice} (expected: $${scenario.expectedAcrylicPrice})`);
      
      if (Math.abs(fabricPrice - scenario.expectedAcrylicPrice) > 0.01) {
        console.log(`   ❌ FABRIC PRICE MISMATCH! Got $${fabricPrice}, expected $${scenario.expectedAcrylicPrice}`);
        allTestsPassed = false;
      }
      
      // Test logo pricing (3D Embroidery Small Direct)
      const logoResult = await getAILogoPrice('3D Embroidery', 'Small', 'Direct', scenario.quantity);
      console.log(`   🎨 3D Embroidery Price: $${logoResult.unitPrice} (expected: $${scenario.expectedEmbroideryPrice})`);
      
      if (Math.abs(logoResult.unitPrice - scenario.expectedEmbroideryPrice) > 0.01) {
        console.log(`   ❌ LOGO PRICE MISMATCH! Got $${logoResult.unitPrice}, expected $${scenario.expectedEmbroideryPrice}`);
        allTestsPassed = false;
      }
      
      // Test delivery pricing
      const deliveryPrice = await getAIDeliveryPrice('Regular Delivery', scenario.quantity);
      console.log(`   🚚 Regular Delivery Price: $${deliveryPrice} (expected: $${scenario.expectedDeliveryPrice})`);
      
      if (Math.abs(deliveryPrice - scenario.expectedDeliveryPrice) > 0.01) {
        console.log(`   ❌ DELIVERY PRICE MISMATCH! Got $${deliveryPrice}, expected $${scenario.expectedDeliveryPrice}`);
        allTestsPassed = false;
      }
      
      // Calculate totals
      const actualTotals = {
        caps: scenario.quantity * blankCapPrice,
        fabric: scenario.quantity * fabricPrice,
        embroidery: scenario.quantity * logoResult.unitPrice,
        delivery: scenario.quantity * deliveryPrice,
        total: 0
      };
      actualTotals.total = actualTotals.caps + actualTotals.fabric + actualTotals.embroidery + actualTotals.delivery;
      
      console.log(`\n   📊 TOTALS COMPARISON:`);
      console.log(`   Caps:       $${actualTotals.caps.toFixed(2)} (expected: $${scenario.expectedTotals.caps})`);
      console.log(`   Fabric:     $${actualTotals.fabric.toFixed(2)} (expected: $${scenario.expectedTotals.fabric})`);
      console.log(`   Embroidery: $${actualTotals.embroidery.toFixed(2)} (expected: $${scenario.expectedTotals.embroidery})`);
      console.log(`   Delivery:   $${actualTotals.delivery.toFixed(2)} (expected: $${scenario.expectedTotals.delivery})`);
      console.log(`   TOTAL:      $${actualTotals.total.toFixed(2)} (expected: $${scenario.expectedTotals.total})`);
      
      // Validate totals
      const tolerance = 0.10; // Allow $0.10 tolerance for rounding
      if (Math.abs(actualTotals.total - scenario.expectedTotals.total) > tolerance) {
        console.log(`   ❌ TOTAL MISMATCH! Difference: $${(actualTotals.total - scenario.expectedTotals.total).toFixed(2)}`);
        allTestsPassed = false;
      } else {
        console.log(`   ✅ Total matches expected value!`);
      }
      
    } catch (error) {
      console.log(`   ❌ ERROR testing scenario: ${error.message}`);
      allTestsPassed = false;
    }
  }

  console.log('\n' + '='.repeat(80));
  if (allTestsPassed) {
    console.log('🎉 ALL CRITICAL PRICING TESTS PASSED! The system is working correctly.');
  } else {
    console.log('🚨 CRITICAL PRICING TESTS FAILED! Issues found that must be fixed.');
  }
  console.log('='.repeat(80));
  
  return allTestsPassed;
}

// Run the validation
validateCriticalPricingScenarios()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Failed to run validation:', error);
    process.exit(1);
  });