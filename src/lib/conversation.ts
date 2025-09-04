/**
 * ConversationService - Handles conversation and message persistence
 * Used by the Order AI system for maintaining conversation context
 */

import { PrismaClient, MessageRole, ConversationContext } from '@prisma/client';

const prisma = new PrismaClient();

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
      const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId }
      });
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

      // Try to find existing conversation by sessionId
      const conversation = await prisma.conversation.findFirst({
        where: {
          sessionId: data.sessionId,
          context: data.context,
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

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

      // Try to find existing conversation by sessionId
      let conversation = await prisma.conversation.findFirst({
        where: {
          sessionId: data.sessionId,
          context: data.context,
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      // If no conversation found, create a new one
      if (!conversation) {
        console.log('Creating new conversation for userId:', data.userId);
        conversation = await prisma.conversation.create({
          data: {
            id: `conv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            userId: data.userId,
            sessionId: data.sessionId,
            context: data.context,
            metadata: data.metadata || {},
            status: 'ACTIVE',
            updatedAt: new Date(),
          },
        });
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
      const messages = await prisma.conversationMessage.findMany({
        where: {
          conversationId,
        },
        orderBy: {
          createdAt: 'asc'
        },
        take: limit,
      });

      return messages;
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
        'system': MessageRole.SYSTEM
      };

      const mappedRole = typeof messageData.role === 'string' 
        ? roleMapping[messageData.role.toLowerCase()] || MessageRole.USER
        : messageData.role;

      const message = await prisma.conversationMessage.create({
        data: {
          id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          conversationId,
          role: mappedRole,
          content: messageData.content,
          metadata: messageData.metadata || {},
          updatedAt: new Date(),
        },
      });

      console.log('Message saved with ID:', message.id);

      // Update conversation's updatedAt timestamp
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { 
          lastActivity: new Date(),
          updatedAt: new Date() 
        }
      });

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
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { 
          status: 'ARCHIVED',
          updatedAt: new Date()
        }
      });
    } catch (error) {
      console.error('Failed to end conversation:', error);
    }
  }

  /**
   * Delete all messages in a conversation
   */
  static async deleteConversationMessages(conversationId: string) {
    try {
      const deletedMessages = await prisma.conversationMessage.deleteMany({
        where: {
          conversationId,
        }
      });

      // Update conversation timestamp
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { 
          updatedAt: new Date(),
          lastActivity: new Date()
        }
      });

      return deletedMessages;
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
      await prisma.conversationMessage.deleteMany({
        where: {
          conversationId,
        }
      });

      // Then delete the conversation
      await prisma.conversation.delete({
        where: { id: conversationId }
      });

      return true;
    } catch (error) {
      console.error('Failed to delete conversation:', error);
      throw error;
    }
  }
}