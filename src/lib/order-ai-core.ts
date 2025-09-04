/**
 * Order AI Core Functions
 * Core logic for parsing order requirements and optimizing quantities
 */

import { getBaseProductPricing, calculateUnitPrice, calculateDeliveryUnitPrice } from '@/lib/pricing';
import { 
  costingService, 
  calculateCost, 
  calculateQuickEstimate as unifiedQuickEstimate 
} from '@/lib/unified-costing-service';
import {
  CostingContext,
  BUSINESS_RULES,
  detectFabricFromText,
  detectLogoTypeFromText,
  detectAllLogosFromText,
  detectClosureFromText,
  detectSizeFromText,
  detectAccessoriesFromText,
  getDefaultApplicationMethod
} from '@/lib/costing-knowledge-base';

export interface OrderRequirements {
  quantity: number;
  logoType: string;
  logoPosition?: string;
  logoSize?: string;
  logoApplication?: string; // Add application method
  color?: string;
  profile?: string;
  billStyle?: string;
  panelCount?: number;
  closureType?: string;
  structure?: string;
  fabricType?: string;
  stitching?: string;
  deliveryMethod?: string;
  accessories?: string[]; // Add accessories
  multiLogoSetup?: {
    front?: { type: string; size: string; application: string };
    right?: { type: string; size: string; application: string };
    left?: { type: string; size: string; application: string };
    back?: { type: string; size: string; application: string };
    upperBill?: { type: string; size: string; application: string };
    underBill?: { type: string; size: string; application: string };
  };
}

// Logo setup helper functions (matching Advanced Product Page)
const getDefaultLogoSize = (position: string) => position === 'Front' ? 'Large' : 'Small';

const getDefaultApplication = (decorationType: string) => {
  const typeMap: Record<string, string> = {
    '3D Embroidery': 'Direct',
    'Flat Embroidery': 'Direct',
    'Embroidery': 'Direct',
    'Sublimated Print': 'Direct',
    'Leather Patch': 'Run',
    'Rubber Patch': 'Run',
    'Printed Patch': 'Satin',
    'Sublimated Patch': 'Satin',
    'Woven Patch': 'Satin'
  };
  return typeMap[decorationType] || 'Direct';
};

/**
 * Create custom multi-logo setup based on specific user mentions
 */
function createCustomLogoSetup(message: string, primaryLogoType: string, primaryLogoSize: string) {
  const lowerMessage = message.toLowerCase();
  const setup: any = {};
  
  // Parse front logo (usually primary)
  if (lowerMessage.includes('on front') || lowerMessage.includes('front')) {
    // Check for specific front logo type
    let frontType = primaryLogoType;
    let frontSize = primaryLogoSize || 'Large';
    
    if (lowerMessage.includes('3d embroidery on front') || lowerMessage.includes('3d embroidery on the front')) {
      frontType = '3D Embroidery';
    } else if (lowerMessage.includes('rubber patch on front')) {
      frontType = 'Rubber Patch';
    } else if (lowerMessage.includes('woven patch on front')) {
      frontType = 'Woven Patch';
    }
    
    setup.front = {
      type: frontType,
      size: frontSize,
      application: getDefaultApplication(frontType)
    };
  }
  
  // Parse side logos
  if (lowerMessage.includes('on left') || lowerMessage.includes('left side')) {
    let leftType = 'Embroidery'; // Default for sides
    if (lowerMessage.includes('embroidery at left') || lowerMessage.includes('embroidery on left')) {
      leftType = 'Embroidery';
    }
    setup.left = {
      type: leftType,
      size: 'Small',
      application: getDefaultApplication(leftType)
    };
  }
  
  if (lowerMessage.includes('on right') || lowerMessage.includes('right side')) {
    let rightType = 'Embroidery'; // Default for sides
    if (lowerMessage.includes('screen print patch on right')) {
      rightType = 'Screen Print Patch';
    } else if (lowerMessage.includes('embroidery on right')) {
      rightType = 'Embroidery';
    }
    setup.right = {
      type: rightType,
      size: 'Small',
      application: getDefaultApplication(rightType)
    };
  }
  
  // Parse back logo
  if (lowerMessage.includes('on back') || lowerMessage.includes('on the back')) {
    let backType = 'Embroidery'; // Default
    if (lowerMessage.includes('patch on back')) {
      backType = 'Patch';
    } else if (lowerMessage.includes('woven patch on back')) {
      backType = 'Woven Patch';
    }
    setup.back = {
      type: backType,
      size: 'Small',
      application: getDefaultApplication(backType)
    };
  }
  
  return setup;
}


/**
 * Get delivery method suggestions based on quantity for cost savings
 */
export function getDeliveryMethodSuggestions(quantity: number): { 
  recommended: string; 
  alternatives: Array<{ method: string; savings: string; minQuantity?: number }> 
} {
  if (quantity >= 3168) {
    return {
      recommended: 'regular',
      alternatives: [
        { method: 'air-freight', savings: 'Save 15-25% on delivery costs', minQuantity: 3168 },
        { method: 'sea-freight', savings: 'Save 40-60% on delivery costs (longer transit)', minQuantity: 3168 }
      ]
    };
  }
  
  return {
    recommended: 'regular',
    alternatives: [
      { method: 'air-freight', savings: 'Available for orders 3168+ caps', minQuantity: 3168 },
      { method: 'sea-freight', savings: 'Available for orders 3168+ caps (best savings)', minQuantity: 3168 }
    ]
  };
}

/**
 * Get budget-friendly accessory suggestions (optional add-ons)
 */
export function getBudgetFriendlyAccessorySuggestions(): {
  recommended: Array<{ name: string; benefit: string; costImpact: string }>;
  premium: Array<{ name: string; benefit: string; costImpact: string }>;
} {
  return {
    recommended: [
      { name: 'Hangtag', benefit: 'Professional branding touch', costImpact: 'Low cost addition' },
      { name: 'Polybag', benefit: 'Protection during shipping', costImpact: 'Minimal cost increase' }
    ],
    premium: [
      { name: 'Custom Box', benefit: 'Premium unboxing experience', costImpact: 'Higher cost per unit' },
      { name: 'Tissue Paper', benefit: 'Luxury presentation', costImpact: 'Moderate cost increase' }
    ]
  };
}

