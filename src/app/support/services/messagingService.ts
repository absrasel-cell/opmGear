import { supabase } from '@/lib/supabase';
import { QuoteParsingService } from './quoteParsingService';

interface SendMessageProps {
  inputMessage: string;
  uploadedFiles: string[];
  isLoading: boolean;
  isUploading: boolean;
  isProcessing: boolean;
  authUser: any;
  guestContactInfo: any;
  userProfile: any;
  sessionId: string;
  conversationId: string | null;
  messages: any[];
  setMessages: (updateFn: (prev: any[]) => any[]) => void;
  setInputMessage: (message: string) => void;
  setIsLoading: (loading: boolean) => void;
  setIsProcessing: (processing: boolean) => void;
  setCurrentModel: (model: string) => void;
  setCurrentAssistant: (assistant: any) => void;
  setConversationId: (id: string | null) => void;
  setIsOrderBuilderVisible: (visible: boolean) => void;
  setUploadedFiles: (files: string[]) => void;
  handleGuestQuoteRequest: (message: string) => void;
  onQuoteDataUpdate?: (quoteData: any) => void;
  onOrderBuilderUpdate?: (status: any) => void;
  onConversationRefresh?: () => Promise<void>;
}

export class MessagingService {
  static async sendMessage(props: SendMessageProps) {
    const {
      inputMessage,
      uploadedFiles,
      isLoading,
      isUploading,
      isProcessing,
      authUser,
      guestContactInfo,
      userProfile,
      sessionId,
      conversationId,
      messages,
      setMessages,
      setInputMessage,
      setIsLoading,
      setIsProcessing,
      setCurrentModel,
      setCurrentAssistant,
      setConversationId,
      setIsOrderBuilderVisible,
      setUploadedFiles,
      handleGuestQuoteRequest,
      onQuoteDataUpdate,
      onOrderBuilderUpdate,
      onConversationRefresh
    } = props;

    const callTimestamp = Date.now();
    console.log('🚀 sendMessage ENTRY:', {
      callId: callTimestamp,
      inputMessage: inputMessage.substring(0, 50),
      uploadedFilesLength: uploadedFiles.length,
      isLoading: isLoading,
      timestamp: new Date().toISOString()
    });

    // ABSOLUTE prevention of double execution
    if (isProcessing || isLoading) {
      console.log('🛑 BLOCKED: Message processing already in progress:', { callId: callTimestamp, isProcessing, isLoading });
      return;
    }

    console.log('✅ PROCEEDING: Starting message processing:', callTimestamp);
    setIsProcessing(true);
    setIsLoading(true);

    if ((!inputMessage.trim() && uploadedFiles.length === 0) || isLoading || isUploading) {
      console.log('❌ sendMessage blocked:', {
        hasInput: !!inputMessage.trim(),
        hasFiles: uploadedFiles.length > 0,
        isLoading,
        isUploading
      });
      setIsProcessing(false);
      setIsLoading(false);
      return;
    }

    try {
      // Check if this is a guest user trying to create a quote
      if (!authUser && !guestContactInfo) {
        const quoteKeywords = ['quote', 'price', 'cost', 'order', 'custom cap', 'hat', 'embroidery', 'logo', 'design', 'bulk'];
        const messageContainsQuoteKeywords = quoteKeywords.some(keyword =>
          inputMessage.toLowerCase().includes(keyword)
        );

        if (messageContainsQuoteKeywords || uploadedFiles.length > 0) {
          handleGuestQuoteRequest(inputMessage);
          setIsProcessing(false);
          setIsLoading(false);
          return;
        }
      }

      const messageId = Date.now().toString();
      console.log('🔑 Generated user message ID:', messageId);

      const userMessage: any = {
        id: messageId,
        role: 'user',
        content: inputMessage,
        timestamp: new Date()
      };

      console.log('📝 Adding user message to UI:', { id: userMessage.id, content: userMessage.content.substring(0, 50) });
      setMessages((prev: any[]) => [...prev, userMessage]);
      setInputMessage('');

      // Get auth session
      const { data: { session } } = await supabase.auth.getSession();
      const authHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
      if (session?.access_token) {
        authHeaders['Authorization'] = `Bearer ${session.access_token}`;
      }

      // Step 1: Intent detection
      const intentResult = await this.detectIntent(inputMessage, messages, authHeaders, authUser?.id, uploadedFiles.length > 0);

      // Add system routing message
      const routingMessageId = Date.now().toString() + '_routing';
      const routingMessage: any = {
        id: routingMessageId,
        role: 'system',
        content: uploadedFiles.length > 0
          ? `🖼️ Image analysis — Routing to ${intentResult.assistant?.displayName || 'LogoCraft Pro 🎨'} for logo analysis`
          : `Model switch — Routed to ${intentResult.assistant?.displayName || intentResult.model.toUpperCase()}`,
        timestamp: new Date()
      };

      console.log('📝 Adding routing message to UI:', { id: routingMessage.id, content: routingMessage.content.substring(0, 50) });
      setMessages((prev: any[]) => [...prev, routingMessage]);

      setCurrentModel(intentResult.model);
      setCurrentAssistant(intentResult.assistant);
      setIsOrderBuilderVisible(intentResult.intent === 'ORDER_CREATION');

      // Step 2: Create conversation if needed
      let currentConversationId = conversationId;
      if (!currentConversationId && (authUser || guestContactInfo)) {
        currentConversationId = await this.createConversation(
          authHeaders, authUser, guestContactInfo, userProfile, sessionId, intentResult.intent, inputMessage
        );
        if (currentConversationId) {
          setConversationId(currentConversationId);
        }
      }

      // Step 3: Determine best AI endpoint with intelligent routing
      const hasConversationHistory = messages.length > 1;
      const isModification = this.detectModificationRequest(inputMessage);
      const isOrderBuilderFocused = currentConversationId && hasConversationHistory;

      console.log('🤖 [DUAL-FORMAT] Routing decision:', {
        hasConversationHistory,
        isModification,
        isOrderBuilderFocused,
        intent: intentResult.intent
      });

      const apiEndpoint = this.getApiEndpoint(intentResult.intent, {
        isOrderBuilderFocused,
        hasConversationHistory,
        isModification
      });

      const validUploadedFiles = uploadedFiles.filter(url => url && typeof url === 'string' && url.length > 0);

      // CRITICAL FIX: Format conversation history with complete preservation
      const formattedConversationHistory = messages
        .filter(msg => msg.role !== 'system') // Exclude system routing messages
        .map(msg => ({
          role: msg.role,
          content: msg.content,
          // Include timestamp for better context understanding
          timestamp: msg.timestamp
        }));

      console.log('📚 [CONVERSATION-HISTORY] Formatted history for AI:', {
        totalMessages: formattedConversationHistory.length,
        userMessages: formattedConversationHistory.filter(m => m.role === 'user').length,
        assistantMessages: formattedConversationHistory.filter(m => m.role === 'assistant').length,
        lastUserMessage: formattedConversationHistory.filter(m => m.role === 'user').slice(-1)[0]?.content?.substring(0, 100),
        lastAssistantMessage: formattedConversationHistory.filter(m => m.role === 'assistant').slice(-1)[0]?.content?.substring(0, 100)
      });

      const requestSessionId = intentResult.intent === 'ORDER_CREATION'
        ? `quote-${Date.now()}-${Math.random().toString(36).substring(7)}`
        : sessionId;

      console.log('🚀 Sending to API:', { endpoint: apiEndpoint, intent: intentResult.intent });

      // Prepare API request with enhanced context for intelligent conversation continuation
      const apiRequestBody: any = {
        message: inputMessage,
        intent: intentResult.intent,
        conversationHistory: formattedConversationHistory,
        userProfile: userProfile || (guestContactInfo ? {
          name: guestContactInfo.name,
          email: guestContactInfo.email,
          phone: guestContactInfo.phone,
          address: guestContactInfo.address,
          company: guestContactInfo.company
        } : null),
        conversationId: currentConversationId,
        sessionId: requestSessionId,
        attachedFiles: validUploadedFiles.length > 0 ? validUploadedFiles : undefined
      };

      // For support-ai API, add quantity parameter if detected
      if (apiEndpoint === '/api/support-ai') {
        const quantityMatch = inputMessage.match(/(\d+)\s*(pieces?|pcs?|caps?|units?)/i);
        if (quantityMatch) {
          apiRequestBody.quantity = parseInt(quantityMatch[1]);
          console.log('🔢 [CONTEXT] Detected quantity in message:', apiRequestBody.quantity);
        }
      }

      console.log('🚀 [DUAL-FORMAT] Sending to selected endpoint:', {
        endpoint: apiEndpoint,
        intent: intentResult.intent,
        hasConversationId: !!currentConversationId,
        routingReason: apiEndpoint.includes('support-ai') ? 'Order Builder optimized' : 'Conversation optimized',
        quantityDetected: apiRequestBody.quantity || 'none'
      });

      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(apiRequestBody)
      });

