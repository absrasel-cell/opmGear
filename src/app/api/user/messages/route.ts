import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-helpers';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
 try {
  const user = await requireAuth(request);

  // Fetch messages with graceful database failure handling
  let messages = [];
  try {
   const { data: messagesData, error } = await supabaseAdmin
     .from('messages')
     .select(`
       *,
       fromUser:users!messages_fromUserId_fkey(
         id, name, email, role
       ),
       toUser:users!messages_toUserId_fkey(
         id, name, email, role
       ),
       replyTo:messages!messages_replyToId_fkey(*)
     `)
     .or(`fromUserId.eq.${user.id},toUserId.eq.${user.id}`)
     .order('createdAt', { ascending: false });

   if (error) {
     throw error;
   }

   messages = messagesData || [];

   return NextResponse.json({ messages });

  } catch (dbError) {
   console.error('Database error when fetching messages:', dbError);
   
   // Return empty messages list when database is unavailable
   return NextResponse.json({
    messages: [],
    note: 'Messages temporarily unavailable due to database maintenance.',
   }, { status: 200 });
  }
 } catch (error: any) {
  if (error.message === 'Unauthorized') {
   return NextResponse.json(
    { error: 'Unauthorized' },
    { status: 401 }
   );
  }
  console.error('Error fetching user messages:', error);
  return NextResponse.json(
   { error: 'Failed to fetch messages' },
   { status: 500 }
  );
 }
}