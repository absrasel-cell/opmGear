/**
 * COMPREHENSIVE BACKEND PRICING TEST
 * Tests the exact user prompt with 4 different quantities to identify critical failures
 */

const { 
  getAIBlankCapPrice, 
  getAIFabricPrice,
  getAILogoPrice,
  getAIClosurePrice,
  getAIAccessoryPrice,
  getAIDeliveryPrice,
  findProductTierFromDescription
} = require('./src/lib/ai-pricing-service.ts');

const TEST_PROMPT = "i need 7-Panel Cap, Polyester/Laser Cut Fabric, Black/Grey, Size: 59 cm, Slight Curved. Leather Patch Front, 3D Embroidery on Left, Flat Embroidery on Right, Rubber patch on back. Closure Fitted. Hang Tag, Sticker.";

const TEST_QUANTITIES = [
  { qty: 48, expectedTier: 'price48' },
  { qty: 144, expectedTier: 'price144' },
  { qty: 600, expectedTier: 'price576' },
  { qty: 3000, expectedTier: 'price2880' }
];

// Expected pricing based on CSV data
const EXPECTED_PRICING = {
  // From Tier 3 (7-Panel): 6, 4.25, 4, 3.68, 3.6, 3.53
  baseCap: {
    48: 6.00,    // Tier 3, price48
    144: 4.25,   // Tier 3, price144  
    600: 4.00,   // Tier 3, price576
    3000: 3.60   // Tier 3, price2880
  },
  // Polyester = FREE (0.00), Laser Cut = tier pricing
  fabricPolyester: { 48: 0.00, 144: 0.00, 600: 0.00, 3000: 0.00 },
  // From Fabric.csv - Laser Cut pricing tiers (CORRECTED based on actual CSV)
  fabricLaserCut: { 48: 1.25, 144: 1.00, 600: 0.88, 3000: 0.70 },
  // Combined fabric total = Polyester + Laser Cut
  fabricTotal: { 48: 1.25, 144: 1.00, 600: 0.88, 3000: 0.70 },
  // From Closure.csv - Fitted pricing: 1.25, 1, 0.75, 0.63, 0.5
  closureFitted: { 48: 1.25, 144: 1.00, 600: 0.75, 3000: 0.50 },
  // From Logo.csv - Leather Large Patch pricing (CORRECTED based on actual CSV)
  leatherPatchLarge: { 48: 4.13, 144: 2.88, 600: 2.63, 3000: 2.25 },
  embroidery3DSmall: { 48: 2.25, 144: 1.50, 600: 1.18, 3000: 0.88 },
  embroideryFlatSmall: { 48: 1.75, 144: 1.13, 600: 0.88, 3000: 0.63 },
  rubberPatchSmall: { 48: 3.25, 144: 2.38, 600: 2.13, 3000: 1.75 },
  // From Accessories.csv - CORRECTED based on actual CSV
  hangTag: { 48: 1.25, 144: 0.88, 600: 0.75, 3000: 0.63 },
  sticker: { 48: 0.75, 144: 0.63, 600: 0.50, 3000: 0.38 },
  // From Delivery.csv - Regular Delivery (CORRECTED based on actual CSV)
  delivery: { 48: 4.29, 144: 3.29, 600: 2.71, 3000: 2.57 }
};