/**
 * Parse order requirements from user message using unified costing knowledge base
 */
export function parseOrderRequirements(message: string): OrderRequirements {
  const lowerMessage = message.toLowerCase();
  
  // Extract quantity - FIXED: Better parsing for all quantity patterns including multi-color orders
  let quantity = 150; // Default fallback
  
  // 1. First priority: explicit "total" mentions
  const totalMatch = message.match(/(\d+,?\d*)\s*(?:caps?\s*)?total/i);
  if (totalMatch) {
    const totalStr = totalMatch[1].replace(/,/g, '');
    quantity = parseInt(totalStr);
    console.log('🎯 [ORDER-AI-CORE] Total quantity override detected:', quantity);
  } else {
    // 2. MULTI-COLOR ORDERS: Detect multiple quantities (like "48, Red/White 144, and Navy 72")
    const multiColorMatches = message.match(/\b(\d+)\b/g);
    if (multiColorMatches && multiColorMatches.length > 1) {
      // Check if this looks like a multi-color order (has color names and multiple numbers)
      const hasColors = /(?:black|white|red|blue|navy|green|yellow|orange|purple|pink|brown|gray|grey)/i.test(message);
      const hasMultipleNumbers = multiColorMatches.length >= 2;
      
      if (hasColors && hasMultipleNumbers) {
        // Sum all detected quantities for multi-color orders
        let totalQuantity = 0;
        multiColorMatches.forEach(match => {
          const num = parseInt(match);
          // Only include reasonable cap quantities (between 10 and 10000) - excludes panel counts like "5", "6"
          if (num >= 10 && num <= 10000) {
            totalQuantity += num;
          }
        });
        
        if (totalQuantity > 0) {
          quantity = totalQuantity;
          console.log('🎯 [ORDER-AI-CORE] Multi-color quantity detected:', quantity, 'from quantities:', multiColorMatches);
        }
      }
    }
    
    // 3. Fallback: Try direct pattern first (like "576 pieces", "300 caps")
    if (quantity === 150) { // Only if we haven't detected multi-color
      const directQuantityMatch = message.match(/(\d+)\s*(?:caps?|pieces?|units?)/i);
      if (directQuantityMatch) {
        quantity = parseInt(directQuantityMatch[1]);
        console.log('🎯 [ORDER-AI-CORE] Direct quantity detected:', quantity);
      } else {
        // 4. Try loose pattern for cases like "576 highest end caps"
        const looseQuantityMatch = message.match(/(\d+).*?(?:caps?|pieces?|units?)/i);
        if (looseQuantityMatch) {
          quantity = parseInt(looseQuantityMatch[1]);
          console.log('🎯 [ORDER-AI-CORE] Loose quantity detected:', quantity);
        }
      }
    }
  }
  
  // Use business rules defaults from knowledge base
  let panelCount = BUSINESS_RULES.DEFAULTS.panelCount;
  let profile = BUSINESS_RULES.DEFAULTS.profile;
  let structure = BUSINESS_RULES.DEFAULTS.structure;
  let closureType = BUSINESS_RULES.DEFAULTS.closure;
  let fabricType = BUSINESS_RULES.DEFAULTS.fabricType;
  let stitching = BUSINESS_RULES.DEFAULTS.stitching;
  let deliveryMethod = BUSINESS_RULES.DEFAULTS.deliveryMethod;
  
  // Use enhanced multi-logo detection from knowledge base
  const logoDetectionResult = detectAllLogosFromText(message);
  let logoType = logoDetectionResult.primaryLogo || "3D Embroidery";
  
  // SPECIAL CASE: Map 3D Embroidery to complex logo setup
  // NOTE: This will be overridden by the multiLogoSetup logic later, but kept for backward compatibility
  if (logoType === "3D Embroidery") {
    logoType = "Medium Size Embroidery + 3D Embroidery"; // Use Medium as default, will be adjusted by size detection
  }
  let logoPosition = "Front"; // Default position
  let logoSize = detectSizeFromText(message, logoPosition);
  
  // Override logo size if detected in multi-logo analysis
  const frontLogo = logoDetectionResult.allLogos.find(logo => logo.position === 'front');
  if (frontLogo) {
    logoSize = frontLogo.size;
    logoPosition = 'Front';
  }
  
  console.log('🎨 [ORDER-AI-CORE] Enhanced multi-logo detection results:', {
    originalMessage: message.substring(0, 100),
    primaryLogoType: logoType,
    detectedSize: logoSize,
    allLogosFound: logoDetectionResult.allLogos.length,
    allLogos: logoDetectionResult.allLogos
  });
  
  // FIXED: Create intelligent multi-logo setup based on user request
  let multiLogoSetup: any = null;
  
  if (logoType !== "None") {
    // Check if user specified multiple logo positions
    const hasMultipleLogos = lowerMessage.includes('on front') && 
                            (lowerMessage.includes('on left') || lowerMessage.includes('on right') || 
                             lowerMessage.includes('on back') || lowerMessage.includes('sides'));
    
    if (logoDetectionResult.multiLogoSetup) {
      // Use detected multi-logo setup
      multiLogoSetup = logoDetectionResult.multiLogoSetup;
      console.log('🎨 [ORDER-AI-CORE] Using detected multi-logo setup');
    } else if (hasMultipleLogos) {
      // Create custom setup based on specific mentions
      multiLogoSetup = createCustomLogoSetup(message, logoType, logoSize);
      console.log('🎨 [ORDER-AI-CORE] Created custom multi-logo setup from message');
    } else {
      // Check if the message has specific complex logo requests even without "on front" + sides pattern
      const hasComplexLogos = lowerMessage.includes('rubber patch') || 
                             lowerMessage.includes('woven patch') || 
                             lowerMessage.includes('screen print patch') ||
                             (lowerMessage.includes('embroidery') && lowerMessage.includes('patch'));
      
      if (hasComplexLogos) {
        // Use enhanced parser for complex logos
        multiLogoSetup = createCustomLogoSetup(message, logoType, logoSize);
        console.log('🎨 [ORDER-AI-CORE] Created custom setup for complex logos');
      } else {
        // Single logo position - create minimal setup
        multiLogoSetup = {
          front: { 
            type: logoType, 
            size: logoSize || "Large", 
            application: getDefaultApplication(logoType) 
          }
        };
        console.log('🎨 [ORDER-AI-CORE] Created single-logo setup');
      }
    }
    
    console.log('🎨 [ORDER-AI-CORE] Multi-logo setup configured:', {
      hasCustomSetup: !!logoDetectionResult.multiLogoSetup,
      setupType: hasMultipleLogos ? 'multi' : 'single',
      frontLogo: multiLogoSetup?.front,
      backLogo: multiLogoSetup?.back
    });
  }
  
  // Extract color with enhanced detection
  let color = undefined;
  const colorPatterns = [
    /(?:color:?\s*|in\s+)(\w+)/i,
    /(?:^|\s)(black|white|red|blue|green|yellow|orange|purple|pink|brown|gray|grey|navy|lime|olive)(?:\s|$|,)/i,
    /(\w+)\/(\w+)/i // Handle "Olive/White" format
  ];
  
  for (const pattern of colorPatterns) {
    const colorMatch = message.match(pattern);
    if (colorMatch) {
      color = colorMatch[1] || colorMatch[0].trim();
      break;
    }
  }
  
  // Override defaults only if explicitly mentioned in message
  let billStyle = "Flat Bill"; // Keep existing bill style logic
  
  // Detect profile from CSV Profile field values (override defaults only if specified)
  if (lowerMessage.includes('high profile') || lowerMessage.includes('high crown')) {
    profile = "High";
  } else if (lowerMessage.includes('mid profile') || lowerMessage.includes('medium profile')) {
    profile = "Mid";
  } else if (lowerMessage.includes('low profile') || lowerMessage.includes('low crown')) {
    profile = "Low";
  }
  
  // Detect structure (override default only if specified)
  if (lowerMessage.includes('unstructured') || lowerMessage.includes('soft')) {
    structure = "Unstructured";
  }
  
  // Use knowledge base for fabric detection
  const detectedFabric = detectFabricFromText(message);
  if (detectedFabric) {
    fabricType = detectedFabric;
    console.log('🧵 [ORDER-AI-CORE] Fabric detected using knowledge base:', detectedFabric);
  }
  
  // Detect stitching preference (override default only if specified)
  if (lowerMessage.includes('contrast') || lowerMessage.includes('different color')) {
    stitching = "Contrast";
  }
  
  // Detect bill style from CSV "bill or visor Shape" field values
  if (lowerMessage.includes('flat bill') || lowerMessage.includes('flat visor') || lowerMessage.includes('flatbill')) {
    billStyle = "Flat Bill";
  } else if (lowerMessage.includes('slight curved') || lowerMessage.includes('slightly curved')) {
    billStyle = "Slight Curved";
  } else if (lowerMessage.includes('curved bill') || lowerMessage.includes('curved visor')) {
    billStyle = "Curved";
  }
  
  // Detect panel count from CSV "Panel Count" field values
  // Check for specific panel mentions first
  if (lowerMessage.includes('6 panel') || lowerMessage.includes('6-panel')) {
    panelCount = 6;
  } else if (lowerMessage.includes('5 panel') || lowerMessage.includes('5-panel')) {
    panelCount = 5;
  } else if (lowerMessage.includes('4 panel') || lowerMessage.includes('4-panel')) {
    panelCount = 4;
  }
  
  // Handle negative statements like "not 5-panel" + "6-panel"
  if (lowerMessage.includes('not') && lowerMessage.includes('5')) {
    // If they say "not 5-panel" and mention 6, default to 6
    if (lowerMessage.includes('6')) {
      panelCount = 6;
    }
  }
  
  // Use knowledge base for closure detection
  const detectedClosure = detectClosureFromText(message);
  if (detectedClosure) {
    closureType = detectedClosure;
    console.log('🔒 [ORDER-AI-CORE] Closure detected using knowledge base:', detectedClosure);
  }

  // Detect accessories from message
  const detectedAccessories = detectAccessoriesFromText(message);
  console.log('🏷️ [ORDER-AI-CORE] Accessories detected:', detectedAccessories);
  
  // Detect delivery method preferences and suggest cost-saving options
  if (lowerMessage.includes('air freight') || lowerMessage.includes('airfreight')) {
    deliveryMethod = "air-freight";
  } else if (lowerMessage.includes('sea freight') || lowerMessage.includes('seafreight') || lowerMessage.includes('ocean')) {
    deliveryMethod = "sea-freight";
  } else if (lowerMessage.includes('rush') || lowerMessage.includes('express') || lowerMessage.includes('urgent')) {
    deliveryMethod = "express";
  }
  // Note: regular delivery remains as default
  
  // Apply position-based size default and correct application method using knowledge base
  logoSize = detectSizeFromText(message, logoPosition);
  const logoApplication = getDefaultApplicationMethod(logoType);
  
  return {
    quantity,
    logoType,
    logoPosition,
    logoSize,
    logoApplication, // Add application method
    color,
    profile,
    billStyle,
    panelCount,
    closureType,
    structure,
    fabricType,
    stitching,
    deliveryMethod,
    accessories: detectedAccessories, // Include detected accessories
    multiLogoSetup
  };
}

