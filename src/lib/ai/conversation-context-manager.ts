/**
 * Conversation Context Manager
 * Manages seamless data flow and context preservation between AI assistants
 */

import { ConversationService } from '../conversation';
import { LogoAnalysisResult, LogoAnalysisContext, AIHandoffData, PricingConsistencyCheck } from './logo-analysis-types';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface EnhancedConversationContext {
  // Base context data
  conversationId: string;
  sessionId: string;
  userId?: string;
  
  // AI state management
  currentAssistant: string;
  previousAssistant?: string;
  assistantHistory: string[];
  
  // Logo analysis context
  logoAnalysis: LogoAnalysisContext;
  
  // Quote generation context  
  quoteContext?: {
    hasActiveQuote: boolean;
    quoteId?: string;
    baseRequirements?: any;
    pricingLocked?: boolean;
  };
  
  // Handoff management
  handoffData?: AIHandoffData;
  
  // Data consistency
  consistencyChecks: {
    pricingValidated: boolean;
    specificationsConfirmed: boolean;
    lastValidationTimestamp?: string;
  };
  
  // Metadata
  metadata: {
    conversationStarted: string;
    lastUpdated: string;
    handoffCount: number;
    totalMessages: number;
  };
}

export class ConversationContextManager {
  
  /**
   * Initialize enhanced conversation context
   */
  static async initializeContext(
    conversationId: string, 
    sessionId: string, 
    userId?: string
  ): Promise<EnhancedConversationContext> {
    
    const context: EnhancedConversationContext = {
      conversationId,
      sessionId,
      userId,
      currentAssistant: 'intent-router',
      assistantHistory: ['intent-router'],
      logoAnalysis: {
        hasLogoAnalysis: false,
        readyForQuoteGeneration: false,
        logoSpecificationsConfirmed: false,
        costEstimatesProvided: false
      },
      consistencyChecks: {
        pricingValidated: false,
        specificationsConfirmed: false
      },
      metadata: {
        conversationStarted: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        handoffCount: 0,
        totalMessages: 0
      }
    };
    
    // Store in conversation metadata
    await this.storeContextInConversation(conversationId, context);
    
    return context;
  }
  
  /**
   * Get existing context or create new one
   */
  static async getOrCreateContext(
    conversationId: string, 
    sessionId: string, 
    userId?: string
  ): Promise<EnhancedConversationContext> {
    
    // Try to get existing context
    const existingContext = await this.getContextFromConversation(conversationId);
    
    if (existingContext) {
      return existingContext;
    }
    
    // Create new context if none exists
    return this.initializeContext(conversationId, sessionId, userId);
  }
  
  /**
   * Store logo analysis results in conversation context
   */
  static async storeLogoAnalysis(
    conversationId: string, 
    analysisResult: LogoAnalysisResult
  ): Promise<void> {
    
    const context = await this.getOrCreateContext(conversationId, '', undefined);
    
    // Update logo analysis context
    context.logoAnalysis.hasLogoAnalysis = true;
    context.logoAnalysis.analysisResults = context.logoAnalysis.analysisResults || [];
    context.logoAnalysis.analysisResults.push(analysisResult);
    context.logoAnalysis.activeAnalysisId = analysisResult.analysisId;
    context.logoAnalysis.costEstimatesProvided = true;
    
    // Update metadata
    context.metadata.lastUpdated = new Date().toISOString();
    
    await this.storeContextInConversation(conversationId, context);
    
    console.log('📊 Logo analysis stored in context:', {
      conversationId,
      analysisId: analysisResult.analysisId,
      logoType: analysisResult.logoType,
      complexity: analysisResult.complexity
    });
  }
  
  /**
   * Execute AI handoff with data preservation
   */
  static async executeAIHandoff(
    conversationId: string,
    handoffData: AIHandoffData
  ): Promise<EnhancedConversationContext> {
    
    const context = await this.getOrCreateContext(conversationId, '', undefined);
    
    // Update assistant state
    context.previousAssistant = context.currentAssistant;
    context.currentAssistant = handoffData.toAssistant;
    context.assistantHistory.push(handoffData.toAssistant);
    
    // Store handoff data
    context.handoffData = handoffData;
    
    // Update metadata
    context.metadata.handoffCount += 1;
    context.metadata.lastUpdated = new Date().toISOString();
    
    // If handoff includes logo analysis, update logo context
    if (handoffData.logoAnalysis) {
      context.logoAnalysis.hasLogoAnalysis = true;
      context.logoAnalysis.analysisResults = context.logoAnalysis.analysisResults || [];
      context.logoAnalysis.analysisResults.push(handoffData.logoAnalysis);
      context.logoAnalysis.readyForQuoteGeneration = handoffData.dataValidation.readyForProcessing;
    }
    
    // Mark quote generation readiness for logo-to-quote handoffs
    if (handoffData.handoffType === 'logo-to-quote') {
      context.logoAnalysis.quoteRequestWithLogo = true;
      context.logoAnalysis.readyForQuoteGeneration = true;
    }
    
    await this.storeContextInConversation(conversationId, context);
    
    console.log('🔄 AI handoff executed:', {
      conversationId,
      from: handoffData.fromAssistant,
      to: handoffData.toAssistant,
      type: handoffData.handoffType,
      handoffCount: context.metadata.handoffCount
    });
    
    return context;
  }
  
