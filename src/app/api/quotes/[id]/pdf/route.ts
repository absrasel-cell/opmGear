import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, getUserProfile } from '@/lib/auth-helpers';
import { renderQuotePdfBuffer, updateQuoteOrderPdfUrl } from '@/lib/pdf/renderQuote';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Helper function to check if user can access quote (admin access required for quotes)
async function canAccessQuote(request: NextRequest, quoteOrderId: string) {
 console.log(`🔐 Checking access for quote order ID: ${quoteOrderId}`);
 
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
 
 // Check if user is admin (quotes are admin-only for now)
 const isMasterAdmin = profile.email === 'absrasel@gmail.com' || profile.email === 'vic@onpointmarketing.com';
 const isAdmin = profile.accessRole === 'SUPER_ADMIN' || 
         profile.accessRole === 'MASTER_ADMIN' || 
         profile.accessRole === 'STAFF' ||
         isMasterAdmin;
 
 console.log(`🔐 Access decision:`, {
  isMasterAdmin,
  isAdmin,
  userId: user.id,
  quoteOrderId,
  finalResult: isAdmin
 });
 
 // Allow if admin (quotes are admin-only)
 return isAdmin;
}

export async function GET(
 request: NextRequest,
 { params }: { params: Promise<{ id: string }> }
) {
 let id: string = '';
 try {
  const resolvedParams = await params;
  id = resolvedParams.id;
  console.log(`📄 Quote PDF API called for quote order ID: ${id}`);
  
  // Verify the quote order exists
  const { data: quoteOrder, error: quoteOrderError } = await supabaseAdmin
   .from('QuoteOrder')
   .select('id, title, sessionId, customerEmail, customerName, status, pdfUrl')
   .eq('id', id)
   .single();

  console.log(`📄 Quote order lookup result:`, {
   found: !!quoteOrder && !quoteOrderError,
   id: quoteOrder?.id,
   title: quoteOrder?.title,
   status: quoteOrder?.status,
   hasPdfUrl: !!quoteOrder?.pdfUrl,
   error: quoteOrderError
  });

  if (quoteOrderError || !quoteOrder) {
   console.error(`📄 Quote order not found: ${id}`, quoteOrderError);
   return NextResponse.json({ error: 'Quote order not found' }, { status: 404 });
  }

  // Check permissions - admin access required
  const hasAccess = await canAccessQuote(request, id);
  console.log(`📄 Access check result:`, {
   hasAccess,
   quoteOrderId: id,
   title: quoteOrder.title
  });

  if (!hasAccess) {
   console.error(`📄 Access denied for quote order ${id}`);
   return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  console.log(`📄 Generating PDF for quote order ${id}...`);
  
  // Generate PDF buffer
  const pdfBuffer = await renderQuotePdfBuffer(id);

  console.log(`📄 PDF generated successfully:`, {
   quoteOrderId: id,
   bufferSize: pdfBuffer.length,
   isEmpty: pdfBuffer.length === 0
  });

  // Update the quote order with PDF URL if it doesn't exist
  if (!quoteOrder.pdfUrl) {
   const pdfUrl = `/api/quotes/${id}/pdf`;
   await updateQuoteOrderPdfUrl(id, pdfUrl);
   console.log(`📄 Updated quote order ${id} with PDF URL: ${pdfUrl}`);
  }

  // Return PDF response
  return new NextResponse(pdfBuffer, {
   status: 200,
   headers: {
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="quote-${id.slice(-8)}.pdf"`,
    'Content-Length': pdfBuffer.length.toString(),
   },
  });
 } catch (error: any) {
  console.error('Error generating quote PDF:', {
   message: error.message,
   stack: error.stack,
   name: error.name,
   quoteOrderId: id,
   type: typeof error,
   cause: error.cause
  });

  // More specific error handling
  if (error.message?.includes('Quote order not found')) {
   return NextResponse.json({ error: 'Quote order not found' }, { status: 404 });
  }

  if (error.message?.includes('require is not defined') || error.message?.includes('React')) {
   console.error('Quote PDF Component Error: React or component issue', error);
   return NextResponse.json({ 
    error: 'PDF generation failed due to component error',
    details: error.message,
    quoteOrderId: id
   }, { status: 500 });
  }

  return NextResponse.json({ 
   error: 'Failed to generate PDF',
   details: error.message,
   quoteOrderId: id
  }, { status: 500 });
 }
}