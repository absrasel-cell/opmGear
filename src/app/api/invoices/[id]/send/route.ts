import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { requireAdmin } from '@/lib/auth-helpers';
import { emailProvider } from '@/lib/email';

const prisma = new PrismaClient();

export async function POST(
 request: NextRequest,
 { params }: { params: Promise<{ id: string }> }
) {
 try {
  const { id } = await params;
  
  // Only admins can send invoice emails
  const { user, profile } = await requireAdmin(request);

  const invoice = await prisma.invoice.findUnique({
   where: { id },
   include: {
    customer: true,
    order: true
   }
  });

  if (!invoice) {
   return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
  }

  // Build the download link (absolute URL)
  const baseUrl = process.env.NEXTAUTH_URL || 
   `${request.nextUrl.protocol}//${request.nextUrl.host}`;
  const downloadLink = `${baseUrl}/api/invoices/${invoice.id}/pdf`;

  // Send the email
  await emailProvider.sendInvoiceEmail({
   to: invoice.customer.email,
   invoiceId: invoice.id,
   invoiceNumber: invoice.number,
   downloadLink,
   customerName: invoice.customer.name || undefined,
   total: invoice.total.toString()
  });

  // Update invoice status if it's still DRAFT
  if (invoice.status === 'DRAFT') {
   await prisma.invoice.update({
    where: { id: id },
    data: { status: 'ISSUED' }
   });
  }

  return NextResponse.json({ 
   message: 'Invoice email sent successfully',
   emailSent: true
  });
 } catch (error: any) {
  console.error('Error sending invoice email:', error);
  
  if (error.message === 'Unauthorized') {
   return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  
  if (error.message?.includes('Admin access required')) {
   return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  // Still return 200 even if email failed (NOOP provider)
  return NextResponse.json({ 
   message: 'Email sending attempted',
   emailSent: false,
   error: error.message
  }, { status: 200 });
 }
}