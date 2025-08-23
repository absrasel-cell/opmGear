import { NextRequest, NextResponse } from 'next/server';
import { sanityClient } from '../../../../../lib/sanity';

// GET /api/sanity/products/[id] - Fetch a single product
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const product = await sanityClient.fetch(
      `*[_type == "product" && _id == $id][0]`,
      { id }
    );

    if (!product) {
      return NextResponse.json(
        {
          success: false,
          error: 'Product not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      product,
    });

  } catch (error) {
    console.error('Error fetching product from Sanity:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch product',
      },
      { status: 500 }
    );
  }
}

// PUT /api/sanity/products/[id] - Update a product
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const productData = await request.json();
    
    // Get the current product to check if type is changing
    const currentProduct = await sanityClient.fetch(
      `*[_id == $id][0]`,
      { id }
    );

    if (!currentProduct) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }

    // Convert clean text styleInfo to HTML format
    const convertStyleInfoToHTML = (text: string): string => {
      if (!text) return '';
      return text
        .split('\n')
        .filter(line => line.trim())
        .map(line => `<p>${line.trim()}</p>`)
        .join('');
    };

    const newProductType = productData.productType || 'factory';
    const newSanityType = newProductType === 'factory' ? 'product' : 'resaleProduct';
    const currentSanityType = currentProduct._type;

    // Check if we need to change the Sanity document type
    if (newSanityType !== currentSanityType) {
      // We need to delete the old document and create a new one with the correct type
      console.log(`Converting product type from ${currentSanityType} to ${newSanityType}`);
      
      // Prepare the complete product data for the new document
      const completeProductData = {
        _type: newSanityType,
        name: productData.name,
        slug: { current: productData.slug },
        description: productData.description || '',
        priceTier: productData.priceTier || 'Tier 1',
        styleInfo: convertStyleInfoToHTML(productData.styleInfo || ''),
        mainImage: productData.mainImage || null,
        itemData: productData.itemData || [],
        frontColorImages: productData.frontColorImages || [],
        leftColorImages: productData.leftColorImages || [],
        rightColorImages: productData.rightColorImages || [],
        backColorImages: productData.backColorImages || [],
        capColorImage: productData.capColorImage || [],
        splitColorOptions: productData.splitColorOptions || [],
        triColorOptions: productData.triColorOptions || [],
        camoColorOption: productData.camoColorOption || [],
        customOptions: productData.customOptions || [],
        isActive: productData.isActive !== false,
        productType: newProductType,
        sellingPrice: productData.sellingPrice || 0,
        shippingSource: productData.shippingSource || 'Factory',
        productCategory: productData.productCategory || 'Caps',
        customProductCategory: productData.customProductCategory || '',
        qcHandler: productData.qcHandler || 'Factory',
        productReadiness: productData.productReadiness || ['Customizable'],
        sku: productData.sku || '',
        stockQuantity: productData.stockQuantity || 0,
        inventoryLocation: productData.inventoryLocation || '',
        reorderPoint: productData.reorderPoint || 0,
        createdAt: currentProduct.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Replace the document with new type while keeping the same ID
      const newProduct = await sanityClient.createOrReplace({
        _id: id, // Keep the same ID
        ...completeProductData
      });

      return NextResponse.json({
        success: true,
        product: newProduct,
        message: 'Product type changed and updated successfully',
      });
    } else {
      // Same type, just update the existing document
      const updateData = {
        name: productData.name,
        slug: { current: productData.slug },
        description: productData.description || '',
        priceTier: productData.priceTier || 'Tier 1',
        styleInfo: convertStyleInfoToHTML(productData.styleInfo || ''),
        mainImage: productData.mainImage || null,
        itemData: productData.itemData || [],
        frontColorImages: productData.frontColorImages || [],
        leftColorImages: productData.leftColorImages || [],
        rightColorImages: productData.rightColorImages || [],
        backColorImages: productData.backColorImages || [],
        capColorImage: productData.capColorImage || [],
        splitColorOptions: productData.splitColorOptions || [],
        triColorOptions: productData.triColorOptions || [],
        camoColorOption: productData.camoColorOption || [],
        customOptions: productData.customOptions || [],
        isActive: productData.isActive !== false,
        productType: newProductType,
        sellingPrice: productData.sellingPrice || 0,
        shippingSource: productData.shippingSource || 'Factory',
        productCategory: productData.productCategory || 'Caps',
        customProductCategory: productData.customProductCategory || '',
        qcHandler: productData.qcHandler || 'Factory',
        productReadiness: productData.productReadiness || ['Customizable'],
        sku: productData.sku || '',
        stockQuantity: productData.stockQuantity || 0,
        inventoryLocation: productData.inventoryLocation || '',
        reorderPoint: productData.reorderPoint || 0,
        updatedAt: new Date().toISOString(),
      };

      // Update the existing product
      const updatedProduct = await sanityClient
        .patch(id)
        .set(updateData)
        .commit();

      return NextResponse.json({
        success: true,
        product: updatedProduct,
        message: 'Product updated successfully',
      });
    }

  } catch (error) {
    console.error('Error updating product in Sanity:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update product',
      },
      { status: 500 }
    );
  }
}

// DELETE /api/sanity/products/[id] - Delete a product
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    // Delete the product from Sanity
    await sanityClient.delete(id);

    return NextResponse.json({
      success: true,
      message: 'Product deleted successfully',
    });

  } catch (error) {
    console.error('Error deleting product from Sanity:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete product',
      },
      { status: 500 }
    );
  }
}
