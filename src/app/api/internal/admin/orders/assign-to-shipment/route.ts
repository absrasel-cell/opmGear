import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
 try {
  const body = await request.json();
  const { orderIds, shipmentId, buildNumber } = body;

  if ((!orderIds || !Array.isArray(orderIds) || orderIds.length === 0)) {
   return NextResponse.json(
    { error: 'Order IDs array is required' },
    { status: 400 }
   );
  }

  if (!shipmentId && !buildNumber) {
   return NextResponse.json(
    { error: 'Either shipmentId or buildNumber is required' },
    { status: 400 }
   );
  }

  // Find shipment by ID or build number
  let shipment = null;
  if (shipmentId) {
   const { data, error } = await supabaseAdmin
    .from('shipments')
    .select('*')
    .eq('id', shipmentId)
    .single();
   if (!error) shipment = data;
  } else if (buildNumber) {
   const { data, error } = await supabaseAdmin
    .from('shipments')
    .select('*')
    .eq('build_number', buildNumber)
    .single();
   if (!error) shipment = data;
  }

  if (!shipment) {
   return NextResponse.json(
    { error: 'Shipment not found' },
    { status: 404 }
   );
  }

  // Validate that orders exist and are assignable
  const { data: orders, error: ordersError } = await supabaseAdmin
   .from('orders')
   .select('id, product_name, shipment_id, status, user_email, total_units, calculated_total')
   .in('id', orderIds)
   .in('status', ['CONFIRMED', 'PENDING', 'PROCESSING']);

  if (ordersError) {
   console.error('Error fetching orders:', ordersError);
   return NextResponse.json(
    { error: 'Failed to fetch orders' },
    { status: 500 }
   );
  }

  if (orders.length !== orderIds.length) {
   const foundIds = orders.map(o => o.id);
   const notFoundIds = orderIds.filter(id => !foundIds.includes(id));
   return NextResponse.json(
    { error: `Some orders not found or not assignable: ${notFoundIds.join(', ')}` },
    { status: 400 }
   );
  }

  // Check for orders already assigned to different shipments
  const alreadyAssigned = orders.filter(o => o.shipment_id && o.shipment_id !== shipment.id);
  if (alreadyAssigned.length > 0) {
   return NextResponse.json(
    { 
     error: `Some orders are already assigned to other shipments: ${alreadyAssigned.map(o => `${o.id} (${o.product_name})`).join(', ')}`,
     alreadyAssignedOrders: alreadyAssigned 
    },
    { status: 400 }
   );
  }

  // Update orders to assign them to the shipment
  const { error: updateError, count } = await supabaseAdmin
   .from('orders')
   .update({ shipment_id: shipment.id })
   .in('id', orderIds);

  if (updateError) {
   console.error('Error updating orders:', updateError);
   return NextResponse.json(
    { error: 'Failed to assign orders to shipment' },
    { status: 500 }
   );
  }

  // Get updated shipment with orders for response
  const { data: updatedShipment, error: shipmentError } = await supabaseAdmin
   .from('shipments')
   .select(`
    *,
    orders(
     id,
     product_name,
     status,
     user_email,
     total_units,
     calculated_total,
     created_at
    )
   `)
   .eq('id', shipment.id)
   .single();

  if (shipmentError) {
   console.error('Error fetching updated shipment:', shipmentError);
  }

  // Calculate statistics
  const stats = {
   totalOrders: updatedShipment?.orders?.length || 0,
   totalUnits: updatedShipment?.orders?.reduce((sum: number, order: any) => sum + (order.total_units || 0), 0) || 0,
   totalValue: updatedShipment?.orders?.reduce((sum: number, order: any) => sum + (order.calculated_total || 0), 0) || 0,
   assignedCount: count || 0,
  };

  return NextResponse.json({
   message: `Successfully assigned ${count || 0} order(s) to shipment ${shipment.build_number}`,
   shipment: updatedShipment,
   assignedOrders: orders,
   stats,
  });

 } catch (error) {
  console.error('Error assigning orders to shipment:', error);
  return NextResponse.json(
   { error: 'Failed to assign orders to shipment' },
   { status: 500 }
  );
 }
}