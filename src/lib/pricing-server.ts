// SERVER-ONLY CSV LOADING FUNCTIONS
// This file contains Node.js fs operations and can only be used on the server-side

import { promises as fs } from 'fs';
import path from 'path';

// Base product pricing interface matching CSV structure
export interface BaseProductPricing {
  name: string;
  price48: number;
  price144: number;
  price576: number;
  price1152: number;
  price2880: number;
  price10000: number;
}

export interface CustomizationPricing {
  Name: string;
  type: string;
  price48: number;
  price144: number;
  price576: number;
  price1152: number;
  price2880: number;
  price10000: number;
  price20000?: number;
}

export interface FabricPricing {
  Name: string;
  costType: string;
  colorNote: string;
  price48: number;
  price144: number;
  price576: number;
  price1152: number;
  price2880: number;
  price10000: number;
  price20000?: number;
  marginPercent: number;
}

export interface ClosurePricing {
  Name: string;
  type: string;
  price48: number;
  price144: number;
  price576: number;
  price1152: number;
  price2880: number;
  price10000: number;
  price20000?: number;
  comment?: string;
  marginPercent: number;
}

export interface AccessoryPricing {
  Name: string;
  price48: number;
  price144: number;
  price576: number;
  price1152: number;
  price2880: number;
  price10000: number;
  price20000?: number;
  marginPercent: number;
}

export interface DeliveryPricing {
  Name: string;
  type: string;
  deliveryDays: string;
  price48: number;
  price144: number;
  price576: number;
  price1152: number;
  price2880: number;
  price10000: number;
  price20000?: number;
  marginPercent: number;
}

// Cache for loaded pricing data to avoid repeated file reads
let blankCapPricingCache: BaseProductPricing[] | null = null;
let customizationPricingCache: CustomizationPricing[] | null = null;
let fabricPricingCache: FabricPricing[] | null = null;
let closurePricingCache: ClosurePricing[] | null = null;
let accessoryPricingCache: AccessoryPricing[] | null = null;
let deliveryPricingCache: DeliveryPricing[] | null = null;

// Helper function to parse CSV lines properly
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

// Load blank cap pricing from CSV file
export async function loadBlankCapPricing(): Promise<BaseProductPricing[]> {
  if (blankCapPricingCache) {
    return blankCapPricingCache;
  }
  
  try {
    const csvPath = path.join(process.cwd(), 'src/app/csv/Blank Cap Pricings.csv');
    const csvContent = await fs.readFile(csvPath, 'utf-8');
    const lines = csvContent.split('\n').filter(line => line.trim());
    const dataLines = lines.slice(1); // Skip header
    
    const pricingData = dataLines.map(line => {
      const values = parseCSVLine(line);
      return {
        name: values[0]?.trim() || '',
        price48: parseFloat(values[1]) || 0,
        price144: parseFloat(values[2]) || 0,
        price576: parseFloat(values[3]) || 0,
        price1152: parseFloat(values[4]) || 0,
        price2880: parseFloat(values[5]) || 0,
        price10000: parseFloat(values[6]) || 0,
      };
    }).filter(item => item.name && item.name.length > 0);
    
    blankCapPricingCache = pricingData;
    console.log('✅ Loaded', pricingData.length, 'blank cap pricing tiers from CSV');
    return pricingData;
  } catch (error) {
    console.error('Error loading blank cap pricing from CSV:', error);
    return [];
  }
}

