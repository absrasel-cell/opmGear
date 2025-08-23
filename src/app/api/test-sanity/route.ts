import { NextRequest, NextResponse } from 'next/server';
import { sanityClient } from '@/lib/sanity';

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Testing Sanity.io connection...');
    
    // Test 1: Check environment variables first
    console.log('🔧 Checking configuration...');
    const hasToken = !!process.env.SANITY_API_TOKEN;
    console.log(`✅ API Token configured: ${hasToken ? 'Yes' : 'No'}`);
    
    if (!hasToken) {
      return NextResponse.json({
        success: false,
        message: 'SANITY_API_TOKEN environment variable is not set',
        details: {
          projectId: '62anct3y',
          dataset: 'production',
          hasToken: false,
        }
      }, { status: 400 });
    }
    
    // Test 2: Basic connection test with simple query
    console.log('📡 Testing basic connection...');
    const testQuery = await sanityClient.fetch('*[_type == "product"][0...1]');
    console.log('✅ Basic connection successful');
    console.log('Sample query result:', testQuery);
    
    // Test 3: Get categories with error handling
    console.log('📂 Testing categories fetch...');
    let categories = [];
    try {
      categories = await sanityClient.fetch('*[_type == "category"] | order(name asc)');
      console.log(`✅ Found ${categories.length} categories`);
    } catch (catError) {
      console.log('⚠️ Categories query failed:', catError);
    }
    
    // Test 4: Get products with error handling
    console.log('📦 Testing products fetch...');
    let products = [];
    try {
      products = await sanityClient.fetch('*[_type == "product" && isActive == true] | order(createdAt desc)');
      console.log(`✅ Found ${products.length} products`);
    } catch (prodError) {
      console.log('⚠️ Products query failed:', prodError);
    }
    
    return NextResponse.json({
      success: true,
      message: 'Sanity.io connection test successful',
      results: {
        connection: '✅ Connected',
        categories: categories.length,
        products: products.length,
        hasToken: hasToken,
        projectId: '62anct3y',
        dataset: 'production'
      },
      sampleData: {
        categories: categories.slice(0, 3),
        products: products.slice(0, 2),
      }
    });

  } catch (error) {
    console.error('❌ Sanity.io connection test failed:', error);
    
    return NextResponse.json(
      {
        success: false,
        message: 'Sanity.io connection test failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        details: {
          projectId: '62anct3y',
          dataset: 'production',
          hasToken: !!process.env.SANITY_API_TOKEN,
        }
      },
      { status: 500 }
    );
  }
}
