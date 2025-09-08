import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser, getUserProfile } from '@/lib/auth-helpers';
import { generateInvoiceNumber } from '@/lib/invoices/generateNumber';
import { calcInvoiceFromOrder } from '@/lib/invoices/calc';
import { supabaseAdmin } from '@/lib/supabase';

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

  // Get user's invoices (without foreign key relationships for now)
  const { data: invoices, error: invoicesError } = await supabaseAdmin
   .from('Invoice')
   .select('*')
   .eq('customerId', user.id)
   .order('createdAt', { ascending: false });

  if (invoicesError) {
   console.error('Error fetching invoices:', invoicesError);
   return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 });
  }

  // Manually fetch related data for each invoice
  const enrichedInvoices = await Promise.all(
   (invoices || []).map(async (invoice) => {
    // Fetch invoice items
    const { data: items } = await supabaseAdmin
     .from('InvoiceItem')
     .select('*')
     .eq('invoiceId', invoice.id);

    // Fetch order data
    const { data: order } = await supabaseAdmin
     .from('Order')
     .select('id, productName, createdAt')
     .eq('id', invoice.orderId)
     .single();

    return {
     ...invoice,
     items: items || [],
     order: order || null
    };
   })
  );

  return NextResponse.json({
   invoices: enrichedInvoices || []
  });
 } catch (error: any) {
  console.error('Error fetching user invoices:', error);
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
 }
}

export async function POST(request: NextRequest) {
 try {
  console.log('🧾 User invoice API called');
  
  // Get current user
  const user = await getCurrentUser(request);
  console.log('🧾 Current user:', { found: !!user, id: user?.id, email: user?.email });
  
  if (!user) {
   console.log('🧾 No user found - authentication required');
   return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const profile = await getUserProfile(user.id);
  console.log('🧾 User profile:', { found: !!profile, email: profile?.email });
  
  if (!profile) {
   console.log('🧾 No profile found for user');
   return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
  }

  const body = await request.json();
  console.log('🧾 Request body:', body);
  
  const { orderId, notes } = createInvoiceSchema.parse(body);
  console.log('🧾 Parsed data - orderId:', orderId, 'notes:', notes);
  
  console.log('🧾 Creating user invoice for order:', orderId, 'by user:', user.id);

  // Get the order and verify ownership
  console.log('🧾 Looking up order:', orderId);
  const { data: order, error: orderError } = await supabaseAdmin
   .from('Order')
   .select('*')
   .eq('id', orderId)
   .single();

  console.log('🧾 Order lookup result:', {
   found: !!order,
   id: order?.id,
   userId: order?.userId,
   productName: order?.productName,
   error: orderError
  });

  if (!order) {
   console.log('🧾 Order not found');
   return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  // Verify user owns this order
  console.log('🧾 Verifying order ownership - order.userId:', order.userId, 'user.id:', user.id);
  if (order.userId !== user.id) {
   console.log('🧾 Order ownership verification failed');
   return NextResponse.json({ error: 'You can only create invoices for your own orders' }, { status: 403 });
  }

  if (!order.userId) {
   console.log('🧾 Order has no userId:', order.id, order.productName);
   return NextResponse.json({ 
    error: 'Order must have a customer', 
    details: `Order ${order.id} (${order.productName}) has no associated customer` 
   }, { status: 400 });
  }
  
  console.log('🧾 Order found and verified ownership:', order.id, order.userId);

  // Check if invoice already exists for this order
  console.log('🧾 Checking for existing invoice');
  const { data: existingInvoice, error: existingInvoiceError } = await supabaseAdmin
   .from('Invoice')
   .select('*')
   .eq('orderId', orderId)
   .single();

  console.log('🧾 Existing invoice check:', { 
   found: !!existingInvoice, 
   id: existingInvoice?.id,
   error: existingInvoiceError
  });

  let invoice;

  if (existingInvoice) {
   console.log('🧾 Returning existing invoice:', existingInvoice.id);
   
   // Manually fetch related data
   const { data: items } = await supabaseAdmin
    .from('InvoiceItem')
    .select('*')
    .eq('invoiceId', existingInvoice.id);

   const { data: order } = await supabaseAdmin
    .from('Order')
    .select('*')
    .eq('id', existingInvoice.orderId)
    .single();

   invoice = {
    ...existingInvoice,
    items: items || [],
    order: order || null
   };
  } else {
   console.log('🧾 Creating new invoice');
   
   // Create new invoice
   const invoiceNumber = await generateInvoiceNumber();
   console.log('🧾 Generated invoice number:', invoiceNumber);
   
   console.log('🧾 Starting invoice calculation...');
   const calculation = await calcInvoiceFromOrder(order);
   console.log('🧾 Invoice calculation completed:', {
    subtotal: calculation.subtotal,
    total: calculation.total,
    itemCount: calculation.items.length
   });

   console.log('🧾 Creating invoice in database...');
   
   // Generate unique invoice ID
   const invoiceId = `invoice_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
   console.log('🧾 Generated invoice ID:', invoiceId);
   
   // Create the invoice
   const { data: newInvoice, error: invoiceError } = await supabaseAdmin
    .from('Invoice')
    .insert({
     id: invoiceId,
     number: invoiceNumber,
     orderId,
     customerId: order.userId,
     subtotal: calculation.subtotal,
     discount: calculation.discount || 0,
     shipping: calculation.shipping || 0,
     tax: calculation.tax || 0,
     total: calculation.total,
     notes: notes || `Invoice for Order #${order.id}`,
     status: 'ISSUED', // User-created invoices are automatically issued
     createdAt: new Date().toISOString(),
     updatedAt: new Date().toISOString()
    })
    .select()
    .single();

   if (invoiceError) {
    console.error('🧾 Error creating invoice:', invoiceError);
    return NextResponse.json({ error: 'Error creating invoice' }, { status: 500 });
   }

   // Create invoice items with explicit IDs
   const { error: itemsError } = await supabaseAdmin
    .from('InvoiceItem')
    .insert(calculation.items.map((item, index) => ({
     id: `item_${Date.now()}_${index + 1}`,
     invoiceId: newInvoice.id,
     name: item.name,
     description: item.description,
     quantity: item.quantity,
     unitPrice: item.unitPrice,
     total: item.total
    })));

   if (itemsError) {
    console.error('🧾 Error creating invoice items:', itemsError);
    return NextResponse.json({ error: 'Error creating invoice items' }, { status: 500 });
   }

   // Get the complete invoice with items and order manually
   const { data: items } = await supabaseAdmin
    .from('InvoiceItem')
    .select('*')
    .eq('invoiceId', newInvoice.id);

   const { data: orderData } = await supabaseAdmin
    .from('Order')
    .select('*')
    .eq('id', newInvoice.orderId)
    .single();

   invoice = {
    ...newInvoice,
    items: items || [],
    order: orderData || null
   };

   console.log('🧾 User invoice created successfully:', invoice.id);
  }

  console.log('🧾 Returning invoice response:', {
   invoiceId: invoice?.id,
   invoiceNumber: invoice?.number,
   status: invoice?.status
  });

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