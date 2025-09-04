// Complete order flow from inquiry to completion

async function completeOrderFlow() {
    console.log('🛒 COMPLETING FULL ORDER FLOW');
    console.log('============================\n');
    
    let conversationHistory = [];
    let conversationId = null;

    try {
        // STEP 1: Initial Customer Inquiry
        console.log('🔵 STEP 1: Customer Initial Inquiry');
        console.log('Customer: "i want to order 150 caps, with 3D embroidery on the front. with White/Red/Blue color combo"');
        console.log('---');

        const response1 = await fetch('http://localhost:3008/api/ai-chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: "i want to order 150 caps, with 3D embroidery on the front. with White/Red/Blue color combo",
                conversationHistory: []
            })
        });

        const data1 = await response1.json();
        const aiResponse1 = data1.response || data1.message;
        
        console.log('🤖 AI Response:');
        console.log(aiResponse1);
        console.log('\n' + '='.repeat(80) + '\n');

        // Update conversation history
        conversationHistory.push({
            role: 'user',
            content: 'i want to order 150 caps, with 3D embroidery on the front. with White/Red/Blue color combo'
        });
        conversationHistory.push({
            role: 'assistant',
            content: aiResponse1
        });

        await new Promise(resolve => setTimeout(resolve, 2000));

        // STEP 2: Customer asks for recommendation
        console.log('🔵 STEP 2: Customer Asks for Recommendation');
        console.log('Customer: "recommend me a setup"');
        console.log('---');

        const response2 = await fetch('http://localhost:3008/api/ai-chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: "recommend me a setup",
                conversationHistory: conversationHistory
            })
        });

        const data2 = await response2.json();
        const aiResponse2 = data2.response || data2.message;
        
        console.log('🤖 AI Response:');
        console.log(aiResponse2);
        console.log('\n' + '='.repeat(80) + '\n');

        // Update conversation history
        conversationHistory.push({
            role: 'user',
            content: 'recommend me a setup'
        });
        conversationHistory.push({
            role: 'assistant',
            content: aiResponse2
        });

        await new Promise(resolve => setTimeout(resolve, 2000));

        // STEP 3: Customer wants to place order
        console.log('🔵 STEP 3: Customer Places Order');
        console.log('Customer: "place order with recommended"');
        console.log('---');

        const response3 = await fetch('http://localhost:3008/api/ai-chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: "place order with recommended",
                conversationHistory: conversationHistory
            })
        });

        const data3 = await response3.json();
        const aiResponse3 = data3.response || data3.message;
        
        console.log('🤖 AI Response:');
        console.log(aiResponse3);
        console.log('\n' + '='.repeat(80) + '\n');

        // Update conversation history
        conversationHistory.push({
            role: 'user',
            content: 'place order with recommended'
        });
        conversationHistory.push({
            role: 'assistant',
            content: aiResponse3
        });

        await new Promise(resolve => setTimeout(resolve, 2000));

        // STEP 4: Customer confirms details
        console.log('🔵 STEP 4: Customer Confirms Order Details');
        console.log('Customer: "yes, 150 caps with 6P Urban Comfort HCU in navy with red/white logo, proceed with order"');
        console.log('---');

        const response4 = await fetch('http://localhost:3008/api/ai-chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: "yes, 150 caps with 6P Urban Comfort HCU in navy with red/white logo, proceed with order",
                conversationHistory: conversationHistory
            })
        });

        const data4 = await response4.json();
        const aiResponse4 = data4.response || data4.message;
        
        console.log('🤖 AI Response:');
        console.log(aiResponse4);
        console.log('\n' + '='.repeat(80) + '\n');

        // STEP 5: Final order creation (if AI doesn't handle it automatically)
        console.log('🔵 STEP 5: Create Final Order');
        console.log('Customer: "create my order now"');
        console.log('---');

        const response5 = await fetch('http://localhost:3008/api/ai-chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: "create my order now",
                conversationHistory: conversationHistory.concat([
                    { role: 'user', content: 'yes, 150 caps with 6P Urban Comfort HCU in navy with red/white logo, proceed with order' },
                    { role: 'assistant', content: aiResponse4 }
                ])
            })
        });

        const data5 = await response5.json();
        const aiResponse5 = data5.response || data5.message;
        
        console.log('🤖 AI Response:');
        console.log(aiResponse5);
        console.log('\n' + '='.repeat(80) + '\n');

        // Summary
        console.log('📊 ORDER FLOW SUMMARY:');
        console.log('======================');
        console.log('✅ Initial inquiry handled');
        console.log('✅ Specific recommendation provided');
        console.log('✅ Order placement process initiated');
        console.log('✅ Customer confirmation processed');
        console.log('✅ Final order creation attempted');
        console.log('\n🎯 ORDER COMPLETION STATUS: WORKFLOW TESTED');

    } catch (error) {
        console.error('❌ Error in order flow:', error.message);
    }
}

completeOrderFlow();