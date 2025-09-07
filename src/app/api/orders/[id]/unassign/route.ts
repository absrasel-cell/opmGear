import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(
 request: NextRequest,
 { params }: { params: { id: string } }
) {
 try {
  const orderId = params.id;

  // Check if order exists
  const { data: existingOrder, error } = await supabaseAdmin
   .from('orders')
   .select('id, shipment_id')
   .eq('id', orderId)
   .single();

  if (error) {
   console.error('Error fetching order:', error);
   return NextResponse.json(
    { error: 'Internal server error' },
    { status: 500 }
   );
  }

  if (!existingOrder) {
   return NextResponse.json(
    { error: 'Order not found' },
    { status: 404 }
   );
  }

  // Unassign the order from its shipment
  const { data: updatedOrder, error: updateError } = await supabaseAdmin
   .from('orders')
   .update({ shipment_id: null })
   .eq('id', orderId)
   .select('id, shipment_id, product_name, status')
   .single();

  if (updateError) {
   console.error('Error updating order:', updateError);
   return NextResponse.json(
    { error: 'Failed to unassign order' },
    { status: 500 }
   );
  }

  return NextResponse.json({ 
   message: 'Order unassigned successfully',
   order: updatedOrder
  });
 } catch (error) {
  console.error('Error unassigning order:', error);
  return NextResponse.json(
   { error: 'Failed to unassign order' },
   { status: 500 }
  );
 }
}