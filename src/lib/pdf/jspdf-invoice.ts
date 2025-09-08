import { jsPDF } from 'jspdf';
import { supabaseAdmin } from '@/lib/supabase';

interface InvoiceData {
  id: string;
  number: string;
  issueDate: string;
  dueDate: string;
  status: string;
  subtotal: number;
  tax: number;
  discount?: number;
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

class ProfessionalInvoicePDF {
  private doc: jsPDF;
  private currentY = 25;
  private pageWidth = 210; // A4 width in mm
  private pageHeight = 297; // A4 height in mm
  private margin = 25;
  
  // Professional color palette
  private colors = {
    primary: [37, 99, 235], // Blue #2563eb
    secondary: [16, 185, 129], // Green #10b981
    accent: [245, 158, 11], // Amber #f59e0b
    dark: [17, 24, 39], // Gray-900 #111827
    medium: [55, 65, 81], // Gray-700 #374151
    light: [107, 114, 128], // Gray-500 #6b7280
    lighter: [156, 163, 175], // Gray-400 #9ca3af
    background: [249, 250, 251], // Gray-50 #f9fafb
    border: [229, 231, 235] // Gray-200 #e5e7eb
  };
  
  constructor(private invoice: InvoiceData) {
    this.doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
  }

  generatePDF(): Buffer {
    this.renderContent();
    
    // Convert to buffer
    const pdfArrayBuffer = this.doc.output('arraybuffer');
    return Buffer.from(pdfArrayBuffer);
  }

  private renderContent(): void {
    this.addHeaderBackground();
    this.renderProfessionalHeader();
    this.renderInvoiceMetaInfo();
    this.renderLineItemsTable();
    this.renderPaymentTermsAndTotals();
    this.renderProfessionalFooter();
  }
  
  private addHeaderBackground(): void {
    // Add elegant header background
    this.doc.setFillColor(...this.colors.primary);
    this.doc.rect(0, 0, this.pageWidth, 45, 'F');
    
    // Add subtle gradient effect with a lighter overlay
    this.doc.setFillColor(255, 255, 255, 0.1);
    this.doc.rect(0, 0, this.pageWidth, 45, 'F');
  }

  private renderProfessionalHeader(): void {
    // Company name in header
    this.doc.setFontSize(28);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(255, 255, 255); // White text on blue background
    this.doc.text('US CUSTOM CAPS', this.margin, 20);
    
    // Company contact info - make it more visible
    this.doc.setFontSize(9);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setTextColor(255, 255, 255); // Full white for better visibility
    this.doc.text('Email: support@uscustomcaps.com', this.margin, 28);
    this.doc.text('Phone: +1 (678) 858-7893', this.margin, 33);
    this.doc.text('957 Hwy 85 Connector, Brooks, GA 30205', this.margin, 38);
    
    // Invoice title and number on the right
    this.doc.setFontSize(24);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(255, 255, 255);
    this.doc.text('INVOICE', this.pageWidth - this.margin, 20, { align: 'right' });
    
    this.doc.setFontSize(14);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text(`# ${this.invoice.number || 'N/A'}`, this.pageWidth - this.margin, 28, { align: 'right' });
    
    // Status badge
    this.renderStatusBadge();
    
    this.currentY = 55;
  }
  
  private renderStatusBadge(): void {
    const status = this.invoice.status || 'DRAFT';
    const badgeWidth = 25;
    const badgeHeight = 8;
    const badgeX = this.pageWidth - this.margin - badgeWidth;
    const badgeY = 32;
    
    // Status color mapping
    const statusColors: { [key: string]: number[] } = {
      'PAID': this.colors.secondary,
      'PENDING': this.colors.accent,
      'OVERDUE': [239, 68, 68], // Red
      'DRAFT': this.colors.lighter
    };
    
    const statusColor = statusColors[status] || this.colors.lighter;
    
    // Draw badge background
    this.doc.setFillColor(...statusColor);
    this.doc.roundedRect(badgeX, badgeY, badgeWidth, badgeHeight, 2, 2, 'F');
    
    // Status text
    this.doc.setFontSize(8);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(255, 255, 255);
    this.doc.text(status, badgeX + badgeWidth/2, badgeY + 5.5, { align: 'center' });
  }

