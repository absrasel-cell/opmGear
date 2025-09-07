/**
 * Optimized dashboard metrics calculation with caching
 * Pre-calculates and caches expensive statistics for instant dashboard loading
 */

// Removed Prisma - migrated to Supabase

export interface DashboardMetrics {
  // Revenue metrics
  totalRevenue: number;
  monthlyRevenue: number[];
  revenueGrowth: number;
  
  // Order metrics
  totalOrders: number;
  pendingOrders: number;
  confirmedOrders: number;
  processingOrders: number;
  shippedOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  
  // User metrics
  totalUsers: number;
  newUsersThisMonth: number;
  activeUsers: number;
  userGrowth: number;
  
  // Quote metrics
  totalQuotes: number;
  pendingQuotes: number;
  approvedQuotes: number;
  declinedQuotes: number;
  
  // Shipment metrics
  totalShipments: number;
  averageUtilization: number;
  monthlyShipmentValue: number;
  potentialSavings: number;
  
  // Cache metadata
  lastCalculated: Date;
  calculationTime: number;
}

interface MetricsCache {
  metrics: DashboardMetrics;
  timestamp: Date;
}

// In-memory cache with 5-minute TTL
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
let metricsCache: MetricsCache | null = null;

/**
 * Fast, cached dashboard metrics with optimized database queries
 */
export async function getDashboardMetrics(forceRefresh = false): Promise<DashboardMetrics> {
  const startTime = Date.now();
  
  // Return cached metrics if available and fresh
  if (!forceRefresh && metricsCache && 
      Date.now() - metricsCache.timestamp.getTime() < CACHE_TTL) {
    console.log('📊 Dashboard metrics served from cache');
    return metricsCache.metrics;
  }
  
  console.log('🔄 Calculating dashboard metrics...');
  
  try {
    // Use optimized database queries with aggregations
    const [
      orderStats,
      userStats,
      quoteStats,
      shipmentStats,
      revenueByMonth
    ] = await Promise.all([
      // Orders aggregation
      prisma.order.groupBy({
        by: ['status'],
        _count: { id: true },
        _sum: { calculatedTotal: true }
      }),
      
      // Users aggregation
      prisma.$queryRaw<Array<{count: bigint, month: number}>>`
        SELECT 
          COUNT(*) as count,
          EXTRACT(MONTH FROM "createdAt") as month
        FROM "User" 
        WHERE "createdAt" >= NOW() - INTERVAL '12 months'
        GROUP BY EXTRACT(MONTH FROM "createdAt")
        ORDER BY month DESC
      `,
      
      // Quotes aggregation
      prisma.quote.groupBy({
        by: ['status'],
        _count: { id: true }
      }),
      
      // Mock shipment data (replace with real query)
      Promise.resolve({
        totalShipments: 0,
        averageUtilization: 0,
        monthlyValue: 0,
        potentialSavings: 0
      }),
      
      // Revenue by month (last 12 months)
      prisma.$queryRaw<Array<{revenue: number, month: number, year: number}>>`
        SELECT 
          COALESCE(SUM("calculatedTotal"), 0)::FLOAT as revenue,
          EXTRACT(MONTH FROM "createdAt") as month,
          EXTRACT(YEAR FROM "createdAt") as year
        FROM "Order" 
        WHERE "createdAt" >= NOW() - INTERVAL '12 months'
        AND "calculatedTotal" IS NOT NULL
        GROUP BY EXTRACT(YEAR FROM "createdAt"), EXTRACT(MONTH FROM "createdAt")
        ORDER BY year DESC, month DESC
        LIMIT 12
      `
    ]);
    
    // Process order statistics
    const orderMetrics = orderStats.reduce((acc, stat) => {
      const status = stat.status.toLowerCase();
      const count = stat._count.id;
      
      acc.totalOrders += count;
      acc.totalRevenue += Number(stat._sum.calculatedTotal || 0);
      
      switch (stat.status) {
        case 'PENDING': acc.pendingOrders = count; break;
        case 'CONFIRMED': acc.confirmedOrders = count; break;
        case 'PROCESSING': acc.processingOrders = count; break;
        case 'SHIPPED': acc.shippedOrders = count; break;
        case 'DELIVERED': acc.deliveredOrders = count; break;
        case 'CANCELLED': acc.cancelledOrders = count; break;
      }
      
      return acc;
    }, {
      totalOrders: 0,
      totalRevenue: 0,
      pendingOrders: 0,
      confirmedOrders: 0,
      processingOrders: 0,
      shippedOrders: 0,
      deliveredOrders: 0,
      cancelledOrders: 0
    });
    
    // Process user statistics
    const totalUsers = await prisma.user.count();
    const thisMonth = new Date();
    thisMonth.setDate(1);
    const newUsersThisMonth = await prisma.user.count({
      where: { createdAt: { gte: thisMonth } }
    });
    
    // Calculate monthly revenue array (last 12 months)
    const monthlyRevenue = new Array(12).fill(0);
    revenueByMonth.forEach((item, index) => {
      if (index < 12) {
        monthlyRevenue[11 - index] = item.revenue;
      }
    });
    
    // Calculate revenue growth
    const currentMonth = monthlyRevenue[11] || 0;
    const lastMonth = monthlyRevenue[10] || 0;
    const revenueGrowth = lastMonth > 0 ? ((currentMonth - lastMonth) / lastMonth) * 100 : 0;
    
    // Process quote statistics
    const quoteMetrics = quoteStats.reduce((acc, stat) => {
      const count = stat._count.id;
      acc.totalQuotes += count;
      
      switch (stat.status) {
        case 'PENDING': acc.pendingQuotes = count; break;
        case 'QUOTED': 
        case 'ACCEPTED': acc.approvedQuotes = count; break;
        case 'REJECTED': acc.declinedQuotes = count; break;
      }
      
      return acc;
    }, {
      totalQuotes: 0,
      pendingQuotes: 0,
      approvedQuotes: 0,
      declinedQuotes: 0
    });
    
    // Compile final metrics
    const metrics: DashboardMetrics = {
      // Revenue
      totalRevenue: orderMetrics.totalRevenue,
      monthlyRevenue,
      revenueGrowth,
      
      // Orders
      totalOrders: orderMetrics.totalOrders,
      pendingOrders: orderMetrics.pendingOrders,
      confirmedOrders: orderMetrics.confirmedOrders,
      processingOrders: orderMetrics.processingOrders,
      shippedOrders: orderMetrics.shippedOrders,
      deliveredOrders: orderMetrics.deliveredOrders,
      cancelledOrders: orderMetrics.cancelledOrders,
      
      // Users
      totalUsers,
      newUsersThisMonth,
      activeUsers: totalUsers, // Mock for now
      userGrowth: 0, // Calculate if needed
      
      // Quotes
      totalQuotes: quoteMetrics.totalQuotes,
      pendingQuotes: quoteMetrics.pendingQuotes,
      approvedQuotes: quoteMetrics.approvedQuotes,
      declinedQuotes: quoteMetrics.declinedQuotes,
      
      // Shipments
      totalShipments: shipmentStats.totalShipments,
      averageUtilization: shipmentStats.averageUtilization,
      monthlyShipmentValue: shipmentStats.monthlyValue,
      potentialSavings: shipmentStats.potentialSavings,
      
      // Cache metadata
      lastCalculated: new Date(),
      calculationTime: Date.now() - startTime
    };
    
    // Update cache
    metricsCache = {
      metrics,
      timestamp: new Date()
    };
    
    console.log(`✅ Dashboard metrics calculated in ${metrics.calculationTime}ms`);
    return metrics;
    
  } catch (error) {
    console.error('❌ Error calculating dashboard metrics:', error);
    
    // Return fallback metrics on error
    const fallbackMetrics: DashboardMetrics = {
      totalRevenue: 0,
      monthlyRevenue: new Array(12).fill(0),
      revenueGrowth: 0,
      totalOrders: 0,
      pendingOrders: 0,
      confirmedOrders: 0,
      processingOrders: 0,
      shippedOrders: 0,
      deliveredOrders: 0,
      cancelledOrders: 0,
      totalUsers: 0,
      newUsersThisMonth: 0,
      activeUsers: 0,
      userGrowth: 0,
      totalQuotes: 0,
      pendingQuotes: 0,
      approvedQuotes: 0,
      declinedQuotes: 0,
      totalShipments: 0,
      averageUtilization: 0,
      monthlyShipmentValue: 0,
      potentialSavings: 0,
      lastCalculated: new Date(),
      calculationTime: Date.now() - startTime
    };
    
    return fallbackMetrics;
  }
}

