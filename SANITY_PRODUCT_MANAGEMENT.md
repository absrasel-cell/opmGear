# Sanity Product Management

## Overview

The Custom Cap application now includes a comprehensive product management system integrated with Sanity CMS. Admins can create, edit, and manage blank cap products directly from the Admin Dashboard, which are then displayed alongside Webflow products in the store.

## Features

### 1. Admin Dashboard Integration
- New "Products" tab in the Admin Dashboard
- Full CRUD operations for products
- Visual product management interface
- Real-time status updates

### 2. Product Schema

Products in Sanity follow this structure:

```typescript
{
  name: string;              // Product name
  slug: string;              // URL-friendly identifier
  description: string;       // HTML description
  priceTier: string;         // Tier 1, Tier 2, or Tier 3
  styleInfo: string;         // HTML style information
  mainImage: {
    url: string;
    alt: string;             // Used as color name
  };
  itemData: ImageWithAlt[];  // Product gallery images
  frontColorImages: ImageWithAlt[];
  leftColorImages: ImageWithAlt[];
  rightColorImages: ImageWithAlt[];
  backColorImages: ImageWithAlt[];
  capColorImage: ImageWithAlt[];
  splitColorOptions?: ImageWithAlt[];
  triColorOptions?: ImageWithAlt[];
  camoColorOption?: ImageWithAlt[];
  isActive: boolean;         // Product visibility
}
```

### 3. Color Management
- Colors are extracted from image alt text
- Each image gallery supports multiple color options
- Alt text serves as the color name/title

### 4. Image Galleries
The system supports multiple image galleries for comprehensive product views:
- **Main Image**: Primary product display image
- **Item Data**: Additional product images
- **Color Images**: Front, left, right, back views for each color
- **Special Options**: Split, tri-color, and camo options

## API Endpoints

### Product Operations

#### GET /api/sanity/products
Fetches all products from Sanity CMS.

#### POST /api/sanity/products
Creates a new product.
```json
{
  "name": "Custom 5-Panel Cap",
  "slug": "custom-5-panel-cap",
  "description": "<p>Premium custom cap...</p>",
  "priceTier": "Tier 2",
  "styleInfo": "<p>Shape: Flat</p>",
  "mainImage": {
    "url": "https://example.com/image.jpg",
    "alt": "Black"
  },
  "frontColorImages": [
    {
      "url": "https://example.com/front-black.jpg",
      "alt": "Black"
    }
  ],
  "isActive": true
}
```

#### GET /api/sanity/products/[id]
Fetches a single product by ID.

#### PUT /api/sanity/products/[id]
Updates an existing product.

#### DELETE /api/sanity/products/[id]
Deletes a product.

## Store Integration

The store page (`/store`) now fetches products from both sources:
1. **Webflow Products**: Existing product catalog
2. **Sanity Products**: Admin-created blank cap products

Both product types are displayed seamlessly in the same grid layout.

## Usage Guide

### Creating a Product

1. Navigate to Admin Dashboard → Products tab
2. Click "Create New Product"
3. Fill in the product details:
   - **Name**: Product display name
   - **Slug**: Auto-generated URL identifier
   - **Price Tier**: Select from Tier 1-3
   - **Style Info**: HTML formatted style details
   - **Description**: HTML formatted product description
4. Add images for each gallery:
   - Enter image URL
   - Add alt text (serves as color name)
   - Click "Add" to include in gallery
5. Set product status (Active/Inactive)
6. Click "Create Product"

### Managing Products

- **Edit**: Click "Edit" on any product to modify details
- **Delete**: Click "Delete" to remove a product (confirmation required)
- **Toggle Status**: Change between Active/Inactive in edit mode

### Image Management

For each image gallery:
1. Enter the image URL
2. Add alt text (this becomes the color name)
3. Click "Add" to include the image
4. Remove images by clicking the × button on existing images

## Best Practices

1. **Image Alt Text**: Always provide descriptive alt text as it serves as the color name
2. **Consistent Naming**: Use consistent color names across image galleries
3. **Image Quality**: Use high-resolution images for better display
4. **HTML Content**: Use proper HTML tags for style info and descriptions
5. **Slug Format**: Keep slugs URL-friendly (lowercase, hyphens instead of spaces)

## Technical Details

### Database Structure
Products are stored in Sanity CMS with the `product` document type.

### Image Handling
- Images are referenced by URL
- Alt text is stored alongside URL for color identification
- Multiple images per color are supported

### Integration Points
- Admin Dashboard: Product management UI
- Store Page: Combined display of all products
- Product Customization: Uses the same data structure

## Troubleshooting

### Products Not Appearing in Store
1. Check if product is set to "Active"
2. Verify main image URL is valid
3. Ensure slug is unique

### Image Upload Issues
1. Verify image URLs are accessible
2. Check for CORS issues with external images
3. Ensure proper image format (jpg, png, webp)

### API Errors
1. Check Sanity connection in test endpoint
2. Verify API token is configured
3. Review console logs for specific errors

## Future Enhancements

1. **Bulk Operations**: Import/export multiple products
2. **Image Upload**: Direct image upload to Sanity
3. **Variants**: Support for product variants
4. **Inventory**: Stock tracking integration
5. **SEO**: Enhanced metadata management
