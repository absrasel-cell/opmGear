import { NextRequest, NextResponse } from 'next/server';
import { getProductInfoBySpecs } from '@/lib/pricing/pricing-service';

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 [API] Product info request received');

    const capSpecs = await request.json();
    console.log('📋 [API] Cap specifications received:', JSON.stringify(capSpecs, null, 2));

    const productInfo = await getProductInfoBySpecs(capSpecs);
    console.log('✅ [API] Product info result:', JSON.stringify(productInfo, null, 2));

    return NextResponse.json({
      success: true,
      data: productInfo
    });

  } catch (error) {
    console.error('❌ [API] Product info error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get product information'
      },
      { status: 500 }
    );
  }
}