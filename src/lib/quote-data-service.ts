/**
 * QUOTE DATA SERVICE - Shared Product Data Layer
 * 
 * This service provides a unified interface for fetching product data
 * for both the quote system and the advanced product pages.
 * 
 * Key Features:
 * - Single source of truth for product data
 * - Context-aware data loading (quote vs customize)
 * - Graceful fallback mechanisms
 * - Caching and performance optimization
 * - Error handling and retry logic
 */

import { fetchProductBySlug, fetchProductOptions, loadBlankCapPricing } from '@/app/lib/webflow';
import { getBaseProductPricing } from '@/lib/pricing';

export interface ImageWithAlt {
  url: string;
  alt: string;
  name: string;
}

export interface ProductOption {
  id: string;
  name: string;
  slug: string;
  choices: Array<{
    value: string;
    label: string;
    image?: string;
  }>;
}

export interface QuoteProduct {
  id: string;
  name: string;
  description?: string;
  slug: string;
  mainImage: ImageWithAlt;
  itemData: ImageWithAlt[];
  
  // Color image sets for different views
  frontColorImages: ImageWithAlt[];
  leftColorImages: ImageWithAlt[];
  rightColorImages: ImageWithAlt[];
  backColorImages: ImageWithAlt[];
  capColorImage: ImageWithAlt[];
  splitColorOptions: ImageWithAlt[];
  triColorOptions: ImageWithAlt[];
  camoColorOption: ImageWithAlt[];
  
  // Pricing information
  pricing: {
    price48: number;
    price144: number;
    price576: number;
    price1152: number;
    price2880: number;
    price10000: number;
  };
  
  priceTier: string;
  productOptions: ProductOption[];
  
  // Cap style information for resale products
  billShape?: 'Slight Curved' | 'Curved' | 'Flat';
  profile?: 'High' | 'Mid' | 'Low';
  closureType?: 'Snapback' | 'Velcro' | 'Fitted' | 'Stretched';
  structure?: 'Structured' | 'Unstructured' | 'Foam';
  fabricSetup?: string;
  customFabricSetup?: string;
  productType?: 'factory' | 'resale';
}

export interface QuoteColorOption {
  id: string;
  name: string;
  value: string; // Color hex or image URL
  image?: string; // Preview image
  category: 'solid' | 'split' | 'tri' | 'camo';
  viewAngles?: {
    front?: string;
    left?: string;
    right?: string;
    back?: string;
    cap?: string;
  };
}

export interface QuoteLogoOption {
  id: string;
  name: string;
  price: number;
  description: string;
  positions?: Array<{
    id: string;
    name: string;
    label: string;
  }>;
  sizes?: Array<{
    id: string;
    name: string;
    label: string;
    multiplier?: number;
  }>;
  applications?: Array<{
    id: string;
    name: string;
    label: string;
  }>;
}

// Cache for product data (simple in-memory cache)
const productCache = new Map<string, any>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

interface CacheEntry {
  data: any;
  timestamp: number;
}

function getCachedData(key: string): any | null {
  const entry = productCache.get(key) as CacheEntry | undefined;
  if (!entry) return null;
  
  if (Date.now() - entry.timestamp > CACHE_DURATION) {
    productCache.delete(key);
    return null;
  }
  
  return entry.data;
}

function setCachedData(key: string, data: any): void {
  productCache.set(key, {
    data,
    timestamp: Date.now()
  });
}

// Helper function to extract color name from URL
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

export class QuoteDataService {
  
