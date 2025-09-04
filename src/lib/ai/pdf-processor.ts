/**
 * PDF Processing Utility
 * Handles PDF file processing for logo analysis by converting PDF content to images
 * that can be analyzed by OpenAI Vision API
 */

import fs from 'fs';
import path from 'path';

interface PDFProcessingResult {
  success: boolean;
  images: {
    url: string;
    base64: string;
    pageNumber: number;
    width?: number;
    height?: number;
  }[];
  error?: string;
  extractedText?: string;
  metadata?: {
    pageCount: number;
    processingTime: number;
    extractedImageCount: number;
    textLength: number;
    isPlaceholderImages: boolean;
  };
}

export class PDFProcessor {
  
  /**
   * Process PDF file and extract images or convert pages to images
   */
  static async processPDFForAnalysis(
    pdfBuffer: Buffer,
    options: {
      maxPages?: number;
      extractEmbeddedImages?: boolean;
      convertPagesToImages?: boolean;
      outputFormat?: 'png' | 'jpg';
      quality?: number;
    } = {}
  ): Promise<PDFProcessingResult> {
    
    const startTime = Date.now();
    const {
      maxPages = 3,
      extractEmbeddedImages = true,
      convertPagesToImages = true,
      outputFormat = 'png',
      quality = 90
    } = options;
    
    console.log('🔄 Processing PDF for logo analysis...');
    
    try {
      const images: PDFProcessingResult['images'] = [];
      let pageCount = 0;
      let extractedImageCount = 0;
      
      // Method 1: Try to extract embedded images first (more efficient)
      if (extractEmbeddedImages) {
        try {
          const embeddedImages = await this.extractEmbeddedImages(pdfBuffer);
          images.push(...embeddedImages);
          extractedImageCount = embeddedImages.length;
          
          console.log(`📸 Extracted ${embeddedImages.length} embedded images from PDF`);
        } catch (error) {
          console.warn('Failed to extract embedded images:', error);
        }
      }
      
      // Method 2: Convert pages to images if no embedded images found or as fallback
      if (images.length === 0 && convertPagesToImages) {
        try {
          const pageImages = await this.convertPDFPagesToImages(
            pdfBuffer, 
            { maxPages, outputFormat, quality }
          );
          images.push(...pageImages);
          pageCount = pageImages.length;
          
          console.log(`📄 Converted ${pageImages.length} PDF pages to images`);
        } catch (error) {
          console.warn('Failed to convert PDF pages, will create placeholder:', error);
          
          // Fallback: Create a placeholder image indicating PDF content
          images.push({
            url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
            base64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
            pageNumber: 1,
            width: 1,
            height: 1
          });
          
          console.log('🔄 Using placeholder image for PDF analysis');
        }
      }
      
      if (images.length === 0) {
        throw new Error('No images could be extracted or generated from PDF');
      }
      
      const processingTime = Date.now() - startTime;
      console.log(`✅ PDF processing completed in ${processingTime}ms`);
      
      // Extract text content for AI analysis (especially useful for placeholders)
      let extractedText = '';
      try {
        const pdfParse = await import('pdf-parse');
        const textData = await pdfParse.default(pdfBuffer, { max: maxPages });
        extractedText = textData.text || '';
        console.log(`📝 Extracted ${extractedText.length} characters of text from PDF`);
      } catch (textError) {
        console.warn('Could not extract text from PDF:', textError);
      }
      
      // Check if we're using placeholder images
      const isPlaceholderImages = images.some(img => img.width === 1 && img.height === 1);
      
      return {
        success: true,
        images: images.slice(0, maxPages), // Limit to maxPages
        extractedText,
        metadata: {
          pageCount,
          processingTime,
          extractedImageCount,
          textLength: extractedText.length,
          isPlaceholderImages
        }
      };
      
    } catch (error) {
      console.error('PDF processing failed:', error);
      
      return {
        success: false,
        images: [],
        error: error instanceof Error ? error.message : 'Unknown PDF processing error'
      };
    }
  }
  
  /**
   * Extract embedded images from PDF
   */
  private static async extractEmbeddedImages(pdfBuffer: Buffer): Promise<PDFProcessingResult['images']> {
    const images: PDFProcessingResult['images'] = [];
    
    try {
      // Use pdf-parse to extract PDF content
      const pdfParse = await import('pdf-parse');
      const data = await pdfParse.default(pdfBuffer);
      
      console.log(`📊 PDF contains ${data.numpages} pages with text content`);
      
      // For now, we'll focus on page conversion since embedded image extraction
      // requires more complex PDF parsing libraries
      return images;
      
    } catch (error) {
      console.warn('Embedded image extraction not available, will convert pages instead');
      return images;
    }
  }
  
