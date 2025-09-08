'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';

// Move GlassCard outside component to prevent re-creation on renders
const GlassCard: React.FC<React.PropsWithChildren<{ className?: string }>> = ({ className = '', children }) => (
  <div className={`rounded-2xl border border-white/10 glass-card ${className}`}>
    {children}
  </div>
);

const COMPANY = {
  name: 'US Custom Caps',
  owner: 'Joseph Benise',
  email: 'support@uscustomcaps.com',
  phone: '+16788587893',
  address: '957 Hwy 85 Connector, Brooks, GA 30205, United States',
  mapsUrl: 'https://www.google.com/maps/search/?api=1&query=957+Hwy+85+Connector%2C+Brooks%2C+GA+30205',
};

export default function ContactPage() {
 const [formData, setFormData] = useState({
  name: '',
  email: '',
  subject: '',
  message: '',
  phone: '',
  company: ''
 });
 const [isSubmitting, setIsSubmitting] = useState(false);
 const [isSubmitted, setIsSubmitted] = useState(false);
 const [submissionId, setSubmissionId] = useState<string | null>(null);

 const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
  const { name, value } = e.target;
  setFormData(prev => ({ ...prev, [name]: value }));
 }, []);

 const getFormType = useCallback((subject: string) => {
  switch (subject) {
   case 'custom-order': return 'CUSTOM_ORDER';
   case 'bulk-order': return 'BULK_ORDER';
   case 'design-help': return 'DESIGN_HELP';
   case 'shipping': return 'SHIPPING';
   case 'pricing': return 'PRICING';
   case 'partnership': return 'PARTNERSHIP';
   case 'support': return 'SUPPORT';
   default: return 'CONTACT';
  }
 }, []);

 const handleSubmit = useCallback(async (e: React.FormEvent) => {
  e.preventDefault();
  setIsSubmitting(true);
  
  try {

   const response = await fetch('/api/form-submissions', {
    method: 'POST',
    headers: {
     'Content-Type': 'application/json',
    },
    body: JSON.stringify({
     formType: getFormType(formData.subject),
     name: formData.name,
     email: formData.email,
     subject: formData.subject,
     message: formData.message,
     phone: formData.phone,
     company: formData.company,
     metadata: {
      source: 'contact_page',
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString()
     }
    })
   });

   if (!response.ok) {
    throw new Error('Failed to submit form');
   }

   const result = await response.json();
   console.log('Form submitted successfully:', result);
   
   setSubmissionId(result.submissionId);
   setIsSubmitting(false);
   setIsSubmitted(true);
   
   // Reset form after 8 seconds
   setTimeout(() => {
    setIsSubmitted(false);
    setSubmissionId(null);
    setFormData({ name: '', email: '', subject: '', message: '', phone: '', company: '' });
   }, 8000);

  } catch (error) {
   console.error('Error submitting form:', error);
   setIsSubmitting(false);
   // TODO: Add error state handling
   alert('Sorry, there was an error submitting your form. Please try again.');
  }
 }, [formData, getFormType]);



 return (
  <div className="relative min-h-screen overflow-x-hidden text-slate-200">

   <main className="mx-auto max-w-[1850px] px-6 md:px-10 pt-8 md:pt-12 pb-20 md:pb-28">
    {/* Hero Section (store photo) */}
    <section className="relative h-[48vh] min-h-[360px] mb-12 rounded-3xl overflow-hidden">
      <Image src="/uploads/Contact/store outfront.png" alt="Store outfront" fill priority className="object-cover" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/40 to-black/80" />
      <div className="relative h-full mx-auto max-w-[1850px] flex items-end px-4 sm:px-6 pb-8">
        <div className="max-w-3xl animate-fade-in">
          <span className="inline-block mb-2 px-3 py-1 rounded-full glass-badge text-xs uppercase tracking-widest">We’re here to help</span>
          <h1 className="text-4xl md:text-6xl font-extrabold">Contact Us</h1>
          <p className="mt-2 text-slate-200 max-w-2xl">Quotes, design assistance, sampling, shipping—reach out any time.</p>
        </div>
      </div>
    </section>

    {/* Quick info cards */}
    <div className="mx-auto max-w-[1850px] grid gap-6 md:grid-cols-3 mb-10">
      <GlassCard className="p-5 md:p-6">
        <div className="text-sm text-slate-300">Email</div>
        <a href={`mailto:${COMPANY.email}`} className="mt-1 block text-lg font-semibold hover:text-lime-300 transition-colors">{COMPANY.email}</a>
      </GlassCard>
      <GlassCard className="p-5 md:p-6">
        <div className="text-sm text-slate-300">Phone</div>
        <a href={`tel:${COMPANY.phone}`} className="mt-1 block text-lg font-semibold hover:text-lime-300 transition-colors">{COMPANY.phone}</a>
      </GlassCard>
      <GlassCard className="p-5 md:p-6">
        <div className="text-sm text-slate-300">Address</div>
        <a href={COMPANY.mapsUrl} target="_blank" rel="noopener noreferrer" className="mt-1 block text-lg font-semibold hover:text-lime-300 transition-colors">{COMPANY.address}</a>
      </GlassCard>
    </div>

    {/* Store photos + Company info */}
    <div className="mx-auto max-w-[1850px] grid gap-6 md:grid-cols-3 mb-12">
      <GlassCard className="md:col-span-2 overflow-hidden">
        <div className="relative w-full aspect-square md:aspect-[16/9]">
          <Image src="/uploads/Contact/Inside Store.jpg" alt="Inside store" fill className="object-cover" />
        </div>
      </GlassCard>
      <GlassCard className="p-6 md:p-8">
        <h2 className="text-2xl font-bold text-white">Company Info</h2>
        <div className="mt-4 space-y-3 text-slate-300">
          <div><span className="text-xs uppercase tracking-wide text-slate-400">Company</span><div className="font-semibold">{COMPANY.name}</div></div>
          <div><span className="text-xs uppercase tracking-wide text-slate-400">Owner</span><div className="font-semibold">{COMPANY.owner}</div></div>
          <div><span className="text-xs uppercase tracking-wide text-slate-400">Email</span><div><a href={`mailto:${COMPANY.email}`} className="font-semibold hover:text-lime-300">{COMPANY.email}</a></div></div>
          <div><span className="text-xs uppercase tracking-wide text-slate-400">Phone</span><div><a href={`tel:${COMPANY.phone}`} className="font-semibold hover:text-lime-300">{COMPANY.phone}</a></div></div>
          <div><span className="text-xs uppercase tracking-wide text-slate-400">Address</span><div><a href={COMPANY.mapsUrl} target="_blank" rel="noopener noreferrer" className="font-semibold hover:text-lime-300">{COMPANY.address}</a></div></div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <a href={`mailto:${COMPANY.email}`} className="glass-button px-4 py-2 rounded-full">Email Us</a>
          <a href={`tel:${COMPANY.phone}`} className="glass-button px-4 py-2 rounded-full">Call Now</a>
          <a href={COMPANY.mapsUrl} target="_blank" rel="noopener noreferrer" className="glass-button px-4 py-2 rounded-full">Open in Maps</a>
        </div>
      </GlassCard>
    </div>

    <div className="mx-auto max-w-[1850px]">
     <div className="grid lg:grid-cols-2 gap-8">
             {/* Left Column - Contact Form */}
      <div className="space-y-6">
       {/* Contact Form */}
       <GlassCard className="p-6 md:p-8">
        <div className="flex items-center gap-2 mb-6">
         <svg className="h-6 w-6 text-lime-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
         </svg>
         <h2 className="text-2xl md:text-3xl font-bold text-white">Send us a Message</h2>
        </div>
       
        {isSubmitted ? (
         <div className="text-center py-12">
          <div className="w-16 h-16 bg-lime-400 rounded-full flex items-center justify-center mx-auto mb-4 shadow-[0_0_30px_rgba(163,230,53,0.4)]">
           <svg className="w-8 h-8 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
           </svg>
          </div>
          <h3 className="text-2xl font-bold text-white mb-3">Message Sent Successfully!</h3>
          <p className="text-slate-300 mb-4">We'll get back to you within 24 hours during business days.</p>
          {submissionId && (
           <div className="bg-stone-800/60 rounded-lg p-4 border border-stone-600 max-w-md mx-auto">
            <p className="text-sm text-slate-400 mb-1">Reference ID:</p>
            <p className="text-lime-400 font-mono text-sm">{submissionId}</p>
            <p className="text-xs text-slate-500 mt-2">Save this ID for future reference</p>
           </div>
          )}
         </div>
       ) : (
         <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
           <div>
            <label htmlFor="name" className="block text-sm font-medium text-slate-200 mb-2">
             Full Name *
            </label>
            <input
             type="text"
             id="name"
             name="name"
             required
             value={formData.name}
             onChange={handleChange}
             className="w-full rounded-lg border border-stone-600 bg-black/40 px-4 py-3 text-white placeholder:text-slate-400 outline-none focus:border-lime-300/60 focus:ring-2 focus:ring-lime-400/50 transition-colors duration-200"
             placeholder="Enter your full name"
            />
           </div>
           <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-200 mb-2">
             Email Address *
            </label>
            <input
             type="email"
             id="email"
             name="email"
             required
             value={formData.email}
             onChange={handleChange}
             className="w-full rounded-lg border border-stone-600 bg-black/40 px-4 py-3 text-white placeholder:text-slate-400 outline-none focus:border-lime-300/60 focus:ring-2 focus:ring-lime-400/50 transition-colors duration-200"
             placeholder="Enter your email"
            />
           </div>
          </div>
          
          <div>
           <label htmlFor="subject" className="block text-sm font-medium text-slate-200 mb-2">
            Subject *
           </label>
           <select
            id="subject"
            name="subject"
            required
            value={formData.subject}
            onChange={handleChange}
            className="w-full rounded-lg border border-stone-600 bg-black/40 px-4 py-3 text-white outline-none focus:border-lime-300/60 focus:ring-2 focus:ring-lime-400/50 transition-colors duration-200"
           >
            <option value="" className="bg-black text-slate-400">Select a subject</option>
            <option value="custom-order" className="bg-black text-white">Custom Order Inquiry</option>
            <option value="bulk-order" className="bg-black text-white">Bulk Order Request</option>
            <option value="design-help" className="bg-black text-white">Design Assistance</option>
            <option value="shipping" className="bg-black text-white">Shipping & Delivery</option>
            <option value="pricing" className="bg-black text-white">Pricing Information</option>
            <option value="partnership" className="bg-black text-white">Partnership Opportunities</option>
            <option value="support" className="bg-black text-white">Technical Support</option>
            <option value="other" className="bg-black text-white">Other</option>
           </select>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6">
           <div>
            <label htmlFor="phone" className="block text-sm font-medium text-slate-200 mb-2">
             Phone Number
            </label>
            <input
             type="tel"
             id="phone"
             name="phone"
             value={formData.phone}
             onChange={handleChange}
             className="w-full rounded-lg border border-stone-600 bg-black/40 px-4 py-3 text-white placeholder:text-slate-400 outline-none focus:border-lime-300/60 focus:ring-2 focus:ring-lime-400/50 transition-colors duration-200"
             placeholder="(555) 123-4567"
            />
           </div>
           <div>
            <label htmlFor="company" className="block text-sm font-medium text-slate-200 mb-2">
             Company/Organization
            </label>
            <input
             type="text"
             id="company"
             name="company"
             value={formData.company}
             onChange={handleChange}
             className="w-full rounded-lg border border-stone-600 bg-black/40 px-4 py-3 text-white placeholder:text-slate-400 outline-none focus:border-lime-300/60 focus:ring-2 focus:ring-lime-400/50 transition-colors duration-200"
             placeholder="Your company name"
            />
           </div>
          </div>
          
          <div>
           <label htmlFor="message" className="block text-sm font-medium text-slate-200 mb-2">
            Message *
           </label>
           <textarea
            id="message"
            name="message"
            required
            rows={6}
            value={formData.message}
            onChange={handleChange}
            className="w-full rounded-lg border border-stone-600 bg-black/40 px-4 py-3 text-white placeholder:text-slate-400 outline-none focus:border-lime-300/60 focus:ring-2 focus:ring-lime-400/50 resize-none transition-colors duration-200"
            placeholder="Tell us about your project or inquiry..."
           />
          </div>
          
          <button
           type="submit"
           disabled={isSubmitting}
           className="w-full rounded-full bg-lime-400 px-6 py-4 font-semibold text-black shadow-[0_0_30px_rgba(163,230,53,0.25)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_0_40px_rgba(163,230,53,0.4)] focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-400/60 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
           {isSubmitting ? (
            <div className="flex items-center justify-center">
             <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
             </svg>
             Sending Message...
            </div>
           ) : (
            'Send Message'
           )}
          </button>
         </form>
       )}
       </GlassCard>

       
      </div>

      {/* Right Column - FAQ Section */}
      <div className="space-y-6">
       <GlassCard className="p-6 md:p-8">
        <div className="flex items-center gap-2 mb-6">
         <svg className="h-6 w-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
         </svg>
         <h2 className="text-2xl font-bold text-white">Frequently Asked Questions</h2>
        </div>
        <div className="space-y-4">
         <div className="border-b border-stone-600 pb-4 p-4 rounded-lg bg-stone-900/60 backdrop-blur-xl hover:bg-stone-800/70 transition-colors duration-200">
          <h3 className="font-semibold text-lime-300 mb-2">What's the minimum order quantity?</h3>
          <p className="text-slate-300">Our minimum order is 48 pieces per color/size combination.</p>
         </div>
         <div className="border-b border-stone-600 pb-4 p-4 rounded-lg bg-stone-900/60 backdrop-blur-xl hover:bg-stone-800/70 transition-colors duration-200">
          <h3 className="font-semibold text-lime-300 mb-2">How long does production take?</h3>
          <p className="text-slate-300">Production typically takes 2-3 weeks, plus shipping time based on your selected method.</p>
         </div>
         <div className="border-b border-stone-600 pb-4 p-4 rounded-lg bg-stone-900/60 backdrop-blur-xl hover:bg-stone-800/70 transition-colors duration-200">
          <h3 className="font-semibold text-lime-300 mb-2">Do you offer design services?</h3>
          <p className="text-slate-300">Yes! Our design team can help create or optimize your logo for embroidery or printing.</p>
         </div>
         <div className="p-4 rounded-lg bg-stone-900/60 backdrop-blur-xl hover:bg-stone-800/70 transition-colors duration-200">
          <h3 className="font-semibold text-lime-300 mb-2">What file formats do you accept?</h3>
          <p className="text-slate-300">We accept AI, EPS, SVG, PNG, and JPG files. Vector formats are preferred for best results.</p>
         </div>
        </div>
       </GlassCard>
      </div>
     </div>
    </div>
   </main>
  </div>
 );
}
