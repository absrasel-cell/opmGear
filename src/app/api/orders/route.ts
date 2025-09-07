import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import { sendEmail } from '@/lib/resend';
import { emailTemplates } from '@/lib/email/templates';

interface OrderSubmission {
 productName: string;
 selectedColors: Record<string, { sizes: Record<string, number>; customName?: string; isCustom?: boolean }>;
 logoSetupSelections: Record<string, {
  position?: string;
  size?: string;
  application?: string;
 }>;
 selectedOptions: Record<string, string>;
 multiSelectOptions: Record<string, string[]>;
 customerInfo: {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  address?: {
   street: string;
   city: string;
   state: string;
   zipCode: string;
   country: string;
  };
 };
 uploadedLogoFiles?: Array<{url: string, name: string, size: number, type: string}>;
 tempLogoFiles?: Array<{id: string, name: string, size: number, type: string, kind: string, position?: string, base64Data: string, preview?: string}>;
 additionalInstructions?: string;
 userId?: string | null;
 userEmail?: string;
 orderType?: 'AUTHENTICATED' | 'GUEST';
 orderSource?: string;
 status?: string;
 shipmentId?: string | null;
 ipAddress?: string;
 userAgent?: string;
 priceTier?: string; // ✅ Added product tier for proper pricing
}

