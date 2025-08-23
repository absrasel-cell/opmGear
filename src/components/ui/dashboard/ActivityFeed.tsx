'use client';

import React, { useEffect, useState } from 'react';
import { Activity } from 'lucide-react';
import { GlassCard } from './index';

interface ActivityItem {
  id: string;
  type: 'order' | 'user' | 'quote' | 'product' | 'page' | 'feature';
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

export function ActivityFeed({ 
  activities = [],
  className = '',
  scrolling = true,
  title = "Recent Activity"
}: ActivityFeedProps) {
  const [currentActivities, setCurrentActivities] = useState<ActivityItem[]>([]);

  // Default activities that match the generated design
  const defaultActivities: ActivityItem[] = [
    {
      id: '1',
      type: 'order',
      message: 'New order #CC-1042 from Jordan M. (12 caps)',
      timestamp: new Date(Date.now() - 5 * 60000).toISOString(), // 5 minutes ago
    },
    {
      id: '2', 
      type: 'user',
      message: 'User Mia added to team "Wholesale West"',
      timestamp: new Date(Date.now() - 12 * 60000).toISOString(), // 12 minutes ago
    },
    {
      id: '3',
      type: 'quote',
      message: 'Quote Q-233 approved',
      timestamp: new Date(Date.now() - 18 * 60000).toISOString(), // 18 minutes ago
    },
    {
      id: '4',
      type: 'product',
      message: 'Product "Classic Snapback" inventory updated',
      timestamp: new Date(Date.now() - 25 * 60000).toISOString(), // 25 minutes ago
    },
    {
      id: '5',
      type: 'order',
      message: 'Order #CC-1041 shipped',
      timestamp: new Date(Date.now() - 35 * 60000).toISOString(), // 35 minutes ago
    },
    {
      id: '6',
      type: 'page',
      message: 'Page "Holiday Sale" scheduled',
      timestamp: new Date(Date.now() - 42 * 60000).toISOString(), // 42 minutes ago
    },
    {
      id: '7',
      type: 'feature',
      message: 'Feature flag "bulk-pricing-v2" enabled',
      timestamp: new Date(Date.now() - 55 * 60000).toISOString(), // 55 minutes ago
    }
  ];

  useEffect(() => {
    setCurrentActivities(activities.length > 0 ? activities : defaultActivities);
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
      </div>
      <div className="p-2">
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