// Updated pricing tiers to match CSV file values (src/app/csv/Blank Cap Pricings.csv)
// These values now match the CSV exactly for consistency across all systems
export const BASE_PRODUCT_PRICING_TIERS = {
  'Tier 1': { 
    price48: 3.6,    // CSV: 3.6 (was 3.60)
    price144: 3,     // CSV: 3 (was 3.00) 
    price576: 2.9,   // CSV: 2.9 (was 2.90)
    price1152: 2.84, // CSV: 2.84 (was 2.84)
    price2880: 2.76, // CSV: 2.76 (was 2.76)
    price10000: 2.7, // CSV: 2.7 (was 2.70)
  },
  'Tier 2': { 
    price48: 4.4,    // CSV: 4.4 (was 4.40)
    price144: 3.2,   // CSV: 3.2 (was 3.20) 
    price576: 3,     // CSV: 3 (was 3.00)
    price1152: 2.9,  // CSV: 2.9 (was 2.90)
    price2880: 2.8,  // CSV: 2.8 (was 2.80)
    price10000: 2.7, // CSV: 2.7 (was 2.70)
  },
  'Tier 3': { 
    price48: 4.8,    // CSV: 4.8 (was 4.80)
    price144: 3.4,   // CSV: 3.4 (was 3.40)
    price576: 3.2,   // CSV: 3.2 (was 3.20)
    price1152: 2.94, // CSV: 2.94 (was 2.94)
    price2880: 2.88, // CSV: 2.88 (was 2.88)
    price10000: 2.82, // CSV: 2.82 (was 2.82)
  }
};

// Default tier for fallbacks
export const DEFAULT_PRICING_TIER = BASE_PRODUCT_PRICING_TIERS['Tier 1']; // Default to Tier 1 (most affordable)

// Get pricing for a specific tier or default to Tier 1
export function getBaseProductPricing(tierName?: string) {
  if (tierName && tierName in BASE_PRODUCT_PRICING_TIERS) {
    return BASE_PRODUCT_PRICING_TIERS[tierName as keyof typeof BASE_PRODUCT_PRICING_TIERS];
  }
  return BASE_PRODUCT_PRICING_TIERS['Tier 1']; // Default to Tier 1 (most affordable)
}

// Calculate unit price based on quantity using tier pricing
export function calculateUnitPrice(quantity: number, tierName?: string): number {
  const pricing = getBaseProductPricing(tierName);
  
  if (quantity >= 10000) return pricing.price10000;
  if (quantity >= 2880) return pricing.price2880;
  if (quantity >= 1152) return pricing.price1152;
  if (quantity >= 576) return pricing.price576;
  if (quantity >= 144) return pricing.price144;
  return pricing.price48;
}

// Delivery pricing from Customization Pricings.csv
export const DELIVERY_PRICING = {
  'Regular Delivery': { 
    price48: 3,
    price144: 2.3,
    price576: 1.9,
    price1152: 1.85,
    price2880: 1.8,
    price10000: 1.7,
    price20000: 1.7
  },
  'Priority Delivery': { 
    price48: 3.2,
    price144: 2.5,
    price576: 2.1,
    price1152: 2.05,
    price2880: 2.1,
    price10000: 2,
    price20000: 2
  },
  'Air Freight': { 
    price48: 0, // Not available
    price144: 0, // Not available
    price576: 0, // Not available
    price1152: 0, // Not available
    price2880: 1.2,
    price10000: 1,
    price20000: 1
  },
  'Sea Freight': { 
    price48: 0, // Not available
    price144: 0, // Not available
    price576: 0, // Not available
    price1152: 0, // Not available
    price2880: 0.4,
    price10000: 0.35,
    price20000: 0.3
  }
};

// Calculate delivery unit price based on quantity and method
export function calculateDeliveryUnitPrice(quantity: number, deliveryMethod: string = 'regular'): number {
  // Map delivery method names to CSV names
  const methodMap: Record<string, string> = {
    'regular': 'Regular Delivery',
    'priority': 'Priority Delivery',
    'air-freight': 'Air Freight', 
    'sea-freight': 'Sea Freight'
  };
  
  const csvMethodName = methodMap[deliveryMethod] || 'Regular Delivery';
  const pricing = DELIVERY_PRICING[csvMethodName as keyof typeof DELIVERY_PRICING];
  
  if (!pricing) return DELIVERY_PRICING['Regular Delivery'].price1152; // fallback
  
  if (quantity >= 20000) return pricing.price20000;
  if (quantity >= 10000) return pricing.price10000;
  if (quantity >= 2880) return pricing.price2880;
  if (quantity >= 1152) return pricing.price1152;
  if (quantity >= 576) return pricing.price576;
  if (quantity >= 144) return pricing.price144;
  return pricing.price48;
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

// Shared cost breakdown interface for consistency across pages
export interface CostBreakdown {
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
 * Calculate base product total from cart items - fallback when no breakdowns available
 */
export function calculateBaseTotal(items: any[]): number {
  return items.reduce((total, item) => {
    const unitPrice = calculateUnitPrice(item.pricing.volume, item.priceTier || 'Tier 1');
    return total + (unitPrice * item.pricing.volume);
  }, 0);
}

/**
 * Get the correct total to display - uses breakdowns if available, otherwise base pricing
 */
export function getDisplayTotal(items: any[], costBreakdowns: Record<string, CostBreakdown>): number {
  const hasAllBreakdowns = items.length > 0 && items.every(item => costBreakdowns[item.id]);
  
  if (hasAllBreakdowns) {
    return calculateGrandTotal(costBreakdowns);
  }
  
  return calculateBaseTotal(items);
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