/**
 * Extract budget from user message
 */
export function extractBudget(message: string): number | null {
  const budgetMatch = message.match(/\$(\d+(?:,\d{3})*(?:\.\d{2})?)/);
  if (budgetMatch) {
    return parseFloat(budgetMatch[1].replace(/,/g, ''));
  }
  return null;
}

/**
 * Optimize quantity for budget (simple version)
 */
export function optimizeQuantityForBudget(budget: number, logoType: string) {
  // Start with a rough estimate and iterate to find optimal quantity
  let bestQuantity = 0;
  let bestCostPerUnit = 0;
  let bestTotalCost = 0;
  
  // Test different quantity levels to find the best fit within budget
  const testQuantities = [48, 144, 576, 1152, 2880, 10000];
  
  for (const qty of testQuantities) {
    const basePrice = getBasePriceForQuantity(qty);
    const logoSetupCost = logoType === "3D Embroidery" ? 100 : 
                         logoType === "None" ? 0 : 50;
    const deliveryUnitPrice = calculateDeliveryUnitPrice(qty, 'regular');
    const deliveryCost = qty * deliveryUnitPrice;
    const totalCost = (qty * basePrice) + logoSetupCost + deliveryCost;
    
    if (totalCost <= budget) {
      bestQuantity = qty;
      bestCostPerUnit = totalCost / qty;
      bestTotalCost = totalCost;
    } else {
      break; // Stop when we exceed budget
    }
  }
  
  return {
    optimizedQuantity: bestQuantity,
    costPerUnit: bestCostPerUnit,
    budgetUsed: bestTotalCost,
    savings: budget - bestTotalCost,
    tierLevel: "Tier 1"
  };
}

