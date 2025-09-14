import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  console.log('🔥 Conversations API - V4.0 SIMPLIFIED AUTH');
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Debug request headers
    console.log('📋 Request headers:', {
      authorization: request.headers.get('Authorization') ? 'Present' : 'Missing',
      contentType: request.headers.get('Content-Type'),
      origin: request.headers.get('Origin'),
      userAgent: request.headers.get('User-Agent')?.substring(0, 50) || 'Unknown'
    });

    // Authentication using Authorization header first, then cookies
    let userId: string | null = null;
    try {
      let token: string | null = null;

      // First try Authorization header (for API calls from frontend)
      const authHeader = request.headers.get('Authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
        console.log('✅ Using Authorization header for authentication');
      } else {
        // Fallback to cookies (for direct browser requests)
        const cookieStore = await cookies();

        // Try the correct Supabase cookie name first
        let accessToken = cookieStore.get('sb-nowxzkdkaegjwfhhqoez-auth-token')?.value;

        // Fallback to the shorter name if not found
        if (!accessToken) {
          accessToken = cookieStore.get('sb-access-token')?.value;
        }

        if (!accessToken) {
          console.log('❌ No access token found in cookies or Authorization header');
          console.log('🔄 Returning empty conversations array');
          return NextResponse.json([]);
        }

        // Parse the access token from the JSON if it's stored as JSON
        token = accessToken;
        try {
          const parsedToken = JSON.parse(accessToken);
          if (parsedToken.access_token) {
            token = parsedToken.access_token;
          }
        } catch (e) {
          // If it's not JSON, use as is
        }
        console.log('✅ Using cookie authentication');
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
    const { count: totalUserConversations } = await supabaseAdmin
      .from('Conversation')
      .select('id', { count: 'exact', head: true })
      .eq('userId', userId);
    
    console.log('📊 Total conversations for user (including archived):', totalUserConversations);

    // Get basic conversation data first, then join messages separately
    const { data: conversations, error: conversationsError } = await supabaseAdmin
      .from('Conversation')
      .select(`
        id,
        userId,
        title,
        context,
        status,
        lastActivity,
        tags,
        createdAt,
        metadata,
        isArchived
      `)
      .eq('userId', userId)
      .eq('isArchived', false)
      .order('lastActivity', { ascending: false })
      .range(offset, offset + limit - 1);

    console.log('📊 Basic conversation query result:', {
      conversationCount: conversations?.length || 0,
      error: conversationsError?.message || 'none',
      firstConv: conversations?.[0]?.id || 'none'
    });

    if (conversationsError) {
      throw conversationsError;
    }

    // Now get message counts and last messages for each conversation
    const transformedConversations = await Promise.all((conversations || []).map(async (conv) => {
      // Get message count for this conversation
      const { count: messageCount } = await supabaseAdmin
        .from('ConversationMessage')
        .select('id', { count: 'exact', head: true })
        .eq('conversationId', conv.id);

      // Get latest message for this conversation
      const { data: latestMessages } = await supabaseAdmin
        .from('ConversationMessage')
        .select('content, createdAt, role')
        .eq('conversationId', conv.id)
        .order('createdAt', { ascending: false })
        .limit(1);

      const latestMessage = latestMessages?.[0];

      // Extract quote data from metadata if available
      const metadata = conv.metadata || {};
      const hasQuoteData = metadata.hasQuoteData || false;
      const intent = metadata.intent;

      return {
        id: conv.id,
        title: conv.title || (conv.context === 'SUPPORT' ? 'Support Conversation' : 'Quote Conversation'),
        context: conv.context,
        status: conv.status,
        lastActivity: conv.lastActivity,
        messageCount: messageCount || 0,
        lastMessage: latestMessage ? {
          content: latestMessage.content.length > 100
            ? latestMessage.content.substring(0, 100) + '...'
            : latestMessage.content,
          timestamp: latestMessage.createdAt,
          role: latestMessage.role,
        } : null,
        tags: conv.tags,
        createdAt: conv.createdAt,

        // Quote-specific data from metadata
        hasQuote: hasQuoteData,
        intent: intent,
        quoteData: null, // Will be populated later when needed
        orderBuilderSummary: null, // Will be populated later when needed

        // Add metadata for debugging and additional context
        metadata: metadata
      };
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

    // Enhanced logging for conversation creation debugging
    console.log('🔥 Conversation Creation API called:', {
      hasUserId: !!userId,
      hasSessionId: !!sessionId,
      context,
      metadataKeys: metadata ? Object.keys(metadata) : []
    });

    // Allow creation with either userId OR sessionId (for guest users)
    if (!userId && !sessionId) {
      console.error('❌ Conversation creation failed: No userId or sessionId provided');
      return NextResponse.json({ error: 'User ID or Session ID required' }, { status: 400 });
    }

    // If no userId but sessionId exists, this is a guest user conversation
    const isGuestConversation = !userId && !!sessionId;
    
    // Generate a unique conversation ID
    const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    console.log('💾 Creating conversation:', {
      conversationId,
      userId: userId || 'GUEST',
      sessionId,
      isGuest: isGuestConversation,
      context
    });

    const { data: conversation, error: createError } = await supabaseAdmin
      .from('Conversation')
      .insert({
        id: conversationId,
        userId: userId || null, // Allow null for guest users
        sessionId,
        title: title || null,
        context,
        hasQuote: metadata?.hasQuoteData || false, // Set hasQuote flag based on metadata
        metadata: {
          ...metadata,
          isGuest: isGuestConversation,
          createdAt: new Date().toISOString()
        },
        lastActivity: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(), // Fix: Add missing updatedAt field
      })
      .select()
      .single();

    if (createError) {
      console.error('❌ Database error creating conversation:', {
        error: createError,
        conversationId,
        userId: userId || 'GUEST',
        sessionId
      });
      throw createError;
    }

    console.log('✅ Conversation created successfully:', {
      conversationId: conversation.id,
      userId: conversation.userId || 'GUEST',
      context: conversation.context
    });

    return NextResponse.json(conversation);
  } catch (error) {
    console.error('❌ CRITICAL: Conversation creation error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
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

    const { data: conversation, error: updateError } = await supabaseAdmin
      .from('Conversation')
      .update(updateData)
      .eq('id', conversationId)
      .eq('userId', userId)
      .select()
      .single();

    if (updateError) {
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
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}