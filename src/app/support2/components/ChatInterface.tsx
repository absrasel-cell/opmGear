import React, { useState, useRef, useEffect } from 'react';
import { Message } from '../types/conversation';
import { UploadedFile } from '../hooks/useFileUpload';
import {
  PaperClipIcon,
  ArrowUpRightIcon,
  SparklesIcon,
  BoltIcon,
  CpuChipIcon
} from '@heroicons/react/24/outline';

interface ChatInterfaceProps {
  messages: Message[];
  isLoading: boolean;
  onSendMessage: (message: string, files?: File[]) => void;
  onFileUpload: (files: File[]) => void;
  uploadedFiles: UploadedFile[];
  onRemoveFile: (fileId: string) => void;
  isProcessing: boolean;
  currentModel: string;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  messages,
  isLoading,
  onSendMessage,
  onFileUpload,
  uploadedFiles,
  onRemoveFile,
  isProcessing,
  currentModel
}) => {
  const [inputMessage, setInputMessage] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() && uploadedFiles.length === 0) return;

    const files = uploadedFiles.map(f => f.file);
    onSendMessage(inputMessage.trim(), files.length > 0 ? files : undefined);
    setInputMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      onFileUpload(files);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      onFileUpload(files);
    }
  };

  const getMessageIcon = (message: Message) => {
    if (message.role === 'user') return null;
    
    if (message.model?.includes('CapCraft')) return '💎';
    if (message.model?.includes('SupportSage')) return '🌟';
    if (message.model?.includes('LogoCraft')) return '🎨';
    if (message.role === 'system') return '🔄';
    
    return <CpuChipIcon className="w-4 h-4" />;
  };

  const formatTimestamp = (timestamp: Date) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="flex flex-col h-full max-h-[calc(100vh-200px)]">
      {/* Messages Area */}
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-6 space-y-4"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isDragOver && (
          <div className="fixed inset-0 bg-lime-500/20 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white/10 backdrop-blur-md border border-lime-500/30 rounded-2xl p-8 text-center">
              <PaperClipIcon className="w-12 h-12 mx-auto mb-4 text-lime-400" />
              <p className="text-white text-lg">Drop files here to upload</p>
            </div>
          </div>
        )}

        {messages.length === 0 ? (
          <div className="text-center py-12">
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8 max-w-md mx-auto">
              <SparklesIcon className="w-16 h-16 mx-auto mb-4 text-lime-400" />
              <h3 className="text-xl font-semibold text-white mb-2">
                Welcome to AI Support
              </h3>
              <p className="text-gray-300 mb-4">
                Ask me anything about custom caps, get quotes, or upload your logo for analysis.
              </p>
              <div className="flex justify-center gap-2 text-sm">
                <span className="bg-lime-500/20 text-lime-400 px-3 py-1 rounded-full">💎 Quotes</span>
                <span className="bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full">🌟 Support</span>
                <span className="bg-purple-500/20 text-purple-400 px-3 py-1 rounded-full">🎨 Logo Analysis</span>
              </div>
            </div>
          </div>
        ) : (
          messages.map((message, index) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} fade-in`}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div
                className={`max-w-[80%] p-4 backdrop-blur-xl ${
                  message.role === 'user'
                    ? 'rounded-[20px] border border-orange-400/30 bg-gradient-to-br from-orange-600/20 via-orange-500/15 to-orange-400/10 text-white shadow-[0_8px_30px_rgba(218,141,38,0.25)] ring-1 ring-orange-400/20'
                    : message.role === 'system'
                    ? 'rounded-2xl bg-blue-500/20 border border-blue-500/30 text-blue-100'
                    : 'rounded-[20px] border border-rose-800/30 bg-gradient-to-br from-rose-900/20 via-rose-800/15 to-rose-700/10 text-white shadow-[0_8px_30px_rgba(136,19,55,0.25)] ring-1 ring-rose-800/20'
                }`}
              >
                {message.role !== 'user' && (
                  <div className="flex items-center gap-2 mb-2 text-sm text-gray-300">
                    {getMessageIcon(message)}
                    <span className="font-medium">
                      {message.model || 'AI Assistant'}
                    </span>
                    <span className="text-gray-400">
                      {formatTimestamp(message.timestamp)}
                    </span>
                  </div>
                )}
                
                <div className="whitespace-pre-wrap">
                  {message.content}
                </div>
                
                {message.role === 'user' && (
                  <div className="text-xs text-gray-300 mt-2 text-right">
                    {formatTimestamp(message.timestamp)}
                  </div>
                )}
              </div>
            </div>
          ))
        )}

        {isProcessing && (
          <div className="flex justify-start">
            <div className="bg-white/10 border border-white/20 backdrop-blur-md rounded-2xl p-4 max-w-[80%]">
              <div className="flex items-center gap-2 mb-2 text-sm text-gray-300">
                <BoltIcon className="w-4 h-4 animate-pulse" />
                <span className="font-medium">{currentModel || 'AI Assistant'}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-300">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-lime-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-lime-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-lime-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <span className="text-sm">Processing your request...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* File Upload Area */}
      {uploadedFiles.length > 0 && (
        <div className="border-t border-white/10 p-4">
          <div className="flex gap-2 flex-wrap">
            {uploadedFiles.map((file) => (
              <div
                key={file.id}
                className="relative bg-white/10 border border-white/20 rounded-xl p-3 flex items-center gap-2"
              >
                {file.preview && (
                  <img
                    src={file.preview}
                    alt={file.file.name}
                    className="w-8 h-8 object-cover rounded"
                  />
                )}
                <span className="text-sm text-white truncate max-w-32">
                  {file.file.name}
                </span>
                <button
                  onClick={() => onRemoveFile(file.id)}
                  className="text-red-400 hover:text-red-300 ml-2"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="border-t border-white/10 p-4">
        <form onSubmit={handleSubmit} className="relative">
          <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-4 focus-within:border-lime-500/50 transition-colors shadow-xl">
            <textarea
              ref={textareaRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask about custom caps, request a quote, or upload files..."
              className="w-full bg-transparent text-white placeholder-gray-400 resize-none focus:outline-none"
              rows={1}
              style={{
                minHeight: '24px',
                maxHeight: '120px'
              }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
              }}
            />
            
            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-gray-400 hover:text-white transition-colors p-1"
                >
                  <PaperClipIcon className="w-5 h-5" />
                </button>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,image/svg+xml,application/pdf,application/illustrator,application/postscript,image/eps,text/plain"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
              
              <button
                type="submit"
                disabled={!inputMessage.trim() && uploadedFiles.length === 0}
                className="bg-lime-500/20 hover:bg-lime-500/30 disabled:bg-gray-500/20 border border-lime-500/30 disabled:border-gray-500/30 text-lime-400 disabled:text-gray-500 rounded-xl px-4 py-2 transition-all duration-200 flex items-center gap-2 disabled:cursor-not-allowed"
              >
                <span className="text-sm font-medium">Send</span>
                <ArrowUpRightIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};