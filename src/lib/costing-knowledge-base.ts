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
    quantity: 144, // Standard minimum order quantity
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
  
  // Position-based size defaults (works with any decoration type)
  POSITION_SIZE_DEFAULTS: {
    front: 'Large',      // Most prominent position
    back: 'Small',       // Secondary position
    left: 'Small',       // Side positions
    right: 'Small',      // Side positions
    upperBill: 'Medium', // Bill positions
    underBill: 'Large'   // Under bill has more space
  } as const,

  // Default logo setup (budget-friendly but comprehensive) - LEGACY
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
  } as const,

  // Stitching Color Scheme Mapping Rules
  STITCHING_COLOR_MAPPING: {
    // Cap area definitions for stitching color mapping
    CAP_AREAS: {
      upperBill: 'upperBill',
      underBill: 'underBill',
      frontCrown: 'front',
      sideCrowns: 'sides',
      backCrown: 'back',
      button: 'button',
      closure: 'closure'
    } as const,

    // Stitching scheme types
    SCHEMES: {
      MATCHING: 'Matching',        // Default - uses same color as fabric/cap area
      CONTRAST: 'Contrast',        // Single contrasting color throughout
      COLOR_BASED: 'ColorBased'    // Follows cap color mapping logic
    } as const,

    // Color-based stitching mapping logic
    COLOR_MAPPING: {
      // Solid Color: Single stitching color throughout
      SOLID: {
        pattern: 'single',
        mapping: {
          all: 'primary'  // All areas use primary color
        }
      },

      // Split Color: Red/Black example - Red covers Bill+Front, Black covers Back
      SPLIT: {
        pattern: 'dual',
        mapping: {
          upperBill: 'primary',     // First color
          underBill: 'primary',     // First color
          frontCrown: 'primary',    // First color
          sideCrowns: 'secondary',  // Second color
          backCrown: 'secondary',   // Second color
          button: 'secondary',      // Second color
          closure: 'secondary'      // Second color
        }
      },

      // Tri-Color: Red/White/Black example
      // Red: Upper Bill, Under Bill
      // White: Front Crown
      // Black: Side Crowns, Back Crown
      TRI: {
        pattern: 'triple',
        mapping: {
          upperBill: 'primary',     // Color 1 (Red)
          underBill: 'primary',     // Color 1 (Red)
          button: 'primary',        // Color 1 (Red)
          closure: 'primary',       // Color 1 (Red) - matches button
          frontCrown: 'secondary',  // Color 2 (White)
          sideCrowns: 'tertiary',   // Color 3 (Black)
          backCrown: 'tertiary'     // Color 3 (Black)
        }
      }
    } as const
  } as const
} as const;

