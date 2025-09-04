import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface ShipmentWithOrders {
  id: string;
  buildNumber: string;
  shippingMethod: string;
  estimatedDeparture: Date | null;
  estimatedDelivery: Date | null;
  status: string;
  notes: string | null;
  createdAt: Date;
  orders: Array<{
    id: string;
    productName: string;
    customerInfo: any;
    status: string;
    totalUnits?: number;
    calculatedTotal?: number;
  }>;
}

interface ShippingMethodInfo {
  method: string;
  displayName: string;
  estimatedDays: string;
  costMultiplier: number;
  description: string;
}

// Shipping method information
export const SHIPPING_METHODS: Record<string, ShippingMethodInfo> = {
  PRIORITY_FEDEX: {
    method: 'PRIORITY_FEDEX',
    displayName: 'Priority FedEx',
    estimatedDays: '4-5 days',
    costMultiplier: 1.5,
    description: 'Fastest delivery option'
  },
  SAVER_UPS: {
    method: 'SAVER_UPS',
    displayName: 'Saver UPS',
    estimatedDays: '8-12 days',
    costMultiplier: 1.2,
    description: 'Balanced speed and cost'
  },
  AIR_FREIGHT: {
    method: 'AIR_FREIGHT',
    displayName: 'Air Freight',
    estimatedDays: '15-20 days',
    costMultiplier: 1.0,
    description: 'Standard air delivery'
  },
  SEA_FREIGHT: {
    method: 'SEA_FREIGHT',
    displayName: 'Sea Freight',
    estimatedDays: '2-3 months',
    costMultiplier: 0.7,
    description: 'Most economical option'
  }
};

/**
 * Get all active shipments with their order counts
 */
export async function getActiveShipments(): Promise<ShipmentWithOrders[]> {
  try {
    const shipments = await prisma.shipment.findMany({
      where: {
        status: {
          in: ['PREPARING', 'READY_TO_SHIP', 'IN_TRANSIT']
        }
      },
      include: {
        orders: {
          select: {
            id: true,
            productName: true,
            customerInfo: true,
            status: true,
            totalUnits: true,
            calculatedTotal: true,
          }
        }
      },
      orderBy: {
        estimatedDeparture: 'asc'
      }
    });

    return shipments;
  } catch (error) {
    console.error('Error fetching active shipments:', error);
    return [];
  }
}

/**
 * Find the fastest departing shipment
 */
export async function getFastestShipment(): Promise<ShipmentWithOrders | null> {
  try {
    const shipments = await getActiveShipments();
    
    if (shipments.length === 0) return null;

    // Sort by estimated departure date (earliest first)
    const sortedByDeparture = shipments
      .filter(s => s.estimatedDeparture)
      .sort((a, b) => {
        if (!a.estimatedDeparture || !b.estimatedDeparture) return 0;
        return new Date(a.estimatedDeparture).getTime() - new Date(b.estimatedDeparture).getTime();
      });

    return sortedByDeparture[0] || shipments[0];
  } catch (error) {
    console.error('Error finding fastest shipment:', error);
    return null;
  }
}

/**
 * Get shipment recommendations based on urgency and cost preferences
 */
export async function getShipmentRecommendations(orderData: {
  urgency?: 'high' | 'normal' | 'low';
  costSensitive?: boolean;
  quantity?: number;
}): Promise<{
  recommended: ShipmentWithOrders | null;
  alternatives: ShipmentWithOrders[];
  createNew?: {
    method: string;
    reason: string;
  };
}> {
  try {
    const activeShipments = await getActiveShipments();
    
    // If no active shipments, recommend creating new one
    if (activeShipments.length === 0) {
      const recommendedMethod = orderData.urgency === 'high' ? 'PRIORITY_FEDEX' : 
                               orderData.costSensitive ? 'SEA_FREIGHT' : 'SAVER_UPS';
      
      return {
        recommended: null,
        alternatives: [],
        createNew: {
          method: recommendedMethod,
          reason: `No active shipments available. Recommended ${SHIPPING_METHODS[recommendedMethod].displayName} based on your preferences.`
        }
      };
    }

    // Sort shipments based on preferences
    let sortedShipments = [...activeShipments];
    
    if (orderData.urgency === 'high') {
      // Prioritize fastest shipping methods and earliest departure
      sortedShipments.sort((a, b) => {
        const aMethod = SHIPPING_METHODS[a.shippingMethod];
        const bMethod = SHIPPING_METHODS[b.shippingMethod];
        
        // First sort by shipping speed (higher multiplier = faster)
        if (aMethod.costMultiplier !== bMethod.costMultiplier) {
          return bMethod.costMultiplier - aMethod.costMultiplier;
        }
        
        // Then by departure date
        if (a.estimatedDeparture && b.estimatedDeparture) {
          return new Date(a.estimatedDeparture).getTime() - new Date(b.estimatedDeparture).getTime();
        }
        
        return 0;
      });
    } else if (orderData.costSensitive) {
      // Prioritize most economical shipping methods
      sortedShipments.sort((a, b) => {
        const aMethod = SHIPPING_METHODS[a.shippingMethod];
        const bMethod = SHIPPING_METHODS[b.shippingMethod];
        
        return aMethod.costMultiplier - bMethod.costMultiplier;
      });
    }

    return {
      recommended: sortedShipments[0],
      alternatives: sortedShipments.slice(1, 3),
    };
  } catch (error) {
    console.error('Error getting shipment recommendations:', error);
    return { recommended: null, alternatives: [] };
  }
}

