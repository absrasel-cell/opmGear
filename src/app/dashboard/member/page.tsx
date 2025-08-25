'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthContext';
import {
  ShoppingCart,
  ShoppingBag,
  MessageSquareQuote,
  Package,
  Bookmark,
  CreditCard,
  CheckCircle2,
  Clock3,
  User,
  Crown,
  Bell,
  AlertTriangle,
  CircleHelp,
  ChevronRight,
  ChevronDown,
  FileText,
  Truck,
  Search,
  Shield,
  CheckCircle,
  Download
} from 'lucide-react';

// Import our design system components
import {
  DashboardShell,
  DashboardContent,
  GlassCard,
  StatCard,
  Button,
  SearchInput,
  StatusBadge
} from '@/components/ui/dashboard';
import Sidebar from '@/components/ui/dashboard/Sidebar';
import DashboardHeader from '@/components/ui/dashboard/DashboardHeader';
import LogoAssetsDisplay from '@/components/dashboard/LogoAssetsDisplay';
import { PersonalizedShippingNotification } from '@/components/ui/ShippingNotification';

// Types
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
  trackingNumber?: string;
  estimatedDelivery?: string;
  selectedColors: Record<string, any>;
  selectedOptions: Record<string, string>; // Single-select options
  multiSelectOptions: Record<string, string[]>; // Multi-select options
  logoSetupSelections: Record<string, {
    position?: string;
    size?: string;
    application?: string;
  }>; // Logo configuration details
  uploadedLogoFiles?: Array<{url: string, name: string, size: number, type: string}>;
  additionalInstructions?: string;
  paymentProcessed?: boolean;
  shipmentId?: string;
  shipment?: {
    id: string;
    buildNumber: string;
    shippingMethod: string;
    status: string;
    estimatedDeparture?: string;
    estimatedDelivery?: string;
    createdAt: string;
  };
}

interface CostBreakdown {
  baseProductCost: number;
  logoSetupCosts: Array<{
    name: string;
    cost: number;
    unitPrice: number;
    details: string;
    baseUnitPrice?: number;
  }>;
  accessoriesCosts: Array<{
    name: string;
    cost: number;
    unitPrice: number;
  }>;
  closureCosts: Array<{
    name: string;
    cost: number;
    unitPrice: number;
  }>;
  premiumFabricCosts: Array<{
    name: string;
    cost: number;
    unitPrice: number;
  }>;
  deliveryCosts: Array<{
    name: string;
    cost: number;
    unitPrice: number;
  }>;
  totalCost: number;
  totalUnits: number;
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

type FilterType = 'all' | 'saved' | 'checkout' | 'completed' | 'pending' | 'quotes';

// Quick Action Card Component
function QuickActionCard({
  href,
  title,
  subtitle,
  icon: Icon,
  glowClass,
}: {
  href: string;
  title: string;
  subtitle?: string;
  icon: any;
  glowClass: string;
}) {
  return (
    <Link
      href={href}
      className="group relative flex w-full items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl transition-transform duration-200 hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
    >
      <div className={`absolute inset-0 rounded-2xl opacity-0 blur-2xl transition-opacity duration-300 ${glowClass} group-hover:opacity-30`} />
      <div className="relative flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-black/40">
        <Icon className="h-6 w-6" />
      </div>
      <div className="relative">
        <p className="text-base/6 font-semibold text-white">{title}</p>
        {subtitle && <p className="text-sm text-slate-300/80">{subtitle}</p>}
      </div>
      <ChevronRight className="ml-auto h-5 w-5 opacity-60 group-hover:translate-x-0.5 group-hover:opacity-100" />
    </Link>
  );
}

export default function NewMemberDashboard() {
  const { user, loading, isAuthenticated, refreshSession } = useAuth();
  const router = useRouter();
  const accessRole = user?.accessRole; // 'CUSTOMER' | 'STAFF' | 'SUPER_ADMIN' | 'MASTER_ADMIN'
  const customerRole = user?.customerRole; // 'RETAIL' | 'WHOLESALE' | 'SUPPLIER'
  const isMasterAdmin = accessRole === 'MASTER_ADMIN';
  const isAdmin = isMasterAdmin || accessRole === 'SUPER_ADMIN' || accessRole === 'STAFF';
  
  // State
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [quoteRequests, setQuoteRequests] = useState<QuoteRequest[]>([]);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [currentFilter, setCurrentFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeStat, setActiveStat] = useState<string>('');
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);
  const [successOrderId, setSuccessOrderId] = useState<string | null>(null);
  
  const [stats, setStats] = useState({
    totalOrders: 0,
    savedOrders: 0,
    checkoutOrders: 0,
    completedOrders: 0,
    pendingOrders: 0,
    quoteRequests: 0
  });

  const [orderCostBreakdowns, setOrderCostBreakdowns] = useState<Record<string, CostBreakdown>>({});
  const [orderInvoices, setOrderInvoices] = useState<Record<string, { id: string; number: string; } | null>>({});

  const [databaseStatus, setDatabaseStatus] = useState<'available' | 'unavailable' | 'unknown'>('available');
  const [roleChangeNotification, setRoleChangeNotification] = useState(false);

  // Check for checkout success message
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const checkoutStatus = searchParams.get('checkout');
      const orderId = searchParams.get('orderId');
      
