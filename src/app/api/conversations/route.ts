import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  console.log('🔥 Conversations API - V4.0 SIMPLIFIED AUTH');
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Authentication using EXACT same approach as /api/auth/session
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
        console.log('❌ No access token found in cookies');
        console.log('🔄 Returning empty conversations array');
        return NextResponse.json([]);
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

      // Create a Supabase client with the access token (EXACT match to session API)
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

      // Get user from Supabase (EXACT match to session API)
      console.log('🔍 Getting user from Supabase...');
      const { data: { user }, error } = await supabase.auth.getUser();

      if (error || !user) {
        console.log('❌ Supabase auth failed:', error?.message || 'No user');
        console.log('🔄 Returning empty conversations array');
        return NextResponse.json([]);
      }

      userId = user.id;
      console.log('✅ Authenticated user found:', userId);

    } catch (authError) {
      console.log('❌ Auth error:', authError);
      console.log('🔄 Returning empty conversations array');
      return NextResponse.json([]);
    }

    console.log('📊 DATABASE QUERY: Starting conversation query for user:', userId);
    
    const whereClause = { userId };
    console.log('📊 Where clause:', whereClause);

    // First, let's check if ANY conversations exist for this user (ignore isArchived)
    const totalUserConversations = await prisma.conversation.count({
      where: { userId }
    });
    console.log('📊 Total conversations for user (including archived):', totalUserConversations);

    const conversations = await prisma.conversation.findMany({
      where: {
        ...whereClause,
        isArchived: false,
      },
      include: {
        ConversationMessage: {
          orderBy: { createdAt: 'desc' },
          take: 1, // Get only the latest message for preview
        },
        _count: {
          select: {
            ConversationMessage: true,
          },
        },
      },
      orderBy: { lastActivity: 'desc' },
      take: limit,
      skip: offset,
    });

    // Transform the data for frontend
    const transformedConversations = conversations.map(conv => ({
      id: conv.id,
      title: conv.title || 'Untitled Conversation',
      context: conv.context,
      status: conv.status,
      lastActivity: conv.lastActivity,
      messageCount: conv._count.ConversationMessage,
      lastMessage: conv.ConversationMessage[0] ? {
        content: conv.ConversationMessage[0].content.substring(0, 100) + '...',
        timestamp: conv.ConversationMessage[0].createdAt,
        role: conv.ConversationMessage[0].role,
      } : null,
      tags: conv.tags,
      createdAt: conv.createdAt,
    }));

    return NextResponse.json(transformedConversations);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, sessionId, title, context = 'SUPPORT', metadata } = body;

    if (!userId && !sessionId) {
      return NextResponse.json({ error: 'User ID or Session ID required' }, { status: 400 });
    }

    // Generate a unique conversation ID
    const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const conversation = await prisma.conversation.create({
      data: {
        id: conversationId,
        userId,
        sessionId,
        title: title || null,
        context,
        metadata,
        lastActivity: new Date(),
      },
    });

    return NextResponse.json(conversation);
  } catch (error) {
    console.error('Error creating conversation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { conversationId, title, metadata, lastActivity } = body;

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
        console.log('❌ PATCH: No access token found in cookies');
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

      console.log('🔍 PATCH: Attempting to get user session...');
      const { data: { user }, error } = await supabase.auth.getUser();

      if (error || !user) {
        console.log('❌ PATCH: No authenticated user found:', error?.message);
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
      }

      userId = user.id;
      console.log('✅ PATCH: Authenticated user found:', userId);

    } catch (authError) {
      console.log('❌ PATCH: Auth error:', authError);
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Build update data
    const updateData: any = {
      updatedAt: new Date()
    };

    if (title) updateData.title = title;
    if (metadata) updateData.metadata = metadata;
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
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}