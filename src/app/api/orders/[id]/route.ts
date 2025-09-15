import { NextRequest, NextResponse } from 'next/server';
// Removed Prisma - migrated to Supabase
import { supabaseAdmin } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import { sendEmail } from '@/lib/resend';
import { emailTemplates } from '@/lib/email/templates';

// Helper function to upload logo files to Supabase and create OrderAsset records
async function processLogoFile(logoFile: any, orderId: string, userId?: string) {
 if (!logoFile || !logoFile.base64Data) {
  return null;
 }

 try {
  // Convert base64 to buffer
  const base64Data = logoFile.base64Data.split(',')[1]; // Remove data:image/jpeg;base64, prefix
  const fileBuffer = Buffer.from(base64Data, 'base64');
  
  // Generate unique filename
  const fileName = `${uuidv4()}-${logoFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
  const filePath = `${orderId}/${fileName}`;

  // Upload to Supabase storage
  const { error: uploadError } = await supabaseAdmin.storage
   .from('order-assets')
   .upload(filePath, fileBuffer, {
    contentType: logoFile.type,
    upsert: false
   });

  if (uploadError) {
   console.error('Supabase upload error:', uploadError);
   return null;
  }

  // Create OrderAsset record using Supabase
  const { data: orderAsset, error: assetError } = await supabaseAdmin
   .from('OrderAsset')
   .insert({
    orderId: orderId,
    userId: userId || null, // Use provided userId or null for guests
    kind: 'LOGO', // Assume logo files are LOGO type
    position: logoFile.position || 'Front',
    bucket: 'order-assets',
    path: filePath,
    mimeType: logoFile.type,
    sizeBytes: logoFile.size,
    width: logoFile.width,
    height: logoFile.height,
   })
   .select()
   .single();

  if (assetError) {
   console.error('Failed to create OrderAsset record:', assetError);
   return null;
  }

  console.log('✅ Processed logo file:', fileName, 'for order:', orderId);
  return {
   url: supabaseAdmin.storage.from('order-assets').getPublicUrl(filePath).data.publicUrl,
   name: logoFile.name,
   size: logoFile.size,
   type: logoFile.type,
   assetId: orderAsset?.id
  };
 } catch (error) {
  console.error('Failed to process logo file:', logoFile.name, error);
  return null;
 }
}

// Add function to calculate order total using the exact same logic as /api/calculate-cost
async function calculateOrderTotal(order: any): Promise<number> {
 try {
  console.log('🧾 Calculating order total for order:', order.id);

  // Import the same functions that /api/calculate-cost uses
  const { loadCustomizationPricing, getBaseProductPricing, getPriceForQuantityFromCSV } = await import('@/lib/pricing-server');
  const { loadFabricPricingData } = await import('@/lib/costing-knowledge-base');

  // Load pricing data exactly like /api/calculate-cost
  const pricingData = await loadCustomizationPricing();
  const fabricPricingData = await loadFabricPricingData();

  // Use the same data structure as /api/calculate-cost expects
  const body = {
   selectedColors: order.selectedColors,
   logoSetupSelections: order.logoSetupSelections,
   selectedOptions: order.selectedOptions,
   multiSelectOptions: order.multiSelectOptions,
   priceTier: order.selectedOptions?.priceTier || 'Tier 1'
  };

  const {
   selectedColors,
   logoSetupSelections,
   multiSelectOptions,
   selectedOptions,
   priceTier
  } = body;

  let totalCost = 0;

  // Calculate total units from selectedColors structure (same logic as /api/calculate-cost)
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
  }

  if (totalUnits === 0) {
   console.log('🧾 No units found in order data');
   return 0;
  }

  // Calculate base product cost using the same logic as /api/calculate-cost
  let baseProductCost = 0;
  const effectivePriceTier = priceTier || selectedOptions?.priceTier || 'Tier 1';

  const getUnitPrice = async (quantity: number): Promise<number> => {
   const csvPricing = await getBaseProductPricing(effectivePriceTier);
   if (csvPricing) {
    return getPriceForQuantityFromCSV(csvPricing, quantity);
   }
   // Fallback pricing
   if (quantity >= 10000) return 2.50;
   if (quantity >= 2880) return 3.00;
   if (quantity >= 1152) return 3.50;
   if (quantity >= 576) return 4.00;
   if (quantity >= 144) return 4.50;
   if (quantity >= 48) return 5.00;
   return 5.50;
  };

  if (selectedColors) {
   for (const [, colorData] of Object.entries(selectedColors)) {
    const colorObj = colorData as { sizes: Record<string, number> };
    const colorTotalQuantity = Object.values(colorObj.sizes).reduce((sum: number, qty: number) => sum + qty, 0);
    const unitPrice = await getUnitPrice(totalUnits);
    baseProductCost += colorTotalQuantity * unitPrice;
   }
  }
  totalCost += baseProductCost;

  // Calculate logo setup costs (same logic as /api/calculate-cost)
  const selectedLogoValues = (multiSelectOptions && multiSelectOptions['logo-setup']) ? multiSelectOptions['logo-setup'] : [];

  if (selectedLogoValues.length > 0) {
   for (const logoValue of selectedLogoValues) {
    let logoConfig = logoSetupSelections[logoValue] || {};

    // Auto-generate missing position and size data from logo value (same as /api/calculate-cost)
    if (!logoConfig.position || !logoConfig.size) {
     const positionMatch = logoValue.match(/\((.*?),/);
     const sizeMatch = logoValue.match(/,\s*(Small|Medium|Large),/) || logoValue.match(/^(Small|Medium|Large)/);
     const applicationMatch = logoValue.match(/,\s*(Direct|[^)]+)\)/);

     if (positionMatch) logoConfig.position = positionMatch[1].trim();
     if (sizeMatch) logoConfig.size = sizeMatch[1].trim();
     if (applicationMatch) logoConfig.application = applicationMatch[1].trim();

     // Fallback defaults
     if (!logoConfig.position) logoConfig.position = 'Front';
     if (!logoConfig.size) logoConfig.size = 'Medium';
     if (!logoConfig.application) logoConfig.application = 'Direct';
    }

    if (logoConfig.position && logoConfig.size) {
     // Extract original logo type from potentially duplicated key (same logic as /api/calculate-cost)
     let originalLogoType = logoValue;
     if (logoValue.includes('-')) {
      const parts = logoValue.split('-');
      if (parts.length === 2) {
       originalLogoType = `${parts[0]} ${parts[1]}`;
      } else {
       originalLogoType = `${parts[0]} ${parts[1]}`;
      }
     }

     // Handle embroidery types properly (same as /api/calculate-cost)
     if (originalLogoType.includes('3D Embroidery') || originalLogoType.includes('3d embroidery')) {
      originalLogoType = '3D Embroidery';
     } else if (originalLogoType.includes('Flat Embroidery') || originalLogoType.includes('flat embroidery')) {
      originalLogoType = 'Flat Embroidery';
     } else if (originalLogoType.includes('Embroidery')) {
      originalLogoType = 'Flat Embroidery';
     }

     // Calculate logo cost using the same function as /api/calculate-cost
     const logoCost = await calculateLogoSetupCost(originalLogoType, logoConfig, pricingData, totalUnits);

     if (logoCost.cost > 0) {
      totalCost += logoCost.cost;
     }
    }
   }
  }

  // Calculate other costs (accessories, closures, fabrics, delivery) using same logic...
  // For brevity, I'll add the key ones:

  // Accessories
  const selectedAccessories = (multiSelectOptions && multiSelectOptions.accessories) ? multiSelectOptions.accessories : [];
  if (selectedAccessories.length > 0) {
   for (const accessoryValue of selectedAccessories) {
    const accessoryPricing = pricingData.find((p: any) =>
     p.type === 'Accessories' &&
     (p.Name.toLowerCase() === accessoryValue.toLowerCase() ||
      (p.Slug && p.Slug.toLowerCase() === accessoryValue.toLowerCase()))
    );

    if (accessoryPricing) {
     const unitPrice = getPriceForQuantityFromCSV(accessoryPricing, totalUnits);
     const cost = unitPrice * totalUnits;
     totalCost += cost;
    }
   }
  }

  // Premium fabrics
  const fabricSetup = selectedOptions?.['fabric-setup'];
  if (fabricSetup && fabricSetup !== 'None') {
   // Check fabric pricing data first
   const fabricInfo = fabricPricingData.find((f: any) =>
    f.Name.toLowerCase() === fabricSetup.toLowerCase()
   );

   if (fabricInfo && fabricInfo.costType === 'Premium Fabric') {
    const unitPrice = getPriceForQuantityFromCSV(fabricInfo, totalUnits);
    const cost = unitPrice * totalUnits;
    totalCost += cost;
   } else {
    // Fallback to customization pricing
    const premiumFabricPricing = pricingData.find((p: any) =>
     p.type === 'Premium Fabric' &&
     p.Name.toLowerCase() === fabricSetup.toLowerCase()
    );

    if (premiumFabricPricing) {
     const unitPrice = getPriceForQuantityFromCSV(premiumFabricPricing, totalUnits);
     const cost = unitPrice * totalUnits;
     totalCost += cost;
    }
   }
  }

  // Delivery costs
  const selectedDelivery = selectedOptions['delivery-type'];
  if (selectedDelivery) {
   const deliveryTypeMapping: Record<string, string> = {
    'regular': 'Regular Delivery',
    'priority': 'Priority Delivery',
    'air-freight': 'Air Freight',
    'sea-freight': 'Sea Freight',
   };

   const mappedDeliveryName = deliveryTypeMapping[selectedDelivery.toLowerCase()] || selectedDelivery;
   const deliveryPricing = pricingData.find((p: any) =>
    p.type === 'Shipping' &&
    p.Name.toLowerCase() === mappedDeliveryName.toLowerCase()
   );

   if (deliveryPricing) {
    const unitPrice = getPriceForQuantityFromCSV(deliveryPricing, totalUnits);
    const cost = unitPrice * totalUnits;
    totalCost += cost;
   }
  }

  // Services costs
  const selectedServices = multiSelectOptions?.services || [];
  if (selectedServices.length > 0) {
   for (const serviceValue of selectedServices) {
    const servicePricing = pricingData.find((p: any) =>
     p.type === 'Service' &&
     (p.Name.toLowerCase() === serviceValue.toLowerCase() ||
      (p.Slug && p.Slug.toLowerCase() === serviceValue.toLowerCase()))
    );

    if (servicePricing) {
     const unitPrice = servicePricing.price48; // Services are typically flat-rate
     const cost = unitPrice; // Services are usually one-time costs, not multiplied by quantity
     totalCost += cost;
    }
   }
  }

  // Closure costs (premium closures)
  const selectedClosure = selectedOptions['closure-type'];
  if (selectedClosure && selectedClosure !== 'None') {
   const closurePricing = pricingData.find((p: any) =>
    p.type === 'Premium Closure' &&
    (p.Name.toLowerCase() === selectedClosure.toLowerCase() ||
     (p.Slug && p.Slug.toLowerCase() === selectedClosure.toLowerCase()))
   );

   if (closurePricing) {
    const unitPrice = getPriceForQuantityFromCSV(closurePricing, totalUnits);
    const cost = unitPrice * totalUnits;
    totalCost += cost;
   }
  }

  // Mold charge costs (for rubber patch and leather patch)
  if (selectedLogoValues.length > 0) {
   for (const logoValue of selectedLogoValues) {
    let logoConfig = logoSetupSelections[logoValue] || {};

    // Auto-generate missing position and size data
    if (!logoConfig.position || !logoConfig.size) {
     const positionMatch = logoValue.match(/\((.*?),/);
     const sizeMatch = logoValue.match(/,\s*(Small|Medium|Large),/) || logoValue.match(/^(Small|Medium|Large)/);
     const applicationMatch = logoValue.match(/,\s*(Direct|[^)]+)\)/);

     if (positionMatch) logoConfig.position = positionMatch[1].trim();
     if (sizeMatch) logoConfig.size = sizeMatch[1].trim();
     if (applicationMatch) logoConfig.application = applicationMatch[1].trim();

     if (!logoConfig.position) logoConfig.position = 'Front';
     if (!logoConfig.size) logoConfig.size = 'Medium';
     if (!logoConfig.application) logoConfig.application = 'Direct';
    }

    if (logoConfig.position && logoConfig.size) {
     // Extract original logo type
     let originalLogoType = logoValue;
     if (logoValue.includes('-')) {
      const parts = logoValue.split('-');
      originalLogoType = parts.length >= 2 ? `${parts[0]} ${parts[1]}` : logoValue;
     }

     // Check if this logo type requires mold charge
     const requiresMoldCharge = originalLogoType.toLowerCase().includes('rubber patch') ||
                              originalLogoType.toLowerCase().includes('leather patch');

     if (requiresMoldCharge) {
      const size = logoConfig.size || 'Medium';
      const moldChargeType = `${size} Mold Charge`;

      const moldPricing = pricingData.find((p: any) =>
       p.type === 'Mold' &&
       p.Name.toLowerCase() === moldChargeType.toLowerCase()
      );

      if (moldPricing) {
       const moldCharge = moldPricing.price48; // Mold charge is fixed regardless of quantity
       totalCost += moldCharge;
      }
     }
    }
   }
  }

  console.log('🧾 Order total calculated successfully:', totalCost);
  return totalCost;
 } catch (error) {
  console.error('🧾 Error calculating order total:', error);
  return 0;
 }
}

// Helper function for logo cost calculation (same as /api/calculate-cost)
async function calculateLogoSetupCost(
 logoValue: string,
 logoConfig: any,
 pricingData: any[],
 totalQuantity: number
): Promise<{ cost: number; unitPrice: number; details: string }> {
 let cost = 0;
 let unitPrice = 0;
 let details = '';
 const size = logoConfig.size || 'Medium';

 // Import the same function used in /api/calculate-cost
 const { getPriceForQuantityFromCSV } = await import('@/lib/pricing-server');

 // Handle different logo types with specific logic (same as /api/calculate-cost)
 if (logoValue.toLowerCase() === '3d embroidery') {
  // For 3D Embroidery: Size Embroidery + 3D Embroidery base cost
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
  const logoTypeMapping: Record<string, string> = {
   'rubber patch': 'Rubber Patch',
   'rubber-patch': 'Rubber Patch',
   'leather patch': 'Leather Patch',
   'leather-patch': 'Leather Patch',
  };

  const mappedLogoType = logoTypeMapping[logoValue.toLowerCase()] || logoValue;
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

export async function GET(
 request: NextRequest,
 { params }: { params: Promise<{ id: string }> }
) {
 try {
  const { id } = await params;

  // Fetch order with graceful database failure handling
  let order = null;
  try {
   const { data, error } = await supabaseAdmin
    .from('Order')
    .select('*')
    .eq('id', id)
    .single();
   
   if (error) {
    console.error('Supabase fetch error:', error);
    if (error.code === 'PGRST116') {
     return NextResponse.json(
      { error: 'Order not found' },
      { status: 404 }
     );
    }
    throw error;
   }
   
   order = data;

   // Calculate order total for consistency with checkout success page
   const orderTotal = await calculateOrderTotal(order);
   
   // Transform order to match expected structure with calculated total
   const transformedOrder = {
    id: order.id,
    productName: order.productName,
    status: order.status,
    orderSource: order.orderSource,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    customerInfo: order.customerInfo as any,
    orderTotal: orderTotal, // Include calculated total
    userId: order.userId,
    userEmail: order.userEmail,
    orderType: order.orderType,
    selectedColors: order.selectedColors as any,
    selectedOptions: order.selectedOptions as any,
    multiSelectOptions: order.multiSelectOptions as any,
    logoSetupSelections: order.logoSetupSelections as any,
    additionalInstructions: order.additionalInstructions || order.additionalInstruction || null,
    trackingNumber: order.trackingNumber,
    shipmentId: order.shipmentId,
   };

   return NextResponse.json({ order: transformedOrder });

  } catch (dbError) {
   console.error('Database error when fetching order:', dbError);
   
   return NextResponse.json(
    { error: 'Order temporarily unavailable due to database maintenance' },
    { status: 503 }
   );
  }
 } catch (error) {
  console.error('Error fetching order:', error);
  return NextResponse.json(
   { error: 'Failed to fetch order' },
   { status: 500 }
  );
 }
}

export async function PATCH(
 request: NextRequest,
 { params }: { params: Promise<{ id: string }> }
) {
 try {
  const { id } = await params;
  const updateData = await request.json();

  console.log('🔄 PATCH order update:', id, 'keys:', Object.keys(updateData));

  // Extract logo file for processing (not stored directly in database)
  const logoFile = updateData.logoFile;
  delete updateData.logoFile; // Remove from database update data

  // Remove fields that shouldn't be updated directly and whitelist allowed columns
  const allowedKeys = new Set([
   'status',
   'productName',
   'orderType',
   'orderSource',
   'trackingNumber',
   'selectedColors',
   'logoSetupSelections',
   'selectedOptions',
   'multiSelectOptions',
   'customerInfo',
   'uploadedLogoFiles',
   'additionalInstructions',
   'lastEditedBy',
   'priceTier',
   'costBreakdown',
  ]);

  const dataToUpdate: Record<string, any> = {};
  for (const [key, value] of Object.entries(updateData || {})) {
   if (key === 'id' || key === 'createdAt' || key === 'updatedAt') continue;
   if (!allowedKeys.has(key)) continue;
   if (value === undefined) continue;
   dataToUpdate[key] = value;
  }

  // Process logo file if provided
  let uploadedFile = null;
  if (logoFile) {
   console.log('📁 Processing logo file for order update:', logoFile.name);
   uploadedFile = await processLogoFile(logoFile, id, updateData.userId);
   
   // Add the uploaded file to the uploadedLogoFiles array
   if (uploadedFile) {
    const existingFiles = dataToUpdate.uploadedLogoFiles || [];
    dataToUpdate.uploadedLogoFiles = [...existingFiles, uploadedFile];
    console.log('✅ Logo file processed and added to order assets');
   }
  }

  // Check if status is being updated for email notification
  const statusChanged = dataToUpdate.status;
  let originalOrder = null;
  
  if (statusChanged) {
   const { data } = await supabaseAdmin
    .from('Order')
    .select('*')
    .eq('id', id)
    .single();
   originalOrder = data;
  }

  // Update order with graceful database failure handling
  let updatedOrder = null;
  try {
   const { data, error } = await supabaseAdmin
    .from('Order')
    .update(dataToUpdate)
    .eq('id', id)
    .select()
    .single();
   
   if (error) {
    console.error('Supabase update error:', error);
    if (error.code === 'PGRST116') {
     return NextResponse.json(
      { error: 'Order not found' },
      { status: 404 }
     );
    }
    throw error;
   }
   
   updatedOrder = data;

   // Send status update email if status changed and customer email exists
   if (statusChanged && originalOrder && updatedOrder.customerInfo && (updatedOrder.customerInfo as any).email) {
    const customerEmail = (updatedOrder.customerInfo as any).email;
    const customerName = (updatedOrder.customerInfo as any).name;
    
    try {
     const emailResult = await sendEmail({
      to: customerEmail,
      subject: `Order Status Update #${updatedOrder.id} - ${statusChanged} - US Custom Cap`,
      html: emailTemplates.orderStatus(updatedOrder, statusChanged as any, dataToUpdate.trackingNumber),
      from: process.env.FROM_EMAIL || 'noreply@uscustomcap.com'
     });

     console.log('📧 Order status email sent:', emailResult.success ? 'SUCCESS' : 'FAILED');
     if (!emailResult.success) {
      console.error('Email error:', emailResult.error);
     }
    } catch (emailError) {
     console.error('Failed to send order status email:', emailError);
    }
   }

   return NextResponse.json({
    message: 'Order updated successfully',
    order: updatedOrder,
   });

  } catch (dbError: any) {
   console.error('Database error when updating order:', dbError);
   
   return NextResponse.json(
    { error: 'Order temporarily unavailable due to database maintenance' },
    { status: 503 }
   );
  }
 } catch (error: any) {
  console.error('Error updating order:', error);
  
  return NextResponse.json(
   { error: 'Failed to update order' },
   { status: 500 }
  );
 }
}

export async function DELETE(
 request: NextRequest,
 { params }: { params: Promise<{ id: string }> }
) {
 try {
  const { id } = await params;

  // Delete order with graceful database failure handling
  try {
   const { error } = await supabaseAdmin
    .from('Order')
    .delete()
    .eq('id', id);
   
   if (error) {
    console.error('Supabase delete error:', error);
    if (error.code === 'PGRST116') {
     return NextResponse.json(
      { error: 'Order not found' },
      { status: 404 }
     );
    }
    throw error;
   }

   return NextResponse.json({
    message: 'Order deleted successfully',
   });

  } catch (dbError: any) {
   console.error('Database error when deleting order:', dbError);
   
   return NextResponse.json(
    { error: 'Order temporarily unavailable due to database maintenance' },
    { status: 503 }
   );
  }
 } catch (error: any) {
  console.error('Error deleting order:', error);
  
  return NextResponse.json(
   { error: 'Failed to delete order' },
   { status: 500 }
  );
 }
}