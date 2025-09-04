/**
 * ORDER AI PRODUCT DATA ENDPOINT
 * 
 * Provides CSV-based product data and pricing to the Order AI system
 * for accurate product selection and cost calculation.
 */

import { NextRequest, NextResponse } from 'next/server';
import { loadCustomerProductsServer, loadBlankCapPricingServer } from '@/lib/server/webflow-server';

interface ProductWithPricing {
 name: string;
 profile: string;
 billOrVisorShape: string;
 panelCount: string;
 priceTier: string;
 structureType: string;
 nickNames: string;
 pricing?: {
  price48: number;
  price144: number;
  price576: number;
  price1152: number;
  price2880: number;
  price10000: number;
 };
}

export async function GET(request: NextRequest) {
 try {
  const { searchParams } = new URL(request.url);
  const tier = searchParams.get('tier');
  const profile = searchParams.get('profile');
  const panelCount = searchParams.get('panelCount');
  
  console.log('📊 [ORDER-AI-PRODUCTS] Loading CSV product data for Order AI');
  
  // Load product data from Customer Products CSV
  const customerProducts = await loadCustomerProductsServer();
  console.log(`📦 [ORDER-AI-PRODUCTS] Loaded ${customerProducts.length} customer products from CSV`);
  
  // Load pricing data from Blank Cap Pricings CSV
  const blankCapPricing = await loadBlankCapPricingServer();
  console.log(`💰 [ORDER-AI-PRODUCTS] Loaded ${blankCapPricing.length} pricing tiers from CSV`);
  
  // Create pricing lookup map
  const pricingMap = new Map();
  blankCapPricing.forEach(pricing => {
   pricingMap.set(pricing.Name, {
    price48: pricing.price48,
    price144: pricing.price144,
    price576: pricing.price576,
    price1152: pricing.price1152,
    price2880: pricing.price2880,
    price10000: pricing.price10000,
   });
  });
  
  // Combine products with their pricing data
  let productsWithPricing: ProductWithPricing[] = customerProducts.map(product => ({
   name: product.Name,
   profile: product.Profile,
   billOrVisorShape: product.BillOrVisorShape,
   panelCount: product.PanelCount,
   priceTier: product.PriceTier,
   structureType: product.StructureType,
   nickNames: product.NickNames,
   pricing: pricingMap.get(product.PriceTier)
  }));
  
  // Apply filters if specified
  if (tier) {
   productsWithPricing = productsWithPricing.filter(p => 
    p.priceTier.toLowerCase() === tier.toLowerCase()
   );
  }
  
  if (profile) {
   productsWithPricing = productsWithPricing.filter(p => 
    p.profile.toLowerCase() === profile.toLowerCase()
   );
  }
  
  if (panelCount) {
   productsWithPricing = productsWithPricing.filter(p => 
    p.panelCount.toLowerCase().includes(panelCount.toLowerCase())
   );
  }
  
  // Group products by tier for AI analysis
  const productsByTier = {
   'Tier 1': productsWithPricing.filter(p => p.priceTier === 'Tier 1'),
   'Tier 2': productsWithPricing.filter(p => p.priceTier === 'Tier 2'),
   'Tier 3': productsWithPricing.filter(p => p.priceTier === 'Tier 3'),
  };
  
  // Create summary for AI context
  const productSummary = {
   totalProducts: productsWithPricing.length,
   availableTiers: Object.keys(productsByTier).filter(tier => productsByTier[tier].length > 0),
   profiles: [...new Set(productsWithPricing.map(p => p.profile))],
   panelCounts: [...new Set(productsWithPricing.map(p => p.panelCount))],
   structureTypes: [...new Set(productsWithPricing.map(p => p.structureType))],
  };
  
  console.log(`✅ [ORDER-AI-PRODUCTS] Returning ${productsWithPricing.length} products with pricing`);
  
  return NextResponse.json({
   products: productsWithPricing,
   productsByTier,
   summary: productSummary,
   pricing: Object.fromEntries(pricingMap),
   message: `Loaded ${productsWithPricing.length} products from CSV with accurate pricing`
  });
  
 } catch (error) {
  console.error('❌ [ORDER-AI-PRODUCTS] Error loading CSV product data:', error);
  return NextResponse.json(
   { error: 'Failed to load product data from CSV' },
   { status: 500 }
  );
 }
}

// Helper function to get best product match for AI requirements
export async function POST(request: NextRequest) {
 try {
  const { requirements, preferences } = await request.json();
  
  console.log('🎯 [ORDER-AI-PRODUCTS] Finding best product match for requirements:', requirements);
  
  // Load all products with pricing
  const getResponse = await GET(new NextRequest(request.url));
  const { products, productsByTier } = await getResponse.json();
  
  // Find best matches based on requirements
  let matchedProducts = products;
  
  // Filter by price tier if budget specified
  if (requirements.budget) {
   // Determine optimal tier based on budget
   const budgetPerUnit = requirements.budget / (requirements.quantity || 150);
   
   if (budgetPerUnit <= 4.0) {
    matchedProducts = productsByTier['Tier 1'] || [];
   } else if (budgetPerUnit <= 4.5) {
    matchedProducts = productsByTier['Tier 2'] || [];
   } else {
    matchedProducts = productsByTier['Tier 3'] || [];
   }
  }
  
  // Filter by preferences
  if (preferences?.profile) {
   matchedProducts = matchedProducts.filter(p => 
    p.profile.toLowerCase() === preferences.profile.toLowerCase()
   );
  }
  
  if (preferences?.panelCount) {
   matchedProducts = matchedProducts.filter(p => 
    p.panelCount.toLowerCase().includes(preferences.panelCount.toString())
   );
  }
  
  if (preferences?.billStyle) {
   matchedProducts = matchedProducts.filter(p => 
    p.billOrVisorShape.toLowerCase().includes(preferences.billStyle.toLowerCase())
   );
  }
  
  // Default to first available product if no matches
  const recommendedProduct = matchedProducts[0] || products[0];
  
  console.log(`✅ [ORDER-AI-PRODUCTS] Recommended product: ${recommendedProduct?.name || 'None found'}`);
  
  return NextResponse.json({
   recommendedProduct,
   availableProducts: matchedProducts.slice(0, 5), // Top 5 matches
   totalMatches: matchedProducts.length
  });
  
 } catch (error) {
  console.error('❌ [ORDER-AI-PRODUCTS] Error finding product match:', error);
  return NextResponse.json(
   { error: 'Failed to find product match' },
   { status: 500 }
  );
 }
}