  /**
   * Convert PDF pages to images using pdf2pic with Vercel compatibility
   */
  private static async convertPDFPagesToImages(
    pdfBuffer: Buffer,
    options: {
      maxPages: number;
      outputFormat: 'png' | 'jpg';
      quality: number;
    }
  ): Promise<PDFProcessingResult['images']> {
    
    const images: PDFProcessingResult['images'] = [];
    
    try {
      // Check if we're in a serverless environment (like Vercel)
      const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NETLIFY;
      
      if (isServerless) {
        console.log('🚀 Serverless environment detected, using alternative PDF processing...');
        return await this.convertPDFPagesAlternative(pdfBuffer, options);
      }
      
      // Try to import pdf2pic dynamically - completely optional
      let fromBuffer;
      try {
        const pdf2pic = await import('pdf2pic').catch(() => {
          console.warn('pdf2pic not available, using alternative processing...');
          return null;
        });
        
        if (!pdf2pic) {
          return await this.convertPDFPagesAlternative(pdfBuffer, options);
        }
        
        fromBuffer = pdf2pic.fromBuffer || pdf2pic.default?.fromBuffer || pdf2pic.default;
        
        if (!fromBuffer) {
          console.warn('pdf2pic fromBuffer method not available, trying alternative...');
          return await this.convertPDFPagesAlternative(pdfBuffer, options);
        }
      } catch (importError) {
        console.warn(`Failed to import pdf2pic: ${importError instanceof Error ? importError.message : 'Unknown import error'}`);
        return await this.convertPDFPagesAlternative(pdfBuffer, options);
      }
      
      // Configure pdf2pic options for serverless compatibility
      const tempDir = process.env.VERCEL ? '/tmp' : (process.platform === 'win32' ? process.env.TEMP || 'C:\\temp' : '/tmp');
      
      const convert = fromBuffer(pdfBuffer, {
        density: 200, // Reduced density for serverless performance
        saveFilename: `pdf_page_${Date.now()}`,
        savePath: tempDir,
        format: options.outputFormat,
        quality: options.quality,
        width: 800, // Reduced size for serverless
        height: 1000,
        preserveAspectRatio: true
      });
      
      // Convert specified number of pages
      for (let pageNum = 1; pageNum <= options.maxPages; pageNum++) {
        try {
          const result = await convert(pageNum, { 
            responseType: "base64",
            // Add timeout for serverless environments
            timeout: 30000 
          });
          
          if (result && result.base64) {
            // Create data URL for OpenAI Vision API
            const mimeType = options.outputFormat === 'png' ? 'image/png' : 'image/jpeg';
            const dataUrl = `data:${mimeType};base64,${result.base64}`;
            
            images.push({
              url: dataUrl,
              base64: result.base64,
              pageNumber: pageNum,
              width: result.width || 800,
              height: result.height || 1000
            });
            
            console.log(`📄 Converted page ${pageNum} to ${options.outputFormat.toUpperCase()}`);
          }
        } catch (pageError) {
          console.warn(`Failed to convert page ${pageNum}:`, pageError);
          // Continue with other pages even if one fails
          continue;
        }
      }
      
      if (images.length === 0) {
        console.log('No pages converted with pdf2pic, trying alternative method...');
        return await this.convertPDFPagesAlternative(pdfBuffer, options);
      }
      
      return images;
      
    } catch (error) {
      console.error('PDF to image conversion failed:', error);
      console.log('Falling back to alternative PDF processing...');
      return await this.convertPDFPagesAlternative(pdfBuffer, options);
    }
  }