// Load customization pricing from CSV file
export async function loadCustomizationPricing(): Promise<CustomizationPricing[]> {
  if (customizationPricingCache) {
    return customizationPricingCache;
  }
  
  try {
    const csvPath = path.join(process.cwd(), 'src/app/csv/Customization Pricings.csv');
    const csvContent = await fs.readFile(csvPath, 'utf-8');
    const lines = csvContent.split('\n').filter(line => line.trim());
    const dataLines = lines.slice(1); // Skip header
    
    const pricingData = dataLines.map(line => {
      const values = parseCSVLine(line);
      return {
        Name: (values[0] || '').replace(/"/g, '').trim(),
        type: (values[1] || '').trim(),
        price48: parseFloat(values[2]) || 0,
        price144: parseFloat(values[3]) || 0,
        price576: parseFloat(values[4]) || 0,
        price1152: parseFloat(values[5]) || 0,
        price2880: parseFloat(values[6]) || 0,
        price10000: parseFloat(values[7]) || 0,
        price20000: parseFloat(values[8]) || 0,
      };
    }).filter(item => item.Name && item.Name.length > 0);
    
    customizationPricingCache = pricingData;
    console.log('✅ Loaded', pricingData.length, 'customization pricing items from CSV');
    return pricingData;
  } catch (error) {
    console.error('Error loading customization pricing from CSV:', error);
    return [];
  }
}

// Get pricing for a specific tier from CSV data
export async function getBaseProductPricing(tierName?: string): Promise<BaseProductPricing | null> {
  const pricingData = await loadBlankCapPricing();
  const tier = tierName || 'Tier 1';
  
  const tierData = pricingData.find(p => p.name === tier);
  if (!tierData) {
    console.warn(`Pricing tier "${tier}" not found in CSV, trying Tier 1 fallback`);
    const fallback = pricingData.find(p => p.name === 'Tier 1');
    return fallback || null;
  }
  
  return tierData;
}

// Calculate unit price based on quantity using CSV tier pricing
export async function calculateUnitPrice(quantity: number, tierName?: string): Promise<number> {
  const pricing = await getBaseProductPricing(tierName);
  
  if (!pricing) {
    console.error(`Unable to load pricing for tier: ${tierName}`);
    return 0;
  }
  
  // FIXED: Correct tier boundaries based on CSV column headers
  // CSV shows: price48 (1-47), price144 (48-143), price576 (144-575), price1152 (576-1151), price2880 (1152-2879), price10000 (2880-9999)
  if (quantity >= 10000) return pricing.price10000;
  if (quantity >= 2880) return pricing.price10000;
  if (quantity >= 1152) return pricing.price2880;
  if (quantity >= 576) return pricing.price1152;
  if (quantity >= 144) return pricing.price576;
  if (quantity >= 48) return pricing.price144;
  return pricing.price48;
}

// Calculate delivery unit price based on quantity and method using dedicated delivery CSV data
export async function calculateDeliveryUnitPrice(quantity: number, deliveryMethod: string = 'regular'): Promise<number> {
  const deliveryPricing = await loadDeliveryPricing();
  
  // Map delivery method names to CSV names
  const methodMap: Record<string, string> = {
    'regular': 'Regular Delivery',
    'priority': 'Priority Delivery',
    'air-freight': 'Air Freight', 
    'sea-freight': 'Sea Freight'
  };
  
  const csvMethodName = methodMap[deliveryMethod] || 'Regular Delivery';
  const delivery = deliveryPricing.find(d => d.Name === csvMethodName);
  
  if (!delivery) {
    console.warn(`Delivery pricing not found for: ${csvMethodName}`);
    // Try to find Regular Delivery as fallback
    const fallback = deliveryPricing.find(d => d.Name === 'Regular Delivery');
    if (!fallback) {
      console.error('No Regular Delivery fallback found in CSV');
      return 0;
    }
    return getPriceForQuantityFromCSV(fallback, quantity);
  }
  
  return getPriceForQuantityFromCSV(delivery, quantity);
}

// Helper function to get price for quantity from CSV pricing data
export function getPriceForQuantityFromCSV(pricing: any, quantity: number): number {
  // FIXED: Correct tier boundaries based on CSV column headers  
  // CSV shows: price48 (1-47), price144 (48-143), price576 (144-575), price1152 (576-1151), price2880 (1152-2879), price10000 (2880-9999), price20000 (10000+)
  if (quantity >= 20000 && pricing.price20000) return pricing.price20000;
  if (quantity >= 10000) return pricing.price10000;
  if (quantity >= 2880) return pricing.price10000;
  if (quantity >= 1152) return pricing.price2880;
  if (quantity >= 576) return pricing.price1152;
  if (quantity >= 144) return pricing.price576;
  if (quantity >= 48) return pricing.price144;
  return pricing.price48;
}

// Load fabric pricing from CSV file
export async function loadFabricPricing(): Promise<FabricPricing[]> {
  if (fabricPricingCache) {
    return fabricPricingCache;
  }
  
  try {
    const csvPath = path.join(process.cwd(), 'src/app/ai/Options/Fabric.csv');
    const csvContent = await fs.readFile(csvPath, 'utf-8');
    const lines = csvContent.split('\n').filter(line => line.trim());
    const dataLines = lines.slice(1); // Skip header
    
    const pricingData = dataLines.map(line => {
      const values = parseCSVLine(line);
      return {
        Name: (values[0] || '').replace(/"/g, '').trim(),
        costType: (values[1] || '').trim(),
        colorNote: (values[2] || '').trim(),
        price48: parseFloat(values[3]) || 0,
        price144: parseFloat(values[4]) || 0,
        price576: parseFloat(values[5]) || 0,
        price1152: parseFloat(values[6]) || 0,
        price2880: parseFloat(values[7]) || 0,
        price10000: parseFloat(values[8]) || 0,
        price20000: parseFloat(values[9]) || 0,
        marginPercent: parseFloat(values[10]) || 0,
      };
    }).filter(item => item.Name && item.Name.length > 0);
    
    fabricPricingCache = pricingData;
    console.log('✅ Loaded', pricingData.length, 'fabric pricing items from CSV');
    return pricingData;
  } catch (error) {
    console.error('Error loading fabric pricing from CSV:', error);
    return [];
  }
}

// Load closure pricing from CSV file
export async function loadClosurePricing(): Promise<ClosurePricing[]> {
  if (closurePricingCache) {
    return closurePricingCache;
  }
  
  try {
    const csvPath = path.join(process.cwd(), 'src/app/ai/Options/Closure.csv');
    const csvContent = await fs.readFile(csvPath, 'utf-8');
    const lines = csvContent.split('\n').filter(line => line.trim());
    const dataLines = lines.slice(1); // Skip header
    
    const pricingData = dataLines.map(line => {
      const values = parseCSVLine(line);
      return {
        Name: (values[0] || '').replace(/"/g, '').trim(),
        type: (values[1] || '').trim(),
        price48: parseFloat(values[2]) || 0,
        price144: parseFloat(values[3]) || 0,
        price576: parseFloat(values[4]) || 0,
        price1152: parseFloat(values[5]) || 0,
        price2880: parseFloat(values[6]) || 0,
        price10000: parseFloat(values[7]) || 0,
        price20000: parseFloat(values[8]) || 0,
        comment: (values[9] || '').trim(),
        marginPercent: parseFloat(values[10]) || 0,
      };
    }).filter(item => item.Name && item.Name.length > 0);
    
    closurePricingCache = pricingData;
    console.log('✅ Loaded', pricingData.length, 'closure pricing items from CSV');
    return pricingData;
  } catch (error) {
    console.error('Error loading closure pricing from CSV:', error);
    return [];
  }
}

// Load accessory pricing from CSV file
export async function loadAccessoryPricing(): Promise<AccessoryPricing[]> {
  if (accessoryPricingCache) {
    return accessoryPricingCache;
  }
  
  try {
    const csvPath = path.join(process.cwd(), 'src/app/ai/Options/Accessories.csv');
    const csvContent = await fs.readFile(csvPath, 'utf-8');
    const lines = csvContent.split('\n').filter(line => line.trim());
    const dataLines = lines.slice(1); // Skip header
    
    const pricingData = dataLines.map(line => {
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
        marginPercent: parseFloat(values[8]) || 0,
      };
    }).filter(item => item.Name && item.Name.length > 0);
    
    accessoryPricingCache = pricingData;
    console.log('✅ Loaded', pricingData.length, 'accessory pricing items from CSV');
    return pricingData;
  } catch (error) {
    console.error('Error loading accessory pricing from CSV:', error);
    return [];
  }
}

// Load delivery pricing from CSV file (updated to use dedicated delivery CSV)
export async function loadDeliveryPricing(): Promise<DeliveryPricing[]> {
  if (deliveryPricingCache) {
    return deliveryPricingCache;
  }
  
  try {
    const csvPath = path.join(process.cwd(), 'src/app/ai/Options/Delivery.csv');
    const csvContent = await fs.readFile(csvPath, 'utf-8');
    const lines = csvContent.split('\n').filter(line => line.trim());
    const dataLines = lines.slice(1); // Skip header
    
    const pricingData = dataLines.map(line => {
      const values = parseCSVLine(line);
      return {
        Name: (values[0] || '').replace(/"/g, '').trim(),
        type: (values[1] || '').trim(),
        deliveryDays: (values[2] || '').trim(),
        price48: parseFloat(values[3]) || 0,
        price144: parseFloat(values[4]) || 0,
        price576: parseFloat(values[5]) || 0,
        price1152: parseFloat(values[6]) || 0,
        price2880: parseFloat(values[7]) || 0,
        price10000: parseFloat(values[8]) || 0,
        price20000: parseFloat(values[9]) || 0,
        marginPercent: parseFloat(values[10]) || 0,
      };
    }).filter(item => item.Name && item.Name.length > 0);
    
    deliveryPricingCache = pricingData;
    console.log('✅ Loaded', pricingData.length, 'delivery pricing items from CSV');
    return pricingData;
  } catch (error) {
    console.error('Error loading delivery pricing from CSV:', error);
    return [];
  }
}
