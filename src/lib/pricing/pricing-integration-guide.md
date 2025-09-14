# US Custom Cap - High-Performance Pricing Service Integration Guide

## Overview

The new high-performance pricing service replaces CSV-based pricing with Supabase + intelligent caching, delivering sub-10ms response times for AI and Order Builder integration.

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   AI System    │◄──►│  Pricing Service │◄──►│   Supabase DB   │
│   (Support)    │    │   (Main Layer)   │    │   (Data Store)  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │
                       ┌──────────────────┐
                       │  Intelligent     │
                       │  Cache Layer     │
                       │  (In-Memory)     │
                       └──────────────────┘
```

## Key Features

- **🚀 Sub-10ms Performance**: In-memory caching with intelligent invalidation
- **🧠 AI-Powered Tier Detection**: Replaces manual CSV lookups with intelligent matching
- **📊 Volume-Based Pricing**: Automatic tier selection based on quantity
- **🔄 Background Cache Management**: Auto-refresh and cleanup
- **📈 Real-Time Metrics**: Performance monitoring and optimization

## Migration Path

### Step 1: Import New Pricing Service

```typescript
// Replace old CSV imports
// OLD:
// import { getAIBlankCapPrice } from '@/lib/ai-pricing-service';

// NEW:
import { getAIBlankCapPrice } from '@/lib/pricing/ai-pricing-optimized';
```

### Step 2: Update API Calls

The new service maintains backward compatibility but offers enhanced performance:

```typescript
// Existing AI functions work unchanged
const price = await getAIBlankCapPrice('Tier 1', 144);
const logoPrice = await getAILogoPrice('3D Embroidery', 'Medium', 'Direct', 144);

// Enhanced AI functions (optional upgrade)
const estimate = await getAICompletePricingEstimate(
  "5-panel flat bill trucker mesh cap",
  144,
  {
    logoName: "Embroidery",
    fabricName: "Premium Mesh",
    deliveryMethod: "Regular"
  }
);
```

### Step 3: Leverage New API Endpoints

#### Quick Estimate API
```typescript
// Fast pricing estimates
const response = await fetch('/api/pricing/quick-estimate?tier=Tier 1&quantity=144&logo_name=3D Embroidery');
const { estimate } = await response.json();
```

#### AI-Powered Estimates
```typescript
// POST request for AI-powered pricing
const response = await fetch('/api/pricing/quick-estimate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    productDescription: "5-panel flat bill mesh trucker cap with premium fabric",
    quantity: 144,
    options: {
      logoName: "3D Embroidery",
      logoSize: "Medium",
      fabricName: "Premium Mesh"
    }
  })
});
```

#### Bulk Pricing
```typescript
// Batch pricing requests
const response = await fetch('/api/pricing/bulk-pricing', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    mode: "ai", // or "standard"
    requests: [
      {
        description: "5-panel curved bill baseball cap",
        quantity: 144
      },
      {
        description: "Trucker mesh back snapback",
        quantity: 288
      }
    ]
  })
});
```

## Order Builder Integration

### Current Integration Points

1. **Order AI Core** (`src/lib/order-ai-core.ts`)
2. **AI Support Route** (`src/app/api/ai-support/route.ts`)
3. **Product Customization** (`src/app/customize/[slug]/page.tsx`)

### Integration Example

```typescript
// In order-ai-core.ts or similar
import {
  getAICompletePricingEstimate,
  findProductTierFromDescription
} from '@/lib/pricing/ai-pricing-optimized';

// Enhanced order processing
export async function processOrderWithPricing(orderData: any) {
  try {
    // AI tier detection
    const detectedTier = await findProductTierFromDescription(orderData.description);

    // Comprehensive pricing
    const estimate = await getAICompletePricingEstimate(
      orderData.description,
      orderData.quantity,
      orderData.options
    );

    return {
      tier: detectedTier,
      pricing: estimate,
      confidence: estimate.confidence
    };
  } catch (error) {
    console.error('Pricing integration error:', error);
    // Fallback to previous method if needed
  }
}
```

## Performance Optimization

### Cache Pre-warming

```typescript
import { preWarmCache } from '@/lib/pricing/pricing-service';

// Pre-warm cache during app initialization
export async function initializeApp() {
  await preWarmCache();
  console.log('✅ Pricing cache pre-warmed');
}
```

### Cache Management

```typescript
import {
  clearPricingCache,
  invalidateCacheByCategory,
  getCacheStats
} from '@/lib/pricing/pricing-service';

// Monitor cache performance
const stats = getCacheStats();
console.log(`Cache hit rate: ${stats.hitRate.toFixed(1)}%`);

