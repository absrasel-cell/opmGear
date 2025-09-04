import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth-helpers';

// Initialize OpenAI client lazily to handle missing env vars during build
let openai: OpenAI | null = null;

function getOpenAIClient() {
  if (!openai) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      if (process.env.NODE_ENV !== 'production' || process.env.VERCEL_ENV === undefined) {
        console.warn('OPENAI_API_KEY not available during build - this is normal');
        return null;
      }
      throw new Error('OPENAI_API_KEY environment variable is not configured');
    }
    openai = new OpenAI({ apiKey });
  }
  return openai;
}

interface TitleGenerationRequest {
  conversationId?: string;
  messages?: Array<{
    role: string;
    content: string;
  }>;
  orderBuilder?: {
    capDetails?: any;
    customization?: any;
    delivery?: any;
    quoteData?: any;
  };
  userProfile?: {
    name?: string;
    company?: string;
  };
  conversationType?: string;
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { 
      conversationId, 
      messages = [], 
      orderBuilder, 
      userProfile, 
      conversationType = 'support' 
    }: TitleGenerationRequest = await request.json();

    // Get OpenAI client
    const client = getOpenAIClient();
    if (!client) {
      // Return fallback if OpenAI is not available
      const fallbackTitle = generateFallbackTitle(orderBuilder, conversationType);
      return NextResponse.json({ title: fallbackTitle, fallback: true });
    }

    // Fetch conversation messages if conversationId provided and messages empty
    let conversationMessages = messages;
    if (conversationId && conversationMessages.length === 0) {
      const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
        include: {
          ConversationMessage: {
            orderBy: { createdAt: 'asc' },
            take: 10 // Get first 10 messages for context
          }
        }
      });

      if (conversation) {
        conversationMessages = conversation.ConversationMessage.map(msg => ({
          role: msg.role.toLowerCase(),
          content: msg.content
        }));
      }
    }

    if (conversationMessages.length === 0) {
      return NextResponse.json({ error: 'Messages are required' }, { status: 400 });
    }

    // Build intelligent context for title generation
    let contextPrompt = `Generate a descriptive, professional title for this customer support conversation about custom caps. `;
    
    // Add user context
    if (userProfile?.name) {
      contextPrompt += `Customer: ${userProfile.name}`;
      if (userProfile.company) {
        contextPrompt += ` (${userProfile.company})`;
      }
      contextPrompt += '. ';
    }

    // Add order builder context if available
    if (orderBuilder) {
      contextPrompt += 'This conversation involves a custom cap order with details: ';
      
      const orderDetails = [];
      
      if (orderBuilder.capDetails) {
        const cap = orderBuilder.capDetails;
        if (cap.quantity) orderDetails.push(`${cap.quantity} caps`);
        if (cap.color) orderDetails.push(`${cap.color} color`);
        if (cap.profile) orderDetails.push(`${cap.profile} profile`);
        if (cap.size) orderDetails.push(`${cap.size} size`);
      }

      if (orderBuilder.customization?.logoDetails?.length > 0) {
        const logos = orderBuilder.customization.logoDetails;
        orderDetails.push(`${logos.length} logo${logos.length > 1 ? 's' : ''}`);
        orderDetails.push(logos.map((logo: any) => `${logo.location} ${logo.type}`).join(', '));
      }

      if (orderBuilder.delivery?.method) {
        orderDetails.push(`${orderBuilder.delivery.method} delivery`);
      }

      if (orderBuilder.quoteData?.pricing?.total) {
        orderDetails.push(`$${orderBuilder.quoteData.pricing.total.toFixed(2)} total`);
      }

      if (orderDetails.length > 0) {
        contextPrompt += orderDetails.join(', ') + '. ';
      }
    }

    // Take first few and last messages for better context
    const firstMessages = conversationMessages.slice(0, 3);
    const lastMessages = conversationMessages.length > 3 ? 
      conversationMessages.slice(-2) : [];

    const contextMessages = [...firstMessages, ...lastMessages]
      .map(msg => `${msg.role.toUpperCase()}: ${msg.content.substring(0, 300)}`)
      .join('\n');

    const systemPrompt = `Generate a concise, professional title (4-8 words) for this custom cap support conversation.

Rules:
- Keep under 60 characters
- Be specific and descriptive
- Include key details like quantity, customization type, or main issue
- Use professional language
- Focus on the main purpose/topic

Good examples:
- "Custom Logo Caps - 100 pcs Quote"
- "Embroidery Design Question"  
- "Bulk Order Pricing Inquiry"
- "Shipping Timeline Update"
- "Payment Processing Issue"
- "Logo Placement Consultation"
- "Rush Order Request - 50 Caps"

${contextPrompt}

Conversation:
${contextMessages}

Generate ONLY the title:`;

    const completion = await client.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a professional customer service assistant that generates concise, descriptive titles for support conversations about custom caps and apparel.'
        },
        {
          role: 'user',
          content: systemPrompt
        }
      ],
      max_tokens: 40,
      temperature: 0.3, // Lower temperature for consistency
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0
    });

    const generatedTitle = completion.choices[0]?.message?.content?.trim();
    
    if (!generatedTitle) {
      throw new Error('Failed to generate title');
    }

    // Clean up the title
    const cleanTitle = generatedTitle
      .replace(/^["']|["']$/g, '') // Remove surrounding quotes
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()
      .substring(0, 80); // Ensure max length

    // Update conversation with generated title if conversationId provided
    if (conversationId) {
      try {
        await prisma.conversation.update({
          where: { id: conversationId },
          data: { 
            title: cleanTitle,
            updatedAt: new Date()
          }
        });
      } catch (dbError) {
        console.error('Failed to update conversation title:', dbError);
        // Continue without failing the request
      }
    }

    return NextResponse.json({
      success: true,
      title: cleanTitle,
      conversationId: conversationId || null,
      usage: {
        promptTokens: completion.usage?.prompt_tokens || 0,
        completionTokens: completion.usage?.completion_tokens || 0,
        totalTokens: completion.usage?.total_tokens || 0
      }
    });

  } catch (error) {
    console.error('Error generating conversation title:', error);
    
    // Generate intelligent fallback title
    const fallbackTitle = generateFallbackTitle(
      (request as any).body?.orderBuilder,
      (request as any).body?.conversationType || 'support'
    );

    return NextResponse.json({
      title: fallbackTitle,
      fallback: true,
      error: 'AI title generation failed, using fallback'
    });
  }
}

