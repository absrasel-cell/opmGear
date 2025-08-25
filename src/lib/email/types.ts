export interface InvoiceEmailPayload {
  to: string;
  invoiceId: string;
  downloadLink: string;
  invoiceNumber?: string;
  customerName?: string;
  total?: string;
}

export interface EmailProvider {
  sendInvoiceEmail(payload: InvoiceEmailPayload): Promise<void>;
}