import { CpuChipIcon } from '@heroicons/react/24/outline';
import { MessageBubbleProps } from '../types';

const MessageBubble = ({ message, onRetry, showTimestamp = true }: MessageBubbleProps) => {
  const formatSystemMessage = (content: string) => {
    return content; // Add any system message formatting logic here
  };

  const getModelBadgeColor = (model?: string) => {
    // Add model badge color logic here
    return 'bg-teal-500/20 text-teal-200';
  };

  const getCurrentAssistant = () => {
    // This should be passed as props or from context in final implementation
    return {
      displayName: 'AI Support',
      icon: '🤖',
      specialty: 'Powered by OpenAI'
    };
  };

  const currentAssistant = getCurrentAssistant();

  if (message.role === 'system') {
    return (
      <div className="flex items-center gap-3 text-sm italic text-stone-300">
        <div className="flex-1 h-px bg-stone-600"></div>
        <span>{formatSystemMessage(message.content || '')}</span>
        <div className="flex-1 h-px bg-stone-600"></div>
      </div>
    );
  }

  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[78%]">
          {showTimestamp && (
            <div className="flex items-center justify-end gap-2 mb-1">
              <span className="text-xs text-white/50">
                {message.timestamp ? new Date(message.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit'
                }) : ''}
              </span>
            </div>
          )}
          <div className="rounded-[20px] border border-orange-400/30 bg-gradient-to-br from-orange-600/20 via-orange-500/15 to-orange-400/10 backdrop-blur-xl p-3 sm:p-4 text-base sm:text-sm md:text-base text-white shadow-[0_8px_30px_rgba(218,141,38,0.25)] ring-1 ring-orange-400/20 w-full">
            {message.content || ''}
          </div>
        </div>
      </div>
    );
  }

  // Assistant message
  return (
    <div className="flex items-start gap-3">
      <div className="h-9 w-9 rounded-xl bg-black/30 backdrop-blur-sm border border-stone-600 grid place-items-center text-stone-200 mt-0.5">
        <CpuChipIcon className="h-5 w-5 text-teal-300" />
      </div>
      <div className="max-w-[82%]">
        {showTimestamp && (
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
        )}
        <div className="rounded-[20px] border border-rose-800/30 bg-gradient-to-br from-rose-900/20 via-rose-800/15 to-rose-700/10 backdrop-blur-xl p-3 sm:p-4 text-base sm:text-sm md:text-base text-white shadow-[0_8px_30px_rgba(136,19,55,0.25)] ring-1 ring-rose-800/20 w-full">
          <div
            className="whitespace-pre-wrap"
            dangerouslySetInnerHTML={{
              __html: (message.content || '')
                .replace(/\\n/g, '\n') // Convert literal \n strings to actual newlines
                .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white/95 font-semibold">$1</strong>')
                .replace(/^• (.*?)$/gm, '<div class="flex items-start gap-2 my-1"><span class="text-lime-300 mt-0.5">•</span><span>$1</span></div>')
                .replace(/\n/g, '<br/>')
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;