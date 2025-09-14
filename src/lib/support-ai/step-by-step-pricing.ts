/**
 * SUPPORT PAGE AI - STEP-BY-STEP PRICING SYSTEM
 * COMPLETELY SEPARATE FROM ADVANCED PRODUCT PAGE
 *
 * Follows currentTask.txt guidelines:
 * Step 1: Blank Cap costing (Supabase products table)
 * Step 2: Premium Closures/Fabrics/Accessories (Supabase tables)
 * Step 3: Logo Setup (Supabase logo_methods table)
 * Step 4: Accessories (Supabase accessories table)
 * Step 5: Delivery (Supabase delivery_methods table)
 *
 * Each step with AI verification and Order Builder integration
 */

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client for support AI only - use service role for server-side operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export interface SupportPricingStep {
  stepNumber: number;
  stepName: string;
  completed: boolean;
  data: any;
  cost: number;
  verification: 'pending' | 'verified' | 'error';
  errors?: string[];
}

export interface SupportOrderBuilder {
  capStyle: SupportPricingStep;
  premiumUpgrades: SupportPricingStep;
  logoSetup: SupportPricingStep;
  accessories: SupportPricingStep;
  delivery: SupportPricingStep;
  totalCost: number;
  allStepsCompleted: boolean;
}

export class SupportAIPricingService {

  /**
   * Step 1: Fetch Blank Cap cost data from Supabase products table
   */
  async processBlankCapCost(
    customerRequest: string,
    quantity: number
  ): Promise<SupportPricingStep> {
    try {
      console.log('🎯 [SUPPORT AI] Step 1: Analyzing blank cap requirements');

      // AI analysis of customer request using custom cap 101.txt knowledge
      const capAnalysis = await this.analyzeCapRequirements(customerRequest);

      // Fetch from Supabase products table with pricing tier join
      const { data: products, error } = await supabase
        .from('products')
        .select(`
          *,
          pricing_tier:pricing_tiers(*)
        `)
        .eq('is_active', true);

      if (error) throw error;

      if (!products || products.length === 0) {
        throw new Error('No products found in database');
      }

      // AI selects best match based on user requirements or intelligent default selection
      const selectedProduct = this.selectBestProduct(products, capAnalysis) || this.getDefaultProduct(products, capAnalysis);
      const tierCost = await this.calculateTierCost(selectedProduct.pricing_tier_id, quantity);

      return {
        stepNumber: 1,
        stepName: 'Cap Style Setup',
        completed: true,
        data: {
          productName: selectedProduct.name,
          priceTier: selectedProduct.pricing_tier?.tier_name || 'Unknown',
          quantity,
          unitPrice: tierCost.unitPrice,
          capDetails: capAnalysis
        },
        cost: tierCost.totalCost,
        verification: 'verified'
      };

    } catch (error) {
      return {
        stepNumber: 1,
        stepName: 'Cap Style Setup',
        completed: false,
        data: null,
        cost: 0,
        verification: 'error',
        errors: [`Step 1 failed: ${error instanceof Error ? error.message : String(error)}`]
      };
    }
  }

  /**
   * Step 2: Premium Closures/Fabrics from Supabase tables
   */
  async processPremiumUpgrades(
    customerRequest: string,
    quantity: number
  ): Promise<SupportPricingStep> {
    try {
      console.log('🎯 [SUPPORT AI] Step 2: Analyzing premium upgrades');

      let totalCost = 0;
      const upgradeData: any = {};

      // Check for premium fabrics
      const fabricAnalysis = await this.analyzeFabricRequirements(customerRequest);
      if (fabricAnalysis.hasPremiumFabric) {
        const { data: fabrics } = await supabase
          .from('premium_fabrics')
          .select('*')
          .eq('name', fabricAnalysis.fabricType)
          .single();

        if (fabrics) {
          const fabricCost = this.getQuantityTierPrice(fabrics, quantity);
          totalCost += fabricCost * quantity;
          upgradeData.fabric = { type: fabrics.name, cost: fabricCost * quantity };
        }
      }

      // Check for premium closures
      const closureAnalysis = await this.analyzeClosureRequirements(customerRequest);
      if (closureAnalysis.hasPremiumClosure) {
        const { data: closures } = await supabase
          .from('premium_closures')
          .select('*')
          .eq('name', closureAnalysis.closureType)
          .single();

        if (closures) {
          const closureCost = this.getQuantityTierPrice(closures, quantity);
          totalCost += closureCost * quantity;
          upgradeData.closure = { type: closures.name, cost: closureCost * quantity };
        }
      }

      return {
        stepNumber: 2,
        stepName: 'Premium Upgrades',
        completed: totalCost > 0,
        data: upgradeData,
        cost: totalCost,
        verification: 'verified'
      };

    } catch (error) {
      return {
        stepNumber: 2,
        stepName: 'Premium Upgrades',
        completed: false,
        data: null,
        cost: 0,
        verification: 'error',
        errors: [`Step 2 failed: ${error instanceof Error ? error.message : String(error)}`]
      };
    }
  }

