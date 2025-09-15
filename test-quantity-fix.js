// Test to debug quantity preservation issue specifically
async function testQuantityPreservation() {
    const baseUrl = 'http://localhost:3003';

    console.log('📊 Testing Quantity Preservation Issue...\n');

    try {
        // Step 1: Generate initial quote with 800 pieces
        console.log('📝 Step 1: Generate initial quote with 800 pieces');
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

        // Extract the AI message that will be in conversation history
        const aiMessage = initialResponse.message || initialResponse.response;

        // Extract quantities from the response
        const initialQuantity = initialResponse.orderBuilder?.capStyle?.data?.quantity;

        console.log('\n📊 INITIAL QUANTITY ANALYSIS:');
        console.log(`   Initial quantity in orderBuilder: ${initialQuantity}`);

        // Look for quantity mentions in the AI message
        const quantityMatches = [
            ...aiMessage.matchAll(/(\d+)\s*pieces/gi),
            ...aiMessage.matchAll(/quantity:\s*(\d+)/gi),
            ...aiMessage.matchAll(/Base cost:\s*\$[\d,]+\.?\d*\s*\(\$[\d.]+\/cap\)/gi)
        ];

        console.log('\n📊 Quantity patterns found in AI message:');
        quantityMatches.forEach((match, index) => {
            console.log(`   Match ${index + 1}: "${match[0]}" -> Group: "${match[1] || 'N/A'}"`);
        });

        // Step 2: Test conversation change with "change to 7-panel"
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

        // Compare quantities
        const followUpQuantity = followUpResponse.orderBuilder?.capStyle?.data?.quantity;

        console.log('\n📊 QUANTITY COMPARISON:');
        console.log(`   Initial quantity: ${initialQuantity}`);
        console.log(`   Follow-up quantity: ${followUpQuantity}`);
        console.log(`   Quantity preserved: ${initialQuantity === followUpQuantity ? '✅' : '❌'}`);

        if (initialQuantity !== followUpQuantity) {
            console.log('\n❌ QUANTITY ISSUE IDENTIFIED:');
            console.log('   The conversation context is not properly preserving quantities from the structured quote');
            console.log('   Expected: 800');
            console.log(`   Actual: ${followUpQuantity}`);

            // Check conversational context for debugging
            if (followUpResponse.quoteData?.conversationalContext?.mergedSpecifications) {
                const mergedSpecs = followUpResponse.quoteData.conversationalContext.mergedSpecifications;
                console.log(`   Merged specifications quantity: ${mergedSpecs.quantity}`);
            }
        } else {
            console.log('\n✅ QUANTITY ISSUE RESOLVED!');
        }

    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

testQuantityPreservation();