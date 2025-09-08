/**
 * Test script to verify AI quote generation with corrected fabric pricing
 * Tests the order-ai API with the same request that caused the original error
 */

const BASE_URL = 'http://localhost:3010';

async function testAIFabricQuote() {
  console.log('🤖 Testing AI Quote Generation with Fabric Pricing Fix...');
  console.log('========================================================');
  
  // Simulate the exact same customer request that caused the original error
  const testMessage = "Quote me for an order of 144 piece caps, Front Duck Camo Fabric, Back Fabric is Black Trucker Mesh. Size 59 cm. 3D embroidery on Front, one embroidery on Left, and another embroidery on back. Hangtag, Sticker, label, B-Tape print are required.";
  
  const testRequest = {
    message: testMessage,
    conversationHistory: [],
    userProfile: {
      name: "Test User",
      email: "test@example.com",
      company: "Test Company"
    }
  };

  try {
    console.log('📞 Calling order-ai API...');
    console.log(`📝 Message: "${testMessage}"`);
    console.log('');
    
    const response = await fetch(`${BASE_URL}/api/order-ai`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testRequest)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    console.log('✅ AI Response received');
    console.log('🎯 AI Quote Response:');
    console.log('==========================================');
    console.log(result.response);
    console.log('==========================================');
    console.log('');
    
    // Analyze the response for fabric pricing issues
    console.log('🔍 Analyzing AI Response for Fabric Pricing:');
    const response_text = result.response.toLowerCase();
    
    // Check for problematic patterns
    const hasTruckerMeshCost = response_text.includes('trucker mesh') && (
      response_text.includes('$2.90') || 
      response_text.includes('× $2.90') ||
      response_text.includes('$417.60')
    );
    
    const hasAirMeshCorrectCost = response_text.includes('air mesh') && (
      response_text.includes('$0.88') ||
      response_text.includes('$126.72')
    );
    
    const hasCorrectStructure = response_text.includes('premium fabric') || 
                               response_text.includes('fabric upgrade') ||
                               (!response_text.includes('trucker mesh (back): 144 pieces × $'));
    
    console.log(`   ❓ Contains Trucker Mesh $2.90 error: ${hasTruckerMeshCost}`);
    console.log(`   ✅ Contains Air Mesh $0.88 pricing: ${hasAirMeshCorrectCost}`);
    console.log(`   ✅ Uses correct cost structure: ${hasCorrectStructure}`);
    
    if (!hasTruckerMeshCost && hasCorrectStructure) {
      console.log('   ✅ SUCCESS: AI no longer shows Trucker Mesh as separate cap cost');
    } else if (hasTruckerMeshCost) {
      console.log('   ❌ ISSUE: AI still shows Trucker Mesh $2.90 error');
    }
    
    // Check for overall cost reasonableness
    const totalMatch = result.response.match(/total.*?\$([0-9,]+\.?[0-9]*)/i);
    if (totalMatch) {
      const totalCost = parseFloat(totalMatch[1].replace(',', ''));
      console.log(`   💰 Total cost quoted: $${totalCost.toFixed(2)}`);
      
      if (totalCost < 2500) {
        console.log('   ✅ Total cost is reasonable (under $2,500)');
      } else if (totalCost > 3000) {
        console.log('   ⚠️  Total cost is high (over $3,000) - may indicate fabric pricing still incorrect');
      } else {
        console.log('   ✅ Total cost is in acceptable range');
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.cause) {
      console.error('   Cause:', error.cause);
    }
  }
}

// Run the test
testAIFabricQuote().then(() => {
  console.log('🏁 AI quote test completed');
}).catch(error => {
  console.error('💥 Test execution failed:', error);
});