// Fabric Color Availability Matrix - Production Business Rules
export const FABRIC_COLOR_AVAILABILITY = {
  // High-availability fabrics (all colors supported)
  PREMIUM_FABRICS: ['Chino Twill', 'Polyester', 'Trucker Mesh'],

  // All available solid colors for premium fabrics
  SOLID_COLORS: [
    'White', 'Black', 'Red', 'Cardinal', 'Maroon', 'Amber Gold', 'Khaki', 'Light Khaki',
    'Stone', 'Light Grey', 'Dark Grey', 'Charcoal Grey', 'Navy', 'Light Blue', 'Royal',
    'Carolina Blue', 'Purple', 'Pink', 'Green', 'Kelly Green', 'Dark Green', 'Gold',
    'Orange', 'Burnt Orange', 'Brown', 'Olive', 'Neon Green', 'Neon Orange', 'Neon Yellow',
    'Neon Pink', 'Neon Blue', 'Realtree', 'MossyOak', 'Kryptek Brown (Regular)',
    'Kryptek Brown (Skull Face version)', 'Kryptek Black/Grey', 'Prym 1', 'Bottomland Camo',
    'Duck Camo (White BG + Khaki + Dark Green + Chocolate)', 'Army Camo (Generic Green/Black Comb)',
    'Digital Camo Grey'
  ],

  // Split color combinations for premium fabrics
  SPLIT_COLORS: [
    'Black/Charcoal', 'Black/Gold', 'Black/White', 'Black/Yellow', 'Brown/Stone',
    'Burnt Orange/Black', 'Cardinal/Black', 'Cardinal/White', 'Charcoal/Black',
    'Charcoal/Carolina Blue', 'Charcoal/Kelly', 'Charcoal/Light Grey', 'Charcoal/Navy',
    'Charcoal/Neon Blue', 'Charcoal/Neon Green', 'Charcoal/Neon Orange', 'Charcoal/Neon Pink',
    'Charcoal/Neon Yellow', 'Charcoal/Orange', 'Charcoal/Red', 'Charcoal/Royal',
    'Charcoal/White', 'Columbia Blue/White', 'Cyan/White', 'Dark Green/White',
    'Dark Green/Yellow', 'Light Grey/Black', 'Heather Grey/Black', 'Heather Grey/Dark Green',
    'Heather Grey/Navy', 'Heather Grey/Royal', 'Heather Grey/White', 'Hot Pink/Black',
    'Hot Pink/White', 'Kelly Green/White', 'Kelly/White', 'Khaki/Brown', 'Khaki/Navy',
    'Khaki/White', 'Light Grey/Light Blue', 'Olive/Black', 'Maroon/White',
    'Navy/Charcoal', 'Navy/Stone', 'Navy/Khaki', 'Navy/Orange', 'Navy/White',
    'Olive/Khaki', 'Orange/Black', 'Orange/White', 'Purple/White', 'Red/Black',
    'Red/White', 'Royal/Black', 'Royal/White'
  ],

  // Tri-color combinations for premium fabrics
  TRI_COLORS: [
    'Amber Gold/Heather Grey/Stone', 'Amber Gold/Stone/Navy', 'Black/Light Grey/Charcoal',
    'Black/Orange/White', 'Black/Red/White', 'Black/White/Light Grey', 'Heather Grey/Navy/White',
    'Heather Grey/Red/White', 'Heather Grey/Royal/White', 'Maroon/Heather Grey/Charcoal',
    'Navy/Carolina Blue/White', 'Navy/Heather Grey/Red', 'Navy/Red/White',
    'Olive/Heather Grey/Stone', 'Olive/White/Black', 'Red/Black/White', 'Red/Navy/White',
    'Red/Royal/White', 'Light Grey/Black/White', 'Gold/White/Carolina Blue'
  ],

  // Limited colors for specialty fabrics
  STANDARD_COLORS: ['Red', 'White', 'Black', 'Light Grey', 'Charcoal', 'Green', 'Maroon', 'Gold', 'Yellow', 'Purple', 'Khaki', 'Brown', 'Navy', 'Royal', 'Orange'],

  // Fabric construction options
  FABRIC_CONSTRUCTIONS: {
    'Chino Twill': {
      'default': '16x12',
      'thin': '20x20',
      'thick': '10x10'
    }
  },

  // Lab Dip sampling threshold
  LAB_DIP_THRESHOLD: 2880
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
    'polyester': ['polyester'], // ADDED: Missing polyester pattern
    'laser cut': ['laser cut', 'laser'],
    'chino twill': ['chino twill', 'twill'],
    'trucker mesh': ['trucker mesh', 'trucker', 'split', 'mesh back'],
    'black trucker mesh': ['black trucker mesh'], // FIXED: Add specific pattern
    'cotton polyester mix': ['cotton polyester mix', 'cotton polyester'] // ADDED: Existing pattern
  } as const,
  
  // Logo type detection patterns - FIXED: More specific patterns to avoid conflicts
  LOGO_PATTERNS: {
    'Rubber Patch': ['rubber patch', 'rubber'],  // ENHANCED: Match both "rubber patch" and just "rubber"
    'Leather Patch': ['leather patch', 'leather'],  // ENHANCED: Match both "leather patch" and just "leather"
    '3D Embroidery': ['3d embroidery', '3d', 'raised embroidery', 'embroidery 3d'],
    'Flat Embroidery': ['flat embroidery', 'embroidery flat'],
    'Embroidery': ['embroidery', 'embroidered'], // Generic embroidery - lower priority
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
    // Pattern 3: "Camo/Laser Cut" (slash separated) - but NOT colors like "Red/White"
    const slashMatch = lowerText.match(/([\w\s]+?)\/([\w\s]+?)(?:\s+fabric)?(?:\s*[.,]|$)/i);
    if (slashMatch) {
      const part1 = slashMatch[1].trim();
      const part2 = slashMatch[2].trim();
      
      // Common colors that should NOT be treated as fabric
      const colors = ['red', 'white', 'black', 'blue', 'green', 'yellow', 'orange', 'purple', 'grey', 'gray', 'brown', 'pink', 'navy', 'royal', 'maroon', 'gold', 'charcoal', 'khaki'];
      
      // If both parts are colors, skip this as fabric detection
      if (colors.includes(part1) && colors.includes(part2)) {
        console.log(`🚫 [FABRIC-DETECTION] Skipping color pattern: ${part1}/${part2}`);
        dualFabricMatch = null;
      } else {
        dualFabricMatch = slashMatch;
      }
    }
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
                         fabric === 'polyester' ? 'Polyester' :
                         fabric === 'laser cut' ? 'Laser Cut' :
                         fabric.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
        break;
      }
    }

    // Check if back fabric matches known patterns
    for (const [fabric, patterns] of Object.entries(AI_DETECTION_RULES.FABRIC_PATTERNS)) {
      if (patterns.some(pattern => backFabric.includes(pattern))) {
        normalizedBack = fabric === 'black trucker mesh' ? 'Black Trucker Mesh' :
                        fabric === 'trucker mesh' ? 'Trucker Mesh' :
                        fabric === 'polyester' ? 'Polyester' :
                        fabric === 'laser cut' ? 'Laser Cut' :
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
             fabric === 'polyester' ? 'Polyester' :
             fabric === 'laser cut' ? 'Laser Cut' :
             fabric === 'cotton polyester mix' ? 'Cotton Polyester Mix' :
             fabric.split(' ').map(word =>
               word.charAt(0).toUpperCase() + word.slice(1)
             ).join(' ');
    }
  }
  
  return null;
}

