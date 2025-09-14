import { useState } from 'react';

export function useSession() {
  const [sessionId] = useState<string>(() => {
    // Try to get existing session from localStorage first
    if (typeof window !== 'undefined') {
      const existingSession = localStorage.getItem('support_session_id');
      if (existingSession) {
        return existingSession;
      }
    }

    // Create new session and store it
    const newSession = `support-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    if (typeof window !== 'undefined') {
      localStorage.setItem('support_session_id', newSession);
    }
    return newSession;
  });

  const [conversationId, setConversationId] = useState<string | null>(null);

  const clearSession = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('support_session_id');
    }
    setConversationId(null);
  };

  const createNewConversation = () => {
    setConversationId(null);
  };

  return {
    sessionId,
    conversationId,
    setConversationId,
    clearSession,
    createNewConversation
  };
}