      const data = await response.json();

      // Step 4: Normalize response format for unified handling
      const normalizedData = this.normalizeAIResponse(data, apiEndpoint);
      console.log('🔄 [DUAL-FORMAT] Response normalized:', {
        originalFormat: apiEndpoint.includes('support-ai') ? 'Order Builder' : 'Conversation',
        hasQuoteData: !!normalizedData.quoteData,
        hasOrderBuilder: !!normalizedData.orderBuilder,
        message: normalizedData.message?.substring(0, 100)
      });

      // Step 5: Process normalized AI response
      const aiMessageId = Date.now().toString() + '_ai';
      const aiMessage: any = {
        id: aiMessageId,
        role: 'assistant',
        content: normalizedData.message,
        model: intentResult.model,
        timestamp: new Date()
      };

      console.log('📝 Adding AI message to UI:', { id: aiMessage.id, content: aiMessage.content.substring(0, 100) });
      setMessages((prev: any[]) => [...prev, aiMessage]);

      // Step 6: Handle unified AI response processing
      console.log('🎯 [AI-RESPONSE] Processing normalized AI response:', {
        intent: intentResult.intent,
        hasOrderBuilder: !!normalizedData.orderBuilder,
        hasQuoteData: !!normalizedData.quoteData,
        dataKeys: Object.keys(normalizedData || {})
      });

