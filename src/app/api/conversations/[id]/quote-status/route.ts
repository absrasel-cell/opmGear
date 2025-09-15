import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth-helpers';

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

    if (!conversation.hasQuote) {
      console.error('❌ Conversation hasQuote flag is false');
      return NextResponse.json({
        error: 'No quote found for this conversation',
        debug: {
          hasQuote: conversation.hasQuote,
          conversationId: conversation.id,
          reason: 'hasQuote flag is false'
        }
      }, { status: 400 });
    }

    if (!conversation.ConversationQuotes || conversation.ConversationQuotes.length === 0) {
      console.error('❌ No ConversationQuotes bridge records found');
      return NextResponse.json({
        error: 'No quote found for this conversation',
        debug: {
          hasQuote: conversation.hasQuote,
          conversationId: conversation.id,
          conversationQuotesExists: !!conversation.ConversationQuotes,
          conversationQuotesLength: conversation.ConversationQuotes?.length || 0,
          reason: 'No ConversationQuotes bridge records'
        }
      }, { status: 400 });
    }

    // Update the main quote order status
    const mainQuote = conversation.ConversationQuotes.find(cq => cq.isMainQuote) || conversation.ConversationQuotes[0];
    
    if (!mainQuote?.QuoteOrder) {
      return NextResponse.json({ error: 'Quote order not found' }, { status: 400 });
    }

    console.log('🔄 Updating QuoteOrder status from', mainQuote.QuoteOrder.status, 'to', status);

    const now = new Date().toISOString();

    // Don't change QuoteOrder status (it stays COMPLETED) - instead store acceptance in conversation metadata
    // This avoids the enum validation error
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
          ...(conversationUpdate.metadata || {}),
          orderId: orderId,
          orderCreatedAt: now
        };
        
        console.log('✅ Order created successfully:', orderId);
        
      } catch (orderCreationError) {
        console.error('❌ Failed to create order from quote:', orderCreationError);
        // Continue with quote acceptance even if order creation fails
        conversationUpdate.metadata = {
          ...(conversationUpdate.metadata || {}),
          orderCreationError: orderCreationError instanceof Error ? orderCreationError.message : 'Unknown error',
          orderCreationFailed: true
        };
      }
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