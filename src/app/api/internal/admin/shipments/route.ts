import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
 try {
  const { searchParams } = new URL(request.url);
  const includeOrders = searchParams.get('includeOrders') === 'true';
  const activeOnly = searchParams.get('activeOnly') === 'true';

  // Build where clause for active shipments only
  const where = activeOnly 
   ? {
     OR: [
      { status: 'ACTIVE' },
      { status: 'PREPARING' },
      { status: 'READY_TO_SHIP' },
     ]
    }
   : {};

  // Build query
  let query = supabaseAdmin
   .from('shipments')
   .select(`
    *,
    ${includeOrders ? `orders(
     id,
     product_name,
     customer_info,
     status,
     created_at,
     total_units,
     calculated_total,
     user_email
    )` : ''}
   `)
   .order('created_at', { ascending: false });

  // Apply filters
  if (activeOnly) {
   query = query.in('status', ['ACTIVE', 'PREPARING', 'READY_TO_SHIP']);
  }

  const { data: shipments, error } = await query;

  if (error) {
   console.error('Error fetching shipments:', error);
   return NextResponse.json(
    { error: 'Failed to fetch shipments' },
    { status: 500 }
   );
  }

  // Calculate statistics for each shipment
  const shipmentsWithStats = (shipments || []).map(shipment => {
   const stats = {
    totalOrders: shipment.orders?.length || 0,
    totalUnits: shipment.orders?.reduce((sum: number, order: any) => sum + (order.total_units || 0), 0) || 0,
    totalValue: shipment.orders?.reduce((sum: number, order: any) => sum + (order.calculated_total || 0), 0) || 0,
    ordersByStatus: shipment.orders?.reduce((acc: any, order: any) => {
     acc[order.status] = (acc[order.status] || 0) + 1;
     return acc;
    }, {}) || {},
   };

   return {
    ...shipment,
    stats,
   };
  });

  // Overall statistics
  const overallStats = {
   totalShipments: shipments?.length || 0,
   activeShipments: shipments?.filter(s => ['ACTIVE', 'PREPARING', 'READY_TO_SHIP'].includes(s.status || '')).length || 0,
   totalOrdersInShipments: shipments?.reduce((sum, s) => sum + (s.orders?.length || 0), 0) || 0,
   totalUnitsInShipments: shipments?.reduce((sum, s) => sum + (s.orders?.reduce((orderSum: number, order: any) => orderSum + (order.total_units || 0), 0) || 0), 0) || 0,
   totalValueInShipments: shipments?.reduce((sum, s) => sum + (s.orders?.reduce((orderSum: number, order: any) => orderSum + (order.calculated_total || 0), 0) || 0), 0) || 0,
  };

  return NextResponse.json({
   shipments: shipmentsWithStats,
   stats: overallStats,
  });
 } catch (error) {
  console.error('Error fetching admin shipments:', error);
  return NextResponse.json(
   { error: 'Failed to fetch shipments' },
   { status: 500 }
  );
 }
}