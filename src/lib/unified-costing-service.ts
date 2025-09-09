/**
 * Unified Costing Service - Single Calculation Engine
 * 
 * This service provides consistent cost calculations for both:
 * - Advanced Product Page (manual configuration)
 * - AI Order System (natural language processing)
 * 
 * Uses the costing-knowledge-base.ts as the single source of truth
 * for all business rules and pricing logic.
 */

import {
  CostingContext,
  CostResult,
  CostBreakdownResult,
  LogoSetupConfig,
  BUSINESS_RULES,
  getQuantityTier,
  getPriceForQuantity,
  isPremiumFabric,
  isPremiumClosure,
  requiresMoldCharge,
  shouldWaiveMoldCharge,
  validateQuantity,
  validateLogoSetup,
  validateDeliveryMethod,
  loadPricingData,
  loadBaseProductPricing
} from './costing-knowledge-base';

import { calculateUnitPrice } from './pricing-server';

// Main service class
export class UnifiedCostingService {
  private pricingData: any[] | null = null;
  private baseProductPricing: any | null = null;

  constructor() {
    this.initializePricingData();
  }

  private async initializePricingData(): Promise<void> {
    try {
      this.pricingData = await loadPricingData();
      this.baseProductPricing = await loadBaseProductPricing();
    } catch (error) {
      console.error('Failed to initialize pricing data:', error);
    }
  }

  private async ensurePricingDataLoaded(): Promise<void> {
    if (!this.pricingData || !this.baseProductPricing) {
      await this.initializePricingData();
    }
  }

  /**
   * Calculate comprehensive cost breakdown for any order configuration
   */
  async calculateCostBreakdown(context: CostingContext): Promise<CostBreakdownResult> {
    await this.ensurePricingDataLoaded();

    // Validate input
    const quantityValidation = validateQuantity(context.quantity);
    if (!quantityValidation.valid) {
      throw new Error(quantityValidation.error);
    }

    if (context.logoSetup) {
      const logoValidation = validateLogoSetup(context.logoSetup);
      if (!logoValidation.valid && logoValidation.errors) {
        throw new Error(logoValidation.errors.join(', '));
      }
    }

    if (context.deliveryMethod) {
      const deliveryValidation = validateDeliveryMethod(context.deliveryMethod, context.quantity);
      if (!deliveryValidation.valid) {
        throw new Error(deliveryValidation.error);
      }
    }

    // Calculate each cost component
    const baseProductCost = await this.calculateBaseProductCost(context);
    const logoSetupCosts = await this.calculateLogoSetupCosts(context);
    const accessoriesCosts = await this.calculateAccessoriesCosts(context);
    const closureCosts = await this.calculateClosureCosts(context);
    const premiumFabricCosts = await this.calculatePremiumFabricCosts(context);
    const deliveryCosts = await this.calculateDeliveryCosts(context);
    const servicesCosts = await this.calculateServicesCosts(context);
    const moldChargeCosts = await this.calculateMoldChargeCosts(context);

    // Calculate total
    const totalCost = baseProductCost +
      logoSetupCosts.reduce((sum, cost) => sum + cost.cost, 0) +
      accessoriesCosts.reduce((sum, cost) => sum + cost.cost, 0) +
      closureCosts.reduce((sum, cost) => sum + cost.cost, 0) +
      premiumFabricCosts.reduce((sum, cost) => sum + cost.cost, 0) +
      deliveryCosts.reduce((sum, cost) => sum + cost.cost, 0) +
      servicesCosts.reduce((sum, cost) => sum + cost.cost, 0) +
      moldChargeCosts.reduce((sum, cost) => sum + cost.cost, 0);

    return {
      baseProductCost,
      logoSetupCosts,
      accessoriesCosts,
      closureCosts,
      premiumFabricCosts,
      deliveryCosts,
      servicesCosts,
      moldChargeCosts,
      totalCost,
      totalUnits: context.quantity
    };
  }

