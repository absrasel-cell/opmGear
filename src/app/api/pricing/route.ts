import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { loadBlankCapPricing } from '@/lib/pricing-server';

// REMOVED: All hardcoded pricing fallbacks have been eliminated.
// The system now exclusively uses live CSV data for accurate pricing.

export async function GET(request: NextRequest) {
 try {
  const { searchParams } = new URL(request.url);
  const tier = searchParams.get('tier');
  const withMargins = searchParams.get('withMargins') === 'true';

  // Load pricing tiers from database
  let pricingTiers: Record<string, any> = {};
  
  try {
   const { data: tiers, error: tiersError } = await supabaseAdmin
     .from('pricing_tiers')
     .select('*')
     .eq('isActive', true)
     .order('name', { ascending: true });
   
   if (tiersError) {
     console.error('Supabase error fetching pricing tiers:', tiersError);
     throw tiersError;
   }
   
   // Convert to the expected format
   tiers?.forEach((dbTier: any) => {
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
   console.error('Error loading pricing tiers from database, using CSV fallback:', dbError);
   // Load from CSV as fallback
   const csvPricing = await loadBlankCapPricing();
   csvPricing.forEach((tier) => {
     pricingTiers[tier.name] = {
       price48: tier.price48,
       price144: tier.price144,
       price576: tier.price576,
       price1152: tier.price1152,
       price2880: tier.price2880,
       price10000: tier.price10000,
     };
   });
  }

  // Use CSV fallback if no tiers found
  if (Object.keys(pricingTiers).length === 0) {
   console.warn('No pricing tiers found in database, loading from CSV');
   const csvPricing = await loadBlankCapPricing();
   csvPricing.forEach((tier) => {
     pricingTiers[tier.name] = {
       price48: tier.price48,
       price144: tier.price144,
       price576: tier.price576,
       price1152: tier.price1152,
       price2880: tier.price2880,
       price10000: tier.price10000,
     };
   });
  }

  // Load margin settings if requested
  let marginSettings = null;
  if (withMargins) {
   try {
    const { data: margins, error: marginsError } = await supabaseAdmin
      .from('simplified_margin_settings')
      .select('*')
      .eq('category', 'BLANK_CAPS')
      .eq('isActive', true)
      .single();

    if (marginsError && marginsError.code !== 'PGRST116') {
      console.error('Supabase error fetching margin settings:', marginsError);
      throw marginsError;
    }

    marginSettings = margins;
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
  
  // Return CSV fallback data on error
  const tierParam = new URL(request.url).searchParams.get('tier');
  try {
    const csvPricing = await loadBlankCapPricing();
    const csvPricingTiers: Record<string, any> = {};
    csvPricing.forEach((tier) => {
      csvPricingTiers[tier.name] = {
        price48: tier.price48,
        price144: tier.price144,
        price576: tier.price576,
        price1152: tier.price1152,
        price2880: tier.price2880,
        price10000: tier.price10000,
      };
    });
    
    if (tierParam && csvPricingTiers[tierParam]) {
      return NextResponse.json({
        tier: tierParam,
        pricing: csvPricingTiers[tierParam],
        marginSettings: null
      });
    }
    
    return NextResponse.json({
      tiers: csvPricingTiers,
      marginSettings: null
    });
  } catch (csvError) {
    console.error('CSV fallback failed:', csvError);
    return NextResponse.json({
      error: 'Unable to load pricing data',
      tiers: {},
      marginSettings: null
    }, { status: 500 });
  }
 }
}