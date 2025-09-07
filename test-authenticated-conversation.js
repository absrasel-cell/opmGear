const fetch = require('node-fetch');
const { PrismaClient } = require('@prisma/client');

async function testAuthenticatedConversation() {
  const prisma = new PrismaClient();
  
  console.log('🧪 Testing Authenticated Support Conversation Storage...\n');

  try {
    // Get the test user from database
    const testUser = await prisma.user.findFirst({
      where: { email: 'absrasel@gmail.com' }
    });
    
    if (!testUser) {
      console.error('❌ Test user not found');
      return;
    }
    
    console.log('👤 Found test user:', testUser.email, 'ID:', testUser.id);
    
    // Test session endpoint first to make sure auth is working
    console.log('\n🔐 Testing session endpoint...');
    const sessionResponse = await fetch('http://localhost:3012/api/auth/session', {
      method: 'GET',
      headers: {
        'Cookie': 'session-token=test-token' // This won't work, but let's see
      }
    });
    
    console.log('Session response status:', sessionResponse.status);
    
    // Create a test message that should trigger conversation storage
    const testMessage = "I need help with my order. Can you check my recent orders?";
    const sessionId = `auth-test-${Date.now()}`;
    
    console.log('\n📤 Sending authenticated test message...');
    console.log('Message:', testMessage);
    console.log('Session ID:', sessionId);
    console.log('User Email:', testUser.email);
    
    // The key insight from our analysis: we need both sessionId AND userEmail
    // Let's examine the exact condition that triggers storage
    console.log('\n🔍 Testing the storage condition logic...');
    console.log('The code requires: if (sessionId && userEmail)');
    console.log('We have sessionId:', !!sessionId);
    console.log('We need userEmail to be set by authentication');
    
    // Try different approaches to trigger the auth
    const approaches = [
      {
        name: 'Direct userProfile approach',
        body: {
          message: testMessage,
          intent: 'ORDER_INQUIRY', 
          conversationHistory: [],
          userProfile: {
            id: testUser.id,
            email: testUser.email,
            name: testUser.name
          },
          conversationId: null,
          sessionId: sessionId
        }
      },
      {
        name: 'Authorization header approach', 
        body: {
          message: testMessage,
          intent: 'ORDER_INQUIRY',
          conversationHistory: [],
          userProfile: null,
          conversationId: null,
          sessionId: sessionId
        },
        headers: {
          'Authorization': 'Bearer fake-token-for-test'
        }
      }
    ];
    
    for (const approach of approaches) {
      console.log(`\n🧪 Testing: ${approach.name}`);
      
      const headers = {
        'Content-Type': 'application/json',
        ...approach.headers
      };
      
      const response = await fetch('http://localhost:3012/api/support/public-queries', {
        method: 'POST',
        headers,
        body: JSON.stringify(approach.body)
      });

      console.log('Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Conversation ID returned:', data.conversationId);
        
        if (data.conversationId) {
          console.log('🎉 SUCCESS! Conversation stored with approach:', approach.name);
          break;
        }
      } else {
        console.log('❌ Failed with status:', response.status);
      }
    }

    // Check database for any new conversations
    console.log('\n🔍 Final database check...');
    const finalConversationCount = await prisma.conversation.count();
    const finalMessageCount = await prisma.conversationMessage.count();
    
    console.log('Final conversation count:', finalConversationCount);
    console.log('Final message count:', finalMessageCount);
    
    if (finalConversationCount > 0) {
      const conversations = await prisma.conversation.findMany({
        orderBy: { createdAt: 'desc' },
        take: 2,
        include: {
          ConversationMessage: true
        }
      });
      
      console.log('\n📊 Recent conversations found:');
      conversations.forEach((conv, index) => {
        console.log(`${index + 1}. ID: ${conv.id}`);
        console.log(`   Context: ${conv.context}`);
        console.log(`   Session: ${conv.sessionId}`);
        console.log(`   User: ${conv.userId}`);
        console.log(`   Messages: ${conv.ConversationMessage.length}`);
      });
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testAuthenticatedConversation();