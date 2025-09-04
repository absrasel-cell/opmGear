import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  console.log('🔥 Conversations API - V2.0 WITH SESSION ENDPOINT');
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get user by calling the session endpoint internally (reuse working logic)
    let userId: string | null = null;
    try {
      // Make internal call to session endpoint with same cookies
      const sessionResponse = await fetch(`${request.nextUrl.origin}/api/auth/session`, {
        headers: {
          // Forward all cookies from the original request
          cookie: request.headers.get('cookie') || ''
        }
      });

      if (sessionResponse.ok) {
        const sessionData = await sessionResponse.json();
        if (sessionData.user?.id) {
          userId = sessionData.user.id;
          console.log('✅ Conversations API: Got user from session:', userId);
        } else {
          console.log('❌ Conversations API: No user in session response');
          return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }
      } else {
        console.log('❌ Conversations API: Session call failed with status:', sessionResponse.status);
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
      }
    } catch (authError) {
      console.log('❌ Conversations API: Auth failed:', authError);
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const whereClause = { userId };

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