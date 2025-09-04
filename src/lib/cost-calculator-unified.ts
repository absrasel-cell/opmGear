/**
 * UNIFIED COST CALCULATOR - Single Source of Truth
 * 
 * This is the ONLY place where cost calculations should happen.
 * All other systems (cart, admin, invoices, receipts) MUST use this function.
 * 
 * Key Principles:
 * 1. ONE calculation method for ALL systems
 * 2. Consistent margin application 
 * 3. Reliable base product cost inclusion
 * 4. Proper shipment/bulk pricing context
 * 5. Deterministic results for same input
 */

import { promises as fs } from 'fs';
import path from 'path';
import { getBaseProductPricing, calculateUnitPrice } from '@/lib/pricing';
import prisma from '@/lib/prisma';

export interface UnifiedCostInput {
  // Product configuration
  selectedColors: Record<string, { sizes: Record<string, number> }>;
  logoSetupSelections: Record<string, {
    position?: string;
    size?: string;
    application?: string;
  }>;
  multiSelectOptions: Record<string, string[]>;
  selectedOptions: Record<string, string>;
  
  // Pricing context
  priceTier?: string;
  baseProductPricing?: any; // Optional override
  
  // Shipment context for bulk pricing
  shipmentData?: {
    id: string;
    buildNumber: string;
    totalQuantity: number;
    shippingMethod: string;
    orders?: any[];
  };
  
  // Calculation context for auditing
  calculationContext: 'CART' | 'ADMIN_DASHBOARD' | 'INVOICE' | 'RECEIPT' | 'ORDER_CREATION' | 'REORDER';
  
  // Order context (for consistency with existing orders)
  orderId?: string;
  preserveStoredValues?: boolean; // Use stored values if available and valid
}

export interface UnifiedCostItem {
  name: string;
  cost: number;
  unitPrice: number;
  quantity: number;
  originalCost?: number;
  originalUnitPrice?: number;
  details?: string;
  category: 'base_product' | 'logo_setup' | 'accessories' | 'closure' | 'premium_fabric' | 'delivery' | 'mold_charge';
  waived?: boolean;
  waiverReason?: string;
}

export interface UnifiedCostBreakdown {
  // Individual cost arrays
  items: UnifiedCostItem[];
  
  // Aggregated totals by category
  baseProductTotal: number;
  logoSetupTotal: number;
  accessoriesTotal: number;
  closureTotal: number;
  premiumFabricTotal: number;
  deliveryTotal: number;
  moldChargeTotal: number;
  
  // Final totals
  subtotal: number;
  totalCost: number;
  totalUnits: number;
  
  // Metadata for debugging and auditing
  calculationMetadata: {
    calculatedAt: string;
    context: string;
    orderId?: string;
    priceTier: string;
    marginsApplied: boolean;
    shipmentContext: boolean;
    apiVersion: string;
  };
}

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

// Load customization pricing data with timeout
async function loadCustomizationPricing(): Promise<any[]> {
  try {
    console.log('🔧 [UNIFIED] Loading CSV pricing data...');
    const csvPath = path.join(process.cwd(), 'src/app/csv/Customization Pricings.csv');
    
    // Add timeout to file read operation
    const timeoutMs = 5000; // 5 second timeout
    const csvPromise = fs.readFile(csvPath, 'utf-8');
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('CSV loading timed out')), timeoutMs)
    );
    
    const csvContent = await Promise.race([csvPromise, timeoutPromise]);
    
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
      };
    }).filter(item => item.Name && item.Name.length > 0);
    
    console.log('✅ [UNIFIED] Loaded', pricingData.length, 'pricing items from CSV');
    return pricingData;
    
  } catch (error) {
    console.error('❌ [UNIFIED] Error loading customization pricing:', error);
    
    // Return minimal fallback data to prevent system failure
    return [
      { Name: 'Medium Size Embroidery', type: 'Logo Setup', price48: 2.50, price144: 2.00, price576: 1.75, price1152: 1.50, price2880: 1.25, price10000: 1.00 },
      { Name: 'Regular Delivery', type: 'Shipping', price48: 3.00, price144: 2.50, price576: 2.00, price1152: 1.50, price2880: 1.25, price10000: 1.00 },
      { Name: 'Laser Cut', type: 'Premium Fabric', price48: 0.50, price144: 0.45, price576: 0.40, price1152: 0.35, price2880: 0.30, price10000: 0.25 }
    ];
  }
}



