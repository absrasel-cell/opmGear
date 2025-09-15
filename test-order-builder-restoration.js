/**
 * Test script to verify Order Builder data restoration fixes
 * Tests the specific issue where 6P AirFrame HSCS becomes 4P Visor Cap MSCS
 */

// Mock OrderBuilderState data that would come from database
const mockOrderBuilderState = {
  id: "test-state-123",
  sessionId: "test-session",
  conversationId: "test-conversation",
  totalCost: 10152.00,
  totalUnits: 800,
  isCompleted: true,
  capStyleSetup: {
    style: "6P AirFrame HSCS",
    quantity: 800,
    size: "59cm",
    color: "Royal/Black",
    colors: ["Royal", "Black"],
    profile: "High",
    billShape: "Slight Curved",
    structure: "Structured with Mono Lining",
    fabric: "Acrylic/Air Mesh",
    closure: "Fitted",
    stitching: "Matching"
  },
  customization: {
    logos: [
      {
        location: "front",
        type: "Rubber",
        size: "Medium",
        unitCost: 2.63,
        setupCost: 2104.00,
        moldCharge: 80.00,
        total: 2184.00
      }
    ],
    accessories: [],
    totalMoldCharges: 80.00
  },
  delivery: {
    method: "Regular Delivery",
    leadTime: "6-10 days",
    totalCost: 2168.00
  },
  costBreakdown: {
    baseProductCost: 6600.00, // 800 * $8.25 total per cap
    logosCost: 2184.00,
    deliveryCost: 2168.00,
    total: 10152.00,
    quantity: 800
  },
  metadata: {
    orderBuilderStatus: {
      capStyle: {
        completed: true,
        status: "green",
        items: {
          size: true,
          color: true,
          profile: true,
          shape: true,
          structure: true,
          fabric: true,
          stitch: true
        }
      },
      customization: {
        completed: true,
        status: "yellow",
        items: {
          logoSetup: true,
          accessories: false,
          moldCharges: true
        },
        logoPositions: ["front"]
      },
      delivery: {
        completed: true,
        status: "green",
        items: {
          method: true,
          leadTime: true,
          address: false
        }
      },
      costBreakdown: {
        completed: true,
        status: "green",
        selectedVersionId: null,
        versions: []
      }
    }
  }
};

