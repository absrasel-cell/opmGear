import React from 'react';
import { ArrowPathIcon, ClockIcon, TrashIcon } from '@heroicons/react/24/outline';

interface ConversationListProps {
  conversations: any[];
  activeConversationId: string | null;
  isLoading: boolean;
  authLoading: boolean;
  isAuthenticated: boolean;
  authUser: any;
  totalConversations: number;
  onLoadConversation: (id: string) => void;
  onRegenerateTitle: (id: string) => void;
  onAcceptQuote: (conversationId: string) => void;
  onRejectQuote: (conversationId: string) => void;
  onDeleteConversation: (conversationId: string) => void;
  formatConversationTime: (time: string | Date) => string;
  getConversationStatus: (conversation: any) => any;
}

const ConversationList = ({
  conversations,
  activeConversationId,
  isLoading,
  authLoading,
  isAuthenticated,
  authUser,
  totalConversations,
  onLoadConversation,
  onRegenerateTitle,
  onAcceptQuote,
  onRejectQuote,
  onDeleteConversation,
  formatConversationTime,
  getConversationStatus
}: ConversationListProps) => {
  if (isLoading) {
    return (
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
            <p className="text-sm text-white/60">Loading conversations...</p>
          </div>
        </div>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <div className="text-center py-8">
          <div className="mb-6 p-4 bg-gradient-to-br from-black/40 to-black/30 backdrop-blur-sm rounded-xl border border-stone-500/30 text-xs text-left shadow-lg">
            <div className="font-medium text-white/70 mb-2">Debug Info:</div>
            <div className="space-y-1 text-white/50">
              <div>Auth Loading: {authLoading ? 'Yes' : 'No'}</div>
              <div>Is Authenticated: {isAuthenticated ? 'Yes' : 'No'}</div>
              <div>User ID: {authUser?.id || 'None'}</div>
              <div>User Email: {authUser?.email || 'None'}</div>
              <div>Total Conversations: {totalConversations}</div>
              <div>Loading Conversations: {isLoading ? 'Yes' : 'No'}</div>
            </div>
          </div>
          <div className="text-white/60 font-medium">
            {totalConversations === 0 ? 'No conversations yet' : 'No matching conversations'}
          </div>
          <p className="text-white/40 text-sm mt-2">Start a new conversation to get help with your orders</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3">
      <div className="space-y-2">
        {conversations.map((conversation) => {
          const status = getConversationStatus(conversation);
          return (
            <div
              key={conversation.id}
              className={`group p-4 rounded-xl border cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 ${
                conversation.id === activeConversationId
                  ? 'border-blue-400/40 bg-gradient-to-br from-blue-400/15 to-blue-500/10 ring-1 ring-blue-400/20 shadow-[0_4px_20px_rgba(59,130,246,0.15)]'
                  : `bg-gradient-to-br from-black/40 to-black/30 backdrop-blur-sm hover:from-black/50 hover:to-black/35 ${status.borderClass}`
              }`}
              onClick={() => onLoadConversation(conversation.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    {/* Enhanced status indicator */}
                    <div className={`h-2.5 w-2.5 rounded-full ${status.dotClass}`} />
                    <span className="text-sm font-medium text-white truncate flex-1">
                      {conversation.title || `${status.type.includes('quote') ? 'Quote' : 'Support'} Conversation ${conversation.id.slice(-6)}`}
                    </span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRegenerateTitle(conversation.id);
                        }}
                        className="p-1 rounded hover:bg-blue-400/20 text-blue-400/70 hover:text-blue-400 transition-all duration-200"
                        title="Regenerate title"
                      >
                        <ArrowPathIcon className="h-3 w-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteConversation(conversation.id);
                        }}
                        className="p-1 rounded hover:bg-red-400/20 text-red-400/70 hover:text-red-400 transition-all duration-200"
                        title="Delete conversation"
                      >
                        <TrashIcon className="h-3 w-3" />
                      </button>
                    </div>
                  </div>

                  {/* Quote-specific information */}
                  {conversation.hasQuote && conversation.orderBuilderSummary && (
                    <div className="mb-2 p-2 rounded-lg bg-lime-400/10 border border-lime-400/20">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 text-lime-300">
                          <div className="h-1.5 w-1.5 rounded-full bg-lime-400" />
                          <span className="font-medium">Quote Completed</span>
                        </div>
                        <span className="text-white/70">
                          {conversation.orderBuilderSummary.totalUnits ?
                            `${conversation.orderBuilderSummary.totalUnits} caps` :
                            'Custom order'
                          }
                        </span>
                      </div>
                      {conversation.orderBuilderSummary.totalCost && (
                        <div className="mt-1 text-xs text-white/80 font-medium">
                          ${conversation.orderBuilderSummary.totalCost.toFixed(2)}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Customer information if available */}
                  {conversation.quoteData?.quoteOrder?.customerName && (
                    <div className="mb-2 text-xs text-stone-300">
                      <span className="text-white/60">Customer: </span>
                      <span className="text-white/80">
                        {conversation.quoteData.quoteOrder.customerName}
                        {conversation.quoteData.quoteOrder.customerCompany && (
                          <span className="text-white/60"> ({conversation.quoteData.quoteOrder.customerCompany})</span>
                        )}
                      </span>
                    </div>
                  )}

                  {conversation.lastMessage && (
                    <p className="text-xs text-stone-300 line-clamp-2 mb-2">
                      {conversation.lastMessage.content}
                    </p>
                  )}

                  <div className="flex items-center gap-3 text-xs text-white/50">
                    <div className="flex items-center gap-1">
                      <ClockIcon className="h-3 w-3" />
                      {conversation.quoteCompletedAt ?
                        formatConversationTime(conversation.quoteCompletedAt) :
                        formatConversationTime(conversation.lastActivity || conversation.createdAt)
                      }
                    </div>
                    <span>{conversation.messageCount} messages</span>
                    <span className={`px-2 py-0.5 rounded-full font-medium text-xs border ${status.badgeClass}`}>
                      {status.label}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 ml-3">
                  {/* Quote Status Management Buttons */}
                  {conversation.hasQuote && status.type.includes('quote') && (
                    <>
                      {status.type !== 'quote-accepted' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            console.log('🔄 Accept Quote clicked for conversation:', conversation.id, 'Current status:', status);
                            onAcceptQuote(conversation.id);
                          }}
                          className="px-2 py-1 text-xs rounded-lg border border-green-400/30 bg-green-400/10 text-green-300 hover:bg-green-400/20 hover:border-green-400/40 transition-all duration-200 font-medium"
                          title="Accept this quote"
                        >
                          ✓ Accept
                        </button>
                      )}
                      {status.type !== 'quote-rejected' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            console.log('🔄 Reject Quote clicked for conversation:', conversation.id, 'Current status:', status);
                            onRejectQuote(conversation.id);
                          }}
                          className="px-2 py-1 text-xs rounded-lg border border-red-400/30 bg-red-400/10 text-red-300 hover:bg-red-400/20 hover:border-red-400/40 transition-all duration-200 font-medium"
                          title="Reject this quote"
                        >
                          ✗ Reject
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ConversationList;