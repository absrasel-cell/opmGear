'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Truck,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  AlertCircle,
  CheckCircle,
  Calendar,
  Download,
  RefreshCw,
  BarChart3,
  PieChart,
  Activity,
  Target,
  Zap,
  Clock,
  Settings,
  Filter
} from 'lucide-react';
import { GlassCard, Button, StatusBadge } from './index';

interface ShipmentAnalyticsData {
  overview: {
    totalShipments: number;
    totalOrdersInShipments: number;
    monthlyShipments: number;
    monthlyVolume: number;
    monthlyValue: number;
    averageUtilization: number;
  };
  volumeUtilization: Array<{
    shipmentId: string;
    buildNumber: string;
    shippingMethod: string;
    status: string;
    orderCount: number;
    totalQuantity: number;
    maxCapacity: number;
    utilizationPercentage: number;
    totalValue: number;
    estimatedDeparture: string;
    createdAt: string;
    isOptimal: boolean;
    hasCapacity: boolean;
  }>;
  deliveryMethodEfficiency: Record<string, {
    count: number;
    totalOrders: number;
    totalQuantity: number;
    totalValue: number;
    avgUtilization: number;
  }>;
  costOptimization: {
    underutilizedCount: number;
    potentialSavings: number;
    optimalShipments: number;
    improvementOpportunities: Array<{
      buildNumber: string;
      currentUtilization: number;
      potentialIncrease: number;
      estimatedSavings: number;
    }>;
  };
  notifications: {
    nearCapacity: Array<{
      buildNumber: string;
      utilizationPercentage: number;
      remainingCapacity: number;
      estimatedDeparture: string;
    }>;
    consolidationOpportunities: Array<{
      buildNumber: string;
      utilizationPercentage: number;
      potentialConsolidation: number;
      shippingMethod: string;
    }>;
  };
}

interface ShipmentAnalyticsProps {
  className?: string;
}

