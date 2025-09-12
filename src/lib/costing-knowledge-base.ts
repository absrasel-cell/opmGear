/**
 * Costing Knowledge Base - Single Source of Truth for ALL Cost Calculation Rules
 * 
 * This file contains all business rules, pricing logic, and calculation methods
 * used by both the Advanced Product Page and AI order system.
 * 
 * Key Goals:
 * - Single source of truth for all costing logic
 * - Consistent rules across manual and AI systems
 * - Clear documentation of all business rules
 * - Easy maintenance and updates
 */

import { promises as fs } from 'fs';
import path from 'path';

// Core interfaces
export interface CostingRule {
  name: string;
  description: string;
  applies: (context: CostingContext) => boolean;
  calculate: (context: CostingContext) => CostResult;
}

export interface CostingContext {
  quantity: number;
  logoSetup?: LogoSetupConfig[];
  fabricType?: string;
  closureType?: string;
  accessories?: string[];
  services?: string[];
  deliveryMethod?: string;
  previousOrderNumber?: string;
  productTier?: string;
  shipmentQuantity?: number; // For combined delivery pricing
}

export interface LogoSetupConfig {
  type: string; // '3D Embroidery', 'Rubber Patch', etc.
  size: string; // 'Small', 'Medium', 'Large'
  position: string; // 'Front', 'Back', etc.
  application: string; // 'Direct', 'Run', 'Satin'
}

export interface CostResult {
  cost: number;
  unitPrice: number;
  details: string;
  waived?: boolean;
  waiverReason?: string;
  breakdown?: Array<{
    name: string;
    cost: number;
    unitPrice: number;
  }>;
}

export interface CostBreakdownResult {
  baseProductCost: number;
  logoSetupCosts: Array<{
    name: string;
    cost: number;
    unitPrice: number;
    details: string;
    baseUnitPrice?: number;
  }>;
  accessoriesCosts: Array<{
    name: string;
    cost: number;
    unitPrice: number;
  }>;
  closureCosts: Array<{
    name: string;
    cost: number;
    unitPrice: number;
  }>;
  premiumFabricCosts: Array<{
    name: string;
    cost: number;
    unitPrice: number;
  }>;
  deliveryCosts: Array<{
    name: string;
    cost: number;
    unitPrice: number;
  }>;
  servicesCosts: Array<{
    name: string;
    cost: number;
    unitPrice: number;
  }>;
  moldChargeCosts: Array<{
    name: string;
    cost: number;
    unitPrice: number;
    waived: boolean;
    waiverReason?: string;
  }>;
  totalCost: number;
  totalUnits: number;
}

// Quantity tier boundaries (consistent across all systems)
export const QUANTITY_TIERS = [
  { name: '10000+', minQty: 10000 },
  { name: '2880+', minQty: 2880 },
  { name: '1152+', minQty: 1152 },
  { name: '576+', minQty: 576 },
  { name: '144+', minQty: 144 },
  { name: '48+', minQty: 48 }
] as const;

// Business rule definitions
export const BUSINESS_RULES = {
  // Premium fabric rules
  PREMIUM_FABRICS: [
    'Acrylic', 'Suede Cotton', 'Genuine Leather', 
    'Air Mesh', 'Camo', 'Laser Cut'
  ] as const,
  
  // Premium closure rules
  PREMIUM_CLOSURES: [
    'flexfit', 'fitted', 'buckle', 'stretched'
  ] as const,
  
  // Logo types that require mold charges
  MOLD_CHARGE_REQUIRED: [
    'rubber patch', 'leather patch'
  ] as const,
  
  // Default specifications (budget-friendly)
  DEFAULTS: {
    panelCount: 6,
    profile: 'High',
    structure: 'Structured',
    closure: 'snapback',
    fabricType: 'Chino Twill',
    stitching: 'Matching',
    billStyle: 'Flat Bill',
    deliveryMethod: 'regular',
    productTier: 'Tier 1'
  } as const,
  
  // Default logo setup (budget-friendly but comprehensive)
  DEFAULT_LOGO_SETUP: {
    front: { type: '3D Embroidery', size: 'Large', application: 'Direct' },
    right: { type: 'Embroidery', size: 'Small', application: 'Direct' },
    left: { type: 'Embroidery', size: 'Small', application: 'Direct' },
    back: { type: 'Embroidery', size: 'Small', application: 'Direct' },
    upperBill: { type: 'Embroidery', size: 'Medium', application: 'Direct' },
    underBill: { type: 'Sublimated Print', size: 'Large', application: 'Direct' }
  } as const,
  
  // Minimum quantities for freight shipping (based on CSV availability)
  FREIGHT_SHIPPING: {
    AIR_FREIGHT_MIN: 2880,
    SEA_FREIGHT_MIN: 2880
  } as const,
  
  // Mold charge waiver conditions
  MOLD_CHARGE_WAIVERS: {
    // Waive if previous order number provided
    PREVIOUS_ORDER: true,
    // Waive for quantities above certain thresholds (future rule)
    HIGH_QUANTITY_THRESHOLD: 10000
  } as const
} as const;

