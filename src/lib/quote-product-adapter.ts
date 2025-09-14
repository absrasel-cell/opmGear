/**
 * QUOTE PRODUCT ADAPTER - Complex to Simple Translation
 * 
 * This adapter translates between the advanced product system and the
 * simplified quote system, maintaining UX simplicity while using advanced data.
 * 
 * Key Functions:
 * - Simplify complex product configurations for quote UI
 * - Provide fallback mechanisms for missing data
 * - Translate quote selections back to advanced format
 * - Calculate pricing using unified cost calculator
 */

import { QuoteProduct, QuoteColorOption, QuoteLogoOption, QuoteDataService } from './quote-data-service';
import { calculateUnitPrice } from './pricing-server';

export interface QuoteConfiguration {
  productId: string;
  product?: QuoteProduct;
  quantity: number;
  selectedColor?: QuoteColorOption;
  selectedLogo?: QuoteLogoOption;
  logoPosition?: string;
  logoSize?: string;
  additionalServices: Array<{
    id: string;
    name: string;
    price: number;
  }>;
  deliveryOption: {
    id: string;
    name: string;
    price: number;
    days: string;
  };
}

export interface QuotePricing {
  baseProductCost: number;
  logoCost: number;
  servicesCost: number;
  deliveryCost: number;
  subtotal: number;
  totalCost: number;
  unitPrice: number;
  quantity: number;
  breakdown: {
    baseProduct: { name: string; cost: number; unitPrice: number };
    logo?: { name: string; cost: number; unitPrice: number };
    services: Array<{ name: string; cost: number }>;
    delivery: { name: string; cost: number };
  };
}

export interface QuoteSimplifiedProduct {
  id: string;
  name: string;
  description: string;
  image: string;
  basePrice: number;
  priceTier: string;
  colorOptions: QuoteColorOption[];
  logoOptions: QuoteLogoOption[];
}

export class QuoteProductAdapter {
  
  /**
   * Convert advanced product to simplified quote product
   */
  static simplifyProduct(product: QuoteProduct): QuoteSimplifiedProduct {
    const colorOptions = QuoteDataService.extractColorOptions(product);
    const logoOptions = QuoteDataService.extractLogoOptions(product.productOptions);
    
    return {
      id: product.id,
      name: product.name,
      description: product.description || `${product.name} - Custom baseball cap`,
      image: product.mainImage.url || '/images/caps/default-cap.jpg',
      basePrice: product.pricing.price48, // Use 48-unit pricing as base
      priceTier: product.priceTier,
      colorOptions,
      logoOptions,
    };
  }
  
  /**
   * Convert quote configuration to pricing calculation format
   */
  static async convertToClientSideCalculation(config: QuoteConfiguration): Promise<{
    baseProductCost: number;
    logoCost: number;
    servicesCost: number;
    deliveryCost: number;
  }> {
    const product = config.product;
    
    // 🔧 CRITICAL FIX: Provide fallback calculation when product is missing
    if (!product) {
      console.warn('Product data missing for pricing calculation, using fallback pricing');
      
      // Use fallback pricing based on productId or default tier pricing
      const fallbackTier = 'Tier 1'; // Default tier
      const unitPrice = await calculateUnitPrice(config.quantity, fallbackTier);
      const baseProductCost = unitPrice * config.quantity;
      
      // Calculate logo cost using fallback pricing
      const logoCost = config.selectedLogo 
        ? config.selectedLogo.price * config.quantity 
        : 0;
      
      // Calculate services cost
      const servicesCost = config.additionalServices.reduce((sum, service) => sum + service.price, 0);
      
      // Delivery cost
      const deliveryCost = config.deliveryOption.price;
      
      return {
        baseProductCost,
        logoCost,
        servicesCost,
        deliveryCost,
      };
    }
    
    // Calculate base product cost using tier pricing
    const unitPrice = await calculateUnitPrice(config.quantity, product.priceTier);
    const baseProductCost = unitPrice * config.quantity;
    
    // Calculate logo cost
    const logoCost = config.selectedLogo 
      ? config.selectedLogo.price * config.quantity 
      : 0;
    
    // Calculate services cost
    const servicesCost = config.additionalServices.reduce((sum, service) => sum + service.price, 0);
    
    // Delivery cost
    const deliveryCost = config.deliveryOption.price;
    
    return {
      baseProductCost,
      logoCost,
      servicesCost,
      deliveryCost,
    };
  }
  
  /**
   * Calculate quote pricing using client-side calculation
   */
  static async calculateQuotePricing(config: QuoteConfiguration): Promise<QuotePricing> {
    try {
      // Use client-side calculation for quotes
      const calculations = await this.convertToClientSideCalculation(config);
      
      return this.buildQuotePricingFromCalculations(config, calculations);
      
    } catch (error) {
      console.error('Error calculating quote pricing:', error);
      
      // Fallback to simple calculation
      return await this.calculateSimplePricing(config);
    }
  }
  
