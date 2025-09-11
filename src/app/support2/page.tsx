'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthContext';
import { ConversationSidebar } from './components/ConversationSidebar';
import { ChatInterface } from './components/ChatInterface';
import { OrderBuilder } from './components/OrderBuilder';
import { useConversations } from './hooks/useConversations';
import { useOrderBuilder } from './hooks/useOrderBuilder';
import { useAIAssistants } from './hooks/useAIAssistants';
import { useFileUpload } from './hooks/useFileUpload';
import { ConversationManager } from '@/lib/support/conversationManager';
import { AIRoutingService } from '@/lib/support/aiRoutingService';
import { OrderBuilderService } from '@/lib/support/orderBuilderService';
import { UserProfile, GuestContactInfo } from './types/conversation';
import UploadArtworkComponent from '@/components/ui/UploadArtworkComponent';

export default function Support2Page() {
  const { user: authUser, loading: authLoading } = useAuth();
  const session = null; // Note: session handling moved to useAuth hook
  const [showConversationHistory, setShowConversationHistory] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile>({});
  const [guestContactInfo, setGuestContactInfo] = useState<GuestContactInfo | null>(null);
  const [showGuestContactForm, setShowGuestContactForm] = useState(false);
  const [pendingQuoteMessage, setPendingQuoteMessage] = useState<string | null>(null);
  const [isPageLoading, setIsPageLoading] = useState(true);

  // Initialize services
  const conversationManager = ConversationManager.getInstance();
  const aiRoutingService = AIRoutingService.getInstance();
  const orderBuilderService = OrderBuilderService.getInstance();

  // Custom hooks
  const {
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
  } = useConversations();

  const {
    orderBuilderStatus,
    leadTimeData,
    isOrderBuilderVisible,
    collapsedBlocks,
    isCalculatingLeadTime,
    updateOrderBuilderStatus,
    selectQuoteVersion,
    getSelectedVersion,
    toggleBlockCollapse,
    resetOrderBuilder,
    setOrderBuilderStatus,
    setLeadTimeData,
    setIsOrderBuilderVisible
  } = useOrderBuilder();

  const {
    currentModel,
    detectedIntent,
    isProcessing,
    analyzeIntent,
    routeToAssistant,
    createRoutingMessage
  } = useAIAssistants();

  const {
    uploadedFiles,
    isUploading,
    addFiles,
    removeFile,
    uploadFiles,
    clearFiles,
    getUploadedFiles,
    getPendingFiles
  } = useFileUpload();

  // Load user profile on mount and handle page loading
  useEffect(() => {
    const loadUserProfile = async () => {
      if (authUser?.id) {
        try {
          // Use the user data from AuthContext directly as the profile
          setUserProfile({
            id: authUser.id,
            name: authUser.name || undefined,
            email: authUser.email,
            phone: authUser.phone || undefined,
            company: authUser.company || undefined,
            roles: {
              access: authUser.accessRole,
              customer: authUser.customerRole
            }
          });
        } catch (error) {
          console.error('Error loading user profile:', error);
        }
      }
      
      // Page is ready once auth loading is done and profile is loaded (if authenticated)
      if (!authLoading) {
        setIsPageLoading(false);
      }
    };

    loadUserProfile();
  }, [authUser, authLoading]);

  // Handle conversation selection
  const handleSelectConversation = useCallback(async (conversationId: string) => {
    const conversationData = await loadConversation(conversationId);
    
    if (conversationData) {
      // Check if conversation has quotes and restore Order Builder state
      const hasQuotes = conversationData.hasQuote || 
                       (conversationData.quoteData && Object.keys(conversationData.quoteData).length > 0) ||
                       (conversationData.ConversationQuotes && conversationData.ConversationQuotes.length > 0) ||
                       conversationData.context === 'QUOTE_REQUEST';

      if (hasQuotes) {
        setIsOrderBuilderVisible(true);

        // Restore Order Builder state from metadata
        if (conversationData.metadata?.orderBuilder) {
          const orderBuilder = conversationData.metadata.orderBuilder;
          
          if (orderBuilder.orderBuilderStatus) {
            setOrderBuilderStatus(orderBuilder.orderBuilderStatus);
          }
          
          if (orderBuilder.leadTimeData) {
            setLeadTimeData(orderBuilder.leadTimeData);
          }
        }
      }

      // Restore user profile if available
      if (conversationData.metadata?.userProfile) {
        setUserProfile(conversationData.metadata.userProfile);
      }
    }
  }, [loadConversation, setIsOrderBuilderVisible, setOrderBuilderStatus, setLeadTimeData]);

  // Handle new conversation
  const handleNewConversation = useCallback(async () => {
    await createNewConversation();
    resetOrderBuilder();
    clearFiles();
  }, [createNewConversation, resetOrderBuilder, clearFiles]);

  // Handle file upload
  const handleFileUpload = useCallback((files: File[]) => {
    addFiles(files);
  }, [addFiles]);

  // Handle message sending
  const handleSendMessage = useCallback(async (message: string, files?: File[]) => {
    if (!message.trim() && (!files || files.length === 0)) return;

    // Check if guest needs to provide contact info for quotes
    if (!authUser && !guestContactInfo) {
      // Check if the message contains quote-related keywords
      const quoteKeywords = ['quote', 'price', 'cost', 'order', 'custom cap', 'hat', 'embroidery', 'logo', 'design', 'bulk'];
      const messageContainsQuoteKeywords = quoteKeywords.some(keyword => 
        message.toLowerCase().includes(keyword)
      );
      
      if (messageContainsQuoteKeywords || (files && files.length > 0)) {
        // Store the message to send after contact form is completed
        setPendingQuoteMessage(message);
        setShowGuestContactForm(true);
        return;
      }
    }

    let activeConversationId = currentConversationId;
    
    // Create new conversation if none exists
    if (!activeConversationId) {
      activeConversationId = await createNewConversation();
      if (!activeConversationId) {
        console.error('Failed to create conversation');
        return;
      }
    }

    // Add user message to UI
    const userMessage = conversationManager.createMessage('user', message);
    addMessage(userMessage);

    // Clear uploaded files after adding to message
    clearFiles();

    try {
      // Get current conversation history
      const conversationHistory = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      // Step 1: Analyze intent
      const intent = await analyzeIntent(message, conversationHistory);
      
      // Step 2: Show routing message
      const routingMessage = createRoutingMessage(intent);
      const systemMessage = conversationManager.createMessage('system', routingMessage);
      addMessage(systemMessage);

      // Step 3: Route to appropriate AI assistant
      const aiResponse = await routeToAssistant(message, intent, conversationHistory, files);
      
      // Step 4: Add AI response to UI
      const assistantMessage = conversationManager.createMessage(
        'assistant',
        aiResponse.content,
        aiResponse.model
      );
      addMessage(assistantMessage);

      // Step 5: Handle quote data if present
      let extractedData = aiResponse.extractedData;
      if (!extractedData && intent === 'ORDER_CREATION') {
        extractedData = aiRoutingService.extractQuoteData(aiResponse);
      }

      if (extractedData) {
        // Update Order Builder with quote data
        const orderBuilderUpdates = orderBuilderService.parseQuoteDataToOrderBuilder(extractedData);
        
        // Create multiple quantity versions for better pricing options
        const multipleVersions = await orderBuilderService.createMultipleQuantityVersions(extractedData);
        
        // If we got multiple versions, use them; otherwise fall back to single version
        let versions = multipleVersions;
        let selectedVersionId = multipleVersions[0]?.id;
        
        if (multipleVersions.length === 0) {
          // Fallback to single version
          const newVersion = orderBuilderService.createQuoteVersion(
            extractedData,
            orderBuilderStatus.costBreakdown.versions
          );
          versions = [...orderBuilderStatus.costBreakdown.versions, newVersion];
          selectedVersionId = newVersion.id;
        }

        // Update Order Builder status
        setOrderBuilderStatus(prev => ({
          ...prev,
          ...orderBuilderUpdates,
          costBreakdown: {
            ...prev.costBreakdown,
            available: true,
            versions,
            selectedVersionId
          }
        }));

        setIsOrderBuilderVisible(true);

        // Show success message with quantity options info
        const successMessage = conversationManager.createMessage(
          'system',
          `✅ Quote generated successfully! ${multipleVersions.length > 0 ? `Check the Order Builder below to compare pricing across ${multipleVersions.length} different quantities.` : 'Check the Order Builder below to review details.'}`
        );
        addMessage(successMessage);
      }

      // Step 6: Store conversation in database
      await storeConversation(
        message,
        aiResponse.content,
        intent,
        extractedData
      );

    } catch (error) {
      console.error('Error sending message:', error);
      
      // Add error message to UI
      const errorMessage = conversationManager.createMessage(
        'system',
        'Sorry, I encountered an error processing your request. Please try again.'
      );
      addMessage(errorMessage);
    }
  }, [
    currentConversationId,
    createNewConversation,
    addMessage,
    clearFiles,
    analyzeIntent,
    createRoutingMessage,
    routeToAssistant,
    orderBuilderStatus.costBreakdown.versions,
    setOrderBuilderStatus,
    setIsOrderBuilderVisible,
    storeConversation,
    conversationManager,
    aiRoutingService,
    orderBuilderService
  ]);

  // Handle quote saving
  const handleSaveQuote = useCallback(async () => {
    if (!currentConversationId) return;

    try {
      const selectedVersion = getSelectedVersion();
      if (!selectedVersion) return;

      await conversationManager.saveQuote(
        currentConversationId,
        selectedVersion.quoteData,
        userProfile,
        null // session not needed with new auth approach
      );

      // Add success message
      const successMessage = conversationManager.createMessage(
        'system',
        '✅ Quote saved successfully to your dashboard!'
      );
      addMessage(successMessage);

      // Refresh conversations to update the sidebar
      await loadUserConversations();
    } catch (error) {
      console.error('Error saving quote:', error);
      
      const errorMessage = conversationManager.createMessage(
        'system',
        '❌ Failed to save quote. Please try again.'
      );
      addMessage(errorMessage);
    }
  }, [currentConversationId, getSelectedVersion, userProfile, addMessage, loadUserConversations, conversationManager]);

  // Handle title regeneration
  const handleRegenerateTitle = useCallback(async (conversationId: string) => {
    try {
      const response = await fetch(`/api/conversations/${conversationId}/regenerate-title`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Title regenerated:', data.title);
        
        // Refresh conversations to show the new title
        await loadUserConversations();
      } else {
        console.error('Failed to regenerate title:', response.status);
      }
    } catch (error) {
      console.error('Error regenerating title:', error);
    }
  }, [loadUserConversations]);

  // Helper functions for action buttons
  const canQuoteOrder = () => {
    return orderBuilderStatus.capStyle.status !== 'red' && orderBuilderStatus.delivery.completed;
  };

  const canPlaceOrder = () => {
    return orderBuilderStatus.capStyle.completed && orderBuilderStatus.delivery.completed;
  };

  const handleQuoteOrder = async () => {
    console.log('🎯 QUOTE CREATION: handleQuoteOrder triggered');
    
    const canQuote = canQuoteOrder();
    console.log('🔍 QUOTE CREATION: canQuoteOrder result:', {
      canQuote,
      orderBuilderStatus: {
        capStyleStatus: orderBuilderStatus.capStyle.status,
        capStyleCompleted: orderBuilderStatus.capStyle.completed,
        deliveryStatus: orderBuilderStatus.delivery.status,
        deliveryCompleted: orderBuilderStatus.delivery.completed,
        costBreakdownAvailable: orderBuilderStatus.costBreakdown.available,
      }
    });
    
    if (!canQuote) {
      console.log('⚠️ Cannot quote order - requirements not met');
      return;
    }

    try {
      // Get the selected quote version data
      const selectedVersion = getSelectedVersion();
      
      if (!selectedVersion) {
        console.error('No selected quote version available');
        return;
      }

      // Save the quote
      await handleSaveQuote();
    } catch (error) {
      console.error('Error accepting quote:', error);
    }
  };

  const handlePlaceOrder = async () => {
    if (!canPlaceOrder()) return;
    
    try {
      // Get the selected quote version data
      const selectedVersion = getSelectedVersion();
      
      if (!selectedVersion) {
        console.error('No selected quote version available');
        return;
      }

      // Here you would typically redirect to the order placement flow
      console.log('🛒 Placing order with quote version:', selectedVersion);
      
      // For now, just show a success message
      const orderMessage = conversationManager.createMessage(
        'system',
        '✅ Order placement initiated! Redirecting to checkout process...'
      );
      addMessage(orderMessage);

    } catch (error) {
      console.error('Error placing order:', error);
    }
  };

  // Guest Contact Form Component
  const GuestContactForm = () => {
    const [formData, setFormData] = useState<GuestContactInfo>({
      name: '',
      email: '',
      phone: '',
      address: '',
      company: ''
    });
    const [errors, setErrors] = useState<Partial<GuestContactInfo>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const validateForm = () => {
      const newErrors: Partial<GuestContactInfo> = {};
      
      if (!formData.name.trim()) {
        newErrors.name = 'Name is required';
      } else if (formData.name.trim().length < 2) {
        newErrors.name = 'Name must be at least 2 characters';
      }
      
      if (!formData.email.trim()) {
        newErrors.email = 'Email is required';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        newErrors.email = 'Please enter a valid email address';
      }
      
      // Optional phone validation - allow numbers starting with 0
      if (formData.phone && formData.phone.trim() && !/^[\+]?[0-9][\d]{0,15}$/.test(formData.phone.replace(/[\s\-\(\)]/g, ''))) {
        newErrors.phone = 'Please enter a valid phone number';
      }
      
      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      
      if (!validateForm()) {
        return;
      }
      
      setIsSubmitting(true);
      
      try {
        // Set the guest contact info and create a user profile from it
        setGuestContactInfo(formData);
        setUserProfile({
          name: formData.name,
          email: formData.email,
          phone: formData.phone || undefined,
          address: formData.address || undefined,
          company: formData.company || undefined
        });
        
        // Hide the form
        setShowGuestContactForm(false);
        
        // If there was a pending quote message, send it now
        if (pendingQuoteMessage) {
          // Use the message through the normal flow after a short delay
          setTimeout(() => {
            handleSendMessage(pendingQuoteMessage);
            setPendingQuoteMessage(null);
          }, 100);
        }
        
      } catch (error) {
        console.error('Error saving guest contact info:', error);
      } finally {
        setIsSubmitting(false);
      }
    };

    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4">
        <div className="bg-stone-900/95 backdrop-blur-xl border border-white/10 rounded-2xl p-4 sm:p-6 w-full max-w-sm sm:max-w-md mx-auto">
          <div className="text-center mb-6">
            <h3 className="text-xl font-semibold text-white mb-2">Contact Information Required</h3>
            <p className="text-stone-300 text-sm">
              To create your custom cap quote, please provide your contact information:
            </p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white mb-1">
                Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className={`w-full px-3 py-2 bg-white/5 border ${errors.name ? 'border-red-400' : 'border-white/10'} rounded-lg text-white placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-lime-400/50`}
                placeholder="Your full name"
              />
              {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-white mb-1">
                Email <span className="text-red-400">*</span>
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className={`w-full px-3 py-2 bg-white/5 border ${errors.email ? 'border-red-400' : 'border-white/10'} rounded-lg text-white placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-lime-400/50`}
                placeholder="your.email@example.com"
              />
              {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-white mb-1">
                Phone
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                className={`w-full px-3 py-2 bg-white/5 border ${errors.phone ? 'border-red-400' : 'border-white/10'} rounded-lg text-white placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-lime-400/50`}
                placeholder="+1 (555) 123-4567"
              />
              {errors.phone && <p className="text-red-400 text-xs mt-1">{errors.phone}</p>}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-white mb-1">
                Address
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-lime-400/50"
                placeholder="Your address"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-white mb-1">
                Company
              </label>
              <input
                type="text"
                value={formData.company}
                onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-lime-400/50"
                placeholder="Your company name"
              />
            </div>
            
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => {
                  setShowGuestContactForm(false);
                  setPendingQuoteMessage(null);
                }}
                className="flex-1 px-4 py-2 text-stone-300 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 bg-gradient-to-r from-lime-400 to-lime-500 text-black font-medium py-2 px-4 rounded-lg hover:from-lime-500 hover:to-lime-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Saving...' : 'Continue'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // Loading state
  if (authLoading || isPageLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-lime-400 mx-auto mb-4"></div>
          <p className="text-stone-300">Loading AI Support...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-stone-200 antialiased font-inter">
      {/* Guest Contact Form Modal */}
      {showGuestContactForm && <GuestContactForm />}
      
      {/* Conversation Sidebar */}
      <ConversationSidebar
        conversations={conversations}
        currentConversationId={currentConversationId}
        isLoading={isLoadingConversations}
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleNewConversation}
        onDeleteConversation={deleteConversation}
        onRegenerateTitle={handleRegenerateTitle}
        isVisible={showConversationHistory}
        onToggle={() => setShowConversationHistory(!showConversationHistory)}
      />

      {/* Main Content */}
      <div className={`w-full transition-all duration-300 flex flex-col lg:block ${showConversationHistory ? 'lg:pl-96' : ''}`}>
        {/* AI Support Center - Now at top of main content */}
        <div className={`${showConversationHistory ? 'max-w-[1800px] lg:ml-3 lg:mr-6' : 'max-w-[1850px] mx-auto'} px-3 sm:px-6 pt-3 sm:pt-6`}>
          {/* Combined AI Support Center & Profile Block */}
          <div className="rounded-2xl border border-stone-600 bg-black/40 backdrop-blur-xl p-4 sm:p-6 mb-3 sm:mb-6">
            {/* Header Section with AI Support Center and Profile */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6 items-start">
              {/* AI Support Center Header */}
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-lime-400/20 to-lime-600/10 border border-lime-400/30 grid place-items-center">
                  <svg className="h-5 w-5 text-lime-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-lg sm:text-xl font-semibold text-white tracking-tight">
                    AI Support Center
                  </h1>
                  <p className="text-sm text-white/60">
                    Get instant help with orders, quotes, and customization
                  </p>
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
                      {authUser ? (userProfile?.name || authUser.name || authUser.email?.split('@')[0] || 'Authenticated User') : 'Guest User'}
                    </h3>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] border ${
                      authUser 
                        ? 'border-green-400/30 bg-green-400/10 text-green-300' 
                        : 'border-yellow-400/30 bg-yellow-400/10 text-yellow-300'
                    }`}>
                      {authUser ? (userProfile ? 'Authenticated' : 'Auth Only') : 'Guest'}
                    </span>
                  </div>
                  <div className="mt-2 space-y-1.5">
                    <p className="text-sm text-white/70">
                      {authUser ? (authUser.email || 'no-email@example.com') : 'guest@example.com'}
                    </p>
                    {userProfile?.phone && 
                      <p className="text-sm text-stone-300">{userProfile.phone}</p>}
                    {userProfile?.address && (
                      <p className="text-xs text-white/50">
                        {typeof userProfile.address === 'string' ? userProfile.address : 
                         `${userProfile.address.street || ''} ${userProfile.address.city || ''} ${userProfile.address.state || ''}`}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Grid */}
        <main className={`${showConversationHistory ? 'max-w-[1800px] lg:ml-3 lg:mr-6' : 'max-w-[1850px] mx-auto'} px-3 sm:px-6 pb-3 sm:pb-6 grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-3 sm:gap-6`}>
          {/* Chat Panel */}
          <section className="rounded-2xl border border-stone-600 bg-black/40 backdrop-blur-xl flex flex-col overflow-hidden order-1 lg:order-1 min-h-[70vh] lg:min-h-0">
            <ChatInterface
              messages={messages}
              isLoading={isLoading}
              onSendMessage={handleSendMessage}
              onFileUpload={handleFileUpload}
              uploadedFiles={uploadedFiles}
              onRemoveFile={removeFile}
              isProcessing={isProcessing}
              currentModel={currentModel}
            />
          </section>

          {/* Right Panel - Upload Artwork and Order Builder */}
          <aside className="space-y-3 sm:space-y-6 order-2 lg:order-2 min-h-0">
            {/* Upload Artwork Component */}
            <UploadArtworkComponent 
              onAnalysisComplete={(analysis) => {
                console.log('🎨 Artwork analysis completed:', analysis);
              }}
              onGenerateQuote={async (analysis) => {
                console.log('📋 Generating quote from artwork analysis:', analysis);
                
                // Create an order creation message with the analysis data
                const orderMessage = `Generate a complete quote for this SINGLE cap style based on artwork analysis:
                    
Cap Specifications:
- Style: ${analysis.capSpec.shape}
- Bill Shape: ${analysis.capSpec.billShape}
- Fabric: ${analysis.capSpec.fabric} 
- Closure: ${analysis.capSpec.closure}
- Colors: ${analysis.capSpec.frontCrown}, ${analysis.capSpec.backCrown}, ${analysis.capSpec.bill}

Assets/Logos (${analysis.assets.length}):
${analysis.assets.map(asset => `- ${asset.position}: ${asset.application}, Size: ${asset.size.height} x ${asset.size.width}, Style: ${asset.style}`).join('\n')}

${analysis.accessories.length > 0 ? `Accessories:
${analysis.accessories.map(acc => `- ${acc.type}: ${acc.details}`).join('\n')}` : ''}

Please provide a detailed quote with cost breakdown.`;

                // Send the message through the normal flow
                await handleSendMessage(orderMessage);
              }}
              userId={authUser?.id}
              sessionId={`artwork-${Date.now()}`}
            />

            {/* Order Builder - Conditional Visibility */}
            {isOrderBuilderVisible && (
              <div className="rounded-2xl border border-stone-600 bg-black/40 backdrop-blur-xl overflow-hidden">
                <OrderBuilder
                  orderBuilderStatus={orderBuilderStatus}
                  leadTimeData={leadTimeData}
                  collapsedBlocks={collapsedBlocks}
                  isCalculatingLeadTime={isCalculatingLeadTime}
                  onToggleBlock={toggleBlockCollapse}
                  onSelectQuoteVersion={selectQuoteVersion}
                  onSaveQuote={handleSaveQuote}
                  onQuoteOrder={handleQuoteOrder}
                  onPlaceOrder={handlePlaceOrder}
                  canQuoteOrder={canQuoteOrder()}
                  canPlaceOrder={canPlaceOrder()}
                  isVisible={isOrderBuilderVisible}
                />
              </div>
            )}
          </aside>
        </main>
      </div>

      {/* Global Styles */}
      <style jsx global>{`
        .fade-in {
          animation: fadeIn 0.3s ease-in-out;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Scrollbar Styling */
        ::-webkit-scrollbar {
          width: 6px;
        }

        ::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 3px;
        }

        ::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.3);
          border-radius: 3px;
        }

        ::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.5);
        }
      `}</style>
    </div>
  );
}