// CLIENT-SAFE PRICING UTILITIES AND INTERFACES
// This file contains only interfaces and utility functions that work on both client and server

// Re-export server-side functions for server-only usage
export type { BaseProductPricing, CustomizationPricing } from './pricing-server';

// Client-safe pricing interface
export interface ClientPricing {
  price48: number;
  price144: number;
  price576: number;
  price1152: number;
  price2880: number;
  price10000: number;
}

// Helper function to get price for quantity from CSV pricing data (client-safe)
export function getPriceForQuantityFromCSV(pricing: any, quantity: number): number {
  // 🚨 CRITICAL FIX: Correct tier boundaries to match business requirements
  // CORRECTED Tier boundaries: 48+→price48, 144+→price144, 576+→price576, 1152+→price1152, 2880+→price2880, 10000+→price10000
  if (quantity >= 20000 && pricing.price20000) return pricing.price20000;
  if (quantity >= 10000 && pricing.price10000) return pricing.price10000;
  if (quantity >= 2880 && pricing.price2880) return pricing.price2880;  // 🎯 FIXED!
  if (quantity >= 1152 && pricing.price1152) return pricing.price1152;  // 🎯 FIXED!
  if (quantity >= 576 && pricing.price576) return pricing.price576;    // 🎯 FIXED!
  if (quantity >= 144 && pricing.price144) return pricing.price144;    // 🎯 FIXED! 144 caps = $3.75
  if (quantity >= 48 && pricing.price48) return pricing.price48;      // 🎯 FIXED!
  return pricing.price48;
}

// Client-safe unit price calculation (requires pricing data as parameter)
export function calculateUnitPrice(quantity: number, pricingData: ClientPricing): number {
  // 🚨 CRITICAL FIX: Correct tier boundaries to match business requirements
  // CORRECTED Tier boundaries: 48+→price48, 144+→price144, 576+→price576, 1152+→price1152, 2880+→price2880, 10000+→price10000
  if (quantity >= 10000) return pricingData.price10000;
  if (quantity >= 2880) return pricingData.price2880;    // 🎯 FIXED!
  if (quantity >= 1152) return pricingData.price1152;   // 🎯 FIXED!
  if (quantity >= 576) return pricingData.price576;     // 🎯 FIXED!
  if (quantity >= 144) return pricingData.price144;     // 🎯 FIXED! 144 caps = $3.75
  if (quantity >= 48) return pricingData.price48;       // 🎯 FIXED!
  return pricingData.price48;
}

// Export the interface for use in other files
export interface CustomizationPricing {
  Name: string;
  type: string;
  price48: number;
  price144: number;
  price576: number;
  price1152: number;
  price2880: number;
  price10000: number;
  price20000: number;
}

// REMOVED: All hardcoded pricing fallbacks have been eliminated.
// The system now exclusively uses live CSV data for accurate pricing.
// This ensures pricing consistency and eliminates hardcoded cost data.

// Client-safe version of getBaseProductPricing (requires server-side CSV loading)
// This function can only be used on the server-side as it requires CSV access
export function getBaseProductPricing(tierName?: string): ClientPricing {
  throw new Error('getBaseProductPricing requires server-side CSV loading. Use server-side functions from pricing-server.ts instead.');
}

// Client-safe delivery pricing calculation (requires server-side CSV loading)
// This function can only be used on the server-side as it requires CSV access
export function calculateDeliveryUnitPrice(quantity: number, deliveryMethod: string = 'regular'): number {
  throw new Error('calculateDeliveryUnitPrice requires server-side CSV loading. Use server-side functions from pricing-server.ts instead.');
}

// Shared cost breakdown interface for consistency across pages
export interface CostBreakdown {
  baseProductCost: number;
  logoSetupCosts: Array<{
    name: string;
    cost: number;
    unitPrice: number;
    details: string;
    baseUnitPrice?: number;
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
  servicesCosts: Array<{
    name: string;
    cost: number;
    unitPrice: number;
  }>;
  moldChargeCosts?: Array<{
    name: string;
    cost: number;
    unitPrice: number;
    waived: boolean;
    waiverReason?: string;
  }>;
  totalCost: number;
  totalUnits: number;
}

/**
 * Calculate grand total from cost breakdowns - consistent across cart and checkout
 */
export function calculateGrandTotal(costBreakdowns: Record<string, CostBreakdown>): number {
  return Object.values(costBreakdowns).reduce((total, breakdown) => total + breakdown.totalCost, 0);
}

/**
 * Calculate base product total from cart items using CSV pricing - fallback when no breakdowns available
 */
export async function calculateBaseTotal(items: any[]): Promise<number> {
  let total = 0;
  
  for (const item of items) {
    const unitPrice = await calculateUnitPrice(item.pricing.volume, item.priceTier || 'Tier 1');
    total += unitPrice * item.pricing.volume;
  }
  
  return total;
}

/**
 * Get the correct total to display - uses breakdowns if available, otherwise CSV-based pricing
 */
export async function getDisplayTotal(items: any[], costBreakdowns: Record<string, CostBreakdown>): Promise<number> {
  const hasAllBreakdowns = items.length > 0 && items.every(item => costBreakdowns[item.id]);
  
  if (hasAllBreakdowns) {
    return calculateGrandTotal(costBreakdowns);
  }
  
  return await calculateBaseTotal(items);
}

/**
 * Volume discount information interface
 */
export interface VolumeDiscountInfo {
  regularPrice: number;
  discountedPrice: number;
  savings: number;
  savingsPercentage: number;
  totalSavings: number;
  tierName: string;
}

/**
 * Calculate volume discount information for display purposes
 * Used to show volume discounts and savings in the cart
 */
export function calculateVolumeDiscount(unitPrice: number, totalUnits: number, pricingData: any): VolumeDiscountInfo | null {
  if (!pricingData) return null;
  
  // Define pricing tiers in descending order
  const pricingTiers = [
    { name: '10000+', price: pricingData.price10000, minQty: 10000 },
    { name: '2880+', price: pricingData.price2880, minQty: 2880 },
    { name: '1152+', price: pricingData.price1152, minQty: 1152 },
    { name: '576+', price: pricingData.price576, minQty: 576 },
    { name: '144+', price: pricingData.price144, minQty: 144 },
    { name: '48+', price: pricingData.price48, minQty: 48 }
  ];

  // Find current tier based on unit price (within small tolerance for floating point comparison)
  const currentTier = pricingTiers.find(tier => Math.abs(tier.price - unitPrice) < 0.01);
  const regularPrice = pricingData.price48; // Regular price is always 48+ pricing
  
  if (!currentTier || currentTier.minQty <= 48) {
    return null; // No discount for 48+ tier or invalid tier
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
