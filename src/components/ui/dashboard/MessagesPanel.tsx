'use client';

import { useAuth } from '@/components/auth/AuthContext';
import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { MessageCircle, Send, Paperclip, Search, User, Check, CheckCheck } from 'lucide-react';

interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

interface Conversation {
  conversationId: string;
  lastMessage: Message;
  unreadCount: number;
}

export default function MessagesPanel() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      fetchConversations();
      
      // Handle URL parameters for pre-filling support conversation
      const urlParams = new URLSearchParams(window.location.search);
      const start = urlParams.get('start');
      const category = urlParams.get('category');
      const customerEmail = urlParams.get('customerEmail');
      const customerName = urlParams.get('customerName');
      const orderId = urlParams.get('orderId');
      
      if (start === 'support' && customerEmail) {
        // Pre-fill a support message
        const supportMessage = `Hello ${customerName || 'there'}! 👋

I'm here to help you with your ${category === 'order' ? `order #${orderId}` : 'inquiry'}.

How can I assist you today?`;
        
        setNewMessage(supportMessage);
      }
    }
  }, [user]);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation);
    }
  }, [selectedConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchConversations = async () => {
    try {
      const query = user?.role === 'ADMIN' ? '?isAdminView=true' : '';
      const response = await fetch(`/api/messages${query}`);
      if (response.ok) {
        const data = await response.json();
        setConversations(data.conversations || []);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMessages = async (conversationId: string) => {
    try {
      const response = await fetch(`/api/messages?conversationId=${conversationId}`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    
    try {
      const messageData = {
        content: newMessage,
        category: 'GENERAL',
        priority: 'NORMAL',
      };

      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messageData),
      });

      if (response.ok) {
        setNewMessage('');
        await fetchConversations();
        if (selectedConversation) {
          await fetchMessages(selectedConversation);
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const filteredConversations = conversations.filter(conv => 
    conv.lastMessage.senderName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.lastMessage.message.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col bg-black/80 border border-stone-600 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-stone-600 bg-stone-700">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-lime-400/20 flex items-center justify-center">
            <MessageCircle className="w-5 h-5 text-lime-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Messages</h2>
            <p className="text-sm text-slate-400">
              {conversations.length} conversations
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              setNewMessage('');
              setSelectedConversation(null);
            }}
            className="p-2 rounded-lg bg-lime-400/20 text-lime-400 hover:bg-lime-400/30 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Conversations Sidebar */}
        <div className="w-80 border-r border-stone-600 bg-stone-700">
          {/* Search */}
          <div className="p-4 border-b border-stone-600">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-black/30 border border-stone-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-400/50"
              />
            </div>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-lime-400"></div>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-4 text-center">
                <MessageCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-slate-400 text-sm">No conversations found</p>
              </div>
            ) : (
              filteredConversations.map((conversation) => (
                <div
                  key={conversation.conversationId}
                  onClick={() => setSelectedConversation(conversation.conversationId)}
                  className={`p-4 border-b border-white/5 cursor-pointer transition-colors ${
                    selectedConversation === conversation.conversationId
                      ? 'bg-lime-400/10 border-lime-400/20'
                      : 'hover:bg-stone-700'
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <div className="w-10 h-10 rounded-full bg-slate-600 flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium text-white truncate">
                          {conversation.lastMessage.senderName}
                        </h3>
                        <span className="text-xs text-slate-400">
                          {formatTime(conversation.lastMessage.createdAt)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 truncate mt-1">
                        {conversation.lastMessage.message}
                      </p>
                      {conversation.unreadCount > 0 && (
                        <span className="inline-block mt-2 text-xs bg-lime-400 text-black px-2 py-1 rounded-full">
                          {conversation.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 flex flex-col">
          {selectedConversation ? (
            <>
              {/* Messages */}
              <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.senderId === user?.id ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-xs lg:max-w-md ${
                      message.senderId === user?.id
                        ? 'bg-lime-400/20 text-white'
                        : 'bg-stone-600 text-white'
                    } rounded-lg p-3`}>
                      <p className="text-sm">{message.message}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-slate-400">
                          {formatTime(message.createdAt)}
                        </span>
                        {message.senderId === user?.id && (
                          <div className="flex items-center space-x-1">
                            {message.isRead ? (
                              <CheckCheck className="w-3 h-3 text-lime-400" />
                            ) : (
                              <Check className="w-3 h-3 text-slate-400" />
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="p-4 border-t border-stone-600 bg-stone-700">
                <div className="flex items-end space-x-2">
                  <div className="flex-1">
                    <textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type a message..."
                      rows={1}
                      className="w-full px-3 py-2 bg-black/30 border border-stone-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-400/50 resize-none"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          sendMessage();
                        }
                      }}
                    />
                  </div>
                  <button
                    onClick={sendMessage}
                    disabled={!newMessage.trim()}
                    className="p-2 rounded-lg bg-lime-400 text-black hover:bg-lime-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageCircle className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">Select a conversation</h3>
                <p className="text-slate-400">Choose a conversation from the sidebar to start messaging</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
