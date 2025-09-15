/**
 * CONVERSATION STATE PRESERVATION TEST
 *
 * Tests the exact scenario from the error report:
 * Original: 800 pieces, Royal/Black, Rubber patch Medium Size on front, Fitted Cap
 * Change: "change to 7-panel"
 *
 * Expected Results:
 * ✅ Quantity: 800 (preserved)
 * ✅ Color: "Royal/Black" (preserved)
 * ✅ Panel Count: "7P" (changed)
 * ✅ Logos: 1 logo with $80 mold charge (preserved)
 */

const { ConversationContextService } = require('./src/lib/support-ai/conversation-context');

async function testConversationStatePreservation() {
  console.log('🧪 TESTING CONVERSATION STATE PRESERVATION');
  console.log('=' .repeat(60));

  // Simulate the exact conversation history from error report
  const conversationHistory = [
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

⭐ Premium Upgrades ✅
•Acrylic: (+$1600.00) ($2.00/cap)
•Air Mesh: (+$600.00) ($0.75/cap)
•Closure: Fitted (+$600.00) ($0.75/cap)

🎨 Logo Setup ✅
•Front: Rubber (Medium) - $2184.00 ($2.63/cap + $0.10 mold)

🚚 Delivery ✅
•Method: Regular Delivery
•Timeline: 6-10 days days
•Cost: $2168.00 ($2.71/cap)

💰 Total Investment: $10152.00
Per Cap Cost: $12.69

📊 Cost Breakdown Per Cap:
•Base Cap: $3.75
•Premium Acrylic: $2.00
•Premium Air Mesh: $0.75
•Premium Closure: $0.75
•Front Logo: $2.73 ($2.63 + $0.10 mold)
•Delivery: $2.71
= Total: $12.69/cap

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

  const currentMessage = 'change to 7-panel';

  try {
    console.log('🔬 Step 1: Testing Context Extraction');
    console.log('-'.repeat(40));

    const contextResult = await ConversationContextService.buildSmartContextualRequest(
      currentMessage,
      conversationHistory
    );

    console.log('📋 Context Analysis Results:');
    console.log('  hasContext:', contextResult.hasContext);
    console.log('  detectedChanges:', contextResult.detectedChanges.length);
    console.log('  mergedSpecifications:');
    console.log('    quantity:', contextResult.mergedSpecifications.quantity);
    console.log('    colors:', contextResult.mergedSpecifications.colors);
    console.log('    logos:', contextResult.mergedSpecifications.logos?.length || 0);
    console.log('    panelCount:', contextResult.mergedSpecifications.panelCount);

    console.log('');
    console.log('🎯 Step 2: Validating Critical Fixes');
    console.log('-'.repeat(40));

    // Test 1: Quantity Preservation
    const quantityPreserved = contextResult.mergedSpecifications.quantity === 800;
    console.log(`✅ Quantity Preservation: ${quantityPreserved ? 'PASS' : 'FAIL'}`);
    console.log(`   Expected: 800, Actual: ${contextResult.mergedSpecifications.quantity}`);

    // Test 2: Color Preservation
    const colorPreserved = contextResult.mergedSpecifications.colors === 'Royal/Black';
    console.log(`✅ Color Preservation: ${colorPreserved ? 'PASS' : 'FAIL'}`);
    console.log(`   Expected: "Royal/Black", Actual: "${contextResult.mergedSpecifications.colors}"`);

    // Test 3: Panel Count Change Detection
    const panelChangeDetected = contextResult.detectedChanges.some(change =>
      change.aspect === 'panelCount' && change.newValue === 7
    );
    console.log(`✅ Panel Count Change: ${panelChangeDetected ? 'PASS' : 'FAIL'}`);
    console.log(`   Expected: 7-panel change detected`);

    // Test 4: Logo Preservation
    const logoPreserved = contextResult.mergedSpecifications.logos &&
                         contextResult.mergedSpecifications.logos.length === 1 &&
                         contextResult.mergedSpecifications.logos[0].position === 'Front' &&
                         contextResult.mergedSpecifications.logos[0].type.includes('Rubber') &&
                         contextResult.mergedSpecifications.logos[0].moldCharge > 0;
    console.log(`✅ Logo Preservation: ${logoPreserved ? 'PASS' : 'FAIL'}`);
    if (contextResult.mergedSpecifications.logos && contextResult.mergedSpecifications.logos.length > 0) {
      const logo = contextResult.mergedSpecifications.logos[0];
      console.log(`   Expected: 1 Front Rubber logo with mold charge`);
      console.log(`   Actual: ${contextResult.mergedSpecifications.logos.length} logos, Position: ${logo.position}, Type: ${logo.type}, Mold: $${logo.moldCharge}`);
    } else {
      console.log(`   Expected: 1 logo, Actual: 0 logos`);
    }

    console.log('');
    console.log('📊 Step 3: Overall Test Results');
    console.log('-'.repeat(40));

    const allTestsPassed = quantityPreserved && colorPreserved && panelChangeDetected && logoPreserved;

    if (allTestsPassed) {
      console.log('🎉 ALL TESTS PASSED! Conversation state preservation is working correctly.');
      console.log('');
      console.log('📋 Final State Summary:');
      console.log(`   Quantity: ${contextResult.mergedSpecifications.quantity} pieces ✅`);
      console.log(`   Color: "${contextResult.mergedSpecifications.colors}" ✅`);
      console.log(`   Panel Count Change: Detected 7-panel ✅`);
      console.log(`   Logos: ${contextResult.mergedSpecifications.logos?.length || 0} with mold charges ✅`);
    } else {
      console.log('❌ SOME TESTS FAILED! Review the issues above.');

      console.log('');
      console.log('🔍 Debugging Information:');
      console.log('Detected Changes:', JSON.stringify(contextResult.detectedChanges, null, 2));
      console.log('Merged Specifications:', JSON.stringify(contextResult.mergedSpecifications, null, 2));
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
testConversationStatePreservation();