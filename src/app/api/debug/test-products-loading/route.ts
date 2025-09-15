import { NextRequest, NextResponse } from 'next/server';
import { loadProducts } from '@/lib/pricing/pricing-service';

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 [DEBUG] Testing product loading...');

    const products = await loadProducts();

    console.log(`🧪 [DEBUG] Loaded ${products.length} products`);

    // Test the bill shape matching logic
    const sevenPanelProducts = products.filter(p => p.panel_count === 7);
    console.log(`🧪 [DEBUG] Found ${sevenPanelProducts.length} seven-panel products`);

    const curvedProducts = products.filter(p =>
      p.bill_shape.toLowerCase().includes('curved')
    );
    console.log(`🧪 [DEBUG] Found ${curvedProducts.length} products with 'curved' in bill_shape`);

    const slightCurvedProducts = products.filter(p =>
      p.bill_shape.toLowerCase() === 'slight curved'
    );
    console.log(`🧪 [DEBUG] Found ${slightCurvedProducts.length} products with exact 'slight curved' bill_shape`);

    // Test the new checkBillShapeMatch function directly
    function testCheckBillShapeMatch(requestedShape: string, productShape: string): boolean {
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

    // Test the matching logic
    const testCases = [
      { requested: 'curved', product: 'Slight Curved' },
      { requested: 'curved', product: 'Curved' },
      { requested: 'flat', product: 'Flat' },
      { requested: 'curved', product: 'Flat' }
    ];

    const matchingTests = testCases.map(test => ({
      ...test,
      matches: testCheckBillShapeMatch(test.requested, test.product)
    }));

    // Find specific products we expect to match
    const targetProducts = {
      sevenPanelCurved: products.find(p =>
        p.panel_count === 7 && p.bill_shape.toLowerCase().includes('curved')
      ),
      sevenPanelFlat: products.find(p =>
        p.panel_count === 7 && p.bill_shape.toLowerCase() === 'flat'
      ),
      specificProduct: products.find(p =>
        p.code === '7P_CROWNFRAME_7_MSCS'
      )
    };

    return NextResponse.json({
      productLoadingSuccess: products.length > 0,
      totalProducts: products.length,
      sevenPanelCount: sevenPanelProducts.length,
      curvedProductsCount: curvedProducts.length,
      slightCurvedProductsCount: slightCurvedProducts.length,
      billShapeMatchingTests: matchingTests,
      sampleProducts: products.slice(0, 3).map(p => ({
        name: p.name,
        code: p.code,
        panel_count: p.panel_count,
        bill_shape: p.bill_shape,
        tier: p.pricing_tier?.tier_name
      })),
      targetProducts,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [DEBUG] Product loading test failed:', error);
    return NextResponse.json(
      { error: error.message, stack: error.stack },
      { status: 500 }
    );
  }
}