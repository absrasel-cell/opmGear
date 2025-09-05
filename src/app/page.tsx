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
        <section className="mr-auto ml-auto px-2 xs:px-3 sm:px-6 pb-16 sm:pb-20 mt-[55px] max-w-[1850px]">
          <div className="md:rounded-[40px] sm:p-8 md:p-16 lg:p-24 overflow-hidden glass-morphism rounded-b-3xl pt-8 xs:pt-10 sm:pt-16 px-3 xs:px-4 sm:px-8 pb-10 xs:pb-12 sm:pb-16 min-h-[70vh] xs:min-h-[75vh] sm:min-h-[80vh] animate-glass-slide-in">
            <div className="grid lg:grid-cols-2 gap-8 xs:gap-10 lg:gap-12 items-center">
              <div>
                <div className="flex items-center glass-badge rounded-full pl-3 xs:pl-4 pr-4 xs:pr-6 py-1.5 xs:py-2 w-max mb-6 xs:mb-8 animate-slide-up">
                  <div className="flex -space-x-2 xs:-space-x-3">
                    <img src="/uploads/home/Category/6-Panel Perforated Cap.webp" className="w-6 h-6 xs:w-7 xs:h-7 sm:w-8 sm:h-8 rounded-full border-2 border-stone-600 object-cover" alt="6-Panel Cap" />
                    <img src="/uploads/home/Category/FlatBill Cap.webp" className="w-6 h-6 xs:w-7 xs:h-7 sm:w-8 sm:h-8 rounded-full border-2 border-stone-600 object-cover" alt="FlatBill Cap" />
                    <img src="/uploads/home/Category/Bucket Hat.webp" className="w-6 h-6 xs:w-7 xs:h-7 sm:w-8 sm:h-8 rounded-full border-2 border-stone-600 object-cover" alt="Bucket Hat" />
                    <img src="/uploads/home/Category/Visor Cap.webp" className="w-6 h-6 xs:w-7 xs:h-7 sm:w-8 sm:h-8 rounded-full border-2 border-stone-600 object-cover" alt="Visor Cap" />
                    <img src="/uploads/home/Category/Sandwich Cap.webp" className="w-6 h-6 xs:w-7 xs:h-7 sm:w-8 sm:h-8 rounded-full border-2 border-stone-600 object-cover" alt="Sandwich Cap" />
                  </div>
                  <span className="ml-3 xs:ml-4 text-xs xs:text-sm font-medium font-sans">
                    <span className="font-semibold font-sans">50k+</span> custom caps created
                  </span>
                </div>

                <h1 className="text-2xl xs:text-3xl sm:text-4xl md:text-5xl lg:text-7xl leading-tight animate-slide-up animate-delay-200 tracking-tight mt-1 xs:mt-2 mb-3 xs:mb-4 sm:mb-2 font-bricolage font-semibold">
                  Premium Custom<br className="hidden xs:block sm:block" /> Baseball Caps
                </h1>

                <p className="text-xs xs:text-sm sm:text-base md:text-lg max-w-xl animate-slide-up animate-delay-400 mt-3 xs:mt-4 sm:mt-6 text-stone-300 font-sans leading-relaxed">
                  Design and customize professional-grade baseball caps with premium materials, advanced embroidery, and personalized branding. From corporate teams to individual style statements.
                </p>

                <div className="mt-6 xs:mt-7 sm:mt-10 flex flex-col sm:flex-row gap-3 sm:gap-4 animate-slide-up animate-delay-600">
                  <a href="/support" className="inline-flex items-center justify-center gap-2 transition-all hover:scale-105 hover:shadow-lg font-medium text-white bg-gradient-to-r from-orange-600 to-red-600 rounded-full py-3 px-5 xs:px-6 sm:pt-4 sm:pr-8 sm:pb-4 sm:pl-8 shadow-[0_2.8px_2.2px_rgba(0,_0,_0,_0.034),_0_6.7px_5.3px_rgba(0,_0,_0,_0.048),_0_12.5px_10px_rgba(0,_0,_0,_0.06),_0_22.3px_17.9px_rgba(0,_0,_0,_0.072),_0_41.8px_33.4px_rgba(0,_0,_0,_0.086),_0_100px_80px_rgba(0,_0,_0,_0.12)] min-h-[48px] xs:min-h-[52px] text-sm xs:text-base">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 sm:w-5 sm:h-5" style={{ strokeWidth: 1.5 }}>
                      <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                      <path d="m2 17 10 5 10-5"></path>
                      <path d="m2 12 10 5 10-5"></path>
                    </svg>
                    Start Customizing
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 sm:w-4 sm:h-4" style={{ strokeWidth: 1.5 }}>
                      <path d="M5 12h14"></path>
                      <path d="m12 5 7 7-7 7"></path>
                    </svg>
                  </a>
                  <a href="/quote-request" className="inline-flex items-center justify-center gap-2 font-medium px-5 xs:px-6 py-3 sm:px-8 sm:py-4 rounded-full glass-button glass-hover transition-all font-sans min-h-[48px] xs:min-h-[52px] text-sm xs:text-base">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 sm:w-4 sm:h-4" style={{ strokeWidth: 1.5 }}>
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z"></path>
                    </svg>
                    Get Quote
                  </a>
                </div>

                <div className="mt-6 xs:mt-8 sm:mt-12 flex flex-col xs:flex-row items-start xs:items-center gap-3 xs:gap-4 sm:gap-8 animate-slide-up animate-delay-800">
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
                    <span className="text-xs xs:text-sm font-medium font-sans">4.8/5 Rating</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-green-500" style={{ strokeWidth: 1.5 }}>
                      <path d="M9 12l2 2 4-4"></path>
                      <circle cx="12" cy="12" r="9"></circle>
                    </svg>
                    <span className="text-xs xs:text-sm font-medium font-sans">Premium Quality</span>
                  </div>
                  <ShippingBuildDisplay />
                </div>
              </div>

              <div className="relative animate-slide-up animate-delay-400 mt-6 xs:mt-7 lg:mt-0">
                <div className="relative overflow-hidden aspect-square sm:h-80 md:h-96 lg:h-[32rem] xl:h-[36rem] sm:aspect-auto rounded-xl xs:rounded-2xl sm:rounded-3xl shadow-[0_2.8px_2.2px_rgba(0,_0,_0,_0.034),_0_6.7px_5.3px_rgba(0,_0,_0,_0.048),_0_12.5px_10px_rgba(0,_0,_0,_0.06),_0_22.3px_17.9px_rgba(0,_0,_0,_0.072),_0_41.8px_33.4px_rgba(0,_0,_0,_0.086),_0_100px_80px_rgba(0,_0,_0,_0.12)]">
                  <img 
                    src="/uploads/home/heroImages/hero4.webp" 
                    alt="Premium Custom Baseball Cap" 
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                  
                  <div className="absolute top-3 xs:top-4 left-3 xs:left-4 text-white">
                    <div className="flex items-center gap-1.5 xs:gap-2 mb-1.5 xs:mb-2">
                      <div className="w-5 h-5 xs:w-6 xs:h-6 rounded-full border-2 border-white bg-orange-500 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white xs:w-3 xs:h-3">
                          <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                          <path d="m2 17 10 5 10-5"></path>
                          <path d="m2 12 10 5 10-5"></path>
                        </svg>
                      </div>
                      <span className="text-[10px] xs:text-xs font-medium font-sans">US Custom Cap Designer</span>
                    </div>
                    <p className="text-[10px] xs:text-xs leading-3 xs:leading-4 max-w-[160px] xs:max-w-[200px] rounded-lg p-1.5 xs:p-2 glass-morphism-strong font-sans">
                      "Create premium custom caps with professional embroidery and personalized branding for teams and businesses."
                    </p>
                  </div>
                  
                  <div className="absolute top-3 xs:top-4 right-3 xs:right-4 flex gap-1.5 xs:gap-2">
                    <button className="rounded-full p-1.5 xs:p-2 glass-button glass-hover transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 xs:w-4 xs:h-4 text-white" style={{ strokeWidth: 1.5 }}>
                        <path d="M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z"></path>
                      </svg>
                    </button>
                    <button className="rounded-full p-1.5 xs:p-2 glass-button glass-hover transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 xs:w-4 xs:h-4 text-white" style={{ strokeWidth: 1.5 }}>
                        <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"></path>
                      </svg>
                    </button>
                  </div>

                  <div className="absolute bottom-3 xs:bottom-4 left-3 xs:left-4 right-3 xs:right-4">
                    <div className="rounded-lg p-2 xs:p-3 glass-card-sm">
                      <div className="flex items-center justify-between text-xs xs:text-sm text-white">
                        <span className="font-sans text-[10px] xs:text-xs sm:text-sm">Your Vision, Our Craftsmanship</span>
                        <span className="flex items-center gap-1 font-sans text-[10px] xs:text-xs sm:text-sm">
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-2 h-2 xs:w-3 xs:h-3" style={{ strokeWidth: 1.5 }}>
                            <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                          </svg>
                          Premium
                        </span>
                      </div>
                      <div className="mt-1.5 xs:mt-2 rounded-full h-0.5 xs:h-1 bg-stone-600">
                        <div className="rounded-full h-0.5 xs:h-1 w-4/5 bg-gradient-to-r from-orange-500 to-red-500"></div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="absolute -bottom-3 xs:-bottom-4 -right-3 xs:-right-4 glass-card-md pt-3 pr-3 pb-3 pl-3 xs:pt-4 xs:pr-4 xs:pb-4 xs:pl-4 shadow-[0_2.8px_2.2px_rgba(0,_0,_0,_0.034),_0_6.7px_5.3px_rgba(0,_0,_0,_0.048),_0_12.5px_10px_rgba(0,_0,_0,_0.06),_0_22.3px_17.9px_rgba(0,_0,_0,_0.072),_0_41.8px_33.4px_rgba(0,_0,_0,_0.086),_0_100px_80px_rgba(0,_0,_0,_0.12)]">
                  <div className="flex items-center gap-2 xs:gap-3">
                    <div className="w-8 h-8 xs:w-10 xs:h-10 rounded-full flex items-center justify-center bg-orange-600 border border-orange-500">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 xs:w-5 xs:h-5 text-white" style={{ strokeWidth: 1.5 }}>
                        <path d="M9 12l2 2 4-4"></path>
                        <circle cx="12" cy="12" r="9"></circle>
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs xs:text-sm font-semibold text-white/90 font-sans">Quality Guaranteed</p>
                      <p className="text-[10px] xs:text-xs text-white/60 font-sans">98% customer satisfaction</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-12 xs:mt-14 sm:mt-20">
              <div className="mb-6 xs:mb-8 sm:mb-12 text-center px-3 xs:px-4">
                <h2 className="text-xl xs:text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bricolage font-semibold text-white mb-2 xs:mb-3 sm:mb-4">
                  Our Cap Categories
                </h2>
                <p className="text-sm xs:text-base sm:text-lg text-stone-300 max-w-2xl mx-auto leading-relaxed">
                  Professional-grade baseball caps designed for every style and occasion. From classic 6-panel designs to modern flat bills.
                </p>
              </div>

              <div className="relative py-3 xs:py-4 sm:py-6">
                {/* Mobile: Horizontal scrolling cards */}
                <div className="lg:hidden overflow-x-auto scrollbar-hide px-3 xs:px-4">
                  <div className="flex space-x-4 xs:space-x-5 sm:space-x-6 pb-2" style={{width: 'max-content'}}>
                  <article className="relative overflow-hidden rounded-xl xs:rounded-2xl sm:rounded-3xl hover:scale-105 transition-all duration-300 min-h-[320px] xs:min-h-[360px] sm:min-h-[420px] flex flex-col glass-card-lg border-orange-500/30 border shadow-[0_2.8px_2.2px_rgba(0,_0,_0,_0.034),_0_6.7px_5.3px_rgba(0,_0,_0,_0.048),_0_12.5px_10px_rgba(0,_0,_0,_0.06),_0_22.3px_17.9px_rgba(0,_0,_0,_0.072),_0_41.8px_33.4px_rgba(0,_0,_0,_0.086),_0_100px_80px_rgba(0,_0,_0,_0.12)] flex-shrink-0 w-72 xs:w-80">
                    <div className="relative z-10 p-4 xs:p-5 sm:p-8 flex flex-col h-full justify-between">
                      <div className="mb-4 xs:mb-5 sm:mb-6">
                        <img src="/uploads/home/Category/6-Panel Perforated Cap.webp" alt="6-Panel Perforated Cap" className="w-full aspect-square object-contain rounded-lg xs:rounded-xl mb-3 xs:mb-4" />
                        <span className="px-2 xs:px-3 py-1 rounded-full text-[10px] xs:text-xs font-medium uppercase tracking-wider text-orange-200 ring-1 ring-orange-400 bg-orange-900 font-sans">Popular</span>
                      </div>
                      <div>
                        <h3 className="text-lg xs:text-xl sm:text-2xl text-white tracking-tight mb-2 xs:mb-3 font-bricolage font-semibold">6-Panel Perforated Cap</h3>
                        <p className="text-xs xs:text-sm leading-relaxed text-stone-300 mb-3 xs:mb-4 font-sans">Classic six-panel design with strategic perforations for enhanced breathability. Perfect for sports teams and corporate branding with superior comfort.</p>
                        <a href="/customize/baseball-cap" className="inline-flex items-center gap-1.5 xs:gap-2 text-orange-400 hover:text-orange-300 transition-colors text-xs xs:text-sm font-medium">
                          Customize Now
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="xs:w-4 xs:h-4">
                            <path d="M5 12h14"></path>
                            <path d="m12 5 7 7-7 7"></path>
                          </svg>
                        </a>
                      </div>
                    </div>
                  </article>

                  <article className="relative overflow-hidden rounded-xl xs:rounded-2xl sm:rounded-3xl hover:scale-105 transition-all duration-300 min-h-[320px] xs:min-h-[360px] sm:min-h-[420px] flex flex-col glass-card-lg border-orange-500/30 border shadow-[0_2.8px_2.2px_rgba(0,_0,_0,_0.034),_0_6.7px_5.3px_rgba(0,_0,_0,_0.048),_0_12.5px_10px_rgba(0,_0,_0,_0.06),_0_22.3px_17.9px_rgba(0,_0,_0,_0.072),_0_41.8px_33.4px_rgba(0,_0,_0,_0.086),_0_100px_80px_rgba(0,_0,_0,_0.12)] flex-shrink-0 w-72 xs:w-80">
                    <div className="relative z-10 p-4 xs:p-5 sm:p-8 flex flex-col h-full justify-between">
                      <div className="mb-4 xs:mb-5 sm:mb-6">
                        <img src="/uploads/home/Category/FlatBill Cap.webp" alt="FlatBill Cap" className="w-full aspect-square object-contain rounded-lg xs:rounded-xl mb-3 xs:mb-4" />
                        <span className="px-2 xs:px-3 py-1 rounded-full text-[10px] xs:text-xs font-medium uppercase tracking-wider text-orange-200 ring-1 ring-orange-400 bg-orange-900 font-sans">Trendy</span>
                      </div>
                      <div>
                        <h3 className="text-lg xs:text-xl sm:text-2xl text-white tracking-tight mb-2 xs:mb-3 font-bricolage font-semibold">FlatBill Cap</h3>
                        <p className="text-xs xs:text-sm leading-relaxed text-stone-300 mb-3 xs:mb-4 font-sans">Modern flat-bill design that makes a bold statement. Ideal for streetwear brands, hip-hop artists, and youth-oriented organizations seeking contemporary style.</p>
                        <a href="/customize/baseball-cap" className="inline-flex items-center gap-1.5 xs:gap-2 text-orange-400 hover:text-orange-300 transition-colors text-xs xs:text-sm font-medium">
                          Customize Now
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="xs:w-4 xs:h-4">
                            <path d="M5 12h14"></path>
                            <path d="m12 5 7 7-7 7"></path>
                          </svg>
                        </a>
                      </div>
                    </div>
                  </article>

                  <article className="relative overflow-hidden rounded-xl xs:rounded-2xl sm:rounded-3xl hover:scale-105 transition-all duration-300 min-h-[320px] xs:min-h-[360px] sm:min-h-[420px] flex flex-col glass-card-lg border-purple-500/30 border shadow-[0_2.8px_2.2px_rgba(0,_0,_0,_0.034),_0_6.7px_5.3px_rgba(0,_0,_0,_0.048),_0_12.5px_10px_rgba(0,_0,_0,_0.06),_0_22.3px_17.9px_rgba(0,_0,_0,_0.072),_0_41.8px_33.4px_rgba(0,_0,_0,_0.086),_0_100px_80px_rgba(0,_0,_0,_0.12)] flex-shrink-0 w-72 xs:w-80">
                    <div className="relative z-10 p-4 xs:p-5 sm:p-8 flex flex-col h-full justify-between">
                      <div className="mb-4 xs:mb-5 sm:mb-6">
                        <img src="/uploads/home/Category/Bucket Hat.webp" alt="Bucket Hat" className="w-full aspect-square object-contain rounded-lg xs:rounded-xl mb-3 xs:mb-4" />
                        <span className="px-2 xs:px-3 py-1 rounded-full text-[10px] xs:text-xs font-medium uppercase tracking-wider text-purple-200 ring-1 ring-purple-400 bg-purple-900 font-sans">Unique</span>
                      </div>
                      <div>
                        <h3 className="text-lg xs:text-xl sm:text-2xl text-white tracking-tight mb-2 xs:mb-3 font-bricolage font-semibold">Bucket Hat</h3>
                        <p className="text-xs xs:text-sm leading-relaxed text-stone-300 mb-3 xs:mb-4 font-sans">360-degree sun protection with casual comfort. Perfect for outdoor events, fishing tournaments, and festival merchandise with all-around coverage.</p>
                        <a href="/customize/baseball-cap" className="inline-flex items-center gap-1.5 xs:gap-2 text-purple-400 hover:text-purple-300 transition-colors text-xs xs:text-sm font-medium">
                          Customize Now
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="xs:w-4 xs:h-4">
                            <path d="M5 12h14"></path>
                            <path d="m12 5 7 7-7 7"></path>
                          </svg>
                        </a>
                      </div>
                    </div>
                  </article>
                  </div>
                </div>

                {/* Desktop: Horizontal scrolling carousel */}
                <div className="hidden lg:block overflow-hidden">
                <div className="flex gap-8 xl:gap-12 animate-slide-left" style={{width: 'max-content'}}>
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
              </div>

              <BlankCapProducts />
              
              <CustomizationOptions />

              {/* Why US Custom Caps Section - Compact */}
              <div className="mt-12 xs:mt-16 sm:mt-20">
                <div className="mb-8 xs:mb-10 sm:mb-12 text-center animate-slide-up px-3 xs:px-4">
                  <h2 className="text-2xl xs:text-3xl sm:text-4xl lg:text-5xl font-bricolage font-semibold text-white mb-4 xs:mb-5 sm:mb-6">
                    Why Choose US Custom Caps?
                  </h2>
                  <p className="text-sm xs:text-base sm:text-lg text-stone-300 max-w-3xl mx-auto leading-relaxed">
                    Experience industry-leading quality, unbeatable flexibility, and exceptional service 
                    that sets us apart from the competition.
                  </p>
                </div>

                {/* Key Benefits Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 xs:gap-3 sm:gap-4 lg:gap-6 mb-6 xs:mb-8 sm:mb-12 animate-slide-up animate-delay-200 px-3 xs:px-4 sm:px-0">
                  <div className="text-center glass-card-md p-2 xs:p-3 sm:p-4 lg:p-6 border border-lime-500/30 hover:border-lime-500/50 transition-all duration-300">
                    <div className="w-6 h-6 xs:w-7 xs:h-7 sm:w-10 sm:h-10 lg:w-12 lg:h-12 rounded-lg xs:rounded-xl bg-lime-500/20 flex items-center justify-center mx-auto mb-1.5 xs:mb-2 sm:mb-3 lg:mb-4 border border-lime-500/30">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-2.5 h-2.5 xs:w-3 xs:h-3 sm:w-4 sm:h-4 lg:w-6 lg:h-6 text-lime-400">
                        <path d="M12 2v20m0-20l3 3m-3-3-3 3"></path>
                        <path d="m8 9 3 3-3 3"></path>
                        <path d="m16 15-3-3 3-3"></path>
                      </svg>
                    </div>
                    <div className="text-base xs:text-lg sm:text-xl lg:text-2xl font-bold text-lime-400 mb-0.5 xs:mb-1 sm:mb-2 font-bricolage">48+</div>
                    <div className="text-[10px] xs:text-xs sm:text-sm font-semibold text-white mb-0.5 xs:mb-1 leading-tight">Minimum Order</div>
                    <div className="text-[10px] xs:text-xs text-stone-400 hidden xs:block leading-tight">vs 100+ industry average</div>
                  </div>
                  
                  <div className="text-center glass-card-md p-2 xs:p-3 sm:p-4 lg:p-6 border border-purple-500/30 hover:border-purple-500/50 transition-all duration-300">
                    <div className="w-6 h-6 xs:w-7 xs:h-7 sm:w-10 sm:h-10 lg:w-12 lg:h-12 rounded-lg xs:rounded-xl bg-purple-500/20 flex items-center justify-center mx-auto mb-1.5 xs:mb-2 sm:mb-3 lg:mb-4 border border-purple-500/30">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-2.5 h-2.5 xs:w-3 xs:h-3 sm:w-4 sm:h-4 lg:w-6 lg:h-6 text-purple-400">
                        <circle cx="12" cy="12" r="10"></circle>
                        <path d="M12 6v6l4 2"></path>
                      </svg>
                    </div>
                    <div className="text-base xs:text-lg sm:text-xl lg:text-2xl font-bold text-purple-400 mb-0.5 xs:mb-1 sm:mb-2 font-bricolage">7</div>
                    <div className="text-[10px] xs:text-xs sm:text-sm font-semibold text-white mb-0.5 xs:mb-1 leading-tight">Days Production</div>
                    <div className="text-[10px] xs:text-xs text-stone-400 hidden xs:block leading-tight">Industry leading speed</div>
                  </div>
                  
                  <div className="text-center glass-card-md p-2 xs:p-3 sm:p-4 lg:p-6 border border-orange-500/30 hover:border-orange-500/50 transition-all duration-300">
                    <div className="w-6 h-6 xs:w-7 xs:h-7 sm:w-10 sm:h-10 lg:w-12 lg:h-12 rounded-lg xs:rounded-xl bg-orange-500/20 flex items-center justify-center mx-auto mb-1.5 xs:mb-2 sm:mb-3 lg:mb-4 border border-orange-500/30">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-2.5 h-2.5 xs:w-3 xs:h-3 sm:w-4 sm:h-4 lg:w-6 lg:h-6 text-orange-400">
                        <path d="M12 20V10"></path>
                        <path d="M18 20V4"></path>
                        <path d="M6 20v-4"></path>
                      </svg>
                    </div>
                    <div className="text-base xs:text-lg sm:text-xl lg:text-2xl font-bold text-orange-400 mb-0.5 xs:mb-1 sm:mb-2 font-bricolage">3</div>
                    <div className="text-[10px] xs:text-xs sm:text-sm font-semibold text-white mb-0.5 xs:mb-1 leading-tight">Quality Tiers</div>
                    <div className="text-[10px] xs:text-xs text-stone-400 hidden xs:block leading-tight">$3.60 - $4.80 per cap</div>
                  </div>
                  
                  <div className="text-center glass-card-md p-2 xs:p-3 sm:p-4 lg:p-6 border border-lime-500/30 hover:border-lime-500/50 transition-all duration-300">
                    <div className="w-6 h-6 xs:w-7 xs:h-7 sm:w-10 sm:h-10 lg:w-12 lg:h-12 rounded-lg xs:rounded-xl bg-lime-500/20 flex items-center justify-center mx-auto mb-1.5 xs:mb-2 sm:mb-3 lg:mb-4 border border-lime-500/30">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-2.5 h-2.5 xs:w-3 xs:h-3 sm:w-4 sm:h-4 lg:w-6 lg:h-6 text-lime-400">
                        <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                        <path d="m2 17 10 5 10-5"></path>
                        <path d="m2 12 10 5 10-5"></path>
                      </svg>
                    </div>
                    <div className="text-base xs:text-lg sm:text-xl lg:text-2xl font-bold text-lime-400 mb-0.5 xs:mb-1 sm:mb-2 font-bricolage">25+</div>
                    <div className="text-[10px] xs:text-xs sm:text-sm font-semibold text-white mb-0.5 xs:mb-1 leading-tight">Logo Options</div>
                    <div className="text-[10px] xs:text-xs text-stone-400 hidden xs:block leading-tight">Positions & techniques</div>
                  </div>
                  
                  <div className="text-center glass-card-md p-2 xs:p-3 sm:p-4 lg:p-6 border border-purple-500/30 hover:border-purple-500/50 transition-all duration-300">
                    <div className="w-6 h-6 xs:w-7 xs:h-7 sm:w-10 sm:h-10 lg:w-12 lg:h-12 rounded-lg xs:rounded-xl bg-purple-500/20 flex items-center justify-center mx-auto mb-1.5 xs:mb-2 sm:mb-3 lg:mb-4 border border-purple-500/30">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-2.5 h-2.5 xs:w-3 xs:h-3 sm:w-4 sm:h-4 lg:w-6 lg:h-6 text-purple-400">
                        <path d="M9 12l2 2 4-4"></path>
                        <circle cx="12" cy="12" r="9"></circle>
                      </svg>
                    </div>
                    <div className="text-base xs:text-lg sm:text-xl lg:text-2xl font-bold text-purple-400 mb-0.5 xs:mb-1 sm:mb-2 font-bricolage">98%</div>
                    <div className="text-[10px] xs:text-xs sm:text-sm font-semibold text-white mb-0.5 xs:mb-1 leading-tight">Satisfaction</div>
                    <div className="text-[10px] xs:text-xs text-stone-400 hidden xs:block leading-tight">Customer approval rating</div>
                  </div>
                </div>

                {/* Quick Volume Pricing Preview */}
                <div className="glass-card-lg p-3 xs:p-4 sm:p-6 lg:p-8 border border-orange-500/30 hover:border-orange-500/50 transition-all duration-300 animate-slide-up animate-delay-400 mb-6 xs:mb-8 sm:mb-12 mx-3 xs:mx-4 sm:mx-0">
                  <div className="text-center mb-4 xs:mb-5 sm:mb-6">
                    <h3 className="text-lg xs:text-xl sm:text-2xl font-semibold text-white mb-2 xs:mb-3 font-bricolage">Volume Pricing That Scales</h3>
                    <p className="text-xs xs:text-sm sm:text-base text-stone-300 max-w-2xl mx-auto">
                      Start at just $3.60 per cap and save up to 25% with larger orders
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 xs:gap-3 sm:gap-4 mb-3 xs:mb-4 sm:mb-6">
                    <div className="text-center p-3 xs:p-4 bg-white/5 rounded-lg xs:rounded-xl border border-white/10">
                      <div className="text-xs xs:text-sm sm:text-lg font-semibold text-lime-400 mb-1">48 Units</div>
                      <div className="text-base xs:text-lg sm:text-xl font-bold text-white font-bricolage">$3.60</div>
                    </div>
                    <div className="text-center p-3 xs:p-4 bg-white/5 rounded-lg xs:rounded-xl border border-white/10">
                      <div className="text-xs xs:text-sm sm:text-lg font-semibold text-orange-400 mb-1">576 Units</div>
                      <div className="text-base xs:text-lg sm:text-xl font-bold text-white font-bricolage">$2.90</div>
                    </div>
                    <div className="text-center p-3 xs:p-4 bg-white/5 rounded-lg xs:rounded-xl border border-white/10">
                      <div className="text-xs xs:text-sm sm:text-lg font-semibold text-purple-400 mb-1">10,000+ Units</div>
                      <div className="text-base xs:text-lg sm:text-xl font-bold text-white font-bricolage">$2.70</div>
                    </div>
                  </div>
                </div>

                {/* Learn More Section */}
                <div className="text-center animate-slide-up animate-delay-600 px-3 xs:px-4 sm:px-0">
                  <h3 className="text-lg xs:text-xl sm:text-2xl font-semibold text-white mb-2 xs:mb-3 sm:mb-4 font-bricolage">Ready to Learn More?</h3>
                  <p className="text-xs xs:text-sm sm:text-base text-stone-300 mb-5 xs:mb-6 sm:mb-8 max-w-2xl mx-auto leading-relaxed">
                    Discover comprehensive details about our materials, processes, quality guarantees, and what makes us the industry leader.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
                    <a href="/about-us" className="inline-flex items-center justify-center gap-2 transition-all hover:scale-105 hover:shadow-lg font-medium text-white bg-gradient-to-r from-purple-600 to-blue-600 rounded-full py-3 px-5 xs:px-6 sm:pt-4 sm:pr-8 sm:pb-4 sm:pl-8 shadow-[0_2.8px_2.2px_rgba(0,_0,_0,_0.034),_0_6.7px_5.3px_rgba(0,_0,_0,_0.048),_0_12.5px_10px_rgba(0,_0,_0,_0.06),_0_22.3px_17.9px_rgba(0,_0,_0,_0.072),_0_41.8px_33.4px_rgba(0,_0,_0,_0.086),_0_100px_80px_rgba(0,_0,_0,_0.12)] min-h-[48px] xs:min-h-[52px] text-sm xs:text-base">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 sm:w-5 sm:h-5">
                        <circle cx="12" cy="12" r="10"></circle>
                        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                        <path d="M12 17h.01"></path>
                      </svg>
                      Learn More About Us
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 sm:w-4 sm:h-4">
                        <path d="M5 12h14"></path>
                        <path d="m12 5 7 7-7 7"></path>
                      </svg>
                    </a>
                    <a href="/customize/baseball-cap" className="inline-flex items-center justify-center gap-2 transition-all hover:scale-105 hover:shadow-lg font-medium text-white bg-gradient-to-r from-lime-600 to-green-600 rounded-full py-3 px-5 xs:px-6 sm:pt-4 sm:pr-8 sm:pb-4 sm:pl-8 shadow-[0_2.8px_2.2px_rgba(0,_0,_0,_0.034),_0_6.7px_5.3px_rgba(0,_0,_0,_0.048),_0_12.5px_10px_rgba(0,_0,_0,_0.06),_0_22.3px_17.9px_rgba(0,_0,_0,_0.072),_0_41.8px_33.4px_rgba(0,_0,_0,_0.086),_0_100px_80px_rgba(0,_0,_0,_0.12)] min-h-[48px] xs:min-h-[52px] text-sm xs:text-base">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 sm:w-5 sm:h-5">
                        <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                        <path d="m2 17 10 5 10-5"></path>
                        <path d="m2 12 10 5 10-5"></path>
                      </svg>
                      Start Customizing
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 sm:w-4 sm:h-4">
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