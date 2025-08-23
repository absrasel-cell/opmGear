# ProductClient.tsx Code Mapping & Structure

## 📁 File: `src/app/customize/productClient.tsx` (~3500 lines)

### 🎯 **Purpose**
Complex product customization interface for custom baseball caps with real-time pricing, validation, and order management.

---

## 🗺️ **Code Structure Map**

### **1. IMPORTS & INTERFACES (Lines 1-50)**
- React hooks, Next.js utilities
- Component imports (forms, auth, cart, uploader)
- TypeScript interfaces for Product, Pricing, Options, etc.

### **2. HELPER FUNCTIONS (Lines 51-200)**
```typescript
// Key functions:
- extractColorName(url) // Parse color from image URLs
- fetchProduct(slug) // Fetch from Webflow/Sanity
- getFieldValue() // Extract field data
- createImageList() // Process image arrays
```

### **3. MAIN COMPONENT START (Lines 201-400)**
```typescript
export default function ProductClient({ product, prefillOrderId, reorder })
```

### **4. STATE MANAGEMENT (Lines 400-600)**
```typescript
// Critical state variables:
- selectedColors: Record<string, { sizes: Record<string, number> }>
- selectedOptions: Record<string, string>
- logoSetupSelections: Record<string, {...}>
- shipmentNumber: string
- shipmentValidation: {...}
- cartMessage/cartError: string
```

### **5. PRICING LOGIC (Lines 600-900)**
```typescript
// Complex pricing calculations:
- Volume-based pricing tiers
- Logo setup costs
- Accessories costs  
- Delivery pricing
- Total cost computation with discounts
```

### **6. VALIDATION FUNCTIONS (Lines 900-1200)**
```typescript
// Key validators:
- validateShipmentNumber() // Real-time shipment validation
- getShipmentSuggestions() // Autocomplete
- validateSelections() // Order validation
```

### **7. EVENT HANDLERS (Lines 1200-1600)**
```typescript
// User interaction handlers:
- handleColorSelection()
- handleSizeSelectionForColor()
- updateSizeQuantityForColor()
- handleLogoUpload()
- handleOrderSubmission()
```

---

## 🎨 **UI SECTIONS MAP**

### **SECTION A: Progress Tracker (Lines 1650-1800)**
- Step-by-step progress indicator
- Animated progress bar
- Current step highlighting

### **SECTION B: Product Gallery (Lines 1800-2000)**
- Image carousel with color switching
- Product views (front/back/left/right)
- Dynamic image loading

### **SECTION C: Cap Style Setup (Lines 2000-2200)**
- Bill shape, Profile, Closure type
- Structure selection
- Collapsible configuration

### **SECTION D: Color & Size Configuration (Lines 2200-2500)**
- Color picker with type filtering
- Size/quantity selectors (IMPROVED: now row-based)
- Real-time quantity updates

### **SECTION E: Logo Setup (Lines 2500-2800)**
- Position selection (front/back/left/right)
- Logo size options
- File uploader integration (IMPROVED: "Upload complete!" message)

### **SECTION F: Accessories & Options (Lines 2800-3000)**
- Multi-select accessories
- Delivery type selection
- Additional services

### **SECTION G: Shipment Integration (Lines 3200-3600)**
**RECENTLY IMPROVED UI BLOCK:**
- Modern gradient design with enhanced header
- Smart input with real-time validation
- Cleaner status indicators
- Simplified success/error messages
- Streamlined tip section

### **SECTION H: Order Summary & Actions (Lines 3600-3700)**
- Cost breakdown display
- Cart integration
- Order submission buttons

---

## 🔧 **Key Technical Patterns**

### **1. IIFE Pattern Usage**
```typescript
{(() => {
  // Complex conditional rendering logic
  const option = getOptionBySlug('option-name');
  if (!option) return null;
  return <ComplexComponent />;
})()}
```
**Usage**: Lines 812, 1949, 1974, 2024, 2074, 2314, 2517, 2767, 2869, 3070, 3392

### **2. Dynamic Color/Size Management**
```typescript
// selectedColors structure:
{
  "Red": { sizes: { "medium": 48, "large": 96 } },
  "Blue": { sizes: { "small": 24 } }
}
```

### **3. Real-time Validation Pattern**
```typescript
// Debounced validation with visual feedback
const [validation, setValidation] = useState({
  isValidating: false,
  isValid: null,
  error: null
});
```

---

## 🎯 **Critical Business Logic**

### **Pricing Tiers (Lines 110-120)**
```typescript
const pricingTiers = [
  { qty: 48, price: pricing.price48, color: 'blue' },
  { qty: 144, price: pricing.price144, color: 'green' },
  // ... up to 10000+ units
];
```

### **Logo Position Logic (Lines 950-980)**
```typescript
const logoPositionOrder = ['front', 'back', 'left', 'right'];
// Auto-assigns next available position
```

### **Volume Discount Calculation (Lines 130-300)**
- Complex tier-based pricing
- Bulk discount visualization
- Savings calculations

---

## 🚀 **Recent Improvements Made**

### **✅ Size Selector Redesign (Lines 2397-2460)**
- Changed from 3-column grid to row-based layout
- Improved spacing and readability
- Horizontal size name + quantity input

### **✅ Upload Button Enhancement**  
- TempLogoUploader component updated
- "Prepare files for upload" → "Upload complete!"

### **✅ Color Theme Update**
- Replaced purple color scheme with lime/green
- Consistent with dashboard theme
- Applied to Product Gallery, Show More button, customize icon

### **✅ Shipment Block UI Overhaul (Lines 3253-3570)**
- Modern gradient backgrounds
- Enhanced icon with glow effects
- Streamlined validation messages
- Improved input field design
- Simplified tip section

### **✅ Add to Cart Button**
- Changed text color from white to black for better visibility

---

## 🔄 **Next Development Areas** (Based on Current Tasks)

### **1. Supplier Dashboard** 
- Copy admin dashboard structure
- Remove admin-only features
- Add product upload capabilities

### **2. Store Page Enhancement**
- Filter system implementation
- Separate inventory vs custom products
- Supplier product visibility

### **3. Reseller Features**
- Additional sidebar options in member dashboard
- Resale pricing logic
- Billing & accounts integration

### **4. Order Management**
- Invoice generation at checkout
- Data consistency validation
- Order tracking improvements

---

## 💡 **Development Tips**

### **When Working with ProductClient.tsx:**

1. **Use Line Number Ranges**: Reference specific sections by line numbers
2. **Search by Pattern**: Use grep for specific functionality
3. **IIFE Locations**: Key conditional rendering at mapped line numbers
4. **State Dependencies**: Changes to selectedColors affect multiple sections
5. **Validation Chain**: shipmentValidation affects UI in Section G

### **Common Edit Patterns:**
- **UI Changes**: Usually in render sections (1650-3700)
- **Logic Changes**: Usually in handlers (1200-1600) or pricing (600-900)
- **New Features**: Often require new state + handler + UI section

This mapping should help navigate the large codebase more efficiently! 🎯