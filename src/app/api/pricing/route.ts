import { NextRequest, NextResponse } from 'next/server';
// Removed Prisma - migrated to Supabase

// Fallback pricing tiers in case database is unavailable
const FALLBACK_PRICING_TIERS = {
 'Tier 1': {
  price48: 1.80,
  price144: 1.50,
  price576: 1.45,
  price1152: 1.42,
  price2880: 1.38,
  price10000: 1.35,
 },
 'Tier 2': {
  price48: 2.20,
  price144: 1.60,
  price576: 1.50,
  price1152: 1.45,
  price2880: 1.40,
  price10000: 1.35,
 },
 'Tier 3': {
  price48: 2.40,
  price144: 1.70,
  price576: 1.60,
  price1152: 1.47,
  price2880: 1.44,
  price10000: 1.41,
 }
};

export async function GET(request: NextRequest) {
 try {
  const { searchParams } = new URL(request.url);
  const tier = searchParams.get('tier');
  const withMargins = searchParams.get('withMargins') === 'true';

  // Load pricing tiers from database
  let pricingTiers: Record<string, any> = {};
  
  try {
   const tiers = await prisma.pricingTier.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' }
   });
   
   // Convert to the expected format
   tiers.forEach((dbTier: any) => {
    pricingTiers[dbTier.name] = {
     price48: Number(dbTier.price48),
     price144: Number(dbTier.price144),
     price576: Number(dbTier.price576),
     price1152: Number(dbTier.price1152),
     price2880: Number(dbTier.price2880),
     price10000: Number(dbTier.price10000),
    };
   });
  } catch (dbError) {
   console.error('Error loading pricing tiers from database:', dbError);
   pricingTiers = FALLBACK_PRICING_TIERS;
  }

  // Use fallback if no tiers found
  if (Object.keys(pricingTiers).length === 0) {
   pricingTiers = FALLBACK_PRICING_TIERS;
  }

  // Load margin settings if requested
  let marginSettings = null;
  if (withMargins) {
   try {
    marginSettings = await prisma.simplifiedMarginSetting.findFirst({
     where: { 
      category: 'BLANK_CAPS',
      isActive: true 
     }
    });
   } catch (marginError) {
    console.error('Error loading margin settings:', marginError);
   }
  }

  // If specific tier is requested, return just that tier
  if (tier && pricingTiers[tier]) {
   let tierPricing = pricingTiers[tier];
   
   // Apply margins if available
   if (marginSettings && withMargins) {
    const marginPercent = Number(marginSettings.marginPercent) || 0;
    const flatMargin = Number(marginSettings.flatMargin) || 0;
    
    if (marginPercent > 0 || flatMargin > 0) {
     const applyMargin = (factoryCost: number) => {
      let sellingPrice = factoryCost;
      if (marginPercent > 0) {
       sellingPrice = factoryCost * (1 + marginPercent / 100);
      } else if (flatMargin > 0) {
       sellingPrice = factoryCost + flatMargin;
      }
      return Math.round(sellingPrice * 100) / 100; // Round to 2 decimal places
     };
     
     tierPricing = {
      price48: applyMargin(tierPricing.price48),
      price144: applyMargin(tierPricing.price144),
      price576: applyMargin(tierPricing.price576),
      price1152: applyMargin(tierPricing.price1152),
      price2880: applyMargin(tierPricing.price2880),
      price10000: applyMargin(tierPricing.price10000),
     };
    }
   }
   
   return NextResponse.json({
    tier: tier,
    pricing: tierPricing,
    marginSettings: marginSettings ? {
     marginPercent: Number(marginSettings.marginPercent),
     flatMargin: Number(marginSettings.flatMargin),
     activeType: Number(marginSettings.marginPercent) > 0 ? 'percentage' : 'flat'
    } : null
   });
  }

  // Apply margins to all tiers if requested
  if (marginSettings && withMargins) {
   const marginPercent = Number(marginSettings.marginPercent) || 0;
   const flatMargin = Number(marginSettings.flatMargin) || 0;
   
   if (marginPercent > 0 || flatMargin > 0) {
    const applyMargin = (factoryCost: number) => {
     let sellingPrice = factoryCost;
     if (marginPercent > 0) {
      sellingPrice = factoryCost * (1 + marginPercent / 100);
     } else if (flatMargin > 0) {
      sellingPrice = factoryCost + flatMargin;
     }
     return Math.round(sellingPrice * 100) / 100; // Round to 2 decimal places
    };
    
    Object.keys(pricingTiers).forEach(tierName => {
     const tier = pricingTiers[tierName];
     pricingTiers[tierName] = {
      price48: applyMargin(tier.price48),
      price144: applyMargin(tier.price144),
      price576: applyMargin(tier.price576),
      price1152: applyMargin(tier.price1152),
      price2880: applyMargin(tier.price2880),
      price10000: applyMargin(tier.price10000),
     };
    });
   }
  }

  return NextResponse.json({
   tiers: pricingTiers,
   marginSettings: marginSettings ? {
    marginPercent: Number(marginSettings.marginPercent),
    flatMargin: Number(marginSettings.flatMargin),
    activeType: Number(marginSettings.marginPercent) > 0 ? 'percentage' : 'flat'
   } : null
  });

 } catch (error) {
  console.error('Error in pricing API:', error);
  
  // Return fallback data on error
  const tierParam = new URL(request.url).searchParams.get('tier');
  if (tierParam && FALLBACK_PRICING_TIERS[tierParam as keyof typeof FALLBACK_PRICING_TIERS]) {
   return NextResponse.json({
    tier: tierParam,
    pricing: FALLBACK_PRICING_TIERS[tierParam as keyof typeof FALLBACK_PRICING_TIERS],
    marginSettings: null
   });
  }
  
  return NextResponse.json({
   tiers: FALLBACK_PRICING_TIERS,
   marginSettings: null
  });
 }
}