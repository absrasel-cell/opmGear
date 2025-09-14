import React from 'react';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import { Message } from '../types';

interface ChatInterfaceProps {
  messages: Message[];
  isLoading: boolean;
  inputMessage: string;
  setInputMessage: (message: string) => void;
  uploadedFiles: string[];
  setUploadedFiles: React.Dispatch<React.SetStateAction<string[]>>;
  isUploading: boolean;
  canQuoteOrder: () => boolean;
  onSendMessage: (e: React.FormEvent) => void;
  onFileUpload: (files: FileList) => void;
  onQuoteOrder: () => void;
  onTriggerFileUpload: () => void;
  onRemoveFile?: (index: number) => void;
  onRetry?: (messageId: string) => void;
  showSessionStart?: boolean;
}

const ChatInterface = ({
  messages,
  isLoading,
  inputMessage,
  setInputMessage,
  uploadedFiles,
  setUploadedFiles,
  isUploading,
  canQuoteOrder,
  onSendMessage,
  onFileUpload,
  onQuoteOrder,
  onTriggerFileUpload,
  onRemoveFile,
  onRetry,
  showSessionStart = true
}: ChatInterfaceProps) => {
  return (
    <section className="order-1 lg:order-1 flex flex-col bg-black/20 backdrop-blur-md border border-stone-800 rounded-2xl shadow-[0_20px_70px_-10px_rgba(0,0,0,0.3)] min-h-[500px] sm:min-h-[600px] lg:min-h-[700px] max-h-[80vh]">
      {/* Header */}
      <div className="flex items-center justify-between p-3 sm:p-4 md:p-5 border-b border-stone-600">
        <div>
          <h2 className="text-lg sm:text-xl font-semibold text-white tracking-tight">
            AI Support Chat
          </h2>
          <p className="text-sm text-white/60 mt-0.5">
            Get instant help with orders, quotes, and custom caps
          </p>
        </div>
      </div>

      {/* Messages */}
      <MessageList
        messages={messages}
        isLoading={isLoading}
        onRetry={onRetry}
        showSessionStart={showSessionStart}
      />

      {/* Input */}
      <MessageInput
        inputMessage={inputMessage}
        setInputMessage={setInputMessage}
        uploadedFiles={uploadedFiles}
        setUploadedFiles={setUploadedFiles}
        isLoading={isLoading}
        isUploading={isUploading}
        canQuoteOrder={canQuoteOrder}
        onSendMessage={onSendMessage}
        onFileUpload={onFileUpload}
        onQuoteOrder={onQuoteOrder}
        onTriggerFileUpload={onTriggerFileUpload}
        onRemoveFile={onRemoveFile}
      />
    </section>
  );
};

export default ChatInterface;