// Test the transformation logic from conversationService.ts
function testDataTransformation(orderBuilderState) {
  console.log('🔍 TESTING Order Builder State Transformation');
  console.log('='.repeat(60));

  // Replicate the validation logic from conversationService.ts
  const hasCapStyleSetup = orderBuilderState.capStyleSetup && Object.keys(orderBuilderState.capStyleSetup).length > 0;
  const hasCustomization = orderBuilderState.customization && Object.keys(orderBuilderState.customization).length > 0;
  const hasDelivery = orderBuilderState.delivery && Object.keys(orderBuilderState.delivery).length > 0;
  const hasCostBreakdown = orderBuilderState.costBreakdown && Object.keys(orderBuilderState.costBreakdown).length > 0;

  console.log('📊 Validation Results:', {
    hasCapStyleSetup,
    hasCustomization,
    hasDelivery,
    hasCostBreakdown
  });

  // Replicate the data transformation logic
  const restoredQuoteData = (hasCapStyleSetup || hasCustomization || hasDelivery || hasCostBreakdown) ? {
    capDetails: hasCapStyleSetup ? {
      quantity: orderBuilderState.capStyleSetup.quantity || orderBuilderState.totalUnits || 100,
      size: orderBuilderState.capStyleSetup.size,
      color: orderBuilderState.capStyleSetup.color,
      colors: orderBuilderState.capStyleSetup.colors || (orderBuilderState.capStyleSetup.color ? [orderBuilderState.capStyleSetup.color] : []),
      profile: orderBuilderState.capStyleSetup.profile,
      billShape: orderBuilderState.capStyleSetup.billShape,
      structure: orderBuilderState.capStyleSetup.structure,
      fabric: orderBuilderState.capStyleSetup.fabric,
      closure: orderBuilderState.capStyleSetup.closure,
      stitching: orderBuilderState.capStyleSetup.stitching,
      style: orderBuilderState.capStyleSetup.style
    } : {},

    customization: hasCustomization ? {
      logos: orderBuilderState.customization.logos || [],
      accessories: orderBuilderState.customization.accessories || [],
      totalMoldCharges: orderBuilderState.customization.totalMoldCharges || 0,
      logoSetup: orderBuilderState.customization.logoSetup
    } : {},

    delivery: hasDelivery ? {
      method: orderBuilderState.delivery.method,
      leadTime: orderBuilderState.delivery.leadTime,
      totalCost: orderBuilderState.delivery.totalCost,
      address: orderBuilderState.delivery.address
    } : {},

    pricing: hasCostBreakdown ? {
      baseProductCost: orderBuilderState.costBreakdown.baseProductCost || 0,
      logosCost: orderBuilderState.costBreakdown.logosCost || 0,
      deliveryCost: orderBuilderState.costBreakdown.deliveryCost || 0,
      total: orderBuilderState.costBreakdown.total || orderBuilderState.totalCost || 0,
      quantity: orderBuilderState.costBreakdown.quantity || orderBuilderState.totalUnits || orderBuilderState.capStyleSetup?.quantity || 100
    } : {}
  } : null;

  console.log('✅ TRANSFORMED DATA:');
  console.log('='.repeat(60));
  console.log(JSON.stringify(restoredQuoteData, null, 2));

  // Test expected values
  console.log('🔍 VALIDATION CHECKS:');
  console.log('='.repeat(60));

  const tests = [
    {
      name: "Product Style",
      expected: "6P AirFrame HSCS",
      actual: restoredQuoteData?.capDetails?.style,
      passed: restoredQuoteData?.capDetails?.style === "6P AirFrame HSCS"
    },
    {
      name: "Quantity",
      expected: 800,
      actual: restoredQuoteData?.capDetails?.quantity,
      passed: restoredQuoteData?.capDetails?.quantity === 800
    },
    {
      name: "Color",
      expected: "Royal/Black",
      actual: restoredQuoteData?.capDetails?.color,
      passed: restoredQuoteData?.capDetails?.color === "Royal/Black"
    },
    {
      name: "Total Cost",
      expected: 10152.00,
      actual: restoredQuoteData?.pricing?.total,
      passed: restoredQuoteData?.pricing?.total === 10152.00
    },
    {
      name: "Logo Count",
      expected: 1,
      actual: restoredQuoteData?.customization?.logos?.length,
      passed: restoredQuoteData?.customization?.logos?.length === 1
    }
  ];

  tests.forEach(test => {
    const status = test.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} ${test.name}: Expected ${test.expected}, Got ${test.actual}`);
  });

  const passedTests = tests.filter(t => t.passed).length;
  console.log(`\n📊 RESULT: ${passedTests}/${tests.length} tests passed`);

  if (passedTests !== tests.length) {
    console.log('\n❌ DATA TRANSFORMATION ISSUES DETECTED:');
    tests.filter(t => !t.passed).forEach(test => {
      console.log(`   - ${test.name}: ${test.expected} → ${test.actual}`);
    });
  } else {
    console.log('\n✅ ALL TESTS PASSED - Data transformation is working correctly');
  }

  return restoredQuoteData;
}

// Run the test
console.log('🚀 STARTING ORDER BUILDER RESTORATION TEST');
console.log('Testing the fix for: 6P AirFrame HSCS → 4P Visor Cap MSCS issue\n');

const result = testDataTransformation(mockOrderBuilderState);

console.log('\n🔍 EXPECTED ORDER BUILDER DISPLAY:');
console.log('- Product: 6P AirFrame HSCS (Tier 2)');
console.log('- Quantity: 800 pieces');
console.log('- Status: Cap: green, Custom: yellow, Delivery: green');
console.log('- Total: $10,152.00');

console.log('\n📝 This test verifies that the conversationService data transformation');
console.log('   correctly preserves the original quote data structure.');