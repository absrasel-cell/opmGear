/**
 * Bulk Pricing API Endpoint
 * High-performance batch pricing queries
 */

import { NextRequest, NextResponse } from 'next/server';
import { batchPricingLookup, getCacheStats } from '@/lib/pricing/pricing-service';
import { bulkAIPricing } from '@/lib/pricing/ai-pricing-optimized';

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await request.json();
    const { requests, mode = 'standard' } = body;

    if (!Array.isArray(requests) || requests.length === 0) {
      return NextResponse.json(
        {
          error: 'Invalid request body. Expected array of pricing requests.',
          example: {
            mode: "standard", // or "ai"
            requests: [
              {
                type: "product",
                name: "Tier 1",
                quantity: 144
              },
              {
                type: "logo",
                name: "3D Embroidery",
                quantity: 144,
                options: {
                  size: "Medium",
                  application: "Direct"
                }
              },
              {
                type: "fabric",
                name: "Polyester",
                quantity: 144
              }
            ]
          },
          aiExample: {
            mode: "ai",
            requests: [
              {
                description: "5-panel flat bill trucker cap",
                quantity: 144,
                options: {
                  logoName: "Embroidery",
                  fabricName: "Premium Mesh"
                }
              }
            ]
          }
        },
        { status: 400 }
      );
    }

    if (requests.length > 100) {
      return NextResponse.json(
        { error: 'Maximum 100 requests allowed per batch' },
        { status: 400 }
      );
    }

    let results;

    if (mode === 'ai') {
      // AI-powered bulk pricing with intelligent product detection
      results = await bulkAIPricing(requests);
    } else {
      // Standard bulk pricing
      const validationErrors = validateStandardRequests(requests);
      if (validationErrors.length > 0) {
        return NextResponse.json(
          {
            error: 'Invalid requests found',
            validationErrors,
            validTypes: ['product', 'logo', 'fabric', 'closure', 'accessory', 'delivery']
          },
          { status: 400 }
        );
      }

      results = await batchPricingLookup(requests);
    }

    const responseTime = Date.now() - startTime;
    const cacheStats = getCacheStats();

    // Calculate performance metrics
    const averagePerRequest = responseTime / requests.length;
    const throughput = (requests.length / responseTime) * 1000; // requests per second

    return NextResponse.json({
      success: true,
      mode,
      results,
      summary: {
        totalRequests: requests.length,
        successfulRequests: results.length,
        failedRequests: requests.length - results.length
      },
      performance: {
        responseTime: `${responseTime}ms`,
        averagePerRequest: `${averagePerRequest.toFixed(1)}ms`,
        throughput: `${throughput.toFixed(1)} req/sec`,
        cacheStats,
        efficiency: averagePerRequest < 50 ? 'Excellent' :
                   averagePerRequest < 100 ? 'Good' :
                   averagePerRequest < 200 ? 'Average' : 'Needs Optimization'
      },
      timestamp: new Date().toISOString()
    }, {
      headers: {
        'Cache-Control': 'public, max-age=180, s-maxage=600', // 3 min client, 10 min CDN
        'X-Response-Time': `${responseTime}ms`,
        'X-Requests-Processed': requests.length.toString(),
        'X-Processing-Mode': mode
      }
    });

  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    console.error('❌ [API] Bulk pricing error:', error);

    return NextResponse.json({
      success: false,
      error: 'Failed to process bulk pricing requests',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      performance: {
        responseTime: `${responseTime}ms`
      }
    }, { status: 500 });
  }
}

// Validate standard pricing requests
function validateStandardRequests(requests: any[]): string[] {
  const errors: string[] = [];
  const validTypes = ['product', 'logo', 'fabric', 'closure', 'accessory', 'delivery'];

  requests.forEach((req, index) => {
    if (!req.type) {
      errors.push(`Request ${index}: Missing 'type' field`);
    } else if (!validTypes.includes(req.type)) {
      errors.push(`Request ${index}: Invalid type '${req.type}'. Must be one of: ${validTypes.join(', ')}`);
    }

    if (!req.name && req.type !== 'logo') {
      errors.push(`Request ${index}: Missing 'name' field`);
    }

    if (!req.quantity) {
      errors.push(`Request ${index}: Missing 'quantity' field`);
    } else {
      const qty = parseInt(req.quantity);
      if (isNaN(qty) || qty < 1) {
        errors.push(`Request ${index}: Invalid quantity. Must be a positive integer`);
      }
    }

    // Logo-specific validation
    if (req.type === 'logo') {
      if (!req.options?.size || !req.options?.application) {
        errors.push(`Request ${index}: Logo requests require options.size and options.application`);
      }
    }
  });

  return errors;
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    endpoint: 'Bulk Pricing API',
    description: 'High-performance batch pricing queries',
    methods: ['POST'],
    capabilities: {
      standard: 'Standard pricing lookup for specific product types',
      ai: 'AI-powered pricing with intelligent product detection'
    },
    performance: {
      maxRequests: 100,
      targetResponseTime: '< 200ms',
      cacheEnabled: true
    },
    documentation: {
      standardMode: 'Specify exact product types (product, logo, fabric, etc.) with names',
      aiMode: 'Provide product descriptions for intelligent tier detection and pricing'
    }
  });
}