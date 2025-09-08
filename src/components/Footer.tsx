"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from 'framer-motion';

interface QuoteFormData {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerCompany: string;
  projectDescription: string;
  timeline: string;
  service: string;
}

export default function Footer() {
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState('');
  const [quoteForm, setQuoteForm] = useState<QuoteFormData>({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    customerCompany: '',
    projectDescription: '',
    timeline: '',
    service: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const openQuoteModal = (service: string) => {
    setSelectedService(service);
    setQuoteForm(prev => ({ ...prev, service }));
    setIsQuoteModalOpen(true);
  };

  const closeQuoteModal = () => {
    setIsQuoteModalOpen(false);
    setSelectedService('');
    setSubmitStatus('idle');
    setQuoteForm({
      customerName: '',
      customerEmail: '',
      customerPhone: '',
      customerCompany: '',
      projectDescription: '',
      timeline: '',
      service: ''
    });
  };

  const handleCloseClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    closeQuoteModal();
  };

  const handleFormChange = (field: keyof QuoteFormData, value: string) => {
    setQuoteForm(prev => ({ ...prev, [field]: value }));
  };

  const submitQuote = async () => {
    setIsSubmitting(true);
    try {
      // Convert the quote form to form-submissions format
      const formSubmissionData = {
        formType: 'CUSTOM_ORDER',
        name: quoteForm.customerName,
        email: quoteForm.customerEmail,
        phone: quoteForm.customerPhone,
        company: quoteForm.customerCompany,
        subject: `${quoteForm.service} - Quote Request`,
        message: `Service: ${quoteForm.service}\nProject Description: ${quoteForm.projectDescription}\nTimeline: ${quoteForm.timeline}`,
        metadata: {
          source: 'footer_quote_modal',
          service: quoteForm.service,
          timeline: quoteForm.timeline,
          timestamp: new Date().toISOString()
        }
      };

      const response = await fetch('/api/form-submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formSubmissionData)
      });
      
      if (response.ok) {
        setSubmitStatus('success');
        setTimeout(() => {
          closeQuoteModal();
        }, 3000);
      } else {
        setSubmitStatus('error');
      }
    } catch (error) {
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };
  return (
    <footer className="relative glass-footer rounded-3xl border-t border-white/20 max-w-[1850px] mx-auto">
      <div className="rounded-3xl px-6 pt-16 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          <div className="lg:col-span-1">
            <div className="flex justify-start -mt-14">
              <div className="w-32 h-32 flex items-center justify-center">
                <img src="/opmLogo.svg" alt="US Custom Caps" className="w-full h-full object-contain brightness-110" />
              </div>
            </div>
            <p className="text-stone-400 mb-4 leading-relaxed font-sans">
              Premium custom baseball caps and headwear designed with professional quality and personalized branding for teams, businesses, and individuals.
            </p>
            <div className="flex items-center gap-4">
              <a href="#" className="w-10 h-10 rounded-full glass-button glass-hover flex items-center justify-center transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-stone-400 hover:text-white">
                  <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
                </svg>
              </a>
              <a href="#" className="w-10 h-10 rounded-full glass-button glass-hover flex items-center justify-center transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-stone-400 hover:text-white">
                  <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"></path>
                </svg>
              </a>
              <a href="#" className="w-10 h-10 rounded-full glass-button glass-hover flex items-center justify-center transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-stone-400 hover:text-white">
                  <rect width="20" height="20" x="2" y="2" rx="5" ry="5"></rect>
                  <path d="m16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                  <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"></line>
                </svg>
              </a>
              <a href="#" className="w-10 h-10 rounded-full glass-button glass-hover flex items-center justify-center transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-stone-400 hover:text-white">
                  <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17"></path>
                  <path d="m10 15 5-3-5-3z"></path>
                </svg>
              </a>
            </div>
          </div>

          <div className="">
            <h3 className="text-white font-semibold mb-6 tracking-tight font-sans">Contact</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-sm text-stone-400">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-400 flex-shrink-0">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                </svg>
                <a href="tel:+16788587893" className="font-sans hover:text-white transition-colors">+1 (678) 858-7893</a>
              </div>
              
              <div className="flex items-center gap-3 text-sm text-stone-400">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400 flex-shrink-0">
                  <path d="m4 4 16 12-16 4 3.5-8L4 4Z"></path>
                </svg>
                <a href="mailto:support@uscustomcaps.com" className="font-sans hover:text-white transition-colors">support@uscustomcaps.com</a>
              </div>
              
              <div className="flex items-start gap-3 text-sm text-stone-400">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-400 mt-0.5 flex-shrink-0">
                  <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path>
                  <circle cx="12" cy="10" r="3"></circle>
                </svg>
                <span className="font-sans">957 Hwy 85 Connector<br />Brooks, GA 30205</span>
              </div>
              
              <div className="flex items-center gap-3 text-sm text-stone-400 pt-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-400 flex-shrink-0">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12,6 12,12 16,14"></polyline>
                </svg>
                <span className="font-sans">24/7 Support Available</span>
              </div>
            </div>
          </div>

          <div className="">
            <h3 className="text-white font-semibold mb-6 tracking-tight font-sans">Services</h3>
            <ul className="space-y-4">
              <li><button onClick={() => openQuoteModal('Custom Embroidery')} className="text-stone-400 hover:text-white transition-colors font-sans text-left">Custom Embroidery</button></li>
              <li><button onClick={() => openQuoteModal('Bulk Orders')} className="text-stone-400 hover:text-white transition-colors font-sans text-left">Bulk Orders</button></li>
              <li><button onClick={() => openQuoteModal('Logo Design')} className="text-stone-400 hover:text-white transition-colors font-sans text-left">Logo Design</button></li>
              <li><button onClick={() => openQuoteModal('Heat Transfer')} className="text-stone-400 hover:text-white transition-colors font-sans text-left">Heat Transfer</button></li>
              <li><button onClick={() => openQuoteModal('Corporate Branding')} className="text-stone-400 hover:text-white transition-colors font-sans text-left">Corporate Branding</button></li>
              <li><button onClick={() => openQuoteModal('Team Uniforms')} className="text-stone-400 hover:text-white transition-colors font-sans text-left">Team Uniforms</button></li>
            </ul>
          </div>

          <div className="">
            <h3 className="text-white font-semibold mb-6 tracking-tight font-sans">Support</h3>
            <ul className="space-y-4">
              <li><a href="/support" className="text-stone-400 hover:text-white transition-colors font-sans">Help Center</a></li>
              <li><a href="/support" className="text-stone-400 hover:text-white transition-colors font-sans">Contact Support</a></li>
              <li><a href="/support" className="text-stone-400 hover:text-white transition-colors font-sans">Get Quote</a></li>
              <li><a href="/support" className="text-stone-400 hover:text-white transition-colors font-sans">Order Tracking</a></li>
              <li><a href="/support" className="text-stone-400 hover:text-white transition-colors font-sans">Technical Help</a></li>
              <li><a href="/store" className="text-stone-400 hover:text-white transition-colors font-sans">Product Catalog</a></li>
            </ul>
          </div>
        </div>
      </div>

      {/* Quote Modal */}
      <AnimatePresence>
        {isQuoteModalOpen && (
          <motion.div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeQuoteModal}
          >
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
            <motion.div 
              className="relative glass-morphism-strong rounded-3xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              initial={{ scale: 0.8, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 50 }}
              onClick={e => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bricolage font-semibold">Request Quote</h2>
                <button 
                  onClick={handleCloseClick}
                  type="button"
                  className="p-2 rounded-full glass-button glass-hover transition-colors text-stone-400 hover:text-white z-10 relative"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 6L6 18"/>
                    <path d="M6 6l12 12"/>
                  </svg>
                </button>
              </div>

              {/* Service Display */}
              {selectedService && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-stone-300 mb-2 font-sans">Selected Service</label>
                  <div className="p-4 rounded-xl glass-morphism-subtle border border-orange-500/30">
                    <h3 className="font-medium text-white font-sans">{selectedService}</h3>
                  </div>
                </div>
              )}

              {/* Quote Form */}
              <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); submitQuote(); }}>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-stone-300 mb-2 font-sans">
                      Name *
                    </label>
                    <input 
                      type="text"
                      value={quoteForm.customerName}
                      onChange={(e) => handleFormChange('customerName', e.target.value)}
                      className="w-full px-4 py-3 glass-input rounded-xl font-sans text-white placeholder-stone-400 border-0 focus:ring-2 focus:ring-lime-500"
                      placeholder="Your full name"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-300 mb-2 font-sans">
                      Email *
                    </label>
                    <input 
                      type="email"
                      value={quoteForm.customerEmail}
                      onChange={(e) => handleFormChange('customerEmail', e.target.value)}
                      className="w-full px-4 py-3 glass-input rounded-xl font-sans text-white placeholder-stone-400 border-0 focus:ring-2 focus:ring-lime-500"
                      placeholder="your@email.com"
                      required
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-stone-300 mb-2 font-sans">
                      Phone
                    </label>
                    <input 
                      type="tel"
                      value={quoteForm.customerPhone}
                      onChange={(e) => handleFormChange('customerPhone', e.target.value)}
                      className="w-full px-4 py-3 glass-input rounded-xl font-sans text-white placeholder-stone-400 border-0 focus:ring-2 focus:ring-lime-500"
                      placeholder="(555) 123-4567"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-300 mb-2 font-sans">
                      Company
                    </label>
                    <input 
                      type="text"
                      value={quoteForm.customerCompany}
                      onChange={(e) => handleFormChange('customerCompany', e.target.value)}
                      className="w-full px-4 py-3 glass-input rounded-xl font-sans text-white placeholder-stone-400 border-0 focus:ring-2 focus:ring-lime-500"
                      placeholder="Company name"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-300 mb-2 font-sans">
                    Project Description *
                  </label>
                  <textarea 
                    value={quoteForm.projectDescription}
                    onChange={(e) => handleFormChange('projectDescription', e.target.value)}
                    rows={4}
                    className="w-full px-4 py-3 glass-input rounded-xl font-sans text-white placeholder-stone-400 border-0 focus:ring-2 focus:ring-lime-500 resize-none"
                    placeholder="Describe your custom cap project, including quantity, colors, logo requirements, etc."
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-300 mb-2 font-sans">
                    Timeline
                  </label>
                  <select 
                    value={quoteForm.timeline}
                    onChange={(e) => handleFormChange('timeline', e.target.value)}
                    className="w-full px-4 py-3 glass-input rounded-xl font-sans text-white border-0 focus:ring-2 focus:ring-lime-500"
                  >
                    <option value="">Select timeline</option>
                    <option value="rush">Rush Order (1-2 weeks)</option>
                    <option value="standard">Standard (2-4 weeks)</option>
                    <option value="extended">Extended (4-6 weeks)</option>
                    <option value="flexible">Flexible timing</option>
                  </select>
                </div>

                {/* Submit Status */}
                {submitStatus === 'success' && (
                  <div className="p-4 rounded-xl bg-green-500/20 border border-green-500/30 text-green-300">
                    <div className="flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 12l2 2 4-4"/>
                        <circle cx="12" cy="12" r="9"/>
                      </svg>
                      <span className="font-medium font-sans">Quote request submitted successfully!</span>
                    </div>
                    <p className="text-sm mt-1 font-sans">We'll get back to you within 24 hours with a detailed quote.</p>
                    <p className="text-xs mt-1 font-sans text-green-400">This modal will close automatically in a few seconds.</p>
                  </div>
                )}

                {submitStatus === 'error' && (
                  <div className="p-4 rounded-xl bg-red-500/20 border border-red-500/30 text-red-300">
                    <div className="flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="9"/>
                        <path d="M12 8v4"/>
                        <path d="M12 16h.01"/>
                      </svg>
                      <span className="font-medium font-sans">Failed to submit quote request</span>
                    </div>
                    <p className="text-sm mt-1 font-sans">Please try again or contact us directly.</p>
                  </div>
                )}

                {/* Submit Button */}
                <div className="flex gap-4">
                  <button 
                    type="button"
                    onClick={closeQuoteModal}
                    className="flex-1 px-6 py-3 glass-button glass-hover rounded-xl font-medium transition-all duration-300 font-sans"
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-lime-500 to-green-600 text-white rounded-xl font-medium hover:scale-105 transition-transform duration-300 font-sans disabled:opacity-50 disabled:hover:scale-100"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Submitting...
                      </div>
                    ) : (
                      'Submit Quote Request'
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </footer>
  );
}
