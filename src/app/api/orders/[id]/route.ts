import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
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

  // Create OrderAsset record
  const orderAsset = await prisma.orderAsset.create({
   data: {
    orderId: orderId,
    userId: userId || '', // Use provided userId or empty string for guests
    kind: 'LOGO', // Assume logo files are LOGO type
    position: logoFile.position || 'Front',
    bucket: 'order-assets',
    path: filePath,
    mimeType: logoFile.type,
    sizeBytes: logoFile.size,
    width: logoFile.width,
    height: logoFile.height,
   }
  });

  console.log('✅ Processed logo file:', fileName, 'for order:', orderId);
  return {
   url: supabaseAdmin.storage.from('order-assets').getPublicUrl(filePath).data.publicUrl,
   name: logoFile.name,
   size: logoFile.size,
   type: logoFile.type,
   assetId: orderAsset.id
  };
 } catch (error) {
  console.error('Failed to process logo file:', logoFile.name, error);
  return null;
 }
}

// Add function to calculate order total (imported from main orders route)
async function calculateOrderTotal(order: any): Promise<number> {
 try {
  // Import the cost calculation logic and pricing
  const { loadCustomizationPricing } = await import('@/lib/pricing-server');
  const { getBaseProductPricing } = await import('@/lib/pricing');
  
  // Get base product pricing using the order's actual pricing tier
  const orderPriceTier = order.selectedOptions?.priceTier || 'Tier 1';
  const baseProductPricing = getBaseProductPricing(orderPriceTier);

  // Load customization pricing
  const pricingData = await loadCustomizationPricing();

  // Calculate total units from selectedColors structure
  const totalUnits = order.selectedColors ? 
   Object.values(order.selectedColors).reduce((sum: number, colorData: any) => 
    sum + Object.values((colorData as any).sizes).reduce((colorSum: number, qty: any) => colorSum + (qty as number), 0), 0
   ) : 0;

  if (totalUnits === 0) return 0;

  let totalCost = 0;
  
  // Calculate base product cost
  let baseProductCost = 0;
  
  if (order.selectedColors) {
   Object.entries(order.selectedColors).forEach(([colorName, colorData]: [string, any]) => {
    const colorTotalQuantity = Object.values((colorData as any).sizes).reduce((sum: number, qty: any) => sum + (qty as number), 0);
    let unitPrice = baseProductPricing.price48;
    if (totalUnits >= 10000) unitPrice = baseProductPricing.price10000;
    else if (totalUnits >= 2880) unitPrice = baseProductPricing.price2880;
    else if (totalUnits >= 1152) unitPrice = baseProductPricing.price1152;
    else if (totalUnits >= 576) unitPrice = baseProductPricing.price576;
    else if (totalUnits >= 144) unitPrice = baseProductPricing.price144;
    
    baseProductCost += colorTotalQuantity * unitPrice;
   });
  }
  totalCost += baseProductCost;

  // Calculate logo setup costs
  const selectedLogoValues = order.multiSelectOptions?.['logo-setup'] || [];
  selectedLogoValues.forEach((logoValue: string) => {
   const logoConfig = order.logoSetupSelections?.[logoValue];
   if (logoConfig) {
    const pricingItem = pricingData.find((item: any) => item.name === logoValue);
    if (pricingItem) {
     let unitPrice = pricingItem.price48;
     if (totalUnits >= 10000) unitPrice = pricingItem.price10000;
     else if (totalUnits >= 2880) unitPrice = pricingItem.price2880;
     else if (totalUnits >= 1152) unitPrice = pricingItem.price1152;
     else if (totalUnits >= 576) unitPrice = pricingItem.price576;
     else if (totalUnits >= 144) unitPrice = pricingItem.price144;
     
     totalCost += totalUnits * unitPrice;
    }
   }
  });

  // Calculate accessories costs from multiSelectOptions
  const accessoriesOptions = ['accessories', 'closures', 'delivery'];
  accessoriesOptions.forEach(optionType => {
   const selectedValues = order.multiSelectOptions?.[optionType] || [];
   selectedValues.forEach((value: string) => {
    const pricingItem = pricingData.find((item: any) => item.name === value);
    if (pricingItem) {
     let unitPrice = pricingItem.price48;
     if (totalUnits >= 10000) unitPrice = pricingItem.price10000;
     else if (totalUnits >= 2880) unitPrice = pricingItem.price2880;
     else if (totalUnits >= 1152) unitPrice = pricingItem.price1152;
     else if (totalUnits >= 576) unitPrice = pricingItem.price576;
     else if (totalUnits >= 144) unitPrice = pricingItem.price144;
     
     totalCost += totalUnits * unitPrice;
    }
   });
  });

  // Calculate costs from selectedOptions (fabric-setup, delivery-type, etc.)
  if (order.selectedOptions) {
   // Handle fabric setup options
   const fabricSetup = order.selectedOptions['fabric-setup'];
   if (fabricSetup && fabricSetup !== 'None') {
    const pricingItem = pricingData.find((item: any) => item.name === fabricSetup);
    if (pricingItem) {
     let unitPrice = pricingItem.price48;
     if (totalUnits >= 10000) unitPrice = pricingItem.price10000;
     else if (totalUnits >= 2880) unitPrice = pricingItem.price2880;
     else if (totalUnits >= 1152) unitPrice = pricingItem.price1152;
     else if (totalUnits >= 576) unitPrice = pricingItem.price576;
     else if (totalUnits >= 144) unitPrice = pricingItem.price144;
     
     totalCost += totalUnits * unitPrice;
    }
   }

   // Handle delivery type options
   const deliveryType = order.selectedOptions['delivery-type'];
   if (deliveryType && deliveryType !== 'None') {
    const deliveryMapping = {
     'Regular': 'Regular Delivery',
     'Priority': 'Priority Delivery',
     'Express': 'Express Delivery'
    };
    const deliveryName = deliveryMapping[deliveryType as keyof typeof deliveryMapping] || deliveryType;
    const pricingItem = pricingData.find((item: any) => item.name === deliveryName);
    if (pricingItem) {
     let unitPrice = pricingItem.price48;
     if (totalUnits >= 10000) unitPrice = pricingItem.price10000;
     else if (totalUnits >= 2880) unitPrice = pricingItem.price2880;
     else if (totalUnits >= 1152) unitPrice = pricingItem.price1152;
     else if (totalUnits >= 576) unitPrice = pricingItem.price576;
     else if (totalUnits >= 144) unitPrice = pricingItem.price144;
     
     totalCost += totalUnits * unitPrice;
    }
   }

   // Handle other selectedOptions that might have pricing
   const additionalOptions = ['closure-type', 'structure', 'profile', 'bill-shape'];
   additionalOptions.forEach(optionKey => {
    const optionValue = order.selectedOptions[optionKey];
    if (optionValue && optionValue !== 'None') {
     const pricingItem = pricingData.find((item: any) => item.name === optionValue);
     if (pricingItem) {
      let unitPrice = pricingItem.price48;
      if (totalUnits >= 10000) unitPrice = pricingItem.price10000;
      else if (totalUnits >= 2880) unitPrice = pricingItem.price2880;
      else if (totalUnits >= 1152) unitPrice = pricingItem.price1152;
      else if (totalUnits >= 576) unitPrice = pricingItem.price576;
      else if (totalUnits >= 144) unitPrice = pricingItem.price144;
      
      totalCost += totalUnits * unitPrice;
     }
    }
   });
  }

  return totalCost;
 } catch (error) {
  console.error('Error calculating order total:', error);
  return 0;
 }
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
   order = await prisma.order.findUnique({
    where: { id },
   });

   if (!order) {
    return NextResponse.json(
     { error: 'Order not found' },
     { status: 404 }
    );
   }

   // Calculate order total for consistency with checkout success page
   const orderTotal = await calculateOrderTotal(order);
   
   // Transform order to match expected structure with calculated total
   const transformedOrder = {
    id: order.id,
    productName: order.productName,
    status: order.status,
    orderSource: order.orderSource,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
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
   originalOrder = await prisma.order.findUnique({ where: { id } });
  }

  // Update order with graceful database failure handling
  let updatedOrder = null;
  try {
   updatedOrder = await prisma.order.update({
    where: { id },
    data: dataToUpdate,
   });

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
   
   if (dbError.code === 'P2025') {
    return NextResponse.json(
     { error: 'Order not found' },
     { status: 404 }
    );
   }

   return NextResponse.json(
    { error: 'Order temporarily unavailable due to database maintenance' },
    { status: 503 }
   );
  }
 } catch (error: any) {
  console.error('Error updating order:', error);
  
  if (error.code === 'P2025') {
   return NextResponse.json(
    { error: 'Order not found' },
    { status: 404 }
   );
  }

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
   await prisma.order.delete({
    where: { id },
   });

   return NextResponse.json({
    message: 'Order deleted successfully',
   });

  } catch (dbError: any) {
   console.error('Database error when deleting order:', dbError);
   
   if (dbError.code === 'P2025') {
    return NextResponse.json(
     { error: 'Order not found' },
     { status: 404 }
    );
   }

   return NextResponse.json(
    { error: 'Order temporarily unavailable due to database maintenance' },
    { status: 503 }
   );
  }
 } catch (error: any) {
  console.error('Error deleting order:', error);
  
  if (error.code === 'P2025') {
   return NextResponse.json(
    { error: 'Order not found' },
    { status: 404 }
   );
  }

  return NextResponse.json(
   { error: 'Failed to delete order' },
   { status: 500 }
  );
 }
}