// Test the OrderAsset model specifically
async function testOrderAsset() {
  console.log('Testing OrderAsset table...');
  
  try {
    const response = await fetch('http://localhost:3004/api/test-db');
    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Database connection works');
      console.log('Counts:', result.counts);
    } else {
      console.log('❌ Database test failed:', result.error);
    }
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
if (typeof window === 'undefined') {
  testOrderAsset();
} else {
  window.testOrderAsset = testOrderAsset;
}