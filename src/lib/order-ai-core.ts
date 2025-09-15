/**
 * Order AI Core Functions
 * Core logic for parsing order requirements and optimizing quantities
 */

// SUPABASE PRICING IMPORTS - Uses Supabase pricing tables exclusively
import {
  getProductPrice,
  getLogoPrice,
  getFabricPrice,
  getClosurePrice,
  getAccessoryPrice,
  getDeliveryPrice,
  generatePricingEstimate
} from '@/lib/pricing/pricing-service';

// Import business rules and knowledge base functions
import {
  BUSINESS_RULES,
  detectFabricFromText,
  detectClosureFromText,
  detectAccessoriesFromText,
  detectSizeFromText,
  getDefaultSizeForPosition,
  getDefaultApplicationForDecoration,
  detectStitchingSchemeFromText,
  parseStitchingFromText,
  validateFabricColorCompatibility,
  checkLabDipEligibility,
  getFabricConstructionOptions,
  CostingContext
} from '@/lib/costing-knowledge-base';

// CRITICAL FIX: Import unified logo detection system
import { detectLogosUnified, convertToKnowledgeBaseFormat } from '@/lib/unified-logo-detection';

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
  stitchingConfig?: {
    scheme: string;
    description: string;
    stitchingColors: { [area: string]: string };
    summary: string;
  };
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
  // FABRIC-COLOR VALIDATION & LAB DIP SYSTEM
  fabricColorValidation?: {
    isValid: boolean;
    message: string;
    suggestedColors?: string[];
  };
  labDipEligibility?: {
    eligible: boolean;
    message: string;
    details?: string;
  };
  fabricConstructions?: string[];
}

/**
 * Determine the correct product tier based on cap specifications
 * Based on Customer Products CSV data:
 * - Tier 1: 4-Panel, 5-Panel, 6-Panel curved caps (most affordable)
 * - Tier 2: 6-Panel flat caps (premium options)  
 * - Tier 3: 7-Panel caps (specialty caps)
 */
function determineProductTier(requirements: OrderRequirements): string {
  // CRITICAL FIX: Always prioritize explicit panel count for accurate tier matching
  if (requirements.panelCount) {
    console.log(`🎯 [ORDER-AI-CORE] Determining tier from panel count: ${requirements.panelCount}`);

    if (requirements.panelCount === 7) {
      console.log('🎯 [ORDER-AI-CORE] 7-PANEL -> Tier 3 (specialty caps)');
      return 'Tier 3';
    }
    if (requirements.panelCount === 6) {
      // UPDATED 6-panel logic: check bill shape for tier determination
      // Match the database bill shape patterns: "Flat", "Curved", "Slight Curved"
      const billStyleLower = requirements.billStyle?.toLowerCase() || '';

      if (billStyleLower.includes('flat')) {
        console.log('🎯 [ORDER-AI-CORE] 6-panel flat -> Tier 2');
        return 'Tier 2';
      } else if (billStyleLower.includes('slight') && billStyleLower.includes('curved')) {
        console.log('🎯 [ORDER-AI-CORE] 6-panel slight curved -> Tier 2');
        return 'Tier 2';
      } else if (billStyleLower.includes('curved')) {
        // Pure "curved" (not "slight curved") typically goes to Tier 1
        console.log('🎯 [ORDER-AI-CORE] 6-panel curved -> Tier 1');
        return 'Tier 1';
      } else {
        // Default for 6-panel without clear bill style indication
        console.log('🎯 [ORDER-AI-CORE] 6-panel default -> Tier 1');
        return 'Tier 1';
      }
    }
    console.log(`🎯 [ORDER-AI-CORE] ${requirements.panelCount}-panel -> Tier 1`);
    return 'Tier 1'; // 4-Panel, 5-Panel
  }

  // FALLBACK: If no panelCount, try to detect from other fields
  console.log('🔍 [ORDER-AI-CORE] No explicit panel count, using fallback detection');

  // Check bill style for 7-panel indicators (7-panel caps are often flat billed)
  if (requirements.billStyle?.toLowerCase().includes('7') ||
      requirements.structure?.toLowerCase().includes('7') ||
      requirements.fabricType?.toLowerCase().includes('7')) {
    console.log('🔍 [ORDER-AI-CORE] 7-panel indicator detected -> Tier 3');
    return 'Tier 3';
  }

  // Check for 6-panel flat cap indicators
  if (requirements.billStyle?.toLowerCase().includes('flat') &&
      (requirements.panelCount === 6 || requirements.structure?.toLowerCase().includes('6'))) {
    console.log('🔍 [ORDER-AI-CORE] 6-panel flat indicator -> Tier 2');
    return 'Tier 2';
  }

  // Default to Tier 1 (most affordable - 4/5/6-panel curved)
  console.log('🔍 [ORDER-AI-CORE] Default fallback -> Tier 1');
  return 'Tier 1';
}