  /**
   * Alternative PDF processing method for serverless environments
   * Uses pdf-parse for text extraction and creates placeholder images
   */
  private static async convertPDFPagesAlternative(
    pdfBuffer: Buffer,
    options: {
      maxPages: number;
      outputFormat: 'png' | 'jpg';
      quality: number;
    }
  ): Promise<PDFProcessingResult['images']> {
    
    const images: PDFProcessingResult['images'] = [];
    
    try {
      console.log('🔄 Using alternative PDF processing for serverless environment...');
      
      // Use pdf-parse to extract basic PDF information
      const pdfParse = await import('pdf-parse');
      const data = await pdfParse.default(pdfBuffer, { max: options.maxPages });
      
      console.log(`📊 PDF contains ${data.numpages} pages`);
      
      // Create a more informative placeholder that includes PDF text content
      const textContent = data.text || 'PDF content could not be extracted';
      const pageCount = Math.min(data.numpages, options.maxPages);
      
      // Create placeholder images for each page
      // These will be handled specially in the AI analysis
      for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
        // Create a simple 1x1 transparent PNG as placeholder
        const placeholderBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
        const mimeType = 'image/png';
        const dataUrl = `data:${mimeType};base64,${placeholderBase64}`;
        
        images.push({
          url: dataUrl,
          base64: placeholderBase64,
          pageNumber: pageNum,
          width: 1,
          height: 1
        });
        
        console.log(`📄 Created placeholder for page ${pageNum} (text length: ${textContent.length} chars)`);
      }
      
      // Store the extracted text for analysis
      if (textContent && images.length > 0) {
        console.log(`📝 Extracted text from PDF: ${textContent.substring(0, 200)}...`);
      }
      
      return images;
      
    } catch (error) {
      console.error('Alternative PDF processing also failed:', error);
      
      // Final fallback: create a single placeholder image
      const placeholderBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
      const dataUrl = `data:image/png;base64,${placeholderBase64}`;
      
      return [{
        url: dataUrl,
        base64: placeholderBase64,
        pageNumber: 1,
        width: 1,
        height: 1
      }];
    }
  }
  
  /**
   * Validate that a buffer contains PDF data
   */
  static validatePDFBuffer(buffer: Buffer): boolean {
    if (!buffer || buffer.length < 4) {
      return false;
    }
    
    // Check for PDF signature
    const pdfSignature = buffer.subarray(0, 4).toString('ascii');
    return pdfSignature === '%PDF';
  }
  
  /**
   * Get PDF metadata without full processing
   */
  static async getPDFMetadata(pdfBuffer: Buffer): Promise<{
    pageCount: number;
    hasImages: boolean;
    fileSize: number;
    version?: string;
  } | null> {
    
    try {
      const pdfParse = await import('pdf-parse');
      const data = await pdfParse.default(pdfBuffer, { max: 1 }); // Only process metadata
      
      return {
        pageCount: data.numpages,
        hasImages: false, // We'd need more complex parsing to detect this
        fileSize: pdfBuffer.length,
        version: data.version
      };
      
    } catch (error) {
      console.error('Failed to get PDF metadata:', error);
      return null;
    }
  }
  
  /**
   * Process PDF from URL (for uploaded files)
   */
  static async processPDFFromUrl(
    url: string,
    options?: Parameters<typeof PDFProcessor.processPDFForAnalysis>[1]
  ): Promise<PDFProcessingResult> {
    
    try {
      console.log(`📥 Downloading PDF from URL: ${url.substring(0, 100)}...`);
      
      // Fetch PDF from URL
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch PDF: ${response.status} ${response.statusText}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      const pdfBuffer = Buffer.from(arrayBuffer);
      
      // Validate PDF
      if (!this.validatePDFBuffer(pdfBuffer)) {
        throw new Error('Invalid PDF file format');
      }
      
      console.log(`📄 Downloaded PDF (${pdfBuffer.length} bytes)`);
      
      // Process the PDF buffer
      return await this.processPDFForAnalysis(pdfBuffer, options);
      
    } catch (error) {
      console.error('PDF URL processing failed:', error);
      
      return {
        success: false,
        images: [],
        error: error instanceof Error ? error.message : 'Failed to process PDF from URL'
      };
    }
  }
  
  /**
   * Process PDF buffer directly (alias for processPDFForAnalysis)
   */
  static async processPDFBuffer(pdfBuffer: Buffer): Promise<{
    success: boolean;
    images: string[];
    error?: string;
    metadata?: any;
  }> {
    try {
      const result = await this.processPDFForAnalysis(pdfBuffer);
      
      // Convert the result format to match expected return type
      return {
        success: result.success,
        images: result.images.map(img => img.url),
        error: result.error,
        metadata: result.metadata
      };
    } catch (error) {
      return {
        success: false,
        images: [],
        error: error instanceof Error ? error.message : 'PDF processing failed'
      };
    }
  }
}