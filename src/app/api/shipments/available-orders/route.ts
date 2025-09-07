import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
 try {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const search = searchParams.get('search');
  const shipmentId = searchParams.get('shipmentId');

  console.log('🔍 API: Fetching orders with params:', { status, search, shipmentId });

  // Start with base query
  let query = supabaseAdmin
   .from('Order')
   .select('id, productName, customerInfo, status, orderSource, orderType, createdAt, updatedAt, shipmentId, userEmail')
   .order('createdAt', { ascending: false });

  // Apply shipment filter
  if (shipmentId) {
   query = query.or(`shipmentId.is.null,shipmentId.eq.${shipmentId}`);
  } else {
   query = query.is('shipmentId', null);
  }

  // Apply status filter
  if (status && status !== 'all') {
   query = query.eq('status', status.toUpperCase());
  }

  // Apply search filter
  if (search) {
   query = query.or(`id.ilike.%${search}%,productName.ilike.%${search}%,userEmail.ilike.%${search}%`);
  }

  console.log('🔍 API: Executing Supabase query');

  const { data: orders, error } = await query;

  if (error) {
   throw error;
  }

  console.log('📦 API: Found', orders?.length || 0, 'orders');
  console.log('📦 API: Orders with shipmentId:', orders?.filter(o => o.shipmentId).length || 0);
  if (shipmentId) {
   console.log('📦 API: Orders for this shipment:', orders?.filter(o => o.shipmentId === shipmentId).length || 0);
  }

  // Calculate statistics
  const stats = {
   total: orders?.length || 0,
   unassigned: orders?.filter(order => !order.shipmentId).length || 0,
   pending: orders?.filter(order => order.status === 'PENDING').length || 0,
   processing: orders?.filter(order => order.status === 'PROCESSING').length || 0,
   confirmed: orders?.filter(order => order.status === 'CONFIRMED').length || 0,
  };

  return NextResponse.json({ orders: orders || [], stats });
 } catch (error) {
  console.error('Error fetching available orders:', error);
  return NextResponse.json(
   { error: 'Failed to fetch available orders' },
   { status: 500 }
  );
 }
}