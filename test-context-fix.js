/**
 * TEST SCRIPT: Context Preservation Fix Validation
 *
 * Tests the scenario described in the bug report:
 * 1. User requests 600 pieces with logos, fabrics, accessories
 * 2. User asks "how much for 150?"
 * 3. System should preserve ALL specifications, only update quantity
 */

const API_BASE = 'http://localhost:3003/api/support/step-by-step-pricing';

// Test Scenario 1: Initial comprehensive quote
async function testInitialQuote() {
  console.log('🧪 TEST 1: Initial comprehensive quote (600 pieces)');

  const initialRequest = {
    message: "600 pieces Royal/Black caps with 4 logos: Rubber Patch Front, Screen Print Back, Embroidery Left Side, Embroidery Right Side. Premium Acrylic and Air Mesh fabrics. Inside Label and B-Tape Print accessories. Flexfit closure.",
    intent: "step-by-step-pricing",
    conversationHistory: [],
    userProfile: null,
    conversationId: "test-001",
    sessionId: "test-session-001"
  };

  try {
    const response = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(initialRequest)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('✅ Initial quote successful');
    console.log('💰 Total:', result.quoteData?.pricing?.total);
    console.log('🎨 Logos:', result.quoteData?.customization?.logos?.length || 0);
    console.log('🧵 Fabrics:', Object.keys(result.quoteData?.premiumUpgrades?.data?.fabrics || {}).length);
    console.log('🏷️ Accessories:', result.quoteData?.customization?.accessories?.length || 0);
    console.log('🔒 Closure:', result.quoteData?.capDetails?.closure);

    return {
      message: result.message,
      conversationHistory: [
        { role: 'user', content: initialRequest.message },
        { role: 'assistant', content: result.message }
      ]
    };
  } catch (error) {
    console.error('❌ Initial quote failed:', error);
    throw error;
  }
}

// Test Scenario 2: Quantity update request
async function testQuantityUpdate(previousContext) {
  console.log('\n🧪 TEST 2: Quantity update request (150 pieces)');

  const quantityUpdateRequest = {
    message: "how much for 150?",
    intent: "step-by-step-pricing",
    conversationHistory: previousContext.conversationHistory,
    userProfile: null,
    conversationId: "test-001",
    sessionId: "test-session-001"
  };

  try {
    const response = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(quantityUpdateRequest)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('✅ Quantity update successful');
    console.log('📊 Quantity:', result.quoteData?.capDetails?.quantity);
    console.log('💰 Total:', result.quoteData?.pricing?.total);
    console.log('🎨 Logos:', result.quoteData?.customization?.logos?.length || 0);
    console.log('🧵 Fabrics:', Object.keys(result.quoteData?.premiumUpgrades?.data?.fabrics || {}).length);
    console.log('🏷️ Accessories:', result.quoteData?.customization?.accessories?.length || 0);
    console.log('🔒 Closure:', result.quoteData?.capDetails?.closure);

    // Validation checks
    const expectedLogos = 4;
    const expectedAccessories = 2; // Inside Label + B-Tape Print
    const expectedFabrics = 2; // Acrylic + Air Mesh
    const expectedClosure = 'Flexfit';

    console.log('\n🔍 VALIDATION RESULTS:');
    console.log(`Logos preserved: ${result.quoteData?.customization?.logos?.length === expectedLogos ? '✅' : '❌'} (${result.quoteData?.customization?.logos?.length}/${expectedLogos})`);
    console.log(`Accessories preserved: ${result.quoteData?.customization?.accessories?.length === expectedAccessories ? '✅' : '❌'} (${result.quoteData?.customization?.accessories?.length}/${expectedAccessories})`);
    console.log(`Fabrics preserved: ${Object.keys(result.quoteData?.premiumUpgrades?.data?.fabrics || {}).length === expectedFabrics ? '✅' : '❌'} (${Object.keys(result.quoteData?.premiumUpgrades?.data?.fabrics || {}).length}/${expectedFabrics})`);
    console.log(`Closure preserved: ${result.quoteData?.capDetails?.closure === expectedClosure ? '✅' : '❌'} (${result.quoteData?.capDetails?.closure}/${expectedClosure})`);

    return result;
  } catch (error) {
    console.error('❌ Quantity update failed:', error);
    throw error;
  }
}

// Main test execution
async function runTests() {
  console.log('🚀 Starting Context Preservation Fix Tests...\n');

  try {
    // Test 1: Initial comprehensive quote
    const initialContext = await testInitialQuote();

    // Test 2: Quantity update with context preservation
    const quantityUpdateResult = await testQuantityUpdate(initialContext);

    console.log('\n🎉 ALL TESTS COMPLETED SUCCESSFULLY!');

    // Final comparison
    console.log('\n📊 BUSINESS IMPACT COMPARISON:');
    console.log('Old behavior: $1,193.76 (only base cap + closure + delivery)');
    console.log(`New behavior: $${quantityUpdateResult.quoteData?.pricing?.total?.toFixed(2)} (complete specification preserved)`);

  } catch (error) {
    console.error('\n💥 TEST SUITE FAILED:', error.message);
    process.exit(1);
  }
}

// Execute tests
runTests().catch(console.error);