import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabase';

export async function DELETE(request: NextRequest) {
  try {
    // Authentication using same approach as single conversation deletion
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
        console.log('❌ BULK DELETE Conversations: No access token found in cookies');
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

      console.log('🔍 BULK DELETE Conversations: Attempting to get user session...');
      const { data: { user }, error } = await supabase.auth.getUser();

      if (error || !user) {
        console.log('❌ BULK DELETE Conversations: No authenticated user found:', error?.message);
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
      }

      userId = user.id;
      console.log('✅ BULK DELETE Conversations: Authenticated user found:', userId);
    } catch (authError) {
      console.log('❌ BULK DELETE Conversations: Auth error:', authError);
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // First, get count of conversations to be deleted for logging
    const { count: conversationCount, error: countError } = await supabaseAdmin
      .from('Conversation')
      .select('*', { count: 'exact', head: true })
      .eq('userId', userId);

    if (countError) {
      console.error('❌ Error counting conversations:', countError);
      throw countError;
    }

    console.log(`🗑️ BULK DELETE: Deleting ${conversationCount || 0} conversations for user ${userId}`);

    // Delete all conversations for the user (messages will be deleted via cascade)
    const { data: deletedConversations, error: deleteError } = await supabaseAdmin
      .from('Conversation')
      .delete()
      .eq('userId', userId)
      .select('id');

    if (deleteError) {
      console.error('❌ Error bulk deleting conversations:', deleteError);
      throw deleteError;
    }

    const deletedCount = deletedConversations?.length || 0;
    console.log(`✅ BULK DELETE: Successfully deleted ${deletedCount} conversations`);

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${deletedCount} conversation${deletedCount !== 1 ? 's' : ''}`,
      deletedCount: deletedCount,
      deletedConversationIds: deletedConversations?.map(conv => conv.id) || []
    });

  } catch (error) {
    console.error('❌ Error in bulk delete conversations:', error);

    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}