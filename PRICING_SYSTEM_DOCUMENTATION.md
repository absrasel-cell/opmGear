# Tier-Based Pricing System Documentation

## 📋 Overview

The Custom Cap platform now features a comprehensive tier-based pricing system that integrates with both Webflow and Sanity CMS systems. This system uses the `Blank Cap Pricings.csv` file to provide dynamic, tier-based pricing for all products.

## 🏗️ System Architecture

### Core Components

1. **CSV Data Sources**: 
   - `src/app/csv/Blank Cap Pricings.csv` (Base product pricing)
   - `src/app/csv/Customization Pricings.csv` (Customization options pricing)
2. **Pricing Loaders**: 
   - `src/lib/webflow.ts` - `loadBlankCapPricing()`
   - `src/app/api/calculate-cost/route.ts` - `loadCustomizationPricing()`
3. **API Endpoints**: 
   - `src/app/api/blank-cap-pricing/route.ts`
   - `src/app/api/customization-pricing/route.ts`
4. **Product Integration**: Updated product pages with volume discount display
5. **Cart Integration**: Enhanced cart with tier-based pricing
6. **Visual Components**: `DiscountedPriceDisplay` component for volume discount UI

### Data Flow

```
Base Product CSV → loadBlankCapPricing() → /api/blank-cap-pricing → Product Pages → Cart System
Customization CSV → loadCustomizationPricing() → /api/customization-pricing → DiscountedPriceDisplay → UI
```

## 📊 Pricing Tiers

### Current Tier Structure

| Tier | 48+ | 144+ | 576+ | 1152+ | 2880+ | 10000+ |
|------|-----|------|------|-------|-------|--------|
| **Tier 1** | $1.80 | $1.50 | $1.45 | $1.42 | $1.38 | $1.35 |
| **Tier 2** | $2.20 | $1.60 | $1.50 | $1.45 | $1.40 | $1.35 |
| **Tier 3** | $2.40 | $1.70 | $1.60 | $1.47 | $1.44 | $1.41 |

### Volume Discounts

Each tier provides volume-based discounts:
- **48+ pieces**: Base pricing for small orders
- **144+ pieces**: 17-23% discount
- **576+ pieces**: 19-28% discount
- **1152+ pieces**: 21-31% discount
- **2880+ pieces**: 23-33% discount
- **10000+ pieces**: 25-34% discount

## 🔧 Implementation Details

### 1. Base Product CSV Data Structure

The `Blank Cap Pricings.csv` file contains:
```csv
Name,Slug,Collection ID,Locale ID,Item ID,Archived,Draft,Created On,Updated On,Published On,price48,price144,price576,price1152,price2880,price10000
Tier 1,tier-1,689af13ab391444ed2a11577,689adff1e8bb4da83b60751d,689af2dce2335b5df0afb00e,false,false,Tue Aug 12 2025 07:53:00 GMT+0000 (Coordinated Universal Time),Tue Aug 12 2025 14:47:46 GMT+0000 (Coordinated Universal Time),Tue Aug 12 2025 14:47:46 GMT+0000 (Coordinated Universal Time),1.8,1.5,1.45,1.42,1.38,1.35
Tier 2,tier-2,689af13ab391444ed2a11577,689adff1e8bb4da83b60751d,689af319aa8c5cd6612c6881,false,false,Tue Aug 12 2025 07:54:01 GMT+0000 (Coordinated Universal Time),Tue Aug 12 2025 14:47:38 GMT+0000 (Coordinated Universal Time),Tue Aug 12 2025 14:47:38 GMT+0000 (Coordinated Universal Time),2.2,1.6,1.5,1.45,1.4,1.35
Tier 3,tier-3,689af13ab391444ed2a11577,689adff1e8bb4da83b60751d,689af342a63e9c677b481964,false,false,Tue Aug 12 2025 07:54:42 GMT+0000 (Coordinated Universal Time),Tue Aug 12 2025 14:47:30 GMT+0000 (Coordinated Universal Time),Tue Aug 12 2025 14:47:30 GMT+0000 (Coordinated Universal Time),2.4,1.7,1.60,1.47,1.44,1.41
```

### 2. Base Product Pricing Loader Function

