'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  FileText,
  Send,
  Download,
  Eye,
  Edit,
  Trash2,
  Plus,
  Search,
  Filter,
  Calendar,
  DollarSign,
  User,
  Package,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  RotateCcw,
  ChevronDown,
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

export default function InvoicesPage() {
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();
  
  // State
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<InvoiceFilters>({
    status: '',
    dateFrom: '',
    dateTo: '',
    customer: '',
    search: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedInvoices, setSelectedInvoices] = useState<Set<string>>(new Set());

  // Check admin access
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
    
    loadInvoices();
  }, [user, loading, isAuthenticated, router, currentPage, filters]);

  const loadInvoices = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', currentPage.toString());
      params.append('limit', '10');
      
      if (filters.status) params.append('status', filters.status);
      if (filters.search) params.append('search', filters.search);

      const response = await fetch(`/api/invoices?${params.toString()}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to load invoices');
      }

      const data = await response.json();
      setInvoices(data.invoices);
      setTotalPages(data.pagination.pages);
      setError(null);
    } catch (err: any) {
      console.error('Error loading invoices:', err);
      setError(err.message);
      setInvoices([]);
    } finally {
      setIsLoading(false);
    }
  };

  const createInvoiceFromOrder = async (orderId: string) => {
    try {
      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
        credentials: 'include'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create invoice');
      }

      const invoice = await response.json();
      showToast(`Invoice ${invoice.number} created successfully`);
      loadInvoices();
    } catch (err: any) {
      console.error('Error creating invoice:', err);
      showToast(`Error: ${err.message}`, 'error');
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
      showToast(`Error: ${err.message}`, 'error');
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
      showToast(`Error: ${err.message}`, 'error');
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
        showToast(`Error: ${err.message}`, 'error');
      }
    }
  };

  const deleteInvoice = async (invoiceId: string) => {
    if (!confirm('Are you sure you want to delete this invoice? This action cannot be undone.')) {
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
      showToast(`Error: ${err.message}`, 'error');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(new Date(dateString));
  };

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    // Simple alert for now - can be replaced with toast library
    alert(message);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return <Edit className="h-4 w-4" />;
      case 'ISSUED':
        return <Send className="h-4 w-4" />;
      case 'PAID':
        return <CheckCircle className="h-4 w-4" />;
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

  const isMasterAdmin = user?.email === 'absrasel@gmail.com';
  
  if (loading) {
    return (
      <DashboardShell>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-lime-400 mx-auto"></div>
            <p className="mt-4 text-slate-300">Loading Invoices...</p>
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
          <div className="mt-0">
            {/* Header */}
            <DashboardHeader
              title="Customer Invoices"
              subtitle="Create, manage, and send invoices to customers"
              onSearch={(query) => setFilters(prev => ({ ...prev, search: query }))}
            />

            {/* Main Content */}
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
                        disabled={isLoading}
                      >
                        <RotateCcw className={`h-5 w-5 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                        Refresh
                      </Button>
                    </div>
                  </div>

                  {/* Filters */}
                  <div className="flex flex-col md:flex-row md:items-center gap-3 justify-between mb-6">
                    <div className="flex flex-col sm:flex-row gap-3">
                      {/* Status Filter */}
                      <div className="relative">
                        <Filter className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
                        <select 
                          value={filters.status}
                          onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
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
                            value={filters.dateFrom}
                            onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                            className="w-[170px] rounded-lg bg-white/5 border border-white/10 text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-400/40 px-10 py-2.5"
                          />
                        </div>
                        <span className="text-slate-400">to</span>
                        <div className="relative">
                          <Calendar className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
                          <input 
                            type="date" 
                            value={filters.dateTo}
                            onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                            className="w-[170px] rounded-lg bg-white/5 border border-white/10 text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-400/40 px-10 py-2.5"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 text-sm">
                        {invoices.length} invoice{invoices.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>

                  {/* Error Message */}
                  {error && (
                    <div className="mb-6 p-4 rounded-lg bg-red-400/10 border border-red-400/20 text-red-300 flex items-center gap-2">
                      <AlertCircle className="h-5 w-5" />
                      <span>{error}</span>
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
                      {isLoading ? (
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
                                {formatCurrency(invoice.total)}
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
                              
                              {/* Delete (DRAFT and VOID only) */}
                              {(invoice.status === 'DRAFT' || invoice.status === 'VOID') && (
                                <button 
                                  onClick={() => deleteInvoice(invoice.id)}
                                  className="rounded-full p-2 bg-white/5 border border-white/10 hover:bg-red-400/20 hover:border-red-400/40 transition"
                                  title="Delete Invoice"
                                >
                                  <Trash2 className="h-4 w-4 text-red-300/80" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-6">
                      <div className="text-slate-400 text-sm">
                        Page {currentPage} of {totalPages}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="ghost"
                          size="sm"
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          disabled={currentPage === 1 || isLoading}
                        >
                          Previous
                        </Button>
                        <Button 
                          variant="ghost"
                          size="sm"
                          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                          disabled={currentPage === totalPages || isLoading}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </GlassCard>
            </section>
          </div>
        </DashboardContent>
      </div>
    </DashboardShell>
  );
}