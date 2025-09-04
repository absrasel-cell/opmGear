# Unified Costing Knowledge Base Documentation

## 🎯 Overview

The **Unified Costing Knowledge Base** is the single source of truth for ALL cost calculation rules across the US Custom Cap platform. This system ensures perfect consistency between the Advanced Product Page (`/customize/[slug]`) and the AI Order system (`/order`).

## 📁 Architecture

### Core Files

```
src/lib/
├── costing-knowledge-base.ts    # Main rules engine & knowledge base
├── unified-costing-service.ts   # Unified calculation service  
├── costing-validation.ts        # Validation & consistency checking
└── pricing.ts                   # Base pricing tiers (legacy support)
```

## 🔧 Core Components

### 1. **Costing Knowledge Base** (`costing-knowledge-base.ts`)

**Purpose**: Central repository of all costing rules, business logic, and cost calculation parameters.

#### **Premium Cost Rules**
```typescript
// Premium Fabric Costs (per cap, quantity-based tiers)
const PREMIUM_FABRIC_COSTS = {
  'Acrylic': { price48: 1.20, price576: 0.80, price1152: 0.60, ... },
  'Suede Cotton': { price48: 2.00, price576: 1.80, price1152: 1.55, ... },
  'Genuine Leather': { price48: 2.00, price576: 1.80, price1152: 1.55, ... },
  // ... more fabrics
};

// Mold Charges (one-time charges)
const MOLD_CHARGES = {
  'Small': 40,
  'Medium': 60, 
  'Large': 80
};

// Premium Closure Costs (per cap, quantity-based)
const PREMIUM_CLOSURE_COSTS = {
  'Fitted': { price48: 0.50, price576: 0.30, price1152: 0.15, ... },
  'Flexfit': { price48: 0.50, price576: 0.30, price1152: 0.15, ... },
  // ... more closures
};
```

#### **Business Rules Engine**
```typescript
// Automatic Mold Waiver Conditions
const MOLD_WAIVER_RULES = {
  minimumQuantity: 500,           // Auto-waive for 500+ caps
  minimumOrderValue: 2500,        // Auto-waive for $2,500+ orders
  customerTiers: ['WHOLESALE'],   // Auto-waive for wholesale customers
  repeatOrderGracePeriod: 90      // Days to waive for repeat orders
};

// Cost Validation Rules
const COST_VALIDATION_RULES = {
  maximumLogoSetups: 8,           // Max 8 logo setups per order
  minimumQuantityForFreight: 3168, // Min quantity for freight delivery
  maximumUnitCost: 50,            // Flag orders over $50/unit
  maximumOrderValue: 100000       // Flag orders over $100k
};
```

#### **AI Detection Rules**
```typescript
// Natural language patterns for AI system
const AI_FABRIC_PATTERNS = {
  'acrylic': /\b(acrylic|acrylic fabric)\b/i,
  'suede cotton': /\b(suede|suede cotton|soft cotton)\b/i,
  'genuine leather': /\b(leather|genuine leather|real leather)\b/i,
  // ... more patterns
};

const AI_LOGO_PATTERNS = {
  'rubber_patch': /\b(rubber patch|rubber|patch)\b/i,
  'leather_patch': /\b(leather patch|leather badge)\b/i,
  '3d_embroidery': /\b(3d|three.?d|raised|3d embroidery)\b/i,
  // ... more patterns  
};
```

### 2. **Unified Costing Service** (`unified-costing-service.ts`)

**Purpose**: Single calculation engine used by both Advanced Product Page and AI system.

#### **Main Calculation Function**
```typescript
export async function calculateUnifiedCosts(context: CostingContext): Promise<UnifiedCostResult>
```

**Key Features:**
- **Consistent Logic**: Same calculation rules for all systems
- **Comprehensive Breakdown**: All cost components with explanations
- **Mold Charge Logic**: Automatic waiver conditions
- **Performance Optimized**: Quick estimation for AI responses
- **Error Handling**: Robust fallbacks and validation

#### **Quick Estimation for AI**
```typescript
export async function quickEstimation(orderDetails: any): Promise<QuickEstimate>
```

**Purpose**: Fast cost calculation for AI chat responses with simplified breakdown.

### 3. **Costing Validation** (`costing-validation.ts`)

**Purpose**: Validation and consistency checking across all systems.

#### **Validation Functions**
```typescript
// Input validation
export function validateCostingContext(context: CostingContext): ValidationResult

// Business rule compliance  
export function validateBusinessRules(context: CostingContext): ValidationResult

// Cost consistency between systems
export function validateCostConsistency(
  aiResult: any, 
  advancedPageResult: any
): ValidationResult

// AI parsing accuracy
export function validateAIParsing(
  originalText: string, 
  parsedResult: any
): ValidationResult
```

#### **Test Suite**
```typescript
// Automated consistency testing
export function runConsistencyTests(): TestResults
```

## 🎯 Integration Guide

### For Advanced Product Page

```typescript
import { calculateUnifiedCosts, CostingContext } from '@/lib/unified-costing-service';

// Replace existing cost calculation with unified service
const context: CostingContext = {
  products: cartItems,
  logoSetups: selectedLogos,
  deliveryMethod: selectedDelivery,
  // ... other context
};

const result = await calculateUnifiedCosts(context);
// Use result.breakdown for display
```

### For AI Order System

```typescript
import { quickEstimation } from '@/lib/unified-costing-service';
import { detectPremiumFeatures } from '@/lib/costing-knowledge-base';

// Enhanced AI parsing using knowledge base
const detectedFeatures = detectPremiumFeatures(userMessage);
const estimate = await quickEstimation({
  ...orderDetails,
  ...detectedFeatures
});
```

