import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Simplified order total calculation for analytics
function calculateOrderTotalSimple(order: any): number {
  try {
    const selectedColors = order.selectedColors as any;
    let totalQuantity = 0;

    if (selectedColors && typeof selectedColors === 'object') {
      Object.values(selectedColors).forEach((colorData: any) => {
        if (colorData && colorData.sizes && typeof colorData.sizes === 'object') {
          Object.values(colorData.sizes).forEach((qty: any) => {
            totalQuantity += Number(qty) || 0;
          });
        }
      });
    }

    // Use tier 2 pricing as baseline for analytics
    const basePrice = totalQuantity >= 2880 ? 1.44 : 
                     totalQuantity >= 1152 ? 1.47 : 
                     totalQuantity >= 576 ? 1.60 : 
                     totalQuantity >= 144 ? 1.70 : 
                     totalQuantity >= 48 ? 2.20 : 2.40;

    // Base cost
    let total = totalQuantity * basePrice;

    // Add basic logo setup costs if present
    const logoSetup = order.logoSetupSelections as any;
    const multiSelect = order.multiSelectOptions as any;
    
    if (multiSelect && multiSelect['logo-setup']) {
      const logoServices = multiSelect['logo-setup'];
      if (Array.isArray(logoServices)) {
        logoServices.forEach((service: string) => {
          if (service === '3D Embroidery') {
            total += totalQuantity * 0.5; // Rough estimate
          }
        });
      }
    }

    // Add accessories
    if (multiSelect && multiSelect.accessories) {
      const accessories = multiSelect.accessories;
      if (Array.isArray(accessories)) {
        accessories.forEach((accessory: string) => {
          if (accessory === 'Sticker') {
            total += totalQuantity * 0.1; // Rough estimate
          }
        });
      }
    }

    // Add delivery costs based on quantity tiers
    const deliveryMultiplier = totalQuantity >= 1000 ? 0.05 : 0.08;
    total += total * deliveryMultiplier;

    return total;
  } catch (error) {
    return 0;
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    
    // Build date filter
    const dateFilter = {};
    if (startDate) {
      dateFilter.createdAt = {
        ...(dateFilter.createdAt || {}),
        gte: new Date(startDate)
      };
    }
    if (endDate) {
      dateFilter.createdAt = {
        ...(dateFilter.createdAt || {}),
        lte: new Date(endDate)
      };
    }

    // Get shipment analytics
    const [shipments, orders] = await Promise.all([
      prisma.shipment.findMany({
        where: dateFilter,
        include: {
          orders: {
            select: {
              id: true,
              selectedColors: true,
              selectedOptions: true,
              multiSelectOptions: true,
              logoSetupSelections: true,
              orderType: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }).catch(error => {
        console.error('Error fetching shipments:', error);
        return [];
      }),
      prisma.order.findMany({
        where: {
          ...dateFilter,
          shipmentId: { not: null }
        },
        select: {
          id: true,
          selectedColors: true,
          selectedOptions: true,
          multiSelectOptions: true,
          logoSetupSelections: true,
          orderType: true,
          shipmentId: true,
          createdAt: true
        }
      }).catch(error => {
        console.error('Error fetching orders:', error);
        return [];
      })
    ]);

    // Calculate analytics
    const totalShipments = shipments.length;
    const totalOrdersInShipments = orders.length;
    
    // Volume utilization analysis
    const volumeAnalysis = shipments.map(shipment => {
      const shipmentOrders = shipment.orders;
      
      // Extract quantity and pricing from order data
      const totalQuantity = shipmentOrders.reduce((sum, order) => {
        try {
          // Calculate quantity from selectedColors
          const selectedColors = order.selectedColors as any;
          let orderQuantity = 0;
          if (selectedColors && typeof selectedColors === 'object') {
            Object.values(selectedColors).forEach((colorData: any) => {
              if (colorData && colorData.sizes && typeof colorData.sizes === 'object') {
                Object.values(colorData.sizes).forEach((qty: any) => {
                  orderQuantity += Number(qty) || 0;
                });
              }
            });
          }
          return sum + orderQuantity;
        } catch {
          return sum;
        }
      }, 0);
      
      const totalValue = shipmentOrders.reduce((sum, order) => {
        return sum + calculateOrderTotalSimple(order);
      }, 0);
      
      // Assume typical shipping capacity thresholds
      const capacityByMethod = {
        'PRIORITY_FEDEX': 150,
        'SAVER_UPS': 200,
        'AIR_FREIGHT': 500,
        'SEA_FREIGHT': 1000
      };
      
      const maxCapacity = capacityByMethod[shipment.shippingMethod] || 200;
      const utilizationPercentage = Math.min((totalQuantity / maxCapacity) * 100, 100);
      
      return {
        shipmentId: shipment.id,
        buildNumber: shipment.buildNumber,
        shippingMethod: shipment.shippingMethod,
        status: shipment.status,
        orderCount: shipmentOrders.length,
        totalQuantity,
        maxCapacity,
        utilizationPercentage: Math.round(utilizationPercentage * 100) / 100,
        totalValue,
        estimatedDeparture: shipment.estimatedDeparture,
        createdAt: shipment.createdAt,
        isOptimal: utilizationPercentage >= 75,
        hasCapacity: utilizationPercentage < 90
      };
    });

    // Cost optimization analysis
    const deliveryMethodStats = shipments.reduce((acc, shipment) => {
      const method = shipment.shippingMethod;
      if (!acc[method]) {
        acc[method] = {
          count: 0,
          totalOrders: 0,
          totalQuantity: 0,
          totalValue: 0,
          avgUtilization: 0,
          shipments: []
        };
      }
      
      const shipmentData = volumeAnalysis.find(v => v.shipmentId === shipment.id);
      acc[method].count++;
      acc[method].totalOrders += shipmentData?.orderCount || 0;
      acc[method].totalQuantity += shipmentData?.totalQuantity || 0;
      acc[method].totalValue += shipmentData?.totalValue || 0;
      acc[method].shipments.push(shipmentData);
      
      return acc;
    }, {});

    // Calculate average utilization per method
    Object.keys(deliveryMethodStats).forEach(method => {
      const methodData = deliveryMethodStats[method];
      const totalUtilization = methodData.shipments.reduce((sum, s) => sum + (s?.utilizationPercentage || 0), 0);
      methodData.avgUtilization = Math.round((totalUtilization / methodData.count) * 100) / 100;
    });

    // Business intelligence metrics
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);
    
    const monthlyShipments = shipments.filter(s => new Date(s.createdAt) >= currentMonth);
    const monthlyVolume = monthlyShipments.reduce((sum, s) => {
      const shipmentData = volumeAnalysis.find(v => v.shipmentId === s.id);
      return sum + (shipmentData?.totalQuantity || 0);
    }, 0);

    const monthlyValue = monthlyShipments.reduce((sum, s) => {
      const shipmentData = volumeAnalysis.find(v => v.shipmentId === s.id);
      return sum + (shipmentData?.totalValue || 0);
    }, 0);

    // Cost savings opportunities
    const underutilizedShipments = volumeAnalysis.filter(v => v.utilizationPercentage < 75);
    const potentialSavings = underutilizedShipments.reduce((sum, s) => {
      // Estimate potential savings based on unutilized capacity
      const unutilizedCapacity = s.maxCapacity - s.totalQuantity;
      const avgOrderValue = s.totalValue / Math.max(s.orderCount, 1);
      return sum + (unutilizedCapacity * 0.1 * avgOrderValue); // Rough estimate
    }, 0);

    // Notifications data
    const nearCapacityShipments = volumeAnalysis.filter(v => 
      v.utilizationPercentage >= 90 && v.status === 'PREPARING'
    );
    
    const consolidationOpportunities = volumeAnalysis.filter(v => 
      v.utilizationPercentage < 50 && v.status === 'PREPARING'
    );

    const response = {
      success: true,
      analytics: {
        overview: {
          totalShipments,
          totalOrdersInShipments,
          monthlyShipments: monthlyShipments.length,
          monthlyVolume,
          monthlyValue,
          averageUtilization: volumeAnalysis.length > 0 ? 
            Math.round((volumeAnalysis.reduce((sum, v) => sum + v.utilizationPercentage, 0) / volumeAnalysis.length) * 100) / 100 : 0
        },
        volumeUtilization: volumeAnalysis,
        deliveryMethodEfficiency: deliveryMethodStats,
        costOptimization: {
          underutilizedCount: underutilizedShipments.length,
          potentialSavings: Math.round(potentialSavings * 100) / 100,
          optimalShipments: volumeAnalysis.filter(v => v.isOptimal).length,
          improvementOpportunities: underutilizedShipments.map(s => ({
            buildNumber: s.buildNumber,
            currentUtilization: s.utilizationPercentage,
            potentialIncrease: Math.min(90 - s.utilizationPercentage, 100 - s.utilizationPercentage),
            estimatedSavings: (s.maxCapacity - s.totalQuantity) * 0.05 * (s.totalValue / Math.max(s.totalQuantity, 1))
          }))
        },
        notifications: {
          nearCapacity: nearCapacityShipments.map(s => ({
            buildNumber: s.buildNumber,
            utilizationPercentage: s.utilizationPercentage,
            remainingCapacity: s.maxCapacity - s.totalQuantity,
            estimatedDeparture: s.estimatedDeparture
          })),
          consolidationOpportunities: consolidationOpportunities.map(s => ({
            buildNumber: s.buildNumber,
            utilizationPercentage: s.utilizationPercentage,
            potentialConsolidation: Math.floor((100 - s.utilizationPercentage) / 50), // How many similar shipments could be consolidated
            shippingMethod: s.shippingMethod
          }))
        }
      }
    };

    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Error fetching shipment analytics:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch shipment analytics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}