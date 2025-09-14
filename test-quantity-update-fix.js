/**
 * TEST SCRIPT - Quantity Update Data Loss Fix
 *
 * This script tests the critical fix for the quantity update issue where
 * users requesting quantity changes lost all logos, fabrics, accessories, etc.
 *
 * Expected behavior:
 * - Original: 144 pieces with 4 logos, premium fabrics, accessories
 * - Update: "I want 576 pieces" should preserve ALL previous specifications
 * - Result: 576 pieces with SAME 4 logos, fabrics, accessories at new quantities
 */

const { analyzeCustomerRequirements, extractPreviousQuoteContext } = require('./src/lib/pricing/format8-functions.ts');

// Simulate the exact conversation from errorReport.txt
const testConversationHistory = [
  {
    role: 'user',
    content: 'i need 6-Panel Cap, Acrylic/Airmesh Fabric, Red/White, Size: 57 cm, Flat bill. Rubber Patch Front, Embroidery on Left, Embroidery on Right, Print patch on back. Closure Flexfit. B-Tape Print, Label.'
  },
  {
    role: 'assistant',
    content: `Here's your detailed quote with verified pricing from our database:

📊 Cap Style Setup ✅
•6P AirFrame HSCS (Tier 2)
•Base cost: $576.00 ($4.00/cap)

⭐ Premium Upgrades ✅
•Acrylic: (+$360.00) ($2.50/cap)
•Air Mesh: (+$126.72) ($0.88/cap)
•Closure: Flexfit (+$144.00) ($1.00/cap)

🎨 Logo Setup ✅
•Front: Rubber (Large) - $642.72 ($3.63/cap + $0.83 mold)
•Back: Screen Print (Small) - $162.72 ($1.13/cap)
•Left: 3D Embroidery (Small) - $216.00 ($1.50/cap)
•Right: 3D Embroidery (Small) - $216.00 ($1.50/cap)

🏷️ Accessories ✅
•Inside Label: $90.72 ($0.63/cap)
•B-Tape Print: $90.72 ($0.63/cap)
•Total: $181.44 ($1.26/cap)

🚚 Delivery ✅
•Method: Regular Delivery
•Timeline: 6-10 days days
•Cost: $473.76 ($3.29/cap)

💰 Total Investment: $3099.36
Per Cap Cost: $21.52

📊 Cost Breakdown Per Cap:
•Base Cap: $4.00
•Premium Acrylic: $2.50
•Premium Air Mesh: $0.88
•Premium Closure: $1.00
•Front Logo: $4.46 ($3.63 + $0.83 mold)
•Back Logo: $1.13
•Left Logo: $1.50
•Right Logo: $1.50
•Accessories: $1.26
•Delivery: $3.29
= Total: $21.52/cap

✅ All pricing verified from database
Would you like to modify any specifications or proceed with this quote?`
  }
];

async function testQuantityUpdateFix() {
  console.log('🧪 TESTING QUANTITY UPDATE FIX...\n');

  // Test 1: Extract previous context
  console.log('📋 Step 1: Testing previous context extraction...');
  const previousContext = extractPreviousQuoteContext(testConversationHistory);

  console.log('Previous Context:', {
    hasQuote: previousContext.hasQuote,
    quantity: previousContext.quantity,
    fabric: previousContext.fabric,
    closure: previousContext.closure,
    logoCount: previousContext.logoRequirements.length,
    accessoryCount: previousContext.accessories.length,
    allFabrics: previousContext.allFabrics,
    moldCharges: previousContext.moldCharges
  });

  // Test 2: Analyze quantity update request
  console.log('\n📊 Step 2: Testing quantity update analysis...');
  const quantityUpdateMessage = "I want 576 pieces";

  try {
    const analysis = await analyzeCustomerRequirements(quantityUpdateMessage, testConversationHistory);

    console.log('Quantity Update Analysis:', {
      quantity: analysis.quantity,
      isQuantityUpdate: analysis.isQuantityUpdate,
      fabric: analysis.fabric,
      closure: analysis.closure,
      logoCount: analysis.allLogoRequirements.length,
      accessoryCount: analysis.accessoriesRequirements.length,
      contextPreservation: analysis.contextPreservation
    });

    // Validate the fix
    const isFixWorking =
      analysis.quantity === 576 &&
      analysis.fabric === 'Acrylic/Airmesh' &&
      analysis.closure === 'Flexfit' &&
      analysis.allLogoRequirements.length === 4 &&
      analysis.accessoriesRequirements.length === 2;

    console.log('\n✅ FIX VALIDATION:', {
      correctQuantity: analysis.quantity === 576,
      fabricPreserved: analysis.fabric === 'Acrylic/Airmesh',
      closurePreserved: analysis.closure === 'Flexfit',
      logosPreserved: analysis.allLogoRequirements.length === 4,
      accessoriesPreserved: analysis.accessoriesRequirements.length === 2,
      OVERALL_SUCCESS: isFixWorking
    });

    if (isFixWorking) {
      console.log('\n🎉 CRITICAL FIX SUCCESSFUL! Quantity update now preserves all specifications.');
    } else {
      console.log('\n❌ FIX VALIDATION FAILED! Issues remain with context preservation.');
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

// Export for module testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { testQuantityUpdateFix };
} else {
  testQuantityUpdateFix();
}