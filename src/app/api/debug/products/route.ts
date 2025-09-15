import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('🔍 [DEBUG] Investigating products database...');

    // Query all active products with pricing tiers
    const { data: products, error } = await supabase
      .from('products')
      .select(`
        *,
        pricing_tier:pricing_tiers(*)
      `)
      .eq('is_active', true)
      .order('panel_count, bill_shape, name');

    if (error) {
      console.error('❌ [DEBUG] Error loading products:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log(`✅ [DEBUG] Found ${products.length} active products`);

    // Analyze the data
    const analysis = {
      totalProducts: products.length,
      panelCountStats: {},
      billShapeStats: {},
      tierStats: {},
      sevenPanelProducts: [],
      sixPanelProducts: [],
      missingProducts: [],
      recommendations: []
    };

    // Panel count analysis
    products.forEach(product => {
      const count = product.panel_count || 'unknown';
      if (!analysis.panelCountStats[count]) analysis.panelCountStats[count] = 0;
      analysis.panelCountStats[count]++;
    });

    // Bill shape analysis
    products.forEach(product => {
      const shape = product.bill_shape || 'unknown';
      if (!analysis.billShapeStats[shape]) analysis.billShapeStats[shape] = 0;
      analysis.billShapeStats[shape]++;
    });

    // Tier analysis
    products.forEach(product => {
      const tierName = product.pricing_tier?.tier_name || 'No tier';
      if (!analysis.tierStats[tierName]) {
        analysis.tierStats[tierName] = {
          count: 0,
          panelCounts: new Set(),
          billShapes: new Set()
        };
      }
      analysis.tierStats[tierName].count++;
      analysis.tierStats[tierName].panelCounts.add(product.panel_count);
      analysis.tierStats[tierName].billShapes.add(product.bill_shape);
    });

    // Convert sets to arrays for JSON serialization
    Object.keys(analysis.tierStats).forEach(tierName => {
      analysis.tierStats[tierName].panelCounts = Array.from(analysis.tierStats[tierName].panelCounts);
      analysis.tierStats[tierName].billShapes = Array.from(analysis.tierStats[tierName].billShapes);
    });

    // 7-panel products
    analysis.sevenPanelProducts = products
      .filter(p => p.panel_count === 7)
      .map(p => ({
        name: p.name,
        code: p.code,
        bill_shape: p.bill_shape,
        profile: p.profile,
        structure_type: p.structure_type,
        tier: p.pricing_tier?.tier_name || 'No tier',
        nick_names: p.nick_names || []
      }));

    // 6-panel products grouped by bill shape
    const sixPanelFiltered = products.filter(p => p.panel_count === 6);
    const sixPanelByShape = {};
    sixPanelFiltered.forEach(product => {
      const shape = product.bill_shape || 'unknown';
      if (!sixPanelByShape[shape]) sixPanelByShape[shape] = [];
      sixPanelByShape[shape].push({
        name: product.name,
        code: product.code,
        profile: product.profile,
        structure_type: product.structure_type,
        tier: product.pricing_tier?.tier_name || 'No tier',
        nick_names: product.nick_names || []
      });
    });
    analysis.sixPanelProducts = sixPanelByShape;

    // Check for specific missing products
    const requiredProducts = [
      { code: '7P_CROWNFRAME_7_MSCS', description: '7-panel curved bill mid profile structured' },
      { code: '7P_FLATFRAME_7_HSCS', description: '7-panel flat bill high profile structured' }
    ];

    requiredProducts.forEach(required => {
      const exists = products.find(p => p.code === required.code);
      if (!exists) {
        analysis.missingProducts.push(required);
      }
    });

    // Check for 7-panel + curved combination
    const sevenPanelCurved = products.filter(p =>
      p.panel_count === 7 &&
      p.bill_shape &&
      p.bill_shape.toLowerCase().includes('curved')
    );

    // Check for 7-panel + flat combination
    const sevenPanelFlat = products.filter(p =>
      p.panel_count === 7 &&
      p.bill_shape &&
      p.bill_shape.toLowerCase().includes('flat')
    );

    // Generate recommendations
    if (analysis.sevenPanelProducts.length === 0) {
      analysis.recommendations.push('CRITICAL: No 7-panel products found. Add 7-panel products for Tier 3 pricing.');
    }

    if (sevenPanelCurved.length === 0) {
      analysis.recommendations.push('MISSING: No 7-panel curved bill products. Users requesting "7-panel curved bill" will not find matches.');
    }

    if (sevenPanelFlat.length === 0) {
      analysis.recommendations.push('MISSING: No 7-panel flat bill products. Users requesting "7-panel flat bill" will not find matches.');
    }

    // Check tier distribution logic
    const tier3Products = products.filter(p => p.pricing_tier?.tier_name === 'Tier 3');
    const tier3SevenPanel = tier3Products.filter(p => p.panel_count === 7);

    if (tier3Products.length > 0 && tier3SevenPanel.length === 0) {
      analysis.recommendations.push('TIER MISMATCH: Tier 3 products exist but none are 7-panel. Business logic expects 7-panel = Tier 3.');
    }

    console.log('🎯 [DEBUG] Analysis complete:', {
      totalProducts: analysis.totalProducts,
      sevenPanelCount: analysis.sevenPanelProducts.length,
      missingProductsCount: analysis.missingProducts.length,
      recommendationCount: analysis.recommendations.length
    });

    return NextResponse.json(analysis);

  } catch (error) {
    console.error('❌ [DEBUG] Investigation failed:', error);
    return NextResponse.json(
      { error: error.message, stack: error.stack },
      { status: 500 }
    );
  }
}