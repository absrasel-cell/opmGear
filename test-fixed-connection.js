const fetch = require('node-fetch');

async function testFixedConnection() {
  console.log('🔧 Testing fixed database connection...\n');

  try {
    console.log('📤 Sending test message to updated API...');
    
    const response = await fetch('http://localhost:3012/api/support/public-queries', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: "Test message after database connection fix",
        intent: 'GENERAL_SUPPORT',
        conversationHistory: [],
        userProfile: null,
        conversationId: null,
        sessionId: `fixed-test-${Date.now()}`
      })
    });

    console.log('📥 Response status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ API Response received');
      console.log('Conversation ID returned:', data.conversationId);
      console.log('Message preview:', data.message?.substring(0, 100) + '...');
      
      if (data.conversationId) {
        console.log('🎉 SUCCESS: Conversation ID was returned!');
      } else {
        console.log('❌ Still no conversation ID returned');
      }
    } else {
      console.error('❌ API request failed:', response.status);
      const errorText = await response.text();
      console.error('Error:', errorText);
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testFixedConnection();