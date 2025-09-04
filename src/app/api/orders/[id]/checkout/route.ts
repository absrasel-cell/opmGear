import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendEmail } from '@/lib/resend';
import { emailTemplates } from '@/lib/email/templates';

export async function POST(
 request: NextRequest,
 { params }: { params: Promise<{ id: string }> }
) {
 try {
  const { customerInfo, userId, userEmail, orderTotal } = await request.json();
  const { id: orderId } = await params;

  // Validate required fields
  if (!orderId) {
   return NextResponse.json(
    { error: 'Order ID is required' },
    { status: 400 }
   );
  }

  if (!customerInfo || !customerInfo.name || !customerInfo.email) {
   return NextResponse.json(
    { error: 'Customer information is required' },
    { status: 400 }
   );
  }

  // Find the existing order
  const existingOrder = await prisma.order.findUnique({
   where: { id: orderId }
  });

  if (!existingOrder) {
   return NextResponse.json(
    { error: 'Order not found' },
    { status: 404 }
   );
  }

  // Verify the order belongs to the user (either by userId or email)
  if (userId && existingOrder.userId !== userId) {
   return NextResponse.json(
    { error: 'Unauthorized access to order' },
    { status: 403 }
   );
  }

  if (!userId && existingOrder.userEmail !== userEmail) {
   return NextResponse.json(
    { error: 'Unauthorized access to order' },
    { status: 403 }
   );
  }

  // Verify this is a saved order that can be checked out
  if (existingOrder.orderSource !== 'PRODUCT_CUSTOMIZATION') {
   return NextResponse.json(
    { error: 'Only saved orders can be checked out' },
    { status: 400 }
   );
  }

  // Update the order to convert it from saved to checked out
  const updateData: any = {
   orderSource: 'REORDER', // Change from PRODUCT_CUSTOMIZATION to REORDER
   status: 'CONFIRMED', // Change from PENDING to CONFIRMED
   customerInfo: customerInfo, // Update customer info
   updatedAt: new Date()
  };

  // Add orderTotal to the customerInfo if provided
  if (orderTotal) {
   updateData.customerInfo = {
    ...customerInfo,
    orderTotal: orderTotal
   };
  }

  const updatedOrder = await prisma.order.update({
   where: { id: orderId },
   data: updateData
  });

  // Calculate order totals if needed (this could be done in a separate service)
  // For now, we'll assume the order total is already calculated

  // Send order confirmation email
  if (customerInfo.email) {
   try {
    const emailResult = await sendEmail({
     to: customerInfo.email,
     subject: `Order Confirmation #${updatedOrder.id} - US Custom Cap`,
     html: emailTemplates.orderStatus(updatedOrder, 'CONFIRMED'),
     from: process.env.FROM_EMAIL || 'noreply@uscustomcap.com'
    });

    console.log('📧 Order confirmation email sent:', emailResult.success ? 'SUCCESS' : 'FAILED');
    if (!emailResult.success) {
     console.error('Email error:', emailResult.error);
    }
   } catch (emailError) {
    console.error('Failed to send order confirmation email:', emailError);
   }
  }

  return NextResponse.json({
   success: true,
   order: updatedOrder,
   message: 'Order successfully checked out'
  });

 } catch (error) {
  console.error('Error processing checkout:', error);
  
  return NextResponse.json(
   { error: 'Internal server error during checkout' },
   { status: 500 }
  );
 }
}

// GET method to retrieve order details for checkout
export async function GET(
 request: NextRequest,
 { params }: { params: Promise<{ id: string }> }
) {
 try {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const userEmail = searchParams.get('email');
  const { id: orderId } = await params;

  if (!orderId) {
   return NextResponse.json(
    { error: 'Order ID is required' },
    { status: 400 }
   );
  }

  // Find the order
  const order = await prisma.order.findUnique({
   where: { id: orderId }
  });

  if (!order) {
   return NextResponse.json(
    { error: 'Order not found' },
    { status: 404 }
   );
  }

  // Verify the order belongs to the user
  if (userId && order.userId !== userId) {
   return NextResponse.json(
    { error: 'Unauthorized access to order' },
    { status: 403 }
   );
  }

  if (!userId && order.userEmail !== userEmail) {
   return NextResponse.json(
    { error: 'Unauthorized access to order' },
    { status: 403 }
   );
  }

  return NextResponse.json({
   order: order
  });

 } catch (error) {
  console.error('Error fetching order for checkout:', error);
  
  return NextResponse.json(
   { error: 'Internal server error' },
   { status: 500 }
  );
 }
}