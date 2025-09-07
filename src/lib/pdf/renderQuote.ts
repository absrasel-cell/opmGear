import { renderToBuffer } from '@react-pdf/renderer';
import { QuotePdf } from './QuotePdf';
import { supabaseAdmin } from '@/lib/supabase';

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
const getQuoteOrderForPdf = async (quoteOrderId: string) => {
  try {
    // TODO: Quote PDF generation temporarily disabled - need to convert to Supabase
    console.log('⚠️ Quote PDF generation temporarily disabled - TODO: implement with Supabase');
    
    // Return null to indicate quote order not found
    return null;
    
    /*
    // TODO: Implement Supabase version
    const { data: quoteOrder, error } = await supabaseAdmin
      .from('QuoteOrder')
      .select(`
        *,
        QuoteOrderFile (
          id,
          originalName,
          fileType,
          fileSize,
          category,
          isLogo,
          uploadedAt,
          filePath,
          description
        )
      `)
      .eq('id', quoteOrderId)
      .single();

    if (error) {
      console.error('Error fetching quote order:', error);
      return null;
    }

    return quoteOrder;
    */
  } catch (error) {
    console.error('Error in getQuoteOrderForPdf:', error);
    return null;
  }
};

export async function renderQuotePdfBuffer(quoteOrderId: string): Promise<Buffer> {
  try {
    console.log('Quote PDF Generation: Starting for quote order ID:', quoteOrderId);
    
    // Create cache key based on quote order ID and last update
    const quoteOrder = await getQuoteOrderForPdf(quoteOrderId);
    console.log('Quote PDF Generation: Quote order retrieved:', {
      found: !!quoteOrder,
      id: quoteOrder?.id,
      title: quoteOrder?.title,
      status: quoteOrder?.status,
      filesCount: quoteOrder?.QuoteOrderFile?.length || 0
    });
    
    if (!quoteOrder) {
      console.log('Quote PDF Generation: Disabled - returning empty buffer');
      // Return a minimal buffer to avoid breaking the pipeline
      return Buffer.alloc(0);
    }
    
    const cacheKey = `${quoteOrderId}-${quoteOrder.updatedAt.getTime()}`;
    console.log('Quote PDF Generation: Cache key:', cacheKey);
    
    // Check cache first
    if (pdfCache.has(cacheKey)) {
      const cached = pdfCache.get(cacheKey)!;
      if (Date.now() - cached.timestamp < CACHE_TTL) {
        console.log('Quote PDF Generation: Using cached version');
        return cached.buffer;
      }
      pdfCache.delete(cacheKey);
    }
    
    // Clean expired entries periodically
    if (pdfCache.size > 50) {
      cleanCache();
    }

    console.log('Quote PDF Generation: Rendering PDF with React PDF...');
    
    // Validate quote order data before rendering
    if (!quoteOrder.customerEmail && !quoteOrder.customerName) {
      console.warn('Quote PDF Generation: Quote order has no customer info:', quoteOrderId);
    }
    
    // Transform the quote order data to match the expected structure
    const quoteForPdf = {
      ...quoteOrder,
      files: quoteOrder.QuoteOrderFile?.map(file => ({
        id: file.id,
        originalName: file.originalName,
        fileType: file.fileType,
        fileSize: file.fileSize,
        category: file.category,
        isLogo: file.isLogo,
        uploadedAt: file.uploadedAt.toISOString(),
        filePath: file.filePath,
        description: file.description
      })) || []
    };
    
    // Render the React component to PDF buffer asynchronously
    console.log('Quote PDF Generation: About to call renderToBuffer...');
    const buffer = await renderToBuffer(QuotePdf({ quote: quoteForPdf }));
    
    console.log('Quote PDF Generation: PDF rendered successfully, buffer size:', buffer.length);
    
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
    console.error('Quote PDF Generation Error:', {
      quoteOrderId,
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    throw error;
  }
}

export async function renderQuotePdfStream(quoteOrderId: string) {
  // Use the same optimized function for streaming
  return renderQuotePdfBuffer(quoteOrderId);
}

// Function to update the quote order with PDF URL after generation
export async function updateQuoteOrderPdfUrl(quoteOrderId: string, pdfUrl: string) {
  try {
    // TODO: Quote PDF URL update temporarily disabled - need to convert to Supabase
    console.log('⚠️ Quote PDF URL update temporarily disabled - TODO: implement with Supabase');
    console.log(`Would update quote order ${quoteOrderId} with PDF URL: ${pdfUrl}`);
    
    /*
    // TODO: Implement Supabase version
    const { error } = await supabaseAdmin
      .from('QuoteOrder')
      .update({ pdfUrl })
      .eq('id', quoteOrderId);

    if (error) {
      console.error('Error updating quote order PDF URL:', error);
      throw error;
    }

    console.log(`Quote PDF URL updated for quote order ${quoteOrderId}: ${pdfUrl}`);
    */
  } catch (error) {
    console.error('Error updating quote order PDF URL:', error);
    throw error;
  }
}