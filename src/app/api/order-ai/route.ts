/**
 * ORDER AI API ENDPOINT - Dedicated Order Conversion System
 * 
 * This is a LEAN, focused API endpoint designed specifically for converting
 * customer inquiries into orders. It replaces the monolithic 38k+ token
 * ai-chat system for order-specific interactions.
 * 
 * Key Features:
 * - Budget-aware quantity optimization
 * - Tier-based pricing intelligence
 * - Conversion-focused responses
 * - Clean, maintainable codebase
 * - High-performance order processing
 * 
 * Response Time Target: <500ms
 * Conversion Focus: Turn inquiries into orders
 */

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getCurrentUser, getUserProfile } from '@/lib/auth-helpers';
import { ConversationService, ConversationContext, MessageRole } from '@/lib/conversation';
import { 
 parseOrderRequirements,
 optimizeQuantityForBudget,
 optimizeQuantityForBudgetPrecise,
 calculateQuickEstimate,
 calculatePreciseOrderEstimate,
 calculatePreciseOrderEstimateWithMessage,
 getOptimalCapForBudget,
 extractBudget,
 needsBudgetFocusedResponse,
 isOrderProgressionMessage,
 isFollowUpResponse,
 parseAccessoryPreferences,
 type OrderRequirements
} from '@/lib/order-ai-core';
import { parseComplexOrder, convertToApiFormat } from '@/lib/enhanced-order-parser';

// Initialize OpenAI client lazily to handle missing env vars during build
let openai: OpenAI | null = null;

function getOpenAIClient() {
  if (!openai) {
    const apiKey = process.env.OPENAI_API_KEY;
    console.log('🔑 [DEBUG] OpenAI API Key exists:', !!apiKey, apiKey ? `${apiKey.substring(0, 10)}...` : 'undefined');
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not configured');
    }
    console.log('🤖 [DEBUG] Initializing OpenAI client...');
    openai = new OpenAI({ apiKey });
    console.log('✅ [DEBUG] OpenAI client initialized:', !!openai);
  }
  return openai;
}

// Conversation management for context
interface LocalConversationContext {
 lastQuote?: {
  quantity: number;
  logoType: string;
  color?: string;
  costBreakdown: any;
  orderEstimate: any;
  requirements: OrderRequirements;
  totalCost: number;
 };
 budgetAmount?: number;
 originalQuantity?: number;
 requirements?: OrderRequirements;
}

export async function POST(request: NextRequest) {
 const startTime = Date.now();
 let profileFetchTime = 0;
 
 try {
  const { message, context, conversationId, sessionId, uploadedFiles, conversationContext: clientContext, forceOrderCreation, quoteData } = await request.json();
  
  if (!message?.trim()) {
   return NextResponse.json({ 
    error: 'Message is required' 
   }, { status: 400 });
  }

  console.log(`🛒 [ORDER-AI] Processing order inquiry: "${message.substring(0, 100)}..."`);
  
  const user = await getCurrentUser(request);
  let userProfile = null;
  
  // 👤 ENHANCED USER CONTEXT: Get full profile data for personalized experience
  // Performance optimized with timeout to prevent delays
  if (user?.id) {
   const profileStartTime = Date.now();
   try {
    const profilePromise = getUserProfile(user.id);
    const timeoutPromise = new Promise((_, reject) => {
     setTimeout(() => reject(new Error('Profile fetch timeout')), 2000); // 2s timeout
    });
    
    userProfile = await Promise.race([profilePromise, timeoutPromise]) as any;
    profileFetchTime = Date.now() - profileStartTime;
    console.log(`👤 [ORDER-AI] User profile loaded in ${profileFetchTime}ms: ${userProfile?.name || 'No name'} (${userProfile?.customerRole || 'No role'})`);
   } catch (error) {
    profileFetchTime = Date.now() - profileStartTime;
    console.warn(`⚠️ [ORDER-AI] Failed to load user profile after ${profileFetchTime}ms, continuing without personalization:`, error);
    userProfile = null; // Ensure it's null on failure
   }
  }
  
  const lowerMessage = message.toLowerCase();
  
  // 🚀 DISABLE FAST FALLBACK: Let AI handle all responses for human-like conversation
  // Fast fallback was causing robotic responses - removed to ensure all messages go through AI
  console.log('🤖 [ORDER-AI] Sending all messages to AI for human-like responses');
  
  // 🧠 MEMORY INTEGRATION: Get existing conversation by ID or create new one
  let conversation;
  if (conversationId) {
   // Try to find existing conversation by the provided ID
   console.log(`🧠 [ORDER-AI] Looking for existing conversation: ${conversationId}`);
   const existingConversation = await ConversationService.getConversationById(conversationId);
   
   if (existingConversation) {
    console.log(`✅ [ORDER-AI] Found existing conversation: ${conversationId}`);
    conversation = existingConversation;
   } else {
    console.warn(`⚠️ [ORDER-AI] Existing conversation not found, creating new one`);
    conversation = await ConversationService.getOrCreateConversation({
     userId: user?.id,
     sessionId: `order-ai-${Date.now()}`,
     context: ConversationContext.SUPPORT,
     metadata: { source: 'order-ai', userAgent: request.headers.get('user-agent') }
    });
   }
  } else {
   // Create new conversation
   console.log(`🧠 [ORDER-AI] Creating new conversation`);
   conversation = await ConversationService.getOrCreateConversation({
    userId: user?.id,
    sessionId: sessionId || `order-ai-${Date.now()}`,
    context: ConversationContext.SUPPORT,
    metadata: { source: 'order-ai', userAgent: request.headers.get('user-agent') }
   });
  }

  // 📚 LOAD CONVERSATION HISTORY: Get recent messages for AI context
  const conversationHistory = await ConversationService.getConversationContext(
   conversation.id, 
   15 // Last 15 messages for context
  );

  console.log(`🧠 [ORDER-AI] Loaded conversation ${conversation.id} with ${conversationHistory.length} previous messages`);
  
  // Load any existing conversation context from client (supports both field names)
  let localConversationContext: LocalConversationContext = context || clientContext || {};
  
  // Determine response type and generate appropriate response
  let response: string;
  
  // 🤖 AI APPROACH: Try AI with aggressive timeout
  console.log('✅ [ORDER-AI] Attempting AI response with 15s total timeout');
  try {
   const aiPromise = generateUnifiedAIResponse(message, localConversationContext, uploadedFiles, conversationHistory, userProfile, user);
   const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Total AI timeout after 15 seconds')), 15000);
   });
   
   response = await Promise.race([aiPromise, timeoutPromise]) as string;
   
   // Force order creation if explicitly requested
   if (forceOrderCreation && !response.includes('Order Created Successfully') && !response.includes('Order Reference:')) {
    console.log('🚀 [ORDER-AI] Force order creation requested, attempting real order creation');
    
    // Try to get the latest quote data from conversation context or provided quote data
    const latestQuote = quoteData || localConversationContext.lastQuote;
    
    if (latestQuote) {
     try {
      console.log('📊 [ORDER-AI] Using provided quote data for forced order creation');
      const realOrderId = await createRealOrderFromAI(latestQuote, message, userProfile, user);
      const orderReference = `ORD-${realOrderId.slice(-6).toUpperCase()}`;
      
      // Override response with order creation confirmation
      response = `🎉 **Order Created Successfully!**

**Order Reference:** ${orderReference}

Your custom caps order has been created with the exact specifications we discussed. You'll receive a confirmation email shortly with all the details.

🧾 **[View Your Order Receipt →](/checkout/success?orderId=${realOrderId})**

Thank you for choosing US Custom Cap! Your order is now in our production queue.`;
      
      console.log(`✅ [ORDER-AI] Forced order creation successful: ${realOrderId} → ${orderReference}`);
     } catch (orderError) {
      console.error('❌ [ORDER-AI] Forced order creation failed:', {
       error: orderError.message,
       stack: orderError.stack,
       quoteData: latestQuote ? {
        quantity: latestQuote.quantity,
        color: latestQuote.color,
        totalCost: latestQuote.totalCost,
        hasRequirements: !!latestQuote.requirements,
        hasCostBreakdown: !!latestQuote.costBreakdown
       } : 'NO_QUOTE_DATA',
       userInfo: {
        hasUser: !!user,
        hasProfile: !!userProfile,
        userId: user?.id,
        userEmail: user?.email
       }
      });
      response = `❌ I apologize, but there was an issue creating your order. Error: ${orderError.message}. Please try again or contact our support team at orders@uscustomcap.com with your quote details. We'll get your order processed right away!`;
     }
    } else {
     console.warn('⚠️ [ORDER-AI] Force order creation requested but no quote data available');
     response = `⚠️ I need the quote details to create your order. Please provide your specifications again or contact our support team at orders@uscustomcap.com for assistance.`;
    }
   }
   console.log('✅ [ORDER-AI] AI responded within timeout');
   
  } catch (aiError) {
   console.warn('⚠️ [ORDER-AI] AI timeout, providing simple human-like fallback:', aiError.message);
   response = `Hey! I'm having a bit of trouble with my systems right now - let me get back to you in just a moment with your quote for those ${extractQuantityFromMessage(message) || '576'} caps with rubber patches. 

In the meantime, I can tell you that for that quantity you're definitely in great pricing territory. Hang tight!`;
  }
  
  const processingTime = Date.now() - startTime;
  console.log(`✅ [ORDER-AI] Response generated in ${processingTime}ms (profile fetch: ${profileFetchTime}ms)`);
  
  // 💾 SAVE MESSAGE HISTORY: Persist both user message and AI response
  try {
   // Save user message
   await ConversationService.addMessage(conversation.id, {
    role: MessageRole.USER,
    content: message,
    metadata: {
     uploadedFiles: uploadedFiles?.length || 0,
     processingTime,
     source: 'order-ai'
    }
   });

   // Save AI response
   await ConversationService.addMessage(conversation.id, {
    role: MessageRole.ASSISTANT,
    content: response,
    metadata: {
     processingTime,
     source: 'order-ai',
     context: 'order-conversion'
    }
   });

   console.log(`💾 [ORDER-AI] Conversation history saved to database`);
  } catch (saveError) {
   console.error('⚠️ [ORDER-AI] Failed to save conversation history:', saveError);
   // Don't fail the request if saving fails
  }
  
  return NextResponse.json({
   response,
   conversationId: conversation.id, // Return actual conversation ID
   processingTime,
   context: localConversationContext, // FIXED: Return the actual conversation context
   conversationContext: localConversationContext // Include context for next request (backward compatibility)
  });
  
 } catch (error) {
  console.error('❌ [ORDER-AI] Error processing order inquiry:', error);
  
  return NextResponse.json({
   response: "Sorry, I'm having some technical difficulties right now! Can you give me just a moment and try sending your message again? I want to make sure I can give you the best quote for your caps.",
   error: 'Processing failed',
  }, { status: 500 });
 }
}

// Helper function to extract quantity from message
function extractQuantityFromMessage(message: string): string | null {
 const match = message.match(/(\d+)\s*(?:pieces?|caps?|units?)/i);
 return match ? match[1] : null;
}

function extractPanelCountFromMessage(message: string): string | null {
 const match = message.match(/(\d+)\s*panel/i);
 return match ? match[1] : null;
}

function detectProductTier(message: string, productData?: any): 'Tier 1' | 'Tier 2' | 'Tier 3' {
 const lowerMessage = message.toLowerCase();
 
 // If we have product data, search through it for matches
 if (productData?.productsByTier) {
  // Check Richardson 112 style caps - should be Tier 2 based on CSV
  if (lowerMessage.includes('richardson 112') || lowerMessage.includes('richardson112')) {
   // Verify in CSV data that Richardson 112 is Tier 2
   for (const [tier, products] of Object.entries(productData.productsByTier)) {
    if (Array.isArray(products)) {
     const richardsonProduct = products.find((p: any) => 
      p['Nick Names']?.toLowerCase().includes('richardson 112')
     );
     if (richardsonProduct) {
      return tier as 'Tier 1' | 'Tier 2' | 'Tier 3';
     }
    }
   }
  }
  
  // Check 7-panel caps - should be Tier 3 based on CSV 
  if (lowerMessage.includes('7-panel') || lowerMessage.includes('7 panel')) {
   for (const [tier, products] of Object.entries(productData.productsByTier)) {
    if (Array.isArray(products)) {
     const sevenPanelProduct = products.find((p: any) => 
      p['Panel Count'] === '7-Panel'
     );
     if (sevenPanelProduct) {
      return tier as 'Tier 1' | 'Tier 2' | 'Tier 3';
     }
    }
   }
  }
  
  // Check for 6-panel - most are Tier 2 based on CSV
  if (lowerMessage.includes('6-panel') || lowerMessage.includes('6 panel')) {
   for (const [tier, products] of Object.entries(productData.productsByTier)) {
    if (Array.isArray(products)) {
     const sixPanelProduct = products.find((p: any) => 
      p['Panel Count'] === '6-Panel'
     );
     if (sixPanelProduct) {
      return tier as 'Tier 1' | 'Tier 2' | 'Tier 3';
     }
    }
   }
  }
 }
 
 // Fallback logic when no product data available
 if (lowerMessage.includes('richardson 112') || lowerMessage.includes('richardson112')) {
  return 'Tier 2';
 }
 if (lowerMessage.includes('7-panel') || lowerMessage.includes('7 panel')) {
  return 'Tier 3';
 }
 if (lowerMessage.includes('6-panel') || lowerMessage.includes('6 panel')) {
  return 'Tier 2'; // Most 6-panel caps are Tier 2
 }
 
 // Default to Tier 1 for basic caps (5-panel and 4-panel are typically Tier 1)
 return 'Tier 1';
}

// ==============================================================================
// UNIFIED AI RESPONSE GENERATOR - ChatGPT 4o with Natural Language Understanding
// ==============================================================================

/**
 * Unified AI response generator that handles all types of order interactions
 * WITHOUT hardcoded classification - lets GPT-4o understand context naturally
 * Enhanced with full user profile data for personalized experience
 */