/**
 * Calculate shipping cost based on shipment method and order details
 */
export function calculateShipmentDeliveryCost(
  shipmentData: ShipmentWithOrders,
  orderData: {
    quantity: number;
    baseProductCost: number;
  }
): {
  unitCost: number;
  totalCost: number;
  method: string;
  deliveryTime: string;
  savings?: {
    compared: string;
    amount: number;
  };
} {
  const methodInfo = SHIPPING_METHODS[shipmentData.shippingMethod];
  const baseShippingCost = 8; // Base shipping cost per unit
  
  const unitCost = baseShippingCost * methodInfo.costMultiplier;
  const totalCost = unitCost * orderData.quantity;

  // Calculate potential savings compared to Priority FedEx
  let savings;
  if (shipmentData.shippingMethod !== 'PRIORITY_FEDEX') {
    const priorityCost = baseShippingCost * SHIPPING_METHODS.PRIORITY_FEDEX.costMultiplier * orderData.quantity;
    const savingsAmount = priorityCost - totalCost;
    
    if (savingsAmount > 0) {
      savings = {
        compared: 'Priority FedEx',
        amount: savingsAmount
      };
    }
  }

  return {
    unitCost: Math.round(unitCost * 100) / 100,
    totalCost: Math.round(totalCost * 100) / 100,
    method: methodInfo.displayName,
    deliveryTime: methodInfo.estimatedDays,
    savings
  };
}

/**
 * Assign order to shipment
 */
export async function assignOrderToShipment(
  orderId: string, 
  shipmentId: string
): Promise<{
  success: boolean;
  message: string;
  shipment?: ShipmentWithOrders;
}> {
  try {
    // Check if order exists and is not already assigned to a different shipment
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { 
        id: true, 
        shipmentId: true, 
        productName: true,
        status: true
      }
    });

    if (!order) {
      return {
        success: false,
        message: `Order ${orderId} not found`
      };
    }

    if (order.shipmentId && order.shipmentId !== shipmentId) {
      return {
        success: false,
        message: `Order ${orderId} is already assigned to shipment ${order.shipmentId}`
      };
    }

    // Check if shipment exists
    const shipment = await prisma.shipment.findUnique({
      where: { id: shipmentId }
    });

    if (!shipment) {
      return {
        success: false,
        message: `Shipment ${shipmentId} not found`
      };
    }

    // Assign order to shipment
    await prisma.order.update({
      where: { id: orderId },
      data: { shipmentId: shipmentId }
    });

    // Get updated shipment data
    const updatedShipment = await prisma.shipment.findUnique({
      where: { id: shipmentId },
      include: {
        orders: {
          select: {
            id: true,
            productName: true,
            customerInfo: true,
            status: true,
            totalUnits: true,
            calculatedTotal: true,
          }
        }
      }
    });

    return {
      success: true,
      message: `Order ${orderId} successfully assigned to shipment ${shipment.buildNumber}`,
      shipment: updatedShipment
    };
  } catch (error) {
    console.error('Error assigning order to shipment:', error);
    return {
      success: false,
      message: 'Failed to assign order to shipment due to an error'
    };
  }
}

/**
 * Create new shipment for an order
 */
