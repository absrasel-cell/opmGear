import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET - Retrieve a specific form submission
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // TODO: Add authentication check for admin users
    const { id } = await params;
    
    const { data: submission, error } = await supabaseAdmin
      .from('FormSubmission')
      .select('*, User(id, name, email)')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error retrieving form submission:', error);
      return NextResponse.json(
        { error: 'Failed to retrieve submission' },
        { status: 500 }
      );
    }

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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // TODO: Add authentication check for admin users
    // TODO: Get current user ID for tracking who made changes
    const { id } = await params;
    
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

    // Use PascalCase for Supabase (matching schema)
    const supabaseUpdateData: any = {};
    if (status !== undefined) supabaseUpdateData.status = status;
    if (priority !== undefined) supabaseUpdateData.priority = priority;
    if (assignedToId !== undefined) supabaseUpdateData.assignedToId = assignedToId;
    if (responseDate !== undefined) supabaseUpdateData.responseDate = new Date(responseDate).toISOString();
    
    // Handle resolved status
    if (resolved !== undefined) {
      supabaseUpdateData.resolved = resolved;
      if (resolved) {
        supabaseUpdateData.resolvedAt = new Date().toISOString();
        supabaseUpdateData.resolvedBy = resolvedBy || 'admin';
        supabaseUpdateData.status = 'RESOLVED';
      } else {
        supabaseUpdateData.resolvedAt = null;
        supabaseUpdateData.resolvedBy = null;
      }
    }

    const { data: submission, error } = await supabaseAdmin
      .from('FormSubmission')
      .update(supabaseUpdateData)
      .eq('id', id)
      .select('*, User(id, name, email)')
      .single();

    if (error) {
      console.error('Error updating form submission:', error);
      return NextResponse.json(
        { error: 'Failed to update submission' },
        { status: 500 }
      );
    }

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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // TODO: Add authentication check for admin users with proper permissions
    const { id } = await params;
    
    const { error } = await supabaseAdmin
      .from('FormSubmission')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting form submission:', error);
      return NextResponse.json(
        { error: 'Failed to delete submission' },
        { status: 500 }
      );
    }

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