/**
 * Fast Pricing Estimate API Endpoint
 * Sub-10ms response times with comprehensive pricing
 */

import { NextRequest, NextResponse } from 'next/server';
import { generatePricingEstimate, getCacheStats } from '@/lib/pricing/pricing-service';
import { getAICompletePricingEstimate } from '@/lib/pricing/ai-pricing-optimized';

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    const { searchParams } = new URL(request.url);

    // Required parameters
    const productTier = searchParams.get('tier');
    const quantity = searchParams.get('quantity');

    // Optional parameters
    const logoName = searchParams.get('logo_name');
    const logoSize = searchParams.get('logo_size');
    const logoApplication = searchParams.get('logo_application');
    const fabricName = searchParams.get('fabric_name');
    const closureName = searchParams.get('closure_name');
    const accessoryNames = searchParams.get('accessory_names')?.split(',');
    const deliveryMethod = searchParams.get('delivery_method');

    // Validation
    if (!productTier || !quantity) {
      return NextResponse.json(
        {
          error: 'Missing required parameters: tier and quantity',
          required: ['tier', 'quantity'],
          optional: ['logo_name', 'logo_size', 'logo_application', 'fabric_name', 'closure_name', 'accessory_names', 'delivery_method']
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

    // Generate estimate
    const estimate = await generatePricingEstimate(productTier, qty, {
      logoName: logoName || undefined,
      logoSize: logoSize || undefined,
      logoApplication: logoApplication || undefined,
      fabricName: fabricName || undefined,
      closureName: closureName || undefined,
      accessoryNames: accessoryNames?.filter(Boolean),
      deliveryMethod: deliveryMethod || undefined
    });

    const responseTime = Date.now() - startTime;
    const cacheStats = getCacheStats();

    return NextResponse.json({
      success: true,
      estimate,
      performance: {
        responseTime: `${responseTime}ms`,
        cached: responseTime < 50,
        cacheStats
      },
      timestamp: new Date().toISOString()
    }, {
      headers: {
        'Cache-Control': 'public, max-age=300, s-maxage=900', // 5 min client, 15 min CDN
        'X-Response-Time': `${responseTime}ms`,
        'X-Cache-Hit-Rate': `${cacheStats.hitRate.toFixed(1)}%`
      }
    });

  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    console.error('❌ [API] Quick estimate error:', error);

    return NextResponse.json({
      success: false,
      error: 'Failed to generate pricing estimate',
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
    const {
      productDescription,
      quantity,
      options = {}
    } = body;

    // Validation
    if (!productDescription || !quantity) {
      return NextResponse.json(
        {
          error: 'Missing required parameters: productDescription and quantity',
          example: {
            productDescription: "5-Panel flat bill mesh trucker cap",
            quantity: 144,
            options: {
              logoName: "3D Embroidery",
              logoSize: "Medium",
              logoApplication: "Direct",
              fabricName: "Polyester",
              closureName: "Snapback",
              accessoryNames: ["Custom Tag"],
              deliveryMethod: "Standard"
            }
          }
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

    // AI-powered estimate
    const result = await getAICompletePricingEstimate(productDescription, qty, options);

    const responseTime = Date.now() - startTime;
    const cacheStats = getCacheStats();

    return NextResponse.json({
      success: true,
      ...result,
      performance: {
        responseTime: `${responseTime}ms`,
        cached: responseTime < 100,
        cacheStats,
        aiProcessed: true
      },
      timestamp: new Date().toISOString()
    }, {
      headers: {
        'Cache-Control': 'public, max-age=180, s-maxage=600', // 3 min client, 10 min CDN
        'X-Response-Time': `${responseTime}ms`,
        'X-AI-Confidence': `${result.confidence}%`
      }
    });

  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    console.error('❌ [API] AI estimate error:', error);

    return NextResponse.json({
      success: false,
      error: 'Failed to generate AI pricing estimate',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      performance: {
        responseTime: `${responseTime}ms`
      }
    }, { status: 500 });
  }
}