      if (intentResult.intent === 'ORDER_CREATION' && normalizedData.quoteData) {
        console.log('🎯 [ORDER-CREATION] Processing unified API response with structured quoteData');

        // The normalized response provides structured quoteData from both formats
        const processedQuoteData = normalizedData.quoteData;

        if (onQuoteDataUpdate) {
          console.log('📊 [ORDER-CREATION] Sending structured quote data to Order Builder:', {
            processedQuoteData,
            hasCapDetails: !!processedQuoteData.capDetails,
            hasCustomization: !!processedQuoteData.customization,
            hasDelivery: !!processedQuoteData.delivery,
            hasPricing: !!processedQuoteData.pricing
          });
          onQuoteDataUpdate(processedQuoteData);
        }

      } else if (intentResult.intent === 'ORDER_CREATION' && normalizedData.orderBuilder) {
        console.log('🎯 [SUPPORT AI] Processing step-by-step order builder response');

        // Check for intelligent conversation continuation
        const hasIntelligentContext = normalizedData.conversationContinuation?.hasContext;
        const detectedChanges = normalizedData.conversationContinuation?.detectedChanges || [];

        if (hasIntelligentContext && detectedChanges.length > 0) {
          console.log('✨ [INTELLIGENT CONTEXT] Processing smart conversation continuation:', {
            detectedChanges: detectedChanges.length,
            changedSections: normalizedData.conversationContinuation?.changedSections,
            visualIndicators: Object.keys(normalizedData.conversationContinuation?.visualIndicators || {})
          });
        }

        // Convert normalized response to Order Builder format for compatibility
        const supportOrderBuilderData = normalizedData.orderBuilder;
        const processedQuoteData = {
          capStyle: supportOrderBuilderData.capStyle,
          customization: supportOrderBuilderData.customization,
          delivery: supportOrderBuilderData.delivery,
          costBreakdown: supportOrderBuilderData.costBreakdown,
          totalCost: supportOrderBuilderData.costBreakdown?.totalCost || 0,
          stepProgress: normalizedData.stepProgress,
          // Add intelligent context information
          conversationContinuation: normalizedData.conversationContinuation
        };

        if (onQuoteDataUpdate) {
          console.log('📊 [DEBUG] Sending normalized AI data to Order Builder:', {
            processedQuoteData,
            originalOrderBuilder: normalizedData.orderBuilder,
            hasCapStyle: !!processedQuoteData.capStyle,
            hasCustomization: !!processedQuoteData.customization,
            hasDelivery: !!processedQuoteData.delivery,
            hasCostBreakdown: !!processedQuoteData.costBreakdown,
            hasIntelligentContext
          });
          onQuoteDataUpdate(processedQuoteData);
        }

        // Update order builder status with support AI format
        if (onOrderBuilderUpdate) {
          const builderState = {
            capStyle: {
              completed: supportOrderBuilderData.capStyle?.completed || false,
              status: supportOrderBuilderData.capStyle?.status || 'red'
            },
            customization: {
              completed: supportOrderBuilderData.customization?.completed || false,
              status: supportOrderBuilderData.customization?.status || 'red'
            },
            delivery: {
              completed: supportOrderBuilderData.delivery?.completed || false,
              status: supportOrderBuilderData.delivery?.status || 'red'
            },
            costBreakdown: {
              completed: supportOrderBuilderData.costBreakdown?.available || false,
              status: supportOrderBuilderData.costBreakdown?.available ? 'green' : 'red',
              selectedVersionId: null,
              versions: []
            }
          };

          console.log('🔧 Updating order builder with support AI state:', builderState);
          onOrderBuilderUpdate(builderState);
        }
      } else {
        // Fallback processing for other intents - Use normalized data
        let processedQuoteData = normalizedData.quoteData;

        console.log('📊 Fallback quote data processing:', {
          hasQuoteData: !!processedQuoteData,
          intent: intentResult.intent,
          messageLength: normalizedData.message?.length || 0,
          quoteDataStructure: processedQuoteData ? Object.keys(processedQuoteData) : []
        });

        // Pass quoteData directly - no transformation needed for other intents
        if (processedQuoteData && onQuoteDataUpdate) {
          console.log('📊 [LEGACY] Processing legacy quote data (no transformation):', processedQuoteData);
          onQuoteDataUpdate(processedQuoteData);
        }

        // Legacy order builder state handling
        if (data.orderBuilderState && onOrderBuilderUpdate) {
          console.log('🔧 Updating legacy order builder state:', data.orderBuilderState);
          onOrderBuilderUpdate(data.orderBuilderState);
        }
      }

