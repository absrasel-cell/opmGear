/**
 * NEXT-GENERATION ORDER CREATION API V2
 * 
 * REVOLUTIONARY ARCHITECTURE: Backend does ALL calculations, AI only formats
 * 
 * FLOW:
 * 1. Parse customer request to extract order requirements
 * 2. Use backend pricing calculator for 100% accurate calculations
 * 3. Send pre-calculated structured data to AI for formatting only
 * 4. AI formats the data into professional customer message (NO MATH)
 * 
 * This eliminates AI calculation errors and ensures production-ready accuracy.
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { ConversationService } from '@/lib/conversation';
import { AI_ASSISTANTS, formatAssistantResponse } from '@/lib/ai-assistants-config';
import { calculateOrderPricing, formatPricingForAI, OrderRequest } from '@/lib/pricing-calculator';
import { v4 as uuidv4 } from 'uuid';

interface OrderCreationRequestV2 {
  message: string;
  intent: string;
  conversationHistory: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
  userProfile?: any;
  conversationId?: string;
  sessionId?: string;
  attachedFiles?: string[];
}

/**
 * Parse customer message to extract order requirements
 * This uses AI for parsing (which it's good at) but not for calculations
 */
async function parseOrderRequirements(message: string, conversationHistory: any[], imageAnalysis?: any): Promise<OrderRequest> {
  console.log('🔍 [PARSE] Extracting order requirements from customer message...');
  
  // Simple parsing logic for now - can be enhanced with AI parsing if needed
  const quantityMatch = message.match(/(\d+)\s*(?:pieces?|caps?|hats?)/i);
  const quantity = quantityMatch ? parseInt(quantityMatch[1]) : 288; // Default quantity
  
  // Extract product description
  const productDescription = extractProductDescription(message);
  
  // Extract fabric selections
  const fabricSelections = extractFabricSelections(message);
  
  // Extract logo selections
  const logoSelections = extractLogoSelections(message, imageAnalysis);
  
  // Extract accessory selections
  const accessorySelections = extractAccessorySelections(message);
  
  // Extract closure selection
  const closureSelection = extractClosureSelection(message);
  
  // Extract delivery method
  const deliveryMethod = extractDeliveryMethod(message);
  
  const orderRequest: OrderRequest = {
    quantity,
    productDescription,
    fabricSelections,
    logoSelections,
    accessorySelections,
    closureSelection,
    deliveryMethod
  };
  
  console.log('📋 [PARSE] Extracted order requirements:', {
    quantity: orderRequest.quantity,
    product: orderRequest.productDescription,
    fabrics: orderRequest.fabricSelections.length,
    logos: orderRequest.logoSelections.length,
    accessories: orderRequest.accessorySelections.length,
    closure: orderRequest.closureSelection,
    delivery: orderRequest.deliveryMethod
  });
  
  return orderRequest;
}

/**
 * Extract product description from message
 */
function extractProductDescription(message: string): string {
  const lowerMessage = message.toLowerCase();
  
  // Look for panel count
  if (lowerMessage.includes('7') && (lowerMessage.includes('panel') || lowerMessage.includes('crown'))) {
    return '7-Panel Elite Seven with structured design';
  }
  if (lowerMessage.includes('6') && lowerMessage.includes('panel')) {
    if (lowerMessage.includes('curved')) return '6-Panel Heritage 6C with curved bill';
    return '6-Panel ProFit Six with slight curved bill';
  }
  if (lowerMessage.includes('5') && lowerMessage.includes('panel')) {
    if (lowerMessage.includes('curved')) return '5-Panel Heritage Five with curved bill';
    return '5-Panel Urban Classic with flat bill';
  }
  
  // Default to popular style
  return '6-Panel Heritage 6C with curved bill';
}

/**
 * Extract fabric selections from message
 */
function extractFabricSelections(message: string): string[] {
  const fabrics: string[] = [];
  const lowerMessage = message.toLowerCase();
  
  // Check for dual fabrics
  if (lowerMessage.includes('polyester') && lowerMessage.includes('laser cut')) {
    fabrics.push('Polyester', 'Laser Cut');
  } else {
    // Check individual fabrics
    if (lowerMessage.includes('laser cut')) fabrics.push('Laser Cut');
    if (lowerMessage.includes('polyester')) fabrics.push('Polyester');
    if (lowerMessage.includes('acrylic')) fabrics.push('Acrylic');
    if (lowerMessage.includes('suede cotton')) fabrics.push('Suede Cotton');
    if (lowerMessage.includes('air mesh')) fabrics.push('Air Mesh');
  }
  
  // Default to free fabric if none specified
  if (fabrics.length === 0) {
    fabrics.push('Cotton Twill');
  }
  
  return fabrics;
}