// GET endpoint to regenerate title for existing conversation
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId');

    if (!conversationId) {
      return NextResponse.json({ error: 'Conversation ID is required' }, { status: 400 });
    }

    // Fetch conversation with messages
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        ConversationMessage: {
          orderBy: { createdAt: 'asc' },
          take: 10
        }
      }
    });

    if (!conversation || conversation.userId !== user.id) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    const messages = conversation.ConversationMessage.map(msg => ({
      role: msg.role.toLowerCase(),
      content: msg.content
    }));

    // Extract order builder data from conversation metadata if available
    const orderBuilder = conversation.metadata ? 
      (conversation.metadata as any).orderBuilder : undefined;

    // Call POST endpoint with fetched data
    const titleRequest = {
      conversationId,
      messages,
      orderBuilder,
      conversationType: conversation.context.toLowerCase()
    };

    // Create a new request object for POST
    const postRequest = new Request(request.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...Object.fromEntries(request.headers.entries())
      },
      body: JSON.stringify(titleRequest)
    });

    return POST(postRequest as NextRequest);

  } catch (error) {
    console.error('Error in GET request:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper function to generate intelligent fallback titles
function generateFallbackTitle(orderBuilder?: any, conversationType: string = 'support'): string {
  const date = new Date().toLocaleDateString();
  
  if (orderBuilder) {
    const details = [];
    
    if (orderBuilder.capDetails?.quantity) {
      details.push(`${orderBuilder.capDetails.quantity} Caps`);
    }
    
    if (orderBuilder.customization?.logoDetails?.length > 0) {
      details.push('Custom Logo');
    }
    
    if (orderBuilder.quoteData?.pricing?.total) {
      details.push('Quote Request');
    }
    
    if (details.length > 0) {
      return details.join(' - ');
    }
  }
  
  // Context-based fallbacks
  const fallbackTitles = {
    support: ['Support Inquiry', 'Customer Support', 'Help Request'],
    sales: ['Sales Inquiry', 'Product Question', 'Quote Request'],
    quote_request: ['Quote Request', 'Custom Order Quote', 'Pricing Inquiry'],
    order_inquiry: ['Order Inquiry', 'Order Status', 'Order Question']
  };
  
  const contextTitles = fallbackTitles[conversationType as keyof typeof fallbackTitles] || fallbackTitles.support;
  const randomTitle = contextTitles[Math.floor(Math.random() * contextTitles.length)];
  
  return `${randomTitle} - ${date}`;
}