  /**
   * Step 3: Logo Setup from Supabase logo_methods table
   */
  async processLogoSetup(
    customerRequest: string,
    quantity: number
  ): Promise<SupportPricingStep> {
    try {
      console.log('🎯 [SUPPORT AI] Step 3: Analyzing logo requirements');

      const logoAnalysis = await this.analyzeLogoRequirements(customerRequest);

      if (!logoAnalysis.hasLogo) {
        return {
          stepNumber: 3,
          stepName: 'Logo Setup',
          completed: false,
          data: { message: 'No logo requirements detected' },
          cost: 0,
          verification: 'verified'
        };
      }

      let totalLogoCost = 0;
      const logoData: any = {};

      // Process each detected logo position
      for (const logo of logoAnalysis.logos) {
        const { data: logoMethod, error: logoError } = await supabase
          .from('logo_methods')
          .select('*')
          .eq('name', logo.type)
          .eq('application', logo.application)
          .eq('size', logo.size)
          .single();

        if (logoError) {
          console.log('⚠️ Logo method not found:', {
            name: logo.type,
            application: logo.application,
            size: logo.size,
            error: logoError.message
          });
          continue;
        }

        if (logoMethod) {
          const logoCost = this.getQuantityTierPrice(logoMethod, quantity);
          totalLogoCost += logoCost * quantity;

          logoData[logo.position] = {
            type: logo.type,
            size: logo.size,
            application: logo.application,
            cost: logoCost * quantity
          };
        }
      }

      return {
        stepNumber: 3,
        stepName: 'Logo Setup',
        completed: true,
        data: logoData,
        cost: totalLogoCost,
        verification: 'verified'
      };

    } catch (error) {
      return {
        stepNumber: 3,
        stepName: 'Logo Setup',
        completed: false,
        data: null,
        cost: 0,
        verification: 'error',
        errors: [`Step 3 failed: ${error instanceof Error ? error.message : String(error)}`]
      };
    }
  }

  /**
   * Step 4: Accessories from Supabase accessories table
   */
  async processAccessories(
    customerRequest: string,
    quantity: number
  ): Promise<SupportPricingStep> {
    try {
      console.log('🎯 [SUPPORT AI] Step 4: Analyzing accessories');

      const accessoryAnalysis = await this.analyzeAccessoryRequirements(customerRequest);

      if (!accessoryAnalysis.hasAccessories) {
        return {
          stepNumber: 4,
          stepName: 'Accessories',
          completed: false,
          data: { message: 'No accessories required' },
          cost: 0,
          verification: 'verified'
        };
      }

      let totalAccessoryCost = 0;
      const accessoryData: any = {};

      for (const accessoryName of accessoryAnalysis.accessories) {
        const { data: accessory } = await supabase
          .from('accessories')
          .select('*')
          .eq('name', accessoryName)
          .single();

        if (accessory) {
          const accessoryCost = this.getQuantityTierPrice(accessory, quantity);
          totalAccessoryCost += accessoryCost * quantity;

          accessoryData[accessoryName] = {
            name: accessoryName,
            cost: accessoryCost * quantity
          };
        }
      }

      return {
        stepNumber: 4,
        stepName: 'Accessories',
        completed: true,
        data: accessoryData,
        cost: totalAccessoryCost,
        verification: 'verified'
      };

    } catch (error) {
      return {
        stepNumber: 4,
        stepName: 'Accessories',
        completed: false,
        data: null,
        cost: 0,
        verification: 'error',
        errors: [`Step 4 failed: ${error instanceof Error ? error.message : String(error)}`]
      };
    }
  }

