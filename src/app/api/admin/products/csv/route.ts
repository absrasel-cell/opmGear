import { NextRequest, NextResponse } from 'next/server';
import { SanityService, sanityClient } from '../../../../../lib/sanity';
import { nanoid } from 'nanoid';

// Utility function to flatten product data for CSV export
function flattenProductForCSV(product: any) {
  const baseFields = {
    id: product._id || product.id,
    name: product.name,
    slug: typeof product.slug === 'object' ? product.slug.current : product.slug,
    description: product.description,
    priceTier: product.priceTier,
    styleInfo: product.styleInfo,
    isActive: product.isActive,
    productType: product.productType,
    billShape: product.billShape,
    profile: product.profile,
    closureType: product.closureType,
    structure: product.structure,
    fabricSetup: product.fabricSetup,
    customFabricSetup: product.customFabricSetup,
    capColorNames: product.capColorNames,
    referenceProductId: product.referenceProductId,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
    // Flatten createdBy information
    createdBy_userId: product.createdBy?.userId,
    createdBy_name: product.createdBy?.name,
    createdBy_email: product.createdBy?.email,
    createdBy_role: product.createdBy?.role,
    createdBy_company: product.createdBy?.company,
  };

  // Add factory-specific fields
  if (product.productType === 'factory') {
    return {
      ...baseFields,
      // Image arrays as JSON strings (simplified for CSV)
      mainImage_url: product.mainImage?.url,
      mainImage_alt: product.mainImage?.alt,
      itemData_count: product.itemData?.length || 0,
      frontColorImages_count: product.frontColorImages?.length || 0,
      leftColorImages_count: product.leftColorImages?.length || 0,
      rightColorImages_count: product.rightColorImages?.length || 0,
      backColorImages_count: product.backColorImages?.length || 0,
      capColorImage_count: product.capColorImage?.length || 0,
      splitColorOptions_count: product.splitColorOptions?.length || 0,
      triColorOptions_count: product.triColorOptions?.length || 0,
      camoColorOption_count: product.camoColorOption?.length || 0,
      customOptions_count: product.customOptions?.length || 0,
    };
  }

  // Add resale-specific fields
  if (product.productType === 'resale') {
    return {
      ...baseFields,
      mainImage_url: product.mainImage?.url,
      mainImage_alt: product.mainImage?.alt,
      sellingPrice: product.sellingPrice,
      shippingSource: product.shippingSource,
      productCategory: product.productCategory,
      customProductCategory: product.customProductCategory,
      qcHandler: product.qcHandler,
      productReadiness: Array.isArray(product.productReadiness) ? product.productReadiness.join(';') : product.productReadiness,
      sku: product.sku,
      stockQuantity: product.stockQuantity,
      inventoryLocation: product.inventoryLocation,
      reorderPoint: product.reorderPoint,
      supplierPhoto_url: product.supplierPhoto?.url,
      supplierPhoto_alt: product.supplierPhoto?.alt,
      categoryTags: Array.isArray(product.categoryTags) ? product.categoryTags.join(';') : product.categoryTags,
      itemData_count: product.itemData?.length || 0,
      capColorImage_count: product.capColorImage?.length || 0,
    };
  }

  return baseFields;
}

// Utility function to convert CSV row back to product format
function parseCSVRowToProduct(row: any) {
  // Base product structure
  const baseProduct = {
    name: row.name,
    slug: row.slug,
    description: row.description,
    priceTier: row.priceTier || 'Tier 1',
    styleInfo: row.styleInfo || '',
    isActive: row.isActive === 'true' || row.isActive === true,
    productType: row.productType || 'factory',
    billShape: row.billShape,
    profile: row.profile,
    closureType: row.closureType,
    structure: row.structure,
    fabricSetup: row.fabricSetup,
    customFabricSetup: row.customFabricSetup,
    capColorNames: row.capColorNames,
    referenceProductId: row.referenceProductId,
    mainImage: row.mainImage_url ? {
      url: row.mainImage_url,
      alt: row.mainImage_alt || row.name
    } : null,
    createdBy: (row.createdBy_userId || row.createdBy_email) ? {
      userId: row.createdBy_userId,
      name: row.createdBy_name,
      email: row.createdBy_email,
      role: row.createdBy_role,
      company: row.createdBy_company
    } : undefined,
    createdAt: row.createdAt,
    updatedAt: new Date().toISOString(),
  };

  // Add type-specific fields
  if (row.productType === 'resale') {
    return {
      ...baseProduct,
      sellingPrice: parseFloat(row.sellingPrice) || 0,
      shippingSource: row.shippingSource || 'Factory',
      productCategory: row.productCategory || 'Caps',
      customProductCategory: row.customProductCategory,
      qcHandler: row.qcHandler || 'Factory',
      productReadiness: row.productReadiness ? row.productReadiness.split(';') : ['Customizable'],
      sku: row.sku,
      stockQuantity: parseInt(row.stockQuantity) || 0,
      inventoryLocation: row.inventoryLocation,
      reorderPoint: parseInt(row.reorderPoint) || 0,
      supplierPhoto: row.supplierPhoto_url ? {
        url: row.supplierPhoto_url,
        alt: row.supplierPhoto_alt || row.name
      } : null,
      categoryTags: row.categoryTags ? row.categoryTags.split(';') : [],
      // Initialize empty arrays for required fields
      itemData: [],
      capColorImage: [],
    };
  }

  // Factory product - initialize empty arrays for required fields
  return {
    ...baseProduct,
    itemData: [],
    frontColorImages: [],
    leftColorImages: [],
    rightColorImages: [],
    backColorImages: [],
    capColorImage: [],
    splitColorOptions: [],
    triColorOptions: [],
    camoColorOption: [],
    customOptions: [],
  };
}

