/**
 * Costing Validation Functions
 * 
 * Provides comprehensive validation and consistency checking
 * for cost calculations across all systems.
 */

import {
  CostingContext,
  CostBreakdownResult,
  LogoSetupConfig,
  BUSINESS_RULES,
  validateQuantity,
  validateLogoSetup,
  validateDeliveryMethod,
  getQuantityTier,
  isPremiumFabric,
  isPremiumClosure,
  requiresMoldCharge
} from './costing-knowledge-base';

import { costingService } from './unified-costing-service';

// Validation result interfaces
export interface ValidationResult {
  valid: boolean;
  errors?: string[];
  warnings?: string[];
}

export interface CostConsistencyResult {
  consistent: boolean;
  discrepancies?: Array<{
    component: string;
    expected: number;
    actual: number;
    difference: number;
    percentageDiff: number;
  }>;
  totalDiscrepancy?: number;
}

export interface BusinessRuleValidationResult {
  valid: boolean;
  ruleViolations?: Array<{
    rule: string;
    violation: string;
    recommendation: string;
  }>;
}

/**
 * Comprehensive validation of costing context
 */
export function validateCostingContext(context: CostingContext): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate quantity
  const quantityValidation = validateQuantity(context.quantity);
  if (!quantityValidation.valid && quantityValidation.error) {
    errors.push(quantityValidation.error);
  }

  // Validate logo setup if provided
  if (context.logoSetup) {
    const logoValidation = validateLogoSetup(context.logoSetup);
    if (!logoValidation.valid && logoValidation.errors) {
      errors.push(...logoValidation.errors);
    }
  }

  // Validate delivery method if provided
  if (context.deliveryMethod) {
    const deliveryValidation = validateDeliveryMethod(context.deliveryMethod, context.quantity);
    if (!deliveryValidation.valid && deliveryValidation.error) {
      errors.push(deliveryValidation.error);
    }
  }

  // Validate fabric type
  if (context.fabricType) {
    const validFabrics = [
      'Chino Twill', 'Chino Twill/Trucker Mesh',
      ...BUSINESS_RULES.PREMIUM_FABRICS
    ];
    
    const fabricNames = context.fabricType.split('/').map(f => f.trim());
    const invalidFabrics = fabricNames.filter(f => !validFabrics.includes(f));
    
    if (invalidFabrics.length > 0) {
      warnings.push(`Unknown fabric types: ${invalidFabrics.join(', ')}`);
    }
  }

  // Validate closure type
  if (context.closureType) {
    const validClosures = [
      'snapback', 'velcro', 
      ...BUSINESS_RULES.PREMIUM_CLOSURES
    ];
    
    if (!validClosures.includes(context.closureType.toLowerCase())) {
      warnings.push(`Unknown closure type: ${context.closureType}`);
    }
  }

  // Validate services
  if (context.services) {
    const validServices = ['Graphics', 'Sampling'];
    const invalidServices = context.services.filter(s => !validServices.includes(s));
    
    if (invalidServices.length > 0) {
      warnings.push(`Unknown services: ${invalidServices.join(', ')}`);
    }
  }

  // Validate accessories
  if (context.accessories) {
    const validAccessories = [
      'Hang Tag', 'Inside Label', 'B-Tape Print', 
      'Sticker', 'Metal Eyelet', 'Rope Cost'
    ];
    const invalidAccessories = context.accessories.filter(a => !validAccessories.includes(a));
    
    if (invalidAccessories.length > 0) {
      warnings.push(`Unknown accessories: ${invalidAccessories.join(', ')}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
    warnings: warnings.length > 0 ? warnings : undefined
  };
}

/**
 * Validate business rules compliance
 */
export function validateBusinessRules(context: CostingContext): BusinessRuleValidationResult {
  const ruleViolations: Array<{
    rule: string;
    violation: string;
    recommendation: string;
  }> = [];

  // Rule: Freight shipping minimum quantity
  if (context.deliveryMethod === 'air-freight' || context.deliveryMethod === 'sea-freight') {
    if (context.quantity < BUSINESS_RULES.FREIGHT_SHIPPING.AIR_FREIGHT_MIN) {
      ruleViolations.push({
        rule: 'FREIGHT_SHIPPING_MINIMUM',
        violation: `${context.deliveryMethod} requires minimum ${BUSINESS_RULES.FREIGHT_SHIPPING.AIR_FREIGHT_MIN} units`,
        recommendation: `Increase quantity to ${BUSINESS_RULES.FREIGHT_SHIPPING.AIR_FREIGHT_MIN} or choose regular delivery`
      });
    }
  }

  // Rule: Mold charges for patch types
  if (context.logoSetup) {
    context.logoSetup.forEach((logo, index) => {
      if (requiresMoldCharge(logo.type) && !context.previousOrderNumber) {
        const moldCharge = logo.size === 'Small' ? 40 : logo.size === 'Large' ? 80 : 60;
        ruleViolations.push({
          rule: 'MOLD_CHARGE_REQUIRED',
          violation: `${logo.type} requires mold charge of $${moldCharge}`,
          recommendation: 'Consider embroidery options to avoid mold charges, or provide previous order number if reusing same logo'
        });
      }
    });
  }

  // Rule: Premium pricing warnings
  if (isPremiumFabric(context.fabricType || '')) {
    ruleViolations.push({
      rule: 'PREMIUM_FABRIC_COST',
      violation: `${context.fabricType} is a premium fabric with additional costs`,
      recommendation: `Consider ${BUSINESS_RULES.DEFAULTS.fabricType} for budget-friendly option`
    });
  }

  if (isPremiumClosure(context.closureType || '')) {
    ruleViolations.push({
      rule: 'PREMIUM_CLOSURE_COST',
      violation: `${context.closureType} is a premium closure with additional costs`,
      recommendation: `Consider ${BUSINESS_RULES.DEFAULTS.closure} for budget-friendly option`
    });
  }

  return {
    valid: ruleViolations.length === 0,
    ruleViolations: ruleViolations.length > 0 ? ruleViolations : undefined
  };
}

/**
 * Check cost consistency between two calculation results
 */
export function validateCostConsistency(
  result1: CostBreakdownResult,
  result2: CostBreakdownResult,
  tolerance: number = 0.01 // 1% tolerance
): CostConsistencyResult {
  const discrepancies: Array<{
    component: string;
    expected: number;
    actual: number;
    difference: number;
    percentageDiff: number;
  }> = [];

  // Helper function to check component consistency
  const checkComponent = (component: string, expected: number, actual: number) => {
    const difference = Math.abs(expected - actual);
    const percentageDiff = expected > 0 ? (difference / expected) * 100 : 0;
    
    if (percentageDiff > tolerance * 100) {
      discrepancies.push({
        component,
        expected,
        actual,
        difference,
        percentageDiff
      });
    }
  };

  // Check base product cost
  checkComponent('Base Product Cost', result1.baseProductCost, result2.baseProductCost);

  // Check logo setup total
  const logo1Total = result1.logoSetupCosts.reduce((sum, cost) => sum + cost.cost, 0);
  const logo2Total = result2.logoSetupCosts.reduce((sum, cost) => sum + cost.cost, 0);
  checkComponent('Logo Setup Total', logo1Total, logo2Total);

  // Check accessories total
  const accessories1Total = result1.accessoriesCosts.reduce((sum, cost) => sum + cost.cost, 0);
  const accessories2Total = result2.accessoriesCosts.reduce((sum, cost) => sum + cost.cost, 0);
  checkComponent('Accessories Total', accessories1Total, accessories2Total);

  // Check closure total
  const closure1Total = result1.closureCosts.reduce((sum, cost) => sum + cost.cost, 0);
  const closure2Total = result2.closureCosts.reduce((sum, cost) => sum + cost.cost, 0);
  checkComponent('Closure Total', closure1Total, closure2Total);

  // Check premium fabric total
  const fabric1Total = result1.premiumFabricCosts.reduce((sum, cost) => sum + cost.cost, 0);
  const fabric2Total = result2.premiumFabricCosts.reduce((sum, cost) => sum + cost.cost, 0);
  checkComponent('Premium Fabric Total', fabric1Total, fabric2Total);

  // Check delivery total
  const delivery1Total = result1.deliveryCosts.reduce((sum, cost) => sum + cost.cost, 0);
  const delivery2Total = result2.deliveryCosts.reduce((sum, cost) => sum + cost.cost, 0);
  checkComponent('Delivery Total', delivery1Total, delivery2Total);

  // Check services total
  const services1Total = result1.servicesCosts.reduce((sum, cost) => sum + cost.cost, 0);
  const services2Total = result2.servicesCosts.reduce((sum, cost) => sum + cost.cost, 0);
  checkComponent('Services Total', services1Total, services2Total);

  // Check mold charge total
  const mold1Total = result1.moldChargeCosts.reduce((sum, cost) => sum + cost.cost, 0);
  const mold2Total = result2.moldChargeCosts.reduce((sum, cost) => sum + cost.cost, 0);
  checkComponent('Mold Charge Total', mold1Total, mold2Total);

  // Check overall total
  checkComponent('Total Cost', result1.totalCost, result2.totalCost);

  const totalDiscrepancy = Math.abs(result1.totalCost - result2.totalCost);

  return {
    consistent: discrepancies.length === 0,
    discrepancies: discrepancies.length > 0 ? discrepancies : undefined,
    totalDiscrepancy: totalDiscrepancy > 0 ? totalDiscrepancy : undefined
  };
}

/**
 * Validate that AI-parsed context matches expected values
 */
export function validateAIParsing(
  originalText: string,
  parsedContext: CostingContext,
  expectedQuantity?: number,
  expectedFabric?: string,
  expectedLogoType?: string
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate quantity parsing
  if (expectedQuantity && Math.abs(parsedContext.quantity - expectedQuantity) > 0) {
    errors.push(`Quantity mismatch: expected ${expectedQuantity}, parsed ${parsedContext.quantity}`);
  }

  // Validate fabric parsing
  if (expectedFabric && parsedContext.fabricType !== expectedFabric) {
    warnings.push(`Fabric mismatch: expected ${expectedFabric}, parsed ${parsedContext.fabricType}`);
  }

  // Validate logo type parsing
  if (expectedLogoType && parsedContext.logoSetup) {
    const hasExpectedLogo = parsedContext.logoSetup.some(logo => 
      logo.type.toLowerCase().includes(expectedLogoType.toLowerCase())
    );
    
    if (!hasExpectedLogo) {
      warnings.push(`Logo type not found: expected ${expectedLogoType} in parsed setup`);
    }
  }

  // Check for common parsing issues
  const lowerText = originalText.toLowerCase();
  
  // Check if "no logo" was mentioned but logos were parsed
  if ((lowerText.includes('no logo') || lowerText.includes('blank')) && 
      parsedContext.logoSetup && parsedContext.logoSetup.length > 0) {
    warnings.push('Text mentions "no logo" but logo setup was parsed');
  }

  // Check if premium features were mentioned but not parsed
  if (lowerText.includes('premium') && 
      !isPremiumFabric(parsedContext.fabricType || '') && 
      !isPremiumClosure(parsedContext.closureType || '')) {
    warnings.push('Text mentions "premium" but no premium features were parsed');
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
    warnings: warnings.length > 0 ? warnings : undefined
  };
}

/**
 * Generate cost validation report
 */
export async function generateCostValidationReport(context: CostingContext): Promise<{
  contextValidation: ValidationResult;
  businessRuleValidation: BusinessRuleValidationResult;
  costBreakdown: CostBreakdownResult;
  recommendations: string[];
}> {
  // Validate context
  const contextValidation = validateCostingContext(context);
  
  // Validate business rules
  const businessRuleValidation = validateBusinessRules(context);
  
  // Calculate cost breakdown
  const costBreakdown = await costingService.calculateCostBreakdown(context);
  
  // Generate recommendations
  const recommendations = costingService.getBudgetOptimizations(context);

  return {
    contextValidation,
    businessRuleValidation,
    costBreakdown,
    recommendations
  };
}

/**
 * Test cost calculation consistency across different scenarios
 */
export async function runConsistencyTests(): Promise<{
  passed: boolean;
  results: Array<{
    test: string;
    passed: boolean;
    details?: string;
  }>;
}> {
  const results: any[] = [];
  let allPassed = true;

  // Test 1: Same configuration should produce identical results
  const context1: CostingContext = {
    quantity: 144,
    logoSetup: [
      { type: '3D Embroidery', size: 'Large', position: 'Front', application: 'Direct' }
    ],
    fabricType: 'Chino Twill',
    closureType: 'snapback',
    deliveryMethod: 'regular'
  };

  const result1a = await costingService.calculateCostBreakdown(context1);
  const result1b = await costingService.calculateCostBreakdown({ ...context1 });
  
  const consistency1 = validateCostConsistency(result1a, result1b);
  results.push({
    test: 'Identical Configuration Consistency',
    passed: consistency1.consistent,
    details: consistency1.consistent ? undefined : `Total discrepancy: $${consistency1.totalDiscrepancy?.toFixed(2)}`
  });
  
  if (!consistency1.consistent) allPassed = false;

  // Test 2: Quantity tier boundaries
  const context2a: CostingContext = { ...context1, quantity: 143 };
  const context2b: CostingContext = { ...context1, quantity: 144 };
  
  const result2a = await costingService.calculateCostBreakdown(context2a);
  const result2b = await costingService.calculateCostBreakdown(context2b);
  
  const perUnit2a = result2a.totalCost / result2a.totalUnits;
  const perUnit2b = result2b.totalCost / result2b.totalUnits;
  
  const tierBoundaryCorrect = perUnit2b < perUnit2a; // 144 should be cheaper per unit than 143
  results.push({
    test: 'Quantity Tier Boundary (143 vs 144)',
    passed: tierBoundaryCorrect,
    details: tierBoundaryCorrect ? undefined : `Per unit pricing: 143 units = $${perUnit2a.toFixed(3)}, 144 units = $${perUnit2b.toFixed(3)}`
  });
  
  if (!tierBoundaryCorrect) allPassed = false;

  // Test 3: Mold charge logic
  const context3a: CostingContext = {
    quantity: 144,
    logoSetup: [
      { type: 'Rubber Patch', size: 'Medium', position: 'Front', application: 'Direct' }
    ]
  };
  
  const context3b: CostingContext = {
    ...context3a,
    previousOrderNumber: 'TEST123'
  };
  
  const result3a = await costingService.calculateCostBreakdown(context3a);
  const result3b = await costingService.calculateCostBreakdown(context3b);
  
  const moldCharge3a = result3a.moldChargeCosts.reduce((sum, cost) => sum + cost.cost, 0);
  const moldCharge3b = result3b.moldChargeCosts.reduce((sum, cost) => sum + cost.cost, 0);
  
  const moldWaiverWorking = moldCharge3a > 0 && moldCharge3b === 0;
  results.push({
    test: 'Mold Charge Waiver Logic',
    passed: moldWaiverWorking,
    details: moldWaiverWorking ? undefined : `Without previous order: $${moldCharge3a}, with previous order: $${moldCharge3b}`
  });
  
  if (!moldWaiverWorking) allPassed = false;

  return {
    passed: allPassed,
    results
  };
}

// Export validation utilities
export {
  validateQuantity,
  validateLogoSetup,
  validateDeliveryMethod,
  getQuantityTier,
  isPremiumFabric,
  isPremiumClosure,
  requiresMoldCharge
} from './costing-knowledge-base';