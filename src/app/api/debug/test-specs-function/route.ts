import { NextRequest, NextResponse } from 'next/server';
import { getProductInfoBySpecs } from '@/lib/pricing/pricing-service';

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 [DEBUG] Testing getProductInfoBySpecs function directly...');

    // Test case that should work
    const testSpecs = {
      panelCount: 7,
      billShape: "curved",
      profile: "mid",
      structure: "structured"
    };

    console.log('🧪 [DEBUG] Input specs:', testSpecs);

    const startTime = Date.now();
    const result = await getProductInfoBySpecs(testSpecs);
    const duration = Date.now() - startTime;

    console.log('🧪 [DEBUG] Function result:', result);
    console.log('🧪 [DEBUG] Duration:', duration + 'ms');

    // Also test a simpler case
    const simpleSpecs = {
      panelCount: 7
    };

    console.log('🧪 [DEBUG] Testing simple specs:', simpleSpecs);
    const simpleResult = await getProductInfoBySpecs(simpleSpecs);
    console.log('🧪 [DEBUG] Simple result:', simpleResult);

    // Test exact product name
    const exactNameSpecs = {
      productName: "7P CrownFrame 7 MSCS"
    };

    console.log('🧪 [DEBUG] Testing exact product name:', exactNameSpecs);
    const exactResult = await getProductInfoBySpecs(exactNameSpecs);
    console.log('🧪 [DEBUG] Exact name result:', exactResult);

    return NextResponse.json({
      complexTest: {
        input: testSpecs,
        output: result,
        success: !!result,
        duration: duration + 'ms'
      },
      simpleTest: {
        input: simpleSpecs,
        output: simpleResult,
        success: !!simpleResult
      },
      exactNameTest: {
        input: exactNameSpecs,
        output: exactResult,
        success: !!exactResult
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [DEBUG] getProductInfoBySpecs test failed:', error);
    return NextResponse.json(
      { error: error.message, stack: error.stack },
      { status: 500 }
    );
  }
}