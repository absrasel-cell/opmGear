import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
 try {
  // Parse query parameters
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const priority = searchParams.get('priority');
  const complexity = searchParams.get('complexity');
  const limit = parseInt(searchParams.get('limit') || '50');
  const offset = parseInt(searchParams.get('offset') || '0');

  // Query parameters will be applied directly to Supabase query below

  // Build Supabase query - simplified without problematic relationships
  let query = supabaseAdmin
   .from('QuoteOrder')
   .select('*')
   .order('lastActivityAt', { ascending: false })
   .range(offset, offset + limit - 1);

  // Apply filters
  if (status && status !== 'ALL') {
   query = query.eq('status', status);
  }
  if (priority && priority !== 'ALL') {
   query = query.eq('priority', priority);
  }
  if (complexity && complexity !== 'ALL') {
   query = query.eq('complexity', complexity);
  }

  const { data: quoteOrders, error: fetchError } = await query;

  if (fetchError) {
   console.error('Supabase fetch error:', fetchError);
   throw new Error(`Database error: ${fetchError.message}`);
  }

  // Transform data for frontend - using actual schema fields
  const transformedQuoteOrders = (quoteOrders || []).map(quoteOrder => ({
   id: quoteOrder.id,
   sessionId: quoteOrder.sessionId,
   title: quoteOrder.title || 'Untitled Quote',
   status: quoteOrder.status,
   priority: quoteOrder.priority,
   complexity: quoteOrder.complexity,
   customerInfo: {
    email: quoteOrder.customerEmail || '',
    name: quoteOrder.customerName || '',
    phone: quoteOrder.customerPhone || '',
    company: quoteOrder.customerCompany || '',
    address: quoteOrder.customerAddress || null
   },
   productType: quoteOrder.productType || 'Custom Cap',
   quantities: quoteOrder.quantities || {},
   colors: quoteOrder.colors || {},
   logoRequirements: quoteOrder.logoRequirements || { logos: [] },
   customizationOptions: quoteOrder.customizationOptions || { accessories: [], moldCharges: 0, delivery: {} },
   extractedSpecs: quoteOrder.extractedSpecs || {},
   estimatedCosts: quoteOrder.estimatedCosts || { baseProductCost: 0, logosCost: 0, deliveryCost: 0, total: 0 },
   aiSummary: quoteOrder.aiSummary || '',
   additionalRequirements: quoteOrder.additionalRequirements || '',
   customerInstructions: quoteOrder.customerInstructions || '',
   internalNotes: quoteOrder.internalNotes || '',
   tags: quoteOrder.tags || [],
   followUpRequired: quoteOrder.followUpRequired,
   followUpDate: quoteOrder.followUpDate || '',
   assignedTo: null, // TODO: Add relationship query
   convertedOrder: null, // TODO: Add relationship query  
   files: [], // TODO: Add relationship query
   createdAt: quoteOrder.createdAt,
   updatedAt: quoteOrder.updatedAt,
   lastActivityAt: quoteOrder.lastActivityAt,
   completedAt: quoteOrder.completedAt || '',
   conversionDate: quoteOrder.conversionDate || '',
   conversionValue: Number(quoteOrder.conversionValue || 0)
  }));

  return NextResponse.json({ 
   quoteOrders: transformedQuoteOrders,
   count: transformedQuoteOrders.length,
   success: true
  });

 } catch (error) {
  console.error('Error fetching quote orders:', error);
  return NextResponse.json(
   { error: 'Failed to fetch quote orders', success: false },
   { status: 500 }
  );
 }
}

export async function PATCH(request: NextRequest) {
 try {
  const { searchParams } = new URL(request.url);
  const quoteId = searchParams.get('id');
  
  if (!quoteId) {
   return NextResponse.json(
    { error: 'Quote ID is required' },
    { status: 400 }
   );
  }

  const updates = await request.json();

  // Update quote order
  const { data: updatedQuoteOrder, error: updateError } = await supabaseAdmin
   .from('QuoteOrder')
   .update({
    ...updates,
    lastActivityAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
   })
   .eq('id', quoteId)
   .select()
   .single();

  if (updateError || !updatedQuoteOrder) {
   console.error('Supabase update error:', updateError);
   throw new Error(`Database error: ${updateError?.message}`);
  }

  return NextResponse.json({
   success: true,
   quoteOrder: updatedQuoteOrder
  });

 } catch (error) {
  console.error('Error updating quote order:', error);
  return NextResponse.json(
   { error: 'Failed to update quote order' },
   { status: 500 }
  );
 }
}

// Export a CSV of all quote orders
export async function POST(request: NextRequest) {
 try {
  const { data: quoteOrders, error: fetchError } = await supabaseAdmin
   .from('QuoteOrder')
   .select('*')
   .order('createdAt', { ascending: false });

  if (fetchError) {
   console.error('Supabase fetch error:', fetchError);
   throw new Error(`Database error: ${fetchError.message}`);
  }

  const csvData = (quoteOrders || []).map(q => ({
   'Quote ID': q.id,
   'Session ID': q.sessionId,
   'Title': q.title || '',
   'Status': q.status,
   'Priority': q.priority || '',
   'Complexity': q.complexity || '',
   'Customer Email': q.customerEmail || '',
   'Customer Name': q.customerName || '',
   'Product Type': q.productType || '',
   'AI Summary': q.aiSummary || '',
   'Created At': q.createdAt,
   'Last Activity': q.lastActivityAt || q.updatedAt
  }));

  return NextResponse.json({
   success: true,
   data: csvData,
   filename: `quote-orders-${new Date().toISOString().split('T')[0]}.csv`
  });

 } catch (error) {
  console.error('Error exporting quote orders:', error);
  return NextResponse.json(
   { error: 'Failed to export quote orders' },
   { status: 500 }
  );
 }
}