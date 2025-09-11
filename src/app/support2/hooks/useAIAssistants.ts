import { useState, useCallback } from 'react';
import { AIResponse, IntentType, INTENT_MODEL_MAPPING, AI_ASSISTANTS } from '../types/aiAssistant';

export const useAIAssistants = () => {
  const [currentModel, setCurrentModel] = useState<string>('');
  const [detectedIntent, setDetectedIntent] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  const analyzeIntent = useCallback(async (message: string, conversationHistory: any[] = []): Promise<IntentType> => {
    try {
      const response = await fetch('/api/support/intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message,
          conversationHistory: conversationHistory || []
        })
      });

      if (response.ok) {
        const data = await response.json();
        return data.intent || 'GENERAL';
      }
    } catch (error) {
      console.error('Error analyzing intent:', error);
    }
    
    // Fallback intent detection
    if (message.toLowerCase().includes('quote') || message.toLowerCase().includes('order') || message.toLowerCase().includes('price')) {
      return 'ORDER_CREATION';
    }
    if (message.toLowerCase().includes('logo') || message.toLowerCase().includes('design')) {
      return 'LOGO_ANALYSIS';
    }
    return 'SUPPORT';
  }, []);

  const routeToAssistant = useCallback(async (
    message: string,
    intent: IntentType,
    conversationHistory: any[] = [],
    files?: File[]
  ): Promise<AIResponse> => {
    setIsProcessing(true);
    setDetectedIntent(intent);
    
    const assistantModel = INTENT_MODEL_MAPPING[intent];
    setCurrentModel(assistantModel);

    try {
      let endpoint = '';
      let requestBody: any = { 
        message,
        intent,
        conversationHistory: conversationHistory || []
      };

      switch (intent) {
        case 'ORDER_CREATION':
          endpoint = '/api/order-ai';
          break;
        case 'LOGO_ANALYSIS':
          endpoint = '/api/support/image-analysis';
          if (files?.length) {
            // Handle file upload for logo analysis
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
                intent,
                model: assistantModel
              };
            }
          }
          break;
        case 'SUPPORT':
        case 'GENERAL':
        default:
          endpoint = '/api/support/public-queries';
          break;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      if (response.ok) {
        const data = await response.json();
        return {
          content: data.message || data.response || 'Response received',
          extractedData: data.extractedData || data.quoteData,
          intent,
          model: assistantModel
        };
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error routing to assistant:', error);
      return {
        content: 'I apologize, but I encountered an error processing your request. Please try again.',
        intent,
        model: assistantModel
      };
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const getCurrentAssistant = useCallback(() => {
    return Object.values(AI_ASSISTANTS).find(assistant => assistant.name === currentModel);
  }, [currentModel]);

  const createRoutingMessage = useCallback((intent: IntentType) => {
    const assistantModel = INTENT_MODEL_MAPPING[intent] || 'SupportSage 🌟';
    const assistant = Object.values(AI_ASSISTANTS).find(a => a.name === assistantModel);
    
    if (assistant) {
      return `🔄 Routing your request to ${assistant.name} for ${assistant.description}...`;
    }
    
    // Fallback message
    return `🔄 Routing your request to ${assistantModel} for assistance...`;
  }, []);

  return {
    currentModel,
    detectedIntent,
    isProcessing,
    analyzeIntent,
    routeToAssistant,
    getCurrentAssistant,
    createRoutingMessage,
    setCurrentModel,
    setDetectedIntent
  };
};