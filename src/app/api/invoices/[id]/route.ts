import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { z } from 'zod';
import { requireAdmin, getCurrentUser, getUserProfile } from '@/lib/auth-helpers';

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

const updateInvoiceSchema = z.object({
 status: z.enum(['DRAFT', 'ISSUED', 'PAID', 'VOID', 'REFUNDED']).optional(),
 notes: z.string().optional(),
 dueDate: z.string().optional()
});

export async function GET(
 request: NextRequest,
 { params }: { params: Promise<{ id: string }> }
) {
 try {
  const { id } = await params;
  
  const { data: invoice, error } = await supabaseAdmin
   .from('invoices')
   .select(`
    *,
    invoice_items(*),
    customers:customer_id(id, name, email),
    orders:order_id(id, product_name, status)
   `)
   .eq('id', id)
   .single();

  if (error && error.code !== 'PGRST116') {
   console.error('Error fetching invoice:', error);
   return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }

  if (!invoice) {
   return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
  }

  // Check permissions - admin or invoice owner
  if (!(await canAccessInvoice(request, invoice.customer_id))) {
   return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  return NextResponse.json(invoice);
 } catch (error: any) {
  console.error('Error fetching invoice:', error);
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
 }
}

export async function PATCH(
 request: NextRequest,
 { params }: { params: Promise<{ id: string }> }
) {
 try {
  const { id } = await params;
  
  // Only admins can update invoices
  const { user, profile } = await requireAdmin(request);

  const body = await request.json();
  const { status, notes, dueDate } = updateInvoiceSchema.parse(body);

  const { data: invoice, error: fetchError } = await supabaseAdmin
   .from('invoices')
   .select('*')
   .eq('id', id)
   .single();

  if (fetchError || !invoice) {
   console.error('Error fetching invoice:', fetchError);
   return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
  }

  // Convert camelCase to snake_case for Supabase
  const supabaseUpdateData: any = {};
  if (status !== undefined) supabaseUpdateData.status = status;
  if (notes !== undefined) supabaseUpdateData.notes = notes;
  if (dueDate !== undefined) supabaseUpdateData.due_date = dueDate ? new Date(dueDate).toISOString() : null;

  const { data: updatedInvoice, error: updateError } = await supabaseAdmin
   .from('invoices')
   .update(supabaseUpdateData)
   .eq('id', id)
   .select(`
    *,
    invoice_items(*),
    customers:customer_id(id, name, email),
    orders:order_id(id, product_name, status)
   `)
   .single();

  if (updateError) {
   console.error('Error updating invoice:', updateError);
   return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }

  return NextResponse.json(updatedInvoice);
 } catch (error: any) {
  console.error('Error updating invoice:', error);
  
  if (error.message === 'Unauthorized') {
   return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  
  if (error.message?.includes('Admin access required')) {
   return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }
  
  if (error.name === 'ZodError') {
   return NextResponse.json({ error: 'Invalid request data' }, { status: 400 });
  }

  return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
 }
}

export async function DELETE(
 request: NextRequest,
 { params }: { params: Promise<{ id: string }> }
) {
 try {
  const { id } = await params;
  
  // Only admins can delete invoices
  const { user, profile } = await requireAdmin(request);

  const { data: invoice, error: fetchError } = await supabaseAdmin
   .from('invoices')
   .select('*')
   .eq('id', id)
   .single();

  if (fetchError || !invoice) {
   console.error('Error fetching invoice:', fetchError);
   return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
  }

  // Allow deletion of any invoice for cleanup purposes
  console.log(`Admin ${profile.email} deleting invoice ${invoice.number} with status ${invoice.status}`);

  // Delete invoice items first (cascade should handle this, but being explicit)
  const { error: deleteItemsError } = await supabaseAdmin
   .from('invoice_items')
   .delete()
   .eq('invoice_id', id);

  if (deleteItemsError) {
   console.error('Error deleting invoice items:', deleteItemsError);
  }

  // Delete the invoice
  const { error: deleteError } = await supabaseAdmin
   .from('invoices')
   .delete()
   .eq('id', id);

  if (deleteError) {
   console.error('Error deleting invoice:', deleteError);
   return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }

  return NextResponse.json({ message: 'Invoice deleted successfully' });
 } catch (error: any) {
  console.error('Error deleting invoice:', error);
  
  if (error.message === 'Unauthorized') {
   return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  
  if (error.message?.includes('Admin access required')) {
   return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
 }
}