import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
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
  console.log('🚀 Save Quote Conversation API - Starting (FIXED)');
  
  try {
    const user = await getCurrentUser(request);
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

    // Perform database operations (Supabase doesn't have transactions like Prisma, so we'll do operations sequentially)
    console.log('🔄 Starting database operations');
    
    let orderBuilderRecord, updatedConversation, conversationQuote;

    try {
      // 1. Create or update OrderBuilderState
      console.log('💾 Creating/updating OrderBuilderState for session:', sessionId);
      
      // First, check if OrderBuilderState exists
      const { data: existingState } = await supabaseAdmin
        .from('OrderBuilderState')
        .select('id')
        .eq('sessionId', sessionId)
        .single();

      const now = new Date().toISOString();
      
      if (existingState) {
        // Update existing state
        const { data: updatedState, error: updateError } = await supabaseAdmin
          .from('OrderBuilderState')
          .update({
            capStyleSetup: serializedState.capStyleSetup,
            customization: serializedState.customization,
            delivery: serializedState.delivery,
            costBreakdown: serializedState.costBreakdown,
            productionTimeline: serializedState.productionTimeline,
            packaging: serializedState.packaging,
            quoteData: serializedState.quoteData,
            currentStep: orderBuilderState.currentStep || 'setup',
            isCompleted: true,
            completedAt: now,
            totalCost: orderBuilderState.totalCost ? parseFloat(orderBuilderState.totalCost.toString()) : null,
            totalUnits: orderBuilderState.totalUnits || null,
            stateVersion: orderBuilderState.stateVersion || '1.0',
            metadata: serializedState.metadata,
            updatedAt: now
            // Remove userId from update - table doesn't have this column
          })
          .eq('sessionId', sessionId)
          .select()
          .single();

        if (updateError) throw updateError;
        orderBuilderRecord = updatedState;
      } else {
        // Create new state
        const { data: newState, error: createError } = await supabaseAdmin
          .from('OrderBuilderState')
          .insert({
            id: `obs_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // Add required id field
            // Remove userId - table doesn't have this column
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
            completedAt: now,
            totalCost: orderBuilderState.totalCost ? parseFloat(orderBuilderState.totalCost.toString()) : null,
            totalUnits: orderBuilderState.totalUnits || null,
            stateVersion: orderBuilderState.stateVersion || '1.0',
            metadata: serializedState.metadata,
            createdAt: now,
            updatedAt: now
          })
          .select()
          .single();

        if (createError) throw createError;
        orderBuilderRecord = newState;
      }

      console.log('✅ OrderBuilderState saved with ID:', orderBuilderRecord.id);

      // 2. Update Conversation with quote completion and auto-approval
      console.log('📝 Updating conversation with quote completion and auto-approval');
      
      // First verify the conversation exists and belongs to the user (if not null)
      const { data: existingConv } = await supabaseAdmin
        .from('Conversation')
        .select('id, userId')
        .eq('id', conversationId)
        .single();
        
      if (!existingConv) {
        throw new Error(`Conversation ${conversationId} not found`);
      }
      
      // Security check: ensure user owns the conversation (allow null userId for guest quotes)
      if (existingConv.userId && existingConv.userId !== user.id) {
        throw new Error(`User ${user.id} does not own conversation ${conversationId}`);
      }
      
      const { data: conversation, error: conversationError } = await supabaseAdmin
        .from('Conversation')
        .update({
          context: 'QUOTE_REQUEST', // Keep as QUOTE_REQUEST, don't use invalid QUOTE_COMPLETED
          hasQuote: true,
          quoteCompletedAt: now,
          orderBuilderStateId: orderBuilderRecord.id,
          lastActivity: now,
          updatedAt: now,
          // Ensure userId is set if it was null (for guest->authenticated user conversion)
          userId: existingConv.userId || user.id,
          // AUTO-APPROVAL: Mark quote as approved in metadata (Quote button auto-accept)
          metadata: {
            quoteStatus: 'APPROVED',
            quoteAcceptedAt: now,
            autoAccepted: true,
            autoAcceptedSource: 'quote_button'
          }
        })
        .eq('id', conversationId)
        .select()
        .single();

      if (conversationError) throw conversationError;
      updatedConversation = conversation;
      console.log('✅ Conversation updated with quote completion');

      // 3. Create ConversationQuotes bridge record
      console.log('🔗 Creating ConversationQuotes bridge record');
      
      // Check if bridge record exists
      const { data: existingBridge } = await supabaseAdmin
        .from('ConversationQuotes')
        .select('*')
        .eq('conversationId', conversationId)
        .eq('quoteOrderId', quoteOrderId)
        .single();

      if (existingBridge) {
        // Update existing bridge
        const { data: updatedBridge, error: bridgeError } = await supabaseAdmin
          .from('ConversationQuotes')
          .update({
            updatedAt: now
          })
          .eq('conversationId', conversationId)
          .eq('quoteOrderId', quoteOrderId)
          .select()
          .single();

        if (bridgeError) throw bridgeError;
        conversationQuote = updatedBridge;
      } else {
        // Create new bridge - explicitly provide UUID to avoid null constraint error
        const { data: newBridge, error: bridgeError } = await supabaseAdmin
          .from('ConversationQuotes')
          .insert({
            id: crypto.randomUUID(), // Explicitly provide UUID to avoid NOT NULL constraint
            conversationId,
            quoteOrderId,
            isMainQuote: true,
            createdAt: now,
            updatedAt: now
          })
          .select()
          .single();

        if (bridgeError) throw bridgeError;
        conversationQuote = newBridge;
      }

      console.log('✅ ConversationQuotes bridge created');

      // 4. Update QuoteOrder status and AUTO-ACCEPT the quote (create order)
      console.log('📋 Updating QuoteOrder status and auto-accepting');
      
      // First update QuoteOrder to COMPLETED
      const { error: quoteOrderError } = await supabaseAdmin
        .from('QuoteOrder')
        .update({
          status: 'COMPLETED',
          completedAt: now,
          lastActivityAt: now
        })
        .eq('id', quoteOrderId);

      if (quoteOrderError) throw quoteOrderError;
      console.log('✅ QuoteOrder status updated to COMPLETED');
      
      // AUTO-ACCEPT: Create Order from QuoteOrder (same logic as Accept button)
      let orderId = null;
      console.log('🚀 Auto-creating Order from QuoteOrder (Quote button auto-accept):', quoteOrderId);
      
      try {
        // Generate unique order ID
        orderId = `ORDER-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        
        // Get the full QuoteOrder data for order creation
        const { data: fullQuoteOrder, error: fetchQuoteOrderError } = await supabaseAdmin
          .from('QuoteOrder')
          .select('*')
          .eq('id', quoteOrderId)
          .single();
          
        if (fetchQuoteOrderError || !fullQuoteOrder) {
          throw new Error(`Failed to fetch QuoteOrder for order creation: ${fetchQuoteOrderError?.message}`);
        }
        
        // Create the Order record
        const { data: newOrder, error: orderError } = await supabaseAdmin
          .from('Order')
          .insert({
            id: orderId,
            userId: existingConv.userId || user.id,
            customerName: fullQuoteOrder.customerName || 'Customer',
            customerEmail: fullQuoteOrder.customerEmail || user.email,
            customerPhone: fullQuoteOrder.customerPhone || '',
            customerCompany: fullQuoteOrder.customerCompany || '',
            productName: fullQuoteOrder.productType || 'Custom Cap',
            status: 'PENDING',
            priority: 'NORMAL',
            totalCost: fullQuoteOrder.estimatedCosts?.total || 0,
            estimatedCost: fullQuoteOrder.estimatedCosts?.total || 0,
            currency: 'USD',
            paymentStatus: 'PENDING',
            productionStatus: 'QUEUED',
            orderData: {
              quoteOrderId: fullQuoteOrder.id,
              capDetails: fullQuoteOrder.quantities || {},
              customization: fullQuoteOrder.logoRequirements || {},
              colors: fullQuoteOrder.colors || {},
              estimatedCosts: fullQuoteOrder.estimatedCosts || {},
              customizationOptions: fullQuoteOrder.customizationOptions || {},
              originalQuoteData: fullQuoteOrder
            },
            orderNotes: `Order auto-created from Quote button (auto-accept) for quote ${quoteOrderId}. Original requirements: ${fullQuoteOrder.additionalRequirements || ''}`,
            specialInstructions: fullQuoteOrder.additionalRequirements || '',
            urgencyLevel: fullQuoteOrder.priority === 'URGENT' ? 'HIGH' : 'NORMAL',
            leadTimeEstimate: '14-21 days',
            createdAt: now,
            updatedAt: now
          })
          .select()
          .single();
          
        if (orderError) {
          throw new Error(`Failed to create Order: ${orderError.message}`);
        }
        
        // Update the QuoteOrder to reference the created order
        const { error: updateQuoteOrderError } = await supabaseAdmin
          .from('QuoteOrder')
          .update({
            convertedToOrderId: orderId,
            status: 'CONVERTED_TO_ORDER',
            updatedAt: now
          })
          .eq('id', quoteOrderId);
          
        if (updateQuoteOrderError) {
          console.error('Failed to update QuoteOrder with order reference:', updateQuoteOrderError);
          // Don't fail the whole operation for this
        }
        
        // Update conversation metadata with order information
        const { error: conversationUpdateError } = await supabaseAdmin
          .from('Conversation')
          .update({
            title: `ORDER-${orderId.slice(-6)} - Order Created`,
            metadata: {
              quoteStatus: 'APPROVED',
              quoteAcceptedAt: now,
              autoAccepted: true,
              autoAcceptedSource: 'quote_button',
              orderId: orderId,
              orderCreatedAt: now
            },
            updatedAt: now
          })
          .eq('id', conversationId);
          
        if (conversationUpdateError) {
          console.error('Failed to update conversation with order metadata:', conversationUpdateError);
        }
        
        console.log('✅ Order auto-created from Quote button:', orderId);
        
      } catch (orderCreationError) {
        console.error('❌ Failed to auto-create order from quote:', orderCreationError);
        // Continue with quote save even if order creation fails
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Database operations failed:', {
        error: errorMessage,
        code: (error as any)?.code,
        details: (error as any)?.details,
        hint: (error as any)?.hint,
        conversationId,
        sessionId,
        quoteOrderId
      });
      throw error;
    }

    const result = {
      conversation: updatedConversation,
      orderBuilderState: orderBuilderRecord,
      conversationQuote,
      orderCreated: !!orderId,
      orderId: orderId
    };

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
            const { error: titleUpdateError } = await supabaseAdmin
              .from('Conversation')
              .update({ 
                title: generatedTitle,
                updatedAt: new Date().toISOString()
              })
              .eq('id', conversationId);

            if (titleUpdateError) {
              console.error('Failed to update conversation title:', titleUpdateError);
            }

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
        const { error: fallbackTitleError } = await supabaseAdmin
          .from('Conversation')
          .update({ 
            title: generatedTitle,
            updatedAt: new Date().toISOString()
          })
          .eq('id', conversationId);

        if (fallbackTitleError) {
          console.error('Failed to update fallback title:', fallbackTitleError);
        }

        console.log('✅ Fallback title saved:', generatedTitle);
      }
    }

    console.log('🎉 Quote conversation save completed successfully');

    return NextResponse.json({
      success: true,
      message: result.orderCreated ? 
        `Quote saved and Order ${result.orderId} created successfully!` : 
        'Quote conversation saved successfully',
      data: {
        conversationId: result.conversation.id,
        quoteOrderId,
        orderBuilderStateId: result.orderBuilderState.id,
        hasQuote: result.conversation.hasQuote,
        quoteCompletedAt: result.conversation.quoteCompletedAt,
        title: generatedTitle,
        titleGenerated: !!generatedTitle,
        titleGenerationError,
        orderCreated: result.orderCreated,
        orderId: result.orderId,
        autoAccepted: true
      },
      validation: {
        warnings: validation.warnings
      }
    });

  } catch (error) {
    console.error('❌ Error saving quote conversation:', error);
    
    // Create detailed error response for debugging
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorDetails = {
      message: errorMessage,
      code: (error as any)?.code,
      details: (error as any)?.details,
      hint: (error as any)?.hint,
      timestamp: new Date().toISOString()
    };
    
    console.error('❌ Detailed error info:', errorDetails);
    
    // Handle specific database errors
    if (errorMessage.includes("Can't reach database server") || errorMessage.includes("connection")) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Database connectivity issue', 
          details: 'Unable to connect to database. Please try again later.',
          fallback: true,
          debug: errorDetails
        },
        { status: 503 }
      );
    }
    
    // Handle authentication/permission errors
    if (errorMessage.includes('permission') || errorMessage.includes('policy') || errorMessage.includes('RLS')) {
      return NextResponse.json({
        success: false,
        error: 'Database permission error',
        details: 'Database access denied. Please check authentication.',
        debug: errorDetails
      }, { status: 403 });
    }
    
    // Handle validation errors
    if (errorMessage.includes('validation') || errorMessage.includes('constraint') || errorMessage.includes('check')) {
      return NextResponse.json({
        success: false,
        error: 'Validation error',
        details: `Data validation failed: ${errorMessage}`,
        debug: errorDetails
      }, { status: 400 });
    }
    
    return NextResponse.json({
      success: false,
      error: 'Failed to save quote conversation',
      details: errorMessage,
      debug: errorDetails
    }, { status: 500 });
  }
}