#!/usr/bin/env node

/**
 * QUICK ORDER AI TEST - Final Steps Completion
 * Complete the order finalization test
 */

const API_BASE = 'http://localhost:3000';

async function sendMessage(message, conversationId = null) {
    console.log(`📝 Sending: "${message}"`);
    const start = Date.now();
    
    const response = await fetch(`${API_BASE}/api/order-ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            message,
            context: 'order-conversion',
            conversationId,
            conversationContext: {},
        }),
    });

    const data = await response.json();
    const time = Date.now() - start;
    
    console.log(`⏱️  ${time}ms`);
    console.log(`🤖 Response: "${data.response.substring(0, 200)}..."`);
    console.log(`💾 Conversation ID: ${data.conversationId}\n`);
    
    return data;
}

async function quickTest() {
    console.log('🚀 Quick Order Finalization Test\n');
    
    // Step 1: Initial complex order
    let result = await sendMessage("I need 480 caps total - 220 black with 3D embroidery on front, 260 navy with rubber patches on back, plus hang tags for premium feel");
    let conversationId = result.conversationId;
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Step 2: Pricing inquiry
    result = await sendMessage("What's the total cost for this setup?", conversationId);
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Step 3: Confirmation and order creation
    result = await sendMessage("Perfect! Go ahead and create the order", conversationId);
    
    // Check if order was created
    const orderCreated = result.response.toLowerCase().includes('order') && 
                        (result.response.includes('ord-') || result.response.includes('created'));
    
    console.log('📊 QUICK TEST RESULTS:');
    console.log(`✅ Order Created: ${orderCreated ? 'YES' : 'NO'}`);
    console.log(`🧠 Memory Retained: ${result.response.includes('480') || result.response.includes('220') || result.response.includes('260') ? 'YES' : 'NO'}`);
    console.log(`🤖 Human-like: ${result.response.includes('Perfect!') || result.response.includes('Awesome') || result.response.includes('Great') ? 'YES' : 'NO'}`);
    
    return { orderCreated, conversationId };
}

quickTest().catch(console.error);