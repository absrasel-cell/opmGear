import { NextResponse } from 'next/server';
import { SanityService } from '../../../lib/sanity';

export async function GET() {
 try {
  console.log('🏪 API: Fetching store products...');
  
  // Test Sanity configuration
  const config = {
   projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
   dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
   apiToken: process.env.SANITY_API_TOKEN ? 'SET' : 'MISSING',
   environment: process.env.NODE_ENV
  };
  
  console.log('🏪 API: Sanity config:', config);
  
  const sanityProducts = await SanityService.getProducts();
  console.log(`🏪 API: Retrieved ${sanityProducts.length} products from Sanity`);
  
  // Apply the same filtering logic as the store page
  const storeProducts = sanityProducts
   .filter((product: any) => {
    const isActiveProduct = product.isActive;
    const hasMainImage = product.mainImage?.url;
    const hasSlug = typeof product.slug === 'string' ? product.slug : product.slug?.current;
    
    console.log(`🔍 API: Product "${product.name}" - Active: ${isActiveProduct}, Image: ${!!hasMainImage}, Slug: ${!!hasSlug}`);
    
    return isActiveProduct && hasMainImage && hasSlug;
   })
   .map((product: any) => ({
    _id: product._id,
    name: product.name,
    slug: typeof product.slug === 'string' ? product.slug : product.slug?.current || '',
    mainImage: {
     url: product.mainImage.url,
     alt: product.mainImage.alt || product.name,
     name: product.name
    },
    itemData: product.itemData || [],
    priceTier: product.priceTier || 'Standard',
    _type: product._type,
    isActive: product.isActive,
    productReadiness: product.productReadiness || [],
    productType: product.productType || 'factory'
   }))
   .filter(product => {
    const hasValidSlug = product.slug && product.slug.trim() !== '';
    if (!hasValidSlug) {
     console.warn(`⚠️ API: Product "${product.name}" has invalid slug, skipping`);
    }
    return hasValidSlug;
   });

  console.log(`🏪 API: Final store products: ${storeProducts.length}`);
  
  return NextResponse.json({
   success: true,
   config,
   totalProducts: sanityProducts.length,
   storeProducts: storeProducts.length,
   products: storeProducts,
   debugInfo: {
    firstProduct: sanityProducts[0] || null,
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
   }
  });
  
 } catch (error) {
  console.error('❌ API: Store products error:', error);
  return NextResponse.json({
   success: false,
   error: error instanceof Error ? error.message : 'Unknown error',
   config: {
    projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
    dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
    apiToken: process.env.SANITY_API_TOKEN ? 'SET' : 'MISSING',
    environment: process.env.NODE_ENV
   }
  }, { status: 500 });
 }
}