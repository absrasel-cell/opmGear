import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

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
  selectedColors?: Record<string, number>;
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
}

interface CostBreakdown {
  baseProductCost: number;
  logoSetupCosts: Array<{
    name: string;
    cost: number;
    unitPrice: number;
    details: string;
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
  deliveryCosts: Array<{
    name: string;
    cost: number;
    unitPrice: number;
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
     };
     
     const mappedLogoType = logoTypeMapping[logoValue.toLowerCase()] || logoValue;
     
     // For patch types, find Size + Type combination
     const sizeWithMappedType = `${size} ${mappedLogoType}`;
     
     let basePricing = pricingData.find(p => 
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
  try {
    const body: CostCalculationRequest = await request.json();
    const pricingData = await loadCustomizationPricing();

    const {
      selectedColors,
      selectedSizes,
      logoSetupSelections,
      multiSelectOptions,
      selectedOptions,
      baseProductPricing
    } = body;

    let totalCost = 0;
    
    // Calculate total units from selectedColors structure
    const totalUnits = selectedColors ? 
      Object.values(selectedColors).reduce((sum: number, colorData: any) => 
        sum + Object.values((colorData as any).sizes).reduce((colorSum: number, qty: any) => colorSum + (qty as number), 0), 0
      ) : 
      (selectedSizes ? Object.values(selectedSizes).reduce((sum: number, qty: any) => sum + (qty as number), 0) : 0);
    
    // Calculate base product cost
    let baseProductCost = 0;
    
    if (selectedColors) {
      // New structure: selectedColors with nested sizes
      Object.entries(selectedColors).forEach(([colorName, colorData]: [string, any]) => {
        const colorTotalQuantity = Object.values((colorData as any).sizes).reduce((sum: number, qty: any) => sum + (qty as number), 0);
        let unitPrice = baseProductPricing.price48;
        if (totalUnits >= 10000) unitPrice = baseProductPricing.price10000;
        else if (totalUnits >= 2880) unitPrice = baseProductPricing.price2880;
        else if (totalUnits >= 1152) unitPrice = baseProductPricing.price1152;
        else if (totalUnits >= 576) unitPrice = baseProductPricing.price576;
        else if (totalUnits >= 144) unitPrice = baseProductPricing.price144;
        
        baseProductCost += colorTotalQuantity * unitPrice;
      });
    } else if (selectedSizes) {
      // Fallback to old structure
      Object.entries(selectedSizes).forEach(([itemName, quantity]) => {
        const qty = quantity as number;
        let unitPrice = baseProductPricing.price48;
        if (totalUnits >= 10000) unitPrice = baseProductPricing.price10000;
        else if (totalUnits >= 2880) unitPrice = baseProductPricing.price2880;
        else if (totalUnits >= 1152) unitPrice = baseProductPricing.price1152;
        else if (totalUnits >= 576) unitPrice = baseProductPricing.price576;
        else if (totalUnits >= 144) unitPrice = baseProductPricing.price144;
        
        baseProductCost += qty * unitPrice;
      });
    }
    totalCost += baseProductCost;

    // Calculate logo setup costs
    const logoSetupCosts: Array<{ name: string; cost: number; unitPrice: number; details: string }> = [];
    const selectedLogoValues = multiSelectOptions['logo-setup'] || [];
    
    selectedLogoValues.forEach(logoValue => {
      const logoConfig = logoSetupSelections[logoValue] || {};
      if (logoConfig.position && logoConfig.size) {
        // Extract original logo type from potentially duplicated key
        // For hyphenated values, try to reconstruct the full name
        let originalLogoType = logoValue;
        if (logoValue.includes('-')) {
          const parts = logoValue.split('-');
          if (parts.length === 2) {
            // For cases like "direct-print" -> "direct print"
            originalLogoType = `${parts[0]} ${parts[1]}`;
          } else {
            // For duplicated cases like "flat-embroidery-123456" -> "flat embroidery"
            originalLogoType = `${parts[0]} ${parts[1]}`;
          }
        }
        const logoCost = calculateLogoSetupCost(originalLogoType, logoConfig, pricingData, totalUnits);
        if (logoCost.cost > 0) {
          logoSetupCosts.push({
            name: logoValue,
            cost: logoCost.cost,
            unitPrice: logoCost.unitPrice,
            details: logoCost.details
          });
          totalCost += logoCost.cost;
        }
      }
    });

    // Calculate accessories costs
    const accessoriesCosts: Array<{ name: string; cost: number; unitPrice: number }> = [];
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
        accessoriesCosts.push({
          name: accessoryValue,
          cost,
          unitPrice
        });
        totalCost += cost;
      }
    });

    // Calculate closure type costs
    const closureCosts: Array<{ name: string; cost: number; unitPrice: number }> = [];
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
        closureCosts.push({
          name: selectedClosure,
          cost,
          unitPrice
        });
        totalCost += cost;
      }
      // If no pricing found, no cost is added (as per requirement)
    }

    // Calculate delivery type costs
    const deliveryCosts: Array<{ name: string; cost: number; unitPrice: number }> = [];
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
        const unitPrice = getPriceForQuantity(deliveryPricing, totalUnits);
        const cost = unitPrice * totalUnits;
        deliveryCosts.push({
          name: selectedDelivery,
          cost,
          unitPrice
        });
        totalCost += cost;
      }
    }

    const costBreakdown: CostBreakdown = {
      baseProductCost,
      logoSetupCosts,
      accessoriesCosts,
      closureCosts,
      deliveryCosts,
      totalCost,
      totalUnits
    };

    return NextResponse.json(costBreakdown);
  } catch (error) {
    console.error('Error calculating cost:', error);
    return NextResponse.json(
      { error: 'Failed to calculate cost' },
      { status: 500 }
    );
  }
}
