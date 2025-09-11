import React from 'react';
import { ConversationSummary } from '../types/conversation';
import {
  ChatBubbleLeftRightIcon,
  PlusIcon,
  TrashIcon,
  ClockIcon,
  DocumentTextIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

interface ConversationSidebarProps {
  conversations: ConversationSummary[];
  currentConversationId: string | null;
  isLoading: boolean;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: string) => void;
  onRegenerateTitle?: (id: string) => void;
  isVisible: boolean;
  onToggle: () => void;
}

export const ConversationSidebar: React.FC<ConversationSidebarProps> = ({
  conversations,
  currentConversationId,
  isLoading,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  onRegenerateTitle,
  isVisible,
  onToggle
}) => {
  const formatTimestamp = (timestamp: Date) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const getConversationStatus = (conversation: any) => {
    // Check metadata for quote status (stored by new acceptance system)
    if (conversation.metadata?.quoteStatus) {
      const metadataStatus = conversation.metadata.quoteStatus;
      
      // Check if an order was created from this quote
      if (metadataStatus === 'APPROVED' && conversation.metadata?.orderId) {
        return {
          type: 'order-created',
          label: 'Order Created',
          color: 'blue',
          dotClass: 'bg-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.6)]',
          badgeClass: 'bg-blue-400/20 text-blue-300 border-blue-400/30',
          borderClass: 'border-blue-400/20 hover:border-blue-400/30'
        };
      }
      
      switch (metadataStatus) {
        case 'APPROVED':
          return {
            type: 'quote-accepted',
            label: 'Quote Accepted',
            color: 'green',
            dotClass: 'bg-green-400 shadow-[0_0_8px_rgba(34,197,94,0.6)]',
            badgeClass: 'bg-green-400/20 text-green-300 border-green-400/30',
            borderClass: 'border-green-400/20 hover:border-green-400/30'
          };
        case 'REJECTED':
          return {
            type: 'quote-rejected',
            label: 'Quote Rejected',
            color: 'red',
            dotClass: 'bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.6)]',
            badgeClass: 'bg-red-400/20 text-red-300 border-red-400/30',
            borderClass: 'border-red-400/20 hover:border-red-400/30'
          };
      }
    }

    // Check if conversation has quotes
    const hasActiveQuotes = conversation.hasQuotes || 
                           (conversation.quoteData && Object.keys(conversation.quoteData).length > 0) ||
                           (conversation.ConversationQuotes && conversation.ConversationQuotes.length > 0) ||
                           conversation.context === 'QUOTE_REQUEST';

    if (hasActiveQuotes) {
      return {
        type: 'quote-pending',
        label: 'Quote Pending',
        color: 'yellow',
        dotClass: 'bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.6)]',
        badgeClass: 'bg-yellow-400/20 text-yellow-300 border-yellow-400/30',
        borderClass: 'border-yellow-400/20 hover:border-yellow-400/30'
      };
    }

    // Support conversation
    if (conversation.context === 'SUPPORT') {
      return {
        type: 'support',
        label: 'Support',
        color: 'teal',
        dotClass: 'bg-teal-400 shadow-[0_0_8px_rgba(20,184,166,0.6)]',
        badgeClass: 'bg-teal-400/20 text-teal-300 border-teal-400/30',
        borderClass: 'border-teal-400/20 hover:border-teal-400/30'
      };
    }

    // Default general conversation
    return {
      type: 'general',
      label: 'General',
      color: 'gray',
      dotClass: 'bg-white/40',
      badgeClass: 'bg-white/10 text-white/70 border-white/20',
      borderClass: 'border-stone-500/30 hover:border-stone-400/40'
    };
  };

  if (!isVisible) {
    return (
      <button
        onClick={onToggle}
        className="fixed left-4 top-20 z-50 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-3 hover:bg-white/20 transition-all duration-200"
      >
        <ChatBubbleLeftRightIcon className="w-6 h-6 text-white" />
      </button>
    );
  }

  return (
    <div className="fixed left-0 top-0 h-full w-80 bg-gradient-to-br from-black/95 via-black/90 to-black/85 backdrop-blur-xl border-r border-stone-500/30 z-40 flex flex-col shadow-[0_0_50px_rgba(0,0,0,0.8)]">
      {/* Header */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Conversations</h2>
          <button
            onClick={onToggle}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ×
          </button>
        </div>
        
        <button
          onClick={onNewConversation}
          className="w-full bg-lime-500/20 hover:bg-lime-500/30 border border-lime-500/30 rounded-xl p-3 text-lime-400 font-medium transition-all duration-200 flex items-center justify-center gap-2"
        >
          <PlusIcon className="w-5 h-5" />
          New Conversation
        </button>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-lime-400"></div>
          </div>
        ) : conversations.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <ChatBubbleLeftRightIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No conversations yet</p>
          </div>
        ) : (
          conversations.map((conversation) => {
            const status = getConversationStatus(conversation);
            return (
            <div
              key={conversation.id}
              className={`group relative p-3 rounded-xl border transition-all duration-200 cursor-pointer hover:shadow-lg hover:-translate-y-0.5 ${
                currentConversationId === conversation.id
                  ? 'border-blue-400/40 bg-gradient-to-br from-blue-400/15 to-blue-500/10 ring-1 ring-blue-400/20 shadow-[0_4px_20px_rgba(59,130,246,0.15)]'
                  : `bg-gradient-to-br from-black/40 to-black/30 backdrop-blur-sm hover:from-black/50 hover:to-black/35 ${status.borderClass}`
              }`}
              onClick={() => onSelectConversation(conversation.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    {/* Enhanced status indicator */}
                    <div className={`h-2.5 w-2.5 rounded-full ${status.dotClass}`} />
                    <span className="text-sm font-medium text-white truncate flex-1">
                      {conversation.title || `${status.type.includes('quote') ? 'Quote' : 'Support'} Conversation ${conversation.id.slice(-6)}`}
                    </span>
                    {onRegenerateTitle && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRegenerateTitle(conversation.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-blue-400/20 text-blue-400/70 hover:text-blue-400 transition-all duration-200"
                        title="Regenerate title"
                      >
                        <ArrowPathIcon className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                  
                  <p className="text-xs text-gray-400 truncate mb-2">
                    {conversation.lastMessage}
                  </p>
                  
                  {/* Quote-specific information */}
                  {status.type.includes('quote') && (
                    <div className="mb-2">
                      <div className={`inline-flex items-center px-2 py-1 rounded-full text-[10px] border ${status.badgeClass}`}>
                        {status.label}
                      </div>
                      {conversation.metadata?.pricing && (
                        <span className="ml-2 text-xs text-stone-300">
                          ${conversation.metadata.pricing.total?.toFixed(2)}
                        </span>
                      )}
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1 text-gray-500">
                      <ClockIcon className="w-3 h-3" />
                      {formatTimestamp(conversation.timestamp)}
                    </span>
                    
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">
                        {conversation.messageCount} msg{conversation.messageCount !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                </div>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteConversation(conversation.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 ml-2 p-1 text-red-400 hover:text-red-300 transition-all duration-200"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
            );
          })
        )}
      </div>
    </div>
  );
};