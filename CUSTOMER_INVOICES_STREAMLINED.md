# Streamlined Customer Invoices System

## Overview
The Customer Invoices system has been streamlined to focus on recording order costs rather than complex pricing calculations. This provides a cleaner, simpler approach to billing customers for their completed orders.

## Key Changes

### 1. Simplified Calculation (`src/lib/invoices/simple-calc.ts`)
- **Single Line Item**: Instead of breaking down caps, logos, accessories separately, creates one comprehensive order line item
- **Accurate Pricing**: Uses the complex calculation internally to ensure accurate totals, then simplifies presentation
- **Clean Description**: Shows complete order with quantity and optional breakdown summary (e.g., "Caps: $230.40, Logos: $288.00")
- **Best of Both Worlds**: Maintains pricing accuracy while providing clean customer-facing invoices

### 2. Updated API Route (`src/app/api/invoices/route.ts`)
- **Simple Flag**: Added `simple: true` parameter to use streamlined calculation by default
- **Backwards Compatible**: Still supports complex calculation if `simple: false` is passed
- **Default Behavior**: New invoices created with simplified approach unless specified otherwise

### 3. Frontend Updates
- **Customer Focus**: Updated labels and descriptions to emphasize "Customer Invoices" 
- **Order Cost Recording**: Messaging changed to reflect that invoices record order costs
- **Streamlined UI**: Simplified terminology throughout the interface

## Benefits

1. **Cleaner Invoices**: Single line item with comprehensive description instead of multiple small items
2. **Accurate Pricing**: Uses the full complex calculation internally to ensure correct totals
3. **Cost Transparency**: Optional breakdown in description shows major cost components
4. **Professional Presentation**: Clean, customer-friendly invoice format
5. **Maintains Accuracy**: No compromise on pricing precision while improving readability

## Usage

### Creating Customer Invoices

From Orders page:
```typescript
// Creates streamlined customer invoice
const response = await fetch('/api/invoices', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    orderId: order.id, 
    simple: true  // Uses streamlined calculation
  })
});
```

### Invoice Structure
```typescript
interface SimpleInvoiceItem {
  name: "Custom Cap Order" | productName
  description: "Complete order with X units including customization (Caps: $230.40, Logos: $288.00, Options: $50.00)"
  quantity: 1
  unitPrice: accurateCalculatedTotal
  total: accurateCalculatedTotal
}
```

## Migration
- Existing invoices remain unchanged
- New invoices use simplified approach by default
- Complex calculation still available via `simple: false` parameter
- No database schema changes required

## Future Enhancements
- Add order summary details to invoice description
- Include order reference number in invoice
- Add customer-specific notes or customizations
- Support for bulk invoice creation from multiple orders