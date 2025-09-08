import PDFDocument from 'pdfkit';
import { supabaseAdmin } from '@/lib/supabase';

interface InvoiceData {
  id: string;
  number: string;
  issueDate: string;
  dueDate: string;
  status: string;
  subtotal: number;
  tax: number;
  total: number;
  customerId: string;
  orderId: string;
  customer?: {
    name?: string;
    email?: string;
    company?: string;
    address?: any;
  };
  order?: {
    id: string;
    productName?: string;
    createdAt: string;
  };
  items?: Array<{
    id: string;
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
}

class EnterpriseInvoicePDF {
  private doc: PDFDocument;
  private pageMargin = 50;
  private currentY = 0;
  
  constructor(private invoice: InvoiceData) {
    // Create PDFDocument without specifying fonts to avoid file system issues
    this.doc = new PDFDocument({ 
      size: 'A4', 
      margin: this.pageMargin,
      info: {
        Title: `Invoice ${invoice.number}`,
        Author: 'US Custom Cap',
        Subject: 'Invoice',
        Keywords: 'invoice, custom cap, billing'
      }
    });
    this.currentY = this.pageMargin;
  }

  async generateBuffer(): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      
      this.doc.on('data', (chunk) => chunks.push(chunk));
      this.doc.on('end', () => resolve(Buffer.concat(chunks)));
      this.doc.on('error', reject);
      
