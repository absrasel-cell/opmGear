"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth/AuthContext";
import { useRouter } from "next/navigation";

export default function LogoutPage() {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutComplete, setLogoutComplete] = useState(false);
  const { logout, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // If no user is logged in, redirect to login
    if (!user) {
      router.push('/login');
      return;
    }

    // Auto-logout after a brief delay
    const performLogout = async () => {
      setIsLoggingOut(true);
      try {
        await logout();
        setLogoutComplete(true);
        // Redirect to login after showing success message
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      } catch (error) {
        console.error('Logout error:', error);
        // Still redirect even if there's an error
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      }
    };

    const timer = setTimeout(performLogout, 1000);
    return () => clearTimeout(timer);
  }, [logout, user, router]);

  const handleCancelLogout = () => {
    router.push('/dashboard');
  };

  const inputBase =
    "mt-2 w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-lime-400/60";

  return (
    <div className="relative min-h-screen text-slate-200">
      {/* Background Glows (match site style) */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute -top-24 -left-24 h-[480px] w-[480px] rounded-full bg-lime-400/15 blur-[120px]" />
        <div className="absolute top-1/3 -right-24 h-[520px] w-[520px] rounded-full bg-purple-500/15 blur-[120px]" />
        <div className="absolute bottom-0 left-1/3 h-[420px] w-[420px] rounded-full bg-orange-500/15 blur-[120px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(255,255,255,0.035),_transparent_60%)]" />
      </div>

      <div className="max-w-[1800px] mx-auto px-6 md:px-10 pt-32 pb-16 flex flex-col items-center justify-center min-h-screen">
        {/* Header brand (centered) */}
        <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
          <Link href="/" className="inline-flex items-center gap-3 group">
            <span className="h-10 w-10 rounded-xl bg-gradient-to-br from-lime-400/80 to-orange-400/80 grid place-items-center ring-1 ring-white/20 shadow-[0_0_40px_rgba(132,204,22,0.35)] text-black font-semibold">
              OPM
            </span>
            <span className="text-white font-extrabold tracking-wide text-2xl">OPM Gear</span>
          </Link>
          <h1 className="mt-6 text-3xl font-semibold tracking-tight text-white">
            {logoutComplete ? "Signed out successfully" : "Signing out..."}
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            {logoutComplete 
              ? "You have been successfully signed out of your account."
              : "Please wait while we sign you out of your account."
            }
          </p>
        </div>

        {/* Card */}
        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="rounded-2xl bg-white/5 border border-white/10 p-6 md:p-8 backdrop-blur-xl shadow-[0_0_0_1px_rgba(255,255,255,0.06)] ring-1 ring-white/5 reveal" style={{ ['--delay' as any]: '.05s' }}>
            
            {!logoutComplete ? (
              <div className="space-y-6">
                {/* User Info */}
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-lime-400/20 to-orange-400/20 border border-white/10 flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-lime-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-white">{user?.name || 'User'}</h3>
                  <p className="text-sm text-slate-400">{user?.email}</p>
                </div>

                {/* Loading Animation */}
                <div className="text-center">
                  <div className="inline-flex items-center gap-3">
                    <svg className="animate-spin h-5 w-5 text-lime-400" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-30" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-70" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span className="text-slate-300">Signing out...</span>
                  </div>
                </div>

                {/* Cancel Button */}
                <button
                  onClick={handleCancelLogout}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-white/5 border border-white/10 text-white px-4 py-2.5 font-medium hover:bg-white/10 transition"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Success Icon */}
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto rounded-full bg-green-500/20 border border-green-400/30 flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20,6 9,17 4,12" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-white">Successfully signed out</h3>
                  <p className="text-sm text-slate-400">Redirecting to login page...</p>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                  <Link
                    href="/login"
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-lime-400 text-black px-4 py-2.5 font-medium shadow-[0_10px_40px_-10px_rgba(132,204,22,0.6)] hover:-translate-y-0.5 transition"
                  >
                    Sign in again
                  </Link>
                  <Link
                    href="/"
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-white/5 border border-white/10 text-white px-4 py-2.5 font-medium hover:bg-white/10 transition"
                  >
                    Go to homepage
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Page-local animations to match Home */}
      <style jsx global>{`
        @keyframes fadeInUp { 0% { opacity: 0; transform: translateY(16px) scale(0.98); filter: blur(6px); } 100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); } }
        .reveal { opacity: 0; animation: fadeInUp 0.9s ease-out forwards; animation-delay: var(--delay, 0s); }
      `}</style>
    </div>
  );
}
