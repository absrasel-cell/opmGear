'use client';

import React, { useEffect, useState } from 'react';
import { Truck, Clock, Package } from 'lucide-react';

interface ShippingBuildData {
  buildNumber: string;
  departureDate: string;
  expectedDelivery: string;
  status: 'open' | 'closing-soon' | 'closed';
  spotsRemaining?: number;
}

interface ShippingNotificationProps {
  className?: string;
  autoHide?: boolean;
  hideDelay?: number;
}

export function ShippingNotification({ 
  className = '',
  autoHide = false,
  hideDelay = 8000
}: ShippingNotificationProps) {
  const [isVisible, setIsVisible] = useState(true);
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
              day: 'numeric',
              year: 'numeric'
            })
          : 'TBD',
        expectedDelivery: activeShipment.estimatedDelivery
          ? new Date(activeShipment.estimatedDelivery).toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric',
              year: 'numeric'
            })
          : 'TBD',
        status: activeShipment.status === 'PREPARING' ? 'open' : 'closing-soon',
        spotsRemaining: activeShipment.orders?.length ? Math.max(0, 200 - activeShipment.orders.length) : 147
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

  useEffect(() => {
    if (autoHide && hideDelay > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, hideDelay);
      return () => clearTimeout(timer);
    }
  }, [autoHide, hideDelay]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'text-lime-400';
      case 'closing-soon': return 'text-orange-400'; 
      case 'closed': return 'text-slate-400';
      default: return 'text-lime-400';
    }
  };

  const getStatusMessage = (build: ShippingBuildData) => {
    const urgencyText = build.status === 'closing-soon' 
      ? ' 🔥 Closing Soon!' 
      : build.status === 'open' 
        ? ' ✨ Order Now!' 
        : ' ⚠️ Build Closed';

    // Create formatted message with color spans
    return {
      text: `📦 Shipping Build ${build.buildNumber} | Departing ${build.departureDate} | Expected Delivery ${build.expectedDelivery}${build.spotsRemaining ? ` | ${build.spotsRemaining} spots remaining` : ''}${urgencyText}`,
      buildNumber: build.buildNumber,
      departureDate: build.departureDate,
      expectedDelivery: build.expectedDelivery,
      spotsRemaining: build.spotsRemaining,
      urgencyText
    };
  };

  if (!isVisible || !currentBuild) return null;

  return (
    <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-r from-lime-400/10 via-orange-400/10 to-purple-500/10 border border-white/10 backdrop-blur-xl ${className}`}>
      {/* Header */}
      <div className="px-4 py-2 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Truck className="w-4.5 h-4.5 text-lime-400" />
          <span className="text-sm font-medium text-white">Current Shipping Build</span>
        </div>
        <button 
          onClick={() => setIsVisible(false)}
          className="text-slate-400 hover:text-white transition-colors"
          aria-label="Close notification"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>

      {/* Scrolling Content */}
      <div className="p-2">
        <div
          className="text-slate-300 whitespace-nowrap overflow-hidden animate-scroll-left"
          onMouseEnter={(e) => {
            (e.target as HTMLElement).style.animationPlayState = 'paused';
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLElement).style.animationPlayState = 'running';
          }}
        >
          📦 Shipping Build <span className="text-orange-400 font-medium">{currentBuild.buildNumber}</span> | Departing <span className="text-cyan-400 font-bold sparkle-text">{currentBuild.departureDate}</span> | Expected Delivery <span className="text-lime-400 font-medium">{currentBuild.expectedDelivery}</span>{currentBuild.spotsRemaining ? ` | ${currentBuild.spotsRemaining} spots remaining` : ''} ✨ Order Now!
        </div>
      </div>

      {/* Quick Action Buttons */}
      <div className="px-4 py-2 border-t border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Clock className="w-3.5 h-3.5" />
          <span>Don't miss out - limited capacity!</span>
        </div>
        <div className="flex items-center gap-2">
          <a 
            href="/store" 
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-lime-400 text-black rounded-lg font-medium hover:bg-lime-300 transition-colors"
          >
            <Package className="w-3.5 h-3.5" />
            Order Now
          </a>
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
      `}</style>
    </div>
  );
}

