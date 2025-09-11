import { NextRequest, NextResponse } from 'next/server';
import { loadBlankCapPricingServer } from '@/lib/server/webflow-server';
import { getBaseProductPricing, loadBlankCapPricing } from '@/lib/pricing-server';

export async function POST(request: NextRequest) {
 try {
  const body = await request.json();
  const { priceTier = 'Tier 1' } = body; // Default to Tier 1 if not provided

  // First try to load Webflow pricing data
  try {
   const blankCapPricingData = await loadBlankCapPricingServer();
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

  // Fallback to centralized CSV pricing for consistency
  const centralizedPricing = await getBaseProductPricing(priceTier);
  return NextResponse.json(centralizedPricing || {});

 } catch (error) {
  console.error('Error fetching blank cap pricing:', error);
  
  // Final fallback to default CSV pricing
  const defaultPricing = await getBaseProductPricing('Tier 1');
  return NextResponse.json(defaultPricing || {});
 }
}

// Add GET method for fetching all pricing data
export async function GET() {
 try {
  // Try to load all pricing data from server
  const blankCapPricingData = await loadBlankCapPricingServer();
  
  if (blankCapPricingData.length > 0) {
   return NextResponse.json({ 
    pricing: blankCapPricingData,
    source: 'csv'
   });
  }
 } catch (error) {
  console.warn('Server pricing unavailable, using fallbacks:', error);
 }
 
 // Fallback to CSV pricing
 const csvPricing = await loadBlankCapPricing();
 const fallbackPricing = csvPricing.map(tier => ({
  Name: tier.name,
  Slug: tier.name.toLowerCase().replace(' ', '-'),
  price48: tier.price48,
  price144: tier.price144,
  price576: tier.price576,
  price1152: tier.price1152,
  price2880: tier.price2880,
  price10000: tier.price10000,
 }));
 
 return NextResponse.json({ 
  pricing: fallbackPricing,
  source: 'fallback'
 });
}
