import { createClient } from '@sanity/client';
import imageUrlBuilder from '@sanity/image-url';

// Sanity.io configuration
const projectId = '62anct3y';
const dataset = 'production';
const apiVersion = '2024-01-01';

// Create the Sanity client
export const sanityClient = createClient({
  projectId,
  dataset,
  apiVersion,
  token: process.env.SANITY_API_TOKEN,
  useCdn: true,
});

// Helper for generating image URLs
const builder = imageUrlBuilder(sanityClient);

export function urlFor(source: any) {
  return builder.image(source);
}

// Types for Sanity data
export interface SanityProduct {
  _id: string;
  _type: 'product' | 'resaleProduct';
  name: string;
  slug: { current: string };
  description?: string;
  mainImage?: any;
  gallery?: any[];
  basePrice?: number;
  priceTier?: string; // Tier 1, Tier 2, Tier 3, etc.
  sellingPrice?: number; // For resale products
  productType?: 'factory' | 'resale';
  categories?: any[];
  colors?: any[];
  sizes?: any[];
  customizationOptions?: any[];
  volumePricing?: any[];
  isActive?: boolean;
  createdBy?: {
    userId: string;
    name: string;
    email: string;
    role?: string;
    company?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface SanityCategory {
  _id: string;
  _type: 'category';
  name: string;
  slug: { current: string };
  description?: string;
  image?: any;
}

export interface SanityOrder {
  _id: string;
  _type: 'order';
  orderNumber: string;
  customer: {
    name: string;
    email: string;
    phone?: string;
  };
  items: any[];
  subtotal: number;
  tax?: number;
  shipping?: number;
  total: number;
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  paymentStatus?: 'pending' | 'paid' | 'failed' | 'refunded';
  shippingAddress?: any;
  billingAddress?: any;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// Sanity client functions
export class SanityService {
  static async getProducts(): Promise<SanityProduct[]> {
    const query = `*[(_type == "product" || _type == "resaleProduct") && isActive == true] {
      _id,
      _type,
      name,
      slug,
      description,
      mainImage,
      gallery,
      basePrice,
      priceTier,
      sellingPrice,
      productType,
      categories,
      colors,
      sizes,
      customizationOptions,
      volumePricing,
      isActive,
      createdAt,
      updatedAt,
      // Color arrays for factory products
      frontColorImages,
      leftColorImages,
      rightColorImages,
      backColorImages,
      capColorImage,
      splitColorOptions,
      triColorOptions,
      camoColorOption,
      // Custom options
      customOptions,
      // Resale product fields
      itemData,
      sellingPrice,
      shippingSource,
      productCategory,
      customProductCategory,
      qcHandler,
      productReadiness,
      sku,
      stockQuantity,
      inventoryLocation,
      reorderPoint,
      styleInfo,
      "createdBy": createdBy->{
        userId,
        name,
        email,
        role,
        company
      }
    } | order(createdAt desc)`;
    // Use non-CDN client to ensure fresh reads right after updates
    const freshClient = sanityClient.withConfig({ useCdn: false });
    return await freshClient.fetch(query);
  }

  static async getProductBySlug(slug: string): Promise<SanityProduct | null> {
    const query = `*[(_type == "product" || _type == "resaleProduct") && slug.current == $slug && isActive == true][0]`;
    const freshClient = sanityClient.withConfig({ useCdn: false });
    return await freshClient.fetch(query, { slug });
  }

  static async getCategories(): Promise<SanityCategory[]> {
    const query = `*[_type == "category"] | order(name asc)`;
    return await sanityClient.fetch(query);
  }

  static async createOrder(orderData: Omit<SanityOrder, '_id' | '_type' | 'createdAt' | 'updatedAt'>): Promise<any> {
    const order = {
      _type: 'order',
      ...orderData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return await sanityClient.create(order);
  }

  static async updateOrderStatus(orderId: string, status: SanityOrder['status']): Promise<SanityOrder> {
    return await sanityClient
      .patch(orderId)
      .set({ status, updatedAt: new Date().toISOString() })
      .commit();
  }

  static async getOrders(limit = 50): Promise<SanityOrder[]> {
    const query = `*[_type == "order"] | order(createdAt desc) [0...$limit]`;
    return await sanityClient.fetch(query, { limit });
  }

  static async getOrderById(orderId: string): Promise<SanityOrder | null> {
    const query = `*[_type == "order" && _id == $orderId][0]`;
    return await sanityClient.fetch(query, { orderId });
  }

  static async searchProducts(searchTerm: string): Promise<SanityProduct[]> {
    const query = `*[(_type == "product" || _type == "resaleProduct") && isActive == true && (name match $searchTerm + "*" || description match $searchTerm + "*")] | order(createdAt desc)`;
    return await sanityClient.fetch(query, { searchTerm });
  }

  static async getProductsByCategory(categoryId: string): Promise<SanityProduct[]> {
    const query = `*[(_type == "product" || _type == "resaleProduct") && isActive == true && $categoryId in categories[]._ref] | order(createdAt desc)`;
    return await sanityClient.fetch(query, { categoryId });
  }
}

export default sanityClient;
