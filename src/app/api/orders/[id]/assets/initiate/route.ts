import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { supabaseAdmin } from '@/lib/supabase';
import { InitiateUploadReqSchema } from '@/lib/validation/orderAssets';
import { v4 as uuidv4 } from 'uuid';

function slugify(text: string): string {
 return text
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/(^-|-$)/g, '');
}

export async function POST(
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
  let order;
  try {
   order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, userId: true, status: true }
   });
  } catch (dbError) {
   console.error('Database error:', dbError);
   return NextResponse.json(
    { error: 'Database connection error' },
    { status: 500 }
   );
  }

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

  // Parse and validate request body
  const body = await request.json();
  const validationResult = InitiateUploadReqSchema.safeParse(body);
  
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