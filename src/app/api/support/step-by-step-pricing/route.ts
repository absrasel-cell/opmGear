import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import {
  analyzeCustomerRequirements,
  fetchBlankCapCosts,
  fetchPremiumUpgrades,
  fetchLogoSetupCosts,
  fetchAccessoriesCosts,
  fetchDeliveryCosts,
  generateStructuredResponse
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
    const body: StepByStepRequest = await request.json();
    const { message, intent, conversationHistory, userProfile, conversationId, sessionId } = body;

    if (!message?.trim()) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    console.log('🎯 [STEP-BY-STEP] Starting modular pricing workflow');

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

    // Generate AI response based on fetched data
    const aiResponse = generateStructuredResponse(capDetails, premiumUpgrades, logoSetup, accessories, delivery);

    // DEBUG: Log logo setup details
    console.log('🔍 [DEBUG] Logo setup details:', {
      logoSetupTotalCost: logoSetup.totalCost,
      logoSetupLogos: logoSetup.logos,
      individualMoldCharges: logoSetup.logos ? logoSetup.logos.map((l: any) => ({ type: l.type, moldCharge: l.moldCharge })) : []
    });

    // Create structured quote data for Order Builder
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
        closure: premiumUpgrades.closure?.name || requirements.closure || 'Snapback',
        stitch: 'Standard'
      },
      customization: {
        logos: logoSetup.logos || [],
        accessories: accessories.items || [],
        logoSetup: logoSetup.summary || 'None',
        totalMoldCharges: logoSetup.logos ? logoSetup.logos.reduce((sum: number, logo: any) => sum + (logo.moldCharge || 0), 0) : 0
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
        logosCostWithoutMold: logoSetup.logos ? logoSetup.logos.reduce((sum: number, logo: any) => sum + (logo.totalCost || 0), 0) : 0,
        moldCharges: logoSetup.logos ? logoSetup.logos.reduce((sum: number, logo: any) => sum + (logo.moldCharge || 0), 0) : 0,
        accessoriesCost: accessories.totalCost || 0,
        deliveryCost: delivery.totalCost,
        premiumFabricCost: premiumUpgrades.fabric?.totalCost || 0,
        premiumClosureCost: premiumUpgrades.closure?.totalCost || 0,
        quantity: requirements.quantity
      }
    };

    const capCraftAI = AI_ASSISTANTS.QUOTE_MASTER;
    const formattedResponse = formatAssistantResponse(capCraftAI, aiResponse);

    return NextResponse.json({
      ...formattedResponse,
      message: aiResponse,
      quoteData: structuredQuoteData,
      conversationId,
      metadata: {
        ...formattedResponse.metadata,
        intent,
        timestamp: new Date().toISOString(),
        stepByStepWorkflow: true,
        completedSteps: 6,
        dataSource: 'supabase',
        requirements
      }
    });

  } catch (error: unknown) {
    console.error('Step-by-step pricing error:', error);

    const capCraftAI = AI_ASSISTANTS.QUOTE_MASTER;
    const errorResponse = formatAssistantResponse(capCraftAI, "I apologize, but I'm having trouble creating your quote right now. Please try rephrasing your request with specific details like quantity, colors, and customization requirements.");

    return NextResponse.json(
      {
        ...errorResponse,
        error: 'Processing failed'
      },
      { status: 500 }
    );
  }
}