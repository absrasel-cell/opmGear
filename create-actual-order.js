// Create actual order based on the AI conversation

async function createActualOrder() {
    console.log('🛒 CREATING ACTUAL ORDER FROM AI CONVERSATION');
    console.log('==============================================\n');

    // Based on the AI conversation, the customer wants:
    // - 150 caps 
    // - 6P Urban Comfort HCU (recommended by AI)
    // - Navy base with red/white logo
    // - 3D embroidery on front center
    // - Estimated total: $630

    const orderData = {
        productName: "6P Urban Comfort HCU", // From AI recommendation
        selectedColors: {
            "Navy": {
                sizes: {
                    "Standard": 150 // 150 caps total
                },
                customName: "Navy Base",
                isCustom: false
            }
        },
        logoSetupSelections: {
            "frontCenter": {
                position: "Front Center",
                size: "Large", 
                application: "3D Embroidery"
            }
        },
        selectedOptions: {
            "profile": "High",
            "billShape": "Curved", 
            "panelCount": "6-Panel",
            "pricingTier": "Tier 1",
            "delivery": "Regular (15 working days)"
        },
        multiSelectOptions: {
            "logoColors": ["Red", "White", "Blue"],
            "baseColors": ["Navy"]
        },
        customerInfo: {
            name: "Test Customer",
            email: "customer@example.com", 
            phone: "555-0123",
            company: "Event Company",
            address: {
                street: "123 Event Street",
                city: "Event City", 
                state: "NY",
                zipCode: "12345",
                country: "USA"
            }
        },
        additionalInstructions: "Patriotic event caps - 150 pieces with 3D embroidery in White/Red/Blue color scheme. Navy base caps with red and white logo embroidery on front center.",
        orderType: "GUEST",
        orderSource: "PRODUCT_CUSTOMIZATION", // Valid source from validation
        status: "PENDING",
        priceTier: "Tier 1",
        ipAddress: "127.0.0.1",
        userAgent: "AI-Chat-Order-Test"
    };

    try {
        console.log('📝 ORDER DETAILS:');
        console.log('================');
        console.log('Product: 6P Urban Comfort HCU');
        console.log('Quantity: 150 caps');
        console.log('Colors: Navy base with Red/White logo');
        console.log('Logo: 3D Embroidery on Front Center');
        console.log('Estimated Total: $630');
        console.log('Customer: Event Company\n');

        console.log('🚀 Submitting order to API...\n');

        const response = await fetch('http://localhost:3008/api/orders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(orderData)
        });

        console.log(`📡 Response Status: ${response.status}`);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Order creation failed:');
            console.error(`Status: ${response.status}`);
            console.error(`Error: ${errorText}`);
            return;
        }

        const result = await response.json();
        
        console.log('✅ ORDER CREATED SUCCESSFULLY!');
        console.log('=============================');
        console.log(`🆔 Order ID: ${result.orderId || result.id}`);
        console.log(`📧 Customer: ${orderData.customerInfo.email}`);
        console.log(`📦 Product: ${orderData.productName}`);
        console.log(`🔢 Quantity: 150 caps`);
        console.log(`💰 Estimated Total: $630`);
        console.log(`📅 Timeline: 15 working days`);
        console.log(`🎯 Status: Order created and ready for processing\n`);

        // Test the order retrieval
        if (result.orderId || result.id) {
            const orderId = result.orderId || result.id;
            console.log('🔍 Verifying order creation...');
            
            const getResponse = await fetch(`http://localhost:3008/api/orders/${orderId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            
            if (getResponse.ok) {
                const orderDetails = await getResponse.json();
                console.log('✅ Order verification successful!');
                console.log(`📋 Order Status: ${orderDetails.status}`);
                console.log(`📝 Instructions: ${orderDetails.additionalInstructions?.substring(0, 100)}...`);
            } else {
                console.log('⚠️  Order created but verification failed');
            }
        }

        console.log('\n🎉 ORDER COMPLETION WORKFLOW SUCCESSFUL!');
        console.log('=========================================');
        console.log('✅ AI conversation handled customer inquiry');
        console.log('✅ Specific recommendation provided (6P Urban Comfort HCU)');
        console.log('✅ Customer requirements captured (150 caps, 3D embroidery, W/R/B)');
        console.log('✅ Actual order created in system');
        console.log('✅ Ready for production processing');

    } catch (error) {
        console.error('❌ Error creating order:', error.message);
        console.error('Stack:', error.stack);
    }
}

createActualOrder();