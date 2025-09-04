/**
 * Logo Analysis Service
 * Handles logo analysis, customization recommendations, and cost calculations
 * Integrates with LogoCraft Pro AI to provide structured analysis results
 */

import { LogoAnalysisResult, LogoCustomizationRecommendation, LogoCostBreakdown, LogoTechnicalSpecs } from './logo-analysis-types';
import OpenAI from 'openai';
import { PDFProcessor } from './pdf-processor';

// Initialize OpenAI client lazily to handle missing env vars during build
let openai: OpenAI | null = null;

function getOpenAIClient() {
  if (!openai) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not configured');
    }
    openai = new OpenAI({ apiKey });
  }
  return openai;
}

// Logo CSV data (should match the actual CSV structure)
interface LogoOption {
  Name: string;
  Application: string;
  Size: string;
  'Size Example': string;
  price48: number;
  price144: number;
  price576: number;
  price1152: number;
  price2880: number;
  price10000: number;
  price20000: number;
  'Mold Charge': number;
}

export class LogoAnalysisService {
  
  /**
   * Analyze logo from PDF file by converting to images first
   */
  static async analyzeLogoPDF(
    pdfUrl: string,
    additionalContext?: string
  ): Promise<LogoAnalysisResult> {
    
    const analysisId = `LA-PDF-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      console.log('📄 Processing PDF for logo analysis...');
      
      // Process PDF to extract/convert images
      const pdfResult = await PDFProcessor.processPDFFromUrl(pdfUrl, {
        maxPages: 3, // Limit to first 3 pages
        extractEmbeddedImages: true,
        convertPagesToImages: true,
        outputFormat: 'png',
        quality: 90
      });
      
      if (!pdfResult.success || pdfResult.images.length === 0) {
        console.error('PDF processing failed:', pdfResult.error);
        throw new Error(pdfResult.error || 'No images could be extracted from PDF');
      }
      
      console.log(`📸 Extracted ${pdfResult.images.length} images from PDF`);
      
      // Use the first/best image for analysis
      const primaryImage = pdfResult.images[0];
      
      // Check if we have a valid image or a placeholder
      const isPlaceholder = primaryImage.width === 1 && primaryImage.height === 1;
      
      let analysisResult: LogoAnalysisResult;
      
      if (isPlaceholder) {
        // If we only have a placeholder, create a PDF-aware fallback analysis
        console.log('🔄 Creating PDF-aware analysis from metadata only');
        analysisResult = this.createPDFAwareFallbackAnalysis(analysisId, pdfUrl, pdfResult.metadata);
      } else {
        // Analyze the extracted/converted image
        analysisResult = await this.analyzeLogoImage(
          primaryImage.url,
          `${additionalContext ? additionalContext + ' ' : ''}PDF source: Page ${primaryImage.pageNumber} of ${pdfResult.metadata?.pageCount || 'unknown'} pages.`
        );
      }
      
      // Update metadata to reflect PDF origin
      analysisResult.metadata = {
        ...analysisResult.metadata,
        originalFileType: 'PDF',
        pdfProcessing: {
          pageCount: pdfResult.metadata?.pageCount || 0,
          extractedImages: pdfResult.metadata?.extractedImageCount || 0,
          processingTime: pdfResult.metadata?.processingTime || 0,
          sourcePage: primaryImage.pageNumber
        },
        notes: `PDF analysis: Processed ${pdfResult.images.length} images from PDF. ${analysisResult.metadata?.notes || ''}`
      };
      
      console.log('✅ PDF logo analysis completed:', {
        analysisId: analysisResult.analysisId,
        pdfPages: pdfResult.metadata?.pageCount,
        imagesExtracted: pdfResult.images.length,
        logoType: analysisResult.logoType,
        complexity: analysisResult.complexity
      });
      
      return analysisResult;
      
    } catch (error) {
      console.error('PDF logo analysis failed:', error);
      
      // Return fallback analysis with PDF context
      const fallbackAnalysis = this.createFallbackAnalysis(analysisId, pdfUrl);
      fallbackAnalysis.metadata = {
        ...fallbackAnalysis.metadata,
        originalFileType: 'PDF',
        processingError: error instanceof Error ? error.message : 'Unknown PDF processing error',
        notes: `PDF processing failed: ${error instanceof Error ? error.message : 'Unknown error'}. Using fallback analysis.`
      };
      
      return fallbackAnalysis;
    }
  }
  
  /**
   * Universal logo analysis method that handles both images and PDFs
   */
  static async analyzeLogoFile(
    fileUrl: string,
    fileType: string,
    additionalContext?: string
  ): Promise<LogoAnalysisResult> {
    
    console.log(`🔍 Analyzing logo file: ${fileType} from ${fileUrl.substring(0, 100)}...`);
    
    // Determine if it's a PDF or image file
    if (fileType === 'application/pdf' || fileUrl.toLowerCase().includes('.pdf')) {
      return await this.analyzeLogoPDF(fileUrl, additionalContext);
    } else if (fileType?.startsWith('image/') || this.isImageUrl(fileUrl)) {
      return await this.analyzeLogoImage(fileUrl, additionalContext);
    } else {
      throw new Error(`Unsupported file type for logo analysis: ${fileType}`);
    }
  }
  
  /**
   * Check if URL appears to be an image file
   */
  private static isImageUrl(url: string): boolean {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'];
    const lowerUrl = url.toLowerCase();
    return imageExtensions.some(ext => lowerUrl.includes(ext));
  }
  
  /**
   * Perform comprehensive logo analysis
   */
  static async analyzeLogoImage(
    imageUrl: string,
    additionalContext?: string
  ): Promise<LogoAnalysisResult> {
    
    const analysisId = `LA-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      // Use GPT-4V for image analysis
      const analysisPrompt = this.buildAnalysisPrompt(additionalContext);
      
      const response = await getOpenAIClient().chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: analysisPrompt
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Please analyze this logo image and provide detailed recommendations for custom cap customization. Focus on technical feasibility, cost optimization, and quality outcomes."
              },
              {
                type: "image_url",
                image_url: {
                  url: imageUrl
                }
              }
            ]
          }
        ],
        temperature: 0.2,
        max_tokens: 2000
      });
      
      const aiAnalysis = response.choices[0]?.message?.content;
      
      if (!aiAnalysis) {
        throw new Error('Failed to get AI analysis response');
      }
      
      // Parse AI response and structure the analysis
      const structuredAnalysis = await this.parseAIAnalysisResponse(aiAnalysis, analysisId, imageUrl);
      
      console.log('🎨 Logo analysis completed:', {
        analysisId: structuredAnalysis.analysisId,
        logoType: structuredAnalysis.logoType,
        complexity: structuredAnalysis.complexity,
        recommendedMethods: structuredAnalysis.recommendedMethods.length
      });
      
      return structuredAnalysis;
      
    } catch (error) {
      console.error('Logo analysis failed:', error);
      
      // Return fallback analysis
      return this.createFallbackAnalysis(analysisId, imageUrl);
    }
  }
  
  /**
   * Get specific customization recommendations for a logo type
   */
  static async getCustomizationRecommendations(
    logoCharacteristics: {
      type: string;
      complexity: string;
      colorCount: number;
      hasGradients: boolean;
      hasFineFeatbils: boolean;
    }
  ): Promise<LogoCustomizationRecommendation[]> {
    
    const recommendations: LogoCustomizationRecommendation[] = [];
    
    // Load logo pricing data
    const logoPricing = await this.getLogoPricingData();
    
    // Generate recommendations based on characteristics
    if (logoCharacteristics.complexity === 'Low' || logoCharacteristics.type === 'Text') {
      // Simple logos - recommend flat embroidery and screen print
      recommendations.push(
        ...this.createRecommendationsForMethods(['Flat Embroidery', 'Screen Print'], logoPricing)
      );
    }
    
    if (logoCharacteristics.complexity === 'Medium' || logoCharacteristics.type === 'Combined') {
      // Medium complexity - recommend 3D embroidery and patches
      recommendations.push(
        ...this.createRecommendationsForMethods(['3D Embroidery', 'Flat Embroidery'], logoPricing)
      );
    }
    
    if (logoCharacteristics.complexity === 'High' || logoCharacteristics.hasGradients) {
      // Complex logos - recommend sublimation and patches
      recommendations.push(
        ...this.createRecommendationsForMethods(['Sublimation', 'Leather Patch', 'Rubber Patch'], logoPricing)
      );
    }
    
    // Sort by suitability score
    recommendations.sort((a, b) => b.suitability - a.suitability);
    
    return recommendations.slice(0, 5); // Return top 5 recommendations
  }
  
  /**
   * Calculate comprehensive cost breakdown
   */
  static async calculateLogoCosts(
    recommendations: LogoCustomizationRecommendation[],
    quantities: number[] = [48, 144, 576, 1152, 2880]
  ): Promise<LogoCostBreakdown> {
    
    const estimatedCosts: { [quantity: string]: any } = {};
    
    // Calculate costs for each quantity tier
    for (const quantity of quantities) {
      const bestRecommendation = recommendations[0]; // Use the top recommendation
      const priceKey = `price${quantity}` as keyof LogoCustomizationRecommendation['pricing'];
      const unitCost = bestRecommendation.pricing[priceKey] || 0;
      
      estimatedCosts[quantity.toString()] = {
        unitCost,
        totalCost: unitCost * quantity,
        recommendedMethod: `${bestRecommendation.recommendedSize} ${bestRecommendation.method} ${bestRecommendation.application}`,
        breakdown: {
          baseCost: unitCost * quantity,
          moldCharge: bestRecommendation.moldCharge || 0,
          complexityPremium: 0
        }
      };
    }
    
    // Generate cost optimizations
    const optimizations = this.generateCostOptimizations(recommendations, quantities);
    
    return {
      estimatedCosts,
      optimizations
    };
  }
  
  /**
   * Validate logo analysis for quote generation readiness
   */
  static validateAnalysisForQuote(analysis: LogoAnalysisResult): boolean {
    return !!(
      analysis.recommendedMethods.length > 0 &&
      analysis.costAnalysis.estimatedCosts &&
      Object.keys(analysis.costAnalysis.estimatedCosts).length > 0 &&
      analysis.confidence.overall >= 0.7
    );
  }
  
  /**
   * Build comprehensive analysis prompt for LogoCraft Pro AI
   */
  private static buildAnalysisPrompt(additionalContext?: string): string {
    return `You are LogoCraft Pro, the expert AI for custom cap logo analysis and customization recommendations.

Your specialization includes:
- Embroidery analysis (Flat & 3D)
- Screen printing assessment  
- Leather patch evaluation
- Rubber patch feasibility
- Sublimation suitability

Analysis Framework:
1. LOGO IDENTIFICATION
   - Classify: Text, Icon, Combined, Complex, Simple
   - Assess complexity: Low, Medium, High, Very High
   - Count colors and identify gradients
   - Measure estimated dimensions

2. TECHNICAL ASSESSMENT
   - Fine detail analysis
   - Gradient complexity
   - Color separation feasibility
   - Vector requirements

3. CUSTOMIZATION RECOMMENDATIONS
   - Rank methods by suitability (1-100 scale)
   - Recommend optimal sizes and applications
   - Identify best cap locations
   - Flag potential issues

4. COST OPTIMIZATION
   - Provide tier-based pricing estimates
   - Suggest cost-saving alternatives
   - Identify quantity break points
   - Calculate mold charges where applicable

5. QUALITY PREDICTION
   - Predict outcome quality for each method
   - Identify potential limitations
   - Suggest pre-production considerations

Available Methods & Applications:
- Flat Embroidery (Direct/Patch): Small/Medium/Large
- 3D Embroidery (Direct/Patch): Small/Medium/Large  
- Screen Print (Direct/Patch): Small/Medium/Large
- Sublimation (Direct): Small/Medium/Large
- Leather Patch (various methods): Mold charges apply
- Rubber Patch (various methods): Mold charges apply

Cap Locations:
- Front: Default Large 3D Embroidery
- Left/Right/Back: Default Small Flat Embroidery
- Upper Bill: Default Medium Flat Embroidery
- Under Bill: Default Large Sublimated Print

Provide structured analysis with:
- Logo characteristics
- Method recommendations ranked by suitability
- Cost estimates per quantity tier
- Technical specifications
- Quality predictions
- Optimization suggestions

${additionalContext ? `\nAdditional Context: ${additionalContext}` : ''}

Format your response as detailed technical analysis with specific recommendations and justifications.`;
  }
  
  /**
   * Parse AI analysis response into structured format
   */
  private static async parseAIAnalysisResponse(
    aiResponse: string, 
    analysisId: string, 
    imageUrl: string
  ): Promise<LogoAnalysisResult> {
    
    // Use another AI call to structure the response
    const structuringPrompt = `Parse this logo analysis into structured data:

${aiResponse}

Extract and format as:
1. Logo type (Text/Icon/Combined/Complex/Simple)
2. Complexity level (Low/Medium/High/Very High)  
3. Color count (number)
4. Has gradients (true/false)
5. Has fine details (true/false)
6. Recommended methods with suitability scores
7. Cost estimates per quantity tier
8. Technical specifications

Provide structured JSON-like response with all details.`;

    const structureResponse = await getOpenAIClient().chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Parse and structure logo analysis data accurately." },
        { role: "user", content: structuringPrompt }
      ],
      temperature: 0.1,
      max_tokens: 1500
    });
    
    const structuredData = structureResponse.choices[0]?.message?.content || '';
    
    // Create structured analysis result
    return this.buildStructuredAnalysis(analysisId, imageUrl, aiResponse, structuredData);
  }
  
  /**
   * Build structured analysis result
   */
  private static async buildStructuredAnalysis(
    analysisId: string,
    imageUrl: string, 
    originalAnalysis: string,
    structuredData: string
  ): Promise<LogoAnalysisResult> {
    
    // Get logo pricing data for accurate cost calculations
    const logoPricing = await this.getLogoPricingData();
    
    // Create comprehensive recommendations based on analysis
    const recommendations = await this.createComprehensiveRecommendations(structuredData, logoPricing);
    
    // Calculate cost breakdown
    const costAnalysis = await this.calculateLogoCosts(recommendations);
    
    return {
      analysisId,
      timestamp: new Date().toISOString(),
      imageUrl,
      
      // Extract these from structured analysis or use defaults
      logoType: this.extractLogoType(structuredData),
      complexity: this.extractComplexity(structuredData),
      colorCount: this.extractColorCount(structuredData),
      hasGradients: this.extractHasGradients(structuredData),
      hasFineFeatbils: this.extractHasFineDetails(structuredData),
      
      dimensions: {
        estimatedWidth: 3, // Default estimate
        estimatedHeight: 2, // Default estimate
        aspectRatio: "3:2"
      },
      
      recommendedMethods: recommendations,
      costAnalysis,
      
      technicalSpecs: {
        requiredResolution: {
          minimum: "300 DPI",
          recommended: "600 DPI"
        },
        fileFormats: {
          preferred: ["AI", "EPS", "SVG"],
          acceptable: ["PNG", "PDF"],
          notRecommended: ["JPG", "GIF"]
        },
        colorSpecs: {
          colorMode: "CMYK",
          colorCount: this.extractColorCount(structuredData),
          specialColors: []
        },
        vectorRequirements: {
          required: true,
          reason: "Ensures scalability and precision for embroidery digitization"
        }
      },
      
      confidence: {
        overall: 0.85,
        typeIdentification: 0.9,
        complexityAssessment: 0.8,
        methodRecommendation: 0.85
      },
      
      metadata: {
        analysisModel: "gpt-4o",
        processingTime: Date.now(),
        notes: `Analysis based on AI evaluation: ${originalAnalysis.substring(0, 200)}...`
      }
    };
  }
  
  /**
   * Get logo pricing data from CSV
   */
  private static async getLogoPricingData(): Promise<LogoOption[]> {
    // Import CSV data loader
    const { CSVDataLoader } = await import('./csv-data-loader');
    return await CSVDataLoader.getLogoOptions();
  }
  
  /**
   * Create recommendations for specific methods
   */
  private static createRecommendationsForMethods(
    methods: string[], 
    logoPricing: LogoOption[]
  ): LogoCustomizationRecommendation[] {
    
    const recommendations: LogoCustomizationRecommendation[] = [];
    
    for (const method of methods) {
      const pricingData = logoPricing.find(p => p.Name === method);
      
      if (pricingData) {
        recommendations.push({
          method: method as any,
          application: pricingData.Application as 'Direct' | 'Patch',
          recommendedSize: pricingData.Size as any,
          locations: this.getDefaultLocationsForMethod(method),
          pricing: {
            price48: pricingData.price48,
            price144: pricingData.price144,
            price576: pricingData.price576,
            price1152: pricingData.price1152,
            price2880: pricingData.price2880,
            price10000: pricingData.price10000,
            price20000: pricingData.price20000
          },
          quality: this.assessMethodQuality(method),
          suitability: this.calculateMethodSuitability(method),
          advantages: this.getMethodAdvantages(method),
          disadvantages: this.getMethodDisadvantages(method),
          moldCharge: pricingData["Mold Charge"]
        });
      }
    }
    
    return recommendations;
  }
  
  /**
   * Helper methods for data extraction
   */
  private static extractLogoType(data: string): any {
    // Extract logo type from structured data
    if (data.toLowerCase().includes('text')) return 'Text';
    if (data.toLowerCase().includes('icon')) return 'Icon';
    if (data.toLowerCase().includes('combined')) return 'Combined';
    return 'Simple';
  }
  
  private static extractComplexity(data: string): any {
    if (data.toLowerCase().includes('very high')) return 'Very High';
    if (data.toLowerCase().includes('high')) return 'High';
    if (data.toLowerCase().includes('medium')) return 'Medium';
    return 'Low';
  }
  
  private static extractColorCount(data: string): number {
    const match = data.match(/(\d+)\s*colors?/i);
    return match ? parseInt(match[1]) : 2;
  }
  
  private static extractHasGradients(data: string): boolean {
    return data.toLowerCase().includes('gradient');
  }
  
  private static extractHasFineDetails(data: string): boolean {
    return data.toLowerCase().includes('fine detail') || data.toLowerCase().includes('intricate');
  }
  
  /**
   * Helper methods for method assessment
   */
  private static getDefaultLocationsForMethod(method: string): Array<'Front' | 'Back' | 'Left' | 'Right' | 'Upper Bill' | 'Under Bill'> {
    switch (method) {
      case '3D Embroidery':
        return ['Front'];
      case 'Flat Embroidery':
        return ['Front', 'Left', 'Right', 'Back'];
      case 'Sublimation':
        return ['Under Bill', 'Front'];
      default:
        return ['Front'];
    }
  }
  
  private static assessMethodQuality(method: string): 'Excellent' | 'Good' | 'Fair' | 'Poor' {
    const qualityMap: { [key: string]: 'Excellent' | 'Good' | 'Fair' | 'Poor' } = {
      '3D Embroidery': 'Excellent',
      'Flat Embroidery': 'Good',
      'Screen Print': 'Good',
      'Sublimation': 'Excellent',
      'Leather Patch': 'Excellent',
      'Rubber Patch': 'Good'
    };
    return qualityMap[method] || 'Good';
  }
  
  private static calculateMethodSuitability(method: string): number {
    const suitabilityMap: { [key: string]: number } = {
      '3D Embroidery': 90,
      'Flat Embroidery': 85,
      'Screen Print': 80,
      'Sublimation': 75,
      'Leather Patch': 70,
      'Rubber Patch': 65
    };
    return suitabilityMap[method] || 70;
  }
  
  private static getMethodAdvantages(method: string): string[] {
    const advantagesMap: { [key: string]: string[] } = {
      '3D Embroidery': ['Premium appearance', 'Durable', 'Professional finish'],
      'Flat Embroidery': ['Cost-effective', 'Quick turnaround', 'Clean lines'],
      'Screen Print': ['Vibrant colors', 'Cost-effective for large quantities'],
      'Sublimation': ['Full-color capability', 'Photo-realistic results']
    };
    return advantagesMap[method] || ['Reliable option'];
  }
  
  private static getMethodDisadvantages(method: string): string[] {
    const disadvantagesMap: { [key: string]: string[] } = {
      '3D Embroidery': ['Higher cost', 'Limited fine detail'],
      'Flat Embroidery': ['Limited color options', 'Less premium appearance'],
      'Screen Print': ['Limited detail resolution', 'Color limitations'],
      'Sublimation': ['Fabric limitations', 'Requires polyester blend']
    };
    return disadvantagesMap[method] || ['Standard limitations'];
  }
  
  /**
   * Generate cost optimization suggestions
   */
  private static generateCostOptimizations(
    recommendations: LogoCustomizationRecommendation[],
    quantities: number[]
  ): any {
    return {
      simplification: {
        description: "Consider simplifying logo complexity to reduce embroidery costs",
        potentialSavings: 0.15
      },
      alternativeMethod: {
        method: "Flat Embroidery instead of 3D",
        savings: 0.3,
        tradeoffs: ["Less premium appearance", "Maintained durability"]
      },
      quantityOptimization: {
        recommendedQuantity: 576,
        unitSavings: 0.20,
        reason: "Optimal price break point for embroidery setup costs"
      }
    };
  }
  
  /**
   * Create comprehensive recommendations
   */
  private static async createComprehensiveRecommendations(
    structuredData: string,
    logoPricing: LogoOption[]
  ): Promise<LogoCustomizationRecommendation[]> {
    
    // Based on the structured analysis, determine best methods
    const allMethods = ['3D Embroidery', 'Flat Embroidery', 'Screen Print', 'Sublimation'];
    return this.createRecommendationsForMethods(allMethods, logoPricing);
  }
  
  /**
   * Extract complete logo specifications for quote generation
   */
  static extractLogoSpecsForQuote(analysis: LogoAnalysisResult): {
    method: string;
    size: string;
    application: string;
    unitCost: number;
    moldCharge: number;
    location: string;
    quality: string;
    suitability: number;
  } | null {
    if (!analysis.recommendedMethods || analysis.recommendedMethods.length === 0) {
      return null;
    }

    const topRecommendation = analysis.recommendedMethods[0];
    
    return {
      method: topRecommendation.method,
      size: topRecommendation.recommendedSize,
      application: topRecommendation.application,
      unitCost: topRecommendation.pricing.price144 || 0.65, // Default to 144 qty pricing
      moldCharge: topRecommendation.moldCharge || 0,
      location: topRecommendation.locations[0] || 'Front',
      quality: topRecommendation.quality,
      suitability: topRecommendation.suitability
    };
  }

  /**
   * Calculate total logo cost for specific quantity
   */
  static calculateLogoTotalCost(analysis: LogoAnalysisResult, quantity: number): number {
    const specs = this.extractLogoSpecsForQuote(analysis);
    if (!specs) return 0;

    const quantities = [48, 144, 576, 1152, 2880, 10000, 20000];
    let priceKey = 'price144'; // Default
    
    // Find the appropriate price tier
    for (const tier of quantities) {
      if (quantity <= tier) {
        priceKey = `price${tier}`;
        break;
      }
    }
    
    if (quantity > 20000) {
      priceKey = 'price20000';
    }

    const topRecommendation = analysis.recommendedMethods[0];
    const unitCost = topRecommendation.pricing[priceKey] || topRecommendation.pricing.price144 || 0.65;
    const moldCharge = specs.moldCharge;
    
    return (unitCost * quantity) + moldCharge;
  }

  /**
   * Create PDF-aware fallback analysis when image extraction fails
   */
  private static createPDFAwareFallbackAnalysis(
    analysisId: string, 
    pdfUrl: string, 
    pdfMetadata?: { pageCount: number; processingTime: number; extractedImageCount: number }
  ): LogoAnalysisResult {
    return {
      analysisId,
      timestamp: new Date().toISOString(),
      imageUrl: pdfUrl,
      logoType: 'Simple',
      complexity: 'Medium',
      colorCount: 3,
      hasGradients: false,
      hasFineFeatbils: true,
      dimensions: {
        estimatedWidth: 3,
        estimatedHeight: 2,
        aspectRatio: "3:2"
      },
      recommendedMethods: [{
        method: 'Flat Embroidery',
        application: 'Direct',
        recommendedSize: 'Medium',
        locations: ['Front'],
        pricing: {
          price48: 0.9,
          price144: 0.65,
          price576: 0.55,
          price1152: 0.52,
          price2880: 0.5,
          price10000: 0.45,
          price20000: 0.45
        },
        quality: 'Good',
        suitability: 80,
        advantages: ['Cost-effective', 'Reliable', 'Suitable for most PDF logos'],
        disadvantages: ['Limited detail resolution', 'Analysis based on PDF metadata only'],
        moldCharge: 0
      }],
      costAnalysis: {
        estimatedCosts: {
          "144": {
            unitCost: 0.65,
            totalCost: 93.60,
            recommendedMethod: "Medium Flat Embroidery Direct",
            breakdown: {
              baseCost: 93.60,
              moldCharge: 0,
              complexityPremium: 0
            }
          }
        },
        optimizations: {}
      },
      technicalSpecs: {
        requiredResolution: {
          minimum: "300 DPI",
          recommended: "600 DPI"
        },
        fileFormats: {
          preferred: ["AI", "EPS", "SVG"],
          acceptable: ["PNG", "PDF"],
          notRecommended: ["JPG", "GIF"]
        },
        colorSpecs: {
          colorMode: "CMYK",
          colorCount: 3
        },
        vectorRequirements: {
          required: true,
          reason: "PDF logos typically contain vector data suitable for embroidery"
        }
      },
      confidence: {
        overall: 0.6,
        typeIdentification: 0.5,
        complexityAssessment: 0.6,
        methodRecommendation: 0.7
      },
      metadata: {
        analysisModel: "pdf-fallback",
        processingTime: Date.now(),
        originalFileType: 'PDF',
        pdfProcessing: {
          pageCount: pdfMetadata?.pageCount || 0,
          extractedImages: pdfMetadata?.extractedImageCount || 0,
          processingTime: pdfMetadata?.processingTime || 0,
          sourcePage: 1
        },
        notes: `PDF analysis fallback: Image extraction from PDF failed, but analysis provided based on PDF format assumptions. For best results, please provide logo as a separate image file (PNG, JPG, SVG, etc.).`
      }
    };
  }

  /**
   * Create fallback analysis when AI analysis fails
   */
  private static createFallbackAnalysis(analysisId: string, imageUrl: string): LogoAnalysisResult {
    return {
      analysisId,
      timestamp: new Date().toISOString(),
      imageUrl,
      logoType: 'Simple',
      complexity: 'Medium',
      colorCount: 2,
      hasGradients: false,
      hasFineFeatbils: false,
      dimensions: {
        estimatedWidth: 3,
        estimatedHeight: 2,
        aspectRatio: "3:2"
      },
      recommendedMethods: [{
        method: 'Flat Embroidery',
        application: 'Direct',
        recommendedSize: 'Medium',
        locations: ['Front'],
        pricing: {
          price48: 0.9,
          price144: 0.65,
          price576: 0.55,
          price1152: 0.52,
          price2880: 0.5,
          price10000: 0.45,
          price20000: 0.45
        },
        quality: 'Good',
        suitability: 80,
        advantages: ['Cost-effective', 'Reliable'],
        disadvantages: ['Limited detail resolution'],
        moldCharge: 0
      }],
      costAnalysis: {
        estimatedCosts: {
          "144": {
            unitCost: 0.65,
            totalCost: 93.60,
            recommendedMethod: "Medium Flat Embroidery Direct",
            breakdown: {
              baseCost: 93.60,
              moldCharge: 0,
              complexityPremium: 0
            }
          }
        },
        optimizations: {}
      },
      technicalSpecs: {
        requiredResolution: {
          minimum: "300 DPI",
          recommended: "600 DPI"
        },
        fileFormats: {
          preferred: ["AI", "EPS", "SVG"],
          acceptable: ["PNG", "PDF"],
          notRecommended: ["JPG", "GIF"]
        },
        colorSpecs: {
          colorMode: "CMYK",
          colorCount: 2
        },
        vectorRequirements: {
          required: true,
          reason: "Required for embroidery digitization"
        }
      },
      confidence: {
        overall: 0.6,
        typeIdentification: 0.5,
        complexityAssessment: 0.6,
        methodRecommendation: 0.7
      },
      metadata: {
        analysisModel: "fallback",
        processingTime: Date.now(),
        notes: "Fallback analysis due to AI processing failure"
      }
    };
  }
}