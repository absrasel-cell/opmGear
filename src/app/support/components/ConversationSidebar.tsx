import React from 'react';
import {
  ChatBubbleLeftRightIcon,
  ArrowPathIcon,
  XMarkIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  ClockIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import ConversationList from './ConversationList';

interface ConversationSidebarProps {
  isVisible: boolean;
  conversations: any[];
  filteredConversations: any[];
  activeConversationId: string | null;
  searchQuery: string;
  isLoadingConversations: boolean;
  isClearingConversations?: boolean;
  authLoading: boolean;
  isAuthenticated: boolean;
  authUser: any;
  onClose: () => void;
  onRefresh: () => void;
  onNewConversation: () => void;
  onSearchChange: (query: string) => void;
  onLoadConversation: (id: string) => void;
  onRegenerateTitle: (id: string) => void;
  onAcceptQuote: (conversationId: string) => void;
  onRejectQuote: (conversationId: string) => void;
  onDeleteConversation: (conversationId: string) => void;
  onClearAllConversations: () => void;
  formatConversationTime: (time: string | Date) => string;
  getConversationStatus: (conversation: any) => any;
}

const ConversationSidebar = ({
  isVisible,
  conversations,
  filteredConversations,
  activeConversationId,
  searchQuery,
  isLoadingConversations,
  isClearingConversations = false,
  authLoading,
  isAuthenticated,
  authUser,
  onClose,
  onRefresh,
  onNewConversation,
  onSearchChange,
  onLoadConversation,
  onRegenerateTitle,
  onAcceptQuote,
  onRejectQuote,
  onDeleteConversation,
  onClearAllConversations,
  formatConversationTime,
  getConversationStatus
}: ConversationSidebarProps) => {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 lg:left-0 lg:top-0 lg:bottom-0 lg:right-auto z-50 lg:w-96 bg-black/50 lg:bg-transparent animate-in slide-in-from-left duration-300">
      {/* Mobile backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm lg:hidden"
        onClick={onClose}
      ></div>

      {/* Sidebar */}
      <div className="relative h-full w-full max-w-sm lg:max-w-none lg:w-96 bg-gradient-to-br from-black/95 lg:from-black/40 via-black/90 lg:via-black/35 to-black/85 lg:to-black/30 backdrop-blur-xl border-r border-stone-500/30 overflow-hidden flex flex-col shadow-[0_0_50px_rgba(0,0,0,0.8)]">
        {/* Header */}
        <div className="p-4 border-b border-stone-500/30 bg-gradient-to-r from-black/30 to-black/20 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-400/30 grid place-items-center">
                <ChatBubbleLeftRightIcon className="h-4 w-4 text-blue-400" />
              </div>
              <h2 className="text-lg font-semibold text-white tracking-tight">Conversation History</h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  console.log('🔥 MANUAL REFRESH: Force loading conversations...');
                  onRefresh();
                }}
                disabled={isLoadingConversations || isClearingConversations}
                className="p-2 rounded-xl border border-stone-500/30 bg-black/30 backdrop-blur-sm hover:bg-black/40 hover:border-stone-400/40 text-stone-300 hover:text-white transition-all duration-200 disabled:opacity-50 hover:shadow-lg"
                title={`Refresh conversations (User: ${authUser?.email || 'Not logged in'})`}
              >
                <ArrowPathIcon className={`h-4 w-4 ${isLoadingConversations ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={onClearAllConversations}
                disabled={isLoadingConversations || isClearingConversations || conversations.length === 0}
                className="p-2 rounded-xl border border-stone-500/30 bg-black/30 backdrop-blur-sm hover:bg-red-400/10 hover:border-red-400/30 text-stone-300 hover:text-red-400 transition-all duration-200 disabled:opacity-50 hover:shadow-lg"
                title={`Clear all conversations (${conversations.length} total)`}
              >
                {isClearingConversations ? (
                  <ArrowPathIcon className="h-4 w-4 animate-spin" />
                ) : (
                  <TrashIcon className="h-4 w-4" />
                )}
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-xl border border-stone-500/30 bg-black/30 backdrop-blur-sm hover:bg-red-400/10 hover:border-red-400/30 text-stone-300 hover:text-red-400 transition-all duration-200 hover:shadow-lg"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* New Conversation Button */}
          <button
            onClick={onNewConversation}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-lime-400/30 bg-gradient-to-r from-lime-400/15 to-lime-500/10 text-lime-300 hover:bg-gradient-to-r hover:from-lime-400/20 hover:to-lime-500/15 hover:border-lime-400/40 transition-all duration-200 font-medium shadow-[0_4px_20px_rgba(132,204,22,0.15)] hover:shadow-[0_6px_25px_rgba(132,204,22,0.25)]"
          >
            <PlusIcon className="h-4 w-4" />
            New Conversation
          </button>

          {/* Search */}
          <div className="mt-4 relative">
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
              <MagnifyingGlassIcon className="h-4 w-4 text-white/40" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search conversations..."
              className="w-full pl-10 pr-4 py-2.5 bg-black/30 backdrop-blur-sm border border-stone-500/30 rounded-xl text-sm text-white placeholder:text-white/40 focus:border-blue-400/40 focus:bg-black/40 focus:outline-none focus:ring-1 focus:ring-blue-400/20 transition-all duration-200"
            />
          </div>
        </div>

        {/* Conversation List */}
        <ConversationList
          conversations={filteredConversations}
          activeConversationId={activeConversationId}
          isLoading={isLoadingConversations}
          authLoading={authLoading}
          isAuthenticated={isAuthenticated}
          authUser={authUser}
          totalConversations={conversations.length}
          onLoadConversation={onLoadConversation}
          onRegenerateTitle={onRegenerateTitle}
          onAcceptQuote={onAcceptQuote}
          onRejectQuote={onRejectQuote}
          onDeleteConversation={onDeleteConversation}
          formatConversationTime={formatConversationTime}
          getConversationStatus={getConversationStatus}
        />
      </div>
    </div>
  );
};

export default ConversationSidebar;