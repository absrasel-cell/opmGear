"use client";

import React from "react";
import Navbar from "@/components/Navbar";
import BlankCapProducts from "@/components/ui/BlankCapProducts";
import CustomizationOptions from "@/components/ui/CustomizationOptions";
import ShippingBuildDisplay from "@/components/ui/ShippingBuildDisplay";

export default function HomePage() {
  return (
    <>
      {/* Using site-wide background image from globals.css */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute inset-0 bg-black/10" />
      </div>

      <div className="fixed inset-0 -z-5 pointer-events-none">
        <div className="absolute -top-24 -left-24 h-[480px] w-[480px] rounded-full bg-lime-400/15 blur-[120px]" />
        <div className="absolute top-1/3 -right-24 h-[520px] w-[520px] rounded-full bg-purple-500/15 blur-[120px]" />
        <div className="absolute bottom-0 left-1/3 h-[420px] w-[420px] rounded-full bg-orange-500/15 blur-[120px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(255,255,255,0.035),_transparent_60%)]" />
      </div>
        
      <style jsx>{`
        body { font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif; }
        .animate-fade-in { animation: fadeIn 0.8s ease-out forwards; opacity: 0; }
        .animate-slide-up { animation: slideUp 0.8s ease-out forwards; opacity: 0; transform: translateY(20px); }
        .animate-delay-200 { animation-delay: 0.2s; }
        .animate-delay-400 { animation-delay: 0.4s; }
        .animate-delay-600 { animation-delay: 0.6s; }
        .animate-delay-800 { animation-delay: 0.8s; }
        .animate-slide-left { 
          animation: slideLeft 40s linear infinite;
        }
        @keyframes fadeIn { to { opacity: 1; } }
        @keyframes slideUp { to { opacity: 1; transform: translateY(0); } }
        @keyframes slideLeft {
          0% { transform: translateX(0); }
          100% { transform: translateX(calc(-50%)); }
        }
      `}</style>

      <main>
        <section className="mr-auto ml-auto pr-6 pb-20 pl-6 mt-[55px]" style={{maxWidth: '1850px'}}>
          <div className="md:rounded-[40px] md:p-16 lg:p-24 overflow-hidden glass-morphism rounded-b-3xl pt-16 pr-8 pb-16 pl-8 min-h-[80vh] animate-glass-slide-in">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <div className="flex items-center glass-badge rounded-full pl-4 pr-6 py-2 w-max mb-8 animate-slide-up">
                  <div className="flex -space-x-3">
                    <img src="/uploads/home/Category/6-Panel Perforated Cap.webp" className="w-8 h-8 rounded-full border-2 border-stone-600 object-cover" alt="6-Panel Cap" />
                    <img src="/uploads/home/Category/FlatBill Cap.webp" className="w-8 h-8 rounded-full border-2 border-stone-600 object-cover" alt="FlatBill Cap" />
                    <img src="/uploads/home/Category/Bucket Hat.webp" className="w-8 h-8 rounded-full border-2 border-stone-600 object-cover" alt="Bucket Hat" />
                    <img src="/uploads/home/Category/Visor Cap.webp" className="w-8 h-8 rounded-full border-2 border-stone-600 object-cover" alt="Visor Cap" />
                    <img src="/uploads/home/Category/Sandwich Cap.webp" className="w-8 h-8 rounded-full border-2 border-stone-600 object-cover" alt="Sandwich Cap" />
                  </div>
                  <span className="ml-4 text-sm font-medium font-sans">
                    <span className="font-semibold font-sans">50k+</span> custom caps created
                  </span>
                </div>

                <h1 className="sm:text-5xl lg:text-7xl leading-tight animate-slide-up animate-delay-200 text-4xl tracking-tight mt-2 mb-2 font-bricolage font-semibold">
                  Premium Custom<br className="hidden sm:block" /> Baseball Caps
                </h1>

                <p className="text-base sm:text-lg max-w-xl animate-slide-up animate-delay-400 mt-6 text-stone-300 font-sans">
                  Design and customize professional-grade baseball caps with premium materials, advanced embroidery, and personalized branding. From corporate teams to individual style statements.
                </p>

                <div className="mt-10 flex flex-col sm:flex-row gap-4 animate-slide-up animate-delay-600">
                  <a href="/support" className="inline-flex items-center justify-center gap-2 transition-all hover:scale-105 hover:shadow-lg font-medium text-white bg-gradient-to-r from-orange-600 to-red-600 rounded-full pt-4 pr-8 pb-4 pl-8 shadow-[0_2.8px_2.2px_rgba(0,_0,_0,_0.034),_0_6.7px_5.3px_rgba(0,_0,_0,_0.048),_0_12.5px_10px_rgba(0,_0,_0,_0.06),_0_22.3px_17.9px_rgba(0,_0,_0,_0.072),_0_41.8px_33.4px_rgba(0,_0,_0,_0.086),_0_100px_80px_rgba(0,_0,_0,_0.12)]">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5" style={{ strokeWidth: 1.5 }}>
                      <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                      <path d="m2 17 10 5 10-5"></path>
                      <path d="m2 12 10 5 10-5"></path>
                    </svg>
                    Start Customizing
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4" style={{ strokeWidth: 1.5 }}>
                      <path d="M5 12h14"></path>
                      <path d="m12 5 7 7-7 7"></path>
                    </svg>
                  </a>
                  <a href="/quote-request" className="inline-flex items-center justify-center gap-2 font-medium px-8 py-4 rounded-full glass-button glass-hover transition-all font-sans">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4" style={{ strokeWidth: 1.5 }}>
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z"></path>
                    </svg>
                    Get Quote
                  </a>
                </div>

                <div className="mt-12 flex items-center gap-8 animate-slide-up animate-delay-800">
                  <div className="flex items-center gap-2">
                    <div className="flex text-yellow-400">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 fill-current" style={{ strokeWidth: 1.5 }}>
                        <path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"></path>
                      </svg>
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 fill-current" style={{ strokeWidth: 1.5 }}>
                        <path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"></path>
                      </svg>
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 fill-current" style={{ strokeWidth: 1.5 }}>
                        <path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"></path>
                      </svg>
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 fill-current" style={{ strokeWidth: 1.5 }}>
                        <path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"></path>
                      </svg>
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 fill-current" style={{ strokeWidth: 1.5 }}>
                        <path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"></path>
                      </svg>
                    </div>
                    <span className="text-sm font-medium font-sans">4.8/5 Rating</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-green-500" style={{ strokeWidth: 1.5 }}>
                      <path d="M9 12l2 2 4-4"></path>
                      <circle cx="12" cy="12" r="9"></circle>
                    </svg>
                    <span className="text-sm font-medium font-sans">Premium Quality</span>
                  </div>
                  <ShippingBuildDisplay />
                </div>
              </div>

              <div className="relative animate-slide-up animate-delay-400">
                <div className="relative overflow-hidden h-96 sm:h-[32rem] lg:h-[36rem] rounded-3xl shadow-[0_2.8px_2.2px_rgba(0,_0,_0,_0.034),_0_6.7px_5.3px_rgba(0,_0,_0,_0.048),_0_12.5px_10px_rgba(0,_0,_0,_0.06),_0_22.3px_17.9px_rgba(0,_0,_0,_0.072),_0_41.8px_33.4px_rgba(0,_0,_0,_0.086),_0_100px_80px_rgba(0,_0,_0,_0.12)]">
                  <img 
                    src="/uploads/home/heroImages/hero4.webp" 
                    alt="Premium Custom Baseball Cap" 
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                  
                  <div className="absolute top-4 left-4 text-white">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 rounded-full border-2 border-white bg-orange-500 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                          <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                          <path d="m2 17 10 5 10-5"></path>
                          <path d="m2 12 10 5 10-5"></path>
                        </svg>
                      </div>
                      <span className="text-xs font-medium font-sans">US Custom Cap Designer</span>
                    </div>
                    <p className="text-xs leading-4 max-w-[200px] rounded-lg p-2 glass-morphism-strong font-sans">
                      "Create premium custom caps with professional embroidery and personalized branding for teams and businesses."
                    </p>
                  </div>
                  
                  <div className="absolute top-4 right-4 flex gap-2">
                    <button className="rounded-full p-2 glass-button glass-hover transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-white" style={{ strokeWidth: 1.5 }}>
                        <path d="M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z"></path>
                      </svg>
                    </button>
                    <button className="rounded-full p-2 glass-button glass-hover transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-white" style={{ strokeWidth: 1.5 }}>
                        <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"></path>
                      </svg>
                    </button>
                  </div>

                  <div className="absolute bottom-4 left-4 right-4">
                    <div className="rounded-lg p-3 glass-card-sm">
                      <div className="flex items-center justify-between text-sm text-white">
                        <span className="font-sans">Your Vision, Our Craftsmanship</span>
                        <span className="flex items-center gap-1 font-sans">
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3" style={{ strokeWidth: 1.5 }}>
                            <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                          </svg>
                          Premium
                        </span>
                      </div>
                      <div className="mt-2 rounded-full h-1 bg-stone-600">
                        <div className="rounded-full h-1 w-4/5 bg-gradient-to-r from-orange-500 to-red-500"></div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="absolute -bottom-4 -right-4 glass-card-md pt-4 pr-4 pb-4 pl-4 shadow-[0_2.8px_2.2px_rgba(0,_0,_0,_0.034),_0_6.7px_5.3px_rgba(0,_0,_0,_0.048),_0_12.5px_10px_rgba(0,_0,_0,_0.06),_0_22.3px_17.9px_rgba(0,_0,_0,_0.072),_0_41.8px_33.4px_rgba(0,_0,_0,_0.086),_0_100px_80px_rgba(0,_0,_0,_0.12)]">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center bg-orange-600 border border-orange-500">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-white" style={{ strokeWidth: 1.5 }}>
                        <path d="M9 12l2 2 4-4"></path>
                        <circle cx="12" cy="12" r="9"></circle>
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white/90 font-sans">Quality Guaranteed</p>
                      <p className="text-xs text-white/60 font-sans">98% customer satisfaction</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-20">
              <div className="mb-12 text-center">
                <h2 className="text-4xl lg:text-5xl font-bricolage font-semibold text-white mb-4">
                  Our Cap Categories
                </h2>
                <p className="text-lg text-stone-300 max-w-2xl mx-auto">
                  Professional-grade baseball caps designed for every style and occasion. From classic 6-panel designs to modern flat bills.
                </p>
              </div>

              <div className="relative overflow-hidden py-6">
                <div className="flex gap-12 animate-slide-left" style={{width: 'max-content'}}>
                  <article className="relative overflow-hidden rounded-3xl hover:scale-105 transition-all duration-300 min-h-[420px] flex flex-col glass-card-lg border-orange-500/30 border shadow-[0_2.8px_2.2px_rgba(0,_0,_0,_0.034),_0_6.7px_5.3px_rgba(0,_0,_0,_0.048),_0_12.5px_10px_rgba(0,_0,_0,_0.06),_0_22.3px_17.9px_rgba(0,_0,_0,_0.072),_0_41.8px_33.4px_rgba(0,_0,_0,_0.086),_0_100px_80px_rgba(0,_0,_0,_0.12)] flex-shrink-0 w-96">
                    <div className="relative z-10 p-8 flex flex-col h-full justify-between">
                      <div className="mb-6">
                        <img src="/uploads/home/Category/6-Panel Perforated Cap.webp" alt="6-Panel Perforated Cap" className="w-full aspect-square object-contain rounded-xl mb-4" />
                        <span className="px-3 py-1 rounded-full text-xs font-medium uppercase tracking-wider text-orange-200 ring-1 ring-orange-400 bg-orange-900 font-sans">Popular</span>
                      </div>
                      <div>
                        <h3 className="text-2xl text-white tracking-tight mb-3 font-bricolage font-semibold">6-Panel Perforated Cap</h3>
                        <p className="text-sm leading-relaxed text-stone-300 mb-4 font-sans">Classic six-panel design with strategic perforations for enhanced breathability. Perfect for sports teams and corporate branding with superior comfort.</p>
                        <a href="/customize/baseball-cap" className="inline-flex items-center gap-2 text-orange-400 hover:text-orange-300 transition-colors text-sm font-medium">
                          Customize Now
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M5 12h14"></path>
                            <path d="m12 5 7 7-7 7"></path>
                          </svg>
                        </a>
                      </div>
                    </div>
                  </article>

                  <article className="relative overflow-hidden rounded-3xl hover:scale-105 transition-all duration-300 min-h-[420px] flex flex-col glass-card-lg border-orange-500/30 border shadow-[0_2.8px_2.2px_rgba(0,_0,_0,_0.034),_0_6.7px_5.3px_rgba(0,_0,_0,_0.048),_0_12.5px_10px_rgba(0,_0,_0,_0.06),_0_22.3px_17.9px_rgba(0,_0,_0,_0.072),_0_41.8px_33.4px_rgba(0,_0,_0,_0.086),_0_100px_80px_rgba(0,_0,_0,_0.12)] flex-shrink-0 w-96">
                    <div className="relative z-10 p-8 flex flex-col h-full justify-between">
                      <div className="mb-6">
                        <img src="/uploads/home/Category/FlatBill Cap.webp" alt="FlatBill Cap" className="w-full aspect-square object-contain rounded-xl mb-4" />
                        <span className="px-3 py-1 rounded-full text-xs font-medium uppercase tracking-wider text-orange-200 ring-1 ring-orange-400 bg-orange-900 font-sans">Trendy</span>
                      </div>
                      <div>
                        <h3 className="text-2xl text-white tracking-tight mb-3 font-bricolage font-semibold">FlatBill Cap</h3>
                        <p className="text-sm leading-relaxed text-stone-300 mb-4 font-sans">Modern flat-bill design that makes a bold statement. Ideal for streetwear brands, hip-hop artists, and youth-oriented organizations seeking contemporary style.</p>
                        <a href="/customize/baseball-cap" className="inline-flex items-center gap-2 text-orange-400 hover:text-orange-300 transition-colors text-sm font-medium">
                          Customize Now
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M5 12h14"></path>
                            <path d="m12 5 7 7-7 7"></path>
                          </svg>
                        </a>
                      </div>
                    </div>
                  </article>

                  <article className="relative overflow-hidden rounded-3xl hover:scale-105 transition-all duration-300 min-h-[420px] flex flex-col glass-card-lg border-purple-500/30 border shadow-[0_2.8px_2.2px_rgba(0,_0,_0,_0.034),_0_6.7px_5.3px_rgba(0,_0,_0,_0.048),_0_12.5px_10px_rgba(0,_0,_0,_0.06),_0_22.3px_17.9px_rgba(0,_0,_0,_0.072),_0_41.8px_33.4px_rgba(0,_0,_0,_0.086),_0_100px_80px_rgba(0,_0,_0,_0.12)] flex-shrink-0 w-96">
                    <div className="relative z-10 p-8 flex flex-col h-full justify-between">
                      <div className="mb-6">
                        <img src="/uploads/home/Category/Bucket Hat.webp" alt="Bucket Hat" className="w-full aspect-square object-contain rounded-xl mb-4" />
                        <span className="px-3 py-1 rounded-full text-xs font-medium uppercase tracking-wider text-purple-200 ring-1 ring-purple-400 bg-purple-900 font-sans">Unique</span>
                      </div>
                      <div>
                        <h3 className="text-2xl text-white tracking-tight mb-3 font-bricolage font-semibold">Bucket Hat</h3>
                        <p className="text-sm leading-relaxed text-stone-300 mb-4 font-sans">360-degree sun protection with casual comfort. Perfect for outdoor events, fishing tournaments, and festival merchandise with all-around coverage.</p>
                        <a href="/customize/baseball-cap" className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 transition-colors text-sm font-medium">
                          Customize Now
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M5 12h14"></path>
                            <path d="m12 5 7 7-7 7"></path>
                          </svg>
                        </a>
                      </div>
                    </div>
                  </article>

                  <article className="relative overflow-hidden rounded-3xl hover:scale-105 transition-all duration-300 min-h-[420px] flex flex-col glass-card-lg border-orange-500/30 border shadow-[0_2.8px_2.2px_rgba(0,_0,_0,_0.034),_0_6.7px_5.3px_rgba(0,_0,_0,_0.048),_0_12.5px_10px_rgba(0,_0,_0,_0.06),_0_22.3px_17.9px_rgba(0,_0,_0,_0.072),_0_41.8px_33.4px_rgba(0,_0,_0,_0.086),_0_100px_80px_rgba(0,_0,_0,_0.12)] flex-shrink-0 w-96">
                    <div className="relative z-10 p-8 flex flex-col h-full justify-between">
                      <div className="mb-6">
                        <img src="/uploads/home/Category/6-Panel Perforated Cap.webp" alt="6-Panel Perforated Cap" className="w-full aspect-square object-contain rounded-xl mb-4" />
                        <span className="px-3 py-1 rounded-full text-xs font-medium uppercase tracking-wider text-orange-200 ring-1 ring-orange-400 bg-orange-900 font-sans">Popular</span>
                      </div>
                      <div>
                        <h3 className="text-2xl text-white tracking-tight mb-3 font-bricolage font-semibold">6-Panel Perforated Cap</h3>
                        <p className="text-sm leading-relaxed text-stone-300 mb-4 font-sans">Classic six-panel design with strategic perforations for enhanced breathability. Perfect for sports teams and corporate branding with superior comfort.</p>
                        <a href="/customize/baseball-cap" className="inline-flex items-center gap-2 text-orange-400 hover:text-orange-300 transition-colors text-sm font-medium">
                          Customize Now
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M5 12h14"></path>
                            <path d="m12 5 7 7-7 7"></path>
                          </svg>
                        </a>
                      </div>
                    </div>
                  </article>

                  <article className="relative overflow-hidden rounded-3xl hover:scale-105 transition-all duration-300 min-h-[420px] flex flex-col glass-card-lg border-orange-500/30 border shadow-[0_2.8px_2.2px_rgba(0,_0,_0,_0.034),_0_6.7px_5.3px_rgba(0,_0,_0,_0.048),_0_12.5px_10px_rgba(0,_0,_0,_0.06),_0_22.3px_17.9px_rgba(0,_0,_0,_0.072),_0_41.8px_33.4px_rgba(0,_0,_0,_0.086),_0_100px_80px_rgba(0,_0,_0,_0.12)] flex-shrink-0 w-96">
                    <div className="relative z-10 p-8 flex flex-col h-full justify-between">
                      <div className="mb-6">
                        <img src="/uploads/home/Category/FlatBill Cap.webp" alt="FlatBill Cap" className="w-full aspect-square object-contain rounded-xl mb-4" />
                        <span className="px-3 py-1 rounded-full text-xs font-medium uppercase tracking-wider text-orange-200 ring-1 ring-orange-400 bg-orange-900 font-sans">Trendy</span>
                      </div>
                      <div>
                        <h3 className="text-2xl text-white tracking-tight mb-3 font-bricolage font-semibold">FlatBill Cap</h3>
                        <p className="text-sm leading-relaxed text-stone-300 mb-4 font-sans">Modern flat-bill design that makes a bold statement. Ideal for streetwear brands, hip-hop artists, and youth-oriented organizations seeking contemporary style.</p>
                        <a href="/customize/baseball-cap" className="inline-flex items-center gap-2 text-orange-400 hover:text-orange-300 transition-colors text-sm font-medium">
                          Customize Now
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M5 12h14"></path>
                            <path d="m12 5 7 7-7 7"></path>
                          </svg>
                        </a>
                      </div>
                    </div>
                  </article>

                  <article className="relative overflow-hidden rounded-3xl hover:scale-105 transition-all duration-300 min-h-[420px] flex flex-col glass-card-lg border-purple-500/30 border shadow-[0_2.8px_2.2px_rgba(0,_0,_0,_0.034),_0_6.7px_5.3px_rgba(0,_0,_0,_0.048),_0_12.5px_10px_rgba(0,_0,_0,_0.06),_0_22.3px_17.9px_rgba(0,_0,_0,_0.072),_0_41.8px_33.4px_rgba(0,_0,_0,_0.086),_0_100px_80px_rgba(0,_0,_0,_0.12)] flex-shrink-0 w-96">
                    <div className="relative z-10 p-8 flex flex-col h-full justify-between">
                      <div className="mb-6">
                        <img src="/uploads/home/Category/Bucket Hat.webp" alt="Bucket Hat" className="w-full aspect-square object-contain rounded-xl mb-4" />
                        <span className="px-3 py-1 rounded-full text-xs font-medium uppercase tracking-wider text-purple-200 ring-1 ring-purple-400 bg-purple-900 font-sans">Unique</span>
                      </div>
                      <div>
                        <h3 className="text-2xl text-white tracking-tight mb-3 font-bricolage font-semibold">Bucket Hat</h3>
                        <p className="text-sm leading-relaxed text-stone-300 mb-4 font-sans">360-degree sun protection with casual comfort. Perfect for outdoor events, fishing tournaments, and festival merchandise with all-around coverage.</p>
                        <a href="/customize/baseball-cap" className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 transition-colors text-sm font-medium">
                          Customize Now
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M5 12h14"></path>
                            <path d="m12 5 7 7-7 7"></path>
                          </svg>
                        </a>
                      </div>
                    </div>
                  </article>
                </div>
              </div>

              <BlankCapProducts />
              
              <CustomizationOptions />

              {/* Why US Custom Caps Section - Compact */}
              <div className="mt-20">
                <div className="mb-12 text-center animate-slide-up">
                  <h2 className="text-4xl lg:text-5xl font-bricolage font-semibold text-white mb-6">
                    Why Choose US Custom Caps?
                  </h2>
                  <p className="text-lg text-stone-300 max-w-3xl mx-auto leading-relaxed">
                    Experience industry-leading quality, unbeatable flexibility, and exceptional service 
                    that sets us apart from the competition.
                  </p>
                </div>

                {/* Key Benefits Grid */}
                <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-6 mb-12 animate-slide-up animate-delay-200">
                  <div className="text-center glass-card-md p-6 border border-lime-500/30 hover:border-lime-500/50 transition-all duration-300">
                    <div className="w-12 h-12 rounded-xl bg-lime-500/20 flex items-center justify-center mx-auto mb-4 border border-lime-500/30">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-lime-400">
                        <path d="M12 2v20m0-20l3 3m-3-3-3 3"></path>
                        <path d="m8 9 3 3-3 3"></path>
                        <path d="m16 15-3-3 3-3"></path>
                      </svg>
                    </div>
                    <div className="text-2xl font-bold text-lime-400 mb-2 font-bricolage">48+</div>
                    <div className="text-sm font-semibold text-white mb-1">Minimum Order</div>
                    <div className="text-xs text-stone-400">vs 100+ industry average</div>
                  </div>
                  
                  <div className="text-center glass-card-md p-6 border border-purple-500/30 hover:border-purple-500/50 transition-all duration-300">
                    <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center mx-auto mb-4 border border-purple-500/30">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-purple-400">
                        <circle cx="12" cy="12" r="10"></circle>
                        <path d="M12 6v6l4 2"></path>
                      </svg>
                    </div>
                    <div className="text-2xl font-bold text-purple-400 mb-2 font-bricolage">7</div>
                    <div className="text-sm font-semibold text-white mb-1">Days Production</div>
                    <div className="text-xs text-stone-400">Industry leading speed</div>
                  </div>
                  
                  <div className="text-center glass-card-md p-6 border border-orange-500/30 hover:border-orange-500/50 transition-all duration-300">
                    <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center mx-auto mb-4 border border-orange-500/30">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-orange-400">
                        <path d="M12 20V10"></path>
                        <path d="M18 20V4"></path>
                        <path d="M6 20v-4"></path>
                      </svg>
                    </div>
                    <div className="text-2xl font-bold text-orange-400 mb-2 font-bricolage">3</div>
                    <div className="text-sm font-semibold text-white mb-1">Quality Tiers</div>
                    <div className="text-xs text-stone-400">$3.60 - $4.80 per cap</div>
                  </div>
                  
                  <div className="text-center glass-card-md p-6 border border-lime-500/30 hover:border-lime-500/50 transition-all duration-300">
                    <div className="w-12 h-12 rounded-xl bg-lime-500/20 flex items-center justify-center mx-auto mb-4 border border-lime-500/30">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-lime-400">
                        <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                        <path d="m2 17 10 5 10-5"></path>
                        <path d="m2 12 10 5 10-5"></path>
                      </svg>
                    </div>
                    <div className="text-2xl font-bold text-lime-400 mb-2 font-bricolage">25+</div>
                    <div className="text-sm font-semibold text-white mb-1">Logo Options</div>
                    <div className="text-xs text-stone-400">Positions & techniques</div>
                  </div>
                  
                  <div className="text-center glass-card-md p-6 border border-purple-500/30 hover:border-purple-500/50 transition-all duration-300">
                    <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center mx-auto mb-4 border border-purple-500/30">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-purple-400">
                        <path d="M9 12l2 2 4-4"></path>
                        <circle cx="12" cy="12" r="9"></circle>
                      </svg>
                    </div>
                    <div className="text-2xl font-bold text-purple-400 mb-2 font-bricolage">98%</div>
                    <div className="text-sm font-semibold text-white mb-1">Satisfaction</div>
                    <div className="text-xs text-stone-400">Customer approval rating</div>
                  </div>
                </div>

                {/* Quick Volume Pricing Preview */}
                <div className="glass-card-lg p-8 border border-orange-500/30 hover:border-orange-500/50 transition-all duration-300 animate-slide-up animate-delay-400 mb-12">
                  <div className="text-center mb-6">
                    <h3 className="text-2xl font-semibold text-white mb-3 font-bricolage">Volume Pricing That Scales</h3>
                    <p className="text-stone-300 max-w-2xl mx-auto">
                      Start at just $3.60 per cap and save up to 25% with larger orders
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="text-center p-4 bg-white/5 rounded-xl border border-white/10">
                      <div className="text-lg font-semibold text-lime-400 mb-1">48 Units</div>
                      <div className="text-xl font-bold text-white font-bricolage">$3.60</div>
                    </div>
                    <div className="text-center p-4 bg-white/5 rounded-xl border border-white/10">
                      <div className="text-lg font-semibold text-orange-400 mb-1">576 Units</div>
                      <div className="text-xl font-bold text-white font-bricolage">$2.90</div>
                    </div>
                    <div className="text-center p-4 bg-white/5 rounded-xl border border-white/10">
                      <div className="text-lg font-semibold text-purple-400 mb-1">10,000+ Units</div>
                      <div className="text-xl font-bold text-white font-bricolage">$2.70</div>
                    </div>
                  </div>
                </div>

                {/* Learn More Section */}
                <div className="text-center animate-slide-up animate-delay-600">
                  <h3 className="text-2xl font-semibold text-white mb-4 font-bricolage">Ready to Learn More?</h3>
                  <p className="text-stone-300 mb-8 max-w-2xl mx-auto">
                    Discover comprehensive details about our materials, processes, quality guarantees, and what makes us the industry leader.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <a href="/about-us" className="inline-flex items-center justify-center gap-2 transition-all hover:scale-105 hover:shadow-lg font-medium text-white bg-gradient-to-r from-purple-600 to-blue-600 rounded-full pt-4 pr-8 pb-4 pl-8 shadow-[0_2.8px_2.2px_rgba(0,_0,_0,_0.034),_0_6.7px_5.3px_rgba(0,_0,_0,_0.048),_0_12.5px_10px_rgba(0,_0,_0,_0.06),_0_22.3px_17.9px_rgba(0,_0,_0,_0.072),_0_41.8px_33.4px_rgba(0,_0,_0,_0.086),_0_100px_80px_rgba(0,_0,_0,_0.12)]">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                        <path d="M12 17h.01"></path>
                      </svg>
                      Learn More About Us
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12h14"></path>
                        <path d="m12 5 7 7-7 7"></path>
                      </svg>
                    </a>
                    <a href="/customize/baseball-cap" className="inline-flex items-center justify-center gap-2 transition-all hover:scale-105 hover:shadow-lg font-medium text-white bg-gradient-to-r from-lime-600 to-green-600 rounded-full pt-4 pr-8 pb-4 pl-8 shadow-[0_2.8px_2.2px_rgba(0,_0,_0,_0.034),_0_6.7px_5.3px_rgba(0,_0,_0,_0.048),_0_12.5px_10px_rgba(0,_0,_0,_0.06),_0_22.3px_17.9px_rgba(0,_0,_0,_0.072),_0_41.8px_33.4px_rgba(0,_0,_0,_0.086),_0_100px_80px_rgba(0,_0,_0,_0.12)]">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                        <path d="m2 17 10 5 10-5"></path>
                        <path d="m2 12 10 5 10-5"></path>
                      </svg>
                      Start Customizing
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12h14"></path>
                        <path d="m12 5 7 7-7 7"></path>
                      </svg>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

    </>
  );
}