'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-2xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/20 mb-4">
              <svg className="h-8 w-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Quote Request Submitted!
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
              Thank you for your quote request. We'll review your requirements and get back to you within 24-48 hours.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/store"
                className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200 text-center"
              >
                Continue Shopping
              </Link>
              <Link
                href="/dashboard"
                className="flex-1 px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors duration-200 text-center"
              >
                View Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Quote Request
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Tell us about your requirements and we'll provide you with a custom quote.
          </p>
          {productName && (
            <div className="mt-4 inline-block bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 px-4 py-2 rounded-lg">
              Product: {productName}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Customer Information */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold mb-6 text-gray-900 dark:text-gray-100">
              Contact Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  id="name"
                  value={formData.customerInfo.name}
                  onChange={(e) => handleInputChange('customerInfo', 'name', e.target.value)}
                  className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                    errors.name 
                      ? 'border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/20' 
                      : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700'
                  } text-gray-900 dark:text-gray-100`}
                  placeholder="Enter your full name"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name}</p>
                )}
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  id="email"
                  value={formData.customerInfo.email}
                  onChange={(e) => handleInputChange('customerInfo', 'email', e.target.value)}
                  className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                    errors.email 
                      ? 'border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/20' 
                      : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700'
                  } text-gray-900 dark:text-gray-100`}
                  placeholder="Enter your email address"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.email}</p>
                )}
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  id="phone"
                  value={formData.customerInfo.phone}
                  onChange={(e) => handleInputChange('customerInfo', 'phone', e.target.value)}
                  className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                    errors.phone 
                      ? 'border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/20' 
                      : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700'
                  } text-gray-900 dark:text-gray-100`}
                  placeholder="Enter your phone number"
                />
                {errors.phone && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.phone}</p>
                )}
              </div>

              <div>
                <label htmlFor="company" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Company Name
                </label>
                <input
                  type="text"
                  id="company"
                  value={formData.customerInfo.company}
                  onChange={(e) => handleInputChange('customerInfo', 'company', e.target.value)}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="Enter your company name (optional)"
                />
              </div>
            </div>
          </div>

          {/* Project Requirements */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold mb-6 text-gray-900 dark:text-gray-100">
              Project Requirements
            </h2>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Estimated Quantity
                  </label>
                  <input
                    type="text"
                    id="quantity"
                    value={formData.requirements.quantity}
                    onChange={(e) => handleInputChange('requirements', 'quantity', e.target.value)}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="e.g., 500 pieces"
                  />
                </div>

                <div>
                  <label htmlFor="timeline" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Timeline
                  </label>
                  <select
                    id="timeline"
                    value={formData.requirements.timeline}
                    onChange={(e) => handleInputChange('requirements', 'timeline', e.target.value)}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="colors" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Colors Needed
                  </label>
                  <input
                    type="text"
                    id="colors"
                    value={formData.requirements.colors}
                    onChange={(e) => handleInputChange('requirements', 'colors', e.target.value)}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="e.g., Black, White, Navy"
                  />
                </div>

                <div>
                  <label htmlFor="sizes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Sizes Needed
                  </label>
                  <input
                    type="text"
                    id="sizes"
                    value={formData.requirements.sizes}
                    onChange={(e) => handleInputChange('requirements', 'sizes', e.target.value)}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="e.g., S, M, L, XL"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="customization" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Customization Type
                </label>
                <select
                  id="customization"
                  value={formData.requirements.customization}
                  onChange={(e) => handleInputChange('requirements', 'customization', e.target.value)}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
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
                <label htmlFor="additionalNotes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Additional Notes
                </label>
                <textarea
                  id="additionalNotes"
                  value={formData.requirements.additionalNotes}
                  onChange={(e) => handleInputChange('requirements', 'additionalNotes', e.target.value)}
                  rows={4}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="Tell us more about your project, specific requirements, or any questions you have..."
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-4">
            <Link
              href="/store"
              className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors duration-200"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-8 py-3 rounded-lg font-medium transition-all duration-200 ${
                isSubmitting
                  ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-600/25 hover:shadow-green-600/40 hover:scale-105'
              }`}
            >
              {isSubmitting ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Submitting...</span>
                </div>
              ) : (
                'Submit Quote Request'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function QuoteRequestPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <QuoteRequestPageContent />
    </Suspense>
  );
}