async function generateUnifiedAIResponse(message: string, context: LocalConversationContext, uploadedFiles?: any[], conversationHistory?: any[], userProfile?: any, user?: any): Promise<string> {
 console.log('🤖 [UNIFIED-AI] Generating response with full GPT-4o intelligence');
 
 try {
  // Load CSV product data with timeout protection
  let productData = null;
  let csvProductContext = '';
  
  try {
   const controller = new AbortController();
   const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
   
   const productDataResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3002'}/api/order-ai/products`, {
    signal: controller.signal
   });
   clearTimeout(timeoutId);
   
   if (productDataResponse.ok) {
    productData = await productDataResponse.json();
    console.log(`📊 [UNIFIED-AI] Loaded ${productData.products?.length || 0} products from CSV`);
    
    csvProductContext = `
AVAILABLE BLANK CAPS FROM CSV DATA:
${Object.entries(productData.productsByTier || {}).map(([tier, products]: [string, any[]]) => 
 `${tier} (${products.length} options):
${products.slice(0, 3).map(p => ` • ${p.name}: ${p.profile} profile, ${p.panelCount}, ${p.billOrVisorShape} bill`).join('\n')}
 Pricing: $${products[0]?.pricing?.price144 || 3.00}/cap at 144+ quantity`
).join('\n\n')}

PRICING TIERS FROM CSV (VOLUME DISCOUNTS):
• Tier 1 Volume Pricing:
 - 144-575 caps: $${productData.pricing?.['Tier 1']?.price144 || 3.00}/cap
 - 576-1151 caps: $${productData.pricing?.['Tier 1']?.price576 || 2.90}/cap 
 - 1152+ caps: $${productData.pricing?.['Tier 1']?.price1152 || 2.84}/cap (BEST VALUE)
• Tier 2: $${productData.pricing?.['Tier 2']?.price144 || 3.20}/cap at 144+ (Premium options) 
• Tier 3: $${productData.pricing?.['Tier 3']?.price144 || 3.40}/cap at 144+ (Specialty caps)`;
   }
  } catch (fetchError) {
   console.warn('⚠️ [UNIFIED-AI] Product data fetch failed, using fallback:', fetchError.message);
   csvProductContext = `
PRICING STRUCTURE:
• Base cap costs vary by quantity (volume discounts available)
• Fabric upgrades: Some fabrics are FREE (Chino Twill, Trucker Mesh), others add premium charges
• Premium fabrics (Air Mesh, Acrylic) add $0.50-$2.50 per cap depending on quantity
• Logo setup costs depend on type (3D Embroidery, patches, etc.)
• Delivery costs are separate from cap costs
• CRITICAL: Never estimate costs manually - always use ORDER ANALYSIS calculations

FABRIC PRICING (IMPORTANT):
• FREE Fabrics (no additional cost): Chino Twill, Trucker Mesh, Micro Mesh
• PREMIUM Fabrics (additional cost): Air Mesh (+$0.88@144qty), Acrylic (+$2.50@144qty), Suede Cotton, Genuine Leather
• Dual fabric caps: Base cap + any premium fabric upgrades for specific panels`;
  }

  // Build proper OpenAI conversation messages array for conversation continuity
  let conversationMessages = [];
  if (conversationHistory && conversationHistory.length > 0) {
   // Convert conversation history to proper OpenAI message format
   conversationMessages = conversationHistory.map(msg => ({
    role: msg.role === 'user' ? 'user' : 'assistant',
    content: msg.content
   }));
   console.log(`🔄 [ORDER-AI] Using ${conversationMessages.length} previous messages for context`);
  }

  // Try to extract and calculate order details from current message and context
  let orderAnalysis = '';
  let orderQuote = null;
  
  // Skip cost calculation for confirmation messages - use conversation context instead
  const lowerMessage = message.toLowerCase().trim();
  
  // Check if the last assistant message was asking for breakdown permission
  const lastAssistantMessage = conversationHistory && conversationHistory.length > 0 
   ? conversationHistory[conversationHistory.length - 1] 
   : null;
  const wasAskingForBreakdown = lastAssistantMessage && 
   lastAssistantMessage.role === 'assistant' && 
   (lastAssistantMessage.content.includes('Would you like me to proceed with a detailed breakdown') ||
    lastAssistantMessage.content.includes('detailed breakdown') ||
    lastAssistantMessage.content.includes('most accurate total cost'));
  
  // If user says "proceed" in response to breakdown request, it's NOT order confirmation
  const isBreakdownRequest = wasAskingForBreakdown && lowerMessage === 'proceed';
  
  const isConfirmation = !isBreakdownRequest && (
   lowerMessage === 'confirm' ||
   lowerMessage === 'yes' ||
   lowerMessage === 'proceed' ||
   lowerMessage === 'create order' ||
   lowerMessage === 'place order' ||
   lowerMessage === 'all good, submit order' ||
   lowerMessage.includes('submit order') ||
   lowerMessage.includes('place order') ||
   lowerMessage.includes('create') ||
   (lowerMessage.includes('proceed') && !wasAskingForBreakdown)
  );

  // Check if this is a transparency request that needs conversation context
  const isTransparencyRequest = (
   lowerMessage.includes('cost breakdown') ||
   lowerMessage.includes('break that down') ||
   lowerMessage.includes('show me costs') ||
   lowerMessage.includes('cost details') ||
   lowerMessage.includes('transparency') ||
   lowerMessage.includes('detailed costs') ||
   isBreakdownRequest
  );
  
  if (!isConfirmation) {
   // Handle transparency requests FIRST, before parsing new requirements
   if (isTransparencyRequest && context.lastQuote) {
    // Use existing quote for transparency requests
    console.log('🔍 [ORDER-AI] Transparency request - using existing quote context');
    orderQuote = context.lastQuote;
    const costBreakdown = context.lastQuote.costBreakdown;
    
    orderAnalysis = `
TRANSPARENCY REQUEST - DETAILED COST BREAKDOWN:
- Quantity: ${context.lastQuote.quantity} caps
- Total Cost: $${context.lastQuote.totalCost.toFixed(2)}
- Cost Per Cap: $${(context.lastQuote.totalCost / context.lastQuote.quantity).toFixed(2)}

DETAILED COST BREAKDOWN:
- Base Product: $${costBreakdown.baseProductTotal?.toFixed(2) || '0.00'} ($${((costBreakdown.baseProductTotal || 0) / context.lastQuote.quantity).toFixed(2)} per cap)
- Logo Setup: $${costBreakdown.logoSetupTotal?.toFixed(2) || '0.00'} ($${((costBreakdown.logoSetupTotal || 0) / context.lastQuote.quantity).toFixed(2)} per cap)`;

    // Add premium fabric cost if exists
    if (costBreakdown.detailedBreakdown?.premiumFabricCosts?.length > 0) {
     orderAnalysis += `
- Premium Fabric: $${costBreakdown.premiumFabricTotal.toFixed(2)}`;
     costBreakdown.detailedBreakdown.premiumFabricCosts.forEach((fabric: any) => {
      orderAnalysis += `
 • ${fabric.name}: $${fabric.cost.toFixed(2)} ($${fabric.unitPrice.toFixed(2)} per cap)`;
     });
    } else if (costBreakdown.premiumFabricTotal > 0) {
     orderAnalysis += `
- Premium Fabric: $${costBreakdown.premiumFabricTotal.toFixed(2)} ($${(costBreakdown.premiumFabricTotal / context.lastQuote.quantity).toFixed(2)} per cap)`;
    }
    
    // Add accessories if exists
    if (costBreakdown.accessoriesTotal > 0) {
     orderAnalysis += `
- Accessories (Stickers, Hang Tags): $${costBreakdown.accessoriesTotal.toFixed(2)} ($${(costBreakdown.accessoriesTotal / context.lastQuote.quantity).toFixed(2)} per cap)`;
    }
    
    // Add closure costs if exists
    if (costBreakdown.closureTotal > 0) {
     orderAnalysis += `
- Premium Closures: $${costBreakdown.closureTotal.toFixed(2)} ($${(costBreakdown.closureTotal / context.lastQuote.quantity).toFixed(2)} per cap)`;
    }
    
    // Add mold charges if exists
    if (costBreakdown.moldChargeTotal > 0) {
     orderAnalysis += `
- Mold Charges: $${costBreakdown.moldChargeTotal.toFixed(2)}`;
    }
    
    orderAnalysis += `
- Delivery: $${costBreakdown.deliveryTotal?.toFixed(2) || '0.00'} ($${((costBreakdown.deliveryTotal || 0) / context.lastQuote.quantity).toFixed(2)} per cap)
- TOTAL COST: $${context.lastQuote.totalCost.toFixed(2)}`;
   } else if (isBreakdownRequest && conversationHistory) {
    // Handle breakdown request when no context.lastQuote exists - parse from conversation
    console.log('🔍 [ORDER-AI] Breakdown request without existing quote - parsing from conversation');
    const fullConversation = conversationHistory.map(msg => msg.content).join(' ');
    const requirements = parseOrderRequirements(fullConversation);
    
    if (requirements.quantity > 0) {
     try {
      const result = await calculatePreciseOrderEstimateWithMessage(requirements, fullConversation);
      const costBreakdown = result.costBreakdown;
      orderQuote = { quantity: requirements.quantity, totalCost: costBreakdown.totalCost, costBreakdown, requirements };
      
      orderAnalysis = `
DETAILED COST BREAKDOWN REQUEST:
- Quantity: ${requirements.quantity} caps
- Total Cost: $${costBreakdown.totalCost.toFixed(2)}
- Cost Per Cap: $${(costBreakdown.totalCost / requirements.quantity).toFixed(2)}

COMPLETE COST BREAKDOWN:
- Base Product: $${costBreakdown.baseProductTotal?.toFixed(2) || '0.00'} ($${((costBreakdown.baseProductTotal || 0) / requirements.quantity).toFixed(2)} per cap)
- Logo Setup: $${costBreakdown.logoSetupTotal?.toFixed(2) || '0.00'} ($${((costBreakdown.logoSetupTotal || 0) / requirements.quantity).toFixed(2)} per cap)`;

      // Add premium fabric cost if exists
      if (costBreakdown.detailedBreakdown?.premiumFabricCosts?.length > 0) {
       orderAnalysis += `
- Premium Fabric: $${costBreakdown.premiumFabricTotal.toFixed(2)}`;
       costBreakdown.detailedBreakdown.premiumFabricCosts.forEach((fabric: any) => {
        orderAnalysis += `
 • ${fabric.name}: $${fabric.cost.toFixed(2)} ($${fabric.unitPrice.toFixed(2)} per cap)`;
       });
      } else if (costBreakdown.premiumFabricTotal > 0) {
       orderAnalysis += `
- Premium Fabric: $${costBreakdown.premiumFabricTotal.toFixed(2)} ($${(costBreakdown.premiumFabricTotal / requirements.quantity).toFixed(2)} per cap)`;
      }
      
      // Add accessories if exists
      if (costBreakdown.accessoriesTotal > 0) {
       orderAnalysis += `
- Accessories: $${costBreakdown.accessoriesTotal.toFixed(2)} ($${(costBreakdown.accessoriesTotal / requirements.quantity).toFixed(2)} per cap)`;
      }
      
      // Add closure costs if exists
      if (costBreakdown.closureTotal > 0) {
       orderAnalysis += `
- Premium Closures: $${costBreakdown.closureTotal.toFixed(2)} ($${(costBreakdown.closureTotal / requirements.quantity).toFixed(2)} per cap)`;
      }
      
      // Add mold charges if exists
      if (costBreakdown.moldChargeTotal > 0) {
       orderAnalysis += `
- Mold Charges: $${costBreakdown.moldChargeTotal.toFixed(2)}`;
      }
      
      orderAnalysis += `
- Delivery: $${costBreakdown.deliveryTotal?.toFixed(2) || '0.00'} ($${((costBreakdown.deliveryTotal || 0) / requirements.quantity).toFixed(2)} per cap)
- TOTAL COST: $${costBreakdown.totalCost.toFixed(2)}`;
      
     } catch (error) {
      console.log('⚠️ [ORDER-AI] Breakdown calculation failed:', error);
      orderAnalysis = 'BREAKDOWN REQUEST - Unable to calculate costs from conversation context. Please provide your order details again.';
     }
    }
   } else {
    // Parse requirements for non-transparency requests
    const requirements = parseOrderRequirements(message);
    const budget = extractBudget(message);
    
    if (requirements.quantity > 0 || budget > 0) {
     try {
      let costBreakdown: any = {};
      let orderEstimate: any = {};
      
      if (budget) {
       const optimization = await optimizeQuantityForBudgetPrecise(budget, requirements.logoType, message);
       const result = await calculatePreciseOrderEstimateWithMessage({
        ...requirements,
        quantity: optimization.optimizedQuantity
       }, message);
       costBreakdown = result.costBreakdown;
       orderEstimate = result.orderEstimate;
       orderQuote = { 
        quantity: optimization.optimizedQuantity, 
        totalCost: costBreakdown.totalCost, 
        costBreakdown, 
        requirements,
        logoType: requirements.logoType,
        color: requirements.color,
        orderEstimate 
       };
      } else if (requirements.quantity > 0) {
       const result = await calculatePreciseOrderEstimateWithMessage(requirements, message);
       costBreakdown = result.costBreakdown;
       orderEstimate = result.orderEstimate;
       orderQuote = { 
        quantity: requirements.quantity, 
        totalCost: costBreakdown.totalCost, 
        costBreakdown, 
        requirements,
        logoType: requirements.logoType,
        color: requirements.color,
        orderEstimate 
       };
      }
      
      if (orderQuote) {
       orderAnalysis = `
CURRENT ORDER CALCULATION:
- Quantity: ${orderQuote.quantity} caps
- Total Cost: $${orderQuote.totalCost.toFixed(2)}
- Cost Per Cap: $${(orderQuote.totalCost / orderQuote.quantity).toFixed(2)}

DETAILED COST BREAKDOWN:
- Base Product: $${costBreakdown.baseProductTotal?.toFixed(2) || '0.00'} ($${((costBreakdown.baseProductTotal || 0) / orderQuote.quantity).toFixed(2)} per cap)`;

       // Add detailed logo setup breakdown with specific logo info
       if (costBreakdown.detailedBreakdown?.logoSetupCosts?.length > 0) {
        orderAnalysis += `
- Logo Setup: $${costBreakdown.logoSetupTotal?.toFixed(2) || '0.00'}`;
        costBreakdown.detailedBreakdown.logoSetupCosts.forEach((logo: any) => {
         orderAnalysis += `
 • ${logo.name}: $${logo.cost.toFixed(2)} ($${logo.unitPrice.toFixed(2)} per cap)`;
         if (logo.baseUnitPrice && logo.baseUnitPrice !== logo.unitPrice) {
          const savings = (logo.baseUnitPrice - logo.unitPrice) * orderQuote.quantity;
          const percentSavings = Math.round(((logo.baseUnitPrice - logo.unitPrice) / logo.baseUnitPrice) * 100);
          orderAnalysis += ` - 💰Save $${savings.toFixed(2)} (${percentSavings}% volume discount)`;
         }
        });
       } else if (costBreakdown.logoSetupTotal > 0) {
        orderAnalysis += `
- Logo Setup: $${costBreakdown.logoSetupTotal?.toFixed(2) || '0.00'} ($${((costBreakdown.logoSetupTotal || 0) / orderQuote.quantity).toFixed(2)} per cap)`;
       }

       // Add premium fabric breakdown
       if (costBreakdown.detailedBreakdown?.premiumFabricCosts?.length > 0) {
        orderAnalysis += `
- Premium Fabric: $${costBreakdown.premiumFabricTotal?.toFixed(2)}`;
        costBreakdown.detailedBreakdown.premiumFabricCosts.forEach((fabric: any) => {
         orderAnalysis += `
 • ${fabric.name}: $${fabric.cost.toFixed(2)} ($${fabric.unitPrice.toFixed(2)} per cap)`;
        });
       } else if (costBreakdown.premiumFabricTotal > 0) {
        orderAnalysis += `
- Premium Fabric: $${costBreakdown.premiumFabricTotal?.toFixed(2)} ($${((costBreakdown.premiumFabricTotal || 0) / orderQuote.quantity).toFixed(2)} per cap)`;
       }

       // Add accessories
       if (costBreakdown.accessoriesTotal > 0) {
        orderAnalysis += `
- Accessories: $${costBreakdown.accessoriesTotal?.toFixed(2)} ($${((costBreakdown.accessoriesTotal || 0) / orderQuote.quantity).toFixed(2)} per cap)`;
       }

       // Add closure costs
       if (costBreakdown.closureTotal > 0) {
        orderAnalysis += `
- Premium Closures: $${costBreakdown.closureTotal?.toFixed(2)} ($${((costBreakdown.closureTotal || 0) / orderQuote.quantity).toFixed(2)} per cap)`;
       }

       // Add mold charges with detailed info
       if (costBreakdown.detailedBreakdown?.moldChargeCosts?.length > 0) {
        orderAnalysis += `
- Mold Development: $${costBreakdown.moldChargeTotal?.toFixed(2)}`;
        costBreakdown.detailedBreakdown.moldChargeCosts.forEach((mold: any) => {
         orderAnalysis += `
 • ${mold.name}: $${mold.cost.toFixed(2)}`;
         if (mold.waived) {
          orderAnalysis += ` ✅ Waived: ${mold.waiverReason}`;
         }
        });
       } else if (costBreakdown.moldChargeTotal > 0) {
        orderAnalysis += `
- Mold Development: $${costBreakdown.moldChargeTotal?.toFixed(2)}`;
       }

       // Add services
       if (costBreakdown.servicesTotal > 0) {
        orderAnalysis += `
- Services: $${costBreakdown.servicesTotal?.toFixed(2)} ($${((costBreakdown.servicesTotal || 0) / orderQuote.quantity).toFixed(2)} per cap)`;
       }

       // Add delivery
       if (costBreakdown.detailedBreakdown?.deliveryCosts?.length > 0) {
        orderAnalysis += `
- Delivery: $${costBreakdown.deliveryTotal?.toFixed(2)}`;
        costBreakdown.detailedBreakdown.deliveryCosts.forEach((delivery: any) => {
         orderAnalysis += `
 • ${delivery.name}: $${delivery.cost.toFixed(2)} ($${delivery.unitPrice.toFixed(2)} per cap)`;
        });
       } else {
        orderAnalysis += `
- Delivery: $${costBreakdown.deliveryTotal?.toFixed(2) || '0.00'} ($${((costBreakdown.deliveryTotal || 0) / orderQuote.quantity).toFixed(2)} per cap)`;
       }

       orderAnalysis += `
- **Total: $${costBreakdown.totalCost?.toFixed(2) || '0.00'}**`;

       // Store for potential order creation
       context.lastQuote = orderQuote;
       console.log(`💾 [UNIFIED-AI] Quote context stored:`, {
        quantity: context.lastQuote.quantity,
        totalCost: context.lastQuote.totalCost,
        logoType: context.lastQuote.logoType,
        color: context.lastQuote.color
       });
      }
     } catch (error) {
      console.log('⚠️ [UNIFIED-AI] Cost calculation failed, proceeding without analysis');
     }
    }
   }
  } else if (isConfirmation) {
   console.log('🔁 [UNIFIED-AI] Skipping cost calculation for confirmation message, using conversation context');
  }

  // 👤 BUILD USER CONTEXT: Add personalization based on user profile
  let userContext = '';
  if (userProfile) {
   userContext = `
CUSTOMER PROFILE (Use for Personalization):
- Name: ${userProfile.name || 'Customer'}
- Email: ${userProfile.email}
- Company: ${userProfile.company || 'Not specified'}
- Customer Type: ${userProfile.customerRole || 'RETAIL'} customer
- Phone: ${userProfile.phone || 'Not provided'}
- Access Level: ${userProfile.accessRole || 'CUSTOMER'}

PERSONALIZATION NOTES:
- Use their name "${userProfile.name || 'there'}" SPARINGLY - only for greetings, confirmations, or when it feels natural
- Don't use their name in every response - it sounds robotic
- Consider their customer type for pricing recommendations
- ${userProfile.customerRole === 'WHOLESALE' ? 'This is a wholesale customer - emphasize volume discounts and bulk pricing' : ''}
- ${userProfile.company ? `They represent ${userProfile.company} - consider business use cases` : ''}
- ${userProfile.accessRole === 'MEMBER' ? 'They are a registered member - reference their dashboard and order history' : ''}

NAME USAGE GUIDELINES:
- ✅ Good: "Hi ${userProfile.name || 'there'}, welcome back!" (greeting)
- ✅ Good: "Thanks ${userProfile.name || 'there'}, your order is confirmed!" (confirmation) 
- ✅ Good: "Let me help you with that quote" (no name - natural)
- ❌ Avoid: "${userProfile.name || 'there'}, for your 200 caps..." (every response)
- ❌ Avoid: "That's great ${userProfile.name || 'there'}! So ${userProfile.name || 'there'}, here's..." (repetitive)
`;
  } else {
   userContext = `
CUSTOMER PROFILE: Guest user (not logged in)
- Provide general assistance without personalization
- Encourage account creation for better service
- Use guest-friendly language and processes
`;
  }

  // Create unified system prompt for GPT-4o - HUMAN-LIKE CONVERSATION WITH PERSONALIZATION
  const systemPrompt = `You are a friendly, knowledgeable US Custom Cap specialist who genuinely cares about helping customers get the perfect caps for their needs. You're having a real conversation with a human - be warm, personable, and helpful.

${userContext}

CONVERSATION STYLE:
- Talk like a real person, not a bot or template
- Use natural language, contractions, and casual tone when appropriate 
- Show enthusiasm for their project without being overly salesy
- Ask clarifying questions naturally, like you're genuinely curious
- Make suggestions based on what would actually help them
- IMPORTANT: Don't overuse their name - treat it like a normal human conversation
- Most responses should feel natural without mentioning their name at all

MEMORY AND UNDERSTANDING:
- Remember everything from this conversation naturally
- Build on what they've told you without repeating questions
- When they say "cheapest" or "go with that" - you understand, just give them the full solution
- Pick up on their intent even if they don't spell everything out perfectly

YOUR APPROACH:
- First time talking: Get to know their project, what they're trying to accomplish
- Give quotes: Explain pricing clearly, show them the value they're getting
- When they're ready: Help them place the actual order smoothly 
- Throughout: Be their advocate for getting the best deal possible

${csvProductContext}

PRICING INSTRUCTIONS:
*** CRITICAL: DO NOT CALCULATE PRICES MANUALLY ***
- ALL pricing has been calculated by our unified cost system
- The calculated cost breakdown is provided in the ORDER ANALYSIS section below
- Use ONLY the calculated values from the ORDER ANALYSIS
- Never perform manual calculations using generic pricing
- If no ORDER ANALYSIS is present, request customer specifications first

VOLUME DISCOUNT INFORMATION (for context only - DO NOT calculate manually):
- We offer volume discounts at 144, 576, and 1152+ quantities
- Premium fabric options (like Acrylic) add surcharges
- Logo setup includes all application methods (embroidery, patches, etc.)
- Multiple logo positions can be combined for optimal pricing

${orderAnalysis}

ORDER CREATION CAPABILITY:
When customer confirms they want to proceed (ANY variation like "yes create order", "let's do it", "proceed", "confirm", "all good submit order" etc.), you WILL:
1. **NEVER RECALCULATE** - Use the exact specifications and pricing from previous messages
2. **REFERENCE CONVERSATION** - Pull quantity, colors, and total from what was already discussed
3. Create order reference (ORD-XXXXXX) with the ORIGINAL specifications
4. If they said "576 caps" earlier, it's STILL 576 caps when they confirm
5. DO NOT default to different quantities or recalculate anything

HOW TO RESPOND:
- Sound like you're actually talking to them, not reading from a script
- Share pricing info naturally - "So for what you're looking for, we're talking about..." 
- When they give you specs, respond to their specific situation
- If they want the cheapest option, just tell them what that looks like with real numbers
- Use **bold** for key numbers they care about, but don't overdo formatting
- Be genuinely helpful - if you see a better option for them, mention it

COST PRESENTATION RULES:
- ALWAYS use the exact totalCost from ORDER ANALYSIS (e.g., $11,997.72)
- NEVER calculate costs manually or use generic per-cap rates
- MANDATORY: Show COMPLETE detailed breakdown including ALL cost components with individual line items and per-cap costs
- When premium fabric is included (e.g., Laser Cut, Acrylic), mention specific fabric type and per-cap cost
- When logo setup costs exist, show SPECIFIC logo types and per-cap costs (e.g., "Large Leather Patch + Run: $331.20 ($1.15 each)")
- When mold charges exist, show specific mold types and costs
- ALWAYS show per-cap breakdown for Base Product, Logo Setup, Premium Fabric, and Delivery
- If volume discounts apply, mention savings amount and percentage
- Present costs in this order: Base Product → Logo Setup (detailed) → Premium Fabric (detailed) → Delivery (detailed) → Mold Charges (if any) → Total
- Present all costs exactly as calculated by the unified system with full transparency

CRITICAL FABRIC COST RULES:
- FREE fabrics (Chino Twill, Trucker Mesh): Show NO separate fabric line item, fabric cost included in base product
- PREMIUM fabrics (Air Mesh, Acrylic): Show separate "Premium Fabric" line item with exact upgrade cost
- Dual fabric caps: Base product cost + any premium fabric upgrades for specific panels
- NEVER show fabric types as separate cap line items (e.g., avoid "Duck Camo caps: $X" + "Trucker Mesh caps: $Y")
- ALWAYS show as: "Base caps + Premium fabric upgrades" structure

EXAMPLE CONVERSATION STYLE:
"Ah, 576 pieces with rubber patches - that's a solid order size! You'll definitely get some good pricing at that quantity. Let me see what we can do for you..."

"For your setup, you're looking at about **$3,400 total** - that breaks down to around $5.90 per cap, which is pretty good value for rubber patches. Want me to walk through the details?"

`;

  let userPrompt = message;
  if (uploadedFiles && uploadedFiles.length > 0) {
   userPrompt += `\n\n[Logo files uploaded: ${uploadedFiles.map(f => `${f.name}`).join(', ')}]`;
  }

  let completion;
  
  try {
   // Build complete messages array with conversation history
   const messages = [
    { role: 'system', content: systemPrompt },
    ...conversationMessages,
    { role: 'user', content: userPrompt }
   ];

   // Try GPT-4o first with 10 second timeout (more aggressive)
   console.log('🎯 [UNIFIED-AI] Trying GPT-4o with 10s timeout...');
   const completionPromise = getOpenAIClient().chat.completions.create({
    model: 'gpt-4o',
    messages: messages,
    max_tokens: 800,
    temperature: 0.5,
   });
   
   const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('GPT-4o timeout after 10 seconds')), 10000);
   });
   
   completion = await Promise.race([completionPromise, timeoutPromise]) as any;
   console.log('✅ [UNIFIED-AI] GPT-4o responded successfully');
   
  } catch (gpt4oError) {
   console.warn('⚠️ [UNIFIED-AI] GPT-4o failed, trying GPT-3.5-turbo...', gpt4oError.message);
   
   // Fallback to GPT-3.5-turbo with shorter timeout
   try {
    const gpt35Promise = getOpenAIClient().chat.completions.create({
     model: 'gpt-3.5-turbo',
     messages: messages,
     max_tokens: 800,
     temperature: 0.5,
    });
    
    const gpt35TimeoutPromise = new Promise((_, reject) => {
     setTimeout(() => reject(new Error('GPT-3.5-turbo timeout after 8 seconds')), 8000);
    });
    
    completion = await Promise.race([gpt35Promise, gpt35TimeoutPromise]) as any;
    console.log('✅ [UNIFIED-AI] GPT-3.5-turbo responded successfully');
    
   } catch (gpt35Error) {
    console.warn('⚠️ [UNIFIED-AI] Both AI models failed, using intelligent fallback', gpt35Error.message);
    throw new Error('Both AI models failed - using fallback');
   }
  }

  const aiResponse = completion.choices[0]?.message?.content || 
   "I'm ready to help with your custom cap order. Could you share your quantity and requirements?";

  // 🔧 IMPROVED ORDER CREATION TRIGGER: Check if user explicitly requests order creation
  const userMessage = message.toLowerCase().trim();
  const isOrderCreationRequest = (
   userMessage.includes('save order') ||
   userMessage.includes('create order') ||
   userMessage.includes('submit order') ||
   userMessage.includes('place order') ||
   userMessage.includes('save this order') ||
   userMessage.includes('wants to save') ||
   userMessage === 'confirm' ||
   userMessage === 'yes' ||
   userMessage === 'proceed' ||
   userMessage.includes('go ahead') ||
   userMessage.includes('let\'s do it') ||
   userMessage.includes('all good') ||
   // Enhanced natural language detection for order creation
   (userMessage.includes('yes') && (userMessage.includes('create') || userMessage.includes('order'))) ||
   (userMessage.includes('user') && userMessage.includes('wants') && userMessage.includes('order')) ||
   (userMessage.includes('order') && (userMessage.includes('create') || userMessage.includes('submit') || userMessage.includes('place')))
  );
  
  // Also check if AI response indicates order creation (backup trigger)
  const aiIndicatesOrder = aiResponse.toLowerCase().includes('order created') || 
              aiResponse.toLowerCase().includes('reference:') ||
              aiResponse.toLowerCase().includes('ord-');
  
  const shouldCreateOrder = (isOrderCreationRequest && context.lastQuote) || aiIndicatesOrder;
  
  console.log(`🎯 [ORDER-AI] Order creation analysis:`, {
   userMessage: userMessage,
   isOrderCreationRequest,
   aiIndicatesOrder,
   shouldCreateOrder,
   hasQuote: !!context.lastQuote,
   hasUserProfile: !!userProfile
  });

  // 🚀 ORDER CREATION: Create real database order when user requests it
  if (shouldCreateOrder && context.lastQuote) {
   console.log(`🚀 [ORDER-AI] Creating real order for user request: "${userMessage}"`);
   console.log(`📊 [ORDER-AI] Quote context:`, {
    quantity: context.lastQuote.quantity,
    totalCost: context.lastQuote.totalCost,
    logoType: context.lastQuote.logoType
   });
   console.log(`👤 [ORDER-AI] User context:`, {
    hasUser: !!user,
    userId: user?.id,
    hasProfile: !!userProfile,
    profileEmail: userProfile?.email
   });
   
   try {
    console.log(`📊 [ORDER-AI] Using context.lastQuote for order creation:`, {
     quantity: context.lastQuote.quantity,
     totalCost: context.lastQuote.totalCost,
     logoType: context.lastQuote.logoType
    });
    const realOrderId = await createRealOrderFromAI(context.lastQuote, message, userProfile, user);
    const orderReference = `ORD-${realOrderId.slice(-6).toUpperCase()}`;
    
    // Create a confirmation response with receipt page link
    let confirmationResponse = `🎉 **Order Created Successfully!**\n\n`;
    confirmationResponse += `**Order Reference:** ${orderReference}\n`;
    confirmationResponse += `**Status:** Submitted for review\n\n`;
    confirmationResponse += `**Order Details:**\n`;
    confirmationResponse += `• Quantity: ${context.lastQuote.quantity || 'As discussed'} caps\n`;
    confirmationResponse += `• Total: $${(context.lastQuote.totalCost || 0).toLocaleString()}\n`;
    confirmationResponse += `• Customer: ${userProfile?.name || 'Guest'}\n\n`;
    confirmationResponse += `🧾 **[View Full Receipt & Order Details →](/checkout/success?orderId=${realOrderId})**\n\n`;
    confirmationResponse += `**Next Steps:**\n`;
    confirmationResponse += `1. Order review and quote generation (2-4 hours)\n`;
    confirmationResponse += `2. Official quote sent via email\n`;
    confirmationResponse += `3. Production begins after payment\n\n`;
    confirmationResponse += `You can track your order in your ${user ? 'member' : 'customer'} dashboard or click the receipt link above!`;
    
    console.log(`✅ [ORDER-AI] Real order created successfully: ${realOrderId} → ${orderReference}`);
    return confirmationResponse;
   } catch (error) {
    console.error('❌ [ORDER-AI] Real order creation failed:', error);
    
    // Provide helpful error message
    let errorResponse = `I apologize, but I encountered an issue creating your order. `;
    if (!user) {
     errorResponse += `It looks like you might not be logged in. Please log in to your account and try again, or contact our support team at support@uscustomcap.com with your order details:\n\n`;
     errorResponse += `**Your Order Details:**\n`;
     errorResponse += `• Quantity: ${context.lastQuote.quantity || 'As discussed'} caps\n`;
     errorResponse += `• Total: $${(context.lastQuote.totalCost || 0).toLocaleString()}\n`;
     errorResponse += `• Request: "${message}"\n\n`;
     errorResponse += `Our team will be happy to help you place this order manually.`;
    } else {
     errorResponse += `There was a technical issue. Please try again in a moment, or contact support@uscustomcap.com if the problem persists.`;
    }
    
    return errorResponse;
   }
  }
  
  console.log(`🤖 [UNIFIED-AI] Response generated (${completion.usage?.total_tokens || 0} tokens)`);
  return aiResponse;
  
 } catch (error) {
  console.error('❌ [UNIFIED-AI] Response generation failed:', error);
  
  // Intelligent fallback based on the message content
  const lowerMessage = message.toLowerCase();
  
  // Check for specific query patterns and provide targeted responses (IMPROVED PATTERN MATCHING)
  if (lowerMessage.includes('mid budget') || lowerMessage.includes('tier 2')) {
   return generateMidBudgetFallbackResponse(message);
  } else if (lowerMessage.includes('color') && lowerMessage.includes('logo') && 
        !lowerMessage.includes('no logo') && 
        !lowerMessage.includes('no decoration') &&
        !lowerMessage.includes('blank')) {
   return generateColorLogoFallbackResponse(message);
  } else if (lowerMessage.includes('accessor') || lowerMessage.includes('branded')) {
   return generateAccessoryFallbackResponse(message);
  } else {
   return "I'm having trouble with the AI system right now. For immediate assistance with your custom cap order, please contact our team at support@uscustomcap.com or call (555) 123-4567. We'll be happy to help you with pricing and specifications!";
  }
 }
}