      if (checkoutStatus === 'success' && orderId) {
        setCheckoutSuccess(true);
        setSuccessOrderId(orderId);
        
        // Clear URL parameters after showing success message
        const url = new URL(window.location.href);
        url.searchParams.delete('checkout');
        url.searchParams.delete('orderId');
        window.history.replaceState({}, '', url.toString());
        
        // Auto-hide success message after 5 seconds
        setTimeout(() => {
          setCheckoutSuccess(false);
          setSuccessOrderId(null);
        }, 5000);
        
      }
    }
  }, []);
  
  // Refresh order data when checkout is successful
  useEffect(() => {
    if (checkoutSuccess && user && isAuthenticated) {
      fetchUserData();
    }
  }, [checkoutSuccess, user, isAuthenticated]);

  // Redirect unauthenticated users to login once loading completes
  useEffect(() => {
    if (!loading && (!user || !isAuthenticated)) {
      const redirectTo = encodeURIComponent('/dashboard/member');
      router.replace(`/login?redirect=${redirectTo}`);
    }
  }, [loading, user, isAuthenticated, router]);

  // Fetch user's data
  useEffect(() => {
    if (isAuthenticated && user) {
      fetchUserData();
    }
  }, [isAuthenticated, user]);

  // Check for role changes and refresh session if needed
  useEffect(() => {
    const checkForRoleChanges = async () => {
      if (isAuthenticated && user) {
        try {
          const response = await fetch('/api/auth/session');
          if (response.ok) {
            const data = await response.json();
            if (
              data.user && (
                data.user.accessRole !== user.accessRole ||
                data.user.customerRole !== user.customerRole
              )
            ) {
              // Role has changed, refresh session
              await refreshSession();
              setRoleChangeNotification(true);
              setTimeout(() => setRoleChangeNotification(false), 5000);
            }
          }
        } catch (error) {
          console.error('Error checking for role changes:', error);
        }
      }
    };

    // Check every 30 seconds for role changes
    const interval = setInterval(checkForRoleChanges, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated, user, refreshSession]);

  const fetchUserData = async () => {
    try {
      // Fetch orders
      const ordersResponse = await fetch(`/api/orders?userId=${user?.id}&email=${user?.email}`);
      if (ordersResponse.ok) {
        const ordersData = await ordersResponse.json();
        const allOrders = ordersData.orders || [];
        setOrders(allOrders);
        
        // Calculate cost breakdowns for each order
        const costBreakdowns: Record<string, CostBreakdown> = {};
        await Promise.all(allOrders.map(async (order: Order) => {
          try {
            const costBreakdown = await calculateOrderCosts(order);
            if (costBreakdown) {
              costBreakdowns[order.id] = costBreakdown;
            }
          } catch (error) {
            console.error(`Error calculating costs for order ${order.id}:`, error);
          }
        }));
        setOrderCostBreakdowns(costBreakdowns);
        
        // Fetch invoices for all orders
        await fetchOrderInvoices(allOrders);
        
        // Calculate stats
        const totalOrders = allOrders.length;
        const savedOrders = allOrders.filter((order: Order) => order.orderSource === 'PRODUCT_CUSTOMIZATION').length;
        const checkoutOrders = allOrders.filter((order: Order) => order.orderSource === 'REORDER' && !order.isDraft).length;
        const completedOrders = allOrders.filter((order: Order) => ['DELIVERED', 'SHIPPED', 'CONFIRMED'].includes(order.status)).length;
        const pendingOrders = allOrders.filter((order: Order) => ['PENDING', 'PROCESSING'].includes(order.status)).length;
        
        setStats(prev => ({
          ...prev,
          totalOrders,
          savedOrders,
          checkoutOrders,
          completedOrders,
          pendingOrders
        }));
      }

      // Fetch quote requests
      const quotesResponse = await fetch(`/api/quote-requests?email=${user?.email}`);
      if (quotesResponse.ok) {
        const quotesData = await quotesResponse.json();
        const allQuotes = quotesData.quotes || [];
        setQuoteRequests(allQuotes);
        
        setStats(prev => ({
          ...prev,
          quoteRequests: allQuotes.length
        }));
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  const getFilteredOrders = () => {
    switch (currentFilter) {
      case 'saved':
        return orders.filter(order => order.orderSource === 'PRODUCT_CUSTOMIZATION');
      case 'checkout':
        return orders.filter(order => order.orderSource === 'REORDER' && !order.isDraft);
      case 'completed':
        return orders.filter(order => ['DELIVERED', 'SHIPPED', 'CONFIRMED'].includes(order.status));
      case 'pending':
        return orders.filter(order => ['PENDING', 'PROCESSING'].includes(order.status));
      case 'quotes':
        return []; // Will show quote requests instead
      default:
        return orders.filter(order => !order.isDraft);
    }
  };

  const getFilteredQuotes = () => {
    return currentFilter === 'quotes' ? quoteRequests : [];
  };

  const filteredItems = currentFilter === 'quotes' ? getFilteredQuotes() : getFilteredOrders();

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  const generateTrackingNumber = (orderId: string): string => {
    const hash = orderId.slice(-8).toUpperCase();
    return `CC${hash}`;
  };

  const generateEstimatedDelivery = (createdAt: string): string => {
    const orderDate = new Date(createdAt);
    const deliveryDate = new Date(orderDate.getTime() + (7 * 24 * 60 * 60 * 1000));
    return deliveryDate.toLocaleDateString();
  };

  const getBuildNumber = (order: Order): string | null => {
    // Return actual shipment build number if assigned
    return order.shipment?.buildNumber || null;
  };

  const calculateOrderCosts = async (order: Order): Promise<CostBreakdown | null> => {
    try {
      // Get base product pricing (using default tier)
      const baseProductPricing = {
        price48: 2.4,
        price144: 1.7,
        price576: 1.6,
        price1152: 1.47,
        price2880: 1.44,
        price10000: 1.41,
      };

      const requestData = {
        selectedColors: order.selectedColors,
        logoSetupSelections: order.logoSetupSelections || {},
        multiSelectOptions: order.multiSelectOptions || {},
        selectedOptions: order.selectedOptions || {},
        baseProductPricing
      };

      const response = await fetch('/api/calculate-cost', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      });

      if (response.ok) {
        const costBreakdown: CostBreakdown = await response.json();
        return costBreakdown;
      }
      return null;
    } catch (error) {
      console.error('Error calculating order costs:', error);
      return null;
    }
  };

  const fetchOrderInvoices = async (ordersToCheck: Order[] = orders) => {
    if (!user?.id || ordersToCheck.length === 0) return;
    
    try {
      const invoicePromises = ordersToCheck.map(async (order) => {
        try {
          const response = await fetch(`/api/invoices?orderId=${order.id}`, {
            credentials: 'include'
          });
          if (response.ok) {
            const data = await response.json();
            const invoices = data.invoices || [];
            if (invoices.length > 0) {
              // Return the most recent invoice for this order
              return { [order.id]: { id: invoices[0].id, number: invoices[0].number } };
            }
          }
          return { [order.id]: null };
        } catch (error) {
          console.error(`Error fetching invoice for order ${order.id}:`, error);
          return { [order.id]: null };
        }
      });

      const results = await Promise.all(invoicePromises);
      const invoicesMap = results.reduce((acc, curr) => ({ ...acc, ...curr }), {});
      setOrderInvoices(invoicesMap);
    } catch (error) {
      console.error('Error fetching order invoices:', error);
    }
  };

  const downloadInvoice = async (invoiceId: string, invoiceNumber: string) => {
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/pdf`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to download invoice');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `invoice-${invoiceNumber}.pdf`;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading invoice:', error);
      // Fallback to direct link approach if blob method fails
      const link = document.createElement('a');
      link.href = `/api/invoices/${invoiceId}/pdf`;
      link.download = `invoice-${invoiceNumber}.pdf`;
      link.click();
    }
  };

  if (loading) {
    return (
      <DashboardShell>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-lime-400 mx-auto"></div>
            <p className="mt-4 text-slate-300">Loading...</p>
          </div>
        </div>
      </DashboardShell>
    );
  }

  if (!user || !isAuthenticated) {
    return (
      <DashboardShell>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-lime-400 mx-auto"></div>
            <p className="mt-4 text-slate-300">Redirecting to login...</p>
          </div>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <div className="mt-6">
          <Sidebar 
            collapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          />
        </div>

        {/* Main Content */}
        <DashboardContent>
          {/* Header */}
          <header className="sticky top-0 z-20 backdrop-blur-xl mt-2">
            <div className="px-6 md:px-10 pt-2">
              <GlassCard className="p-0">
                {/* Top Row - Search and Actions */}
                <div className="flex items-center gap-3 p-3 border-b border-white/10">
                  <div className="flex-1">
                    <SearchInput
                      icon={Search}
                      placeholder="Search orders, IDs, products…"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Live Sync Badge */}
                    <div className="inline-flex items-center px-3 py-1.5 rounded-full bg-lime-400/10 border border-lime-400/20 text-lime-400 text-xs font-medium">
                      Live Sync
                      <span className="ml-2 h-1.5 w-1.5 rounded-full bg-lime-400 animate-pulse" />
                    </div>

                    {/* Notification bell */}
                    <button className="relative grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl transition hover:-translate-y-0.5">
                      <Bell className="h-5 w-5" />
                    </button>

                                         {/* Profile Icon - Clickable */}
                     <Link href="/dashboard/member/profile">
                       <button className="relative grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-white/10">
                         {user.avatarUrl ? (
                           <img 
                             src={user.avatarUrl} 
                             alt="Profile" 
                             className="h-8 w-8 rounded-full object-cover"
                           />
                         ) : (
                           <User className="h-5 w-5" />
                         )}
                       </button>
                     </Link>

                     {/* Refresh Session Button */}
                     <button 
                       onClick={refreshSession}
                       className="relative grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-white/10"
                       title="Refresh Session"
                     >
                       <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                       </svg>
                     </button>
                  </div>
                </div>
                
                {/* Bottom Row - Title */}
                <div className="p-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <h1 className="text-4xl font-extrabold tracking-tight text-white md:text-5xl">
                      Welcome back, {user.name}
                    </h1>
                    
                    {/* Role Badge */}
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-sm">
                      {isMasterAdmin ? (
                        <>
                          <Shield className="w-4.5 h-4.5 text-lime-400" />
                          Master Admin
                        </>
                      ) : isAdmin ? (
                        <>
                          <Shield className="w-4.5 h-4.5 text-lime-400" />
                          Admin
                        </>
                      ) : customerRole === 'WHOLESALE' ? (
                        <>
                          <Shield className="w-4.5 h-4.5 text-orange-400" />
                          Wholesale
                        </>
                      ) : customerRole === 'SUPPLIER' ? (
                        <>
                          <Shield className="w-4.5 h-4.5 text-purple-400" />
                          Supplier
                        </>
                      ) : (
                        <>
                          <Shield className="w-4.5 h-4.5 text-cyan-400" />
                          Member
                        </>
                      )}
                    </span>
                  </div>
                  <p className="mt-2 text-slate-300/80">Here's what's happening with your account today.</p>
                </div>
              </GlassCard>
            </div>
          </header>

          {/* Main Content Area with proper spacing */}
          <div className="flex-1 flex flex-col min-h-0 mt-2">
            {/* Checkout Success Notification */}
            {checkoutSuccess && (
              <div className="px-6 md:px-10 mt-4">
                <div className="overflow-hidden rounded-2xl border border-lime-300/20 bg-lime-300/15 p-4 text-lime-100 backdrop-blur-xl">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5" />
                    <div>
                      <p className="font-medium">Order successfully checked out!</p>
                      <p className="text-sm text-lime-200/80">
                        Order {successOrderId?.slice(-8)} has been submitted and is now processing.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Role Change Notification */}
            {roleChangeNotification && (
              <div className="px-6 md:px-10 mt-4">
                <div className="overflow-hidden rounded-2xl border border-lime-300/20 bg-lime-300/15 p-4 text-lime-100 backdrop-blur-xl">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5" />
                    <p className="font-medium">Your account role has been updated! The changes are now reflected in your dashboard.</p>
                  </div>
                </div>
              </div>
            )}

            {/* Database Status Banner */}
            {databaseStatus === 'unavailable' && (
              <div className="px-6 md:px-10 mt-4">
                <div className="overflow-hidden rounded-2xl border border-amber-300/20 bg-amber-300/15 p-4 text-amber-100 backdrop-blur-xl">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5" />
                    <p className="font-medium">Database maintenance in progress. Some data may be delayed.</p>
                  </div>
                  <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-amber-100/20">
                    <div className="h-full w-1/3 animate-pulse rounded-full bg-amber-300/60" />
                  </div>
                </div>
              </div>
            )}

            {/* Shipping Notification */}
            <div className="px-6 md:px-10 mt-4">
              <PersonalizedShippingNotification orders={orders} />
            </div>

            {/* Quick Actions */}
            <div className="px-6 md:px-10 mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <QuickActionCard href="/store" title="Browse Products" subtitle="Explore latest styles" icon={ShoppingCart} glowClass="bg-cyan-400" />
              <QuickActionCard href="/cart" title="View Cart" subtitle="Review selected items" icon={ShoppingBag} glowClass="bg-emerald-400" />
              <QuickActionCard href="/dashboard/member/quote-request" title="Request Quote" subtitle="Get a tailored offer" icon={MessageSquareQuote} glowClass="bg-amber-300" />
            </div>

            {/* Stats Grid */}
            <div className="px-6 md:px-10 mt-4 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
              <StatCard 
                label="Total Orders" 
                value={stats.totalOrders} 
                icon={Package} 
                active={activeStat === 'total'} 
                onClick={() => { setActiveStat('total'); setCurrentFilter('all'); }} 
              />
              <StatCard 
                label="Saved Orders" 
                value={stats.savedOrders} 
                icon={Bookmark} 
                active={activeStat === 'saved'} 
                onClick={() => { setActiveStat('saved'); setCurrentFilter('saved'); }} 
              />
              <StatCard 
                label="Checkout Orders" 
                value={stats.checkoutOrders} 
                icon={CreditCard} 
                active={activeStat === 'checkout'} 
                onClick={() => { setActiveStat('checkout'); setCurrentFilter('checkout'); }} 
              />
              <StatCard 
                label="Completed" 
                value={stats.completedOrders} 
                icon={CheckCircle2} 
                active={activeStat === 'completed'} 
                onClick={() => { setActiveStat('completed'); setCurrentFilter('completed'); }} 
              />
              <StatCard 
                label="Pending" 
                value={stats.pendingOrders} 
                icon={Clock3} 
                active={activeStat === 'pending'} 
                onClick={() => { setActiveStat('pending'); setCurrentFilter('pending'); }} 
              />
              <StatCard 
                label="Quote Requests" 
                value={stats.quoteRequests} 
                icon={MessageSquareQuote} 
                active={activeStat === 'quotes'} 
                onClick={() => { setActiveStat('quotes'); setCurrentFilter('quotes'); }} 
              />
            </div>

            {/* Orders / Quotes */}
            <div className="px-6 md:px-10 mt-6 mb-8">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  {(['all','saved','checkout','completed','pending','quotes'] as FilterType[]).map((f) => (
                    <button
                      key={f}
                      onClick={() => setCurrentFilter(f)}
                      className={`rounded-full border px-3 py-1.5 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black ${currentFilter === f ? 'border-lime-400/40 bg-lime-400/20 text-white' : 'border-white/10 bg-white/5 text-slate-200/90 hover:border-white/20'}`}
                    >
                      {f === 'all' ? 'All' : 
                       f === 'saved' ? 'Saved' :
                       f === 'checkout' ? 'Checkout' :
                       f === 'completed' ? 'Completed' :
                       f === 'pending' ? 'Pending' :
                       f === 'quotes' ? 'Quote Requests' : f}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <button 
                    onClick={fetchUserData}
                    className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/5 transition hover:border-white/20"
                    title="Refresh Data"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {currentFilter === 'quotes' ? (
                  // Quote Requests View
                  filteredItems.length > 0 ? (
                    filteredItems.map((quote: any) => (
                      <GlassCard key={quote.id} className="overflow-hidden">
                        <div className="flex items-center gap-4 p-4">
                          <div className="hidden sm:flex sm:w-12 sm:items-center sm:justify-center">
                            <MessageSquareQuote className="h-5 w-5 opacity-80" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-white">{quote.productName}</p>
                            <p className="truncate text-xs text-slate-300/80">Quote ID: {quote.id.slice(-8)}</p>
                          </div>
                          <div className="hidden md:block">
                            <StatusBadge status={quote.status} />
                          </div>
                          <div className="hidden md:block w-40 text-right text-sm text-slate-300/80">
                            {new Date(quote.createdAt).toLocaleDateString()}
                          </div>
                          <div className="w-28 text-right text-sm text-white">—</div>
                        </div>
                      </GlassCard>
                    ))
                  ) : (
                    <GlassCard className="p-8 text-center">
                      <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-xl border border-white/10 bg-white/5">
                        <CircleHelp className="h-6 w-6 opacity-70" />
                      </div>
                      <p className="text-base font-semibold text-white">No quote requests yet</p>
                      <p className="text-sm text-slate-300/80">Start by requesting a custom quote.</p>
                      <div className="mt-4">
                        <Link href="/dashboard/member/quote-request">
                          <Button variant="primary">Request Quote</Button>
                        </Link>
                      </div>
                    </GlassCard>
                  )
                ) : (
                  // Orders View
                  filteredItems.length > 0 ? (
                    filteredItems.map((order: any) => (
                      <GlassCard key={order.id} className="overflow-hidden">
                        <div className="flex items-center gap-4 p-4">
                          <button
                            onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                            className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-black/40 transition hover:scale-105"
                          >
                            {expandedOrder === order.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </button>
                          
                          <div className="hidden sm:flex sm:w-12 sm:items-center sm:justify-center">
                            {order.orderSource === 'PRODUCT_CUSTOMIZATION' ? (
                              <Bookmark className="h-5 w-5 opacity-80" />
                            ) : (
                              <Package className="h-5 w-5 opacity-80" />
                            )}
                          </div>
                          
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-white">{order.productName}</p>
                            <p className="truncate text-xs text-slate-300/80">Order ID: {order.id.slice(-8)}</p>
                          </div>
                          
                          <div className="hidden md:block">
                            <StatusBadge status={order.status} />
                          </div>
                          
                          <div className="hidden md:block w-40 text-right text-sm text-slate-300/80">
                            {new Date(order.createdAt).toLocaleDateString()}
                          </div>
                          
                          <div className="w-28 text-right text-sm text-white">
                            {orderCostBreakdowns[order.id] ? formatPrice(orderCostBreakdowns[order.id].totalCost) : (order.orderTotal ? formatPrice(order.orderTotal) : '—')}
                          </div>
                        </div>
                        
                        {expandedOrder === order.id && (
                          <div className="grid grid-cols-1 gap-4 border-t border-white/10 p-4 md:grid-cols-3">
                            {/* Order Information */}
                            <GlassCard className="p-4">
                              <div className="mb-3 flex items-center gap-2 text-white">
                                <FileText className="h-4 w-4 opacity-80" />
                                <h4 className="text-sm font-semibold">Order Information</h4>
                              </div>
                              <dl className="space-y-2 text-sm text-slate-300/90">
                                <div className="flex justify-between">
                                  <dt className="opacity-80">Type</dt>
                                  <dd>{order.orderSource === 'PRODUCT_CUSTOMIZATION' ? 'Saved Order' : 'Checkout Order'}</dd>
                                </div>
                                <div className="flex justify-between">
                                  <dt className="opacity-80">Status</dt>
                                  <dd><StatusBadge status={order.status} /></dd>
                                </div>
                                <div className="flex justify-between">
                                  <dt className="opacity-80">Date</dt>
                                  <dd>{new Date(order.createdAt).toLocaleString()}</dd>
                                </div>
                              </dl>
                            </GlassCard>

                            {/* Status & Tracking */}
                            <GlassCard className="p-4">
                              <div className="mb-3 flex items-center gap-2 text-white">
                                <Truck className="h-4 w-4 opacity-80" />
                                <h4 className="text-sm font-semibold">Status & Tracking</h4>
                              </div>
                              <dl className="space-y-2 text-sm text-slate-300/90">
                                <div className="flex justify-between">
                                  <dt className="opacity-80">Build #</dt>
                                  <dd>
                                    {getBuildNumber(order) ? (
                                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-orange-400/20 text-orange-300 text-xs font-medium">
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-10 10-5-5" />
                                        </svg>
                                        {getBuildNumber(order)}
                                      </span>
                                    ) : (
                                      <span className="text-slate-400">Not assigned</span>
                                    )}
                                  </dd>
                                </div>
                                <div className="flex justify-between">
                                  <dt className="opacity-80">Tracking #</dt>
                                  <dd>
                                    {(order.status === 'SHIPPED' || order.status === 'DELIVERED') ? 
                                      (order.trackingNumber || generateTrackingNumber(order.id)) : 
                                      '—'
                                    }
                                  </dd>
                                </div>
                                <div className="flex justify-between">
                                  <dt className="opacity-80">Est. Delivery</dt>
                                  <dd>
                                    {order.status === 'DELIVERED' ? 'Delivered' : generateEstimatedDelivery(order.createdAt)}
                                  </dd>
                                </div>
                                <div className="flex justify-between">
                                  <dt className="opacity-80">Payment</dt>
                                  <dd>
                                    {order.paymentProcessed ? 'Paid' : 
                                     order.orderSource === 'PRODUCT_CUSTOMIZATION' ? 'Saved (No Payment)' : 
                                     'Pending'
                                    }
                                  </dd>
                                </div>
                                <div className="flex justify-between border-t border-white/10 pt-2 mt-2">
                                  <dt className="opacity-80 font-medium">Order Total</dt>
                                  <dd className="font-medium text-white">
                                    {orderCostBreakdowns[order.id] ? formatPrice(orderCostBreakdowns[order.id].totalCost) : (order.orderTotal ? formatPrice(order.orderTotal) : 'Calculating...')}
                                  </dd>
                                </div>
                              </dl>
                            </GlassCard>

                            {/* Product Details */}
                            <GlassCard className="p-4">
                              <div className="mb-3 flex items-center gap-2 text-white">
                                <Package className="h-4 w-4 opacity-80" />
                                <h4 className="text-sm font-semibold">Product Details</h4>
                              </div>
                              <dl className="space-y-2 text-sm text-slate-300/90">
                                <div className="flex justify-between">
                                  <dt className="opacity-80">Product</dt>
                                  <dd className="text-right">{order.productName}</dd>
                                </div>
                                
                                {/* Color and Size Breakdown */}
                                {order.selectedColors && Object.keys(order.selectedColors).length > 0 && (
                                  <div>
                                    <dt className="opacity-80 mb-1">Colors & Sizes</dt>
                                    {Object.entries(order.selectedColors).map(([colorName, colorData]: [string, any]) => (
                                      <div key={colorName} className="ml-2 mb-1">
                                        <div className="text-xs font-medium text-white">{colorName}:</div>
                                        <div className="ml-2 text-xs text-slate-400">
                                          {Object.entries((colorData as any).sizes || {}).map(([size, qty]: [string, any]) => (
                                            qty > 0 && <span key={size} className="mr-2">{size}: {qty}</span>
                                          ))}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                
                                {/* Total Units */}
                                <div className="flex justify-between">
                                  <dt className="opacity-80">Total Units</dt>
                                  <dd className="text-right">
                                    {order.selectedColors ? 
                                      Object.values(order.selectedColors).reduce((sum: number, colorData: any) => 
                                        sum + Object.values((colorData as any).sizes || {}).reduce((colorSum: number, qty: any) => colorSum + (qty as number), 0), 0
                                      ) : 0
                                    }
                                  </dd>
                                </div>
                              </dl>
                            </GlassCard>

                            {/* Selected Options (Single-Select) */}
                            {order.selectedOptions && Object.keys(order.selectedOptions).length > 0 && (
                              <GlassCard className="p-4 md:col-span-3">
                                <div className="mb-3 flex items-center gap-2 text-white">
                                  <svg className="h-4 w-4 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                                  </svg>
                                  <h4 className="text-sm font-semibold">Selected Options</h4>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-sm text-slate-300/90">
                                  {Object.entries(order.selectedOptions).map(([optionName, optionValue]: [string, string]) => (
                                    <div key={optionName} className="border border-white/10 rounded-lg p-3">
                                      <div className="font-medium text-white capitalize mb-1">
                                        {optionName.replace(/[-_]/g, ' ')}
                                      </div>
                                      <div className="text-xs text-slate-400">
                                        {optionValue}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </GlassCard>
                            )}

                                                         {/* Logo Setup Details */}
                            {order.multiSelectOptions?.['logo-setup'] && order.multiSelectOptions['logo-setup'].length > 0 && (
                              <GlassCard className="p-4 md:col-span-3">
                                <div className="mb-3 flex items-center gap-2 text-white">
                                  <svg className="h-4 w-4 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m-9 3v10a2 2 0 002 2h6a2 2 0 002-2V7m-8 0h8m-8 0H5a1 1 0 00-1 1v1m14-2a1 1 0 011 1v1m-1 0H5" />
                                  </svg>
                                  <h4 className="text-sm font-semibold">Logo Setup</h4>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-slate-300/90">
                                  {order.multiSelectOptions['logo-setup'].map((logoValue: string) => (
                                    <div key={logoValue} className="border border-white/10 rounded-lg p-2">
                                      <div className="font-medium text-white">{logoValue}</div>
                                      {order.logoSetupSelections?.[logoValue] && (
                                        <div className="mt-1 space-y-1 text-xs text-slate-400">
                                          {order.logoSetupSelections[logoValue].position && (
                                            <div>Position: {order.logoSetupSelections[logoValue].position}</div>
                                          )}
                                          {order.logoSetupSelections[logoValue].size && (
                                            <div>Size: {order.logoSetupSelections[logoValue].size}</div>
                                          )}
                                          {order.logoSetupSelections[logoValue].application && (
                                            <div>Application: {order.logoSetupSelections[logoValue].application}</div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                                
                                {/* Additional Instructions */}
                                {order.additionalInstructions && (
                                  <div className="mt-4 pt-4 border-t border-white/10">
                                    <div className="mb-2 flex items-center gap-2 text-white">
                                      <svg className="h-4 w-4 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                      </svg>
                                      <h5 className="text-sm font-medium">Additional Instructions</h5>
                                    </div>
                                    <div className="text-sm text-slate-300/90 bg-white/5 rounded-lg p-3">
                                      {order.additionalInstructions}
                                    </div>
                                  </div>
                                )}
                              </GlassCard>
                            )}
                            
                            {/* Logo Files and Instructions - New System */}
                            <div className="md:col-span-3">
                              <LogoAssetsDisplay orderId={order.id} />
                            </div>
                            
                            {/* Accessories, Closures, and Delivery Options */}
                            {(order.multiSelectOptions?.accessories?.length > 0 || 
                              order.multiSelectOptions?.closures?.length > 0 || 
                              order.multiSelectOptions?.delivery?.length > 0) && (
                              <GlassCard className="p-4 md:col-span-3">
                                <div className="mb-3 flex items-center gap-2 text-white">
                                  <svg className="h-4 w-4 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                  <h4 className="text-sm font-semibold">Additional Options</h4>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-slate-300/90">
                                  {order.multiSelectOptions?.accessories?.length > 0 && (
                                    <div>
                                      <div className="font-medium text-white mb-1">Accessories</div>
                                      <div className="space-y-1">
                                        {order.multiSelectOptions.accessories.map((item: string) => (
                                          <div key={item} className="text-xs text-slate-400">• {item}</div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  {order.multiSelectOptions?.closures?.length > 0 && (
                                    <div>
                                      <div className="font-medium text-white mb-1">Closures</div>
                                      <div className="space-y-1">
                                        {order.multiSelectOptions.closures.map((item: string) => (
                                          <div key={item} className="text-xs text-slate-400">• {item}</div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  {order.multiSelectOptions?.delivery?.length > 0 && (
                                    <div>
                                      <div className="font-medium text-white mb-1">Delivery Options</div>
                                      <div className="space-y-1">
                                        {order.multiSelectOptions.delivery.map((item: string) => (
                                          <div key={item} className="text-xs text-slate-400">• {item}</div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </GlassCard>
                            )}

                            {/* Pricing Breakdown */}
                            {order.orderTotal && order.orderTotal > 0 && (
                              <GlassCard className="p-4 md:col-span-3">
                                <div className="mb-3 flex items-center gap-2 text-white">
                                  <svg className="h-4 w-4 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                  </svg>
                                  <h4 className="text-sm font-semibold">Order Summary</h4>
                                </div>
{(() => {
                                  const costBreakdown = orderCostBreakdowns[order.id];
                                  return (
                                    <div className="space-y-3">
                                      {/* Base Product Cost */}
                                      <div className="flex justify-between items-center py-2 border-b border-white/10">
                                        <div className="text-sm text-slate-300/90">
                                          <div className="font-medium text-white">{order.productName}</div>
                                          <div className="text-xs text-slate-400">
                                            {costBreakdown ? 
                                              `${costBreakdown.totalUnits} units` : 
                                              (order.selectedColors ? 
                                                `${Object.values(order.selectedColors).reduce((sum: number, colorData: any) => 
                                                  sum + Object.values((colorData as any).sizes || {}).reduce((colorSum: number, qty: any) => colorSum + (qty as number), 0), 0
                                                )} units` : ''
                                              )
                                            }
                                          </div>
                                        </div>
                                        <div className="text-sm font-medium text-cyan-400">
                                          {costBreakdown ? formatPrice(costBreakdown.baseProductCost) : 'Calculating...'}
                                        </div>
                                      </div>

                                      {/* Logo Setup Costs - Show calculated or fallback to order data */}
                                      {costBreakdown?.logoSetupCosts && costBreakdown.logoSetupCosts.length > 0 ? (
                                        <div>
                                          <div className="text-xs font-medium text-slate-300/80 mb-2">Logo Setup Options:</div>
                                          {costBreakdown.logoSetupCosts.map((logoCost, index) => (
                                            <div key={index} className="flex justify-between items-center py-1 text-sm">
                                              <div className="text-slate-300/90">
                                                <div>{logoCost.name}</div>
                                                <div className="text-xs text-slate-400">
                                                  {formatPrice(logoCost.unitPrice)} per unit
                                                </div>
                                              </div>
                                              <div className="text-orange-400 font-medium">
                                                {formatPrice(logoCost.cost)}
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      ) : (order.multiSelectOptions?.['logo-setup'] && order.multiSelectOptions['logo-setup'].length > 0 && (
                                        <div>
                                          <div className="text-xs font-medium text-slate-300/80 mb-2">Logo Setup Options:</div>
                                          {order.multiSelectOptions['logo-setup'].map((logoValue: string) => (
                                            <div key={logoValue} className="flex justify-between items-center py-1 text-sm">
                                              <div className="text-slate-300/90">
                                                <div>{logoValue}</div>
                                                {order.logoSetupSelections?.[logoValue] && (
                                                  <div className="text-xs text-slate-400">
                                                    {[
                                                      order.logoSetupSelections[logoValue].position && `${order.logoSetupSelections[logoValue].position}`,
                                                      order.logoSetupSelections[logoValue].size && `${order.logoSetupSelections[logoValue].size}`,
                                                      order.logoSetupSelections[logoValue].application && `${order.logoSetupSelections[logoValue].application}`
                                                    ].filter(Boolean).join(', ')}
                                                  </div>
                                                )}
                                              </div>
                                              <div className="text-orange-400 font-medium">
                                                Calculating...
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      ))}

                                      {/* Selected Options Costs */}
                                      {order.selectedOptions && Object.keys(order.selectedOptions).length > 0 && (
                                        <div>
                                          <div className="text-xs font-medium text-slate-300/80 mb-2">Selected Options:</div>
                                          {Object.entries(order.selectedOptions).map(([optionName, optionValue]: [string, string]) => (
                                            <div key={optionName} className="flex justify-between items-center py-1 text-sm">
                                              <div className="text-slate-300/90">
                                                <span className="capitalize">{optionName.replace(/[-_]/g, ' ')}: </span>
                                                <span className="text-slate-400">{optionValue}</span>
                                              </div>
                                              <div className="text-purple-400 font-medium">
                                                Included
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      )}

                                      {/* Accessories Costs */}
                                      {costBreakdown?.accessoriesCosts && costBreakdown.accessoriesCosts.length > 0 ? (
                                        <div>
                                          <div className="text-xs font-medium text-slate-300/80 mb-2">Accessories:</div>
                                          {costBreakdown.accessoriesCosts.map((accessoryCost, index) => (
                                            <div key={index} className="flex justify-between items-center py-1 text-sm">
                                              <div className="text-slate-300/90">
                                                <div>{accessoryCost.name}</div>
                                                <div className="text-xs text-slate-400">
                                                  {formatPrice(accessoryCost.unitPrice)} per unit
                                                </div>
                                              </div>
                                              <div className="text-emerald-400 font-medium">
                                                {formatPrice(accessoryCost.cost)}
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      ) : (order.multiSelectOptions?.accessories && order.multiSelectOptions.accessories.length > 0 && (
                                        <div>
                                          <div className="text-xs font-medium text-slate-300/80 mb-2">Accessories:</div>
                                          {order.multiSelectOptions.accessories.map((item: string) => (
                                            <div key={item} className="flex justify-between items-center py-1 text-sm">
                                              <div className="text-slate-300/90">{item}</div>
                                              <div className="text-emerald-400 font-medium">Calculating...</div>
                                            </div>
                                          ))}
                                        </div>
                                      ))}

                                      {/* Closure Costs */}
                                      {costBreakdown?.closureCosts && costBreakdown.closureCosts.length > 0 ? (
                                        <div>
                                          <div className="text-xs font-medium text-slate-300/80 mb-2">Closure Options:</div>
                                          {costBreakdown.closureCosts.map((closureCost, index) => (
                                            <div key={index} className="flex justify-between items-center py-1 text-sm">
                                              <div className="text-slate-300/90">
                                                <div>{closureCost.name}</div>
                                                <div className="text-xs text-slate-400">
                                                  {formatPrice(closureCost.unitPrice)} per unit
                                                </div>
                                              </div>
                                              <div className="text-pink-400 font-medium">
                                                {formatPrice(closureCost.cost)}
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      ) : (order.multiSelectOptions?.closures && order.multiSelectOptions.closures.length > 0 && (
                                        <div>
                                          <div className="text-xs font-medium text-slate-300/80 mb-2">Closures:</div>
                                          {order.multiSelectOptions.closures.map((item: string) => (
                                            <div key={item} className="flex justify-between items-center py-1 text-sm">
                                              <div className="text-slate-300/90">{item}</div>
                                              <div className="text-pink-400 font-medium">Calculating...</div>
                                            </div>
                                          ))}
                                        </div>
                                      ))}

                                      {/* Premium Fabric Costs */}
                                      {costBreakdown?.premiumFabricCosts && costBreakdown.premiumFabricCosts.length > 0 && (
                                        <div>
                                          <div className="text-xs font-medium text-slate-300/80 mb-2">Premium Fabrics:</div>
                                          {costBreakdown.premiumFabricCosts.map((fabricCost, index) => (
                                            <div key={index} className="flex justify-between items-center py-1 text-sm">
                                              <div className="text-slate-300/90">
                                                <div className="flex items-center gap-1">
                                                  <span>⭐</span>
                                                  <span>{fabricCost.name}</span>
                                                </div>
                                                <div className="text-xs text-slate-400">
                                                  {formatPrice(fabricCost.unitPrice)} per unit
                                                </div>
                                              </div>
                                              <div className="text-purple-400 font-medium">
                                                {formatPrice(fabricCost.cost)}
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      )}

                                      {/* Delivery Costs */}
                                      {costBreakdown?.deliveryCosts && costBreakdown.deliveryCosts.length > 0 ? (
                                        <div>
                                          <div className="text-xs font-medium text-slate-300/80 mb-2">Delivery Options:</div>
                                          {costBreakdown.deliveryCosts.map((deliveryCost, index) => (
                                            <div key={index} className="flex justify-between items-center py-1 text-sm">
                                              <div className="text-slate-300/90">
                                                <div>{deliveryCost.name}</div>
                                                <div className="text-xs text-slate-400">
                                                  {formatPrice(deliveryCost.unitPrice)} per unit
                                                </div>
                                              </div>
                                              <div className="text-yellow-400 font-medium">
                                                {formatPrice(deliveryCost.cost)}
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      ) : (order.multiSelectOptions?.delivery && order.multiSelectOptions.delivery.length > 0 && (
                                        <div>
                                          <div className="text-xs font-medium text-slate-300/80 mb-2">Delivery:</div>
                                          {order.multiSelectOptions.delivery.map((item: string) => (
                                            <div key={item} className="flex justify-between items-center py-1 text-sm">
                                              <div className="text-slate-300/90">{item}</div>
                                              <div className="text-yellow-400 font-medium">Calculating...</div>
                                            </div>
                                          ))}
                                        </div>
                                      ))}

                                      {/* Total */}
                                      <div className="flex justify-between items-center pt-3 border-t border-white/10 text-base font-semibold">
                                        <div className="text-white">Total Order Value</div>
                                        <div className="text-lime-400">
                                          {costBreakdown ? formatPrice(costBreakdown.totalCost) : (order.orderTotal ? formatPrice(order.orderTotal) : 'Calculating...')}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })()}
                              </GlassCard>
                            )}

                            {/* Actions */}
                             <div className="md:col-span-3 flex flex-wrap gap-3">
                               {order.orderSource === 'PRODUCT_CUSTOMIZATION' && (
                                 <Link
                                   href={`/customize/${order.productName.toLowerCase().replace(/\s+/g, '-')}?orderId=${order.id}`}
                                 >
                                   <Button variant="primary">Edit</Button>
                                 </Link>
                               )}
                              
                              {order.orderSource === 'PRODUCT_CUSTOMIZATION' && (
                                <Link href={`/dashboard/member/checkout?orderId=${order.id}`}>
                                  <Button variant="secondary">Checkout</Button>
                                </Link>
                              )}
                              
                              {/* Download Invoice Button */}
                              {orderInvoices[order.id] && (
                                <Button 
                                  variant="ghost"
                                  onClick={() => downloadInvoice(orderInvoices[order.id]!.id, orderInvoices[order.id]!.number)}
                                  className="bg-white/7.5 border border-white/10 hover:bg-white/10"
                                >
                                  <Download className="w-4 h-4 mr-2" />
                                  Download Invoice
                                </Button>
                              )}
                              
                              <Link href={`/messages?start=support&category=order&orderId=${order.id}`}>
                                <Button variant="secondary">Contact Support</Button>
                              </Link>
                            </div>
                          </div>
                        )}
                      </GlassCard>
                    ))
                  ) : (
                    <GlassCard className="p-8 text-center">
                      <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-xl border border-white/10 bg-white/5">
                        <CircleHelp className="h-6 w-6 opacity-70" />
                      </div>
                      <p className="text-base font-semibold text-white">
                        {databaseStatus === 'unavailable' 
                          ? 'Orders temporarily unavailable due to database maintenance'
                          : `No ${currentFilter !== 'all' ? currentFilter + ' ' : ''}orders yet`
                        }
                      </p>
                      <p className="text-sm text-slate-300/80">Try adjusting filters or keywords.</p>
                      <div className="mt-4">
                        <Link href="/store">
                          <Button variant="primary">Start Shopping</Button>
                        </Link>
                      </div>
                    </GlassCard>
                  )
                )}
              </div>
            </div>
          </div>
        </DashboardContent>
      </div>

      
    </DashboardShell>
  );
}