```typescript
export async function loadBlankCapPricing(): Promise<any[]> {
  try {
    const fs = require('fs');
    const path = require('path');
    
    const csvPath = path.join(process.cwd(), 'src/app/csv/Blank Cap Pricings.csv');
    const csvContent = await fs.promises.readFile(csvPath, 'utf-8');
    
    const lines = csvContent.split('\n').filter(line => line.trim());
    const dataLines = lines.slice(1);
    
    return dataLines.map(line => {
      const values = parseCSVLine(line);
      
      return {
        Name: (values[0] || '').replace(/"/g, '').trim(),
        Slug: (values[1] || '').replace(/"/g, '').trim(),
        price48: parseFloat(values[10]) || 0,
        price144: parseFloat(values[11]) || 0,
        price576: parseFloat(values[12]) || 0,
        price1152: parseFloat(values[13]) || 0,
        price2880: parseFloat(values[14]) || 0,
        price10000: parseFloat(values[15]) || 0,
      };
    }).filter(item => item.Name && item.Name.length > 0);
  } catch (error) {
    console.error('Error loading blank cap pricing from CSV:', error);
    return [];
  }
}
```

### 3. Customization Pricing CSV Data Structure

The `Customization Pricings.csv` file contains:
```csv
Name,type,price48,price144,price576,price1152,price2880,price10000,price20000
3D Embroidery,logos,0.2,0.15,0.12,0.1,0.1,0.08,0.08
Small Rubber Patch,logos,1,0.7,0.65,0.6,0.55,0.5,0.5
Medium Rubber Patch,logos,1.25,0.9,0.85,0.8,0.75,0.7,0.7
Large Rubber Patch,logos,1.5,1.2,1,0.9,0.85,0.8,0.8
Large Print Woven Patch,logos,1.2,0.9,0.8,0.75,0.7,0.65,0.65
Medium Print Woven Patch,logos,1,0.7,0.6,0.55,0.5,0.45,0.45
Small Print Woven Patch,logos,0.8,0.55,0.4,0.35,0.3,0.25,0.25
Small Leather Patch,logos,1,0.6,0.5,0.45,0.4,0.35,0.35
Medium Leather Patch,logos,1.2,0.75,0.7,0.65,0.6,0.55,0.55
Large Leather Patch,logos,1.35,0.9,0.85,0.8,0.75,0.7,0.7
Small Size Embroidery,Logos,0.7,0.45,0.35,0.3,0.25,0.2,0.2
Medium Size Embroidery,Logos,0.9,0.65,0.55,0.52,0.5,0.45,0.45
Large Size Embroidery,Logos,1.2,0.8,0.7,0.65,0.6,0.55,0.55
Hang Tag,Accessories,0.5,0.35,0.3,0.25,0.25,0.2,0.2
Inside Label,Accessories,0.3,0.25,0.2,0.15,0.15,0.12,0.12
B-Tape Print,Accessories,0.3,0.25,0.2,0.15,0.12,0.1,0.1
Sticker,Accessories,0.3,0.25,0.2,0.18,0.15,0.12,0.12
Metal Eyelet,Accessories,0.25,0.2,0.15,0.12,0.1,0.08,0.08
Rope Cost,Accessories,0.2,0.15,0.12,0.1,0.08,0.06,0.06
Buckle,Premium Closure,0.5,0.35,0.3,0.25,0.2,0.15,0.15
Fitted,Premium Closure,0.5,0.4,0.3,0.25,0.2,0.15,0.15
Stretched,Premium Closure,0.5,0.4,0.3,0.25,0.2,0.15,0.15
Regular Delivery,Shipping,3,2.3,1.9,1.85,1.8,1.7,1.7
Priority Delivery,Shipping,3.2,2.5,2.1,2.05,2.1,2,2
Air Freight,Shipping,,,,,1.2,1,1
Sea Freight,Shipping,,,,,0.4,0.35,0.3
```

### 4. Base Product API Endpoint

**Endpoint**: `POST /api/blank-cap-pricing`

**Request Body**:
```json
{
  "priceTier": "Tier 1"
}
```

**Response**:
```json
{
  "price48": 1.8,
  "price144": 1.5,
  "price576": 1.45,
  "price1152": 1.42,
  "price2880": 1.38,
  "price10000": 1.35
}
```

### 5. Customization Pricing API Endpoint

**Endpoint**: `POST /api/customization-pricing`

**Request Body**:
```json
{
  "itemName": "3D Embroidery"
}
```

**Response**:
```json
{
  "price48": 0.2,
  "price144": 0.15,
  "price576": 0.12,
  "price1152": 0.1,
  "price2880": 0.1,
  "price10000": 0.08,
  "price20000": 0.08
}
```

### 6. Volume Discount Display Component

The `DiscountedPriceDisplay` component provides visual discount information:

