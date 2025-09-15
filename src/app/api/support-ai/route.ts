/**
 * SUPPORT PAGE AI API ROUTE - FORMAT #8 ONLY
 *
 * Uses ONLY Format #8's step-by-step pricing system
 * Completely eliminates Format #1 hardcoded pricing
 * Order Builder compatible structure with accurate Supabase pricing
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  analyzeCustomerRequirements,
  fetchBlankCapCosts,
  fetchPremiumUpgrades,
  fetchLogoSetupCosts,
  fetchAccessoriesCosts,
  fetchDeliveryCosts,
  generateStructuredResponse,
  generateConversationalUpdateResponse
} from '@/lib/pricing/format8-functions';
import { AI_ASSISTANTS, formatAssistantResponse } from '@/lib/ai-assistants-config';

interface StepByStepRequest {
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
    console.log('🎯 [SUPPORT AI - FORMAT #8] Pure Format #8 pricing request');

    const {
      message,
      quantity = 144,
      conversationHistory = [],
      conversationId,
      sessionId
    } = await request.json();

    if (!message?.trim()) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    console.log('🔄 [FORMAT #8 DIRECT] Using Format #8 functions directly');

    // Step 1: Analyze customer requirements with conversation context
    const requirements = await analyzeCustomerRequirements(message, conversationHistory);
    console.log('📋 [STEP-1] Customer requirements analyzed:', requirements);

    // Step 2: Fetch Blank Cap costs from Supabase
    const capDetails = await fetchBlankCapCosts(requirements);
    console.log('✅ [STEP-2] Blank cap costs fetched:', capDetails);

    // Step 3: Fetch Premium upgrades (optional)
    const premiumUpgrades = await fetchPremiumUpgrades(requirements);
    console.log('✅ [STEP-3] Premium upgrades fetched:', premiumUpgrades);

    // Step 4: Fetch Logo setup costs (optional)
    const logoSetup = await fetchLogoSetupCosts(requirements);
    console.log('✅ [STEP-4] Logo setup costs fetched:', logoSetup);

    // Step 5: Fetch Accessories costs (optional)
    const accessories = await fetchAccessoriesCosts(requirements);
    console.log('✅ [STEP-5] Accessories costs fetched:', accessories);

    // Step 6: Fetch Delivery costs
    const delivery = await fetchDeliveryCosts(requirements);
    console.log('✅ [STEP-6] Delivery costs fetched:', delivery);

    // ENHANCED: Generate AI response with conversational context awareness
    const conversationalContext = requirements.conversationalContext;
    let aiResponse;

    if (conversationalContext?.hasContext && conversationalContext.detectedChanges.length > 0) {
      // Generate conversational update response
      aiResponse = generateConversationalUpdateResponse(
        capDetails, premiumUpgrades, logoSetup, accessories, delivery,
        conversationalContext
      );
    } else {
      // Generate standard structured response
      aiResponse = generateStructuredResponse(capDetails, premiumUpgrades, logoSetup, accessories, delivery, requirements);
    }

    // Create structured quote data for Order Builder with conversational context
    const structuredQuoteData = {
      capDetails: {
        productName: capDetails.productName,
        panelCount: capDetails.panelCount,
        unitPrice: capDetails.unitPrice,
        quantity: requirements.quantity,
        size: requirements.size,
        color: requirements.color,
        colors: requirements.colors,
        profile: capDetails.profile,
        billShape: capDetails.billShape,
        structure: capDetails.structure,
        fabric: premiumUpgrades.fabric?.name || 'Standard',
        closure: premiumUpgrades.closure?.name || 'Snapback',
        stitch: 'Standard'
      },
      customization: {
        logos: logoSetup.logos || [],
        accessories: accessories.items || [],
        logoSetup: logoSetup.summary || 'None'
      },
      delivery: {
        method: delivery.method,
        leadTime: delivery.leadTime,
        totalCost: delivery.totalCost,
        address: null
      },
      pricing: {
        total: capDetails.totalCost + (premiumUpgrades.totalCost || 0) + (logoSetup.totalCost || 0) + (accessories.totalCost || 0) + delivery.totalCost,
        baseProductCost: capDetails.totalCost,
        logosCost: logoSetup.totalCost || 0,
        accessoriesCost: accessories.totalCost || 0,
        deliveryCost: delivery.totalCost,
        premiumFabricCost: premiumUpgrades.fabric?.totalCost || 0,
        premiumClosureCost: premiumUpgrades.closure?.totalCost || 0,
        quantity: requirements.quantity
      },

      // ENHANCED: Include conversational context metadata
      conversationalContext: conversationalContext,

      // CRITICAL FIX: Debug information for troubleshooting
      _debugInfo: {
        requirementsColor: requirements.color,
        requirementsColors: requirements.colors,
        logoCount: logoSetup.logos?.length || 0,
        accessoryCount: accessories.items?.length || 0,
        conversationalHasContext: conversationalContext?.hasContext,
        detectedChanges: conversationalContext?.detectedChanges?.length || 0
      }
    };

    const capCraftAI = AI_ASSISTANTS.QUOTE_MASTER;
    const formattedResponse = formatAssistantResponse(capCraftAI, aiResponse);

    const format8Data = {
      ...formattedResponse,
      message: aiResponse,
      quoteData: structuredQuoteData,
      conversationId,
      metadata: {
        ...formattedResponse.metadata,
        intent: 'pricing_request',
        timestamp: new Date().toISOString(),
        stepByStepWorkflow: true,
        completedSteps: 6,
        dataSource: 'supabase',
        requirements
      }
    };

    console.log('✅ [FORMAT #8 DIRECT] Format #8 response generated');

    // Transform Format #8 response to Order Builder compatible structure
    const orderBuilderResponse = transformToOrderBuilderFormat(format8Data);

    return NextResponse.json(orderBuilderResponse);

  } catch (error: unknown) {
    console.error('❌ [SUPPORT AI - FORMAT #8] Processing failed:', error);

    const capCraftAI = AI_ASSISTANTS.QUOTE_MASTER;
    const errorResponse = formatAssistantResponse(capCraftAI, "I apologize, but I'm having trouble creating your quote right now. Please try rephrasing your request with specific details like quantity, colors, and customization requirements.");

    return NextResponse.json(
      {
        success: false,
        error: 'AI processing failed',
        message: 'I encountered an issue processing your request. Please try rephrasing your message or contact support.',
        details: error instanceof Error ? error.message : 'Unknown error',
        ...errorResponse
      },
      { status: 500 }
    );
  }
}

/**
 * Transform Format #8 response to Order Builder compatible structure
 * This function maps Format #8's quoteData structure to the expected Order Builder format
 */
