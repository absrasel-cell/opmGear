/**
 * Order AI Conversation History API
 * Handles loading and deleting conversation history for the Order AI system
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-helpers';
import { ConversationService } from '@/lib/conversation';
import { ConversationContext } from '@prisma/client';

/**
 * GET - Load conversation history for current user
 */
export async function GET(request: NextRequest) {
 try {
  const user = await getCurrentUser(request);
  
  if (!user?.id) {
   return NextResponse.json({
    error: 'Authentication required'
   }, { status: 401 });
  }

  console.log(`🧠 [HISTORY-API] Loading conversation history for user: ${user.id}`);

  // Get or create conversation for ORDER_INQUIRY context
  const conversation = await ConversationService.getOrCreateConversation({
   userId: user.id,
   sessionId: `order-ai-${user.id}`,
   context: ConversationContext.ORDER_INQUIRY,
   metadata: {
    source: 'order-ai-history',
    userAgent: request.headers.get('user-agent')
   }
  });

  // Get conversation history (last 50 messages)
  const messages = await ConversationService.getConversationHistory(conversation.id, 50);

  console.log(`✅ [HISTORY-API] Loaded ${messages.length} messages for conversation: ${conversation.id}`);

  return NextResponse.json({
   conversationId: conversation.id,
   messages: messages.map(msg => ({
    id: msg.id,
    role: msg.role,
    content: msg.content,
    createdAt: msg.createdAt,
    metadata: msg.metadata
   }))
  });

 } catch (error) {
  console.error('❌ [HISTORY-API] Error loading conversation history:', error);
  
  return NextResponse.json({
   error: 'Failed to load conversation history'
  }, { status: 500 });
 }
}

/**
 * DELETE - Delete conversation history
 */
export async function DELETE(request: NextRequest) {
 try {
  const user = await getCurrentUser(request);
  
  if (!user?.id) {
   return NextResponse.json({
    error: 'Authentication required'
   }, { status: 401 });
  }

  const { conversationId } = await request.json();

  if (!conversationId) {
   return NextResponse.json({
    error: 'Conversation ID is required'
   }, { status: 400 });
  }

  console.log(`🗑️ [HISTORY-API] Deleting conversation: ${conversationId} for user: ${user.id}`);

  // Delete all messages in the conversation (keeping the conversation record)
  await ConversationService.deleteConversationMessages(conversationId);

  console.log(`✅ [HISTORY-API] All messages deleted from conversation ${conversationId}`);

  return NextResponse.json({
   success: true,
   message: 'Conversation history cleared successfully'
  });

 } catch (error) {
  console.error('❌ [HISTORY-API] Error deleting conversation:', error);
  
  return NextResponse.json({
   error: 'Failed to delete conversation history'
  }, { status: 500 });
 }
}