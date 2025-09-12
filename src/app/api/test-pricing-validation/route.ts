import { NextRequest, NextResponse } from 'next/server';
import { validateAllCriticalPricing } from '@/lib/ai-pricing-validator';

export async function GET(request: NextRequest) {
  try {
    console.log('🚨 [TEST-PRICING] Starting critical pricing validation...');
    
    const validationResults = await validateAllCriticalPricing();
    
    return NextResponse.json({
      success: true,
      allPassed: validationResults.allPassed,
      summary: validationResults.summary,
      results: validationResults.results,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ [TEST-PRICING] Error running validation:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}