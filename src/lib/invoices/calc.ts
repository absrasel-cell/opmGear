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

// Calculate unit price from CSV data (same logic as product pages)
function calculateUnitPriceFromCSV(quantity: number, tierData: any): number {
  if (!tierData) return 3.2; // Fallback
  
  if (quantity >= 10000) return tierData.price10000;
  if (quantity >= 2880) return tierData.price2880;
  if (quantity >= 1152) return tierData.price1152;
  if (quantity >= 576) return tierData.price576;
  if (quantity >= 144) return tierData.price144;
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
  // Use direct calculation instead of HTTP call to avoid timeout issues
  console.log('💰 Starting direct invoice calculation for consistency with order management');
  return calculateInvoiceFromOrderLegacy(order);
}

function convertCostBreakdownToInvoice(order: OrderWithDetails, costBreakdown: any): InvoiceCalculation {
  const items: DetailedInvoiceItem[] = [];
  let subtotal = new Decimal(0);

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
    const basePrice = new Decimal(costBreakdown.baseProductCost);
    items.push({
      name: 'Blank Cap Cost',
      description: `${totalQuantity} units @ ${basePrice.div(totalQuantity || 1).toFixed(2)} ea`,
      quantity: totalQuantity,
      unitPrice: basePrice.div(totalQuantity || 1),
      total: basePrice,
      category: 'cap'
    });
    subtotal = subtotal.add(basePrice);
  }

  // Logo setup costs
  if (costBreakdown.logoSetupCosts && Array.isArray(costBreakdown.logoSetupCosts)) {
    costBreakdown.logoSetupCosts.forEach((logo: any) => {
      const logoPrice = new Decimal(logo.cost);
      const logoUnitPrice = new Decimal(logo.unitPrice || 0);
      items.push({
        name: 'Logo Setup',
        description: `${logo.details || logo.name} (${totalQuantity} units @ $${logoUnitPrice.toFixed(2)} ea)`,
        quantity: totalQuantity,
        unitPrice: logoUnitPrice,
        total: logoPrice,
        category: 'logo'
      });
      subtotal = subtotal.add(logoPrice);
    });
  }

  // Accessories costs
  if (costBreakdown.accessoriesCosts && Array.isArray(costBreakdown.accessoriesCosts)) {
    costBreakdown.accessoriesCosts.forEach((accessory: any) => {
      const accessoryPrice = new Decimal(accessory.cost);
      const accessoryUnitPrice = new Decimal(accessory.unitPrice || 0);
      items.push({
        name: 'Other Accessories',
        description: accessory.name,
        quantity: totalQuantity,
        unitPrice: accessoryUnitPrice,
        total: accessoryPrice,
        category: 'accessory'
      });
      subtotal = subtotal.add(accessoryPrice);
    });
  }

  // Closure costs
  if (costBreakdown.closureCosts && Array.isArray(costBreakdown.closureCosts)) {
    costBreakdown.closureCosts.forEach((closure: any) => {
      const closurePrice = new Decimal(closure.cost);
      const closureUnitPrice = new Decimal(closure.unitPrice || 0);
      items.push({
        name: 'Closure Option',
        description: closure.name,
        quantity: totalQuantity,
        unitPrice: closureUnitPrice,
        total: closurePrice,
        category: 'closure'
      });
      subtotal = subtotal.add(closurePrice);
    });
  }

  // Premium fabric costs
  if (costBreakdown.premiumFabricCosts && Array.isArray(costBreakdown.premiumFabricCosts)) {
    costBreakdown.premiumFabricCosts.forEach((fabric: any) => {
      const fabricPrice = new Decimal(fabric.cost);
      const fabricUnitPrice = new Decimal(fabric.unitPrice || 0);
      items.push({
        name: 'Premium Fabric',
        description: fabric.name,
        quantity: totalQuantity,
        unitPrice: fabricUnitPrice,
        total: fabricPrice,
        category: 'accessory'
      });
      subtotal = subtotal.add(fabricPrice);
    });
  }

  // Delivery costs
  if (costBreakdown.deliveryCosts && Array.isArray(costBreakdown.deliveryCosts)) {
    costBreakdown.deliveryCosts.forEach((delivery: any) => {
      const deliveryPrice = new Decimal(delivery.cost);
      const deliveryUnitPrice = new Decimal(delivery.unitPrice || 0);
      items.push({
        name: 'Delivery Charges',
        description: delivery.name,
        quantity: totalQuantity,
        unitPrice: deliveryUnitPrice,
        total: deliveryPrice,
        category: 'delivery'
      });
      subtotal = subtotal.add(deliveryPrice);
    });
  }

  // Mold charge costs
  if (costBreakdown.moldChargeCosts && Array.isArray(costBreakdown.moldChargeCosts)) {
    costBreakdown.moldChargeCosts.forEach((mold: any) => {
      if (!mold.waived && mold.cost > 0) {
        const moldPrice = new Decimal(mold.cost);
        items.push({
          name: 'Mold Charge',
          description: mold.name,
          quantity: 1,
          unitPrice: moldPrice,
          total: moldPrice,
          category: 'other'
        });
        subtotal = subtotal.add(moldPrice);
      }
    });
  }

  // Services costs (was missing)
  if (costBreakdown.servicesCosts && Array.isArray(costBreakdown.servicesCosts)) {
    costBreakdown.servicesCosts.forEach((service: any) => {
      const servicePrice = new Decimal(service.cost);
      const serviceUnitPrice = new Decimal(service.unitPrice || service.cost); // Services are typically flat-rate
      items.push({
        name: 'Services',
        description: service.name,
        quantity: 1,
        unitPrice: serviceUnitPrice,
        total: servicePrice,
        category: 'other'
      });
      subtotal = subtotal.add(servicePrice);
    });
  }

  // Ensure we have at least one delivery item
  const hasDeliveryItem = items.some(item => item.category === 'delivery');
  if (!hasDeliveryItem) {
    items.push({
      name: 'Delivery Charges',
      description: 'Standard Shipping',
      quantity: 1,
      unitPrice: new Decimal(0),
      total: new Decimal(0),
      category: 'delivery'
    });
  }

  const breakdown = {
    blankCapCost: new Decimal(costBreakdown.baseProductCost || 0),
    logoSetupCost: new Decimal(costBreakdown.logoSetupCosts?.reduce((sum: number, item: any) => sum + item.cost, 0) || 0),
    accessoriesCost: new Decimal(
      (costBreakdown.accessoriesCosts?.reduce((sum: number, item: any) => sum + item.cost, 0) || 0) +
      (costBreakdown.closureCosts?.reduce((sum: number, item: any) => sum + item.cost, 0) || 0) +
      (costBreakdown.premiumFabricCosts?.reduce((sum: number, item: any) => sum + item.cost, 0) || 0) +
      (costBreakdown.moldChargeCosts?.reduce((sum: number, item: any) => item.waived ? sum : sum + item.cost, 0) || 0) +
      (costBreakdown.servicesCosts?.reduce((sum: number, item: any) => sum + item.cost, 0) || 0)
    ),
    deliveryCost: new Decimal(costBreakdown.deliveryCosts?.reduce((sum: number, item: any) => sum + item.cost, 0) || 0)
  };

  return {
    items,
    subtotal,
    discount: new Decimal(0),
    shipping: new Decimal(0),
    tax: new Decimal(0),
    total: subtotal,
    breakdown
  };
}