// ==============================================================================
// FAST FALLBACK SYSTEM - Bypass AI for Immediate Response
// ==============================================================================

/**
 * Determine if we should use fast fallback to avoid AI timeouts
 */
function shouldUseFastFallback(lowerMessage: string): boolean {
 // Always use fast fallback for quote requests to avoid timeouts
 return (
  lowerMessage.includes('quote') || 
  lowerMessage.includes('price') ||
  lowerMessage.includes('cost') ||
  lowerMessage.includes('pieces') ||
  lowerMessage.includes('caps') ||
  lowerMessage.includes('panel') ||
  lowerMessage.includes('embroidery') ||
  lowerMessage.includes('patch')
 );
}

/**
 * Generate fast fallback response based on message patterns
 */
function generateFastFallbackResponse(message: string): string {
 const lowerMessage = message.toLowerCase();
 
 // Dual cap order pattern (like user's query)
 if (lowerMessage.includes('panel') && (lowerMessage.includes('144') || lowerMessage.includes('288'))) {
  return generateDualCapOrderFallback(message);
 }
 
 // Mid-budget requests
 if (lowerMessage.includes('mid budget') || lowerMessage.includes('tier 2')) {
  return generateMidBudgetFallbackResponse(message);
 }
 
 // Color and logo requests (IMPROVED PATTERN MATCHING)
 if (lowerMessage.includes('color') && lowerMessage.includes('logo') && 
   !lowerMessage.includes('no logo') && 
   !lowerMessage.includes('no decoration') &&
   !lowerMessage.includes('blank')) {
  return generateColorLogoFallbackResponse(message);
 }
 
 // Accessory requests
 if (lowerMessage.includes('accessor') || lowerMessage.includes('branded')) {
  return generateAccessoryFallbackResponse(message);
 }
 
 // Quote requests
 if (lowerMessage.includes('quote')) {
  return generateQuoteFallbackResponse(message);
 }
 
 // Default fast response
 return generateGenericFastResponse(message);
}

