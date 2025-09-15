import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

interface ProductInfo {
  name: string;
  code: string;
  profile: string;
  bill_shape: string;
  panel_count: number;
  structure_type: string;
  pricing_tier?: any;
  nick_names: string[];
}

// Bill shape matching function (copy of the working one)
function checkBillShapeMatch(requestedShape: string, productShape: string): boolean {
  const requested = requestedShape.toLowerCase().trim();
  const product = productShape.toLowerCase().trim();

  if (product === requested) {
    return true;
  }

  // Map user "curved" to database "slight curved" or "curved"
  if (requested === 'curved' || requested === 'curve') {
    return product === 'curved' ||
           product === 'slight curved' ||
           product.includes('curved');
  }

  if (requested === 'flat' || requested === 'flatbill' || requested === 'flat bill') {
    return product === 'flat' || product.includes('flat');
  }

  if (requested.includes('curved') && (product === 'slight curved' || product === 'curved')) {
    return true;
  }

  if (requested.includes('flat') && product === 'flat') {
    return true;
  }

  return product.includes(requested);
}

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 [FRESH-MATCH] Starting completely fresh implementation...');

    // Test specs
    const capDetails = {
      panelCount: 7,
      billShape: "curved",
      profile: "mid",
      structure: "structured"
    };

    // Direct database query
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data: products, error } = await supabase
      .from('products')
      .select(`
        *,
        pricing_tier:pricing_tiers(*)
      `)
      .eq('is_active', true)
      .order('name');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log(`✅ [FRESH-MATCH] Loaded ${products.length} products`);

    // Direct tier inference
    let inferredTier = null;
    let inferredPanelCount = null;

    if (capDetails.panelCount) {
      inferredPanelCount = capDetails.panelCount;
      if (capDetails.panelCount === 7) {
        inferredTier = 'Tier 3';
      }
    }

    console.log(`🎯 [FRESH-MATCH] Inferred: tier=${inferredTier}, panelCount=${inferredPanelCount}`);

    // Direct matching
    let bestMatch: ProductInfo | null = null;
    let bestScore = 0;
    const targetPanelCount = inferredPanelCount;

    for (const product of products) {
      if (!product.pricing_tier) continue;

      let score = 0;

      // Panel count matching
      if (targetPanelCount && product.panel_count === targetPanelCount) {
        const panelWeight = targetPanelCount === 7 ? 50 : 45;
        score += panelWeight;
      }

      // Tier matching
      if (inferredTier && product.pricing_tier?.tier_name === inferredTier) {
        score += 30;
      }

      // Bill shape matching
      if (capDetails.billShape) {
        const isShapeMatch = checkBillShapeMatch(capDetails.billShape, product.bill_shape);
        if (isShapeMatch) {
          const shapeWeight = targetPanelCount === 7 ? 35 : 25;
          score += shapeWeight;

          if (targetPanelCount === 7 && product.panel_count === 7) {
            score += 15;
          }
        } else {
          const shapePenalty = targetPanelCount === 7 ? -15 : -10;
          score += shapePenalty;
        }
      }

      // Profile matching
      if (capDetails.profile && product.profile.toLowerCase() === capDetails.profile.toLowerCase()) {
        score += 20;
      }

      // Structure matching
      if (capDetails.structure && product.structure_type.toLowerCase().includes(capDetails.structure.toLowerCase())) {
        score += 15;
      }

      if (score > bestScore) {
        bestScore = score;
        bestMatch = {
          name: product.name,
          code: product.code,
          profile: product.profile,
          bill_shape: product.bill_shape,
          panel_count: product.panel_count,
          structure_type: product.structure_type,
          pricing_tier: product.pricing_tier,
          nick_names: product.nick_names || []
        };
      }
    }

    console.log(`✅ [FRESH-MATCH] Best match: ${bestMatch?.name} (score: ${bestScore})`);

    // Test multiple scenarios
    const testCases = [
      {
        name: "7-panel curved bill",
        specs: { panelCount: 7, billShape: "curved", profile: "mid", structure: "structured" }
      },
      {
        name: "7-panel flat bill",
        specs: { panelCount: 7, billShape: "flat", profile: "high", structure: "structured" }
      },
      {
        name: "6-panel curved bill",
        specs: { panelCount: 6, billShape: "curved", profile: "mid", structure: "structured" }
      }
    ];

    const testResults = [];

    for (const testCase of testCases) {
      const specs = testCase.specs;

      // Infer tier
      let testTier = null;
      let testPanelCount = null;

      if (specs.panelCount) {
        testPanelCount = specs.panelCount;
        if (specs.panelCount === 7) {
          testTier = 'Tier 3';
        } else if (specs.panelCount === 6) {
          testTier = specs.billShape?.toLowerCase().includes('flat') ? 'Tier 2' : 'Tier 1';
        } else {
          testTier = 'Tier 1';
        }
      }

      // Find best match
      let testBestMatch = null;
      let testBestScore = 0;

      for (const product of products) {
        if (!product.pricing_tier) continue;

        let score = 0;

        if (testPanelCount && product.panel_count === testPanelCount) {
          score += testPanelCount === 7 ? 50 : 45;
        }

        if (testTier && product.pricing_tier?.tier_name === testTier) {
          score += 30;
        }

        if (specs.billShape) {
          const isMatch = checkBillShapeMatch(specs.billShape, product.bill_shape);
          if (isMatch) {
            score += testPanelCount === 7 ? 35 : 25;
            if (testPanelCount === 7 && product.panel_count === 7) {
              score += 15;
            }
          } else {
            score += testPanelCount === 7 ? -15 : -10;
          }
        }

        if (specs.profile && product.profile.toLowerCase() === specs.profile.toLowerCase()) {
          score += 20;
        }

        if (specs.structure && product.structure_type.toLowerCase().includes(specs.structure.toLowerCase())) {
          score += 15;
        }

        if (score > testBestScore) {
          testBestScore = score;
          testBestMatch = {
            name: product.name,
            code: product.code,
            panel_count: product.panel_count,
            bill_shape: product.bill_shape,
            profile: product.profile,
            tier: product.pricing_tier?.tier_name
          };
        }
      }

      testResults.push({
        testCase: testCase.name,
        input: specs,
        result: testBestMatch,
        score: testBestScore,
        success: testBestScore >= 10
      });
    }

    return NextResponse.json({
      message: 'Fresh implementation test completed',
      directTest: {
        input: capDetails,
        result: bestMatch,
        score: bestScore,
        success: bestScore >= 10
      },
      multipleTests: testResults,
      summary: {
        totalTests: testResults.length,
        successful: testResults.filter(t => t.success).length
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [FRESH-MATCH] Fresh implementation failed:', error);
    return NextResponse.json(
      { error: error.message, stack: error.stack },
      { status: 500 }
    );
  }
}