// Helper function to upload base64 files to Supabase
async function uploadTempFiles(tempFiles: Array<{id: string, name: string, size: number, type: string, kind: string, position?: string, base64Data: string, preview?: string}>, orderId: string, userId?: string) {
 if (!tempFiles || tempFiles.length === 0) {
  return [];
 }

 const uploadedFiles = [];
 
 for (const tempFile of tempFiles) {
  try {
   // Convert base64 to buffer
   const base64Data = tempFile.base64Data.split(',')[1]; // Remove data:image/jpeg;base64, prefix
   const fileBuffer = Buffer.from(base64Data, 'base64');
   
   // Generate unique filename
   const fileName = `${uuidv4()}-${tempFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
   const filePath = `${orderId}/${fileName}`;

   // Upload to Supabase storage
   const { error } = await supabaseAdmin.storage
    .from('order-assets')
    .upload(filePath, fileBuffer, {
     contentType: tempFile.type,
     upsert: false
    });

   if (error) {
    console.error('Supabase upload error:', error);
    continue; // Skip this file and continue with others
   }

   // Get public URL
   const { data: urlData } = supabaseAdmin.storage
    .from('order-assets')
    .getPublicUrl(filePath);

   // TODO: Create OrderAsset record in Supabase
   // Also create a record in OrderAsset table
   try {
    // await prisma.orderAsset.create({
    //  data: {
    //   orderId: orderId,
    //   userId: userId || '', // Use provided userId or empty string for guests
    //   kind: tempFile.kind as 'LOGO' | 'ACCESSORY' | 'OTHER',
    //   position: tempFile.position,
    //   bucket: 'order-assets',
    //   path: filePath,
    //   mimeType: tempFile.type,
    //   sizeBytes: tempFile.size,
    //  }
    // });
    console.log('OrderAsset creation temporarily disabled - TODO: implement with Supabase');
   } catch (dbError) {
    console.error('Failed to create OrderAsset record:', dbError);
    // Continue anyway, the file is uploaded
   }

   uploadedFiles.push({
    url: urlData.publicUrl,
    name: tempFile.name,
    size: tempFile.size,
    type: tempFile.type
   });
   
   console.log('✅ Uploaded file:', tempFile.name, 'to', filePath);
  } catch (error) {
   console.error('Failed to upload file:', tempFile.name, error);
   // Continue with other files
  }
 }

 return uploadedFiles;
}

async function getCurrentUser(request: NextRequest) {
 try {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('sb-access-token')?.value;

  if (!accessToken) return null;

  const supabase = createClient(
   process.env.NEXT_PUBLIC_SUPABASE_URL!,
   process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
   {
    global: {
     headers: {
      Authorization: `Bearer ${accessToken}`,
     },
    },
   }
  );

  const { data: { user } } = await supabase.auth.getUser();
  return user;
 } catch (error) {
  return null;
 }
}

// Add function to calculate order total
async function calculateOrderTotal(order: any): Promise<number> {
 try {
  // Temporarily disabled - TODO: implement with Supabase
  console.log('Order total calculation temporarily disabled');
  return 0;
  
  // TODO: Restore when Prisma dependency is resolved
  // const { loadCustomizationPricing } = await import('@/lib/pricing-server');
  // const { getBaseProductPricing } = await import('@/lib/pricing');
  // 
  // // Get base product pricing using the order's actual pricing tier
  // const orderPriceTier = order.selectedOptions?.priceTier || 'Tier 2';
  // const baseProductPricing = getBaseProductPricing(orderPriceTier);

  // // Load customization pricing
  // const pricingData = await loadCustomizationPricing();

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

export async function POST(request: NextRequest) {
 try {
  const rawOrderData: OrderSubmission = await request.json();
  
  // TODO: Restore when Prisma dependency is resolved
  // const { 
  //  OrderRecordingSystem, 
  //  convertCheckoutToStandardOrder
  // } = await import('@/lib/order-recording-system');
  
  console.log('=== STREAMLINED ORDER API ===');
  console.log('📄 Raw order data keys:', Object.keys(rawOrderData));
  console.log('📁 tempLogoFiles:', rawOrderData.tempLogoFiles ? `${rawOrderData.tempLogoFiles.length} files` : 'none');
  console.log('📁 uploadedLogoFiles:', rawOrderData.uploadedLogoFiles ? `${rawOrderData.uploadedLogoFiles.length} files` : 'none');
  
  // Get current user if authenticated
  const user = await getCurrentUser(request);
  
  // Get client IP and user agent
  const ipAddress = request.headers.get('x-forwarded-for') || 
           request.headers.get('x-real-ip') || 
           'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';
  
  // Temporarily disabled - TODO: implement with Supabase
  console.log('Order recording system temporarily disabled - TODO: implement with Supabase');
  
  // Generate a temporary order ID
  const tempOrderId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  // Create a basic order structure for response
  const result = {
   success: true,
   orderId: tempOrderId,
   order: {
    id: tempOrderId,
    productName: rawOrderData.productName,
    status: 'PENDING',
    customerInfo: rawOrderData.customerInfo,
    selectedColors: rawOrderData.selectedColors,
    selectedOptions: rawOrderData.selectedOptions,
    multiSelectOptions: rawOrderData.multiSelectOptions,
    logoSetupSelections: rawOrderData.logoSetupSelections,
    additionalInstructions: rawOrderData.additionalInstructions,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
   },
   temporaryId: true,
   warnings: ['Order saved temporarily - database unavailable']
  };
  
  // TODO: Restore when dependencies are resolved
  // const standardOrderData = convertCheckoutToStandardOrder({
  //  ...rawOrderData,
  //  userId: user?.id || rawOrderData.userId,
  //  userEmail: user?.email || rawOrderData.userEmail || rawOrderData.customerInfo.email,
  //  orderType: user ? 'AUTHENTICATED' : 'GUEST',
  //  orderSource: rawOrderData.orderSource || 'PRODUCT_CUSTOMIZATION',
  //  status: rawOrderData.status || 'PENDING',
  //  ipAddress,
  //  userAgent,
  //  paymentProcessed: true,
  //  processedAt: new Date().toISOString()
  // });
  // const result = await OrderRecordingSystem.recordOrder(standardOrderData, recordingOptions);
  
  if (!result.success) {
   console.error('❌ Order recording failed:', result.errors);
   return NextResponse.json({
    error: 'Failed to submit order',
    details: result.errors
   }, { status: 500 });
  }
  
  // Log success and warnings
  console.log('✅ Order recorded successfully:', result.orderId);
  if (result.warnings && result.warnings.length > 0) {
   console.warn('⚠️ Order recording warnings:', result.warnings);
  }
  if (result.isDuplicate) {
   console.log('🔄 Duplicate order handled:', result.orderId);
  }
  if (result.temporaryId) {
   console.log('⚠️ Temporary order ID issued due to database issues:', result.orderId);
  }
  
  // N8N webhook temporarily disabled
  console.log('N8N webhook temporarily disabled - TODO: restore when database is available');

  // Send order confirmation email if successful and not temporary
  if (result.success && !result.temporaryId && rawOrderData.customerInfo.email) {
   try {
    const emailResult = await sendEmail({
     to: rawOrderData.customerInfo.email,
     subject: `Order Confirmation #${result.orderId} - US Custom Cap`,
     html: emailTemplates.orderStatus(result.order, 'PENDING'),
     from: process.env.FROM_EMAIL || 'noreply@uscustomcap.com'
    });

    console.log('📧 Order confirmation email sent:', emailResult.success ? 'SUCCESS' : 'FAILED');
    if (!emailResult.success) {
     console.error('Email error:', emailResult.error);
    }
   } catch (emailError) {
    console.error('Failed to send order confirmation email:', emailError);
   }
  }

  // Return standardized response
  const response: any = {
   message: result.temporaryId ? 
    'Order submitted successfully (temporary)' : 
    'Order submitted successfully',
   orderId: result.orderId,
   order: result.order,
  };
  
  // Add additional info
  if (result.isDuplicate) response.duplicate = true;
  if (result.temporaryId) response.note = 'Order saved temporarily due to database maintenance. Will be properly stored when database is available.';
  if (result.invoice) response.invoice = result.invoice;
  if (result.shipmentAssignment) response.shipmentAssignment = result.shipmentAssignment;
  if (result.warnings && result.warnings.length > 0) response.warnings = result.warnings;
  
  return NextResponse.json(response, { 
   status: result.temporaryId ? 200 : 201 
  });

 } catch (error) {
  console.error('💥 Order API error:', error);
  return NextResponse.json(
   { error: 'Failed to submit order', details: error instanceof Error ? error.message : 'Unknown error' },
   { status: 500 }
  );
 }
}

