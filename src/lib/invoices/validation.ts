import { z } from 'zod';
import { Order, Invoice } from '@prisma/client';

// Schema for validating invoice creation
export const createInvoiceSchema = z.object({
  orderId: z.string().min(1, 'Order ID is required'),
  notes: z.string().optional(),
  dueDate: z.string().datetime().optional(),
  simple: z.boolean().default(false),
  discountPercent: z.number().min(0).max(100).optional(),
  discountFlat: z.number().min(0).optional()
});

// Schema for validating invoice updates
export const updateInvoiceSchema = z.object({
  status: z.enum(['DRAFT', 'ISSUED', 'PAID', 'VOID', 'REFUNDED']).optional(),
  notes: z.string().optional(),
  dueDate: z.string().datetime().optional()
});

export interface InvoiceValidationError extends Error {
  code: 'VALIDATION_ERROR' | 'ORDER_NOT_FOUND' | 'CUSTOMER_REQUIRED' | 'INVOICE_EXISTS' | 'INVALID_STATUS';
  details?: any;
}

export class InvoiceError extends Error {
  public code: InvoiceValidationError['code'];
  public details?: any;

  constructor(message: string, code: InvoiceValidationError['code'], details?: any) {
    super(message);
    this.name = 'InvoiceError';
    this.code = code;
    this.details = details;
  }
}

// Validate order before invoice creation
export function validateOrderForInvoice(order: Order | null): void {
  if (!order) {
    throw new InvoiceError('Order not found', 'ORDER_NOT_FOUND');
  }

  if (!order.userId) {
    throw new InvoiceError(
      `Order ${order.id} must have a customer assigned before creating an invoice`,
      'CUSTOMER_REQUIRED',
      { orderId: order.id, productName: order.productName }
    );
  }

  // Validate order has required data
  if (!order.selectedOptions && !order.selectedColors) {
    throw new InvoiceError(
      'Order must have product configuration data',
      'VALIDATION_ERROR',
      { orderId: order.id }
    );
  }
}

// Validate invoice status transitions
export function validateStatusTransition(currentStatus: string, newStatus: string): void {
  const validTransitions: Record<string, string[]> = {
    'DRAFT': ['ISSUED', 'VOID'],
    'ISSUED': ['PAID', 'VOID', 'REFUNDED'],
    'PAID': ['REFUNDED'],
    'VOID': [], // No transitions from VOID
    'REFUNDED': [] // No transitions from REFUNDED
  };

  const allowedTransitions = validTransitions[currentStatus] || [];
  
  if (!allowedTransitions.includes(newStatus)) {
    throw new InvoiceError(
      `Cannot transition from ${currentStatus} to ${newStatus}`,
      'INVALID_STATUS',
      { currentStatus, newStatus, allowedTransitions }
    );
  }
}

// Validate existing invoice for regeneration
export function validateInvoiceForRegeneration(invoice: Invoice | null): void {
  if (!invoice) {
    return; // No existing invoice, can create new one
  }

  if (invoice.status !== 'DRAFT') {
    throw new InvoiceError(
      `Cannot regenerate invoice with status ${invoice.status}. Only DRAFT invoices can be regenerated.`,
      'INVALID_STATUS',
      { invoiceId: invoice.id, status: invoice.status }
    );
  }
}

// Validate invoice for deletion
export function validateInvoiceForDeletion(invoice: Invoice): void {
  const deletableStatuses = ['DRAFT', 'VOID'];
  
  if (!deletableStatuses.includes(invoice.status)) {
    throw new InvoiceError(
      `Cannot delete invoice with status ${invoice.status}. Only DRAFT or VOID invoices can be deleted.`,
      'INVALID_STATUS',
      { invoiceId: invoice.id, status: invoice.status }
    );
  }
}

// Validate invoice data integrity
export function validateInvoiceData(invoiceData: any): void {
  if (!invoiceData.items || invoiceData.items.length === 0) {
    throw new InvoiceError(
      'Invoice must have at least one line item',
      'VALIDATION_ERROR'
    );
  }

  const hasNegativeAmounts = invoiceData.items.some((item: any) => 
    item.unitPrice < 0 || item.total < 0
  );

  if (hasNegativeAmounts) {
    throw new InvoiceError(
      'Invoice items cannot have negative amounts',
      'VALIDATION_ERROR'
    );
  }

  if (invoiceData.total < 0) {
    throw new InvoiceError(
      'Invoice total cannot be negative',
      'VALIDATION_ERROR'
    );
  }
}