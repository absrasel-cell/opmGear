'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  User,
  Mail,
  Phone,
  Building,
  Package,
  Palette,
  Ruler,
  Sparkles,
  Clock,
  MessageSquare,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Send
} from 'lucide-react';
import {
  DashboardShell,
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

function QuoteRequestPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
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

    if (!formData.customerInfo.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.customerInfo.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.customerInfo.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!formData.customerInfo.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/quote-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
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

    // Clear error when user starts typing
    if (section === 'customerInfo' && errors[field as keyof QuoteRequest['customerInfo']]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  if (submitSuccess) {
    return (
      <DashboardShell>
        <div className="min-h-screen flex items-center justify-center px-4">
          <div className="w-full max-w-2xl">
            <GlassCard className="p-8 text-center">
              <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-lime-400/20 border border-lime-400/30 mb-6">
                <CheckCircle className="h-10 w-10 text-lime-400" />
              </div>
              
              <div className="space-y-4 mb-8">
                <h1 className="text-4xl font-bold text-white mb-2">
                  Quote Request Submitted!
                </h1>
                <p className="text-lg text-slate-300 leading-relaxed">
                  Thank you for your quote request. We'll review your requirements and get back to you within 24-48 hours.
                </p>
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-lime-400/10 border border-lime-400/20 rounded-lg text-lime-300">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm font-medium">Response within 24-48 hours</span>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/store" className="flex-1">
                  <Button variant="secondary" className="w-full">
                    <ArrowLeft className="h-4 w-4" />
                    Continue Shopping
                  </Button>
                </Link>
                <Link href="/dashboard" className="flex-1">
                  <Button variant="primary" className="w-full">
                    View Dashboard
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </GlassCard>
          </div>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <div className="min-h-screen py-8 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-3 mb-6">
              <div className="p-3 bg-lime-400/20 border border-lime-400/30 rounded-xl">
                <MessageSquare className="h-8 w-8 text-lime-400" />
              </div>
              <h1 className="text-4xl font-bold text-white">
                Request a Quote
              </h1>
            </div>
            
            <p className="text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed mb-6">
              Tell us about your custom cap requirements and we'll provide you with a personalized quote within 24-48 hours.
            </p>
            
            {productName && (
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-lime-400/10 border border-lime-400/20 rounded-lg text-lime-300">
                <Package className="h-4 w-4" />
                <span className="font-medium">Product: {productName}</span>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Customer Information */}
            <GlassCard>
              <div className="p-8">
                <div className="flex items-center gap-3 mb-8">
                  <User className="h-6 w-6 text-lime-400" />
                  <h2 className="text-2xl font-semibold text-white">
                    Contact Information
                  </h2>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="name" className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-3">
                      <User className="h-4 w-4" />
                      Full Name *
                    </label>
                    <input
                      type="text"
                      id="name"
                      value={formData.customerInfo.name}
                      onChange={(e) => handleInputChange('customerInfo', 'name', e.target.value)}
                      className={`w-full p-4 rounded-xl border transition-all duration-200 text-white placeholder:text-slate-400 ${
                        errors.name 
                          ? 'border-red-400/50 bg-red-500/10 focus:ring-2 focus:ring-red-400/40 focus:border-red-400/60' 
                          : 'border-white/10 bg-black/20 focus:ring-2 focus:ring-lime-400/40 focus:border-lime-400/60'
                      }`}
                      placeholder="Enter your full name"
                    />
                    {errors.name && (
                      <p className="mt-2 text-sm text-red-400 flex items-center gap-1">
                        <span className="text-red-400">●</span>
                        {errors.name}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="email" className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-3">
                      <Mail className="h-4 w-4" />
                      Email Address *
                    </label>
                    <input
                      type="email"
                      id="email"
                      value={formData.customerInfo.email}
                      onChange={(e) => handleInputChange('customerInfo', 'email', e.target.value)}
                      className={`w-full p-4 rounded-xl border transition-all duration-200 text-white placeholder:text-slate-400 ${
                        errors.email 
                          ? 'border-red-400/50 bg-red-500/10 focus:ring-2 focus:ring-red-400/40 focus:border-red-400/60' 
                          : 'border-white/10 bg-black/20 focus:ring-2 focus:ring-lime-400/40 focus:border-lime-400/60'
                      }`}
                      placeholder="Enter your email address"
                    />
                    {errors.email && (
                      <p className="mt-2 text-sm text-red-400 flex items-center gap-1">
                        <span className="text-red-400">●</span>
                        {errors.email}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="phone" className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-3">
                      <Phone className="h-4 w-4" />
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      value={formData.customerInfo.phone}
                      onChange={(e) => handleInputChange('customerInfo', 'phone', e.target.value)}
                      className={`w-full p-4 rounded-xl border transition-all duration-200 text-white placeholder:text-slate-400 ${
                        errors.phone 
                          ? 'border-red-400/50 bg-red-500/10 focus:ring-2 focus:ring-red-400/40 focus:border-red-400/60' 
                          : 'border-white/10 bg-black/20 focus:ring-2 focus:ring-lime-400/40 focus:border-lime-400/60'
                      }`}
                      placeholder="Enter your phone number"
                    />
                    {errors.phone && (
                      <p className="mt-2 text-sm text-red-400 flex items-center gap-1">
                        <span className="text-red-400">●</span>
                        {errors.phone}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="company" className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-3">
                      <Building className="h-4 w-4" />
                      Company Name
                    </label>
                    <input
                      type="text"
                      id="company"
                      value={formData.customerInfo.company}
                      onChange={(e) => handleInputChange('customerInfo', 'company', e.target.value)}
                      className="w-full p-4 rounded-xl border border-white/10 bg-black/20 text-white placeholder:text-slate-400 focus:ring-2 focus:ring-lime-400/40 focus:border-lime-400/60 transition-all duration-200"
                      placeholder="Enter your company name (optional)"
                    />
                  </div>
                </div>
              </div>
            </GlassCard>

            {/* Project Requirements */}
            <GlassCard>
              <div className="p-8">
                <div className="flex items-center gap-3 mb-8">
                  <Package className="h-6 w-6 text-lime-400" />
                  <h2 className="text-2xl font-semibold text-white">
                    Project Requirements
                  </h2>
                </div>
                
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="quantity" className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-3">
                        <Ruler className="h-4 w-4" />
                        Estimated Quantity
                      </label>
                      <input
                        type="text"
                        id="quantity"
                        value={formData.requirements.quantity}
                        onChange={(e) => handleInputChange('requirements', 'quantity', e.target.value)}
                        className="w-full p-4 rounded-xl border border-white/10 bg-black/20 text-white placeholder:text-slate-400 focus:ring-2 focus:ring-lime-400/40 focus:border-lime-400/60 transition-all duration-200"
                        placeholder="e.g., 500 pieces"
                      />
                    </div>

                    <div>
                      <label htmlFor="timeline" className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-3">
                        <Clock className="h-4 w-4" />
                        Timeline
                      </label>
                      <select
                        id="timeline"
                        value={formData.requirements.timeline}
                        onChange={(e) => handleInputChange('requirements', 'timeline', e.target.value)}
                        className="w-full p-4 rounded-xl border border-white/10 bg-black/20 text-white focus:ring-2 focus:ring-lime-400/40 focus:border-lime-400/60 transition-all duration-200"
                      >
                        <option value="" className="bg-gray-900 text-white">Select timeline</option>
                        <option value="1-2 weeks" className="bg-gray-900 text-white">1-2 weeks</option>
                        <option value="2-4 weeks" className="bg-gray-900 text-white">2-4 weeks</option>
                        <option value="1-2 months" className="bg-gray-900 text-white">1-2 months</option>
                        <option value="2-3 months" className="bg-gray-900 text-white">2-3 months</option>
                        <option value="3+ months" className="bg-gray-900 text-white">3+ months</option>
                        <option value="No rush" className="bg-gray-900 text-white">No rush</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="colors" className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-3">
                        <Palette className="h-4 w-4" />
                        Colors Needed
                      </label>
                      <input
                        type="text"
                        id="colors"
                        value={formData.requirements.colors}
                        onChange={(e) => handleInputChange('requirements', 'colors', e.target.value)}
                        className="w-full p-4 rounded-xl border border-white/10 bg-black/20 text-white placeholder:text-slate-400 focus:ring-2 focus:ring-lime-400/40 focus:border-lime-400/60 transition-all duration-200"
                        placeholder="e.g., Black, White, Navy"
                      />
                    </div>

                    <div>
                      <label htmlFor="sizes" className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-3">
                        <Ruler className="h-4 w-4" />
                        Sizes Needed
                      </label>
                      <input
                        type="text"
                        id="sizes"
                        value={formData.requirements.sizes}
                        onChange={(e) => handleInputChange('requirements', 'sizes', e.target.value)}
                        className="w-full p-4 rounded-xl border border-white/10 bg-black/20 text-white placeholder:text-slate-400 focus:ring-2 focus:ring-lime-400/40 focus:border-lime-400/60 transition-all duration-200"
                        placeholder="e.g., S, M, L, XL"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="customization" className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-3">
                      <Sparkles className="h-4 w-4" />
                      Customization Type
                    </label>
                    <select
                      id="customization"
                      value={formData.requirements.customization}
                      onChange={(e) => handleInputChange('requirements', 'customization', e.target.value)}
                      className="w-full p-4 rounded-xl border border-white/10 bg-black/20 text-white focus:ring-2 focus:ring-lime-400/40 focus:border-lime-400/60 transition-all duration-200"
                    >
                      <option value="" className="bg-gray-900 text-white">Select customization type</option>
                      <option value="Embroidery" className="bg-gray-900 text-white">Embroidery</option>
                      <option value="Screen Printing" className="bg-gray-900 text-white">Screen Printing</option>
                      <option value="Heat Transfer" className="bg-gray-900 text-white">Heat Transfer</option>
                      <option value="Patches" className="bg-gray-900 text-white">Patches</option>
                      <option value="Multiple Types" className="bg-gray-900 text-white">Multiple Types</option>
                      <option value="Not sure" className="bg-gray-900 text-white">Not sure</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="additionalNotes" className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-3">
                      <MessageSquare className="h-4 w-4" />
                      Additional Notes
                    </label>
                    <textarea
                      id="additionalNotes"
                      value={formData.requirements.additionalNotes}
                      onChange={(e) => handleInputChange('requirements', 'additionalNotes', e.target.value)}
                      rows={4}
                      className="w-full p-4 rounded-xl border border-white/10 bg-black/20 text-white placeholder:text-slate-400 focus:ring-2 focus:ring-lime-400/40 focus:border-lime-400/60 transition-all duration-200 resize-none"
                      placeholder="Tell us more about your project, specific requirements, or any questions you have..."
                    />
                  </div>
                </div>
              </div>
            </GlassCard>

            {/* Submit Button */}
            <div className="flex flex-col sm:flex-row justify-end gap-4">
              <Link href="/store">
                <Button variant="secondary" className="w-full sm:w-auto">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Store
                </Button>
              </Link>
              
              <Button
                type="submit"
                disabled={isSubmitting}
                variant="primary"
                className={`w-full sm:w-auto ${isSubmitting ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}`}
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Submit Quote Request
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </DashboardShell>
  );
}

export default function QuoteRequestPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <QuoteRequestPageContent />
    </Suspense>
  );
}
