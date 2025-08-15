
// src/app/customize/[slug]/page.tsx
import { notFound } from "next/navigation";
import ProductClient from "../productClient";
import { fetchProductBySlug, fetchPricingData, fetchProductOptions, fetchAltTextForImage } from "../../lib/webflow";

// Define types
interface Pricing {
  price48: number;
  price144: number;
  price576: number;
  price1152: number;
  price2880: number;
  price10000: number;
}

interface ImageWithAlt {
  url: string;
  alt: string;
  name: string;
}

interface ProductOption {
  id: string;
  name: string;
  slug: string;
  choices: Array<{
    value: string;
    label: string;
    image?: string;
  }>;
}

interface Product {
  name: string;
  description: string;
  mainImage: ImageWithAlt;
  itemData: ImageWithAlt[];
  frontColorImages: ImageWithAlt[];
  leftColorImages: ImageWithAlt[];
  rightColorImages: ImageWithAlt[];
  backColorImages: ImageWithAlt[];
  capColorImage: ImageWithAlt[];
  splitColorOptions: ImageWithAlt[];
  triColorOptions: ImageWithAlt[];
  camoColorOption: ImageWithAlt[];
  pricing: Pricing;
  productOptions: ProductOption[];
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

async function fetchProduct(slug: string): Promise<Product> {
  // Fetch product data from Webflow CMS
  const webflowProduct = await fetchProductBySlug(slug);
  if (!webflowProduct) {
    console.error(`Product with slug "${slug}" not found in Webflow CMS. Check your environment variables and collection setup.`);
    notFound();
  }

  // Fetch pricing data and product options from Webflow CMS
  const [pricingData, productOptionsData] = await Promise.all([
    fetchPricingData(),
    fetchProductOptions(),
  ]);
  
  // Helper function to create image list from Webflow image arrays or semicolon-separated URLs
  const createImageList = async (field?: unknown): Promise<ImageWithAlt[]> => {
    if (!field) return [];
    
    // If field is an array of image objects (Webflow format)
    if (Array.isArray(field)) {
      return Promise.all(
        field.map(async (img: { url?: string; src?: string; alt?: string }) => ({
          url: img.url || img.src || '',
          alt: img.alt || await fetchAltTextForImage(img.url || img.src || ''),
          name: img.alt || extractColorName(img.url || img.src || ''), // Use alt text as name if available
        }))
      );
    }
    
    // If field is a string (semicolon-separated URLs)
    if (typeof field === 'string') {
      const urls = field.split(';').map((u) => u.trim()).filter(Boolean);
      return Promise.all(
        urls.map(async (url) => ({
          url,
          alt: await fetchAltTextForImage(url),
          name: extractColorName(url),
        }))
      );
    }
    
    return [];
  };

  // Helper function to get field value from either direct property or fieldData
  const getFieldValue = (fieldName: string): unknown => {
    return webflowProduct.fieldData?.[fieldName] || (webflowProduct as unknown as Record<string, unknown>)[fieldName];
  };

  // Process all image fields in parallel
  const [
    mainImageList,
    itemDataList,
    frontList,
    leftList,
    rightList,
    backList,
    capList,
    splitList,
    triList,
    camoList,
  ] = await Promise.all([
    getFieldValue('main-image') ? Promise.resolve([{
      url: (getFieldValue('main-image') as { url?: string })?.url || '',
      alt: (getFieldValue('main-image') as { alt?: string })?.alt || await fetchAltTextForImage((getFieldValue('main-image') as { url?: string })?.url || ''),
      name: extractColorName((getFieldValue('main-image') as { url?: string })?.url || ''),
    }]) : Promise.resolve([]),
    createImageList(getFieldValue('itemdata')),
    createImageList(getFieldValue('frontlogocolorimages')),
    createImageList(getFieldValue('leftlogocolorimages')),
    createImageList(getFieldValue('rightlogocolorimages')),
    createImageList(getFieldValue('backcolorimages')),
    createImageList(getFieldValue('capcolorimage')),
    createImageList(getFieldValue('splitcoloroptions')),
    createImageList(getFieldValue('tricoloroptions') || []),
    createImageList(getFieldValue('camocoloroption')),
  ]);

  // Find matching pricing data (assuming there's a default pricing or match by product name)
  const defaultPricing = pricingData.find(p => p.name === webflowProduct.name) || pricingData[0];
  
  const pricing: Pricing = {
    price48: defaultPricing?.['price-48'] ?? 2.4,
    price144: defaultPricing?.['price-144'] ?? 1.7,
    price576: defaultPricing?.['price-576'] ?? 1.6,
    price1152: defaultPricing?.['price-1152'] ?? 1.47,
    price2880: defaultPricing?.['price-2880'] ?? 1.44,
    price10000: defaultPricing?.['price-10000'] ?? 1.41,
  };



  // Process product options
  const processedOptions: ProductOption[] = productOptionsData.map((option) => {
    const optionName = option.fieldData?.name || option.name || '';
    const optionSlug = option.fieldData?.slug || option.slug || '';
    const optionImages = option.fieldData?.images || []; // Fixed: using 'images' instead of 'optionImages'
    
    // Create choices from option images using alt text
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

  return {
    name: (getFieldValue('name') as string) || webflowProduct.name || '',
    description: (getFieldValue('description') as string) || '',
    mainImage: mainImageList[0] || { url: '', alt: '', name: '' },
    itemData: itemDataList,
    frontColorImages: frontList,
    leftColorImages: leftList,
    rightColorImages: rightList,
    backColorImages: backList,
    capColorImage: capList,
    splitColorOptions: splitList,
    triColorOptions: triList,
    camoColorOption: camoList,
    pricing,
    productOptions: processedOptions,
  };
}

export default async function CustomizePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params; // Await params to resolve slug
  const product = await fetchProduct(slug);

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <main className="container mx-auto px-4 py-8">
        <ProductClient product={product} />
      </main>
    </div>
  );
}

