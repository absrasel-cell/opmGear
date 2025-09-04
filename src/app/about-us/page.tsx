"use client";

import React from "react";
import Navbar from "@/components/Navbar";
import Link from "next/link";

export default function AboutUsPage() {
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
        .animate-delay-1000 { animation-delay: 1.0s; }
        @keyframes fadeIn { to { opacity: 1; } }
        @keyframes slideUp { to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <main>
        <section className="mr-auto ml-auto pr-6 pb-20 pl-6 mt-[55px]" style={{maxWidth: '1850px'}}>
          <div className="md:rounded-[40px] md:p-16 lg:p-24 overflow-hidden glass-morphism rounded-b-3xl pt-16 pr-8 pb-16 pl-8 min-h-screen animate-glass-slide-in">
            
            {/* Breadcrumbs */}
            <nav className="mb-8 animate-slide-up">
              <div className="flex items-center gap-2 text-sm text-stone-400">
                <Link href="/" className="hover:text-lime-400 transition-colors">Home</Link>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                  <path d="m9 18 6-6-6-6"></path>
                </svg>
                <span className="text-white">About Us</span>
              </div>
            </nav>

            {/* Page Header */}
            <div className="mb-20 text-center animate-slide-up">
              <h1 className="text-5xl lg:text-7xl font-bricolage font-semibold text-white mb-6">
                About US Custom Caps
              </h1>
              <p className="text-xl text-stone-300 max-w-4xl mx-auto leading-relaxed">
                Learn about our company, mission, and what makes us the industry leader in custom baseball cap manufacturing. 
                Discover our story, values, and commitment to delivering excellence in every order.
              </p>
            </div>

            {/* Hero Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-20 animate-slide-up animate-delay-200">
              <div className="text-center glass-card-lg p-8 border border-lime-500/30 hover:border-lime-500/50 transition-all duration-300">
                <div className="text-4xl font-bold text-lime-400 mb-3 font-bricolage">48+</div>
                <div className="text-lg text-white font-semibold mb-1">Minimum Order</div>
                <div className="text-sm text-stone-400">vs 100+ industry average</div>
              </div>
              <div className="text-center glass-card-lg p-8 border border-orange-500/30 hover:border-orange-500/50 transition-all duration-300">
                <div className="text-4xl font-bold text-orange-400 mb-3 font-bricolage">7</div>
                <div className="text-lg text-white font-semibold mb-1">Days Production</div>
                <div className="text-sm text-stone-400">Industry leading speed</div>
              </div>
              <div className="text-center glass-card-lg p-8 border border-purple-500/30 hover:border-purple-500/50 transition-all duration-300">
                <div className="text-4xl font-bold text-purple-400 mb-3 font-bricolage">25+</div>
                <div className="text-lg text-white font-semibold mb-1">Logo Options</div>
                <div className="text-sm text-stone-400">Positions & techniques</div>
              </div>
              <div className="text-center glass-card-lg p-8 border border-lime-500/30 hover:border-lime-500/50 transition-all duration-300">
                <div className="text-4xl font-bold text-lime-400 mb-3 font-bricolage">98%</div>
                <div className="text-lg text-white font-semibold mb-1">Satisfaction</div>
                <div className="text-sm text-stone-400">Customer approval rating</div>
              </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid lg:grid-cols-2 gap-12 mb-20">
              
              {/* Left Column - Key Differentiators */}
              <div className="space-y-8 animate-slide-up animate-delay-400">
                <h2 className="text-3xl font-semibold text-white mb-8 font-bricolage">Our Competitive Advantages</h2>
                
                <div className="glass-card-lg p-8 border border-lime-500/30 hover:border-lime-500/50 transition-all duration-300">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-14 h-14 rounded-xl bg-lime-500/20 flex items-center justify-center flex-shrink-0 border border-lime-500/30">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7 text-lime-400">
                        <path d="M12 2v20m0-20l3 3m-3-3-3 3"></path>
                        <path d="m8 9 3 3-3 3"></path>
                        <path d="m16 15-3-3 3-3"></path>
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-2xl font-semibold text-white mb-3 font-bricolage">Lower Minimum Orders</h3>
                      <p className="text-stone-300 leading-relaxed mb-4">
                        Start with just <strong className="text-lime-400">48 units</strong> while most competitors require 100+ units minimum. 
                        This makes custom caps accessible to small businesses, local sports teams, startups, and community organizations 
                        that need professional quality without massive upfront investment.
                      </p>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-lime-400">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 12l2 2 4-4"></path>
                            <circle cx="12" cy="12" r="9"></circle>
                          </svg>
                          <span>50% lower minimum than industry average</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-lime-400">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 12l2 2 4-4"></path>
                            <circle cx="12" cy="12" r="9"></circle>
                          </svg>
                          <span>Perfect for small teams and local businesses</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-lime-400">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 12l2 2 4-4"></path>
                            <circle cx="12" cy="12" r="9"></circle>
                          </svg>
                          <span>No compromise on quality at smaller quantities</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="glass-card-lg p-8 border border-orange-500/30 hover:border-orange-500/50 transition-all duration-300">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-14 h-14 rounded-xl bg-orange-500/20 flex items-center justify-center flex-shrink-0 border border-orange-500/30">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7 text-orange-400">
                        <path d="M12 20V10"></path>
                        <path d="M18 20V4"></path>
                        <path d="M6 20v-4"></path>
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-2xl font-semibold text-white mb-3 font-bricolage">3-Tier Quality System</h3>
                      <p className="text-stone-300 leading-relaxed mb-4">
                        Our innovative pricing structure accommodates every budget without sacrificing quality. Choose from three carefully 
                        curated material tiers designed to meet different needs and price points, ensuring you get the perfect balance 
                        of quality and affordability.
                      </p>
                      <div className="grid grid-cols-3 gap-3 mb-4">
                        <div className="text-center p-3 bg-white/5 rounded-lg border border-white/10">
                          <div className="text-lg font-bold text-orange-400 mb-1">Tier 1</div>
                          <div className="text-sm text-white">$3.60</div>
                          <div className="text-xs text-stone-400">Budget-friendly</div>
                        </div>
                        <div className="text-center p-3 bg-white/5 rounded-lg border border-white/10">
                          <div className="text-lg font-bold text-orange-400 mb-1">Tier 2</div>
                          <div className="text-sm text-white">$4.40</div>
                          <div className="text-xs text-stone-400">Premium</div>
                        </div>
                        <div className="text-center p-3 bg-white/5 rounded-lg border border-white/10">
                          <div className="text-lg font-bold text-orange-400 mb-1">Tier 3</div>
                          <div className="text-sm text-white">$4.80</div>
                          <div className="text-xs text-stone-400">Luxury</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-orange-400">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M9 12l2 2 4-4"></path>
                          <circle cx="12" cy="12" r="9"></circle>
                        </svg>
                        <span>Perfect quality-to-price ratio for any budget</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="glass-card-lg p-8 border border-purple-500/30 hover:border-purple-500/50 transition-all duration-300">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-14 h-14 rounded-xl bg-purple-500/20 flex items-center justify-center flex-shrink-0 border border-purple-500/30">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7 text-purple-400">
                        <circle cx="12" cy="12" r="10"></circle>
                        <path d="M12 6v6l4 2"></path>
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-2xl font-semibold text-white mb-3 font-bricolage">Fast 7-Day Production</h3>
                      <p className="text-stone-300 leading-relaxed mb-4">
                        In an industry where 2-3 weeks is standard, we've revolutionized our manufacturing process to deliver 
                        completed orders in just 7 working days. Combined with express shipping options, you can have your 
                        custom caps in hand within 11-15 working days total.
                      </p>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-purple-400">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 12l2 2 4-4"></path>
                            <circle cx="12" cy="12" r="9"></circle>
                          </svg>
                          <span>Faster than 90% of competitors</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-purple-400">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 12l2 2 4-4"></path>
                            <circle cx="12" cy="12" r="9"></circle>
                          </svg>
                          <span>Perfect for time-sensitive events and deadlines</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-purple-400">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 12l2 2 4-4"></path>
                            <circle cx="12" cy="12" r="9"></circle>
                          </svg>
                          <span>Rush production available for urgent orders</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column - Premium Features */}
              <div className="space-y-8 animate-slide-up animate-delay-600">
                <h2 className="text-3xl font-semibold text-white mb-8 font-bricolage">Premium Features & Services</h2>
                
                <div className="glass-card-lg p-8 border border-lime-500/30 hover:border-lime-500/50 transition-all duration-300">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-14 h-14 rounded-xl bg-lime-500/20 flex items-center justify-center flex-shrink-0 border border-lime-500/30">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7 text-lime-400">
                        <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                        <path d="m2 17 10 5 10-5"></path>
                        <path d="m2 12 10 5 10-5"></path>
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-2xl font-semibold text-white mb-3 font-bricolage">25+ Logo Placement Options</h3>
                      <p className="text-stone-300 leading-relaxed mb-4">
                        The most comprehensive customization options in the industry. With multiple positions (Front, Back, Left, Right, 
                        Upper Bill, Under Bill) and 8 different application techniques including 3D embroidery, leather patches, 
                        rubber patches, and heat transfer, your creative possibilities are virtually limitless.
                      </p>
                      <div className="grid grid-cols-2 gap-2 mb-4">
                        <div className="text-xs text-lime-400 p-2 bg-lime-500/10 rounded border border-lime-500/20">3D Embroidery</div>
                        <div className="text-xs text-lime-400 p-2 bg-lime-500/10 rounded border border-lime-500/20">Leather Patches</div>
                        <div className="text-xs text-lime-400 p-2 bg-lime-500/10 rounded border border-lime-500/20">Rubber Patches</div>
                        <div className="text-xs text-lime-400 p-2 bg-lime-500/10 rounded border border-lime-500/20">Heat Transfer</div>
                        <div className="text-xs text-lime-400 p-2 bg-lime-500/10 rounded border border-lime-500/20">Flat Embroidery</div>
                        <div className="text-xs text-lime-400 p-2 bg-lime-500/10 rounded border border-lime-500/20">Woven Labels</div>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-lime-400">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M9 12l2 2 4-4"></path>
                          <circle cx="12" cy="12" r="9"></circle>
                        </svg>
                        <span>Most comprehensive customization in the industry</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="glass-card-lg p-8 border border-orange-500/30 hover:border-orange-500/50 transition-all duration-300">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-14 h-14 rounded-xl bg-orange-500/20 flex items-center justify-center flex-shrink-0 border border-orange-500/30">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7 text-orange-400">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14,2 14,8 20,8"></polyline>
                        <line x1="16" y1="13" x2="8" y2="13"></line>
                        <line x1="16" y1="17" x2="8" y2="17"></line>
                        <polyline points="10,9 9,9 8,9"></polyline>
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-2xl font-semibold text-white mb-3 font-bricolage">Professional Design Services</h3>
                      <p className="text-stone-300 leading-relaxed mb-4">
                        Our expert design team offers comprehensive support to bring your vision to life. From initial concept 
                        to final product, we provide professional graphics design services and physical sampling to ensure 
                        perfect results before bulk production.
                      </p>
                      <div className="space-y-3 mb-4">
                        <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                          <span className="text-white font-medium">Graphics Design Service</span>
                          <span className="text-orange-400 font-semibold">$50</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                          <span className="text-white font-medium">Physical Sampling</span>
                          <span className="text-orange-400 font-semibold">$150</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-orange-400">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M9 12l2 2 4-4"></path>
                          <circle cx="12" cy="12" r="9"></circle>
                        </svg>
                        <span>End-to-end design and prototyping support</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="glass-card-lg p-8 border border-purple-500/30 hover:border-purple-500/50 transition-all duration-300">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-14 h-14 rounded-xl bg-purple-500/20 flex items-center justify-center flex-shrink-0 border border-purple-500/30">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7 text-purple-400">
                        <path d="m7 11 2-2m0 0 7 7 2-2M9 9l5-5m0 0L9 9l5-5"></path>
                        <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-2xl font-semibold text-white mb-3 font-bricolage">Premium Materials & Manufacturing</h3>
                      <p className="text-stone-300 leading-relaxed mb-4">
                        We source only the finest materials from trusted suppliers worldwide. Our premium options include 
                        luxury materials like Suede Cotton and Genuine Leather, with custom fabric dyeing available for 
                        large orders. Multiple fabric weights ensure the perfect feel and durability.
                      </p>
                      <div className="grid grid-cols-2 gap-2 mb-4">
                        <div className="text-xs text-purple-400 p-2 bg-purple-500/10 rounded border border-purple-500/20">Suede Cotton</div>
                        <div className="text-xs text-purple-400 p-2 bg-purple-500/10 rounded border border-purple-500/20">Genuine Leather</div>
                        <div className="text-xs text-purple-400 p-2 bg-purple-500/10 rounded border border-purple-500/20">Custom Dyeing</div>
                        <div className="text-xs text-purple-400 p-2 bg-purple-500/10 rounded border border-purple-500/20">Premium Cotton</div>
                        <div className="text-xs text-purple-400 p-2 bg-purple-500/10 rounded border border-purple-500/20">16×12 Fabric</div>
                        <div className="text-xs text-purple-400 p-2 bg-purple-500/10 rounded border border-purple-500/20">20×20 Fabric</div>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-purple-400">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M9 12l2 2 4-4"></path>
                          <circle cx="12" cy="12" r="9"></circle>
                        </svg>
                        <span>Luxury materials not offered by most competitors</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Volume Pricing Section */}
            <div className="glass-card-lg p-10 border border-gradient-to-r border-orange-500/40 hover:border-orange-500/60 transition-all duration-300 animate-slide-up animate-delay-800 mb-20">
              <div className="text-center mb-8">
                <h2 className="text-4xl font-semibold text-white mb-4 font-bricolage">Volume Pricing That Scales With You</h2>
                <p className="text-stone-300 max-w-3xl mx-auto text-lg">
                  Our tier-based volume pricing grows with your business. The more you order, the more you save – 
                  with freight shipping available for orders 3168+ units. No hidden fees, no complicated pricing structures.
                </p>
              </div>
              
              <div className="grid md:grid-cols-4 gap-6 mb-8">
                <div className="text-center p-6 bg-white/5 rounded-xl border border-white/10 hover:border-lime-400/30 transition-colors">
                  <div className="text-lg font-semibold text-lime-400 mb-2">48-144 Units</div>
                  <div className="text-3xl font-bold text-white mb-2 font-bricolage">$3.60</div>
                  <div className="text-sm text-stone-400 mb-3">Starting price per cap</div>
                  <div className="text-xs text-lime-400">Perfect for small teams</div>
                </div>
                <div className="text-center p-6 bg-white/5 rounded-xl border border-white/10 hover:border-orange-400/30 transition-colors">
                  <div className="text-lg font-semibold text-orange-400 mb-2">576+ Units</div>
                  <div className="text-3xl font-bold text-white mb-2 font-bricolage">$2.90</div>
                  <div className="text-sm text-stone-400 mb-3">Bulk discount pricing</div>
                  <div className="text-xs text-orange-400">Most popular option</div>
                </div>
                <div className="text-center p-6 bg-white/5 rounded-xl border border-white/10 hover:border-purple-400/30 transition-colors">
                  <div className="text-lg font-semibold text-purple-400 mb-2">3,168+ Units</div>
                  <div className="text-3xl font-bold text-white mb-2 font-bricolage">$2.75</div>
                  <div className="text-sm text-stone-400 mb-3">Enterprise pricing</div>
                  <div className="text-xs text-purple-400">Free freight shipping</div>
                </div>
                <div className="text-center p-6 bg-white/5 rounded-xl border border-white/10 hover:border-lime-400/30 transition-colors">
                  <div className="text-lg font-semibold text-lime-400 mb-2">10,000+ Units</div>
                  <div className="text-3xl font-bold text-white mb-2 font-bricolage">$2.70</div>
                  <div className="text-sm text-stone-400 mb-3">Maximum volume savings</div>
                  <div className="text-xs text-lime-400">Corporate contracts</div>
                </div>
              </div>

              <div className="text-center">
                <div className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500/20 to-red-500/20 rounded-full text-lg text-orange-300 border border-orange-500/30">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <path d="m19 8 2 2-2 2"></path>
                    <path d="m21 10-7.5-7.5"></path>
                    <path d="m16 5 2 2"></path>
                  </svg>
                  Save up to 25% with volume orders + free freight shipping for large quantities
                </div>
              </div>
            </div>

            {/* Quality Guarantees */}
            <div className="grid md:grid-cols-2 gap-12 mb-20 animate-slide-up animate-delay-1000">
              <div>
                <h2 className="text-3xl font-semibold text-white mb-8 font-bricolage">Quality Guarantees & Certifications</h2>
                <div className="space-y-6">
                  <div className="glass-card-md p-6 border border-lime-500/30">
                    <h4 className="text-lg font-semibold text-lime-400 mb-2">98% Customer Satisfaction</h4>
                    <p className="text-stone-300 text-sm">Our customers consistently rate us 4.8/5 stars, with 98% reporting complete satisfaction with their orders.</p>
                  </div>
                  <div className="glass-card-md p-6 border border-orange-500/30">
                    <h4 className="text-lg font-semibold text-orange-400 mb-2">Quality Assurance Process</h4>
                    <p className="text-stone-300 text-sm">Every cap undergoes a 3-point quality inspection before shipping, ensuring consistent quality standards.</p>
                  </div>
                  <div className="glass-card-md p-6 border border-purple-500/30">
                    <h4 className="text-lg font-semibold text-purple-400 mb-2">Material Certifications</h4>
                    <p className="text-stone-300 text-sm">All materials are sourced from certified suppliers and meet international quality and safety standards.</p>
                  </div>
                </div>
              </div>
              <div>
                <h2 className="text-3xl font-semibold text-white mb-8 font-bricolage">Customer Testimonials</h2>
                <div className="space-y-6">
                  <div className="glass-card-md p-6 border border-lime-500/20">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-lime-500/20 flex items-center justify-center">
                        <span className="text-lime-400 font-semibold text-sm">JD</span>
                      </div>
                      <div>
                        <div className="text-white font-medium">John Davis</div>
                        <div className="text-stone-400 text-xs">Local Sports Team</div>
                      </div>
                    </div>
                    <p className="text-stone-300 text-sm italic">"The 48-unit minimum was perfect for our team. Quality exceeded expectations and the 7-day turnaround saved our season!"</p>
                  </div>
                  <div className="glass-card-md p-6 border border-orange-500/20">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center">
                        <span className="text-orange-400 font-semibold text-sm">MW</span>
                      </div>
                      <div>
                        <div className="text-white font-medium">Maria Wilson</div>
                        <div className="text-stone-400 text-xs">Corporate Events</div>
                      </div>
                    </div>
                    <p className="text-stone-300 text-sm italic">"Amazing customization options! The 3D embroidery looks professional and the pricing was unbeatable for our volume."</p>
                  </div>
                  <div className="glass-card-md p-6 border border-purple-500/20">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                        <span className="text-purple-400 font-semibold text-sm">RT</span>
                      </div>
                      <div>
                        <div className="text-white font-medium">Robert Thompson</div>
                        <div className="text-stone-400 text-xs">Startup Founder</div>
                      </div>
                    </div>
                    <p className="text-stone-300 text-sm italic">"The design service was incredible - they brought our logo to life better than we imagined. Will definitely order again!"</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Call to Action */}
            <div className="text-center animate-slide-up animate-delay-1000">
              <h3 className="text-4xl font-semibold text-white mb-6 font-bricolage">Ready to Experience the Difference?</h3>
              <p className="text-xl text-stone-300 mb-10 max-w-3xl mx-auto">
                Join thousands of satisfied customers who chose US Custom Caps for superior quality, competitive pricing, and exceptional service.
              </p>
              <div className="flex flex-col sm:flex-row gap-6 justify-center">
                <Link href="/customize/baseball-cap" className="inline-flex items-center justify-center gap-3 transition-all hover:scale-105 hover:shadow-lg font-medium text-white bg-gradient-to-r from-lime-600 to-green-600 rounded-full pt-5 pr-10 pb-5 pl-10 shadow-[0_2.8px_2.2px_rgba(0,_0,_0,_0.034),_0_6.7px_5.3px_rgba(0,_0,_0,_0.048),_0_12.5px_10px_rgba(0,_0,_0,_0.06),_0_22.3px_17.9px_rgba(0,_0,_0,_0.072),_0_41.8px_33.4px_rgba(0,_0,_0,_0.086),_0_100px_80px_rgba(0,_0,_0,_0.12)]">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                    <path d="m2 17 10 5 10-5"></path>
                    <path d="m2 12 10 5 10-5"></path>
                  </svg>
                  Start Customizing Now
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14"></path>
                    <path d="m12 5 7 7-7 7"></path>
                  </svg>
                </Link>
                <Link href="/quote-request" className="inline-flex items-center justify-center gap-3 font-medium px-10 py-5 rounded-full glass-button glass-hover transition-all text-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z"></path>
                  </svg>
                  Get Volume Quote
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}