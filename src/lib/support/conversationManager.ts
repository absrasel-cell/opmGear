export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  model?: string;
  timestamp: Date;
  metadata?: any;
}

export interface UserProfile {
  id?: string;
  name?: string;
  email?: string;
  businessInfo?: {
    companyName?: string;
    businessType?: string;
    volume?: string;
  };
  preferences?: any;
}

export class ConversationManager {
  private static instance: ConversationManager;
  
  public static getInstance(): ConversationManager {
    if (!ConversationManager.instance) {
      ConversationManager.instance = new ConversationManager();
    }
    return ConversationManager.instance;
  }

  async storeConversation(
    conversationId: string,
    userMessage: string,
    assistantMessage: string,
    intent: string,
    extractedData?: any,
    userProfile?: UserProfile,
    orderBuilderStatus?: any,
    leadTimeData?: any,
    session?: any
  ): Promise<void> {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };

      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          userMessage,
          assistantMessage,
          intent,
          extractedData,
          metadata: {
            userProfile,
            orderBuilder: {
              orderBuilderStatus,
              leadTimeData,
              timestamp: new Date().toISOString()
            }
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to store conversation: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error storing conversation:', error);
      throw error;
    }
  }

  async updateConversationMetadata(
    conversationId: string,
    metadata: any,
    session?: any
  ): Promise<void> {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };

      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      await fetch(`/api/conversations/${conversationId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ metadata })
      });
    } catch (error) {
      console.error('Error updating conversation metadata:', error);
    }
  }

  async restoreConversationState(
    conversationId: string,
    session?: any
  ): Promise<any> {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };

      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch(`/api/conversations/${conversationId}/restore-state`, {
        method: 'POST',
        headers,
        body: JSON.stringify({})
      });

      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error('Error restoring conversation state:', error);
    }
    return null;
  }

  generateMessageId(): string {
    return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  createMessage(
    role: 'user' | 'assistant' | 'system',
    content: string,
    model?: string,
    metadata?: any
  ): Message {
    return {
      id: this.generateMessageId(),
      role,
      content,
      model,
      timestamp: new Date(),
      metadata
    };
  }

  formatMessageContent(content: string, extractedData?: any): string {
    if (!extractedData) return content;

    // Format quote data if present
    if (extractedData.quoteData) {
      const quote = extractedData.quoteData;
      return `${content}\n\n**Quote Summary:**\n• Quantity: ${quote.quantity || 'N/A'} pieces\n• Base Cost: $${quote.baseProductCost?.toLocaleString() || '0'}\n• Total: $${quote.total?.toLocaleString() || '0'}`;
    }

    return content;
  }

  async saveQuote(
    conversationId: string,
    quoteData: any,
    userProfile?: UserProfile,
    session?: any
  ): Promise<void> {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };

      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      await fetch('/api/conversations/save-quote', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          conversationId,
          quoteData,
          userProfile
        })
      });
    } catch (error) {
      console.error('Error saving quote:', error);
      throw error;
    }
  }
}