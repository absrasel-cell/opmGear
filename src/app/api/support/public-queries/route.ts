import { NextRequest, NextResponse } from 'next/server';
import { ConversationService } from '@/lib/conversation';
import { supabaseAdmin } from '@/lib/supabase';
import { AI_ASSISTANTS, formatAssistantResponse } from '@/lib/ai-assistants-config';
import prisma from '@/lib/prisma';
import fs from 'fs';
import path from 'path';

interface PublicQueryRequest {
 message: string;
 intent: string;
 conversationHistory: Array<{
  role: 'user' | 'assistant' | 'system';
  content: string;
 }>;
 userProfile?: any;
 conversationId?: string;
 sessionId?: string;
}

export async function POST(request: NextRequest) {
 try {
  const body: PublicQueryRequest = await request.json();
  const { message, intent, conversationHistory, userProfile, conversationId, sessionId } = body;

  if (!message?.trim()) {
   return NextResponse.json(
    { error: 'Message is required' },
    { status: 400 }
   );
  }

  // Extract order IDs from user message
  const extractOrderIds = (message: string): string[] => {
   const patterns = [
    /#([a-f0-9]{8})/gi,      // #02dc7cf3
    /order[#\s]*([a-f0-9]{8})/gi, // order #02dc7cf3 or order 02dc7cf3
    /([a-f0-9]{8})/gi       // standalone 8-char hex
   ];
   
   const ids: string[] = [];
   patterns.forEach(pattern => {
    const matches = message.match(pattern);
    if (matches) {
     matches.forEach(match => {
      const id = match.replace(/[#\s]/g, '').replace(/order/gi, '').toLowerCase();
      if (id.length >= 8 && /^[a-f0-9]+$/.test(id)) {
       ids.push(id);
      }
     });
    }
   });
   
   return [...new Set(ids)]; // Remove duplicates
  };

  // Get user's recent orders and data if authenticated
  let userOrders = [];
  let userShipments = [];
  let userEmail = null;
  let specificOrders: any[] = [];
  
  // Check for specific order IDs in the message
  const extractedOrderIds = extractOrderIds(message);
  
  // Look up specific orders if IDs were found
  if (extractedOrderIds.length > 0) {
   try {
    for (const orderId of extractedOrderIds) {
     const foundOrders = await prisma.order.findMany({
      where: {
       id: { contains: orderId }
      },
      select: {
       id: true,
       productName: true,
       status: true,
       calculatedTotal: true,
       totalUnits: true,
       createdAt: true,
       userEmail: true,
       trackingNumber: true,
       selectedOptions: true,
       selectedColors: true,
       logoSetupSelections: true,
       additionalInstructions: true,
       shipmentId: true
      },
      take: 3 // Limit to avoid too many results
     });
     
     if (foundOrders.length > 0) {
      specificOrders.push(...foundOrders.map(order => ({
       id: order.id,
       shortId: orderId,
       product: order.productName,
       status: order.status,
       total: order.calculatedTotal?.toString() || 'N/A',
       quantity: order.totalUnits,
       date: order.createdAt.toLocaleDateString(),
       tracking: order.trackingNumber,
       email: order.userEmail,
       colors: order.selectedColors,
       options: order.selectedOptions,
       logos: order.logoSetupSelections,
       instructions: order.additionalInstructions,
       shipmentId: order.shipmentId
      })));
     }
    }
   } catch (error) {
    console.error('Error looking up specific orders:', error);
   }
  }

  // Try to get user from auth token
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
   try {
    const token = authHeader.split(' ')[1];
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (!error && user?.email) {
     userEmail = user.email;
    }
   } catch (authError) {
    // Continue without authentication
    console.log('Auth failed, continuing without user data');
   }
  }
  
  if (userEmail) {
   const recentOrders = await prisma.order.findMany({
    where: { 
     userEmail: userEmail 
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: {
     id: true,
     productName: true,
     status: true,
     calculatedTotal: true,
     createdAt: true,
     trackingNumber: true,
     totalUnits: true,
     shipmentId: true
    }
   });
   
   userOrders = recentOrders.map(order => ({
    id: order.id,
    product: order.productName,
    status: order.status,
    total: order.calculatedTotal?.toString() || 'N/A',
    date: order.createdAt.toLocaleDateString(),
    tracking: order.trackingNumber,
    quantity: order.totalUnits,
    shipmentId: order.shipmentId
   }));

   // Get shipment data if available
   if (recentOrders.some(order => order.shipmentId)) {
    const shipments = await prisma.shipment.findMany({
     where: {
      id: {
       in: recentOrders
        .filter(order => order.shipmentId)
        .map(order => order.shipmentId!)
      }
     },
     select: {
      id: true,
      trackingNumber: true,
      status: true,
      estimatedDelivery: true,
      createdAt: true
     }
    });
    
    userShipments = shipments.map(shipment => ({
     id: shipment.id,
     tracking: shipment.trackingNumber,
     status: shipment.status,
     estimatedDelivery: shipment.estimatedDelivery?.toLocaleDateString(),
     created: shipment.createdAt.toLocaleDateString()
    }));
   }
  }

  // Create conversation context
  const conversationContext = conversationHistory
   .slice(-5)
   .map(msg => `${msg.role}: ${msg.content}`)
   .join('\n');

  // Get SupportScout AI assistant configuration
  const supportScout = AI_ASSISTANTS.SUPPORT_SCOUT;
  
  // Load additional instructions from file
  let additionalInstructions = '';
  try {
   const instructionsPath = path.join(process.cwd(), 'src', 'app', 'ai', 'Additional Instruction.md');
   additionalInstructions = fs.readFileSync(instructionsPath, 'utf-8');
  } catch (error) {
   console.log('Additional instructions file not found or unreadable');
  }
  
  // System prompt for SupportSage AI
  const systemPrompt = `You are ${supportScout.displayName} ${supportScout.icon}, ${supportScout.specialty} for US Custom Cap. With wisdom and experience, you handle public queries about orders, shipments, tracking, and general support questions.

${additionalInstructions ? `REFERENCE KNOWLEDGE BASE - Use this information to answer relevant questions:
${additionalInstructions}

---

` : ''}

Your capabilities:
1. Order Status Inquiries - Check existing order statuses and provide updates
2. Shipment Tracking - Provide tracking information and delivery estimates 
3. General Support - Answer questions about products, policies, and processes
4. Simple Order Changes - Help with basic modifications to existing orders

Response Guidelines:
- Be helpful, friendly, and professional
- Provide specific information when available
- If you need to make changes or access sensitive data, guide users to contact admin
- For complex order creation, suggest using the AI order builder or contacting sales
- Always include relevant order/shipment IDs in responses

Available User Data:
${userProfile ? `User: ${userProfile.name || 'Customer'} (${userProfile.email || 'No email'})` : 'User: Not authenticated'}

${specificOrders.length > 0 ? `Specific Orders Found:
${specificOrders.map(order => `- Order #${order.shortId} (${order.id}):
 Product: ${order.product}
 Status: ${order.status}
 Quantity: ${order.quantity} units
 Total: $${order.total}
 Date: ${order.date}
 ${order.tracking ? `Tracking: ${order.tracking}` : 'No tracking yet'}
 ${order.colors ? `Colors: ${JSON.stringify(order.colors)}` : ''}
 ${order.options ? `Options: ${JSON.stringify(order.options)}` : ''}
 ${order.logos ? `Logo Setup: ${JSON.stringify(order.logos)}` : ''}
 ${order.instructions ? `Instructions: ${order.instructions}` : ''}`).join('\n\n')}` : ''}

${userOrders.length > 0 ? `Recent Orders (for authenticated user):
${userOrders.map(order => `- Order ${order.id}: ${order.product} - ${order.status} - $${order.total} - ${order.date} ${order.tracking ? `(Tracking: ${order.tracking})` : ''}`).join('\n')}` : 'No recent orders found for authenticated user.'}

${userShipments.length > 0 ? `Recent Shipments:
${userShipments.map(shipment => `- Shipment ${shipment.id}: ${shipment.status} - Tracking: ${shipment.tracking} - ETA: ${shipment.estimatedDelivery || 'TBD'}`).join('\n')}` : 'No recent shipments found.'}

Intent detected: ${intent}`;

  const userPrompt = `${conversationContext ? `Previous conversation:\n${conversationContext}\n\n` : ''}Current message: "${message}"

Please provide a helpful response to the customer's query.`;

  // Call OpenAI API
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
   method: 'POST',
   headers: {
    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
    'Content-Type': 'application/json',
   },
   body: JSON.stringify({
    model: supportScout.model,
    messages: [
     { role: 'system', content: systemPrompt },
     { role: 'user', content: userPrompt }
    ],
    temperature: supportScout.temperature,
    max_tokens: supportScout.maxTokens
   }),
  });

  if (!response.ok) {
   throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
  }

  const aiResponse = await response.json();
  const messageContent = aiResponse.choices[0]?.message?.content;

  if (!messageContent) {
   throw new Error('No response from OpenAI');
  }

  // Save conversation messages if conversationId is provided
  if (conversationId) {
   try {
    // Save user message
    await ConversationService.addMessage(conversationId, {
     role: 'user',
     content: message,
     metadata: {
      intent,
      sessionId,
      timestamp: new Date().toISOString()
     }
    });

    // Save assistant response
    await ConversationService.addMessage(conversationId, {
     role: 'assistant',
     content: messageContent,
     metadata: {
      model: supportScout.model,
      intent,
      sessionId,
      ordersFound: userOrders.length,
      specificOrdersFound: specificOrders.length,
      shipmentsFound: userShipments.length,
      timestamp: new Date().toISOString()
     }
    });
   } catch (conversationError) {
    console.error('Failed to save conversation messages:', conversationError);
    // Continue without failing the request
   }
  }

  // Format response with SupportScout AI identity
  const formattedResponse = formatAssistantResponse(supportScout, messageContent);
  
  return NextResponse.json({
   ...formattedResponse,
   conversationId,
   metadata: {
    ...formattedResponse.metadata,
    intent,
    ordersFound: userOrders.length,
    specificOrdersFound: specificOrders.length,
    shipmentsFound: userShipments.length,
    extractedOrderIds: extractedOrderIds,
    timestamp: new Date().toISOString()
   }
  });

 } catch (error) {
  console.error('Public query processing error:', error);
  return NextResponse.json(
   { 
    message: "I apologize, but I'm having trouble processing your request right now. Please try again in a moment, or contact our support team for immediate assistance.",
    error: 'Processing failed',
    assistant: {
     id: supportScout.id,
     name: supportScout.name,
     displayName: supportScout.displayName,
     color: supportScout.color,
     colorHex: supportScout.colorHex,
     icon: supportScout.icon,
     specialty: supportScout.specialty
    },
    model: supportScout.model
   },
   { status: 500 }
  );
 }
}