'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import { useAuth } from '@/components/auth/AuthContext';
import Sidebar from '@/components/ui/dashboard/Sidebar';
import { 
  DashboardShell, 
  DashboardContent, 
  GlassCard, 
  Button 
} from '@/components/ui/dashboard';

interface QuoteRequest {
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
  createdAt: Date;
  status: 'PENDING' | 'REVIEWED' | 'QUOTED' | 'ACCEPTED' | 'REJECTED';
}

function MemberQuoteRequestPageContent() {
  const { user, isAuthenticated, loading } = useAuth();
  const searchParams = useSearchParams();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const productSlug = searchParams.get('product') || '';
  const productName = searchParams.get('name') || '';

  const [formData, setFormData] = useState<QuoteRequest>({
    productSlug,
    productName,
    customerInfo: {
      name: '',
      email: '',
      phone: '',
      company: ''
    },
    requirements: {
      quantity: '',
      colors: '',
      sizes: '',
      customization: '',
      timeline: '',
      additionalNotes: ''
    },
    createdAt: new Date(),
    status: 'PENDING'
  });

  const [errors, setErrors] = useState<Partial<QuoteRequest['customerInfo']>>({});

  const validateForm = (): boolean => {
    const newErrors: Partial<QuoteRequest['customerInfo']> = {};

    if (!formData.customerInfo.name.trim()) newErrors.name = 'Name is required';
    if (!formData.customerInfo.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.customerInfo.email)) {
      newErrors.email = 'Email is invalid';
    }
    if (!formData.customerInfo.phone.trim()) newErrors.phone = 'Phone number is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      // Convert the detailed quote form to form-submissions format
      const formSubmissionData = {
        formType: 'CUSTOM_ORDER',
        name: formData.customerInfo.name,
        email: formData.customerInfo.email,
        phone: formData.customerInfo.phone,
        company: formData.customerInfo.company,
        subject: `Member Quote Request - ${formData.productName || 'Custom Product'}`,
        message: `Product: ${formData.productName || 'Custom Product'}
Quantity: ${formData.requirements.quantity}
Colors: ${formData.requirements.colors}
Sizes: ${formData.requirements.sizes}
Customization: ${formData.requirements.customization}
Timeline: ${formData.requirements.timeline}
Additional Notes: ${formData.requirements.additionalNotes}`,
        metadata: {
          source: 'member_quote_request',
          productSlug: formData.productSlug,
          productName: formData.productName,
          requirements: formData.requirements,
          timestamp: new Date().toISOString()
        }
      };

      const response = await fetch('/api/form-submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formSubmissionData),
      });
      const result = await response.json();
      if (response.ok && result.message) {
        setSubmitSuccess(true);
      } else {
        alert('Failed to submit quote request: ' + (result.error || result.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error submitting quote request:', error);
      alert('Failed to submit quote request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (section: 'customerInfo' | 'requirements', field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));

    if (section === 'customerInfo' && errors[field as keyof QuoteRequest['customerInfo']]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  // Loading/guard within dashboard shell to keep UI consistent
  if (loading) {
    return (
      <DashboardShell>
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center text-slate-300">Loading…</div>
        </div>
      </DashboardShell>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <DashboardShell>
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center text-slate-300">Please sign in to request a quote.</div>
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
          <div className="px-6 md:px-10 mt-6 mb-10">
            <GlassCard className="p-6 md:p-8">
              {submitSuccess ? (
                <div className="text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20">
                    <svg className="h-8 w-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h1 className="mb-2 text-3xl font-bold text-white">Quote Request Submitted!</h1>
                  <p className="mb-6 text-slate-300/90">Thank you. We'll review and get back within 24-48 hours.</p>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Link href="/store">
                      <Button variant="primary">Continue Shopping</Button>
                    </Link>
                    <Link href="/dashboard/member">
                      <Button variant="secondary">View Dashboard</Button>
                    </Link>
                  </div>
                </div>
              ) : (
                <div>
                  {/* Header */}
                  <div className="mb-6 text-center">
                    <h1 className="mb-2 text-3xl font-bold text-white">Quote Request</h1>
                    <p className="text-slate-300/80">Tell us about your requirements and we'll provide a custom quote.</p>
                    {productName && (
                      <div className="mt-4 inline-block rounded-lg bg-blue-400/10 px-4 py-2 text-blue-200">
                        Product: {productName}
                      </div>
                    )}
                  </div>

                  {/* Form */}
                  <form onSubmit={handleSubmit} className="space-y-8">
                    {/* Customer Information */}
                    <GlassCard className="p-6 border-white/10 bg-white/5">
                      <h2 className="mb-6 text-xl font-semibold text-white">Contact Information</h2>
                      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        <div>
                          <label htmlFor="name" className="mb-2 block text-sm font-medium text-slate-200">
                            Full Name *
                          </label>
                          <input
                            type="text"
                            id="name"
                            value={formData.customerInfo.name}
                            onChange={(e) => handleInputChange('customerInfo', 'name', e.target.value)}
                            className={`w-full rounded-lg border p-3 bg-black/40 text-white placeholder-slate-400 focus:border-lime-400 focus:outline-none focus:ring-2 focus:ring-lime-400/40 ${
                              errors.name ? 'border-red-500/50' : 'border-white/10'
                            }`}
                            placeholder="Enter your full name"
                          />
                          {errors.name && (
                            <p className="mt-1 text-sm text-red-400">{errors.name}</p>
                          )}
                        </div>

                        <div>
                          <label htmlFor="email" className="mb-2 block text-sm font-medium text-slate-200">
                            Email Address *
                          </label>
                          <input
                            type="email"
                            id="email"
                            value={formData.customerInfo.email}
                            onChange={(e) => handleInputChange('customerInfo', 'email', e.target.value)}
                            className={`w-full rounded-lg border p-3 bg-black/40 text-white placeholder-slate-400 focus:border-lime-400 focus:outline-none focus:ring-2 focus:ring-lime-400/40 ${
                              errors.email ? 'border-red-500/50' : 'border-white/10'
                            }`}
                            placeholder="Enter your email address"
                          />
                          {errors.email && (
                            <p className="mt-1 text-sm text-red-400">{errors.email}</p>
                          )}
                        </div>

                        <div>
                          <label htmlFor="phone" className="mb-2 block text-sm font-medium text-slate-2 00">
                            Phone Number *
                          </label>
                          <input
                            type="tel"
                            id="phone"
                            value={formData.customerInfo.phone}
                            onChange={(e) => handleInputChange('customerInfo', 'phone', e.target.value)}
                            className={`w-full rounded-lg border p-3 bg-black/40 text-white placeholder-slate-400 focus:border-lime-400 focus:outline-none focus:ring-2 focus:ring-lime-400/40 ${
                              errors.phone ? 'border-red-500/50' : 'border-white/10'
                            }`}
                            placeholder="Enter your phone number"
                          />
                          {errors.phone && (
                            <p className="mt-1 text-sm text-red-400">{errors.phone}</p>
                          )}
                        </div>

                        <div>
                          <label htmlFor="company" className="mb-2 block text-sm font-medium text-slate-200">
                            Company Name
                          </label>
                          <input
                            type="text"
                            id="company"
                            value={formData.customerInfo.company}
                            onChange={(e) => handleInputChange('customerInfo', 'company', e.target.value)}
                            className="w-full rounded-lg border border-white/10 p-3 bg-black/40 text-white placeholder-slate-400 focus:border-lime-400 focus:outline-none focus:ring-2 focus:ring-lime-400/40"
                            placeholder="Enter your company name (optional)"
                          />
                        </div>
                      </div>
                    </GlassCard>

                    {/* Project Requirements */}
                    <GlassCard className="p-6 border-white/10 bg-white/5">
                      <h2 className="mb-6 text-xl font-semibold text-white">Project Requirements</h2>
                      <div className="space-y-6">
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                          <div>
                            <label htmlFor="quantity" className="mb-2 block text-sm font-medium text-slate-200">
                              Estimated Quantity
                            </label>
                            <input
                              type="text"
                              id="quantity"
                              value={formData.requirements.quantity}
                              onChange={(e) => handleInputChange('requirements', 'quantity', e.target.value)}
                              className="w-full rounded-lg border border-white/10 p-3 bg-black/40 text-white placeholder-slate-400 focus:border-lime-400 focus:outline-none focus:ring-2 focus:ring-lime-400/40"
                              placeholder="e.g., 500 pieces"
                            />
                          </div>

                          <div>
                            <label htmlFor="timeline" className="mb-2 block text-sm font-medium text-slate-200">
                              Timeline
                            </label>
                            <select
                              id="timeline"
                              value={formData.requirements.timeline}
                              onChange={(e) => handleInputChange('requirements', 'timeline', e.target.value)}
                              className="w-full rounded-lg border border-white/10 p-3 bg-black/40 text-white focus:border-lime-400 focus:outline-none focus:ring-2 focus:ring-lime-400/40"
                            >
                              <option value="">Select timeline</option>
                              <option value="1-2 weeks">1-2 weeks</option>
                              <option value="2-4 weeks">2-4 weeks</option>
                              <option value="1-2 months">1-2 months</option>
                              <option value="2-3 months">2-3 months</option>
                              <option value="3+ months">3+ months</option>
                              <option value="No rush">No rush</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                          <div>
                            <label htmlFor="colors" className="mb-2 block text-sm font-medium text-slate-200">
                              Colors Needed
                            </label>
                            <input
                              type="text"
                              id="colors"
                              value={formData.requirements.colors}
                              onChange={(e) => handleInputChange('requirements', 'colors', e.target.value)}
                              className="w-full rounded-lg border border-white/10 p-3 bg-black/40 text-white placeholder-slate-400 focus:border-lime-400 focus:outline-none focus:ring-2 focus:ring-lime-400/40"
                              placeholder="e.g., Black, White, Navy"
                            />
                          </div>

                          <div>
                            <label htmlFor="sizes" className="mb-2 block text-sm font-medium text-slate-200">
                              Sizes Needed
                            </label>
                            <input
                              type="text"
                              id="sizes"
                              value={formData.requirements.sizes}
                              onChange={(e) => handleInputChange('requirements', 'sizes', e.target.value)}
                              className="w-full rounded-lg border border-white/10 p-3 bg-black/40 text-white placeholder-slate-400 focus:border-lime-400 focus:outline-none focus:ring-2 focus:ring-lime-400/40"
                              placeholder="e.g., S, M, L, XL"
                            />
                          </div>
                        </div>

                        <div>
                          <label htmlFor="customization" className="mb-2 block text-sm font-medium text-slate-200">
                            Customization Type
                          </label>
                          <select
                            id="customization"
                            value={formData.requirements.customization}
                            onChange={(e) => handleInputChange('requirements', 'customization', e.target.value)}
                            className="w-full rounded-lg border border-white/10 p-3 bg-black/40 text-white focus:border-lime-400 focus:outline-none focus:ring-2 focus:ring-lime-400/40"
                          >
                            <option value="">Select customization type</option>
                            <option value="Embroidery">Embroidery</option>
                            <option value="Screen Printing">Screen Printing</option>
                            <option value="Heat Transfer">Heat Transfer</option>
                            <option value="Patches">Patches</option>
                            <option value="Multiple Types">Multiple Types</option>
                            <option value="Not sure">Not sure</option>
                          </select>
                        </div>

                        <div>
                          <label htmlFor="additionalNotes" className="mb-2 block text-sm font-medium text-slate-200">
                            Additional Notes
                          </label>
                          <textarea
                            id="additionalNotes"
                            value={formData.requirements.additionalNotes}
                            onChange={(e) => handleInputChange('requirements', 'additionalNotes', e.target.value)}
                            rows={4}
                            className="w-full rounded-lg border border-white/10 p-3 bg-black/40 text-white placeholder-slate-400 focus:border-lime-400 focus:outline-none focus:ring-2 focus:ring-lime-400/40"
                            placeholder="Tell us more about your project, specific requirements, or any questions you have..."
                          />
                        </div>
                      </div>
                    </GlassCard>

                    {/* Actions */}
                    <div className="flex justify-end gap-3">
                      <Link href="/dashboard/member">
                        <Button variant="secondary">Cancel</Button>
                      </Link>
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                          isSubmitting
                            ? 'cursor-not-allowed bg-white/10 text-slate-400'
                            : 'bg-lime-400 text-black hover:brightness-95'
                        }`}
                      >
                        {isSubmitting ? 'Submitting…' : 'Submit Quote Request'}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </GlassCard>
          </div>
        </DashboardContent>
      </div>
    </DashboardShell>
  );
}

export default function MemberQuoteRequestPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <MemberQuoteRequestPageContent />
    </Suspense>
  );
}
