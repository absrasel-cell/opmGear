/**
 * AI-Specific Pricing Service
 * ONLY uses CSV files from /ai/Options/ directory
 * Completely separate from Advanced Product Page pricing
 */

import { promises as fs } from 'fs';
import path from 'path';

// Cache for AI pricing data - CLEARED TO FIX PREMIUM FABRIC PRICING BUG
let cachedAIAccessories: any[] | null = null;
let cachedAILogo: any[] | null = null;
let cachedAIClosure: any[] | null = null;
let cachedAIFabric: any[] | null = null; // Reset cache to force fresh fabric pricing load
let cachedAIDelivery: any[] | null = null;
let cachedAIBlankCaps: any[] | null = null;
let cachedCustomerProducts: any[] | null = null;

// Helper function to parse CSV lines
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current);
  return result;
}

// Load AI Accessories pricing
async function loadAIAccessories(): Promise<any[]> {
  if (cachedAIAccessories) {
    return cachedAIAccessories;
  }
  
  try {
    const csvPath = path.join(process.cwd(), 'src/app/ai/Options/Accessories.csv');
    const csvContent = await fs.readFile(csvPath, 'utf-8');
    
    const lines = csvContent.split('\n').filter(line => line.trim());
    const dataLines = lines.slice(1); // Skip header
    
    cachedAIAccessories = dataLines.map(line => {
      const values = parseCSVLine(line);
      return {
        Name: (values[0] || '').replace(/"/g, '').trim(),
        price48: parseFloat(values[1]) || 0,
        price144: parseFloat(values[2]) || 0,
        price576: parseFloat(values[3]) || 0,
        price1152: parseFloat(values[4]) || 0,
        price2880: parseFloat(values[5]) || 0,
        price10000: parseFloat(values[6]) || 0,
        price20000: parseFloat(values[7]) || 0,
        margin: parseFloat(values[8]) || 60
      };
    }).filter(item => item.Name && item.Name.length > 0);
    
    console.log(`✅ [AI-PRICING] Loaded ${cachedAIAccessories.length} accessories from AI CSV`);
    return cachedAIAccessories;
  } catch (error) {
    console.error('❌ [AI-PRICING] Error loading AI accessories:', error);
    return [];
  }
}

// Load AI Logo pricing
async function loadAILogo(): Promise<any[]> {
  if (cachedAILogo) {
    return cachedAILogo;
  }
  
  try {
    const csvPath = path.join(process.cwd(), 'src/app/ai/Options/Logo.csv');
    const csvContent = await fs.readFile(csvPath, 'utf-8');
    
    const lines = csvContent.split('\n').filter(line => line.trim());
    const dataLines = lines.slice(1); // Skip header
    
    cachedAILogo = dataLines.map(line => {
      const values = parseCSVLine(line);
      return {
        Name: (values[0] || '').replace(/"/g, '').trim(),
        Application: (values[1] || '').replace(/"/g, '').trim(),
        Size: (values[2] || '').replace(/"/g, '').trim(),
        SizeExample: (values[3] || '').replace(/"/g, '').trim(),
        price48: parseFloat(values[4]) || 0,
        price144: parseFloat(values[5]) || 0,
        price576: parseFloat(values[6]) || 0,
        price1152: parseFloat(values[7]) || 0,
        price2880: parseFloat(values[8]) || 0,
        price10000: parseFloat(values[9]) || 0,
        price20000: parseFloat(values[10]) || 0,
        MoldCharge: (values[11] || '').replace(/"/g, '').trim(),
        margin: parseFloat(values[12]) || 60
      };
    }).filter(item => item.Name && item.Name.length > 0);
    
    console.log(`✅ [AI-PRICING] Loaded ${cachedAILogo.length} logo options from AI CSV`);
    return cachedAILogo;
  } catch (error) {
    console.error('❌ [AI-PRICING] Error loading AI logo pricing:', error);
    return [];
  }
}

// Load AI Closure pricing
async function loadAIClosure(): Promise<any[]> {
  if (cachedAIClosure) {
    return cachedAIClosure;
  }
  
  try {
    const csvPath = path.join(process.cwd(), 'src/app/ai/Options/Closure.csv');
    const csvContent = await fs.readFile(csvPath, 'utf-8');
    
    const lines = csvContent.split('\n').filter(line => line.trim());
    const dataLines = lines.slice(1); // Skip header
    
    cachedAIClosure = dataLines.map(line => {
      const values = parseCSVLine(line);
      return {
        Name: (values[0] || '').replace(/"/g, '').trim(),
        type: (values[1] || '').replace(/"/g, '').trim(),
        price48: parseFloat(values[2]) || 0,
        price144: parseFloat(values[3]) || 0,
        price576: parseFloat(values[4]) || 0,
        price1152: parseFloat(values[5]) || 0,
        price2880: parseFloat(values[6]) || 0,
        price10000: parseFloat(values[7]) || 0,
        price20000: parseFloat(values[8]) || 0,
        Comment: (values[9] || '').replace(/"/g, '').trim(),
        margin: parseFloat(values[10]) || 60
      };
    }).filter(item => item.Name && item.Name.length > 0);
    
    console.log(`✅ [AI-PRICING] Loaded ${cachedAIClosure.length} closure options from AI CSV`);
    return cachedAIClosure;
  } catch (error) {
    console.error('❌ [AI-PRICING] Error loading AI closure pricing:', error);
    return [];
  }
}

// Load AI Fabric pricing
async function loadAIFabric(): Promise<any[]> {
  if (cachedAIFabric) {
    return cachedAIFabric;
  }
  
  try {
    const csvPath = path.join(process.cwd(), 'src/app/ai/Options/Fabric.csv');
    const csvContent = await fs.readFile(csvPath, 'utf-8');
    
    const lines = csvContent.split('\n').filter(line => line.trim());
    const dataLines = lines.slice(1); // Skip header
    
    cachedAIFabric = dataLines.map(line => {
      const values = parseCSVLine(line);
      return {
        Name: (values[0] || '').replace(/"/g, '').trim(),
        costType: (values[1] || '').replace(/"/g, '').trim(),
        ColorNote: (values[2] || '').replace(/"/g, '').trim(),
        price48: parseFloat(values[3]) || 0,
        price144: parseFloat(values[4]) || 0,
        price576: parseFloat(values[5]) || 0,
        price1152: parseFloat(values[6]) || 0,
        price2880: parseFloat(values[7]) || 0,
        price10000: parseFloat(values[8]) || 0,
        price20000: parseFloat(values[9]) || 0,
        margin: parseFloat(values[10]) || 60
      };
    }).filter(item => item.Name && item.Name.length > 0);
    
    console.log(`✅ [AI-PRICING] Loaded ${cachedAIFabric.length} fabric options from AI CSV`);
    return cachedAIFabric;
  } catch (error) {
    console.error('❌ [AI-PRICING] Error loading AI fabric pricing:', error);
    return [];
  }
}

// Load AI Delivery pricing
async function loadAIDelivery(): Promise<any[]> {
  if (cachedAIDelivery) {
    return cachedAIDelivery;
  }
  
  try {
    const csvPath = path.join(process.cwd(), 'src/app/ai/Options/Delivery.csv');
    const csvContent = await fs.readFile(csvPath, 'utf-8');
    
    const lines = csvContent.split('\n').filter(line => line.trim());
    const dataLines = lines.slice(1); // Skip header
    
    cachedAIDelivery = dataLines.map(line => {
      const values = parseCSVLine(line);
      return {
        Name: (values[0] || '').replace(/"/g, '').trim(),
        type: (values[1] || '').replace(/"/g, '').trim(),
        DeliveryDays: (values[2] || '').replace(/"/g, '').trim(),
        price48: values[3] === 'Not Applicable' ? 0 : (parseFloat(values[3]) || 0),
        price144: values[4] === 'Not Applicable' ? 0 : (parseFloat(values[4]) || 0),
        price576: values[5] === 'Not Applicable' ? 0 : (parseFloat(values[5]) || 0),
        price1152: values[6] === 'Not Applicable' ? 0 : (parseFloat(values[6]) || 0),
        price2880: values[7] === 'Not Applicable' ? 0 : (parseFloat(values[7]) || 0),
        price10000: parseFloat(values[8]) || 0,
        price20000: parseFloat(values[9]) || 0,
        margin: parseFloat(values[10]) || 30
      };
    }).filter(item => item.Name && item.Name.length > 0);
    
    console.log(`✅ [AI-PRICING] Loaded ${cachedAIDelivery.length} delivery options from AI CSV`);
    return cachedAIDelivery;
  } catch (error) {
    console.error('❌ [AI-PRICING] Error loading AI delivery pricing:', error);
    return [];
  }
}

// Load blank cap pricing (AI-SPECIFIC from priceTier.csv)
async function loadAIBlankCaps(): Promise<any> {
  if (cachedAIBlankCaps) {
    return cachedAIBlankCaps;
  }
  
  try {
    // 🚨 CRITICAL FIX: Load from the correct AI-specific priceTier.csv file
    const csvPath = path.join(process.cwd(), 'src/app/ai/Blank Cap/priceTier.csv');
    const csvContent = await fs.readFile(csvPath, 'utf-8');
    
    const lines = csvContent.split('\n').filter(line => line.trim());
    const dataLines = lines.slice(1); // Skip header
    
    const pricingMap: any = {};
    dataLines.forEach(line => {
      const values = parseCSVLine(line);
      const tierName = (values[0] || '').replace(/"/g, '').trim();
      if (tierName) {
        pricingMap[tierName] = {
          price48: parseFloat(values[1]) || 0,
          price144: parseFloat(values[2]) || 0,
          price576: parseFloat(values[3]) || 0,
          price1152: parseFloat(values[4]) || 0,
          price2880: parseFloat(values[5]) || 0,
          price10000: parseFloat(values[6]) || 0
        };
      }
    });
    
    cachedAIBlankCaps = pricingMap;
    console.log(`✅ [AI-PRICING] Loaded blank cap pricing for AI`);
    return cachedAIBlankCaps;
  } catch (error) {
    console.error('❌ [AI-PRICING] Error loading AI blank cap pricing:', error);
    return {};
  }
}

// Get price for quantity from specific pricing data
function getPriceForQuantity(pricingData: any, quantity: number): number {
  if (!pricingData) return 0;
  
  // 🚨 PRODUCTION CRITICAL: Log pricing for ALL quantities to debug issues
  const isTestQuantity = [150, 288, 576, 1152, 2500].includes(quantity);
  if (isTestQuantity || quantity >= 1000) {
    console.log(`🔍 [AI-PRICING] TIER DETECTION - getPriceForQuantity:`, {
      quantity,
      itemName: pricingData.Name,
      available_prices: {
        price48: pricingData.price48,
        price144: pricingData.price144,
        price576: pricingData.price576,
        price1152: pricingData.price1152,
        price2880: pricingData.price2880,
        price10000: pricingData.price10000,
        price20000: pricingData.price20000
      }
    });
  }
  
  let selectedPrice = 0;
  let selectedTier = '';
  
  // 🚨 PRODUCTION CRITICAL FIX: Correct tier boundaries for accurate pricing
  // FIXED: Use EXACT tier boundaries matching CSV price column names
  // 150 pieces MUST use price144 ($4.25 for Tier 2), NOT price48 ($5.50)
  if (quantity >= 20000) {
    selectedPrice = pricingData.price20000 || pricingData.price10000 || 0;
    selectedTier = 'price20000';
  } else if (quantity >= 10000) {
    selectedPrice = pricingData.price10000 || 0;
    selectedTier = 'price10000';
  } else if (quantity >= 2880) {  // 🚨 PRODUCTION CRITICAL: Exact boundary for price2880 tier
    selectedPrice = pricingData.price2880 || 0;
    selectedTier = 'price2880';
  } else if (quantity >= 1152) {  // 🚨 PRODUCTION CRITICAL: Exact boundary for price1152 tier
    selectedPrice = pricingData.price1152 || 0;
    selectedTier = 'price1152';
  } else if (quantity >= 576) {   // 🚨 PRODUCTION CRITICAL: Exact boundary for price576 tier
    selectedPrice = pricingData.price576 || 0;
    selectedTier = 'price576';
  } else if (quantity >= 144) {   // 🚨 PRODUCTION CRITICAL: 150 pieces uses price144 tier ($4.25)
    selectedPrice = pricingData.price144 || 0;
    selectedTier = 'price144';
  } else if (quantity >= 48) {
    selectedPrice = pricingData.price48 || 0;
    selectedTier = 'price48';
  } else {
    // For quantities less than 48, we still use price48 tier as the base price
    selectedPrice = pricingData.price48 || 0;
    selectedTier = 'price48';
  }
  
  // 🚨 PRODUCTION CRITICAL: Log tier selection for debugging
  if (isTestQuantity || quantity >= 1000) {
    console.log(`💰 [AI-PRICING] TIER SELECTION for ${pricingData.Name}:`, {
      quantity,
      selectedTier,
      selectedPrice,
      expectedFor150: quantity === 150 ? 'Should use price144 ($4.25 for Tier 2)' : 'N/A',
      expectedFor288: quantity === 288 ? 'Should use price144 ($4.25 for Tier 2)' : 'N/A',
      expectedFor2500: quantity === 2500 ? 'Should use price2880 ($3.50 for Tier 2)' : 'N/A'
    });
  }
  
  return selectedPrice;
}

// Load Customer Products CSV for product-tier mapping
async function loadCustomerProducts(): Promise<any[]> {
  if (cachedCustomerProducts) {
    return cachedCustomerProducts;
  }
  
  try {
    const csvPath = path.join(process.cwd(), 'src/app/csv/Customer Products.csv');
    const csvContent = await fs.readFile(csvPath, 'utf-8');
    
    const lines = csvContent.split('\n').filter(line => line.trim());
    const dataLines = lines.slice(1); // Skip header
    
    cachedCustomerProducts = dataLines.map(line => {
      const values = parseCSVLine(line);
      return {
        Name: (values[0] || '').replace(/"/g, '').trim(),
        Profile: (values[1] || '').replace(/"/g, '').trim(),
        billOrVisorShape: (values[2] || '').replace(/"/g, '').trim(),
        panelCount: (values[3] || '').replace(/"/g, '').trim(),
        priceTier: (values[4] || '').replace(/"/g, '').trim(),
        structureType: (values[5] || '').replace(/"/g, '').trim(),
        nickNames: (values[6] || '').replace(/"/g, '').trim()
      };
    }).filter(item => item.Name && item.Name.length > 0 && item.priceTier);
    
    console.log(`✅ [AI-PRICING] Loaded ${cachedCustomerProducts.length} customer products from CSV`);
    return cachedCustomerProducts;
  } catch (error) {
    console.error('❌ [AI-PRICING] Error loading Customer Products CSV:', error);
    return [];
  }
}

/**
 * Find the correct tier for a product based on description matching
 */
export async function findProductTierFromDescription(description: string): Promise<string> {
  const products = await loadCustomerProducts();
  
  if (!products.length) {
    console.warn('⚠️ [AI-PRICING] No customer products loaded, falling back to Tier 1 (most common)');
    return 'Tier 1';
  }
  
  const lowerDescription = description.toLowerCase();
  console.log(`🔍 [AI-PRICING] Searching for product tier from description: "${description}"`);
  
  // Score-based matching for best product match
  let bestMatch = null;
  let bestScore = 0;
  
  for (const product of products) {
    let score = 0;
    const productName = product.Name.toLowerCase();
    const nickNames = product.nickNames.toLowerCase();
    const allMatchable = `${productName} ${nickNames} ${product.Profile.toLowerCase()} ${product.billOrVisorShape.toLowerCase()} ${product.panelCount.toLowerCase()} ${product.structureType.toLowerCase()}`;
    
    // Score based on keyword matches
    const keywords = [
      // Panel count
      '4-panel', '4 panel', '5-panel', '5 panel', '6-panel', '6 panel', '7-panel', '7 panel',
      // Profile
      'high', 'mid', 'low', 'medium',
      // Bill shape
      'curved', 'flat', 'slight curved', 'flatbill',
      // Structure
      'structured', 'unstructured', 'foam', 'soft',
      // Common names
      'trucker', 'baseball', 'snapback', 'dad hat', 'fitted',
      // Fabric indicators
      'mesh', 'twill', 'cotton', 'polyester'
    ];
    
    for (const keyword of keywords) {
      if (lowerDescription.includes(keyword) && allMatchable.includes(keyword)) {
        score += 2;
      }
    }
    
    // Special scoring for fabric mentions (Duck Camo = premium fabric)
    if (lowerDescription.includes('duck camo') || lowerDescription.includes('camo')) {
      if (allMatchable.includes('trucker') || allMatchable.includes('mesh')) {
        score += 5; // Bonus for trucker/mesh caps with camo (common combo)
      }
    }
    
    // Special scoring for trucker mesh backs
    if (lowerDescription.includes('trucker mesh') && allMatchable.includes('trucker')) {
      score += 10;
    }
    
    if (score > bestScore) {
      bestScore = score;
      bestMatch = product;
    }
  }
  
  if (bestMatch && bestScore > 0) {
    console.log(`✅ [AI-PRICING] Found best product match: "${bestMatch.Name}" (${bestMatch.priceTier}) with score ${bestScore}`);
    console.log(`📊 [AI-PRICING] Product details:`, {
      name: bestMatch.Name,
      profile: bestMatch.Profile,
      billShape: bestMatch.billOrVisorShape,
      panelCount: bestMatch.panelCount,
      structure: bestMatch.structureType,
      tier: bestMatch.priceTier
    });
    return bestMatch.priceTier;
  }
  
  // If no good match, try simpler heuristics based on description patterns
  console.log('🔄 [AI-PRICING] No specific product match, using heuristics...');
  
  // 🚨 CORRECTED BUSINESS RULES: Proper tier detection based on panel count and bill shape
  // 5-Panel Curved: Tier 1 | 5-Panel Flat/Slight Curved: Tier 2 | 6-Panel Curved: Tier 1 | 6-Panel Flat/Slight Curved: Tier 2 | 7-Panel: ALL Tier 3
  
  // 7-Panel caps are always Tier 3
  if (lowerDescription.includes('7') && (lowerDescription.includes('panel') || lowerDescription.includes('crown'))) {
    console.log('📊 [AI-PRICING] 7-Panel detected → Tier 3');
    return 'Tier 3';
  }
  
  // 6-Panel caps: Curved Bill = Tier 1, Flat/Slight Curved = Tier 2
  if (lowerDescription.includes('6') && lowerDescription.includes('panel')) {
    if (lowerDescription.includes('curved') && !lowerDescription.includes('flat') && !lowerDescription.includes('slight')) {
      console.log('📊 [AI-PRICING] 6-Panel Curved Bill → Tier 1');
      return 'Tier 1';
    } else {
      console.log('📊 [AI-PRICING] 6-Panel Flat/Slight Curved → Tier 2');
      return 'Tier 2';
    }
  }
  
  // 5-Panel caps: Curved = Tier 1, Flat/Slight Curved = Tier 2
  if (lowerDescription.includes('5') && lowerDescription.includes('panel')) {
    if (lowerDescription.includes('curved') && !lowerDescription.includes('flat') && !lowerDescription.includes('slight')) {
      console.log('📊 [AI-PRICING] 5-Panel Curved Bill → Tier 1');
      return 'Tier 1';
    } else {
      console.log('📊 [AI-PRICING] 5-Panel Flat/Slight Curved → Tier 2');
      return 'Tier 2';
    }
  }
  
  // Default for standard orders when panel count is unclear - assume 6-Panel Heritage (most common)
  console.log('📊 [AI-PRICING] Standard order, defaulting to 6-Panel Heritage → Tier 2');
  return 'Tier 2';
}

// PUBLIC API FUNCTIONS

/**
 * Get AI-specific accessory price
 */
export async function getAIAccessoryPrice(accessoryName: string, quantity: number): Promise<number> {
  const accessories = await loadAIAccessories();
  const accessory = accessories.find(item => 
    item.Name.toLowerCase() === accessoryName.toLowerCase()
  );
  
  if (!accessory) {
    throw new Error(`❌ [AI-PRICING] Accessory not found in AI CSV: ${accessoryName}`);
  }
  
  const unitPrice = getPriceForQuantity(accessory, quantity);
  console.log(`💰 [AI-PRICING] ${accessoryName}: $${unitPrice} per unit at ${quantity} qty`);
  return unitPrice;
}

/**
 * Get AI-specific logo price
 */
export async function getAILogoPrice(logoName: string, size: string, application: string, quantity: number): Promise<{unitPrice: number, moldCharge: number}> {
  const logos = await loadAILogo();
  const logo = logos.find(item => 
    item.Name.toLowerCase().includes(logoName.toLowerCase()) &&
    item.Size.toLowerCase() === size.toLowerCase() &&
    item.Application.toLowerCase() === application.toLowerCase()
  );
  
  if (!logo) {
    throw new Error(`❌ [AI-PRICING] Logo not found in AI CSV: ${logoName} ${size} ${application}`);
  }
  
  const unitPrice = getPriceForQuantity(logo, quantity);
  
  // Calculate mold charge
  let moldCharge = 0;
  if (logo.MoldCharge) {
    if (logo.MoldCharge === 'Small Mold Charge') moldCharge = 50;
    else if (logo.MoldCharge === 'Medium Mold Charge') moldCharge = 80;
    else if (logo.MoldCharge === 'Large Mold Charge') moldCharge = 120;
  }
  
  console.log(`🎨 [AI-PRICING] ${logoName} ${size}: $${unitPrice} per unit + $${moldCharge} mold at ${quantity} qty`);
  return { unitPrice, moldCharge };
}

/**
 * Get AI-specific closure price  
 */
export async function getAIClosurePrice(closureName: string, quantity: number): Promise<number> {
  const closures = await loadAIClosure();
  const closure = closures.find(item => 
    item.Name.toLowerCase() === closureName.toLowerCase()
  );
  
  if (!closure) {
    throw new Error(`❌ [AI-PRICING] Closure not found in AI CSV: ${closureName}`);
  }
  
  const unitPrice = getPriceForQuantity(closure, quantity);
  console.log(`🔒 [AI-PRICING] ${closureName}: $${unitPrice} per unit at ${quantity} qty`);
  return unitPrice;
}

/**
 * Get AI-specific fabric price
 */
export async function getAIFabricPrice(fabricName: string, quantity: number): Promise<number> {
  const fabrics = await loadAIFabric();
  
  // Try exact match first
  let fabric = fabrics.find(item => 
    item.Name.toLowerCase() === fabricName.toLowerCase()
  );
  
  // CRITICAL FIX: Handle dual fabric formats like "Polyester/Laser Cut" - calculate COMBINED cost
  if (!fabric && fabricName.includes('/')) {
    const fabricNames = fabricName.split('/').map(f => f.trim());
    console.log(`🧵 [AI-PRICING] CRITICAL DUAL FABRIC FIX - Processing: ${fabricNames.join(', ')}`);
    console.log(`🧵 [AI-PRICING] Available fabrics in CSV:`, fabrics.map(f => f.Name));
    
    // Calculate COMBINED cost for all fabric components
    let totalFabricCost = 0;
    let fabricComponents = [];
    
    for (const name of fabricNames) {
      console.log(`🧵 [AI-PRICING] Processing fabric component: "${name}"`);
      
      const candidateFabric = fabrics.find(item => 
        item.Name.toLowerCase() === name.toLowerCase()
      );
      
      if (candidateFabric) {
        const candidatePrice = getPriceForQuantity(candidateFabric, quantity);
        totalFabricCost += candidatePrice;
        
        fabricComponents.push({
          name: candidateFabric.Name,
          costType: candidateFabric.costType,
          unitPrice: candidatePrice,
          isFree: candidateFabric.costType === 'Free'
        });
        
        console.log(`🧵 [AI-PRICING] PRODUCTION CRITICAL: Component "${candidateFabric.Name}": ${candidateFabric.costType} - $${candidatePrice} per unit (quantity: ${quantity})`);
        
        // BUSINESS CRITICAL VALIDATION: Log free vs premium fabric detection
        if (candidateFabric.costType === 'Free' && candidatePrice !== 0) {
          console.error(`🚨 [AI-PRICING] PRICING BUG: Free fabric "${candidateFabric.Name}" has non-zero price $${candidatePrice}`);
        }
        if (candidateFabric.costType === 'Premium Fabric' && candidatePrice === 0) {
          console.error(`🚨 [AI-PRICING] PRICING BUG: Premium fabric "${candidateFabric.Name}" has zero price`);
        }
      } else {
        console.log(`🧵 [AI-PRICING] ⚠️ Fabric component "${name}" not found in CSV`);
      }
    }
    
    console.log(`🧵 [AI-PRICING] DUAL FABRIC TOTAL CALCULATION:`, {
      components: fabricComponents,
      totalCombinedCost: `$${totalFabricCost}`,
      quantity,
      totalForOrder: `$${(totalFabricCost * quantity).toFixed(2)}`,
      breakdown: fabricComponents.map(f => `${f.name}: $${f.unitPrice} (${f.costType})`).join(', ')
    });
    
    // Return the combined cost for dual fabrics
    if (fabricComponents.length > 0) {
      console.log(`🧵 [AI-PRICING] PRODUCTION READY: Using combined fabric cost: $${totalFabricCost} per unit`);
      return totalFabricCost;
    }
  }
  
  if (!fabric) {
    throw new Error(`❌ [AI-PRICING] Fabric not found in AI CSV: ${fabricName}`);
  }
  
  let unitPrice = getPriceForQuantity(fabric, quantity);
  
  // 🚨 PRODUCTION CRITICAL: Enforce Free fabric pricing (must be $0.00)
  if (fabric.costType === 'Free') {
    if (unitPrice !== 0) {
      console.error(`🚨 [AI-PRICING] CRITICAL BUG FIXED: Free fabric "${fabric.Name}" was returning $${unitPrice}, forcing to $0.00`);
      unitPrice = 0; // Force free fabrics to $0.00
    }
    console.log(`🧵 [AI-PRICING] FREE FABRIC CONFIRMED: ${fabric.Name}: $0.00 per unit (Free fabric)`);
  } else {
    console.log(`🧵 [AI-PRICING] ${fabric.Name}: $${unitPrice} per unit at ${quantity} qty (${fabric.costType})`);
  }
  
  // CSV-based pricing validation successful
  
  return unitPrice;
}

/**
 * Get AI-specific delivery price
 */
export async function getAIDeliveryPrice(deliveryMethod: string, quantity: number): Promise<number> {
  const deliveries = await loadAIDelivery();
  const delivery = deliveries.find(item => 
    item.Name.toLowerCase().includes(deliveryMethod.toLowerCase())
  );
  
  if (!delivery) {
    throw new Error(`❌ [AI-PRICING] Delivery method not found in AI CSV: ${deliveryMethod}`);
  }
  
  const unitPrice = getPriceForQuantity(delivery, quantity);
  console.log(`🚚 [AI-PRICING] ${deliveryMethod}: $${unitPrice} per unit at ${quantity} qty`);
  return unitPrice;
}

/**
 * Get blank cap price for AI with automatic product-tier detection
 */
export async function getAIBlankCapPrice(tier: string, quantity: number, productDescription?: string): Promise<number> {
  const blankCaps = await loadAIBlankCaps();
  
  // If product description is provided, try to find the correct tier from Customer Products.csv
  let actualTier = tier;
  if (productDescription) {
    try {
      actualTier = await findProductTierFromDescription(productDescription);
      console.log(`🧢 [AI-PRICING] Product tier detection: "${tier}" → "${actualTier}" based on description: "${productDescription}"`);
    } catch (error) {
      console.warn(`⚠️ [AI-PRICING] Failed to determine tier from description, using provided tier: ${tier}`);
      actualTier = tier;
    }
  }
  
  const tierData = blankCaps[actualTier];
  
  if (!tierData) {
    throw new Error(`❌ [AI-PRICING] Tier not found: ${actualTier}. Available tiers: ${Object.keys(blankCaps).join(', ')}`);
  }
  
  const unitPrice = getPriceForQuantity(tierData, quantity);
  console.log(`🧢 [AI-PRICING] ${actualTier} blank cap: $${unitPrice} per unit at ${quantity} qty`);
  return unitPrice;
}

/**
 * Get blank cap price for AI (legacy version for backward compatibility)
 */
export async function getAIBlankCapPriceByTier(tier: string, quantity: number): Promise<number> {
  return getAIBlankCapPrice(tier, quantity);
}

/**
 * Clear all AI pricing caches - use when CSV data is updated or debugging pricing issues
 */
export function clearAIPricingCache(): void {
  console.log('🔧 [AI-PRICING] Clearing all pricing caches...');
  cachedAIAccessories = null;
  cachedAILogo = null;
  cachedAIClosure = null;
  cachedAIFabric = null;
  cachedAIDelivery = null;
  cachedAIBlankCaps = null;
  cachedCustomerProducts = null;
  console.log('✅ [AI-PRICING] All caches cleared - fresh data will be loaded on next request');
}

// 🚨 PRODUCTION CRITICAL: Clear cache immediately when this module loads to apply fixes
clearAIPricingCache();