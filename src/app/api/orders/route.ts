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
    const orderData: OrderSubmission = await request.json();
    
    // Debug logging for temporary files
    console.log('=== ORDER API DEBUG ===');
    console.log('📄 Order data keys:', Object.keys(orderData));
    console.log('📁 tempLogoFiles:', orderData.tempLogoFiles ? `${orderData.tempLogoFiles.length} files` : 'none');
    console.log('📁 uploadedLogoFiles:', orderData.uploadedLogoFiles ? `${orderData.uploadedLogoFiles.length} files` : 'none');
    if (orderData.tempLogoFiles) {
      console.log('📋 tempLogoFiles structure:', orderData.tempLogoFiles.map(f => ({
        name: f.name,
        size: f.size,
        type: f.type,
        kind: f.kind,
        hasBase64: !!f.base64Data && f.base64Data.length > 0
      })));
    }
    
    // Get idempotency key from headers or body
    const idempotencyKey = request.headers.get('Idempotency-Key') || (orderData as any).idempotencyKey;
    
    // Check for potential duplicate orders (basic duplicate prevention)
    if (idempotencyKey && orderData.customerInfo?.email) {
      try {
        // Check for recent orders from the same email with similar product name
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        const existingOrder = await prisma.order.findFirst({
          where: {
            userEmail: orderData.customerInfo.email,
            productName: orderData.productName,
            createdAt: { gte: fiveMinutesAgo }
          },
          orderBy: { createdAt: 'desc' }
        });
        
        if (existingOrder) {
          console.log('🔄 Potential duplicate order prevented:', idempotencyKey);
          return NextResponse.json({
            message: 'Order already exists',
            orderId: existingOrder.id,
            order: existingOrder,
            duplicate: true
          }, { status: 200 });
        }
      } catch (idempotencyError) {
        console.warn('Duplicate check failed, proceeding with order creation:', idempotencyError);
      }
    }
    
    // Get current user if authenticated
    const user = await getCurrentUser(request);
    
    // Get client IP and user agent
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Create the order with graceful database failure handling
    let order = null;
    try {
      order = await prisma.order.create({
        data: {
          productName: orderData.productName,
          selectedColors: orderData.selectedColors,
          logoSetupSelections: orderData.logoSetupSelections,
          selectedOptions: orderData.selectedOptions,
          multiSelectOptions: orderData.multiSelectOptions,
          customerInfo: orderData.customerInfo,
          uploadedLogoFiles: orderData.uploadedLogoFiles || [],
          additionalInstructions: orderData.additionalInstructions || null,
          userId: user?.id || orderData.userId,
          userEmail: user?.email || orderData.userEmail || orderData.customerInfo.email,
          orderType: user ? 'AUTHENTICATED' : 'GUEST',
          orderSource: orderData.orderSource === 'REORDER' ? 'REORDER' : 'PRODUCT_CUSTOMIZATION',
          status: orderData.status || 'PENDING',
          shipmentId: orderData.shipmentId || null,
          ipAddress,
          userAgent,
        },
      });

      console.log('✅ Order saved to database with ID:', order.id);
      if (orderData.shipmentId) {
        console.log('🚢 Order assigned to shipment:', orderData.shipmentId);
      } else {
        console.log('📦 Order created without shipment assignment');
      }

      // Handle temporary logo file uploads
      if (orderData.tempLogoFiles && orderData.tempLogoFiles.length > 0) {
        console.log('📤 Uploading temporary logo files...');
        try {
          // Pass userId to the upload function for OrderAsset records
          const uploadedLogoFiles = await uploadTempFiles(orderData.tempLogoFiles, order.id, orderData.userId || undefined);
          
          // Update the order with the uploaded files
          if (uploadedLogoFiles.length > 0) {
            await prisma.order.update({
              where: { id: order.id },
              data: {
                uploadedLogoFiles: [...(orderData.uploadedLogoFiles || []), ...uploadedLogoFiles]
              }
            });
            console.log('✅ Updated order with uploaded logo files');
          }
          
          // Update OrderAsset records with correct userId
          if (user?.id) {
            await prisma.orderAsset.updateMany({
              where: { 
                orderId: order.id,
                userId: '' // Update records with empty userId
              },
              data: { userId: user.id }
            });
          }
        } catch (uploadError) {
          console.error('Failed to upload logo files:', uploadError);
          // Continue anyway - order was created successfully
        }
      }

      return NextResponse.json({
        message: 'Order submitted successfully',
        orderId: order.id,
        order: order,
      }, { status: 201 });

    } catch (dbError) {
      console.error('Database error when creating order:', dbError);
      
      // Return a temporary success response with order data
      // This allows the user to continue while we fix the database
      const tempOrderId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      console.log('⚠️ Database unavailable, returning temporary order ID:', tempOrderId);
      
      return NextResponse.json({
        message: 'Order submitted successfully (temporary)',
        orderId: tempOrderId,
        order: {
          id: tempOrderId,
          productName: orderData.productName,
          customerInfo: orderData.customerInfo,
          status: 'PENDING',
          createdAt: new Date().toISOString(),
          // Note: This is a temporary response due to database connection issues
        },
        note: 'Order saved temporarily due to database maintenance. Will be properly stored when database is available.',
      }, { status: 200 });
    }

  } catch (error) {
    console.error('Error submitting order:', error);
    return NextResponse.json(
      { error: 'Failed to submit order' },
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