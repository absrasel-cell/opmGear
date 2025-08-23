'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  FileText,
  Percent,
  LayoutTemplate,
  Users,
  Calendar,
  Calculator,
  Save,
  Plus,
  Search,
  Check,
  ChevronDown,
  Building2,
  SlidersHorizontal,
  Sparkles,
  Eye,
  Send,
  XCircle,
  CheckCircle2,
  Undo2,
  Beaker,
  Edit,
  Trash2,
  X
} from 'lucide-react';

// Import design system components
import {
  DashboardShell,
  DashboardContent,
  GlassCard,
  Button
} from '@/components/ui/dashboard';
import Sidebar from '@/components/ui/dashboard/Sidebar';
import DashboardHeader from '@/components/ui/dashboard/DashboardHeader';

interface Order {
  id: string;
  customer: string;
  items: number;
  factory: number;
  due: string;
  status: string;
}

interface Partner {
  name: string;
  id: string;
  email: string;
  role: string;
  status: string;
}

interface MarginRow {
  key: string;
  label: string;
  factory: number;
  percent: number;
  flat: number;
}

export default function BillingDashboard() {
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();
  
  // State
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [currentTab, setCurrentTab] = useState<'invoices' | 'discounts' | 'templates'>('invoices');
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [discountPercent, setDiscountPercent] = useState(0);
  const [discountFlat, setDiscountFlat] = useState(0);
  const [globalDiscountPercent, setGlobalDiscountPercent] = useState(0);
  const [globalDiscountFlat, setGlobalDiscountFlat] = useState(0);
  const [testFactoryAmount, setTestFactoryAmount] = useState(120);
  const [customerFilter, setCustomerFilter] = useState('');
  const [partnerSearchFilter, setPartnerSearchFilter] = useState('');
  const [globalScope, setGlobalScope] = useState(true);
  
  // Modal states
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [partnerModalOpen, setPartnerModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [editingPartnerIndex, setEditingPartnerIndex] = useState<number | null>(null);
  
  // Form states
  const [partnerForm, setPartnerForm] = useState({
    name: '',
    id: '',
    email: '',
    role: 'Partner',
    status: 'Active'
  });

  // Mock data
  const [orders] = useState<Order[]>([
    { id: 'OPM-1021', customer: 'Resale Team A', items: 240, factory: 840.00, due: '2025-09-02', status: 'Ready' },
    { id: 'OPM-1019', customer: 'ACME Co.', items: 120, factory: 430.25, due: '2025-08-29', status: 'Pending' },
    { id: 'OPM-1014', customer: 'Resale Team B', items: 80, factory: 295.00, due: '2025-08-26', status: 'Ready' },
    { id: 'OPM-1007', customer: 'ACME Co.', items: 300, factory: 1080.75, due: '2025-09-05', status: 'In-Prod' },
    { id: 'OPM-0998', customer: 'Resale Team A', items: 60, factory: 210.10, due: '2025-08-22', status: 'Ready' }
  ]);

  const [partners, setPartners] = useState<Partner[]>([
    { name: 'OPM Gear', id: 'usr_og_01', email: 'ops@opmgear.com', role: 'Admin', status: 'Active' },
    { name: 'US Custom Caps', id: 'usr_us_02', email: 'support@uscc.com', role: 'Partner', status: 'Pending' },
    { name: 'CBC', id: 'usr_cbc_03', email: 'hello@cbc.com', role: 'Reseller', status: 'Active' }
  ]);

  const [marginState, setMarginState] = useState<MarginRow[]>([]);
  const [selectedMember, setSelectedMember] = useState<string>('');
  const [showDetailedCustomization, setShowDetailedCustomization] = useState(false);

  // Check admin access and load data
  useEffect(() => {
    if (loading) return;
    
    if (!isAuthenticated || !user) {
      router.push('/login');
      return;
    }
    
    const isMasterAdmin = user.email === 'absrasel@gmail.com';
    if (user.role !== 'ADMIN' && !isMasterAdmin) {
      router.push('/dashboard/member');
      return;
    }
    
    // Load margin settings
    loadMarginSettings();
    loadPartners();
  }, [user, loading, isAuthenticated, router]);

  // Load margin settings from API
  const loadMarginSettings = async () => {
    try {
      const response = await fetch('/api/billing/margins');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Group similar items and create simplified initial view
          const simplifiedMargins = [
            {
              key: 'blank_caps',
              label: 'Blank Caps',
              factory: 3.50,
              percent: 20,
              flat: 0
            },
            {
              key: 'customization_combined',
              label: 'Customization (Combined)',
              factory: 0.75,
              percent: 35,
              flat: 0.08
            },
            {
              key: 'delivery_combined',
              label: 'Delivery (Combined)',
              factory: 2.00,
              percent: 18,
              flat: 0.50
            }
          ];
          setMarginState(simplifiedMargins);
        }
      } else {
        // Fallback to simplified data if API fails
        const fallbackMargins = [
          {
            key: 'blank_caps',
            label: 'Blank Caps',
            factory: 3.50,
            percent: 20,
            flat: 0
          },
          {
            key: 'customization_combined',
            label: 'Customization (Combined)',
            factory: 0.75,
            percent: 35,
            flat: 0.08
          },
          {
            key: 'delivery_combined',
            label: 'Delivery (Combined)',
            factory: 2.00,
            percent: 18,
            flat: 0.50
          }
        ];
        setMarginState(fallbackMargins);
      }
    } catch (error) {
      console.error('Error loading margin settings:', error);
      // Fallback data
      const fallbackMargins = [
        {
          key: 'blank_caps',
          label: 'Blank Caps',
          factory: 3.50,
          percent: 20,
          flat: 0
        },
        {
          key: 'customization_combined',
          label: 'Customization (Combined)',
          factory: 0.75,
          percent: 35,
          flat: 0.08
        },
        {
          key: 'delivery_combined',
          label: 'Delivery (Combined)',
          factory: 2.00,
          percent: 18,
          flat: 0.50
        }
      ];
      setMarginState(fallbackMargins);
    }
  };

  // Load partners from API
  const loadPartners = async () => {
    try {
      const response = await fetch('/api/billing/partners');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setPartners(data.data);
        }
      }
    } catch (error) {
      console.error('Error loading partners:', error);
    }
  };

  // Save margin settings
  const saveMarginSettings = async () => {
    try {
      const formattedSettings = marginState.map((margin, index) => ({
        id: (index + 1).toString(),
        productType: margin.label,
        category: margin.key,
        factoryCost: margin.factory,
        marginPercent: margin.percent,
        flatMargin: margin.flat
      }));

      const response = await fetch('/api/billing/margins', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          settings: formattedSettings,
          scope: globalScope ? 'global' : 'per_member'
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          showToast('Margin settings saved successfully');
        } else {
          showToast('Failed to save margin settings');
        }
      }
    } catch (error) {
      console.error('Error saving margin settings:', error);
      showToast('Error saving margin settings');
    }
  };

  // Utility functions
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  const showToast = (message: string) => {
    // Simple alert for now - can be replaced with toast library
    alert(message);
  };

  // Calculate invoice summary
  const calculateSummary = () => {
    const subtotal = Array.from(selectedOrders).reduce((acc, orderId) => {
      const order = orders.find(o => o.id === orderId);
      return acc + (order?.factory || 0);
    }, 0);
    
    const discPct = (subtotal * discountPercent) / 100;
    const total = Math.max(0, subtotal - discPct - discountFlat);
    
    return { subtotal, total, count: selectedOrders.size };
  };

  // Calculate test discount preview
  const calculateTestPreview = () => {
    const afterPercent = Math.max(0, testFactoryAmount - (testFactoryAmount * globalDiscountPercent / 100));
    const afterFlat = Math.max(0, testFactoryAmount - globalDiscountFlat);
    const combined = Math.max(0, testFactoryAmount - (testFactoryAmount * globalDiscountPercent / 100) - globalDiscountFlat);
    
    return { afterPercent, afterFlat, combined };
  };

  // Calculate partner cost preview
  const calculatePartnerCost = (factory: number, percent: number, flat: number) => {
    return Math.max(0, factory + (factory * percent / 100) + flat);
  };

  // Filter orders based on customer selection
  const filteredOrders = customerFilter ? orders.filter(o => o.customer === customerFilter) : orders;
  
  // Filter partners based on search
  const filteredPartners = partners.filter(p => 
    `${p.name} ${p.email} ${p.id}`.toLowerCase().includes(partnerSearchFilter.toLowerCase())
  );

  const summary = calculateSummary();
  const testPreview = calculateTestPreview();

  const isMasterAdmin = user?.email === 'absrasel@gmail.com';
  
  if (loading) {
    return (
      <DashboardShell>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-lime-400 mx-auto"></div>
            <p className="mt-4 text-slate-300">Loading Billing Dashboard...</p>
          </div>
        </div>
      </DashboardShell>
    );
  }

  if (!isAuthenticated || !user || (user.role !== 'ADMIN' && !isMasterAdmin)) {
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
      <div className="flex" style={{ marginTop: '50px' }}>
        {/* Sidebar */}
        <Sidebar 
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />

        {/* Main Content */}
        <DashboardContent>
          {/* Header */}
          <DashboardHeader
            title="Billing & Accounts"
            subtitle="Manage invoices, partners, and margin controls in one place."
            onSearch={(query) => console.log('Search:', query)}
          />

          {/* Billing to Resale Team / Customers Section */}
          <section className="px-6 md:px-10 mt-6">
            <GlassCard className="overflow-hidden">
              <div className="p-6 sm:p-8">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-white tracking-tight text-[28px] sm:text-[32px] md:text-[36px] font-semibold">
                      Billing to Resale Team / Customers
                    </h2>
                    <p className="text-slate-300/80 text-[15px]">Generate invoices, manage discounts, and reuse templates.</p>
                  </div>
                  <div className="hidden md:flex items-center gap-3">
                    <Button 
                      variant="ghost" 
                      className="bg-white/7.5 border border-white/10"
                      onClick={() => showToast('Template saved')}
                    >
                      <Save className="h-5 w-5 mr-2" />
                      Save Template
                    </Button>
                    <Button 
                      variant="primary"
                      disabled={summary.count === 0}
                      onClick={() => showToast(`Invoice created for ${summary.count} order${summary.count > 1 ? 's' : ''}`)}
                    >
                      <FileText className="h-5 w-5 mr-2" />
                      Create Invoice
                    </Button>
                  </div>
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-2 border-b border-white/10 mb-6">
                  <button
                    onClick={() => setCurrentTab('invoices')}
                    className={`relative inline-flex items-center gap-2 px-4 py-3 text-[15px] border-b-2 font-medium transition ${
                      currentTab === 'invoices'
                        ? 'border-lime-400 text-white'
                        : 'border-transparent text-slate-300/90 hover:text-white hover:border-white/30'
                    }`}
                  >
                    <FileText className="h-[18px] w-[18px]" />
                    <span>Invoices</span>
                  </button>
                  <button
                    onClick={() => setCurrentTab('discounts')}
                    className={`relative inline-flex items-center gap-2 px-4 py-3 text-[15px] border-b-2 font-medium transition ${
                      currentTab === 'discounts'
                        ? 'border-lime-400 text-white'
                        : 'border-transparent text-slate-300/90 hover:text-white hover:border-white/30'
                    }`}
                  >
                    <Percent className="h-[18px] w-[18px]" />
                    <span>Discounts</span>
                  </button>
                  <button
                    onClick={() => setCurrentTab('templates')}
                    className={`relative inline-flex items-center gap-2 px-4 py-3 text-[15px] border-b-2 font-medium transition ${
                      currentTab === 'templates'
                        ? 'border-lime-400 text-white'
                        : 'border-transparent text-slate-300/90 hover:text-white hover:border-white/30'
                    }`}
                  >
                    <LayoutTemplate className="h-[18px] w-[18px]" />
                    <span>Templates</span>
                  </button>
                </div>

                {/* Tab Content */}
                {currentTab === 'invoices' && (
                  <div className="space-y-6">
                    {/* Filters */}
                    <div className="flex flex-col md:flex-row md:items-center gap-3 justify-between">
                      <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative">
                          <Users className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
                          <select 
                            value={customerFilter}
                            onChange={(e) => setCustomerFilter(e.target.value)}
                            className="appearance-none w-[240px] rounded-lg bg-white/5 border border-white/10 text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-400/40 px-10 py-2.5 pr-12"
                          >
                            <option value="">All customers</option>
                            <option value="Resale Team A">Resale Team A</option>
                            <option value="Resale Team B">Resale Team B</option>
                            <option value="ACME Co.">ACME Co.</option>
                          </select>
                          <ChevronDown className="pointer-events-none absolute right-3 top-2.5 h-5 w-5 text-slate-400" />
                        </div>
                        <div className="relative">
                          <Calendar className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
                          <input 
                            type="date" 
                            className="w-[190px] rounded-lg bg-white/5 border border-white/10 text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-400/40 px-10 py-2.5"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Orders and Summary Grid */}
                    <div className="grid grid-cols-12 gap-6">
                      {/* Orders Table */}
                      <div className="col-span-12 lg:col-span-8">
                        <div className="rounded-xl bg-white/5 border border-white/10 overflow-hidden">
                          <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-white/10">
                            <div className="flex items-center gap-2">
                              <span className="text-[15px] text-slate-300">Orders</span>
                              {selectedOrders.size > 0 && (
                                <span className="rounded-full bg-lime-400/15 text-lime-300 text-xs px-2 py-0.5 border border-lime-400/20">
                                  {selectedOrders.size} selected
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-400">Factory cost shown</div>
                          </div>
                          
                          {/* Table Header */}
                          <div className="grid grid-cols-12 text-[13px] text-slate-400 px-4 sm:px-5 py-2.5 bg-white/2.5">
                            <div className="col-span-5 sm:col-span-4">Order</div>
                            <div className="hidden sm:block col-span-3">Customer</div>
                            <div className="col-span-3 sm:col-span-2">Items</div>
                            <div className="col-span-2 sm:col-span-2 text-right">Factory $</div>
                            <div className="hidden md:block col-span-1 text-right whitespace-nowrap">Due Date</div>
                          </div>
                          
                          {/* Table Rows */}
                          <div className="max-h-[320px] overflow-auto divide-y divide-white/10">
                            {filteredOrders.map((order) => (
                              <div key={order.id} className="grid grid-cols-12 items-center px-4 sm:px-5 py-3 hover:bg-white/3 transition">
                                <div className="col-span-5 sm:col-span-4 flex items-center gap-3">
                                  <label className="inline-flex items-center">
                                    <input 
                                      type="checkbox"
                                      checked={selectedOrders.has(order.id)}
                                      onChange={(e) => {
                                        const newSelected = new Set(selectedOrders);
                                        if (e.target.checked) {
                                          newSelected.add(order.id);
                                        } else {
                                          newSelected.delete(order.id);
                                        }
                                        setSelectedOrders(newSelected);
                                      }}
                                      className="sr-only peer"
                                    />
                                    <span className="mr-2 h-5 w-5 rounded-md border border-white/15 bg-white/5 flex items-center justify-center peer-checked:border-lime-400/60 peer-checked:bg-lime-400/20 transition">
                                      {selectedOrders.has(order.id) && (
                                        <Check className="h-3.5 w-3.5 text-lime-300" />
                                      )}
                                    </span>
                                  </label>
                                  <div className="flex flex-col">
                                    <span className="text-[15px] text-slate-200">{order.id}</span>
                                    <span className="text-[12px] text-slate-400 md:hidden">{order.customer}</span>
                                  </div>
                                </div>
                                <div className="hidden sm:block col-span-3 text-[14px] text-slate-300">{order.customer}</div>
                                <div className="col-span-3 sm:col-span-2 text-[14px] text-slate-300">{order.items}</div>
                                <div className="col-span-2 sm:col-span-2 text-right text-[14px] text-slate-200">
                                  {formatPrice(order.factory)}
                                </div>
                                <div className="hidden md:block col-span-1 text-right text-[13px] text-slate-400 whitespace-nowrap">{order.due}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Invoice Summary */}
                      <div className="col-span-12 lg:col-span-4">
                        <div className="rounded-xl bg-white/5 border border-white/10 p-5">
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="text-white tracking-tight text-[20px] font-semibold">Invoice Summary</h3>
                            <Calculator className="h-5 w-5 text-slate-400" />
                          </div>
                          <div className="space-y-3">
                            <div className="flex items-center justify-between text-[15px]">
                              <span className="text-slate-300">Selected orders</span>
                              <span className="text-slate-200">{summary.count}</span>
                            </div>
                            <div className="flex items-center justify-between text-[15px]">
                              <span className="text-slate-300">Subtotal (factory)</span>
                              <span className="text-slate-200">{formatPrice(summary.subtotal)}</span>
                            </div>
                            <div className="flex items-center justify-between text-[15px]">
                              <span className="text-slate-300">Discount %</span>
                              <div className="relative">
                                <input 
                                  type="number"
                                  min="0"
                                  step="0.5"
                                  value={discountPercent}
                                  onChange={(e) => setDiscountPercent(Number(e.target.value) || 0)}
                                  className="w-32 text-right rounded-md bg-white/5 border border-white/10 pl-3 pr-8 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-400/40"
                                />
                                <span className="absolute right-3 top-2.5 text-slate-400 text-sm pointer-events-none">%</span>
                              </div>
                            </div>
                            <div className="flex items-center justify-between text-[15px]">
                              <span className="text-slate-300">Discount $</span>
                              <div className="relative">
                                <input 
                                  type="number"
                                  min="0"
                                  step="1"
                                  value={discountFlat}
                                  onChange={(e) => setDiscountFlat(Number(e.target.value) || 0)}
                                  className="w-32 text-right rounded-md bg-white/5 border border-white/10 pl-8 pr-3 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-400/40"
                                />
                                <span className="absolute left-3 top-2.5 text-slate-400 text-sm pointer-events-none">$</span>
                              </div>
                            </div>
                            <div className="h-px w-full bg-white/10 my-2"></div>
                            <div className="flex items-center justify-between text-[16px]">
                              <span className="text-slate-200">Total after discount</span>
                              <span className="text-white font-semibold">{formatPrice(summary.total)}</span>
                            </div>
                          </div>
                          <div className="mt-5 flex items-center gap-3">
                            <Button 
                              variant="ghost" 
                              className="bg-white/7.5 border border-white/10 flex-1"
                              onClick={() => showToast('Template saved')}
                            >
                              <Save className="h-5 w-5 mr-2" />
                              Save Template
                            </Button>
                            <Button 
                              variant="primary"
                              disabled={summary.count === 0}
                              className="flex-1"
                              onClick={() => {
                                showToast(`Invoice created for ${summary.count} order${summary.count > 1 ? 's' : ''}`);
                                setSelectedOrders(new Set());
                              }}
                            >
                              <FileText className="h-5 w-5 mr-2" />
                              Create Invoice
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {currentTab === 'discounts' && (
                  <div className="grid grid-cols-12 gap-6">
                    <div className="col-span-12 md:col-span-6">
                      <div className="rounded-xl bg-white/5 border border-white/10 p-5">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-white tracking-tight text-[22px] font-semibold">Global Discount Rules</h3>
                          <Percent className="h-5 w-5 text-orange-300/80" />
                        </div>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-[14px] text-slate-300 mb-1.5">Percentage discount</label>
                            <div className="relative">
                              <input 
                                type="number"
                                min="0"
                                step="0.5"
                                value={globalDiscountPercent}
                                onChange={(e) => setGlobalDiscountPercent(Number(e.target.value) || 0)}
                                className="w-full rounded-lg bg-white/5 border border-white/10 pl-4 pr-10 py-2.5 text-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-400/40"
                              />
                              <span className="absolute right-4 top-2.5 text-slate-400 pointer-events-none">%</span>
                            </div>
                          </div>
                          <div>
                            <label className="block text-[14px] text-slate-300 mb-1.5">Flat discount</label>
                            <div className="relative">
                              <input 
                                type="number"
                                min="0"
                                step="1"
                                value={globalDiscountFlat}
                                onChange={(e) => setGlobalDiscountFlat(Number(e.target.value) || 0)}
                                className="w-full rounded-lg bg-white/5 border border-white/10 pl-10 pr-4 py-2.5 text-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-400/40"
                              />
                              <span className="absolute left-4 top-2.5 text-slate-400 pointer-events-none">$</span>
                            </div>
                          </div>
                          <p className="text-[13px] text-slate-400">Rules apply to newly generated invoices. You can override discounts per invoice.</p>
                          <div className="flex items-center gap-3">
                            <Button 
                              variant="primary"
                              onClick={() => showToast('Discount rules saved')}
                            >
                              <CheckCircle2 className="h-5 w-5 mr-2" />
                              Save Rules
                            </Button>
                            <Button 
                              variant="ghost" 
                              className="bg-white/7.5 border border-white/10"
                              onClick={() => {
                                setGlobalDiscountPercent(0);
                                setGlobalDiscountFlat(0);
                                showToast('Discount rules reset');
                              }}
                            >
                              <Undo2 className="h-5 w-5 mr-2" />
                              Reset
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="col-span-12 md:col-span-6">
                      <div className="rounded-xl bg-white/5 border border-white/10 p-5 h-full">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-white tracking-tight text-[22px] font-semibold">Quick Test</h3>
                          <Beaker className="h-5 w-5 text-cyan-300/80" />
                        </div>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-[14px] text-slate-300 mb-1.5">Factory amount</label>
                            <div className="relative">
                              <input 
                                type="number"
                                min="0"
                                step="1"
                                value={testFactoryAmount}
                                onChange={(e) => setTestFactoryAmount(Number(e.target.value) || 0)}
                                className="w-full rounded-lg bg-white/5 border border-white/10 pl-10 pr-4 py-2.5 text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
                              />
                              <span className="absolute left-4 top-2.5 text-slate-400 pointer-events-none">$</span>
                            </div>
                          </div>
                          <div className="h-px w-full bg-white/10"></div>
                          <div className="flex items-center justify-between">
                            <span className="text-[15px] text-slate-300">After % discount</span>
                            <span className="text-[15px] text-white">{formatPrice(testPreview.afterPercent)}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-[15px] text-slate-300">After flat discount</span>
                            <span className="text-[15px] text-white">{formatPrice(testPreview.afterFlat)}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-[15px] text-slate-300">Combined</span>
                            <span className="text-[16px] text-white font-semibold">{formatPrice(testPreview.combined)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {currentTab === 'templates' && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-white tracking-tight text-[22px] font-semibold">Invoice Templates</h3>
                      <Button 
                        variant="ghost" 
                        className="bg-white/7.5 border border-white/10"
                        onClick={() => showToast('New template created')}
                      >
                        <Plus className="h-5 w-5 mr-2" />
                        New Template
                      </Button>
                    </div>
                    <div className="grid grid-cols-12 gap-4">
                      {/* Template Cards */}
                      {['Standard Net 30', 'Wholesale Express', 'Reseller Net 15'].map((template, index) => (
                        <div key={template} className="col-span-12 md:col-span-4">
                          <div className="rounded-xl bg-white/5 border border-white/10 p-5 hover:bg-white/7 transition">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <LayoutTemplate className="h-5 w-5 text-purple-300/80" />
                                <span className="text-[15px] text-slate-200">{template}</span>
                              </div>
                              <span className="text-[12px] text-slate-400">{index === 0 ? 'Updated 2d' : index === 1 ? 'Updated 6d' : 'Updated 12d'}</span>
                            </div>
                            <div className="rounded-lg bg-white/5 border border-white/10 p-4 text-[13px] text-slate-300/90">
                              • Payment: {index === 0 ? 'Net 30' : index === 1 ? 'Due on receipt' : 'Net 15'}
                              <br />• Tax: 0%
                              <br />• Discount: {index === 0 ? '5%' : index === 1 ? '0%' : '2.5%'}
                            </div>
                            <div className="mt-4 flex items-center gap-2">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="bg-white/7.5 border border-white/10"
                                onClick={() => {
                                  setSelectedTemplate(template);
                                  setTemplateModalOpen(true);
                                }}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                Preview
                              </Button>
                              <Button 
                                variant="primary"
                                size="sm"
                                onClick={() => showToast('Template sent')}
                              >
                                <Send className="h-4 w-4 mr-2" />
                                Send
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </GlassCard>
          </section>

          {/* Billing to Partner Section */}
          <section className="px-6 md:px-10 mt-6">
            <GlassCard className="overflow-hidden">
              <div className="p-6 sm:p-8">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-white tracking-tight text-[28px] sm:text-[32px] font-semibold">Billing to Partner</h2>
                    <p className="text-slate-300/80 text-[15px]">Manage partners and their access roles.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="primary"
                      onClick={() => {
                        setPartnerForm({ name: '', id: '', email: '', role: 'Partner', status: 'Active' });
                        setEditingPartnerIndex(null);
                        setPartnerModalOpen(true);
                      }}
                    >
                      <Plus className="h-5 w-5 mr-2" />
                      Create Partner
                    </Button>
                  </div>
                </div>

                <div className="rounded-xl bg-white/5 border border-white/10 overflow-hidden">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 sm:px-6 py-4 border-b border-white/10 gap-4">
                    <div className="text-[16px] font-medium text-slate-200">Partner Management</div>
                    <div className="relative">
                      <input 
                        type="text"
                        placeholder="Search partners…"
                        value={partnerSearchFilter}
                        onChange={(e) => setPartnerSearchFilter(e.target.value)}
                        className="w-full sm:w-80 rounded-lg bg-white/5 border border-white/10 text-slate-200 placeholder:text-slate-400/70 focus:outline-none focus:ring-2 focus:ring-cyan-400/40 pl-12 pr-4 py-3"
                      />
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    </div>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <div className="grid grid-cols-12 gap-6 text-[14px] font-medium text-slate-300 px-4 sm:px-6 py-4 bg-white/2.5 min-w-[800px]">
                      <div className="col-span-3">Partner Name</div>
                      <div className="col-span-2">User ID</div>
                      <div className="col-span-3">Email Address</div>
                      <div className="col-span-2">Role</div>
                      <div className="col-span-1">Status</div>
                      <div className="col-span-1 text-right">Actions</div>
                    </div>
                    
                    <div className="divide-y divide-white/10">
                      {filteredPartners.map((partner, index) => (
                        <div key={partner.id} className="grid grid-cols-12 gap-6 items-center px-4 sm:px-6 py-5 hover:bg-white/3 transition min-w-[800px]">
                          <div className="col-span-3">
                            <div className="text-[16px] font-medium text-slate-100">{partner.name}</div>
                            <div className="text-[13px] text-slate-400 mt-0.5">Partner</div>
                          </div>
                          <div className="col-span-2">
                            <div className="text-[14px] text-slate-300 font-mono">{partner.id}</div>
                          </div>
                          <div className="col-span-3">
                            <div className="text-[14px] text-slate-300">{partner.email}</div>
                          </div>
                          <div className="col-span-2">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[12px] font-medium bg-cyan-400/10 text-cyan-300 border border-cyan-400/20">
                              {partner.role}
                            </span>
                          </div>
                          <div className="col-span-1">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[12px] font-medium whitespace-nowrap ${
                              partner.status === 'Active' 
                                ? 'bg-lime-400/15 text-lime-300 border border-lime-400/20'
                                : partner.status === 'Pending'
                                ? 'bg-orange-400/15 text-orange-300 border border-orange-400/20'
                                : 'bg-purple-400/15 text-purple-300 border border-purple-400/20'
                            }`}>
                              {partner.status}
                            </span>
                          </div>
                          <div className="col-span-1 flex items-center justify-end gap-3">
                            <button 
                              className="rounded-full p-2.5 bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition"
                              onClick={() => {
                                setPartnerForm(partner);
                                setEditingPartnerIndex(partners.indexOf(partner));
                                setPartnerModalOpen(true);
                              }}
                              title="Edit Partner"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button 
                              className="rounded-full p-2.5 bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition"
                              onClick={() => {
                                if (confirm(`Delete partner "${partner.name}"?`)) {
                                  const newPartners = partners.filter(p => p.id !== partner.id);
                                  setPartners(newPartners);
                                  showToast('Partner deleted');
                                }
                              }}
                              title="Delete Partner"
                            >
                              <Trash2 className="h-4 w-4 text-red-300/80" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </GlassCard>
          </section>

          {/* Global Margin Settings Section */}
          <section className="px-6 md:px-10 mt-6">
            <GlassCard className="overflow-hidden">
              <div className="p-6 sm:p-8">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h2 className="text-white tracking-tight text-[28px] sm:text-[32px] font-semibold">Global Margin Settings</h2>
                    <p className="text-slate-300/80 text-[15px]">Apply margins globally or per member to control product pricing.</p>
                  </div>
                  <SlidersHorizontal className="h-6 w-6 text-slate-400" />
                </div>

                {/* Settings Control Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                  {/* Toggle */}
                  <div className="flex items-center justify-between rounded-xl bg-white/5 border border-white/10 p-4">
                    <div>
                      <div className="text-[16px] font-medium text-slate-200">Apply Settings</div>
                      <div className="text-[14px] text-slate-400 mt-1">
                        {globalScope ? 'Global (all partners)' : 'Per-member (overrides allowed)'}
                      </div>
                    </div>
                    <button 
                      onClick={() => setGlobalScope(!globalScope)}
                      className="group relative inline-flex h-10 w-20 items-center rounded-full bg-white/10 border border-white/10 transition hover:shadow hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-purple-400/30"
                    >
                      <span 
                        className={`inline-block h-8 w-8 rounded-full bg-purple-400 transition ${
                          globalScope ? 'translate-x-1' : 'translate-x-11'
                        }`} 
                      />
                    </button>
                  </div>

                  {/* Source Information */}
                  <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                    <div className="text-[16px] font-medium text-slate-200 mb-2">Data Sources</div>
                    <div className="text-[14px] text-slate-400 space-y-1">
                      <div>• Blank Caps (fetched from Sanity CMS)</div>
                      <div>• Product Options (from Webflow, includes logo/customization)</div>
                      <div>• Delivery Costs (shipping and freight options)</div>
                    </div>
                  </div>
                </div>

                {/* Member Selection (only show when not global) */}
                {!globalScope && (
                  <div className="mb-6">
                    <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                      <label className="block text-[16px] font-medium text-slate-200 mb-3">Select Member for Override</label>
                      <div className="relative">
                        <Users className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                        <select 
                          value={selectedMember}
                          onChange={(e) => setSelectedMember(e.target.value)}
                          className="appearance-none w-full rounded-lg bg-white/5 border border-white/10 text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-400/40 pl-12 pr-12 py-3 backdrop-blur-sm"
                          style={{
                            background: 'rgba(255, 255, 255, 0.05)',
                            backdropFilter: 'blur(10px)'
                          }}
                        >
                          <option value="" className="bg-slate-800 text-slate-200">Select a member...</option>
                          {partners.map((partner) => (
                            <option key={partner.id} value={partner.id} className="bg-slate-800 text-slate-200">
                              {partner.name} ({partner.role})
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                      </div>
                      {selectedMember && (
                        <p className="text-[14px] text-slate-300 mt-2 flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-purple-400"></span>
                          Setting custom margins for: <strong>{partners.find(p => p.id === selectedMember)?.name}</strong>
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Margin table */}
                <div className="rounded-xl bg-white/5 border border-white/10 overflow-hidden">
                  {/* Table Header */}
                  <div className="bg-white/2.5 border-b border-white/10 px-6 py-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-[18px] font-semibold text-white">Product Margin Configuration</h3>
                      <span className="text-[13px] text-slate-400">Factory cost + margin = partner cost</span>
                    </div>
                    <div className="grid grid-cols-12 gap-6 text-[14px] font-medium text-slate-300">
                      <div className="col-span-4">Product Type</div>
                      <div className="col-span-2 text-center">Factory Cost ($)</div>
                      <div className="col-span-3 text-center">Margin Percentage (%)</div>
                      <div className="col-span-3 text-center">Flat Margin ($)</div>
                    </div>
                  </div>

                  {/* Table Body */}
                  <div className="divide-y divide-white/10">
                    {marginState.map((row, index) => (
                      <div key={`${row.key}-${index}`} className="px-6 py-6 hover:bg-white/3 transition">
                        <div className="grid grid-cols-12 gap-6 items-center">
                            {/* Product Type Column */}
                            <div className="col-span-4">
                              <div className="text-[16px] font-medium text-slate-100">{row.label}</div>
                              <div className="text-[13px] text-slate-400 mt-0.5">{row.key.replace(/_/g, ' ')}</div>
                            </div>

                            {/* Factory Cost Column */}
                            <div className="col-span-2">
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                                <input 
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={row.factory}
                                  onChange={(e) => {
                                    const newMarginState = [...marginState];
                                    newMarginState[index].factory = Number(e.target.value) || 0;
                                    setMarginState(newMarginState);
                                  }}
                                  className="w-full text-center rounded-lg bg-white/5 border border-white/10 pl-10 pr-6 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-400/40 focus:border-cyan-400/40"
                                />
                              </div>
                            </div>

                            {/* Margin Percent Column */}
                            <div className="col-span-3">
                              <div className="relative">
                                <input 
                                  type="number"
                                  step="0.5"
                                  min="0"
                                  max="100"
                                  value={row.percent}
                                  onChange={(e) => {
                                    const newMarginState = [...marginState];
                                    newMarginState[index].percent = Number(e.target.value) || 0;
                                    setMarginState(newMarginState);
                                  }}
                                  className="w-full text-center rounded-lg bg-white/5 border border-white/10 pl-6 pr-10 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-400/40 focus:border-orange-400/40"
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">%</span>
                              </div>
                            </div>

                            {/* Flat Margin Column */}
                            <div className="col-span-3">
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                                <input 
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={row.flat}
                                  onChange={(e) => {
                                    const newMarginState = [...marginState];
                                    newMarginState[index].flat = Number(e.target.value) || 0;
                                    setMarginState(newMarginState);
                                  }}
                                  className="w-full text-center rounded-lg bg-white/5 border border-white/10 pl-10 pr-6 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-400/40 focus:border-orange-400/40"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* See More Button */}
                    <div className="border-t border-white/10 px-6 py-4 bg-white/2.5">
                      <button
                        onClick={() => setShowDetailedCustomization(!showDetailedCustomization)}
                        className="inline-flex items-center gap-2 text-[14px] text-slate-300 hover:text-white transition"
                      >
                        <span>{showDetailedCustomization ? 'Show Less' : 'See More'} Customization Options</span>
                        <ChevronDown className={`h-4 w-4 transition-transform ${showDetailedCustomization ? 'rotate-180' : ''}`} />
                      </button>
                    </div>
                  </div>

                  {/* Detailed Customization Options */}
                  {showDetailedCustomization && (
                    <div className="mt-4 rounded-xl bg-white/5 border border-white/10 overflow-hidden">
                      {/* Header */}
                      <div className="bg-white/2.5 border-b border-white/10 px-6 py-4">
                        <h4 className="text-white text-[16px] font-medium">Detailed Customization Options</h4>
                        <p className="text-slate-400 text-[13px] mt-1">Individual margin settings for specific customization types</p>
                      </div>

                      {/* Detailed Options Grid */}
                      <div className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          
                          {/* Logo Options */}
                          <div className="space-y-4">
                            <h5 className="text-slate-200 text-[14px] font-medium border-b border-white/10 pb-2">Logo Options</h5>
                            
                            {[
                              { name: '3D Embroidery', factory: 0.15, percent: 35, flat: 0.05 },
                              { name: 'Standard Embroidery', factory: 0.50, percent: 32, flat: 0.03 },
                              { name: 'Rubber Patches', factory: 0.80, percent: 40, flat: 0.10 },
                              { name: 'Woven Patches', factory: 0.65, percent: 38, flat: 0.08 },
                              { name: 'Leather Patches', factory: 0.70, percent: 42, flat: 0.12 }
                            ].map((item, idx) => (
                              <div key={`logo-${idx}`} className="grid grid-cols-8 gap-2 items-center p-3 rounded-lg bg-white/2.5 hover:bg-white/5 transition">
                                <div className="col-span-3 text-[13px] text-slate-300">{item.name}</div>
                                <div className="col-span-2">
                                  <div className="relative">
                                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500 text-xs">$</span>
                                    <input 
                                      type="number" 
                                      step="0.01" 
                                      defaultValue={item.factory}
                                      className="w-full text-xs text-center rounded bg-white/5 border border-white/10 pl-5 pr-2 py-1.5 text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-400/40"
                                    />
                                  </div>
                                </div>
                                <div className="col-span-2">
                                  <div className="relative">
                                    <input 
                                      type="number" 
                                      step="0.5" 
                                      defaultValue={item.percent}
                                      className="w-full text-xs text-center rounded bg-white/5 border border-white/10 px-2 pr-5 py-1.5 text-slate-200 focus:outline-none focus:ring-1 focus:ring-orange-400/40"
                                    />
                                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 text-xs">%</span>
                                  </div>
                                </div>
                                <div className="col-span-1">
                                  <div className="relative">
                                    <span className="absolute left-1 top-1/2 -translate-y-1/2 text-slate-500 text-xs">$</span>
                                    <input 
                                      type="number" 
                                      step="0.01" 
                                      defaultValue={item.flat}
                                      className="w-full text-xs text-center rounded bg-white/5 border border-white/10 pl-3 pr-1 py-1.5 text-slate-200 focus:outline-none focus:ring-1 focus:ring-orange-400/40"
                                    />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Accessories & Other Options */}
                          <div className="space-y-4">
                            <h5 className="text-slate-200 text-[14px] font-medium border-b border-white/10 pb-2">Accessories & Others</h5>
                            
                            {[
                              { name: 'Hang Tags', factory: 0.30, percent: 50, flat: 0.05 },
                              { name: 'Inside Labels', factory: 0.20, percent: 45, flat: 0.03 },
                              { name: 'Premium Closures', factory: 0.35, percent: 30, flat: 0.05 },
                              { name: 'Premium Fabrics', factory: 0.60, percent: 25, flat: 0.10 },
                              { name: 'Special Applications', factory: 0.20, percent: 40, flat: 0.03 }
                            ].map((item, idx) => (
                              <div key={`accessory-${idx}`} className="grid grid-cols-8 gap-2 items-center p-3 rounded-lg bg-white/2.5 hover:bg-white/5 transition">
                                <div className="col-span-3 text-[13px] text-slate-300">{item.name}</div>
                                <div className="col-span-2">
                                  <div className="relative">
                                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500 text-xs">$</span>
                                    <input 
                                      type="number" 
                                      step="0.01" 
                                      defaultValue={item.factory}
                                      className="w-full text-xs text-center rounded bg-white/5 border border-white/10 pl-5 pr-2 py-1.5 text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-400/40"
                                    />
                                  </div>
                                </div>
                                <div className="col-span-2">
                                  <div className="relative">
                                    <input 
                                      type="number" 
                                      step="0.5" 
                                      defaultValue={item.percent}
                                      className="w-full text-xs text-center rounded bg-white/5 border border-white/10 px-2 pr-5 py-1.5 text-slate-200 focus:outline-none focus:ring-1 focus:ring-orange-400/40"
                                    />
                                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 text-xs">%</span>
                                  </div>
                                </div>
                                <div className="col-span-1">
                                  <div className="relative">
                                    <span className="absolute left-1 top-1/2 -translate-y-1/2 text-slate-500 text-xs">$</span>
                                    <input 
                                      type="number" 
                                      step="0.01" 
                                      defaultValue={item.flat}
                                      className="w-full text-xs text-center rounded bg-white/5 border border-white/10 pl-3 pr-1 py-1.5 text-slate-200 focus:outline-none focus:ring-1 focus:ring-orange-400/40"
                                    />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Delivery Options */}
                        <div className="mt-6">
                          <h5 className="text-slate-200 text-[14px] font-medium border-b border-white/10 pb-2 mb-4">Delivery Options</h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {[
                              { name: 'Regular Delivery', factory: 2.00, percent: 15, flat: 0.50 },
                              { name: 'Priority Delivery', factory: 2.20, percent: 18, flat: 0.60 },
                              { name: 'Air Freight', factory: 1.00, percent: 25, flat: 0.20 },
                              { name: 'Sea Freight', factory: 0.35, percent: 30, flat: 0.10 }
                            ].map((item, idx) => (
                              <div key={`delivery-${idx}`} className="p-4 rounded-lg bg-white/2.5 hover:bg-white/5 transition">
                                <div className="text-[13px] text-slate-200 font-medium mb-3">{item.name}</div>
                                <div className="space-y-2">
                                  <div className="relative">
                                    <label className="text-xs text-slate-400 block mb-1">Factory Cost</label>
                                    <span className="absolute left-2 top-6 text-slate-500 text-xs">$</span>
                                    <input 
                                      type="number" 
                                      step="0.01" 
                                      defaultValue={item.factory}
                                      className="w-full text-xs text-center rounded bg-white/5 border border-white/10 pl-5 pr-2 py-2 text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-400/40"
                                    />
                                  </div>
                                  <div className="grid grid-cols-2 gap-2">
                                    <div className="relative">
                                      <label className="text-xs text-slate-400 block mb-1">%</label>
                                      <input 
                                        type="number" 
                                        step="0.5" 
                                        defaultValue={item.percent}
                                        className="w-full text-xs text-center rounded bg-white/5 border border-white/10 px-1 py-2 text-slate-200 focus:outline-none focus:ring-1 focus:ring-orange-400/40"
                                      />
                                    </div>
                                    <div className="relative">
                                      <label className="text-xs text-slate-400 block mb-1">Flat</label>
                                      <span className="absolute left-1 top-6 text-slate-500 text-xs">$</span>
                                      <input 
                                        type="number" 
                                        step="0.01" 
                                        defaultValue={item.flat}
                                        className="w-full text-xs text-center rounded bg-white/5 border border-white/10 pl-3 pr-1 py-2 text-slate-200 focus:outline-none focus:ring-1 focus:ring-orange-400/40"
                                      />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Save Button for Detailed Settings */}
                        <div className="mt-6 flex justify-end">
                          <Button 
                            variant="primary"
                            onClick={() => {
                              showToast('Detailed margin settings saved');
                              setShowDetailedCustomization(false);
                            }}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Save Detailed Settings
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                {/* Preview and Actions Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                  {/* Live Preview */}
                  <div className="rounded-xl bg-white/5 border border-white/10 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-[18px] font-semibold text-white">Live Preview</h3>
                      <Sparkles className="h-5 w-5 text-lime-300/90" />
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between text-[16px]">
                        <span className="text-slate-300">Factory Cost</span>
                        <span className="text-slate-200 font-medium">{formatPrice(marginState[0]?.factory || 0)}</span>
                      </div>
                      <div className="flex items-center justify-between text-[16px]">
                        <span className="text-slate-300">Applied Margin</span>
                        <span className="text-slate-200 font-medium">
                          {marginState[0]?.percent || 0}% + {formatPrice(marginState[0]?.flat || 0)}
                        </span>
                      </div>
                      <div className="h-px w-full bg-white/10"></div>
                      <div className="flex items-center justify-between text-[18px]">
                        <span className="text-slate-200 font-medium">Partner Cost</span>
                        <span className="text-white font-bold">
                          {formatPrice(calculatePartnerCost(
                            marginState[0]?.factory || 0,
                            marginState[0]?.percent || 0,
                            marginState[0]?.flat || 0
                          ))}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col justify-center space-y-4">
                    <Button 
                      variant="primary"
                      className="w-full py-4"
                      onClick={saveMarginSettings}
                    >
                      <CheckCircle2 className="h-5 w-5 mr-2" />
                      Save Margin Settings
                    </Button>
                    
                    <div className="text-center">
                      <div className="text-[14px] text-slate-400 mb-2">Quick Actions</div>
                      <div className="flex gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="flex-1"
                          onClick={() => {
                            // Reset to default values
                            setMarginState([
                              { key: 'blank_caps', label: 'Blank Caps', factory: 3.50, percent: 20, flat: 0 },
                              { key: 'customization_combined', label: 'Customization (Combined)', factory: 0.75, percent: 35, flat: 0.08 },
                              { key: 'delivery_combined', label: 'Delivery (Combined)', factory: 2.00, percent: 18, flat: 0.50 }
                            ]);
                          }}
                        >
                          Reset
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="flex-1"
                          onClick={() => showToast('Settings exported')}
                        >
                          Export
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </GlassCard>
          </section>
        </DashboardContent>
      </div>

      {/* Template Preview Modal */}
      {templateModalOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60" onClick={() => setTemplateModalOpen(false)} />
          <div className="relative mx-auto max-w-2xl mt-20 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl p-6 sm:p-8 text-slate-200 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <LayoutTemplate className="h-5 w-5 text-purple-300" />
                <h3 className="text-white tracking-tight text-[24px] font-semibold">{selectedTemplate}</h3>
              </div>
              <button 
                onClick={() => setTemplateModalOpen(false)}
                className="rounded-full p-2 bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition focus:outline-none focus:ring-2 focus:ring-white/20"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="rounded-xl bg-white/5 border border-white/10 p-5 text-[15px]">
              <p className="text-slate-300">Preview of invoice structure with sample line items and terms.</p>
              <div className="mt-3 grid grid-cols-12 gap-2">
                <div className="col-span-8 text-slate-300">Item</div>
                <div className="col-span-2 text-right text-slate-300">Qty</div>
                <div className="col-span-2 text-right text-slate-300">Price</div>
                <div className="col-span-8">Blank Caps</div>
                <div className="col-span-2 text-right">100</div>
                <div className="col-span-2 text-right">$3.50</div>
                <div className="col-span-8">Embroidery</div>
                <div className="col-span-2 text-right">100</div>
                <div className="col-span-2 text-right">$1.25</div>
              </div>
              <div className="h-px w-full bg-white/10 my-4"></div>
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Total</span>
                <span className="text-white font-semibold">$475.00</span>
              </div>
            </div>
            <div className="mt-5 flex items-center justify-end gap-3">
              <Button 
                variant="primary"
                onClick={() => {
                  showToast('Template sent');
                  setTemplateModalOpen(false);
                }}
              >
                <Send className="h-5 w-5 mr-2" />
                Send
              </Button>
              <Button 
                variant="ghost" 
                className="bg-white/7.5 border border-white/10"
                onClick={() => setTemplateModalOpen(false)}
              >
                <XCircle className="h-5 w-5 mr-2" />
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Partner Create/Edit Modal */}
      {partnerModalOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60" onClick={() => setPartnerModalOpen(false)} />
          <div className="relative mx-auto max-w-xl mt-24 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl p-6 sm:p-8 text-slate-200 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-cyan-300" />
                <h3 className="text-white tracking-tight text-[24px] font-semibold">
                  {editingPartnerIndex !== null ? 'Edit Partner' : 'Create Partner'}
                </h3>
              </div>
              <button 
                onClick={() => setPartnerModalOpen(false)}
                className="rounded-full p-2 bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition focus:outline-none focus:ring-2 focus:ring-white/20"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-12">
                <label className="text-[14px] text-slate-300 mb-1.5 block">Partner Name</label>
                <input 
                  type="text"
                  value={partnerForm.name}
                  onChange={(e) => setPartnerForm({ ...partnerForm, name: e.target.value })}
                  className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-2.5 text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
                />
              </div>
              <div className="col-span-12 sm:col-span-6">
                <label className="text-[14px] text-slate-300 mb-1.5 block">User ID</label>
                <input 
                  type="text"
                  value={partnerForm.id}
                  onChange={(e) => setPartnerForm({ ...partnerForm, id: e.target.value })}
                  className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-2.5 text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
                />
              </div>
              <div className="col-span-12 sm:col-span-6">
                <label className="text-[14px] text-slate-300 mb-1.5 block">Email</label>
                <input 
                  type="email"
                  value={partnerForm.email}
                  onChange={(e) => setPartnerForm({ ...partnerForm, email: e.target.value })}
                  className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-2.5 text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
                />
              </div>
              <div className="col-span-12 sm:col-span-6">
                <label className="text-[14px] text-slate-300 mb-1.5 block">Role</label>
                <select 
                  value={partnerForm.role}
                  onChange={(e) => setPartnerForm({ ...partnerForm, role: e.target.value })}
                  className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-2.5 text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
                >
                  <option value="Partner">Partner</option>
                  <option value="Admin">Admin</option>
                  <option value="Reseller">Reseller</option>
                </select>
              </div>
              <div className="col-span-12 sm:col-span-6">
                <label className="text-[14px] text-slate-300 mb-1.5 block">Status</label>
                <select 
                  value={partnerForm.status}
                  onChange={(e) => setPartnerForm({ ...partnerForm, status: e.target.value })}
                  className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-2.5 text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
                >
                  <option value="Active">Active</option>
                  <option value="Pending">Pending</option>
                  <option value="Suspended">Suspended</option>
                </select>
              </div>
            </div>
            <div className="mt-5 flex items-center justify-end gap-3">
              <Button 
                variant="primary"
                onClick={() => {
                  if (editingPartnerIndex !== null) {
                    const newPartners = [...partners];
                    newPartners[editingPartnerIndex] = partnerForm;
                    setPartners(newPartners);
                  } else {
                    const newPartner = {
                      ...partnerForm,
                      id: partnerForm.id || `usr_${Math.random().toString(36).substring(2,7)}`
                    };
                    setPartners([newPartner, ...partners]);
                  }
                  setPartnerModalOpen(false);
                  showToast('Partner saved');
                }}
              >
                <Check className="h-5 w-5 mr-2" />
                Save
              </Button>
              <Button 
                variant="ghost" 
                className="bg-white/7.5 border border-white/10"
                onClick={() => setPartnerModalOpen(false)}
              >
                <XCircle className="h-5 w-5 mr-2" />
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}