/**
 * Optimize quantity for budget (precise version) using unified costing service
 */
export async function optimizeQuantityForBudgetPrecise(budget: number, logoType: string, message?: string) {
  console.log('🎯 [ORDER-AI-CORE] Optimizing budget using unified costing service:', {
    budget,
    logoType,
    hasMessage: !!message
  });
  
  // Parse full requirements if message provided
  let requirements: OrderRequirements;
  if (message) {
    requirements = parseOrderRequirements(message);
    console.log('🔄 [ORDER-AI-CORE] Enhanced requirements from message:', {
      logoType: requirements.logoType,
      fabricType: requirements.fabricType,
      closureType: requirements.closureType
    });
  } else {
    // Basic requirements
    requirements = {
      quantity: 150,
      logoType,
      logoPosition: 'Front',
      logoSize: 'Medium',
      logoApplication: getDefaultApplicationMethod(logoType),
      fabricType: BUSINESS_RULES.DEFAULTS.fabricType,
      closureType: BUSINESS_RULES.DEFAULTS.closure,
      deliveryMethod: BUSINESS_RULES.DEFAULTS.deliveryMethod,
      profile: BUSINESS_RULES.DEFAULTS.profile,
      structure: BUSINESS_RULES.DEFAULTS.structure,
      stitching: BUSINESS_RULES.DEFAULTS.stitching,
      billStyle: BUSINESS_RULES.DEFAULTS.billStyle,
      panelCount: BUSINESS_RULES.DEFAULTS.panelCount,
      multiLogoSetup: logoType !== "None" ? BUSINESS_RULES.DEFAULT_LOGO_SETUP : null
    };
  }
  
  // Test different quantity levels to find the best fit within budget
  const testQuantities = [48, 144, 576, 1152, 2880, 10000];
  let bestQuantity = 0;
  let bestCostPerUnit = 0;
  let bestTotalCost = 0;
  let bestTierLevel = "Tier 1";
  
  for (const qty of testQuantities) {
    try {
      // Create test requirements with this quantity
      const testRequirements = { ...requirements, quantity: qty };
      const estimate = await calculateQuickEstimate(testRequirements);
      
      console.log(`📊 [ORDER-AI-CORE] Testing quantity ${qty} with unified service:`, {
        costPerUnit: estimate.costPerUnit.toFixed(3),
        totalCost: estimate.totalCost.toFixed(2),
        withinBudget: estimate.totalCost <= budget,
        baseProduct: estimate.baseProductCost.toFixed(2),
        logoSetup: estimate.logoSetupCost.toFixed(2),
        delivery: estimate.deliveryCost.toFixed(2)
      });
      
      if (estimate.totalCost <= budget) {
        bestQuantity = qty;
        bestCostPerUnit = estimate.costPerUnit;
        bestTotalCost = estimate.totalCost;
        bestTierLevel = "Tier 1";
      } else {
        break; // Stop when we exceed budget
      }
    } catch (error) {
      console.error(`Error testing quantity ${qty}:`, error);
      continue;
    }
  }
  
  console.log('✅ [ORDER-AI-CORE] Optimal quantity found using unified service:', {
    quantity: bestQuantity,
    costPerUnit: bestCostPerUnit.toFixed(3),
    totalCost: bestTotalCost.toFixed(2),
    savings: (budget - bestTotalCost).toFixed(2)
  });
  
  return {
    optimizedQuantity: bestQuantity,
    costPerUnit: bestCostPerUnit,
    budgetUsed: bestTotalCost,
    savings: budget - bestTotalCost,
    tierLevel: bestTierLevel
  };
}

/**
 * Calculate quick estimate using unified costing service
 */
export async function calculateQuickEstimate(requirements: OrderRequirements, context?: any, budget?: number) {
  try {
    // Build simplified costing context
    const logoSetup = requirements.logoType !== "None" ? [{
      type: requirements.logoType,
      size: requirements.logoSize || 'Medium',
      position: requirements.logoPosition || 'Front',
      application: requirements.logoApplication || getDefaultApplicationMethod(requirements.logoType)
    }] : undefined;

    const costingContext: CostingContext = {
      quantity: requirements.quantity,
      logoSetup,
      fabricType: requirements.fabricType,
      closureType: requirements.closureType,
      deliveryMethod: requirements.deliveryMethod || 'regular',
      productTier: 'Tier 1'
    };

    // Use unified quick estimate
    const estimate = await unifiedQuickEstimate(costingContext);
    
    return {
      quantity: estimate.quantity,
      costPerUnit: estimate.costPerUnit,
      totalCost: estimate.totalCost,
      logoSetupCost: estimate.estimatedBreakdown.logoSetup,
      deliveryCost: estimate.estimatedBreakdown.delivery,
      baseProductCost: estimate.estimatedBreakdown.baseProduct
    };
  } catch (error) {
    console.error('Failed to calculate quick estimate using unified service, using fallback:', error);
    
    // Fallback to simple calculation
    const basePrice = getBasePriceForQuantity(requirements.quantity);
    const logoSetupCost = requirements.logoType === "3D Embroidery" ? 100 : 
                         requirements.logoType === "None" ? 0 : 50;
    const deliveryUnitPrice = calculateDeliveryUnitPrice(requirements.quantity, requirements.deliveryMethod || 'regular');
    const deliveryCost = requirements.quantity * deliveryUnitPrice;
    const total = (requirements.quantity * basePrice) + logoSetupCost + deliveryCost;
    
    return {
      quantity: requirements.quantity,
      costPerUnit: total / requirements.quantity,
      totalCost: total,
      logoSetupCost,
      deliveryCost,
      baseProductCost: requirements.quantity * basePrice
    };
  }
}

