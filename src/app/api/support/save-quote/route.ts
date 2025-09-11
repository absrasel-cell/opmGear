import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { nanoid } from 'nanoid';
import { renderQuotePdfBuffer, updateQuoteOrderPdfUrl } from '@/lib/pdf/renderQuote';
import { emailNotificationService } from '@/lib/email/notification-service';

export async function POST(request: NextRequest) {
  console.log('=== SAVE QUOTE REQUEST START (FIXED WITH SUPABASE) ===');
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

    console.log('Quote data structure:', {
      hasCapDetails: !!quoteData.capDetails,
      hasCustomization: !!quoteData.customization,
      hasDelivery: !!quoteData.delivery,
      hasPricing: !!quoteData.pricing
    });

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
      // Extract filename from URL
      const urlParts = fileUrl.split('/');
      const filename = urlParts[urlParts.length - 1] || `file_${index + 1}`;
      
      return {
        id: nanoid(),
        quoteOrderId: '', // Will be set after quote creation
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
        fileSize: 0, // We don't have size info from URL
        filePath: fileUrl,
        bucket: 'uploads',
        category: filename.toLowerCase().includes('logo') || 
              ['png', 'jpg', 'jpeg', 'gif', 'svg'].includes(filename.split('.').pop()?.toLowerCase() || '') 
              ? 'LOGO' as const : 'OTHER' as const,
        isLogo: filename.toLowerCase().includes('logo') || 
             ['png', 'jpg', 'jpeg', 'gif', 'svg'].includes(filename.split('.').pop()?.toLowerCase() || ''),
        description: `File uploaded via support chat`,
        metadata: { uploadSource: 'support_chat' },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    });

    // Check if QuoteOrder already exists for this session using Supabase
    console.log('Checking for existing quote order with sessionId:', sessionId);
    let quoteOrder = null;
    
    try {
      console.log('🔍 About to query QuoteOrder table with sessionId:', sessionId);
      console.log('🔍 Using supabaseAdmin for query');
      
      const { data: existingQuote, error: fetchError } = await supabaseAdmin
        .from('QuoteOrder')
        .select('*')
        .eq('sessionId', sessionId)
        .single();
      
      console.log('🔍 Query completed. FetchError:', !!fetchError, 'Data:', !!existingQuote);

      if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = no rows found
        console.log('⚠️ Supabase fetch error detected:', {
          code: fetchError.code,
          message: fetchError.message,
          details: fetchError.details,
          hint: fetchError.hint
        });
        return NextResponse.json(
          { 
            error: 'Database connectivity issue', 
            details: `Database error: ${fetchError.message} (Code: ${fetchError.code})`,
            fallback: true,
            supabaseError: fetchError
          },
          { status: 503 }
        );
      }

      quoteOrder = existingQuote;
      console.log('Existing quote order found:', !!quoteOrder);
    } catch (dbError) {
      console.log('⚠️ Database exception caught:', {
        message: dbError.message,
        name: dbError.name,
        stack: dbError.stack,
        cause: dbError.cause
      });
      return NextResponse.json(
        { 
          error: 'Database connectivity issue', 
          details: `Database exception: ${dbError.message}`,
          fallback: true,
          exception: dbError.message
        },
        { status: 503 }
      );
    }

    // ENHANCED: Extract complete cost breakdown from Current AI Values data
    const baseProductCost = pricing?.baseProductCost || 0;
    const logosCost = pricing?.logosCost || 0;
    
    // Extract accessories cost from Current AI Values customization data
    const accessoriesCost = (() => {
      let total = 0;
      if (customization?.accessories && Array.isArray(customization.accessories)) {
        customization.accessories.forEach((acc: any) => {
          total += (acc.cost || acc.totalCost || 0);
        });
      }
      // Also check pricing breakdown for accessories
      if (pricing?.accessoriesCost) {
        total = Math.max(total, pricing.accessoriesCost);
      }
      return total;
    })();
    
    // Extract premium fabric cost from Current AI Values
    const premiumFabricCost = (() => {
      if (pricing?.premiumFabricCost) return pricing.premiumFabricCost;
      if (capDetails?.fabric && !['Standard Cotton', 'Cotton Twill', 'Standard'].includes(capDetails.fabric)) {
        return (pricing?.quantity || 1) * 1.25;
      }
      return 0;
    })();
    
    // Extract premium closure cost from Current AI Values
    const premiumClosureCost = (() => {
      if (pricing?.premiumClosureCost) return pricing.premiumClosureCost;
      if (capDetails?.closure && !['Snapback', 'Standard'].includes(capDetails.closure)) {
        return (pricing?.quantity || 1) * 0.50;
      }
      return 0;
    })();
    
    const moldCharge = customization?.totalMoldCharges || pricing?.moldCharge || 0;
    const deliveryCost = pricing?.deliveryCost || 0;

    // Prepare quote order data
    const quoteOrderData = {
      status: 'COMPLETED', // User is completing/saving the quote (COMPLETED passes enum validation)
      title: `Quote for ${capDetails?.productName || 'Custom Cap'}`,
      productType: capDetails?.productName || 'Custom Cap',
      quantities: { quantity: pricing?.quantity || 1 },
      colors: { colors: capDetails?.colors || [] },
      logoRequirements: {
        // ENHANCED: Extract complete Logo Setup data from Current AI Values
        logos: (customization?.logos || []).map((logo: any) => ({
          location: logo.location || logo.position,
          type: logo.type || logo.logoType,
          size: logo.size,
          setupCost: logo.setupCost || logo.moldCost || 0,
          unitCost: logo.unitCost || logo.cost || 0,
          totalCost: logo.totalCost || ((logo.unitCost || 0) * (pricing?.quantity || 1)) + (logo.setupCost || 0),
          application: logo.application || 'Direct',
          description: logo.description || `${logo.size || 'Standard'} ${logo.type || 'Logo'} at ${logo.location || 'Front'} position`
        })),
        logoSetup: customization?.logoSetup,
        totalLogoCost: logosCost,
        totalSetupCosts: (customization?.logos || []).reduce((sum: number, logo: any) => sum + (logo.setupCost || logo.moldCost || 0), 0)
      },
      customizationOptions: {
        // ENHANCED: Extract complete Accessories data from Current AI Values
        accessories: (customization?.accessories || []).map((acc: any) => ({
          type: acc.type || acc.name,
          quantity: acc.quantity || pricing?.quantity || 1,
          unitCost: acc.unitCost || acc.cost || 0,
          totalCost: acc.totalCost || acc.cost || ((acc.unitCost || 0) * (pricing?.quantity || 1)),
          description: acc.description || `${acc.type || acc.name} accessory`
        })),
        moldCharges: moldCharge,
        totalAccessoriesCost: accessoriesCost,
        // ENHANCED: Extract complete Delivery data from Current AI Values  
        delivery: {
          method: delivery?.method || 'Standard Delivery',
          leadTime: delivery?.leadTime || delivery?.timeframe,
          cost: deliveryCost,
          urgency: delivery?.urgency || 'standard',
          estimatedDelivery: delivery?.estimatedDelivery,
          description: delivery?.description || `${delivery?.method || 'Standard'} delivery service`
        }
      },
      extractedSpecs: {
        // ENHANCED: Extract complete Cap Style Setup data from Current AI Values
        productName: capDetails?.productName || capDetails?.style,
        profile: capDetails?.profile,
        billShape: capDetails?.billShape || capDetails?.shape,
        structure: capDetails?.structure,
        closure: capDetails?.closure,
        fabric: capDetails?.fabric,
        size: capDetails?.size, // Single size from Current AI Values
        sizes: capDetails?.sizes || (capDetails?.size ? [capDetails.size] : []),
        color: capDetails?.color,
        colors: capDetails?.colors || (capDetails?.color ? [capDetails.color] : []),
        quantity: pricing?.quantity,
        stitching: capDetails?.stitching || capDetails?.stitch
      },
      estimatedCosts: {
        baseProductCost: baseProductCost,
        logosCost: logosCost,
        accessoriesCost: accessoriesCost,
        premiumFabricCost: premiumFabricCost,
        premiumClosureCost: premiumClosureCost,
        moldCharge: moldCharge,
        deliveryCost: deliveryCost,
        total: pricing?.total || 0
      },
      aiSummary: `Quote generated for ${pricing?.quantity || 1} ${capDetails?.productName || 'Custom Cap'}(s) with total cost of $${pricing?.total || 0}`,
      uploadedFiles: uploadedFiles,
      logoFiles: uploadedFiles.filter((url: string) => 
        ['png', 'jpg', 'jpeg', 'gif', 'svg'].some(ext => url.toLowerCase().includes(ext))
      ),
      attachments: uploadedFiles.map((url: string) => ({ url, type: 'file' })),
      lastActivityAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (quoteOrder) {
      // Update existing quote order using Supabase
      try {
        const { data: updatedQuote, error: updateError } = await supabaseAdmin
          .from('QuoteOrder')
          .update(quoteOrderData)
          .eq('id', quoteOrder.id)
          .select()
          .single();

        if (updateError) {
          console.log('⚠️ Database connectivity issue during quote update:', updateError.message);
          return NextResponse.json(
            { 
              error: 'Database connectivity issue', 
              details: 'Unable to connect to database. Please try again later.',
              fallback: true
            },
            { status: 503 }
          );
        }

        quoteOrder = updatedQuote;

        // Delete existing QuoteOrderFile entries and create new ones
        if (processedFiles.length > 0) {
          // Update quoteOrderId in processed files
          const filesWithQuoteId = processedFiles.map(file => ({
            ...file,
            quoteOrderId: quoteOrder.id
          }));

          await supabaseAdmin
            .from('QuoteOrderFile')
            .delete()
            .eq('quoteOrderId', quoteOrder.id);

          await supabaseAdmin
            .from('QuoteOrderFile')
            .insert(filesWithQuoteId);
        }
      } catch (dbError) {
        console.log('⚠️ Database connectivity issue during quote update:', dbError.message);
        return NextResponse.json(
          { 
            error: 'Database connectivity issue', 
            details: 'Unable to connect to database. Please try again later.',
            fallback: true
          },
          { status: 503 }
        );
      }
    } else {
      // Create new quote order using Supabase
      try {
        const newQuoteOrderData = {
          id: quoteId,
          sessionId: sessionId,
          customerEmail: userProfile?.email || user?.email,
          customerName: userProfile?.name || user?.user_metadata?.name,
          customerPhone: userProfile?.phone,
          customerAddress: typeof userProfile?.address === 'string' ? userProfile.address : 
            (userProfile?.address ? `${userProfile.address.street || ''} ${userProfile.address.city || ''} ${userProfile.address.state || ''}`.trim() : null),
          customerCompany: userProfile?.company,
          complexity: 'SIMPLE',
          priority: 'NORMAL',
          createdAt: new Date().toISOString(),
          ...quoteOrderData
        };

        const { data: newQuote, error: createError } = await supabaseAdmin
          .from('QuoteOrder')
          .insert([newQuoteOrderData])
          .select()
          .single();

        if (createError) {
          console.log('⚠️ Database connectivity issue during quote creation:', createError.message);
          return NextResponse.json(
            { 
              error: 'Database connectivity issue', 
              details: 'Unable to connect to database. Please try again later.',
              fallback: true
            },
            { status: 503 }
          );
        }

        quoteOrder = newQuote;

        // Create QuoteOrderFile entries for uploaded files
        if (processedFiles.length > 0) {
          const filesWithQuoteId = processedFiles.map(file => ({
            ...file,
            quoteOrderId: quoteOrder.id
          }));

          await supabaseAdmin
            .from('QuoteOrderFile')
            .insert(filesWithQuoteId);
        }
      } catch (dbError) {
        console.log('⚠️ Database connectivity issue during quote creation:', dbError.message);
        return NextResponse.json(
          { 
            error: 'Database connectivity issue', 
            details: 'Unable to connect to database. Please try again later.',
            fallback: true
          },
          { status: 503 }
        );
      }
    }

    console.log('✅ Quote saved successfully:', quoteOrder.id);

    // Handle conversation - either update existing or create new (but never both!)
    let conversationRecord = null;
    
    // First: Try to find existing conversation by conversationId (from support page)
    if (conversationId) {
      console.log('🗣️ Attempting to update existing conversation from support page:', conversationId);
      
      try {
        const { data: existingConversation, error: fetchError } = await supabaseAdmin
          .from('Conversation')
          .select('*')
          .eq('id', conversationId)
          .single();

        if (!fetchError && existingConversation) {
          // Successfully found existing conversation - update it
          const now = new Date().toISOString();
          const { data: updatedConversation, error: updateConvError } = await supabaseAdmin
            .from('Conversation')
            .update({
              title: `Quote - ${capDetails?.productName || 'Custom Cap'}`,
              context: 'QUOTE_REQUEST',
              hasQuote: true,
              quoteCompletedAt: now,
              lastActivity: now,
              updatedAt: now,
              metadata: {
                ...existingConversation.metadata, // Preserve existing metadata
                hasQuoteData: true,
                intent: existingConversation.metadata?.intent || 'ORDER_CREATION', // Keep original intent
                quoteOrderId: quoteOrder.id,
                productType: capDetails?.productName || 'Custom Cap',
                totalCost: pricing?.total || 0,
                quantity: pricing?.quantity || 1,
                quoteStatus: 'QUOTE_ACCEPTED' // Update status to accepted
              }
            })
            .eq('id', conversationId)
            .select()
            .single();

          if (!updateConvError && updatedConversation) {
            conversationRecord = updatedConversation;
            console.log('✅ Successfully updated existing conversation:', conversationRecord.id);
            
            // Create ConversationQuotes bridge record for existing conversation
            try {
              await supabaseAdmin
                .from('ConversationQuotes')
                .insert({
                  id: crypto.randomUUID(), // Explicitly set the ID to fix null constraint violation
                  conversationId: conversationRecord.id,
                  quoteOrderId: quoteOrder.id,
                  isMainQuote: true,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString()
                });
              console.log('✅ Created ConversationQuotes bridge for existing conversation');
            } catch (bridgeError) {
              console.error('❌ Failed to create ConversationQuotes bridge:', bridgeError);
            }
          } else {
            console.error('❌ Failed to update existing conversation:', updateConvError);
          }
        } else {
          console.log('⚠️ Existing conversation not found or inaccessible:', fetchError);
        }
      } catch (error) {
        console.error('❌ Error accessing existing conversation:', error);
      }
    }
    
    // CRITICAL: Only create a new conversation if:
    // 1. No conversationId was provided (meaning this is NOT from support page), AND
    // 2. We don't have an existing conversationRecord, AND  
    // 3. We have required user info to create one
    const shouldCreateConversation = !conversationId && !conversationRecord && (user || (sessionId && (userProfile?.email)));
    
    console.log('🔍 Conversation creation decision:', {
      providedConversationId: conversationId,
      hasConversationRecord: !!conversationRecord,
      conversationRecordId: conversationRecord?.id,
      shouldCreateConversation,
      hasUser: !!user,
      hasSessionId: !!sessionId,
      hasUserProfileEmail: !!userProfile?.email,
      reason: conversationId ? 'ConversationId provided - will not create new' : 'No conversationId - may create new'
    });
    
    if (shouldCreateConversation) {
      try {
        console.log('🗣️ Creating NEW conversation record for AI quote (no existing conversation found)');
        
        // Check if conversation already exists by sessionId as fallback
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
              title: `Quote - ${capDetails?.productName || 'Custom Cap'}`,
              context: 'QUOTE_REQUEST',
              hasQuote: true,
              quoteCompletedAt: now,
              lastActivity: now,
              updatedAt: now,
              metadata: {
                ...existingConversation.metadata, // Preserve existing metadata
                hasQuoteData: true,
                intent: existingConversation.metadata?.intent || 'ORDER_CREATION', // Keep original intent
                quoteOrderId: quoteOrder.id,
                productType: capDetails?.productName || 'Custom Cap',
                totalCost: pricing?.total || 0,
                quantity: pricing?.quantity || 1,
                quoteStatus: 'QUOTE_ACCEPTED' // Update status to accepted
              }
            })
            .eq('id', existingConversation.id)
            .select()
            .single();

          if (!updateConvError) {
            conversationRecord = updatedConversation;
            console.log('✅ Updated existing conversation with quote acceptance:', conversationRecord.id);
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
              guestEmail: !user ? (userProfile?.email || guestContactInfo?.email) : null,
              guestName: !user ? (userProfile?.name || guestContactInfo?.name) : null,
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
                id: crypto.randomUUID(), // Explicitly set the ID to fix null constraint violation
                conversationId: conversationRecord.id,
                quoteOrderId: quoteOrder.id,
                isMainQuote: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              });
              
            console.log('✅ Created ConversationQuotes bridge record');

            // Only create ConversationMessages for truly NEW conversations
            // If conversation already exists from support page, it will have the detailed quote messages
            console.log('💬 Skipping ConversationMessage creation - using existing conversation with detailed messages');

            // Create OrderBuilderState for the quote to enable state restoration
            try {
              console.log('🛠️ Creating OrderBuilderState for AI quote');
              const currentTimestamp = new Date().toISOString();
              const orderBuilderStateData = {
                id: `obs_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                userId: user?.id || null, // Add required userId field
                sessionId: sessionId,
                capStyleSetup: JSON.stringify({
                  style: capDetails?.productName,
                  profile: capDetails?.profile,
                  color: capDetails?.color,
                  size: capDetails?.size,
                  quantity: pricing?.quantity,
                  basePrice: pricing?.baseProductCost,
                  selectedOptions: capDetails
                }),
                customization: JSON.stringify({
                  logoDetails: customization?.logos?.map((logo: any) => ({
                    location: logo.location,
                    type: logo.type,
                    size: logo.size,
                    setupCost: logo.setupCost || 0,
                    unitCost: logo.unitCost || 0
                  })) || [],
                  totalCustomizationCost: pricing?.logosCost || 0
                }),
                delivery: JSON.stringify({
                  method: delivery?.method,
                  timeframe: delivery?.leadTime,
                  cost: pricing?.deliveryCost || 0,
                  urgency: delivery?.urgency || 'standard'
                }),
                costBreakdown: JSON.stringify({
                  baseCost: pricing?.baseProductCost || 0,
                  logoSetupCosts: 0,
                  logoUnitCosts: pricing?.logosCost || 0,
                  deliveryCost: pricing?.deliveryCost || 0,
                  total: pricing?.total || 0
                }),
                quoteData: JSON.stringify({
                  quoteId: quoteOrder.id,
                  sessionId: sessionId,
                  status: 'COMPLETED',
                  generatedAt: new Date().toISOString(),
                  customerInfo: userProfile || null,
                  aiGenerated: true
                }),
                currentStep: 'completed',
                isCompleted: true,
                completedAt: currentTimestamp,
                totalCost: pricing?.total || 0,
                totalUnits: pricing?.quantity || 1,
                stateVersion: '1.0',
                metadata: JSON.stringify({
                  aiGenerated: true,
                  quoteOrderId: quoteOrder.id,
                  productType: capDetails?.productName || 'Custom Cap'
                }),
                createdAt: currentTimestamp,
                updatedAt: currentTimestamp
              };

              const { error: orderBuilderError } = await supabaseAdmin
                .from('OrderBuilderState')
                .insert(orderBuilderStateData);

              if (!orderBuilderError) {
                console.log('✅ OrderBuilderState created for AI quote');
                
                // Update conversation with OrderBuilderState reference
                await supabaseAdmin
                  .from('Conversation')
                  .update({ 
                    orderBuilderStateId: sessionId 
                  })
                  .eq('id', conversationRecord.id);
              } else {
                console.error('❌ Failed to create OrderBuilderState:', orderBuilderError);
              }
            } catch (builderError) {
              console.error('❌ Error creating OrderBuilderState:', builderError);
            }
          } else {
            console.error('❌ Failed to create conversation:', convError);
          }
        }
      } catch (convError) {
        console.error('❌ Error creating/updating conversation:', convError);
      }
    }
    
    // Auto-generate PDF for the quote (run in background, don't block response)
    try {
      console.log('📄 Generating PDF for quote order:', quoteOrder.id);
      const pdfBuffer = await renderQuotePdfBuffer(quoteOrder.id);
      
      if (pdfBuffer && pdfBuffer.length > 0) {
        // Update the quote order with PDF URL
        const pdfUrl = `/api/quotes/${quoteOrder.id}/pdf`;
        await updateQuoteOrderPdfUrl(quoteOrder.id, pdfUrl);
        console.log('✅ PDF generated and URL updated for quote:', quoteOrder.id);
      }
    } catch (pdfError) {
      // Don't fail the quote save if PDF generation fails
      console.error('⚠️ PDF generation failed for quote order:', quoteOrder.id, pdfError);
    }
    
    // Generate AI order summary and store in conversation.summary field (run in background)
    if (conversationRecord?.id) {
      setImmediate(async () => {
        try {
          console.log('🤖 Generating AI order summary for conversation:', conversationRecord.id);
          
          const summaryResponse = await fetch(`${process.env.NEXTAUTH_URL}/api/admin/generate-quote-summary`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Cookie': request.headers.get('cookie') || '',
              'Authorization': request.headers.get('authorization') || '',
            },
            body: JSON.stringify({
              conversationId: conversationRecord.id,
              quoteOrderId: quoteOrder.id,
              quoteData: {
                id: quoteOrder.id,
                productType: quoteOrder.productType,
                quantities: quoteOrder.quantities,
                colors: quoteOrder.colors,
                logoRequirements: quoteOrder.logoRequirements,
                customizationOptions: quoteOrder.customizationOptions,
                extractedSpecs: quoteOrder.extractedSpecs,
                estimatedCosts: quoteOrder.estimatedCosts,
                status: quoteOrder.status,
                createdAt: quoteOrder.createdAt
              },
              customerInfo: {
                name: quoteOrder.customerName,
                email: quoteOrder.customerEmail,
                company: quoteOrder.customerCompany,
                phone: quoteOrder.customerPhone
              }
            })
          });

          if (summaryResponse.ok) {
            const summaryResult = await summaryResponse.json();
            console.log('✅ AI order summary generated successfully for conversation:', conversationRecord.id);
            console.log('📝 Summary preview:', summaryResult.summary?.substring(0, 200) + '...');
          } else {
            const errorText = await summaryResponse.text();
            console.error('⚠️ Failed to generate AI order summary:', errorText);
          }
        } catch (summaryError) {
          console.error('❌ Error generating AI order summary:', summaryError);
          // Don't fail the quote save if summary generation fails
        }
      });
    } else {
      console.log('⚠️ No conversation record available, skipping AI summary generation');
    }
    
    // Send email notifications using enhanced notification service (run in background)
    setImmediate(async () => {
      try {
        const notificationResult = await emailNotificationService.sendAIQuoteNotifications({
          id: quoteOrder.id,
          sessionId: quoteOrder.sessionId,
          productType: quoteOrder.productType || 'Custom Cap',
          customerName: quoteOrder.customerName,
          customerEmail: quoteOrder.customerEmail,
          customerPhone: quoteOrder.customerPhone,
          customerCompany: quoteOrder.customerCompany,
          status: quoteOrder.status,
          quantities: quoteOrder.quantities,
          estimatedCosts: quoteOrder.estimatedCosts,
          uploadedFiles: quoteOrder.uploadedFiles,
          logoFiles: quoteOrder.logoFiles,
          logoRequirements: quoteOrder.logoRequirements,
          extractedSpecs: quoteOrder.extractedSpecs,
          aiSummary: quoteOrder.aiSummary,
          createdAt: quoteOrder.createdAt ? quoteOrder.createdAt : new Date().toISOString()
        }, uploadedFiles);

        // Send fallback notification if both emails failed
        if (!notificationResult.customerSuccess && !notificationResult.adminSuccess && notificationResult.errors.length > 0) {
          await emailNotificationService.sendFallbackNotification('ai', quoteOrder.id, notificationResult.errors);
        }
      } catch (error) {
        console.error('❌ Email notification service failed for AI quote:', quoteOrder.id, error);
      }
    });
    
    console.log('=== SAVE QUOTE REQUEST END (FIXED WITH SUPABASE) ===');
    
    return NextResponse.json({
      success: true,
      quoteId: quoteOrder.id,
      conversationId: conversationRecord?.id || null,
      message: 'Quote saved successfully'
    });

  } catch (error) {
    console.error('Error saving quote:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      cause: error.cause
    });
    
    // More specific error message
    const errorMessage = error.message || 'Unknown error occurred';
    
    return NextResponse.json(
      { 
        error: 'Failed to save quote',
        details: errorMessage,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}