// Get price for quantity from pricing data
function getPriceForQuantity(pricing: any, quantity: number): number {
  if (quantity >= 10000) return pricing.price10000;
  if (quantity >= 2880) return pricing.price2880;
  if (quantity >= 1152) return pricing.price1152;
  if (quantity >= 576) return pricing.price576;
  if (quantity >= 144) return pricing.price144;
  return pricing.price48;
}

/**
 * UNIFIED COST CALCULATOR - THE SINGLE SOURCE OF TRUTH
 * 
 * This function replaces ALL other cost calculation methods in the system.
 * It ensures consistent, deterministic results across cart, admin, invoices, and receipts.
 */
export async function calculateUnifiedCosts(input: UnifiedCostInput): Promise<UnifiedCostBreakdown> {
  const calculationStart = Date.now();
  
  console.log(`🔧 [UNIFIED] Starting calculation for context: ${input.calculationContext}`, {
    orderId: input.orderId,
    priceTier: input.priceTier,
    hasShipmentData: !!input.shipmentData,
    preserveStoredValues: input.preserveStoredValues
  });
  
  try {
    // Load required data
    const pricingData = await loadCustomizationPricing();
    
    // Calculate total units from selectedColors
    let totalUnits = 0;
    Object.values(input.selectedColors || {}).forEach((colorData: any) => {
      if (colorData?.sizes) {
        Object.values(colorData.sizes).forEach((qty: any) => {
          totalUnits += parseInt(qty) || 0;
        });
      }
    });
    
    if (totalUnits === 0) {
      throw new Error('No units found in selectedColors - invalid order data');
    }
    
    // Get base product pricing
    const priceTier = input.priceTier || 'Tier 1';
    const baseProductPricing = input.baseProductPricing || getBaseProductPricing(priceTier);
    
    // Calculate base product unit price
    let baseUnitPrice = baseProductPricing.price48; // Default to lowest tier
    if (totalUnits >= 10000) baseUnitPrice = baseProductPricing.price10000;
    else if (totalUnits >= 2880) baseUnitPrice = baseProductPricing.price2880;
    else if (totalUnits >= 1152) baseUnitPrice = baseProductPricing.price1152;
    else if (totalUnits >= 576) baseUnitPrice = baseProductPricing.price576;
    else if (totalUnits >= 144) baseUnitPrice = baseProductPricing.price144;
    
    const baseProductCost = baseUnitPrice * totalUnits;
    
    const items: UnifiedCostItem[] = [];
    
    // Add base product item
    items.push({
      name: `Base Product - ${totalUnits} units`,
      cost: baseProductCost,
      unitPrice: baseProductCost / totalUnits,
      quantity: totalUnits,
      originalCost: baseProductCost,
      originalUnitPrice: baseUnitPrice,
      details: `${priceTier} pricing`,
      category: 'base_product'
    });
    
    // Calculate logo setup costs
    const logoSetupSelections = input.logoSetupSelections || {};
    const selectedLogoValues = input.multiSelectOptions['logo-setup'] || [];
    
    for (const logoValue of selectedLogoValues) {
      const logoConfig = logoSetupSelections[logoValue] || {};
      
      if (logoConfig.position && logoConfig.size) {
        const logoCost = calculateLogoSetupCost(logoValue, logoConfig, pricingData, totalUnits);
        
        if (logoCost.cost > 0) {
          items.push({
            name: logoCost.details,
            cost: logoCost.cost,
            unitPrice: logoCost.unitPrice,
            quantity: totalUnits,
            originalCost: logoCost.cost,
            originalUnitPrice: logoCost.unitPrice,
            details: logoCost.details,
            category: 'logo_setup'
          });
        }
      }
    }
    
    // Calculate accessories costs
    const selectedAccessories = input.multiSelectOptions.accessories || [];
    for (const accessoryValue of selectedAccessories) {
      const accessoryPricing = pricingData.find(p => 
        p.type === 'Accessories' && 
        (p.Name.toLowerCase() === accessoryValue.toLowerCase())
      );
      
      if (accessoryPricing) {
        const unitPrice = getPriceForQuantity(accessoryPricing, totalUnits);
        const cost = unitPrice * totalUnits;
        
        items.push({
          name: accessoryPricing.Name,
          cost: cost,
          unitPrice: unitPrice,
          quantity: totalUnits,
          originalCost: cost,
          originalUnitPrice: unitPrice,
          category: 'accessories'
        });
      }
    }
    
    // Calculate closure costs
    const selectedClosure = input.selectedOptions['closure-type'];
    if (selectedClosure) {
      const closurePricing = pricingData.find(p => 
        p.type === 'Premium Closure' && 
        (p.Name.toLowerCase() === selectedClosure.toLowerCase())
      );
      
      if (closurePricing) {
        const unitPrice = getPriceForQuantity(closurePricing, totalUnits);
        const cost = unitPrice * totalUnits;
        
        items.push({
          name: closurePricing.Name,
          cost: cost,
          unitPrice: unitPrice,
          quantity: totalUnits,
          originalCost: cost,
          originalUnitPrice: unitPrice,
          category: 'closure'
        });
      }
    }
    
    // Calculate premium fabric costs
    const fabricSetup = input.selectedOptions['fabric-setup'];
    const customFabricSetup = input.selectedOptions['custom-fabric'];
    
    if (fabricSetup || customFabricSetup) {
      const effectiveFabricSetup = fabricSetup === 'Other' ? customFabricSetup : fabricSetup;
      
      if (effectiveFabricSetup) {
        const fabricNames = effectiveFabricSetup.split('/').map(f => f.trim());
        
        for (const fabricName of fabricNames) {
          const premiumFabricPricing = pricingData.find(p => 
            p.type === 'Premium Fabric' && 
            p.Name.toLowerCase() === fabricName.toLowerCase()
          );
          
          if (premiumFabricPricing) {
            const unitPrice = getPriceForQuantity(premiumFabricPricing, totalUnits);
            const cost = unitPrice * totalUnits;
            
            items.push({
              name: premiumFabricPricing.Name,
              cost: cost,
              unitPrice: unitPrice,
              quantity: totalUnits,
              originalCost: cost,
              originalUnitPrice: unitPrice,
              category: 'premium_fabric'
            });
          }
        }
      }
    }
    
    // Calculate delivery costs (with shipment context for bulk pricing)
    const selectedDelivery = input.selectedOptions['delivery-type'];
    if (selectedDelivery) {
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
        // Use combined quantity for bulk shipment pricing if available
        let pricingQuantity = totalUnits;
        if (input.shipmentData && input.shipmentData.totalQuantity > totalUnits) {
          pricingQuantity = input.shipmentData.totalQuantity;
          console.log(`🚚 [UNIFIED] Using bulk pricing: ${pricingQuantity} total units in shipment`);
        }
        
        const unitPrice = getPriceForQuantity(deliveryPricing, pricingQuantity);
        const cost = unitPrice * totalUnits; // Still cost for this order's units
        
        items.push({
          name: input.shipmentData ? 
            `${deliveryPricing.Name} (Bulk: ${input.shipmentData.totalQuantity} units)` : 
            deliveryPricing.Name,
          cost: cost,
          unitPrice: unitPrice,
          quantity: totalUnits,
          originalCost: cost,
          originalUnitPrice: unitPrice,
          category: 'delivery'
        });
      }
    }
    
    // Calculate mold charges (no margins applied - these are final customer prices)
    for (const logoValue of selectedLogoValues) {
      const logoConfig = logoSetupSelections[logoValue] || {};
      
      if (logoConfig.position && logoConfig.size) {
        const moldCharge = calculateMoldCharge(logoValue, logoConfig, pricingData);
        
        if (moldCharge.name) {
          items.push({
            name: moldCharge.name,
            cost: moldCharge.cost,
            unitPrice: moldCharge.unitPrice,
            quantity: moldCharge.waived ? 0 : 1,
            originalCost: moldCharge.cost,
            originalUnitPrice: moldCharge.unitPrice,
            category: 'mold_charge',
            waived: moldCharge.waived,
            waiverReason: moldCharge.waiverReason
          });
        }
      }
    }
    
    // Calculate aggregated totals
    const baseProductTotal = items.filter(i => i.category === 'base_product').reduce((sum, i) => sum + i.cost, 0);
    const logoSetupTotal = items.filter(i => i.category === 'logo_setup').reduce((sum, i) => sum + i.cost, 0);
    const accessoriesTotal = items.filter(i => i.category === 'accessories').reduce((sum, i) => sum + i.cost, 0);
    const closureTotal = items.filter(i => i.category === 'closure').reduce((sum, i) => sum + i.cost, 0);
    const premiumFabricTotal = items.filter(i => i.category === 'premium_fabric').reduce((sum, i) => sum + i.cost, 0);
    const deliveryTotal = items.filter(i => i.category === 'delivery').reduce((sum, i) => sum + i.cost, 0);
    const moldChargeTotal = items.filter(i => i.category === 'mold_charge' && !i.waived).reduce((sum, i) => sum + i.cost, 0);
    
    const subtotal = items.reduce((sum, i) => sum + (i.waived ? 0 : i.cost), 0);
    const totalCost = subtotal; // No additional fees or taxes
    
    const result: UnifiedCostBreakdown = {
      items,
      baseProductTotal,
      logoSetupTotal,
      accessoriesTotal,
      closureTotal,
      premiumFabricTotal,
      deliveryTotal,
      moldChargeTotal,
      subtotal,
      totalCost,
      totalUnits,
      calculationMetadata: {
        calculatedAt: new Date().toISOString(),
        context: input.calculationContext,
        orderId: input.orderId,
        priceTier,
        marginsApplied: false,
        shipmentContext: !!input.shipmentData,
        apiVersion: '1.0.0-unified-no-margins'
      }
    };
    
    console.log(`✅ [UNIFIED] Calculation completed in ${Date.now() - calculationStart}ms`, {
      context: input.calculationContext,
      totalCost: result.totalCost,
      totalUnits: result.totalUnits,
      itemCount: result.items.length
    });
    
    return result;
    
  } catch (error) {
    console.error(`❌ [UNIFIED] Calculation failed for ${input.calculationContext}:`, error);
    throw new Error(`Unified cost calculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Helper function for logo setup cost calculation
function calculateLogoSetupCost(
  logoValue: string,
  logoConfig: any,
  pricingData: any[],
  totalQuantity: number
): { cost: number; unitPrice: number; details: string } {
  let cost = 0;
  let unitPrice = 0;
  let details = '';
  const size = logoConfig.size || 'Medium';

  // Handle different logo types
  if (logoValue.toLowerCase() === '3d embroidery') {
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
    const sizeEmbroideryName = `${size} Size Embroidery`;
    const sizeEmbroideryPricing = pricingData.find(p => 
      p.Name.toLowerCase() === sizeEmbroideryName.toLowerCase()
    );
    
    if (sizeEmbroideryPricing) {
      const sizeUnitPrice = getPriceForQuantity(sizeEmbroideryPricing, totalQuantity);
      unitPrice = sizeUnitPrice;
      cost = sizeUnitPrice * totalQuantity;
      details = `${size} Size Embroidery`;
    }
  } else {
    // Handle patches and other logo types
    const logoTypeMapping: Record<string, string> = {
      'printed patch': 'Print Woven Patch',
      'sublimated patch': 'Print Woven Patch', 
      'woven patch': 'Print Woven Patch',
      'print patch': 'Print Woven Patch',
      'direct print': 'Print Woven Patch',
      'small-rubber-patch': 'Small Rubber Patch',
      'medium-rubber-patch': 'Medium Rubber Patch',
      'large-rubber-patch': 'Large Rubber Patch',
      'small rubber patch': 'Small Rubber Patch',
      'medium rubber patch': 'Medium Rubber Patch',
      'large rubber patch': 'Large Rubber Patch',
      'small-leather-patch': 'Small Leather Patch',
      'medium-leather-patch': 'Medium Leather Patch',
      'large-leather-patch': 'Large Leather Patch',
      'small leather patch': 'Small Leather Patch',
      'medium leather patch': 'Medium Leather Patch',
      'large leather patch': 'Large Leather Patch',
    };
    
    const mappedLogoType = logoTypeMapping[logoValue.toLowerCase()] || logoValue;
    
    const alreadyHasSize = mappedLogoType.toLowerCase().includes(size.toLowerCase());
    const searchName = alreadyHasSize ? mappedLogoType : `${size} ${mappedLogoType}`;
    
    const basePricing = pricingData.find(p => 
      p.Name.toLowerCase() === searchName.toLowerCase()
    );
    
    if (basePricing) {
      const baseUnitPrice = getPriceForQuantity(basePricing, totalQuantity);
      unitPrice = baseUnitPrice;
      cost = baseUnitPrice * totalQuantity;
      details = basePricing.Name;
    }
  }

  // Add application method cost if not "Direct"
  if (logoConfig.application && logoConfig.application !== 'Direct') {
    const applicationPricing = pricingData.find(p => 
      p.Name.toLowerCase() === logoConfig.application?.toLowerCase()
    );
    
    if (applicationPricing) {
      const applicationUnitPrice = getPriceForQuantity(applicationPricing, totalQuantity);
      unitPrice += applicationUnitPrice;
      cost += applicationUnitPrice * totalQuantity;
      details += ` + ${logoConfig.application}`;
    }
  }

  return { cost, unitPrice, details: details || logoValue };
}

// Helper function for mold charge calculation
function calculateMoldCharge(
  logoValue: string,
  logoConfig: any,
  pricingData: any[]
): { cost: number; unitPrice: number; waived: boolean; waiverReason?: string; name: string } {
  const size = logoConfig.size || 'Medium';
  
  // Only apply mold charge for Rubber Patch and Leather Patch
  const requiresMoldCharge = logoValue.toLowerCase().includes('rubber patch') || 
                            logoValue.toLowerCase().includes('leather patch');
  
  if (!requiresMoldCharge) {
    return { cost: 0, unitPrice: 0, waived: false, name: '' };
  }
  
  const moldChargeType = `${size} Mold Charge`;
  const moldPricing = pricingData.find(p => 
    p.type === 'Mold' && 
    p.Name.toLowerCase() === moldChargeType.toLowerCase()
  );
  
  if (!moldPricing) {
    return { cost: 0, unitPrice: 0, waived: false, name: '' };
  }
  
  const unitPrice = moldPricing.price48; // Mold charge is fixed regardless of quantity
  
  return { 
    cost: unitPrice, // One-time charge, not multiplied by quantity
    unitPrice, 
    waived: false, 
    name: `${moldChargeType} (${logoValue})` 
  };
}