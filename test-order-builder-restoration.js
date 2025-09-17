/**
 * Test script to verify Order Builder data restoration works properly
 * Tests the complete save-quote -> load-conversation -> restore-order-builder flow
 */

const testOrderBuilderRestoration = async () => {
  console.log('🚀 Testing Order Builder restoration flow...\n');

  // Test data based on the 800 piece quote from currentTask.txt
  const testOrderBuilderState = {
    capDetails: {
      productName: "6P AirFrame HSCS",
      quantity: 800,
      unitPrice: 3.75,
      color: "Royal/Black",
      colors: ["Royal", "Black"],
      size: "7 3/8",
      profile: "High",
      billShape: "Slight Curved",
      structure: "Structured with Mono Lining",
      fabric: "Acrylic/Air Mesh",
      closure: "Fitted",
      stitch: "Matching",
      pricingTier: "Tier 2"
    },
    customization: {
      logos: [{
        id: "logo_1",
        position: "Front",
        method: "Rubber",
        size: "Medium",
        unitCost: 2.63,
        moldCharge: 80.00,
        quantity: 800,
        totalCost: 2184.00
      }],
      totalMoldCharges: 80.00
    },
    delivery: {
      method: "Regular Delivery",
      leadTime: "6-10 days",
      totalCost: 2168.00
    },
    pricing: {
      baseProductCost: 3000.00,
      logosCost: 2104.00,
      deliveryCost: 2168.00,
      total: 10152.00,
      quantity: 800
    },
    totalCost: 10152.00,
    totalUnits: 800,
    orderBuilderStatus: {
      capStyle: {
        completed: true,
        status: 'green',
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
        status: 'yellow',
        items: {
          logoSetup: true,
          accessories: false,
          moldCharges: true
        },
        logoPositions: ['Front']
      },
      delivery: {
        completed: true,
        status: 'green',
        items: {
          method: true,
          leadTime: true,
          address: false
        }
      },
      costBreakdown: {
        completed: true,
        status: 'green',
        available: true,
        selectedVersionId: null,
        versions: []
      }
    }
  };

  const conversationId = "test_conversation_" + Date.now();
  const quoteOrderId = "test_quote_" + Date.now();
  const sessionId = "test_session_" + Date.now();

  try {
    console.log('📋 STEP 1: Testing save-quote API...');
    console.log('Data structure:', {
      hasCapDetails: !!testOrderBuilderState.capDetails,
      capDetailsQuantity: testOrderBuilderState.capDetails?.quantity,
      hasCustomization: !!testOrderBuilderState.customization,
      hasDelivery: !!testOrderBuilderState.delivery,
      hasPricing: !!testOrderBuilderState.pricing,
      totalCost: testOrderBuilderState.totalCost
    });

    // Step 1: Create conversation
    console.log('\n🆕 Creating test conversation...');
    const createConvResponse = await fetch('http://localhost:3000/api/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: null, // Test as guest user
        sessionId,
        context: 'SUPPORT',
        title: 'Test Order Builder Restoration',
        metadata: {
          test: true,
          testType: 'order_builder_restoration'
        }
      })
    });

    if (!createConvResponse.ok) {
      throw new Error('Failed to create conversation');
    }

    const convData = await createConvResponse.json();
    const actualConversationId = convData.id;
    console.log('✅ Test conversation created:', actualConversationId);

    // Step 2: Save quote
    console.log('\n💾 STEP 2: Saving quote with Order Builder state...');
    const saveResponse = await fetch('http://localhost:3000/api/conversations/save-quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversationId: actualConversationId,
        quoteOrderId,
        orderBuilderState: testOrderBuilderState,
        sessionId,
        generateTitle: false
      })
    });

    console.log('📡 Save-quote response status:', saveResponse.status);

    if (!saveResponse.ok) {
      const errorText = await saveResponse.text();
      throw new Error(`Save-quote failed: ${errorText}`);
    }

    const saveData = await saveResponse.json();
    console.log('✅ Quote saved successfully');
    console.log('Save result:', {
      success: saveData.success,
      hasOrderBuilderStateId: !!saveData.data?.orderBuilderStateId,
      orderBuilderStateId: saveData.data?.orderBuilderStateId,
      conversationId: saveData.data?.conversationId
    });

    // Step 3: Load conversation and check data restoration
    console.log('\n📖 STEP 3: Loading conversation to test data restoration...');
    const loadResponse = await fetch(`http://localhost:3000/api/conversations/${actualConversationId}`, {
      headers: { 'Content-Type': 'application/json' }
    });

    if (!loadResponse.ok) {
      const errorText = await loadResponse.text();
      throw new Error(`Load conversation failed: ${errorText}`);
    }

    const loadData = await loadResponse.json();
    console.log('✅ Conversation loaded successfully');

    // Step 4: Analyze restoration results
    console.log('\n🔍 STEP 4: ANALYZING ORDER BUILDER RESTORATION...');
    console.log('\nConversation data structure:');
    console.log('- hasOrderBuilderState:', !!loadData.orderBuilderState);
    console.log('- hasMetadataOrderBuilder:', !!loadData.metadata?.orderBuilder);
    console.log('- orderBuilderStateId on conversation:', loadData.orderBuilderStateId);

    if (loadData.orderBuilderState) {
      console.log('\n📊 OrderBuilderState analysis:');
      console.log('- id:', loadData.orderBuilderState.id);
      console.log('- isCompleted:', loadData.orderBuilderState.isCompleted);
      console.log('- totalCost:', loadData.orderBuilderState.totalCost);
      console.log('- totalUnits:', loadData.orderBuilderState.totalUnits);
      console.log('- hasCapStyleSetup:', !!loadData.orderBuilderState.capStyleSetup);
      console.log('- hasCustomization:', !!loadData.orderBuilderState.customization);
      console.log('- hasDelivery:', !!loadData.orderBuilderState.delivery);
      console.log('- hasCostBreakdown:', !!loadData.orderBuilderState.costBreakdown);

      if (loadData.orderBuilderState.capStyleSetup) {
        console.log('\n🧢 Cap Style Setup data:');
        console.log('- style/productName:', loadData.orderBuilderState.capStyleSetup.style);
        console.log('- quantity:', loadData.orderBuilderState.capStyleSetup.quantity);
        console.log('- color:', loadData.orderBuilderState.capStyleSetup.color);
        console.log('- profile:', loadData.orderBuilderState.capStyleSetup.profile);
        console.log('- billShape:', loadData.orderBuilderState.capStyleSetup.billShape);
        console.log('- structure:', loadData.orderBuilderState.capStyleSetup.structure);
        console.log('- fabric:', loadData.orderBuilderState.capStyleSetup.fabric);
      }

      // CRITICAL TEST: Simulate the conversationService transformation
      console.log('\n🔄 STEP 5: Testing conversationService transformation...');
      const transformedData = simulateConversationServiceTransformation(loadData.orderBuilderState);

      console.log('Transformation results:');
      console.log('- hasCapDetails:', !!transformedData.capDetails);
      console.log('- capDetails.quantity:', transformedData.capDetails?.quantity);
      console.log('- capDetails.productName:', transformedData.capDetails?.productName);
      console.log('- capDetails.color:', transformedData.capDetails?.color);
      console.log('- hasCustomization:', !!transformedData.customization);
      console.log('- customization.logos count:', transformedData.customization?.logos?.length || 0);
      console.log('- hasDelivery:', !!transformedData.delivery);
      console.log('- delivery.method:', transformedData.delivery?.method);
      console.log('- hasPricing:', !!transformedData.pricing);
      console.log('- pricing.total:', transformedData.pricing?.total);
      console.log('- pricing.quantity:', transformedData.pricing?.quantity);

      // CRITICAL VALIDATION
      const validationResults = {
        correctQuantity: transformedData.capDetails?.quantity === 800,
        correctProductName: transformedData.capDetails?.productName === "6P AirFrame HSCS",
        correctColor: transformedData.capDetails?.color === "Royal/Black",
        correctTotalCost: transformedData.pricing?.total === 10152.00,
        correctDeliveryMethod: transformedData.delivery?.method === "Regular Delivery",
        correctLogoCount: transformedData.customization?.logos?.length === 1,
        correctLogoCost: transformedData.customization?.logos?.[0]?.totalCost === 2184.00
      };

      console.log('\n✅ CRITICAL VALIDATION RESULTS:');
      Object.entries(validationResults).forEach(([key, value]) => {
        console.log(`- ${key}: ${value ? '✅ PASS' : '❌ FAIL'}`);
      });

      const allTestsPassed = Object.values(validationResults).every(result => result === true);
      console.log(`\n🎯 OVERALL RESULT: ${allTestsPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);

      if (allTestsPassed) {
        console.log('\n🎉 SUCCESS: Order Builder data restoration working correctly!');
        console.log('The system will now load saved data instead of making fresh API calls.');
      } else {
        console.log('\n❌ FAILURE: Order Builder data restoration has issues.');
        console.log('Failed validations need to be addressed.');
      }

    } else {
      console.log('❌ CRITICAL ERROR: No OrderBuilderState found in loaded conversation');
    }

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
  }
};

// Simulate the conversationService transformation logic
function simulateConversationServiceTransformation(orderBuilderState) {
  if (!orderBuilderState) return null;

  // Transform from OrderBuilderState database format to expected runtime format
  if (orderBuilderState.capStyleSetup || orderBuilderState.customization || orderBuilderState.delivery) {
    return {
      capDetails: orderBuilderState.capStyleSetup ? {
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
        style: orderBuilderState.capStyleSetup.style,
        productName: orderBuilderState.capStyleSetup.style || orderBuilderState.capStyleSetup.productName
      } : {},

      customization: orderBuilderState.customization ? {
        logos: orderBuilderState.customization.logoDetails || orderBuilderState.customization.logos || [],
        accessories: orderBuilderState.customization.accessories || [],
        totalMoldCharges: orderBuilderState.customization.totalCustomizationCost || orderBuilderState.customization.totalMoldCharges || 0,
        logoSetup: orderBuilderState.customization.logoSetup
      } : {},

      delivery: orderBuilderState.delivery ? {
        method: orderBuilderState.delivery.method,
        leadTime: orderBuilderState.delivery.leadTime,
        totalCost: orderBuilderState.delivery.totalCost,
        address: orderBuilderState.delivery.address
      } : {},

      pricing: orderBuilderState.costBreakdown ? {
        baseProductCost: orderBuilderState.costBreakdown.baseProductCost || 0,
        logosCost: orderBuilderState.costBreakdown.logosCost || 0,
        deliveryCost: orderBuilderState.costBreakdown.deliveryCost || 0,
        total: orderBuilderState.costBreakdown.total || orderBuilderState.totalCost || 0,
        quantity: orderBuilderState.costBreakdown.quantity || orderBuilderState.totalUnits || orderBuilderState.capStyleSetup?.quantity || 100
      } : {}
    };
  }

  return orderBuilderState;
}

// Run the test if in Node.js environment
if (typeof window === 'undefined') {
  // Node.js environment
  global.fetch = require('node-fetch');
  testOrderBuilderRestoration().catch(console.error);
} else {
  // Browser environment
  testOrderBuilderRestoration().catch(console.error);
}