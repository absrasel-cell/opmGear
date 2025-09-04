'use client';

import { useAuth } from '@/components/auth/AuthContext';
import Link from 'next/link';
import { useState, useEffect, useMemo } from 'react';
import {
  Bell,
  User,
  Crown,
  AlertTriangle,
  ShoppingCart,
  ShoppingBag,
  MessageSquareQuote,
  Package,
  Bookmark,
  CreditCard,
  CheckCircle2,
  Clock3,
  FileText,
  ChevronDown,
  ChevronRight,
  Filter,
  Search,
  Truck,
  CircleHelp,
} from 'lucide-react';

// Import our new design system components
import {
  DashboardShell,
  DashboardContent,
  GlassCard,
  StatCard,
  Button,
  StatusBadge
} from '@/components/ui/dashboard';
import Sidebar from '@/components/ui/dashboard/Sidebar';
import DashboardHeader from '@/components/ui/dashboard/DashboardHeader';

interface Order {
  id: string;
  productName: string;
  status: string;
  orderSource: 'PRODUCT_CUSTOMIZATION' | 'REORDER' ;
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
  paymentProcessed?: boolean;
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

interface AdminMessage {
  id: string;
  adminName: string;
  message: string;
  messageType: 'info' | 'warning' | 'success' | 'urgent';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
}

type FilterType = 'all' | 'saved' | 'checkout' | 'completed' | 'pending' | 'quotes';


// Quick Action Card
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
      className={`group relative flex w-full items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl transition-transform duration-200 hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black`}
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



export default function MemberDashboardPage() {
  const { user, loading, isAuthenticated } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [quoteRequests, setQuoteRequests] = useState<QuoteRequest[]>([]);
  const [adminMessages, setAdminMessages] = useState<AdminMessage[]>([]);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [currentFilter, setCurrentFilter] = useState<FilterType>('all');
  const [query, setQuery] = useState('');
  const [activeStat, setActiveStat] = useState<string>('');
  const [stats, setStats] = useState({
    totalOrders: 0,
    savedOrders: 0,
    checkoutOrders: 0,
    completedOrders: 0,
    pendingOrders: 0,
    quoteRequests: 0
  });
  const [databaseStatus, setDatabaseStatus] = useState<'available' | 'unavailable' | 'unknown'>('available');
  
  // Modal states for editing orders
  const [editOrderModal, setEditOrderModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Fetch user's orders and quote requests
  useEffect(() => {
    if (isAuthenticated && user) {
      fetchUserData();
    }
  }, [isAuthenticated, user]);

  const fetchUserData = async () => {
    try {
      // Fetch orders by both userId and email to catch all orders for the user
      const ordersResponse = await fetch(`/api/orders?userId=${user?.id}&email=${user?.email}`);
      if (ordersResponse.ok) {
        const ordersData = await ordersResponse.json();
        const allOrders = ordersData.orders || [];
        setOrders(allOrders);
        
        // Check if database is unavailable (note field indicates maintenance)
        if (ordersData.note && ordersData.note.includes('database maintenance')) {
          setDatabaseStatus('unavailable');
        } else {
          setDatabaseStatus('available');
        }
        
        // Calculate comprehensive stats
        const totalOrders = allOrders.length;
        const savedOrders = allOrders.filter((order: Order) => 
          order.orderSource === 'PRODUCT_CUSTOMIZATION'
        ).length;
        const checkoutOrders = allOrders.filter((order: Order) => 
          order.orderSource === 'REORDER' && !order.isDraft
        ).length;
        const completedOrders = allOrders.filter((order: Order) => 
          order.status === 'DELIVERED' || order.status === 'SHIPPED' || order.status === 'CONFIRMED'
        ).length;
        const pendingOrders = allOrders.filter((order: Order) => 
          order.status === 'PENDING' || order.status === 'PROCESSING'
        ).length;
        
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

      // Fetch admin messages
      const messagesResponse = await fetch('/api/user/messages');
      if (messagesResponse.ok) {
        const messagesData = await messagesResponse.json();
        const allMessages = messagesData.messages || [];
        setAdminMessages(allMessages);
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
        return orders.filter(order => 
          order.status === 'DELIVERED' || order.status === 'SHIPPED' || order.status === 'CONFIRMED'
        );
      case 'pending':
        return orders.filter(order => order.status === 'PENDING' || order.status === 'PROCESSING');
      case 'quotes':
        return []; // Will show quote requests instead
      default:
        return orders.filter(order => !order.isDraft); // Exclude draft orders from 'all' view
    }
  };

  const getFilteredQuotes = () => {
    return currentFilter === 'quotes' ? quoteRequests : [];
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const items = currentFilter === 'quotes' ? getFilteredQuotes() : getFilteredOrders();
    
    return items.filter((item) => {
      const matchesQuery = q
        ? [item.productName || item.productName, item.id, item.status]
            .join(' ')
            .toLowerCase()
            .includes(q)
        : true;
      return matchesQuery;
    });
  }, [currentFilter, query, orders, quoteRequests]);

  const toggleOrderExpansion = (orderId: string) => {
    setExpandedOrder(expandedOrder === orderId ? null : orderId);
  };

  const refreshData = () => {
    if (isAuthenticated && user) {
      fetchUserData();
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  const generateTrackingNumber = (orderId: string): string => {
    // Generate a mock tracking number based on order ID
    const hash = orderId.slice(-8).toUpperCase();
    return `CC${hash}`;
  };

  const generateEstimatedDelivery = (createdAt: string): string => {
    const orderDate = new Date(createdAt);
    const deliveryDate = new Date(orderDate.getTime() + (7 * 24 * 60 * 60 * 1000)); // 7 days later
    return deliveryDate.toLocaleDateString();
  };

  const markMessageAsRead = async (messageId: string) => {
    try {
      const response = await fetch('/api/admin/messages', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId }),
      });

      if (response.ok) {
        // Update local state
        setAdminMessages(prev => prev.map(msg => 
          msg.id === messageId ? { ...msg, isRead: true } : msg
        ));
      }
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  };

  // Handler for editing orders
  const handleEditOrder = (order: Order) => {
    setSelectedOrder(order);
    setEditOrderModal(true);
  };

  const handleSaveOrderChanges = async (updatedOrder: Partial<Order>) => {
    try {
      const response = await fetch(`/api/orders/${selectedOrder?.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedOrder),
      });

      if (response.ok) {
        // Refresh orders data
        await fetchUserData();
        setEditOrderModal(false);
        setSelectedOrder(null);
      } else {
        console.error('Failed to update order');
      }
    } catch (error) {
      console.error('Error updating order:', error);
    }
  };
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  };

  const markAllAdminMessagesAsRead = async () => {
    try {
      const unreadMessages = adminMessages.filter(msg => !msg.isRead);
      if (unreadMessages.length === 0) return;
      await Promise.all(
        unreadMessages.map(msg => 
          fetch('/api/admin/messages', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messageId: msg.id })
          })
        )
      );
      setAdminMessages(prev => prev.map(m => ({ ...m, isRead: true })));
    } catch (error) {
      // no-op
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
            <p className="mt-4 text-slate-300">Checking authentication...</p>
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
            title={`Welcome back, ${user.name}`}
            subtitle="Here's what's happening with your account today."
            onSearch={(query) => setQuery(query)}
          />

          {/* Database Status Banner */}
          {databaseStatus === 'unavailable' && (
            <div className="px-6 md:px-10 mt-4">
              <div role="status" aria-live="polite" className="overflow-hidden rounded-2xl border border-amber-300/20 bg-amber-300/15 p-4 text-amber-100 backdrop-blur-xl">
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

          {/* Quick Actions */}
          <div className="px-6 md:px-10 mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <QuickActionCard href="/store" title="Browse Products" subtitle="Explore latest styles" icon={ShoppingCart} glowClass="bg-cyan-400" />
            <QuickActionCard href="/cart" title="View Cart" subtitle="Review selected items" icon={ShoppingBag} glowClass="bg-emerald-400" />
            <QuickActionCard href="/quote-request" title="Request Quote" subtitle="Get a tailored offer" icon={MessageSquareQuote} glowClass="bg-amber-300" />
          </div>

          {/* Stats Grid */}
          <div className="px-6 md:px-10 mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
            <StatCard label="Total Orders" value={stats.totalOrders} icon={Package} active={activeStat === 'total'} onClick={() => { setActiveStat('total'); setCurrentFilter('all'); }} />
            <StatCard label="Saved Orders" value={stats.savedOrders} icon={Bookmark} active={activeStat === 'saved'} onClick={() => { setActiveStat('saved'); setCurrentFilter('saved'); }} />
            <StatCard label="Checkout Orders" value={stats.checkoutOrders} icon={CreditCard} active={activeStat === 'checkout'} onClick={() => { setActiveStat('checkout'); setCurrentFilter('checkout'); }} />
            <StatCard label="Completed" value={stats.completedOrders} icon={CheckCircle2} active={activeStat === 'completed'} onClick={() => { setActiveStat('completed'); setCurrentFilter('completed'); }} />
            <StatCard label="Pending" value={stats.pendingOrders} icon={Clock3} active={activeStat === 'pending'} onClick={() => { setActiveStat('pending'); setCurrentFilter('pending'); }} />
            <StatCard label="Quote Requests" value={stats.quoteRequests} icon={MessageSquareQuote} active={activeStat === 'quotes'} onClick={() => { setActiveStat('quotes'); setCurrentFilter('quotes'); }} />
          </div>

          {/* Orders / Quotes */}
          <div className="px-6 md:px-10 mt-8">
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
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-70" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search orders, IDs, products…"
                  className="h-10 w-72 rounded-xl border border-white/10 bg-black/30 pl-9 pr-3 text-sm text-white placeholder-white/40 outline-none ring-lime-400/50 transition focus:ring-2"
                />
              </div>
              <button 
                onClick={refreshData}
                className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/5 transition hover:border-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
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
              filtered.length > 0 ? (
                filtered.map((quote) => (
                  <div key={quote.id} className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 animate-fade-in-up">
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
                      <div className="hidden md:block w-40 text-right text-sm text-slate-300/80">{new Date(quote.createdAt).toLocaleDateString()}</div>
                      <div className="w-28 text-right text-sm text-white">—</div>
                    </div>
                  </div>
                ))
              ) : (
                <GlassCard className="p-8 text-center">
                  <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-xl border border-white/10 bg-white/5">
                    <CircleHelp className="h-6 w-6 opacity-70" />
                  </div>
                  <p className="text-base font-semibold text-white">No quote requests yet</p>
                  <p className="text-sm text-slate-300/80">Start by requesting a custom quote.</p>
                  <div className="mt-4">
                    <Link
                      href="/quote-request"
                      className="inline-flex items-center px-4 py-2 rounded-full bg-lime-400 text-sm font-semibold text-black shadow-[0_0_24px_rgba(132,204,22,0.45)] transition hover:-translate-y-0.5"
                    >
                      Request Quote
                    </Link>
                  </div>
                </GlassCard>
              )
            ) : (
                            // Orders View
              filtered.length > 0 ? (
                filtered.map((order) => {
                  // Type guard to ensure we're working with Order type
                  if ('orderSource' in order) {
                    const orderItem = order as Order;
                    return (
                      <div key={orderItem.id} className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 animate-fade-in-up">
                    <div className="flex items-center gap-4 p-4">
                                              <button
                          onClick={() => toggleOrderExpansion(orderItem.id)}
                          aria-expanded={expandedOrder === orderItem.id}
                          aria-controls={`panel-${orderItem.id}`}
                          className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-black/40 transition hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                        >
                          {expandedOrder === orderItem.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          <span className="sr-only">Toggle details</span>
                        </button>
                        <div className="hidden sm:flex sm:w-12 sm:items-center sm:justify-center">
                          {orderItem.orderSource === 'PRODUCT_CUSTOMIZATION' ? (
                            <Bookmark className="h-5 w-5 opacity-80" />
                          ) : (
                            <Package className="h-5 w-5 opacity-80" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-white">{orderItem.productName}</p>
                          <p className="truncate text-xs text-slate-300/80">Order ID: {orderItem.id.slice(-8)}</p>
                        </div>
                        <div className="hidden md:block">
                          <StatusBadge status={orderItem.status} />
                        </div>
                        <div className="hidden md:block w-40 text-right text-sm text-slate-300/80">{new Date(orderItem.createdAt).toLocaleDateString()}</div>
                        <div className="w-28 text-right text-sm text-white">
                          {orderItem.orderTotal ? formatPrice(orderItem.orderTotal) : '—'}
                        </div>
                    </div>
                    
                    {expandedOrder === orderItem.id && (
                      <div id={`panel-${orderItem.id}`} className="grid grid-cols-1 gap-4 border-t border-white/10 p-4 md:grid-cols-3">
                        {/* Order Information */}
                        <GlassCard className="p-4">
                          <div className="mb-3 flex items-center gap-2 text-white">
                            <FileText className="h-4 w-4 opacity-80" />
                            <h4 className="text-sm font-semibold">Order Information</h4>
                          </div>
                          <dl className="space-y-2 text-sm text-slate-300/90">
                            <div className="flex justify-between"><dt className="opacity-80">Type</dt><dd>{orderItem.orderSource === 'PRODUCT_CUSTOMIZATION' ? 'Saved Order' : 'Checkout Order'}</dd></div>
                            <div className="flex justify-between"><dt className="opacity-80">Status</dt><dd><StatusBadge status={orderItem.status} /></dd></div>
                            <div className="flex justify-between"><dt className="opacity-80">Date</dt><dd>{new Date(orderItem.createdAt).toLocaleString()}</dd></div>
                          </dl>
                        </GlassCard>

                        {/* Status & Tracking */}
                        <GlassCard className="p-4">
                          <div className="mb-3 flex items-center gap-2 text-white">
                            <Truck className="h-4 w-4 opacity-80" />
                            <h4 className="text-sm font-semibold">Status & Tracking</h4>
                          </div>
                          <dl className="space-y-2 text-sm text-slate-300/90">
                            <div className="flex justify-between"><dt className="opacity-80">Tracking #</dt><dd>{(orderItem.status === 'SHIPPED' || orderItem.status === 'DELIVERED') ? (orderItem.trackingNumber || generateTrackingNumber(orderItem.id)) : '—'}</dd></div>
                            <div className="flex justify-between"><dt className="opacity-80">Est. Delivery</dt><dd>{orderItem.status === 'DELIVERED' ? 'Delivered' : generateEstimatedDelivery(orderItem.createdAt)}</dd></div>
                            <div className="flex justify-between"><dt className="opacity-80">Total</dt><dd>{orderItem.orderTotal ? formatPrice(orderItem.orderTotal) : '—'}</dd></div>
                            <div className="flex justify-between"><dt className="opacity-80">Payment</dt><dd>{orderItem.paymentProcessed ? 'Paid' : orderItem.orderSource === 'PRODUCT_CUSTOMIZATION' ? 'Saved (No Payment)' : 'Pending'}</dd></div>
                          </dl>
                        </GlassCard>

                        {/* Product Details */}
                        <GlassCard className="p-4">
                          <div className="mb-3 flex items-center gap-2 text-white">
                            <Package className="h-4 w-4 opacity-80" />
                            <h4 className="text-sm font-semibold">Product Details</h4>
                          </div>
                          <dl className="space-y-2 text-sm text-slate-300/90">
                            <div className="flex justify-between"><dt className="opacity-80">Product</dt><dd className="text-right">{orderItem.productName}</dd></div>
                            <div className="flex justify-between"><dt className="opacity-80">Colors</dt><dd className="text-right">{Object.keys(orderItem.selectedColors || {}).join(', ') || 'Not specified'}</dd></div>
                          </dl>
                        </GlassCard>

                        {/* Actions */}
                        <div className="md:col-span-3 flex flex-wrap gap-3">
                          {orderItem.orderSource === 'PRODUCT_CUSTOMIZATION' && (
                            <button
                              onClick={() => handleEditOrder(orderItem)}
                              className="rounded-full bg-lime-400 px-4 py-2 text-sm font-semibold text-black shadow-[0_0_24px_rgba(132,204,22,0.45)] transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                            >
                              Edit
                            </button>
                          )}
                          
                          {orderItem.orderSource === 'PRODUCT_CUSTOMIZATION' && (
                            <Link
                              href={`/checkout?orderId=${orderItem.id}`}
                              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:border-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                            >
                              Checkout
                            </Link>
                          )}
                          
                          {(orderItem.status === 'CONFIRMED' || orderItem.status === 'PROCESSING' || orderItem.status === 'SHIPPED' || orderItem.status === 'DELIVERED' || orderItem.status === 'CANCELLED') && (
                            <button
                              onClick={() => handleEditOrder(orderItem)}
                              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:border-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                            >
                              Reorder
                            </button>
                          )}
                          
                          {(orderItem.status === 'SHIPPED' || orderItem.status === 'DELIVERED') && (
                            <button className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:border-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black">
                              Track
                            </button>
                          )}
                          
                          <Link
                            href={`/messages?start=support&category=order&orderId=${orderItem.id}`}
                            className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:border-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                          >
                            Contact Support
                          </Link>
                        </div>
                                              </div>
                      )}
                    </div>
                  );
                  }
                  return null;
                })
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
                    <Link
                      href="/store"
                      className="inline-flex items-center px-4 py-2 rounded-full bg-lime-400 text-sm font-semibold text-black shadow-[0_0_24px_rgba(132,204,22,0.45)] transition hover:-translate-y-0.5"
                    >
                      Start Shopping
                    </Link>
                  </div>
                </GlassCard>
              )
            )}
          </div>

          <div className="h-16" />
        </div>
        </DashboardContent>
      </div>

      {/* Edit Order Modal */}
      {editOrderModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-black/80 border border-white/10 rounded-2xl p-6 w-full max-w-2xl mx-4">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-white">Edit Saved Order</h3>
                <p className="text-sm text-slate-400 mt-1">Edit your saved order details</p>
              </div>
              <button
                onClick={() => setEditOrderModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Product Name</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 rounded-xl border border-white/10 bg-white/5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-lime-400/50"
                    defaultValue={selectedOrder.productName}
                    onChange={(e) => {
                      const updatedOrder = { ...selectedOrder, productName: e.target.value };
                      setSelectedOrder(updatedOrder);
                    }}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Order Total</label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full px-3 py-2 rounded-xl border border-white/10 bg-white/5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-lime-400/50"
                    defaultValue={selectedOrder.orderTotal || 0}
                    onChange={(e) => {
                      const updatedOrder = { ...selectedOrder, orderTotal: parseFloat(e.target.value) };
                      setSelectedOrder(updatedOrder);
                    }}
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Selected Colors</label>
                <textarea
                  className="w-full px-3 py-2 rounded-xl border border-white/10 bg-white/5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-lime-400/50 min-h-[80px]"
                  placeholder="Enter color selections..."
                  defaultValue={Object.keys(selectedOrder.selectedColors || {}).join(', ')}
                  onChange={(e) => {
                    const colors = e.target.value.split(',').map(c => c.trim()).filter(c => c);
                    const selectedColors = colors.reduce((acc, color) => ({ ...acc, [color]: true }), {});
                    const updatedOrder = { ...selectedOrder, selectedColors };
                    setSelectedOrder(updatedOrder);
                  }}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Notes</label>
                <textarea
                  className="w-full px-3 py-2 rounded-xl border border-white/10 bg-white/5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-lime-400/50 min-h-[80px]"
                  placeholder="Add any additional notes or specifications..."
                  defaultValue={selectedOrder.customerInfo.company || ''}
                  onChange={(e) => {
                    const updatedOrder = { 
                      ...selectedOrder, 
                      customerInfo: { ...selectedOrder.customerInfo, company: e.target.value }
                    };
                    setSelectedOrder(updatedOrder);
                  }}
                />
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => handleSaveOrderChanges(selectedOrder)}
                className="rounded-full bg-lime-400 px-4 py-2 text-sm font-semibold text-black shadow-[0_0_24px_rgba(132,204,22,0.45)] transition hover:-translate-y-0.5"
              >
                Save Changes
              </button>
              <button
                onClick={() => setEditOrderModal(false)}
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:border-white/20"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
