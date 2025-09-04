import { NextRequest, NextResponse } from 'next/server';
import { SanityService, sanityClient } from '../../../../lib/sanity';
import { nanoid } from 'nanoid';

// Utility function to add _key to array items
function addKeysToArray(array: any[]): any[] {
 if (!array || !Array.isArray(array)) return [];
 return array.map(item => {
  if (typeof item === 'object' && item !== null && !item._key) {
   return { ...item, _key: nanoid() };
  }
  return item;
 });
}

// GET /api/sanity/products - Fetch all products from Sanity
export async function GET(request: NextRequest) {
 try {
  const products = await SanityService.getProducts();

  return NextResponse.json({
   success: true,
   products,
   count: products.length,
  });

 } catch (error) {
  console.error('Error fetching products from Sanity:', error);
  return NextResponse.json(
   {
    success: false,
    error: error instanceof Error ? error.message : 'Failed to fetch products',
   },
   { status: 500 }
  );
 }
}

// POST /api/sanity/products - Create a new product
export async function POST(request: NextRequest) {
 try {
  const productData = await request.json();
  
  // Validate required fields
  if (!productData.name || !productData.slug) {
   return NextResponse.json(
    {
     success: false,
     error: 'Product name and slug are required',
    },
    { status: 400 }
   );
  }

  // Get user information from the request headers or session
  const userEmail = request.headers.get('x-user-email');
  const userName = request.headers.get('x-user-name');
  const userId = request.headers.get('x-user-id');
  const userRole = request.headers.get('x-user-role');
  const userCompany = request.headers.get('x-user-company');

  // Convert clean text styleInfo to HTML format
  const convertStyleInfoToHTML = (text: string): string => {
   if (!text) return '';
   return text
    .split('\n')
    .filter(line => line.trim())
    .map(line => `<p>${line.trim()}</p>`)
    .join('');
  };

  // Prepare the product document for Sanity
  const productType = productData.productType || 'factory';
  
  // Base product fields
  const baseProduct = {
   name: productData.name,
   slug: { current: productData.slug },
   description: productData.description || '',
   priceTier: productData.priceTier || 'Tier 1',
   styleInfo: convertStyleInfoToHTML(productData.styleInfo || ''),
   mainImage: productData.mainImage || null,
   isActive: productData.isActive !== false,
   productType: productType,
   // Add custom options if they exist
   customOptions: addKeysToArray(productData.customOptions || []).map(option => {
    if (option.images && Array.isArray(option.images)) {
     return { ...option, images: addKeysToArray(option.images) };
    }
    return option;
   }),
   // Cap Style Setup fields
   billShape: productData.billShape || undefined,
   profile: productData.profile || undefined,
   closureType: productData.closureType || undefined,
   structure: productData.structure || undefined,
   fabricSetup: productData.fabricSetup || undefined,
   customFabricSetup: productData.customFabricSetup || '',
   // Add createdBy information if available
   createdBy: userId ? {
    userId: userId,
    name: userName || 'Unknown User',
    email: userEmail || 'unknown@example.com',
    role: userRole || undefined,
    company: userCompany || undefined
   } : undefined,
   createdAt: new Date().toISOString(),
   updatedAt: new Date().toISOString(),
  };
  
  // Type-specific fields
  let typeSpecificFields = {};
  
  if (productType === 'factory') {
   typeSpecificFields = {
    itemData: addKeysToArray(productData.itemData || []),
    frontColorImages: addKeysToArray(productData.frontColorImages || []),
    leftColorImages: addKeysToArray(productData.leftColorImages || []),
    rightColorImages: addKeysToArray(productData.rightColorImages || []),
    backColorImages: addKeysToArray(productData.backColorImages || []),
    capColorImage: addKeysToArray(productData.capColorImage || []),
    // Alternative color input methods
    capColorNames: productData.capColorNames || '',
    referenceProductId: productData.referenceProductId || '',
    splitColorOptions: addKeysToArray(productData.splitColorOptions || []),
    triColorOptions: addKeysToArray(productData.triColorOptions || []),
    camoColorOption: addKeysToArray(productData.camoColorOption || []),
   };
  } else if (productType === 'resale') {
   typeSpecificFields = {
    itemData: addKeysToArray(productData.itemData || []),
    capColorImage: addKeysToArray(productData.capColorImage || []),
    // Alternative color input methods
    capColorNames: productData.capColorNames || '',
    referenceProductId: productData.referenceProductId || '',
    sellingPrice: productData.sellingPrice || 0,
    shippingSource: productData.shippingSource || 'Factory',
    productCategory: productData.productCategory || 'Caps',
    customProductCategory: productData.customProductCategory || '',
    qcHandler: productData.qcHandler || 'Factory',
    productReadiness: productData.productReadiness || ['Customizable'],
   };
   
   // Add inventory fields only if Stock/Inventory is selected
   if (productData.productReadiness?.includes('Stock/Inventory')) {
    typeSpecificFields = {
     ...typeSpecificFields,
     sku: productData.sku || '',
     stockQuantity: productData.stockQuantity || 0,
     inventoryLocation: productData.inventoryLocation || '',
     reorderPoint: productData.reorderPoint || 0,
    };
   }
  }
  
  const sanityProduct = {
   _type: productType === 'factory' ? 'product' : 'resaleProduct',
   ...baseProduct,
   ...typeSpecificFields,
  };

  // Create the product in Sanity
  const createdProduct = await sanityClient.create(sanityProduct);

  return NextResponse.json({
   success: true,
   product: createdProduct,
   message: 'Product created successfully',
  });

 } catch (error) {
  console.error('Error creating product in Sanity:', error);
  return NextResponse.json(
   {
    success: false,
    error: error instanceof Error ? error.message : 'Failed to create product',
   },
   { status: 500 }
  );
 }
}
