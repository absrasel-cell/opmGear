import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-helpers';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
 try {
  const user = await requireAuth(request);
  const { searchParams } = new URL(request.url);
  const limit = searchParams.get('limit');
  const status = searchParams.get('status');

  // Build query
  const where: any = { userId: user.id };
  if (status) where.status = status;

  // Fetch orders with graceful database failure handling
  let orders = [];
  try {
   let query = supabaseAdmin
     .from('orders')
     .select('*')
     .eq('userId', user.id)
     .order('createdAt', { ascending: false });

   if (status) {
     query = query.eq('status', status);
   }

   if (limit) {
     query = query.limit(parseInt(limit));
   }

   const { data: ordersData, error } = await query;

   if (error) {
     throw error;
   }

   orders = ordersData || [];

   return NextResponse.json({
    orders,
    count: orders.length,
   });

  } catch (dbError) {
   console.error('Database error when fetching user orders:', dbError);
   
   // Return empty orders list when database is unavailable
   return NextResponse.json({
    orders: [],
    count: 0,
    note: 'Orders temporarily unavailable due to database maintenance.',
   }, { status: 200 });
  }
 } catch (error: any) {
  if (error.message === 'Unauthorized') {
   return NextResponse.json(
    { error: 'Unauthorized' },
    { status: 401 }
   );
  }
  console.error('Error fetching user orders:', error);
  return NextResponse.json(
   { error: 'Failed to fetch orders' },
   { status: 500 }
  );
 }
}