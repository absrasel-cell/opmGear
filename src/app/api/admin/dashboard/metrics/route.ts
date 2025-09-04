import { NextRequest, NextResponse } from 'next/server';
import { getDashboardMetrics, getRecentOrdersForDashboard, getRecentUsersForDashboard } from '@/lib/dashboard-metrics';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

async function getCurrentUser(request: NextRequest) {
 try {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('sb-access-token')?.value;

  if (!accessToken) return null;

  const supabase = createClient(
   process.env.NEXT_PUBLIC_SUPABASE_URL!,
   process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
   {
    global: {
     headers: {
      Authorization: `Bearer ${accessToken}`,
     },
    },
   }
  );

  const { data: { user } } = await supabase.auth.getUser();
  return user;
 } catch (error) {
  return null;
 }
}

export async function GET(request: NextRequest) {
 try {
  // Check authentication and admin access
  const user = await getCurrentUser(request);
  if (!user) {
   return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  // Check if user has admin privileges
  const isMasterAdmin = user.email === 'absrasel@gmail.com' || user.email === 'vic@onpointmarketing.com';
  if (!user.user_metadata?.accessRole && !isMasterAdmin) {
   return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const userRole = user.user_metadata?.accessRole;
  if (!['SUPER_ADMIN', 'STAFF'].includes(userRole) && !isMasterAdmin) {
   return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const forceRefresh = searchParams.get('refresh') === 'true';
  const includeRecent = searchParams.get('includeRecent') !== 'false';

  const startTime = Date.now();

  // Get optimized metrics
  const metrics = await getDashboardMetrics(forceRefresh);
  
  const response: any = {
   success: true,
   metrics,
   performance: {
    calculationTime: metrics.calculationTime,
    totalResponseTime: Date.now() - startTime,
    cached: !forceRefresh && metrics.calculationTime < 50 // Assume cached if very fast
   }
  };

  // Include recent data if requested
  if (includeRecent) {
   const [recentOrders, recentUsers] = await Promise.all([
    getRecentOrdersForDashboard(5),
    getRecentUsersForDashboard(5)
   ]);
   
   response.recentOrders = recentOrders;
   response.recentUsers = recentUsers;
   response.performance.totalResponseTime = Date.now() - startTime;
  }

  return NextResponse.json(response);

 } catch (error) {
  console.error('Dashboard metrics API error:', error);
  return NextResponse.json(
   { error: 'Failed to fetch dashboard metrics' },
   { status: 500 }
  );
 }
}