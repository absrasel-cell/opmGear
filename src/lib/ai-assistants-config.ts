/**
 * AI Assistant Configuration
 * Defines distinct AI assistant identities with names, colors, and specializations
 */

export interface AIAssistant {
  id: string;
  name: string;
  displayName: string;
  color: string;
  colorHex: string;
  icon: string;
  specialty: string;
  description: string;
  model: string;
  temperature: number;
  maxTokens: number;
}

export const AI_ASSISTANTS: Record<string, AIAssistant> = {
  // Order Creation & Quote Generation Specialist
  QUOTE_MASTER: {
    id: 'quote-master',
    name: 'CapCraft AI',
    displayName: 'CapCraft AI',
    color: 'emerald', // Green for crafting/creation
    colorHex: '#10b981',
    icon: '💎',
    specialty: 'Order Creation Specialist',
    description: 'Expert in quote generation, order crafting, and pricing mastery',
    model: 'gpt-4o-mini',
    temperature: 0.3,
    maxTokens: 2000
  },

  // Customer Support & Order Status Specialist  
  SUPPORT_SCOUT: {
    id: 'support-scout',
    name: 'SupportSage',
    displayName: 'SupportSage',
    color: 'blue', // Royal blue for wisdom/support
    colorHex: '#3b82f6',
    icon: '🧙‍♂️',
    specialty: 'AI Support Assistant',
    description: 'Expert in order tracking, customer guidance, and assistance',
    model: 'gpt-4o-mini',
    temperature: 0.7,
    maxTokens: 800
  },

  // Intent Classification & Routing Specialist
  INTENT_ROUTER: {
    id: 'intent-router',
    name: 'IntentRouter',
    displayName: 'IntentRouter AI',
    color: 'purple', // Purple for intelligence/analysis
    colorHex: '#8b5cf6',
    icon: '🎯',
    specialty: 'Intent Detection & Routing',
    description: 'Analyzes customer messages to determine intent and route to appropriate specialist AI.',
    model: 'gpt-4o-mini',
    temperature: 0.1,
    maxTokens: 200
  },

  // Logo Customization Expert Specialist
  LOGO_EXPERT: {
    id: 'logo-expert',
    name: 'LogoCraft Pro',
    displayName: 'LogoCraft Pro',
    color: 'orange', // Orange for creativity/design
    colorHex: '#f97316',
    icon: '🎨',
    specialty: 'Logo Customization Expert',
    description: 'Master of Embroidery, Screen Print, Leather Patch, Rubber Patch analysis and logo-to-cap optimization',
    model: 'gpt-4o',
    temperature: 0.2,
    maxTokens: 1500
  }
};

export const getAssistantById = (id: string): AIAssistant | null => {
  return AI_ASSISTANTS[id] || null;
};

export const getAssistantByIntent = (intent: string): AIAssistant => {
  switch (intent) {
    case 'ORDER_CREATION':
      return AI_ASSISTANTS.QUOTE_MASTER;
    case 'PUBLIC_QUERY':
      return AI_ASSISTANTS.SUPPORT_SCOUT;
    case 'GENERAL_SUPPORT':
      return AI_ASSISTANTS.SUPPORT_SCOUT;
    case 'LOGO_ANALYSIS':
      return AI_ASSISTANTS.LOGO_EXPERT;
    default:
      return AI_ASSISTANTS.SUPPORT_SCOUT;
  }
};

export const formatAssistantResponse = (assistant: AIAssistant, message: string) => {
  return {
    message,
    assistant: {
      id: assistant.id,
      name: assistant.name,
      displayName: assistant.displayName,
      color: assistant.color,
      colorHex: assistant.colorHex,
      icon: assistant.icon,
      specialty: assistant.specialty
    },
    model: assistant.model,
    metadata: {
      assistantSpecialty: assistant.specialty,
      temperature: assistant.temperature,
      maxTokens: assistant.maxTokens
    }
  };
};