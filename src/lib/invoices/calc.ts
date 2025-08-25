import { Order } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { promises as fs } from 'fs';
import path from 'path';
import { calculateUnitPrice } from '@/lib/pricing';

interface OrderWithDetails extends Order {
  // Since Order model stores data as JSON, we need to extract pricing info from it
  user?: {
    customerRole?: 'RETAIL' | 'WHOLESALE' | 'SUPPLIER';
  };
}

interface DetailedInvoiceItem {
  name: string;
  description?: string;
  quantity: number;
  unitPrice: Decimal;
  total: Decimal;
  category: 'cap' | 'logo' | 'accessory' | 'closure' | 'delivery' | 'other';
}

interface CustomizationPricing {
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
    const csvPath = path.join(process.cwd(), 'src/app/csv/Customization Pricings.csv');
    const csvContent = await fs.readFile(csvPath, 'utf-8');
    const lines = csvContent.trim().split('\n');
    
    if (lines.length < 2) {
      console.warn('CSV file is empty or has no data rows');
      return [];
    }
    
    const headers = parseCSVLine(lines[0]);
    const data: CustomizationPricing[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      if (values.length >= headers.length - 1) { // Allow for missing last column
        data.push({
          Name: values[0] || '',
          type: values[1] || '',
          price48: parseFloat(values[2]) || 0,
          price144: parseFloat(values[3]) || 0,
          price576: parseFloat(values[4]) || 0,
          price1152: parseFloat(values[5]) || 0,
          price2880: parseFloat(values[6]) || 0,
          price10000: parseFloat(values[7]) || 0,
          price20000: parseFloat(values[8]) || 0
        });
      }
    }
    
    return data;
  } catch (error) {
    console.error('Error loading customization pricing:', error);
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
  logoConfig: any,
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
  } else {
    // Handle other logo types (patches, prints, etc.)
    
    // Special handling for flat embroidery - map to size embroidery
    if (logoValue.toLowerCase().includes('embroidery') && logoValue.toLowerCase() !== '3d embroidery') {
      const sizeEmbroideryName = `${size} Size Embroidery`;
      const sizeEmbroideryPricing = pricingData.find(p => 
        p.Name.toLowerCase() === sizeEmbroideryName.toLowerCase()
      );
      
      if (sizeEmbroideryPricing) {
        unitPrice = getPriceForQuantity(sizeEmbroideryPricing, totalQuantity);
        cost = unitPrice * totalQuantity;
        details = `${size} Size Embroidery`;
      } else {
        // Fallback to generic embroidery if size-specific not found
        details = logoValue;
      }
    } else {
      // Handle other logo types (patches, prints, etc.)
      const directMatch = pricingData.find(p => 
        p.Name.toLowerCase() === logoValue.toLowerCase()
      );
      
      if (directMatch) {
        unitPrice = getPriceForQuantity(directMatch, totalQuantity);
        cost = unitPrice * totalQuantity;
        details = logoValue;
      } else {
        // Try to find size-based match
        const sizeBasedName = `${size} ${logoValue}`;
        const sizeMatch = pricingData.find(p => 
          p.Name.toLowerCase() === sizeBasedName.toLowerCase()
        );
        
        if (sizeMatch) {
          unitPrice = getPriceForQuantity(sizeMatch, totalQuantity);
          cost = unitPrice * totalQuantity;
          details = sizeBasedName;
        }
      }
    }
  }

  return { cost, unitPrice, details: details || logoValue };
}

interface InvoiceCalculation {
  items: DetailedInvoiceItem[];
  subtotal: Decimal;
  discount: Decimal;
  shipping: Decimal;
  tax: Decimal;
  total: Decimal;
  breakdown: {
    blankCapCost: Decimal;
    logoSetupCost: Decimal;
    accessoriesCost: Decimal;
    deliveryCost: Decimal;
  };
}

