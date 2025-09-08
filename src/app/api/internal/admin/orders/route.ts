import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-helpers';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
 try {
  const user = await getCurrentUser(request);
  
  if (!user) {
   return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  // Verify admin access
  const { data: userProfile, error: userError } = await supabaseAdmin
    .from('users')
    .select('accessRole, email')
    .eq('id', user.id)
    .single();

  if (userError) {
    console.error('Error fetching user profile:', userError);
    return NextResponse.json({ error: 'Failed to verify user access' }, { status: 500 });
  }

  const isAdmin = ['ADMIN', 'SUPER_ADMIN', 'MASTER_ADMIN', 'STAFF'].includes(userProfile?.accessRole || '') ||
          userProfile?.email === 'absrasel@gmail.com';

  if (!isAdmin) {
   return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '10');
  const status = searchParams.get('status');
  const customerId = searchParams.get('customerId');

  // Get total orders count
  const { count: totalOrders, error: countError } = await supabaseAdmin
    .from('orders')
    .select('*', { count: 'exact', head: true });

  if (countError) {
    console.error('Error counting orders:', countError);
  }

  // Get orders by status
  const { data: statusData, error: statusError } = await supabaseAdmin
    .from('orders')
    .select('status')
    .then(async (result) => {
      if (result.error) return result;
      
      // Group by status manually since Supabase doesn't have groupBy
      const statusCounts: Record<string, number> = {};
      result.data?.forEach(order => {
        statusCounts[order.status] = (statusCounts[order.status] || 0) + 1;
      });
      
      return { data: statusCounts, error: null };
    });

  if (statusError) {
    console.error('Error fetching orders by status:', statusError);
  }

  // Get total revenue
  const { data: revenueOrders, error: revenueError } = await supabaseAdmin
    .from('orders')
    .select('calculatedTotal')
    .neq('status', 'CANCELLED')
    .not('calculatedTotal', 'is', null);

  if (revenueError) {
    console.error('Error fetching revenue data:', revenueError);
  }

  const totalRevenue = revenueOrders?.reduce((sum, order) => sum + (order.calculatedTotal || 0), 0) || 0;

  // Build where clause for filtering
  let whereClause: any = {};
  if (status) whereClause.status = status;
  if (customerId) whereClause.userId = customerId;

  // Get recent orders with user information
  let ordersQuery = supabaseAdmin
    .from('orders')
    .select(`
      id,
      productName,
      status,
      totalUnits,
      calculatedTotal,
      createdAt,
      updatedAt,
      trackingNumber,
      deliveryDate,
      priceTier,
      specialInstructions,
      user:users!orders_userId_fkey(
        id,
        name,
        email,
        customerRole,
        accessRole
      )
    `)
    .order('createdAt', { ascending: false })
    .limit(limit);

  if (status) {
    ordersQuery = ordersQuery.eq('status', status);
  }
  if (customerId) {
    ordersQuery = ordersQuery.eq('userId', customerId);
  }

  const { data: recentOrders, error: ordersError } = await ordersQuery;

  if (ordersError) {
    console.error('Error fetching recent orders:', ordersError);
  }

  // Get recent order activity (last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { count: recentActivity, error: activityError } = await supabaseAdmin
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .gte('createdAt', sevenDaysAgo.toISOString());

  if (activityError) {
    console.error('Error fetching recent activity:', activityError);
  }

  // Get average order value
  const { data: avgOrderData, error: avgError } = await supabaseAdmin
    .from('orders')
    .select('calculatedTotal')
    .not('calculatedTotal', 'is', null)
    .neq('status', 'CANCELLED');

  if (avgError) {
    console.error('Error fetching average order value:', avgError);
  }

  const averageOrderValue = avgOrderData?.length > 0 
    ? avgOrderData.reduce((sum, order) => sum + (order.calculatedTotal || 0), 0) / avgOrderData.length 
    : 0;

  return NextResponse.json({
   totalOrders: totalOrders || 0,
   recentOrders: recentOrders || [],
   ordersByStatus: statusData || {},
   totalRevenue,
   recentActivity: recentActivity || 0,
   averageOrderValue,
   analytics: {
    ordersThisWeek: recentActivity || 0,
    totalRevenue,
    averageOrderValue
   }
  });

 } catch (error) {
  console.error('Internal API Error - Admin Orders:', error);
  return NextResponse.json(
   { error: 'Failed to retrieve admin order data' },
   { status: 500 }
  );
 }
}