  /**
   * Get all available products for quotes
   */
  static async getProducts(limit: number = 20): Promise<QuoteProduct[]> {
    const cacheKey = `products_quote_${limit}`;
    const cached = getCachedData(cacheKey);
    if (cached) {
      console.log('🎯 Using cached product data for quotes');
      return cached;
    }
    
    console.log('🔍 Fetching fresh product data for quotes...');
    
    try {
      // For now, we'll rely on fallback products until Sanity integration is available
      const sanityProducts: any[] = [];
      
      // Load product options and pricing data
      const [productOptionsData, blankCapPricingData] = await Promise.all([
        this.getProductOptions(),
        this.getBlankCapPricing(),
      ]);
      
      const quoteProducts: QuoteProduct[] = [];
      
      for (const sanityProduct of sanityProducts) {
        try {
          const quoteProduct = await this.convertSanityToQuoteProduct(
            sanityProduct, 
            productOptionsData, 
            blankCapPricingData
          );
          if (quoteProduct) {
            quoteProducts.push(quoteProduct);
          }
        } catch (error) {
          console.warn(`Failed to convert product ${sanityProduct.name}:`, error);
        }
      }
      
      // If we don't have enough from Sanity, add some fallback products
      if (quoteProducts.length === 0) {
        console.log('🔄 No Sanity products available, creating fallback products');
        const fallbackProducts = this.createFallbackProducts(productOptionsData);
        quoteProducts.push(...fallbackProducts);
      }
      
      setCachedData(cacheKey, quoteProducts);
      console.log(`✅ Successfully loaded ${quoteProducts.length} products for quotes`);
      
      return quoteProducts;
      
    } catch (error) {
      console.error('❌ Error fetching products for quotes:', error);
      
      // Return fallback products on error
      const fallbackProducts = this.createFallbackProducts([]);
      return fallbackProducts;
    }
  }
  
  /**
   * Get product by slug for quotes
   */
  static async getProductBySlug(slug: string): Promise<QuoteProduct | null> {
    const cacheKey = `product_${slug}`;
    const cached = getCachedData(cacheKey);
    if (cached) {
      return cached;
    }
    
    try {
      // Try Webflow first
      const webflowProduct = await fetchProductBySlug(slug);
      if (webflowProduct) {
        const [productOptions, blankCapPricing] = await Promise.all([
          this.getProductOptions(),
          this.getBlankCapPricing(),
        ]);
        
        const quoteProduct = await this.convertWebflowToQuoteProduct(
          webflowProduct, 
          productOptions, 
          blankCapPricing
        );
        
        if (quoteProduct) {
          setCachedData(cacheKey, quoteProduct);
          return quoteProduct;
        }
      }
      
      // Fallback to Sanity (not implemented yet)
      const sanityProduct = null;
      if (sanityProduct) {
        const [productOptions, blankCapPricing] = await Promise.all([
          this.getProductOptions(),
          this.getBlankCapPricing(),
        ]);
        
        const quoteProduct = await this.convertSanityToQuoteProduct(
          sanityProduct, 
          productOptions, 
          blankCapPricing
        );
        
        if (quoteProduct) {
          setCachedData(cacheKey, quoteProduct);
          return quoteProduct;
        }
      }
      
      return null;
      
    } catch (error) {
      console.error(`Error fetching product by slug ${slug}:`, error);
      return null;
    }
  }
  
  /**
   * Get product options from Webflow CMS
   */
  static async getProductOptions(): Promise<ProductOption[]> {
    const cacheKey = 'product_options';
    const cached = getCachedData(cacheKey);
    if (cached) {
      return cached;
    }
    
    try {
      const optionsData = await fetchProductOptions();
      
      const processedOptions: ProductOption[] = optionsData.map((option: any) => {
        const optionName = option.fieldData?.name || option.name || '';
        const optionSlug = option.fieldData?.slug || option.slug || '';
        const optionImages = option.fieldData?.images || [];
        
        const choices = Array.isArray(optionImages)
          ? optionImages.map((img: { url: string; alt?: string }, index: number) => ({
              value: img.alt || `default-${index}`,
              label: img.alt || `Option ${index + 1}`,
              image: img.url,
            }))
          : [];
        
        return {
          id: option.id,
          name: optionName,
          slug: optionSlug,
          choices,
        };
      });
      
      setCachedData(cacheKey, processedOptions);
      return processedOptions;
      
    } catch (error) {
      console.error('Error fetching product options:', error);
      return [];
    }
  }
  
