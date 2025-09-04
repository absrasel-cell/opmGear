import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-helpers';

export async function GET(request: NextRequest) {
 try {
  const user = await requireAuth(request);

  // Fetch messages with graceful database failure handling
  let messages = [];
  try {
   messages = await prisma.message.findMany({
    where: {
     OR: [
      { fromUserId: user.id },
      { toUserId: user.id },
     ],
    },
    orderBy: { createdAt: 'desc' },
    include: {
     fromUser: {
      select: {
       id: true,
       name: true,
       email: true,
       role: true,
      },
     },
     toUser: {
      select: {
       id: true,
       name: true,
       email: true,
       role: true,
      },
     },
     replyTo: true,
    },
   });

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