export async function createShipmentWithOrder(
  orderData: {
    orderId: string;
    shippingMethod: string;
  },
  createdBy?: string
): Promise<{
  success: boolean;
  message: string;
  shipment?: ShipmentWithOrders;
}> {
  try {
    // Generate next build number
    const lastShipment = await prisma.shipment.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { buildNumber: true }
    });

    let nextNumber = 1;
    if (lastShipment?.buildNumber) {
      const match = lastShipment.buildNumber.match(/SB(\d{4})/);
      if (match) {
        nextNumber = parseInt(match[1]) + 1;
      }
    }

    const buildNumber = `SB${nextNumber.toString().padStart(4, '0')}`;

    // Calculate estimated dates based on shipping method
    const methodInfo = SHIPPING_METHODS[orderData.shippingMethod];
    const estimatedDeparture = new Date();
    estimatedDeparture.setDate(estimatedDeparture.getDate() + 2); // 2 days prep time

    const estimatedDelivery = new Date(estimatedDeparture);
    const avgDeliveryDays = methodInfo.estimatedDays.includes('-') 
      ? parseInt(methodInfo.estimatedDays.split('-')[1]) 
      : parseInt(methodInfo.estimatedDays);
    estimatedDelivery.setDate(estimatedDelivery.getDate() + avgDeliveryDays);

    // Create shipment
    const newShipment = await prisma.shipment.create({
      data: {
        buildNumber,
        shippingMethod: orderData.shippingMethod,
        estimatedDeparture,
        estimatedDelivery,
        createdBy: createdBy || 'AI_Assistant',
        notes: `Created by AI Assistant for Order ${orderData.orderId}`
      },
      include: {
        orders: {
          select: {
            id: true,
            productName: true,
            customerInfo: true,
            status: true,
            totalUnits: true,
            calculatedTotal: true,
          }
        }
      }
    });

    // Assign order to new shipment
    const assignResult = await assignOrderToShipment(orderData.orderId, newShipment.id);
    
    if (!assignResult.success) {
      // Delete the shipment if order assignment failed
      await prisma.shipment.delete({
        where: { id: newShipment.id }
      });
      
      return assignResult;
    }

    return {
      success: true,
      message: `Created new shipment ${buildNumber} with ${methodInfo.displayName} and assigned Order ${orderData.orderId}`,
      shipment: assignResult.shipment
    };
  } catch (error) {
    console.error('Error creating shipment with order:', error);
    return {
      success: false,
      message: 'Failed to create shipment due to an error'
    };
  }
}

/**
 * Get shipment analytics for AI responses
 */
export async function getShipmentAnalytics(): Promise<{
  totalActiveShipments: number;
  shipmentsByMethod: Record<string, number>;
  averageOrdersPerShipment: number;
  upcomingDepartures: Array<{
    buildNumber: string;
    method: string;
    departureDate: string;
    orderCount: number;
  }>;
}> {
  try {
    const activeShipments = await getActiveShipments();
    
    const shipmentsByMethod = activeShipments.reduce((acc, shipment) => {
      acc[shipment.shippingMethod] = (acc[shipment.shippingMethod] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const totalOrders = activeShipments.reduce((sum, shipment) => sum + shipment.orders.length, 0);
    const averageOrdersPerShipment = activeShipments.length > 0 ? totalOrders / activeShipments.length : 0;

    const upcomingDepartures = activeShipments
      .filter(s => s.estimatedDeparture)
      .sort((a, b) => {
        if (!a.estimatedDeparture || !b.estimatedDeparture) return 0;
        return new Date(a.estimatedDeparture).getTime() - new Date(b.estimatedDeparture).getTime();
      })
      .slice(0, 5)
      .map(shipment => ({
        buildNumber: shipment.buildNumber,
        method: SHIPPING_METHODS[shipment.shippingMethod]?.displayName || shipment.shippingMethod,
        departureDate: shipment.estimatedDeparture 
          ? new Date(shipment.estimatedDeparture).toLocaleDateString()
          : 'TBD',
        orderCount: shipment.orders.length
      }));

    return {
      totalActiveShipments: activeShipments.length,
      shipmentsByMethod,
      averageOrdersPerShipment: Math.round(averageOrdersPerShipment * 10) / 10,
      upcomingDepartures
    };
  } catch (error) {
    console.error('Error getting shipment analytics:', error);
    return {
      totalActiveShipments: 0,
      shipmentsByMethod: {},
      averageOrdersPerShipment: 0,
      upcomingDepartures: []
    };
  }
}

/**
 * Find order by ID with shipment context
 */
export async function getOrderWithShipmentContext(orderId: string): Promise<{
  order: any;
  currentShipment?: ShipmentWithOrders;
  availableShipments: ShipmentWithOrders[];
  recommendations: any;
} | null> {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        shipment: {
          include: {
            orders: {
              select: {
                id: true,
                productName: true,
                customerInfo: true,
                status: true,
                totalUnits: true,
                calculatedTotal: true,
              }
            }
          }
        }
      }
    });

    if (!order) return null;

    const availableShipments = await getActiveShipments();
    const recommendations = await getShipmentRecommendations({
      quantity: order.totalUnits || 50,
      urgency: 'normal'
    });

    return {
      order,
      currentShipment: order.shipment,
      availableShipments: availableShipments.filter(s => s.id !== order.shipmentId),
      recommendations
    };
  } catch (error) {
    console.error('Error getting order with shipment context:', error);
    return null;
  }
}