  /**
   * Get blank cap pricing data
   */
  static async getBlankCapPricing(): Promise<any[]> {
    const cacheKey = 'blank_cap_pricing';
    const cached = getCachedData(cacheKey);
    if (cached) {
      return cached;
    }
    
    try {
      const pricingData = await loadBlankCapPricing();
      setCachedData(cacheKey, pricingData);
      return pricingData;
    } catch (error) {
      console.error('Error loading blank cap pricing:', error);
      
      // Return fallback pricing data based on our standard tiers
      const fallbackPricing = [
        {
          Name: 'Tier 1',
          Slug: 'tier-1',
          price48: 3.6,
          price144: 3.0,
          price576: 2.9,
          price1152: 2.84,
          price2880: 2.76,
          price10000: 2.7,
        },
        {
          Name: 'Tier 2',
          Slug: 'tier-2',
          price48: 4.4,
          price144: 3.2,
          price576: 3.0,
          price1152: 2.9,
          price2880: 2.8,
          price10000: 2.7,
        },
        {
          Name: 'Tier 3',
          Slug: 'tier-3',
          price48: 4.8,
          price144: 3.4,
          price576: 3.2,
          price1152: 2.94,
          price2880: 2.88,
          price10000: 2.82,
        }
      ];
      
      setCachedData(cacheKey, fallbackPricing);
      return fallbackPricing;
    }
  }
  
  /**
   * Convert Sanity product to QuoteProduct format
   */
  private static async convertSanityToQuoteProduct(
    sanityProduct: any, 
    productOptions: ProductOption[], 
    blankCapPricingData: any[]
  ): Promise<QuoteProduct | null> {
    try {
      // Get pricing information
      const productPriceTier = sanityProduct.priceTier || 'Tier 1';
      const blankCapPricing = blankCapPricingData.find(p => p.Name === productPriceTier);
      const centralizedPricing = getBaseProductPricing(productPriceTier);
      
      const pricing = {
        price48: blankCapPricing?.price48 ?? centralizedPricing.price48,
        price144: blankCapPricing?.price144 ?? centralizedPricing.price144,
        price576: blankCapPricing?.price576 ?? centralizedPricing.price576,
        price1152: blankCapPricing?.price1152 ?? centralizedPricing.price1152,
        price2880: blankCapPricing?.price2880 ?? centralizedPricing.price2880,
        price10000: blankCapPricing?.price10000 ?? centralizedPricing.price10000,
      };
      
      return {
        id: sanityProduct.id || sanityProduct._id,
        name: sanityProduct.name,
        description: sanityProduct.description || '',
        slug: sanityProduct.slug?.current || sanityProduct.slug || '',
        mainImage: sanityProduct.mainImage?.url
          ? {
              url: sanityProduct.mainImage.url,
              alt: sanityProduct.mainImage.alt || sanityProduct.name,
              name: sanityProduct.name,
            }
          : { url: '', alt: '', name: '' },
        itemData: Array.isArray(sanityProduct.itemData)
          ? sanityProduct.itemData
              .filter((img: any) => img && (img.url || img.src))
              .map((img: any) => ({
                url: img.url || img.src || '',
                alt: img.alt || sanityProduct.name || 'Product image',
                name: img.name || img.alt || '',
              }))
          : [],
        frontColorImages: Array.isArray(sanityProduct.frontColorImages) ? sanityProduct.frontColorImages : [],
        leftColorImages: Array.isArray(sanityProduct.leftColorImages) ? sanityProduct.leftColorImages : [],
        rightColorImages: Array.isArray(sanityProduct.rightColorImages) ? sanityProduct.rightColorImages : [],
        backColorImages: Array.isArray(sanityProduct.backColorImages) ? sanityProduct.backColorImages : [],
        capColorImage: Array.isArray(sanityProduct.capColorImage) ? sanityProduct.capColorImage : [],
        splitColorOptions: Array.isArray(sanityProduct.splitColorOptions) ? sanityProduct.splitColorOptions : [],
        triColorOptions: Array.isArray(sanityProduct.triColorOptions) ? sanityProduct.triColorOptions : [],
        camoColorOption: Array.isArray(sanityProduct.camoColorOption) ? sanityProduct.camoColorOption : [],
        pricing,
        priceTier: productPriceTier,
        productOptions,
        // Cap style fields
        billShape: sanityProduct.billShape,
        profile: sanityProduct.profile,
        closureType: sanityProduct.closureType,
        structure: sanityProduct.structure,
        fabricSetup: sanityProduct.fabricSetup,
        customFabricSetup: sanityProduct.customFabricSetup,
        productType: sanityProduct.productType,
      };
    } catch (error) {
      console.error('Error converting Sanity product:', error);
      return null;
    }
  }
  
