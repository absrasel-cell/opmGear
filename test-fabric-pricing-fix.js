/**
 * Test script to verify fabric pricing fix
 * Tests the calculate-cost API with dual fabric setup (Duck Camo/Black Trucker Mesh)
 */

const BASE_URL = 'http://localhost:3010';

async function testFabricPricing() {
  console.log('🧪 Testing Fabric Pricing Fix...');
  console.log('================================');
  
  // Test case: 144 caps with Duck Camo/Black Trucker Mesh (same as error report)
  const testRequest = {
    selectedColors: {
      'Duck Camo': { sizes: { '59cm': 144 } }
    },
    logoSetupSelections: {
      'Large 3D Embroidery (Front, Large, Direct)': { position: 'Front', size: 'Large', application: 'Direct' },
      'Small 3D Embroidery (Left, Small, Direct)': { position: 'Left', size: 'Small', application: 'Direct' },
      'Small 3D Embroidery (Back, Small, Direct)': { position: 'Back', size: 'Small', application: 'Direct' }
    },
    multiSelectOptions: {
      'logo-setup': [
        'Large 3D Embroidery (Front, Large, Direct)',
        'Small 3D Embroidery (Left, Small, Direct)', 
        'Small 3D Embroidery (Back, Small, Direct)'
      ],
      'accessories': ['Hang Tag', 'Sticker', 'Inside Label', 'B-Tape Print']
    },
    selectedOptions: {
      'fabric-setup': 'Duck Camo/Black Trucker Mesh',
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
    console.log('📞 Calling calculate-cost API...');
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
    const hasTruckerMeshCost = result.premiumFabricCosts?.some(f => 
      f.name.toLowerCase().includes('trucker mesh') || 
      f.name.toLowerCase().includes('trucker')
    );
    const hasDuckCamoCost = result.premiumFabricCosts?.some(f => 
      f.name.toLowerCase().includes('duck camo') || 
      f.name.toLowerCase().includes('camo')
    );
    
    console.log(`   ❌ Trucker Mesh premium cost found: ${hasTruckerMeshCost} (should be false - it's FREE)`);
    console.log(`   ❓ Duck Camo premium cost found: ${hasDuckCamoCost} (depends on fabric definition)`);
    
    if (!hasTruckerMeshCost) {
      console.log('   ✅ SUCCESS: Trucker Mesh correctly shows as FREE (no premium fabric cost)');
    } else {
      console.log('   ❌ FAILED: Trucker Mesh incorrectly showing as premium fabric');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.cause) {
      console.error('   Cause:', error.cause);
    }
  }
}

// Run the test
testFabricPricing().then(() => {
  console.log('🏁 Test completed');
}).catch(error => {
  console.error('💥 Test execution failed:', error);
});