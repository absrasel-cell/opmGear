import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, getUserProfile } from '@/lib/auth-helpers';
import { renderInvoicePdfBuffer } from '@/lib/pdf/renderInvoice';
import prisma from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Helper function to check if user can access invoice (admin or owner)
async function canAccessInvoice(request: NextRequest, customerId: string) {
 console.log(`🔐 Checking access for customer ID: ${customerId}`);
 
 const user = await getCurrentUser(request);
 console.log(`🔐 Current user:`, { 
  found: !!user, 
  id: user?.id, 
  email: user?.email 
 });
 
 if (!user) {
  console.log(`🔐 No user found in request`);
  return false;
 }
 
 const profile = await getUserProfile(user.id);
 console.log(`🔐 User profile:`, {
  found: !!profile,
  email: profile?.email,
  accessRole: profile?.accessRole,
  customerRole: profile?.customerRole
 });
 
 if (!profile) {
  console.log(`🔐 No profile found for user ${user.id}`);
  return false;
 }
 
 // Check if user is admin
 const isMasterAdmin = profile.email === 'absrasel@gmail.com' || profile.email === 'vic@onpointmarketing.com';
 const isAdmin = profile.accessRole === 'SUPER_ADMIN' || 
         profile.accessRole === 'MASTER_ADMIN' || 
         profile.customerRole === 'ADMIN' ||
         isMasterAdmin;
 
 const isOwner = user.id === customerId;
 
 console.log(`🔐 Access decision:`, {
  isMasterAdmin,
  isAdmin,
  isOwner,
  userId: user.id,
  customerId,
  finalResult: isAdmin || isOwner
 });
 
 // Allow if admin or if user owns the invoice
 return isAdmin || isOwner;
}

export async function GET(
 request: NextRequest,
 { params }: { params: Promise<{ id: string }> }
) {
 try {
  const { id } = await params;
  console.log(`📄 PDF API called for invoice ID: ${id}`);
  
  // Verify the invoice exists and get customer ID
  const invoice = await prisma.invoice.findUnique({
   where: { id },
   select: { id: true, customerId: true, number: true }
  });

  console.log(`📄 Invoice lookup result:`, {
   found: !!invoice,
   id: invoice?.id,
   customerId: invoice?.customerId,
   number: invoice?.number
  });

  if (!invoice) {
   console.error(`📄 Invoice not found: ${id}`);
   return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
  }

  // Check permissions - admin or invoice owner
  const hasAccess = await canAccessInvoice(request, invoice.customerId);
  console.log(`📄 Access check result:`, {
   hasAccess,
   customerId: invoice.customerId,
   invoiceNumber: invoice.number
  });

  if (!hasAccess) {
   console.error(`📄 Access denied for invoice ${invoice.number} (customer: ${invoice.customerId})`);
   return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  console.log(`📄 Generating PDF for invoice ${invoice.number}...`);
  
  // Generate PDF buffer
  const pdfBuffer = await renderInvoicePdfBuffer(id);

  console.log(`📄 PDF generated successfully:`, {
   invoiceNumber: invoice.number,
   bufferSize: pdfBuffer.length,
   isEmpty: pdfBuffer.length === 0
  });

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
   invoiceId: id,
   type: typeof error,
   cause: error.cause
  });

  // More specific error handling
  if (error.message?.includes('Invoice not found')) {
   return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
  }

  if (error.message?.includes('require is not defined') || error.message?.includes('calculateUnitPrice') || error.message?.includes('React')) {
   console.error('PDF Component Error: React or pricing functions issue', error);
   return NextResponse.json({ 
    error: 'PDF generation failed due to component error',
    details: error.message,
    invoiceId: id
   }, { status: 500 });
  }

  return NextResponse.json({ 
   error: 'Failed to generate PDF',
   details: error.message,
   invoiceId: id
  }, { status: 500 });
 }
}