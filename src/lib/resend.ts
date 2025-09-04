import { Resend } from 'resend';

// Initialize Resend with API key
const resend = new Resend(process.env.RESEND_API_KEY);

export { resend };

// Email sending utility with error handling and logging
export async function sendEmail({
  to,
  subject,
  html,
  text,
  from = process.env.FROM_EMAIL || 'noreply@uscustomcap.com',
  replyTo,
  cc,
  bcc,
  attachments
}: {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  replyTo?: string;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: Array<{
    filename: string;
    content: string | Buffer;
    contentType?: string;
  }>;
}) {
  try {
    console.log(`📧 Sending email to: ${Array.isArray(to) ? to.join(', ') : to}`);
    console.log(`📧 Subject: ${subject}`);
    
    const emailData: any = {
      from,
      to,
      subject,
      replyTo,
      cc,
      bcc,
      attachments
    };

    // Add content - prefer HTML over text
    if (html) {
      emailData.html = html;
    } else if (text) {
      emailData.text = text;
    } else {
      throw new Error('Either html or text content is required');
    }

    const result = await resend.emails.send(emailData);
    
    console.log('✅ Email sent successfully:', result.data?.id);
    return {
      success: true,
      id: result.data?.id,
      data: result.data
    };
  } catch (error) {
    console.error('❌ Email send failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

// Bulk email sending with rate limiting
export async function sendBulkEmails(
  emails: Array<{
    to: string;
    subject: string;
    html?: string;
    text?: string;
    from?: string;
  }>,
  options: {
    delayMs?: number; // Delay between emails to respect rate limits
    maxRetries?: number;
  } = {}
) {
  const { delayMs = 100, maxRetries = 3 } = options;
  const results = [];
  
  console.log(`📧 Starting bulk email send: ${emails.length} emails`);
  
  for (let i = 0; i < emails.length; i++) {
    const email = emails[i];
    let attempts = 0;
    let success = false;
    
    while (attempts < maxRetries && !success) {
      attempts++;
      
      try {
        const result = await sendEmail(email);
        results.push({ ...result, email: email.to });
        success = result.success;
        
        if (!success && attempts < maxRetries) {
          console.log(`🔄 Retrying email to ${email.to} (attempt ${attempts + 1})`);
          await new Promise(resolve => setTimeout(resolve, delayMs * attempts)); // Exponential backoff
        }
      } catch (error) {
        console.error(`❌ Failed to send email to ${email.to}:`, error);
        if (attempts >= maxRetries) {
          results.push({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            email: email.to
          });
        }
      }
    }
    
    // Rate limiting delay
    if (i < emails.length - 1) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  
  const successCount = results.filter(r => r.success).length;
  const failCount = results.length - successCount;
  
  console.log(`✅ Bulk email completed: ${successCount} sent, ${failCount} failed`);
  
  return {
    totalSent: successCount,
    totalFailed: failCount,
    results
  };
}

// Email template validation
export function validateEmailTemplate(template: {
  subject?: string;
  html?: string;
  text?: string;
}) {
  const errors = [];
  
  if (!template.subject || template.subject.trim().length === 0) {
    errors.push('Subject is required');
  }
  
  if (!template.html && !template.text) {
    errors.push('Either HTML or text content is required');
  }
  
  if (template.html && template.html.length > 100000) {
    errors.push('HTML content is too large (max 100KB)');
  }
  
  if (template.text && template.text.length > 100000) {
    errors.push('Text content is too large (max 100KB)');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

// Get email delivery status (requires Resend webhook setup)
export async function getEmailStatus(emailId: string) {
  try {
    // Note: This would require setting up Resend webhooks
    // For now, return a placeholder
    console.log(`📊 Checking status for email: ${emailId}`);
    return {
      success: true,
      status: 'delivered', // delivered, bounced, complained, etc.
      id: emailId
    };
  } catch (error) {
    console.error('❌ Failed to get email status:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}