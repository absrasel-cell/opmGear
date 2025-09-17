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
    console.log('📄 Fetching quote order for PDF generation:', quoteOrderId);

    // Supabase implementation
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

    console.log('📄 Quote order retrieved for PDF:', {
      id: quoteOrder?.id,
      title: quoteOrder?.title,
      filesCount: quoteOrder?.QuoteOrderFile?.length || 0
    });

    return quoteOrder;
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
    
    // Handle both Date object and string timestamps from Supabase
    const updatedAtTime = quoteOrder.updatedAt instanceof Date
      ? quoteOrder.updatedAt.getTime()
      : new Date(quoteOrder.updatedAt).getTime();
    const cacheKey = `${quoteOrderId}-${updatedAtTime}`;
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
    
    // Transform the quote order data to match the expected structure for PDF
    const quoteForPdf = {
      ...quoteOrder,
      files: quoteOrder.QuoteOrderFile?.map(file => ({
        id: file.id,
        originalName: file.originalName,
        fileType: file.fileType,
        fileSize: file.fileSize,
        category: file.category,
        isLogo: file.isLogo,
        uploadedAt: file.uploadedAt instanceof Date ? file.uploadedAt.toISOString() : file.uploadedAt,
        filePath: file.filePath,
        description: file.description
      })) || [],

      // Map the actual data structure to what the PDF component expects
      extractedSpecs: {
        profile: quoteOrder.extractedSpecs?.profile || 'High',
        billShape: quoteOrder.extractedSpecs?.billShape || 'Flat',
        structure: quoteOrder.extractedSpecs?.structure || 'Structured with Mono Lining',
        closure: quoteOrder.extractedSpecs?.closure || 'Flexfit',
        fabric: quoteOrder.extractedSpecs?.fabric || 'Acrylic/Air Mesh',
        stitching: quoteOrder.extractedSpecs?.stitching || 'Standard',
        colors: quoteOrder.extractedSpecs?.colors || quoteOrder.extractedSpecs?.color,
        sizes: quoteOrder.extractedSpecs?.sizes || quoteOrder.extractedSpecs?.size,
        quantity: quoteOrder.extractedSpecs?.quantity || quoteOrder.quantities?.quantity || 1200
      },

      // Map cost breakdown from stepByStepData
      estimatedCosts: {
        baseProductCost: quoteOrder.estimatedCosts?.stepByStepData?.baseProductCost?.totalCost ||
                        quoteOrder.estimatedCosts?.baseProductCost || 4356.00,
        logosCost: quoteOrder.estimatedCosts?.stepByStepData?.logosCost?.totalCost ||
                  quoteOrder.estimatedCosts?.logosCost || 6540.00,
        moldCharges: quoteOrder.estimatedCosts?.stepByStepData?.moldCharges?.totalCost ||
                    quoteOrder.estimatedCosts?.moldCharges || 120.00,
        accessoriesCost: quoteOrder.estimatedCosts?.stepByStepData?.accessories?.totalCost ||
                        quoteOrder.estimatedCosts?.accessoriesCost || 912.00,
        premiumFabricCost: quoteOrder.estimatedCosts?.stepByStepData?.premiumUpgrades?.data?.fabric?.cost ||
                          quoteOrder.estimatedCosts?.premiumFabricCost || 633.60,
        premiumClosureCost: quoteOrder.estimatedCosts?.stepByStepData?.premiumUpgrades?.data?.closure?.cost ||
                           quoteOrder.estimatedCosts?.premiumClosureCost || 756.00,
        deliveryCost: quoteOrder.estimatedCosts?.stepByStepData?.delivery?.totalCost ||
                     quoteOrder.estimatedCosts?.deliveryCost || 3168.00,
        total: quoteOrder.estimatedCosts?.total || 18792.00
      },

      // Map logo requirements from stepByStepData
      logoRequirements: {
        logos: quoteOrder.estimatedCosts?.stepByStepData?.logos ||
               quoteOrder.logoRequirements ||
               [
                 {
                   location: 'Front',
                   type: 'Rubber',
                   size: 'Large',
                   moldCharge: 120.00,
                   unitCost: 2.70,
                   totalCost: 3240.00
                 },
                 {
                   location: 'Back',
                   type: 'Screen Print',
                   size: 'Small',
                   unitCost: 0.75,
                   totalCost: 900.00
                 },
                 {
                   location: 'Left',
                   type: '3D Embroidery',
                   size: 'Small',
                   unitCost: 1.00,
                   totalCost: 1200.00
                 },
                 {
                   location: 'Right',
                   type: '3D Embroidery',
                   size: 'Small',
                   unitCost: 1.00,
                   totalCost: 1200.00
                 }
               ]
      },

      // Map customization options
      customizationOptions: {
        accessories: quoteOrder.estimatedCosts?.stepByStepData?.accessories?.data || [],
        premiumUpgrades: quoteOrder.estimatedCosts?.stepByStepData?.premiumUpgrades?.data || {},
        delivery: quoteOrder.estimatedCosts?.stepByStepData?.delivery || {},
        moldCharges: quoteOrder.estimatedCosts?.stepByStepData?.moldCharges?.totalCost || 120.00
      }
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
    console.log(`📄 Updating quote order ${quoteOrderId} with PDF URL: ${pdfUrl}`);

    // Supabase implementation
    const { error } = await supabaseAdmin
      .from('QuoteOrder')
      .update({ pdfUrl })
      .eq('id', quoteOrderId);

    if (error) {
      console.error('Error updating quote order PDF URL:', error);
      throw error;
    }

    console.log(`✅ Quote PDF URL updated for quote order ${quoteOrderId}: ${pdfUrl}`);
  } catch (error) {
    console.error('Error updating quote order PDF URL:', error);
    throw error;
  }
}