/**
 * Calculate precise order estimate using unified costing service
 */
export async function calculatePreciseOrderEstimate(requirements: OrderRequirements) {
  try {
    console.log('🧮 [ORDER-AI-CORE] Calculating precise estimate using unified service for:', {
      quantity: requirements.quantity,
      logoType: requirements.logoType,
      logoSize: requirements.logoSize,
      color: requirements.color,
      profile: requirements.profile,
      billStyle: requirements.billStyle,
      panelCount: requirements.panelCount,
      closureType: requirements.closureType,
      fabricType: requirements.fabricType
    });
    
    // Build costing context from requirements using unified service format
    const logoSetup: any[] = [];
    
    if (requirements.multiLogoSetup && requirements.logoType !== "None") {
      // Use multi-logo setup for comprehensive logo configuration
      Object.entries(requirements.multiLogoSetup).forEach(([position, config]: [string, any]) => {
        logoSetup.push({
          type: config.type,
          size: config.size,
          position: position.charAt(0).toUpperCase() + position.slice(1),
          application: config.application
        });
      });
    } else if (requirements.logoType !== "None") {
      // Single logo setup
      const position = requirements.logoPosition || "Front";
      const size = requirements.logoSize || detectSizeFromText("", position);
      const application = requirements.logoApplication || getDefaultApplicationMethod(requirements.logoType);
      
      logoSetup.push({
        type: requirements.logoType,
        size: size,
        position: position,
        application: application
      });
    }

    const costingContext: CostingContext = {
      quantity: requirements.quantity,
      logoSetup: logoSetup.length > 0 ? logoSetup : undefined,
      fabricType: requirements.fabricType,
      closureType: requirements.closureType,
      deliveryMethod: requirements.deliveryMethod || 'regular', // Default to regular delivery
      productTier: 'Tier 1', // Default to most affordable tier
      accessories: requirements.accessories || [], // Include detected accessories
      services: [] // Can be expanded later
    };
    
    console.log('📤 [ORDER-AI-CORE] Using unified costing service with context:', {
      quantity: costingContext.quantity,
      logoSetupCount: costingContext.logoSetup?.length || 0,
      fabricType: costingContext.fabricType,
      closureType: costingContext.closureType,
      deliveryMethod: costingContext.deliveryMethod,
      accessoriesCount: costingContext.accessories?.length || 0,
      accessories: costingContext.accessories
    });

    // Use unified costing service
    const costBreakdown = await calculateCost(costingContext);
    
    console.log('📥 [ORDER-AI-CORE] Received unified cost calculation:', {
      baseProductCost: costBreakdown.baseProductCost,
      logoSetupTotal: costBreakdown.logoSetupCosts.reduce((sum, cost) => sum + cost.cost, 0),
      premiumFabricTotal: costBreakdown.premiumFabricCosts.reduce((sum, cost) => sum + cost.cost, 0),
      closureTotal: costBreakdown.closureCosts.reduce((sum, cost) => sum + cost.cost, 0),
      moldChargeTotal: costBreakdown.moldChargeCosts.reduce((sum, cost) => sum + cost.cost, 0),
      deliveryTotal: costBreakdown.deliveryCosts.reduce((sum, cost) => sum + cost.cost, 0),
      totalCost: costBreakdown.totalCost
    });
    
    // Format response to match expected structure for backward compatibility
    return {
      costBreakdown: {
        baseProductTotal: costBreakdown.baseProductCost,
        logoSetupTotal: costBreakdown.logoSetupCosts.reduce((sum, cost) => sum + cost.cost, 0),
        deliveryTotal: costBreakdown.deliveryCosts.reduce((sum, cost) => sum + cost.cost, 0),
        accessoriesTotal: costBreakdown.accessoriesCosts.reduce((sum, cost) => sum + cost.cost, 0),
        closureTotal: costBreakdown.closureCosts.reduce((sum, cost) => sum + cost.cost, 0),
        moldChargeTotal: costBreakdown.moldChargeCosts.reduce((sum, cost) => sum + cost.cost, 0),
        servicesTotal: costBreakdown.servicesCosts.reduce((sum, cost) => sum + cost.cost, 0),
        premiumFabricTotal: costBreakdown.premiumFabricCosts.reduce((sum, cost) => sum + cost.cost, 0),
        totalCost: costBreakdown.totalCost,
        // Map detailed breakdown for AI responses
        detailedBreakdown: costBreakdown
      },
      orderEstimate: {
        quantity: requirements.quantity,
        costPerUnit: costBreakdown.totalCost / requirements.quantity,
        totalCost: costBreakdown.totalCost
      }
    };
  } catch (error) {
    console.error('Failed to get precise cost calculation using unified service, using enhanced fallback:', error);
    
    // Use enhanced fallback that includes premium costs
    return calculateEnhancedFallbackEstimate(requirements);
  }
}

/**
 * Enhanced fallback calculation when API is unavailable - includes premium costs
 */
