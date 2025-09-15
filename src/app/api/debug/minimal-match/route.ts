import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 [MINIMAL-MATCH] Starting minimal product matching test...');

    // Direct Supabase query without caching
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data: products, error } = await supabase
      .from('products')
      .select(`
        *,
        pricing_tier:pricing_tiers(*)
      `)
      .eq('is_active', true)
      .eq('panel_count', 7)  // Only get 7-panel products
      .order('name');

    if (error) {
      console.error('❌ [MINIMAL-MATCH] Database error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log(`✅ [MINIMAL-MATCH] Found ${products.length} 7-panel products`);

    // Test specs
    const capDetails = {
      panelCount: 7,
      billShape: "curved",
      profile: "mid",
      structure: "structured"
    };

    // Simple bill shape matching function
    function checkBillShapeMatch(requestedShape: string, productShape: string): boolean {
      const requested = requestedShape.toLowerCase().trim();
      const product = productShape.toLowerCase().trim();

      console.log(`🔍 [MINIMAL-MATCH] Comparing "${requested}" with "${product}"`);

      // Map user "curved" to database "slight curved" or "curved"
      if (requested === 'curved' || requested === 'curve') {
        const matches = product === 'curved' ||
               product === 'slight curved' ||
               product.includes('curved');
        console.log(`🔍 [MINIMAL-MATCH] Curved match result: ${matches}`);
        return matches;
      }

      return product.includes(requested);
    }

    // Manual scoring for each 7-panel product
    const results = products.map(product => {
      let score = 0;
      const scoring = [];

      // Panel count (should be 50 points for all since they're all 7-panel)
      if (product.panel_count === capDetails.panelCount) {
        score += 50;
        scoring.push('Panel count: +50');
      }

      // Tier (should be 30 points for all since they're all Tier 3)
      if (product.pricing_tier?.tier_name === 'Tier 3') {
        score += 30;
        scoring.push('Tier 3: +30');
      }

      // Bill shape
      if (capDetails.billShape) {
        const isMatch = checkBillShapeMatch(capDetails.billShape, product.bill_shape);
        if (isMatch) {
          score += 35; // 7-panel weight
          score += 15; // bonus for 7-panel + bill shape
          scoring.push('Bill shape match: +35, bonus: +15');
        } else {
          score -= 15;
          scoring.push('Bill shape mismatch: -15');
        }
      }

      // Profile
      if (capDetails.profile && product.profile.toLowerCase() === capDetails.profile.toLowerCase()) {
        score += 20;
        scoring.push('Profile match: +20');
      }

      // Structure
      if (capDetails.structure && product.structure_type.toLowerCase().includes(capDetails.structure.toLowerCase())) {
        score += 15;
        scoring.push('Structure match: +15');
      }

      return {
        product: {
          name: product.name,
          code: product.code,
          bill_shape: product.bill_shape,
          profile: product.profile,
          structure_type: product.structure_type
        },
        score,
        scoring,
        meetsMinimum: score >= 10
      };
    });

    // Sort by score
    results.sort((a, b) => b.score - a.score);

    const bestMatch = results[0];

    console.log(`🎯 [MINIMAL-MATCH] Best match: ${bestMatch?.product.name} (score: ${bestMatch?.score})`);

    return NextResponse.json({
      testSpecs: capDetails,
      totalProducts: products.length,
      results,
      bestMatch,
      wouldSucceed: bestMatch && bestMatch.score >= 10,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [MINIMAL-MATCH] Test failed:', error);
    return NextResponse.json(
      { error: error.message, stack: error.stack },
      { status: 500 }
    );
  }
}