// Logo setup helper functions (now using flexible position-based defaults)
const getDefaultLogoSize = (position: string) => getDefaultSizeForPosition(position);

// Helper function to normalize logo names for database queries
const normalizeLogoName = (logoName: string) => {
  return logoName
    .replace(/\s+patch$/i, '')  // Remove " Patch" suffix: "Leather Patch" -> "Leather"
    .replace(/\s+embroidery$/i, ' Embroidery'); // Keep " Embroidery" suffix
};

const getDefaultApplication = (decorationType: string) => getDefaultApplicationForDecoration(decorationType);

/**
 * Create custom multi-logo setup based on specific user mentions
 */
function createCustomLogoSetup(message: string, primaryLogoType: string, primaryLogoSize: string) {
  const lowerMessage = message.toLowerCase();
  const setup: any = {};
  
  // Parse front logo (handle both "on front" and "patch front" patterns)
  if (lowerMessage.includes('on front') || lowerMessage.includes('front') ||
      lowerMessage.includes('patch front') || lowerMessage.includes('embroidery front')) {
    // Check for specific front logo type
    let frontType = primaryLogoType;
    let frontSize = primaryLogoSize || 'Large';

    if (lowerMessage.includes('3d embroidery on front') || lowerMessage.includes('3d embroidery on the front') || lowerMessage.includes('3d embroidery front')) {
      frontType = '3D Embroidery';
    } else if (lowerMessage.includes('flat embroidery on front') || lowerMessage.includes('flat embroidery front')) {
      frontType = 'Flat Embroidery';
    } else if (lowerMessage.includes('rubber patch on front') || lowerMessage.includes('rubber patch front')) {
      frontType = 'Rubber Patch';
    } else if (lowerMessage.includes('leather patch on front') || lowerMessage.includes('leather patch front')) {
      frontType = 'Leather Patch';
    } else if (lowerMessage.includes('woven patch on front') || lowerMessage.includes('woven patch front')) {
      frontType = 'Woven Patch';
    }

    setup.front = {
      type: frontType,
      size: frontSize,
      application: getDefaultApplication(frontType)
    };
  }
  
  // Parse side logos with enhanced detection
  if (lowerMessage.includes('on left') || lowerMessage.includes('left side')) {
    let leftType = 'Embroidery'; // Default for sides
    if (lowerMessage.includes('3d embroidery on left') || lowerMessage.includes('3d embroidery at left')) {
      leftType = '3D Embroidery';
    } else if (lowerMessage.includes('flat embroidery on left') || lowerMessage.includes('flat embroidery at left')) {
      leftType = 'Flat Embroidery';
    } else if (lowerMessage.includes('embroidery at left') || lowerMessage.includes('embroidery on left')) {
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
    if (lowerMessage.includes('3d embroidery on right') || lowerMessage.includes('3d embroidery at right')) {
      rightType = '3D Embroidery';
    } else if (lowerMessage.includes('flat embroidery on right') || lowerMessage.includes('flat embroidery at right')) {
      rightType = 'Flat Embroidery';
    } else if (lowerMessage.includes('screen print patch on right')) {
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
  
  // Parse back logo with enhanced detection
  if (lowerMessage.includes('on back') || lowerMessage.includes('on the back')) {
    let backType = 'Embroidery'; // Default
    if (lowerMessage.includes('rubber patch on back') || lowerMessage.includes('rubber patch on the back')) {
      backType = 'Rubber Patch';
    } else if (lowerMessage.includes('leather patch on back') || lowerMessage.includes('leather patch on the back')) {
      backType = 'Leather Patch';
    } else if (lowerMessage.includes('woven patch on back') || lowerMessage.includes('woven patch on the back')) {
      backType = 'Woven Patch';
    } else if (lowerMessage.includes('patch on back')) {
      backType = 'Patch';
    } else if (lowerMessage.includes('3d embroidery on back') || lowerMessage.includes('3d embroidery on the back')) {
      backType = '3D Embroidery';
    } else if (lowerMessage.includes('flat embroidery on back') || lowerMessage.includes('flat embroidery on the back')) {
      backType = 'Flat Embroidery';
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
  let quantity: number = BUSINESS_RULES.DEFAULTS.quantity; // Use business rule default
  
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
      // 4. Fourth priority: Standalone numbers in context (e.g., "how much for 3500?")
      else {
        const standaloneNumberMatch = message.match(/(?:for|is)\s+(\d+,?\d*)[\s\?]*$/i);
        if (standaloneNumberMatch) {
          const quantityStr = standaloneNumberMatch[1].replace(/,/g, '');
          quantity = parseInt(quantityStr);
          console.log('🎯 [ORDER-AI-CORE] Standalone number detected:', quantity);
        }
      }
      // 5. MULTI-COLOR ORDERS: Only check if no direct pattern found
      if (quantity === BUSINESS_RULES.DEFAULTS.quantity) {
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
  let panelCount: number = BUSINESS_RULES.DEFAULTS.panelCount;
  let profile: string = BUSINESS_RULES.DEFAULTS.profile;
  let structure: string = BUSINESS_RULES.DEFAULTS.structure;
  let closureType: string = BUSINESS_RULES.DEFAULTS.closure;
  let fabricType: string = BUSINESS_RULES.DEFAULTS.fabricType;
  let stitching: string = BUSINESS_RULES.DEFAULTS.stitching;
  let deliveryMethod: string = BUSINESS_RULES.DEFAULTS.deliveryMethod;
  
  // Check for blank caps first - if customer explicitly asks for "blank caps", no logo needed
  const isBlankCapRequest = lowerMessage.includes('blank cap') || lowerMessage.includes('blank caps');
  
  // CRITICAL FIX: Use unified logo detection system only if not blank caps
  let logoType = "None"; // Default to no logo
  let logoDetectionResult: any = { primaryLogo: null, allLogos: [], multiLogoSetup: null };

  if (!isBlankCapRequest) {
    const unifiedDetection = detectLogosUnified(message);
    logoDetectionResult = convertToKnowledgeBaseFormat(unifiedDetection);
    logoType = logoDetectionResult.primaryLogo || "3D Embroidery";

    console.log('🎯 [ORDER-AI-CORE] UNIFIED logo detection:', {
      totalCount: unifiedDetection.totalCount,
      hasLogos: unifiedDetection.hasLogos,
      primaryLogo: logoDetectionResult.primaryLogo,
      summary: unifiedDetection.summary
    });
  }
  
  console.log('🎯 [ORDER-AI-CORE] Logo detection:', {
    isBlankCapRequest,
    logoType,
    detectedPrimaryLogo: logoDetectionResult.primaryLogo
  });
  let logoPosition = "Front"; // Default position
  let logoSize = detectSizeFromText(message, logoPosition);
  
  // Override logo size if detected in multi-logo analysis
  const frontLogo = logoDetectionResult.allLogos.find((logo: { type: string; position: string; size: string; confidence: number }) => logo.position === 'front');
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
  
  // Use knowledge base for fabric detection FIRST to avoid conflicts
  const detectedFabric = detectFabricFromText(message);
  if (detectedFabric) {
    fabricType = detectedFabric;
    console.log('🧵 [ORDER-AI-CORE] Fabric detected using knowledge base:', detectedFabric);
  }

  // CRITICAL FIX: ENHANCED panel count detection BEFORE color extraction to prevent "7-panel" -> "7" color corruption
  console.log('🎨 [ORDER-AI-CORE] === START PANEL COUNT DETECTION (PRIORITY) ===');
  console.log('🎨 [ORDER-AI-CORE] Message for panel analysis:', message);

  // Enhanced panel change detection patterns (HIGHEST PRIORITY)
  const panelChangePatterns = [
    /(?:change|switch|make|want).*?(?:to\s+)?7[\s-]?panel/i,
    /(?:change|switch|make|want).*?(?:to\s+)?6[\s-]?panel/i,
    /(?:change|switch|make|want).*?(?:to\s+)?5[\s-]?panel/i,
    /7[\s-]?panel/i,
    /6[\s-]?panel/i,
    /5[\s-]?panel/i
  ];

  let isPanelCountChange = false;
  let detectedPanelFromChange = null;

  for (const panelPattern of panelChangePatterns) {
    const panelMatch = message.match(panelPattern);
    if (panelMatch) {
      isPanelCountChange = true;
      // Extract the actual panel number
      const panelNumberMatch = panelMatch[0].match(/(\d+)/);
      if (panelNumberMatch) {
        detectedPanelFromChange = parseInt(panelNumberMatch[1]);
      }
      console.log('🎨 [ORDER-AI-CORE] PANEL COUNT CHANGE DETECTED:', {
        pattern: panelPattern.source,
        match: panelMatch[0],
        detectedPanel: detectedPanelFromChange,
        willSkipColorExtraction: true
      });
      break;
    }
  }

  console.log('🎨 [ORDER-AI-CORE] === START COLOR EXTRACTION (AFTER PANEL CHECK) ===');
  console.log('🎨 [ORDER-AI-CORE] Detected fabric (to avoid conflicts):', detectedFabric);
  console.log('🎨 [ORDER-AI-CORE] Panel change detected:', isPanelCountChange, '- will skip color if true');

  let color = undefined;

  // Only extract colors if this is NOT a panel count change
  if (!isPanelCountChange) {
    const colorPatterns = [
      /(?:color:?\s*|in\s+)(\w+)/i,
      /(?:make\s+it\s+)(\w+)/i,
      /(?:^|\s)(black|white|red|blue|green|yellow|orange|purple|pink|brown|gray|grey|navy|lime|olive|royal|maroon|gold|charcoal|khaki|carolina|silver|teal|forest|burgundy|crimson|ivory|beige|tan|coral)(?:\s|$|,)/i
    ];

    // CRITICAL FIX: Enhanced slash pattern detection for colors if it's NOT a fabric
    const slashPattern = /(\w+)\/(\w+)/i;
    const slashMatch = message.match(slashPattern);
    console.log('🎨 [ORDER-AI-CORE] Slash pattern match:', slashMatch);
    console.log('🎨 [ORDER-AI-CORE] Fabric check (skip if fabric):', detectedFabric);

    if (slashMatch && !detectedFabric) {
      // Only treat as color if both parts are known colors
      const part1 = slashMatch[1];
      const part2 = slashMatch[2];
      console.log('🎨 [ORDER-AI-CORE] Split color parts:', { part1, part2 });

      // CRITICAL FIX: Expanded known colors list to match step-by-step-pricing
      const knownColors = ['black', 'white', 'red', 'blue', 'green', 'yellow', 'orange', 'purple',
                          'pink', 'brown', 'gray', 'grey', 'navy', 'lime', 'olive', 'royal',
                          'maroon', 'gold', 'charcoal', 'khaki', 'carolina', 'silver', 'teal',
                          'forest', 'burgundy', 'crimson', 'ivory', 'beige', 'tan', 'coral'];

      const part1Valid = knownColors.includes(part1.toLowerCase());
      const part2Valid = knownColors.includes(part2.toLowerCase());
      console.log('🎨 [ORDER-AI-CORE] Color validation:', { part1Valid, part2Valid });

      if (part1Valid && part2Valid) {
        // CRITICAL FIX: Properly capitalize split colors
        const normalizedPart1 = part1.charAt(0).toUpperCase() + part1.slice(1).toLowerCase();
        const normalizedPart2 = part2.charAt(0).toUpperCase() + part2.slice(1).toLowerCase();
        color = `${normalizedPart1}/${normalizedPart2}`;
        console.log('🎨 [ORDER-AI-CORE] RESULT: Split color detected:', color);
      }
    }

    // If no slash color found, try other patterns
    if (!color) {
      console.log('🎨 [ORDER-AI-CORE] Testing single color patterns');
      for (const pattern of colorPatterns) {
        const colorMatch = message.match(pattern);
        console.log('🎨 [ORDER-AI-CORE] Pattern test:', { pattern: pattern.source, match: colorMatch });
        if (colorMatch) {
          const detectedColor = colorMatch[1] || colorMatch[0].trim();
          // CRITICAL FIX: Properly capitalize single colors
          color = detectedColor.charAt(0).toUpperCase() + detectedColor.slice(1).toLowerCase();
          console.log('🎨 [ORDER-AI-CORE] RESULT: Single color detected:', color);
          break;
        }
      }
    }
  } else {
    console.log('🎨 [ORDER-AI-CORE] Skipped color extraction due to panel count change detection');
  }

  console.log('🎨 [ORDER-AI-CORE] FINAL COLOR RESULT:', color);
  console.log('🎨 [ORDER-AI-CORE] === END COLOR EXTRACTION ===');
  
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

  // ENHANCED: Detect stitching scheme using new comprehensive logic
  // First extract any colors mentioned for potential color-based stitching
  const colorPattern = /(?:red|blue|white|black|green|yellow|orange|purple|pink|brown|gray|grey|navy)/gi;
  const mentionedColors = message.match(colorPattern) || [];
  const uniqueMentionedColors = [...new Set(mentionedColors.map(c => c.toLowerCase()))];

  // Use new stitching detection system
  const stitchingConfig = parseStitchingFromText(message, uniqueMentionedColors.map(c =>
    c.charAt(0).toUpperCase() + c.slice(1)
  ));

  // Set stitching to the detected scheme or summary
  stitching = stitchingConfig.summary || stitchingConfig.scheme;

  console.log('🧵 [ORDER-AI-CORE] Enhanced stitching detected:', {
    scheme: stitchingConfig.scheme,
    summary: stitchingConfig.summary,
    description: stitchingConfig.description,
    stitchingColors: stitchingConfig.stitchingColors
  });
  
  // CRITICAL FIX: Detect bill style and normalize for product matching
  if (lowerMessage.includes('flat bill') || lowerMessage.includes('flat visor') || lowerMessage.includes('flatbill')) {
    billStyle = "Flat";
    console.log('🎯 [ORDER-AI-CORE] Bill shape detected: Flat');
  } else if (lowerMessage.includes('slight curved') || lowerMessage.includes('slightly curved')) {
    // CRITICAL FIX: Map "Slight Curved" to "Curved" for product matching
    billStyle = "Curved";
    console.log('🎯 [ORDER-AI-CORE] Bill shape detected: Slight Curved → normalized to Curved');
  } else if (lowerMessage.includes('curved bill') || lowerMessage.includes('curved visor') || lowerMessage.includes('curved')) {
    billStyle = "Curved";
    console.log('🎯 [ORDER-AI-CORE] Bill shape detected: Curved');
  }
  
  // CRITICAL FIX: Use the panel count from earlier detection (already processed above)
  if (detectedPanelFromChange) {
    panelCount = detectedPanelFromChange;
    console.log('🎯 [ORDER-AI-CORE] USING PANEL COUNT from earlier detection:', panelCount);
  } else {
    // Enhanced panel count detection for non-change scenarios
    if (lowerMessage.includes('7 panel') || lowerMessage.includes('7-panel') ||
        lowerMessage.includes('seven panel') || lowerMessage.includes('seven-panel') ||
        lowerMessage.includes('7p ') || lowerMessage.includes('7 p ')) {
      panelCount = 7;
      console.log('🎯 [ORDER-AI-CORE] 7-PANEL DETECTED from message:', message.substring(0, 100));
    } else if (lowerMessage.includes('6 panel') || lowerMessage.includes('6-panel') ||
               lowerMessage.includes('six panel') || lowerMessage.includes('six-panel') ||
               lowerMessage.includes('6p ') || lowerMessage.includes('6 p ')) {
      panelCount = 6;
      console.log('🎯 [ORDER-AI-CORE] 6-panel detected from message');
    } else if (lowerMessage.includes('5 panel') || lowerMessage.includes('5-panel') ||
               lowerMessage.includes('five panel') || lowerMessage.includes('five-panel') ||
               lowerMessage.includes('5p ') || lowerMessage.includes('5 p ')) {
      panelCount = 5;
      console.log('🎯 [ORDER-AI-CORE] 5-panel detected from message');
    } else if (lowerMessage.includes('4 panel') || lowerMessage.includes('4-panel') ||
               lowerMessage.includes('four panel') || lowerMessage.includes('four-panel') ||
               lowerMessage.includes('4p ') || lowerMessage.includes('4 p ')) {
      panelCount = 4;
      console.log('🎯 [ORDER-AI-CORE] 4-panel detected from message');
    }
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

  // FABRIC-COLOR VALIDATION SYSTEM
  let fabricColorValidation = null;
  let labDipEligibility = null;
  let fabricConstructions = [];

  if (fabricType && color) {
    fabricColorValidation = validateFabricColorCompatibility(fabricType, color);
    console.log('🎨 [ORDER-AI-CORE] Fabric-Color validation:', fabricColorValidation);

    if (!fabricColorValidation.isValid) {
      console.warn('⚠️ [ORDER-AI-CORE] Invalid fabric-color combination:', {
        fabric: fabricType,
        color: color,
        message: fabricColorValidation.message,
        suggested: fabricColorValidation.suggestedColors
      });
    }
  }

  // Check Lab Dip eligibility for high-quantity orders
  if (quantity) {
    labDipEligibility = checkLabDipEligibility(quantity, fabricType);
    console.log('🧪 [ORDER-AI-CORE] Lab Dip eligibility:', labDipEligibility);
  }

  // Get fabric construction options
  if (fabricType) {
    fabricConstructions = getFabricConstructionOptions(fabricType);
    if (fabricConstructions.length > 0) {
      console.log('🏗️ [ORDER-AI-CORE] Fabric constructions available:', fabricConstructions);
    }
  }

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
  
  const finalOrderRequirements = {
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
    stitchingConfig, // Add enhanced stitching configuration
    deliveryMethod,
    accessories: detectedAccessories, // Include detected accessories
    multiLogoSetup,
    // FABRIC-COLOR VALIDATION & LAB DIP SYSTEM
    fabricColorValidation, // Fabric-color compatibility check
    labDipEligibility, // Lab Dip sampling eligibility
    fabricConstructions // Available fabric construction options
  };

  console.log('🎨 [ORDER-AI-CORE] === FINAL RETURN ===');
  console.log('🎨 [ORDER-AI-CORE] Final color in requirements:', finalOrderRequirements.color);
  console.log('🎨 [ORDER-AI-CORE] === END PARSE ORDER REQUIREMENTS ===');

  return finalOrderRequirements;
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
    try {
      // Use Supabase pricing service for all calculations
      const productResult = await getProductPrice('Tier 1', qty);
      const basePrice = productResult.unitPrice;

      // Calculate logo setup cost using Supabase
      let logoSetupCost = 0;
      if (logoType !== "None") {
        try {
          const normalizedLogoType = normalizeLogoName(logoType);
          const logoResult = await getLogoPrice(normalizedLogoType, 'Medium', getDefaultApplication(logoType), qty);
          logoSetupCost = logoResult.unitPrice * qty;
        } catch (error) {
          console.log(`Logo pricing not found for ${logoType}, skipping logo cost`);
          logoSetupCost = 0;
        }
      }

      // Calculate delivery cost using Supabase
      const deliveryResult = await getDeliveryPrice('regular', qty);
      const deliveryUnitPrice = deliveryResult.unitPrice;
      const deliveryCost = qty * deliveryUnitPrice;
      const totalCost = (qty * basePrice) + logoSetupCost + deliveryCost;
    
    if (totalCost <= budget) {
      bestQuantity = qty;
      bestCostPerUnit = totalCost / qty;
      bestTotalCost = totalCost;
    } else {
        break; // Stop when we exceed budget
      }
    } catch (error) {
      console.log(`Error calculating pricing for quantity ${qty}:`, error);
      continue;
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
      quantity: BUSINESS_RULES.DEFAULTS.quantity,
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
      stitchingConfig: parseStitchingFromText('', ['Black']), // Default matching stitching
      billStyle: BUSINESS_RULES.DEFAULTS.billStyle,
      panelCount: BUSINESS_RULES.DEFAULTS.panelCount,
      multiLogoSetup: logoType !== "None" ? JSON.parse(JSON.stringify(BUSINESS_RULES.DEFAULT_LOGO_SETUP)) : null
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

    // Use unified quick estimate - import from unified-costing-service
    const { calculateQuickEstimate: unifiedCalculateQuickEstimate } = await import('@/lib/unified-costing-service');
    const estimate = await unifiedCalculateQuickEstimate(costingContext);
    
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
    
    // Fallback to simple calculation using Supabase pricing
    const productTier = determineProductTier(requirements);

    // Use Supabase pricing service for base price
    let basePrice = 5.50; // Ultimate fallback only if Supabase fails
    try {
      const productResult = await getProductPrice(productTier, requirements.quantity);
      basePrice = productResult.unitPrice;
    } catch (error) {
      console.log('Using ultimate fallback base price due to Supabase error:', error);
    }
    
    // Calculate logo cost using Supabase pricing service
    let logoSetupCost = 0;
    if (requirements.logoType && requirements.logoType !== "None") {
      const logoSize = requirements.logoSize || 'Medium';
      const logoApplication = requirements.logoApplication || getDefaultApplication(requirements.logoType);
      try {
        const normalizedLogoType = normalizeLogoName(requirements.logoType);
        const logoResult = await getLogoPrice(normalizedLogoType, logoSize, logoApplication, requirements.quantity);
        logoSetupCost = logoResult.unitPrice * requirements.quantity;
      } catch (error) {
        console.log(`Logo pricing not found for ${logoSize} ${requirements.logoType}, skipping logo cost`);
        logoSetupCost = 0; // Skip logo cost if not found
      }
    }

    // Calculate delivery cost using Supabase pricing service
    let deliveryUnitPrice = 2.50; // Ultimate fallback only if Supabase fails
    try {
      const deliveryResult = await getDeliveryPrice(requirements.deliveryMethod || 'regular', requirements.quantity);
      deliveryUnitPrice = deliveryResult.unitPrice;
    } catch (error) {
      console.log('Using fallback delivery pricing');
    }
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
  console.log('🧮 [ORDER-AI-CORE] Calculating precise estimate using SUPABASE pricing for:', {
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
    // 1. Calculate blank cap cost using Supabase products table
    const productTier = determineProductTier(requirements);

    console.log('🔍 [SUPABASE-PRICING] Product tier determined:', productTier);

    const productResult = await getProductPrice(productTier, requirements.quantity);
    const blankCapUnitPrice = productResult.unitPrice;
    const baseProductTotal = blankCapUnitPrice * requirements.quantity;

    console.log(`🧢 [SUPABASE-PRICING] Blank caps (${productTier}): $${blankCapUnitPrice} x ${requirements.quantity} = $${baseProductTotal}`);

    // 2. Calculate logo costs using Supabase logo_methods table
    let logoSetupTotal = 0;
    let moldChargeTotal = 0;
    const logoBreakdown = [];

    if (requirements.multiLogoSetup && requirements.logoType !== "None") {
      // Multi-logo setup
      for (const [position, config] of Object.entries(requirements.multiLogoSetup)) {
        const normalizedType = normalizeLogoName(config.type);
        const logoPrice = await getLogoPrice(normalizedType, config.size, config.application, requirements.quantity);
        const logoCost = logoPrice.unitPrice * requirements.quantity;
        logoSetupTotal += logoCost;
        moldChargeTotal += logoPrice.moldCharge || 0;

        logoBreakdown.push({
          position: position,
          type: config.type,
          size: config.size,
          application: config.application,
          unitPrice: logoPrice.unitPrice,
          totalCost: logoCost,
          moldCharge: logoPrice.moldCharge || 0
        });
      }
    } else if (requirements.logoType !== "None") {
      // Single logo setup
      const size = requirements.logoSize || getDefaultLogoSize(requirements.logoPosition || 'Front');
      const application = requirements.logoApplication || getDefaultApplication(requirements.logoType);

      const normalizedType = normalizeLogoName(requirements.logoType);
      const logoPrice = await getLogoPrice(normalizedType, size, application, requirements.quantity);
      const logoCost = logoPrice.unitPrice * requirements.quantity;
      logoSetupTotal += logoCost;
      moldChargeTotal += logoPrice.moldCharge || 0;

      logoBreakdown.push({
        position: requirements.logoPosition || 'Front',
        type: requirements.logoType,
        size: size,
        application: application,
        unitPrice: logoPrice.unitPrice,
        totalCost: logoCost,
        moldCharge: logoPrice.moldCharge || 0
      });
    }

    console.log(`🎨 [SUPABASE-PRICING] Logo setup total: $${logoSetupTotal}, Mold charges: $${moldChargeTotal}`);

    // 3. Calculate premium fabric cost using Supabase premium_fabrics table
    let premiumFabricTotal = 0;
    let fabricUnitPrice = 0;
    if (requirements.fabricType) {
      try {
        const fabricPrice = await getFabricPrice(requirements.fabricType, requirements.quantity);
        if (fabricPrice.unitPrice > 0) {
          fabricUnitPrice = fabricPrice.unitPrice;
          premiumFabricTotal = fabricUnitPrice * requirements.quantity;
          console.log(`🧵 [SUPABASE-PRICING] Premium fabric (${requirements.fabricType}): $${fabricUnitPrice} x ${requirements.quantity} = $${premiumFabricTotal}`);
        }
      } catch (error) {
        console.log(`ℹ️ [SUPABASE-PRICING] Fabric ${requirements.fabricType} not found in premium fabrics - using as base fabric`);
      }
    }

    // 4. Calculate premium closure cost using Supabase closures table
    let closureTotal = 0;
    let closureUnitPrice = 0;
    if (requirements.closureType && !['Snapback', 'Velcro'].includes(requirements.closureType)) {
      try {
        const closurePrice = await getClosurePrice(requirements.closureType, requirements.quantity);
        closureUnitPrice = closurePrice.unitPrice;
        closureTotal = closureUnitPrice * requirements.quantity;
        console.log(`🔒 [SUPABASE-PRICING] Premium closure (${requirements.closureType}): $${closureUnitPrice} x ${requirements.quantity} = $${closureTotal}`);
      } catch (error) {
        console.log(`ℹ️ [SUPABASE-PRICING] Closure ${requirements.closureType} not found in premium closures - using as base closure`);
      }
    }

    // 5. Calculate accessories cost using Supabase accessories table
    let accessoriesTotal = 0;
    const accessoriesBreakdown = [];
    if (requirements.accessories && requirements.accessories.length > 0) {
      for (const accessory of requirements.accessories) {
        try {
          const accessoryPrice = await getAccessoryPrice(accessory, requirements.quantity);
          const accessoryCost = accessoryPrice.unitPrice * requirements.quantity;
          accessoriesTotal += accessoryCost;

          accessoriesBreakdown.push({
            name: accessory,
            unitPrice: accessoryPrice.unitPrice,
            totalCost: accessoryCost
          });
        } catch (error) {
          console.log(`⚠️ [SUPABASE-PRICING] Accessory ${accessory} not found in database`);
        }
      }
      console.log(`🎁 [SUPABASE-PRICING] Accessories total: $${accessoriesTotal}`);
    }

    // 6. Calculate delivery cost using Supabase delivery_methods table
    const deliveryMethod = requirements.deliveryMethod || 'Regular';
    const deliveryPrice = await getDeliveryPrice(deliveryMethod, requirements.quantity);
    const deliveryUnitPrice = deliveryPrice.unitPrice;
    const deliveryTotal = deliveryUnitPrice * requirements.quantity;
    console.log(`🚚 [SUPABASE-PRICING] Delivery (${deliveryMethod}): $${deliveryUnitPrice} x ${requirements.quantity} = $${deliveryTotal}`);

    // 7. Calculate total
    const totalCost = baseProductTotal + logoSetupTotal + moldChargeTotal + premiumFabricTotal + closureTotal + accessoriesTotal + deliveryTotal;

    // DEBUGGING: Calculate total cost per cap for clarity
    const totalBlankCapCost = baseProductTotal + premiumFabricTotal;
    const totalBlankCapUnitPrice = totalBlankCapCost / requirements.quantity;

    console.log('🚨 [SUPABASE-PRICING] BLANK CAP BREAKDOWN:');
    console.log(`   Base cap price: $${blankCapUnitPrice} × ${requirements.quantity} = $${baseProductTotal}`);
    console.log(`   Premium fabric: $${fabricUnitPrice} × ${requirements.quantity} = $${premiumFabricTotal}`);
    console.log(`   TOTAL BLANK CAPS: $${totalBlankCapUnitPrice} × ${requirements.quantity} = $${totalBlankCapCost}`);
    console.log('💰 [SUPABASE-PRICING] FINAL BREAKDOWN:', {
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
    console.error('❌ [SUPABASE-PRICING] Error in Supabase pricing calculation:', error);

    // Simple fallback with basic estimates - only when Supabase completely fails
    let fallbackUnitPrice = 8.0; // Ultimate fallback
    try {
      const productResult = await getProductPrice('Tier 1', requirements.quantity);
      fallbackUnitPrice = productResult.unitPrice + 3.0; // Add estimated logo/delivery costs
    } catch (error) {
      console.log('Using ultimate fallback pricing due to complete Supabase failure:', error);
    }
    const fallbackTotal = requirements.quantity * fallbackUnitPrice;
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
        costPerUnit: fallbackUnitPrice,
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

  // Use Supabase pricing service for base price
  let basePrice = 5.50; // Ultimate fallback only if Supabase fails
  try {
    const productResult = await getProductPrice(productTier, requirements.quantity);
    basePrice = productResult.unitPrice;
  } catch (error) {
    console.log('Using ultimate fallback base price in enhanced fallback:', error);
  }
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
        let logoUnitPrice = 0;
        try {
          const normalizedConfigType = normalizeLogoName(config.type);
          const logoResult = await getLogoPrice(normalizedConfigType, config.size, getDefaultApplication(config.type), requirements.quantity);
          logoUnitPrice = logoResult.unitPrice;
        } catch (error) {
          console.log(`Logo pricing not found for ${config.size} ${config.type}, skipping logo cost`);
          logoUnitPrice = 0; // Skip if not found
        }
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
      let logoUnitPrice = 0;
      try {
        const normalizedRequirementsType = normalizeLogoName(requirements.logoType);
        const logoResult = await getLogoPrice(normalizedRequirementsType, size, getDefaultApplication(requirements.logoType), requirements.quantity);
        logoUnitPrice = logoResult.unitPrice;
      } catch (error) {
        console.log(`Logo pricing not found for ${size} ${requirements.logoType}, skipping logo cost`);
        logoUnitPrice = 0; // Skip if not found
      }
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

  // NOTE: Premium fabric cost calculation moved to Supabase-only pricing above
  // CSV fallback removed - all fabric pricing now uses Supabase exclusively

  // NOTE: Premium closure cost calculation moved to Supabase-only pricing above
  // CSV fallback removed - all closure pricing now uses Supabase exclusively

  // NOTE: Mold charge calculation moved to Supabase-only pricing above
  // CSV fallback removed - all mold charge pricing now uses Supabase exclusively

  // NOTE: Delivery cost calculation moved to Supabase-only pricing above
  // CSV fallback removed - all delivery pricing now uses Supabase exclusively

  console.log('🔧 [SUPABASE-ONLY] Fallback cost breakdown (CSV removed):', {
    baseProductTotal,
    logoSetupTotal: logoSetupCost,
    totalCost: baseProductTotal + logoSetupCost
  });

  return {
    costBreakdown: {
      baseProductTotal,
      logoSetupTotal: logoSetupCost,
      deliveryTotal: 0, // Moved to Supabase pricing
      accessoriesTotal: 0,
      closureTotal: 0, // Moved to Supabase pricing
      moldChargeTotal: 0, // Moved to Supabase pricing
      servicesTotal: 0,
      premiumFabricTotal: 0, // Moved to Supabase pricing
      totalCost: baseProductTotal + logoSetupCost,
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
        delivery: { unitPrice: 0, total: 0 }, // Will be calculated by main pricing function
        premiumFabric: null, // Moved to Supabase pricing
        premiumClosure: null // Moved to Supabase pricing
      }
    },
    orderEstimate: {
      quantity: requirements.quantity,
      costPerUnit: (baseProductTotal + logoSetupCost) / requirements.quantity,
      totalCost: baseProductTotal + logoSetupCost
    }
  };
}

/**
 * Basic fallback calculation when API is unavailable (legacy - use enhanced version)
 */
async function calculateBasicEstimate(requirements: OrderRequirements) {
  return await calculateEnhancedFallbackEstimate(requirements);
}

// NOTE: All CSV-based pricing functions removed - Supabase pricing exclusively used above


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
      "Advanced stitching options: Matching, Contrast, or Color-Based for sophisticated design",
      "Multi-position logo setup for maximum brand exposure",
      requirements.quantity >= 3168 
        ? "Large quantity qualifies for freight shipping discounts" 
        : "Consider increasing to 3168+ caps for freight shipping savings"
    ]
  };
}