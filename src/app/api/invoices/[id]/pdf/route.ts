import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, getUserProfile } from '@/lib/auth-helpers';
import { renderInvoicePdfBuffer } from '@/lib/pdf/renderInvoice';
import prisma from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Helper function to check if user can access invoice (admin or owner)
async function canAccessInvoice(request: NextRequest, customerId: string) {
  const user = await getCurrentUser(request);
  if (!user) return false;
  
  const profile = await getUserProfile(user.id);
  if (!profile) return false;
  
  // Check if user is admin
  const isMasterAdmin = profile.email === 'absrasel@gmail.com' || profile.email === 'vic@onpointmarketing.com';
  const isAdmin = profile.accessRole === 'SUPER_ADMIN' || 
                 profile.accessRole === 'MASTER_ADMIN' || 
                 profile.customerRole === 'ADMIN' ||
                 isMasterAdmin;
  
  // Allow if admin or if user owns the invoice
  return isAdmin || user.id === customerId;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Verify the invoice exists and get customer ID
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      select: { id: true, customerId: true, number: true }
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Check permissions - admin or invoice owner
    if (!(await canAccessInvoice(request, invoice.customerId))) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Generate PDF buffer
    const pdfBuffer = await renderInvoicePdfBuffer(id);

    // Return PDF response
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="invoice-${invoice.number}.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });
  } catch (error: any) {
    console.error('Error generating invoice PDF:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      invoiceId: id
    });

    if (error.message?.includes('Invoice not found')) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      error: 'Failed to generate PDF',
      details: error.message,
      invoiceId: id
    }, { status: 500 });
  }
}