import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-helpers';
import prisma from '@/lib/prisma';

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

    const messages = await prisma.message.findMany({
      where,
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
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true }
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Create admin message
    const adminMessage = await prisma.message.create({
      data: {
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
      },
      include: {
        fromUser: true,
        toUser: true,
      },
    });

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
    const result = await prisma.message.update({
      where: { id: messageId },
      data: {
        isRead: isRead ?? true,
      },
    });

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
