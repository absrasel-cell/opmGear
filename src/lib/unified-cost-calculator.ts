/**
 * UNIFIED COST CALCULATOR - SINGLE SOURCE OF TRUTH
 * 
 * This is the DEFINITIVE cost calculation system that ALL pages must use.
 * Any calculation discrepancies should be fixed HERE, not in individual pages.
 * 
 * Version: 2.0.0 - Emergency Fix for Order #f00e08d3-8364-4f2d-b4b9-b7ef4ddec116
 */

import { CostBreakdown } from '@/lib/pricing';

export interface UnifiedCostResult {
  // Raw costs (CSV prices without margins)
  rawBaseProductCost: number;
  rawLogoCosts: number;
  rawAccessoryCosts: number;
  rawClosureCosts: number;
  rawFabricCosts: number;
  rawDeliveryCosts: number;
  rawMoldCosts: number;
  rawSubtotal: number;


  // Detailed breakdown for UI display
  breakdown: CostBreakdown;

  // Calculation metadata
  calculationId: string;
  timestamp: string;
}

/**
 * UNIFIED COST CALCULATION - USE THIS EVERYWHERE
 * 
 * This function ensures mathematical consistency across all systems:
 * - Cart page
 * - Checkout page 
 * - API calculate-cost
 * - Admin dashboard
 * - Order receipts
 */
