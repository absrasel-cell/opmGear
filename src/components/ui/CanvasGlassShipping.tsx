'use client';

import React, { useEffect, useState } from 'react';
import { Truck } from 'lucide-react';

interface ShippingBuildData {
  buildNumber: string;
  departureDate: string;
  expectedDelivery: string;
}

export function CanvasGlassShipping() {
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
    <section className="w-full">
      {/* Glass container using article element - full width */}
      <article 
        className="w-full rounded-2xl border border-white/30 p-4"
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.08)',
          backdropFilter: 'blur(25px) saturate(180%)',
          WebkitBackdropFilter: 'blur(25px) saturate(180%)',
          boxShadow: `
            0 2.8px 2.2px rgba(0, 0, 0, 0.034),
            0 6.7px 5.3px rgba(0, 0, 0, 0.048),
            0 12.5px 10px rgba(0, 0, 0, 0.06),
            0 22.3px 17.9px rgba(0, 0, 0, 0.072),
            0 41.8px 33.4px rgba(0, 0, 0, 0.086),
            0 100px 80px rgba(0, 0, 0, 0.12),
            inset 0 1px 0 rgba(255, 255, 255, 0.2)
          `
        }}
      >
        {/* Header using header element */}
        <header className="flex items-center gap-3 mb-4">
          <figure className="w-10 h-10 rounded-full flex items-center justify-center bg-lime-400/30 backdrop-blur-sm border border-lime-400/20">
            <Truck className="w-5 h-5 text-lime-400" />
          </figure>
          <hgroup>
            <h3 className="text-sm font-semibold text-white/90 font-sans">Current Shipping Build</h3>
            <p className="text-xs text-white/60 font-sans">Live shipping updates</p>
          </hgroup>
        </header>

        {/* Scrolling content using main element */}
        <main className="overflow-hidden rounded-lg bg-black/10 p-2">
          <marquee 
            behavior="scroll" 
            direction="left" 
            scrollamount="4"
            className="text-slate-300 text-sm"
            onMouseEnter={(e) => e.currentTarget.stop()}
            onMouseLeave={(e) => e.currentTarget.start()}
          >
            🚚 Build <span className="text-orange-400 font-medium">{currentBuild.buildNumber}</span> departs <span className="text-cyan-400 font-bold">{currentBuild.departureDate}</span>, arrives <span className="text-lime-400 font-medium">{currentBuild.expectedDelivery}</span> • Order now to secure your spot! ✨
          </marquee>
        </main>
      </article>
    </section>
  );
}

export default CanvasGlassShipping;