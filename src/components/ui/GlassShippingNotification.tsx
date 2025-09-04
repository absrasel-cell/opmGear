'use client';

import React, { useEffect, useState } from 'react';
import { Truck } from 'lucide-react';

interface ShippingBuildData {
  buildNumber: string;
  departureDate: string;
  expectedDelivery: string;
  status: 'open' | 'closing-soon' | 'closed';
}

interface GlassShippingNotificationProps {
  className?: string;
}

export function GlassShippingNotification({ className = '' }: GlassShippingNotificationProps) {
  const [currentBuild, setCurrentBuild] = useState<ShippingBuildData>();

  const fetchCurrentShippingBuild = async (): Promise<ShippingBuildData | null> => {
    try {
      const response = await fetch('/api/shipments');
      if (!response.ok) throw new Error('Failed to fetch shipments');
      
      const { shipments } = await response.json();
      
      // Find the most recent active shipment
      const activeShipment = shipments.find((s: any) => 
        s.status === 'PREPARING' || s.status === 'IN_TRANSIT'
      ) || shipments[0];
      
      if (!activeShipment) return null;
      
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
      return null;
    }
  };

  useEffect(() => {
    fetchCurrentShippingBuild().then(build => {
      if (build) setCurrentBuild(build);
    });
  }, []);

  if (!currentBuild) return null;

  return (
    <div className={`relative ${className}`}>
      {/* Main shipping notification container with glass effect */}
      <div 
        className="bg-white/10 border-white/20 border rounded-2xl pt-4 pr-4 pb-4 pl-4 shadow-[0_2.8px_2.2px_rgba(0,_0,_0,_0.034),_0_6.7px_5.3px_rgba(0,_0,_0,_0.048),_0_12.5px_10px_rgba(0,_0,_0,_0.06),_0_22.3px_17.9px_rgba(0,_0,_0,_0.072),_0_41.8px_33.4px_rgba(0,_0,_0,_0.086),_0_100px_80px_rgba(0,_0,_0,_0.12)] backdrop-blur-lg"
        style={{
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          background: 'rgba(255, 255, 255, 0.1)',
          border: '1px solid rgba(255, 255, 255, 0.2)'
        }}>
        
        {/* Header section - identical to Quality Guaranteed */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full flex items-center justify-center bg-lime-400/30 backdrop-blur-sm border border-lime-400/20">
            <Truck className="w-5 h-5 text-lime-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white/90 font-sans">Current Shipping Build</p>
            <p className="text-xs text-white/60 font-sans">Next departure scheduled</p>
          </div>
        </div>

        {/* Scrolling notification text */}
        <div className="relative overflow-hidden rounded-lg bg-white/5 p-2">
          <div
            className="text-slate-200 whitespace-nowrap animate-scroll-left text-sm"
            onMouseEnter={(e) => {
              (e.target as HTMLElement).style.animationPlayState = 'paused';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLElement).style.animationPlayState = 'running';
            }}
          >
            🚚 Build <span className="text-orange-400 font-medium">{currentBuild.buildNumber}</span> departs <span className="text-cyan-400 font-bold sparkle-text">{currentBuild.departureDate}</span>, arrives <span className="text-lime-400 font-medium">{currentBuild.expectedDelivery}</span> • Order now to secure your spot! ✨
          </div>
        </div>
      </div>
      
      <style jsx>{`
        @keyframes scroll-left {
          0% {
            transform: translateX(100%);
          }
          100% {
            transform: translateX(-100%);
          }
        }
        
        @keyframes sparkle {
          0%, 100% {
            text-shadow: 
              0 0 5px #00f5ff,
              0 0 10px #00f5ff,
              0 0 15px #00f5ff,
              0 0 20px #00f5ff;
          }
          25% {
            text-shadow: 
              0 0 2px #00f5ff,
              0 0 8px #00f5ff,
              0 0 12px #00f5ff,
              0 0 18px #00f5ff,
              2px 2px 4px rgba(0, 245, 255, 0.3);
          }
          50% {
            text-shadow: 
              0 0 8px #00f5ff,
              0 0 15px #00f5ff,
              0 0 25px #00f5ff,
              0 0 35px #00f5ff,
              -2px -2px 6px rgba(0, 245, 255, 0.4);
          }
          75% {
            text-shadow: 
              0 0 3px #00f5ff,
              0 0 10px #00f5ff,
              0 0 18px #00f5ff,
              0 0 28px #00f5ff,
              1px 1px 5px rgba(0, 245, 255, 0.2);
          }
        }
        
        .sparkle-text {
          animation: sparkle 2s ease-in-out infinite;
          text-shadow: 
            0 0 5px #00f5ff,
            0 0 10px #00f5ff,
            0 0 15px #00f5ff;
        }

        .animate-scroll-left {
          animation: scroll-left 45s linear infinite;
        }
      `}</style>
    </div>
  );
}

export default GlassShippingNotification;