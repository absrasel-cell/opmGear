// Dashboard Order Integration Helpers
// Provides easy-to-use functions for each dashboard type

import { OrderRecordingSystem, type StandardOrderData, type OrderRecordingOptions } from './order-recording-system';

// =====================================================
// DASHBOARD-SPECIFIC ORDER RECORDING FUNCTIONS
// =====================================================

/**
 * Record order from checkout page
 */
export async function recordCheckoutOrder(checkoutData: any, options: Partial<OrderRecordingOptions> = {}) {
  const { convertCheckoutToStandardOrder } = await import('./order-recording-system');
  
  const standardOrderData = convertCheckoutToStandardOrder(checkoutData);
  
  const defaultOptions: OrderRecordingOptions = {
    autoCalculateCosts: true,
    createInvoice: false,
    notifyCustomer: false,
    assignToShipment: !!checkoutData.shipmentId,
    updateInventory: false,
    ...options
  };
  
  return await OrderRecordingSystem.recordOrder(standardOrderData, defaultOptions);
}

/**
 * Record order from admin dashboard
 */
export async function recordAdminOrder(adminData: any, adminUser: any, options: Partial<OrderRecordingOptions> = {}) {
  const { convertAdminToStandardOrder } = await import('./order-recording-system');
  
  const standardOrderData = convertAdminToStandardOrder({
    ...adminData,
    createdByAdmin: adminUser
  });
  
  const defaultOptions: OrderRecordingOptions = {
    idempotencyKey: `admin_${adminUser.id}_${Date.now()}`,
    autoCalculateCosts: true,
    createInvoice: adminData.createInvoice || false,
    notifyCustomer: adminData.notifyCustomer || false,
    assignToShipment: !!adminData.shipmentId,
    updateInventory: adminData.updateInventory || false,
    ...options
  };
  
  return await OrderRecordingSystem.recordOrder(standardOrderData, defaultOptions);
}

/**
 * Record wholesale order
 */
export async function recordWholesaleOrder(wholesaleData: any, user: any, options: Partial<OrderRecordingOptions> = {}) {
  const { convertCheckoutToStandardOrder } = await import('./order-recording-system');
  
  const standardOrderData = convertCheckoutToStandardOrder({
    ...wholesaleData,
    userId: user.id,
    userEmail: user.email,
    orderType: 'AUTHENTICATED',
    orderSource: wholesaleData.isBulkOrder ? 'BULK_ORDER' : 'PRODUCT_CUSTOMIZATION',
    priceTier: wholesaleData.priceTier || 'Tier 2'
  });
  
  const defaultOptions: OrderRecordingOptions = {
    idempotencyKey: `wholesale_${user.id}_${Date.now()}`,
    autoCalculateCosts: true,
    createInvoice: true, // Wholesale orders typically get invoices
    notifyCustomer: true,
    assignToShipment: !!wholesaleData.shipmentId,
    updateInventory: true,
    ...options
  };
  
  return await OrderRecordingSystem.recordOrder(standardOrderData, defaultOptions);
}

/**
 * Record supplier order
 */
export async function recordSupplierOrder(supplierData: any, user: any, options: Partial<OrderRecordingOptions> = {}) {
  const { convertCheckoutToStandardOrder } = await import('./order-recording-system');
  
  const standardOrderData = convertCheckoutToStandardOrder({
    ...supplierData,
    userId: user.id,
    userEmail: user.email,
    orderType: 'AUTHENTICATED',
    orderSource: 'BULK_ORDER',
    priceTier: supplierData.priceTier || 'Tier 3',
    status: 'PENDING'
  });
  
  const defaultOptions: OrderRecordingOptions = {
    idempotencyKey: `supplier_${user.id}_${Date.now()}`,
    autoCalculateCosts: true,
    createInvoice: true,
    notifyCustomer: true,
    assignToShipment: false, // Suppliers handle their own shipping initially
    updateInventory: true,
    ...options
  };
  
  return await OrderRecordingSystem.recordOrder(standardOrderData, defaultOptions);
}

