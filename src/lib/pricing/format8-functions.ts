/**
 * FORMAT #8 PRICING FUNCTIONS
 *
 * Extracted from step-by-step-pricing route for reusability
 * All functions use accurate Supabase pricing data
 */

import {
  loadProducts,
  loadPricingTiers,
  loadLogoMethods,
  loadPremiumFabrics,
  loadDeliveryMethods,
  loadAccessories,
  loadMoldCharges,
  calculatePriceForQuantity
} from '@/lib/pricing/pricing-service';
import { supabaseAdmin } from '@/lib/supabase';

// Import advanced detection functions from knowledge base
import {
  detectFabricFromText,
  detectClosureFromText,
  detectAccessoriesFromText,
  detectSizeFromText,
  detectAllLogosFromText,
  getDefaultApplicationForDecoration
} from '@/lib/costing-knowledge-base';

// Enhanced color detection function that handles "Royal/Black" patterns
function extractAdvancedColor(text: string): string | null {
  const lowerText = text.toLowerCase();

  // Enhanced color detection with split color support (like "Royal/Black")
  // Priority 1: Check for slash patterns (Royal/Black, Red/White, etc.)
  const slashPattern = /(\w+)\/(\w+)/i;
  const slashMatch = text.match(slashPattern);

  if (slashMatch) {
    const part1 = slashMatch[1];
    const part2 = slashMatch[2];

    // Common colors for validation - including Royal
    const knownColors = ['black', 'white', 'red', 'blue', 'green', 'yellow', 'orange', 'purple',
                        'pink', 'brown', 'gray', 'grey', 'navy', 'lime', 'olive', 'royal',
                        'maroon', 'gold', 'charcoal', 'khaki', 'carolina'];

    // If both parts are colors, treat as split color
    if (knownColors.includes(part1.toLowerCase()) && knownColors.includes(part2.toLowerCase())) {
      const normalizedColor = `${part1}/${part2}`;
      console.log('🎨 [ADVANCED-COLOR] Split color detected:', normalizedColor);
      return normalizedColor;
    }
  }

  // Priority 2: Single color patterns with enhanced detection
  const colorPatterns = [
    /(?:color:?\s*|in\s+|cap\s+)(\w+)/i,
    /(?:^|\s)(black|white|red|blue|green|yellow|orange|purple|pink|brown|gray|grey|navy|lime|olive|royal|maroon|gold|charcoal|khaki|carolina)(?:\s|$|,)/i
  ];

  for (const pattern of colorPatterns) {
    const colorMatch = text.match(pattern);
    if (colorMatch) {
      const detectedColor = colorMatch[1] || colorMatch[0].trim();
      console.log('🎨 [ADVANCED-COLOR] Single color detected:', detectedColor);
      return detectedColor;
    }
  }

  console.log('🎨 [ADVANCED-COLOR] No color detected in:', text.substring(0, 50));
  return null;
}

// Enhanced size detection with CM to hat size mapping
function extractAdvancedSize(text: string): string | null {
  const lowerText = text.toLowerCase();

  // Priority 1: CM measurements (like "59 cm") -> convert to hat size
  const cmPatterns = [
    /(\d{2})\s*cm/i,
    /(\d{2})\s*centimeter/i,
    /size:?\s*(\d{2})\s*cm/i
  ];

  for (const pattern of cmPatterns) {
    const cmMatch = text.match(pattern);
    if (cmMatch) {
      const cmSize = parseInt(cmMatch[1]);
      const hatSize = convertCmToHatSize(cmSize);
      console.log('📏 [ADVANCED-SIZE] CM size detected:', { cm: cmSize, hatSize });
      return hatSize;
    }
  }

  // Priority 2: Direct hat size patterns (like "7 1/4")
  const hatSizePatterns = [
    /\b([67](?:\s*\d+\/\d+|\.\d+)?)\b.*(?:hat|cap|size)/i,
    /(?:hat|cap|size).*?\b([67](?:\s*\d+\/\d+|\.\d+)?)\b/i,
    /\bsize\s*([67](?:\s*\d+\/\d+|\.\d+)?)\b/i
  ];

  for (const pattern of hatSizePatterns) {
    const sizeMatch = text.match(pattern);
    if (sizeMatch) {
      const detectedSize = sizeMatch[1].trim();
      console.log('📏 [ADVANCED-SIZE] Hat size detected:', detectedSize);
      return detectedSize;
    }
  }

  // Priority 3: Standard size patterns
  const standardSizeMatch = text.match(/\b(small|medium|large|x-large|xxl)\b/i);
  if (standardSizeMatch) {
    const desc = standardSizeMatch[1].toLowerCase();
    const hatSize = desc === 'small' ? '7' :
                  desc === 'medium' ? '7 1/4' :
                  desc === 'large' ? '7 1/2' :
                  desc === 'x-large' ? '7 5/8' : '7 1/4';
    console.log('📏 [ADVANCED-SIZE] Standard size detected:', { desc, hatSize });
    return hatSize;
  }

  return null;
}

