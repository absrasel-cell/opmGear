const fetch = require('node-fetch');
const { PrismaClient } = require('@prisma/client');

async function testFinalConversationFix() {
  const prisma = new PrismaClient();
  
  console.log('🎯 FINAL TEST: Conversation Storage with Fix...\n');

  try {
    // Get the test user
    const testUser = await prisma.user.findFirst({
      where: { email: 'absrasel@gmail.com' }
    });
    
    if (!testUser) {
      console.error('❌ Test user not found');
      return;
    }
    
    console.log('👤 Test user:', testUser.email);
    
    // Test with a simple message that shouldn't query orders
    const testMessage = "Hello, I just wanted to say hi and test the conversation storage.";
    const sessionId = `final-test-${Date.now()}`;
    
    console.log('📤 Sending final test message...');
    console.log('Message:', testMessage);
    console.log('Session ID:', sessionId);
    
    const response = await fetch('http://localhost:3013/api/support/public-queries', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: testMessage,
        intent: 'GENERAL_SUPPORT', // This should not trigger order queries
        conversationHistory: [],
        userProfile: {
          id: testUser.id,
          email: testUser.email,
          name: testUser.name
        },
        conversationId: null,
        sessionId: sessionId
      })
    });

    console.log('📥 Response status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ API Response received');
      console.log('Conversation ID returned:', data.conversationId);
      console.log('Response preview:', data.message?.substring(0, 100) + '...');
      
      if (data.conversationId) {
        console.log('🎉 SUCCESS! Conversation ID was returned!');
        
        // Check database for the stored conversation
        console.log('\n🔍 Verifying conversation in database...');
        
        const conversation = await prisma.conversation.findUnique({
          where: { id: data.conversationId },
          include: {
            ConversationMessage: true
          }
        });
        
        if (conversation) {
          console.log('✅ Conversation found in database!');
          console.log('   ID:', conversation.id);
          console.log('   Context:', conversation.context);
          console.log('   User ID:', conversation.userId);
          console.log('   Session ID:', conversation.sessionId);
          console.log('   Messages count:', conversation.ConversationMessage.length);
          
          if (conversation.ConversationMessage.length > 0) {
            console.log('\n📨 Stored messages:');
            conversation.ConversationMessage.forEach((msg, index) => {
              console.log(`   ${index + 1}. [${msg.role}] ${msg.content.substring(0, 50)}...`);
            });
          }
          
          console.log('\n🎊 COMPLETE SUCCESS! Conversation and messages stored in database!');
          
        } else {
          console.log('❌ Conversation not found in database despite returned ID');
        }
      } else {
        console.log('❌ Still no conversation ID returned');
      }
    } else {
      const errorText = await response.text();
      console.error('❌ API request failed:', response.status, errorText);
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testFinalConversationFix();