```typescript
function DiscountedPriceDisplay({ 
  unitPrice, 
  totalUnits, 
  pricingData, 
  cost, 
  name,
  baseUnitPrice 
}: {
  unitPrice: number;
  totalUnits: number;
  pricingData: any;
  cost: number;
  name: string;
  baseUnitPrice?: number;
}) {
  // Special handling for logo setup costs with baseUnitPrice
  if (baseUnitPrice && baseUnitPrice > unitPrice) {
    const savings = baseUnitPrice - unitPrice;
    const savingsPercentage = ((savings / baseUnitPrice) * 100);
    const totalSavings = savings * totalUnits;
    
    return (
      <div className="text-right">
        {/* Regular price crossed out */}
        <div className="text-gray-400 dark:text-gray-500 line-through text-xs">
          ${baseUnitPrice.toFixed(2)} each
        </div>
        {/* Discounted price in bold */}
        <span className="text-green-600 dark:text-green-400 font-semibold">
          ${unitPrice.toFixed(2)} each
        </span>
        <div className="font-bold text-green-700 dark:text-green-300">
          ${cost.toFixed(2)}
        </div>
        {/* Savings notification */}
        <div className="mt-1 p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
          <div className="flex items-center space-x-1">
            <span className="text-green-600 dark:text-green-400 text-xs">💰</span>
            <span className="text-xs font-medium text-green-800 dark:text-green-200">
              Save ${totalSavings.toFixed(2)} ({savingsPercentage.toFixed(0)}% off)
            </span>
          </div>
          <div className="text-xs text-green-600 dark:text-green-400 mt-1">
            {tierName} volume discount applied
          </div>
        </div>
      </div>
    );
  }
  
  // Standard discount calculation for other items
  const pricingToUse = customizationPricing || pricingData;
  const discountInfo = calculateVolumeDiscount(unitPrice, totalUnits, pricingToUse);
  // ... rest of component
}
```

### 7. Product Integration

Products now include a `priceTier` field that determines their pricing:

```typescript
interface Product {
  name: string;
  description: string;
  // ... other fields
  pricing: Pricing;
  priceTier?: string; // New field for tier-based pricing
}
```

### 8. Cart Integration

Cart items store the price tier information:

```typescript
interface CartItem {
  id: string;
  productId: string;
  productName: string;
  priceTier?: string; // New field for tier-based pricing
  // ... other fields
}
```

## 🔄 Integration Points

### 1. Webflow CMS Integration

Products in Webflow CMS use the `priceTier` field:
- Field name: `priceTier`
- Values: `Tier 1`, `Tier 2`, `Tier 3`
- Default: `Tier 1` if not specified

### 2. Sanity CMS Integration

Products in Sanity CMS also use the `priceTier` field:
- Field name: `priceTier`
- Values: `Tier 1`, `Tier 2`, `Tier 3`
- Default: `Tier 1` if not specified

### 3. Product Page Integration

The product page automatically:
1. Reads the product's `priceTier` field
2. Loads corresponding pricing from CSV
3. Applies pricing to volume calculations
4. Updates UI with correct pricing and volume discounts

### 4. Cart System Integration

The cart system:
1. Stores price tier with each cart item
2. Fetches correct pricing based on tier
3. Calculates costs using tier-specific pricing
4. Updates totals in real-time

### 5. Volume Discount Display Integration

The volume discount system:
1. Fetches customization pricing from CSV
2. Calculates savings based on quantity tiers
3. Displays visual discount information
4. Shows total savings summary

## 🛠️ Usage Examples

### 1. Adding a New Product with Tier Pricing

```typescript
// In Webflow CMS
{
  "name": "Premium Cap",
  "priceTier": "Tier 3",
  // ... other fields
}

// In Sanity CMS
{
  "name": "Premium Cap",
  "priceTier": "Tier 3",
  // ... other fields
}
```

### 2. Volume Discount Display Example

```typescript
// Logo Setup Cost with Volume Discount
<DiscountedPriceDisplay
  unitPrice={0.82}        // Current unit price (576+ tier)
  totalUnits={576}        // Total quantity
  pricingData={productPricing}
  cost={472.32}           // Total cost
  name="Large Size Embroidery + 3D Embroidery"
  baseUnitPrice={1.90}    // 48-piece base price
/>

// Result: Shows crossed-out $1.90, bold $0.82, and savings notification
```

### 3. Customization Pricing API Usage

