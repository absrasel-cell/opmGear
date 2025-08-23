'use client';

import React, { useState, useEffect } from 'react';
import { ordersAPI } from '@/lib/api/orders';
import { OrderAssetDTO } from '@/lib/validation/orderAssets';
import { Download, FileText, Image as ImageIcon, File, Eye, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface LogoAssetsDisplayProps {
  orderId: string;
  className?: string;
}

interface Order {
  id: string;
  logoSetupSelections?: Record<string, {
    position?: string;
    size?: string;
    application?: string;
  }>;
  multiSelectOptions?: {
    'logo-setup'?: string[];
  };
  additionalInstruction?: string;
}

export default function LogoAssetsDisplay({ orderId, className = '' }: LogoAssetsDisplayProps) {
  const [assets, setAssets] = useState<OrderAssetDTO[]>([]);
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError('');
        console.log(`🔍 Loading data for order ${orderId}...`);

        // Load both assets and order data in parallel
        const [assetsData, orderResponse] = await Promise.all([
          ordersAPI.getAssets(orderId).catch(err => {
            console.warn('Assets loading failed (might be empty):', err);
            return [];
          }),
          fetch(`/api/orders/${orderId}`)
        ]);

        console.log(`✅ Assets loaded:`, assetsData);
        setAssets(assetsData);

        if (orderResponse.ok) {
          const responseData = await orderResponse.json();
          console.log(`✅ Order loaded successfully`, responseData);
          setOrder(responseData.order);
        } else {
          console.log(`❌ Order fetch failed: ${orderResponse.status} ${orderResponse.statusText}`);
        }
      } catch (err) {
        console.error('❌ Error loading data:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to load data';
        setError(`Failed to load logo information: ${errorMessage}`);
      } finally {
        setLoading(false);
      }
    };

    if (orderId) {
      loadData();
    }
  }, [orderId]);

  const handleDownload = async (asset: OrderAssetDTO) => {
    if (asset.signedUrl) {
      const link = document.createElement('a');
      link.href = asset.signedUrl;
      link.download = asset.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handlePreview = (asset: OrderAssetDTO) => {
    if (asset.signedUrl && asset.mimeType.startsWith('image/')) {
      window.open(asset.signedUrl, '_blank');
    }
  };

  const getFileIcon = (asset: OrderAssetDTO) => {
    if (asset.mimeType.startsWith('image/')) {
      return <ImageIcon className="w-5 h-5 text-blue-400" />;
    }
    if (asset.mimeType === 'application/pdf') {
      return <FileText className="w-5 h-5 text-red-400" />;
    }
    return <File className="w-5 h-5 text-gray-400" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-white/10 rounded-md mb-3"></div>
          <div className="space-y-2">
            <div className="h-16 bg-white/5 rounded-lg"></div>
            <div className="h-16 bg-white/5 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`space-y-3 ${className}`}>
        <div className="text-red-400 text-sm bg-red-900/20 border border-red-800 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-lg">⚠️</span>
            <span className="font-semibold">Logo Loading Error</span>
          </div>
          <p className="mb-2">{error}</p>
          <div className="text-xs text-red-300 space-y-1">
            <p>Order ID: {orderId}</p>
            <p>💡 Check browser console for detailed error logs</p>
          </div>
        </div>
      </div>
    );
  }

  const hasLogoSetup = order?.multiSelectOptions?.['logo-setup']?.length > 0;
  const hasUploadedFiles = assets.length > 0;
  const hasAdditionalInstructions = order?.additionalInstruction && order.additionalInstruction.trim() !== '';
  const hasContent = hasLogoSetup || hasUploadedFiles || hasAdditionalInstructions;

  if (!hasContent) {
    return (
      <div className={`text-gray-400 text-sm p-4 bg-gray-800/20 rounded-lg border border-gray-700 ${className}`}>
        <div className="flex items-center space-x-2">
          <span>📁</span>
          <span>No logo setup or uploaded files available for this order</span>
        </div>
        <div className="text-xs text-gray-500 mt-2">
          Order ID: {orderId}
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Logo Setup Configuration */}
      {hasLogoSetup && (
        <Card className="p-6 bg-black/20 backdrop-blur-md border border-white/10">
          <div className="flex items-center space-x-2 mb-4">
            <Settings className="w-5 h-5 text-lime-400" />
            <h3 className="text-lg font-semibold text-white">Logo Setup Configuration</h3>
            <span className="text-sm text-white/50">({order?.multiSelectOptions?.['logo-setup']?.length || 0})</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {order?.multiSelectOptions?.['logo-setup']?.map((logoValue, index) => (
              <div key={index} className="bg-black/30 rounded-lg p-4 border border-white/10">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <Settings className="w-5 h-5 text-orange-400" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium mb-2">
                      {logoValue}
                    </p>
                    
                    {order?.logoSetupSelections?.[logoValue] && (
                      <div className="text-xs text-white/50 space-y-1">
                        {order.logoSetupSelections[logoValue].position && (
                          <p className="text-lime-400">Position: {order.logoSetupSelections[logoValue].position}</p>
                        )}
                        {order.logoSetupSelections[logoValue].size && (
                          <p className="text-cyan-400">Size: {order.logoSetupSelections[logoValue].size}</p>
                        )}
                        {order.logoSetupSelections[logoValue].application && (
                          <p className="text-orange-400">Application: {order.logoSetupSelections[logoValue].application}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Uploaded Logo Files */}
      {hasUploadedFiles && (
        <Card className="p-6 bg-black/20 backdrop-blur-md border border-white/10">
          <div className="flex items-center space-x-2 mb-4">
            <ImageIcon className="w-5 h-5 text-lime-400" />
            <h3 className="text-lg font-semibold text-white">Uploaded Logo Files</h3>
            <span className="text-sm text-white/50">({assets.length})</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {assets.map((asset) => (
              <div key={asset.id} className="bg-black/30 rounded-lg p-4 border border-white/10">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    {getFileIcon(asset)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate" title={asset.filename}>
                      {asset.filename}
                    </p>
                    
                    <div className="text-xs text-white/50 space-y-1">
                      <p>{formatFileSize(asset.sizeBytes)}</p>
                      {asset.position && (
                        <p className="text-lime-400">Position: {asset.position}</p>
                      )}
                      <p className="capitalize text-purple-400">{asset.kind.toLowerCase()}</p>
                      {asset.width && asset.height && (
                        <p>{asset.width} × {asset.height}px</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 mt-4">
                  {asset.mimeType.startsWith('image/') && (
                    <Button
                      onClick={() => handlePreview(asset)}
                      variant="ghost"
                      size="sm"
                      className="text-white/70 hover:text-white hover:bg-white/10"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Preview
                    </Button>
                  )}
                  
                  <Button
                    onClick={() => handleDownload(asset)}
                    variant="ghost"
                    size="sm"
                    className="text-white/70 hover:text-white hover:bg-white/10"
                  >
                    <Download className="w-4 h-4 mr-1" />
                    Download
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Additional Instructions */}
      {hasAdditionalInstructions && (
        <Card className="p-6 bg-black/20 backdrop-blur-md border border-white/10">
          <div className="flex items-center space-x-2 mb-4">
            <FileText className="w-5 h-5 text-orange-400" />
            <h3 className="text-lg font-semibold text-white">Additional Instructions</h3>
          </div>
          
          <div className="bg-black/30 rounded-lg p-4 border border-white/10">
            <p className="text-white/90 text-sm whitespace-pre-wrap">
              {order?.additionalInstruction}
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}