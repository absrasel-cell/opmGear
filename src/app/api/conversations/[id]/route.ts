import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import prisma from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const conversationId = params.id;

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
    const conversation = await prisma.conversation.findUnique({
      where: {
        id: conversationId,
        userId: userId, // Ensure user can only access their own conversations
      },
      include: {
        ConversationMessage: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
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
      ConversationMessage: conversation.ConversationMessage.map(msg => ({
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
      messageCount: conversation.ConversationMessage.length
    };

    return NextResponse.json(transformedConversation);
  } catch (error) {
    console.error('Error fetching conversation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const conversationId = params.id;
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

    const conversation = await prisma.conversation.update({
      where: { 
        id: conversationId,
        userId: userId // Ensure user can only update their own conversations
      },
      data: updateData,
    });

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
  { params }: { params: { id: string } }
) {
  try {
    const conversationId = params.id;

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
    const deletedConversation = await prisma.conversation.delete({
      where: {
        id: conversationId,
        userId: userId, // Ensure user can only delete their own conversations
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Conversation deleted successfully',
      deletedConversationId: deletedConversation.id
    });
  } catch (error) {
    console.error('Error deleting conversation:', error);
    
    // Check if it's a "record not found" error
    if (error instanceof Error && error.message.includes('Record to delete does not exist')) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}