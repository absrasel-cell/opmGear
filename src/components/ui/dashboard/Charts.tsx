'use client';

import React, { useEffect, useRef } from 'react';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { GlassCard } from './index';
import { dashboardTheme } from '@/lib/dashboard-theme';

// Register Chart.js components
Chart.register(...registerables);

interface ChartProps {
  title: string;
  subtitle?: string;
  className?: string;
  height?: number;
  actions?: React.ReactNode;
}

// ============================================================================
// BASE CHART COMPONENT
// ============================================================================

interface BaseChartProps extends ChartProps {
  type: 'line' | 'doughnut' | 'bar';
  data: any;
  options?: any;
}

function BaseChart({ 
  title, 
  subtitle, 
  type, 
  data, 
  options = {}, 
  className = '',
  height = 288,
  actions 
}: BaseChartProps) {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<Chart | null>(null);

  // Chart.js dark theme defaults
  const darkThemeOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { 
        labels: { 
          color: dashboardTheme.colors.text.tertiary,
          font: {
            family: dashboardTheme.typography.fontFamily.primary
          }
        } 
      },
      tooltip: { 
        backgroundColor: 'rgba(0,0,0,0.8)', 
        borderColor: dashboardTheme.colors.glass.border, 
        borderWidth: 1,
        titleColor: dashboardTheme.colors.text.primary,
        bodyColor: dashboardTheme.colors.text.secondary,
        footerColor: dashboardTheme.colors.text.tertiary,
      }
    },
    scales: type !== 'doughnut' ? {
      x: { 
        grid: { 
          color: dashboardTheme.colors.glass.border,
          display: type === 'bar' 
        },
        ticks: { 
          color: dashboardTheme.colors.text.tertiary,
          font: {
            family: dashboardTheme.typography.fontFamily.primary
          }
        }
      },
      y: { 
        beginAtZero: true,
        grid: { 
          color: dashboardTheme.colors.glass.border 
        },
        ticks: { 
          color: dashboardTheme.colors.text.tertiary,
          font: {
            family: dashboardTheme.typography.fontFamily.primary
          }
        }
      }
    } : undefined,
    ...options
  };

  useEffect(() => {
    if (chartRef.current) {
      // Destroy existing chart
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
      }

      // Create new chart
      chartInstanceRef.current = new Chart(chartRef.current, {
        type,
        data,
        options: darkThemeOptions
      });
    }

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
    };
  }, [type, data, darkThemeOptions]);

  return (
    <GlassCard className={`p-5 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl md:text-3xl tracking-tight font-extrabold text-white">
            {title}
          </h2>
          {subtitle && (
            <p className="text-sm text-slate-400">{subtitle}</p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-2">
            {actions}
          </div>
        )}
      </div>
      
      <div className="mt-4">
        <div className="rounded-xl border border-white/10 p-3">
          <div className="relative" style={{ height: `${height}px` }}>
            <canvas ref={chartRef} />
          </div>
        </div>
      </div>
    </GlassCard>
  );
}

// ============================================================================
// REVENUE CHART (LINE)
// ============================================================================

interface RevenueChartProps extends ChartProps {
  revenueData?: number[];
  quotesData?: number[];
  labels?: string[];
  orders?: any[];
}

export function RevenueChart({ 
  title = "Revenue Trends",
  subtitle = "Last 12 months",
  revenueData,
  quotesData,
  labels,
  orders = [],
  className = '',
  height = 288,
  actions
}: RevenueChartProps) {
  // Generate real data from orders if available
  const generateRevenueData = () => {
    if (revenueData) return revenueData;
    
    if (orders.length > 0) {
      // Group orders by month and calculate revenue
      const monthlyRevenue = new Array(12).fill(0);
      const currentDate = new Date();
      
      orders.forEach(order => {
        const orderDate = new Date(order.createdAt);
        const monthDiff = currentDate.getMonth() - orderDate.getMonth() + 
                         (currentDate.getFullYear() - orderDate.getFullYear()) * 12;
        
        if (monthDiff >= 0 && monthDiff < 12) {
          monthlyRevenue[11 - monthDiff] += order.orderTotal || 0;
        }
      });
      
      return monthlyRevenue;
    }
    
    // Fallback to default data
    return [9000, 11000, 10000, 12000, 14000, 13000, 15000, 16000, 17000, 19000, 18000, 22000];
  };

  const generateQuotesData = () => {
    if (quotesData) return quotesData;
    
    // For now, return default data
    return [2000, 3000, 3000, 4000, 4000, 5000, 5000, 6000, 6000, 7000, 6000, 8000];
  };

  const generateLabels = () => {
    if (labels) return labels;
    
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonth = new Date().getMonth();
    const monthLabels = [];
    
    for (let i = 11; i >= 0; i--) {
      const monthIndex = (currentMonth - i + 12) % 12;
      monthLabels.push(months[monthIndex]);
    }
    
    return monthLabels;
  };

  const data = {
    labels: generateLabels(),
    datasets: [
      {
        label: 'Revenue ($)',
        data: generateRevenueData(),
        borderColor: dashboardTheme.colors.primary.lime[400],
        backgroundColor: `${dashboardTheme.colors.primary.lime[400]}15`,
        tension: 0.35,
        fill: true,
        pointBackgroundColor: dashboardTheme.colors.primary.lime[400],
        pointBorderColor: dashboardTheme.colors.primary.lime[400],
        pointRadius: 4,
        pointHoverRadius: 6
      },
      {
        label: 'Quotes Converted ($)',
        data: generateQuotesData(),
        borderColor: dashboardTheme.colors.accent.cyan[400],
        backgroundColor: `${dashboardTheme.colors.accent.cyan[400]}10`,
        tension: 0.35,
        fill: true,
        pointBackgroundColor: dashboardTheme.colors.accent.cyan[400],
        pointBorderColor: dashboardTheme.colors.accent.cyan[400],
        pointRadius: 4,
        pointHoverRadius: 6
      }
    ]
  };

  const defaultActions = (
    <>
      <button className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs hover:bg-white/10">
        Monthly
      </button>
      <button className="px-3 py-1.5 rounded-full bg-lime-400 text-black text-xs font-medium hover:-translate-y-0.5 transition">
        Quarterly
      </button>
    </>
  );

  return (
    <BaseChart
      type="line"
      title={title}
      subtitle={subtitle}
      data={data}
      className={`2xl:col-span-2 ${className}`}
      height={height}
      actions={actions || defaultActions}
    />
  );
}

// ============================================================================
// ORDER STATUS CHART (DOUGHNUT)
// ============================================================================

interface OrderStatusChartProps extends ChartProps {
  pendingCount?: number;
  confirmedCount?: number;
  processingCount?: number;
  shippedCount?: number;
  deliveredCount?: number;
  cancelledCount?: number;
}

export function OrderStatusChart({ 
  title = "Order Status",
  subtitle,
  pendingCount = 0,
  confirmedCount = 0,
  processingCount = 0,
  shippedCount = 0,
  deliveredCount = 0,
  cancelledCount = 0,
  className = '',
  height = 288
}: OrderStatusChartProps) {
  // Check if all values are zero
  const totalOrders = pendingCount + confirmedCount + processingCount + shippedCount + deliveredCount + cancelledCount;
  const hasData = totalOrders > 0;

  // If no data, show empty state
  if (!hasData) {
    return (
      <GlassCard className={`p-5 ${className}`}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl md:text-3xl tracking-tight font-extrabold text-white">
              {title}
            </h2>
            {subtitle && (
              <p className="text-sm text-slate-400">{subtitle}</p>
            )}
          </div>
          <div className="text-orange-400">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M11 2v20c-5.07-.5-9-4.79-9-10s3.93-9.5 9-10zm2.03 0v8.99H22c-.47-4.74-4.24-8.52-8.97-8.99z"/>
            </svg>
          </div>
        </div>
        
        <div className="mt-4">
          <div className="rounded-xl border border-white/10 p-3">
            <div className="relative flex items-center justify-center" style={{ height: `${height}px` }}>
              <div className="text-center">
                <div className="text-6xl mb-4">📊</div>
                <p className="text-slate-400 text-sm">No orders to display</p>
                <p className="text-slate-500 text-xs">Orders will appear here once they are created</p>
              </div>
            </div>
          </div>
        </div>
      </GlassCard>
    );
  }

  const data = {
    labels: ['Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered', 'Cancelled'],
    datasets: [{
      data: [pendingCount, confirmedCount, processingCount, shippedCount, deliveredCount, cancelledCount],
      backgroundColor: [
        'rgba(148, 163, 184, 0.8)',    // Slate - Pending (more visible)
        'rgba(34, 211, 238, 0.8)',     // Cyan - Confirmed (more visible)
        'rgba(251, 146, 60, 0.8)',     // Orange - Processing (more visible)
        'rgba(196, 181, 253, 0.8)',    // Purple - Shipped (more visible)
        'rgba(132, 204, 22, 0.8)',     // Lime - Delivered (more visible)
        'rgba(239, 68, 68, 0.8)'       // Red - Cancelled (more visible)
      ],
      borderColor: [
        'rgba(148, 163, 184, 1)',      // Slate border (solid)
        'rgba(34, 211, 238, 1)',       // Cyan border (solid)
        'rgba(251, 146, 60, 1)',       // Orange border (solid)
        'rgba(196, 181, 253, 1)',      // Purple border (solid)
        'rgba(132, 204, 22, 1)',       // Lime border (solid)
        'rgba(239, 68, 68, 1)'         // Red border (solid)
      ],
      borderWidth: 2,
      hoverOffset: 4
    }]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '65%',
    plugins: {
      legend: { 
        position: 'bottom' as const,
        labels: {
          padding: 20,
          usePointStyle: true,
          pointStyle: 'circle',
          color: 'rgba(255, 255, 255, 0.9)', // More visible white text
          font: {
            size: 12,
            family: dashboardTheme.typography.fontFamily.primary
          }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0,0,0,0.9)',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        titleColor: 'rgba(255, 255, 255, 1)',
        bodyColor: 'rgba(226, 232, 240, 1)',
        callbacks: {
          label: function(context: any) {
            const label = context.label || '';
            const value = context.parsed;
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
            return `${label}: ${value} (${percentage}%)`;
          }
        }
      }
    }
  };

  return (
    <BaseChart
      type="doughnut"
      title={title}
      subtitle={subtitle}
      data={data}
      options={options}
      className={className}
      height={height}
      actions={
        <div className="text-orange-400">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M11 2v20c-5.07-.5-9-4.79-9-10s3.93-9.5 9-10zm2.03 0v8.99H22c-.47-4.74-4.24-8.52-8.97-8.99z"/>
          </svg>
        </div>
      }
    />
  );
}

// ============================================================================
// USERS REGISTRATION CHART (BAR)
// ============================================================================

interface UsersChartProps extends ChartProps {
  dailyRegistrations?: number[];
  labels?: string[];
  users?: any[];
}

export function UsersChart({ 
  title = "User Registrations",
  subtitle = "This week",
  dailyRegistrations,
  labels,
  users = [],
  className = '',
  height = 288
}: UsersChartProps) {
  // Generate real data from users if available
  const generateRegistrationData = () => {
    if (dailyRegistrations) return dailyRegistrations;
    
    if (users.length > 0) {
      // Group users by day of the week
      const dailyCounts = new Array(7).fill(0);
      const currentDate = new Date();
      const weekStart = new Date(currentDate);
      weekStart.setDate(currentDate.getDate() - currentDate.getDay());
      
      users.forEach(user => {
        const userDate = new Date(user.createdAt);
        if (userDate >= weekStart) {
          const dayOfWeek = userDate.getDay();
          dailyCounts[dayOfWeek]++;
        }
      });
      
      return dailyCounts;
    }
    
    // Fallback to default data
    return [42, 55, 61, 48, 70, 38, 30];
  };

  const generateLabels = () => {
    if (labels) return labels;
    return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  };

  const data = {
    labels: generateLabels(),
    datasets: [{
      label: 'New Users',
      data: generateRegistrationData(),
      backgroundColor: `${dashboardTheme.colors.accent.cyan[400]}50`,
      borderColor: dashboardTheme.colors.accent.cyan[400],
      borderWidth: 2,
      borderRadius: 4,
      borderSkipped: false,
    }]
  };

  const options = {
    plugins: {
      legend: { display: false }
    },
    scales: {
      x: { 
        grid: { display: false }
      },
      y: { 
        beginAtZero: true,
        grid: {
          color: dashboardTheme.colors.glass.border
        }
      }
    }
  };

  return (
    <BaseChart
      type="bar"
      title={title}
      subtitle={subtitle}
      data={data}
      options={options}
      className={`2xl:col-span-1 ${className}`}
      height={height}
      actions={
        <div className="text-cyan-300">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M3 13h1v7c0 1.103.897 2 2 2h12c1.103 0 2-.897 2-2v-7h1a1 1 0 0 0 .707-1.707l-9-9a.999.999 0 0 0-1.414 0l-9 9A1 1 0 0 0 3 13z"/>
          </svg>
        </div>
      }
    />
  );
}

// ============================================================================
// CHART GRID LAYOUT
// ============================================================================

interface ChartsGridProps {
  children: React.ReactNode;
  className?: string;
}

export function ChartsGrid({ children, className = '' }: ChartsGridProps) {
  return (
    <section className={`grid grid-cols-1 2xl:grid-cols-3 gap-4 ${className}`}>
      {children}
    </section>
  );
}

export { BaseChart };