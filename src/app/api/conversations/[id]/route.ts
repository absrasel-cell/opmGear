import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const conversationId = params.id;

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        ConversationMessage: {
          orderBy: { createdAt: 'asc' },
        },
        User: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    return NextResponse.json(conversation);
  } catch (error) {
    console.error('Error fetching conversation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const conversationId = params.id;
    const body = await request.json();
    const { title, status, tags, isArchived, metadata } = body;

    const conversation = await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        ...(title !== undefined && { title }),
        ...(status !== undefined && { status }),
        ...(tags !== undefined && { tags }),
        ...(isArchived !== undefined && { isArchived }),
        ...(metadata !== undefined && { metadata }),
        lastActivity: new Date(),
      },
    });

    return NextResponse.json(conversation);
  } catch (error) {
    console.error('Error updating conversation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const conversationId = params.id;

    await prisma.conversation.delete({
      where: { id: conversationId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting conversation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}