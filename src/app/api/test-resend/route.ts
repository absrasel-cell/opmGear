import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/resend';
import { emailTemplates } from '@/lib/email/templates';

export async function GET(request: NextRequest) {
 try {
  // Check if Resend is properly configured
  if (!process.env.RESEND_API_KEY) {
   return NextResponse.json({
    error: 'Resend API key not configured',
    note: 'Please add RESEND_API_KEY to your .env.local file'
   }, { status: 400 });
  }

  if (!process.env.FROM_EMAIL) {
   return NextResponse.json({
    error: 'FROM_EMAIL not configured',
    note: 'Please add FROM_EMAIL to your .env.local file'
   }, { status: 400 });
  }

  // Get test email from query params or use default
  const { searchParams } = new URL(request.url);
  const testEmail = searchParams.get('email') || 'test@example.com';
  const templateType = searchParams.get('template') || 'welcome';

  console.log(`🧪 Testing Resend email to: ${testEmail} with template: ${templateType}`);

  let emailContent = '';
  let subject = '';

  // Generate different test templates based on template type
  switch (templateType) {
   case 'welcome':
    subject = 'Welcome to US Custom Cap!';
    emailContent = emailTemplates.welcome({
     name: 'Test User',
     email: testEmail
    });
    break;

   case 'order-status':
    subject = 'Order Status Update - US Custom Cap';
    emailContent = emailTemplates.orderStatus({
     id: 'TEST-ORDER-123',
     productName: 'Custom Baseball Cap - Navy Blue',
     customerInfo: { name: 'Test Customer' },
     createdAt: new Date().toISOString()
    }, 'CONFIRMED');
    break;

   case 'invoice':
    subject = 'Invoice #INV-001 - US Custom Cap';
    emailContent = emailTemplates.invoice({
     number: 'INV-001',
     issueDate: new Date(),
     dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
     total: '299.99',
     id: 'test-invoice-123'
    }, {
     id: 'TEST-ORDER-123',
     customerInfo: { name: 'Test Customer' }
    });
    break;

   case 'password-reset':
    subject = 'Reset Your Password - US Custom Cap';
    emailContent = emailTemplates.passwordReset('https://uscustomcap.com/reset-password?token=test123', 'Test User');
    break;

   case 'quote-ready':
    subject = 'Your Quote is Ready - US Custom Cap';
    emailContent = emailTemplates.quoteReady({
     id: 'QUOTE-123',
     productName: 'Custom Baseball Cap Collection',
     customerInfo: { name: 'Test Customer' },
     createdAt: new Date().toISOString()
    });
    break;

   case 'message-notification':
    subject = 'New Message - US Custom Cap';
    emailContent = emailTemplates.messageNotification({
     senderName: 'Support Team',
     recipientName: 'Test Customer',
     category: 'SUPPORT',
     priority: 'NORMAL',
     content: 'This is a test message to verify the email notification system is working correctly.'
    }, 'https://uscustomcap.com/messages/test-conversation');
    break;

   default:
    return NextResponse.json({
     error: 'Invalid template type',
     availableTemplates: ['welcome', 'order-status', 'invoice', 'password-reset', 'quote-ready', 'message-notification']
    }, { status: 400 });
  }

  // Send the test email
  const result = await sendEmail({
   to: testEmail,
   subject,
   html: emailContent,
   from: process.env.FROM_EMAIL || 'noreply@uscustomcap.com'
  });

  if (result.success) {
   return NextResponse.json({
    message: 'Test email sent successfully!',
    emailId: result.id,
    template: templateType,
    recipient: testEmail,
    timestamp: new Date().toISOString()
   });
  } else {
   return NextResponse.json({
    error: 'Failed to send test email',
    details: result.error
   }, { status: 500 });
  }

 } catch (error) {
  console.error('❌ Test email error:', error);
  return NextResponse.json({
   error: 'Test email failed',
   details: error instanceof Error ? error.message : 'Unknown error'
  }, { status: 500 });
 }
}

export async function POST(request: NextRequest) {
 try {
  const body = await request.json();
  const { to, subject, html, text, template, templateData } = body;

  if (!process.env.RESEND_API_KEY) {
   return NextResponse.json({
    error: 'Resend not configured'
   }, { status: 400 });
  }

  let emailContent = html;
  let emailSubject = subject;

  // If template is specified, generate content from template
  if (template && templateData) {
   switch (template) {
    case 'welcome':
     emailContent = emailTemplates.welcome(templateData);
     emailSubject = emailSubject || 'Welcome to US Custom Cap!';
     break;
    case 'order-status':
     emailContent = emailTemplates.orderStatus(templateData.order, templateData.status, templateData.trackingNumber);
     emailSubject = emailSubject || 'Order Status Update - US Custom Cap';
     break;
    // Add more template cases as needed
   }
  }

  const result = await sendEmail({
   to,
   subject: emailSubject,
   html: emailContent,
   text
  });

  return NextResponse.json(result);

 } catch (error) {
  console.error('❌ Email API error:', error);
  return NextResponse.json({
   error: 'Failed to send email',
   details: error instanceof Error ? error.message : 'Unknown error'
  }, { status: 500 });
 }
}