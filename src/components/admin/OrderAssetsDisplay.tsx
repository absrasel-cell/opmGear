'use client';

import React, { useState, useEffect } from 'react';
import { OrderAssetDTO } from '@/lib/validation/orderAssets';
import { Image as ImageIcon, Download, Eye, FileText, Package } from 'lucide-react';

interface OrderAssetsDisplayProps {
  orderId: string;
  showTitle?: boolean;
  maxItems?: number;
  showDownloadButton?: boolean;
  className?: string;
}

export default function OrderAssetsDisplay({ 
  orderId, 
  showTitle = true, 
  maxItems,
  showDownloadButton = true,
  className = ""
}: OrderAssetsDisplayProps) {
  const [assets, setAssets] = useState<OrderAssetDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchOrderAssets();
  }, [orderId]);

  const fetchOrderAssets = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/order-assets?orderId=${orderId}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          setAssets([]);
          return;
        }
        throw new Error(`Failed to fetch assets: ${response.status}`);
      }

      const data = await response.json();
      setAssets(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching order assets:', error);
      setError(error instanceof Error ? error.message : 'Failed to load assets');
      setAssets([]);
    } finally {
      setLoading(false);
    }
  };

  const getAssetIcon = (mimeType: string, kind: string) => {
    if (mimeType.startsWith('image/')) {
      return <ImageIcon className="w-4 h-4" />;
    }
    if (mimeType === 'application/pdf') {
      return <FileText className="w-4 h-4" />;
    }
    if (kind === 'ACCESSORY') {
      return <Package className="w-4 h-4" />;
    }
    return <FileText className="w-4 h-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getKindBadgeColor = (kind: string) => {
    switch (kind) {
      case 'LOGO':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'ACCESSORY':
        return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'OTHER':
        return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
      default:
        return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  if (loading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-4 bg-white/10 rounded w-32 mb-3"></div>
        <div className="space-y-2">
          <div className="h-16 bg-white/5 rounded-lg"></div>
          <div className="h-16 bg-white/5 rounded-lg"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`text-red-400 text-sm ${className}`}>
        <div className="flex items-center gap-2">
          <span>⚠️</span>
          <span>Failed to load assets: {error}</span>
        </div>
      </div>
    );
  }

  if (assets.length === 0) {
    return (
      <div className={`text-slate-400 text-sm ${className}`}>
        <div className="flex items-center gap-2">
          <ImageIcon className="w-4 h-4" />
          <span>No assets uploaded for this order</span>
        </div>
      </div>
    );
  }

  const displayAssets = maxItems ? assets.slice(0, maxItems) : assets;

  return (
    <div className={className}>
      {showTitle && (
        <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-blue-400" />
          Order Assets ({assets.length})
        </h4>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {displayAssets.map((asset) => (
          <div key={asset.id} className="border border-white/10 rounded-lg p-3 bg-white/5 hover:bg-white/10 transition-all duration-200">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-blue-100/20 rounded flex items-center justify-center flex-shrink-0 text-blue-400">
                {getAssetIcon(asset.mimeType, asset.kind)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-white text-sm truncate mb-1" title={asset.filename}>
                  {asset.filename}
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-2 py-1 text-xs rounded border ${getKindBadgeColor(asset.kind)}`}>
                    {asset.kind}
                  </span>
                  {asset.position && (
                    <span className="px-2 py-1 text-xs rounded border bg-purple-500/20 text-purple-300 border-purple-500/30">
                      {asset.position}
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-400 space-y-1">
                  <div>Size: {formatFileSize(asset.sizeBytes)}</div>
                  {asset.width && asset.height && (
                    <div>Dimensions: {asset.width}×{asset.height}px</div>
                  )}
                  <div>Uploaded: {new Date(asset.uploadedAt).toLocaleDateString()}</div>
                </div>
              </div>
            </div>
            
            {asset.signedUrl && (
              <div className="mt-3 flex gap-2">
                {asset.mimeType.startsWith('image/') && (
                  <a
                    href={asset.signedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 px-3 py-2 rounded text-xs font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <Eye className="w-3 h-3" />
                    View
                  </a>
                )}
                {showDownloadButton && (
                  <a
                    href={asset.signedUrl}
                    download={asset.filename}
                    className="flex-1 bg-green-600/20 hover:bg-green-600/30 text-green-300 px-3 py-2 rounded text-xs font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <Download className="w-3 h-3" />
                    Download
                  </a>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
      
      {maxItems && assets.length > maxItems && (
        <div className="mt-3 text-xs text-slate-400 text-center">
          Showing {maxItems} of {assets.length} assets
        </div>
      )}
    </div>
  );
}