  /**
   * Calculate base product cost using tier pricing
   */
  private async calculateBaseProductCost(context: CostingContext): Promise<number> {
    const tier = context.productTier || BUSINESS_RULES.DEFAULTS.productTier;
    const unitPrice = await calculateUnitPrice(context.quantity, tier);
    return unitPrice * context.quantity;
  }

  /**
   * Calculate logo setup costs with proper 3D embroidery handling
   */
  private async calculateLogoSetupCosts(context: CostingContext): Promise<Array<{
    name: string;
    cost: number;
    unitPrice: number;
    details: string;
    baseUnitPrice?: number;
  }>> {
    if (!context.logoSetup || !this.pricingData) {
      return [];
    }

    const costs: any[] = [];

    for (const logo of context.logoSetup) {
      const result = await this.calculateSingleLogoSetupCost(logo, context.quantity);
      if (result.cost > 0) {
        costs.push({
          name: result.details,
          cost: result.cost,
          unitPrice: result.unitPrice,
          details: result.details,
          baseUnitPrice: this.calculateBaseUnitPrice(logo, 48)
        });
      }
    }

    return costs;
  }

  /**
   * Calculate cost for a single logo setup
   */
  private async calculateSingleLogoSetupCost(logo: LogoSetupConfig, quantity: number): Promise<CostResult> {
    if (!this.pricingData) {
      return { cost: 0, unitPrice: 0, details: 'Pricing data not available' };
    }

    let totalCost = 0;
    let totalUnitPrice = 0;
    let details = '';

    // Handle complex logo combinations like "Large Size Embroidery + 3D Embroidery + Run"
    if (logo.type.includes('+')) {
      return this.parseComplexLogoType(logo.type, quantity);
    }

    // Handle 3D Embroidery special case
    if (logo.type.toLowerCase() === '3d embroidery') {
      // 1. Add Size Embroidery cost
      const sizeEmbroideryName = `${logo.size} Size Embroidery`;
      const sizeEmbroideryPricing = this.pricingData.find(p => 
        p.Name.toLowerCase() === sizeEmbroideryName.toLowerCase()
      );
      
      if (sizeEmbroideryPricing) {
        const sizeUnitPrice = getPriceForQuantity(sizeEmbroideryPricing, quantity);
        totalUnitPrice += sizeUnitPrice;
        totalCost += sizeUnitPrice * quantity;
        details = `${logo.size} Size Embroidery`;
      }
      
      // 2. Add 3D Embroidery base cost
      const threeDPricing = this.pricingData.find(p => 
        p.Name.toLowerCase() === '3d embroidery'
      );
      
      if (threeDPricing) {
        const threeDUnitPrice = getPriceForQuantity(threeDPricing, quantity);
        totalUnitPrice += threeDUnitPrice;
        totalCost += threeDUnitPrice * quantity;
        details += ` + 3D Embroidery`;
      }
    } 
    // Handle Flat Embroidery
    else if (logo.type.toLowerCase() === 'flat embroidery' || logo.type.toLowerCase() === 'embroidery') {
      const sizeEmbroideryName = `${logo.size} Size Embroidery`;
      const sizeEmbroideryPricing = this.pricingData.find(p => 
        p.Name.toLowerCase() === sizeEmbroideryName.toLowerCase()
      );
      
      if (sizeEmbroideryPricing) {
        const sizeUnitPrice = getPriceForQuantity(sizeEmbroideryPricing, quantity);
        totalUnitPrice += sizeUnitPrice;
        totalCost += sizeUnitPrice * quantity;
        details = `${logo.size} Size Embroidery`;
      }
    }
    // Handle patch types and other logo types
    else {
      const logoTypeMapping: Record<string, string> = {
        'printed patch': 'Print Woven Patch',
        'sublimated patch': 'Print Woven Patch',
        'woven patch': 'Print Woven Patch',
        'print patch': 'Print Woven Patch',
        'rubber patch': 'Rubber Patch',
        'leather patch': 'Leather Patch'
      };
      
      const mappedLogoType = logoTypeMapping[logo.type.toLowerCase()] || logo.type;
      const sizeWithMappedType = `${logo.size} ${mappedLogoType}`;
      
      const basePricing = this.pricingData.find(p => 
        p.Name.toLowerCase() === sizeWithMappedType.toLowerCase()
      );

      if (basePricing) {
        const baseUnitPrice = getPriceForQuantity(basePricing, quantity);
        totalUnitPrice += baseUnitPrice;
        totalCost += baseUnitPrice * quantity;
        details = basePricing.Name;
      }
    }

    // Add application method cost if not "Direct"
    if (logo.application && logo.application !== 'Direct') {
      const applicationPricing = this.pricingData.find(p => 
        p.Name.toLowerCase() === logo.application?.toLowerCase()
      );
      
      if (applicationPricing) {
        const applicationUnitPrice = getPriceForQuantity(applicationPricing, quantity);
        totalUnitPrice += applicationUnitPrice;
        totalCost += applicationUnitPrice * quantity;
        details += ` + ${logo.application}`;
      }
    }

    return {
      cost: totalCost,
      unitPrice: totalUnitPrice,
      details: details || `${logo.size} ${logo.type}`
    };
  }

