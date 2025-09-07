import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
 try {
  console.log('🔍 GET /api/support/conversations called');
  
  // Get the authorization header
  const authorization = request.headers.get('Authorization');
  console.log('📝 Authorization header:', authorization ? 'Present' : 'Missing');
  
  if (!authorization?.startsWith('Bearer ')) {
   console.log('❌ No Authorization header found, returning empty conversations');
   return NextResponse.json({ conversations: [], total: 0 }, { status: 200 });
  }

  const token = authorization.replace('Bearer ', '');
  console.log('📝 Token length:', token.length);
  
  // Verify the token with Supabase
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) {
   console.log('❌ Invalid token or user not found:', error?.message);
   return NextResponse.json({ conversations: [], total: 0 }, { status: 200 });
  }

  console.log('✅ Fetching conversations for user:', user.id, user.email);

  // Fetch all conversations for the user with their messages
  const { data: conversations, error: conversationsError } = await supabaseAdmin
    .from('Conversation')
    .select(`
      *,
      ConversationMessage (
        id,
        role,
        content,
        createdAt,
        model
      )
    `)
    .eq('userId', user.id)
    .eq('isArchived', false)
    .order('lastActivity', { ascending: false });

  if (conversationsError) {
    throw conversationsError;
  }

  console.log('Found conversations:', conversations.length);
  
  // Also check for conversations by sessionId in case userId is not matching
  const { data: allSupportConversations } = await supabaseAdmin
    .from('Conversation')
    .select(`
      id,
      userId,
      sessionId,
      createdAt
    `)
    .eq('context', 'SUPPORT')
    .eq('isArchived', false)
    .order('createdAt', { ascending: false })
    .limit(10);
  
  console.log('All recent support conversations:', allSupportConversations);

  // Format the response
  const formattedConversations = (conversations || []).map(conversation => {
    // Sort messages by creation time and take first 3 for preview
    const sortedMessages = (conversation.ConversationMessage || [])
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .slice(0, 3);

    return {
      id: conversation.id,
      title: conversation.title,
      context: conversation.context,
      status: conversation.status,
      lastActivity: conversation.lastActivity,
      createdAt: conversation.createdAt,
      messageCount: conversation.ConversationMessage?.length || 0,
      preview: sortedMessages.length > 0 ? {
        content: sortedMessages[0].content.substring(0, 100) + '...',
        role: sortedMessages[0].role
      } : null,
      messages: sortedMessages.map(msg => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        createdAt: msg.createdAt,
        model: msg.model
      }))
    };
  });

  console.log('📊 Returning conversations:', {
   count: formattedConversations.length,
   conversationIds: formattedConversations.map(c => c.id)
  });
  
  return NextResponse.json({ 
   conversations: formattedConversations,
   total: formattedConversations.length 
  });

 } catch (error) {
  console.error('Error fetching conversations:', error);
  return NextResponse.json(
   { error: 'Failed to fetch conversations' },
   { status: 500 }
  );
 }
}

export async function DELETE(request: NextRequest) {
 try {
  // Get the authorization header
  const authorization = request.headers.get('Authorization');
  
  if (!authorization?.startsWith('Bearer ')) {
   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = authorization.replace('Bearer ', '');
  
  // Verify the token with Supabase
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) {
   return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  // Delete all conversations and their messages for the user
  // Due to the cascade delete relationship, deleting conversations will also delete their messages
  const { data: deletedConversations, error: deleteError } = await supabaseAdmin
    .from('Conversation')
    .delete()
    .eq('userId', user.id)
    .select('id');

  if (deleteError) {
    throw deleteError;
  }

  return NextResponse.json({ 
   message: 'All conversations deleted successfully',
   deletedCount: deletedConversations?.length || 0
  });

 } catch (error) {
  console.error('Error deleting conversations:', error);
  return NextResponse.json(
   { error: 'Failed to delete conversations' },
   { status: 500 }
  );
 }
}