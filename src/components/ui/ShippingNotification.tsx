'use client';

import React, { useEffect, useState } from 'react';
import { Truck, Clock, Package } from 'lucide-react';
import { GlassCard } from '@/components/ui/dashboard';

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

  // Current shipping build data - this could come from an API in production
  const getCurrentShippingBuild = (): ShippingBuildData => {
    const today = new Date();
    const departureDate = new Date();
    departureDate.setDate(today.getDate() + 12); // Departure in 12 days
    
    const expectedDelivery = new Date(departureDate);
    expectedDelivery.setDate(departureDate.getDate() + 7); // 7 days after departure
    
    return {
      buildNumber: 'SB-2024-08',
      departureDate: departureDate.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
      }),
      expectedDelivery: expectedDelivery.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
      }),
      status: 'open',
      spotsRemaining: 147
    };
  };

  useEffect(() => {
    setCurrentBuild(getCurrentShippingBuild());
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

  const getCurrentShippingBuild = (): ShippingBuildData => {
    const today = new Date();
    const departureDate = new Date();
    departureDate.setDate(today.getDate() + 12);
    
    const expectedDelivery = new Date(departureDate);
    expectedDelivery.setDate(departureDate.getDate() + 7);
    
    return {
      buildNumber: 'SB-2024-08',
      departureDate: departureDate.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric'
      }),
      expectedDelivery: expectedDelivery.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric'
      }),
      status: 'open'
    };
  };

  useEffect(() => {
    setCurrentBuild(getCurrentShippingBuild());
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
    <GlassCard className={`overflow-hidden ${className}`}>
      <div className="px-4 py-2 border-b border-white/10 flex items-center gap-2">
        <Truck className="w-4.5 h-4.5 text-lime-400" />
        <span className="text-sm font-medium">Current Shipping Build</span>
      </div>
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
    </GlassCard>
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

  const getCurrentShippingBuild = (): ShippingBuildData => {
    const today = new Date();
    const departureDate = new Date();
    departureDate.setDate(today.getDate() + 12);
    
    const expectedDelivery = new Date(departureDate);
    expectedDelivery.setDate(departureDate.getDate() + 7);
    
    // Generate current build number based on current month to match order build logic
    const currentYear = today.getFullYear();
    const currentMonth = String(today.getMonth() + 1).padStart(2, '0');
    
    return {
      buildNumber: `SB-${currentYear}-${currentMonth}`,
      departureDate: departureDate.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
      }),
      expectedDelivery: expectedDelivery.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
      }),
      status: 'open',
      spotsRemaining: 147
    };
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
    setCurrentBuild(getCurrentShippingBuild());
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
    <GlassCard className={`overflow-hidden ${className}`}>
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
    </GlassCard>
  );
}

export default ShippingNotification;