/**
 * Validate if a color/fabric combination is available
 */
export function validateFabricColorCompatibility(fabric: string, color: string): {
  isValid: boolean;
  message: string;
  suggestedColors?: string[];
} {
  // Normalize fabric name
  const normalizedFabric = fabric.trim();

  // Check if fabric is premium (supports all colors)
  if (FABRIC_COLOR_AVAILABILITY.PREMIUM_FABRICS.includes(normalizedFabric)) {
    // For premium fabrics, check if color exists in available options
    const normalizedColor = color.trim();

    // Check solid colors
    if (FABRIC_COLOR_AVAILABILITY.SOLID_COLORS.includes(normalizedColor)) {
      return { isValid: true, message: `${normalizedColor} is available for ${normalizedFabric}` };
    }

    // Check split colors
    if (FABRIC_COLOR_AVAILABILITY.SPLIT_COLORS.includes(normalizedColor)) {
      return { isValid: true, message: `${normalizedColor} split-color is available for ${normalizedFabric}` };
    }

    // Check tri-colors
    if (FABRIC_COLOR_AVAILABILITY.TRI_COLORS.includes(normalizedColor)) {
      return { isValid: true, message: `${normalizedColor} tri-color is available for ${normalizedFabric}` };
    }

    return {
      isValid: false,
      message: `${normalizedColor} is not available for ${normalizedFabric}`,
      suggestedColors: FABRIC_COLOR_AVAILABILITY.STANDARD_COLORS
    };
  }

  // For specialty fabrics, only standard colors available
  if (FABRIC_COLOR_AVAILABILITY.STANDARD_COLORS.includes(color.trim())) {
    return { isValid: true, message: `${color} is available for ${normalizedFabric}` };
  }

  return {
    isValid: false,
    message: `${color} is not available for ${normalizedFabric}. Specialty fabrics support limited colors only.`,
    suggestedColors: FABRIC_COLOR_AVAILABILITY.STANDARD_COLORS
  };
}

/**
 * Check if order qualifies for Lab Dip sampling
 */
export function checkLabDipEligibility(quantity: number, fabric?: string): {
  eligible: boolean;
  message: string;
  details?: string;
} {
  if (quantity >= FABRIC_COLOR_AVAILABILITY.LAB_DIP_THRESHOLD) {
    return {
      eligible: true,
      message: `Order quantity ${quantity} qualifies for Lab Dip sampling`,
      details: `For orders above ${FABRIC_COLOR_AVAILABILITY.LAB_DIP_THRESHOLD}, we offer custom fabric dyeing with Lab Dip color matching process. This includes fabric construction options for Chino Twill (16x12 default, 20x20 thin, 10x10 thick).`
    };
  }

  return {
    eligible: false,
    message: `Order quantity ${quantity} uses standard fabric inventory`,
    details: `Lab Dip sampling available for orders ${FABRIC_COLOR_AVAILABILITY.LAB_DIP_THRESHOLD}+ pieces with custom color matching and fabric construction options.`
  };
}

