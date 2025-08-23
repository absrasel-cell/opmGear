import { NextRequest, NextResponse } from 'next/server';
import { loadCustomizationPricing } from '@/lib/pricing';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { itemName } = body;

    if (!itemName) {
      return NextResponse.json(
        { error: 'Item name is required' },
        { status: 400 }
      );
    }

    // Load customization pricing data
    const customizationPricingData = await loadCustomizationPricing();
    
    // Find matching pricing based on the item name
    const pricing = customizationPricingData.find(p => 
      p.Name.toLowerCase() === itemName.toLowerCase()
    );
    
    if (!pricing) {
      return NextResponse.json(
        { error: `Pricing not found for item: ${itemName}` },
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
      price20000: pricing.price20000,
    });

  } catch (error) {
    console.error('Error fetching customization pricing:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pricing data' },
      { status: 500 }
    );
  }
}
