import { NextRequest, NextResponse } from 'next/server';
import { 
  calculatePreciseOrderEstimate,
  parseOrderRequirements,
  type OrderRequirements
} from '@/lib/order-ai-core';

interface QuantityPricingRequest {
  baseRequirements: OrderRequirements;
  quantities?: number[];
}

export async function POST(request: NextRequest) {
  try {
    const { baseRequirements, quantities }: QuantityPricingRequest = await request.json();
    
    if (!baseRequirements) {
      return NextResponse.json({ 
        error: 'Base requirements are required' 
      }, { status: 400 });
    }

    // Default quantity tiers based on CSV pricing structure
    const defaultQuantities = [48, 144, 576, 1152, 2880, 10000];
    const targetQuantities = quantities || defaultQuantities;

    console.log(`🧮 [QUANTITY-PRICING] Calculating pricing for ${targetQuantities.length} quantities:`, targetQuantities);

    const pricingOptions = [];

    for (const quantity of targetQuantities) {
      try {
        // Create requirements for this quantity
        const requirements: OrderRequirements = {
          ...baseRequirements,
          quantity
        };

        // Calculate precise estimate for this quantity
        const estimate = await calculatePreciseOrderEstimate(requirements);
        
        if (estimate && estimate.costBreakdown) {
          pricingOptions.push({
            quantity,
            pricing: {
              baseProductCost: estimate.costBreakdown.baseProductTotal || 0,
              logosCost: estimate.costBreakdown.logoSetupTotal || 0,
              deliveryCost: estimate.costBreakdown.deliveryTotal || 0,
              accessoriesCost: estimate.costBreakdown.accessoriesTotal || 0,
              closureCost: estimate.costBreakdown.closureTotal || 0,
              moldChargeCost: estimate.costBreakdown.moldChargeTotal || 0,
              premiumFabricCost: estimate.costBreakdown.premiumFabricTotal || 0,
              servicesCost: estimate.costBreakdown.servicesTotal || 0,
              total: estimate.costBreakdown.totalCost || 0
            },
            costPerUnit: estimate.orderEstimate?.costPerUnit || 0,
            orderEstimate: estimate.orderEstimate,
            tier: baseRequirements.panelCount === 7 ? 'Tier 3' : 
                  (baseRequirements.panelCount === 6 ? 'Tier 2' : 'Tier 1')
          });
        }
      } catch (error) {
        console.error(`Error calculating for quantity ${quantity}:`, error);
        // Continue with other quantities even if one fails
      }
    }

    console.log(`✅ [QUANTITY-PRICING] Generated ${pricingOptions.length} pricing options`);

    return NextResponse.json({
      success: true,
      pricingOptions,
      baseRequirements,
      message: `Generated pricing for ${pricingOptions.length} quantity options`
    });

  } catch (error) {
    console.error('❌ [QUANTITY-PRICING] Error generating quantity pricing:', error);
    
    return NextResponse.json({
      error: 'Failed to generate quantity pricing',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}