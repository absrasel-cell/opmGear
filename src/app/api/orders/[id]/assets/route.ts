import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { supabaseAdmin } from '@/lib/supabase';
import { OrderAssetDTO } from '@/lib/validation/orderAssets';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get user from Supabase auth
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('sb-access-token')?.value;

    if (!accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      }
    );

    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: orderId } = params;
    
    // Verify order exists and user has access
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, userId: true, status: true }
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Get user role from database
    let userRole = 'CUSTOMER';
    try {
      const userData = await prisma.user.findUnique({
        where: { id: user.id },
        select: { accessRole: true }
      });
      userRole = userData?.accessRole || 'CUSTOMER';
    } catch (dbError) {
      console.log('Could not fetch user role, defaulting to CUSTOMER');
    }

    // Check if user owns order or is admin
    const isOwner = order.userId === user.id;
    const isAdmin = ['SUPER_ADMIN', 'MASTER_ADMIN'].includes(userRole);

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get assets from database
    let assets = [];
    try {
      assets = await prisma.orderAsset.findMany({
        where: { orderId },
        orderBy: { uploadedAt: 'asc' }
      });
    } catch (dbError) {
      console.error('Database error (OrderAsset table might not exist):', dbError);
      // Return empty array if table doesn't exist yet
      return NextResponse.json([]);
    }

    // Generate signed URLs for viewing/downloading
    const assetsWithSignedUrls: OrderAssetDTO[] = [];
    
    for (const asset of assets) {
      const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin.storage
        .from('order-assets')
        .createSignedUrl(asset.path, 1800); // 30 minutes

      if (signedUrlError) {
        console.error('Error creating signed URL:', signedUrlError);
        continue; // Skip this asset but don't fail the entire request
      }

      const filename = asset.path.split('/').pop() || asset.path;

      assetsWithSignedUrls.push({
        id: asset.id,
        kind: asset.kind as 'LOGO' | 'ACCESSORY' | 'OTHER',
        position: asset.position,
        filename: filename,
        mimeType: asset.mimeType,
        sizeBytes: asset.sizeBytes,
        width: asset.width,
        height: asset.height,
        uploadedAt: asset.uploadedAt,
        signedUrl: signedUrlData?.signedUrl
      });
    }

    return NextResponse.json(assetsWithSignedUrls);

  } catch (error) {
    console.error('Error in get assets:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}