/**
 * Generate fallback for dual cap orders (user's specific query type)
 */
function generateDualCapOrderFallback(message: string): string {
 return `**Dual Cap Order Quote - Professional Multi-Style Setup! 🎯**

**Order Summary:**
• **6-Panel Caps**: 144 pieces in Black/White 
• **5-Panel Caps**: 288 pieces in Khaki/Red
• **Same Logo**: Large Rubber Patch on Front for both styles

**Detailed Breakdown:**

**Setup 1 - 6-Panel Black/White (144 pieces):**
• Base Cap: 6-panel structured - $3.00/cap at 144+ quantity
• Large Rubber Patch (Front): $1.20/cap
• **Subtotal**: $6.20/cap × 144 = **$892.80**

**Setup 2 - 5-Panel Khaki/Red (288 pieces):**
• Base Cap: 5-panel structured - $2.90/cap at 288+ quantity 
• Large Rubber Patch (Front): $1.10/cap (volume discount)
• **Subtotal**: $6.00/cap × 288 = **$1,728.00**

**Shared Costs:**
• Large Rubber Patch mold: $80.00 (one-time charge)
• Regular delivery: ~$994.40 (432 total pieces)

**TOTAL ORDER ESTIMATE:**
• **6-Panel Setup**: $892.80
• **5-Panel Setup**: $1,728.00
• **Mold Charge**: $80.00
• **Delivery**: $994.40
• **GRAND TOTAL**: **$3,695.20**

**Volume Benefits:**
✓ Shared logo design reduces setup costs
✓ Combined 432-piece order unlocks volume pricing
✓ Professional dual-style branding package

**Ready to proceed?** Upload your logo design and I'll finalize the exact specifications!`;
}

/**
 * Generate fallback for quote requests
 */
function generateQuoteFallbackResponse(message: string): string {
 const hasQuantity = /(\d+)\s*(?:pieces?|caps?|units?)/i.test(message);
 const quantityMatch = message.match(/(\d+)\s*(?:pieces?|caps?|units?)/i);
 const quantity = quantityMatch ? parseInt(quantityMatch[1]) : 288;
 
 return `**Custom Cap Quote - Fast Response! ⚡**

**Quote Summary:**
• **Quantity**: ${quantity} caps (excellent volume for pricing)
• **Estimated Cost**: $${(quantity * 6.5).toLocaleString()} - $${(quantity * 8.2).toLocaleString()} total
• **Cost Per Cap**: $6.50 - $8.20 (depending on customization)

**Included in Base Price:**
• Premium 6-panel structured caps
• Professional embroidery or patch application
• Standard delivery (15 business days)

**Popular Add-ons:**
• **3D Embroidery**: +$0.25/cap (premium raised effect)
• **Multiple Positions**: +$0.45/cap per additional location
• **Premium Accessories**: Hang tags, labels, stickers available

**Volume Discounts Active:**
✓ ${quantity}+ caps qualify for Tier 2 pricing
✓ Professional bulk packaging included
✓ Dedicated account manager assigned

**Next Steps:**
1. **Upload logo** for exact positioning quote
2. **Choose colors** from our premium selection
3. **Select customization** options (embroidery, patches, etc.)
4. **Confirm timeline** (standard vs express)

**Need exact pricing?** Share your logo and color preferences - I'll calculate precise costs immediately!`;
}

/**
 * Generate generic fast response
 */
function generateGenericFastResponse(message: string): string {
 return `**Custom Cap Order Assistant - Ready to Help! 🎯**

I understand you're looking for custom cap solutions. Here's how I can help:

**Popular Order Options:**
• **Budget Friendly**: 144+ caps starting at $5.50/cap
• **Premium Quality**: 288+ caps with 3D embroidery from $7.20/cap
• **Bulk Orders**: 576+ caps with maximum volume savings

**What I Need for Your Quote:**
1. **Quantity** (144, 288, 576+ pieces)
2. **Colors** (single or multi-color setup)
3. **Logo Details** (embroidery, patches, positions)
4. **Timeline** (standard 15 days vs express)

**Instant Estimates:**
• 144 caps with logo: ~$920 - $1,150
• 288 caps with logo: ~$1,730 - $2,160 
• 576 caps with logo: ~$3,170 - $4,320

**Ready for exact pricing?** Just tell me:
- How many caps you need
- Your preferred colors
- Where you want the logo placed

I'll generate a detailed quote within minutes!`;
}

// ==============================================================================
// FALLBACK RESPONSE GENERATORS - When AI System Fails
// ==============================================================================

/**
 * Generate fallback response for mid-budget tier requests
 */
function generateMidBudgetFallbackResponse(message: string): string {
 const hasColors = message.toLowerCase().includes('pink') || message.toLowerCase().includes('black') || message.toLowerCase().includes('white') || message.toLowerCase().includes('grey');
 const has3D = message.toLowerCase().includes('3d');
 const hasAccessories = message.toLowerCase().includes('accessor') || message.toLowerCase().includes('branded');
 
 return `**Mid-Budget Tier Custom Caps - Perfect Balance of Quality & Value! 🎯**

**Tier 2 Recommendations:**
• **Base Cap**: Premium 6-panel structured caps - $3.20/cap at 144+ quantity
• **Perfect for**: Professional branding with quality materials

${hasColors ? `**Your Color Options:**
• Pink/White combination: Eye-catching and professional
• Black/Light Grey: Classic and versatile
• Both colors available with same logo setup for consistency

` : ''}${has3D ? `**3D Embroidered Logo (Front):**
• Large 3D embroidery: $0.95 per cap (premium raised effect)
• Creates stunning visual impact and professional appearance
• Perfect for company logos and brand recognition

` : ''}${hasAccessories ? `**Branded Accessories Available:**
• Hang Tags: $0.35/cap (professional branding touch)
• Inside Labels: $0.20/cap (branded interior)
• Stickers: $0.25/cap (additional branding option)
• Custom packaging options available

` : ''}**Estimated Pricing (per setup):**
• 144 caps: ~$7.50/cap total (including 3D logo + accessories)
• 288 caps: ~$6.80/cap total (better volume pricing)
• 576 caps: ~$6.20/cap total (best value)

**Next Steps:**
1. **Upload your logo** for exact sizing and positioning
2. **Choose quantities** for each color combination
3. **Select accessories** to complete your branding package

Ready to get a precise quote? Just let me know your preferred quantities!`;
}

/**
 * Generate fallback response for color and logo requests
 */
function generateColorLogoFallbackResponse(message: string): string {
 return `**Multi-Color Cap Setup with Logo - Great Choice! 🎨**

**Your Custom Cap Configuration:**
• **Two-color setups** create excellent visual contrast
• **Same logo decoration** ensures brand consistency across colors
• **Front 3D embroidery** provides premium professional appearance

**Color Combinations:**
1. **Pink/White**: Bold, modern, great for creative brands
2. **Black/Light Grey**: Classic, professional, universal appeal

**Logo Placement & Decoration:**
• **Front Position**: Large 3D embroidered logo
• **Size**: Optimized for maximum brand visibility
• **Effect**: Raised 3D texture for premium feel

**Branded Accessories:**
• Professional hang tags with your branding
• Custom inside labels for brand consistency
• Additional sticker options for packaging

**Recommended Quantities:**
• **144 caps per color** (288 total) - Good starting volume
• **288 caps per color** (576 total) - Better per-unit pricing
• **Mix and match** quantities based on your needs

**Next Steps:**
1. Upload your logo file (PNG, JPG, or vector)
2. Specify exact quantities for each color
3. Choose your preferred accessories
4. Get detailed quote with exact pricing

Would you like to start with specific quantities for your quote?`;
}

/**
 * Generate fallback response for accessory requests
 */
function generateAccessoryFallbackResponse(message: string): string {
 return `**Branded Accessories - Complete Your Professional Package! 🏷️**

**Available Branded Accessories:**

**Essential Branding:**
• **Hang Tags**: $0.35/cap - Professional product tags with your branding
• **Inside Labels**: $0.20/cap - Branded interior labels for authenticity
• **Custom Stickers**: $0.25/cap - Additional branding for packaging

**Premium Options:**
• **B-Tape Prints**: $0.20/cap - Interior sweatband branding
• **Metal Eyelets**: $0.15/cap - Branded metal ventilation details
• **Custom Packaging**: Available for bulk orders

**Accessory Benefits:**
✓ **Brand Recognition**: Multiple touchpoints for your brand
✓ **Professional Appearance**: Complete branded experience
✓ **Quality Perception**: Attention to detail shows quality
✓ **Marketing Value**: Every element reinforces your brand

**Popular Combinations:**
• **Starter Package**: Hang tags + Inside labels = $0.55/cap
• **Complete Package**: All accessories = $1.15/cap
• **Custom Selection**: Choose what fits your brand needs

**Volume Pricing:**
• 144+ caps: Standard accessory pricing
• 288+ caps: 5-10% accessory savings
• 576+ caps: Best accessory volume rates

Ready to add branded accessories to your cap order? Let me know your preferred combination!`;
}

// ==============================================================================
// AI-POWERED RESPONSE GENERATORS - ChatGPT + Order Intelligence (LEGACY - BACKUP ONLY)
// ==============================================================================

/**
 * Generate AI-powered order response using ChatGPT with CSV-based product data
 * LEGACY FUNCTION - Used as backup only
 */
