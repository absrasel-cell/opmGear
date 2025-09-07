import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-helpers';
// Removed Prisma - migrated to Supabase

export async function GET(request: NextRequest) {
 try {
  // Verify internal API access or user authentication
  const user = await getCurrentUser(request);
  
  if (!user) {
   return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '10');
  const orderId = searchParams.get('orderId');

  // If specific order requested
  if (orderId) {
   const order = await prisma.order.findFirst({
    where: { 
     id: orderId,
     userId: user.id 
    },
    select: {
     id: true,
     productName: true,
     status: true,
     totalUnits: true,
     calculatedTotal: true,
     createdAt: true,
     trackingNumber: true,
     deliveryDate: true,
     productDetails: true,
     specialInstructions: true,
     orderConfiguration: true,
    }
   });

   if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
   }

   return NextResponse.json({ order });
  }

  // Get user's orders
  const orders = await prisma.order.findMany({
   where: { userId: user.id },
   orderBy: { createdAt: 'desc' },
   take: limit,
   select: {
    id: true,
    productName: true,
    status: true,
    totalUnits: true,
    calculatedTotal: true,
    createdAt: true,
    trackingNumber: true,
    deliveryDate: true,
   }
  });

  return NextResponse.json({ orders });

 } catch (error) {
  console.error('Internal API Error - Customer Orders:', error);
  return NextResponse.json(
   { error: 'Failed to retrieve orders' },
   { status: 500 }
  );
 }
}