import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';
import { Message } from '../types';

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
  onRetry?: (messageId: string) => void;
  showSessionStart?: boolean;
}

const MessageList = ({
  messages,
  isLoading,
  onRetry,
  showSessionStart = true
}: MessageListProps) => {
  return (
    <div className="flex-1 overflow-y-auto space-y-3 p-3 sm:p-4 md:p-5">
      {/* Session start indicator */}
      {showSessionStart && (
        <div className="flex items-center gap-3 text-sm italic text-stone-300">
          <div className="flex-1 h-px bg-stone-600"></div>
          <span>Session started — Intent detection active</span>
          <div className="flex-1 h-px bg-stone-600"></div>
        </div>
      )}

      {/* Messages */}
      {messages.map((message) => (
        <div key={message.id}>
          <MessageBubble
            message={message}
            onRetry={onRetry}
            showTimestamp={true}
          />
        </div>
      ))}

      {/* Loading indicator */}
      <TypingIndicator isVisible={isLoading} />
    </div>
  );
};

export default MessageList;