  /**
   * Parse complex logo types like "Large Size Embroidery + 3D Embroidery + Run"
   */
  private parseComplexLogoType(logoType: string, quantity: number): CostResult {
    if (!this.pricingData) {
      return { cost: 0, unitPrice: 0, details: 'Pricing data not available' };
    }

    let totalCost = 0;
    let totalUnitPrice = 0;
    const components: string[] = [];

    // Split by '+' and trim whitespace
    const logoParts = logoType.split('+').map(part => part.trim());

    for (const part of logoParts) {
      const partPricing = this.pricingData.find(p => 
        p.Name.toLowerCase() === part.toLowerCase()
      );

      if (partPricing) {
        const partUnitPrice = getPriceForQuantity(partPricing, quantity);
        totalUnitPrice += partUnitPrice;
        totalCost += partUnitPrice * quantity;
        components.push(part);
      } else {
        // Log missing component for debugging
        console.warn(`Complex logo parsing: Could not find pricing for "${part}" in CSV`);
      }
    }

    return {
      cost: totalCost,
      unitPrice: totalUnitPrice,
      details: components.join(' + ') || logoType
    };
  }

  /**
   * Calculate base unit price for discount calculations
   */
  private calculateBaseUnitPrice(logo: LogoSetupConfig, baseQuantity: number = 48): number {
    if (!this.pricingData) return 0;

    let baseUnitPrice = 0;

    // Handle complex logo combinations for base pricing
    if (logo.type.includes('+')) {
      const logoParts = logo.type.split('+').map(part => part.trim());
      for (const part of logoParts) {
        const partPricing = this.pricingData.find(p => 
          p.Name.toLowerCase() === part.toLowerCase()
        );
        if (partPricing) {
          baseUnitPrice += getPriceForQuantity(partPricing, baseQuantity);
        }
      }
      return baseUnitPrice;
    }

    // Same logic as calculateSingleLogoSetupCost but for base quantity
    if (logo.type.toLowerCase() === '3d embroidery') {
      const sizeEmbroideryName = `${logo.size} Size Embroidery`;
      const sizeEmbroideryPricing = this.pricingData.find(p => 
        p.Name.toLowerCase() === sizeEmbroideryName.toLowerCase()
      );
      
      if (sizeEmbroideryPricing) {
        baseUnitPrice += getPriceForQuantity(sizeEmbroideryPricing, baseQuantity);
      }
      
      const threeDPricing = this.pricingData.find(p => 
        p.Name.toLowerCase() === '3d embroidery'
      );
      
      if (threeDPricing) {
        baseUnitPrice += getPriceForQuantity(threeDPricing, baseQuantity);
      }
    } else if (logo.type.toLowerCase() === 'flat embroidery' || logo.type.toLowerCase() === 'embroidery') {
      const sizeEmbroideryName = `${logo.size} Size Embroidery`;
      const sizeEmbroideryPricing = this.pricingData.find(p => 
        p.Name.toLowerCase() === sizeEmbroideryName.toLowerCase()
      );
      
      if (sizeEmbroideryPricing) {
        baseUnitPrice += getPriceForQuantity(sizeEmbroideryPricing, baseQuantity);
      }
    } else {
      const logoTypeMapping: Record<string, string> = {
        'printed patch': 'Print Woven Patch',
        'sublimated patch': 'Print Woven Patch',
        'woven patch': 'Print Woven Patch',
        'print patch': 'Print Woven Patch',
        'rubber patch': 'Rubber Patch',
        'leather patch': 'Leather Patch'
      };
      
      const mappedLogoType = logoTypeMapping[logo.type.toLowerCase()] || logo.type;
      const sizeWithMappedType = `${logo.size} ${mappedLogoType}`;
      
      const basePricing = this.pricingData.find(p => 
        p.Name.toLowerCase() === sizeWithMappedType.toLowerCase()
      );

      if (basePricing) {
        baseUnitPrice += getPriceForQuantity(basePricing, baseQuantity);
      }
    }

    return baseUnitPrice;
  }

