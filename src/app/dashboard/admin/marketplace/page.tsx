"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from '@/components/auth/AuthContext';

interface ImageWithAlt {
 url: string;
 alt: string;
 name?: string;
}

interface MarketplaceProduct {
 _id: string;
 name: string;
 slug: string;
 mainImage: ImageWithAlt;
 itemData: ImageWithAlt[];
 priceTier?: string;
 productType: 'factory' | 'resale';
 sellingPrice?: number;
 categoryTags?: string[];
 productReadiness?: string[];
 createdBy?: {
  userId: string;
  name: string;
  email: string;
  role?: string;
  company?: string;
 };
 supplierPhoto?: ImageWithAlt;
}

async function fetchMarketplaceProducts(): Promise<MarketplaceProduct[]> {
 try {
  console.log('🏪 Marketplace: Fetching products from Sanity...');
  
  const response = await fetch('/api/sanity/products', {
   cache: 'no-store'
  });
  
  if (!response.ok) {
   console.error('🏪 Marketplace: API response not ok:', response.status, response.statusText);
   throw new Error(`API call failed: ${response.status}`);
  }
  
  const data = await response.json();
  console.log('🏪 Marketplace: API response structure:', data);
  
  // Handle different API response formats
  const products = Array.isArray(data) ? data : (data.products || []);
  console.log(`🏪 Marketplace: Found ${products.length} total products`);
  
  // Filter for active products only
  const activeProducts = products.filter((product: any) => product.isActive);
  console.log(`🏪 Marketplace: ${activeProducts.length} active products found`);
  
  return activeProducts.map((product: any) => ({
   _id: product._id || product.id,
   name: product.name,
   slug: typeof product.slug === 'string' ? product.slug : product.slug?.current || '',
   mainImage: product.mainImage,
   itemData: product.itemData || [],
   priceTier: product.priceTier,
   productType: product.productType,
   sellingPrice: product.sellingPrice,
   categoryTags: product.categoryTags || [],
   productReadiness: product.productReadiness || [],
   createdBy: product.createdBy,
   supplierPhoto: product.supplierPhoto
  }));
 } catch (error) {
  console.error('❌ Marketplace: Error fetching products:', error);
  return [];
 }
}

async function fetchSuppliers(): Promise<string[]> {
 try {
  const response = await fetch('/api/users?role=SUPPLIER', {
   cache: 'no-store'
  });
  
  if (!response.ok) {
   return [];
  }
  
  const data = await response.json();
  return data.users?.map((user: any) => user.name || user.email) || [];
 } catch (error) {
  console.error('❌ Marketplace: Error fetching suppliers:', error);
  return [];
 }
}

// Filter interfaces based on task requirements
interface MarketplaceFilterState {
 capProfile: string[];
 capShape: string[];
 priceTier: string[];
 feel: string[];
 color: string[];
 vendor: string[];
 productType: string[];
}

const initialFilterState: MarketplaceFilterState = {
 capProfile: [],
 capShape: [],
 priceTier: [],
 feel: [],
 color: [],
 vendor: [],
 productType: []
};

