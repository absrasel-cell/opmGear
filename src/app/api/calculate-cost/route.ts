import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { getBaseProductPricing, calculateUnitPrice, calculateMarginPrice, applySimplifiedMarginsToBreakdown } from '@/lib/pricing';
import { PrismaClient } from '@prisma/client';
import { pricingValidationEngine } from '@/lib/pricing-engine/validation';
import { pricingAuditTrail } from '@/lib/pricing-engine/audit-trail';

const prisma = new PrismaClient();

// Server-side function to get simplified margin settings from database
async function getSimplifiedMarginSettings(): Promise<any> {
  try {
    console.log('🔧 Fetching simplified margin settings from database...');
    
    const dbSettings = await prisma.simplifiedMarginSetting.findMany({
      where: { isActive: true },
      orderBy: { category: 'asc' }
    });
    
    console.log('🔧 Found simplified margin settings in DB:', dbSettings.length, 'active settings');
    
    // Transform database settings to expected format
    const settings = {
      blankCaps: { marginPercent: 60, flatMargin: 0.00 },
      customizations: { marginPercent: 65, flatMargin: 0.10 },
      delivery: { marginPercent: 50, flatMargin: 0.25 }
    };
    
    dbSettings.forEach(setting => {
      const marginPercent = Number(setting.marginPercent);
      const flatMargin = Number(setting.flatMargin);
      
      switch (setting.category) {
        case 'BLANK_CAPS':
          settings.blankCaps = { marginPercent, flatMargin };
          break;
        case 'CUSTOMIZATIONS':
          settings.customizations = { marginPercent, flatMargin };
          break;
        case 'DELIVERY':
          settings.delivery = { marginPercent, flatMargin };
          break;
      }
    });
    
    console.log('🔧 Applied margin settings from database:', {
      blankCaps: `${settings.blankCaps.marginPercent}% + $${settings.blankCaps.flatMargin}`,
      customizations: `${settings.customizations.marginPercent}% + $${settings.customizations.flatMargin}`,
      delivery: `${settings.delivery.marginPercent}% + $${settings.delivery.flatMargin}`
    });
    
    return settings;
  } catch (error) {
    console.error('Error fetching simplified margin settings from database:', error);
    console.log('🔧 Falling back to default margin settings');
    
    // Return default settings as fallback
    return {
      blankCaps: { marginPercent: 60, flatMargin: 0.00 },
      customizations: { marginPercent: 65, flatMargin: 0.10 },
      delivery: { marginPercent: 50, flatMargin: 0.25 }
    };
  }
}

// Legacy function (kept for backwards compatibility)
async function getMarginSettingsFromDB(): Promise<any> {
  try {
    const marginSettings = await prisma.marginSetting.findMany({
      where: { isActive: true },
      include: {
        overrides: false  // For now, just get global settings
      }
    });

    // Transform to the expected format
    const settings: any = {};
    marginSettings.forEach(setting => {
      settings[setting.productType] = {
        marginPercent: Number(setting.marginPercent),
        flatMargin: Number(setting.flatMargin),
        category: setting.category.toLowerCase()
      };
    });

    console.log('🔧 Loaded margin settings from DB:', settings);
    return settings;
  } catch (error) {
    console.error('Error fetching margin settings from DB:', error);
    return {};
  }
}

interface CustomizationPricing {
  Name: string;
  Slug: string;
  type: string;
  price48: number;
  price144: number;
  price576: number;
  price1152: number;
  price2880: number;
  price10000: number;
}

interface LogoSetupSelection {
  position?: string;
  size?: string;
  application?: string;
}

interface CostCalculationRequest {
  selectedColors?: Record<string, { sizes: Record<string, number> }>;
  selectedSizes?: Record<string, number>;
  logoSetupSelections: Record<string, LogoSetupSelection>;
  multiSelectOptions: Record<string, string[]>;
  selectedOptions: Record<string, string>;
  baseProductPricing: {
    price48: number;
    price144: number;
    price576: number;
    price1152: number;
    price2880: number;
    price10000: number;
  };
  shipmentData?: {
    id: string;
    buildNumber: string;
    totalQuantity: number;
    shippingMethod: string;
  };
  fabricSetup?: string;
  customFabricSetup?: string;
  productType?: string;
  previousOrderNumber?: string;
}

