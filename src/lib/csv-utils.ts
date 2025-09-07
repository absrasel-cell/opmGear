// CSV utility functions for product import/export

export interface CSVExportOptions {
  productType?: 'factory' | 'resale';
  filename?: string;
}

export interface CSVImportResult {
  success: boolean;
  imported: number;
  errors: number;
  results: Array<{
    row: number;
    name: string;
    id: string;
    productType: string;
  }>;
  errorDetails: string[];
  message: string;
}

// Export products to CSV file
export async function exportProductsToCSV(options: CSVExportOptions = {}): Promise<void> {
  try {
    const { productType, filename } = options;
    
    // Build query parameters
    const params = new URLSearchParams();
    if (productType) {
      params.append('type', productType);
    }
    
    // Make API request
    const response = await fetch(`/api/admin/products/csv?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to export products');
    }
    
    // Get the CSV content
    const csvContent = await response.text();
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    // Use provided filename or generate default
    const defaultFilename = filename || `${productType ? `${productType}-` : ''}products-${new Date().toISOString().split('T')[0]}.csv`;
    
    link.href = url;
    link.download = defaultFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
  } catch (error) {
    console.error('Error exporting products:', error);
    throw error;
  }
}

// Import products from CSV file
export async function importProductsFromCSV(file: File, userInfo?: {
  userId?: string;
  userName?: string;
  userEmail?: string;
  userRole?: string;
  userCompany?: string;
}): Promise<CSVImportResult> {
  try {
    const formData = new FormData();
    formData.append('file', file);
    
    // Prepare headers with user information
    const headers: HeadersInit = {
      // Don't set Content-Type for FormData - browser will set it with boundary
    };
    
    if (userInfo) {
      if (userInfo.userId) headers['x-user-id'] = userInfo.userId;
      if (userInfo.userName) headers['x-user-name'] = userInfo.userName;
      if (userInfo.userEmail) headers['x-user-email'] = userInfo.userEmail;
      if (userInfo.userRole) headers['x-user-role'] = userInfo.userRole;
      if (userInfo.userCompany) headers['x-user-company'] = userInfo.userCompany;
    }
    
    // Make API request
    const response = await fetch('/api/admin/products/csv', {
      method: 'POST',
      headers,
      body: formData,
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || 'Failed to import products');
    }
    
    return result;
    
  } catch (error) {
    console.error('Error importing products:', error);
    throw error;
  }
}

// Validate CSV file before import
export function validateCSVFile(file: File): { valid: boolean; error?: string } {
  // Check file type
  if (!file.name.toLowerCase().endsWith('.csv')) {
    return { valid: false, error: 'File must be a CSV file (.csv extension)' };
  }
  
  // Check file size (limit to 10MB)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    return { valid: false, error: 'File size must be less than 10MB' };
  }
  
  // Check if file is empty
  if (file.size === 0) {
    return { valid: false, error: 'File cannot be empty' };
  }
  
  return { valid: true };
}

// Generate CSV template for download
export function downloadCSVTemplate(productType: 'factory' | 'resale') {
  let headers: string[];
  let sampleRow: string[];
  
  if (productType === 'factory') {
    headers = [
      'name', 'slug', 'description', 'priceTier', 'styleInfo', 'isActive', 'productType',
      'billShape', 'profile', 'closureType', 'structure', 'fabricSetup', 'customFabricSetup',
      'capColorNames', 'referenceProductId', 'mainImage_url', 'mainImage_alt'
    ];
    
    sampleRow = [
      'Sample Factory Cap', 'sample-factory-cap', 'A high-quality factory cap', 'Tier 1',
      'Premium structured cap with curved bill', 'true', 'factory',
      'Curved', 'Mid', 'Snapback', 'Structured', 'Cotton Twill', '',
      'Black,White,Navy,Red', '', 'https://example.com/image.jpg', 'Sample Factory Cap'
    ];
  } else {
    headers = [
      'name', 'slug', 'description', 'priceTier', 'styleInfo', 'isActive', 'productType',
      'billShape', 'profile', 'closureType', 'structure', 'fabricSetup', 'customFabricSetup',
      'capColorNames', 'referenceProductId', 'sellingPrice', 'shippingSource', 'productCategory',
      'customProductCategory', 'qcHandler', 'productReadiness', 'sku', 'stockQuantity',
      'inventoryLocation', 'reorderPoint', 'categoryTags', 'mainImage_url', 'mainImage_alt',
      'supplierPhoto_url', 'supplierPhoto_alt'
    ];
    
    sampleRow = [
      'Sample Resale Cap', 'sample-resale-cap', 'A premium resale cap', 'Tier 2',
      'High-quality resale product', 'true', 'resale',
      'Curved', 'High', 'Fitted', 'Structured', 'Premium Cotton', '',
      'Black,White,Navy', '', '25.99', 'Warehouse', 'Caps',
      '', 'Buyer', 'Stock/Inventory;Customizable', 'RSL-001', '100',
      'Warehouse A', '20', 'Premium;New Era Style', 'https://example.com/image.jpg', 'Sample Resale Cap',
      'https://example.com/supplier.jpg', 'Supplier Logo'
    ];
  }
  
  const csvContent = [headers.join(','), sampleRow.join(',')].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  
  link.href = url;
  link.download = `${productType}-products-template.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

// Parse file to preview before import
export async function previewCSVFile(file: File): Promise<{
  headers: string[];
  rows: string[][];
  totalRows: number;
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const csvText = event.target?.result as string;
        const lines = csvText.trim().split('\n');
        
        if (lines.length < 2) {
          reject(new Error('CSV file must have at least a header row and one data row'));
          return;
        }
        
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        const previewRows = lines.slice(1, Math.min(6, lines.length)).map(line => {
          return line.split(',').map(cell => cell.trim().replace(/"/g, ''));
        });
        
        resolve({
          headers,
          rows: previewRows,
          totalRows: lines.length - 1, // Exclude header row
        });
      } catch (error) {
        reject(new Error('Failed to parse CSV file'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsText(file);
  });
}