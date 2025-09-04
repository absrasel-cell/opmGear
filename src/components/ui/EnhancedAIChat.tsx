/**
 * Enhanced AI Chat Component
 * Seamless integration with LogoCraft Pro and CapCraft AI system
 * Features logo analysis, quote generation, and AI handoffs
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  PaperAirplaneIcon, 
  PhotoIcon, 
  CpuChipIcon,
  SparklesIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  assistant?: {
    id: string;
    name: string;
    displayName: string;
    color: string;
    colorHex: string;
    icon: string;
    specialty: string;
  };
  metadata?: any;
  uploadedFiles?: any[];
}

interface EnhancedAIChatProps {
  onOrderCreate?: (orderData: any) => void;
  onQuoteGenerate?: (quoteData: any) => void;
  initialMessage?: string;
  className?: string;
}

export default function EnhancedAIChat({
  onOrderCreate,
  onQuoteGenerate,
  initialMessage,
  className = ''
}: EnhancedAIChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [currentAssistant, setCurrentAssistant] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);
  const [logoAnalysisData, setLogoAnalysisData] = useState<any>(null);
  const [handoffInProgress, setHandoffInProgress] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Send initial message if provided
  useEffect(() => {
    if (initialMessage && messages.length === 0) {
      handleSendMessage(initialMessage);
    }
  }, [initialMessage]);

  const handleSendMessage = async (messageText?: string) => {
    const text = messageText || inputMessage.trim();
    if (!text) return;

    setIsLoading(true);
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date(),
      uploadedFiles: uploadedFiles.length > 0 ? uploadedFiles : undefined
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');

    try {
      const response = await fetch('/api/ai-support', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: text,
          conversationId,
          uploadedFiles: uploadedFiles.length > 0 ? uploadedFiles : undefined,
          currentAssistant,
          logoAnalysisData
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Update conversation state
      if (data.conversationId && !conversationId) {
        setConversationId(data.conversationId);
      }
      
      // Update current assistant
      if (data.assistant) {
        setCurrentAssistant(data.assistant.id);
      }
      
      // Handle handoff
      if (data.handoff) {
        setHandoffInProgress(true);
        setCurrentAssistant(data.handoff.toAssistant);
        
        // Store logo analysis data for quote generation
        if (data.handoff.logoAnalysis) {
          setLogoAnalysisData(data.handoff.logoAnalysis);
        }
        
        setTimeout(() => setHandoffInProgress(false), 2000);
      }
      
      // Handle quote data
      if (data.metadata?.quoteData && onQuoteGenerate) {
        onQuoteGenerate(data.metadata.quoteData);
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.message,
        timestamp: new Date(),
        assistant: data.assistant,
        metadata: data.metadata
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      // Clear uploaded files after processing
      setUploadedFiles([]);

    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'I apologize, but I encountered an error processing your request. Please try again.',
        timestamp: new Date(),
        assistant: {
          id: 'error',
          name: 'System',
          displayName: 'System Error',
          color: 'red',
          colorHex: '#ef4444',
          icon: '⚠️',
          specialty: 'Error Handler'
        }
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files?.length) return;

    const uploadPromises = Array.from(files).map(async (file) => {
      // Create temporary URL for preview
      const previewUrl = URL.createObjectURL(file);
      
      // In a real implementation, upload to your storage service
      // For now, we'll use the preview URL
      return {
        name: file.name,
        type: file.type,
        size: file.size,
        url: previewUrl,
        preview: previewUrl
      };
    });

    const uploadedFilesData = await Promise.all(uploadPromises);
    setUploadedFiles(prev => [...prev, ...uploadedFilesData]);
  };

  const removeUploadedFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const getAssistantBadge = (assistant: any) => {
    if (!assistant) return null;
    
    return (
      <div 
        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium mb-2`}
        style={{ 
          backgroundColor: `${assistant.colorHex}20`,
          color: assistant.colorHex,
          border: `1px solid ${assistant.colorHex}40`
        }}
      >
        <span>{assistant.icon}</span>
        <span>{assistant.displayName}</span>
        <span className="text-xs opacity-70">• {assistant.specialty}</span>
      </div>
    );
  };

  return (
    <div className={`flex flex-col h-full bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 ${className}`}>
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-lime-500/20 rounded-lg">
              <CpuChipIcon className="h-6 w-6 text-lime-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white">AI Support Center</h3>
              <p className="text-sm text-white/60">
                {currentAssistant === 'logo-expert' ? 'LogoCraft Pro • Logo Analysis Expert' :
                 currentAssistant === 'quote-master' ? 'CapCraft AI • Quote Generation Specialist' :
                 currentAssistant === 'support-scout' ? 'SupportSage • Customer Support Assistant' :
                 'Multi-AI Support System'}
              </p>
            </div>
          </div>
          
          {handoffInProgress && (
            <div className="flex items-center gap-2 px-3 py-1 bg-blue-500/20 rounded-full">
              <ArrowPathIcon className="h-4 w-4 text-blue-400 animate-spin" />
              <span className="text-xs text-blue-400">AI Handoff</span>
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-8 text-white/60">
            <SparklesIcon className="h-12 w-12 mx-auto mb-4 text-lime-400" />
            <h4 className="text-lg font-medium text-white mb-2">Welcome to AI Support</h4>
            <p className="text-sm">
              Upload your logo for analysis or ask about custom cap quotes and orders.
              Our AI specialists are ready to help!
            </p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl p-4 ${
                message.role === 'user'
                  ? 'bg-lime-500 text-white'
                  : 'bg-white/10 backdrop-blur-sm border border-white/20 text-white'
              }`}
            >
              {message.role === 'assistant' && message.assistant && (
                <div className="mb-2">
                  {getAssistantBadge(message.assistant)}
                </div>
              )}
              
              <div className="whitespace-pre-wrap">{message.content}</div>
              
              {message.uploadedFiles && message.uploadedFiles.length > 0 && (
                <div className="mt-2 flex gap-2">
                  {message.uploadedFiles.map((file, index) => (
                    <div key={index} className="relative">
                      {file.type.startsWith('image/') ? (
                        <img
                          src={file.preview || file.url}
                          alt={file.name}
                          className="w-16 h-16 object-cover rounded-lg border border-white/20"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-white/10 rounded-lg border border-white/20 flex items-center justify-center">
                          <span className="text-xs text-white/60">{file.name.split('.').pop()}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              
              <div className="text-xs opacity-60 mt-2">
                {message.timestamp.toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-4 text-white">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-lime-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-lime-400 rounded-full animate-bounce delay-100"></div>
                  <div className="w-2 h-2 bg-lime-400 rounded-full animate-bounce delay-200"></div>
                </div>
                <span className="text-sm">AI processing...</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* File Upload Preview */}
      {uploadedFiles.length > 0 && (
        <div className="flex-shrink-0 p-4 border-t border-white/10">
          <div className="flex gap-2 mb-2">
            <span className="text-sm text-white/80">Uploaded files:</span>
          </div>
          <div className="flex gap-2 overflow-x-auto">
            {uploadedFiles.map((file, index) => (
              <div key={index} className="relative flex-shrink-0">
                {file.type.startsWith('image/') ? (
                  <img
                    src={file.preview}
                    alt={file.name}
                    className="w-20 h-20 object-cover rounded-lg border border-white/20"
                  />
                ) : (
                  <div className="w-20 h-20 bg-white/10 rounded-lg border border-white/20 flex items-center justify-center">
                    <span className="text-xs text-white/60">{file.name.split('.').pop()}</span>
                  </div>
                )}
                <button
                  onClick={() => removeUploadedFile(index)}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="flex-shrink-0 p-4 border-t border-white/10">
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.pdf,.doc,.docx"
            onChange={handleFileUpload}
            className="hidden"
          />
          
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors text-white/80 hover:text-white"
            title="Upload files"
          >
            <PhotoIcon className="h-5 w-5" />
          </button>
          
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="Ask about logo analysis, quotes, or custom cap orders..."
            className="flex-1 px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-lime-500 focus:border-transparent"
            disabled={isLoading}
          />
          
          <button
            onClick={() => handleSendMessage()}
            disabled={isLoading || !inputMessage.trim()}
            className="p-2 bg-lime-500 hover:bg-lime-600 disabled:bg-gray-500 disabled:opacity-50 rounded-xl transition-colors text-white"
            title="Send message"
          >
            <PaperAirplaneIcon className="h-5 w-5" />
          </button>
        </div>
        
        <div className="text-xs text-white/50 mt-2 text-center">
          Upload logos for analysis • Ask for quotes • Get expert recommendations
        </div>
      </div>
    </div>
  );
}