  /**
   * Step 5: Delivery from Supabase delivery_methods table
   */
  async processDelivery(
    customerRequest: string,
    quantity: number
  ): Promise<SupportPricingStep> {
    try {
      console.log('🎯 [SUPPORT AI] Step 5: Analyzing delivery requirements');

      const deliveryAnalysis = await this.analyzeDeliveryRequirements(customerRequest, quantity);

      const { data: deliveryMethod } = await supabase
        .from('delivery_methods')
        .select('*')
        .eq('name', deliveryAnalysis.selectedMethod)
        .single();

      if (!deliveryMethod) {
        throw new Error(`Delivery method ${deliveryAnalysis.selectedMethod} not found`);
      }

      const deliveryCost = this.getQuantityTierPrice(deliveryMethod, quantity);

      return {
        stepNumber: 5,
        stepName: 'Delivery Options',
        completed: true,
        data: {
          method: deliveryMethod.name,
          type: deliveryMethod.delivery_type,
          days: deliveryMethod.delivery_days,
          unitPrice: deliveryCost,
          eligible: deliveryAnalysis.eligible
        },
        cost: deliveryCost * quantity,
        verification: 'verified'
      };

    } catch (error) {
      return {
        stepNumber: 5,
        stepName: 'Delivery Options',
        completed: false,
        data: null,
        cost: 0,
        verification: 'error',
        errors: [`Step 5 failed: ${error instanceof Error ? error.message : String(error)}`]
      };
    }
  }

  /**
   * Execute complete step-by-step pricing workflow
   */
  async processCompleteOrder(
    customerRequest: string,
    quantity: number
  ): Promise<SupportOrderBuilder> {
    console.log('🚀 [SUPPORT AI] Starting step-by-step pricing workflow');

    // Execute all steps sequentially
    const step1 = await this.processBlankCapCost(customerRequest, quantity);
    const step2 = await this.processPremiumUpgrades(customerRequest, quantity);
    const step3 = await this.processLogoSetup(customerRequest, quantity);
    const step4 = await this.processAccessories(customerRequest, quantity);
    const step5 = await this.processDelivery(customerRequest, quantity);

    const totalCost = step1.cost + step2.cost + step3.cost + step4.cost + step5.cost;
    const allStepsCompleted = step1.completed && step5.completed; // Minimum required steps

    return {
      capStyle: step1,
      premiumUpgrades: step2,
      logoSetup: step3,
      accessories: step4,
      delivery: step5,
      totalCost,
      allStepsCompleted
    };
  }

  // Helper methods for AI analysis using custom cap 101.txt knowledge
  private async analyzeCapRequirements(request: string): Promise<any> {
    // Use custom cap 101.txt knowledge base for cap analysis
    return {
      detectedCapStyle: this.extractCapStyle(request),
      panelCount: this.extractPanelCount(request) || '6-Panel', // Default from 101.txt
      profile: this.extractProfile(request) || 'High', // Default from 101.txt
      structure: this.extractStructure(request) || 'Structured', // Default from 101.txt
      billShape: this.extractBillShape(request) // Extract bill shape preference
    };
  }

  private async analyzeFabricRequirements(request: string): Promise<any> {
    const premiumFabrics = ['Suede Cotton', 'Acrylic', 'Air Mesh', 'Camo', 'Genuine Leather', 'Laser Cut'];
    const detectedFabric = premiumFabrics.find(fabric =>
      request.toLowerCase().includes(fabric.toLowerCase())
    );

    return {
      hasPremiumFabric: !!detectedFabric,
      fabricType: detectedFabric || 'Chino Twill' // Default from 101.txt
    };
  }

  private async analyzeClosureRequirements(request: string): Promise<any> {
    const premiumClosures = ['Buckle', 'Fitted', 'Flexfit', 'Stretched'];
    const detectedClosure = premiumClosures.find(closure =>
      request.toLowerCase().includes(closure.toLowerCase())
    );

    return {
      hasPremiumClosure: !!detectedClosure,
      closureType: detectedClosure || 'Snapback' // Default from 101.txt
    };
  }