export function ShipmentAnalytics({ className = '' }: ShipmentAnalyticsProps) {
  const [analytics, setAnalytics] = useState<ShipmentAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
    endDate: new Date().toISOString().split('T')[0]
  });

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      if (dateRange.startDate) params.append('startDate', dateRange.startDate);
      if (dateRange.endDate) params.append('endDate', dateRange.endDate);
      
      const response = await fetch(`/api/shipments/analytics?${params.toString()}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch analytics');
      }
      
      setAnalytics(data.analytics);
    } catch (error) {
      console.error('Error fetching shipment analytics:', error);
      setError(error instanceof Error ? error.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  }, [dateRange.startDate, dateRange.endDate]);

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange.startDate, dateRange.endDate, fetchAnalytics]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const exportData = async (type: 'csv' | 'json') => {
    if (!analytics) return;
    
    try {
      const dataToExport = {
        exportDate: new Date().toISOString(),
        dateRange,
        analytics
      };
      
      if (type === 'csv') {
        // Create CSV content
        const csvRows = ['Shipment,Method,Status,Orders,Quantity,Capacity,Utilization,Value,Optimal'];
        analytics.volumeUtilization.forEach(shipment => {
          csvRows.push([
            shipment.buildNumber,
            shipment.shippingMethod,
            shipment.status,
            shipment.orderCount,
            shipment.totalQuantity,
            shipment.maxCapacity,
            `${shipment.utilizationPercentage}%`,
            formatCurrency(shipment.totalValue),
            shipment.isOptimal ? 'Yes' : 'No'
          ].join(','));
        });
        
        const csvContent = csvRows.join('\\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `shipment-analytics-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
      } else {
        // JSON export
        const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `shipment-analytics-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <GlassCard className="p-6">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-lime-400"></div>
            <div className="text-slate-300">Loading shipment analytics...</div>
          </div>
        </GlassCard>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className={`space-y-6 ${className}`}>
        <GlassCard className="p-6 border-red-400/20 bg-red-400/5">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-red-400" />
            <div>
              <div className="text-red-200 font-medium">Failed to Load Analytics</div>
              <div className="text-red-300 text-sm">{error}</div>
            </div>
            <Button 
              variant="ghost" 
              className="ml-auto text-red-300 hover:text-red-200"
              onClick={fetchAnalytics}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </div>
        </GlassCard>
      </div>
    );
  }

  const { overview, volumeUtilization, deliveryMethodEfficiency, costOptimization, notifications } = analytics;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Shipment Analytics</h2>
          <p className="text-slate-400">Volume utilization, cost optimization, and efficiency insights</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4 text-slate-400" />
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-1 text-white text-sm focus:outline-none focus:ring-2 focus:ring-lime-400/50"
            />
            <span className="text-slate-400">to</span>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-1 text-white text-sm focus:outline-none focus:ring-2 focus:ring-lime-400/50"
            />
          </div>
          <Button variant="ghost" onClick={() => exportData('csv')}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="ghost" onClick={() => exportData('json')}>
            <Download className="w-4 h-4 mr-2" />
            Export JSON
          </Button>
          <Button variant="ghost" onClick={fetchAnalytics}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <GlassCard className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="inline-flex items-center gap-2 text-slate-300 text-sm">
                <Truck className="w-4.5 h-4.5 text-blue-400" />
                Total Shipments
              </div>
              <div className="mt-2 text-3xl font-extrabold tracking-tight text-white">
                {overview.totalShipments}
              </div>
              <div className="mt-1 text-xs text-slate-400">
                {overview.monthlyShipments} this month
              </div>
            </div>
            <span className="h-10 w-10 rounded-xl grid place-items-center bg-blue-400/15 border border-blue-400/20 text-blue-300">
              <Package className="w-5 h-5" />
            </span>
          </div>
        </GlassCard>

        <GlassCard className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="inline-flex items-center gap-2 text-slate-300 text-sm">
                <Activity className="w-4.5 h-4.5 text-lime-400" />
                Avg Utilization
              </div>
              <div className="mt-2 text-3xl font-extrabold tracking-tight text-white">
                {overview.averageUtilization.toFixed(1)}%
              </div>
              <div className="mt-1 text-xs text-slate-400">
                {overview.averageUtilization >= 75 ? 'Optimal range' : 'Room for improvement'}
              </div>
            </div>
            <span className="h-10 w-10 rounded-xl grid place-items-center bg-lime-400/15 border border-lime-400/20 text-lime-300">
              <Target className="w-5 h-5" />
            </span>
          </div>
        </GlassCard>

        <GlassCard className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="inline-flex items-center gap-2 text-slate-300 text-sm">
                <DollarSign className="w-4.5 h-4.5 text-green-400" />
                Monthly Value
              </div>
              <div className="mt-2 text-3xl font-extrabold tracking-tight text-white">
                {formatCurrency(overview.monthlyValue)}
              </div>
              <div className="mt-1 text-xs text-slate-400">
                {overview.totalOrdersInShipments} orders shipped
              </div>
            </div>
            <span className="h-10 w-10 rounded-xl grid place-items-center bg-green-400/15 border border-green-400/20 text-green-300">
              <TrendingUp className="w-5 h-5" />
            </span>
          </div>
        </GlassCard>

        <GlassCard className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="inline-flex items-center gap-2 text-slate-300 text-sm">
                <Zap className="w-4.5 h-4.5 text-orange-400" />
                Potential Savings
              </div>
              <div className="mt-2 text-3xl font-extrabold tracking-tight text-white">
                {formatCurrency(costOptimization.potentialSavings)}
              </div>
              <div className="mt-1 text-xs text-slate-400">
                {costOptimization.underutilizedCount} underutilized shipments
              </div>
            </div>
            <span className="h-10 w-10 rounded-xl grid place-items-center bg-orange-400/15 border border-orange-400/20 text-orange-300">
              <TrendingDown className="w-5 h-5" />
            </span>
          </div>
        </GlassCard>
      </div>

      {/* Notifications */}
      {(notifications.nearCapacity.length > 0 || notifications.consolidationOpportunities.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {notifications.nearCapacity.length > 0 && (
            <GlassCard className="p-5 border-amber-400/20 bg-amber-400/5">
              <div className="flex items-center gap-3 mb-4">
                <AlertCircle className="w-5 h-5 text-amber-400" />
                <div className="font-semibold text-amber-200">Near Capacity Alerts</div>
              </div>
              <div className="space-y-3">
                {notifications.nearCapacity.slice(0, 3).map((alert, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-amber-400/10 rounded-lg border border-amber-400/20">
                    <div>
                      <div className="font-medium text-amber-200">{alert.buildNumber}</div>
                      <div className="text-sm text-amber-300">
                        {alert.utilizationPercentage.toFixed(1)}% utilized • {alert.remainingCapacity} capacity remaining
                      </div>
                    </div>
                    <StatusBadge status="URGENT" />
                  </div>
                ))}
                {notifications.nearCapacity.length > 3 && (
                  <div className="text-sm text-amber-300 text-center">
                    +{notifications.nearCapacity.length - 3} more alerts
                  </div>
                )}
              </div>
            </GlassCard>
          )}

          {notifications.consolidationOpportunities.length > 0 && (
            <GlassCard className="p-5 border-blue-400/20 bg-blue-400/5">
              <div className="flex items-center gap-3 mb-4">
                <Truck className="w-5 h-5 text-blue-400" />
                <div className="font-semibold text-blue-200">Consolidation Opportunities</div>
              </div>
              <div className="space-y-3">
                {notifications.consolidationOpportunities.slice(0, 3).map((opportunity, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-blue-400/10 rounded-lg border border-blue-400/20">
                    <div>
                      <div className="font-medium text-blue-200">{opportunity.buildNumber}</div>
                      <div className="text-sm text-blue-300">
                        {opportunity.utilizationPercentage.toFixed(1)}% utilized • {opportunity.shippingMethod}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-blue-200 font-medium">~{opportunity.potentialConsolidation}</div>
                      <div className="text-xs text-blue-300">potential merges</div>
                    </div>
                  </div>
                ))}
                {notifications.consolidationOpportunities.length > 3 && (
                  <div className="text-sm text-blue-300 text-center">
                    +{notifications.consolidationOpportunities.length - 3} more opportunities
                  </div>
                )}
              </div>
            </GlassCard>
          )}
        </div>
      )}

      {/* Delivery Method Efficiency */}
      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-white">Delivery Method Efficiency</h3>
            <p className="text-slate-400">Performance analysis by shipping method</p>
          </div>
          <div className="flex items-center gap-2">
            <PieChart className="w-5 h-5 text-slate-400" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Object.entries(deliveryMethodEfficiency).map(([method, stats]) => (
            <div key={method} className="p-4 bg-white/5 rounded-lg border border-white/10">
              <div className="flex items-center justify-between mb-3">
                <div className="font-semibold text-white">{method.replace('_', ' ')}</div>
                <div className="text-sm text-slate-400">{stats.count} shipments</div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-300">Avg Utilization:</span>
                  <span className="font-medium text-white">{stats.avgUtilization.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-300">Total Orders:</span>
                  <span className="font-medium text-white">{stats.totalOrders}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-300">Total Value:</span>
                  <span className="font-medium text-white">{formatCurrency(stats.totalValue)}</span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      stats.avgUtilization >= 75 
                        ? 'bg-lime-400' 
                        : stats.avgUtilization >= 50 
                          ? 'bg-orange-400' 
                          : 'bg-red-400'
                    }`}
                    style={{ width: `${Math.min(stats.avgUtilization, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Volume Utilization Details */}
      <GlassCard className="overflow-hidden">
        <div className="p-5 flex items-center justify-between border-b border-white/10">
          <div>
            <h3 className="text-xl font-bold text-white">Volume Utilization Details</h3>
            <p className="text-slate-400">Individual shipment performance and optimization opportunities</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" className="px-3 py-1.5 text-xs">
              <BarChart3 className="w-4 h-4 mr-1" />
              View Chart
            </Button>
            <Button variant="ghost" className="px-3 py-1.5 text-xs">
              <Filter className="w-4 h-4 mr-1" />
              Filter
            </Button>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-white/5">
              <tr>
                <th className="text-left py-3 px-4 font-medium text-slate-300">Shipment</th>
                <th className="text-left py-3 px-4 font-medium text-slate-300">Method</th>
                <th className="text-left py-3 px-4 font-medium text-slate-300">Status</th>
                <th className="text-right py-3 px-4 font-medium text-slate-300">Orders</th>
                <th className="text-right py-3 px-4 font-medium text-slate-300">Quantity</th>
                <th className="text-right py-3 px-4 font-medium text-slate-300">Utilization</th>
                <th className="text-right py-3 px-4 font-medium text-slate-300">Value</th>
                <th className="text-center py-3 px-4 font-medium text-slate-300">Optimal</th>
              </tr>
            </thead>
            <tbody>
              {volumeUtilization.map((shipment, index) => (
                <tr key={shipment.shipmentId} className={index % 2 === 0 ? 'bg-white/2' : ''}>
                  <td className="py-3 px-4">
                    <div className="font-medium text-white">{shipment.buildNumber}</div>
                    <div className="text-xs text-slate-400">
                      {new Date(shipment.createdAt).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-slate-300">{shipment.shippingMethod}</td>
                  <td className="py-3 px-4">
                    <StatusBadge status={shipment.status} />
                  </td>
                  <td className="py-3 px-4 text-right text-white">{shipment.orderCount}</td>
                  <td className="py-3 px-4 text-right text-white">
                    {shipment.totalQuantity} / {shipment.maxCapacity}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 bg-white/10 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            shipment.utilizationPercentage >= 90
                              ? 'bg-red-400'
                              : shipment.utilizationPercentage >= 75
                              ? 'bg-lime-400'
                              : shipment.utilizationPercentage >= 50
                              ? 'bg-orange-400'
                              : 'bg-red-400'
                          }`}
                          style={{ width: `${Math.min(shipment.utilizationPercentage, 100)}%` }}
                        />
                      </div>
                      <span className="text-white font-medium min-w-[3rem]">
                        {shipment.utilizationPercentage.toFixed(1)}%
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right text-white font-medium">
                    {formatCurrency(shipment.totalValue)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {shipment.isOptimal ? (
                      <CheckCircle className="w-5 h-5 text-lime-400 mx-auto" />
                    ) : (
                      <Clock className="w-5 h-5 text-orange-400 mx-auto" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* Cost Optimization Recommendations */}
      {costOptimization.improvementOpportunities.length > 0 && (
        <GlassCard className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <Settings className="w-6 h-6 text-purple-400" />
            <div>
              <h3 className="text-xl font-bold text-white">Cost Optimization Recommendations</h3>
              <p className="text-slate-400">Actionable insights to improve efficiency and reduce costs</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {costOptimization.improvementOpportunities.slice(0, 6).map((opportunity, index) => (
              <div key={index} className="p-4 bg-purple-400/5 rounded-lg border border-purple-400/20">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium text-purple-200">{opportunity.buildNumber}</div>
                  <div className="text-purple-300 font-semibold">
                    +{opportunity.potentialIncrease.toFixed(1)}%
                  </div>
                </div>
                <div className="text-sm text-purple-300 mb-2">
                  Current: {opportunity.currentUtilization.toFixed(1)}% utilization
                </div>
                <div className="text-xs text-slate-400">
                  Potential savings: {formatCurrency(opportunity.estimatedSavings)}
                </div>
              </div>
            ))}
          </div>
          {costOptimization.improvementOpportunities.length > 6 && (
            <div className="mt-4 text-center">
              <Button variant="ghost" className="text-purple-300">
                View All {costOptimization.improvementOpportunities.length} Opportunities
              </Button>
            </div>
          )}
        </GlassCard>
      )}
    </div>
  );
}

export default ShipmentAnalytics;