  private renderInvoiceMetaInfo(): void {
    const leftColumnX = this.margin;
    const rightColumnX = this.pageWidth / 2 + 10;
    
    // Left column - Order Information Card
    if (this.invoice.order) {
      const orderNumber = this.invoice.order.id ? this.invoice.order.id.slice(-8) : 'N/A';
      
      this.renderInfoCard('Order Information', [
        ['Order #', orderNumber],
        ['Product', this.invoice.order.productName || 'Custom Product'],
        ['Order Date', this.formatDate(this.invoice.order.createdAt)]
      ], leftColumnX, this.currentY, (this.pageWidth / 2) - this.margin - 5);
    }
    
    // Right column - Customer Info Card  
    const customer = this.invoice.customer;
    this.renderInfoCard('Bill To', [
      ['Customer', customer?.name || 'N/A'],
      ['Email', customer?.email || 'N/A'],
      ['Company', customer?.company || '—']
    ], rightColumnX, this.currentY, (this.pageWidth / 2) - this.margin - 5);
    
    this.currentY += 40;
  }
  
  private renderInfoCard(title: string, items: [string, string][], x: number, y: number, width: number): void {
    const cardHeight = 30;
    
    // Card background with subtle shadow effect
    this.doc.setFillColor(...this.colors.background);
    this.doc.setDrawColor(...this.colors.border);
    this.doc.roundedRect(x, y, width, cardHeight, 3, 3, 'FD');
    
    // Card title
    this.doc.setFontSize(11);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(...this.colors.primary);
    this.doc.text(title, x + 5, y + 8);
    
    // Card content
    this.doc.setFontSize(9);
    this.doc.setFont('helvetica', 'normal');
    
    let itemY = y + 15;
    items.forEach(([label, value]) => {
      this.doc.setTextColor(...this.colors.light);
      this.doc.text(`${label}:`, x + 5, itemY);
      this.doc.setTextColor(...this.colors.dark);
      this.doc.text(value, x + 35, itemY);
      itemY += 5;
    });
  }

  private renderBillingSection(): void {
    if (!this.invoice.order) return;
    
    // Order information card - Use last 8 characters for order number
    const orderNumber = this.invoice.order.id 
      ? this.invoice.order.id.slice(-8) 
      : 'N/A';
    
    this.renderInfoCard('Order Information', [
      ['Order #', orderNumber],
      ['Product', this.invoice.order.productName || 'Custom Product'],
      ['Order Date', this.formatDate(this.invoice.order.createdAt)]
    ], this.margin, this.currentY, this.pageWidth - 2 * this.margin);
    
    this.currentY += 40;
  }

  private renderOrderInfo(): void {
    if (!this.invoice.order) return;
    
    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(55, 65, 81);
    this.doc.text('Order Information', this.margin, this.currentY);
    
    this.currentY += 8;
    
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(10);
    
    const orderDetails = [
      ['Order Number:', this.invoice.order.id || 'N/A'],
      ['Product:', this.invoice.order.productName || 'Custom Product'],
      ['Order Date:', this.formatDate(this.invoice.order.createdAt)]
    ];
    
    orderDetails.forEach(([label, value]) => {
      this.doc.setTextColor(107, 114, 128);
      this.doc.text(label, this.margin, this.currentY);
      this.doc.setTextColor(17, 24, 39);
      this.doc.text(value, this.margin + 35, this.currentY);
      this.currentY += 5;
    });
    
    this.currentY += 15;
  }