export async function calculateUnifiedCosts(
  cartItems: any[],
  costBreakdowns: Record<string, CostBreakdown>
): Promise<UnifiedCostResult> {
  
  const calculationId = `unified_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const timestamp = new Date().toISOString();
  
  console.log('🔧 UNIFIED CALCULATOR - Starting calculation:', calculationId);
  
  try {

    // Initialize totals
    let rawSubtotal = 0;
    
    // Component totals
    let rawBaseProductCost = 0;
    let rawLogoCosts = 0;
    let rawAccessoryCosts = 0;
    let rawClosureCosts = 0;
    let rawFabricCosts = 0;
    let rawDeliveryCosts = 0;
    let rawMoldCosts = 0;

    // Process each cart item's cost breakdown
    Object.values(costBreakdowns).forEach((breakdown) => {
      if (!breakdown) return;

      // Use raw CSV costs directly
      rawBaseProductCost += breakdown.baseProductCost || 0;
      rawLogoCosts += (breakdown.logoSetupCosts || []).reduce((sum, cost) => sum + cost.cost, 0);
      rawAccessoryCosts += (breakdown.accessoriesCosts || []).reduce((sum, cost) => sum + cost.cost, 0);
      rawClosureCosts += (breakdown.closureCosts || []).reduce((sum, cost) => sum + cost.cost, 0);
      rawFabricCosts += (breakdown.premiumFabricCosts || []).reduce((sum, cost) => sum + cost.cost, 0);
      rawDeliveryCosts += (breakdown.deliveryCosts || []).reduce((sum, cost) => sum + cost.cost, 0);
      rawMoldCosts += (breakdown.moldChargeCosts || []).reduce((sum, cost) => sum + cost.cost, 0);
    });

    // Calculate totals
    rawSubtotal = rawBaseProductCost + rawLogoCosts + rawAccessoryCosts + rawClosureCosts + rawFabricCosts + rawDeliveryCosts + rawMoldCosts;

    // Create consolidated breakdown for UI display
    const consolidatedBreakdown: CostBreakdown = {
      baseProductCost: rawBaseProductCost,
      logoSetupCosts: Object.values(costBreakdowns).flatMap(b => b.logoSetupCosts || []),
      accessoriesCosts: Object.values(costBreakdowns).flatMap(b => b.accessoriesCosts || []),
      closureCosts: Object.values(costBreakdowns).flatMap(b => b.closureCosts || []),
      premiumFabricCosts: Object.values(costBreakdowns).flatMap(b => b.premiumFabricCosts || []),
      deliveryCosts: Object.values(costBreakdowns).flatMap(b => b.deliveryCosts || []),
      moldChargeCosts: Object.values(costBreakdowns).flatMap(b => b.moldChargeCosts || []),
      totalCost: rawSubtotal,
      totalUnits: Object.values(costBreakdowns).reduce((sum, b) => sum + (b.totalUnits || 0), 0)
    };

    const result: UnifiedCostResult = {
      // Raw costs (now the same as final costs)
      rawBaseProductCost,
      rawLogoCosts,
      rawAccessoryCosts,
      rawClosureCosts,
      rawFabricCosts,
      rawDeliveryCosts,
      rawMoldCosts,
      rawSubtotal,

      // Breakdown
      breakdown: consolidatedBreakdown,

      // Metadata
      calculationId,
      timestamp
    };

    console.log('🔧 UNIFIED CALCULATOR - Calculation complete:', {
      calculationId,
      totalCost: rawSubtotal,
      components: {
        base: rawBaseProductCost,
        logos: rawLogoCosts,
        accessories: rawAccessoryCosts,
        closures: rawClosureCosts,
        fabric: rawFabricCosts,
        delivery: rawDeliveryCosts,
        mold: rawMoldCosts
      }
    });

    return result;

  } catch (error) {
    console.error('🚨 UNIFIED CALCULATOR ERROR:', error);
    
    // Fallback calculation
    const fallbackTotal = Object.values(costBreakdowns).reduce((sum, breakdown) => 
      sum + (breakdown?.totalCost || 0), 0);
    
    return {
      rawBaseProductCost: fallbackTotal,
      rawLogoCosts: 0,
      rawAccessoryCosts: 0,
      rawClosureCosts: 0,
      rawFabricCosts: 0,
      rawDeliveryCosts: 0,
      rawMoldCosts: 0,
      rawSubtotal: fallbackTotal,
      breakdown: {
        baseProductCost: fallbackTotal,
        logoSetupCosts: [],
        accessoriesCosts: [],
        closureCosts: [],
        premiumFabricCosts: [],
        deliveryCosts: [],
        moldChargeCosts: [],
        totalCost: fallbackTotal,
        totalUnits: 1
      },
      calculationId,
      timestamp
    };
  }
}

/**
 * Ensure consistent total calculation across all pages
 */
export function getConsistentTotal(costBreakdowns: Record<string, CostBreakdown>): number {
  // Use the same calculation logic everywhere - direct CSV costs
  return Object.values(costBreakdowns).reduce((total, breakdown) => {
    if (!breakdown) return total;
    
    let breakdownTotal = breakdown.baseProductCost || 0;
    
    // Add all cost components using direct cost values
    const addCosts = (costs: any[]) => {
      return costs.reduce((sum, cost) => {
        return sum + (cost.cost || 0);
      }, 0);
    };

    breakdownTotal += addCosts(breakdown.logoSetupCosts || []);
    breakdownTotal += addCosts(breakdown.accessoriesCosts || []);
    breakdownTotal += addCosts(breakdown.closureCosts || []);
    breakdownTotal += addCosts(breakdown.premiumFabricCosts || []);
    breakdownTotal += addCosts(breakdown.deliveryCosts || []);
    breakdownTotal += addCosts(breakdown.moldChargeCosts || []);

    return total + breakdownTotal;
  }, 0);
}

/**
 * VERIFICATION: Check if totals match across different calculation methods
 */
export function verifyCalculationConsistency(
  costBreakdowns: Record<string, CostBreakdown>
): {
  isConsistent: boolean;
  breakdownTotal: number;
  apiTotal: number;
  difference: number;
  details: string;
} {
  const breakdownTotal = getConsistentTotal(costBreakdowns);
  const apiTotal = Object.values(costBreakdowns).reduce((sum, b) => sum + (b.totalCost || 0), 0);
  const difference = Math.abs(breakdownTotal - apiTotal);
  const isConsistent = difference < 0.01; // Allow for floating point precision

  return {
    isConsistent,
    breakdownTotal,
    apiTotal,
    difference,
    details: isConsistent 
      ? 'Calculations are consistent'
      : `Inconsistency detected: ${difference.toFixed(2)} difference between breakdown (${breakdownTotal.toFixed(2)}) and API total (${apiTotal.toFixed(2)})`
  };
}