/**
 * Logo Analysis Data Types
 * Structured data format for LogoCraft Pro analysis results that can be consumed by CapCraft AI
 */

export interface LogoAnalysisResult {
  analysisId: string;
  timestamp: string;
  logoId?: string;
  imageUrl?: string;
  
  // Logo characteristics
  logoType: 'Text' | 'Icon' | 'Combined' | 'Complex' | 'Simple';
  complexity: 'Low' | 'Medium' | 'High' | 'Very High';
  colorCount: number;
  hasGradients: boolean;
  hasFineFeatbils: boolean;
  dimensions: {
    estimatedWidth: number;
    estimatedHeight: number;
    aspectRatio: string;
  };
  
  // Recommended customization methods
  recommendedMethods: LogoCustomizationRecommendation[];
  
  // Cost analysis
  costAnalysis: LogoCostBreakdown;
  
  // Technical specifications
  technicalSpecs: LogoTechnicalSpecs;
  
  // Confidence scores
  confidence: {
    overall: number;
    typeIdentification: number;
    complexityAssessment: number;
    methodRecommendation: number;
  };
  
  // Additional metadata
  metadata?: {
    analysisModel: string;
    processingTime: number;
    revisedAt?: string;
    notes?: string;
    originalFileType?: string;
    processingError?: string;
    pdfProcessing?: {
      pageCount: number;
      extractedImages: number;
      processingTime: number;
      sourcePage?: number;
    };
  };
}

export interface LogoCustomizationRecommendation {
  method: 'Flat Embroidery' | '3D Embroidery' | 'Screen Print' | 'Sublimation' | 'Leather Patch' | 'Rubber Patch';
  application: 'Direct' | 'Patch';
  recommendedSize: 'Small' | 'Medium' | 'Large';
  locations: Array<'Front' | 'Back' | 'Left' | 'Right' | 'Upper Bill' | 'Under Bill'>;
  
  // Cost information per quantity tier
  pricing: {
    [key: string]: number; // price48, price144, price576, etc.
  };
  
  // Quality assessment
  quality: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  suitability: number; // 0-100 percentage
  
  // Pros and cons
  advantages: string[];
  disadvantages: string[];
  
  // Special considerations
  moldCharge?: number;
  limitations?: string[];
  alternatives?: string[];
}

export interface LogoCostBreakdown {
  estimatedCosts: {
    [quantity: string]: {
      unitCost: number;
      totalCost: number;
      recommendedMethod: string;
      breakdown: {
        baseCost: number;
        moldCharge?: number;
        complexityPremium?: number;
      };
    };
  };
  
  // Cost optimization suggestions
  optimizations: {
    simplification?: {
      description: string;
      potentialSavings: number;
    };
    alternativeMethod?: {
      method: string;
      savings: number;
      tradeoffs: string[];
    };
    quantityOptimization?: {
      recommendedQuantity: number;
      unitSavings: number;
      reason: string;
    };
  };
}

export interface LogoTechnicalSpecs {
  requiredResolution: {
    minimum: string;
    recommended: string;
  };
  fileFormats: {
    preferred: string[];
    acceptable: string[];
    notRecommended: string[];
  };
  colorSpecs: {
    colorMode: 'CMYK' | 'RGB' | 'Pantone';
    colorCount: number;
    specialColors?: string[];
  };
  vectorRequirements: {
    required: boolean;
    reason?: string;
    alternatives?: string[];
  };
}

// Conversation context extension for logo analysis
export interface LogoAnalysisContext {
  hasLogoAnalysis: boolean;
  analysisResults?: LogoAnalysisResult[];
  activeAnalysisId?: string;
  logoHandoffRequested?: boolean;
  quoteRequestWithLogo?: boolean;
  
  // Integration flags
  readyForQuoteGeneration: boolean;
  logoSpecificationsConfirmed: boolean;
  costEstimatesProvided: boolean;
}

// AI handoff data structure
export interface AIHandoffData {
  fromAssistant: string;
  toAssistant: string;
  handoffType: 'logo-to-quote' | 'quote-refinement' | 'cost-verification';
  timestamp: string;
  
  // Context data
  logoAnalysis?: LogoAnalysisResult;
  customerRequirements?: {
    quantity: number;
    budget?: number;
    timeline?: string;
    preferences?: string[];
  };
  
  // Handoff message
  handoffMessage: string;
  preserveContext: boolean;
  
  // Validation
  dataValidation: {
    logoDataComplete: boolean;
    pricingConsistent: boolean;
    specificationsValid: boolean;
    readyForProcessing: boolean;
  };
}

// Pricing consistency validation
export interface PricingConsistencyCheck {
  logoAnalysisCost: number;
  quoteCost: number;
  discrepancyFound: boolean;
  discrepancyAmount?: number;
  discrepancyReason?: string;
  
  // Resolution
  resolvedCost: number;
  resolutionMethod: 'use-logo-analysis' | 'use-quote-calculation' | 'manual-review' | 'recalculate';
  confidence: number;
}

// Export utilities for type checking
export const isLogoAnalysisResult = (obj: any): obj is LogoAnalysisResult => {
  return obj && typeof obj.analysisId === 'string' && Array.isArray(obj.recommendedMethods);
};

export const isAIHandoffData = (obj: any): obj is AIHandoffData => {
  return obj && typeof obj.fromAssistant === 'string' && typeof obj.toAssistant === 'string';
};