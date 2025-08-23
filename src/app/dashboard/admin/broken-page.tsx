'use client';

import { useAuth } from '@/components/auth/AuthContext';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ProductManagement } from './ProductManagement';
import PageBuilder from './PageBuilder';

// Import our new design system components
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
  RevenueChart,
  OrderStatusChart,
  UsersChart,
  ChartsGrid
} from '@/components/ui/dashboard/Charts';
import { 
  MarqueeActivityFeed
} from '@/components/ui/dashboard/ActivityFeed';
import {
  OrderDetailsModal,
  ProductModal,
  TrackingDrawer,
  RoleDropdown
} from '@/components/ui/dashboard/Interactive';

import {
  Wallet,
  Package,
  UserPlus,
  FileText,
  Sparkles,
  TrendingUp,
  Stamp
} from 'lucide-react';

interface Order {
  id: string;
  productName: string;
  status: string;
  orderSource: 'PRODUCT_CUSTOMIZATION' | 'REORDER' | 'QUOTE_CONVERSION';
  isDraft?: boolean;
  createdAt: string;
  updatedAt: string;
  customerInfo: {
    name: string;
    email: string;
    phone?: string;
    company?: string;
  };
  orderTotal?: number;
  itemTotal?: number;
  userId?: string;
  userEmail?: string;
  orderType: 'AUTHENTICATED' | 'GUEST';
  selectedColors: Record<string, any>;
  paymentProcessed?: boolean;
  trackingNumber?: string;
}

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
}

interface QuoteRequest {
  id: string;
  productName: string;
  customerInfo: {
    name: string;
    email: string;
    company: string;
  };
  createdAt: string;
  status: string;
}

type ViewType = 'overview' | 'orders' | 'users' | 'quotes' | 'products' | 'pages';
type OrderFilter = 'all' | 'saved' | 'checkout' | 'pending' | 'processing' | 'shipped' | 'delivered' | 'draft';



