// app/lib/webflow.ts

interface WebflowProduct {
  id: string;
  name?: string;
  slug?: string;
  fieldData?: {
    name?: string;
    slug?: string;
    description?: string;
    // Main image field
    'main-image'?: { url: string; alt?: string } | string;
    // Item data field for product views
    'item-data'?: string | Array<{ url: string; alt?: string; name?: string }>;
    'itemdata'?: string | Array<{ url: string; alt?: string; name?: string }>;
    'itemData'?: string | Array<{ url: string; alt?: string; name?: string }>;
    // Color-specific image fields (primary field names)
    'frontlogocolorimages'?: string | Array<{ url: string; alt?: string; name?: string }>;
    'leftlogocolorimages'?: string | Array<{ url: string; alt?: string; name?: string }>;
    'rightlogocolorimages'?: string | Array<{ url: string; alt?: string; name?: string }>;
    'backcolorimages'?: string | Array<{ url: string; alt?: string; name?: string }>;
    // Color option preview fields (primary field names)
    'capcolorimage'?: string | Array<{ url: string; alt?: string; name?: string }>;
    'splitcoloroptions'?: string | Array<{ url: string; alt?: string; name?: string }>;
    'tricoloroptions'?: string | Array<{ url: string; alt?: string; name?: string }>;
    'camocoloroption'?: string | Array<{ url: string; alt?: string; name?: string }>;
    // Legacy field variations for backward compatibility
    'front-color-images'?: string | Array<{ url: string; alt?: string; name?: string }>;
    'frontcolorimages'?: string | Array<{ url: string; alt?: string; name?: string }>;
    'frontColorImages'?: string | Array<{ url: string; alt?: string; name?: string }>;
    'left-color-images'?: string | Array<{ url: string; alt?: string; name?: string }>;
    'leftcolorimages'?: string | Array<{ url: string; alt?: string; name?: string }>;
    'leftColorImages'?: string | Array<{ url: string; alt?: string; name?: string }>;
    'right-color-images'?: string | Array<{ url: string; alt?: string; name?: string }>;
    'rightcolorimages'?: string | Array<{ url: string; alt?: string; name?: string }>;
    'rightColorImages'?: string | Array<{ url: string; alt?: string; name?: string }>;
    'back-color-images'?: string | Array<{ url: string; alt?: string; name?: string }>;
    'backColorImages'?: string | Array<{ url: string; alt?: string; name?: string }>;
    'cap-color-image'?: string | Array<{ url: string; alt?: string; name?: string }>;
    'capColorImage'?: string | Array<{ url: string; alt?: string; name?: string }>;
    'split-color-options'?: string | Array<{ url: string; alt?: string; name?: string }>;
    'splitColorOptions'?: string | Array<{ url: string; alt?: string; name?: string }>;
    'tri-color-options'?: string | Array<{ url: string; alt?: string; name?: string }>;
    'triColorOptions'?: string | Array<{ url: string; alt?: string; name?: string }>;
    'camo-color-option'?: string | Array<{ url: string; alt?: string; name?: string }>;
    'camoColorOption'?: string | Array<{ url: string; alt?: string; name?: string }>;
    // Generic field support
    [key: string]: unknown;
  };
  // Legacy direct properties (in case they exist)
  description?: string;
  'main-image'?: { url: string; alt?: string };
  'item-data'?: string;
  'frontlogocolorimages'?: string;
  'leftlogocolorimages'?: string;
  'rightlogocolorimages'?: string;
  'backcolorimages'?: string;
  'capcolorimage'?: string;
  'splitcoloroptions'?: string;
  'tricoloroptions'?: string;
  'camocoloroption'?: string;
}

interface WebflowPricing {
  id: string;
  name: string;
  'price-48'?: number;
  'price-144'?: number;
  'price-576'?: number;
  'price-1152'?: number;
  'price-2880'?: number;
  'price-10000'?: number;
}

interface WebflowProductOption {
  id: string;
  name?: string;
  slug?: string;
  fieldData?: {
    name?: string;
    slug?: string;
    images?: Array<{ url: string; alt?: string }>; // Fixed: 'images' instead of 'optionImages'
    [key: string]: unknown;
  };
}

export async function fetchWebflowCollection(collectionId: string) {
    const token = process.env.WEBFLOW_API_TOKEN;
    const siteId = process.env.WEBFLOW_SITE_ID;
  
    if (!token || !siteId) {
      console.error('❌ Webflow credentials missing:');
      console.error(`   - WEBFLOW_API_TOKEN: ${token ? 'Set' : 'Missing'}`);
      console.error(`   - WEBFLOW_SITE_ID: ${siteId ? 'Set' : 'Missing'}`);
      throw new Error('Webflow credentials missing - check your .env.local file');
    }
  
    const url = `https://api.webflow.com/v2/sites/${siteId}/collections/${collectionId}/items`;
    console.log(`🔍 Fetching from: ${url}`);
  
    const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'accept-version': '2.0.0', // Latest API version as of 2025
        },
        next: { 
          revalidate: 60, // Cache for 1 minute for development, revalidate frequently
          tags: ['webflow-cms'] // Add cache tag for revalidation
        },
      }
    );
  
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Webflow API Error:', errorText);
      console.error(`🔧 Request details:`);
      console.error(`   - URL: ${url}`);
      console.error(`   - Status: ${response.status} ${response.statusText}`);
      console.error(`   - Collection ID: ${collectionId}`);
      console.error(`   - Site ID: ${siteId}`);
      console.error(`   - Token length: ${token?.length || 0}`);
      throw new Error(`Failed to fetch collection ${collectionId}: ${response.statusText}`);
    }
  
    const data = await response.json();
    console.log(`✅ Successfully fetched collection ${collectionId} with ${data.items?.length || 0} items`);
    return data.items; // Returns array of CMS items
}

