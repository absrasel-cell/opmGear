"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { SanityService } from "@/lib/sanity";

interface ImageWithAlt {
  url: string;
  alt: string;
  name?: string;
}

interface StoreProduct {
  name: string;
  slug: string;
  _id?: string;
  mainImage: ImageWithAlt;
  itemData: ImageWithAlt[];
  priceTier?: string;
  productReadiness?: string[];
  productType?: string;
}

async function fetchStoreProducts(): Promise<StoreProduct[]> {
  try {
    console.log('🏪 Store: Fetching products via API endpoint...');
    
    const response = await fetch('/api/store-products', {
      cache: 'no-store' // Force fresh data
    });
    
    if (!response.ok) {
      console.error('🏪 Store: API response not ok:', response.status, response.statusText);
      throw new Error(`API call failed: ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`🏪 Store: API returned ${data.products?.length || 0} products`);
    console.log('🏪 Store: API config check:', data.config);
    
    return data.products || [];
  } catch (error) {
    console.error('❌ Store: Error fetching via API:', error);
    return [];
  }
}

async function fetchSanityProducts(): Promise<StoreProduct[]> {
  try {
    console.log('🏪 Store: Starting direct Sanity product fetch...');
    const sanityProducts = await SanityService.getProducts();
    console.log('🏪 Store: Fetched Sanity products:', sanityProducts.length);
    
    if (sanityProducts.length === 0) {
      console.warn('⚠️ Store: No products returned from Sanity');
    }

    const filteredProducts = sanityProducts.filter((product: any) => {
      const isActiveProduct = product.isActive;
      const hasMainImage = product.mainImage?.url;
      const hasSlug = typeof product.slug === 'string' ? product.slug : product.slug?.current;
      
      console.log(`🔍 Store: Product "${product.name}" - Active: ${isActiveProduct}, Image: ${!!hasMainImage}, Slug: ${!!hasSlug}`);
      
      return isActiveProduct && hasMainImage && hasSlug;
    });

    console.log(`🏪 Store: After filtering - ${filteredProducts.length} products remain`);

    return filteredProducts
      .map((product: any) => ({
        name: product.name,
        slug: typeof product.slug === 'string' ? product.slug : product.slug?.current || '',
        mainImage: {
          url: product.mainImage.url,
          alt: product.mainImage.alt || product.name,
          name: product.name
        },
        itemData: product.itemData || [],
        priceTier: product.priceTier || 'Standard'
      }))
      .filter(product => {
        const hasValidSlug = product.slug && product.slug.trim() !== '';
        if (!hasValidSlug) {
          console.warn(`⚠️ Store: Product "${product.name}" has invalid slug, skipping`);
        }
        return hasValidSlug;
      });
  } catch (error) {
    console.error('❌ Store: Error fetching Sanity products:', error);
    return [];
  }
}

// Filter interfaces and state management
interface FilterState {
  capProfile: string[];
  capShape: string[];
  panelCount: string[];
  closureType: string[];
  sport: string[];
  priceTier: string;
  feel: string[];
  color: string[];
  season: string[];
  vendor: string[];
  productType: string[];
}

const initialFilterState: FilterState = {
  capProfile: [],
  capShape: [],
  panelCount: [],
  closureType: [],
  sport: [],
  priceTier: '',
  feel: [],
  color: [],
  season: [],
  vendor: [],
  productType: []
};


export default function StorePage() {
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FilterState>(initialFilterState);
  const [sortBy, setSortBy] = useState('featured');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Admin Dashboard compatible search handler
  const handleAdminSearch = (query: string) => {
    setSearchQuery(query);
  };

  // Vendor helper functions from Admin Marketplace
  const getVendorName = (product: StoreProduct) => {
    if (product.productType === 'factory') {
      return 'OPM Gear';
    }
    // For other products without specific vendor info, default to brand names
    return 'OPM Gear';
  };

  const getVendorLogo = (product: StoreProduct) => {
    if (product.productType === 'factory') {
      return '/opmLogo.svg';
    }
    return '/opmLogo.svg';
  };

  // Get dynamic vendor list based on actual products
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
  
  useEffect(() => {
    async function loadProducts() {
      const fetchedProducts = await fetchStoreProducts();
      setProducts(fetchedProducts);
      setLoading(false);
    }
    loadProducts();
  }, []);

  const handleFilterChange = (category: keyof FilterState, value: string, checked: boolean) => {
    setFilters(prev => {
      if (category === 'priceTier') {
        return { ...prev, [category]: checked ? value : '' };
      } else {
        const currentValues = prev[category] as string[];
        return {
          ...prev,
          [category]: checked 
            ? [...currentValues, value]
            : currentValues.filter(v => v !== value)
        };
      }
    });
  };

  const resetFilters = () => {
    setFilters(initialFilterState);
  };

  const filteredAndSortedProducts = products
    .filter(product => {
      if (searchQuery && !product.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      
      // Price tier filter with mapping (Admin Marketplace style)
      if (filters.priceTier && filters.priceTier !== '') {
        const productTier = product.priceTier || 'Standard';
        // Map system tiers to display names for filtering
        const tierMapping: { [key: string]: string } = {
          'Tier 1': 'Budget',
          'Tier 2': 'Premium', 
          'Tier 3': 'Luxury',
          'Standard': 'Mid'
        };
        const displayTier = tierMapping[productTier] || productTier;
        if (filters.priceTier !== displayTier) {
          return false;
        }
      }
      
      // Vendor filter (using dynamic vendor names)
      if (filters.vendor.length > 0) {
        const vendorName = getVendorName(product);
        if (!filters.vendor.some(v => vendorName.includes(v))) {
          return false;
        }
      }
      
      // Filter by Product Type (Stock/Inventory vs Customizable)
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
      
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name-asc':
          return a.name.localeCompare(b.name);
        case 'name-desc':
          return b.name.localeCompare(a.name);
        case 'newest':
          // For now, sort by name as we don't have date field
          return b.name.localeCompare(a.name);
        case 'featured':
        default:
          return 0; // Keep original order for featured
      }
    });

  // Handle empty products
  if (!loading && products.length === 0) {
    return (
      <div className="min-h-screen bg-black text-slate-200">
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
        </div>

        <div className="relative z-10">
          <section className="max-w-[1800px] mx-auto px-6 lg:px-10 pt-10 md:pt-14">
            <div className="text-center">
              <h1 className="text-5xl md:text-6xl lg:text-6xl font-extrabold tracking-tight text-white font-inter">Caps & Hats</h1>
              <p className="text-sm md:text-base text-slate-300/90 mt-3">Browse premium blanks and ready-to-customize styles.</p>
            </div>
          </section>

          <main className="max-w-[1800px] mx-auto px-6 lg:px-10 py-12">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-white/5 border border-white/10 rounded-full flex items-center justify-center">
                <span className="text-2xl">📦</span>
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">No Products Available</h2>
              <p className="text-slate-400">No products are currently available. Please check back later.</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-slate-200">
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

      <div className="relative z-10">
        {/* Page Header */}
        <section className="max-w-[1950px] mx-auto px-6 lg:px-10 pt-16 md:pt-24 lg:pt-28">
          <div className="flex items-end justify-between gap-6">
            <div>
              <h1 className="text-5xl md:text-6xl lg:text-6xl font-extrabold tracking-tight text-white font-inter">Caps & Hats</h1>
              <p className="text-sm md:text-base text-slate-200 mt-3 font-inter">Browse premium blanks and ready-to-customize styles. Fast quotes, faster turnarounds.</p>
            </div>
            <div className="hidden md:block">
              {/* Moved to controls area */}
            </div>
          </div>
        </section>

        {/* Mobile Filter Trigger */}
        <section className="md:hidden max-w-[1950px] mx-auto px-6 md:px-10 mt-8">
          <details className="w-full" id="mobile-filters">
            <summary className="list-none">
              <div className="flex items-center justify-between rounded-2xl bg-white/[0.08] border border-white/20 ring-1 ring-white/[0.08] backdrop-blur-2xl px-4 py-3 shadow-2xl">
                <div className="flex items-center gap-2 text-slate-200">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v18" />
                  </svg>
                  <span className="text-sm font-medium">Filter & Sort</span>
                </div>
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </summary>
            <div className="mt-3 rounded-2xl bg-white/[0.08] border border-white/20 ring-1 ring-white/[0.08] backdrop-blur-2xl p-3 shadow-2xl">
              <div className="grid grid-cols-1 gap-6">
                {/* Vendor - Moved to Top */}
                <div className="rounded-2xl border border-white/20 bg-black/40 backdrop-blur-sm p-3 shadow-lg">
                  <div className="flex items-center gap-2 text-slate-200 mb-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <span className="text-sm font-semibold">Vendor</span>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {availableVendors.map((vendor, index) => (
                      <label key={`mobile-${vendor}-${index}`} className="cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="peer sr-only"
                          checked={filters.vendor.includes(vendor)}
                          onChange={(e) => handleFilterChange('vendor', vendor, e.target.checked)}
                        />
                        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.06] border border-white/15 hover:bg-white/[0.12] backdrop-blur-sm peer-checked:bg-white/[0.15] peer-checked:border-lime-300/40 transition-all duration-300 shadow-sm">
                          <div className="w-5 h-5 rounded bg-white/10 flex items-center justify-center overflow-hidden">
                            {vendor === 'OPM Gear' ? (
                              <Image src="/opmLogo.svg" alt="OPM Gear" width={16} height={16} />
                            ) : (
                              <span className="text-xs font-bold text-white/70">{vendor.charAt(0)}</span>
                            )}
                          </div>
                          <span className="text-sm text-slate-200 font-medium">{vendor}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Product Type */}
                <div className="rounded-2xl border border-white/20 bg-black/40 backdrop-blur-sm p-3 shadow-lg">
                  <div className="flex items-center gap-2 text-slate-200 mb-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                    <span className="text-sm font-semibold">Product Type</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {['Stock/Inventory', 'Customizable'].map(type => (
                      <label key={type} className="cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="peer sr-only"
                          checked={filters.productType.includes(type)}
                          onChange={(e) => handleFilterChange('productType', type, e.target.checked)}
                        />
                        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.06] border border-white/15 text-sm text-slate-200 hover:bg-white/[0.12] backdrop-blur-sm peer-checked:bg-gradient-to-r peer-checked:from-[#84cc16] peer-checked:to-[#65a30d] peer-checked:text-black peer-checked:border-lime-300/40 transition-all duration-300 shadow-sm">
                          {type}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Cap Profile */}
                <div className="rounded-2xl border border-white/20 bg-black/40 backdrop-blur-sm p-3 shadow-lg">
                  <div className="flex items-center gap-2 text-slate-200 mb-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    <span className="text-sm font-semibold">Cap Profile</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {['High', 'Low', 'Mid'].map(profile => (
                      <label key={profile} className="cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="peer sr-only"
                          checked={filters.capProfile.includes(profile)}
                          onChange={(e) => handleFilterChange('capProfile', profile, e.target.checked)}
                        />
                        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.06] border border-white/15 text-sm text-slate-200 hover:bg-white/[0.12] backdrop-blur-sm peer-checked:bg-gradient-to-r peer-checked:from-[#84cc16] peer-checked:to-[#65a30d] peer-checked:text-black peer-checked:border-lime-300/40 transition-all duration-300 shadow-sm">
                          {profile}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Cap Shape */}
                <div className="rounded-2xl border border-white/20 bg-black/40 backdrop-blur-sm p-3 shadow-lg">
                  <div className="flex items-center gap-2 text-slate-200 mb-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    <span className="text-sm font-semibold">Cap Shape</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {['Flat Bill', 'Slight Flat', 'Curved'].map(shape => (
                      <label key={shape} className="cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="peer sr-only"
                          checked={filters.capShape.includes(shape)}
                          onChange={(e) => handleFilterChange('capShape', shape, e.target.checked)}
                        />
                        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.06] border border-white/15 text-sm text-slate-200 hover:bg-white/[0.12] backdrop-blur-sm peer-checked:bg-gradient-to-r peer-checked:from-[#84cc16] peer-checked:to-[#65a30d] peer-checked:text-black peer-checked:border-lime-300/40 transition-all duration-300 shadow-sm">
                          {shape}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Panel Count */}
                <div className="rounded-2xl border border-white/20 bg-black/40 backdrop-blur-sm p-3 shadow-lg">
                  <div className="flex items-center gap-2 text-slate-200 mb-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                    </svg>
                    <span className="text-sm font-semibold">Panel Count</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {['5-Panel', '6-Panel', '7-Panel'].map(panel => (
                      <label key={panel} className="cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="peer sr-only"
                          checked={filters.panelCount.includes(panel)}
                          onChange={(e) => handleFilterChange('panelCount', panel, e.target.checked)}
                        />
                        <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-white/[0.06] border border-white/15 text-sm hover:bg-white/[0.12] backdrop-blur-sm peer-checked:bg-gradient-to-r peer-checked:from-[#84cc16] peer-checked:to-[#65a30d] peer-checked:text-black peer-checked:border-lime-300/40 transition-all duration-300 shadow-sm">
                          {panel}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Price Tier */}
                <div className="rounded-2xl border border-white/20 bg-black/40 backdrop-blur-sm p-3 shadow-lg">
                  <div className="flex items-center gap-2 text-slate-200 mb-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                    <span className="text-sm font-semibold">Price Tier</span>
                  </div>
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
                          checked={filters.priceTier === tier.display}
                          onChange={(e) => handleFilterChange('priceTier', tier.display, e.target.checked)}
                        />
                        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.06] border border-white/15 text-sm hover:bg-white/[0.12] backdrop-blur-sm peer-checked:bg-gradient-to-r peer-checked:from-[#84cc16]/20 peer-checked:to-[#65a30d]/20 peer-checked:border-lime-300/40 transition-all duration-300 shadow-sm">
                          {tier.display} ({tier.system})
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Feel */}
                <div className="rounded-2xl border border-white/20 bg-black/40 backdrop-blur-sm p-3 shadow-lg">
                  <div className="flex items-center gap-2 text-slate-200 mb-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a4 4 0 000-8h-4V9a2 2 0 012-2z" />
                    </svg>
                    <span className="text-sm font-semibold">Feel</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {['Soft', 'Structured', 'Unstructured', 'Foam', 'Breathable'].map(feel => (
                      <label key={feel} className="cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="peer sr-only"
                          checked={filters.feel.includes(feel)}
                          onChange={(e) => handleFilterChange('feel', feel, e.target.checked)}
                        />
                        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.06] border border-white/15 text-sm text-slate-200 hover:bg-white/[0.12] backdrop-blur-sm peer-checked:bg-gradient-to-r peer-checked:from-[#84cc16] peer-checked:to-[#65a30d] peer-checked:text-black peer-checked:border-lime-300/40 transition-all duration-300 shadow-sm">
                          {feel}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Color */}
                <div className="rounded-2xl border border-white/20 bg-black/40 backdrop-blur-sm p-3 shadow-lg">
                  <div className="flex items-center gap-2 text-slate-200 mb-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a4 4 0 000-8h-4V9a2 2 0 012-2z" />
                    </svg>
                    <span className="text-sm font-semibold">Color</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { name: 'Black', color: 'bg-black border-white/30' },
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
                        <div className="flex flex-col items-center gap-1 p-2 rounded-lg bg-white/[0.06] border border-white/15 hover:bg-white/[0.12] backdrop-blur-sm peer-checked:bg-white/[0.15] peer-checked:border-lime-300/40 transition-all duration-300 shadow-sm">
                          <div className={`w-4 h-4 rounded-full border ${colorItem.color}`}></div>
                          <span className="text-xs text-slate-300">{colorItem.name}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Season */}
                <div className="rounded-2xl border border-white/20 bg-black/40 backdrop-blur-sm p-3 shadow-lg">
                  <div className="flex items-center gap-2 text-slate-200 mb-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    <span className="text-sm font-semibold">Season</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { name: 'Spring', icon: '🌸' },
                      { name: 'Summer', icon: '☀️' },
                      { name: 'Fall', icon: '🍂' },
                      { name: 'Winter', icon: '❄️' }
                    ].map(season => (
                      <label key={season.name} className="cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="peer sr-only"
                          checked={filters.season.includes(season.name)}
                          onChange={(e) => handleFilterChange('season', season.name, e.target.checked)}
                        />
                        <span className="flex items-center justify-center gap-2 px-2 py-1.5 rounded-xl bg-white/[0.06] border border-white/15 text-sm hover:bg-white/[0.12] backdrop-blur-sm peer-checked:bg-gradient-to-r peer-checked:from-[#84cc16]/20 peer-checked:to-[#65a30d]/20 peer-checked:border-lime-300/40 transition-all duration-300 shadow-sm">
                          <span>{season.icon}</span>
                          <span className="text-slate-200 text-xs">{season.name}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

              </div>
              
              {/* Mobile Actions */}
              <div className="mt-3 flex items-center justify-between">
                <button 
                  onClick={resetFilters}
                  className="h-11 px-5 rounded-full bg-white/5 border border-white/10 text-slate-200 hover:bg-white/10 hover:border-white/20 transition text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
                >
                  Reset
                </button>
                <button className="h-11 px-6 rounded-full bg-[#84cc16] text-black shadow-[0_0_0_2px_rgba(255,255,255,0.06)] hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(132,204,22,0.4)] transition-all duration-300 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-[#84cc16]/50">
                  Apply
                </button>
              </div>
            </div>
          </details>
        </section>

        {/* Main Content */}
        <main className="max-w-[1950px] mx-auto px-6 md:px-10 mt-6 md:mt-10">
          <div className="grid grid-cols-12 gap-8">
            {/* Desktop Filters Sidebar */}
            <aside id="filters" className="hidden md:block md:col-span-3 lg:col-span-3">
              <div className="sticky top-24 space-y-4">
                <div className="rounded-2xl bg-white/[0.08] border border-white/20 ring-1 ring-white/[0.08] backdrop-blur-2xl p-5 shadow-2xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v18" />
                      </svg>
                      <h2 className="text-2xl font-extrabold tracking-tight text-white font-inter">Filters</h2>
                    </div>
                    <button 
                      onClick={resetFilters}
                      className="text-xs text-cyan-300 hover:text-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-400/40 rounded-full px-3 py-1 border border-cyan-300/20 hover:border-cyan-300/40 transition"
                    >
                      Reset All
                    </button>
                  </div>
                  
                  <div className="mt-6 space-y-6">
                    {/* Vendor - Moved to Top */}
                    <details open className="group rounded-xl border border-white/20 bg-black/40 backdrop-blur-sm shadow-lg">
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
                              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.06] border border-white/15 hover:bg-white/[0.12] backdrop-blur-sm peer-checked:bg-white/[0.15] peer-checked:border-lime-300/40 transition-all duration-300 shadow-sm">
                                <div className="w-6 h-6 rounded bg-white/10 flex items-center justify-center overflow-hidden">
                                  {vendor === 'OPM Gear' ? (
                                    <Image src="/opmLogo.svg" alt="OPM Gear" width={20} height={20} />
                                  ) : (
                                    <span className="text-xs font-bold text-white/70">{vendor.charAt(0)}</span>
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
                    <details open className="group rounded-xl border border-white/20 bg-black/40 backdrop-blur-sm shadow-lg">
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
                              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm hover:bg-white/10 peer-checked:bg-[#84cc16] peer-checked:text-black peer-checked:border-lime-300/40 transition">
                                {type}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </details>

                    {/* Cap Profile */}
                    <details open className="group rounded-xl border border-white/20 bg-black/40 backdrop-blur-sm shadow-lg">
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
                              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm hover:bg-white/10 peer-checked:bg-[#84cc16] peer-checked:text-black peer-checked:border-lime-300/40 transition">
                                {profile}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </details>

                    {/* Cap Shape */}
                    <details open className="group rounded-xl border border-white/20 bg-black/40 backdrop-blur-sm shadow-lg">
                      <summary className="list-none cursor-pointer select-none px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-slate-200">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
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
                              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm hover:bg-white/10 peer-checked:bg-[#84cc16] peer-checked:text-black peer-checked:border-lime-300/40 transition">
                                {shape}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </details>

                    {/* Panel Count */}
                    <details open className="group rounded-xl border border-white/20 bg-black/40 backdrop-blur-sm shadow-lg">
                      <summary className="list-none cursor-pointer select-none px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-slate-200">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                          </svg>
                          <span className="text-sm font-semibold font-inter">Panel Count</span>
                        </div>
                        <svg className="w-4 h-4 text-slate-400 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </summary>
                      <div className="px-3 pb-3">
                        <div className="flex flex-wrap gap-2">
                          {['5-Panel', '6-Panel', '7-Panel'].map(panel => (
                            <label key={panel} className="cursor-pointer">
                              <input 
                                type="checkbox" 
                                className="peer sr-only"
                                checked={filters.panelCount.includes(panel)}
                                onChange={(e) => handleFilterChange('panelCount', panel, e.target.checked)}
                              />
                              <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm hover:bg-white/10 peer-checked:bg-[#84cc16] peer-checked:text-black transition">
                                {panel}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </details>

                    {/* Price Tier */}
                    <details open className="group rounded-xl border border-white/20 bg-black/40 backdrop-blur-sm shadow-lg">
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
                                checked={filters.priceTier === tier.display}
                                onChange={(e) => handleFilterChange('priceTier', tier.display, e.target.checked)}
                              />
                              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.06] border border-white/15 text-sm hover:bg-white/[0.12] backdrop-blur-sm peer-checked:bg-gradient-to-r peer-checked:from-[#84cc16]/20 peer-checked:to-[#65a30d]/20 peer-checked:border-lime-300/40 transition-all duration-300 shadow-sm">
                                {tier.display} ({tier.system})
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </details>

                    {/* Feel */}
                    <details open className="group rounded-xl border border-white/20 bg-black/40 backdrop-blur-sm shadow-lg">
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
                              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.06] border border-white/15 text-sm text-slate-200 hover:bg-white/[0.12] backdrop-blur-sm peer-checked:bg-gradient-to-r peer-checked:from-[#84cc16] peer-checked:to-[#65a30d] peer-checked:text-black peer-checked:border-lime-300/40 transition-all duration-300 shadow-sm">
                                {feel}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </details>

                    {/* Color */}
                    <details open className="group rounded-xl border border-white/20 bg-black/40 backdrop-blur-sm shadow-lg">
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
                            { name: 'Black', color: 'bg-black border-white/30' },
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
                              <div className="flex flex-col items-center gap-1 p-2 rounded-lg bg-white/[0.06] border border-white/15 hover:bg-white/[0.12] backdrop-blur-sm peer-checked:bg-white/[0.15] peer-checked:border-lime-300/40 transition-all duration-300 shadow-sm">
                                <div className={`w-6 h-6 rounded-full border-2 ${colorItem.color}`}></div>
                                <span className="text-xs text-slate-300">{colorItem.name}</span>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                    </details>

                    {/* Season */}
                    <details open className="group rounded-xl border border-white/20 bg-black/40 backdrop-blur-sm shadow-lg">
                      <summary className="list-none cursor-pointer select-none px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-slate-200">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                          </svg>
                          <span className="text-sm font-semibold font-inter">Season</span>
                        </div>
                        <svg className="w-4 h-4 text-slate-400 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </summary>
                      <div className="px-3 pb-3">
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { name: 'Spring', icon: '🌸' },
                            { name: 'Summer', icon: '☀️' },
                            { name: 'Fall', icon: '🍂' },
                            { name: 'Winter', icon: '❄️' }
                          ].map(season => (
                            <label key={season.name} className="cursor-pointer">
                              <input 
                                type="checkbox" 
                                className="peer sr-only"
                                checked={filters.season.includes(season.name)}
                                onChange={(e) => handleFilterChange('season', season.name, e.target.checked)}
                              />
                              <span className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-white/[0.06] border border-white/15 text-sm hover:bg-white/[0.12] backdrop-blur-sm peer-checked:bg-gradient-to-r peer-checked:from-[#84cc16]/20 peer-checked:to-[#65a30d]/20 peer-checked:border-lime-300/40 transition-all duration-300 shadow-sm">
                                <span>{season.icon}</span>
                                <span className="text-slate-200">{season.name}</span>
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </details>

                  </div>
                  
                  {/* Desktop Apply */}
                  <div className="mt-4 flex items-center gap-3">
                    <button 
                      onClick={resetFilters}
                      className="h-11 px-5 rounded-full bg-white/5 border border-white/10 text-slate-200 hover:bg-white/10 hover:border-white/20 transition text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400/40 w-full"
                    >
                      Reset
                    </button>
                    <button className="h-11 px-6 rounded-full bg-[#84cc16] text-black shadow-[0_0_0_2px_rgba(255,255,255,0.06)] hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(132,204,22,0.4)] transition-all duration-300 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-[#84cc16]/50 w-full">
                      Apply
                    </button>
                  </div>
                </div>
              </div>
            </aside>

            {/* Product Area */}
            <section className="col-span-12 md:col-span-9 lg:col-span-9">
              {/* Search Bar - Admin Dashboard Style */}
              <div className="rounded-2xl bg-white/[0.08] border border-white/20 ring-1 ring-white/[0.08] backdrop-blur-2xl p-4 shadow-2xl mb-4">
                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      type="text"
                      placeholder="Search products, vendors, colors..."
                      value={searchQuery}
                      onChange={(e) => handleAdminSearch(e.target.value)}
                      className="w-full h-12 pl-10 pr-4 rounded-xl bg-white/[0.08] backdrop-blur-md border border-white/20 text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#84cc16]/50 focus:border-[#84cc16]/30 transition-all duration-200 shadow-lg hover:bg-white/[0.12] hover:border-white/30"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => handleAdminSearch('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-white/10 transition-colors"
                      >
                        <svg className="w-4 h-4 text-slate-400 hover:text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Controls Row */}
              <div className="rounded-2xl bg-white/[0.08] border border-white/20 ring-1 ring-white/[0.08] backdrop-blur-2xl p-4 shadow-2xl">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-slate-300 font-inter">{filteredAndSortedProducts.length} results</span>
                    {/* Active Filter Chips */}
                    <div className="hidden md:flex items-center gap-2">
                      {(filters.capProfile.length > 0 || filters.capShape.length > 0 || filters.panelCount.length > 0 || filters.priceTier || filters.feel.length > 0 || filters.color.length > 0 || filters.season.length > 0 || filters.vendor.length > 0 || filters.productType.length > 0) && (
                        <>
                          <span className="text-xs text-slate-400">Active:</span>
                          {filters.capProfile.map(profile => (
                            <button 
                              key={profile}
                              onClick={() => handleFilterChange('capProfile', profile, false)}
                              className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition text-xs"
                            >
                              {profile}
                              <svg className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          ))}
                          {filters.capShape.map(shape => (
                            <button 
                              key={shape}
                              onClick={() => handleFilterChange('capShape', shape, false)}
                              className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition text-xs"
                            >
                              {shape}
                              <svg className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          ))}
                          {filters.panelCount.map(panel => (
                            <button 
                              key={panel}
                              onClick={() => handleFilterChange('panelCount', panel, false)}
                              className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition text-xs"
                            >
                              {panel}
                              <svg className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          ))}
                          {filters.feel.map(feel => (
                            <button 
                              key={feel}
                              onClick={() => handleFilterChange('feel', feel, false)}
                              className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition text-xs"
                            >
                              {feel}
                              <svg className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          ))}
                          {filters.color.map(color => (
                            <button 
                              key={color}
                              onClick={() => handleFilterChange('color', color, false)}
                              className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition text-xs"
                            >
                              {color}
                              <svg className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          ))}
                          {filters.season.map(season => (
                            <button 
                              key={season}
                              onClick={() => handleFilterChange('season', season, false)}
                              className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition text-xs"
                            >
                              {season}
                              <svg className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          ))}
                          {filters.vendor.map(vendor => (
                            <button 
                              key={vendor}
                              onClick={() => handleFilterChange('vendor', vendor, false)}
                              className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition text-xs"
                            >
                              {vendor}
                              <svg className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          ))}
                          {filters.priceTier && (
                            <button 
                              onClick={() => handleFilterChange('priceTier', filters.priceTier, false)}
                              className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition text-xs"
                            >
                              {filters.priceTier}
                              <svg className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          )}
                          {filters.productType.map(type => (
                            <button 
                              key={type}
                              onClick={() => handleFilterChange('productType', type, false)}
                              className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition text-xs"
                            >
                              {type}
                              <svg className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          ))}
                        </>
                      )}
                    </div>
                  </div>
                  
                  {/* Sort + Views + Quote Button */}
                  <div className="flex items-center gap-3">
                    {/* Sort Select */}
                    <div className="relative glass-dropdown">
                      <select 
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="appearance-none h-10 pl-3 pr-9 rounded-xl bg-white/[0.08] backdrop-blur-md border border-white/20 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#84cc16]/50 focus:border-[#84cc16]/30 transition-all duration-200 shadow-lg hover:bg-white/[0.12] hover:border-white/30"
                        style={{
                          backgroundImage: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
                          boxShadow: '0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)'
                        }}
                      >
                        <option value="featured" className="bg-gray-900/95 backdrop-blur-sm text-white border-b border-white/10">Sort: Featured</option>
                        <option value="name-asc" className="bg-gray-900/95 backdrop-blur-sm text-white border-b border-white/10">Name: A to Z</option>
                        <option value="name-desc" className="bg-gray-900/95 backdrop-blur-sm text-white border-b border-white/10">Name: Z to A</option>
                        <option value="newest" className="bg-gray-900/95 backdrop-blur-sm text-white">Newest</option>
                      </select>
                      <svg className="pointer-events-none w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                    
                    {/* View Toggle */}
                    <div className="hidden sm:flex items-center rounded-xl bg-white/5 border border-white/10 overflow-hidden">
                      <button 
                        onClick={() => setViewMode('grid')}
                        className={`h-10 w-10 grid place-items-center hover:bg-white/10 border-r border-white/10 transition ${viewMode === 'grid' ? 'bg-white/10' : ''}`}
                        aria-label="Grid View"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                        </svg>
                      </button>
                      <button 
                        onClick={() => setViewMode('list')}
                        className={`h-10 w-10 grid place-items-center hover:bg-white/10 transition ${viewMode === 'list' ? 'bg-white/10' : ''}`}
                        aria-label="List View"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                        </svg>
                      </button>
                    </div>
                    
                    {/* Start a Quick Quote Button */}
                    <Link
                      href="/quote-request"
                      className="h-10 px-5 rounded-xl bg-gradient-to-r from-[#84cc16] to-[#65a30d] text-black shadow-[0_0_0_2px_rgba(255,255,255,0.1)] hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(132,204,22,0.6)] transition-all duration-300 will-change-transform focus:outline-none focus:ring-2 focus:ring-[#84cc16]/60 font-bold text-sm flex items-center justify-center backdrop-blur-sm"
                    >
                      Start a Quick Quote
                    </Link>
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
                  <div className="w-16 h-16 mx-auto mb-4 bg-white/5 border border-white/10 rounded-full flex items-center justify-center">
                    <span className="text-2xl">🔍</span>
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">No products found</h3>
                  <p className="text-slate-400">Try adjusting your filters or search terms.</p>
                </div>
              ) : (
                <div className={`mt-6 ${viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10' : 'space-y-6'} max-w-none`}>
                  {filteredAndSortedProducts.map((product, index) => {
                    if (!product.mainImage?.url) return null;
                    
                    return (
                      <div
                        key={`${product.slug}-${index}`}
                        className={`group rounded-2xl bg-white/[0.08] border border-white/20 ring-1 ring-white/[0.08] backdrop-blur-2xl overflow-hidden hover:border-white/30 hover:bg-white/[0.12] transition-all duration-300 shadow-2xl hover:shadow-[0_20px_60px_rgba(0,0,0,0.4)] hover:-translate-y-1 ${
                          viewMode === 'list' ? 'flex items-center' : ''
                        }`}
                      >
                        {/* Product Image Container */}
                        <div className={`relative ${viewMode === 'list' ? 'w-48 flex-shrink-0' : ''}`}>
                          <div className={`${viewMode === 'list' ? 'aspect-square' : 'aspect-[4/3.45]'} overflow-hidden`}>
                            <Image
                              src={product.mainImage.url}
                              alt={product.mainImage.alt}
                              width={600}
                              height={450}
                              className="w-full h-full object-cover group-hover:scale-[1.05] transition duration-700 ease-out"
                              priority={index < 6}
                            />
                          </div>
                          
                          {/* Enhanced glass overlay gradient */}
                          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-black/10 opacity-70"></div>
                          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                          {/* Glass reflection effect */}
                          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent opacity-20"></div>
                          
                          {/* Badge - could be dynamic based on product properties */}
                          {index % 3 === 0 && (
                            <div className="absolute top-3 left-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#84cc16]/20 border border-[#84cc16]/30 text-sm text-slate-800 font-semibold">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                              </svg>
                              Featured
                            </div>
                          )}
                          
                          {/* Quick Action */}
                          <button className="absolute top-3 right-3 h-10 w-10 grid place-items-center rounded-full bg-white/10 border border-white/15 backdrop-blur-md hover:bg-white/20 transition focus:outline-none focus:ring-2 focus:ring-purple-400/40" aria-label="Save">
                            <svg className="w-4 h-4 text-white/90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                            </svg>
                          </button>
                        </div>
                        
                        {/* Product Info */}
                        <div className={`${viewMode === 'list' ? 'p-6 flex-1 flex items-center justify-between' : 'p-6'}`}>
                          <div className={`${viewMode === 'list' ? 'flex-1' : ''}`}>
                            <div className="flex items-center justify-between">
                              <div className="min-w-0">
                                <h3 className="text-[18px] font-bold tracking-tight text-white truncate drop-shadow-sm">{product.name}</h3>
                                <div className="mt-0.5 flex items-center gap-2">
                                  <span className="text-sm font-semibold text-white/90 drop-shadow-sm">OPM Gear</span>
                                  <span className="text-white/20">•</span>
                                  <span className="text-sm font-medium text-white/80">{product.priceTier || 'Standard'}</span>
                                </div>
                              </div>
                              {viewMode === 'grid' && (
                                <div className="text-right">
                                  <div className="text-[15px] font-semibold text-white">Custom</div>
                                  <div className="text-sm text-slate-400">Quote</div>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className={`${viewMode === 'list' ? 'flex items-center gap-3' : 'mt-5 flex items-center gap-3'}`}>
                            <Link
                              href={product.productType === 'resale' ? `/dashboard/admin/products/${product._id}` : `/customize/${product.slug}`}
                              className="flex-1 h-11 px-4 rounded-full bg-gradient-to-r from-[#84cc16] to-[#65a30d] text-black font-bold text-sm shadow-[0_0_0_2px_rgba(255,255,255,0.1)] hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(132,204,22,0.5)] transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#84cc16]/60 flex items-center justify-center backdrop-blur-sm"
                            >
                              Click to Customize
                            </Link>
                            <Link
                              href={`/quote-request?product=${product.slug}&name=${encodeURIComponent(product.name)}`}
                              className="flex-1 h-11 px-4 rounded-full bg-white/[0.08] border border-white/20 text-white font-semibold text-sm hover:bg-white/[0.15] hover:border-white/30 backdrop-blur-md transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 flex items-center justify-center shadow-lg hover:shadow-xl hover:-translate-y-0.5"
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

              {/* Pagination */}
              {filteredAndSortedProducts.length > 0 && (
                <div className="mt-8 flex items-center justify-between">
                  <span className="text-sm text-slate-400">Page 1 of 1</span>
                  <div className="flex items-center gap-2">
                    <button 
                      disabled
                      className="h-10 px-4 rounded-full bg-white/5 border border-white/10 text-slate-400 text-sm transition focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                      Prev
                    </button>
                    <button className="h-10 px-4 rounded-full bg-[#84cc16] text-black text-sm font-semibold hover:-translate-y-0.5 hover:shadow-[0_4px_20px_rgba(132,204,22,0.4)] transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#84cc16]/50">
                      1
                    </button>
                    <button 
                      disabled
                      className="h-10 px-4 rounded-full bg-white/5 border border-white/10 text-slate-400 text-sm transition focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      Next
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
