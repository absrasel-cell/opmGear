import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
 try {
  const body = await request.json();
  
  console.log('🔍 Test Conversation History:', {
   hasMessage: !!body.message,
   hasConversationHistory: !!body.conversationHistory,
   conversationHistoryLength: body.conversationHistory?.length || 0,
   firstHistoryItem: body.conversationHistory?.[0] || null
  });

  return NextResponse.json({
   success: true,
   receivedConversationHistory: body.conversationHistory || [],
   historyLength: body.conversationHistory?.length || 0,
   message: `Received ${body.conversationHistory?.length || 0} conversation history items`
  });

 } catch (error) {
  console.error('Error in test endpoint:', error);
  return NextResponse.json(
   { error: 'Failed to process request' },
   { status: 500 }
  );
 }
}