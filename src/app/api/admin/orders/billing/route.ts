import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-helpers';
import { supabaseAdmin } from '@/lib/supabase';
import { calcInvoiceFromOrder } from '@/lib/invoices/calc';

export async function GET(request: NextRequest) {
 try {
  // Check admin permissions
  const { user, profile } = await requireAdmin(request);
  
  const { searchParams } = new URL(request.url);
  const customer = searchParams.get('customer');
  const status = searchParams.get('status');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const offset = (page - 1) * limit;

  // Build query for Supabase - using simple select without joins due to missing foreign keys
  let query = supabaseAdmin
   .from('Order')
   .select('*');

  // Filter by status - only show orders that could be billed
  const billableStatuses = ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'];
  if (status && status !== 'all') {
   query = query.eq('status', status);
  } else {
   // Default: show orders that are ready for billing
   query = query.in('status', billableStatuses);
  }

  // Filter by customer if specified - we'll do this in post-processing since Supabase doesn't support complex OR queries easily
  
  const { data: orders, error: ordersError } = await query
   .order('createdAt', { ascending: false })
   .range(offset, offset + limit - 1);

  if (ordersError) {
   console.error('Error fetching orders for billing:', ordersError);
   throw new Error('Failed to fetch orders');
  }

  // Count total orders for pagination
  let countQuery = supabaseAdmin
   .from('Order')
   .select('*', { count: 'exact', head: true });
  
  if (status && status !== 'all') {
   countQuery = countQuery.eq('status', status);
  } else {
   countQuery = countQuery.in('status', billableStatuses);
  }

  const { count: total, error: countError } = await countQuery;

  if (countError) {
   console.error('Error counting orders:', countError);
   throw new Error('Failed to count orders');
  }

  // Filter by customer in post-processing if specified
  let filteredOrders = orders || [];
  if (customer && customer !== 'all') {
   const customerLower = customer.toLowerCase();
   filteredOrders = filteredOrders.filter(order => {
    const custInfoName = order.customerInfo?.name?.toLowerCase() || '';
    const userEmail = order.userEmail?.toLowerCase() || '';
    
    return custInfoName.includes(customerLower) || 
           userEmail.includes(customerLower);
   });
  }

  // Check for existing invoices for all orders in batch
  const orderIds = filteredOrders.map(order => order.id);
  const { data: existingInvoices, error: invoiceError } = await supabaseAdmin
    .from('Invoice')
    .select('orderId, id, number, status, total')
    .in('orderId', orderIds);

  if (invoiceError) {
    console.warn('Error fetching invoices for orders:', invoiceError);
  }

  // Create a map for quick invoice lookup
  const invoicesByOrderId = new Map();
  (existingInvoices || []).forEach(invoice => {
    if (!invoicesByOrderId.has(invoice.orderId)) {
      invoicesByOrderId.set(invoice.orderId, []);
    }
    invoicesByOrderId.get(invoice.orderId).push(invoice);
  });

  // Transform orders for billing display with accurate pricing calculation
  const transformedOrders = await Promise.all(filteredOrders.map(async order => {
   // Extract customer info from customerInfo JSON (since we don't have joins)
   let customerName = 'Guest Customer';
   let customerEmail = '';
   let customerCompany = '';
   
   if (order.customerInfo) {
    const custInfo = order.customerInfo as any;
    customerName = custInfo.name || 'Guest Customer';
    customerEmail = custInfo.email || '';
    customerCompany = custInfo.company || '';
   } else if (order.userEmail) {
    customerEmail = order.userEmail;
    customerName = customerEmail;
   }

   // Calculate accurate factory cost using the same system as invoices
   let accurateFactoryCost = 0;
   
   try {
    // Create order object compatible with invoice calculation
    const orderForCalc = {
     id: order.id,
     productName: order.productName || 'Custom Cap',
     calculatedTotal: 0, // Will be calculated
     totalUnits: calculateTotalItems(order.selectedColors),
     selectedOptions: order.selectedOptions,
     selectedColors: order.selectedColors,
     logoSetupSelections: order.logoSetupSelections,
     multiSelectOptions: order.multiSelectOptions,
     customerInfo: order.customerInfo,
     additionalInstructions: order.additionalInstructions,
     user: {
      customerRole: 'RETAIL' // Default, can be overridden if available
     }
    };

    // 🔍 DEBUG: Log the exact data structure for problematic order
    if (order.id === '9e62191c-9335-4512-a76d-522c95a6ff8e') {
      console.log('🔍 BILLING DEBUG - Order 95a6ff8e selectedOptions type:', typeof order.selectedOptions);
      console.log('🔍 BILLING DEBUG - Order 95a6ff8e selectedOptions fabric-setup:', order.selectedOptions?.['fabric-setup']);
      console.log('🔍 BILLING DEBUG - Order 95a6ff8e selectedOptions custom-fabric:', order.selectedOptions?.['custom-fabric']);
      console.log('🔍 BILLING DEBUG - Order 95a6ff8e selectedOptions delivery-type:', order.selectedOptions?.['delivery-type']);
    }

    // Use the same accurate pricing calculation as invoices
    const invoiceCalculation = await calcInvoiceFromOrder(orderForCalc);
    accurateFactoryCost = invoiceCalculation.total;
    
    console.log(`💰 Order ${order.id}: Calculated accurate cost $${accurateFactoryCost.toFixed(2)}`);
   } catch (error) {
    console.warn(`⚠️  Failed to calculate accurate cost for order ${order.id}, using fallback:`, error);
    
    // Fallback: Basic calculation only if accurate calculation fails
    if (order.selectedColors && typeof order.selectedColors === 'object') {
     const totalQuantity = calculateTotalItems(order.selectedColors);
     accurateFactoryCost = totalQuantity * 3.50; // Fallback base price
    }
   }

   // Get invoices for this order
   const orderInvoices = invoicesByOrderId.get(order.id) || [];
   
   // Use invoice total if available (to show discounted amount), otherwise use calculated cost
   let displayCost = accurateFactoryCost;
   if (orderInvoices.length > 0) {
     // Use the latest invoice total (most recent discount applied)
     const latestInvoice = orderInvoices[orderInvoices.length - 1];
     displayCost = latestInvoice.total || accurateFactoryCost;
   }

   return {
    id: order.id,
    customer: customerCompany ? `${customerName} (${customerCompany})` : customerName,
    customerEmail,
    items: calculateTotalItems(order.selectedColors),
    factory: displayCost,
    due: order.updatedAt || order.createdAt,
    status: order.status,
    productName: order.productName,
    hasInvoice: orderInvoices.length > 0,
    invoices: orderInvoices,
    orderType: order.orderType,
    createdAt: order.createdAt
   };
  }));

  return NextResponse.json({
   orders: transformedOrders,
   pagination: {
    page,
    limit,
    total: total || 0,
    pages: Math.ceil((total || 0) / limit)
   }
  });

 } catch (error: any) {
  console.error('Error fetching billing orders:', error);
  
  if (error.message === 'Unauthorized') {
   return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  
  if (error.message?.includes('Admin access required')) {
   return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
 }
}

// Helper function to calculate total items from selectedColors
function calculateTotalItems(selectedColors: any): number {
 if (!selectedColors || typeof selectedColors !== 'object') {
  return 0;
 }

 let totalItems = 0;
 Object.values(selectedColors).forEach((color: any) => {
  if (color && color.sizes && typeof color.sizes === 'object') {
   Object.values(color.sizes).forEach((qty: any) => {
    totalItems += Number(qty) || 0;
   });
  }
 });

 return totalItems;
}