import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth-helpers';

interface RouteParams {
  id: string;
}

export async function GET(
  request: NextRequest, 
  { params }: { params: Promise<RouteParams> }
) {
  console.log('🔄 Restore Order Builder State API - Starting');
  
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const resolvedParams = await params;
    const conversationId = resolvedParams.id;
    if (!conversationId) {
      return NextResponse.json({ error: 'Conversation ID is required' }, { status: 400 });
    }

    console.log('🔍 Restoring state for conversation:', conversationId, 'for user:', user.id);

    // Debug: Check what conversations exist for this user
    const { data: allUserConversations, error: debugError } = await supabaseAdmin
      .from('Conversation')
      .select('id, title, sessionId, hasQuote')
      .eq('userId', user.id)
      .limit(10);
    
    console.log('🔍 Debug - User conversations:', {
      userId: user.id,
      conversationCount: allUserConversations?.length || 0,
      conversations: allUserConversations?.map(c => ({
        id: c.id,
        title: c.title,
        sessionId: c.sessionId,
        hasQuote: c.hasQuote
      })) || [],
      lookingFor: conversationId
    });

    // Fetch conversation first
    const { data: conversation, error: conversationError } = await supabaseAdmin
      .from('Conversation')
      .select(`
        *,
        ConversationQuotes (
          *,
          QuoteOrder (
            id,
            sessionId,
            status,
            completedAt,
            customerEmail,
            customerName,
            customerPhone,
            customerCompany,
            quantities,
            colors,
            logoRequirements,
            customizationOptions,
            estimatedCosts,
            complexity,
            priority
          )
        ),
        ConversationMessage (
          role,
          content,
          createdAt
        )
      `)
      .eq('id', conversationId)
      .eq('userId', user.id)
      .order('createdAt', { ascending: false, referencedTable: 'ConversationMessage' })
      .limit(5, { referencedTable: 'ConversationMessage' })
      .single();

    if (conversationError || !conversation) {
      console.log('❌ Conversation lookup failed:', {
        conversationId,
        userId: user.id,
        error: conversationError,
        conversationFound: !!conversation
      });
      return NextResponse.json({ 
        error: 'No saved conversations with quotes found',
        message: 'This conversation either does not exist, has no saved quotes, or you do not have access to it. Generate a new quote first to save conversation state.',
        details: {
          searchedId: conversationId,
          userConversations: allUserConversations?.length || 0,
          availableConversations: allUserConversations?.map(c => ({id: c.id, title: c.title, hasQuote: c.hasQuote})) || []
        }
      }, { status: 404 });
    }

    // Check if conversation has a quote
    if (!conversation.hasQuote) {
      return NextResponse.json({
        error: 'Conversation does not have a completed quote',
        hasQuote: conversation.hasQuote
      }, { status: 404 });
    }

    // Fetch the OrderBuilderState using sessionId (which should match)
    const { data: orderBuilderState, error: orderBuilderError } = await supabaseAdmin
      .from('OrderBuilderState')
      .select('*')
      .eq('sessionId', conversation.sessionId)
      .single();

    if (orderBuilderError || !orderBuilderState) {
      console.log('❌ OrderBuilderState lookup failed:', {
        sessionId: conversation.sessionId,
        error: orderBuilderError
      });
      return NextResponse.json({
        error: 'Order builder state not found for this conversation',
        details: orderBuilderError?.message
      }, { status: 404 });
    }

    console.log('✅ Conversation found with OrderBuilderState');

    const orderBuilderRecord = orderBuilderState;

    // Helper function to safely parse JSON
    const safeJSONParse = (jsonString: string | null, fieldName: string) => {
      if (!jsonString) return null;
      try {
        return JSON.parse(jsonString);
      } catch (parseError) {
        console.error(`❌ Failed to parse ${fieldName}:`, parseError);
        console.error(`❌ Invalid JSON content for ${fieldName}:`, jsonString.substring(0, 100) + '...');
        return null;
      }
    };

    // Prepare Order Builder state data
    console.log('📊 Preparing Order Builder state');
    const fullState = {
      sessionId: orderBuilderRecord.sessionId,
      isCompleted: orderBuilderRecord.isCompleted,
      completedAt: orderBuilderRecord.completedAt?.toISOString(),
      totalCost: orderBuilderRecord.totalCost ? parseFloat(orderBuilderRecord.totalCost.toString()) : undefined,
      currentStep: orderBuilderRecord.currentStep,
      capStyleSetup: safeJSONParse(orderBuilderRecord.capStyleSetup, 'capStyleSetup'),
      customization: safeJSONParse(orderBuilderRecord.customization, 'customization'),
      delivery: safeJSONParse(orderBuilderRecord.delivery, 'delivery'),
      costBreakdown: safeJSONParse(orderBuilderRecord.costBreakdown, 'costBreakdown'),
      productionTimeline: safeJSONParse(orderBuilderRecord.productionTimeline, 'productionTimeline'),
      packaging: safeJSONParse(orderBuilderRecord.packaging, 'packaging'),
      quoteData: safeJSONParse(orderBuilderRecord.quoteData, 'quoteData'),
      metadata: safeJSONParse(orderBuilderRecord.metadata, 'metadata')
    };

    // Basic state validation
    console.log('🔍 Validating restored state');
    const validation = {
      isValid: !!fullState.sessionId,
      errors: fullState.sessionId ? [] : ['Missing session ID'],
      warnings: []
    };

    // Calculate state completeness
    const completeness = {
      percentage: fullState.isCompleted ? 100 : 0,
      completedSteps: fullState.isCompleted ? 7 : 0,
      totalSteps: 7
    };

    // Update restoration tracking
    const { error: updateError } = await supabaseAdmin
      .from('OrderBuilderState')
      .update({
        lastRestoredAt: new Date().toISOString(),
        restorationCount: (orderBuilderRecord.restorationCount || 0) + 1
      })
      .eq('id', orderBuilderRecord.id);

    console.log('✅ State restoration completed successfully');

    // Prepare response data
    const responseData = {
      success: true,
      conversationId: conversation.id,
      conversationTitle: conversation.title,
      hasQuote: conversation.hasQuote,
      quoteCompletedAt: conversation.quoteCompletedAt?.toISOString(),
      
      // Order Builder State
      orderBuilderState: fullState,
      stateMetadata: {
        id: orderBuilderRecord.id,
        sessionId: orderBuilderRecord.sessionId,
        stateVersion: orderBuilderRecord.stateVersion,
        createdAt: orderBuilderRecord.createdAt.toISOString(),
        updatedAt: orderBuilderRecord.updatedAt.toISOString(),
        lastRestoredAt: new Date().toISOString(),
        restorationCount: (orderBuilderRecord.restorationCount || 0) + 1,
        completeness
      },

      // Validation results
      validation: {
        isValid: validation.isValid,
        errors: validation.errors,
        warnings: validation.warnings
      },

      // Related quote data
      quotes: conversation.ConversationQuotes.map(cq => ({
        quoteId: cq.id,
        quoteOrderId: cq.quoteOrderId,
        isMainQuote: cq.isMainQuote,
        quoteOrder: cq.QuoteOrder ? {
          ...cq.QuoteOrder,
          estimatedCosts: cq.QuoteOrder.estimatedCosts || null,
          quantities: cq.QuoteOrder.quantities || null,
          colors: cq.QuoteOrder.colors || null,
          logoRequirements: cq.QuoteOrder.logoRequirements || null,
          customizationOptions: cq.QuoteOrder.customizationOptions || null
        } : null
      })),

      // Recent conversation context
      recentMessages: conversation.ConversationMessage.map(msg => ({
        role: msg.role,
        content: msg.content.substring(0, 500), // Truncate for performance
        createdAt: msg.createdAt.toISOString()
      })),

      // Conversation metadata
      conversationMetadata: {
        context: conversation.context,
        status: conversation.status,
        tags: conversation.tags,
        lastActivity: conversation.lastActivity.toISOString(),
        messageCount: conversation.ConversationMessage.length
      }
    };

    // Validate that response can be JSON stringified before returning
    try {
      JSON.stringify(responseData);
      console.log('✅ Response data validated, returning successful response');
      return NextResponse.json(responseData);
    } catch (stringifyError) {
      console.error('❌ Response data contains non-serializable content:', stringifyError);
      return NextResponse.json({
        success: false,
        error: 'Response data contains non-serializable content',
        details: stringifyError instanceof Error ? stringifyError.message : 'Unknown serialization error'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ Error restoring Order Builder state:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to restore Order Builder state',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// POST endpoint to manually trigger state restoration with updates
export async function POST(
  request: NextRequest, 
  { params }: { params: Promise<RouteParams> }
) {
  console.log('🔄 Manual State Restoration API - Starting');
  
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const resolvedParams = await params;
    const conversationId = resolvedParams.id;
    const body = await request.json();
    const { sessionId, updateCurrentStep, restoreToStep } = body;

    if (!conversationId) {
      return NextResponse.json({ error: 'Conversation ID is required' }, { status: 400 });
    }

    console.log('🔄 Manual restoration for conversation:', conversationId);

    // First, get the current state using the GET logic
    const getRequest = new Request(request.url.replace(/\/restore-state.*$/, `/restore-state`), {
      method: 'GET',
      headers: request.headers
    });
    
    const getResponse = await GET(getRequest as NextRequest, { params: Promise.resolve(resolvedParams) });
    
    if (!getResponse.ok) {
      return getResponse;
    }

    const currentData = await getResponse.json();
    
    if (!currentData.success) {
      return NextResponse.json(currentData);
    }

    // Apply any requested updates
    let updatedState = { ...currentData.orderBuilderState };
    let needsUpdate = false;

    if (updateCurrentStep && updateCurrentStep !== updatedState.currentStep) {
      updatedState.currentStep = updateCurrentStep;
      needsUpdate = true;
    }

    if (restoreToStep && restoreToStep !== updatedState.currentStep) {
      updatedState.currentStep = restoreToStep;
      needsUpdate = true;
    }

    if (sessionId && sessionId !== updatedState.sessionId) {
      updatedState.sessionId = sessionId;
      needsUpdate = true;
    }

    // Update the database if changes were made
    if (needsUpdate) {
      console.log('💾 Updating Order Builder state with manual changes');
      
      const { error: manualUpdateError } = await supabaseAdmin
        .from('OrderBuilderState')
        .update({
          currentStep: updatedState.currentStep,
          sessionId: updatedState.sessionId,
          lastRestoredAt: new Date().toISOString(),
          restorationCount: (currentData.stateMetadata.restorationCount || 0) + 1,
          metadata: JSON.stringify({
            ...JSON.parse(currentData.stateMetadata.metadata || '{}'),
            manuallyUpdated: true,
            lastManualUpdate: new Date().toISOString(),
            updateReason: 'manual_restoration'
          })
        })
        .eq('id', currentData.stateMetadata.id);

      console.log('✅ Manual state updates applied');
    }

    return NextResponse.json({
      ...currentData,
      manuallyUpdated: needsUpdate,
      appliedChanges: needsUpdate ? {
        currentStep: updatedState.currentStep,
        sessionId: updatedState.sessionId
      } : null
    });

  } catch (error) {
    console.error('❌ Error in manual state restoration:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to perform manual state restoration',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}