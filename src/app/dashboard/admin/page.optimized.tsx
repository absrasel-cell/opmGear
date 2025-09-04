'use client';

import React, { useState, useMemo } from 'react';
import { useAuth } from '@/components/auth/AuthContext';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import {
 Wallet,
 Package,
 UserPlus,
 FileText,
 Sparkles,
 TrendingUp,
 Stamp,
 Crown,
 Shield,
 Clock,
 RefreshCw,
 Truck,
 CheckCircle,
 AlertCircle,
 ChevronDown,
 ChevronUp,
 DollarSign,
 User,
 Mail,
 Phone,
 Building,
 BarChart3,
 ShoppingBag
} from 'lucide-react';

// Import optimized components
import {
 DashboardShell,
 DashboardContent,
 GlassCard,
 StatCard,
 Button,
 Table,
 TableHeader,
 TableBody,
 TableRow,
 TableCell,
 TableHeaderCell,
 StatusBadge
} from '@/components/ui/dashboard';
import Sidebar from '@/components/ui/dashboard/Sidebar';
import DashboardHeader from '@/components/ui/dashboard/DashboardHeader';
import {
 OptimizedRevenueChart,
 OptimizedOrderStatusChart,
 OptimizedUsersChart,
 ChartsGrid
} from '@/components/ui/dashboard/OptimizedCharts';
import { 
 MarqueeActivityFeed
} from '@/components/ui/dashboard/ActivityFeed';
import OrderLogoIndicator from '@/components/admin/OrderLogoIndicator';
import { queryKeys } from '@/lib/react-query';

// Types for optimized data
interface DashboardMetrics {
 totalRevenue: number;
 monthlyRevenue: number[];
 revenueGrowth: number;
 totalOrders: number;
 pendingOrders: number;
 confirmedOrders: number;
 processingOrders: number;
 shippedOrders: number;
 deliveredOrders: number;
 cancelledOrders: number;
 totalUsers: number;
 newUsersThisMonth: number;
 totalQuotes: number;
 pendingQuotes: number;
 approvedQuotes: number;
 declinedQuotes: number;
 totalShipments: number;
 averageUtilization: number;
 potentialSavings: number;
 lastCalculated: string;
 calculationTime: number;
}

// Fetch dashboard metrics
const fetchDashboardMetrics = async (refresh = false): Promise<{
 metrics: DashboardMetrics;
 recentOrders: any[];
 recentUsers: any[];
 performance: {
  calculationTime: number;
  totalResponseTime: number;
  cached: boolean;
 };
}> => {
 const params = new URLSearchParams();
 if (refresh) params.set('refresh', 'true');
 
 const response = await fetch(`/api/admin/dashboard/metrics?${params}`, {
  credentials: 'include'
 });
 
 if (!response.ok) {
  throw new Error(`Failed to fetch dashboard metrics: ${response.status}`);
 }
 
 const data = await response.json();
 if (!data.success) {
  throw new Error('Dashboard metrics API returned error');
 }
 
 return data;
};