  /**
   * Build quote pricing from client-side calculations
   */
  private static buildQuotePricingFromCalculations(
    config: QuoteConfiguration, 
    calculations: {
      baseProductCost: number;
      logoCost: number;
      servicesCost: number;
      deliveryCost: number;
    }
  ): QuotePricing {
    const { baseProductCost, logoCost, servicesCost, deliveryCost } = calculations;
    const subtotal = baseProductCost + logoCost + servicesCost;
    const totalCost = subtotal + deliveryCost;
    const unitPrice = totalCost / config.quantity;
    
    return {
      baseProductCost,
      logoCost,
      servicesCost,
      deliveryCost,
      subtotal,
      totalCost,
      unitPrice,
      quantity: config.quantity,
      breakdown: {
        baseProduct: {
          name: config.product?.name || 'Custom Cap',
          cost: baseProductCost,
          unitPrice: baseProductCost / config.quantity,
        },
        logo: config.selectedLogo ? {
          name: config.selectedLogo.name,
          cost: logoCost,
          unitPrice: logoCost / config.quantity,
        } : undefined,
        services: config.additionalServices.map(service => ({
          name: service.name,
          cost: service.price,
        })),
        delivery: {
          name: config.deliveryOption.name,
          cost: deliveryCost,
        },
      },
    };
  }
  
  /**
   * Simple pricing calculation (fallback)
   */
  private static async calculateSimplePricing(config: QuoteConfiguration): Promise<QuotePricing> {
    const product = config.product;
    
    // 🔧 CRITICAL FIX: Provide fallback calculation when product is missing
    if (!product) {
      console.warn('Product data missing for simple pricing calculation, using fallback pricing');
      
      // Use fallback pricing
      const fallbackTier = 'Tier 1'; // Default tier
      const unitPrice = await calculateUnitPrice(config.quantity, fallbackTier);
      const baseProductCost = unitPrice * config.quantity;
      
      // Calculate logo cost
      const logoCost = config.selectedLogo 
        ? config.selectedLogo.price * config.quantity 
        : 0;
      
      // Calculate services cost
      const servicesCost = config.additionalServices.reduce((sum, service) => sum + service.price, 0);
      
      // Delivery cost
      const deliveryCost = config.deliveryOption.price;
      
      const subtotal = baseProductCost + logoCost + servicesCost;
      const totalCost = subtotal + deliveryCost;
      const totalUnitPrice = totalCost / config.quantity;
      
      return {
        baseProductCost,
        logoCost,
        servicesCost,
        deliveryCost,
        subtotal,
        totalCost,
        unitPrice: totalUnitPrice,
        quantity: config.quantity,
        breakdown: {
          baseProduct: {
            name: config.productId || 'Custom Cap',
            cost: baseProductCost,
            unitPrice: unitPrice,
          },
          logo: config.selectedLogo ? {
            name: config.selectedLogo.name,
            cost: logoCost,
            unitPrice: config.selectedLogo.price,
          } : undefined,
          services: config.additionalServices.map(service => ({
            name: service.name,
            cost: service.price,
          })),
          delivery: {
            name: config.deliveryOption.name,
            cost: deliveryCost,
          },
        },
      };
    }
    
    // Calculate base product cost using tier pricing
    const unitPrice = await calculateUnitPrice(config.quantity, product.priceTier);
    const baseProductCost = unitPrice * config.quantity;
    
    // Calculate logo cost
    const logoCost = config.selectedLogo 
      ? config.selectedLogo.price * config.quantity 
      : 0;
    
    // Calculate services cost
    const servicesCost = config.additionalServices.reduce((sum, service) => sum + service.price, 0);
    
    // Delivery cost
    const deliveryCost = config.deliveryOption.price;
    
    const subtotal = baseProductCost + logoCost + servicesCost;
    const totalCost = subtotal + deliveryCost;
    const totalUnitPrice = totalCost / config.quantity;
    
    return {
      baseProductCost,
      logoCost,
      servicesCost,
      deliveryCost,
      subtotal,
      totalCost,
      unitPrice: totalUnitPrice,
      quantity: config.quantity,
      breakdown: {
        baseProduct: {
          name: product.name,
          cost: baseProductCost,
          unitPrice: unitPrice,
        },
        logo: config.selectedLogo ? {
          name: config.selectedLogo.name,
          cost: logoCost,
          unitPrice: config.selectedLogo.price,
        } : undefined,
        services: config.additionalServices.map(service => ({
          name: service.name,
          cost: service.price,
        })),
        delivery: {
          name: config.deliveryOption.name,
          cost: deliveryCost,
        },
      },
    };
  }
  
