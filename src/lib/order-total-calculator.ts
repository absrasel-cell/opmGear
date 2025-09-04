/**
 * High-performance order total calculator with caching and hash-based change detection
 * Optimized for dashboard performance by pre-calculating and caching order totals
 */

import crypto from 'crypto';
import prisma from '@/lib/prisma';

interface OrderData {
  id: string;
  selectedColors: any;
  selectedOptions: any;
  multiSelectOptions: any;
  logoSetupSelections: any;
  calculatedTotal?: number;
  totalUnits?: number;
  lastCalculatedAt?: Date;
  totalCalculationHash?: string;
}

interface CostBreakdown {
  baseProductCost: number;
  logoCosts: number;
  accessoryCosts: number;
  deliveryCosts: number;
  totalCost: number;
  totalUnits: number;
}

/**
 * Creates a hash of order data to detect if recalculation is needed
 */
function createOrderDataHash(order: OrderData): string {
  const hashData = {
    selectedColors: order.selectedColors,
    selectedOptions: order.selectedOptions,
    multiSelectOptions: order.multiSelectOptions,
    logoSetupSelections: order.logoSetupSelections
  };
  
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(hashData))
    .digest('hex')
    .substring(0, 16); // Use first 16 chars for performance
}

/**
 * Fast order total calculation using existing logic
 */
async function calculateOrderTotal(order: OrderData): Promise<CostBreakdown> {
  try {
    // Import the cost calculation logic and pricing
    const { loadCustomizationPricing } = await import('@/lib/pricing-server');
    const { getBaseProductPricing } = await import('@/lib/pricing');
    
    // Get base product pricing using the order's actual pricing tier
    const orderPriceTier = order.selectedOptions?.priceTier || 'Tier 2';
    const baseProductPricing = getBaseProductPricing(orderPriceTier);

    // Load customization pricing
    const pricingData = await loadCustomizationPricing();

    // Calculate total units from selectedColors structure
    const totalUnits = order.selectedColors ? 
      Object.values(order.selectedColors).reduce((sum: number, colorData: any) => 
        sum + Object.values((colorData as any).sizes).reduce((colorSum: number, qty: any) => colorSum + (qty as number), 0), 0
      ) : 0;

    if (totalUnits === 0) {
      return {
        baseProductCost: 0,
        logoCosts: 0,
        accessoryCosts: 0,
        deliveryCosts: 0,
        totalCost: 0,
        totalUnits: 0
      };
    }

    let baseProductCost = 0;
    let logoCosts = 0;
    let accessoryCosts = 0;
    let deliveryCosts = 0;
    
    // Calculate base product cost
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
          
          logoCosts += totalUnits * unitPrice;
        }
      }
    });

    // Calculate accessories costs from multiSelectOptions
    const accessoriesOptions = ['accessories', 'closures'];
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
          
          accessoryCosts += totalUnits * unitPrice;
        }
      });
    });

    // Calculate delivery costs from multiSelectOptions
    const deliveryOptions = ['delivery'];
    deliveryOptions.forEach(optionType => {
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
          
          deliveryCosts += totalUnits * unitPrice;
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
          
          accessoryCosts += totalUnits * unitPrice;
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
          
          deliveryCosts += totalUnits * unitPrice;
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
            
            accessoryCosts += totalUnits * unitPrice;
          }
        }
      });
    }

    const totalCost = baseProductCost + logoCosts + accessoryCosts + deliveryCosts;

    return {
      baseProductCost,
      logoCosts,
      accessoryCosts,
      deliveryCosts,
      totalCost,
      totalUnits
    };
  } catch (error) {
    console.error('Error calculating order total:', error);
    return {
      baseProductCost: 0,
      logoCosts: 0,
      accessoryCosts: 0,
      deliveryCosts: 0,
      totalCost: 0,
      totalUnits: 0
    };
  }
}

/**
 * Checks if an order needs recalculation based on data hash
 */
function needsRecalculation(order: OrderData): boolean {
  if (!order.calculatedTotal || !order.totalCalculationHash) {
    return true;
  }
  
  const currentHash = createOrderDataHash(order);
  return currentHash !== order.totalCalculationHash;
}

/**
 * Pre-calculates and caches order total in database
 */
