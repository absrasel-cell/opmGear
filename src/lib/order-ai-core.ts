/**
 * Order AI Core Functions
 * Core logic for parsing order requirements and optimizing quantities
 */

import { getBaseProductPricing, calculateUnitPrice, calculateDeliveryUnitPrice } from '@/lib/pricing';

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
 * Parse order requirements from user message with enhanced CSV-based detection and budget-friendly defaults
 */
export function parseOrderRequirements(message: string): OrderRequirements {
  const lowerMessage = message.toLowerCase();
  
  // Extract quantity - Enhanced to handle multiple sizes and sum totals
  // Special handling for "total" mentions first (highest priority)
  const totalMatch = message.match(/(\d+,?\d*)\s*(?:caps?\s*)?total/i);
  let quantity = 150; // Default fallback
  
  if (totalMatch) {
    const totalStr = totalMatch[1].replace(/,/g, '');
    quantity = parseInt(totalStr);
    console.log('🎯 [ORDER-AI-CORE] Total quantity override detected:', quantity);
  } else {
    // Look for size-based breakdowns (like "Small: 50, Medium: 100, Large: 150")
    const sizeBreakdownMatches = message.match(/(small|medium|large)\s*:?\s*(\d+)/gi);
    
    if (sizeBreakdownMatches && sizeBreakdownMatches.length > 1) {
      // Multiple size breakdowns found - sum them all
      const quantities = sizeBreakdownMatches
        .map(match => {
          const num = match.match(/(\d+)/)[1];
          return parseInt(num);
        })
        .filter(num => !isNaN(num));
      
      quantity = quantities.reduce((total, qty) => total + qty, 0);
      console.log('🧮 [ORDER-AI-CORE] Size breakdown quantities detected:', quantities, 'Total:', quantity);
    } else {
      // Look for multiple individual quantity mentions
      const allQuantityMatches = message.match(/(\d+)\s*(?:caps?|pieces?|units?|large|medium|small)/gi);
      
      if (allQuantityMatches && allQuantityMatches.length > 1) {
        // Multiple quantities found - sum them all
        const quantities = allQuantityMatches
          .map(match => {
            const num = match.match(/(\d+)/)[1];
            return parseInt(num);
          })
          .filter(num => !isNaN(num));
        
        quantity = quantities.reduce((total, qty) => total + qty, 0);
        console.log('🧮 [ORDER-AI-CORE] Multiple quantities detected:', quantities, 'Total:', quantity);
      } else {
        // Single quantity or fallback
        const singleMatch = message.match(/(\d+)\s*(?:caps?|pieces?|units?)/i);
        quantity = singleMatch ? parseInt(singleMatch[1]) : 150;
      }
    }
  }
  
  // Budget-friendly defaults for cap specifications
  let panelCount = 6; // Default: "6-Panel"
  let profile = "High"; // Default: "High" profile
  let structure = "Structured"; // Default: "Structured"
  let closureType = "snapback"; // Default: "Snapback"
  let fabricType = "Chino Twill"; // Default: "Chino Twill" for solid
  let stitching = "Matching"; // Default: "Matching" stitching
  let deliveryMethod = "regular"; // Default: Regular delivery
  
  // Enhanced logo type detection - Check for "no logos" first
  let logoType = "3D Embroidery"; // Default to front logo type
  let logoPosition = "Front"; // Default position
  let logoSize = "Large"; // Default to front logo size
  
  // Check for explicit "no logos" requests
  if (lowerMessage.includes('no logo') || 
      lowerMessage.includes('no decoration') || 
      lowerMessage.includes('without logo') || 
      lowerMessage.includes('plain cap') || 
      lowerMessage.includes('blank cap')) {
    logoType = "None";
    console.log('🚫 [ORDER-AI-CORE] No logos requested - setting logoType to None');
  }
  
  // Budget-friendly logo setup defaults (only if logos are wanted)
  let multiLogoSetup: any = null;
  
  if (logoType !== "None") {
    multiLogoSetup = {
      front: { type: "3D Embroidery", size: "Large", application: "Direct" },
      right: { type: "Embroidery", size: "Small", application: "Direct" },
      left: { type: "Embroidery", size: "Small", application: "Direct" },
      back: { type: "Embroidery", size: "Small", application: "Direct" },
      upperBill: { type: "Embroidery", size: "Medium", application: "Direct" },
      underBill: { type: "Sublimated Print", size: "Large", application: "Direct" }
    };
  }
  
  if (lowerMessage.includes('3d') || lowerMessage.includes('raised') || lowerMessage.includes('embroidery 3d')) {
    logoType = "3D Embroidery";
  } else if (lowerMessage.includes('rubber patch')) {
    // Detect rubber patch size
    if (lowerMessage.includes('small')) {
      logoType = "Small Rubber Patch";
      logoSize = "Small";
    } else if (lowerMessage.includes('large')) {
      logoType = "Large Rubber Patch";
      logoSize = "Large";
    } else {
      logoType = "Medium Rubber Patch";
      logoSize = "Medium";
    }
  } else if (lowerMessage.includes('leather patch')) {
    // Detect leather patch size
    if (lowerMessage.includes('small')) {
      logoType = "Small Leather Patch";
      logoSize = "Small";
    } else if (lowerMessage.includes('large')) {
      logoType = "Large Leather Patch";
      logoSize = "Large";
    } else {
      logoType = "Medium Leather Patch";
      logoSize = "Medium";
    }
  } else if (lowerMessage.includes('woven patch') || lowerMessage.includes('printed patch') || lowerMessage.includes('print patch')) {
    // Detect woven/printed patch size
    if (lowerMessage.includes('small')) {
      logoType = "Small Print Woven Patch";
      logoSize = "Small";
    } else if (lowerMessage.includes('large')) {
      logoType = "Large Print Woven Patch";
      logoSize = "Large";
    } else {
      logoType = "Medium Print Woven Patch";
      logoSize = "Medium";
    }
  } else if (lowerMessage.includes('patch')) {
    // Generic patch - default to medium rubber patch
    logoType = "Medium Rubber Patch";
    logoSize = "Medium";
  } else if (lowerMessage.includes('embroidery') || lowerMessage.includes('embroidered')) {
    // Detect embroidery size
    if (lowerMessage.includes('small')) {
      logoSize = "Small";
    } else if (lowerMessage.includes('large')) {
      logoSize = "Large";
    } else {
      logoSize = "Medium";
    }
    logoType = "Flat Embroidery"; // Will be processed as Size Embroidery in cost calc
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
  
  // Enhanced fabric type detection to include premium fabrics
  if (lowerMessage.includes('split') || lowerMessage.includes('trucker') || lowerMessage.includes('mesh')) {
    fabricType = "Chino Twill/Trucker Mesh";
  } else if (lowerMessage.includes('acrylic')) {
    fabricType = "Acrylic";
  } else if (lowerMessage.includes('suede cotton')) {
    fabricType = "Suede Cotton";
  } else if (lowerMessage.includes('genuine leather')) {
    fabricType = "Genuine Leather";
  } else if (lowerMessage.includes('air mesh')) {
    fabricType = "Air Mesh";
  } else if (lowerMessage.includes('camo')) {
    fabricType = "Camo";
  } else if (lowerMessage.includes('laser cut')) {
    fabricType = "Laser Cut";
  } else if (lowerMessage.includes('cotton') || lowerMessage.includes('polyester') || lowerMessage.includes('canvas')) {
    // Keep user-specified fabric if mentioned
    const fabricMatch = message.match(/\b(cotton|polyester|canvas|denim|wool)\b/i);
    if (fabricMatch) {
      fabricType = fabricMatch[1];
    }
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
  
  // Detect closure type for advanced product compatibility (override default only if specified)
  if (lowerMessage.includes('fitted')) {
    closureType = "fitted";
  } else if (lowerMessage.includes('adjustable') || lowerMessage.includes('buckle')) {
    closureType = "buckle";
  } else if (lowerMessage.includes('velcro')) {
    closureType = "velcro";
  } else if (lowerMessage.includes('flexfit')) {
    closureType = "flexfit";
  }
  // Note: snapback remains as default
  
  // Detect delivery method preferences and suggest cost-saving options
  if (lowerMessage.includes('air freight') || lowerMessage.includes('airfreight')) {
    deliveryMethod = "air-freight";
  } else if (lowerMessage.includes('sea freight') || lowerMessage.includes('seafreight') || lowerMessage.includes('ocean')) {
    deliveryMethod = "sea-freight";
  } else if (lowerMessage.includes('rush') || lowerMessage.includes('express') || lowerMessage.includes('urgent')) {
    deliveryMethod = "express";
  }
  // Note: regular delivery remains as default
  
  // Apply position-based size default and correct application method
  logoSize = getDefaultLogoSize(logoPosition);
  const logoApplication = getDefaultApplication(logoType);
  
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
 * Optimize quantity for budget (precise version) with message context
 */
export async function optimizeQuantityForBudgetPrecise(budget: number, logoType: string, message?: string) {
  console.log('🎯 [ORDER-AI-CORE] Optimizing budget with enhanced detection:', {
    budget,
    logoType,
    hasMessage: !!message
  });
  
  // If message provided, re-parse for more accurate logo type detection
  let enhancedLogoType = logoType;
  if (message) {
    const enhancedRequirements = parseOrderRequirements(message);
    enhancedLogoType = enhancedRequirements.logoType;
    
    console.log('🔄 [ORDER-AI-CORE] Enhanced logo type detection:', {
      original: logoType,
      enhanced: enhancedLogoType
    });
  }
  
  // Start with a rough estimate and iterate to find optimal quantity
  let bestQuantity = 0;
  let bestCostPerUnit = 0;
  let bestTotalCost = 0;
  let bestTierLevel = "Tier 1";
  
  // Test different quantity levels to find the best fit within budget
  const testQuantities = [48, 144, 576, 1152, 2880, 10000];
  
  for (const qty of testQuantities) {
    const basePrice = getBasePriceForQuantity(qty);
    
    // Enhanced logo setup cost calculation based on actual CSV pricing
    let logoSetupCost = 0;
    if (enhancedLogoType === "3D Embroidery") {
      // 3D Embroidery: Size Embroidery + 3D base cost
      logoSetupCost = getPriceForLogoQuantity('Medium Size Embroidery', qty) * qty +
                      getPriceForLogoQuantity('3D Embroidery', qty) * qty;
    } else if (enhancedLogoType.includes('Rubber Patch')) {
      logoSetupCost = getPriceForLogoQuantity(enhancedLogoType, qty) * qty;
    } else if (enhancedLogoType.includes('Leather Patch')) {
      logoSetupCost = getPriceForLogoQuantity(enhancedLogoType, qty) * qty;
    } else if (enhancedLogoType.includes('Print Woven Patch')) {
      logoSetupCost = getPriceForLogoQuantity(enhancedLogoType, qty) * qty;
    } else if (enhancedLogoType === "Flat Embroidery") {
      logoSetupCost = getPriceForLogoQuantity('Medium Size Embroidery', qty) * qty;
    } else if (enhancedLogoType === "None") {
      logoSetupCost = 0;
    } else {
      // Fallback to flat embroidery pricing
      logoSetupCost = getPriceForLogoQuantity('Medium Size Embroidery', qty) * qty;
    }
    
    const deliveryUnitPrice = calculateDeliveryUnitPrice(qty, 'regular');
    const deliveryCost = qty * deliveryUnitPrice;
    const totalCost = (qty * basePrice) + logoSetupCost + deliveryCost;
    
    console.log(`📊 [ORDER-AI-CORE] Testing quantity ${qty}:`, {
      basePrice,
      logoSetupCost: logoSetupCost.toFixed(2),
      logoSetupPerUnit: (logoSetupCost / qty).toFixed(2),
      deliveryCost,
      totalCost: totalCost.toFixed(2),
      withinBudget: totalCost <= budget
    });
    
    if (totalCost <= budget) {
      bestQuantity = qty;
      bestCostPerUnit = totalCost / qty;
      bestTotalCost = totalCost;
      bestTierLevel = "Tier 1";
    } else {
      break; // Stop when we exceed budget
    }
  }
  
  console.log('✅ [ORDER-AI-CORE] Optimal quantity found:', {
    quantity: bestQuantity,
    costPerUnit: bestCostPerUnit.toFixed(2),
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
 * Calculate quick estimate
 */
export function calculateQuickEstimate(requirements: OrderRequirements, context?: any, budget?: number) {
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

/**
 * Calculate precise order estimate using real cost calculation system with enhanced CSV integration
 */
export async function calculatePreciseOrderEstimate(requirements: OrderRequirements) {
  try {
    console.log('🧮 [ORDER-AI-CORE] Calculating precise estimate for:', {
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
    
    // Build logo setup selections from multi-logo setup defaults if available
    let logoSetupSelections: Record<string, any> = {};
    let logoSetupKeys: string[] = [];
    
    if (requirements.multiLogoSetup && requirements.logoType !== "None") {
      // Use multi-logo setup for comprehensive logo configuration
      Object.entries(requirements.multiLogoSetup).forEach(([position, config]) => {
        // Create display name that includes position, size, and application for proper cost calculation
        const displayName = `${config.size} ${config.type} (${position.charAt(0).toUpperCase() + position.slice(1)}, ${config.size}, ${config.application})`;
        
        logoSetupSelections[displayName] = {
          position: position.charAt(0).toUpperCase() + position.slice(1),
          size: config.size,
          application: config.application
        };
        logoSetupKeys.push(displayName);
      });
    } else if (requirements.logoType !== "None") {
      // Fallback to single logo setup with proper display name
      const position = requirements.logoPosition || "Front";
      const size = requirements.logoSize || getDefaultLogoSize(position);
      const application = requirements.logoApplication || getDefaultApplication(requirements.logoType);
      const displayName = `${size} ${requirements.logoType} (${position}, ${size}, ${application})`;
      
      logoSetupSelections[displayName] = {
        position: position,
        size: size,
        application: application
      };
      logoSetupKeys = [displayName];
    }

    // Build accessories array (can be expanded later)
    const accessories: string[] = [];

    // Build services array with proper delivery method mapping
    const services: string[] = [];
    if (requirements.deliveryMethod && requirements.deliveryMethod !== "regular") {
      services.push(requirements.deliveryMethod + "-delivery");
    } else {
      services.push("regular-delivery");
    }

    // Build request in same format as the real calculate-cost API
    const costRequest = {
      selectedColors: {
        [requirements.color || "Brown"]: {
          sizes: {
            "One Size": requirements.quantity
          }
        }
      },
      logoSetupSelections,
      multiSelectOptions: {
        "logo-setup": logoSetupKeys,
        "accessories": accessories,
        "services": services
      },
      selectedOptions: {
        "profile": requirements.profile || "High",
        "bill-style": requirements.billStyle || "Flat Bill", 
        "panel-count": requirements.panelCount?.toString() || "6",
        "closure-type": requirements.closureType || "snapback",
        "structure": requirements.structure || "Structured",
        "fabric-setup": requirements.fabricType || "Chino Twill",
        "stitching": requirements.stitching || "Matching",
        "delivery-type": requirements.deliveryMethod || "regular"
      },
      // Include fabric information for premium fabric cost calculation
      fabricSetup: requirements.fabricType || "Chino Twill",
      customFabricSetup: requirements.fabricType === "Other" ? requirements.fabricType : undefined,
      baseProductPricing: getBaseProductPricing('Tier 1'), // Use real CSV pricing
      priceTier: 'Tier 1' // Ensure tier is explicitly set
    };
    
    console.log('📤 [ORDER-AI-CORE] Sending enhanced cost calculation request:', {
      logoSetupKeys,
      logoSetupSelections: Object.keys(logoSetupSelections),
      selectedOptions: costRequest.selectedOptions,
      fabricSetup: costRequest.fabricSetup,
      hasMultiLogoSetup: !!requirements.multiLogoSetup
    });

    // Call the real cost calculation API
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'}/api/calculate-cost`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(costRequest)
    });

    if (response.ok) {
      const realCostData = await response.json();
      
      console.log('📥 [ORDER-AI-CORE] Received cost calculation response:', {
        baseProductCost: realCostData.baseProductCost,
        logoSetupCostsCount: realCostData.logoSetupCosts?.length || 0,
        accessoriesCostsCount: realCostData.accessoriesCosts?.length || 0,
        closureCostsCount: realCostData.closureCosts?.length || 0,
        premiumFabricCostsCount: realCostData.premiumFabricCosts?.length || 0,
        deliveryCostsCount: realCostData.deliveryCosts?.length || 0,
        moldChargeCostsCount: realCostData.moldChargeCosts?.length || 0,
        servicesCostsCount: realCostData.servicesCosts?.length || 0,
        totalCost: realCostData.totalCost,
        logoSetupTotal: realCostData.logoSetupCosts?.reduce((sum: number, cost: any) => sum + cost.cost, 0) || 0,
        premiumFabricTotal: realCostData.premiumFabricCosts?.reduce((sum: number, cost: any) => sum + cost.cost, 0) || 0,
        closureTotal: realCostData.closureCosts?.reduce((sum: number, cost: any) => sum + cost.cost, 0) || 0,
        moldChargeTotal: realCostData.moldChargeCosts?.reduce((sum: number, cost: any) => sum + cost.cost, 0) || 0
      });
      
      // Format the response to match the expected structure
      return {
        costBreakdown: {
          baseProductTotal: realCostData.baseProductCost,
          logoSetupTotal: realCostData.logoSetupCosts?.reduce((sum: number, cost: any) => sum + cost.cost, 0) || 0,
          deliveryTotal: realCostData.deliveryCosts?.reduce((sum: number, cost: any) => sum + cost.cost, 0) || 0,
          accessoriesTotal: realCostData.accessoriesCosts?.reduce((sum: number, cost: any) => sum + cost.cost, 0) || 0,
          closureTotal: realCostData.closureCosts?.reduce((sum: number, cost: any) => sum + cost.cost, 0) || 0,
          moldChargeTotal: realCostData.moldChargeCosts?.reduce((sum: number, cost: any) => sum + cost.cost, 0) || 0,
          servicesTotal: realCostData.servicesCosts?.reduce((sum: number, cost: any) => sum + cost.cost, 0) || 0,
          premiumFabricTotal: realCostData.premiumFabricCosts?.reduce((sum: number, cost: any) => sum + cost.cost, 0) || 0,
          totalCost: realCostData.totalCost,
          // Detailed breakdowns for AI responses
          detailedBreakdown: realCostData
        },
        orderEstimate: {
          quantity: requirements.quantity,
          costPerUnit: realCostData.totalCost / requirements.quantity,
          totalCost: realCostData.totalCost
        }
      };
    } else {
      const errorText = await response.text();
      console.error('Cost calculation API failed:', response.status, errorText);
      throw new Error(`Cost calculation API call failed: ${response.status}`);
    }
  } catch (error) {
    console.error('Failed to get precise cost calculation, using enhanced fallback:', error);
    
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