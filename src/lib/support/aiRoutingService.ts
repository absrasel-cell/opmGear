import { AI_ASSISTANTS } from '@/lib/ai-assistants-config';

export type IntentType = 'ORDER_CREATION' | 'LOGO_ANALYSIS' | 'SUPPORT' | 'GENERAL';

export const INTENT_MODEL_MAPPING: Record<IntentType, string> = {
  ORDER_CREATION: 'CapCraft AI 💎',
  LOGO_ANALYSIS: 'LogoCraft Pro 🎨',
  SUPPORT: 'SupportSage 🌟',
  GENERAL: 'SupportSage 🌟'
};

export class AIRoutingService {
  private static instance: AIRoutingService;
  
  public static getInstance(): AIRoutingService {
    if (!AIRoutingService.instance) {
      AIRoutingService.instance = new AIRoutingService();
    }
    return AIRoutingService.instance;
  }

  async detectIntent(message: string): Promise<IntentType> {
    try {
      const response = await fetch('/api/support/intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      });

      if (response.ok) {
        const data = await response.json();
        return data.intent || this.fallbackIntentDetection(message);
      }
    } catch (error) {
      console.error('Error detecting intent:', error);
    }
    
    return this.fallbackIntentDetection(message);
  }

  private fallbackIntentDetection(message: string): IntentType {
    const lowerMessage = message.toLowerCase();

    // More aggressive pattern matching for order creation
    const explicitQuotePatterns = [
      /create\s+(me\s+)?a?\s*quote\s+for/i,
      /\d+\s+pieces?\s*[,.]?\s*\w+\s+fabric/i,  // "144 piece, Acrylic fabric"
      /quote\s+for\s+\d+/i,
      /\d+\s+piece.*with.*embroidery/i,
      /\d+\s+caps?\s*[,.]?\s*\w+\s*\/\s*\w+/i,  // "144 caps, Red/White"
    ];

    // Check explicit patterns first
    if (explicitQuotePatterns.some(pattern => pattern.test(message))) {
      return 'ORDER_CREATION';
    }

    // Keywords for order creation
    const orderKeywords = ['quote', 'order', 'price', 'pricing', 'cost', 'buy', 'purchase', 'caps', 'quantity', 'fabric', 'embroidery', 'piece', 'custom cap'];
    if (orderKeywords.some(keyword => lowerMessage.includes(keyword))) {
      return 'ORDER_CREATION';
    }

    // Keywords for logo analysis (but not if it also has order keywords)
    const logoKeywords = ['logo', 'design', 'image', 'artwork', 'graphics'];
    if (logoKeywords.some(keyword => lowerMessage.includes(keyword)) &&
        !orderKeywords.some(keyword => lowerMessage.includes(keyword))) {
      return 'LOGO_ANALYSIS';
    }

    // Default to support
    return 'SUPPORT';
  }

  async routeToAI(
    message: string,
    intent: IntentType,
    files?: File[]
  ): Promise<{
    content: string;
    extractedData?: any;
    model: string;
  }> {
    const assistantModel = INTENT_MODEL_MAPPING[intent];
    
    try {
      let endpoint = '';
      let requestData: any = { message };

      switch (intent) {
        case 'ORDER_CREATION':
          endpoint = '/api/order-ai';
          break;
        case 'LOGO_ANALYSIS':
          endpoint = '/api/support/image-analysis';
          break;
        case 'SUPPORT':
        case 'GENERAL':
        default:
          endpoint = '/api/support/public-queries';
          break;
      }

      // Handle file uploads for logo analysis
      if (intent === 'LOGO_ANALYSIS' && files?.length) {
        const formData = new FormData();
        formData.append('message', message);
        files.forEach(file => formData.append('files', file));
        
        const response = await fetch(endpoint, {
          method: 'POST',
          body: formData
        });
        
        if (response.ok) {
          const data = await response.json();
          return {
            content: data.message || data.response || 'Analysis completed',
            extractedData: data.extractedData,
            model: assistantModel
          };
        }
      }

      // Regular API call
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      });

      if (response.ok) {
        const data = await response.json();
        return {
          content: data.message || data.response || 'Response received',
          extractedData: data.extractedData || data.quoteData,
          model: assistantModel
        };
      } else {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error(`Error routing to ${assistantModel}:`, error);
      return {
        content: 'I apologize, but I encountered an error processing your request. Please try again or contact support if the issue persists.',
        model: assistantModel
      };
    }
  }

  getAssistantInfo(intent: IntentType): typeof AI_ASSISTANTS[keyof typeof AI_ASSISTANTS] | undefined {
    const modelName = INTENT_MODEL_MAPPING[intent];
    return Object.values(AI_ASSISTANTS).find(assistant => assistant.name === modelName);
  }

  createRoutingMessage(intent: IntentType): string {
    const assistant = this.getAssistantInfo(intent);
    if (!assistant) return 'Routing your request...';
    
    return `🔄 Routing your request to ${assistant.name} for ${assistant.description}...`;
  }

  extractQuoteData(response: any): any {
    if (!response) return null;
    
    // Extract quote data from various response formats
    if (response.extractedData) {
      return response.extractedData;
    }
    
    if (response.quoteData) {
      return response.quoteData;
    }
    
    // Try to parse from response content
    try {
      const content = response.content || response.message || '';
      const lines = content.split('\n');
      
      const quoteData: any = {};
      
      for (const line of lines) {
        if (line.includes('Quantity:')) {
          const match = line.match(/(\d+)/);
          if (match) quoteData.quantity = parseInt(match[1]);
        }
        if (line.includes('Total:') || line.includes('Cost:')) {
          const match = line.match(/\$?([\d,]+\.?\d*)/);
          if (match) quoteData.total = parseFloat(match[1].replace(/,/g, ''));
        }
      }
      
      return Object.keys(quoteData).length > 0 ? quoteData : null;
    } catch (error) {
      console.error('Error extracting quote data:', error);
      return null;
    }
  }
}