import { NextRequest, NextResponse } from 'next/server';
import { loadProducts } from '@/lib/pricing/pricing-service';

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 [STEP-BY-STEP] Starting detailed step-by-step debugging...');

    const capDetails = {
      panelCount: 7,
      billShape: "curved",
      profile: "mid",
      structure: "structured"
    };

    console.log('🔧 [STEP-BY-STEP] Input capDetails:', JSON.stringify(capDetails, null, 2));

    // Step 1: Load products
    console.log('🔧 [STEP-BY-STEP] Step 1: Loading products...');
    const products = await loadProducts();
    console.log(`🔧 [STEP-BY-STEP] Step 1 result: ${products.length} products loaded`);

    if (!products.length) {
      return NextResponse.json({ error: 'No products loaded', step: 1 });
    }

    // Step 2: Check for exact product name (should skip this)
    console.log('🔧 [STEP-BY-STEP] Step 2: Checking for exact product name...');
    if (capDetails.productName) {
      console.log(`🔧 [STEP-BY-STEP] Step 2: Looking for exact name: ${capDetails.productName}`);
    } else {
      console.log('🔧 [STEP-BY-STEP] Step 2: No exact product name provided, continuing to specs matching');
    }

    // Step 3: Panel count and tier inference
    console.log('🔧 [STEP-BY-STEP] Step 3: Panel count and tier inference...');
    let inferredTier = null;
    let inferredPanelCount = null;

    if (capDetails.panelCount) {
      inferredPanelCount = capDetails.panelCount;
      if (capDetails.panelCount === 7) {
        inferredTier = 'Tier 3';
        console.log(`🔧 [STEP-BY-STEP] Step 3: Direct panel count: ${inferredPanelCount} -> ${inferredTier}`);
      }
    }

    console.log(`🔧 [STEP-BY-STEP] Step 3 result: tier=${inferredTier}, panelCount=${inferredPanelCount}`);

    // Step 4: Bill shape matching function
    console.log('🔧 [STEP-BY-STEP] Step 4: Setting up bill shape matching...');
    function checkBillShapeMatch(requestedShape, productShape) {
      const requested = requestedShape.toLowerCase().trim();
      const product = productShape.toLowerCase().trim();

      if (requested === 'curved' || requested === 'curve') {
        return product === 'curved' ||
               product === 'slight curved' ||
               product.includes('curved');
      }

      return product.includes(requested);
    }

    // Step 5: Product matching loop
    console.log('🔧 [STEP-BY-STEP] Step 5: Starting product matching loop...');
    let bestMatch = null;
    let bestScore = 0;
    const targetPanelCount = inferredPanelCount;

    console.log(`🔧 [STEP-BY-STEP] Step 5: Target specs - panelCount=${targetPanelCount}, tier=${inferredTier}, billShape=${capDetails.billShape}`);

    let productCount = 0;
    let matchingProducts = [];

    for (const product of products) {
      if (!product.pricing_tier) continue;

      productCount++;
      let score = 0;
      const scoreDetails = [];

      // Panel count matching
      if (targetPanelCount && product.panel_count === targetPanelCount) {
        const panelWeight = targetPanelCount === 7 ? 50 : 45;
        score += panelWeight;
        scoreDetails.push(`Panel count match: +${panelWeight}`);
      }

      // Tier matching
      if (inferredTier && product.pricing_tier?.tier_name === inferredTier) {
        score += 30;
        scoreDetails.push(`Tier match: +30`);
      }

      // Bill shape matching
      if (capDetails.billShape) {
        const isShapeMatch = checkBillShapeMatch(capDetails.billShape, product.bill_shape);
        if (isShapeMatch) {
          const shapeWeight = targetPanelCount === 7 ? 35 : 25;
          score += shapeWeight;
          scoreDetails.push(`Bill shape match: +${shapeWeight}`);

          if (targetPanelCount === 7 && product.panel_count === 7) {
            score += 15;
            scoreDetails.push(`7-panel + bill shape bonus: +15`);
          }
        } else {
          const shapePenalty = targetPanelCount === 7 ? -15 : -10;
          score += shapePenalty;
          scoreDetails.push(`Bill shape mismatch: ${shapePenalty}`);
        }
      }

      // Profile matching
      if (capDetails.profile && product.profile.toLowerCase() === capDetails.profile.toLowerCase()) {
        score += 20;
        scoreDetails.push(`Profile match: +20`);
      }

      // Structure matching
      if (capDetails.structure && product.structure_type.toLowerCase().includes(capDetails.structure.toLowerCase())) {
        score += 15;
        scoreDetails.push(`Structure match: +15`);
      }

      if (score > 0) {
        matchingProducts.push({
          name: product.name,
          code: product.code,
          panel_count: product.panel_count,
          bill_shape: product.bill_shape,
          profile: product.profile,
          structure_type: product.structure_type,
          tier: product.pricing_tier?.tier_name,
          score,
          scoreDetails
        });
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

    console.log(`🔧 [STEP-BY-STEP] Step 5 result: processed ${productCount} products, best score: ${bestScore}`);

    // Step 6: Check minimum threshold
    console.log('🔧 [STEP-BY-STEP] Step 6: Checking minimum threshold...');
    const meetsMinimum = bestMatch && bestScore >= 10;
    console.log(`🔧 [STEP-BY-STEP] Step 6: bestScore=${bestScore}, meetsMinimum=${meetsMinimum}`);

    // Step 7: Fallback logic
    console.log('🔧 [STEP-BY-STEP] Step 7: Checking fallback logic...');
    if (!bestMatch || bestScore < 10) {
      console.log(`🔧 [STEP-BY-STEP] Step 7: Using fallback (targetPanelCount=${targetPanelCount})`);

      if (targetPanelCount === 7) {
        console.log('🔧 [STEP-BY-STEP] Step 7: Looking for ANY 7-panel product...');
        const any7PanelProduct = products.find(p => p.panel_count === 7 && p.pricing_tier);

        if (any7PanelProduct) {
          bestMatch = {
            name: any7PanelProduct.name,
            code: any7PanelProduct.code,
            profile: any7PanelProduct.profile,
            bill_shape: any7PanelProduct.bill_shape,
            panel_count: any7PanelProduct.panel_count,
            structure_type: any7PanelProduct.structure_type,
            pricing_tier: any7PanelProduct.pricing_tier,
            nick_names: any7PanelProduct.nick_names || []
          };
          console.log(`🔧 [STEP-BY-STEP] Step 7: Found 7-panel fallback: ${bestMatch.name}`);
        }
      }
    }

    // Final result
    const finalResult = bestMatch;
    console.log(`🔧 [STEP-BY-STEP] Final result: ${finalResult ? finalResult.name : 'null'}`);

    return NextResponse.json({
      input: capDetails,
      steps: {
        step1_productsLoaded: products.length,
        step2_exactNameSkipped: !capDetails.productName,
        step3_inference: { inferredTier, inferredPanelCount },
        step5_matching: {
          productsProcessed: productCount,
          bestScore,
          matchingProductsCount: matchingProducts.length
        },
        step6_threshold: { bestScore, meetsMinimum },
        step7_fallback: !bestMatch || bestScore < 10
      },
      bestMatch: bestMatch,
      finalResult: finalResult,
      success: !!finalResult,
      matchingProducts: matchingProducts.sort((a, b) => b.score - a.score).slice(0, 5),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [STEP-BY-STEP] Debug failed:', error);
    return NextResponse.json(
      {
        error: error.message,
        stack: error.stack,
        step: 'exception_occurred'
      },
      { status: 500 }
    );
  }
}