      // Step 7: Store all messages to database if we have a conversation ID
      // Store support AI responses and update conversation metadata
      if (currentConversationId) {
        try {
          console.log('💾 Storing messages to database...');

          // Store user message
          await this.storeMessage(currentConversationId, {
            id: userMessage.id,
            role: 'USER',
            content: userMessage.content,
            metadata: {
              type: 'user_message',
              intent: intentResult.intent,
              messageStoredAt: new Date().toISOString()
            },
            timestamp: userMessage.timestamp.toISOString()
          }, authHeaders);

          // Store routing message
          await this.storeMessage(currentConversationId, {
            id: routingMessage.id,
            role: 'SYSTEM',
            content: routingMessage.content,
            metadata: {
              type: 'routing_message',
              intent: intentResult.intent,
              assistant: intentResult.assistant,
              messageStoredAt: new Date().toISOString()
            },
            timestamp: routingMessage.timestamp.toISOString()
          }, authHeaders);

          // Store AI response message
          await this.storeMessage(currentConversationId, {
            id: aiMessage.id,
            role: 'ASSISTANT',
            content: aiMessage.content,
            model: intentResult.model,
            metadata: {
              type: 'ai_response',
              intent: intentResult.intent,
              assistant: intentResult.assistant,
              hasQuoteData: !!(intentResult.intent === 'ORDER_CREATION' ? data.orderBuilder : data.quoteData),
              messageStoredAt: new Date().toISOString()
            },
            timestamp: aiMessage.timestamp.toISOString()
          }, authHeaders);

          // Update conversation metadata with support AI data or legacy data
          const hasQuoteData = !!(intentResult.intent === 'ORDER_CREATION' ? data.orderBuilder : data.quoteData);
          const metadataToStore = intentResult.intent === 'ORDER_CREATION' && data.orderBuilder ? {
            hasQuoteData,
            lastAiResponse: aiMessage.content.substring(0, 200),
            supportOrderBuilder: data.orderBuilder,
            stepProgress: data.stepProgress,
            totalCost: data.orderBuilder.costBreakdown?.totalCost || 0,
            lastActivity: new Date().toISOString()
          } : {
            hasQuoteData,
            lastAiResponse: aiMessage.content.substring(0, 200),
            quoteData: data.quoteData,
            orderBuilderState: data.orderBuilderState,
            lastActivity: new Date().toISOString()
          };

          if (hasQuoteData) {
            await this.updateConversationMetadata(currentConversationId, metadataToStore, authHeaders);
          }

          console.log('✅ All messages stored to database successfully');

        } catch (storageError) {
          console.error('❌ Error storing messages to database:', storageError);
          // Don't throw error - message was processed successfully, just storage failed
        }
      }

