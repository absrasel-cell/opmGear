import { NextRequest, NextResponse } from 'next/server';
import { clearPricingCache } from '@/lib/pricing/pricing-service';

export async function POST(request: NextRequest) {
  try {
    console.log('🧹 [DEBUG] Clearing pricing cache...');

    clearPricingCache();

    console.log('✅ [DEBUG] Cache cleared successfully');

    return NextResponse.json({
      message: 'Pricing cache cleared successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [DEBUG] Cache clear failed:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}