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
  if (quantity >= 20000 && pricing.price20000) return pricing.price20000;
  if (quantity >= 10000) return pricing.price10000;
  if (quantity >= 2880) return pricing.price2880;
  if (quantity >= 1152) return pricing.price1152;
  if (quantity >= 576) return pricing.price576;
  if (quantity >= 144) return pricing.price144;
  return pricing.price48;
}

// Client-safe unit price calculation (requires pricing data as parameter)
export function calculateUnitPrice(quantity: number, pricingData: ClientPricing): number {
  if (quantity >= 10000) return pricingData.price10000;
  if (quantity >= 2880) return pricingData.price2880;
  if (quantity >= 1152) return pricingData.price1152;
  if (quantity >= 576) return pricingData.price576;
  if (quantity >= 144) return pricingData.price144;
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

// Client-safe hardcoded pricing fallbacks (updated to match CSV data)
// These are used when server-side CSV loading is not available
const FALLBACK_PRICING_TIERS: Record<string, ClientPricing> = {
  'Tier 1': {
    price48: 3.6,
    price144: 3.0,
    price576: 2.9,
    price1152: 2.84,
    price2880: 2.76,
    price10000: 2.7,
  },
  'Tier 2': {
    price48: 4.4,
    price144: 3.2,
    price576: 3.0,
    price1152: 2.9,
    price2880: 2.8,
    price10000: 2.7,
  },
  'Tier 3': {
    price48: 4.8,
    price144: 3.4,
    price576: 3.2,
    price1152: 2.94,
    price2880: 2.88,
    price10000: 2.82,
  },
};

// Client-safe version of getBaseProductPricing (returns hardcoded fallbacks)
export function getBaseProductPricing(tierName?: string): ClientPricing {
  const tier = tierName || 'Tier 1';
  return FALLBACK_PRICING_TIERS[tier] || FALLBACK_PRICING_TIERS['Tier 1'];
}

// Client-safe delivery pricing calculation
export function calculateDeliveryUnitPrice(quantity: number, deliveryMethod: string = 'regular'): number {
  // Hardcoded delivery pricing based on common rates
  const deliveryRates = {
    regular: 0.75,
    express: 1.50,
    overnight: 3.00,
  };
  
  const baseRate = deliveryRates[deliveryMethod as keyof typeof deliveryRates] || deliveryRates.regular;
  
  // Volume discounts for delivery
  if (quantity >= 2880) return baseRate * 0.6;
  if (quantity >= 1152) return baseRate * 0.7;
  if (quantity >= 576) return baseRate * 0.8;
  if (quantity >= 144) return baseRate * 0.9;
  return baseRate;
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