      // Always show Order Builder for support AI or legacy quote data
      const hasOrderBuilderData = intentResult.intent === 'ORDER_CREATION' ? !!data.orderBuilder : !!data.quoteData;
      if (hasOrderBuilderData) {
        setIsOrderBuilderVisible(true);
      }

      // Always refresh conversation list after AI response (for all intents)
      if (onConversationRefresh && currentConversationId) {
        console.log('🔄 Refreshing conversation list after AI response');
        await onConversationRefresh();
      }

      // Clear uploaded files after successful processing
      setUploadedFiles([]);

      console.log('✅ sendMessage completed successfully');

    } catch (error) {
      console.error('❌ sendMessage error:', error);

      // Add error message to UI
      const errorMessageId = Date.now().toString() + '_error';
      const errorMessage: any = {
        id: errorMessageId,
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your message. Please try again.',
        timestamp: new Date()
      };

      setMessages((prev: any[]) => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
      setIsLoading(false);
    }
  }

  private static detectModificationRequest(message: string): boolean {
    const modificationKeywords = [
      'change', 'update', 'modify', 'switch', 'alter', 'adjust', 'replace',
      'make it', 'instead of', 'different', 'new', 'rather than', 'how about',
      'what if', 'can we', 'pieces', 'quantity'
    ];

    return modificationKeywords.some(keyword =>
      message.toLowerCase().includes(keyword)
    );
  }

  /**
   * Normalize different CapCraft AI response formats to ensure best of both versions
   * - Conversation-optimized format: Great for sidebar/chat flow
   * - Order Builder-optimized format: Perfect for structured Order Builder
   */
  private static normalizeAIResponse(data: any, endpoint: string): any {
    console.log('🔄 [DUAL-FORMAT] Normalizing AI response from:', endpoint);

    // If coming from support-ai (Order Builder optimized), it's already in the best format
    if (endpoint.includes('support-ai')) {
      return {
        ...data,
        // Ensure we have both formats available
        normalizedFrom: 'Order Builder optimized',
        conversationOptimized: true,
        orderBuilderOptimized: true
      };
    }

    // If coming from order-creation (Conversation optimized), enhance for Order Builder
    if (endpoint.includes('order-creation')) {
      console.log('🔄 [DUAL-FORMAT] Enhancing conversation-optimized response for Order Builder');

      // Extract structured data from conversation-optimized response
      const enhancedResponse = {
        ...data,
        // Preserve original conversation-optimized format
        normalizedFrom: 'Conversation optimized',
        conversationOptimized: true,

        // Ensure Order Builder compatibility if missing
        orderBuilder: data.orderBuilder || this.extractOrderBuilderFromConversation(data),
        quoteData: data.quoteData || this.extractQuoteDataFromConversation(data),

        // Add any missing fields for unified handling
        stepProgress: data.stepProgress || {},
        conversationContinuation: data.conversationContinuation || { hasContext: false }
      };

      return enhancedResponse;
    }

    // Fallback: return as-is for other endpoints
    return {
      ...data,
      normalizedFrom: 'Fallback',
      conversationOptimized: true,
      orderBuilderOptimized: false
    };
  }

  /**
   * Extract Order Builder structure from conversation-optimized response
   */
  private static extractOrderBuilderFromConversation(data: any): any {
    if (data.orderBuilder) return data.orderBuilder;

    // Create minimal Order Builder structure from available data
    return {
      capStyle: { completed: !!data.quoteData?.capDetails, status: 'green', data: data.quoteData?.capDetails || {}, cost: 0 },
      customization: { completed: !!data.quoteData?.customization, status: 'green', data: data.quoteData?.customization || {}, cost: 0 },
      delivery: { completed: !!data.quoteData?.delivery, status: 'green', data: data.quoteData?.delivery || {}, cost: 0 },
      costBreakdown: { available: !!data.quoteData?.pricing, totalCost: data.quoteData?.pricing?.total || 0 }
    };
  }

  /**
   * Extract Quote Data structure from conversation-optimized response
   */
  private static extractQuoteDataFromConversation(data: any): any {
    if (data.quoteData) return data.quoteData;

    // Create minimal quote data structure
    return {
      capDetails: data.orderBuilder?.capStyle?.data || {},
      customization: data.orderBuilder?.customization?.data || {},
      delivery: data.orderBuilder?.delivery?.data || {},
      pricing: {
        total: data.orderBuilder?.costBreakdown?.totalCost || 0,
        baseProductCost: data.orderBuilder?.capStyle?.cost || 0,
        logosCost: data.orderBuilder?.customization?.cost || 0,
        deliveryCost: data.orderBuilder?.delivery?.cost || 0
      }
    };
  }

  private static async detectIntent(
    message: string,
    conversationHistory: any[],
    authHeaders: Record<string, string>,
    userId?: string,
    hasFiles: boolean = false
  ) {
    if (hasFiles) {
      console.log('🖼️ Files uploaded, forcing LOGO_ANALYSIS intent');
      return {
        intent: 'LOGO_ANALYSIS',
        model: 'gpt-4o',
        assistant: {
          id: 'logo-expert',
          name: 'LogoCraft Pro',
          displayName: 'LogoCraft Pro 🎨',
          color: 'lime',
          colorHex: '#84cc16',
          icon: '🎨',
          specialty: 'Logo Analysis & Customization Expert'
        }
      };
    }

    // Format conversation history for intent detection
    const intentConversationHistory = conversationHistory
      .slice(-5) // Last 5 messages for context
      .filter(msg => msg.role !== 'system') // Exclude system routing messages
      .map(msg => ({
        role: msg.role,
        content: msg.content
      }));

    const intentResponse = await fetch('/api/support/intent', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        message,
        conversationHistory: intentConversationHistory,
        userId
      })
    });

    const intentData = await intentResponse.json();
    return {
      intent: intentData.intent,
      model: intentData.model,
      assistant: intentData.assistant
    };
  }

  private static getApiEndpoint(intent: string, context?: {
    isOrderBuilderFocused?: boolean;
    hasConversationHistory?: boolean;
    isModification?: boolean;
  }): string {
    switch (intent) {
      case 'ORDER_CREATION':
        // UPDATED ROUTING: Always use step-by-step-pricing for accurate Format #8 pricing
        return '/api/support/step-by-step-pricing'; // Supabase-based accurate pricing
      case 'LOGO_ANALYSIS':
        return '/api/support/logo-analysis'; // LogoCraft Pro
      default:
        return '/api/support/public-queries'; // SupportSage
    }
  }

  private static async createConversation(
    authHeaders: Record<string, string>,
    authUser: any,
    guestContactInfo: any,
    userProfile: any,
    sessionId: string,
    intent: string,
    message: string
  ): Promise<string | null> {
    try {
      const conversationResponse = await fetch('/api/conversations', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          userId: authUser?.id || null,
          sessionId,
          context: intent === 'ORDER_CREATION' ? 'QUOTE_REQUEST' : 'SUPPORT',
          title: intent === 'ORDER_CREATION' ? 'Quote Request' : 'Support Conversation',
          metadata: {
            intent,
            hasQuoteData: false,
            firstMessage: message.substring(0, 100),
            storageMethod: 'pre_ai_creation',
            userProfile: {
              name: userProfile?.name || authUser?.name || guestContactInfo?.name,
              email: userProfile?.email || authUser?.email || guestContactInfo?.email,
              company: userProfile?.company || guestContactInfo?.company,
              phone: userProfile?.phone || guestContactInfo?.phone,
              address: userProfile?.address || guestContactInfo?.address
            }
          }
        })
      });

      if (conversationResponse.ok) {
        const newConversation = await conversationResponse.json();
        console.log('✅ Conversation created before AI call:', newConversation.id);
        return newConversation.id;
      } else {
        console.error('❌ Failed to create conversation before AI call');
        return null;
      }
    } catch (createError) {
      console.error('❌ Error creating conversation before AI call:', createError);
      return null;
    }
  }

  private static async storeMessage(
    conversationId: string,
    messageData: any,
    headers: Record<string, string>
  ): Promise<any> {
    console.log('💾 storeMessage called:', {
      conversationId,
      role: messageData.role,
      contentLength: messageData.content?.length || 0,
      messageId: messageData.id
    });

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const response = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: {
          ...headers,
          'x-request-id': `${messageData.id}_${Date.now()}` // Unique request ID for deduplication
        },
        body: JSON.stringify(messageData),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ storeMessage failed:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
          messageRole: messageData.role
        });
        throw new Error(`Message storage failed: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ storeMessage success:', {
        messageId: result.id,
        role: result.role,
        conversationId: result.conversationId
      });

      return result;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.error('❌ storeMessage timeout after 30 seconds:', { conversationId, messageRole: messageData.role });
        throw new Error('Message storage timed out');
      }

      console.error('❌ storeMessage error:', error);
      throw error;
    }
  }

  private static async updateConversationMetadata(
    conversationId: string,
    metadata: any,
    headers: Record<string, string>
  ): Promise<void> {
    try {
      console.log('📝 Updating conversation metadata:', { conversationId, hasQuoteData: metadata.hasQuoteData });

      const response = await fetch(`/api/conversations/${conversationId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          conversationId,
          metadata,
          lastActivity: new Date().toISOString()
        })
      });

      if (response.ok) {
        console.log('✅ Conversation metadata updated successfully');
      } else {
        console.error('❌ Failed to update conversation metadata:', await response.text());
      }
    } catch (error) {
      console.error('❌ Error updating conversation metadata:', error);
    }
  }

  /**
   * Transform quoteData from API format to Order Builder Service expected format
   */
  static transformQuoteDataToOrderBuilderFormat(quoteData: any): any {
    if (!quoteData) return null;

    console.log('🔄 [TRANSFORM] Input quoteData keys:', Object.keys(quoteData));

    // Create the structure that OrderBuilderService expects
    const transformed = {
      capDetails: {
        // Extract cap details from various possible locations
        quantity: quoteData.quantity || quoteData.pricing?.quantity || 100,
        size: quoteData.size || quoteData.capDetails?.size || 'Large',
        color: quoteData.color || quoteData.colors?.[0] || quoteData.capDetails?.color || 'Black',
        colors: quoteData.colors || quoteData.capDetails?.colors || [quoteData.color || 'Black'],
        profile: quoteData.profile || quoteData.capDetails?.profile || '6P AirFrame',
        billShape: quoteData.billShape || quoteData.capDetails?.billShape || null, // CRITICAL FIX: Don't default to 'Flat', preserve user input
        structure: quoteData.structure || quoteData.capDetails?.structure || '6P AirFrame HSCS',
        fabric: quoteData.fabric || quoteData.capDetails?.fabric || 'Standard',
        closure: quoteData.closure || quoteData.capDetails?.closure || 'Snapback'
      },
      customization: {
        logos: quoteData.logos || quoteData.customization?.logos || [],
        accessories: quoteData.accessories || quoteData.customization?.accessories || [],
        logoSetup: quoteData.logoSetup || quoteData.customization?.logoSetup || 'Standard'
      },
      delivery: {
        method: quoteData.deliveryMethod || quoteData.delivery?.method || 'Regular Delivery',
        leadTime: quoteData.leadTime || quoteData.delivery?.leadTime || '6-10 days',
        totalCost: quoteData.deliveryCost || quoteData.delivery?.totalCost || 0,
        address: quoteData.address || quoteData.delivery?.address || null
      },
      pricing: {
        baseProductCost: quoteData.baseProductCost || quoteData.pricing?.baseProductCost || 0,
        logosCost: quoteData.logosCost || quoteData.pricing?.logosCost || 0,
        deliveryCost: quoteData.deliveryCost || quoteData.pricing?.deliveryCost || 0,
        total: quoteData.total || quoteData.pricing?.total || quoteData.totalCost || 0,
        quantity: quoteData.quantity || quoteData.pricing?.quantity || 100
      }
    };

    console.log('🔄 [TRANSFORM] Output transformed data:', transformed);
    return transformed;
  }
}