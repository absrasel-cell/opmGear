import { NextRequest, NextResponse } from 'next/server';
import { loadBlankCapPricing } from '../../lib/webflow';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { priceTier } = body;

    if (!priceTier) {
      return NextResponse.json(
        { error: 'Price tier is required' },
        { status: 400 }
      );
    }

    // Load blank cap pricing data
    const blankCapPricingData = await loadBlankCapPricing();
    
    // Find matching pricing based on the price tier
    const pricing = blankCapPricingData.find((p: any) => p.Name === priceTier);
    
    if (!pricing) {
      return NextResponse.json(
        { error: `Pricing not found for tier: ${priceTier}` },
        { status: 404 }
      );
    }

    // Return the pricing data
    return NextResponse.json({
      price48: pricing.price48,
      price144: pricing.price144,
      price576: pricing.price576,
      price1152: pricing.price1152,
      price2880: pricing.price2880,
      price10000: pricing.price10000,
    });

  } catch (error) {
    console.error('Error fetching blank cap pricing:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pricing data' },
      { status: 500 }
    );
  }
}
