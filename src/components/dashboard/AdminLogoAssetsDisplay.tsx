'use client';

import React, { useState, useEffect } from 'react';
import { ordersAPI } from '@/lib/api/orders';
import { OrderAssetDTO } from '@/lib/validation/orderAssets';
import { Download, FileText, Image as ImageIcon, File, Eye, Edit2, Trash2, Copy, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface AdminLogoAssetsDisplayProps {
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

export default function AdminLogoAssetsDisplay({ orderId, className = '' }: AdminLogoAssetsDisplayProps) {
  const [assets, setAssets] = useState<OrderAssetDTO[]>([]);
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [editingPositions, setEditingPositions] = useState<Record<string, string>>({});

  const logoPositions = ['Front', 'Left', 'Right', 'Back', 'Upper Bill', 'Under Bill', 'Velcro'];

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError('');
        console.log(`🔍 [ADMIN] Loading data for order ${orderId}...`);

        // Load both assets and order data in parallel
        const [assetsData, orderResponse] = await Promise.all([
          ordersAPI.getAssets(orderId).catch(err => {
            console.warn('[ADMIN] Assets loading failed (might be empty):', err);
            return [];
          }),
          fetch(`/api/orders/${orderId}`)
        ]);

        console.log(`✅ [ADMIN] Assets loaded:`, assetsData);
        setAssets(assetsData);

        if (orderResponse.ok) {
          const responseData = await orderResponse.json();
          console.log(`✅ [ADMIN] Order loaded successfully`, responseData);
          setOrder(responseData.order);
        } else {
          console.log(`❌ [ADMIN] Order fetch failed: ${orderResponse.status} ${orderResponse.statusText}`);
        }
      } catch (err) {
        console.error('❌ [ADMIN] Error loading data:', err);
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

  const handleDeleteAsset = async (asset: OrderAssetDTO) => {
    if (!window.confirm(`Are you sure you want to delete ${asset.filename}?`)) {
      return;
    }

    try {
      await ordersAPI.deleteAsset(orderId, asset.id);
      setAssets(prev => prev.filter(a => a.id !== asset.id));
    } catch (err) {
      console.error('Error deleting asset:', err);
      setError('Failed to delete asset');
    }
  };

  const handlePositionEdit = (assetId: string, currentPosition: string) => {
    setEditingPositions(prev => ({ ...prev, [assetId]: currentPosition || '' }));
  };

  const handlePositionSave = async (assetId: string) => {
    const newPosition = editingPositions[assetId];
    // In a full implementation, you'd update the asset position via API
    console.log(`Update asset ${assetId} position to: ${newPosition}`);
    setEditingPositions(prev => {
      const updated = { ...prev };
      delete updated[assetId];
      return updated;
    });
  };

  const handleCopyAllInformation = async () => {
    const logoSetup = order?.multiSelectOptions?.['logo-setup']?.map(logoValue => {
      const selections = order?.logoSetupSelections?.[logoValue];
      return `${logoValue}: ${[
        selections?.position && `Position: ${selections.position}`,
        selections?.size && `Size: ${selections.size}`,
        selections?.application && `Application: ${selections.application}`
      ].filter(Boolean).join(', ')}`;
    }).join('\n') || '';

    const uploadedFiles = assets.map(asset => 
      `${asset.filename} (${asset.kind}) - ${asset.position || 'No position'}`
    ).join('\n');

    const content = [
      '=== ADMIN: Logo Information Summary ===',
      'Order ID: ' + orderId,
      '',
      'Logo Setup Configuration:',
      logoSetup || 'None configured',
      '',
      'Uploaded Files:',
      uploadedFiles || 'No files uploaded',
      '',
      'Additional Instructions:',
      order?.additionalInstruction || 'None'
    ].join('\n');
    
    try {
      await navigator.clipboard.writeText(content);
      alert('Complete logo information copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
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
            <span className="font-semibold">Admin - Logo Loading Error</span>
          </div>
          <p className="mb-2">{error}</p>
          <div className="text-xs text-red-300 space-y-1">
            <p>Order ID: {orderId}</p>
            <p>Admin Troubleshooting:</p>
            <ul className="list-disc list-inside ml-2 space-y-1">
              <li>Check if OrderAsset records exist in database</li>
              <li>Verify Supabase order-assets bucket permissions</li>
              <li>Test signed URL generation manually</li>
              <li>Check if files exist in storage bucket</li>
              <li>Verify order data in database</li>
            </ul>
            <p className="mt-2">💡 Check browser console for detailed error logs</p>
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
          <span>[ADMIN] No logo setup or uploaded files available</span>
        </div>
        <div className="text-xs text-gray-500 mt-2">
          Order ID: {orderId} | Check both OrderAsset table and order.logoSetupSelections
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Admin Actions Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">[ADMIN] Logo Management</h2>
        <Button
          onClick={handleCopyAllInformation}
          variant="ghost"
          size="sm"
          className="text-white/70 hover:text-white hover:bg-white/10"
        >
          <Copy className="w-4 h-4 mr-1" />
          Copy All Info
        </Button>
      </div>

      {/* Logo Setup Configuration */}
      {hasLogoSetup && (
        <Card className="p-6 bg-black/20 backdrop-blur-md border border-white/10">
          <div className="flex items-center space-x-2 mb-4">
            <Settings className="w-5 h-5 text-lime-400" />
            <h3 className="text-lg font-semibold text-white">[ADMIN] Logo Setup Configuration</h3>
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

                <div className="flex items-center justify-between mt-4">
                  <div className="text-xs text-slate-400">
                    Admin: Edit Config
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-white/50 hover:text-white"
                    title="Edit Configuration"
                  >
                    <Edit2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Uploaded Logo Files */}
      {hasUploadedFiles && (
        <Card className="p-6 bg-black/20 backdrop-blur-md border border-white/10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <ImageIcon className="w-5 h-5 text-lime-400" />
              <h3 className="text-lg font-semibold text-white">[ADMIN] Uploaded Logo Files</h3>
              <span className="text-sm text-white/50">({assets.length})</span>
            </div>
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
                      
                      {/* Position Editor */}
                      <div className="flex items-center space-x-2">
                        <span>Position:</span>
                        {editingPositions[asset.id] !== undefined ? (
                          <div className="flex items-center space-x-1">
                            <select
                              value={editingPositions[asset.id]}
                              onChange={(e) => setEditingPositions(prev => ({ ...prev, [asset.id]: e.target.value }))}
                              className="bg-black/60 border border-white/30 rounded px-2 py-1 text-xs text-white"
                            >
                              <option value="">Select Position</option>
                              {logoPositions.map(pos => (
                                <option key={pos} value={pos}>{pos}</option>
                              ))}
                            </select>
                            <Button
                              onClick={() => handlePositionSave(asset.id)}
                              size="sm"
                              className="h-6 px-2 text-xs bg-lime-600 hover:bg-lime-500"
                            >
                              Save
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-1">
                            <span className="text-lime-400">{asset.position || 'Not set'}</span>
                            <Button
                              onClick={() => handlePositionEdit(asset.id, asset.position || '')}
                              variant="ghost"
                              size="sm"
                              className="h-5 w-5 p-0 text-white/50 hover:text-white"
                            >
                              <Edit2 className="w-3 h-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                      
                      <p className="capitalize text-purple-400">{asset.kind.toLowerCase()}</p>
                      {asset.width && asset.height && (
                        <p>{asset.width} × {asset.height}px</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-4">
                  <div className="flex items-center space-x-2">
                    {asset.mimeType.startsWith('image/') && (
                      <Button
                        onClick={() => handlePreview(asset)}
                        variant="ghost"
                        size="sm"
                        className="text-white/70 hover:text-white hover:bg-white/10"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    )}
                    
                    <Button
                      onClick={() => handleDownload(asset)}
                      variant="ghost"
                      size="sm"
                      className="text-white/70 hover:text-white hover:bg-white/10"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>

                  <Button
                    onClick={() => handleDeleteAsset(asset)}
                    variant="ghost"
                    size="sm"
                    className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
                  >
                    <Trash2 className="w-4 h-4" />
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
            <h3 className="text-lg font-semibold text-white">[ADMIN] Additional Instructions</h3>
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