function convertOrderCostBreakdownToInvoice(order: OrderWithDetails, costBreakdown: any): InvoiceCalculation {
  const items: DetailedInvoiceItem[] = [];
  let subtotal = new Decimal(0);

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
    const basePrice = new Decimal(costBreakdown.baseProductCost);
    items.push({
      name: 'Blank Cap Cost',
      description: `${totalQuantity} units @ ${basePrice.div(totalQuantity || 1).toFixed(2)} ea`,
      quantity: totalQuantity,
      unitPrice: basePrice.div(totalQuantity || 1),
      total: basePrice,
      category: 'cap'
    });
    subtotal = subtotal.add(basePrice);
  }

  // Logo setup costs
  if (costBreakdown.logoSetupCosts && Array.isArray(costBreakdown.logoSetupCosts)) {
    costBreakdown.logoSetupCosts.forEach((logo: any) => {
      const logoPrice = new Decimal(logo.cost);
      const logoUnitPrice = new Decimal(logo.unitPrice || 0);
      items.push({
        name: 'Logo Setup',
        description: `${logo.details || logo.name} (${totalQuantity} units @ $${logoUnitPrice.toFixed(2)} ea)`,
        quantity: totalQuantity,
        unitPrice: logoUnitPrice,
        total: logoPrice,
        category: 'logo'
      });
      subtotal = subtotal.add(logoPrice);
    });
  }

  // Accessories costs
  if (costBreakdown.accessoriesCosts && Array.isArray(costBreakdown.accessoriesCosts)) {
    costBreakdown.accessoriesCosts.forEach((accessory: any) => {
      const accessoryPrice = new Decimal(accessory.cost);
      const accessoryUnitPrice = new Decimal(accessory.unitPrice || 0);
      items.push({
        name: 'Other Accessories',
        description: accessory.name,
        quantity: totalQuantity,
        unitPrice: accessoryUnitPrice,
        total: accessoryPrice,
        category: 'accessory'
      });
      subtotal = subtotal.add(accessoryPrice);
    });
  }

  // Closure costs
  if (costBreakdown.closureCosts && Array.isArray(costBreakdown.closureCosts)) {
    costBreakdown.closureCosts.forEach((closure: any) => {
      const closurePrice = new Decimal(closure.cost);
      items.push({
        name: 'Closure Option',
        description: closure.name,
        quantity: 1,
        unitPrice: closurePrice,
        total: closurePrice,
        category: 'closure'
      });
      subtotal = subtotal.add(closurePrice);
    });
  }

  // Delivery costs
  if (costBreakdown.deliveryCosts && Array.isArray(costBreakdown.deliveryCosts)) {
    costBreakdown.deliveryCosts.forEach((delivery: any) => {
      const deliveryPrice = new Decimal(delivery.cost);
      const deliveryUnitPrice = new Decimal(delivery.unitPrice || 0);
      items.push({
        name: 'Delivery Charges',
        description: delivery.name,
        quantity: totalQuantity,
        unitPrice: deliveryUnitPrice,
        total: deliveryPrice,
        category: 'delivery'
      });
      subtotal = subtotal.add(deliveryPrice);
    });
  }

  // Services costs (was missing)
  if (costBreakdown.servicesCosts && Array.isArray(costBreakdown.servicesCosts)) {
    costBreakdown.servicesCosts.forEach((service: any) => {
      const servicePrice = new Decimal(service.cost);
      const serviceUnitPrice = new Decimal(service.unitPrice || service.cost); // Services are typically flat-rate
      items.push({
        name: 'Services',
        description: service.name,
        quantity: 1,
        unitPrice: serviceUnitPrice,
        total: servicePrice,
        category: 'other'
      });
      subtotal = subtotal.add(servicePrice);
    });
  }

  // Ensure we have at least one delivery item
  const hasDeliveryItem = items.some(item => item.category === 'delivery');
  if (!hasDeliveryItem) {
    items.push({
      name: 'Delivery Charges',
      description: 'Standard Shipping',
      quantity: 1,
      unitPrice: new Decimal(0),
      total: new Decimal(0),
      category: 'delivery'
    });
  }

  const breakdown = {
    blankCapCost: new Decimal(costBreakdown.baseProductCost || 0),
    logoSetupCost: new Decimal(costBreakdown.logoSetupCosts?.reduce((sum: number, item: any) => sum + item.cost, 0) || 0),
    accessoriesCost: new Decimal(
      (costBreakdown.accessoriesCosts?.reduce((sum: number, item: any) => sum + item.cost, 0) || 0) +
      (costBreakdown.servicesCosts?.reduce((sum: number, item: any) => sum + item.cost, 0) || 0)
    ),
    deliveryCost: new Decimal(costBreakdown.deliveryCosts?.reduce((sum: number, item: any) => sum + item.cost, 0) || 0)
  };

  return {
    items,
    subtotal,
    discount: new Decimal(0),
    shipping: new Decimal(0),
    tax: new Decimal(0),
    total: subtotal,
    breakdown
  };
}