export async function calcInvoiceFromOrder(order: OrderWithDetails): Promise<InvoiceCalculation> {
  // Extract pricing data from the order JSON fields
  const selectedOptions = typeof order.selectedOptions === 'string' 
    ? JSON.parse(order.selectedOptions) 
    : order.selectedOptions || {};
    
  const logoSetupSelections = typeof order.logoSetupSelections === 'string'
    ? JSON.parse(order.logoSetupSelections)
    : order.logoSetupSelections || {};

  const selectedColors = typeof order.selectedColors === 'string'
    ? JSON.parse(order.selectedColors)
    : order.selectedColors || {};

  const multiSelectOptions = typeof order.multiSelectOptions === 'string'
    ? JSON.parse(order.multiSelectOptions)
    : order.multiSelectOptions || {};

  let subtotal = new Decimal(0);
  let discount = new Decimal(0);
  let shipping = new Decimal(0);
  let tax = new Decimal(0);
  
  const items: DetailedInvoiceItem[] = [];
  const breakdown = {
    blankCapCost: new Decimal(0),
    logoSetupCost: new Decimal(0),
    accessoriesCost: new Decimal(0),
    deliveryCost: new Decimal(0)
  };

  // Calculate total quantity from selectedColors
  let totalQuantity = 0;
  let baseUnitPrice = new Decimal(1.60); // Default tier pricing (Tier 2 to match Order Management)
  
  // Extract quantity from selectedColors structure
  Object.values(selectedColors).forEach((colorData: any) => {
    if (colorData?.sizes) {
      Object.values(colorData.sizes).forEach((qty: any) => {
        totalQuantity += parseInt(qty) || 0;
      });
    }
  });

  // If no quantity found in colors, try other sources
  if (totalQuantity === 0) {
    totalQuantity = selectedOptions.quantity || selectedOptions.volume || 1;
  }

  // Determine pricing tier from the product's embedded priceTier field
  // This is the true source of truth - each product has its own tier set in Product Management
  let pricingTier = 'Tier 1'; // Default fallback
  
  // TODO: Look up the product from Sanity using order.productName to get the actual priceTier
  // For now, we'll use Tier 1 as default to match current behavior until we implement product lookup
  // The proper implementation would be:
  // 1. Query Sanity for product by productName 
  // 2. Extract product.priceTier field
  // 3. Use that tier for pricing
  
  // Use centralized pricing calculation with determined tier
  const calculatedUnitPrice = calculateUnitPrice(totalQuantity, pricingTier);
  baseUnitPrice = new Decimal(calculatedUnitPrice);

  // Try to get actual pricing from order data if available
  if (selectedOptions.totalPrice) {
    const totalPrice = new Decimal(selectedOptions.totalPrice);
    baseUnitPrice = totalPrice.div(totalQuantity || 1);
  } else if (selectedOptions.basePrice || selectedOptions.price) {
    baseUnitPrice = new Decimal(selectedOptions.basePrice || selectedOptions.price);
  } else if (selectedOptions.unitPrice) {
    baseUnitPrice = new Decimal(selectedOptions.unitPrice);
  }

  // Main product item - Blank Cap Cost
  const blankCapCost = baseUnitPrice.mul(totalQuantity);
  breakdown.blankCapCost = blankCapCost;
  
  items.push({
    name: 'Blank Cap Cost',
    description: `${totalQuantity} units @ ${baseUnitPrice.toFixed(2)} ea`,
    quantity: totalQuantity,
    unitPrice: baseUnitPrice,
    total: blankCapCost,
    category: 'cap'
  });
  
  subtotal = subtotal.add(blankCapCost);

  // Load pricing data for accurate logo calculations
  const pricingData = await loadCustomizationPricing();

  // Logo setup costs from logoSetupSelections and multiSelectOptions
  if (logoSetupSelections && Object.keys(logoSetupSelections).length > 0) {
    // Process logo setup selections with actual pricing
    Object.entries(logoSetupSelections).forEach(([logoType, logoConfig]: [string, any]) => {
      if (logoConfig && typeof logoConfig === 'object') {
        // Calculate logo cost using actual pricing data
        const logoCalculation = calculateLogoSetupCost(logoType, logoConfig, pricingData, totalQuantity);
        
        if (logoCalculation.cost > 0) {
          const logoPrice = new Decimal(logoCalculation.unitPrice);
          const logoTotal = new Decimal(logoCalculation.cost);
          breakdown.logoSetupCost = breakdown.logoSetupCost.add(logoTotal);
          
          // Determine position from logoConfig or default
          const position = logoConfig.position || 'Front';
          
          items.push({
            name: 'Logo Setup',
            description: `${logoCalculation.details} - ${position} (${totalQuantity} units @ $${logoCalculation.unitPrice.toFixed(2)} ea)`,
            quantity: totalQuantity,
            unitPrice: logoPrice,
            total: logoTotal,
            category: 'logo'
          });
          subtotal = subtotal.add(logoTotal);
        }
      }
    });
  }

  // Also check multiSelectOptions for logo setup
  if (multiSelectOptions && multiSelectOptions['logo-setup'] && Array.isArray(multiSelectOptions['logo-setup'])) {
    multiSelectOptions['logo-setup'].forEach((logoType: string) => {
      // Only add if not already processed from logoSetupSelections
      if (!logoSetupSelections || !logoSetupSelections[logoType]) {
        // Use default config for logos only in multiSelectOptions
        const defaultConfig = { size: 'Medium', position: 'Front', application: 'Direct' };
        const logoCalculation = calculateLogoSetupCost(logoType, defaultConfig, pricingData, totalQuantity);
        
        if (logoCalculation.cost > 0) {
          const logoPrice = new Decimal(logoCalculation.unitPrice);
          const logoTotal = new Decimal(logoCalculation.cost);
          breakdown.logoSetupCost = breakdown.logoSetupCost.add(logoTotal);
          
          items.push({
            name: 'Logo Setup',
            description: `${logoCalculation.details} (${totalQuantity} units @ $${logoCalculation.unitPrice.toFixed(2)} ea)`,
            quantity: totalQuantity,
            unitPrice: logoPrice,
            total: logoTotal,
            category: 'logo'
          });
          subtotal = subtotal.add(logoTotal);
        }
      }
    });
  }

  // Process multiSelectOptions for accessories, closures, and delivery
  if (multiSelectOptions && typeof multiSelectOptions === 'object') {
    // Handle accessories - use proper per-unit pricing like Order Management
    if (multiSelectOptions.accessories && Array.isArray(multiSelectOptions.accessories)) {
      multiSelectOptions.accessories.forEach((accessory: string, index: number) => {
        // Find pricing data for this accessory
        const accessoryPricing = pricingData.find(p => 
          p.type === 'Accessories' && 
          p.Name.toLowerCase() === accessory.toLowerCase()
        );
        
        if (accessoryPricing) {
          // Use per-unit pricing like Order Management
          const unitPrice = getPriceForQuantity(accessoryPricing, totalQuantity);
          const accessoryPrice = new Decimal(unitPrice);
          const accessoryTotal = accessoryPrice.mul(totalQuantity);
          breakdown.accessoriesCost = breakdown.accessoriesCost.add(accessoryTotal);
          
          items.push({
            name: 'Other Accessories',
            description: accessory,
            quantity: totalQuantity,
            unitPrice: accessoryPrice,
            total: accessoryTotal,
            category: 'accessory'
          });
          subtotal = subtotal.add(accessoryTotal);
        } else {
          // Fallback to default pricing if not found in CSV
          const accessoryPrice = new Decimal(5.00);
          breakdown.accessoriesCost = breakdown.accessoriesCost.add(accessoryPrice);
          
          items.push({
            name: 'Other Accessories',
            description: accessory,
            quantity: 1,
            unitPrice: accessoryPrice,
            total: accessoryPrice,
            category: 'accessory'
          });
          subtotal = subtotal.add(accessoryPrice);
        }
      });
    }

    // Handle closures
    if (multiSelectOptions.closures && Array.isArray(multiSelectOptions.closures)) {
      multiSelectOptions.closures.forEach((closure: string) => {
        const closurePrice = new Decimal(2.00); // Default closure cost
        breakdown.accessoriesCost = breakdown.accessoriesCost.add(closurePrice);
        
        items.push({
          name: 'Closure Option',
          description: closure,
          quantity: 1,
          unitPrice: closurePrice,
          total: closurePrice,
          category: 'closure'
        });
        subtotal = subtotal.add(closurePrice);
      });
    }

    // Handle delivery options from multiSelectOptions - use proper per-unit pricing
    if (multiSelectOptions.delivery && Array.isArray(multiSelectOptions.delivery)) {
      multiSelectOptions.delivery.forEach((delivery: string) => {
        // Map delivery types to CSV names
        const deliveryTypeMapping: Record<string, string> = {
          'regular': 'Regular Delivery',
          'priority': 'Priority Delivery',
          'air-freight': 'Air Freight',
          'sea-freight': 'Sea Freight',
        };
        
        const mappedDeliveryName = deliveryTypeMapping[delivery.toLowerCase()] || delivery;
        const deliveryPricing = pricingData.find(p => 
          p.type === 'Shipping' && 
          p.Name.toLowerCase() === mappedDeliveryName.toLowerCase()
        );
        
        if (deliveryPricing) {
          // Use per-unit pricing like Order Management
          const unitPrice = getPriceForQuantity(deliveryPricing, totalQuantity);
          const deliveryPrice = new Decimal(unitPrice);
          const deliveryTotal = deliveryPrice.mul(totalQuantity);
          breakdown.deliveryCost = breakdown.deliveryCost.add(deliveryTotal);
          
          items.push({
            name: 'Delivery Charges',
            description: delivery,
            quantity: totalQuantity,
            unitPrice: deliveryPrice,
            total: deliveryTotal,
            category: 'delivery'
          });
          subtotal = subtotal.add(deliveryTotal);
        } else {
          // Fallback - add $0 delivery item if no pricing found
          const deliveryPrice = new Decimal(0.00);
          items.push({
            name: 'Delivery Charges',
            description: delivery || 'Standard Shipping',
            quantity: 1,
            unitPrice: deliveryPrice,
            total: deliveryPrice,
            category: 'delivery'
          });
        }
      });
    }
  }
  
  // Handle delivery options from selectedOptions (legacy format) - use proper per-unit pricing
  if (selectedOptions['delivery-type'] || selectedOptions.delivery) {
    const deliveryType = selectedOptions['delivery-type'] || selectedOptions.delivery;
    
    // Check if we already processed delivery from multiSelectOptions to avoid duplicates
    const hasDeliveryFromMultiSelect = multiSelectOptions?.delivery && Array.isArray(multiSelectOptions.delivery) && multiSelectOptions.delivery.length > 0;
    
    if (!hasDeliveryFromMultiSelect) {
      // Map delivery types to CSV names
      const deliveryTypeMapping: Record<string, string> = {
        'regular': 'Regular Delivery',
        'priority': 'Priority Delivery',
        'air-freight': 'Air Freight',
        'sea-freight': 'Sea Freight',
      };
      
      const mappedDeliveryName = deliveryTypeMapping[deliveryType.toLowerCase()] || deliveryType;
      const deliveryPricing = pricingData.find(p => 
        p.type === 'Shipping' && 
        p.Name.toLowerCase() === mappedDeliveryName.toLowerCase()
      );
      
      if (deliveryPricing) {
        // Use per-unit pricing like Order Management
        const unitPrice = getPriceForQuantity(deliveryPricing, totalQuantity);
        const deliveryPrice = new Decimal(unitPrice);
        const deliveryTotal = deliveryPrice.mul(totalQuantity);
        breakdown.deliveryCost = breakdown.deliveryCost.add(deliveryTotal);
        
        items.push({
          name: 'Delivery Charges',
          description: deliveryType || 'Standard Shipping',
          quantity: totalQuantity,
          unitPrice: deliveryPrice,
          total: deliveryTotal,
          category: 'delivery'
        });
        subtotal = subtotal.add(deliveryTotal);
      } else {
        // Fallback - add $0 delivery item if no pricing found
        const deliveryPrice = new Decimal(0.00);
        items.push({
          name: 'Delivery Charges',
          description: deliveryType || 'Standard Shipping',
          quantity: 1,
          unitPrice: deliveryPrice,
          total: deliveryPrice,
          category: 'delivery'
        });
      }
    }
  }

  // Handle legacy accessories from selectedOptions
  if (selectedOptions.accessories && Array.isArray(selectedOptions.accessories)) {
    for (const accessory of selectedOptions.accessories) {
      if (accessory.price && accessory.price > 0) {
        const accessoryPrice = new Decimal(accessory.price);
        const accessoryTotal = accessoryPrice.mul(accessory.quantity || 1);
        breakdown.accessoriesCost = breakdown.accessoriesCost.add(accessoryTotal);
        
        items.push({
          name: accessory.name || 'Accessory',
          description: accessory.description || '',
          quantity: accessory.quantity || 1,
          unitPrice: accessoryPrice,
          total: accessoryTotal,
          category: 'accessory'
        });
        subtotal = subtotal.add(accessoryTotal);
      }
    }
  }

  // Apply any discounts
  if (selectedOptions.discount && selectedOptions.discount > 0) {
    discount = new Decimal(selectedOptions.discount);
  }

  // Shipping costs (separate from delivery charges within order)
  if (selectedOptions.shipping || selectedOptions.shippingCost) {
    shipping = new Decimal(selectedOptions.shipping || selectedOptions.shippingCost);
  }

  // Tax calculation
  if (selectedOptions.tax || selectedOptions.taxAmount) {
    tax = new Decimal(selectedOptions.tax || selectedOptions.taxAmount);
  } else if (selectedOptions.taxRate) {
    const taxRate = new Decimal(selectedOptions.taxRate);
    tax = subtotal.sub(discount).add(shipping).mul(taxRate);
  }

  // Ensure we have at least one delivery item (add only if no delivery items exist)
  const hasDeliveryItem = items.some(item => item.category === 'delivery');
  if (!hasDeliveryItem) {
    const deliveryDescription = multiSelectOptions?.delivery?.[0] || 
                               selectedOptions['delivery-type'] || 
                               'Standard Shipping';
    
    items.push({
      name: 'Delivery Charges',
      description: deliveryDescription,
      quantity: 1,
      unitPrice: new Decimal(0),
      total: new Decimal(0),
      category: 'delivery'
    });
  }

  // Calculate final total
  const total = subtotal.sub(discount).add(shipping).add(tax);

  return {
    items,
    subtotal,
    discount,
    shipping,
    tax,
    total,
    breakdown
  };
}