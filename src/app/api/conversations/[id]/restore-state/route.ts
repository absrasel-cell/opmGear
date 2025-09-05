import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth-helpers';
import { 
  deserializeOrderBuilderState, 
  validateOrderBuilderState,
  calculateStateCompleteness,
  OrderBuilderState 
} from '@/lib/order-builder-state';

interface RouteParams {
  id: string;
}

export async function GET(
  request: NextRequest, 
  { params }: { params: RouteParams }
) {
  console.log('🔄 Restore Order Builder State API - Starting');
  
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const conversationId = params.id;
    if (!conversationId) {
      return NextResponse.json({ error: 'Conversation ID is required' }, { status: 400 });
    }

    console.log('🔍 Restoring state for conversation:', conversationId);

    // Fetch conversation with OrderBuilderState and related data
    const conversation = await prisma.conversation.findUnique({
      where: { 
        id: conversationId,
        userId: user.id // Security: ensure user owns the conversation
      },
      include: {
        OrderBuilderState: true,
        ConversationQuotes: {
          include: {
            QuoteOrder: {
              select: {
                id: true,
                sessionId: true,
                status: true,
                completedAt: true,
                customerEmail: true,
                customerName: true,
                customerPhone: true,
                customerCompany: true,
                totalUnits: true,
                quantities: true,
                colors: true,
                logoRequirements: true,
                customizationOptions: true,
                estimatedCosts: true,
                complexity: true,
                priority: true
              }
            }
          }
        },
        ConversationMessage: {
          orderBy: { createdAt: 'desc' },
          take: 5, // Get recent messages for context
          select: {
            role: true,
            content: true,
            createdAt: true
          }
        }
      }
    });

    if (!conversation) {
      return NextResponse.json({ 
        error: 'Conversation not found or access denied' 
      }, { status: 404 });
    }

    // Check if conversation has a quote
    if (!conversation.hasQuote || !conversation.OrderBuilderState) {
      return NextResponse.json({
        error: 'Conversation does not have a completed quote with saved state',
        hasQuote: conversation.hasQuote,
        hasOrderBuilderState: !!conversation.OrderBuilderState
      }, { status: 404 });
    }

    console.log('✅ Conversation found with OrderBuilderState');

    const orderBuilderRecord = conversation.OrderBuilderState;

    // Deserialize the Order Builder state
    console.log('📊 Deserializing Order Builder state');
    const deserializedState = deserializeOrderBuilderState({
      capStyleSetup: orderBuilderRecord.capStyleSetup as string | null,
      customization: orderBuilderRecord.customization as string | null,
      delivery: orderBuilderRecord.delivery as string | null,
      costBreakdown: orderBuilderRecord.costBreakdown as string | null,
      productionTimeline: orderBuilderRecord.productionTimeline as string | null,
      packaging: orderBuilderRecord.packaging as string | null,
      quoteData: orderBuilderRecord.quoteData as string | null,
      metadata: orderBuilderRecord.metadata as string | null
    });

    // Add database metadata to the state
    const fullState: OrderBuilderState = {
      ...deserializedState,
      sessionId: orderBuilderRecord.sessionId,
      isCompleted: orderBuilderRecord.isCompleted,
      completedAt: orderBuilderRecord.completedAt?.toISOString(),
      totalCost: orderBuilderRecord.totalCost ? parseFloat(orderBuilderRecord.totalCost.toString()) : undefined,
      totalUnits: orderBuilderRecord.totalUnits || undefined,
      currentStep: orderBuilderRecord.currentStep
    };

    // Validate the restored state
    console.log('🔍 Validating restored state');
    const validation = validateOrderBuilderState(fullState);

    // Calculate state completeness
    const completeness = calculateStateCompleteness(fullState);

    // Update restoration tracking
    await prisma.orderBuilderState.update({
      where: { id: orderBuilderRecord.id },
      data: {
        lastRestoredAt: new Date(),
        restorationCount: {
          increment: 1
        }
      }
    });

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
          estimatedCosts: cq.QuoteOrder.estimatedCosts ? JSON.parse(JSON.stringify(cq.QuoteOrder.estimatedCosts)) : null,
          quantities: cq.QuoteOrder.quantities ? JSON.parse(JSON.stringify(cq.QuoteOrder.quantities)) : null,
          colors: cq.QuoteOrder.colors ? JSON.parse(JSON.stringify(cq.QuoteOrder.colors)) : null,
          logoRequirements: cq.QuoteOrder.logoRequirements ? JSON.parse(JSON.stringify(cq.QuoteOrder.logoRequirements)) : null,
          customizationOptions: cq.QuoteOrder.customizationOptions ? JSON.parse(JSON.stringify(cq.QuoteOrder.customizationOptions)) : null
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

    return NextResponse.json(responseData);

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
  { params }: { params: RouteParams }
) {
  console.log('🔄 Manual State Restoration API - Starting');
  
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const conversationId = params.id;
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
    
    const getResponse = await GET(getRequest as NextRequest, { params });
    
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
      
      await prisma.orderBuilderState.update({
        where: { id: currentData.stateMetadata.id },
        data: {
          currentStep: updatedState.currentStep,
          sessionId: updatedState.sessionId,
          lastRestoredAt: new Date(),
          restorationCount: {
            increment: 1
          },
          metadata: JSON.stringify({
            ...JSON.parse(currentData.stateMetadata.metadata || '{}'),
            manuallyUpdated: true,
            lastManualUpdate: new Date().toISOString(),
            updateReason: 'manual_restoration'
          })
        }
      });

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