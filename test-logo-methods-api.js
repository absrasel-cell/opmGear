/**
 * Test logo methods via API to check Supabase data
 */

const apiUrl = 'http://localhost:3000';

async function testLogoMethod(name, size, application, quantity = 600) {
  try {
    const response = await fetch(`${apiUrl}/api/pricing/logo-price`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, size, application, quantity })
    });

    if (response.ok) {
      const data = await response.json();
      return {
        success: true,
        unitPrice: data.unitPrice,
        moldCharge: data.moldCharge || 0,
        tier: data.tier
      };
    } else {
      return { success: false, error: `HTTP ${response.status}` };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function runTests() {
  console.log('🔍 [LOGO-API-TEST] Testing logo pricing API with CSV expected values...\n');

  // Define test cases based on CSV data (600 pieces = price_576 tier)
  const testCases = [
    // Working embroidery (we know these work)
    { name: '3D Embroidery', size: 'Small', app: 'Direct', expected: 1.18, category: 'Working' },
    { name: 'Flat Embroidery', size: 'Medium', app: 'Direct', expected: 1.38, category: 'Working' },

    // Missing patches (we suspect these are missing)
    { name: 'Leather Patch', size: 'Large', app: 'Patch', expected: 2.63, category: 'Missing' },
    { name: 'Rubber Patch', size: 'Large', app: 'Patch', expected: 3.00, category: 'Missing' },
    { name: 'Leather', size: 'Large', app: 'Patch', expected: 2.63, category: 'Missing' },
    { name: 'Rubber', size: 'Large', app: 'Patch', expected: 3.00, category: 'Missing' },

    // Other methods to check
    { name: 'Woven', size: 'Medium', app: 'Patch', expected: 2.00, category: 'Check' },
    { name: 'Screen Print', size: 'Large', app: 'Direct', expected: 1.75, category: 'Check' },
    { name: 'Sublimation', size: 'Small', app: 'Direct', expected: 0.88, category: 'Check' },
  ];

  const results = {
    working: [],
    missing: [],
    priceErrors: []
  };

  for (const test of testCases) {
    console.log(`Testing: ${test.name} | ${test.app} | ${test.size} | Expected: $${test.expected}`);

    const result = await testLogoMethod(test.name, test.size, test.app, 600);

    if (result.success) {
      const actualPrice = result.unitPrice;
      const priceDiff = Math.abs(actualPrice - test.expected);

      if (priceDiff < 0.01) {
        console.log(`  ✅ Found with correct price: $${actualPrice}`);
        results.working.push({ ...test, actualPrice });
      } else {
        console.log(`  ⚠️ Found with wrong price: $${actualPrice} (expected $${test.expected})`);
        results.priceErrors.push({ ...test, actualPrice, expected: test.expected });
      }
    } else {
      console.log(`  ❌ Not found: ${result.error}`);
      results.missing.push({ ...test, error: result.error });
    }

    console.log(''); // Empty line for readability
  }

  // Summary
  console.log('📊 [SUMMARY]');
  console.log(`✅ Working correctly: ${results.working.length}`);
  console.log(`⚠️ Price mismatches: ${results.priceErrors.length}`);
  console.log(`❌ Missing from database: ${results.missing.length}\n`);

  if (results.missing.length > 0) {
    console.log('❌ [MISSING LOGO METHODS]');
    results.missing.forEach(item => {
      console.log(`  - ${item.name} | ${item.app} | ${item.size} | Should be $${item.expected}`);
    });
    console.log('');
  }

  if (results.priceErrors.length > 0) {
    console.log('⚠️ [PRICE MISMATCHES]');
    results.priceErrors.forEach(item => {
      console.log(`  - ${item.name} | ${item.app} | ${item.size} | Got $${item.actualPrice}, expected $${item.expected}`);
    });
    console.log('');
  }

  if (results.working.length > 0) {
    console.log('✅ [WORKING CORRECTLY]');
    results.working.forEach(item => {
      console.log(`  - ${item.name} | ${item.app} | ${item.size} | $${item.actualPrice}`);
    });
  }
}

runTests().catch(console.error);