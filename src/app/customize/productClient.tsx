// src/app/customize/[slug]/ProductClient.tsx
'use client';

import Image from "next/image";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import CustomerInfoForm from "../../components/forms/CustomerInfoForm";
import { useAuth } from "../../components/auth/AuthContext";
import AddToCartButton from "../../components/cart/AddToCartButton";
import TempLogoUploader from "../../components/customize/TempLogoUploader";
import { calculateUnitPrice } from "@/lib/pricing";

interface Pricing {
  price48: number;
  price144: number;
  price576: number;
  price1152: number;
  price2880: number;
  price10000: number;
}

interface CostBreakdown {
  baseProductCost: number;
  logoSetupCosts: Array<{
    name: string;
    cost: number;
    unitPrice: number;
    details: string;
  }>;
  accessoriesCosts: Array<{
    name: string;
    cost: number;
    unitPrice: number;
  }>;
  closureCosts: Array<{
    name: string;
    cost: number;
    unitPrice: number;
  }>;
  premiumFabricCosts: Array<{
    name: string;
    cost: number;
    unitPrice: number;
  }>;
  deliveryCosts: Array<{
    name: string;
    cost: number;
    unitPrice: number;
  }>;
  moldChargeCosts: Array<{
    name: string;
    cost: number;
    unitPrice: number;
    waived: boolean;
    waiverReason?: string;
  }>;
  totalCost: number;
  totalUnits: number;
}

interface ImageWithAlt {
  url: string;
  alt: string;
  name: string;
}

interface ProductOption {
  id: string;
  name: string;
  slug: string;
  choices: Array<{
    value: string;
    label: string;
    image?: string;
  }>;
}

interface Product {
  name: string;
  description: string;
  mainImage: ImageWithAlt;
  itemData: ImageWithAlt[];
  frontColorImages: ImageWithAlt[];
  leftColorImages: ImageWithAlt[];
  rightColorImages: ImageWithAlt[];
  backColorImages: ImageWithAlt[];
  capColorImage: ImageWithAlt[];
  splitColorOptions: ImageWithAlt[];
  triColorOptions: ImageWithAlt[];
  camoColorOption: ImageWithAlt[];
  pricing: Pricing;
  productOptions: ProductOption[];
  priceTier?: string; // Add price tier field
  // Cap Style Setup fields for resale products
  billShape?: 'Slight Curved' | 'Curved' | 'Flat';
  profile?: 'High' | 'Mid' | 'Low';
  closureType?: 'Snapback' | 'Velcro' | 'Fitted' | 'Stretched';
  structure?: 'Structured' | 'Unstructured' | 'Foam';
  fabricSetup?: string;
  customFabricSetup?: string;
  productType?: 'factory' | 'resale';
}

interface ProductClientProps {
  product: Product;
  prefillOrderId?: string;
  reorder?: boolean;
}

function getImageForView(viewList: ImageWithAlt[], colorName: string): ImageWithAlt | null {
  // Try to match by name first, then by alt text as fallback
  // Also handle case-insensitive matching
  const normalizedColorName = colorName.toLowerCase().trim();
  return viewList.find((img) => {
    const imgName = (img.name || '').toLowerCase().trim();
    const imgAlt = (img.alt || '').toLowerCase().trim();
    return imgName === normalizedColorName || imgAlt === normalizedColorName;
  }) || null;
}

