interface TypingIndicatorProps {
  isVisible: boolean;
  message?: string;
}

const TypingIndicator = ({ isVisible, message = "AI is thinking..." }: TypingIndicatorProps) => {
  if (!isVisible) return null;

  return (
    <div className="flex items-center gap-2 text-xs text-orange-400">
      <div className="h-1.5 w-1.5 rounded-full bg-orange-400 animate-pulse"></div>
      <div
        className="h-1.5 w-1.5 rounded-full bg-orange-400 animate-pulse"
        style={{ animationDelay: '150ms' }}
      ></div>
      <div
        className="h-1.5 w-1.5 rounded-full bg-orange-400 animate-pulse"
        style={{ animationDelay: '300ms' }}
      ></div>
      <span>{message}</span>
    </div>
  );
};

export default TypingIndicator;