interface CostBreakdown {
  baseProductCost: number;
  originalBaseProductCost?: number;
  logoSetupCosts: Array<{
    name: string;
    cost: number;
    unitPrice: number;
    details: string;
    baseUnitPrice?: number;
    originalCost?: number;
    originalUnitPrice?: number;
  }>;
  accessoriesCosts: Array<{
    name: string;
    cost: number;
    unitPrice: number;
    originalCost?: number;
    originalUnitPrice?: number;
  }>;
  closureCosts: Array<{
    name: string;
    cost: number;
    unitPrice: number;
    originalCost?: number;
    originalUnitPrice?: number;
  }>;
  premiumFabricCosts: Array<{
    name: string;
    cost: number;
    unitPrice: number;
    originalCost?: number;
    originalUnitPrice?: number;
  }>;
  deliveryCosts: Array<{
    name: string;
    cost: number;
    unitPrice: number;
    originalCost?: number;
    originalUnitPrice?: number;
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

// Helper function to properly parse CSV lines with quoted values
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
  
  result.push(current); // Add the last field
  return result;
}

async function loadCustomizationPricing(): Promise<CustomizationPricing[]> {
  try {
    // Load pricing data from CSV file only
    const csvPath = path.join(process.cwd(), 'src/app/csv/Customization Pricings.csv');
    const csvContent = await fs.readFile(csvPath, 'utf-8');
    
    const lines = csvContent.split('\n').filter(line => line.trim()); // Remove empty lines
    
    // Skip header row
    const dataLines = lines.slice(1);
    
    return dataLines.map(line => {
      // Parse CSV line, handling quoted values
      const values = parseCSVLine(line);
      
             return {
         Name: (values[0] || '').replace(/"/g, '').trim(),
         Slug: '', // Generate slug from name if needed
         type: (values[1] || '').trim(),
         price48: parseFloat(values[2]) || 0,
         price144: parseFloat(values[3]) || 0,
         price576: parseFloat(values[4]) || 0,
         price1152: parseFloat(values[5]) || 0,
         price2880: parseFloat(values[6]) || 0,
         price10000: parseFloat(values[7]) || 0,
       };
    }).filter(item => item.Name && item.Name.length > 0); // Filter out empty rows
  } catch (error) {
    console.error('Error loading customization pricing from CSV:', error);
    return [];
  }
}

function getPriceForQuantity(pricing: CustomizationPricing, quantity: number): number {
  if (quantity >= 10000) return pricing.price10000;
  if (quantity >= 2880) return pricing.price2880;
  if (quantity >= 1152) return pricing.price1152;
  if (quantity >= 576) return pricing.price576;
  if (quantity >= 144) return pricing.price144;
  return pricing.price48;
}

// Check if a previous order number exists with same logo (placeholder for now)
async function checkPreviousOrderForSameLogo(orderNumber: string, logoDetails: string): Promise<boolean> {
  // TODO: Connect to database to check if previous order exists with same logo
  // For now, return false to always charge mold fee
  // This should check the orders table for the given order number and compare logo details
  return false;
}

function calculateMoldCharge(
  logoValue: string,
  logoConfig: LogoSetupSelection,
  pricingData: CustomizationPricing[],
  previousOrderNumber?: string
): { cost: number; unitPrice: number; waived: boolean; waiverReason?: string; name: string } {
  const size = logoConfig.size || 'Medium';
  let moldChargeType = '';
  let waived = false;
  let waiverReason = '';
  
  // Only apply mold charge for Rubber Patch and Leather Patch
  const requiresMoldCharge = logoValue.toLowerCase().includes('rubber patch') || 
                            logoValue.toLowerCase().includes('leather patch');
  
  if (!requiresMoldCharge) {
    return { cost: 0, unitPrice: 0, waived: false, name: '' };
  }
  
  // Determine mold charge type based on size
  moldChargeType = `${size} Mold Charge`;
  
  const moldPricing = pricingData.find(p => 
    p.type === 'Mold' && 
    p.Name.toLowerCase() === moldChargeType.toLowerCase()
  );
  
  if (!moldPricing) {
    return { cost: 0, unitPrice: 0, waived: false, name: '' };
  }
  
  const unitPrice = moldPricing.price48; // Mold charge is fixed regardless of quantity
  
  // Check if previous order number exists and waive charge
  if (previousOrderNumber && previousOrderNumber.trim()) {
    waived = true;
    waiverReason = `Waived due to previous order #${previousOrderNumber}`;
    return { 
      cost: 0, 
      unitPrice: 0, 
      waived, 
      waiverReason, 
      name: `${moldChargeType} (${logoValue})` 
    };
  }
  
  return { 
    cost: unitPrice, // One-time charge, not multiplied by quantity
    unitPrice, 
    waived, 
    name: `${moldChargeType} (${logoValue})` 
  };
}

function calculateLogoSetupCost(
  logoValue: string,
  logoConfig: LogoSetupSelection,
  pricingData: CustomizationPricing[],
  totalQuantity: number
): { cost: number; unitPrice: number; details: string } {
  let cost = 0;
  let unitPrice = 0;
  let details = '';
  const size = logoConfig.size || 'Medium';

     // Handle different logo types with specific logic
   if (logoValue.toLowerCase() === '3d embroidery') {
     // For 3D Embroidery: Size Embroidery + 3D Embroidery base cost
     
     // 1. Add Size Embroidery cost
     const sizeEmbroideryName = `${size} Size Embroidery`;
     const sizeEmbroideryPricing = pricingData.find(p => 
       p.Name.toLowerCase() === sizeEmbroideryName.toLowerCase()
     );
     
     if (sizeEmbroideryPricing) {
       const sizeUnitPrice = getPriceForQuantity(sizeEmbroideryPricing, totalQuantity);
       unitPrice += sizeUnitPrice;
       cost += sizeUnitPrice * totalQuantity;
       details = `${size} Size Embroidery`;
     }
     
     // 2. Add 3D Embroidery base cost
     const threeDPricing = pricingData.find(p => 
       p.Name.toLowerCase() === '3d embroidery'
     );
     
     if (threeDPricing) {
       const threeDUnitPrice = getPriceForQuantity(threeDPricing, totalQuantity);
       unitPrice += threeDUnitPrice;
       cost += threeDUnitPrice * totalQuantity;
       details += ` + 3D Embroidery`;
     }
     
   } else if (logoValue.toLowerCase() === 'flat embroidery') {
     // For Flat Embroidery: Size Embroidery cost only
     const sizeEmbroideryName = `${size} Size Embroidery`;
     const sizeEmbroideryPricing = pricingData.find(p => 
       p.Name.toLowerCase() === sizeEmbroideryName.toLowerCase()
     );
     
     if (sizeEmbroideryPricing) {
       const sizeUnitPrice = getPriceForQuantity(sizeEmbroideryPricing, totalQuantity);
       unitPrice += sizeUnitPrice;
       cost += sizeUnitPrice * totalQuantity;
       details = `${size} Size Embroidery`;
     }
     
   } else {
     // Handle patch types and other logo types
     
     // Map logo types that should use the same pricing
     const logoTypeMapping: Record<string, string> = {
       'printed patch': 'Print Woven Patch',
       'sublimated patch': 'Print Woven Patch', 
       'woven patch': 'Print Woven Patch',
       'print patch': 'Print Woven Patch',
       'printed-patch': 'Print Woven Patch',
       'sublimated-patch': 'Print Woven Patch', 
       'woven-patch': 'Print Woven Patch',
       'print-patch': 'Print Woven Patch',
       'direct print': 'Print Woven Patch',
       'direct-print': 'Print Woven Patch',
       'flat embroidery': 'Size Embroidery',
       'flat-embroidery': 'Size Embroidery',
       // Add rubber patch mappings
       'small-rubber-patch': 'Rubber Patch',
       'medium-rubber-patch': 'Rubber Patch',
       'large-rubber-patch': 'Rubber Patch',
       'small rubber patch': 'Rubber Patch',
       'medium rubber patch': 'Rubber Patch',
       'large rubber patch': 'Rubber Patch',
       // Add leather patch mappings
       'small-leather-patch': 'Leather Patch',
       'medium-leather-patch': 'Leather Patch',
       'large-leather-patch': 'Leather Patch',
       'small leather patch': 'Leather Patch',
       'medium leather patch': 'Leather Patch',
       'large leather patch': 'Leather Patch',
     };
     
     const mappedLogoType = logoTypeMapping[logoValue.toLowerCase()] || logoValue;
     
     
     // For patch types, find Size + Type combination
     const sizeWithMappedType = `${size} ${mappedLogoType}`;
     
     const basePricing = pricingData.find(p => 
       p.Name.toLowerCase() === sizeWithMappedType.toLowerCase()
     );
     

     if (basePricing) {
       const baseUnitPrice = getPriceForQuantity(basePricing, totalQuantity);
       unitPrice += baseUnitPrice;
       cost += baseUnitPrice * totalQuantity;
       details = `${basePricing.Name}`;
     }
   }

  // Add application method cost if not "Direct"
  if (logoConfig.application && logoConfig.application !== 'Direct') {
    const applicationPricing = pricingData.find(p => 
      p.Name.toLowerCase() === logoConfig.application?.toLowerCase() ||
      p.Slug.toLowerCase() === logoConfig.application?.toLowerCase()
    );
    
    if (applicationPricing) {
      const applicationUnitPrice = getPriceForQuantity(applicationPricing, totalQuantity);
      unitPrice += applicationUnitPrice;
      cost += applicationUnitPrice * totalQuantity;
      details += ` + ${logoConfig.application}`;
    }
  }

  return { cost, unitPrice, details };
}

export async function POST(request: NextRequest) {
  const calculationStartTime = Date.now();
  
  try {
    console.log('🔧 API - Received request');
    const body: CostCalculationRequest = await request.json();
    
    // Extract context for audit trail
    const context = (body as any).calculationContext || 'CART';
    const skipMarginApplication = (body as any).skipMarginApplication || false;
    
    console.log('🔧 API - Request body:', {
      selectedColors: body.selectedColors,
      baseProductPricing: body.baseProductPricing,
      logoSetupSelections: body.logoSetupSelections,
      multiSelectOptions: body.multiSelectOptions,
      selectedOptions: body.selectedOptions,
      hasShipmentData: !!body.shipmentData,
      fabricSetup: body.fabricSetup,
      productType: body.productType,
      context,
      skipMarginApplication
    });
    
    const pricingData = await loadCustomizationPricing();

    // Fetch simplified margin settings to apply to all costs
    const simplifiedMargins = await getSimplifiedMarginSettings();

    const {
      selectedColors,
      selectedSizes,
      logoSetupSelections,
      multiSelectOptions,
      selectedOptions,
      baseProductPricing,
      shipmentData,
      previousOrderNumber
    } = body;
    
    // Validate required fields
    if (!baseProductPricing) {
      throw new Error('baseProductPricing is required');
    }
    
    if (!baseProductPricing.price48) {
      throw new Error('baseProductPricing.price48 is required');
    }
    
    if (!selectedColors || Object.keys(selectedColors).length === 0) {
      throw new Error('selectedColors is required and must not be empty');
    }


    let totalCost = 0;
    
    // Calculate total units from selectedColors structure
    const totalUnits = selectedColors ? 
      Object.values(selectedColors).reduce((sum: number, colorData: unknown) => {
        const colorObj = colorData as { sizes: Record<string, number> };
        return sum + Object.values(colorObj.sizes).reduce((colorSum: number, qty: number) => colorSum + qty, 0);
      }, 0) : 
      (selectedSizes ? Object.values(selectedSizes).reduce((sum: number, qty: number) => sum + qty, 0) : 0);
    
    // Calculate shipment quantity for delivery pricing
    let shipmentQuantity = 0;
    if (shipmentData && 'orders' in shipmentData) {
      const orders = (shipmentData as { orders: Array<{
        selectedColors?: Record<string, { sizes: Record<string, number> }>;
      }> }).orders;
      shipmentQuantity = orders.reduce((sum: number, order) => {
        if (order.selectedColors) {
          return sum + Object.values(order.selectedColors).reduce((orderSum: number, colorData) => 
            orderSum + Object.values(colorData.sizes || {}).reduce((colorSum: number, qty: number) => colorSum + (qty || 0), 0), 0
          );
        }
        return sum;
      }, 0);
    }
    
    // Combined quantity for delivery pricing (current order + shipment orders)
    const combinedQuantity = totalUnits + shipmentQuantity;
    
    
    // Calculate base product cost using centralized pricing logic
    let baseProductCost = 0;
    let originalBaseProductCost = 0;
    
    // Determine the price tier if available in the request (for future consistency)
    const priceTier = (body as any).priceTier || 'Tier 1';
    
    // Helper function to get unit price from baseProductPricing or fallback to centralized pricing
    const getUnitPrice = (quantity: number): number => {
      if (baseProductPricing) {
        // Use the specific pricing passed from the product page
        if (quantity >= 10000) return baseProductPricing.price10000;
        if (quantity >= 2880) return baseProductPricing.price2880;
        if (quantity >= 1152) return baseProductPricing.price1152;
        if (quantity >= 576) return baseProductPricing.price576;
        if (quantity >= 144) return baseProductPricing.price144;
        return baseProductPricing.price48;
      } else {
        // Fallback to centralized pricing
        return calculateUnitPrice(quantity, priceTier);
      }
    };

    if (selectedColors) {
      // New structure: selectedColors with nested sizes
      Object.entries(selectedColors).forEach(([, colorData]: [string, unknown]) => {
        const colorObj = colorData as { sizes: Record<string, number> };
        const colorTotalQuantity = Object.values(colorObj.sizes).reduce((sum: number, qty: number) => sum + qty, 0);
        
        // Use product-specific pricing if available
        const unitPrice = getUnitPrice(totalUnits);
        baseProductCost += colorTotalQuantity * unitPrice;
        originalBaseProductCost += colorTotalQuantity * unitPrice;
      });
    } else if (selectedSizes) {
      // Fallback to old structure
      Object.entries(selectedSizes).forEach(([, quantity]) => {
        const qty = quantity as number;
        
        // Use product-specific pricing if available
        const unitPrice = getUnitPrice(totalUnits);
        baseProductCost += qty * unitPrice;
        originalBaseProductCost += qty * unitPrice;
      });
    } else {
      // If no color/size structure, use total units
      const unitPrice = getUnitPrice(totalUnits);
      baseProductCost = totalUnits * unitPrice;
      originalBaseProductCost = totalUnits * unitPrice;
    }
    
    console.log('🔧 Base product cost calculation (before margins):', {
      originalCost: baseProductCost,
      totalUnits: totalUnits
    });

    // Calculate logo setup costs
    const logoSetupCosts: Array<{ name: string; cost: number; unitPrice: number; details: string; baseUnitPrice?: number; originalCost?: number; originalUnitPrice?: number }> = [];
    const selectedLogoValues = multiSelectOptions['logo-setup'] || [];
    
    selectedLogoValues.forEach(logoValue => {
      const logoConfig = logoSetupSelections[logoValue] || {};
      if (logoConfig.position && logoConfig.size) {
        // Extract original logo type from potentially duplicated key
        // For hyphenated values, try to reconstruct the full name
        let originalLogoType = logoValue;
        if (logoValue.includes('-')) {
          const parts = logoValue.split('-');
          // Check if the last part is a timestamp/ID (all digits)
          const lastPart = parts[parts.length - 1];
          const isTimestampSuffix = /^\d+$/.test(lastPart);
          
          if (isTimestampSuffix) {
            // For duplicated cases like "flat-embroidery-123456" -> "flat embroidery"
            // Remove the timestamp and join the rest with spaces
            originalLogoType = parts.slice(0, -1).join(' ');
          } else {
            // For normal cases like "direct-print" or "large-rubber-patch" -> "direct print" or "large rubber patch"
            originalLogoType = parts.join(' ');
          }
        }
        const logoCost = calculateLogoSetupCost(originalLogoType, logoConfig, pricingData, totalUnits);
        if (logoCost.cost > 0) {
          // Calculate the 48-piece base price for this logo setup
          const baseLogoCost = calculateLogoSetupCost(originalLogoType, logoConfig, pricingData, 48);
          const baseUnitPrice = baseLogoCost.unitPrice;
          
          // Store RAW costs (margins will be applied later via simplified system)
          // Do NOT apply margins here - keep original CSV costs
          const rawLogoCost = logoCost.cost;
          const rawLogoUnitPrice = logoCost.unitPrice;
          
          console.log('🔧 Logo cost calculation (RAW):', {
            logoType: originalLogoType,
            rawCost: rawLogoCost,
            rawUnitPrice: rawLogoUnitPrice,
            baseUnitPrice: baseUnitPrice
          });
          
          logoSetupCosts.push({
            name: logoCost.details, // Use the details as the name
            cost: rawLogoCost, // Raw cost before margins
            unitPrice: rawLogoUnitPrice, // Raw unit price before margins
            details: logoCost.details,
            baseUnitPrice: baseUnitPrice, // Add base unit price for discount calculation
            originalCost: rawLogoCost,
            originalUnitPrice: rawLogoUnitPrice
          });
          totalCost += rawLogoCost; // Add raw cost to total
        }
      }
    });

    // Calculate mold charge costs
    const moldChargeCosts: Array<{ name: string; cost: number; unitPrice: number; waived: boolean; waiverReason?: string }> = [];
    
    selectedLogoValues.forEach(logoValue => {
      const logoConfig = logoSetupSelections[logoValue] || {};
      
      if (logoConfig.position && logoConfig.size) {
        // Extract original logo type from potentially duplicated key
        // For hyphenated values, try to reconstruct the full name
        let originalLogoType = logoValue;
        if (logoValue.includes('-')) {
          const parts = logoValue.split('-');
          // Check if the last part is a timestamp/ID (all digits)
          const lastPart = parts[parts.length - 1];
          const isTimestampSuffix = /^\d+$/.test(lastPart);
          
          if (isTimestampSuffix) {
            // For duplicated cases like "flat-embroidery-123456" -> "flat embroidery"
            // Remove the timestamp and join the rest with spaces
            originalLogoType = parts.slice(0, -1).join(' ');
          } else {
            // For normal cases like "direct-print" or "large-rubber-patch" -> "direct print" or "large rubber patch"
            originalLogoType = parts.join(' ');
          }
        }
        
        const moldCharge = calculateMoldCharge(originalLogoType, logoConfig, pricingData, previousOrderNumber);
        
        
        if (moldCharge.name) {
          moldChargeCosts.push({
            name: moldCharge.name,
            cost: moldCharge.cost,
            unitPrice: moldCharge.unitPrice,
            waived: moldCharge.waived,
            waiverReason: moldCharge.waiverReason
          });
          totalCost += moldCharge.cost;
        }
      }
    });

    // Calculate accessories costs
    const accessoriesCosts: Array<{ name: string; cost: number; unitPrice: number; originalCost?: number; originalUnitPrice?: number }> = [];
    const selectedAccessories = multiSelectOptions.accessories || [];
    
    selectedAccessories.forEach(accessoryValue => {
      const accessoryPricing = pricingData.find(p => 
        p.type === 'Accessories' && 
        (p.Name.toLowerCase() === accessoryValue.toLowerCase() || 
         p.Slug.toLowerCase() === accessoryValue.toLowerCase())
      );
      
      if (accessoryPricing) {
        const unitPrice = getPriceForQuantity(accessoryPricing, totalUnits);
        const cost = unitPrice * totalUnits;
        
        // Store RAW costs (margins will be applied later via simplified system)
        const rawAccessoryCost = cost;
        const rawAccessoryUnitPrice = unitPrice;
        
        console.log('🔧 Accessory cost calculation (RAW):', {
          accessoryName: accessoryPricing.Name,
          rawCost: rawAccessoryCost,
          rawUnitPrice: rawAccessoryUnitPrice
        });
        
        accessoriesCosts.push({
          name: accessoryPricing.Name,
          cost: rawAccessoryCost, // Raw cost before margins
          unitPrice: rawAccessoryUnitPrice, // Raw unit price before margins
          originalCost: rawAccessoryCost,
          originalUnitPrice: rawAccessoryUnitPrice
        });
        totalCost += rawAccessoryCost; // Add raw cost to total
      }
    });

    // Calculate closure type costs
    const closureCosts: Array<{ name: string; cost: number; unitPrice: number; originalCost?: number; originalUnitPrice?: number }> = [];
    const selectedClosure = selectedOptions['closure-type'];
    
    if (selectedClosure) {
      // Only add cost if there's actual pricing data for this closure type
      const closurePricing = pricingData.find(p => 
        p.type === 'Premium Closure' && 
        (p.Name.toLowerCase() === selectedClosure.toLowerCase() || 
         p.Slug.toLowerCase() === selectedClosure.toLowerCase())
      );
      
      if (closurePricing) {
        const unitPrice = getPriceForQuantity(closurePricing, totalUnits);
        const cost = unitPrice * totalUnits;
        
        // Store RAW costs (margins will be applied later via simplified system)
        const rawClosureCost = cost;
        const rawClosureUnitPrice = unitPrice;
        
        console.log('🔧 Closure cost calculation (RAW):', {
          closureName: closurePricing.Name,
          rawCost: rawClosureCost,
          rawUnitPrice: rawClosureUnitPrice
        });
        
        closureCosts.push({
          name: closurePricing.Name,
          cost: rawClosureCost, // Raw cost before margins
          unitPrice: rawClosureUnitPrice, // Raw unit price before margins
          originalCost: rawClosureCost,
          originalUnitPrice: rawClosureUnitPrice
        });
        totalCost += rawClosureCost; // Add raw cost to total
      }
      // If no pricing found, no cost is added (as per requirement)
    }

    // Calculate premium fabric costs
    const premiumFabricCosts: Array<{ name: string; cost: number; unitPrice: number; originalCost?: number; originalUnitPrice?: number }> = [];
    
    // Get fabric setup from selectedOptions (for cart) or direct body properties (for product page)
    const fabricSetup = selectedOptions?.['fabric-setup'] || body.fabricSetup;
    const customFabricSetup = selectedOptions?.['custom-fabric'] || body.customFabricSetup; // Fix: use 'custom-fabric' not 'custom-fabric-setup'
    const productType = body.productType;
    
    console.log('🔧 API Debug - Premium Fabric processing:', {
      fabricSetup,
      customFabricSetup,
      effectiveFabricSetup: fabricSetup === 'Other' ? customFabricSetup : fabricSetup,
      hasFabricSetup: !!(fabricSetup || customFabricSetup),
      fabricSetupFromOptions: selectedOptions?.['fabric-setup'],
      customFabricFromOptions: selectedOptions?.['custom-fabric'], // Fix: use correct field name
      allSelectedOptions: selectedOptions
    });
    
    
    // Only add premium fabric cost if the product has a premium fabric setup
    if (fabricSetup || customFabricSetup) {
      const effectiveFabricSetup = fabricSetup === 'Other' ? customFabricSetup : fabricSetup;
      
      if (effectiveFabricSetup) {
        // Handle dual fabric setups (e.g., "Polyester/Laser Cut")
        const fabricNames = effectiveFabricSetup.split('/').map(f => f.trim());
        
        // Check each fabric component for premium pricing
        for (const fabricName of fabricNames) {
          console.log('🔧 API Debug - Searching for premium fabric:', {
            fabricName,
            lowercaseName: fabricName.toLowerCase(),
            availablePremiumFabrics: pricingData.filter(p => p.type === 'Premium Fabric').map(p => p.Name)
          });
          
          const premiumFabricPricing = pricingData.find(p => 
            p.type === 'Premium Fabric' && 
            p.Name.toLowerCase() === fabricName.toLowerCase()
          );
          
          if (premiumFabricPricing) {
            const unitPrice = getPriceForQuantity(premiumFabricPricing, totalUnits);
            const cost = unitPrice * totalUnits;
            
            console.log('🔧 API Debug - Found premium fabric pricing:', {
              name: premiumFabricPricing.Name,
              unitPrice,
              cost,
              totalUnits
            });
            
            // Check if this premium fabric is already added (avoid duplicates)
            const existingFabric = premiumFabricCosts.find(f => f.name === premiumFabricPricing.Name);
            if (!existingFabric) {
              // Store RAW costs (margins will be applied later via simplified system)
              const rawFabricCost = cost;
              const rawFabricUnitPrice = unitPrice;
              
              console.log('🔧 Premium fabric cost calculation (RAW):', {
                fabricName: premiumFabricPricing.Name,
                rawCost: rawFabricCost,
                rawUnitPrice: rawFabricUnitPrice
              });
              
              premiumFabricCosts.push({
                name: premiumFabricPricing.Name,
                cost: rawFabricCost, // Raw cost before margins
                unitPrice: rawFabricUnitPrice, // Raw unit price before margins
                originalCost: rawFabricCost,
                originalUnitPrice: rawFabricUnitPrice
              });
              totalCost += rawFabricCost; // Add raw cost to total
              console.log('🔧 API Debug - Added premium fabric cost:', {
                name: premiumFabricPricing.Name,
                cost,
                newTotalCost: totalCost
              });
            } else {
              console.log('🔧 API Debug - Duplicate premium fabric, skipping:', premiumFabricPricing.Name);
            }
          } else {
            console.log('🔧 API Debug - No premium fabric pricing found for:', fabricName);
          }
        }
      }
    }

    // Calculate delivery type costs
    const deliveryCosts: Array<{ name: string; cost: number; unitPrice: number; originalCost?: number; originalUnitPrice?: number }> = [];
    const selectedDelivery = selectedOptions['delivery-type'];
    
    if (selectedDelivery) {
      // Map delivery types to CSV names
      const deliveryTypeMapping: Record<string, string> = {
        'regular': 'Regular Delivery',
        'priority': 'Priority Delivery',
        'air-freight': 'Air Freight',
        'sea-freight': 'Sea Freight',
      };
      
      const mappedDeliveryName = deliveryTypeMapping[selectedDelivery.toLowerCase()] || selectedDelivery;
      const deliveryPricing = pricingData.find(p => 
        p.type === 'Shipping' && 
        p.Name.toLowerCase() === mappedDeliveryName.toLowerCase()
      );
      
      if (deliveryPricing) {
        // For delivery pricing consistency across product page and cart:
        // - If there's shipment data, use combined quantity for volume discounts (matches product page)
        // - If no shipment data, use current order quantity but ensure consistency
        let pricingQuantity = totalUnits;
        
        if (shipmentQuantity > 0) {
          // Use actual combined quantity when shipment data is available (product page behavior)
          pricingQuantity = combinedQuantity;
          console.log('🚚 Using combined quantity for shipment-based delivery pricing:', {
            currentOrder: totalUnits,
            existingShipment: shipmentQuantity,
            combined: combinedQuantity
          });
        } else {
          // Use current order quantity for consistent cart behavior
          pricingQuantity = totalUnits;
          console.log('🚚 Using order quantity for delivery pricing:', {
            orderQuantity: totalUnits
          });
        }
        
        const unitPrice = getPriceForQuantity(deliveryPricing, pricingQuantity);
        const cost = unitPrice * totalUnits;
        
        // Store RAW costs (margins will be applied later via simplified system)
        const rawDeliveryCost = cost;
        const rawDeliveryUnitPrice = unitPrice;
        
        console.log('🔧 Delivery cost calculation (RAW):', {
          deliveryType: deliveryPricing.Name,
          totalUnits,
          shipmentQuantity,
          combinedQuantity,
          pricingQuantity,
          rawUnitPrice: rawDeliveryUnitPrice,
          rawCost: rawDeliveryCost,
          isShipmentBased: shipmentQuantity > 0,
          deliveryTiers: {
            price48: deliveryPricing.price48,
            price144: deliveryPricing.price144,
            price576: deliveryPricing.price576,
            price1152: deliveryPricing.price1152,
            price2880: deliveryPricing.price2880,
            price10000: deliveryPricing.price10000
          }
        });
        
        deliveryCosts.push({
          name: shipmentQuantity > 0 
            ? `${deliveryPricing.Name} (Combined: ${combinedQuantity} units)`
            : deliveryPricing.Name,
          cost: rawDeliveryCost, // Raw cost before margins
          unitPrice: rawDeliveryUnitPrice, // Raw unit price before margins
          originalCost: rawDeliveryCost,
          originalUnitPrice: rawDeliveryUnitPrice
        });
        totalCost += rawDeliveryCost; // Add raw cost to total
      }
    }

    // Note: Base product cost will be included in the final total calculation by applySimplifiedMarginsToBreakdown()
    // Do NOT add baseProductCost to totalCost here to avoid double-counting

    // Calculate the correct total cost including base product cost
    const correctTotalCost = baseProductCost + totalCost;
    
    const costBreakdown: CostBreakdown = {
      baseProductCost: baseProductCost,
      logoSetupCosts,
      accessoriesCosts,
      closureCosts,
      premiumFabricCosts,
      deliveryCosts,
      moldChargeCosts,
      totalCost: correctTotalCost,
      totalUnits,
      originalBaseProductCost
    };
    
    console.log('🔧 Final cost breakdown before margins (RAW COSTS):', {
      rawBaseProductCost: baseProductCost,
      totalRawLogoCosts: logoSetupCosts.reduce((sum, item) => sum + item.cost, 0),
      totalRawAccessoryCosts: accessoriesCosts.reduce((sum, item) => sum + item.cost, 0),
      totalRawClosureCosts: closureCosts.reduce((sum, item) => sum + item.cost, 0),
      totalRawFabricCosts: premiumFabricCosts.reduce((sum, item) => sum + item.cost, 0),
      totalRawDeliveryCosts: deliveryCosts.reduce((sum, item) => sum + item.cost, 0),
      totalRawMoldCosts: moldChargeCosts.reduce((sum, item) => sum + item.cost, 0),
      rawTotalCost: correctTotalCost,
      breakdown: {
        baseProductCost: baseProductCost,
        nonBaseCosts: totalCost,
        calculatedTotal: correctTotalCost
      },
      marginsWillBeAppliedNext: !skipMarginApplication
    });


    console.log('🔧 Final cost breakdown (raw costs before margins):', {
      baseProductCost: costBreakdown.baseProductCost,
      totalLogoCosts: costBreakdown.logoSetupCosts.reduce((sum, item) => sum + item.cost, 0),
      totalAccessoryCosts: costBreakdown.accessoriesCosts.reduce((sum, item) => sum + item.cost, 0),
      totalClosureCosts: costBreakdown.closureCosts.reduce((sum, item) => sum + item.cost, 0),
      totalDeliveryCosts: costBreakdown.deliveryCosts.reduce((sum, item) => sum + item.cost, 0),
      correctedTotalCost: costBreakdown.totalCost
    });

    // Apply simplified margins to the entire cost breakdown (unless skipped)
    let finalCostBreakdown = costBreakdown;
    
    if (!skipMarginApplication) {
      try {
        console.log('🔧 ==> APPLYING SIMPLIFIED MARGINS <==' );
        console.log('🔧 Margin settings to apply:', {
          blankCaps: `${simplifiedMargins.blankCaps.marginPercent}% + $${simplifiedMargins.blankCaps.flatMargin}`,
          customizations: `${simplifiedMargins.customizations.marginPercent}% + $${simplifiedMargins.customizations.flatMargin}`,
          delivery: `${simplifiedMargins.delivery.marginPercent}% + $${simplifiedMargins.delivery.flatMargin}`
        });
        
        console.log('🔧 BEFORE MARGIN APPLICATION:', {
          baseProductCost: costBreakdown.baseProductCost,
          logoSetupTotal: costBreakdown.logoSetupCosts.reduce((sum, item) => sum + item.cost, 0),
          accessoriesTotal: costBreakdown.accessoriesCosts.reduce((sum, item) => sum + item.cost, 0),
          closureCostsTotal: costBreakdown.closureCosts.reduce((sum, item) => sum + item.cost, 0),
          premiumFabricTotal: costBreakdown.premiumFabricCosts.reduce((sum, item) => sum + item.cost, 0),
          deliveryTotal: costBreakdown.deliveryCosts.reduce((sum, item) => sum + item.cost, 0),
          moldChargeTotal: costBreakdown.moldChargeCosts?.reduce((sum, item) => sum + item.cost, 0) || 0,
          totalBeforeMargins: costBreakdown.totalCost
        });
        
        finalCostBreakdown = applySimplifiedMarginsToBreakdown(costBreakdown, simplifiedMargins);
        
        console.log('🔧 AFTER MARGIN APPLICATION:', {
          baseProductCost: finalCostBreakdown.baseProductCost,
          logoSetupTotal: finalCostBreakdown.logoSetupCosts.reduce((sum, item) => sum + (item as any).customerCost || item.cost, 0),
          accessoriesTotal: finalCostBreakdown.accessoriesCosts.reduce((sum, item) => sum + (item as any).customerCost || item.cost, 0),
          closureCostsTotal: finalCostBreakdown.closureCosts.reduce((sum, item) => sum + (item as any).customerCost || item.cost, 0),
          premiumFabricTotal: finalCostBreakdown.premiumFabricCosts.reduce((sum, item) => sum + (item as any).customerCost || item.cost, 0),
          deliveryTotal: finalCostBreakdown.deliveryCosts.reduce((sum, item) => sum + (item as any).customerCost || item.cost, 0),
          moldChargeTotal: finalCostBreakdown.moldChargeCosts?.reduce((sum, item) => sum + (item as any).customerCost || item.cost, 0) || 0,
          totalAfterMargins: finalCostBreakdown.totalCost
        });
        
        console.log('🔧 MARGIN IMPACT SUMMARY:', {
          originalTotal: costBreakdown.totalCost,
          finalTotal: finalCostBreakdown.totalCost,
          differenceAmount: finalCostBreakdown.totalCost - costBreakdown.totalCost,
          differencePercent: `${(((finalCostBreakdown.totalCost - costBreakdown.totalCost) / costBreakdown.totalCost) * 100).toFixed(2)}%`
        });
        
      } catch (marginError) {
        console.error('Error applying simplified margins:', marginError);
        console.error('Margin error stack:', marginError.stack);
        // Return the original cost breakdown without margins as fallback
        console.log('🔧 Returning original cost breakdown as fallback');
        finalCostBreakdown = costBreakdown;
      }
    } else {
      console.log('🔧 Skipping margin application as requested');
    }
    
    // ENTERPRISE VALIDATION & AUDIT TRAIL
    const calculationTime = Date.now() - calculationStartTime;
    
    // Validate pricing consistency
    const validation = pricingValidationEngine.validate(finalCostBreakdown, context);
    
    // Record audit trail
    const auditEventId = pricingAuditTrail.recordCalculation(
      context as any,
      finalCostBreakdown,
      validation,
      calculationTime,
      {
        productName: body.productType,
        priceTier: (body as any).priceTier || 'Tier 1',
        marginSettings: simplifiedMargins,
        apiCallCount: 1
      }
    );
    
    // Log validation results
    if (!validation.isValid) {
      console.error('🚨 PRICING VALIDATION FAILED:', {
        auditEventId,
        context,
        errors: validation.errors,
        validationScore: validation.summary.validationScore
      });
    } else if (validation.warnings.length > 0) {
      console.warn('⚠️ PRICING WARNINGS:', {
        auditEventId,
        context,
        warnings: validation.warnings,
        validationScore: validation.summary.validationScore
      });
    }
    
    // Add audit metadata to response
    const responseWithAudit = {
      ...finalCostBreakdown,
      _audit: {
        eventId: auditEventId,
        calculationTime,
        validationScore: validation.summary.validationScore,
        hasValidationErrors: !validation.isValid,
        context
      }
    };
    
    return NextResponse.json(responseWithAudit);
  } catch (error) {
    console.error('Error calculating cost:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error details:', errorMessage);
    return NextResponse.json(
      { 
        error: 'Failed to calculate cost',
        details: errorMessage,
        type: error instanceof Error ? error.constructor.name : 'Unknown'
      },
      { status: 500 }
    );
  }
}