  private async analyzeLogoRequirements(request: string): Promise<any> {
    const logoTypes = ['3D Embroidery', 'Flat Embroidery', 'Embroidery', 'Embroidered', 'Rubber Patch', 'Leather Patch', 'Patch', 'Print', 'Logo'];
    const logoPositions = ['Front', 'Back', 'Left', 'Right', 'Under Bill', 'Upper Bill'];

    const detectedLogos = [];
    const lowerRequest = request.toLowerCase();

    // Check for general logo keywords first
    const hasLogoKeyword = logoTypes.some(type => lowerRequest.includes(type.toLowerCase()));

    if (hasLogoKeyword) {
      // Determine logo type
      let logoType = '3D Embroidery'; // Default from 101.txt
      if (lowerRequest.includes('3d embroidery') || lowerRequest.includes('3d')) {
        logoType = '3D Embroidery';
      } else if (lowerRequest.includes('flat embroidery') || lowerRequest.includes('flat')) {
        logoType = 'Flat Embroidery';
      } else if (lowerRequest.includes('embroidery') || lowerRequest.includes('embroidered')) {
        logoType = '3D Embroidery'; // Default embroidery type
      } else if (lowerRequest.includes('rubber patch')) {
        logoType = 'Rubber Patch';
      } else if (lowerRequest.includes('leather patch')) {
        logoType = 'Leather Patch';
      } else if (lowerRequest.includes('patch')) {
        logoType = 'Rubber Patch'; // Default patch type
      } else if (lowerRequest.includes('print')) {
        logoType = 'Direct Print';
      }

      // Determine positions
      const foundPositions = logoPositions.filter(position =>
        lowerRequest.includes(position.toLowerCase())
      );

      // If no specific position mentioned, use Front as default (from 101.txt)
      const positions = foundPositions.length > 0 ? foundPositions : ['Front'];

      for (const position of positions) {
        detectedLogos.push({
          type: logoType,
          position,
          size: this.extractLogoSize(request, position) || 'Large', // Default from 101.txt
          application: logoType.includes('Patch') ? 'Patch' : 'Direct' // Rule from 101.txt
        });
      }
    }

    return {
      hasLogo: detectedLogos.length > 0,
      logos: detectedLogos
    };
  }

  private async analyzeAccessoryRequirements(request: string): Promise<any> {
    const accessories = ['Hang Tag', 'Inside Label', 'B-Tape Print', 'Sticker'];
    const detectedAccessories = accessories.filter(accessory =>
      request.toLowerCase().includes(accessory.toLowerCase())
    );

    return {
      hasAccessories: detectedAccessories.length > 0,
      accessories: detectedAccessories
    };
  }

  private async analyzeDeliveryRequirements(request: string, quantity: number): Promise<any> {
    // Default to Regular Delivery from 101.txt
    let selectedMethod = 'Regular Delivery';
    let eligible = true;

    if (request.toLowerCase().includes('priority')) {
      selectedMethod = 'Priority Delivery';
    } else if (request.toLowerCase().includes('air freight') && quantity >= 3168) {
      selectedMethod = 'Air Freight';
    } else if (request.toLowerCase().includes('sea freight') && quantity >= 3168) {
      selectedMethod = 'Sea Freight';
    }

    // Check freight eligibility
    if ((selectedMethod === 'Air Freight' || selectedMethod === 'Sea Freight') && quantity < 3168) {
      eligible = false;
      selectedMethod = 'Regular Delivery'; // Fallback
    }

    return { selectedMethod, eligible };
  }

  // Pricing calculation helpers
  private async calculateTierCost(tierIdOrName: string, quantity: number): Promise<{ unitPrice: number; totalCost: number }> {
    const { data: tier } = await supabase
      .from('pricing_tiers')
      .select('*')
      .or(`id.eq.${tierIdOrName},tier_name.eq.${tierIdOrName}`)
      .single();

    if (!tier) throw new Error(`Price tier ${tierIdOrName} not found`);

    const unitPrice = this.getQuantityTierPrice(tier, quantity);
    return {
      unitPrice,
      totalCost: unitPrice * quantity
    };
  }

