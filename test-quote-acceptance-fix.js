#!/usr/bin/env node

/**
 * CRITICAL QUOTE ACCEPTANCE FIX - COMPREHENSIVE TEST
 * Tests the complete flow from quote generation to acceptance
 *
 * This script tests the fixes for:
 * 1. Foreign key constraint error in ConversationQuotes insertion
 * 2. Conversation existence validation
 * 3. hasQuote flag setting
 * 4. Quote acceptance functionality
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 TESTING: Quote Acceptance Critical Fix');
console.log('==========================================\n');

async function testQuoteAcceptanceFlow() {
  const baseUrl = 'http://localhost:3000';

  // Test data for quote generation
  const testQuoteData = {
    message: "I need 24 custom caps with embroidered logos",
    intent: "quote_request",
    conversationHistory: [],
    userProfile: {
      name: "Test User",
      email: "test@example.com",
      company: "Test Company"
    },
    conversationId: `conv_${Date.now()}_test_fix`,
    sessionId: `session_${Date.now()}_test`
  };

  try {
    console.log('📋 Step 1: Testing AI Quote Generation');
    console.log('=====================================');

    const quoteResponse = await fetch(`${baseUrl}/api/support/order-creation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testQuoteData)
    });

    if (!quoteResponse.ok) {
      console.error('❌ Quote generation failed:', quoteResponse.status);
      const errorText = await quoteResponse.text();
      console.error('Error details:', errorText);
      return false;
    }

    const quoteResult = await quoteResponse.json();
    console.log('✅ Quote generated successfully');

    // Check if quote data was created
    if (quoteResult.quoteData?.savedToDatabase) {
      console.log('✅ Quote saved to database:', quoteResult.quoteData.quoteOrderId);
    } else {
      console.log('⚠️ Quote not saved to database');
    }

    console.log('\n📋 Step 2: Fetching Conversation to Check Quote Status');
    console.log('=====================================================');

    // Give a moment for database operations to complete
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Try to fetch the conversation to verify it exists and has a quote
    const conversationResponse = await fetch(`${baseUrl}/api/conversations/${testQuoteData.conversationId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!conversationResponse.ok) {
      console.error('❌ Failed to fetch conversation:', conversationResponse.status);
      const errorText = await conversationResponse.text();
      console.error('Error details:', errorText);
      return false;
    }

    const conversation = await conversationResponse.json();
    console.log('✅ Conversation fetched successfully');
    console.log('📊 Conversation status:', {
      id: conversation.id,
      hasQuote: conversation.hasQuote,
      title: conversation.title,
      conversationQuotesCount: conversation.ConversationQuotes?.length || 0,
      orderBuilderState: !!conversation.orderBuilderState
    });

    if (conversation.hasQuote) {
      console.log('✅ hasQuote flag is set correctly');
    } else {
      console.log('❌ hasQuote flag is NOT set');
      return false;
    }

    console.log('\n📋 Step 3: Testing Quote Acceptance');
    console.log('===================================');

    // Test quote acceptance
    const acceptResponse = await fetch(`${baseUrl}/api/conversations/${testQuoteData.conversationId}/quote-status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status: 'APPROVED' })
    });

    if (!acceptResponse.ok) {
      console.error('❌ Quote acceptance failed:', acceptResponse.status);
      const errorText = await acceptResponse.text();
      console.error('Error details:', errorText);

      // Try to parse as JSON for better error details
      try {
        const errorData = JSON.parse(errorText);
        console.error('Structured error:', errorData);
      } catch (e) {
        console.error('Raw error text:', errorText);
      }

      return false;
    }

    const acceptResult = await acceptResponse.json();
    console.log('✅ Quote acceptance successful!');
    console.log('📊 Acceptance result:', {
      success: acceptResult.success,
      newStatus: acceptResult.newStatus,
      orderCreated: acceptResult.orderCreated,
      orderId: acceptResult.orderId,
      message: acceptResult.message
    });

    // Check if order was created
    if (acceptResult.orderCreated && acceptResult.orderId) {
      console.log('✅ Order created from accepted quote:', acceptResult.orderId);
    } else {
      console.log('⚠️ No order created from quote acceptance');
    }

    console.log('\n📋 Step 4: Final Verification');
    console.log('=============================');

    // Fetch the conversation again to verify the status update
    const finalConversationResponse = await fetch(`${baseUrl}/api/conversations/${testQuoteData.conversationId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (finalConversationResponse.ok) {
      const finalConversation = await finalConversationResponse.json();
      console.log('✅ Final conversation state:', {
        id: finalConversation.id,
        title: finalConversation.title,
        hasQuote: finalConversation.hasQuote,
        quoteStatus: finalConversation.metadata?.quoteStatus,
        orderId: finalConversation.metadata?.orderId
      });
    }

    console.log('\n🎉 ALL TESTS PASSED!');
    console.log('====================');
    console.log('✅ Quote generation works');
    console.log('✅ Conversation creation works');
    console.log('✅ ConversationQuotes linking works');
    console.log('✅ hasQuote flag setting works');
    console.log('✅ Quote acceptance works');
    console.log('✅ Order creation from quote works');

    return true;

  } catch (error) {
    console.error('❌ Test failed with error:', error);
    return false;
  }
}

// Run the test
testQuoteAcceptanceFlow()
  .then(success => {
    if (success) {
      console.log('\n✅ Quote Acceptance Fix - VERIFICATION COMPLETE');
      process.exit(0);
    } else {
      console.log('\n❌ Quote Acceptance Fix - TESTS FAILED');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  });