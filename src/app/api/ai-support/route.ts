/**
 * Enhanced AI Support API - Seamless Multi-AI System
 * 
 * Features:
 * - LogoCraft Pro ↔ CapCraft AI seamless handoff
 * - Conversation context preservation
 * - Pricing consistency validation
 * - Structured logo analysis data flow
 * - Intent-based AI routing
 */

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getCurrentUser, getUserProfile } from '@/lib/auth-helpers';
import { ConversationService } from '@/lib/conversation';
import { ConversationContext, MessageRole } from '@prisma/client';
import { ConversationContextManager } from '@/lib/ai/conversation-context-manager';
import { LogoAnalysisService } from '@/lib/ai/logo-analysis-service';
import { AI_ASSISTANTS, getAssistantByIntent, formatAssistantResponse } from '@/lib/ai-assistants-config';
import { LogoAnalysisResult, AIHandoffData } from '@/lib/ai/logo-analysis-types';

// Import existing order processing logic
import { 
 parseOrderRequirements,
 optimizeQuantityForBudgetPrecise,
 calculatePreciseOrderEstimateWithMessage,
 type OrderRequirements
} from '@/lib/order-ai-core';

const openai = new OpenAI({
 apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
 const startTime = Date.now();
 
 try {
  const { 
   message, 
   conversationId, 
   sessionId, 
   uploadedFiles, 
   forceIntent,
   logoAnalysisData,
   currentAssistant
  } = await request.json();
  
  if (!message?.trim()) {
   return NextResponse.json({ 
    error: 'Message is required' 
   }, { status: 400 });
  }

  console.log(`🤖 [AI-SUPPORT] Processing request: "${message.substring(0, 100)}..." with assistant: ${currentAssistant || 'auto'}`);
  
  const user = await getCurrentUser(request);
  let userProfile = null;
  
  // Get user profile for personalization
  if (user?.id) {
   try {
    userProfile = await getUserProfile(user.id);
   } catch (error) {
    console.warn('Failed to load user profile:', error);
   }
  }
  
  // Step 1: Get or create conversation
  const conversation = conversationId 
   ? await ConversationService.getConversationById(conversationId) ||
    await ConversationService.getOrCreateConversation({
     userId: user?.id,
     sessionId: sessionId || `ai-support-${Date.now()}`,
     context: ConversationContext.SUPPORT,
    })
   : await ConversationService.getOrCreateConversation({
     userId: user?.id,
     sessionId: sessionId || `ai-support-${Date.now()}`,
     context: ConversationContext.SUPPORT,
    });

  // Step 2: Initialize enhanced conversation context
  const enhancedContext = await ConversationContextManager.getOrCreateContext(
   conversation.id,
   conversation.sessionId || '',
   user?.id
  );

  // Step 3: Load conversation history
  const conversationHistory = await ConversationService.getConversationContext(
   conversation.id, 
   20 // Load more history for context
  );

  console.log(`🧠 Loaded conversation ${conversation.id} with ${conversationHistory.length} messages`);

  // Step 4: Determine intent and AI assistant (unless forced)
  let intent = forceIntent;
  let activeAssistant = currentAssistant;
  
  if (!intent) {
   intent = await detectIntent(message, conversationHistory, enhancedContext);
  }
  
  if (!activeAssistant) {
   const assistant = getAssistantByIntent(intent);
   activeAssistant = assistant.id;
  }

  console.log(`🎯 Intent: ${intent}, Assistant: ${activeAssistant}`);

  let response: any = {};

  // Step 5: Handle different assistant types and handoffs
  switch (activeAssistant) {
   case 'logo-expert':
    response = await handleLogoAnalysis(
     message, 
     uploadedFiles, 
     conversation.id,
     enhancedContext,
     conversationHistory,
     userProfile
    );
    break;
    
   case 'quote-master':
    response = await handleQuoteGeneration(
     message,
     conversation.id,
     enhancedContext,
     conversationHistory,
     userProfile,
     logoAnalysisData
    );
    break;
    
   case 'support-scout':
    response = await handleSupportQuery(
     message,
     conversation.id,
     enhancedContext,
     conversationHistory,
     userProfile
    );
    break;
    
   default:
    response = await handleGeneralQuery(
     message,
     conversation.id,
     enhancedContext,
     conversationHistory,
     userProfile
    );
  }

  // Step 6: Store conversation messages
  await ConversationService.addMessage(conversation.id, {
   role: 'user',
   content: message,
   metadata: { 
    uploadedFiles, 
    intent, 
    assistant: activeAssistant,
    timestamp: Date.now() 
   }
  });

  await ConversationService.addMessage(conversation.id, {
   role: 'assistant',
   content: response.message || response,
   metadata: { 
    assistant: activeAssistant,
    processingTime: Date.now() - startTime,
    ...response.metadata
   }
  });

  // Step 7: Check for handoff requirements
  const handoffData = await checkForHandoff(
   message, 
   response, 
   activeAssistant, 
   enhancedContext
  );

  if (handoffData) {
   await ConversationContextManager.executeAIHandoff(conversation.id, handoffData);
  }

  const processingTime = Date.now() - startTime;
  console.log(`✅ [AI-SUPPORT] Response generated in ${processingTime}ms`);

  return NextResponse.json({
   message: response.message || response,
   conversationId: conversation.id,
   assistant: AI_ASSISTANTS[activeAssistant],
   intent,
   handoff: handoffData,
   context: await ConversationContextManager.getContextSummary(conversation.id),
   processingTime,
   metadata: response.metadata || {}
  });

 } catch (error) {
  console.error('❌ [AI-SUPPORT] Error:', error);
  return NextResponse.json({
   error: 'Failed to process AI request',
   details: error instanceof Error ? error.message : 'Unknown error'
  }, { status: 500 });
 }
}

/**
 * Detect user intent using GPT-4o-mini
 */
async function detectIntent(
 message: string, 
 conversationHistory: any[], 
 context: any
): Promise<string> {
 
 try {
  const historyContext = conversationHistory.length > 0 
   ? `Recent conversation:\n${conversationHistory.slice(-5).map(msg => 
     `${msg.role}: ${msg.content.substring(0, 200)}`
    ).join('\n')}\n\n`
   : '';

  const intentPrompt = `You are an intent detection AI for US Custom Cap support. Analyze this message and classify the intent.

${historyContext}Current message: "${message}"

Context: ${JSON.stringify(context, null, 2)}

Classify intent as one of:
- LOGO_ANALYSIS: User wants logo analysis, customization advice, or uploaded images
- ORDER_CREATION: User wants quotes, orders, pricing, or product configuration 
- PUBLIC_QUERY: User asks about existing orders, shipping, or general info
- GENERAL_SUPPORT: Unclear requests or general help

If user uploaded images or mentions "logo analysis", always use LOGO_ANALYSIS.
If user mentions "quote" or pricing after logo analysis, check if logo analysis is complete.

Respond with JSON: {"intent": "INTENT_NAME", "confidence": 0.0-1.0, "reasoning": "explanation"}`;

  const response = await openai.chat.completions.create({
   model: "gpt-4o-mini",
   messages: [
    { role: "system", content: intentPrompt },
    { role: "user", content: message }
   ],
   temperature: 0.1,
   max_tokens: 200
  });

  const result = JSON.parse(response.choices[0]?.message?.content || '{"intent": "GENERAL_SUPPORT", "confidence": 0.5}');
  
  console.log(`🎯 Intent detected: ${result.intent} (${Math.round(result.confidence * 100)}%)`);
  
  return result.intent;
  
 } catch (error) {
  console.warn('Intent detection failed, using GENERAL_SUPPORT:', error);
  return 'GENERAL_SUPPORT';
 }
}

/**
 * Handle logo analysis with LogoCraft Pro
 */
async function handleLogoAnalysis(
 message: string,
 uploadedFiles: any[],
 conversationId: string,
 context: any,
 conversationHistory: any[],
 userProfile: any
): Promise<any> {
 
 console.log('🎨 LogoCraft Pro processing logo analysis...');
 
 let logoAnalysisResult: LogoAnalysisResult | null = null;
 
 // If files were uploaded, analyze them (images or PDFs)
 if (uploadedFiles && uploadedFiles.length > 0) {
  for (const file of uploadedFiles) {
   // Handle both image and PDF files
   if (file.type?.startsWith('image/') || file.type === 'application/pdf') {
    try {
     console.log(`🔍 Processing ${file.type} file for logo analysis: ${file.url.substring(0, 100)}...`);
     
     logoAnalysisResult = await LogoAnalysisService.analyzeLogoFile(
      file.url,
      file.type,
      message
     );
     
     // Store analysis in context
     await ConversationContextManager.storeLogoAnalysis(
      conversationId,
      logoAnalysisResult
     );
     
     console.log(`✅ Logo analysis completed for ${file.type}:`, {
      analysisId: logoAnalysisResult.analysisId,
      logoType: logoAnalysisResult.logoType,
      complexity: logoAnalysisResult.complexity,
      confidence: logoAnalysisResult.confidence.overall
     });
     
     break; // Analyze first valid file only for now
    } catch (error) {
     console.error(`Logo analysis failed for ${file.type}:`, error);
     // Continue to next file if analysis fails
     continue;
    }
   } else {
    console.warn(`Unsupported file type for logo analysis: ${file.type}`);
   }
  }
 }
 
 // Generate LogoCraft Pro response
 const historyContext = conversationHistory.length > 0 
  ? conversationHistory.slice(-5).map(msg => 
    `${msg.role}: ${msg.content.substring(0, 300)}`
   ).join('\n')
  : '';

 const logoExpertPrompt = `You are LogoCraft Pro, the expert AI for custom cap logo analysis and customization recommendations.

Your expertise:
- Advanced embroidery analysis (Flat & 3D)
- Professional screen printing assessment
- Premium leather & rubber patch evaluation
- High-quality sublimation analysis
- Cost optimization strategies
- Technical specification consulting

${historyContext ? `Recent conversation:\n${historyContext}\n\n` : ''}

Current message: "${message}"

${logoAnalysisResult ? `
🎨 LOGO ANALYSIS COMPLETED:
- Logo Type: ${logoAnalysisResult.logoType}
- Complexity Level: ${logoAnalysisResult.complexity} 
- Color Count: ${logoAnalysisResult.colorCount} colors
- Recommended Methods: ${logoAnalysisResult.recommendedMethods.map(r => r.method).join(', ')}
- Top Recommendation: ${logoAnalysisResult.recommendedMethods[0]?.method} (${logoAnalysisResult.recommendedMethods[0]?.suitability}% suitable)
- Quality Rating: ${logoAnalysisResult.recommendedMethods[0]?.quality}

💰 COST ESTIMATES:
${Object.entries(logoAnalysisResult.costAnalysis.estimatedCosts).map(([qty, cost]) => 
 `- ${qty} pieces: $${(cost as any).unitCost} each ($${(cost as any).totalCost} total)`
).join('\n')}

${logoAnalysisResult.recommendedMethods[0]?.moldCharge ? `One-time Mold Charge: $${logoAnalysisResult.recommendedMethods[0].moldCharge}` : ''}

📋 TECHNICAL REQUIREMENTS:
- File Format: ${logoAnalysisResult.technicalSpecs?.fileFormats?.preferred?.join(', ') || 'Vector preferred (AI, EPS, SVG)'}
- Resolution: ${logoAnalysisResult.technicalSpecs?.requiredResolution?.recommended || 'Minimum 600 DPI'}

Your analysis is complete and ready for quote generation! If you need a comprehensive quote including blank caps, delivery, and total pricing, just ask and I'll seamlessly connect you with CapCraft AI who will use this analysis to create your detailed quote.
` : 'Ready to analyze your logo! Please upload your logo image or PDF file and I\'ll provide detailed customization recommendations with accurate pricing.'}

Guidelines:
- Be expert and technical but friendly and encouraging
- Explain pros/cons of each customization method clearly
- Provide specific cost estimates and technical details
- Suggest optimizations to reduce costs while maintaining quality
- When analysis is complete, proactively mention quote generation capability
- If customer wants quotes or asks "what's next", smoothly transition to CapCraft AI
- Always reference specific analysis results in recommendations
- Highlight the benefits of your professional analysis

Customer: ${userProfile?.name || 'Valued Customer'}
Customer Role: ${userProfile?.customerRole || 'RETAIL'}

Provide professional logo analysis with clear next steps for quote generation.`;

 try {
  const response = await openai.chat.completions.create({
   model: "gpt-4o",
   messages: [
    { role: "system", content: logoExpertPrompt },
    { role: "user", content: message }
   ],
   temperature: 0.2,
   max_tokens: 1500
  });

  const aiResponse = response.choices[0]?.message?.content || 'Analysis complete.';
  
  return formatAssistantResponse(AI_ASSISTANTS.LOGO_EXPERT, aiResponse);
  
 } catch (error) {
  console.error('LogoCraft Pro response failed:', error);
  return formatAssistantResponse(
   AI_ASSISTANTS.LOGO_EXPERT, 
   'I\'m ready to analyze your logo! Please upload your logo image or PDF file and I\'ll provide detailed customization recommendations with accurate pricing.'
  );
 }
}

/**
 * Handle quote generation with CapCraft AI
 */
async function handleQuoteGeneration(
 message: string,
 conversationId: string,
 context: any,
 conversationHistory: any[],
 userProfile: any,
 logoAnalysisData?: LogoAnalysisResult
): Promise<any> {
 
 console.log('💎 CapCraft AI processing quote generation...');
 
 // Get logo analysis context if available
 const logoContext = logoAnalysisData || 
  await ConversationContextManager.getLogoContextForQuote(conversationId);
 
 // Extract order requirements
 const requirements = parseOrderRequirements(message);
 
 // If logo analysis is available, use its specifications
 if (logoContext) {
  const { LogoAnalysisService } = await import('@/lib/ai/logo-analysis-service');
  const logoSpecs = LogoAnalysisService.extractLogoSpecsForQuote(logoContext);
  
  if (logoSpecs) {
   // Override requirements with logo analysis data
   requirements.logoType = logoSpecs.method;
   requirements.logoSize = logoSpecs.size;
   requirements.logoApplication = logoSpecs.application;
   requirements.logoPosition = logoSpecs.location;
   
   console.log('🎨 Using LogoCraft specifications:', {
    method: logoSpecs.method,
    size: logoSpecs.size,
    application: logoSpecs.application,
    unitCost: logoSpecs.unitCost,
    moldCharge: logoSpecs.moldCharge
   });
  }
 }
 
 // Calculate cost estimate with logo context
 let orderEstimate = null;
 if (requirements.quantity && requirements.quantity > 0) {
  try {
   orderEstimate = await calculatePreciseOrderEstimateWithMessage({
    ...requirements,
    logoType: logoContext?.recommendedMethods[0]?.method || requirements.logoType || '3D Embroidery'
   }, message);
   
   // If logo analysis is available, calculate logo cost directly
   if (logoContext && requirements.quantity) {
    const { LogoAnalysisService } = await import('@/lib/ai/logo-analysis-service');
    const logoTotalCost = LogoAnalysisService.calculateLogoTotalCost(logoContext, requirements.quantity);
    
    // Adjust order estimate to include precise logo cost
    if (orderEstimate && logoTotalCost > 0) {
     orderEstimate.logoCost = logoTotalCost;
     orderEstimate.logoBreakdown = {
      method: logoContext.recommendedMethods[0].method,
      quantity: requirements.quantity,
      unitCost: logoTotalCost / requirements.quantity,
      moldCharge: logoContext.recommendedMethods[0].moldCharge || 0
     };
    }
   }
  } catch (error) {
   console.error('Cost calculation failed:', error);
  }
 }
 
 // Validate pricing consistency if logo analysis exists
 let pricingCheck = null;
 if (logoContext && orderEstimate?.totalCost && requirements.quantity) {
  pricingCheck = await ConversationContextManager.validatePricingConsistency(
   conversationId,
   orderEstimate.totalCost,
   requirements.quantity
  );
 }
 
 // Generate CapCraft AI response
 const historyContext = conversationHistory.length > 0 
  ? conversationHistory.slice(-10).map(msg => 
    `${msg.role}: ${msg.content.substring(0, 400)}`
   ).join('\n')
  : '';

 const quoteExpertPrompt = `You are CapCraft AI, the expert order creation and quote generation specialist for US Custom Cap.

Your expertise:
- Custom cap quote generation
- Order creation and optimization
- Pricing mastery and cost breakdowns
- Product specification consultation

${historyContext ? `Recent conversation:\n${historyContext}\n\n` : ''}

Current message: "${message}"

${logoContext ? `
✨ LOGO ANALYSIS AVAILABLE (from LogoCraft Pro):
- Logo Type: ${logoContext.logoType}
- Complexity Level: ${logoContext.complexity}
- Color Count: ${logoContext.colorCount} colors
- Recommended Method: ${logoContext.recommendedMethods[0]?.method} (${logoContext.recommendedMethods[0]?.suitability}% suitable)
- Recommended Size: ${logoContext.recommendedMethods[0]?.recommendedSize}
- Application: ${logoContext.recommendedMethods[0]?.application}
- Quality Rating: ${logoContext.recommendedMethods[0]?.quality}
- Best Location: ${logoContext.recommendedMethods[0]?.locations[0] || 'Front'}

PRICING DATA:
- 48 pieces: $${logoContext.recommendedMethods[0]?.pricing?.price48 || 0}/piece
- 144 pieces: $${logoContext.recommendedMethods[0]?.pricing?.price144 || 0}/piece 
- 576 pieces: $${logoContext.recommendedMethods[0]?.pricing?.price576 || 0}/piece
- 1152+ pieces: $${logoContext.recommendedMethods[0]?.pricing?.price1152 || 0}/piece

${logoContext.recommendedMethods[0]?.moldCharge ? `Mold Charge: $${logoContext.recommendedMethods[0].moldCharge} (one-time)` : 'No mold charges required'}

TECHNICAL SPECS:
- File Format: ${logoContext.technicalSpecs?.fileFormats?.preferred?.join(', ') || 'Vector preferred'}
- Resolution: ${logoContext.technicalSpecs?.requiredResolution?.recommended || '600 DPI'}

Use these LogoCraft specifications for precise quote generation.
` : 'No logo analysis available. Use standard defaults for logo customization.'}

${orderEstimate ? `
💰 COST CALCULATION:
- Quantity: ${requirements.quantity} pieces
- Unit Cost: $${orderEstimate.unitCost || 0}
- Total Cost: $${orderEstimate.totalCost || 0}
${orderEstimate.logoBreakdown ? `
- Logo Details: ${orderEstimate.logoBreakdown.method} ($${orderEstimate.logoBreakdown.unitCost}/piece)
- Mold Charge: $${orderEstimate.logoBreakdown.moldCharge || 0}
` : ''}
- Breakdown: ${JSON.stringify(orderEstimate.breakdown || {})}
` : ''}

${pricingCheck?.discrepancyFound ? `
⚠️ PRICING VALIDATION:
Discrepancy detected between logo analysis ($${pricingCheck.logoAnalysisCost}) and quote calculation ($${pricingCheck.quoteCost})
Using resolved cost: $${pricingCheck.resolvedCost}
` : ''}

Guidelines:
- Acknowledge LogoCraft Pro's previous analysis when available
- Create detailed, accurate quotes based on logo specifications
- Explain cost breakdowns clearly with logo-specific details
- Highlight the value of LogoCraft Pro's recommendations
- Provide quantity-based pricing tiers
- Offer optimization suggestions while respecting logo analysis
- Generate professional quote documents that reference logo analysis
- Show continuity between logo analysis and quote pricing

Customer: ${userProfile?.name || 'Valued Customer'}
Customer Role: ${userProfile?.customerRole || 'RETAIL'}

Focus on converting inquiries into orders with comprehensive, accurate quotes that seamlessly incorporate LogoCraft Pro's analysis.`;

 try {
  const response = await openai.chat.completions.create({
   model: "gpt-4o-mini", 
   messages: [
    { role: "system", content: quoteExpertPrompt },
    { role: "user", content: message }
   ],
   temperature: 0.3,
   max_tokens: 2000
  });

  const aiResponse = response.choices[0]?.message?.content || 'Quote generation complete.';
  
  return {
   ...formatAssistantResponse(AI_ASSISTANTS.QUOTE_MASTER, aiResponse),
   quoteData: orderEstimate,
   logoContext: logoContext,
   pricingValidation: pricingCheck
  };
  
 } catch (error) {
  console.error('CapCraft AI response failed:', error);
  return formatAssistantResponse(
   AI_ASSISTANTS.QUOTE_MASTER, 
   'I\'m ready to create your custom cap quote! Please provide details about quantity, colors, logo requirements, and any specific preferences.'
  );
 }
}

/**
 * Handle support queries
 */
async function handleSupportQuery(
 message: string,
 conversationId: string,
 context: any,
 conversationHistory: any[],
 userProfile: any
): Promise<any> {
 
 console.log('🧙‍♂️ SupportSage processing support query...');
 
 const historyContext = conversationHistory.length > 0 
  ? conversationHistory.slice(-5).map(msg => 
    `${msg.role}: ${msg.content.substring(0, 300)}`
   ).join('\n')
  : '';

 const supportPrompt = `You are SupportSage, the expert AI support assistant for US Custom Cap.

Your expertise:
- Order tracking and status updates
- General product information
- Policy and process guidance
- Customer service excellence

${historyContext ? `Recent conversation:\n${historyContext}\n\n` : ''}

Current message: "${message}"

Customer: ${userProfile?.name || 'Valued Customer'}
Customer Role: ${userProfile?.customerRole || 'RETAIL'}

Provide helpful, accurate support responses. If the customer needs logo analysis or quotes, mention our specialist AIs.`;

 try {
  const response = await openai.chat.completions.create({
   model: "gpt-4o-mini",
   messages: [
    { role: "system", content: supportPrompt },
    { role: "user", content: message }
   ],
   temperature: 0.7,
   max_tokens: 800
  });

  const aiResponse = response.choices[0]?.message?.content || 'How can I help you today?';
  
  return formatAssistantResponse(AI_ASSISTANTS.SUPPORT_SCOUT, aiResponse);
  
 } catch (error) {
  console.error('SupportSage response failed:', error);
  return formatAssistantResponse(
   AI_ASSISTANTS.SUPPORT_SCOUT, 
   'I\'m here to help with your questions about US Custom Cap! How can I assist you today?'
  );
 }
}

/**
 * Handle general queries
 */
async function handleGeneralQuery(
 message: string,
 conversationId: string,
 context: any,
 conversationHistory: any[],
 userProfile: any
): Promise<any> {
 
 return handleSupportQuery(message, conversationId, context, conversationHistory, userProfile);
}

/**
 * Check if handoff is needed between AIs
 */
async function checkForHandoff(
 message: string,
 response: any,
 currentAssistant: string,
 context: any
): Promise<AIHandoffData | null> {
 
 const lowerMessage = message.toLowerCase();
 
 // Logo analysis to quote generation handoff
 if (currentAssistant === 'logo-expert' && 
   (lowerMessage.includes('quote') || lowerMessage.includes('price') || lowerMessage.includes('cost') || 
    lowerMessage.includes('order') || lowerMessage.includes('how much') || lowerMessage.includes('estimate'))) {
  
  const logoAnalysis = await ConversationContextManager.getLogoContextForQuote(context.conversationId);
  
  if (logoAnalysis) {
   return {
    fromAssistant: 'logo-expert',
    toAssistant: 'quote-master',
    handoffType: 'logo-to-quote',
    timestamp: new Date().toISOString(),
    logoAnalysis,
    handoffMessage: 'Perfect! I\'ll now transfer you to CapCraft AI who will create a complete quote using your logo analysis.',
    preserveContext: true,
    dataValidation: {
     logoDataComplete: true,
     pricingConsistent: true,
     specificationsValid: true,
     readyForProcessing: true
    }
   };
  }
 }

 // Auto-trigger quote generation if logo analysis just completed and user asks for next steps
 if (currentAssistant === 'logo-expert' &&
   (lowerMessage.includes('what') || lowerMessage.includes('next') || lowerMessage.includes('now') ||
    lowerMessage.includes('complete') || lowerMessage.includes('finished'))) {
  
  const logoAnalysis = await ConversationContextManager.getLogoContextForQuote(context.conversationId);
  
  if (logoAnalysis && logoAnalysis.confidence.overall >= 0.7) {
   return {
    fromAssistant: 'logo-expert',
    toAssistant: 'quote-master',
    handoffType: 'logo-to-quote',
    timestamp: new Date().toISOString(),
    logoAnalysis,
    handoffMessage: 'Your logo analysis is complete! Let me connect you with CapCraft AI to generate a comprehensive quote.',
    preserveContext: true,
    dataValidation: {
     logoDataComplete: true,
     pricingConsistent: true,
     specificationsValid: true,
     readyForProcessing: true
    }
   };
  }
 }
 
 // Quote refinement handoff
 if (currentAssistant === 'quote-master' && 
   (lowerMessage.includes('logo') && (lowerMessage.includes('analyze') || lowerMessage.includes('recommend') || 
    lowerMessage.includes('different') || lowerMessage.includes('alternative')))) {
  
  return {
   fromAssistant: 'quote-master',
   toAssistant: 'logo-expert',
   handoffType: 'quote-refinement',
   timestamp: new Date().toISOString(),
   handoffMessage: 'I\'ll transfer you back to LogoCraft Pro for detailed logo analysis and alternative recommendations.',
   preserveContext: true,
   dataValidation: {
    logoDataComplete: false,
    pricingConsistent: true,
    specificationsValid: true,
    readyForProcessing: false
   }
  };
 }

 // Support to logo analysis handoff for uploaded files
 if (currentAssistant === 'support-scout' && message && 
   (lowerMessage.includes('logo') || lowerMessage.includes('analyze') || lowerMessage.includes('upload'))) {
  
  return {
   fromAssistant: 'support-scout',
   toAssistant: 'logo-expert',
   handoffType: 'support-to-logo',
   timestamp: new Date().toISOString(),
   handoffMessage: 'I\'ll connect you with LogoCraft Pro for professional logo analysis.',
   preserveContext: true,
   dataValidation: {
    logoDataComplete: false,
    pricingConsistent: true,
    specificationsValid: true,
    readyForProcessing: false
   }
  };
 }
 
 return null;
}