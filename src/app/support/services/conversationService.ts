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
          messageCount: conversation.messages?.length || 0,
          hasOrderBuilder: !!conversation.orderBuilderState
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
          await this.restoreOrderBuilderState(
            { ...conversation, orderBuilderState: orderBuilderData },
            setCurrentQuoteData,
            setOrderBuilderStatus,
            setLeadTimeData,
            OrderBuilderService
          );

          // DON'T automatically show Order Builder when loading conversation history
          // Let the user decide when they want to see it by interacting with quotes
          console.log('🔧 Order Builder state restored but keeping it hidden until user interaction');
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

      // Restore currentQuoteData - using the stored structure
      const restoredQuoteData = {
        capDetails: orderBuilderState.capDetails || {},
        customization: orderBuilderState.customization || {},
        delivery: orderBuilderState.delivery || {},
        pricing: orderBuilderState.pricing || {}
      };

      // Restore leadTimeData if available
      const restoredLeadTimeData = orderBuilderState.leadTimeData || null;

      // Restore orderBuilderStatus with quote versions if available
      let restoredOrderBuilderStatus = orderBuilderState.orderBuilderStatus || {
        capStyle: { completed: false, status: 'red', items: {} },
        customization: { completed: false, status: 'empty', items: {}, logoPositions: [] },
        delivery: { completed: false, status: 'red', items: {} },
        costBreakdown: { completed: false, status: 'red', selectedVersionId: null, versions: [] }
      };

      // CRITICAL FIX: Restore quote versions from saved data
      if (orderBuilderState.quoteVersions && orderBuilderState.quoteVersions.length > 0) {
        console.log('✅ Restoring quote versions:', orderBuilderState.quoteVersions.length, 'versions');
        restoredOrderBuilderStatus = {
          ...restoredOrderBuilderStatus,
          costBreakdown: {
            ...restoredOrderBuilderStatus.costBreakdown,
            available: true,
            completed: true,
            status: 'green',
            versions: orderBuilderState.quoteVersions,
            selectedVersionId: orderBuilderState.quoteVersions[orderBuilderState.quoteVersions.length - 1]?.id || null
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
      setCurrentQuoteData(restoredQuoteData);
      setOrderBuilderStatus(restoredOrderBuilderStatus);

      if (restoredLeadTimeData) {
        setLeadTimeData(restoredLeadTimeData);
      }

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