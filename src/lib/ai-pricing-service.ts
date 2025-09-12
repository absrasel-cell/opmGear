/**
 * AI-Specific Pricing Service
 * ONLY uses CSV files from /ai/Options/ directory
 * Completely separate from Advanced Product Page pricing
 */

import { promises as fs } from 'fs';
import path from 'path';

// Cache for AI pricing data
let cachedAIAccessories: any[] | null = null;
let cachedAILogo: any[] | null = null;
let cachedAIClosure: any[] | null = null;
let cachedAIFabric: any[] | null = null;
let cachedAIDelivery: any[] | null = null;
let cachedAIBlankCaps: any[] | null = null;

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

// Load blank cap pricing (shared with advanced product page)
async function loadAIBlankCaps(): Promise<any> {
  if (cachedAIBlankCaps) {
    return cachedAIBlankCaps;
  }
  
  try {
    const csvPath = path.join(process.cwd(), 'src/app/csv/Blank Cap Pricings.csv');
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
  
  // 🚨 CRITICAL FIX: Enhanced logging for all large quantity debugging
  const isLargeQuantity = quantity >= 1000;
  if (isLargeQuantity) {
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
  
  // CORRECTED: Tier boundaries based on CSV column names representing MINIMUM quantities for that price
  // price48 = 48+ pieces, price144 = 144+ pieces, price576 = 576+ pieces, etc.
  // The tier pricing applies when you reach that minimum quantity threshold
  if (quantity >= 20000) {
    selectedPrice = pricingData.price20000 || pricingData.price10000 || 0;
    selectedTier = 'price20000';
  } else if (quantity >= 10000) {
    selectedPrice = pricingData.price10000 || 0;
    selectedTier = 'price10000';
  } else if (quantity >= 2880) {
    selectedPrice = pricingData.price2880 || 0;
    selectedTier = 'price2880';
  } else if (quantity >= 1152) {
    selectedPrice = pricingData.price1152 || 0;
    selectedTier = 'price1152';
  } else if (quantity >= 576) {
    selectedPrice = pricingData.price576 || 0;
    selectedTier = 'price576';
  } else if (quantity >= 144) {
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
  
  // 🚨 CRITICAL FIX: Log the selected tier for large quantities
  if (isLargeQuantity) {
    console.log(`💰 [AI-PRICING] TIER SELECTION for ${pricingData.Name}:`, {
      quantity,
      selectedTier,
      selectedPrice,
      correctFor3500: quantity === 3500 ? selectedTier === 'price10000' : 'N/A'
    });
  }
  
  return selectedPrice;
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
    console.warn(`⚠️ [AI-PRICING] Accessory not found in AI CSV: ${accessoryName}`);
    return 0;
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
    console.warn(`⚠️ [AI-PRICING] Logo not found in AI CSV: ${logoName} ${size} ${application}`);
    return { unitPrice: 0, moldCharge: 0 };
  }
  
  const unitPrice = getPriceForQuantity(logo, quantity);
  
  // Calculate mold charge
  let moldCharge = 0;
  if (logo.MoldCharge) {
    if (logo.MoldCharge === 'Small Mold Charge') moldCharge = 100;
    else if (logo.MoldCharge === 'Medium Mold Charge') moldCharge = 150;
    else if (logo.MoldCharge === 'Large Mold Charge') moldCharge = 200;
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
    console.warn(`⚠️ [AI-PRICING] Closure not found in AI CSV: ${closureName}`);
    return 0;
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
  
  // If no exact match, handle dual fabric formats like "polyester/Laser Cut"
  if (!fabric && fabricName.includes('/')) {
    const fabricNames = fabricName.split('/').map(f => f.trim());
    console.log(`🧵 [AI-PRICING] Dual fabric detected: ${fabricNames.join(', ')}`);
    
    // Find the premium fabric from the dual fabric setup
    // Premium fabrics: Acrylic, Suede Cotton, Genuine Leather, Air Mesh, Camo, Laser Cut, etc.
    const premiumFabrics = ['Acrylic', 'Suede Cotton', 'Genuine Leather', 'Air Mesh', 'Camo', 'Laser Cut', 'PU Leather', 'Spandex', 'Cotton Corduroy', 'Ribbed Corduroy', 'Polyester 97% Spandex 3%', '100% Polyester Jersey', 'Canvas'];
    
    for (const name of fabricNames) {
      const matchingPremium = premiumFabrics.find(premium => 
        premium.toLowerCase() === name.toLowerCase()
      );
      
      if (matchingPremium) {
        fabric = fabrics.find(item => 
          item.Name.toLowerCase() === matchingPremium.toLowerCase()
        );
        if (fabric) {
          console.log(`🧵 [AI-PRICING] Using premium fabric: ${matchingPremium} from dual fabric setup`);
          break;
        }
      }
    }
  }
  
  if (!fabric) {
    console.warn(`⚠️ [AI-PRICING] Fabric not found in AI CSV: ${fabricName}`);
    return 0;
  }
  
  const unitPrice = getPriceForQuantity(fabric, quantity);
  console.log(`🧵 [AI-PRICING] ${fabric.Name}: $${unitPrice} per unit at ${quantity} qty`);
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
    console.warn(`⚠️ [AI-PRICING] Delivery method not found in AI CSV: ${deliveryMethod}`);
    return 2.71; // Default fallback
  }
  
  const unitPrice = getPriceForQuantity(delivery, quantity);
  console.log(`🚚 [AI-PRICING] ${deliveryMethod}: $${unitPrice} per unit at ${quantity} qty`);
  return unitPrice;
}

/**
 * Get blank cap price for AI
 */
export async function getAIBlankCapPrice(tier: string, quantity: number): Promise<number> {
  const blankCaps = await loadAIBlankCaps();
  const tierData = blankCaps[tier];
  
  if (!tierData) {
    console.error(`❌ [AI-PRICING] Tier not found: ${tier}. Available tiers:`, Object.keys(blankCaps));
    return 0; // Return 0 to indicate error instead of using incorrect fallback
  }
  
  const unitPrice = getPriceForQuantity(tierData, quantity);
  console.log(`🧢 [AI-PRICING] ${tier} blank cap: $${unitPrice} per unit at ${quantity} qty`);
  return unitPrice;
}