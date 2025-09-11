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
  phone?: string;
  address?: any;
  company?: string;
}

export interface GuestContactInfo {
  name: string;
  email: string;
  phone?: string;
  address?: string;
  company?: string;
}

export interface ConversationSummary {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: Date;
  hasQuotes: boolean;
  messageCount: number;
  context: string;
}