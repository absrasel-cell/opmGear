import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// N8N Webhook Handler for Order Events
export async function POST(request: NextRequest) {
 try {
  const { orderId, action, status, metadata } = await request.json();
  
  console.log('🎯 N8N Order Event:', { orderId, action, status });
  
  // Verify webhook authenticity (add your N8N webhook secret)
  const webhookSecret = request.headers.get('x-n8n-webhook-secret');
  if (webhookSecret !== process.env.N8N_WEBHOOK_SECRET) {
   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get order details from database
  const order = await prisma.order.findUnique({
   where: { id: orderId },
   include: {
    user: {
     select: { id: true, name: true, email: true }
    }
   }
  });

  if (!order) {
   return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  // Send event data to N8N for processing
  const queryParams = new URLSearchParams({
   orderId: order.id,
   orderStatus: order.status,
   productName: order.productName,
   userEmail: order.userEmail || '',
   orderTotal: String(order.calculatedTotal || 0),
   totalUnits: String(order.totalUnits || 0),
   action,
   status,
   timestamp: new Date().toISOString()
  });

  const n8nResponse = await fetch(`${process.env.N8N_WEBHOOK_URL}?${queryParams}`, {
   method: 'GET',
   headers: {
    'x-api-key': process.env.N8N_API_KEY || ''
   }
  });

  console.log('📨 N8N Response Status:', n8nResponse.status);

  return NextResponse.json({
   success: true,
   orderId,
   action,
   n8nProcessed: n8nResponse.ok
  });

 } catch (error) {
  console.error('❌ N8N Webhook Error:', error);
  return NextResponse.json(
   { error: 'Webhook processing failed' },
   { status: 500 }
  );
 }
}

// GET endpoint for N8N to fetch order data
export async function GET(request: NextRequest) {
 try {
  const { searchParams } = new URL(request.url);
  const orderId = searchParams.get('orderId');
  
  if (!orderId) {
   return NextResponse.json({ error: 'Order ID required' }, { status: 400 });
  }

  const order = await prisma.order.findUnique({
   where: { id: orderId },
   include: {
    user: {
     select: { id: true, name: true, email: true }
    },
    shipment: {
     select: {
      id: true,
      buildNumber: true,
      shippingMethod: true,
      status: true,
      estimatedDelivery: true
     }
    }
   }
  });

  if (!order) {
   return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  return NextResponse.json({
   order: {
    id: order.id,
    productName: order.productName,
    status: order.status,
    customerInfo: order.customerInfo,
    userEmail: order.userEmail,
    orderTotal: order.calculatedTotal || 0,
    totalUnits: order.totalUnits || 0,
    selectedColors: order.selectedColors,
    selectedOptions: order.selectedOptions,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    trackingNumber: order.trackingNumber,
    user: order.user,
    shipment: order.shipment
   }
  });

 } catch (error) {
  console.error('❌ Order fetch error:', error);
  return NextResponse.json(
   { error: 'Failed to fetch order' },
   { status: 500 }
  );
 }
}