import { EmailProvider, InvoiceEmailPayload } from '../types';

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
}