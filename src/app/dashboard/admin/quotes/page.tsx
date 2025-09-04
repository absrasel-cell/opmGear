'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  DashboardShell,
  DashboardContent,
  Button,
} from '@/components/ui/dashboard';
import Sidebar from '@/components/ui/dashboard/Sidebar';
import DashboardHeader from '@/components/ui/dashboard/DashboardHeader';


interface FormBasedQuote {
  id: string;
  productSlug: string;
  productName: string;
  customerInfo: {
    name: string;
    email: string;
    phone: string;
    company: string;
  };
  requirements: {
    quantity: string;
    colors: string;
    sizes: string;
    customization: string;
    timeline: string;
    additionalNotes: string;
  };
  status: 'PENDING' | 'REVIEWED' | 'QUOTED' | 'ACCEPTED' | 'REJECTED';
  createdAt: string;
  updatedAt: string;
  ipAddress?: string;
  userAgent?: string;
  userId?: string;
}

interface GalleryQuote {
  id: string;
  productSlug: string;
  productName: string;
  customerInfo: {
    name: string;
    email: string;
    phone: string;
    company: string;
  };
  requirements: {
    quantity: string;
    colors: string;
    sizes: string;
    customization: string;
    timeline: string;
    additionalNotes: string;
    referenceImage: string;
    source: string;
  };
  referenceImage: string;
  source: string;
  status: 'PENDING' | 'REVIEWED' | 'QUOTED' | 'ACCEPTED' | 'REJECTED';
  createdAt: string;
  updatedAt: string;
  ipAddress?: string;
  userAgent?: string;
  userId?: string;
}

