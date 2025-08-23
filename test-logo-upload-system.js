// Test script for the Logo Upload and Instructions System
// This tests the basic API endpoints and functionality

const BASE_URL = 'http://localhost:3000';

async function testLogoUploadSystem() {
  console.log('🧪 Testing Logo Upload System...\n');

  // First, we need a valid order ID - let's create one or use an existing one
  const testOrderId = 'test-order-' + Date.now();
  
  try {
    // Test 1: Initiate upload endpoint
    console.log('1. Testing initiate upload endpoint...');
    const initiateResponse = await fetch(`${BASE_URL}/api/orders/${testOrderId}/assets/initiate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        files: [
          {
            name: 'test-logo.png',
            mimeType: 'image/png',
            sizeBytes: 1024 * 100, // 100KB
            kind: 'LOGO'
          }
        ]
      })
    });

    if (initiateResponse.status === 401) {
      console.log('❌ Authentication required - make sure you have a valid session');
      return false;
    }

    console.log(`   Status: ${initiateResponse.status}`);
    if (!initiateResponse.ok) {
      const error = await initiateResponse.text();
      console.log(`   Error: ${error}`);
    } else {
      console.log('   ✅ Initiate endpoint working');
    }

    // Test 2: Get assets endpoint  
    console.log('\n2. Testing get assets endpoint...');
    const getResponse = await fetch(`${BASE_URL}/api/orders/${testOrderId}/assets`);
    console.log(`   Status: ${getResponse.status}`);
    
    if (getResponse.ok) {
      const assets = await getResponse.json();
      console.log(`   ✅ Assets retrieved: ${assets.length} items`);
    } else {
      console.log(`   ⚠️  Assets endpoint returned ${getResponse.status}`);
    }

    // Test 3: Update instruction endpoint
    console.log('\n3. Testing update instruction endpoint...');
    const instructionResponse = await fetch(`${BASE_URL}/api/orders/${testOrderId}/instruction`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        additionalInstruction: 'Test instruction from API test'
      })
    });

    console.log(`   Status: ${instructionResponse.status}`);
    if (instructionResponse.ok) {
      console.log('   ✅ Instruction update working');
    } else {
      const error = await instructionResponse.text();
      console.log(`   ⚠️  Instruction update error: ${error}`);
    }

    // Test 4: Validation schemas
    console.log('\n4. Testing validation...');
    
    // Test invalid file type
    const invalidResponse = await fetch(`${BASE_URL}/api/orders/${testOrderId}/assets/initiate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        files: [
          {
            name: 'test.exe',
            mimeType: 'application/x-executable',
            sizeBytes: 1024,
            kind: 'LOGO'
          }
        ]
      })
    });

    if (invalidResponse.status === 400) {
      console.log('   ✅ Validation correctly rejected invalid file type');
    } else {
      console.log(`   ⚠️  Validation should have rejected invalid file type (got ${invalidResponse.status})`);
    }

    // Test file size limit
    const oversizeResponse = await fetch(`${BASE_URL}/api/orders/${testOrderId}/assets/initiate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        files: [
          {
            name: 'huge-file.png',
            mimeType: 'image/png',
            sizeBytes: 25 * 1024 * 1024, // 25MB - over limit
            kind: 'LOGO'
          }
        ]
      })
    });

    if (oversizeResponse.status === 400) {
      console.log('   ✅ Validation correctly rejected oversized file');
    } else {
      console.log(`   ⚠️  Validation should have rejected oversized file (got ${oversizeResponse.status})`);
    }

    console.log('\n🎉 Basic API tests completed!');
    console.log('\nNOTE: Full testing requires:');
    console.log('- Valid authentication session');
    console.log('- Supabase storage bucket configured');
    console.log('- Database with orders and orderassets tables');
    console.log('- Testing with actual file uploads via browser');

    return true;

  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
}

// Check if we're running in Node.js
if (typeof window === 'undefined') {
  // Check if fetch is available (Node.js 18+)
  if (typeof fetch !== 'undefined') {
    testLogoUploadSystem().then(success => {
      process.exit(success ? 0 : 1);
    });
  } else {
    console.log('This test requires Node.js 18+ or a fetch polyfill');
    console.log('Alternatively, run this in a browser console while on your app');
  }
} else {
  // Running in browser
  window.testLogoUploadSystem = testLogoUploadSystem;
  console.log('Logo upload test function loaded. Run: testLogoUploadSystem()');
}