  /**
   * Calculate accessories costs
   */
  private async calculateAccessoriesCosts(context: CostingContext): Promise<Array<{
    name: string;
    cost: number;
    unitPrice: number;
  }>> {
    if (!context.accessories || !this.pricingData) {
      return [];
    }

    const costs: any[] = [];

    for (const accessory of context.accessories) {
      const accessoryPricing = this.pricingData.find(p => 
        p.type.toLowerCase() === 'accessories' && 
        p.Name.toLowerCase() === accessory.toLowerCase()
      );

      if (accessoryPricing) {
        const unitPrice = getPriceForQuantity(accessoryPricing, context.quantity);
        const cost = unitPrice * context.quantity;

        costs.push({
          name: accessoryPricing.Name,
          cost,
          unitPrice
        });

        console.log('🏷️ [UNIFIED-COSTING] Accessory cost calculated:', {
          accessory: accessory,
          unitPrice,
          cost,
          quantity: context.quantity
        });
      } else {
        console.warn(`⚠️ [UNIFIED-COSTING] No pricing found for accessory: "${accessory}"`);
      }
    }

    return costs;
  }

  /**
   * Calculate premium closure costs
   */
  private async calculateClosureCosts(context: CostingContext): Promise<Array<{
    name: string;
    cost: number;
    unitPrice: number;
  }>> {
    if (!context.closureType || !isPremiumClosure(context.closureType) || !this.pricingData) {
      return [];
    }

    const closurePricing = this.pricingData.find(p => 
      p.type === 'Premium Closure' && 
      p.Name.toLowerCase() === context.closureType?.toLowerCase()
    );

    if (closurePricing) {
      const unitPrice = getPriceForQuantity(closurePricing, context.quantity);
      const cost = unitPrice * context.quantity;

      return [{
        name: closurePricing.Name,
        cost,
        unitPrice
      }];
    }

    return [];
  }

