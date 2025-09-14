/**
 * AI-Specific Pricing Service
 * CONVERTED: Now uses Supabase pricing exclusively
 * CSV functionality removed to prevent incorrect pricing like Polyester $2.00 bug
 */

import {
  getFabricPrice,
  getClosurePrice,
  getAccessoryPrice,
  getLogoPrice,
  getProductPrice
} from '@/lib/pricing/pricing-service';

// REMOVED: All CSV-based functions that were causing pricing bugs

/**
 * Find product tier from description - simplified for Supabase
 */
export async function findProductTierFromDescription(description: string): Promise<string> {
  console.log('ℹ️ [AI-PRICING] Product tier detection - using default Tier 1');
  return 'Tier 1'; // Simplified - Supabase pricing service handles tier logic
}

/**
 * Get AI accessory price - redirects to Supabase
 */
export async function getAIAccessoryPrice(accessoryName: string, quantity: number): Promise<number> {
  try {
    console.log(`🎁 [AI-PRICING] Getting accessory price from Supabase: ${accessoryName} x ${quantity}`);
    const result = await getAccessoryPrice(accessoryName, quantity);
    return result.unitPrice;
  } catch (error) {
    console.log(`ℹ️ [AI-PRICING] Accessory not found in Supabase: ${accessoryName}`);
    return 0;
  }
}

/**
 * Get AI logo price - redirects to Supabase
 */
export async function getAILogoPrice(logoName: string, size: string, application: string, quantity: number): Promise<{unitPrice: number, moldCharge: number}> {
  try {
    console.log(`🔤 [AI-PRICING] Getting logo price from Supabase: ${size} ${logoName} ${application} x ${quantity}`);
    const result = await getLogoPrice(logoName, size, application, quantity);
    return {
      unitPrice: result.unitPrice,
      moldCharge: result.moldCharge
    };
  } catch (error) {
    console.log(`ℹ️ [AI-PRICING] Logo method not found in Supabase: ${logoName}`);
    return { unitPrice: 0, moldCharge: 0 };
  }
}

/**
 * Get AI closure price - redirects to Supabase
 */
export async function getAIClosurePrice(closureName: string, quantity: number): Promise<number> {
  try {
    console.log(`🔒 [AI-PRICING] Getting closure price from Supabase: ${closureName} x ${quantity}`);
    const result = await getClosurePrice(closureName, quantity);
    return result.unitPrice;
  } catch (error) {
    console.log(`ℹ️ [AI-PRICING] Closure not found in Supabase: ${closureName}`);
    return 0;
  }
}

/**
 * Get AI fabric price - redirects to Supabase (FIXES POLYESTER $2.00 BUG)
 */
export async function getAIFabricPrice(fabricName: string, quantity: number): Promise<number> {
  try {
    console.log(`🧵 [AI-PRICING] CRITICAL FIX - Getting fabric price from Supabase: ${fabricName} x ${quantity}`);
    const result = await getFabricPrice(fabricName, quantity);
    console.log(`🧵 [AI-PRICING] Supabase result for ${fabricName}: $${result.unitPrice} (was causing $2.00 bug with CSV)`);
    return result.unitPrice;
  } catch (error) {
    console.log(`ℹ️ [AI-PRICING] Fabric not found in Supabase: ${fabricName}`);
    return 0;
  }
}

/**
 * Get AI delivery price - simplified fallback
 */
export async function getAIDeliveryPrice(deliveryMethod: string, quantity: number): Promise<number> {
  console.error(`❌ [AI-PRICING] Delivery pricing should use Supabase service: ${deliveryMethod} x ${quantity}`);
  throw new Error(`AI delivery pricing is deprecated - use Supabase delivery pricing service instead`);
}

/**
 * Get AI blank cap price - redirects to Supabase
 */
export async function getAIBlankCapPrice(tier: string, quantity: number, productDescription?: string): Promise<number> {
  try {
    console.log(`🧢 [AI-PRICING] Getting blank cap price from Supabase: ${tier} x ${quantity}`);
    // Use a default product name since Supabase uses product names
    const result = await getProductPrice('New Era 59FIFTY', quantity);
    return result.unitPrice;
  } catch (error) {
    console.error(`❌ [AI-PRICING] Failed to get blank cap pricing for tier: ${tier}`);
    const errorMessage = error instanceof Error ? error.message : 'Database connection error';
    throw new Error(`Failed to get blank cap pricing from database: ${errorMessage}`);
  }
}

/**
 * Get AI blank cap price by tier - redirects to above function
 */
export async function getAIBlankCapPriceByTier(tier: string, quantity: number): Promise<number> {
  return await getAIBlankCapPrice(tier, quantity);
}

/**
 * Clear AI pricing cache - no-op since we use Supabase caching
 */
export function clearAIPricingCache(): void {
  console.log('ℹ️ [AI-PRICING] Cache clear request - using Supabase caching instead');
  // No-op - Supabase pricing service has its own caching
}

// REMOVED: All CSV loading functions that were causing incorrect pricing
// - loadAIAccessories()
// - loadAILogo()
// - loadAIClosure()
// - loadAIFabric() ← This was causing Polyester to match "Polyester 97% Spandex 3%"
// - loadAIDelivery()
// - loadAIBlankCaps()
// - parseCSVLine()
// - getPriceForQuantity()