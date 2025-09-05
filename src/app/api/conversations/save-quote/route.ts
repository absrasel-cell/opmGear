import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth-helpers';
import { 
  validateOrderBuilderState, 
  serializeOrderBuilderState, 
  extractStateForTitleGeneration,
  OrderBuilderState 
} from '@/lib/order-builder-state';
import OpenAI from 'openai';

// Initialize OpenAI client lazily
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

interface SaveQuoteRequest {
  conversationId: string;
  quoteOrderId: string;
  orderBuilderState: OrderBuilderState;
  sessionId: string;
  generateTitle?: boolean;
  titleContext?: {
    customerName?: string;
    company?: string;
    messages?: Array<{ role: string; content: string; }>;
  };
}

export async function POST(request: NextRequest) {
  console.log('🚀 Save Quote Conversation API - Starting');
  
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body: SaveQuoteRequest = await request.json();
    const { 
      conversationId, 
      quoteOrderId, 
      orderBuilderState, 
      sessionId, 
      generateTitle = true,
      titleContext 
    } = body;

    // Validate required fields
    if (!conversationId || !quoteOrderId || !orderBuilderState || !sessionId) {
      return NextResponse.json({ 
        error: 'Missing required fields: conversationId, quoteOrderId, orderBuilderState, sessionId' 
      }, { status: 400 });
    }

    console.log('📊 Processing quote save for conversation:', conversationId);

    // Validate Order Builder state
    const validation = validateOrderBuilderState(orderBuilderState);
    if (!validation.isValid) {
      return NextResponse.json({
        error: 'Invalid Order Builder state',
        details: validation.errors,
        warnings: validation.warnings
      }, { status: 400 });
    }

    // Log warnings if any
    if (validation.warnings.length > 0) {
      console.warn('⚠️ Order Builder state warnings:', validation.warnings);
    }

    // Serialize state for database storage
    const serializedState = serializeOrderBuilderState(orderBuilderState);

    // Start database transaction
    const result = await prisma.$transaction(async (tx) => {
      console.log('🔄 Starting database transaction');

      // 1. Create or update OrderBuilderState
      console.log('💾 Creating/updating OrderBuilderState for session:', sessionId);
      const orderBuilderRecord = await tx.orderBuilderState.upsert({
        where: { sessionId },
        update: {
          capStyleSetup: serializedState.capStyleSetup,
          customization: serializedState.customization,
          delivery: serializedState.delivery,
          costBreakdown: serializedState.costBreakdown,
          productionTimeline: serializedState.productionTimeline,
          packaging: serializedState.packaging,
          quoteData: serializedState.quoteData,
          currentStep: orderBuilderState.currentStep || 'setup',
          isCompleted: true,
          completedAt: new Date(),
          totalCost: orderBuilderState.totalCost ? parseFloat(orderBuilderState.totalCost.toString()) : null,
          totalUnits: orderBuilderState.totalUnits || null,
          stateVersion: orderBuilderState.stateVersion || '1.0',
          metadata: serializedState.metadata,
          updatedAt: new Date()
        },
        create: {
          sessionId,
          capStyleSetup: serializedState.capStyleSetup,
          customization: serializedState.customization,
          delivery: serializedState.delivery,
          costBreakdown: serializedState.costBreakdown,
          productionTimeline: serializedState.productionTimeline,
          packaging: serializedState.packaging,
          quoteData: serializedState.quoteData,
          currentStep: orderBuilderState.currentStep || 'setup',
          isCompleted: true,
          completedAt: new Date(),
          totalCost: orderBuilderState.totalCost ? parseFloat(orderBuilderState.totalCost.toString()) : null,
          totalUnits: orderBuilderState.totalUnits || null,
          stateVersion: orderBuilderState.stateVersion || '1.0',
          metadata: serializedState.metadata
        }
      });

      console.log('✅ OrderBuilderState saved with ID:', orderBuilderRecord.id);

      // 2. Update Conversation with quote completion
      console.log('📝 Updating conversation with quote completion');
      const updatedConversation = await tx.conversation.update({
        where: { 
          id: conversationId,
          userId: user.id // Security: ensure user owns the conversation
        },
        data: {
          hasQuote: true,
          quoteCompletedAt: new Date(),
          orderBuilderStateId: orderBuilderRecord.id,
          lastActivity: new Date(),
          updatedAt: new Date()
        }
      });

      console.log('✅ Conversation updated with quote completion');

      // 3. Create ConversationQuotes bridge record
      console.log('🔗 Creating ConversationQuotes bridge record');
      const conversationQuote = await tx.conversationQuotes.upsert({
        where: {
          conversationId_quoteOrderId: {
            conversationId,
            quoteOrderId
          }
        },
        update: {
          updatedAt: new Date()
        },
        create: {
          conversationId,
          quoteOrderId,
          isMainQuote: true // First quote for this conversation
        }
      });

      console.log('✅ ConversationQuotes bridge created');

      // 4. Update QuoteOrder status if needed
      console.log('📋 Updating QuoteOrder status');
      await tx.quoteOrder.update({
        where: { id: quoteOrderId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          lastActivityAt: new Date()
        }
      });

      console.log('✅ QuoteOrder status updated to COMPLETED');

      return {
        conversation: updatedConversation,
        orderBuilderState: orderBuilderRecord,
        conversationQuote
      };
    });

    console.log('✅ Database transaction completed successfully');

    // 5. Generate AI-powered title if requested
    let generatedTitle = null;
    let titleGenerationError = null;

    if (generateTitle) {
      console.log('🤖 Generating AI-powered conversation title');
      
      try {
        const client = getOpenAIClient();
        if (client) {
          // Extract state information for title generation
          const stateInfo = extractStateForTitleGeneration(orderBuilderState);
          
          // Build context for title generation
          let contextPrompt = `Generate a professional conversation title for a completed custom cap quote. `;
          
          // Add customer context
          if (titleContext?.customerName) {
            contextPrompt += `Customer: ${titleContext.customerName}`;
            if (titleContext?.company) {
              contextPrompt += ` (${titleContext.company})`;
            }
            contextPrompt += '. ';
          }

          // Add order details
          const orderDetails = [];
          if (stateInfo.quantity) orderDetails.push(`${stateInfo.quantity} caps`);
          if (stateInfo.capStyle) orderDetails.push(`${stateInfo.capStyle} style`);
          if (stateInfo.logoCount > 0) orderDetails.push(`${stateInfo.logoCount} logo${stateInfo.logoCount > 1 ? 's' : ''}`);
          if (stateInfo.totalCost) orderDetails.push(`$${stateInfo.totalCost.toFixed(2)}`);
          if (stateInfo.urgency && stateInfo.urgency !== 'standard') orderDetails.push(`${stateInfo.urgency} delivery`);

          if (orderDetails.length > 0) {
            contextPrompt += `Quote details: ${orderDetails.join(', ')}. `;
          }

          // Add recent messages context if available
          let messagesContext = '';
          if (titleContext?.messages && titleContext.messages.length > 0) {
            const recentMessages = titleContext.messages.slice(-3);
            messagesContext = recentMessages
              .map(msg => `${msg.role.toUpperCase()}: ${msg.content.substring(0, 200)}`)
              .join('\n');
          }

          const systemPrompt = `Generate a concise, professional title (4-8 words) for this completed custom cap quote conversation.

Rules:
- Keep under 60 characters
- Include "Quote" or "Quoted" in the title
- Be specific and descriptive
- Include key details like quantity or customization type
- Use professional language

Good examples:
- "Custom Logo Caps Quote - 100 pcs"
- "Embroidered Caps Quote Completed"  
- "Bulk Cap Order Quote - $2,500"
- "Rush Order Quote - Logo Caps"
- "Corporate Caps Quote - 500 Units"

${contextPrompt}

${messagesContext ? `Recent conversation:\n${messagesContext}\n` : ''}

Generate ONLY the title:`;

          const completion = await client.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [
              {
                role: 'system',
                content: 'You are a professional customer service assistant that generates concise, descriptive titles for completed custom cap quote conversations.'
              },
              {
                role: 'user',
                content: systemPrompt
              }
            ],
            max_tokens: 40,
            temperature: 0.2, // Very low temperature for consistency
            top_p: 1
          });

          const rawTitle = completion.choices[0]?.message?.content?.trim();
          if (rawTitle) {
            // Clean and validate the title
            generatedTitle = rawTitle
              .replace(/^["']|["']$/g, '') // Remove surrounding quotes
              .replace(/\s+/g, ' ') // Normalize whitespace
              .trim()
              .substring(0, 80); // Ensure max length

            // Update conversation with generated title
            await prisma.conversation.update({
              where: { id: conversationId },
              data: { 
                title: generatedTitle,
                updatedAt: new Date()
              }
            });

            console.log('✅ AI-generated title saved:', generatedTitle);
          }
        } else {
          console.warn('⚠️ OpenAI client not available - skipping title generation');
        }
      } catch (titleError) {
        console.error('❌ Title generation failed:', titleError);
        titleGenerationError = titleError instanceof Error ? titleError.message : 'Unknown error';
        
        // Generate fallback title
        const stateInfo = extractStateForTitleGeneration(orderBuilderState);
        const fallbackDetails = [];
        if (stateInfo.quantity) fallbackDetails.push(`${stateInfo.quantity} Caps`);
        if (stateInfo.totalCost) fallbackDetails.push(`$${stateInfo.totalCost.toFixed(2)}`);
        
        generatedTitle = fallbackDetails.length > 0 
          ? `Quote Completed - ${fallbackDetails.join(', ')}`
          : `Quote Completed - ${new Date().toLocaleDateString()}`;

        // Update with fallback title
        await prisma.conversation.update({
          where: { id: conversationId },
          data: { 
            title: generatedTitle,
            updatedAt: new Date()
          }
        });

        console.log('✅ Fallback title saved:', generatedTitle);
      }
    }

    console.log('🎉 Quote conversation save completed successfully');

    return NextResponse.json({
      success: true,
      message: 'Quote conversation saved successfully',
      data: {
        conversationId: result.conversation.id,
        quoteOrderId,
        orderBuilderStateId: result.orderBuilderState.id,
        hasQuote: result.conversation.hasQuote,
        quoteCompletedAt: result.conversation.quoteCompletedAt,
        title: generatedTitle,
        titleGenerated: !!generatedTitle,
        titleGenerationError
      },
      validation: {
        warnings: validation.warnings
      }
    });

  } catch (error) {
    console.error('❌ Error saving quote conversation:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to save quote conversation',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}