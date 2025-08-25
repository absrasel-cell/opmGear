import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { getBaseProductPricing, calculateUnitPrice } from '@/lib/pricing';

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
  try {
    const body: CostCalculationRequest = await request.json();
    const pricingData = await loadCustomizationPricing();

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
      });
    } else if (selectedSizes) {
      // Fallback to old structure
      Object.entries(selectedSizes).forEach(([, quantity]) => {
        const qty = quantity as number;
        
        // Use product-specific pricing if available
        const unitPrice = getUnitPrice(totalUnits);
        baseProductCost += qty * unitPrice;
      });
    } else {
      // If no color/size structure, use total units
      const unitPrice = getUnitPrice(totalUnits);
      baseProductCost = totalUnits * unitPrice;
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
          // Calculate the 48-piece base price for this logo setup
          const baseLogoCost = calculateLogoSetupCost(originalLogoType, logoConfig, pricingData, 48);
          const baseUnitPrice = baseLogoCost.unitPrice;
          
          logoSetupCosts.push({
            name: logoCost.details, // Use the details as the name
            cost: logoCost.cost,
            unitPrice: logoCost.unitPrice,
            details: logoCost.details,
            baseUnitPrice: baseUnitPrice // Add base unit price for discount calculation
          });
          totalCost += logoCost.cost;
        }
      }
    });

    // Calculate mold charge costs
    const moldChargeCosts: Array<{ name: string; cost: number; unitPrice: number; waived: boolean; waiverReason?: string }> = [];
    
    selectedLogoValues.forEach(logoValue => {
      const logoConfig = logoSetupSelections[logoValue] || {};
      
      if (logoConfig.position && logoConfig.size) {
        // Extract original logo type from potentially duplicated key
        let originalLogoType = logoValue;
        if (logoValue.includes('-')) {
          const parts = logoValue.split('-');
          if (parts.length === 2) {
            originalLogoType = `${parts[0]} ${parts[1]}`;
          } else {
            originalLogoType = `${parts[0]} ${parts[1]}`;
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
          name: accessoryPricing.Name,
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
          name: closurePricing.Name,
          cost,
          unitPrice
        });
        totalCost += cost;
      }
      // If no pricing found, no cost is added (as per requirement)
    }

    // Calculate premium fabric costs
    const premiumFabricCosts: Array<{ name: string; cost: number; unitPrice: number }> = [];
    
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
              premiumFabricCosts.push({
                name: premiumFabricPricing.Name,
                cost,
                unitPrice
              });
              totalCost += cost;
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
        
        console.log('🔧 API Debug - Delivery pricing calculation:', {
          deliveryType: deliveryPricing.Name,
          totalUnits,
          shipmentQuantity,
          combinedQuantity,
          pricingQuantity,
          unitPrice,
          totalCost: cost,
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
      premiumFabricCosts,
      deliveryCosts,
      moldChargeCosts,
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