// Invalidate specific categories when data changes
invalidateCacheByCategory('product'); // When products are updated
invalidateCacheByCategory('logo');    // When logo pricing changes
```

## API Endpoints

### 1. Quick Estimate `/api/pricing/quick-estimate`

**GET Parameters:**
- `tier` (required): Product tier (Tier 1, Tier 2, Tier 3)
- `quantity` (required): Order quantity
- `logo_name`, `logo_size`, `logo_application`: Logo options
- `fabric_name`: Fabric selection
- `closure_name`: Closure type
- `delivery_method`: Delivery option

**POST Body:**
```json
{
  "productDescription": "5-panel flat bill trucker cap",
  "quantity": 144,
  "options": {
    "logoName": "3D Embroidery",
    "logoSize": "Medium",
    "fabricName": "Premium Mesh"
  }
}
```

### 2. Product Lookup `/api/pricing/product-lookup`

**GET Parameters:**
- `tier`: Product tier (optional if description provided)
- `quantity` (required): Order quantity
- `description`: Product description for AI tier detection

**POST Body (Batch):**
```json
{
  "products": [
    {
      "tier": "Tier 1",
      "quantity": 144,
      "description": "5-panel curved bill cap"
    }
  ]
}
```

### 3. Bulk Pricing `/api/pricing/bulk-pricing`

**POST Body:**
```json
{
  "mode": "ai",
  "requests": [
    {
      "description": "Trucker mesh back cap",
      "quantity": 144,
      "options": {
        "logoName": "Embroidery"
      }
    }
  ]
}
```

### 4. Cache Management `/api/pricing/cache`

**GET Actions:**
- `?action=stats`: Get cache statistics
- `?action=health`: Check cache health

**POST Actions:**
```json
{
  "action": "clear", // or "invalidate", "prewarm", "optimize"
  "category": "product" // for invalidate action
}
```

### 5. Performance Metrics `/api/pricing/metrics`

**GET Parameters:**
- `metric`: Specific metric (cache, ai, requests, system)
- `period`: Time period (1h, 24h, 7d)

## Error Handling

The service includes comprehensive error handling with fallbacks:

```typescript
try {
  const price = await getProductPrice('Tier 1', 144);
} catch (error) {
  // Service automatically falls back to CSV if Supabase fails
  console.error('Pricing service error:', error);
  // Handle gracefully in your application
}
```

## Performance Monitoring

### Real-Time Metrics

```typescript
// Check system performance
const response = await fetch('/api/pricing/metrics');
const { metrics } = await response.json();

console.log(`Average response time: ${metrics.performance.requests.averageResponseTime}ms`);
console.log(`Cache hit rate: ${metrics.performance.cache.hitRate}%`);
```

### Performance Alerts

The service automatically generates alerts for:
- Low cache hit rates (< 50%)
- High error rates (> 5%)
- Slow response times (> 200ms)
- Large cache sizes (> 10,000 entries)

## Database Schema

The service uses the following Supabase tables:
- `pricing_tiers`: Product tier pricing
- `products`: Product catalog with tier references
- `logo_methods`: Logo customization options
- `premium_fabrics`: Fabric pricing and options
- `premium_closures`: Closure types and pricing
- `accessories`: Accessory options
- `delivery_methods`: Shipping options
- `pricing_cache`: Intelligent cache storage
- `ai_pricing_context`: AI context and recommendations

## Best Practices

### 1. Cache Management
- Monitor cache hit rates regularly
- Pre-warm cache during off-peak hours
- Invalidate cache when pricing data changes

### 2. Error Handling
- Always implement fallbacks for critical pricing operations
- Log errors for monitoring and debugging
- Use graceful degradation patterns

### 3. Performance
- Use bulk pricing for multiple items
- Leverage AI mode for complex product descriptions
- Monitor response times and optimize as needed

### 4. Security
- Validate all input parameters
- Use proper authentication for cache management
- Monitor for unusual pricing patterns

## Migration Checklist

- [ ] Replace CSV imports with new pricing service
- [ ] Update API calls to use new endpoints
- [ ] Implement error handling and fallbacks
- [ ] Add performance monitoring
- [ ] Test AI tier detection accuracy
- [ ] Verify pricing calculations match CSV results
- [ ] Pre-warm cache for production deployment
- [ ] Set up alerts for performance monitoring
- [ ] Update documentation and training materials

## Support and Troubleshooting

### Common Issues

1. **Slow Response Times**
   - Check cache hit rate
   - Pre-warm cache with common queries
   - Monitor database connection

2. **Cache Misses**
   - Verify cache TTL settings
   - Check for memory pressure
   - Review query patterns

3. **AI Tier Detection Issues**
   - Verify product descriptions are detailed
   - Check product catalog completeness
   - Review business rule logic

### Performance Targets

- **Response Time**: < 50ms (cached), < 200ms (uncached)
- **Cache Hit Rate**: > 80%
- **Error Rate**: < 1%
- **Uptime**: > 99.9%

### Contact

For issues or questions about the pricing service integration:
- Check performance metrics at `/api/pricing/metrics`
- Review cache status at `/api/pricing/cache?action=health`
- Monitor system alerts and recommendations