      try {
        this.renderInvoiceContent();
        this.doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  private renderInvoiceContent(): void {
    this.renderHeader();
    this.renderInvoiceDetails();
    this.renderCustomerInfo();
    this.renderOrderInfo();
    this.renderLineItems();
    this.renderTotals();
    this.renderFooter();
  }

  private renderHeader(): void {
    // Company header
    this.doc
      .fontSize(28)
      .fillColor('#2563eb')
      .text('US CUSTOM CAP', this.pageMargin, this.currentY, { align: 'center' });
    
    this.currentY += 40;
    
    // Invoice title
    this.doc
      .fontSize(24)
      .fillColor('#1f2937')
      .text('INVOICE', this.pageMargin, this.currentY, { align: 'center' });
    
    this.currentY += 60;
  }

  private renderInvoiceDetails(): void {
    const leftColumn = this.pageMargin;
    const rightColumn = 350;
    
    // Left column - Invoice details
    this.doc
      .fontSize(14)
      .fillColor('#374151')
      .text('Invoice Details', leftColumn, this.currentY, { underline: true });
    
    this.currentY += 25;
    
    const invoiceData = [
      ['Invoice Number:', this.invoice.number || 'N/A'],
      ['Issue Date:', this.formatDate(this.invoice.issueDate)],
      ['Due Date:', this.formatDate(this.invoice.dueDate)],
      ['Status:', this.invoice.status || 'DRAFT']
    ];
    
    invoiceData.forEach(([label, value]) => {
      this.doc
        .fontSize(10)
        .fillColor('#6b7280')
        .text(label, leftColumn, this.currentY)
        .fillColor('#111827')
        .text(value, leftColumn + 100, this.currentY);
      this.currentY += 18;
    });
    
    // Reset Y for next section
    this.currentY += 20;
  }

  private renderCustomerInfo(): void {
    const leftColumn = this.pageMargin;
    
    this.doc
      .fontSize(14)
      .fillColor('#374151')
      .text('Bill To', leftColumn, this.currentY, { underline: true });
    
    this.currentY += 25;
    
    const customer = this.invoice.customer;
    const customerData = [
      ['Name:', customer?.name || 'N/A'],
      ['Email:', customer?.email || 'N/A'],
      ['Company:', customer?.company || '']
    ].filter(([, value]) => value); // Filter out empty values
    
    customerData.forEach(([label, value]) => {
      this.doc
        .fontSize(10)
        .fillColor('#6b7280')
        .text(label, leftColumn, this.currentY)
        .fillColor('#111827')
        .text(value, leftColumn + 100, this.currentY);
      this.currentY += 18;
    });
    
    this.currentY += 20;
  }

  private renderOrderInfo(): void {
    if (!this.invoice.order) return;
    
    const leftColumn = this.pageMargin;
    
    this.doc
      .fontSize(14)
      .fillColor('#374151')
      .text('Order Information', leftColumn, this.currentY, { underline: true });
    
    this.currentY += 25;
    
    const orderData = [
      ['Order Number:', this.invoice.order.id || 'N/A'],
      ['Product:', this.invoice.order.productName || 'Custom Product'],
      ['Order Date:', this.formatDate(this.invoice.order.createdAt)]
    ];
    
    orderData.forEach(([label, value]) => {
      this.doc
        .fontSize(10)
        .fillColor('#6b7280')
        .text(label, leftColumn, this.currentY)
        .fillColor('#111827')
        .text(value, leftColumn + 100, this.currentY);
      this.currentY += 18;
    });
    
    this.currentY += 30;
  }

  private renderLineItems(): void {
    if (!this.invoice.items || this.invoice.items.length === 0) return;
    
    const tableTop = this.currentY;
    const leftMargin = this.pageMargin;
    const tableWidth = 500;
    
    // Table header
    this.doc
      .fontSize(14)
      .fillColor('#374151')
      .text('Invoice Items', leftMargin, this.currentY, { underline: true });
    
    this.currentY += 30;
    
    // Table header row
    const headerY = this.currentY;
    this.doc
      .rect(leftMargin, headerY - 5, tableWidth, 25)
      .fillColor('#f3f4f6')
      .fill();
    
    this.doc
      .fontSize(10)
      .fillColor('#1f2937')
      .text('Description', leftMargin + 10, headerY + 5, { width: 200 })
      .text('Quantity', leftMargin + 220, headerY + 5, { width: 80, align: 'center' })
      .text('Unit Price', leftMargin + 310, headerY + 5, { width: 80, align: 'right' })
      .text('Total', leftMargin + 400, headerY + 5, { width: 80, align: 'right' });
    
    this.currentY += 35;
    
    // Table rows
    this.invoice.items.forEach((item, index) => {
      const rowY = this.currentY;
      
      // Alternate row colors
      if (index % 2 === 1) {
        this.doc
          .rect(leftMargin, rowY - 5, tableWidth, 25)
          .fillColor('#f9fafb')
          .fill();
      }
      
      this.doc
        .fontSize(9)
        .fillColor('#111827')
        .text(item.description || 'Item', leftMargin + 10, rowY, { width: 200 })
        .text(String(item.quantity || 0), leftMargin + 220, rowY, { width: 80, align: 'center' })
        .text(`$${(item.unitPrice || 0).toFixed(2)}`, leftMargin + 310, rowY, { width: 80, align: 'right' })
        .text(`$${(item.total || 0).toFixed(2)}`, leftMargin + 400, rowY, { width: 80, align: 'right' });
      
      this.currentY += 25;
    });
    
    // Table border
    this.doc
      .strokeColor('#e5e7eb')
      .rect(leftMargin, headerY - 5, tableWidth, this.currentY - headerY)
      .stroke();
    
    this.currentY += 20;
  }

  private renderTotals(): void {
    const rightColumn = 400;
    const labelWidth = 100;
    const valueWidth = 80;
    
    const totalsData = [
      ['Subtotal:', this.invoice.subtotal || 0],
      ['Tax:', this.invoice.tax || 0],
      ['Total:', this.invoice.total || 0]
    ];
    
    totalsData.forEach(([label, amount], index) => {
      const isTotal = index === totalsData.length - 1;
      
      this.doc
        .fontSize(isTotal ? 12 : 10)
        .fillColor(isTotal ? '#1f2937' : '#6b7280')
        .text(label, rightColumn, this.currentY, { width: labelWidth, align: 'right' })
        .fillColor(isTotal ? '#1f2937' : '#111827')
        .text(`$${(amount as number).toFixed(2)}`, rightColumn + labelWidth, this.currentY, { 
          width: valueWidth, 
          align: 'right' 
        });
      
      if (isTotal) {
        // Underline total
        this.doc
          .strokeColor('#1f2937')
          .moveTo(rightColumn + labelWidth - 10, this.currentY + 15)
          .lineTo(rightColumn + labelWidth + valueWidth, this.currentY + 15)
          .stroke();
      }
      
      this.currentY += isTotal ? 25 : 20;
    });
  }

  private renderFooter(): void {
    const footerY = 750; // Fixed position near bottom
    
    this.doc
      .fontSize(8)
      .fillColor('#6b7280')
      .text(
        'US Custom Cap - Thank you for your business!',
        this.pageMargin,
        footerY,
        { 
          align: 'center',
          width: 500
        }
      );
    
    // Add generation timestamp
    this.doc
      .text(
        `Generated on ${new Date().toLocaleString()}`,
        this.pageMargin,
        footerY + 15,
        { 
          align: 'center',
          width: 500
        }
      );
  }

  private formatDate(dateString?: string): string {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return 'Invalid Date';
    }
  }
}

// Fetch invoice data function (same as before but with error handling)
async function getInvoiceForPdf(invoiceId: string): Promise<InvoiceData> {
  try {
    console.log(`📄 Fetching invoice data for PDF generation: ${invoiceId}`);
    
    // Get the main invoice data
    const { data: invoice, error: invoiceError } = await supabaseAdmin
      .from('Invoice')
      .select('*')
      .eq('id', invoiceId)
      .single();

    if (invoiceError) {
      console.error('Supabase error fetching invoice for PDF:', invoiceError);
      throw new Error(`Failed to fetch invoice: ${invoiceError.message}`);
    }

    if (!invoice) {
      throw new Error(`Invoice not found: ${invoiceId}`);
    }

    // Get invoice items
    const { data: items, error: itemsError } = await supabaseAdmin
      .from('InvoiceItem')
      .select('*')
      .eq('invoiceId', invoiceId)
      .order('id', { ascending: true });

    if (itemsError) {
      console.error('Supabase error fetching invoice items:', itemsError);
      throw new Error(`Failed to fetch invoice items: ${itemsError.message}`);
    }

    // Get customer data
    const { data: customer, error: customerError } = await supabaseAdmin
      .from('User')
      .select('id, name, email, company, address')
      .eq('id', invoice.customerId)
      .single();

    if (customerError) {
      console.error('Supabase error fetching customer:', customerError);
      throw new Error(`Failed to fetch customer: ${customerError.message}`);
    }

    // Get order data
    const { data: order, error: orderError } = await supabaseAdmin
      .from('Order')
      .select('id, productName, createdAt, customerInfo, selectedColors, selectedOptions, multiSelectOptions, logoSetupSelections, additionalInstructions')
      .eq('id', invoice.orderId)
      .single();

    if (orderError) {
      console.error('Supabase error fetching order:', orderError);
      throw new Error(`Failed to fetch order: ${orderError.message}`);
    }

    // Combine all data into the expected structure
    const invoiceWithDetails: InvoiceData = {
      ...invoice,
      items: items || [],
      customer: customer,
      order: order
    };

    console.log(`📄 Invoice data retrieved successfully:`, {
      invoiceId,
      hasCustomer: !!customer,
      hasOrder: !!order,
      itemsCount: items?.length || 0
    });

    return invoiceWithDetails;
  } catch (error: any) {
    console.error('Error in getInvoiceForPdf:', error);
    throw error;
  }
}

// Main export function
export async function generateInvoicePdfBuffer(invoiceId: string): Promise<Buffer> {
  try {
    console.log('🔧 PDFKit: Starting invoice PDF generation for:', invoiceId);
    
    const invoice = await getInvoiceForPdf(invoiceId);
    console.log('🔧 PDFKit: Invoice data loaded successfully');
    
    const pdfGenerator = new EnterpriseInvoicePDF(invoice);
    const buffer = await pdfGenerator.generateBuffer();
    
    console.log('🔧 PDFKit: PDF generated successfully, buffer size:', buffer.length);
    
    if (buffer.length === 0) {
      throw new Error('Generated PDF buffer is empty - PDF rendering failed');
    }
    
    return buffer;
  } catch (error: any) {
    console.error('🔧 PDFKit: PDF Generation Error:', {
      invoiceId,
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    throw error;
  }
}