// VolumePricingCard Component with Quantity-Based Animation
function VolumePricingCard({ 
  pricing, 
  selectedColors 
}: {
  pricing: Pricing;
  selectedColors: Record<string, { sizes: Record<string, number> }>;
}) {
  const totalQuantity = Object.values(selectedColors).reduce((sum, colorData) => 
    sum + Object.values(colorData.sizes).reduce((sizeSum, qty) => sizeSum + qty, 0), 0
  );

  const pricingTiers = [
    { qty: 48, label: '48+', price: pricing.price48, color: 'from-gray-500 to-gray-600', icon: '🏃‍♂️' },
    { qty: 144, label: '144+', price: pricing.price144, color: 'from-blue-500 to-blue-600', icon: '🚀' },
    { qty: 576, label: '576+', price: pricing.price576, color: 'from-green-500 to-green-600', icon: '⚡' },
    { qty: 1152, label: '1152+', price: pricing.price1152, color: 'from-yellow-500 to-orange-500', icon: '🔥' },
    { qty: 2880, label: '2880+', price: pricing.price2880, color: 'from-purple-500 to-purple-600', icon: '💎' },
    { qty: 10000, label: '10000+', price: pricing.price10000, color: 'from-pink-500 to-red-500', icon: '👑' }
  ];

  // Find current tier
  const currentTier = pricingTiers.reduce((prev, current) => 
    totalQuantity >= current.qty ? current : prev
  );
  
  const nextTier = pricingTiers.find(tier => tier.qty > totalQuantity);
  const progress = nextTier ? 
    Math.min(((totalQuantity - currentTier.qty) / (nextTier.qty - currentTier.qty)) * 100, 100) : 100;

  const hasReachedThreshold = totalQuantity >= 48; // Start animations at any tier

  // Dynamic color schemes based on current tier
  const getTierColorScheme = () => {
    if (totalQuantity >= 1152) {
      return {
        background: 'from-purple-50 via-pink-50 to-rose-50 dark:from-purple-900/20 dark:via-pink-900/20 dark:to-rose-900/20',
        border: 'border-purple-200/50 dark:border-purple-700/50',
        title: 'from-purple-600 via-pink-600 to-rose-600 dark:from-purple-400 dark:via-pink-400 dark:to-rose-400',
        subtitle: 'text-purple-600/80 dark:text-purple-300/80',
        icon: 'from-purple-500 via-pink-500 to-rose-500',
        iconGlow: 'from-purple-400 via-pink-400 to-rose-400',
        orbs: ['from-purple-400 to-pink-400', 'from-pink-400 to-rose-400'],
        particles: ['bg-purple-400', 'bg-pink-400'],
        cardBorder: 'ring-4 ring-purple-500/20 bg-gradient-to-br from-purple-50/30 to-pink-50/30 dark:from-purple-900/20 dark:to-pink-900/20'
      };
    } else if (totalQuantity >= 576) {
      return {
        background: 'from-green-50 via-emerald-50 to-teal-50 dark:from-green-900/20 dark:via-emerald-900/20 dark:to-teal-900/20',
        border: 'border-green-200/50 dark:border-green-700/50',
        title: 'from-green-600 via-emerald-600 to-teal-600 dark:from-green-400 dark:via-emerald-400 dark:to-teal-400',
        subtitle: 'text-green-600/80 dark:text-green-300/80',
        icon: 'from-green-500 via-emerald-500 to-teal-500',
        iconGlow: 'from-green-400 via-emerald-400 to-teal-400',
        orbs: ['from-green-400 to-emerald-400', 'from-emerald-400 to-teal-400'],
        particles: ['bg-green-400', 'bg-emerald-400'],
        cardBorder: 'ring-4 ring-green-500/20 bg-gradient-to-br from-green-50/30 to-emerald-50/30 dark:from-green-900/20 dark:to-emerald-900/20'
      };
    } else if (totalQuantity >= 144) {
      return {
        background: 'from-blue-50 via-cyan-50 to-sky-50 dark:from-blue-900/20 dark:via-cyan-900/20 dark:to-sky-900/20',
        border: 'border-blue-200/50 dark:border-blue-700/50',
        title: 'from-blue-600 via-cyan-600 to-sky-600 dark:from-blue-400 dark:via-cyan-400 dark:to-sky-400',
        subtitle: 'text-blue-600/80 dark:text-blue-300/80',
        icon: 'from-blue-500 via-cyan-500 to-sky-500',
        iconGlow: 'from-blue-400 via-cyan-400 to-sky-400',
        orbs: ['from-blue-400 to-cyan-400', 'from-cyan-400 to-sky-400'],
        particles: ['bg-blue-400', 'bg-cyan-400'],
        cardBorder: 'ring-4 ring-blue-500/20 bg-gradient-to-br from-blue-50/30 to-cyan-50/30 dark:from-blue-900/20 dark:to-cyan-900/20'
      };
    } else if (totalQuantity >= 48) {
      return {
        background: 'from-orange-50 via-amber-50 to-yellow-50 dark:from-orange-900/20 dark:via-amber-900/20 dark:to-yellow-900/20',
        border: 'border-orange-200/50 dark:border-orange-700/50',
        title: 'from-orange-600 via-amber-600 to-yellow-600 dark:from-orange-400 dark:via-amber-400 dark:to-yellow-400',
        subtitle: 'text-orange-600/80 dark:text-orange-300/80',
        icon: 'from-orange-500 via-amber-500 to-yellow-500',
        iconGlow: 'from-orange-400 via-amber-400 to-yellow-400',
        orbs: ['from-orange-400 to-amber-400', 'from-amber-400 to-yellow-400'],
        particles: ['bg-orange-400', 'bg-amber-400'],
        cardBorder: 'ring-4 ring-orange-500/20 bg-gradient-to-br from-orange-50/30 to-amber-50/30 dark:from-orange-900/20 dark:to-amber-900/20'
      };
    } else {
      return {
        background: 'from-gray-50 via-slate-50 to-zinc-50 dark:from-gray-900/20 dark:via-slate-900/20 dark:to-zinc-900/20',
        border: 'border-gray-200/50 dark:border-gray-700/50',
        title: 'from-gray-600 via-slate-600 to-zinc-600 dark:from-gray-400 dark:via-slate-400 dark:to-zinc-400',
        subtitle: 'text-gray-600/80 dark:text-gray-300/80',
        icon: 'from-gray-500 via-slate-500 to-zinc-500',
        iconGlow: 'from-gray-400 via-slate-400 to-zinc-400',
        orbs: ['from-gray-400 to-slate-400', 'from-slate-400 to-zinc-400'],
        particles: ['bg-gray-400', 'bg-slate-400'],
        cardBorder: 'border-white/20 dark:border-gray-700/20 hover:border-gray-300/50 dark:hover:border-gray-600/50'
      };
    }
  };

  const colorScheme = getTierColorScheme();

  return (
    <div className={`group bg-white/70 dark:bg-gray-800/70 backdrop-blur-md rounded-2xl p-6 shadow-2xl border transition-all duration-500 hover:scale-[1.02] hover:shadow-3xl ${
      hasReachedThreshold 
        ? colorScheme.cardBorder
        : 'border-white/20 dark:border-gray-700/20 hover:border-blue-300/50 dark:hover:border-blue-600/50'
    } hover:bg-white/80 dark:hover:bg-gray-800/80`}>
      {/* Redesigned Volume Pricing Header */}
      <div className={`relative overflow-hidden bg-gradient-to-br ${colorScheme.background} rounded-3xl p-6 mb-6 border ${colorScheme.border} transition-all duration-700`}>
        {/* Animated Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className={`absolute top-0 left-0 w-32 h-32 bg-gradient-to-br ${colorScheme.orbs[0]} rounded-full blur-3xl animate-pulse`}></div>
          <div className={`absolute bottom-0 right-0 w-24 h-24 bg-gradient-to-br ${colorScheme.orbs[1]} rounded-full blur-2xl animate-pulse delay-1000`}></div>
        </div>
        
        <div className="relative flex items-center justify-between">
          {/* Left Section - Title and Description */}
          <div className="flex items-center space-x-4">
            <div className="relative">
              <div className={`w-14 h-14 bg-gradient-to-br ${colorScheme.icon} rounded-2xl flex items-center justify-center shadow-xl transform hover:scale-110 transition-all duration-500`}>
                <div className={`absolute inset-0 bg-gradient-to-br ${colorScheme.iconGlow} rounded-2xl blur-lg opacity-50 animate-pulse`}></div>
                <span className="relative text-white text-2xl">💰</span>
              </div>
              {/* Floating particles effect */}
              <div className={`absolute -top-1 -right-1 w-3 h-3 ${colorScheme.particles[0]} rounded-full animate-bounce delay-500 transition-colors duration-700`}></div>
              <div className={`absolute -bottom-1 -left-1 w-2 h-2 ${colorScheme.particles[1]} rounded-full animate-bounce delay-1000 transition-colors duration-700`}></div>
            </div>
            
            <div className="space-y-1">
              <h3 className={`text-2xl font-bold bg-gradient-to-r ${colorScheme.title} bg-clip-text text-transparent transition-all duration-700`}>
                Volume Pricing
              </h3>
              <p className={`text-sm ${colorScheme.subtitle} font-medium flex items-center space-x-2 transition-colors duration-700`}>
                <span className={`inline-block w-2 h-2 ${colorScheme.particles[0]} rounded-full animate-pulse`}></span>
                <span>Save more with higher quantities</span>
                <span className="text-green-500">📈</span>
              </p>
            </div>
          </div>

          {/* Right Section - Current Tier Display */}
          {totalQuantity > 0 && (
            <div className="relative">
              <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl px-6 py-4 border border-white/50 dark:border-gray-700/50 shadow-xl">
                <div className="flex flex-col items-center space-y-2">
                  <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                    Current Tier
                  </span>
                  <div className="flex items-center space-x-3">
                    <div className={`relative px-4 py-2 rounded-xl text-white bg-gradient-to-r ${currentTier.color} shadow-lg transform hover:scale-105 transition-transform duration-200`}>
                      <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent rounded-xl"></div>
                      <div className="relative flex items-center space-x-2">
                        <span className="text-lg">{currentTier.icon}</span>
                        <span className="font-bold text-lg">{totalQuantity}</span>
                        <span className="text-sm font-medium opacity-90">units</span>
                      </div>
                      {/* Animated glow effect */}
                      <div className="absolute -inset-1 bg-gradient-to-r from-transparent via-white/30 to-transparent rounded-xl opacity-0 animate-pulse"></div>
                    </div>
                  </div>
                  {/* Tier label */}
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">
                    {currentTier.label} Level
                  </span>
                </div>
              </div>
              
              {/* Floating success indicator */}
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center animate-bounce">
                <span className="text-white text-xs">✓</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Progress Bar to Next Tier */}
      {totalQuantity > 0 && nextTier && (
        <div className="mb-4 p-3 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-blue-900 dark:text-blue-200">
              Progress to {nextTier.label} tier
            </span>
            <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
              {nextTier.qty - totalQuantity} more needed
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-700 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mt-1">
            <span>{currentTier.label}</span>
            <span>{nextTier.label}</span>
          </div>
        </div>
      )}

      {/* Pricing Tiers Grid */}
      <div className="grid grid-cols-2 gap-3">
        {pricingTiers.map((tier, index) => {
          const isCurrentTier = totalQuantity >= tier.qty && (index === pricingTiers.length - 1 || totalQuantity < pricingTiers[index + 1].qty);
          const isReached = totalQuantity >= tier.qty;
          const shouldAnimate = hasReachedThreshold && isReached;

          return (
            <div 
              key={tier.label} 
              className={`relative overflow-hidden rounded-lg border-2 transition-all duration-500 ${
                isCurrentTier 
                  ? `border-transparent bg-gradient-to-r ${tier.color} text-white shadow-lg transform scale-105 animate-price-glow` 
                  : isReached
                  ? 'border-green-300 bg-green-50 dark:bg-green-900/20 dark:border-green-600 animate-tier-unlock'
                  : 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700'
              } ${shouldAnimate ? 'animate-pulse' : ''}`}
            >
              {/* Animated Background Effect */}
              {shouldAnimate && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
              )}
              
              <div className="relative p-3 flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">{tier.icon}</span>
                  <span className={`text-sm font-medium ${
                    isCurrentTier ? 'text-white' : isReached ? 'text-green-700 dark:text-green-300' : 'text-gray-700 dark:text-gray-300'
                  }`}>
                    {tier.label}
                  </span>
                </div>
                <div className="text-right">
                  <span className={`text-sm font-bold ${
                    isCurrentTier ? 'text-white' : isReached ? 'text-green-800 dark:text-green-200' : 'text-gray-900 dark:text-gray-100'
                  }`}>
                    ${tier.price.toFixed(2)}
                  </span>
                  {isCurrentTier && (
                    <div className="text-xs text-white/80 font-medium">ACTIVE</div>
                  )}
                  {isReached && !isCurrentTier && (
                    <div className="text-xs text-green-600 dark:text-green-400 font-medium">✓ UNLOCKED</div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Savings Display */}
      {totalQuantity >= 144 && (
        <div className="mt-4 p-3 bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 rounded-lg border border-green-300 dark:border-green-600 animate-savings-popup">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-green-600 dark:text-green-400 text-lg">💰</span>
              <span className="text-sm font-semibold text-green-800 dark:text-green-200">
                You're saving compared to 48+ pricing!
              </span>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-green-700 dark:text-green-300">
                ${((pricing.price48 - currentTier.price) * totalQuantity).toFixed(2)}
              </div>
              <div className="text-xs text-green-600 dark:text-green-400">total savings</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper function to calculate volume discount information
function calculateVolumeDiscount(unitPrice: number, totalUnits: number, pricingData: any) {
  // Find the pricing tier that matches the unit price
  const pricingTiers = [
    { name: '48+', price: pricingData.price48, minQty: 48 },
    { name: '144+', price: pricingData.price144, minQty: 144 },
    { name: '576+', price: pricingData.price576, minQty: 576 },
    { name: '1152+', price: pricingData.price1152, minQty: 1152 },
    { name: '2880+', price: pricingData.price2880, minQty: 2880 },
    { name: '10000+', price: pricingData.price10000, minQty: 10000 }
  ];

  // Find current tier
  const currentTier = pricingTiers.find(tier => Math.abs(tier.price - unitPrice) < 0.01);
  const regularPrice = pricingData.price48; // Regular price is always 48+ pricing
  
  if (!currentTier || currentTier.minQty <= 48) {
    return null; // No discount
  }

  const savings = regularPrice - unitPrice;
  const savingsPercentage = ((savings / regularPrice) * 100);
  const totalSavings = savings * totalUnits;

  return {
    regularPrice,
    discountedPrice: unitPrice,
    savings,
    savingsPercentage,
    totalSavings,
    tierName: currentTier.name
  };
}

// Helper function to get customization pricing for a specific item
async function getCustomizationPricing(itemName: string) {
  try {
    const response = await fetch('/api/customization-pricing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemName }),
    });

    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.error('Error fetching customization pricing:', error);
  }
  
  // Fallback to base product pricing if customization pricing not found
  return null;
}

// Component to display discounted pricing with savings notification
function DiscountedPriceDisplay({ 
  unitPrice, 
  totalUnits, 
  pricingData, 
  cost, 
  name,
  baseUnitPrice 
}: {
  unitPrice: number;
  totalUnits: number;
  pricingData: any;
  cost: number;
  name: string;
  baseUnitPrice?: number;
}) {
  const [customizationPricing, setCustomizationPricing] = useState<any>(null);
  const [isLoadingPricing, setIsLoadingPricing] = useState(false);

  // Load customization pricing for this specific item
  useEffect(() => {
    const loadCustomizationPricing = async () => {
      setIsLoadingPricing(true);
      try {
        const response = await fetch('/api/customization-pricing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ itemName: name }),
        });

        if (response.ok) {
          const data = await response.json();
          setCustomizationPricing(data);
        }
      } catch (error) {
        console.error('Error loading customization pricing:', error);
      } finally {
        setIsLoadingPricing(false);
      }
    };

    loadCustomizationPricing();
  }, [name]);

  // For logo setup costs with baseUnitPrice, calculate discount manually
  if (baseUnitPrice && baseUnitPrice > unitPrice) {
    const savings = baseUnitPrice - unitPrice;
    const savingsPercentage = ((savings / baseUnitPrice) * 100);
    const totalSavings = savings * totalUnits;
    
    // Determine tier name based on total units
    let tierName = '48+';
    if (totalUnits >= 10000) tierName = '10000+';
    else if (totalUnits >= 2880) tierName = '2880+';
    else if (totalUnits >= 1152) tierName = '1152+';
    else if (totalUnits >= 576) tierName = '576+';
    else if (totalUnits >= 144) tierName = '144+';

    return (
      <div className="text-right">
        {/* Regular price crossed out */}
        <div className="text-gray-400 dark:text-gray-500 line-through text-xs">
          ${baseUnitPrice.toFixed(2)} each
        </div>
        {/* Discounted price in bold */}
        <span className="text-green-600 dark:text-green-400 font-semibold">
          ${unitPrice.toFixed(2)} each
        </span>
        <div className="font-bold text-green-700 dark:text-green-300">
          ${cost.toFixed(2)}
        </div>
        {/* Savings notification */}
        <div className="mt-1 p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
          <div className="flex items-center space-x-1">
            <span className="text-green-600 dark:text-green-400 text-xs">💰</span>
            <span className="text-xs font-medium text-green-800 dark:text-green-200">
              Save ${totalSavings.toFixed(2)} ({savingsPercentage.toFixed(0)}% off)
            </span>
          </div>
          <div className="text-xs text-green-600 dark:text-green-400 mt-1">
            {tierName} volume discount applied
          </div>
        </div>
      </div>
    );
  }

  // Use customization pricing if available, otherwise fall back to base product pricing
  const pricingToUse = customizationPricing || pricingData;
  const discountInfo = calculateVolumeDiscount(unitPrice, totalUnits, pricingToUse);

  if (isLoadingPricing) {
    return (
      <div className="text-right">
        <div className="animate-pulse">
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16 mb-1"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
        </div>
      </div>
    );
  }

  if (!discountInfo) {
    // No discount, show regular pricing
    return (
      <div className="text-right">
        <span className="text-gray-500 dark:text-gray-400">${unitPrice.toFixed(2)} each</span>
        <div className="font-medium text-gray-900 dark:text-gray-100">
          ${cost.toFixed(2)}
        </div>
      </div>
    );
  }

  return (
    <div className="text-right">
      {/* Regular price crossed out */}
      <div className="text-gray-400 dark:text-gray-500 line-through text-xs">
        ${discountInfo.regularPrice.toFixed(2)} each
      </div>
      {/* Discounted price in bold */}
      <span className="text-green-600 dark:text-green-400 font-semibold">
        ${discountInfo.discountedPrice.toFixed(2)} each
      </span>
      <div className="font-bold text-green-700 dark:text-green-300">
        ${cost.toFixed(2)}
      </div>
      {/* Savings notification */}
      <div className="mt-1 p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
        <div className="flex items-center space-x-1">
          <span className="text-green-600 dark:text-green-400 text-xs">💰</span>
          <span className="text-xs font-medium text-green-800 dark:text-green-200">
            Save ${discountInfo.totalSavings.toFixed(2)} ({discountInfo.savingsPercentage.toFixed(0)}% off)
          </span>
        </div>
        <div className="text-xs text-green-600 dark:text-green-400 mt-1">
          {discountInfo.tierName} volume discount applied
        </div>
      </div>
    </div>
  );
}

// CostCalculator Component
function CostCalculator({ 
  selectedColors,
  logoSetupSelections, 
  multiSelectOptions, 
  selectedOptions, 
  productPricing,
  shipmentValidation,
  product,
  previousOrderNumber,
  setPreviousOrderNumber
}: {
  selectedColors: Record<string, { sizes: Record<string, number> }>;
  logoSetupSelections: Record<string, { position?: string; size?: string; application?: string }>;
  multiSelectOptions: Record<string, string[]>;
  selectedOptions: Record<string, string>;
  productPricing: Pricing;
  shipmentValidation: {
    isValidating: boolean;
    isValid: boolean | null;
    shipmentData: any | null;
    error: string | null;
  };
  product: Product;
  previousOrderNumber: string;
  setPreviousOrderNumber: (value: string) => void;
}) {
  const [costBreakdown, setCostBreakdown] = useState<CostBreakdown | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate cost whenever dependencies change (with debounce)
  useEffect(() => {
    const timer = setTimeout(() => {
      const calculateCost = async () => {
        if (Object.keys(selectedColors).length === 0) {
          setCostBreakdown(null);
          return;
        }

        setIsLoading(true);
        setError(null);

        try {
          const response = await fetch('/api/calculate-cost', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
            selectedColors,
            logoSetupSelections,
            multiSelectOptions,
            selectedOptions,
            baseProductPricing: productPricing,
            shipmentData: shipmentValidation.isValid ? shipmentValidation.shipmentData : null,
            fabricSetup: (() => {
              if (selectedOptions['fabric-setup'] === 'Other') {
                return 'Other';
              } else if (selectedOptions['fabric-setup']) {
                return selectedOptions['fabric-setup'];
              } else {
                return product.fabricSetup || null;
              }
            })(),
            customFabricSetup: selectedOptions['fabric-setup'] === 'Other' 
              ? selectedOptions['custom-fabric'] 
              : product.customFabricSetup,
            productType: product.productType,
            previousOrderNumber: previousOrderNumber?.trim() || undefined,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to calculate cost');
        }

        const data = await response.json();
        setCostBreakdown(data);
      } catch (err) {
        console.error('Error calculating cost:', err);
        setError('Failed to calculate cost. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

      calculateCost();
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [selectedColors, logoSetupSelections, multiSelectOptions, selectedOptions, productPricing, shipmentValidation.isValid, shipmentValidation.shipmentData, previousOrderNumber]);

  if (isLoading) {
    return (
      <div className="space-y-6 transition-opacity duration-200 ease-in-out">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-6"></div>
          <div className="space-y-4">
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-4/6"></div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/6"></div>
            <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded mt-6"></div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
          </div>
        </div>
        <div className="text-center text-sm text-gray-500 dark:text-gray-400 mt-4">
          Calculating costs...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
            <span className="text-white text-xs">!</span>
          </div>
          <span className="text-sm font-medium text-red-800 dark:text-red-200">{error}</span>
        </div>
      </div>
    );
  }

  if (!costBreakdown) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
          <span className="text-2xl">💰</span>
        </div>
        <p className="text-sm">Select a Color option to see cost calculation.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Base Product Cost */}
      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Base Product Cost</h4>
        <div className="space-y-2">
          {Object.entries(selectedColors).map(([colorName, colorData]) => {
            const colorTotalQuantity = Object.values(colorData.sizes).reduce((sum, qty) => sum + qty, 0);
            const totalQuantity = Object.values(selectedColors).reduce((sum, colorData) => 
              sum + Object.values(colorData.sizes).reduce((colorSum, qty) => colorSum + qty, 0), 0
            );
            
            let unitPrice = productPricing.price48;
            if (totalQuantity >= 10000) unitPrice = productPricing.price10000;
            else if (totalQuantity >= 2880) unitPrice = productPricing.price2880;
            else if (totalQuantity >= 1152) unitPrice = productPricing.price1152;
            else if (totalQuantity >= 576) unitPrice = productPricing.price576;
            else if (totalQuantity >= 144) unitPrice = productPricing.price144;
            
            const lineTotal = colorTotalQuantity * unitPrice;
            
            return (
              <div key={colorName} className="flex justify-between items-center text-sm">
                <span className="text-gray-700 dark:text-gray-300">
                  {colorName} × {colorTotalQuantity}
                </span>
                <div className="text-right">
                  <span className="text-gray-500 dark:text-gray-400">${unitPrice.toFixed(2)} each</span>
                  <div className="font-medium text-gray-900 dark:text-gray-100">
                    ${lineTotal.toFixed(2)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Logo Setup Costs */}
      {costBreakdown.logoSetupCosts.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Logo Setup Costs</h4>
          <div className="space-y-2">
            {costBreakdown.logoSetupCosts.map((logoCost, index) => (
              <div key={index} className="flex justify-between items-start text-sm">
                <div className="text-gray-700 dark:text-gray-300">
                  <div>{logoCost.name} × {costBreakdown.totalUnits}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {logoCost.details}
                  </div>
                </div>
                <DiscountedPriceDisplay
                  unitPrice={logoCost.unitPrice}
                  totalUnits={costBreakdown.totalUnits}
                  pricingData={productPricing}
                  cost={logoCost.cost}
                  name={logoCost.name}
                  baseUnitPrice={(logoCost as any).baseUnitPrice}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Accessories Costs */}
      {costBreakdown.accessoriesCosts.length > 0 && (
        <div className="bg-lime-50 dark:bg-lime-900/20 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Accessories</h4>
          <div className="space-y-2">
            {costBreakdown.accessoriesCosts.map((accessoryCost, index) => (
              <div key={index} className="flex justify-between items-start text-sm">
                <span className="text-gray-700 dark:text-gray-300">
                  {accessoryCost.name} × {costBreakdown.totalUnits}
                </span>
                <DiscountedPriceDisplay
                  unitPrice={accessoryCost.unitPrice}
                  totalUnits={costBreakdown.totalUnits}
                  pricingData={productPricing}
                  cost={accessoryCost.cost}
                  name={accessoryCost.name}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Closure Type Costs */}
      {costBreakdown.closureCosts.length > 0 && (
        <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Closure Type</h4>
          <div className="space-y-2">
            {costBreakdown.closureCosts.map((closureCost, index) => (
              <div key={index} className="flex justify-between items-start text-sm">
                <span className="text-gray-700 dark:text-gray-300">
                  {closureCost.name} × {costBreakdown.totalUnits}
                </span>
                <DiscountedPriceDisplay
                  unitPrice={closureCost.unitPrice}
                  totalUnits={costBreakdown.totalUnits}
                  pricingData={productPricing}
                  cost={closureCost.cost}
                  name={closureCost.name}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Premium Fabric Costs */}
      {costBreakdown.premiumFabricCosts && costBreakdown.premiumFabricCosts.length > 0 && (
        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Premium Fabric</h4>
          <div className="space-y-2">
            {costBreakdown.premiumFabricCosts.map((fabricCost, index) => (
              <div key={index} className="flex justify-between items-start text-sm">
                <span className="text-gray-700 dark:text-gray-300">
                  {fabricCost.name} × {costBreakdown.totalUnits}
                </span>
                <DiscountedPriceDisplay
                  unitPrice={fabricCost.unitPrice}
                  totalUnits={costBreakdown.totalUnits}
                  pricingData={productPricing}
                  cost={fabricCost.cost}
                  name={fabricCost.name}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Delivery Costs */}
      {costBreakdown.deliveryCosts.length > 0 && (
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Delivery</h4>
          <div className="space-y-2">
            {costBreakdown.deliveryCosts.map((deliveryCost, index) => (
              <div key={index} className="flex justify-between items-start text-sm">
                <span className="text-gray-700 dark:text-gray-300">
                  {deliveryCost.name} × {costBreakdown.totalUnits}
                </span>
                <DiscountedPriceDisplay
                  unitPrice={deliveryCost.unitPrice}
                  totalUnits={costBreakdown.totalUnits}
                  pricingData={productPricing}
                  cost={deliveryCost.cost}
                  name={deliveryCost.name}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Services Costs */}
      {costBreakdown.servicesCosts && costBreakdown.servicesCosts.length > 0 && (
        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Services</h4>
          <div className="space-y-2">
            {costBreakdown.servicesCosts.map((serviceCost, index) => (
              <div key={index} className="flex justify-between items-start text-sm">
                <span className="text-gray-700 dark:text-gray-300">
                  {serviceCost.name}
                </span>
                <div className="text-right">
                  <div className="font-bold text-purple-700 dark:text-purple-300">
                    ${serviceCost.cost.toFixed(2)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mold Charges */}
      {costBreakdown.moldChargeCosts && costBreakdown.moldChargeCosts.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Mold Development Charges</h4>
          <div className="space-y-2">
            {costBreakdown.moldChargeCosts.map((moldCharge, index) => (
              <div key={index} className="space-y-1">
                <div className="flex justify-between items-start text-sm">
                  <span className="text-gray-700 dark:text-gray-300">
                    {moldCharge.name}
                  </span>
                  {moldCharge.waived ? (
                    <div className="text-right">
                      <div className="text-gray-500 dark:text-gray-400 line-through text-xs">
                        ${moldCharge.unitPrice.toFixed(2)}
                      </div>
                      <div className="text-green-600 dark:text-green-400 text-sm font-medium">
                        WAIVED
                      </div>
                    </div>
                  ) : (
                    <div className="text-amber-600 dark:text-amber-400 font-medium text-sm">
                      ${moldCharge.cost.toFixed(2)}
                    </div>
                  )}
                </div>
                {moldCharge.waived && moldCharge.waiverReason && (
                  <div className="text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded">
                    {moldCharge.waiverReason}
                  </div>
                )}
                {!moldCharge.waived && (
                  <div className="text-xs text-amber-600 dark:text-amber-400">
                    One-time development cost for new mold
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Total Savings Summary */}
      {(() => {
        const allCosts = [
          ...costBreakdown.logoSetupCosts,
          ...costBreakdown.accessoriesCosts,
          ...costBreakdown.closureCosts,
          ...(costBreakdown.premiumFabricCosts || []),
          ...costBreakdown.deliveryCosts,
          ...(costBreakdown.moldChargeCosts || [])
        ];
        
        const totalSavings = allCosts.reduce((total, cost) => {
          // For logo setup costs with baseUnitPrice, calculate savings manually
          if ((cost as any).baseUnitPrice) {
            const savings = (cost as any).baseUnitPrice - cost.unitPrice;
            const totalSavings = savings * costBreakdown.totalUnits;
            return total + totalSavings;
          }
          
          // For other costs, use the standard discount calculation
          const pricingToUse = productPricing;
          const discountInfo = calculateVolumeDiscount(cost.unitPrice, costBreakdown.totalUnits, pricingToUse);
          return total + (discountInfo?.totalSavings || 0);
        }, 0);

        if (totalSavings > 0) {
          return (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-green-600 dark:text-green-400 text-lg">🎉</span>
                  <div>
                    <div className="text-sm font-semibold text-green-800 dark:text-green-200">
                      Total Volume Savings
                    </div>
                    <div className="text-xs text-green-600 dark:text-green-400">
                      Applied across all options
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-green-700 dark:text-green-300">
                    -${totalSavings.toFixed(2)}
                  </div>
                  <div className="text-xs text-green-600 dark:text-green-400">
                    Volume discount applied
                  </div>
                </div>
              </div>
            </div>
          );
        }
        return null;
      })()}

      {/* Total Cost */}
      <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
        <div className="flex justify-between items-center">
          <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">Total Cost</span>
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              ${costBreakdown.totalCost.toFixed(2)}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {costBreakdown.totalUnits} total units
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProductClient({ product, prefillOrderId, reorder = false }: ProductClientProps) {
  const router = useRouter();
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedColors, setSelectedColors] = useState<Record<string, { sizes: Record<string, number>; customName?: string; isCustom?: boolean }>>({}); // Color name -> { sizes: { sizeValue: quantity }, customName?: string, isCustom?: boolean }
  const [customColorInputs, setCustomColorInputs] = useState<Record<string, string>>({}); // Color key -> custom name input
  const [standaloneCustomColors, setStandaloneCustomColors] = useState<string[]>([]); // For creating colors directly with custom names
  const [newCustomColorInput, setNewCustomColorInput] = useState<string>(''); // Input for new standalone custom color
  const [mainImage, setMainImage] = useState<ImageWithAlt>(product.mainImage);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [logoSetupSelections, setLogoSetupSelections] = useState<Record<string, {
    position?: string;
    size?: string;
    application?: string;
  }>>({}); // Logo choice value -> sub-options
  const [multiSelectOptions, setMultiSelectOptions] = useState<Record<string, string[]>>({}); // Option slug -> selected values
  const [previousOrderNumber, setPreviousOrderNumber] = useState<string>(''); // Previous order number for mold reuse
  const [showOptionalOptions, setShowOptionalOptions] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [showOrderForm, setShowOrderForm] = useState<boolean>(false);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState<boolean>(false);
  const [cartMessage, setCartMessage] = useState<string>('');
  const [cartError, setCartError] = useState<string>('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [additionalInstructions, setAdditionalInstructions] = useState<string>('');
  const [showCapStyleSetup, setShowCapStyleSetup] = useState<boolean>(false);
  // Holds files returned from the upload API; fixes missing setter error
  const [uploadedLogoFiles, setUploadedLogoFiles] = useState<any[]>([]);
  const [showCustomizeOptions, setShowCustomizeOptions] = useState<boolean>(false);
  const [showAccessories, setShowAccessories] = useState<boolean>(false);
  const [showFabricOptions, setShowFabricOptions] = useState<boolean>(false);
  const [showAllColors, setShowAllColors] = useState<boolean>(false);
  const [shipmentNumber, setShipmentNumber] = useState<string>('');
  const [shipmentValidation, setShipmentValidation] = useState<{
    isValidating: boolean;
    isValid: boolean | null;
    shipmentData: any | null;
    error: string | null;
  }>({
    isValidating: false,
    isValid: null,
    shipmentData: null,
    error: null
  });
  const [availableShipments, setAvailableShipments] = useState<any[]>([]);
  const [autoConfigFastestShipment, setAutoConfigFastestShipment] = useState<boolean>(false);
  const [showShipmentSuggestions, setShowShipmentSuggestions] = useState(false);
  const [uploadError, setUploadError] = useState<string>('');
  const [uploadSuccess, setUploadSuccess] = useState<string>('');

  // Steps for guided experience
  const steps = [
    { id: 1, title: 'Choose Colors & Sizes', description: 'Select colors and sizes with quantities', completed: Object.keys(selectedColors).length > 0 },
    { id: 2, title: 'Customize Options', description: 'Configure logos and accessories', completed: (multiSelectOptions['logo-setup'] || []).length > 0 },
    { id: 3, title: 'Add Services', description: 'Choose delivery and services', completed: showOptionalOptions },
    { id: 4, title: 'Save Order', description: 'Save your order details', completed: showOrderForm }
  ];

  // Helpers for Cap Style defaults
  function getDefaultBillShapeFromProductName(name: string): string {
    if (name.toLowerCase().includes('slight curved')) return 'Slight Curved';
    if (name.toLowerCase().includes('curved')) return 'Curved';
    return 'Flat';
  }

  // Logo Setup Constants
  const logoPositions = ['Front', 'Left', 'Right', 'Back', 'Upper Bill', 'Under Bill', 'Velcro'];
  const logoSizes = ['Large', 'Medium', 'Small'];
  const logoApplications = ['Run', 'Satin', 'Direct'];

  // Logo defaults based on position and decoration type
  const getDefaultLogoSize = (position: string) => position === 'Front' ? 'Large' : 'Small';
  const getDefaultApplication = (decorationType: string) => {
    const typeMap: Record<string, string> = {
      '3D Embroidery': 'Direct',
      'Flat Embroidery': 'Direct', 
      'Leather Patch': 'Run',
      'Rubber Patch': 'Run',
      'Printed Patch': 'Satin',
      'Sublimated Patch': 'Satin',
      'Woven Patch': 'Satin'
    };
    return typeMap[decorationType] || 'Direct';
  };

  // Logo position preset order
  const logoPositionOrder = ['Front', 'Back', 'Left', 'Right', 'Upper Bill', 'Under Bill'];
  
  // Get next available position for logo
  const getNextAvailablePosition = (excludeLogoValue?: string) => {
    const usedPositions = Object.entries(logoSetupSelections)
      .filter(([key, config]) => key !== excludeLogoValue && config.position)
      .map(([, config]) => config.position);
    
    return logoPositionOrder.find(pos => !usedPositions.includes(pos)) || '';
  };

  // Shipment validation functions
  const validateShipmentNumber = async (buildNumber: string) => {
    if (!buildNumber.trim()) {
      setShipmentValidation({
        isValidating: false,
        isValid: null,
        shipmentData: null,
        error: null
      });
      return;
    }

    setShipmentValidation(prev => ({
      ...prev,
      isValidating: true,
      error: null
    }));

    try {
      console.log('🔍 Validating shipment build number:', buildNumber);
      const response = await fetch('/api/shipments?includeOrders=true');
      const data = await response.json();
      
      if (response.ok) {
        console.log('📋 Available shipments:', data.shipments?.map((s: any) => s.buildNumber));
        const shipment = data.shipments?.find((s: any) => 
          s.buildNumber.toLowerCase() === buildNumber.toLowerCase()
        );
        
        if (shipment) {
          console.log('✅ Shipment found:', { id: shipment.id, buildNumber: shipment.buildNumber });
          setShipmentValidation({
            isValidating: false,
            isValid: true,
            shipmentData: shipment,
            error: null
          });
        } else {
          console.log('❌ Shipment not found for build number:', buildNumber);
          setShipmentValidation({
            isValidating: false,
            isValid: false,
            shipmentData: null,
            error: 'Shipment build number not found'
          });
        }
      } else {
        setShipmentValidation({
          isValidating: false,
          isValid: false,
          shipmentData: null,
          error: 'Error validating shipment number'
        });
      }
    } catch (error) {
      setShipmentValidation({
        isValidating: false,
        isValid: false,
        shipmentData: null,
        error: 'Network error while validating shipment'
      });
    }
  };

  const loadAvailableShipments = async () => {
    try {
      const response = await fetch('/api/shipments?includeOrders=true');
      const data = await response.json();
      
      if (response.ok && data.shipments) {
        setAvailableShipments(data.shipments);
        
        // Auto-assign fastest shipment if auto-config is enabled
        if (autoConfigFastestShipment && data.shipments.length > 0) {
          const fastestShipment = getFastestShipment(data.shipments);
          if (fastestShipment) {
            setShipmentNumber(fastestShipment.buildNumber);
            // Trigger validation for the auto-assigned shipment
            await validateShipmentNumber(fastestShipment.buildNumber);
          }
        }
      }
    } catch (error) {
      console.error('Error loading available shipments:', error);
    }
  };

  const getFastestShipment = (shipments: any[]) => {
    // Priority order: PRIORITY_FEDEX (fastest) > SAVER_UPS > AIR_FREIGHT > SEA_FREIGHT
    const shippingMethodPriority = {
      'PRIORITY_FEDEX': 1,
      'SAVER_UPS': 2,
      'AIR_FREIGHT': 3,
      'SEA_FREIGHT': 4
    };
    
    // Filter for active shipments (not cancelled) and sort by shipping method priority
    const activeShipments = shipments.filter(shipment => 
      shipment.status !== 'CANCELLED' && 
      shipment.status !== 'DELIVERED'
    );
    
    if (activeShipments.length === 0) return null;
    
    return activeShipments.sort((a, b) => {
      const priorityA = shippingMethodPriority[a.shippingMethod as keyof typeof shippingMethodPriority] || 999;
      const priorityB = shippingMethodPriority[b.shippingMethod as keyof typeof shippingMethodPriority] || 999;
      
      // If same priority, prefer shipment with more recent estimated departure
      if (priorityA === priorityB) {
        if (a.estimatedDeparture && b.estimatedDeparture) {
          return new Date(b.estimatedDeparture).getTime() - new Date(a.estimatedDeparture).getTime();
        }
        return 0;
      }
      
      return priorityA - priorityB;
    })[0];
  };

  const getShipmentSuggestions = (query: string) => {
    if (!query.trim()) return [];
    
    return availableShipments
      .filter(shipment => 
        shipment.buildNumber.toLowerCase().includes(query.toLowerCase())
      )
      .slice(0, 5);
  };

  // Helper function to check if Leather Patch or Rubber Patch is selected
  const hasLeatherOrRubberPatchSelected = () => {
    const logoSetupOptions = multiSelectOptions['logo-setup'] || [];
    return logoSetupOptions.some(option => 
      option === 'Leather Patch' || option === 'Rubber Patch'
    );
  };

  // Helper functions for custom color names
  const handleCustomColorNameChange = (colorKey: string, customName: string) => {
    setCustomColorInputs(prev => ({
      ...prev,
      [colorKey]: customName
    }));
  };

  const applyCustomColorName = (colorKey: string) => {
    const customName = customColorInputs[colorKey];
    if (!customName || !customName.trim()) return;

    setSelectedColors(prev => {
      const updatedColors = { ...prev };
      const colorData = updatedColors[colorKey];
      
      if (colorData) {
        updatedColors[colorKey] = {
          ...colorData,
          customName: customName.trim(),
          isCustom: true
        };
      }
      
      return updatedColors;
    });

    // Clear the input after applying
    setCustomColorInputs(prev => {
      const updated = { ...prev };
      delete updated[colorKey];
      return updated;
    });
  };

  const removeCustomColorName = (colorKey: string) => {
    setSelectedColors(prev => {
      const updatedColors = { ...prev };
      const colorData = updatedColors[colorKey];
      
      if (colorData) {
        const { customName, isCustom, ...rest } = colorData;
        updatedColors[colorKey] = rest;
      }
      
      return updatedColors;
    });
  };

  const getDisplayColorName = (colorKey: string, colorData: any) => {
    return colorData?.customName || colorKey;
  };

  // Helper functions for standalone custom colors
  const addStandaloneCustomColor = () => {
    const colorName = newCustomColorInput.trim();
    if (!colorName) return;
    
    // Check if color already exists
    if (selectedColors.hasOwnProperty(colorName)) {
      alert('A color with this name already exists. Please choose a different name.');
      return;
    }
    
    // Add the custom color with default size and quantity
    const sizeOption = product.productOptions.find(option => option.slug === 'size');
    let defaultSize = 'medium';
    
    // Find the exact value for Medium size from the product options
    if (sizeOption) {
      const mediumChoice = sizeOption.choices.find(choice => 
        choice.label.toLowerCase().includes('medium') || 
        choice.label.toLowerCase().includes('m') ||
        choice.value.toLowerCase().includes('medium')
      );
      if (mediumChoice) {
        defaultSize = mediumChoice.value;
      } else if (sizeOption.choices.length > 0) {
        defaultSize = sizeOption.choices[0].value;
      }
    }
    
    setSelectedColors(prev => ({
      ...prev,
      [colorName]: {
        sizes: { [defaultSize]: 48 },
        customName: colorName,
        isCustom: true
      }
    }));
    
    // Clear the input
    setNewCustomColorInput('');
    
    // Move to step 2 if on step 1
    if (currentStep === 1) setCurrentStep(2);
  };

  const removeStandaloneCustomColor = (colorName: string) => {
    setSelectedColors(prev => {
      const newColors = { ...prev };
      delete newColors[colorName];
      return newColors;
    });
  };

  // Helper functions for color-size selection
  const handleColorSelection = (colorName: string) => {
    try {
      console.log('🎨 Color selection clicked:', colorName);
      const isSelected = selectedColors.hasOwnProperty(colorName);
      console.log('🔍 Is selected:', isSelected);
      
      if (isSelected) {
      // Remove color and all its sizes
      setSelectedColors(prev => {
        const newColors = { ...prev };
        delete newColors[colorName];
        return newColors;
      });
    } else {
      // Add color with default Medium size and quantity
      const sizeOption = product.productOptions.find(option => option.slug === 'size');
      let defaultSize = 'medium';
      
      // Find the exact value for Medium size from the product options
      if (sizeOption) {
        const mediumChoice = sizeOption.choices.find(choice => 
          choice.label.toLowerCase().includes('medium') || 
          choice.value.toLowerCase().includes('medium')
        );
        if (mediumChoice) {
          defaultSize = mediumChoice.value;
        }
      }
      
      setSelectedColors(prev => ({
        ...prev,
        [colorName]: {
          sizes: { [defaultSize]: 48 } // Default to Medium size with 48 quantity
        }
      }));
      console.log('✅ Color added successfully:', colorName);
    }
    } catch (error) {
      console.error('❌ Error in handleColorSelection:', error);
      console.error('Error stack:', error.stack);
    }
  };

  const handleSizeSelectionForColor = (colorName: string, sizeValue: string) => {
    const colorData = selectedColors[colorName];
    if (!colorData) return;

    const isSelected = colorData.sizes.hasOwnProperty(sizeValue);
    
    if (isSelected) {
      // Remove size from this color
      setSelectedColors(prev => ({
        ...prev,
        [colorName]: {
          sizes: Object.fromEntries(
            Object.entries(prev[colorName].sizes).filter(([key]) => key !== sizeValue)
          )
        }
      }));
    } else {
      // Add size to this color with default quantity
      setSelectedColors(prev => ({
        ...prev,
        [colorName]: {
          sizes: {
            ...prev[colorName].sizes,
            [sizeValue]: 48
          }
        }
      }));
    }
  };

  const updateSizeQuantityForColor = (colorName: string, sizeValue: string, quantity: number | string, enforceMinimum: boolean = false) => {
    // Handle empty string or invalid input during typing
    if (quantity === '' || quantity === null || quantity === undefined) {
      // Set to 0 to indicate empty state (will show empty input)
      setSelectedColors(prev => ({
        ...prev,
        [colorName]: {
          sizes: {
            ...prev[colorName].sizes,
            [sizeValue]: 0
          }
        }
      }));
      return;
    }
    
    const numQuantity = typeof quantity === 'string' ? parseInt(quantity) : quantity;
    
    // Allow any valid number during typing, but enforce minimum when requested
    if (!isNaN(numQuantity)) {
      if (enforceMinimum && numQuantity < 48) {
        // Enforce minimum value
        setSelectedColors(prev => ({
          ...prev,
          [colorName]: {
            sizes: {
              ...prev[colorName].sizes,
              [sizeValue]: 48
            }
          }
        }));
      } else if (numQuantity >= 0) {
        // Allow any non-negative value during typing
        setSelectedColors(prev => ({
          ...prev,
          [colorName]: {
            sizes: {
              ...prev[colorName].sizes,
              [sizeValue]: numQuantity
            }
          }
        }));
      }
    }
  };

  // Helper functions for multi-select
  const toggleMultiSelect = (optionSlug: string, value: string) => {
    setMultiSelectOptions(prev => {
      const current = prev[optionSlug] || [];
      const newSelection = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value];
      return { ...prev, [optionSlug]: newSelection };
    });
    
    // Auto-assign position for logo setup
    if (optionSlug === 'logo-setup') {
      const current = multiSelectOptions[optionSlug] || [];
      const isAdding = !current.includes(value);
      
      if (isAdding) {
        // Add logo with auto-assigned position
        const nextPosition = getNextAvailablePosition();
        if (nextPosition) {
          setLogoSetupSelections(prev => ({
            ...prev,
            [value]: {
              position: nextPosition,
              size: getDefaultLogoSize(nextPosition),
              application: getDefaultApplication(value)
            }
          }));
        }
      } else {
        // Remove logo and free up its position
        setLogoSetupSelections(prev => {
          const newSelections = { ...prev };
          delete newSelections[value];
          return newSelections;
        });
      }
    }
  };









  // Safely derive a human-friendly color name from image data
  const deriveColorName = (img: ImageWithAlt): string => {
    const fromFields = (img.name || img.alt || '').trim();
    if (fromFields) return fromFields;
    try {
      const url = img.url || '';
      const filename = url.split('/').pop() || '';
      const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');
      return nameWithoutExt
        .replace(/[-_]+/g, ' ')
        .replace(/\s+/g, ' ')
        .replace(/\(.*?\)/g, '')
        .trim();
    } catch {
      return '';
    }
  };

  const colorTypes: Record<string, ImageWithAlt[]> = {
    Solid: product.capColorImage && product.capColorImage.length > 0 
      ? product.capColorImage 
      : product.frontColorImages || [],
    Split: product.splitColorOptions || [],
    Tri: product.triColorOptions || [],
    Camo: product.camoColorOption || [],
  };

  // Get all unique colors from all available types
  const getAllColors = (): ImageWithAlt[] => {
    const allColors: ImageWithAlt[] = [];
    Object.values(colorTypes).forEach(typeImages => {
      typeImages.forEach(img => {
        const normalizedName = deriveColorName(img).toLowerCase().trim();
        if (!allColors.find(existing => deriveColorName(existing).toLowerCase().trim() === normalizedName)) {
          allColors.push(img);
        }
      });
    });
    return allColors;
  };

  const availableTypes = Object.keys(colorTypes).filter((type) => colorTypes[type].length > 0);
  
  // Add "All" option if there are multiple types available
  const typeOptions = useMemo(() => 
    availableTypes.length > 1 ? ['All', ...availableTypes] : availableTypes,
    [availableTypes]
  );

  // Set default color type in useEffect to avoid rendering issues
  useEffect(() => {
    if (typeOptions.length > 0 && !selectedType) {
      setSelectedType(typeOptions[0]);
    }
  }, [typeOptions, selectedType]);

  // Initialize default option values
  useEffect(() => {
    const defaultOptions: Record<string, string> = {};
    const defaultMultiSelect: Record<string, string[]> = {};
    
    product.productOptions.forEach((option) => {
      // Set defaults for single-select options
      if (option.slug === 'logo-setup') {
        defaultOptions[option.slug] = 'Blank';
      } else if (option.slug === 'delivery-type') {
        const regularChoice = option.choices.find(c => c.label.toLowerCase() === 'regular');
        defaultOptions[option.slug] = regularChoice?.value || option.choices[0]?.value || '';
      }
      
      // Set defaults for multi-select options
      if (option.slug === 'accessories' || option.slug === 'services') {
        defaultMultiSelect[option.slug] = [];
      }
      
      // Cap Style Setup defaults (if present in CMS)
      if (option.slug === 'bill-shape') {
        // For resale products, use preset value if available, otherwise use product name-based default
        const desired = (product.productType === 'resale' && product.billShape) 
          ? product.billShape 
          : getDefaultBillShapeFromProductName(product.name);
        const match = option.choices.find(c => c.label.toLowerCase() === desired.toLowerCase());
        defaultOptions[option.slug] = match?.value || option.choices[0]?.value || '';
      }
      if (option.slug === 'profile') {
        // For resale products, use preset value if available, otherwise use 'Mid' default
        const desired = (product.productType === 'resale' && product.profile) 
          ? product.profile 
          : 'Mid';
        const match = option.choices.find(c => c.label.toLowerCase() === desired.toLowerCase());
        defaultOptions[option.slug] = match?.value || option.choices[0]?.value || '';
      }
      if (option.slug === 'closure-type') {
        // For resale products, use preset value if available, otherwise use 'Snapback' default
        const desired = (product.productType === 'resale' && product.closureType) 
          ? product.closureType 
          : 'Snapback';
        const match = option.choices.find(c => c.label.toLowerCase() === desired.toLowerCase());
        defaultOptions[option.slug] = match?.value || option.choices[0]?.value || '';
      }
      if (option.slug === 'structure') {
        // For resale products, use preset value if available, otherwise use 'Structured' default
        const desired = (product.productType === 'resale' && product.structure) 
          ? product.structure 
          : 'Structured';
        const match = option.choices.find(c => c.label.toLowerCase() === desired.toLowerCase());
        defaultOptions[option.slug] = match?.value || option.choices[0]?.value || '';
      }
    });
    
    setSelectedOptions(defaultOptions);
    setMultiSelectOptions(defaultMultiSelect);
    
    // Debug logging for cap style preselection (only for resale products)
    if (product.productType === 'resale') {
      console.log('🔧 Cap Style Setup preselection for resale product:', {
        productName: product.name,
        productType: product.productType,
        presetValues: {
          billShape: product.billShape,
          profile: product.profile,
          closureType: product.closureType,
          structure: product.structure,
          fabricSetup: product.fabricSetup
        },
        selectedDefaults: {
          'bill-shape': defaultOptions['bill-shape'],
          'profile': defaultOptions['profile'],
          'closure-type': defaultOptions['closure-type'],
          'structure': defaultOptions['structure']
        }
      });
    }
  }, [product.productOptions, product.productType, product.billShape, product.profile, product.closureType, product.structure]);

  // Helpers to read product options by slug
  const getOptionBySlug = (slug: string) => product.productOptions.find(o => o.slug === slug);
  const getSelectedOrDefaultLabel = (slug: string, fallbackLabel: string): string => {
    const opt = getOptionBySlug(slug);
    if (!opt || opt.choices.length === 0) return fallbackLabel;
    const selectedValue = selectedOptions[slug];
    const selected = opt.choices.find(c => c.value === selectedValue);
    if (selected) return selected.label;
    const match = opt.choices.find(c => c.label.toLowerCase() === fallbackLabel.toLowerCase());
    return match?.label || opt.choices[0].label;
  };

  // Repeater images: Show itemData if no color selected, else show view-specific images for first selected color
  const firstSelectedColor = Object.keys(selectedColors)[0];
  const repeaterImages = firstSelectedColor
    ? [
        getImageForView(product.frontColorImages, firstSelectedColor),
        getImageForView(product.leftColorImages, firstSelectedColor),
        getImageForView(product.rightColorImages, firstSelectedColor),
        getImageForView(product.backColorImages, firstSelectedColor),
      ].filter((img): img is ImageWithAlt => img !== null)
    : (product.itemData || []);

  // Main image should always show from Main Image field
  useEffect(() => {
    setMainImage(product.mainImage);
  }, [product.mainImage]);

  // Load available shipments on component mount and when auto-config changes
  useEffect(() => {
    loadAvailableShipments();
  }, [autoConfigFastestShipment]);

  // Handle auto-config checkbox change
  const handleAutoConfigChange = (checked: boolean) => {
    setAutoConfigFastestShipment(checked);
    if (!checked) {
      // Clear shipment number when auto-config is disabled
      setShipmentNumber('');
      setShipmentValidation({
        isValidating: false,
        isValid: null,
        shipmentData: null,
        error: null
      });
    }
  };

  // Validate shipment number with debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      validateShipmentNumber(shipmentNumber);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [shipmentNumber]);


  // Handle file upload
  const handleFileUpload = async (files: FileList) => {
    if (!files || files.length === 0) return;

    const uploadPromises = Array.from(files).map(async (file) => {
      try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error('Upload failed');
        }

        const result = await response.json();
        return result.file;
      } catch (error) {
        console.error('Upload error:', error);
        throw error;
      }
    });

    try {
      const uploadedFiles = await Promise.all(uploadPromises);
      setUploadedLogoFiles(prev => [...prev, ...uploadedFiles]);
    } catch (error) {
      console.error('Failed to upload files:', error);
      // You could show an error message to the user here
    }
  };

  // Remove uploaded file
  const removeUploadedFile = (index: number) => {
    setUploadedLogoFiles(prev => prev.filter((_, i) => i !== index));
  };


  // Handle upload completion
  // Handle logo file selection (legacy)

  // Handle TempLogoUploader completion
  const handleLogoUploadComplete = (files: any[]) => {
    console.log('✅ Logo files uploaded successfully:', files);
    setUploadedLogoFiles(files);
    setUploadError('');
    setUploadSuccess('Logo files prepared successfully!');
    setTimeout(() => setUploadSuccess(''), 3000);
  };

  // Handle TempLogoUploader error
  const handleLogoUploadError = (error: string) => {
    console.error('❌ Logo upload error:', error);
    setUploadError(error);
    setUploadSuccess('');
    setTimeout(() => setUploadError(''), 5000);
  };

  // Get authentication context
  const { user, isAuthenticated } = useAuth();

  // Handle cart success
  const handleCartSuccess = () => {
    setCartMessage('Product added to cart successfully!');
    setCartError('');
    setTimeout(() => setCartMessage(''), 3000);
  };

  // Handle cart error
  const handleCartError = (error: string) => {
    setCartError(error);
    setCartMessage('');
    setTimeout(() => setCartError(''), 5000);
  };

  // Calculate current pricing for cart using centralized pricing logic
  const getCurrentPricing = () => {
    const totalVolume = Object.values(selectedColors).reduce((sum, colorData) => 
      sum + Object.values(colorData.sizes).reduce((sizeSum, qty) => sizeSum + qty, 0), 0
    );

    // Use centralized pricing calculation with the product's price tier
    const unitPrice = calculateUnitPrice(totalVolume, product.priceTier || 'Tier 1');

    return {
      unitPrice,
      totalPrice: unitPrice * totalVolume,
      volume: totalVolume
    };
  };

  // Removed createDraftOrder function - no longer needed with temporary file upload
  // Orders are only created when user submits the final order

  // Robustly determine edit mode orderId (SSR prop or client query fallback)
  const [editOrderId, setEditOrderId] = useState<string | undefined>(prefillOrderId);

  useEffect(() => {
    if (!editOrderId && typeof window !== 'undefined') {
      const qsId = new URLSearchParams(window.location.search).get('orderId') || undefined;
      if (qsId) setEditOrderId(qsId);
    }
  }, [editOrderId]);

  // Decide where to route after saving depending on admin context
  const getPostSaveRedirect = () => {
    try {
      const isBrowser = typeof window !== 'undefined';
      const qs = isBrowser ? new URLSearchParams(window.location.search) : null;
      const adminParam = qs?.get('admin');
      const hadAdminFlagFromStorage = isBrowser && !!sessionStorage.getItem('adminOrderRebuild');
      const hasAdminFlag = adminParam === 'true' || hadAdminFlagFromStorage;
      if (hadAdminFlagFromStorage) {
        // Clear the flag so future user flows don't incorrectly route to admin
        sessionStorage.removeItem('adminOrderRebuild');
      }
      return hasAdminFlag ? '/dashboard/admin' : '/dashboard/member';
    } catch (e) {
      return '/dashboard/member';
    }
  };

  // Prefill from saved order if provided
  useEffect(() => {
    const loadSavedOrder = async () => {
      if (!editOrderId) return;
      try {
        const res = await fetch(`/api/orders/${editOrderId}`, { method: 'GET' });
        if (!res.ok) return;
        const data = await res.json();
        const order = data.order;
        if (!order) return;
        if (order.productName && order.productName !== product.name) return; // safety

        if (order.selectedColors) {
          setSelectedColors(order.selectedColors);
        }
        if (order.selectedOptions) {
          setSelectedOptions(order.selectedOptions);
        }
        if (order.multiSelectOptions) {
          setMultiSelectOptions(order.multiSelectOptions);
        }
        if (order.logoSetupSelections) {
          setLogoSetupSelections(order.logoSetupSelections);
        }
      } catch (_) {
        // ignore prefill errors
      }
    };
    loadSavedOrder();
  }, [editOrderId, product.name]);

  // Quick save for editing an existing saved order (no customer form)
  const handleQuickSave = async () => {
    if (Object.keys(selectedColors).length === 0) {
      alert('Please select at least one color to save');
      return;
    }
    if (!editOrderId) {
      // Not in edit mode; fall back to showing the order form
      setShowOrderForm(true);
      return;
    }

    // Validate shipment build number if provided
    if (shipmentNumber && !shipmentValidation.isValid) {
      alert('Please enter a valid shipment build number or leave it empty.');
      return;
    }

    setIsSubmittingOrder(true);
    try {
      const updatePayload = {
        productName: product.name,
        selectedColors,
        logoSetupSelections,
        selectedOptions,
        multiSelectOptions,
        orderSource: 'PRODUCT_CUSTOMIZATION' as const,
        status: 'PENDING' as const,
        shipmentId: shipmentValidation.isValid && shipmentValidation.shipmentData ? shipmentValidation.shipmentData.id : null,
      };

      const response = await fetch(`/api/orders/${editOrderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.message || 'Failed to update order');
      }
      alert('Saved order updated successfully.');
      router.push(getPostSaveRedirect());
    } catch (error) {
      console.error('Quick save failed:', error);
      alert('Failed to update order. Please try again.');
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  // Handle order submission
  const handleSubmitOrder = async (customerInfo: any) => {
    if (Object.keys(selectedColors).length === 0) {
      alert('Please select at least one color to continue');
      return;
    }

    // Validate shipment build number if provided
    if (shipmentNumber && !shipmentValidation.isValid) {
      alert('Please enter a valid shipment build number or leave it empty.');
      return;
    }

    setIsSubmittingOrder(true);
    
    try {
      const orderData: any = {
        productName: product.name,
        selectedColors,
        logoSetupSelections,
        selectedOptions,
        multiSelectOptions,
        customerInfo,
        // Include logo file for upload during order creation
        logoFile,
        additionalInstructions,
        // Include user authentication data if available
        userId: isAuthenticated && user ? user.id : null,
        userEmail: isAuthenticated && user ? user.email : customerInfo.email,
        orderType: isAuthenticated ? 'AUTHENTICATED' : 'GUEST',
        orderSource: 'PRODUCT_CUSTOMIZATION' as const,
        status: 'PENDING' as const,
        shipmentId: shipmentValidation.isValid && shipmentValidation.shipmentData ? shipmentValidation.shipmentData.id : null,
        // ✅ Include product tier for proper pricing in invoices
        priceTier: product.priceTier || 'Tier 1',
      };
      
      console.log('=== PRODUCT CLIENT DEBUG ===');
      console.log('🚀 Submitting order data:', JSON.stringify(orderData, null, 2));
      console.log('🔐 Authentication status:', { isAuthenticated, user: user ? { id: user.id, email: user.email } : null });
      console.log('📝 Customer info received:', customerInfo);
      console.log('📋 Order IDs:', { editOrderId });
      console.log('🚢 Shipment validation state:', {
        shipmentNumber,
        isValid: shipmentValidation.isValid,
        shipmentData: shipmentValidation.shipmentData ? {
          id: shipmentValidation.shipmentData.id,
          buildNumber: shipmentValidation.shipmentData.buildNumber
        } : null,
        error: shipmentValidation.error
      });
      
      let result: any;
      if (editOrderId) {
        // Update existing saved order
        const response = await fetch(`/api/orders/${editOrderId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...orderData,
            status: 'PENDING'
          }),
        });
        result = await response.json();
        console.log('📡 API Update Response:', { status: response.status, result });
        if (!response.ok) throw new Error(result.message || 'Failed to update order');
        
        alert('Saved order updated successfully.');
        router.push(getPostSaveRedirect());
      } else {
        // Create new order
        const response = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(orderData),
        });
        result = await response.json();
        console.log('📡 API Create Response:', { status: response.status, result });
        if (!response.ok) throw new Error(result.message || 'Failed to create order');
        console.log('✅ Order submitted successfully! Order ID:', result.orderId);
        router.push(`/checkout/success?orderId=${result.orderId}`);
      }
    } catch (error) {
      console.error('Error submitting order:', error);
      alert('Failed to submit order. Please try again.');
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  return (
    <div className="mx-auto relative" style={{ maxWidth: '1950px' }}>
      {/* Compact Animated Background with Geometric Patterns */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Animated Geometric Patterns */}
        <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-br from-cyan-400/10 to-blue-500/10 rounded-full animate-float"></div>
        <div className="absolute top-20 right-10 w-24 h-24 bg-gradient-to-br from-purple-400/10 to-pink-500/10 rounded-full animate-float-delayed"></div>
        <div className="absolute bottom-20 left-20 w-28 h-28 bg-gradient-to-br from-emerald-400/10 to-teal-500/10 rounded-full animate-float-slow"></div>
        
        {/* Hexagonal Pattern Overlay */}
        <div className="absolute inset-0 opacity-5 dark:opacity-10">
          <div className="absolute top-10 left-10 w-16 h-16 border border-cyan-500/20 transform rotate-45 animate-spin-slow"></div>
          <div className="absolute top-32 right-20 w-12 h-12 border border-lime-500/20 transform rotate-12 animate-pulse"></div>
          <div className="absolute bottom-40 left-32 w-20 h-20 border border-emerald-500/20 transform -rotate-12 animate-bounce-slow"></div>
        </div>
      </div>

      {/* Ultra-Compact Header & Steps Section */}
      <div className="mb-4 relative z-10">
        <div className="relative bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl rounded-2xl border border-white/20 dark:border-gray-700/20 shadow-xl overflow-hidden">
          {/* Animated Border Effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 via-lime-500/20 to-emerald-500/20 animate-gradient-x"></div>
          <div className="absolute inset-[1px] bg-white/95 dark:bg-gray-900/95 rounded-2xl"></div>
          
          <div className="relative p-4">
            {/* Compact Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <div className="w-10 h-10 bg-gradient-to-br from-lime-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
                    <span className="text-lg">🎨</span>
                  </div>
                  <div className="absolute -inset-1 bg-gradient-to-br from-lime-500/30 to-green-600/30 rounded-xl blur animate-pulse"></div>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200">
                    Customize Your Cap
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {steps.filter(s => s.completed).length}/{steps.length} steps completed
                  </p>
                </div>
              </div>
              
              {/* Compact Progress Ring */}
              <div className="relative w-12 h-12">
                <svg className="w-12 h-12 transform -rotate-90" viewBox="0 0 48 48">
                  <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="3" fill="none" className="text-gray-200 dark:text-gray-700" />
                  <circle 
                    cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="3" fill="none" 
                    className="text-cyan-500 transition-all duration-700"
                    strokeDasharray={`${2 * Math.PI * 20}`}
                    strokeDashoffset={`${2 * Math.PI * 20 * (1 - (steps.filter(s => s.completed).length / steps.length))}`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-bold text-cyan-600 dark:text-cyan-400">
                    {Math.round((steps.filter(s => s.completed).length / steps.length) * 100)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Ultra-Compact Steps - Horizontal Layout */}
            <div className="flex items-center justify-between space-x-2">
              {steps.map((step, index) => {
                const isActive = currentStep === step.id;
                const isCompleted = step.completed;
                
                return (
                  <div key={step.id} className="flex-1 relative group">
                    {/* Step Connector Line */}
                    {index < steps.length - 1 && (
                      <div className={`absolute top-4 left-1/2 w-full h-0.5 z-0 transition-all duration-500 ${
                        isCompleted ? 'bg-gradient-to-r from-emerald-400 to-cyan-500' : 'bg-gray-200 dark:bg-gray-700'
                      }`}>
                        {isCompleted && (
                          <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-cyan-500 animate-pulse"></div>
                        )}
                      </div>
                    )}
                    
                    {/* Step Circle */}
                    <div className="relative z-10 flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                        isCompleted 
                          ? 'bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/30' 
                          : isActive
                          ? 'bg-gradient-to-br from-lime-500 to-green-500 text-white shadow-lg shadow-lime-500/30 animate-pulse'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border-2 border-gray-200 dark:border-gray-600'
                      }`}>
                        {isCompleted ? (
                          <span className="animate-bounce">✓</span>
                        ) : (
                          <span>{step.id}</span>
                        )}
                      </div>
                      
                      {/* Step Label */}
                      <div className="mt-1 text-center">
                        <p className={`text-xs font-medium leading-tight ${
                          isCompleted || isActive 
                            ? 'text-gray-900 dark:text-gray-100' 
                            : 'text-gray-500 dark:text-gray-400'
                        }`}>
                          {step.title}
                        </p>
                        
                        {/* Status Dot */}
                        <div className="mt-1 flex justify-center">
                          <div className={`w-1.5 h-1.5 rounded-full ${
                            isCompleted 
                              ? 'bg-emerald-500 animate-pulse' 
                              : isActive
                              ? 'bg-cyan-500 animate-bounce'
                              : 'bg-gray-300 dark:bg-gray-600'
                          }`}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Current Step Indicator - Ultra Compact */}
            <div className="mt-3 text-center">
              <div className="inline-flex items-center space-x-2 px-3 py-1 bg-gradient-to-r from-cyan-50 to-lime-50 dark:from-cyan-900/20 dark:to-lime-900/20 rounded-full border border-cyan-200 dark:border-cyan-700/50">
                <div className="w-1.5 h-1.5 bg-gradient-to-r from-cyan-500 to-lime-500 rounded-full animate-pulse"></div>
                <span className="text-xs font-medium text-cyan-700 dark:text-cyan-300">
                  {steps.find(s => s.id === currentStep)?.title || 'Getting Started'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modern 3-Column Layout with Glass Morphism */}
      <div className="w-full">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 relative max-w-full">
        {/* Grid Debug Overlay */}
        <div className="hidden lg:block absolute inset-0 pointer-events-none z-0">
          <div className="grid grid-cols-3 h-full">
            <div className="bg-blue-100/20 border-2 border-blue-300/50 border-dashed"></div>
            <div className="bg-green-100/20 border-2 border-green-300/50 border-dashed"></div>
            <div className="bg-rose-100/20 border-2 border-rose-300/50 border-dashed"></div>
          </div>
        </div>
        {/* Floating Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -left-40 w-80 h-80 bg-gradient-to-br from-blue-400/10 to-purple-400/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-40 -right-40 w-80 h-80 bg-gradient-to-br from-emerald-400/10 to-cyan-400/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-rose-400/5 to-orange-400/5 rounded-full blur-3xl animate-pulse" style={{animationDelay: '4s'}}></div>
        </div>
        {/* Left Column: Enhanced Product Gallery */}
        <div className="space-y-6 relative z-10">
          {/* Debug: Column 1 */}
          <div className="lg:hidden text-xs bg-blue-100 dark:bg-blue-900/20 p-2 rounded mb-2 text-blue-800 dark:text-blue-200">
            📱 Mobile: Column 1 (Gallery)
          </div>
          {/* Section Header Badge */}
          <div className="flex items-center justify-between mb-2">
            <div className="bg-gradient-to-r from-lime-500/90 to-green-500/90 backdrop-blur-md rounded-full px-4 py-2 shadow-xl border border-white/30">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                <span className="text-xs font-bold text-white">🖼️ Product Gallery & Style</span>
              </div>
            </div>
            <div className="hidden lg:block text-xs text-gray-500 dark:text-gray-400 font-medium">
              Column 1 of 3
            </div>
          </div>
          {/* Main Product Image with Glass Morphism */}
          <div className="group bg-white/70 dark:bg-gray-800/70 backdrop-blur-md rounded-2xl p-6 shadow-2xl border border-white/20 dark:border-gray-700/20 hover:shadow-3xl transition-all duration-500 hover:scale-[1.02] hover:bg-white/80 dark:hover:bg-gray-800/80">
            {/* Interactive Image Container */}
            <div className="relative h-[400px] rounded-xl overflow-hidden bg-gradient-to-br from-gray-50/80 to-gray-100/80 dark:from-gray-800/80 dark:to-gray-900/80 backdrop-blur-sm border border-white/30 dark:border-gray-600/30 group-hover:from-gray-50 group-hover:to-gray-100 dark:group-hover:from-gray-800 dark:group-hover:to-gray-900 transition-all duration-500">
              <Image
                src={mainImage.url}
                alt={mainImage.alt}
                fill
                className="object-contain transition-all duration-700 group-hover:scale-110 cursor-zoom-in"
                priority
                sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 400px"
              />
              {/* Floating Color Badge */}
              <div className="absolute top-3 right-3 bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-xl px-3 py-2 shadow-lg border border-white/30 dark:border-gray-600/30 transition-all duration-300 hover:scale-105">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"></div>
                  <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                    {firstSelectedColor || 'Default View'}
                  </span>
                </div>
              </div>
              
              {/* Zoom Indicator */}
              <div className="absolute bottom-3 left-3 opacity-0 group-hover:opacity-100 transition-all duration-300">
                <div className="bg-black/70 text-white rounded-lg px-2 py-1 text-xs font-medium backdrop-blur-sm">
                  🔍 Click to zoom
                </div>
              </div>
            </div>
          </div>
          
          {/* Enhanced Product Views Gallery */}
          {repeaterImages.length > 0 && (
            <div className="group bg-white/70 dark:bg-gray-800/70 backdrop-blur-md rounded-2xl p-6 shadow-2xl border border-white/20 dark:border-gray-700/20 hover:shadow-3xl transition-all duration-500 hover:scale-[1.01] hover:bg-white/80 dark:hover:bg-gray-800/80">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-lime-500 to-green-500 rounded-xl flex items-center justify-center shadow-lg">
                    <span className="text-white text-sm">🖼️</span>
                  </div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                    {firstSelectedColor ? `${firstSelectedColor} Views` : 'Product Views'}
                  </h3>
                </div>
                <div className="bg-gradient-to-r from-lime-100 to-green-100 dark:from-lime-900/30 dark:to-green-900/30 rounded-full px-3 py-1 border border-lime-200 dark:border-lime-700">
                  <span className="text-xs font-semibold text-lime-700 dark:text-lime-300">
                    {repeaterImages.length} images
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {repeaterImages.map((img, index) => {
                  const viewLabels = firstSelectedColor ? ['Front', 'Left', 'Right', 'Back'] : [];
                  const viewLabel = firstSelectedColor && viewLabels[index] ? viewLabels[index] : `View ${index + 1}`;
                  
                  return (
                    <div
                      key={`repeater-${index}`}
                      className={`relative rounded-lg overflow-hidden cursor-pointer group transition-all duration-200 ${
                        mainImage.url === img.url 
                          ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-white dark:ring-offset-gray-800' 
                          : 'hover:ring-2 hover:ring-gray-300 hover:ring-offset-2 hover:ring-offset-white dark:hover:ring-offset-gray-800'
                      }`}
                      onClick={() => setMainImage(img)}
                      role="button"
                      aria-label={`View ${img.alt} - ${viewLabel}`}
                    >
                      <div className="relative aspect-square bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800">
                        <Image
                          src={img.url}
                          alt={img.alt}
                          fill
                          className="object-cover group-hover:scale-110 transition-transform duration-200"
                          sizes="120px"
                        />
                        {mainImage.url === img.url && (
                          <div className="absolute inset-0 bg-blue-500/10 flex items-center justify-center">
                            <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                              <span className="text-white text-xs">✓</span>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="p-2 bg-white dark:bg-gray-800">
                        <p className="text-xs text-center font-medium text-gray-700 dark:text-gray-300 truncate">
                          {viewLabel}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          {/* Cap Style Setup - Redesigned to match Step 2 style */}
          <div className={`bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border transition-all duration-300 ${
            currentStep === 1 ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-gray-200 dark:border-gray-700'
          }`}>
            <button
              onClick={() => setShowCapStyleSetup(!showCapStyleSetup)}
              className="flex items-center justify-between w-full p-4 mb-2 bg-gradient-to-r from-indigo-50 to-lime-50 dark:from-indigo-900/10 dark:to-lime-900/10 rounded-xl border border-indigo-200 dark:border-indigo-800 hover:from-indigo-100 hover:to-lime-100 dark:hover:from-indigo-900/20 dark:hover:to-lime-900/20 transition-all duration-200 shadow-sm"
            >
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs">🎩</span>
                </div>
                <span className="font-semibold text-indigo-900 dark:text-indigo-100">Cap Style Setup</span>
              </div>
              <div className="flex items-center space-x-3">
                {(() => {
                  const billShapeOption = getOptionBySlug('bill-shape');
                  const closureOption = getOptionBySlug('closure');
                  const hasConfiguredOptions = (billShapeOption && selectedOptions['bill-shape']) || 
                                              (closureOption && selectedOptions['closure']);
                  
                  return hasConfiguredOptions && (
                    <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400">
                      <span className="w-5 h-5 bg-indigo-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs">✓</span>
                      </span>
                      <span className="text-xs font-medium">Configured</span>
                    </div>
                  );
                })()}
                <span className={`transform transition-transform duration-200 text-indigo-600 dark:text-indigo-400 ${showCapStyleSetup ? 'rotate-180' : ''}`}>
                  ▼
                </span>
              </div>
            </button>
            
            {/* Grid layout for better organization */}
            {showCapStyleSetup && (
            <div className="mt-4 grid grid-cols-1 gap-6">
              {/* Bill Shape */}
              {(() => {
                const option = getOptionBySlug('bill-shape');
                if (!option) return null;
                const currentLabel = getSelectedOrDefaultLabel('bill-shape', 
                  (product.productType === 'resale' && product.billShape) 
                    ? product.billShape 
                    : getDefaultBillShapeFromProductName(product.name)
                );
                return (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-semibold text-gray-900 dark:text-gray-100">Bill Shape</label>
                      <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-full">
                        {currentLabel}
                      </span>
                    </div>
                                            <div className="grid grid-cols-2 gap-3">
                      {option.choices.map((choice, idx) => (
                        <div
                          key={`bill-shape-${idx}`}
                          className={`cursor-pointer rounded-xl overflow-hidden border-2 transition-all duration-200 hover:scale-[1.02] hover:shadow-md ${
                            currentLabel === choice.label
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/10 shadow-lg shadow-blue-500/20'
                              : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 bg-white dark:bg-gray-800'
                          }`}
                          onClick={() => setSelectedOptions(prev => ({ ...prev, ['bill-shape']: choice.value }))}
                          role="button"
                          aria-label={`Select ${choice.label} for Bill Shape`}
                        >
                          <div className="relative aspect-square bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800">
                            {choice.image ? (
                              <Image src={choice.image} alt={choice.label} fill className="object-cover" sizes="120px" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{choice.label}</span>
                              </div>
                            )}
                            {currentLabel === choice.label && (
                              <div className="absolute top-2 right-2 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                                <span className="text-white text-xs">✓</span>
                              </div>
                            )}
                          </div>
                          <div className="p-3 text-center">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 break-words">{choice.label}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Profile */}
              {(() => {
                const option = getOptionBySlug('profile');
                if (!option) return null;
                const currentLabel = getSelectedOrDefaultLabel('profile', 
                  (product.productType === 'resale' && product.profile) 
                    ? product.profile 
                    : 'Mid'
                );
                return (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-semibold text-gray-900 dark:text-gray-100">Profile</label>
                      <span className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-full">
                        {currentLabel}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {option.choices.map((choice, idx) => (
                        <div
                          key={`profile-${idx}`}
                          className={`cursor-pointer rounded-xl overflow-hidden border-2 transition-all duration-200 hover:scale-[1.02] hover:shadow-md ${
                            currentLabel === choice.label
                              ? 'border-green-500 bg-green-50 dark:bg-green-900/10 shadow-lg shadow-green-500/20'
                              : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 bg-white dark:bg-gray-800'
                          }`}
                          onClick={() => setSelectedOptions(prev => ({ ...prev, ['profile']: choice.value }))}
                          role="button"
                          aria-label={`Select ${choice.label} for Profile`}
                        >
                          <div className="relative aspect-square bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800">
                            {choice.image ? (
                              <Image src={choice.image} alt={choice.label} fill className="object-cover" sizes="120px" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{choice.label}</span>
                              </div>
                            )}
                            {currentLabel === choice.label && (
                              <div className="absolute top-2 right-2 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                                <span className="text-white text-xs">✓</span>
                              </div>
                            )}
                          </div>
                          <div className="p-3 text-center">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 break-words">{choice.label}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Closure Type */}
              {(() => {
                const option = getOptionBySlug('closure-type');
                if (!option) return null;
                const currentLabel = getSelectedOrDefaultLabel('closure-type', 
                  (product.productType === 'resale' && product.closureType) 
                    ? product.closureType 
                    : 'Snapback'
                );
                return (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-semibold text-gray-900 dark:text-gray-100">Closure Type</label>
                      <span className="text-xs px-2 py-1 bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded-full">
                        {currentLabel}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {option.choices.map((choice, idx) => (
                        <div
                          key={`closure-type-${idx}`}
                          className={`cursor-pointer rounded-xl overflow-hidden border-2 transition-all duration-200 hover:scale-[1.02] hover:shadow-md ${
                            currentLabel === choice.label
                              ? 'border-lime-500 bg-lime-50 dark:bg-lime-900/10 shadow-lg shadow-lime-500/20'
                              : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 bg-white dark:bg-gray-800'
                          }`}
                          onClick={() => setSelectedOptions(prev => ({ ...prev, ['closure-type']: choice.value }))}
                          role="button"
                          aria-label={`Select ${choice.label} for Closure Type`}
                        >
                          <div className="relative aspect-square bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800">
                            {choice.image ? (
                              <Image src={choice.image} alt={choice.label} fill className="object-cover" sizes="120px" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{choice.label}</span>
                              </div>
                            )}
                            {currentLabel === choice.label && (
                              <div className="absolute top-2 right-2 w-5 h-5 bg-lime-500 rounded-full flex items-center justify-center">
                                <span className="text-white text-xs">✓</span>
                              </div>
                            )}
                          </div>
                          <div className="p-3 text-center">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 break-words">{choice.label}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Structure */}
              {(() => {
                const option = getOptionBySlug('structure');
                if (!option) return null;
                const currentLabel = getSelectedOrDefaultLabel('structure', 
                  (product.productType === 'resale' && product.structure) 
                    ? product.structure 
                    : 'Structured'
                );
                return (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-semibold text-gray-900 dark:text-gray-100">Structure</label>
                      <span className="text-xs px-2 py-1 bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 rounded-full">
                        {currentLabel}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {option.choices.map((choice, idx) => (
                        <div
                          key={`structure-${idx}`}
                          className={`cursor-pointer rounded-xl overflow-hidden border-2 transition-all duration-200 hover:scale-[1.02] hover:shadow-md ${
                            currentLabel === choice.label
                              ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/10 shadow-lg shadow-orange-500/20'
                              : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 bg-white dark:bg-gray-800'
                          }`}
                          onClick={() => setSelectedOptions(prev => ({ ...prev, ['structure']: choice.value }))}
                          role="button"
                          aria-label={`Select ${choice.label} for Structure`}
                        >
                          <div className="relative aspect-square bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800">
                            {choice.image ? (
                              <Image src={choice.image} alt={choice.label} fill className="object-cover" sizes="120px" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{choice.label}</span>
                              </div>
                            )}
                            {currentLabel === choice.label && (
                              <div className="absolute top-2 right-2 w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center">
                                <span className="text-white text-xs">✓</span>
                              </div>
                            )}
                          </div>
                          <div className="p-3 text-center">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 break-words">{choice.label}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Premium Fabric Selection */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-gray-900 dark:text-gray-100">Fabric Setup</label>
                  {selectedOptions['fabric-setup'] && (
                    <span className="text-xs px-2 py-1 bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded-full">
                      {selectedOptions['fabric-setup']}
                    </span>
                  )}
                </div>
                <div className="space-y-3">
                  <select
                    value={selectedOptions['fabric-setup'] || product.fabricSetup || ''}
                    onChange={(e) => {
                      setSelectedOptions(prev => ({ ...prev, 'fabric-setup': e.target.value }));
                    }}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                    aria-label="Select Fabric Setup"
                  >
                    <option value="">Select Fabric</option>
                    {/* Standard Fabrics */}
                    <option value="Chino Twill/Trucker Mesh">Chino Twill/Trucker Mesh</option>
                    <option value="Chino Twill">Chino Twill</option>
                    <option value="Cotton Polyester Mix">Cotton Polyester Mix</option>
                    <option value="Polyester">Polyester</option>
                    <option value="Ripstop">Ripstop</option>
                    <option value="Denim">Denim</option>
                    <option value="Spandex">Spandex</option>
                    <option value="Cotton Corduroy">Cotton Corduroy</option>
                    <option value="Ribbed Corduroy">Ribbed Corduroy</option>
                    <option value="Polyester 97% Spandex 3%">Polyester 97% Spandex 3%</option>
                    <option value="100% Polyester Jersey">100% Polyester Jersey</option>
                    <option value="Canvas">Canvas</option>
                    <option value="Cotton Polyester Mix/Trucker Mesh">Cotton Polyester Mix/Trucker Mesh</option>
                    <option value="Chino Twill/Air Mesh">Chino Twill/Air Mesh</option>
                    <option value="Cotton Polyester Mix/Air Mesh">Cotton Polyester Mix/Air Mesh</option>
                    <option value="PU Leather">PU Leather</option>
                    {/* Premium Fabrics */}
                    <option value="Acrylic">Acrylic ⭐ Premium</option>
                    <option value="Suede Cotton">Suede Cotton ⭐ Premium</option>
                    <option value="Genuine Leather">Genuine Leather ⭐ Premium</option>
                    <option value="Camo">Camo ⭐ Premium</option>
                    <option value="Polyester/Laser Cut">Polyester/Laser Cut ⭐ Premium</option>
                    <option value="Cotton Polyester Mix/Laser Cut">Cotton Polyester Mix/Laser Cut ⭐ Premium</option>
                    <option value="Other">Other (Custom)</option>
                  </select>
                  
                  {/* Custom Fabric Input */}
                  {selectedOptions['fabric-setup'] === 'Other' && (
                    <div className="mt-3">
                      <input
                        type="text"
                        placeholder="Enter custom fabric setup (e.g., Cotton/Silk, Wool, etc.)"
                        value={selectedOptions['custom-fabric'] || ''}
                        onChange={(e) => setSelectedOptions(prev => ({ ...prev, 'custom-fabric': e.target.value }))}
                        className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                      />
                    </div>
                  )}
                  
                  {/* Premium Fabric Notice */}
                  {(() => {
                    const selectedFabric = selectedOptions['fabric-setup'] === 'Other' 
                      ? selectedOptions['custom-fabric'] 
                      : selectedOptions['fabric-setup'];
                    const isPremium = selectedFabric && (
                      selectedFabric.toLowerCase().includes('acrylic') ||
                      selectedFabric.toLowerCase().includes('suede cotton') ||
                      selectedFabric.toLowerCase().includes('genuine leather') ||
                      selectedFabric.toLowerCase().includes('camo') ||
                      selectedFabric.toLowerCase().includes('laser cut') ||
                      selectedFabric.toLowerCase().includes('air mesh')
                    );
                    
                    if (isPremium) {
                      return (
                        <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-600">
                          <div className="flex items-center space-x-2">
                            <span className="text-purple-500">⭐</span>
                            <p className="text-xs text-purple-700 dark:text-purple-300 font-medium">
                              Premium fabric selected - additional costs will apply based on volume
                            </p>
                          </div>
                          {selectedFabric.includes('/') && (
                            <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                              Dual fabric: Front panel uses first fabric, back panel uses second fabric
                            </p>
                          )}
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
              </div>
            </div>
            )}
          </div>
        </div>


        {/* Middle Column: Interactive Color Selection */}
        <div className="space-y-6 relative z-10">
          {/* Debug: Column 2 */}
          <div className="lg:hidden text-xs bg-green-100 dark:bg-green-900/20 p-2 rounded mb-2 text-green-800 dark:text-green-200">
            📱 Mobile: Column 2 (Customization)
          </div>
          {/* Section Header Badge */}
          <div className="flex items-center justify-between mb-2">
            <div className="bg-gradient-to-r from-emerald-500/90 to-teal-500/90 backdrop-blur-md rounded-full px-4 py-2 shadow-xl border border-white/30">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                <span className="text-xs font-bold text-white">🎨 Customization Steps</span>
              </div>
            </div>
            <div className="hidden lg:block text-xs text-gray-500 dark:text-gray-400 font-medium">
              Column 2 of 3
            </div>
          </div>
          {/* Step 1: Enhanced Color Selection */}
          <div className={`group bg-white/70 dark:bg-gray-800/70 backdrop-blur-md rounded-2xl p-6 shadow-2xl border transition-all duration-500 hover:scale-[1.02] hover:shadow-3xl ${
            currentStep === 1 
              ? 'border-emerald-500 ring-4 ring-emerald-500/20 bg-gradient-to-br from-emerald-50/50 to-teal-50/50 dark:from-emerald-900/20 dark:to-teal-900/20' 
              : 'border-white/20 dark:border-gray-700/20 hover:border-emerald-300/50 dark:hover:border-emerald-600/50'
          }`}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg transition-all duration-300 ${
                  currentStep === 1 
                    ? 'bg-gradient-to-br from-emerald-500 to-teal-500 scale-110' 
                    : 'bg-gradient-to-br from-gray-400 to-gray-500'
                }`}>
                  <span className="text-white text-sm font-bold">1</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center space-x-2">
                    <span>🎨 Choose Color Style</span>
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Select your cap color combination</p>
                </div>
              </div>
              {Object.keys(selectedColors).length > 0 && (
                <div className="bg-gradient-to-r from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30 rounded-full px-4 py-2 border border-emerald-200 dark:border-emerald-600 shadow-lg">
                  <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400">
                    <span className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center animate-pulse">
                      <span className="text-white text-xs">✓</span>
                    </span>
                    <span className="text-sm font-bold">{Object.keys(selectedColors).length} colors selected</span>
                  </div>
                </div>
              )}
        </div>

        {/* Color Type Selection */}
            {typeOptions.length > 0 && (
              <div className="mb-6">
                <label className="block text-sm font-medium mb-3 text-gray-700 dark:text-gray-300">Color Type</label>
            <select
              value={selectedType}
                  onChange={(e) => {
                    setSelectedType(e.target.value);
                    setSelectedColors({}); // Reset color selection when type changes
                    if (e.target.value) setCurrentStep(1);
                  }}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              aria-label="Select color type"
            >
                  {typeOptions.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Standalone Custom Color Input Section */}
        <div className="mb-6 p-4 bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50 dark:from-purple-900/20 dark:via-pink-900/20 dark:to-indigo-900/20 rounded-2xl border border-purple-200/50 dark:border-purple-700/50 shadow-lg backdrop-blur-sm">
          {/* Section Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-md">
                <span className="text-white text-sm">+</span>
              </div>
              <div>
                <h4 className="text-sm font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent dark:from-purple-400 dark:to-pink-400">
                  Add Custom Color
                </h4>
                <p className="text-xs text-purple-600/80 dark:text-purple-300/80">
                  Create your own color option with a custom name
                </p>
              </div>
            </div>
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg px-3 py-1 border border-white/50 dark:border-gray-700/50 shadow-sm">
              <span className="text-xs font-medium text-purple-600 dark:text-purple-400">
                Direct Input
              </span>
            </div>
          </div>

          {/* Custom Color Input */}
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <input
                type="text"
                value={newCustomColorInput}
                onChange={(e) => setNewCustomColorInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    addStandaloneCustomColor();
                  }
                }}
                placeholder="Enter custom color name (e.g., Forest Green, Sky Blue, etc.)"
                className="w-full px-4 py-3 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors placeholder-gray-500 dark:placeholder-gray-400"
              />
            </div>
            <button
              onClick={addStandaloneCustomColor}
              disabled={!newCustomColorInput.trim()}
              className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:from-gray-400 disabled:to-gray-500 text-white font-medium text-sm rounded-xl transition-all duration-200 hover:scale-105 shadow-lg hover:shadow-xl disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              + Add Color
            </button>
          </div>

          {/* Show custom colors added */}
          {Object.entries(selectedColors).filter(([_, colorData]) => colorData.isCustom).length > 0 && (
            <div className="mt-4 pt-4 border-t border-purple-200/30 dark:border-purple-700/30">
              <p className="text-xs text-purple-600/80 dark:text-purple-300/80 mb-2">Custom colors added:</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(selectedColors)
                  .filter(([_, colorData]) => colorData.isCustom)
                  .map(([colorName, colorData]) => {
                    const totalQuantity = Object.values(colorData.sizes).reduce((sum, qty) => sum + qty, 0);
                    return (
                      <div key={colorName} className="flex items-center gap-2 bg-white/70 dark:bg-gray-800/70 backdrop-blur-md rounded-lg px-3 py-1.5 border border-white/30 dark:border-gray-700/30 shadow-sm">
                        <div className="w-3 h-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full"></div>
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{colorName}</span>
                        <span className="text-xs text-purple-600 dark:text-purple-400">({totalQuantity})</span>
                        <button
                          onClick={() => removeStandaloneCustomColor(colorName)}
                          className="text-xs text-red-500 hover:text-red-700 dark:hover:text-red-400 transition-colors"
                        >
                          ×
                        </button>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>

            {/* Color Options */}
            {selectedType && (
          <div>
                <label className="block text-sm font-medium mb-3 text-gray-700 dark:text-gray-300">
                  Available Colors
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {(selectedType === 'All' ? getAllColors() : colorTypes[selectedType] || [])
                    .slice(0, showAllColors ? undefined : 12)
                    .map((option, index) => {
                    const optionName = deriveColorName(option);
                    const isSelected = selectedColors.hasOwnProperty(optionName);
                    const colorData = selectedColors[optionName];
                    const totalQuantity = colorData ? Object.values(colorData.sizes).reduce((sum, qty) => sum + qty, 0) : 0;
                    
                    return (
                <div
                  key={`${selectedType}-${optionName}-${index}`}
                      className={`cursor-pointer rounded-lg overflow-hidden border-2 transition-all duration-200 hover:scale-105 ${
                        isSelected
                          ? 'border-blue-500 shadow-lg shadow-blue-500/25 ring-2 ring-blue-500/20' 
                          : 'border-gray-200 dark:border-gray-600 hover:border-gray-400'
                      }`}
                                              onClick={() => {
                          handleColorSelection(optionName);
                          if (currentStep === 1) setCurrentStep(2);
                        }}
                  role="button"
                  aria-label={`Select color ${optionName}`}
                >
                      <div className="relative aspect-square">
                  <Image
                    src={option.url}
                    alt={option.alt}
                          fill
                          className="object-cover"
                          sizes="80px"
                        />
                        {isSelected && (
                          <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                            <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                              <span className="text-white text-xs">✓</span>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="p-2 bg-white dark:bg-gray-800">
                        <div className="space-y-1">
                          {/* Display custom name if available, otherwise original name */}
                          <p className="text-xs text-center font-medium text-gray-700 dark:text-gray-300 truncate">
                            {getDisplayColorName(optionName, colorData)}
                          </p>
                          
                          {/* Show custom name badge if this is a custom color */}
                          {colorData?.isCustom && (
                            <div className="flex items-center justify-center">
                              <span className="text-xs bg-gradient-to-r from-purple-500 to-pink-500 text-white px-2 py-0.5 rounded-full font-bold shadow-sm">
                                Custom
                              </span>
                            </div>
                          )}
                          
                          {isSelected && (
                            <p className="text-xs text-center text-blue-600 dark:text-blue-400 font-semibold">
                              {totalQuantity} units
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                  })}
                </div>
                
                {/* Show More/Less Button */}
                {(() => {
                  const totalColors = selectedType === 'All' ? getAllColors().length : (colorTypes[selectedType] || []).length;
                  if (totalColors > 12) {
                    return (
                      <div className="mt-4 text-center">
                        <button
                          onClick={() => setShowAllColors(!showAllColors)}
                          className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-lime-500 to-green-500 hover:from-lime-600 hover:to-green-600 text-white text-sm font-medium rounded-lg transition-all duration-200 hover:scale-105 shadow-lg hover:shadow-xl"
                        >
                          <span className="mr-2">
                            {showAllColors ? '👆 Show Less' : '👇 Show More'}
                          </span>
                          <span className="text-xs bg-white/20 px-2 py-1 rounded-full">
                            {showAllColors ? `Hide ${totalColors - 12}` : `+${totalColors - 12} more`}
                          </span>
                        </button>
                      </div>
                    );
                  }
                  return null;
                })()}

                {/* Custom Color Names Section */}
                {Object.keys(selectedColors).length > 0 && (
                  <div className="mt-6 p-4 bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50 dark:from-purple-900/20 dark:via-pink-900/20 dark:to-indigo-900/20 rounded-2xl border border-purple-200/50 dark:border-purple-700/50 shadow-lg backdrop-blur-sm">
                    {/* Section Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-md">
                          <span className="text-white text-sm">✨</span>
                        </div>
                        <div>
                          <h4 className="text-sm font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent dark:from-purple-400 dark:to-pink-400">
                            Custom Color Names
                          </h4>
                          <p className="text-xs text-purple-600/80 dark:text-purple-300/80">
                            Give your colors personalized names
                          </p>
                        </div>
                      </div>
                      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg px-3 py-1 border border-white/50 dark:border-gray-700/50 shadow-sm">
                        <span className="text-xs font-medium text-purple-600 dark:text-purple-400">
                          Optional
                        </span>
                      </div>
                    </div>

                    {/* Custom Color Input Grid */}
                    <div className="grid gap-3">
                      {Object.entries(selectedColors).map(([colorKey, colorData]) => {
                        const totalQuantity = Object.values(colorData.sizes).reduce((sum, qty) => sum + qty, 0);
                        const hasCustomInput = customColorInputs.hasOwnProperty(colorKey);
                        
                        return (
                          <div key={colorKey} className="flex items-center gap-3 p-3 bg-white/70 dark:bg-gray-800/70 backdrop-blur-md rounded-xl border border-white/30 dark:border-gray-700/30 shadow-sm">
                            {/* Color Preview */}
                            <div className="w-8 h-8 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600 flex-shrink-0">
                              <div className="w-full h-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center">
                                <span className="text-xs text-gray-600">🎨</span>
                              </div>
                            </div>

                            {/* Color Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                                  {getDisplayColorName(colorKey, colorData)}
                                </span>
                                {colorData.isCustom && (
                                  <span className="text-xs bg-gradient-to-r from-purple-500 to-pink-500 text-white px-2 py-0.5 rounded-full font-bold shadow-sm">
                                    Custom
                                  </span>
                                )}
                              </div>
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {totalQuantity} units selected
                              </span>
                            </div>

                            {/* Custom Input or Edit Button */}
                            {!colorData.isCustom ? (
                              hasCustomInput ? (
                                <div className="flex items-center gap-2">
                                  <input
                                    type="text"
                                    value={customColorInputs[colorKey] || ''}
                                    onChange={(e) => handleCustomColorNameChange(colorKey, e.target.value)}
                                    placeholder="Custom name..."
                                    className="w-32 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                                    onKeyPress={(e) => {
                                      if (e.key === 'Enter') {
                                        applyCustomColorName(colorKey);
                                      }
                                    }}
                                  />
                                  <button
                                    onClick={() => applyCustomColorName(colorKey)}
                                    className="px-3 py-1.5 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white text-sm font-medium rounded-lg transition-all duration-200 hover:scale-105 shadow-md"
                                  >
                                    ✓
                                  </button>
                                  <button
                                    onClick={() => setCustomColorInputs(prev => {
                                      const updated = { ...prev };
                                      delete updated[colorKey];
                                      return updated;
                                    })}
                                    className="px-2 py-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                                  >
                                    ✕
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setCustomColorInputs(prev => ({ ...prev, [colorKey]: '' }))}
                                  className="px-3 py-1.5 bg-gradient-to-r from-purple-100 to-pink-100 hover:from-purple-200 hover:to-pink-200 dark:from-purple-900/30 dark:to-pink-900/30 dark:hover:from-purple-800/30 dark:hover:to-pink-800/30 text-purple-700 dark:text-purple-300 text-sm font-medium rounded-lg transition-all duration-200 hover:scale-105 shadow-sm border border-purple-200/50 dark:border-purple-700/50"
                                >
                                  + Custom Name
                                </button>
                              )
                            ) : (
                              <button
                                onClick={() => removeCustomColorName(colorKey)}
                                className="px-3 py-1.5 bg-gradient-to-r from-red-100 to-pink-100 hover:from-red-200 hover:to-pink-200 dark:from-red-900/30 dark:to-pink-900/30 dark:hover:from-red-800/30 dark:hover:to-pink-800/30 text-red-700 dark:text-red-300 text-sm font-medium rounded-lg transition-all duration-200 hover:scale-105 shadow-sm border border-red-200/50 dark:border-red-700/50"
                              >
                                Remove Custom Name
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                
                {/* Redesigned Color & Size Configuration */}
                {Object.keys(selectedColors).length > 0 && (
                  <div className="mt-8 space-y-6 p-6 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900/20 dark:via-blue-900/20 dark:to-indigo-900/20 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-xl backdrop-blur-sm">
                    {/* Enhanced Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="relative">
                          <div className="w-12 h-12 bg-gradient-to-br from-lime-500 via-green-500 to-emerald-500 rounded-2xl flex items-center justify-center shadow-lg">
                            <div className="absolute inset-0 bg-gradient-to-br from-lime-400 via-green-400 to-emerald-400 rounded-2xl blur-lg opacity-50 animate-pulse"></div>
                            <span className="relative text-white text-xl">🎨</span>
                          </div>
                          {/* Floating color dots */}
                          <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full animate-bounce delay-300"></div>
                          <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-pink-400 rounded-full animate-bounce delay-700"></div>
                        </div>
                        <div>
                          <h4 className="text-xl font-bold bg-gradient-to-r from-lime-600 via-green-600 to-emerald-600 bg-clip-text text-transparent dark:from-lime-400 dark:via-green-400 dark:to-emerald-400">
                            Color & Size Configuration
                          </h4>
                          <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                            Configure quantities for each color and size combination
                          </p>
                        </div>
                      </div>
                      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl px-4 py-2 border border-white/50 dark:border-gray-700/50 shadow-lg">
                        <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                          {Object.keys(selectedColors).length} Color{Object.keys(selectedColors).length !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>

                    {/* Color Cards Grid */}
                    <div className="grid gap-6">
                      {Object.entries(selectedColors).map(([colorName, colorData]) => {
                        const sizeOption = product.productOptions.find(option => option.slug === 'size');
                        if (!sizeOption) return null;
                        
                        return (
                          <div key={colorName} className="group bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-6 border border-white/50 dark:border-gray-700/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.01]">
                            {/* Color Header */}
                            <div className="flex items-center justify-between mb-6">
                              <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 rounded-full border-2 border-white shadow-lg" style={{ backgroundColor: colorName.toLowerCase() }}></div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h5 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                                      {getDisplayColorName(colorName, colorData)}
                                    </h5>
                                    {colorData.isCustom && (
                                      <span className="text-xs bg-gradient-to-r from-purple-500 to-pink-500 text-white px-2 py-0.5 rounded-full font-bold shadow-sm">
                                        Custom
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">Select sizes and quantities</p>
                                </div>
                              </div>
                              <div className="bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-xl px-3 py-2 border border-blue-200 dark:border-blue-700">
                                <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                                  {Object.keys(colorData.sizes).length} Size{Object.keys(colorData.sizes).length !== 1 ? 's' : ''}
                                </span>
                              </div>
                            </div>
                            
                            {/* Enhanced Size Selection Grid */}
                            <div className="space-y-4">
                              <div className="flex items-center space-x-2">
                                <div className="w-4 h-4 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"></div>
                                <label className="text-sm font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wide">Available Sizes</label>
                              </div>
                              <div className="space-y-4">
                                {sizeOption.choices.map((choice, idx) => {
                                  const isSelected = colorData.sizes.hasOwnProperty(choice.value);
                                  const quantity = colorData.sizes[choice.value] || 0;
                                  
                                  return (
                                    <div
                                      key={`${colorName}-${choice.value}`}
                                      className={`group/size cursor-pointer rounded-xl overflow-hidden border-2 transition-all duration-300 transform hover:scale-105 ${
                                        isSelected
                                          ? 'border-indigo-500 bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 shadow-lg ring-2 ring-indigo-500/20'
                                          : 'border-gray-200 dark:border-gray-600 hover:border-indigo-300 dark:hover:border-indigo-500 bg-white dark:bg-gray-800 hover:shadow-md'
                                      }`}
                                      onClick={() => handleSizeSelectionForColor(colorName, choice.value)}
                                    >
                                      <div className="p-4">
                                        <div className="flex items-center justify-between space-x-4">
                                          <div className="flex items-center space-x-3">
                                            <p className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wide">
                                              {choice.label}
                                            </p>
                                            {isSelected && (
                                              <div className="w-5 h-5 bg-indigo-500 rounded-full flex items-center justify-center">
                                                <span className="text-white text-xs">✓</span>
                                              </div>
                                            )}
                                          </div>
                                          
                                          {isSelected && (
                                            <div className="flex items-center space-x-3">
                                              <label className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                                                Quantity:
                                              </label>
                                              <div className="relative w-24">
                                                <input
                                                  type="number"
                                                  min="48"
                                                  value={quantity === 0 ? '' : quantity}
                                                  onChange={(e) => {
                                                    const value = e.target.value;
                                                    updateSizeQuantityForColor(colorName, choice.value, value, false);
                                                  }}
                                                  onBlur={(e) => {
                                                    const value = e.target.value;
                                                    updateSizeQuantityForColor(colorName, choice.value, value, true);
                                                  }}
                                                  className="w-full px-2 py-1 text-sm font-semibold border-2 border-indigo-200 dark:border-indigo-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 placeholder-gray-400 dark:placeholder-gray-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                  placeholder="48"
                                                  onClick={(e) => e.stopPropagation()}
                                                />
                                              </div>
                                              {quantity > 0 && (
                                                <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                                                  pcs
                                                </span>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                        
                                        {!isSelected && (
                                          <div className="text-center py-2">
                                            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                                              Click to select
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Step 2: Product Options (Collapsible) */}
          <div className={`bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border transition-all duration-300 ${
            currentStep === 2 ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-gray-200 dark:border-gray-700'
          }`}>
            <button
              onClick={() => setShowCustomizeOptions(!showCustomizeOptions)}
              className="flex items-center justify-between w-full p-4 mb-2 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/10 dark:to-emerald-900/10 rounded-xl border border-green-200 dark:border-green-800 hover:from-green-100 hover:to-emerald-100 dark:hover:from-green-900/20 dark:hover:to-emerald-900/20 transition-all duration-200 shadow-sm"
            >
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs">⚙️</span>
                </div>
                <span className="font-semibold text-green-900 dark:text-green-100">Step 2: Customize Options</span>
              </div>
              <div className="flex items-center space-x-3">
                {(multiSelectOptions['logo-setup'] || []).length > 0 && (
                  <div className="flex items-center space-x-2 text-green-600 dark:text-green-400">
                    <span className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs">✓</span>
                    </span>
                    <span className="text-xs font-medium">Configured</span>
                  </div>
                )}
                <span className={`transform transition-transform duration-200 text-green-600 dark:text-green-400 ${showCustomizeOptions ? 'rotate-180' : ''}`}>
                  ▼
                </span>
              </div>
            </button>

            {/* Product Options */}
            {showCustomizeOptions && product.productOptions.length > 0 && (
              <div className="mt-4 space-y-6">
                {/* Always Visible Options - Size, Logo Setup and Accessories */}
                <div className="space-y-6">


                  {/* Logo Setup with Complex Sub-Options */}
                  {(() => {
                    const logoOption = product.productOptions.find(option => option.slug === 'logo-setup');
                    if (!logoOption) return null;
                    
                    const selectedLogoValues = multiSelectOptions['logo-setup'] || [];
                    
                    return (
                      <div key={logoOption.id} className="space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-semibold text-gray-900 dark:text-gray-100">{logoOption.name}</label>
                          <span className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-full">
                            {selectedLogoValues.length > 0 ? `${selectedLogoValues.length} selected` : 'Select logos'}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          {logoOption.choices.map((choice, idx) => {
                            const isSelected = selectedLogoValues.includes(choice.value);
                            return (
                              <div
                                key={`logo-setup-${idx}`}
                                className={`cursor-pointer rounded-xl overflow-hidden border-2 transition-all duration-200 hover:scale-[1.02] hover:shadow-md ${
                                  isSelected
                                    ? 'border-green-500 bg-green-50 dark:bg-green-900/10 shadow-lg shadow-green-500/20'
                                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 bg-white dark:bg-gray-800'
                                }`}
                                onClick={() => toggleMultiSelect('logo-setup', choice.value)}
                                role="button"
                                aria-label={`Select ${choice.label} for ${logoOption.name}`}
                              >
                                <div className="relative aspect-square bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800">
                                  {choice.image ? (
                                    <Image
                                      src={choice.image}
                                      alt={choice.label}
                                      fill
                                      className="object-cover"
                                      sizes="120px"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{choice.label}</span>
                                    </div>
                                  )}
                                  {isSelected && (
                                    <div className="absolute top-2 right-2 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                                      <span className="text-white text-xs">✓</span>
                                    </div>
                                  )}
                                </div>
                                <div className="p-3 text-center">
                                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 break-words">{choice.label}</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Logo Setup Sub-Options */}
                        {selectedLogoValues.length > 0 && (
                          <div className="mt-4 space-y-4 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 rounded-xl border border-blue-200 dark:border-blue-800">
                            <div className="flex items-center space-x-2 mb-4">
                              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                                <span className="text-white text-xs">⚙️</span>
                              </div>
                              <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100">Logo Configuration</h4>
                            </div>
                            {selectedLogoValues.map(logoValue => {
                              // Handle both original and duplicated logos
                              const originalLogoType = logoValue.includes('-') ? logoValue.split('-')[0] : logoValue;
                              const logoChoice = logoOption.choices.find(c => c.value === originalLogoType);
                              const logoConfig = logoSetupSelections[logoValue] || {};
                              const isDuplicate = logoValue.includes('-') && logoValue !== originalLogoType;
                              
                              return (
                                <div key={logoValue} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-blue-200 dark:border-blue-800 shadow-sm">
                                  <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center space-x-2">
                                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                      <h5 className="font-semibold text-blue-900 dark:text-blue-100 text-sm">
                                        {logoChoice?.label || originalLogoType} {isDuplicate ? '(Copy)' : ''}
                                      </h5>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      {isDuplicate && (
                                        <button
                                          onClick={() => {
                                            setMultiSelectOptions(prev => ({
                                              ...prev,
                                              'logo-setup': (prev['logo-setup'] || []).filter(v => v !== logoValue)
                                            }));
                                            setLogoSetupSelections(prev => {
                                              const newSelections = { ...prev };
                                              delete newSelections[logoValue];
                                              return newSelections;
                                            });
                                          }}
                                          className="flex items-center justify-center w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors duration-200 shadow-sm"
                                          title="Remove this copy"
                                        >
                                          <span className="text-xs font-bold">×</span>
                                        </button>
                                      )}
                                      <button
                                        onClick={() => {
                                          const duplicateKey = `${originalLogoType}-${Date.now()}`;
                                          setMultiSelectOptions(prev => ({
                                            ...prev,
                                            'logo-setup': [...(prev['logo-setup'] || []), duplicateKey]
                                          }));
                                          setLogoSetupSelections(prev => ({
                                            ...prev,
                                            [duplicateKey]: {
                                              ...logoConfig,
                                              position: undefined
                                            }
                                          }));
                                        }}
                                        className="flex items-center justify-center w-6 h-6 bg-green-500 hover:bg-green-600 text-white rounded-full transition-colors duration-200 shadow-sm"
                                        title={`Duplicate ${logoChoice?.label || logoValue}`}
                                      >
                                        <span className="text-xs font-bold">+</span>
                                      </button>
                                    </div>
                                  </div>
                                  
                                  <div className="space-y-3">
                                    {/* Position Selection */}
                                    <div>
                                      <label className="block text-xs font-semibold mb-2 text-gray-700 dark:text-gray-300">Position</label>
                                      <select
                                        value={logoConfig.position || ''}
                                        onChange={(e) => setLogoSetupSelections(prev => ({
                                          ...prev,
                                          [logoValue]: {
                                            ...prev[logoValue],
                                            position: e.target.value,
                                            size: e.target.value ? getDefaultLogoSize(e.target.value) : undefined
                                          }
                                        }))}
                                        className="w-full p-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                      >
                                        <option value="">Select Position</option>
                                        {logoPositions.map(pos => {
                                          // Get all used positions except the current logo's position
                                          const usedPositions = Object.entries(logoSetupSelections)
                                            .filter(([key, config]) => key !== logoValue && config.position)
                                            .map(([, config]) => config.position);
                                          
                                          const isDisabled = usedPositions.includes(pos);
                                          return (
                                            <option key={pos} value={pos} disabled={isDisabled}>
                                              {pos} {isDisabled ? '(Already Used)' : ''}
                                            </option>
                                          );
                                        })}
                                      </select>
                                    </div>

                                    {/* Size Selection (appears when position is selected) */}
                                    {logoConfig.position && (
                                      <div>
                                        <label className="block text-xs font-semibold mb-2 text-gray-700 dark:text-gray-300">Size</label>
                                        <select
                                          value={logoConfig.size || getDefaultLogoSize(logoConfig.position)}
                                          onChange={(e) => setLogoSetupSelections(prev => ({
                                            ...prev,
                                            [logoValue]: {
                                              ...prev[logoValue],
                                              size: e.target.value
                                            }
                                          }))}
                                          className="w-full p-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                        >
                                          {logoSizes.map(size => (
                                            <option key={size} value={size}>{size}</option>
                                          ))}
                                        </select>
                                      </div>
                                    )}

                                    {/* Application Method (appears when size is selected) */}
                                    {logoConfig.size && (
                                      <div>
                                        <label className="block text-xs font-semibold mb-2 text-gray-700 dark:text-gray-300">Application Method</label>
                                        <select
                                          value={logoConfig.application || getDefaultApplication(logoChoice?.label || '')}
                                          onChange={(e) => setLogoSetupSelections(prev => ({
                                            ...prev,
                                            [logoValue]: {
                                              ...prev[logoValue],
                                              application: e.target.value
                                            }
                                          }))}
                                          className="w-full p-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                        >
                                          {logoApplications.map(app => (
                                            <option key={app} value={app}>{app}</option>
                                          ))}
                                        </select>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                        
                        {/* Advanced Logo Upload */}
                        {selectedLogoValues.length > 0 && (
                          <div className="mt-4 space-y-4">
                            <div className="flex items-center space-x-2 mb-3">
                              <div className="w-5 h-5 bg-lime-500 rounded-full flex items-center justify-center">
                                <span className="text-white text-xs">📁</span>
                              </div>
                              <h4 className="text-sm font-semibold text-lime-900 dark:text-lime-100">Upload Logo Files</h4>
                            </div>
                            
                            <TempLogoUploader
                              availablePositions={selectedLogoValues}
                              onUploadComplete={handleLogoUploadComplete}
                              onError={handleLogoUploadError}
                            />

                            {/* Upload Status Messages */}
                            {uploadSuccess && (
                              <div className="text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-200 dark:border-green-800">
                                ✅ {uploadSuccess}
                              </div>
                            )}
                            
                            {uploadError && (
                              <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-200 dark:border-red-800">
                                ❌ {uploadError}
                              </div>
                            )}

                            {/* Show uploaded files count */}
                            {uploadedLogoFiles.length > 0 && (
                              <div className="text-sm text-lime-700 dark:text-lime-300 bg-lime-50 dark:bg-lime-900/20 p-3 rounded-lg border border-lime-200 dark:border-lime-800">
                                📎 {uploadedLogoFiles.length} file{uploadedLogoFiles.length > 1 ? 's' : ''} prepared for upload
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Accessories with Multi-Select (Collapsible) */}
                  {(() => {
                    const accessoriesOption = product.productOptions.find(option => option.slug === 'accessories');
                    if (!accessoriesOption) return null;
                    
                    const selectedAccessoryValues = multiSelectOptions.accessories || [];
                    
                    return (
                      <div key={accessoriesOption.id} className="space-y-3">
                        <button
                          onClick={() => setShowAccessories(!showAccessories)}
                          className="flex items-center justify-between w-full p-3 bg-gradient-to-r from-lime-50 to-green-50 dark:from-lime-900/10 dark:to-green-900/10 rounded-xl border border-lime-200 dark:border-lime-800 hover:from-lime-100 hover:to-green-100 dark:hover:from-lime-900/20 dark:hover:to-green-900/20 transition-all duration-200 shadow-sm"
                        >
                          <div className="flex items-center space-x-3">
                            <div className="w-6 h-6 bg-lime-500 rounded-full flex items-center justify-center">
                              <span className="text-white text-xs">🎒</span>
                            </div>
                            <span className="font-semibold text-lime-900 dark:text-lime-100">{accessoriesOption.name}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs px-2 py-1 bg-lime-100 dark:bg-lime-900/20 text-lime-700 dark:text-lime-300 rounded-full">
                              {selectedAccessoryValues.length > 0 ? `${selectedAccessoryValues.length} selected` : 'Select accessories'}
                            </span>
                            <span className={`transform transition-transform duration-200 text-lime-600 dark:text-lime-400 ${showAccessories ? 'rotate-180' : ''}`}>
                              ▼
                            </span>
                          </div>
                        </button>
                        {showAccessories && (
                          <>
                            <div className="grid grid-cols-2 gap-3">
                              {accessoriesOption.choices.map((choice, idx) => {
                                const isSelected = selectedAccessoryValues.includes(choice.value);
                                return (
                                  <div
                                    key={`accessories-${idx}`}
                                    className={`cursor-pointer rounded-xl overflow-hidden border-2 transition-all duration-200 hover:scale-105 hover:shadow-md ${
                                      isSelected
                                        ? 'border-lime-500 bg-lime-50 dark:bg-lime-900/10 shadow-lg shadow-lime-500/20'
                                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 bg-white dark:bg-gray-800'
                                    }`}
                                    onClick={() => toggleMultiSelect('accessories', choice.value)}
                                    role="button"
                                    aria-label={`Select ${choice.label} accessory`}
                                  >
                                    <div className="relative aspect-square bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800">
                                      {choice.image ? (
                                        <Image
                                          src={choice.image}
                                          alt={choice.label}
                                          fill
                                          className="object-cover"
                                          sizes="120px"
                                        />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{choice.label}</span>
                                        </div>
                                      )}
                                      {isSelected && (
                                        <div className="absolute top-2 right-2 w-5 h-5 bg-lime-500 rounded-full flex items-center justify-center">
                                          <span className="text-white text-xs">✓</span>
                                        </div>
                                      )}
                                    </div>
                                    <div className="p-3 text-center">
                                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 break-words">{choice.label}</p>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* Optional Options Toggle */}
                {product.productOptions.some(option => ['delivery-type', 'services'].includes(option.slug)) && (
                  <div className="mb-4">
                    <button
                      onClick={() => setShowOptionalOptions(!showOptionalOptions)}
                      className="flex items-center justify-between w-full p-4 bg-gradient-to-r from-lime-50 to-green-50 dark:from-lime-900/10 dark:to-green-900/10 rounded-xl border border-lime-200 dark:border-lime-800 hover:from-lime-100 hover:to-green-100 dark:hover:from-lime-900/20 dark:hover:to-green-900/20 transition-all duration-200 shadow-sm"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs">⚡</span>
                        </div>
                        <span className="font-semibold text-lime-900 dark:text-lime-100">Additional Options</span>
                      </div>
                      <span className={`transform transition-transform duration-200 text-lime-600 dark:text-lime-400 ${showOptionalOptions ? 'rotate-180' : ''}`}>
                        ▼
                      </span>
                    </button>
                  </div>
                )}

                {/* Optional Options (Expandable) - Delivery Type, Services */}
                {showOptionalOptions && (
                  <div className="space-y-6 p-6 bg-gradient-to-br from-lime-50 to-green-50 dark:from-lime-900/10 dark:to-green-900/10 rounded-xl border border-lime-200 dark:border-lime-800 shadow-sm">
                    {/* Delivery Type - Single Select */}
                    {(() => {
                      const deliveryOption = product.productOptions.find(option => option.slug === 'delivery-type');
                      if (!deliveryOption) return null;
                      
                      const currentLabel = getSelectedOrDefaultLabel('delivery-type', 'Regular');
                      
                      return (
                        <div key={deliveryOption.id} className="space-y-3">
                          <div className="flex items-center justify-between">
                            <label className="text-sm font-semibold text-gray-900 dark:text-gray-100">{deliveryOption.name}</label>
                            <span className="text-xs px-2 py-1 bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 rounded-full">
                              {currentLabel}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            {deliveryOption.choices.map((choice, idx) => {
                              const totalQuantity = Object.values(selectedColors).reduce((sum, colorData) => 
                                sum + Object.values(colorData.sizes).reduce((colorSum, qty) => colorSum + qty, 0), 0
                              );
                              const choiceValueLower = choice.value.toLowerCase();
                              const choiceLabelLower = choice.label.toLowerCase();
                              const isAirOrSeaFreight = 
                                choiceValueLower.includes('air') || 
                                choiceValueLower.includes('freight') ||
                                choiceLabelLower.includes('air') ||
                                choiceLabelLower.includes('freight') ||
                                ['air-freight', 'sea-freight', 'air freight', 'sea freight'].includes(choiceValueLower) ||
                                ['air-freight', 'sea-freight', 'air freight', 'sea freight'].includes(choiceLabelLower);
                              const isDisabled = isAirOrSeaFreight && totalQuantity < 3168;
                              
                              // Auto-deselect air/sea freight if it becomes disabled
                              if (isDisabled && selectedOptions['delivery-type'] === choice.value) {
                                const regularChoice = deliveryOption.choices.find(c => 
                                  c.label.toLowerCase().includes('regular') || 
                                  c.value.toLowerCase().includes('regular')
                                );
                                setTimeout(() => {
                                  setSelectedOptions(prev => ({
                                    ...prev,
                                    'delivery-type': regularChoice?.value || deliveryOption.choices[0]?.value || ''
                                  }));
                                }, 0);
                              }
                              
                              return (
                                <div
                                  key={`delivery-type-${idx}`}
                                  className={`rounded-xl overflow-hidden border-2 transition-all duration-200 ${
                                    isDisabled
                                      ? 'border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 cursor-not-allowed opacity-50 pointer-events-none'
                                      : selectedOptions['delivery-type'] === choice.value
                                      ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/10 shadow-lg shadow-orange-500/20 cursor-pointer hover:scale-[1.02] hover:shadow-md'
                                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 bg-white dark:bg-gray-800 cursor-pointer hover:scale-[1.02] hover:shadow-md'
                                  }`}
                                  onClick={() => {
                                    if (!isDisabled) {
                                      setSelectedOptions(prev => ({
                                        ...prev,
                                        'delivery-type': choice.value
                                      }));
                                    }
                                  }}
                                  role="button"
                                  aria-label={`Select ${choice.label} for ${deliveryOption.name}`}
                                >
                                <div className="relative aspect-square bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800">
                                  {choice.image ? (
                                    <Image
                                      src={choice.image}
                                      alt={choice.label}
                                      fill
                                      className="object-cover"
                                      sizes="120px"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{choice.label}</span>
                                    </div>
                                  )}
                                  {selectedOptions['delivery-type'] === choice.value && (
                                    <div className="absolute top-2 right-2 w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center">
                                      <span className="text-white text-xs">✓</span>
                                    </div>
                                  )}
                                </div>
                                <div className="p-3 text-center">
                                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 break-words">
                                    {choice.label}
                                    {isDisabled && (
                                      <span className="block text-xs text-red-500 mt-1">
                                        Requires 3168+ units (Current: {totalQuantity})
                                      </span>
                                    )}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                          </div>
                        </div>
                      );
                    })()}


                    {/* Services - Multi Select */}
                    {(() => {
                      const servicesOption = product.productOptions.find(option => option.slug === 'services');
                      if (!servicesOption) return null;
                      
                      const selectedServicesValues = multiSelectOptions.services || [];
                      
                      return (
                        <div key={servicesOption.id} className="space-y-3">
                          <div className="flex items-center justify-between">
                            <label className="text-sm font-semibold text-gray-900 dark:text-gray-100">{servicesOption.name}</label>
                            <span className="text-xs px-2 py-1 bg-teal-100 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300 rounded-full">
                              {selectedServicesValues.length > 0 ? `${selectedServicesValues.length} selected` : 'Select services'}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            {servicesOption.choices.map((choice, idx) => {
                              const isSelected = selectedServicesValues.includes(choice.value);
                              return (
                                <div
                                  key={`services-${idx}`}
                                  className={`cursor-pointer rounded-xl overflow-hidden border-2 transition-all duration-200 hover:scale-[1.02] hover:shadow-md ${
                                    isSelected
                                      ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/10 shadow-lg shadow-teal-500/20'
                                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 bg-white dark:bg-gray-800'
                                  }`}
                                  onClick={() => toggleMultiSelect('services', choice.value)}
                                  role="button"
                                  aria-label={`Select ${choice.label} service`}
                                >
                                  <div className="relative aspect-square bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800">
                                    {choice.image ? (
                                      <Image
                                        src={choice.image}
                                        alt={choice.label}
                                        fill
                                        className="object-cover"
                                        sizes="120px"
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center">
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{choice.label}</span>
                                      </div>
                                    )}
                                    {isSelected && (
                                      <div className="absolute top-2 right-2 w-5 h-5 bg-teal-500 rounded-full flex items-center justify-center">
                                        <span className="text-white text-xs">✓</span>
                                      </div>
                                    )}
                                  </div>
                                  <div className="p-3 text-center">
                                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 break-words">
                                      {choice.label}
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Product Details & Smart Options */}
        <div className="space-y-6 relative z-10">
          {/* Debug: Column 3 */}
          <div className="lg:hidden text-xs bg-rose-100 dark:bg-rose-900/20 p-2 rounded mb-2 text-rose-800 dark:text-rose-200">
            📱 Mobile: Column 3 (Product Details)
          </div>
          {/* Column Separator Visual */}
          <div className="hidden lg:block absolute -left-3 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-gray-200 dark:via-gray-600 to-transparent"></div>
          {/* Section Header Badge */}
          <div className="flex items-center justify-between mb-2">
            <div className="bg-gradient-to-r from-rose-500/90 to-orange-500/90 backdrop-blur-md rounded-full px-4 py-2 shadow-xl border border-white/30">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                <span className="text-xs font-bold text-white">📋 Product Details & Actions</span>
              </div>
            </div>
            <div className="hidden lg:block text-xs text-gray-500 dark:text-gray-400 font-medium">
              Column 3 of 3
            </div>
          </div>
          {/* Enhanced Product Info Header */}
          <div className="group bg-white/70 dark:bg-gray-800/70 backdrop-blur-md rounded-2xl p-6 shadow-2xl border border-white/20 dark:border-gray-700/20 hover:shadow-3xl transition-all duration-500 hover:scale-[1.02] hover:bg-white/80 dark:hover:bg-gray-800/80">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-rose-500 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg">
                <span className="text-white text-lg">🧢</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{product.name}</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">Premium Custom Baseball Cap</p>
              </div>
            </div>
            <div dangerouslySetInnerHTML={{ __html: product.description }} className="text-sm text-gray-600 dark:text-gray-400 prose prose-sm dark:prose-invert" />

          </div>

          {/* Enhanced Volume Pricing Card with Quantity-Based Animation - Not Sticky */}
          <VolumePricingCard 
            pricing={product.pricing} 
            selectedColors={selectedColors} 
          />

          {/* Section Starting from Cost Calculator */}
          <div className="space-y-6">
            {/* Costing & Calculation Section */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Cost Calculator</h3>
              
              <div className="transition-all duration-300 ease-in-out">
                {Object.keys(selectedColors).length > 0 ? (
                  <div className="animate-fadeIn">
                    <CostCalculator 
                      selectedColors={selectedColors}
                      logoSetupSelections={logoSetupSelections}
                      multiSelectOptions={multiSelectOptions}
                      selectedOptions={selectedOptions}
                      productPricing={product.pricing}
                      shipmentValidation={shipmentValidation}
                      product={product}
                      previousOrderNumber={previousOrderNumber}
                      setPreviousOrderNumber={setPreviousOrderNumber}
                    />
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400 animate-fadeIn">
                    <div className="mb-4">
                      <svg className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <p className="text-sm">Select colors and quantities above to see cost breakdown</p>
                  </div>
                )}
              </div>
            </div>


            {/* Action Buttons */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="space-y-4">
                {/* Validation Summary */}
                {Object.keys(selectedColors).length === 0 && (
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs">!</span>
                      </div>
                      <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                        Please select at least one color to continue
                      </span>
                    </div>
                  </div>
                )}

                {/* Additional Instructions Block */}
                {(Object.keys(selectedColors).length > 0 && (Object.keys(logoSetupSelections).length > 0 || (multiSelectOptions.accessories && multiSelectOptions.accessories.length > 0))) && (
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all duration-300">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl flex items-center justify-center shadow-lg">
                        <span className="text-white text-lg">📝</span>
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Additional Instructions</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Special requirements for your order</p>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <textarea
                        value={additionalInstructions}
                        onChange={(e) => setAdditionalInstructions(e.target.value)}
                        placeholder="Add any special instructions for your order (placement details, color preferences, specific requirements, etc.)"
                        className="w-full p-4 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 focus:ring-4 focus:ring-orange-500/20 focus:border-orange-500 transition-all duration-300 resize-none shadow-sm hover:shadow-md"
                        rows={4}
                        maxLength={500}
                      />
                      
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          💡 <strong>Tip:</strong> Be specific about logo placement, colors, or special finishes
                        </div>
                        <div className="text-xs text-orange-600 dark:text-orange-400 font-medium">
                          {500 - additionalInstructions.length} characters remaining
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Previous Order Number Input */}
                {Object.keys(selectedColors).length > 0 && hasLeatherOrRubberPatchSelected() && (
                  <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-2xl p-6 shadow-lg border border-amber-200 dark:border-amber-700 hover:shadow-xl transition-all duration-300 backdrop-blur-sm mb-6">
                    <div className="flex items-center space-x-4 mb-4">
                      <div className="relative">
                        <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
                          <span className="text-white text-xl">🔄</span>
                        </div>
                      </div>
                      <div>
                        <h4 className="text-lg font-bold text-amber-900 dark:text-amber-100">
                          Previous Order Number
                        </h4>
                        <p className="text-sm text-amber-700 dark:text-amber-300">
                          Save on mold charges by referencing a previous order
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <input
                        type="text"
                        value={previousOrderNumber}
                        onChange={(e) => setPreviousOrderNumber(e.target.value)}
                        placeholder="Enter previous order number (e.g., ORD-2024-001)"
                        className="w-full px-4 py-3 border border-amber-300 dark:border-amber-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all duration-200"
                      />
                      <div className="bg-amber-100 dark:bg-amber-900/30 rounded-lg p-3">
                        <div className="text-xs text-amber-800 dark:text-amber-200">
                          <strong>💡 Pro Tip:</strong> If you've previously ordered the same logo design (Rubber Patch or Leather Patch), 
                          enter your order number to automatically waive mold development charges and save $40-$80!
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Enhanced Shipment Number Block */}
                {Object.keys(selectedColors).length > 0 && (
                  <div className="bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-800 dark:to-gray-900/50 rounded-2xl p-6 shadow-xl border border-gray-200/60 dark:border-gray-700/60 hover:shadow-2xl transition-all duration-500 backdrop-blur-sm">
                    <div className="flex items-center space-x-4 mb-6">
                      <div className="relative">
                        <div className="w-14 h-14 bg-gradient-to-br from-lime-500 via-green-500 to-emerald-500 rounded-2xl flex items-center justify-center shadow-lg">
                          <span className="text-white text-2xl">🚢</span>
                        </div>
                        <div className="absolute -inset-1 bg-gradient-to-br from-lime-400 via-green-400 to-emerald-400 rounded-2xl blur opacity-40 animate-pulse"></div>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-gray-100 dark:to-gray-300 bg-clip-text text-transparent">
                          Shipment Integration
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">Combine orders for better pricing</p>
                      </div>
                    </div>
                    
                    {/* Auto-config checkbox */}
                    <div className="flex items-center space-x-3 mb-6 p-4 bg-gradient-to-r from-lime-50 to-green-50 dark:from-lime-900/20 dark:to-green-900/20 rounded-xl border border-lime-200 dark:border-lime-700">
                      <input
                        type="checkbox"
                        id="autoConfigFastestShipment2"
                        checked={autoConfigFastestShipment}
                        onChange={(e) => handleAutoConfigChange(e.target.checked)}
                        className="w-5 h-5 text-lime-600 bg-white border-lime-300 rounded focus:ring-lime-500 dark:focus:ring-lime-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-lime-600"
                      />
                      <label htmlFor="autoConfigFastestShipment2" className="text-sm font-semibold text-lime-800 dark:text-lime-200 cursor-pointer flex items-center space-x-2">
                        <span>⚡</span>
                        <span>Automatically Configured to Fastest Shipment Build</span>
                      </label>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="relative group">
                        <input
                          type="text"
                          id="shipmentNumber"
                          value={shipmentNumber}
                          disabled={autoConfigFastestShipment}
                          onChange={(e) => {
                            if (!autoConfigFastestShipment) {
                              setShipmentNumber(e.target.value);
                              setShowShipmentSuggestions(e.target.value.length > 0);
                            }
                          }}
                          onBlur={() => setTimeout(() => setShowShipmentSuggestions(false), 200)}
                          onFocus={() => setShowShipmentSuggestions(shipmentNumber.length > 0)}
                          placeholder={autoConfigFastestShipment ? "Auto-configured to fastest shipment ⚡" : "Enter shipment number (e.g., SB-2024-001)"}
                          className={`w-full px-4 py-4 border-2 rounded-xl transition-all duration-300 pr-16 shadow-sm backdrop-blur-sm font-medium ${
                            autoConfigFastestShipment
                              ? 'bg-gray-100/80 dark:bg-gray-700/80 text-gray-500 dark:text-gray-400 placeholder-gray-400 dark:placeholder-gray-500 border-gray-300 dark:border-gray-600 cursor-not-allowed'
                              : 'bg-white/80 dark:bg-gray-800/80 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-4 hover:shadow-lg'
                          } ${
                            !autoConfigFastestShipment && (
                              shipmentValidation.isValid === true 
                                ? 'border-green-400 dark:border-green-500 focus:ring-green-500/30 bg-green-50/80 dark:bg-green-900/20 shadow-green-500/20' 
                                : shipmentValidation.isValid === false 
                                ? 'border-red-400 dark:border-red-500 focus:ring-red-500/30 bg-red-50/80 dark:bg-red-900/20 shadow-red-500/20' 
                                : 'border-gray-300 dark:border-gray-600 focus:ring-lime-500/30 focus:border-lime-400 group-hover:border-lime-300 hover:bg-lime-50/30 dark:hover:bg-lime-900/10'
                            )
                          }`}
                        />
                        
                        {/* Enhanced Status Indicator */}
                        <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                          {shipmentValidation.isValidating ? (
                            <div className="relative">
                              <div className="w-6 h-6 border-2 border-lime-500 border-t-transparent rounded-full animate-spin"></div>
                              <div className="absolute inset-0 w-6 h-6 border-2 border-lime-300 border-t-transparent rounded-full animate-spin opacity-50"></div>
                            </div>
                          ) : shipmentValidation.isValid === true ? (
                            <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center shadow-lg">
                              <span className="text-white text-lg">✓</span>
                            </div>
                          ) : shipmentValidation.isValid === false ? (
                            <div className="w-8 h-8 bg-gradient-to-r from-red-500 to-pink-500 rounded-full flex items-center justify-center shadow-lg">
                              <span className="text-white text-lg">✗</span>
                            </div>
                          ) : (
                            <div className="w-6 h-6 bg-gradient-to-r from-gray-400 to-gray-500 rounded-full flex items-center justify-center opacity-60 group-hover:opacity-100 transition-all duration-200">
                              <span className="text-white text-sm">🔍</span>
                            </div>
                          )}
                        </div>
                        
                        {/* Autocomplete Suggestions */}
                        {showShipmentSuggestions && shipmentNumber && !autoConfigFastestShipment && (
                          <div className="absolute top-full left-0 right-0 mt-3 bg-white/95 dark:bg-gray-800/95 border border-gray-200 dark:border-gray-600 rounded-xl shadow-2xl z-50 max-h-48 overflow-y-auto backdrop-blur-md">
                            {getShipmentSuggestions(shipmentNumber).map((shipment, index) => (
                              <div
                                key={shipment.id}
                                onClick={() => {
                                  setShipmentNumber(shipment.buildNumber);
                                  setShowShipmentSuggestions(false);
                                }}
                                className="px-4 py-3 hover:bg-gradient-to-r hover:from-lime-50 hover:to-green-50 dark:hover:from-lime-900/20 dark:hover:to-green-900/20 cursor-pointer border-b border-gray-200 dark:border-gray-600 last:border-b-0 transition-all duration-200 hover:scale-[1.02] transform"
                                style={{ animationDelay: `${index * 50}ms` }}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex-1">
                                    <div className="font-medium text-gray-900 dark:text-gray-100 flex items-center space-x-2">
                                      <span>📦</span>
                                      <span>{shipment.buildNumber}</span>
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center space-x-2 mt-1">
                                      <span>🚚 {shipment.shippingMethod}</span>
                                      <span>•</span>
                                      <span>📋 {shipment._count?.orders || 0} orders</span>
                                    </div>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <span className="text-blue-500 text-sm font-medium">Select</span>
                                    <span className="text-blue-500">→</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                            {getShipmentSuggestions(shipmentNumber).length === 0 && (
                              <div className="px-4 py-6 text-gray-500 dark:text-gray-400 text-sm text-center">
                                <div className="text-4xl mb-2">🔍</div>
                                <div>No matching shipments found</div>
                                <div className="text-xs mt-1">Try a different search term</div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      
                      {/* Enhanced Validation Messages */}
                      {shipmentValidation.error && (
                        <div className="bg-gradient-to-r from-red-50/80 to-pink-50/80 dark:from-red-900/10 dark:to-pink-900/10 border border-red-200/60 dark:border-red-600/60 rounded-xl p-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-gradient-to-r from-red-500 to-pink-500 rounded-lg flex items-center justify-center shadow-sm">
                              <span className="text-white text-sm">⚠️</span>
                            </div>
                            <div className="flex-1">
                              <div className="text-sm font-medium text-red-800 dark:text-red-200 mb-1">
                                Shipment not found
                              </div>
                              <div className="text-xs text-red-600 dark:text-red-400">
                                {shipmentValidation.error}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {shipmentValidation.isValid && shipmentValidation.shipmentData && (
                        <div className="bg-gradient-to-r from-green-50/80 to-emerald-50/80 dark:from-green-900/10 dark:to-emerald-900/10 border border-green-200/60 dark:border-green-600/60 rounded-xl p-4">
                          <div className="flex items-center space-x-3 mb-3">
                            <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center shadow-sm">
                              <span className="text-white text-sm">✓</span>
                            </div>
                            <div className="flex-1">
                              <div className="text-sm font-medium text-green-800 dark:text-green-200">
                                Shipment found - order will be combined
                              </div>
                              <div className="text-xs text-green-600 dark:text-green-400">
                                {shipmentValidation.shipmentData.shippingMethod} • {shipmentValidation.shipmentData._count?.orders || 0} existing orders
                              </div>
                            </div>
                          </div>

                            {/* Enhanced Savings Calculation */}
                            {(() => {
                              // Calculate current order quantity
                              const currentOrderQuantity = Object.values(selectedColors).reduce((sum, colorData) => 
                                sum + Object.values(colorData.sizes).reduce((sizeSum, qty) => sizeSum + qty, 0), 0
                              );
                              
                              // Get existing shipment quantity from orders
                              const existingShipmentQuantity = shipmentValidation.shipmentData.orders?.reduce((total: number, order: any) => {
                                const orderSelectedColors = order.selectedColors as any;
                                let orderQuantity = 0;
                                
                                if (orderSelectedColors && typeof orderSelectedColors === 'object') {
                                  Object.values(orderSelectedColors).forEach((colorData: any) => {
                                    if (colorData && colorData.sizes && typeof colorData.sizes === 'object') {
                                      Object.values(colorData.sizes).forEach((quantity: any) => {
                                        orderQuantity += parseInt(quantity.toString()) || 0;
                                      });
                                    }
                                  });
                                }
                                
                                return total + (orderQuantity || 1);
                              }, 0) || 0;
                              
                              // Calculate total combined quantity
                              const totalCombinedQuantity = currentOrderQuantity + existingShipmentQuantity;
                              
                              // Get pricing tiers
                              const getCurrentTierPrice = (quantity: number): number => {
                                if (quantity >= 10000) return product.pricing.price10000;
                                if (quantity >= 2880) return product.pricing.price2880;
                                if (quantity >= 1152) return product.pricing.price1152;
                                if (quantity >= 576) return product.pricing.price576;
                                if (quantity >= 144) return product.pricing.price144;
                                return product.pricing.price48;
                              };
                              
                              // Calculate costs
                              const currentOrderPrice = getCurrentTierPrice(currentOrderQuantity);
                              const combinedOrderPrice = getCurrentTierPrice(totalCombinedQuantity);
                              
                              const currentOrderCost = currentOrderQuantity * currentOrderPrice;
                              const combinedOrderCost = currentOrderQuantity * combinedOrderPrice;
                              const savings = currentOrderCost - combinedOrderCost;
                              
                              const savingsPercentage = currentOrderCost > 0 ? ((savings / currentOrderCost) * 100) : 0;
                              
                              if (savings > 0) {
                                return (
                                  <div className="mt-3 bg-gradient-to-r from-emerald-100 to-green-100 dark:from-emerald-900/30 dark:to-green-900/30 rounded-lg p-3 border border-emerald-200 dark:border-emerald-700">
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="flex items-center space-x-2">
                                        <span className="text-emerald-600 dark:text-emerald-400 text-lg">💰</span>
                                        <span className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">
                                          Bulk Shipment Savings
                                        </span>
                                      </div>
                                      <div className="text-right">
                                        <div className="text-lg font-bold text-emerald-700 dark:text-emerald-300">
                                          ${savings.toFixed(2)}
                                        </div>
                                        <div className="text-xs text-emerald-600 dark:text-emerald-400">
                                          {savingsPercentage.toFixed(1)}% off
                                        </div>
                                      </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-3 text-xs">
                                      <div className="bg-white dark:bg-gray-800 rounded-lg p-2 border border-emerald-200 dark:border-emerald-700">
                                        <div className="text-emerald-700 dark:text-emerald-300 font-medium mb-1">
                                          Individual Order
                                        </div>
                                        <div className="text-gray-600 dark:text-gray-400">
                                          {currentOrderQuantity} units × ${currentOrderPrice.toFixed(2)}
                                        </div>
                                        <div className="text-emerald-600 dark:text-emerald-400 font-semibold">
                                          ${currentOrderCost.toFixed(2)}
                                        </div>
                                      </div>
                                      
                                      <div className="bg-white dark:bg-gray-800 rounded-lg p-2 border border-emerald-200 dark:border-emerald-700">
                                        <div className="text-emerald-700 dark:text-emerald-300 font-medium mb-1">
                                          Bulk Shipment
                                        </div>
                                        <div className="text-gray-600 dark:text-gray-400">
                                          {currentOrderQuantity} units × ${combinedOrderPrice.toFixed(2)}
                                        </div>
                                        <div className="text-emerald-600 dark:text-emerald-400 font-semibold">
                                          ${combinedOrderCost.toFixed(2)}
                                        </div>
                                      </div>
                                    </div>
                                    
                                    <div className="mt-2 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-2 flex items-center space-x-2">
                                      <span>🎯</span>
                                      <span>
                                        <strong>Total shipment:</strong> {totalCombinedQuantity} units 
                                        ({existingShipmentQuantity} existing + {currentOrderQuantity} your order)
                                      </span>
                                    </div>
                                  </div>
                                );
                              }
                              
                              return (
                                <div className="mt-3 text-xs text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 rounded-lg p-2 flex items-center space-x-2">
                                  <span>💡</span>
                                  <span>
                                    <strong>Great choice!</strong> Adding to shipment with {existingShipmentQuantity} existing units 
                                    (Total: {totalCombinedQuantity} units)
                                  </span>
                                </div>
                              );
                            })()}
                        </div>
                      )}
                      
                      {/* Smart Tip */}
                      {!shipmentValidation.isValid && !shipmentValidation.error && (
                        <div className="bg-gradient-to-r from-lime-50/80 to-green-50/80 dark:from-lime-900/10 dark:to-green-900/10 rounded-xl p-4 border border-lime-200/60 dark:border-lime-700/60">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-gradient-to-r from-lime-500 to-green-500 rounded-lg flex items-center justify-center shadow-sm">
                              <span className="text-white text-sm">💡</span>
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-1">
                                Combine with existing shipments for savings
                              </p>
                              <div className="flex items-center space-x-4 text-xs text-gray-600 dark:text-gray-400">
                                <span className="flex items-center space-x-1">
                                  <span>📦</span>
                                  <span>Bulk pricing</span>
                                </span>
                                <span className="flex items-center space-x-1">
                                  <span>🚚</span>
                                  <span>Shared delivery</span>
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Order Summary */}
                {Object.keys(selectedColors).length > 0 && (
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Order Summary</h4>
                    <div className="space-y-1">
                      {Object.entries(selectedColors).map(([colorName, colorData]) => {
                        const totalQuantity = Object.values(colorData.sizes).reduce((sum, qty) => sum + qty, 0);
                        return (
                          <div key={colorName} className="flex justify-between text-sm">
                            <span className="text-gray-700 dark:text-gray-300">
                              {colorName}
                            </span>
                            <span className="font-medium text-gray-900 dark:text-gray-100">
                              {totalQuantity} units
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Cart/Order Messages */}
                {cartMessage && (
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs">✓</span>
                      </div>
                      <span className="text-sm font-medium text-green-800 dark:text-green-200">
                        {cartMessage}
                      </span>
                    </div>
                  </div>
                )}

                {cartError && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs">!</span>
                      </div>
                      <span className="text-sm font-medium text-red-800 dark:text-red-200">
                        {cartError}
                      </span>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button 
                    onClick={() => (editOrderId ? handleQuickSave() : setShowOrderForm(true))}
                    className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                      Object.keys(selectedColors).length > 0
                        ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 hover:scale-105'
                        : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                    }`}
                    disabled={Object.keys(selectedColors).length === 0}
                    aria-label="Save order"
                  >
                    {editOrderId ? 'Save Order' : (showOrderForm ? 'Hide Order Form' : 'Save Order')}
                  </button>
                  
                  <AddToCartButton
                    productId={`product-${product.name.toLowerCase().replace(/\s+/g, '-')}`}
                    productName={product.name}
                    productSlug={product.name.toLowerCase().replace(/\s+/g, '-')}
                    priceTier={product.priceTier || 'Tier 1'}
                    selectedColors={selectedColors}
                    logoSetupSelections={logoSetupSelections}
                    selectedOptions={{
                      ...selectedOptions,
                      // Ensure fabric setup is included with default value if not explicitly set
                      'fabric-setup': selectedOptions['fabric-setup'] || product.fabricSetup || '',
                      // Include custom fabric setup if relevant
                      'custom-fabric': selectedOptions['custom-fabric'] || product.customFabricSetup || ''
                    }}
                    multiSelectOptions={multiSelectOptions}
                    logoFile={logoFile}
                    uploadedLogoFiles={uploadedLogoFiles}
                    additionalInstructions={additionalInstructions}
                    pricing={getCurrentPricing()}
                    disabled={Object.keys(selectedColors).length === 0}
                    onSuccess={handleCartSuccess}
                    onError={handleCartError}
                    shipmentValidation={shipmentValidation}
                  />
                </div>

                {/* Order Form */}
                {showOrderForm && Object.keys(selectedColors).length > 0 && (
                  <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-600">
                    <CustomerInfoForm 
                      onSubmit={handleSubmitOrder}
                      isLoading={isSubmittingOrder}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Floating Action Bar */}
      <div className="fixed bottom-6 right-6 z-50">
        <div className="flex flex-col space-y-3">
          {/* Quick Actions */}
          <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-md rounded-2xl p-3 shadow-2xl border border-white/30 dark:border-gray-600/30">
            <div className="flex items-center space-x-2">
              <button className="w-10 h-10 bg-gradient-to-br from-lime-500 to-green-500 rounded-xl flex items-center justify-center shadow-lg hover:scale-110 transition-all duration-300 hover:shadow-xl">
                <span className="text-white text-sm">🔍</span>
              </button>
              <button className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center shadow-lg hover:scale-110 transition-all duration-300 hover:shadow-xl">
                <span className="text-white text-sm">❤️</span>
              </button>
              <button className="w-10 h-10 bg-gradient-to-br from-rose-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg hover:scale-110 transition-all duration-300 hover:shadow-xl">
                <span className="text-white text-sm">📷</span>
              </button>
            </div>
          </div>
          
          {/* Scroll to Top */}
          <button 
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="w-12 h-12 bg-gradient-to-br from-gray-600 to-gray-800 rounded-2xl flex items-center justify-center shadow-2xl hover:scale-110 transition-all duration-300 hover:shadow-xl border border-white/20"
          >
            <span className="text-white text-lg">↑</span>
          </button>
        </div>
      </div>
    </div>
    </div>
  );
}
