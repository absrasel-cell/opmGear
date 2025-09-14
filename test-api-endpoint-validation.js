/**
 * API ENDPOINT VALIDATION TEST
 * Tests the actual /api/support/order-creation endpoint with the user's prompt and 4 quantities
 */

const BASE_URL = 'http://localhost:3000';
const TEST_PROMPT = "i need 7-Panel Cap, Polyester/Laser Cut Fabric, Black/Grey, Size: 59 cm, Slight Curved. Leather Patch Front, 3D Embroidery on Left, Flat Embroidery on Right, Rubber patch on back. Closure Fitted. Hang Tag, Sticker.";

const TEST_QUANTITIES = [
  { qty: 48, description: '48 pieces' },
  { qty: 144, description: '144 pieces' },
  { qty: 600, description: '600 pieces' },
  { qty: 3000, description: '3000 pieces' }
];

async function testAPIEndpoint(quantity) {
  const prompt = `${quantity} ${TEST_PROMPT}`;
  
  console.log(`\n🧪 TESTING API: ${quantity} pieces`);
  console.log(`📝 Prompt: "${prompt}"`);
  console.log('-'.repeat(60));

  try {
    const response = await fetch(`${BASE_URL}/api/support/order-creation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: prompt,
        conversationId: `test-${Date.now()}-${quantity}`,
        context: 'QUOTE_REQUEST'
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    console.log('✅ API Response received');
    
    // Extract pricing information if available in response
    if (data.response && typeof data.response === 'string') {
      const responseText = data.response;
      
      // Look for pricing patterns in the response
      const priceMatches = responseText.match(/\$[\d,]+\.?\d*/g);
      const totalMatch = responseText.match(/Total.*?\$[\d,]+\.?\d*/i);
      
      console.log('💰 Detected pricing in response:');
      if (priceMatches) {
        console.log(`   All prices: ${priceMatches.join(', ')}`);
      }
      if (totalMatch) {
        console.log(`   ${totalMatch[0]}`);
      }
      
      // Check for critical failure indicators
      const hasErrors = responseText.toLowerCase().includes('error') || 
                       responseText.toLowerCase().includes('failed') ||
                       responseText.toLowerCase().includes('sorry');
      
      if (hasErrors) {
        console.log('❌ API response contains error indicators');
        console.log(`   Response snippet: "${responseText.substring(0, 200)}..."`);
        return { success: false, quantity, error: 'Response contains errors' };
      } else {
        console.log('✅ API response appears successful');
        return { success: true, quantity, responseText };
      }
    } else {
      console.log('⚠️  No text response found in API data');
      return { success: false, quantity, error: 'No response text' };
    }

  } catch (error) {
    console.log(`❌ API call failed: ${error.message}`);
    return { success: false, quantity, error: error.message };
  }
}

async function runAPIValidation() {
  console.log('🚀 BACKEND API ENDPOINT VALIDATION');
  console.log('=' .repeat(80));
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Endpoint: /api/support/order-creation`);
  console.log('=' .repeat(80));

  const results = [];
  let successCount = 0;
  
  for (const { qty } of TEST_QUANTITIES) {
    const result = await testAPIEndpoint(qty);
    results.push(result);
    
    if (result.success) {
      successCount++;
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 API VALIDATION RESULTS');
  console.log('='.repeat(80));
  
  console.log(`✅ Successful requests: ${successCount}/${TEST_QUANTITIES.length}`);
  console.log(`❌ Failed requests: ${TEST_QUANTITIES.length - successCount}/${TEST_QUANTITIES.length}`);
  
  if (successCount === TEST_QUANTITIES.length) {
    console.log('\n🎉 ALL API TESTS PASSED! The backend is working correctly.');
  } else {
    console.log('\n🚨 SOME API TESTS FAILED');
    
    const failures = results.filter(r => !r.success);
    console.log('\n❌ Failed requests:');
    failures.forEach(failure => {
      console.log(`   ${failure.quantity} pieces: ${failure.error}`);
    });
  }
  
  console.log('='.repeat(80));
  return results;
}

// Auto-run if this is the main module
if (require.main === module) {
  runAPIValidation()
    .then(results => {
      const allPassed = results.every(r => r.success);
      process.exit(allPassed ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 VALIDATION FRAMEWORK ERROR:', error);
      process.exit(1);
    });
}

module.exports = { runAPIValidation, testAPIEndpoint, TEST_PROMPT, TEST_QUANTITIES };