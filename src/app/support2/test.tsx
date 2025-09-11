'use client';

import React from 'react';
import { useAuth } from '@/components/auth/AuthContext';

export default function TestPage() {
  const { authUser, session } = useAuth();

  const testConversationCreation = async () => {
    try {
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const requestBody = {
        userId: authUser?.id || null,
        sessionId: sessionId,
        context: 'SUPPORT',
        title: 'Test Conversation',
        metadata: {
          createdAt: new Date().toISOString()
        }
      };

      console.log('🔄 Creating test conversation with:', requestBody);

      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(requestBody)
      });

      const result = await response.json();
      console.log('🔄 Test conversation result:', { status: response.status, result });
      
      if (response.ok) {
        alert('Conversation created successfully! ID: ' + result.id);
      } else {
        alert('Failed to create conversation: ' + JSON.stringify(result));
      }
    } catch (error) {
      console.error('Test conversation creation error:', error);
      alert('Error: ' + error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black p-8">
      <div className="max-w-md mx-auto bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6">
        <h1 className="text-2xl font-bold text-white mb-4">Support2 Debug Test</h1>
        
        <div className="space-y-4 text-white">
          <div>
            <strong>Auth User:</strong> {authUser?.email || 'Not logged in'}
          </div>
          <div>
            <strong>User ID:</strong> {authUser?.id || 'None'}
          </div>
          <div>
            <strong>Session:</strong> {session?.access_token ? 'Valid' : 'None'}
          </div>
          
          <button
            onClick={testConversationCreation}
            className="w-full bg-lime-500/20 hover:bg-lime-500/30 border border-lime-500/30 text-lime-400 font-medium py-3 rounded-xl transition-all duration-200"
            disabled={!authUser?.id}
          >
            Test Conversation Creation
          </button>
          
          {!authUser?.id && (
            <p className="text-red-400 text-sm">
              Please log in to test conversation creation
            </p>
          )}
        </div>
      </div>
    </div>
  );
}