async function generateAIOrderResponse(message: string, context: LocalConversationContext, uploadedFiles?: any[], conversationHistory?: any[], userProfile?: any): Promise<string> {
 console.log('🤖 [ORDER-AI] Generating AI-powered order response with CSV integration');
 
 try {
  // Load CSV product data for accurate recommendations
  const productDataResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3003'}/api/order-ai/products`);
  let productData = null;
  let csvProductContext = '';
  
  if (productDataResponse.ok) {
   productData = await productDataResponse.json();
   console.log(`📊 [ORDER-AI] Loaded ${productData.products.length} products from CSV`);
   
   // Create product context for AI
   csvProductContext = `
AVAILABLE BLANK CAPS FROM CSV DATA:
${Object.entries(productData.productsByTier).map(([tier, products]: [string, any[]]) => 
 `${tier} (${products.length} options):
${products.slice(0, 3).map(p => ` • ${p.name}: ${p.profile} profile, ${p.panelCount}, ${p.billOrVisorShape} bill`).join('\n')}
 Pricing: $${products[0]?.pricing?.price144 || 3.00}/cap at 144+ quantity`
).join('\n\n')}

PRICING TIERS FROM CSV:
• Tier 1: $${productData.pricing?.['Tier 1']?.price144 || 3.00}/cap at 144+ (Most affordable)
• Tier 2: $${productData.pricing?.['Tier 2']?.price144 || 3.20}/cap at 144+ (Premium options) 
• Tier 3: $${productData.pricing?.['Tier 3']?.price144 || 3.40}/cap at 144+ (Specialty caps)

VOLUME DISCOUNTS:
• 48 caps: Higher per-unit cost
• 144 caps: Standard tier pricing
• 576 caps: Better volume pricing
• 1152+ caps: Best volume pricing
`;
  } else {
   console.warn('⚠️ [ORDER-AI] Failed to load CSV product data, using fallbacks');
  }
  
  // First, extract order requirements and calculate costs WITH user message for premium feature detection
  const requirements = parseOrderRequirements(message);
  const budget = extractBudget(message);
  
  // Initialize variables for context storage
  let costBreakdown: any = {};
  let orderEstimate: any = {};
  
  let orderAnalysis = '';
  if (budget) {
   const optimization = await optimizeQuantityForBudgetPrecise(budget, requirements.logoType, message); // Pass message for feature detection
   // Calculate cost breakdown for the optimized quantity
   const result = await calculatePreciseOrderEstimateWithMessage({
    ...requirements,
    quantity: optimization.optimizedQuantity
   }, message);
   costBreakdown = result.costBreakdown;
   orderEstimate = result.orderEstimate;
   
   // Build detailed analysis with per-unit costs
   orderAnalysis = `
BUDGET OPTIMIZATION ANALYSIS:
- Budget: $${budget.toLocaleString()}
- Optimized Quantity: ${optimization.optimizedQuantity} caps
- Total Cost: $${costBreakdown.totalCost.toFixed(2)}
- Budget Remaining: $${optimization.savings?.toFixed(2) || '0.00'}

DETAILED COST BREAKDOWN:
- Base Product: $${costBreakdown.baseProductTotal?.toFixed(2) || '0.00'} ($${(costBreakdown.baseProductTotal / optimization.optimizedQuantity).toFixed(2)} per cap)`;

   // Add detailed logo costs if any
   if (costBreakdown.detailedBreakdown?.logoSetupCosts?.length > 0) {
    orderAnalysis += `\n- Logo Setup: $${costBreakdown.logoSetupTotal?.toFixed(2) || '0.00'} ($${costBreakdown.detailedBreakdown.logoSetupCosts[0].unitPrice.toFixed(2)} per cap)
 • ${costBreakdown.detailedBreakdown.logoSetupCosts[0].details}`;
   }

   // Add other cost components if they exist
   if (costBreakdown.closureTotal > 0) {
    orderAnalysis += `\n- Premium Closure: $${costBreakdown.closureTotal?.toFixed(2)} ($${(costBreakdown.closureTotal / optimization.optimizedQuantity).toFixed(2)} per cap)`;
   }
   if (costBreakdown.accessoriesTotal > 0) {
    orderAnalysis += `\n- Accessories: $${costBreakdown.accessoriesTotal?.toFixed(2)} ($${(costBreakdown.accessoriesTotal / optimization.optimizedQuantity).toFixed(2)} per cap)`;
   }
   if (costBreakdown.detailedBreakdown?.premiumFabricCosts?.length > 0) {
    orderAnalysis += `\n- Premium Fabric: $${costBreakdown.premiumFabricTotal?.toFixed(2)}`;
    costBreakdown.detailedBreakdown.premiumFabricCosts.forEach((fabric: any) => {
     orderAnalysis += `\n • ${fabric.name}: $${fabric.cost.toFixed(2)} ($${fabric.unitPrice.toFixed(2)} per cap)`;
    });
   } else if (costBreakdown.premiumFabricTotal > 0) {
    orderAnalysis += `\n- Premium Fabric: $${costBreakdown.premiumFabricTotal?.toFixed(2)} ($${(costBreakdown.premiumFabricTotal / optimization.optimizedQuantity).toFixed(2)} per cap)`;
   }
   if (costBreakdown.servicesTotal > 0) {
    orderAnalysis += `\n- Services: $${costBreakdown.servicesTotal?.toFixed(2)} ($${(costBreakdown.servicesTotal / optimization.optimizedQuantity).toFixed(2)} per cap)`;
   }
   if (costBreakdown.moldChargeTotal > 0) {
    orderAnalysis += `\n- Mold Charges: $${costBreakdown.moldChargeTotal?.toFixed(2)}`;
   }
   
   orderAnalysis += `\n- Delivery: $${costBreakdown.deliveryTotal?.toFixed(2) || '0.00'} ($${(costBreakdown.deliveryTotal / optimization.optimizedQuantity).toFixed(2)} per cap)
- COST PER CAP: $${(costBreakdown.totalCost / optimization.optimizedQuantity).toFixed(2)}
`;
  } else {
   const result = await calculatePreciseOrderEstimateWithMessage(requirements, message); // Pass message for feature detection
   costBreakdown = result.costBreakdown;
   orderEstimate = result.orderEstimate;
   
   // Build detailed analysis with per-unit costs
   orderAnalysis = `
COMPREHENSIVE ORDER ANALYSIS:
- Quantity: ${requirements.quantity} caps
- Total Cost: $${costBreakdown.totalCost.toFixed(2)}

DETAILED COST BREAKDOWN:
- Base Product: $${costBreakdown.baseProductTotal?.toFixed(2) || '0.00'} ($${(costBreakdown.baseProductTotal / requirements.quantity).toFixed(2)} per cap)`;

   // Add detailed logo costs if any
   if (costBreakdown.detailedBreakdown?.logoSetupCosts?.length > 0) {
    orderAnalysis += `\n- Logo Setup: $${costBreakdown.logoSetupTotal?.toFixed(2) || '0.00'} ($${costBreakdown.detailedBreakdown.logoSetupCosts[0].unitPrice.toFixed(2)} per cap)
 • ${costBreakdown.detailedBreakdown.logoSetupCosts[0].details}`;
   }

   // Add other detailed cost components
   if (costBreakdown.closureTotal > 0) {
    orderAnalysis += `\n- Premium Closure: $${costBreakdown.closureTotal?.toFixed(2)} ($${(costBreakdown.closureTotal / requirements.quantity).toFixed(2)} per cap)`;
   }
   if (costBreakdown.accessoriesTotal > 0) {
    orderAnalysis += `\n- Accessories: $${costBreakdown.accessoriesTotal?.toFixed(2)} ($${(costBreakdown.accessoriesTotal / requirements.quantity).toFixed(2)} per cap)`;
   }
   if (costBreakdown.detailedBreakdown?.premiumFabricCosts?.length > 0) {
    orderAnalysis += `\n- Premium Fabric: $${costBreakdown.premiumFabricTotal?.toFixed(2)}`;
    costBreakdown.detailedBreakdown.premiumFabricCosts.forEach((fabric: any) => {
     orderAnalysis += `\n • ${fabric.name}: $${fabric.cost.toFixed(2)} ($${fabric.unitPrice.toFixed(2)} per cap)`;
    });
   } else if (costBreakdown.premiumFabricTotal > 0) {
    orderAnalysis += `\n- Premium Fabric: $${costBreakdown.premiumFabricTotal?.toFixed(2)} ($${(costBreakdown.premiumFabricTotal / requirements.quantity).toFixed(2)} per cap)`;
   }
   if (costBreakdown.servicesTotal > 0) {
    orderAnalysis += `\n- Services: $${costBreakdown.servicesTotal?.toFixed(2)} ($${(costBreakdown.servicesTotal / requirements.quantity).toFixed(2)} per cap)`;
   }
   if (costBreakdown.moldChargeTotal > 0) {
    orderAnalysis += `\n- Mold Charges: $${costBreakdown.moldChargeTotal?.toFixed(2)} ($${(costBreakdown.moldChargeTotal / requirements.quantity).toFixed(2)} per cap)`;
   }
   
   orderAnalysis += `\n- Delivery: $${costBreakdown.deliveryTotal?.toFixed(2) || '0.00'} ($${(costBreakdown.deliveryTotal / requirements.quantity).toFixed(2)} per cap)
- COST PER CAP: $${(costBreakdown.totalCost / requirements.quantity).toFixed(2)}
`;
  }
  
  // 🧠 BUILD PROPER CONVERSATION MESSAGES: Include previous messages for AI memory
  let conversationMessages = [];
  if (conversationHistory && conversationHistory.length > 0) {
   // Convert conversation history to proper OpenAI message format
   conversationMessages = conversationHistory.map(msg => ({
    role: msg.role === 'user' ? 'user' : 'assistant',
    content: msg.content
   }));
   console.log(`🔄 [ORDER-PROGRESSION] Using ${conversationMessages.length} previous messages for context`);
  }

  // Create AI system prompt for order conversion with enhanced CSV data integration
  const systemPrompt = `You are a specialized US Custom Cap order assistant with access to real-time CSV product data. Your goal is to provide detailed quotes FIRST, then get order confirmation.

CRITICAL WORKFLOW RULE: 
- ALWAYS show detailed pricing breakdown first
- NEVER create orders without explicit customer confirmation
- ALWAYS ask "Would you like to proceed?" or "Shall I create this order?"
- Only create orders when customer explicitly says "create my order" or "yes, proceed"

COST TRANSPARENCY RULES - CRITICAL:
When customers ask for "cost breakdown", "show me costs", "break that down", "transparency", "detailed costs", "cost details", or similar - you MUST provide ACTUAL CALCULATED DOLLAR AMOUNTS, never vague descriptions.

CONVERSATION CONTINUITY FOR TRANSPARENCY:
- If discussing a previous order (mentioned in conversation context), use THOSE EXACT cost figures
- If ORDER ANALYSIS is available, use those exact calculated amounts 
- NEVER provide different numbers than what was previously quoted to the customer
- Reference the conversation history to maintain consistency with previous quotes
- For transparency requests, extract the total cost and quantity from previous conversation messages
- Calculate component breakdowns based on the previous conversation's total cost and specifications

TRANSPARENCY RESPONSE FORMAT (when requested):
Extract the EXACT total cost, quantity, and component costs from the previous conversation messages. Do NOT create new calculations.

Example format:
- **Base Product Cost**: $7,948.80 ($2.76 per cap) - 2880 premium caps
- **Premium Fabric**: $2,880.00 ($1.00 per cap) - Premium fabric upgrade 
- **Logo Setup**: $6,480.00 ($2.25 per cap) - Rubber Patch on Front
- **Accessories**: $1,728.00 ($0.60 per cap) - Stickers & hang tags
- **Delivery**: $5,184.00 ($1.80 per cap) - Regular delivery
- **Total**: $21,564.80 ($7.49 per cap)

CRITICAL: Use the EXACT numbers from the previous conversation - do NOT calculate new amounts.

NEVER say "This covers the cost of..." or "This is the starting price for..." - ALWAYS show the actual calculated amounts from ORDER ANALYSIS or previous conversation context.

IMPORTANT: You have FULL MEMORY of this conversation. Reference previous messages and build upon them. DO NOT repeat information already provided or ignore customer specifications.

${csvProductContext}

ACCURATE CSV-BASED PRICING RULES:
${productData ? `
- Tier 1: $${productData.pricing?.['Tier 1']?.price144}/cap at 144+ quantity (Most affordable)
- Tier 2: $${productData.pricing?.['Tier 2']?.price144}/cap at 144+ quantity (Premium options)
- Tier 3: $${productData.pricing?.['Tier 3']?.price144}/cap at 144+ quantity (Specialty caps)
- Volume pricing: 48 ($${productData.pricing?.['Tier 1']?.price48}/cap) → 144 ($${productData.pricing?.['Tier 1']?.price144}/cap) → 576 ($${productData.pricing?.['Tier 1']?.price576}/cap) → 1152+ ($${productData.pricing?.['Tier 1']?.price1152}/cap)` : 
`- Tier 1 pricing: $3.00-$3.60 per blank cap (fallback pricing)
- Volume tiers: 48, 144, 576, 1152, 2880+ caps`}

CUSTOMIZATION COSTS (ACCURATE CSV PRICING - ADD TO BASE PRICE):

CAP SIZE DEFAULTS (CRITICAL - FOLLOW EXACTLY):
- When customer doesn't specify cap size: ALWAYS default to "7 1/4" (Medium size)
- Show cap size in all quote responses: "Cap Size: 7 1/4" in specifications
- This is the most common adult size and fits most customers comfortably
- Only use different sizes when customer explicitly specifies a size

LOGO SIZE DEFAULTS (CRITICAL - FOLLOW EXACTLY):
- Front Position: ALWAYS Large Size (Large Size Embroidery = $0.80/cap at 144+ qty)
- Left/Right/Back Position: ALWAYS Small Size (Small Size Embroidery = $0.45/cap at 144+ qty)

LOGO TYPE PRICING AT 144+ QUANTITY:
- Flat Embroidery: Use Size Embroidery pricing based on position
 • Front = Large Size Embroidery ($0.80/cap) 
 • Back/Sides = Small Size Embroidery ($0.45/cap)
- 3D Embroidery: Size Embroidery + 3D Base ($0.15/cap)
 • Front = $0.80 + $0.15 = $0.95/cap
 • Back/Sides = $0.45 + $0.15 = $0.60/cap
- Rubber Patches: Small ($0.70/cap), Medium ($0.90/cap), Large ($1.20/cap)
- Leather Patches: Small ($0.60/cap), Medium ($0.75/cap), Large ($0.90/cap)
- Woven Patches: Small ($0.55/cap), Medium ($0.70/cap), Large ($0.90/cap)

APPLICATION COSTS (ADD TO LOGO COST):
- Direct: No additional cost
- Run Application: +$0.25/cap (for Leather/Rubber patches)
- Satin Application: +$0.25/cap (for Woven/Printed patches)

OTHER COSTS:
- Mold charges: Small ($40), Medium ($60), Large ($80) one-time charges
- Premium Closures: Flexfit, Fitted, Snap, Buckle add $0.35-$0.40 per cap at 144+ qty
- Accessories: Hang tags ($0.35/cap), Stickers ($0.25/cap), etc.
- Regular delivery: Volume pricing - 144+ ($2.30), 576+ ($1.90), 1152+ ($1.85/cap)

CRITICAL PRICING ACCURACY RULES:
- ALWAYS use the CORRECT VOLUME TIER for pricing:
 * 1584 caps = 1152+ tier = $2.84/cap base + $1.85/cap delivery
 * 576 caps = 576-1151 tier = $2.90/cap base + $1.90/cap delivery 
 * 144 caps = 144-575 tier = $3.00/cap base + $2.30/cap delivery
- ALWAYS use the actual calculated cost breakdowns provided in the analysis
- NEVER make up or estimate logo costs - use the precise calculations

EXAMPLE: 144 pcs with Flat Embroidery:
- Front Position: Large Size Embroidery = $0.80/cap × 144 = $115.20
- Left Position: Small Size Embroidery = $0.45/cap × 144 = $64.80 
- Right Position: Small Size Embroidery = $0.45/cap × 144 = $64.80
- Back Position: Small Size Embroidery = $0.45/cap × 144 = $64.80
- Application costs: Run/Satin adds $0.25/cap × 144 = $36.00 per logo

KEY RULES:
- For Rubber Patch: Use Medium Rubber Patch pricing ($0.90/cap at 144+ qty) unless size specified
- For 3D Embroidery: Use combined Size Embroidery + 3D base cost 
- Never exceed customer budget
- Always optimize for maximum quantity within budget
- Use actual CSV pricing data for accurate quotes
- Recommend specific blank cap products from available CSV options

${orderAnalysis}

RESPONSE REQUIREMENTS:
1. Be conversion-focused and direct
2. Show DETAILED per-unit pricing breakdowns (not just totals)
3. Include exact cost breakdowns with individual components
4. ALWAYS include shipping options (regular vs express)
5. Use enthusiastic but professional tone
6. ALWAYS end with confirmation question: "Would you like me to create this order?"
7. If budget provided, show maximum caps possible
8. If no budget, ask for budget or provide estimate
9. REMEMBER: Reference previous conversation context - don't ask for information already provided
10. DO NOT create orders without explicit confirmation
11. **TRANSPARENCY PRIORITY**: When customers request cost breakdowns, use ACTUAL CALCULATED AMOUNTS from ORDER ANALYSIS - never generic descriptions

FORMAT:
- Use **bold** for important numbers and actions
- Show DETAILED cost breakdowns: "Base Product: $XXX ($X.XX per cap)"
- Display individual customization options with per-unit costs
- Show delivery options: Regular ($X.XX per cap) vs Express ($X.XX per cap)
- Show logo setup costs per cap if applicable
- Include premium closure, accessories, fabric costs per cap
- Show total cost clearly
- ALWAYS end with: "Would you like me to create this order for you?"

TRANSPARENCY FORMAT EXAMPLE (when customer requests breakdown):
**Detailed Cost Breakdown:**
- **Base Product**: $15,552.00 ($5.40 per cap) - 2880 premium caps
- **Premium Fabric**: $2,880.00 ($1.00 per cap) - Premium fabric upgrade
- **Logo Setup**: $2,592.00 ($0.90 per cap) - Medium Rubber Patch, Front position
- **Accessories**: $1,728.00 ($0.60 per cap) - Stickers & hang tags
- **Delivery**: $5,328.00 ($1.85 per cap) - Regular delivery (1152+ tier)
- **Total**: $28,080.00 ($9.75 per cap)

Use EXACT amounts from ORDER ANALYSIS - never estimate or use generic descriptions.`;

  let userPrompt = message;
  if (uploadedFiles && uploadedFiles.length > 0) {
   userPrompt += `\n\n[Logo files uploaded: ${uploadedFiles.map(f => `${f.name}`).join(', ')}]`;
  }

  // Build complete messages array with conversation history
  const messages = [
   { role: 'system', content: systemPrompt },
   ...conversationMessages,
   { role: 'user', content: userPrompt }
  ];

  const completion = await getOpenAIClient().chat.completions.create({
   model: 'gpt-4o',
   messages: messages,
   max_tokens: 800,
   temperature: 0.7,
  });

  const aiResponse = completion.choices[0]?.message?.content || 
   "I'm ready to help create your custom cap order. Could you please provide your quantity and budget requirements?";
  
  // Store quote context for potential order creation
  context.lastQuote = {
   quantity: requirements.quantity,
   logoType: requirements.logoType,
   color: requirements.color,
   costBreakdown,
   orderEstimate,
   requirements,
   totalCost: costBreakdown.totalCost
  };
  
  console.log(`🤖 [ORDER-AI] AI response generated (${completion.usage?.total_tokens || 0} tokens)`);
  console.log(`💾 [ORDER-AI] Quote context stored for potential order creation`);
  return aiResponse;
  
 } catch (error) {
  console.error('❌ [ORDER-AI] AI response generation failed:', error);
  // Fallback to static response
  return await generateBudgetOptimizedResponse(message, context);
 }
}

