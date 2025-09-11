import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { supabaseAdmin } from '@/lib/supabase';
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

interface QuoteSummaryRequest {
  conversationId: string;
  quoteOrderId?: string;
  fullConversationData?: any;
  quoteData?: any;
  customerInfo?: any;
}

export async function POST(request: NextRequest) {
  console.log('=== AI QUOTE SUMMARY GENERATION START ===');
  
  try {
    // Check admin authorization
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Check if user has admin privileges (you may want to add more specific role checks)
    const { data: userData, error: userError } = await supabaseAdmin
      .from('User')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userError || !['ADMIN', 'STAFF', 'SUPER_ADMIN', 'MASTER_ADMIN'].includes(userData?.role)) {
      return NextResponse.json({ error: 'Admin privileges required' }, { status: 403 });
    }

    const { 
      conversationId, 
      quoteOrderId, 
      fullConversationData, 
      quoteData, 
      customerInfo 
    }: QuoteSummaryRequest = await request.json();

    if (!conversationId) {
      return NextResponse.json({ error: 'Conversation ID is required' }, { status: 400 });
    }

    console.log('Generating AI summary for conversation:', conversationId);

    // Get OpenAI client
    const client = getOpenAIClient();
    if (!client) {
      console.warn('OpenAI client not available, using fallback summary');
      const fallbackSummary = generateFallbackSummary(quoteData, customerInfo);
      return NextResponse.json({ 
        summary: fallbackSummary, 
        fallback: true,
        message: 'AI service unavailable, generated basic summary'
      });
    }

    // Fetch conversation data if not provided
    let conversationData = fullConversationData;
    if (!conversationData) {
      console.log('Fetching conversation data from database...');
      
      const { data: conversation, error: conversationError } = await supabaseAdmin
        .from('Conversation')
        .select('*')
        .eq('id', conversationId)
        .single();

      if (conversationError || !conversation) {
        return NextResponse.json({ 
          error: 'Conversation not found' 
        }, { status: 404 });
      }

      // Fetch conversation messages
      const { data: messages, error: messagesError } = await supabaseAdmin
        .from('ConversationMessage')
        .select('*')
        .eq('conversationId', conversationId)
        .order('createdAt', { ascending: true })
        .limit(50); // Get more messages for better context

      if (messagesError) {
        console.error('Failed to fetch messages:', messagesError);
      }

      conversationData = {
        conversation,
        messages: messages || [],
        metadata: conversation.metadata || {}
      };
    }

    // Fetch quote order data if not provided but quoteOrderId available
    if (!quoteData && quoteOrderId) {
      console.log('Fetching quote order data...');
      
      const { data: quoteOrder, error: quoteError } = await supabaseAdmin
        .from('QuoteOrder')
        .select('*')
        .eq('id', quoteOrderId)
        .single();

      if (!quoteError && quoteOrder) {
        quoteData = quoteOrder;
      }
    }

    // Extract comprehensive context for AI summary
    const context = extractSummaryContext(conversationData, quoteData, customerInfo);
    
    console.log('Extracted context for AI summary:', {
      hasConversation: !!conversationData,
      messagesCount: conversationData?.messages?.length || 0,
      hasQuoteData: !!quoteData,
      hasCustomerInfo: !!customerInfo
    });

    // Generate AI summary
    const aiSummary = await generateAISummary(client, context);
    
    if (!aiSummary) {
      throw new Error('Failed to generate AI summary');
    }

    // Store summary in conversation.summary field
    const { error: updateError } = await supabaseAdmin
      .from('Conversation')
      .update({ 
        summary: aiSummary,
        updatedAt: new Date().toISOString()
      })
      .eq('id', conversationId);

    if (updateError) {
      console.error('Failed to store summary in database:', updateError);
      // Don't fail the request, just log the error
    } else {
      console.log('✅ Summary stored in conversation.summary field');
    }

    console.log('=== AI QUOTE SUMMARY GENERATION COMPLETE ===');

    return NextResponse.json({
      success: true,
      summary: aiSummary,
      conversationId,
      usage: {
        model: 'gpt-3.5-turbo',
        generated: true
      }
    });

  } catch (error) {
    console.error('Error generating quote summary:', error);
    
    // Fallback summary generation
    try {
      const fallbackSummary = generateFallbackSummary(
        (request as any).body?.quoteData,
        (request as any).body?.customerInfo
      );
      
      return NextResponse.json({
        summary: fallbackSummary,
        fallback: true,
        error: 'AI summary generation failed, using fallback',
        success: false
      });
    } catch (fallbackError) {
      return NextResponse.json({
        error: 'Failed to generate summary',
        details: error.message
      }, { status: 500 });
    }
  }
}

