import { UtilitiesService } from './utilitiesService';

export interface ConversationData {
  id: string;
  title?: string;
  context?: string;
  lastActivity?: string;
  createdAt: string;
  updatedAt: string;
  hasQuote?: boolean;
  messageCount: number;
  lastMessage?: {
    content: string;
    role: string;
  };
  metadata?: any;
  quoteData?: any;
  orderBuilderSummary?: {
    totalCost?: number;
    totalUnits?: number;
  };
  quoteCompletedAt?: string;
}

export interface ConversationStatus {
  type: string;
  label: string;
  color: string;
  dotClass: string;
  badgeClass: string;
  borderClass: string;
}

export class ConversationService {
  static async loadUserConversations(authUser: any): Promise<ConversationData[]> {
    if (!authUser?.id) {
      console.log('❌ No authenticated user for conversation loading');
      return [];
    }

    try {
      console.log('🔄 Loading conversations for user:', authUser.id);

      // Use the same authentication approach as AuthContext
      const response = await fetch('/api/conversations', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include', // Include cookies which contain session data
        cache: 'no-store' // Ensure fresh data
      });

      console.log('📡 Conversations API response:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Conversations loaded successfully:', {
          count: data?.length || 0,
          hasConversations: Array.isArray(data),
          firstConversation: data?.[0]?.id || 'none'
        });

        return data || [];
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Failed to load conversations:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        return [];
      }
    } catch (error) {
      console.error('❌ Error loading conversations:', error);
      return [];
    }
  }

  static async loadConversation(
    conversationId: string,
    _authUser: any,
    setMessages: (updateFn: (prev: any[]) => any[]) => void,
    setCurrentQuoteData: (data: any) => void,
    setOrderBuilderStatus: (status: any) => void,
    setLeadTimeData: (data: any) => void,
    setConversationId: (id: string) => void,
    OrderBuilderService: any,
    setIsOrderBuilderVisible?: (visible: boolean) => void
  ): Promise<void> {
    try {
      console.log('🔄 Loading conversation:', conversationId);

      const response = await fetch(`/api/conversations/${conversationId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        cache: 'no-store'
      });

      if (response.ok) {
        const conversation = await response.json();
        console.log('✅ Conversation loaded:', {
          id: conversation.id,
          messageCount: conversation.ConversationMessage?.length || 0,
          hasOrderBuilderState: !!conversation.orderBuilderState,
          hasMetadataOrderBuilder: !!conversation.metadata?.orderBuilder,
          conversationContext: conversation.context,
          setIsOrderBuilderVisibleProvided: !!setIsOrderBuilderVisible
        });

        // Set the conversation ID
        setConversationId(conversationId);

        // Load messages - API returns ConversationMessage array
        const messages = (conversation.ConversationMessage || conversation.messages || []).map((msg: any) => ({
          id: msg.id,
          content: msg.content,
          role: msg.role?.toLowerCase() === 'user' ? 'user' : 'assistant',
          timestamp: new Date(msg.createdAt),
          model: msg.model
        }));

        setMessages(() => messages);

        // Restore Order Builder state if available - check both orderBuilderState and metadata.orderBuilder
        const orderBuilderData = conversation.orderBuilderState || conversation.metadata?.orderBuilder;
        if (orderBuilderData) {
          // CRITICAL FIX: Transform OrderBuilderState from database format to expected format
          let transformedOrderBuilderData = orderBuilderData;

          // If this is from the OrderBuilderState table, transform to expected format
          if (orderBuilderData.capStyleSetup || orderBuilderData.customization || orderBuilderData.delivery) {
            console.log('🔄 Transforming OrderBuilderState from database format');
            transformedOrderBuilderData = {
              capDetails: orderBuilderData.capStyleSetup || {},
              customization: orderBuilderData.customization || {},
              delivery: orderBuilderData.delivery || {},
              pricing: orderBuilderData.costBreakdown || {},
              orderBuilderStatus: orderBuilderData.metadata?.orderBuilderStatus || {
                capStyle: { completed: false, status: 'red', items: {} },
                customization: { completed: false, status: 'empty', items: {}, logoPositions: [] },
                delivery: { completed: false, status: 'red', items: {} },
                costBreakdown: { completed: false, status: 'red', selectedVersionId: null, versions: [] }
              },
              leadTimeData: orderBuilderData.metadata?.leadTimeData || null,
              quoteVersions: orderBuilderData.metadata?.quoteVersions || []
            };

            console.log('✅ Transformed OrderBuilderState:', {
              hasCapDetails: !!transformedOrderBuilderData.capDetails,
              hasCustomization: !!transformedOrderBuilderData.customization,
              hasDelivery: !!transformedOrderBuilderData.delivery,
              hasPricing: !!transformedOrderBuilderData.pricing,
              hasOrderBuilderStatus: !!transformedOrderBuilderData.orderBuilderStatus,
              hasQuoteVersions: !!transformedOrderBuilderData.quoteVersions?.length
            });
          }

          await this.restoreOrderBuilderState(
            { ...conversation, orderBuilderState: transformedOrderBuilderData },
            setCurrentQuoteData,
            setOrderBuilderStatus,
            setLeadTimeData,
            OrderBuilderService
          );

          // Ensure Order Builder is visible when state exists, even if quoteVersions are absent
          if (setIsOrderBuilderVisible) {
            try {
              setIsOrderBuilderVisible(true);
              console.log('Order Builder made visible after restoring saved state');
            } catch {}
          }

          // Show Order Builder when loading conversation history that has quote data
          const hasQuoteData = transformedOrderBuilderData.quoteVersions?.length > 0 ||
                              transformedOrderBuilderData.orderBuilderStatus?.costBreakdown?.available ||
                              transformedOrderBuilderData.capDetails ||
                              transformedOrderBuilderData.pricing ||
                              conversation.context === 'QUOTE_REQUEST' ||
                              orderBuilderData.isCompleted; // Also check if OrderBuilderState is marked as completed

          if (setIsOrderBuilderVisible && hasQuoteData) {
            console.log('✅ Order Builder made visible for loaded conversation with quotes', {
              hasQuoteVersions: !!transformedOrderBuilderData.quoteVersions?.length,
              hasCostBreakdown: !!transformedOrderBuilderData.orderBuilderStatus?.costBreakdown?.available,
              hasCapDetails: !!transformedOrderBuilderData.capDetails,
              hasPricing: !!transformedOrderBuilderData.pricing,
              isQuoteRequest: conversation.context === 'QUOTE_REQUEST',
              isOrderBuilderCompleted: !!orderBuilderData.isCompleted
            });
            setIsOrderBuilderVisible(true);
          } else {
            console.log('🔧 Order Builder state restored but keeping it hidden until user interaction', {
              hasOrderBuilderData: !!orderBuilderData,
              hasQuoteData: hasQuoteData,
              transformedDataKeys: Object.keys(transformedOrderBuilderData || {})
            });
          }
        }

        console.log('✅ Conversation fully loaded and restored');
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Failed to load conversation:', {
          conversationId,
          status: response.status,
          error: errorData
        });
      }
    } catch (error) {
      console.error('❌ Error loading conversation:', error);
    }
  }

  static async restoreOrderBuilderState(
    conversation: any,
    setCurrentQuoteData: (data: any) => void,
    setOrderBuilderStatus: (status: any) => void,
    setLeadTimeData: (data: any) => void,
    OrderBuilderService: any
  ): Promise<void> {
    try {
      console.log('🔄 Restoring Order Builder state from conversation');

      const orderBuilderState = conversation.orderBuilderState;
      if (!orderBuilderState) {
        console.log('❌ No Order Builder state to restore');
        return;
      }

      console.log('📋 Order Builder state structure:', {
        hasCapDetails: !!orderBuilderState.capDetails,
        hasCustomization: !!orderBuilderState.customization,
        hasDelivery: !!orderBuilderState.delivery,
        hasPricing: !!orderBuilderState.pricing,
        hasOrderBuilderStatus: !!orderBuilderState.orderBuilderStatus,
        hasLeadTimeData: !!orderBuilderState.leadTimeData,
        hasQuoteVersions: !!(orderBuilderState.quoteVersions && orderBuilderState.quoteVersions.length > 0),
        keys: Object.keys(orderBuilderState)
      });

      // Detailed logging of actual data
      if (orderBuilderState.capDetails) {
        console.log('🧢 Cap Details:', orderBuilderState.capDetails);
      }
      if (orderBuilderState.customization) {
        console.log('🎨 Customization:', orderBuilderState.customization);
      }
      if (orderBuilderState.pricing) {
        console.log('💰 Pricing:', orderBuilderState.pricing);
      }
      if (orderBuilderState.orderBuilderStatus) {
        console.log('📊 Order Builder Status:', orderBuilderState.orderBuilderStatus);
      }
      if (orderBuilderState.quoteVersions) {
        console.log('📑 Quote Versions:', orderBuilderState.quoteVersions.length, 'versions');
      }

      // CRITICAL FIX: Restore currentQuoteData with proper structure that OrderBuilderService expects
      // Transform from OrderBuilderState database format to the runtime format
      const hasCapStyleSetup = orderBuilderState.capStyleSetup && Object.keys(orderBuilderState.capStyleSetup).length > 0;
      const hasCustomization = orderBuilderState.customization && Object.keys(orderBuilderState.customization).length > 0;
      const hasDelivery = orderBuilderState.delivery && Object.keys(orderBuilderState.delivery).length > 0;
      const hasCostBreakdown = orderBuilderState.costBreakdown && Object.keys(orderBuilderState.costBreakdown).length > 0;

      console.log('🔍 [CRITICAL FIX] OrderBuilderState restoration validation:', {
        hasCapStyleSetup,
        hasCustomization,
        hasDelivery,
        hasCostBreakdown,
        capStyleSetupData: orderBuilderState.capStyleSetup,
        customizationData: orderBuilderState.customization,
        deliveryData: orderBuilderState.delivery,
        costBreakdownData: orderBuilderState.costBreakdown,
        // CRITICAL DEBUG: Log the actual values being restored
        extractedQuantity: orderBuilderState.capStyleSetup?.quantity || orderBuilderState.totalUnits,
        extractedColor: orderBuilderState.capStyleSetup?.color,
        extractedStyle: orderBuilderState.capStyleSetup?.style,
        extractedTotalCost: orderBuilderState.costBreakdown?.total || orderBuilderState.totalCost,
        extractedLogos: orderBuilderState.customization?.logos?.length || 0,
        extractedDeliveryMethod: orderBuilderState.delivery?.method
      });

      // Reconstruct the quote data structure that OrderBuilderService.updateOrderBuilderStatus() expects
      const restoredQuoteData = (hasCapStyleSetup || hasCustomization || hasDelivery || hasCostBreakdown) ? {
        // CRITICAL FIX: Add top-level fields that CapStyleSection expects
        baseProductCost: orderBuilderState.costBreakdown?.baseProductCost || orderBuilderState.totalCost || 0,
        quantity: orderBuilderState.capStyleSetup?.quantity || orderBuilderState.totalUnits || 100,
        // Transform capStyleSetup from database to runtime format
        capDetails: hasCapStyleSetup ? {
          // CRITICAL FIX: Use actual stored quantity or totalUnits as fallback
          quantity: orderBuilderState.capStyleSetup.quantity || orderBuilderState.totalUnits || 100,
          size: orderBuilderState.capStyleSetup.size,
          color: orderBuilderState.capStyleSetup.color,
          colors: orderBuilderState.capStyleSetup.colors || (orderBuilderState.capStyleSetup.color ? [orderBuilderState.capStyleSetup.color] : []),
          profile: orderBuilderState.capStyleSetup.profile,
          billShape: orderBuilderState.capStyleSetup.billShape,
          structure: orderBuilderState.capStyleSetup.structure,
          fabric: orderBuilderState.capStyleSetup.fabric,
          closure: orderBuilderState.capStyleSetup.closure,
          stitching: orderBuilderState.capStyleSetup.stitching,
          // CRITICAL FIX: Include style information if available AND set as productName for API
          style: orderBuilderState.capStyleSetup.style,
          productName: orderBuilderState.capStyleSetup.style || orderBuilderState.capStyleSetup.productName
        } : {},

        // Transform customization from database to runtime format
        customization: hasCustomization ? {
          logos: orderBuilderState.customization.logos || [],
          accessories: orderBuilderState.customization.accessories || [],
          totalMoldCharges: orderBuilderState.customization.totalMoldCharges || 0,
          logoSetup: orderBuilderState.customization.logoSetup
        } : {},

        // Transform delivery from database to runtime format
        delivery: hasDelivery ? {
          method: orderBuilderState.delivery.method,
          leadTime: orderBuilderState.delivery.leadTime,
          totalCost: orderBuilderState.delivery.totalCost,
          address: orderBuilderState.delivery.address
        } : {},

        // Transform costBreakdown from database to runtime format
        pricing: hasCostBreakdown ? {
          baseProductCost: orderBuilderState.costBreakdown.baseProductCost || 0,
          logosCost: orderBuilderState.costBreakdown.logosCost || 0,
          deliveryCost: orderBuilderState.costBreakdown.deliveryCost || 0,
          total: orderBuilderState.costBreakdown.total || orderBuilderState.totalCost || 0,
          // CRITICAL FIX: Ensure quantity consistency across all sections
          quantity: orderBuilderState.costBreakdown.quantity || orderBuilderState.totalUnits || orderBuilderState.capStyleSetup?.quantity || 100
        } : {}
      } : null;

      console.log('✅ [CRITICAL FIX] Reconstructed quote data for Order Builder:', {
        restoredQuoteData,
        hasRestoredData: !!restoredQuoteData,
        capDetailsKeys: restoredQuoteData?.capDetails ? Object.keys(restoredQuoteData.capDetails) : [],
        customizationKeys: restoredQuoteData?.customization ? Object.keys(restoredQuoteData.customization) : [],
        deliveryKeys: restoredQuoteData?.delivery ? Object.keys(restoredQuoteData.delivery) : [],
        pricingKeys: restoredQuoteData?.pricing ? Object.keys(restoredQuoteData.pricing) : []
      });

      console.log('🔍 Quote data validation:', {
        hasCapStyleSetup,
        hasCustomization,
        hasDelivery,
        hasCostBreakdown,
        willRestoreQuoteData: !!restoredQuoteData
      });

      // Restore leadTimeData if available
      const restoredLeadTimeData = orderBuilderState.leadTimeData || null;

      // CRITICAL FIX: Restore orderBuilderStatus with proper status calculation based on restored data
      let restoredOrderBuilderStatus;

      if (orderBuilderState.orderBuilderStatus) {
        // Use existing status if available
        restoredOrderBuilderStatus = orderBuilderState.orderBuilderStatus;
      } else {
        // Calculate status based on restored data with proper validation
        // CRITICAL FIX: Check for required fields to determine actual status
        const hasRequiredCapFields = orderBuilderState.capStyleSetup?.quantity &&
                                    orderBuilderState.capStyleSetup?.color &&
                                    orderBuilderState.capStyleSetup?.size;
        const hasAllCapFields = hasRequiredCapFields &&
                               orderBuilderState.capStyleSetup?.profile &&
                               orderBuilderState.capStyleSetup?.billShape &&
                               orderBuilderState.capStyleSetup?.structure;

        const capStyleStatus = hasAllCapFields ? 'green' : (hasRequiredCapFields ? 'yellow' : 'red');
        const customizationStatus = hasCustomization ? (orderBuilderState.customization?.logos?.length > 0 ? 'yellow' : 'empty') : 'empty';
        const hasDeliveryComplete = orderBuilderState.delivery?.method && orderBuilderState.delivery?.leadTime;
        const deliveryStatus = hasDeliveryComplete ? 'green' : 'red';

        restoredOrderBuilderStatus = {
          capStyle: {
            completed: hasAllCapFields, // CRITICAL FIX: Base completion on all fields, not just existence
            status: capStyleStatus,
            items: {
              size: !!orderBuilderState.capStyleSetup?.size,
              color: !!orderBuilderState.capStyleSetup?.color,
              profile: !!orderBuilderState.capStyleSetup?.profile,
              shape: !!orderBuilderState.capStyleSetup?.billShape,
              structure: !!orderBuilderState.capStyleSetup?.structure,
              fabric: !!orderBuilderState.capStyleSetup?.fabric,
              stitch: !!(orderBuilderState.capStyleSetup?.closure || orderBuilderState.capStyleSetup?.stitching)
            }
          },
          customization: {
            completed: hasCustomization && orderBuilderState.customization?.logos?.length > 0, // CRITICAL FIX: Only completed if has logos
            status: customizationStatus,
            items: {
              logoSetup: !!(orderBuilderState.customization?.logos?.length > 0),
              accessories: !!(orderBuilderState.customization?.accessories?.length > 0),
              moldCharges: !!(orderBuilderState.customization?.totalMoldCharges !== undefined)
            },
            logoPositions: orderBuilderState.customization?.logos?.map((logo: any) => logo.location) || []
          },
          delivery: {
            completed: hasDeliveryComplete, // CRITICAL FIX: Use proper validation
            status: deliveryStatus,
            items: {
              method: !!orderBuilderState.delivery?.method,
              leadTime: !!orderBuilderState.delivery?.leadTime,
              address: !!orderBuilderState.delivery?.address
            }
          },
          costBreakdown: {
            completed: hasCostBreakdown,
            status: hasCostBreakdown ? 'green' : 'red',
            selectedVersionId: null,
            versions: []
          }
        };

        console.log('✅ Calculated Order Builder status from restored data:', restoredOrderBuilderStatus);
      }

      // CRITICAL FIX: Restore quote versions from saved data OR create version from cost breakdown
      let quoteVersions = [];

      if (orderBuilderState.quoteVersions && orderBuilderState.quoteVersions.length > 0) {
        console.log('✅ Restoring existing quote versions:', orderBuilderState.quoteVersions.length, 'versions');
        quoteVersions = orderBuilderState.quoteVersions;
      } else if (hasCostBreakdown && restoredQuoteData) {
        // Create a quote version from the cost breakdown data
        console.log('🆕 Creating quote version from cost breakdown data');

        // CRITICAL FIX: Generate meaningful label from restored data
        const productStyle = restoredQuoteData.capDetails?.style || 'Custom Cap';
        const quantity = restoredQuoteData.pricing.quantity;
        const color = restoredQuoteData.capDetails?.color || 'Standard';
        const logoCount = restoredQuoteData.customization?.logos?.length || 0;

        const labelParts = [];
        labelParts.push(productStyle);
        if (color !== 'Standard') labelParts.push(color);
        if (logoCount > 0) labelParts.push(`${logoCount} Logo${logoCount > 1 ? 's' : ''}`);
        labelParts.push(`${quantity} pcs`);

        const generatedVersion = {
          id: `version_${Date.now()}_restored`,
          version: 1,
          timestamp: new Date(orderBuilderState.completedAt || orderBuilderState.updatedAt || new Date()),
          pricing: {
            baseProductCost: restoredQuoteData.pricing.baseProductCost || 0,
            logosCost: restoredQuoteData.pricing.logosCost || 0,
            deliveryCost: restoredQuoteData.pricing.deliveryCost || 0,
            total: restoredQuoteData.pricing.total || 0,
            quantity: restoredQuoteData.pricing.quantity || 100
          },
          quoteData: {
            ...restoredQuoteData,
            // CRITICAL FIX: Include restoration metadata
            restorationInfo: {
              wasRestored: true,
              restoredAt: new Date().toISOString(),
              originalOrderBuilderStateId: orderBuilderState.id,
              restoredFrom: 'OrderBuilderState'
            }
          },
          label: `Restored: ${labelParts.join(' • ')}`
        };
        quoteVersions = [generatedVersion];
        console.log('✅ Generated quote version from cost breakdown:', {
          label: generatedVersion.label,
          total: generatedVersion.pricing.total,
          quantity: generatedVersion.pricing.quantity,
          productStyle,
          color,
          logoCount
        });
      }

      if (quoteVersions.length > 0) {
        restoredOrderBuilderStatus = {
          ...restoredOrderBuilderStatus,
          costBreakdown: {
            ...restoredOrderBuilderStatus.costBreakdown,
            available: true,
            completed: true,
            status: 'green',
            versions: quoteVersions,
            selectedVersionId: quoteVersions[quoteVersions.length - 1]?.id || null
          }
        };
      }

      console.log('✨ Restoring data:', {
        quoteData: restoredQuoteData,
        leadTimeData: restoredLeadTimeData,
        orderBuilderStatus: restoredOrderBuilderStatus,
        quoteVersionsCount: restoredOrderBuilderStatus.costBreakdown.versions.length
      });

      // Set the restored data in the correct order
      if (restoredQuoteData) {
        console.log('🔄 Setting currentQuoteData with meaningful data...');
        setCurrentQuoteData(restoredQuoteData);
      } else {
        console.log('⚠️ No meaningful quote data to restore, setting to null');
        setCurrentQuoteData(null);
      }

      console.log('🔄 Setting orderBuilderStatus...');
      setOrderBuilderStatus(restoredOrderBuilderStatus);

      if (restoredLeadTimeData) {
        console.log('🔄 Setting leadTimeData...');
        setLeadTimeData(restoredLeadTimeData);
      }

      console.log('✅ All state restoration calls completed');

      console.log('✅ Order Builder state restored successfully');
    } catch (error) {
      console.error('❌ Error restoring Order Builder state:', error);
    }
  }

  static async createNewConversation(
    authUser: any,
    guestContactInfo: any,
    userProfile: any,
    sessionId: string,
    setConversationId: (id: string | null) => void,
    setMessages: (updateFn: (prev: any[]) => any[]) => void,
    setCurrentQuoteData: (data: any) => void,
    setOrderBuilderStatus: (status: any) => void,
    setLeadTimeData: (data: any) => void
  ): Promise<void> {
    console.log('🔄 Starting new conversation');

    // Reset all states first
    setConversationId(null);
    setMessages(() => []);
    setCurrentQuoteData(null);
    setLeadTimeData(null);

    // Automatically create conversation for authenticated users or guests with contact info
    if (authUser || guestContactInfo) {
      try {
        console.log('🆕 Auto-creating conversation for user:', {
          hasAuthUser: !!authUser,
          userId: authUser?.id || 'GUEST',
          hasGuestContact: !!guestContactInfo,
          sessionId: sessionId
        });

        const conversationResponse = await fetch('/api/conversations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify({
            userId: authUser?.id || null,
            sessionId,
            context: 'SUPPORT',
            title: 'Support Conversation',
            metadata: {
              intent: 'SUPPORT',
              hasQuoteData: false,
              storageMethod: 'auto_creation_on_load',
              userProfile: {
                name: userProfile?.name || authUser?.name || guestContactInfo?.name,
                email: userProfile?.email || authUser?.email || guestContactInfo?.email,
                company: userProfile?.company || guestContactInfo?.company,
                phone: userProfile?.phone || guestContactInfo?.phone,
                address: userProfile?.address || guestContactInfo?.address
              },
              autoCreated: true,
              autoCreatedAt: new Date().toISOString()
            }
          })
        });

        if (conversationResponse.ok) {
          const newConversation = await conversationResponse.json();
          console.log('✅ Auto-created conversation successfully:', {
            conversationId: newConversation.id,
            userId: authUser?.id || 'GUEST',
            context: newConversation.context
          });
          setConversationId(newConversation.id);

          // Set welcome message for new conversation only if messages are empty
          setMessages((prevMessages) => {
            if (prevMessages.length === 0) {
              return [
                {
                  id: '1',
                  content: 'Welcome to AI Support! How can I help you today?',
                  role: 'assistant',
                  timestamp: new Date()
                }
              ];
            }
            return prevMessages;
          });

          return;
        } else {
          console.error('❌ Failed to auto-create conversation');
        }
      } catch (error) {
        console.error('❌ Error auto-creating conversation:', error);
      }
    }

    // Fallback: Always ensure welcome message is set even if conversation creation fails
    setMessages((prevMessages) => {
      if (prevMessages.length === 0) {
        return [
          {
            id: '1',
            content: 'Welcome to AI Support! How can I help you today?',
            role: 'assistant',
            timestamp: new Date()
          }
        ];
      }
      return prevMessages;
    });

    // Reset Order Builder status
    setOrderBuilderStatus({
      capStyle: {
        completed: false,
        status: 'red',
        items: {
          size: false,
          color: false,
          profile: false,
          shape: false,
          structure: false,
          fabric: false,
          stitch: false
        }
      },
      customization: {
        completed: false,
        status: 'empty',
        items: {
          logoSetup: false,
          accessories: false,
          moldCharges: false
        },
        logoPositions: []
      },
      delivery: {
        completed: false,
        status: 'red',
        items: {
          method: false,
          leadTime: false,
          address: false
        }
      },
      costBreakdown: {
        completed: false,
        status: 'red',
        selectedVersionId: null,
        versions: []
      }
    });

    console.log('✅ New conversation started - states reset');
  }

  static async updateQuoteStatus(
    conversationId: string,
    newStatus: 'APPROVED' | 'REJECTED',
    setMessages: (updateFn: (prev: any[]) => any[]) => void,
    setConversations: (updateFn: (prev: ConversationData[]) => ConversationData[]) => void
  ): Promise<void> {
    try {
      console.log(`🔄 Updating quote status for conversation ${conversationId} to ${newStatus}`);

      const authHeaders: Record<string, string> = {
        'Content-Type': 'application/json'
      };

      const response = await fetch(`/api/conversations/${conversationId}/quote-status`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Quote status updated to ${newStatus}:`, data);

        // Update local conversations state immediately for real-time UI update
        setConversations((prev: ConversationData[]) => prev.map((conv: ConversationData) => {
          if (conv.id === conversationId) {
            const updatedConv = {
              ...conv,
              metadata: {
                ...conv.metadata,
                quoteStatus: newStatus,
                quoteAcceptedAt: newStatus === 'APPROVED' ? new Date().toISOString() : null,
                quoteRejectedAt: newStatus === 'REJECTED' ? new Date().toISOString() : null
              },
              updatedAt: new Date().toISOString(),
              lastActivity: new Date().toISOString()
            };

            // Update title based on order creation or quote status
            if (newStatus === 'APPROVED') {
              if (data.orderCreated && data.orderId) {
                updatedConv.title = `ORDER-${data.orderId.slice(-6)} - Order Created`;
                updatedConv.metadata.orderId = data.orderId;
                updatedConv.metadata.orderCreatedAt = new Date().toISOString();
              } else {
                updatedConv.title = updatedConv.title?.replace(/Quote.*/, 'Quote Accepted') || 'Quote Accepted';
              }
            } else if (newStatus === 'REJECTED') {
              updatedConv.title = updatedConv.title?.replace(/Quote.*/, 'Quote Rejected') || 'Quote Rejected';
            }

            console.log('🔄 Updated local conversation state:', updatedConv);
            return updatedConv;
          }
          return conv;
        }));

        // Show success message with order creation info
        const orderInfo = data.orderCreated ? {
          orderCreated: true,
          orderId: data.orderId,
          message: data.message
        } : { orderCreated: false };

        const successMessage: any = {
          id: `msg-${Date.now()}`,
          role: 'system',
          content: orderInfo.orderCreated ?
            `✅ **Quote Accepted & Order Created!**\n\n` +
            `🎉 **SUCCESS!** Your quote has been accepted and converted to a finalized order.\n\n` +
            `📋 **Order Details:**\n` +
            `• Order ID: **${orderInfo.orderId}**\n` +
            `• Status: **Pending Production**\n` +
            `• Payment Status: **Pending**\n\n` +
            `🚀 **Next Steps:**\n` +
            `1. Review your order details in the dashboard\n` +
            `2. Complete payment to start production\n` +
            `3. Track your order progress\n\n` +
            `Your order is now in the production queue and will be processed once payment is received.` :
            `✅ **Quote ${newStatus.toLowerCase()}!**\n\n` +
            `The quote status has been updated to: **${newStatus}**\n\n` +
            `${newStatus === 'APPROVED' ?
              'This quote is now accepted and ready for processing. ' +
              'You can proceed with order finalization if needed.' :
              'This quote has been rejected. You can request a new quote ' +
              'with different specifications if desired.'
            }`,
          timestamp: new Date(),
          metadata: {
            type: 'quote_status_update',
            conversationId,
            newStatus,
            orderCreated: orderInfo.orderCreated,
            orderId: orderInfo.orderId,
            updatedAt: new Date().toISOString()
          }
        };

        setMessages((prev: any[]) => [...prev, successMessage]);

      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update quote status');
      }

    } catch (error) {
      console.error(`❌ Error updating quote status to ${newStatus}:`, error);

      // Show error message
      const errorMessage: any = {
        id: `msg-${Date.now()}`,
        role: 'system',
        content: `❌ **Failed to update quote status**\n\n` +
                 `There was an error updating the quote status to ${newStatus}: ` +
                 `${error instanceof Error ? error.message : 'Unknown error'}\n\n` +
                 `Please try again or contact support if the issue persists.`,
        timestamp: new Date(),
        metadata: {
          type: 'quote_status_update_error',
          conversationId,
          attemptedStatus: newStatus,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };

      setMessages((prev: any[]) => [...prev, errorMessage]);
    }
  }

  static getConversationStatus(conversation: any): ConversationStatus {
    // Priority 0: Check metadata for quote status (stored by new acceptance system)
    if (conversation.metadata?.quoteStatus) {
      const metadataStatus = conversation.metadata.quoteStatus;

      // Check if an order was created from this quote
      if (metadataStatus === 'APPROVED' && conversation.metadata?.orderId) {
        return {
          type: 'order-created',
          label: 'Order Created',
          color: 'blue',
          dotClass: 'bg-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.6)]',
          badgeClass: 'bg-blue-400/20 text-blue-300 border-blue-400/30',
          borderClass: 'border-blue-400/20 hover:border-blue-400/30'
        };
      }

      switch (metadataStatus) {
        case 'APPROVED':
          return {
            type: 'quote-accepted',
            label: 'Quote Accepted',
            color: 'green',
            dotClass: 'bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.6)]',
            badgeClass: 'bg-green-400/20 text-green-300 border-green-400/30',
            borderClass: 'border-green-400/20 hover:border-green-400/30'
          };
        case 'REJECTED':
          return {
            type: 'quote-rejected',
            label: 'Quote Rejected',
            color: 'red',
            dotClass: 'bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.6)]',
            badgeClass: 'bg-red-400/20 text-red-300 border-red-400/30',
            borderClass: 'border-red-400/20 hover:border-red-400/30'
          };
      }
    }

    // Priority 1: Check if this is a quote conversation with actual QuoteOrder data
    if (conversation.hasQuote && conversation.quoteData?.quoteOrder?.status) {
      const quoteStatus = conversation.quoteData.quoteOrder.status;

      switch (quoteStatus) {
        case 'APPROVED':
          return {
            type: 'quote-accepted',
            label: 'Quote Accepted',
            color: 'green',
            dotClass: 'bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.6)]',
            badgeClass: 'bg-green-400/20 text-green-300 border-green-400/30',
            borderClass: 'border-green-400/20 hover:border-green-400/30'
          };
        case 'REJECTED':
          return {
            type: 'quote-rejected',
            label: 'Quote Rejected',
            color: 'red',
            dotClass: 'bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.6)]',
            badgeClass: 'bg-red-400/20 text-red-300 border-red-400/30',
            borderClass: 'border-red-400/20 hover:border-red-400/30'
          };
        case 'QUOTED':
        case 'PENDING_REVIEW':
        case 'COMPLETED':
        case 'IN_PROGRESS':
        default:
          return {
            type: 'quote-pending',
            label: 'Quote Pending',
            color: 'yellow',
            dotClass: 'bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.6)]',
            badgeClass: 'bg-yellow-400/20 text-yellow-300 border-yellow-400/30',
            borderClass: 'border-yellow-400/20 hover:border-yellow-400/30'
          };
      }
    }

    // Priority 2: Check if this is a quote conversation (hasQuote flag or quote-related context)
    if (conversation.hasQuote || conversation.context === 'QUOTE_REQUEST') {
      return {
        type: 'quote-pending',
        label: 'Quote Pending',
        color: 'yellow',
        dotClass: 'bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.6)]',
        badgeClass: 'bg-yellow-400/20 text-yellow-300 border-yellow-400/30',
        borderClass: 'border-yellow-400/20 hover:border-yellow-400/30'
      };
    }

    // Default: Regular support conversation
    return {
      type: 'support-active',
      label: 'Active Support',
      color: 'stone',
      dotClass: 'bg-stone-400 shadow-[0_0_8px_rgba(168,162,158,0.6)]',
      badgeClass: 'bg-stone-400/20 text-stone-300 border-stone-400/30',
      borderClass: 'border-stone-500/30 hover:border-stone-400/40'
    };
  }

  static formatConversationTime(timestamp: string): string {
    return UtilitiesService.formatConversationTime(timestamp);
  }

  static async regenerateConversationTitle(conversationId: string): Promise<void> {
    try {
      console.log('🔄 Regenerating title for conversation:', conversationId);

      const response = await fetch(`/api/conversations/${conversationId}/regenerate-title`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Title regenerated:', data.title);
      } else {
        console.error('❌ Failed to regenerate title');
      }
    } catch (error) {
      console.error('❌ Error regenerating title:', error);
    }
  }

  static async updateConversationMetadata(
    conversationId: string,
    currentQuoteData: any,
    orderBuilderStatus: any,
    leadTimeData: any,
    userProfile: any,
    authUser: any,
    sessionId: string,
    uploadedFiles: string[]
  ): Promise<void> {
    if (!conversationId) return;

    try {
      // Skip if no auth user (for guest users, metadata updates aren't critical)
      if (!authUser?.id) {
        console.log('⚠️ Skipping metadata update for guest user');
        return;
      }

      console.log('📝 Updating conversation metadata:', {
        conversationId,
        hasCurrentQuoteData: !!currentQuoteData,
        hasOrderBuilderStatus: !!orderBuilderStatus,
        hasLeadTimeData: !!leadTimeData
      });

      console.log('💾 Data being saved:', {
        currentQuoteData,
        orderBuilderStatus,
        leadTimeData
      });

      const updatedMetadata = {
        orderBuilder: {
          capDetails: currentQuoteData?.capDetails,
          customization: currentQuoteData?.customization,
          delivery: currentQuoteData?.delivery,
          pricing: currentQuoteData?.pricing,
          orderBuilderStatus: orderBuilderStatus,
          leadTimeData: leadTimeData,
          quoteVersions: orderBuilderStatus?.costBreakdown?.versions || [],
          lastUpdated: new Date().toISOString()
        },
        userProfile: {
          name: userProfile?.name || authUser?.name,
          email: userProfile?.email || authUser?.email,
          company: userProfile?.company,
          phone: userProfile?.phone,
          address: userProfile?.address
        },
        session: {
          sessionId: sessionId,
          uploadedFiles: uploadedFiles.length > 0 ? uploadedFiles : undefined,
          isGuest: !authUser
        }
      };

      const response = await fetch(`/api/conversations/${conversationId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          conversationId: conversationId,
          metadata: updatedMetadata,
          lastActivity: new Date().toISOString()
        })
      });

      if (response.ok) {
        console.log('✅ Conversation metadata updated successfully');
      } else {
        const responseText = await response.text();

        // Check if response is HTML (Jest worker error)
        if (responseText.includes('<!DOCTYPE html>') || responseText.includes('<html')) {
          console.error('🚨 JEST WORKER ERROR DETECTED: Server returned HTML instead of JSON');
          console.error('Response Status:', response.status);
          console.error('Response Text Preview:', responseText.substring(0, 200));

          // Don't throw error for metadata updates - they're not critical
          console.log('⚠️ Skipping metadata update due to server compilation error');
          return;
        }

        // Check for authentication errors and handle gracefully
        if (response.status === 401 || response.status === 403) {
          console.log('⚠️ Authentication required for metadata update, skipping (not critical for guest users)');
          return;
        }

        console.error('❌ Failed to update conversation metadata:', {
          status: response.status || 'unknown',
          statusText: response.statusText || 'unknown',
          responseText: responseText ? responseText.substring(0, 500) : 'empty response',
          conversationId: conversationId
        });
      }
    } catch (error) {
      // Handle network errors and other exceptions gracefully
      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.log('⚠️ Network error during metadata update, skipping (not critical)');
        return;
      }

      console.error('Error updating conversation metadata:', error);
      // Don't throw error - metadata updates are not critical for core functionality
    }
  }

  /**
   * Delete a conversation and all its associated messages
   */
  static async deleteConversation(
    conversationId: string,
    setConversations: (updateFn: (prev: ConversationData[]) => ConversationData[]) => void,
    setConversationId: (id: string | null) => void,
    currentConversationId: string | null,
    setMessages: (updateFn: (prev: any[]) => any[]) => void,
    setCurrentQuoteData: (data: any) => void,
    setOrderBuilderStatus: (status: any) => void,
    setLeadTimeData: (data: any) => void,
    authUser: any
  ): Promise<{ success: boolean; message: string }> {
    try {
      console.log('🗑️ Deleting conversation:', conversationId);

      // Optimistic update - remove from UI immediately
      setConversations(prev => prev.filter(conv => conv.id !== conversationId));

      // If deleting the current conversation, clear the current state
      if (currentConversationId === conversationId) {
        setConversationId(null);
        setMessages(() => []);
        setCurrentQuoteData(null);
        setOrderBuilderStatus({
          capStyle: {
            completed: false,
            status: 'red',
            items: {
              size: false,
              color: false,
              profile: false,
              shape: false,
              structure: false,
              fabric: false,
              stitch: false
            }
          },
          customization: {
            completed: false,
            status: 'red',
            items: {
              logoSetup: false,
              accessories: false,
              moldCharges: false
            },
            logoPositions: []
          },
          delivery: {
            completed: false,
            status: 'red',
            items: {
              method: false,
              cost: false
            }
          },
          costBreakdown: {
            available: false,
            versions: [],
            selectedVersionId: null
          }
        });
        setLeadTimeData(null);
      }

      const response = await fetch(`/api/conversations/${conversationId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Conversation deleted successfully:', data.message);
        return { success: true, message: data.message };
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Failed to delete conversation:', errorData);

        // Rollback optimistic update
        await ConversationService.loadUserConversations(authUser).then(conversations => {
          setConversations(() => conversations);
        }).catch(console.error);

        throw new Error(errorData.error || 'Failed to delete conversation');
      }
    } catch (error) {
      console.error('❌ Error deleting conversation:', error);

      // Rollback optimistic update on error
      try {
        await ConversationService.loadUserConversations(authUser).then(conversations => {
          setConversations(() => conversations);
        });
      } catch (rollbackError) {
        console.error('❌ Failed to rollback after deletion error:', rollbackError);
      }

      return { success: false, message: error instanceof Error ? error.message : 'Failed to delete conversation' };
    }
  }

  /**
   * Show deletion confirmation with conversation details
   */
  static showDeleteConfirmation(conversation: ConversationData): boolean {
    const confirmMessage = [
      `Are you sure you want to delete this conversation?`,
      ``,
      `Title: ${conversation.title || 'Untitled Conversation'}`,
      `Messages: ${conversation.messageCount}`,
      `Created: ${this.formatConversationTime(conversation.createdAt)}`,
      conversation.hasQuote ? `⚠️ This conversation contains quote data` : '',
      ``,
      `This action cannot be undone.`
    ].filter(Boolean).join('\n');

    return confirm(confirmMessage);
  }

  /**
   * Get conversation display information for confirmation dialogs
   */
  static getConversationDisplayInfo(conversation: ConversationData) {
    return {
      title: conversation.title || `Conversation ${conversation.id.slice(-6)}`,
      messageCount: conversation.messageCount,
      createdAt: this.formatConversationTime(conversation.createdAt),
      hasQuote: conversation.hasQuote || false,
      lastActivity: conversation.lastActivity ? this.formatConversationTime(conversation.lastActivity) : null,
      type: conversation.hasQuote ? 'Quote Conversation' : 'Support Conversation'
    };
  }

  /**
   * Show bulk deletion confirmation dialog (legacy fallback)
   * Note: This is kept for backward compatibility but should be replaced with
   * the ClearAllConfirmationDialog component for better UX
   */
  static showBulkDeleteConfirmation(conversations: ConversationData[]): boolean {
    const conversationCount = conversations.length;
    const quoteConversations = conversations.filter(conv => conv.hasQuote).length;

    const confirmMessage = [
      `⚠️ DELETE ALL CONVERSATIONS?`,
      ``,
      `You are about to permanently delete ALL your conversations:`,
      ``,
      `📊 Total Conversations: ${conversationCount}`,
      `💬 Regular Support: ${conversationCount - quoteConversations}`,
      `📋 Quote Conversations: ${quoteConversations}`,
      ``,
      `🚨 THIS ACTION CANNOT BE UNDONE!`,
      ``,
      `All conversation history, messages, quotes, and order builder data will be permanently lost.`,
      ``,
      `Are you absolutely sure you want to continue?`
    ].join('\n');

    return confirm(confirmMessage);
  }

  /**
   * Clear all conversations for the authenticated user
   */
  static async clearAllConversations(
    authUser: any,
    setConversations: (updateFn: (prev: ConversationData[]) => ConversationData[]) => void,
    setConversationId: (id: string | null) => void,
    setMessages: (updateFn: (prev: any[]) => any[]) => void,
    setCurrentQuoteData: (data: any) => void,
    setOrderBuilderStatus: (status: any) => void,
    setLeadTimeData: (data: any) => void
  ): Promise<{ success: boolean; message: string; deletedCount?: number }> {
    try {
      console.log('🗑️ Clearing all conversations for user:', authUser?.id);

      const response = await fetch('/api/conversations/bulk-delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ All conversations cleared successfully:', data);

        // Clear all local state immediately
        setConversations(() => []);
        setConversationId(null);
        setMessages(() => []);
        setCurrentQuoteData(null);
        setLeadTimeData(null);

        // Reset Order Builder status
        setOrderBuilderStatus({
          capStyle: {
            completed: false,
            status: 'red',
            items: {
              size: false,
              color: false,
              profile: false,
              shape: false,
              structure: false,
              fabric: false,
              stitch: false
            }
          },
          customization: {
            completed: false,
            status: 'red',
            items: {
              logoSetup: false,
              accessories: false,
              moldCharges: false
            },
            logoPositions: []
          },
          delivery: {
            completed: false,
            status: 'red',
            items: {
              method: false,
              cost: false
            }
          },
          costBreakdown: {
            available: false,
            versions: [],
            selectedVersionId: null
          }
        });

        return {
          success: true,
          message: data.message,
          deletedCount: data.deletedCount
        };
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Failed to clear all conversations:', errorData);
        throw new Error(errorData.error || 'Failed to clear conversations');
      }
    } catch (error) {
      console.error('❌ Error clearing all conversations:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to clear conversations'
      };
    }
  }
}
