'use client';

import { useState, useRef } from 'react';
import { 
  DocumentArrowUpIcon,
  DocumentIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

interface ArtworkAnalysis {
  id: string;
  timestamp: Date;
  capSpec: any;
  assets: any[];
  accessories: any[];
  processingStatus: 'success' | 'partial' | 'error';
  confidence: number;
  capCraftFormat?: any;
}

interface UploadArtworkComponentProps {
  onAnalysisComplete?: (analysis: ArtworkAnalysis) => void;
  onGenerateQuote?: (analysis: ArtworkAnalysis) => void;
  userId?: string;
  sessionId?: string;
}

export default function UploadArtworkComponent({ 
  onAnalysisComplete, 
  onGenerateQuote,
  userId,
  sessionId 
}: UploadArtworkComponentProps) {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<ArtworkAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    
    if (!file) return;

    // Validate file type - accept all image types and PDFs
    const acceptedTypes = [
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
      'image/bmp',
      'image/tiff',
      'application/pdf'
    ];
    
    if (!acceptedTypes.includes(file.type)) {
      setError('Please select an image file (JPG, PNG, GIF, WEBP, SVG, BMP, TIFF) or PDF');
      return;
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      return;
    }

    setError(null);
    setUploadedFile(file);
    
    // Create preview URL for image or PDF
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleRemoveFile = () => {
    setUploadedFile(null);
    setPreviewUrl(null);
    setAnalysis(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const analyzeArtwork = async () => {
    if (!uploadedFile) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('artwork', uploadedFile);
      if (userId) formData.append('userId', userId);
      if (sessionId) formData.append('sessionId', sessionId);

      const response = await fetch('/api/support/artwork-analysis', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Artwork analysis failed');
      }

      const result = await response.json();
      const analysisResult = result.analysis;
      
      setAnalysis(analysisResult);
      onAnalysisComplete?.(analysisResult);

    } catch (error) {
      console.error('Artwork analysis error:', error);
      setError(error instanceof Error ? error.message : 'Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleGenerateQuote = () => {
    if (analysis) {
      onGenerateQuote?.(analysis);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const getStatusColor = () => {
    if (error) return 'border-red-400/30 bg-red-400/5';
    if (analysis) {
      if (analysis.processingStatus === 'success') return 'border-green-400/30 bg-green-400/5';
      if (analysis.processingStatus === 'partial') return 'border-yellow-400/30 bg-yellow-400/5';
      if (analysis.processingStatus === 'error') return 'border-red-400/30 bg-red-400/5';
    }
    return 'border-white/10 bg-white/5';
  };

  const getStatusIcon = () => {
    if (error) return <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />;
    if (analysis) {
      if (analysis.processingStatus === 'success') return <CheckCircleIcon className="h-5 w-5 text-green-400" />;
      if (analysis.processingStatus === 'partial') return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />;
      if (analysis.processingStatus === 'error') return <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />;
    }
    return <DocumentArrowUpIcon className="h-5 w-5 text-white/60" />;
  };

  return (
    <section className={`rounded-2xl border p-4 backdrop-blur-md transition-all duration-300 ${getStatusColor()}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <h3 className="text-sm font-medium tracking-tight text-white/90">
            Upload Artwork
          </h3>
        </div>
        {uploadedFile && (
          <button
            onClick={handleRemoveFile}
            className="p-1 rounded-full hover:bg-white/10 transition-colors"
            title="Remove file"
          >
            <XMarkIcon className="h-4 w-4 text-white/60" />
          </button>
        )}
      </div>

      {/* File Upload Area */}
      <div className="space-y-4">
        {!uploadedFile ? (
          <div
            onClick={handleUploadClick}
            className="border-2 border-dashed border-white/20 rounded-xl p-8 text-center cursor-pointer hover:border-white/30 hover:bg-white/5 transition-all duration-200 min-h-[120px] flex flex-col justify-center"
          >
            <DocumentArrowUpIcon className="h-10 w-10 mx-auto text-white/40 mb-3" />
            <p className="text-sm text-white/70 mb-1">
              Click to upload artwork file
            </p>
            <p className="text-xs text-white/50">
              Images (JPG, PNG, GIF, WEBP, SVG) or PDF, max 10MB
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf,.eps,.ai"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        ) : (
          <div className="space-y-3">
            {/* File Preview */}
            <div className="border border-white/10 rounded-lg p-3">
              <div className="flex items-center gap-3">
                <DocumentIcon className="h-8 w-8 text-blue-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white/90 truncate">
                    {uploadedFile.name}
                  </p>
                  <p className="text-xs text-white/50">
                    {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB • {uploadedFile.type}
                  </p>
                </div>
              </div>

              {/* File Preview */}
              {previewUrl && (
                <div className="mt-3">
                  <div className="h-48 bg-black/20 rounded border border-white/10 overflow-hidden">
                    {uploadedFile.type.startsWith('image/') ? (
                      <img
                        src={previewUrl}
                        alt="Artwork preview"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <embed
                        src={previewUrl}
                        type={uploadedFile.type}
                        width="100%"
                        height="100%"
                        className="border-0"
                      />
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Analysis Results */}
            {analysis && (
              <div className="border border-white/10 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <SparklesIcon className="h-4 w-4 text-purple-400" />
                  <span className="text-xs font-medium text-white/80">
                    Artwork Analysis Complete
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-white/60">Cap Style:</span>
                    <p className="text-white/90">{analysis.capSpec.shape}</p>
                  </div>
                  <div>
                    <span className="text-white/60">Fabric:</span>
                    <p className="text-white/90">{analysis.capSpec.fabric}</p>
                  </div>
                  <div>
                    <span className="text-white/60">Assets:</span>
                    <p className="text-white/90">{analysis.assets.length} logos</p>
                  </div>
                  <div>
                    <span className="text-white/60">Accessories:</span>
                    <p className="text-white/90">{analysis.accessories.length} items</p>
                  </div>
                </div>

                <div className="text-xs text-white/60">
                  Confidence: {Math.round(analysis.confidence * 100)}%
                </div>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="border border-red-400/30 bg-red-400/10 rounded-lg p-3">
                <p className="text-xs text-red-300">{error}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2">
              {!analysis && !isAnalyzing && (
                <button
                  onClick={analyzeArtwork}
                  className="flex-1 px-3 py-2 text-xs font-medium bg-purple-500/20 text-purple-300 border border-purple-400/30 rounded-lg hover:bg-purple-500/30 transition-colors"
                >
                  Analyze Artwork
                </button>
              )}

              {isAnalyzing && (
                <div className="flex-1 px-3 py-2 text-xs font-medium bg-purple-500/10 text-purple-400/80 border border-purple-400/20 rounded-lg text-center">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-3 h-3 border border-purple-400/40 border-t-transparent rounded-full animate-spin"></div>
                    Analyzing...
                  </div>
                </div>
              )}

              {analysis && !error && (
                <button
                  onClick={handleGenerateQuote}
                  className="flex-1 px-3 py-2 text-xs font-medium bg-orange-500/20 text-orange-300 border border-orange-400/30 rounded-lg hover:bg-orange-500/30 transition-colors"
                >
                  Generate Quote
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}