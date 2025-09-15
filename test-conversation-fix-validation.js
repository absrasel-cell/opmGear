/**
 * COMPREHENSIVE CONVERSATION STATE PRESERVATION VALIDATION
 *
 * Tests the critical fixes for:
 * 1. Color data not updating in Order Builder during follow-up conversations
 * 2. Accessories completely missing from Order Builder in follow-up conversations
 * 3. Proper state preservation for all aspects
 */

const { ConversationContextService } = require('./src/lib/support-ai/conversation-context');

async function testConversationStateFixes() {
  console.log('🧪 COMPREHENSIVE CONVERSATION STATE PRESERVATION VALIDATION');
  console.log('='.repeat(80));

  // Test Case 1: Color Preservation with Panel Count Change
  console.log('\n🎯 TEST CASE 1: Color Preservation with Panel Count Change');
  console.log('-'.repeat(60));

  const testCase1History = [
    {
      role: 'user',
      content: 'create me a quote for 800 piece, Acrylic/Airmesh fabric, Royal/Black, size: 59 cm. which has Rubber patch Medium Size on the front. Fitted Cap.'
    },
    {
      role: 'assistant',
      content: `Here's your detailed quote with verified pricing from our database:

📊 Cap Style Setup ✅
•6P AirFrame HSCS (Tier 2)
•Base cost: $3000.00 ($3.75/cap)
•Color: Royal/Black

⭐ Premium Upgrades ✅
•Acrylic: (+$1600.00) ($2.00/cap)
•Air Mesh: (+$600.00) ($0.75/cap)
•Closure: Fitted (+$600.00) ($0.75/cap)

🎨 Logo Setup ✅
•Front: Rubber (Medium) - $2184.00 ($2.63/cap + $0.10 mold)

🏷️ Accessories ✅
• Inside Label: $800.00 ($1.00/cap)
• B-Tape Print: $400.00 ($0.50/cap)

🚚 Delivery ✅
•Method: Regular Delivery
•Timeline: 6-10 days
•Cost: $2168.00 ($2.71/cap)

💰 Total Investment: $11552.00
Per Cap Cost: $14.44

Current AI Values
Size: 7 3/8
Color: Royal/Black
Profile: High
Shape: Slight Curved
Structure: Structured with Mono Lining
Fabric: Acrylic/Air Mesh
Closure: Fitted
Stitching: Matching

Logo Setup
Front: Rubber (Medium)$2184.00
Unit Cost: $2.63
Base Cost: $2104.00
Mold Charge: +$80.00
Quantity: 800 pieces

✅ All pricing verified from database
Would you like to modify any specifications or proceed with this quote?`
    }
  ];

  try {
    // Test color preservation during panel count change
    const colorTestResult = await ConversationContextService.buildSmartContextualRequest(
      'change to 7-panel',
      testCase1History
    );

    console.log('📋 Test Case 1 Results:');
    console.log('  Color Preservation:', colorTestResult.mergedSpecifications.colors);
    console.log('  Quantity Preservation:', colorTestResult.mergedSpecifications.quantity);
    console.log('  Logo Preservation:', colorTestResult.mergedSpecifications.logos?.length || 0);
    console.log('  Accessories Preservation:', colorTestResult.mergedSpecifications.accessories?.length || 0);
    console.log('  Panel Count Change Detected:', colorTestResult.detectedChanges.some(c => c.aspect === 'panelCount'));

    // Validate results
    const test1Passed =
      colorTestResult.mergedSpecifications.colors === 'Royal/Black' &&
      colorTestResult.mergedSpecifications.quantity === 800 &&
      colorTestResult.mergedSpecifications.logos?.length >= 1 &&
      colorTestResult.mergedSpecifications.accessories?.length >= 1 &&
      colorTestResult.detectedChanges.some(c => c.aspect === 'panelCount');

    console.log(`  🏆 Test Case 1 Result: ${test1Passed ? 'PASS ✅' : 'FAIL ❌'}`);

    // Test Case 2: Color Change with Accessories Preservation
    console.log('\n🎯 TEST CASE 2: Color Change with Accessories Preservation');
    console.log('-'.repeat(60));

    const colorChangeResult = await ConversationContextService.buildSmartContextualRequest(
      'make it Gold/Pink',
      testCase1History
    );

    console.log('📋 Test Case 2 Results:');
    console.log('  Color Change:', colorChangeResult.mergedSpecifications.colors);
    console.log('  Quantity Preservation:', colorChangeResult.mergedSpecifications.quantity);
    console.log('  Logo Preservation:', colorChangeResult.mergedSpecifications.logos?.length || 0);
    console.log('  Accessories Preservation:', colorChangeResult.mergedSpecifications.accessories?.length || 0);
    console.log('  Color Change Detected:', colorChangeResult.detectedChanges.some(c => c.aspect === 'colors'));

    const test2Passed =
      colorChangeResult.mergedSpecifications.colors === 'Gold/Pink' &&
      colorChangeResult.mergedSpecifications.quantity === 800 &&
      colorChangeResult.mergedSpecifications.logos?.length >= 1 &&
      colorChangeResult.mergedSpecifications.accessories?.length >= 1 &&
      colorChangeResult.detectedChanges.some(c => c.aspect === 'colors');

    console.log(`  🏆 Test Case 2 Result: ${test2Passed ? 'PASS ✅' : 'FAIL ❌'}`);

    // Test Case 3: Quantity Change with Full State Preservation
    console.log('\n🎯 TEST CASE 3: Quantity Change with Full State Preservation');
    console.log('-'.repeat(60));

    const quantityChangeResult = await ConversationContextService.buildSmartContextualRequest(
      'what about 600 pieces',
      testCase1History
    );

    console.log('📋 Test Case 3 Results:');
    console.log('  Color Preservation:', quantityChangeResult.mergedSpecifications.colors);
    console.log('  Quantity Change:', quantityChangeResult.mergedSpecifications.quantity);
    console.log('  Logo Preservation:', quantityChangeResult.mergedSpecifications.logos?.length || 0);
    console.log('  Accessories Preservation:', quantityChangeResult.mergedSpecifications.accessories?.length || 0);
    console.log('  Quantity Change Detected:', quantityChangeResult.detectedChanges.some(c => c.aspect === 'quantity'));

    const test3Passed =
      quantityChangeResult.mergedSpecifications.colors === 'Royal/Black' &&
      quantityChangeResult.mergedSpecifications.quantity === 600 &&
      quantityChangeResult.mergedSpecifications.logos?.length >= 1 &&
      quantityChangeResult.mergedSpecifications.accessories?.length >= 1 &&
      quantityChangeResult.detectedChanges.some(c => c.aspect === 'quantity');

    console.log(`  🏆 Test Case 3 Result: ${test3Passed ? 'PASS ✅' : 'FAIL ❌'}`);

    // Test Case 4: Complex Conversation Chain
    console.log('\n🎯 TEST CASE 4: Complex Conversation Chain');
    console.log('-'.repeat(60));

    // Simulate multiple conversation turns
    const conversationChain = [
      ...testCase1History,
      {
        role: 'user',
        content: 'change to 7-panel'
      },
      {
        role: 'assistant',
        content: `I've updated your quote with the requested changes:

🔄 **Changes Applied:**
• Change panel count from 6P to 7-panel

📊 Cap Style Setup 🔄 **UPDATED** ✅
•7P Elite Seven (Tier 3)
•Base cost: $3600.00 ($4.50/cap)
•Color: Royal/Black

⭐ Premium Upgrades ✅
•Acrylic: (+$1600.00) ($2.00/cap)
•Air Mesh: (+$600.00) ($0.75/cap)
•Closure: Fitted (+$600.00) ($0.75/cap)

🎨 Logo Setup ✅
•Front: Rubber (Medium) - $2184.00 ($2.63/cap + $0.10 mold)

🏷️ Accessories ✅
• Inside Label: $800.00 ($1.00/cap)
• B-Tape Print: $400.00 ($0.50/cap)

🚚 Delivery ✅
•Method: Regular Delivery
•Timeline: 6-10 days
•Cost: $2168.00 ($2.71/cap)

💰 Total Investment: $12152.00
Per Cap Cost: $15.19

✅ Your specifications have been updated. Need any other changes?`
      }
    ];

    const chainResult = await ConversationContextService.buildSmartContextualRequest(
      'make it Gold/Pink',
      conversationChain
    );

    console.log('📋 Test Case 4 Results:');
    console.log('  Color Change:', chainResult.mergedSpecifications.colors);
    console.log('  Panel Count Preservation:', chainResult.mergedSpecifications.panelCount);
    console.log('  Quantity Preservation:', chainResult.mergedSpecifications.quantity);
    console.log('  Logo Preservation:', chainResult.mergedSpecifications.logos?.length || 0);
    console.log('  Accessories Preservation:', chainResult.mergedSpecifications.accessories?.length || 0);

    const test4Passed =
      chainResult.mergedSpecifications.colors === 'Gold/Pink' &&
      chainResult.mergedSpecifications.quantity === 800 &&
      chainResult.mergedSpecifications.logos?.length >= 1 &&
      chainResult.mergedSpecifications.accessories?.length >= 1;

    console.log(`  🏆 Test Case 4 Result: ${test4Passed ? 'PASS ✅' : 'FAIL ❌'}`);

    // Overall Test Results
    console.log('\n🎉 OVERALL TEST RESULTS');
    console.log('='.repeat(60));

    const allTestsPassed = test1Passed && test2Passed && test3Passed && test4Passed;
    const passedTests = [test1Passed, test2Passed, test3Passed, test4Passed].filter(Boolean).length;

    console.log(`Tests Passed: ${passedTests}/4`);
    console.log(`Overall Result: ${allTestsPassed ? 'ALL TESTS PASSED! 🎉' : 'SOME TESTS FAILED ❌'}`);

    if (allTestsPassed) {
      console.log('\n✅ CRITICAL FIXES SUCCESSFULLY IMPLEMENTED:');
      console.log('  • Color data properly preserved in follow-up conversations');
      console.log('  • Accessories data maintained across conversation turns');
      console.log('  • Panel count changes detected without affecting other state');
      console.log('  • Complex conversation chains work correctly');
      console.log('  • Single-aspect changes preserve all other specifications');
    } else {
      console.log('\n❌ ISSUES STILL PRESENT:');
      if (!test1Passed) console.log('  • Test 1 FAILED: Basic state preservation issues');
      if (!test2Passed) console.log('  • Test 2 FAILED: Color change with preservation issues');
      if (!test3Passed) console.log('  • Test 3 FAILED: Quantity change preservation issues');
      if (!test4Passed) console.log('  • Test 4 FAILED: Complex conversation chain issues');
    }

  } catch (error) {
    console.error('❌ Test suite failed with error:', error);
    console.error('Stack trace:', error.stack);
  }
}

// Run the comprehensive test suite
testConversationStateFixes();