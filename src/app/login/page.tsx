"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth/AuthContext";

export default function LoginPage() {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.email) newErrors.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = "Email is invalid";

    if (!formData.password) newErrors.password = "Password is required";
    else if (formData.password.length < 6) newErrors.password = "Password must be at least 6 characters";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsLoading(true);

    try {
      await login(formData.email, formData.password);
      // small delay to ensure auth cookie writes before redirect
      setTimeout(() => {
        window.location.replace("/dashboard");
      }, 800);
    } catch (error) {
      setErrors({ general: error instanceof Error ? error.message : "Invalid email or password" });
      setIsLoading(false);
    }
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
          <Link href="/" className="inline-flex items-center group">
            <div className="relative h-16 w-auto">
              <img 
                src="/opmLogo.svg" 
                alt="OPM Gear" 
                className="h-16 w-auto object-contain filter drop-shadow-[0_0_15px_rgba(132,204,22,0.4)]"
              />
            </div>
          </Link>
          <h1 className="mt-6 text-3xl font-semibold tracking-tight text-white">Sign in to your account</h1>
          <p className="mt-2 text-sm text-slate-400">
            Or {" "}
            <Link href="/register" className="font-medium text-orange-300 hover:text-orange-200 underline underline-offset-4">
              create a new account
            </Link>
          </p>
        </div>

        {/* Card */}
        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="rounded-2xl bg-white/5 border border-white/10 p-6 md:p-8 backdrop-blur-xl shadow-[0_0_0_1px_rgba(255,255,255,0.06)] ring-1 ring-white/5 reveal" style={{ ['--delay' as any]: '.05s' }}>
            <form className="space-y-5" onSubmit={handleSubmit} noValidate>
              {errors.general && (
                <div className="rounded-xl bg-red-500/10 border border-red-400/30 text-red-300 px-4 py-3 text-sm">
                  <strong className="font-semibold">Login Error:</strong> <span className="ml-1">{errors.general}</span>
                </div>
              )}

              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm text-slate-300">
                  Email address
                </label>
                <div className="mt-1">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="you@domain.com"
                    className={`${inputBase} ${errors.email ? "border-red-400/60 focus:ring-red-400/60" : ""}`}
                  />
                  {errors.email && <p className="mt-1 text-sm text-red-400">{errors.email}</p>}
                </div>
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="block text-sm text-slate-300">
                  Password
                </label>
                <div className="mt-1 relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Enter your password"
                    className={`${inputBase} pr-10 ${errors.password ? "border-red-400/60 focus:ring-red-400/60" : ""}`}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2 2l20 20" />
                        <path d="M10.58 10.58a3 3 0 0 0 4.24 4.24" />
                        <path d="M16.24 16.24A9.88 9.88 0 0 1 12 18c-5 0-9-4-10-6 0 0 2.18-3.27 5.64-5.16" />
                        <path d="M9.88 5.06A10.94 10.94 0 0 1 12 4c5 0 9 4 10 6a18.76 18.76 0 0 1-1.64 2.88" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="3" />
                        <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z" />
                      </svg>
                    )}
                  </button>
                  {errors.password && <p className="mt-1 text-sm text-red-400">{errors.password}</p>}
                </div>
              </div>

              {/* Row: remember + forgot */}
              <div className="flex items-center justify-between">
                <label className="inline-flex items-center gap-2 text-sm text-slate-300">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    className="h-4 w-4 rounded border-white/20 bg-black/30 text-lime-400 focus:ring-lime-400/60"
                  />
                  Remember me
                </label>
                <Link href="/forgot-password" className="text-sm text-lime-300 hover:text-white">
                  Forgot your password?
                </Link>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-lime-400 text-black px-4 py-2.5 font-medium shadow-[0_10px_40px_-10px_rgba(132,204,22,0.6)] hover:-translate-y-0.5 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-30" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-70" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Signing in...
                  </>
                ) : (
                  <>Sign in</>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="w-full border-t border-white/10" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-[rgba(4,6,12,0.6)] text-slate-400">Or continue with</span>
                </div>
              </div>

              {/* Social auth buttons */}
              <div className="mt-6 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  className="w-full inline-flex justify-center items-center gap-2 py-2.5 px-4 rounded-xl bg-white/5 border border-white/10 text-sm text-slate-200 hover:border-lime-300/40 hover:text-lime-300 transition"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Google
                </button>

                <button
                  type="button"
                  className="w-full inline-flex justify-center items-center gap-2 py-2.5 px-4 rounded-xl bg-white/5 border border-white/10 text-sm text-slate-200 hover:border-orange-300/40 hover:text-orange-300 transition"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12S0 5.446 0 12.073C0 18.062 4.388 23.027 10.125 23.928V15.543H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                  Facebook
                </button>
              </div>
            </div>

            <p className="mt-6 text-center text-xs text-slate-500">
              By continuing you agree to our {" "}
              <Link href="/terms" className="text-slate-400 hover:text-white underline underline-offset-4">Terms</Link> and {" "}
              <Link href="/privacy" className="text-slate-400 hover:text-white underline underline-offset-4">Privacy Policy</Link>.
            </p>
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
