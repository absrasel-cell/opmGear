/**
 * Analyze the Services issue for order 7eb507da-1104-4558-a7bc-04b0d565646d
 * Why is it showing "regular-delivery" instead of "Graphics" or "Sampling"?
 */

const analyzeServicesIssue = async () => {
  console.log('🔍 Analyzing Services Issue for Order 7eb507da-1104-4558-a7bc-04b0d565646d');
  console.log('Expected: Services should show "Graphics" or "Sampling" with calculated costs');
  console.log('Actual: Services showing "regular-delivery" with no calculated data\n');

  try {
    // 1. Get the order details to see current multiSelectOptions
    console.log('1. Fetching order details from /api/orders...');
    const ordersResponse = await fetch('http://localhost:3002/api/orders?limit=1');
    const ordersData = await ordersResponse.json();
    const targetOrder = ordersData.orders.find(order => order.id === '7eb507da-1104-4558-a7bc-04b0d565646d');
    
    if (!targetOrder) {
      throw new Error('Target order not found');
    }

    console.log('📋 Order MultiSelect Options:');
    console.log(JSON.stringify(targetOrder.multiSelectOptions, null, 2));
    
    console.log('\n📋 Order Services Array:');
    console.log('Services:', targetOrder.multiSelectOptions?.services || []);

    // 2. Check what services are available in the CSV
    console.log('\n2. Testing cost calculation to see available services...');
    
    const testRequest = {
      selectedColors: {
        'Black': {
          sizes: {
            'One Size': 576
          }
        }
      },
      
      logoSetupSelections: {},
      
      multiSelectOptions: {
        'services': ['graphics', 'sampling']  // Test these services
      },
      
      selectedOptions: {
        'delivery-type': 'regular'
      },
      
      baseProductPricing: {
        price48: 3.6,
        price144: 3.0,
        price576: 2.9,
        price1152: 2.84,
        price2880: 2.76,
        price10000: 2.7
      }
    };

    const costResponse = await fetch('http://localhost:3002/api/calculate-cost', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testRequest)
    });

    if (costResponse.ok) {
      const costData = await costResponse.json();
      console.log('✅ Cost calculation completed');
      
      console.log('\n📊 Services Costs from API:');
      if (costData.servicesCosts && costData.servicesCosts.length > 0) {
        costData.servicesCosts.forEach((service, index) => {
          console.log(`  ${index + 1}. ${service.name}: $${service.cost.toFixed(2)} ($${service.unitPrice.toFixed(2)}/cap)`);
        });
      } else {
        console.log('  ❌ No services costs calculated');
      }
    }

    // 3. Check the CSV directly for available services
    console.log('\n3. Checking CSV data for available services...');
    
    // Read the customization pricing CSV to see what services exist
    const fs = require('fs').promises;
    const path = require('path');
    
    try {
      const csvPath = path.join(process.cwd(), 'src/app/csv/Customization Pricings.csv');
      const csvContent = await fs.readFile(csvPath, 'utf-8');
      
      console.log('📄 Available Services in CSV:');
      const lines = csvContent.split('\n').filter(line => line.trim());
      const serviceLines = lines.filter(line => line.toLowerCase().includes('service'));
      
      serviceLines.forEach(line => {
        console.log(`  ${line}`);
      });
      
      if (serviceLines.length === 0) {
        console.log('  ❌ No services found in CSV');
      }
      
    } catch (csvError) {
      console.log('  ⚠️ Could not read CSV file:', csvError.message);
    }

    // 4. Analyze the issue and provide recommendations
    console.log('\n🔍 ANALYSIS:');
    console.log('='.repeat(60));
    
    console.log('\n📋 Current Order Configuration:');
    console.log(`- Services in multiSelectOptions: ${JSON.stringify(targetOrder.multiSelectOptions?.services || [])}`);
    console.log('- Issue: "regular-delivery" appears in services instead of actual services');
    
    console.log('\n🔧 POTENTIAL CAUSES:');
    console.log('1. Service names mismatch between order creation and CSV');
    console.log('2. Services being incorrectly categorized as delivery options');
    console.log('3. Cost calculation not finding matching service entries in CSV');
    console.log('4. Order creation logic putting delivery method in services array');
    
    console.log('\n💡 RECOMMENDATIONS:');
    console.log('1. Check order creation logic in /api/orders endpoint');
    console.log('2. Verify CSV contains "Graphics" and "Sampling" as Service type');
    console.log('3. Fix service vs delivery categorization');
    console.log('4. Update cost calculation to properly match service names');
    
    // 5. Test with corrected services
    console.log('\n5. Testing with corrected service configuration...');
    
    const correctedRequest = {
      selectedColors: {
        'Black': {
          sizes: {
            'One Size': 576
          }
        }
      },
      
      logoSetupSelections: {},
      
      multiSelectOptions: {
        'services': ['Graphics', 'Sampling']  // Try exact CSV names
      },
      
      selectedOptions: {
        'delivery-type': 'regular'
      },
      
      baseProductPricing: {
        price48: 3.6,
        price144: 3.0,
        price576: 2.9,
        price1152: 2.84,
        price2880: 2.76,
        price10000: 2.7
      }
    };

    const correctedResponse = await fetch('http://localhost:3002/api/calculate-cost', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(correctedRequest)
    });

    if (correctedResponse.ok) {
      const correctedData = await correctedResponse.json();
      console.log('✅ Corrected cost calculation completed');
      
      console.log('\n📊 Corrected Services Costs:');
      if (correctedData.servicesCosts && correctedData.servicesCosts.length > 0) {
        correctedData.servicesCosts.forEach((service, index) => {
          console.log(`  ${index + 1}. ${service.name}: $${service.cost.toFixed(2)} (${service.unitPrice ? '$' + service.unitPrice.toFixed(2) + '/cap' : 'flat rate'})`);
        });
        
        const totalServicesCost = correctedData.servicesCosts.reduce((sum, service) => sum + service.cost, 0);
        console.log(`\n💰 Total Services Cost: $${totalServicesCost.toFixed(2)}`);
        console.log('✅ This should be added to the order total of $4,918.40');
        console.log(`📊 New Expected Total: $${(4918.40 + totalServicesCost).toFixed(2)}`);
        
      } else {
        console.log('  ❌ Still no services costs calculated with exact names');
      }
    }
    
    console.log('\n🎯 CONCLUSION:');
    console.log('The issue is that "regular-delivery" is incorrectly placed in the services array');
    console.log('Services like "Graphics" and "Sampling" should be separate from delivery options');
    console.log('This needs to be fixed in the order creation logic and cost calculation');

  } catch (error) {
    console.error('❌ Analysis failed:', error.message);
  }
};

// Run the analysis
analyzeServicesIssue();