// Test to debug color extraction issue specifically
async function testColorExtraction() {
    const baseUrl = 'http://localhost:3003';

    console.log('🎨 Testing Color Extraction Issue...\n');

    try {
        // Step 1: Generate initial quote
        console.log('📝 Step 1: Generate initial quote');
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
        console.log('\n🔍 AI Message that will be in conversation history:');
        console.log('FULL MESSAGE:', aiMessage);

        // Look for color mentions in the AI message
        const colorMatches = [
            ...aiMessage.matchAll(/color:\s*([^\n,]+)/gi),
            ...aiMessage.matchAll(/Royal\/Black/gi),
            ...aiMessage.matchAll(/Current AI Values[\s\S]*?Color:\s*([^\n]+)/gi)
        ];

        console.log('\n🎨 Color patterns found in AI message:');
        colorMatches.forEach((match, index) => {
            console.log(`   Match ${index + 1}: "${match[0]}" -> Group: "${match[1] || 'N/A'}"`);
        });

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

        console.log('\n🔍 FOLLOW-UP RESPONSE STRUCTURE:');
        console.log('Full followUpResponse:', JSON.stringify(followUpResponse, null, 2));

        // Compare colors
        const initialColor = initialResponse.orderBuilder?.capStyle?.data?.color;
        const followUpColor = followUpResponse.orderBuilder?.capStyle?.data?.color;

        console.log('\n🎨 COLOR COMPARISON:');
        console.log(`   Initial color: ${initialColor}`);
        console.log(`   Follow-up color: ${followUpColor}`);
        console.log(`   Color preserved: ${initialColor === followUpColor ? '✅' : '❌'}`);

        if (initialColor !== followUpColor) {
            console.log('\n❌ COLOR ISSUE IDENTIFIED:');
            console.log('   The conversation context is not properly preserving colors from the structured quote');
            console.log('   Expected: Royal/Black');
            console.log(`   Actual: ${followUpColor}`);
        } else {
            console.log('\n✅ COLOR ISSUE RESOLVED!');
        }

    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

testColorExtraction();