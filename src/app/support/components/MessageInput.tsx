import React, { useRef } from 'react';
import { PaperClipIcon, ArrowUpRightIcon, DocumentTextIcon } from '@heroicons/react/24/outline';

interface MessageInputProps {
  inputMessage: string;
  setInputMessage: (message: string) => void;
  uploadedFiles: string[];
  setUploadedFiles: React.Dispatch<React.SetStateAction<string[]>>;
  isLoading: boolean;
  isUploading: boolean;
  canQuoteOrder: () => boolean;
  onSendMessage: (e: React.FormEvent) => void;
  onFileUpload: (files: FileList) => void;
  onQuoteOrder: () => void;
  onTriggerFileUpload: () => void;
  onRemoveFile?: (index: number) => void;
}

const MessageInput = ({
  inputMessage,
  setInputMessage,
  uploadedFiles,
  setUploadedFiles,
  isLoading,
  isUploading,
  canQuoteOrder,
  onSendMessage,
  onFileUpload,
  onQuoteOrder,
  onTriggerFileUpload,
  onRemoveFile
}: MessageInputProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleTriggerFileUpload = () => {
    fileInputRef.current?.click();
    onTriggerFileUpload();
  };

  return (
    <>
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
                  onClick={() => onRemoveFile ? onRemoveFile(index) : setUploadedFiles(prev => prev.filter((_, i) => i !== index))}
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
      <form onSubmit={onSendMessage} className="px-3 sm:px-4 md:px-5 py-3 sm:py-4 border-t border-stone-600 bg-black/20">
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
            onChange={(e) => e.target.files && onFileUpload(e.target.files)}
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
            <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
            </div>
          </div>
          {canQuoteOrder() && (
            <button
              type="button"
              onClick={onQuoteOrder}
              disabled={!canQuoteOrder()}
              className="h-12 sm:h-10 md:h-12 px-4 sm:px-4 md:px-5 rounded-full bg-orange-600 text-white hover:bg-orange-700 transition-colors flex items-center gap-2 font-medium tracking-tight disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_10px_40px_-10px_rgba(234,88,12,0.4)] hover:-translate-y-0.5 touch-manipulation"
            >
              <span className="hidden sm:inline">Quote</span>
              <DocumentTextIcon className="h-5 w-5 -mr-0.5" />
            </button>
          )}
          <button
            type="submit"
            disabled={isLoading || isUploading || (!inputMessage.trim() && uploadedFiles.length === 0)}
            className="h-12 sm:h-10 md:h-12 px-4 sm:px-4 md:px-5 rounded-full bg-lime-400 text-black hover:bg-lime-500 transition-colors flex items-center gap-2 font-medium tracking-tight disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_10px_40px_-10px_rgba(132,204,22,0.6)] hover:-translate-y-0.5 touch-manipulation"
          >
            <span className="hidden sm:inline">Send</span>
            <ArrowUpRightIcon className="h-5 w-5 -mr-0.5" />
          </button>
        </div>
      </form>
    </>
  );
};

export default MessageInput;