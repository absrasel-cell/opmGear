# Custom Cap Customization Platform

A Next.js application for customizing caps with real-time cost calculation and product configuration.

## Features

### Phase 1: Product Display & Color Selection ✅
- Main product image display
- Color type selection (Solid, Split, Tri, Camo)
- Dynamic color options with image previews
- Product view gallery with front, left, right, back perspectives

### Phase 2: Product Options & Configuration ✅
- Size selection with quantity management
- Logo setup with position, size, and application method configuration
- Accessories multi-selection
- Cap style setup (Bill Shape, Profile, Closure Type, Structure)
- Optional delivery type and services

### Phase 3: Cost Calculation & Pricing ✅
- Real-time cost calculation based on selections
- Volume-based pricing tiers (48+, 144+, 576+, 1152+, 2880+, 10000+)
- Logo customization costs with size and application method pricing
- Accessories and closure type cost calculation
- Backend API for complex pricing logic
- CSV and Webflow CMS data source support

## Environment Variables

Create a `.env.local` file with the following variables:

```env
# Webflow API Configuration
WEBFLOW_API_TOKEN=your_webflow_api_token
WEBFLOW_SITE_ID=your_webflow_site_id

# Collection IDs

WEBFLOW_SITE_ID=689adddf95f057f3386bd1c8
NEXT_PUBLIC_BASE_URL=http://localhost:3000
WEBFLOW_PRODUCTS_COLLECTION_ID=689ae21c87c9aa3cb52a434c
WEBFLOW_PRICING_COLLECTION_ID=689af13ab391444ed2a11577
WEBFLOW_PRODUCT_OPTIONS_COLLECTION_ID=689aeb2e2148dc453aa7e652

```

## Cost Calculation Logic

The system implements complex pricing logic based on the "Customization Pricings" collection:

### Logo Setup Pricing
- **Dynamic CMS Matching**: All logo pricing is fetched from CMS with no hardcoded mappings
- **Size + Type Matching**: First tries to match `${size} ${logoType}` (e.g., "Medium 3D Embroidery")
- **Fallback Matching**: If size-specific not found, matches by logo type only
- **Application Methods**: Adds cost for non-direct application methods from CMS
- **No Hardcoded Values**: All pricing comes directly from "Customization Pricings" collection

### Application Method Costs
- **Direct**: No additional cost
- **Run**: Adds "Run" application cost
- **Satin**: Adds "Satin" application cost

### Accessories & Closure Types
- **Accessories**: Matches option names with pricing items by type ("Accessories")
- **Closure Types**: Only adds cost if there's actual pricing data in CMS for the selected closure type
  - Only closure types with "Premium Closure" pricing items will have costs added
  - If no pricing data exists (like for "Snapback", "Velcro"), no cost is added
- Includes items like "Sticker", "Hang Tag", "Labels", "Buckle", etc.

## API Endpoints

### POST /api/calculate-cost
Calculates total cost based on product selections.

**Request Body:**
```json
{
  "selectedSizes": { "medium": 144, "large": 48 },
  "logoSetupSelections": {
    "3d-embroidery": {
      "position": "Front",
      "size": "Large",
      "application": "Direct"
    }
  },
  "multiSelectOptions": {
    "accessories": ["sticker", "hang-tag"]
  },
  "selectedOptions": {
    "closure-type": "snapback"
  },
  "baseProductPricing": {
    "price48": 5.00,
    "price144": 4.50,
    "price576": 4.00,
    "price1152": 3.75,
    "price2880": 3.50,
    "price10000": 3.25
  }
}
```

**Response:**
```json
{
  "baseProductCost": 864.00,
  "logoSetupCosts": [
    {
      "name": "3d-embroidery",
      "cost": 172.80,
      "details": "3D Embroidery (Large)"
    }
  ],
  "accessoriesCosts": [
    { "name": "sticker", "cost": 57.60 },
    { "name": "hang-tag", "cost": 96.00 }
  ],
  "closureCosts": [],
  "totalCost": 1190.40,
  "totalUnits": 192
}
```

## Data Sources

The cost calculation system supports multiple data sources:

1. **CSV File** (Primary): `src/app/csv/Customization Pricings.csv`
2. **Webflow CMS** (Fallback): Collection ID `689af530c2a73c3343f29447`

## Performance Considerations

- Cost calculations are performed server-side for accuracy
- Results are cached and updated only when selections change
- CSV data is loaded once per request for optimal performance
- Webflow API fallback ensures data availability

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables in `.env.local`

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## File Structure

```
src/
├── app/
│   ├── api/
│   │   └── calculate-cost/
│   │       └── route.ts          # Cost calculation API
│   ├── csv/
│   │   └── Customization Pricings.csv  # Pricing data
│   ├── customize/
│   │   └── productClient.tsx     # Main product interface
│   └── lib/
│       └── webflow.ts            # Webflow API utilities
```

## Contributing

1. Follow the existing code structure and patterns
2. Test cost calculations with various product configurations
3. Ensure all pricing logic matches the business requirements
4. Update documentation for any new features
