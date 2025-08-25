import { Resend } from 'resend';
import { EmailProvider, InvoiceEmailPayload } from '../types';

export class ResendProvider implements EmailProvider {
  private resend: Resend;

  constructor(apiKey: string = process.env.RESEND_API_KEY!) {
    if (!apiKey) {
      throw new Error('RESEND_API_KEY is required for ResendProvider');
    }
    this.resend = new Resend(apiKey);
  }

  async sendInvoiceEmail(payload: InvoiceEmailPayload): Promise<void> {
    try {
      const { data, error } = await this.resend.emails.send({
        from: 'OPM Gear <noreply@opmgear.com>',
        to: [payload.to],
        subject: `Invoice ${payload.invoiceNumber || payload.invoiceId} - OPM Gear`,
        html: this.generateEmailHtml(payload),
        text: this.generateEmailText(payload)
      });

      if (error) {
        console.error('Failed to send invoice email:', error);
        throw new Error(`Failed to send email: ${error.message}`);
      }

      console.log('Invoice email sent successfully:', data);
    } catch (error) {
      console.error('Error sending invoice email:', error);
      throw error;
    }
  }

  private generateEmailHtml(payload: InvoiceEmailPayload): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">OPM Gear</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Custom Baseball Caps</p>
        </div>
        
        <div style="padding: 40px 30px; background: white;">
          <h2 style="color: #333; margin: 0 0 20px 0;">Your Invoice is Ready</h2>
          
          <p style="color: #666; line-height: 1.6;">
            Hi${payload.customerName ? ` ${payload.customerName}` : ''},
          </p>
          
          <p style="color: #666; line-height: 1.6;">
            Your invoice <strong>${payload.invoiceNumber || payload.invoiceId}</strong> is now available for download.
            ${payload.total ? ` The total amount is <strong>$${payload.total}</strong>.` : ''}
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${payload.downloadLink}" 
               style="background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
              Download Invoice PDF
            </a>
          </div>
          
          <p style="color: #666; line-height: 1.6; font-size: 14px;">
            If you have any questions about this invoice, please don't hesitate to contact us.
          </p>
          
          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; color: #999; font-size: 12px;">
            <p>This email was sent by OPM Gear. If you have any questions, please contact our support team.</p>
          </div>
        </div>
      </div>
    `;
  }

  private generateEmailText(payload: InvoiceEmailPayload): string {
    return `
OPM Gear - Your Invoice is Ready

Hi${payload.customerName ? ` ${payload.customerName}` : ''},

Your invoice ${payload.invoiceNumber || payload.invoiceId} is now available for download.
${payload.total ? `The total amount is $${payload.total}.` : ''}

Download your invoice: ${payload.downloadLink}

If you have any questions about this invoice, please don't hesitate to contact us.

Best regards,
The OPM Gear Team
    `.trim();
  }
}