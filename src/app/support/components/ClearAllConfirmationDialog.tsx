import React from 'react';
import {
  ExclamationTriangleIcon,
  TrashIcon,
  XMarkIcon,
  ChatBubbleLeftRightIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import { ConversationData } from '../services/conversationService';

interface ClearAllConfirmationDialogProps {
  isOpen: boolean;
  conversations: ConversationData[];
  isClearing: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const ClearAllConfirmationDialog = ({
  isOpen,
  conversations,
  isClearing,
  onConfirm,
  onCancel
}: ClearAllConfirmationDialogProps) => {
  if (!isOpen) return null;

  const conversationCount = conversations.length;
  const quoteConversations = conversations.filter(conv => conv.hasQuote).length;
  const regularConversations = conversationCount - quoteConversations;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Dialog Container */}
      <div className="relative w-full max-w-lg bg-gradient-to-br from-black/95 via-black/90 to-black/85 backdrop-blur-xl border border-red-500/30 rounded-2xl shadow-[0_0_50px_rgba(239,68,68,0.25)] overflow-hidden animate-in zoom-in-95 duration-300">

        {/* Header */}
        <div className="p-6 border-b border-red-500/20 bg-gradient-to-r from-red-500/10 to-red-600/5">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-red-500/20 to-red-600/10 border border-red-400/30 grid place-items-center">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">Delete All Conversations?</h2>
              <p className="text-red-300/70 text-sm mt-1">This action cannot be undone</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Warning Message */}
          <div className="space-y-3">
            <p className="text-white/90 leading-relaxed">
              You are about to permanently delete <span className="font-semibold text-red-300">{conversationCount} conversation{conversationCount !== 1 ? 's' : ''}</span>.
              This will remove all message history, quotes, and order builder data.
            </p>

            {/* Conversation Breakdown */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-center gap-2">
                  <ChatBubbleLeftRightIcon className="h-4 w-4 text-blue-400" />
                  <span className="text-sm text-white/70">Support</span>
                </div>
                <div className="text-lg font-semibold text-white mt-1">{regularConversations}</div>
              </div>

              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-center gap-2">
                  <DocumentTextIcon className="h-4 w-4 text-yellow-400" />
                  <span className="text-sm text-white/70">Quotes</span>
                </div>
                <div className="text-lg font-semibold text-white mt-1">{quoteConversations}</div>
              </div>
            </div>
          </div>

          {/* Data Loss Warning */}
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
            <div className="flex items-start gap-3">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
              <div className="space-y-2">
                <h3 className="font-semibold text-red-300">Data that will be permanently lost:</h3>
                <ul className="text-sm text-red-200/80 space-y-1">
                  <li>• All conversation messages and history</li>
                  <li>• Quote data and pricing information</li>
                  <li>• Order builder configurations</li>
                  <li>• Uploaded files and attachments</li>
                  <li>• Conversation titles and metadata</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Confirmation Input */}
          <div className="p-4 rounded-xl bg-black/30 border border-stone-500/30">
            <p className="text-white/90 text-sm mb-2">
              To confirm, type <span className="font-mono font-semibold text-red-300">DELETE ALL</span> below:
            </p>
            <input
              type="text"
              id="confirmationInput"
              placeholder="Type DELETE ALL to confirm"
              className="w-full px-3 py-2 bg-black/50 border border-stone-500/30 rounded-lg text-white placeholder:text-white/40 focus:border-red-400/40 focus:bg-black/60 focus:outline-none focus:ring-1 focus:ring-red-400/20 transition-all duration-200"
              disabled={isClearing}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 border-t border-stone-500/20 bg-gradient-to-r from-black/30 to-black/20">
          <div className="flex items-center gap-3">
            <button
              onClick={onCancel}
              disabled={isClearing}
              className="flex-1 px-4 py-2.5 rounded-xl border border-stone-500/30 bg-black/30 backdrop-blur-sm hover:bg-black/40 hover:border-stone-400/40 text-stone-300 hover:text-white transition-all duration-200 font-medium disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                const input = document.getElementById('confirmationInput') as HTMLInputElement;
                if (input?.value.trim() === 'DELETE ALL') {
                  onConfirm();
                } else {
                  alert('Please type "DELETE ALL" to confirm deletion');
                }
              }}
              disabled={isClearing}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-red-400/30 bg-gradient-to-r from-red-500/15 to-red-600/10 text-red-300 hover:bg-gradient-to-r hover:from-red-500/20 hover:to-red-600/15 hover:border-red-400/40 transition-all duration-200 font-medium disabled:opacity-50 shadow-[0_4px_20px_rgba(239,68,68,0.15)] hover:shadow-[0_6px_25px_rgba(239,68,68,0.25)]"
            >
              {isClearing ? (
                <>
                  <div className="h-4 w-4 border-2 border-red-300/30 border-t-red-300 rounded-full animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <TrashIcon className="h-4 w-4" />
                  Delete All
                </>
              )}
            </button>
          </div>
        </div>

        {/* Close Button */}
        <button
          onClick={onCancel}
          disabled={isClearing}
          className="absolute top-4 right-4 p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-all duration-200 disabled:opacity-50"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};

export default ClearAllConfirmationDialog;