function transformToOrderBuilderFormat(format8Data: any) {
  console.log('🔄 [TRANSFORM] Converting Format #8 to Order Builder structure');

  const { quoteData, message, metadata } = format8Data;

  if (!quoteData) {
    throw new Error('No quote data received from Format #8');
  }

  // Extract conversational context from quote data
  const conversationalContext = quoteData.conversationalContext;

  // Extract pricing breakdown from Format #8's structured data
  const {
    capDetails,
    customization,
    delivery,
    pricing
  } = quoteData;

  // Build Order Builder compatible response
  const orderBuilderResponse = {
    success: true,
    message: message,

    // Format #8's quoteData is already Order Builder compatible
    quoteData: quoteData,

    // Map to expected Order Builder structure
    orderBuilder: {
      capStyle: {
        completed: true, // Format #8 always provides cap details
        status: 'green' as const,
        data: {
          productName: capDetails.productName,
          priceTier: capDetails.profile, // Map profile to tier for compatibility
          quantity: pricing.quantity,
          panelCount: capDetails.panelCount,
          color: capDetails.color,
          colors: capDetails.colors,
          size: capDetails.size,
          // CRITICAL FIX: Add debug fields for troubleshooting
          _debug: {
            sourceColor: capDetails.color,
            sourceColors: capDetails.colors,
            conversationalUpdate: conversationalContext?.isConversationalUpdate || false
          }
        },
        cost: pricing.baseProductCost
      },

      customization: {
        completed: (customization.logos && customization.logos.length > 0) ||
                  (customization.accessories && customization.accessories.length > 0),
        status: (customization.logos && customization.logos.length > 0) ||
                (customization.accessories && customization.accessories.length > 0) ? 'green' as const : 'empty' as const,
        items: {
          logoSetup: customization.logos && customization.logos.length > 0,
          accessories: customization.accessories && customization.accessories.length > 0,
          moldCharges: customization.logos && customization.logos.some((logo: any) => logo.moldCharge > 0)
        },
        logoPositions: customization.logos ? customization.logos.map((logo: any) => logo.location || logo.position || 'Unknown') : [],
        logoSetup: customization.logos || [],
        premiumUpgrades: {
          fabric: capDetails.fabric !== 'Standard' ? capDetails.fabric : null,
          closure: capDetails.closure || null
        },
        cost: pricing.logosCost + (pricing.premiumFabricCost || 0) + (pricing.premiumClosureCost || 0) + (pricing.accessoriesCost || 0)
      },

      accessories: {
        completed: customization.accessories && customization.accessories.length > 0,
        status: customization.accessories && customization.accessories.length > 0 ? 'green' as const : 'empty' as const,
        data: customization.accessories || [],
        cost: pricing.accessoriesCost
      },

      delivery: {
        completed: true, // Format #8 always provides delivery
        status: 'green' as const,
        data: {
          method: delivery.method,
          timeline: delivery.leadTime,
          days: delivery.leadTime
        },
        cost: pricing.deliveryCost
      },

      costBreakdown: {
        available: true, // Format #8 always has complete pricing
        totalCost: pricing.total,
        breakdown: {
          capStyle: pricing.baseProductCost,
          customization: pricing.logosCost + (pricing.premiumFabricCost || 0) + (pricing.premiumClosureCost || 0),
          accessories: pricing.accessoriesCost,
          delivery: pricing.deliveryCost
        }
      }
    },

    // ENHANCED: Conversation continuation with comprehensive context
    conversationContinuation: {
      hasContext: conversationalContext?.hasContext || false,
      detectedChanges: conversationalContext?.detectedChanges || [],
      changedSections: conversationalContext?.orderBuilderDelta?.changedSections || [],
      visualIndicators: conversationalContext?.orderBuilderDelta?.visualIndicators || {},
      isConversationalUpdate: conversationalContext?.isConversationalUpdate || false,
      effectiveMessage: conversationalContext?.effectiveMessage || format8Data.message
    },

    // No errors from Format #8's reliable system
    errors: [],

    // All steps completed (Format #8 provides comprehensive quotes)
    stepProgress: {
      step1: 'success',
      step2: customization.logos && customization.logos.length > 0 ? 'success' : 'pending',
      step3: customization.logos && customization.logos.length > 0 ? 'success' : 'pending',
      step4: customization.accessories && customization.accessories.length > 0 ? 'success' : 'pending',
      step5: 'success'
    },

    // Pass through Format #8's metadata
    metadata: {
      ...metadata,
      transformedFromFormat8: true,
      originalFormat8Data: format8Data
    }
  };

  console.log('✅ [TRANSFORM] Order Builder structure created:', {
    totalCost: orderBuilderResponse.orderBuilder.costBreakdown.totalCost,
    completedSections: Object.values(orderBuilderResponse.orderBuilder).filter((section: any) =>
      section.completed === true
    ).length
  });

  return orderBuilderResponse;
}