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
    const aiResponse = generateStructuredResponse(capDetails, premiumUpgrades, logoSetup, accessories, delivery, requirements);

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
      premiumUpgrades: {
        data: {
          fabrics: premiumUpgrades.fabrics || {},
          fabricCount: Object.keys(premiumUpgrades.fabrics || {}).length,
          totalFabricCost: premiumUpgrades.fabric?.totalCost || 0,
          closure: premiumUpgrades.closure ? {
            type: premiumUpgrades.closure.name,
            unitPrice: premiumUpgrades.closure.unitPrice,
            cost: premiumUpgrades.closure.totalCost
          } : null
        }
      },
      customization: {
        logos: logoSetup.logos ? logoSetup.logos.map((logo: any) => ({
          // CRITICAL FIX: Normalize logo structure for UI compatibility
          // Fresh quotes need same structure as saved conversations
          position: logo.location || logo.position || 'Front',  // UI expects 'position'
          name: logo.type || logo.name || 'Unknown',            // UI expects 'name'
          size: logo.size || 'Large',                           // UI expects 'size'
          type: logo.type || 'Unknown',                         // Keep for backward compatibility
          location: logo.location || logo.position || 'Front', // Keep for backward compatibility
          totalCost: logo.totalCost || 0,
          moldCharge: logo.moldCharge || 0,
          unitCost: logo.unitCost || 0,
          method: logo.type || 'Unknown'                        // Some UI components expect 'method'
        })) : [],
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

    // CRITICAL FIX: Save fresh AI quotes to database immediately
    // This ensures Accept Quote functionality works for fresh quotes, not just saved conversations
    let quoteOrderId = null;
    let savedToDatabase = false;

    if (conversationId && structuredQuoteData.pricing.total > 0) {
      try {
        console.log('🚀 CRITICAL FIX: Saving fresh AI quote to database for immediate Accept Quote support');

        const now = new Date().toISOString();
        quoteOrderId = `quote-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
        const conversationQuoteId = `cq-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

        // Generate unique sessionId for QuoteOrder
        const uniqueTimestamp = Date.now();
        const randomSuffix = Math.random().toString(36).substr(2, 12);
        const validSessionId = sessionId || `quote-${conversationId.slice(-8)}-${uniqueTimestamp}-${randomSuffix}`;

        // Extract customer info from userProfile or use defaults
        const customerEmail = userProfile?.email || 'customer@example.com';
        const customerName = userProfile?.name || 'Customer';

        // Create comprehensive QuoteOrder record
        const { data: createdQuoteOrder, error: quoteOrderError } = await supabaseAdmin
          .from('QuoteOrder')
          .insert({
            id: quoteOrderId,
            sessionId: validSessionId,
            title: `Fresh AI Quote - ${structuredQuoteData.capDetails.productName}`,
            status: 'COMPLETED',
            productType: structuredQuoteData.capDetails.productName,
            customerEmail: customerEmail,
            customerName: customerName,
            quantities: {
              quantity: structuredQuoteData.capDetails.quantity,
              totalUnits: structuredQuoteData.capDetails.quantity
            },
            estimatedCosts: {
              total: structuredQuoteData.pricing.total,
              breakdown: structuredQuoteData.pricing,
              stepByStepData: {
                pricing: structuredQuoteData.pricing,
                delivery: structuredQuoteData.delivery,
                capDetails: structuredQuoteData.capDetails,
                customization: structuredQuoteData.customization,
                premiumUpgrades: structuredQuoteData.premiumUpgrades
              }
            },
            customizationOptions: {
              ...structuredQuoteData.customization,
              deliveryRequirements: structuredQuoteData.delivery
            },
            logoRequirements: structuredQuoteData.customization?.logos || {},
            extractedSpecs: {
              profile: structuredQuoteData.capDetails.profile || 'Not specified',
              billShape: structuredQuoteData.capDetails.billShape || 'Not specified',
              structure: structuredQuoteData.capDetails.structure || 'Not specified',
              closure: structuredQuoteData.capDetails.closure || 'Not specified',
              fabric: structuredQuoteData.capDetails.fabric || 'Not specified',
              quantity: structuredQuoteData.capDetails.quantity,
              color: structuredQuoteData.capDetails.color,
              colors: structuredQuoteData.capDetails.colors ? [structuredQuoteData.capDetails.colors] : undefined,
              size: structuredQuoteData.capDetails.size,
              stitching: structuredQuoteData.capDetails.stitch,
              capDetails: structuredQuoteData.capDetails
            },
            priority: 'NORMAL',
            createdAt: now,
            updatedAt: now
          })
          .select()
          .single();

        if (quoteOrderError) {
          console.error('❌ Failed to create QuoteOrder for fresh AI quote:', quoteOrderError);
        } else {
          // Create ConversationQuotes bridge record
          const { error: conversationQuotesError } = await supabaseAdmin
            .from('ConversationQuotes')
            .insert({
              id: conversationQuoteId,
              conversationId: conversationId,
              quoteOrderId: quoteOrderId,
              isMainQuote: true,
              createdAt: now,
              updatedAt: now
            });

          if (conversationQuotesError) {
            console.error('❌ Failed to create ConversationQuotes bridge for fresh AI quote:', conversationQuotesError);
          } else {
            savedToDatabase = true;
            console.log('✅ Fresh AI quote saved to database successfully:', {
              quoteOrderId,
              conversationQuoteId,
              totalCost: structuredQuoteData.pricing.total,
              productName: structuredQuoteData.capDetails.productName,
              quantity: structuredQuoteData.capDetails.quantity
            });
          }
        }

      } catch (saveError) {
        console.error('❌ Error saving fresh AI quote to database:', saveError);
        // Continue with response even if database save fails
      }
    }

    return NextResponse.json({
      ...formattedResponse,
      message: aiResponse,
      quoteData: structuredQuoteData,
      conversationId,
      quoteOrderId: quoteOrderId,
      savedToDatabase: savedToDatabase,
      metadata: {
        ...formattedResponse.metadata,
        intent,
        timestamp: new Date().toISOString(),
        stepByStepWorkflow: true,
        completedSteps: 6,
        dataSource: 'supabase',
        requirements,
        quoteOrderId: quoteOrderId,
        savedToDatabase: savedToDatabase
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