## 📊 Cost Components

### Base Product Cost
- Uses CSV-based tier pricing (`Blank Cap Pricings.csv`)
- Quantity tiers: 48, 144, 576, 1152, 2880, 10000+
- Tier-based pricing (Tier 1, Tier 2, Tier 3)

### Logo Setup Costs
- Position-based pricing (Front, Back, Left, Right, Bill)
- Size-based pricing (Small, Medium, Large)
- Application-based pricing (Direct, Transfer)
- Mold charges for special logo types

### Premium Fabric Costs
- **Standard Fabrics**: No additional cost
- **Premium Fabrics**: Additional per-cap cost with quantity tiers
- **Supported**: Acrylic, Suede Cotton, Genuine Leather, Air Mesh, Camo, Laser Cut

### Premium Closure Costs
- **Standard Closures**: Snapback, Velcro (no additional cost)
- **Premium Closures**: Fitted, Flexfit, Buckle, Stretched (additional cost)
- Quantity-based pricing tiers

### Delivery Costs
- Regular Delivery, Priority Delivery (all quantities)
- Air Freight, Sea Freight (minimum 3168 units)
- Quantity-based pricing tiers

### Services Costs
- Custom services with per-cap or flat-rate pricing
- Optional services like sampling, artwork, etc.

## 🔒 Business Rules

### Mold Charge Waivers
1. **Quantity-based**: 500+ caps auto-waives mold charges
2. **Value-based**: $2,500+ orders auto-waives mold charges  
3. **Customer-based**: Wholesale customers get auto-waiver
4. **Repeat Orders**: 90-day grace period for repeat orders

### Cost Validation
1. **Maximum Logos**: 8 logo setups per order
2. **Freight Minimum**: 3168 units for freight delivery
3. **Cost Alerts**: Flag orders over $50/unit or $100k total
4. **Required Fields**: Validate all required inputs

### Default Configurations
1. **Budget-Friendly Defaults**: 6-Panel, High Profile, Structured, Snapback
2. **Fabric Defaults**: Chino Twill (solid), Chino Twill/Trucker Mesh (split)
3. **Logo Defaults**: 3D Embroidery (Front), Embroidery (other positions)
4. **Delivery Default**: Regular Delivery

## 🧪 Testing & Validation

### Consistency Tests
```bash
# Run automated test suite
node test-unified-costing.js
```

**Tests Include:**
- Basic cost calculation consistency
- Premium feature detection accuracy
- Business rule compliance
- Edge case handling
- Performance benchmarks

### Manual Testing Scenarios
1. **Large Mixed Orders**: Multiple colors, sizes, premium features
2. **Edge Cases**: Minimum/maximum quantities, unusual combinations
3. **AI Detection**: Various natural language inputs
4. **Cost Validation**: Business rule edge cases

## 📈 Performance Optimization

### Caching Strategy
- **CSV Data**: Loaded once at startup, cached in memory
- **Calculation Results**: Cache frequently used calculations
- **AI Patterns**: Pre-compiled regex patterns for fast matching

### Quick Estimation
- **Simplified Logic**: Fast calculations for AI responses
- **Essential Components**: Focus on major cost drivers
- **Fallback Systems**: Graceful degradation if full calculation fails

## 🔄 Migration Guide

### From Legacy Systems
1. **Update AI System**: Already migrated to use unified service
2. **Update Advanced Product Page**: Modify to use unified service
3. **Update API Endpoints**: Reference unified service for calculations
4. **Deprecate Legacy**: Gradually remove old calculation logic

### Backward Compatibility
- **Legacy Interfaces**: Maintained for existing integrations
- **Gradual Migration**: Phase out old systems over time
- **Data Format**: Compatible with existing data structures

## 📝 Maintenance Guide

### Adding New Cost Rules
1. **Update Knowledge Base**: Add new rules to `costing-knowledge-base.ts`
2. **Update Service**: Extend unified service if needed
3. **Add Validation**: Include new rules in validation functions
4. **Update Tests**: Add test cases for new rules
5. **Update Documentation**: Document new rules and behavior

### Modifying Existing Rules
1. **Test Impact**: Run consistency tests before changes
2. **Update Knowledge Base**: Modify rules in single location
3. **Validate Changes**: Ensure no breaking changes
4. **Update Tests**: Modify test cases as needed
5. **Version Control**: Tag significant rule changes

## 🚀 Future Enhancements

### Planned Features
1. **Dynamic Pricing**: Real-time pricing updates from external sources
2. **Customer-Specific Rules**: Pricing tiers based on customer history
3. **Seasonal Adjustments**: Automatic pricing adjustments
4. **Advanced Analytics**: Cost prediction and optimization
5. **API Integration**: External pricing service integration

### Extensibility
- **Plugin System**: Add custom costing rules
- **External Data**: Integration with external pricing sources
- **Machine Learning**: AI-powered cost optimization
- **Real-time Updates**: Dynamic rule updates without deployment

---

## 📞 Support & Troubleshooting

### Common Issues
1. **Cost Discrepancies**: Check validation functions for inconsistencies
2. **AI Detection Errors**: Review and update detection patterns
3. **Performance Issues**: Check caching and optimization settings
4. **Validation Failures**: Review business rule compliance

### Debugging
```typescript
// Enable detailed logging
const result = await calculateUnifiedCosts(context, { debug: true });

// Run validation checks
const validation = validateCostConsistency(aiResult, pageResult);
console.log(validation.details);
```

### Contact
For issues with the unified costing system, check the validation functions first, then review the knowledge base rules for the specific cost component causing issues.