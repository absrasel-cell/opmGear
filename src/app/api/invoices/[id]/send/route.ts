import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAdmin } from '@/lib/auth-helpers';
import { emailProvider } from '@/lib/email';

export async function POST(
 request: NextRequest,
 { params }: { params: Promise<{ id: string }> }
) {
 try {
  const { id } = await params;
  
  // Only admins can send invoice emails
  const { user, profile } = await requireAdmin(request);

  const { data: invoice, error } = await supabaseAdmin
   .from('Invoice')
   .select(`
    *,
    customer:User!Invoice_customerId_fkey(*),
    order:Order!Invoice_orderId_fkey(*)
   `)
   .eq('id', id)
   .single();

  if (error) {
   console.error('Error fetching invoice:', error);
   return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }

  if (!invoice) {
   return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
  }

  // Build the download link (absolute URL)
  const baseUrl = process.env.NEXTAUTH_URL || 
   `${request.nextUrl.protocol}//${request.nextUrl.host}`;
  const downloadLink = `${baseUrl}/api/invoices/${invoice.id}/pdf`;

  // Send the email
  await emailProvider.sendInvoiceEmail({
   to: invoice.customers.email,
   invoiceId: invoice.id,
   invoiceNumber: invoice.number,
   downloadLink,
   customerName: invoice.customers.name || undefined,
   total: invoice.total.toString()
  });

  // Update invoice status if it's still DRAFT
  if (invoice.status === 'DRAFT') {
   const { error: updateError } = await supabaseAdmin
    .from('Invoice')
    .update({ status: 'ISSUED' })
    .eq('id', id);

   if (updateError) {
    console.error('Error updating invoice status:', updateError);
   }
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