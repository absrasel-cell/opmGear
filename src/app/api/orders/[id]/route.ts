import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Fetch order with graceful database failure handling
    let order = null;
    try {
      order = await prisma.order.findUnique({
        where: { id },
      });

      if (!order) {
        return NextResponse.json(
          { error: 'Order not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({ order });

    } catch (dbError) {
      console.error('Database error when fetching order:', dbError);
      
      return NextResponse.json(
        { error: 'Order temporarily unavailable due to database maintenance' },
        { status: 503 }
      );
    }
  } catch (error) {
    console.error('Error fetching order:', error);
    return NextResponse.json(
      { error: 'Failed to fetch order' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const updateData = await request.json();

    // Remove fields that shouldn't be updated directly and whitelist allowed columns
    const allowedKeys = new Set([
      'status',
      'productName',
      'orderType',
      'orderSource',
      'trackingNumber',
      'selectedColors',
      'logoSetupSelections',
      'selectedOptions',
      'multiSelectOptions',
      'customerInfo',
      'uploadedLogoFiles',
      'additionalInstructions',
      'lastEditedBy',
    ]);

    const dataToUpdate: Record<string, any> = {};
    for (const [key, value] of Object.entries(updateData || {})) {
      if (key === 'id' || key === 'createdAt' || key === 'updatedAt') continue;
      if (!allowedKeys.has(key)) continue;
      if (value === undefined) continue;
      dataToUpdate[key] = value;
    }

    // Update order with graceful database failure handling
    let updatedOrder = null;
    try {
      updatedOrder = await prisma.order.update({
        where: { id },
        data: dataToUpdate,
      });

      return NextResponse.json({
        message: 'Order updated successfully',
        order: updatedOrder,
      });

    } catch (dbError: any) {
      console.error('Database error when updating order:', dbError);
      
      if (dbError.code === 'P2025') {
        return NextResponse.json(
          { error: 'Order not found' },
          { status: 404 }
        );
      }

      return NextResponse.json(
        { error: 'Order temporarily unavailable due to database maintenance' },
        { status: 503 }
      );
    }
  } catch (error: any) {
    console.error('Error updating order:', error);
    
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update order' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Delete order with graceful database failure handling
    try {
      await prisma.order.delete({
        where: { id },
      });

      return NextResponse.json({
        message: 'Order deleted successfully',
      });

    } catch (dbError: any) {
      console.error('Database error when deleting order:', dbError);
      
      if (dbError.code === 'P2025') {
        return NextResponse.json(
          { error: 'Order not found' },
          { status: 404 }
        );
      }

      return NextResponse.json(
        { error: 'Order temporarily unavailable due to database maintenance' },
        { status: 503 }
      );
    }
  } catch (error: any) {
    console.error('Error deleting order:', error);
    
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to delete order' },
      { status: 500 }
    );
  }
}