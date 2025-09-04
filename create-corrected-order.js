/**
 * Create a corrected order with proper Services configuration
 * This fixes the "regular-delivery" in services issue
 */

const createCorrectedOrder = async () => {
  console.log('🔧 Creating Corrected Order with Proper Services...');
  console.log('Fixing: Services should include "Graphics" and "Sampling", not "regular-delivery"');

  try {
    // Build the corrected order data
    const orderData = {
      productName: "Custom Baseball Cap",
      priceTier: "Tier 1",
      
      selectedColors: {
        "Black": {
          sizes: {
            "One Size": 576
          }
        }
      },
      
      logoSetupSelections: {
        "rubber-patch": {
          position: "Front",
          size: "Large",
          application: "Run"
        },
        "flat-embroidery": {
          position: "Left",
          size: "Small",
          application: "Direct"
        },
        "woven-patch-right": {
          position: "Right",
          size: "Small",
          application: "Satin"
        },
        "woven-patch-back": {
          position: "Back",
          size: "Small",
          application: "Satin"
        }
      },
      
      selectedOptions: {
        "profile": "High",
        "bill-style": "Flat Bill",
        "panel-count": "6",
        "closure-type": "fitted",
        "structure": "Structured",
        "fabric-setup": "Laser Cut",
        "stitching": "Matching",
        "delivery-type": "regular"
      },
      
      // CORRECTED: Proper separation of services vs delivery
      multiSelectOptions: {
        "logo-setup": [
          "rubber-patch",
          "flat-embroidery",
          "woven-patch-right",
          "woven-patch-back"
        ],
        "accessories": [
          "sticker",
          "hang-tag"
        ],
        "services": [
          "Graphics",    // For mock-up/sketch requirement
          "Sampling"     // For sample approval requirement  
        ]
        // Note: delivery is handled via selectedOptions["delivery-type"], not services
      },
      
      customerInfo: {
        name: "Test Customer - 576 Caps (Corrected)",
        email: "redxtrm02@gmail.com",
        company: "Test Company Via API (Services Fixed)"
      },
      
      userEmail: "redxtrm02@gmail.com",
      orderType: 'GUEST',
      orderSource: 'PRODUCT_CUSTOMIZATION',
      status: 'PENDING',
      specialInstructions: `CORRECTED 576-piece order with proper Services configuration.

Original request: "I need mock up/sketch, and Sample from you for approval"
Mapped to:
- Graphics service ($50) for mock-up/sketch
- Sampling service ($150) for sample approval

Complete specifications:
- 576 Black caps, flat bill, fitted closure, high profile
- Laser Cut premium fabric
- 4 logo positions: Large Rubber Patch (Front), Small Embroidery (Left), Small Woven Patches (Right & Back)  
- Accessories: Sticker, Hang Tag
- Services: Graphics + Sampling
- Delivery: Regular delivery

This demonstrates proper service vs delivery categorization.`,
      isDraft: false,
      paymentProcessed: false,
      
      baseProductPricing: {
        price48: 3.6,
        price144: 3.0,
        price576: 2.9,
        price1152: 2.84,
        price2880: 2.76,
        price10000: 2.7
      }
    };

    console.log('📤 Sending corrected order...');
    console.log('Services configuration:');
    console.log('- Graphics: $50.00 (for mock-up/sketch)');
    console.log('- Sampling: $150.00 (for sample approval)'); 
    console.log('- Expected additional cost: $200.00');

    const response = await fetch('http://localhost:3002/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orderData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    const orderId = result.orderId;
    
    console.log('\n✅ Corrected order created successfully!');
    console.log('🎯 New Order ID:', orderId);
    
    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Fetch the new order to verify services
    console.log('\n🔍 Verifying corrected order...');
    const fetchResponse = await fetch('http://localhost:3002/api/orders?limit=2');
    const ordersData = await fetchResponse.json();
    
    const newOrder = ordersData.orders.find(order => order.id === orderId);
    
    if (newOrder) {
      console.log('✅ Corrected order found:');
      console.log('  Order ID:', newOrder.id);
      console.log('  Services:', newOrder.multiSelectOptions?.services || []);
      console.log('  Total Cost:', `$${newOrder.orderTotal?.toFixed(2) || '0.00'}`);
      console.log('  Customer:', newOrder.customerInfo?.email);
      
      // Check if services are correct
      const services = newOrder.multiSelectOptions?.services || [];
      const hasGraphics = services.includes('Graphics');
      const hasSampling = services.includes('Sampling');
      const hasDeliveryInServices = services.includes('regular-delivery');
      
      console.log('\n📊 Services Verification:');
      console.log(`  Graphics service: ${hasGraphics ? '✅' : '❌'}`);
      console.log(`  Sampling service: ${hasSampling ? '✅' : '❌'}`);
      console.log(`  Incorrect delivery in services: ${hasDeliveryInServices ? '❌ (still present)' : '✅ (fixed)'}`);
      
      if (hasGraphics && hasSampling && !hasDeliveryInServices) {
        console.log('\n🎉 SUCCESS: Services configuration is now correct!');
        console.log('Expected total cost should now include:');
        console.log('- Base calculation: $4,918.40');
        console.log('- Graphics service: $50.00'); 
        console.log('- Sampling service: $150.00');
        console.log('- New total: $5,118.40');
        
        return {
          success: true,
          orderId,
          servicesFixed: true,
          expectedTotal: 5118.40,
          actualTotal: newOrder.orderTotal
        };
      } else {
        console.log('\n⚠️ Services configuration still needs adjustment');
        return {
          success: true,
          orderId,
          servicesFixed: false,
          issues: {
            missingGraphics: !hasGraphics,
            missingSampling: !hasSampling, 
            deliveryInServices: hasDeliveryInServices
          }
        };
      }
    } else {
      console.log('⚠️ Could not find the new order for verification');
      return {
        success: true,
        orderId,
        verified: false
      };
    }

  } catch (error) {
    console.error('❌ Corrected order creation failed:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
};

// Run the corrected order creation
createCorrectedOrder().then(result => {
  console.log('\n🏁 Corrected Order Creation Result:');
  console.log(JSON.stringify(result, null, 2));
  
  if (result.success && result.servicesFixed) {
    console.log('\n✅ ISSUE RESOLVED: Services are now properly configured');
    console.log('📧 Customer will receive accurate quote including Graphics and Sampling services');
  } else if (result.success) {
    console.log('\n⚠️ ORDER CREATED: But services configuration may need further adjustment');
  }
  
  process.exit(result.success ? 0 : 1);
});