// Importing jsPDF-based invoice generation (React PDF replacement)
import { generateJsPdfInvoiceBuffer } from './jspdf-invoice';

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

export async function renderInvoicePdfBuffer(invoiceId: string): Promise<Buffer> {
  try {
    console.log('📄 PDF Generation: Starting jsPDF generation for invoice ID:', invoiceId);
    
    // Simple cache key based on invoice ID (jsPDF is fast enough for real-time generation)
    const cacheKey = `jspdf-${invoiceId}`;
    
    // Check cache first
    if (pdfCache.has(cacheKey)) {
      const cached = pdfCache.get(cacheKey)!;
      if (Date.now() - cached.timestamp < CACHE_TTL) {
        console.log('📄 PDF Generation: Using cached jsPDF version');
        return cached.buffer;
      }
      pdfCache.delete(cacheKey);
    }
    
    // Clean expired entries periodically
    if (pdfCache.size > 50) {
      cleanCache();
    }

    console.log('📄 PDF Generation: Generating new PDF with jsPDF...');
    
    // Use the new jsPDF-based generation (no React dependencies)
    const buffer = await generateJsPdfInvoiceBuffer(invoiceId);
    
    console.log('📄 PDF Generation: jsPDF PDF generated successfully, buffer size:', buffer.length);
    
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
    console.error('📄 PDF Generation Error:', {
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