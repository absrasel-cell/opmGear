import { sendEmail } from '@/lib/resend';
import { emailTemplates } from '@/lib/email/templates';
import { 
  prepareFileAttachmentsFromUrls, 
  filterAttachmentsForEmail, 
  createAttachmentSummary,
  EmailAttachment 
} from '@/lib/email/file-attachment-helper';

interface EmailNotificationConfig {
  retryAttempts?: number;
  retryDelay?: number;
  fallbackEmail?: string;
}

interface TraditionalQuoteData {
  id: string;
  productName: string;
  customerInfo: {
    name: string;
    email: string;
    phone: string;
    company?: string;
  };
  requirements: {
    quantity: string;
    colors: string;
    sizes: string;
    customization: string;
    timeline: string;
    additionalNotes?: string;
  };
  status: string;
  createdAt: string;
  ipAddress?: string;
  userAgent?: string;
}

interface AIQuoteData {
  id: string;
  sessionId: string;
  productType: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  customerCompany?: string;
  status: string;
  quantities?: { quantity: number };
  estimatedCosts?: {
    baseProductCost?: number;
    logosCost?: number;
    deliveryCost?: number;
    total?: number;
  };
  uploadedFiles?: string[];
  logoFiles?: string[];
  logoRequirements?: any;
  extractedSpecs?: any;
  aiSummary?: string;
  createdAt: string;
}

/**
 * Enhanced email notification service with retry logic and fallbacks
 */
export class EmailNotificationService {
  private config: EmailNotificationConfig;

  constructor(config: EmailNotificationConfig = {}) {
    this.config = {
      retryAttempts: 3,
      retryDelay: 1000,
      fallbackEmail: process.env.ADMIN_EMAIL || 'admin@uscustomcap.com',
      ...config
    };
  }

  /**
   * Send traditional quote notifications
   */
  async sendTraditionalQuoteNotifications(quoteData: TraditionalQuoteData): Promise<{
    customerSuccess: boolean;
    adminSuccess: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];
    let customerSuccess = false;
    let adminSuccess = false;

    // Send customer receipt email
    if (quoteData.customerInfo.email) {
      try {
        const customerResult = await this.sendEmailWithRetry({
          to: quoteData.customerInfo.email,
          subject: `Quote Request Received #${quoteData.id} - US Custom Cap`,
          html: emailTemplates.traditionalQuoteReceipt(quoteData),
          from: process.env.FROM_EMAIL || 'noreply@uscustomcap.com'
        });
        
        customerSuccess = customerResult.success;
        if (!customerSuccess) {
          errors.push(`Customer email failed: ${customerResult.error}`);
        }
      } catch (error) {
        errors.push(`Customer email error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Send admin notification email
    try {
      const adminResult = await this.sendEmailWithRetry({
        to: process.env.ADMIN_EMAIL || 'admin@uscustomcap.com',
        cc: process.env.QUOTES_EMAIL || 'quotes@uscustomcap.com',
        subject: `New Traditional Quote Request #${quoteData.id} - Action Required`,
        html: emailTemplates.adminTraditionalQuoteNotification(quoteData),
        from: process.env.FROM_EMAIL || 'noreply@uscustomcap.com'
      });
      
      adminSuccess = adminResult.success;
      if (!adminSuccess) {
        errors.push(`Admin email failed: ${adminResult.error}`);
      }
    } catch (error) {
      errors.push(`Admin email error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Log results
    console.log(`📧 Traditional quote notifications for ${quoteData.id}:`, {
      customerSuccess,
      adminSuccess,
      errorCount: errors.length
    });

    return { customerSuccess, adminSuccess, errors };
  }

  /**
   * Send AI quote notifications with file attachments
   */
  async sendAIQuoteNotifications(quoteData: AIQuoteData, uploadedFiles: string[] = []): Promise<{
    customerSuccess: boolean;
    adminSuccess: boolean;
    attachmentCount: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let customerSuccess = false;
    let adminSuccess = false;
    let attachmentCount = 0;

    // Send customer receipt email
    if (quoteData.customerEmail) {
      try {
        const customerResult = await this.sendEmailWithRetry({
          to: quoteData.customerEmail,
          subject: `AI Quote Generated #${quoteData.id} - US Custom Cap`,
          html: emailTemplates.aiQuoteReceipt(quoteData),
          from: process.env.FROM_EMAIL || 'noreply@uscustomcap.com'
        });
        
