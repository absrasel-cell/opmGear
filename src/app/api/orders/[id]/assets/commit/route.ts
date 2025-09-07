import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, getUserProfile } from '@/lib/auth-helpers';
// Removed Prisma - migrated to Supabase
import { supabaseAdmin } from '@/lib/supabase';
import { CommitUploadReqSchema } from '@/lib/validation/orderAssets';

export async function POST(
 request: NextRequest,
 { params }: { params: { id: string } }
) {
 try {
  const user = await getCurrentUser(request);
  if (!user) {
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

  // Get user profile for role checking
  const userProfile = await getUserProfile(user.id);
  
  // Check if user owns order or is admin
  const isOwner = order.userId === user.id;
  const isMasterAdmin = userProfile?.email === 'absrasel@gmail.com' || userProfile?.email === 'vic@onpointmarketing.com';
  const isAdmin = ['SUPER_ADMIN', 'MASTER_ADMIN'].includes(userProfile?.accessRole || '') || isMasterAdmin;

  if (!isOwner && !isAdmin) {
   return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  // Parse and validate request body
  const body = await request.json();
  const validationResult = CommitUploadReqSchema.safeParse(body);
  
  if (!validationResult.success) {
   return NextResponse.json(
    { error: 'Invalid request data', details: validationResult.error.issues },
    { status: 400 }
   );
  }

  const { files } = validationResult.data;

  // Verify all files exist in storage before committing to database
  for (const file of files) {
   const { data: fileData, error: fileError } = await supabaseAdmin.storage
    .from('order-assets')
    .list(orderId, {
     search: file.path.split('/')[1] // Get filename from path
    });

   if (fileError || !fileData || fileData.length === 0) {
    return NextResponse.json(
     { error: `File not found in storage: ${file.path}` },
     { status: 400 }
    );
   }
  }

  // Create OrderAsset records in database
  const assetRecords = files.map(file => ({
   orderId,
   userId: user.id,
   kind: file.kind,
   position: file.position || null,
   bucket: 'order-assets',
   path: file.path,
   mimeType: file.mimeType,
   sizeBytes: file.sizeBytes,
   width: file.width || null,
   height: file.height || null,
   checksum: null // TODO: implement checksum if needed
  }));

  await prisma.orderAsset.createMany({
   data: assetRecords
  });

  return NextResponse.json({ success: true });

 } catch (error) {
  console.error('Error in commit upload:', error);
  return NextResponse.json(
   { error: 'Internal server error' },
   { status: 500 }
  );
 }
}