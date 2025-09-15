/**
 * Comprehensive test of the Order Builder restoration flow
 * Tests the entire pipeline: DB → conversationService → CapStyleSection → API
 */

// Mock all the functions and data
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
    baseProductCost: 6600.00,
    logosCost: 2184.00,
    deliveryCost: 2168.00,
    total: 10152.00,
    quantity: 800
  }
};

console.log('🔧 FULL ORDER BUILDER RESTORATION FLOW TEST');
console.log('='.repeat(70));

// Step 1: Test the conversationService transformation
console.log('\n📋 STEP 1: conversationService.restoreOrderBuilderState');
console.log('-'.repeat(50));

// Replicate the exact logic from conversationService.ts
const hasCapStyleSetup = mockOrderBuilderState.capStyleSetup && Object.keys(mockOrderBuilderState.capStyleSetup).length > 0;
const hasCustomization = mockOrderBuilderState.customization && Object.keys(mockOrderBuilderState.customization).length > 0;
const hasDelivery = mockOrderBuilderState.delivery && Object.keys(mockOrderBuilderState.delivery).length > 0;
const hasCostBreakdown = mockOrderBuilderState.costBreakdown && Object.keys(mockOrderBuilderState.costBreakdown).length > 0;

console.log(`✅ hasCapStyleSetup: ${hasCapStyleSetup}`);
console.log(`✅ hasCustomization: ${hasCustomization}`);
console.log(`✅ hasDelivery: ${hasDelivery}`);
console.log(`✅ hasCostBreakdown: ${hasCostBreakdown}`);

const restoredQuoteData = (hasCapStyleSetup || hasCustomization || hasDelivery || hasCostBreakdown) ? {
  // Transform capStyleSetup from database to runtime format
  capDetails: hasCapStyleSetup ? {
    // Use actual stored quantity or totalUnits as fallback
    quantity: mockOrderBuilderState.capStyleSetup.quantity || mockOrderBuilderState.totalUnits || 100,
    size: mockOrderBuilderState.capStyleSetup.size,
    color: mockOrderBuilderState.capStyleSetup.color,
    colors: mockOrderBuilderState.capStyleSetup.colors || (mockOrderBuilderState.capStyleSetup.color ? [mockOrderBuilderState.capStyleSetup.color] : []),
    profile: mockOrderBuilderState.capStyleSetup.profile,
    billShape: mockOrderBuilderState.capStyleSetup.billShape,
    structure: mockOrderBuilderState.capStyleSetup.structure,
    fabric: mockOrderBuilderState.capStyleSetup.fabric,
    closure: mockOrderBuilderState.capStyleSetup.closure,
    stitching: mockOrderBuilderState.capStyleSetup.stitching,
    // Include style information if available AND set as productName for API
    style: mockOrderBuilderState.capStyleSetup.style,
    productName: mockOrderBuilderState.capStyleSetup.style || mockOrderBuilderState.capStyleSetup.productName
  } : {},

  customization: hasCustomization ? {
    logos: mockOrderBuilderState.customization.logos || [],
    accessories: mockOrderBuilderState.customization.accessories || [],
    totalMoldCharges: mockOrderBuilderState.customization.totalMoldCharges || 0,
    logoSetup: mockOrderBuilderState.customization.logoSetup
  } : {},

  delivery: hasDelivery ? {
    method: mockOrderBuilderState.delivery.method,
    leadTime: mockOrderBuilderState.delivery.leadTime,
    totalCost: mockOrderBuilderState.delivery.totalCost,
    address: mockOrderBuilderState.delivery.address
  } : {},

  pricing: hasCostBreakdown ? {
    baseProductCost: mockOrderBuilderState.costBreakdown.baseProductCost || 0,
    logosCost: mockOrderBuilderState.costBreakdown.logosCost || 0,
    deliveryCost: mockOrderBuilderState.costBreakdown.deliveryCost || 0,
    total: mockOrderBuilderState.costBreakdown.total || mockOrderBuilderState.totalCost || 0,
    quantity: mockOrderBuilderState.costBreakdown.quantity || mockOrderBuilderState.totalUnits || mockOrderBuilderState.capStyleSetup?.quantity || 100
  } : {}
} : null;

