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
