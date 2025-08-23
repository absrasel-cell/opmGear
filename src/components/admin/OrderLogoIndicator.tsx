'use client';

import React, { useState, useEffect } from 'react';
import { ImageIcon, File, FileText } from 'lucide-react';

interface OrderLogoIndicatorProps {
  orderId: string;
  className?: string;
}

interface AssetSummary {
  count: number;
  hasLogos: boolean;
  hasOthers: boolean;
}

export default function OrderLogoIndicator({ orderId, className = "" }: OrderLogoIndicatorProps) {
  const [summary, setSummary] = useState<AssetSummary>({ count: 0, hasLogos: false, hasOthers: false });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAssetSummary();
  }, [orderId]);

  const fetchAssetSummary = async () => {
    try {
      const response = await fetch(`/api/order-assets?orderId=${orderId}`);
      
      if (!response.ok) {
        setSummary({ count: 0, hasLogos: false, hasOthers: false });
        return;
      }

      const assets = await response.json();
      if (!Array.isArray(assets)) {
        setSummary({ count: 0, hasLogos: false, hasOthers: false });
        return;
      }

      const hasLogos = assets.some(asset => asset.kind === 'LOGO');
      const hasOthers = assets.some(asset => asset.kind !== 'LOGO');

      setSummary({
        count: assets.length,
        hasLogos,
        hasOthers
      });
    } catch (error) {
      console.error('Error fetching asset summary:', error);
      setSummary({ count: 0, hasLogos: false, hasOthers: false });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="w-4 h-4 bg-white/10 rounded"></div>
      </div>
    );
  }

  if (summary.count === 0) {
    return (
      <div className={`text-slate-500 ${className}`} title="No assets uploaded">
        <FileText className="w-4 h-4" />
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-1 ${className}`} title={`${summary.count} asset(s) uploaded`}>
      {summary.hasLogos && (
        <ImageIcon className="w-4 h-4 text-blue-400" />
      )}
      {summary.hasOthers && (
        <File className="w-4 h-4 text-green-400" />
      )}
      <span className="text-xs text-slate-400">{summary.count}</span>
    </div>
  );
}