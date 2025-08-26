import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin, getCurrentUser, getUserProfile } from '@/lib/auth-helpers';
import { generateInvoiceNumber } from '@/lib/invoices/generateNumber';
import { calcInvoiceFromOrder } from '@/lib/invoices/calc';
import { calcSimpleInvoiceFromOrder } from '@/lib/invoices/simple-calc';
import { 
  createInvoiceSchema,
  InvoiceError,
  validateOrderForInvoice,
  validateInvoiceForRegeneration,
  validateInvoiceData
} from '@/lib/invoices/validation';
import prisma from '@/lib/prisma';


export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Invoice API called');
    
    // Check admin permissions using established auth pattern
    const { user, profile } = await requireAdmin(request);
    console.log('✅ Admin authentication successful:', profile.email);

    const body = await request.json();
    console.log('📥 Request body:', body);
    
    const { orderId, notes, dueDate, simple, discountPercent, discountFlat } = createInvoiceSchema.parse(body);
    console.log('✅ Schema validation passed');
    
    console.log('🔍 Creating invoice for order:', orderId, 'simple mode:', simple);

    // Get the order with customer info
    console.log('🔍 Querying database for order:', orderId);
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: true
      }
    });
    console.log('📋 Order query result:', order ? 'Found' : 'Not found');

    // Validate order before proceeding
    console.log('🔍 Validating order...');
    validateOrderForInvoice(order);
    console.log('✅ Order validation passed');
    
    console.log('👤 Order found with customer:', order!.id, order!.userId);

    // Check if invoice already exists for this order
    const existingInvoice = await prisma.invoice.findFirst({
      where: { orderId }
    });

    let invoice;

    if (existingInvoice && existingInvoice.status === 'DRAFT') {
      // Validate that we can regenerate this invoice
      validateInvoiceForRegeneration(existingInvoice);
      
      // Regenerate existing DRAFT invoice
      let calculation = simple ? await calcSimpleInvoiceFromOrder(order!) : await calcInvoiceFromOrder(order!);
      
      // Apply custom discounts if provided
      if (discountPercent || discountFlat) {
        const originalTotal = Number(calculation.total);
        const percentDiscount = discountPercent ? originalTotal * (discountPercent / 100) : 0;
        const flatDiscount = discountFlat || 0;
        const totalDiscount = percentDiscount + flatDiscount;
        const newTotal = Math.max(0, originalTotal - totalDiscount);
        
        calculation = {
          ...calculation,
          discount: new (require('@prisma/client/runtime/library').Decimal)(totalDiscount),
          total: new (require('@prisma/client/runtime/library').Decimal)(newTotal)
        };
      }
      
      // Validate calculation results
      validateInvoiceData(calculation);
      
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
      console.log('🔢 Generating invoice number...');
      const invoiceNumber = await generateInvoiceNumber();
      console.log('✅ Invoice number generated:', invoiceNumber);
      
      console.log('💰 Starting invoice calculation...');
      let calculation = simple ? await calcSimpleInvoiceFromOrder(order!) : await calcInvoiceFromOrder(order!);
      console.log('✅ Invoice calculation completed');
      
      // Apply custom discounts if provided
      if (discountPercent || discountFlat) {
        const originalTotal = Number(calculation.total);
        const percentDiscount = discountPercent ? originalTotal * (discountPercent / 100) : 0;
        const flatDiscount = discountFlat || 0;
        const totalDiscount = percentDiscount + flatDiscount;
        const newTotal = Math.max(0, originalTotal - totalDiscount);
        
        console.log(`💸 Applying discounts: ${discountPercent || 0}% + $${discountFlat || 0} = $${totalDiscount.toFixed(2)}`);
        
        calculation = {
          ...calculation,
          discount: new (require('@prisma/client/runtime/library').Decimal)(totalDiscount),
          total: new (require('@prisma/client/runtime/library').Decimal)(newTotal)
        };
      }
      
      // Validate calculation results
      validateInvoiceData(calculation);

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
      name: error.name,
      code: error.code
    });
    
    // Handle custom invoice errors
    if (error instanceof InvoiceError) {
      const statusCode = error.code === 'ORDER_NOT_FOUND' ? 404 : 400;
      return NextResponse.json({ 
        error: error.message, 
        code: error.code,
        details: error.details 
      }, { status: statusCode });
    }
    
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    if (error.message?.includes('Admin access required')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    
    if (error.name === 'ZodError') {
      return NextResponse.json({ 
        error: 'Invalid request data',
        details: error.errors 
      }, { status: 400 });
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