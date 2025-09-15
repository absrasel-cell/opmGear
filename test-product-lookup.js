/**
 * Test script to verify product lookup API
 * Tests the specific issue where correct product data returns wrong product
 */

const fetch = require('node-fetch');

async function testProductLookup() {
  console.log('🔍 TESTING Product Lookup API');
  console.log('='.repeat(60));

  // Test data that should match "6P AirFrame HSCS"
  const testCapDetails = {
    productName: "6P AirFrame HSCS", // Exact product name
    quantity: 800,
    size: "59cm",
    color: "Royal/Black",
    colors: ["Royal", "Black"],
    profile: "High",
    billShape: "Slight Curved",
    structure: "Structured with Mono Lining",
    fabric: "Acrylic/Air Mesh",
    closure: "Fitted",
    stitching: "Matching",
    panelCount: 6,
    _timestamp: Date.now()
  };

  console.log('📤 SENDING REQUEST:');
  console.log(JSON.stringify(testCapDetails, null, 2));

  try {
    const response = await fetch('http://localhost:3000/api/product-info', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testCapDetails)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();

    console.log('\n📥 API RESPONSE:');
    console.log(JSON.stringify(result, null, 2));

    // Validate the response
    if (result.success && result.data) {
      const productName = result.data.name;

      console.log('\n🔍 VALIDATION:');
      console.log('='.repeat(60));

      const tests = [
        {
          name: "Product Name Match",
          expected: "6P AirFrame HSCS",
          actual: productName,
          passed: productName === "6P AirFrame HSCS"
        },
        {
          name: "Panel Count Match",
          expected: 6,
          actual: result.data.panel_count,
          passed: result.data.panel_count === 6
        },
        {
          name: "Profile Match",
          expected: "High",
          actual: result.data.profile,
          passed: result.data.profile === "High"
        }
      ];

      tests.forEach(test => {
        const status = test.passed ? '✅ PASS' : '❌ FAIL';
        console.log(`${status} ${test.name}: Expected "${test.expected}", Got "${test.actual}"`);
      });

      const passedTests = tests.filter(t => t.passed).length;
      console.log(`\n📊 RESULT: ${passedTests}/${tests.length} tests passed`);

      if (passedTests !== tests.length) {
        console.log('\n❌ PRODUCT LOOKUP ISSUES DETECTED:');
        tests.filter(t => !t.passed).forEach(test => {
          console.log(`   - ${test.name}: Expected "${test.expected}", Got "${test.actual}"`);
        });
        console.log('\n🔧 This indicates the product lookup API is returning incorrect data');
        console.log('   The issue is likely in /api/product-info or pricing-service.ts');
      } else {
        console.log('\n✅ PRODUCT LOOKUP IS WORKING CORRECTLY');
      }
    } else {
      console.log('❌ API returned error:', result);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n🔧 Make sure the development server is running:');
    console.log('   npm run dev');
  }
}

// Test without exact product name to see fallback behavior
async function testFallbackLookup() {
  console.log('\n\n🔍 TESTING Fallback Product Lookup (no exact name)');
  console.log('='.repeat(60));

  const fallbackCapDetails = {
    // No productName - should use specs matching
    quantity: 800,
    color: "Royal/Black",
    profile: "High",
    billShape: "Slight Curved",
    structure: "Structured with Mono Lining",
    fabric: "Acrylic/Air Mesh",
    closure: "Fitted",
    panelCount: 6,
    _timestamp: Date.now()
  };

  console.log('📤 SENDING FALLBACK REQUEST:');
  console.log(JSON.stringify(fallbackCapDetails, null, 2));

  try {
    const response = await fetch('http://localhost:3000/api/product-info', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(fallbackCapDetails)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();

    console.log('\n📥 FALLBACK API RESPONSE:');
    console.log(JSON.stringify(result, null, 2));

    if (result.success && result.data) {
      console.log(`\n🎯 FALLBACK RESULT: "${result.data.name}"`);
      console.log(`   Panel Count: ${result.data.panel_count}`);
      console.log(`   Profile: ${result.data.profile}`);

      if (result.data.name === "4P Visor Cap MSCS") {
        console.log('\n❌ FOUND THE PROBLEM!');
        console.log('   Fallback logic is returning "4P Visor Cap MSCS" instead of correct 6-panel');
        console.log('   This explains why saved conversations show the wrong product');
      }
    }

  } catch (error) {
    console.error('❌ Fallback test failed:', error.message);
  }
}

async function runTests() {
  await testProductLookup();
  await testFallbackLookup();

  console.log('\n\n🔍 SUMMARY:');
  console.log('='.repeat(60));
  console.log('This test checks if the product lookup API correctly identifies');
  console.log('"6P AirFrame HSCS" vs incorrectly returning "4P Visor Cap MSCS"');
  console.log('\nIf the fallback test shows "4P Visor Cap MSCS", that\'s the root cause');
  console.log('of the Order Builder restoration issue.');
}

runTests();