/**
 * Convert quote to order
 */
export async function convertQuoteToOrder(quoteData: any, conversionInfo: any, options: Partial<OrderRecordingOptions> = {}) {
  const { convertQuoteToStandardOrder } = await import('./order-recording-system');
  
  const standardOrderData = convertQuoteToStandardOrder({
    ...quoteData,
    ...conversionInfo
  });
  
  const defaultOptions: OrderRecordingOptions = {
    idempotencyKey: `quote_conversion_${quoteData.id}_${Date.now()}`,
    autoCalculateCosts: true,
    createInvoice: true, // Quote conversions always get invoices
    notifyCustomer: true,
    assignToShipment: false,
    updateInventory: true,
    ...options
  };
  
  return await OrderRecordingSystem.recordOrder(standardOrderData, defaultOptions);
}

// =====================================================
// ORDER STATUS AND WORKFLOW HELPERS
// =====================================================

/**
 * Get order status display information
 */
export function getOrderStatusInfo(status: string) {
  const statusMap: Record<string, { label: string; color: string; description: string; }> = {
    'DRAFT': {
      label: 'Draft',
      color: 'gray',
      description: 'Order is being prepared'
    },
    'PENDING': {
      label: 'Pending',
      color: 'yellow',
      description: 'Order submitted, awaiting processing'
    },
    'CONFIRMED': {
      label: 'Confirmed',
      color: 'blue',
      description: 'Order confirmed and accepted'
    },
    'PROCESSING': {
      label: 'Processing',
      color: 'purple',
      description: 'Order is being manufactured'
    },
    'SHIPPED': {
      label: 'Shipped',
      color: 'green',
      description: 'Order has been shipped'
    },
    'DELIVERED': {
      label: 'Delivered',
      color: 'green',
      description: 'Order has been delivered'
    },
    'CANCELLED': {
      label: 'Cancelled',
      color: 'red',
      description: 'Order was cancelled'
    }
  };
  
  return statusMap[status] || {
    label: status,
    color: 'gray',
    description: 'Unknown status'
  };
}

/**
 * Get order source display information
 */
export function getOrderSourceInfo(source: string) {
  const sourceMap: Record<string, { label: string; icon: string; description: string; }> = {
    'PRODUCT_CUSTOMIZATION': {
      label: 'Product Customization',
      icon: '🎨',
      description: 'Order created through product customization'
    },
    'REORDER': {
      label: 'Reorder',
      icon: '🔄',
      description: 'Reorder of previous purchase'
    },
    'BULK_ORDER': {
      label: 'Bulk Order',
      icon: '📦',
      description: 'Large quantity bulk order'
    },
    'ADMIN_CREATED': {
      label: 'Admin Created',
      icon: '👨‍💼',
      description: 'Order created by admin user'
    }
  };
  
  return sourceMap[source] || {
    label: source,
    icon: '📄',
    description: 'Unknown source'
  };
}

/**
 * Calculate order summary for dashboard display
 */
export function calculateOrderSummary(order: any) {
  const totalUnits = order.selectedColors ? 
    Object.values(order.selectedColors).reduce((sum: number, colorData: any) => 
      sum + Object.values(colorData.sizes).reduce((colorSum: number, qty: any) => colorSum + qty, 0), 0
    ) : 0;
    
  const colorCount = order.selectedColors ? Object.keys(order.selectedColors).length : 0;
  
  const logoCount = order.multiSelectOptions?.['logo-setup'] ? 
    order.multiSelectOptions['logo-setup'].length : 0;
    
  const hasCustomizations = logoCount > 0 || 
    (order.selectedOptions && Object.keys(order.selectedOptions).length > 0) ||
    (order.multiSelectOptions && Object.values(order.multiSelectOptions).some((arr: any) => arr.length > 0));
  
  return {
    totalUnits,
    colorCount,
    logoCount,
    hasCustomizations,
    productName: order.productName,
    orderTotal: order.orderTotal || 0,
    status: getOrderStatusInfo(order.status),
    source: getOrderSourceInfo(order.orderSource)
  };
}

