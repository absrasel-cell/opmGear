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
  detectClosureFromText,
  detectAccessoriesFromText,
  getDefaultApplicationForDecoration
} from '@/lib/costing-knowledge-base';

// CRITICAL FIX: Import unified logo detection system to replace detectAllLogosFromText
import { detectLogosUnified, convertToStepByStepFormat } from '@/lib/unified-logo-detection';

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
      console.log('🎯 [SUPPORT AI] Cap analysis for product selection:', {
        structure: capAnalysis.structure,
        panelCount: capAnalysis.panelCount,
        billShape: capAnalysis.billShape,
        detectedCapStyle: capAnalysis.detectedCapStyle
      });

      const selectedProduct = this.selectBestProduct(products, capAnalysis) || this.getDefaultProduct(products, capAnalysis);

      console.log('🎯 [SUPPORT AI] Final selected product:', {
        name: selectedProduct?.name,
        code: selectedProduct?.code,
        structure_type: selectedProduct?.structure_type,
        bill_shape: selectedProduct?.bill_shape,
        panel_count: selectedProduct?.panel_count
      });

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
          capDetails: {
        ...capAnalysis,
        // DEBUG: Log the final cap details being returned
        _debug_extracted_color: capAnalysis.color,
        _debug_cap_analysis: capAnalysis
      }
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

      // Check for premium fabrics with dual fabric support
      const fabricAnalysis = await this.analyzeFabricRequirements(customerRequest);
      if (fabricAnalysis.hasPremiumFabric) {
        console.log('🧵 [SUPPORT AI] Processing premium fabric:', fabricAnalysis.fabricType);

        // Handle dual fabrics like "Acrylic/Airmesh" by splitting and processing each separately
        const fabricTypes = fabricAnalysis.fabricType.includes('/')
          ? fabricAnalysis.fabricType.split('/').map((f: string) => f.trim())
          : [fabricAnalysis.fabricType];

        let totalFabricCost = 0;
        const fabricData: any = {};

        for (const singleFabricType of fabricTypes) {
          // Normalize fabric name to match database entries
          let normalizedFabricName = singleFabricType;

          // Handle common fabric name variations
          if (singleFabricType.toLowerCase().includes('airmesh') || singleFabricType.toLowerCase().includes('air mesh')) {
            normalizedFabricName = 'Air Mesh';
          } else if (singleFabricType.toLowerCase().includes('acrylic')) {
            normalizedFabricName = 'Acrylic';
          } else if (singleFabricType.toLowerCase().includes('suede')) {
            normalizedFabricName = 'Suede Cotton';
          } else if (singleFabricType.toLowerCase().includes('leather')) {
            normalizedFabricName = 'Genuine Leather';
          } else if (singleFabricType.toLowerCase().includes('laser') || singleFabricType.toLowerCase().includes('cut')) {
            normalizedFabricName = 'Laser Cut';
          }

          console.log(`🔍 [SUPPORT AI] Looking for fabric: ${singleFabricType} -> ${normalizedFabricName}`);

          const { data: fabrics } = await supabase
            .from('premium_fabrics')
            .select('*')
            .eq('name', normalizedFabricName)
            .single();

          if (fabrics) {
            const fabricCost = this.getQuantityTierPrice(fabrics, quantity);
            const fabricTotalCost = fabricCost * quantity;
            totalFabricCost += fabricTotalCost;

            fabricData[normalizedFabricName] = {
              type: fabrics.name,
              unitPrice: fabricCost,
              cost: fabricTotalCost
            };

            console.log(`✅ [SUPPORT AI] Found premium fabric: ${fabrics.name} - $${fabricCost}/cap ($${fabricTotalCost} total)`);
          } else {
            console.log(`⚠️ [SUPPORT AI] Premium fabric not found in database: ${normalizedFabricName}`);
          }
        }

        totalCost += totalFabricCost;
        if (Object.keys(fabricData).length > 0) {
          upgradeData.fabrics = fabricData;
          upgradeData.fabricCount = Object.keys(fabricData).length;
          upgradeData.totalFabricCost = totalFabricCost;

          // Also keep original format for backward compatibility
          upgradeData.fabric = {
            type: fabricAnalysis.fabricType, // Keep original dual format like "Acrylic/Airmesh"
            cost: totalFabricCost
          };
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

    // CRITICAL FIX: ABSOLUTE PRIORITY for preserved context quantity
    let effectiveQuantity = quantity; // Start with provided quantity
    let quantitySource = 'PROVIDED';

    // PRIORITY 1: Use preserved quantity if it's reasonable (>=48 and <=50000)
    if (contextResult.mergedSpecifications.quantity &&
        contextResult.mergedSpecifications.quantity >= 48 &&
        contextResult.mergedSpecifications.quantity <= 50000) {
      effectiveQuantity = contextResult.mergedSpecifications.quantity;
      quantitySource = 'PRESERVED_CONTEXT';
    }

    console.log('🚀 [SUPPORT AI] QUANTITY PRESERVATION - ABSOLUTE PRIORITY CHECK:', {
      providedQuantity: quantity,
      preservedQuantity: contextResult.mergedSpecifications.quantity,
      effectiveQuantity: effectiveQuantity,
      quantitySource: quantitySource,
      preservationApplied: quantitySource === 'PRESERVED_CONTEXT'
    });

    // Execute all steps sequentially with intelligent contextual information
    const step1 = await this.processBlankCapCost(contextResult.contextualRequest, effectiveQuantity);
    const step2 = await this.processPremiumUpgrades(contextResult.contextualRequest, effectiveQuantity);
    const step3 = await this.processLogoSetup(contextResult.contextualRequest, effectiveQuantity);
    const step4 = await this.processAccessories(contextResult.contextualRequest, effectiveQuantity);
    const step5 = await this.processDelivery(contextResult.contextualRequest, effectiveQuantity);

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

    console.log('🎨 [SUPPORT AI] === FINAL CAP ANALYSIS DEBUG ===');
    console.log('🎨 [SUPPORT AI] Color being set in capAnalysis:', detectedColor);

    // CRITICAL FIX: ABSOLUTE PRIORITY for preserved colors from conversation context
    let finalColor = 'Black'; // Safe default
    let finalColors = ['Black'];
    let colorSource = 'DEFAULT';

    // Priority 1: Check for preserved color information from conversation context (HIGHEST PRIORITY)
    const contextualColorMatch = request.match(/Colors?:\s*([^\n,]+)/i);
    if (contextualColorMatch) {
      const contextColor = contextualColorMatch[1].trim();
      // Validate it's not corrupted (like "7" from panel count)
      if (!/^\d+$/.test(contextColor) && !contextColor.toLowerCase().includes('panel')) {
        finalColor = contextColor;
        finalColors = contextColor.includes('/') ? contextColor.split('/') : [contextColor];
        colorSource = 'PRESERVED_CONTEXT';
        console.log('🎨 [SUPPORT AI] PRESERVED contextual color from conversation:', contextColor);
      }
    }

    // Priority 2: Check for contextual specifications format from mergedSpecifications
    if (colorSource === 'DEFAULT') {
      const previousColorMatch = request.match(/Previous order specifications:[\s\S]*?Colors?:\s*([^\n,]+)/i);
      if (previousColorMatch) {
        const prevColor = previousColorMatch[1].trim();
        // Validate it's not corrupted
        if (!/^\d+$/.test(prevColor) && !prevColor.toLowerCase().includes('panel')) {
          finalColor = prevColor;
          finalColors = prevColor.includes('/') ? prevColor.split('/') : [prevColor];
          colorSource = 'PREVIOUS_SPECS';
          console.log('🎨 [SUPPORT AI] PRESERVED color from previous specifications:', prevColor);
        }
      }
    }

    // Priority 3: Use detected color only if no preserved color found
    if (colorSource === 'DEFAULT' && detectedColor && !/^\d+$/.test(detectedColor)) {
      finalColor = detectedColor;
      finalColors = detectedColor.includes('/') ? detectedColor.split('/') : [detectedColor];
      colorSource = 'DETECTED';
    }

    const finalCapAnalysis = {
      detectedCapStyle: this.extractCapStyle(request),
      panelCount: this.extractPanelCount(request) || '6-Panel', // Default from 101.txt
      profile: this.extractProfile(request) || 'High', // Default from 101.txt
      structure: this.extractStructure(request) || 'Structured', // Default from 101.txt
      billShape: this.extractBillShape(request), // Extract bill shape preference
      color: finalColor, // Use preserved color with absolute priority
      colors: finalColors, // Use preserved colors with absolute priority
      capSize: detectedSize, // Add cap size to analysis
      colorSource: colorSource // Track color source for debugging
    };

    console.log('🎨 [SUPPORT AI] === FINAL CAP ANALYSIS RETURN ===');
    console.log('🎨 [SUPPORT AI] Returning cap analysis with color:', finalCapAnalysis.color);
    console.log('🎨 [SUPPORT AI] Returning cap analysis with colors array:', finalCapAnalysis.colors);
    console.log('🎨 [SUPPORT AI] Color source determination:', {
      detectedColorFromText: detectedColor,
      finalColorUsed: finalCapAnalysis.color,
      colorSource: colorSource,
      contextualColorFound: !!contextualColorMatch,
      preservationApplied: colorSource !== 'DEFAULT'
    });

    return finalCapAnalysis;
  }

  private extractColorFromText(text: string): string | null {
    console.log('🎨 [STEP-BY-STEP-COLORS] === START EXTRACTING COLOR ===');
    console.log('🎨 [STEP-BY-STEP-COLORS] Input text:', text);

    const lowerText = text.toLowerCase();

    // CRITICAL FIX: Check for panel count changes FIRST to prevent color interference
    const panelChangePatterns = [
      /(?:change|switch|make|want).*?(?:to\s+)?7[\s-]?panel/i,
      /(?:change|switch|make|want).*?(?:to\s+)?6[\s-]?panel/i,
      /(?:change|switch|make|want).*?(?:to\s+)?5[\s-]?panel/i
    ];

    for (const panelPattern of panelChangePatterns) {
      if (panelPattern.test(text)) {
        console.log('🎨 [STEP-BY-STEP-COLORS] PANEL COUNT CHANGE DETECTED - skipping color extraction to prevent "7" corruption');
        return null;
      }
    }

    // Enhanced color detection with split color support (like "Royal/Black")
    // Priority 1: Check for COLOR-SPECIFIC slash patterns, not fabric patterns
    const colorSlashPattern = /\b(black|white|red|blue|green|yellow|orange|purple|pink|brown|gray|grey|navy|lime|olive|royal|maroon|gold|charcoal|khaki|carolina|silver|teal|forest|burgundy|crimson|ivory|beige|tan|coral)\s*\/\s*(black|white|red|blue|green|yellow|orange|purple|pink|brown|gray|grey|navy|lime|olive|royal|maroon|gold|charcoal|khaki|carolina|silver|teal|forest|burgundy|crimson|ivory|beige|tan|coral)\b/i;
    const slashMatch = text.match(colorSlashPattern);
    console.log('🎨 [STEP-BY-STEP-COLORS] Slash pattern match:', slashMatch);

    if (slashMatch) {
      const part1 = slashMatch[1];
      const part2 = slashMatch[2];
      console.log('🎨 [STEP-BY-STEP-COLORS] Split color parts:', { part1, part2 });

      // CRITICAL FIX: Expanded color list and improved validation
      const knownColors = ['black', 'white', 'red', 'blue', 'green', 'yellow', 'orange', 'purple',
                          'pink', 'brown', 'gray', 'grey', 'navy', 'lime', 'olive', 'royal',
                          'maroon', 'gold', 'charcoal', 'khaki', 'carolina', 'silver', 'teal',
                          'forest', 'burgundy', 'crimson', 'ivory', 'beige', 'tan', 'coral'];

      const part1Valid = knownColors.includes(part1.toLowerCase());
      const part2Valid = knownColors.includes(part2.toLowerCase());
      console.log('🎨 [STEP-BY-STEP-COLORS] Color validation:', { part1Valid, part2Valid });

      // If both parts are colors, treat as split color with proper capitalization
      if (part1Valid && part2Valid) {
        // CRITICAL FIX: Capitalize first letter of each color for proper display
        const normalizedPart1 = part1.charAt(0).toUpperCase() + part1.slice(1).toLowerCase();
        const normalizedPart2 = part2.charAt(0).toUpperCase() + part2.slice(1).toLowerCase();
        const normalizedColor = `${normalizedPart1}/${normalizedPart2}`;
        console.log('🎨 [STEP-BY-STEP-COLORS] RESULT: Split color detected:', normalizedColor);
        return normalizedColor;
      }
    }

    // Priority 2: Enhanced single color patterns with FABRIC EXCLUSION
    // BUT ONLY if there's NO slash pattern present (avoid interfering with Navy/White)
    const hasSlashPattern = /\b(?:black|white|red|blue|green|yellow|orange|purple|pink|brown|gray|grey|navy|lime|olive|royal|maroon|gold|charcoal|khaki|carolina|silver|teal|forest|burgundy|crimson|ivory|beige|tan|coral)\s*\/\s*(?:black|white|red|blue|green|yellow|orange|purple|pink|brown|gray|grey|navy|lime|olive|royal|maroon|gold|charcoal|khaki|carolina|silver|teal|forest|burgundy|crimson|ivory|beige|tan|coral)\b/i.test(text);

    console.log('🎨 [STEP-BY-STEP-COLORS] Checking for slash pattern interference:', hasSlashPattern);

    if (!hasSlashPattern) {
      const colorPatterns = [
        // Specific color context patterns - only when explicitly stated as color
        /(?:color:?\s*|color\s+)(\b(?:black|white|red|blue|green|yellow|orange|purple|pink|brown|gray|grey|navy|lime|olive|royal|maroon|gold|charcoal|khaki|carolina|silver|teal|forest|burgundy|crimson|ivory|beige|tan|coral)\b)/i,
        /(?:make\s+it\s+)(\b(?:black|white|red|blue|green|yellow|orange|purple|pink|brown|gray|grey|navy|lime|olive|royal|maroon|gold|charcoal|khaki|carolina|silver|teal|forest|burgundy|crimson|ivory|beige|tan|coral)\b)/i
      ];
      console.log('🎨 [STEP-BY-STEP-COLORS] Testing single color patterns (no slash interference)');

      for (const pattern of colorPatterns) {
        const colorMatch = text.match(pattern);
        console.log('🎨 [STEP-BY-STEP-COLORS] Pattern test:', { pattern: pattern.source, match: colorMatch });
        if (colorMatch) {
          const detectedColor = colorMatch[1] || colorMatch[0].trim();
          // CRITICAL FIX: Properly capitalize single colors too
          const normalizedColor = detectedColor.charAt(0).toUpperCase() + detectedColor.slice(1).toLowerCase();
          console.log('🎨 [STEP-BY-STEP-COLORS] RESULT: Single color detected:', normalizedColor);
          return normalizedColor;
        }
      }
    } else {
      console.log('🎨 [STEP-BY-STEP-COLORS] Skipping single color detection due to slash pattern interference');
    }

    // Priority 3: If no explicit color context, default to Black (as per business rules)
    // But ONLY if we haven't detected any fabric specifications that could be confused
    const hasFabricTerms = /(?:polyester|laser|cut|acrylic|airmesh|cotton|suede|leather)/i.test(text);
    if (!hasFabricTerms) {
      console.log('🎨 [STEP-BY-STEP-COLORS] No explicit color or fabric terms, defaulting to Black');
      console.log('🎨 [STEP-BY-STEP-COLORS] === END EXTRACTING COLOR ===');
      return 'Black';
    }

    console.log('🎨 [STEP-BY-STEP-COLORS] RESULT: Fabric terms detected, no color specified - returning null to use default');
    console.log('🎨 [STEP-BY-STEP-COLORS] === END EXTRACTING COLOR ===');
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
    const premiumFabrics = ['Suede Cotton', 'Acrylic', 'Air Mesh', 'Airmesh', 'Duck Camo', 'Camo', 'Genuine Leather', 'Laser Cut', 'Polyester'];

    return fabrics.some(f => {
      const lowerF = f.toLowerCase();

      return premiumFabrics.some(premium => {
        const lowerPremium = premium.toLowerCase();

        // Handle "Airmesh" variations
        if (lowerPremium.includes('airmesh') || lowerPremium.includes('air mesh')) {
          return lowerF.includes('airmesh') || lowerF.includes('air mesh') || lowerF.includes('mesh');
        }

        // Handle "Duck Camo" variations
        if (lowerPremium.includes('duck camo') || lowerPremium.includes('camo')) {
          return lowerF.includes('camo');
        }

        // Handle standard matching
        return lowerF.includes(lowerPremium) || lowerPremium.includes(lowerF);
      });
    });
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
    // CRITICAL FIX: Use unified logo detection system instead of the buggy detectAllLogosFromText
    const unifiedDetection = detectLogosUnified(request);

    console.log('🎨 [SUPPORT AI] UNIFIED logo detection:', {
      originalRequest: request.substring(0, 100),
      totalCount: unifiedDetection.totalCount,
      hasLogos: unifiedDetection.hasLogos,
      logos: unifiedDetection.logos.map(l => ({ type: l.type, position: l.position, size: l.size })),
      summary: unifiedDetection.summary
    });

    // Convert unified results to support AI format
    const logos = unifiedDetection.logos.map(logo => ({
      type: logo.type,
      position: logo.position, // Position is already properly capitalized in unified system
      size: logo.size,
      application: logo.application // Application is already determined in unified system
    }));

    return {
      hasLogo: unifiedDetection.hasLogos,
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
      const flatBillDefault = products.find(p => p.code === '6P_PROFIT_SIX_HFS') ||
                              products.find(p => p.name === '6P ProFit Six HFS');
      if (flatBillDefault) {
        console.log('🎯 [SUPPORT AI] Using Flat Bill default: 6P ProFit Six HFS');
        return flatBillDefault;
      }
    }

    if (capAnalysis?.detectedCapStyle?.toLowerCase().includes('curved') ||
        capAnalysis?.billShape === 'Curved') {
      const curvedBillDefault = products.find(p => p.code === '6P_PROFIT_SIX_HCS') ||
                                products.find(p => p.name === '6P ProFit Six HCS');
      if (curvedBillDefault) {
        console.log('🎯 [SUPPORT AI] Using Curved Bill default: 6P ProFit Six HCS');
        return curvedBillDefault;
      }
    }

    // Check for panel count preferences
    if (capAnalysis?.panelCount === '5-Panel') {
      const fivePanelDefault = products.find(p => p.code === '5P_URBAN_CLASSIC_HCS') ||
                               products.find(p => p.name === '5P Urban Classic HCS');
      if (fivePanelDefault) {
        console.log('🎯 [SUPPORT AI] Using 5-Panel default: 5P Urban Classic HCS');
        return fivePanelDefault;
      }
    }

    if (capAnalysis?.panelCount === '7-Panel') {
      const sevenPanelDefault = products.find(p => p.code === '7P_ELITE_SEVEN_MFS') ||
                                products.find(p => p.name === '7P Elite Seven MFS');
      if (sevenPanelDefault) {
        console.log('🎯 [SUPPORT AI] Using 7-Panel default: 7P Elite Seven MFS');
        return sevenPanelDefault;
      }
    }

    // Check for structure preferences (Dad Hat / Unstructured)
    if (capAnalysis?.structure === 'Unstructured' ||
        capAnalysis?.detectedCapStyle?.toLowerCase().includes('dad')) {
      const dadHatDefault = products.find(p => p.code === '6P_AIRFRAME_MCU') ||
                            products.find(p => p.name === '6P AirFrame MCU');
      if (dadHatDefault) {
        console.log('🎯 [SUPPORT AI] Using Unstructured Dad Hat default: 6P AirFrame MCU');
        return dadHatDefault;
      }
    }

    // Main default: 6P AirFrame HSCS (General purpose - High Profile, Structured)
    // CRITICAL FIX: Use both code and name matching to ensure structured cap is found
    // Also add structure verification to prevent unstructured caps from being selected
    const generalDefault = products.find(p =>
      (p.code === '6P_AIRFRAME_HSCS' || p.name === '6P AirFrame HSCS') &&
      (p.structure_type?.includes('Structured') || !p.structure_type?.includes('Unstructured'))
    ) || products.find(p => p.code === '6P_AIRFRAME_HSCS') ||
         products.find(p => p.name === '6P AirFrame HSCS');

    if (generalDefault) {
      console.log('🎯 [SUPPORT AI] Using general default: 6P AirFrame HSCS (6-Panel, High Profile, Structured)');
      console.log('🎯 [SUPPORT AI] Selected product structure type:', generalDefault.structure_type);
      return generalDefault;
    }

    // Fallback hierarchy based on currentTask.txt preferences - try both code and name formats
    const fallbackOrder = [
      { code: '6P_PROFIT_SIX_HCS', name: '6P ProFit Six HCS' },   // Curved Bill Structured
      { code: '6P_PROFIT_SIX_HFS', name: '6P ProFit Six HFS' },   // Flat Bill Structured
      { code: '5P_URBAN_CLASSIC_HCS', name: '5P Urban Classic HCS' }, // 5-Panel Structured
      { code: '6P_AIRFRAME_MCU', name: '6P AirFrame MCU' },       // Dad Hat Unstructured
      { code: '7P_ELITE_SEVEN_MFS', name: '7P Elite Seven MFS' }   // 7-Panel Structured
    ];

    for (const fallback of fallbackOrder) {
      const fallbackProduct = products.find(p => p.code === fallback.code) ||
                              products.find(p => p.name === fallback.name);
      if (fallbackProduct) {
        console.log('🎯 [SUPPORT AI] Using fallback default:', fallbackProduct.name);
        console.log('🎯 [SUPPORT AI] Fallback product structure type:', fallbackProduct.structure_type);

        // CRITICAL: If we're defaulting and this is not an unstructured request, prefer structured caps
        if (capAnalysis?.structure !== 'Unstructured' && fallbackProduct.structure_type?.includes('Unstructured')) {
          console.log('⚠️ [SUPPORT AI] Skipping unstructured fallback, continuing search for structured cap');
          continue;
        }

        return fallbackProduct;
      }
    }

    // Last resort: first active product, but prefer structured if available
    console.log('⚠️ [SUPPORT AI] Using first available product as last resort');
    console.log('⚠️ [SUPPORT AI] Available products:', products.slice(0, 3).map(p => ({
      name: p.name,
      code: p.code,
      structure: p.structure_type
    })));

    // Try to find any structured cap as last resort
    if (capAnalysis?.structure !== 'Unstructured') {
      const anyStructuredCap = products.find(p =>
        p.structure_type?.includes('Structured') || !p.structure_type?.includes('Unstructured')
      );
      if (anyStructuredCap) {
        console.log('🎯 [SUPPORT AI] Found structured cap as last resort:', anyStructuredCap.name);
        return anyStructuredCap;
      }
    }

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

    // CRITICAL FIX: Fitted caps are inherently structured
    if (lowerRequest.includes('fitted cap') || lowerRequest.includes('fitted hat')) {
      return 'Structured';
    }

    // Explicit structure mentions - check unstructured first to avoid conflicts
    if (lowerRequest.includes('unstructured')) return 'Unstructured';
    if (lowerRequest.includes('structured')) return 'Structured';

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
    // CRITICAL FIX: Map "Slight Curved" variations to "Curved" for consistent product matching
    if (lowerRequest.includes('slight curve') || lowerRequest.includes('slightly curved') || lowerRequest.includes('slight curved')) {
      return 'Curved';  // Normalize to "Curved" for product matching
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