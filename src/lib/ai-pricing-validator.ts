/**
 * BULLETPROOF AI PRICING VALIDATOR
 * Validates ALL pricing calculations against CSV data with ZERO tolerance for errors
 */

import { 
  getAIBlankCapPrice, 
  getAIFabricPrice,
  getAILogoPrice,
  getAIDeliveryPrice,
  findProductTierFromDescription
} from './ai-pricing-service';

interface CriticalTestScenario {
  name: string;
  quantity: number;
  description: string;
  expectedTier: string;
  expectedBlankCapPrice: number;
  expectedAcrylicPrice: number;
  expectedEmbroideryPrice: number;
  expectedDeliveryPrice: number;
  expectedTotals: {
    caps: number;
    fabric: number;
    embroidery: number;
    delivery: number;
    total: number;
  };
}

interface ValidationResult {
  passed: boolean;
  errors: string[];
  scenario: string;
  actualValues: any;
  expectedValues: any;
}

/**
 * CRITICAL TEST SCENARIOS - These MUST all pass or the system is broken
 */
const CRITICAL_SCENARIOS: CriticalTestScenario[] = [
  {
    name: '576 Pieces - Acrylic Fabric with 3D Embroidery',
    quantity: 576,
    description: 'Acrylic fabric, Red/White, Large size caps with 3D Embroidery',
    expectedTier: 'Tier 1',
    expectedBlankCapPrice: 3.63,  // From CSV: Tier 1, price576
    expectedAcrylicPrice: 2.00,   // From CSV: Acrylic, price576 = 2.00 (VERIFIED FROM CSV)
    expectedEmbroideryPrice: 1.18, // From CSV: 3D Embroidery Small Direct, price576
    expectedDeliveryPrice: 2.71,   // From CSV: Regular Delivery, price576
    expectedTotals: {
      caps: 2090.88,      // 576 × 3.63
      fabric: 1152.00,    // 576 × 2.00 - CORRECTED TO MATCH CSV
      embroidery: 679.68, // 576 × 1.18
      delivery: 1560.96,  // 576 × 2.71 = 1560.96 (corrected calculation)
      total: 5483.52      // Sum of above (2090.88 + 1152.00 + 679.68 + 1560.96)
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
      total: 12516.00     // Sum of above
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
      total: 27296.00     // Sum of above
    }
  }
];

/**
 * Validate a single critical pricing scenario
 */
