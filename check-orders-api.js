/**
 * Check Orders API Response Format
 */

const fetch = require('node-fetch');

async function checkOrdersAPI() {
  console.log('🔍 Checking Orders API Response Format...\n');
  
  try {
    // Try different parameter combinations
    const tests = [
      'http://localhost:3001/api/orders',
      'http://localhost:3001/api/orders?all=true',
      'http://localhost:3001/api/orders?limit=10',
      'http://localhost:3001/api/orders?email=redxtrm02@gmail.com'
    ];
    
    for (const url of tests) {
      console.log(`\n📡 Testing: ${url}`);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      console.log(`Status: ${response.status}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`Response type: ${typeof data}`);
        console.log(`Is array: ${Array.isArray(data)}`);
        
        if (Array.isArray(data)) {
          console.log(`Count: ${data.length}`);
          if (data.length > 0) {
            console.log('Sample order:', JSON.stringify(data[0], null, 2));
          }
        } else {
          console.log('Response:', JSON.stringify(data, null, 2));
        }
      } else {
        const errorText = await response.text();
        console.log('Error:', errorText);
      }
    }
    
  } catch (error) {
    console.error('❌ API check failed:', error.message);
  }
}

checkOrdersAPI();