/**
 * Extract logo selections from message
 */
function extractLogoSelections(message: string, imageAnalysis?: any): Array<{ name: string; size: string; application: string; description: string }> {
  const logos: Array<{ name: string; size: string; application: string; description: string }> = [];
  const lowerMessage = message.toLowerCase();
  
  // Use image analysis if available
  if (imageAnalysis?.results?.[0]?.analysis) {
    const analysis = imageAnalysis.results[0].analysis;
    logos.push({
      name: analysis.recommendedMethod || '3D Embroidery',
      size: analysis.recommendedSize || 'Large',
      application: 'Direct',
      description: `${analysis.recommendedMethod || '3D Embroidery'} on ${analysis.recommendedPosition || 'Front'}`
    });
  } else {
    // Parse from text
    if (lowerMessage.includes('3d embroidery') || lowerMessage.includes('embroidery')) {
      logos.push({
        name: '3D Embroidery',
        size: lowerMessage.includes('large') ? 'Large' : lowerMessage.includes('small') ? 'Small' : 'Large',
        application: 'Direct',
        description: '3D Embroidery on Front'
      });
    }
    
    if (lowerMessage.includes('rubber patch')) {
      logos.push({
        name: 'Rubber',
        size: lowerMessage.includes('large') ? 'Large' : lowerMessage.includes('small') ? 'Small' : 'Large',
        application: 'Patch',
        description: 'Rubber Patch on Front'
      });
    }
    
    if (lowerMessage.includes('leather patch')) {
      logos.push({
        name: 'Leather',
        size: lowerMessage.includes('large') ? 'Large' : lowerMessage.includes('small') ? 'Small' : 'Large',
        application: 'Patch',
        description: 'Leather Patch on Front'
      });
    }
  }
  
  // Default logo if none specified
  if (logos.length === 0) {
    logos.push({
      name: '3D Embroidery',
      size: 'Large',
      application: 'Direct',
      description: '3D Embroidery on Front'
    });
  }
  
  return logos;
}

/**
 * Extract accessory selections from message
 */
function extractAccessorySelections(message: string): string[] {
  const accessories: string[] = [];
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('brand label')) accessories.push('Brand Label');
  if (lowerMessage.includes('main label')) accessories.push('Main Label');
  if (lowerMessage.includes('size label')) accessories.push('Size Label');
  if (lowerMessage.includes('hang tag')) accessories.push('Hang Tag Label');
  if (lowerMessage.includes('b-tape print')) accessories.push('B-Tape Print');
  
  return accessories;
}

/**
 * Extract closure selection from message
 */
function extractClosureSelection(message: string): string | undefined {
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('fitted')) return 'Fitted';
  if (lowerMessage.includes('flexfit')) return 'Flexfit';
  if (lowerMessage.includes('buckle')) return 'Buckle';
  if (lowerMessage.includes('stretched')) return 'Stretched';
  
  // Default to Snapback (free)
  return undefined;
}

/**
 * Extract delivery method from message
 */
function extractDeliveryMethod(message: string): string {
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('express') || lowerMessage.includes('rush')) return 'Express Delivery';
  if (lowerMessage.includes('overnight')) return 'Overnight Delivery';
  
  return 'Regular Delivery';
}

/**
 * Generate AI prompt for formatting pre-calculated pricing data
 * This prompt explicitly tells AI to NOT calculate anything
 */
function generateAIFormattingPrompt(formattedPricingData: any, customerMessage: string): string {
  return `You are a professional customer service representative for US Custom Cap. Your ONLY job is to format pre-calculated pricing data into a professional customer message.

🚨 CRITICAL: You MUST NOT perform any calculations. All prices are pre-calculated by our backend system and are 100% correct.

CUSTOMER REQUEST: "${customerMessage}"

PRE-CALCULATED PRICING DATA (DO NOT RECALCULATE):
${JSON.stringify(formattedPricingData, null, 2)}

YOUR TASK:
1. Create a professional, friendly response acknowledging the customer's request
2. Use the provided formattedLine values EXACTLY as given
3. Structure the pricing breakdown clearly with sections:
   - Product Details
   - Pricing Breakdown (use the provided formattedLine values)
   - Subtotals (use the provided formattedLine values)
   - Total
4. Add appropriate next steps and call to action

CRITICAL RULES:
- Use formattedLine values EXACTLY as provided
- DO NOT perform any calculations
- DO NOT modify any prices
- DO NOT recalculate quantities or totals
- The backend has already handled all complex pricing logic

Return your response as a JSON object with:
{
  "message": "Your formatted customer message here",
  "quoteData": {
    "quantity": ${formattedPricingData.orderSummary.quantity},
    "total": ${formattedPricingData.orderSummary.grandTotal}
  },
  "actions": ["save_quote", "create_order", "modify_specs"]
}`;
}

