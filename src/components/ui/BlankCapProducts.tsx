"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { getBaseProductPricing } from "@/lib/pricing";

interface BlankCapProduct {
  _id: string;
  name: string;
  slug: string;
  mainImage: {
    url: string;
    alt: string;
    name?: string;
  };
  description?: string;
  priceTier?: string;
  _type: string;
  productType?: string;
  billShape?: string;
  profile?: string;
  closureType?: string;
  structure?: string;
  basePrice?: number;
}

async function fetchBlankCapProducts(): Promise<BlankCapProduct[]> {
  try {
    console.log('🏭 BlankCapProducts: Fetching products via API endpoint...');
    
    const response = await fetch('/api/blank-cap-products', {
      cache: 'no-store' // Force fresh data
    });
    
    if (!response.ok) {
      console.error('🏭 BlankCapProducts: API response not ok:', response.status, response.statusText);
      throw new Error(`API call failed: ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`🏭 BlankCapProducts: API returned ${data.products?.length || 0} products`);
    
    return data.products || [];
  } catch (error) {
    console.error('❌ BlankCapProducts: Error fetching via API:', error);
    return [];
  }
}

const BlankCapProducts: React.FC = () => {
  const [products, setProducts] = useState<BlankCapProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoading(true);
        const fetchedProducts = await fetchBlankCapProducts();
        setProducts(fetchedProducts);
        setError(null);
      } catch (err) {
        console.error('Error loading blank cap products:', err);
        setError('Failed to load products');
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, []);

  const getPriceRange = (priceTier: string = 'Tier 1') => {
    try {
      const pricing = getBaseProductPricing(priceTier);
      return {
        min: Math.min(pricing.price48, pricing.price144, pricing.price576),
        max: Math.max(pricing.price48, pricing.price144, pricing.price576)
      };
    } catch {
      return { min: 12.99, max: 24.99 };
    }
  };

  const getBadgeInfo = (product: BlankCapProduct) => {
    const tier = product.priceTier || 'Tier 1';
    const priceRange = getPriceRange(tier);
    
    if (tier === 'Tier 1' || priceRange.min < 15) {
      return { 
        text: 'Best Value', 
        color: 'orange',
        bgClass: 'bg-orange-500/15',
        ringClass: 'ring-orange-400/30',
        textClass: 'text-orange-200/90'
      };
    } else if (tier === 'Tier 2') {
      return { 
        text: 'Premium', 
        color: 'red',
        bgClass: 'bg-red-500/15',
        ringClass: 'ring-red-400/30',
        textClass: 'text-red-200/90'
      };
    } else {
      return { 
        text: 'Luxury', 
        color: 'purple',
        bgClass: 'bg-purple-500/15',
        ringClass: 'ring-purple-400/30',
        textClass: 'text-purple-200/90'
      };
    }
  };

  const getBorderColor = (index: number) => {
    const colors = [
      'border-orange-500/30',
      'border-red-500/30', 
      'border-purple-500/30',
      'border-blue-500/30',
      'border-green-500/30',
      'border-yellow-500/30',
      'border-pink-500/30',
      'border-lime-500/30'
    ];
    return colors[index % colors.length];
  };

  const getCustomizeLinkColor = (index: number) => {
    const colors = [
      'text-orange-400 hover:text-orange-300',
      'text-red-400 hover:text-red-300',
      'text-purple-400 hover:text-purple-300', 
      'text-blue-400 hover:text-blue-300',
      'text-green-400 hover:text-green-300',
      'text-yellow-400 hover:text-yellow-300',
      'text-pink-400 hover:text-pink-300',
      'text-lime-400 hover:text-lime-300'
    ];
    return colors[index % colors.length];
  };

  if (loading) {
    return (
      <div className="mt-20">
        <div className="mb-12 text-center">
          <h2 className="text-4xl lg:text-5xl font-bricolage font-semibold text-white mb-4">
            Our Blank Cap Products
          </h2>
          <p className="text-lg text-stone-300 max-w-2xl mx-auto">
            Customize your perfect cap with our premium blank products, ready for your unique design.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, index) => (
            <div key={index} className="relative overflow-hidden rounded-3xl min-h-[420px] flex flex-col glass-morphism animate-pulse">
              <div className="p-8 flex flex-col h-full justify-between">
                <div className="mb-6">
                  <div className="w-full aspect-square glass-morphism-subtle rounded-xl mb-4"></div>
                  <div className="w-20 h-6 glass-morphism-subtle rounded-full"></div>
                </div>
                <div>
                  <div className="w-3/4 h-8 glass-morphism-subtle rounded mb-3"></div>
                  <div className="space-y-2 mb-4">
                    <div className="w-full h-4 glass-morphism-subtle rounded"></div>
                    <div className="w-2/3 h-4 glass-morphism-subtle rounded"></div>
                  </div>
                  <div className="w-32 h-6 glass-morphism-subtle rounded"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-20">
        <div className="mb-12 text-center">
          <h2 className="text-4xl lg:text-5xl font-bricolage font-semibold text-white mb-4">
            Our Blank Cap Products
          </h2>
          <p className="text-lg text-red-400 max-w-2xl mx-auto">
            {error}. Please try again later.
          </p>
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="mt-20">
        <div className="mb-12 text-center">
          <h2 className="text-4xl lg:text-5xl font-bricolage font-semibold text-white mb-4">
            Our Blank Cap Products
          </h2>
          <p className="text-lg text-stone-400 max-w-2xl mx-auto">
            No blank cap products available at the moment. Please check back later.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-20">
      <div className="mb-12 text-center">
        <h2 className="text-4xl lg:text-5xl font-bricolage font-semibold text-white mb-4">
          Our Blank Cap Products
        </h2>
        <p className="text-lg text-stone-300 max-w-2xl mx-auto">
          Customize your perfect cap with our premium blank products, ready for your unique design.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {products.map((product, index) => {
          const badge = getBadgeInfo(product);
          const borderColor = getBorderColor(index);
          const linkColor = getCustomizeLinkColor(index);
          const priceRange = getPriceRange(product.priceTier);

          return (
            <article 
              key={product._id} 
              className={`relative overflow-hidden rounded-3xl hover:scale-105 transition-all duration-300 min-h-[420px] flex flex-col glass-morphism-dark glass-hover-dark ${borderColor} shadow-[0_2.8px_2.2px_rgba(0,_0,_0,_0.034),_0_6.7px_5.3px_rgba(0,_0,_0,_0.048),_0_12.5px_10px_rgba(0,_0,_0,_0.06),_0_22.3px_17.9px_rgba(0,_0,_0,_0.072),_0_41.8px_33.4px_rgba(0,_0,_0,_0.086),_0_100px_80px_rgba(0,_0,_0,_0.12)]`}
            >
              <div className="relative z-10 p-8 flex flex-col h-full justify-between">
                <div className="mb-6">
                  <img 
                    src={product.mainImage.url} 
                    alt={product.mainImage.alt} 
                    className="w-full aspect-square object-cover rounded-xl mb-4" 
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = '/uploads/home/Category/6-Panel Perforated Cap.webp'; // Fallback image
                    }}
                  />
                  <span className={`px-3 py-1 rounded-full text-xs font-medium uppercase tracking-wider ${badge.textClass} ring-1 ${badge.ringClass} ${badge.bgClass} backdrop-blur-sm font-sans`}>
                    {badge.text}
                  </span>
                </div>
                
                <div>
                  <h3 className="text-2xl text-white tracking-tight mb-3 font-bricolage font-semibold">
                    {product.name}
                  </h3>
                  
                  <p className="text-sm leading-relaxed text-stone-300 mb-3 font-sans line-clamp-2">
                    {product.description || `Professional-grade ${product.name.toLowerCase()} ready for custom embroidery, perfect for teams, businesses, and personal branding.`}
                  </p>

                  <div className="mb-4">
                    <div className="flex items-center gap-2 text-sm text-stone-400 mb-2">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"/>
                        <path d="M12 6v6l4 2"/>
                      </svg>
                      <span className="font-sans">{product.priceTier || 'Tier 1'} Pricing</span>
                    </div>
                    <div className="text-white font-semibold text-lg font-sans">
                      ${priceRange.min.toFixed(2)} - ${priceRange.max.toFixed(2)}
                    </div>
                    <div className="text-xs text-stone-400 font-sans">per unit (volume pricing)</div>
                  </div>

                  <Link 
                    href={`/customize/${product.slug}`} 
                    className={`inline-flex items-center gap-2 ${linkColor} transition-colors text-sm font-medium`}
                  >
                    Customize Now
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14"></path>
                      <path d="m12 5 7 7-7 7"></path>
                    </svg>
                  </Link>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {products.length >= 8 && (
        <div className="text-center mt-12">
          <Link 
            href="/store?filter=blank" 
            className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full glass-button glass-hover text-white font-medium font-sans"
          >
            View All Blank Cap Products
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14"></path>
              <path d="m12 5 7 7-7 7"></path>
            </svg>
          </Link>
        </div>
      )}
    </div>
  );
};

export default BlankCapProducts;