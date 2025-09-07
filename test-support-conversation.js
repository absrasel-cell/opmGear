const fetch = require('node-fetch');
const { PrismaClient } = require('@prisma/client');

async function testSupportConversation() {
  const prisma = new PrismaClient();
  
  console.log('🧪 Testing Support Page Conversation Storage...\n');

  try {
    // First, get auth token (simulate being logged in as absrasel@gmail.com)
    console.log('🔐 Getting auth session...');
    
    // Test with a simple support query that should trigger conversation storage
    const testMessage = "Hello, I need help with my order status. Can you help me check order #02dc7cf3?";
    const sessionId = `test-session-${Date.now()}`;
    
    console.log('📤 Sending test message to /api/support/public-queries');
    console.log('Message:', testMessage);
    console.log('Session ID:', sessionId);
    
    const response = await fetch('http://localhost:3011/api/support/public-queries', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // We'll test as unauthenticated first, then authenticated
      },
      body: JSON.stringify({
        message: testMessage,
        intent: 'ORDER_INQUIRY',
        conversationHistory: [],
        userProfile: null,
        conversationId: null,
        sessionId: sessionId
      })
    });

    console.log('📥 Response status:', response.status);
    
    if (!response.ok) {
      console.error('❌ API request failed:', response.statusText);
      const errorText = await response.text();
      console.error('Error details:', errorText);
      return;
    }

    const data = await response.json();
    console.log('✅ API Response received');
    console.log('Response data keys:', Object.keys(data));
    console.log('Conversation ID returned:', data.conversationId);
    console.log('Message preview:', data.message?.substring(0, 100) + '...');

    // Now check if anything was stored in the database
    console.log('\n🔍 Checking database for stored conversation...');
    
    const conversationCount = await prisma.conversation.count();
    console.log('Total conversations in DB:', conversationCount);
    
    const messageCount = await prisma.conversationMessage.count();
    console.log('Total messages in DB:', messageCount);
    
    if (conversationCount > 0) {
      const conversations = await prisma.conversation.findMany({
        orderBy: { createdAt: 'desc' },
        take: 3,
        include: {
          ConversationMessage: true
        }
      });
      
      console.log('\n📊 Recent conversations:');
      conversations.forEach((conv, index) => {
        console.log(`${index + 1}. ID: ${conv.id}`);
        console.log(`   Context: ${conv.context}`);
        console.log(`   Session ID: ${conv.sessionId}`);
        console.log(`   User ID: ${conv.userId}`);
        console.log(`   Messages: ${conv.ConversationMessage.length}`);
        console.log(`   Created: ${conv.createdAt}`);
      });
    }

    // Now test with authentication
    console.log('\n🔐 Testing with authentication...');
    
    // Get user from database
    const testUser = await prisma.user.findFirst({
      where: {
        email: 'absrasel@gmail.com'
      }
    });
    
    if (testUser) {
      console.log('👤 Found test user:', testUser.email);
      
      // Simulate authenticated request
      const authSessionId = `auth-test-session-${Date.now()}`;
      
      console.log('📤 Sending authenticated test message...');
      
      const authResponse = await fetch('http://localhost:3011/api/support/public-queries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // In a real scenario, we'd have a proper JWT token here
        },
        body: JSON.stringify({
          message: "I'm an authenticated user asking about my recent orders.",
          intent: 'ORDER_INQUIRY',
          conversationHistory: [],
          userProfile: {
            id: testUser.id,
            email: testUser.email,
            name: testUser.name
          },
          conversationId: null,
          sessionId: authSessionId
        })
      });

      if (authResponse.ok) {
        const authData = await authResponse.json();
        console.log('✅ Authenticated API response received');
        console.log('Auth conversation ID:', authData.conversationId);
        
        // Check database again
        const newConversationCount = await prisma.conversation.count();
        const newMessageCount = await prisma.conversationMessage.count();
        
        console.log('\n📈 Updated database counts:');
        console.log('Conversations:', conversationCount, '->', newConversationCount);
        console.log('Messages:', messageCount, '->', newMessageCount);
        
        if (newConversationCount > conversationCount) {
          console.log('🎉 SUCCESS: New conversation was stored!');
        } else {
          console.log('❌ ISSUE: No new conversation stored even with authentication');
        }
      } else {
        console.error('❌ Authenticated request failed:', authResponse.status);
      }
    } else {
      console.log('❌ No test user found');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testSupportConversation();