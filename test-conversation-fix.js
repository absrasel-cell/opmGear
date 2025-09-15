/**
 * Test Script for Conversation State Preservation Fix
 *
 * Tests the exact scenario described in the issue:
 * 1. First quote: 800 pieces, Royal/Black, Rubber patch Medium Size, Fitted Cap
 * 2. Follow-up: "change to 7-panel"
 * 3. Verify: Quantity=800, Color=Royal/Black, accessories preserved, only panel count changes
 */

// Import the conversation context service
const { ConversationContextService } = require('./src/lib/support-ai/conversation-context.ts');

async function testConversationPreservation() {
  console.log('🧪 [TEST] Starting conversation state preservation test');
  console.log('🧪 [TEST] ===============================================');

  // Simulate the initial conversation history
  const initialConversationHistory = [
    {
      role: 'user',
      content: 'create me a quote for 800 piece, Acrylic/Airmesh fabric, Royal/Black, size: 59 cm. which has Rubber patch Medium Size on the front. Fitted Cap.'
    },
    {
      role: 'assistant',
      content: `🧢 **Cap Style Setup:**
• 6-Panel AirFrame ProFit Elite - Premium structured design
• **Acrylic/Airmesh** fabric combination for superior comfort (+$1,152.00)
• **Royal/Black** color scheme
• **Fitted** closure for professional fit (+$576.00)
• Size: 59 cm (7 3/8)

🎨 **Customization:**
• **Front**: Rubber Patch (Medium) - $4,800.00
  - Mold charge: $300.00
• **Accessories**: Inside Label included

🚚 **Delivery:**
• Method: Regular Delivery - $1,600.00
• Lead Time: 10-14 business days

💰 **Total Investment: $12,428.00**
- Base cost: $4,000.00 ($5.00/cap) for 800 caps
- Premium fabric: $1,152.00 ($1.44/cap)
- Premium closure: $576.00 ($0.72/cap)
- Customization: $4,800.00 ($6.00/cap)
- Delivery: $1,600.00 ($2.00/cap)
- Mold charges: $300.00`
    }
  ];

  // Test the follow-up message
  const followUpMessage = 'change to 7-panel';

  try {
    // Build the contextual request using the conversation context service
    const contextualRequest = await ConversationContextService.buildSmartContextualRequest(
      followUpMessage,
      initialConversationHistory
    );

    console.log('🧪 [TEST] Contextual Request Analysis:');
    console.log('📋 Has Context:', contextualRequest.hasContext);
    console.log('🔍 Detected Changes:', contextualRequest.detectedChanges.length);

    if (contextualRequest.detectedChanges.length > 0) {
      contextualRequest.detectedChanges.forEach((change, index) => {
        console.log(`   ${index + 1}. ${change.changeDescription} (${change.confidence} confidence)`);
      });
    }

    console.log('📊 Merged Specifications:');
    const specs = contextualRequest.mergedSpecifications;

    // Critical test points
    const testResults = {
      quantityPreserved: specs.quantity === 800,
      colorPreserved: specs.colors === 'Royal/Black' || specs.color === 'Royal/Black',
      fabricPreserved: specs.fabric === 'Acrylic/Airmesh' || specs.fabric?.includes('Acrylic'),
      logosPreserved: specs.logos && specs.logos.length > 0,
      accessoriesPreserved: specs.accessories && specs.accessories.length > 0,
      panelCountChanged: specs.panelCount === 7 || contextualRequest.detectedChanges.some(c => c.aspect === 'panelCount' && c.newValue === 7)
    };

    console.log('✅ [TEST] Test Results:');
    console.log(`   - Quantity preserved (800): ${testResults.quantityPreserved ? '✅' : '❌'} (${specs.quantity})`);
    console.log(`   - Color preserved (Royal/Black): ${testResults.colorPreserved ? '✅' : '❌'} (${specs.colors || specs.color})`);
    console.log(`   - Fabric preserved (Acrylic/Airmesh): ${testResults.fabricPreserved ? '✅' : '❌'} (${specs.fabric})`);
    console.log(`   - Logos preserved: ${testResults.logosPreserved ? '✅' : '❌'} (${specs.logos?.length || 0} logos)`);
    console.log(`   - Accessories preserved: ${testResults.accessoriesPreserved ? '✅' : '❌'} (${specs.accessories?.length || 0} accessories)`);
    console.log(`   - Panel count changed to 7: ${testResults.panelCountChanged ? '✅' : '❌'}`);

    // Overall test result
    const allTestsPassed = Object.values(testResults).every(result => result);
    console.log('');
    console.log(`🏁 [TEST] Overall Result: ${allTestsPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);

    if (!allTestsPassed) {
      console.log('');
      console.log('🔍 [DEBUG] Full merged specifications:');
      console.log(JSON.stringify(specs, null, 2));
    }

    return allTestsPassed;

  } catch (error) {
    console.error('❌ [TEST] Error during test:', error);
    return false;
  }
}

// Run the test
if (require.main === module) {
  testConversationPreservation()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ [TEST] Test execution failed:', error);
      process.exit(1);
    });
}

module.exports = { testConversationPreservation };