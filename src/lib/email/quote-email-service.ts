import { emailProvider } from './index';
import { QuoteEmailPayload, AdminQuoteNotificationPayload } from './types';

interface QuoteOrderWithDetails {
  id: string;
  sessionId: string;
  title: string | null;
  status: string;
  priority: string;
  complexity: string;
  customerEmail: string | null;
  customerName: string | null;
  customerPhone: string | null;
  customerCompany: string | null;
  customerAddress: any;
  productType: string | null;
  quantities: any;
  colors: any;
  logoRequirements: any;
  customizationOptions: any;
  extractedSpecs: any;
  estimatedCosts: any;
  aiSummary: string | null;
  additionalRequirements: string | null;
  customerInstructions: string | null;
  internalNotes: string | null;
  tags: string[];
  files?: any[];
  createdAt: Date;
  updatedAt: Date;
  lastActivityAt: Date;
  completedAt: Date | null;
}

export class QuoteEmailService {
  /**
   * Send quote receipt email to customer
   */
  static async sendCustomerQuoteEmail(
    quote: QuoteOrderWithDetails,
    pdfDownloadLink: string
  ): Promise<void> {
    if (!quote.customerEmail) {
      console.warn('No customer email provided for quote:', quote.id);
      return;
    }

    try {
      // Extract data for email
      const quoteNumber = `#${quote.id.slice(-8)}`;
      const total = quote.estimatedCosts?.total || 0;
      const quantity = quote.quantities?.quantity || quote.extractedSpecs?.quantity || 1;

      const payload: QuoteEmailPayload = {
        to: quote.customerEmail,
        quoteId: quote.id,
        quoteNumber: quoteNumber,
        pdfDownloadLink: pdfDownloadLink,
        customerName: quote.customerName || undefined,
        customerCompany: quote.customerCompany || undefined,
        total: total ? total.toString() : undefined,
        quantity: quantity,
        productType: quote.productType || 'Custom Cap',
        quoteDetails: {
          productSpecs: quote.extractedSpecs,
          logoRequirements: quote.logoRequirements,
          customization: quote.customizationOptions,
          estimatedCosts: quote.estimatedCosts,
          deliveryDetails: quote.customizationOptions?.delivery,
          orderBuilderData: quote.estimatedCosts?.orderBuilderData // Pass comprehensive Order Builder data
        }
      };

      await emailProvider.sendQuoteEmail(payload);
      console.log('✅ Customer quote email sent successfully to:', quote.customerEmail);
    } catch (error) {
      console.error('❌ Failed to send customer quote email:', error);
      throw error;
    }
  }

  /**
   * Send admin notification email when new quote is generated
   */
  static async sendAdminQuoteNotification(
    quote: QuoteOrderWithDetails,
    pdfDownloadLink: string,
    dashboardLink?: string
  ): Promise<void> {
    try {
      // Admin email - get from environment or use default
      const adminEmail = process.env.ADMIN_EMAIL || 'absrasel@gmail.com';

      // Default dashboard link if not provided
      const defaultDashboardLink = dashboardLink ||
        `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/dashboard/admin/quotes?quote=${quote.id}`;

      const quoteNumber = `#${quote.id.slice(-8)}`;
      const total = quote.estimatedCosts?.total || 0;
      const quantity = quote.quantities?.quantity || quote.extractedSpecs?.quantity || 1;

      const payload: AdminQuoteNotificationPayload = {
        to: adminEmail,
        quoteId: quote.id,
        quoteNumber: quoteNumber,
        customerName: quote.customerName || undefined,
        customerEmail: quote.customerEmail || undefined,
        customerCompany: quote.customerCompany || undefined,
        total: total ? total.toString() : undefined,
        quantity: quantity,
        productType: quote.productType || 'Custom Cap',
        dashboardLink: defaultDashboardLink,
        pdfDownloadLink: pdfDownloadLink,
        orderBuilderData: quote.estimatedCosts?.orderBuilderData, // Pass comprehensive Order Builder data
        quoteAcceptance: false // Default to false, will be overridden for acceptance notifications
      };

      await emailProvider.sendAdminQuoteNotification(payload);
      console.log('✅ Admin notification email sent successfully to:', adminEmail);
    } catch (error) {
      console.error('❌ Failed to send admin notification email:', error);
      throw error;
    }
  }