export default function OptimizedAdminDashboard() {
 const { user, loading, isAuthenticated } = useAuth();
 const router = useRouter();
 
 // State
 const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
 const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
 
 // Dashboard metrics query with optimized caching
 const {
  data: dashboardData,
  isLoading,
  isError,
  error,
  isFetching,
  refetch
 } = useQuery({
  queryKey: ['dashboard', 'metrics'],
  queryFn: () => fetchDashboardMetrics(),
  enabled: isAuthenticated && !!user,
  staleTime: 2 * 60 * 1000, // 2 minutes
  refetchInterval: 5 * 60 * 1000, // Auto-refresh every 5 minutes
  refetchOnWindowFocus: true,
  retry: 2,
 });

 // Memoized data extraction
 const metrics = useMemo(() => dashboardData?.metrics, [dashboardData]);
 const recentOrders = useMemo(() => dashboardData?.recentOrders || [], [dashboardData]);
 const recentUsers = useMemo(() => dashboardData?.recentUsers || [], [dashboardData]);
 const performance = useMemo(() => dashboardData?.performance, [dashboardData]);

 // Optimized refresh function
 const handleRefresh = () => {
  refetch();
 };

 // Format currency
 const formatPrice = (price: number) => {
  return new Intl.NumberFormat('en-US', {
   style: 'currency',
   currency: 'USD',
   minimumFractionDigits: 0,
   maximumFractionDigits: 0,
  }).format(price);
 };

 // Check admin access
 const isMasterAdmin = user?.email === 'absrasel@gmail.com' || user?.email === 'vic@onpointmarketing.com';
 
 if (loading || !isAuthenticated) {
  return (
   <DashboardShell>
    <div className="flex items-center justify-center min-h-screen">
     <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-lime-400 mx-auto"></div>
      <p className="mt-4 text-slate-300">Loading Admin Dashboard...</p>
     </div>
    </div>
   </DashboardShell>
  );
 }

 if (!user || (user.accessRole !== 'SUPER_ADMIN' && user.accessRole !== 'STAFF' && !isMasterAdmin)) {
  return (
   <DashboardShell>
    <div className="flex items-center justify-center min-h-screen">
     <div className="text-center">
      <div className="text-red-400 text-6xl mb-4">🚫</div>
      <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
      <p className="text-slate-300 mb-4">You need admin privileges to access this page.</p>
      <Link href="/dashboard/member">
       <Button variant="primary">Go to Member Dashboard</Button>
      </Link>
     </div>
    </div>
   </DashboardShell>
  );
 }

 return (
  <DashboardShell>
   <div className="flex">
    {/* Sidebar */}
    <Sidebar 
     collapsed={sidebarCollapsed}
     onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
    />

    {/* Main Content */}
    <DashboardContent>
     {/* Header */}
     <DashboardHeader
      title={`Welcome back, ${user.name?.split(' ')[0]}`}
      subtitle={
       performance ? 
       `Dashboard loaded in ${performance.totalResponseTime}ms ${performance.cached ? '(cached)' : '(fresh)'}`
       : "Here's what's happening across CustomCap today."
      }
      onSearch={(query) => console.log('Search:', query)}
      sticky={false}
      primaryActionText=""
      showNewQuote={false}
      showProfile={false}
     />

     <div>
      {/* Error Display */}
      {isError && (
       <section className="px-6 md:px-10 mt-4">
        <GlassCard className="p-4 border-red-400/20 bg-red-400/5">
         <div className="flex items-center gap-3">
          <div className="text-red-400">⚠️</div>
          <div>
           <div className="text-red-200 font-medium">Error Loading Dashboard</div>
           <div className="text-red-300 text-sm">{error?.message}</div>
          </div>
          <Button 
           variant="ghost" 
           className="ml-auto text-red-300 hover:text-red-200"
           onClick={handleRefresh}
          >
           Retry
          </Button>
         </div>
        </GlassCard>
       </section>
      )}

      {/* Loading State */}
      {isLoading && (
       <section className="px-6 md:px-10">
        <GlassCard className="p-4">
         <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-lime-400"></div>
          <div className="text-slate-300">Loading dashboard data...</div>
         </div>
        </GlassCard>
       </section>
      )}

      {/* Activity Marquee */}
      <section className="px-6 md:px-10">
       <MarqueeActivityFeed />
      </section>

      {/* Stats Cards - Optimized with cached data */}
      <section className="px-6 md:px-10 mt-4">
       <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        {/* Revenue */}
        <GlassCard className="p-5 hover:-translate-y-0.5 transition will-change-transform cursor-pointer" onClick={handleRefresh}>
         <div className="flex items-start justify-between">
          <div>
           <div className="inline-flex items-center gap-2 text-slate-300 text-sm">
            <Wallet className="w-4.5 h-4.5 text-lime-400" />
            Revenue
           </div>
           <div className="mt-2 text-3xl font-extrabold tracking-tight text-white">
            {formatPrice(metrics?.totalRevenue || 0)}
           </div>
           <div className="mt-1 text-xs text-slate-400">
            {metrics?.revenueGrowth ? (
             <span className={metrics.revenueGrowth >= 0 ? 'text-green-400' : 'text-red-400'}>
              {metrics.revenueGrowth >= 0 ? '↗' : '↘'} {Math.abs(metrics.revenueGrowth).toFixed(1)}% vs last month
             </span>
            ) : (
             `${metrics?.totalOrders || 0} orders`
            )}
           </div>
          </div>
          <span className="h-10 w-10 rounded-xl grid place-items-center bg-lime-400/15 border border-lime-400/20 text-lime-300 ring-1 ring-stone-700">
           <Sparkles className="w-5 h-5" />
          </span>
         </div>
        </GlassCard>

        {/* Orders */}
        <GlassCard className="p-5 hover:-translate-y-0.5 transition cursor-pointer" onClick={() => router.push('/dashboard/admin/orders')}>
         <div className="flex items-start justify-between">
          <div>
           <div className="inline-flex items-center gap-2 text-slate-300 text-sm">
            <Package className="w-4.5 h-4.5 text-orange-400" />
            Orders
           </div>
           <div className="mt-2 text-3xl font-extrabold tracking-tight text-white">
            {metrics?.totalOrders || 0}
           </div>
           <div className="mt-1 text-xs text-slate-400">
            P: {metrics?.pendingOrders || 0} • Pr: {metrics?.processingOrders || 0} • S: {metrics?.shippedOrders || 0}
           </div>
          </div>
          <span className="h-10 w-10 rounded-xl grid place-items-center bg-orange-400/15 border border-orange-500 text-orange-300 ring-1 ring-stone-700">
           <Package className="w-5 h-5" />
          </span>
         </div>
        </GlassCard>

        {/* Users */}
        <GlassCard className="p-5 hover:-translate-y-0.5 transition cursor-pointer" onClick={() => router.push('/dashboard/admin/users')}>
         <div className="flex items-start justify-between">
          <div>
           <div className="inline-flex items-center gap-2 text-slate-300 text-sm">
            <UserPlus className="w-4.5 h-4.5 text-cyan-300" />
            Users
           </div>
           <div className="mt-2 text-3xl font-extrabold tracking-tight text-white">
            {metrics?.totalUsers?.toLocaleString() || 0}
           </div>
           <div className="mt-1 text-xs text-slate-400">
            +{metrics?.newUsersThisMonth?.toLocaleString() || 0} this month
           </div>
          </div>
          <span className="h-10 w-10 rounded-xl grid place-items-center bg-cyan-400/15 border border-cyan-400/20 text-cyan-300 ring-1 ring-stone-700">
           <TrendingUp className="w-5 h-5" />
          </span>
         </div>
        </GlassCard>

        {/* Quotes */}
        <GlassCard className="p-5 hover:-translate-y-0.5 transition cursor-pointer" onClick={() => router.push('/dashboard/admin/quotes')}>
         <div className="flex items-start justify-between">
          <div>
           <div className="inline-flex items-center gap-2 text-slate-300 text-sm">
            <FileText className="w-4.5 h-4.5 text-purple-400" />
            Quotes
           </div>
           <div className="mt-2 text-3xl font-extrabold tracking-tight text-white">
            {metrics?.totalQuotes || 0}
           </div>
           <div className="mt-1 text-xs text-slate-400">
            {metrics?.pendingQuotes || 0} Pending • {metrics?.approvedQuotes || 0} Approved
           </div>
          </div>
          <span className="h-10 w-10 rounded-xl grid place-items-center bg-purple-900 border border-purple-500/20 text-purple-300 ring-1 ring-stone-700">
           <Stamp className="w-5 h-5" />
          </span>
         </div>
        </GlassCard>

        {/* Shipments */}
        <GlassCard className="p-5 hover:-translate-y-0.5 transition cursor-pointer" onClick={() => router.push('/dashboard/admin/shipments/analytics')}>
         <div className="flex items-start justify-between">
          <div>
           <div className="inline-flex items-center gap-2 text-slate-300 text-sm">
            <Truck className="w-4.5 h-4.5 text-blue-400" />
            Shipments
           </div>
           <div className="mt-2 text-3xl font-extrabold tracking-tight text-white">
            {metrics?.totalShipments || 0}
           </div>
           <div className="mt-1 text-xs text-slate-400">
            {metrics?.averageUtilization?.toFixed(1) || 0}% utilization • {formatPrice(metrics?.potentialSavings || 0)} savings
           </div>
          </div>
          <span className="h-10 w-10 rounded-xl grid place-items-center bg-blue-400/15 border border-blue-400/20 text-blue-300 ring-1 ring-stone-700">
           <BarChart3 className="w-5 h-5" />
          </span>
         </div>
        </GlassCard>
       </div>
      </section>

      {/* Optimized Charts */}
      <section className="px-6 md:px-10 mt-6">
       <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-white">Analytics Overview</h2>
        <div className="flex items-center gap-2">
         <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isFetching}
         >
          <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh
         </Button>
         {performance && (
          <div className="text-xs text-slate-400">
           {performance.cached ? '📦 Cached' : '🔄 Fresh'} • {performance.calculationTime}ms
          </div>
         )}
        </div>
       </div>
       <ChartsGrid>
        <OptimizedRevenueChart 
         title="Revenue Trends"
         subtitle="Last 12 months"
         monthlyRevenue={metrics?.monthlyRevenue || []}
         revenueGrowth={metrics?.revenueGrowth || 0}
        />
        <OptimizedOrderStatusChart 
         title="Order Status"
         pendingCount={metrics?.pendingOrders || 0}
         confirmedCount={metrics?.confirmedOrders || 0}
         processingCount={metrics?.processingOrders || 0}
         shippedCount={metrics?.shippedOrders || 0}
         deliveredCount={metrics?.deliveredOrders || 0}
         cancelledCount={metrics?.cancelledOrders || 0}
        />
       </ChartsGrid>
      </section>

      {/* Recent Orders - Optimized with cached data */}
      <section className="px-6 md:px-10 mt-6">
       <GlassCard className="overflow-hidden">
        <div className="p-5 flex items-center justify-between border-b border-stone-600">
         <div>
          <h2 className="text-2xl tracking-tight font-extrabold text-white">Recent Orders</h2>
          <p className="text-sm text-slate-400">Latest {recentOrders.length} orders</p>
         </div>
         <div className="flex items-center gap-2">
          <Link href="/dashboard/admin/orders">
           <Button variant="primary" className="px-3 py-1.5 text-xs">
            View All Orders
           </Button>
          </Link>
         </div>
        </div>
        
        {recentOrders.length > 0 ? (
         <Table>
          <TableHeader>
           <TableHeaderCell>Order</TableHeaderCell>
           <TableHeaderCell>Customer</TableHeaderCell>
           <TableHeaderCell>Status</TableHeaderCell>
           <TableHeaderCell align="right">Total</TableHeaderCell>
           <TableHeaderCell align="right">Date</TableHeaderCell>
          </TableHeader>
          <TableBody>
           {recentOrders.map((order: any) => (
            <TableRow key={order.id}>
             <TableCell className="font-medium text-white">
              {order.id.slice(-8)}
             </TableCell>
             <TableCell>{order.customerInfo?.name || 'Unknown'}</TableCell>
             <TableCell>
              <StatusBadge status={order.status} />
             </TableCell>
             <TableCell align="right">
              {order.calculatedTotal ? formatPrice(Number(order.calculatedTotal)) : '—'}
             </TableCell>
             <TableCell align="right" className="text-sm text-slate-400">
              {new Date(order.createdAt).toLocaleDateString()}
             </TableCell>
            </TableRow>
           ))}
          </TableBody>
         </Table>
        ) : (
         <div className="p-8 text-center">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">No recent orders</h3>
          <p className="text-gray-400">Orders will appear here when they are placed</p>
         </div>
        )}
       </GlassCard>
      </section>

      {/* Recent Users - Optimized */}
      <section className="px-6 md:px-10 mt-6">
       <GlassCard className="overflow-hidden">
        <div className="p-5 flex items-center justify-between border-b border-stone-600">
         <div>
          <h2 className="text-2xl tracking-tight font-extrabold text-white">Recent Users</h2>
          <p className="text-sm text-slate-400">Latest {recentUsers.length} registrations</p>
         </div>
         <div className="flex items-center gap-2">
          <Link href="/dashboard/admin/users">
           <Button variant="primary" className="px-3 py-1.5 text-xs">
            View All Users
           </Button>
          </Link>
         </div>
        </div>
        
        {recentUsers.length > 0 ? (
         <Table>
          <TableHeader>
           <TableHeaderCell>User</TableHeaderCell>
           <TableHeaderCell>Email</TableHeaderCell>
           <TableHeaderCell>Role</TableHeaderCell>
           <TableHeaderCell align="right">Joined</TableHeaderCell>
          </TableHeader>
          <TableBody>
           {recentUsers.map((userItem: any) => (
            <TableRow key={userItem.id}>
             <TableCell>
              <div className="flex items-center gap-3">
               <div className="w-8 h-8 rounded-full bg-gradient-to-br from-lime-400 to-cyan-400 flex items-center justify-center text-black font-semibold text-sm">
                {userItem.name?.charAt(0) || '?'}
               </div>
               <div>
                <div className="text-white font-medium">{userItem.name || 'Anonymous'}</div>
               </div>
              </div>
             </TableCell>
             <TableCell className="text-slate-300">{userItem.email}</TableCell>
             <TableCell>
              <StatusBadge status={userItem.accessRole?.toLowerCase() || 'customer'}>
               {userItem.accessRole || 'Customer'}
              </StatusBadge>
             </TableCell>
             <TableCell align="right" className="text-sm text-slate-400">
              {new Date(userItem.createdAt).toLocaleDateString()}
             </TableCell>
            </TableRow>
           ))}
          </TableBody>
         </Table>
        ) : (
         <div className="p-8 text-center">
          <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">No recent users</h3>
          <p className="text-gray-400">New user registrations will appear here</p>
         </div>
        )}
       </GlassCard>
      </section>

      {/* Performance Info */}
      {performance && process.env.NODE_ENV === 'development' && (
       <section className="px-6 md:px-10 mt-6">
        <GlassCard className="p-4">
         <div className="flex items-center justify-between text-sm">
          <div className="text-slate-400">
           Dashboard Performance:
          </div>
          <div className="flex items-center gap-4 text-xs">
           <span className={performance.cached ? 'text-green-400' : 'text-orange-400'}>
            {performance.cached ? '📦 Cached Response' : '🔄 Fresh Data'}
           </span>
           <span className="text-slate-400">
            Calculation: {performance.calculationTime}ms
           </span>
           <span className="text-slate-400">
            Total: {performance.totalResponseTime}ms
           </span>
          </div>
         </div>
        </GlassCard>
       </section>
      )}
     </div>

     {/* Footer */}
     <footer className="px-6 md:px-10 mt-8 pb-6">
      <GlassCard className="p-5 text-center">
       <div className="text-slate-400 text-sm">
        🚀 Optimized Admin Dashboard • Powered by React Query & Smart Caching
       </div>
      </GlassCard>
     </footer>
    </DashboardContent>
   </div>
  </DashboardShell>
 );
}