function calculateEnhancedFallbackEstimate(requirements: OrderRequirements) {
  const basePrice = getBasePriceForQuantity(requirements.quantity);
  const baseProductTotal = requirements.quantity * basePrice;
  let totalCost = baseProductTotal;
  
  console.log('🔧 [ENHANCED-FALLBACK] Starting enhanced fallback calculation:', {
    quantity: requirements.quantity,
    basePrice,
    logoType: requirements.logoType,
    fabricType: requirements.fabricType,
    closureType: requirements.closureType
  });

  // Enhanced logo setup cost calculation
  let logoSetupCost = 0;
  const logoSetupCosts: any[] = [];
  
  if (requirements.logoType !== "None") {
    if (requirements.multiLogoSetup) {
      // Calculate cost for each logo position
      Object.entries(requirements.multiLogoSetup).forEach(([position, config]) => {
        const logoUnitPrice = getPriceForLogoQuantity(`${config.size} ${config.type}`, requirements.quantity);
        const logoCost = logoUnitPrice * requirements.quantity;
        
        logoSetupCosts.push({
          name: `${config.size} ${config.type}`,
          cost: logoCost,
          unitPrice: logoUnitPrice,
          details: `${config.size} ${config.type} on ${position.charAt(0).toUpperCase() + position.slice(1)}`
        });
        logoSetupCost += logoCost;
      });
    } else {
      // Single logo calculation
      const size = requirements.logoSize || 'Medium';
      const logoUnitPrice = getPriceForLogoQuantity(`${size} ${requirements.logoType}`, requirements.quantity);
      logoSetupCost = logoUnitPrice * requirements.quantity;
      
      logoSetupCosts.push({
        name: `${size} ${requirements.logoType}`,
        cost: logoSetupCost,
        unitPrice: logoUnitPrice,
        details: `${size} ${requirements.logoType} on ${requirements.logoPosition || 'Front'}`
      });
    }
    totalCost += logoSetupCost;
  }

  // Premium fabric cost calculation
  let premiumFabricTotal = 0;
  const premiumFabricCosts: any[] = [];
  const premiumFabrics = ['Acrylic', 'Suede Cotton', 'Genuine Leather', 'Air Mesh', 'Camo', 'Laser Cut'];
  
  if (requirements.fabricType && premiumFabrics.includes(requirements.fabricType)) {
    const fabricUnitPrice = getFallbackPremiumFabricPrice(requirements.fabricType, requirements.quantity);
    premiumFabricTotal = fabricUnitPrice * requirements.quantity;
    
    premiumFabricCosts.push({
      name: requirements.fabricType,
      cost: premiumFabricTotal,
      unitPrice: fabricUnitPrice
    });
    totalCost += premiumFabricTotal;
    
    console.log('🔧 [ENHANCED-FALLBACK] Added premium fabric cost:', {
      fabric: requirements.fabricType,
      unitPrice: fabricUnitPrice,
      totalCost: premiumFabricTotal
    });
  }

  // Premium closure cost calculation
  let closureTotal = 0;
  const closureCosts: any[] = [];
  const premiumClosures = ['flexfit', 'fitted', 'buckle', 'stretched'];
  
  if (requirements.closureType && premiumClosures.includes(requirements.closureType.toLowerCase())) {
    const closureUnitPrice = getFallbackClosurePrice(requirements.closureType, requirements.quantity);
    closureTotal = closureUnitPrice * requirements.quantity;
    
    closureCosts.push({
      name: requirements.closureType.charAt(0).toUpperCase() + requirements.closureType.slice(1),
      cost: closureTotal,
      unitPrice: closureUnitPrice
    });
    totalCost += closureTotal;
    
    console.log('🔧 [ENHANCED-FALLBACK] Added premium closure cost:', {
      closure: requirements.closureType,
      unitPrice: closureUnitPrice,
      totalCost: closureTotal
    });
  }

  // Mold charge calculation for rubber/leather patches
  let moldChargeTotal = 0;
  const moldChargeCosts: any[] = [];
  
  if (requirements.logoType && (requirements.logoType.includes('Rubber Patch') || requirements.logoType.includes('Leather Patch'))) {
    const size = requirements.logoSize || 'Medium';
    const moldCharge = getFallbackMoldCharge(size);
    moldChargeTotal = moldCharge;
    
    moldChargeCosts.push({
      name: `${size} Mold Charge (${requirements.logoType})`,
      cost: moldCharge,
      unitPrice: moldCharge, // One-time charge
      waived: false
    });
    totalCost += moldChargeTotal;
    
    console.log('🔧 [ENHANCED-FALLBACK] Added mold charge:', {
      logoType: requirements.logoType,
      size: size,
      moldCharge
    });
  }

  // Delivery cost calculation
  const deliveryUnitPrice = calculateDeliveryUnitPrice(requirements.quantity, requirements.deliveryMethod || 'regular');
  const deliveryCost = requirements.quantity * deliveryUnitPrice;
  totalCost += deliveryCost;

  console.log('🔧 [ENHANCED-FALLBACK] Final cost breakdown:', {
    baseProductTotal,
    logoSetupTotal: logoSetupCost,
    premiumFabricTotal,
    closureTotal,
    moldChargeTotal,
    deliveryTotal: deliveryCost,
    totalCost
  });

  return {
    costBreakdown: {
      baseProductTotal,
      logoSetupTotal: logoSetupCost,
      deliveryTotal: deliveryCost,
      accessoriesTotal: 0,
      closureTotal,
      moldChargeTotal,
      servicesTotal: 0,
      premiumFabricTotal,
      totalCost,
      detailedBreakdown: {
        baseProductCost: baseProductTotal,
        logoSetupCosts,
        deliveryCosts: [{
          name: "Regular Delivery",
          cost: deliveryCost,
          unitPrice: deliveryUnitPrice
        }],
        accessoriesCosts: [],
        closureCosts,
        moldChargeCosts,
        servicesCosts: [],
        premiumFabricCosts,
        totalCost,
        totalUnits: requirements.quantity
      }
    },
    orderEstimate: {
      quantity: requirements.quantity,
      costPerUnit: totalCost / requirements.quantity,
      totalCost
    }
  };
}

/**
 * Basic fallback calculation when API is unavailable (legacy - use enhanced version)
 */
function calculateBasicEstimate(requirements: OrderRequirements) {
  return calculateEnhancedFallbackEstimate(requirements);
}

/**
 * Get base price based on quantity tiers (uses real CSV pricing)
 */
function getBasePriceForQuantity(quantity: number): number {
  return calculateUnitPrice(quantity, 'Tier 1'); // Use real pricing system
}

/**
 * Get logo pricing for specific quantity using CSV-based customization pricing
 */