export async function precalculateOrderTotal(orderId: string): Promise<CostBreakdown | null> {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        selectedColors: true,
        selectedOptions: true,
        multiSelectOptions: true,
        logoSetupSelections: true,
        calculatedTotal: true,
        totalUnits: true,
        lastCalculatedAt: true,
        totalCalculationHash: true
      }
    });

    if (!order) {
      console.warn(`Order ${orderId} not found for precalculation`);
      return null;
    }

    // Check if recalculation is needed
    if (!needsRecalculation(order)) {
      console.log(`Order ${orderId} calculation is up-to-date`);
      return {
        baseProductCost: 0, // We don't store breakdown, just total
        logoCosts: 0,
        accessoryCosts: 0,
        deliveryCosts: 0,
        totalCost: Number(order.calculatedTotal) || 0,
        totalUnits: order.totalUnits || 0
      };
    }

    console.log(`Calculating total for order ${orderId}...`);
    const breakdown = await calculateOrderTotal(order);
    const currentHash = createOrderDataHash(order);

    // Update the order with calculated values
    await prisma.order.update({
      where: { id: orderId },
      data: {
        calculatedTotal: breakdown.totalCost,
        totalUnits: breakdown.totalUnits,
        lastCalculatedAt: new Date(),
        totalCalculationHash: currentHash
      }
    });

    console.log(`✅ Order ${orderId} total calculated: $${breakdown.totalCost.toFixed(2)} (${breakdown.totalUnits} units)`);
    return breakdown;
  } catch (error) {
    console.error(`Error precalculating order ${orderId}:`, error);
    return null;
  }
}

/**
 * Batch pre-calculate order totals for multiple orders
 */
export async function batchPrecalculateOrderTotals(orderIds: string[]): Promise<void> {
  console.log(`Starting batch calculation for ${orderIds.length} orders...`);
  
  const promises = orderIds.map(orderId => precalculateOrderTotal(orderId));
  const results = await Promise.allSettled(promises);
  
  const successful = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;
  
  console.log(`Batch calculation complete: ${successful} successful, ${failed} failed`);
  
  if (failed > 0) {
    const errors = results
      .filter(r => r.status === 'rejected')
      .map(r => (r as any).reason);
    console.error('Batch calculation errors:', errors);
  }
}

/**
 * Background job to recalculate all order totals
 */
export async function recalculateAllOrderTotals(): Promise<void> {
  try {
    console.log('🔄 Starting background recalculation of all order totals...');
    
    // Get all order IDs that need calculation (in batches to avoid memory issues)
    const batchSize = 100;
    let offset = 0;
    let processedCount = 0;
    
    while (true) {
      const orders = await prisma.order.findMany({
        select: { id: true },
        orderBy: { createdAt: 'desc' },
        take: batchSize,
        skip: offset
      });
      
      if (orders.length === 0) break;
      
      const orderIds = orders.map(o => o.id);
      await batchPrecalculateOrderTotals(orderIds);
      
      processedCount += orders.length;
      offset += batchSize;
      
      console.log(`✅ Processed ${processedCount} orders so far...`);
      
      // Small delay to prevent overwhelming the database
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`🎉 Background recalculation complete! Processed ${processedCount} orders total.`);
  } catch (error) {
    console.error('❌ Background recalculation failed:', error);
  }
}

/**
 * Get cached order total (fast lookup)
 */
export async function getCachedOrderTotal(orderId: string): Promise<number> {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { 
        calculatedTotal: true,
        totalCalculationHash: true,
        selectedColors: true,
        selectedOptions: true,
        multiSelectOptions: true,
        logoSetupSelections: true
      }
    });

    if (!order) return 0;

    // If we have a cached total and it's still valid, return it
    if (order.calculatedTotal && !needsRecalculation(order)) {
      return Number(order.calculatedTotal);
    }

    // Otherwise, trigger recalculation
    const breakdown = await precalculateOrderTotal(orderId);
    return breakdown?.totalCost || 0;
  } catch (error) {
    console.error(`Error getting cached total for order ${orderId}:`, error);
    return 0;
  }
}

/**
 * Invalidate order calculation cache (call when order is updated)
 */
export async function invalidateOrderCalculation(orderId: string): Promise<void> {
  try {
    await prisma.order.update({
      where: { id: orderId },
      data: {
        totalCalculationHash: null,
        lastCalculatedAt: null
      }
    });
    console.log(`Order ${orderId} calculation cache invalidated`);
  } catch (error) {
    console.error(`Error invalidating cache for order ${orderId}:`, error);
  }
}