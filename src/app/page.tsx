"use client";

import React, { FormEvent } from "react";
import { MinimalShippingNotification } from "@/components/ui/ShippingNotification";

/**
 * OPM Gear — Home Page
 * ------------------------------------------------------
 * Notes
 * - Navbar and Footer are already rendered in app/layout.tsx.
 * - This page follows the uploaded "FinanceFlow" style reference:
 *   dark gradients, glassmorphism, neon accents, smooth reveal animations.
 * - Content container is constrained to max-w-[1800px].
 * - All images are placeholders from Unsplash; replace with your assets later.
 */

export default function HomePage() {
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement;
    form.reset();
    alert("Thanks! We’ll be in touch shortly.");
  };

  return (
    <>
      {/* Background Glows (sitewide backing for this page) */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute -top-24 -left-24 h-[480px] w-[480px] rounded-full bg-lime-400/15 blur-[120px]" />
        <div className="absolute top-1/3 -right-24 h-[520px] w-[520px] rounded-full bg-purple-500/15 blur-[120px]" />
        <div className="absolute bottom-0 left-1/3 h-[420px] w-[420px] rounded-full bg-orange-500/15 blur-[120px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(255,255,255,0.035),_transparent_60%)]" />
      </div>

      {/* Page container */}
      <div className="max-w-[1800px] mx-auto px-6 md:px-10">
        {/* HERO */}
        <section id="home" className="relative pt-16 md:pt-24 lg:pt-28">
          {/* floating orbs */}
          <div className="absolute -z-10 inset-0 pointer-events-none">
            <div className="absolute top-16 right-10 h-24 w-24 rounded-full bg-lime-400/25 blur-2xl animate-[floatY_8s_ease-in-out_infinite]" />
            <div className="absolute bottom-8 left-16 h-28 w-28 rounded-full bg-purple-500/25 blur-2xl animate-[floatY_10s_ease-in-out_infinite]" />
            <div className="absolute top-1/3 left-1/3 h-16 w-16 rounded-full bg-orange-500/25 blur-2xl animate-[floatY_12s_ease-in-out_infinite]" />
          </div>

          <div className="grid lg:grid-cols-2 gap-10 items-center">
            {/* Visual card */}
            <div className="relative reveal-left" style={{ ['--delay' as any]: '.2s' }}>
              <div className="relative rounded-3xl bg-white/5 border border-white/10 p-2 md:p-3 backdrop-blur-2xl overflow-hidden">
                <div className="aspect-[16/9] rounded-2xl overflow-hidden bg-black/30 ring-1 ring-white/10 relative flex items-center justify-center">
                  {/* Background video */}
                  <video 
                    autoPlay 
                    muted 
                    loop 
                    playsInline 
                    className="absolute inset-0 h-full w-full object-cover opacity-60"
                  >
                    <source src="/uploads/home/Sora.mp4" type="video/mp4" />
                  </video>
                  {/* Hero image overlay */}
                  <img src="/uploads/home/heroImage.webp" alt="Custom cap hero" className="relative z-10 h-[85%] w-[85%] object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent z-20" />

                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between z-30">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-lime-400/90 flex items-center justify-center ring-1 ring-black/10">
                        {/* badge-check */}
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"/><path d="m9 12 2 2 4-4"/></svg>
                      </div>
                      <div>
                        <div className="text-white font-medium leading-tight">Premium Embroidery</div>
                        <div className="text-xs text-slate-300/80">3D puff, applique, metallic threads</div>
                      </div>
                    </div>
                    <div className="hidden md:flex items-center gap-2 rounded-xl bg-white/10 border border-white/10 px-3 py-2 backdrop-blur-xl hover:border-lime-400/50 hover:text-lime-300 transition">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M7 12h10"/><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/></svg>
                      <span className="text-sm">360° Preview</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* floating spec card */}
              <div className="absolute -right-3 -bottom-6 w-40 md:w-48 rounded-2xl bg-white/5 border border-white/10 p-3 backdrop-blur-xl shadow-[0_20px_60px_-15px_rgba(124,58,237,0.5)] animate-[floatY_9s_ease-in-out_infinite]">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-purple-500/30 ring-1 ring-purple-400/40 grid place-items-center">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22a1 1 0 0 1 0-20 10 9 0 0 1 10 9 5 5 0 0 1-5 5h-2.25a1.75 1.75 0 0 0-1.4 2.8l.3.4a1.75 1.75 0 0 1-1.4 2.8z"/></svg>
                  </div>
                  <div className="text-sm font-medium">Fabrics & Colors</div>
                </div>
                <div className="mt-2 text-xs text-slate-400">Wool blends, performance mesh, eco cotton.</div>
              </div>
            </div>

            <div className="reveal-right" style={{ ['--delay' as any]: '.05s' }}>
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-semibold tracking-tight text-white">
                Empowering Identity, Fueling Communities
              </h1>
              <p className="mt-5 text-slate-300 text-base md:text-lg max-w-2xl">
                OPM Gear lets schools, teams, and creators design & sell custom caps while fundraising.
                Built for quality, scale, and impact.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <a href="#configure" className="inline-flex items-center gap-2 rounded-2xl bg-lime-400 text-black font-medium px-6 py-3 shadow-[0_20px_60px_-15px_rgba(132,204,22,0.65)] hover:shadow-[0_24px_70px_-12px_rgba(132,204,22,0.85)] hover:-translate-y-0.5 transition">
                  {/* wand icon */}
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="-ml-0.5"><path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72"/><path d="m14 7 3 3"/></svg>
                  <span className="tracking-tight">Start Customizing</span>
                </a>
                <a href="#catalog" className="inline-flex items-center gap-2 rounded-2xl px-6 py-3 bg-white/5 border border-white/10 text-white hover:border-orange-400/40 hover:text-orange-300 backdrop-blur-xl transition">
                  {/* gallery icon */}
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M7 2h10"/><path d="M5 6h14"/><rect width="18" height="12" x="3" y="10" rx="2"/></svg>
                  <span className="tracking-tight">View Catalog</span>
                </a>
              </div>

              <div className="mt-10 grid grid-cols-3 max-w-md gap-4">
                {[
                  { v: "250+", l: "Programs Funded" },
                  { v: "100k+", l: "Caps Delivered" },
                  { v: "$1.2M", l: "Raised for Youth" },
                ].map((kpi, i) => (
                  <div key={kpi.l} className="rounded-xl bg-white/5 border border-white/10 px-4 py-3 backdrop-blur-xl reveal" style={{ ['--delay' as any]: `${0.15 + i * 0.1}s` }}>
                    <div className="text-2xl font-semibold text-white">{kpi.v}</div>
                    <div className="text-xs text-slate-400">{kpi.l}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Shipping Notification Banner */}
        <section className="mt-8">
          <div className="reveal" style={{ ['--delay' as any]: '.1s' }}>
            <MinimalShippingNotification />
          </div>
        </section>

        {/* Why OPM Gear? */}
        <section id="why-opm-gear" className="mt-12">
          <div className="reveal" style={{ ['--delay' as any]: '.05s' }}>
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-white">Why OPM Gear?</h2>
            <p className="mt-2 text-slate-300 max-w-3xl">More than just custom caps. We're your partner in building community, raising funds, and creating lasting impact through premium merchandise.</p>
          </div>

          <div className="mt-8 grid lg:grid-cols-2 gap-6">
            {/* Left Column - Main Differentiators */}
            <div className="space-y-4">
              {[
                {
                  icon: (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
                    </svg>
                  ),
                  title: 'Fundraising Built-In',
                  body: 'Turn merchandise into revenue. Every cap sale directly funds your team\'s goals—equipment, travel, scholarships. We\'ve helped raise $1.2M+ for youth programs.',
                  color: 'lime',
                  highlight: '$1.2M+ Raised'
                },
                {
                  icon: (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 3v18h18"/><path d="M18.7 8L12 13.3 7.7 9 3 13.3"/>
                    </svg>
                  ),
                  title: 'Transparent Pricing',
                  body: 'No hidden fees or surprise quotes. Clear tier-based pricing with volume discounts up to 37%. You know exactly what you\'re paying before you order.',
                  color: 'orange',
                  highlight: 'Up to 37% Savings'
                },
                {
                  icon: (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 9h6v6H9z"/><path d="M9 3v6"/><path d="M21 9h-6"/><path d="M15 21v-6"/><path d="M3 15h6"/>
                    </svg>
                  ),
                  title: 'Complete Technology Platform',
                  body: 'Real-time 3D customization, order tracking, team dashboards, and direct messaging. More than ordering—it\'s a complete merchandise management system.',
                  color: 'purple',
                  highlight: 'Full Platform'
                }
              ].map((item, i) => (
                <div key={item.title} className={`rounded-2xl bg-white/5 border border-white/10 p-6 backdrop-blur-xl hover:-translate-y-1 transition-all duration-300 reveal-left ${
                  item.color === 'lime' ? 'hover:border-lime-400/50 hover:shadow-[0_20px_60px_-15px_rgba(132,204,22,0.4)]' :
                  item.color === 'orange' ? 'hover:border-orange-400/50 hover:shadow-[0_20px_60px_-15px_rgba(251,146,60,0.4)]' :
                  'hover:border-purple-400/50 hover:shadow-[0_20px_60px_-15px_rgba(168,85,247,0.4)]'
                }`} style={{ ['--delay' as any]: `${0.1 + i * 0.1}s` }}>
                  <div className="flex items-start gap-4">
                    <div className={`flex-shrink-0 h-12 w-12 rounded-xl grid place-items-center ${
                      item.color === 'lime' ? 'bg-lime-400/20 text-lime-300 ring-1 ring-lime-300/30' :
                      item.color === 'orange' ? 'bg-orange-400/20 text-orange-300 ring-1 ring-orange-300/30' :
                      'bg-purple-500/20 text-purple-300 ring-1 ring-purple-300/30'
                    }`}>
                      {item.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-white">{item.title}</h3>
                        <span className={`text-xs px-2 py-1 rounded-lg ${
                          item.color === 'lime' ? 'bg-lime-400/20 text-lime-300' :
                          item.color === 'orange' ? 'bg-orange-400/20 text-orange-300' :
                          'bg-purple-500/20 text-purple-300'
                        }`}>{item.highlight}</span>
                      </div>
                      <p className="text-slate-300 text-sm leading-relaxed">{item.body}</p>
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Beyond Basic Ordering */}
              <div className="rounded-2xl bg-white/5 border border-white/10 p-6 backdrop-blur-xl reveal-left hover:border-cyan-400/50 hover:shadow-[0_20px_60px_-15px_rgba(34,211,238,0.4)] hover:-translate-y-1 transition-all duration-300" style={{ ['--delay' as any]: '.4s' }}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-purple-500/30 to-cyan-400/20 ring-1 ring-purple-300/40 grid place-items-center">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-purple-300">
                      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Beyond Basic Ordering</h3>
                    <p className="text-xs text-slate-400">Advanced features others don't offer</p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  {[
                    { label: 'Real-time order updates', status: 'included' },
                    { label: 'Multi-vendor Marketplace', status: 'included' },
                    { label: 'Fundraising Analytics', status: 'included' },
                    { label: 'Direct Designer Communication', status: 'included' },
                    { label: 'Robust shipping flow and tracking', status: 'included' },
                    { label: 'Live Product Customization', status: 'expanding' },
                  ].map((feature) => (
                    <div key={feature.label} className="flex items-center justify-between text-sm">
                      <span className="text-slate-300">{feature.label}</span>
                      <span className={`text-xs px-2 py-1 rounded ${
                        feature.status === 'included' ? 'bg-lime-400/20 text-lime-300' : 'bg-orange-400/20 text-orange-300'
                      }`}>
                        {feature.status === 'included' ? '✓' : 'Coming'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column - Visual Impact & Stats */}
            <div className="space-y-4">
              {/* Community Impact Visual */}
              <div className="rounded-2xl bg-white/5 border border-white/10 p-6 backdrop-blur-xl reveal-right h-fit" style={{ ['--delay' as any]: '.2s' }}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-lime-400/30 to-orange-400/20 ring-1 ring-lime-300/40 grid place-items-center">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-lime-300">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Community Impact</h3>
                    <p className="text-xs text-slate-400">Real results for real teams</p>
                  </div>
                </div>
                
                <div className="mt-4 aspect-[5/4] rounded-xl bg-black/30 border border-white/10 overflow-hidden relative">
                  <img 
                    src="/uploads/home/2nd hero image.webp" 
                    alt="Team celebrating with custom caps" 
                    className="w-full h-full object-cover opacity-80"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                  <div className="absolute bottom-3 left-3 right-3">
                    <div className="text-white text-sm font-medium">Teams succeeding together</div>
                    <div className="text-slate-300 text-xs">Custom caps that unite and fundraise</div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* Product Showcase (Carousel) */}
        <section id="catalog" className="mt-12">
          <div className="reveal" style={{ ['--delay' as any]: '.05s' }}>
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-white">Product Showcase</h2>
                <p className="mt-2 text-slate-300">Explore premium silhouettes, fabrics, and finishes. Smooth auto-scroll, hover to pause.</p>
              </div>
              <a href="#catalog" className="hidden md:inline-flex items-center gap-2 text-sm rounded-xl bg-white/5 border border-white/10 px-3 py-2 hover:border-lime-400/40 hover:text-lime-300 transition">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16v16H4z"/><path d="m16 19 2 2 4-4"/></svg>
                Full Catalog
              </a>
            </div>
          </div>

          <div className="mt-6 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-white/5 to-transparent backdrop-blur-xl relative group">
            <div className="carousel-container">
              <div className="carousel-track-continuous flex gap-4 px-4 py-6">
                {/* First set of products */}
                {[
                  { title: 'AirFrame 7', tag: 'Pro', tagColor: 'text-lime-300', src: 'https://nowxzkdkaegjwfhhqoez.supabase.co/storage/v1/object/public/uploads/messages/34040f7b-1686-41c6-bf44-a1257d738d98_1755574709379.jpg', note: '7-panel structured cap with premium finish.' },
                  { title: 'Heritage 6C', tag: 'Classic', tagColor: 'text-orange-300', src: 'https://nowxzkdkaegjwfhhqoez.supabase.co/storage/v1/object/public/uploads/messages/34040f7b-1686-41c6-bf44-a1257d738d98_1755577382093.jpg', note: '6-panel heritage design, timeless style.' },
                  { title: '5P Metal Eyelet', tag: 'Durable', tagColor: 'text-purple-300', src: 'https://nowxzkdkaegjwfhhqoez.supabase.co/storage/v1/object/public/uploads/messages/34040f7b-1686-41c6-bf44-a1257d738d98_1755586350776.jpg', note: '5-panel with metal eyelets, breathable design.' },
                  { title: '6P Flat Bill', tag: 'Urban', tagColor: 'text-cyan-300', src: 'https://nowxzkdkaegjwfhhqoez.supabase.co/storage/v1/object/public/uploads/messages/34040f7b-1686-41c6-bf44-a1257d738d98_1755588958688.jpg', note: 'Flat brim, 6-panel construction.' },
                  { title: 'Drift 6C', tag: 'Premium', tagColor: 'text-orange-300', src: 'https://nowxzkdkaegjwfhhqoez.supabase.co/storage/v1/object/public/uploads/messages/34040f7b-1686-41c6-bf44-a1257d738d98_1755947200744.jpg', note: 'Chino twill, curved bill, snapback closure.' },
                ].map((p, i) => (
                  <div key={`p1-${i}`} className={`w-[260px] md:w-[320px] shrink-0 rounded-2xl bg-white/5 border border-white/10 overflow-hidden backdrop-blur-xl transition will-change-transform group/item ${i%5===0?'hover:border-lime-400/50 hover:shadow-[0_20px_60px_-20px_rgba(132,204,22,0.6)]': i%5===1?'hover:border-orange-400/50 hover:shadow-[0_20px_60px_-20px_rgba(251,146,60,0.6)]': i%5===2?'hover:border-purple-400/50 hover:shadow-[0_20px_60px_-20px_rgba(168,85,247,0.6)]': i%5===3?'hover:border-cyan-400/50 hover:shadow-[0_20px_60px_-20px_rgba(34,211,238,0.6)]':'hover:border-orange-400/50 hover:shadow-[0_20px_60px_-20px_rgba(251,146,60,0.6)]' }`}>
                    <div className="aspect-square overflow-hidden">
                      <img src={p.src} className="h-full w-full object-cover group-hover/item:scale-[1.06] transition duration-500" alt={p.title} />
                    </div>
                    <div className="p-4">
                      <div className="flex items-center justify-between">
                        <p className="text-white font-medium">{p.title}</p>
                        <span className={`text-xs ${p.tagColor}`}>{p.tag}</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">{p.note}</p>
                    </div>
                  </div>
                ))}
                {/* Duplicate set for seamless loop */}
                {[
                  { title: 'AirFrame 7', tag: 'Pro', tagColor: 'text-lime-300', src: 'https://nowxzkdkaegjwfhhqoez.supabase.co/storage/v1/object/public/uploads/messages/34040f7b-1686-41c6-bf44-a1257d738d98_1755574709379.jpg', note: '7-panel structured cap with premium finish.' },
                  { title: 'Heritage 6C', tag: 'Classic', tagColor: 'text-orange-300', src: 'https://nowxzkdkaegjwfhhqoez.supabase.co/storage/v1/object/public/uploads/messages/34040f7b-1686-41c6-bf44-a1257d738d98_1755577382093.jpg', note: '6-panel heritage design, timeless style.' },
                  { title: '5P Metal Eyelet', tag: 'Durable', tagColor: 'text-purple-300', src: 'https://nowxzkdkaegjwfhhqoez.supabase.co/storage/v1/object/public/uploads/messages/34040f7b-1686-41c6-bf44-a1257d738d98_1755586350776.jpg', note: '5-panel with metal eyelets, breathable design.' },
                  { title: '6P Flat Bill', tag: 'Urban', tagColor: 'text-cyan-300', src: 'https://nowxzkdkaegjwfhhqoez.supabase.co/storage/v1/object/public/uploads/messages/34040f7b-1686-41c6-bf44-a1257d738d98_1755588958688.jpg', note: 'Flat brim, 6-panel construction.' },
                  { title: 'Drift 6C', tag: 'Premium', tagColor: 'text-orange-300', src: 'https://nowxzkdkaegjwfhhqoez.supabase.co/storage/v1/object/public/uploads/messages/34040f7b-1686-41c6-bf44-a1257d738d98_1755947200744.jpg', note: 'Chino twill, curved bill, snapback closure.' },
                ].map((p, i) => (
                  <div key={`p2-${i}`} className={`w-[260px] md:w-[320px] shrink-0 rounded-2xl bg-white/5 border border-white/10 overflow-hidden backdrop-blur-xl transition will-change-transform group/item ${i%5===0?'hover:border-lime-400/50 hover:shadow-[0_20px_60px_-20px_rgba(132,204,22,0.6)]': i%5===1?'hover:border-orange-400/50 hover:shadow-[0_20px_60px_-20px_rgba(251,146,60,0.6)]': i%5===2?'hover:border-purple-400/50 hover:shadow-[0_20px_60px_-20px_rgba(168,85,247,0.6)]': i%5===3?'hover:border-cyan-400/50 hover:shadow-[0_20px_60px_-20px_rgba(34,211,238,0.6)]':'hover:border-orange-400/50 hover:shadow-[0_20px_60px_-20px_rgba(251,146,60,0.6)]' }`}>
                    <div className="aspect-square overflow-hidden">
                      <img src={p.src} className="h-full w-full object-cover group-hover/item:scale-[1.06] transition duration-500" alt={p.title} />
                    </div>
                    <div className="p-4">
                      <div className="flex items-center justify-between">
                        <p className="text-white font-medium">{p.title}</p>
                        <span className={`text-xs ${p.tagColor}`}>{p.tag}</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">{p.note}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Hover overlay to pause animation */}
            <div className="absolute inset-0 group hover:[&_.carousel-track-continuous]:!animation-play-state-paused" />
          </div>
        </section>

        {/* Categories */}
        <section id="categories" className="mt-12">
          <div className="reveal" style={{ ['--delay' as any]: '.05s' }}>
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-white">Cap Product Categories</h2>
                <p className="mt-2 text-slate-300">Pick your sport to explore tailored designs.</p>
              </div>
            </div>
          </div>

          <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { name: 'Soft Ball', color: 'lime' },
              { name: 'Base Ball', color: 'orange' },
              { name: 'Foot Ball', color: 'purple' },
              { name: 'Basket Ball', color: 'cyan' },
              { name: 'Golf Ball', color: 'emerald' },
            ].map((c, i) => (
              <a key={c.name} href="#catalog" className={`group rounded-2xl p-5 bg-white/5 border border-white/10 backdrop-blur-xl hover:-translate-y-1 transition reveal ${
                i===0?'hover:border-lime-400/50': i===1?'hover:border-orange-400/50': i===2?'hover:border-purple-400/50': i===3?'hover:border-cyan-400/50':'hover:border-emerald-400/50'
              }`} style={{ ['--delay' as any]: `${0.05 + i*0.05}s` }}>
                <div className="flex items-center justify-between">
                  <span className="text-white font-medium">{c.name}</span>
                  <span className={`h-8 w-8 rounded-full grid place-items-center ${
                    i===0?'bg-gradient-to-br from-lime-400/40 to-lime-400/10 border border-lime-300/40':
                    i===1?'bg-gradient-to-br from-orange-400/40 to-orange-400/10 border border-orange-300/40':
                    i===2?'bg-gradient-to-br from-purple-500/40 to-purple-500/10 border border-purple-300/40':
                    i===3?'bg-gradient-to-br from-cyan-400/40 to-cyan-400/10 border border-cyan-300/40':
                             'bg-gradient-to-br from-emerald-400/40 to-emerald-400/10 border border-emerald-300/40'
                  }`}>
                    <div className="h-3 w-3 rounded-full bg-white/80" />
                  </span>
                </div>
                <div className={`mt-4 h-24 rounded-xl border grid place-items-center text-xs text-slate-400 ${
                  i===0?'border-lime-300/30 bg-[linear-gradient(135deg,rgba(132,204,22,0.08)_0%,transparent_50%),linear-gradient(0deg,rgba(255,255,255,0.03),rgba(255,255,255,0.03))]':
                  i===1?'border-orange-300/30 bg-[linear-gradient(135deg,rgba(251,146,60,0.08)_0%,transparent_50%),linear-gradient(0deg,rgba(255,255,255,0.03),rgba(255,255,255,0.03))]':
                  i===2?'border-purple-300/30 bg-[linear-gradient(135deg,rgba(168,85,247,0.08)_0%,transparent_50%),linear-gradient(0deg,rgba(255,255,255,0.03),rgba(255,255,255,0.03))]':
                  i===3?'border-cyan-300/30 bg-[linear-gradient(135deg,rgba(34,211,238,0.08)_0%,transparent_50%),linear-gradient(0deg,rgba(255,255,255,0.03),rgba(255,255,255,0.03))]':
                           'border-emerald-300/30 bg-[linear-gradient(135deg,rgba(16,185,129,0.08)_0%,transparent_50%),linear-gradient(0deg,rgba(255,255,255,0.03),rgba(255,255,255,0.03))]'
                }`}>Sport artwork placeholder</div>
              </a>
            ))}
          </div>
        </section>

        {/* Customization Features */}
        <section id="configure" className="mt-12">
          <div className="reveal" style={{ ['--delay' as any]: '.05s' }}>
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-white">Customization Features</h2>
            <p className="mt-2 text-slate-300 max-w-2xl">Choose embroidery styles, patches, fabrics, closures, and accessories to make it yours.</p>
          </div>

          <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { name: 'Embroidery', color: 'lime', note: 'Flat, 3D puff, metallic, applique.' },
              { name: 'Patches', color: 'orange', note: 'Woven, leather, PVC, chenille.' },
              { name: 'Fabrics', color: 'purple', note: 'Twill, wool, nylon, eco cotton.' },
              { name: 'Closures', color: 'lime', note: 'Snapback, strapback, flex-fit.' },
              { name: 'Accessories', color: 'orange', note: 'Brim ropes, contrast stitching, labels.' },
            ].map((f, i) => (
              <div key={f.name} className={`rounded-2xl bg-white/5 border border-white/10 p-5 backdrop-blur-xl transition reveal ${
                f.color==='lime'?'hover:-translate-y-1 hover:border-lime-400/50 hover:shadow-[0_20px_60px_-20px_rgba(132,204,22,0.6)]':'hover:-translate-y-1 hover:border-orange-400/50 hover:shadow-[0_20px_60px_-20px_rgba(251,146,60,0.6)]'
              }`} style={{ ['--delay' as any]: `${0.05 + i*0.05}s` }}>
                <div className="flex items-start gap-4">
                  <div className="min-w-0">
                    <div className={`h-10 w-10 rounded-lg grid place-items-center ${
                      f.color==='lime'?'bg-lime-400/30 ring-1 ring-lime-300/40':'bg-orange-400/30 ring-1 ring-orange-300/40'
                    }`}> 
                      <div className="h-3 w-3 rounded-full bg-white/80" />
                    </div>
                    <div className="mt-4 font-medium text-white">{f.name}</div>
                    <p className="text-sm text-slate-300 mt-1">{f.note}</p>
                  </div>
                  <div className="ml-auto shrink-0 h-16 w-24 rounded-lg bg-black/30 border border-white/10 grid place-items-center text-[11px] text-slate-500">
                    Image
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Pricing & Discounts */}
        <section id="pricing" className="mt-12">
          <div className="reveal" style={{ ['--delay' as any]: '.05s' }}>
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-white">Pricing & Volume Discounts</h2>
            <p className="mt-2 text-slate-300 max-w-2xl">Per-unit cost drops as you scale. Transparent, no surprises.</p>
          </div>

          <div className="mt-6 grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {[
              { qty: '48 Units', save: 'Save 10%', price: 27, badge: 'lime', perks: ['48 units','1 logo position','Standard shipping'] },
              { qty: '144 Units', save: 'Save 15%', price: 25, badge: 'orange', perks: ['144 units','2 logo positions','Expedited options'] },
              { qty: '288 Units', save: 'Save 25%', price: 23, badge: 'purple', best: true, perks: ['288 units','2–3 logo positions','Priority production'] },
              { qty: '576 Units', save: 'Save 30%', price: 21, badge: 'lime', perks: ['576 units','Up to 4 logo positions','Free setup & digitizing'] },
              { qty: '1000+ Units', save: 'Save 37%', price: 19, badge: 'cyan', perks: ['1000+ units','Dedicated account manager','Global fulfillment options'] },
            ].map((card, i) => (
              <div key={card.qty} className={`relative rounded-2xl p-6 backdrop-blur-xl transition reveal ${
                card.best ? 'bg-white/5 border border-purple-400/50 hover:-translate-y-1 hover:shadow-[0_24px_70px_-20px_rgba(168,85,247,0.6)] ring-1 ring-purple-400/20' : 'bg-white/5 border border-white/10 hover:-translate-y-1'
              } ${card.badge==='lime'?'hover:border-lime-400/50 hover:shadow-[0_20px_60px_-20px_rgba(132,204,22,0.6)]': card.badge==='orange'?'hover:border-orange-400/50 hover:shadow-[0_20px_60px_-20px_rgba(251,146,60,0.6)]': card.badge==='cyan'?'hover:border-cyan-400/50 hover:shadow-[0_20px_60px_-20px_rgba(34,211,238,0.6)]':''}`} style={{ ['--delay' as any]: `${0.05 + i*0.05}s` }}>
                {card.best && (
                  <span className="absolute -top-3 left-4 px-2 py-1 text-[10px] tracking-wide uppercase rounded-md bg-purple-500 text-white shadow">Best Value</span>
                )}
                <div className="flex items-center justify-between">
                  <div className="font-medium text-white">{card.qty}</div>
                  <span className={`text-xs px-2 py-1 rounded-lg border ${
                    card.badge==='lime'?'bg-lime-400/20 text-lime-300 border-lime-300/40':
                    card.badge==='orange'?'bg-orange-400/20 text-orange-300 border-orange-300/40':
                    card.badge==='purple'?'bg-purple-500/20 text-purple-300 border-purple-300/40':
                    card.badge==='cyan'?'bg-cyan-400/20 text-cyan-300 border-cyan-300/40':'bg-white/10 text-white/80 border-white/20'
                  }`}>{card.save}</span>
                </div>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="text-slate-400 line-through">$30</span>
                  <span className="text-3xl font-semibold text-white">${card.price}</span>
                  <span className="text-slate-400 text-xs">per unit</span>
                </div>
                <ul className="mt-4 space-y-2 text-sm text-slate-300">
                  {card.perks.map((p) => (
                    <li key={p} className="flex items-center gap-2">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={`${card.badge==='orange'?'text-orange-300': card.badge==='purple'?'text-purple-300': card.badge==='cyan'?'text-cyan-300':'text-lime-300'}`}>
                        <circle cx="12" cy="12" r="10"/>
                        <path d="m9 12 2 2 4-4"/>
                      </svg>
                      {p}
                    </li>
                  ))}
                </ul>
                <a href="#configure" className={`mt-5 inline-flex items-center gap-2 rounded-xl px-4 py-2 font-medium hover:-translate-y-0.5 transition ${
                  card.badge==='orange'?'bg-orange-400 text-black': card.badge==='purple'?'bg-purple-500 text-white': card.badge==='cyan'?'bg-cyan-400 text-black':'bg-lime-400 text-black'
                }`}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 10a4 4 0 0 1-8 0"/><path d="M3 6h18"/></svg>
                  Select
                </a>
              </div>
            ))}
          </div>

          <p className="mt-4 text-xs text-slate-400">Pricing shown for standard embroidery and common fabrics. Extra finishes and rush options may affect final quote.</p>
        </section>

        {/* Shipping */}
        <section id="shipping" className="mt-12">
          <div className="reveal" style={{ ['--delay' as any]: '.05s' }}>
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-white">Shipping & Turnaround</h2>
            <p className="mt-2 text-slate-300 max-w-2xl">Reliable timelines from sample to delivery. We ship nationwide with tracking.</p>
          </div>

          <div className="mt-6 grid lg:grid-cols-3 gap-4">
            {[
              { title: 'Standard', body: 'Lead time 3–4 weeks after approval. Free shipping over $500.', color: 'lime' },
              { title: 'Rush', body: '7–10 business days. Capacity limited; confirm availability.', color: 'orange' },
              { title: 'Express', body: '3–5 business days via air. Best for final replenishments.', color: 'cyan' },
            ].map((s, i) => (
              <div key={s.title} className={`rounded-2xl bg-white/5 border border-white/10 p-6 backdrop-blur-xl ${i===0?'reveal-left': i===2?'reveal-right':'reveal'}`} style={{ ['--delay' as any]: `${0.05 + i*0.05}s` }}>
                <div className="flex items-center gap-3">
                  <span className={`h-10 w-10 rounded-lg grid place-items-center ${s.color==='lime'?'bg-lime-400/30 ring-1 ring-lime-300/40': s.color==='orange'?'bg-orange-400/30 ring-1 ring-orange-300/40':'bg-cyan-400/30 ring-1 ring-cyan-300/40'}`}>
                    <div className="h-3 w-3 rounded-full bg-white/80" />
                  </span>
                  <div className="font-medium text-white">{s.title}</div>
                </div>
                <p className="mt-3 text-sm text-slate-300">{s.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Testimonials */}
        <section id="about" className="mt-12">
          <div className="reveal" style={{ ['--delay' as any]: '.05s' }}>
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-white">Loved by Teams & Communities</h2>
            <p className="mt-2 text-slate-300 max-w-2xl">Quality you can feel, impact you can measure. Rotating highlights below.</p>
          </div>

          <div className="mt-6 relative rounded-3xl bg-white/5 border border-white/10 p-8 backdrop-blur-xl overflow-hidden">
            <div className="testimonial-rotator h-40 relative">
              {[ 
                { q: '“OPM Gear helped us raise funds for our travel season with caps our fans actually love.”', by: '— Westview Baseball Booster' },
                { q: '“The embroidery quality is unmatched. Our logo finally pops the way we envisioned.”', by: '— Canyon Ridge HS' },
                { q: '“Seamless process, clear timelines, and great customer support from mockup to delivery.”', by: '— City FC' },
                { q: '“We sold out twice. The fundraiser model really works when the product is this good.”', by: '— Sunrise Softball' },
              ].map((t, i) => (
                <div key={i} className="flex h-full items-center">
                  <blockquote className="text-lg md:text-xl text-white/90">{t.q}</blockquote>
                  <span className="ml-3 text-sm text-slate-400">{t.by}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Contact / Quote Form */}
        <section id="contact" className="mt-12 pb-20">
          <div className="reveal" style={{ ['--delay' as any]: '.05s' }}>
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-white">Let’s build your cap</h2>
            <p className="mt-2 text-slate-300 max-w-2xl">Tell us about your project. Choose a request type to get the right form.</p>
          </div>

          <form onSubmit={onSubmit} className="mt-6 grid lg:grid-cols-5 gap-4">
            {/* Selector */}
            <div className="lg:col-span-5 rounded-2xl bg-white/5 border border-white/10 p-4 backdrop-blur-xl">
              <label className="block text-sm text-slate-300 mb-2">Request type</label>
              <div className="flex flex-wrap gap-2" role="tablist" aria-label="Form type">
                {[
                  { id: 'type-quote', label: 'Quote', color: 'lime', defaultChecked: true },
                  { id: 'type-fund', label: 'Fundraiser', color: 'orange' },
                  { id: 'type-team', label: 'Team Order', color: 'purple' },
                  { id: 'type-sample', label: 'Sample Kit', color: 'cyan' },
                ].map((t) => (
                  <div key={t.id} className="contents">
                    <input type="radio" name="formType" id={t.id} defaultChecked={t.defaultChecked} className="peer hidden" />
                    <label htmlFor={t.id} className={`px-3 py-2 rounded-xl border border-white/10 bg-white/5 text-slate-200 hover:cursor-pointer hover:text-white ${
                      t.color==='lime'?'hover:border-lime-300/40 hover:text-lime-300 peer-checked:bg-lime-400 peer-checked:text-black peer-checked:border-lime-400':
                      t.color==='orange'?'hover:border-orange-300/40 hover:text-orange-300 peer-checked:bg-orange-400 peer-checked:text-black peer-checked:border-orange-400':
                      t.color==='purple'?'hover:border-purple-300/40 hover:text-purple-300 peer-checked:bg-purple-500 peer-checked:text-white peer-checked:border-purple-500':
                                           'hover:border-cyan-300/40 hover:text-cyan-300 peer-checked:bg-cyan-400 peer-checked:text-black peer-checked:border-cyan-400'
                    }`}>
                      {t.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Left column */}
            <div className="lg:col-span-3 space-y-4">
              <div className="rounded-2xl bg-white/5 border border-white/10 p-4 backdrop-blur-xl">
                <label htmlFor="org" className="block text-sm text-slate-300">Organization / Team</label>
                <input id="org" name="organization" type="text" required className="mt-2 w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-lime-400/60" placeholder="e.g., Ridgeview Eagles" />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="rounded-2xl bg-white/5 border border-white/10 p-4 backdrop-blur-xl">
                  <label htmlFor="name" className="block text-sm text-slate-300">Contact name</label>
                  <input id="name" name="name" type="text" required className="mt-2 w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-lime-400/60" placeholder="Your full name" />
                </div>
                <div className="rounded-2xl bg-white/5 border border-white/10 p-4 backdrop-blur-xl">
                  <label htmlFor="email" className="block text-sm text-slate-300">Email</label>
                  <input id="email" name="email" type="email" required className="mt-2 w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-lime-400/60" placeholder="you@domain.com" />
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="rounded-2xl bg-white/5 border border-white/10 p-4 backdrop-blur-xl">
                  <label htmlFor="phone" className="block text-sm text-slate-300">Phone (optional)</label>
                  <input id="phone" name="phone" type="tel" className="mt-2 w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-lime-400/60" placeholder="(555) 555-5555" />
                </div>
                <div className="rounded-2xl bg-white/5 border border-white/10 p-4 backdrop-blur-xl">
                  <label htmlFor="qty" className="block text-sm text-slate-300">Estimated quantity</label>
                  <select id="qty" name="quantity" className="mt-2 w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-lime-400/60 backdrop-blur-sm [&>option]:bg-black/80 [&>option]:text-white [&>option]:py-3 [&>option]:px-4 [&>option]:border-b [&>option]:border-white/5 [&>option]:hover:bg-lime-400/10 [&>option]:backdrop-blur-md [&>option]:transition-all [&>option]:duration-200">
                    {['48','144','288','576','1000+'].map(v => <option key={v} className="bg-black/80 text-white py-3 px-4 border-b border-white/5 hover:bg-lime-400/10 transition-all duration-200">{v}</option>)}
                  </select>
                </div>
              </div>
              <div className="rounded-2xl bg-white/5 border border-white/10 p-4 backdrop-blur-xl">
                <label htmlFor="date" className="block text-sm text-slate-300">Target in-hands date</label>
                <input id="date" name="date" type="date" className="mt-2 w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-lime-400/60" />
              </div>
              <div className="rounded-2xl bg-white/5 border border-white/10 p-4 backdrop-blur-xl">
                <label htmlFor="message" className="block text-sm text-slate-300">Project details</label>
                <textarea id="message" name="message" rows={5} className="mt-2 w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-lime-400/60" placeholder="Logos, colors, fabrics, deadline, budget…" />
              </div>
              <div className="flex items-center gap-3">
                <button type="submit" className="inline-flex items-center gap-2 rounded-xl bg-lime-400 text-black px-5 py-2.5 font-medium shadow-[0_10px_40px_-10px_rgba(132,204,22,0.6)] hover:-translate-y-0.5 transition">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
                  Send request
                </button>
                <span className="text-xs text-slate-400">We reply within one business day.</span>
              </div>
            </div>

            {/* Right column (preview + upload) */}
            <div className="lg:col-span-2 space-y-4">
              <div className="rounded-2xl bg-white/5 border border-white/10 p-5 backdrop-blur-xl">
                <div className="flex items-center justify-between">
                  <div className="font-medium text-white">Artwork & References</div>
                  <span className="text-xs text-slate-400">Optional</span>
                </div>
                <div className="mt-4 aspect-[4/3] rounded-xl border border-dashed border-white/15 bg-black/30 grid place-items-center text-slate-500">
                  Drop files here or click to upload
                </div>
                <input type="file" className="sr-only" aria-hidden="true" />
                <p className="mt-2 text-xs text-slate-500">PNG, SVG, PDF, or AI up to 20MB.</p>
              </div>

              <div className="rounded-2xl bg-white/5 border border-white/10 p-5 backdrop-blur-xl">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-white/10 grid place-items-center">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 7 10 17l-5-5"/></svg>
                  </div>
                  <div>
                    <div className="font-medium text-white leading-tight">What you’ll receive</div>
                    <p className="text-xs text-slate-400">Mockups, quote, timeline, and a dedicated rep.</p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-3">
                  {['Mockup','Quote','Timeline'].map(x => (
                    <div key={x} className="h-16 rounded-lg bg-black/30 border border-white/10 grid place-items-center text-[11px] text-slate-500">{x}</div>
                  ))}
                </div>
              </div>
            </div>
          </form>
        </section>

      </div>

      {/* Page-local animation styles (scoped globally so classes work in children) */}
      <style jsx global>{`
        /* Keyframes */
        @keyframes fadeInUp { 0% { opacity: 0; transform: translateY(16px) scale(0.98); filter: blur(6px); } 100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); } }
        @keyframes slideInLeft { 0% { opacity: 0; transform: translateX(-24px); filter: blur(6px); } 100% { opacity: 1; transform: translateX(0); filter: blur(0); } }
        @keyframes slideInRight { 0% { opacity: 0; transform: translateX(24px); filter: blur(6px); } 100% { opacity: 1; transform: translateX(0); filter: blur(0); } }
        @keyframes floatY { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        @keyframes slowMarquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        @keyframes rotateQuotes { 0%,20% { opacity: 1; transform: translateY(0); } 25%,95% { opacity: 0; transform: translateY(-10px); } 100% { opacity: 1; transform: translateY(0); } }

        /* Helpers */
        .reveal { opacity: 0; animation: fadeInUp 0.9s ease-out forwards; animation-delay: var(--delay, 0s); }
        .reveal-left { opacity: 0; animation: slideInLeft 0.9s ease-out forwards; animation-delay: var(--delay, 0s); }
        .reveal-right { opacity: 0; animation: slideInRight 0.9s ease-out forwards; animation-delay: var(--delay, 0s); }

        .carousel-track-continuous { 
          display: flex; 
          width: max-content; 
          animation: continuousSlide 40s linear infinite; 
        }
        
        @keyframes continuousSlide { 
          0% { transform: translateX(0); } 
          100% { transform: translateX(-50%); } 
        }

        .testimonial-rotator > div { position: absolute; inset: 0; opacity: 0; }
        .testimonial-rotator > div:nth-child(1) { animation: rotateQuotes 16s infinite; }
        .testimonial-rotator > div:nth-child(2) { animation: rotateQuotes 16s infinite 4s; }
        .testimonial-rotator > div:nth-child(3) { animation: rotateQuotes 16s infinite 8s; }
        .testimonial-rotator > div:nth-child(4) { animation: rotateQuotes 16s infinite 12s; }
      `}</style>
    </>
  );
}