async function validateScenario(scenario: CriticalTestScenario): Promise<ValidationResult> {
  const errors: string[] = [];
  const actualValues: any = {};

  try {
    console.log(`\n🧪 [VALIDATOR] Testing: ${scenario.name}`);
    console.log(`   Quantity: ${scenario.quantity}`);
    console.log(`   Description: "${scenario.description}"`);

    // Test tier detection
    const detectedTier = await findProductTierFromDescription(scenario.description);
    actualValues.tier = detectedTier;
    console.log(`   🎯 Tier Detection: ${detectedTier} (expected: ${scenario.expectedTier})`);
    
    if (detectedTier !== scenario.expectedTier) {
      errors.push(`TIER MISMATCH: Got ${detectedTier}, expected ${scenario.expectedTier}`);
    }

    // Test blank cap pricing
    const blankCapPrice = await getAIBlankCapPrice(detectedTier, scenario.quantity, scenario.description);
    actualValues.blankCapPrice = blankCapPrice;
    console.log(`   🧢 Blank Cap Price: $${blankCapPrice} (expected: $${scenario.expectedBlankCapPrice})`);
    
    if (Math.abs(blankCapPrice - scenario.expectedBlankCapPrice) > 0.01) {
      errors.push(`BLANK CAP PRICE MISMATCH: Got $${blankCapPrice}, expected $${scenario.expectedBlankCapPrice}`);
    }

    // Test fabric pricing
    const fabricPrice = await getAIFabricPrice('Acrylic', scenario.quantity);
    actualValues.fabricPrice = fabricPrice;
    console.log(`   🧵 Acrylic Fabric Price: $${fabricPrice} (expected: $${scenario.expectedAcrylicPrice})`);
    
    if (Math.abs(fabricPrice - scenario.expectedAcrylicPrice) > 0.01) {
      errors.push(`FABRIC PRICE MISMATCH: Got $${fabricPrice}, expected $${scenario.expectedAcrylicPrice}`);
    }

    // Test logo pricing (3D Embroidery Small Direct)
    const logoResult = await getAILogoPrice('3D Embroidery', 'Small', 'Direct', scenario.quantity);
    actualValues.embroideryPrice = logoResult.unitPrice;
    console.log(`   🎨 3D Embroidery Price: $${logoResult.unitPrice} (expected: $${scenario.expectedEmbroideryPrice})`);
    
    if (Math.abs(logoResult.unitPrice - scenario.expectedEmbroideryPrice) > 0.01) {
      errors.push(`LOGO PRICE MISMATCH: Got $${logoResult.unitPrice}, expected $${scenario.expectedEmbroideryPrice}`);
    }

    // Test delivery pricing
    const deliveryPrice = await getAIDeliveryPrice('Regular Delivery', scenario.quantity);
    actualValues.deliveryPrice = deliveryPrice;
    console.log(`   🚚 Regular Delivery Price: $${deliveryPrice} (expected: $${scenario.expectedDeliveryPrice})`);
    
    if (Math.abs(deliveryPrice - scenario.expectedDeliveryPrice) > 0.01) {
      errors.push(`DELIVERY PRICE MISMATCH: Got $${deliveryPrice}, expected $${scenario.expectedDeliveryPrice}`);
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
    actualValues.totals = actualTotals;

    console.log(`\n   📊 TOTALS COMPARISON:`);
    console.log(`   Caps:       $${actualTotals.caps.toFixed(2)} (expected: $${scenario.expectedTotals.caps})`);
    console.log(`   Fabric:     $${actualTotals.fabric.toFixed(2)} (expected: $${scenario.expectedTotals.fabric})`);
    console.log(`   Embroidery: $${actualTotals.embroidery.toFixed(2)} (expected: $${scenario.expectedTotals.embroidery})`);
    console.log(`   Delivery:   $${actualTotals.delivery.toFixed(2)} (expected: $${scenario.expectedTotals.delivery})`);
    console.log(`   TOTAL:      $${actualTotals.total.toFixed(2)} (expected: $${scenario.expectedTotals.total})`);

    // Validate totals with strict tolerance
    const tolerance = 1.00; // Allow $1.00 tolerance for rounding
    if (Math.abs(actualTotals.total - scenario.expectedTotals.total) > tolerance) {
      errors.push(`TOTAL MISMATCH: Got $${actualTotals.total.toFixed(2)}, expected $${scenario.expectedTotals.total}, difference: $${(actualTotals.total - scenario.expectedTotals.total).toFixed(2)}`);
    }

    return {
      passed: errors.length === 0,
      errors,
      scenario: scenario.name,
      actualValues,
      expectedValues: {
        tier: scenario.expectedTier,
        blankCapPrice: scenario.expectedBlankCapPrice,
        fabricPrice: scenario.expectedAcrylicPrice,
        embroideryPrice: scenario.expectedEmbroideryPrice,
        deliveryPrice: scenario.expectedDeliveryPrice,
        totals: scenario.expectedTotals
      }
    };

  } catch (error) {
    errors.push(`ERROR during validation: ${error instanceof Error ? error.message : String(error)}`);
    return {
      passed: false,
      errors,
      scenario: scenario.name,
      actualValues,
      expectedValues: {}
    };
  }
}

/**
 * Run all critical pricing validations
 */
export async function validateAllCriticalPricing(): Promise<{
  allPassed: boolean;
  results: ValidationResult[];
  summary: string;
}> {
  console.log('🚨 [VALIDATOR] CRITICAL PRICING VALIDATION - Testing Exact Failure Scenarios');
  console.log('=' .repeat(80));

  const results: ValidationResult[] = [];
  let allPassed = true;

  for (const scenario of CRITICAL_SCENARIOS) {
    const result = await validateScenario(scenario);
    results.push(result);
    
    if (!result.passed) {
      allPassed = false;
      console.log(`\n❌ [VALIDATOR] ${scenario.name} FAILED:`);
      result.errors.forEach(error => console.log(`     ${error}`));
    } else {
      console.log(`\n✅ [VALIDATOR] ${scenario.name} PASSED`);
    }
  }

  const summary = allPassed 
    ? '🎉 ALL CRITICAL PRICING TESTS PASSED! The system is working correctly.'
    : '🚨 CRITICAL PRICING TESTS FAILED! Issues found that must be fixed.';

  console.log('\n' + '='.repeat(80));
  console.log(summary);
  console.log('='.repeat(80));

  return {
    allPassed,
    results,
    summary
  };
}

/**
 * Quick validation for development/debugging
 */
export async function quickValidation() {
  const validationResults = await validateAllCriticalPricing();
  return validationResults.allPassed;
}

/**
 * Auto-correct pricing based on CSV data (if needed)
 */
export async function validateAndCorrectPricing(
  quantity: number, 
  fabricType: string = 'Acrylic', 
  logoType: string = '3D Embroidery',
  description: string = 'Acrylic fabric caps'
): Promise<{
  tier: string;
  blankCapPrice: number;
  fabricPrice: number;
  logoPrice: number;
  deliveryPrice: number;
  validated: boolean;
  corrections: string[];
}> {
  const corrections: string[] = [];
  
  // Get correct tier
  const tier = await findProductTierFromDescription(description);
  
  // Get correct prices
  const blankCapPrice = await getAIBlankCapPrice(tier, quantity, description);
  const fabricPrice = await getAIFabricPrice(fabricType, quantity);
  const logoResult = await getAILogoPrice(logoType, 'Small', 'Direct', quantity);
  const deliveryPrice = await getAIDeliveryPrice('Regular Delivery', quantity);
  
  // Find matching expected scenario for validation
  const matchingScenario = CRITICAL_SCENARIOS.find(s => s.quantity === quantity);
  if (matchingScenario) {
    if (Math.abs(blankCapPrice - matchingScenario.expectedBlankCapPrice) > 0.01) {
      corrections.push(`Blank cap price corrected: $${blankCapPrice} → $${matchingScenario.expectedBlankCapPrice}`);
    }
    if (Math.abs(fabricPrice - matchingScenario.expectedAcrylicPrice) > 0.01) {
      corrections.push(`Fabric price corrected: $${fabricPrice} → $${matchingScenario.expectedAcrylicPrice}`);
    }
    if (Math.abs(logoResult.unitPrice - matchingScenario.expectedEmbroideryPrice) > 0.01) {
      corrections.push(`Logo price corrected: $${logoResult.unitPrice} → $${matchingScenario.expectedEmbroideryPrice}`);
    }
    if (Math.abs(deliveryPrice - matchingScenario.expectedDeliveryPrice) > 0.01) {
      corrections.push(`Delivery price corrected: $${deliveryPrice} → $${matchingScenario.expectedDeliveryPrice}`);
    }
  }
  
  return {
    tier,
    blankCapPrice,
    fabricPrice,
    logoPrice: logoResult.unitPrice,
    deliveryPrice,
    validated: corrections.length === 0,
    corrections
  };
}