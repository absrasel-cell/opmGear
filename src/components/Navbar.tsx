"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthContext";
import CartIcon from "@/components/cart/CartIcon";

// Keep your existing menu structure (routes can be swapped later)
const NAV_ITEMS = [
  { href: "/", label: "Home" },
  { href: "/store", label: "Store" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
] as const;

export default function Navbar() {
  const { user } = useAuth();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [userOpen, setUserOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 6);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    // Close menus when route changes
    setOpen(false);
    setUserOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-4 z-50">
      {/* Glass shell */}
      <div
        className={`mx-3 rounded-2xl transition-all duration-300 ${
          scrolled
            ? "backdrop-blur-xl bg-white/5 border border-white/10 shadow-[0_10px_40px_-10px_rgba(132,204,22,0.25)] ring-1 ring-white/5"
            : "backdrop-blur-md bg-white/5 border border-white/10"
        }`}
      >
        <nav className="max-w-[1800px] mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          {/* Left: Brand */}
          <div className="flex items-center">
            <Link href="/" className="group flex items-center">
              <div className="relative h-14 w-auto">
                <img 
                  src="/opmLogo.svg" 
                  alt="OPM Gear" 
                  className="h-14 w-auto object-contain filter drop-shadow-[0_0_8px_rgba(132,204,22,0.35)] hover:drop-shadow-[0_0_12px_rgba(132,204,22,0.5)] transition-all duration-300"
                />
              </div>
            </Link>
          </div>

          {/* Center: Desktop Nav */}
          <ul className="hidden lg:flex items-center gap-6">
            {NAV_ITEMS.map((item, i) => {
              const active = item.href === "/" ? pathname === "/" : pathname?.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    prefetch={false}
                    className={`px-3 py-2 rounded-lg transition group border border-transparent ${
                      active
                        ? "text-white bg-white/10 border-white/15"
                        : "text-slate-300 hover:text-white hover:bg-white/5"
                    }`}
                    title={item.label}
                  >
                    <span
                      className={`tracking-tight font-bold uppercase drop-shadow-lg ${
                        active 
                          ? "text-white [text-shadow:_0_1px_8px_rgba(0,0,0,0.8),_0_1px_2px_rgba(255,255,255,0.3)]"
                          : `text-slate-300 [text-shadow:_0_1px_4px_rgba(0,0,0,0.6)] ${
                              i % 2 === 0 ? "group-hover:text-lime-300 group-hover:[text-shadow:_0_1px_8px_rgba(0,0,0,0.8),_0_0_20px_rgba(132,204,22,0.4)]" : "group-hover:text-orange-300 group-hover:[text-shadow:_0_1px_8px_rgba(0,0,0,0.8),_0_0_20px_rgba(251,146,60,0.4)]"
                            }`
                      }`}
                    >
                      {item.label}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            

            {/* Cart */}
            <Link
              href="/cart"
              className="relative grid place-items-center h-10 w-10 rounded-xl bg-white/5 border border-white/10 hover:border-lime-300/40 hover:text-lime-300 transition"
              aria-label="Cart"
            >
              <CartIcon renderAsLink={false} />
            </Link>

            {/* If not logged in */}
            {!user && (
              <div className="hidden sm:flex items-center gap-2">
                <Link href="/login" className="rounded-xl px-3 py-2 bg-white/5 border border-white/10 hover:text-orange-300 hover:border-orange-300/40 transition">
                  Login
                </Link>
                <Link href="/register" className="rounded-xl px-3 py-2 bg-orange-400 text-black font-medium hover:-translate-y-0.5 transition">
                  Sign Up
                </Link>
              </div>
            )}

            {/* If logged in: simple user menu */}
            {user && (
              <div className="relative hidden sm:block">
                <button
                  onClick={() => setUserOpen((v) => !v)}
                  className="relative grid place-items-center h-10 w-10 rounded-xl bg-white/5 border border-white/10 hover:border-lime-300/40 hover:text-lime-300 transition"
                  aria-haspopup="menu"
                  aria-expanded={userOpen}
                  aria-label="Account"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <circle cx="12" cy="10" r="3" />
                    <path d="M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662" />
                  </svg>
                </button>
                {userOpen && (
                  <div className="absolute right-0 mt-2 w-48 rounded-xl border border-white/10 bg-black/60 backdrop-blur-xl shadow-lg p-2 text-sm">
                    <Link href="/dashboard" className="block px-3 py-2 rounded-lg hover:bg-white/5 font-medium [text-shadow:_0_1px_4px_rgba(0,0,0,0.6)]">Dashboard</Link>
                    <Link href="/messages" className="block px-3 py-2 rounded-lg hover:bg-white/5 font-medium [text-shadow:_0_1px_4px_rgba(0,0,0,0.6)]">Messages</Link>
                    <button onClick={() => { window.location.href = '/api/auth/signout'; }} className="block w-full text-left px-3 py-2 rounded-lg hover:bg-white/5 text-red-300 font-medium [text-shadow:_0_1px_4px_rgba(0,0,0,0.6)]">Sign out</button>
                  </div>
                )}
              </div>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setOpen((v) => !v)}
              className="inline-flex lg:hidden items-center justify-center rounded-xl px-3 py-2 bg-white/5 border border-white/10 hover:border-lime-300/30 hover:text-lime-300 transition"
              aria-label="Open menu"
              aria-expanded={open}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12h16" /><path d="M4 18h16" /><path d="M4 6h16" /></svg>
            </button>
          </div>
        </nav>
      </div>

      {/* Mobile Drawer */}
      <div
        className={`lg:hidden fixed inset-0 z-[49] ${open ? "pointer-events-auto" : "pointer-events-none"}`}
        aria-hidden={!open}
      >
        {/* Backdrop */}
        <div
          className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0"}`}
          onClick={() => setOpen(false)}
        />

        {/* Panel */}
        <div
          className={`absolute top-0 right-0 h-full w-[86%] max-w-sm bg-[rgba(7,10,17,0.95)] border-l border-white/10 shadow-2xl transition-transform duration-300 ${
            open ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="p-4 flex items-center justify-between border-b border-white/10">
            <div className="flex items-center h-12">
              <div className="relative h-[95%] w-auto">
                <img 
                  src="/opmLogo.svg" 
                  alt="OPM Gear" 
                  className="h-full w-auto object-contain filter drop-shadow-[0_0_8px_rgba(132,204,22,0.35)]"
                />
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="inline-flex items-center justify-center h-9 w-9 rounded-lg bg-white/5 border border-white/10 hover:text-orange-300 hover:border-orange-300/40"
              aria-label="Close menu"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
            </button>
          </div>

          <div className="p-3">
            <ul className="space-y-1">
              {NAV_ITEMS.map((item, i) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    prefetch={false}
                    className={`flex items-center justify-between px-3 py-3 rounded-xl border transition ${
                      pathname?.startsWith(item.href)
                        ? "bg-white/10 border-white/15 text-white"
                        : "bg-white/[0.03] border-white/10 text-slate-300 hover:bg-white/5 hover:text-white"
                    }`}
                    onClick={() => setOpen(false)}
                  >
                    <span className={`font-bold uppercase ${
                      pathname?.startsWith(item.href)
                        ? "[text-shadow:_0_1px_8px_rgba(0,0,0,0.8),_0_1px_2px_rgba(255,255,255,0.3)]"
                        : "[text-shadow:_0_1px_4px_rgba(0,0,0,0.6)]"
                    }`}>{item.label}</span>
                    <span className={`h-2 w-2 rounded-full ${
                      i % 2 === 0 ? "bg-lime-300/80" : "bg-orange-300/80"
                    }`} />
                  </Link>
                </li>
              ))}
            </ul>

            <div className="mt-4">
              <Link href="/store" className="block rounded-xl px-3 py-3 text-center bg-lime-400 text-black font-medium">Catalog</Link>
            </div>

            <div className="mt-4 border-t border-white/10 pt-3">
              {!user ? (
                <div className="grid gap-2">
                  <Link href="/login" className="px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white text-center">Login</Link>
                  <Link href="/register" className="px-4 py-3 rounded-2xl bg-orange-400 text-black text-center font-medium">Sign Up</Link>
                </div>
              ) : (
                <div className="grid gap-2 text-sm">
                  <Link href="/dashboard" className="px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white">Dashboard</Link>
                  <Link href="/messages" className="px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white">Messages</Link>
                  <button onClick={() => { window.location.href = '/api/auth/signout'; }} className="w-full text-left px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-red-300">Sign out</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
