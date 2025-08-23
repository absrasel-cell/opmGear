import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, getUserProfile } from '@/lib/auth-helpers';
import prisma from '@/lib/prisma';
import { supabaseAdmin } from '@/lib/supabase';
import { InitiateUploadReqSchema } from '@/lib/validation/orderAssets';
import { v4 as uuidv4 } from 'uuid';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { orderId, ...uploadData } = body;
    
    if (!orderId) {
      return NextResponse.json({ error: 'Order ID required' }, { status: 400 });
    }

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
    
    const isOwner = order.userId === user.id;
    const isMasterAdmin = userProfile?.email === 'absrasel@gmail.com';
    const isAdmin = ['SUPER_ADMIN', 'MASTER_ADMIN'].includes(userProfile?.accessRole || '') || isMasterAdmin;

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Parse and validate request body
    const validationResult = InitiateUploadReqSchema.safeParse(uploadData);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const { files } = validationResult.data;
    const uploads = [];

    for (const file of files) {
      const fileId = uuidv4();
      const sluggedName = slugify(file.name);
      const fileName = `${fileId}-${sluggedName}`;
      const path = `${orderId}/${fileName}`;

      // Create signed URL for upload
      const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin.storage
        .from('order-assets')
        .createSignedUploadUrl(path);

      if (signedUrlError || !signedUrlData) {
        console.error('Supabase signed URL error:', signedUrlError);
        return NextResponse.json(
          { error: 'Failed to create upload URL' },
          { status: 500 }
        );
      }

      uploads.push({
        tempId: fileId,
        path: path,
        signedUrl: signedUrlData.signedUrl
      });
    }

    return NextResponse.json({ uploads });

  } catch (error) {
    console.error('Error in initiate upload:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}