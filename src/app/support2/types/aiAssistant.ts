export interface AIAssistant {
  name: string;
  icon: string;
  description: string;
  model: string;
  endpoint: string;
}

export interface AIResponse {
  content: string;
  extractedData?: any;
  intent?: string;
  model?: string;
}

export type IntentType = 'ORDER_CREATION' | 'SUPPORT' | 'LOGO_ANALYSIS' | 'GENERAL';

export const AI_ASSISTANTS: Record<string, AIAssistant> = {
  CAPCRAFT: {
    name: 'CapCraft AI 💎',
    icon: '💎',
    description: 'Quote generation and order creation',
    model: 'CapCraft AI',
    endpoint: '/api/order-ai'
  },
  SUPPORTSAGE: {
    name: 'SupportSage 🌟',
    icon: '🌟',
    description: 'General support and customer service',
    model: 'SupportSage',
    endpoint: '/api/support/public-queries'
  },
  LOGOCRAFT: {
    name: 'LogoCraft Pro 🎨',
    icon: '🎨',
    description: 'Logo analysis and recommendations',
    model: 'LogoCraft Pro',
    endpoint: '/api/support/image-analysis'
  }
};

export const INTENT_MODEL_MAPPING: Record<IntentType, string> = {
  ORDER_CREATION: 'CapCraft AI 💎',
  SUPPORT: 'SupportSage 🌟',
  LOGO_ANALYSIS: 'LogoCraft Pro 🎨',
  GENERAL: 'SupportSage 🌟'
};