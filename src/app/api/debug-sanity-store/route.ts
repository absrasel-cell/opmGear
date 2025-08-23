import { NextResponse } from 'next/server';
import { SanityService } from '../../../lib/sanity';

export async function GET() {
  try {
    console.log('🔍 Debug: Testing Sanity connection for store products...');
    
    // Test Sanity configuration
    const sanityConfig = {
      projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
      dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
      apiToken: process.env.SANITY_API_TOKEN ? 'SET' : 'MISSING'
    };
    
    console.log('📋 Sanity Config:', sanityConfig);
    
    // Fetch products using the same method as store page
    const products = await SanityService.getProducts();
    console.log(`✅ Fetched ${products.length} products from Sanity`);
    
    // Filter products the same way as store page
    const storeProducts = products
      .filter((product: any) => {
        return product.isActive && 
               product.mainImage?.url && 
               (typeof product.slug === 'string' ? product.slug : product.slug?.current);
      })
      .map((product: any) => ({
        name: product.name,
        slug: typeof product.slug === 'string' ? product.slug : product.slug?.current || '',
        mainImage: {
          url: product.mainImage.url,
          alt: product.mainImage.alt || product.name,
          name: product.name
        },
        isActive: product.isActive,
        hasMainImage: !!product.mainImage?.url,
        hasSlug: !!(typeof product.slug === 'string' ? product.slug : product.slug?.current)
      }))
      .filter(product => {
        return product.slug && product.slug.trim() !== '';
      });

    console.log(`🏪 Store-ready products: ${storeProducts.length}`);
    
    return NextResponse.json({
      success: true,
      config: sanityConfig,
      totalProducts: products.length,
      storeProducts: storeProducts.length,
      products: storeProducts.slice(0, 3), // Return first 3 for debugging
      rawProducts: products.slice(0, 2).map(p => ({
        name: p.name,
        slug: p.slug,
        isActive: p.isActive,
        hasMainImage: !!p.mainImage,
        _type: p._type
      }))
    });
    
  } catch (error) {
    console.error('❌ Sanity debug error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      config: {
        projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
        dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
        apiToken: process.env.SANITY_API_TOKEN ? 'SET' : 'MISSING'
      }
    }, { status: 500 });
  }
}