interface QuoteOrder {
  id: string;
  sessionId: string;
  title: string;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'PENDING_REVIEW' | 'QUOTED' | 'CONVERTED' | 'ABANDONED' | 'CANCELLED';
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  complexity: 'SIMPLE' | 'MODERATE' | 'COMPLEX' | 'ENTERPRISE';
  customerInfo: {
    email: string;
    name: string;
    phone: string;
    company: string;
    address: any;
  };
  productType: string;
  quantities: any;
  colors: any;
  logoRequirements: {
    logos: Array<{
      location: string;
      type: string;
      size: string;
      cost?: number;
    }>;
  };
  customizationOptions: {
    accessories: any[];
    moldCharges: number;
    delivery: {
      method: string;
      leadTime: string;
      cost: number;
    };
  };
  extractedSpecs: {
    profile: string;
    billShape: string;
    structure: string;
    closure: string;
    fabric: string;
    sizes: string[];
  };
  estimatedCosts: {
    baseProductCost: number;
    logosCost: number;
    deliveryCost: number;
    total: number;
  };
  aiSummary: string;
  additionalRequirements: string;
  customerInstructions: string;
  internalNotes: string;
  tags: string[];
  followUpRequired: boolean;
  followUpDate: string;
  assignedTo: {
    id: string;
    email: string;
    name: string;
  };
  convertedOrder: {
    id: string;
    status: string;
    customerTotal: number;
  };
  files: Array<{
    id: string;
    originalName: string;
    fileType: string;
    fileSize: number;
    category: string;
    isLogo: boolean;
    uploadedAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
  lastActivityAt: string;
  completedAt: string;
  conversionDate: string;
  conversionValue: number;
}

export default function AdminQuotesPage() {
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();
  
  // State
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [quoteOrders, setQuoteOrders] = useState<QuoteOrder[]>([]);
  const [formBasedQuotes, setFormBasedQuotes] = useState<FormBasedQuote[]>([]);
  const [galleryQuotes, setGalleryQuotes] = useState<GalleryQuote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingFormQuotes, setIsLoadingFormQuotes] = useState(true);
  const [isLoadingGalleryQuotes, setIsLoadingGalleryQuotes] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formQuotesError, setFormQuotesError] = useState<string | null>(null);
  const [galleryQuotesError, setGalleryQuotesError] = useState<string | null>(null);
  const [expandedQuote, setExpandedQuote] = useState<string | null>(null);
  const [expandedFormQuote, setExpandedFormQuote] = useState<string | null>(null);
  const [expandedGalleryQuote, setExpandedGalleryQuote] = useState<string | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<string | null>(null);
  const [isUpdatingFormQuoteStatus, setIsUpdatingFormQuoteStatus] = useState<string | null>(null);
  const [isUpdatingGalleryQuoteStatus, setIsUpdatingGalleryQuoteStatus] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [formQuoteStatusFilter, setFormQuoteStatusFilter] = useState<string>('ALL');
  const [galleryQuoteStatusFilter, setGalleryQuoteStatusFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [complexityFilter, setComplexityFilter] = useState<string>('ALL');
  const [generatingPdf, setGeneratingPdf] = useState<string | null>(null);

  // Statistics
  const [stats, setStats] = useState({
    totalQuotes: 0,
    inProgressQuotes: 0,
    quotedQuotes: 0,
    convertedQuotes: 0
  });

  const [formQuoteStats, setFormQuoteStats] = useState({
    totalFormQuotes: 0,
    pendingFormQuotes: 0,
    reviewedFormQuotes: 0,
    quotedFormQuotes: 0,
    acceptedFormQuotes: 0
  });

  const [galleryQuoteStats, setGalleryQuoteStats] = useState({
    totalGalleryQuotes: 0,
    pendingGalleryQuotes: 0,
    reviewedGalleryQuotes: 0,
    quotedGalleryQuotes: 0,
    acceptedGalleryQuotes: 0
  });

  // Check admin access
  useEffect(() => {
    if (loading) return;
    
    if (!isAuthenticated || !user) {
      router.push('/login');
      return;
    }
    
    const isMasterAdmin = user.email === 'absrasel@gmail.com' || user.email === 'vic@onpointmarketing.com';
    const allowedRoles = ['STAFF', 'SUPER_ADMIN', 'MASTER_ADMIN'];
    if (!allowedRoles.includes(user.accessRole as any) && !isMasterAdmin) {
      router.push('/dashboard/member');
      return;
    }
    
    fetchQuoteOrders();
    fetchFormBasedQuotes();
    fetchGalleryQuotes();
  }, [user, loading, isAuthenticated, router, statusFilter, priorityFilter, complexityFilter, formQuoteStatusFilter, galleryQuoteStatusFilter]);

  const fetchQuoteOrders = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const queryParams = new URLSearchParams();
      if (statusFilter !== 'ALL') queryParams.append('status', statusFilter);
      if (priorityFilter !== 'ALL') queryParams.append('priority', priorityFilter);
      if (complexityFilter !== 'ALL') queryParams.append('complexity', complexityFilter);
      
      const response = await fetch(`/api/support/quote-orders?${queryParams}`);
      
      if (response.ok) {
        const data = await response.json();
        const allQuotes = data.quoteOrders || [];
        setQuoteOrders(allQuotes);
        
        // Calculate statistics
        const inProgressQuotes = allQuotes.filter((quote: QuoteOrder) => quote.status === 'IN_PROGRESS').length;
        const quotedQuotes = allQuotes.filter((quote: QuoteOrder) => quote.status === 'QUOTED').length;
        const convertedQuotes = allQuotes.filter((quote: QuoteOrder) => quote.status === 'CONVERTED').length;
        
        setStats({
          totalQuotes: allQuotes.length,
          inProgressQuotes,
          quotedQuotes,
          convertedQuotes
        });
      } else {
        console.error('Failed to fetch quote orders:', response.status);
        setError('Failed to load quote orders');
      }
    } catch (error) {
      console.error('Error fetching quote orders:', error);
      setError('Failed to load quote orders. Please try refreshing the page.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchFormBasedQuotes = async () => {
    try {
      setIsLoadingFormQuotes(true);
      setFormQuotesError(null);
      
      const queryParams = new URLSearchParams();
      if (formQuoteStatusFilter !== 'ALL') queryParams.append('status', formQuoteStatusFilter);
      
      const response = await fetch(`/api/quote-requests?${queryParams}`);
      
      if (response.ok) {
        const data = await response.json();
        const formQuotes = data.quoteRequests || [];
        setFormBasedQuotes(formQuotes);
        
        // Calculate form quotes statistics
        const pendingFormQuotes = formQuotes.filter((quote: FormBasedQuote) => quote.status === 'PENDING').length;
        const reviewedFormQuotes = formQuotes.filter((quote: FormBasedQuote) => quote.status === 'REVIEWED').length;
        const quotedFormQuotes = formQuotes.filter((quote: FormBasedQuote) => quote.status === 'QUOTED').length;
        const acceptedFormQuotes = formQuotes.filter((quote: FormBasedQuote) => quote.status === 'ACCEPTED').length;
        
        setFormQuoteStats({
          totalFormQuotes: formQuotes.length,
          pendingFormQuotes,
          reviewedFormQuotes,
          quotedFormQuotes,
          acceptedFormQuotes
        });
      } else {
        console.error('Failed to fetch form-based quotes:', response.status);
        setFormQuotesError('Failed to load form-based quotes');
      }
    } catch (error) {
      console.error('Error fetching form-based quotes:', error);
      setFormQuotesError('Failed to load form-based quotes. Please try refreshing the page.');
    } finally {
      setIsLoadingFormQuotes(false);
    }
  };

  const fetchGalleryQuotes = async () => {
    try {
      setIsLoadingGalleryQuotes(true);
      setGalleryQuotesError(null);
      
      const queryParams = new URLSearchParams();
      if (galleryQuoteStatusFilter !== 'ALL') queryParams.append('status', galleryQuoteStatusFilter);
      
      const response = await fetch(`/api/gallery-quotes?${queryParams}`);
      
      if (response.ok) {
        const data = await response.json();
        const galleryQuotes = data.galleryQuotes || [];
        setGalleryQuotes(galleryQuotes);
        
        // Calculate gallery quotes statistics
        const pendingGalleryQuotes = galleryQuotes.filter((quote: GalleryQuote) => quote.status === 'PENDING').length;
        const reviewedGalleryQuotes = galleryQuotes.filter((quote: GalleryQuote) => quote.status === 'REVIEWED').length;
        const quotedGalleryQuotes = galleryQuotes.filter((quote: GalleryQuote) => quote.status === 'QUOTED').length;
        const acceptedGalleryQuotes = galleryQuotes.filter((quote: GalleryQuote) => quote.status === 'ACCEPTED').length;
        
        setGalleryQuoteStats({
          totalGalleryQuotes: galleryQuotes.length,
          pendingGalleryQuotes,
          reviewedGalleryQuotes,
          quotedGalleryQuotes,
          acceptedGalleryQuotes
        });
      } else {
        console.error('Failed to fetch gallery quotes:', response.status);
        setGalleryQuotesError('Failed to load gallery quotes');
      }
    } catch (error) {
      console.error('Error fetching gallery quotes:', error);
      setGalleryQuotesError('Failed to load gallery quotes. Please try refreshing the page.');
    } finally {
      setIsLoadingGalleryQuotes(false);
    }
  };

  const updateFormQuoteStatus = async (quoteId: string, newStatus: string) => {
    setIsUpdatingFormQuoteStatus(quoteId);
    try {
      const response = await fetch(`/api/quote-requests`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ id: quoteId, status: newStatus }),
      });

      if (response.ok) {
        // Update local state
        setFormBasedQuotes(prev => prev.map(quote => 
          quote.id === quoteId 
            ? { ...quote, status: newStatus as any }
            : quote
        ));
        // Refresh stats
        fetchFormBasedQuotes();
      } else {
        alert('Failed to update quote status');
      }
    } catch (error) {
      console.error('Error updating form quote status:', error);
      alert('Error updating quote status');
    } finally {
      setIsUpdatingFormQuoteStatus(null);
    }
  };

  const updateGalleryQuoteStatus = async (quoteId: string, newStatus: string) => {
    setIsUpdatingGalleryQuoteStatus(quoteId);
    try {
      const response = await fetch(`/api/gallery-quotes`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ id: quoteId, status: newStatus }),
      });

      if (response.ok) {
        // Update local state
        setGalleryQuotes(prev => prev.map(quote => 
          quote.id === quoteId 
            ? { ...quote, status: newStatus as any }
            : quote
        ));
        // Refresh stats
        fetchGalleryQuotes();
      } else {
        alert('Failed to update gallery quote status');
      }
    } catch (error) {
      console.error('Error updating gallery quote status:', error);
      alert('Error updating gallery quote status');
    } finally {
      setIsUpdatingGalleryQuoteStatus(null);
    }
  };

  const updateQuoteStatus = async (quoteId: string, newStatus: string) => {
    setIsUpdatingStatus(quoteId);
    try {
      const response = await fetch(`/api/support/quote-orders?id=${quoteId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        // Update local state
        setQuoteOrders(prev => prev.map(quote => 
          quote.id === quoteId 
            ? { ...quote, status: newStatus as any }
            : quote
        ));
        // Refresh stats
        fetchQuoteOrders();
      } else {
        alert('Failed to update quote status');
      }
    } catch (error) {
      console.error('Error updating quote status:', error);
      alert('Error updating quote status');
    } finally {
      setIsUpdatingStatus(null);
    }
  };

  const generateQuotePdf = async (quoteId: string, quoteTitle?: string) => {
    setGeneratingPdf(quoteId);
    try {
      console.log(`Generating PDF for quote ${quoteId}...`);
      
      const response = await fetch(`/api/quotes/${quoteId}/pdf`, {
        method: 'GET',
        headers: {
          'Accept': 'application/pdf'
        }
      });

      if (response.ok) {
        // Create blob from response
        const pdfBlob = await response.blob();
        
        // Create download link
        const url = window.URL.createObjectURL(pdfBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `quote-${quoteId.slice(-8)}-${quoteTitle?.replace(/[^a-zA-Z0-9]/g, '_') || 'quote'}.pdf`;
        document.body.appendChild(link);
        link.click();
        
        // Cleanup
        window.URL.revokeObjectURL(url);
        document.body.removeChild(link);
        
        console.log(`PDF generated and downloaded successfully for quote ${quoteId}`);
      } else {
        const errorData = await response.json();
        console.error('Failed to generate PDF:', errorData);
        alert(`Failed to generate PDF: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF. Please try again.');
    } finally {
      setGeneratingPdf(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'QUOTED':
        return 'bg-blue-500/20 text-blue-400 border border-blue-500/30';
      case 'CONVERTED':
        return 'bg-green-500/20 text-green-400 border border-green-500/30';
      case 'CANCELLED':
      case 'ABANDONED':
        return 'bg-red-500/20 text-red-400 border border-red-500/30';
      case 'IN_PROGRESS':
        return 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30';
      case 'PENDING_REVIEW':
        return 'bg-orange-500/20 text-orange-400 border border-orange-500/30';
      case 'COMPLETED':
        return 'bg-purple-500/20 text-purple-400 border border-purple-500/30';
      default:
        return 'bg-slate-500/20 text-slate-400 border border-slate-500/30';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return 'bg-red-500/20 text-red-400 border border-red-500/30';
      case 'HIGH':
        return 'bg-orange-500/20 text-orange-400 border border-orange-500/30';
      case 'NORMAL':
        return 'bg-blue-500/20 text-blue-400 border border-blue-500/30';
      case 'LOW':
        return 'bg-gray-500/20 text-gray-400 border border-gray-500/30';
      default:
        return 'bg-slate-500/20 text-slate-400 border border-slate-500/30';
    }
  };

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'ENTERPRISE':
        return 'bg-purple-500/20 text-purple-400 border border-purple-500/30';
      case 'COMPLEX':
        return 'bg-red-500/20 text-red-400 border border-red-500/30';
      case 'MODERATE':
        return 'bg-orange-500/20 text-orange-400 border border-orange-500/30';
      case 'SIMPLE':
        return 'bg-green-500/20 text-green-400 border border-green-500/30';
      default:
        return 'bg-slate-500/20 text-slate-400 border border-slate-500/30';
    }
  };

  const exportQuoteOrders = () => {
    if (quoteOrders.length === 0) {
      alert('No quote orders to export');
      return;
    }

    // Create CSV content
    const headers = [
      'Quote ID',
      'Title',
      'Status',
      'Priority',
      'Complexity',
      'Customer Name',
      'Customer Email',
      'Customer Company',
      'Product Type',
      'Total Cost',
      'Base Cost',
      'Logo Cost',
      'Delivery Cost',
      'Created Date',
      'Last Activity',
      'AI Summary'
    ];

    const csvContent = [
      headers.join(','),
      ...quoteOrders.map(quote => [
        `"${quote.id.slice(-8)}"`,
        `"${(quote.title || '').replace(/"/g, '""')}"`,
        `"${quote.status}"`,
        `"${quote.priority}"`,
        `"${quote.complexity}"`,
        `"${(quote.customerInfo?.name || '').replace(/"/g, '""')}"`,
        `"${(quote.customerInfo?.email || '').replace(/"/g, '""')}"`,
        `"${(quote.customerInfo?.company || '').replace(/"/g, '""')}"`,
        `"${(quote.productType || '').replace(/"/g, '""')}"`,
        `"${quote.estimatedCosts?.total?.toFixed(2) || '0.00'}"`,
        `"${quote.estimatedCosts?.baseProductCost?.toFixed(2) || '0.00'}"`,
        `"${quote.estimatedCosts?.logosCost?.toFixed(2) || '0.00'}"`,
        `"${quote.estimatedCosts?.deliveryCost?.toFixed(2) || '0.00'}"`,
        `"${new Date(quote.createdAt).toLocaleDateString()}"`,
        `"${new Date(quote.lastActivityAt).toLocaleDateString()}"`,
        `"${(quote.aiSummary || '').replace(/"/g, '""')}"`
      ].join(','))
    ].join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `quote-orders-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isMasterAdmin = user?.email === 'absrasel@gmail.com';
  
  if (loading) {
    return (
      <DashboardShell>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-lime-400 mx-auto"></div>
            <p className="mt-6 text-slate-300 text-lg">Loading Quote Requests...</p>
            <p className="text-slate-500 text-sm">Please wait while we fetch your data</p>
          </div>
        </div>
      </DashboardShell>
    );
  }

  if (!isAuthenticated || !user || (!['STAFF','SUPER_ADMIN','MASTER_ADMIN'].includes(user.accessRole as any) && !isMasterAdmin)) {
    return (
      <DashboardShell>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
            <p className="text-slate-400 mb-6">You need admin privileges to access this page.</p>
            <button
              onClick={() => router.push('/dashboard')}
              className="inline-flex items-center px-6 py-3 bg-lime-400 text-black font-semibold rounded-lg hover:bg-lime-300 transition-all duration-200"
            >
              Go to Dashboard
            </button>
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
          {/* Content wrapper with proper spacing */}
          <div className="mt-10">
            {/* Header */}
          <DashboardHeader
            title="Quote Requests"
            subtitle="Manage and respond to customer quote requests for custom products."
            onSearch={(query) => console.log('Search:', query)}
            sticky={false}
            actions={
              <Link href="/dashboard/admin">
                <Button variant="secondary" className="ml-auto">
                  ← Back to Dashboard
                </Button>
              </Link>
            }
          />

          {/* Error Display */}
          {error && (
            <section className="px-6 md:px-10 mt-6">
              <div className="border border-red-500/30 bg-red-500/10 backdrop-blur-xl ring-1 ring-red-500/5 shadow-lg rounded-lg p-4">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center mr-3">
                    <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-red-400">Error Loading Data</h4>
                    <p className="text-sm text-red-300">{error}</p>
                  </div>
                  <button
                    onClick={fetchQuoteOrders}
                    className="ml-4 px-3 py-1 bg-red-500/20 text-red-400 border border-red-500/30 rounded hover:bg-red-500/30 transition-colors"
                  >
                    Retry
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* Stats Cards */}
          <section className="px-6 md:px-10 mt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
              {/* Total Quotes */}
              <div className="border border-white/10 bg-white/5 backdrop-blur-xl ring-1 ring-white/5 shadow-lg rounded-lg p-6 hover:transform hover:scale-105 transition-all duration-200">
              <div className="flex items-start justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 text-slate-300 text-sm font-medium">
                    <div className="w-6 h-6 bg-blue-500/20 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    Total Quotes
                  </div>
                  <div className="mt-3 text-3xl font-bold tracking-tight text-white">
                    {stats.totalQuotes}
                  </div>
                  <div className="mt-1 text-xs text-slate-400">
                    All time quote requests
                  </div>
                </div>
                <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center border border-blue-500/20">
                  <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
              </div>
              </div>

              {/* In Progress Quotes */}
              <div className="border border-white/10 bg-white/5 backdrop-blur-xl ring-1 ring-white/5 shadow-lg rounded-lg p-6 hover:transform hover:scale-105 transition-all duration-200">
              <div className="flex items-start justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 text-slate-300 text-sm font-medium">
                    <div className="w-6 h-6 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    In Progress
                  </div>
                  <div className="mt-3 text-3xl font-bold tracking-tight text-white">
                    {stats.inProgressQuotes}
                  </div>
                  <div className="mt-1 text-xs text-slate-400">
                    Being processed by AI
                  </div>
                </div>
                <div className="w-12 h-12 bg-yellow-500/10 rounded-xl flex items-center justify-center border border-yellow-500/20">
                  <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              </div>

              {/* Quoted */}
              <div className="border border-white/10 bg-white/5 backdrop-blur-xl ring-1 ring-white/5 shadow-lg rounded-lg p-6 hover:transform hover:scale-105 transition-all duration-200">
              <div className="flex items-start justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 text-slate-300 text-sm font-medium">
                    <div className="w-6 h-6 bg-blue-500/20 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    Quoted
                  </div>
                  <div className="mt-3 text-3xl font-bold tracking-tight text-white">
                    {stats.quotedQuotes}
                  </div>
                  <div className="mt-1 text-xs text-slate-400">
                    Ready for customer
                  </div>
                </div>
                <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center border border-blue-500/20">
                  <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              </div>
              </div>

              {/* Converted Quotes */}
              <div className="border border-white/10 bg-white/5 backdrop-blur-xl ring-1 ring-white/5 shadow-lg rounded-lg p-6 hover:transform hover:scale-105 transition-all duration-200">
              <div className="flex items-start justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 text-slate-300 text-sm font-medium">
                    <div className="w-6 h-6 bg-green-500/20 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    Converted
                  </div>
                  <div className="mt-3 text-3xl font-bold tracking-tight text-white">
                    {stats.convertedQuotes}
                  </div>
                  <div className="mt-1 text-xs text-slate-400">
                    Converted to orders
                  </div>
                </div>
                <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center border border-green-500/20">
                  <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              </div>
            </div>
          </section>

          {/* Filters */}
          <section className="px-6 md:px-10 mt-6">
            <div className="border border-white/10 bg-white/5 backdrop-blur-xl ring-1 ring-white/5 shadow-lg rounded-lg p-4">
              <div className="flex flex-wrap items-center gap-4">
                <h3 className="text-sm font-medium text-white">Filters:</h3>
                
                {/* Status Filter */}
                <div>
                  <select
                    value={statusFilter}
                    onChange={(e) => {setStatusFilter(e.target.value); fetchQuoteOrders();}}
                    className="text-sm border border-white/10 rounded-lg px-3 py-2 bg-black/30 text-white focus:ring-1 focus:ring-lime-400/50 focus:border-lime-400/50"
                  >
                    <option value="ALL" className="bg-gray-800 text-white">All Status</option>
                    <option value="IN_PROGRESS" className="bg-gray-800 text-white">In Progress</option>
                    <option value="QUOTED" className="bg-gray-800 text-white">Quoted</option>
                    <option value="CONVERTED" className="bg-gray-800 text-white">Converted</option>
                    <option value="COMPLETED" className="bg-gray-800 text-white">Completed</option>
                    <option value="CANCELLED" className="bg-gray-800 text-white">Cancelled</option>
                    <option value="ABANDONED" className="bg-gray-800 text-white">Abandoned</option>
                  </select>
                </div>

                {/* Priority Filter */}
                <div>
                  <select
                    value={priorityFilter}
                    onChange={(e) => {setPriorityFilter(e.target.value); fetchQuoteOrders();}}
                    className="text-sm border border-white/10 rounded-lg px-3 py-2 bg-black/30 text-white focus:ring-1 focus:ring-lime-400/50 focus:border-lime-400/50"
                  >
                    <option value="ALL" className="bg-gray-800 text-white">All Priority</option>
                    <option value="URGENT" className="bg-gray-800 text-white">Urgent</option>
                    <option value="HIGH" className="bg-gray-800 text-white">High</option>
                    <option value="NORMAL" className="bg-gray-800 text-white">Normal</option>
                    <option value="LOW" className="bg-gray-800 text-white">Low</option>
                  </select>
                </div>

                {/* Complexity Filter */}
                <div>
                  <select
                    value={complexityFilter}
                    onChange={(e) => {setComplexityFilter(e.target.value); fetchQuoteOrders();}}
                    className="text-sm border border-white/10 rounded-lg px-3 py-2 bg-black/30 text-white focus:ring-1 focus:ring-lime-400/50 focus:border-lime-400/50"
                  >
                    <option value="ALL" className="bg-gray-800 text-white">All Complexity</option>
                    <option value="SIMPLE" className="bg-gray-800 text-white">Simple</option>
                    <option value="MODERATE" className="bg-gray-800 text-white">Moderate</option>
                    <option value="COMPLEX" className="bg-gray-800 text-white">Complex</option>
                    <option value="ENTERPRISE" className="bg-gray-800 text-white">Enterprise</option>
                  </select>
                </div>

                <div className="ml-auto">
                  <button
                    onClick={() => {
                      setStatusFilter('ALL');
                      setPriorityFilter('ALL');
                      setComplexityFilter('ALL');
                      fetchQuoteOrders();
                    }}
                    className="px-3 py-2 bg-gray-600/20 text-gray-400 border border-gray-500/30 rounded hover:bg-gray-600/30 transition-colors text-sm"
                  >
                    Clear Filters
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* AI Quote Orders List */}
          <section className="px-6 md:px-10 mt-6">
            <div className="border border-white/10 bg-white/5 backdrop-blur-xl ring-1 ring-white/5 shadow-lg rounded-lg overflow-hidden">
              <div className="p-6 flex items-center justify-between border-b border-white/10 w-full">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-lime-500/20 rounded-lg flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-lime-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white">AI-Generated Quote Orders</h2>
                  <p className="text-sm text-slate-400">Review detailed AI-extracted quote specifications and pricing</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={fetchQuoteOrders}
                  className="px-3 py-2 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded hover:bg-blue-500/30 transition-colors text-sm"
                >
                  Refresh
                </button>
                <button
                  onClick={exportQuoteOrders}
                  className="px-3 py-2 bg-gray-600/20 text-gray-400 border border-gray-500/30 rounded hover:bg-gray-600/30 transition-colors text-sm"
                >
                  Export CSV
                </button>
              </div>
            </div>
              
            {isLoading ? (
              <div className="p-12 text-center">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-lime-400 mx-auto"></div>
                <p className="mt-6 text-slate-300 text-lg">Loading quote requests...</p>
                <p className="text-slate-500 text-sm">Please wait while we fetch your quotes</p>
              </div>
              ) : quoteOrders.length > 0 ? (
                <div className="overflow-hidden">
                  <ul className="divide-y divide-white/10">
                    {quoteOrders.map((quote) => (
                      <li key={quote.id} className="px-6 py-5 hover:bg-white/5 transition-colors">
                        <div className="cursor-pointer" onClick={() => setExpandedQuote(expandedQuote === quote.id ? null : quote.id)}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <div className="flex-shrink-0">
                                <div className="h-12 w-12 rounded-lg bg-lime-500/20 flex items-center justify-center border border-lime-500/30">
                                  <svg className="h-6 w-6 text-lime-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                  </svg>
                                </div>
                              </div>
                              <div className="ml-4 flex-1">
                                <div className="flex items-start justify-between">
                                  <div>
                                    <div className="text-sm font-semibold text-white">{quote.title || quote.productType}</div>
                                    <div className="text-sm text-slate-400 mt-1">
                                      {quote.id.slice(-8)} • {quote.customerInfo?.name || 'No Name'} • {new Date(quote.createdAt).toLocaleDateString()}
                                    </div>
                                    <div className="text-sm text-slate-500 mt-1">
                                      {quote.customerInfo?.email || 'No Email'} • {quote.customerInfo?.company || 'No Company'}
                                    </div>
                                    {quote.estimatedCosts?.total && (
                                      <div className="text-sm font-medium text-green-400 mt-1">
                                        Total: ${quote.estimatedCosts.total.toFixed(2)}
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex flex-col items-end space-y-2 ml-4">
                                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(quote.status)}`}>
                                      {quote.status.replace('_', ' ')}
                                    </span>
                                    <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${getPriorityColor(quote.priority)}`}>
                                      {quote.priority}
                                    </span>
                                    <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${getComplexityColor(quote.complexity)}`}>
                                      {quote.complexity}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-3">
                              <svg className={`h-5 w-5 text-slate-400 transform transition-transform ${
                                expandedQuote === quote.id ? 'rotate-180' : ''
                              }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </div>
                          </div>
                        </div>
                        
                        {/* Expanded Quote Details */}
                        {expandedQuote === quote.id && (
                          <div className="mt-4 pt-4 border-t border-white/10">
                            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                              {/* Customer Information */}
                              <div className="border border-white/10 bg-white/5 rounded-lg p-4">
                                <h4 className="text-sm font-medium text-white mb-3 flex items-center">
                                  <svg className="w-4 h-4 mr-2 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                  </svg>
                                  Customer Details
                                </h4>
                                <dl className="space-y-2">
                                  <div>
                                    <dt className="text-xs text-slate-400">Name</dt>
                                    <dd className="text-sm text-white">{quote.customerInfo?.name || 'Not provided'}</dd>
                                  </div>
                                  <div>
                                    <dt className="text-xs text-slate-400">Email</dt>
                                    <dd className="text-sm text-white">{quote.customerInfo?.email || 'Not provided'}</dd>
                                  </div>
                                  <div>
                                    <dt className="text-xs text-slate-400">Company</dt>
                                    <dd className="text-sm text-white">{quote.customerInfo?.company || 'Not provided'}</dd>
                                  </div>
                                  <div>
                                    <dt className="text-xs text-slate-400">Phone</dt>
                                    <dd className="text-sm text-white">{quote.customerInfo?.phone || 'Not provided'}</dd>
                                  </div>
                                  <div>
                                    <dt className="text-xs text-slate-400">Submitted</dt>
                                    <dd className="text-sm text-white">{new Date(quote.createdAt).toLocaleString()}</dd>
                                  </div>
                                </dl>
                              </div>

                              {/* Cap Specifications */}
                              <div className="border border-white/10 bg-white/5 rounded-lg p-4">
                                <h4 className="text-sm font-medium text-white mb-3 flex items-center">
                                  <svg className="w-4 h-4 mr-2 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                  </svg>
                                  Cap Specifications
                                </h4>
                                <dl className="space-y-2">
                                  <div>
                                    <dt className="text-xs text-slate-400">Product Type</dt>
                                    <dd className="text-sm text-white">{quote.productType || 'Not specified'}</dd>
                                  </div>
                                  <div>
                                    <dt className="text-xs text-slate-400">Profile</dt>
                                    <dd className="text-sm text-white">{quote.extractedSpecs?.profile || 'Not specified'}</dd>
                                  </div>
                                  <div>
                                    <dt className="text-xs text-slate-400">Bill Shape</dt>
                                    <dd className="text-sm text-white">{quote.extractedSpecs?.billShape || 'Not specified'}</dd>
                                  </div>
                                  <div>
                                    <dt className="text-xs text-slate-400">Structure</dt>
                                    <dd className="text-sm text-white">{quote.extractedSpecs?.structure || 'Not specified'}</dd>
                                  </div>
                                  <div>
                                    <dt className="text-xs text-slate-400">Closure</dt>
                                    <dd className="text-sm text-white">{quote.extractedSpecs?.closure || 'Not specified'}</dd>
                                  </div>
                                  <div>
                                    <dt className="text-xs text-slate-400">Fabric</dt>
                                    <dd className="text-sm text-white">{quote.extractedSpecs?.fabric || 'Not specified'}</dd>
                                  </div>
                                  {quote.extractedSpecs?.sizes && quote.extractedSpecs.sizes.length > 0 && (
                                    <div>
                                      <dt className="text-xs text-slate-400">Sizes</dt>
                                      <dd className="text-sm text-white">{quote.extractedSpecs.sizes.join(', ')}</dd>
                                    </div>
                                  )}
                                </dl>
                              </div>

                              {/* Logo Requirements */}
                              {((quote.logoRequirements?.logos && quote.logoRequirements.logos.length > 0) || 
                                (quote.files && quote.files.filter(f => f.isLogo).length > 0)) && (
                                <div className="border border-white/10 bg-white/5 rounded-lg p-4">
                                  <h4 className="text-sm font-medium text-white mb-3 flex items-center">
                                    <svg className="w-4 h-4 mr-2 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                    </svg>
                                    Logo Requirements
                                  </h4>
                                  
                                  {/* Logo Specifications */}
                                  {quote.logoRequirements?.logos && quote.logoRequirements.logos.length > 0 && (
                                    <div className="mb-4">
                                      <h5 className="text-xs font-medium text-slate-300 mb-2 flex items-center">
                                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        Specifications
                                      </h5>
                                      <div className="space-y-2">
                                        {quote.logoRequirements.logos.map((logo, index) => (
                                          <div key={index} className="p-3 bg-black/20 rounded border border-white/5">
                                            <div className="grid grid-cols-2 gap-2 text-xs">
                                              <div>
                                                <span className="text-slate-400">Location:</span>
                                                <span className="text-white ml-1">{logo.location}</span>
                                              </div>
                                              <div>
                                                <span className="text-slate-400">Type:</span>
                                                <span className="text-white ml-1">{logo.type}</span>
                                              </div>
                                              <div>
                                                <span className="text-slate-400">Size:</span>
                                                <span className="text-white ml-1">{logo.size}</span>
                                              </div>
                                              {logo.cost && (
                                                <div>
                                                  <span className="text-slate-400">Cost:</span>
                                                  <span className="text-green-400 ml-1">${logo.cost.toFixed(2)}</span>
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Uploaded Logo Files */}
                                  {quote.files && quote.files.filter(f => f.isLogo).length > 0 && (
                                    <div>
                                      <h5 className="text-xs font-medium text-slate-300 mb-2 flex items-center">
                                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                        Uploaded Logo Files ({quote.files.filter(f => f.isLogo).length})
                                      </h5>
                                      <div className="space-y-3">
                                        {quote.files.filter(file => file.isLogo).map((file, index) => (
                                          <div key={index} className="p-4 bg-black/20 rounded-lg border border-white/5">
                                            <div className="flex items-start gap-4">
                                              {/* Logo Preview */}
                                              <div className="flex-shrink-0">
                                                {file.filePath && file.fileType?.startsWith('image/') ? (
                                                  <div className="relative group">
                                                    <img
                                                      src={file.filePath}
                                                      alt={file.originalName}
                                                      className="w-20 h-20 object-contain rounded-lg bg-white/10 border border-white/20 cursor-pointer hover:scale-105 transition-transform"
                                                      onClick={() => window.open(file.filePath, '_blank')}
                                                      onError={(e) => {
                                                        e.currentTarget.style.display = 'none';
                                                        e.currentTarget.nextElementSibling.style.display = 'flex';
                                                      }}
                                                    />
                                                    <div className="hidden w-20 h-20 bg-slate-500/20 rounded-lg border border-white/20 items-center justify-center">
                                                      <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                      </svg>
                                                    </div>
                                                    {/* Hover overlay for click hint */}
                                                    <div className="absolute inset-0 bg-black/40 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                      <span className="text-white text-xs font-medium">Click to view</span>
                                                    </div>
                                                  </div>
                                                ) : (
                                                  <div className="w-20 h-20 bg-slate-500/20 rounded-lg border border-white/20 flex items-center justify-center">
                                                    <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                    </svg>
                                                  </div>
                                                )}
                                              </div>

                                              {/* File Details */}
                                              <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-2">
                                                  <span className="px-2 py-1 text-xs bg-purple-500/20 text-purple-300 rounded font-medium">
                                                    Logo File
                                                  </span>
                                                  <span className="text-sm text-white font-medium truncate">
                                                    {file.originalName}
                                                  </span>
                                                </div>
                                                
                                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 text-xs text-slate-400 mb-2">
                                                  <div className="flex items-center space-x-1">
                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                                    </svg>
                                                    <span>{file.fileType}</span>
                                                  </div>
                                                  <div className="flex items-center space-x-1">
                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2h4a1 1 0 110 2h-1v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6H3a1 1 0 110-2h4z" />
                                                    </svg>
                                                    <span>{Math.round(file.fileSize / 1024)} KB</span>
                                                  </div>
                                                  <div className="flex items-center space-x-1">
                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                    <span>{new Date(file.uploadedAt).toLocaleDateString()}</span>
                                                  </div>
                                                  <div className="flex items-center space-x-1">
                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a1.994 1.994 0 01-1.414.586H7a4 4 0 01-4-4V7a4 4 0 014-4z" />
                                                    </svg>
                                                    <span>{file.category}</span>
                                                  </div>
                                                </div>

                                                {file.description && (
                                                  <p className="text-xs text-slate-300 italic mb-2 bg-white/5 p-2 rounded border border-white/10">
                                                    {file.description}
                                                  </p>
                                                )}
                                              </div>

                                              {/* Action Buttons */}
                                              <div className="flex flex-col gap-2">
                                                {file.filePath && file.filePath.includes('http') ? (
                                                  <a
                                                    href={file.filePath}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="px-3 py-1 text-xs bg-blue-500/20 text-blue-300 rounded hover:bg-blue-500/30 transition-colors font-medium text-center"
                                                  >
                                                    View Full Size
                                                  </a>
                                                ) : (
                                                  <button
                                                    onClick={() => {
                                                      if (file.filePath.startsWith('/')) {
                                                        window.open(`${window.location.origin}${file.filePath}`, '_blank');
                                                      } else {
                                                        alert('File path not accessible');
                                                      }
                                                    }}
                                                    className="px-3 py-1 text-xs bg-blue-500/20 text-blue-300 rounded hover:bg-blue-500/30 transition-colors font-medium"
                                                  >
                                                    View File
                                                  </button>
                                                )}
                                                <button
                                                  onClick={() => {
                                                    const fileInfo = `Logo File: ${file.originalName}\nType: ${file.fileType}\nSize: ${Math.round(file.fileSize / 1024)} KB\nCategory: ${file.category}\nUploaded: ${new Date(file.uploadedAt).toLocaleString()}\nPath: ${file.filePath}`;
                                                    navigator.clipboard.writeText(fileInfo);
                                                    alert('Logo file info copied to clipboard!');
                                                  }}
                                                  className="px-3 py-1 text-xs bg-gray-600/20 text-gray-400 border border-gray-500/30 rounded hover:bg-gray-600/30 transition-colors font-medium"
                                                >
                                                  Copy Info
                                                </button>
                                              </div>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* No Logo Files Message */}
                                  {(!quote.logoRequirements?.logos || quote.logoRequirements.logos.length === 0) && 
                                   (!quote.files || quote.files.filter(f => f.isLogo).length === 0) && (
                                    <div className="text-center py-4">
                                      <div className="w-12 h-12 bg-slate-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                        </svg>
                                      </div>
                                      <p className="text-sm text-slate-400">No logo requirements or files specified</p>
                                    </div>
                                  )}
                                </div>
                              )}


                              {/* Delivery Information */}
                              {quote.customizationOptions?.delivery && (
                                <div className="border border-white/10 bg-white/5 rounded-lg p-4">
                                  <h4 className="text-sm font-medium text-white mb-3 flex items-center">
                                    <svg className="w-4 h-4 mr-2 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                    </svg>
                                    Delivery Information
                                  </h4>
                                  <dl className="space-y-2">
                                    <div>
                                      <dt className="text-xs text-slate-400">Method</dt>
                                      <dd className="text-sm text-white">{quote.customizationOptions.delivery.method || 'Not specified'}</dd>
                                    </div>
                                    <div>
                                      <dt className="text-xs text-slate-400">Lead Time</dt>
                                      <dd className="text-sm text-white">{quote.customizationOptions.delivery.leadTime || 'Not specified'}</dd>
                                    </div>
                                    {quote.customizationOptions.delivery.cost && (
                                      <div>
                                        <dt className="text-xs text-slate-400">Delivery Cost</dt>
                                        <dd className="text-sm text-green-400">${quote.customizationOptions.delivery.cost.toFixed(2)}</dd>
                                      </div>
                                    )}
                                  </dl>
                                </div>
                              )}

                              {/* Pricing Breakdown */}
                              {quote.estimatedCosts && (
                                <div className="border border-white/10 bg-white/5 rounded-lg p-4">
                                  <h4 className="text-sm font-medium text-white mb-3 flex items-center">
                                    <svg className="w-4 h-4 mr-2 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                                    </svg>
                                    Cost Breakdown
                                  </h4>
                                  <dl className="space-y-2">
                                    {quote.estimatedCosts.baseProductCost > 0 && (
                                      <div className="flex justify-between">
                                        <dt className="text-xs text-slate-400">Base Product Cost</dt>
                                        <dd className="text-sm text-white">${quote.estimatedCosts.baseProductCost.toFixed(2)}</dd>
                                      </div>
                                    )}
                                    {quote.estimatedCosts.logosCost > 0 && (
                                      <div className="flex justify-between">
                                        <dt className="text-xs text-slate-400">Logos Cost</dt>
                                        <dd className="text-sm text-white">${quote.estimatedCosts.logosCost.toFixed(2)}</dd>
                                      </div>
                                    )}
                                    {quote.estimatedCosts.deliveryCost > 0 && (
                                      <div className="flex justify-between">
                                        <dt className="text-xs text-slate-400">Delivery Cost</dt>
                                        <dd className="text-sm text-white">${quote.estimatedCosts.deliveryCost.toFixed(2)}</dd>
                                      </div>
                                    )}
                                    <div className="border-t border-white/10 pt-2 mt-2">
                                      <div className="flex justify-between">
                                        <dt className="text-sm font-medium text-white">Total Cost</dt>
                                        <dd className="text-lg font-bold text-green-400">${quote.estimatedCosts.total.toFixed(2)}</dd>
                                      </div>
                                    </div>
                                  </dl>
                                </div>
                              )}

                              {/* AI Summary & Status */}
                              <div className="border border-white/10 bg-white/5 rounded-lg p-4">
                                <h4 className="text-sm font-medium text-white mb-3 flex items-center">
                                  <svg className="w-4 h-4 mr-2 text-lime-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                  </svg>
                                  Status & Actions
                                </h4>
                                
                                {quote.aiSummary && (
                                  <div className="mb-4 p-3 bg-black/20 rounded border border-white/5">
                                    <div className="text-xs text-slate-400 mb-1">AI Summary</div>
                                    <div className="text-sm text-white">{quote.aiSummary}</div>
                                  </div>
                                )}

                                <dl className="space-y-2 mb-4">
                                  <div>
                                    <dt className="text-xs text-slate-400 mb-2">Current Status</dt>
                                    <dd className="text-sm text-white">
                                      <select
                                        value={quote.status}
                                        onChange={(e) => updateQuoteStatus(quote.id, e.target.value)}
                                        disabled={isUpdatingStatus === quote.id}
                                        className="w-full text-sm border border-white/10 rounded-lg px-3 py-2 bg-black/30 text-white focus:ring-1 focus:ring-lime-400/50 focus:border-lime-400/50 disabled:opacity-50 disabled:cursor-not-allowed"
                                      >
                                        <option value="IN_PROGRESS" className="bg-gray-800 text-white">In Progress</option>
                                        <option value="PENDING_REVIEW" className="bg-gray-800 text-white">Pending Review</option>
                                        <option value="QUOTED" className="bg-gray-800 text-white">Quoted</option>
                                        <option value="CONVERTED" className="bg-gray-800 text-white">Converted</option>
                                        <option value="COMPLETED" className="bg-gray-800 text-white">Completed</option>
                                        <option value="CANCELLED" className="bg-gray-800 text-white">Cancelled</option>
                                        <option value="ABANDONED" className="bg-gray-800 text-white">Abandoned</option>
                                      </select>
                                      {isUpdatingStatus === quote.id && (
                                        <span className="ml-2 text-xs text-gray-500">Updating...</span>
                                      )}
                                    </dd>
                                  </div>
                                </dl>
                                
                                {/* Action Buttons */}
                                <div className="flex flex-wrap gap-2">
                                  <button
                                    onClick={() => generateQuotePdf(quote.id, quote.title)}
                                    disabled={generatingPdf === quote.id}
                                    className="inline-flex items-center px-3 py-2 bg-green-500/20 text-green-400 border border-green-500/30 rounded-lg hover:bg-green-500/30 transition-all duration-200 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    {generatingPdf === quote.id ? (
                                      <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-400 mr-1"></div>
                                        Generating...
                                      </>
                                    ) : (
                                      <>
                                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        Download PDF
                                      </>
                                    )}
                                  </button>
                                  <a
                                    href={`mailto:${quote.customerInfo?.email}?subject=Quote Request ${quote.id.slice(-8)} - ${quote.title}`}
                                    className="inline-flex items-center px-3 py-2 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg hover:bg-blue-500/30 transition-all duration-200 text-sm font-medium"
                                  >
                                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                    Email
                                  </a>
                                  <button
                                    onClick={() => {
                                      const quoteDetails = `Quote ID: ${quote.id.slice(-8)}\nProduct: ${quote.productType}\nCustomer: ${quote.customerInfo?.name} (${quote.customerInfo?.email})\nTotal: $${quote.estimatedCosts?.total?.toFixed(2)}\nStatus: ${quote.status}\nSubmitted: ${new Date(quote.createdAt).toLocaleString()}`;
                                      navigator.clipboard.writeText(quoteDetails);
                                      alert('Quote details copied to clipboard!');
                                    }}
                                    className="inline-flex items-center px-3 py-2 bg-gray-600/20 text-gray-400 border border-gray-500/30 rounded-lg hover:bg-gray-600/30 transition-all duration-200 text-sm font-medium"
                                  >
                                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                                    </svg>
                                    Copy
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
            ) : (
              <div className="px-8 py-16 text-center">
                <div className="w-20 h-20 bg-slate-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-10 h-10 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">No AI quote orders found</h3>
                <p className="text-slate-400 mb-6">AI-generated quote orders from support system will appear here</p>
                <button
                  onClick={fetchQuoteOrders}
                  className="inline-flex items-center px-6 py-3 bg-lime-400 text-black font-semibold rounded-lg hover:bg-lime-300 transition-all duration-200 shadow-[0_0_30px_rgba(163,230,53,0.3)]"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh
                </button>
              </div>
            )}
            {/* Close container started above at line ~350 */}
          </div>
          </section>

          {/* Form-Based Quotes Section */}
          <section className="px-6 md:px-10 mt-8">
            <div className="border border-white/10 bg-white/5 backdrop-blur-xl ring-1 ring-white/5 shadow-lg rounded-lg overflow-hidden">
              <div className="p-6 flex items-center justify-between border-b border-white/10 w-full">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center mr-4">
                    <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-white">Traditional Quote Requests</h2>
                    <p className="text-sm text-slate-400">Manage form-based quote requests from customers</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <select
                    value={formQuoteStatusFilter}
                    onChange={(e) => {setFormQuoteStatusFilter(e.target.value); fetchFormBasedQuotes();}}
                    className="text-sm border border-white/10 rounded-lg px-3 py-2 bg-black/30 text-white focus:ring-1 focus:ring-lime-400/50 focus:border-lime-400/50"
                  >
                    <option value="ALL" className="bg-gray-800 text-white">All Status</option>
                    <option value="PENDING" className="bg-gray-800 text-white">Pending</option>
                    <option value="REVIEWED" className="bg-gray-800 text-white">Reviewed</option>
                    <option value="QUOTED" className="bg-gray-800 text-white">Quoted</option>
                    <option value="ACCEPTED" className="bg-gray-800 text-white">Accepted</option>
                    <option value="REJECTED" className="bg-gray-800 text-white">Rejected</option>
                  </select>
                  <button
                    onClick={fetchFormBasedQuotes}
                    className="px-3 py-2 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded hover:bg-blue-500/30 transition-colors text-sm"
                  >
                    Refresh
                  </button>
                </div>
              </div>
              
              {/* Form Quotes Statistics */}
              <div className="p-6 border-b border-white/10">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">{formQuoteStats.totalFormQuotes}</div>
                    <div className="text-xs text-slate-400">Total</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-400">{formQuoteStats.pendingFormQuotes}</div>
                    <div className="text-xs text-slate-400">Pending</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-400">{formQuoteStats.reviewedFormQuotes}</div>
                    <div className="text-xs text-slate-400">Reviewed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-400">{formQuoteStats.quotedFormQuotes}</div>
                    <div className="text-xs text-slate-400">Quoted</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-lime-400">{formQuoteStats.acceptedFormQuotes}</div>
                    <div className="text-xs text-slate-400">Accepted</div>
                  </div>
                </div>
              </div>

              {/* Form-Based Quotes Error Display */}
              {formQuotesError && (
                <div className="p-6 border-b border-white/10">
                  <div className="border border-red-500/30 bg-red-500/10 backdrop-blur-xl ring-1 ring-red-500/5 shadow-lg rounded-lg p-4">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center mr-3">
                        <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-red-400">Error Loading Form Quotes</h4>
                        <p className="text-sm text-red-300">{formQuotesError}</p>
                      </div>
                      <button
                        onClick={fetchFormBasedQuotes}
                        className="ml-4 px-3 py-1 bg-red-500/20 text-red-400 border border-red-500/30 rounded hover:bg-red-500/30 transition-colors"
                      >
                        Retry
                      </button>
                    </div>
                  </div>
                </div>
              )}
              
              {isLoadingFormQuotes ? (
                <div className="p-12 text-center">
                  <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-400 mx-auto"></div>
                  <p className="mt-6 text-slate-300 text-lg">Loading form-based quotes...</p>
                  <p className="text-slate-500 text-sm">Please wait while we fetch your form quotes</p>
                </div>
              ) : formBasedQuotes.length > 0 ? (
                <div className="overflow-hidden">
                  <ul className="divide-y divide-white/10">
                    {formBasedQuotes.map((quote) => (
                      <li key={quote.id} className="px-6 py-5 hover:bg-white/5 transition-colors">
                        <div className="cursor-pointer" onClick={() => setExpandedFormQuote(expandedFormQuote === quote.id ? null : quote.id)}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <div className="flex-shrink-0">
                                <div className="h-12 w-12 rounded-lg bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
                                  <svg className="h-6 w-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                </div>
                              </div>
                              <div className="ml-4 flex-1">
                                <div className="flex items-start justify-between">
                                  <div>
                                    <div className="text-sm font-semibold text-white">{quote.productName || 'Custom Cap Request'}</div>
                                    <div className="text-sm text-slate-400 mt-1">
                                      {quote.id.slice(-8)} • {quote.customerInfo?.name || 'No Name'} • {new Date(quote.createdAt).toLocaleDateString()}
                                    </div>
                                    <div className="text-sm text-slate-500 mt-1">
                                      {quote.customerInfo?.email || 'No Email'} • {quote.customerInfo?.company || 'No Company'}
                                    </div>
                                    <div className="text-sm text-slate-400 mt-1">
                                      Qty: {quote.requirements?.quantity || 'Not specified'} • Timeline: {quote.requirements?.timeline || 'Not specified'}
                                    </div>
                                  </div>
                                  <div className="flex flex-col items-end space-y-2 ml-4">
                                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                                      quote.status === 'PENDING' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                                      quote.status === 'REVIEWED' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                                      quote.status === 'QUOTED' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                                      quote.status === 'ACCEPTED' ? 'bg-lime-500/20 text-lime-400 border border-lime-500/30' :
                                      quote.status === 'REJECTED' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                                      'bg-slate-500/20 text-slate-400 border border-slate-500/30'
                                    }`}>
                                      {quote.status}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-3">
                              <svg className={`h-5 w-5 text-slate-400 transform transition-transform ${
                                expandedFormQuote === quote.id ? 'rotate-180' : ''
                              }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </div>
                          </div>
                        </div>
                        
                        {/* Expanded Form Quote Details */}
                        {expandedFormQuote === quote.id && (
                          <div className="mt-4 pt-4 border-t border-white/10">
                            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                              {/* Customer Information */}
                              <div className="border border-white/10 bg-white/5 rounded-lg p-4">
                                <h4 className="text-sm font-medium text-white mb-3 flex items-center">
                                  <svg className="w-4 h-4 mr-2 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                  </svg>
                                  Customer Details
                                </h4>
                                <dl className="space-y-2">
                                  <div>
                                    <dt className="text-xs text-slate-400">Name</dt>
                                    <dd className="text-sm text-white">{quote.customerInfo?.name || 'Not provided'}</dd>
                                  </div>
                                  <div>
                                    <dt className="text-xs text-slate-400">Email</dt>
                                    <dd className="text-sm text-white">{quote.customerInfo?.email || 'Not provided'}</dd>
                                  </div>
                                  <div>
                                    <dt className="text-xs text-slate-400">Phone</dt>
                                    <dd className="text-sm text-white">{quote.customerInfo?.phone || 'Not provided'}</dd>
                                  </div>
                                  <div>
                                    <dt className="text-xs text-slate-400">Company</dt>
                                    <dd className="text-sm text-white">{quote.customerInfo?.company || 'Not provided'}</dd>
                                  </div>
                                  <div>
                                    <dt className="text-xs text-slate-400">Submitted</dt>
                                    <dd className="text-sm text-white">{new Date(quote.createdAt).toLocaleString()}</dd>
                                  </div>
                                </dl>
                              </div>

                              {/* Product Requirements */}
                              <div className="border border-white/10 bg-white/5 rounded-lg p-4">
                                <h4 className="text-sm font-medium text-white mb-3 flex items-center">
                                  <svg className="w-4 h-4 mr-2 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                  Requirements
                                </h4>
                                <dl className="space-y-2">
                                  <div>
                                    <dt className="text-xs text-slate-400">Product</dt>
                                    <dd className="text-sm text-white">{quote.productName || 'Not specified'}</dd>
                                  </div>
                                  <div>
                                    <dt className="text-xs text-slate-400">Quantity</dt>
                                    <dd className="text-sm text-white">{quote.requirements?.quantity || 'Not specified'}</dd>
                                  </div>
                                  <div>
                                    <dt className="text-xs text-slate-400">Colors</dt>
                                    <dd className="text-sm text-white">{quote.requirements?.colors || 'Not specified'}</dd>
                                  </div>
                                  <div>
                                    <dt className="text-xs text-slate-400">Sizes</dt>
                                    <dd className="text-sm text-white">{quote.requirements?.sizes || 'Not specified'}</dd>
                                  </div>
                                  <div>
                                    <dt className="text-xs text-slate-400">Customization</dt>
                                    <dd className="text-sm text-white">{quote.requirements?.customization || 'Not specified'}</dd>
                                  </div>
                                  <div>
                                    <dt className="text-xs text-slate-400">Timeline</dt>
                                    <dd className="text-sm text-white">{quote.requirements?.timeline || 'Not specified'}</dd>
                                  </div>
                                </dl>
                              </div>

                              {/* Status & Actions */}
                              <div className="border border-white/10 bg-white/5 rounded-lg p-4">
                                <h4 className="text-sm font-medium text-white mb-3 flex items-center">
                                  <svg className="w-4 h-4 mr-2 text-lime-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                  </svg>
                                  Status & Actions
                                </h4>
                                
                                {quote.requirements?.additionalNotes && (
                                  <div className="mb-4 p-3 bg-black/20 rounded border border-white/5">
                                    <div className="text-xs text-slate-400 mb-1">Additional Notes</div>
                                    <div className="text-sm text-white">{quote.requirements.additionalNotes}</div>
                                  </div>
                                )}

                                <dl className="space-y-2 mb-4">
                                  <div>
                                    <dt className="text-xs text-slate-400 mb-2">Current Status</dt>
                                    <dd className="text-sm text-white">
                                      <select
                                        value={quote.status}
                                        onChange={(e) => updateFormQuoteStatus(quote.id, e.target.value)}
                                        disabled={isUpdatingFormQuoteStatus === quote.id}
                                        className="w-full text-sm border border-white/10 rounded-lg px-3 py-2 bg-black/30 text-white focus:ring-1 focus:ring-lime-400/50 focus:border-lime-400/50 disabled:opacity-50 disabled:cursor-not-allowed"
                                      >
                                        <option value="PENDING" className="bg-gray-800 text-white">Pending</option>
                                        <option value="REVIEWED" className="bg-gray-800 text-white">Reviewed</option>
                                        <option value="QUOTED" className="bg-gray-800 text-white">Quoted</option>
                                        <option value="ACCEPTED" className="bg-gray-800 text-white">Accepted</option>
                                        <option value="REJECTED" className="bg-gray-800 text-white">Rejected</option>
                                      </select>
                                      {isUpdatingFormQuoteStatus === quote.id && (
                                        <span className="ml-2 text-xs text-gray-500">Updating...</span>
                                      )}
                                    </dd>
                                  </div>
                                </dl>
                                
                                {/* Action Buttons */}
                                <div className="flex flex-wrap gap-2">
                                  <a
                                    href={`mailto:${quote.customerInfo?.email}?subject=Quote Request ${quote.id.slice(-8)} - ${quote.productName}`}
                                    className="inline-flex items-center px-3 py-2 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg hover:bg-blue-500/30 transition-all duration-200 text-sm font-medium"
                                  >
                                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                    Email Customer
                                  </a>
                                  <button
                                    onClick={() => {
                                      const quoteDetails = `Quote ID: ${quote.id.slice(-8)}\nProduct: ${quote.productName}\nCustomer: ${quote.customerInfo?.name} (${quote.customerInfo?.email})\nCompany: ${quote.customerInfo?.company || 'None'}\nQuantity: ${quote.requirements?.quantity}\nColors: ${quote.requirements?.colors}\nSizes: ${quote.requirements?.sizes}\nCustomization: ${quote.requirements?.customization}\nTimeline: ${quote.requirements?.timeline}\nStatus: ${quote.status}\nSubmitted: ${new Date(quote.createdAt).toLocaleString()}\nNotes: ${quote.requirements?.additionalNotes || 'None'}`;
                                      navigator.clipboard.writeText(quoteDetails);
                                      alert('Quote details copied to clipboard!');
                                    }}
                                    className="inline-flex items-center px-3 py-2 bg-gray-600/20 text-gray-400 border border-gray-500/30 rounded-lg hover:bg-gray-600/30 transition-all duration-200 text-sm font-medium"
                                  >
                                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                                    </svg>
                                    Copy Details
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="px-8 py-16 text-center">
                  <div className="w-20 h-20 bg-slate-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-10 h-10 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">No form-based quotes found</h3>
                  <p className="text-slate-400 mb-6">Traditional quote requests from the quote form will appear here</p>
                  <button
                    onClick={fetchFormBasedQuotes}
                    className="inline-flex items-center px-6 py-3 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg hover:bg-blue-500/30 transition-all duration-200"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refresh
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* Gallery Quotes Section */}
          <section className="px-6 md:px-10 mt-8">
            <div className="border border-white/10 bg-white/5 backdrop-blur-xl ring-1 ring-white/5 shadow-lg rounded-lg overflow-hidden">
              <div className="p-6 flex items-center justify-between border-b border-white/10 w-full">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center mr-4">
                    <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                      <circle cx="9" cy="9" r="2"/>
                      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-white">Gallery Quote Requests</h2>
                    <p className="text-sm text-slate-400">Manage quote requests from gallery reference images</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <select
                    value={galleryQuoteStatusFilter}
                    onChange={(e) => {setGalleryQuoteStatusFilter(e.target.value); fetchGalleryQuotes();}}
                    className="text-sm border border-white/10 rounded-lg px-3 py-2 bg-black/30 text-white focus:ring-1 focus:ring-lime-400/50 focus:border-lime-400/50"
                  >
                    <option value="ALL" className="bg-gray-800 text-white">All Status</option>
                    <option value="PENDING" className="bg-gray-800 text-white">Pending</option>
                    <option value="REVIEWED" className="bg-gray-800 text-white">Reviewed</option>
                    <option value="QUOTED" className="bg-gray-800 text-white">Quoted</option>
                    <option value="ACCEPTED" className="bg-gray-800 text-white">Accepted</option>
                    <option value="REJECTED" className="bg-gray-800 text-white">Rejected</option>
                  </select>
                  <button
                    onClick={fetchGalleryQuotes}
                    className="px-3 py-2 bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded hover:bg-purple-500/30 transition-colors text-sm"
                  >
                    Refresh
                  </button>
                </div>
              </div>
              
              {/* Gallery Quotes Statistics */}
              <div className="p-6 border-b border-white/10">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">{galleryQuoteStats.totalGalleryQuotes}</div>
                    <div className="text-xs text-slate-400">Total</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-400">{galleryQuoteStats.pendingGalleryQuotes}</div>
                    <div className="text-xs text-slate-400">Pending</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-400">{galleryQuoteStats.reviewedGalleryQuotes}</div>
                    <div className="text-xs text-slate-400">Reviewed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-400">{galleryQuoteStats.quotedGalleryQuotes}</div>
                    <div className="text-xs text-slate-400">Quoted</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-lime-400">{galleryQuoteStats.acceptedGalleryQuotes}</div>
                    <div className="text-xs text-slate-400">Accepted</div>
                  </div>
                </div>
              </div>

              {/* Gallery Quotes Error Display */}
              {galleryQuotesError && (
                <div className="p-6 border-b border-white/10">
                  <div className="border border-red-500/30 bg-red-500/10 backdrop-blur-xl ring-1 ring-red-500/5 shadow-lg rounded-lg p-4">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center mr-3">
                        <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-red-400">Error Loading Gallery Quotes</h4>
                        <p className="text-sm text-red-300">{galleryQuotesError}</p>
                      </div>
                      <button
                        onClick={fetchGalleryQuotes}
                        className="ml-4 px-3 py-1 bg-red-500/20 text-red-400 border border-red-500/30 rounded hover:bg-red-500/30 transition-colors"
                      >
                        Retry
                      </button>
                    </div>
                  </div>
                </div>
              )}
              
              {isLoadingGalleryQuotes ? (
                <div className="p-12 text-center">
                  <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-400 mx-auto"></div>
                  <p className="mt-6 text-slate-300 text-lg">Loading gallery quotes...</p>
                  <p className="text-slate-500 text-sm">Please wait while we fetch gallery quote requests</p>
                </div>
              ) : galleryQuotes.length > 0 ? (
                <div className="overflow-hidden">
                  <ul className="divide-y divide-white/10">
                    {galleryQuotes.map((quote) => (
                      <li key={quote.id} className="px-6 py-5 hover:bg-white/5 transition-colors">
                        <div className="cursor-pointer" onClick={() => setExpandedGalleryQuote(expandedGalleryQuote === quote.id ? null : quote.id)}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              {/* Reference Image Thumbnail */}
                              <div className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-gray-800">
                                {quote.referenceImage && (
                                  <img 
                                    src={quote.referenceImage} 
                                    alt="Reference" 
                                    className="w-full h-full object-cover"
                                  />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="text-lg font-medium text-white truncate">
                                  {quote.customerInfo.name || 'Unnamed Customer'}
                                </h3>
                                <p className="text-sm text-slate-400 truncate">
                                  {quote.customerInfo.email}
                                </p>
                                <p className="text-sm text-slate-400 mt-1 line-clamp-2">
                                  {quote.requirements.customization || 'No description provided'}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-4">
                              <div className="text-right">
                                <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  quote.status === 'PENDING' ? 'bg-orange-100/10 text-orange-400 border border-orange-500/30' :
                                  quote.status === 'REVIEWED' ? 'bg-blue-100/10 text-blue-400 border border-blue-500/30' :
                                  quote.status === 'QUOTED' ? 'bg-green-100/10 text-green-400 border border-green-500/30' :
                                  quote.status === 'ACCEPTED' ? 'bg-lime-100/10 text-lime-400 border border-lime-500/30' :
                                  'bg-red-100/10 text-red-400 border border-red-500/30'
                                }`}>
                                  {quote.status}
                                </div>
                                <div className="text-xs text-slate-400 mt-1">
                                  {new Date(quote.createdAt).toLocaleDateString()}
                                </div>
                              </div>
                              <div className="text-slate-400">
                                <svg className={`w-5 h-5 transform transition-transform ${expandedGalleryQuote === quote.id ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {expandedGalleryQuote === quote.id && (
                          <div className="mt-6 border-t border-white/10 pt-6">
                            <div className="grid lg:grid-cols-2 gap-6">
                              <div>
                                <h4 className="text-sm font-medium text-white mb-3">Customer Information</h4>
                                <div className="space-y-2 text-sm">
                                  <div><span className="text-slate-400">Name:</span> <span className="text-white ml-2">{quote.customerInfo.name || 'Not provided'}</span></div>
                                  <div><span className="text-slate-400">Email:</span> <span className="text-white ml-2">{quote.customerInfo.email}</span></div>
                                  <div><span className="text-slate-400">Phone:</span> <span className="text-white ml-2">{quote.customerInfo.phone || 'Not provided'}</span></div>
                                  <div><span className="text-slate-400">Company:</span> <span className="text-white ml-2">{quote.customerInfo.company || 'Not provided'}</span></div>
                                </div>

                                <h4 className="text-sm font-medium text-white mb-3 mt-6">Reference Image</h4>
                                {quote.referenceImage && (
                                  <div className="w-full max-w-sm rounded-lg overflow-hidden bg-gray-800">
                                    <img 
                                      src={quote.referenceImage} 
                                      alt="Reference design" 
                                      className="w-full h-auto object-cover"
                                    />
                                  </div>
                                )}
                              </div>
                              
                              <div>
                                <h4 className="text-sm font-medium text-white mb-3">Project Requirements</h4>
                                <div className="space-y-2 text-sm">
                                  <div><span className="text-slate-400">Timeline:</span> <span className="text-white ml-2">{quote.requirements.timeline || 'Not specified'}</span></div>
                                  <div><span className="text-slate-400">Description:</span></div>
                                  <div className="text-white ml-2 p-3 bg-black/30 rounded border border-white/10">
                                    {quote.requirements.customization || 'No description provided'}
                                  </div>
                                  {quote.requirements.additionalNotes && (
                                    <>
                                      <div><span className="text-slate-400">Additional Notes:</span></div>
                                      <div className="text-white ml-2 p-3 bg-black/30 rounded border border-white/10">
                                        {quote.requirements.additionalNotes}
                                      </div>
                                    </>
                                  )}
                                </div>
                                
                                <div className="mt-6">
                                  <h4 className="text-sm font-medium text-white mb-3">Update Status</h4>
                                  <div className="flex items-center space-x-3">
                                    <select
                                      value={quote.status}
                                      onChange={(e) => updateGalleryQuoteStatus(quote.id, e.target.value)}
                                      disabled={isUpdatingGalleryQuoteStatus === quote.id}
                                      className="text-sm border border-white/10 rounded px-3 py-2 bg-black/30 text-white focus:ring-1 focus:ring-lime-400/50 focus:border-lime-400/50 disabled:opacity-50"
                                    >
                                      <option value="PENDING" className="bg-gray-800 text-white">Pending</option>
                                      <option value="REVIEWED" className="bg-gray-800 text-white">Reviewed</option>
                                      <option value="QUOTED" className="bg-gray-800 text-white">Quoted</option>
                                      <option value="ACCEPTED" className="bg-gray-800 text-white">Accepted</option>
                                      <option value="REJECTED" className="bg-gray-800 text-white">Rejected</option>
                                    </select>
                                    {isUpdatingGalleryQuoteStatus === quote.id && (
                                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-lime-400"></div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="p-12 text-center">
                  <div className="w-16 h-16 bg-purple-500/20 rounded-lg flex items-center justify-center mx-auto mb-6">
                    <svg className="w-10 h-10 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                      <circle cx="9" cy="9" r="2"/>
                      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">No gallery quotes found</h3>
                  <p className="text-slate-400 mb-6">Quote requests from gallery reference images will appear here</p>
                  <button
                    onClick={fetchGalleryQuotes}
                    className="inline-flex items-center px-6 py-3 bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-lg hover:bg-purple-500/30 transition-all duration-200"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refresh
                  </button>
                </div>
              )}
            </div>
          </section>

          </div>
          {/* End content wrapper */}
        </DashboardContent>
      </div>
    </DashboardShell>
  );
}