  /**
   * Calculate premium fabric costs
   */
  private async calculatePremiumFabricCosts(context: CostingContext): Promise<Array<{
    name: string;
    cost: number;
    unitPrice: number;
  }>> {
    if (!context.fabricType || !isPremiumFabric(context.fabricType) || !this.pricingData) {
      return [];
    }

    const costs: any[] = [];

    // Handle dual fabrics like "Chino Twill/Trucker Mesh"
    const fabricNames = context.fabricType.split('/').map(f => f.trim());

    for (const fabricName of fabricNames) {
      const premiumFabricPricing = this.pricingData.find(p => 
        p.type === 'Premium Fabric' && 
        p.Name.toLowerCase() === fabricName.toLowerCase()
      );

      if (premiumFabricPricing) {
        const unitPrice = getPriceForQuantity(premiumFabricPricing, context.quantity);
        const cost = unitPrice * context.quantity;

        // Avoid duplicates
        if (!costs.find(c => c.name === premiumFabricPricing.Name)) {
          costs.push({
            name: premiumFabricPricing.Name,
            cost,
            unitPrice
          });
        }
      }
    }

    return costs;
  }

  /**
   * Calculate delivery costs with shipment quantity support
   */
  private async calculateDeliveryCosts(context: CostingContext): Promise<Array<{
    name: string;
    cost: number;
    unitPrice: number;
  }>> {
    if (!context.deliveryMethod || !this.pricingData) {
      return [];
    }

    const deliveryTypeMapping: Record<string, string> = {
      'regular': 'Regular Delivery',
      'priority': 'Priority Delivery',
      'air-freight': 'Air Freight',
      'sea-freight': 'Sea Freight',
    };

    const mappedDeliveryName = deliveryTypeMapping[context.deliveryMethod.toLowerCase()] || context.deliveryMethod;
    const deliveryPricing = this.pricingData.find(p => 
      p.type === 'Shipping' && 
      p.Name.toLowerCase() === mappedDeliveryName.toLowerCase()
    );

    if (deliveryPricing) {
      // Use combined quantity for pricing calculation if available
      const pricingQuantity = context.shipmentQuantity ? 
        context.quantity + context.shipmentQuantity : 
        context.quantity;

      const unitPrice = getPriceForQuantity(deliveryPricing, pricingQuantity);
      const cost = unitPrice * context.quantity;

      const displayName = context.shipmentQuantity ? 
        `${deliveryPricing.Name} (Combined: ${pricingQuantity} units)` :
        deliveryPricing.Name;

      return [{
        name: displayName,
        cost,
        unitPrice
      }];
    }

    return [];
  }

  /**
   * Calculate services costs
   */
  private async calculateServicesCosts(context: CostingContext): Promise<Array<{
    name: string;
    cost: number;
    unitPrice: number;
  }>> {
    if (!context.services || !this.pricingData) {
      return [];
    }

    const costs: any[] = [];

    for (const service of context.services) {
      const servicePricing = this.pricingData.find(p => 
        p.type === 'Service' && 
        p.Name.toLowerCase() === service.toLowerCase()
      );

      if (servicePricing) {
        // Services are typically flat-rate (not multiplied by quantity)
        const unitPrice = servicePricing.price48;
        const cost = unitPrice;

        costs.push({
          name: servicePricing.Name,
          cost,
          unitPrice
        });
      }
    }

    return costs;
  }

  /**
   * Calculate mold charge costs with waiver logic
   */
  private async calculateMoldChargeCosts(context: CostingContext): Promise<Array<{
    name: string;
    cost: number;
    unitPrice: number;
    waived: boolean;
    waiverReason?: string;
  }>> {
    if (!context.logoSetup || !this.pricingData) {
      return [];
    }

    const costs: any[] = [];

    for (const logo of context.logoSetup) {
      if (requiresMoldCharge(logo.type)) {
        const moldChargeType = `${logo.size} Mold Charge`;
        const moldPricing = this.pricingData.find(p => 
          p.type === 'Mold' && 
          p.Name.toLowerCase() === moldChargeType.toLowerCase()
        );

        if (moldPricing) {
          const waiver = shouldWaiveMoldCharge(context, logo.type);
          const unitPrice = moldPricing.price48; // Fixed charge regardless of quantity
          const cost = waiver.waived ? 0 : unitPrice;

          costs.push({
            name: `${moldChargeType} (${logo.type})`,
            cost,
            unitPrice: waiver.waived ? 0 : unitPrice,
            waived: waiver.waived,
            waiverReason: waiver.reason
          });
        }
      }
    }

    return costs;
  }

