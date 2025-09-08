/**
 * Test script to verify Air Mesh premium fabric pricing
 * Tests the calculate-cost API with Air Mesh fabric (should show $0.88 per cap at 144 quantity)
 */

const BASE_URL = 'http://localhost:3010';

async function testAirMeshPricing() {
  console.log('🧪 Testing Air Mesh Premium Fabric Pricing...');
  console.log('============================================');
  
  // Test case: 144 caps with Air Mesh fabric (should be premium)
  const testRequest = {
    selectedColors: {
      'Black': { sizes: { '59cm': 144 } }
    },
    logoSetupSelections: {
      'Large 3D Embroidery (Front, Large, Direct)': { position: 'Front', size: 'Large', application: 'Direct' }
    },
    multiSelectOptions: {
      'logo-setup': ['Large 3D Embroidery (Front, Large, Direct)'],
      'accessories': ['Sticker']
    },
    selectedOptions: {
      'fabric-setup': 'Air Mesh',
      'delivery-type': 'regular',
      'closure-type': 'snapback'
    },
    baseProductPricing: {
      price48: 5.50,
      price144: 3.00,
      price576: 2.90,
      price1152: 2.84,
      price2880: 2.75,
      price10000: 2.60
    },
    priceTier: 'Tier 1'
  };

  try {
    console.log('📞 Calling calculate-cost API with Air Mesh...');
    const response = await fetch(`${BASE_URL}/api/calculate-cost`, {
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
    
    console.log('✅ API Response received');
    console.log('📊 Cost Breakdown:');
    console.log(`   Base Product: $${result.baseProductCost?.toFixed(2)}`);
    console.log(`   Logo Setup: $${result.logoSetupCosts?.reduce((sum, cost) => sum + cost.cost, 0).toFixed(2)}`);
    console.log(`   Premium Fabric: $${result.premiumFabricCosts?.reduce((sum, cost) => sum + cost.cost, 0).toFixed(2)}`);
    console.log(`   Accessories: $${result.accessoriesCosts?.reduce((sum, cost) => sum + cost.cost, 0).toFixed(2)}`);
    console.log(`   Delivery: $${result.deliveryCosts?.reduce((sum, cost) => sum + cost.cost, 0).toFixed(2)}`);
    console.log(`   TOTAL: $${result.totalCost?.toFixed(2)}`);
    console.log('');
    
    // Check fabric pricing specifically
    console.log('🧵 Fabric Analysis:');
    if (result.premiumFabricCosts && result.premiumFabricCosts.length > 0) {
      result.premiumFabricCosts.forEach(fabric => {
        console.log(`   ${fabric.name}: $${fabric.cost.toFixed(2)} ($${fabric.unitPrice.toFixed(2)} per cap)`);
      });
    } else {
      console.log('   No premium fabric costs found');
    }
    
    // Expected results validation
    console.log('');
    console.log('🔍 Validation:');
    const airMeshCost = result.premiumFabricCosts?.find(f => 
      f.name.toLowerCase().includes('air mesh')
    );
    
    if (airMeshCost) {
      console.log(`   ✅ Air Mesh premium cost found: $${airMeshCost.cost.toFixed(2)} total`);
      console.log(`   ✅ Air Mesh unit cost: $${airMeshCost.unitPrice.toFixed(2)} per cap`);
      
      // Check if unit price is close to expected $0.88
      const expectedUnitPrice = 0.88;
      const tolerance = 0.05;
      if (Math.abs(airMeshCost.unitPrice - expectedUnitPrice) <= tolerance) {
        console.log(`   ✅ SUCCESS: Air Mesh unit price ${airMeshCost.unitPrice.toFixed(2)} is close to expected $0.88`);
      } else {
        console.log(`   ❌ ISSUE: Air Mesh unit price ${airMeshCost.unitPrice.toFixed(2)} differs from expected $0.88`);
      }
    } else {
      console.log('   ❌ FAILED: Air Mesh premium fabric cost not found');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.cause) {
      console.error('   Cause:', error.cause);
    }
  }
}

// Run the test
testAirMeshPricing().then(() => {
  console.log('🏁 Test completed');
}).catch(error => {
  console.error('💥 Test execution failed:', error);
});