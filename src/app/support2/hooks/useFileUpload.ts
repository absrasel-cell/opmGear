import { useState, useCallback } from 'react';

export interface UploadedFile {
  id: string;
  file: File;
  preview?: string;
  status: 'pending' | 'uploading' | 'uploaded' | 'error';
  url?: string;
  error?: string;
}

export interface FileValidationError {
  file: File;
  error: string;
}

export const useFileUpload = () => {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<FileValidationError[]>([]);

  const validateFile = (file: File): { isValid: boolean; error?: string } => {
    // Validate file type - support images, PDFs, and common document types
    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
      'application/pdf', 'application/illustrator', 'application/postscript', 
      'image/eps', 'text/plain'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      return {
        isValid: false,
        error: `${file.name} is not a supported file type. Supported formats: PNG, JPG, GIF, WEBP, SVG, PDF, AI, EPS, TXT`
      };
    }
    
    // Validate file size - 10MB limit
    if (file.size > 10 * 1024 * 1024) {
      return {
        isValid: false,
        error: `${file.name} is too large. Maximum size is 10MB`
      };
    }
    
    return { isValid: true };
  };

  const addFiles = useCallback((files: File[]) => {
    const validFiles: File[] = [];
    const errors: FileValidationError[] = [];

    // Validate each file
    files.forEach(file => {
      const validation = validateFile(file);
      if (validation.isValid) {
        validFiles.push(file);
      } else {
        errors.push({
          file,
          error: validation.error!
        });
      }
    });

    // Update validation errors state
    setValidationErrors(errors);

    // Show alerts for invalid files (matching main support page behavior)
    errors.forEach(error => {
      alert(error.error);
    });

    // Only add valid files
    const newFiles: UploadedFile[] = validFiles.map(file => ({
      id: `${Date.now()}-${Math.random()}`,
      file,
      status: 'pending',
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined
    }));

    setUploadedFiles(prev => [...prev, ...newFiles]);
    return newFiles;
  }, []);

  const removeFile = useCallback((fileId: string) => {
    setUploadedFiles(prev => {
      const fileToRemove = prev.find(f => f.id === fileId);
      if (fileToRemove?.preview) {
        URL.revokeObjectURL(fileToRemove.preview);
      }
      return prev.filter(f => f.id !== fileId);
    });
  }, []);

  const uploadFiles = useCallback(async (files: UploadedFile[]) => {
    if (files.length === 0) return [];

    setIsUploading(true);
    const uploadedUrls: string[] = [];

    try {
      for (const fileData of files) {
        setUploadedFiles(prev => 
          prev.map(f => f.id === fileData.id ? { ...f, status: 'uploading' } : f)
        );

        const formData = new FormData();
        formData.append('file', fileData.file);

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        });

        if (response.ok) {
          const data = await response.json();
          const uploadedUrl = data.url || data.filePath;
          uploadedUrls.push(uploadedUrl);

          setUploadedFiles(prev => 
            prev.map(f => f.id === fileData.id ? { 
              ...f, 
              status: 'uploaded', 
              url: uploadedUrl 
            } : f)
          );
        } else {
          const errorMessage = `Failed to upload ${fileData.file.name}`;
          console.error(errorMessage, response.status, response.statusText);
          
          setUploadedFiles(prev => 
            prev.map(f => f.id === fileData.id ? { 
              ...f, 
              status: 'error',
              error: errorMessage
            } : f)
          );
        }
      }
    } catch (error) {
      console.error('Error uploading files:', error);
      files.forEach(fileData => {
        const errorMessage = `Network error uploading ${fileData.file.name}`;
        setUploadedFiles(prev => 
          prev.map(f => f.id === fileData.id ? { 
            ...f, 
            status: 'error',
            error: errorMessage
          } : f)
        );
      });
    } finally {
      setIsUploading(false);
    }

    return uploadedUrls;
  }, []);

  const clearFiles = useCallback(() => {
    uploadedFiles.forEach(file => {
      if (file.preview) {
        URL.revokeObjectURL(file.preview);
      }
    });
    setUploadedFiles([]);
  }, [uploadedFiles]);

  const getUploadedFiles = useCallback(() => {
    return uploadedFiles.filter(f => f.status === 'uploaded');
  }, [uploadedFiles]);

  const getPendingFiles = useCallback(() => {
    return uploadedFiles.filter(f => f.status === 'pending');
  }, [uploadedFiles]);

  const clearValidationErrors = useCallback(() => {
    setValidationErrors([]);
  }, []);

  return {
    uploadedFiles,
    isUploading,
    validationErrors,
    addFiles,
    removeFile,
    uploadFiles,
    clearFiles,
    clearValidationErrors,
    getUploadedFiles,
    getPendingFiles
  };
};