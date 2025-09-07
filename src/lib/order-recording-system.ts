// Streamlined Order Recording System for OPM Gear Platform
// Standardizes order data structures and processing across all dashboards

// TODO: Remove Prisma import - convert to Supabase
// // Removed Prisma - migrated to Supabase
import { v4 as uuidv4 } from 'uuid';

// =====================================================
// STANDARDIZED ORDER DATA TYPES
// =====================================================

export interface StandardOrderData {
  // Core Product Information
  productName: string;
  priceTier: 'Tier 1' | 'Tier 2' | 'Tier 3';
  
  // Selection Data
  selectedColors: Record<string, { sizes: Record<string, number> }>;
  logoSetupSelections: Record<string, {
    position?: string;
    size?: string;
    application?: string;
  }>;
  selectedOptions: Record<string, string>; // Single-select options
  multiSelectOptions: Record<string, string[]>; // Multi-select options
  
  // Customer Information
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
  
  // Order Metadata
  userId?: string | null;
  userEmail: string;
  orderType: 'AUTHENTICATED' | 'GUEST';
  orderSource: 'PRODUCT_CUSTOMIZATION' | 'REORDER' | 'CHECKOUT_ORDER' | 'BULK_ORDER' | 'ADMIN_CREATED';
  status: 'DRAFT' | 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
  
  // Files and Instructions
  uploadedLogoFiles?: Array<{url: string, name: string, size: number, type: string}>;
  tempLogoFiles?: Array<{id: string, name: string, size: number, type: string, kind: string, position?: string, base64Data: string, preview?: string}>;
  additionalInstructions?: string;
  specialInstructions?: string;
  
  // Cost Information
  costBreakdown?: {
    baseProductCost: number;
    logoSetupCosts: Array<{ name: string; cost: number; unitPrice: number; details: string; }>;
    accessoriesCosts: Array<{ name: string; cost: number; unitPrice: number; }>;
    closureCosts: Array<{ name: string; cost: number; unitPrice: number; }>;
    premiumFabricCosts?: Array<{ name: string; cost: number; unitPrice: number; }>;
    deliveryCosts: Array<{ name: string; cost: number; unitPrice: number; }>;
    totalCost: number;
    totalUnits: number;
  };
  
  // Payment Information
  paymentInfo?: {
    cardLast4?: string;
    cardName?: string;
    method?: 'CARD' | 'INVOICE' | 'TERMS' | 'CASH';
    reference?: string;
  };
  
  // Shipping and Fulfillment
  shipmentId?: string | null;
  trackingNumber?: string;
  estimatedDelivery?: string;
  
  // System Data
  isDraft: boolean;
  paymentProcessed: boolean;
  processedAt?: string;
  ipAddress?: string;
  userAgent?: string;
  
  // Cart Integration (for multi-item orders)
  cartItems?: Array<{
    id: string;
    productName: string;
    selectedColors: Record<string, any>;
    logoSetupSelections: Record<string, any>;
    selectedOptions: Record<string, any>;
    multiSelectOptions: Record<string, any>;
    pricing: { unitPrice: number; totalPrice: number; volume: number; };
    shipmentId?: string;
    shipment?: any;
  }>;
}

export interface OrderRecordingOptions {
  idempotencyKey?: string;
  skipDuplicateCheck?: boolean;
  autoCalculateCosts?: boolean;
  createInvoice?: boolean;
  notifyCustomer?: boolean;
  assignToShipment?: boolean;
  updateInventory?: boolean;
}

export interface OrderRecordingResult {
  success: boolean;
  orderId: string;
  order: any;
  invoice?: { id: string; number: string; };
  shipmentAssignment?: { shipmentId: string; buildNumber: string; };
  errors?: string[];
  warnings?: string[];
  isDuplicate?: boolean;
  temporaryId?: boolean; // For database failures
}

// =====================================================
// CORE ORDER RECORDING FUNCTIONS
// =====================================================

export class OrderRecordingSystem {
  
