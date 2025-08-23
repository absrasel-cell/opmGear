import { NextRequest, NextResponse } from 'next/server';
import { sanityClient } from '../../../../lib/sanity';

// POST /api/sanity/migrate-products - Migrate existing products with user information
export async function POST(request: NextRequest) {
  try {
    const { productId, userId, userName, userEmail } = await request.json();
    
    if (!productId || !userId || !userName || !userEmail) {
      return NextResponse.json(
        {
          success: false,
          error: 'Product ID, User ID, User Name, and User Email are required',
        },
        { status: 400 }
      );
    }

    // Update the product with user information
    const updatedProduct = await sanityClient
      .patch(productId)
      .set({
        createdBy: {
          _id: userId,
          name: userName,
          email: userEmail
        },
        updatedAt: new Date().toISOString()
      })
      .commit();

    return NextResponse.json({
      success: true,
      product: updatedProduct,
      message: 'Product migrated successfully with user information',
    });

  } catch (error) {
    console.error('Error migrating product:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to migrate product',
      },
      { status: 500 }
    );
  }
}

// GET /api/sanity/migrate-products - Get all products without createdBy field
export async function GET(request: NextRequest) {
  try {
    const query = `*[(_type == "product" || _type == "resaleProduct") && !defined(createdBy)] {
      _id,
      _type,
      name,
      slug,
      createdAt,
      updatedAt
    } | order(createdAt desc)`;
    
    const productsWithoutUser = await sanityClient.fetch(query);

    return NextResponse.json({
      success: true,
      products: productsWithoutUser,
      count: productsWithoutUser.length,
    });

  } catch (error) {
    console.error('Error fetching products without user info:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch products',
      },
      { status: 500 }
    );
  }
}
