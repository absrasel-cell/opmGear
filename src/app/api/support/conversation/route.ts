import { NextRequest, NextResponse } from 'next/server';
import { ConversationService } from '@/lib/conversation';
import { ConversationContext } from '@prisma/client';

interface ConversationRequest {
 sessionId: string;
 userId?: string;
 action?: 'create' | 'get' | 'history';
 conversationId?: string;
 findOnly?: boolean; // New parameter to only find existing conversations
}

export async function POST(request: NextRequest) {
 try {
  const body: ConversationRequest = await request.json();
  const { sessionId, userId, action = 'get', conversationId, findOnly = false } = body;

  if (!sessionId) {
   return NextResponse.json(
    { error: 'Session ID is required' },
    { status: 400 }
   );
  }

  let conversation;
  let messages;

  // If a specific conversationId is provided, load that conversation
  if (conversationId) {
   conversation = await ConversationService.getConversationById(conversationId);
   
   if (!conversation || conversation.userId !== userId) {
    return NextResponse.json(
     { error: 'Conversation not found or access denied' },
     { status: 404 }
    );
   }
   
   // Get all messages for the specific conversation
   messages = await ConversationService.getConversationHistory(conversationId, 100);
  } else {
   // Use findOnly mode if requested to avoid creating blank conversations
   if (findOnly) {
    conversation = await ConversationService.findExistingConversation({
     sessionId,
     userId,
     context: ConversationContext.SUPPORT,
     metadata: {
      source: 'ai-support-system',
      userAgent: request.headers.get('user-agent'),
      createdAt: new Date().toISOString()
     }
    });

    // If no conversation found in findOnly mode, return empty result
    if (!conversation) {
     return NextResponse.json({
      conversationId: null,
      messages: [],
      status: 'no_conversation_found'
     });
    }
   } else {
    // Get or create conversation for support context
    conversation = await ConversationService.getOrCreateConversation({
     sessionId,
     userId,
     context: ConversationContext.SUPPORT,
     metadata: {
      source: 'ai-support-system',
      userAgent: request.headers.get('user-agent'),
      createdAt: new Date().toISOString()
     }
    });
   }

   // Get conversation history (last 20 messages for comprehensive context)
   messages = await ConversationService.getConversationHistory(
    conversation.id, 
    20
   );
  }

  return NextResponse.json({
   conversationId: conversation?.id || null,
   messages: messages || [],
   status: 'success'
  });

 } catch (error) {
  console.error('Conversation API error:', error);
  
  return NextResponse.json({
   error: 'Failed to manage conversation',
   conversationId: null,
   messages: []
  }, { status: 500 });
 }
}