import { EmailProvider, InvoiceEmailPayload, QuoteEmailPayload, AdminQuoteNotificationPayload } from '../types';

export class NoopProvider implements EmailProvider {
  async sendInvoiceEmail(payload: InvoiceEmailPayload): Promise<void> {
    console.log('NOOP Email Provider: Would send invoice email', {
      to: payload.to,
      invoiceId: payload.invoiceId,
      downloadLink: payload.downloadLink,
      invoiceNumber: payload.invoiceNumber
    });

    // Simulate successful sending with no actual email
    return Promise.resolve();
  }

  async sendQuoteEmail(payload: QuoteEmailPayload): Promise<void> {
    console.log('NOOP Email Provider: Would send quote email', {
      to: payload.to,
      quoteId: payload.quoteId,
      quoteNumber: payload.quoteNumber,
      customerName: payload.customerName,
      total: payload.total,
      pdfDownloadLink: payload.pdfDownloadLink
    });

    // Simulate successful sending with no actual email
    return Promise.resolve();
  }

  async sendAdminQuoteNotification(payload: AdminQuoteNotificationPayload): Promise<void> {
    console.log('NOOP Email Provider: Would send admin quote notification', {
      to: payload.to,
      quoteId: payload.quoteId,
      quoteNumber: payload.quoteNumber,
      customerName: payload.customerName,
      customerEmail: payload.customerEmail,
      total: payload.total,
      dashboardLink: payload.dashboardLink
    });

    // Simulate successful sending with no actual email
    return Promise.resolve();
  }
}