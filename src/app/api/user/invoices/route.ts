import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser, getUserProfile } from '@/lib/auth-helpers';
import { generateInvoiceNumber } from '@/lib/invoices/generateNumber';
import { calcInvoiceFromOrder } from '@/lib/invoices/calc';
import prisma from '@/lib/prisma';

const createInvoiceSchema = z.object({
  orderId: z.string(),
  notes: z.string().optional()
});

export async function GET(request: NextRequest) {
  try {
    // Get current user
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const profile = await getUserProfile(user.id);
    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    // Get user's invoices
    const invoices = await prisma.invoice.findMany({
      where: {
        customerId: user.id
      },
      include: {
        items: true,
        order: {
          select: {
            id: true,
            productName: true,
            createdAt: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({
      invoices: invoices
    });
  } catch (error: any) {
    console.error('Error fetching user invoices:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get current user
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const profile = await getUserProfile(user.id);
    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    const body = await request.json();
    const { orderId, notes } = createInvoiceSchema.parse(body);
    
    console.log('Creating user invoice for order:', orderId, 'by user:', user.id);

    // Get the order and verify ownership
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: true
      }
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Verify user owns this order
    if (order.userId !== user.id) {
      return NextResponse.json({ error: 'You can only create invoices for your own orders' }, { status: 403 });
    }

    if (!order.userId) {
      console.log('Order has no userId:', order.id, order.productName);
      return NextResponse.json({ 
        error: 'Order must have a customer', 
        details: `Order ${order.id} (${order.productName}) has no associated customer` 
      }, { status: 400 });
    }
    
    console.log('Order found and verified ownership:', order.id, order.userId);

    // Check if invoice already exists for this order
    const existingInvoice = await prisma.invoice.findFirst({
      where: { orderId }
    });

    let invoice;

    if (existingInvoice) {
      // Return existing invoice
      invoice = await prisma.invoice.findUnique({
        where: { id: existingInvoice.id },
        include: {
          items: true,
          customer: true,
          order: true
        }
      });
    } else {
      // Create new invoice
      const invoiceNumber = await generateInvoiceNumber();
      const calculation = await calcInvoiceFromOrder(order);

      invoice = await prisma.invoice.create({
        data: {
          number: invoiceNumber,
          orderId,
          customerId: order.userId,
          subtotal: calculation.subtotal,
          discount: calculation.discount,
          shipping: calculation.shipping,
          tax: calculation.tax,
          total: calculation.total,
          notes: notes || `Invoice for Order #${order.id}`,
          status: 'ISSUED', // User-created invoices are automatically issued
          items: {
            create: calculation.items.map(item => ({
              name: item.name,
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              total: item.total
            }))
          }
        },
        include: {
          items: true,
          customer: true,
          order: true
        }
      });

      console.log('User invoice created successfully:', invoice.id);
    }

    return NextResponse.json({ invoice }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating user invoice:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 });
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}