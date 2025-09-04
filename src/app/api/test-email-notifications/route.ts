import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/resend';
import { emailTemplates } from '@/lib/email/templates';

/**
 * Test endpoint for email notifications
 * GET /api/test-email-notifications?type=traditional|ai&email=test@example.com
 */
export async function GET(request: NextRequest) {
 const { searchParams } = new URL(request.url);
 const type = searchParams.get('type') || 'traditional';
 const testEmail = searchParams.get('email') || 'test@example.com';
 
 if (!process.env.NODE_ENV || process.env.NODE_ENV === 'production') {
  return NextResponse.json(
   { error: 'Test endpoint not available in production' },
   { status: 403 }
  );
 }

 try {
  let emailResult;
  
  if (type === 'traditional') {
   // Test traditional quote email
   const mockQuote = {
    id: 'TEST-TRAD-001',
    productName: 'Premium Baseball Cap',
    customerInfo: {
     name: 'John Doe',
     email: testEmail,
     phone: '+1-555-0123',
     company: 'Test Company Inc.'
    },
    requirements: {
     quantity: '500 pieces',
     colors: 'Navy Blue, White',
     sizes: 'S, M, L, XL',
     customization: 'Embroidery',
     timeline: '2-4 weeks',
     additionalNotes: 'Please ensure logo is centered on front panel'
    },
    status: 'PENDING',
    createdAt: new Date().toISOString(),
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0 (Test Browser)'
   };

   // Customer email
   const customerResult = await sendEmail({
    to: testEmail,
    subject: `Quote Request Received #${mockQuote.id} - US Custom Cap`,
    html: emailTemplates.traditionalQuoteReceipt(mockQuote),
    from: process.env.FROM_EMAIL || 'noreply@uscustomcap.com'
   });

   // Admin email
   const adminResult = await sendEmail({
    to: process.env.ADMIN_EMAIL || 'admin@uscustomcap.com',
    subject: `New Traditional Quote Request #${mockQuote.id} - Action Required`,
    html: emailTemplates.adminTraditionalQuoteNotification(mockQuote),
    from: process.env.FROM_EMAIL || 'noreply@uscustomcap.com'
   });

   emailResult = { customer: customerResult, admin: adminResult };
   
  } else if (type === 'ai') {
   // Test AI quote email
   const mockAIQuote = {
    id: 'TEST-AI-002',
    sessionId: 'test-session-456',
    productType: 'Custom Baseball Cap with Logo',
    customerName: 'Jane Smith',
    customerEmail: testEmail,
    customerPhone: '+1-555-0456',
    customerCompany: 'AI Test Corp',
    status: 'QUOTED',
    complexity: 'MEDIUM',
    priority: 'NORMAL',
    quantities: { quantity: 288 },
    estimatedCosts: {
     baseProductCost: 2304.00,
     logosCost: 864.00,
     deliveryCost: 295.00,
     total: 3463.00
    },
    uploadedFiles: [
     'https://example.com/logo1.png',
     'https://example.com/design.ai'
    ],
    logoFiles: [
     'https://example.com/logo1.png'
    ],
    logoRequirements: {
     logos: [
      {
       method: '3D Embroidery',
       position: 'Front',
       size: 'Large',
       colors: ['Navy', 'White', 'Gold']
      }
     ]
    },
    extractedSpecs: {
     profile: 'Mid Profile',
     structure: 'Structured',
     closure: 'Snapback',
     fabric: '100% Cotton',
     sizes: ['S/M', 'L/XL']
    },
    aiSummary: 'Custom 288-piece order with 3D embroidered logo, premium cotton caps',
    createdAt: new Date().toISOString()
   };

   // Customer email
   const customerResult = await sendEmail({
    to: testEmail,
    subject: `AI Quote Generated #${mockAIQuote.id} - US Custom Cap`,
    html: emailTemplates.aiQuoteReceipt(mockAIQuote),
    from: process.env.FROM_EMAIL || 'noreply@uscustomcap.com'
   });

   // Admin email (without real file attachments for test)
   const adminResult = await sendEmail({
    to: process.env.ADMIN_EMAIL || 'admin@uscustomcap.com',
    subject: `New AI Quote #${mockAIQuote.id} - Review Required`,
    html: emailTemplates.adminAIQuoteNotification(mockAIQuote),
    from: process.env.FROM_EMAIL || 'noreply@uscustomcap.com'
   });

   emailResult = { customer: customerResult, admin: adminResult };
  } else {
   return NextResponse.json(
    { error: 'Invalid type. Use "traditional" or "ai"' },
    { status: 400 }
   );
  }

  return NextResponse.json({
   success: true,
   type,
   testEmail,
   results: emailResult
  });

 } catch (error) {
  console.error('Email test failed:', error);
  return NextResponse.json(
   { 
    error: 'Email test failed', 
    details: error instanceof Error ? error.message : 'Unknown error' 
   },
   { status: 500 }
  );
 }
}