/**
 * Get available fabric construction options
 */
export function getFabricConstructionOptions(fabric: string): string[] {
  const normalizedFabric = fabric.trim();

  if (FABRIC_COLOR_AVAILABILITY.FABRIC_CONSTRUCTIONS[normalizedFabric]) {
    return Object.entries(FABRIC_COLOR_AVAILABILITY.FABRIC_CONSTRUCTIONS[normalizedFabric])
      .map(([type, value]) => `${value} (${type})`);
  }

  return [];
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
          let size = 'Large'; // Default size
          
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
              if (lowerText.includes('rubber patch front') || lowerText.includes('rubber patch on front') || lowerText.includes('rubber patch on front')) {
                position = 'front';
              } else if (lowerText.includes('rubber patch back') || lowerText.includes('rubber patch on back')) {
                position = 'back';
              } else if (lowerText.includes('rubber patch') && lowerText.includes('front')) {
                position = 'front'; // Default for rubber patch + front mention
              } else if (lowerText.includes('rubber patch') && lowerText.includes('back')) {
                position = 'back'; // Default for rubber patch + back mention
              }
            } else if (logoType === 'Leather Patch') {
              // Use full original text for position detection
              if (lowerText.includes('leather patch front') || lowerText.includes('leather patch on front') || lowerText.includes('leather patch on fro')) {
                position = 'front';
              } else if (lowerText.includes('leather patch back') || lowerText.includes('leather patch on back')) {
                position = 'back';
              } else if (lowerText.includes('leather patch') && lowerText.includes('front')) {
                position = 'front'; // Default for leather patch + front mention
              } else if (lowerText.includes('leather patch') && lowerText.includes('back')) {
                position = 'back'; // Default for leather patch + back mention
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
    'Leather Patch': 'Patch',
    'Rubber Patch': 'Patch',
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

/**
 * Get default size for any decoration type based on position
 * This replaces the hardcoded DEFAULT_LOGO_SETUP for more flexible logo configuration
 */
export function getDefaultSizeForPosition(position: string, decorationType?: string): string {
  // Normalize position key to match our constants
  const normalizedPosition = position.toLowerCase().replace(/\s+/g, '');
  const positionKey = normalizedPosition as keyof typeof BUSINESS_RULES.POSITION_SIZE_DEFAULTS;

  // Get position-based default
  const defaultSize = BUSINESS_RULES.POSITION_SIZE_DEFAULTS[positionKey];

  if (defaultSize) {
    return defaultSize;
  }

  // Fallback logic for any position not explicitly defined
  switch (normalizedPosition) {
    case 'front':
    case 'center':
      return 'Large';  // Most prominent positions
    case 'back':
    case 'left':
    case 'right':
    case 'side':
      return 'Small';  // Secondary positions
    case 'upperbill':
    case 'underbill':
    case 'bill':
      return 'Medium'; // Bill positions
    default:
      return 'Medium'; // Safe default
  }
}

/**
 * Get default application method for any decoration type
 * This provides consistent application logic across the system
 */
export function getDefaultApplicationForDecoration(decorationType: string): string {
  const typeMap: Record<string, string> = {
    // EMBROIDERY TYPES - Direct Application
    '3D Embroidery': 'Direct',
    'Flat Embroidery': 'Direct',
    'Embroidery': 'Direct',        // Generic embroidery

    // PATCH TYPES - Run Application
    'Leather Patch': 'Run',
    'Rubber Patch': 'Run',
    'Leather': 'Run',              // Short form
    'Rubber': 'Run',               // Short form

    // PRINTED/WOVEN PATCHES - Satin Application
    'Printed Patch': 'Satin',
    'Sublimated Patch': 'Satin',
    'Woven Patch': 'Satin',
    'Print Woven Patch': 'Satin',

    // OTHER PRINT TYPES - Direct Application (fallback)
    'Sublimated Print': 'Direct',
    'Screen Print': 'Direct',
    'Heat Transfer': 'Direct'
  };

  return typeMap[decorationType] || 'Direct'; // Default to Direct application
}

// =====================================================
// STITCHING COLOR SCHEME LOGIC IMPLEMENTATION
// =====================================================

/**
 * Detect stitching color scheme from user text
 * Supports: Matching, Contrast, and Color-Based stitching
 */
export function detectStitchingSchemeFromText(text: string): {
  scheme: string;
  contrastColor?: string;
  colors?: string[];
} {
  const lowerText = text.toLowerCase();

  // Check for explicit contrast stitching
  if (lowerText.includes('contrast stitch') ||
      lowerText.includes('contrasting stitch') ||
      lowerText.includes('different stitch color')) {

    // Try to extract contrast color
    const contrastMatch = lowerText.match(/(?:contrast|contrasting|different)\s+(?:stitch|stitching)?\s*(?:in\s+)?([a-zA-Z\s]+?)(?:\s+stitch|\s+thread|,|$)/i);
    const contrastColor = contrastMatch ? contrastMatch[1].trim() : null;

    return {
      scheme: BUSINESS_RULES.STITCHING_COLOR_MAPPING.SCHEMES.CONTRAST,
      contrastColor: contrastColor || 'White' // Default contrast color
    };
  }

  // Check for color-based stitching (multi-color setup)
  const colorPattern = /(?:red|blue|white|black|green|yellow|orange|purple|pink|brown|gray|grey|navy)/gi;
  const colorMatches = text.match(colorPattern) || [];
  const uniqueColors = [...new Set(colorMatches.map(c => c.toLowerCase()))];

  if (uniqueColors.length >= 2) {
    // Multi-color setup - use color-based stitching
    return {
      scheme: BUSINESS_RULES.STITCHING_COLOR_MAPPING.SCHEMES.COLOR_BASED,
      colors: uniqueColors.map(color => color.charAt(0).toUpperCase() + color.slice(1))
    };
  }

  // Default to matching stitching
  return {
    scheme: BUSINESS_RULES.STITCHING_COLOR_MAPPING.SCHEMES.MATCHING
  };
}

/**
 * Generate area-specific stitching colors based on cap colors
 * Follows the same mapping logic as cap colors
 */
export function generateStitchingColorMapping(
  capColors: string[],
  stitchingScheme: string,
  contrastColor?: string
): { [area: string]: string } {

  const stitchingColors: { [area: string]: string } = {};

  // Handle different stitching schemes
  switch (stitchingScheme) {
    case BUSINESS_RULES.STITCHING_COLOR_MAPPING.SCHEMES.MATCHING:
      // Matching - use same colors as cap areas
      stitchingColors.upperBill = capColors[0] || 'Black';
      stitchingColors.underBill = capColors[0] || 'Black';
      stitchingColors.frontCrown = capColors[0] || 'Black';
      stitchingColors.sideCrowns = capColors[0] || 'Black';
      stitchingColors.backCrown = capColors[0] || 'Black';
      stitchingColors.button = capColors[0] || 'Black';
      stitchingColors.closure = capColors[0] || 'Black';
      break;

    case BUSINESS_RULES.STITCHING_COLOR_MAPPING.SCHEMES.CONTRAST:
      // Contrast - single contrasting color throughout
      const contrastStitchColor = contrastColor || 'White';
      stitchingColors.upperBill = contrastStitchColor;
      stitchingColors.underBill = contrastStitchColor;
      stitchingColors.frontCrown = contrastStitchColor;
      stitchingColors.sideCrowns = contrastStitchColor;
      stitchingColors.backCrown = contrastStitchColor;
      stitchingColors.button = contrastStitchColor;
      stitchingColors.closure = contrastStitchColor;
      break;

    case BUSINESS_RULES.STITCHING_COLOR_MAPPING.SCHEMES.COLOR_BASED:
      // Color-based stitching following cap color mapping
      if (capColors.length === 1) {
        // Solid color
        const mapping = BUSINESS_RULES.STITCHING_COLOR_MAPPING.COLOR_MAPPING.SOLID.mapping;
        const primaryColor = capColors[0];
        Object.keys(BUSINESS_RULES.STITCHING_COLOR_MAPPING.CAP_AREAS).forEach(area => {
          stitchingColors[area] = primaryColor;
        });
      } else if (capColors.length === 2) {
        // Split color: Red/Black - Red covers Bill+Front, Black covers Back
        const mapping = BUSINESS_RULES.STITCHING_COLOR_MAPPING.COLOR_MAPPING.SPLIT.mapping;
        const primaryColor = capColors[0];   // First color
        const secondaryColor = capColors[1]; // Second color

        stitchingColors.upperBill = primaryColor;    // First color
        stitchingColors.underBill = primaryColor;    // First color
        stitchingColors.frontCrown = primaryColor;   // First color
        stitchingColors.sideCrowns = secondaryColor; // Second color
        stitchingColors.backCrown = secondaryColor;  // Second color
        stitchingColors.button = secondaryColor;     // Second color
        stitchingColors.closure = secondaryColor;    // Second color
      } else if (capColors.length >= 3) {
        // Tri-color: Red/White/Black
        // Red: Upper Bill, Under Bill, Button, Closure
        // White: Front Crown
        // Black: Side Crowns, Back Crown
        const mapping = BUSINESS_RULES.STITCHING_COLOR_MAPPING.COLOR_MAPPING.TRI.mapping;
        const color1 = capColors[0]; // Red
        const color2 = capColors[1]; // White
        const color3 = capColors[2]; // Black

        stitchingColors.upperBill = color1;   // Color 1 (Red)
        stitchingColors.underBill = color1;   // Color 1 (Red)
        stitchingColors.button = color1;      // Color 1 (Red)
        stitchingColors.closure = color1;     // Color 1 (Red) - matches button
        stitchingColors.frontCrown = color2;  // Color 2 (White)
        stitchingColors.sideCrowns = color3;  // Color 3 (Black)
        stitchingColors.backCrown = color3;   // Color 3 (Black)
      }
      break;

    default:
      // Default to matching
      const defaultColor = capColors[0] || 'Black';
      Object.keys(BUSINESS_RULES.STITCHING_COLOR_MAPPING.CAP_AREAS).forEach(area => {
        stitchingColors[area] = defaultColor;
      });
  }

  return stitchingColors;
}

/**
 * Parse stitching specifications from order text
 * Returns complete stitching configuration
 */
export function parseStitchingFromText(text: string, capColors?: string[]): {
  scheme: string;
  description: string;
  stitchingColors: { [area: string]: string };
  summary: string;
} {

  // Detect stitching scheme
  const stitchingDetection = detectStitchingSchemeFromText(text);
  const colors = capColors || stitchingDetection.colors || ['Black'];

  // Generate area-specific stitching colors
  const stitchingColors = generateStitchingColorMapping(
    colors,
    stitchingDetection.scheme,
    stitchingDetection.contrastColor
  );

  // Create descriptions
  let description = '';
  let summary = '';

  switch (stitchingDetection.scheme) {
    case BUSINESS_RULES.STITCHING_COLOR_MAPPING.SCHEMES.MATCHING:
      description = `Matching stitching using ${colors[0] || 'cap'} color throughout all areas`;
      summary = `Matching (${colors[0] || 'Standard'})`;
      break;

    case BUSINESS_RULES.STITCHING_COLOR_MAPPING.SCHEMES.CONTRAST:
      const contrastColor = stitchingDetection.contrastColor || 'White';
      description = `Contrast stitching using ${contrastColor} thread throughout all areas`;
      summary = `Contrast (${contrastColor})`;
      break;

    case BUSINESS_RULES.STITCHING_COLOR_MAPPING.SCHEMES.COLOR_BASED:
      if (colors.length === 2) {
        description = `Split-color stitching: ${colors[0]} on bill and front areas, ${colors[1]} on back and side areas`;
        summary = `Split-Color (${colors[0]}/${colors[1]})`;
      } else if (colors.length >= 3) {
        description = `Tri-color stitching: ${colors[0]} on bill/button areas, ${colors[1]} on front, ${colors[2]} on back/sides`;
        summary = `Tri-Color (${colors[0]}/${colors[1]}/${colors[2]})`;
      } else {
        description = `Color-based stitching using ${colors[0]}`;
        summary = `Color-Based (${colors[0]})`;
      }
      break;

    default:
      description = `Standard matching stitching`;
      summary = 'Matching';
  }

  return {
    scheme: stitchingDetection.scheme,
    description,
    stitchingColors,
    summary
  };
}

// Export the main calculation functions that will be used by the unified service
export {
  loadPricingData,
  loadBaseProductPricing,
  loadFabricPricingData
};