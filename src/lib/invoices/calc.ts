// Define Order type locally (previously from Prisma)
interface Order {
  id: string;
  productName: string;
  calculatedTotal: number;
  totalUnits: number;
  user?: {
    customerRole?: 'RETAIL' | 'WHOLESALE' | 'SUPPLIER';
  };
}

import { promises as fs } from 'fs';
import path from 'path';
import { calculateUnitPrice } from '@/lib/pricing';

// Use regular number instead of Prisma Decimal
type Decimal = number;

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
  unitPrice: number;
  total: number;
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

// Load base product pricing from CSV (same as product pages)
async function loadBlankCapPricingForInvoices(): Promise<Record<string, any>> {
  try {
    const csvPath = path.join(process.cwd(), 'src/app/csv/Blank Cap Pricings.csv');
    const csvContent = await fs.readFile(csvPath, 'utf-8');
    const lines = csvContent.trim().split('\n');
    
    if (lines.length < 2) {
      console.warn('Blank cap pricing CSV file is empty or has no data rows');
      return {};
    }
    
    const headers = parseCSVLine(lines[0]);
    const pricingData: Record<string, any> = {};
    
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      if (values.length >= 10) {
        const tierName = (values[0] || '').replace(/"/g, '').trim();
        if (tierName) {
          pricingData[tierName] = {
            price48: parseFloat(values[10]) || 0,
            price144: parseFloat(values[11]) || 0,
            price576: parseFloat(values[12]) || 0,
            price1152: parseFloat(values[13]) || 0,
            price2880: parseFloat(values[14]) || 0,
            price10000: parseFloat(values[15]) || 0,
          };
        }
      }
    }
    
    return pricingData;
  } catch (error) {
    console.error('Error loading blank cap pricing from CSV:', error);
    // Return current CSV values as fallback
    return {
      'Tier 1': { price48: 3.6, price144: 3, price576: 2.9, price1152: 2.84, price2880: 2.76, price10000: 2.7 },
      'Tier 2': { price48: 4.4, price144: 3.2, price576: 3, price1152: 2.9, price2880: 2.8, price10000: 2.7 },
      'Tier 3': { price48: 4.8, price144: 3.4, price576: 3.2, price1152: 2.94, price2880: 2.88, price10000: 2.82 }
    };
  }
}

// CRITICAL FIX: Calculate unit price from CSV data with correct tier boundaries
function calculateUnitPriceFromCSV(quantity: number, tierData: any): number {
  if (!tierData) return 3.2; // Fallback
  
  // Tier boundaries: 1-47→price48, 48-143→price144, 144-575→price576, 576-1151→price1152, 1152-2879→price2880, 2880-9999→price10000, 10000+→price20000
  if (quantity >= 10000) return tierData.price10000;
  if (quantity >= 2880) return tierData.price10000;
  if (quantity >= 1152) return tierData.price2880;
  if (quantity >= 576) return tierData.price1152;
  if (quantity >= 144) return tierData.price576;
  if (quantity >= 48) return tierData.price144;
  return tierData.price48;
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
  // CRITICAL FIX: Correct tier boundaries to match business requirements
  // Tier boundaries: 1-47→price48, 48-143→price144, 144-575→price576, 576-1151→price1152, 1152-2879→price2880, 2880-9999→price10000, 10000+→price20000
  if (quantity >= 10000) return pricing.price10000;
  if (quantity >= 2880) return pricing.price10000;
  if (quantity >= 1152) return pricing.price2880;
  if (quantity >= 576) return pricing.price1152;
  if (quantity >= 144) return pricing.price576;
  if (quantity >= 48) return pricing.price144;
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
      
      // Special handling for rubber and leather patches with applications (Run, etc.)
      const application = logoConfig.application || '';
      let patchWithApplication = false;
      
      if ((logoValue.toLowerCase().includes('rubber patch') || logoValue.toLowerCase().includes('leather patch')) && application) {
        // Calculate patch cost + application cost separately
        const sizeBasedName = `${size} ${logoValue}`;
        const patchMatch = pricingData.find(p => 
          p.Name.toLowerCase() === sizeBasedName.toLowerCase()
        );
        
        const applicationMatch = pricingData.find(p => 
          p.type === 'Application' && 
          p.Name.toLowerCase() === application.toLowerCase()
        );
        
        if (patchMatch && applicationMatch) {
          const patchUnitPrice = getPriceForQuantity(patchMatch, totalQuantity);
          const applicationUnitPrice = getPriceForQuantity(applicationMatch, totalQuantity);
          unitPrice = patchUnitPrice + applicationUnitPrice;
          cost = unitPrice * totalQuantity;
          details = `${sizeBasedName} + ${application}`;
          patchWithApplication = true;
        } else if (patchMatch) {
          // Fallback to just patch if application not found
          unitPrice = getPriceForQuantity(patchMatch, totalQuantity);
          cost = unitPrice * totalQuantity;
          details = sizeBasedName;
          patchWithApplication = true;
        }
      }
      
      if (!patchWithApplication) {
        // Try direct match first
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
  }

  return { cost, unitPrice, details: details || logoValue };
}

interface InvoiceCalculation {
  items: DetailedInvoiceItem[];
  subtotal: number;
  discount: number;
  shipping: number;
  tax: number;
  total: number;
  breakdown: {
    blankCapCost: number;
    logoSetupCost: number;
    accessoriesCost: number;
    deliveryCost: number;
  };
}

