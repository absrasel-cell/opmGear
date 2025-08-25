'use server';

import { revalidatePath } from 'next/cache';

export async function createInvoiceFromOrder(orderId: string) {
  try {
    // Server actions assume proper authentication/authorization at the UI level

    // Call the API endpoint
    const response = await fetch(
      `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/invoices`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orderId }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create invoice');
    }

    const invoice = await response.json();
    
    // Revalidate relevant pages
    revalidatePath('/dashboard/admin/billing/invoices');
    revalidatePath('/dashboard/admin/orders');
    revalidatePath(`/dashboard/admin/orders/${orderId}`);

    return {
      success: true,
      invoice,
      message: `Invoice ${invoice.number} created successfully`
    };
  } catch (error: any) {
    console.error('Error creating invoice from order:', error);
    return {
      success: false,
      error: error.message || 'Failed to create invoice'
    };
  }
}

export async function sendInvoice(invoiceId: string) {
  try {
    // Server actions assume proper authentication/authorization at the UI level

    // Call the API endpoint
    const response = await fetch(
      `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/invoices/${invoiceId}/send`,
      {
        method: 'POST',
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to send invoice');
    }

    const result = await response.json();
    
    // Revalidate relevant pages
    revalidatePath('/dashboard/admin/billing/invoices');

    return {
      success: true,
      emailSent: result.emailSent,
      message: result.message
    };
  } catch (error: any) {
    console.error('Error sending invoice:', error);
    return {
      success: false,
      error: error.message || 'Failed to send invoice'
    };
  }
}

export async function updateInvoiceStatus(
  invoiceId: string, 
  status: 'DRAFT' | 'ISSUED' | 'PAID' | 'VOID' | 'REFUNDED'
) {
  try {
    // Server actions assume proper authentication/authorization at the UI level

    // Call the API endpoint
    const response = await fetch(
      `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/invoices/${invoiceId}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update invoice');
    }

    const invoice = await response.json();
    
    // Revalidate relevant pages
    revalidatePath('/dashboard/admin/billing/invoices');

    return {
      success: true,
      invoice,
      message: `Invoice status updated to ${status}`
    };
  } catch (error: any) {
    console.error('Error updating invoice status:', error);
    return {
      success: false,
      error: error.message || 'Failed to update invoice status'
    };
  }
}

export async function deleteInvoice(invoiceId: string) {
  try {
    // Server actions assume proper authentication/authorization at the UI level

    // Call the API endpoint
    const response = await fetch(
      `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/invoices/${invoiceId}`,
      {
        method: 'DELETE',
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete invoice');
    }
    
    // Revalidate relevant pages
    revalidatePath('/dashboard/admin/billing/invoices');

    return {
      success: true,
      message: 'Invoice deleted successfully'
    };
  } catch (error: any) {
    console.error('Error deleting invoice:', error);
    return {
      success: false,
      error: error.message || 'Failed to delete invoice'
    };
  }
}