  private renderLineItemsTable(): void {
    // Always show the Invoice Items section, even if empty
    
    // Section title with decorative line
    this.doc.setFontSize(14);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(...this.colors.primary);
    this.doc.text('Invoice Items', this.margin, this.currentY);
    
    // Decorative line under title
    this.doc.setDrawColor(...this.colors.primary);
    this.doc.setLineWidth(0.8);
    this.doc.line(this.margin, this.currentY + 2, this.margin + 40, this.currentY + 2);
    this.doc.setLineWidth(0.2); // Reset line width
    
    this.currentY += 12;
    
    // Professional table with enhanced styling
    const tableStartY = this.currentY;
    const tableWidth = this.pageWidth - 2 * this.margin;
    const rowHeight = 8;
    
    // Table header with gradient-like effect
    this.doc.setFillColor(...this.colors.primary);
    this.doc.rect(this.margin, tableStartY, tableWidth, rowHeight, 'F');
    
    // Header text
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(255, 255, 255);
    
    const colX = {
      description: this.margin + 3,
      quantity: this.margin + 70,
      unitPrice: this.margin + 100,
      total: this.margin + 130
    };
    
    this.doc.text('DESCRIPTION', colX.description, tableStartY + 5.5);
    this.doc.text('QTY', colX.quantity, tableStartY + 5.5);
    this.doc.text('UNIT PRICE', colX.unitPrice, tableStartY + 5.5);
    this.doc.text('TOTAL', colX.total, tableStartY + 5.5);
    
    this.currentY = tableStartY + rowHeight;
    
    // Table rows with professional styling
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(9);
    
    const items = this.invoice.items || [];
    
    if (items.length === 0) {
      // Show "No items" message when empty
      const rowY = this.currentY;
      this.doc.setFillColor(...this.colors.background);
      this.doc.rect(this.margin, rowY, tableWidth, rowHeight, 'F');
      
      this.doc.setDrawColor(...this.colors.border);
      this.doc.line(this.margin, rowY, this.margin + tableWidth, rowY);
      
      this.doc.setTextColor(...this.colors.light);
      this.doc.setFont('helvetica', 'italic');
      this.doc.text('No items found - Items may not have been created properly', colX.description, rowY + 5.5);
      
      this.currentY += rowHeight;
    } else {
      items.forEach((item, index) => {
      const rowY = this.currentY;
      
      // Alternate row colors
      if (index % 2 === 0) {
        this.doc.setFillColor(...this.colors.background);
        this.doc.rect(this.margin, rowY, tableWidth, rowHeight, 'F');
      }
      
      // Row border
      this.doc.setDrawColor(...this.colors.border);
      this.doc.line(this.margin, rowY, this.margin + tableWidth, rowY);
      
      // Row content
      this.doc.setTextColor(...this.colors.dark);
      
      // Description with truncation if too long
      const description = item.description || 'Item';
      const maxDescWidth = 70;
      const truncatedDesc = description.length > 35 ? description.substring(0, 32) + '...' : description;
      this.doc.text(truncatedDesc, colX.description, rowY + 5.5);
      
      // Quantity (center aligned)
      this.doc.text(String(item.quantity || 0), colX.quantity + 8, rowY + 5.5, { align: 'center' });
      
      // Unit price (right aligned)
      this.doc.text(`$${(item.unitPrice || 0).toFixed(2)}`, colX.unitPrice + 20, rowY + 5.5, { align: 'right' });
      
      // Total (right aligned, highlighted) - keep within table bounds
      this.doc.setFont('helvetica', 'bold');
      this.doc.setTextColor(...this.colors.primary);
      this.doc.text(`$${(item.total || 0).toFixed(2)}`, this.margin + tableWidth - 5, rowY + 5.5, { align: 'right' });
      this.doc.setFont('helvetica', 'normal');
      this.doc.setTextColor(...this.colors.dark);
      
      this.currentY += rowHeight;
      });
    }
    
    // Final table border
    this.doc.setDrawColor(...this.colors.primary);
    this.doc.setLineWidth(0.5);
    this.doc.line(this.margin, this.currentY, this.margin + tableWidth, this.currentY);
    this.doc.setLineWidth(0.2);
    
    this.currentY += 15;
  }

  private renderPaymentTermsAndTotals(): void {
    // Create two-column layout: Payment terms on left, Totals on right
    this.currentY += 15;
    
    const leftColumnWidth = (this.pageWidth - 2 * this.margin) * 0.55; // 55% for left column
    const rightColumnWidth = (this.pageWidth - 2 * this.margin) * 0.4; // 40% for right column
    const columnGap = (this.pageWidth - 2 * this.margin) * 0.05; // 5% gap
    
    const leftColumnX = this.margin;
    const rightColumnX = this.margin + leftColumnWidth + columnGap;
    const startY = this.currentY;
    
    // LEFT COLUMN: Payment Terms & Notes
    this.doc.setFontSize(9);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(...this.colors.medium);
    this.doc.text('Payment Terms & Notes:', leftColumnX, this.currentY);
    
    this.currentY += 8;
    
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(8);
    this.doc.setTextColor(...this.colors.light);
    this.doc.text('• Payment is due within 30 days of invoice date', leftColumnX, this.currentY);
    this.currentY += 5;
    this.doc.text('• Please include invoice number with payment', leftColumnX, this.currentY);
    
    // RIGHT COLUMN: Totals Section
    // Reset Y position to align with payment terms
    const totalsStartY = startY;
    const totalsCardWidth = rightColumnWidth;
    const totalsCardX = rightColumnX;
    
    // Totals card background - adjust height for discount line
    const cardHeight = this.invoice.discount && this.invoice.discount > 0 ? 42 : 35;
    this.doc.setFillColor(...this.colors.background);
    this.doc.roundedRect(totalsCardX, totalsStartY, totalsCardWidth, cardHeight, 3, 3, 'F');
    
    let totalsY = totalsStartY + 8;
    
    const totals = [
      ['Subtotal', this.invoice.subtotal || 0, false, false],
      ['Tax', this.invoice.tax || 0, false, false],
      ...(this.invoice.discount && this.invoice.discount > 0 ? [
        [this.getDiscountLabelWithPercentage(), this.invoice.discount, false, true] as const
      ] : []),
      ['Total Amount', this.invoice.total || 0, true, false]
    ] as const;
    
    totals.forEach(([label, amount, isTotal, isDiscount]) => {
      const labelX = totalsCardX + 5;
      const amountX = totalsCardX + totalsCardWidth - 5;
      
      if (isTotal) {
        // Total amount with neon green color
        this.doc.setFontSize(12);
        this.doc.setFont('helvetica', 'bold');
        this.doc.setTextColor(0, 255, 0); // Neon Green
        
        // Total background highlight
        this.doc.setFillColor(...this.colors.primary, 0.1);
        this.doc.rect(totalsCardX + 2, totalsY - 4, totalsCardWidth - 4, 8, 'F');
      } else if (isDiscount) {
        // Discount styling - red text
        this.doc.setFontSize(10);
        this.doc.setFont('helvetica', 'bold');
        this.doc.setTextColor(220, 38, 38); // Red color for discount
      } else {
        this.doc.setFontSize(10);
        this.doc.setFont('helvetica', 'normal');
        this.doc.setTextColor(...this.colors.light);
      }
      
      this.doc.text(label, labelX, totalsY);
      
      // Amount styling
      if (isTotal) {
        this.doc.setTextColor(0, 255, 0); // Neon Green for total amount
        this.doc.setFont('helvetica', 'bold');
      } else if (isDiscount) {
        this.doc.setTextColor(220, 38, 38); // Red color for discount amount
        this.doc.setFont('helvetica', 'bold');
      } else {
        this.doc.setTextColor(...this.colors.dark);
      }
      
      const displayAmount = isDiscount ? `-$${amount.toFixed(2)}` : `$${amount.toFixed(2)}`;
      this.doc.text(displayAmount, amountX, totalsY, { align: 'right' });
      
      totalsY += isTotal ? 10 : 7;
    });
    
    // Update currentY to the maximum of both columns
    const leftColumnEndY = this.currentY + 10;
    const rightColumnEndY = totalsStartY + cardHeight + 10;
    this.currentY = Math.max(leftColumnEndY, rightColumnEndY);
  }


