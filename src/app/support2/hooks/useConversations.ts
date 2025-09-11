import { useState, useEffect, useCallback } from 'react';
import { Message, ConversationSummary, UserProfile } from '../types/conversation';
import { useAuth } from '@/components/auth/AuthContext';

export const useConversations = () => {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const { authUser, session } = useAuth();

  const loadUserConversations = useCallback(async () => {
    if (isLoadingConversations) return;
    
    setIsLoadingConversations(true);
    try {
      const response = await fetch('/api/conversations?limit=50', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include' // Include cookies for authentication
      });

      if (response.ok) {
        const data = await response.json();
        setConversations(data.conversations || []);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setIsLoadingConversations(false);
    }
  }, [isLoadingConversations]);

  const loadConversation = useCallback(async (conversationId: string) => {
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };

      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch(`/api/conversations/${conversationId}`, {
        method: 'GET',
        headers,
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
        setCurrentConversationId(conversationId);
        return data;
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
    } finally {
      setIsLoading(false);
    }
  }, [session?.access_token, isLoading]);

  const createNewConversation = useCallback(async () => {
    try {
      // Generate session ID similar to original support page
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const requestBody = {
        userId: authUser?.id || null,
        sessionId: sessionId, // Always include sessionId
        context: 'SUPPORT',
        title: 'Support Conversation',
        metadata: {
          createdAt: new Date().toISOString()
        }
      };

      console.log('🔄 Creating conversation with:', {
        hasUserId: !!requestBody.userId,
        hasSessionId: !!requestBody.sessionId,
        authUserEmail: authUser?.email
      });

      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include', // Include cookies for authentication
        body: JSON.stringify(requestBody)
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentConversationId(data.id);
        setMessages([]);
        await loadUserConversations();
        return data.id;
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
    }
  }, [authUser?.id, loadUserConversations]);

  const deleteConversation = useCallback(async (conversationId: string) => {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };

      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch(`/api/conversations/${conversationId}`, {
        method: 'DELETE',
        headers
      });

      if (response.ok) {
        setConversations(prev => prev.filter(c => c.id !== conversationId));
        if (currentConversationId === conversationId) {
          setCurrentConversationId(null);
          setMessages([]);
        }
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
    }
  }, [session?.access_token, currentConversationId]);

  const addMessage = useCallback((message: Message) => {
    setMessages(prev => [...prev, message]);
  }, []);

  const storeConversation = useCallback(async (
    userMessage: string,
    assistantMessage: string,
    intent: string,
    extractedData?: any
  ) => {
    if (!currentConversationId) return;

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };

      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      await fetch(`/api/conversations/${currentConversationId}/messages`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          userMessage,
          assistantMessage,
          intent,
          extractedData
        })
      });

      await loadUserConversations();
    } catch (error) {
      console.error('Error storing conversation:', error);
    }
  }, [currentConversationId, session?.access_token, loadUserConversations]);

  useEffect(() => {
    if (authUser?.id) {
      loadUserConversations();
    }
  }, [authUser?.id, loadUserConversations]);

  return {
    conversations,
    currentConversationId,
    messages,
    isLoading,
    isLoadingConversations,
    loadConversation,
    createNewConversation,
    deleteConversation,
    addMessage,
    storeConversation,
    loadUserConversations
  };
};