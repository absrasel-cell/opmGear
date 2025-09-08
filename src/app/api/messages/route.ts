import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-helpers';
import { sendEmail } from '@/lib/resend';
import { emailTemplates } from '@/lib/email/templates';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
 try {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const email = searchParams.get('email');
  const category = searchParams.get('category');
  const isAdminView = searchParams.get('isAdminView') === 'true';
  const conversationId = searchParams.get('conversationId');

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
  } else if (email) {
   // Email-based lookup
   where.OR = [
    { fromEmail: email },
    { toEmail: email },
   ];
  } else {
   // Default: restrict to current authenticated user's conversations
   const currentUser = await getCurrentUser(request);
   if (currentUser?.id) {
    where.OR = [
     { fromUserId: currentUser.id },
     { toUserId: currentUser.id },
    ];
   }
  }

  if (category) {
   where.category = category;
  }

  if (conversationId) {
   // Parse conversation ID to get participant IDs (use '|' as delimiter)
   const participants = conversationId.split('|');
   if (participants.length === 2) {
    const [firstParticipant, secondParticipant] = participants;
    const validFirst = firstParticipant && firstParticipant !== 'null' && firstParticipant !== 'undefined';
    const validSecond = secondParticipant && secondParticipant !== 'null' && secondParticipant !== 'undefined';

    // Build WHERE for both strict pair match and fallback single-participant match
    const ors: any[] = [];
    if (validFirst && validSecond) {
     ors.push(
      { AND: [{ fromUserId: firstParticipant }, { toUserId: secondParticipant }] },
      { AND: [{ fromUserId: secondParticipant }, { toUserId: firstParticipant }] }
     );
    }
    const fallbackId = validFirst ? firstParticipant : (validSecond ? secondParticipant : null);
    if (fallbackId) {
     ors.push({ fromUserId: fallbackId }, { toUserId: fallbackId });
    }

    // Build Supabase query with OR conditions
    const orConditions = ors.map(condition => {
      if (condition.AND) {
        const andCond = condition.AND;
        if (andCond.length === 2) {
          return `and(fromUserId.eq.${andCond[0].fromUserId},toUserId.eq.${andCond[1].toUserId})`;
        }
      } else if (condition.fromUserId) {
        return `fromUserId.eq.${condition.fromUserId}`;
      } else if (condition.toUserId) {
        return `toUserId.eq.${condition.toUserId}`;
      }
      return null;
    }).filter(Boolean);

    const { data: messages, error: messagesError } = await supabaseAdmin
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
      .or(orConditions.join(','))
      .order('createdAt', { ascending: true });

    if (messagesError) {
      console.error('Supabase error fetching messages:', messagesError);
      return NextResponse.json(
        { error: 'Failed to fetch messages' },
        { status: 500 }
      );
    }

    // Transform messages to match frontend expectations
    const transformedMessages = (messages || []).map(message => ({
     id: message.id,
     conversationId: conversationId,
     senderId: message.fromUserId,
     senderName: message.fromName,
     senderRole: message.fromUser?.role || 'CUSTOMER',
     recipientId: message.toUserId,
     recipientName: message.toName,
     recipientRole: message.toUser?.role || 'CUSTOMER',
     message: message.content, // Frontend expects 'message' field
     content: message.content,
     messageType: 'text',
     category: message.category,
     priority: message.priority,
     attachments: message.attachments || [],
     isRead: message.isRead,
     createdAt: message.createdAt,
     updatedAt: message.updatedAt,
     replyTo: message.replyTo ? {
      id: message.replyTo.id,
      preview: message.replyTo.content,
      senderName: message.replyTo.fromName || 'Unknown'
     } : undefined
    }));
    
    return NextResponse.json({ messages: transformedMessages || [] });
   }
   // Fallback: treat conversationId as a message id, derive participants from it
   try {
    const { data: seed, error: seedError } = await supabaseAdmin
      .from('messages')
      .select('fromUserId, toUserId')
      .eq('id', conversationId)
      .single();

    if (seedError) {
      console.error('Supabase error fetching seed message:', seedError);
    }

    if (seed?.fromUserId && seed?.toUserId) {
     const a = seed.fromUserId;
     const b = seed.toUserId;
     const { data: messages, error: conversationError } = await supabaseAdmin
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
       .or(`and(fromUserId.eq.${a},toUserId.eq.${b}),and(fromUserId.eq.${b},toUserId.eq.${a})`)
       .order('createdAt', { ascending: true });

     if (conversationError) {
       console.error('Supabase error fetching conversation:', conversationError);
       return NextResponse.json(
         { error: 'Failed to fetch conversation' },
         { status: 500 }
       );
     }

     const transformedMessages = (messages || []).map(message => ({
      id: message.id,
      conversationId: [a, b].sort().join('|'),
      senderId: message.fromUserId,
      senderName: message.fromName,
      senderRole: message.fromUser?.role || 'CUSTOMER',
      recipientId: message.toUserId,
      recipientName: message.toName,
      recipientRole: message.toUser?.role || 'CUSTOMER',
      message: message.content,
      content: message.content,
      messageType: 'text',
      category: message.category,
      priority: message.priority,
      attachments: message.attachments || [],
      isRead: message.isRead,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
      replyTo: message.replyTo ? {
       id: message.replyTo.id,
       preview: message.replyTo.content,
       senderName: message.replyTo.fromName || 'Unknown'
      } : undefined
     }));
     return NextResponse.json({ messages: transformedMessages || [] });
    }
   } catch (e) {
    // ignore and fall through to conversations
   }
  } else {
   // Return conversations (grouped messages)
   // Build Supabase query with where conditions
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

   // Apply where conditions
   if (where.isAdminMessage !== undefined) {
     query = query.eq('isAdminMessage', where.isAdminMessage);
   }
   if (where.OR) {
     const orConditions = where.OR.map((condition: any) => {
       if (condition.fromUserId) return `fromUserId.eq.${condition.fromUserId}`;
       if (condition.toUserId) return `toUserId.eq.${condition.toUserId}`;
       if (condition.fromEmail) return `fromEmail.eq.${condition.fromEmail}`;
       if (condition.toEmail) return `toEmail.eq.${condition.toEmail}`;
       return null;
     }).filter(Boolean);
     if (orConditions.length > 0) {
       query = query.or(orConditions.join(','));
     }
   }
   if (where.category) {
     query = query.eq('category', where.category);
   }

   const { data: messages, error: messagesError } = await query.order('createdAt', { ascending: false });

   if (messagesError) {
     console.error('Supabase error fetching messages:', messagesError);
     return NextResponse.json(
       { error: 'Failed to fetch messages' },
       { status: 500 }
     );
   }

       // Group messages into conversations by participants
    const conversations = (messages || []).reduce((acc: any[], message) => {
     // Create a unique conversation ID based on participants
     const participants = [message.fromUserId, message.toUserId].sort();
     const conversationId = participants.join('|');
     
     const existingConversation = acc.find(conv => conv.conversationId === conversationId);
     
     if (!existingConversation) {
      acc.push({
       conversationId,
       lastMessage: {
        id: message.id,
        senderId: message.fromUserId,
        senderName: message.fromName,
        senderRole: message.fromUser?.role || 'CUSTOMER',
        recipientId: message.toUserId,
        recipientName: message.toName,
        recipientRole: message.toUser?.role || 'CUSTOMER',
        message: message.content,
        content: message.content,
        category: message.category,
        priority: message.priority,
        attachments: message.attachments,
        isRead: message.isRead,
        createdAt: message.createdAt,
        updatedAt: message.updatedAt,
       },
       unreadCount: message.isRead ? 0 : 1,
       messageCount: 1,
      });
     } else {
      existingConversation.messageCount++;
      if (!message.isRead) {
       existingConversation.unreadCount++;
      }
      // Update last message if this message is newer
      if (new Date(message.createdAt) > new Date(existingConversation.lastMessage.createdAt)) {
       existingConversation.lastMessage = {
        id: message.id,
        senderId: message.fromUserId,
        senderName: message.fromName,
        senderRole: message.fromUser?.role || 'CUSTOMER',
        recipientId: message.toUserId,
        recipientName: message.toName,
        recipientRole: message.toUser?.role || 'CUSTOMER',
        message: message.content,
        content: message.content,
        category: message.category,
        priority: message.priority,
        attachments: message.attachments,
        isRead: message.isRead,
        createdAt: message.createdAt,
        updatedAt: message.updatedAt,
       };
      }
     }
     
     return acc;
    }, []);

   return NextResponse.json({ conversations });
  }
 } catch (error) {
  console.error('Error fetching messages:', error);
  return NextResponse.json(
   { error: 'Failed to fetch messages' },
   { status: 500 }
  );
 }
}

