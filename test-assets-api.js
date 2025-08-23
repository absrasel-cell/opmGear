// Quick test for the assets API endpoint
const testOrderId = 'test-order-123';

async function testAssetsAPI() {
  console.log('Testing assets API endpoint...');
  
  try {
    const response = await fetch(`http://localhost:3004/api/orders/${testOrderId}/assets`);
    console.log(`Status: ${response.status}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Success! Assets endpoint returning JSON:', data);
    } else {
      const errorText = await response.text();
      console.log('Response:', errorText.substring(0, 200) + '...');
      
      // Check if it's JSON error or HTML error page
      if (errorText.includes('<!DOCTYPE html>')) {
        console.log('❌ Still getting HTML error page');
      } else {
        console.log('✅ Getting proper JSON error response');
      }
    }
  } catch (error) {
    console.error('Request failed:', error);
  }
}

// Run the test if this is executed directly
if (typeof window === 'undefined') {
  testAssetsAPI();
} else {
  window.testAssetsAPI = testAssetsAPI;
}