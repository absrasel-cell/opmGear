/**
 * File Upload Service
 * Handles file upload operations including validation, processing, and state management
 */

export interface FileUploadConfig {
  maxFileSize?: number; // in bytes
  allowedTypes?: string[];
  maxFiles?: number;
}

export interface FileUploadResult {
  success: boolean;
  urls: string[];
  errors: string[];
}

export interface FileUploadState {
  uploadedFiles: string[];
  isUploading: boolean;
}

export class FileUploadService {
  private static readonly DEFAULT_CONFIG: FileUploadConfig = {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['image/*', 'application/pdf', 'application/illustrator', 'application/postscript', '.eps', '.ai', '.txt'],
    maxFiles: 10
  };

  /**
   * Handle file upload from FileList
   */
  static async handleFileUpload(
    files: FileList,
    setUploadedFiles: (updater: (prev: string[]) => string[]) => void,
    setIsUploading: (uploading: boolean) => void,
    config: FileUploadConfig = {}
  ): Promise<FileUploadResult> {
    if (!files.length) return { success: false, urls: [], errors: ['No files provided'] };

    const effectiveConfig = { ...this.DEFAULT_CONFIG, ...config };
    setIsUploading(true);
    const uploadedUrls: string[] = [];
    const errors: string[] = [];

    try {
      // Validate files before upload
      const validationErrors = this.validateFiles(files, effectiveConfig);
      if (validationErrors.length > 0) {
        errors.push(...validationErrors);
        setIsUploading(false);
        return { success: false, urls: [], errors };
      }

      // Process each file
      for (const file of Array.from(files)) {
        try {
          console.log('📤 Uploading file:', {
            name: file.name,
            size: file.size,
            type: file.type
          });

          // Create form data
          const formData = new FormData();
          formData.append('file', file);

          // Upload to API endpoint
          const uploadResponse = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
          });

          if (uploadResponse.ok) {
            const uploadResult = await uploadResponse.json();
            // Check for successful upload with URL
            if (uploadResult.success && uploadResult.file && uploadResult.file.url) {
              uploadedUrls.push(uploadResult.file.url);
              console.log('✅ File uploaded successfully:', uploadResult.file.url);
            } else {
              console.error('❌ Upload response missing file URL:', uploadResult);
              errors.push(`Upload succeeded but no URL returned for ${file.name}`);
            }
          } else {
            const errorData = await uploadResponse.json();
            console.error('❌ Failed to upload', file.name, errorData);
            errors.push(`Failed to upload ${file.name}: ${errorData.error || 'Unknown error'}`);
          }
        } catch (fileError) {
          console.error('❌ Error uploading file:', file.name, fileError);
          errors.push(`Error uploading ${file.name}: ${fileError instanceof Error ? fileError.message : 'Unknown error'}`);
        }
      }

      // Update uploaded files state
      if (uploadedUrls.length > 0) {
        setUploadedFiles(prev => [...prev, ...uploadedUrls]);
      }

      return {
        success: uploadedUrls.length > 0,
        urls: uploadedUrls,
        errors
      };

    } catch (error) {
      console.error('❌ Upload process failed:', error);
      errors.push('Failed to upload files');
      return { success: false, urls: [], errors };
    } finally {
      setIsUploading(false);
    }
  }

  /**
   * Validate files before upload
   */
  private static validateFiles(files: FileList, config: FileUploadConfig): string[] {
    const errors: string[] = [];
    const fileArray = Array.from(files);

    // Check file count
    if (config.maxFiles && fileArray.length > config.maxFiles) {
      errors.push(`Too many files. Maximum allowed: ${config.maxFiles}`);
    }

    // Check individual files
    fileArray.forEach((file, index) => {
      // Check file size
      if (config.maxFileSize && file.size > config.maxFileSize) {
        errors.push(`File ${file.name} is too large. Maximum size: ${this.formatFileSize(config.maxFileSize)}`);
      }

      // Check file type (basic validation)
      if (config.allowedTypes && config.allowedTypes.length > 0) {
        const isValidType = config.allowedTypes.some(type => {
          if (type.startsWith('.')) {
            return file.name.toLowerCase().endsWith(type.toLowerCase());
          }
          if (type.includes('/*')) {
            const baseType = type.split('/')[0];
            return file.type.startsWith(baseType);
          }
          return file.type === type;
        });

        if (!isValidType) {
          errors.push(`File ${file.name} has unsupported type. Allowed types: ${config.allowedTypes.join(', ')}`);
        }
      }
    });

    return errors;
  }

  /**
   * Remove file from uploaded files list
   */
  static removeFile(
    index: number,
    setUploadedFiles: (updater: (prev: string[]) => string[]) => void
  ): void {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  }

  /**
   * Clear all uploaded files
   */
  static clearAllFiles(
    setUploadedFiles: (files: string[]) => void
  ): void {
    setUploadedFiles([]);
  }

  /**
   * Trigger file input dialog
   */
  static triggerFileUpload(fileInputRef: React.RefObject<HTMLInputElement | null>): void {
    fileInputRef.current?.click();
  }

  /**
   * Create file preview URL (for display purposes)
   */
  static createPreviewUrl(file: File): string {
    return URL.createObjectURL(file);
  }

  /**
   * Validate single file and return preview data
   */
  static validateAndPreviewFile(file: File): {
    isValid: boolean;
    error?: string;
    previewUrl?: string;
    fileInfo: {
      name: string;
      size: string;
      type: string;
    };
  } {
    const fileInfo = {
      name: file.name,
      size: this.formatFileSize(file.size),
      type: file.type || 'Unknown'
    };

    // Basic validation
    if (file.size > this.DEFAULT_CONFIG.maxFileSize!) {
      return {
        isValid: false,
        error: `File too large. Maximum size: ${this.formatFileSize(this.DEFAULT_CONFIG.maxFileSize!)}`,
        fileInfo
      };
    }

    // Create preview for images
    let previewUrl: string | undefined;
    if (file.type.startsWith('image/')) {
      previewUrl = this.createPreviewUrl(file);
    }

    return {
      isValid: true,
      previewUrl,
      fileInfo
    };
  }

  /**
   * Format file size in human readable format
   */
  private static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Get file extension from filename
   */
  static getFileExtension(filename: string): string {
    return filename.split('.').pop()?.toLowerCase() || '';
  }

  /**
   * Check if file is an image
   */
  static isImageFile(file: File): boolean {
    return file.type.startsWith('image/');
  }

  /**
   * Check if file is a document
   */
  static isDocumentFile(file: File): boolean {
    const documentTypes = [
      'application/pdf',
      'application/illustrator',
      'application/postscript',
      'text/plain'
    ];

    const documentExtensions = ['.eps', '.ai', '.txt'];
    const extension = '.' + this.getFileExtension(file.name);

    return documentTypes.includes(file.type) || documentExtensions.includes(extension);
  }

  /**
   * Filter uploaded files to only valid URLs
   */
  static filterValidFiles(uploadedFiles: string[]): string[] {
    return uploadedFiles.filter(url => url && typeof url === 'string' && url.length > 0);
  }

  /**
   * Get upload progress simulation (for UX)
   */
  static simulateUploadProgress(
    onProgress: (progress: number) => void,
    duration: number = 2000
  ): Promise<void> {
    return new Promise((resolve) => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 30;
        if (progress >= 100) {
          progress = 100;
          clearInterval(interval);
          onProgress(progress);
          resolve();
        } else {
          onProgress(progress);
        }
      }, duration / 10);
    });
  }
}