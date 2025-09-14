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

// Import advanced detection functions from the existing knowledge base
import {
  detectFabricFromText,
  detectAllLogosFromText,
  detectClosureFromText,
  detectAccessoriesFromText,
  getDefaultApplicationForDecoration
} from '@/lib/costing-knowledge-base';

// Import AI pricing service for mold charges
import { getAILogoPrice } from '@/lib/ai-pricing-service';

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
   * Step 3: Logo Setup from Supabase logo_methods table with mold charges
   */
  async processLogoSetup(
    customerRequest: string,
    quantity: number
  ): Promise<SupportPricingStep> {
    try {
      console.log('🎯 [SUPPORT AI] Step 3: Analyzing logo requirements with mold charges');

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
      let totalMoldCharges = 0;
      const logoData: any = {};

      // Process each detected logo position
      for (const logo of logoAnalysis.logos) {
        try {
          // Use AI pricing service to get both logo cost and mold charges
          const pricingResult = await getAILogoPrice(logo.type, logo.size, logo.application, quantity);

          const logoCost = pricingResult.unitPrice;
          const moldCharge = pricingResult.moldCharge;

          console.log(`💰 [MOLD-CHARGE] Logo pricing: ${logo.type} ${logo.size} ${logo.application}`, {
            unitPrice: logoCost,
            totalCost: logoCost * quantity,
            moldCharge: moldCharge,
            quantity: quantity
          });

          // Add logo cost (per piece * quantity)
          totalLogoCost += logoCost * quantity;

          // Add mold charge (one-time fee)
          totalMoldCharges += moldCharge;

          logoData[logo.position] = {
            type: logo.type,
            size: logo.size,
            application: logo.application,
            unitPrice: logoCost,
            cost: logoCost * quantity,
            moldCharge: moldCharge,
            totalWithMold: (logoCost * quantity) + moldCharge
          };

        } catch (logoError) {
          console.log('⚠️ Logo pricing failed:', {
            name: logo.type,
            application: logo.application,
            size: logo.size,
            error: logoError.message || logoError
          });

          // Fallback to Supabase direct query
          const { data: logoMethod, error: supabaseError } = await supabase
            .from('logo_methods')
            .select('*')
            .eq('name', logo.type)
            .eq('application', logo.application)
            .eq('size', logo.size)
            .single();

          if (!supabaseError && logoMethod) {
            const logoCost = this.getQuantityTierPrice(logoMethod, quantity);
            totalLogoCost += logoCost * quantity;

            logoData[logo.position] = {
              type: logo.type,
              size: logo.size,
              application: logo.application,
              unitPrice: logoCost,
              cost: logoCost * quantity,
              moldCharge: 0,
              totalWithMold: logoCost * quantity
            };
          }
        }
      }

      // CRITICAL FIX: Include mold charges in total cost
      const finalTotalCost = totalLogoCost + totalMoldCharges;

      console.log('🎯 [SUPPORT AI] Step 3 Complete - Logo Setup with Mold Charges:', {
        totalLogoCost: totalLogoCost,
        totalMoldCharges: totalMoldCharges,
        finalTotalCost: finalTotalCost,
        quantity: quantity,
        logoCount: Object.keys(logoData).length
      });

      return {
        stepNumber: 3,
        stepName: 'Logo Setup',
        completed: true,
        data: {
          ...logoData,
          totalLogoCost: totalLogoCost,
          totalMoldCharges: totalMoldCharges,
          summary: {
            logoCost: totalLogoCost,
            moldCharges: totalMoldCharges,
            totalWithMold: finalTotalCost
          }
        },
        cost: finalTotalCost, // CRITICAL: This now includes mold charges
        verification: 'verified'
      };

    } catch (error) {
      console.error('❌ [SUPPORT AI] Step 3 Logo Setup failed:', error);
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
   * Execute complete step-by-step pricing workflow with intelligent context
   */
  async processCompleteOrder(
    customerRequest: string,
    quantity: number,
    conversationHistory: any[] = [],
    conversationId?: string
  ): Promise<SupportOrderBuilder & {
    contextInfo?: {
      hasContext: boolean;
      detectedChanges: any[];
      orderBuilderDelta?: any;
    }
  }> {
    console.log('🚀 [SUPPORT AI] Starting step-by-step pricing workflow');

    // Import conversation context service
    const { ConversationContextService } = await import('./conversation-context');

    // Build smart contextual request using Supabase data
    const contextResult = await ConversationContextService.buildSmartContextualRequest(
      customerRequest,
      conversationHistory,
      conversationId
    );

    console.log('📚 [CONTEXT] Smart contextual analysis:', {
      original: customerRequest.substring(0, 50),
      hasContext: contextResult.hasContext,
      detectedChanges: contextResult.detectedChanges.length,
      contextualLength: contextResult.contextualRequest.length
    });

    // Execute all steps sequentially with intelligent contextual information
    const step1 = await this.processBlankCapCost(contextResult.contextualRequest, quantity);
    const step2 = await this.processPremiumUpgrades(contextResult.contextualRequest, quantity);
    const step3 = await this.processLogoSetup(contextResult.contextualRequest, quantity);
    const step4 = await this.processAccessories(contextResult.contextualRequest, quantity);
    const step5 = await this.processDelivery(contextResult.contextualRequest, quantity);

    const totalCost = step1.cost + step2.cost + step3.cost + step4.cost + step5.cost;

    console.log('💰 [SUPPORT AI] Complete Order Cost Breakdown:', {
      step1_capStyle: step1.cost,
      step2_premiumUpgrades: step2.cost,
      step3_logoSetup: step3.cost,
      step3_logoDetail: step3.data?.summary || 'No summary',
      step4_accessories: step4.cost,
      step5_delivery: step5.cost,
      totalCost: totalCost,
      quantity: quantity
    });
    const allStepsCompleted = step1.completed && step5.completed; // Minimum required steps

    // Update Order Builder delta with accurate cost impact
    if (contextResult.orderBuilderDelta) {
      contextResult.orderBuilderDelta.costImpact.newTotal = totalCost;
    }

    return {
      capStyle: step1,
      premiumUpgrades: step2,
      logoSetup: step3,
      accessories: step4,
      delivery: step5,
      totalCost,
      allStepsCompleted,
      contextInfo: {
        hasContext: contextResult.hasContext,
        detectedChanges: contextResult.detectedChanges,
        orderBuilderDelta: contextResult.orderBuilderDelta
      }
    };
  }

  /**
   * Build contextual request combining current message with conversation history
   */
  private buildContextualRequest(currentMessage: string, conversationHistory: any[]): string {
    if (!conversationHistory || conversationHistory.length === 0) {
      return currentMessage;
    }

    // Extract relevant context from previous messages
    const previousContext = conversationHistory
      .filter(msg => msg.role === 'user') // Only user messages
      .map(msg => msg.content)
      .join(' ');

    // Build comprehensive context
    const contextualRequest = `
Previous context: ${previousContext}

Current request: ${currentMessage}

Please interpret the current request in the context of the previous conversation. If the current request is a modification (like "change closure to Fitted"), apply it to the previous specifications.
    `.trim();

    return contextualRequest;
  }

  // Helper methods for AI analysis using custom cap 101.txt knowledge
  private async analyzeCapRequirements(request: string): Promise<any> {
    // Enhanced cap analysis with color and size detection
    const detectedColor = this.extractColorFromText(request);
    const detectedSize = this.extractSizeFromText(request);

    console.log('🎨 [SUPPORT AI] Enhanced cap analysis:', {
      originalRequest: request.substring(0, 100),
      detectedColor,
      detectedSize,
      capStyle: this.extractCapStyle(request),
      panelCount: this.extractPanelCount(request),
      structure: this.extractStructure(request)
    });

    return {
      detectedCapStyle: this.extractCapStyle(request),
      panelCount: this.extractPanelCount(request) || '6-Panel', // Default from 101.txt
      profile: this.extractProfile(request) || 'High', // Default from 101.txt
      structure: this.extractStructure(request) || 'Structured', // Default from 101.txt
      billShape: this.extractBillShape(request), // Extract bill shape preference
      color: detectedColor, // Add color to cap analysis
      capSize: detectedSize // Add cap size to analysis
    };
  }

  private extractColorFromText(text: string): string | null {
    const lowerText = text.toLowerCase();

    // Enhanced color detection with split color support (like "Royal/Black")
    // Priority 1: Check for slash patterns (Royal/Black, Red/White, etc.)
    const slashPattern = /(\w+)\/(\w+)/i;
    const slashMatch = text.match(slashPattern);

    if (slashMatch) {
      const part1 = slashMatch[1];
      const part2 = slashMatch[2];

      // Common colors for validation
      const knownColors = ['black', 'white', 'red', 'blue', 'green', 'yellow', 'orange', 'purple',
                          'pink', 'brown', 'gray', 'grey', 'navy', 'lime', 'olive', 'royal',
                          'maroon', 'gold', 'charcoal', 'khaki', 'carolina'];

      // If both parts are colors, treat as split color
      if (knownColors.includes(part1.toLowerCase()) && knownColors.includes(part2.toLowerCase())) {
        const normalizedColor = `${part1}/${part2}`;
        console.log('🎨 [COLOR-DETECTION] Split color detected:', normalizedColor);
        return normalizedColor;
      }
    }

    // Priority 2: Single color patterns
    const colorPatterns = [
      /(?:color:?\s*|in\s+|cap\s+)(\w+)/i,
      /(?:^|\s)(black|white|red|blue|green|yellow|orange|purple|pink|brown|gray|grey|navy|lime|olive|royal|maroon|gold|charcoal|khaki|carolina)(?:\s|$|,)/i
    ];

    for (const pattern of colorPatterns) {
      const colorMatch = text.match(pattern);
      if (colorMatch) {
        const detectedColor = colorMatch[1] || colorMatch[0].trim();
        console.log('🎨 [COLOR-DETECTION] Single color detected:', detectedColor);
        return detectedColor;
      }
    }

    console.log('🎨 [COLOR-DETECTION] No color detected in:', text.substring(0, 50));
    return null;
  }

  private extractSizeFromText(text: string): string | null {
    const lowerText = text.toLowerCase();

    // Enhanced size detection with CM to hat size mapping
    // Priority 1: CM measurements (like "59 cm")
    const cmPatterns = [
      /(\d{2})\s*cm/i,
      /(\d{2})\s*centimeter/i,
      /size:?\s*(\d{2})\s*cm/i
    ];

    for (const pattern of cmPatterns) {
      const cmMatch = text.match(pattern);
      if (cmMatch) {
        const cmSize = parseInt(cmMatch[1]);
        const hatSize = this.convertCmToHatSize(cmSize);
        console.log('📏 [SIZE-DETECTION] CM size detected:', { cm: cmSize, hatSize });
        return hatSize;
      }
    }

    // Priority 2: Direct hat size patterns (like "7 1/4")
    const hatSizePatterns = [
      /\b([67](?:\s*\d+\/\d+|\.\d+)?)\b.*(?:hat|cap|size)/i,
      /(?:hat|cap|size).*?\b([67](?:\s*\d+\/\d+|\.\d+)?)\b/i,
      /\bsize\s*([67](?:\s*\d+\/\d+|\.\d+)?)\b/i,
      /\b([67]\s*\d+\/\d+)\s*(?:hat|cap|size|fitted)/i
    ];

    for (const pattern of hatSizePatterns) {
      const sizeMatch = text.match(pattern);
      if (sizeMatch) {
        const detectedSize = sizeMatch[1].trim();
        console.log('📏 [SIZE-DETECTION] Hat size detected:', detectedSize);
        return detectedSize;
      }
    }

    // Priority 3: Descriptive sizes
    const descriptivePatterns = [
      /\b(small|medium|large)\s*(?:hat|cap|size)/i
    ];

    for (const pattern of descriptivePatterns) {
      const descMatch = text.match(pattern);
      if (descMatch) {
        const desc = descMatch[1].toLowerCase();
        const hatSize = desc === 'small' ? '7' :
                      desc === 'medium' ? '7 1/4' :
                      desc === 'large' ? '7 1/2' : '7 1/4';
        console.log('📏 [SIZE-DETECTION] Descriptive size detected:', { desc, hatSize });
        return hatSize;
      }
    }

    console.log('📏 [SIZE-DETECTION] No size detected in:', text.substring(0, 50));
    return null;
  }

  private convertCmToHatSize(cm: number): string {
    // Standard CM to Hat Size conversion table
    const sizeMap: { [key: number]: string } = {
      54: '6 3/4',
      55: '6 7/8',
      56: '7',
      57: '7 1/8',
      58: '7 1/4',
      59: '7 3/8',  // This handles the "59 cm" from the error report
      60: '7 1/2',
      61: '7 5/8',
      62: '7 3/4',
      63: '7 7/8',
      64: '8'
    };

    // Direct lookup first
    if (sizeMap[cm]) {
      return sizeMap[cm];
    }

    // Fallback for sizes between mapped values
    if (cm <= 54) return '6 3/4';
    if (cm >= 64) return '8';

    // Find closest match
    const sizes = Object.keys(sizeMap).map(Number).sort((a, b) => a - b);
    let closest = sizes[0];
    let minDiff = Math.abs(cm - closest);

    for (const size of sizes) {
      const diff = Math.abs(cm - size);
      if (diff < minDiff) {
        minDiff = diff;
        closest = size;
      }
    }

    return sizeMap[closest] || '7 1/4'; // Default fallback
  }

  private async analyzeFabricRequirements(request: string): Promise<any> {
    // Use advanced fabric detection from knowledge base
    const detectedFabric = detectFabricFromText(request);

    // Check if detected fabric is premium
    const hasPremiumFabric = detectedFabric ? this.isPremiumFabric(detectedFabric) : false;

    console.log('🧵 [SUPPORT AI] Advanced fabric detection:', {
      originalRequest: request.substring(0, 100),
      detectedFabric,
      hasPremiumFabric,
      defaultFabric: detectedFabric || 'Chino Twill'
    });

    return {
      hasPremiumFabric,
      fabricType: detectedFabric || 'Chino Twill' // Default from business rules
    };
  }

  private isPremiumFabric(fabric: string): boolean {
    if (!fabric) return false;

    // Handle dual fabrics like "Acrylic/Airmesh"
    const fabrics = fabric.split('/').map(f => f.trim());
    const premiumFabrics = ['Suede Cotton', 'Acrylic', 'Air Mesh', 'Camo', 'Genuine Leather', 'Laser Cut', 'Airmesh'];

    return fabrics.some(f =>
      premiumFabrics.some(premium =>
        f.toLowerCase().includes(premium.toLowerCase()) ||
        premium.toLowerCase().includes(f.toLowerCase())
      )
    );
  }

  private async analyzeClosureRequirements(request: string): Promise<any> {
    // Use advanced closure detection from knowledge base
    const detectedClosure = detectClosureFromText(request);

    // Check if detected closure is premium
    const premiumClosures = ['buckle', 'fitted', 'flexfit', 'stretched'];
    const hasPremiumClosure = detectedClosure ?
      premiumClosures.includes(detectedClosure.toLowerCase()) : false;

    console.log('🔒 [SUPPORT AI] Advanced closure detection:', {
      originalRequest: request.substring(0, 100),
      detectedClosure,
      hasPremiumClosure,
      defaultClosure: detectedClosure || 'snapback'
    });

    return {
      hasPremiumClosure,
      closureType: detectedClosure || 'snapback' // Default from business rules
    };
  }

  private async analyzeLogoRequirements(request: string): Promise<any> {
    // Use advanced logo detection from knowledge base
    const logoDetection = detectAllLogosFromText(request);

    console.log('🎨 [SUPPORT AI] Advanced logo detection:', {
      originalRequest: request.substring(0, 100),
      primaryLogo: logoDetection.primaryLogo,
      allLogos: logoDetection.allLogos,
      hasMultiSetup: !!logoDetection.multiLogoSetup
    });

    // Convert detected logos to support AI format
    const logos = logoDetection.allLogos.map(logo => ({
      type: logo.type,
      position: logo.position.charAt(0).toUpperCase() + logo.position.slice(1), // Capitalize position
      size: logo.size,
      application: this.getApplicationForLogoType(logo.type)
    }));

    // Handle case where no logos are detected but primary logo exists
    if (logos.length === 0 && logoDetection.primaryLogo && logoDetection.primaryLogo !== 'None') {
      logos.push({
        type: logoDetection.primaryLogo,
        position: 'Front', // Default position
        size: 'Large', // Default size for front
        application: this.getApplicationForLogoType(logoDetection.primaryLogo)
      });
    }

    return {
      hasLogo: logoDetection.primaryLogo !== 'None' && logoDetection.primaryLogo !== null,
      logos: logos
    };
  }

  private getApplicationForLogoType(logoType: string): string {
    // Use the advanced application mapping from knowledge base
    return getDefaultApplicationForDecoration(logoType);
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