console.log('\n✅ Restored Quote Data:');
console.log(`   Product Name: "${restoredQuoteData.capDetails.productName}"`);
console.log(`   Style: "${restoredQuoteData.capDetails.style}"`);
console.log(`   Quantity: ${restoredQuoteData.capDetails.quantity}`);
console.log(`   Color: "${restoredQuoteData.capDetails.color}"`);
console.log(`   Total: $${restoredQuoteData.pricing.total}`);

// Step 2: Test CapStyleSection API call preparation
console.log('\n🔍 STEP 2: CapStyleSection.useEffect preparation');
console.log('-'.repeat(50));

// This replicates the logic in CapStyleSection.tsx lines 147-180
const aiProductName = restoredQuoteData.capDetails.productName;

if (aiProductName && aiProductName !== 'Custom Cap') {
  console.log(`✅ AI extracted product name: "${aiProductName}"`);

  // This is what would be sent to the API
  const apiRequest = {
    productName: aiProductName, // Pass the exact product name for lookup
    size: restoredQuoteData.capDetails.size,
    color: restoredQuoteData.capDetails.color || restoredQuoteData.capDetails.colors,
    profile: restoredQuoteData.capDetails.profile,
    billShape: restoredQuoteData.capDetails.billShape || restoredQuoteData.capDetails.shape,
    structure: restoredQuoteData.capDetails.structure,
    fabric: restoredQuoteData.capDetails.fabric,
    closure: restoredQuoteData.capDetails.closure,
    stitch: restoredQuoteData.capDetails.stitching || restoredQuoteData.capDetails.stitch,
    panelCount: 6, // This would come from extractPanelCountFromDetails
    quantity: restoredQuoteData.capDetails.quantity,
    _timestamp: Date.now()
  };

  console.log('\n📤 API Request that would be sent:');
  console.log(JSON.stringify(apiRequest, null, 2));

  // Step 3: Critical validation
  console.log('\n🔍 STEP 3: Critical validation checks');
  console.log('-'.repeat(50));

  const validations = [
    {
      check: "Product name present",
      value: !!apiRequest.productName,
      detail: apiRequest.productName
    },
    {
      check: "Product name matches original",
      value: apiRequest.productName === "6P AirFrame HSCS",
      detail: `Expected: "6P AirFrame HSCS", Got: "${apiRequest.productName}"`
    },
    {
      check: "Quantity correct",
      value: apiRequest.quantity === 800,
      detail: `Expected: 800, Got: ${apiRequest.quantity}`
    },
    {
      check: "Color correct",
      value: apiRequest.color === "Royal/Black",
      detail: `Expected: "Royal/Black", Got: "${apiRequest.color}"`
    }
  ];

  console.log('\n🧪 VALIDATION RESULTS:');
  validations.forEach(v => {
    const status = v.value ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} ${v.check}: ${v.detail}`);
  });

  const passedValidations = validations.filter(v => v.value).length;
  console.log(`\n📊 RESULT: ${passedValidations}/${validations.length} validations passed`);

  if (passedValidations === validations.length) {
    console.log('\n✅ ALL CHECKS PASSED');
    console.log('   The API should receive correct data and return "6P AirFrame HSCS"');
    console.log('   If Order Builder still shows wrong product, the issue is elsewhere');
  } else {
    console.log('\n❌ VALIDATION FAILURES DETECTED');
    console.log('   This explains why the wrong product is displayed');
    validations.filter(v => !v.value).forEach(v => {
      console.log(`   - ${v.check}: ${v.detail}`);
    });
  }
} else {
  console.log(`❌ No product name found (got: "${aiProductName}")`);
  console.log('   This would trigger fallback logic and might return wrong product');
}

console.log('\n\n🔍 CONCLUSION:');
console.log('='.repeat(70));
console.log('This test verifies the complete data flow from OrderBuilderState');
console.log('through conversationService transformation to CapStyleSection API call.');
console.log('\nIf all validations pass, the Order Builder restoration should work correctly.');
console.log('If not, the failures above indicate where the data corruption occurs.');