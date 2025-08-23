
'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
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

// -----------------------------------------------------------------------------
// Member Dashboard Page (App Router /page.tsx)
// Glass UI + animations and ambient background inspired by the provided HTML ref
// -----------------------------------------------------------------------------

// Types
 type Role = 'Member' | 'Admin';
 type Status = 'Saved' | 'Checkout' | 'Completed' | 'Pending' | 'Quote';
 type OrderType = 'Order' | 'Quote';

 interface OrderItem {
  id: string;
  type: OrderType;
  product: string;
  status: Status;
  date: string; // ISO or human date
  total: number; // in USD for demo
  paymentStatus: 'Paid' | 'Unpaid' | 'Refunded' | 'Partial';
  tracking?: string;
  estDelivery?: string;
  colors: string[];
  sizes: string[];
}

// Demo data (replace with real data from your API later)
const DEMO_ORDERS: OrderItem[] = [
  {
    id: 'ORD-2025-00124',
    type: 'Order',
    product: 'StreetFrame 6 – Black/Lime',
    status: 'Completed',
    date: '2025-08-10',
    total: 289.5,
    paymentStatus: 'Paid',
    tracking: '1Z45A89D00293811',
    estDelivery: '2025-08-14',
    colors: ['Black', 'Lime'],
    sizes: ['OSFM'],
  },
  {
    id: 'ORD-2025-00125',
    type: 'Order',
    product: 'StreetFrame 6 – Navy/White',
    status: 'Pending',
    date: '2025-08-12',
    total: 154.0,
    paymentStatus: 'Unpaid',
    tracking: undefined,
    estDelivery: '2025-08-20',
    colors: ['Navy', 'White'],
    sizes: ['S', 'M', 'L'],
  },
  {
    id: 'SAV-2025-00087',
    type: 'Order',
    product: 'ProCrown – Heather Gray',
    status: 'Saved',
    date: '2025-08-16',
    total: 99.0,
    paymentStatus: 'Unpaid',
    colors: ['Heather Gray'],
    sizes: ['OSFM'],
  },
  {
    id: 'CHK-2025-00022',
    type: 'Order',
    product: 'UrbanCurve – Olive',
    status: 'Checkout',
    date: '2025-08-17',
    total: 182.25,
    paymentStatus: 'Partial',
    colors: ['Olive'],
    sizes: ['M', 'L'],
  },
  {
    id: 'QTE-2025-00310',
    type: 'Quote',
    product: 'TeamSnap – Scarlet/Black (Custom Logo)',
    status: 'Quote',
    date: '2025-08-15',
    total: 1240.0,
    paymentStatus: 'Unpaid',
    colors: ['Scarlet', 'Black'],
    sizes: ['S', 'M', 'L', 'XL'],
  },
  {
    id: 'ORD-2025-00126',
    type: 'Order',
    product: 'StreetFrame 6 – Graphite',
    status: 'Completed',
    date: '2025-08-12',
    total: 210.0,
    paymentStatus: 'Paid',
    tracking: '1Z45A89D00294857',
    estDelivery: '2025-08-16',
    colors: ['Graphite'],
    sizes: ['OSFM'],
  },
  {
    id: 'ORD-2025-00127',
    type: 'Order',
    product: 'UrbanCurve – Sand',
    status: 'Pending',
    date: '2025-08-13',
    total: 75.0,
    paymentStatus: 'Unpaid',
    colors: ['Sand'],
    sizes: ['S', 'M'],
  },
  {
    id: 'ORD-2025-00128',
    type: 'Order',
    product: 'ProCrown – Jet Black',
    status: 'Checkout',
    date: '2025-08-18',
    total: 325.99,
    paymentStatus: 'Partial',
    colors: ['Black'],
    sizes: ['OSFM'],
  },
];

const STATUS_LABELS: Record<Status, string> = {
  Saved: 'Saved',
  Checkout: 'Checkout',
  Completed: 'Completed',
  Pending: 'Pending',
  Quote: 'Quote Request',
};

