import { NextRequest, NextResponse } from 'next/server';
import { loadBlankCapPricing } from '../../lib/webflow';
import { getBaseProductPricing } from '@/lib/pricing';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { priceTier = 'Tier 1' } = body; // Default to Tier 1 if not provided

    // First try to load Webflow pricing data
    try {
      const blankCapPricingData = await loadBlankCapPricing();
      const pricing = blankCapPricingData.find((p: any) => p.Name === priceTier);
      
      if (pricing) {
        return NextResponse.json({
          price48: pricing.price48,
          price144: pricing.price144,
          price576: pricing.price576,
          price1152: pricing.price1152,
          price2880: pricing.price2880,
          price10000: pricing.price10000,
        });
      }
    } catch (webflowError) {
      console.warn('Webflow pricing unavailable, falling back to centralized pricing:', webflowError);
    }

    // Fallback to centralized pricing for consistency
    const centralizedPricing = getBaseProductPricing(priceTier);
    return NextResponse.json(centralizedPricing);

  } catch (error) {
    console.error('Error fetching blank cap pricing:', error);
    
    // Final fallback to default centralized pricing
    const defaultPricing = getBaseProductPricing();
    return NextResponse.json(defaultPricing);
  }
}

// Add GET method for simple usage
export async function GET() {
  const defaultPricing = getBaseProductPricing();
  return NextResponse.json(defaultPricing);
}
