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
  uploadedFiles?: string[];
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
      uploadedFiles = [],
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

    // CRITICAL FIX: Transform the frontend Order Builder state to the proper OrderBuilderState format
    console.log('📋 [CRITICAL FIX] Transforming frontend Order Builder state to database format');
    console.log('🔍 Input orderBuilderState keys:', Object.keys(orderBuilderState || {}));

    // Handle both formats: direct OrderBuilderState format and the frontend format
    const transformedOrderBuilderState: OrderBuilderState = {
      // Transform capDetails -> capStyleSetup (if present)
      capStyleSetup: orderBuilderState.capStyleSetup || orderBuilderState.capDetails ? {
        style: orderBuilderState.capStyleSetup?.style || orderBuilderState.capDetails?.productName,
        profile: orderBuilderState.capStyleSetup?.profile || orderBuilderState.capDetails?.profile,
        color: orderBuilderState.capStyleSetup?.color || orderBuilderState.capDetails?.color,
        size: orderBuilderState.capStyleSetup?.size || orderBuilderState.capDetails?.size,
        quantity: orderBuilderState.capStyleSetup?.quantity || orderBuilderState.capDetails?.quantity,
        basePrice: orderBuilderState.capStyleSetup?.basePrice || orderBuilderState.capDetails?.unitPrice,
        // Additional properties from capDetails
        colors: orderBuilderState.capDetails?.colors,
        billShape: orderBuilderState.capDetails?.billShape,
        structure: orderBuilderState.capDetails?.structure,
        fabric: orderBuilderState.capDetails?.fabric,
        closure: orderBuilderState.capDetails?.closure,
        stitching: orderBuilderState.capDetails?.stitch
      } : undefined,

      // Transform customization (preserve structure)
      customization: orderBuilderState.customization ? {
        logoDetails: orderBuilderState.customization.logos?.map((logo: any) => ({
          id: logo.id,
          location: logo.location || logo.position,
          type: logo.type || logo.method,
          size: logo.size,
          colors: logo.colors,
          setupCost: logo.moldCharge || logo.setupCost || 0,
          unitCost: logo.unitCost || 0,
          quantity: logo.quantity || orderBuilderState.capDetails?.quantity || 1,
          fileUploaded: !!logo.fileUploaded,
          fileName: logo.fileName,
          instructions: logo.instructions
        })) || [],
        totalCustomizationCost: orderBuilderState.customization.totalMoldCharges || 0,
        accessories: orderBuilderState.customization.accessories || {},
        closures: orderBuilderState.customization.closures || {}
      } : undefined,

      // Transform delivery (preserve structure)
      delivery: orderBuilderState.delivery ? {
        method: orderBuilderState.delivery.method,
        timeframe: orderBuilderState.delivery.leadTime,
        cost: orderBuilderState.delivery.totalCost,
        address: orderBuilderState.delivery.address,
        urgency: 'standard'
      } : undefined,

      // Transform pricing -> costBreakdown
      costBreakdown: orderBuilderState.costBreakdown || orderBuilderState.pricing ? {
        baseCost: orderBuilderState.costBreakdown?.baseCost || orderBuilderState.pricing?.baseProductCost || 0,
        logoSetupCosts: orderBuilderState.costBreakdown?.logoSetupCosts || orderBuilderState.pricing?.moldCharges || 0,
        logoUnitCosts: orderBuilderState.costBreakdown?.logoUnitCosts || orderBuilderState.pricing?.logosCost || 0,
        additionalOptionsCosts: orderBuilderState.costBreakdown?.additionalOptionsCosts || orderBuilderState.pricing?.premiumFabricCost || 0,
        accessoriesCosts: orderBuilderState.costBreakdown?.accessoriesCosts || orderBuilderState.pricing?.accessoriesCost || 0,
        closuresCosts: orderBuilderState.costBreakdown?.closuresCosts || orderBuilderState.pricing?.premiumClosureCost || 0,
        deliveryCost: orderBuilderState.costBreakdown?.deliveryCost || orderBuilderState.pricing?.deliveryCost || 0,
        subtotal: orderBuilderState.costBreakdown?.subtotal || orderBuilderState.pricing?.total || 0,
        discounts: orderBuilderState.costBreakdown?.discounts || 0,
        taxes: orderBuilderState.costBreakdown?.taxes || 0,
        total: orderBuilderState.costBreakdown?.total || orderBuilderState.pricing?.total || orderBuilderState.totalCost || 0,
        // Additional fields for restoration
        baseProductCost: orderBuilderState.pricing?.baseProductCost || 0,
        logosCost: orderBuilderState.pricing?.logosCost || 0,
        quantity: orderBuilderState.pricing?.quantity || orderBuilderState.totalUnits || 1
      } : undefined,

      // Preserve other fields
      currentStep: orderBuilderState.currentStep || 'completed',
      isCompleted: orderBuilderState.isCompleted !== false, // default to true
      completedAt: orderBuilderState.completedAt || new Date().toISOString(),
      totalCost: orderBuilderState.totalCost,
      totalUnits: orderBuilderState.totalUnits,
      stateVersion: orderBuilderState.stateVersion || '2.0',
      sessionId: sessionId,
      metadata: {
        orderBuilderStatus: orderBuilderState.orderBuilderStatus,
        leadTimeData: orderBuilderState.leadTimeData,
        quoteVersions: orderBuilderState.quoteVersions,
        originalFormat: 'frontend_transformed',
        transformedAt: new Date().toISOString()
      }
    };

    console.log('✅ [CRITICAL FIX] Transformed OrderBuilderState:', {
      hasCapStyleSetup: !!transformedOrderBuilderState.capStyleSetup,
      hasCustomization: !!transformedOrderBuilderState.customization,
      hasDelivery: !!transformedOrderBuilderState.delivery,
      hasCostBreakdown: !!transformedOrderBuilderState.costBreakdown,
      totalCost: transformedOrderBuilderState.totalCost
    });

    // Validate transformed Order Builder state
    const validation = validateOrderBuilderState(transformedOrderBuilderState);
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
    const serializedState = serializeOrderBuilderState(transformedOrderBuilderState);

    // Perform database operations (Supabase doesn't have transactions like Prisma, so we'll do operations sequentially)
    console.log('🔄 Starting database operations');
    
    let orderBuilderRecord, updatedConversation, conversationQuote, orderId = null;

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

      // 1.5. Create QuoteOrder record (CRITICAL FIX - this was missing!)
      console.log('📋 Creating QuoteOrder record for quote acceptance functionality');

      // Extract customer info from validation or use defaults
      const customerEmail = user.email;
      const customerName = titleContext?.customerName || 'Customer';
      const customerCompany = titleContext?.company || '';

      // Extract cost data from transformed Order Builder state
      const selectedVersion = transformedOrderBuilderState?.metadata?.quoteVersions?.[0];
      const totalCost = selectedVersion?.finalPrice || transformedOrderBuilderState.totalCost || transformedOrderBuilderState.costBreakdown?.total || 0;
      const quantity = selectedVersion?.quantity || transformedOrderBuilderState.totalUnits || transformedOrderBuilderState.costBreakdown?.quantity || 1;

      const quoteOrderData = {
        id: quoteOrderId,
        sessionId: sessionId,
        status: 'COMPLETED',
        title: `Quote for Custom Cap - ${quantity} pieces`,
        customerEmail: customerEmail,
        customerName: customerName,
        customerPhone: '',
        customerCompany: customerCompany,
        productType: 'Custom Cap',
        quantities: { quantity: quantity },
        colors: transformedOrderBuilderState?.capStyleSetup?.colors || {},
        logoRequirements: {
          logos: transformedOrderBuilderState?.customization?.logoDetails || []
        },
        customizationOptions: {
          accessories: transformedOrderBuilderState?.customization?.accessories || [],
          moldCharges: selectedVersion?.setupFees || transformedOrderBuilderState?.costBreakdown?.logoSetupCosts || 0,
          delivery: transformedOrderBuilderState?.delivery || {}
        },
        estimatedCosts: {
          total: totalCost,
          baseProductCost: selectedVersion?.capCosts || transformedOrderBuilderState?.costBreakdown?.baseCost || 0,
          logosCost: selectedVersion?.logoCosts || transformedOrderBuilderState?.costBreakdown?.logoUnitCosts || 0,
          deliveryCost: selectedVersion?.deliveryCosts || transformedOrderBuilderState?.costBreakdown?.deliveryCost || 0
        },
        aiSummary: `Quote generated for ${quantity} Custom Cap(s) with total cost of $${totalCost}`,
        uploadedFiles: uploadedFiles,
        attachments: uploadedFiles.map((url: string) => ({ url, type: 'file' })),
        complexity: 'SIMPLE',
        priority: 'NORMAL',
        createdAt: now,
        updatedAt: now,
        lastActivityAt: now
      };

      const { data: createdQuoteOrder, error: quoteOrderInsertError } = await supabaseAdmin
        .from('QuoteOrder')
        .insert(quoteOrderData)
        .select()
        .single();

      if (quoteOrderInsertError) {
        console.error('❌ Failed to create QuoteOrder:', quoteOrderInsertError);
        throw new Error(`Failed to create QuoteOrder: ${quoteOrderInsertError.message}`);
      }

      console.log('✅ QuoteOrder created with ID:', createdQuoteOrder.id);

      // Create QuoteOrderFile records for uploaded files
      if (uploadedFiles && uploadedFiles.length > 0) {
        console.log('📁 Creating QuoteOrderFile records for', uploadedFiles.length, 'files');

        const fileRecords = uploadedFiles.map((fileUrl: string, index: number) => {
          const filename = fileUrl.split('/').pop() || `file_${index + 1}`;
          const ext = filename.includes('.') ? filename.split('.').pop()?.toLowerCase() : '';

          let fileType = 'unknown';
          switch (ext) {
            case 'pdf': fileType = 'application/pdf'; break;
            case 'png': fileType = 'image/png'; break;
            case 'jpg':
            case 'jpeg': fileType = 'image/jpeg'; break;
            case 'gif': fileType = 'image/gif'; break;
            case 'svg': fileType = 'image/svg+xml'; break;
            case 'ai': fileType = 'application/illustrator'; break;
            case 'eps': fileType = 'application/postscript'; break;
            default: fileType = `file/${ext}`;
          }

          const isLogo = ['png', 'jpg', 'jpeg', 'gif', 'svg'].includes(ext || '');

          return {
            id: `qof_${Date.now()}_${index}`,
            quoteOrderId: createdQuoteOrder.id,
            originalName: filename,
            fileName: filename,
            fileType: fileType,
            fileSize: 0, // We don't have size info, set to 0
            filePath: fileUrl,
            bucket: 'uploads',
            category: isLogo ? 'LOGO' : 'OTHER',
            isLogo: isLogo,
            description: `File uploaded via support chat`,
            metadata: { uploadSource: 'support_chat', sessionId },
            createdAt: now,
            updatedAt: now
          };
        });

        const { error: filesError } = await supabaseAdmin
          .from('QuoteOrderFile')
          .insert(fileRecords);

        if (filesError) {
          console.error('❌ Failed to create QuoteOrderFile records:', filesError);
          // Don't fail the whole operation for file records
        } else {
          console.log('✅ Created', fileRecords.length, 'QuoteOrderFile records');
        }
      }

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
          userId: existingConv.userId || user.id
          // Removed auto-approval - let users choose to accept/reject quotes
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

      // 4. Update QuoteOrder status to COMPLETED (ready for acceptance)
      console.log('📋 Updating QuoteOrder status to COMPLETED');

      const { error: quoteOrderError } = await supabaseAdmin
        .from('QuoteOrder')
        .update({
          status: 'COMPLETED',
          completedAt: now,
          lastActivityAt: now
        })
        .eq('id', quoteOrderId);

      if (quoteOrderError) throw quoteOrderError;
      console.log('✅ QuoteOrder status updated to COMPLETED - ready for user to accept/reject');

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
          const stateInfo = extractStateForTitleGeneration(transformedOrderBuilderState);
          
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
        const stateInfo = extractStateForTitleGeneration(transformedOrderBuilderState);
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
      message: 'Quote saved successfully - ready for acceptance',
      data: {
        conversationId: result.conversation.id,
        quoteOrderId,
        orderBuilderStateId: result.orderBuilderState.id,
        hasQuote: result.conversation.hasQuote,
        quoteCompletedAt: result.conversation.quoteCompletedAt,
        title: generatedTitle,
        titleGenerated: !!generatedTitle,
        titleGenerationError,
        orderCreated: false,
        orderId: null,
        autoAccepted: false,
        readyForAcceptance: true
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