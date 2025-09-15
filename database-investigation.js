/**
 * Database Investigation Script
 * Analyze products table for cap customization matching issues
 */

const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'https://xlamrsnbkvnwqxxotydm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhsYW1yc25ia3Zud3F4eG90eWRtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNTQ3NzI0MSwiZXhwIjoyMDUxMDUzMjQxfQ.HtXlXx8K3kDHI0GXtQ8tZ0gPJYI1sMTZ-nwgYT9rSNk';

const supabase = createClient(supabaseUrl, supabaseKey);

async function investigateDatabase() {
  console.log('🔍 SUPABASE DATABASE INVESTIGATION');
  console.log('=====================================');

  try {
    // 1. Query all products with pricing tiers
    console.log('\n📊 1. LOADING ALL PRODUCTS...');
    const { data: products, error } = await supabase
      .from('products')
      .select(`
        *,
        pricing_tier:pricing_tiers(*)
      `)
      .eq('is_active', true)
      .order('panel_count, bill_shape, name');

    if (error) {
      console.error('❌ Error loading products:', error);
      return;
    }

    console.log(`✅ Found ${products.length} active products`);

    // 2. Analyze panel count distribution
    console.log('\n📊 2. PANEL COUNT ANALYSIS');
    const panelCountStats = {};
    products.forEach(product => {
      const count = product.panel_count || 'unknown';
      if (!panelCountStats[count]) panelCountStats[count] = [];
      panelCountStats[count].push(product);
    });

    Object.keys(panelCountStats).sort().forEach(panelCount => {
      const products = panelCountStats[panelCount];
      console.log(`  ${panelCount}-panel: ${products.length} products`);
    });

    // 3. Analyze bill shape distribution
    console.log('\n📊 3. BILL SHAPE ANALYSIS');
    const billShapeStats = {};
    products.forEach(product => {
      const shape = product.bill_shape || 'unknown';
      if (!billShapeStats[shape]) billShapeStats[shape] = [];
      billShapeStats[shape].push(product);
    });

    Object.keys(billShapeStats).sort().forEach(billShape => {
      const products = billShapeStats[billShape];
      console.log(`  ${billShape}: ${products.length} products`);
    });

    // 4. Critical analysis: 7-panel products
    console.log('\n🎯 4. SEVEN-PANEL PRODUCT ANALYSIS');
    const sevenPanelProducts = products.filter(p => p.panel_count === 7);
    console.log(`Found ${sevenPanelProducts.length} seven-panel products:`);

    if (sevenPanelProducts.length === 0) {
      console.log('❌ CRITICAL: NO 7-PANEL PRODUCTS FOUND!');
    } else {
      sevenPanelProducts.forEach(product => {
        const tierName = product.pricing_tier?.tier_name || 'No tier';
        console.log(`  ✅ ${product.name}`);
        console.log(`     Code: ${product.code}`);
        console.log(`     Bill Shape: ${product.bill_shape}`);
        console.log(`     Profile: ${product.profile}`);
        console.log(`     Structure: ${product.structure_type}`);
        console.log(`     Tier: ${tierName}`);
        console.log(`     Nick Names: ${JSON.stringify(product.nick_names || [])}`);
        console.log('');
      });
    }

    // 5. Check for specific product that should exist
    console.log('\n🔍 5. SEARCHING FOR SPECIFIC PRODUCTS');

    // Look for 7-panel curved bill products
    const sevenPanelCurved = products.filter(p =>
      p.panel_count === 7 &&
      p.bill_shape &&
      p.bill_shape.toLowerCase().includes('curved')
    );
    console.log(`7-panel + curved bill: ${sevenPanelCurved.length} products`);
    sevenPanelCurved.forEach(p => console.log(`  - ${p.name} (${p.bill_shape})`));

    // Look for 7-panel flat bill products
    const sevenPanelFlat = products.filter(p =>
      p.panel_count === 7 &&
      p.bill_shape &&
      p.bill_shape.toLowerCase().includes('flat')
    );
    console.log(`7-panel + flat bill: ${sevenPanelFlat.length} products`);
    sevenPanelFlat.forEach(p => console.log(`  - ${p.name} (${p.bill_shape})`));

    // 6. Check for the specific product mentioned in the issue
    console.log('\n🔍 6. CHECKING FOR "7P_CROWNFRAME_7_MSCS"');
    const specificProduct = products.find(p =>
      p.code === '7P_CROWNFRAME_7_MSCS' ||
      p.name.includes('7P_CROWNFRAME_7_MSCS')
    );

    if (specificProduct) {
      console.log('✅ Found specific product:');
      console.log(`  Name: ${specificProduct.name}`);
      console.log(`  Code: ${specificProduct.code}`);
      console.log(`  Panel Count: ${specificProduct.panel_count}`);
      console.log(`  Bill Shape: ${specificProduct.bill_shape}`);
      console.log(`  Profile: ${specificProduct.profile}`);
      console.log(`  Structure: ${specificProduct.structure_type}`);
      console.log(`  Tier: ${specificProduct.pricing_tier?.tier_name || 'No tier'}`);
    } else {
      console.log('❌ CRITICAL: "7P_CROWNFRAME_7_MSCS" NOT FOUND!');
    }

    // 7. Analyze 6-panel products by bill shape
    console.log('\n📊 7. SIX-PANEL PRODUCT ANALYSIS BY BILL SHAPE');
    const sixPanelProducts = products.filter(p => p.panel_count === 6);
    console.log(`Found ${sixPanelProducts.length} six-panel products:`);

    const sixPanelByShape = {};
    sixPanelProducts.forEach(product => {
      const shape = product.bill_shape || 'unknown';
      if (!sixPanelByShape[shape]) sixPanelByShape[shape] = [];
      sixPanelByShape[shape].push(product);
    });

    Object.keys(sixPanelByShape).sort().forEach(shape => {
      const products = sixPanelByShape[shape];
      console.log(`  ${shape}: ${products.length} products`);
      products.slice(0, 3).forEach(p => {
        const tierName = p.pricing_tier?.tier_name || 'No tier';
        console.log(`    - ${p.name} (${tierName})`);
      });
      if (products.length > 3) {
        console.log(`    ... and ${products.length - 3} more`);
      }
    });

    // 8. Verify pricing tier relationships
    console.log('\n🔗 8. PRICING TIER RELATIONSHIP ANALYSIS');
    const tierStats = {};
    products.forEach(product => {
      const tierName = product.pricing_tier?.tier_name || 'No tier';
      if (!tierStats[tierName]) {
        tierStats[tierName] = {
          count: 0,
          panelCounts: new Set(),
          billShapes: new Set()
        };
      }
      tierStats[tierName].count++;
      tierStats[tierName].panelCounts.add(product.panel_count);
      tierStats[tierName].billShapes.add(product.bill_shape);
    });

    Object.keys(tierStats).sort().forEach(tierName => {
      const stats = tierStats[tierName];
      console.log(`  ${tierName}: ${stats.count} products`);
      console.log(`    Panel counts: ${Array.from(stats.panelCounts).sort().join(', ')}`);
      console.log(`    Bill shapes: ${Array.from(stats.billShapes).sort().join(', ')}`);
    });

    // 9. Check nick_names for matching keywords
    console.log('\n🏷️  9. NICKNAME ANALYSIS FOR MATCHING');
    const nicknameStats = {};
    products.forEach(product => {
      if (product.nick_names && product.nick_names.length > 0) {
        product.nick_names.forEach(nickname => {
          if (!nicknameStats[nickname]) nicknameStats[nickname] = [];
          nicknameStats[nickname].push(product.name);
        });
      }
    });

    console.log(`Found ${Object.keys(nicknameStats).length} unique nicknames`);
    Object.keys(nicknameStats).sort().forEach(nickname => {
      if (nickname.toLowerCase().includes('curved') ||
          nickname.toLowerCase().includes('flat') ||
          nickname.toLowerCase().includes('panel') ||
          nickname.toLowerCase().includes('7')) {
        console.log(`  "${nickname}": ${nicknameStats[nickname].length} products`);
      }
    });

    console.log('\n🎯 10. INVESTIGATION COMPLETE');
    console.log('=====================================');

  } catch (error) {
    console.error('❌ Investigation failed:', error);
  }
}

// Run the investigation
investigateDatabase();