  /**
   * Get available quantities with pricing tiers
   */
  static async getQuantityTiers(product: QuoteProduct): Promise<Array<{
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    savings?: number;
    label: string;
  }>> {
    const quantities = [48, 144, 576, 1152, 2880, 10000];
    const baseUnitPrice = product.pricing.price48;
    
    const tierResults = await Promise.all(
      quantities.map(async qty => {
        const unitPrice = await calculateUnitPrice(qty, product.priceTier);
        const totalPrice = unitPrice * qty;
        const baseTotalPrice = baseUnitPrice * qty;
        const savings = qty > 48 ? baseTotalPrice - totalPrice : 0;

        return {
          quantity: qty,
          unitPrice,
          totalPrice,
          savings,
          label: `${qty.toLocaleString()} units - $${unitPrice.toFixed(2)}/unit`,
        };
      })
    );

    return tierResults;
  }
  
  /**
   * Generate quote summary for AI chat
   */
  static generateQuoteSummary(config: QuoteConfiguration, pricing: QuotePricing): string {
    const product = config.product;
    if (!product) return 'Quote configuration incomplete';
    
    let summary = `**Quote Summary:**\n\n`;
    summary += `**Product:** ${product.name}\n`;
    summary += `**Quantity:** ${config.quantity.toLocaleString()} units\n`;
    summary += `**Base Price:** $${pricing.breakdown.baseProduct.unitPrice.toFixed(2)}/unit\n\n`;
    
    if (config.selectedColor) {
      summary += `**Color:** ${config.selectedColor.name}\n`;
    }
    
    if (config.selectedLogo && pricing.breakdown.logo) {
      summary += `**Logo:** ${pricing.breakdown.logo.name}\n`;
      summary += `**Logo Cost:** +$${pricing.breakdown.logo.unitPrice.toFixed(2)}/unit\n`;
    }
    
    if (config.additionalServices.length > 0) {
      summary += `**Additional Services:**\n`;
      config.additionalServices.forEach(service => {
        summary += `- ${service.name}: $${service.price}\n`;
      });
    }
    
    summary += `**Delivery:** ${config.deliveryOption.name} - $${config.deliveryOption.price}\n\n`;
    
    summary += `**Pricing Breakdown:**\n`;
    summary += `- Base Product: $${pricing.baseProductCost.toLocaleString()}\n`;
    if (pricing.logoCost > 0) {
      summary += `- Logo Setup: $${pricing.logoCost.toLocaleString()}\n`;
    }
    if (pricing.servicesCost > 0) {
      summary += `- Services: $${pricing.servicesCost.toLocaleString()}\n`;
    }
    if (pricing.deliveryCost > 0) {
      summary += `- Delivery: $${pricing.deliveryCost.toLocaleString()}\n`;
    }
    
    summary += `\n**Total: $${pricing.totalCost.toLocaleString()}** (${pricing.unitPrice.toFixed(2)}/unit)\n`;
    
    return summary;
  }
  
  /**
   * Validate quote configuration
   */
  static validateConfiguration(config: QuoteConfiguration): { 
    isValid: boolean; 
    errors: string[]; 
    warnings: string[]; 
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Required fields
    if (!config.productId) {
      errors.push('Product selection is required');
    }
    
    if (!config.quantity || config.quantity < 48) {
      errors.push('Minimum quantity is 48 units');
    }
    
    if (!config.selectedColor) {
      warnings.push('Color selection recommended for accurate preview');
    }
    
    if (!config.selectedLogo) {
      warnings.push('Logo selection required for complete customization');
    }
    
    if (!config.deliveryOption) {
      errors.push('Delivery option is required');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }
  
  /**
   * Get recommended products based on quantity and budget
   */
  static async getRecommendations(
    quantity: number, 
    budget?: number, 
    preferences?: {
      style?: string;
      tier?: string;
      features?: string[];
    }
  ): Promise<QuoteSimplifiedProduct[]> {
    try {
      const products = await QuoteDataService.getProducts(10);
      
      let recommendations = products.map(product => this.simplifyProduct(product));
      
      // Filter by budget if specified
      if (budget) {
        const maxUnitPrice = budget / quantity;
        const budgetFilteredRecommendations = [];

        for (const product of recommendations) {
          const unitPrice = await calculateUnitPrice(quantity, product.priceTier);
          if (unitPrice <= maxUnitPrice) {
            budgetFilteredRecommendations.push(product);
          }
        }

        recommendations = budgetFilteredRecommendations;
      }
      
      // Filter by tier preference
      if (preferences?.tier) {
        recommendations = recommendations.filter(product => 
          product.priceTier === preferences.tier
        );
      }
      
      // Sort by price (ascending) and popularity
      const sortedRecommendations = [];
      for (const product of recommendations) {
        const unitPrice = await calculateUnitPrice(quantity, product.priceTier);
        sortedRecommendations.push({ ...product, sortPrice: unitPrice });
      }

      sortedRecommendations.sort((a, b) => a.sortPrice - b.sortPrice);
      recommendations = sortedRecommendations.map(({ sortPrice, ...product }) => product);
      
      return recommendations.slice(0, 5); // Return top 5 recommendations
      
    } catch (error) {
      console.error('Error getting product recommendations:', error);
      return [];
    }
  }
}