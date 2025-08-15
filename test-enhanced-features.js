// Test script for enhanced features: logo position presets and delivery costs
const testCases = [
  {
    name: "Logo Position Presets - Multiple Logos",
    data: {
      selectedSizes: { "medium": 48 },
      logoSetupSelections: {
        "flat-embroidery": {
          position: "Front",
          size: "Large",
          application: "Direct"
        },
        "3d-embroidery": {
          position: "Back", 
          size: "Medium",
          application: "Direct"
        },
        "printed-patch": {
          position: "Left",
          size: "Small", 
          application: "Satin"
        }
      },
      multiSelectOptions: {
        "logo-setup": ["flat-embroidery", "3d-embroidery", "printed-patch"]
      },
      selectedOptions: {
        "delivery-type": "regular"
      },
      baseProductPricing: {
        price48: 5.00,
        price144: 4.50,
        price576: 4.00,
        price1152: 3.75,
        price2880: 3.50,
        price10000: 3.25
      }
    },
    expected: "Should show 3 logos with positions Front, Back, Left and delivery cost"
  },
  {
    name: "Delivery Cost - Regular (48 qty)",
    data: {
      selectedSizes: { "small": 48 },
      logoSetupSelections: {},
      multiSelectOptions: {
        "logo-setup": []
      },
      selectedOptions: {
        "delivery-type": "regular"
      },
      baseProductPricing: {
        price48: 5.00,
        price144: 4.50,
        price576: 4.00,
        price1152: 3.75,
        price2880: 3.50,
        price10000: 3.25
      }
    },
    expected: "Regular Delivery ($3.00) × 48 = $144.00"
  },
  {
    name: "Delivery Cost - Priority (48 qty)",
    data: {
      selectedSizes: { "small": 48 },
      logoSetupSelections: {},
      multiSelectOptions: {
        "logo-setup": []
      },
      selectedOptions: {
        "delivery-type": "priority"
      },
      baseProductPricing: {
        price48: 5.00,
        price144: 4.50,
        price576: 4.00,
        price1152: 3.75,
        price2880: 3.50,
        price10000: 3.25
      }
    },
    expected: "Priority Delivery ($3.20) × 48 = $153.60"
  },
  {
    name: "Delivery Cost - Air Freight (3168 qty)",
    data: {
      selectedSizes: { "large": 3168 },
      logoSetupSelections: {},
      multiSelectOptions: {
        "logo-setup": []
      },
      selectedOptions: {
        "delivery-type": "air-freight"
      },
      baseProductPricing: {
        price48: 5.00,
        price144: 4.50,
        price576: 4.00,
        price1152: 3.75,
        price2880: 3.50,
        price10000: 3.25
      }
    },
    expected: "Air Freight ($1.20) × 3168 = $3801.60"
  }
];

async function testEnhancedFeatures() {
  console.log('🚀 Testing Enhanced Features: Logo Position Presets & Delivery Costs\n');
  
  for (const testCase of testCases) {
    console.log(`--- ${testCase.name} ---`);
    console.log(`Expected: ${testCase.expected}`);
    
    try {
      const response = await fetch('http://localhost:3000/api/calculate-cost', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testCase.data)
      });
      
      if (!response.ok) {
        console.log(`❌ HTTP error: ${response.status}`);
        continue;
      }
      
      const result = await response.json();
      
      console.log('API Response:');
      console.log(`- Base Product Cost: $${result.baseProductCost}`);
      console.log(`- Total Units: ${result.totalUnits}`);
      
      if (result.logoSetupCosts && result.logoSetupCosts.length > 0) {
        console.log('✅ Logo Setup Costs:');
        result.logoSetupCosts.forEach(cost => {
          console.log(`  - ${cost.name}: $${cost.cost.toFixed(2)} (Unit: $${cost.unitPrice.toFixed(2)}) - ${cost.details}`);
        });
      }
      
      if (result.deliveryCosts && result.deliveryCosts.length > 0) {
        console.log('✅ Delivery Costs:');
        result.deliveryCosts.forEach(cost => {
          console.log(`  - ${cost.name}: $${cost.cost.toFixed(2)} (Unit: $${cost.unitPrice.toFixed(2)})`);
        });
      }
      
      console.log(`📊 Total Cost: $${result.totalCost.toFixed(2)}`);
      
    } catch (error) {
      console.error('❌ Test failed:', error.message);
    }
    
    console.log(''); // Empty line
  }
}

testEnhancedFeatures();
