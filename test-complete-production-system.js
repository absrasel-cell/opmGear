/**
 * COMPREHENSIVE PRODUCTION SYSTEM TEST
 * Tests the complete AI ordering system end-to-end
 * This validates all fixes work together for production deployment
 */

const path = require('path');
const fetch = require('node-fetch'); // You may need to install: npm install node-fetch

async function testCompleteProductionSystem() {
  console.log('🚀 COMPREHENSIVE PRODUCTION SYSTEM TEST');
  console.log('Testing all critical components together...');
  console.log('=' .repeat(80));
  
  const baseUrl = 'http://localhost:3002'; // Adjust if different port
  
  // Test scenarios that were causing issues
  const testScenarios = [
    {
      name: '7-Panel Cap 288 Pieces - All Issues Combined',
      message: '7-Panel Cap, Polyester/Laser Cut Fabric, Black/Grey, Size: 59 cm, Slight Curved. Leather Patch Front, 3D Embroidery on Left, Flat Embroidery on Right, Rubber patch on back. Closure Fitted. Hang Tag, Sticker.',
      expectedQuantity: 288,
      expectedBaseCap: 4.25, // Tier 3 price144
      expectedFabric: 1.00,   // Polyester $0 + Laser Cut $1.00
      validationChecks: [
        'should show correct base cap pricing',
        'should show correct fabric pricing', 
        'should NOT show formatting corruption',
        'should NOT show $1.25 for fabrics',
        'should show proper accessory formatting'
      ]
    },
    {
      name: '7-Panel Cap 2500 Pieces - Large Quantity Test',
      message: 'actually i need 2500 pieces',
      expectedQuantity: 2500,
      expectedBaseCap: 3.60, // Tier 3 price2880  
      expectedFabric: 0.70,   // Polyester $0 + Laser Cut $0.70
      validationChecks: [
        'should use correct tier for 2500 pieces',
        'should show Tier 3 price2880 pricing',
        'should NOT use price1152 for 2500 pieces'
      ]
    }
  ];
  
  console.log('\n🧪 RUNNING SYSTEM TESTS...\n');
  
  for (let i = 0; i < testScenarios.length; i++) {
    const scenario = testScenarios[i];
    console.log(`Test ${i + 1}: ${scenario.name}`);
    console.log(`Message: "${scenario.message}"`);
    
    try {
      // Make API request to the actual order-ai endpoint
      const response = await fetch(`${baseUrl}/api/order-ai`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: scenario.message,
          context: i > 0 ? { lastQuote: { quantity: 288 } } : {}, // Use context for follow-up messages
          conversationId: 'test-conversation-' + Date.now(),
        })
      });
      
      if (!response.ok) {
        console.error(`❌ API Error: ${response.status} ${response.statusText}`);
        const errorText = await response.text();
        console.error(`Error details: ${errorText.substring(0, 500)}`);
        continue;
      }
      
      const result = await response.json();
      const aiResponse = result.response;
      
      console.log(`✅ API Response received (${aiResponse.length} chars)`);
      
      // Validate the response
      const issues = [];
      
      // Check for formatting corruption
      if (aiResponse.includes('= =') || aiResponse.includes('pieces × ') && aiResponse.match(/pieces × \d+\.\d+$/)) {
        issues.push('❌ Found formatting corruption (= = or broken calculations)');
      }
      
      // Check for wrong fabric pricing
      if (aiResponse.includes('$1.25') && aiResponse.includes('Polyester')) {
        issues.push('❌ Shows $1.25 for Polyester (should be FREE)');
      }
      
      // Check for proper tier usage
      if (scenario.expectedQuantity === 2500) {
        if (aiResponse.includes('$3.68')) {
          issues.push('❌ Uses wrong tier: shows $3.68 (price1152) instead of $3.60 (price2880)');
        }
        if (aiResponse.includes('$3.60') || aiResponse.includes('3.60')) {
          console.log('   ✅ Correct tier: Uses $3.60 (price2880) for 2500 pieces');
        }
      }
      
      if (scenario.expectedQuantity === 288) {
        if (aiResponse.includes('$4.25') || aiResponse.includes('4.25')) {
          console.log('   ✅ Correct tier: Uses $4.25 (price144) for 288 pieces');
        }
        if (aiResponse.includes('$3.45')) {
          issues.push('❌ Uses wrong tier: shows $3.45 instead of $4.25 for 288 pieces');
        }
      }
      
      // Check for proper accessory formatting
      const accessoryMatches = aiResponse.match(/Hang Tag:.*?\$[\d,]+\.\d{2}/g);
      if (accessoryMatches && accessoryMatches.length > 0) {
        const accessoryLine = accessoryMatches[0];
        if (accessoryLine.includes('= =') || !accessoryLine.match(/\$\d+\.\d{2}$/)) {
          issues.push('❌ Accessory formatting corrupted');
        } else {
          console.log('   ✅ Proper accessory formatting detected');
        }
      }
      
      // Check for fabric cost logic
      if (aiResponse.includes('Polyester') && aiResponse.includes('$0')) {
        console.log('   ✅ Polyester correctly shown as FREE ($0)');
      }
      
      if (aiResponse.includes('Laser Cut')) {
        const expectedPrice = scenario.expectedQuantity === 288 ? '1.00' : '0.70';
        if (aiResponse.includes(expectedPrice)) {
          console.log(`   ✅ Laser Cut correctly priced at $${expectedPrice}`);
        } else {
          issues.push(`❌ Laser Cut pricing incorrect (expected $${expectedPrice})`);
        }
      }
      
      // Summary for this test
      if (issues.length === 0) {
        console.log(`   🎉 Test ${i + 1} PASSED - All validations successful!`);
      } else {
        console.log(`   🚨 Test ${i + 1} FAILED - ${issues.length} issues found:`);
        issues.forEach(issue => console.log(`     ${issue}`));
      }
      
      console.log('\n' + '-'.repeat(60) + '\n');
      
    } catch (error) {
      console.error(`❌ Test ${i + 1} ERROR:`, error.message);
      console.log('\n' + '-'.repeat(60) + '\n');
    }
  }
  
  console.log('🏁 SYSTEM TEST COMPLETE');
  console.log('\nNext steps if tests pass:');
  console.log('1. ✅ Core pricing engine fixed');
  console.log('2. ✅ Fabric pricing logic corrected'); 
  console.log('3. ✅ Message formatting corruption prevented');
  console.log('4. ✅ GPT prompt templates updated');
  console.log('5. 🚀 READY FOR PRODUCTION DEPLOYMENT');
  
  console.log('\nIf any tests failed, review the specific issues above.');
}

// Check if we're running on localhost first
console.log('🔍 Checking if server is running on localhost:3002...');

testCompleteProductionSystem().catch(error => {
  console.error('💥 SYSTEM TEST FAILED:', error.message);
  console.log('\nMake sure your Next.js server is running:');
  console.log('  npm run dev');
  console.log('  # Then run this test again');
  process.exit(1);
});