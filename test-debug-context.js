/**
 * DEBUG CONVERSATION CONTEXT TEST
 * Simple test to see the conversation context structure
 */

const baseUrl = 'http://localhost:3005';

async function testDebugContext() {
  console.log('🔍 DEBUGGING CONVERSATION CONTEXT STRUCTURE');
  console.log('=' .repeat(50));

  const conversationHistory = [
    {
      role: 'user',
      content: "I need a quote for 144 pieces, 7P Elite Seven HFS, polyester fabric, black/white."
    },
    {
      role: 'assistant',
      content: `Here's your detailed quote:

📊 **Cap Style Setup** ✅
•7P Elite Seven HFS (Tier 3)
•Base cost: $612.00 ($4.25/cap)
•Color: Black/White

💰 **Total Investment: $2547.20**`
    }
  ];

  console.log('📝 Sending quantity change with conversation history...');

  try {
    const response = await fetch(`${baseUrl}/api/support-ai`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: "change quantity to 600 pieces",
        conversationHistory: conversationHistory
      })
    });

    const data = await response.json();
    console.log('✅ Response received');
    console.log('📋 Check the server logs for DEBUG output');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Utility function for fetch in Node.js
global.fetch = global.fetch || require('node-fetch');

testDebugContext();