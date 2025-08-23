import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Testing Webflow API connection...');
    
    // Check environment variables
    const hasApiToken = !!process.env.WEBFLOW_API_TOKEN;
    const hasSiteId = !!process.env.WEBFLOW_SITE_ID;
    const hasProductsCollectionId = !!process.env.WEBFLOW_PRODUCTS_COLLECTION_ID;
    
    console.log('🔧 Environment variables check:');
    console.log(`✅ API Token: ${hasApiToken ? 'Set' : 'Missing'}`);
    console.log(`✅ Site ID: ${hasSiteId ? 'Set' : 'Missing'}`);
    console.log(`✅ Products Collection ID: ${hasProductsCollectionId ? 'Set' : 'Missing'}`);
    console.log(`📊 Pricing: Using CSV file (Blank Cap Pricings.csv)`);
    
    if (!hasApiToken || !hasSiteId) {
      return NextResponse.json({
        success: false,
        message: 'Missing required Webflow environment variables',
               details: {
         hasApiToken,
         hasSiteId,
         hasProductsCollectionId,
         apiTokenLength: process.env.WEBFLOW_API_TOKEN?.length || 0,
         siteId: process.env.WEBFLOW_SITE_ID || 'Not set',
         productsCollectionId: process.env.WEBFLOW_PRODUCTS_COLLECTION_ID || 'Not set',
         pricingSource: 'CSV file (Blank Cap Pricings.csv)',
       }
      }, { status: 400 });
    }
    
    // Test API connection by fetching site info
    console.log('📡 Testing Webflow API connection...');
    const siteResponse = await fetch(`https://api.webflow.com/v2/sites/${process.env.WEBFLOW_SITE_ID}`, {
      headers: {
        Authorization: `Bearer ${process.env.WEBFLOW_API_TOKEN}`,
        'accept-version': '2.0.0',
      },
    });
    
    if (!siteResponse.ok) {
      const errorText = await siteResponse.text();
      console.error('❌ Site API call failed:', errorText);
      return NextResponse.json({
        success: false,
        message: 'Failed to connect to Webflow API',
        details: {
          status: siteResponse.status,
          statusText: siteResponse.statusText,
          error: errorText,
          hasApiToken,
          hasSiteId,
          siteId: process.env.WEBFLOW_SITE_ID,
        }
      }, { status: siteResponse.status });
    }
    
    const siteData = await siteResponse.json();
    console.log('✅ Site API call successful');
    
         // Test CSV pricing data
     console.log('📊 Testing CSV pricing data...');
     let pricingTest = { success: false, error: 'CSV test not implemented' };
     try {
       // Note: webflow.ts file not found, skipping CSV test
       // const { loadBlankCapPricing } = await import('@/lib/webflow');
       // const csvPricingData = await loadBlankCapPricing();
       pricingTest = { 
         success: false, 
         error: 'webflow.ts library not found',
         source: 'CSV file (Blank Cap Pricings.csv)'
       };
       console.log('⚠️ CSV pricing test skipped - webflow.ts not found');
     } catch (error) {
       pricingTest = { 
         success: false, 
         error: error instanceof Error ? error.message : 'Unknown error',
         source: 'CSV file (Blank Cap Pricings.csv)'
       };
       console.error('❌ CSV pricing data test failed:', error);
     }
    
    // Test products collection if ID is available
    let productsTest = { success: false, error: 'No collection ID provided' };
    if (hasProductsCollectionId) {
      console.log('📦 Testing products collection...');
      try {
        const productsResponse = await fetch(
          `https://api.webflow.com/v2/sites/${process.env.WEBFLOW_SITE_ID}/collections/${process.env.WEBFLOW_PRODUCTS_COLLECTION_ID}/items`,
          {
            headers: {
              Authorization: `Bearer ${process.env.WEBFLOW_API_TOKEN}`,
              'accept-version': '2.0.0',
            },
          }
        );
        
        if (productsResponse.ok) {
          const productsData = await productsResponse.json();
          productsTest = { 
            success: true, 
            itemCount: productsData.items?.length || 0 
          };
          console.log(`✅ Products collection accessible, found ${productsData.items?.length || 0} items`);
        } else {
          const errorText = await productsResponse.text();
          productsTest = { 
            success: false, 
            error: errorText,
            status: productsResponse.status,
            statusText: productsResponse.statusText
          };
          console.error('❌ Products collection test failed:', errorText);
        }
      } catch (error) {
        productsTest = { 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        };
        console.error('❌ Products collection test error:', error);
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'Webflow API connection test completed',
      results: {
        siteConnection: '✅ Connected',
        siteName: siteData.name,
        siteId: siteData.id,
        pricingCollection: pricingTest,
        productsCollection: productsTest,
      },
             configuration: {
         hasApiToken,
         hasSiteId,
         hasProductsCollectionId,
         apiTokenLength: process.env.WEBFLOW_API_TOKEN?.length || 0,
         siteId: process.env.WEBFLOW_SITE_ID,
         productsCollectionId: process.env.WEBFLOW_PRODUCTS_COLLECTION_ID,
         pricingSource: 'CSV file (Blank Cap Pricings.csv)',
       }
    });

  } catch (error) {
    console.error('❌ Webflow API test failed:', error);
    
    return NextResponse.json(
      {
        success: false,
        message: 'Webflow API test failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
                 details: {
           hasApiToken: !!process.env.WEBFLOW_API_TOKEN,
           hasSiteId: !!process.env.WEBFLOW_SITE_ID,
           hasProductsCollectionId: !!process.env.WEBFLOW_PRODUCTS_COLLECTION_ID,
           pricingSource: 'CSV file (Blank Cap Pricings.csv)',
         }
      },
      { status: 500 }
    );
  }
}