export async function POST(request: NextRequest) {
 try {
  const data = await request.json();
  const user = await getCurrentUser(request);

  // Handle both old and new field names for compatibility
  const messageContent = data.content || data.message;
  const recipientId = data.toUserId || data.recipientId;
  const messageCategory = (data.category || 'GENERAL').toUpperCase();
  const messagePriority = (data.priority || 'NORMAL').toUpperCase();

  // Validate required fields
  if (!messageContent) {
   return NextResponse.json(
    { error: 'Message content is required' },
    { status: 400 }
   );
  }

  // Create message data
  const messageData: any = {
   content: messageContent,
   category: messageCategory,
   priority: messagePriority,
   attachments: data.attachments || [],
   isAdminMessage: data.isAdminMessage || false,
   replyToId: data.replyTo?.id || data.replyToId,
  };

  // Set sender information
  if (user) {
   messageData.fromUserId = user.id;
   messageData.fromEmail = user.email;
   messageData.fromName = data.fromName || (user.user_metadata?.name || user.email || undefined);
  } else {
   messageData.fromEmail = data.fromEmail;
   messageData.fromName = data.fromName;
  }

  // Set recipient information
  if (recipientId) {
   messageData.toUserId = recipientId;
   // Get recipient details from database
   const { data: recipient, error: recipientError } = await supabaseAdmin
     .from('users')
     .select('id, email, name')
     .eq('id', recipientId)
     .single();

   if (recipientError) {
     console.error('Supabase error fetching recipient:', recipientError);
   }

   if (recipient) {
    messageData.toEmail = recipient.email;
    messageData.toName = recipient.name;
   }
  }
  if (data.toEmail || data.recipientEmail) {
   messageData.toEmail = data.toEmail || data.recipientEmail;
  }
  if (data.toName || data.recipientName) {
   messageData.toName = data.toName || data.recipientName;
  }

  // Create the message
  const { data: message, error: createError } = await supabaseAdmin
    .from('messages')
    .insert({
      ...messageData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })
    .select(`
      *,
      fromUser:users!messages_fromUserId_fkey(*),
      toUser:users!messages_toUserId_fkey(*),
      replyTo:messages!messages_replyToId_fkey(*)
    `)
    .single();

  if (createError) {
    console.error('Supabase error creating message:', createError);
    return NextResponse.json(
      { error: 'Failed to create message' },
      { status: 500 }
    );
  }

  // Send email notification if recipient email is available
  console.log('📧 Email check - toEmail:', messageData.toEmail, 'fromEmail:', messageData.fromEmail);
  
  if (messageData.toEmail && messageData.toEmail !== messageData.fromEmail) {
   try {
    console.log('📧 Sending email notification to:', messageData.toEmail);
    
    const emailResult = await sendEmail({
     to: messageData.toEmail,
     subject: `New message from US Custom Cap - ${messageCategory}`,
     html: emailTemplates.messageNotification({
      recipientName: messageData.toName || 'there',
      senderName: messageData.fromName || 'US Custom Cap Team',
      category: messageCategory,
      priority: messagePriority,
      content: messageContent
     }, `${process.env.NEXTAUTH_URL}/messages`),
     from: process.env.FROM_EMAIL || 'noreply@uscustomcap.com'
    });

    console.log('📧 Email notification result:', emailResult.success ? 'SUCCESS' : 'FAILED');
    if (!emailResult.success) {
     console.error('📧 Email error details:', emailResult.error);
    } else {
     console.log('📧 Email ID:', emailResult.id);
    }
   } catch (emailError) {
    console.error('📧 Failed to send email notification:', emailError);
    // Don't fail the message creation if email fails
   }
  } else {
   console.log('📧 Email not sent - no recipient or same sender/recipient');
  }

  return NextResponse.json({
   message: 'Message sent successfully',
   data: message,
   conversationId: message.id, // For frontend compatibility
  }, { status: 201 });
 } catch (error) {
  console.error('Error creating message:', error);
  return NextResponse.json(
   { error: 'Failed to send message' },
   { status: 500 }
  );
 }
}

export async function PATCH(request: NextRequest) {
 try {
  const { messageIds, isRead } = await request.json();

  if (!Array.isArray(messageIds)) {
   return NextResponse.json(
    { error: 'messageIds must be an array' },
    { status: 400 }
   );
  }

  // Update messages
  const { data: result, error: updateError } = await supabaseAdmin
    .from('messages')
    .update({
      isRead: isRead ?? true,
      updatedAt: new Date().toISOString()
    })
    .in('id', messageIds)
    .select();

  if (updateError) {
    console.error('Supabase error updating messages:', updateError);
    return NextResponse.json(
      { error: 'Failed to update messages' },
      { status: 500 }
    );
  }

  return NextResponse.json({
   message: 'Messages updated successfully',
   count: result?.length || 0,
  });
 } catch (error) {
  console.error('Error updating messages:', error);
  return NextResponse.json(
   { error: 'Failed to update messages' },
   { status: 500 }
  );
 }
}