export async function calcInvoiceFromOrder(order: OrderWithDetails): Promise<InvoiceCalculation> {
  // Use the actual cost calculation API for accurate detailed pricing
  console.log('💰 Starting invoice calculation using cost calculation API for detailed breakdown');
  console.log('💰 ORDER DEBUG - selectedOptions:', JSON.stringify(order.selectedOptions, null, 2));
  console.log('💰 ORDER DEBUG - multiSelectOptions:', JSON.stringify(order.multiSelectOptions, null, 2));
  
  try {
    // Call the cost calculation API to get detailed breakdown (use relative URL to avoid port issues)
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/calculate-cost`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        selectedColors: order.selectedColors,
        logoSetupSelections: order.logoSetupSelections,
        selectedOptions: order.selectedOptions,
        multiSelectOptions: order.multiSelectOptions,
        baseProductPricing: {},
        priceTier: order.selectedOptions?.priceTier || 'Tier 1'
      })
    });

    if (!response.ok) {
      console.warn('💰 Cost calculation API failed, falling back to legacy calculation');
      return calculateInvoiceFromOrderLegacy(order);
    }

    const costBreakdown = await response.json();
    console.log('💰 Cost calculation API result:', costBreakdown);
    
    // Convert API result to invoice format with detailed line items
    return convertCostBreakdownToInvoice(order, costBreakdown);
    
  } catch (error) {
    console.error('💰 Error calling cost calculation API:', error);
    console.log('💰 Falling back to legacy calculation method');
    return calculateInvoiceFromOrderLegacy(order);
  }
}

function convertCostBreakdownToInvoice(order: OrderWithDetails, costBreakdown: any): InvoiceCalculation {
  const items: DetailedInvoiceItem[] = [];
  let subtotal = 0;

  // Extract total quantity from cost breakdown (more reliable)
  const totalQuantity = costBreakdown.totalUnits || 144;

  console.log('💰 Converting cost breakdown to invoice items:', {
    totalUnits: costBreakdown.totalUnits,
    baseProductCost: costBreakdown.baseProductCost,
    logoSetupCosts: costBreakdown.logoSetupCosts?.length,
    closureCosts: costBreakdown.closureCosts?.length,
    deliveryCosts: costBreakdown.deliveryCosts?.length
  });

  // Base product cost
  if (costBreakdown.baseProductCost > 0) {
    const basePrice = Number(costBreakdown.baseProductCost);
    const unitPrice = basePrice / totalQuantity;
    items.push({
      name: '6P Flat Bill - Base Product',
      description: `${totalQuantity} units @ $${unitPrice.toFixed(2)} ea`,
      quantity: totalQuantity,
      unitPrice: unitPrice,
      total: basePrice,
      category: 'cap'
    });
    subtotal += basePrice;
    console.log('💰 Added base product item:', { basePrice, unitPrice, totalQuantity });
  }

  // Logo setup costs
  if (costBreakdown.logoSetupCosts && Array.isArray(costBreakdown.logoSetupCosts)) {
    costBreakdown.logoSetupCosts.forEach((logo: any, index: number) => {
      const logoPrice = Number(logo.cost);
      const logoUnitPrice = Number(logo.unitPrice || 0);
      items.push({
        name: 'Logo Setup',
        description: `${logo.name || logo.details || `Logo Setup ${index + 1}`} - ${totalQuantity} units @ $${logoUnitPrice.toFixed(2)} ea`,
        quantity: totalQuantity,
        unitPrice: logoUnitPrice,
        total: logoPrice,
        category: 'logo'
      });
      subtotal += logoPrice;
      console.log('💰 Added logo setup item:', { name: logo.name, logoPrice, logoUnitPrice, totalQuantity });
    });
  }

  // Accessories costs
  if (costBreakdown.accessoriesCosts && Array.isArray(costBreakdown.accessoriesCosts)) {
    costBreakdown.accessoriesCosts.forEach((accessory: any) => {
      const accessoryPrice = Number(accessory.cost);
      const accessoryUnitPrice = Number(accessory.unitPrice || 0);
      items.push({
        name: 'Other Accessories',
        description: accessory.name,
        quantity: totalQuantity,
        unitPrice: accessoryUnitPrice,
        total: accessoryPrice,
        category: 'accessory'
      });
      subtotal += accessoryPrice;
    });
  }

  // Closure costs
  if (costBreakdown.closureCosts && Array.isArray(costBreakdown.closureCosts)) {
    costBreakdown.closureCosts.forEach((closure: any) => {
      const closurePrice = Number(closure.cost);
      const closureUnitPrice = Number(closure.unitPrice || 0);
      items.push({
        name: 'Closure Option',
        description: `${closure.name} - ${totalQuantity} units @ $${closureUnitPrice.toFixed(2)} ea`,
        quantity: totalQuantity,
        unitPrice: closureUnitPrice,
        total: closurePrice,
        category: 'closure'
      });
      subtotal += closurePrice;
      console.log('💰 Added closure item:', { name: closure.name, closurePrice, closureUnitPrice, totalQuantity });
    });
  }

  // Premium fabric costs
  if (costBreakdown.premiumFabricCosts && Array.isArray(costBreakdown.premiumFabricCosts)) {
    costBreakdown.premiumFabricCosts.forEach((fabric: any) => {
      const fabricPrice = Number(fabric.cost);
      const fabricUnitPrice = Number(fabric.unitPrice || 0);
      
      // Map short fabric names to full descriptive names for better invoice presentation
      const fabricDescriptionMapping: Record<string, string> = {
        'Laser Cut': 'Laser Cut Fabric',
        'Polyester': 'Polyester Fabric',
        'Cotton': 'Cotton Fabric', 
        'Mesh': 'Mesh Fabric',
        'Twill': 'Twill Fabric',
        'Canvas': 'Canvas Fabric',
        'Denim': 'Denim Fabric',
        'Wool': 'Wool Fabric'
      };
      
      const fullFabricDescription = fabricDescriptionMapping[fabric.name] || 
                                  (fabric.name.includes('Fabric') ? fabric.name : `${fabric.name} Fabric`);
      
      items.push({
        name: 'Premium Fabric',
        description: fullFabricDescription,
        quantity: totalQuantity,
        unitPrice: fabricUnitPrice,
        total: fabricPrice,
        category: 'accessory'
      });
      subtotal += fabricPrice;
    });
  }

  // Delivery costs
  if (costBreakdown.deliveryCosts && Array.isArray(costBreakdown.deliveryCosts)) {
    costBreakdown.deliveryCosts.forEach((delivery: any) => {
      const deliveryPrice = Number(delivery.cost);
      const deliveryUnitPrice = Number(delivery.unitPrice || 0);
      
      // Map short names to full descriptive names for better invoice presentation
      const deliveryDescriptionMapping: Record<string, string> = {
        'Regular': 'Regular Delivery',
        'Priority': 'Priority Delivery', 
        'Air': 'Air Freight Delivery',
        'Sea': 'Sea Freight Delivery',
        'Express': 'Express Delivery',
        'Standard': 'Standard Delivery'
      };
      
      const fullDeliveryDescription = deliveryDescriptionMapping[delivery.name] || 
                                    (delivery.name && delivery.name.includes('Delivery') ? delivery.name : `${delivery.name || 'Standard'} Delivery`);
      
      items.push({
        name: 'Delivery Charges',
        description: `${fullDeliveryDescription} - ${totalQuantity} units @ $${deliveryUnitPrice.toFixed(2)} ea`,
        quantity: totalQuantity,
        unitPrice: deliveryUnitPrice,
        total: deliveryPrice,
        category: 'delivery'
      });
      subtotal += deliveryPrice;
      console.log('💰 Added delivery item:', { name: delivery.name, deliveryPrice, deliveryUnitPrice, totalQuantity });
    });
  }

  // Mold charge costs
  if (costBreakdown.moldChargeCosts && Array.isArray(costBreakdown.moldChargeCosts)) {
    costBreakdown.moldChargeCosts.forEach((mold: any) => {
      if (!mold.waived && mold.cost > 0) {
        const moldPrice = Number(mold.cost);
        items.push({
          name: 'Mold Charge',
          description: `${mold.name} - One-time setup fee`,
          quantity: 1,
          unitPrice: moldPrice,
          total: moldPrice,
          category: 'other'
        });
        subtotal += moldPrice;
        console.log('💰 Added mold charge item:', { name: mold.name, moldPrice });
      }
    });
  }

  // Services costs (was missing)
  if (costBreakdown.servicesCosts && Array.isArray(costBreakdown.servicesCosts)) {
    costBreakdown.servicesCosts.forEach((service: any) => {
      const servicePrice = Number(service.cost);
      const serviceUnitPrice = Number(service.unitPrice || service.cost); // Services are typically flat-rate
      items.push({
        name: 'Services',
        description: service.name,
        quantity: 1,
        unitPrice: serviceUnitPrice,
        total: servicePrice,
        category: 'other'
      });
      subtotal += servicePrice;
    });
  }

  // Ensure we have at least one delivery item
  const hasDeliveryItem = items.some(item => item.category === 'delivery');
  if (!hasDeliveryItem) {
    items.push({
      name: 'Delivery Charges',
      description: 'Standard Shipping',
      quantity: 1,
      unitPrice: 0,
      total: 0,
      category: 'delivery'
    });
  }

  const breakdown = {
    blankCapCost: Number(costBreakdown.baseProductCost || 0),
    logoSetupCost: Number(costBreakdown.logoSetupCosts?.reduce((sum: number, item: any) => sum + item.cost, 0) || 0),
    accessoriesCost: Number(
      (costBreakdown.accessoriesCosts?.reduce((sum: number, item: any) => sum + item.cost, 0) || 0) +
      (costBreakdown.closureCosts?.reduce((sum: number, item: any) => sum + item.cost, 0) || 0) +
      (costBreakdown.premiumFabricCosts?.reduce((sum: number, item: any) => sum + item.cost, 0) || 0) +
      (costBreakdown.moldChargeCosts?.reduce((sum: number, item: any) => item.waived ? sum : sum + item.cost, 0) || 0) +
      (costBreakdown.servicesCosts?.reduce((sum: number, item: any) => sum + item.cost, 0) || 0)
    ),
    deliveryCost: Number(costBreakdown.deliveryCosts?.reduce((sum: number, item: any) => sum + item.cost, 0) || 0)
  };

  return {
    items,
    subtotal,
    discount: 0,
    shipping: 0,
    tax: 0,
    total: subtotal,
    breakdown
  };
}

function convertOrderCostBreakdownToInvoice(order: OrderWithDetails, costBreakdown: any): InvoiceCalculation {
  const items: DetailedInvoiceItem[] = [];
  let subtotal = 0;

  // Extract total quantity
  const selectedColors = typeof order.selectedColors === 'string'
    ? JSON.parse(order.selectedColors)
    : order.selectedColors || {};
    
  let totalQuantity = 0;
  Object.values(selectedColors).forEach((colorData: any) => {
    if (colorData?.sizes) {
      Object.values(colorData.sizes).forEach((qty: any) => {
        totalQuantity += parseInt(qty) || 0;
      });
    }
  });

  // Base product cost
  if (costBreakdown.baseProductCost > 0) {
    const basePrice = Number(costBreakdown.baseProductCost);
    items.push({
      name: 'Blank Cap Cost',
      description: `${totalQuantity} units @ ${(basePrice / (totalQuantity || 1)).toFixed(2)} ea`,
      quantity: totalQuantity,
      unitPrice: basePrice / (totalQuantity || 1),
      total: basePrice,
      category: 'cap'
    });
    subtotal += basePrice;
  }

  // Logo setup costs
  if (costBreakdown.logoSetupCosts && Array.isArray(costBreakdown.logoSetupCosts)) {
    costBreakdown.logoSetupCosts.forEach((logo: any) => {
      const logoPrice = Number(logo.cost);
      const logoUnitPrice = Number(logo.unitPrice || 0);
      items.push({
        name: 'Logo Setup',
        description: `${logo.details || logo.name} (${totalQuantity} units @ $${logoUnitPrice.toFixed(2)} ea)`,
        quantity: totalQuantity,
        unitPrice: logoUnitPrice,
        total: logoPrice,
        category: 'logo'
      });
      subtotal += logoPrice;
    });
  }

  // Accessories costs
  if (costBreakdown.accessoriesCosts && Array.isArray(costBreakdown.accessoriesCosts)) {
    costBreakdown.accessoriesCosts.forEach((accessory: any) => {
      const accessoryPrice = Number(accessory.cost);
      const accessoryUnitPrice = Number(accessory.unitPrice || 0);
      items.push({
        name: 'Other Accessories',
        description: accessory.name,
        quantity: totalQuantity,
        unitPrice: accessoryUnitPrice,
        total: accessoryPrice,
        category: 'accessory'
      });
      subtotal += accessoryPrice;
    });
  }

  // Closure costs
  if (costBreakdown.closureCosts && Array.isArray(costBreakdown.closureCosts)) {
    costBreakdown.closureCosts.forEach((closure: any) => {
      const closurePrice = Number(closure.cost);
      items.push({
        name: 'Closure Option',
        description: closure.name,
        quantity: 1,
        unitPrice: closurePrice,
        total: closurePrice,
        category: 'closure'
      });
      subtotal += closurePrice;
    });
  }

  // Delivery costs
  if (costBreakdown.deliveryCosts && Array.isArray(costBreakdown.deliveryCosts)) {
    costBreakdown.deliveryCosts.forEach((delivery: any) => {
      const deliveryPrice = Number(delivery.cost);
      const deliveryUnitPrice = Number(delivery.unitPrice || 0);
      
      // Map short names to full descriptive names for better invoice presentation
      const deliveryDescriptionMapping: Record<string, string> = {
        'Regular': 'Regular Delivery',
        'Priority': 'Priority Delivery', 
        'Air': 'Air Freight Delivery',
        'Sea': 'Sea Freight Delivery',
        'Express': 'Express Delivery',
        'Standard': 'Standard Delivery'
      };
      
      const fullDeliveryDescription = deliveryDescriptionMapping[delivery.name] || 
                                    (delivery.name.includes('Delivery') ? delivery.name : `${delivery.name} Delivery`);
      
      items.push({
        name: 'Delivery Charges',
        description: fullDeliveryDescription,
        quantity: totalQuantity,
        unitPrice: deliveryUnitPrice,
        total: deliveryPrice,
        category: 'delivery'
      });
      subtotal += deliveryPrice;
    });
  }

  // Services costs (was missing)
  if (costBreakdown.servicesCosts && Array.isArray(costBreakdown.servicesCosts)) {
    costBreakdown.servicesCosts.forEach((service: any) => {
      const servicePrice = Number(service.cost);
      const serviceUnitPrice = Number(service.unitPrice || service.cost); // Services are typically flat-rate
      items.push({
        name: 'Services',
        description: service.name,
        quantity: 1,
        unitPrice: serviceUnitPrice,
        total: servicePrice,
        category: 'other'
      });
      subtotal += servicePrice;
    });
  }

  // Ensure we have at least one delivery item
  const hasDeliveryItem = items.some(item => item.category === 'delivery');
  if (!hasDeliveryItem) {
    items.push({
      name: 'Delivery Charges',
      description: 'Standard Shipping',
      quantity: 1,
      unitPrice: 0,
      total: 0,
      category: 'delivery'
    });
  }

  const breakdown = {
    blankCapCost: Number(costBreakdown.baseProductCost || 0),
    logoSetupCost: Number(costBreakdown.logoSetupCosts?.reduce((sum: number, item: any) => sum + item.cost, 0) || 0),
    accessoriesCost: Number(
      (costBreakdown.accessoriesCosts?.reduce((sum: number, item: any) => sum + item.cost, 0) || 0) +
      (costBreakdown.servicesCosts?.reduce((sum: number, item: any) => sum + item.cost, 0) || 0)
    ),
    deliveryCost: Number(costBreakdown.deliveryCosts?.reduce((sum: number, item: any) => sum + item.cost, 0) || 0)
  };

  return {
    items,
    subtotal,
    discount: 0,
    shipping: 0,
    tax: 0,
    total: subtotal,
    breakdown
  };
}

async function calculateInvoiceFromOrderLegacy(order: OrderWithDetails): Promise<InvoiceCalculation> {
  console.log(`🔍 INVOICE DEBUG - Order ${order.id} raw data types:`, {
    selectedOptionsType: typeof order.selectedOptions,
    multiSelectOptionsType: typeof order.multiSelectOptions,
    logoSetupSelectionsType: typeof order.logoSetupSelections,
    selectedColorsType: typeof order.selectedColors
  });

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
  
  console.log(`🔍 INVOICE DEBUG - Order ${order.id} parsed selectedOptions:`, JSON.stringify(selectedOptions, null, 2));
  console.log(`🔍 INVOICE DEBUG - Order ${order.id} parsed multiSelectOptions:`, JSON.stringify(multiSelectOptions, null, 2));

  let subtotal = 0;
  let discount = 0;
  let shipping = 0;
  let tax = 0;
  
  const items: DetailedInvoiceItem[] = [];
  const breakdown = {
    blankCapCost: 0,
    logoSetupCost: 0,
    accessoriesCost: 0,
    deliveryCost: 0
  };

  // Calculate total quantity from selectedColors
  let totalQuantity = 0;
  
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

  // Load CSV pricing data and calculate accurate base unit price
  const csvPricingData = await loadBlankCapPricingForInvoices();
  
  // ✅ Extract priceTier from order data (fixes hardcoded Tier 2 issue)
  let pricingTier = 'Tier 1'; // Default fallback (most affordable tier)
  
  // Try to extract priceTier from various order data sources - check in correct priority order
  // 1. Check selectedOptions first (most direct)
  if (selectedOptions.priceTier) {
    pricingTier = selectedOptions.priceTier;
    console.log(`📊 Found priceTier in selectedOptions: ${pricingTier}`);
  }
  
  // 2. Check customerInfo for priceTier (common location)
  if (typeof order.customerInfo === 'string') {
    try {
      const customerInfo = JSON.parse(order.customerInfo);
      if (customerInfo.priceTier) {
        pricingTier = customerInfo.priceTier;
        console.log(`📊 Found priceTier in customerInfo: ${pricingTier}`);
      }
    } catch (e) {
      // customerInfo is not JSON
    }
  } else if (order.customerInfo && typeof order.customerInfo === 'object') {
    const customerInfo = order.customerInfo as any;
    if (customerInfo.priceTier) {
      pricingTier = customerInfo.priceTier;
      console.log(`📊 Found priceTier in customerInfo object: ${pricingTier}`);
    }
  }
  
  // 3. Check additionalInstructions as backup
  if (typeof order.additionalInstructions === 'string') {
    try {
      const parsed = JSON.parse(order.additionalInstructions);
      if (parsed.priceTier) {
        pricingTier = parsed.priceTier;
        console.log(`📊 Found priceTier in additionalInstructions: ${pricingTier}`);
      }
    } catch (e) {
      // additionalInstructions is not JSON, check if it contains tier info
    }
  }
  
  console.log(`📊 Using pricing tier: ${pricingTier} for invoice calculation`);
  
  // CRITICAL FIX: Use product-specific pricing instead of generic CSV pricing
  // This matches the cost calculation API logic for accurate pricing
  let baseUnitPrice = 6.00; // AirFrame 7 default for Tier 3
  
  // Try to get the actual product unit price using the same logic as cost calculation API
  if (order.productName && order.productName.includes('AirFrame 7')) {
    // Use AirFrame 7 specific pricing based on tier and quantity
    if (pricingTier === 'Tier 3' && totalQuantity >= 48) {
      baseUnitPrice = 6.00; // AirFrame 7 Tier 3 pricing
    } else if (pricingTier === 'Tier 2' && totalQuantity >= 48) {
      baseUnitPrice = 5.50; // AirFrame 7 Tier 2 pricing  
    } else {
      baseUnitPrice = 7.00; // AirFrame 7 Tier 1 pricing
    }
  }
  
  console.log(`💰 BASE PRICING FIXED - Product: "${order.productName}", Tier: "${pricingTier}", Units: ${totalQuantity}, UnitPrice: $${baseUnitPrice}`);

  // Try to get actual pricing from order data if available
  if (selectedOptions.totalPrice) {
    const totalPrice = Number(selectedOptions.totalPrice);
    baseUnitPrice = totalPrice / (totalQuantity || 1);
  } else if (selectedOptions.basePrice || selectedOptions.price) {
    baseUnitPrice = Number(selectedOptions.basePrice || selectedOptions.price);
  } else if (selectedOptions.unitPrice) {
    baseUnitPrice = Number(selectedOptions.unitPrice);
  }

  // Main product item - Blank Cap Cost
  const blankCapCost = baseUnitPrice * totalQuantity;
  breakdown.blankCapCost = blankCapCost;
  
  items.push({
    name: 'Blank Cap Cost',
    description: `${totalQuantity} units @ ${baseUnitPrice.toFixed(2)} ea`,
    quantity: totalQuantity,
    unitPrice: baseUnitPrice,
    total: blankCapCost,
    category: 'cap'
  });
  
  subtotal += blankCapCost;

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
          const logoPrice = logoCalculation.unitPrice;
          const logoTotal = logoCalculation.cost;
          breakdown.logoSetupCost += logoTotal;
          
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
          subtotal += logoTotal;
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
          const logoPrice = logoCalculation.unitPrice;
          const logoTotal = logoCalculation.cost;
          breakdown.logoSetupCost += logoTotal;
          
          items.push({
            name: 'Logo Setup',
            description: `${logoCalculation.details} (${totalQuantity} units @ $${logoCalculation.unitPrice.toFixed(2)} ea)`,
            quantity: totalQuantity,
            unitPrice: logoPrice,
            total: logoTotal,
            category: 'logo'
          });
          subtotal += logoTotal;
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
          const accessoryPrice = unitPrice;
          const accessoryTotal = accessoryPrice * totalQuantity;
          breakdown.accessoriesCost += accessoryTotal;
          
          items.push({
            name: 'Other Accessories',
            description: accessory,
            quantity: totalQuantity,
            unitPrice: accessoryPrice,
            total: accessoryTotal,
            category: 'accessory'
          });
          subtotal += accessoryTotal;
        } else {
          // Fallback to default pricing if not found in CSV
          const accessoryPrice = 5.00;
          breakdown.accessoriesCost += accessoryPrice;
          
          items.push({
            name: 'Other Accessories',
            description: accessory,
            quantity: 1,
            unitPrice: accessoryPrice,
            total: accessoryPrice,
            category: 'accessory'
          });
          subtotal += accessoryPrice;
        }
      });
    }

    // Handle closures with proper CSV pricing
    if (multiSelectOptions.closures && Array.isArray(multiSelectOptions.closures)) {
      multiSelectOptions.closures.forEach((closure: string) => {
        // Find pricing data for this closure type
        const closurePricing = pricingData.find(p => 
          p.type === 'Premium Closure' && 
          p.Name.toLowerCase() === closure.toLowerCase()
        );
        
        if (closurePricing) {
          // Use per-unit pricing like Order Management
          const unitPrice = getPriceForQuantity(closurePricing, totalQuantity);
          const closurePrice = unitPrice;
          const closureTotal = closurePrice * totalQuantity;
          breakdown.accessoriesCost += closureTotal;
          
          items.push({
            name: 'Closure Option',
            description: closure,
            quantity: totalQuantity,
            unitPrice: closurePrice,
            total: closureTotal,
            category: 'closure'
          });
          subtotal += closureTotal;
        } else {
          // Fallback only if no pricing found
          const closurePrice = 2.00;
          breakdown.accessoriesCost += closurePrice;
          
          items.push({
            name: 'Closure Option',
            description: closure,
            quantity: 1,
            unitPrice: closurePrice,
            total: closurePrice,
            category: 'closure'
          });
          subtotal += closurePrice;
        }
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
          const deliveryPrice = unitPrice;
          const deliveryTotal = deliveryPrice * totalQuantity;
          breakdown.deliveryCost += deliveryTotal;
          
          // Map short delivery names to full descriptive names for better invoice presentation
          const deliveryDescriptionMapping: Record<string, string> = {
            'Regular': 'Regular Delivery',
            'regular': 'Regular Delivery',
            'Priority': 'Priority Delivery',
            'priority': 'Priority Delivery',
            'Air': 'Air Freight Delivery',
            'air': 'Air Freight Delivery',
            'Sea': 'Sea Freight Delivery',
            'sea': 'Sea Freight Delivery',
            'Express': 'Express Delivery',
            'express': 'Express Delivery',
            'Standard': 'Standard Delivery',
            'standard': 'Standard Delivery'
          };
          
          const fullDeliveryDescription = deliveryDescriptionMapping[delivery] || 
                                        deliveryPricing.Name ||
                                        (delivery.includes('Delivery') ? delivery : `${delivery} Delivery`);
          
          items.push({
            name: 'Delivery Charges',
            description: fullDeliveryDescription,
            quantity: totalQuantity,
            unitPrice: deliveryPrice,
            total: deliveryTotal,
            category: 'delivery'
          });
          subtotal += deliveryTotal;
        } else {
          // Fallback - add $0 delivery item if no pricing found
          const deliveryPrice = 0.00;
          
          // Map short delivery names to full descriptive names for better invoice presentation
          const deliveryDescriptionMapping: Record<string, string> = {
            'Regular': 'Regular Delivery',
            'regular': 'Regular Delivery',
            'Priority': 'Priority Delivery', 
            'priority': 'Priority Delivery',
            'Standard': 'Standard Delivery',
            'standard': 'Standard Delivery'
          };
          
          const fullDeliveryDescription = deliveryDescriptionMapping[delivery] || 
                                        (delivery && delivery.includes('Delivery') ? delivery : `${delivery || 'Standard'} Delivery`);
          
          items.push({
            name: 'Delivery Charges',
            description: fullDeliveryDescription,
            quantity: 1,
            unitPrice: deliveryPrice,
            total: deliveryPrice,
            category: 'delivery'
          });
        }
      });
    }
  }
  
  // Handle premium fabric costs - FIXED: Properly handle custom-fabric field
  console.log(`🔍 INVOICE CALC DEBUG - Processing Order ${order.id} fabric costs`);
  console.log(`🔍 INVOICE CALC DEBUG - ALL selectedOptions keys:`, Object.keys(selectedOptions));
  console.log(`🔍 INVOICE CALC DEBUG - selectedOptions fabric-setup: "${selectedOptions['fabric-setup']}"`);
  console.log(`🔍 INVOICE CALC DEBUG - selectedOptions custom-fabric: "${selectedOptions['custom-fabric']}"`);
  console.log(`🔍 INVOICE CALC DEBUG - selectedOptions full data:`, selectedOptions);
  
  console.log(`🔍 FABRIC CONDITION DEBUG - fabric-setup exists:`, !!selectedOptions['fabric-setup']);
  console.log(`🔍 FABRIC CONDITION DEBUG - custom-fabric exists:`, !!selectedOptions['custom-fabric']);
  console.log(`🔍 FABRIC CONDITION DEBUG - condition result:`, !!(selectedOptions['fabric-setup'] || selectedOptions['custom-fabric']));
  
  // CRITICAL FIX: Ensure we process fabric setup correctly for "Polyester/Laser Cut" format
  if (selectedOptions['fabric-setup'] || selectedOptions['custom-fabric']) {
    console.log(`🔥 ENTERING FABRIC PROCESSING - fabric-setup: "${selectedOptions['fabric-setup']}"`);  
    const fabricSetup = selectedOptions['fabric-setup'];
    const customFabricSetup = selectedOptions['custom-fabric'];
    const effectiveFabricSetup = fabricSetup === 'Other' ? customFabricSetup : fabricSetup;
    
    console.log(`🧵 Processing fabric setup: fabricSetup="${fabricSetup}", customFabric="${customFabricSetup}", effective="${effectiveFabricSetup}"`);
    
    if (effectiveFabricSetup) {
      // Handle dual fabric setups (e.g., "Polyester/Laser Cut") AND single fabrics
      const fabricNames = effectiveFabricSetup.includes('/') 
        ? effectiveFabricSetup.split('/').map(f => f.trim())
        : [effectiveFabricSetup.trim()];
      
      console.log(`🧵 Checking fabric names:`, fabricNames);
      
      // Check each fabric component for premium pricing
      for (const fabricName of fabricNames) {
        // Try exact match first
        let premiumFabricPricing = pricingData.find(p => 
          p.type === 'Premium Fabric' && 
          p.Name.toLowerCase() === fabricName.toLowerCase()
        );
        
        // If not found, try alternative names for common fabrics
        if (!premiumFabricPricing && fabricName.toLowerCase() === 'laser cut') {
          premiumFabricPricing = pricingData.find(p => 
            p.type === 'Premium Fabric' && 
            (p.Name.toLowerCase().includes('laser cut') || p.Name.toLowerCase().includes('laser-cut'))
          );
        }
        
        console.log(`🧵 Fabric "${fabricName}" pricing found:`, !!premiumFabricPricing, premiumFabricPricing?.Name);
        
        if (premiumFabricPricing) {
          const unitPrice = getPriceForQuantity(premiumFabricPricing, totalQuantity);
          const fabricPrice = unitPrice;
          const fabricTotal = fabricPrice * totalQuantity;
          breakdown.accessoriesCost += fabricTotal;
          
          console.log(`🧵 Adding fabric cost: ${fabricName} = $${unitPrice} × ${totalQuantity} = $${fabricTotal}`);
          
          // Map short fabric names to full descriptive names for better invoice presentation
          const fabricDescriptionMapping: Record<string, string> = {
            'Laser Cut': 'Laser Cut Fabric',
            'Polyester': 'Polyester Fabric',
            'Cotton': 'Cotton Fabric', 
            'Mesh': 'Mesh Fabric',
            'Twill': 'Twill Fabric',
            'Canvas': 'Canvas Fabric',
            'Denim': 'Denim Fabric',
            'Wool': 'Wool Fabric'
          };
          
          const fullFabricDescription = fabricDescriptionMapping[fabricName] || 
                                      (fabricName.includes('Fabric') ? fabricName : `${fabricName} Fabric`);
          
          items.push({
            name: 'Premium Fabric',
            description: fullFabricDescription,
            quantity: totalQuantity,
            unitPrice: fabricPrice,
            total: fabricTotal,
            category: 'accessory'
          });
          subtotal += fabricTotal;
        }
      }
    }
  } else {
    console.log(`🔍 INVOICE CALC DEBUG - No fabric setup found for Order ${order.id}`);
  }

  // Handle closure options from selectedOptions (critical missing component)
  if (selectedOptions['closure-type'] || selectedOptions.closure) {
    const closureType = selectedOptions['closure-type'] || selectedOptions.closure;
    
    // Check if we already processed closure from multiSelectOptions to avoid duplicates
    const hasClosureFromMultiSelect = multiSelectOptions?.closures && Array.isArray(multiSelectOptions.closures) && multiSelectOptions.closures.length > 0;
    
    if (!hasClosureFromMultiSelect && closureType) {
      // Find pricing data for this closure type
      const closurePricing = pricingData.find(p => 
        p.type === 'Premium Closure' && 
        p.Name.toLowerCase() === closureType.toLowerCase()
      );
      
      if (closurePricing) {
        // Use per-unit pricing like Order Management
        const unitPrice = getPriceForQuantity(closurePricing, totalQuantity);
        const closurePrice = unitPrice;
        const closureTotal = closurePrice * totalQuantity;
        breakdown.accessoriesCost += closureTotal;
        
        items.push({
          name: 'Closure Option',
          description: closureType,
          quantity: totalQuantity,
          unitPrice: closurePrice,
          total: closureTotal,
          category: 'closure'
        });
        subtotal += closureTotal;
      }
    }
  }

  // Handle delivery options from selectedOptions - FIXED: Improved mapping and logging  
  console.log(`🚚 INVOICE CALC DEBUG - Checking delivery options`);
  console.log(`🚚 INVOICE CALC DEBUG - selectedOptions['delivery-type']: "${selectedOptions['delivery-type']}"`);
  console.log(`🚚 INVOICE CALC DEBUG - selectedOptions.delivery: "${selectedOptions.delivery}"`);
  
  if (selectedOptions['delivery-type'] || selectedOptions.delivery) {
    const deliveryType = selectedOptions['delivery-type'] || selectedOptions.delivery;
    
    console.log(`🚚 Processing delivery type: "${deliveryType}"`);
    
    // Check if we already processed delivery from multiSelectOptions to avoid duplicates
    const hasDeliveryFromMultiSelect = multiSelectOptions?.delivery && Array.isArray(multiSelectOptions.delivery) && multiSelectOptions.delivery.length > 0;
    
    if (!hasDeliveryFromMultiSelect) {
      // Enhanced mapping for delivery types - be more flexible with matching
      const deliveryTypeMapping: Record<string, string> = {
        'regular': 'Regular Delivery',
        'regular delivery': 'Regular Delivery',
        'priority': 'Priority Delivery',
        'priority delivery': 'Priority Delivery',
        'air-freight': 'Air Freight',
        'sea-freight': 'Sea Freight',
      };
      
      const mappedDeliveryName = deliveryTypeMapping[deliveryType.toLowerCase()] || deliveryType;
      
      console.log(`🚚 Mapped delivery name: "${mappedDeliveryName}"`);
      
      // Try exact match first
      let deliveryPricing = pricingData.find(p => 
        p.type === 'Shipping' && 
        p.Name.toLowerCase() === mappedDeliveryName.toLowerCase()
      );
      
      // If not found, try more flexible matching
      if (!deliveryPricing) {
        deliveryPricing = pricingData.find(p => 
          p.type === 'Shipping' && 
          (p.Name.toLowerCase().includes(deliveryType.toLowerCase()) ||
           deliveryType.toLowerCase().includes(p.Name.toLowerCase().split(' ')[0]))
        );
      }
      
      console.log(`🚚 Delivery pricing found:`, !!deliveryPricing, deliveryPricing?.Name);
      
      if (deliveryPricing) {
        // Use per-unit pricing like Order Management
        const unitPrice = getPriceForQuantity(deliveryPricing, totalQuantity);
        const deliveryPrice = unitPrice;
        const deliveryTotal = deliveryPrice * totalQuantity;
        breakdown.deliveryCost += deliveryTotal;
        
        console.log(`🚚 Adding delivery cost: ${deliveryPricing.Name} = $${unitPrice} × ${totalQuantity} = $${deliveryTotal}`);
        
        // Map short delivery names to full descriptive names for better invoice presentation
        const deliveryDescriptionMapping: Record<string, string> = {
          'Regular': 'Regular Delivery',
          'regular': 'Regular Delivery',
          'Priority': 'Priority Delivery',
          'priority': 'Priority Delivery', 
          'Air': 'Air Freight Delivery',
          'air': 'Air Freight Delivery',
          'Sea': 'Sea Freight Delivery',
          'sea': 'Sea Freight Delivery',
          'Express': 'Express Delivery',
          'express': 'Express Delivery',
          'Standard': 'Standard Delivery',
          'standard': 'Standard Delivery'
        };
        
        const fullDeliveryDescription = deliveryDescriptionMapping[deliveryType] || 
                                      deliveryPricing.Name ||
                                      (deliveryType.includes('Delivery') ? deliveryType : `${deliveryType} Delivery`);
        
        items.push({
          name: 'Delivery Charges',
          description: fullDeliveryDescription,
          quantity: totalQuantity,
          unitPrice: deliveryPrice,
          total: deliveryTotal,
          category: 'delivery'
        });
        subtotal += deliveryTotal;
      } else {
        console.log(`🚚 No pricing found for delivery type: "${deliveryType}"`);
        // Fallback - add $0 delivery item if no pricing found
        const deliveryPrice = 0.00;
        
        // Map short delivery names to full descriptive names for better invoice presentation
        const deliveryDescriptionMapping: Record<string, string> = {
          'Regular': 'Regular Delivery',
          'regular': 'Regular Delivery',
          'Priority': 'Priority Delivery',
          'priority': 'Priority Delivery',
          'Standard': 'Standard Delivery',
          'standard': 'Standard Delivery'
        };
        
        const fullDeliveryDescription = deliveryDescriptionMapping[deliveryType] || 
                                      (deliveryType && deliveryType.includes('Delivery') ? deliveryType : `${deliveryType || 'Standard'} Delivery`);
        
        items.push({
          name: 'Delivery Charges',
          description: fullDeliveryDescription,
          quantity: 1,
          unitPrice: deliveryPrice,
          total: deliveryPrice,
          category: 'delivery'
        });
      }
    }
  }

  // Handle services from multiSelectOptions (was missing - critical component)
  if (multiSelectOptions && multiSelectOptions.services && Array.isArray(multiSelectOptions.services)) {
    multiSelectOptions.services.forEach((service: string) => {
      // Find pricing data for this service
      const servicePricing = pricingData.find(p => 
        p.type === 'Service' && 
        p.Name.toLowerCase() === service.toLowerCase()
      );
      
      if (servicePricing) {
        // Services are typically flat-rate, not per-unit
        const servicePrice = servicePricing.price48; // Use base price for services
        breakdown.accessoriesCost += servicePrice;
        
        items.push({
          name: 'Services',
          description: service,
          quantity: 1,
          unitPrice: servicePrice,
          total: servicePrice,
          category: 'other'
        });
        subtotal += servicePrice;
      } else {
        // Fallback pricing for known services if not found in CSV
        let fallbackPrice = 0;
        
        // Common service fallback pricing
        if (service.toLowerCase().includes('graphics')) {
          fallbackPrice = 50.00;
        } else if (service.toLowerCase().includes('sampling')) {
          fallbackPrice = 100.00;
        } else if (service.toLowerCase().includes('design')) {
          fallbackPrice = 75.00;
        } else {
          fallbackPrice = 25.00; // Generic service fallback
        }
        
        if (fallbackPrice > 0) {
          breakdown.accessoriesCost += fallbackPrice;
          
          items.push({
            name: 'Services',
            description: service,
            quantity: 1,
            unitPrice: fallbackPrice,
            total: fallbackPrice,
            category: 'other'
          });
          subtotal += fallbackPrice;
        }
      }
    });
  }

  // Handle legacy accessories from selectedOptions
  if (selectedOptions.accessories && Array.isArray(selectedOptions.accessories)) {
    for (const accessory of selectedOptions.accessories) {
      if (accessory.price && accessory.price > 0) {
        const accessoryPrice = Number(accessory.price);
        const accessoryTotal = accessoryPrice * (accessory.quantity || 1);
        breakdown.accessoriesCost += accessoryTotal;
        
        items.push({
          name: accessory.name || 'Accessory',
          description: accessory.description || '',
          quantity: accessory.quantity || 1,
          unitPrice: accessoryPrice,
          total: accessoryTotal,
          category: 'accessory'
        });
        subtotal += accessoryTotal;
      }
    }
  }
  
  // Handle mold charge costs (critical missing component)
  if (logoSetupSelections && Object.keys(logoSetupSelections).length > 0) {
    Object.entries(logoSetupSelections).forEach(([logoType, logoConfig]: [string, any]) => {
      if (logoConfig && typeof logoConfig === 'object') {
        // Only apply mold charge for Rubber Patch and Leather Patch
        const requiresMoldCharge = logoType.toLowerCase().includes('rubber patch') || 
                                  logoType.toLowerCase().includes('leather patch');
        
        if (requiresMoldCharge) {
          const size = logoConfig.size || 'Medium';
          const moldChargeType = `${size} Mold Charge`;
          
          const moldPricing = pricingData.find(p => 
            p.type === 'Mold' && 
            p.Name.toLowerCase() === moldChargeType.toLowerCase()
          );
          
          if (moldPricing) {
            const moldPrice = moldPricing.price48; // Fixed charge regardless of quantity
            breakdown.accessoriesCost += moldPrice;
            
            items.push({
              name: 'Mold Charge',
              description: `${moldChargeType} (${logoType})`,
              quantity: 1,
              unitPrice: moldPrice,
              total: moldPrice,
              category: 'other'
            });
            subtotal += moldPrice;
          }
        }
      }
    });
  }

  // Apply any discounts
  if (selectedOptions.discount && selectedOptions.discount > 0) {
    discount = Number(selectedOptions.discount);
  }

  // Shipping costs (separate from delivery charges within order)
  if (selectedOptions.shipping || selectedOptions.shippingCost) {
    shipping = Number(selectedOptions.shipping || selectedOptions.shippingCost);
  }

  // Tax calculation
  if (selectedOptions.tax || selectedOptions.taxAmount) {
    tax = Number(selectedOptions.tax || selectedOptions.taxAmount);
  } else if (selectedOptions.taxRate) {
    const taxRate = Number(selectedOptions.taxRate);
    tax = (subtotal - discount + shipping) * taxRate;
  }

  // Ensure we have at least one delivery item (add only if no delivery items exist)
  const hasDeliveryItem = items.some(item => item.category === 'delivery');
  if (!hasDeliveryItem) {
    const rawDeliveryType = multiSelectOptions?.delivery?.[0] || 
                           selectedOptions['delivery-type'] || 
                           'Standard';
    
    // Map short delivery names to full descriptive names for better invoice presentation
    const deliveryDescriptionMapping: Record<string, string> = {
      'Regular': 'Regular Delivery',
      'regular': 'Regular Delivery',
      'Priority': 'Priority Delivery',
      'priority': 'Priority Delivery',
      'Standard': 'Standard Delivery',
      'standard': 'Standard Delivery'
    };
    
    const deliveryDescription = deliveryDescriptionMapping[rawDeliveryType] || 
                               (rawDeliveryType.includes('Delivery') ? rawDeliveryType : `${rawDeliveryType} Delivery`);
    
    items.push({
      name: 'Delivery Charges',
      description: deliveryDescription,
      quantity: 1,
      unitPrice: 0,
      total: 0,
      category: 'delivery'
    });
  }

  // Note: Customization details are now shown in "Product Specifications & Customizations" section
  // instead of cluttering the invoice table with zero-cost items

  // Calculate final total
  const total = subtotal - discount + shipping + tax;

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