async function calculateInvoiceFromOrderLegacy(order: OrderWithDetails): Promise<InvoiceCalculation> {
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
  
  // Get pricing data for the tier
  const tierData = csvPricingData[pricingTier];
  const calculatedUnitPrice = calculateUnitPriceFromCSV(totalQuantity, tierData);
  let baseUnitPrice = new Decimal(calculatedUnitPrice);

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
          const closurePrice = new Decimal(unitPrice);
          const closureTotal = closurePrice.mul(totalQuantity);
          breakdown.accessoriesCost = breakdown.accessoriesCost.add(closureTotal);
          
          items.push({
            name: 'Closure Option',
            description: closure,
            quantity: totalQuantity,
            unitPrice: closurePrice,
            total: closureTotal,
            category: 'closure'
          });
          subtotal = subtotal.add(closureTotal);
        } else {
          // Fallback only if no pricing found
          const closurePrice = new Decimal(2.00);
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
  
  // Handle premium fabric costs (missing critical component)
  if (selectedOptions['fabric-setup'] || selectedOptions['custom-fabric']) {
    const fabricSetup = selectedOptions['fabric-setup'];
    const customFabricSetup = selectedOptions['custom-fabric'];
    const effectiveFabricSetup = fabricSetup === 'Other' ? customFabricSetup : fabricSetup;
    
    if (effectiveFabricSetup) {
      // Handle dual fabric setups (e.g., "Polyester/Laser Cut")
      const fabricNames = effectiveFabricSetup.split('/').map(f => f.trim());
      
      // Check each fabric component for premium pricing
      for (const fabricName of fabricNames) {
        const premiumFabricPricing = pricingData.find(p => 
          p.type === 'Premium Fabric' && 
          p.Name.toLowerCase() === fabricName.toLowerCase()
        );
        
        if (premiumFabricPricing) {
          const unitPrice = getPriceForQuantity(premiumFabricPricing, totalQuantity);
          const fabricPrice = new Decimal(unitPrice);
          const fabricTotal = fabricPrice.mul(totalQuantity);
          breakdown.accessoriesCost = breakdown.accessoriesCost.add(fabricTotal);
          
          items.push({
            name: 'Premium Fabric',
            description: fabricName,
            quantity: totalQuantity,
            unitPrice: fabricPrice,
            total: fabricTotal,
            category: 'accessory'
          });
          subtotal = subtotal.add(fabricTotal);
        }
      }
    }
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
        const closurePrice = new Decimal(unitPrice);
        const closureTotal = closurePrice.mul(totalQuantity);
        breakdown.accessoriesCost = breakdown.accessoriesCost.add(closureTotal);
        
        items.push({
          name: 'Closure Option',
          description: closureType,
          quantity: totalQuantity,
          unitPrice: closurePrice,
          total: closureTotal,
          category: 'closure'
        });
        subtotal = subtotal.add(closureTotal);
      }
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
        const servicePrice = new Decimal(servicePricing.price48); // Use base price for services
        breakdown.accessoriesCost = breakdown.accessoriesCost.add(servicePrice);
        
        items.push({
          name: 'Services',
          description: service,
          quantity: 1,
          unitPrice: servicePrice,
          total: servicePrice,
          category: 'other'
        });
        subtotal = subtotal.add(servicePrice);
      } else {
        // Fallback pricing for known services if not found in CSV
        let fallbackPrice = new Decimal(0);
        
        // Common service fallback pricing
        if (service.toLowerCase().includes('graphics')) {
          fallbackPrice = new Decimal(50.00);
        } else if (service.toLowerCase().includes('sampling')) {
          fallbackPrice = new Decimal(100.00);
        } else if (service.toLowerCase().includes('design')) {
          fallbackPrice = new Decimal(75.00);
        } else {
          fallbackPrice = new Decimal(25.00); // Generic service fallback
        }
        
        if (fallbackPrice.gt(0)) {
          breakdown.accessoriesCost = breakdown.accessoriesCost.add(fallbackPrice);
          
          items.push({
            name: 'Services',
            description: service,
            quantity: 1,
            unitPrice: fallbackPrice,
            total: fallbackPrice,
            category: 'other'
          });
          subtotal = subtotal.add(fallbackPrice);
        }
      }
    });
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
            const moldPrice = new Decimal(moldPricing.price48); // Fixed charge regardless of quantity
            breakdown.accessoriesCost = breakdown.accessoriesCost.add(moldPrice);
            
            items.push({
              name: 'Mold Charge',
              description: `${moldChargeType} (${logoType})`,
              quantity: 1,
              unitPrice: moldPrice,
              total: moldPrice,
              category: 'other'
            });
            subtotal = subtotal.add(moldPrice);
          }
        }
      }
    });
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

  // Note: Customization details are now shown in "Product Specifications & Customizations" section
  // instead of cluttering the invoice table with zero-cost items

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