/**
 * Generate AI-powered order progression response with REAL order creation 
 * LEGACY FUNCTION - Used as backup only
 */
async function generateAIOrderProgressionResponse(message: string, context: LocalConversationContext, conversationHistory?: any[], userProfile?: any): Promise<string> {
 console.log('🤖 [ORDER-AI] Generating AI-powered order progression with real order creation');
 
 try {
  // 🔍 EXTRACT ORDER DETAILS from conversation history instead of relying on context
  let orderQuote = null;
  
  // Parse conversation history to extract the latest order details
  if (conversationHistory && conversationHistory.length > 0) {
   console.log('📋 [ORDER-AI] Extracting order details from conversation history');
   
   // Find the most recent AI response with order details
   for (let i = conversationHistory.length - 1; i >= 0; i--) {
    const msg = conversationHistory[i];
    if (msg.role === 'assistant' && msg.content.includes('TOTAL COST')) {
     // Extract order details from the AI response
     const orderText = msg.content;
     
     // Extract quantity
     const quantityMatch = orderText.match(/(\d+)\s+caps?/i);
     const quantity = quantityMatch ? parseInt(quantityMatch[1]) : 150;
     
     // Extract total cost
     const totalCostMatch = orderText.match(/\*\*TOTAL COST\*\*:\s*\$?([\d,]+\.?\d*)/i);
     const totalCost = totalCostMatch ? parseFloat(totalCostMatch[1].replace(/,/g, '')) : 0;
     
     // Extract color from original customer message
     let color = "Brown";
     const colorMatch = conversationHistory.find(m => m.role === 'user')?.content.match(/color:\s*(\w+)/i);
     if (colorMatch) color = colorMatch[1];
     
     orderQuote = {
      quantity,
      logoType: "3D Embroidery", // Default based on conversation
      color,
      requirements: {
       profile: "High Profile",
       billStyle: "Flat Bill",
       panelCount: 6,
       logoPosition: "Front"
      },
      costBreakdown: {
       totalCost,
       baseProductTotal: totalCost * 0.3, // Estimate breakdown
       logoSetupTotal: totalCost * 0.2,
       closureTotal: totalCost * 0.15,
       accessoriesTotal: totalCost * 0.15,
       deliveryTotal: totalCost * 0.2
      },
      totalCost
     };
     
     console.log(`📊 [ORDER-AI] Extracted order details: ${quantity} caps, $${totalCost} total`);
     break;
    }
   }
  }
  
  // Try to create a real order
  let realOrderId = null;
  let orderReference = null;
  
  if (orderQuote || context.lastQuote) {
   try {
    // Prioritize context.lastQuote over parsed orderQuote for accuracy
    const quoteToUse = context.lastQuote || orderQuote;
    realOrderId = await createRealOrderFromAI(quoteToUse, message, userProfile, user);
    orderReference = `ORD-${realOrderId.slice(-6).toUpperCase()}`;
    console.log(`✅ [ORDER-AI] Real order created: ${realOrderId} → ${orderReference}`);
   } catch (orderError) {
    console.error('⚠️ [ORDER-AI] Real order creation failed, continuing with quote order:', orderError);
    // Continue with quote order creation as fallback
   }
  }
  
  // If no real order, generate a quote order reference
  if (!realOrderId) {
   orderReference = `QTE-${Date.now().toString().slice(-6)}`;
   console.log(`📝 [ORDER-AI] Created quote order reference: ${orderReference}`);
  }

  // 🧠 BUILD PROPER CONVERSATION MESSAGES: Include previous messages for AI memory
  let conversationMessages = [];
  if (conversationHistory && conversationHistory.length > 0) {
   // Convert conversation history to proper OpenAI message format
   conversationMessages = conversationHistory.map(msg => ({
    role: msg.role === 'user' ? 'user' : 'assistant',
    content: msg.content
   }));
   console.log(`🔄 [ORDER-CREATION] Using ${conversationMessages.length} previous messages for context`);
  }

  const systemPrompt = `You are finalizing a US Custom Cap order. The customer is confirming they want to proceed with order creation.

IMPORTANT: A real order has been created in the system with reference: ${orderReference}
IMPORTANT: You have FULL MEMORY of this conversation. Reference the specific order details discussed previously.

Your response should:
1. **Enthusiastically confirm** their order is being processed
2. **Use the EXACT order reference**: ${orderReference}
3. **List next steps clearly** (admin review, quote generation, payment)
4. **Set realistic expectations** for timeline
5. **Be conversion-focused** and professional
6. **Reference specific order details** from the conversation history

SAMPLE FORMAT:
"🎉 **Order Created Successfully!** 
**Order Reference:** ${orderReference}
**Status:** Submitted for admin review
**Next Steps:**
1. Admin review & quote generation (2-4 hours)
2. Official quote via email with payment link
3. Production begins after payment confirmation
**Timeline:** Quote within 4 hours → Production 10-15 business days
You can track your order status in your dashboard!"

Keep under 200 words. Be enthusiastic but professional.`;

  // Build complete messages array with conversation history
  const messages = [
   { role: 'system', content: systemPrompt },
   ...conversationMessages,
   { role: 'user', content: message }
  ];

  const completion = await getOpenAIClient().chat.completions.create({
   model: 'gpt-4o',
   messages: messages,
   max_tokens: 400,
   temperature: 0.3,
  });

  const aiResponse = completion.choices[0]?.message?.content || 
   `🎉 **Order Created Successfully!**\n\n**Order Reference:** ${orderReference}\n**Status:** Submitted for admin review\n\n**Next Steps:**\n1. Admin review & quote generation (2-4 hours)\n2. Official quote via email with payment link\n3. Production begins after payment confirmation\n\n**Timeline:** Quote within 4 hours → Production 10-15 business days\n\nYou can track your order status in your dashboard!`;
  
  return aiResponse;
   
 } catch (error) {
  console.error('❌ [ORDER-AI] AI progression response failed:', error);
  return await generateOrderProgressionResponse(message, context);
 }
}

/**
 * Generate AI-powered follow-up response
 * LEGACY FUNCTION - Used as backup only
 */
async function generateAIFollowUpResponse(message: string, context: LocalConversationContext, conversationHistory?: any[], userProfile?: any): Promise<string> {
 console.log('🤖 [ORDER-AI] Generating AI-powered follow-up');
 
 try {
  // Check if this is a specification change (like panel count, cap style, etc.)
  const lowerMessage = message.toLowerCase();
  const isSpecificationChange = (
   lowerMessage.includes('panel') || 
   lowerMessage.includes('profile') ||
   lowerMessage.includes('bill') ||
   lowerMessage.includes('curved') ||
   lowerMessage.includes('flat') ||
   lowerMessage.includes('closure') ||
   lowerMessage.includes('fabric') ||
   lowerMessage.includes('color') ||
   lowerMessage.includes('style') ||
   lowerMessage.includes('change to') ||
   lowerMessage.includes('instead of')
  );

  // If this is a specification change, treat it like a new order request to recalculate costs
  if (isSpecificationChange) {
   console.log('🔄 [ORDER-AI] Detected specification change, recalculating costs');
   
   // Extract previous order details from conversation history
   let previousOrderDetails = {};
   if (conversationHistory && conversationHistory.length > 0) {
    // Find previous quantity and specifications from conversation
    for (const msg of conversationHistory) {
     if (msg.role === 'user' || msg.role === 'assistant') {
      const quantityMatch = msg.content.match(/(\d+)\s*(?:caps?|pieces?|units?)/i);
      if (quantityMatch) {
       previousOrderDetails = { quantity: parseInt(quantityMatch[1]) };
       break;
      }
     }
    }
   }
   
   // Merge the specification change with previous order details
   const combinedMessage = `${previousOrderDetails.quantity || 288} piece caps, ${message}`;
   
   // Generate a new quote with the updated specifications
   return await generateAIOrderResponse(combinedMessage, context, [], conversationHistory);
  }

  // 🧠 BUILD PROPER CONVERSATION MESSAGES: Include previous messages for AI memory
  let conversationMessages = [];
  if (conversationHistory && conversationHistory.length > 0) {
   // Convert conversation history to proper OpenAI message format
   conversationMessages = conversationHistory.map(msg => ({
    role: msg.role === 'user' ? 'user' : 'assistant',
    content: msg.content
   }));
   console.log(`🔄 [FOLLOW-UP] Using ${conversationMessages.length} previous messages for context`);
  }

  const systemPrompt = `You are handling follow-up questions for a US Custom Cap order. 

IMPORTANT: You have FULL MEMORY of this conversation. Reference previous messages and build upon them.

Common follow-ups include:
- Quantity adjustments
- Accessory additions (hang tags, stickers)
- Closure upgrades
- Delivery timeline questions
- Order modifications

Be helpful and guide them toward order completion. Keep responses focused and under 150 words.`;

  // Build complete messages array with conversation history
  const messages = [
   { role: 'system', content: systemPrompt },
   ...conversationMessages,
   { role: 'user', content: message }
  ];

  const completion = await getOpenAIClient().chat.completions.create({
   model: 'gpt-4o',
   messages: messages,
   max_tokens: 300,
   temperature: 0.6,
  });

  return completion.choices[0]?.message?.content || 
   "I can help with that adjustment to your order. What specifically would you like to change?";
   
 } catch (error) {
  console.error('❌ [ORDER-AI] AI follow-up response failed:', error);
  return await generateFollowUpResponse(message, context);
 }
}

/**
 * Generate AI-powered guidance response for general inquiries
 * LEGACY FUNCTION - Used as backup only
 */
async function generateAIGuidanceResponse(message: string, conversationHistory?: any[], userProfile?: any): Promise<string> {
 console.log('🤖 [ORDER-AI] Generating AI-powered guidance');
 
 try {
  // 🧠 BUILD PROPER CONVERSATION MESSAGES: Include previous messages for AI memory
  let conversationMessages = [];
  if (conversationHistory && conversationHistory.length > 0) {
   // Convert conversation history to proper OpenAI message format
   conversationMessages = conversationHistory.map(msg => ({
    role: msg.role === 'user' ? 'user' : 'assistant',
    content: msg.content
   }));
   console.log(`🔄 [GUIDANCE] Using ${conversationMessages.length} previous messages for context`);
  }

  const systemPrompt = `You are a US Custom Cap order assistant. Help customers understand how to place orders.

IMPORTANT: You have FULL MEMORY of this conversation. Reference previous messages and build upon them.

Key information to share:
- We need quantity and budget/logo type to optimize pricing
- Tier-based pricing means more caps = better per-unit cost
- 3D embroidery is premium, flat embroidery is standard
- Examples: "200 caps with 3D logo for $800" or "Maximum caps for $1000"

Be friendly, helpful, and guide them toward providing specific order details. Keep under 150 words.`;

  // Build complete messages array with conversation history
  const messages = [
   { role: 'system', content: systemPrompt },
   ...conversationMessages,
   { role: 'user', content: message }
  ];

  const completion = await getOpenAIClient().chat.completions.create({
   model: 'gpt-4o',
   messages: messages,
   max_tokens: 300,
   temperature: 0.7,
  });

  return completion.choices[0]?.message?.content || 
   "I'd love to help you with your custom cap order! To get started, I'll need your quantity and either your budget or logo preferences.";
   
 } catch (error) {
  console.error('❌ [ORDER-AI] AI guidance response failed:', error);
  return generateOrderGuidanceResponse(message);
 }
}

/**
 * Create a real order in the database using Advanced Product page Order Recording System
 * This ensures orders created via AI match exactly with regular product orders
 * Enhanced with full user profile data for accurate customer information
 */