  /**
   * Send admin notification for quote acceptance
   */
  static async sendAdminQuoteAcceptanceNotification(
    quote: QuoteOrderWithDetails,
    pdfDownloadLink: string,
    dashboardLink?: string
  ): Promise<void> {
    try {
      // Admin email - get from environment or use default
      const adminEmail = process.env.ADMIN_EMAIL || 'absrasel@gmail.com';

      // Default dashboard link if not provided
      const defaultDashboardLink = dashboardLink ||
        `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/dashboard/admin/quotes?quote=${quote.id}`;

      const quoteNumber = `#${quote.id.slice(-8)}`;
      const total = quote.estimatedCosts?.total || 0;
      const quantity = quote.quantities?.quantity || quote.extractedSpecs?.quantity || 1;

      const payload: AdminQuoteNotificationPayload = {
        to: adminEmail,
        quoteId: quote.id,
        quoteNumber: quoteNumber,
        customerName: quote.customerName || undefined,
        customerEmail: quote.customerEmail || undefined,
        customerCompany: quote.customerCompany || undefined,
        total: total ? total.toString() : undefined,
        quantity: quantity,
        productType: quote.productType || 'Custom Cap',
        dashboardLink: defaultDashboardLink,
        pdfDownloadLink: pdfDownloadLink,
        orderBuilderData: quote.estimatedCosts?.orderBuilderData, // Pass comprehensive Order Builder data
        quoteAcceptance: true // Flag as acceptance notification
      };

      await emailProvider.sendAdminQuoteNotification(payload);
      console.log('✅ Admin quote acceptance email sent successfully to:', adminEmail);
    } catch (error) {
      console.error('❌ Failed to send admin quote acceptance email:', error);
      throw error;
    }
  }

  /**
   * Send both customer and admin emails for a quote
   */
  static async sendQuoteEmails(
    quote: QuoteOrderWithDetails,
    pdfDownloadLink: string,
    options?: {
      sendToCustomer?: boolean;
      sendToAdmin?: boolean;
      dashboardLink?: string;
      isAcceptance?: boolean; // New flag for acceptance notifications
    }
  ): Promise<{ customerEmailSent: boolean; adminEmailSent: boolean }> {
    const { sendToCustomer = true, sendToAdmin = true, dashboardLink, isAcceptance = false } = options || {};

    const results = {
      customerEmailSent: false,
      adminEmailSent: false
    };

    // Send customer email
    if (sendToCustomer && quote.customerEmail) {
      try {
        await this.sendCustomerQuoteEmail(quote, pdfDownloadLink);
        results.customerEmailSent = true;
      } catch (error) {
        console.error('Customer email failed:', error);
        // Don't throw - let admin email still proceed
      }
    }

    // Send admin notification (use acceptance version if needed)
    if (sendToAdmin) {
      try {
        if (isAcceptance) {
          await this.sendAdminQuoteAcceptanceNotification(quote, pdfDownloadLink, dashboardLink);
        } else {
          await this.sendAdminQuoteNotification(quote, pdfDownloadLink, dashboardLink);
        }
        results.adminEmailSent = true;
      } catch (error) {
        console.error('Admin notification failed:', error);
        // Don't throw - partial success is still valuable
      }
    }

    return results;
  }

  /**
   * Generate PDF download link for a quote
   */
  static generatePdfDownloadLink(quoteId: string, baseUrl?: string): string {
    const base = baseUrl || process.env.NEXTAUTH_URL || 'http://localhost:3000';
    return `${base}/api/quotes/${quoteId}/pdf`;
  }

  /**
   * Generate dashboard link for admin to view quote
   */
  static generateDashboardLink(quoteId: string, baseUrl?: string): string {
    const base = baseUrl || process.env.NEXTAUTH_URL || 'http://localhost:3000';
    return `${base}/dashboard/admin/quotes?quote=${quoteId}`;
  }
}