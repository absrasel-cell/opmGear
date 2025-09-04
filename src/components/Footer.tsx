import React from "react";

export default function Footer() {
  return (
    <footer className="relative glass-footer rounded-3xl border-t border-white/20 max-w-[1850px] mx-auto">
      <div className="rounded-3xl px-6 pt-16 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          <div className="lg:col-span-1">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-orange-600 to-red-600 flex items-center justify-center shadow-lg">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-white" style={{ strokeWidth: 1.5 }}>
                  <path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"></path>
                </svg>
              </div>
              <span className="font-semibold text-xl tracking-tight text-white font-sans">US Custom Cap</span>
            </div>
            <p className="text-stone-400 mb-6 leading-relaxed font-sans">
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
            <h3 className="text-white font-semibold mb-6 tracking-tight font-sans">Products</h3>
            <ul className="space-y-4">
              <li><a href="/customize/baseball-cap" className="text-stone-400 hover:text-white transition-colors font-sans">6-Panel Caps</a></li>
              <li><a href="/customize/baseball-cap" className="text-stone-400 hover:text-white transition-colors font-sans">FlatBill Caps</a></li>
              <li><a href="/customize/baseball-cap" className="text-stone-400 hover:text-white transition-colors font-sans">Bucket Hats</a></li>
              <li><a href="/customize/baseball-cap" className="text-stone-400 hover:text-white transition-colors font-sans">Visor Caps</a></li>
              <li><a href="/customize/baseball-cap" className="text-stone-400 hover:text-white transition-colors font-sans">Sandwich Caps</a></li>
              <li><a href="/customize/baseball-cap" className="text-stone-400 hover:text-white transition-colors font-sans">Curved Bill Caps</a></li>
            </ul>
          </div>

          <div className="">
            <h3 className="text-white font-semibold mb-6 tracking-tight font-sans">Services</h3>
            <ul className="space-y-4">
              <li><a href="/customize/baseball-cap" className="text-stone-400 hover:text-white transition-colors font-sans">Custom Embroidery</a></li>
              <li><a href="/quote-request" className="text-stone-400 hover:text-white transition-colors font-sans">Bulk Orders</a></li>
              <li><a href="/quote-request" className="text-stone-400 hover:text-white transition-colors font-sans">Logo Design</a></li>
              <li><a href="/customize/baseball-cap" className="text-stone-400 hover:text-white transition-colors font-sans">Heat Transfer</a></li>
              <li><a href="/quote-request" className="text-stone-400 hover:text-white transition-colors font-sans">Corporate Branding</a></li>
              <li><a href="/quote-request" className="text-stone-400 hover:text-white transition-colors font-sans">Team Uniforms</a></li>
            </ul>
          </div>

          <div className="">
            <h3 className="text-white font-semibold mb-6 tracking-tight font-sans">Support</h3>
            <ul className="space-y-4 mb-6">
              <li><a href="/messages" className="text-stone-400 hover:text-white transition-colors font-sans">Help Center</a></li>
              <li><a href="/messages" className="text-stone-400 hover:text-white transition-colors font-sans">Contact Support</a></li>
              <li><a href="/quote-request" className="text-stone-400 hover:text-white transition-colors font-sans">Get Quote</a></li>
              <li><a href="/cart" className="text-stone-400 hover:text-white transition-colors font-sans">Order Tracking</a></li>
              <li><a href="/messages" className="text-stone-400 hover:text-white transition-colors font-sans">Technical Help</a></li>
            </ul>
            <div className="flex items-center gap-2 text-sm text-stone-400">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-400">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
              </svg>
              <span className="font-sans">24/7 Support Available</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