// AI System specific rules for parsing natural language
export const AI_DETECTION_RULES = {
  // Fabric detection patterns
  FABRIC_PATTERNS: {
    'acrylic': ['acrylic'],
    'suede cotton': ['suede cotton', 'suede'],
    'genuine leather': ['genuine leather', 'leather'],
    'air mesh': ['air mesh', 'mesh'],
    'duck camo': ['duck camo'], // FIXED: Separate duck camo for specific detection
    'camo': ['army camo', 'digital camo', 'bottomland camo', 'camo', 'camouflage'], // Generic camo
    'laser cut': ['laser cut', 'laser'],
    'chino twill': ['chino twill', 'twill'],
    'trucker mesh': ['trucker mesh', 'trucker', 'split', 'mesh back'],
    'black trucker mesh': ['black trucker mesh'] // FIXED: Add specific pattern
  } as const,
  
  // Logo type detection patterns - FIXED: More specific patterns to avoid conflicts
  LOGO_PATTERNS: {
    '3D Embroidery': ['3d embroidery', '3d', 'raised embroidery', 'embroidery 3d'],
    'Flat Embroidery': ['flat embroidery', 'embroidery flat'],
    'Embroidery': ['embroidery', 'embroidered'], // Generic embroidery - lower priority
    'Rubber Patch': ['rubber patch'],  // FIXED: Remove generic 'rubber' to avoid conflicts
    'Leather Patch': ['leather patch'],  // FIXED: Remove generic 'leather' to avoid conflicts  
    'Print Woven Patch': ['woven patch', 'printed patch', 'print patch'],
    'Sublimated Print': ['sublimated', 'sublimated print'],
    'None': ['no logo', 'no decoration', 'without logo', 'plain cap', 'blank cap']
  } as const,
  
  // Closure detection patterns
  CLOSURE_PATTERNS: {
    'fitted': ['fitted'],
    'flexfit': ['flexfit'],
    'buckle': ['adjustable', 'buckle'],
    'velcro': ['velcro'],
    'snapback': ['snapback', 'snap back']
  } as const,
  
  // Size detection patterns
  SIZE_PATTERNS: {
    'Small': ['small'],
    'Medium': ['medium', 'med'],
    'Large': ['large']
  } as const,
  
  // Accessory detection patterns - ENHANCED for better matching
  ACCESSORY_PATTERNS: {
    'Sticker': ['sticker', 'stickers'],
    'Hang Tag': ['hang tag', 'hangtag'],  // FIXED: Remove generic 'tag' to avoid conflicts
    'Inside Label': ['inside label', 'inside labels', 'branded label', 'branded labels', 'label', 'labels'], // ENHANCED: More patterns
    'B-Tape Print': ['b-tape print', 'b-tape', 'b tape', 'btape'], // ENHANCED: More specific patterns
    'Metal Eyelet': ['metal eyelet', 'eyelet', 'eyelets'],
    'Rope Cost': ['rope', 'rope cost', 'rope attachment']
  } as const
} as const;

// Cached pricing data
let cachedPricingData: any[] | null = null;
let cachedBaseProductPricing: any | null = null;
let cachedFabricPricing: any[] | null = null;