// Extract comprehensive context from conversation and quote data
function extractSummaryContext(conversationData: any, quoteData: any, customerInfo: any) {
  const context: any = {
    customer: {},
    conversation: {},
    quote: {},
    specifications: {}
  };

  // Extract customer information
  if (customerInfo) {
    context.customer = {
      name: customerInfo.name,
      email: customerInfo.email,
      company: customerInfo.company,
      phone: customerInfo.phone
    };
  } else if (conversationData?.conversation) {
    // Try to extract from conversation metadata
    const metadata = conversationData.conversation.metadata;
    if (metadata?.userProfile) {
      context.customer = {
        name: metadata.userProfile.name,
        email: metadata.userProfile.email,
        company: metadata.userProfile.company,
        phone: metadata.userProfile.phone
      };
    }
  }

  // Extract quote order information from quoteData
  if (quoteData) {
    context.quote = {
      id: quoteData.id,
      productType: quoteData.productType,
      quantities: quoteData.quantities,
      colors: quoteData.colors,
      logoRequirements: quoteData.logoRequirements,
      customizationOptions: quoteData.customizationOptions,
      extractedSpecs: quoteData.extractedSpecs,
      estimatedCosts: quoteData.estimatedCosts,
      status: quoteData.status,
      createdAt: quoteData.createdAt
    };
  }

  // Extract conversation highlights
  if (conversationData?.messages) {
    const userMessages = conversationData.messages
      .filter((msg: any) => msg.role?.toLowerCase() === 'user')
      .map((msg: any) => msg.content)
      .slice(0, 5); // First 5 user messages for context

    const aiMessages = conversationData.messages
      .filter((msg: any) => msg.role?.toLowerCase() === 'assistant')
      .map((msg: any) => msg.content)
      .slice(-2); // Last 2 AI responses

    context.conversation = {
      userRequests: userMessages,
      aiResponses: aiMessages,
      messageCount: conversationData.messages.length,
      hasQuote: conversationData.conversation?.hasQuote || false
    };
  }

  return context;
}

// Generate AI summary using OpenAI
async function generateAISummary(client: OpenAI, context: any): Promise<string> {
  const systemPrompt = `You are an expert order analyst for US Custom Cap, specializing in summarizing custom cap quote requests and conversations. Generate a comprehensive, professional order summary that captures all important details.

Your summary should include:

1. **Customer Information**
   - Name, company, contact details
   - Any special requirements or preferences mentioned

2. **Product Specifications**
   - Cap style, quantities, colors, sizes
   - Fabric type, closure type, profile
   - Specific technical requirements

3. **Customization Details**
   - Logo positions, types (3D embroidery, flat embroidery, patches, etc.)
   - Logo sizes and setup costs
   - Accessories (hang tags, stickers, labels, etc.)

4. **Pricing Breakdown**
   - Base product costs
   - Logo/customization costs
   - Premium fabric/closure costs
   - Mold charges (if applicable)
   - Delivery costs
   - Final total cost

5. **Key Conversation Highlights**
   - Important customer requests or concerns
   - Special instructions or deadlines
   - Any modifications made during discussion

Format as a professional, structured summary suitable for admin review. Use clear headings and bullet points. Be specific with numbers, costs, and technical details.`;

  const contextText = `
Customer Details:
${context.customer?.name ? `Name: ${context.customer.name}` : 'Name: Not provided'}
${context.customer?.email ? `Email: ${context.customer.email}` : 'Email: Not provided'}
${context.customer?.company ? `Company: ${context.customer.company}` : 'Company: Not provided'}
${context.customer?.phone ? `Phone: ${context.customer.phone}` : 'Phone: Not provided'}

Quote Information:
${context.quote?.productType ? `Product: ${context.quote.productType}` : 'Product: Custom Cap'}
${context.quote?.quantities ? `Quantity: ${JSON.stringify(context.quote.quantities)}` : 'Quantity: Not specified'}
${context.quote?.colors ? `Colors: ${JSON.stringify(context.quote.colors)}` : 'Colors: Not specified'}
${context.quote?.extractedSpecs ? `Specifications: ${JSON.stringify(context.quote.extractedSpecs)}` : 'Specifications: Not provided'}
${context.quote?.logoRequirements ? `Logo Requirements: ${JSON.stringify(context.quote.logoRequirements)}` : 'Logo Requirements: None specified'}
${context.quote?.customizationOptions ? `Customization: ${JSON.stringify(context.quote.customizationOptions)}` : 'Customization: Basic'}
${context.quote?.estimatedCosts ? `Cost Breakdown: ${JSON.stringify(context.quote.estimatedCosts)}` : 'Costs: Not calculated'}

Conversation Context:
${context.conversation?.userRequests?.length ? `Customer Requests: ${context.conversation.userRequests.join(' | ')}` : 'Customer Requests: Not available'}
${context.conversation?.messageCount ? `Total Messages: ${context.conversation.messageCount}` : 'Messages: Not available'}

Generate a comprehensive summary based on the above information:`;

  try {
    const completion = await client.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: contextText
        }
      ],
      max_tokens: 1000,
      temperature: 0.3, // Lower temperature for consistency
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0
    });

    const summary = completion.choices[0]?.message?.content?.trim();
    
    if (!summary) {
      throw new Error('Empty summary generated');
    }

    return summary;

  } catch (error) {
    console.error('OpenAI API error:', error);
    throw error;
  }
}

