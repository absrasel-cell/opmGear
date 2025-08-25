import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin, getCurrentUser, getUserProfile } from '@/lib/auth-helpers';
import { generateInvoiceNumber } from '@/lib/invoices/generateNumber';
import { calcInvoiceFromOrder } from '@/lib/invoices/calc';
import prisma from '@/lib/prisma';

const createInvoiceSchema = z.object({
  orderId: z.string(),
  notes: z.string().optional(),
  dueDate: z.string().optional()
});

export async function POST(request: NextRequest) {
  try {
    // Check admin permissions using established auth pattern
    const { user, profile } = await requireAdmin(request);

    const body = await request.json();
    const { orderId, notes, dueDate } = createInvoiceSchema.parse(body);
    
    console.log('Creating invoice for order:', orderId);

    // Get the order with customer info
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: true
      }
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (!order.userId) {
      console.log('Order has no userId:', order.id, order.productName);
      return NextResponse.json({ 
        error: 'Order must have a customer', 
        details: `Order ${order.id} (${order.productName}) has no associated customer` 
      }, { status: 400 });
    }
    
    console.log('Order found with customer:', order.id, order.userId);

    // Check if invoice already exists for this order
    const existingInvoice = await prisma.invoice.findFirst({
      where: { orderId }
    });

    let invoice;

    if (existingInvoice && existingInvoice.status === 'DRAFT') {
      // Regenerate existing DRAFT invoice
      const calculation = await calcInvoiceFromOrder(order);
      
      // Delete existing items
      await prisma.invoiceItem.deleteMany({
        where: { invoiceId: existingInvoice.id }
      });

      // Update invoice
      invoice = await prisma.invoice.update({
        where: { id: existingInvoice.id },
        data: {
          subtotal: calculation.subtotal,
          discount: calculation.discount,
          shipping: calculation.shipping,
          tax: calculation.tax,
          total: calculation.total,
          notes: notes || existingInvoice.notes,
          dueDate: dueDate ? new Date(dueDate) : existingInvoice.dueDate,
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
    } else if (existingInvoice) {
      return NextResponse.json({ error: 'Invoice already exists and is not in DRAFT status' }, { status: 400 });
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
          notes,
          dueDate: dueDate ? new Date(dueDate) : null,
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
    }

    return NextResponse.json(invoice, { status: 201 });
  } catch (error: any) {
    console.error('Error creating invoice:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    if (error.message?.includes('Admin access required')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    
    
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 });
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check admin permissions using established auth pattern
    const { user, profile } = await requireAdmin(request);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    const where: any = {};
    if (status) {
      where.status = status;
    }

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        include: {
          customer: {
            select: { id: true, name: true, email: true }
          },
          order: {
            select: { id: true, productName: true }
          },
          _count: {
            select: { items: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit
      }),
      prisma.invoice.count({ where })
    ]);

    return NextResponse.json({
      invoices,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error: any) {
    console.error('Error fetching invoices:', error);
    
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    if (error.message?.includes('Admin access required')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}