export async function GET(request: NextRequest) {
 try {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const email = searchParams.get('email');
  const requestedLimit = searchParams.get('limit');
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '25');
  const all = searchParams.get('all') === 'true';
  const status = searchParams.get('status');
  const search = searchParams.get('search');

  // Build query filters
  const where: any = {};
  
  // User filters
  if (userId && email) {
   where.OR = [
    { userId: userId },
    { userEmail: email }
   ];
  } else if (userId) {
   where.userId = userId;
  } else if (email) {
   where.userEmail = email;
  }

  // Status filter
  if (status && status !== 'all') {
   if (status === 'assigned') {
    where.shipmentId = { not: null };
   } else if (status === 'unassigned') {
    where.shipmentId = null;
   } else {
    where.status = status.toUpperCase();
   }
  }

  // Search filter
  if (search) {
   const searchLower = search.toLowerCase();
   where.OR = [
    ...(where.OR || []),
    { id: { contains: searchLower, mode: 'insensitive' } },
    { productName: { contains: searchLower, mode: 'insensitive' } },
    { userEmail: { contains: searchLower, mode: 'insensitive' } },
    {
     customerInfo: {
      path: ['name'],
      string_contains: searchLower
     }
    }
   ].filter(Boolean);
  }

  // Pagination logic
  let take: number | undefined;
  let skip = 0;

  if (all) {
   // Legacy support for 'all=true' - no pagination, but with reasonable limit
   take = 1000; // Reasonable max for dashboard loading
  } else if (requestedLimit) {
   // Legacy support for limit parameter
   take = parseInt(requestedLimit);
  } else {
   // Modern pagination
   take = pageSize;
   skip = (page - 1) * pageSize;
  }

  // TODO: Fetch orders from Supabase database
  let orders = [];
  let totalCount = 0;
  
  try {
   console.log('Orders API temporarily disabled - TODO: implement with Supabase');
   // Return empty results for now
   orders = [];
   totalCount = 0;

   // Order calculator temporarily disabled
   console.log('Order calculator temporarily disabled - TODO: implement with Supabase');
   
   // Return empty transformed orders since we have no orders to transform
   const transformedOrders: any[] = [];

   const response: any = {
    orders: transformedOrders,
    count: transformedOrders.length,
   };

   // Add pagination metadata
   if (!all) {
    response.pagination = {
     page,
     pageSize,
     total: totalCount,
     pages: Math.ceil(totalCount / pageSize),
     hasNext: page < Math.ceil(totalCount / pageSize),
     hasPrev: page > 1
    };
   }

   return NextResponse.json(response);

  } catch (dbError) {
   console.error('Database error when fetching orders:', dbError);
   
   // Return empty orders list when database is unavailable
   return NextResponse.json({
    orders: [],
    count: 0,
    pagination: all ? undefined : {
     page,
     pageSize,
     total: 0,
     pages: 0,
     hasNext: false,
     hasPrev: false
    },
    note: 'Orders temporarily unavailable due to database maintenance.',
   }, { status: 200 });
  }

 } catch (error) {
  console.error('Error in orders GET endpoint:', error);
  return NextResponse.json(
   { error: 'Failed to fetch orders' },
   { status: 500 }
  );
 }
}