  private renderProfessionalFooter(): void {
    const footerY = this.pageHeight - 30;
    
    // Footer separator line
    this.doc.setDrawColor(...this.colors.border);
    this.doc.setLineWidth(0.3);
    this.doc.line(this.margin, footerY - 10, this.pageWidth - this.margin, footerY - 10);
    
    // Company information - moved to left bottom corner
    this.doc.setFontSize(8);
    this.doc.setTextColor(...this.colors.medium);
    this.doc.text('US Custom Caps', this.margin, footerY);
    
    this.doc.setTextColor(...this.colors.light);
    this.doc.text('957 Hwy 85 Connector, Brooks, GA 30205', this.margin, footerY + 5);
    this.doc.text('Email: support@uscustomcaps.com', this.margin, footerY + 10);
    this.doc.text('Phone: +1 (678) 858-7893', this.margin, footerY + 15);
    
    // Thank you message
    this.doc.setTextColor(...this.colors.medium);
    this.doc.text('Thank you for your business!', this.margin, footerY + 22);
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

  private getDiscountLabelWithPercentage(): string {
    const subtotal = this.invoice.subtotal || 0;
    const discount = this.invoice.discount || 0;
    
    if (subtotal === 0 || discount === 0) {
      return 'Discount';
    }
    
    const discountPercentage = (discount / subtotal) * 100;
    
    // Round to one decimal place if needed, otherwise show as whole number
    const formattedPercentage = discountPercentage % 1 === 0 
      ? discountPercentage.toFixed(0) 
      : discountPercentage.toFixed(1);
    
    return `Discount (${formattedPercentage}%)`;
  }
}

// Fetch invoice data function
async function getInvoiceForPdf(invoiceId: string): Promise<InvoiceData> {
  try {
    console.log(`📄 Fetching invoice data for jsPDF generation: ${invoiceId}`);
    
    // Get the main invoice data including discount field
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
export async function generateJsPdfInvoiceBuffer(invoiceId: string): Promise<Buffer> {
  try {
    console.log('📄 jsPDF: Starting invoice PDF generation for:', invoiceId);
    
    const invoice = await getInvoiceForPdf(invoiceId);
    console.log('📄 jsPDF: Invoice data loaded successfully');
    
    const pdfGenerator = new ProfessionalInvoicePDF(invoice);
    const buffer = pdfGenerator.generatePDF();
    
    console.log('📄 jsPDF: PDF generated successfully, buffer size:', buffer.length);
    
    if (buffer.length === 0) {
      throw new Error('Generated PDF buffer is empty - PDF rendering failed');
    }
    
    return buffer;
  } catch (error: any) {
    console.error('📄 jsPDF: PDF Generation Error:', {
      invoiceId,
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    throw error;
  }
}