// CM to Hat Size conversion
function convertCmToHatSize(cm: number): string {
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

  if (sizeMap[cm]) {
    return sizeMap[cm];
  }

  // Find closest match
  if (cm <= 54) return '6 3/4';
  if (cm >= 64) return '8';

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

  return sizeMap[closest] || '7 1/4';
}

// Helper function to extract previous quote context from conversation history
export function extractPreviousQuoteContext(conversationHistory: Array<{ role: string; content: string }>) {
  console.log('📋 [CONTEXT-EXTRACT] Analyzing conversation history for previous quote data...');

  // Initialize empty context
  let context: any = {
    hasQuote: false,
    quantity: null,
    fabric: null,
    closure: null,
    logoRequirements: [],
    colors: null,
    size: null
  };

  // Look through conversation history in reverse (most recent first)
  for (let i = conversationHistory.length - 1; i >= 0; i--) {
    const message = conversationHistory[i];

    // Only analyze assistant messages that contain quote data
    if (message.role === 'assistant' && message.content) {
      const content = message.content.toLowerCase();

      // Check if this message contains a structured quote
      if (content.includes('cap style setup') && content.includes('total investment')) {
        console.log('📋 [CONTEXT-EXTRACT] Found structured quote in message:', i);
        context.hasQuote = true;

        // Extract quantity from "144 caps" or similar patterns
        const quantityMatch = message.content.match(/for (\d+,?\d*) caps?/i);
        if (quantityMatch) {
          context.quantity = parseInt(quantityMatch[1].replace(/,/g, ''));
          console.log('📋 [CONTEXT-EXTRACT] Found quantity:', context.quantity);
        }

        // Extract fabric from "Fabric: Acrylic (+$360.00)" patterns
        const fabricMatch = message.content.match(/•Fabric: ([^(]+) \(\+\$[\d,]+\.?\d*\)/i);
        if (fabricMatch) {
          context.fabric = fabricMatch[1].trim();
          console.log('📋 [CONTEXT-EXTRACT] Found fabric:', context.fabric);
        }

        // Extract closure from "Closure: Fitted (+$XX.XX)" patterns - for future use
        const closureMatch = message.content.match(/•Closure: ([^(]+) \(\+\$[\d,]+\.?\d*\)/i);
        if (closureMatch) {
          context.closure = closureMatch[1].trim();
          console.log('📋 [CONTEXT-EXTRACT] Found closure:', context.closure);
        }

        // Extract logo information from "Front: 3D Embroidery (Large) - $342.72" patterns
        const logoMatches = message.content.matchAll(/•([^:]+): ([^(]+) \(([^)]+)\) - \$[\d,]+\.?\d*/gi);
        for (const logoMatch of logoMatches) {
          const logoReq = {
            type: logoMatch[2].trim(),
            location: logoMatch[1].trim(),
            size: logoMatch[3].trim(),
            hasMoldCharge: logoMatch[2].toLowerCase().includes('patch')
          };
          context.logoRequirements.push(logoReq);
          console.log('📋 [CONTEXT-EXTRACT] Found logo:', logoReq);
        }

        // Extract colors from original user request by looking at user messages
        break; // Found the most recent quote, stop searching
      }
    }
  }

  // Also look for colors and size in user messages
  for (let i = conversationHistory.length - 1; i >= 0; i--) {
    const message = conversationHistory[i];

    if (message.role === 'user' && message.content) {
      const content = message.content.toLowerCase();

      // Extract colors from user messages
      if (!context.colors) {
        const colorCombinationMatch = message.content.match(/\b(Red|Blue|Black|White|Green|Yellow|Navy|Gray|Grey|Brown|Khaki|Orange|Purple)\s*\/\s*(Red|Blue|Black|White|Green|Yellow|Navy|Gray|Grey|Brown|Khaki|Orange|Purple)\b/gi);
        if (colorCombinationMatch) {
          const colorParts = colorCombinationMatch[0].split('/').map(c => c.trim());
          context.colors = colorParts;
          console.log('📋 [CONTEXT-EXTRACT] Found colors:', context.colors);
        } else {
          const singleColorMatch = message.content.match(/\b(Red|Blue|Black|White|Green|Yellow|Navy|Gray|Grey|Brown|Khaki|Orange|Purple)\b/gi);
          if (singleColorMatch) {
            context.colors = [singleColorMatch[0]];
            console.log('📋 [CONTEXT-EXTRACT] Found single color:', context.colors);
          }
        }
      }

      // Extract size from user messages
      if (!context.size) {
        const standardSizeMatch = message.content.match(/\b(Small|Medium|Large|X-Large|XXL)\b/i);
        if (standardSizeMatch) {
          context.size = standardSizeMatch[1];
          console.log('📋 [CONTEXT-EXTRACT] Found size:', context.size);
        }
      }
    }
  }

  return context;
}

// Step 1: Analyze customer requirements with conversation context
export async function analyzeCustomerRequirements(message: string, conversationHistory: Array<{ role: string; content: string }> = []) {
  console.log('🔍 [ANALYZE] Parsing customer message:', message.substring(0, 100));
  console.log('🔍 [ANALYZE] Conversation history length:', conversationHistory.length);

  // Extract previous quote context from conversation history
  const previousContext = extractPreviousQuoteContext(conversationHistory);
  console.log('📋 [CONTEXT] Previous context extracted:', previousContext);

  // Extract quantity - FIXED: Use previous context as fallback
  const quantityMatch = message.match(/(\d+,?\d*)\s*(?:pcs?|caps?|pieces?|units?)/i);
  const quantity = quantityMatch ? parseInt(quantityMatch[1].replace(/,/g, '')) : (previousContext.quantity || 144);

  console.log('🔍 [ANALYZE] Quantity - Current message:', quantityMatch?.[1], 'Previous context:', previousContext.quantity, 'Final:', quantity);

  // Extract colors - ENHANCED: Use advanced color detection with split color support
  let colors = previousContext.colors || ['Black'];
  let color = previousContext.colors ? previousContext.colors.join('/') : 'Black';

  // Use enhanced color detection that properly handles "Royal/Black" patterns
  const detectedColor = extractAdvancedColor(message);
  if (detectedColor) {
    // Check if it's a split color
    if (detectedColor.includes('/')) {
      colors = detectedColor.split('/').map(c => c.trim());
      color = detectedColor;
    } else {
      colors = [detectedColor];
      color = detectedColor;
    }
  }

  console.log('🎨 [ANALYZE] Enhanced colors - Previous context:', previousContext.colors, 'Detected color:', detectedColor, 'Final colors:', colors);

  // Extract size - ENHANCED: Use advanced size detection with CM to hat size mapping
  let size = 'Large'; // Default
  const detectedSize = extractAdvancedSize(message);
  if (detectedSize) {
    size = detectedSize;
  }

  // Extract fabric - ENHANCED: Use advanced fabric detection from knowledge base
  let fabric = detectFabricFromText(message);
  console.log('🧵 [ANALYZE] Advanced fabric detection:', {
    message: message.substring(0, 100),
    detectedFabric: fabric
  });

  // Extract panel count and cap specifications - FIXED: Added complete logic with defaults
  let panelCount = '6P'; // Default panel count from business rules
  let capSpecifications: { panelCount?: string; [key: string]: any } = {};
  const msgLower = message.toLowerCase(); // FIXED: Define missing msgLower variable

  if (msgLower.includes('7-panel') || msgLower.includes('7 panel')) {
    panelCount = '7P';
    capSpecifications.panelCount = '7P';
  } else if (msgLower.includes('6-panel') || msgLower.includes('6 panel')) {
    panelCount = '6P';
    capSpecifications.panelCount = '6P';
  } else if (msgLower.includes('5-panel') || msgLower.includes('5 panel')) {
    panelCount = '5P';
    capSpecifications.panelCount = '5P';
  } else if (msgLower.includes('4-panel') || msgLower.includes('4 panel')) {
    panelCount = '4P';
    capSpecifications.panelCount = '4P';
  } else {
    // Set default panel count in capSpecifications
    capSpecifications.panelCount = '6P';
  }

  // Extract closure - ENHANCED: Use advanced closure detection from knowledge base
  let closure = detectClosureFromText(message);
  console.log('🔒 [ANALYZE] Advanced closure detection:', {
    message: message.substring(0, 100),
    detectedClosure: closure
  });

  // Use previous context as fallback if no closure detected in current message
  if (!closure && previousContext.closure) {
    closure = previousContext.closure;
    console.log('🔒 [ANALYZE] Using previous context closure:', closure);
  }

  // Extract logo requirements - ENHANCED: Use advanced logo detection from knowledge base
  let logoRequirements = [];
  const logoDetection = detectAllLogosFromText(message);

  console.log('🎨 [ANALYZE] Advanced logo detection:', {
    message: message.substring(0, 100),
    primaryLogo: logoDetection.primaryLogo,
    allLogos: logoDetection.allLogos,
    hasMultiSetup: !!logoDetection.multiLogoSetup
  });

  // Convert detected logos to requirements format
  if (logoDetection.allLogos && logoDetection.allLogos.length > 0) {
    logoRequirements = logoDetection.allLogos.map(logo => ({
      type: logo.type,
      location: logo.position.charAt(0).toUpperCase() + logo.position.slice(1), // Capitalize
      size: logo.size,
      hasMoldCharge: logo.type.toLowerCase().includes('patch'), // Patches have mold charges
      priority: logo.position === 'front' ? 1 : 2 // Front logos have priority
    }));
  } else if (logoDetection.primaryLogo && logoDetection.primaryLogo !== 'None') {
    // Handle case where primary logo detected but no detailed positions
    logoRequirements.push({
      type: logoDetection.primaryLogo,
      location: 'Front', // Default position
      size: 'Large', // Default size for front
      hasMoldCharge: logoDetection.primaryLogo.toLowerCase().includes('patch'),
      priority: 1
    });
  }

  // Set logo requirement variables
  let logoRequirement = logoRequirements.length > 0 ? logoRequirements[0] : null;
  let allLogoRequirements = logoRequirements;

  // Extract accessories - ENHANCED: Use advanced accessories detection from knowledge base
  let accessoriesFromDetection = detectAccessoriesFromText(message);

  // Convert string array to object format for consistency with manual additions
  let accessoriesRequirements: { type: string; location?: string }[] = accessoriesFromDetection.map(type => ({ type }));

  console.log('🏷️ [ANALYZE] Advanced accessories detection:', {
    message: message.substring(0, 100),
    detectedAccessories: accessoriesRequirements
  });

  // All detection logic replaced with advanced functions from knowledge base

  // Position detection with sub-positions and default sizes
  const getPositionAndSize = (msg: string) => {
    let position = 'Front'; // Default position
    let subPosition = 'Center'; // Default sub-position
    let defaultSize = 'Large'; // Default for Front

    // Main position detection
    if (msg.includes('back')) {
      position = 'Back';
      defaultSize = 'Small';
    } else if (msg.includes('left side') || msg.includes('left')) {
      position = 'Left';
      defaultSize = 'Small';
    } else if (msg.includes('right side') || msg.includes('right')) {
      position = 'Right';
      defaultSize = 'Small';
    } else if (msg.includes('under bill') || msg.includes('underbill')) {
      position = 'Under Bill';
      defaultSize = 'Large';
    } else if (msg.includes('upper bill') || msg.includes('visor')) {
      position = 'Upper Bill';
      defaultSize = 'Medium';
    }

    // Sub-position detection for Front/Back positions
    if (position === 'Front' || position === 'Back') {
      if (msg.includes(position.toLowerCase() + ' left')) {
        subPosition = 'Left';
      } else if (msg.includes(position.toLowerCase() + ' right')) {
        subPosition = 'Right';
      } else if (msg.includes(position.toLowerCase() + ' center')) {
        subPosition = 'Center';
      }
    }

    // Override size if explicitly mentioned
    let finalSize = defaultSize;
    if (msg.includes('small')) finalSize = 'Small';
    if (msg.includes('medium')) finalSize = 'Medium';
    if (msg.includes('large')) finalSize = 'Large';
    if (msg.includes('xl') || msg.includes('extra large')) finalSize = 'XL';

    return {
      position: subPosition === 'Center' ? position : `${position} ${subPosition}`,
      size: finalSize,
      hasSubPosition: subPosition !== 'Center'
    };
  };

  // Enhanced multi-logo detection - detect all logo methods mentioned
  const methodMapping: { [key: string]: string } = {
    '3d_embroidery': '3D Embroidery',
    'flat_embroidery': 'Flat Embroidery',
    'leather_patch': 'Leather Patch',
    'rubber_patch': 'Rubber Patch',
    'direct_print': 'Direct Print',
    'printed_patch': 'Printed Patch',
    'sublimated_patch': 'Sublimated Patch',
    'woven_patch': 'Woven Patch'
  };

  // Specific position-based detection for multiple logos
  // FIXED: Ordered by specificity - most specific patterns first to avoid conflicts
  const logoPatterns = [
    // Most specific patterns first (include position)
    { method: 'leather_patch', position: 'Front', keywords: ['leather patch front', 'leather patch on front'], priority: 1 },
    { method: '3d_embroidery', position: 'Front', keywords: ['3d embroidery on front', '3d embroidery front'], priority: 1 },
    { method: '3d_embroidery', position: 'Left', keywords: ['3d embroidery on left', '3d embroidery left'], priority: 1 },
    { method: '3d_embroidery', position: 'Back', keywords: ['3d embroidery on back', '3d embroidery back'], priority: 1 },
    { method: 'flat_embroidery', position: 'Front', keywords: ['flat embroidery on front', 'flat embroidery front'], priority: 1 },
    { method: 'flat_embroidery', position: 'Right', keywords: ['flat embroidery on right', 'flat embroidery right'], priority: 1 },
    { method: 'flat_embroidery', position: 'Back', keywords: ['flat embroidery on back', 'flat embroidery back'], priority: 1 },
    { method: 'rubber_patch', position: 'Back', keywords: ['rubber patch on back', 'rubber patch back'], priority: 1 },

    // Medium specificity patterns (method + position keywords but flexible)
    { method: '3d_embroidery', position: null, keywords: ['3d embroidery', '3d embroidered'], priority: 2 },
    { method: 'flat_embroidery', position: null, keywords: ['flat embroidery'], priority: 2 },
    { method: 'leather_patch', position: null, keywords: ['leather patch', 'leather label'], priority: 2 },
    { method: 'rubber_patch', position: null, keywords: ['rubber patch', 'rubber label', 'pvc patch'], priority: 2 },
    { method: 'direct_print', position: null, keywords: ['direct print', 'screen print', 'screen printing'], priority: 2 },
    { method: 'printed_patch', position: null, keywords: ['printed patch', 'transfer patch'], priority: 2 },
    { method: 'sublimated_patch', position: null, keywords: ['sublimated patch', 'sublimation patch'], priority: 2 },
    { method: 'woven_patch', position: null, keywords: ['woven patch', 'woven label'], priority: 2 },

    // Fallback pattern for generic embroidery mentions (lowest priority)
    { method: '3d_embroidery', position: null, keywords: ['embroidery', 'embroidered'], priority: 3 }
  ];

  // FIXED: Enhanced pattern matching with priority and duplicate prevention
  const matchedPatterns = [];

  // First pass: collect all matching patterns with their priority
  for (const pattern of logoPatterns) {
    if (pattern.keywords.some(keyword => msgLower.includes(keyword))) {
      matchedPatterns.push(pattern);
    }
  }

  // Sort by priority (lower number = higher priority)
  matchedPatterns.sort((a, b) => a.priority - b.priority);

  // Process patterns and avoid duplicates
  for (const pattern of matchedPatterns) {
    const logoMethod = methodMapping[pattern.method];

    // Use specific position if provided, otherwise detect from message
    let position, size;
    if (pattern.position) {
      position = pattern.position;
      // Set default size based on position
      size = position === 'Front' || position === 'Under Bill' ? 'Large' :
             position === 'Upper Bill' ? 'Medium' : 'Small';
    } else {
      const positionInfo = getPositionAndSize(msgLower);
      position = positionInfo.position;
      size = positionInfo.size;
    }

    // CRITICAL FIX: Check if this position already has ANY logo method assigned
    // This prevents both 3D and Flat embroidery from being applied to the same position
    const positionExists = logoRequirements.some(logo => logo.location === position);

    if (!positionExists) {
      logoRequirements.push({
        type: logoMethod,
        location: position,
        size: size,
        hasMoldCharge: logoMethod === 'Rubber Patch' || logoMethod === 'Leather Patch',
        priority: pattern.priority
      });

      console.log(`🎯 [LOGO-DETECTION] Added: ${logoMethod} at ${position} (priority ${pattern.priority})`);
    } else {
      console.log(`⚠️ [LOGO-DETECTION] Skipped: ${logoMethod} at ${position} (position already has logo)`);
    }
  }

  // Logo requirements already declared above, no need to redeclare

  // Use accessories requirements already declared above

  // Common accessories detection
  if (msgLower.includes('woven label') || msgLower.includes('label')) {
    accessoriesRequirements.push({ type: 'Woven Label', location: 'Back' });
  }
  if (msgLower.includes('hang tag') || msgLower.includes('tag')) {
    accessoriesRequirements.push({ type: 'Hang Tag' });
  }
  if (msgLower.includes('sticker') || msgLower.includes('hologram')) {
    accessoriesRequirements.push({ type: 'Hologram Sticker' });
  }
  if (msgLower.includes('b-tape') || msgLower.includes('btape') || msgLower.includes('b tape')) {
    accessoriesRequirements.push({ type: 'B-Tape Print' });
  }

  return {
    quantity,
    color,
    colors,
    size,
    fabric,
    panelCount,
    closure,
    capSpecifications,
    logoRequirement,
    allLogoRequirements,
    accessoriesRequirements
  };
}

// Step 2: Fetch Blank Cap costs from Supabase
export async function fetchBlankCapCosts(requirements: any) {
  console.log('💰 [BLANK-CAP] Fetching costs for quantity:', requirements.quantity);

  try {
    // Get products from Supabase
    const products = await loadProducts();

    // Find default product (6P AirFrame HSCS) - FIXED to select correct structured variant
    const defaultProduct = products.find(p =>
      p.code === '6P_AIRFRAME_HSCS'
    ) || products.find(p =>
      p.name === '6P AirFrame HSCS'
    ) || products.find(p =>
      p.name.includes('6P AirFrame') && p.structure_type.toLowerCase().includes('structured')
    ) || products[0];

    if (!defaultProduct) {
      throw new Error('No products found in database');
    }

    console.log('🎯 [BLANK-CAP] Selected default product:', {
      name: defaultProduct.name,
      code: defaultProduct.code,
      structure: defaultProduct.structure_type,
      panelCount: defaultProduct.panel_count
    });

    // Get pricing tier
    const pricingTiers = await loadPricingTiers();
    const pricingTier = pricingTiers.find(t => t.id === defaultProduct.pricing_tier_id);

    if (!pricingTier) {
      throw new Error('Pricing tier not found');
    }

    // Calculate unit price based on quantity
    const priceResult = calculatePriceForQuantity(pricingTier, requirements.quantity);
    const unitPrice = priceResult.unitPrice;
    const totalCost = unitPrice * requirements.quantity;

    return {
      productName: defaultProduct.name,
      productCode: defaultProduct.code,
      panelCount: `${defaultProduct.panel_count}P`,
      profile: defaultProduct.profile,
      billShape: defaultProduct.bill_shape,
      structure: defaultProduct.structure_type,
      unitPrice,
      totalCost,
      pricingTier: pricingTier.tier_name
    };

  } catch (error) {
    console.error('❌ [BLANK-CAP] Error fetching costs:', error);
    const errorMessage = error instanceof Error ? error.message : 'Database connection error';
    throw new Error(`Failed to fetch blank cap costs: ${errorMessage}`);
  }
}

// Step 3: Fetch Premium upgrades
export async function fetchPremiumUpgrades(requirements: any) {
  console.log('⭐ [PREMIUM] Fetching premium upgrades');

  const upgrades: any = {
    fabric: null,
    closure: null,
    totalCost: 0
  };

  try {
    // Handle premium fabrics
    if (requirements.fabric) {
      const fabrics = await loadPremiumFabrics();
      const fabric = fabrics.find(f =>
        f.name.toLowerCase().includes(requirements.fabric.toLowerCase())
      );

      if (fabric) {
        const priceResult = calculatePriceForQuantity(fabric, requirements.quantity);
        const unitPrice = priceResult.unitPrice;
        upgrades.fabric = {
          name: fabric.name,
          unitPrice,
          totalCost: unitPrice * requirements.quantity
        };
        upgrades.totalCost += upgrades.fabric.totalCost;
        console.log('✅ [PREMIUM] Found premium fabric:', fabric.name, 'at $', unitPrice, 'each');
      }
    }

    // Handle premium closures
    if (requirements.closure) {
      console.log('🔒 [PREMIUM] Checking closure requirement:', requirements.closure);

      // Load premium closures from database
      const premiumClosures = await supabaseAdmin
        .from('premium_closures')
        .select('*');

      if (premiumClosures.error) {
        console.error('❌ [PREMIUM] Error loading closures:', premiumClosures.error);
      } else {
        console.log('🔒 [PREMIUM] Available closures:', premiumClosures.data?.map(c => c.name));

        // Enhanced closure matching with multiple strategies
        const reqClosure = requirements.closure.toLowerCase().trim();
        console.log('🔒 [PREMIUM] Searching for closure:', reqClosure);

        const closure = premiumClosures.data?.find(c => {
          const dbName = c.name.toLowerCase();

          // Strategy 1: Exact match
          if (dbName === reqClosure) {
            console.log('🎯 [PREMIUM] Exact match found:', c.name);
            return true;
          }

          // Strategy 2: Contains match (db name contains requirement)
          if (dbName.includes(reqClosure)) {
            console.log('🎯 [PREMIUM] Contains match found:', c.name);
            return true;
          }

          // Strategy 3: Reverse contains match (requirement contains db name)
          if (reqClosure.includes(dbName)) {
            console.log('🎯 [PREMIUM] Reverse contains match found:', c.name);
            return true;
          }

          // Strategy 4: Key word matching for common variations
          const keyWords = reqClosure.split(/[\s\-_]+/);
          const dbKeyWords = dbName.split(/[\s\-_]+/);

          for (const keyword of keyWords) {
            if (keyword.length > 2 && dbKeyWords.some(dbWord => dbWord === keyword)) {
              console.log('🎯 [PREMIUM] Keyword match found:', c.name, 'via keyword:', keyword);
              return true;
            }
          }

          return false;
        });

        if (closure) {
          const priceResult = calculatePriceForQuantity(closure, requirements.quantity);
          const unitPrice = priceResult.unitPrice;
          upgrades.closure = {
            name: closure.name,
            unitPrice,
            totalCost: unitPrice * requirements.quantity
          };
          upgrades.totalCost += upgrades.closure.totalCost;
          console.log('✅ [PREMIUM] Found premium closure:', closure.name, 'at $', unitPrice, 'each, total:', upgrades.closure.totalCost);
        } else {
          console.log('ℹ️ [PREMIUM] Closure not premium or not found:', requirements.closure);
          console.log('🔍 [PREMIUM] Available closure names for reference:', premiumClosures.data?.map(c => c.name));
        }
      }
    }

    console.log('⭐ [PREMIUM] Final upgrades:', upgrades);
    return upgrades;

  } catch (error) {
    console.error('❌ [PREMIUM] Error fetching upgrades:', error);
    return upgrades;
  }
}

// Step 4: Fetch Logo setup costs
export async function fetchLogoSetupCosts(requirements: any) {
  console.log('🎨 [LOGO] Fetching logo setup costs');

  // Check for multiple logos first, then fallback to single
  const logoRequirements = requirements.allLogoRequirements || (requirements.logoRequirement ? [requirements.logoRequirement] : []);

  if (logoRequirements.length === 0) {
    return { logos: [], totalCost: 0, summary: 'None' };
  }

  console.log('🎨 [LOGO] Processing', logoRequirements.length, 'logo(s):', logoRequirements.map((l: any) => `${l.type} @ ${l.location}`));

  try {
    const logoMethods = await loadLogoMethods();
    let allLogos = [];
    let totalCostSum = 0;
    let summaryParts = [];

    // Process each logo requirement
    for (const logoReq of logoRequirements) {
      console.log('🎨 [LOGO] Processing:', logoReq.type, logoReq.location, logoReq.size, logoReq.hasMoldCharge ? '(+Mold Charge)' : '');

      // Find matching logo method with enhanced matching logic
      const logoMethod = logoMethods.find(m => {
        // Enhanced name matching to handle "Rubber Patch" -> "Rubber" mappings
        let nameMatch = false;
        const requestType = logoReq.type.toLowerCase();
        const dbName = m.name.toLowerCase();

        // Direct match: database name contains request type
        if (dbName.includes(requestType)) {
          nameMatch = true;
        }
        // Reverse match: request type contains database name (e.g., "Rubber Patch" contains "Rubber")
        else if (requestType.includes(dbName)) {
          nameMatch = true;
        }
        // Specific mappings for common cases
        else if (requestType.includes('rubber') && dbName.includes('rubber')) {
          nameMatch = true;
        }
        else if (requestType.includes('leather') && dbName.includes('leather')) {
          nameMatch = true;
        }
        else if (requestType.includes('embroidery') && dbName.includes('embroidery')) {
          nameMatch = true;
        }

        // Size matching with exact and partial matches
        const requestSize = logoReq.size.toLowerCase();
        const dbSize = m.size.toLowerCase();
        const sizeMatch = dbSize === requestSize || dbSize.includes(requestSize) || requestSize.includes(dbSize);

        const isMatch = nameMatch && sizeMatch;

        if (isMatch) {
          console.log(`✅ [LOGO-MATCH] Found: "${m.name}" (${m.size}) matches "${logoReq.type}" (${logoReq.size})`);
        }

        return isMatch;
      });

      if (!logoMethod) {
        console.log('❌ [LOGO] No match found for:', logoReq.type, logoReq.size, '- skipping');
        continue;
      }

      const priceResult = calculatePriceForQuantity(logoMethod, requirements.quantity);
      const unitPrice = priceResult.unitPrice;
      let logoTotalCost = unitPrice * requirements.quantity;

      // Calculate mold charge from database based on logo size
      let moldCharge = 0;
      if (logoReq.hasMoldCharge) {
        const moldCharges = await loadMoldCharges();
        const moldChargeData = moldCharges.find(mc => mc.size === logoReq.size);

        if (moldChargeData) {
          moldCharge = parseFloat(moldChargeData.charge_amount);
          console.log('💰 [LOGO] Using database mold charge:', logoReq.size, '=', moldCharge, 'for', logoReq.type);
        } else {
          console.warn('⚠️ [LOGO] No mold charge found for size:', logoReq.size, 'for', logoReq.type);
        }
      }

      const totalCostWithMold = logoTotalCost + moldCharge;

      const logo = {
        type: logoMethod.name,
        location: logoReq.location,
        size: logoMethod.size,
        unitPrice,
        totalCost: logoTotalCost,
        moldCharge,
        totalWithMold: totalCostWithMold
      };

      allLogos.push(logo);
      totalCostSum += totalCostWithMold;
      summaryParts.push(`${logo.location}: ${logo.type} (${logo.size})${moldCharge > 0 ? ` +$${moldCharge} mold` : ''}`);

      console.log('✅ [LOGO] Processed:', logo);
    }

    return {
      logos: allLogos,
      totalCost: totalCostSum,
      summary: summaryParts.length > 0 ? summaryParts.join(' | ') : 'None'
    };

  } catch (error) {
    console.error('❌ [LOGO] Error fetching costs:', error);
    return { logos: [], totalCost: 0, summary: 'None' };
  }
}

// Step 5: Fetch Accessories costs
export async function fetchAccessoriesCosts(requirements: any) {
  console.log('🏷️ [ACCESSORIES] Fetching accessories costs');

  if (!requirements.accessoriesRequirements || requirements.accessoriesRequirements.length === 0) {
    console.log('🏷️ [ACCESSORIES] No accessories requirements found');
    return {
      items: [],
      totalCost: 0
    };
  }

  try {
    const accessories = await loadAccessories();
    const accessoryItems = [];
    let totalCost = 0;

    for (const reqAccessory of requirements.accessoriesRequirements) {
      // Find matching accessory in database
      const accessory = accessories.find(a =>
        a.name.toLowerCase().includes(reqAccessory.type.toLowerCase()) ||
        reqAccessory.type.toLowerCase().includes(a.name.toLowerCase())
      );

      if (accessory) {
        const priceResult = calculatePriceForQuantity(accessory, requirements.quantity);
        const unitPrice = priceResult.unitPrice;
        const itemTotalCost = unitPrice * requirements.quantity;

        const accessoryItem = {
          name: accessory.name,
          type: reqAccessory.type,
          location: reqAccessory.location || null,
          unitPrice,
          totalCost: itemTotalCost,
          quantity: requirements.quantity
        };

        accessoryItems.push(accessoryItem);
        totalCost += itemTotalCost;

        console.log('✅ [ACCESSORIES] Added accessory:', {
          name: accessory.name,
          unitPrice,
          totalCost: itemTotalCost
        });
      } else {
        console.error('❌ [ACCESSORIES] Accessory not found in database:', reqAccessory.type);
        throw new Error(`Accessory "${reqAccessory.type}" not found in database. Please add it to the accessories table.`);
      }
    }

    return {
      items: accessoryItems,
      totalCost
    };

  } catch (error) {
    console.error('❌ [ACCESSORIES] Error fetching costs:', error);
    return {
      items: [],
      totalCost: 0
    };
  }
}

// Step 6: Fetch Delivery costs
export async function fetchDeliveryCosts(requirements: any) {
  console.log('🚚 [DELIVERY] Fetching delivery costs');

  try {
    const deliveryMethods = await loadDeliveryMethods();

    // Find Regular Delivery method (our default)
    const regularDelivery = deliveryMethods.find(d =>
      d.name === 'Regular Delivery'
    ) || deliveryMethods.find(d =>
      d.delivery_type === 'regular'
    ) || deliveryMethods[0]; // Fallback to first available

    if (!regularDelivery) {
      throw new Error('Regular delivery method not found');
    }

    const priceResult = calculatePriceForQuantity(regularDelivery, requirements.quantity);
    const unitPrice = priceResult.unitPrice;
    const totalCost = unitPrice * requirements.quantity;

    return {
      method: regularDelivery.name,
      leadTime: `${regularDelivery.delivery_days} days`,
      unitPrice,
      totalCost
    };

  } catch (error) {
    console.error('❌ [DELIVERY] Error fetching costs:', error);
    const errorMessage = error instanceof Error ? error.message : 'Database connection error';
    throw new Error(`Failed to fetch delivery method costs: ${errorMessage}`);
  }
}

// Generate structured AI response
export function generateStructuredResponse(
  capDetails: any,
  premiumUpgrades: any,
  logoSetup: any,
  accessories: any,
  delivery: any
) {
  const total = capDetails.totalCost + (premiumUpgrades.totalCost || 0) + (logoSetup.totalCost || 0) + (accessories.totalCost || 0) + delivery.totalCost;

  // Calculate quantity from cap details (total cost / unit price = quantity)
  const quantity = Math.round(capDetails.totalCost / capDetails.unitPrice);

  let response = `Here's your detailed quote with verified pricing from our database:\n\n`;

  response += `📊 **Cap Style Setup** ✅\n`;
  response += `•${capDetails.productName} (${capDetails.pricingTier})\n`;
  response += `•Base cost: $${capDetails.totalCost.toFixed(2)} ($${capDetails.unitPrice.toFixed(2)}/cap)\n\n`;

  if (premiumUpgrades.fabric || premiumUpgrades.closure) {
    response += `⭐ **Premium Upgrades** ✅\n`;

    if (premiumUpgrades.fabric) {
      const fabricPerCap = premiumUpgrades.fabric.totalCost / quantity;
      response += `•Fabric: ${premiumUpgrades.fabric.name} (+$${premiumUpgrades.fabric.totalCost.toFixed(2)}) ($${fabricPerCap.toFixed(2)}/cap)\n`;
    }

    if (premiumUpgrades.closure) {
      const closurePerCap = premiumUpgrades.closure.totalCost / quantity;
      response += `•Closure: ${premiumUpgrades.closure.name} (+$${premiumUpgrades.closure.totalCost.toFixed(2)}) ($${closurePerCap.toFixed(2)}/cap)\n`;
    }

    response += `\n`;
  }

  if (logoSetup.logos.length > 0) {
    response += `🎨 **Logo Setup** ✅\n`;
    logoSetup.logos.forEach((logo: any) => {
      const logoPerCap = logo.totalCost / quantity;
      response += `•${logo.location}: ${logo.type} (${logo.size}) - $${logo.totalCost.toFixed(2)} ($${logoPerCap.toFixed(2)}/cap)\n`;
    });
    response += `\n`;
  }

  if (accessories.items && accessories.items.length > 0) {
    const accessoryPerCap = accessories.totalCost / quantity;
    response += `🏷️ **Accessories** ✅\n`;
    response += `•Total accessories: $${accessories.totalCost.toFixed(2)} ($${accessoryPerCap.toFixed(2)}/cap)\n\n`;
  }

  const deliveryPerCap = delivery.totalCost / quantity;
  response += `🚚 **Delivery** ✅\n`;
  response += `•Method: ${delivery.method}\n`;
  response += `•Timeline: ${delivery.leadTime}\n`;
  response += `•Cost: $${delivery.totalCost.toFixed(2)} ($${deliveryPerCap.toFixed(2)}/cap)\n\n`;

  const totalPerCap = total / quantity;
  response += `💰 **Total Investment: $${total.toFixed(2)}**\n`;
  response += `**Per Cap Cost: $${totalPerCap.toFixed(2)}**\n\n`;

  response += `📊 **Cost Breakdown Per Cap:**\n`;
  response += `• Base Cap: $${capDetails.unitPrice.toFixed(2)}\n`;
  if (premiumUpgrades.fabric) {
    response += `• Premium Fabric: $${(premiumUpgrades.fabric.totalCost / quantity).toFixed(2)}\n`;
  }
  if (premiumUpgrades.closure) {
    response += `• Premium Closure: $${(premiumUpgrades.closure.totalCost / quantity).toFixed(2)}\n`;
  }
  if (logoSetup.logos.length > 0) {
    logoSetup.logos.forEach((logo: any) => {
      response += `• ${logo.location} Logo: $${(logo.totalCost / quantity).toFixed(2)}\n`;
    });
  }
  if (accessories.items && accessories.items.length > 0) {
    response += `• Accessories: $${(accessories.totalCost / quantity).toFixed(2)}\n`;
  }
  response += `• Delivery: $${deliveryPerCap.toFixed(2)}\n`;
  response += `**= Total: $${totalPerCap.toFixed(2)}/cap**\n\n`;

  response += `✅ All pricing verified from database\n`;
  response += `Would you like to modify any specifications or proceed with this quote?`;

  return response;
}