  /**
   * Get budget-friendly suggestions for optimization
   */
  getBudgetOptimizations(context: CostingContext): string[] {
    const optimizations: string[] = [];

    // Suggest default configurations if not using budget-friendly options
    if (context.fabricType !== BUSINESS_RULES.DEFAULTS.fabricType) {
      optimizations.push(`Consider ${BUSINESS_RULES.DEFAULTS.fabricType} fabric for cost savings`);
    }

    if (context.closureType !== BUSINESS_RULES.DEFAULTS.closure) {
      optimizations.push(`${BUSINESS_RULES.DEFAULTS.closure} closure is the most budget-friendly option`);
    }

    // Suggest freight shipping for large orders
    if (context.quantity >= BUSINESS_RULES.FREIGHT_SHIPPING.AIR_FREIGHT_MIN) {
      if (context.deliveryMethod === 'regular') {
        optimizations.push('Large quantity qualifies for freight shipping discounts');
      }
    } else {
      optimizations.push(`Consider increasing to ${BUSINESS_RULES.FREIGHT_SHIPPING.AIR_FREIGHT_MIN}+ caps for freight shipping savings`);
    }

    // Suggest quantity tier upgrades for better pricing
    const currentTier = getQuantityTier(context.quantity);
    const nextTier = QUANTITY_TIERS.find(tier => tier.minQty > context.quantity);
    
    if (nextTier) {
      const difference = nextTier.minQty - context.quantity;
      if (difference <= context.quantity * 0.2) { // Within 20% of next tier
        optimizations.push(`Add ${difference} more units to reach ${nextTier.name} pricing tier`);
      }
    }

    return optimizations;
  }

  /**
   * Quick estimate for simple cases (used by AI system)
   */
  async calculateQuickEstimate(context: CostingContext): Promise<{
    quantity: number;
    costPerUnit: number;
    totalCost: number;
    estimatedBreakdown: {
      baseProduct: number;
      logoSetup: number;
      delivery: number;
      other: number;
    };
  }> {
    // Simple estimation without full breakdown for performance
    const baseUnitPrice = calculateUnitPrice(context.quantity, context.productTier || 'Tier 1');
    const baseProductCost = baseUnitPrice * context.quantity;

    // Rough logo setup estimate
    let logoSetupCost = 0;
    if (context.logoSetup && context.logoSetup.length > 0) {
      const avgLogoPrice = context.logoSetup.some(l => l.type === '3D Embroidery') ? 0.8 : 0.5;
      logoSetupCost = avgLogoPrice * context.quantity * context.logoSetup.length;
    }

    // Rough delivery estimate
    const deliveryUnitPrice = context.deliveryMethod === 'regular' ? 
      (context.quantity >= 2880 ? 1.8 : context.quantity >= 576 ? 1.9 : 2.3) : 2.0;
    const deliveryCost = deliveryUnitPrice * context.quantity;

    const totalCost = baseProductCost + logoSetupCost + deliveryCost;

    return {
      quantity: context.quantity,
      costPerUnit: totalCost / context.quantity,
      totalCost,
      estimatedBreakdown: {
        baseProduct: baseProductCost,
        logoSetup: logoSetupCost,
        delivery: deliveryCost,
        other: 0
      }
    };
  }
}

// Export singleton instance
export const costingService = new UnifiedCostingService();

// Export convenience functions
export async function calculateCost(context: CostingContext): Promise<CostBreakdownResult> {
  return costingService.calculateCostBreakdown(context);
}

export async function calculateQuickEstimate(context: CostingContext) {
  return costingService.calculateQuickEstimate(context);
}

export function getBudgetOptimizations(context: CostingContext): string[] {
  return costingService.getBudgetOptimizations(context);
}