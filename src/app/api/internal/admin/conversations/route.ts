import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-helpers';
import { ConversationService } from '@/lib/conversation';
// Removed Prisma - migrated to Supabase

export async function GET(request: NextRequest) {
 try {
  const user = await getCurrentUser(request);
  
  if (!user) {
   return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  // Verify admin access
  const userProfile = await prisma.user.findUnique({
   where: { id: user.id },
   select: { accessRole: true, email: true }
  });

  const isAdmin = ['ADMIN', 'SUPER_ADMIN', 'MASTER_ADMIN', 'STAFF'].includes(userProfile?.accessRole || '') ||
          userProfile?.email === 'absrasel@gmail.com';

  if (!isAdmin) {
   return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '20');
  const days = parseInt(searchParams.get('days') || '30');
  const search = searchParams.get('search');
  const userId = searchParams.get('userId');

  // Calculate date range
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - days);
  const toDate = new Date();

  // Get analytics
  const analytics = await ConversationService.getConversationAnalytics({
   from: fromDate,
   to: toDate,
  });

  // Get recent conversations with user details
  const recentConversations = await prisma.conversation.findMany({
   where: {
    ...(userId && { userId }),
    ...(search && {
     OR: [
      { title: { contains: search, mode: 'insensitive' } },
      { user: { name: { contains: search, mode: 'insensitive' } } },
      { user: { email: { contains: search, mode: 'insensitive' } } },
     ],
    }),
    createdAt: { gte: fromDate, lte: toDate },
   },
   take: limit,
   orderBy: { lastActivity: 'desc' },
   include: {
    user: {
     select: {
      id: true,
      name: true,
      email: true,
      accessRole: true,
      customerRole: true,
     },
    },
    _count: {
     select: { messages: true },
    },
   },
  });

  // Get conversation volume by day
  const conversationsByDay = await prisma.conversation.groupBy({
   by: ['createdAt'],
   where: {
    createdAt: { gte: fromDate, lte: toDate },
   },
   _count: { id: true },
  });

  // Process daily data
  const dailyStats = conversationsByDay.reduce((acc: any, item) => {
   const date = new Date(item.createdAt).toDateString();
   acc[date] = (acc[date] || 0) + item._count.id;
   return acc;
  }, {});

  // Get most active users in conversations
  const activeUsers = await prisma.user.findMany({
   where: {
    conversations: {
     some: {
      lastActivity: { gte: fromDate },
     },
    },
   },
   take: 10,
   select: {
    id: true,
    name: true,
    email: true,
    accessRole: true,
    customerRole: true,
    _count: {
     select: { conversations: true },
    },
   },
   orderBy: {
    conversations: {
     _count: 'desc',
    },
   },
  });

  // Get average response time and token usage
  const messageStats = await prisma.conversationMessage.aggregate({
   where: {
    createdAt: { gte: fromDate, lte: toDate },
    processingTime: { not: null },
   },
   _avg: {
    processingTime: true,
    tokens: true,
   },
   _count: { id: true },
  });

  // Format recent conversations for response
  const formattedConversations = recentConversations.map(conv => ({
   id: conv.id,
   title: conv.title,
   context: conv.context,
   status: conv.status,
   messageCount: conv._count.messages,
   lastActivity: conv.lastActivity,
   createdAt: conv.createdAt,
   user: conv.user ? {
    id: conv.user.id,
    name: conv.user.name,
    email: conv.user.email,
    role: conv.user.accessRole || conv.user.customerRole,
   } : null,
  }));

  return NextResponse.json({
   analytics: {
    ...analytics,
    averageProcessingTime: messageStats._avg.processingTime,
    averageTokensPerMessage: messageStats._avg.tokens,
    totalMessagesInPeriod: messageStats._count.id,
   },
   conversations: formattedConversations,
   dailyStats,
   activeUsers,
   dateRange: { from: fromDate, to: toDate },
  });

 } catch (error) {
  console.error('Admin Conversations API Error:', error);
  return NextResponse.json(
   { error: 'Failed to retrieve conversation analytics' },
   { status: 500 }
  );
 }
}

export async function POST(request: NextRequest) {
 try {
  const user = await getCurrentUser(request);
  
  if (!user) {
   return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  // Verify admin access
  const userProfile = await prisma.user.findUnique({
   where: { id: user.id },
   select: { accessRole: true, email: true }
  });

  const isAdmin = ['ADMIN', 'SUPER_ADMIN', 'MASTER_ADMIN', 'STAFF'].includes(userProfile?.accessRole || '') ||
          userProfile?.email === 'absrasel@gmail.com';

  if (!isAdmin) {
   return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const { action, conversationIds, daysOld } = await request.json();

  if (action === 'cleanup') {
   // Clean up old conversations
   const cleanupDays = daysOld || 90;
   const result = await ConversationService.cleanupOldConversations(cleanupDays);
   
   return NextResponse.json({
    success: true,
    message: `Cleaned up ${result.count} old conversations`,
    count: result.count,
   });
  }

  if (action === 'archive' && conversationIds) {
   // Archive multiple conversations
   const results = await Promise.all(
    conversationIds.map((id: string) => 
     ConversationService.archiveConversation(id, 'Bulk archived by admin')
    )
   );

   return NextResponse.json({
    success: true,
    message: `Archived ${results.length} conversations`,
    count: results.length,
   });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

 } catch (error) {
  console.error('Admin Conversations Action Error:', error);
  return NextResponse.json(
   { error: 'Failed to perform action' },
   { status: 500 }
  );
 }
}