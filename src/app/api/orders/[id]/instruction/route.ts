import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
// Removed Prisma - migrated to Supabase
import { UpdateInstructionReqSchema } from '@/lib/validation/orderAssets';

export async function PATCH(
 request: NextRequest,
 { params }: { params: { id: string } }
) {
 try {
  // Get access token from cookies
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('sb-access-token')?.value;

  if (!accessToken) {
   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Create Supabase client with access token
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

  // Get user from Supabase
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get user profile from database
  const userProfile = await prisma.user.findUnique({
   where: { id: user.id },
   select: { id: true, accessRole: true }
  });

  if (!userProfile) {
   return NextResponse.json({ error: 'User profile not found' }, { status: 401 });
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

  // Check if user owns order or is admin
  const isOwner = order.userId === user.id;
  const isAdmin = ['SUPER_ADMIN', 'MASTER_ADMIN'].includes(userProfile.accessRole || '');

  if (!isOwner && !isAdmin) {
   return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  // Additional check: if not admin, ensure order is still editable
  if (!isOwner && ['SHIPPED', 'DELIVERED'].includes(order.status)) {
   return NextResponse.json(
    { error: 'Cannot update instructions for shipped/delivered orders' },
    { status: 403 }
   );
  }

  // Parse and validate request body
  const body = await request.json();
  const validationResult = UpdateInstructionReqSchema.safeParse(body);
  
  if (!validationResult.success) {
   return NextResponse.json(
    { error: 'Invalid request data', details: validationResult.error.issues },
    { status: 400 }
   );
  }

  const { additionalInstruction } = validationResult.data;

  // Update the order instruction
  await prisma.order.update({
   where: { id: orderId },
   data: { additionalInstruction }
  });

  return NextResponse.json({ success: true });

 } catch (error) {
  console.error('Error in update instruction:', error);
  return NextResponse.json(
   { error: 'Internal server error' },
   { status: 500 }
  );
 }
}