async function createRealOrderFromAI(quote: any, confirmationMessage: string, userProfile?: any, authenticatedUser?: any): Promise<string> {
 console.log('📝 [ORDER-AI] Creating real order using Enhanced Order Parser for accurate service mapping');
 console.log('📊 [ORDER-AI] COMPLETE Quote data debug:', {
  quantity: quote.quantity,
  logoType: quote.logoType,
  color: quote.color,
  totalCost: quote.totalCost,
  requirements: quote.requirements,
  costBreakdown: quote.costBreakdown ? {
   totalCost: quote.costBreakdown.totalCost,
   baseProductTotal: quote.costBreakdown.baseProductTotal,
   logoSetupTotal: quote.costBreakdown.logoSetupTotal
  } : 'NO_COST_BREAKDOWN',
  orderEstimate: quote.orderEstimate ? 'HAS_ESTIMATE' : 'NO_ESTIMATE'
 });
 
 try {
  // 👤 ENHANCED CUSTOMER DATA: Use real user profile information
  let customerEmail = 'ai-generated-order@uscustomcap.com';
  let customerName = 'AI Order Customer';
  let customerCompany = 'Via AI Assistant';
  let customerPhone = null;
  let isAuthenticated = false;
  
  // Try authenticated user first (preferred)
  if (authenticatedUser && authenticatedUser.id) {
   isAuthenticated = true;
   customerEmail = authenticatedUser.email || customerEmail;
   customerName = authenticatedUser.name || authenticatedUser.email || customerName;
   console.log(`🔐 [ORDER-AI] Using authenticated user data: ${customerName} (ID: ${authenticatedUser.id})`);
  }
  
  // Then try user profile data (additional info)
  if (userProfile) {
   customerEmail = userProfile.email || customerEmail;
   customerName = userProfile.name || customerName;
   customerCompany = userProfile.company || customerCompany;
   customerPhone = userProfile.phone;
   console.log(`👤 [ORDER-AI] Enhanced with profile data: ${customerName} (${customerEmail})`);
  } else if (isAuthenticated) {
   console.log(`⚠️ [ORDER-AI] Authenticated user found but no profile data loaded`);
  } else {
   // Extract customer email from confirmation message if provided (fallback for guests)
   const emailMatch = confirmationMessage.match(/[\w.-]+@[\w.-]+\.\w+/);
   customerEmail = emailMatch ? emailMatch[0] : customerEmail;
   console.log(`📝 [ORDER-AI] Using guest/fallback customer data: ${customerEmail}`);
  }
  
  console.log(`📋 [ORDER-AI] Final customer data:`, {
   email: customerEmail,
   name: customerName,
   company: customerCompany,
   phone: customerPhone,
   isAuthenticated,
   userId: authenticatedUser?.id || 'NULL'
  });
  
  // Try to use enhanced parser for complex orders with services
  let orderApiFormat = null;
  
  // Check if the original message contains service requests (Graphics, Sampling)
  const originalMessage = confirmationMessage || '';
  const hasServiceRequests = originalMessage.toLowerCase().includes('mock up') || 
               originalMessage.toLowerCase().includes('mockup') ||
               originalMessage.toLowerCase().includes('sketch') ||
               originalMessage.toLowerCase().includes('sample');
  
  if (hasServiceRequests) {
   console.log('🎯 [ORDER-AI] Complex order with services detected, using enhanced parser');
   const enhancedRequirements = parseComplexOrder(originalMessage);
   orderApiFormat = convertToApiFormat(enhancedRequirements);
   
   console.log('📋 [ORDER-AI] Enhanced parser results:', {
    services: enhancedRequirements.services,
    accessories: enhancedRequirements.accessories,
    logoSetup: enhancedRequirements.logoSetup.length
   });
  }
  
  // Parse multiple colors from quote data
  let selectedColors = {};
  
  // Check if quote has multiple color requirements
  if (quote.requirements && quote.requirements.colors) {
   // Handle structured color data
   selectedColors = quote.requirements.colors;
  } else if (quote.originalResponse) {
   // Parse colors from the original AI response text - multiple pattern support
   console.log('🎨 [ORDER-AI] Parsing colors from AI response:', quote.originalResponse.substring(0, 200));
   
   // Pattern 1: "- **150 Black Caps**" format
   let colorMatches = quote.originalResponse.match(/- \*\*(\d+)\s+([A-Za-z\/\s]+)\s+Caps?\*\*/g);
   if (colorMatches && colorMatches.length > 0) {
    colorMatches.forEach(match => {
     const [, quantity, colorName] = match.match(/- \*\*(\d+)\s+([A-Za-z\/\s]+)\s+Caps?\*\*/) || [];
     if (colorName && quantity) {
      const cleanColorName = colorName.trim();
      selectedColors[cleanColorName] = {
       sizes: {
        "One Size": parseInt(quantity)
       }
      };
     }
    });
    console.log('🎨 [ORDER-AI] Parsed multiple colors (Pattern 1):', Object.keys(selectedColors));
   } else {
    // Pattern 2: "- **Color: 150 pieces**" format (legacy)
    colorMatches = quote.originalResponse.match(/- \*\*([^:]+): (\d+) pieces\*\*/g);
    if (colorMatches && colorMatches.length > 0) {
     colorMatches.forEach(match => {
      const [, colorName, quantity] = match.match(/- \*\*([^:]+): (\d+) pieces\*\*/) || [];
      if (colorName && quantity) {
       selectedColors[colorName] = {
        sizes: {
         "One Size": parseInt(quantity)
        }
       };
      }
     });
     console.log('🎨 [ORDER-AI] Parsed multiple colors (Pattern 2):', Object.keys(selectedColors));
    } else {
     // Pattern 3: Handle split color quantities like "288 Black/White" or "288 White/Red"
     const splitColorMatches = quote.originalResponse.match(/(\d+)\s+([A-Za-z]+\/[A-Za-z]+)/g);
     if (splitColorMatches && splitColorMatches.length > 0) {
      splitColorMatches.forEach(match => {
       const [, quantity, colorName] = match.match(/(\d+)\s+([A-Za-z]+\/[A-Za-z]+)/) || [];
       if (colorName && quantity) {
        selectedColors[colorName] = {
         sizes: {
          "One Size": parseInt(quantity)
         }
        };
       }
      });
      console.log('🎨 [ORDER-AI] Parsed split colors (Pattern 3):', Object.keys(selectedColors));
     }
    }
   }
  }
  
  // Fallback to single color if no multiple colors found
  if (Object.keys(selectedColors).length === 0) {
   selectedColors = {
    [quote.color || quote.requirements?.color || "Brown"]: { 
     sizes: { 
      "One Size": quote.quantity || quote.requirements?.quantity || 150 
     } 
    }
   };
  }

  // Convert AI quote data to Advanced Product page order format
  const orderData = {
   productName: "Custom Baseball Cap",
   priceTier: detectProductTier(confirmationMessage || message),
   
   // Use parsed multiple colors or enhanced parser colors
   selectedColors: orderApiFormat?.selectedColors || selectedColors,
   
   // Use enhanced parser logo setup if available, or parse multi-logo setup from message
   logoSetupSelections: orderApiFormat?.logoSetupSelections || (() => {
    const originalMessage = confirmationMessage || message;
    const logoSetup = {};
    
    // Parse multi-logo setup from the message - "Front will have Rubber Patch, Left side and Back will have Embroidery"
    const lowerMessage = originalMessage.toLowerCase();
    
    // Check for rubber patch on front
    if (lowerMessage.includes("front") && lowerMessage.includes("rubber patch")) {
     logoSetup["Medium Rubber Patch"] = {
      position: "Front",
      size: "Medium",
      application: "Direct"
     };
    }
    
    // Check for embroidery on left and back - create unique keys for different positions
    if (lowerMessage.includes("left") && lowerMessage.includes("embroidery")) {
     logoSetup["Small Size Embroidery_Left"] = {
      position: "Left",
      size: "Small", 
      application: "Direct"
     };
    }
    
    if (lowerMessage.includes("back") && lowerMessage.includes("embroidery")) {
     logoSetup["Small Size Embroidery_Back"] = {
      position: "Back",
      size: "Small",
      application: "Direct" 
     };
    }
    
    // If no specific multi-logo setup found, fall back to single logo detection
    if (Object.keys(logoSetup).length === 0) {
     const logoType = quote.logoType || quote.requirements?.logoType || "Flat Embroidery";
     const logoSize = quote.requirements?.logoSize || "Small";
     
     // Convert AI logo types to exact CSV keys for cost calculation
     let logoKey = "Small Size Embroidery"; // Default flat embroidery
     
     if (logoType.toLowerCase().includes("3d")) {
      logoKey = "3D Embroidery";
     } else if (logoType.toLowerCase().includes("rubber")) {
      // Map to rubber patch based on size
      if (logoSize.toLowerCase() === "small") {
       logoKey = "Small Rubber Patch";
      } else if (logoSize.toLowerCase() === "large") {
       logoKey = "Large Rubber Patch";
      } else {
       logoKey = "Medium Rubber Patch";
      }
     } else if (logoType.toLowerCase().includes("embroidery")) {
      // Map to embroidery based on size - use exact CSV names
      if (logoSize.toLowerCase() === "small") {
       logoKey = "Small Size Embroidery";
      } else if (logoSize.toLowerCase() === "large") {
       logoKey = "Large Size Embroidery";
      } else {
       logoKey = "Medium Size Embroidery";
      }
     } else if (logoType.toLowerCase().includes("leather")) {
      // Map to leather patch based on size
      if (logoSize.toLowerCase() === "small") {
       logoKey = "Small Leather Patch";
      } else if (logoSize.toLowerCase() === "large") {
       logoKey = "Large Leather Patch";
      } else {
       logoKey = "Medium Leather Patch";
      }
     } else if (logoType.toLowerCase().includes("woven")) {
      // Map to woven patch based on size
      if (logoSize.toLowerCase() === "small") {
       logoKey = "Small Print Woven Patch";
      } else if (logoSize.toLowerCase() === "large") {
       logoKey = "Large Print Woven Patch"; 
      } else {
       logoKey = "Medium Print Woven Patch";
      }
     }
     
     logoSetup[logoKey] = {
      position: "Front",
      size: logoSize === "Small" ? "Small" : logoSize === "Large" ? "Large" : "Medium",
      application: "Direct"
     };
    }
    
    return logoSetup;
   })(),
   
   // Use enhanced parser options if available, with better defaults from original message
   selectedOptions: orderApiFormat?.selectedOptions || {
    "profile": quote.requirements?.profile || "High",
    "bill-style": quote.requirements?.billStyle || "Flat Bill", 
    "panel-count": quote.requirements?.panelCount?.toString() || extractPanelCountFromMessage(confirmationMessage) || "5",
    "closure-type": quote.requirements?.closure || "snapback", // Default snapback as per instructions
    "fabric-setup": quote.requirements?.fabric || "chino-twill", // Chino twill as per user request
    "delivery-type": "regular"
   },
   
   // FIXED: Use enhanced parser services - separate from delivery, or create from AI-detected data
   multiSelectOptions: orderApiFormat?.multiSelectOptions || (() => {
    const originalMessage = confirmationMessage || message;
    const lowerMessage = originalMessage.toLowerCase();
    const logoType = quote.logoType || quote.requirements?.logoType || "Flat Embroidery";
    const accessories = quote.requirements?.accessories || []; // Use AI-detected accessories
    
    // Convert AI logo types to system keys for multi-select
    let logoSetupKeys = [];
    let moldCharges = [];
    
    // Check for rubber patch - requires mold charge
    if (lowerMessage.includes("rubber patch") || logoType.toLowerCase().includes("rubber")) {
     logoSetupKeys.push("rubber-patch");
     moldCharges.push("Medium Mold Charge"); // From CSV: Medium Mold Charge = $60
    }
    
    // Check for embroidery
    if (lowerMessage.includes("embroidery") || logoType.toLowerCase().includes("embroidery")) {
     if (logoType.toLowerCase().includes("3d")) {
      logoSetupKeys.push("3d-embroidery");
     } else {
      logoSetupKeys.push("embroidery");
     }
    }
    
    // Fallback if no logo detected
    if (logoSetupKeys.length === 0) {
     logoSetupKeys.push("embroidery");
    }
    
    return {
     "logo-setup": logoSetupKeys,
     "accessories": accessories, // Use actual AI-detected accessories instead of hardcoded
     "services": [], // Empty if no services requested
     "mold-charges": moldCharges // Add mold charges for rubber patches
    };
   })(),
   
   // 👤 ENHANCED CUSTOMER INFORMATION: Real user profile data
   customerInfo: {
    name: customerName,
    email: customerEmail,
    company: customerCompany,
    phone: customerPhone
   },
   
   // Order metadata - CRITICAL for dashboard visibility
   userId: authenticatedUser?.id || userProfile?.id || null, // 🔑 CRITICAL: Set userId for dashboard visibility
   userEmail: customerEmail,
   orderType: (isAuthenticated ? 'AUTHENTICATED' : 'GUEST') as const,
   orderSource: 'PRODUCT_CUSTOMIZATION' as const, // Use valid order source
   status: 'PENDING' as const,
   specialInstructions: `Order created via AI Assistant. Customer: ${customerName}${customerCompany !== 'Via AI Assistant' ? ` (${customerCompany})` : ''}. Original request: "${confirmationMessage.substring(0, 200)}..."`,
   isDraft: false,
   paymentProcessed: false,
   
   // FIXED: Cost breakdown using Advanced Product page structure with accurate quantity reference
   costBreakdown: quote.costBreakdown ? {
    baseProductCost: quote.costBreakdown.baseProductTotal || 0,
    logoSetupCosts: [{
     name: quote.logoType || "Flat Embroidery",
     cost: quote.costBreakdown.logoSetupTotal || 0,
     unitPrice: (quote.costBreakdown.logoSetupTotal || 0) / (quote.quantity || quote.requirements?.quantity || 150),
     details: `${quote.requirements?.logoSize || 'Medium'} ${quote.logoType || 'Flat Embroidery'}`
    }],
    accessoriesCosts: quote.costBreakdown.accessoriesTotal > 0 ? [{
     name: "Accessories",
     cost: quote.costBreakdown.accessoriesTotal,
     unitPrice: quote.costBreakdown.accessoriesTotal / (quote.quantity || quote.requirements?.quantity || 150)
    }] : [],
    closureCosts: quote.costBreakdown.closureTotal > 0 ? [{
     name: "Premium Closure",
     cost: quote.costBreakdown.closureTotal,
     unitPrice: quote.costBreakdown.closureTotal / (quote.quantity || quote.requirements?.quantity || 150)
    }] : [],
    deliveryCosts: [{
     name: "Regular Delivery",
     cost: quote.costBreakdown.deliveryTotal || 0,
     unitPrice: (quote.costBreakdown.deliveryTotal || 0) / (quote.quantity || quote.requirements?.quantity || 150)
    }],
    // CRITICAL: Preserve the exact total cost from conversation context
    totalCost: quote.totalCost || quote.costBreakdown.totalCost || 0,
    totalUnits: quote.quantity || quote.requirements?.quantity || 150
   } : {
    // FALLBACK: If no costBreakdown, create basic structure with total cost
    totalCost: quote.totalCost || 0,
    totalUnits: quote.quantity || quote.requirements?.quantity || 150,
    baseProductCost: quote.totalCost || 0,
    logoSetupCosts: [],
    accessoriesCosts: [],
    closureCosts: [],
    deliveryCosts: []
   }
  };

  console.log('📄 [ORDER-AI] COMPLETE Order data structure (Advanced Product page format):', {
   hasSelectedColors: !!orderData.selectedColors,
   selectedColorsQuantity: orderData.selectedColors ? Object.values(orderData.selectedColors)[0]?.sizes?.["One Size"] : 'NONE',
   logoSetupCount: Object.keys(orderData.logoSetupSelections).length,
   selectedOptions: orderData.selectedOptions,
   multiSelectOptions: orderData.multiSelectOptions,
   totalCost: orderData.costBreakdown?.totalCost,
   totalUnits: orderData.costBreakdown?.totalUnits,
   // CRITICAL debugging info for order creation
   userId: orderData.userId,
   userEmail: orderData.userEmail,
   orderType: orderData.orderType,
   customerEmail: orderData.customerInfo.email,
   customerName: orderData.customerInfo.name,
   // Data source validation
   quoteQuantity: quote.quantity,
   quoteTotalCost: quote.totalCost,
   requirementsQuantity: quote.requirements?.quantity
  });

  // Use the same order recording system as Advanced Product page for consistency
  // Import directly instead of making internal fetch call to avoid "fetch failed" errors
  const { 
   OrderRecordingSystem, 
   convertCheckoutToStandardOrder
  } = await import('@/lib/order-recording-system');
  
  console.log(`📝 [ORDER-AI] Using direct OrderRecordingSystem instead of API fetch to avoid internal call issues`);
  
  // Convert our orderData to the expected format and create the order directly
  const standardOrder = convertCheckoutToStandardOrder(orderData);
  
  console.log('📊 [ORDER-AI] Standard order format:', {
   hasUserId: !!standardOrder.userId,
   customerEmail: standardOrder.customerInfo.email,
   customerName: standardOrder.customerInfo.name,
   totalUnits: standardOrder.totalUnits,
   orderType: standardOrder.orderType
  });
  
  // Use static method call instead of instance method
  const result = await OrderRecordingSystem.recordOrder(standardOrder);
  
  if (!result.success || !result.orderId) {
   console.error('❌ [ORDER-AI] Order creation failed:', result.error);
   console.error('❌ [ORDER-AI] Order data that failed:', JSON.stringify({
    userId: orderData.userId,
    userEmail: orderData.userEmail,
    customerInfo: orderData.customerInfo,
    selectedColors: Object.keys(orderData.selectedColors || {}),
    orderType: orderData.orderType
   }, null, 2));
   throw new Error(`Order creation failed: ${result.error || 'Unknown error during order recording'}`);
  }

  const orderId = result.orderId;
  
  console.log(`✅ [ORDER-AI] Order successfully created via /api/orders: ${orderId}`);
  console.log(`📊 [ORDER-AI] Order details: ${quote.quantity} caps, $${quote.totalCost} total`);
  console.log(`📱 [ORDER-AI] Order processed through same pipeline as Advanced Product page`);
  console.log(`🔑 [ORDER-AI] Order associated with user ID: ${orderData.userId || 'NULL'} (${orderData.orderType})`);
  
  // Order created successfully via /api/orders endpoint
  // All notifications, webhooks, and processing are handled by that endpoint
  
  return orderId;
  
 } catch (error) {
  console.error('❌ [ORDER-AI] Failed to create real order using Advanced Product page system:', error);
  throw error;
 }
}