export default function AdminDashboardPage() {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const router = useRouter();
  const [currentView, setCurrentView] = useState<ViewType>('overview');
  const [orderFilter, setOrderFilter] = useState<OrderFilter>('all');
  const [orders, setOrders] = useState<Order[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [quoteRequests, setQuoteRequests] = useState<QuoteRequest[]>([]);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<string | null>(null);
  const [trackingNumbers, setTrackingNumbers] = useState<Record<string, string>>({});
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [trackingDrawerOpen, setTrackingDrawerOpen] = useState(false);
  
  const [stats, setStats] = useState({
    totalOrders: 0,
    savedOrders: 0,
    checkoutOrders: 0,
    draftOrders: 0,
    pendingOrders: 0,
    processingOrders: 0,
    shippedOrders: 0,
    deliveredOrders: 0,
    totalUsers: 0,
    totalQuotes: 0,
    totalRevenue: 0
  });

  // Check admin access
  useEffect(() => {
    console.log('=== ADMIN DASHBOARD DEBUG ===');
    console.log('Loading:', loading);
    console.log('IsAuthenticated:', isAuthenticated);
    console.log('User object:', user);
    console.log('User role:', user?.role);
    console.log('User email:', user?.email);
    console.log('Is master admin check:', user?.email === 'absrasel@gmail.com');
    
    if (loading) return;
    
    if (!isAuthenticated || !user) {
      console.log('❌ Not authenticated, redirecting to login');
      router.push('/login');
      return;
    }
    
    // Special check for master admin
    const isMasterAdmin = user.email === 'absrasel@gmail.com';
    console.log('🔍 Master admin check result:', isMasterAdmin);
    console.log('🔍 Regular admin check:', user.role === 'ADMIN');
    
    if (user.role !== 'ADMIN' && !isMasterAdmin) {
      console.log('❌ Not admin, redirecting to member dashboard');
      router.push('/dashboard/member');
      return;
    }
    
    console.log('✅ Admin access granted, fetching data');
    fetchAdminData();
  }, [user, loading, isAuthenticated, router]);

  const fetchAdminData = async () => {
    try {
      // Fetch all orders (admin can see all orders)
      const ordersResponse = await fetch('/api/orders');
      if (ordersResponse.ok) {
        const ordersData = await ordersResponse.json();
        const allOrders = ordersData.orders || [];
        setOrders(allOrders);
        
        // Initialize tracking numbers state
        const trackingNumbersMap: Record<string, string> = {};
        allOrders.forEach((order: Order) => {
          if (order.trackingNumber) {
            trackingNumbersMap[order.id] = order.trackingNumber;
          }
        });
        setTrackingNumbers(trackingNumbersMap);
        
        // Calculate comprehensive stats
        const totalOrders = allOrders.length;
        const savedOrders = allOrders.filter((order: Order) => order.orderSource === 'PRODUCT_CUSTOMIZATION').length;
        const checkoutOrders = allOrders.filter((order: Order) => order.orderSource === 'REORDER' && !order.isDraft).length;
        const draftOrders = allOrders.filter((order: Order) => order.isDraft === true).length;
        const pendingOrders = allOrders.filter((order: Order) => order.status === 'PENDING').length;
        const processingOrders = allOrders.filter((order: Order) => order.status === 'PROCESSING').length;
        const shippedOrders = allOrders.filter((order: Order) => order.status === 'SHIPPED').length;
        const deliveredOrders = allOrders.filter((order: Order) => order.status === 'DELIVERED').length;
        
        const totalRevenue = allOrders
          .filter((order: Order) => order.paymentProcessed && order.orderTotal)
          .reduce((sum: number, order: Order) => sum + (order.orderTotal || 0), 0);
        
        setStats(prev => ({
          ...prev,
          totalOrders,
          savedOrders,
          checkoutOrders,
          draftOrders,
          pendingOrders,
          processingOrders,
          shippedOrders,
          deliveredOrders,
          totalRevenue
        }));
      }

      // Fetch all quote requests
      const quotesResponse = await fetch('/api/quote-requests');
      if (quotesResponse.ok) {
        const quotesData = await quotesResponse.json();
        const allQuotes = quotesData.quoteRequests || [];
        setQuoteRequests(allQuotes);
        setStats(prev => ({ ...prev, totalQuotes: allQuotes.length }));
      }

      // Fetch users (admin only)
      const usersResponse = await fetch('/api/users');
      if (usersResponse.ok) {
        const usersData = await usersResponse.json();
        const allUsers = usersData.users || [];
        setUsers(allUsers);
        setStats(prev => ({ ...prev, totalUsers: allUsers.length }));
      }
    } catch (error) {
      console.error('Error fetching admin data:', error);
    }
  };

  const getFilteredOrders = () => {
    switch (orderFilter) {
      case 'saved':
        return orders.filter(order => order.orderSource === 'PRODUCT_CUSTOMIZATION');
      case 'checkout':
        return orders.filter(order => order.orderSource === 'REORDER' && !order.isDraft);
      case 'draft':
        return orders.filter(order => order.isDraft === true);
      case 'pending':
        return orders.filter(order => order.status === 'PENDING');
      case 'processing':
        return orders.filter(order => order.status === 'PROCESSING');
      case 'shipped':
        return orders.filter(order => order.status === 'SHIPPED');
      case 'delivered':
        return orders.filter(order => order.status === 'DELIVERED');
      default:
        return orders;
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    setIsUpdatingStatus(orderId);
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        // Update local state
        setOrders(prev => prev.map(order => 
          order.id === orderId 
            ? { ...order, status: newStatus, updatedAt: new Date().toISOString() }
            : order
        ));
        // Refresh stats
        fetchAdminData();
      } else {
        alert('Failed to update order status');
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      alert('Error updating order status');
    } finally {
      setIsUpdatingStatus(null);
    }
  };

  const updateOrderTracking = async (orderId: string, trackingNumber: string) => {
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackingNumber }),
      });

      if (response.ok) {
        // Update local state
        setOrders(prev => prev.map(order => 
          order.id === orderId 
            ? { ...order, trackingNumber, updatedAt: new Date().toISOString() }
            : order
        ));
      } else {
        alert('Failed to update tracking number');
      }
    } catch (error) {
      console.error('Error updating tracking number:', error);
      alert('Error updating tracking number');
    }
  };

  // Debounced function to save tracking number
  const debouncedSaveTracking = (() => {
    let timeoutId: NodeJS.Timeout;
    return (orderId: string, trackingNumber: string) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        updateOrderTracking(orderId, trackingNumber);
      }, 1000); // Save after 1 second of no typing
    };
  })();

  const handleTrackingNumberChange = (orderId: string, value: string) => {
    // Update local state immediately for responsive UI
    setTrackingNumbers(prev => ({ ...prev, [orderId]: value }));
    // Debounce the save to database
    debouncedSaveTracking(orderId, value);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DELIVERED':
        return 'bg-green-500/20 text-green-400 border border-green-500/30';
      case 'SHIPPED':
        return 'bg-blue-500/20 text-blue-400 border border-blue-500/30';
      case 'CONFIRMED':
        return 'bg-purple-500/20 text-purple-400 border border-purple-500/30';
      case 'PROCESSING':
        return 'bg-orange-500/20 text-orange-400 border border-orange-500/30';
      case 'PENDING':
        return 'bg-slate-500/20 text-slate-400 border border-slate-500/30';
      case 'CANCELLED':
        return 'bg-red-500/20 text-red-400 border border-red-500/30';
      default:
        return 'bg-slate-500/20 text-slate-400 border border-slate-500/30';
    }
  };

  const generateTrackingNumber = (orderId: string): string => {
    const hash = orderId.slice(-8).toUpperCase();
    return `CC${hash}`;
  };

  if (loading) {
    return (
      <div className="relative min-h-[calc(100vh-140px)] overflow-x-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-[linear-gradient(180deg,#000,rgba(5,7,14,1)_40%,#000)]" />
          <div className="absolute inset-x-0 top-0 h-[40vh] bg-[radial-gradient(60%_30%_at_50%_0%,rgba(255,255,255,0.06),transparent)]" />
        </div>
        <div className="flex items-center justify-center min-h-[calc(100vh-140px)] mt-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-lime-400 mx-auto"></div>
            <p className="mt-4 text-slate-300">Loading Admin Dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  const isMasterAdmin = user?.email === 'absrasel@gmail.com';
  
  if (!isAuthenticated || !user || (user.role !== 'ADMIN' && !isMasterAdmin)) {
    return (
      <div className="relative min-h-[calc(100vh-140px)] overflow-x-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-[linear-gradient(180deg,#000,rgba(5,7,14,1)_40%,#000)]" />
          <div className="absolute inset-x-0 top-0 h-[40vh] bg-[radial-gradient(60%_30%_at_50%_0%,rgba(255,255,255,0.06),transparent)]" />
        </div>
        <div className="flex items-center justify-center min-h-[calc(100vh-140px)] mt-8">
          <div className="text-center">
            <div className="text-red-400 text-6xl mb-4">🚫</div>
            <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
            <p className="text-slate-300 mb-4">You need admin privileges to access this page.</p>
            <Link
              href="/dashboard/member"
              className="inline-flex items-center px-4 py-2 bg-lime-400 text-black font-medium rounded-lg hover:bg-lime-300 transition-all duration-300 shadow-[0_0_30px_rgba(163,230,53,0.25)]"
            >
              Go to Member Dashboard
            </Link>
          </div>
        </div>
      </div>
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
            subtitle={isMasterAdmin ? '👑 Master Administrator - Full System Access' : 'System administration and management'}
            onSearch={(query) => console.log('Search:', query)}
          />

          {/* Activity Marquee */}
          <section className="px-6 md:px-10 mt-4">
            <MarqueeActivityFeed />
          </section>

          {/* Navigation Tabs */}
          <section className="px-6 md:px-10 mt-4">
            <div className="border-b border-white/10">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setCurrentView('overview')}
                  className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                    currentView === 'overview'
                      ? 'border-lime-400 text-lime-400'
                      : 'border-transparent text-slate-400 hover:text-white hover:border-white/30'
                  }`}
                >
                  Overview
                </button>
                <button
                  onClick={() => setCurrentView('orders')}
                  className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                    currentView === 'orders'
                      ? 'border-lime-400 text-lime-400'
                      : 'border-transparent text-slate-400 hover:text-white hover:border-white/30'
                  }`}
                >
                  Orders ({stats.totalOrders})
                </button>
                <button
                  onClick={() => setCurrentView('users')}
                  className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                    currentView === 'users'
                      ? 'border-lime-400 text-lime-400'
                      : 'border-transparent text-slate-400 hover:text-white hover:border-white/30'
                  }`}
                >
                  Users ({stats.totalUsers})
                </button>
                <button
                  onClick={() => setCurrentView('quotes')}
                  className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                    currentView === 'quotes'
                      ? 'border-lime-400 text-lime-400'
                      : 'border-transparent text-slate-400 hover:text-white hover:border-white/30'
                  }`}
                >
                  Quote Requests ({stats.totalQuotes})
                </button>
                <button
                  onClick={() => setCurrentView('products')}
                  className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                    currentView === 'products'
                      ? 'border-lime-400 text-lime-400'
                      : 'border-transparent text-slate-400 hover:text-white hover:border-white/30'
                  }`}
                >
                  Products
                </button>
                <button
                  onClick={() => setCurrentView('pages')}
                  className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                    currentView === 'pages'
                      ? 'border-lime-400 text-lime-400'
                      : 'border-transparent text-slate-400 hover:text-white hover:border-white/30'
                  }`}
                >
                  Page Builder
                </button>
              </nav>
            </div>
          </section>

          {/* Overview Tab */}
          {currentView === 'overview' && (
            <div className="mt-8">
              {/* Stats Cards */}
              <section className="px-6 md:px-10 mt-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                  {/* Revenue */}
                  <GlassCard className="p-5 hover:-translate-y-0.5 transition will-change-transform">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="inline-flex items-center gap-2 text-slate-300 text-sm">
                          <Wallet className="w-4.5 h-4.5 text-lime-400" />
                          Revenue
                        </div>
                        <div className="mt-2 text-3xl font-extrabold tracking-tight text-white">
                          {formatPrice(stats.totalRevenue)}
                        </div>
                        <div className="mt-1 text-xs text-slate-400">+12.4% vs last 30 days</div>
                      </div>
                      <span className="h-10 w-10 rounded-xl grid place-items-center bg-lime-400/15 border border-lime-400/20 text-lime-300 ring-1 ring-white/5 animate-pulse">
                        <Sparkles className="w-5 h-5" />
                      </span>
                    </div>
                  </GlassCard>

                  {/* Orders */}
                  <GlassCard className="p-5 hover:-translate-y-0.5 transition cursor-pointer" onClick={() => setCurrentView('orders')}>
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="inline-flex items-center gap-2 text-slate-300 text-sm">
                          <Package className="w-4.5 h-4.5 text-orange-400" />
                          Orders
                        </div>
                        <div className="mt-2 text-3xl font-extrabold tracking-tight text-white">
                          {stats.totalOrders}
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          <span className="text-xs text-slate-400">Pending {stats.pendingOrders}</span>
                          <span className="text-xs text-slate-400">Processing {stats.processingOrders}</span>
                          <span className="text-xs text-slate-400">Delivered {stats.deliveredOrders}</span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs hover:bg-orange-400/10"
                      >
                        Status: All
                      </Button>
                    </div>
                  </GlassCard>

                  {/* Users */}
                  <GlassCard className="p-5 hover:-translate-y-0.5 transition cursor-pointer" onClick={() => setCurrentView('users')}>
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="inline-flex items-center gap-2 text-slate-300 text-sm">
                          <UserPlus className="w-4.5 h-4.5 text-cyan-300" />
                          Users
                        </div>
                        <div className="mt-2 text-3xl font-extrabold tracking-tight text-white">
                          {stats.totalUsers.toLocaleString()}
                        </div>
                        <div className="mt-1 text-xs text-slate-400">
                          +1,042 this month
                        </div>
                      </div>
                      <span className="h-10 w-10 rounded-xl grid place-items-center bg-cyan-400/15 border border-cyan-400/20 text-cyan-300 ring-1 ring-white/5">
                        <TrendingUp className="w-5 h-5" />
                      </span>
                    </div>
                  </GlassCard>

                  {/* Quotes */}
                  <GlassCard className="p-5 hover:-translate-y-0.5 transition cursor-pointer" onClick={() => setCurrentView('quotes')}>
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="inline-flex items-center gap-2 text-slate-300 text-sm">
                          <FileText className="w-4.5 h-4.5 text-purple-400" />
                          Quotes
                        </div>
                        <div className="mt-2 text-3xl font-extrabold tracking-tight text-white">
                          {stats.totalQuotes}
                        </div>
                        <div className="mt-1 text-xs text-slate-400">
                          20 Pending • 64 Approved • 42 Declined
                        </div>
                      </div>
                      <span className="h-10 w-10 rounded-xl grid place-items-center bg-purple-500/15 border border-purple-500/20 text-purple-300 ring-1 ring-white/5">
                        <Stamp className="w-5 h-5" />
                      </span>
                    </div>
                  </GlassCard>
                </div>
              </section>

              {/* Charts */}
              <section className="px-6 md:px-10 mt-6">
                <ChartsGrid>
                  <RevenueChart />
                  <OrderStatusChart 
                    pendingCount={stats.pendingOrders}
                    processingCount={stats.processingOrders}
                    deliveredCount={stats.deliveredOrders}
                  />
                  <UsersChart />
                </ChartsGrid>
              </section>

              {/* Detailed Stats */}
              <section className="px-6 md:px-10 mt-6">
            <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <div className="border border-white/10 bg-white/5 backdrop-blur-xl ring-1 ring-white/5 overflow-hidden rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-white">Order Breakdown</h3>
                  <div className="mt-3 space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-400">Saved Orders:</span>
                      <span className="text-sm font-medium text-white">{stats.savedOrders}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-400">Checkout Orders:</span>
                      <span className="text-sm font-medium text-white">{stats.checkoutOrders}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-400">Draft Orders:</span>
                      <span className="text-sm font-medium text-white">{stats.draftOrders}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border border-white/10 bg-white/5 backdrop-blur-xl ring-1 ring-white/5 overflow-hidden rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-white">Order Status</h3>
                  <div className="mt-3 space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-400">Pending:</span>
                      <span className="text-sm font-medium text-white">{stats.pendingOrders}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-400">Processing:</span>
                      <span className="text-sm font-medium text-white">{stats.processingOrders}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-400">Shipped:</span>
                      <span className="text-sm font-medium text-white">{stats.shippedOrders}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-400">Delivered:</span>
                      <span className="text-sm font-medium text-white">{stats.deliveredOrders}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border border-white/10 bg-white/5 backdrop-blur-xl ring-1 ring-white/5 overflow-hidden rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-white">Recent Activity</h3>
                  <div className="mt-3">
                    <p className="text-sm text-slate-400">Last 24 hours:</p>
                    <ul className="mt-2 space-y-1">
                      <li className="text-sm text-white">• {orders.filter(o => new Date(o.createdAt) > new Date(Date.now() - 24*60*60*1000)).length} new orders</li>
                      <li className="text-sm text-white">• {users.filter(u => new Date(u.createdAt) > new Date(Date.now() - 24*60*60*1000)).length} new users</li>
                      <li className="text-sm text-white">• {quoteRequests.filter(q => new Date(q.createdAt) > new Date(Date.now() - 24*60*60*1000)).length} new quotes</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="border border-white/10 bg-white/5 backdrop-blur-xl ring-1 ring-white/5 overflow-hidden rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-white">Quick Actions</h3>
                  <div className="mt-3 space-y-3">
                    <button 
                      onClick={() => setCurrentView('orders')}
                      className="w-full text-left text-sm text-lime-400 hover:text-lime-300"
                    >
                      → Manage Orders
                    </button>
                    <button 
                      onClick={() => setCurrentView('users')}
                      className="w-full text-left text-sm text-lime-400 hover:text-lime-300"
                    >
                      → View Users
                    </button>
                    <button 
                      onClick={() => setCurrentView('quotes')}
                      className="w-full text-left text-sm text-lime-400 hover:text-lime-300"
                    >
                      → Review Quotes
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

        {/* Orders Tab */}
        {currentView === 'orders' && (
          <div className="mt-8 px-4 sm:px-0">
            {/* Order Filters */}
            <div className="mb-6">
              <div className="flex flex-wrap gap-2">
                {['all', 'saved', 'checkout', 'draft', 'pending', 'processing', 'shipped', 'delivered'].map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setOrderFilter(filter as OrderFilter)}
                    className={`px-3 py-2 rounded-md text-sm font-medium ${
                      orderFilter === filter
                        ? 'bg-lime-400/20 text-lime-400 border border-lime-400/30'
                        : 'border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    {filter.charAt(0).toUpperCase() + filter.slice(1)} ({
                      filter === 'all' ? orders.length :
                      filter === 'saved' ? stats.savedOrders :
                      filter === 'checkout' ? stats.checkoutOrders :
                      filter === 'draft' ? stats.draftOrders :
                      filter === 'pending' ? stats.pendingOrders :
                      filter === 'processing' ? stats.processingOrders :
                      filter === 'shipped' ? stats.shippedOrders :
                      filter === 'delivered' ? stats.deliveredOrders : 0
                    })
                  </button>
                ))}
              </div>
            </div>

            {/* Orders List */}
            <div className="border border-white/10 bg-white/5 backdrop-blur-xl ring-1 ring-white/5 shadow rounded-lg">
              {getFilteredOrders().length > 0 ? (
                <div className="overflow-hidden">
                  <ul className="divide-y divide-white/10">
                    {getFilteredOrders().map((order) => (
                      <li key={order.id} className="px-4 py-4 sm:px-6">
                        <div className="cursor-pointer" onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <div className="flex-shrink-0">
                                <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                                  order.orderSource === 'PRODUCT_CUSTOMIZATION' ? 'bg-green-100' : 
                                  order.isDraft ? 'bg-orange-100' : 'bg-purple-100'
                                }`}>
                                  <svg className={`h-6 w-6 ${
                                    order.orderSource === 'PRODUCT_CUSTOMIZATION' ? 'text-green-600' : 
                                    order.isDraft ? 'text-orange-600' : 'text-purple-600'
                                  }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                                  </svg>
                                </div>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-white">{order.productName}</div>
                                <div className="text-sm text-slate-400">
                                  Order ID: {order.id.slice(-8)} • {order.customerInfo.name} • {new Date(order.createdAt).toLocaleDateString()}
                                </div>
                                <div className="text-sm text-slate-400">
                                  {order.orderSource === 'PRODUCT_CUSTOMIZATION' ? 'Saved Order' : 
                                   order.isDraft ? 'Draft Order' : 'Checkout Order'} • 
                                  {order.orderType} • {order.orderTotal && formatPrice(order.orderTotal)}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                                {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                              </span>
                              <svg className={`h-5 w-5 text-gray-400 transform transition-transform ${
                                expandedOrder === order.id ? 'rotate-180' : ''
                              }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </div>
                          </div>
                        </div>
                        
                        {/* Expanded Order Details - Admin View */}
                        {expandedOrder === order.id && (
                          <div className="mt-4 pt-4 border-t border-white/10">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                              {/* Order Information */}
                              <div className="border border-white/10 bg-white/5 rounded-lg p-4">
                                <h4 className="text-sm font-medium text-white mb-3">Order Information</h4>
                                <dl className="space-y-2">
                                  <div>
                                    <dt className="text-xs text-slate-400">Order ID</dt>
                                    <dd className="text-sm text-white font-mono">{order.id}</dd>
                                  </div>
                                  <div>
                                    <dt className="text-xs text-slate-400">Order Source</dt>
                                    <dd className="text-sm text-white">
                                      {order.orderSource === 'PRODUCT_CUSTOMIZATION' ? 'Product Customization' : 'Cart Checkout'}
                                    </dd>
                                  </div>
                                  <div>
                                    <dt className="text-xs text-slate-400">User Type</dt>
                                    <dd className="text-sm text-white">{order.orderType}</dd>
                                  </div>
                                  <div>
                                    <dt className="text-xs text-slate-400">Created</dt>
                                    <dd className="text-sm text-white">{new Date(order.createdAt).toLocaleString()}</dd>
                                  </div>
                                  <div>
                                    <dt className="text-xs text-slate-400">Updated</dt>
                                    <dd className="text-sm text-white">{new Date(order.updatedAt).toLocaleString()}</dd>
                                  </div>
                                </dl>
                              </div>

                              {/* Customer Information */}
                              <div className="border border-white/10 bg-white/5 rounded-lg p-4">
                                <h4 className="text-sm font-medium text-white mb-3">Customer Details</h4>
                                <dl className="space-y-2">
                                  <div>
                                    <dt className="text-xs text-slate-400">Name</dt>
                                    <dd className="text-sm text-white">{order.customerInfo.name}</dd>
                                  </div>
                                  <div>
                                    <dt className="text-xs text-slate-400">Email</dt>
                                    <dd className="text-sm text-white">{order.customerInfo.email}</dd>
                                  </div>
                                  {order.customerInfo.phone && (
                                    <div>
                                      <dt className="text-xs text-slate-400">Phone</dt>
                                      <dd className="text-sm text-white">{order.customerInfo.phone}</dd>
                                    </div>
                                  )}
                                  {order.customerInfo.company && (
                                    <div>
                                      <dt className="text-xs text-slate-400">Company</dt>
                                      <dd className="text-sm text-white">{order.customerInfo.company}</dd>
                                    </div>
                                  )}
                                  {order.userId && (
                                    <div>
                                      <dt className="text-xs text-slate-400">User ID</dt>
                                      <dd className="text-sm text-white font-mono">{order.userId}</dd>
                                    </div>
                                  )}
                                </dl>
                              </div>

                              {/* Order Status & Tracking */}
                              <div className="border border-white/10 bg-white/5 rounded-lg p-4">
                                <h4 className="text-sm font-medium text-white mb-3">Status & Tracking</h4>
                                <dl className="space-y-2">
                                  <div>
                                    <dt className="text-xs text-slate-400">Current Status</dt>
                                    <dd className="text-sm text-white">
                                      <select
                                        value={order.status}
                                        onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                                        disabled={isUpdatingStatus === order.id}
                                        className="text-sm border border-white/10 rounded px-2 py-1 bg-black/30 text-white"
                                      >
                                        <option value="PENDING">Pending</option>
                                        <option value="CONFIRMED">Confirmed</option>
                                        <option value="PROCESSING">Processing</option>
                                        <option value="SHIPPED">Shipped</option>
                                        <option value="DELIVERED">Delivered</option>
                                        <option value="CANCELLED">Cancelled</option>
                                      </select>
                                      {isUpdatingStatus === order.id && (
                                        <span className="ml-2 text-xs text-gray-500">Updating...</span>
                                      )}
                                    </dd>
                                  </div>
                                  <div>
                                    <dt className="text-xs text-slate-400">Tracking Number</dt>
                                    <dd className="text-sm text-white font-mono">
                                      {trackingNumbers[order.id] || order.trackingNumber ? 
                                        (trackingNumbers[order.id] || order.trackingNumber) : 
                                        (order.status === 'SHIPPED' || order.status === 'DELIVERED' ? 
                                          generateTrackingNumber(order.id) : 'Not assigned'
                                        )
                                      }
                                    </dd>
                                  </div>
                                  <div>
                                    <dt className="text-xs text-slate-400">Payment Status</dt>
                                    <dd className="text-sm text-white">
                                      {order.paymentProcessed ? '✅ Paid' : 
                                       order.orderSource === 'PRODUCT_CUSTOMIZATION' ? '📝 Saved (No Payment)' : 
                                       order.isDraft ? '💭 Draft' : '⏳ Pending'
                                      }
                                    </dd>
                                  </div>
                                  
                                  {/* Tracking Number Input Section */}
                                  {order.status === 'SHIPPED' && (
                                    <div className="mt-4 pt-3 border-t border-gray-200">
                                      <dt className="text-xs text-gray-500 mb-2">Tracking Number</dt>
                                      <dd className="text-sm text-white">
                                        <input
                                          type="text"
                                          placeholder="Enter tracking number..."
                                          className="w-full text-sm border border-white/10 rounded px-2 py-1 bg-black/30 text-white focus:outline-none focus:ring-1 focus:ring-lime-400 focus:border-lime-400"
                                          value={trackingNumbers[order.id] ?? order.trackingNumber ?? ''}
                                          onChange={(e) => handleTrackingNumberChange(order.id, e.target.value)}
                                        />
                                        <div className="text-xs text-slate-500 mt-1">
                                          Enter the shipping carrier's tracking number
                                        </div>
                                      </dd>
                                    </div>
                                  )}
                                </dl>
                              </div>

                              {/* Financial Information */}
                              <div className="border border-white/10 bg-white/5 rounded-lg p-4">
                                <h4 className="text-sm font-medium text-white mb-3">Financial Details</h4>
                                <dl className="space-y-2">
                                  {order.orderTotal && (
                                    <div>
                                      <dt className="text-xs text-slate-400">Order Total</dt>
                                      <dd className="text-sm text-white font-semibold">{formatPrice(order.orderTotal)}</dd>
                                    </div>
                                  )}
                                  {order.itemTotal && (
                                    <div>
                                      <dt className="text-xs text-slate-400">Item Total</dt>
                                      <dd className="text-sm text-white">{formatPrice(order.itemTotal)}</dd>
                                    </div>
                                  )}
                                  <div>
                                    <dt className="text-xs text-slate-400">Revenue Impact</dt>
                                    <dd className="text-sm text-white">
                                      {order.paymentProcessed && order.orderTotal ? 
                                        `+${formatPrice(order.orderTotal)}` : 
                                        'No revenue yet'
                                      }
                                    </dd>
                                  </div>
                                </dl>
                              </div>
                            </div>

                            {/* Product Details */}
                            <div className="mt-6 bg-gray-50 rounded-lg p-4">
                              <h4 className="text-sm font-medium text-gray-900 mb-3">Product Customization</h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <dt className="text-xs text-gray-500 mb-2">Product</dt>
                                  <dd className="text-sm text-gray-900 font-medium">{order.productName}</dd>
                                </div>
                                <div>
                                  <dt className="text-xs text-gray-500 mb-2">Colors Selected</dt>
                                  <dd className="text-sm text-gray-900">
                                    {Object.keys(order.selectedColors || {}).join(', ') || 'Not specified'}
                                  </dd>
                                </div>
                              </div>
                            </div>

                            {/* Admin Action Buttons */}
                            <div className="mt-4 pt-4 border-t border-white/10 flex space-x-3">
                              <button 
                                onClick={() => updateOrderStatus(order.id, 'PROCESSING')}
                                disabled={order.status === 'PROCESSING' || isUpdatingStatus === order.id}
                                className="inline-flex items-center px-3 py-2 border border-white/10 shadow-sm text-sm leading-4 font-medium rounded-md text-white bg-white/5 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-lime-400 disabled:opacity-50"
                              >
                                Mark Processing
                              </button>
                              <button 
                                onClick={() => updateOrderStatus(order.id, 'SHIPPED')}
                                disabled={order.status === 'SHIPPED' || order.status === 'DELIVERED' || isUpdatingStatus === order.id}
                                className="inline-flex items-center px-3 py-2 border border-white/10 shadow-sm text-sm leading-4 font-medium rounded-md text-white bg-white/5 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-lime-400 disabled:opacity-50"
                              >
                                Mark Shipped
                              </button>
                              <button 
                                onClick={() => updateOrderStatus(order.id, 'DELIVERED')}
                                disabled={order.status === 'DELIVERED' || isUpdatingStatus === order.id}
                                className="inline-flex items-center px-3 py-2 border border-white/10 shadow-sm text-sm leading-4 font-medium rounded-md text-white bg-white/5 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-lime-400 disabled:opacity-50"
                              >
                                Mark Delivered
                              </button>
                              <a
                                href={`mailto:${order.customerInfo.email}?subject=Your Order ${order.id.slice(-8)}`}
                                className="inline-flex items-center px-3 py-2 border border-white/10 shadow-sm text-sm leading-4 font-medium rounded-md text-white bg-white/5 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-lime-400"
                              >
                                Email Customer
                              </a>
                            </div>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="px-4 py-5 sm:p-6 text-center">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                  <p className="mt-4 text-slate-400">No {orderFilter !== 'all' ? orderFilter + ' ' : ''}orders found</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Users Tab */}
        {currentView === 'users' && (
          <div className="mt-8 px-4 sm:px-0">
            <div className="border border-white/10 bg-white/5 backdrop-blur-xl ring-1 ring-white/5 shadow rounded-lg">
              {users.length > 0 ? (
                <div className="overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="border border-white/10 bg-white/5">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">User</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Role</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Joined</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Orders</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      {users.map((userItem) => {
                        const userOrders = orders.filter(order => order.userId === userItem.id);
                        return (
                          <tr key={userItem.id}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>
                                <div className="text-sm font-medium text-white">{userItem.name}</div>
                                <div className="text-sm text-slate-400">{userItem.email}</div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                userItem.role === 'admin' ? 'bg-red-100 text-red-800' :
                                userItem.role === 'member' ? 'bg-blue-100 text-blue-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {userItem.role}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                              {new Date(userItem.createdAt).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                              {userOrders.length} orders
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <a
                                href={`mailto:${userItem.email}`}
                                className="text-lime-400 hover:text-lime-300"
                              >
                                Email
                              </a>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="px-4 py-5 sm:p-6 text-center">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                  <p className="mt-4 text-slate-400">No users found</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Quotes Tab */}
        {currentView === 'quotes' && (
          <div className="mt-8 px-4 sm:px-0">
            <div className="border border-white/10 bg-white/5 backdrop-blur-xl ring-1 ring-white/5 shadow rounded-lg">
              {quoteRequests.length > 0 ? (
                <div className="overflow-hidden">
                  <ul className="divide-y divide-white/10">
                    {quoteRequests.map((quote) => (
                      <li key={quote.id} className="px-4 py-4 sm:px-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="flex-shrink-0">
                              <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                                <svg className="h-6 w-6 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{quote.productName}</div>
                              <div className="text-sm text-slate-400">
                                Quote ID: {quote.id.slice(-8)} • {quote.customerInfo.name} • {new Date(quote.createdAt).toLocaleDateString()}
                              </div>
                              <div className="text-sm text-slate-400">
                                {quote.customerInfo.email} • {quote.customerInfo.company}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(quote.status)}`}>
                              {quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}
                            </span>
                            <a
                              href={`mailto:${quote.customerInfo.email}?subject=Quote Request ${quote.id.slice(-8)}`}
                              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                            >
                              Reply
                            </a>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="px-4 py-5 sm:p-6 text-center">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="mt-4 text-slate-400">No quote requests found</p>
                </div>
              )}
            </div>
          </div>
        )}

          {/* Products Tab */}
          {currentView === 'products' && (
            <div className="mt-8 px-4 sm:px-0">
              <ProductManagement />
            </div>
          )}

          {/* Page Builder Tab */}
          {currentView === 'pages' && (
            <div className="mt-8 px-4 sm:px-0">
              <PageBuilder />
            </div>
          )}
        </DashboardContent>
      </div>

      {/* Modals and Drawers */}
      <OrderDetailsModal
        isOpen={orderModalOpen}
        onClose={() => setOrderModalOpen(false)}
        order={selectedOrder ? {
          id: selectedOrder.id.slice(-8),
          customer: selectedOrder.customerInfo.name,
          items: 12,
          total: selectedOrder.orderTotal ? formatPrice(selectedOrder.orderTotal) : '$0.00',
          status: selectedOrder.status
        } : undefined}
      />

      <ProductModal
        isOpen={productModalOpen}
        onClose={() => setProductModalOpen(false)}
        onSave={(product) => console.log('Product saved:', product)}
      />

      <TrackingDrawer
        isOpen={trackingDrawerOpen}
        onClose={() => setTrackingDrawerOpen(false)}
        orderId="CC-1039"
      />
    </DashboardShell>
  );
}