/**
 * Format order for dashboard display
 */
export function formatOrderForDashboard(order: any, dashboardType: 'admin' | 'member' | 'wholesale' | 'supplier' = 'member') {
  const summary = calculateOrderSummary(order);
  const statusInfo = getOrderStatusInfo(order.status);
  const sourceInfo = getOrderSourceInfo(order.orderSource);
  
  const formatted = {
    id: order.id,
    productName: order.productName,
    status: order.status,
    statusInfo,
    sourceInfo,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    customerInfo: order.customerInfo,
    orderTotal: order.orderTotal || 0,
    summary,
    canEdit: false,
    canCancel: false,
    canReorder: true
  };
  
  // Set permissions based on dashboard type
  switch (dashboardType) {
    case 'admin':
      formatted.canEdit = ['DRAFT', 'PENDING', 'CONFIRMED'].includes(order.status);
      formatted.canCancel = !['DELIVERED', 'CANCELLED'].includes(order.status);
      break;
    case 'wholesale':
      formatted.canEdit = order.status === 'DRAFT';
      formatted.canCancel = ['DRAFT', 'PENDING'].includes(order.status);
      break;
    case 'supplier':
      formatted.canEdit = ['DRAFT', 'PENDING'].includes(order.status);
      formatted.canCancel = ['DRAFT', 'PENDING', 'CONFIRMED'].includes(order.status);
      break;
    default: // member
      formatted.canEdit = order.status === 'DRAFT';
      formatted.canCancel = order.status === 'DRAFT';
      break;
  }
  
  return formatted;
}

// =====================================================
// DASHBOARD ANALYTICS HELPERS
// =====================================================

/**
 * Calculate dashboard order statistics
 */
export function calculateOrderStats(orders: any[], dashboardType: string = 'member') {
  const stats = {
    totalOrders: orders.length,
    draftOrders: 0,
    pendingOrders: 0,
    confirmedOrders: 0,
    processingOrders: 0,
    shippedOrders: 0,
    deliveredOrders: 0,
    cancelledOrders: 0,
    totalRevenue: 0,
    totalUnits: 0
  };
  
  orders.forEach(order => {
    // Count by status
    switch (order.status) {
      case 'DRAFT':
        stats.draftOrders++;
        break;
      case 'PENDING':
        stats.pendingOrders++;
        break;
      case 'CONFIRMED':
        stats.confirmedOrders++;
        break;
      case 'PROCESSING':
        stats.processingOrders++;
        break;
      case 'SHIPPED':
        stats.shippedOrders++;
        break;
      case 'DELIVERED':
        stats.deliveredOrders++;
        break;
      case 'CANCELLED':
        stats.cancelledOrders++;
        break;
    }
    
    // Calculate totals
    if (order.orderTotal) {
      stats.totalRevenue += order.orderTotal;
    }
    
    // Calculate units
    if (order.selectedColors) {
      const orderUnits = Object.values(order.selectedColors).reduce((sum: number, colorData: any) => 
        sum + Object.values(colorData.sizes).reduce((colorSum: number, qty: any) => colorSum + qty, 0), 0
      );
      stats.totalUnits += orderUnits;
    }
  });
  
  return stats;
}

/**
 * Get recent orders for dashboard display
 */
export function getRecentOrders(orders: any[], limit: number = 5) {
  return orders
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit)
    .map(order => formatOrderForDashboard(order));
}

export default {
  recordCheckoutOrder,
  recordAdminOrder,
  recordWholesaleOrder,
  recordSupplierOrder,
  convertQuoteToOrder,
  getOrderStatusInfo,
  getOrderSourceInfo,
  calculateOrderSummary,
  formatOrderForDashboard,
  calculateOrderStats,
  getRecentOrders
};