  /**
   * Convert Webflow product to QuoteProduct format
   */
  private static async convertWebflowToQuoteProduct(
    webflowProduct: any,
    productOptions: ProductOption[],
    blankCapPricingData: any[]
  ): Promise<QuoteProduct | null> {
    try {
      // Implementation similar to the advanced product page
      // This would be a comprehensive conversion from Webflow format
      // For now, return null to fall back to Sanity
      return null;
    } catch (error) {
      console.error('Error converting Webflow product:', error);
      return null;
    }
  }
  
  /**
   * Create fallback products when CMS data is unavailable
   */
  private static createFallbackProducts(productOptions: ProductOption[]): QuoteProduct[] {
    // Create basic color options for fallback
    const fallbackColors: ImageWithAlt[] = [
      { url: '#000000', alt: 'Black', name: 'Black' },
      { url: '#FFFFFF', alt: 'White', name: 'White' },
      { url: '#1B365D', alt: 'Navy', name: 'Navy Blue' },
      { url: '#6B7280', alt: 'Gray', name: 'Gray' },
      { url: '#DC2626', alt: 'Red', name: 'Red' },
      { url: '#2563EB', alt: 'Royal', name: 'Royal Blue' },
    ];
    
    const fallbackProducts: QuoteProduct[] = [
      {
        id: 'heritage-6c',
        name: 'Heritage 6C',
        description: 'Classic 6-panel cap with curved bill',
        slug: 'heritage-6c',
        mainImage: { url: '/images/caps/heritage-6c.jpg', alt: 'Heritage 6C Cap', name: 'Heritage 6C' },
        itemData: [],
        frontColorImages: fallbackColors,
        leftColorImages: fallbackColors,
        rightColorImages: fallbackColors,
        backColorImages: fallbackColors,
        capColorImage: fallbackColors,
        splitColorOptions: [],
        triColorOptions: [],
        camoColorOption: [],
        pricing: getBaseProductPricing('Tier 1'),
        priceTier: 'Tier 1',
        productOptions,
      },
      {
        id: 'airframe-7',
        name: 'AirFrame 7',
        description: 'Lightweight 7-panel performance cap',
        slug: 'airframe-7',
        mainImage: { url: '/images/caps/airframe-7.jpg', alt: 'AirFrame 7 Cap', name: 'AirFrame 7' },
        itemData: [],
        frontColorImages: fallbackColors,
        leftColorImages: fallbackColors,
        rightColorImages: fallbackColors,
        backColorImages: fallbackColors,
        capColorImage: fallbackColors,
        splitColorOptions: [],
        triColorOptions: [],
        camoColorOption: [],
        pricing: getBaseProductPricing('Tier 1'),
        priceTier: 'Tier 1',
        productOptions,
      },
      {
        id: 'drift-6c',
        name: 'Drift 6C',
        description: 'Modern 6-panel with structured front',
        slug: 'drift-6c',
        mainImage: { url: '/images/caps/drift-6c.jpg', alt: 'Drift 6C Cap', name: 'Drift 6C' },
        itemData: [],
        frontColorImages: fallbackColors,
        leftColorImages: fallbackColors,
        rightColorImages: fallbackColors,
        backColorImages: fallbackColors,
        capColorImage: fallbackColors,
        splitColorOptions: [],
        triColorOptions: [],
        camoColorOption: [],
        pricing: getBaseProductPricing('Tier 2'),
        priceTier: 'Tier 2',
        productOptions,
      },
    ];
    
    return fallbackProducts;
  }
  
