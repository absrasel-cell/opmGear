// Quick test to verify Cost Calculator API margin application
const testData = {
  selectedColors: {
    "Carolina Blue": { sizes: { "One Size": 144 } },
    "Sage": { sizes: { "One Size": 48 } }
  },
  logoSetupSelections: {
    "flat-embroidery": { position: "front", size: "Large", application: "Direct" },
    "3d-embroidery": { position: "front", size: "Large", application: "Direct" },
    "rubber-patch": { position: "front", size: "Small", application: "Direct" },
    "leather-patch": { position: "front", size: "Small", application: "Direct" },
    "size-embroidery": { position: "front", size: "Small", application: "Direct" }
  },
  multiSelectOptions: {
    "logo-setup": ["flat-embroidery", "3d-embroidery", "rubber-patch", "leather-patch", "size-embroidery"]
  },
  selectedOptions: {
    "accessories": "Sticker",
    "closure-type": "Stretched", 
    "fabric-setup": "Laser Cut",
    "delivery-type": "regular"
  },
  baseProductPricing: {
    price48: 2.20,
    price144: 1.60,
    price576: 1.50,
    price1152: 1.45,
    price2880: 1.40,
    price10000: 1.35
  },
  priceTier: 'Tier 2'
};

async function testCostCalculator() {
  try {
    const response = await fetch('http://localhost:3000/api/calculate-cost', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testData)
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('=== COST CALCULATOR TEST RESULTS ===');
      console.log('Total Cost:', result.totalCost);
      console.log('Base Product Cost:', result.baseProductCost);
      console.log('\nLogo Setups:');
      result.logoSetupCosts.forEach(logo => {
        console.log(`  ${logo.details}: $${logo.unitPrice} per unit (total: $${logo.cost})`);
        if (logo.customerUnitPrice) {
          console.log(`    Customer Price: $${logo.customerUnitPrice} per unit (total: $${logo.customerCost})`);
        }
      });
      console.log('\nAccessories:');
      result.accessoriesCosts.forEach(acc => {
        console.log(`  ${acc.name}: $${acc.unitPrice} per unit (total: $${acc.cost})`);
        if (acc.customerUnitPrice) {
          console.log(`    Customer Price: $${acc.customerUnitPrice} per unit (total: $${acc.customerCost})`);
        }
      });
    } else {
      console.error('API call failed:', response.status, await response.text());
    }
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testCostCalculator();