        customerSuccess = customerResult.success;
        if (!customerSuccess) {
          errors.push(`Customer email failed: ${customerResult.error}`);
        }
      } catch (error) {
        errors.push(`Customer email error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Prepare file attachments for admin notification
    let attachments: EmailAttachment[] = [];
    let attachmentSummary = '';
    
    if (uploadedFiles && uploadedFiles.length > 0) {
      try {
        console.log(`📎 Preparing ${uploadedFiles.length} file attachments for AI quote ${quoteData.id}`);
        
        const fileAttachments = await prepareFileAttachmentsFromUrls(uploadedFiles);
        const { validAttachments, skippedFiles, totalSize } = filterAttachmentsForEmail(fileAttachments);
        
        attachments = validAttachments;
        attachmentCount = validAttachments.length;
        attachmentSummary = createAttachmentSummary(validAttachments, skippedFiles);
        
        console.log(`📎 Prepared ${validAttachments.length} attachments (${Math.round(totalSize / 1024)}KB)`);
        
      } catch (attachmentError) {
        errors.push(`File attachment error: ${attachmentError instanceof Error ? attachmentError.message : 'Unknown error'}`);
        attachmentSummary = `

⚠️ **File Attachment Error:** Unable to attach files. Files can be accessed through the admin dashboard.`;
      }
    }

    // Send admin notification email with attachments
    try {
      const adminEmailContent = emailTemplates.adminAIQuoteNotification(quoteData, attachments);
      
      const adminResult = await this.sendEmailWithRetry({
        to: process.env.ADMIN_EMAIL || 'admin@uscustomcap.com',
        cc: process.env.QUOTES_EMAIL || 'quotes@uscustomcap.com',
        subject: `New AI Quote #${quoteData.id} - Review Required`,
        html: adminEmailContent + attachmentSummary,
        attachments: attachments.length > 0 ? attachments : undefined,
        from: process.env.FROM_EMAIL || 'noreply@uscustomcap.com'
      });
      
      adminSuccess = adminResult.success;
      if (!adminSuccess) {
        errors.push(`Admin email failed: ${adminResult.error}`);
      }
    } catch (error) {
      errors.push(`Admin email error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Log results
    console.log(`📧 AI quote notifications for ${quoteData.id}:`, {
      customerSuccess,
      adminSuccess,
      attachmentCount,
      errorCount: errors.length
    });

    return { customerSuccess, adminSuccess, attachmentCount, errors };
  }

  /**
   * Send email with retry logic
   */
  private async sendEmailWithRetry(emailData: any, attempt: number = 1): Promise<any> {
    try {
      const result = await sendEmail(emailData);
      
      if (result.success || attempt >= this.config.retryAttempts!) {
        return result;
      }
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, this.config.retryDelay! * attempt));
      
      console.log(`📧 Retrying email send (attempt ${attempt + 1}/${this.config.retryAttempts})`);
      return this.sendEmailWithRetry(emailData, attempt + 1);
      
    } catch (error) {
      if (attempt >= this.config.retryAttempts!) {
        throw error;
      }
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, this.config.retryDelay! * attempt));
      
      console.log(`📧 Retrying email send after error (attempt ${attempt + 1}/${this.config.retryAttempts})`);
      return this.sendEmailWithRetry(emailData, attempt + 1);
    }
  }

  /**
   * Send fallback notification for critical failures
   */
  async sendFallbackNotification(type: 'traditional' | 'ai', quoteId: string, originalErrors: string[]): Promise<void> {
    try {
      await sendEmail({
        to: this.config.fallbackEmail!,
        subject: `Email Notification Failure - ${type.toUpperCase()} Quote #${quoteId}`,
        html: `
          <h2>Email Notification System Alert</h2>
          <p><strong>Quote ID:</strong> ${quoteId}</p>
          <p><strong>Quote Type:</strong> ${type.toUpperCase()}</p>
          <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
          
          <h3>Errors:</h3>
          <ul>
            ${originalErrors.map(error => `<li>${error}</li>`).join('')}
          </ul>
          
          <p>Please check the quote management system and manually follow up with the customer if needed.</p>
        `,
        from: process.env.FROM_EMAIL || 'noreply@uscustomcap.com'
      });
      
      console.log(`📧 Fallback notification sent for quote ${quoteId}`);
    } catch (fallbackError) {
      console.error(`❌ Fallback notification failed for quote ${quoteId}:`, fallbackError);
    }
  }
}

// Export singleton instance
export const emailNotificationService = new EmailNotificationService();