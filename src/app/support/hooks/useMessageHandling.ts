import { useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  model?: string;
  timestamp: Date;
  metadata?: any;
}

interface MessageHandlingState {
  messages: Message[];
  isLoading: boolean;
  isProcessing: boolean;
  currentModel: string;
  currentAssistant: any;
}

export function useMessageHandling() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentModel, setCurrentModel] = useState<string>('gpt-4o-mini');
  const [currentAssistant, setCurrentAssistant] = useState<any>(null);

  // Helper function for robust message storage
  const storeMessage = async (conversationId: string, messageData: any, headers: Record<string, string>) => {
    console.log('💾 storeMessage called:', {
      conversationId,
      role: messageData.role,
      contentLength: messageData.content?.length || 0,
      hasHeaders: Object.keys(headers).length > 0,
      messageId: messageData.id,
      isVercelDeployment: !!process.env.VERCEL_URL
    });

    try {
      // Add longer timeout for Vercel serverless functions
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const response = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: {
          ...headers,
          'x-vercel-protection-bypass': process.env.VERCEL_AUTOMATION_BYPASS_SECRET || '',
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
  };

  // Helper function to detect quote keywords for guest users
  const detectQuoteKeywords = (message: string): boolean => {
    const quoteKeywords = ['quote', 'price', 'cost', 'order', 'custom cap', 'hat', 'embroidery', 'logo', 'design', 'bulk'];
    return quoteKeywords.some(keyword =>
      message.toLowerCase().includes(keyword)
    );
  };

  // Intent detection helper
  const detectIntent = async (message: string, conversationHistory: any[], authHeaders: Record<string, string>, userId?: string, hasFiles: boolean = false) => {
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
  };

  // Get API endpoint based on intent
  const getApiEndpoint = (intent: string): string => {
    switch (intent) {
      case 'ORDER_CREATION':
        return '/api/support/order-creation'; // CapCraft AI
      case 'LOGO_ANALYSIS':
        return '/api/support/logo-analysis'; // LogoCraft Pro
      default:
        return '/api/support/public-queries'; // SupportSage
    }
  };

  // Create conversation before AI call
  const createConversation = async (
    authHeaders: Record<string, string>,
    authUser: any,
    guestContactInfo: any,
    userProfile: any,
    sessionId: string,
    intent: string,
    message: string
  ) => {
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
  };

  return {
    // State
    messages,
    setMessages,
    isLoading,
    setIsLoading,
    isProcessing,
    setIsProcessing,
    currentModel,
    setCurrentModel,
    currentAssistant,
    setCurrentAssistant,

    // Helper functions
    storeMessage,
    detectQuoteKeywords,
    detectIntent,
    getApiEndpoint,
    createConversation
  };
}