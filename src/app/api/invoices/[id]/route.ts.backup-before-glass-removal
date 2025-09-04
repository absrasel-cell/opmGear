import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { requireAdmin, getCurrentUser, getUserProfile } from '@/lib/auth-helpers';

const prisma = new PrismaClient();

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
    
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        items: true,
        customer: {
          select: { id: true, name: true, email: true }
        },
        order: {
          select: { id: true, productName: true, status: true }
        }
      }
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Check permissions - admin or invoice owner
    if (!(await canAccessInvoice(request, invoice.customerId))) {
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

    const invoice = await prisma.invoice.findUnique({
      where: { id: id }
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const updateData: any = {};
    if (status !== undefined) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;

    const updatedInvoice = await prisma.invoice.update({
      where: { id: id },
      data: updateData,
      include: {
        items: true,
        customer: {
          select: { id: true, name: true, email: true }
        },
        order: {
          select: { id: true, productName: true, status: true }
        }
      }
    });

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

    const invoice = await prisma.invoice.findUnique({
      where: { id: id }
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Allow deletion of any invoice for cleanup purposes
    console.log(`Admin ${profile.email} deleting invoice ${invoice.number} with status ${invoice.status}`);

    // Delete invoice items first (cascade should handle this, but being explicit)
    await prisma.invoiceItem.deleteMany({
      where: { invoiceId: id }
    });

    // Delete the invoice
    await prisma.invoice.delete({
      where: { id: id }
    });

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