export async function POST(request: NextRequest) {
  try {
    const body: OrderCreationRequestV2 = await request.json();
    const { message, intent, conversationHistory, userProfile, conversationId, sessionId, attachedFiles } = body;

    if (!message?.trim() && (!attachedFiles || attachedFiles.length === 0)) {
      return NextResponse.json(
        { error: 'Message or attached files are required' },
        { status: 400 }
      );
    }

    console.log('🚀 [ORDER-V2] === STARTING NEXT-GEN ORDER PROCESSING ===');
    console.log('📝 [ORDER-V2] Customer message:', message.substring(0, 200));

    // Handle image analysis if files are attached
    let imageAnalysisData = null;
    if (attachedFiles && attachedFiles.length > 0) {
      try {
        console.log('🔍 [ORDER-V2] Processing image analysis...');
        const analysisResponse = await fetch(`${request.nextUrl.origin}/api/support/image-analysis`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageUrls: attachedFiles,
            analysisType: 'logo'
          })
        });

        if (analysisResponse.ok) {
          imageAnalysisData = await analysisResponse.json();
          console.log('✅ [ORDER-V2] Image analysis completed');
        }
      } catch (error) {
        console.error('❌ [ORDER-V2] Image analysis error:', error);
        // Continue without image analysis
      }
    }

    // STEP 1: Parse order requirements from customer message
    console.log('🔍 [ORDER-V2] Step 1: Parsing order requirements...');
    const orderRequest = await parseOrderRequirements(message, conversationHistory, imageAnalysisData);

    // STEP 2: Calculate pricing using backend calculator (100% accurate)
    console.log('💰 [ORDER-V2] Step 2: Calculating pricing with backend calculator...');
    const pricingBreakdown = await calculateOrderPricing(orderRequest);

    // STEP 3: Format pricing data for AI consumption
    console.log('📝 [ORDER-V2] Step 3: Formatting pricing data for AI...');
    const formattedPricingData = formatPricingForAI(pricingBreakdown);

    // STEP 4: Use AI to format the pre-calculated data (NO MATH)
    console.log('🤖 [ORDER-V2] Step 4: Using AI for formatting only...');
    const aiPrompt = generateAIFormattingPrompt(formattedPricingData, message);
    
    const quoteMaster = AI_ASSISTANTS.QUOTE_MASTER;
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: quoteMaster.model,
        messages: [
          { role: 'user', content: aiPrompt }
        ],
        temperature: 0.1, // Low temperature for consistent formatting
        max_tokens: 2000,
        response_format: { type: 'json_object' }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [ORDER-V2] AI formatting error:', response.status, errorText);
      throw new Error(`AI formatting error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No response from AI formatting service');
    }

    // Parse AI response
    let orderResponse;
    try {
      orderResponse = JSON.parse(content);
    } catch (error) {
      console.error('❌ [ORDER-V2] JSON parsing error:', error);
      throw new Error('Failed to parse AI formatting response');
    }

    // STEP 5: Store conversation and return result
    console.log('💾 [ORDER-V2] Step 5: Storing conversation...');
    
    // Save conversation
    const finalConversationId = conversationId || uuidv4();
    
    await ConversationService.addMessage(finalConversationId, {
      role: 'user',
      content: message,
      metadata: {
        sessionId: sessionId || uuidv4(),
        userId: userProfile?.id,
        attachments: attachedFiles
      }
    });

    await ConversationService.addMessage(finalConversationId, {
      role: 'assistant',
      content: orderResponse.message,
      metadata: {
        sessionId: sessionId || uuidv4(),
        userId: userProfile?.id,
        intent: intent,
        quoteData: orderResponse.quoteData,
        actions: orderResponse.actions,
        pricingBreakdown: pricingBreakdown, // Store complete pricing data
        calculationMethod: 'backend-calculator-v2'
      }
    });

    console.log('🎉 [ORDER-V2] === ORDER PROCESSING COMPLETE ===');
    console.log(`💰 [ORDER-V2] Final total: $${pricingBreakdown.grandTotal.toFixed(2)} for ${pricingBreakdown.quantity} pieces`);

    // Return formatted response
    return NextResponse.json(
      formatAssistantResponse({
        ...orderResponse,
        conversationId: finalConversationId,
        calculationMethod: 'backend-calculator-v2'
      }, 'QUOTE_MASTER')
    );

  } catch (error) {
    console.error('❌ [ORDER-V2] CRITICAL ERROR:', error);
    return NextResponse.json(
      { 
        error: 'Order processing failed',
        details: error.message,
        fallbackMessage: "I encountered an error processing your order. Let me connect you with our team for immediate assistance."
      },
      { status: 500 }
    );
  }
}