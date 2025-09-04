import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET - Retrieve a specific form submission
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // TODO: Add authentication check for admin users
    
    const submission = await prisma.formSubmission.findUnique({
      where: { id: params.id },
      include: {
        User: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    if (!submission) {
      return NextResponse.json(
        { error: 'Form submission not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(submission);

  } catch (error) {
    console.error('Error retrieving form submission:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve submission' },
      { status: 500 }
    );
  }
}

// PATCH - Update a form submission (admin only)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // TODO: Add authentication check for admin users
    // TODO: Get current user ID for tracking who made changes
    
    const body = await req.json();
    const {
      status,
      priority,
      assignedToId,
      resolved,
      resolvedBy,
      responseDate
    } = body;

    const updateData: any = {};
    
    if (status !== undefined) updateData.status = status;
    if (priority !== undefined) updateData.priority = priority;
    if (assignedToId !== undefined) updateData.assignedToId = assignedToId;
    if (responseDate !== undefined) updateData.responseDate = new Date(responseDate);
    
    // Handle resolved status
    if (resolved !== undefined) {
      updateData.resolved = resolved;
      if (resolved) {
        updateData.resolvedAt = new Date();
        updateData.resolvedBy = resolvedBy || 'admin'; // TODO: Use actual user ID
        updateData.status = 'RESOLVED';
      } else {
        updateData.resolvedAt = null;
        updateData.resolvedBy = null;
      }
    }

    const submission = await prisma.formSubmission.update({
      where: { id: params.id },
      data: updateData,
      include: {
        User: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      submission
    });

  } catch (error) {
    console.error('Error updating form submission:', error);
    return NextResponse.json(
      { error: 'Failed to update submission' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a form submission (admin only)
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // TODO: Add authentication check for admin users with proper permissions
    
    await prisma.formSubmission.delete({
      where: { id: params.id }
    });

    return NextResponse.json({
      success: true,
      message: 'Form submission deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting form submission:', error);
    return NextResponse.json(
      { error: 'Failed to delete submission' },
      { status: 500 }
    );
  }
}