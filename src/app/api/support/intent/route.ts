import { NextRequest, NextResponse } from 'next/server';
import { ConversationService } from '@/lib/conversation';
import { AI_ASSISTANTS, getAssistantByIntent } from '@/lib/ai-assistants-config';

interface IntentRequest {
 message: string;
 conversationHistory: Array<{
  role: 'user' | 'assistant' | 'system';
  content: string;
 }>;
 conversationId?: string;
 sessionId?: string;
}

interface IntentResponse {
 intent: string;
 assistant: {
  id: string;
  name: string;
  displayName: string;
  color: string;
  colorHex: string;
  icon: string;
  specialty: string;
 };
 model: string;
 confidence: number;
 reasoning: string;
}

export async function POST(request: NextRequest) {
 try {
  const body: IntentRequest = await request.json();
  const { message, conversationHistory, conversationId, sessionId } = body;

  if (!message?.trim()) {
   return NextResponse.json(
    { error: 'Message is required' },
    { status: 400 }
   );
  }

  // Special handling for explicit quote requests and artwork analysis - force ORDER_CREATION intent
  const explicitQuotePatterns = [
    /artwork analysis/i,
    /cap specifications/i,
    /create\s+(me\s+)?a?\s*quote\s+for/i,
    /\d+\s+pieces?\s*[,.]?\s*\w+\s+fabric/i,  // "144 piece, Acrylic fabric"
    /quote\s+for\s+\d+/i,
    /\d+\s+piece.*with.*embroidery/i,
    /\d+\s+caps?\s*[,.]?\s*\w+\s*\/\s*\w+/i,  // "144 caps, Red/White"
  ];

  const hasExplicitQuotePattern = explicitQuotePatterns.some(pattern => pattern.test(message));

  if (hasExplicitQuotePattern) {
   return NextResponse.json({
    intent: 'ORDER_CREATION',
    assistant: {
     id: 'quote-master',
     name: 'CapCraft AI',
     displayName: 'CapCraft AI 💎',
     color: 'emerald',
     colorHex: '#10b981',
     icon: '💎',
     specialty: 'Order Creation Specialist'
    },
    model: 'gpt-4o-mini',
    confidence: 0.95,
    reasoning: 'Explicit quote request pattern detected - routing to CapCraft AI for quote generation'
   });
  }

  // Create context from conversation history - use database if available, fallback to client
  let fullConversationContext = '';
  if (conversationId) {
   try {
    // Get comprehensive conversation history from database (last 10 messages)
    const dbHistory = await ConversationService.getConversationHistory(conversationId, 10);
    if (dbHistory.length > 0) {
     fullConversationContext = dbHistory
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n');
    }
   } catch (error) {
    console.warn('Failed to load conversation history from database:', error);
   }
  }
  
  // Fallback to client-provided conversation history if database context is empty
  const historyArray = conversationHistory || [];
  const conversationContext = fullConversationContext || historyArray
   .slice(-5) // Last 5 messages for context (increased from 3)
   .map(msg => `${msg.role}: ${msg.content}`)
   .join('\n');

  // IntentRouter AI system prompt for intent detection with assistant routing
  const intentRouter = AI_ASSISTANTS.INTENT_ROUTER;
  const systemPrompt = `You are ${intentRouter.displayName} ${intentRouter.icon}, the ${intentRouter.specialty} specialist for US Custom Cap's support center.

Your job is to analyze customer messages and route them to the appropriate specialist AI:

🎯 ROUTING DESTINATIONS:
1. CapCraft AI 💎 (ORDER_CREATION) - Handles quotes, orders, pricing, complex product configuration
2. SupportSage 🧙‍♂️ (PUBLIC_QUERY/GENERAL_SUPPORT) - Handles order status, tracking, support questions
3. LogoCraft Pro 🎨 (LOGO_ANALYSIS) - Analyzes uploaded logos, recommends customization methods

📋 INTENT CLASSIFICATION:
- ORDER_CREATION → Route to CapCraft AI 💎
 * "I need a quote for..."
 * "Create order for..."
 * "Price for X caps with..."
 * "Custom caps with logo..."
 * "create me a quote for..."
 * "[Number] piece[s]" with specifications
 * Any message specifying quantities (144 piece, 500 caps, etc.)
 * Fabric specifications (Acrylic, Chino Twill, etc.)
 * Size specifications (Large, Medium, Small)
 * Color combinations (Red/White, Black/Gold, etc.)
 * Embroidery details (3D embroidery, screen print, etc.)
 * Complex product specifications
 * Quantity and pricing requests
 * Quote modifications: "how much for different quantity?"
 * Quote follow-ups: "what about 1000 pieces?"
 * Price comparisons: "how much for 500 vs 1000?"
 * Any pricing questions in quote conversations
 * "How much is for [number]?" in quote context

- LOGO_ANALYSIS → Route to LogoCraft Pro 🎨
 * "Analyze my logo..."
 * "What's the best way to put this logo on caps?"
 * "Should I use embroidery or screen print?"
 * "Logo recommendations..."
 * Messages with uploaded logo files
 * Questions about customization methods
 * Embroidery vs screen print vs patches

- PUBLIC_QUERY/GENERAL_SUPPORT → Route to SupportSage 🧙‍♂️
 * "What's the status of order..."
 * "Track my shipment..." 
 * "Change my existing order..."
 * "When will my order arrive..."
 * General questions and support

🚨 CRITICAL CONTEXT RULE:
If the conversation history contains ANY quote discussions, pricing information, or "CapCraft AI" responses, then ANY pricing/quantity questions should route to ORDER_CREATION (CapCraft AI), not GENERAL_SUPPORT.

Examples in quote conversations:
- "how much for 1000?" → ORDER_CREATION (not GENERAL_SUPPORT)
- "what about 500 pieces?" → ORDER_CREATION  
- "price for different quantity?" → ORDER_CREATION
- "can you update the quote?" → ORDER_CREATION

Respond with JSON only:
{
 "intent": "ORDER_CREATION|LOGO_ANALYSIS|PUBLIC_QUERY|GENERAL_SUPPORT",
 "assistantName": "CapCraft AI|LogoCraft Pro|SupportSage", 
 "assistantIcon": "💎|🎨|🧙‍♂️",
 "confidence": 0.0-1.0,
 "reasoning": "Brief explanation of routing decision"
}`;

  const userPrompt = `Current message: "${message}"

${conversationContext ? `Previous context:\n${conversationContext}` : ''}

Classify the intent and route to appropriate model.`;

  // Call OpenAI API for intent detection
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
   method: 'POST',
   headers: {
    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
    'Content-Type': 'application/json',
   },
   body: JSON.stringify({
    model: intentRouter.model,
    messages: [
     { role: 'system', content: systemPrompt },
     { role: 'user', content: userPrompt }
    ],
    temperature: intentRouter.temperature,
    max_tokens: intentRouter.maxTokens,
    response_format: { type: 'json_object' }
   }),
  });

  if (!response.ok) {
   throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
  }

  const aiResponse = await response.json();
  const content = aiResponse.choices[0]?.message?.content;

  if (!content) {
   throw new Error('No response from OpenAI');
  }

  let intentResult: any;
  try {
   intentResult = JSON.parse(content);
  } catch (parseError) {
   console.error('Failed to parse OpenAI response:', content);
   // Fallback classification
   intentResult = {
    intent: 'GENERAL_SUPPORT',
    assistantName: 'SupportScout',
    assistantIcon: '🛡️',
    confidence: 0.5,
    reasoning: 'Failed to parse AI response, using fallback'
   };
  }

  // Get the appropriate assistant based on intent
  const selectedAssistant = getAssistantByIntent(intentResult.intent || 'GENERAL_SUPPORT');
  
  // Create standardized response
  const intentResponse: IntentResponse = {
   intent: intentResult.intent || 'GENERAL_SUPPORT',
   assistant: {
    id: selectedAssistant.id,
    name: selectedAssistant.name,
    displayName: selectedAssistant.displayName,
    color: selectedAssistant.color,
    colorHex: selectedAssistant.colorHex,
    icon: selectedAssistant.icon,
    specialty: selectedAssistant.specialty
   },
   model: selectedAssistant.model,
   confidence: Math.max(0, Math.min(1, intentResult.confidence || 0.5)),
   reasoning: intentResult.reasoning || 'Intent classified successfully'
  };

  // Validate and sanitize response
  if (!['ORDER_CREATION', 'LOGO_ANALYSIS', 'PUBLIC_QUERY', 'GENERAL_SUPPORT'].includes(intentResponse.intent)) {
   const fallbackAssistant = AI_ASSISTANTS.SUPPORT_SCOUT;
   intentResponse.intent = 'GENERAL_SUPPORT';
   intentResponse.assistant = {
    id: fallbackAssistant.id,
    name: fallbackAssistant.name,
    displayName: fallbackAssistant.displayName,
    color: fallbackAssistant.color,
    colorHex: fallbackAssistant.colorHex,
    icon: fallbackAssistant.icon,
    specialty: fallbackAssistant.specialty
   };
  }

  return NextResponse.json(intentResponse);

 } catch (error) {
  console.error('Intent detection error:', error);
  
  // Fallback response with named assistant
  const fallbackAssistant = AI_ASSISTANTS.SUPPORT_SCOUT;
  return NextResponse.json({
   intent: 'GENERAL_SUPPORT',
   assistant: {
    id: fallbackAssistant.id,
    name: fallbackAssistant.name,
    displayName: fallbackAssistant.displayName,
    color: fallbackAssistant.color,
    colorHex: fallbackAssistant.colorHex,
    icon: fallbackAssistant.icon,
    specialty: fallbackAssistant.specialty
   },
   model: fallbackAssistant.model,
   confidence: 0.3,
   reasoning: 'Error in intent detection, using fallback'
  });
 }
}