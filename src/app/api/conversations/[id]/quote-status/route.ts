import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth-helpers';
import { QuoteEmailService } from '@/lib/email/quote-email-service';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: conversationId } = await params;
    const body = await request.json();
    const { status } = body;

    if (!conversationId) {
      return NextResponse.json({ error: 'Conversation ID is required' }, { status: 400 });
    }

    // Since we can't modify the enum easily, let's use the conversation status to track acceptance
    // The QuoteOrder status stays COMPLETED, but we'll update conversation metadata to track acceptance
    if (!status || !['APPROVED', 'REJECTED'].includes(status)) {
      return NextResponse.json({ error: 'Valid status (APPROVED or REJECTED) is required' }, { status: 400 });
    }

    console.log('🔄 Quote Status Update API - Conversation:', conversationId, 'Status:', status);

    // Use consistent authentication approach
    const user = await getCurrentUser(request);
    if (!user) {
      console.log('❌ No authenticated user found');
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const userId = user.id;
    console.log('✅ Authenticated user found:', userId);

    // First, try to find the conversation with userId filter
    let { data: conversation, error: conversationError } = await supabaseAdmin
      .from('Conversation')
      .select(`
        *,
        ConversationQuotes (
          id,
          isMainQuote,
          quoteOrderId,
          QuoteOrder (
            id,
            status
          )
        )
      `)
      .eq('id', conversationId)
      .eq('userId', userId)
      .single();

    // If not found with userId, try without userId filter (for guest->auth conversions)
    if (conversationError || !conversation) {
      console.log('🔍 Conversation not found with userId filter, trying without userId filter...');

      const { data: conversationWithoutUser, error: errorWithoutUser } = await supabaseAdmin
        .from('Conversation')
        .select(`
          *,
          ConversationQuotes (
            id,
            isMainQuote,
            quoteOrderId,
            QuoteOrder (
              id,
              status
            )
          )
        `)
        .eq('id', conversationId)
        .single();

      if (errorWithoutUser || !conversationWithoutUser) {
        console.error('❌ Conversation not found even without userId filter:', errorWithoutUser);
        return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
      }

      // Check if this conversation can be accessed by this user
      // Allow access if userId is null (guest conversation) or matches current user
      if (conversationWithoutUser.userId && conversationWithoutUser.userId !== userId) {
        console.error('❌ User does not have access to this conversation:', {
          conversationUserId: conversationWithoutUser.userId,
          currentUserId: userId
        });
        return NextResponse.json({ error: 'Not authorized to access this conversation' }, { status: 403 });
      }

      conversation = conversationWithoutUser;
      conversationError = null;
      console.log('✅ Found conversation without userId filter:', {
        conversationId: conversation.id,
        conversationUserId: conversation.userId,
        hasQuote: conversation.hasQuote,
        quoteCount: conversation.ConversationQuotes?.length || 0
      });
    } else {
      console.log('✅ Found conversation with userId filter:', {
        conversationId: conversation.id,
        hasQuote: conversation.hasQuote,
        quoteCount: conversation.ConversationQuotes?.length || 0
      });
    }

    if (conversationError || !conversation) {
      return NextResponse.json({ error: 'Conversation not found or not authorized' }, { status: 404 });
    }

    // Enhanced debugging for quote detection
    console.log('🔍 Checking quote data:', {
      hasQuote: conversation.hasQuote,
      conversationQuotesExists: !!conversation.ConversationQuotes,
      conversationQuotesLength: conversation.ConversationQuotes?.length || 0,
      conversationQuotesData: conversation.ConversationQuotes
    });

    // CRITICAL FIX: Enhanced quote detection and auto-creation for Accept Quote functionality
    // Check for quotes in both old system (metadata) and new system (ConversationQuotes + QuoteOrder)
    const hasLegacyQuote = conversation.hasQuote && conversation.metadata?.hasQuoteData;
    const hasNewQuote = conversation.ConversationQuotes && conversation.ConversationQuotes.length > 0;

    // CRITICAL FIX: Based on actual server logs, the structure is:
    // metadata.orderBuilder.pricing.total: 10196
    // metadata.orderBuilder.orderBuilderStatus.costBreakdown.completed: true
    // metadata.orderBuilder.quoteVersions.length: 1
    const hasOrderBuilderQuote = !!(
      conversation.metadata?.orderBuilder && (
        // Primary check: Order Builder with pricing data and completed status
        (conversation.metadata.orderBuilder.pricing?.total > 0 &&
         conversation.metadata.orderBuilder.orderBuilderStatus?.costBreakdown?.completed) ||
        // Secondary check: Order Builder with quote versions
        (conversation.metadata.orderBuilder.quoteVersions?.length > 0 &&
         conversation.metadata.orderBuilder.orderBuilderStatus?.costBreakdown?.completed) ||
        // Fallback legacy checks
        (conversation.metadata.orderBuilderStatus?.costBreakdown?.completed && conversation.metadata.currentQuoteData) ||
        (conversation.metadata.currentQuoteData?.totalCost && conversation.metadata.currentQuoteData.totalCost > 0)
      )
    );

    console.log('🔍 Quote detection analysis:', {
      hasQuote: conversation.hasQuote,
      hasLegacyQuote,
      hasNewQuote,
      hasOrderBuilderQuote,
      conversationQuotesCount: conversation.ConversationQuotes?.length || 0,
      metadataHasQuoteData: !!conversation.metadata?.hasQuoteData,
      metadataQuoteOrderId: conversation.metadata?.quoteOrderId,
      orderBuilderCompleted: !!conversation.metadata?.orderBuilderStatus?.costBreakdown?.completed,
      // Additional debugging for Order Builder structure
      hasOrderBuilderMetadata: !!conversation.metadata?.orderBuilder,
      orderBuilderPricingTotal: conversation.metadata?.orderBuilder?.pricing?.total,
      orderBuilderStatusCompleted: !!conversation.metadata?.orderBuilder?.orderBuilderStatus?.costBreakdown?.completed,
      orderBuilderQuoteVersionsLength: conversation.metadata?.orderBuilder?.quoteVersions?.length || 0,
      // More detailed metadata structure
      metadataKeys: conversation.metadata ? Object.keys(conversation.metadata) : [],
      orderBuilderKeys: conversation.metadata?.orderBuilder ? Object.keys(conversation.metadata.orderBuilder) : []
    });

    // If no quote found anywhere, return error
    if (!hasLegacyQuote && !hasNewQuote && !hasOrderBuilderQuote) {
      console.error('❌ No quote found in any system');
      return NextResponse.json({
        error: 'No quote found for this conversation',
        debug: {
          hasQuote: conversation.hasQuote,
          conversationId: conversation.id,
          hasLegacyQuote,
          hasNewQuote,
          hasOrderBuilderQuote,
          conversationQuotesExists: !!conversation.ConversationQuotes,
          conversationQuotesLength: conversation.ConversationQuotes?.length || 0,
          metadataHasQuoteData: !!conversation.metadata?.hasQuoteData,
          reason: 'No quote found in any system'
        }
      }, { status: 400 });
    }

    // NEW: Handle Order Builder quotes (step-by-step-pricing) - CREATE QuoteOrder on-demand
    if (hasOrderBuilderQuote && !hasNewQuote) {
      console.log('🚀 CRITICAL FIX: Creating QuoteOrder for Order Builder quote on Accept Quote');

      try {
        const now = new Date().toISOString();
        const quoteOrderId = `quote-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
        const conversationQuoteId = `cq-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

        // FIXED: Extract quote data from correct Order Builder metadata structure
        const orderBuilderData = conversation.metadata.orderBuilder || {};

        // DEBUG: Log the actual structure to identify correct paths
        console.log('🔍 DEBUG: orderBuilderData structure:', {
          orderBuilderDataKeys: Object.keys(orderBuilderData),
          pricing: orderBuilderData.pricing,
          capDetails: orderBuilderData.capDetails,
          hasPricing: !!orderBuilderData.pricing,
          hasCapDetails: !!orderBuilderData.capDetails
        });

        // CRITICAL FIX: Extract comprehensive quote information from Order Builder structure
        // Based on errorReport.txt: metadata.orderBuilder.pricing.total: $18,792.00
        const orderBuilderPricing = orderBuilderData.pricing || {};
        const totalCost = orderBuilderPricing.total || 0;

        // Extract product name from cap details
        const productName = orderBuilderData.capDetails?.productName || 'Custom Cap';

        // Extract quantity from cap details
        const quantity = orderBuilderData.capDetails?.quantity || 144;

        // CRITICAL FIX: Extract ALL detailed specifications for complete admin dashboard display
        const capDetails = orderBuilderData.capDetails || {};
        const customization = orderBuilderData.customization || {};
        const delivery = orderBuilderData.delivery || {};

        // CRITICAL FIX: Extract complete cost breakdown from Order Builder pricing
        const completeCostBreakdown = {
          total: totalCost,
          baseProductCost: orderBuilderPricing.baseProductCost || 0,
          logosCost: orderBuilderPricing.logosCost || 0,
          accessoriesCost: orderBuilderPricing.accessoriesCost || 0,
          premiumFabricCost: orderBuilderPricing.premiumFabricCost || 0,
          premiumClosureCost: orderBuilderPricing.premiumClosureCost || 0,
          deliveryCost: orderBuilderPricing.deliveryCost || 0,
          moldCharges: orderBuilderPricing.moldCharges || 0,
          setupFees: orderBuilderPricing.setupFees || 0,
          // Additional breakdown fields
          quantity: quantity,
          unitPrice: orderBuilderPricing.baseProductCost ? (orderBuilderPricing.baseProductCost / quantity) : 0
        };

        // CRITICAL FIX: Extract complete logo requirements with all details
        const logoRequirements = {
          logos: customization.logos || customization.logoDetails || [],
          totalLogoSetupCosts: orderBuilderPricing.moldCharges || orderBuilderPricing.setupFees || 0,
          totalLogoUnitCosts: orderBuilderPricing.logosCost || 0
        };

        // CRITICAL FIX: Extract complete customization options including all premium options
        const completeCustomizationOptions = {
          // Logo and branding
          logos: customization.logos || customization.logoDetails || [],
          moldCharges: orderBuilderPricing.moldCharges || 0,

          // Premium options
          premiumFabric: customization.premiumFabric || capDetails.fabric,
          premiumFabricCost: orderBuilderPricing.premiumFabricCost || 0,

          premiumClosure: customization.premiumClosure || capDetails.closure,
          premiumClosureCost: orderBuilderPricing.premiumClosureCost || 0,

          // Accessories
          accessories: customization.accessories || [],
          accessoriesCost: orderBuilderPricing.accessoriesCost || 0,

          // Delivery requirements
          delivery: {
            method: delivery.method || 'Standard',
            leadTime: delivery.leadTime || delivery.timeframe || '14-21 days',
            cost: delivery.cost || orderBuilderPricing.deliveryCost || 0,
            address: delivery.address || {},
            urgency: delivery.urgency || 'standard'
          },

          // Additional options that may be in customization
          bTapePrint: customization.bTapePrint,
          insideLabel: customization.insideLabel,
          specialInstructions: customization.instructions || customization.notes
        };

        // CRITICAL FIX: Create comprehensive extractedSpecs object that matches admin dashboard expectations
        const extractedSpecs = {
          // Basic cap specifications
          profile: capDetails.profile || 'Not specified',
          billShape: capDetails.shape || capDetails.billShape || 'Not specified',
          structure: capDetails.structure || 'Not specified',
          closure: capDetails.closure || 'Not specified',
          fabric: capDetails.fabric || 'Not specified',
          stitching: capDetails.stitching || capDetails.stitch || 'Not specified',

          // Quantity and sizing
          quantity: quantity,
          color: capDetails.color,
          colors: capDetails.colors ? (Array.isArray(capDetails.colors) ? capDetails.colors : [capDetails.colors]) : undefined,
          size: capDetails.size,
          sizes: capDetails.sizes ? (Array.isArray(capDetails.sizes) ? capDetails.sizes : [capDetails.sizes]) : undefined,

          // Additional specifications for complete display
          style: capDetails.style || capDetails.productName,
          unitPrice: completeCostBreakdown.unitPrice,

          // Customization summary for quick reference
          hasLogos: logoRequirements.logos.length > 0,
          logoCount: logoRequirements.logos.length,
          hasPremiumFabric: !!completeCustomizationOptions.premiumFabric,
          hasPremiumClosure: !!completeCustomizationOptions.premiumClosure,
          hasAccessories: completeCustomizationOptions.accessories.length > 0,

          // Complete data preservation
          capDetails: capDetails,
          fullCustomization: customization,
          fullDelivery: delivery,
          fullPricing: orderBuilderPricing
        };

        console.log('🔍 CRITICAL FIX: Extracted comprehensive Order Builder data:', {
          totalCost,
          productName,
          quantity,
          completeCostBreakdown,
          logoRequirements,
          extractedSpecs,
          hasOrderBuilder: !!orderBuilderData,
          hasPricing: !!orderBuilderData.pricing,
          hasCapDetails: !!orderBuilderData.capDetails,
          hasCustomization: !!orderBuilderData.customization,
          hasDelivery: !!orderBuilderData.delivery,
          // Additional debug info for comprehensive data
          logoCount: logoRequirements.logos.length,
          accessoriesCount: completeCustomizationOptions.accessories.length,
          hasPremiumOptions: !!(completeCustomizationOptions.premiumFabric || completeCustomizationOptions.premiumClosure),
          totalSetupCosts: logoRequirements.totalLogoSetupCosts,
          deliveryCost: completeCustomizationOptions.delivery.cost
        });

        // CRITICAL FIX: Generate a highly unique sessionId for QuoteOrder to avoid constraint violations
        // Include conversation ID, timestamp, and random string for maximum uniqueness
        const baseSessionId = conversation.sessionId || `conv-${conversationId.slice(-8)}`;
        const uniqueTimestamp = Date.now();
        const randomSuffix = Math.random().toString(36).substr(2, 12);
        const validSessionId = `quote-${conversationId.slice(-8)}-${uniqueTimestamp}-${randomSuffix}`;

        console.log('🔧 SessionId validation (UPDATED v2):', {
          conversationSessionId: conversation.sessionId,
          generatedSessionId: validSessionId,
          baseSessionId: baseSessionId,
          conversationId: conversationId.slice(-8),
          uniqueTimestamp: uniqueTimestamp,
          randomSuffix: randomSuffix,
          userId: userId.slice(-6)
        });

        // CRITICAL FIX: Create comprehensive QuoteOrder record with ALL Order Builder data
        const { data: createdQuoteOrder, error: quoteOrderError } = await supabaseAdmin
          .from('QuoteOrder')
          .insert({
            id: quoteOrderId,
            sessionId: validSessionId,
            title: `Accept Quote - ${productName}`,
            status: 'COMPLETED',
            productType: productName,
            customerEmail: conversation.metadata?.userProfile?.email || user.email || 'customer@example.com',
            customerName: conversation.metadata?.userProfile?.name || 'Customer',
            quantities: {
              quantity: quantity,
              totalUnits: quantity
            },
            // CRITICAL FIX: Complete cost breakdown including all customization costs
            estimatedCosts: {
              ...completeCostBreakdown,
              // Preserve detailed breakdown structure expected by admin dashboard
              breakdown: {
                baseProductCost: completeCostBreakdown.baseProductCost,
                logosCost: completeCostBreakdown.logosCost,
                accessoriesCost: completeCostBreakdown.accessoriesCost,
                premiumFabricCost: completeCostBreakdown.premiumFabricCost,
                premiumClosureCost: completeCostBreakdown.premiumClosureCost,
                deliveryCost: completeCostBreakdown.deliveryCost,
                moldCharge: completeCostBreakdown.moldCharges,
                setupFees: completeCostBreakdown.setupFees,
                total: totalCost
              },
              // Preserve original Order Builder data for debugging/reference
              orderBuilderData: {
                pricing: orderBuilderPricing,
                delivery: delivery,
                capDetails: capDetails,
                customization: customization,
                originalMetadata: orderBuilderData
              }
            },
            // CRITICAL FIX: Complete customization options including all premium features
            customizationOptions: completeCustomizationOptions,
            // CRITICAL FIX: Complete logo requirements with all details
            logoRequirements: logoRequirements,
            // CRITICAL FIX: Complete extracted specs for admin dashboard display
            extractedSpecs: extractedSpecs,
            // Additional fields for comprehensive tracking
            priority: 'NORMAL',
            complexity: logoRequirements.logos.length > 2 ? 'COMPLEX' :
                       (logoRequirements.logos.length > 0 || completeCustomizationOptions.accessories.length > 0) ? 'MODERATE' : 'SIMPLE',
            aiSummary: `Quote for ${quantity} ${productName} with ${logoRequirements.logos.length} logo(s), total cost $${totalCost}`,
            additionalRequirements: completeCustomizationOptions.specialInstructions || '',
            createdAt: now,
            updatedAt: now
          })
          .select()
          .single();

        if (quoteOrderError) {
          throw new Error(`Failed to create QuoteOrder: ${quoteOrderError.message}`);
        }

        // Create ConversationQuotes bridge record
        const { error: conversationQuotesError } = await supabaseAdmin
          .from('ConversationQuotes')
          .insert({
            id: conversationQuoteId,
            conversationId: conversation.id,
            quoteOrderId: quoteOrderId,
            isMainQuote: true,
            createdAt: now,
            updatedAt: now
          });

        if (conversationQuotesError) {
          throw new Error(`Failed to create ConversationQuotes link: ${conversationQuotesError.message}`);
        }

        console.log('✅ Successfully created QuoteOrder and bridge record:', {
          quoteOrderId,
          conversationQuoteId,
          totalCost: totalCost,
          productName: productName,
          quantity: quantity
        });

        // Update the conversation object with the new quote relationship
        conversation.ConversationQuotes = [{
          id: conversationQuoteId,
          isMainQuote: true,
          quoteOrderId: quoteOrderId,
          QuoteOrder: createdQuoteOrder
        }];

        // Continue with normal quote acceptance flow below

      } catch (createError) {
        console.error('❌ Failed to create QuoteOrder for Order Builder quote:', createError);
        return NextResponse.json({
          error: 'Failed to prepare quote for acceptance',
          details: createError instanceof Error ? createError.message : 'Unknown error',
          debug: {
            conversationId: conversation.id,
            hasOrderBuilderQuote,
            createError: createError instanceof Error ? createError.message : String(createError)
          }
        }, { status: 500 });
      }
    }

    // Handle legacy quotes (stored in conversation metadata only)
    if (hasLegacyQuote && !hasNewQuote && !hasOrderBuilderQuote) {
      console.log('📋 Processing legacy quote from conversation metadata');

      // For legacy quotes, we need to handle acceptance differently
      // Update conversation metadata to track acceptance
      const now = new Date().toISOString();

      const conversationUpdate: any = {
        lastActivity: now,
        updatedAt: now,
        metadata: {
          ...(conversation.metadata || {}),
          quoteStatus: status, // Store APPROVED/REJECTED in metadata
          quoteAcceptedAt: status === 'APPROVED' ? now : null,
          quoteRejectedAt: status === 'REJECTED' ? now : null
        }
      };

      if (status === 'APPROVED') {
        conversationUpdate.title = `Quote Accepted - ${conversation.metadata?.productType || 'Custom Cap'}`;
        // TODO: Create order from legacy quote data if needed
      } else if (status === 'REJECTED') {
        conversationUpdate.title = `Quote Rejected - ${conversation.metadata?.productType || 'Custom Cap'}`;
      }

      const { error: conversationUpdateError } = await supabaseAdmin
        .from('Conversation')
        .update(conversationUpdate)
        .eq('id', conversationId);

      if (conversationUpdateError) {
        throw conversationUpdateError;
      }

      console.log('✅ Legacy quote status updated successfully');

      return NextResponse.json({
        success: true,
        conversationId,
        quoteType: 'legacy',
        previousStatus: conversation.metadata?.quoteStatus || 'PENDING',
        newStatus: status,
        updatedAt: now,
        message: `Legacy quote ${status.toLowerCase()} successfully!`
      });
    }

    // Continue with new system processing for ConversationQuotes (now should exist after auto-creation)
    if (!conversation.ConversationQuotes || conversation.ConversationQuotes.length === 0) {
      console.error('❌ No ConversationQuotes bridge records found after auto-creation attempt');
      return NextResponse.json({
        error: 'No quote found for this conversation after auto-creation attempt',
        debug: {
          hasQuote: conversation.hasQuote,
          conversationId: conversation.id,
          hasOrderBuilderQuote,
          conversationQuotesExists: !!conversation.ConversationQuotes,
          conversationQuotesLength: conversation.ConversationQuotes?.length || 0,
          reason: 'No ConversationQuotes bridge records after auto-creation attempt'
        }
      }, { status: 400 });
    }

    // Update the main quote order status
    const mainQuote = conversation.ConversationQuotes.find((cq: any) => cq.isMainQuote) || conversation.ConversationQuotes[0];
    
    if (!mainQuote?.QuoteOrder) {
      return NextResponse.json({ error: 'Quote order not found' }, { status: 400 });
    }

    console.log('🔄 Updating QuoteOrder status from', mainQuote.QuoteOrder.status, 'to', status);

    const now = new Date().toISOString();

    // Don't change QuoteOrder status (it stays COMPLETED) - instead store acceptance in conversation metadata
    // This avoids the enum validation error
    // CRITICAL FIX: Create a clean metadata object to avoid JSON serialization issues
    const currentMetadata = conversation.metadata || {};
    const updatedMetadata = {
      ...currentMetadata,
      quoteStatus: status, // Store APPROVED/REJECTED in metadata
      quoteAcceptedAt: status === 'APPROVED' ? now : null,
      quoteRejectedAt: status === 'REJECTED' ? now : null
    };

    const conversationUpdate: any = {
      lastActivity: now,
      updatedAt: now,
      metadata: updatedMetadata
    };
    
    // Update conversation title when quote is approved or rejected
    if (status === 'APPROVED') {
      const quoteNumber = `QUOTE-${mainQuote.QuoteOrder.id.slice(-8).toUpperCase()}`;
      conversationUpdate.title = `${quoteNumber} - Quote Accepted`;
    } else if (status === 'REJECTED') {
      const quoteNumber = `QUOTE-${mainQuote.QuoteOrder.id.slice(-8).toUpperCase()}`;
      conversationUpdate.title = `${quoteNumber} - Quote Rejected`;
    }
    
    // CREATE ORDER when quote is approved
    let orderId = null;
    if (status === 'APPROVED') {
      console.log('🚀 Creating Order from accepted QuoteOrder:', mainQuote.QuoteOrder.id);
      
      try {
        // Generate unique order ID
        orderId = `ORDER-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        
        // Get the full QuoteOrder data for order creation
        const { data: fullQuoteOrder, error: quoteOrderError } = await supabaseAdmin
          .from('QuoteOrder')
          .select('*')
          .eq('id', mainQuote.QuoteOrder.id)
          .single();
          
        if (quoteOrderError || !fullQuoteOrder) {
          throw new Error(`Failed to fetch QuoteOrder: ${quoteOrderError?.message}`);
        }
        
        // Create the Order record
        const { data: newOrder, error: orderError } = await supabaseAdmin
          .from('Order')
          .insert({
            id: orderId,
            userId: user.id,
            customerName: fullQuoteOrder.customerName || 'Customer',
            customerEmail: fullQuoteOrder.customerEmail || user.email,
            customerPhone: fullQuoteOrder.customerPhone || '',
            // customerCompany: fullQuoteOrder.customerCompany || '', // Temporarily commented out - missing column
            productName: fullQuoteOrder.productType || 'Custom Cap',
            status: 'PENDING',
            priority: 'NORMAL',
            totalCost: fullQuoteOrder.estimatedCosts?.total || 0,
            estimatedCost: fullQuoteOrder.estimatedCosts?.total || 0,
            // currency: 'USD', // Temporarily commented out - missing column
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
            orderNotes: `Order created from accepted quote ${mainQuote.QuoteOrder.id}. Original requirements: ${fullQuoteOrder.additionalRequirements || ''}`,
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
          .eq('id', mainQuote.QuoteOrder.id);
          
        if (updateQuoteOrderError) {
          console.error('Failed to update QuoteOrder with order reference:', updateQuoteOrderError);
          // Don't fail the whole operation for this
        }
        
        // Update conversation title to include order ID
        conversationUpdate.title = `ORDER-${orderId.slice(-6)} - Order Created`;
        conversationUpdate.metadata = {
          ...updatedMetadata,
          orderId: orderId,
          orderCreatedAt: now
        };
        
        console.log('✅ Order created successfully:', orderId);

      } catch (orderCreationError) {
        console.error('❌ Failed to create order from quote:', orderCreationError);
        // Continue with quote acceptance even if order creation fails
        conversationUpdate.metadata = {
          ...updatedMetadata,
          orderCreationError: orderCreationError instanceof Error ? orderCreationError.message : 'Unknown error',
          orderCreationFailed: true
        };
      }
    }

    // Send email notifications when quote is accepted
    let emailResults = { customerEmailSent: false, adminEmailSent: false };
    console.log('🔍 EMAIL DEBUG: Checking if should send emails. Status:', status, 'Should send:', status === 'APPROVED');

    if (status === 'APPROVED') {
      try {
        console.log('📧 STARTING: Quote acceptance email sending process...');
        console.log('📧 DEBUG: mainQuote.QuoteOrder.id:', mainQuote.QuoteOrder.id);

        // Get the full QuoteOrder data for email sending
        const { data: fullQuoteOrder, error: quoteOrderError } = await supabaseAdmin
          .from('QuoteOrder')
          .select('*')
          .eq('id', mainQuote.QuoteOrder.id)
          .single();

        console.log('📧 DEBUG: QuoteOrder fetch result:', {
          hasError: !!quoteOrderError,
          hasData: !!fullQuoteOrder,
          error: quoteOrderError?.message || 'none',
          customerEmail: fullQuoteOrder?.customerEmail || 'not found',
          customerName: fullQuoteOrder?.customerName || 'not found'
        });

        if (!quoteOrderError && fullQuoteOrder) {
          // Generate PDF download link
          const pdfDownloadLink = QuoteEmailService.generatePdfDownloadLink(fullQuoteOrder.id);
          const dashboardLink = QuoteEmailService.generateDashboardLink(fullQuoteOrder.id);

          console.log('📧 DEBUG: Generated links:', {
            pdfDownloadLink,
            dashboardLink
          });

          console.log('📧 ATTEMPTING: Email sending with QuoteEmailService...');

          // CRITICAL FIX: Enhance QuoteOrder with rich Order Builder data before sending emails
          console.log('📧 CRITICAL FIX: Enhancing QuoteOrder with Order Builder metadata for detailed emails');
          console.log('🔍 Original conversation metadata structure:', {
            hasOrderBuilder: !!conversation.metadata?.orderBuilder,
            orderBuilderKeys: conversation.metadata?.orderBuilder ? Object.keys(conversation.metadata.orderBuilder) : [],
            orderBuilderSample: conversation.metadata?.orderBuilder
          });

          // CRITICAL FIX: Extract the rich Order Builder data from conversation metadata
          const conversationOrderBuilder = conversation.metadata?.orderBuilder || {};

          // Enhance the QuoteOrder with detailed Order Builder data for email templates
          const enhancedQuoteOrder = {
            ...fullQuoteOrder,
            // CRITICAL: Add the rich Order Builder data to estimatedCosts.orderBuilderData
            estimatedCosts: {
              ...fullQuoteOrder.estimatedCosts,
              orderBuilderData: {
                // Direct mapping from conversation metadata
                pricing: conversationOrderBuilder.pricing,
                delivery: conversationOrderBuilder.delivery,
                capDetails: conversationOrderBuilder.capDetails,
                customization: conversationOrderBuilder.customization,
                orderBuilderStatus: conversationOrderBuilder.orderBuilderStatus,
                quoteVersions: conversationOrderBuilder.quoteVersions,
                // Keep original data for reference
                originalMetadata: conversationOrderBuilder
              }
            }
          };

          console.log('📧 ENHANCED: QuoteOrder with rich Order Builder data:', {
            hasEnhancedOrderBuilderData: !!enhancedQuoteOrder.estimatedCosts?.orderBuilderData,
            orderBuilderDataKeys: enhancedQuoteOrder.estimatedCosts?.orderBuilderData ? Object.keys(enhancedQuoteOrder.estimatedCosts.orderBuilderData) : [],
            totalCost: enhancedQuoteOrder.estimatedCosts?.orderBuilderData?.pricing?.total,
            quantity: enhancedQuoteOrder.estimatedCosts?.orderBuilderData?.capDetails?.quantity,
            hasLogos: !!enhancedQuoteOrder.estimatedCosts?.orderBuilderData?.customization?.logos?.length,
            hasAccessories: !!enhancedQuoteOrder.estimatedCosts?.orderBuilderData?.customization?.accessories?.length
          });

          // Send emails (both customer and admin) - MARK AS ACCEPTANCE
          emailResults = await QuoteEmailService.sendQuoteEmails(
            enhancedQuoteOrder as any, // Use enhanced data with rich Order Builder details
            pdfDownloadLink,
            {
              sendToCustomer: true,
              sendToAdmin: true,
              dashboardLink: dashboardLink,
              isAcceptance: true // Flag this as a quote acceptance notification
            }
          );

          console.log('✅ COMPLETED: Quote acceptance emails sent successfully!', emailResults);
        } else {
          console.warn('⚠️ SKIPPED: Could not fetch QuoteOrder for email sending. Error:', quoteOrderError?.message || 'Unknown error');
        }
      } catch (emailError) {
        console.error('❌ FAILED: Email sending failed (non-blocking):', {
          error: emailError instanceof Error ? emailError.message : emailError,
          stack: emailError instanceof Error ? emailError.stack : undefined
        });
        // Don't fail the whole operation for email errors
      }
    } else {
      console.log('📧 SKIPPED: Email sending because status is not APPROVED. Status:', status);
    }
    
    const { error: conversationUpdateError } = await supabaseAdmin
      .from('Conversation')
      .update(conversationUpdate)
      .eq('id', conversationId);

    if (conversationUpdateError) {
      throw conversationUpdateError;
    }

    console.log('✅ Quote status updated successfully:', {
      conversationId,
      quoteOrderId: mainQuote.QuoteOrder.id,
      oldStatus: mainQuote.QuoteOrder.status,
      newStatus: status
    });

    return NextResponse.json({
      success: true,
      conversationId,
      quoteOrderId: mainQuote.QuoteOrder.id,
      previousStatus: mainQuote.QuoteOrder.status,
      newStatus: status,
      updatedAt: now,
      orderCreated: !!orderId,
      orderId: orderId,
      emailResults: emailResults,
      message: orderId ?
        `Quote accepted and Order ${orderId} created successfully!` :
        `Quote ${status.toLowerCase()} successfully!`
    });

  } catch (error) {
    console.error('❌ Error updating quote status:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
}