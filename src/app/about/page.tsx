'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function AboutPage() {
 const [isVisible, setIsVisible] = useState(false);

 useEffect(() => {
  setIsVisible(true);
 }, []);

 const stats = [
  { number: '5M', label: 'Hats Goal', description: 'Within 5 years' },
  { number: '100%', label: 'Customizable', description: 'Every detail' },
  { number: '50+', label: 'Thread Colors', description: 'Neon, metallic & tonal' },
  { number: '10+', label: 'Fabric Types', description: 'From chino to performance' }
 ];

 const shippingOptions = [
  {
   title: 'Priority Shipping',
   duration: '4–6 Days',
   description: 'Direct-to-door express delivery using FedEx or other premium services.',
   features: ['Fastest Delivery', 'Ideal for urgent orders', 'Higher cost tier'],
   color: 'from-red-500 to-pink-500'
  },
  {
   title: 'Default Shipping',
   duration: '6–10 Days',
   description: 'Delivered by UPS or equivalent express carriers.',
   features: ['Standard Express', 'Automatically selected', 'More affordable'],
   color: 'from-blue-500 to-cyan-500'
  },
  {
   title: 'Freight Shipping',
   duration: '15–20 Days',
   description: 'Goods are shipped to the destination port via freight.',
   features: ['Air or Sea', 'Efficient for bulk orders', 'Moderate cost'],
   color: 'from-green-500 to-emerald-500'
  },
  {
   title: 'Sea Shipping',
   duration: 'Up to ~2 Months',
   description: 'Ideal for large volume orders with flexible timelines.',
   features: ['Economy option', 'Lowest cost', 'Longest timeline'],
   color: 'from-purple-500 to-indigo-500'
  }
 ];

 return (
  <div className="relative min-h-screen overflow-x-hidden text-slate-200">
   {/* Background: leveraging site-wide background with accent glows */}
   <div className="pointer-events-none absolute inset-0 -z-10">
    <div className="absolute inset-0 bg-black/10" />
    <div className="absolute inset-x-0 top-0 h-[40vh] bg-[radial-gradient(60%_30%_at_50%_0%,rgba(255,255,255,0.06),transparent)]" />
    <div className="absolute -top-10 -left-20 h-80 w-80 rounded-full bg-lime-400/10 blur-3xl" />
    <div className="absolute top-40 -right-24 h-96 w-96 rounded-full bg-orange-400/10 blur-3xl" />
    <div className="absolute bottom-0 left-1/3 h-96 w-96 -translate-x-1/2 rounded-full bg-purple-500/10 blur-3xl" />
   </div>

   <main className="mx-auto max-w-[1800px] px-6 md:px-10">
    {/* Hero Section */}
    <section className="relative pt-16 md:pt-24 lg:pt-28 pb-20">
     <div className="text-center">
      <div className={`transition-all duration-1000 ${
       isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
      }`}>
       <div className="rounded-3xl border border-stone-600/50 bg-stone-900/60 backdrop-blur-2xl ring-1 ring-stone-700/50 p-12 shadow-2xl">
        <h1 className="text-6xl md:text-7xl font-bold text-white mb-6 bg-gradient-to-r from-lime-400 to-orange-400 bg-clip-text text-transparent">
         About US Custom Caps
        </h1>
        <p className="text-xl md:text-2xl text-slate-300 max-w-4xl mx-auto leading-relaxed">
         Reimagining Custom Gear for the Next Generation
        </p>
       </div>
      </div>
     </div>
    </section>

    {/* Vision Section */}
    <section className="py-20">
     <div className="grid lg:grid-cols-2 gap-12 items-center">
      <div className="rounded-3xl border border-stone-600/50 bg-stone-900/60 backdrop-blur-xl ring-1 ring-stone-700/50 p-8 shadow-xl">
       <h2 className="text-4xl font-bold text-white mb-6">Our Vision</h2>
       <p className="text-lg text-slate-300 leading-relaxed mb-6">
        At US Custom Caps, our vision is to redefine how athletic programs and communities build identity, generate revenue, and foster connection—starting with a cap. We believe custom gear should do more than complete a uniform; it should empower teams to fund their future and fuel long-term impact.
       </p>
       <p className="text-lg text-slate-300 leading-relaxed mb-6">
        We envision a world where every school, club, and organization—regardless of size or budget—can access fully branded, retail-grade headwear without relying on traditional manufacturers or inflated markups.
       </p>
       <p className="text-lg text-slate-300 leading-relaxed">
        We&apos;re not just building caps—we&apos;re building a platform for ownership, equity, and pride in every stitch.
       </p>
      </div>
      
      <div className="grid grid-cols-2 gap-6">
       {stats.map((stat, index) => (
        <div
         key={index}
         className="rounded-2xl border border-stone-600/50 bg-stone-900/60 backdrop-blur-xl ring-1 ring-stone-700/50 p-6 text-center hover:bg-stone-800/70 transition-all duration-300"
        >
         <div className="text-3xl font-bold text-lime-400 mb-2">{stat.number}</div>
         <div className="text-lg font-semibold text-white mb-1">{stat.label}</div>
         <div className="text-sm text-slate-400">{stat.description}</div>
        </div>
       ))}
      </div>
     </div>
    </section>

    {/* Impact Section */}
    <section className="py-20">
     <div className="text-center mb-16">
      <h2 className="text-5xl font-bold text-white mb-6">Our Impact</h2>
      <div className="w-24 h-1 bg-gradient-to-r from-lime-400 to-orange-400 mx-auto rounded-full"></div>
     </div>
     
     <div className="rounded-3xl border border-stone-600/50 bg-stone-900/60 backdrop-blur-2xl ring-1 ring-stone-700/50 p-12 shadow-2xl">
      <h3 className="text-3xl font-bold text-white mb-8 text-center">
       Every Cap Sold Supports the Future of Youth Sports
      </h3>
      <div className="grid md:grid-cols-2 gap-8">
       <div>
        <p className="text-lg text-slate-300 leading-relaxed mb-6">
         At US Custom Caps, impact isn&apos;t an afterthought — it&apos;s built into every stitch. Each cap sold helps bridge the financial gap for athletic programs by reinvesting a portion of every sale directly back into the schools, teams, and organizations behind the design.
        </p>
        <p className="text-lg text-slate-300 leading-relaxed">
         Whether you&apos;re a coach outfitting a roster, a student launching a team fundraiser, or a parent supporting your child&apos;s passion, your purchase contributes to more than just gear — it funds travel, uniforms, tournament fees, and essential resources.
        </p>
       </div>
       <div className="space-y-6">
        <div className="flex items-center space-x-4">
         <div className="w-12 h-12 bg-gradient-to-r from-lime-400 to-lime-500 rounded-full flex items-center justify-center">
          <span className="text-black text-xl">💰</span>
         </div>
         <div>
          <h4 className="font-semibold text-white">Fundraising Engine</h4>
          <p className="text-slate-400">Turn custom headwear into revenue</p>
         </div>
        </div>
        <div className="flex items-center space-x-4">
         <div className="w-12 h-12 bg-gradient-to-r from-orange-400 to-orange-500 rounded-full flex items-center justify-center">
          <span className="text-black text-xl">🏃</span>
         </div>
         <div>
          <h4 className="font-semibold text-white">Youth Sports Support</h4>
          <p className="text-slate-400">Lower costs for young athletes</p>
         </div>
        </div>
        <div className="flex items-center space-x-4">
         <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full flex items-center justify-center">
          <span className="text-white text-xl">🤝</span>
         </div>
         <div>
          <h4 className="font-semibold text-white">Community Building</h4>
          <p className="text-slate-400">Strengthen team connections</p>
         </div>
        </div>
       </div>
      </div>
     </div>
    </section>

    {/* Shipping Options */}
    <section className="py-20">
     <div className="text-center mb-16">
      <h2 className="text-5xl font-bold text-white mb-6">Choose the Right Speed for Your Needs</h2>
      <div className="w-24 h-1 bg-gradient-to-r from-lime-400 to-orange-400 mx-auto rounded-full"></div>
     </div>
     
     <div className="grid md:grid-cols-2 gap-8">
      {shippingOptions.map((option, index) => (
       <div
        key={index}
        className="rounded-2xl border border-stone-600/50 bg-stone-900/60 backdrop-blur-xl ring-1 ring-stone-700/50 p-8 shadow-lg hover:bg-stone-800/70 transition-all duration-300 transform hover:-translate-y-2"
       >
        <div className={`w-16 h-16 bg-gradient-to-r ${option.color} rounded-2xl flex items-center justify-center mb-6`}>
         <span className="text-white text-2xl font-bold">{index + 1}</span>
        </div>
        <h3 className="text-2xl font-bold text-white mb-2">{option.title}</h3>
        <div className="text-3xl font-bold text-lime-400 mb-4">{option.duration}</div>
        <p className="text-slate-300 mb-6">{option.description}</p>
        <ul className="space-y-2">
         {option.features.map((feature, featureIndex) => (
          <li key={featureIndex} className="flex items-center text-slate-400">
           <div className="w-2 h-2 bg-lime-400 rounded-full mr-3"></div>
           {feature}
          </li>
         ))}
        </ul>
       </div>
      ))}
     </div>
    </section>

    {/* Fabric & Fit Section */}
    <section className="py-20">
     <div className="text-center mb-16">
      <h2 className="text-5xl font-bold text-white mb-6">Fit, Feel & Fabric</h2>
      <div className="w-24 h-1 bg-gradient-to-r from-lime-400 to-orange-400 mx-auto rounded-full"></div>
     </div>
     
     <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
      {[
       { name: 'Chino Twill', desc: 'Durable cotton with a clean, structured look' },
       { name: 'Cotton-Poly Blend', desc: 'Soft, breathable, and shape-retaining' },
       { name: 'Polyester', desc: 'Lightweight and ideal for athletic wear' },
       { name: 'Spandex Blend', desc: 'Adds stretch for fitted, flexible caps' },
       { name: 'Acrylic', desc: 'Crisp structure with bold, lasting color' },
       { name: 'Trucker Mesh', desc: 'Classic open mesh for max airflow' }
      ].map((fabric, index) => (
       <div
        key={index}
        className="rounded-2xl border border-stone-600/50 bg-stone-900/60 backdrop-blur-xl ring-1 ring-stone-700/50 p-6 shadow-lg hover:bg-stone-800/70 transition-all duration-300"
       >
        <h3 className="text-xl font-semibold text-white mb-3">{fabric.name}</h3>
        <p className="text-slate-300">{fabric.desc}</p>
       </div>
      ))}
     </div>
    </section>

    {/* CTA Section */}
    <section className="py-20">
     <div className="max-w-4xl mx-auto text-center">
      <div className="rounded-3xl border border-stone-600/50 bg-stone-900/60 backdrop-blur-2xl ring-1 ring-stone-700/50 p-12 shadow-2xl">
       <h2 className="text-4xl font-bold text-white mb-6">Ready to Make an Impact?</h2>
       <p className="text-xl text-slate-300 mb-8">
        Join us in empowering communities and supporting youth sports through custom headwear.
       </p>
       <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Link
         href="/customize"
         className="bg-lime-400 text-black px-8 py-4 rounded-full text-lg font-semibold hover:bg-lime-300 transition-all duration-300 transform hover:scale-105 shadow-[0_0_30px_rgba(163,230,53,0.25)]"
        >
         Start Customizing
        </Link>
        <Link
         href="/store"
         className="border border-stone-600 bg-stone-700 text-white px-8 py-4 rounded-full text-lg font-semibold hover:bg-stone-800/70 transition-all duration-300"
        >
         Browse Store
        </Link>
       </div>
      </div>
     </div>
    </section>
   </main>
  </div>
 );
}
