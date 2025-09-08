import { calcInvoiceFromOrder } from './calc';

// Define Order interface for Supabase
interface Order {
  id: string;
  userId?: string | null;
  productName?: string;
  selectedOptions?: any;
  selectedColors?: any;
  createdAt?: string;
  updatedAt?: string;
}

interface OrderWithDetails extends Order {
  user?: {
    customerRole?: 'RETAIL' | 'WHOLESALE' | 'SUPPLIER';
  };
}

// Use regular number instead of Prisma Decimal
type Decimal = number;

interface SimpleInvoiceItem {
  name: string;
  description: string;
  quantity: number;
  unitPrice: Decimal;
  total: Decimal;
}

interface SimpleInvoiceCalculation {
  items: SimpleInvoiceItem[];
  subtotal: Decimal;
  discount: Decimal;
  shipping: Decimal;
  tax: Decimal;
  total: Decimal;
  breakdown: {
    blankCapCost: Decimal;
    logoSetupCost: Decimal;
    accessoriesCost: Decimal;
    deliveryCost: Decimal;
  };
}

/**
 * Creates a simplified invoice with a single line item for customer-facing invoices
 * This provides a clean presentation while maintaining accurate pricing
 */
export async function calcSimpleInvoiceFromOrder(order: OrderWithDetails): Promise<SimpleInvoiceCalculation> {
  // Get the detailed calculation using Order Management system for consistency
  const detailedCalculation = await calcInvoiceFromOrder(order);
  
  // Extract basic order information
  const selectedOptions = typeof order.selectedOptions === 'string' 
    ? JSON.parse(order.selectedOptions) 
    : order.selectedOptions || {};
    
  const selectedColors = typeof order.selectedColors === 'string'
    ? JSON.parse(order.selectedColors)
    : order.selectedColors || {};

  // Calculate total quantity
  let totalQuantity = 0;
  Object.values(selectedColors).forEach((colorData: any) => {
    if (colorData?.sizes) {
      Object.values(colorData.sizes).forEach((qty: any) => {
        totalQuantity += parseInt(qty) || 0;
      });
    }
  });

  if (totalQuantity === 0) {
    totalQuantity = selectedOptions.quantity || selectedOptions.volume || 1;
  }

  // Create simplified description with cost breakdown
  const breakdownParts = [];
  
  if (detailedCalculation.breakdown.blankCapCost > 0) {
    breakdownParts.push(`Caps: ${formatCurrency(detailedCalculation.breakdown.blankCapCost)}`);
  }
  
  if (detailedCalculation.breakdown.logoSetupCost > 0) {
    breakdownParts.push(`Logos: ${formatCurrency(detailedCalculation.breakdown.logoSetupCost)}`);
  }
  
  if (detailedCalculation.breakdown.accessoriesCost > 0) {
    breakdownParts.push(`Options: ${formatCurrency(detailedCalculation.breakdown.accessoriesCost)}`);
  }
  
  if (detailedCalculation.breakdown.deliveryCost > 0) {
    breakdownParts.push(`Delivery: ${formatCurrency(detailedCalculation.breakdown.deliveryCost)}`);
  }

  // Create description
  const productName = order.productName || 'Custom Cap Order';
  let description = `Complete order with ${totalQuantity} units including customization`;
  
  if (breakdownParts.length > 0) {
    description += ` (${breakdownParts.join(', ')})`;
  }

  // Create single line item
  const items: SimpleInvoiceItem[] = [{
    name: productName,
    description,
    quantity: 1,
    unitPrice: detailedCalculation.subtotal,
    total: detailedCalculation.subtotal
  }];

  return {
    items,
    subtotal: detailedCalculation.subtotal,
    discount: detailedCalculation.discount,
    shipping: detailedCalculation.shipping,
    tax: detailedCalculation.tax,
    total: detailedCalculation.total,
    breakdown: detailedCalculation.breakdown
  };
}

function formatCurrency(amount: Decimal): string {
  return `$${amount.toFixed(2)}`;
}