// Status badge styles
function StatusBadge({ status }: { status: Status }) {
  const styles: Record<Status, string> = {
    Completed: 'bg-emerald-400/15 text-emerald-300 border-emerald-400/30',
    Pending: 'bg-amber-400/15 text-amber-300 border-amber-400/30',
    Checkout: 'bg-cyan-400/15 text-cyan-300 border-cyan-400/30',
    Saved: 'bg-slate-400/15 text-slate-300 border-slate-400/30',
    Quote: 'bg-purple-400/15 text-purple-300 border-purple-400/30',
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${styles[status]}`}
    >
      {status === 'Completed' && <CheckCircle2 className="h-3.5 w-3.5" />}
      {status === 'Pending' && <Clock3 className="h-3.5 w-3.5" />}
      {status === 'Checkout' && <CreditCard className="h-3.5 w-3.5" />}
      {status === 'Saved' && <Bookmark className="h-3.5 w-3.5" />}
      {status === 'Quote' && <MessageSquareQuote className="h-3.5 w-3.5" />}
      {STATUS_LABELS[status]}
    </span>
  );
}

// Glass card wrapper (adds shared hover motion like the ref's .card-hover)
function GlassCard({ className = '', children }: React.PropsWithChildren<{ className?: string }>) {
  return (
    <div
      className={`rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.6)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_50px_rgba(132,204,22,0.10)] ${className}`}
    >
      {children}
    </div>
  );
}

// Quick Action Card (gradient glow pad inspired by ref)
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

// Stat Card (with active ring highlight)
function StatCard({ label, value, icon: Icon, active, onClick }: { label: string; value: number | string; icon: any; active?: boolean; onClick?: () => void; }) {
  return (
    <button
      onClick={onClick}
      className={`group relative flex w-full flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-left backdrop-blur-xl transition-all duration-200 hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black ${active ? 'ring-2 ring-lime-400/60' : ''}`}
    >
      <div className="absolute inset-0 rounded-2xl opacity-0 ring-1 ring-white/5 transition group-hover:opacity-100" />
      <Icon className="h-5 w-5 opacity-80" />
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-bold text-white">{value}</span>
      </div>
      <span className="text-sm text-slate-300/80">{label}</span>
    </button>
  );
}

// Row for order list
function OrderRow({ item, expanded, onToggle }: { item: OrderItem; expanded: boolean; onToggle: () => void; }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 animate-fade-in-up">
      <div className="flex items-center gap-4 p-4">
        <button
          onClick={onToggle}
          aria-expanded={expanded}
          aria-controls={`panel-${item.id}`}
          className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-black/40 transition hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
        >
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <span className="sr-only">Toggle details</span>
        </button>
        <div className="hidden sm:flex sm:w-12 sm:items-center sm:justify-center">
          {item.type === 'Order' ? (
            <Package className="h-5 w-5 opacity-80" />
          ) : (
            <MessageSquareQuote className="h-5 w-5 opacity-80" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-white">{item.product}</p>
          <p className="truncate text-xs text-slate-300/80">{item.id}</p>
        </div>
        <div className="hidden md:block">
          <StatusBadge status={item.status} />
        </div>
        <div className="hidden md:block w-40 text-right text-sm text-slate-300/80">{new Date(item.date).toLocaleDateString()}</div>
        <div className="w-28 text-right text-sm text-white">${item.total.toFixed(2)}</div>
      </div>
      {expanded && (
        <div id={`panel-${item.id}`} className="grid grid-cols-1 gap-4 border-t border-white/10 p-4 md:grid-cols-3">
          {/* Order Information */}
          <GlassCard className="p-4">
            <div className="mb-3 flex items-center gap-2 text-white">
              <FileText className="h-4 w-4 opacity-80" />
              <h4 className="text-sm font-semibold">Order Information</h4>
            </div>
            <dl className="space-y-2 text-sm text-slate-300/90">
              <div className="flex justify-between"><dt className="opacity-80">Type</dt><dd>{item.type}</dd></div>
              <div className="flex justify-between"><dt className="opacity-80">Status</dt><dd><StatusBadge status={item.status} /></dd></div>
              <div className="flex justify-between"><dt className="opacity-80">Date</dt><dd>{new Date(item.date).toLocaleString()}</dd></div>
            </dl>
          </GlassCard>

          {/* Status & Tracking */}
          <GlassCard className="p-4">
            <div className="mb-3 flex items-center gap-2 text-white">
              <Truck className="h-4 w-4 opacity-80" />
              <h4 className="text-sm font-semibold">Status & Tracking</h4>
            </div>
            <dl className="space-y-2 text-sm text-slate-300/90">
              <div className="flex justify-between"><dt className="opacity-80">Tracking #</dt><dd>{item.tracking ?? '—'}</dd></div>
              <div className="flex justify-between"><dt className="opacity-80">Est. Delivery</dt><dd>{item.estDelivery ?? '—'}</dd></div>
              <div className="flex justify-between"><dt className="opacity-80">Total</dt><dd>${item.total.toFixed(2)}</dd></div>
              <div className="flex justify-between"><dt className="opacity-80">Payment</dt><dd>{item.paymentStatus}</dd></div>
            </dl>
          </GlassCard>

          {/* Product Details */}
          <GlassCard className="p-4">
            <div className="mb-3 flex items-center gap-2 text-white">
              <Package className="h-4 w-4 opacity-80" />
              <h4 className="text-sm font-semibold">Product Details</h4>
            </div>
            <dl className="space-y-2 text-sm text-slate-300/90">
              <div className="flex justify-between"><dt className="opacity-80">Product</dt><dd className="text-right">{item.product}</dd></div>
              <div className="flex justify-between"><dt className="opacity-80">Colors</dt><dd className="text-right">{item.colors.join(', ')}</dd></div>
              <div className="flex justify-between"><dt className="opacity-80">Sizes</dt><dd className="text-right">{item.sizes.join(', ')}</dd></div>
            </dl>
          </GlassCard>

          {/* Actions */}
          <div className="md:col-span-3 flex flex-wrap gap-3">
            <button className="rounded-full bg-lime-400 px-4 py-2 text-sm font-semibold text-black shadow-[0_0_24px_rgba(132,204,22,0.45)] transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black">
              Edit
            </button>
            <button className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:border-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black">
              Checkout
            </button>
            <button className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:border-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black">
              Reorder
            </button>
            <button className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:border-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black">
              Track
            </button>
            <button className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:border-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black">
              Contact Support
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MemberDashboardPage() {
  // Replace with real auth/user context
  const user = {
    name: 'Rasel',
    email: 'rasel@example.com',
    role: 'Member' as Role,
    level: 'Silver',
    activeSince: '2024-02-10',
    unread: 3,
  };

  const [maintenanceActive] = useState<boolean>(false); // Toggle to true to show banner
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<Status | 'All'>('All');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [activeStat, setActiveStat] = useState<string>('');

  const orders = useMemo(() => DEMO_ORDERS, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return orders.filter((o) => {
      const matchesFilter = activeFilter === 'All' ? true : o.status === activeFilter;
      const matchesQuery = q
        ? [o.product, o.id, o.status, o.type, o.colors.join(','), o.sizes.join(',')]
            .join(' ')
            .toLowerCase()
            .includes(q)
        : true;
      return matchesFilter && matchesQuery;
    });
  }, [orders, query, activeFilter]);

  const counts = useMemo(() => {
    return orders.reduce(
      (acc, o) => {
        acc.total += 1;
        if (o.status === 'Saved') acc.saved += 1;
        if (o.status === 'Checkout') acc.checkout += 1;
        if (o.status === 'Completed') acc.completed += 1;
        if (o.status === 'Pending') acc.pending += 1;
        if (o.type === 'Quote' || o.status === 'Quote') acc.quotes += 1;
        return acc;
      },
      { total: 0, saved: 0, checkout: 0, completed: 0, pending: 0, quotes: 0 }
    );
  }, [orders]);

  const filters: (Status | 'All')[] = ['All', 'Saved', 'Checkout', 'Completed', 'Pending', 'Quote'];

  return (
    <main className="relative">
      {/* Ambient background: gradient + accent glows + decorative SVG lines inspired by ref */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-black via-[#05070e] to-black" />
        <div className="absolute inset-0 bg-[radial-gradient(1200px_600px_at_50%_-10%,rgba(255,255,255,0.06),transparent_60%)]" />
        <div className="absolute left-1/4 top-8 h-96 w-96 rounded-full bg-lime-400/10 blur-3xl" />
        <div className="absolute right-1/4 bottom-8 h-96 w-96 rounded-full bg-cyan-400/10 blur-3xl" />
        {/* Decorative arcs */}
        <svg className="absolute -left-40 top-20 opacity-20" width="600" height="600" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0 0C120 180 360 180 600 0" stroke="url(#grad1)" strokeWidth="2"></path>
          <path d="M0 100C120 280 360 280 600 100" stroke="url(#grad1)" strokeWidth="1" opacity="0.5"></path>
          <defs>
            <linearGradient id="grad1" x1="0" y1="0" x2="600" y2="0" gradientUnits="userSpaceOnUse">
              <stop stopColor="#ffffff" stopOpacity="0"></stop>
              <stop offset="0.5" stopColor="#9eff37" stopOpacity=".3"></stop>
              <stop offset="1" stopColor="#ffffff" stopOpacity="0"></stop>
            </linearGradient>
          </defs>
        </svg>
        <svg className="absolute right-0 bottom-10 opacity-15" width="800" height="500" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M800 500C550 350 250 350 0 500" stroke="url(#grad2)" strokeWidth="2"></path>
          <path d="M800 400C550 250 250 250 0 400" stroke="url(#grad2)" strokeWidth="1" opacity="0.6"></path>
          <defs>
            <linearGradient id="grad2" x1="800" y1="500" x2="0" y2="500" gradientUnits="userSpaceOnUse">
              <stop stopColor="#ffffff" stopOpacity="0"></stop>
              <stop offset="0.5" stopColor="#9eff37" stopOpacity=".2"></stop>
              <stop offset="1" stopColor="#ffffff" stopOpacity="0"></stop>
            </linearGradient>
          </defs>
        </svg>
      </div>

      <div className="mx-auto max-w-[1800px] px-6 md:px-10">
        {/* Header */}
        <div className="mb-6 mt-6 grid grid-cols-1 items-start gap-4 lg:grid-cols-3 animate-fade-in-up">
          <div className="lg:col-span-2">
            <div className="inline-flex items-center px-3 py-1.5 rounded-full bg-lime-400/10 border border-lime-400/20 text-lime-400 text-xs font-medium mb-3">
              Live Sync
              <span className="ml-2 h-1.5 w-1.5 rounded-full bg-lime-400 animate-pulse" />
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-white md:text-5xl">Welcome back, {user.name}</h1>
            <p className="mt-2 text-slate-300/80">Here’s what’s happening with your account today.</p>
          </div>
          <div className="flex items-start justify-end gap-4 animate-fade-in-up">
            {/* Notification bell */}
            <button
              aria-label="Notifications"
              className="relative grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            >
              <Bell className="h-5 w-5" />
              {user.unread > 0 && (
                <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-rose-500 text-[10px] font-bold text-white">
                  {user.unread}
                  <span className="absolute -z-10 h-5 w-5 animate-ping rounded-full bg-rose-500/60" />
                </span>
              )}
            </button>

            {/* Quick status card */}
            <GlassCard className="flex items-center gap-4 p-4">
              <div className="grid h-12 w-12 place-items-center rounded-xl border border-white/10 bg-black/40">
                {user.role === 'Admin' ? <Crown className="h-6 w-6" /> : <User className="h-6 w-6" />}
              </div>
              <div>
                <p className="text-sm text-slate-300/90">Role</p>
                <p className="text-base font-semibold text-white">
                  {user.role === 'Admin' ? '👑 Admin' : '👤 Member'}
                  <span className="ml-2 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs font-medium text-slate-200/90">Level: {user.level}</span>
                </p>
                <p className="text-xs text-slate-300/80">Active since {new Date(user.activeSince).toLocaleDateString()}</p>
              </div>
            </GlassCard>
          </div>
        </div>

        {/* Maintenance banner */}
        {maintenanceActive && (
          <div role="status" aria-live="polite" className="mb-6 overflow-hidden rounded-2xl border border-amber-300/20 bg-amber-300/15 p-4 text-amber-100 backdrop-blur-xl animate-fade-in-up">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5" />
              <p className="font-medium">Database maintenance in progress. Some data may be delayed.</p>
            </div>
            <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-amber-100/20">
              <div className="h-full w-1/3 animate-pulse rounded-full bg-amber-300/60" />
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 animate-fade-in-up">
          <QuickActionCard href="/products" title="Browse Products" subtitle="Explore latest styles" icon={ShoppingCart} glowClass="bg-cyan-400" />
          <QuickActionCard href="/cart" title="View Cart" subtitle="Review selected items" icon={ShoppingBag} glowClass="bg-emerald-400" />
          <QuickActionCard href="/quote" title="Request Quote" subtitle="Get a tailored offer" icon={MessageSquareQuote} glowClass="bg-amber-300" />
        </div>

        {/* Stats Grid */}
        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6 animate-fade-in-up">
          <StatCard label="Total Orders" value={counts.total} icon={Package} active={activeStat === 'total'} onClick={() => { setActiveStat('total'); setActiveFilter('All'); }} />
          <StatCard label="Saved Orders" value={counts.saved} icon={Bookmark} active={activeStat === 'saved'} onClick={() => { setActiveStat('saved'); setActiveFilter('Saved'); }} />
          <StatCard label="Checkout Orders" value={counts.checkout} icon={CreditCard} active={activeStat === 'checkout'} onClick={() => { setActiveStat('checkout'); setActiveFilter('Checkout'); }} />
          <StatCard label="Completed" value={counts.completed} icon={CheckCircle2} active={activeStat === 'completed'} onClick={() => { setActiveStat('completed'); setActiveFilter('Completed'); }} />
          <StatCard label="Pending" value={counts.pending} icon={Clock3} active={activeStat === 'pending'} onClick={() => { setActiveStat('pending'); setActiveFilter('Pending'); }} />
          <StatCard label="Quote Requests" value={counts.quotes} icon={MessageSquareQuote} active={activeStat === 'quotes'} onClick={() => { setActiveStat('quotes'); setActiveFilter('Quote'); }} />
        </div>

        {/* Orders / Quotes */}
        <div className="mt-8 animate-fade-in-up">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {(['All','Saved','Checkout','Completed','Pending','Quote'] as (Status|'All')[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setActiveFilter(f)}
                  className={`rounded-full border px-3 py-1.5 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black ${activeFilter === f ? 'border-lime-400/40 bg-lime-400/20 text-white' : 'border-white/10 bg-white/5 text-slate-200/90 hover:border-white/20'}`}
                >
                  {f === 'All' ? 'All' : STATUS_LABELS[f as Status]}
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
              <button className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/5 transition hover:border-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black">
                <Filter className="h-4 w-4" />
                <span className="sr-only">Open filters</span>
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {filtered.map((item) => (
              <OrderRow key={item.id} item={item} expanded={!!expanded[item.id]} onToggle={() => setExpanded((prev) => ({ ...prev, [item.id]: !prev[item.id] }))} />
            ))}
            {filtered.length === 0 && (
              <GlassCard className="p-8 text-center">
                <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-xl border border-white/10 bg-white/5">
                  <CircleHelp className="h-6 w-6 opacity-70" />
                </div>
                <p className="text-base font-semibold text-white">No orders match your search</p>
                <p className="text-sm text-slate-300/80">Try adjusting filters or keywords.</p>
              </GlassCard>
            )}
          </div>
        </div>

        <div className="h-16" />
      </div>

      {/* Inline global styles to mirror reference animations without editing globals.css */}
      <style jsx global>{`
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in-up { animation: fadeInUp .8s ease-out both; }
      `}</style>
    </main>
  );
}