/**
 * Get recent orders with minimal data for dashboard display
 */
export async function getRecentOrdersForDashboard(limit = 5) {
  try {
    const orders = await prisma.order.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        productName: true,
        status: true,
        createdAt: true,
        calculatedTotal: true,
        customerInfo: true,
        orderSource: true,
        orderType: true
      }
    });
    
    return orders;
  } catch (error) {
    console.error('Error fetching recent orders:', error);
    return [];
  }
}

/**
 * Get recent users with minimal data for dashboard display
 */
export async function getRecentUsersForDashboard(limit = 5) {
  try {
    const users = await prisma.user.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        accessRole: true,
        customerRole: true,
        createdAt: true
      }
    });
    
    return users;
  } catch (error) {
    console.error('Error fetching recent users:', error);
    return [];
  }
}

/**
 * Invalidate metrics cache (call when orders/users are updated)
 */
export function invalidateDashboardMetrics() {
  metricsCache = null;
  console.log('🗑️ Dashboard metrics cache invalidated');
}

/**
 * Get cache status for debugging
 */
export function getDashboardCacheStatus() {
  return {
    cached: !!metricsCache,
    lastCalculated: metricsCache?.timestamp,
    age: metricsCache ? Date.now() - metricsCache.timestamp.getTime() : null,
    ttl: CACHE_TTL
  };
}