async function runComprehensiveTest() {
  console.log('🚨 COMPREHENSIVE BACKEND PRICING TEST');
  console.log('=' .repeat(80));
  console.log(`Testing prompt: "${TEST_PROMPT}"`);
  console.log('=' .repeat(80));

  let totalFailures = 0;
  const results = [];

  for (const { qty, expectedTier } of TEST_QUANTITIES) {
    console.log(`\n🧪 TESTING QUANTITY: ${qty} pieces (should use ${expectedTier} tier)`);
    console.log('-'.repeat(60));
    
    const testResult = {
      quantity: qty,
      expectedTier,
      failures: [],
      calculations: {}
    };

    try {
      // 1. Test product tier detection
      const detectedTier = await findProductTierFromDescription(TEST_PROMPT);
      testResult.calculations.detectedTier = detectedTier;
      console.log(`🎯 Product Tier: ${detectedTier} (expected: Tier 3 for 7-Panel)`);
      
      if (detectedTier !== 'Tier 3') {
        testResult.failures.push(`TIER MISMATCH: Got ${detectedTier}, expected Tier 3`);
        totalFailures++;
      }

      // 2. Test base cap pricing
      const blankCapPrice = await getAIBlankCapPrice(detectedTier, qty, TEST_PROMPT);
      testResult.calculations.blankCapPrice = blankCapPrice;
      const expectedBlankCap = EXPECTED_PRICING.baseCap[qty];
      console.log(`🧢 Base Cap: $${blankCapPrice} (expected: $${expectedBlankCap})`);
      
      if (Math.abs(blankCapPrice - expectedBlankCap) > 0.01) {
        testResult.failures.push(`BASE CAP: Got $${blankCapPrice}, expected $${expectedBlankCap}`);
        totalFailures++;
      }

      // 3. Test fabric pricing (dual fabric: Polyester/Laser Cut)
      const fabricPrice = await getAIFabricPrice('Polyester/Laser Cut', qty);
      testResult.calculations.fabricPrice = fabricPrice;
      const expectedFabric = EXPECTED_PRICING.fabricTotal[qty];
      console.log(`🧵 Fabric (Polyester/Laser Cut): $${fabricPrice} (expected: $${expectedFabric})`);
      
      if (Math.abs(fabricPrice - expectedFabric) > 0.01) {
        testResult.failures.push(`FABRIC: Got $${fabricPrice}, expected $${expectedFabric}`);
        totalFailures++;
      }

      // 4. Test closure pricing (Fitted)
      const closurePrice = await getAIClosurePrice('Fitted', qty);
      testResult.calculations.closurePrice = closurePrice;
      const expectedClosure = EXPECTED_PRICING.closureFitted[qty];
      console.log(`🔒 Closure (Fitted): $${closurePrice} (expected: $${expectedClosure})`);
      
      if (Math.abs(closurePrice - expectedClosure) > 0.01) {
        testResult.failures.push(`CLOSURE: Got $${closurePrice}, expected $${expectedClosure}`);
        totalFailures++;
      }

      // 5. Test logo pricing
      const leatherPatchResult = await getAILogoPrice('Leather', 'Large', 'Patch', qty);
      const embroidery3DResult = await getAILogoPrice('3D Embroidery', 'Small', 'Direct', qty);
      const embroideryFlatResult = await getAILogoPrice('Flat Embroidery', 'Small', 'Direct', qty);
      const rubberPatchResult = await getAILogoPrice('Rubber', 'Small', 'Patch', qty);
      
      testResult.calculations.logos = {
        leatherPatch: leatherPatchResult.unitPrice,
        embroidery3D: embroidery3DResult.unitPrice,
        embroideryFlat: embroideryFlatResult.unitPrice,
        rubberPatch: rubberPatchResult.unitPrice
      };
      
      console.log(`🎨 Leather Patch Large: $${leatherPatchResult.unitPrice} (expected: $${EXPECTED_PRICING.leatherPatchLarge[qty]})`);
      console.log(`🎨 3D Embroidery Small: $${embroidery3DResult.unitPrice} (expected: $${EXPECTED_PRICING.embroidery3DSmall[qty]})`);
      console.log(`🎨 Flat Embroidery Small: $${embroideryFlatResult.unitPrice} (expected: $${EXPECTED_PRICING.embroideryFlatSmall[qty]})`);
      console.log(`🎨 Rubber Patch Small: $${rubberPatchResult.unitPrice} (expected: $${EXPECTED_PRICING.rubberPatchSmall[qty]})`);

      // Validate logo pricing
      if (Math.abs(leatherPatchResult.unitPrice - EXPECTED_PRICING.leatherPatchLarge[qty]) > 0.01) {
        testResult.failures.push(`LEATHER PATCH: Got $${leatherPatchResult.unitPrice}, expected $${EXPECTED_PRICING.leatherPatchLarge[qty]}`);
        totalFailures++;
      }
      if (Math.abs(embroidery3DResult.unitPrice - EXPECTED_PRICING.embroidery3DSmall[qty]) > 0.01) {
        testResult.failures.push(`3D EMBROIDERY: Got $${embroidery3DResult.unitPrice}, expected $${EXPECTED_PRICING.embroidery3DSmall[qty]}`);
        totalFailures++;
      }
      if (Math.abs(embroideryFlatResult.unitPrice - EXPECTED_PRICING.embroideryFlatSmall[qty]) > 0.01) {
        testResult.failures.push(`FLAT EMBROIDERY: Got $${embroideryFlatResult.unitPrice}, expected $${EXPECTED_PRICING.embroideryFlatSmall[qty]}`);
        totalFailures++;
      }
      if (Math.abs(rubberPatchResult.unitPrice - EXPECTED_PRICING.rubberPatchSmall[qty]) > 0.01) {
        testResult.failures.push(`RUBBER PATCH: Got $${rubberPatchResult.unitPrice}, expected $${EXPECTED_PRICING.rubberPatchSmall[qty]}`);
        totalFailures++;
      }

      // 6. Test accessories
      const hangTagPrice = await getAIAccessoryPrice('Hang Tag', qty);
      const stickerPrice = await getAIAccessoryPrice('Sticker', qty);
      
      testResult.calculations.accessories = {
        hangTag: hangTagPrice,
        sticker: stickerPrice
      };
      
      console.log(`🎁 Hang Tag: $${hangTagPrice} (expected: $${EXPECTED_PRICING.hangTag[qty]})`);
      console.log(`🎁 Sticker: $${stickerPrice} (expected: $${EXPECTED_PRICING.sticker[qty]})`);
      
      if (Math.abs(hangTagPrice - EXPECTED_PRICING.hangTag[qty]) > 0.01) {
        testResult.failures.push(`HANG TAG: Got $${hangTagPrice}, expected $${EXPECTED_PRICING.hangTag[qty]}`);
        totalFailures++;
      }
      if (Math.abs(stickerPrice - EXPECTED_PRICING.sticker[qty]) > 0.01) {
        testResult.failures.push(`STICKER: Got $${stickerPrice}, expected $${EXPECTED_PRICING.sticker[qty]}`);
        totalFailures++;
      }

      // 7. Test delivery
      const deliveryPrice = await getAIDeliveryPrice('Regular Delivery', qty);
      testResult.calculations.deliveryPrice = deliveryPrice;
      const expectedDelivery = EXPECTED_PRICING.delivery[qty];
      console.log(`🚚 Delivery: $${deliveryPrice} (expected: $${expectedDelivery})`);
      
      if (Math.abs(deliveryPrice - expectedDelivery) > 0.01) {
        testResult.failures.push(`DELIVERY: Got $${deliveryPrice}, expected $${expectedDelivery}`);
        totalFailures++;
      }

      // Calculate total
      const calculatedTotal = 
        (blankCapPrice * qty) +
        (fabricPrice * qty) + 
        (closurePrice * qty) +
        (leatherPatchResult.unitPrice * qty) + leatherPatchResult.moldCharge +
        (embroidery3DResult.unitPrice * qty) + embroidery3DResult.moldCharge +
        (embroideryFlatResult.unitPrice * qty) + embroideryFlatResult.moldCharge +
        (rubberPatchResult.unitPrice * qty) + rubberPatchResult.moldCharge +
        (hangTagPrice * qty) +
        (stickerPrice * qty) +
        (deliveryPrice * qty);

      testResult.calculations.total = calculatedTotal;
      testResult.calculations.totalPerUnit = calculatedTotal / qty;

      console.log(`💰 CALCULATED TOTAL: $${calculatedTotal.toFixed(2)} ($${(calculatedTotal/qty).toFixed(2)} per unit)`);

      // Test result summary
      if (testResult.failures.length === 0) {
        console.log(`✅ QUANTITY ${qty}: ALL TESTS PASSED`);
      } else {
        console.log(`❌ QUANTITY ${qty}: ${testResult.failures.length} FAILURES`);
        testResult.failures.forEach(failure => console.log(`   ${failure}`));
      }

    } catch (error) {
      console.error(`💥 ERROR testing quantity ${qty}:`, error.message);
      testResult.failures.push(`SYSTEM ERROR: ${error.message}`);
      totalFailures++;
    }

    results.push(testResult);
  }

  // Final summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 COMPREHENSIVE TEST RESULTS');
  console.log('='.repeat(80));
  
  if (totalFailures === 0) {
    console.log('🎉 ALL TESTS PASSED! The backend pricing system is working correctly.');
  } else {
    console.log(`🚨 ${totalFailures} CRITICAL FAILURES DETECTED`);
    console.log('\n🔧 FAILURES BY COMPONENT:');
    
    const failuresByComponent = {};
    results.forEach(result => {
      result.failures.forEach(failure => {
        const component = failure.split(':')[0];
        if (!failuresByComponent[component]) {
          failuresByComponent[component] = [];
        }
        failuresByComponent[component].push(`${result.quantity}: ${failure}`);
      });
    });
    
    Object.entries(failuresByComponent).forEach(([component, failures]) => {
      console.log(`\n${component}:`);
      failures.forEach(failure => console.log(`  - ${failure}`));
    });
  }
  
  console.log('='.repeat(80));
  return { totalFailures, results };
}

// Run the test
if (require.main === module) {
  runComprehensiveTest()
    .then(({ totalFailures }) => {
      process.exit(totalFailures > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('💥 TEST FRAMEWORK ERROR:', error);
      process.exit(1);
    });
}

module.exports = { runComprehensiveTest, TEST_PROMPT, TEST_QUANTITIES, EXPECTED_PRICING };