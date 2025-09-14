/**
 * Performance Metrics and Monitoring API Endpoint
 * Real-time pricing system performance monitoring
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCacheStats } from '@/lib/pricing/pricing-service';
import { getAIPricingMetrics } from '@/lib/pricing/ai-pricing-optimized';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Database } from '@/types/database';

// Performance tracking storage (in production, use Redis or database)
let performanceMetrics = {
  requestCount: 0,
  totalResponseTime: 0,
  errorCount: 0,
  lastHourRequests: [] as number[],
  endpoints: {} as Record<string, {
    calls: number;
    totalTime: number;
    errors: number;
    avgResponseTime: number;
  }>
};

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    const { searchParams } = new URL(request.url);
    const metric = searchParams.get('metric');
    const period = searchParams.get('period') || '1h';

    // Get cache statistics
    const cacheStats = getCacheStats();

    // Get AI pricing metrics
    const aiMetrics = await getAIPricingMetrics();

    // Calculate derived metrics
    const averageResponseTime = performanceMetrics.totalResponseTime /
                               Math.max(performanceMetrics.requestCount, 1);

    const errorRate = (performanceMetrics.errorCount /
                      Math.max(performanceMetrics.requestCount, 1)) * 100;

    // Database performance metrics
    let dbMetrics;
    try {
      const supabase = createClientComponentClient<Database>();

      // Get cache performance from database views
      const { data: cacheViewStats } = await supabase
        .from('pricing_cache_stats')
        .select('*');

      const { data: aiContextStats } = await supabase
        .from('ai_context_stats')
        .select('*')
        .limit(24);

      dbMetrics = {
        cacheViewStats: cacheViewStats || [],
        aiContextStats: aiContextStats || []
      };
    } catch (dbError) {
      console.warn('⚠️ [METRICS] Database metrics unavailable:', dbError);
      dbMetrics = null;
    }

    const responseTime = Date.now() - startTime;

    // Update metrics
    performanceMetrics.requestCount++;
    performanceMetrics.totalResponseTime += responseTime;

    const metrics = {
      system: {
        status: 'operational',
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        nodeVersion: process.version
      },
      performance: {
        requests: {
          total: performanceMetrics.requestCount,
          averageResponseTime: parseFloat(averageResponseTime.toFixed(2)),
          currentResponseTime: responseTime,
          errorRate: parseFloat(errorRate.toFixed(2)),
          throughput: calculateThroughput()
        },
        cache: {
          ...cacheStats,
          efficiency: cacheStats.hitRate > 90 ? 'Excellent' :
                     cacheStats.hitRate > 70 ? 'Good' :
                     cacheStats.hitRate > 50 ? 'Average' : 'Poor'
        },
        ai: aiMetrics,
        database: dbMetrics
      },
      endpoints: Object.entries(performanceMetrics.endpoints).map(([endpoint, stats]) => ({
        endpoint,
        ...stats,
        health: stats.errors / Math.max(stats.calls, 1) < 0.05 ? 'healthy' : 'degraded'
      })),
      thresholds: {
        responseTime: {
          excellent: '< 50ms',
          good: '< 100ms',
          acceptable: '< 200ms',
          poor: '> 200ms'
        },
        cacheHitRate: {
          excellent: '> 90%',
          good: '> 70%',
          acceptable: '> 50%',
          poor: '< 50%'
        },
        errorRate: {
          excellent: '< 0.1%',
          good: '< 1%',
          acceptable: '< 5%',
          poor: '> 5%'
        }
      },
      alerts: generateAlerts(cacheStats, errorRate, averageResponseTime),
      timestamp: new Date().toISOString()
    };

    // Return specific metric if requested
    if (metric) {
      const specificMetric = getSpecificMetric(metrics, metric);
      return NextResponse.json({
        success: true,
        metric,
        data: specificMetric,
        timestamp: metrics.timestamp
      });
    }

    return NextResponse.json({
      success: true,
      metrics,
      responseTime: `${responseTime}ms`
    }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Response-Time': `${responseTime}ms`,
        'X-System-Status': metrics.system.status
      }
    });

  } catch (error: any) {
    performanceMetrics.errorCount++;
    const responseTime = Date.now() - startTime;

    console.error('❌ [API] Metrics error:', error);

    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve metrics',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      responseTime: `${responseTime}ms`
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { endpoint, responseTime, success = true, customMetric } = body;

    // Track endpoint performance
    if (endpoint && responseTime) {
      if (!performanceMetrics.endpoints[endpoint]) {
        performanceMetrics.endpoints[endpoint] = {
          calls: 0,
          totalTime: 0,
          errors: 0,
          avgResponseTime: 0
        };
      }

      const endpointStats = performanceMetrics.endpoints[endpoint];
      endpointStats.calls++;
      endpointStats.totalTime += responseTime;

      if (!success) {
        endpointStats.errors++;
      }

      endpointStats.avgResponseTime = endpointStats.totalTime / endpointStats.calls;
    }

    // Handle custom metrics
    if (customMetric) {
      // Store custom metrics (in production, use proper storage)
      console.log('📊 [METRICS] Custom metric received:', customMetric);
    }

    return NextResponse.json({
      success: true,
      message: 'Metrics recorded successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ [API] Metrics recording error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to record metrics'
    }, { status: 500 });
  }
}

// Helper functions

function calculateThroughput(): number {
  const now = Date.now();
  const oneHourAgo = now - (60 * 60 * 1000);

  // In production, implement proper time-series data
  return performanceMetrics.requestCount > 0 ?
    (performanceMetrics.requestCount / (process.uptime() / 3600)) : 0;
}

function generateAlerts(cacheStats: any, errorRate: number, avgResponseTime: number): string[] {
  const alerts: string[] = [];

  if (cacheStats.hitRate < 50) {
    alerts.push(`🚨 LOW CACHE HIT RATE: ${cacheStats.hitRate.toFixed(1)}% - Consider cache optimization`);
  }

  if (errorRate > 5) {
    alerts.push(`🚨 HIGH ERROR RATE: ${errorRate.toFixed(2)}% - System degradation detected`);
  }

  if (avgResponseTime > 200) {
    alerts.push(`🚨 SLOW RESPONSE TIME: ${avgResponseTime.toFixed(1)}ms - Performance degradation`);
  }

  if (cacheStats.cacheSize > 10000) {
    alerts.push(`⚠️ LARGE CACHE SIZE: ${cacheStats.cacheSize} entries - Memory pressure risk`);
  }

  if (alerts.length === 0) {
    alerts.push('✅ All systems operating normally');
  }

  return alerts;
}

function getSpecificMetric(metrics: any, metricName: string): any {
  const metricMap: Record<string, any> = {
    'cache': metrics.performance.cache,
    'ai': metrics.performance.ai,
    'requests': metrics.performance.requests,
    'system': metrics.system,
    'endpoints': metrics.endpoints,
    'alerts': metrics.alerts
  };

  return metricMap[metricName] || null;
}

// Real-time metrics streaming endpoint
export async function PATCH(request: NextRequest) {
  try {
    // Reset all metrics
    performanceMetrics = {
      requestCount: 0,
      totalResponseTime: 0,
      errorCount: 0,
      lastHourRequests: [],
      endpoints: {}
    };

    return NextResponse.json({
      success: true,
      message: 'Metrics reset successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ [API] Metrics reset error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to reset metrics'
    }, { status: 500 });
  }
}