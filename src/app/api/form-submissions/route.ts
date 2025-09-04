import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { Resend } from 'resend';

const prisma = new PrismaClient();
const resend = new Resend(process.env.RESEND_API_KEY);

// POST - Submit a new form
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      formType = 'CONTACT',
      name,
      email,
      subject,
      message,
      phone,
      company,
      metadata
    } = body;

    // Validate required fields
    if (!name || !email || !message) {
      return NextResponse.json(
        { error: 'Name, email, and message are required' },
        { status: 400 }
      );
    }

    // Get client information
    const ipAddress = req.headers.get('x-forwarded-for') || 
                     req.headers.get('x-real-ip') || 
                     '127.0.0.1';
    const userAgent = req.headers.get('user-agent') || '';
    const referrer = req.headers.get('referer') || '';

    // Create form submission
    const submission = await prisma.formSubmission.create({
      data: {
        formType,
        name,
        email,
        subject,
        message,
        phone,
        company,
        metadata: metadata || {},
        ipAddress,
        userAgent,
        referrer,
        priority: subject === 'urgent' ? 'URGENT' : 'NORMAL'
      }
    });

    // Send confirmation email to user
    await sendUserConfirmationEmail({
      name,
      email,
      subject: subject || 'Contact Form Submission',
      submissionId: submission.id
    });

    // Send notification email to admin
    await sendAdminNotificationEmail({
      name,
      email,
      subject: subject || 'New Contact Form Submission',
      message,
      formType,
      submissionId: submission.id,
      phone,
      company
    });

    return NextResponse.json({
      success: true,
      submissionId: submission.id,
      message: 'Form submitted successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Error submitting form:', error);
    return NextResponse.json(
      { error: 'Failed to submit form' },
      { status: 500 }
    );
  }
}

// GET - Retrieve form submissions (admin only)
export async function GET(req: NextRequest) {
  try {
    // TODO: Add authentication check for admin users
    
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const status = url.searchParams.get('status') || undefined;
    const formType = url.searchParams.get('formType') || undefined;
    const priority = url.searchParams.get('priority') || undefined;
    
    const skip = (page - 1) * limit;

    // Build filter conditions
    const where: any = {};
    if (status) where.status = status;
    if (formType) where.formType = formType;
    if (priority) where.priority = priority;

    const [submissions, total] = await Promise.all([
      prisma.formSubmission.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          User: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      }),
      prisma.formSubmission.count({ where })
    ]);

    return NextResponse.json({
      submissions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error retrieving form submissions:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve submissions' },
      { status: 500 }
    );
  }
}

// Helper function to send user confirmation email
async function sendUserConfirmationEmail({
  name,
  email,
  subject,
  submissionId
}: {
  name: string;
  email: string;
  subject: string;
  submissionId: string;
}) {
  try {
    await resend.emails.send({
      from: 'US Custom Cap <noreply@uscustomcap.com>',
      to: [email],
      subject: `Thank you for contacting US Custom Cap - ${subject}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #65a30d 0%, #84cc16 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">US Custom Cap</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Custom Baseball Caps</p>
          </div>
          
          <div style="padding: 40px 30px; background: white;">
            <h2 style="color: #333; margin: 0 0 20px 0;">Thank you for contacting us!</h2>
            
            <p style="color: #666; line-height: 1.6;">
              Hi ${name},
            </p>
            
            <p style="color: #666; line-height: 1.6;">
              We've received your message regarding: <strong>"${subject}"</strong>
            </p>
            
            <p style="color: #666; line-height: 1.6;">
              Our team will review your inquiry and get back to you within 24 hours during business days.
            </p>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 30px 0;">
              <p style="margin: 0; color: #666; font-size: 14px;">
                <strong>Reference ID:</strong> ${submissionId}
              </p>
            </div>
            
            <p style="color: #666; line-height: 1.6;">
              If you have any urgent questions, please don't hesitate to contact us directly.
            </p>
            
            <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; color: #999; font-size: 12px;">
              <p>This email was sent by US Custom Cap. Please do not reply to this email.</p>
            </div>
          </div>
        </div>
      `,
      text: `
        Thank you for contacting US Custom Cap!
        
        Hi ${name},
        
        We've received your message regarding: "${subject}"
        
        Our team will review your inquiry and get back to you within 24 hours during business days.
        
        Reference ID: ${submissionId}
        
        If you have any urgent questions, please don't hesitate to contact us directly.
        
        Best regards,
        The US Custom Cap Team
      `
    });
  } catch (error) {
    console.error('Error sending user confirmation email:', error);
  }
}

// Helper function to send admin notification email
async function sendAdminNotificationEmail({
  name,
  email,
  subject,
  message,
  formType,
  submissionId,
  phone,
  company
}: {
  name: string;
  email: string;
  subject: string;
  message: string;
  formType: string;
  submissionId: string;
  phone?: string;
  company?: string;
}) {
  try {
    await resend.emails.send({
      from: 'US Custom Cap Forms <forms@uscustomcap.com>',
      to: ['admin@uscustomcap.com'], // TODO: Make this configurable
      subject: `New ${formType} Form Submission - ${subject}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">New Form Submission</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">US Custom Cap Contact Form</p>
          </div>
          
          <div style="padding: 40px 30px; background: white;">
            <h2 style="color: #333; margin: 0 0 20px 0;">Form Details</h2>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <p style="margin: 0 0 10px 0; color: #333;"><strong>Form Type:</strong> ${formType}</p>
              <p style="margin: 0 0 10px 0; color: #333;"><strong>Submission ID:</strong> ${submissionId}</p>
              <p style="margin: 0 0 10px 0; color: #333;"><strong>Name:</strong> ${name}</p>
              <p style="margin: 0 0 10px 0; color: #333;"><strong>Email:</strong> ${email}</p>
              ${phone ? `<p style="margin: 0 0 10px 0; color: #333;"><strong>Phone:</strong> ${phone}</p>` : ''}
              ${company ? `<p style="margin: 0 0 10px 0; color: #333;"><strong>Company:</strong> ${company}</p>` : ''}
              <p style="margin: 0; color: #333;"><strong>Subject:</strong> ${subject}</p>
            </div>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px;">
              <p style="margin: 0 0 10px 0; color: #333;"><strong>Message:</strong></p>
              <p style="margin: 0; color: #666; line-height: 1.6; white-space: pre-wrap;">${message}</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/admin/form-submissions" 
                 style="background: #65a30d; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
                View in Dashboard
              </a>
            </div>
          </div>
        </div>
      `,
      text: `
        New ${formType} Form Submission
        
        Submission ID: ${submissionId}
        Name: ${name}
        Email: ${email}
        ${phone ? `Phone: ${phone}` : ''}
        ${company ? `Company: ${company}` : ''}
        Subject: ${subject}
        
        Message:
        ${message}
        
        View in dashboard: ${process.env.NEXT_PUBLIC_APP_URL}/dashboard/admin/form-submissions
      `
    });
  } catch (error) {
    console.error('Error sending admin notification email:', error);
  }
}