```typescript
// Fetch pricing for a specific customization item
const response = await fetch('/api/customization-pricing', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ itemName: '3D Embroidery' }),
});

const pricing = await response.json();
// Returns: { price48: 0.2, price144: 0.15, price576: 0.12, ... }
```
  // ... other fields
}
```

### 2. Fetching Pricing Programmatically

```typescript
const response = await fetch('/api/blank-cap-pricing', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ priceTier: 'Tier 2' })
});

const pricing = await response.json();
// Returns: { price48: 2.2, price144: 1.6, ... }
```

### 3. Cart Cost Calculation

```typescript
const calculateItemCost = async (item: CartItem) => {
  const baseProductPricing = await getBaseProductPricing(item.priceTier);
  
  const response = await fetch('/api/calculate-cost', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      selectedColors: item.selectedColors,
      baseProductPricing: baseProductPricing,
      // ... other data
    }),
  });
  
  return await response.json();
};
```

## 🔧 Configuration

### 1. Adding New Tiers

To add a new tier (e.g., Tier 4):

1. **Update CSV File**:
   ```csv
   Tier 4,tier-4,collection-id,locale-id,item-id,false,false,date,date,date,3.0,2.5,2.3,2.2,2.1,2.0
   ```

2. **Update CMS Products**: Set `priceTier` to `Tier 4` for relevant products

3. **System Automatically**: Recognizes new tier and applies pricing

### 2. Modifying Existing Tiers

To modify pricing for existing tiers:

1. **Update CSV File**: Modify the price values in the corresponding row
2. **System Automatically**: Applies new pricing without code changes

### 3. Fallback Configuration

If tier data is unavailable, the system falls back to default pricing:

```typescript
const defaultPricing = {
  price48: 2.4,
  price144: 1.7,
  price576: 1.6,
  price1152: 1.47,
  price2880: 1.44,
  price10000: 1.41,
};
```

## 🧪 Testing

### 1. Manual Testing

- [x] Product page displays correct tier-based pricing
- [x] Cart calculations use correct tier pricing
- [x] API endpoint returns correct pricing data
- [x] Fallback pricing works when tier is missing
- [x] CSV file updates reflect immediately
- [x] Volume discount display shows for all product options
- [x] Logo setup costs display correct discount calculations
- [x] Savings notifications show accurate amounts and percentages
- [x] Total savings summary displays correctly

### 2. API Testing

```bash
# Test base product pricing endpoint
curl -X POST http://localhost:3000/api/blank-cap-pricing \
  -H "Content-Type: application/json" \
  -d '{"priceTier": "Tier 2"}'

# Test customization pricing endpoint
curl -X POST http://localhost:3000/api/customization-pricing \
  -H "Content-Type: application/json" \
  -d '{"itemName": "3D Embroidery"}'
```

### 3. Integration Testing

- [x] Webflow products with different tiers
- [x] Sanity products with different tiers
- [x] Cart items with tier-based pricing
- [x] Order calculations with tier pricing

## 🚀 Benefits

### 1. **Easy Management**
- Update pricing by modifying CSV file
- No code changes required for price updates
- Centralized pricing management

### 2. **Flexibility**
- Support for unlimited tiers
- Easy to add new tiers
- Volume-based pricing structure

### 3. **Visual Discount System**
- Clear display of volume discounts
- Motivates larger order quantities
- Professional savings notifications
- Comprehensive coverage of all product options

### 4. **Consistency**
- Same pricing across all products in a tier
- Consistent calculations in cart and orders
- Unified pricing across CMS systems
- Uniform discount display across all categories

### 5. **Performance**
- Efficient CSV loading
- Cached pricing data
- Fast API responses
- Optimized discount calculations

### 6. **Reliability**
- Fallback pricing when data is unavailable
- Error handling for missing tiers
- Robust CSV parsing
- Accurate discount calculations for complex combinations

## 🔮 Future Enhancements

### 1. **Dynamic Tier Management**
- Admin interface for managing tiers
- Real-time tier updates
- Tier-specific product assignments

### 2. **Advanced Pricing Rules**
- Date-based pricing
- Customer-specific pricing
- Bulk order discounts

### 3. **Volume Discount Enhancements**
- Custom discount tiers
- Progressive discount structures
- Real-time discount calculations
- Discount history tracking

### 4. **Analytics Integration**
- Tier performance tracking
- Pricing optimization insights
- Revenue analysis by tier
- Discount effectiveness analysis

### 5. **API Enhancements**
- Bulk pricing lookups
- Pricing history tracking
- Tier comparison endpoints
- Discount calculation endpoints

---

**Last Updated:** January 2025  
**Version:** 2.0.0  
**Status:** Production Ready with Volume Discount Display System
