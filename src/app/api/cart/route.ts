import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-helpers';
import prisma from '@/lib/prisma';

interface CartItem {
 productId: string;
 productName: string;
 quantity: number;
 price: number;
 customization?: any;
}

interface CartData {
 userId?: string;
 sessionId?: string;
 items: CartItem[];
 total: number;
}

export async function GET(request: NextRequest) {
 try {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const sessionId = searchParams.get('sessionId');

  if (!userId && !sessionId) {
   return NextResponse.json({ error: 'User ID or session ID required' }, { status: 400 });
  }

  const cart = await prisma.cart.findFirst({
   where: {
    OR: [
     { userId: userId || undefined },
     { sessionId: sessionId || undefined }
    ]
   }
  });

  return NextResponse.json({ cart: cart || { items: [], total: 0 } });
 } catch (error) {
  console.error('Error fetching cart:', error);
  return NextResponse.json({ error: 'Failed to fetch cart' }, { status: 500 });
 }
}

export async function POST(request: NextRequest) {
 try {
  const data: CartData = await request.json();
  const user = await getCurrentUser();

  // Validate required fields
  if (!data.items || !Array.isArray(data.items)) {
   return NextResponse.json({ error: 'Items array is required' }, { status: 400 });
  }

  // Create or update cart
  const cartData = {
   userId: user?.id || data.userId,
   sessionId: data.sessionId,
   items: data.items,
   total: data.total,
   expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
  };

  const cart = await prisma.cart.upsert({
   where: {
    userId_sessionId: {
     userId: user?.id || data.userId || null,
     sessionId: data.sessionId || null,
    }
   },
   update: cartData,
   create: cartData,
  });

  return NextResponse.json({ cart }, { status: 201 });
 } catch (error) {
  console.error('Error creating/updating cart:', error);
  return NextResponse.json({ error: 'Failed to update cart' }, { status: 500 });
 }
}

export async function DELETE(request: NextRequest) {
 try {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const sessionId = searchParams.get('sessionId');

  if (!userId && !sessionId) {
   return NextResponse.json({ error: 'User ID or session ID required' }, { status: 400 });
  }

  await prisma.cart.deleteMany({
   where: {
    OR: [
     { userId: userId || undefined },
     { sessionId: sessionId || undefined }
    ]
   }
  });

  return NextResponse.json({ message: 'Cart cleared successfully' });
 } catch (error) {
  console.error('Error clearing cart:', error);
  return NextResponse.json({ error: 'Failed to clear cart' }, { status: 500 });
 }
}
