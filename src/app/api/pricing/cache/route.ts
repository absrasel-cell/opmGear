/**
 * Cache Management API Endpoint
 * Monitor and manage pricing cache performance
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getCacheStats,
  clearPricingCache,
  invalidateCacheByCategory,
  preWarmCache
} from '@/lib/pricing/pricing-service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'stats':
        const stats = getCacheStats();
        return NextResponse.json({
          success: true,
          cacheStats: stats,
          recommendations: generateCacheRecommendations(stats),
          timestamp: new Date().toISOString()
        });

      case 'health':
        const healthStats = getCacheStats();
        const isHealthy = healthStats.hitRate > 80 && healthStats.cacheSize < 10000;

        return NextResponse.json({
          success: true,
          healthy: isHealthy,
          status: isHealthy ? 'optimal' : 'needs-attention',
          stats: healthStats,
          thresholds: {
            minHitRate: 80,
            maxCacheSize: 10000
          },
          timestamp: new Date().toISOString()
        });

      default:
        return NextResponse.json({
          endpoint: 'Cache Management API',
          availableActions: {
            stats: 'Get cache statistics',
            health: 'Check cache health status',
            clear: 'Clear entire cache (POST)',
            invalidate: 'Invalidate by category (POST)',
            prewarm: 'Pre-warm cache (POST)'
          },
          usage: {
            stats: 'GET /api/pricing/cache?action=stats',
            health: 'GET /api/pricing/cache?action=health',
            clear: 'POST /api/pricing/cache {"action": "clear"}',
            invalidate: 'POST /api/pricing/cache {"action": "invalidate", "category": "product"}',
            prewarm: 'POST /api/pricing/cache {"action": "prewarm"}'
          }
        });
    }

  } catch (error: any) {
    console.error('❌ [API] Cache management error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to perform cache operation',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await request.json();
    const { action, category } = body;

    // Verify admin access (in production, add proper authentication)
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.includes('admin')) {
      return NextResponse.json(
        { error: 'Admin access required for cache operations' },
        { status: 401 }
      );
    }

    switch (action) {
      case 'clear':
        clearPricingCache();
        return NextResponse.json({
          success: true,
          message: 'Pricing cache cleared successfully',
          responseTime: `${Date.now() - startTime}ms`,
          timestamp: new Date().toISOString()
        });

      case 'invalidate':
        if (!category) {
          return NextResponse.json(
            { error: 'Category is required for invalidation' },
            { status: 400 }
          );
        }

        invalidateCacheByCategory(category);
        return NextResponse.json({
          success: true,
          message: `Cache invalidated for category: ${category}`,
          category,
          responseTime: `${Date.now() - startTime}ms`,
          timestamp: new Date().toISOString()
        });

      case 'prewarm':
        // Run pre-warming in background
        preWarmCache().catch(console.error);

        return NextResponse.json({
          success: true,
          message: 'Cache pre-warming started in background',
          estimatedDuration: '30-60 seconds',
          responseTime: `${Date.now() - startTime}ms`,
          timestamp: new Date().toISOString()
        });

      case 'optimize':
        // Performance optimization routine
        const statsBeforeOptimization = getCacheStats();

        // Clear expired entries and optimize
        clearPricingCache();
        preWarmCache().catch(console.error);

        return NextResponse.json({
          success: true,
          message: 'Cache optimization completed',
          statsBeforeOptimization,
          actions: ['cleared_expired_entries', 'started_prewarm'],
          responseTime: `${Date.now() - startTime}ms`,
          timestamp: new Date().toISOString()
        });

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    console.error('❌ [API] Cache operation error:', error);

    return NextResponse.json({
      success: false,
      error: 'Failed to perform cache operation',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      responseTime: `${responseTime}ms`
    }, { status: 500 });
  }
}

// Generate cache performance recommendations
function generateCacheRecommendations(stats: any): string[] {
  const recommendations: string[] = [];

  if (stats.hitRate < 70) {
    recommendations.push('Cache hit rate is low. Consider pre-warming cache with common queries.');
  }

  if (stats.hitRate > 95) {
    recommendations.push('Excellent cache performance! Consider increasing cache TTL for better efficiency.');
  }

  if (stats.cacheSize > 5000) {
    recommendations.push('Cache size is large. Consider implementing cache size limits or LRU eviction.');
  }

  if (stats.missCount > stats.hitCount) {
    recommendations.push('More cache misses than hits. Review caching strategy and TTL settings.');
  }

  if (recommendations.length === 0) {
    recommendations.push('Cache performance is optimal. No immediate optimizations needed.');
  }

  return recommendations;
}

export async function DELETE(request: NextRequest) {
  try {
    // Verify admin access
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.includes('admin')) {
      return NextResponse.json(
        { error: 'Admin access required for cache deletion' },
        { status: 401 }
      );
    }

    const statsBeforeClear = getCacheStats();
    clearPricingCache();

    return NextResponse.json({
      success: true,
      message: 'All cache data cleared',
      statsBeforeClear,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ [API] Cache deletion error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to clear cache',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    }, { status: 500 });
  }
}