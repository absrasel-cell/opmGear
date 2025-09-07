'use client';

import React, { useEffect, useState } from 'react';
import { Activity, Truck, User, Package, Quote } from 'lucide-react';
import { GlassCard } from './index';

interface ActivityItem {
  id: string;
  type: 'order' | 'user' | 'quote' | 'product' | 'page' | 'feature' | 'shipment';
  message: string;
  timestamp: string;
  icon?: string;
}

interface ActivityFeedProps {
  activities?: ActivityItem[];
  className?: string;
  scrolling?: boolean;
  title?: string;
}

interface CurrentShipment {
  buildNumber: string;
  status: string;
  shippingMethod: string;
  estimatedDeparture?: string;
}

interface RecentUser {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

interface RecentOrder {
  id: string;
  customerInfo: {
    name: string;
  };
  productName: string;
  createdAt: string;
  orderSource: string;
}

export function ActivityFeed({ 
  activities = [],
  className = '',
  scrolling = true,
  title = "Recent Activity"
}: ActivityFeedProps) {
  const [currentActivities, setCurrentActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch real-time activity data
  const fetchRealTimeActivities = async () => {
    try {
      setIsLoading(true);
      const realTimeActivities: ActivityItem[] = [];

      // Fetch current shipping build number
      try {
        const shipmentResponse = await fetch('/api/shipments/current-build');
        if (shipmentResponse.ok) {
          const shipmentData = await shipmentResponse.json();
          if (shipmentData.success && shipmentData.shipment) {
            const shipment: CurrentShipment = shipmentData.shipment;
            realTimeActivities.push({
              id: 'current-build',
              type: 'shipment',
              message: `Current shipping build: ${shipment.buildNumber} (${shipment.status})`,
              timestamp: new Date().toISOString(),
            });
          }
        }
      } catch (error) {
        console.error('Failed to fetch current shipment:', error);
      }

      // Fetch latest signed up users
      try {
        const usersResponse = await fetch('/api/users');
        if (usersResponse.ok) {
          const usersData = await usersResponse.json();
          const users: RecentUser[] = usersData.users || [];
          const recentUsers = users
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 2);

          recentUsers.forEach((user, index) => {
            realTimeActivities.push({
              id: `user-${user.id}`,
              type: 'user',
              message: `${user.name} signed up`,
              timestamp: user.createdAt,
            });
          });
        }
      } catch (error) {
        console.error('Failed to fetch recent users:', error);
      }

      // Fetch latest submitted orders (from quotes, checkout, etc.)
      try {
        const ordersResponse = await fetch('/api/orders');
        if (ordersResponse.ok) {
          const ordersData = await ordersResponse.json();
          const orders: RecentOrder[] = ordersData.orders || [];
          const recentOrders = orders
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 3);

          recentOrders.forEach((order) => {
            const shortId = order.id.slice(-8);
            const source = order.orderSource === 'PRODUCT_CUSTOMIZATION' ? 'customizer' : 'reorder';
            realTimeActivities.push({
              id: `order-${order.id}`,
              type: 'order',
              message: `New order #${shortId} from ${order.customerInfo.name} via ${source}`,
              timestamp: order.createdAt,
            });
          });
        }
      } catch (error) {
        console.error('Failed to fetch recent orders:', error);
      }

      // Fetch latest quote requests
      try {
        const quotesResponse = await fetch('/api/quote-requests');
        if (quotesResponse.ok) {
          const quotesData = await quotesResponse.json();
          const quotes = quotesData.quoteRequests || [];
          const recentQuotes = quotes
            .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 2);

          recentQuotes.forEach((quote: any) => {
            const shortId = quote.id.slice(-8);
            realTimeActivities.push({
              id: `quote-${quote.id}`,
              type: 'quote',
              message: `Quote request #${shortId} from ${quote.customerInfo.name}`,
              timestamp: quote.createdAt,
            });
          });
        }
      } catch (error) {
        console.error('Failed to fetch recent quotes:', error);
      }

      // Sort all activities by timestamp (newest first)
      const sortedActivities = realTimeActivities.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      setCurrentActivities(sortedActivities.slice(0, 10)); // Keep only top 10
    } catch (error) {
      console.error('Error fetching real-time activities:', error);
      // Fallback to default activities if API calls fail
      setCurrentActivities(getDefaultActivities());
    } finally {
      setIsLoading(false);
    }
  };

  // Default activities fallback
  const getDefaultActivities = (): ActivityItem[] => [
    {
      id: '1',
      type: 'shipment',
      message: 'Current shipping build: B-2024-001 (PREPARING)',
      timestamp: new Date().toISOString(),
    },
    {
      id: '2',
      type: 'order',
      message: 'New order #CC-1042 from Jordan M. via customizer',
      timestamp: new Date(Date.now() - 5 * 60000).toISOString(),
    },
    {
      id: '3', 
      type: 'user',
      message: 'Mia Johnson signed up',
      timestamp: new Date(Date.now() - 12 * 60000).toISOString(),
    },
    {
      id: '4',
      type: 'quote',
      message: 'Quote request #Q-233 from Alex Chen',
      timestamp: new Date(Date.now() - 18 * 60000).toISOString(),
    },
    {
      id: '5',
      type: 'order',
      message: 'New order #CC-1041 from Sarah K. via reorder',
      timestamp: new Date(Date.now() - 35 * 60000).toISOString(),
    }
  ];

  useEffect(() => {
    if (activities.length > 0) {
      setCurrentActivities(activities);
      setIsLoading(false);
    } else {
      fetchRealTimeActivities();
    }

    // Set up auto-refresh every 30 seconds
    const interval = setInterval(fetchRealTimeActivities, 30000);
    return () => clearInterval(interval);
  }, [activities]);

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / 60000);
    
    if (diffInMinutes < 1) return 'just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'order': return '📦';
      case 'user': return '👤';
      case 'quote': return '💬';
      case 'product': return '🏷️';
      case 'page': return '📄';
      case 'feature': return '⚡';
      case 'shipment': return '🚚';
      default: return '•';
    }
  };

  const createActivityMessage = (activity: ActivityItem) => {
    return `${getActivityIcon(activity.type)} ${activity.message}`;
  };

  const allActivitiesText = currentActivities
    .map(createActivityMessage)
    .join(' • ');

  if (!scrolling) {
    // Static list view
    return (
      <GlassCard className={`overflow-hidden ${className}`}>
        <div className="px-4 py-2 border-b border-white/10 flex items-center gap-2">
          <Activity className="w-4.5 h-4.5 text-lime-400" />
          <span className="text-sm font-medium">{title}</span>
        </div>
        <div className="p-4">
          <div className="space-y-3">
            {currentActivities.map((activity) => (
              <div key={activity.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors">
                <span className="text-lg flex-shrink-0">
                  {getActivityIcon(activity.type)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-slate-300">{activity.message}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {formatTimestamp(activity.timestamp)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </GlassCard>
    );
  }

  // Scrolling marquee view (matches generated design)
  return (
    <GlassCard className={`overflow-hidden ${className}`}>
      <div className="px-4 py-2 border-b border-white/10 flex items-center gap-2">
        <Activity className="w-4.5 h-4.5 text-lime-400" />
        <span className="text-sm font-medium">{title}</span>
        {isLoading && (
          <div className="ml-auto">
            <div className="animate-spin rounded-full h-3 w-3 border border-lime-400 border-t-transparent"></div>
          </div>
        )}
      </div>
      <div className="p-2">
        {isLoading ? (
          <div className="text-slate-400 text-sm">Loading real-time activity...</div>
        ) : (
          <div
            className="text-slate-300 whitespace-nowrap overflow-hidden"
            style={{
              animation: 'scroll-left 60s linear infinite'
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLElement).style.animationPlayState = 'paused';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLElement).style.animationPlayState = 'running';
            }}
          >
            {allActivitiesText}
          </div>
        )}
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
      `}</style>
    </GlassCard>
  );
}

// ============================================================================
// ACTIVITY FEED VARIANTS
// ============================================================================

export function MarqueeActivityFeed({ 
  activities = [],
  className = ''
}: Omit<ActivityFeedProps, 'scrolling'>) {
  return (
    <ActivityFeed
      activities={activities}
      scrolling={true}
      className={className}
    />
  );
}

export function ListActivityFeed({ 
  activities = [],
  className = '',
  title = "Activity Log"
}: Omit<ActivityFeedProps, 'scrolling'>) {
  return (
    <ActivityFeed
      activities={activities}
      scrolling={false}
      title={title}
      className={className}
    />
  );
}

export default ActivityFeed;