// Variant for minimal display (just the scrolling text)
export function MinimalShippingNotification({ className = '' }: { className?: string }) {
  const [currentBuild, setCurrentBuild] = useState<ShippingBuildData>();

  const fetchCurrentShippingBuild = async (): Promise<ShippingBuildData | null> => {
    try {
      const response = await fetch('/api/shipments');
      if (!response.ok) throw new Error('Failed to fetch shipments');
      
      const { shipments } = await response.json();
      
      // Find the most recent active shipment
      const activeShipment = shipments.find((s: any) => 
        s.status === 'PREPARING' || s.status === 'IN_TRANSIT'
      ) || shipments[0]; // Fallback to most recent
      
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

  const getMessage = () => {
    return (
      <>
        🚚 Next Shipping: Build <span className="text-orange-400 font-medium">{currentBuild.buildNumber}</span> departs <span className="text-cyan-400 font-bold sparkle-text">{currentBuild.departureDate}</span>, arrives by <span className="text-lime-400 font-medium">{currentBuild.expectedDelivery}</span> • Order now to secure your spot! ✨
      </>
    );
  };

  return (
    <div className={`bg-white/10 border-white/20 border rounded-2xl pt-4 pr-4 pb-4 pl-4 shadow-[0_2.8px_2.2px_rgba(0,_0,_0,_0.034),_0_6.7px_5.3px_rgba(0,_0,_0,_0.048),_0_12.5px_10px_rgba(0,_0,_0,_0.06),_0_22.3px_17.9px_rgba(0,_0,_0,_0.072),_0_41.8px_33.4px_rgba(0,_0,_0,_0.086),_0_100px_80px_rgba(0,_0,_0,_0.12)] backdrop-blur-lg overflow-hidden ${className}`} 
        style={{
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)'
        }}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full flex items-center justify-center bg-lime-400/30 backdrop-blur-sm border border-lime-400/20">
          <Truck className="w-5 h-5 text-lime-400" />
        </div>
        <div>
          <p className="text-sm font-semibold text-white/90 font-sans">Current Shipping Build</p>
          <p className="text-xs text-white/60 font-sans">Live shipping updates</p>
        </div>
      </div>
      <div className="overflow-hidden mt-3">
        <div
          className="text-slate-300 whitespace-nowrap animate-scroll-left"
          onMouseEnter={(e) => {
            (e.target as HTMLElement).style.animationPlayState = 'paused';
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLElement).style.animationPlayState = 'running';
          }}
        >
          {getMessage()}
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
      `}</style>
    </div>
  );
}

// Personalized shipping notification for member dashboard
export function PersonalizedShippingNotification({ 
  orders, 
  className = '' 
}: { 
  orders: Array<{
    id: string;
    productName: string;
    status: string;
    createdAt: string;
  }>; 
  className?: string 
}) {
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
              day: 'numeric',
              year: 'numeric'
            })
          : 'TBD',
        expectedDelivery: activeShipment.estimatedDelivery
          ? new Date(activeShipment.estimatedDelivery).toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric',
              year: 'numeric'
            })
          : 'TBD',
        status: activeShipment.status === 'PREPARING' ? 'open' : 'closing-soon',
        spotsRemaining: activeShipment.orders?.length ? Math.max(0, 200 - activeShipment.orders.length) : 147
      };
    } catch (error) {
      console.error('Error fetching shipping build:', error);
      return null;
    }
  };

  const generateBuildNumber = (order: { status: string; createdAt: string }): string | null => {
    if (['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'].includes(order.status)) {
      const orderDate = new Date(order.createdAt);
      const year = orderDate.getFullYear();
      const month = String(orderDate.getMonth() + 1).padStart(2, '0');
      return `SB-${year}-${month}`;
    }
    return null;
  };

  useEffect(() => {
    fetchCurrentShippingBuild().then(build => {
      if (build) setCurrentBuild(build);
    });
  }, []);

  if (!currentBuild) return null;

  // Filter orders that are included in the current build
  const ordersInCurrentBuild = orders.filter(order => {
    const orderBuildNumber = generateBuildNumber(order);
    console.log('Order:', order.id, 'Status:', order.status, 'Build:', orderBuildNumber, 'Current Build:', currentBuild.buildNumber);
    return orderBuildNumber === currentBuild.buildNumber;
  });

  const hasOrdersInBuild = ordersInCurrentBuild.length > 0;

  return (
    <div className={`bg-white/10 border-white/20 border rounded-2xl shadow-[0_2.8px_2.2px_rgba(0,_0,_0,_0.034),_0_6.7px_5.3px_rgba(0,_0,_0,_0.048),_0_12.5px_10px_rgba(0,_0,_0,_0.06),_0_22.3px_17.9px_rgba(0,_0,_0,_0.072),_0_41.8px_33.4px_rgba(0,_0,_0,_0.086),_0_100px_80px_rgba(0,_0,_0,_0.12)] backdrop-blur-lg overflow-hidden ${className}`}>
      <div className="px-4 py-2 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Truck className="w-4.5 h-4.5 text-lime-400" />
          <span className="text-sm font-medium">Current Shipping Build</span>
        </div>
        {hasOrdersInBuild && (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-lime-400/20 text-lime-300 text-xs font-medium">
            <Package className="w-3 h-3" />
            {ordersInCurrentBuild.length} {ordersInCurrentBuild.length === 1 ? 'order' : 'orders'}
          </span>
        )}
      </div>
      
      {/* Always show sliding notification */}
      <div className="p-2 border-b border-white/10">
        <div
          className="text-slate-300 whitespace-nowrap overflow-hidden animate-scroll-left"
          onMouseEnter={(e) => {
            (e.target as HTMLElement).style.animationPlayState = 'paused';
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLElement).style.animationPlayState = 'running';
          }}
        >
          🚚 Shipping Build <span className="text-orange-400 font-medium">{currentBuild.buildNumber}</span> departs <span className="text-cyan-400 font-bold sparkle-text">{currentBuild.departureDate}</span>, arrives by <span className="text-lime-400 font-medium">{currentBuild.expectedDelivery}</span> • {hasOrdersInBuild ? `You have ${ordersInCurrentBuild.length} ${ordersInCurrentBuild.length === 1 ? 'order' : 'orders'} in this build!` : 'No orders in this build yet - place an order to secure your spot!'} ✨
        </div>
      </div>

      {hasOrdersInBuild ? (
        <div className="p-4">
          <div className="space-y-2">
            <div className="text-xs font-medium text-slate-300/80 mb-2">Your orders in this build:</div>
            {ordersInCurrentBuild.map((order) => (
              <div key={order.id} className="flex items-center justify-between bg-white/5 rounded-lg p-2 border border-white/10">
                <div className="flex items-center gap-2">
                  <Package className="w-3.5 h-3.5 text-slate-400" />
                  <div>
                    <div className="text-sm font-medium text-white">{order.productName}</div>
                    <div className="text-xs text-slate-400">Order #{order.id.slice(-8)}</div>
                  </div>
                </div>
                <div className="text-xs text-lime-400 font-medium">
                  {order.status === 'SHIPPED' ? 'Shipped' : 
                   order.status === 'DELIVERED' ? 'Delivered' : 
                   order.status === 'PROCESSING' ? 'Processing' : 'Ready'}
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-3 pt-3 border-t border-white/10">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Estimated delivery for all orders</span>
              <span className="text-lime-400 font-medium">{currentBuild.expectedDelivery}</span>
            </div>
          </div>
        </div>
      ) : null}
      
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
      `}</style>
    </div>
  );
}

export default ShippingNotification;