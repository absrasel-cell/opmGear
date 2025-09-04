'use client';

import React, { useEffect, useState } from 'react';
import { Truck } from 'lucide-react';

interface ShippingBuildData {
  buildNumber: string;
  departureDate: string;
  expectedDelivery: string;
}

export function SimpleGlassShipping() {
  const [currentBuild, setCurrentBuild] = useState<ShippingBuildData>({
    buildNumber: 'SB-2024-12',
    departureDate: 'Dec 15',
    expectedDelivery: 'Dec 22'
  });

  const fetchCurrentShippingBuild = async () => {
    try {
      const response = await fetch('/api/shipments');
      if (response.ok) {
        const { shipments } = await response.json();
        const activeShipment = shipments.find((s: any) => 
          s.status === 'PREPARING' || s.status === 'IN_TRANSIT'
        ) || shipments[0];
        
        if (activeShipment) {
          setCurrentBuild({
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
              : 'TBD'
          });
        }
      }
    } catch (error) {
      // Keep fallback data
    }
  };

  useEffect(() => {
    fetchCurrentShippingBuild();
  }, []);

  return (
    <div className="relative">
      {/* EXACT COPY of Quality Guaranteed glass styling */}
      <div className="bg-white/10 border-white/20 border rounded-2xl pt-4 pr-4 pb-4 pl-4 shadow-[0_2.8px_2.2px_rgba(0,_0,_0,_0.034),_0_6.7px_5.3px_rgba(0,_0,_0,_0.048),_0_12.5px_10px_rgba(0,_0,_0,_0.06),_0_22.3px_17.9px_rgba(0,_0,_0,_0.072),_0_41.8px_33.4px_rgba(0,_0,_0,_0.086),_0_100px_80px_rgba(0,_0,_0,_0.12)] backdrop-blur-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center bg-lime-400/30 backdrop-blur-sm border border-lime-400/20">
            <Truck className="w-5 h-5 text-lime-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white/90 font-sans">Current Shipping Build</p>
            <p className="text-xs text-white/60 font-sans">Live shipping updates</p>
          </div>
        </div>
        
        {/* Sliding text */}
        <div className="mt-3 overflow-hidden">
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

export default SimpleGlassShipping;