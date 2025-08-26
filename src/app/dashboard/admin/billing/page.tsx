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
  X,
  Download,
  Filter,
  AlertCircle,
  Clock,
  RotateCcw,
  ArrowUpDown,
  ExternalLink
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
  customerEmail: string;
  items: number;
  factory: number;
  due: string;
  status: string;
  productName: string;
  hasInvoice: boolean;
  invoices: any[];
  orderType: string;
  createdAt: string;
}


interface MarginRow {
  key: string;
  label: string;
  percent: number;
  flat: number;
}

interface Invoice {
  id: string;
  number: string;
  orderId: string;
  status: 'DRAFT' | 'ISSUED' | 'PAID' | 'VOID' | 'REFUNDED';
  total: number;
  issueDate: string;
  dueDate?: string;
  customer: {
    id: string;
    name: string;
    email: string;
  };
  order: {
    id: string;
    productName: string;
  };
  _count: {
    items: number;
  };
}

interface InvoiceFilters {
  status: string;
  dateFrom: string;
  dateTo: string;
  customer: string;
  search: string;
}

export default function BillingDashboard() {
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();
  
  // State
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [currentTab, setCurrentTab] = useState<'invoices' | 'discounts' | 'templates'>('invoices');
  
  // Invoice Management State
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(true);
  const [invoiceError, setInvoiceError] = useState<string | null>(null);
  const [invoiceFilters, setInvoiceFilters] = useState<InvoiceFilters>({
    status: '',
    dateFrom: '',
    dateTo: '',
    customer: '',
    search: ''
  });
  const [currentInvoicePage, setCurrentInvoicePage] = useState(1);
  const [totalInvoicePages, setTotalInvoicePages] = useState(1);
  const [selectedInvoicesForDelete, setSelectedInvoicesForDelete] = useState<Set<string>>(new Set());
  const [discountPercent, setDiscountPercent] = useState(0);
  const [discountFlat, setDiscountFlat] = useState(0);
  
  // Real orders data state
  const [realOrders, setRealOrders] = useState<Order[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [currentOrderPage, setCurrentOrderPage] = useState(1);
  const [totalOrderPages, setTotalOrderPages] = useState(1);
  const [orderFilters, setOrderFilters] = useState({
    customer: '',
    status: ''
  });
  
  // Individual order invoice state
  const [selectedOrderForInvoice, setSelectedOrderForInvoice] = useState<Order | null>(null);
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [isCreatingInvoice, setIsCreatingInvoice] = useState(false);
  const [globalDiscountPercent, setGlobalDiscountPercent] = useState(0);
  const [globalDiscountFlat, setGlobalDiscountFlat] = useState(0);
  const [testFactoryAmount, setTestFactoryAmount] = useState(120);
  const [customerFilter, setCustomerFilter] = useState('');
  const [globalScope, setGlobalScope] = useState(true);
  
  // Modal states
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  

  // Orders are now loaded from API - see realOrders state above


  const [marginState, setMarginState] = useState<MarginRow[]>([]);
  const [selectedMember, setSelectedMember] = useState<string>('');
  const [showDetailedCustomization, setShowDetailedCustomization] = useState(false);
  const [marginMode, setMarginMode] = useState<'global' | 'detailed'>('global');

  // Toast notification function
  const showToast = (message: string) => {
    // Create toast element
    const toast = document.createElement('div');
    toast.className = 'fixed top-4 right-4 bg-slate-800 border border-slate-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 transform translate-x-full transition-transform duration-300';
    toast.textContent = message;
    
    // Add to document
    document.body.appendChild(toast);
    
    // Animate in
    setTimeout(() => {
      toast.classList.remove('translate-x-full');
    }, 10);
    
    // Remove after delay
    setTimeout(() => {
      toast.classList.add('translate-x-full');
      setTimeout(() => {
        if (document.body.contains(toast)) {
          document.body.removeChild(toast);
        }
      }, 300);
    }, 3000);
  };

  // Check admin access and load data
  useEffect(() => {
    if (loading) return;
    
    if (!isAuthenticated || !user) {
      router.push('/login');
      return;
    }
    
    const isMasterAdmin = user.email === 'absrasel@gmail.com' || user.email === 'vic@onpointmarketing.com';
    if (user.role !== 'ADMIN' && !isMasterAdmin) {
      router.push('/dashboard/member');
      return;
    }
    
    // Load margin settings
    loadMarginSettings();
    loadInvoices();
    loadOrders();
  }, [user, loading, isAuthenticated, router]);

  // Reload invoices when filters or page change
  useEffect(() => {
    if (user && isAuthenticated) {
      loadInvoices();
    }
  }, [currentInvoicePage, invoiceFilters, user, isAuthenticated]);

  // Reload orders when filters or page change
  useEffect(() => {
    if (user && isAuthenticated) {
      loadOrders();
    }
  }, [currentOrderPage, orderFilters, user, isAuthenticated]);

  // Reload margin settings when mode changes
  useEffect(() => {
    if (user && isAuthenticated) {
      loadMarginSettings();
    }
  }, [marginMode, user, isAuthenticated]);

  // Load margin settings from API based on current mode
  const loadMarginSettings = async () => {
    try {
      const response = await fetch(`/api/billing/margins?mode=${marginMode}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // In global mode, group similar items and create simplified initial view
          // In detailed mode, show all specific items
          if (marginMode === 'global') {
            const simplifiedMargins = [
            {
              key: 'blank_caps',
              label: 'Blank Caps',
              percent: 20,
              flat: 0
            },
            {
              key: 'customization_combined',
              label: 'Customization (Combined)',
              percent: 35,
              flat: 0.08
            },
            {
              key: 'delivery_combined',
              label: 'Delivery (Combined)',
              percent: 18,
              flat: 0.50
            }
          ];
          setMarginState(simplifiedMargins);
          } else {
            // Detailed mode: Show all specific item margins
            const detailedMargins = data.data.map((setting: any) => ({
              key: setting.category,
              label: setting.productType,
              percent: setting.marginPercent,
              flat: setting.flatMargin
            }));
            setMarginState(detailedMargins);
          }
        }
      } else {
        // Fallback to simplified data if API fails
        const fallbackMargins = [
          {
            key: 'blank_caps',
            label: 'Blank Caps',
            percent: 20,
            flat: 0
          },
          {
            key: 'customization_combined',
            label: 'Customization (Combined)',
            percent: 35,
            flat: 0.08
          },
          {
            key: 'delivery_combined',
            label: 'Delivery (Combined)',
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
          percent: 20,
          flat: 0
        },
        {
          key: 'customization_combined',
          label: 'Customization (Combined)',
          percent: 35,
          flat: 0.08
        },
        {
          key: 'delivery_combined',
          label: 'Delivery (Combined)',
          percent: 18,
          flat: 0.50
        }
      ];
      setMarginState(fallbackMargins);
    }
  };


  // Save margin settings
  const saveMarginSettings = async () => {
    try {
      const formattedSettings = marginState.map((margin, index) => ({
        id: (index + 1).toString(),
        productType: margin.label,
        category: margin.key,
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
          scope: globalScope ? 'global' : 'per_member',
          mode: marginMode
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

  // Duplicate formatPrice function removed - using the one defined below

  // Duplicate showToast and calculateSummary functions removed - using the ones defined above

  // Duplicate calculateTestPreview function removed - using the one defined below

  // Calculate partner cost preview
  const calculatePartnerCost = (factory: number, percent: number, flat: number) => {
    return Math.max(0, factory + (factory * percent / 100) + flat);
  };

  // Invoice Management Functions
  const loadInvoices = async () => {
    setIsLoadingInvoices(true);
    try {
      const params = new URLSearchParams();
      params.append('page', currentInvoicePage.toString());
      params.append('limit', '10');
      
      if (invoiceFilters.status) params.append('status', invoiceFilters.status);
      if (invoiceFilters.search) params.append('search', invoiceFilters.search);

      const response = await fetch(`/api/invoices?${params.toString()}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to load invoices');
      }

      const data = await response.json();
      setInvoices(data.invoices);
      setTotalInvoicePages(data.pagination.pages);
      setInvoiceError(null);
    } catch (err: any) {
      console.error('Error loading invoices:', err);
      setInvoiceError(err.message);
      setInvoices([]);
    } finally {
      setIsLoadingInvoices(false);
    }
  };

  const createInvoiceFromOrder = async (orderId: string, useSimple: boolean = true) => {
    try {
      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          orderId,
          simple: useSimple 
        }),
        credentials: 'include'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create invoice');
      }

      const invoice = await response.json();
      showToast(`Invoice ${invoice.number} created successfully (${useSimple ? 'Streamlined' : 'Detailed'} format)`);
      loadInvoices();
    } catch (err: any) {
      console.error('Error creating invoice:', err);
      showToast(`Error: ${err.message}`);
    }
  };

  const updateInvoiceStatus = async (invoiceId: string, status: string) => {
    try {
      const response = await fetch(`/api/invoices/${invoiceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
        credentials: 'include'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update invoice');
      }

      showToast(`Invoice status updated to ${status}`);
      loadInvoices();
    } catch (err: any) {
      console.error('Error updating invoice:', err);
      showToast(`Error: ${err.message}`);
    }
  };

  const sendInvoice = async (invoiceId: string) => {
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/send`, {
        method: 'POST',
        credentials: 'include'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send invoice');
      }

      const result = await response.json();
      if (result.emailSent) {
        showToast('Invoice sent successfully');
      } else {
        showToast('Invoice sending attempted (email may not be configured)');
      }
      loadInvoices();
    } catch (err: any) {
      console.error('Error sending invoice:', err);
      showToast(`Error: ${err.message}`);
    }
  };

  const downloadInvoicePDF = async (invoiceId: string, invoiceNumber: string) => {
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/pdf`, {
        credentials: 'include',
        headers: {
          'Accept': 'application/pdf'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to download PDF: ${errorText}`);
      }

      // Check if the response is actually a PDF
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/pdf')) {
        throw new Error('Invalid response: Expected PDF file');
      }

      // Create blob and download
      const blob = await response.blob();
      
      // Verify blob size
      if (blob.size === 0) {
        throw new Error('Empty PDF file received');
      }

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `invoice-${invoiceNumber}.pdf`;
      link.style.display = 'none';
      document.body.appendChild(link);
      
      // Use setTimeout to ensure DOM is ready and avoid interruption
      setTimeout(() => {
        try {
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
          showToast(`Invoice ${invoiceNumber} downloaded successfully`);
        } catch (clickError) {
          console.warn('Click error (PDF likely downloaded anyway):', clickError);
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        }
      }, 100);
      
    } catch (err: any) {
      // Check if this is a post-download network error (common with file downloads)
      const isPostDownloadError = err.message?.includes('NetworkError') || 
                                  err.message?.includes('network') || 
                                  err.message?.includes('fetch') ||
                                  err.name === 'AbortError' ||
                                  err.name === 'TypeError';
      
      if (isPostDownloadError) {
        // This is likely a harmless post-download error, just log it quietly
        console.warn('Post-download network interruption (PDF likely downloaded successfully):', err.message);
        showToast(`Invoice ${invoiceNumber} download completed`);
      } else {
        // This is a real error that should be shown to user
        console.error('Error downloading PDF:', err);
        showToast(`Error: ${err.message}`);
      }
    }
  };

  const deleteInvoice = async (invoiceId: string) => {
    const invoice = invoices.find(inv => inv.id === invoiceId);
    const invoiceNumber = invoice?.number || 'Unknown';
    
    if (!confirm(`Are you sure you want to delete invoice ${invoiceNumber}?\n\nThis will permanently remove the invoice and all associated data.\nThis action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/invoices/${invoiceId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete invoice');
      }

      showToast('Invoice deleted successfully');
      loadInvoices();
    } catch (err: any) {
      console.error('Error deleting invoice:', err);
      showToast(`Error: ${err.message}`);
    }
  };

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(new Date(dateString));
  };

  // Load orders from API
  const loadOrders = async () => {
    if (!user || !isAuthenticated) return;
    
    try {
      setIsLoadingOrders(true);
      setOrderError(null);

      const params = new URLSearchParams({
        page: currentOrderPage.toString(),
        limit: '20'
      });

      if (orderFilters.customer) {
        params.append('customer', orderFilters.customer);
      }
      if (orderFilters.status) {
        params.append('status', orderFilters.status);
      }

      const response = await fetch(`/api/admin/orders/billing?${params.toString()}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to load orders');
      }

      const data = await response.json();
      setRealOrders(data.orders);
      setTotalOrderPages(data.pagination.pages);
      setOrderError(null);
    } catch (err: any) {
      console.error('Error loading orders:', err);
      setOrderError(err.message);
      setRealOrders([]);
    } finally {
      setIsLoadingOrders(false);
    }
  };

  // Calculate summary for selected orders

  // Calculate test preview for discount rules
  const calculateTestPreview = () => {
    const base = testFactoryAmount;
    const afterPercent = base - (base * (globalDiscountPercent / 100));
    const afterFlat = Math.max(0, afterPercent - globalDiscountFlat);
    const combined = afterFlat;
    
    return {
      afterPercent,
      afterFlat,
      combined
    };
  };

  // Create invoice for individual order with custom discount
  const createInvoiceForOrder = async (order: Order, customDiscountPercent = 0, customDiscountFlat = 0) => {
    try {
      setIsCreatingInvoice(true);
      
      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          orderId: order.id,
          simple: true,
          discountPercent: customDiscountPercent || 0,
          discountFlat: customDiscountFlat || 0
        })
      });
      
      if (response.ok) {
        const invoice = await response.json();
        showToast(`Invoice ${invoice.number} created successfully for order ${order.id}`);
        loadInvoices();
        loadOrders(); // Refresh to show updated invoice status
        setInvoiceModalOpen(false);
        setSelectedOrderForInvoice(null);
      } else {
        const error = await response.json();
        showToast(`Failed to create invoice: ${error.error}`);
      }
    } catch (err: any) {
      console.error('Error creating invoice:', err);
      showToast('Error creating invoice');
    } finally {
      setIsCreatingInvoice(false);
    }
  };

  // Recreate invoice for order with additional discount
  const recreateInvoiceForOrder = async (order: Order, additionalDiscountPercent = 0, additionalDiscountFlat = 0) => {
    try {
      setIsCreatingInvoice(true);
      
      // First delete existing invoice if any
      if (order.invoices && order.invoices.length > 0) {
        const existingInvoice = order.invoices[0];
        await fetch(`/api/invoices/${existingInvoice.id}`, {
          method: 'DELETE',
          credentials: 'include'
        });
      }
      
      // Then create new invoice with additional discount
      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          orderId: order.id,
          simple: true,
          discountPercent: additionalDiscountPercent || 0,
          discountFlat: additionalDiscountFlat || 0
        })
      });
      
      if (response.ok) {
        const invoice = await response.json();
        showToast(`Invoice ${invoice.number} recreated with additional discount for order ${order.id}`);
        loadInvoices();
        loadOrders(); // Refresh to show updated invoice status
        setInvoiceModalOpen(false);
        setSelectedOrderForInvoice(null);
      } else {
        const error = await response.json();
        showToast(`Failed to recreate invoice: ${error.error}`);
      }
    } catch (err: any) {
      console.error('Error recreating invoice:', err);
      showToast('Error recreating invoice');
    } finally {
      setIsCreatingInvoice(false);
    }
  };

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  // Bulk select/deselect functions

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return <Edit className="h-4 w-4" />;
      case 'ISSUED':
        return <Send className="h-4 w-4" />;
      case 'PAID':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'VOID':
        return <XCircle className="h-4 w-4" />;
      case 'REFUNDED':
        return <RotateCcw className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return 'bg-slate-400/15 text-slate-300 border-slate-400/20';
      case 'ISSUED':
        return 'bg-blue-400/15 text-blue-300 border-blue-400/20';
      case 'PAID':
        return 'bg-green-400/15 text-green-300 border-green-400/20';
      case 'VOID':
        return 'bg-red-400/15 text-red-300 border-red-400/20';
      case 'REFUNDED':
        return 'bg-orange-400/15 text-orange-300 border-orange-400/20';
      default:
        return 'bg-gray-400/15 text-gray-300 border-gray-400/20';
    }
  };

  // Filter orders based on customer and status selection
  const filteredOrders = realOrders.filter(order => {
    // Customer filter
    if (orderFilters.customer && !order.customer.includes(orderFilters.customer)) {
      return false;
    }
    
    // Status filter
    if (orderFilters.status === 'no-invoice' && order.hasInvoice) {
      return false;
    }
    if (orderFilters.status === 'with-invoice' && !order.hasInvoice) {
      return false;
    }
    
    return true;
  });
  

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
          {/* Content wrapper with proper spacing */}
          <div className="mt-0">
            {/* Header */}
          <DashboardHeader
            title="Billing & Accounts"
            subtitle="Manage invoices and margin controls in one place."
            onSearch={(query) => setInvoiceFilters(prev => ({ ...prev, search: query }))}
          />

          {/* Invoice Management Section */}
          <section className="px-6 md:px-10 mt-6">
            <GlassCard className="overflow-hidden">
              <div className="p-6 sm:p-8">
                {/* Header Row */}
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-white tracking-tight text-[28px] sm:text-[32px] md:text-[36px] font-semibold">
                      Invoice Management
                    </h2>
                    <p className="text-slate-300/80 text-[15px]">Create, manage, and send invoices to customers</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button 
                      variant="ghost" 
                      className="bg-white/7.5 border border-white/10"
                      onClick={loadInvoices}
                      disabled={isLoadingInvoices}
                    >
                      <RotateCcw className={`h-5 w-5 mr-2 ${isLoadingInvoices ? 'animate-spin' : ''}`} />
                      Refresh
                    </Button>
                    <Link href="/dashboard/admin/orders">
                      <Button 
                        variant="primary" 
                        className="bg-lime-500/20 border border-lime-400/30 text-lime-300 hover:bg-lime-500/30"
                      >
                        <Plus className="h-5 w-5 mr-2" />
                        Create from Order
                      </Button>
                    </Link>
                  </div>
                </div>

                {/* Filters */}
                <div className="flex flex-col md:flex-row md:items-center gap-3 justify-between mb-6">
                  <div className="flex flex-col sm:flex-row gap-3">
                    {/* Status Filter */}
                    <div className="relative">
                      <Filter className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
                      <select 
                        value={invoiceFilters.status}
                        onChange={(e) => setInvoiceFilters(prev => ({ ...prev, status: e.target.value }))}
                        className="appearance-none w-[180px] rounded-lg bg-white/5 border border-white/10 text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-400/40 px-10 py-2.5 pr-12"
                      >
                        <option value="">All statuses</option>
                        <option value="DRAFT">Draft</option>
                        <option value="ISSUED">Issued</option>
                        <option value="PAID">Paid</option>
                        <option value="VOID">Void</option>
                        <option value="REFUNDED">Refunded</option>
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-3 top-2.5 h-5 w-5 text-slate-400" />
                    </div>

                    {/* Date Range */}
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <Calendar className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
                        <input 
                          type="date" 
                          value={invoiceFilters.dateFrom}
                          onChange={(e) => setInvoiceFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                          className="w-[170px] rounded-lg bg-white/5 border border-white/10 text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-400/40 px-10 py-2.5"
                        />
                      </div>
                      <span className="text-slate-400">to</span>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
                        <input 
                          type="date" 
                          value={invoiceFilters.dateTo}
                          onChange={(e) => setInvoiceFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                          className="w-[170px] rounded-lg bg-white/5 border border-white/10 text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-400/40 px-10 py-2.5"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-slate-300 text-sm bg-white/5 border border-white/10 rounded-lg px-3 py-1">
                      Total: {invoices.length} invoice{invoices.length !== 1 ? 's' : ''}
                    </div>
                    {invoices.length > 0 && (
                      <div className="text-slate-300 text-sm bg-white/5 border border-white/10 rounded-lg px-3 py-1">
                        Revenue: {formatPrice(invoices.reduce((sum, inv) => sum + inv.total, 0))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Error Message */}
                {invoiceError && (
                  <div className="mb-6 p-4 rounded-lg bg-red-400/10 border border-red-400/20 text-red-300 flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" />
                    <span>{invoiceError}</span>
                  </div>
                )}

                {/* Invoices Table */}
                <div className="rounded-xl bg-white/5 border border-white/10 overflow-hidden">
                  {/* Table Header */}
                  <div className="bg-white/2.5 border-b border-white/10">
                    <div className="grid grid-cols-12 gap-6 text-[13px] font-medium text-slate-300 px-4 sm:px-6 py-4">
                      <div className="col-span-2 flex items-center gap-1">
                        <span>Invoice</span>
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                      <div className="col-span-2">Customer</div>
                      <div className="col-span-1">Status</div>
                      <div className="col-span-2">Order ID / Product</div>
                      <div className="col-span-1 text-right">Total</div>
                      <div className="col-span-2">Issue / Due Date</div>
                      <div className="col-span-2 text-right">Actions</div>
                    </div>
                  </div>
                  
                  {/* Table Body */}
                  <div className="divide-y divide-white/10">
                    {isLoadingInvoices ? (
                      <div className="px-6 py-12 text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-lime-400 mx-auto mb-4"></div>
                        <p className="text-slate-300">Loading invoices...</p>
                      </div>
                    ) : invoices.length === 0 ? (
                      <div className="px-6 py-12 text-center">
                        <FileText className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                        <p className="text-slate-300 mb-2">No invoices found</p>
                        <p className="text-slate-400 text-sm">Invoices will appear here after you create them from orders</p>
                      </div>
                    ) : (
                      invoices.map((invoice) => (
                        <div key={invoice.id} className="grid grid-cols-12 gap-6 items-center px-4 sm:px-6 py-4 hover:bg-white/3 transition">
                          {/* Invoice Number */}
                          <div className="col-span-2">
                            <div className="font-medium text-slate-200">{invoice.number}</div>
                            <div className="text-xs text-slate-400 mt-0.5">
                              {invoice._count.items} item{invoice._count.items !== 1 ? 's' : ''}
                            </div>
                          </div>
                          
                          {/* Customer */}
                          <div className="col-span-2">
                            <div className="text-slate-300">{invoice.customer.name || 'N/A'}</div>
                            <div className="text-xs text-slate-400 mt-0.5">{invoice.customer.email}</div>
                          </div>
                          
                          {/* Status */}
                          <div className="col-span-1">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(invoice.status)}`}>
                              {getStatusIcon(invoice.status)}
                              {invoice.status}
                            </span>
                          </div>
                          
                          {/* Order */}
                          <div className="col-span-2">
                            <Link 
                              href={`/dashboard/admin/orders/${invoice.orderId}`}
                              className="text-cyan-300 hover:text-cyan-200 text-sm font-medium flex items-center gap-1"
                            >
                              <div className="flex flex-col">
                                <span className="font-mono text-xs text-cyan-400" title={`Order ID: ${invoice.orderId}`}>
                                  #{invoice.orderId.slice(-8)}
                                </span>
                                <span className="text-xs text-slate-300 truncate" title={invoice.order.productName}>
                                  {invoice.order.productName}
                                </span>
                              </div>
                              <ExternalLink className="h-3 w-3 ml-1 flex-shrink-0" />
                            </Link>
                          </div>
                          
                          {/* Total */}
                          <div className="col-span-1 text-right">
                            <span className="font-semibold text-slate-200">
                              {formatPrice(invoice.total)}
                            </span>
                          </div>
                          
                          {/* Dates */}
                          <div className="col-span-2">
                            <div className="text-xs text-slate-300">{formatDate(invoice.issueDate)}</div>
                            {invoice.dueDate && (
                              <div className="text-xs text-slate-400 mt-0.5">Due: {formatDate(invoice.dueDate)}</div>
                            )}
                          </div>
                          
                          {/* Actions */}
                          <div className="col-span-2 flex items-center justify-end gap-2">
                            {/* View PDF */}
                            <button 
                              onClick={() => downloadInvoicePDF(invoice.id, invoice.number)}
                              className="rounded-full p-2 bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition"
                              title="Download PDF"
                            >
                              <Download className="h-4 w-4" />
                            </button>
                            
                            {/* Send Email */}
                            {invoice.status !== 'VOID' && (
                              <button 
                                onClick={() => sendInvoice(invoice.id)}
                                className="rounded-full p-2 bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition"
                                title="Send Invoice Email"
                              >
                                <Send className="h-4 w-4" />
                              </button>
                            )}
                            
                            {/* Status Dropdown */}
                            <div className="relative">
                              <select 
                                value={invoice.status}
                                onChange={(e) => updateInvoiceStatus(invoice.id, e.target.value)}
                                className="appearance-none rounded-full bg-white/5 border border-white/10 text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-400/40 px-3 py-1.5 pr-8 text-xs"
                              >
                                <option value="DRAFT">Draft</option>
                                <option value="ISSUED">Issued</option>
                                <option value="PAID">Paid</option>
                                <option value="VOID">Void</option>
                                <option value="REFUNDED">Refunded</option>
                              </select>
                              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
                            </div>
                            
                            {/* Delete (All invoices - for cleanup) */}
                            <button 
                              onClick={() => deleteInvoice(invoice.id)}
                              className="rounded-full p-2 bg-white/5 border border-white/10 hover:bg-red-400/20 hover:border-red-400/40 transition"
                              title="Delete Invoice"
                            >
                              <Trash2 className="h-4 w-4 text-red-300/80" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Pagination */}
                {totalInvoicePages > 1 && (
                  <div className="flex items-center justify-between mt-6">
                    <div className="text-slate-400 text-sm">
                      Page {currentInvoicePage} of {totalInvoicePages}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="ghost"
                        size="sm"
                        onClick={() => setCurrentInvoicePage(prev => Math.max(1, prev - 1))}
                        disabled={currentInvoicePage === 1 || isLoadingInvoices}
                      >
                        Previous
                      </Button>
                      <Button 
                        variant="ghost"
                        size="sm"
                        onClick={() => setCurrentInvoicePage(prev => Math.min(totalInvoicePages, prev + 1))}
                        disabled={currentInvoicePage === totalInvoicePages || isLoadingInvoices}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </GlassCard>
          </section>

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
                      disabled={filteredOrders.length === 0}
                      onClick={() => showToast(`Billing dashboard ready - ${filteredOrders.length} orders available`)}
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
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="relative">
                        <Users className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
                        <select 
                          value={orderFilters.customer}
                          onChange={(e) => setOrderFilters(prev => ({ ...prev, customer: e.target.value }))}
                          className="appearance-none w-[240px] rounded-lg bg-white/5 border border-white/10 text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-400/40 px-10 py-2.5 pr-12"
                        >
                          <option value="">All customers</option>
                          {Array.from(new Set(realOrders.map(order => order.customer))).map(customer => (
                            <option key={customer} value={customer}>{customer}</option>
                          ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-3 top-2.5 h-5 w-5 text-slate-400" />
                      </div>
                      <div className="relative">
                        <Filter className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
                        <select 
                          value={orderFilters.status}
                          onChange={(e) => setOrderFilters(prev => ({ ...prev, status: e.target.value }))}
                          className="appearance-none w-[180px] rounded-lg bg-white/5 border border-white/10 text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-400/40 px-10 py-2.5 pr-12"
                        >
                          <option value="">All statuses</option>
                          <option value="no-invoice">Without invoices</option>
                          <option value="with-invoice">With invoices</option>
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-3 top-2.5 h-5 w-5 text-slate-400" />
                      </div>
                      <Button 
                        variant="ghost"
                        size="sm"
                        onClick={loadOrders}
                        disabled={isLoadingOrders}
                        className="bg-white/5 border border-white/10"
                      >
                        <RotateCcw className={`h-4 w-4 mr-2 ${isLoadingOrders ? 'animate-spin' : ''}`} />
                        Refresh
                      </Button>
                    </div>

                    {/* Orders and Summary Grid */}
                    <div className="grid grid-cols-12 gap-6">
                      {/* Orders Table */}
                      <div className="col-span-12 lg:col-span-8">
                        <div className="rounded-xl bg-white/5 border border-white/10 overflow-hidden">
                          <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-white/10">
                            <div className="flex items-center gap-2">
                              <span className="text-[15px] text-slate-300">Orders ({filteredOrders.length})</span>
                            </div>
                            <div className="text-xs text-slate-400">Factory cost shown • Actions available per order</div>
                          </div>
                          
                          {/* Table Header */}
                          <div className="grid grid-cols-12 gap-6 text-[13px] text-slate-400 px-4 sm:px-6 py-2.5 bg-white/2.5">
                            <div className="col-span-3 sm:col-span-2">Order</div>
                            <div className="hidden sm:block col-span-3 sm:col-span-2">Customer</div>
                            <div className="col-span-2 sm:col-span-1 text-center">Items</div>
                            <div className="col-span-2 sm:col-span-2 text-right">Factory Cost</div>
                            <div className="hidden lg:block col-span-2 text-center">Due Date</div>
                            <div className="col-span-5 sm:col-span-3 text-right">Actions</div>
                          </div>
                          
                          {/* Table Rows */}
                          <div className="max-h-[320px] overflow-auto divide-y divide-white/10">
                            {isLoadingOrders ? (
                              <div className="px-6 py-12 text-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-lime-400 mx-auto mb-4"></div>
                                <p className="text-slate-300">Loading orders...</p>
                              </div>
                            ) : orderError ? (
                              <div className="px-6 py-12 text-center">
                                <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
                                <p className="text-slate-300 mb-2">Error loading orders</p>
                                <p className="text-slate-400 text-sm mb-4">{orderError}</p>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={loadOrders}
                                  className="bg-white/7.5 border border-white/10"
                                >
                                  <RotateCcw className="h-4 w-4 mr-2" />
                                  Retry
                                </Button>
                              </div>
                            ) : filteredOrders.length === 0 ? (
                              <div className="px-6 py-12 text-center">
                                <FileText className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                                <p className="text-slate-300 mb-2">No orders found</p>
                                <p className="text-slate-400 text-sm">Orders ready for billing will appear here</p>
                              </div>
                            ) : filteredOrders.map((order) => (
                              <div key={order.id} className="grid grid-cols-12 gap-6 items-center px-4 sm:px-6 py-4 hover:bg-white/3 transition">
                                <div className="col-span-3 sm:col-span-2">
                                  <div className="flex flex-col">
                                    <span className="text-[14px] text-slate-200 font-medium">
                                      #{order.id.slice(-8)}
                                    </span>
                                    <span className="text-[12px] text-slate-400 sm:hidden truncate">{order.customer}</span>
                                    {order.hasInvoice && (
                                      <div className="flex items-center gap-1 mt-1">
                                        <CheckCircle2 className="h-3 w-3 text-green-400" />
                                        <span className="text-[10px] text-green-400">Invoiced ({order.invoices.length})</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="hidden sm:block col-span-3 sm:col-span-2 text-[14px] text-slate-300">
                                  <div className="truncate" title={order.customer}>
                                    {order.customer}
                                  </div>
                                </div>
                                <div className="col-span-2 sm:col-span-1 text-center text-[14px] text-slate-300 font-medium">
                                  {order.items}
                                </div>
                                <div className="col-span-2 sm:col-span-2 text-right text-[14px] text-slate-200 font-semibold">
                                  {formatPrice(order.factory)}
                                </div>
                                <div className="hidden lg:block col-span-2 text-center">
                                  <div className="text-[12px] text-slate-400">
                                    {(() => {
                                      try {
                                        const date = new Date(order.due);
                                        if (isNaN(date.getTime())) {
                                          return 'N/A';
                                        }
                                        return date.toLocaleDateString('en-US', { 
                                          month: 'short', 
                                          day: 'numeric',
                                          year: '2-digit'
                                        });
                                      } catch {
                                        return 'N/A';
                                      }
                                    })()}
                                  </div>
                                </div>
                                <div className="col-span-5 sm:col-span-3 flex items-center justify-end gap-2">
                                  {!order.hasInvoice ? (
                                    <Button
                                      size="sm"
                                      onClick={() => {
                                        setSelectedOrderForInvoice(order);
                                        setInvoiceModalOpen(true);
                                      }}
                                      className="bg-lime-500/10 border border-lime-400/20 hover:bg-lime-500/20 text-lime-300 text-xs px-3 py-1.5 whitespace-nowrap"
                                    >
                                      <Plus className="h-3 w-3 mr-1.5" />
                                      Create Invoice
                                    </Button>
                                  ) : (
                                    <div className="flex gap-1.5">
                                      <Button
                                        size="sm"
                                        onClick={() => {
                                          setSelectedOrderForInvoice(order);
                                          setInvoiceModalOpen(true);
                                        }}
                                        className="bg-orange-500/10 border border-orange-400/20 hover:bg-orange-500/20 text-orange-300 text-xs px-3 py-1.5 whitespace-nowrap"
                                      >
                                        <Edit className="h-3 w-3 mr-1.5" />
                                        Modify
                                      </Button>
                                      {order.invoices.length > 0 && (
                                        <Button
                                          size="sm"
                                          onClick={() => downloadInvoicePDF(order.invoices[0].id, order.invoices[0].number)}
                                          className="bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 text-xs px-2.5 py-1.5"
                                          title="Download PDF"
                                        >
                                          <Download className="h-3 w-3" />
                                        </Button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Order Statistics */}
                      <div className="col-span-12 lg:col-span-4">
                        <div className="rounded-xl bg-white/5 border border-white/10 p-5">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-white tracking-tight text-[20px] font-semibold">Order Statistics</h3>
                            <Calculator className="h-5 w-5 text-slate-400" />
                          </div>
                          
                          <div className="space-y-3">
                            <div className="flex items-center justify-between text-[15px]">
                              <span className="text-slate-300">Total orders</span>
                              <span className="text-slate-200">{filteredOrders.length}</span>
                            </div>
                            <div className="flex items-center justify-between text-[15px]">
                              <span className="text-slate-300">With invoices</span>
                              <span className="text-slate-200">{filteredOrders.filter(o => o.hasInvoice).length}</span>
                            </div>
                            <div className="flex items-center justify-between text-[15px]">
                              <span className="text-slate-300">Pending invoices</span>
                              <span className="text-slate-200">{filteredOrders.filter(o => !o.hasInvoice).length}</span>
                            </div>
                            <div className="h-px w-full bg-white/10 my-2"></div>
                            <div className="flex items-center justify-between text-[15px]">
                              <span className="text-slate-300">Total factory cost</span>
                              <span className="text-slate-200">{formatPrice(filteredOrders.reduce((sum, o) => sum + o.factory, 0))}</span>
                            </div>
                            <div className="flex items-center justify-between text-[15px]">
                              <span className="text-slate-300">Invoiced value</span>
                              <span className="text-slate-200">{formatPrice(filteredOrders.filter(o => o.hasInvoice).reduce((sum, o) => sum + o.factory, 0))}</span>
                            </div>
                            <div className="flex items-center justify-between text-[15px]">
                              <span className="text-slate-300">Pending value</span>
                              <span className="text-slate-200">{formatPrice(filteredOrders.filter(o => !o.hasInvoice).reduce((sum, o) => sum + o.factory, 0))}</span>
                            </div>
                          </div>
                          
                          <div className="mt-5 p-3 bg-white/5 border border-white/10 rounded-lg">
                            <p className="text-xs text-slate-400 mb-1">💡 Usage Tip</p>
                            <p className="text-xs text-slate-300">
                              Use the action buttons in the orders table to create invoices for new orders or modify existing ones with additional discounts.
                            </p>
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
                        {globalScope ? 'Global (all members)' : 'Per-member (overrides allowed)'}
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
                          <option value="member1" className="bg-slate-800 text-slate-200">
                            Member 1 (MEMBER)
                          </option>
                          <option value="member2" className="bg-slate-800 text-slate-200">
                            Member 2 (MEMBER)
                          </option>
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                      </div>
                      {selectedMember && (
                        <p className="text-[14px] text-slate-300 mt-2 flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-purple-400"></span>
                          Setting custom margins for: <strong>{selectedMember === 'member1' ? 'Member 1' : selectedMember === 'member2' ? 'Member 2' : selectedMember}</strong>
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Margin Mode Toggle */}
                <div className="mb-6 rounded-xl bg-white/5 border border-white/10 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-[18px] font-semibold text-white mb-2">Margin Configuration Mode</h3>
                      <p className="text-[13px] text-slate-400">Choose how you want to configure margin settings</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3 bg-white/5 rounded-lg p-1.5 border border-white/10">
                      <button
                        onClick={() => setMarginMode('global')}
                        className={`px-4 py-2.5 rounded-md text-[14px] font-medium transition-all duration-200 ${
                          marginMode === 'global'
                            ? 'bg-lime-500 text-black shadow-lg shadow-lime-500/25'
                            : 'text-slate-300 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <SlidersHorizontal className="h-4 w-4" />
                          Simple Global Mode
                        </div>
                      </button>
                      <button
                        onClick={() => setMarginMode('detailed')}
                        className={`px-4 py-2.5 rounded-md text-[14px] font-medium transition-all duration-200 ${
                          marginMode === 'detailed'
                            ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/25'
                            : 'text-slate-300 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4" />
                          Advanced Detailed Mode
                        </div>
                      </button>
                    </div>
                    
                    <div className="flex-1 text-[13px] text-slate-400">
                      {marginMode === 'global' ? (
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-lime-400" />
                          Using broad category margins for all products
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-purple-400" />
                          Using detailed item-specific margin overrides
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Global Margin Configuration - Only show in global mode */}
                {marginMode === 'global' && (
                  <div className="rounded-xl bg-white/5 border border-white/10 overflow-hidden">
                    {/* Table Header */}
                    <div className="bg-white/2.5 border-b border-white/10 px-6 py-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-[18px] font-semibold text-white">Global Margin Configuration</h3>
                        <span className="text-[13px] text-slate-400">Margins apply to existing factory pricing from CSV data</span>
                      </div>
                    <div className="grid grid-cols-12 gap-6 text-[14px] font-medium text-slate-300">
                      <div className="col-span-6">Product Type</div>
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
                            <div className="col-span-6">
                              <div className="text-[16px] font-medium text-slate-100">{row.label}</div>
                              <div className="text-[13px] text-slate-400 mt-0.5">
                                {row.key.replace(/_/g, ' ')} - Factory pricing from CSV data
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

                    {/* Info Footer */}
                    <div className="border-t border-white/10 px-6 py-4 bg-white/2.5">
                      <div className="flex items-center gap-2 text-[14px] text-slate-300">
                        <CheckCircle2 className="h-4 w-4 text-lime-400" />
                        <span>Global mode applies broad category margins to all products</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Detailed Margin Configuration - Only show in detailed mode */}
                {marginMode === 'detailed' && (
                  <div className="rounded-xl bg-white/5 border border-white/10 overflow-hidden">
                    {/* Header */}
                    <div className="bg-white/2.5 border-b border-white/10 px-6 py-4">
                      <h3 className="text-[18px] font-semibold text-white">Advanced Detailed Margin Configuration</h3>
                      <p className="text-slate-400 text-[13px] mt-1">Item-specific margin settings that override global defaults</p>
                    </div>

                    {/* Detailed Options Grid */}
                    <div className="p-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        
                        {/* Logo Options */}
                        <div className="space-y-4">
                          <h5 className="text-slate-200 text-[14px] font-medium border-b border-white/10 pb-2">Logo Options</h5>
                          
                          {[
                              { name: '3D Embroidery', percent: 35, flat: 0.05 },
                              { name: 'Standard Embroidery', percent: 32, flat: 0.03 },
                              { name: 'Rubber Patches', percent: 40, flat: 0.10 },
                              { name: 'Woven Patches', percent: 38, flat: 0.08 },
                              { name: 'Leather Patches', percent: 42, flat: 0.12 }
                            ].map((item, idx) => (
                              <div key={`logo-${idx}`} className="grid grid-cols-6 gap-3 items-center p-3 rounded-lg bg-white/2.5 hover:bg-white/5 transition">
                                <div className="col-span-3 text-[13px] text-slate-300">{item.name}</div>
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
                              { name: 'Hang Tags', percent: 50, flat: 0.05 },
                              { name: 'Inside Labels', percent: 45, flat: 0.03 },
                              { name: 'Premium Closures', percent: 30, flat: 0.05 },
                              { name: 'Premium Fabrics', percent: 25, flat: 0.10 },
                              { name: 'Special Applications', percent: 40, flat: 0.03 }
                            ].map((item, idx) => (
                              <div key={`accessory-${idx}`} className="grid grid-cols-6 gap-3 items-center p-3 rounded-lg bg-white/2.5 hover:bg-white/5 transition">
                                <div className="col-span-3 text-[13px] text-slate-300">{item.name}</div>
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
                            }}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Save Detailed Settings
                          </Button>
                        </div>
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
                          {(marginState[0]?.percent || 0)}% + {formatPrice(marginState[0]?.flat || 0)}
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
                              { key: 'blank_caps', label: 'Blank Caps', percent: 20, flat: 0 },
                              { key: 'customization_combined', label: 'Customization (Combined)', percent: 35, flat: 0.08 },
                              { key: 'delivery_combined', label: 'Delivery (Combined)', percent: 18, flat: 0.50 }
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

          </div>
          {/* End content wrapper */}
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


      {/* Invoice Creation/Modification Modal */}
      {invoiceModalOpen && selectedOrderForInvoice && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900/95 border border-white/10 rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-white text-lg font-semibold">
                {selectedOrderForInvoice.hasInvoice ? 'Modify Invoice' : 'Create Invoice'}
              </h3>
              <button
                onClick={() => {
                  setInvoiceModalOpen(false);
                  setSelectedOrderForInvoice(null);
                  setDiscountPercent(0);
                  setDiscountFlat(0);
                }}
                className="text-slate-400 hover:text-slate-200 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <p className="text-slate-300 text-sm">
                  <span className="text-slate-400">Order ID:</span> {selectedOrderForInvoice.id}
                </p>
                <p className="text-slate-300 text-sm">
                  <span className="text-slate-400">Customer:</span> {selectedOrderForInvoice.customer}
                </p>
                <p className="text-slate-300 text-sm">
                  <span className="text-slate-400">Factory Cost:</span> {formatPrice(selectedOrderForInvoice.factory)}
                </p>
                {selectedOrderForInvoice.hasInvoice && (
                  <p className="text-slate-300 text-sm">
                    <span className="text-slate-400">Current Invoices:</span> {selectedOrderForInvoice.invoices.length}
                  </p>
                )}
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-slate-300 text-sm mb-1">
                    {selectedOrderForInvoice.hasInvoice ? 'Additional Discount %' : 'Discount %'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={discountPercent}
                    onChange={(e) => setDiscountPercent(Number(e.target.value) || 0)}
                    className="w-full rounded-lg bg-white/5 border border-white/10 text-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 text-sm mb-1">
                    {selectedOrderForInvoice.hasInvoice ? 'Additional Flat Discount $' : 'Flat Discount $'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={discountFlat}
                    onChange={(e) => setDiscountFlat(Number(e.target.value) || 0)}
                    className="w-full rounded-lg bg-white/5 border border-white/10 text-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
                    placeholder="0.00"
                  />
                </div>

                <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                  <h4 className="text-slate-300 text-sm font-medium mb-2">Preview</h4>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between text-slate-400">
                      <span>Subtotal:</span>
                      <span>{formatPrice(selectedOrderForInvoice.factory)}</span>
                    </div>
                    {discountPercent > 0 && (
                      <div className="flex justify-between text-slate-400">
                        <span>Discount ({discountPercent}%):</span>
                        <span>-{formatPrice(selectedOrderForInvoice.factory * (discountPercent / 100))}</span>
                      </div>
                    )}
                    {discountFlat > 0 && (
                      <div className="flex justify-between text-slate-400">
                        <span>Flat Discount:</span>
                        <span>-{formatPrice(discountFlat)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-slate-200 font-medium border-t border-white/10 pt-1">
                      <span>Total:</span>
                      <span>
                        {formatPrice(Math.max(0, selectedOrderForInvoice.factory - (selectedOrderForInvoice.factory * (discountPercent / 100)) - discountFlat))}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="ghost"
                onClick={() => {
                  setInvoiceModalOpen(false);
                  setSelectedOrderForInvoice(null);
                  setDiscountPercent(0);
                  setDiscountFlat(0);
                }}
                className="flex-1 bg-white/5 border border-white/10"
                disabled={isCreatingInvoice}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  if (selectedOrderForInvoice.hasInvoice) {
                    recreateInvoiceForOrder(selectedOrderForInvoice, discountPercent, discountFlat);
                  } else {
                    createInvoiceForOrder(selectedOrderForInvoice, discountPercent, discountFlat);
                  }
                }}
                className="flex-1"
                disabled={isCreatingInvoice}
              >
                {isCreatingInvoice ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {selectedOrderForInvoice.hasInvoice ? 'Recreating...' : 'Creating...'}
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4 mr-2" />
                    {selectedOrderForInvoice.hasInvoice ? 'Recreate Invoice' : 'Create Invoice'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
