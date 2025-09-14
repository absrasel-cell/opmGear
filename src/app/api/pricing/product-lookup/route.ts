/**
 * Product Price Lookup API Endpoint
 * Ultra-fast product pricing with tier detection
 */

import { NextRequest, NextResponse } from 'next/server';
import { getProductPrice, getCacheStats } from '@/lib/pricing/pricing-service';
import { findProductTierFromDescription } from '@/lib/pricing/ai-pricing-optimized';

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    const { searchParams } = new URL(request.url);

    const tier = searchParams.get('tier');
    const quantity = searchParams.get('quantity');
    const description = searchParams.get('description');

    // Validation
    if (!quantity) {
      return NextResponse.json(
        {
          error: 'Missing required parameter: quantity',
          required: ['quantity'],
          optional: ['tier', 'description'],
          note: 'Either tier or description must be provided'
        },
        { status: 400 }
      );
    }

    const qty = parseInt(quantity);
    if (isNaN(qty) || qty < 1) {
      return NextResponse.json(
        { error: 'Invalid quantity. Must be a positive integer.' },
        { status: 400 }
      );
    }

    let productTier = tier;
    let aiDetected = false;

    // AI tier detection if description provided but no tier
    if (!tier && description) {
      productTier = await findProductTierFromDescription(description);
      aiDetected = true;
    } else if (!tier) {
      return NextResponse.json(
        { error: 'Either tier or description must be provided' },
        { status: 400 }
      );
    }

    // Get product pricing
    const result = await getProductPrice(productTier!, qty, description);

    const responseTime = Date.now() - startTime;
    const cacheStats = getCacheStats();

    return NextResponse.json({
      success: true,
      tier: productTier,
      quantity: qty,
      pricing: result,
      aiDetected,
      performance: {
        responseTime: `${responseTime}ms`,
        cached: responseTime < 20,
        cacheStats
      },
      timestamp: new Date().toISOString()
    }, {
      headers: {
        'Cache-Control': 'public, max-age=600, s-maxage=1800', // 10 min client, 30 min CDN
        'X-Response-Time': `${responseTime}ms`,
        'X-Tier-Detected': aiDetected ? 'true' : 'false'
      }
    });

  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    console.error('❌ [API] Product lookup error:', error);

    return NextResponse.json({
      success: false,
      error: 'Failed to lookup product pricing',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      performance: {
        responseTime: `${responseTime}ms`
      }
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await request.json();
    const { products } = body;

    if (!Array.isArray(products) || products.length === 0) {
      return NextResponse.json(
        {
          error: 'Invalid request body. Expected array of products.',
          example: {
            products: [
              {
                tier: "Tier 1",
                quantity: 144,
                description: "5-panel curved bill cap"
              },
              {
                description: "Trucker mesh back cap",
                quantity: 288
              }
            ]
          }
        },
        { status: 400 }
      );
    }

    const results = await Promise.allSettled(
      products.map(async (product: any) => {
        const { tier, quantity, description } = product;

        if (!quantity) {
          throw new Error('Quantity is required for each product');
        }

        const qty = parseInt(quantity);
        if (isNaN(qty) || qty < 1) {
          throw new Error('Invalid quantity. Must be a positive integer.');
        }

        let productTier = tier;
        let aiDetected = false;

        if (!tier && description) {
          productTier = await findProductTierFromDescription(description);
          aiDetected = true;
        } else if (!tier) {
          throw new Error('Either tier or description must be provided');
        }

        const pricing = await getProductPrice(productTier, qty, description);

        return {
          tier: productTier,
          quantity: qty,
          description: description || null,
          pricing,
          aiDetected
        };
      })
    );

    const successful = results
      .filter(r => r.status === 'fulfilled')
      .map(r => (r as PromiseFulfilledResult<any>).value);

    const failed = results
      .filter(r => r.status === 'rejected')
      .map((r, index) => ({
        index,
        error: (r as PromiseRejectedResult).reason.message
      }));

    const responseTime = Date.now() - startTime;
    const cacheStats = getCacheStats();

    return NextResponse.json({
      success: true,
      results: successful,
      errors: failed,
      summary: {
        total: products.length,
        successful: successful.length,
        failed: failed.length
      },
      performance: {
        responseTime: `${responseTime}ms`,
        averagePerProduct: `${(responseTime / products.length).toFixed(1)}ms`,
        cacheStats
      },
      timestamp: new Date().toISOString()
    }, {
      headers: {
        'Cache-Control': 'public, max-age=300, s-maxage=900',
        'X-Response-Time': `${responseTime}ms`,
        'X-Products-Processed': products.length.toString()
      }
    });

  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    console.error('❌ [API] Batch product lookup error:', error);

    return NextResponse.json({
      success: false,
      error: 'Failed to process batch product lookup',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      performance: {
        responseTime: `${responseTime}ms`
      }
    }, { status: 500 });
  }
}