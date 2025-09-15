import { NextRequest, NextResponse } from 'next/server';
import { loadProducts } from '@/lib/pricing/pricing-service';

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 [DEBUG] Testing detailed product scoring...');

    const products = await loadProducts();
    if (!products.length) {
      return NextResponse.json({ error: 'No products loaded' }, { status: 500 });
    }

    // Test case: 7-panel curved bill
    const capDetails = {
      panelCount: 7,
      billShape: "curved",
      profile: "mid",
      structure: "structured"
    };

    // Bill shape matching function (copy from pricing-service.ts)
    function checkBillShapeMatch(requestedShape: string, productShape: string): boolean {
      const requested = requestedShape.toLowerCase().trim();
      const product = productShape.toLowerCase().trim();

      // Exact match
      if (product === requested) {
        return true;
      }

      // Map user "curved" to database "slight curved" or "curved"
      if (requested === 'curved' || requested === 'curve') {
        return product === 'curved' ||
               product === 'slight curved' ||
               product.includes('curved');
      }

      // Map user "flat" to database "flat"
      if (requested === 'flat' || requested === 'flatbill' || requested === 'flat bill') {
        return product === 'flat' || product.includes('flat');
      }

      // Handle partial matches for complex user inputs
      if (requested.includes('curved') && (product === 'slight curved' || product === 'curved')) {
        return true;
      }

      if (requested.includes('flat') && product === 'flat') {
        return true;
      }

      // Default: check if product shape contains requested shape
      return product.includes(requested);
    }

    // Simulate the scoring algorithm
    let inferredTier = 'Tier 3'; // 7-panel = Tier 3
    let inferredPanelCount = 7;
    const targetPanelCount = capDetails.panelCount;

    const scoringResults = [];

    // Test scoring on 7-panel products
    const sevenPanelProducts = products.filter(p => p.panel_count === 7);

    for (const product of sevenPanelProducts.slice(0, 5)) { // Test first 5
      let score = 0;
      const scoreBreakdown = [];

      // Panel count matching (HIGHEST PRIORITY for 7-panel caps)
      if (targetPanelCount && product.panel_count === targetPanelCount) {
        const panelWeight = targetPanelCount === 7 ? 50 : 45;
        score += panelWeight;
        scoreBreakdown.push({ factor: 'Panel Count Match', points: panelWeight, reason: `${targetPanelCount}-panel match` });
      }

      // Tier matching
      if (inferredTier && product.pricing_tier?.tier_name === inferredTier) {
        score += 30;
        scoreBreakdown.push({ factor: 'Tier Match', points: 30, reason: `${inferredTier} match` });
      }

      // Bill shape matching
      if (capDetails.billShape) {
        const requestedShape = capDetails.billShape.toLowerCase();
        const productShape = product.bill_shape.toLowerCase();
        const isShapeMatch = checkBillShapeMatch(requestedShape, productShape);

        if (isShapeMatch) {
          const shapeWeight = targetPanelCount === 7 ? 35 : 25;
          score += shapeWeight;
          scoreBreakdown.push({
            factor: 'Bill Shape Match',
            points: shapeWeight,
            reason: `"${requestedShape}" matches "${productShape}"`
          });

          // BONUS: Extra points for perfect 7-panel + bill shape combination
          if (targetPanelCount === 7 && product.panel_count === 7) {
            score += 15;
            scoreBreakdown.push({ factor: '7-Panel + Bill Shape Bonus', points: 15, reason: 'Perfect combo' });
          }
        } else {
          const shapePenalty = targetPanelCount === 7 ? -15 : -10;
          score += shapePenalty;
          scoreBreakdown.push({
            factor: 'Bill Shape Mismatch',
            points: shapePenalty,
            reason: `"${requestedShape}" doesn't match "${productShape}"`
          });
        }
      }

      // Profile matching
      if (capDetails.profile && product.profile.toLowerCase() === capDetails.profile.toLowerCase()) {
        score += 20;
        scoreBreakdown.push({ factor: 'Profile Match', points: 20, reason: `${capDetails.profile} match` });
      }

      // Structure matching
      if (capDetails.structure && product.structure_type.toLowerCase().includes(capDetails.structure.toLowerCase())) {
        score += 15;
        scoreBreakdown.push({ factor: 'Structure Match', points: 15, reason: `${capDetails.structure} match` });
      }

      scoringResults.push({
        product: {
          name: product.name,
          code: product.code,
          panel_count: product.panel_count,
          bill_shape: product.bill_shape,
          profile: product.profile,
          structure_type: product.structure_type,
          tier: product.pricing_tier?.tier_name
        },
        finalScore: score,
        scoreBreakdown,
        meetsMinimum: score >= 10
      });
    }

    // Sort by score
    scoringResults.sort((a, b) => b.finalScore - a.finalScore);

    // Find the expected best match
    const expectedMatch = products.find(p =>
      p.panel_count === 7 &&
      p.bill_shape.toLowerCase().includes('curved') &&
      p.profile.toLowerCase() === 'mid'
    );

    return NextResponse.json({
      testCase: capDetails,
      inferredTier,
      inferredPanelCount,
      totalSevenPanelProducts: sevenPanelProducts.length,
      scoringResults,
      topMatch: scoringResults[0],
      expectedMatch: expectedMatch ? {
        name: expectedMatch.name,
        code: expectedMatch.code,
        bill_shape: expectedMatch.bill_shape,
        profile: expectedMatch.profile
      } : null,
      recommendations: [
        scoringResults[0]?.finalScore < 10 ? 'Lower minimum score threshold' : 'Scoring looks good',
        'Consider adjusting weights if needed'
      ]
    });

  } catch (error) {
    console.error('❌ [DEBUG] Scoring test failed:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}