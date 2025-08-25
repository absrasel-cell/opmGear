import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Add function to calculate order total (imported from main orders route)
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
    ]);

    const dataToUpdate: Record<string, any> = {};
    for (const [key, value] of Object.entries(updateData || {})) {
      if (key === 'id' || key === 'createdAt' || key === 'updatedAt') continue;
      if (!allowedKeys.has(key)) continue;
      if (value === undefined) continue;
      dataToUpdate[key] = value;
    }

    // Update order with graceful database failure handling
    let updatedOrder = null;
    try {
      updatedOrder = await prisma.order.update({
        where: { id },
        data: dataToUpdate,
      });

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