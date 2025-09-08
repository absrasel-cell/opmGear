import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-helpers';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
 try {
  const user = await getCurrentUser();
  if (!user || user.role !== 'ADMIN') {
   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const category = searchParams.get('category');
  const isAdminView = searchParams.get('isAdminView') === 'true';

  // Build query
  const where: any = {};
  
  if (isAdminView) {
   // Admin viewing all messages
   where.isAdminMessage = false; // Show user messages to admin
  } else if (userId) {
   // User viewing their messages
   where.OR = [
    { fromUserId: userId },
    { toUserId: userId },
   ];
  }

  if (category) {
   where.category = category;
  }

  // Convert Prisma where clause to Supabase filter
  let query = supabaseAdmin.from('messages').select(`
    *,
    fromUser:users!messages_fromUserId_fkey(
      id, name, email, role
    ),
    toUser:users!messages_toUserId_fkey(
      id, name, email, role
    ),
    replyTo:messages!messages_replyToId_fkey(*)
  `);

  // Apply filters based on where clause
  if (isAdminView) {
    query = query.eq('isAdminMessage', false);
  } else if (userId) {
    query = query.or(`fromUserId.eq.${userId},toUserId.eq.${userId}`);
  }

  if (category) {
    query = query.eq('category', category);
  }

  const { data: messages, error } = await query.order('createdAt', { ascending: false });

  if (error) {
    console.error('Supabase error fetching admin messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }

  return NextResponse.json({ messages: messages || [] });
 } catch (error) {
  console.error('Error fetching admin messages:', error);
  return NextResponse.json(
   { error: 'Failed to fetch messages' },
   { status: 500 }
  );
 }
}

export async function POST(request: NextRequest) {
 try {
  const user = await getCurrentUser();
  if (!user || user.role !== 'ADMIN') {
   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const data = await request.json();
  const { userId, message, category, priority } = data;

  // Validate required fields
  if (!userId || !message) {
   return NextResponse.json(
    { error: 'User ID and message are required' },
    { status: 400 }
   );
  }

  // Get the target user
  const { data: targetUser, error: userError } = await supabaseAdmin
    .from('users')
    .select('id, email, name')
    .eq('id', userId)
    .single();

  if (userError) {
    console.error('Supabase error fetching user:', userError);
  }

  if (!targetUser) {
   return NextResponse.json(
    { error: 'User not found' },
    { status: 404 }
   );
  }

  // Create admin message
  const { data: adminMessage, error: createError } = await supabaseAdmin
    .from('messages')
    .insert({
      content: message,
      category: category || 'GENERAL',
      priority: priority || 'NORMAL',
      fromUserId: user.id,
      fromEmail: user.email,
      fromName: user.name,
      toUserId: targetUser.id,
      toEmail: targetUser.email,
      toName: targetUser.name,
      isAdminMessage: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })
    .select(`
      *,
      fromUser:users!messages_fromUserId_fkey(*),
      toUser:users!messages_toUserId_fkey(*)
    `)
    .single();

  if (createError) {
    console.error('Supabase error creating admin message:', createError);
    return NextResponse.json(
      { error: 'Failed to create message' },
      { status: 500 }
    );
  }

  return NextResponse.json({
   message: 'Admin message sent successfully',
   data: adminMessage,
  }, { status: 201 });
 } catch (error) {
  console.error('Error sending admin message:', error);
  return NextResponse.json(
   { error: 'Failed to send message' },
   { status: 500 }
  );
 }
}

export async function PATCH(request: NextRequest) {
 try {
  const user = await getCurrentUser();
  if (!user || user.role !== 'ADMIN') {
   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { messageId, isRead } = await request.json();

  if (!messageId) {
   return NextResponse.json(
    { error: 'Message ID is required' },
    { status: 400 }
   );
  }

  // Update message
  const { data: result, error: updateError } = await supabaseAdmin
    .from('messages')
    .update({
      isRead: isRead ?? true,
      updatedAt: new Date().toISOString()
    })
    .eq('id', messageId)
    .select()
    .single();

  if (updateError) {
    console.error('Supabase error updating message:', updateError);
    return NextResponse.json(
      { error: 'Failed to update message' },
      { status: 500 }
    );
  }

  return NextResponse.json({
   message: 'Message updated successfully',
   data: result,
  });
 } catch (error) {
  console.error('Error updating message:', error);
  return NextResponse.json(
   { error: 'Failed to update message' },
   { status: 500 }
  );
 }
}
