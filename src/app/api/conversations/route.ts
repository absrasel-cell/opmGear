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
    const { count: totalUserConversations } = await supabaseAdmin
      .from('Conversation')
      .select('id', { count: 'exact', head: true })
      .eq('userId', userId);
    
    console.log('📊 Total conversations for user (including archived):', totalUserConversations);

    // Get all conversations (both support and quote requests) - don't filter by context
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
        ConversationMessage (
          id,
          content,
          createdAt,
          role
        ),
        ConversationQuotes (
          id,
          quoteOrderId,
          isMainQuote,
          createdAt,
          QuoteOrder (
            id,
            status,
            estimatedCosts,
            customerName,
            customerCompany,
            completedAt
          )
        ),
        OrderBuilderState (
          totalCost,
          totalUnits,
          currentStep,
          isCompleted,
          completedAt
        )
      `)
      .eq('userId', userId)
      .eq('isArchived', false)
      .order('lastActivity', { ascending: false })
      .range(offset, offset + limit - 1);

    if (conversationsError) {
      throw conversationsError;
    }

    // Transform the data for frontend with quote information
    const transformedConversations = (conversations || []).map(conv => {
      const mainQuote = conv.ConversationQuotes?.[0];
      const orderBuilderState = conv.OrderBuilderState?.[0];
      const latestMessage = conv.ConversationMessage?.[conv.ConversationMessage?.length - 1]; // Get the most recent message
      
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
        messageCount: conv.ConversationMessage?.length || 0,
        lastMessage: latestMessage ? {
          content: latestMessage.content.length > 100 
            ? latestMessage.content.substring(0, 100) + '...' 
            : latestMessage.content,
          timestamp: latestMessage.createdAt,
          role: latestMessage.role,
        } : null,
        tags: conv.tags,
        createdAt: conv.createdAt,
        
        // Quote-specific data from metadata and relations
        hasQuote: hasQuoteData,
        intent: intent,
        quoteData: mainQuote ? {
          quoteId: mainQuote.id,
          quoteOrderId: mainQuote.quoteOrderId,
          isMainQuote: mainQuote.isMainQuote,
          quoteOrder: mainQuote.QuoteOrder ? {
            id: mainQuote.QuoteOrder.id,
            status: mainQuote.QuoteOrder.status,
            estimatedCosts: mainQuote.QuoteOrder.estimatedCosts,
            customerName: mainQuote.QuoteOrder.customerName,
            customerCompany: mainQuote.QuoteOrder.customerCompany,
            completedAt: mainQuote.QuoteOrder.completedAt
          } : null
        } : null,
        
        // Order Builder state summary
        orderBuilderSummary: orderBuilderState ? {
          totalCost: orderBuilderState.totalCost ? parseFloat(orderBuilderState.totalCost.toString()) : null,
          totalUnits: orderBuilderState.totalUnits,
          currentStep: orderBuilderState.currentStep,
          isCompleted: orderBuilderState.isCompleted,
          completedAt: orderBuilderState.completedAt
        } : null,
        
        // Add metadata for debugging and additional context
        metadata: metadata
      };
    });

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