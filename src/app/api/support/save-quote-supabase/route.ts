import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { nanoid } from 'nanoid';

export async function POST(request: NextRequest) {
  console.log('=== SAVE QUOTE REQUEST START (SUPABASE FALLBACK) ===');
  console.log('Request timestamp:', new Date().toISOString());
  
  try {
    const { quoteData, conversationId, sessionId, userProfile, uploadedFiles = [] } = await request.json();

    console.log('Request payload received:', {
      hasQuoteData: !!quoteData,
      conversationId,
      sessionId,
      hasUserProfile: !!userProfile,
      uploadedFilesCount: uploadedFiles.length
    });

    if (!quoteData) {
      console.log('❌ Missing quote data');
      return NextResponse.json(
        { error: 'Quote data is required' },
        { status: 400 }
      );
    }

    // Get user from auth header
    const authHeader = request.headers.get('authorization');
    let user = null;
    
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const { data: { user: authUser }, error } = await supabaseAdmin.auth.getUser(token);
      if (!error) {
        user = authUser;
      }
    }

    // Generate unique quote ID
    const quoteId = `QUO-${nanoid(8).toUpperCase()}`;

    // Extract key information from quote data
    const { capDetails, customization, delivery, pricing } = quoteData;

    // Process uploaded files for storage
    const processedFiles = uploadedFiles.map((fileUrl: string, index: number) => {
      const urlParts = fileUrl.split('/');
      const filename = urlParts[urlParts.length - 1] || `file_${index + 1}`;
      
      return {
        id: nanoid(),
        quoteOrderId: quoteId,
        originalName: filename,
        fileName: filename,
        fileType: filename.includes('.') ? (() => {
          const ext = filename.split('.').pop()?.toLowerCase();
          switch (ext) {
            case 'pdf': return 'application/pdf';
            case 'png': return 'image/png';
            case 'jpg': 
            case 'jpeg': return 'image/jpeg';
            case 'gif': return 'image/gif';
            case 'svg': return 'image/svg+xml';
            case 'ai': return 'application/illustrator';
            case 'eps': return 'application/postscript';
            case 'txt': return 'text/plain';
            default: return `file/${ext}`;
          }
        })() : 'unknown',
        fileSize: 0,
        filePath: fileUrl,
        bucket: 'uploads',
        category: filename.toLowerCase().includes('logo') || 
              ['png', 'jpg', 'jpeg', 'gif', 'svg'].includes(filename.split('.').pop()?.toLowerCase() || '') 
              ? 'LOGO' : 'OTHER',
        isLogo: filename.toLowerCase().includes('logo') || 
             ['png', 'jpg', 'jpeg', 'gif', 'svg'].includes(filename.split('.').pop()?.toLowerCase() || ''),
        description: `File uploaded via support chat`,
        metadata: { uploadSource: 'support_chat' },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    });

    // Prepare quote order data for Supabase
    const quoteOrderData = {
      id: quoteId,
      sessionId: sessionId,
      status: 'QUOTED',
      title: `Quote for ${capDetails?.productName || 'Custom Cap'}`,
      customerEmail: userProfile?.email || user?.email,
      customerName: userProfile?.name || user?.user_metadata?.name,
      customerPhone: userProfile?.phone,
      customerAddress: typeof userProfile?.address === 'string' ? userProfile.address : 
        (userProfile?.address ? `${userProfile.address.street || ''} ${userProfile.address.city || ''} ${userProfile.address.state || ''}`.trim() : null),
      customerCompany: userProfile?.company,
      productType: capDetails?.productName || 'Custom Cap',
      quantities: { quantity: pricing?.quantity || 1 },
      colors: { colors: capDetails?.colors || [] },
      logoRequirements: {
        logos: customization?.logos || []
      },
      customizationOptions: {
        accessories: customization?.accessories || [],
        moldCharges: customization?.totalMoldCharges || 0,
        delivery: delivery || {}
      },
      extractedSpecs: {
        profile: capDetails?.profile,
        billShape: capDetails?.billShape,
        structure: capDetails?.structure,
        closure: capDetails?.closure,
        fabric: capDetails?.fabric,
        sizes: capDetails?.sizes || []
      },
      estimatedCosts: {
        baseProductCost: pricing?.baseProductCost || 0,
        logosCost: pricing?.logosCost || 0,
        deliveryCost: pricing?.deliveryCost || 0,
        total: pricing?.total || 0
      },
      aiSummary: `Quote generated for ${pricing?.quantity || 1} ${capDetails?.productName || 'Custom Cap'}(s) with total cost of $${pricing?.total || 0}`,
      uploadedFiles: uploadedFiles,
      logoFiles: uploadedFiles.filter((url: string) => 
        ['png', 'jpg', 'jpeg', 'gif', 'svg'].some(ext => url.toLowerCase().includes(ext))
      ),
      attachments: uploadedFiles.map((url: string) => ({ url, type: 'file' })),
      complexity: 'SIMPLE',
      priority: 'NORMAL',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastActivityAt: new Date().toISOString()
    };

    // Check if QuoteOrder already exists
    console.log('Checking for existing quote order with sessionId:', sessionId);
    const { data: existingQuote, error: fetchError } = await supabaseAdmin
      .from('QuoteOrder')
      .select('*')
      .eq('sessionId', sessionId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Error checking existing quote:', fetchError);
      return NextResponse.json(
        { 
          error: 'Database query failed', 
          details: fetchError.message 
        },
        { status: 500 }
      );
    }

    let quoteOrder;
    
    if (existingQuote) {
      // Update existing quote order
      console.log('Updating existing quote order:', existingQuote.id);
      const { data: updatedQuote, error: updateError } = await supabaseAdmin
        .from('QuoteOrder')
        .update(quoteOrderData)
        .eq('id', existingQuote.id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating quote order:', updateError);
        return NextResponse.json(
          { 
            error: 'Failed to update quote', 
            details: updateError.message 
          },
          { status: 500 }
        );
      }

      quoteOrder = updatedQuote;

      // Delete existing QuoteOrderFile entries and create new ones
      if (processedFiles.length > 0) {
        await supabaseAdmin
          .from('QuoteOrderFile')
          .delete()
          .eq('quoteOrderId', quoteOrder.id);

        const { error: filesError } = await supabaseAdmin
          .from('QuoteOrderFile')
          .insert(processedFiles);

        if (filesError) {
          console.error('Error inserting quote files:', filesError);
        }
      }
    } else {
      // Create new quote order
      console.log('Creating new quote order:', quoteId);
      const { data: newQuote, error: createError } = await supabaseAdmin
        .from('QuoteOrder')
        .insert([quoteOrderData])
        .select()
        .single();

      if (createError) {
        console.error('Error creating quote order:', createError);
        return NextResponse.json(
          { 
            error: 'Failed to create quote', 
            details: createError.message 
          },
          { status: 500 }
        );
      }

      quoteOrder = newQuote;

      // Create QuoteOrderFile entries for uploaded files
      if (processedFiles.length > 0) {
        const { error: filesError } = await supabaseAdmin
          .from('QuoteOrderFile')
          .insert(processedFiles);

        if (filesError) {
          console.error('Error inserting quote files:', filesError);
        }
      }
    }

    console.log('✅ Quote saved successfully via Supabase:', quoteOrder.id);

    // Create a Conversation record for AI-generated quotes to ensure they appear in conversation history
    // This works for both authenticated users and guests (using sessionId)
    let conversationRecord = null;
    const shouldCreateConversation = user || (sessionId && (userProfile?.email || user?.email));
    
    if (shouldCreateConversation) {
      try {
        console.log('🗣️ Creating conversation record for AI quote (Supabase fallback)');
        
        // Check if conversation already exists (search by sessionId, with or without userId)
        const conversationQuery = supabaseAdmin
          .from('Conversation')
          .select('id')
          .eq('sessionId', sessionId);
          
        if (user) {
          conversationQuery.eq('userId', user.id);
        }
        
        const { data: existingConversation } = await conversationQuery.single();

        if (existingConversation) {
          // Update existing conversation
          const now = new Date().toISOString();
          const { data: updatedConversation, error: updateConvError } = await supabaseAdmin
            .from('Conversation')
            .update({
              title: `AI Quote - ${capDetails?.productName || 'Custom Cap'}`,
              context: 'QUOTE_REQUEST',
              hasQuote: true,
              quoteCompletedAt: now,
              lastActivity: now,
              updatedAt: now,
              metadata: {
                hasQuoteData: true,
                intent: 'quote_request',
                aiGenerated: true,
                quoteOrderId: quoteOrder.id,
                productType: capDetails?.productName || 'Custom Cap',
                totalCost: pricing?.total || 0,
                quantity: pricing?.quantity || 1
              }
            })
            .eq('id', existingConversation.id)
            .select()
            .single();

          if (!updateConvError) {
            conversationRecord = updatedConversation;
            console.log('✅ Updated existing conversation:', conversationRecord.id);
          }
        } else {
          // Create new conversation
          const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          
          const now = new Date().toISOString();
          const conversationData = {
            id: conversationId,
            userId: user?.id || null, // Allow null for guest users
            sessionId: sessionId,
            title: `AI Quote - ${capDetails?.productName || 'Custom Cap'}`,
            context: 'QUOTE_REQUEST',
            hasQuote: true,
            quoteCompletedAt: now,
            lastActivity: now,
            createdAt: now,
            updatedAt: now,
            metadata: {
              hasQuoteData: true,
              intent: 'quote_request',
              aiGenerated: true,
              quoteOrderId: quoteOrder.id,
              productType: capDetails?.productName || 'Custom Cap',
              totalCost: pricing?.total || 0,
              quantity: pricing?.quantity || 1,
              // Store guest info if no user
              guestEmail: !user ? (userProfile?.email) : null,
              guestName: !user ? (userProfile?.name) : null,
              isGuest: !user
            }
          };
          
          const { data: newConversation, error: convError } = await supabaseAdmin
            .from('Conversation')
            .insert(conversationData)
            .select()
            .single();

          if (!convError) {
            conversationRecord = newConversation;
            console.log('✅ Created new conversation:', conversationRecord.id);

            // Create ConversationQuotes bridge record
            await supabaseAdmin
              .from('ConversationQuotes')
              .insert({
                conversationId: conversationRecord.id,
                quoteOrderId: quoteOrder.id,
                isMainQuote: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              });
              
            console.log('✅ Created ConversationQuotes bridge record');

            // Create ConversationMessages
            const messages = [
              {
                id: `msg_${Date.now()}_1`,
                conversationId: conversationRecord.id,
                role: 'user',
                content: `I need a quote for ${pricing?.quantity || 1} ${capDetails?.productName || 'custom caps'}.`,
                createdAt: new Date().toISOString(),
                metadata: {
                  messageType: 'quote_request',
                  aiGenerated: false
                }
              },
              {
                id: `msg_${Date.now()}_2`,
                conversationId: conversationRecord.id,
                role: 'assistant',
                content: `✅ **Quote saved successfully!** Reference ID: ${quoteOrder.id}\n\nYour quote has been saved and you can reference it using the ID above.`,
                createdAt: new Date().toISOString(),
                metadata: {
                  messageType: 'quote_completion',
                  aiGenerated: true,
                  quoteOrderId: quoteOrder.id
                }
              }
            ];

            const { error: messagesError } = await supabaseAdmin
              .from('ConversationMessage')
              .insert(messages);

            if (!messagesError) {
              console.log('✅ Created ConversationMessages');
            } else {
              console.error('❌ Failed to create ConversationMessages:', messagesError);
            }

            // Create OrderBuilderState
            const orderBuilderStateData = {
              sessionId: sessionId,
              capStyleSetup: JSON.stringify({
                style: capDetails?.productName,
                quantity: pricing?.quantity,
                basePrice: pricing?.baseProductCost
              }),
              customization: JSON.stringify({
                logoDetails: customization?.logos || [],
                totalCustomizationCost: pricing?.logosCost || 0
              }),
              delivery: JSON.stringify({
                method: delivery?.method,
                cost: pricing?.deliveryCost || 0
              }),
              costBreakdown: JSON.stringify({
                baseCost: pricing?.baseProductCost || 0,
                logoUnitCosts: pricing?.logosCost || 0,
                deliveryCost: pricing?.deliveryCost || 0,
                total: pricing?.total || 0
              }),
              quoteData: JSON.stringify({
                quoteId: quoteOrder.id,
                sessionId: sessionId,
                status: 'COMPLETED',
                aiGenerated: true
              }),
              currentStep: 'completed',
              isCompleted: true,
              completedAt: new Date().toISOString(),
              totalCost: pricing?.total || 0,
              totalUnits: pricing?.quantity || 1,
              stateVersion: '1.0',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };

            const { error: orderBuilderError } = await supabaseAdmin
              .from('OrderBuilderState')
              .insert(orderBuilderStateData);

            if (!orderBuilderError) {
              console.log('✅ Created OrderBuilderState');
            } else {
              console.error('❌ Failed to create OrderBuilderState:', orderBuilderError);
            }
          } else {
            console.error('❌ Failed to create conversation:', convError);
          }
        }
      } catch (convError) {
        console.error('❌ Error creating/updating conversation:', convError);
      }
    }
    
    console.log('=== SAVE QUOTE REQUEST END (SUPABASE FALLBACK) ===');
    
    return NextResponse.json({
      success: true,
      quoteId: quoteOrder.id,
      conversationId: conversationRecord?.id || null,
      message: 'Quote saved successfully via Supabase'
    });

  } catch (error) {
    console.error('Error saving quote via Supabase:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      cause: error.cause
    });
    
    return NextResponse.json(
      { 
        error: 'Failed to save quote via Supabase',
        details: error.message || 'Unknown error occurred',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}