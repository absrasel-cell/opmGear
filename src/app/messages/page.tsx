'use client';

import { useAuth } from '@/components/auth/AuthContext';
import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  recipientId: string;
  recipientName: string;
  recipientRole: string;
  message: string;
  messageType: 'text' | 'image' | 'file' | 'emoji';
  category: string;
  priority: string;
  attachments: FileAttachment[];
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
  replyTo?: {
    id: string;
    preview: string;
    senderName: string;
  };
}

interface FileAttachment {
  url: string;
  name: string;
  size: number;
  type: string;
  category: string;
}

interface Conversation {
  conversationId: string;
  lastMessage: Message;
  unreadCount: number;
  messageCount: number;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

function MessagesPageContent() {
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [selectedRecipient, setSelectedRecipient] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Message composition
  const [newMessage, setNewMessage] = useState('');
  const [messageCategory, setMessageCategory] = useState('general');
  const [messagePriority, setMessagePriority] = useState('normal');
  const [isSending, setSending] = useState(false);
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  
  // UI states
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [isPrefillingSupport, setIsPrefillingSupport] = useState(false);
  const [replyTo, setReplyTo] = useState<{ id: string; preview: string; senderName: string } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
      return;
    }
    
    if (isAuthenticated && user) {
      fetchConversations();
      if (user.role === 'admin') {
        fetchUsers();
      }
      // Prefill support conversation via query params
      const start = searchParams?.get('start');
      const category = searchParams?.get('category');
      if (start === 'support') {
        prefillSupportConversation(category || undefined);
      }
    }
  }, [loading, isAuthenticated, user, router, searchParams]);

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
        // Mark as read quickly in the background
        const messageIds = (data.messages || []).filter((m: any) => !m.isRead).map((m: any) => m.id);
        if (messageIds.length > 0) {
          fetch('/api/messages', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messageIds, isRead: true })
          }).catch(() => {});
        }
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const prefillSupportConversation = async (category?: string) => {
    try {
      setIsPrefillingSupport(true);
      // Get a support/admin recipient the member can message
      const res = await fetch('/api/messages/support-recipient');
      if (res.ok) {
        const data = await res.json();
        if (data?.user) {
           setSelectedRecipient({
             id: data.user.id,
             name: data.user.name || 'Support Team',
             email: data.user.email || '',
             role: 'admin',
           });
          if (category) setMessageCategory(category);
          const orderId = searchParams?.get('orderId');
          if (orderId) {
            setNewMessage(`I would like to know update on this order (#${orderId}). `);
          }
          setShowNewConversation(true);
        }
      }
    } catch (e) {
      // no-op
    } finally {
      setIsPrefillingSupport(false);
    }
  };

  // Mark-as-read is handled in fetchMessages via a background PATCH

  const sendMessage = async () => {
    if ((!newMessage.trim() && attachments.length === 0) || !selectedRecipient) return;

    const tempId = `temp-${Date.now()}`;
    const nowIso = new Date().toISOString();
    const convId = selectedConversation || [user?.id, selectedRecipient.id].sort().join('|');

    const optimistic: Message = {
      id: tempId,
      conversationId: convId,
      senderId: user?.id || '',
      senderName: user?.name || user?.email || 'You',
      senderRole: user?.role || 'CUSTOMER',
      recipientId: selectedRecipient.id,
      recipientName: selectedRecipient.name,
      recipientRole: selectedRecipient.role,
      message: newMessage.trim(),
      messageType: attachments.length > 0 ? 'file' : 'text',
      category: messageCategory,
      priority: messagePriority,
      attachments: attachments,
      isRead: true,
      createdAt: nowIso,
      updatedAt: nowIso,
      replyTo: replyTo ? { id: replyTo.id, preview: replyTo.preview, senderName: replyTo.senderName } : undefined
    };

    // Optimistically update UI
    if (!selectedConversation) setSelectedConversation(convId);
    setMessages(prev => [...prev, optimistic]);
    setConversations(prev => {
      const existing = prev.find(c => c.conversationId === convId);
      if (existing) {
        return prev.map(c => c.conversationId === convId
          ? { ...c, lastMessage: optimistic, messageCount: (c.messageCount || 0) + 1 }
          : c
        );
      }
      return [
        ...prev,
        { conversationId: convId, lastMessage: optimistic, unreadCount: 0, messageCount: 1 }
      ];
    });

    setSending(true);
    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientId: selectedRecipient.id,
          content: newMessage.trim(),
          messageType: attachments.length > 0 ? 'file' : 'text',
          category: messageCategory,
          priority: messagePriority,
          conversationId: selectedConversation,
          attachments: attachments,
          replyTo: replyTo ? { id: replyTo.id, preview: replyTo.preview, senderName: replyTo.senderName } : undefined
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const saved = data.data;

        const committed: Message = {
          id: saved.id,
          conversationId: convId,
          senderId: saved.fromUserId,
          senderName: saved.fromName,
          senderRole: saved.fromUser?.role || 'CUSTOMER',
          recipientId: saved.toUserId,
          recipientName: saved.toName,
          recipientRole: saved.toUser?.role || 'CUSTOMER',
          message: saved.content,
          messageType: attachments.length > 0 ? 'file' : 'text',
          category: saved.category,
          priority: saved.priority,
          attachments: saved.attachments || [],
          isRead: saved.isRead,
          createdAt: saved.createdAt,
          updatedAt: saved.updatedAt,
          replyTo: optimistic.replyTo
        };

        // Replace optimistic with committed
        setMessages(prev => prev.map(m => m.id === tempId ? committed : m));
        setConversations(prev => prev.map(c => c.conversationId === convId
          ? { ...c, lastMessage: committed }
          : c
        ));

        // Clear composer
        setNewMessage('');
        setAttachments([]);
        setMessageCategory('general');
        setMessagePriority('normal');
        setReplyTo(null);
      } else {
        const errorData = await response.json();
        // Rollback optimistic message
        setMessages(prev => prev.filter(m => m.id !== tempId));
        setConversations(prev => prev.map(c => c.conversationId === convId
          ? { ...c, messageCount: Math.max(0, (c.messageCount || 1) - 1) }
          : c
        ));
        alert(`Failed to send message: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      // Rollback optimistic message
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setConversations(prev => prev.map(c => c.conversationId === convId
        ? { ...c, messageCount: Math.max(0, (c.messageCount || 1) - 1) }
        : c
      ));
      alert('Network error. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setAttachments(prev => [...prev, data.file]);
      } else {
        const errorData = await response.json();
        alert(`Upload failed: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  };

  const insertEmoji = (emoji: string) => {
    setNewMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'order': return '📦';
      case 'support': return '🛠️';
      case 'billing': return '💳';
      case 'urgent': return '🚨';
      default: return '💬';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'order': return 'bg-blue-100 text-blue-800';
      case 'support': return 'bg-green-100 text-green-800';
      case 'billing': return 'bg-yellow-100 text-yellow-800';
      case 'urgent': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent': return '🔥';
      case 'high': return '📌';
      case 'low': return '📋';
      default: return '📝';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading Messages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="px-4 py-6 sm:px-0">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Messages</h1>
              <p className="mt-2 text-gray-600">
                {user?.role === 'admin' ? 'Communicate with members' : 'Chat with support team'}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/dashboard"
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-all duration-200"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                </svg>
                Dashboard
              </Link>
              {/* New message CTA for everyone */}
              <button
                onClick={() => {
                  if (user?.role === 'admin') {
                    setShowNewConversation(true);
                  } else {
                    prefillSupportConversation();
                  }
                }}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-all duration-200"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                {user?.role === 'admin' ? 'New Message' : 'Message Support'}
              </button>
            </div>
          </div>
        </div>

        {/* Messages Interface */}
        <div className="px-4 sm:px-0">
          <div className="bg-white shadow-xl rounded-2xl overflow-hidden h-[800px] flex">
            {/* Conversations Sidebar */}
            <div className="w-1/3 border-r border-gray-200 flex flex-col">
              <div className="p-4 border-b border-gray-200 bg-gray-50">
                <h2 className="text-lg font-semibold text-gray-900">Conversations</h2>
                <p className="text-sm text-gray-600">
                  {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
                </p>
                <div className="mt-2 h-1 rounded-full bg-gradient-to-r from-transparent via-gray-300 to-transparent animate-header-shimmer"></div>
              </div>
              
              <div className="flex-1 overflow-y-auto">
                {isLoading ? (
                  <div className="p-4 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-2 text-sm text-gray-500">Loading conversations...</p>
                  </div>
                ) : conversations.length > 0 ? (
                  conversations.map((conversation) => (
                    <div
                      key={conversation.conversationId}
                      onClick={() => {
                        setSelectedConversation(conversation.conversationId);
                        setSelectedRecipient({
                          id: user?.id === conversation.lastMessage.senderId 
                            ? conversation.lastMessage.recipientId 
                            : conversation.lastMessage.senderId,
                          name: user?.id === conversation.lastMessage.senderId 
                            ? conversation.lastMessage.recipientName 
                            : conversation.lastMessage.senderName,
                          email: '',
                          role: user?.id === conversation.lastMessage.senderId 
                            ? conversation.lastMessage.recipientRole 
                            : conversation.lastMessage.senderRole
                        });
                        setShowNewConversation(false);
                      }}
                      className={`p-4 cursor-pointer hover:bg-gray-50 border-b border-gray-100 transition-colors ${
                        selectedConversation === conversation.conversationId ? 'bg-blue-50 border-blue-200' : ''
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            (user?.id === conversation.lastMessage.senderId 
                              ? conversation.lastMessage.recipientRole 
                              : conversation.lastMessage.senderRole) === 'admin' 
                              ? 'bg-red-100 text-red-600' 
                              : 'bg-blue-100 text-blue-600'
                          }`}>
                            {(user?.id === conversation.lastMessage.senderId 
                              ? conversation.lastMessage.recipientRole 
                              : conversation.lastMessage.senderRole) === 'admin' ? '👑' : '👤'}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {user?.id === conversation.lastMessage.senderId 
                                ? conversation.lastMessage.recipientName 
                                : conversation.lastMessage.senderName}
                            </p>
                            {conversation.unreadCount > 0 && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                {conversation.unreadCount}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center space-x-1 mt-1">
                            <span className="text-xs">{getCategoryIcon(conversation.lastMessage.category)}</span>
                                                         <p className="text-sm text-gray-500 truncate">
                               {(conversation.lastMessage.message || conversation.lastMessage.content) || 
                                (conversation.lastMessage.attachments?.length > 0 ? `📎 ${conversation.lastMessage.attachments.length} file(s)` : 'No content')}
                             </p>
                          </div>
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(conversation.lastMessage.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center">
                    <div className="text-6xl mb-4">💬</div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No conversations yet</h3>
                    <p className="text-sm text-gray-500">
                      {user?.role === 'admin' 
                        ? 'Start a new conversation with a member' 
                        : 'Contact support to begin messaging'}
                    </p>
                    {user?.role !== 'admin' && (
                      <button
                        onClick={() => prefillSupportConversation('order')}
                        className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition"
                      >
                        Start Order Status Message
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 flex flex-col">
              {(selectedRecipient && (selectedConversation || showNewConversation)) ? (
                <>
                  {/* Chat Header */}
                  <div className="p-4 border-b border-gray-200 bg-gray-50">
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        selectedRecipient.role === 'admin' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
                      }`}>
                        {selectedRecipient.role === 'admin' ? '👑' : '👤'}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{selectedRecipient.name}</h3>
                        <p className="text-sm text-gray-500 capitalize">{selectedRecipient.role}</p>
                      </div>
                    </div>
                  </div>

                  {/* Messages */}
                  <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.length > 0 ? (
                      messages.map((message, idx) => (
                        <div key={message.id} className="space-y-1">
                          <div className={`flex ${message.senderId === user?.id ? 'justify-end animate-chat-in-right' : 'justify-start animate-chat-in-left'}`} style={{ animationDelay: `${Math.min(idx,6)*30}ms` }} onContextMenu={(e) => {
                            e.preventDefault();
                            const preview = (message.message || (message.attachments?.[0]?.name ?? '')).toString();
                            setReplyTo({ id: message.id, preview: preview, senderName: message.senderName });
                          }}>
                            <div className={`max-w-xs lg:max-w-md px-3 py-2 ${
                              message.senderId === user?.id ? 'bubble-right' : 'bubble-left'
                            }`}>
                              {message.replyTo && (
                                <div className={`mb-2 text-xs rounded px-2 py-1 ${message.senderId === user?.id ? 'bg-white/15 text-white' : 'bg-white/70 text-gray-700'}`}>
                                  Replying to <span className="font-semibold">{message.replyTo.senderName}</span>: "{message.replyTo.preview}"
                                </div>
                              )}
                              {/* Message Header */}
                              <div className="flex items-center space-x-1 mb-1 opacity-70 text-[11px]">
                                <span>{getCategoryIcon(message.category)}</span>
                                <span>{getPriorityIcon(message.priority)}</span>
                                <span className={`${message.senderId === user?.id ? 'text-white' : 'text-gray-600'}`}>{message.senderName}</span>
                              </div>
                              
                                                             {/* Message Content */}
                               {(message.message || message.content) && (
                                 <p className="text-[14px] leading-relaxed whitespace-pre-wrap">{message.message || message.content}</p>
                               )}
                              
                              {/* Attachments */}
                              {message.attachments && message.attachments.length > 0 && (
                                <div className="mt-2 space-y-2">
                                  {message.attachments.map((attachment, index) => (
                                    <div key={index} className={`p-2 rounded ${
                                      message.senderId === user?.id ? 'bg-white/15 text-white' : 'bg-white text-gray-800'
                                    }`}>
                                      {attachment.category === 'image' ? (
                                        <img
                                          src={attachment.url}
                                          alt={attachment.name}
                                          className="max-w-full h-auto rounded cursor-pointer"
                                          onClick={() => window.open(attachment.url, '_blank')}
                                        />
                                      ) : (
                                        <a
                                          href={attachment.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className={`flex items-center space-x-2 ${message.senderId === user?.id ? 'text-white hover:opacity-90' : 'text-blue-600 hover:text-blue-800'}`}
                                        >
                                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                          </svg>
                                          <div>
                                            <p className="text-xs font-medium">{attachment.name}</p>
                                            <p className="text-xs opacity-75">{formatFileSize(attachment.size)}</p>
                                          </div>
                                        </a>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className={`mt-1 text-[11px] ${message.senderId === user?.id ? 'text-right text-gray-400' : 'text-left text-gray-500'}`}>
                            {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8">
                        <div className="text-4xl mb-2">👋</div>
                        <p className="text-gray-500">Start the conversation!</p>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Message Composer */}
                  <div className="border-t border-gray-200 p-4 bg-gray-50">
                    {replyTo && (
                      <div className="mb-3 flex items-start justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm">
                        <div>
                          <div className="text-gray-500">Replying to <span className="font-medium text-gray-700">{replyTo.senderName}</span></div>
                          <div className="text-gray-700 line-clamp-1 max-w-[60ch]">"{replyTo.preview}"</div>
                        </div>
                        <button className="text-gray-400 hover:text-gray-600" onClick={() => setReplyTo(null)}>×</button>
                      </div>
                    )}
                    {isSending && (
                      <div className="mb-2 text-xs text-gray-500 animate-typing"><span>•</span><span>•</span><span>•</span></div>
                    )}
                    {/* Attachments Preview */}
                    {attachments.length > 0 && (
                      <div className="mb-3 flex flex-wrap gap-2">
                        {attachments.map((attachment, index) => (
                          <div key={index} className="flex items-center space-x-2 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                            <span>📎</span>
                            <span>{attachment.name}</span>
                            <button
                              onClick={() => removeAttachment(index)}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Message Category and Priority */}
                    <div className="flex space-x-4 mb-3">
                      <select
                        value={messageCategory}
                        onChange={(e) => setMessageCategory(e.target.value)}
                        className="text-sm border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="general">💬 General</option>
                        <option value="order">📦 Order Related</option>
                        <option value="support">🛠️ Support</option>
                        <option value="billing">💳 Billing</option>
                        <option value="urgent">🚨 Urgent</option>
                      </select>
                      
                      <select
                        value={messagePriority}
                        onChange={(e) => setMessagePriority(e.target.value)}
                        className="text-sm border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="low">📋 Low</option>
                        <option value="normal">📝 Normal</option>
                        <option value="high">📌 High</option>
                        <option value="urgent">🔥 Urgent</option>
                      </select>
                    </div>

                    {/* Message Input */}
                    <div className="flex items-end space-x-2">
                      <div className="flex-1 relative">
                        <textarea
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          placeholder="Type your message..."
                          rows={3}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                          disabled={isSending}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              sendMessage();
                            }
                          }}
                        />
                        
                        {/* Emoji Picker */}
                        {showEmojiPicker && (
                          <div className="absolute bottom-full mb-2 left-0 bg-white border border-gray-300 rounded-lg p-3 shadow-lg z-10">
                            <div className="grid grid-cols-8 gap-1">
                              {['😀', '😃', '😄', '😁', '😊', '😍', '🤗', '🤔', '😊', '👍', '👎', '❤️', '🎉', '🎊', '🔥', '💯', '✅', '❌', '⚠️', '🚨', '💡', '📝', '📋', '📌', '🛠️', '💳', '📦', '💬', '🤝', '🙏', '👏', '🎯'].map((emoji, idx) => (
                                <button
                                  key={`${emoji}-${idx}`}
                                  onClick={() => insertEmoji(emoji)}
                                  className="text-lg hover:bg-gray-100 p-1 rounded"
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex flex-col space-y-2">
                        <button
                          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                          className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                          title="Add emoji"
                        >
                          😀
                        </button>
                        
                        <input
                          ref={fileInputRef}
                          type="file"
                          onChange={handleFileUpload}
                          className="hidden"
                          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                        />
                        
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUploading}
                          className="p-2 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
                          title="Attach file"
                        >
                          {isUploading ? (
                            <div className="animate-spin w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full"></div>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                            </svg>
                          )}
                        </button>
                        
                        <button
                          onClick={sendMessage}
                          disabled={isSending || (!newMessage.trim() && attachments.length === 0)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {isSending ? (
                            <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              ) : showNewConversation && user?.role === 'admin' ? (
                /* New Conversation Interface for Admins */
                <div className="flex-1 flex flex-col">
                  <div className="p-4 border-b border-gray-200 bg-gray-50">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-900">Start New Conversation</h3>
                      <button
                        onClick={() => setShowNewConversation(false)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex-1 p-4">
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Select Member</label>
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                                                 {users.filter(u => u.role !== 'admin').map((member) => (
                           <div
                             key={member.id}
                             onClick={() => {
                               setSelectedRecipient(member);
                               setSelectedConversation(null);
                             }}
                             className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                               selectedRecipient?.id === member.id
                                 ? 'border-blue-500 bg-blue-50'
                                 : 'border-gray-200 hover:border-gray-300'
                             }`}
                          >
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
                                👤
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">{member.name}</p>
                                <p className="text-sm text-gray-500">{member.email}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : ( 
                /* Welcome Screen */
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-8xl mb-4">💬</div>
                    <h3 className="text-xl font-medium text-gray-900 mb-2">Welcome to Messages</h3>
                    <p className="text-gray-500 mb-4">
                      {user?.role === 'admin' 
                        ? 'Select a conversation or start a new one to begin messaging with members'
                        : 'Select a conversation to start chatting with our support team'}
                    </p>
                    {user?.role === 'admin' ? (
                      <button
                        onClick={() => setShowNewConversation(true)}
                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Start New Conversation
                      </button>
                    ) : (
                      <button
                        onClick={() => prefillSupportConversation('order')}
                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Message Support (Order Status)
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MessagesPage() {
  return (
    <Suspense fallback={<div>Loading messages...</div>}>
      <MessagesPageContent />
    </Suspense>
  );
}
