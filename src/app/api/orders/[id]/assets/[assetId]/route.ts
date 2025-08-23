import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, getUserProfile } from '@/lib/auth-helpers';
import prisma from '@/lib/prisma';
import { supabaseAdmin } from '@/lib/supabase';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; assetId: string } }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: orderId, assetId } = params;
    
    // Verify order exists and user has access
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, userId: true, status: true }
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Get user profile for role checking
    const userProfile = await getUserProfile(user.id);
    
    // Check if user owns order or is admin
    const isOwner = order.userId === user.id;
    const isMasterAdmin = userProfile?.email === 'absrasel@gmail.com';
    const isAdmin = ['SUPER_ADMIN', 'MASTER_ADMIN'].includes(userProfile?.accessRole || '') || isMasterAdmin;

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Additional check: if not admin, ensure order is still editable
    if (!isAdmin && ['SHIPPED', 'DELIVERED'].includes(order.status)) {
      return NextResponse.json(
        { error: 'Cannot delete assets from shipped/delivered orders' },
        { status: 403 }
      );
    }

    // Get asset details
    const asset = await prisma.orderAsset.findUnique({
      where: { id: assetId },
      select: { id: true, path: true, orderId: true }
    });

    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    if (asset.orderId !== orderId) {
      return NextResponse.json({ error: 'Asset does not belong to this order' }, { status: 400 });
    }

    // Delete from Supabase storage
    const { error: storageError } = await supabaseAdmin.storage
      .from('order-assets')
      .remove([asset.path]);

    if (storageError) {
      console.error('Error deleting from storage:', storageError);
      // Continue with database deletion even if storage deletion fails
    }

    // Delete from database
    await prisma.orderAsset.delete({
      where: { id: assetId }
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error in delete asset:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}