export interface InvoiceEmailPayload {
  to: string;
  invoiceId: string;
  downloadLink: string;
  invoiceNumber?: string;
  customerName?: string;
  total?: string;
}

export interface QuoteEmailPayload {
  to: string;
  quoteId: string;
  quoteNumber: string;
  pdfDownloadLink: string;
  customerName?: string;
  customerCompany?: string;
  total?: string;
  quantity?: number;
  productType?: string;
  quoteDetails: {
    productSpecs?: any;
    logoRequirements?: any;
    customization?: any;
    estimatedCosts?: any;
    deliveryDetails?: any;
    orderBuilderData?: any; // Add Order Builder data for comprehensive breakdown
  };
}

export interface AdminQuoteNotificationPayload {
  to: string;
  quoteId: string;
  quoteNumber: string;
  customerName?: string;
  customerEmail?: string;
  customerCompany?: string;
  total?: string;
  quantity?: number;
  productType?: string;
  dashboardLink: string;
  pdfDownloadLink: string;
  orderBuilderData?: any; // Add Order Builder data for admin dashboard display
  quoteAcceptance?: boolean; // Flag to indicate if this is an acceptance notification
}

export interface EmailProvider {
  sendInvoiceEmail(payload: InvoiceEmailPayload): Promise<void>;
  sendQuoteEmail(payload: QuoteEmailPayload): Promise<void>;
  sendAdminQuoteNotification(payload: AdminQuoteNotificationPayload): Promise<void>;
}