'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  ConversationSidebar,
  ClearAllConfirmationDialog,
  Message,
  OrderBuilderStatus,
  OrderBuilder,
  ArtworkUploader
} from './components';
import {
  SparklesIcon,
  CpuChipIcon,
  ChatBubbleLeftRightIcon,
  ArrowUpRightIcon,
  PaperClipIcon,
  DocumentTextIcon,
  CheckIcon,
  ClipboardDocumentListIcon,
  CogIcon,
  TruckIcon,
  CurrencyDollarIcon,
  ChevronDownIcon,
  CalendarDaysIcon,
  ArchiveBoxIcon,
  ScaleIcon,
  ClockIcon,
  ArrowPathIcon,
  XMarkIcon,
  PlusIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import { useAuthentication } from './hooks/useAuthentication';
import { useSession } from './hooks/useSession';
import { useConversationManagement } from './hooks/useConversationManagement';
import { FileUploadService } from './services/fileUploadService';
import { UtilitiesService } from './services/utilitiesService';

export default function SupportPage() {
  console.log('🎯 SUPPORT PAGE: Component function executed');

  // Authentication and session management
  const {
    authUser,
    authLoading,
    isAuthenticated,
    userProfile,
    guestContactInfo,
    showGuestContactForm,
    pendingQuoteMessage,
    handleGuestQuoteRequest,
    submitGuestQuote,
    resetGuestForm
  } = useAuthentication();

  const {
    sessionId,
    conversationId,
    setConversationId,
    createNewConversation
  } = useSession();

  // Core state
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isOrderBuilderVisible, setIsOrderBuilderVisible] = useState(false);
  const [currentQuoteData, setCurrentQuoteData] = useState(null);
  const [hasNewQuoteInSession, setHasNewQuoteInSession] = useState(false);
  const [orderBuilderStatus, setOrderBuilderStatus] = useState<OrderBuilderStatus>({
    capStyle: {
      completed: false,
      status: 'red',
      items: {
        size: false,
        color: false,
        profile: false,
        shape: false,
        structure: false,
        fabric: false,
        stitch: false
      }
    },
    customization: {
      completed: false,
      status: 'red',
      items: {
        logoSetup: false,
        accessories: false,
        moldCharges: false
      },
      logoPositions: []
    },
    delivery: {
      completed: false,
      status: 'red',
      items: {
        method: false,
        leadTime: false,
        address: false
      }
    },
    costBreakdown: {
      completed: false,
      status: 'red',
      selectedVersionId: null,
      versions: []
    }
  });
  const [collapsedBlocks, setCollapsedBlocks] = useState({
    capStyle: false,
    customization: false,
    delivery: false,
    costBreakdown: false
  });
  const [leadTimeData, setLeadTimeData] = useState(null);


  // Additional state for messaging
  const [currentModel, setCurrentModel] = useState<string>('gpt-4o-mini');
  const [currentAssistant, setCurrentAssistant] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Conversation management
  const {
    conversations,
    isLoadingConversations,
    isClearingConversations,
    showClearAllDialog,
    searchQuery,
    setSearchQuery,
    showConversationHistory,
    setShowConversationHistory,
    filteredConversations,
    loadUserConversations,
    handleLoadConversation,
    handleNewConversation,
    handleRefreshConversations,
    handleRegenerateTitle,
    handleAcceptQuote,
    handleRejectQuote,
    handleClearAllConversations,
    handleConfirmClearAll,
    handleCancelClearAll,
    deleteConversation,
    formatConversationTime,
    getConversationStatus
  } = useConversationManagement({
    authUser,
    authLoading,
    isAuthenticated,
    userProfile,
    guestContactInfo,
    sessionId,
    conversationId,
    setConversationId,
    setMessages,
    setCurrentQuoteData,
    setOrderBuilderStatus,
    setLeadTimeData,
    setIsOrderBuilderVisible,
    currentQuoteData,
    orderBuilderStatus,
    leadTimeData,
    uploadedFiles
  });

  // Welcome message is now handled by automatic conversation creation
  // No need to initialize here as it will be set when conversation is auto-created

  // Real sendMessage implementation using MessagingService
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    const { MessagingService } = await import('./services/messagingService');

    await MessagingService.sendMessage({
      inputMessage,
      uploadedFiles,
      isLoading,
      isUploading,
      isProcessing,
      authUser,
      guestContactInfo,
      userProfile,
      sessionId,
      conversationId,
      messages,
      setMessages,
      setInputMessage,
      setIsLoading,
      setIsProcessing,
      setCurrentModel,
      setCurrentAssistant,
      setConversationId,
      setIsOrderBuilderVisible,
      setUploadedFiles,
      handleGuestQuoteRequest,
      onQuoteDataUpdate: (quoteData) => {
        console.log('📊 [SUPPORT-PAGE] Quote data received:', {
          quoteData,
          hasCapDetails: !!quoteData?.capDetails,
          hasCapStyle: !!quoteData?.capStyle,
          hasCustomization: !!quoteData?.customization,
          hasDelivery: !!quoteData?.delivery,
          hasPricing: !!quoteData?.pricing,
          orderBuilderVisible: isOrderBuilderVisible
        });
        setCurrentQuoteData(quoteData);
        setIsOrderBuilderVisible(true);
        setHasNewQuoteInSession(true); // Mark that a new quote was generated in this session

        // Import and use OrderBuilderService to update status for quote data
        import('./services/orderBuilderService').then(({ OrderBuilderService }) => {
          console.log('📊 [SUPPORT-PAGE] About to call OrderBuilderService.updateOrderBuilderStatus');
          OrderBuilderService.updateOrderBuilderStatus(
            quoteData,
            orderBuilderStatus,
            setOrderBuilderStatus
          );
        });
      },
      onOrderBuilderUpdate: (builderState) => {
        console.log('🔧 Order builder state update:', builderState);
        // Update order builder status based on the new state - preserve nested properties
        if (builderState) {
          setOrderBuilderStatus(prevStatus => ({
            ...prevStatus,
            capStyle: builderState.capStyle ? { ...prevStatus.capStyle, ...builderState.capStyle } : prevStatus.capStyle,
            customization: builderState.customization ? { ...prevStatus.customization, ...builderState.customization } : prevStatus.customization,
            delivery: builderState.delivery ? { ...prevStatus.delivery, ...builderState.delivery } : prevStatus.delivery,
            costBreakdown: builderState.costBreakdown ? { ...prevStatus.costBreakdown, ...builderState.costBreakdown } : prevStatus.costBreakdown
          }));
        }
      },
      onConversationRefresh: async () => {
        console.log('🔄 Refreshing conversation list after message storage');
        await loadUserConversations();
      }
    });
  };

  const handleFileUpload = async (files: FileList) => {
    const result = await FileUploadService.handleFileUpload(
      files,
      setUploadedFiles,
      setIsUploading
    );

    if (result.errors.length > 0) {
      console.error('Upload errors:', result.errors);
      // Show errors to user (could integrate with toast notifications)
      result.errors.forEach(error => {
        console.warn('File upload warning:', error);
      });
    }

    if (result.success) {
      console.log('Files uploaded successfully:', result.urls);
    }
  };

  const canQuoteOrder = () => {
    // Only show Generate Quote button when:
    // 1. A new quote was generated in this session (not from restored data)
    // 2. The order builder has the required green statuses
    return hasNewQuoteInSession &&
           orderBuilderStatus.capStyle.status === 'green' &&
           orderBuilderStatus.delivery.status === 'green';
  };

  const handleQuoteOrder = () => {
    console.log('Generating quote...');
    setIsOrderBuilderVisible(true);
    setHasNewQuoteInSession(false); // Reset flag after user accepts the quote
  };

  const handleAcceptQuoteLocal = async () => {
    if (conversationId) {
      await handleAcceptQuote(conversationId);
    } else {
      console.warn('No conversation ID available for quote acceptance');
    }
  };

  const handleRejectQuoteLocal = async () => {
    if (conversationId) {
      await handleRejectQuote(conversationId);
    } else {
      console.warn('No conversation ID available for quote rejection');
    }
  };

  const handleSelectVersion = (versionId: string) => {
    setOrderBuilderStatus(prev => ({
      ...prev,
      costBreakdown: {
        ...prev.costBreakdown,
        selectedVersionId: versionId
      }
    }));
    console.log('Selected quote version:', versionId);
  };

  const toggleBlockCollapse = (block: 'capStyle' | 'customization' | 'delivery' | 'costBreakdown') => {
    setCollapsedBlocks(prev => ({
      ...prev,
      [block]: !prev[block]
    }));
  };

  const handleTriggerFileUpload = () => {
    FileUploadService.triggerFileUpload(fileInputRef);
  };

  // Helper function to get model badge colors (from original file)
  const getModelBadgeColor = (model?: string) => {
    switch (model) {
      case 'gpt-4o':
        return 'border-blue-400/30 bg-blue-400/10 text-blue-300';
      case 'gpt-4o-mini':
        return 'border-green-400/30 bg-green-400/10 text-green-300';
      case 'claude-3-sonnet':
        return 'border-purple-400/30 bg-purple-400/10 text-purple-300';
      default:
        return 'border-stone-600 text-stone-300';
    }
  };

  // Helper function to format system message (from original file)
  const formatSystemMessage = (content: string) => {
    const parts = content.split(/(SupportSage|CapCraft AI|LogoCraft Pro)/g);

    return parts.map((part, index) => {
      if (part === 'SupportSage') {
        return (
          <span key={index} className="text-green-400 font-medium">
            {part}
          </span>
        );
      } else if (part === 'CapCraft AI') {
        return (
          <span key={index} className="text-red-400 font-medium">
            {part}
          </span>
        );
      } else if (part === 'LogoCraft Pro') {
        return (
          <span key={index} className="text-lime-400 font-medium">
            {part}
          </span>
        );
      } else {
        return <span key={index}>{part}</span>;
      }
    });
  };

  const handleRemoveFile = (index: number) => {
    FileUploadService.removeFile(index, setUploadedFiles);
  };

  const handleClearAllFiles = () => {
    FileUploadService.clearAllFiles(setUploadedFiles);
  };

  const handleShowOrderBuilder = (targetConversationId: string) => {
    console.log('🔧 Showing Order Builder for conversation:', targetConversationId);
    // Only show Order Builder if this is the active conversation
    if (targetConversationId === conversationId) {
      setIsOrderBuilderVisible(true);
      console.log('✅ Order Builder made visible for active conversation');
    } else {
      console.log('❌ Cannot show Order Builder for inactive conversation - must load conversation first');
    }
  };

  // Wrap conversation handlers to reset new quote flag
  const handleLoadConversationWithReset = (id: string) => {
    setHasNewQuoteInSession(false); // Reset flag when loading existing conversation
    handleLoadConversation(id);
  };

  const handleNewConversationWithReset = () => {
    setHasNewQuoteInSession(false); // Reset flag when starting new conversation
    handleNewConversation();
  };

  // Add auth loading state check (from original file)
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-400 mx-auto mb-4"></div>
          <p className="text-stone-300">Loading AI Support...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-stone-200 antialiased font-inter">
      {/* Guest Contact Form Modal */}
      {showGuestContactForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-black/90 border border-stone-600 rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-white mb-4">Contact Information Required</h3>
            <p className="text-stone-300 mb-4">To request a quote, please provide your contact information:</p>
            {/* Guest contact form would go here */}
            <div className="flex gap-3">
              <button
                onClick={resetGuestForm}
                className="px-4 py-2 bg-stone-600 text-white rounded-lg hover:bg-stone-500 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  // TODO: Implement proper guest contact form
                  const guestInfo = {
                    name: 'Guest User',
                    email: 'guest@example.com',
                    phone: ''
                  };
                  submitGuestQuote(guestInfo);
                }}
                className="px-4 py-2 bg-lime-600 text-white rounded-lg hover:bg-lime-500 transition-colors"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Page Wrapper */}
      <div className={`w-full transition-all duration-300 flex flex-col lg:block ${showConversationHistory ? 'lg:pl-96' : ''}`}>

        {/* AI Support Center - Now at top of main content */}
        <div className={`${showConversationHistory ? 'max-w-[1800px] lg:ml-3 lg:mr-6' : 'max-w-[1850px] mx-auto'} px-3 sm:px-6 pt-3 sm:pt-6`}>
          {/* Combined AI Support Center & Profile Block */}
          <div className="rounded-2xl border border-stone-600 bg-black/40 backdrop-blur-xl p-4 sm:p-6 mb-3 sm:mb-6">
            {/* Header Section with AI Support Center and Profile */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6 items-start mb-6">
              {/* AI Support Center Header */}
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-lime-400/20 to-lime-600/10 border border-lime-400/30 grid place-items-center">
                  <SparklesIcon className="h-5 w-5 text-lime-400" />
                </div>
                <div>
                  <h1 className="text-lg sm:text-xl font-semibold text-white tracking-tight">AI Support Center</h1>
                  <p className="text-sm text-white/60">Get instant help with orders, quotes, and customization</p>
                </div>
              </div>

              {/* Profile Section */}
              <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-sm transition-all duration-300 ${authUser ? 'border-green-400/30 bg-green-400/5' : 'border-yellow-400/30 bg-yellow-400/5'}`}>
                <img
                  src={authUser?.avatarUrl || "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=256&auto=format&fit=crop"}
                  alt="Profile avatar"
                  className="h-10 w-10 rounded-xl border border-stone-600 object-cover"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-medium text-white">
                      {(() => {
                        if (authUser) {
                          return userProfile?.name || authUser.name || authUser.email?.split('@')[0] || 'Authenticated User';
                        }
                        if (guestContactInfo) {
                          return guestContactInfo.name;
                        }
                        return 'Guest User';
                      })()}
                    </h3>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] border ${
                      authUser
                        ? 'border-green-400/30 bg-green-400/10 text-green-300'
                        : 'border-yellow-400/30 bg-yellow-400/10 text-yellow-300'
                    }`}>
                      {authUser ? 'Auth' : 'Guest'}
                    </span>
                  </div>
                  <p className="text-xs text-white/60">
                    {authUser ? (authUser.email || 'no-email@example.com') : (guestContactInfo?.email || 'guest@example.com')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Grid */}
        <main className={`${showConversationHistory ? 'max-w-[1800px] lg:ml-3 lg:mr-6' : 'max-w-[1850px] mx-auto'} px-3 sm:px-6 pb-3 sm:pb-6 grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-3 sm:gap-6`}>
          {/* Chat Panel */}
          <section className="rounded-2xl border border-stone-600 bg-black/40 backdrop-blur-xl flex flex-col overflow-hidden order-1 lg:order-1 min-h-[70vh] lg:min-h-0">
            {/* Chat Header */}
            <div className="px-3 sm:px-5 py-3 sm:py-4 border-b border-stone-600 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-black/30 backdrop-blur-sm border border-stone-600 grid place-items-center text-stone-200">
                  <CpuChipIcon className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg sm:text-base md:text-lg tracking-tight font-semibold text-white">
                      {currentAssistant?.displayName || 'AI Support'} {currentAssistant?.icon || ''}
                    </h2>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] ${getModelBadgeColor(currentModel)}`}>
                      {currentAssistant?.specialty || 'Powered by OpenAI'}
                    </span>
                  </div>
                  <p className="text-xs text-white/50">Ask about orders, shipments, and quotes</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!showConversationHistory && (
                  <button
                    onClick={() => setShowConversationHistory(true)}
                    className="lg:hidden h-9 w-9 rounded-xl bg-black/30 backdrop-blur-sm border border-stone-600 grid place-items-center text-stone-300 hover:text-white hover:bg-black/40 transition-all duration-200"
                    title="Show conversation history"
                  >
                    <ChatBubbleLeftRightIcon className="h-4 w-4" />
                  </button>
                )}
                <div className="hidden md:flex items-center gap-2">
                  <div className="px-2.5 py-1 rounded-full text-xs border border-stone-600 text-stone-300">Secure</div>
                  <div className="px-2.5 py-1 rounded-full text-xs border border-stone-600 text-stone-300">24/7</div>
                  <button
                    onClick={() => setShowConversationHistory(!showConversationHistory)}
                    className={`px-3 py-1.5 rounded-full text-xs border transition-colors flex items-center gap-1.5 ${
                      showConversationHistory
                        ? 'border-lime-400/40 bg-lime-400/15 text-lime-300 shadow-lg shadow-lime-400/10'
                        : 'border-lime-500/30 bg-lime-500/5 text-lime-400 hover:border-lime-400/50 hover:bg-lime-400/10 hover:text-lime-300 hover:shadow-md hover:shadow-lime-400/10'
                    }`}
                  >
                    <ChatBubbleLeftRightIcon className="h-3 w-3" />
                    History
                  </button>
                </div>
              </div>
            </div>

            {/* Chat Scroll Area */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4">
              {/* Welcome message */}
              {messages.length === 0 && (
                <div className="flex items-center gap-3 text-sm italic text-stone-300">
                  <div className="flex-1 h-px bg-stone-600"></div>
                  <span>Session started — Intent detection active</span>
                  <div className="flex-1 h-px bg-stone-600"></div>
                </div>
              )}

              {/* Messages */}
              {messages.map((message) => (
                <div key={message.id}>
                  {message.role === 'system' ? (
                    <div className="flex items-center gap-3 text-sm italic text-stone-300">
                      <div className="flex-1 h-px bg-stone-600"></div>
                      <span>{formatSystemMessage(message.content || '')}</span>
                      <div className="flex-1 h-px bg-stone-600"></div>
                    </div>
                  ) : message.role === 'user' ? (
                    <div className="flex justify-end">
                      <div className="max-w-[78%]">
                        <div className="flex items-center justify-end gap-2 mb-1">
                          <span className="text-xs text-white/50">
                            {message.timestamp ? new Date(message.timestamp).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit'
                            }) : ''}
                          </span>
                        </div>
                        <div className="rounded-[20px] border border-orange-400/30 bg-gradient-to-br from-orange-600/20 via-orange-500/15 to-orange-400/10 backdrop-blur-xl p-3 sm:p-4 text-base sm:text-sm md:text-base text-white shadow-[0_8px_30px_rgba(218,141,38,0.25)] ring-1 ring-orange-400/20 w-full">
                          {message.content || ''}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3">
                      <div className="h-9 w-9 rounded-xl bg-black/30 backdrop-blur-sm border border-stone-600 grid place-items-center text-stone-200 mt-0.5">
                        <CpuChipIcon className="h-5 w-5 text-teal-300" />
                      </div>
                      <div className="max-w-[82%]">
                        <div className="mb-1 flex items-center gap-2">
                          <span className="text-sm font-medium tracking-tight text-white">
                            {currentAssistant?.displayName || 'AI Support'} {currentAssistant?.icon || ''}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] ${getModelBadgeColor(message.model)}`}>
                            {currentAssistant?.specialty || 'Powered by OpenAI'}
                          </span>
                          <span className="text-xs text-white/50">
                            {message.timestamp ? new Date(message.timestamp).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit'
                            }) : ''}
                          </span>
                        </div>
                        <div className="rounded-[20px] border border-rose-800/30 bg-gradient-to-br from-rose-900/20 via-rose-800/15 to-rose-700/10 backdrop-blur-xl p-3 sm:p-4 text-base sm:text-sm md:text-base text-white shadow-[0_8px_30px_rgba(136,19,55,0.25)] ring-1 ring-rose-800/20 w-full">
                          <div
                            className="whitespace-pre-wrap"
                            dangerouslySetInnerHTML={{
                              __html: (message.content || '')
                                .replace(/\\n/g, '\n')
                                .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white/95 font-semibold">$1</strong>')
                                .replace(/^• (.*?)$/gm, '<div class="flex items-start gap-2 my-1"><span class="text-lime-300 mt-0.5">•</span><span>$1</span></div>')
                                .replace(/\n/g, '<br/>')
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Loading indicator */}
              {isLoading && (
                <div className="flex items-center gap-2 text-xs text-orange-400">
                  <div className="h-1.5 w-1.5 rounded-full bg-orange-400 animate-pulse"></div>
                  <div className="h-1.5 w-1.5 rounded-full bg-orange-400 animate-pulse" style={{animationDelay: '150ms'}}></div>
                  <div className="h-1.5 w-1.5 rounded-full bg-orange-400 animate-pulse" style={{animationDelay: '300ms'}}></div>
                  <span>AI is thinking...</span>
                </div>
              )}
            </div>

            {/* Uploaded Files Preview */}
            {uploadedFiles.length > 0 && (
              <div className="px-3 sm:px-4 md:px-5 py-2 border-t border-stone-600 bg-black/20">
                <div className="flex flex-wrap gap-2 sm:gap-3">
                  {uploadedFiles.map((fileUrl, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={fileUrl}
                        alt={`Uploaded ${index + 1}`}
                        className="w-14 h-14 sm:w-12 sm:h-12 object-cover rounded-lg border border-stone-500 touch-manipulation"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(index)}
                        className="absolute -top-2 -right-2 w-6 h-6 sm:w-5 sm:h-5 bg-red-500 text-white rounded-full text-xs hover:bg-red-600 transition-colors opacity-70 sm:opacity-0 sm:group-hover:opacity-100 touch-manipulation"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Input Bar */}
            <form onSubmit={handleSendMessage} className="px-3 sm:px-4 md:px-5 py-3 sm:py-4 border-t border-stone-600 bg-black/20">
              <div className="flex items-end gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={handleTriggerFileUpload}
                  disabled={isUploading}
                  className="h-11 w-11 sm:h-10 sm:w-10 shrink-0 rounded-full border border-stone-600 bg-black/30 backdrop-blur-sm grid place-items-center text-white/70 hover:text-white hover:bg-black/40 transition-all duration-200 disabled:opacity-50 touch-manipulation"
                  title="Attach files"
                >
                  <PaperClipIcon className={`h-5 w-5 ${isUploading ? 'animate-spin' : ''}`} />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,application/pdf,application/illustrator,application/postscript,.eps,.ai,.txt"
                  onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
                  className="hidden"
                />
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="Describe your request or ask about orders, shipments, quotes…"
                    className="w-full h-12 sm:h-11 md:h-12 rounded-full bg-black/30 backdrop-blur-sm border border-stone-600 focus:border-stone-400 focus:bg-black/40 outline-none px-4 sm:px-4 md:px-5 text-base sm:text-sm md:text-base placeholder:text-white/40 text-white transition-all duration-200 touch-manipulation"
                    disabled={isLoading}
                  />
                </div>
                {canQuoteOrder() && (
                  <button
                    type="button"
                    onClick={handleQuoteOrder}
                    className="px-4 py-2.5 rounded-full bg-gradient-to-r from-lime-500/20 to-lime-400/10 border border-lime-400/30 text-lime-300 hover:from-lime-500/25 hover:to-lime-400/15 hover:border-lime-400/40 transition-all duration-200 text-sm font-medium"
                  >
                    Generate Quote
                  </button>
                )}
                <button
                  type="submit"
                  disabled={isLoading || !inputMessage.trim()}
                  className="h-11 w-11 sm:h-10 sm:w-10 shrink-0 rounded-full bg-gradient-to-br from-lime-500/30 to-lime-600/20 border border-lime-400/40 grid place-items-center text-lime-300 hover:from-lime-500/40 hover:to-lime-600/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                  title="Send message"
                >
                  <ArrowUpRightIcon className="h-5 w-5" />
                </button>
              </div>
            </form>
          </section>

          {/* Right Column - Upload Artwork and Order Builder */}
          <div className="order-2 lg:order-2 space-y-3 sm:space-y-6">
            {/* Upload Artwork Block */}
            <section>
              <ArtworkUploader
                onAnalysisComplete={(analysis) => {
                  console.log('🎨 Artwork analysis completed:', analysis);
                  // Optionally show analysis results or auto-trigger order builder visibility
                }}
                onGenerateQuote={async (analysis) => {
                  console.log('📋 Generating quote from artwork analysis:', analysis);
                  // The ArtworkUploader component handles the quote generation internally
                  // This callback is for any additional actions if needed
                }}
                userId={authUser?.id}
                sessionId={`artwork-${Date.now()}`}
                inputMessage={inputMessage}
                setInputMessage={setInputMessage}
                sendMessage={handleSendMessage}
              />
            </section>

            {/* Order Builder Block - Under Upload Artwork */}
            <section>
              {isOrderBuilderVisible && (
                // ENHANCED: Unified Order Builder with detailed breakdown and step progress
                <OrderBuilder
                  isVisible={isOrderBuilderVisible}
                  orderBuilderStatus={orderBuilderStatus}
                  currentQuoteData={currentQuoteData}
                  collapsedBlocks={collapsedBlocks}
                  leadTimeData={leadTimeData}
                  messages={messages}
                  onToggleCollapse={toggleBlockCollapse}
                  onQuoteOrder={handleQuoteOrder}
                  canQuoteOrder={canQuoteOrder}
                  onAcceptQuote={handleAcceptQuoteLocal}
                  onRejectQuote={handleRejectQuoteLocal}
                  onSelectVersion={handleSelectVersion}
                />
              )}
            </section>
          </div>

        </main>
      </div>

      {/* Conversation Sidebar */}
      <ConversationSidebar
        isVisible={showConversationHistory}
        conversations={conversations}
        filteredConversations={filteredConversations}
        activeConversationId={conversationId}
        searchQuery={searchQuery}
        isLoadingConversations={isLoadingConversations}
        isClearingConversations={isClearingConversations}
        authLoading={authLoading}
        isAuthenticated={isAuthenticated}
        authUser={authUser}
        onClose={() => setShowConversationHistory(false)}
        onRefresh={handleRefreshConversations}
        onNewConversation={handleNewConversationWithReset}
        onSearchChange={setSearchQuery}
        onLoadConversation={handleLoadConversationWithReset}
        onRegenerateTitle={handleRegenerateTitle}
        onAcceptQuote={handleAcceptQuote}
        onRejectQuote={handleRejectQuote}
        onDeleteConversation={deleteConversation}
        onClearAllConversations={handleClearAllConversations}
        onShowOrderBuilder={handleShowOrderBuilder}
        formatConversationTime={formatConversationTime}
        getConversationStatus={getConversationStatus}
      />

      {/* Clear All Confirmation Dialog */}
      <ClearAllConfirmationDialog
        isOpen={showClearAllDialog}
        conversations={conversations}
        isClearing={isClearingConversations}
        onConfirm={handleConfirmClearAll}
        onCancel={handleCancelClearAll}
      />
    </div>
  );
}