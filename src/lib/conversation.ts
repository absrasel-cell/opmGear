/**
 * ConversationService - Handles conversation and message persistence
 * Used by the Order AI system for maintaining conversation context
 */

import { supabaseAdmin } from './supabase';

// Define and export the enums locally since we're moving away from Prisma
export enum MessageRole {
  USER = 'USER',
  ASSISTANT = 'ASSISTANT',
  SYSTEM = 'SYSTEM'
}

export enum ConversationContext {
  SUPPORT = 'SUPPORT',
  SALES = 'SALES',
  ORDER = 'ORDER',
  QUOTE = 'QUOTE'
}

export interface MessageData {
  role: MessageRole | 'user' | 'assistant' | 'system';
  content: string;
  metadata?: any;
}

export interface ConversationData {
  userId?: string;
  sessionId: string;
  context: ConversationContext;
  metadata?: any;
}

export class ConversationService {
  /**
   * Find an existing conversation by ID
   */
  static async getConversationById(conversationId: string) {
    try {
      const { data: conversation, error } = await supabaseAdmin
        .from('Conversation')
        .select('*')
        .eq('id', conversationId)
        .maybeSingle();

      if (error) {
        console.error(`Database error getting conversation ${conversationId}:`, error.message);
        return null;
      }

      return conversation;
    } catch (error) {
      console.error('Failed to get conversation by ID:', error);
      return null;
    }
  }

  /**
   * Find an existing conversation without creating one
   */
  static async findExistingConversation(data: ConversationData) {
    try {
      console.log('Looking for existing conversation with:', { 
        sessionId: data.sessionId, 
        context: data.context, 
        userId: data.userId 
      });

      // Try to find existing conversation by sessionId using Supabase
      const { data: conversation, error } = await supabaseAdmin
        .from('Conversation')
        .select('*')
        .eq('sessionId', data.sessionId)
        .eq('context', data.context)
        .order('createdAt', { ascending: false })
        .limit(1)
        .single();

      if (conversation) {
        console.log('Found existing conversation:', conversation.id, 'for user:', conversation.userId);
      } else {
        console.log('No existing conversation found');
      }

      return conversation;
    } catch (error) {
      console.error('Failed to find existing conversation:', error);
      return null;
    }
  }

