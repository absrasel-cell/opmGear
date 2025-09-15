import { NextRequest, NextResponse } from 'next/server';
// CSV-based pricing imports for Advanced Product page (separate from Support AI Supabase pricing)
import { getBaseProductPricing, loadCustomizationPricing, getPriceForQuantityFromCSV, CustomizationPricing } from '@/lib/pricing-server';
import { loadFabricPricingData } from '@/lib/costing-knowledge-base';
import { generatePricingEstimate } from '@/lib/pricing/pricing-service';

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
 baseProductPricing?: {
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
 priceTier?: string; // ✅ Add priceTier as proper interface field
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

// Using shared CSV loading functions from @/lib/pricing

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
    const sizeUnitPrice = getPriceForQuantityFromCSV(sizeEmbroideryPricing, totalQuantity);
    unitPrice += sizeUnitPrice;
    cost += sizeUnitPrice * totalQuantity;
    details = `${size} Size Embroidery`;
   }
   
   // 2. Add 3D Embroidery base cost
   const threeDPricing = pricingData.find(p => 
    p.Name.toLowerCase() === '3d embroidery'
   );
   
   if (threeDPricing) {
    const threeDUnitPrice = getPriceForQuantityFromCSV(threeDPricing, totalQuantity);
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
    const sizeUnitPrice = getPriceForQuantityFromCSV(sizeEmbroideryPricing, totalQuantity);
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
    // Rubber patch mappings
    'rubber patch': 'Rubber Patch',
    'rubber-patch': 'Rubber Patch',
    'small rubber patch': 'Rubber Patch',
    'medium rubber patch': 'Rubber Patch',
    'large rubber patch': 'Rubber Patch',
    // Leather patch mappings 
    'leather patch': 'Leather Patch',
    'leather-patch': 'Leather Patch',
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
    const baseUnitPrice = getPriceForQuantityFromCSV(basePricing, totalQuantity);
    unitPrice += baseUnitPrice;
    cost += baseUnitPrice * totalQuantity;
    details = `${basePricing.Name}`;
   }
  }

 // Add application method cost if not "Direct"
 if (logoConfig.application && logoConfig.application !== 'Direct') {
  const applicationPricing = pricingData.find(p => 
   p.Name.toLowerCase() === logoConfig.application?.toLowerCase() ||
   (p.Slug && p.Slug.toLowerCase() === logoConfig.application?.toLowerCase())
  );
  
  if (applicationPricing) {
   const applicationUnitPrice = getPriceForQuantityFromCSV(applicationPricing, totalQuantity);
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
  
  // Enhanced debugging for order cost calculation
  console.log('🔧 Cost Calculation API - Request received:', {
   hasSelectedColors: !!body.selectedColors,
   hasSelectedSizes: !!body.selectedSizes,
   hasLogoSetupSelections: !!body.logoSetupSelections,
   hasMultiSelectOptions: !!body.multiSelectOptions,
   hasSelectedOptions: !!body.selectedOptions,
   hasBaseProductPricing: !!body.baseProductPricing,
   priceTier: body.priceTier, // ✅ Use proper interface field
   selectedOptionsPriceTier: body.selectedOptions?.priceTier,
   effectivePriceTier: body.priceTier || body.selectedOptions?.priceTier || 'Tier 1', // ✅ Show what tier will be used
   logoSetupOptions: body.multiSelectOptions?.['logo-setup'] || [],
   logoSetupKeys: body.logoSetupSelections ? Object.keys(body.logoSetupSelections) : []
  });
  
  // Load CSV pricing data for Advanced Product page (Support AI uses Supabase separately)
  console.log('ℹ️ [CALCULATE-COST] Loading CSV pricing data for Advanced Product page');
  const pricingData = await loadCustomizationPricing();
  
  console.log('📊 Pricing data loaded:', {
   totalItems: pricingData.length,
   logoTypes: pricingData.filter(p => p.type === 'logos' || p.type === 'Logos').length,
   accessories: pricingData.filter(p => p.type === 'Accessories').length,
   shipping: pricingData.filter(p => p.type === 'Shipping').length
  });

  const {
   selectedColors,
   selectedSizes,
   logoSetupSelections,
   multiSelectOptions,
   selectedOptions,
   baseProductPricing,
   shipmentData,
   priceTier,
   previousOrderNumber
  } = body;


  let totalCost = 0;
  
  // Calculate total units from selectedColors structure with enhanced validation
  let totalUnits = 0;
  
  if (selectedColors && typeof selectedColors === 'object') {
   totalUnits = Object.values(selectedColors).reduce((sum: number, colorData: unknown) => {
    if (colorData && typeof colorData === 'object') {
     const colorObj = colorData as { sizes: Record<string, number> };
     if (colorObj.sizes && typeof colorObj.sizes === 'object') {
      return sum + Object.values(colorObj.sizes).reduce((colorSum: number, qty: number) => {
       return colorSum + (typeof qty === 'number' ? qty : 0);
      }, 0);
     }
    }
    return sum;
   }, 0);
  } else if (selectedSizes && typeof selectedSizes === 'object') {
   totalUnits = Object.values(selectedSizes).reduce((sum: number, qty: number) => {
    return sum + (typeof qty === 'number' ? qty : 0);
   }, 0);
  }
  
  console.log('📦 Total units calculated:', {
   totalUnits,
   hasSelectedColors: !!selectedColors,
   hasSelectedSizes: !!selectedSizes,
   selectedColorsStructure: selectedColors ? Object.keys(selectedColors) : 'none'
  });
  
  if (totalUnits === 0) {
   console.error('❌ No units calculated from order data');
   return NextResponse.json(
    { error: 'Invalid order data: no units found' },
    { status: 400 }
   );
  }
  
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
  
  // Use the price tier from the request body for consistent pricing calculations
  const effectivePriceTier = priceTier || selectedOptions?.priceTier || 'Tier 1';
  
  // Use CSV-based pricing for Advanced Product page
  const getUnitPrice = async (quantity: number): Promise<number> => {
    console.log('ℹ️ [CALCULATE-COST] Using CSV-based pricing for Advanced Product page');
    const csvPricing = await getBaseProductPricing(effectivePriceTier);
    if (csvPricing) {
      return getPriceForQuantityFromCSV(csvPricing, quantity);
    }
    // Fallback if CSV pricing fails
    console.warn('⚠️ CSV pricing failed, using fallback pricing');
    if (quantity >= 10000) return 2.50;
    if (quantity >= 2880) return 3.00;
    if (quantity >= 1152) return 3.50;
    if (quantity >= 576) return 4.00;
    if (quantity >= 144) return 4.50;
    if (quantity >= 48) return 5.00;
    return 5.50;
  };

  if (selectedColors) {
   // New structure: selectedColors with nested sizes
   for (const [, colorData] of Object.entries(selectedColors)) {
    const colorObj = colorData as { sizes: Record<string, number> };
    const colorTotalQuantity = Object.values(colorObj.sizes).reduce((sum: number, qty: number) => sum + qty, 0);
    
    // Use CSV-based pricing
    const unitPrice = await getUnitPrice(totalUnits);
    baseProductCost += colorTotalQuantity * unitPrice;
   }
  } else if (selectedSizes) {
   // Fallback to old structure
   for (const [, quantity] of Object.entries(selectedSizes)) {
    const qty = quantity as number;
    
    // Use CSV-based pricing
    const unitPrice = await getUnitPrice(totalUnits);
    baseProductCost += qty * unitPrice;
   }
  } else {
   // If no color/size structure, use total units
   const unitPrice = await getUnitPrice(totalUnits);
   baseProductCost = totalUnits * unitPrice;
  }
  totalCost += baseProductCost;

  // Calculate logo setup costs with enhanced validation
  const logoSetupCosts: Array<{ name: string; cost: number; unitPrice: number; details: string }> = [];
  const selectedLogoValues = (multiSelectOptions && multiSelectOptions['logo-setup']) ? multiSelectOptions['logo-setup'] : [];
  
  console.log('🎨 Logo setup processing:', {
   selectedLogoValues,
   hasLogoSetupSelections: !!logoSetupSelections,
   logoSetupKeys: logoSetupSelections ? Object.keys(logoSetupSelections) : []
  });
  
  if (selectedLogoValues.length > 0) {
   selectedLogoValues.forEach((logoValue, index) => {
    console.log(`🎨 Processing logo ${index + 1}:`, logoValue);
    
    let logoConfig = logoSetupSelections[logoValue] || {};
    console.log(`🎨 Logo config for "${logoValue}":`, logoConfig);
    
    // 🔧 CRITICAL FIX: Auto-generate missing position and size data from logo value
    if (!logoConfig.position || !logoConfig.size) {
     console.log(`🔧 Missing position/size for "${logoValue}", attempting to extract from value...`);
     
     // Try to extract position from the logo value (e.g., "Small 3D Embroidery (Back, Small, Direct)")
     const positionMatch = logoValue.match(/\((.*?),/);
     const sizeMatch = logoValue.match(/,\s*(Small|Medium|Large),/) || logoValue.match(/^(Small|Medium|Large)/);
     const applicationMatch = logoValue.match(/,\s*(Direct|[^)]+)\)/);
     
     if (positionMatch) logoConfig.position = positionMatch[1].trim();
     if (sizeMatch) logoConfig.size = sizeMatch[1].trim();
     if (applicationMatch) logoConfig.application = applicationMatch[1].trim();
     
     // Fallback defaults if extraction fails
     if (!logoConfig.position) logoConfig.position = 'Front';
     if (!logoConfig.size) logoConfig.size = 'Medium';
     if (!logoConfig.application) logoConfig.application = 'Direct';
     
     console.log(`🔧 Extracted/defaulted config:`, {
      position: logoConfig.position,
      size: logoConfig.size,
      application: logoConfig.application
     });
    }
    
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
    
    // 🔧 CRITICAL FIX: Handle embroidery types properly
    // Convert display names like "Small 3D Embroidery (Back, Small, Direct)" to "3D Embroidery"
    if (originalLogoType.includes('3D Embroidery') || originalLogoType.includes('3d embroidery')) {
     originalLogoType = '3D Embroidery';
    } else if (originalLogoType.includes('Flat Embroidery') || originalLogoType.includes('flat embroidery')) {
     originalLogoType = 'Flat Embroidery';
    } else if (originalLogoType.includes('Embroidery')) {
     // For cases like "Small Size Embroidery" -> "Flat Embroidery"
     originalLogoType = 'Flat Embroidery';
    }
    
     const logoCost = calculateLogoSetupCost(originalLogoType, logoConfig, pricingData, totalUnits);
     console.log(`🎨 Logo cost calculated:`, {
      originalLogoType,
      cost: logoCost.cost,
      unitPrice: logoCost.unitPrice,
      details: logoCost.details
     });
     
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
     } else {
      console.warn(`⚠️ No cost calculated for logo: ${originalLogoType} with config:`, logoConfig);
     }
    } else {
     console.warn(`⚠️ Logo config still missing position or size for "${logoValue}":`, logoConfig);
    }
   });
  }

  // Calculate mold charge costs
  const moldChargeCosts: Array<{ name: string; cost: number; unitPrice: number; waived: boolean; waiverReason?: string }> = [];
  
  selectedLogoValues.forEach(logoValue => {
   let logoConfig = logoSetupSelections[logoValue] || {};
   
   // 🔧 CRITICAL FIX: Apply same position/size extraction for mold charges
   if (!logoConfig.position || !logoConfig.size) {
    const positionMatch = logoValue.match(/\((.*?),/);
    const sizeMatch = logoValue.match(/,\s*(Small|Medium|Large),/) || logoValue.match(/^(Small|Medium|Large)/);
    const applicationMatch = logoValue.match(/,\s*(Direct|[^)]+)\)/);
    
    if (positionMatch) logoConfig.position = positionMatch[1].trim();
    if (sizeMatch) logoConfig.size = sizeMatch[1].trim();
    if (applicationMatch) logoConfig.application = applicationMatch[1].trim();
    
    // Fallback defaults if extraction fails
    if (!logoConfig.position) logoConfig.position = 'Front';
    if (!logoConfig.size) logoConfig.size = 'Medium';
    if (!logoConfig.application) logoConfig.application = 'Direct';
   }
   
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
    
    // Apply same embroidery type conversion
    if (originalLogoType.includes('3D Embroidery') || originalLogoType.includes('3d embroidery')) {
     originalLogoType = '3D Embroidery';
    } else if (originalLogoType.includes('Flat Embroidery') || originalLogoType.includes('flat embroidery')) {
     originalLogoType = 'Flat Embroidery';
    } else if (originalLogoType.includes('Embroidery')) {
     originalLogoType = 'Flat Embroidery';
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

  // Calculate accessories costs with enhanced validation
  const accessoriesCosts: Array<{ name: string; cost: number; unitPrice: number }> = [];
  const selectedAccessories = (multiSelectOptions && multiSelectOptions.accessories) ? multiSelectOptions.accessories : [];
  
  console.log('🛍️ Accessories processing:', {
   selectedAccessories,
   availableAccessories: pricingData.filter(p => p.type === 'Accessories').map(p => p.Name)
  });
  
  if (selectedAccessories.length > 0) {
   selectedAccessories.forEach((accessoryValue, index) => {
    console.log(`🛍️ Processing accessory ${index + 1}:`, accessoryValue);
    
    // Normalize accessory names (handle plural/singular variations)
    const normalizeAccessoryName = (name: string) => {
     return name.toLowerCase()
      .replace(/s$/, '') // Remove trailing 's' for plural forms
      .replace(/tags?$/, 'tag') // Handle "tags" -> "tag"
      .replace(/stickers?$/, 'sticker'); // Handle "stickers" -> "sticker"
    };
    
    const accessoryPricing = pricingData.find(p => 
     p.type === 'Accessories' && 
     (p.Name.toLowerCase() === accessoryValue.toLowerCase() || 
      (p.Slug && p.Slug.toLowerCase() === accessoryValue.toLowerCase()) ||
      normalizeAccessoryName(p.Name) === normalizeAccessoryName(accessoryValue))
    );
    
    if (accessoryPricing) {
     const unitPrice = getPriceForQuantityFromCSV(accessoryPricing, totalUnits);
     const cost = unitPrice * totalUnits;
     
     console.log(`🛍️ Accessory cost calculated:`, {
      name: accessoryPricing.Name,
      unitPrice,
      cost,
      totalUnits
     });
     
     accessoriesCosts.push({
      name: accessoryPricing.Name,
      cost,
      unitPrice
     });
     totalCost += cost;
    } else {
     console.warn(`⚠️ No pricing found for accessory: ${accessoryValue}`);
     console.warn(`Available accessories:`, pricingData.filter(p => p.type === 'Accessories').map(p => p.Name));
    }
   });
  }

  // Calculate closure type costs
  const closureCosts: Array<{ name: string; cost: number; unitPrice: number }> = [];
  const selectedClosure = selectedOptions['closure-type'];
  
  if (selectedClosure) {
   // Only add cost if there's actual pricing data for this closure type
   const closurePricing = pricingData.find(p => 
    p.type === 'Premium Closure' && 
    (p.Name.toLowerCase() === selectedClosure.toLowerCase() || 
     (p.Slug && p.Slug.toLowerCase() === selectedClosure.toLowerCase()))
   );
   
   if (closurePricing) {
    const unitPrice = getPriceForQuantityFromCSV(closurePricing, totalUnits);
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

  // Calculate premium fabric costs using BOTH Fabric.csv and Customization Pricings.csv
  const premiumFabricCosts: Array<{ name: string; cost: number; unitPrice: number }> = [];

  // Load fabric pricing data for Advanced Product page
  const fabricPricingData = await loadFabricPricingData();
  
  // Get fabric setup from selectedOptions (for cart) or direct body properties (for product page)
  const fabricSetup = selectedOptions?.['fabric-setup'] || body.fabricSetup;
  const customFabricSetup = selectedOptions?.['custom-fabric'] || body.customFabricSetup; // Fix: use 'custom-fabric' not 'custom-fabric-setup'
  const productType = body.productType;
  
  console.log('🧵 [FABRIC-PRICING] Premium Fabric processing:', {
   fabricSetup,
   customFabricSetup,
   effectiveFabricSetup: fabricSetup === 'Other' ? customFabricSetup : fabricSetup,
   hasFabricSetup: !!(fabricSetup || customFabricSetup),
   fabricSetupFromOptions: selectedOptions?.['fabric-setup'],
   customFabricFromOptions: selectedOptions?.['custom-fabric'], // Fix: use correct field name
   allSelectedOptions: selectedOptions,
   fabricDataLoaded: fabricPricingData.length
  });
  
  
  // Only add premium fabric cost if the product has a premium fabric setup
  if (fabricSetup || customFabricSetup) {
   const effectiveFabricSetup = fabricSetup === 'Other' ? customFabricSetup : fabricSetup;
   
   if (effectiveFabricSetup) {
    // Handle dual fabric setups (e.g., "Duck Camo/Trucker Mesh" or "Polyester/Laser Cut")
    const fabricNames = effectiveFabricSetup.split('/').map(f => f.trim());
    
    // Check each fabric component for premium pricing
    for (const fabricName of fabricNames) {
     console.log('🧵 [FABRIC-PRICING] Analyzing fabric:', {
      fabricName,
      lowercaseName: fabricName.toLowerCase()
     });
     
     // STEP 1: Check Fabric.csv for fabric type (Free vs Premium Fabric)
     const fabricInfo = fabricPricingData.find(f => 
      f.Name.toLowerCase() === fabricName.toLowerCase()
     );
     
     if (fabricInfo) {
      console.log('🧵 [FABRIC-PRICING] Found fabric info:', {
       name: fabricInfo.Name,
       costType: fabricInfo.costType,
       price144: fabricInfo.price144
      });
      
      // If fabric is marked as "Free" in Fabric.csv, skip premium charges
      if (fabricInfo.costType === 'Free') {
       console.log('🧵 [FABRIC-PRICING] Fabric is FREE, no premium charge:', fabricInfo.Name);
       continue;
      }
      
      // If fabric is marked as "Premium Fabric", use Fabric.csv pricing
      if (fabricInfo.costType === 'Premium Fabric') {
       const unitPrice = getPriceForQuantityFromCSV(fabricInfo, totalUnits);
       const cost = unitPrice * totalUnits;
       
       console.log('🧵 [FABRIC-PRICING] Premium fabric pricing from Fabric.csv:', {
        name: fabricInfo.Name,
        costType: fabricInfo.costType,
        unitPrice,
        cost,
        totalUnits
       });
       
       // Check if this premium fabric is already added (avoid duplicates)
       const existingFabric = premiumFabricCosts.find(f => f.name === fabricInfo.Name);
       if (!existingFabric) {
        premiumFabricCosts.push({
         name: fabricInfo.Name,
         cost,
         unitPrice
        });
        totalCost += cost;
        console.log('🧵 [FABRIC-PRICING] Added premium fabric cost:', {
         name: fabricInfo.Name,
         cost,
         newTotalCost: totalCost
        });
       } else {
        console.log('🧵 [FABRIC-PRICING] Duplicate premium fabric, skipping:', fabricInfo.Name);
       }
      }
     } else {
      // STEP 2: Fallback to Customization Pricings.csv for backward compatibility
      console.log('🧵 [FABRIC-PRICING] Fabric not found in Fabric.csv, checking Customization Pricings.csv:', fabricName);
      
      const premiumFabricPricing = pricingData.find(p => 
       p.type === 'Premium Fabric' && 
       p.Name.toLowerCase() === fabricName.toLowerCase()
      );
      
      if (premiumFabricPricing) {
       const unitPrice = getPriceForQuantityFromCSV(premiumFabricPricing, totalUnits);
       const cost = unitPrice * totalUnits;
       
       console.log('🧵 [FABRIC-PRICING] Found premium fabric in Customization Pricings.csv:', {
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
        console.log('🧵 [FABRIC-PRICING] Added premium fabric cost from Customization Pricings.csv:', {
         name: premiumFabricPricing.Name,
         cost,
         newTotalCost: totalCost
        });
       } else {
        console.log('🧵 [FABRIC-PRICING] Duplicate premium fabric, skipping:', premiumFabricPricing.Name);
       }
      } else {
       console.log('🧵 [FABRIC-PRICING] No premium fabric pricing found in either CSV for:', fabricName);
       console.log('🧵 [FABRIC-PRICING] Available premium fabrics in Customization Pricings.csv:', 
        pricingData.filter(p => p.type === 'Premium Fabric').map(p => p.Name)
       );
       console.log('🧵 [FABRIC-PRICING] Available fabrics in Fabric.csv:', 
        fabricPricingData.map(f => ({ name: f.Name, type: f.costType }))
       );
      }
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
    
    const unitPrice = getPriceForQuantityFromCSV(deliveryPricing, pricingQuantity);
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

  // Calculate services costs
  const servicesCosts: Array<{ name: string; cost: number; unitPrice: number }> = [];
  const selectedServices = multiSelectOptions.services || [];
  
  selectedServices.forEach(serviceValue => {
   const servicePricing = pricingData.find(p => 
    p.type === 'Service' && 
    (p.Name.toLowerCase() === serviceValue.toLowerCase() || 
     p.Slug?.toLowerCase() === serviceValue.toLowerCase())
   );
   
   if (servicePricing) {
    // Services are typically flat-rate, so we use the base price (price48)
    const unitPrice = servicePricing.price48;
    const cost = unitPrice; // Services are usually one-time costs, not multiplied by quantity
    
    console.log('🔧 API Debug - Service pricing calculation:', {
     serviceName: servicePricing.Name,
     serviceType: servicePricing.type,
     unitPrice,
     cost,
     isQuantityBased: false // Services are typically flat-rate
    });
    
    servicesCosts.push({
     name: servicePricing.Name,
     cost,
     unitPrice
    });
    totalCost += cost;
   } else {
    console.log('🔧 API Debug - No service pricing found for:', serviceValue);
   }
  });

  const costBreakdown: CostBreakdown = {
   baseProductCost,
   logoSetupCosts,
   accessoriesCosts,
   closureCosts,
   premiumFabricCosts,
   deliveryCosts,
   servicesCosts,
   moldChargeCosts,
   totalCost,
   totalUnits
  };

  // Final cost breakdown summary
  console.log('💰 Final Cost Breakdown:', {
   baseProductCost,
   logoSetupCosts: logoSetupCosts.length,
   accessoriesCosts: accessoriesCosts.length,
   closureCosts: closureCosts.length,
   premiumFabricCosts: premiumFabricCosts.length,
   deliveryCosts: deliveryCosts.length,
   servicesCosts: servicesCosts.length,
   moldChargeCosts: moldChargeCosts.length,
   totalCost,
   totalUnits
  });
  
  console.log('✅ Cost calculation completed successfully');
  return NextResponse.json(costBreakdown);
 } catch (error) {
  console.error('Error calculating cost:', error);
  return NextResponse.json(
   { error: 'Failed to calculate cost' },
   { status: 500 }
  );
 }
}
