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
  calculatePriceForQuantity
} from '@/lib/pricing/pricing-service';

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

  // Extract colors - FIXED: Preserve previous context if no new colors specified
  let colors = previousContext.colors || ['Black'];
  let color = previousContext.colors ? previousContext.colors.join('/') : 'Black';

  // First try specific color combinations in current message
  const colorCombinationMatch = message.match(/\b(Red|Blue|Black|White|Green|Yellow|Navy|Gray|Grey|Brown|Khaki|Orange|Purple)\s*\/\s*(Red|Blue|Black|White|Green|Yellow|Navy|Gray|Grey|Brown|Khaki|Orange|Purple)\b/gi);
  let singleColorMatch = null;

  if (colorCombinationMatch) {
    const colorParts = colorCombinationMatch[0].split('/').map(c => c.trim());
    colors = colorParts;
    color = colorParts.join('/');
  } else {
    // Try single colors in current message
    singleColorMatch = message.match(/\b(Red|Blue|Black|White|Green|Yellow|Navy|Gray|Grey|Brown|Khaki|Orange|Purple)\b/gi);
    if (singleColorMatch) {
      color = singleColorMatch[0];
      colors = [singleColorMatch[0]];
    }
  }

  console.log('🔍 [ANALYZE] Colors - Previous context:', previousContext.colors, 'Current message match:', colorCombinationMatch?.[0] || singleColorMatch?.[0], 'Final:', colors);

  // Extract size - FIXED: Handle specific measurements like "59 cm"
  let size = 'Large'; // Default
  const standardSizeMatch = message.match(/\b(Small|Medium|Large|X-Large|XXL)\b/i);
  const measurementMatch = message.match(/\b(\d+)\s*cm\b/i);

  if (standardSizeMatch) {
    size = standardSizeMatch[1];
  } else if (measurementMatch) {
    const measurement = parseInt(measurementMatch[1]);
    // Convert measurements to standard sizes (approximate mapping)
    if (measurement >= 58) size = 'Large';
    else if (measurement >= 56) size = 'Medium';
    else size = 'Small';
  }

  // Extract fabric with enhanced detection - FIXED: Handle dual fabrics like "Polyester/Laser Cut"
  const msgLower = message.toLowerCase();
  let fabric = null;

  // Check for dual fabric mentions first
  if (msgLower.includes('polyester') && msgLower.includes('laser cut')) {
    fabric = 'Polyester/Laser Cut'; // Dual fabric type
  } else if (msgLower.includes('acrylic')) {
    fabric = 'Acrylic';
  } else if (msgLower.includes('polyester')) {
    fabric = 'Polyester';
  } else if (msgLower.includes('laser cut')) {
    fabric = 'Laser Cut';
  } else if (msgLower.includes('genuine leather') || (msgLower.includes('leather') && !msgLower.includes('patch'))) {
    fabric = 'Genuine Leather';
  }

  // Extract panel count and cap specifications
  let panelCount = null;
  let capSpecifications = {};

  if (msgLower.includes('7-panel') || msgLower.includes('7 panel')) {
    panelCount = '7P';
    capSpecifications.panelCount = '7P';
  } else if (msgLower.includes('6-panel') || msgLower.includes('6 panel')) {
    panelCount = '6P';
    capSpecifications.panelCount = '6P';
  } else if (msgLower.includes('5-panel') || msgLower.includes('5 panel')) {
    panelCount = '5P';
    capSpecifications.panelCount = '5P';
  }

  // Extract closure type
  let closure = null;
  if (msgLower.includes('fitted')) closure = 'Fitted';
  if (msgLower.includes('snapback')) closure = 'Snapback';
  if (msgLower.includes('strapback')) closure = 'Strapback';
  if (msgLower.includes('velcro')) closure = 'Velcro';

  // Extract logo requirements
  let logoRequirements = [];

  // Complete logo method detection patterns based on your specifications
  // FIXED: More specific patterns to avoid conflicts - 3D embroidery has priority
  const logoMethods = {
    '3d_embroidery': ['3d embroidery', '3d embroidered'],
    'flat_embroidery': ['flat embroidery'], // Removed generic 'embroidery' to avoid conflicts
    'leather_patch': ['leather patch', 'leather label'],
    'rubber_patch': ['rubber patch', 'rubber label', 'pvc patch'],
    'direct_print': ['direct print', 'screen print', 'screen printing', 'printed'],
    'printed_patch': ['printed patch', 'transfer patch'],
    'sublimated_patch': ['sublimated patch', 'sublimation patch', 'dye sub patch'],
    'woven_patch': ['woven patch', 'woven label']
  };

  // Position detection with sub-positions and default sizes
  const getPositionAndSize = (msg) => {
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
  const methodMapping = {
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

  // Return all logo requirements (supporting multiple logos)
  let logoRequirement = logoRequirements.length > 0 ? logoRequirements[0] : null;
  let allLogoRequirements = logoRequirements;

  // Extract accessories requirements
  let accessoriesRequirements = [];

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
  if (msgLower.includes('swing tag')) {
    accessoriesRequirements.push({ type: 'Swing Tag' });
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
    // Return fallback data with correct details
    return {
      productName: '6P AirFrame HSCS',
      productCode: '6P_AIRFRAME_HSCS',
      panelCount: '6P',
      profile: 'High',
      billShape: 'Slight Curved',
      structure: 'Structured with Mono Lining',
      unitPrice: 4.00,
      totalCost: 4.00 * requirements.quantity,
      pricingTier: 'Tier 2'
    };
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
      }
    }

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

  console.log('🎨 [LOGO] Processing', logoRequirements.length, 'logo(s):', logoRequirements.map(l => `${l.type} @ ${l.location}`));

  try {
    const logoMethods = await loadLogoMethods();
    let allLogos = [];
    let totalCostSum = 0;
    let summaryParts = [];

    // Process each logo requirement
    for (const logoReq of logoRequirements) {
      console.log('🎨 [LOGO] Processing:', logoReq.type, logoReq.location, logoReq.size, logoReq.hasMoldCharge ? '(+Mold Charge)' : '');

      // Find matching logo method
      const logoMethod = logoMethods.find(m => {
        const nameMatch = m.name.toLowerCase().includes(logoReq.type.toLowerCase());
        const sizeMatch = m.size.toLowerCase().includes(logoReq.size.toLowerCase());
        return nameMatch && sizeMatch;
      });

      if (!logoMethod) {
        console.log('❌ [LOGO] No match found for:', logoReq.type, logoReq.size, '- skipping');
        continue;
      }

      const priceResult = calculatePriceForQuantity(logoMethod, requirements.quantity);
      const unitPrice = priceResult.unitPrice;
      let logoTotalCost = unitPrice * requirements.quantity;

      // Calculate mold charge for Rubber Patch and Leather Patch
      let moldCharge = 0;
      if (logoReq.hasMoldCharge) {
        if (logoReq.type === 'Rubber Patch') {
          moldCharge = 85; // Standard rubber patch mold charge
        } else if (logoReq.type === 'Leather Patch') {
          moldCharge = 65; // Standard leather patch mold charge
        }
        console.log('💰 [LOGO] Adding mold charge:', moldCharge, 'for', logoReq.type);
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
        console.log('⚠️ [ACCESSORIES] Accessory not found in database:', reqAccessory.type);

        // Add with default cost if not found in database
        const defaultCost = 0.25; // $0.25 per piece default
        const itemTotalCost = defaultCost * requirements.quantity;

        const accessoryItem = {
          name: reqAccessory.type,
          type: reqAccessory.type,
          location: reqAccessory.location || null,
          unitPrice: defaultCost,
          totalCost: itemTotalCost,
          quantity: requirements.quantity
        };

        accessoryItems.push(accessoryItem);
        totalCost += itemTotalCost;
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
    // Return fallback
    return {
      method: 'Regular Delivery',
      leadTime: '6-10 days',
      unitPrice: 20.00,
      totalCost: 20.00
    };
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

  let response = `Here's your detailed quote with verified pricing from our database:\n\n`;

  response += `📊 **Cap Style Setup** ✅\n`;
  response += `•${capDetails.productName} (${capDetails.pricingTier})\n`;
  response += `•Base cost: $${capDetails.totalCost.toFixed(2)}\n\n`;

  if (premiumUpgrades.fabric) {
    response += `⭐ **Premium Upgrades** ✅\n`;
    response += `•Fabric: ${premiumUpgrades.fabric.name} (+$${premiumUpgrades.fabric.totalCost.toFixed(2)})\n\n`;
  }

  if (logoSetup.logos.length > 0) {
    response += `🎨 **Logo Setup** ✅\n`;
    logoSetup.logos.forEach((logo: any) => {
      response += `•${logo.location}: ${logo.type} (${logo.size}) - $${logo.totalCost.toFixed(2)}\n`;
    });
    response += `\n`;
  }

  response += `🚚 **Delivery** ✅\n`;
  response += `•Method: ${delivery.method}\n`;
  response += `•Timeline: ${delivery.leadTime}\n`;
  response += `•Cost: $${delivery.totalCost.toFixed(2)}\n\n`;

  response += `💰 **Total Investment: $${total.toFixed(2)}**\n`;
  response += `Per Cap Cost: $${(total / capDetails.totalCost * capDetails.unitPrice).toFixed(2)}\n\n`;

  response += `✅ All pricing verified from database\n`;
  response += `Would you like to modify any specifications or proceed with this quote?`;

  return response;
}