  private getQuantityTierPrice(pricingData: any, quantity: number): number {
    if (quantity >= 10000) return pricingData.price_10000 || pricingData.price10000;
    if (quantity >= 2880) return pricingData.price_2880 || pricingData.price2880;
    if (quantity >= 1152) return pricingData.price_1152 || pricingData.price1152;
    if (quantity >= 576) return pricingData.price_576 || pricingData.price576;
    if (quantity >= 144) return pricingData.price_144 || pricingData.price144;
    return pricingData.price_48 || pricingData.price48;
  }

  // Product selection helpers
  private selectBestProduct(products: any[], capAnalysis: any): any | null {
    // This function should ONLY return a product if the user made very specific requests
    // that don't match our standard defaults - otherwise let getDefaultProduct handle it

    // Check if user made specific non-default requests
    const hasSpecificPanelRequest = capAnalysis.panelCount && capAnalysis.panelCount !== '6-Panel';
    const hasSpecificProfileRequest = capAnalysis.profile && capAnalysis.profile !== 'High';
    const hasSpecificStructureRequest = capAnalysis.structure && capAnalysis.structure !== 'Structured';
    const hasSpecificBillShapeRequest = capAnalysis.billShape !== null;

    // If no specific requests, let intelligent defaults handle everything
    if (!hasSpecificPanelRequest && !hasSpecificProfileRequest && !hasSpecificStructureRequest && !hasSpecificBillShapeRequest) {
      return null;
    }

    // For panel count requests (5-panel, 7-panel), let getDefaultProduct handle them
    // It knows the exact defaults to use
    if (hasSpecificPanelRequest) {
      return null; // Let getDefaultProduct handle panel-specific requests
    }

    // For structure requests (dad hat = unstructured), let getDefaultProduct handle them
    if (hasSpecificStructureRequest) {
      return null; // Let getDefaultProduct handle structure-specific requests
    }

    // For bill shape requests, let getDefaultProduct handle them
    if (hasSpecificBillShapeRequest) {
      return null; // Let getDefaultProduct handle bill shape requests
    }

    // Only handle very specific profile requests that aren't covered by defaults
    if (hasSpecificProfileRequest) {
      for (const product of products) {
        if (product.profile === capAnalysis.profile &&
            product.panel_count === 6 && // Stick to 6-panel for profile requests
            product.structure_type?.includes('Structured')) {
          console.log(`🎯 [SUPPORT AI] Found specific profile match: ${product.name}`);
          return product;
        }
      }
    }

    return null; // No match found, use intelligent defaults
  }

  private getDefaultProduct(products: any[], capAnalysis?: any): any {
    // Smart default selection based on user requirements from currentTask.txt

    // Check for specific bill shape preferences
    if (capAnalysis?.detectedCapStyle?.toLowerCase().includes('flat') ||
        capAnalysis?.billShape === 'Flat') {
      const flatBillDefault = products.find(p => p.code === '6P_PROFIT_SIX_HFS');
      if (flatBillDefault) {
        console.log('🎯 [SUPPORT AI] Using Flat Bill default: 6P ProFit Six HFS');
        return flatBillDefault;
      }
    }

    if (capAnalysis?.detectedCapStyle?.toLowerCase().includes('curved') ||
        capAnalysis?.billShape === 'Curved') {
      const curvedBillDefault = products.find(p => p.code === '6P_PROFIT_SIX_HCS');
      if (curvedBillDefault) {
        console.log('🎯 [SUPPORT AI] Using Curved Bill default: 6P ProFit Six HCS');
        return curvedBillDefault;
      }
    }

    // Check for panel count preferences
    if (capAnalysis?.panelCount === '5-Panel') {
      const fivePanelDefault = products.find(p => p.code === '5P_URBAN_CLASSIC_HCS');
      if (fivePanelDefault) {
        console.log('🎯 [SUPPORT AI] Using 5-Panel default: 5P Urban Classic HCS');
        return fivePanelDefault;
      }
    }

    if (capAnalysis?.panelCount === '7-Panel') {
      const sevenPanelDefault = products.find(p => p.code === '7P_ELITE_SEVEN_MFS');
      if (sevenPanelDefault) {
        console.log('🎯 [SUPPORT AI] Using 7-Panel default: 7P Elite Seven MFS');
        return sevenPanelDefault;
      }
    }

    // Check for structure preferences (Dad Hat / Unstructured)
    if (capAnalysis?.structure === 'Unstructured' ||
        capAnalysis?.detectedCapStyle?.toLowerCase().includes('dad')) {
      const dadHatDefault = products.find(p => p.code === '6P_AIRFRAME_MCU');
      if (dadHatDefault) {
        console.log('🎯 [SUPPORT AI] Using Unstructured Dad Hat default: 6P AirFrame MCU');
        return dadHatDefault;
      }
    }

    // Main default: 6P AirFrame HSCS (General purpose - High Profile, Slight Curved)
    const generalDefault = products.find(p => p.code === '6P_AIRFRAME_HSCS');
    if (generalDefault) {
      console.log('🎯 [SUPPORT AI] Using general default: 6P AirFrame HSCS (6-Panel, High Profile, Structured)');
      return generalDefault;
    }

    // Fallback hierarchy based on currentTask.txt preferences
    const fallbackOrder = [
      '6P_PROFIT_SIX_HCS',  // Curved Bill
      '6P_PROFIT_SIX_HFS',  // Flat Bill
      '5P_URBAN_CLASSIC_HCS', // 5-Panel
      '6P_AIRFRAME_MCU',    // Dad Hat
      '7P_ELITE_SEVEN_MFS'  // 7-Panel
    ];

    for (const code of fallbackOrder) {
      const fallbackProduct = products.find(p => p.code === code);
      if (fallbackProduct) {
        console.log('🎯 [SUPPORT AI] Using fallback default:', fallbackProduct.name);
        return fallbackProduct;
      }
    }

    // Last resort: first active product
    console.log('⚠️ [SUPPORT AI] Using first available product as last resort');
    return products[0];
  }

