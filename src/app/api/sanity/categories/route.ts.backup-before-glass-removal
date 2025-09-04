import { NextRequest, NextResponse } from 'next/server';
import { SanityService } from '../../../../lib/sanity';

// GET /api/sanity/categories - Fetch all categories from Sanity
export async function GET(request: NextRequest) {
  try {
    const categories = await SanityService.getCategories();

    return NextResponse.json({
      success: true,
      categories,
      count: categories.length,
    });

  } catch (error) {
    console.error('Error fetching categories from Sanity:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch categories',
      },
      { status: 500 }
    );
  }
}

// POST /api/sanity/categories - Create a new category (Admin only)
export async function POST(request: NextRequest) {
  try {
    // TODO: Add authentication check for admin users
    
    const categoryData = await request.json();
    
    // Validate required fields
    if (!categoryData.name || !categoryData.slug) {
      return NextResponse.json(
        {
          success: false,
          error: 'Category name and slug are required',
        },
        { status: 400 }
      );
    }

    // Create category in Sanity
    // Note: This would require write permissions and proper authentication
    // For now, this is a placeholder that returns the data structure
    
    const newCategory = {
      _type: 'category',
      name: categoryData.name,
      slug: { current: categoryData.slug },
      description: categoryData.description || '',
      image: categoryData.image || null,
    };

    // TODO: Implement actual Sanity create operation when authentication is ready
    // const createdCategory = await sanityClient.create(newCategory);

    return NextResponse.json({
      success: true,
      message: 'Category creation endpoint ready (authentication required)',
      categoryData: newCategory,
    });

  } catch (error) {
    console.error('Error creating category in Sanity:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create category',
      },
      { status: 500 }
    );
  }
}