import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';

interface OrderSubmission {
  productName: string;
  selectedColors: Record<string, { sizes: Record<string, number> }>;
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

      // Also create a record in OrderAsset table
      try {
        await prisma.orderAsset.create({
          data: {
            orderId: orderId,
            userId: userId || '', // Use provided userId or empty string for guests
            kind: tempFile.kind as 'LOGO' | 'ACCESSORY' | 'OTHER',
            position: tempFile.position,
            bucket: 'order-assets',
            path: filePath,
            mimeType: tempFile.type,
            sizeBytes: tempFile.size,
          }
        });
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
    // Import the cost calculation logic and pricing
    const { loadCustomizationPricing } = await import('@/lib/pricing-server');
    const { getBaseProductPricing } = await import('@/lib/pricing');
    
    // Get base product pricing (using Tier 2 for consistency with cart/checkout)
    const baseProductPricing = getBaseProductPricing('Tier 2');

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

    // Calculate accessories costs
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

    return totalCost;
  } catch (error) {
    console.error('Error calculating order total:', error);
    return 0;
  }
}

export async function POST(request: NextRequest) {
  try {
    const rawOrderData: OrderSubmission = await request.json();
    
    // Import the streamlined order recording system
    const { 
      OrderRecordingSystem, 
      convertCheckoutToStandardOrder
    } = await import('@/lib/order-recording-system');
    
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
    
    // Convert raw order data to standard format
    const standardOrderData = convertCheckoutToStandardOrder({
      ...rawOrderData,
      userId: user?.id || rawOrderData.userId,
      userEmail: user?.email || rawOrderData.userEmail || rawOrderData.customerInfo.email,
      orderType: user ? 'AUTHENTICATED' : 'GUEST',
      orderSource: rawOrderData.orderSource || 'PRODUCT_CUSTOMIZATION',
      status: rawOrderData.status || 'PENDING',
      ipAddress,
      userAgent,
      paymentProcessed: true, // Orders from checkout are payment processed
      processedAt: new Date().toISOString()
    });
    
    // Set up recording options
    const recordingOptions = {
      idempotencyKey: request.headers.get('Idempotency-Key') || (rawOrderData as any).idempotencyKey,
      skipDuplicateCheck: false,
      autoCalculateCosts: true,
      createInvoice: false, // Can be enabled later
      notifyCustomer: false, // Can be enabled later
      assignToShipment: !!standardOrderData.shipmentId,
      updateInventory: false // Can be enabled later
    };
    
    console.log('🎯 Recording options:', recordingOptions);
    
    // Record the order using the streamlined system
    const result = await OrderRecordingSystem.recordOrder(standardOrderData, recordingOptions);
    
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
    const limit = searchParams.get('limit');

    // Build query filters
    const where: any = {};
    if (userId && email) {
      // If both userId and email are provided, use OR condition to get all orders for the user
      where.OR = [
        { userId: userId },
        { userEmail: email }
      ];
    } else if (userId) {
      where.userId = userId;
    } else if (email) {
      where.userEmail = email;
    }

    // Fetch orders with graceful database failure handling
    let orders = [];
    try {
      orders = await prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit ? parseInt(limit) : undefined,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          shipment: {
            select: {
              id: true,
              buildNumber: true,
              shippingMethod: true,
              status: true,
              estimatedDeparture: true,
              estimatedDelivery: true,
              createdAt: true,
            },
          },
        },
      });

      // Transform orders to match the expected structure and calculate totals
      const transformedOrders = await Promise.all(orders.map(async (order) => {
        const orderTotal = await calculateOrderTotal(order);
        
        return {
          id: order.id,
          productName: order.productName,
          status: order.status,
          orderSource: order.orderSource,
          isDraft: false, // Add default value
          createdAt: order.createdAt.toISOString(),
          updatedAt: order.updatedAt.toISOString(),
          customerInfo: order.customerInfo as any,
          orderTotal: orderTotal, // Calculate actual total
          itemTotal: orderTotal, // Use same value for itemTotal
          userId: order.userId,
          userEmail: order.userEmail,
          orderType: order.orderType,
          selectedColors: order.selectedColors as any,
          selectedOptions: order.selectedOptions as any, // Single-select options
          multiSelectOptions: order.multiSelectOptions as any, // Multi-select options
          logoSetupSelections: order.logoSetupSelections as any, // Logo configuration details
          additionalInstructions: order.additionalInstructions || order.additionalInstruction || null, // Include additional instructions from both fields
          paymentProcessed: false, // Add default value
          trackingNumber: order.trackingNumber,
          shipmentId: order.shipmentId,
          shipment: order.shipment ? {
            id: order.shipment.id,
            buildNumber: order.shipment.buildNumber,
            shippingMethod: order.shipment.shippingMethod,
            status: order.shipment.status,
            estimatedDeparture: order.shipment.estimatedDeparture?.toISOString(),
            estimatedDelivery: order.shipment.estimatedDelivery?.toISOString(),
            createdAt: order.shipment.createdAt.toISOString(),
          } : null,
        };
      }));

      return NextResponse.json({
        orders: transformedOrders,
        count: transformedOrders.length,
      });

    } catch (dbError) {
      console.error('Database error when fetching orders:', dbError);
      
      // Return empty orders list when database is unavailable
      return NextResponse.json({
        orders: [],
        count: 0,
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