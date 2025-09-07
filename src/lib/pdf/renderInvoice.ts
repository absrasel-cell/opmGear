import { renderToBuffer } from '@react-pdf/renderer';
import { InvoicePdf } from './InvoicePdf';
// Removed Prisma - migrated to Supabase

// PDF cache to avoid regenerating the same PDFs
const pdfCache = new Map<string, { buffer: Buffer; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Clean expired cache entries
const cleanCache = () => {
  const now = Date.now();
  for (const [key, entry] of pdfCache.entries()) {
    if (now - entry.timestamp > CACHE_TTL) {
      pdfCache.delete(key);
    }
  }
};

// Optimize database query for PDF generation
const getInvoiceForPdf = async (invoiceId: string) => {
  return await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      items: {
        orderBy: { id: 'asc' } // Consistent ordering by ID instead of createdAt
      },
      customer: {
        select: {
          id: true,
          name: true,
          email: true,
          company: true,
          address: true
        }
      },
      order: {
        select: {
          id: true,
          productName: true,
          createdAt: true,
          customerInfo: true
        }
      }
    }
  });
};

export async function renderInvoicePdfBuffer(invoiceId: string): Promise<Buffer> {
  try {
    console.log('PDF Generation: Starting for invoice ID:', invoiceId);
    
    // Create cache key based on invoice ID and last update
    const invoice = await getInvoiceForPdf(invoiceId);
    console.log('PDF Generation: Invoice retrieved:', {
      found: !!invoice,
      id: invoice?.id,
      hasCustomer: !!invoice?.customer,
      hasOrder: !!invoice?.order,
      itemsCount: invoice?.items?.length || 0
    });
    
    if (!invoice) {
      throw new Error(`Invoice not found: ${invoiceId}`);
    }
    
    const cacheKey = `${invoiceId}-${invoice.updatedAt.getTime()}`;
    console.log('PDF Generation: Cache key:', cacheKey);
    
    // Check cache first
    if (pdfCache.has(cacheKey)) {
      const cached = pdfCache.get(cacheKey)!;
      if (Date.now() - cached.timestamp < CACHE_TTL) {
        console.log('PDF Generation: Using cached version');
        return cached.buffer;
      }
      pdfCache.delete(cacheKey);
    }
    
    // Clean expired entries periodically
    if (pdfCache.size > 50) {
      cleanCache();
    }

    console.log('PDF Generation: Rendering PDF with React PDF...');
    
    // Validate invoice data before rendering
    if (!invoice.items || invoice.items.length === 0) {
      console.warn('PDF Generation: Invoice has no items:', invoiceId);
    }
    if (!invoice.customer) {
      console.warn('PDF Generation: Invoice has no customer:', invoiceId);
    }
    if (!invoice.order) {
      console.warn('PDF Generation: Invoice has no order:', invoiceId);
    }
    
    // Pre-load CSV pricing data before PDF rendering
    try {
      const path = require('path');
      const fs = require('fs');
      const csvPath = path.join(process.cwd(), 'src/app/csv/Blank Cap Pricings.csv');
      const csvContent = await fs.promises.readFile(csvPath, 'utf-8');
      console.log('PDF Generation: CSV pricing data loaded successfully');
    } catch (csvError) {
      console.warn('PDF Generation: CSV pricing load failed, using fallback:', csvError);
    }
    
    // Render the React component to PDF buffer asynchronously
    console.log('PDF Generation: About to call renderToBuffer...');
    const buffer = await renderToBuffer(InvoicePdf({ doc: invoice }));
    
    console.log('PDF Generation: PDF rendered successfully, buffer size:', buffer.length);
    
    // Validate buffer is not empty
    if (buffer.length === 0) {
      throw new Error('Generated PDF buffer is empty - PDF rendering failed');
    }
    
    // Cache the result
    pdfCache.set(cacheKey, {
      buffer,
      timestamp: Date.now()
    });
    
    return buffer;
  } catch (error: any) {
    console.error('PDF Generation Error:', {
      invoiceId,
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    throw error;
  }
}

export async function renderInvoicePdfStream(invoiceId: string) {
  // Use the same optimized function for streaming
  return renderInvoicePdfBuffer(invoiceId);
}