// Utility function to convert JSON to CSV
function jsonToCSV(data: any[]): string {
  if (data.length === 0) return '';
  
  const headers = Object.keys(data[0]);
  const csvRows = [];
  
  // Add header row
  csvRows.push(headers.join(','));
  
  // Add data rows
  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header];
      // Handle values that contain commas or quotes
      if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value || '';
    });
    csvRows.push(values.join(','));
  }
  
  return csvRows.join('\n');
}

// Utility function to parse CSV to JSON
function csvToJSON(csvText: string): any[] {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];
  
  const headers = lines[0].split(',').map(h => h.trim());
  const result = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = [];
    let current = '';
    let inQuotes = false;
    
    // Parse CSV line handling quoted values
    for (let j = 0; j < lines[i].length; j++) {
      const char = lines[i][j];
      
      if (char === '"' && (j === 0 || lines[i][j-1] === ',')) {
        inQuotes = true;
      } else if (char === '"' && inQuotes && (j === lines[i].length - 1 || lines[i][j+1] === ',')) {
        inQuotes = false;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim()); // Add the last value
    
    // Create object from headers and values
    if (values.length === headers.length) {
      const obj: any = {};
      headers.forEach((header, index) => {
        obj[header] = values[index];
      });
      result.push(obj);
    }
  }
  
  return result;
}

// GET /api/admin/products/csv - Export products to CSV
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const productType = searchParams.get('type'); // 'factory', 'resale', or null for all
    
    // Fetch products from Sanity
    const products = await SanityService.getProducts();
    
    // Filter by product type if specified
    let filteredProducts = products;
    if (productType && (productType === 'factory' || productType === 'resale')) {
      filteredProducts = products.filter(p => p.productType === productType);
    }
    
    // Convert products to CSV format
    const csvData = filteredProducts.map(product => flattenProductForCSV(product));
    const csvString = jsonToCSV(csvData);
    
    // Generate filename based on type and date
    const timestamp = new Date().toISOString().split('T')[0];
    const typePrefix = productType ? `${productType}-` : '';
    const filename = `${typePrefix}products-${timestamp}.csv`;
    
    return new NextResponse(csvString, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
    
  } catch (error) {
    console.error('Error exporting products to CSV:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to export products',
      },
      { status: 500 }
    );
  }
}

// POST /api/admin/products/csv - Import products from CSV
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        {
          success: false,
          error: 'No file provided',
        },
        { status: 400 }
      );
    }
    
    // Read file content
    const csvText = await file.text();
    
    // Parse CSV to JSON
    const csvData = csvToJSON(csvText);
    
    if (csvData.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No valid data found in CSV file',
        },
        { status: 400 }
      );
    }
    
    // Get user information from headers
    const userEmail = request.headers.get('x-user-email');
    const userName = request.headers.get('x-user-name');
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role');
    const userCompany = request.headers.get('x-user-company');
    
    // Process each row and create products
    const results = [];
    const errors = [];
    
    for (let i = 0; i < csvData.length; i++) {
      try {
        const row = csvData[i];
        
        // Validate required fields
        if (!row.name || !row.slug) {
          errors.push(`Row ${i + 2}: Name and slug are required`);
          continue;
        }
        
        // Convert CSV row to product format
        const productData = parseCSVRowToProduct(row);
        
        // Add user information if available
        if (userId && !productData.createdBy) {
          productData.createdBy = {
            userId: userId,
            name: userName || 'Unknown User',
            email: userEmail || 'unknown@example.com',
            role: userRole || undefined,
            company: userCompany || undefined
          };
        }
        
        // Set created/updated timestamps
        if (!productData.createdAt) {
          productData.createdAt = new Date().toISOString();
        }
        productData.updatedAt = new Date().toISOString();
        
        // Prepare Sanity document
        const sanityProduct = {
          _type: productData.productType === 'factory' ? 'product' : 'resaleProduct',
          ...productData,
          slug: { current: productData.slug },
        };
        
        // Create product in Sanity
        const createdProduct = await sanityClient.create(sanityProduct);
        results.push({ 
          row: i + 2, 
          name: productData.name, 
          id: createdProduct._id,
          productType: productData.productType 
        });
        
      } catch (error) {
        console.error(`Error processing row ${i + 2}:`, error);
        errors.push(`Row ${i + 2}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    return NextResponse.json({
      success: true,
      imported: results.length,
      errors: errors.length,
      results,
      errorDetails: errors,
      message: `Successfully imported ${results.length} products${errors.length > 0 ? ` with ${errors.length} errors` : ''}`,
    });
    
  } catch (error) {
    console.error('Error importing products from CSV:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to import products',
      },
      { status: 500 }
    );
  }
}