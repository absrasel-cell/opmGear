'use client';

import React, { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { X, Upload, File, Image, FileText } from 'lucide-react';
import { ordersAPI } from '@/lib/api/orders';
import { AssetKind } from '@/lib/validation/orderAssets';

interface UploadFile {
  id: string;
  file: File;
  kind: AssetKind;
  position?: string;
  preview?: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
}

interface LogoUploaderProps {
  orderId?: string;
  availablePositions: string[];
  onUploadComplete: (uploadedFiles: any[]) => void;
  onError: (error: string) => void;
  onRequestOrderId?: () => Promise<string>;
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

export default function LogoUploader({
  orderId,
  availablePositions,
  onUploadComplete,
  onError,
  onRequestOrderId
}: LogoUploaderProps) {
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
        preview
      });
    }

    setFiles(prev => [...prev, ...newFiles]);
  }, [files.length, onError, generatePreview]);

  const removeFile = useCallback((fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  }, []);

  const updateFileKind = useCallback((fileId: string, kind: AssetKind) => {
    setFiles(prev => prev.map(f => f.id === fileId ? { ...f, kind } : f));
  }, []);

  const updateFilePosition = useCallback((fileId: string, position: string) => {
    setFiles(prev => prev.map(f => f.id === fileId ? { ...f, position } : f));
  }, []);

  const uploadFiles = useCallback(async () => {
    if (files.length === 0 || isUploading) return;
    
    let activeOrderId = orderId;
    
    if (!activeOrderId && onRequestOrderId) {
      try {
        activeOrderId = await onRequestOrderId();
      } catch (error) {
        onError('Failed to create configuration for upload. Please try again.');
        return;
      }
    }
    
    if (!activeOrderId) {
      onError('Please save your configuration first before uploading files');
      return;
    }

    setIsUploading(true);

    try {
      // Step 1: Initiate upload
      const initiateData = {
        files: files.map(f => ({
          name: f.file.name,
          mimeType: f.file.type,
          sizeBytes: f.file.size,
          kind: f.kind
        }))
      };

      const { uploads } = await ordersAPI.initiateUpload(activeOrderId, initiateData);

      // Step 2: Upload files to Supabase
      const uploadPromises = files.map(async (file, index) => {
        const upload = uploads[index];
        
        setFiles(prev => prev.map(f => 
          f.id === file.id ? { ...f, status: 'uploading' as const } : f
        ));

        try {
          await ordersAPI.uploadFileToSupabase(upload.signedUrl, file.file);
          
          setFiles(prev => prev.map(f => 
            f.id === file.id ? { ...f, status: 'success' as const, progress: 100 } : f
          ));

          return {
            path: upload.path,
            mimeType: file.file.type,
            sizeBytes: file.file.size,
            kind: file.kind,
            position: file.position
          };
        } catch (error) {
          setFiles(prev => prev.map(f => 
            f.id === file.id ? { 
              ...f, 
              status: 'error' as const, 
              error: 'Upload failed' 
            } : f
          ));
          throw error;
        }
      });

      const uploadedFiles = await Promise.all(uploadPromises);

      // Step 3: Commit uploads
      await ordersAPI.commitUpload(activeOrderId, { files: uploadedFiles });

      // Clear uploaded files and notify parent
      setFiles([]);
      onUploadComplete(uploadedFiles);

    } catch (error) {
      console.error('Upload error:', error);
      onError(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  }, [files, isUploading, orderId, onUploadComplete, onError, onRequestOrderId]);

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

  return (
    <Card className="p-6 bg-black/20 backdrop-blur-md border border-white/10">
      <div className="space-y-4">
        {/* Info Text */}
        <div className="text-sm text-gray-300 mb-4">
          Please submit your logo files for the selected Logo/Accessories positions, we will prepare final Mock up before going to Sample or Production making steps.
        </div>

        {/* Upload Area */}
        <div 
          className="border-2 border-dashed border-white/20 rounded-lg p-8 text-center hover:border-white/30 transition-colors cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            e.currentTarget.classList.add('border-blue-400');
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            e.currentTarget.classList.remove('border-blue-400');
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.currentTarget.classList.remove('border-blue-400');
            const droppedFiles = e.dataTransfer.files;
            if (droppedFiles.length > 0) {
              handleFileSelect(droppedFiles);
            }
          }}
        >
          <Upload className="w-12 h-12 text-white/50 mx-auto mb-4" />
          <p className="text-white/80 mb-2">
            Click to upload or drag and drop
          </p>
          <p className="text-sm text-white/50">
            PNG, JPG, WebP, SVG, PDF (max 20MB each, {MAX_FILES} files max)
          </p>
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
              <div key={file.id} className="bg-black/30 rounded-lg p-4 border border-white/10">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    {getFileIcon(file)}
                    <div>
                      <p className="text-white text-sm font-medium">{file.file.name}</p>
                      <p className="text-white/50 text-xs">
                        {(file.file.size / 1024 / 1024).toFixed(1)} MB
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={() => removeFile(file.id)}
                    variant="ghost"
                    size="sm"
                    className="text-white/50 hover:text-white hover:bg-white/10"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                {/* File Options */}
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <select
                    value={file.kind}
                    onChange={(e) => updateFileKind(file.id, e.target.value as AssetKind)}
                    className="bg-black/40 border border-white/20 rounded px-3 py-2 text-white text-sm"
                  >
                    <option value="LOGO">Logo</option>
                    <option value="ACCESSORY">Accessory</option>
                    <option value="OTHER">Other</option>
                  </select>

                  {availablePositions.length > 0 && (
                    <select
                      value={file.position || ''}
                      onChange={(e) => updateFilePosition(file.id, e.target.value)}
                      className="bg-black/40 border border-white/20 rounded px-3 py-2 text-white text-sm"
                    >
                      <option value="">Select Position</option>
                      {availablePositions.map(pos => (
                        <option key={pos} value={pos}>{pos}</option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Progress Bar */}
                {file.status === 'uploading' && (
                  <Progress value={file.progress} className="h-2" />
                )}

                {/* Status */}
                {file.status === 'error' && (
                  <p className="text-red-400 text-xs">{file.error}</p>
                )}
                {file.status === 'success' && (
                  <p className="text-green-400 text-xs">Uploaded successfully</p>
                )}
              </div>
            ))}

            <Button
              onClick={uploadFiles}
              disabled={(!orderId && !onRequestOrderId) || isUploading || files.some(f => f.status === 'uploading')}
              className="w-full bg-lime-600 hover:bg-lime-500 text-black font-semibold disabled:opacity-50"
            >
              {(!orderId && !onRequestOrderId)
                ? 'Save configuration first to upload files'
                : isUploading 
                  ? 'Uploading...' 
                  : `Upload ${files.length} file${files.length > 1 ? 's' : ''}`
              }
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}