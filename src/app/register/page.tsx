"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  type AccountType = "Member" | "Wholesale" | "Supplier";

  const [accountType, setAccountType] = useState<AccountType>("Member");
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    agreeToTerms: false,

    // Wholesale fields
    wholesale_interestedProducts: "",
    wholesale_businessType: "",
    wholesale_companyName: "",
    wholesale_estAnnualPurchase: "",
    wholesale_website: "",
    wholesale_taxId: "",

    // Supplier (Factory/Manufacturer) fields
    supplier_factoryName: "",
    supplier_location: "",
    supplier_productCategories: "",
    supplier_website: "",
    supplier_monthlyCapacity: "",
    supplier_certifications: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type, checked } = e.target as HTMLInputElement;
    setFormData((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName.trim()) newErrors.firstName = "First name is required";
    if (!formData.lastName.trim()) newErrors.lastName = "Last name is required";

    if (!formData.email) newErrors.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = "Email is invalid";

    if (!formData.password) newErrors.password = "Password is required";
    else if (formData.password.length < 8) newErrors.password = "Password must be at least 8 characters";

    if (!formData.confirmPassword) newErrors.confirmPassword = "Please confirm your password";
    else if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = "Passwords do not match";

    if (!formData.agreeToTerms) newErrors.agreeToTerms = "Please confirm that you agree to the Terms and Privacy Policy";

    // Conditional requirements
    if (accountType === "Wholesale") {
      if (!formData.wholesale_companyName.trim()) newErrors.wholesale_companyName = "Company legal name is required";
      if (!formData.wholesale_businessType.trim()) newErrors.wholesale_businessType = "Please specify your business type";
      if (!formData.wholesale_interestedProducts.trim()) newErrors.wholesale_interestedProducts = "Please indicate the product categories of interest";
      if (!formData.wholesale_estAnnualPurchase.trim()) newErrors.wholesale_estAnnualPurchase = "Please estimate your annual purchasing volume";
    }

    if (accountType === "Supplier") {
      if (!formData.supplier_factoryName.trim()) newErrors.supplier_factoryName = "Factory / Manufacturer name is required";
      if (!formData.supplier_location.trim()) newErrors.supplier_location = "Please provide the primary factory location";
      if (!formData.supplier_productCategories.trim()) newErrors.supplier_productCategories = "Please describe the primary product categories you produce";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);

    try {
      // --- Keep existing account creation call UNCHANGED ---
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          name: `${formData.firstName} ${formData.lastName}`.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Registration failed");

      // Fire-and-forget: submit intake details separately (optional backend)
      fetch("/api/intake/account-details", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          accountType,
          wholesale: {
            interestedProducts: formData.wholesale_interestedProducts,
            businessType: formData.wholesale_businessType,
            companyName: formData.wholesale_companyName,
            estAnnualPurchase: formData.wholesale_estAnnualPurchase,
            website: formData.wholesale_website,
            taxId: formData.wholesale_taxId,
          },
          supplier: {
            factoryName: formData.supplier_factoryName,
            location: formData.supplier_location,
            productCategories: formData.supplier_productCategories,
            website: formData.supplier_website,
            monthlyCapacity: formData.supplier_monthlyCapacity,
            certifications: formData.supplier_certifications,
          },
        }),
      }).catch(() => {});

      // Redirect after success
      router.push("/dashboard");
    } catch (error) {
      setErrors({ general: error instanceof Error ? error.message : "Registration failed. Please try again." });
      setIsLoading(false);
    }
  };

  const inputBase =
    "mt-2 w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-lime-400/60";

  return (
    <div className="relative min-h-screen text-slate-200">
      {/* Background: cap store image for register page */}
      <div className="pointer-events-none fixed inset-0 -z-20">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: 'url(/uploads/cap-store-bg.jpg)' }}
        />
        <div className="absolute inset-0 bg-black/70" />
      </div>
      
      <style jsx>{`
        html {
          background: #000 !important;
        }
      `}</style>

      <div className="min-h-screen flex items-center justify-center px-6 md:px-10 py-12">
        <div className="w-full max-w-2xl">
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center group">
              <div className="relative h-16 w-auto">
                <img 
                  src="/opmLogo.svg" 
                  alt="OPM Gear" 
                  className="h-16 w-auto object-contain filter drop-shadow-[0_0_15px_rgba(132,204,22,0.4)]"
                />
              </div>
            </Link>
            <h1 className="mt-6 text-3xl font-semibold tracking-tight text-white">Create your account</h1>
            <p className="mt-2 text-sm text-slate-400">
              Already have an account?{" "}
              <Link href="/login" className="font-medium text-lime-300 hover:text-white underline underline-offset-4">Sign in</Link>
            </p>
          </div>

          <div className="w-full">
          <div className="rounded-2xl bg-white/5 border border-white/10 p-6 md:p-8 backdrop-blur-xl ring-1 ring-white/5 shadow-[0_0_0_1px_rgba(255,255,255,0.06)] reveal" style={{ ['--delay' as string]: '.05s' }}>
            <form className="space-y-6" onSubmit={handleSubmit} noValidate>
              {errors.general && (
                <div className="rounded-xl bg-red-500/10 border border-red-400/30 text-red-300 px-4 py-3 text-sm">{errors.general}</div>
              )}

              {/* Account Type */}
              <div>
                <label className="block text-sm text-slate-300 mb-4">Account type</label>
                <div className="grid grid-cols-1 gap-3" role="tablist" aria-label="Account type">
                  {(["Member", "Wholesale", "Supplier"] as AccountType[]).map((t) => (
                    <label key={t} className={`relative p-4 rounded-xl border cursor-pointer select-none transition-all duration-200 ${
                        accountType === t
                          ? t === "Wholesale"
                            ? "bg-orange-400/10 text-orange-300 border-orange-400/50 ring-1 ring-orange-400/30"
                            : t === "Supplier"
                            ? "bg-purple-500/10 text-purple-300 border-purple-500/50 ring-1 ring-purple-500/30"
                            : "bg-lime-400/10 text-lime-300 border-lime-400/50 ring-1 ring-lime-400/30"
                          : "bg-white/5 text-slate-300 border-white/10 hover:bg-white/10 hover:border-white/20"
                      }`}>
                      <input
                        type="radio"
                        name="accountType"
                        value={t}
                        className="sr-only"
                        checked={accountType === t}
                        onChange={() => setAccountType(t)}
                        aria-label={t}
                      />
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                            accountType === t
                              ? t === "Wholesale"
                                ? "border-orange-400 bg-orange-400"
                                : t === "Supplier"
                                ? "border-purple-500 bg-purple-500"
                                : "border-lime-400 bg-lime-400"
                              : "border-white/30"
                          }`}>
                            {accountType === t && (
                              <div className="w-2 h-2 rounded-full bg-white" />
                            )}
                          </div>
                          <div>
                            <div className="font-medium">
                              {t === "Supplier" ? "Supplier (Factory/Manufacturer)" : t}
                            </div>
                            <div className="text-xs text-slate-400 mt-1">
                              {t === "Member" && "Individual customer account"}
                              {t === "Wholesale" && "Business and reseller account"}
                              {t === "Supplier" && "Manufacturer and vendor account"}
                            </div>
                          </div>
                        </div>
                        {accountType === t && (
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                            t === "Wholesale"
                              ? "bg-orange-400 text-black"
                              : t === "Supplier"
                              ? "bg-purple-500 text-white"
                              : "bg-lime-400 text-black"
                          }`}>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
                <p className="mt-3 text-xs text-slate-500">
                  You may change your account preferences with our team at any time.
                </p>
              </div>

              {/* Name fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="firstName" className="block text-sm text-slate-300">First name</label>
                  <input 
                    id="firstName" 
                    name="firstName" 
                    type="text" 
                    autoComplete="given-name" 
                    required 
                    value={formData.firstName} 
                    onChange={handleChange} 
                    placeholder="e.g., Jordan" 
                    className={`${inputBase} ${errors.firstName ? "border-red-400/60 focus:ring-red-400/60" : ""}`} 
                  />
                  {errors.firstName && <p className="mt-1 text-sm text-red-400">{errors.firstName}</p>}
                </div>
                <div>
                  <label htmlFor="lastName" className="block text-sm text-slate-300">Last name</label>
                  <input 
                    id="lastName" 
                    name="lastName" 
                    type="text" 
                    autoComplete="family-name" 
                    required 
                    value={formData.lastName} 
                    onChange={handleChange} 
                    placeholder="e.g., Bennett" 
                    className={`${inputBase} ${errors.lastName ? "border-red-400/60 focus:ring-red-400/60" : ""}`} 
                  />
                  {errors.lastName && <p className="mt-1 text-sm text-red-400">{errors.lastName}</p>}
                </div>
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm text-slate-300">Email address</label>
                <input 
                  id="email" 
                  name="email" 
                  type="email" 
                  autoComplete="email" 
                  required 
                  value={formData.email} 
                  onChange={handleChange} 
                  placeholder="you@company.com" 
                  className={`${inputBase} ${errors.email ? "border-red-400/60 focus:ring-red-400/60" : ""}`} 
                />
                {errors.email && <p className="mt-1 text-sm text-red-400">{errors.email}</p>}
              </div>

              {/* Passwords */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="password" className="block text-sm text-slate-300">Password</label>
                  <div className="relative">
                    <input 
                      id="password" 
                      name="password" 
                      type={showPassword ? "text" : "password"} 
                      autoComplete="new-password" 
                      required 
                      value={formData.password} 
                      onChange={handleChange} 
                      placeholder="Create a strong password" 
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
                  </div>
                  {errors.password && <p className="mt-1 text-sm text-red-400">{errors.password}</p>}
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm text-slate-300">Confirm password</label>
                  <div className="relative">
                    <input 
                      id="confirmPassword" 
                      name="confirmPassword" 
                      type={showConfirmPassword ? "text" : "password"} 
                      autoComplete="new-password" 
                      required 
                      value={formData.confirmPassword} 
                      onChange={handleChange} 
                      placeholder="Re-enter your password" 
                      className={`${inputBase} pr-10 ${errors.confirmPassword ? "border-red-400/60 focus:ring-red-400/60" : ""}`} 
                    />
                    <button 
                      type="button" 
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white" 
                      onClick={() => setShowConfirmPassword((v) => !v)} 
                      aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                    >
                      {showConfirmPassword ? (
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
                  </div>
                  {errors.confirmPassword && <p className="mt-1 text-sm text-red-400">{errors.confirmPassword}</p>}
                </div>
              </div>

              {/* Conditional: WHOLESALE */}
              {accountType === "Wholesale" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-2xl bg-white/5 border border-white/10 p-4">
                  <div className="sm:col-span-2">
                    <p className="text-sm font-medium text-white/90">Wholesale details</p>
                    <p className="text-xs text-slate-500 mt-1">Kindly provide the following information so our team can assist you efficiently.</p>
                  </div>

                  <div className="sm:col-span-2">
                    <label htmlFor="wholesale_companyName" className="block text-sm text-slate-300">Company legal name</label>
                    <input 
                      id="wholesale_companyName" 
                      name="wholesale_companyName" 
                      value={formData.wholesale_companyName} 
                      onChange={handleChange} 
                      placeholder="e.g., Ridgeview Outfitters LLC" 
                      className={`${inputBase} ${errors.wholesale_companyName ? "border-red-400/60 focus:ring-red-400/60" : ""}`} 
                    />
                    {errors.wholesale_companyName && <p className="mt-1 text-sm text-red-400">{errors.wholesale_companyName}</p>}
                  </div>

                  <div>
                    <label htmlFor="wholesale_businessType" className="block text-sm text-slate-300">Business type</label>
                    <select 
                      id="wholesale_businessType" 
                      name="wholesale_businessType" 
                      value={formData.wholesale_businessType} 
                      onChange={handleChange} 
                      className={`${inputBase} ${errors.wholesale_businessType ? "border-red-400/60 focus:ring-red-400/60" : ""}`}
                    >
                      <option value="">Select…</option>
                      <option>Retailer</option>
                      <option>Team / Booster Club</option>
                      <option>Distributor</option>
                      <option>Agency</option>
                      <option>Other</option>
                    </select>
                    {errors.wholesale_businessType && <p className="mt-1 text-sm text-red-400">{errors.wholesale_businessType}</p>}
                  </div>

                  <div>
                    <label htmlFor="wholesale_interestedProducts" className="block text-sm text-slate-300">Product categories of interest</label>
                    <input 
                      id="wholesale_interestedProducts" 
                      name="wholesale_interestedProducts" 
                      value={formData.wholesale_interestedProducts} 
                      onChange={handleChange} 
                      placeholder="e.g., Snapbacks, Dad Hats, Trucker Caps" 
                      className={`${inputBase} ${errors.wholesale_interestedProducts ? "border-red-400/60 focus:ring-red-400/60" : ""}`} 
                    />
                    {errors.wholesale_interestedProducts && <p className="mt-1 text-sm text-red-400">{errors.wholesale_interestedProducts}</p>}
                  </div>

                  <div>
                    <label htmlFor="wholesale_estAnnualPurchase" className="block text-sm text-slate-300">Estimated annual purchase volume</label>
                    <input 
                      id="wholesale_estAnnualPurchase" 
                      name="wholesale_estAnnualPurchase" 
                      value={formData.wholesale_estAnnualPurchase} 
                      onChange={handleChange} 
                      placeholder="e.g., 5,000 units" 
                      className={`${inputBase} ${errors.wholesale_estAnnualPurchase ? "border-red-400/60 focus:ring-red-400/60" : ""}`} 
                    />
                    {errors.wholesale_estAnnualPurchase && <p className="mt-1 text-sm text-red-400">{errors.wholesale_estAnnualPurchase}</p>}
                  </div>

                  <div>
                    <label htmlFor="wholesale_taxId" className="block text-sm text-slate-300">Resale / Tax ID <span className="text-slate-500">(if applicable)</span></label>
                    <input 
                      id="wholesale_taxId" 
                      name="wholesale_taxId" 
                      value={formData.wholesale_taxId} 
                      onChange={handleChange} 
                      placeholder="Enter your permit/ID" 
                      className={inputBase} 
                    />
                  </div>

                  <div>
                    <label htmlFor="wholesale_website" className="block text-sm text-slate-300">Company website <span className="text-slate-500">(optional)</span></label>
                    <input 
                      id="wholesale_website" 
                      name="wholesale_website" 
                      value={formData.wholesale_website} 
                      onChange={handleChange} 
                      placeholder="https://example.com" 
                      className={inputBase} 
                    />
                  </div>
                </div>
              )}

              {/* Conditional: SUPPLIER */}
              {accountType === "Supplier" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-2xl bg-white/5 border border-white/10 p-4">
                  <div className="sm:col-span-2">
                    <p className="text-sm font-medium text-white/90">Factory / Manufacturer details</p>
                    <p className="text-xs text-slate-500 mt-1">Please provide accurate information to help us evaluate vendor onboarding.</p>
                  </div>

                  <div className="sm:col-span-2">
                    <label htmlFor="supplier_factoryName" className="block text-sm text-slate-300">Factory / Manufacturer name</label>
                    <input 
                      id="supplier_factoryName" 
                      name="supplier_factoryName" 
                      value={formData.supplier_factoryName} 
                      onChange={handleChange} 
                      placeholder="e.g., Apex Headwear Co." 
                      className={`${inputBase} ${errors.supplier_factoryName ? "border-red-400/60 focus:ring-red-400/60" : ""}`} 
                    />
                    {errors.supplier_factoryName && <p className="mt-1 text-sm text-red-400">{errors.supplier_factoryName}</p>}
                  </div>

                  <div>
                    <label htmlFor="supplier_location" className="block text-sm text-slate-300">Primary location (city, country)</label>
                    <input 
                      id="supplier_location" 
                      name="supplier_location" 
                      value={formData.supplier_location} 
                      onChange={handleChange} 
                      placeholder="e.g., Dhaka, Bangladesh" 
                      className={`${inputBase} ${errors.supplier_location ? "border-red-400/60 focus:ring-red-400/60" : ""}`} 
                    />
                    {errors.supplier_location && <p className="mt-1 text-sm text-red-400">{errors.supplier_location}</p>}
                  </div>

                  <div>
                    <label htmlFor="supplier_productCategories" className="block text-sm text-slate-300">Primary product categories</label>
                    <input 
                      id="supplier_productCategories" 
                      name="supplier_productCategories" 
                      value={formData.supplier_productCategories} 
                      onChange={handleChange} 
                      placeholder="e.g., Snapbacks, Performance Truckers, Beanies" 
                      className={`${inputBase} ${errors.supplier_productCategories ? "border-red-400/60 focus:ring-red-400/60" : ""}`} 
                    />
                    {errors.supplier_productCategories && <p className="mt-1 text-sm text-red-400">{errors.supplier_productCategories}</p>}
                  </div>

                  <div>
                    <label htmlFor="supplier_monthlyCapacity" className="block text-sm text-slate-300">Approx. monthly capacity <span className="text-slate-500">(optional)</span></label>
                    <input 
                      id="supplier_monthlyCapacity" 
                      name="supplier_monthlyCapacity" 
                      value={formData.supplier_monthlyCapacity} 
                      onChange={handleChange} 
                      placeholder="e.g., 20,000 units" 
                      className={inputBase} 
                    />
                  </div>

                  <div>
                    <label htmlFor="supplier_certifications" className="block text-sm text-slate-300">Certifications <span className="text-slate-500">(optional)</span></label>
                    <input 
                      id="supplier_certifications" 
                      name="supplier_certifications" 
                      value={formData.supplier_certifications} 
                      onChange={handleChange} 
                      placeholder="e.g., WRAP, BSCI, ISO 9001" 
                      className={inputBase} 
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label htmlFor="supplier_website" className="block text-sm text-slate-300">Website or catalogue link <span className="text-slate-500">(optional)</span></label>
                    <input 
                      id="supplier_website" 
                      name="supplier_website" 
                      value={formData.supplier_website} 
                      onChange={handleChange} 
                      placeholder="https://example-factory.com" 
                      className={inputBase} 
                    />
                  </div>
                </div>
              )}

              {/* Terms */}
              <div className="flex items-start">
                <input 
                  id="agreeToTerms" 
                  name="agreeToTerms" 
                  type="checkbox" 
                  checked={formData.agreeToTerms} 
                  onChange={handleChange} 
                  className="mt-1 h-4 w-4 rounded border-white/20 bg-black/30 text-lime-400 focus:ring-lime-400/60" 
                />
                <label htmlFor="agreeToTerms" className="ml-3 text-sm text-slate-300">
                  I agree to the <Link href="/terms" className="text-slate-400 hover:text-white underline underline-offset-4">Terms of Service</Link> and <Link href="/privacy" className="text-slate-400 hover:text-white underline underline-offset-4">Privacy Policy</Link>.
                </label>
              </div>
              {errors.agreeToTerms && <p className="-mt-4 text-sm text-red-400">{errors.agreeToTerms}</p>}

              {/* Submit */}
              <button 
                type="submit" 
                disabled={isLoading} 
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-lime-400 text-black px-4 py-2.5 font-medium shadow-[0_10px_40px_-10px_rgba(132,204,22,0.6)] hover:-translate-y-0.5 transition disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-30" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-70" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Creating account…
                  </>
                ) : (
                  <>Create account</>
                )}
              </button>

              {/* Divider & Socials */}
              <div className="mt-2">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center" aria-hidden="true">
                    <div className="w-full border-t border-white/10" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-[rgba(4,6,12,0.6)] text-slate-400">Or continue with</span>
                  </div>
                </div>

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
            </form>
          </div>
        </div>
      </div>
    </div>

      <style jsx global>{`
        @keyframes fadeInUp { 
          0% { 
            opacity: 0; 
            transform: translateY(16px) scale(0.98); 
            filter: blur(6px); 
          } 
          100% { 
            opacity: 1; 
            transform: translateY(0) scale(1); 
            filter: blur(0); 
          } 
        }
        .reveal { 
          opacity: 0; 
          animation: fadeInUp 0.9s ease-out forwards; 
          animation-delay: var(--delay, 0s); 
        }
      `}</style>
    </div>
  );
}
