'use client';

import React, { useEffect, useState } from 'react';
import { Truck } from 'lucide-react';

interface ShippingBuildData {
  buildNumber: string;
  departureDate: string;
  expectedDelivery: string;
  status: 'open' | 'closing-soon' | 'closed';
}

interface ForceGlassShippingNotificationProps {
  className?: string;
}

export function ForceGlassShippingNotification({ className = '' }: ForceGlassShippingNotificationProps) {
  const [currentBuild, setCurrentBuild] = useState<ShippingBuildData>({
    buildNumber: 'SB-2024-12',
    departureDate: 'Dec 15',
    expectedDelivery: 'Dec 22',
    status: 'open'
  });

  const fetchCurrentShippingBuild = async (): Promise<ShippingBuildData | null> => {
    try {
      const response = await fetch('/api/shipments');
      if (!response.ok) throw new Error('Failed to fetch shipments');
      
      const { shipments } = await response.json();
      
      const activeShipment = shipments.find((s: any) => 
        s.status === 'PREPARING' || s.status === 'IN_TRANSIT'
      ) || shipments[0];
      
      if (!activeShipment) throw new Error('No shipments found');
      
      return {
        buildNumber: activeShipment.buildNumber,
        departureDate: activeShipment.estimatedDeparture 
          ? new Date(activeShipment.estimatedDeparture).toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric'
            })
          : 'TBD',
        expectedDelivery: activeShipment.estimatedDelivery
          ? new Date(activeShipment.estimatedDelivery).toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric'
            })
          : 'TBD',
        status: activeShipment.status === 'PREPARING' ? 'open' : 'closing-soon'
      };
    } catch (error) {
      console.error('Error fetching shipping build:', error);
      // Return fallback data so glass notification always shows
      return {
        buildNumber: 'SB-2024-12',
        departureDate: 'Dec 15',
        expectedDelivery: 'Dec 22',
        status: 'open' as const
      };
    }
  };

  useEffect(() => {
    fetchCurrentShippingBuild().then(build => {
      if (build) setCurrentBuild(build);
    });
  }, []);

  return (
    <div className={className}>
      {/* Using EXACT same glass morphism approach as "Quality Guaranteed" block */}
      <div 
        style={{
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: '16px',
          padding: '16px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
          position: 'relative',
          zIndex: 1
        }}
        className="glass-container">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full flex items-center justify-center bg-lime-500/30 backdrop-blur-sm border border-lime-400/20">
            <Truck size={20} className="text-lime-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white/90">Current Shipping Build</p>
            <p className="text-xs text-white/60">Next departure scheduled</p>
          </div>
        </div>

        {/* Scrolling text */}
        <div className="bg-white/5 rounded-lg p-2 overflow-hidden relative">
          <div
            className="text-slate-300 whitespace-nowrap text-sm animate-scroll-left"
            onMouseEnter={(e) => {
              e.currentTarget.style.animationPlayState = 'paused';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.animationPlayState = 'running';
            }}
          >
            🚚 Build <span className="text-orange-400 font-medium">{currentBuild.buildNumber}</span> departs <span className="text-cyan-400 font-bold">{currentBuild.departureDate}</span>, arrives <span className="text-lime-400 font-medium">{currentBuild.expectedDelivery}</span> • Order now to secure your spot! ✨
          </div>
        </div>
      </div>
      
      <style jsx>{`
        .glass-container {
          backdrop-filter: blur(20px) !important;
          -webkit-backdrop-filter: blur(20px) !important;
          background: rgba(255, 255, 255, 0.05) !important;
        }
        
        .animate-scroll-left {
          animation: scroll-left 45s linear infinite;
        }
        @keyframes scroll-left {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
      `}</style>
    </div>
  );
}

export default ForceGlassShippingNotification;