function getPriceForLogoQuantity(logoType: string, quantity: number): number {
  // Hardcoded CSV pricing for logo types (should ideally load from CSV)
  const logoPricing: Record<string, { price48: number; price144: number; price576: number; price1152: number; price2880: number; price10000: number }> = {
    '3D Embroidery': { price48: 0.2, price144: 0.15, price576: 0.12, price1152: 0.1, price2880: 0.1, price10000: 0.08 },
    'Small Rubber Patch': { price48: 1.0, price144: 0.7, price576: 0.65, price1152: 0.6, price2880: 0.55, price10000: 0.5 },
    'Medium Rubber Patch': { price48: 1.25, price144: 0.9, price576: 0.85, price1152: 0.8, price2880: 0.75, price10000: 0.7 },
    'Large Rubber Patch': { price48: 1.5, price144: 1.2, price576: 1.0, price1152: 0.9, price2880: 0.85, price10000: 0.8 },
    'Small Leather Patch': { price48: 1.0, price144: 0.6, price576: 0.5, price1152: 0.45, price2880: 0.4, price10000: 0.35 },
    'Medium Leather Patch': { price48: 1.2, price144: 0.75, price576: 0.7, price1152: 0.65, price2880: 0.6, price10000: 0.55 },
    'Large Leather Patch': { price48: 1.35, price144: 0.9, price576: 0.85, price1152: 0.8, price2880: 0.75, price10000: 0.7 },
    'Small Print Woven Patch': { price48: 0.8, price144: 0.55, price576: 0.4, price1152: 0.35, price2880: 0.3, price10000: 0.25 },
    'Medium Print Woven Patch': { price48: 1.0, price144: 0.7, price576: 0.6, price1152: 0.55, price2880: 0.5, price10000: 0.45 },
    'Large Print Woven Patch': { price48: 1.2, price144: 0.9, price576: 0.8, price1152: 0.75, price2880: 0.7, price10000: 0.65 },
    'Small Size Embroidery': { price48: 0.7, price144: 0.45, price576: 0.35, price1152: 0.3, price2880: 0.25, price10000: 0.2 },
    'Medium Size Embroidery': { price48: 0.9, price144: 0.65, price576: 0.55, price1152: 0.52, price2880: 0.5, price10000: 0.45 },
    'Large Size Embroidery': { price48: 1.2, price144: 0.8, price576: 0.7, price1152: 0.65, price2880: 0.6, price10000: 0.55 }
  };
  
  const pricing = logoPricing[logoType];
  if (!pricing) {
    console.warn(`⚠️ [ORDER-AI-CORE] No pricing found for logo type: ${logoType}, using fallback`);
    return 0.5; // Fallback price
  }
  
  // Return appropriate price based on quantity tier
  if (quantity >= 10000) return pricing.price10000;
  if (quantity >= 2880) return pricing.price2880;
  if (quantity >= 1152) return pricing.price1152;
  if (quantity >= 576) return pricing.price576;
  if (quantity >= 144) return pricing.price144;
  return pricing.price48;
}

/**
 * Get premium fabric pricing for fallback calculations
 */
function getFallbackPremiumFabricPrice(fabricType: string, quantity: number): number {
  const fabricPricing: Record<string, { price48: number; price144: number; price576: number; price1152: number; price2880: number; price10000: number }> = {
    'Suede Cotton': { price48: 1.2, price144: 1.0, price576: 0.8, price1152: 0.7, price2880: 0.65, price10000: 0.6 },
    'Acrylic': { price48: 1.2, price144: 1.0, price576: 0.8, price1152: 0.7, price2880: 0.65, price10000: 0.6 },
    'Air Mesh': { price48: 0.5, price144: 0.35, price576: 0.3, price1152: 0.28, price2880: 0.25, price10000: 0.25 },
    'Camo': { price48: 0.5, price144: 0.4, price576: 0.35, price1152: 0.3, price2880: 0.25, price10000: 0.2 },
    'Genuine Leather': { price48: 2.0, price144: 1.8, price576: 1.7, price1152: 1.65, price2880: 1.6, price10000: 1.55 },
    'Laser Cut': { price48: 0.5, price144: 0.4, price576: 0.35, price1152: 0.3, price2880: 0.28, price10000: 0.25 }
  };
  
  const pricing = fabricPricing[fabricType];
  if (!pricing) {
    console.warn(`⚠️ [ORDER-AI-CORE] No pricing found for premium fabric: ${fabricType}`);
    return 0;
  }
  
  // Return appropriate price based on quantity tier
  if (quantity >= 10000) return pricing.price10000;
  if (quantity >= 2880) return pricing.price2880;
  if (quantity >= 1152) return pricing.price1152;
  if (quantity >= 576) return pricing.price576;
  if (quantity >= 144) return pricing.price144;
  return pricing.price48;
}

/**
 * Get premium closure pricing for fallback calculations
 */
function getFallbackClosurePrice(closureType: string, quantity: number): number {
  const closurePricing = { price48: 0.5, price144: 0.4, price576: 0.3, price1152: 0.25, price2880: 0.2, price10000: 0.15 };
  
  // Return appropriate price based on quantity tier
  if (quantity >= 10000) return closurePricing.price10000;
  if (quantity >= 2880) return closurePricing.price2880;
  if (quantity >= 1152) return closurePricing.price1152;
  if (quantity >= 576) return closurePricing.price576;
  if (quantity >= 144) return closurePricing.price144;
  return closurePricing.price48;
}

/**
 * Get mold charge for fallback calculations (one-time cost)
 */
function getFallbackMoldCharge(size: string): number {
  const moldCharges = {
    'Small': 40,
    'Medium': 60,
    'Large': 80
  };
  
  return moldCharges[size as keyof typeof moldCharges] || moldCharges.Medium;
}

/**
 * Calculate precise order estimate with message context for enhanced feature detection
 */
export async function calculatePreciseOrderEstimateWithMessage(requirements: OrderRequirements, message: string) {
  console.log('🗺 [ORDER-AI-CORE] Calculating with message context:', message.substring(0, 100));
  
  // Re-parse requirements from the full message context to catch any missed details
  const enhancedRequirements = parseOrderRequirements(message);
  
  console.log('🎯 [ORDER-AI-CORE] Enhanced requirements with proper logo defaults:', {
    originalLogoSize: requirements.logoSize,
    enhancedLogoSize: enhancedRequirements.logoSize,
    logoPosition: enhancedRequirements.logoPosition,
    logoApplication: enhancedRequirements.logoApplication,
    logoType: enhancedRequirements.logoType
  });
  
  // Merge the original requirements with enhanced parsing, preferring enhanced for logo detection
  const finalRequirements = {
    ...requirements,
    logoType: enhancedRequirements.logoType, // Use enhanced logo detection
    logoSize: enhancedRequirements.logoSize,
    profile: enhancedRequirements.profile,
    billStyle: enhancedRequirements.billStyle,
    panelCount: enhancedRequirements.panelCount,
    closureType: enhancedRequirements.closureType,
    color: enhancedRequirements.color || requirements.color // Keep original if no color detected
  };
  
  console.log('🔄 [ORDER-AI-CORE] Enhanced requirements:', {
    original: {
      logoType: requirements.logoType,
      logoSize: requirements.logoSize
    },
    enhanced: {
      logoType: finalRequirements.logoType,
      logoSize: finalRequirements.logoSize,
      profile: finalRequirements.profile,
      billStyle: finalRequirements.billStyle
    }
  });
  
  return calculatePreciseOrderEstimate(finalRequirements);
}