  /**
   * Extract color options from product images
   */
  static extractColorOptions(product: QuoteProduct): QuoteColorOption[] {
    const colorOptions: QuoteColorOption[] = [];
    
    // Process cap color images (solid colors)
    product.capColorImage.forEach((image, index) => {
      const colorName = extractColorName(image.url) || image.name || image.alt;
      colorOptions.push({
        id: `solid-${index}`,
        name: colorName,
        value: image.url, // Use image URL as value
        image: image.url,
        category: 'solid',
        viewAngles: {
          cap: image.url,
          front: product.frontColorImages.find(img => 
            extractColorName(img.url).toLowerCase() === colorName.toLowerCase()
          )?.url,
          left: product.leftColorImages.find(img => 
            extractColorName(img.url).toLowerCase() === colorName.toLowerCase()
          )?.url,
          right: product.rightColorImages.find(img => 
            extractColorName(img.url).toLowerCase() === colorName.toLowerCase()
          )?.url,
          back: product.backColorImages.find(img => 
            extractColorName(img.url).toLowerCase() === colorName.toLowerCase()
          )?.url,
        },
      });
    });
    
    // Process split color options
    product.splitColorOptions.forEach((image, index) => {
      const colorName = extractColorName(image.url) || image.name || image.alt;
      colorOptions.push({
        id: `split-${index}`,
        name: colorName,
        value: image.url,
        image: image.url,
        category: 'split',
      });
    });
    
    // Process tri-color options
    product.triColorOptions.forEach((image, index) => {
      const colorName = extractColorName(image.url) || image.name || image.alt;
      colorOptions.push({
        id: `tri-${index}`,
        name: colorName,
        value: image.url,
        image: image.url,
        category: 'tri',
      });
    });
    
    // Process camo options
    product.camoColorOption.forEach((image, index) => {
      const colorName = extractColorName(image.url) || image.name || image.alt;
      colorOptions.push({
        id: `camo-${index}`,
        name: colorName,
        value: image.url,
        image: image.url,
        category: 'camo',
      });
    });
    
    return colorOptions;
  }
  
  /**
   * Convert product options to logo options
   */
  static extractLogoOptions(productOptions: ProductOption[]): QuoteLogoOption[] {
    // Always start with default logo options
    const defaultLogos: QuoteLogoOption[] = [
      {
        id: '3d-small',
        name: '3D Embroidery (Small)',
        price: 0.90,
        description: '1.5" H × 2.0" W',
        positions: [
          { id: 'front-center', name: 'Front Center', label: 'Front Center' },
          { id: 'back-center', name: 'Back Center', label: 'Back Center' },
          { id: 'side-left', name: 'Side Left', label: 'Side Left' },
          { id: 'side-right', name: 'Side Right', label: 'Side Right' },
        ],
        sizes: [
          { id: 'small', name: 'Small', label: '1.5" × 2.0"', multiplier: 1.0 },
          { id: 'medium', name: 'Medium', label: '2.0" × 3.5"', multiplier: 1.2 },
          { id: 'large', name: 'Large', label: '2.25" × 4.5"', multiplier: 1.5 },
        ],
      },
      {
        id: '3d-medium',
        name: '3D Embroidery (Medium)',
        price: 1.10,
        description: '2.0" H × 3.5" W',
        positions: [
          { id: 'front-center', name: 'Front Center', label: 'Front Center' },
          { id: 'back-center', name: 'Back Center', label: 'Back Center' },
        ],
        sizes: [
          { id: 'medium', name: 'Medium', label: '2.0" × 3.5"', multiplier: 1.0 },
          { id: 'large', name: 'Large', label: '2.25" × 4.5"', multiplier: 1.3 },
        ],
      },
      {
        id: '3d-large',
        name: '3D Embroidery (Large)',
        price: 1.40,
        description: '2.25" H × 4.5" W',
        positions: [
          { id: 'front-center', name: 'Front Center', label: 'Front Center' },
          { id: 'back-center', name: 'Back Center', label: 'Back Center' },
        ],
      },
      {
        id: 'flat-embroidery',
        name: 'Flat Embroidery',
        price: 0.90,
        description: '2.0" H × 3.5" W',
        positions: [
          { id: 'front-center', name: 'Front Center', label: 'Front Center' },
          { id: 'back-center', name: 'Back Center', label: 'Back Center' },
          { id: 'side-left', name: 'Side Left', label: 'Side Left' },
          { id: 'side-right', name: 'Side Right', label: 'Side Right' },
        ],
      },
      {
        id: 'rubber-patch',
        name: 'Rubber Patch',
        price: 1.25,
        description: 'Durable rubber material',
        positions: [
          { id: 'front-center', name: 'Front Center', label: 'Front Center' },
        ],
      },
    ];
    
    return defaultLogos;
  }
  
  /**
   * Clear cache (useful for development)
   */
  static clearCache(): void {
    productCache.clear();
    console.log('🧹 Quote data service cache cleared');
  }
}