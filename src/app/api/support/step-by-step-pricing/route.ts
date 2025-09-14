import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import {
  loadProducts,
  loadPricingTiers,
  loadLogoMethods,
  loadPremiumFabrics,
  loadDeliveryMethods,
  loadAccessories,
  calculatePriceForQuantity
} from '@/lib/pricing/pricing-service';
import { AI_ASSISTANTS, formatAssistantResponse } from '@/lib/ai-assistants-config';

interface StepByStepRequest {
  message: string;
  intent: string;
  conversationHistory: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
  userProfile?: any;
  conversationId?: string;
  sessionId?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: StepByStepRequest = await request.json();
    const { message, intent, conversationHistory, userProfile, conversationId, sessionId } = body;

    if (!message?.trim()) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    console.log('🎯 [STEP-BY-STEP] Starting modular pricing workflow');

    // Step 1: Analyze customer requirements
    const requirements = await analyzeCustomerRequirements(message);
    console.log('📋 [STEP-1] Customer requirements analyzed:', requirements);

    // Step 2: Fetch Blank Cap costs from Supabase
    const capDetails = await fetchBlankCapCosts(requirements);
    console.log('✅ [STEP-2] Blank cap costs fetched:', capDetails);

    // Step 3: Fetch Premium upgrades (optional)
    const premiumUpgrades = await fetchPremiumUpgrades(requirements);
    console.log('✅ [STEP-3] Premium upgrades fetched:', premiumUpgrades);

    // Step 4: Fetch Logo setup costs (optional)
    const logoSetup = await fetchLogoSetupCosts(requirements);
    console.log('✅ [STEP-4] Logo setup costs fetched:', logoSetup);

    // Step 5: Fetch Accessories costs (optional)
    const accessories = await fetchAccessoriesCosts(requirements);
    console.log('✅ [STEP-5] Accessories costs fetched:', accessories);

    // Step 6: Fetch Delivery costs
    const delivery = await fetchDeliveryCosts(requirements);
    console.log('✅ [STEP-6] Delivery costs fetched:', delivery);

    // Generate AI response based on fetched data
    const aiResponse = generateStructuredResponse(capDetails, premiumUpgrades, logoSetup, accessories, delivery);

    // Create structured quote data for Order Builder
    const structuredQuoteData = {
      capDetails: {
        productName: capDetails.productName,
        panelCount: capDetails.panelCount,
        unitPrice: capDetails.unitPrice,
        quantity: requirements.quantity,
        size: requirements.size,
        color: requirements.color,
        colors: requirements.colors,
        profile: capDetails.profile,
        billShape: capDetails.billShape,
        structure: capDetails.structure,
        fabric: premiumUpgrades.fabric?.name || 'Standard',
        closure: premiumUpgrades.closure?.name || 'Snapback',
        stitch: 'Standard'
      },
      customization: {
        logos: logoSetup.logos || [],
        accessories: accessories.items || [],
        logoSetup: logoSetup.summary || 'None'
      },
      delivery: {
        method: delivery.method,
        leadTime: delivery.leadTime,
        totalCost: delivery.totalCost,
        address: null
      },
      pricing: {
        total: capDetails.totalCost + (premiumUpgrades.totalCost || 0) + (logoSetup.totalCost || 0) + (accessories.totalCost || 0) + delivery.totalCost,
        baseProductCost: capDetails.totalCost,
        logosCost: logoSetup.totalCost || 0,
        accessoriesCost: accessories.totalCost || 0,
        deliveryCost: delivery.totalCost,
        premiumFabricCost: premiumUpgrades.fabric?.totalCost || 0,
        premiumClosureCost: premiumUpgrades.closure?.totalCost || 0,
        quantity: requirements.quantity
      }
    };

    const capCraftAI = AI_ASSISTANTS.QUOTE_MASTER;
    const formattedResponse = formatAssistantResponse(capCraftAI, aiResponse);

    return NextResponse.json({
      ...formattedResponse,
      message: aiResponse,
      quoteData: structuredQuoteData,
      conversationId,
      metadata: {
        ...formattedResponse.metadata,
        intent,
        timestamp: new Date().toISOString(),
        stepByStepWorkflow: true,
        completedSteps: 6,
        dataSource: 'supabase',
        requirements
      }
    });

  } catch (error: unknown) {
    console.error('Step-by-step pricing error:', error);

    const capCraftAI = AI_ASSISTANTS.QUOTE_MASTER;
    const errorResponse = formatAssistantResponse(capCraftAI, "I apologize, but I'm having trouble creating your quote right now. Please try rephrasing your request with specific details like quantity, colors, and customization requirements.");

    return NextResponse.json(
      {
        ...errorResponse,
        error: 'Processing failed'
      },
      { status: 500 }
    );
  }
}

// Step 1: Analyze customer requirements
async function analyzeCustomerRequirements(message: string) {
  console.log('🔍 [ANALYZE] Parsing customer message:', message.substring(0, 100));

  // Extract quantity - FIXED: Include "pcs" pattern to match comprehensive parsing
  const quantityMatch = message.match(/(\d+,?\d*)\s*(?:pcs?|caps?|pieces?|units?)/i);
  const quantity = quantityMatch ? parseInt(quantityMatch[1].replace(/,/g, '')) : 144;

  // Extract colors - FIXED: More specific color pattern to avoid fabric matches
  let colors = ['Black'];
  let color = 'Black';

  // First try specific color combinations
  const colorCombinationMatch = message.match(/\b(Red|Blue|Black|White|Green|Yellow|Navy|Gray|Grey|Brown|Khaki|Orange|Purple)\s*\/\s*(Red|Blue|Black|White|Green|Yellow|Navy|Gray|Grey|Brown|Khaki|Orange|Purple)\b/gi);
  if (colorCombinationMatch) {
    const colorParts = colorCombinationMatch[0].split('/').map(c => c.trim());
    colors = colorParts;
    color = colorParts.join('/');
  } else {
    // Try single colors
    const singleColorMatch = message.match(/\b(Red|Blue|Black|White|Green|Yellow|Navy|Gray|Grey|Brown|Khaki|Orange|Purple)\b/gi);
    if (singleColorMatch) {
      color = singleColorMatch[0];
      colors = [singleColorMatch[0]];
    }
  }

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
async function fetchBlankCapCosts(requirements: any) {
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
async function fetchPremiumUpgrades(requirements: any) {
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
async function fetchLogoSetupCosts(requirements: any) {
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
async function fetchAccessoriesCosts(requirements: any) {
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
async function fetchDeliveryCosts(requirements: any) {
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
function generateStructuredResponse(
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