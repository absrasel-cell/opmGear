// Test to see if "change to Snapback" is being detected as color from user message
async function testSnapbackUserMessage() {
    const baseUrl = 'http://localhost:3003';

    console.log('🔍 Testing Snapback user message processing...\n');

    try {
        // Just test the user message "change to Snapback" with minimal context
        const response = await fetch(`${baseUrl}/api/support-ai`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: 'change to Snapback',
                conversationHistory: [
                    {
                        role: 'user',
                        content: 'create me a quote for 800 piece, Acrylic/Airmesh fabric, Royal/Black, size: 59 cm. which has Rubber patch Medium Size on the front. Fitted Cap.'
                    },
                    {
                        role: 'assistant',
                        content: 'Here is your quote: Color: Royal/Black, Closure: Fitted, etc...'
                    }
                ]
            })
        });

        const result = await response.json();
        console.log('✅ Response received');
        console.log('Order Builder color:', result.orderBuilder?.capStyle?.data?.color);
        console.log('Order Builder closure:', result.orderBuilder?.customization?.premiumUpgrades?.closure);

    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

testSnapbackUserMessage();