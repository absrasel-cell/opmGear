/**
 * Order AI Core Functions
 * Core logic for parsing order requirements and optimizing quantities
 */

// AI-SPECIFIC PRICING IMPORTS - ONLY uses /ai/Options/ CSV files
import {
  getAIAccessoryPrice,
  getAILogoPrice,
  getAIClosurePrice,
  getAIFabricPrice,
  getAIDeliveryPrice,
  getAIBlankCapPrice
} from '@/lib/ai-pricing-service';

// Import business rules and knowledge base functions
import { 
  BUSINESS_RULES,
  detectFabricFromText,
  detectClosureFromText,
  detectAccessoriesFromText,
  detectSizeFromText,
  detectAllLogosFromText,
  CostingContext
} from '@/lib/costing-knowledge-base';

// Import unified costing service
// import { calculateQuickEstimate } from '@/lib/unified-costing-service'; // Using local implementation instead

export interface OrderRequirements {
  quantity: number;
  logoType: string;
  logoPosition?: string;
  logoSize?: string;
  logoApplication?: string; // Add application method
  color?: string;
  capSize?: string; // Add cap size field
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

/**
 * Determine the correct product tier based on cap specifications
 * Based on Customer Products CSV data:
 * - Tier 1: 4-Panel, 5-Panel, 6-Panel curved caps (most affordable)
 * - Tier 2: 6-Panel flat caps (premium options)  
 * - Tier 3: 7-Panel caps (specialty caps)
 */
function determineProductTier(requirements: OrderRequirements): string {
  // If panelCount is explicitly provided, use it directly
  if (requirements.panelCount) {
    if (requirements.panelCount === 7) return 'Tier 3';
    if (requirements.panelCount === 6 && requirements.billStyle?.toLowerCase().includes('flat')) return 'Tier 2';
    return 'Tier 1'; // 4-Panel, 5-Panel, 6-Panel curved
  }
  
  // If no panelCount, try to detect from other fields (fallback logic)
  // Check bill style for 7-panel indicators (7-panel caps are often flat billed)
  if (requirements.billStyle?.toLowerCase().includes('7') || 
      requirements.structure?.toLowerCase().includes('7') ||
      requirements.fabricType?.toLowerCase().includes('7')) {
    return 'Tier 3';
  }
  
  // Check for 6-panel flat cap indicators
  if (requirements.billStyle?.toLowerCase().includes('flat') && 
      (requirements.panelCount === 6 || requirements.structure?.toLowerCase().includes('6'))) {
    return 'Tier 2';
  }
  
  // Default to Tier 1 (most affordable - 4/5/6-panel curved)
  return 'Tier 1';
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
  
  // Extract quantity - FIXED: Better parsing with priority for direct patterns
  let quantity = 150; // Default fallback
  
  // 1. First priority: explicit "total" mentions
  const totalMatch = message.match(/(\d+,?\d*)\s*(?:caps?\s*)?total/i);
  if (totalMatch) {
    const totalStr = totalMatch[1].replace(/,/g, '');
    quantity = parseInt(totalStr);
    console.log('🎯 [ORDER-AI-CORE] Total quantity override detected:', quantity);
  } 
  // 2. Second priority: Direct quantity patterns (most common case)
  else {
    const directQuantityMatch = message.match(/(\d+,?\d*)\s*(?:pcs?|caps?|pieces?|units?)/i);
    if (directQuantityMatch) {
      const quantityStr = directQuantityMatch[1].replace(/,/g, '');
      quantity = parseInt(quantityStr);
      console.log('🎯 [ORDER-AI-CORE] Direct quantity detected:', quantity);
    }
    // 3. Third priority: Loose pattern for cases like "288 blank caps"
    else {
      const looseQuantityMatch = message.match(/(\d+,?\d*)\s+(?:blank\s+)?caps?/i);
      if (looseQuantityMatch) {
        const quantityStr = looseQuantityMatch[1].replace(/,/g, '');
        quantity = parseInt(quantityStr);
        console.log('🎯 [ORDER-AI-CORE] Loose quantity detected:', quantity);
      }
      // 4. MULTI-COLOR ORDERS: Only check if no direct pattern found
      else {
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
  
  // Check for blank caps first - if customer explicitly asks for "blank caps", no logo needed
  const isBlankCapRequest = lowerMessage.includes('blank cap') || lowerMessage.includes('blank caps');
  
  // Use enhanced multi-logo detection from knowledge base only if not blank caps
  let logoType = "None"; // Default to no logo
  let logoDetectionResult = { primaryLogo: null, allLogos: [], multiLogoSetup: null };
  
  if (!isBlankCapRequest) {
    logoDetectionResult = detectAllLogosFromText(message);
    logoType = logoDetectionResult.primaryLogo || "3D Embroidery";
    
    // SPECIAL CASE: Map 3D Embroidery to complex logo setup
    // NOTE: This will be overridden by the multiLogoSetup logic later, but kept for backward compatibility
    if (logoType === "3D Embroidery") {
      logoType = "Medium Size Embroidery + 3D Embroidery"; // Use Medium as default, will be adjusted by size detection
    }
  }
  
  console.log('🎯 [ORDER-AI-CORE] Logo detection:', {
    isBlankCapRequest,
    logoType,
    detectedPrimaryLogo: logoDetectionResult.primaryLogo
  });
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
  
  if (logoType !== "None" && !isBlankCapRequest) {
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
  // Check for specific panel mentions first (order matters - check 7 first)
  if (lowerMessage.includes('7 panel') || lowerMessage.includes('7-panel')) {
    panelCount = 7;
  } else if (lowerMessage.includes('6 panel') || lowerMessage.includes('6-panel')) {
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
  const logoApplication = getDefaultApplication(logoType);
  
  // Detect cap size from message, default to "7 1/4" if not specified
  const detectCapSize = (text: string): string => {
    const sizePatterns = [
      // Hat size patterns
      /\b([67](?:\s+\d+\/\d+|\.\d+)?)\b.*(?:hat|cap|size)/i,
      /(?:hat|cap|size).*?\b([67](?:\s+\d+\/\d+|\.\d+)?)\b/i,
      /\bsize\s*([67](?:\s+\d+\/\d+|\.\d+)?)\b/i,
      /\b([67]\s*\d+\/\d+)\s*(?:hat|cap|size|fitted)/i,
      // CM patterns
      /(\d{2})\s*cm/i,
      /(\d{2}\s*-\s*\d{2})\s*cm/i,
      // Direct size mentions
      /\b(small|medium|large)\s*(?:hat|cap|size)/i
    ];
    
    for (const pattern of sizePatterns) {
      const match = text.match(pattern);
      if (match) {
        const size = match[1].trim();
        // Convert common variations to standard format
        if (size.toLowerCase() === 'medium' || size === '57' || size === '58') return '7 1/4';
        if (size.toLowerCase() === 'small') return '7';
        if (size.toLowerCase() === 'large') return '7 1/2';
        return size;
      }
    }
    return '7 1/4'; // Default size for most adults
  };
  
  const capSize = detectCapSize(message);
  
  return {
    quantity,
    logoType,
    logoPosition,
    logoSize,
    logoApplication, // Add application method
    color,
    capSize, // Add cap size
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
 * Optimize quantity for budget (simple version) - now async to use CSV data
 */
export async function optimizeQuantityForBudget(budget: number, logoType: string) {
  // Start with a rough estimate and iterate to find optimal quantity
  let bestQuantity = 0;
  let bestCostPerUnit = 0;
  let bestTotalCost = 0;
  
  // Test different quantity levels to find the best fit within budget
  const testQuantities = [48, 144, 576, 1152, 2880, 10000];
  
  for (const qty of testQuantities) {
    const basePrice = await getBasePriceForQuantity(qty, 'Tier 1'); // Use default tier for budget optimization
    const logoSetupCost = logoType === "3D Embroidery" ? 100 : 
                         logoType === "None" ? 0 : 50;
    // Use proper CSV delivery pricing
    const { calculateDeliveryUnitPrice } = await import('@/lib/pricing-server');
    const deliveryUnitPrice = await calculateDeliveryUnitPrice(qty, 'regular');
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
      logoApplication: getDefaultApplication(logoType),
      capSize: '7 1/4', // Default cap size
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
      application: requirements.logoApplication || getDefaultApplication(requirements.logoType)
    }] : undefined;

    const costingContext: CostingContext = {
      quantity: requirements.quantity,
      logoSetup,
      fabricType: requirements.fabricType,
      closureType: requirements.closureType,
      deliveryMethod: requirements.deliveryMethod || 'regular',
      productTier: determineProductTier(requirements) // Use dynamic tier detection
    };

    // Use unified quick estimate
    const estimate = await calculateQuickEstimate(costingContext);
    
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
    
    // Fallback to simple calculation with correct tier using CSV data
    const productTier = determineProductTier(requirements);
    const basePrice = await getBasePriceForQuantity(requirements.quantity, productTier);
    
    // Calculate logo cost from CSV instead of hardcoded values
    let logoSetupCost = 0;
    if (requirements.logoType && requirements.logoType !== "None") {
      const logoSize = requirements.logoSize || 'Medium';
      logoSetupCost = await getPriceForLogoQuantity(`${logoSize} ${requirements.logoType}`, requirements.quantity) * requirements.quantity;
    }
    
    // Calculate delivery cost from CSV
    const { calculateDeliveryUnitPrice } = await import('@/lib/pricing-server');
    const deliveryUnitPrice = await calculateDeliveryUnitPrice(requirements.quantity, requirements.deliveryMethod || 'regular');
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
 * Calculate precise order estimate using AI-SPECIFIC pricing from /ai/Options/ CSV files
 */
export async function calculatePreciseOrderEstimate(requirements: OrderRequirements, originalMessage?: string) {
  console.log('🧮 [ORDER-AI-CORE] Calculating precise estimate using AI-SPECIFIC pricing for:', {
    quantity: requirements.quantity,
    logoType: requirements.logoType,
    logoSize: requirements.logoSize,
    color: requirements.color,
    profile: requirements.profile,
    billStyle: requirements.billStyle,
    panelCount: requirements.panelCount,
    closureType: requirements.closureType,
    fabricType: requirements.fabricType,
    hasOriginalMessage: !!originalMessage
  });
  
  try {
    // 1. Calculate blank cap cost using Customer Products.csv lookup
    const productTier = determineProductTier(requirements);
    
    // Build product description for Customer Products.csv matching
    let productDescription = '';
    if (originalMessage) {
      // Use the original message for best product matching
      productDescription = originalMessage;
    } else {
      // Build description from requirements
      const parts = [];
      if (requirements.fabricType) parts.push(requirements.fabricType);
      if (requirements.profile) parts.push(`${requirements.profile} Profile`);
      if (requirements.billStyle) parts.push(requirements.billStyle);
      if (requirements.panelCount) parts.push(`${requirements.panelCount}-Panel`);
      if (requirements.structure) parts.push(requirements.structure);
      if (requirements.closureType) parts.push(requirements.closureType);
      productDescription = parts.join(' ');
    }
    
    console.log(`🔍 [AI-PRICING] Using product description for tier lookup: "${productDescription}"`);
    
    const blankCapUnitPrice = await getAIBlankCapPrice(productTier, requirements.quantity, productDescription);
    const baseProductTotal = blankCapUnitPrice * requirements.quantity;
    
    console.log(`🧢 [AI-PRICING] Blank caps (${productTier}): $${blankCapUnitPrice} x ${requirements.quantity} = $${baseProductTotal}`);
    
    // 2. Calculate logo costs
    let logoSetupTotal = 0;
    let moldChargeTotal = 0;
    const logoBreakdown = [];
    
    if (requirements.multiLogoSetup && requirements.logoType !== "None") {
      // Multi-logo setup
      for (const [position, config] of Object.entries(requirements.multiLogoSetup)) {
        const { unitPrice, moldCharge } = await getAILogoPrice(
          config.type, 
          config.size, 
          config.application, 
          requirements.quantity
        );
        const logoCost = unitPrice * requirements.quantity;
        logoSetupTotal += logoCost;
        moldChargeTotal += moldCharge;
        
        logoBreakdown.push({
          position: position,
          type: config.type,
          size: config.size,
          application: config.application,
          unitPrice: unitPrice,
          totalCost: logoCost,
          moldCharge: moldCharge
        });
      }
    } else if (requirements.logoType !== "None") {
      // Single logo setup
      const size = requirements.logoSize || getDefaultLogoSize(requirements.logoPosition || 'Front');
      const application = requirements.logoApplication || getDefaultApplication(requirements.logoType);
      
      const { unitPrice, moldCharge } = await getAILogoPrice(
        requirements.logoType, 
        size, 
        application, 
        requirements.quantity
      );
      const logoCost = unitPrice * requirements.quantity;
      logoSetupTotal += logoCost;
      moldChargeTotal += moldCharge;
      
      logoBreakdown.push({
        position: requirements.logoPosition || 'Front',
        type: requirements.logoType,
        size: size,
        application: application,
        unitPrice: unitPrice,
        totalCost: logoCost,
        moldCharge: moldCharge
      });
    }
    
    console.log(`🎨 [AI-PRICING] Logo setup total: $${logoSetupTotal}, Mold charges: $${moldChargeTotal}`);
    
    // 3. Calculate premium fabric cost
    let premiumFabricTotal = 0;
    let fabricUnitPrice = 0;
    if (requirements.fabricType && !['Chino Twill', 'Trucker Mesh', 'Micro Mesh', 'Cotton Polyester Mix', 'Polyester', 'Ripstop'].includes(requirements.fabricType)) {
      fabricUnitPrice = await getAIFabricPrice(requirements.fabricType, requirements.quantity);
      premiumFabricTotal = fabricUnitPrice * requirements.quantity;
      console.log(`🧵 [AI-PRICING] Premium fabric (${requirements.fabricType}): $${fabricUnitPrice} x ${requirements.quantity} = $${premiumFabricTotal}`);
    }
    
    // 4. Calculate premium closure cost
    let closureTotal = 0;
    let closureUnitPrice = 0;
    if (requirements.closureType && !['Snapback', 'Velcro'].includes(requirements.closureType)) {
      closureUnitPrice = await getAIClosurePrice(requirements.closureType, requirements.quantity);
      closureTotal = closureUnitPrice * requirements.quantity;
      console.log(`🔒 [AI-PRICING] Premium closure (${requirements.closureType}): $${closureUnitPrice} x ${requirements.quantity} = $${closureTotal}`);
    }
    
    // 5. Calculate accessories cost
    let accessoriesTotal = 0;
    const accessoriesBreakdown = [];
    if (requirements.accessories && requirements.accessories.length > 0) {
      for (const accessory of requirements.accessories) {
        const unitPrice = await getAIAccessoryPrice(accessory, requirements.quantity);
        const accessoryCost = unitPrice * requirements.quantity;
        accessoriesTotal += accessoryCost;
        
        accessoriesBreakdown.push({
          name: accessory,
          unitPrice: unitPrice,
          totalCost: accessoryCost
        });
      }
      console.log(`🎁 [AI-PRICING] Accessories total: $${accessoriesTotal}`);
    }
    
    // 6. Calculate delivery cost
    const deliveryMethod = requirements.deliveryMethod || 'Regular Delivery';
    const deliveryUnitPrice = await getAIDeliveryPrice(deliveryMethod, requirements.quantity);
    const deliveryTotal = deliveryUnitPrice * requirements.quantity;
    console.log(`🚚 [AI-PRICING] Delivery (${deliveryMethod}): $${deliveryUnitPrice} x ${requirements.quantity} = $${deliveryTotal}`);
    
    // 7. Calculate total
    const totalCost = baseProductTotal + logoSetupTotal + moldChargeTotal + premiumFabricTotal + closureTotal + accessoriesTotal + deliveryTotal;
    
    // DEBUGGING: Calculate total cost per cap for clarity
    const totalBlankCapCost = baseProductTotal + premiumFabricTotal;
    const totalBlankCapUnitPrice = totalBlankCapCost / requirements.quantity;
    
    console.log('🚨 [AI-PRICING] BLANK CAP BREAKDOWN:');
    console.log(`   Base cap price: $${blankCapUnitPrice} × ${requirements.quantity} = $${baseProductTotal}`);
    console.log(`   Premium fabric: $${fabricUnitPrice} × ${requirements.quantity} = $${premiumFabricTotal}`);
    console.log(`   TOTAL BLANK CAPS: $${totalBlankCapUnitPrice} × ${requirements.quantity} = $${totalBlankCapCost}`);
    console.log('💰 [AI-PRICING] FINAL BREAKDOWN:', {
      baseProductTotal: baseProductTotal,
      logoSetupTotal: logoSetupTotal,
      moldChargeTotal: moldChargeTotal,
      premiumFabricTotal: premiumFabricTotal,
      closureTotal: closureTotal,
      accessoriesTotal: accessoriesTotal,
      deliveryTotal: deliveryTotal,
      totalCost: totalCost,
      costPerUnit: totalCost / requirements.quantity
    });
    
    return {
      costBreakdown: {
        baseProductTotal: baseProductTotal,
        logoSetupTotal: logoSetupTotal,
        deliveryTotal: deliveryTotal,
        accessoriesTotal: accessoriesTotal,
        closureTotal: closureTotal,
        moldChargeTotal: moldChargeTotal,
        servicesTotal: 0,
        premiumFabricTotal: premiumFabricTotal,
        totalCost: totalCost,
        // Detailed breakdown for AI responses
        detailedBreakdown: {
          blankCaps: { unitPrice: blankCapUnitPrice, total: baseProductTotal },
          logos: logoBreakdown,
          accessories: accessoriesBreakdown,
          delivery: { unitPrice: deliveryUnitPrice, total: deliveryTotal },
          premiumFabric: { unitPrice: fabricUnitPrice, total: premiumFabricTotal },
          premiumClosure: { unitPrice: closureUnitPrice, total: closureTotal }
        }
      },
      orderEstimate: {
        quantity: requirements.quantity,
        costPerUnit: totalCost / requirements.quantity,
        totalCost: totalCost
      }
    };
  } catch (error) {
    console.error('❌ [AI-PRICING] Error in AI-specific pricing calculation:', error);
    
    // Simple fallback with basic estimates
    const fallbackTotal = requirements.quantity * 8.0; // Basic fallback
    return {
      costBreakdown: {
        baseProductTotal: fallbackTotal,
        logoSetupTotal: 0,
        deliveryTotal: 0,
        accessoriesTotal: 0,
        closureTotal: 0,
        moldChargeTotal: 0,
        servicesTotal: 0,
        premiumFabricTotal: 0,
        totalCost: fallbackTotal
      },
      orderEstimate: {
        quantity: requirements.quantity,
        costPerUnit: fallbackTotal / requirements.quantity,
        totalCost: fallbackTotal
      }
    };
  }
}

/**
 * Enhanced fallback calculation when API is unavailable - includes premium costs
 * Now uses live CSV data instead of hardcoded pricing
 */
async function calculateEnhancedFallbackEstimate(requirements: OrderRequirements) {
  const productTier = determineProductTier(requirements);
  const basePrice = await getBasePriceForQuantity(requirements.quantity, productTier);
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
      // Calculate cost for each logo position using CSV data
      for (const [position, config] of Object.entries(requirements.multiLogoSetup)) {
        const logoUnitPrice = await getPriceForLogoQuantity(`${config.size} ${config.type}`, requirements.quantity);
        const logoCost = logoUnitPrice * requirements.quantity;
        
        logoSetupCosts.push({
          name: `${config.size} ${config.type}`,
          cost: logoCost,
          unitPrice: logoUnitPrice,
          details: `${config.size} ${config.type} on ${position.charAt(0).toUpperCase() + position.slice(1)}`
        });
        logoSetupCost += logoCost;
      }
    } else {
      // Single logo calculation using CSV data
      const size = requirements.logoSize || 'Medium';
      const logoUnitPrice = await getPriceForLogoQuantity(`${size} ${requirements.logoType}`, requirements.quantity);
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
    const fabricUnitPrice = await getFabricPriceFromCSV(requirements.fabricType, requirements.quantity);
    premiumFabricTotal = fabricUnitPrice * requirements.quantity;
    
    premiumFabricCosts.push({
      name: requirements.fabricType,
      cost: premiumFabricTotal,
      unitPrice: fabricUnitPrice
    });
    totalCost += premiumFabricTotal;
    
    console.log('🔧 [ENHANCED-FALLBACK] Added premium fabric cost from CSV:', {
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
    const closureUnitPrice = await getClosurePriceFromCSV(requirements.closureType, requirements.quantity);
    closureTotal = closureUnitPrice * requirements.quantity;
    
    closureCosts.push({
      name: requirements.closureType.charAt(0).toUpperCase() + requirements.closureType.slice(1),
      cost: closureTotal,
      unitPrice: closureUnitPrice
    });
    totalCost += closureTotal;
    
    console.log('🔧 [ENHANCED-FALLBACK] Added premium closure cost from CSV:', {
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
    const moldCharge = await getMoldChargeFromCSV(requirements.logoType, size);
    moldChargeTotal = moldCharge;
    
    moldChargeCosts.push({
      name: `${size} Mold Charge (${requirements.logoType})`,
      cost: moldCharge,
      unitPrice: moldCharge, // One-time charge
      waived: false
    });
    totalCost += moldChargeTotal;
    
    console.log('🔧 [ENHANCED-FALLBACK] Added mold charge from CSV:', {
      logoType: requirements.logoType,
      size: size,
      moldCharge
    });
  }

  // Delivery cost calculation using server-side CSV pricing
  const { calculateDeliveryUnitPrice } = await import('@/lib/pricing-server');
  const deliveryUnitPrice = await calculateDeliveryUnitPrice(requirements.quantity, requirements.deliveryMethod || 'regular');
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
        blankCaps: { unitPrice: basePrice, total: baseProductTotal },
        logos: logoSetupCosts.map(logo => ({
          position: logo.details?.split(' on ')[1] || 'Front',
          type: logo.name,
          size: logo.name.split(' ')[0],
          application: 'Direct',
          unitPrice: logo.unitPrice,
          totalCost: logo.cost,
          moldCharge: 0
        })),
        accessories: [], // Empty for fallback
        delivery: { unitPrice: deliveryUnitPrice, total: deliveryCost },
        premiumFabric: premiumFabricCosts.length > 0 ? { 
          unitPrice: premiumFabricCosts[0]?.unitPrice || 0, 
          total: premiumFabricTotal 
        } : null,
        premiumClosure: closureCosts.length > 0 ? { 
          unitPrice: closureCosts[0]?.unitPrice || 0, 
          total: closureTotal 
        } : null
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
async function calculateBasicEstimate(requirements: OrderRequirements) {
  return await calculateEnhancedFallbackEstimate(requirements);
}

/**
 * Get base price based on quantity tiers and product tier (uses live CSV pricing)
 */
async function getBasePriceForQuantity(quantity: number, productTier: string = 'Tier 1'): Promise<number> {
  try {
    const { calculateUnitPrice } = await import('@/lib/pricing-server');
    return await calculateUnitPrice(quantity, productTier);
  } catch (error) {
    console.error(`❌ [ORDER-AI-CORE] Error loading base price from CSV for ${productTier}:`, error);
    return 0; // Return 0 to indicate error
  }
}

/**
 * Get logo pricing for specific quantity using live CSV data
 * REMOVED: All hardcoded pricing - now loads exclusively from CSV files
 */
async function getPriceForLogoQuantity(logoType: string, quantity: number): Promise<number> {
  try {
    const { loadCustomizationPricing, getPriceForQuantityFromCSV } = await import('@/lib/pricing-server');
    const customizationPricing = await loadCustomizationPricing();
    
    // Find pricing for the logo type from CSV
    const logoPricing = customizationPricing.find(p => 
      p.type === 'logos' && p.Name === logoType
    );
    
    if (!logoPricing) {
      console.warn(`⚠️ [ORDER-AI-CORE] No CSV pricing found for logo type: ${logoType}`);
      return 0; // Return 0 to indicate pricing not available
    }
    
    return getPriceForQuantityFromCSV(logoPricing, quantity);
  } catch (error) {
    console.error(`❌ [ORDER-AI-CORE] Error loading logo pricing from CSV for ${logoType}:`, error);
    return 0; // Return 0 to indicate error
  }
}

/**
 * Get premium fabric pricing from CSV data
 * REMOVED: All hardcoded pricing - now loads exclusively from CSV files
 */
async function getFabricPriceFromCSV(fabricType: string, quantity: number): Promise<number> {
  try {
    const { loadFabricPricing, getPriceForQuantityFromCSV } = await import('@/lib/pricing-server');
    const fabricPricing = await loadFabricPricing();
    
    // Find pricing for the fabric type from CSV
    const fabric = fabricPricing.find(f => f.Name === fabricType);
    
    if (!fabric) {
      console.warn(`⚠️ [ORDER-AI-CORE] No CSV pricing found for fabric: ${fabricType}`);
      return 0; // Return 0 to indicate pricing not available
    }
    
    return getPriceForQuantityFromCSV(fabric, quantity);
  } catch (error) {
    console.error(`❌ [ORDER-AI-CORE] Error loading fabric pricing from CSV for ${fabricType}:`, error);
    return 0; // Return 0 to indicate error
  }
}

/**
 * Get premium closure pricing from CSV data
 * REMOVED: All hardcoded pricing - now loads exclusively from CSV files
 */
async function getClosurePriceFromCSV(closureType: string, quantity: number): Promise<number> {
  try {
    const { loadClosurePricing, getPriceForQuantityFromCSV } = await import('@/lib/pricing-server');
    const closurePricing = await loadClosurePricing();
    
    // Find pricing for the closure type from CSV
    const closure = closurePricing.find(c => c.Name === closureType);
    
    if (!closure) {
      console.warn(`⚠️ [ORDER-AI-CORE] No CSV pricing found for closure: ${closureType}`);
      return 0; // Return 0 to indicate pricing not available
    }
    
    return getPriceForQuantityFromCSV(closure, quantity);
  } catch (error) {
    console.error(`❌ [ORDER-AI-CORE] Error loading closure pricing from CSV for ${closureType}:`, error);
    return 0; // Return 0 to indicate error
  }
}

/**
 * Get mold charge from CSV data (one-time cost)
 * REMOVED: All hardcoded pricing - now loads exclusively from CSV files
 */
async function getMoldChargeFromCSV(logoType: string, size: string): Promise<number> {
  try {
    // For now, we'll check the logo type and size to determine if mold charge applies
    // This should be loaded from a mold charges CSV or included in customization CSV
    if (logoType.includes('Rubber Patch') || logoType.includes('Leather Patch')) {
      // For now, return 0 and log a warning - this needs to be implemented with proper CSV
      console.warn(`⚠️ [ORDER-AI-CORE] Mold charge calculation needs CSV implementation for ${logoType} ${size}`);
      return 0;
    }
    return 0;
  } catch (error) {
    console.error(`❌ [ORDER-AI-CORE] Error calculating mold charge for ${logoType} ${size}:`, error);
    return 0;
  }
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
  
  return calculatePreciseOrderEstimate(finalRequirements, message);
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