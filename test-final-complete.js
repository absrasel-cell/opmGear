// Final comprehensive test for all conversation state preservation issues
async function testCompleteFixing() {
    const baseUrl = 'http://localhost:3003';

    console.log('🎯 Final Comprehensive Test - Conversation State Preservation...\n');

    try {
        // Step 1: Generate initial quote
        console.log('📝 Step 1: Generate initial quote with complete specifications');
        const initialQuote = await fetch(`${baseUrl}/api/support-ai`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: 'create me a quote for 800 piece, Acrylic/Airmesh fabric, Royal/Black, size: 59 cm. which has Rubber patch Medium Size on the front. Fitted Cap.',
                conversationHistory: []
            })
        });

        const initialResponse = await initialQuote.json();
        console.log('✅ Initial quote generated');

        // Extract initial values
        const initialQuantity = initialResponse.orderBuilder?.capStyle?.data?.quantity;
        const initialColor = initialResponse.orderBuilder?.capStyle?.data?.color;
        const initialLogos = initialResponse.orderBuilder?.customization?.logoSetup;
        const initialAccessories = initialResponse.orderBuilder?.accessories?.data;

        // Extract AI message
        const aiMessage = initialResponse.message || initialResponse.response;

        console.log('\n📊 INITIAL STATE ANALYSIS:');
        console.log(`   Quantity: ${initialQuantity}`);
        console.log(`   Color: ${initialColor}`);
        console.log(`   Logos: ${JSON.stringify(initialLogos)}`);
        console.log(`   Accessories: ${JSON.stringify(initialAccessories)}`);

        // Check for mold charges in initial message
        const moldChargeMatch = aiMessage.match(/\$[\d.]+\s*mold|\+\s*\$[\d.]+\s*mold/gi);
        console.log(`   Mold charges in AI message: ${moldChargeMatch ? moldChargeMatch.join(', ') : 'None'}`);

        // Step 2: Test conversation change
        console.log('\n📝 Step 2: Test conversation change "change to 7-panel"');
        const conversationHistory = [
            {
                role: 'user',
                content: 'create me a quote for 800 piece, Acrylic/Airmesh fabric, Royal/Black, size: 59 cm. which has Rubber patch Medium Size on the front. Fitted Cap.'
            },
            {
                role: 'assistant',
                content: aiMessage
            }
        ];

        const followUpQuote = await fetch(`${baseUrl}/api/support-ai`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: 'change to 7-panel',
                conversationHistory: conversationHistory
            })
        });

        const followUpResponse = await followUpQuote.json();

        // Extract follow-up values
        const followUpQuantity = followUpResponse.orderBuilder?.capStyle?.data?.quantity;
        const followUpColor = followUpResponse.orderBuilder?.capStyle?.data?.color;
        const followUpLogos = followUpResponse.orderBuilder?.customization?.logoSetup;
        const followUpAccessories = followUpResponse.orderBuilder?.accessories?.data;

        // Extract follow-up AI message
        const followUpMessage = followUpResponse.message || followUpResponse.response;
        const followUpMoldChargeMatch = followUpMessage.match(/\$[\d.]+\s*mold|\+\s*\$[\d.]+\s*mold/gi);

        console.log('\n📊 FOLLOW-UP STATE ANALYSIS:');
        console.log(`   Quantity: ${followUpQuantity}`);
        console.log(`   Color: ${followUpColor}`);
        console.log(`   Logos: ${JSON.stringify(followUpLogos)}`);
        console.log(`   Accessories: ${JSON.stringify(followUpAccessories)}`);
        console.log(`   Mold charges in AI message: ${followUpMoldChargeMatch ? followUpMoldChargeMatch.join(', ') : 'None'}`);

        // Comprehensive analysis
        console.log('\n🎯 COMPREHENSIVE ANALYSIS:');

        // 1. Quantity preservation
        const quantityPreserved = initialQuantity === followUpQuantity;
        console.log(`   1. Quantity preservation: ${quantityPreserved ? '✅' : '❌'} (${initialQuantity} → ${followUpQuantity})`);

        // 2. Color preservation
        const colorPreserved = initialColor === followUpColor;
        console.log(`   2. Color preservation: ${colorPreserved ? '✅' : '❌'} (${initialColor} → ${followUpColor})`);

        // 3. Logo preservation
        const logosPreserved = Array.isArray(initialLogos) && Array.isArray(followUpLogos) &&
                              initialLogos.length === followUpLogos.length &&
                              initialLogos.length > 0 && followUpLogos.length > 0;
        console.log(`   3. Logo preservation: ${logosPreserved ? '✅' : '❌'} (${initialLogos?.length || 0} → ${followUpLogos?.length || 0})`);

        // 4. Mold charge preservation
        const moldChargePreserved = moldChargeMatch && followUpMoldChargeMatch &&
                                   moldChargeMatch.length > 0 && followUpMoldChargeMatch.length > 0;
        console.log(`   4. Mold charge preservation: ${moldChargePreserved ? '✅' : '❌'} (${moldChargeMatch ? 'Present' : 'Missing'} → ${followUpMoldChargeMatch ? 'Present' : 'Missing'})`);

        // 5. Accessories preservation
        const accessoriesPreserved = Array.isArray(initialAccessories) && Array.isArray(followUpAccessories) &&
                                   initialAccessories.length === followUpAccessories.length;
        console.log(`   5. Accessories preservation: ${accessoriesPreserved ? '✅' : '❌'} (${initialAccessories?.length || 0} → ${followUpAccessories?.length || 0})`);

        // Overall result
        const allFixed = quantityPreserved && colorPreserved && logosPreserved && moldChargePreserved && accessoriesPreserved;
        console.log(`\n🏆 OVERALL RESULT: ${allFixed ? '✅ ALL ISSUES FIXED!' : '❌ Some issues remain'}`);

        if (!allFixed) {
            console.log('\n🔧 REMAINING ISSUES TO FIX:');
            if (!quantityPreserved) console.log('   - Quantity preservation');
            if (!colorPreserved) console.log('   - Color preservation');
            if (!logosPreserved) console.log('   - Logo preservation');
            if (!moldChargePreserved) console.log('   - Mold charge preservation');
            if (!accessoriesPreserved) console.log('   - Accessories preservation');
        }

    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

testCompleteFixing();