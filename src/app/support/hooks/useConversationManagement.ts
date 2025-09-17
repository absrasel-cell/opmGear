import { useState, useEffect, useRef } from 'react';
import { ConversationService, ConversationData } from '../services/conversationService';

interface UseConversationManagementProps {
  authUser: any;
  authLoading: boolean;
  isAuthenticated: boolean;
  userProfile: any;
  guestContactInfo: any;
  sessionId: string;
  conversationId: string | null;
  setConversationId: (id: string | null) => void;
  setMessages: (updateFn: (prev: any[]) => any[]) => void;
  setCurrentQuoteData: (data: any) => void;
  setOrderBuilderStatus: (status: any) => void;
  setLeadTimeData: (data: any) => void;
  setIsOrderBuilderVisible: (visible: boolean) => void;
  currentQuoteData: any;
  orderBuilderStatus: any;
  leadTimeData: any;
  uploadedFiles: string[];
}

export function useConversationManagement({
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
}: UseConversationManagementProps) {
  // Conversation management state
  const [conversations, setConversations] = useState<ConversationData[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [isClearingConversations, setIsClearingConversations] = useState(false);
  const [showClearAllDialog, setShowClearAllDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showConversationHistory, setShowConversationHistory] = useState(false);

  // Track initialization to prevent multiple loads
  const conversationsInitialized = useRef(false);
  const autoCreationHandled = useRef(false);
  const manualConversationCreated = useRef(false); // Track manual conversation creation
  const [conversationsLoaded, setConversationsLoaded] = useState(false);

  // Load user conversations when authenticated user changes
  useEffect(() => {
    if (!authLoading && isAuthenticated && authUser?.id && !conversationsInitialized.current) {
      console.log('🔄 Auto-loading conversations for authenticated user');
      loadUserConversations();
      conversationsInitialized.current = true;
    }
  }, [authLoading, isAuthenticated, authUser?.id]);

  // Handle auto-creation logic ONLY after conversations are fully loaded
  useEffect(() => {
    // Only run auto-creation logic if:
    // 1. User is authenticated
    // 2. Conversations have been loaded (conversationsLoaded = true)
    // 3. No current conversation is active
    // 4. Auto-creation hasn't been handled yet
    // 5. No manual conversation was just created
    if (!authLoading && isAuthenticated && authUser?.id &&
        conversationsLoaded && !conversationId &&
        !autoCreationHandled.current && !manualConversationCreated.current) {

      console.log('🔍 Auto-creation check - conversations fully loaded:', {
        conversationsCount: conversations.length,
        hasActiveConversation: !!conversationId,
        autoCreationHandled: autoCreationHandled.current,
        conversationsLoaded
      });

      // Only auto-create if user has NO conversations at all
      if (conversations.length === 0) {
        console.log('🆕 Auto-creating conversation for new user (no existing conversations)');
        autoCreationHandled.current = true;
        createNewConversation();
      } else if (conversations.length > 0) {
        // User has conversations but no active one - load the most recent
        console.log('🔄 Loading most recent conversation instead of creating new one');
        autoCreationHandled.current = true;
        const mostRecentConversation = conversations[0]; // conversations are sorted by updatedAt desc
        if (mostRecentConversation) {
          loadConversation(mostRecentConversation.id);
        }
      }
    }
  }, [authLoading, isAuthenticated, authUser?.id, conversations.length, conversationId, conversationsLoaded]);

  // Auto-create conversation for guest users who have provided contact info (only once)
  useEffect(() => {
    if (!authLoading && !isAuthenticated && !authUser && guestContactInfo &&
        !conversationId && !autoCreationHandled.current) {
      console.log('🆕 Auto-creating conversation for guest user with contact info');
      autoCreationHandled.current = true;
      createNewConversation();
    }
  }, [authLoading, isAuthenticated, authUser, guestContactInfo, conversationId]);

  // Conversation metadata update effect with debouncing
  useEffect(() => {
    if (conversationId && (currentQuoteData || orderBuilderStatus || leadTimeData)) {
      console.log('🔄 Metadata update triggered by:', {
        hasConversationId: !!conversationId,
        hasCurrentQuoteData: !!currentQuoteData,
        hasOrderBuilderStatus: !!orderBuilderStatus,
        hasLeadTimeData: !!leadTimeData
      });

      const debounceDelay = 2000; // 2 seconds debounce

      const timeoutId = setTimeout(() => {
        updateConversationMetadata();
      }, debounceDelay);

      return () => clearTimeout(timeoutId);
    }
  }, [conversationId, currentQuoteData, orderBuilderStatus, userProfile, leadTimeData]);

  const loadUserConversations = async () => {
    setIsLoadingConversations(true);
    setConversationsLoaded(false); // Mark as not loaded while loading
    try {
      const loadedConversations = await ConversationService.loadUserConversations(authUser);
      setConversations(loadedConversations);
      setConversationsLoaded(true); // Mark as loaded after conversations are set
      console.log('✅ Conversations loaded, setting conversationsLoaded = true:', {
        count: loadedConversations.length
      });
    } catch (error) {
      console.error('Error loading conversations:', error);
      setConversationsLoaded(true); // Still mark as loaded even on error to prevent hanging
    } finally {
      setIsLoadingConversations(false);
    }
  };

  const loadConversation = async (targetConversationId: string) => {
    const { OrderBuilderService } = await import('../services/orderBuilderService');

    await ConversationService.loadConversation(
      targetConversationId,
      authUser,
      setMessages,
      setCurrentQuoteData,
      setOrderBuilderStatus,
      setLeadTimeData,
      setConversationId,
      OrderBuilderService,
      setIsOrderBuilderVisible
    );

    // Reset manual conversation creation flag after loading any conversation
    manualConversationCreated.current = false;
  };

  const createNewConversation = async () => {
    await ConversationService.createNewConversation(
      authUser,
      guestContactInfo,
      userProfile,
      sessionId,
      setConversationId,
      setMessages,
      setCurrentQuoteData,
      setOrderBuilderStatus,
      setLeadTimeData,
      setIsOrderBuilderVisible
    );

    // Refresh conversations list after creating new conversation (for authenticated users)
    if (authUser?.id) {
      console.log('🔄 Refreshing conversations after creating new conversation');
      // Set conversationsLoaded to false temporarily to prevent auto-creation during refresh
      setConversationsLoaded(false);
      await loadUserConversations();
    }
  };

  const updateQuoteStatus = async (targetConversationId: string, newStatus: 'APPROVED' | 'REJECTED') => {
    await ConversationService.updateQuoteStatus(
      targetConversationId,
      newStatus,
      setMessages,
      setConversations
    );
  };

  const updateConversationMetadata = async () => {
    if (!conversationId) return;

    await ConversationService.updateConversationMetadata(
      conversationId,
      currentQuoteData,
      orderBuilderStatus,
      leadTimeData,
      userProfile,
      authUser,
      sessionId,
      uploadedFiles
    );
  };

  const regenerateConversationTitle = async (targetConversationId: string) => {
    await ConversationService.regenerateConversationTitle(targetConversationId);
    // Refresh conversations after title regeneration
    await loadUserConversations();
  };

  // Filter conversations based on search query
  const filteredConversations = conversations.filter(conv =>
    conv.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.lastMessage?.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Conversation management handlers
  const handleLoadConversation = (id: string) => {
    loadConversation(id);
    setShowConversationHistory(false);
  };

  const handleNewConversation = () => {
    // Set manual conversation creation flag to prevent auto-loading
    manualConversationCreated.current = true;
    createNewConversation();
    setShowConversationHistory(false);
  };

  const handleRefreshConversations = () => {
    conversationsInitialized.current = false; // Reset flag
    autoCreationHandled.current = false; // Reset auto-creation flag
    setConversationsLoaded(false); // Reset conversations loaded flag
    loadUserConversations();
  };

  const handleRegenerateTitle = (id: string) => {
    regenerateConversationTitle(id);
  };

  const handleAcceptQuote = (targetConversationId: string) => {
    updateQuoteStatus(targetConversationId, 'APPROVED');
  };

  const handleRejectQuote = (targetConversationId: string) => {
    updateQuoteStatus(targetConversationId, 'REJECTED');
  };

  const handleClearAllConversations = () => {
    // Show the confirmation dialog instead of immediately clearing
    setShowClearAllDialog(true);
  };

  const handleConfirmClearAll = () => {
    clearAllConversations();
  };

  const handleCancelClearAll = () => {
    setShowClearAllDialog(false);
  };

  const deleteConversation = async (targetConversationId: string) => {
    // Show confirmation dialog
    const targetConversation = conversations.find(conv => conv.id === targetConversationId);
    if (!targetConversation) {
      console.error('❌ Conversation not found for deletion:', targetConversationId);
      return { success: false, message: 'Conversation not found' };
    }

    // Show confirmation with conversation details
    const shouldDelete = ConversationService.showDeleteConfirmation(targetConversation);
    if (!shouldDelete) {
      return { success: false, message: 'Deletion cancelled by user' };
    }

    // Perform deletion
    const result = await ConversationService.deleteConversation(
      targetConversationId,
      setConversations,
      setConversationId,
      conversationId,
      setMessages,
      setCurrentQuoteData,
      setOrderBuilderStatus,
      setLeadTimeData,
      authUser
    );

    // Show success/error notification
    if (result.success) {
      // Optionally show success message
      console.log('✅ Conversation deleted successfully');
    } else {
      // Show error notification
      alert(`Failed to delete conversation: ${result.message}`);
    }

    return result;
  };

  const clearAllConversations = async () => {
    // Don't allow clearing if already in progress or no conversations exist
    if (isClearingConversations || conversations.length === 0) {
      return { success: false, message: 'Cannot clear conversations at this time' };
    }

    setIsClearingConversations(true);

    try {
      // Perform bulk deletion
      const result = await ConversationService.clearAllConversations(
        authUser,
        setConversations,
        setConversationId,
        setMessages,
        setCurrentQuoteData,
        setOrderBuilderStatus,
        setLeadTimeData
      );

      // Show success/error notification
      if (result.success) {
        console.log('✅ All conversations cleared successfully:', result.deletedCount);
        // Optionally show a success notification to the user
        alert(`✅ Successfully deleted ${result.deletedCount} conversation${result.deletedCount !== 1 ? 's' : ''}`);
      } else {
        console.error('❌ Failed to clear all conversations:', result.message);
        alert(`❌ Failed to clear conversations: ${result.message}`);
      }

      return result;
    } catch (error) {
      console.error('❌ Error in clearAllConversations:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`❌ Error clearing conversations: ${errorMessage}`);
      return { success: false, message: errorMessage };
    } finally {
      setIsClearingConversations(false);
      setShowClearAllDialog(false);
    }
  };

  const formatConversationTime = (time: string | Date) => {
    return ConversationService.formatConversationTime(time.toString());
  };

  const getConversationStatus = (conversation: any) => {
    return ConversationService.getConversationStatus(conversation);
  };

  return {
    // State
    conversations,
    isLoadingConversations,
    isClearingConversations,
    showClearAllDialog,
    searchQuery,
    setSearchQuery,
    showConversationHistory,
    setShowConversationHistory,
    filteredConversations,

    // Actions
    loadUserConversations,
    loadConversation,
    createNewConversation,
    updateQuoteStatus,
    regenerateConversationTitle,
    deleteConversation,
    clearAllConversations,

    // Handlers
    handleLoadConversation,
    handleNewConversation,
    handleRefreshConversations,
    handleRegenerateTitle,
    handleAcceptQuote,
    handleRejectQuote,
    handleClearAllConversations,
    handleConfirmClearAll,
    handleCancelClearAll,

    // Utilities
    formatConversationTime,
    getConversationStatus
  };
}