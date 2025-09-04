/**
 * API endpoint to test the 3D embroidery complex logo parsing fix
 */

import { costingService } from '@/lib/unified-costing-service';
import { NextResponse } from 'next/server';

export async function GET() {
 try {
  console.log('🧪 Testing 3D Embroidery Complex Logo Parsing Fix...');

  // Test configuration that should trigger the fix
  const testConfig = {
   quantity: 288,
   logoSetup: [{
    type: "Large Size Embroidery + 3D Embroidery + Run", // Complex logo type from AI
    size: "Large" as const,
    position: "Front" as const,
    application: "Direct" as const
   }],
   fabricType: "Genuine Leather",
   closureType: "snapback" as const,
   deliveryMethod: "regular" as const
  };

  console.log(`📊 Testing complex logo type: "${testConfig.logoSetup[0].type}"`);
  
  const costBreakdown = await costingService.calculateCostBreakdown(testConfig);
  
  // Manual calculation verification for 288 caps at 576-tier pricing
  const expectedLogoTotal = (288 * 0.70) + (288 * 0.12) + (288 * 0.20); // $201.60 + $34.56 + $57.60 = $293.76
  const actualLogoTotal = costBreakdown.logoSetupCosts.reduce((sum, cost) => sum + cost.cost, 0);
  const difference = Math.abs(expectedLogoTotal - actualLogoTotal);

  const testResult = {
   success: true,
   testConfig: {
    quantity: testConfig.quantity,
    logoType: testConfig.logoSetup[0].type,
    fabric: testConfig.fabricType,
   },
   costBreakdown: {
    totalUnits: costBreakdown.totalUnits,
    baseProductCost: costBreakdown.baseProductCost,
    logoSetupCosts: costBreakdown.logoSetupCosts.map(logo => ({
     name: logo.name,
     cost: logo.cost,
     unitPrice: logo.unitPrice,
     details: logo.details
    })),
    premiumFabricCost: costBreakdown.premiumFabricCosts.reduce((sum, cost) => sum + cost.cost, 0),
    deliveryCost: costBreakdown.deliveryCosts.reduce((sum, cost) => sum + cost.cost, 0),
    totalCost: costBreakdown.totalCost,
    costPerUnit: costBreakdown.totalCost / costBreakdown.totalUnits
   },
   verification: {
    expectedComponents: {
     largeSizeEmbroidery: { unitPrice: 0.70, quantity: 288, total: 201.60 },
     threeDEmbroidery: { unitPrice: 0.12, quantity: 288, total: 34.56 },
     runApplication: { unitPrice: 0.20, quantity: 288, total: 57.60 }
    },
    expectedLogoTotal: expectedLogoTotal,
    actualLogoTotal: actualLogoTotal,
    difference: difference,
    isCorrect: difference < 0.01
   }
  };

  console.log('✅ Test Results:', JSON.stringify(testResult, null, 2));

  return NextResponse.json(testResult);

 } catch (error) {
  console.error('❌ Test Error:', error);
  
  return NextResponse.json({
   success: false,
   error: error instanceof Error ? error.message : 'Unknown error',
   stack: error instanceof Error ? error.stack : undefined
  }, { status: 500 });
 }
}

export async function POST() {
 try {
  console.log('🔄 Comparing Simple vs Complex Logo Types...');

  // Test simple 3D embroidery
  const simpleConfig = {
   quantity: 288,
   logoSetup: [{
    type: "3D Embroidery",
    size: "Large" as const,
    position: "Front" as const,
    application: "Run" as const
   }],
   fabricType: "Genuine Leather",
   closureType: "snapback" as const,
   deliveryMethod: "regular" as const
  };

  // Test complex logo type
  const complexConfig = {
   quantity: 288,
   logoSetup: [{
    type: "Large Size Embroidery + 3D Embroidery + Run",
    size: "Large" as const,
    position: "Front" as const,
    application: "Direct" as const // Should be ignored due to Run in complex type
   }],
   fabricType: "Genuine Leather",
   closureType: "snapback" as const,
   deliveryMethod: "regular" as const
  };

  const simpleCosts = await costingService.calculateCostBreakdown(simpleConfig);
  const complexCosts = await costingService.calculateCostBreakdown(complexConfig);

  const simpleLogoTotal = simpleCosts.logoSetupCosts.reduce((sum, cost) => sum + cost.cost, 0);
  const complexLogoTotal = complexCosts.logoSetupCosts.reduce((sum, cost) => sum + cost.cost, 0);
  const difference = Math.abs(simpleLogoTotal - complexLogoTotal);

  const comparisonResult = {
   success: true,
   comparison: {
    simple: {
     logoType: simpleConfig.logoSetup[0].type,
     application: simpleConfig.logoSetup[0].application,
     logoTotal: simpleLogoTotal,
     totalCost: simpleCosts.totalCost,
     details: simpleCosts.logoSetupCosts.map(logo => ({
      name: logo.name,
      cost: logo.cost,
      details: logo.details
     }))
    },
    complex: {
     logoType: complexConfig.logoSetup[0].type,
     logoTotal: complexLogoTotal,
     totalCost: complexCosts.totalCost,
     details: complexCosts.logoSetupCosts.map(logo => ({
      name: logo.name,
      cost: logo.cost,
      details: logo.details
     }))
    },
    difference: difference,
    isIdentical: difference < 0.01
   }
  };

  console.log('🔍 Comparison Results:', JSON.stringify(comparisonResult, null, 2));

  return NextResponse.json(comparisonResult);

 } catch (error) {
  console.error('❌ Comparison Error:', error);
  
  return NextResponse.json({
   success: false,
   error: error instanceof Error ? error.message : 'Unknown error',
   stack: error instanceof Error ? error.stack : undefined
  }, { status: 500 });
 }
}