// Generate fallback summary when AI is unavailable
function generateFallbackSummary(quoteData?: any, customerInfo?: any): string {
  const date = new Date().toLocaleDateString();
  const time = new Date().toLocaleTimeString();
  
  let summary = `## Order Summary (Generated ${date} at ${time})\n\n`;
  
  // Customer section
  summary += `### Customer Information\n`;
  if (customerInfo?.name) {
    summary += `- **Name:** ${customerInfo.name}\n`;
  }
  if (customerInfo?.email) {
    summary += `- **Email:** ${customerInfo.email}\n`;
  }
  if (customerInfo?.company) {
    summary += `- **Company:** ${customerInfo.company}\n`;
  }
  if (customerInfo?.phone) {
    summary += `- **Phone:** ${customerInfo.phone}\n`;
  }
  if (!customerInfo?.name && !customerInfo?.email) {
    summary += `- Customer details not available\n`;
  }
  summary += `\n`;
  
  // Product section
  summary += `### Product Specifications\n`;
  if (quoteData?.productType) {
    summary += `- **Product:** ${quoteData.productType}\n`;
  }
  if (quoteData?.quantities) {
    summary += `- **Quantity:** ${JSON.stringify(quoteData.quantities)}\n`;
  }
  if (quoteData?.extractedSpecs) {
    const specs = quoteData.extractedSpecs;
    if (specs.profile) summary += `- **Profile:** ${specs.profile}\n`;
    if (specs.closure) summary += `- **Closure:** ${specs.closure}\n`;
    if (specs.fabric) summary += `- **Fabric:** ${specs.fabric}\n`;
    if (specs.structure) summary += `- **Structure:** ${specs.structure}\n`;
  }
  summary += `\n`;
  
  // Pricing section
  summary += `### Cost Breakdown\n`;
  if (quoteData?.estimatedCosts) {
    const costs = quoteData.estimatedCosts;
    if (costs.baseProductCost) summary += `- **Base Product Cost:** $${costs.baseProductCost.toFixed(2)}\n`;
    if (costs.logosCost) summary += `- **Logo Cost:** $${costs.logosCost.toFixed(2)}\n`;
    if (costs.accessoriesCost) summary += `- **Accessories Cost:** $${costs.accessoriesCost.toFixed(2)}\n`;
    if (costs.deliveryCost) summary += `- **Delivery Cost:** $${costs.deliveryCost.toFixed(2)}\n`;
    if (costs.total) summary += `- **Total Cost:** $${costs.total.toFixed(2)}\n`;
  } else {
    summary += `- Pricing details not available\n`;
  }
  summary += `\n`;
  
  summary += `### Additional Notes\n`;
  summary += `- Summary generated automatically due to AI service unavailability\n`;
  summary += `- For detailed conversation history, please refer to the full conversation record\n`;
  
  return summary;
}