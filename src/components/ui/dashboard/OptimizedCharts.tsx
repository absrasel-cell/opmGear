'use client';

import React, { useEffect, useRef, useMemo } from 'react';
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
// OPTIMIZED BASE CHART COMPONENT
// ============================================================================

interface BaseChartProps extends ChartProps {
  type: 'line' | 'doughnut' | 'bar';
  data: any;
  options?: any;
}

function OptimizedBaseChart({ 
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

  // Memoize chart options to prevent unnecessary re-renders
  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 750, // Reduced from default 1000ms
      easing: 'easeInOutQuad'
    },
    // Optimize performance settings
    datasets: {
      line: {
        pointHoverRadius: 4,
        pointRadius: 2,
        tension: 0.35
      },
      bar: {
        borderRadius: 4,
        borderSkipped: false
      }
    },
    plugins: {
      legend: { 
        labels: { 
          color: dashboardTheme.colors.text.tertiary,
          font: {
            family: dashboardTheme.typography.fontFamily.primary,
            size: 11
          },
          usePointStyle: true,
          pointStyle: 'circle'
        } 
      },
      tooltip: { 
        backgroundColor: 'rgba(0,0,0,0.9)', 
        borderColor: dashboardTheme.colors.solid.border, 
        borderWidth: 1,
        titleColor: dashboardTheme.colors.text.primary,
        bodyColor: dashboardTheme.colors.text.secondary,
        footerColor: dashboardTheme.colors.text.tertiary,
        cornerRadius: 8,
        displayColors: false,
        mode: 'index' as const,
        intersect: false
      }
    },
    scales: type !== 'doughnut' ? {
      x: { 
        grid: { 
          color: dashboardTheme.colors.solid.border,
          display: type === 'bar',
          lineWidth: 0.5
        },
        ticks: { 
          color: dashboardTheme.colors.text.tertiary,
          font: {
            family: dashboardTheme.typography.fontFamily.primary,
            size: 10
          },
          maxTicksLimit: 8 // Limit ticks for performance
        }
      },
      y: { 
        beginAtZero: true,
        grid: { 
          color: dashboardTheme.colors.solid.border,
          lineWidth: 0.5
        },
        ticks: { 
          color: dashboardTheme.colors.text.tertiary,
          font: {
            family: dashboardTheme.typography.fontFamily.primary,
            size: 10
          },
          maxTicksLimit: 6, // Limit ticks for performance
          callback: function(value: any) {
            // Format large numbers
            if (value >= 1000000) {
              return '$' + (value / 1000000).toFixed(1) + 'M';
            } else if (value >= 1000) {
              return '$' + (value / 1000).toFixed(1) + 'K';
            }
            return '$' + value;
          }
        }
      }
    } : undefined,
    ...options
  }), [type, options]);

  // Memoize data to prevent unnecessary chart updates
  const memoizedData = useMemo(() => data, [JSON.stringify(data)]);

  useEffect(() => {
    if (!chartRef.current) return;

    // Only destroy and recreate if data actually changed
    if (chartInstanceRef.current) {
      // Update existing chart data instead of destroying
      chartInstanceRef.current.data = memoizedData;
      chartInstanceRef.current.options = chartOptions;
      chartInstanceRef.current.update('none'); // No animation for updates
      return;
    }

    // Create new chart only if none exists
    chartInstanceRef.current = new Chart(chartRef.current, {
      type,
      data: memoizedData,
      options: chartOptions
    });

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
    };
  }, [type, memoizedData, chartOptions]);

  return (
    <GlassCard className={`p-5 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-xl font-bold text-white">
            {title}
          </h3>
          {subtitle && (
            <p className="text-sm text-slate-400 mt-1">{subtitle}</p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-2">
            {actions}
          </div>
        )}
      </div>
      
      <div className="rounded-lg border border-white/10 p-3">
        <div className="relative" style={{ height: `${height}px` }}>
          <canvas ref={chartRef} />
        </div>
      </div>
    </GlassCard>
  );
}

// ============================================================================
// OPTIMIZED REVENUE CHART
// ============================================================================

interface OptimizedRevenueChartProps extends ChartProps {
  monthlyRevenue: number[];
  revenueGrowth?: number;
}

export function OptimizedRevenueChart({ 
  title = "Revenue Overview",
  subtitle,
  monthlyRevenue = [],
  revenueGrowth = 0,
  className = '',
  height = 288
}: OptimizedRevenueChartProps) {
  
  // Generate labels for last 12 months
  const labels = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                   'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonth = new Date().getMonth();
    const monthLabels = [];
    
    for (let i = 11; i >= 0; i--) {
      const monthIndex = (currentMonth - i + 12) % 12;
      monthLabels.push(months[monthIndex]);
    }
    
    return monthLabels;
  }, []);

  const data = useMemo(() => ({
    labels,
    datasets: [{
      label: 'Revenue',
      data: monthlyRevenue.length > 0 ? monthlyRevenue : new Array(12).fill(0),
      borderColor: dashboardTheme.colors.primary.lime[400],
      backgroundColor: `${dashboardTheme.colors.primary.lime[400]}15`,
      tension: 0.35,
      fill: true,
      pointBackgroundColor: dashboardTheme.colors.primary.lime[400],
      pointBorderColor: dashboardTheme.colors.primary.lime[400],
      pointRadius: 3,
      pointHoverRadius: 5,
      borderWidth: 2
    }]
  }), [monthlyRevenue, labels]);

  const growthColor = revenueGrowth >= 0 ? 'text-green-400' : 'text-red-400';
  const growthIcon = revenueGrowth >= 0 ? '↗' : '↘';
  
  return (
    <OptimizedBaseChart
      type="line"
      title={title}
      subtitle={subtitle || `${growthIcon} ${Math.abs(revenueGrowth).toFixed(1)}% vs last month`}
      data={data}
      className={`2xl:col-span-2 ${className}`}
      height={height}
      actions={
        <div className={`text-sm ${growthColor} font-medium`}>
          {growthIcon} {Math.abs(revenueGrowth).toFixed(1)}%
        </div>
      }
    />
  );
}

// ============================================================================
// OPTIMIZED ORDER STATUS CHART
// ============================================================================

interface OptimizedOrderStatusChartProps extends ChartProps {
  pendingCount: number;
  confirmedCount: number;
  processingCount: number;
  shippedCount: number;
  deliveredCount: number;
  cancelledCount: number;
}

export function OptimizedOrderStatusChart({ 
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
}: OptimizedOrderStatusChartProps) {
  
  const totalOrders = pendingCount + confirmedCount + processingCount + 
                     shippedCount + deliveredCount + cancelledCount;

  const data = useMemo(() => {
    if (totalOrders === 0) {
      return {
        labels: ['No Orders'],
        datasets: [{
          data: [1],
          backgroundColor: ['rgba(148, 163, 184, 0.5)'],
          borderColor: ['rgba(148, 163, 184, 0.8)'],
          borderWidth: 1
        }]
      };
    }

    return {
      labels: ['Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered', 'Cancelled'],
      datasets: [{
        data: [pendingCount, confirmedCount, processingCount, shippedCount, deliveredCount, cancelledCount],
        backgroundColor: [
          'rgba(148, 163, 184, 0.8)',    // Slate - Pending
          'rgba(34, 211, 238, 0.8)',     // Cyan - Confirmed
          'rgba(251, 146, 60, 0.8)',     // Orange - Processing
          'rgba(196, 181, 253, 0.8)',    // Purple - Shipped
          'rgba(132, 204, 22, 0.8)',     // Lime - Delivered
          'rgba(239, 68, 68, 0.8)'       // Red - Cancelled
        ],
        borderColor: [
          'rgba(148, 163, 184, 1)',
          'rgba(34, 211, 238, 1)',
          'rgba(251, 146, 60, 1)',
          'rgba(196, 181, 253, 1)',
          'rgba(132, 204, 22, 1)',
          'rgba(239, 68, 68, 1)'
        ],
        borderWidth: 2,
        hoverOffset: 4
      }]
    };
  }, [pendingCount, confirmedCount, processingCount, shippedCount, deliveredCount, cancelledCount]);

  const options = useMemo(() => ({
    cutout: '65%',
    plugins: {
      legend: { 
        position: 'bottom' as const,
        labels: {
          padding: 15,
          usePointStyle: true,
          pointStyle: 'circle',
          color: 'rgba(255, 255, 255, 0.9)',
          font: {
            size: 11,
            family: dashboardTheme.typography.fontFamily.primary
          }
        }
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            if (totalOrders === 0) return 'No orders yet';
            const label = context.label || '';
            const value = context.parsed;
            const percentage = ((value / totalOrders) * 100).toFixed(1);
            return `${label}: ${value} (${percentage}%)`;
          }
        }
      }
    }
  }), [totalOrders]);

  return (
    <OptimizedBaseChart
      type="doughnut"
      title={title}
      subtitle={subtitle || `${totalOrders} total orders`}
      data={data}
      options={options}
      className={className}
      height={height}
      actions={
        <div className="text-orange-400 text-lg">
          📊
        </div>
      }
    />
  );
}

// ============================================================================
// OPTIMIZED USERS CHART
// ============================================================================

interface OptimizedUsersChartProps extends ChartProps {
  dailyRegistrations?: number[];
}

export function OptimizedUsersChart({ 
  title = "User Registrations",
  subtitle = "This week",
  dailyRegistrations = [],
  className = '',
  height = 288
}: OptimizedUsersChartProps) {
  
  const labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  const data = useMemo(() => ({
    labels,
    datasets: [{
      label: 'New Users',
      data: dailyRegistrations.length > 0 ? dailyRegistrations : [0, 1, 0, 2, 1, 0, 1],
      backgroundColor: `${dashboardTheme.colors.accent.cyan[400]}60`,
      borderColor: dashboardTheme.colors.accent.cyan[400],
      borderWidth: 2,
      borderRadius: 4,
      borderSkipped: false,
    }]
  }), [dailyRegistrations]);

  const options = useMemo(() => ({
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
          color: dashboardTheme.colors.solid.border,
          lineWidth: 0.5
        },
        ticks: {
          stepSize: 1 // Ensure integer values for user counts
        }
      }
    }
  }), []);

  const totalWeeklyUsers = dailyRegistrations.reduce((sum, count) => sum + count, 0);

  return (
    <OptimizedBaseChart
      type="bar"
      title={title}
      subtitle={subtitle}
      data={data}
      options={options}
      className={`2xl:col-span-1 ${className}`}
      height={height}
      actions={
        <div className="text-cyan-300 text-sm font-medium">
          {totalWeeklyUsers} this week
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

export { OptimizedBaseChart };