export default function MarketplacePage() {
 const { user } = useAuth();
 const [products, setProducts] = useState<MarketplaceProduct[]>([]);
 const [suppliers, setSuppliers] = useState<string[]>([]);
 const [loading, setLoading] = useState(true);
 const [filters, setFilters] = useState<MarketplaceFilterState>(initialFilterState);
 const [sortBy, setSortBy] = useState('featured');
 const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
 const [searchQuery, setSearchQuery] = useState('');
 
 useEffect(() => {
  async function loadData() {
   const [fetchedProducts, fetchedSuppliers] = await Promise.all([
    fetchMarketplaceProducts(),
    fetchSuppliers()
   ]);
   setProducts(fetchedProducts);
   setSuppliers(fetchedSuppliers);
   setLoading(false);
  }
  loadData();
 }, []);

 const handleFilterChange = (category: keyof MarketplaceFilterState, value: string, checked: boolean) => {
  setFilters(prev => {
   const currentValues = prev[category] as string[];
   return {
    ...prev,
    [category]: checked 
     ? [...currentValues, value]
     : currentValues.filter(v => v !== value)
   };
  });
 };

 const resetFilters = () => {
  setFilters(initialFilterState);
 };

 const getVendorName = (product: MarketplaceProduct) => {
  if (product.productType === 'factory') {
   return 'OPM Gear';
  }
  // Check if it's an admin uploaded product (no createdBy info)
  if (!product.createdBy?.name && !product.createdBy?.company) {
   return 'Official';
  }
  return product.createdBy?.company || product.createdBy?.name || 'Official';
 };

 const getVendorLogo = (product: MarketplaceProduct) => {
  if (product.productType === 'factory') {
   return '/opmLogo.svg';
  }
  return product.supplierPhoto?.url || '/api/placeholder/40/40';
 };

 const filteredAndSortedProducts = products
  .filter(product => {
   // Search filter
   if (searchQuery && !product.name.toLowerCase().includes(searchQuery.toLowerCase())) {
    return false;
   }
   
   // Price tier filter with mapping
   if (filters.priceTier.length > 0) {
    const productTier = product.priceTier || 'Tier 1';
    // Map system tiers to display names for filtering
    const tierMapping: { [key: string]: string } = {
     'Tier 1': 'Budget',
     'Tier 2': 'Premium', 
     'Tier 3': 'Luxury'
    };
    const displayTier = tierMapping[productTier] || productTier;
    if (!filters.priceTier.includes(displayTier)) {
     return false;
    }
   }
   
   // Vendor filter
   if (filters.vendor.length > 0) {
    const vendorName = getVendorName(product);
    if (!filters.vendor.some(v => vendorName.includes(v))) {
     return false;
    }
   }
   
   // Product Type filter (Stock/Inventory vs Customizable)
   if (filters.productType.length > 0) {
    const hasStockInventory = product.productReadiness?.includes('Stock/Inventory');
    const hasCustomizable = product.productReadiness?.includes('Customizable');
    
    let matchesFilter = false;
    
    if (filters.productType.includes('Stock/Inventory') && hasStockInventory) {
     matchesFilter = true;
    }
    if (filters.productType.includes('Customizable') && hasCustomizable) {
     matchesFilter = true;
    }
    
    if (!matchesFilter) {
     return false;
    }
   }
   
   // Category tags filter (basic implementation)
   if (filters.color.length > 0 || filters.feel.length > 0 || filters.capShape.length > 0 || filters.capProfile.length > 0) {
    const tags = (product.categoryTags || []).map(tag => tag.toLowerCase());
    const hasMatchingTag = [
     ...filters.color,
     ...filters.feel,
     ...filters.capShape,
     ...filters.capProfile
    ].some(filter => tags.some(tag => tag.includes(filter.toLowerCase())));
    
    if (!hasMatchingTag) {
     return false;
    }
   }
   
   return true;
  })
  .sort((a, b) => {
   switch (sortBy) {
    case 'name-asc':
     return a.name.localeCompare(b.name);
    case 'name-desc':
     return b.name.localeCompare(a.name);
    case 'newest':
     return b.name.localeCompare(a.name); // Placeholder sort
    case 'featured':
    default:
     return 0;
   }
  });

 // Get dynamic vendor list with unique values - only vendors that have products
 const availableVendors = Array.from(new Set(
  products.map(p => getVendorName(p))
 )).sort((a, b) => {
  // Sort with OPM Gear first, then Official, then alphabetically
  if (a === 'OPM Gear') return -1;
  if (b === 'OPM Gear') return 1;
  if (a === 'Official') return -1;
  if (b === 'Official') return 1;
  return a.localeCompare(b);
 });

 return (
  <div className="min-h-screen bg-black text-slate-200 flex flex-col">
   {/* Background Layers */}
   <div className="fixed inset-0 -z-50">
    <div className="absolute inset-0 bg-gradient-to-b from-black via-[#05070e] to-black"></div>
    <div className="absolute inset-0 opacity-30 mix-blend-soft-light pointer-events-none" style={{
     backgroundImage: 'radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)',
     backgroundSize: '12px 12px',
     maskImage: 'radial-gradient(600px 300px at 50% 0%, black 0%, transparent 70%)',
     WebkitMaskImage: 'radial-gradient(600px 300px at 50% 0%, black 0%, transparent 70%)'
    }}></div>
    <div className="absolute -top-32 -left-24 w-[40rem] h-[40rem] rounded-full bg-[#84cc16]/15 blur-3xl opacity-80 animate-pulse"></div>
    <div className="absolute top-1/3 -right-32 w-[44rem] h-[44rem] rounded-full bg-[#fb923c]/12 blur-3xl opacity-70 animate-pulse" style={{animationDelay: '1s'}}></div>
    <div className="absolute bottom-0 left-1/4 w-[42rem] h-[42rem] rounded-full bg-[#a855f7]/18 blur-3xl opacity-75 animate-pulse" style={{animationDelay: '2s'}}></div>
   </div>

   {/* Main Content Container - Centered with equal margins */}
   <div className="relative z-10 flex-1 flex flex-col">
    {/* Minimal top spacer */}
    <div className="py-4 md:py-6"></div>
    
    {/* Content Container */}
    <div className="flex-1 flex flex-col">
     {/* Top Bar with Button and Page Header */}
     <div className="max-w-[1950px] mx-auto px-6 lg:px-10 w-full">
      <div className="flex items-center justify-between mb-4">
       {/* Page Header - Far Left */}
       <div>
        <h1 className="text-5xl md:text-6xl lg:text-6xl font-extrabold tracking-tight text-white font-inter">Marketplace</h1>
        <p className="text-sm md:text-base text-slate-200 mt-3 font-inter">Browse products from multiple vendors. Factory products and resale items in one place.</p>
       </div>
       
       {/* Back Button - Top Right */}
       <div className="hidden md:block">
        <Link
         href="/dashboard/admin"
         className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/[0.08] border border-stone-500 text-white font-semibold text-sm hover:bg-white/[0.15] hover:border-stone-400 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
        >
         <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
         </svg>
         Back to Dashboard
        </Link>
       </div>
      </div>
     </div>

    {/* Mobile Back Button */}
    <div className="md:hidden max-w-[1950px] mx-auto px-6 mt-4">
     <Link
      href="/dashboard/admin"
      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.08] border border-stone-500 text-white font-semibold text-sm hover:bg-white/[0.15] hover:border-stone-400 transition-all duration-300"
     >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
      </svg>
      Back to Dashboard
     </Link>
    </div>

     {/* Main Content */}
     <main className="max-w-[1950px] mx-auto px-6 md:px-10 mt-4 md:mt-6 flex-1">
     <div className="grid grid-cols-12 gap-8">
      {/* Desktop Filters Sidebar */}
      <aside className="hidden md:block md:col-span-3 lg:col-span-3">
       <div className="sticky top-24 space-y-4">
        <div className="rounded-2xl bg-white/[0.08] border border-stone-500 ring-1 ring-white/[0.08] p-5 shadow-2xl">
         <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
           <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v18" />
           </svg>
           <h2 className="text-2xl font-extrabold tracking-tight text-white font-inter">Filters</h2>
          </div>
          <button 
           onClick={() => {
            resetFilters();
            setSearchQuery('');
           }}
           className="text-xs text-cyan-300 hover:text-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-400/40 rounded-full px-3 py-1 border border-cyan-300/20 hover:border-cyan-300/40 transition"
          >
           Reset All
          </button>
         </div>
         
         {/* Search Input */}
         <div className="mt-4 relative">
          <input
           type="text"
           placeholder="Search products..."
           value={searchQuery}
           onChange={(e) => setSearchQuery(e.target.value)}
           className="w-full h-11 pl-10 pr-4 rounded-xl bg-white/[0.08] border border-stone-500 ring-1 ring-white/[0.08] text-sm text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#84cc16]/50 focus:border-[#84cc16]/30 transition-all duration-200 shadow-lg hover:bg-white/[0.12] hover:border-stone-400"
          />
          <svg className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          {searchQuery && (
           <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
           >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
           </button>
          )}
         </div>
         
         <div className="mt-6 space-y-6">
          {/* Vendor - Moved to Top */}
          <details open className="group rounded-xl border border-stone-500 bg-black/40 shadow-lg">
           <summary className="list-none cursor-pointer select-none px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-200">
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
             </svg>
             <span className="text-sm font-semibold font-inter">Vendor</span>
            </div>
            <svg className="w-4 h-4 text-slate-400 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
           </summary>
           <div className="px-3 pb-3">
            <div className="grid grid-cols-1 gap-2">
             {availableVendors.map((vendor, index) => (
              <label key={`${vendor}-${index}`} className="cursor-pointer">
               <input 
                type="checkbox" 
                className="peer sr-only"
                checked={filters.vendor.includes(vendor)}
                onChange={(e) => handleFilterChange('vendor', vendor, e.target.checked)}
               />
               <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.06] border border-stone-500 hover:bg-white/[0.12] peer-checked:bg-white/[0.15] peer-checked:border-lime-300/40 transition-all duration-300 shadow-sm">
                <div className="w-6 h-6 rounded bg-stone-600 flex items-center justify-center overflow-hidden">
                 {vendor === 'OPM Gear' ? (
                  <Image src="/opmLogo.svg" alt="OPM Gear" width={20} height={20} />
                 ) : (
                  <span className="text-xs font-bold text-stone-300">{vendor.charAt(0)}</span>
                 )}
                </div>
                <span className="text-xs text-slate-200 font-medium">{vendor}</span>
               </div>
              </label>
             ))}
            </div>
           </div>
          </details>

          {/* Product Type */}
          <details open className="group rounded-xl border border-stone-500 bg-black/40 shadow-lg">
           <summary className="list-none cursor-pointer select-none px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-200">
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
             </svg>
             <span className="text-sm font-semibold font-inter">Product Type</span>
            </div>
            <svg className="w-4 h-4 text-slate-400 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
           </summary>
           <div className="px-3 pb-3">
            <div className="flex flex-wrap gap-2">
             {['Stock/Inventory', 'Customizable'].map(type => (
              <label key={type} className="cursor-pointer">
               <input 
                type="checkbox" 
                className="peer sr-only"
                checked={filters.productType.includes(type)}
                onChange={(e) => handleFilterChange('productType', type, e.target.checked)}
               />
               <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-stone-700 border border-stone-600 text-sm hover:bg-stone-600 peer-checked:bg-[#84cc16] peer-checked:text-black peer-checked:border-lime-300/40 transition">
                {type}
               </span>
              </label>
             ))}
            </div>
           </div>
          </details>

          {/* Cap Profile */}
          <details open className="group rounded-xl border border-stone-500 bg-black/40 shadow-lg">
           <summary className="list-none cursor-pointer select-none px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-200">
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
             </svg>
             <span className="text-sm font-semibold font-inter">Cap Profile</span>
            </div>
            <svg className="w-4 h-4 text-slate-400 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
           </summary>
           <div className="px-3 pb-3">
            <div className="flex flex-wrap gap-2">
             {['High', 'Low', 'Mid'].map(profile => (
              <label key={profile} className="cursor-pointer">
               <input 
                type="checkbox" 
                className="peer sr-only"
                checked={filters.capProfile.includes(profile)}
                onChange={(e) => handleFilterChange('capProfile', profile, e.target.checked)}
               />
               <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-stone-700 border border-stone-600 text-sm hover:bg-stone-600 peer-checked:bg-[#84cc16] peer-checked:text-black peer-checked:border-lime-300/40 transition">
                {profile}
               </span>
              </label>
             ))}
            </div>
           </div>
          </details>

          {/* Cap Shape */}
          <details open className="group rounded-xl border border-stone-500 bg-black/40 shadow-lg">
           <summary className="list-none cursor-pointer select-none px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-200">
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
             </svg>
             <span className="text-sm font-semibold font-inter">Cap Shape</span>
            </div>
            <svg className="w-4 h-4 text-slate-400 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
           </summary>
           <div className="px-3 pb-3">
            <div className="flex flex-wrap gap-2">
             {['Flat Bill', 'Slight Flat', 'Curved'].map(shape => (
              <label key={shape} className="cursor-pointer">
               <input 
                type="checkbox" 
                className="peer sr-only"
                checked={filters.capShape.includes(shape)}
                onChange={(e) => handleFilterChange('capShape', shape, e.target.checked)}
               />
               <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-stone-700 border border-stone-600 text-sm hover:bg-stone-600 peer-checked:bg-[#84cc16] peer-checked:text-black transition">
                {shape}
               </span>
              </label>
             ))}
            </div>
           </div>
          </details>

          {/* Price Tier */}
          <details open className="group rounded-xl border border-stone-500 bg-black/40 shadow-lg">
           <summary className="list-none cursor-pointer select-none px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-200">
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
             </svg>
             <span className="text-sm font-semibold font-inter">Price Tier</span>
            </div>
            <svg className="w-4 h-4 text-slate-400 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
           </summary>
           <div className="px-3 pb-3">
            <div className="flex flex-wrap gap-2">
             {[
              { display: 'Budget', system: 'Tier 1' },
              { display: 'Premium', system: 'Tier 2' },
              { display: 'Luxury', system: 'Tier 3' }
             ].map(tier => (
              <label key={tier.display} className="cursor-pointer">
               <input 
                type="checkbox" 
                className="peer sr-only"
                checked={filters.priceTier.includes(tier.display)}
                onChange={(e) => handleFilterChange('priceTier', tier.display, e.target.checked)}
               />
               <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.06] border border-stone-500 text-sm hover:bg-white/[0.12] peer-checked:bg-gradient-to-r peer-checked:from-[#84cc16]/20 peer-checked:to-[#65a30d]/20 peer-checked:border-lime-300/40 transition-all duration-300 shadow-sm">
                {tier.display} ({tier.system})
               </span>
              </label>
             ))}
            </div>
           </div>
          </details>

          {/* Feel */}
          <details open className="group rounded-xl border border-stone-500 bg-black/40 shadow-lg">
           <summary className="list-none cursor-pointer select-none px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-200">
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a4 4 0 000-8h-4V9a2 2 0 012-2z" />
             </svg>
             <span className="text-sm font-semibold font-inter">Feel</span>
            </div>
            <svg className="w-4 h-4 text-slate-400 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
           </summary>
           <div className="px-3 pb-3">
            <div className="flex flex-wrap gap-2">
             {['Soft', 'Structured', 'Unstructured', 'Foam', 'Breathable'].map(feel => (
              <label key={feel} className="cursor-pointer">
               <input 
                type="checkbox" 
                className="peer sr-only"
                checked={filters.feel.includes(feel)}
                onChange={(e) => handleFilterChange('feel', feel, e.target.checked)}
               />
               <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.06] border border-stone-500 text-sm text-slate-200 hover:bg-white/[0.12] peer-checked:bg-gradient-to-r peer-checked:from-[#84cc16] peer-checked:to-[#65a30d] peer-checked:text-black peer-checked:border-lime-300/40 transition-all duration-300 shadow-sm">
                {feel}
               </span>
              </label>
             ))}
            </div>
           </div>
          </details>

          {/* Color */}
          <details open className="group rounded-xl border border-stone-500 bg-black/40 shadow-lg">
           <summary className="list-none cursor-pointer select-none px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-200">
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a4 4 0 000-8h-4V9a2 2 0 012-2z" />
             </svg>
             <span className="text-sm font-semibold font-inter">Color</span>
            </div>
            <svg className="w-4 h-4 text-slate-400 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
           </summary>
           <div className="px-3 pb-3">
            <div className="grid grid-cols-4 gap-2">
             {[
              { name: 'Black', color: 'bg-black border-stone-400' },
              { name: 'White', color: 'bg-white border-gray-300' },
              { name: 'Navy', color: 'bg-blue-900 border-blue-700' },
              { name: 'Red', color: 'bg-red-600 border-red-400' },
              { name: 'Orange', color: 'bg-orange-600 border-orange-400' },
              { name: 'Light Grey', color: 'bg-gray-300 border-gray-500' },
              { name: 'Khaki', color: 'bg-yellow-700 border-yellow-500' },
              { name: 'Charcoal', color: 'bg-gray-800 border-gray-600' },
              { name: 'Royal', color: 'bg-blue-600 border-blue-400' },
              { name: 'Olive', color: 'bg-green-800 border-green-600' },
              { name: 'Neon Green', color: 'bg-green-400 border-green-300' },
              { name: 'Neon Orange', color: 'bg-orange-400 border-orange-300' }
             ].map(colorItem => (
              <label key={colorItem.name} className="cursor-pointer">
               <input 
                type="checkbox" 
                className="peer sr-only"
                checked={filters.color.includes(colorItem.name)}
                onChange={(e) => handleFilterChange('color', colorItem.name, e.target.checked)}
               />
               <div className="flex flex-col items-center gap-1 p-2 rounded-lg bg-white/[0.06] border border-stone-500 hover:bg-white/[0.12] peer-checked:bg-white/[0.15] peer-checked:border-lime-300/40 transition-all duration-300 shadow-sm">
                <div className={`w-6 h-6 rounded-full border-2 ${colorItem.color}`}></div>
                <span className="text-xs text-slate-300">{colorItem.name}</span>
               </div>
              </label>
             ))}
            </div>
           </div>
          </details>

         </div>
        </div>
       </div>
      </aside>

      {/* Product Area */}
      <section className="col-span-12 md:col-span-9 lg:col-span-9">
       {/* Controls Row */}
       <div className="rounded-2xl bg-white/[0.08] border border-stone-500 ring-1 ring-white/[0.08] p-4 shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
         <div className="flex items-center gap-3">
          <span className="text-sm text-slate-300 font-inter">{filteredAndSortedProducts.length} results</span>
         </div>
         
         <div className="flex items-center gap-3">
          {/* Sort Select */}
          <div className="relative glass-dropdown">
           <select 
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="appearance-none h-10 pl-3 pr-9 rounded-xl bg-white/[0.08] border border-stone-500 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#84cc16]/50 focus:border-[#84cc16]/30 transition-all duration-200 shadow-lg hover:bg-white/[0.12] hover:border-stone-400"
            style={{
             backgroundImage: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
             boxShadow: '0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)'
            }}
           >
            <option value="featured" className="bg-gray-900/95 text-white border-b border-stone-600">Sort: Featured</option>
            <option value="name-asc" className="bg-gray-900/95 text-white border-b border-stone-600">Name: A to Z</option>
            <option value="name-desc" className="bg-gray-900/95 text-white border-b border-stone-600">Name: Z to A</option>
            <option value="newest" className="bg-gray-900/95 text-white">Newest</option>
           </select>
           <svg className="pointer-events-none w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
           </svg>
          </div>
         </div>
        </div>
       </div>

       {/* Product Grid */}
       {loading ? (
        <div className="mt-6 flex items-center justify-center py-12">
         <div className="w-8 h-8 border-2 border-lime-400/30 border-t-lime-400 rounded-full animate-spin"></div>
        </div>
       ) : filteredAndSortedProducts.length === 0 ? (
        <div className="mt-6 text-center py-12">
         <div className="w-16 h-16 mx-auto mb-4 bg-stone-700 border border-stone-600 rounded-full flex items-center justify-center">
          <span className="text-2xl">🔍</span>
         </div>
         <h3 className="text-lg font-semibold text-white mb-2">No products found</h3>
         <p className="text-slate-400">Try adjusting your filters or search terms.</p>
        </div>
       ) : (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10 max-w-none">
         {filteredAndSortedProducts.map((product, index) => {
          if (!product.mainImage?.url) return null;
          
          const vendorName = getVendorName(product);
          const vendorLogo = getVendorLogo(product);
          
          return (
           <div
            key={`${product.slug}-${index}`}
            className="group rounded-2xl bg-white/[0.08] border border-stone-500 ring-1 ring-white/[0.08] overflow-hidden hover:border-stone-400 hover:bg-white/[0.12] transition-all duration-300 shadow-2xl hover:shadow-[0_20px_60px_rgba(0,0,0,0.4)] hover:-translate-y-1"
           >
            {/* Product Image Container */}
            <div className="relative">
             <div className="aspect-[4/3.45] overflow-hidden">
              <Image
               src={product.mainImage.url}
               alt={product.mainImage.alt}
               width={600}
               height={450}
               className="w-full h-full object-cover group-hover:scale-[1.05] transition duration-700 ease-out"
               priority={index < 6}
              />
             </div>
             
             {/* Vendor Logo - Top Right */}
             <div className="absolute top-3 right-3">
              <div className="w-10 h-10 rounded-full bg-stone-600 border border-stone-500 flex items-center justify-center overflow-hidden">
               {vendorName === 'OPM Gear' ? (
                <Image src="/opmLogo.svg" alt="OPM Gear" width={24} height={24} />
               ) : (
                <Image 
                 src={vendorLogo} 
                 alt={vendorName} 
                 width={24} 
                 height={24}
                 className="rounded-full"
                 onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  target.nextElementSibling!.classList.remove('hidden');
                 }}
                />
               )}
               <span className="hidden text-xs font-bold text-stone-300">{vendorName.charAt(0)}</span>
              </div>
             </div>

             {/* Glass overlay gradient */}
             <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-black/10 opacity-70"></div>
             <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
             <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent opacity-20"></div>
             
             {/* Badge for product type */}
             <div className="absolute top-3 left-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black border border-stone-500 text-xs text-white font-semibold ">
              {product.productType === 'factory' ? (
               <>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                Blanks
               </>
              ) : (
               <>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                Resale
               </>
              )}
             </div>
            </div>
            
            {/* Product Info */}
            <div className="p-6">
             <div className="flex items-center justify-between">
              <div className="min-w-0">
               <h3 className="text-[18px] font-bold tracking-tight text-white truncate drop-shadow-sm">{product.name}</h3>
               <div className="mt-0.5 flex items-center gap-2">
                <span className="text-sm font-semibold text-white drop-shadow-sm">{vendorName}</span>
                <span className="text-white/20">•</span>
                <span className="text-sm font-medium text-stone-200">
                 {(() => {
                  const tierMapping: { [key: string]: string } = {
                   'Tier 1': 'Budget (Tier 1)',
                   'Tier 2': 'Premium (Tier 2)',
                   'Tier 3': 'Luxury (Tier 3)'
                  };
                  return tierMapping[product.priceTier || 'Tier 1'] || product.priceTier || 'Standard';
                 })()}
                </span>
               </div>
              </div>
              <div className="text-right">
               {product.sellingPrice ? (
                <>
                 <div className="text-[15px] font-semibold text-lime-400">${product.sellingPrice}</div>
                 <div className="text-sm text-slate-400">Fixed</div>
                </>
               ) : (
                <>
                 <div className="text-[15px] font-semibold text-white">Custom</div>
                 <div className="text-sm text-slate-400">Quote</div>
                </>
               )}
              </div>
             </div>
             
             <div className="mt-5 flex items-center gap-3">
              <Link
               href={`/dashboard/admin/products/${product._id}`}
               className="flex-1 h-11 px-4 rounded-full bg-gradient-to-r from-[#84cc16] to-[#65a30d] text-black font-bold text-sm shadow-[0_0_0_2px_rgba(255,255,255,0.1)] hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(132,204,22,0.5)] transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#84cc16]/60 flex items-center justify-center "
              >
               View Product
              </Link>
              <Link
               href={`/quote-request?product=${product.slug}&name=${encodeURIComponent(product.name)}`}
               className="flex-1 h-11 px-4 rounded-full bg-white/[0.08] border border-stone-500 text-white font-semibold text-sm hover:bg-white/[0.15] hover:border-stone-400 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 flex items-center justify-center shadow-lg hover:shadow-xl hover:-translate-y-0.5"
              >
               Quick Quote
              </Link>
             </div>
            </div>
           </div>
          );
         })}
        </div>
       )}
      </section>
     </div>
     </main>
    </div>
    
    {/* Spacer for bottom margin - equal to top */}
    <div className="py-8 md:py-12 lg:py-16"></div>
   </div>
  </div>
 );
}