import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const conversationId = params.id;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const { data: messages, error } = await supabaseAdmin
      .from('ConversationMessage')
      .select('*')
      .eq('conversationId', conversationId)
      .order('createdAt', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    return NextResponse.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const conversationId = resolvedParams.id;
    const body = await request.json();
    const { id, role, content, metadata, attachments = [], model, tokens, processingTime, timestamp } = body;

    // Enhanced logging for debugging message storage issues (including Vercel environment)
    console.log('📝 Message storage API called:', {
      conversationId,
      messageId: id,
      role,
      contentLength: content?.length || 0,
      hasMetadata: !!metadata,
      messageType: metadata?.type || 'unknown',
      storedViaFallback: metadata?.storedViaFallback || false,
      timestamp: new Date().toISOString(),
      providedTimestamp: timestamp,
      // Vercel debugging info
      vercelRegion: process.env.VERCEL_REGION || 'local',
      vercelUrl: process.env.VERCEL_URL || 'localhost',
      functionTimeout: process.env.VERCEL_FUNCTION_TIMEOUT || 'unknown',
      isServerless: !!process.env.LAMBDA_TASK_ROOT
    });

    // Validate that conversation exists before storing message
    const { data: conversation, error: conversationError } = await supabaseAdmin
      .from('Conversation')
      .select('id, userId, sessionId, metadata')
      .eq('id', conversationId)
      .single();

    if (conversationError || !conversation) {
      console.error('❌ Conversation not found for message storage:', {
        conversationId,
        error: conversationError?.message
      });
      return NextResponse.json({ 
        error: 'Conversation not found',
        conversationId 
      }, { status: 404 });
    }

    console.log('✅ Conversation found for message storage:', {
      conversationId: conversation.id,
      userId: conversation.userId || 'GUEST',
      isGuest: !conversation.userId
    });

    // Use provided ID if available, otherwise generate a unique message ID
    const messageId = id || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Check for duplicate messages (by ID or by content)
    if (id) {
      console.log('🔍 Checking for existing message with ID:', messageId);
      
      // First check for ID duplicates
      const { data: existingById } = await supabaseAdmin
        .from('ConversationMessage')
        .select('id, role, content')
        .eq('id', messageId)
        .single();

      if (existingById) {
        console.log('⚠️ ID DUPLICATE DETECTED:', { messageId, existingRole: existingById.role });
        return NextResponse.json({
          id: existingById.id,
          success: true,
          message: 'Message with same ID already exists',
          conversationId,
          skipped: true
        });
      }

      // Second check for content duplicates (critical for fallback scenario)
      if (content && content.length > 10) {
        const { data: existingByContent } = await supabaseAdmin
          .from('ConversationMessage')
          .select('id, role, content, createdAt')
          .eq('conversationId', conversationId)
          .eq('role', role.toUpperCase())
          .eq('content', content)
          .single();

        if (existingByContent) {
          console.log('⚠️ CONTENT DUPLICATE DETECTED - Identical message already exists:', {
            existingId: existingByContent.id,
            existingCreatedAt: existingByContent.createdAt,
            newMessageId: messageId,
            role: role,
            contentLength: content.length
          });
          return NextResponse.json({
            id: existingByContent.id,
            success: true,
            message: 'Message with identical content already exists',
            conversationId,
            skipped: true,
            duplicateType: 'content'
          });
        }
      }

      console.log('✅ No existing message found (ID or content) - proceeding with insertion');
    } else {
      console.log('🆕 No ID provided, generating new message ID');
    }

    // Create the message - using supabaseAdmin means no session required
    const { data: message, error: createError } = await supabaseAdmin
      .from('ConversationMessage')
      .insert({
        id: messageId,
        conversationId,
        role: role.toUpperCase(), // Normalize role to uppercase
        content,
        metadata: {
          ...metadata,
          messageStoredAt: new Date().toISOString(),
          conversationContext: {
            userId: conversation.userId,
            isGuest: !conversation.userId,
            sessionId: conversation.sessionId
          }
        },
        attachments,
        model,
        tokens,
        processingTime,
        createdAt: timestamp || new Date().toISOString(), // Use provided timestamp if available
        updatedAt: new Date().toISOString(), // Fix: Add missing updatedAt field
      })
      .select()
      .single();

    if (createError) {
      console.error('❌ Database error creating message:', {
        error: createError,
        conversationId,
        role,
        contentLength: content?.length || 0,
        messageId
      });
      throw createError;
    }

    console.log('✅ Message created successfully:', {
      messageId: message.id,
      conversationId,
      role: message.role,
      contentLength: content?.length || 0,
      storedAt: message.createdAt
    });

    // Update conversation last activity
    const { error: updateError } = await supabaseAdmin
      .from('Conversation')
      .update({ 
        lastActivity: new Date().toISOString(),
        // Update message count in metadata if it exists
        metadata: {
          ...conversation.metadata,
          lastMessageAt: new Date().toISOString(),
          messageCount: (conversation.metadata?.messageCount || 0) + 1
        }
      })
      .eq('id', conversationId);

    if (updateError) {
      console.error('❌ Error updating conversation lastActivity:', {
        error: updateError,
        conversationId
      });
    } else {
      console.log('✅ Conversation lastActivity updated successfully');
    }

    return NextResponse.json({
      ...message,
      success: true,
      conversationId,
      timestamp: message.createdAt
    });
  } catch (error) {
    // Try to get the conversationId for error reporting
    let errorConversationId = 'unknown';
    try {
      const resolvedParams = await params;
      errorConversationId = resolvedParams.id;
    } catch (e) {
      // If params resolution fails, use unknown
    }

    console.error('❌ CRITICAL: Message storage API error:', {
      error: error.message,
      stack: error.stack,
      conversationId: errorConversationId,
      requestBody: { 
        role: role || 'unknown', 
        contentLength: content?.length || 0,
        hasMetadata: !!metadata,
        messageType: metadata?.type
      }
    });
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error.message,
      conversationId: errorConversationId
    }, { status: 500 });
  }
}