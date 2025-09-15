import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const conversationId = resolvedParams.id;

    if (!conversationId) {
      return NextResponse.json({ error: 'Conversation ID is required' }, { status: 400 });
    }

    // Authentication using same approach as /api/auth/session
    let userId: string | null = null;
    try {
      const cookieStore = await cookies();
      
      // Try the correct Supabase cookie name first
      let accessToken = cookieStore.get('sb-nowxzkdkaegjwfhhqoez-auth-token')?.value;
      
      // Fallback to the shorter name if not found
      if (!accessToken) {
        accessToken = cookieStore.get('sb-access-token')?.value;
      }

      if (!accessToken) {
        console.log('❌ GET Conversation: No access token found in cookies');
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
      }

      // Parse the access token from the JSON if it's stored as JSON
      let token = accessToken;
      try {
        const parsedToken = JSON.parse(accessToken);
        if (parsedToken.access_token) {
          token = parsedToken.access_token;
        }
      } catch (e) {
        // If it's not JSON, use as is
      }

      // Create a Supabase client with the access token
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          global: {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        }
      );

      console.log('🔍 GET Conversation: Attempting to get user session...');
      const { data: { user }, error } = await supabase.auth.getUser();

      if (error || !user) {
        console.log('❌ GET Conversation: No authenticated user found:', error?.message);
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
      }

      userId = user.id;
      console.log('✅ GET Conversation: Authenticated user found:', userId);

    } catch (authError) {
      console.log('❌ GET Conversation: Auth error:', authError);
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Fetch the specific conversation with messages
    const { data: conversation, error: fetchError } = await supabaseAdmin
      .from('Conversation')
      .select(`
        *,
        ConversationMessage (
          id,
          role,
          content,
          metadata,
          attachments,
          isEdited,
          editedAt,
          tokens,
          processingTime,
          model,
          error,
          createdAt,
          updatedAt
        )
      `)
      .eq('id', conversationId)
      .eq('userId', userId)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
      }
      throw fetchError;
    }

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // CRITICAL FIX: Fetch associated OrderBuilderState for this conversation
    let orderBuilderState = null;
    try {
      console.log('🔍 Fetching OrderBuilderState for conversation:', conversationId);

      // Try to find OrderBuilderState by conversation relationship
      const { data: conversationQuote } = await supabaseAdmin
        .from('ConversationQuotes')
        .select('orderBuilderStateId')
        .eq('conversationId', conversationId)
        .single();

      if (conversationQuote?.orderBuilderStateId) {
        const { data: builderState } = await supabaseAdmin
          .from('OrderBuilderState')
          .select('*')
          .eq('id', conversationQuote.orderBuilderStateId)
          .single();

        if (builderState) {
          orderBuilderState = builderState;
          console.log('✅ OrderBuilderState found via ConversationQuotes:', orderBuilderState.id);
        }
      }

      // Fallback: Try to find by sessionId if no direct relationship
      if (!orderBuilderState && conversation.metadata?.session?.sessionId) {
        console.log('🔍 Fallback: Searching OrderBuilderState by sessionId');
        const { data: builderStateBySession } = await supabaseAdmin
          .from('OrderBuilderState')
          .select('*')
          .eq('sessionId', conversation.metadata.session.sessionId)
          .order('updatedAt', { ascending: false })
          .limit(1)
          .single();

        if (builderStateBySession) {
          orderBuilderState = builderStateBySession;
          console.log('✅ OrderBuilderState found via sessionId:', orderBuilderState.id);
        }
      }

      if (orderBuilderState) {
        console.log('📋 OrderBuilderState loaded:', {
          id: orderBuilderState.id,
          isCompleted: orderBuilderState.isCompleted,
          totalCost: orderBuilderState.totalCost,
          hasCapStyleSetup: !!orderBuilderState.capStyleSetup,
          hasCustomization: !!orderBuilderState.customization,
          hasDelivery: !!orderBuilderState.delivery,
          hasCostBreakdown: !!orderBuilderState.costBreakdown
        });
      }
    } catch (builderError) {
      console.warn('⚠️ Error fetching OrderBuilderState (non-critical):', builderError);
    }

    // Sort messages by creation time
    const sortedMessages = (conversation.ConversationMessage || []).sort((a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    // Debug logging for conversation data
    console.log('🗂️ Raw conversation data from DB:', {
      id: conversation.id,
      title: conversation.title,
      hasMetadata: !!conversation.metadata,
      metadataKeys: conversation.metadata ? Object.keys(conversation.metadata) : [],
      messageCount: sortedMessages.length
    });

    if (conversation.metadata?.orderBuilder) {
      console.log('📋 Order Builder metadata found:', conversation.metadata.orderBuilder);
    }

    // Transform the data for frontend consumption
    const transformedConversation = {
      id: conversation.id,
      title: conversation.title,
      context: conversation.context,
      status: conversation.status,
      metadata: conversation.metadata,
      tags: conversation.tags,
      summary: conversation.summary,
      lastActivity: conversation.lastActivity,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
      // CRITICAL FIX: Include OrderBuilderState for Order Builder restoration
      orderBuilderState: orderBuilderState,
      ConversationMessage: sortedMessages.map(msg => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        metadata: msg.metadata,
        attachments: msg.attachments,
        isEdited: msg.isEdited,
        editedAt: msg.editedAt,
        tokens: msg.tokens,
        processingTime: msg.processingTime,
        model: msg.model,
        error: msg.error,
        createdAt: msg.createdAt,
        updatedAt: msg.updatedAt
      })),
      messageCount: sortedMessages.length
    };

    return NextResponse.json(transformedConversation);
  } catch (error) {
    console.error('Error fetching conversation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const conversationId = resolvedParams.id;
    const body = await request.json();
    const { title, metadata, lastActivity } = body;

    if (!conversationId) {
      return NextResponse.json({ error: 'Conversation ID is required' }, { status: 400 });
    }

    // Authentication using same approach as /api/auth/session
    let userId: string | null = null;
    try {
      const cookieStore = await cookies();
      
      // Try the correct Supabase cookie name first
      let accessToken = cookieStore.get('sb-nowxzkdkaegjwfhhqoez-auth-token')?.value;
      
      // Fallback to the shorter name if not found
      if (!accessToken) {
        accessToken = cookieStore.get('sb-access-token')?.value;
      }

      if (!accessToken) {
        console.log('❌ PATCH Conversation: No access token found in cookies');
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
      }

      // Parse the access token from the JSON if it's stored as JSON
      let token = accessToken;
      try {
        const parsedToken = JSON.parse(accessToken);
        if (parsedToken.access_token) {
          token = parsedToken.access_token;
        }
      } catch (e) {
        // If it's not JSON, use as is
      }

      // Create a Supabase client with the access token
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          global: {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        }
      );

      console.log('🔍 PATCH Conversation: Attempting to get user session...');
      const { data: { user }, error } = await supabase.auth.getUser();

      if (error || !user) {
        console.log('❌ PATCH Conversation: No authenticated user found:', error?.message);
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
      }

      userId = user.id;
      console.log('✅ PATCH Conversation: Authenticated user found:', userId);
    } catch (authError) {
      console.log('❌ PATCH Conversation: Auth error:', authError);
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Build update data
    const updateData: any = {
      updatedAt: new Date()
    };

    if (title !== undefined) updateData.title = title;
    if (metadata !== undefined) updateData.metadata = metadata;
    if (lastActivity) updateData.lastActivity = new Date(lastActivity);

    const { data: conversation, error: updateError } = await supabaseAdmin
      .from('Conversation')
      .update(updateData)
      .eq('id', conversationId)
      .eq('userId', userId)
      .select()
      .single();

    if (updateError) {
      if (updateError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
      }
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      conversation: {
        id: conversation.id,
        title: conversation.title,
        metadata: conversation.metadata,
        lastActivity: conversation.lastActivity,
        updatedAt: conversation.updatedAt
      }
    });
  } catch (error) {
    console.error('Error updating conversation:', error);
    
    if (error instanceof Error && error.message.includes('Record to update not found')) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const conversationId = resolvedParams.id;

    if (!conversationId) {
      return NextResponse.json({ error: 'Conversation ID is required' }, { status: 400 });
    }

    // Authentication using same approach as /api/auth/session
    let userId: string | null = null;
    try {
      const cookieStore = await cookies();
      
      // Try the correct Supabase cookie name first
      let accessToken = cookieStore.get('sb-nowxzkdkaegjwfhhqoez-auth-token')?.value;
      
      // Fallback to the shorter name if not found
      if (!accessToken) {
        accessToken = cookieStore.get('sb-access-token')?.value;
      }

      if (!accessToken) {
        console.log('❌ DELETE Conversation: No access token found in cookies');
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
      }

      // Parse the access token from the JSON if it's stored as JSON
      let token = accessToken;
      try {
        const parsedToken = JSON.parse(accessToken);
        if (parsedToken.access_token) {
          token = parsedToken.access_token;
        }
      } catch (e) {
        // If it's not JSON, use as is
      }

      // Create a Supabase client with the access token
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          global: {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        }
      );

      console.log('🔍 DELETE Conversation: Attempting to get user session...');
      const { data: { user }, error } = await supabase.auth.getUser();

      if (error || !user) {
        console.log('❌ DELETE Conversation: No authenticated user found:', error?.message);
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
      }

      userId = user.id;
      console.log('✅ DELETE Conversation: Authenticated user found:', userId);
    } catch (authError) {
      console.log('❌ DELETE Conversation: Auth error:', authError);
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Delete the conversation (messages will be deleted via cascade)
    const { data: deletedConversation, error: deleteError } = await supabaseAdmin
      .from('Conversation')
      .delete()
      .eq('id', conversationId)
      .eq('userId', userId)
      .select();

    if (deleteError) {
      if (deleteError.code === 'PGRST116' || deleteError.message?.includes('No rows deleted')) {
        // Conversation doesn't exist, but that's fine - idempotent deletion
        console.log(`✅ DELETE Conversation: Conversation ${conversationId} already deleted or doesn't exist`);
        return NextResponse.json({
          success: true,
          message: 'Conversation deleted successfully (already removed)',
          deletedConversationId: conversationId
        });
      }
      throw deleteError;
    }

    // Check if any conversation was actually deleted
    if (!deletedConversation || deletedConversation.length === 0) {
      // No conversation found, but return success for idempotent behavior
      console.log(`✅ DELETE Conversation: Conversation ${conversationId} already deleted or doesn't exist`);
      return NextResponse.json({
        success: true,
        message: 'Conversation deleted successfully (already removed)',
        deletedConversationId: conversationId
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Conversation deleted successfully',
      deletedConversationId: deletedConversation[0].id
    });
  } catch (error) {
    console.error('Error deleting conversation:', error);
    
    // Check if it's a "record not found" error - treat as success for idempotent behavior
    if (error instanceof Error && (
      error.message.includes('Record to delete does not exist') ||
      error.message.includes('No rows deleted') ||
      error.message.includes('PGRST116')
    )) {
      console.log(`✅ DELETE Conversation: Conversation ${conversationId} already deleted (caught in error handler)`);
      return NextResponse.json({
        success: true,
        message: 'Conversation deleted successfully (already removed)',
        deletedConversationId: conversationId
      });
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}