  /**
   * Get or create a conversation for a user/session
   */
  static async getOrCreateConversation(data: ConversationData) {
    try {
      console.log('Looking for conversation with:', { 
        sessionId: data.sessionId, 
        context: data.context, 
        userId: data.userId 
      });

      // Try to find existing conversation by sessionId using Supabase
      const { data: conversations, error: findError } = await supabaseAdmin
        .from('Conversation')
        .select('*')
        .eq('sessionId', data.sessionId)
        .eq('context', data.context)
        .order('createdAt', { ascending: false })
        .limit(1);
      
      let conversation = conversations && conversations.length > 0 ? conversations[0] : null;

      // If no conversation found, create a new one
      if (!conversation) {
        console.log('Creating new conversation for userId:', data.userId);
        const conversationId = `conv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        const { data: newConversation, error: createError } = await supabaseAdmin
          .from('Conversation')
          .insert({
            id: conversationId,
            userId: data.userId,
            sessionId: data.sessionId,
            context: data.context,
            metadata: data.metadata || {},
            status: 'ACTIVE',
            isArchived: false,
            lastActivity: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          })
          .select()
          .single();
        
        if (createError) {
          throw new Error(`Failed to create conversation: ${createError.message}`);
        }
        
        conversation = newConversation;
        console.log('Created conversation:', conversation.id, 'for user:', conversation.userId);
      } else {
        console.log('Found existing conversation:', conversation.id, 'for user:', conversation.userId);
      }

      return conversation;
    } catch (error) {
      console.error('Failed to get or create conversation:', error);
      // Fallback conversation object
      return {
        id: `fallback-${Date.now()}`,
        userId: data.userId,
        sessionId: data.sessionId,
        context: data.context,
        metadata: data.metadata || {},
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }
  }

  /**
   * Get conversation history with recent messages
   */
  static async getConversationHistory(conversationId: string, limit: number = 10) {
    try {
      const { data: messages, error } = await supabaseAdmin
        .from('ConversationMessage')
        .select('*')
        .eq('conversationId', conversationId)
        .order('createdAt', { ascending: true })
        .limit(limit);

      if (error) {
        throw new Error(`Failed to get conversation history: ${error.message}`);
      }

      return messages || [];
    } catch (error) {
      console.error('Failed to get conversation history:', error);
      return [];
    }
  }

  /**
   * Get conversation context (alias for getConversationHistory)
   */
  static async getConversationContext(conversationId: string, limit: number = 10) {
    return this.getConversationHistory(conversationId, limit);
  }

  /**
   * Add a message to a conversation
   */
  static async addMessage(conversationId: string, messageData: MessageData) {
    try {
      console.log('Adding message to conversation:', conversationId, { 
        role: messageData.role, 
        contentLength: messageData.content.length 
      });

      // Map string roles to MessageRole enum
      const roleMapping: Record<string, MessageRole> = {
        'user': MessageRole.USER,
        'assistant': MessageRole.ASSISTANT,
        'system': MessageRole.SYSTEM,
        'USER': MessageRole.USER,
        'ASSISTANT': MessageRole.ASSISTANT,
        'SYSTEM': MessageRole.SYSTEM
      };

      const mappedRole = typeof messageData.role === 'string' 
        ? roleMapping[messageData.role] || roleMapping[messageData.role.toLowerCase()] || MessageRole.USER
        : messageData.role;

      const messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date().toISOString();

      const { data: message, error } = await supabaseAdmin
        .from('ConversationMessage')
        .insert({
          id: messageId,
          conversationId,
          role: mappedRole,
          content: messageData.content,
          metadata: messageData.metadata || {},
          createdAt: now,
          updatedAt: now
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create message: ${error.message}`);
      }

      console.log('Message saved with ID:', message.id);

      // Update conversation's updatedAt timestamp
      await supabaseAdmin
        .from('Conversation')
        .update({
          lastActivity: now,
          updatedAt: now
        })
        .eq('id', conversationId);

      return message;
    } catch (error) {
      console.error('Failed to add message to conversation:', error);
      // Return a fallback message object
      return {
        id: `fallback-msg-${Date.now()}`,
        conversationId,
        role: messageData.role,
        content: messageData.content,
        metadata: messageData.metadata || {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }
  }

  /**
   * Mark a conversation as inactive
   */
  static async endConversation(conversationId: string) {
    try {
      const { error } = await supabaseAdmin
        .from('Conversation')
        .update({
          status: 'ARCHIVED',
          updatedAt: new Date().toISOString()
        })
        .eq('id', conversationId);

      if (error) {
        throw new Error(`Failed to end conversation: ${error.message}`);
      }
    } catch (error) {
      console.error('Failed to end conversation:', error);
    }
  }

  /**
   * Delete all messages in a conversation
   */
  static async deleteConversationMessages(conversationId: string) {
    try {
      const { error: deleteError } = await supabaseAdmin
        .from('ConversationMessage')
        .delete()
        .eq('conversationId', conversationId);

      if (deleteError) {
        throw new Error(`Failed to delete messages: ${deleteError.message}`);
      }

      // Update conversation timestamp
      const now = new Date().toISOString();
      const { error: updateError } = await supabaseAdmin
        .from('Conversation')
        .update({
          updatedAt: now,
          lastActivity: now
        })
        .eq('id', conversationId);

      if (updateError) {
        throw new Error(`Failed to update conversation: ${updateError.message}`);
      }

      return { count: 1 }; // Supabase doesn't return count by default
    } catch (error) {
      console.error('Failed to delete conversation messages:', error);
      throw error;
    }
  }

  /**
   * Delete a conversation completely
   */
  static async deleteConversation(conversationId: string) {
    try {
      // First delete all messages (cascade should handle this, but being explicit)
      const { error: messagesError } = await supabaseAdmin
        .from('ConversationMessage')
        .delete()
        .eq('conversationId', conversationId);

      if (messagesError) {
        throw new Error(`Failed to delete messages: ${messagesError.message}`);
      }

      // Then delete the conversation
      const { error: conversationError } = await supabaseAdmin
        .from('Conversation')
        .delete()
        .eq('id', conversationId);

      if (conversationError) {
        throw new Error(`Failed to delete conversation: ${conversationError.message}`);
      }

      return true;
    } catch (error) {
      console.error('Failed to delete conversation:', error);
      throw error;
    }
  }
}