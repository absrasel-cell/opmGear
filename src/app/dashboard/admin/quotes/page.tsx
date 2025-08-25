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
  description?: string;
  quantity?: number;
  requirements?: string;
}

export default function AdminQuotesPage() {
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();
  
  // State
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [quoteRequests, setQuoteRequests] = useState<QuoteRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedQuote, setExpandedQuote] = useState<string | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<string | null>(null);

  // Statistics
  const [stats, setStats] = useState({
    totalQuotes: 0,
    pendingQuotes: 0,
    approvedQuotes: 0,
    declinedQuotes: 0
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
    
    fetchQuoteRequests();
  }, [user, loading, isAuthenticated, router]);

  const fetchQuoteRequests = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('/api/quote-requests');
      if (response.ok) {
        const data = await response.json();
        const allQuotes = data.quoteRequests || [];
        setQuoteRequests(allQuotes);
        
        // Calculate statistics
        const pendingQuotes = allQuotes.filter((quote: QuoteRequest) => quote.status === 'PENDING').length;
        const approvedQuotes = allQuotes.filter((quote: QuoteRequest) => quote.status === 'APPROVED').length;
        const declinedQuotes = allQuotes.filter((quote: QuoteRequest) => quote.status === 'DECLINED').length;
        
        setStats({
          totalQuotes: allQuotes.length,
          pendingQuotes,
          approvedQuotes,
          declinedQuotes
        });
      } else {
        console.error('Failed to fetch quote requests:', response.status);
        setError('Failed to load quote requests');
      }
    } catch (error) {
      console.error('Error fetching quote requests:', error);
      setError('Failed to load quote requests. Please try refreshing the page.');
    } finally {
      setIsLoading(false);
    }
  };

  const updateQuoteStatus = async (quoteId: string, newStatus: string) => {
    setIsUpdatingStatus(quoteId);
    try {
      const response = await fetch(`/api/quote-requests/${quoteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        // Update local state
        setQuoteRequests(prev => prev.map(quote => 
          quote.id === quoteId 
            ? { ...quote, status: newStatus }
            : quote
        ));
        // Refresh stats
        fetchQuoteRequests();
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return 'bg-green-500/20 text-green-400 border border-green-500/30';
      case 'DECLINED':
        return 'bg-red-500/20 text-red-400 border border-red-500/30';
      case 'PENDING':
        return 'bg-orange-500/20 text-orange-400 border border-orange-500/30';
      default:
        return 'bg-slate-500/20 text-slate-400 border border-slate-500/30';
    }
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
                    onClick={fetchQuoteRequests}
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

              {/* Pending Quotes */}
              <div className="border border-white/10 bg-white/5 backdrop-blur-xl ring-1 ring-white/5 shadow-lg rounded-lg p-6 hover:transform hover:scale-105 transition-all duration-200">
              <div className="flex items-start justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 text-slate-300 text-sm font-medium">
                    <div className="w-6 h-6 bg-orange-500/20 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    Pending
                  </div>
                  <div className="mt-3 text-3xl font-bold tracking-tight text-white">
                    {stats.pendingQuotes}
                  </div>
                  <div className="mt-1 text-xs text-slate-400">
                    Awaiting response
                  </div>
                </div>
                <div className="w-12 h-12 bg-orange-500/10 rounded-xl flex items-center justify-center border border-orange-500/20">
                  <svg className="w-6 h-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              </div>

              {/* Approved Quotes */}
              <div className="border border-white/10 bg-white/5 backdrop-blur-xl ring-1 ring-white/5 shadow-lg rounded-lg p-6 hover:transform hover:scale-105 transition-all duration-200">
              <div className="flex items-start justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 text-slate-300 text-sm font-medium">
                    <div className="w-6 h-6 bg-green-500/20 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    Approved
                  </div>
                  <div className="mt-3 text-3xl font-bold tracking-tight text-white">
                    {stats.approvedQuotes}
                  </div>
                  <div className="mt-1 text-xs text-slate-400">
                    Successfully approved
                  </div>
                </div>
                <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center border border-green-500/20">
                  <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              </div>

              {/* Declined Quotes */}
              <div className="border border-white/10 bg-white/5 backdrop-blur-xl ring-1 ring-white/5 shadow-lg rounded-lg p-6 hover:transform hover:scale-105 transition-all duration-200">
              <div className="flex items-start justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 text-slate-300 text-sm font-medium">
                    <div className="w-6 h-6 bg-red-500/20 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </div>
                    Declined
                  </div>
                  <div className="mt-3 text-3xl font-bold tracking-tight text-white">
                    {stats.declinedQuotes}
                  </div>
                  <div className="mt-1 text-xs text-slate-400">
                    Not approved
                  </div>
                </div>
                <div className="w-12 h-12 bg-red-500/10 rounded-xl flex items-center justify-center border border-red-500/20">
                  <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              </div>
            </div>
          </section>

          {/* Quote Requests List */}
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
                  <h2 className="text-xl font-semibold text-white">Customer Inquiries</h2>
                  <p className="text-sm text-slate-400">Review and respond to customer quote submissions</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={fetchQuoteRequests}
                  className="px-3 py-2 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded hover:bg-blue-500/30 transition-colors text-sm"
                >
                  Refresh
                </button>
                <button className="px-3 py-2 bg-gray-600/20 text-gray-400 border border-gray-500/30 rounded hover:bg-gray-600/30 transition-colors text-sm">
                  Export
                </button>
              </div>
            </div>
              
            {isLoading ? (
              <div className="p-12 text-center">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-lime-400 mx-auto"></div>
                <p className="mt-6 text-slate-300 text-lg">Loading quote requests...</p>
                <p className="text-slate-500 text-sm">Please wait while we fetch your quotes</p>
              </div>
              ) : quoteRequests.length > 0 ? (
                <div className="overflow-hidden">
                  <ul className="divide-y divide-white/10">
                    {quoteRequests.map((quote) => (
                      <li key={quote.id} className="px-6 py-5 hover:bg-white/5 transition-colors">
                        <div className="cursor-pointer" onClick={() => setExpandedQuote(expandedQuote === quote.id ? null : quote.id)}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <div className="flex-shrink-0">
                                <div className="h-12 w-12 rounded-lg bg-orange-500/20 flex items-center justify-center border border-orange-500/30">
                                  <svg className="h-6 w-6 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                </div>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-semibold text-white">{quote.productName}</div>
                                <div className="text-sm text-slate-400 mt-1">
                                  Quote #{quote.id.slice(-8)} • {quote.customerInfo.name} • {new Date(quote.createdAt).toLocaleDateString()}
                                </div>
                                <div className="text-sm text-slate-500 mt-1">
                                  {quote.customerInfo.email} • {quote.customerInfo.company}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-3">
                              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(quote.status)}`}>
                                {quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}
                              </span>
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
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                              {/* Customer Information */}
                              <div className="border border-white/10 bg-white/5 rounded-lg p-4">
                                <h4 className="text-sm font-medium text-white mb-3">Customer Details</h4>
                                <dl className="space-y-2">
                                  <div>
                                    <dt className="text-xs text-slate-400">Name</dt>
                                    <dd className="text-sm text-white">{quote.customerInfo.name}</dd>
                                  </div>
                                  <div>
                                    <dt className="text-xs text-slate-400">Email</dt>
                                    <dd className="text-sm text-white">{quote.customerInfo.email}</dd>
                                  </div>
                                  <div>
                                    <dt className="text-xs text-slate-400">Company</dt>
                                    <dd className="text-sm text-white">{quote.customerInfo.company}</dd>
                                  </div>
                                  <div>
                                    <dt className="text-xs text-slate-400">Submitted</dt>
                                    <dd className="text-sm text-white">{new Date(quote.createdAt).toLocaleString()}</dd>
                                  </div>
                                </dl>
                              </div>

                              {/* Quote Information */}
                              <div className="border border-white/10 bg-white/5 rounded-lg p-4">
                                <h4 className="text-sm font-medium text-white mb-3">Quote Details</h4>
                                <dl className="space-y-2">
                                  <div>
                                    <dt className="text-xs text-slate-400">Product</dt>
                                    <dd className="text-sm text-white">{quote.productName}</dd>
                                  </div>
                                  {quote.quantity && (
                                    <div>
                                      <dt className="text-xs text-slate-400">Quantity</dt>
                                      <dd className="text-sm text-white">{quote.quantity}</dd>
                                    </div>
                                  )}
                                  {quote.description && (
                                    <div>
                                      <dt className="text-xs text-slate-400">Description</dt>
                                      <dd className="text-sm text-white">{quote.description}</dd>
                                    </div>
                                  )}
                                  {quote.requirements && (
                                    <div>
                                      <dt className="text-xs text-slate-400">Requirements</dt>
                                      <dd className="text-sm text-white">{quote.requirements}</dd>
                                    </div>
                                  )}
                                </dl>
                              </div>

                              {/* Status & Actions */}
                              <div className="border border-white/10 bg-white/5 rounded-lg p-4">
                                <h4 className="text-sm font-medium text-white mb-3">Status & Actions</h4>
                                <dl className="space-y-2">
                                  <div>
                                    <dt className="text-xs text-slate-400 mb-2">Current Status</dt>
                                    <dd className="text-sm text-white">
                                      <select
                                        value={quote.status}
                                        onChange={(e) => updateQuoteStatus(quote.id, e.target.value)}
                                        disabled={isUpdatingStatus === quote.id}
                                        className="w-full text-sm border border-white/10 rounded-lg px-3 py-2 bg-black/30 text-white focus:ring-1 focus:ring-lime-400/50 focus:border-lime-400/50 disabled:opacity-50 disabled:cursor-not-allowed"
                                      >
                                        <option value="PENDING" className="bg-gray-800 text-white">Pending</option>
                                        <option value="APPROVED" className="bg-gray-800 text-white">Approved</option>
                                        <option value="DECLINED" className="bg-gray-800 text-white">Declined</option>
                                      </select>
                                      {isUpdatingStatus === quote.id && (
                                        <span className="ml-2 text-xs text-gray-500">Updating...</span>
                                      )}
                                    </dd>
                                  </div>
                                </dl>
                                
                                {/* Action Buttons */}
                                <div className="mt-4 pt-4 border-t border-white/10 flex space-x-3">
                                  <a
                                    href={`mailto:${quote.customerInfo.email}?subject=Quote Request ${quote.id.slice(-8)} - ${quote.productName}`}
                                    className="inline-flex items-center px-4 py-2 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg hover:bg-blue-500/30 transition-all duration-200 text-sm font-medium"
                                  >
                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                    Email Customer
                                  </a>
                                  <button
                                    onClick={() => {
                                      // Copy quote details to clipboard
                                      const parts: string[] = [
                                        `Quote ID: ${quote.id.slice(-8)}`,
                                        `Product: ${quote.productName}`,
                                        `Customer: ${quote.customerInfo.name} (${quote.customerInfo.email})`,
                                        `Company: ${quote.customerInfo.company}`,
                                        `Status: ${quote.status}`,
                                        `Submitted: ${new Date(quote.createdAt).toLocaleString()}`,
                                      ];
                                      if (quote.description) parts.push(`Description: ${quote.description}`);
                                      if (quote.requirements) parts.push(`Requirements: ${quote.requirements}`);
                                      const quoteDetails = parts.join('\n');
                                      navigator.clipboard.writeText(quoteDetails);
                                      alert('Quote details copied to clipboard!');
                                    }}
                                    className="inline-flex items-center px-4 py-2 bg-gray-600/20 text-gray-400 border border-gray-500/30 rounded-lg hover:bg-gray-600/30 transition-all duration-200 text-sm font-medium"
                                  >
                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">No quote requests found</h3>
                <p className="text-slate-400 mb-6">Quote requests from customers will appear here</p>
                <button
                  onClick={fetchQuoteRequests}
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

          </div>
          {/* End content wrapper */}
        </DashboardContent>
      </div>
    </DashboardShell>
  );
}
