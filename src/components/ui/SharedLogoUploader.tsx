'use client';

import React, { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { X, Upload, File, Image, FileText, Paperclip } from 'lucide-react';

interface UploadFile {
  id: string;
  file: File;
  kind: 'LOGO' | 'ACCESSORY' | 'OTHER';
  position?: string;
  preview?: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
  tempUrl?: string;
}

interface SharedLogoUploaderProps {
  onUploadComplete: (uploadedFiles: any[]) => void;
  onError: (error: string) => void;
  variant?: 'chat' | 'product';
  className?: string;
  compact?: boolean;
}

const ACCEPTED_TYPES = [
  'image/png',
  'image/jpeg', 
  'image/webp',
  'image/svg+xml',
  'application/pdf'
];

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const MAX_FILES = 5;

export default function SharedLogoUploader({
  onUploadComplete,
  onError,
  variant = 'product',
  className = '',
  compact = false
}: SharedLogoUploaderProps) {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const generatePreview = useCallback((file: File): Promise<string | undefined> => {
    return new Promise((resolve) => {
      if (!file.type.startsWith('image/')) {
        resolve(undefined);
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = () => resolve(undefined);
      reader.readAsDataURL(file);
    });
  }, []);

  const handleFileSelect = useCallback(async (selectedFiles: FileList) => {
    const newFiles: UploadFile[] = [];

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      
      // Validate file type
      if (!ACCEPTED_TYPES.includes(file.type)) {
        onError(`File "${file.name}" is not a supported file type`);
        continue;
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        onError(`File "${file.name}" exceeds the 20MB size limit`);
        continue;
      }

      // Check total file count
      if (files.length + newFiles.length >= MAX_FILES) {
        onError(`Maximum ${MAX_FILES} files allowed`);
        break;
      }

      const preview = await generatePreview(file);
      
      newFiles.push({
        id: Math.random().toString(36).substring(7),
        file,
        kind: 'LOGO',
        status: 'pending',
        progress: 0,
        preview,
        tempUrl: preview
      });
    }

    setFiles(prev => [...prev, ...newFiles]);
  }, [files.length, onError, generatePreview]);

  const removeFile = useCallback((fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  }, []);

  const updateFileKind = useCallback((fileId: string, kind: 'LOGO' | 'ACCESSORY' | 'OTHER') => {
    setFiles(prev => prev.map(f => f.id === fileId ? { ...f, kind } : f));
  }, []);

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const uploadFiles = useCallback(async () => {
    if (files.length === 0 || isUploading) return;

    setIsUploading(true);

    try {
      const uploadedFiles = await Promise.all(files.map(async (file) => {
        setFiles(prev => prev.map(f => 
          f.id === file.id ? { ...f, status: 'uploading' as const, progress: 50 } : f
        ));

        const base64Data = await convertFileToBase64(file.file);

        setFiles(prev => prev.map(f => 
          f.id === file.id ? { ...f, status: 'success' as const, progress: 100 } : f
        ));

        return {
          id: file.id,
          name: file.file.name,
          size: file.file.size,
          type: file.file.type,
          kind: file.kind,
          position: file.position,
          base64Data: base64Data,
          preview: file.preview
        };
      }));

      onUploadComplete(uploadedFiles);
      console.log('✅ Logo files prepared for upload:', uploadedFiles.map(f => f.name));

    } catch (error) {
      console.error('Upload preparation error:', error);
      onError(error instanceof Error ? error.message : 'Failed to prepare files');
    } finally {
      setIsUploading(false);
    }
  }, [files, onUploadComplete, onError]);

  const getFileIcon = (file: UploadFile) => {
    if (file.preview) {
      return <img src={file.preview} alt="" className="w-8 h-8 object-cover rounded" />;
    }
    
    if (file.file.type.startsWith('image/')) {
      return <Image className="w-8 h-8 text-blue-400" />;
    }
    
    if (file.file.type === 'application/pdf') {
      return <FileText className="w-8 h-8 text-red-400" />;
    }
    
    return <File className="w-8 h-8 text-gray-400" />;
  };

  const isChatVariant = variant === 'chat';
  const containerClasses = isChatVariant 
    ? "p-3 bg-white/10 backdrop-blur-md rounded-xl border border-white/20"
    : "p-4 bg-gradient-to-br from-lime-50 to-green-50 dark:from-lime-900/10 dark:to-green-900/10 rounded-xl border border-lime-200 dark:border-lime-800";

  const uploadAreaClasses = isChatVariant
    ? "border-2 border-dashed border-white/30 rounded-lg p-4 text-center hover:border-white/50 transition-all duration-200 cursor-pointer bg-white/5 backdrop-blur-sm"
    : "border-2 border-dashed border-lime-300 dark:border-lime-600 rounded-lg p-8 text-center hover:border-lime-400 dark:hover:border-lime-500 transition-all duration-200 cursor-pointer bg-white/50 dark:bg-black/20 backdrop-blur-sm";

  const textClasses = isChatVariant
    ? "text-white/80"
    : "text-lime-800 dark:text-lime-200";

  return (
    <div className={`${containerClasses} ${className}`}>
      <div className="space-y-4">
        {/* Compact header for chat variant */}
        {isChatVariant && !compact && (
          <div className="flex items-center space-x-2">
            <Paperclip className="w-4 h-4 text-white/70" />
            <span className="text-sm text-white/70">Upload Logo Files</span>
          </div>
        )}

        {/* Info Text - smaller for chat */}
        {!compact && (
          <div className={`text-sm mb-4 ${isChatVariant ? 'text-white/60' : 'text-lime-700 dark:text-lime-300'}`}>
            {isChatVariant 
              ? "Attach logo files to help with your request"
              : "Select your logo files for the chosen positions. Files will be uploaded when you save or submit your order."
            }
          </div>
        )}

        {/* Upload Area - compact for chat */}
        <div 
          className={uploadAreaClasses}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            if (isChatVariant) {
              e.currentTarget.classList.add('border-white/70', 'bg-white/10');
            } else {
              e.currentTarget.classList.add('border-lime-500', 'bg-lime-50', 'dark:bg-lime-900/20');
            }
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            if (isChatVariant) {
              e.currentTarget.classList.remove('border-white/70', 'bg-white/10');
            } else {
              e.currentTarget.classList.remove('border-lime-500', 'bg-lime-50', 'dark:bg-lime-900/20');
            }
          }}
          onDrop={(e) => {
            e.preventDefault();
            if (isChatVariant) {
              e.currentTarget.classList.remove('border-white/70', 'bg-white/10');
            } else {
              e.currentTarget.classList.remove('border-lime-500', 'bg-lime-50', 'dark:bg-lime-900/20');
            }
            const droppedFiles = e.dataTransfer.files;
            if (droppedFiles.length > 0) {
              handleFileSelect(droppedFiles);
            }
          }}
        >
          <Upload className={`mx-auto mb-2 ${compact ? 'w-6 h-6' : 'w-12 h-12'} ${isChatVariant ? 'text-white/70' : 'text-lime-500'}`} />
          <p className={`mb-2 font-medium ${compact ? 'text-xs' : 'text-sm'} ${textClasses}`}>
            {compact ? "Upload files" : "Click to select or drag and drop"}
          </p>
          {!compact && (
            <p className={`text-xs ${isChatVariant ? 'text-white/50' : 'text-lime-600 dark:text-lime-400'}`}>
              PNG, JPG, WebP, SVG, PDF (max 20MB each, {MAX_FILES} files max)
            </p>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ACCEPTED_TYPES.join(',')}
          onChange={(e) => {
            if (e.target.files?.length) {
              handleFileSelect(e.target.files);
            }
          }}
          className="hidden"
        />

        {/* File List */}
        {files.length > 0 && (
          <div className="space-y-3">
            {files.map((file) => (
              <div key={file.id} className={`rounded-lg p-3 border shadow-sm ${
                isChatVariant 
                  ? 'bg-white/5 border-white/20' 
                  : 'bg-white dark:bg-gray-800 border-lime-200 dark:border-lime-800'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    {getFileIcon(file)}
                    <div>
                      <p className={`text-sm font-medium ${isChatVariant ? 'text-white' : 'text-gray-900 dark:text-gray-100'}`}>
                        {file.file.name}
                      </p>
                      <p className={`text-xs ${isChatVariant ? 'text-white/60' : 'text-gray-500 dark:text-gray-400'}`}>
                        {(file.file.size / 1024 / 1024).toFixed(1)} MB
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={() => removeFile(file.id)}
                    variant="ghost"
                    size="sm"
                    className={isChatVariant 
                      ? "text-white/60 hover:text-red-400 hover:bg-red-500/20"
                      : "text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                    }
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                {/* File Type Selection */}
                <div className="mb-3">
                  <select
                    value={file.kind}
                    onChange={(e) => updateFileKind(file.id, e.target.value as 'LOGO' | 'ACCESSORY' | 'OTHER')}
                    className={`w-full p-3 text-sm border rounded-lg focus:ring-2 focus:ring-lime-500 focus:border-lime-500 transition-colors ${
                      isChatVariant
                        ? 'border-white/30 bg-white/10 text-white placeholder-white/50'
                        : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                    }`}
                  >
                    <option value="LOGO">Logo</option>
                    <option value="ACCESSORY">Accessory</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                {/* Progress Bar */}
                {file.status === 'uploading' && (
                  <div className="mb-3">
                    <Progress value={file.progress} className="h-2" />
                  </div>
                )}

                {/* Status */}
                {file.status === 'error' && (
                  <p className="text-red-600 dark:text-red-400 text-xs">{file.error}</p>
                )}
                {file.status === 'success' && (
                  <p className={`text-xs ${isChatVariant ? 'text-green-400' : 'text-green-600 dark:text-green-400'}`}>
                    ✓ Ready for upload
                  </p>
                )}
              </div>
            ))}

            <Button
              onClick={uploadFiles}
              disabled={isUploading || files.some(f => f.status === 'uploading') || files.every(f => f.status === 'success')}
              className={`w-full font-semibold disabled:opacity-50 transition-colors duration-200 ${
                isChatVariant
                  ? 'bg-lime-500 hover:bg-lime-400 text-black'
                  : 'bg-lime-600 hover:bg-lime-500 text-white'
              }`}
            >
              {isUploading 
                ? 'Preparing files...' 
                : files.every(f => f.status === 'success')
                ? 'Upload complete!'
                : `Prepare ${files.length} file${files.length > 1 ? 's' : ''} for upload`
              }
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}