  /**
   * Validate pricing consistency between logo analysis and quote generation
   */
  static async validatePricingConsistency(
    conversationId: string,
    quoteCost: number,
    quantity: number
  ): Promise<PricingConsistencyCheck> {
    
    const context = await this.getOrCreateContext(conversationId, '', undefined);
    
    const check: PricingConsistencyCheck = {
      logoAnalysisCost: 0,
      quoteCost,
      discrepancyFound: false,
      resolvedCost: quoteCost,
      resolutionMethod: 'use-quote-calculation',
      confidence: 1.0
    };
    
    // Get logo analysis cost if available
    if (context.logoAnalysis.hasLogoAnalysis && context.logoAnalysis.analysisResults) {
      const activeAnalysis = context.logoAnalysis.analysisResults.find(
        result => result.analysisId === context.logoAnalysis.activeAnalysisId
      ) || context.logoAnalysis.analysisResults[context.logoAnalysis.analysisResults.length - 1];
      
      if (activeAnalysis) {
        const quantityKey = `price${quantity}`;
        const logoEstimate = activeAnalysis.costAnalysis.estimatedCosts[quantityKey];
        
        if (logoEstimate) {
          check.logoAnalysisCost = logoEstimate.totalCost;
          
          // Check for discrepancies (allow 5% tolerance)
          const tolerance = 0.05;
          const difference = Math.abs(check.logoAnalysisCost - quoteCost);
          const percentageDiff = difference / Math.max(check.logoAnalysisCost, quoteCost);
          
          if (percentageDiff > tolerance) {
            check.discrepancyFound = true;
            check.discrepancyAmount = difference;
            check.discrepancyReason = 'Logo analysis and quote calculation differ by more than 5%';
            
            // Use the more conservative (higher) cost
            check.resolvedCost = Math.max(check.logoAnalysisCost, quoteCost);
            check.resolutionMethod = check.logoAnalysisCost > quoteCost ? 'use-logo-analysis' : 'use-quote-calculation';
            check.confidence = 0.8;
          }
        }
      }
    }
    
    // Update context with validation results
    context.consistencyChecks.pricingValidated = !check.discrepancyFound;
    context.consistencyChecks.lastValidationTimestamp = new Date().toISOString();
    context.metadata.lastUpdated = new Date().toISOString();
    
    await this.storeContextInConversation(conversationId, context);
    
    console.log('💰 Pricing consistency check:', {
      conversationId,
      discrepancyFound: check.discrepancyFound,
      logoAnalysisCost: check.logoAnalysisCost,
      quoteCost: check.quoteCost,
      resolvedCost: check.resolvedCost
    });
    
    return check;
  }
  
  /**
   * Get logo analysis context for quote generation
   */
  static async getLogoContextForQuote(conversationId: string): Promise<LogoAnalysisResult | null> {
    const context = await this.getOrCreateContext(conversationId, '', undefined);
    
    if (!context.logoAnalysis.hasLogoAnalysis || !context.logoAnalysis.analysisResults) {
      return null;
    }
    
    // Get the active analysis or the most recent one
    const activeAnalysis = context.logoAnalysis.analysisResults.find(
      result => result.analysisId === context.logoAnalysis.activeAnalysisId
    ) || context.logoAnalysis.analysisResults[context.logoAnalysis.analysisResults.length - 1];
    
    return activeAnalysis;
  }
  
  /**
   * Check if context is ready for seamless quote generation
   */
  static async isReadyForQuoteGeneration(conversationId: string): Promise<boolean> {
    const context = await this.getOrCreateContext(conversationId, '', undefined);
    
    return context.logoAnalysis.readyForQuoteGeneration && 
           context.logoAnalysis.hasLogoAnalysis &&
           context.logoAnalysis.costEstimatesProvided;
  }
  
  /**
   * Store context in conversation metadata
   */
  private static async storeContextInConversation(
    conversationId: string, 
    context: EnhancedConversationContext
  ): Promise<void> {
    try {
      await prisma.conversation.update({
        where: { id: conversationId },
        data: {
          metadata: {
            enhancedContext: context,
            lastContextUpdate: new Date().toISOString()
          },
          updatedAt: new Date()
        }
      });
    } catch (error) {
      console.error('Failed to store context in conversation:', error);
      // Continue execution - context will be lost but conversation can continue
    }
  }
  
  /**
   * Get context from conversation metadata
   */
  private static async getContextFromConversation(
    conversationId: string
  ): Promise<EnhancedConversationContext | null> {
    try {
      const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId }
      });
      
      if (conversation?.metadata && typeof conversation.metadata === 'object') {
        const metadata = conversation.metadata as any;
        return metadata.enhancedContext || null;
      }
      
      return null;
    } catch (error) {
      console.error('Failed to get context from conversation:', error);
      return null;
    }
  }
  
  /**
   * Clear context (useful for debugging or reset)
   */
  static async clearContext(conversationId: string): Promise<void> {
    try {
      await prisma.conversation.update({
        where: { id: conversationId },
        data: {
          metadata: {},
          updatedAt: new Date()
        }
      });
      
      console.log('🧹 Context cleared for conversation:', conversationId);
    } catch (error) {
      console.error('Failed to clear context:', error);
    }
  }
  
  /**
   * Get context summary for debugging
   */
  static async getContextSummary(conversationId: string): Promise<any> {
    const context = await this.getOrCreateContext(conversationId, '', undefined);
    
    return {
      conversationId: context.conversationId,
      currentAssistant: context.currentAssistant,
      hasLogoAnalysis: context.logoAnalysis.hasLogoAnalysis,
      readyForQuote: context.logoAnalysis.readyForQuoteGeneration,
      handoffCount: context.metadata.handoffCount,
      totalMessages: context.metadata.totalMessages,
      lastUpdated: context.metadata.lastUpdated
    };
  }
}