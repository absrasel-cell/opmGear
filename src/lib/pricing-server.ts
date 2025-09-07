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

// Cache for loaded pricing data to avoid repeated file reads
let blankCapPricingCache: BaseProductPricing[] | null = null;
let customizationPricingCache: CustomizationPricing[] | null = null;

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
  
  if (quantity >= 10000) return pricing.price10000;
  if (quantity >= 2880) return pricing.price2880;
  if (quantity >= 1152) return pricing.price1152;
  if (quantity >= 576) return pricing.price576;
  if (quantity >= 144) return pricing.price144;
  return pricing.price48;
}

// Calculate delivery unit price based on quantity and method using CSV data
export async function calculateDeliveryUnitPrice(quantity: number, deliveryMethod: string = 'regular'): Promise<number> {
  const customizationPricing = await loadCustomizationPricing();
  
  // Map delivery method names to CSV names
  const methodMap: Record<string, string> = {
    'regular': 'Regular Delivery',
    'priority': 'Priority Delivery',
    'air-freight': 'Air Freight', 
    'sea-freight': 'Sea Freight'
  };
  
  const csvMethodName = methodMap[deliveryMethod] || 'Regular Delivery';
  const deliveryPricing = customizationPricing.find(p => 
    p.type === 'Shipping' && p.Name === csvMethodName
  );
  
  if (!deliveryPricing) {
    console.warn(`Delivery pricing not found for: ${csvMethodName}`);
    // Try to find Regular Delivery as fallback
    const fallback = customizationPricing.find(p => 
      p.type === 'Shipping' && p.Name === 'Regular Delivery'
    );
    if (!fallback) return 0;
    return getPriceForQuantityFromCSV(fallback, quantity);
  }
  
  return getPriceForQuantityFromCSV(deliveryPricing, quantity);
}

// Helper function to get price for quantity from CSV pricing data
export function getPriceForQuantityFromCSV(pricing: any, quantity: number): number {
  if (quantity >= 20000 && pricing.price20000) return pricing.price20000;
  if (quantity >= 10000) return pricing.price10000;
  if (quantity >= 2880) return pricing.price2880;
  if (quantity >= 1152) return pricing.price1152;
  if (quantity >= 576) return pricing.price576;
  if (quantity >= 144) return pricing.price144;
  return pricing.price48;
}
