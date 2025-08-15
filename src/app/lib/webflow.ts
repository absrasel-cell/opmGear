// app/lib/webflow.ts

interface WebflowProduct {
  id: string;
  name?: string;
  slug?: string;
  fieldData?: {
    name?: string;
    slug?: string;
    description?: string;
    // Try different possible field name variations
    'main-image'?: { url: string; alt?: string } | string;
    'item-data'?: string;
    'itemdata'?: string;
    'itemData'?: string;
    'front-color-images'?: string;
    'frontcolorimages'?: string;
    'frontColorImages'?: string;
    'left-color-images'?: string;
    'leftcolorimages'?: string;
    'leftColorImages'?: string;
    'right-color-images'?: string;
    'rightcolorimages'?: string;
    'rightColorImages'?: string;
    'back-color-images'?: string;
    'backcolorimages'?: string;
    'backColorImages'?: string;
    'cap-color-image'?: string;
    'capcolorimage'?: string;
    'capColorImage'?: string;
    'split-color-options'?: string;
    'splitcoloroptions'?: string;
    'splitColorOptions'?: string;
    'tri-color-options'?: string;
    'tricoloroptions'?: string;
    'triColorOptions'?: string;
    'camo-color-option'?: string;
    'camocoloroption'?: string;
    'camoColorOption'?: string;
    // Also add any other possible field variations
    [key: string]: unknown;
  };
  // Legacy direct properties (in case they exist)
  description?: string;
  'main-image'?: { url: string; alt?: string };
  'item-data'?: string;
  'front-color-images'?: string;
  'left-color-images'?: string;
  'right-color-images'?: string;
  'back-color-images'?: string;
  'cap-color-image'?: string;
  'split-color-options'?: string;
  'tri-color-options'?: string;
  'camo-color-option'?: string;
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
      throw new Error('Webflow credentials missing');
    }
  
    const url = `https://api.webflow.com/v2/sites/${siteId}/collections/${collectionId}/items`;
  
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
      console.error('Webflow API Error:', errorText);
      throw new Error(`Failed to fetch: ${response.statusText}`);
    }
  
    const data = await response.json();
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
    const pricingCollectionId = process.env.WEBFLOW_PRICING_COLLECTION_ID;
    if (!pricingCollectionId) {
      console.warn('WEBFLOW_PRICING_COLLECTION_ID environment variable is missing. Using default pricing.');
      return [];
    }

    const pricingData = await fetchWebflowCollection(pricingCollectionId);
    return pricingData;
  } catch (error) {
    console.error('Error fetching pricing data:', error);
    console.error('Using default pricing fallback.');
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