export async function fetchProductBySlug(slug: string): Promise<WebflowProduct | null> {
  try {
    const productsCollectionId = process.env.WEBFLOW_PRODUCTS_COLLECTION_ID;
    if (!productsCollectionId) {
      console.warn('WEBFLOW_PRODUCTS_COLLECTION_ID environment variable is missing. Please check your .env.local file.');
      return null;
    }

    const products = await fetchWebflowCollection(productsCollectionId);
    const product = products.find((p: WebflowProduct) => p.slug === slug || p.fieldData?.slug === slug);
    
    return product || null;
  } catch (error) {
    console.error('Error fetching product by slug:', error);
    console.error('Make sure your Webflow API credentials are correct and the collection exists.');
    return null;
  }
}

export async function fetchPricingData(): Promise<WebflowPricing[]> {
  try {
    console.log('📊 Loading pricing data from CSV file...');
    const csvPricingData = await loadBlankCapPricing();
    console.log(`✅ Successfully loaded ${csvPricingData.length} pricing items from CSV`);
    
    // Convert CSV data to WebflowPricing format for compatibility
    const pricingData: WebflowPricing[] = csvPricingData.map(item => ({
      id: item.Slug || item.Name,
      name: item.Name,
      'price-48': item.price48,
      'price-144': item.price144,
      'price-576': item.price576,
      'price-1152': item.price1152,
      'price-2880': item.price2880,
      'price-10000': item.price10000,
    }));
    
    return pricingData;
  } catch (error) {
    console.error('❌ Error loading pricing data from CSV:', error);
    console.error('💡 Using default pricing fallback.');
    return [];
  }
}

export async function fetchProductOptions(): Promise<WebflowProductOption[]> {
  try {
    const productOptionsCollectionId = process.env.WEBFLOW_PRODUCT_OPTIONS_COLLECTION_ID || '689aeb2e2148dc453aa7e652';
    
    const optionsData = await fetchWebflowCollection(productOptionsCollectionId);
    
    return optionsData;
  } catch (error) {
    console.error('Error fetching product options:', error);
    return [];
  }
}

export async function fetchCustomizationPricing(): Promise<any[]> {
  try {
    const customizationPricingCollectionId = process.env.WEBFLOW_CUSTOMIZATION_PRICING_COLLECTION_ID || '689af530c2a73c3343f29447';
    
    const pricingData = await fetchWebflowCollection(customizationPricingCollectionId);
    
    return pricingData;
  } catch (error) {
    console.error('Error fetching customization pricing:', error);
    return [];
  }
}

export async function fetchAltTextForImage(url: string): Promise<string> {
  try {
    // In production, you might want to query Webflow Assets API
    // const response = await fetch(`https://api.webflow.com/v2/assets?url=${encodeURIComponent(url)}`, {
    //   headers: { Authorization: `Bearer ${process.env.WEBFLOW_API_TOKEN}` },
    //   cache: 'force-cache',
    // });
    // const data = await response.json();
    // if (!response.ok) throw new Error('Failed to fetch alt text');
    // return data.altText || extractColorName(url);

    // For now, extract color name from filename as fallback
    return extractColorName(url) || "Product image";
  } catch (error) {
    console.error("Error fetching alt text for", url, ":", error);
    return extractColorName(url) || "Product image";
  }
}

// New function to load blank cap pricing data from CSV
export async function loadBlankCapPricing(): Promise<any[]> {
  try {
    const fs = require('fs');
    const path = require('path');
    
    // Load pricing data from CSV file
    const csvPath = path.join(process.cwd(), 'src/app/csv/Blank Cap Pricings.csv');
    const csvContent = await fs.promises.readFile(csvPath, 'utf-8');
    
    const lines = csvContent.split('\n').filter(line => line.trim()); // Remove empty lines
    
    // Skip header row
    const dataLines = lines.slice(1);
    
    return dataLines.map(line => {
      // Parse CSV line, handling quoted values
      const values = parseCSVLine(line);
      
      return {
        Name: (values[0] || '').replace(/"/g, '').trim(),
        Slug: (values[1] || '').replace(/"/g, '').trim(),
        price48: parseFloat(values[10]) || 0,
        price144: parseFloat(values[11]) || 0,
        price576: parseFloat(values[12]) || 0,
        price1152: parseFloat(values[13]) || 0,
        price2880: parseFloat(values[14]) || 0,
        price10000: parseFloat(values[15]) || 0,
      };
    }).filter(item => item.Name && item.Name.length > 0); // Filter out empty rows
  } catch (error) {
    console.error('Error loading blank cap pricing from CSV:', error);
    return [];
  }
}

// Helper function to parse CSV lines with quoted values
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  // Add the last field
  result.push(current);
  return result;
}

function extractColorName(url: string): string {
  const filename = url.split('/').pop() || '';
  const parts = filename.split('_');
  let colorPart = filename;
  if (parts.length > 1) {
    colorPart = parts.slice(1).join('_');
  }
  colorPart = colorPart.replace(/%20/g, ' ');
  return colorPart.replace(/ \([0-9]+\)\.\w+$/, '').trim();
}