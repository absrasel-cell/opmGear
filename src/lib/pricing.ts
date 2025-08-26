// Centralized base product pricing tiers to ensure consistency across all pages
export const BASE_PRODUCT_PRICING_TIERS = {
  'Tier 1': {
    price48: 1.80,
    price144: 1.50,
    price576: 1.45,
    price1152: 1.42,
    price2880: 1.38,
    price10000: 1.35,
  },
  'Tier 2': {
    price48: 2.20,
    price144: 1.60,
    price576: 1.50,
    price1152: 1.45,
    price2880: 1.40,
    price10000: 1.35,
  },
  'Tier 3': {
    price48: 2.40,
    price144: 1.70,
    price576: 1.60,
    price1152: 1.47,
    price2880: 1.44,
    price10000: 1.41,
  }
};

// Default tier for fallbacks (most conservative pricing)
export const DEFAULT_PRICING_TIER = BASE_PRODUCT_PRICING_TIERS['Tier 1'];

// Get pricing for a specific tier or default tier
export function getBaseProductPricing(tierName?: string) {
  if (tierName && tierName in BASE_PRODUCT_PRICING_TIERS) {
    return BASE_PRODUCT_PRICING_TIERS[tierName as keyof typeof BASE_PRODUCT_PRICING_TIERS];
  }
  return DEFAULT_PRICING_TIER;
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
 * Apply global margin settings to factory pricing
 * This function integrates with the Global Margin Settings from the admin dashboard
 */
export interface GlobalMarginSetting {
  category: 'blank_caps' | 'customization' | 'delivery';
  marginPercent: number;
  flatMargin: number;
}

/**
 * Calculate price with global margins applied to factory cost
 */
export function applyGlobalMargins(
  factoryCost: number,
  category: 'blank_caps' | 'customization' | 'delivery',
  margins?: GlobalMarginSetting[]
): number {
  if (!margins || margins.length === 0) {
    return factoryCost; // No margins applied
  }
  
  const applicableMargin = margins.find(m => m.category === category);
  if (!applicableMargin) {
    return factoryCost; // No margin for this category
  }
  
  const marginAmount = (factoryCost * applicableMargin.marginPercent / 100) + applicableMargin.flatMargin;
  return Math.max(0, factoryCost + marginAmount);
}

/**
 * Batch apply margins to multiple cost items
 */
export function applyMarginsToBreakdown(
  breakdown: CostBreakdown,
  margins?: GlobalMarginSetting[]
): CostBreakdown {
  if (!margins || margins.length === 0) {
    return breakdown; // Return original if no margins
  }
  
  // Apply margins to each cost category
  const updatedBreakdown: CostBreakdown = {
    ...breakdown,
    baseProductCost: applyGlobalMargins(breakdown.baseProductCost, 'blank_caps', margins),
    logoSetupCosts: breakdown.logoSetupCosts.map(cost => ({
      ...cost,
      cost: applyGlobalMargins(cost.cost, 'customization', margins)
    })),
    accessoriesCosts: breakdown.accessoriesCosts.map(cost => ({
      ...cost,
      cost: applyGlobalMargins(cost.cost, 'customization', margins)
    })),
    closureCosts: breakdown.closureCosts.map(cost => ({
      ...cost,
      cost: applyGlobalMargins(cost.cost, 'customization', margins)
    })),
    premiumFabricCosts: breakdown.premiumFabricCosts.map(cost => ({
      ...cost,
      cost: applyGlobalMargins(cost.cost, 'customization', margins)
    })),
    deliveryCosts: breakdown.deliveryCosts.map(cost => ({
      ...cost,
      cost: applyGlobalMargins(cost.cost, 'delivery', margins)
    }))
  };
  
  // Recalculate total cost
  updatedBreakdown.totalCost = 
    updatedBreakdown.baseProductCost +
    updatedBreakdown.logoSetupCosts.reduce((sum, cost) => sum + cost.cost, 0) +
    updatedBreakdown.accessoriesCosts.reduce((sum, cost) => sum + cost.cost, 0) +
    updatedBreakdown.closureCosts.reduce((sum, cost) => sum + cost.cost, 0) +
    updatedBreakdown.premiumFabricCosts.reduce((sum, cost) => sum + cost.cost, 0) +
    updatedBreakdown.deliveryCosts.reduce((sum, cost) => sum + cost.cost, 0);
    
  return updatedBreakdown;
}
