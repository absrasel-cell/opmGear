import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(
 request: NextRequest,
 { params }: { params: { id: string } }
) {
 try {
  const orderId = params.id;

  // Check if order exists
  const existingOrder = await prisma.order.findUnique({
   where: { id: orderId },
   select: { id: true, shipmentId: true }
  });

  if (!existingOrder) {
   return NextResponse.json(
    { error: 'Order not found' },
    { status: 404 }
   );
  }

  // Unassign the order from its shipment
  const updatedOrder = await prisma.order.update({
   where: { id: orderId },
   data: { shipmentId: null },
   select: {
    id: true,
    shipmentId: true,
    productName: true,
    status: true
   }
  });

  return NextResponse.json({ 
   message: 'Order unassigned successfully',
   order: updatedOrder
  });
 } catch (error) {
  console.error('Error unassigning order:', error);
  return NextResponse.json(
   { error: 'Failed to unassign order' },
   { status: 500 }
  );
 }
}