/**
 * Get optimal cap for budget
 */
export function getOptimalCapForBudget(requirements: OrderRequirements, budget: number) {
  return {
    name: "Standard Baseball Cap",
    tier: "Tier 1",
    description: "High-quality structured cap with flat bill"
  };
}

/**
 * Check if message needs budget focused response
 */
/**
 * @deprecated LEGACY FUNCTION - No longer used in unified AI system
 * Hardcoded pattern matching prevents natural conversation flow
 * GPT-4o now handles all classification intelligently with conversation context
 */
export function needsBudgetFocusedResponse(message: string): boolean {
  console.warn('⚠️ [DEPRECATED] needsBudgetFocusedResponse() - Use unified AI response instead');
  const lowerMessage = message.toLowerCase();
  return lowerMessage.includes('budget') || 
         lowerMessage.includes('maximum') || 
         lowerMessage.includes('most caps') ||
         /\$\d+/.test(message);
}

/**
 * @deprecated LEGACY FUNCTION - No longer used in unified AI system
 * THIS FUNCTION BROKE CONVERSATION FLOW: "yes create order" didn't match hardcoded patterns
 * GPT-4o now understands ANY variation naturally with conversation context
 */
export function isOrderProgressionMessage(message: string): boolean {
  console.warn('⚠️ [DEPRECATED] isOrderProgressionMessage() - Use unified AI response instead');
  const lowerMessage = message.toLowerCase();
  
  // This rigid pattern matching caused the conversation flow issue:
  // User: "yes create order" -> Didn't match -> Fell through to generic response
  return (lowerMessage.includes('create my order') ||
          lowerMessage.includes('proceed with order') ||
          lowerMessage.includes('finalize order') ||
          lowerMessage.includes('confirm order') ||
          lowerMessage.includes('yes, create') ||
          lowerMessage.includes('go ahead') ||
          lowerMessage.includes('proceed with this')) && 
          !lowerMessage.includes('want to place') && // Exclude initial requests
          !lowerMessage.includes('i want to') && // Exclude initial requests  
          !lowerMessage.includes('let me know'); // Exclude quote requests
}

/**
 * @deprecated LEGACY FUNCTION - No longer used in unified AI system
 * Hardcoded patterns can't handle natural language variations
 * GPT-4o now processes all follow-up responses with full context understanding
 */
export function isFollowUpResponse(message: string): boolean {
  console.warn('⚠️ [DEPRECATED] isFollowUpResponse() - Use unified AI response instead');
  const lowerMessage = message.toLowerCase();
  return lowerMessage.includes('add') ||
         lowerMessage.includes('change') ||
         lowerMessage.includes('modify') ||
         lowerMessage.includes('adjust') ||
         lowerMessage.includes('instead of') ||
         lowerMessage.includes('not') ||
         lowerMessage.includes('want') && (lowerMessage.includes('6') || lowerMessage.includes('panel')) ||
         /^(\d+)/.test(lowerMessage) ||
         // Cap specification changes
         lowerMessage.includes('panel') ||
         lowerMessage.includes('profile') ||
         lowerMessage.includes('bill') ||
         lowerMessage.includes('curved') ||
         lowerMessage.includes('flat') ||
         lowerMessage.includes('closure') ||
         lowerMessage.includes('fabric') ||
         lowerMessage.includes('style');
}

/**
 * Parse accessory preferences
 */
export function parseAccessoryPreferences(message: string) {
  const lowerMessage = message.toLowerCase();
  
  return {
    wantsAccessories: lowerMessage.includes('accessories') || lowerMessage.includes('add'),
    skipAccessories: lowerMessage.includes('basic') || lowerMessage.includes('simple'),
    proceedToOrder: lowerMessage.includes('create') || lowerMessage.includes('proceed')
  };
}

/**
 * Generate comprehensive budget-friendly quote with all defaults applied
 */
export function generateBudgetFriendlyQuote(requirements: OrderRequirements): {
  specifications: any;
  logoSetup: any;
  deliveryOptions: any;
  accessorySuggestions: any;
  budgetOptimizations: string[];
} {
  const deliveryOptions = getDeliveryMethodSuggestions(requirements.quantity);
  const accessorySuggestions = getBudgetFriendlyAccessorySuggestions();
  
  return {
    specifications: {
      panelCount: requirements.panelCount || 6,
      profile: requirements.profile || "High",
      structure: requirements.structure || "Structured",
      closure: requirements.closureType || "snapback",
      fabricType: requirements.fabricType || "Chino Twill",
      stitching: requirements.stitching || "Matching",
      billStyle: requirements.billStyle || "Flat Bill"
    },
    logoSetup: requirements.multiLogoSetup || {
      front: { type: "3D Embroidery", size: "Large", application: "Direct" },
      right: { type: "Embroidery", size: "Small", application: "Direct" },
      left: { type: "Embroidery", size: "Small", application: "Direct" },
      back: { type: "Embroidery", size: "Small", application: "Direct" },
      upperBill: { type: "Embroidery", size: "Medium", application: "Direct" },
      underBill: { type: "Sublimated Print", size: "Large", application: "Direct" }
    },
    deliveryOptions,
    accessorySuggestions,
    budgetOptimizations: [
      "6-Panel design for cost-effective manufacturing",
      "Structured cap with high-quality appearance",
      "Snapback closure - popular and budget-friendly",
      "Chino Twill fabric - durable and economical",
      "Matching stitching for professional look",
      "Multi-position logo setup for maximum brand exposure",
      requirements.quantity >= 3168 
        ? "Large quantity qualifies for freight shipping discounts" 
        : "Consider increasing to 3168+ caps for freight shipping savings"
    ]
  };
}