  // Text extraction helpers using custom cap 101.txt knowledge
  private extractCapStyle(request: string): string {
    if (request.toLowerCase().includes('7-panel')) return '7-Panel';
    if (request.toLowerCase().includes('5-panel')) return '5-Panel';
    if (request.toLowerCase().includes('4-panel')) return '4-Panel';
    return '6-Panel'; // Default from 101.txt
  }

  private extractPanelCount(request: string): string | null {
    const match = request.match(/(\d+)-panel/i);
    return match ? `${match[1]}-Panel` : null;
  }

  private extractProfile(request: string): string | null {
    if (request.toLowerCase().includes('high profile')) return 'High';
    if (request.toLowerCase().includes('mid profile')) return 'Mid';
    if (request.toLowerCase().includes('low profile')) return 'Low';
    return null;
  }

  private extractStructure(request: string): string | null {
    const lowerRequest = request.toLowerCase();

    // Dad hat is specifically unstructured
    if (lowerRequest.includes('dad hat')) return 'Unstructured';

    // Explicit structure mentions
    if (lowerRequest.includes('structured')) return 'Structured';
    if (lowerRequest.includes('unstructured')) return 'Unstructured';

    return null;
  }

  private extractBillShape(request: string): string | null {
    const lowerRequest = request.toLowerCase();

    // Check for explicit bill shape mentions first (most specific)
    if (lowerRequest.includes('flat bill') || lowerRequest.includes('flatbill') || lowerRequest.includes('flat brim')) {
      return 'Flat';
    }
    if (lowerRequest.includes('curved bill') || lowerRequest.includes('curved brim')) {
      return 'Curved';
    }
    if (lowerRequest.includes('slight curve') || lowerRequest.includes('slightly curved')) {
      return 'Slight Curved';
    }

    // Check for style indicators (more specific than general terms)
    if (lowerRequest.includes('snapback') || lowerRequest.includes('new era') || lowerRequest.includes('9fifty')) {
      return 'Flat'; // Snapbacks typically have flat bills
    }

    // Dad hat is a specific unstructured style, let structure detection handle it
    // Don't detect bill shape here to avoid conflicts

    return null; // No specific bill shape preference detected
  }

  private extractLogoSize(request: string, position: string): string | null {
    const context = request.toLowerCase();
    if (context.includes('large')) return 'Large';
    if (context.includes('medium')) return 'Medium';
    if (context.includes('small')) return 'Small';

    // Default sizes by position from 101.txt
    if (position === 'Front') return 'Large';
    if (position === 'Under Bill') return 'Large';
    return 'Small';
  }
}

export const supportAIPricing = new SupportAIPricingService();