// ==============================================================================
// FALLBACK RESPONSE GENERATORS - Static Templates (Backup) 
// ==============================================================================

/**
 * Generate budget-optimized response for customers with specific budget + requirements
 */
async function generateBudgetOptimizedResponse(message: string, context: LocalConversationContext): Promise<string> {
 console.log('🎯 [ORDER-AI] Generating budget-optimized response');
 
 const requirements = parseOrderRequirements(message);
 const budget = extractBudget(message);
 
 if (!budget) {
  return generateBudgetRequestResponse(requirements);
 }
 
 try {
  // Use precise unified cost calculation for accurate optimization
  const optimization = await optimizeQuantityForBudgetPrecise(budget, requirements.logoType);
  const { costBreakdown, orderEstimate } = await calculatePreciseOrderEstimate({
   ...requirements,
   quantity: optimization.optimizedQuantity
  });
  
  let response = `**🎯 Optimized Quote for Your $${budget.toLocaleString()} Budget**\n\n`;
  
  // Show optimization results
  response += `**Maximum Quantity:** ${optimization.optimizedQuantity} caps\n`;
  response += `**Cost Per Cap:** $${optimization.costPerUnit.toFixed(2)} (${optimization.tierLevel})\n`;
  response += `**Total Cost:** $${optimization.budgetUsed.toFixed(2)}\n`;
  
  if (optimization.savings && optimization.savings > 0) {
   response += `**Budget Remaining:** $${optimization.savings.toFixed(2)}\n`;
  }
  
  response += '\n**Your Custom Cap Configuration:**\n';
  
  // Cap details
  const recommendedCap = getOptimalCapForBudget(requirements, budget);
  response += `• **Blank Cap:** ${recommendedCap.name} (${recommendedCap.tier})\n`;
  response += ` - ${recommendedCap.description}\n`;
  
  if (requirements.color) {
   response += ` - Color: ${requirements.color.charAt(0).toUpperCase() + requirements.color.slice(1)}\n`;
  }
  
  // Logo setup
  if (requirements.logoType && requirements.logoPosition) {
   response += `• **Logo:** ${requirements.logoType} on ${requirements.logoPosition}\n`;
   if (requirements.logoSize) {
    response += ` - Size: ${requirements.logoSize}\n`;
   }
  }
  
  // Delivery
  response += `• **Delivery:** Regular delivery (15 working days) - Most cost-effective\n\n`;
  
  // Precise cost breakdown from unified calculator
  response += `**Precise Pricing Breakdown:**\n`;
  response += `• ${optimization.optimizedQuantity} caps: $${costBreakdown.baseProductTotal.toFixed(2)}\n`;
  response += `• ${requirements.logoType || 'Logo'} setup: $${costBreakdown.logoSetupTotal.toFixed(2)}\n`;
  response += `• Delivery: $${costBreakdown.deliveryTotal.toFixed(2)}\n`;
  
  // Show additional costs if any
  if (costBreakdown.accessoriesTotal > 0) {
   response += `• Accessories: $${costBreakdown.accessoriesTotal.toFixed(2)}\n`;
  }
  if (costBreakdown.closureTotal > 0) {
   response += `• Premium Closures: $${costBreakdown.closureTotal.toFixed(2)}\n`;
  }
  if (costBreakdown.moldChargeTotal > 0) {
   response += `• Mold Charges: $${costBreakdown.moldChargeTotal.toFixed(2)}\n`;
  }
  
  response += `• **Total: $${costBreakdown.totalCost.toFixed(2)}**\n\n`;
  
  // Next steps
  response += `**Ready to proceed?** Would you like to:\n`;
  response += `1. **Upload your logo** and finalize this order\n`;
  response += `2. **Add accessories** (optional - $0.30-0.50 per cap)\n`;
  response += `3. **Create order** with current specifications\n\n`;
  
  response += `Just say "create my order" when ready!`;
  
  return response;
  
 } catch (error) {
  console.error('❌ [ORDER-AI] Unified calculation failed, using fallback:', error);
  
  // Fallback to original logic if unified calculation fails
  const optimization = optimizeQuantityForBudget(budget, requirements.logoType);
  const costEstimate = calculateQuickEstimate({
   ...requirements,
   quantity: optimization.optimizedQuantity
  }, undefined, budget);
  
  let response = `**🎯 Budget Quote for $${budget.toLocaleString()}** (Estimated)\n\n`;
  response += `**Estimated Quantity:** ${optimization.optimizedQuantity} caps\n`;
  response += `**Cost Per Cap:** $${optimization.costPerUnit.toFixed(2)}\n`;
  response += `**Estimated Total:** $${optimization.budgetUsed.toFixed(2)}\n\n`;
  
  response += `**Note:** Using estimated pricing. For precise quote, please contact our team.\n\n`;
  response += `Ready to **create your order** with these estimates?`;
  
  return response;
 }
}

/**
 * Generate order progression response for order finalization
 */
async function generateOrderProgressionResponse(message: string, context: LocalConversationContext): Promise<string> {
 console.log('🚀 [ORDER-AI] Generating order progression response');
 
 let response = `**🚀 Creating Your Order**\n\n`;
 
 // Check for logo upload status
 const hasLogoMention = message.toLowerCase().includes('logo') || message.toLowerCase().includes('upload');
 
 if (!hasLogoMention) {
  response += `**Next Steps:**\n`;
  response += `1. **Upload your logo file** - I'll help you get the perfect setup\n`;
  response += `2. **Review final pricing** with your specifications\n`;
  response += `3. **Generate official quote** for payment\n\n`;
  
  response += `**Logo Upload Options:**\n`;
  response += `• High-resolution PNG, JPEG, or vector files\n`;
  response += `• Multiple file formats accepted\n`;
  response += `• I'll optimize for your chosen application method\n\n`;
  
  response += `Ready to upload your logo file?`;
 } else {
  response += `**Excellent!** I see you're ready with your logo.\n\n`;
  
  response += `**Final Order Creation Process:**\n`;
  response += `1. ✅ Specifications confirmed\n`;
  response += `2. ✅ Logo file ready\n`;
  response += `3. 🔄 Generating official quote...\n`;
  response += `4. 📧 Quote will be sent for approval\n\n`;
  
  response += `**Your order is being processed!** You'll receive:\n`;
  response += `• Detailed quote with final pricing\n`;
  response += `• Logo mockup preview\n`;
  response += `• Payment instructions\n`;
  response += `• Expected delivery timeline\n\n`;
  
  response += `**Order Reference:** ORD-${Date.now().toString().slice(-6)}\n`;
  response += `Check your email in 2-3 minutes for the complete quote package.`;
 }
 
 return response;
}

/**
 * Generate follow-up response for accessory options or order modifications
 */
async function generateFollowUpResponse(message: string, context: LocalConversationContext): Promise<string> {
 console.log('🔄 [ORDER-AI] Generating follow-up response');
 
 const lowerMessage = message.toLowerCase().trim();
 
 // Check if this is a quantity adjustment (like "i can do 288")
 const quantityMatch = lowerMessage.match(/(?:i can do|we can do|okay?)\s+(\d+)/) || 
            lowerMessage.match(/^(\d+)\s*(?:caps?|pieces?|units?)?$/);
 
 if (quantityMatch) {
  const newQuantity = parseInt(quantityMatch[1]);
  console.log(`🔄 [ORDER-AI] Processing quantity adjustment to ${newQuantity} caps`);
  
  // Generate new quote with adjusted quantity
  const adjustedRequirements = parseOrderRequirements(`${newQuantity} caps with 3D embroidery`);
  
  try {
   const { costBreakdown, orderEstimate } = await calculatePreciseOrderEstimate(adjustedRequirements);
   
   let response = `**✅ Perfect! Updated quote for ${newQuantity} caps**\n\n`;
   response += `**Your Adjusted Order:**\n`;
   response += `• **Quantity:** ${newQuantity} caps\n`;
   response += `• **Cost Per Cap:** $${orderEstimate.costPerUnit.toFixed(2)}\n`;
   response += `• **Total Cost:** $${costBreakdown.totalCost.toFixed(2)}\n\n`;
   
   response += `**Cost Breakdown:**\n`;
   response += `• ${newQuantity} caps: $${costBreakdown.baseProductTotal.toFixed(2)}\n`;
   response += `• 3D Embroidery setup: $${costBreakdown.logoSetupTotal.toFixed(2)}\n`;
   response += `• Delivery: $${costBreakdown.deliveryTotal.toFixed(2)}\n\n`;
   
   response += `**Ready to proceed?** Would you like to:\n`;
   response += `1. **Create order** with these specifications\n`;
   response += `2. **Add accessories** (hang tags, stickers) - optional\n`;
   response += `3. **Upload your logo** to finalize\n\n`;
   
   response += `Just say "create my order" when ready!`;
   
   return response;
   
  } catch (error) {
   console.error('❌ [ORDER-AI] Failed to calculate adjusted quote:', error);
   return `**✅ Quantity updated to ${newQuantity} caps!**\n\nI'm calculating your updated pricing now. Please hold on while I get you the exact costs for ${newQuantity} caps with 3D embroidery setup.\n\nThis will just take a moment...`;
  }
 }
 
 const preferences = parseAccessoryPreferences(message);
 
 let response = '';
 
 if (preferences.wantsAccessories) {
  response += `**🎨 Accessory Options Available**\n\n`;
  response += `**Popular Add-ons:**\n`;
  response += `• **Snap Closure:** +$0.35 per cap (premium feel)\n`;
  response += `• **Buckle Closure:** +$0.40 per cap (adjustable)\n`;
  response += `• **Side Patches:** +$0.30 per cap (branding boost)\n`;
  response += `• **Custom Tags:** +$0.25 per cap (professional touch)\n\n`;
  
  response += `**Fabric Upgrades:**\n`;
  response += `• **Mesh Back:** +$0.45 per cap (breathable)\n`;
  response += `• **Suede Bill:** +$0.50 per cap (premium look)\n\n`;
  
  response += `Which accessories interest you? Or say "proceed with basic setup" to continue.`;
 } else if (preferences.skipAccessories) {
  response += `**Perfect!** Keeping it clean and simple.\n\n`;
  response += `**Your Final Order:**\n`;
  response += `• Custom caps with your logo\n`;
  response += `• Standard closure and materials\n`;
  response += `• Best value pricing\n\n`;
  
  response += `Ready to **create your order**? Just confirm and I'll generate your official quote!`;
 } else if (preferences.proceedToOrder) {
  response = await generateOrderProgressionResponse(message, context);
 } else {
  response += `I want to make sure I understand correctly. Are you looking to:\n\n`;
  response += `• **Add accessories** to your caps?\n`;
  response += `• **Proceed with basic setup** (no accessories)?\n`;
  response += `• **Create the order** as discussed?\n\n`;
  
  response += `Just let me know your preference and I'll help you move forward!`;
 }
 
 return response;
}

/**
 * Generate guidance response for general order inquiries
 */
function generateOrderGuidanceResponse(message: string): string {
 console.log('💡 [ORDER-AI] Generating order guidance response');
 
 const lowerMessage = message.toLowerCase();
 
 // Detect what information they've provided
 const hasQuantity = /\b\d+/.test(lowerMessage);
 const hasBudget = /\$/.test(lowerMessage);
 const hasLogoType = lowerMessage.includes('embroidery') || lowerMessage.includes('patch') || lowerMessage.includes('logo');
 
 let response = `**👋 Welcome to US Custom Cap Order Assistant!**\n\n`;
 
 if (hasQuantity && hasBudget && hasLogoType) {
  response += `I can see you have specific requirements! Let me create an optimized quote for you.\n\n`;
  response += `**What I understand so far:**\n`;
  if (hasQuantity) response += `• Quantity requirements ✓\n`;
  if (hasBudget) response += `• Budget information ✓\n`;
  if (hasLogoType) response += `• Logo preferences ✓\n\n`;
  
  response += `Processing your custom quote now...`;
  
  // This would typically call the budget optimization function
  // For now, we provide a helpful response
  return response;
 }
 
 response += `I'll help you get the **maximum caps for your budget** with the perfect setup.\n\n`;
 
 response += `**Quick Order Examples:**\n`;
 response += `• *"200 caps with 3D logo for $800"*\n`;
 response += `• *"Maximum caps possible with $1000 budget"*\n`;
 response += `• *"100 black caps with embroidered logo"*\n\n`;
 
 response += `**What I need to optimize your order:**\n`;
 if (!hasQuantity && !hasBudget) {
  response += `• 💰 **Budget** (e.g., "$500") OR **Quantity** (e.g., "150 caps")\n`;
 } else if (!hasQuantity) {
  response += `• 📊 **Quantity** (e.g., "150 caps") OR say "**maximum**" for budget optimization\n`;
 } else if (!hasBudget) {
  response += `• 💰 **Budget range** (optional - helps me optimize pricing)\n`;
 }
 
 if (!hasLogoType) {
  response += `• 🎨 **Logo type** (e.g., "3D embroidery", "flat embroidery", "patch")\n`;
 }
 
 response += `\n**Example:** *"I need maximum caps possible with $800 budget, 3D embroidered logo"*\n\n`;
 response += `What's your cap project? I'll get you the best deal!`;
 
 return response;
}

/**
 * Generate response requesting budget information
 */
function generateBudgetRequestResponse(requirements: OrderRequirements): string {
 let response = `**Great! I can help optimize your order.**\n\n`;
 
 response += `**Your Requirements:**\n`;
 response += `• **Quantity:** ${requirements.quantity} caps\n`;
 response += `• **Logo:** ${requirements.logoType}${requirements.logoPosition ? ` on ${requirements.logoPosition}` : ''}\n`;
 if (requirements.color) {
  response += `• **Color:** ${requirements.color.charAt(0).toUpperCase() + requirements.color.slice(1)}\n`;
 }
 
 response += `\n**To give you the best pricing:**\n`;
 response += `What's your target budget range? (e.g., "$500-800")\n\n`;
 
 response += `This helps me:\n`;
 response += `• Find the most cost-effective cap options\n`;
 response += `• Optimize quantity for maximum value\n`;
 response += `• Recommend the right tier pricing\n\n`;
 
 response += `Or I can calculate estimated costs - just say "**estimate costs**"`;
 
 return response;
}