// Helper function to parse CSV lines with quoted values
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

// Load pricing data from CSV files
async function loadPricingData(): Promise<any[]> {
  if (cachedPricingData) {
    return cachedPricingData;
  }
  
  try {
    const csvPath = path.join(process.cwd(), 'src/app/csv/Customization Pricings.csv');
    const csvContent = await fs.readFile(csvPath, 'utf-8');
    
    const lines = csvContent.split('\n').filter(line => line.trim());
    const dataLines = lines.slice(1); // Skip header
    
    cachedPricingData = dataLines.map(line => {
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
    
    return cachedPricingData;
  } catch (error) {
    console.error('Error loading customization pricing from CSV:', error);
    return [];
  }
}

// Load base product pricing from CSV
async function loadBaseProductPricing(): Promise<any> {
  if (cachedBaseProductPricing) {
    return cachedBaseProductPricing;
  }
  
  try {
    const csvPath = path.join(process.cwd(), 'src/app/csv/Blank Cap Pricings.csv');
    const csvContent = await fs.readFile(csvPath, 'utf-8');
    
    const lines = csvContent.split('\n').filter(line => line.trim());
    const dataLines = lines.slice(1); // Skip header
    
    const tiers: any = {};
    
    dataLines.forEach(line => {
      const values = parseCSVLine(line);
      const tierName = values[0]?.trim();
      
      if (tierName) {
        tiers[tierName] = {
          price48: parseFloat(values[1]) || 0,
          price144: parseFloat(values[2]) || 0,
          price576: parseFloat(values[3]) || 0,
          price1152: parseFloat(values[4]) || 0,
          price2880: parseFloat(values[5]) || 0,
          price10000: parseFloat(values[6]) || 0,
        };
      }
    });
    
    cachedBaseProductPricing = tiers;
    return cachedBaseProductPricing;
  } catch (error) {
    console.error('Error loading base product pricing from CSV:', error);
    return {};
  }
}

// Load fabric pricing data from Fabric.csv
async function loadFabricPricingData(): Promise<any[]> {
  if (cachedFabricPricing) {
    return cachedFabricPricing;
  }
  
  try {
    const csvPath = path.join(process.cwd(), 'src/app/ai/Options/Fabric.csv');
    const csvContent = await fs.readFile(csvPath, 'utf-8');
    
    const lines = csvContent.split('\n').filter(line => line.trim());
    const dataLines = lines.slice(1); // Skip header
    
    cachedFabricPricing = dataLines.map(line => {
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
    
    console.log('🧵 [FABRIC-PRICING] Loaded fabric pricing data:', {
      totalFabrics: cachedFabricPricing.length,
      premiumFabrics: cachedFabricPricing.filter(f => f.costType === 'Premium Fabric').length,
      freeFabrics: cachedFabricPricing.filter(f => f.costType === 'Free').length
    });
    
    return cachedFabricPricing;
  } catch (error) {
    console.error('Error loading fabric pricing from CSV:', error);
    return [];
  }
}

// Core utility functions
export function getQuantityTier(quantity: number): string {
  for (const tier of QUANTITY_TIERS) {
    if (quantity >= tier.minQty) {
      return tier.name;
    }
  }
  return '48+';
}

export function getPriceForQuantity(pricing: any, quantity: number): number {
  // Helper function to check if a price is valid (not null, undefined, or "Not Applicable")
  const isValidPrice = (price: any): boolean => {
    return price !== null && 
           price !== undefined && 
           !isNaN(parseFloat(price)) && 
           price !== "Not Applicable" && 
           parseFloat(price) > 0;
  };

  // CRITICAL FIX: Correct tier boundaries to match business requirements
  // Tier boundaries: 1-47→price48, 48-143→price144, 144-575→price576, 576-1151→price1152, 1152-2879→price2880, 2880-9999→price10000, 10000+→price20000
  if (quantity >= 20000 && isValidPrice(pricing.price20000)) return pricing.price20000;
  if (quantity >= 10000 && isValidPrice(pricing.price10000)) return pricing.price10000;
  if (quantity >= 2880 && isValidPrice(pricing.price10000)) return pricing.price10000;
  if (quantity >= 1152 && isValidPrice(pricing.price2880)) return pricing.price2880;
  if (quantity >= 576 && isValidPrice(pricing.price1152)) return pricing.price1152;
  if (quantity >= 144 && isValidPrice(pricing.price576)) return pricing.price576;
  if (quantity >= 48 && isValidPrice(pricing.price144)) return pricing.price144;
  
  // Return base price if valid, otherwise 0 (indicating service not available)
  return isValidPrice(pricing.price48) ? pricing.price48 : 0;
}

// Business rule functions
export function isPremiumFabric(fabricType: string): boolean {
  if (!fabricType) return false;
  
  // Handle dual fabrics like "Chino Twill/Trucker Mesh"
  const fabricNames = fabricType.split('/').map(f => f.trim());
  
  return fabricNames.some(fabric => 
    BUSINESS_RULES.PREMIUM_FABRICS.includes(fabric as any)
  );
}

export function isPremiumClosure(closureType: string): boolean {
  if (!closureType) return false;
  return BUSINESS_RULES.PREMIUM_CLOSURES.includes(closureType.toLowerCase() as any);
}

export function requiresMoldCharge(logoType: string): boolean {
  if (!logoType) return false;
  return BUSINESS_RULES.MOLD_CHARGE_REQUIRED.some(type => 
    logoType.toLowerCase().includes(type)
  );
}

export function shouldWaiveMoldCharge(context: CostingContext, logoType: string): { waived: boolean; reason?: string } {
  // Rule 1: Waive if previous order number provided
  if (context.previousOrderNumber && context.previousOrderNumber.trim()) {
    return {
      waived: true,
      reason: `Waived due to previous order #${context.previousOrderNumber}`
    };
  }
  
  // Rule 2: Future rule - waive for high quantities
  if (context.quantity >= BUSINESS_RULES.MOLD_CHARGE_WAIVERS.HIGH_QUANTITY_THRESHOLD) {
    return {
      waived: true,
      reason: `Waived for high quantity order (${context.quantity} units)`
    };
  }
  
  return { waived: false };
}

// AI detection functions
export function detectFabricFromText(text: string): string | null {
  const lowerText = text.toLowerCase();
  
  // ENHANCED: Check for dual fabric patterns first - multiple patterns for better detection
  let dualFabricMatch = null;
  
  // Pattern 1: "Camo front and Laser Cut back fabric" or "Camo front and Laser Cut back"
  dualFabricMatch = lowerText.match(/([\w\s]+?)\s+front\s+and\s+([\w\s]+?)\s+back(?:\s+fabric)?/i);
  
  if (!dualFabricMatch) {
    // Pattern 2: "front Camo, back Laser Cut" or "front Camo back Laser Cut"
    dualFabricMatch = lowerText.match(/front\s+([\w\s]+?)(?:\s*[,.]?\s*|\s+)back\s+([\w\s]+?)(?:\s*fabric)?(?:\s*[.,]|$)/i);
  }
  
  if (!dualFabricMatch) {
    // Pattern 3: "Camo/Laser Cut" (slash separated)
    dualFabricMatch = lowerText.match(/([\w\s]+?)\/([\w\s]+?)(?:\s+fabric)?(?:\s*[.,]|$)/i);
  }
  if (dualFabricMatch) {
    const frontFabric = dualFabricMatch[1].trim();
    const backFabric = dualFabricMatch[2].trim();
    
    console.log('🧵 [FABRIC-DETECTION] Dual fabric detected:', { frontFabric, backFabric });
    
    // Normalize fabric names
    let normalizedFront = frontFabric;
    let normalizedBack = backFabric;
    
    // Check if front fabric matches known patterns
    for (const [fabric, patterns] of Object.entries(AI_DETECTION_RULES.FABRIC_PATTERNS)) {
      if (patterns.some(pattern => frontFabric.includes(pattern))) {
        normalizedFront = fabric === 'duck camo' ? 'Duck Camo' : 
                         fabric.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
        break;
      }
    }
    
    // Check if back fabric matches known patterns
    for (const [fabric, patterns] of Object.entries(AI_DETECTION_RULES.FABRIC_PATTERNS)) {
      if (patterns.some(pattern => backFabric.includes(pattern))) {
        normalizedBack = fabric === 'black trucker mesh' ? 'Black Trucker Mesh' :
                        fabric === 'trucker mesh' ? 'Trucker Mesh' :
                        fabric.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
        break;
      }
    }
    
    return `${normalizedFront}/${normalizedBack}`;
  }
  
  // Standard single fabric detection
  for (const [fabric, patterns] of Object.entries(AI_DETECTION_RULES.FABRIC_PATTERNS)) {
    if (patterns.some(pattern => lowerText.includes(pattern))) {
      return fabric === 'chino twill' ? 'Chino Twill' : 
             fabric === 'trucker mesh' ? 'Chino Twill/Trucker Mesh' :
             fabric === 'duck camo' ? 'Duck Camo' :
             fabric === 'black trucker mesh' ? 'Black Trucker Mesh' :
             fabric.split(' ').map(word => 
               word.charAt(0).toUpperCase() + word.slice(1)
             ).join(' ');
    }
  }
  
  return null;
}

export function detectLogoTypeFromText(text: string): string | null {
  const lowerText = text.toLowerCase();
  
  // Check for "no logos" first
  if (AI_DETECTION_RULES.LOGO_PATTERNS.None.some(pattern => lowerText.includes(pattern))) {
    return 'None';
  }
  
  for (const [logoType, patterns] of Object.entries(AI_DETECTION_RULES.LOGO_PATTERNS)) {
    if (logoType !== 'None' && patterns.some(pattern => lowerText.includes(pattern))) {
      return logoType;
    }
  }
  
  return null;
}

/**
 * Enhanced multi-logo detection that finds ALL logo types in a message
 * Returns the primary logo (usually front) and all detected logo configurations
 */
export function detectAllLogosFromText(text: string): {
  primaryLogo: string | null;
  allLogos: Array<{
    type: string;
    position: string;
    size: string;
    confidence: number;
  }>;
  multiLogoSetup?: any;
} {
  const lowerText = text.toLowerCase();
  
  // Check for "no logos" first
  if (AI_DETECTION_RULES.LOGO_PATTERNS.None.some(pattern => lowerText.includes(pattern))) {
    return { primaryLogo: 'None', allLogos: [] };
  }
  
  const foundLogos: Array<{
    type: string;
    position: string;
    size: string;
    confidence: number;
    textMatch: string;
  }> = [];
  
  // Enhanced pattern matching with position and size context
  const logoSegments = [
    // Front logo patterns
    { pattern: /(?:big|large|main)\s+logo\s+on\s+front.*?(?:as\s+)?(\w+\s*\w*)/i, position: 'front', size: 'Large' },
    { pattern: /front.*?logo.*?(?:as\s+)?(\w+\s*\w*)/i, position: 'front', size: 'Large' },
    { pattern: /logo\s+on\s+front.*?(?:as\s+)?(\w+\s*\w*)/i, position: 'front', size: 'Large' },
    
    // Back logo patterns
    { pattern: /(small|medium|large)\s+(.+?)\s+(?:back\s+logo|logo.*?back)/i, position: 'back', sizeFromMatch: true },
    { pattern: /back.*?logo.*?(.+?)(?:\.|$|,)/i, position: 'back', size: 'Small' },
    { pattern: /logo.*?on\s+back.*?(.+?)(?:\.|$|,)/i, position: 'back', size: 'Small' },
    
    // General logo patterns
    { pattern: /(\w+\s*\w*)\s+logo/i, position: 'front', size: 'Large' }
  ];
  
  // Process each segment pattern
  logoSegments.forEach(segment => {
    const match = text.match(segment.pattern);
    if (match) {
      const logoTypeText = match[1] || match[2] || '';
      const detectedSize = segment.sizeFromMatch && match[1] ? 
        (match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase()) : 
        segment.size;
      
      // Try to match the detected text to known logo types
      for (const [logoType, patterns] of Object.entries(AI_DETECTION_RULES.LOGO_PATTERNS)) {
        if (logoType !== 'None') {
          const confidence = patterns.some(pattern => logoTypeText.toLowerCase().includes(pattern)) ? 0.9 : 0;
          if (confidence > 0) {
            foundLogos.push({
              type: logoType,
              position: segment.position,
              size: detectedSize || 'Medium',
              confidence,
              textMatch: logoTypeText
            });
          }
        }
      }
    }
  });
  
  // FIXED: Check for direct logo type mentions with BETTER priority system  
  // Process in order of specificity - most specific patterns first
  const logoTypeEntries = Object.entries(AI_DETECTION_RULES.LOGO_PATTERNS);
  
  // Sort by specificity: longer patterns first, then special cases
  logoTypeEntries.sort(([typeA, patternsA], [typeB, patternsB]) => {
    if (typeA === 'None' || typeB === 'None') return 0; // Keep 'None' where it is
    
    // Prioritize specific patches and 3D embroidery
    if (typeA.includes('Patch') && !typeB.includes('Patch')) return -1;
    if (!typeA.includes('Patch') && typeB.includes('Patch')) return 1;
    if (typeA === '3D Embroidery' && typeB !== '3D Embroidery') return -1;
    if (typeA !== '3D Embroidery' && typeB === '3D Embroidery') return 1;
    
    // Sort by longest pattern length (most specific first)
    const maxPatternLengthA = Math.max(...patternsA.map(p => p.length));
    const maxPatternLengthB = Math.max(...patternsB.map(p => p.length));
    return maxPatternLengthB - maxPatternLengthA;
  });
  
  for (const [logoType, patterns] of logoTypeEntries) {
    if (logoType !== 'None') {
      // Sort patterns by length (longest first for most specific matching)
      const sortedPatterns = patterns.slice().sort((a, b) => b.length - a.length);
      
      for (const pattern of sortedPatterns) {
        if (lowerText.includes(pattern)) {
          // FIXED: Skip if this exact logo type + position combo already found
          const existingLogo = foundLogos.find(logo => 
            logo.type === logoType && 
            Math.abs(lowerText.indexOf(pattern) - lowerText.indexOf(logo.textMatch)) < 20
          );
          if (existingLogo) continue;
          
          // Try to determine position and size from context using proximity matching
          let position = 'front'; // Default position
          let size = 'Medium'; // Default size
          
          // Find the logo pattern in the text and check nearby words for position context
          const patternIndex = lowerText.indexOf(pattern);
          if (patternIndex !== -1) {
            // Look for position keywords near the pattern (within 50 characters before/after)
            const contextStart = Math.max(0, patternIndex - 50);
            const contextEnd = Math.min(lowerText.length, patternIndex + pattern.length + 50);
            const contextText = lowerText.substring(contextStart, contextEnd);
            
            // IMPROVED Position detection with specific pattern matching
            if (contextText.includes(' on back') || contextText.includes(' on the back')) {
              position = 'back';
            } else if (contextText.includes(' on front') || contextText.includes(' on the front') || contextText.includes(' on fro')) {
              // FIXED: Handle truncated "on Front" -> "on Fro"
              position = 'front';
            } else if (contextText.includes(' on left') || contextText.includes(' on the left')) {
              position = 'left';
            } else if (contextText.includes(' on right') || contextText.includes(' on the right')) {
              position = 'right';
            } else if (contextText.includes('back')) {
              position = 'back';
            } else if (contextText.includes('front') || contextText.includes('fro')) {
              // FIXED: Handle truncated "Front" -> "Fro"
              position = 'front';
            }
            
            // ENHANCED: Special case handling for common patterns using FULL text
            if (logoType === 'Rubber Patch') {
              // Use full original text for position detection
              if (lowerText.includes('rubber patch on front') || lowerText.includes('rubber patch on fro')) {
                position = 'front';
              } else if (lowerText.includes('rubber patch on back')) {
                position = 'back';
              } else if (lowerText.includes('rubber patch') && lowerText.includes('front')) {
                position = 'front'; // Default for rubber patch + front mention
              }
            } else if (logoType === '3D Embroidery') {
              // Use full original text for position detection
              if (lowerText.includes('3d embroidery on back') || lowerText.includes('3d embroidery on the back')) {
                position = 'back';
              } else if (lowerText.includes('3d embroidery on front') || lowerText.includes('3d embroidery on the front')) {
                position = 'front';
              } else if (lowerText.includes('3d embroidery') && lowerText.includes('back')) {
                position = 'back'; // Default for 3D embroidery + back mention
              }
            }
            
            // Size detection with proximity
            if (contextText.includes('big') || contextText.includes('large')) {
              size = 'Large';
            } else if (contextText.includes('small')) {
              size = 'Small';
            } else {
              // Default size based on position and logo type
              if (logoType === 'Rubber Patch' || logoType === 'Leather Patch') {
                size = 'Small'; // Patches default to Small per CSV
              } else {
                size = position === 'front' ? 'Large' : (position === 'back' ? 'Medium' : 'Small');
              }
            }
          }
          
          // ENHANCED PRIORITY SYSTEM: More specific patterns get higher confidence
          let confidence = 0.8;
          if (logoType === '3D Embroidery' && pattern === '3d embroidery') {
            confidence = 0.95; // Highest confidence for exact match
          } else if (logoType === '3D Embroidery' && pattern === '3d') {
            confidence = 0.9; // High confidence for 3D mention
          } else if (logoType === 'Rubber Patch' && pattern === 'rubber patch') {
            confidence = 0.95; // Highest confidence for exact match
          } else if (logoType === 'Embroidery' && (lowerText.includes('3d') || lowerText.includes('rubber'))) {
            confidence = 0.2; // Very low confidence if more specific options exist
          }
          
          foundLogos.push({
            type: logoType,
            position,
            size,
            confidence,
            textMatch: pattern
          });
        }
      }
    }
  }
  
  // Remove duplicates and sort by confidence
  const uniqueLogos = foundLogos.filter((logo, index, self) => 
    index === self.findIndex(l => l.type === logo.type && l.position === logo.position)
  ).sort((a, b) => b.confidence - a.confidence);
  
  // Determine primary logo (front logo takes priority, then highest confidence)
  const frontLogo = uniqueLogos.find(logo => logo.position === 'front');
  const primaryLogo = frontLogo ? frontLogo.type : (uniqueLogos[0]?.type || null);
  
  // Build multi-logo setup ONLY for explicitly detected logos (no default setup)
  let multiLogoSetup: any = null;
  if (uniqueLogos.length >= 1) {
    multiLogoSetup = {};
    
    // Only add the logos that were actually detected and mentioned
    uniqueLogos.forEach(logo => {
      const application = getDefaultApplicationMethod(logo.type);
      
      // SPECIAL CASE: 3D Embroidery should be mapped to complex logo setup
      let logoType = logo.type;
      if (logo.type === '3D Embroidery') {
        // 3D Embroidery orders should use "{Size} Size Embroidery + 3D Embroidery" setup
        logoType = `${logo.size} Size Embroidery + 3D Embroidery`;
      }
      
      if (logo.position === 'front') {
        multiLogoSetup.front = { type: logoType, size: logo.size, application };
      } else if (logo.position === 'back') {
        multiLogoSetup.back = { type: logoType, size: logo.size, application };
      } else if (logo.position === 'left') {
        multiLogoSetup.left = { type: logoType, size: logo.size, application };
      } else if (logo.position === 'right') {
        multiLogoSetup.right = { type: logoType, size: logo.size, application };
      } else if (logo.position === 'upperBill') {
        multiLogoSetup.upperBill = { type: logoType, size: logo.size, application };
      } else if (logo.position === 'underBill') {
        multiLogoSetup.underBill = { type: logoType, size: logo.size, application };
      }
    });
  }
  
  console.log('🔍 [MULTI-LOGO-DETECTION] Enhanced logo detection results:', {
    originalText: text.substring(0, 100),
    foundLogos: uniqueLogos.map(l => ({ type: l.type, position: l.position, size: l.size, confidence: l.confidence })),
    primaryLogo,
    hasMultiSetup: !!multiLogoSetup
  });
  
  return {
    primaryLogo,
    allLogos: uniqueLogos.map(logo => ({
      type: logo.type,
      position: logo.position,
      size: logo.size,
      confidence: logo.confidence
    })),
    multiLogoSetup
  };
}

export function detectClosureFromText(text: string): string | null {
  const lowerText = text.toLowerCase();
  
  for (const [closure, patterns] of Object.entries(AI_DETECTION_RULES.CLOSURE_PATTERNS)) {
    if (patterns.some(pattern => lowerText.includes(pattern))) {
      return closure;
    }
  }
  
  return null;
}

export function detectSizeFromText(text: string, position: string = 'Front'): string {
  const lowerText = text.toLowerCase();
  
  for (const [size, patterns] of Object.entries(AI_DETECTION_RULES.SIZE_PATTERNS)) {
    if (patterns.some(pattern => lowerText.includes(pattern))) {
      return size;
    }
  }
  
  // Default size based on position
  return position === 'Front' ? 'Large' : 'Small';
}

/**
 * Detect accessories mentioned in the text
 */
export function detectAccessoriesFromText(text: string): string[] {
  const lowerText = text.toLowerCase();
  const foundAccessories: string[] = [];
  
  for (const [accessory, patterns] of Object.entries(AI_DETECTION_RULES.ACCESSORY_PATTERNS)) {
    if (patterns.some(pattern => lowerText.includes(pattern))) {
      if (!foundAccessories.includes(accessory)) {
        foundAccessories.push(accessory);
      }
    }
  }
  
  console.log('🏷️ [ACCESSORY-DETECTION] Accessories detected:', {
    originalText: text.substring(0, 100),
    foundAccessories
  });
  
  return foundAccessories;
}

export function getDefaultApplicationMethod(logoType: string): string {
  const applicationMap: Record<string, string> = {
    '3D Embroidery': 'Direct',
    'Flat Embroidery': 'Direct',
    'Embroidery': 'Direct',
    'Sublimated Print': 'Direct',
    'Leather Patch': 'Run',
    'Rubber Patch': 'Run',
    'Printed Patch': 'Satin',
    'Sublimated Patch': 'Satin',
    'Woven Patch': 'Satin',
    'Print Woven Patch': 'Satin'
  };
  
  return applicationMap[logoType] || 'Direct';
}

// Validation functions
export function validateQuantity(quantity: number): { valid: boolean; error?: string } {
  if (!quantity || quantity <= 0) {
    return { valid: false, error: 'Quantity must be greater than 0' };
  }
  
  if (quantity < 48) {
    return { valid: false, error: 'Minimum quantity is 48 units' };
  }
  
  return { valid: true };
}

export function validateLogoSetup(logoSetup: LogoSetupConfig[]): { valid: boolean; errors?: string[] } {
  const errors: string[] = [];
  
  logoSetup.forEach((logo, index) => {
    if (!logo.type) {
      errors.push(`Logo ${index + 1}: Missing logo type`);
    }
    
    if (!logo.size || !['Small', 'Medium', 'Large'].includes(logo.size)) {
      errors.push(`Logo ${index + 1}: Invalid size. Must be Small, Medium, or Large`);
    }
    
    if (!logo.position) {
      errors.push(`Logo ${index + 1}: Missing position`);
    }
    
    if (!logo.application) {
      errors.push(`Logo ${index + 1}: Missing application method`);
    }
  });
  
  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined
  };
}

export function validateDeliveryMethod(deliveryMethod: string, quantity: number): { valid: boolean; error?: string } {
  if (deliveryMethod === 'air-freight' || deliveryMethod === 'sea-freight') {
    if (quantity < BUSINESS_RULES.FREIGHT_SHIPPING.AIR_FREIGHT_MIN) {
      return {
        valid: false,
        error: `${deliveryMethod} shipping requires minimum ${BUSINESS_RULES.FREIGHT_SHIPPING.AIR_FREIGHT_MIN} units`
      };
    }
  }
  
  return { valid: true };
}

// Export the main calculation functions that will be used by the unified service
export {
  loadPricingData,
  loadBaseProductPricing,
  loadFabricPricingData
};