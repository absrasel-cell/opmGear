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
import { supabaseAdmin } from '@/lib/supabase';


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
  const { data: order, error: orderError } = await supabaseAdmin
   .from('Order')
   .select('*')
   .eq('id', orderId)
   .single();
  
  console.log('📋 Order query result:', order ? 'Found' : 'Not found');
  if (orderError) {
   console.log('📋 Order query error:', orderError);
  }

  // Validate order before proceeding
  console.log('🔍 Validating order...');
  validateOrderForInvoice(order);
  console.log('✅ Order validation passed');
  
  console.log('👤 Order found with customer:', order!.id, order!.userId);

  // Check if invoice already exists for this order
  const { data: existingInvoice, error: existingInvoiceError } = await supabaseAdmin
   .from('Invoice')
   .select('*')
   .eq('orderId', orderId)
   .single();
   
  if (existingInvoiceError && existingInvoiceError.code !== 'PGRST116') {
    console.error('Error checking existing invoice:', existingInvoiceError);
    throw new Error('Database error checking existing invoice');
  }

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
     discount: totalDiscount,
     total: newTotal
    };
   }
   
   // Validate calculation results
   validateInvoiceData(calculation);
   
   // Delete existing items
   const { error: deleteItemsError } = await supabaseAdmin
    .from('InvoiceItem')
    .delete()
    .eq('invoiceId', existingInvoice.id);
    
   if (deleteItemsError) {
    console.error('Error deleting existing invoice items:', deleteItemsError);
    throw new Error('Failed to delete existing invoice items');
   }

   // Update invoice
   const { data: updatedInvoice, error: updateError } = await supabaseAdmin
    .from('Invoice')
    .update({
     subtotal: Number(calculation.subtotal),
     tax: Number(calculation.tax || 0),
     discount: Number(calculation.discount || 0),
     total: Number(calculation.total),
     notes: notes || existingInvoice.notes,
     dueDate: dueDate || existingInvoice.dueDate,
     updatedAt: new Date().toISOString()
    })
    .eq('id', existingInvoice.id)
    .select('*')
    .single();
    
   if (updateError) {
    console.error('Error updating invoice:', updateError);
    throw new Error('Failed to update invoice');
   }
   
   // Create new invoice items
   const invoiceItems = calculation.items.map((item, index) => ({
    id: `item_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 6)}`,
    invoiceId: existingInvoice.id,
    name: item.name,
    description: item.description,
    quantity: item.quantity,
    unitPrice: Number(item.unitPrice),
    total: Number(item.total)
   }));
   
   const { data: createdItems, error: itemsError } = await supabaseAdmin
    .from('InvoiceItem')
    .insert(invoiceItems)
    .select('*');
    
   if (itemsError) {
    console.error('Error creating invoice items:', itemsError);
    throw new Error('Failed to create invoice items');
   }
   
   // Fetch customer and order info
   const { data: customer } = await supabaseAdmin
    .from('User')
    .select('id, name, email')
    .eq('id', order.userId)
    .single();
   
   invoice = {
    ...updatedInvoice,
    items: createdItems || [],
    customer: customer || null,
    order: order
   };
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
     discount: totalDiscount,
     total: newTotal
    };
   }
   
   // Validate calculation results
   validateInvoiceData(calculation);

   // Create new invoice
   // Generate unique invoice ID
   const invoiceId = `invoice_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
   
   const { data: newInvoice, error: createError } = await supabaseAdmin
    .from('Invoice')
    .insert({
     id: invoiceId,
     number: invoiceNumber,
     orderId,
     customerId: order.userId || order.userEmail || 'guest-user', // Handle null userId
     subtotal: Number(calculation.subtotal),
     tax: Number(calculation.tax || 0),
     discount: Number(calculation.discount || 0),
     total: Number(calculation.total),
     notes,
     dueDate: dueDate || null,
     createdAt: new Date().toISOString(),
     updatedAt: new Date().toISOString()
    })
    .select('*')
    .single();
    
   if (createError) {
    console.error('Error creating invoice:', createError);
    throw new Error('Failed to create invoice');
   }
   
   // Create invoice items
   const invoiceItems = calculation.items.map((item, index) => ({
    id: `item_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 6)}`,
    invoiceId: newInvoice.id,
    name: item.name,
    description: item.description,
    quantity: item.quantity,
    unitPrice: Number(item.unitPrice),
    total: Number(item.total)
   }));
   
   const { data: createdItems, error: itemsError } = await supabaseAdmin
    .from('InvoiceItem')
    .insert(invoiceItems)
    .select('*');
    
   if (itemsError) {
    console.error('Error creating invoice items:', itemsError);
    throw new Error('Failed to create invoice items');
   }
   
   // Fetch customer and order info
   const { data: customer } = await supabaseAdmin
    .from('User')
    .select('id, name, email')
    .eq('id', order.userId)
    .single();
   
   invoice = {
    ...newInvoice,
    items: createdItems || [],
    customer: customer || null,
    order: order
   };
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

  let query = supabaseAdmin
   .from('Invoice')
   .select('*');

  if (status) {
   query = query.eq('status', status);
  }

  const [{ data: invoices, error: invoicesError }, { count: total, error: countError }] = await Promise.all([
   query
    .order('createdAt', { ascending: false })
    .range(offset, offset + limit - 1),
   status ? 
    supabaseAdmin
     .from('Invoice')
     .select('*', { count: 'exact', head: true })
     .eq('status', status) :
    supabaseAdmin
     .from('Invoice')
     .select('*', { count: 'exact', head: true })
  ]);

  if (invoicesError) {
   console.error('Error fetching invoices:', invoicesError);
   throw new Error('Failed to fetch invoices');
  }

  if (countError) {
   console.error('Error counting invoices:', countError);
   throw new Error('Failed to count invoices');
  }

  // Enrich invoices with customer and order data
  const enrichedInvoices = await Promise.all(
    (invoices || []).map(async (invoice) => {
      // Fetch customer data
      const { data: customer } = await supabaseAdmin
        .from('User')
        .select('id, name, email')
        .eq('id', invoice.customerId)
        .single();

      // Fetch order data
      const { data: order } = await supabaseAdmin
        .from('Order')
        .select('id, productName')
        .eq('id', invoice.orderId)
        .single();

      // Fetch invoice items count
      const { count: itemsCount } = await supabaseAdmin
        .from('InvoiceItem')
        .select('*', { count: 'exact', head: true })
        .eq('invoiceId', invoice.id);

      return {
        ...invoice,
        customer: customer || { id: '', name: 'Unknown Customer', email: '' },
        order: order || { id: invoice.orderId, productName: 'Unknown Product' },
        _count: {
          items: itemsCount || 0
        }
      };
    })
  );

  return NextResponse.json({
   invoices: enrichedInvoices,
   pagination: {
    page,
    limit,
    total: total || 0,
    pages: Math.ceil((total || 0) / limit)
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