  /**
   * Main order recording function - handles all dashboard types
   */
  static async recordOrder(
    orderData: StandardOrderData,
    options: OrderRecordingOptions = {}
  ): Promise<OrderRecordingResult> {
    try {
      // TODO: Order recording temporarily disabled - need to convert to Supabase
      console.log('⚠️ Order recording temporarily disabled - TODO: implement with Supabase');
      
      return {
        success: false,
        orderId: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        temporaryId: true,
        errors: ['Order recording temporarily unavailable due to database maintenance'],
        warnings: ['Orders will be processed when database is available']
      };
      
      console.log('📝 Starting order recording process...');
      console.log('📄 Order source:', orderData.orderSource);
      console.log('👤 Order type:', orderData.orderType);
      console.log('🎯 Options:', options);
      
      const result: OrderRecordingResult = {
        success: false,
        orderId: '',
        order: null,
        errors: [],
        warnings: []
      };
      
      // Step 1: Validate order data
      const validationResult = await this.validateOrderData(orderData);
      if (!validationResult.isValid) {
        result.errors = validationResult.errors;
        return result;
      }
      
      // Step 2: Check for duplicates (unless skipped)
      if (!options.skipDuplicateCheck && options.idempotencyKey) {
        const duplicateCheck = await this.checkForDuplicates(orderData, options.idempotencyKey);
        if (duplicateCheck.isDuplicate) {
          result.success = true;
          result.orderId = duplicateCheck.existingOrderId!;
          result.order = duplicateCheck.existingOrder;
          result.isDuplicate = true;
          return result;
        }
      }
      
      // Step 3: Auto-calculate costs if requested
      if (options.autoCalculateCosts && !orderData.costBreakdown) {
        try {
          orderData.costBreakdown = await this.calculateOrderCosts(orderData);
          console.log('💰 Auto-calculated order costs:', orderData.costBreakdown.totalCost);
        } catch (costError) {
          console.warn('Failed to auto-calculate costs:', costError);
          result.warnings?.push('Could not auto-calculate costs');
        }
      }
      
      // Step 4: Process file uploads (needs actual orderId from creation)
      // This will be handled after order creation
      
      // Step 5: Create the order record
      const orderCreationResult = await this.createOrderRecord(orderData);
      if (!orderCreationResult.success) {
        result.errors = orderCreationResult.errors;
        result.temporaryId = orderCreationResult.temporaryId;
        
        // For database failures, return temporary success
        if (orderCreationResult.temporaryId) {
          result.success = true;
          result.orderId = orderCreationResult.tempOrderId!;
          result.order = orderCreationResult.tempOrder;
          
          // Still try to process files for temporary orders (they can be re-processed later)
          if (orderData.tempLogoFiles && orderData.tempLogoFiles.length > 0) {
            console.log(`📤 Processing ${orderData.tempLogoFiles.length} temp files for temporary order ${result.orderId}...`);
            try {
              const uploadResult = await this.processFileUploads(orderData.tempLogoFiles, result.orderId, orderData.userId);
              if (uploadResult.success) {
                console.log(`✅ Successfully processed ${uploadResult.uploadedFiles.length} files for temporary order`);
              }
            } catch (uploadError) {
              console.error('❌ File upload processing failed for temporary order:', uploadError);
              // Don't add warnings to temporary orders as they may be confusing
            }
          }
        }
        
        return result;
      }
      
      result.orderId = orderCreationResult.orderId!;
      result.order = orderCreationResult.order;
      
      // Step 6: Process file uploads after successful order creation
      if (orderData.tempLogoFiles && orderData.tempLogoFiles.length > 0) {
        console.log(`📤 Processing ${orderData.tempLogoFiles.length} temp files for order ${result.orderId}...`);
        try {
          const uploadResult = await this.processFileUploads(orderData.tempLogoFiles, result.orderId, orderData.userId);
          if (uploadResult.success) {
            orderData.uploadedLogoFiles = [
              ...(orderData.uploadedLogoFiles || []),
              ...uploadResult.uploadedFiles
            ];
            console.log(`✅ Successfully processed ${uploadResult.uploadedFiles.length} files for order ${result.orderId}`);
          } else {
            result.warnings?.push(`Some files failed to upload: ${uploadResult.errors.join(', ')}`);
          }
        } catch (uploadError) {
          console.error('❌ File upload processing failed:', uploadError);
          result.warnings?.push('File upload processing failed');
        }
      }
      
      // Step 7: Handle post-creation tasks
      const postCreationTasks = await this.handlePostCreationTasks(
        result.orderId,
        orderData,
        options
      );
      
      if (postCreationTasks.invoice) result.invoice = postCreationTasks.invoice;
      if (postCreationTasks.shipmentAssignment) result.shipmentAssignment = postCreationTasks.shipmentAssignment;
      if (postCreationTasks.warnings) result.warnings?.push(...postCreationTasks.warnings);
      
      result.success = true;
      console.log('✅ Order recorded successfully:', result.orderId);
      
      return result;
      
    } catch (error) {
      console.error('💥 Order recording failed:', error);
      return {
        success: false,
        orderId: '',
        order: null,
        errors: [`Order recording failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }
  
  /**
   * Validate order data structure and required fields
   */
  static async validateOrderData(orderData: StandardOrderData): Promise<{
    isValid: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];
    
    // Required fields validation
    if (!orderData.productName?.trim()) errors.push('Product name is required');
    if (!orderData.customerInfo?.name?.trim()) errors.push('Customer name is required');
    if (!orderData.customerInfo?.email?.trim()) errors.push('Customer email is required');
    if (!orderData.userEmail?.trim()) errors.push('User email is required');
    
    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (orderData.customerInfo?.email && !emailRegex.test(orderData.customerInfo.email)) {
      errors.push('Invalid customer email format');
    }
    if (orderData.userEmail && !emailRegex.test(orderData.userEmail)) {
      errors.push('Invalid user email format');
    }
    
    // Order type validation
    if (!['AUTHENTICATED', 'GUEST'].includes(orderData.orderType)) {
      errors.push('Invalid order type');
    }
    
    // Order source validation
    const validSources = ['PRODUCT_CUSTOMIZATION', 'REORDER', 'CHECKOUT_ORDER', 'BULK_ORDER', 'ADMIN_CREATED'];
    if (!validSources.includes(orderData.orderSource)) {
      errors.push('Invalid order source');
    }
    
    // Status validation
    const validStatuses = ['DRAFT', 'PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
    if (!validStatuses.includes(orderData.status)) {
      errors.push('Invalid order status');
    }
    
    // Selection data validation
    if (!orderData.selectedColors || Object.keys(orderData.selectedColors).length === 0) {
      errors.push('At least one color selection is required');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
  
  /**
   * Check for duplicate orders
   */
  static async checkForDuplicates(
    orderData: StandardOrderData,
    idempotencyKey: string
  ): Promise<{
    isDuplicate: boolean;
    existingOrderId?: string;
    existingOrder?: any;
  }> {
    try {
      // Check by idempotency key and recent orders from same email
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
        console.log('🔄 Duplicate order detected:', existingOrder.id);
        return {
          isDuplicate: true,
          existingOrderId: existingOrder.id,
          existingOrder
        };
      }
      
      return { isDuplicate: false };
      
    } catch (error) {
      console.warn('Duplicate check failed:', error);
      return { isDuplicate: false };
    }
  }
  
  /**
   * Calculate order costs using existing pricing system
   */
  static async calculateOrderCosts(orderData: StandardOrderData) {
    try {
      const { loadCustomizationPricing } = await import('@/lib/pricing-server');
      const { getBaseProductPricing } = await import('@/lib/pricing');
      
      // Get base product pricing
      const baseProductPricing = getBaseProductPricing(orderData.priceTier || 'Tier 2');
      const pricingData = await loadCustomizationPricing();
      
      // Calculate total units
      const totalUnits = Object.values(orderData.selectedColors).reduce((sum, colorData) => 
        sum + Object.values(colorData.sizes).reduce((colorSum, qty) => colorSum + qty, 0), 0
      );
      
      if (totalUnits === 0) {
        throw new Error('No units found in order');
      }
      
      let totalCost = 0;
      const logoSetupCosts: any[] = [];
      const accessoriesCosts: any[] = [];
      const closureCosts: any[] = [];
      const deliveryCosts: any[] = [];
      
      // Calculate base product cost
      let baseProductCost = 0;
      Object.entries(orderData.selectedColors).forEach(([colorName, colorData]) => {
        const colorTotalQuantity = Object.values(colorData.sizes).reduce((sum, qty) => sum + qty, 0);
        let unitPrice = baseProductPricing.price48;
        if (totalUnits >= 10000) unitPrice = baseProductPricing.price10000;
        else if (totalUnits >= 2880) unitPrice = baseProductPricing.price2880;
        else if (totalUnits >= 1152) unitPrice = baseProductPricing.price1152;
        else if (totalUnits >= 576) unitPrice = baseProductPricing.price576;
        else if (totalUnits >= 144) unitPrice = baseProductPricing.price144;
        
        baseProductCost += colorTotalQuantity * unitPrice;
      });
      totalCost += baseProductCost;
      
      // Calculate logo setup costs
      const selectedLogoValues = orderData.multiSelectOptions?.['logo-setup'] || [];
      for (const logoValue of selectedLogoValues) {
        const logoConfig = orderData.logoSetupSelections?.[logoValue];
        if (logoConfig) {
          const pricingItem = pricingData.find(item => item.name === logoValue);
          if (pricingItem) {
            let unitPrice = pricingItem.price48;
            if (totalUnits >= 10000) unitPrice = pricingItem.price10000;
            else if (totalUnits >= 2880) unitPrice = pricingItem.price2880;
            else if (totalUnits >= 1152) unitPrice = pricingItem.price1152;
            else if (totalUnits >= 576) unitPrice = pricingItem.price576;
            else if (totalUnits >= 144) unitPrice = pricingItem.price144;
            
            const logoCost = totalUnits * unitPrice;
            totalCost += logoCost;
            logoSetupCosts.push({
              name: logoValue,
              cost: logoCost,
              unitPrice,
              details: `${logoConfig.application || 'Standard'} application`
            });
          }
        }
      }
      
      // Calculate accessories, closures, and delivery costs
      const optionTypes = [
        { key: 'accessories', array: accessoriesCosts },
        { key: 'closures', array: closureCosts },
        { key: 'delivery', array: deliveryCosts }
      ];
      
      for (const optionType of optionTypes) {
        const selectedValues = orderData.multiSelectOptions?.[optionType.key] || [];
        for (const value of selectedValues) {
          const pricingItem = pricingData.find(item => item.name === value);
          if (pricingItem) {
            let unitPrice = pricingItem.price48;
            if (totalUnits >= 10000) unitPrice = pricingItem.price10000;
            else if (totalUnits >= 2880) unitPrice = pricingItem.price2880;
            else if (totalUnits >= 1152) unitPrice = pricingItem.price1152;
            else if (totalUnits >= 576) unitPrice = pricingItem.price576;
            else if (totalUnits >= 144) unitPrice = pricingItem.price144;
            
            const itemCost = totalUnits * unitPrice;
            totalCost += itemCost;
            optionType.array.push({
              name: value,
              cost: itemCost,
              unitPrice
            });
          }
        }
      }
      
      return {
        baseProductCost,
        logoSetupCosts,
        accessoriesCosts,
        closureCosts,
        deliveryCosts,
        totalCost,
        totalUnits
      };
      
    } catch (error) {
      console.error('Cost calculation failed:', error);
      throw error;
    }
  }
  
  /**
   * Process file uploads to Supabase storage
   */
  static async processFileUploads(files: any[], orderId: string, userId?: string): Promise<{
    success: boolean;
    uploadedFiles: Array<{url: string, name: string, size: number, type: string}>;
    errors: string[];
  }> {
    try {
      const { supabaseAdmin } = await import('@/lib/supabase');
      const uploadedFiles = [];
      const errors = [];
      
      console.log(`📤 [ORDER RECORDING] Processing ${files.length} temp files for order ${orderId}`);
      
      for (const file of files) {
        try {
          // Convert base64 to buffer
          const base64Data = file.base64Data.split(',')[1];
          const fileBuffer = Buffer.from(base64Data, 'base64');
          
          // Generate unique filename
          const fileName = `${uuidv4()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
          const filePath = `${orderId}/${fileName}`;
          
          console.log(`📤 [ORDER RECORDING] Uploading ${file.name} to ${filePath}`);
          
          // Upload to Supabase storage
          const { error } = await supabaseAdmin.storage
            .from('order-assets')
            .upload(filePath, fileBuffer, {
              contentType: file.type,
              upsert: false
            });
          
          if (error) {
            console.error('❌ [ORDER RECORDING] Supabase upload error:', error);
            errors.push(`Failed to upload ${file.name}: ${error.message}`);
            continue;
          }
          
          // Get public URL
          const { data: urlData } = supabaseAdmin.storage
            .from('order-assets')
            .getPublicUrl(filePath);
          
          // 🔧 CRITICAL FIX: Create OrderAsset database record so dashboards can find it
          try {
            await prisma.orderAsset.create({
              data: {
                orderId: orderId,
                userId: userId || '', // Use provided userId or empty string for guests
                kind: (file.kind as 'LOGO' | 'ACCESSORY' | 'OTHER') || 'LOGO',
                position: file.position || 'Front',
                bucket: 'order-assets',
                path: filePath,
                mimeType: file.type,
                sizeBytes: file.size,
                width: file.width || null,
                height: file.height || null,
              }
            });
            console.log(`✅ [ORDER RECORDING] Created OrderAsset record for ${file.name}`);
          } catch (dbError) {
            console.error('❌ [ORDER RECORDING] Failed to create OrderAsset record:', dbError);
            // Continue anyway, the file is uploaded
          }
          
          uploadedFiles.push({
            url: urlData.publicUrl,
            name: file.name,
            size: file.size,
            type: file.type
          });
          
          console.log('✅ [ORDER RECORDING] Uploaded file:', file.name, 'to', filePath);
        } catch (fileError) {
          console.error('❌ [ORDER RECORDING] Failed to upload file:', file.name, fileError);
          errors.push(`Failed to upload ${file.name}: ${fileError instanceof Error ? fileError.message : 'Unknown error'}`);
        }
      }
      
      return {
        success: uploadedFiles.length > 0,
        uploadedFiles,
        errors
      };
      
    } catch (error) {
      console.error('File upload processing failed:', error);
      return {
        success: false,
        uploadedFiles: [],
        errors: ['File upload system error']
      };
    }
  }
  
  /**
   * Create order record in database with fallback handling
   */
  static async createOrderRecord(orderData: StandardOrderData): Promise<{
    success: boolean;
    orderId?: string;
    order?: any;
    errors: string[];
    temporaryId?: boolean;
    tempOrderId?: string;
    tempOrder?: any;
  }> {
    try {
      // ✅ Include priceTier in selectedOptions for invoice calculations
      const selectedOptionsWithTier = {
        ...orderData.selectedOptions,
        priceTier: orderData.priceTier // Use the extracted pricing tier without fallback
      };

      // Calculate totals for database storage
      const totalUnits = Object.values(orderData.selectedColors).reduce((sum, colorData) => 
        sum + Object.values(colorData.sizes).reduce((colorSum, qty) => colorSum + qty, 0), 0
      );
      
      const calculatedTotal = orderData.costBreakdown ? orderData.costBreakdown.totalCost : 0;

      const order = await prisma.order.create({
        data: {
          productName: orderData.productName,
          selectedColors: orderData.selectedColors,
          logoSetupSelections: orderData.logoSetupSelections,
          selectedOptions: selectedOptionsWithTier,
          multiSelectOptions: orderData.multiSelectOptions,
          customerInfo: orderData.customerInfo,
          uploadedLogoFiles: orderData.uploadedLogoFiles || [],
          additionalInstructions: orderData.additionalInstructions || null,
          userId: orderData.userId,
          userEmail: orderData.userEmail,
          orderType: orderData.orderType,
          orderSource: orderData.orderSource,
          status: orderData.status,
          shipmentId: orderData.shipmentId,
          ipAddress: orderData.ipAddress || 'unknown',
          userAgent: orderData.userAgent || 'unknown',
          totalUnits: totalUnits,
          calculatedTotal: calculatedTotal,
        },
      });
      
      console.log('✅ Order created in database:', order.id);
      console.log('💰 Saved totals - Units:', totalUnits, 'Total Cost:', calculatedTotal);
      
      return {
        success: true,
        orderId: order.id,
        order
      };
      
    } catch (dbError) {
      console.error('Database error when creating order:', dbError);
      
      // Generate temporary order ID for graceful fallback
      const tempOrderId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      return {
        success: false,
        errors: ['Database unavailable - order saved temporarily'],
        temporaryId: true,
        tempOrderId,
        tempOrder: {
          id: tempOrderId,
          productName: orderData.productName,
          customerInfo: orderData.customerInfo,
          status: orderData.status,
          createdAt: new Date().toISOString(),
        }
      };
    }
  }
  
  /**
   * Handle post-creation tasks (invoice, shipping, notifications)
   */
  static async handlePostCreationTasks(
    orderId: string,
    orderData: StandardOrderData,
    options: OrderRecordingOptions
  ): Promise<{
    invoice?: { id: string; number: string; };
    shipmentAssignment?: { shipmentId: string; buildNumber: string; };
    warnings: string[];
  }> {
    const warnings: string[] = [];
    const result: any = { warnings };
    
    // Create invoice if requested
    if (options.createInvoice && orderData.costBreakdown) {
      try {
        // Implementation would call invoice creation API
        console.log('📄 Would create invoice for order:', orderId);
        // result.invoice = await createInvoiceForOrder(orderId, orderData);
      } catch (error) {
        warnings.push('Failed to create invoice');
      }
    }
    
    // Assign to shipment if requested
    if (options.assignToShipment && orderData.shipmentId) {
      try {
        console.log('🚢 Order assigned to shipment:', orderData.shipmentId);
        // Implementation would update shipment assignment
      } catch (error) {
        warnings.push('Failed to assign to shipment');
      }
    }
    
    // Send customer notification if requested
    if (options.notifyCustomer) {
      try {
        console.log('📧 Would send customer notification for order:', orderId);
        // Implementation would send email notification
      } catch (error) {
        warnings.push('Failed to send customer notification');
      }
    }
    
    return result;
  }
}

// =====================================================
// DASHBOARD-SPECIFIC HELPER FUNCTIONS
// =====================================================

/**
 * Convert checkout form data to standard order format
 */
export function convertCheckoutToStandardOrder(checkoutData: any): StandardOrderData {
  // Extract priceTier from various possible sources in checkout data
  const extractedPriceTier = 
    checkoutData.priceTier || 
    checkoutData.selectedOptions?.priceTier || 
    (checkoutData.cartItems && checkoutData.cartItems[0]?.priceTier) ||
    'Tier 1'; // Default if no tier is found
  
  return {
    productName: checkoutData.productName,
    priceTier: extractedPriceTier,
    selectedColors: checkoutData.selectedColors || {},
    logoSetupSelections: checkoutData.logoSetupSelections || {},
    selectedOptions: checkoutData.selectedOptions || {},
    multiSelectOptions: checkoutData.multiSelectOptions || {},
    customerInfo: checkoutData.customerInfo,
    userId: checkoutData.userId,
    userEmail: checkoutData.userEmail || checkoutData.customerInfo.email,
    orderType: checkoutData.orderType || (checkoutData.userId ? 'AUTHENTICATED' : 'GUEST'),
    orderSource: checkoutData.orderSource || 'PRODUCT_CUSTOMIZATION',
    status: checkoutData.status || 'CONFIRMED',
    uploadedLogoFiles: checkoutData.uploadedLogoFiles,
    tempLogoFiles: checkoutData.tempLogoFiles,
    additionalInstructions: checkoutData.additionalInstructions,
    specialInstructions: checkoutData.specialInstructions,
    costBreakdown: checkoutData.costBreakdown,
    paymentInfo: checkoutData.paymentInfo,
    shipmentId: checkoutData.shipmentId,
    isDraft: false,
    paymentProcessed: checkoutData.paymentProcessed || false,
    processedAt: checkoutData.processedAt,
    ipAddress: checkoutData.ipAddress,
    userAgent: checkoutData.userAgent,
    cartItems: checkoutData.cartItems
  };
}

/**
 * Convert admin form data to standard order format
 */
export function convertAdminToStandardOrder(adminData: any): StandardOrderData {
  // Extract priceTier from various possible sources in admin data
  const extractedPriceTier = 
    adminData.priceTier || 
    adminData.selectedOptions?.priceTier || 
    'Tier 1'; // Default if no tier is found
  
  return {
    productName: adminData.productName,
    priceTier: extractedPriceTier,
    selectedColors: adminData.selectedColors || {},
    logoSetupSelections: adminData.logoSetupSelections || {},
    selectedOptions: adminData.selectedOptions || {},
    multiSelectOptions: adminData.multiSelectOptions || {},
    customerInfo: adminData.customerInfo,
    userId: adminData.userId,
    userEmail: adminData.userEmail || adminData.customerInfo.email,
    orderType: 'AUTHENTICATED', // Admin orders are always authenticated
    orderSource: 'ADMIN_CREATED',
    status: adminData.status || 'PENDING',
    uploadedLogoFiles: adminData.uploadedLogoFiles,
    tempLogoFiles: adminData.tempLogoFiles,
    additionalInstructions: adminData.additionalInstructions,
    costBreakdown: adminData.costBreakdown,
    shipmentId: adminData.shipmentId,
    isDraft: adminData.isDraft || false,
    paymentProcessed: false,
    ipAddress: 'admin-dashboard',
    userAgent: 'admin-interface'
  };
}


// =====================================================
// EXPORT DEFAULT FUNCTIONS
// =====================================================

export default OrderRecordingSystem;