
// src/app/customize/[slug]/page.tsx
import { notFound } from "next/navigation";
import ProductClient from "../productClient";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { fetchProductBySlug, fetchPricingData, fetchProductOptions, fetchAltTextForImage, loadBlankCapPricing } from "../../lib/webflow";
import { SanityService } from "../../../lib/sanity";

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
  priceTier?: string; // Add price tier field
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
  // Try Webflow first
  const webflowProduct = await fetchProductBySlug(slug);
  
  // If found in Webflow, proceed with existing Webflow flow
  if (webflowProduct) {
    // Fetch pricing data, product options, and blank cap pricing from Webflow CMS
    const [pricingData, productOptionsData, blankCapPricingData] = await Promise.all([
      fetchPricingData(),
      fetchProductOptions(),
      loadBlankCapPricing(),
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
    createImageList(getFieldValue('item-data') || getFieldValue('itemdata') || getFieldValue('itemData')),
    createImageList(getFieldValue('frontlogocolorimages') || getFieldValue('front-color-images') || getFieldValue('frontcolorimages') || getFieldValue('frontColorImages')),
    createImageList(getFieldValue('leftlogocolorimages') || getFieldValue('left-color-images') || getFieldValue('leftcolorimages') || getFieldValue('leftColorImages')),
    createImageList(getFieldValue('rightlogocolorimages') || getFieldValue('right-color-images') || getFieldValue('rightcolorimages') || getFieldValue('rightColorImages')),
    createImageList(getFieldValue('backcolorimages') || getFieldValue('back-color-images') || getFieldValue('backcolorimages') || getFieldValue('backColorImages')),
    createImageList(getFieldValue('capcolorimage') || getFieldValue('cap-color-image') || getFieldValue('capcolorimage') || getFieldValue('capColorImage')),
    createImageList(getFieldValue('splitcoloroptions') || getFieldValue('split-color-options') || getFieldValue('splitcoloroptions') || getFieldValue('splitColorOptions')),
    createImageList(getFieldValue('tricoloroptions') || getFieldValue('tri-color-options') || getFieldValue('tricoloroptions') || getFieldValue('triColorOptions') || []),
    createImageList(getFieldValue('camocoloroption') || getFieldValue('camo-color-option') || getFieldValue('camocoloroption') || getFieldValue('camoColorOption')),
  ]);

  // Get the product's price tier from the field data
  const productPriceTier = (getFieldValue('priceTier') as string) || 'Tier 1';
  
  // Find matching blank cap pricing based on the product's price tier
  const blankCapPricing = blankCapPricingData.find(p => p.Name === productPriceTier);
  
  // Use blank cap pricing if available, otherwise fall back to default pricing
  const pricing: Pricing = {
    price48: blankCapPricing?.price48 ?? 2.4,
    price144: blankCapPricing?.price144 ?? 1.7,
    price576: blankCapPricing?.price576 ?? 1.6,
    price1152: blankCapPricing?.price1152 ?? 1.47,
    price2880: blankCapPricing?.price2880 ?? 1.44,
    price10000: blankCapPricing?.price10000 ?? 1.41,
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

    const result = {
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
      priceTier: productPriceTier, // Add price tier to the result
    };

    // Debug logging
    console.log('Product data for', slug, ':', {
      name: result.name,
      mainImageUrl: result.mainImage.url,
      itemDataCount: result.itemData.length,
      frontColorImagesCount: result.frontColorImages.length,
      leftColorImagesCount: result.leftColorImages.length,
      rightColorImagesCount: result.rightColorImages.length,
      backColorImagesCount: result.backColorImages.length,
      capColorImageCount: result.capColorImage.length,
      splitColorOptionsCount: result.splitColorOptions.length,
      triColorOptionsCount: result.triColorOptions.length,
      camoColorOptionCount: result.camoColorOption.length,
    });

    return result;
  }

  // If not found in Webflow, fall back to Sanity
  const sanityProduct = await SanityService.getProductBySlug(slug);
  if (!sanityProduct) {
    console.error(`Product with slug "${slug}" not found in Webflow CMS or Sanity CMS.`);
    notFound();
  }

  // Get pricing data (optional, defaults if not available)
  let pricing: Pricing = {
    price48: 2.4,
    price144: 1.7,
    price576: 1.6,
    price1152: 1.47,
    price2880: 1.44,
    price10000: 1.41,
  };
  try {
    // Load blank cap pricing data
    const blankCapPricingData = await loadBlankCapPricing();
    
    // Get the product's price tier from Sanity (default to Tier 1 if not available)
    const productPriceTier = (sanityProduct as any).priceTier || 'Tier 1';
    
    // Find matching blank cap pricing based on the product's price tier
    const blankCapPricing = blankCapPricingData.find(p => p.Name === productPriceTier);
    
    // Use blank cap pricing if available, otherwise fall back to default pricing
    pricing = {
      price48: blankCapPricing?.price48 ?? pricing.price48,
      price144: blankCapPricing?.price144 ?? pricing.price144,
      price576: blankCapPricing?.price576 ?? pricing.price576,
      price1152: blankCapPricing?.price1152 ?? pricing.price1152,
      price2880: blankCapPricing?.price2880 ?? pricing.price2880,
      price10000: blankCapPricing?.price10000 ?? pricing.price10000,
    };
  } catch (e) {
    // Use defaults if pricing fetch fails
    console.error('Error loading blank cap pricing for Sanity product:', e);
  }

  // Map Sanity product to Product shape
  const resultFromSanity: Product = {
    name: sanityProduct.name,
    description: sanityProduct.description || '',
    mainImage: sanityProduct.mainImage?.url
      ? {
          url: sanityProduct.mainImage.url,
          alt: sanityProduct.mainImage.alt || sanityProduct.name,
          name: sanityProduct.name,
        }
      : { url: '', alt: '', name: '' },
    itemData: Array.isArray((sanityProduct as any).itemData)
      ? (sanityProduct as any).itemData
          .filter((img: any) => img && (img.url || img.src))
          .map((img: any) => ({
            url: img.url || img.src || '',
            alt: img.alt || sanityProduct.name || 'Product image',
            name: img.name || img.alt || '',
          }))
      : [],
    frontColorImages: Array.isArray((sanityProduct as any).frontColorImages) ? (sanityProduct as any).frontColorImages : [],
    leftColorImages: Array.isArray((sanityProduct as any).leftColorImages) ? (sanityProduct as any).leftColorImages : [],
    rightColorImages: Array.isArray((sanityProduct as any).rightColorImages) ? (sanityProduct as any).rightColorImages : [],
    backColorImages: Array.isArray((sanityProduct as any).backColorImages) ? (sanityProduct as any).backColorImages : [],
    capColorImage: Array.isArray((sanityProduct as any).capColorImage) ? (sanityProduct as any).capColorImage : [],
    splitColorOptions: Array.isArray((sanityProduct as any).splitColorOptions) ? (sanityProduct as any).splitColorOptions : [],
    triColorOptions: Array.isArray((sanityProduct as any).triColorOptions) ? (sanityProduct as any).triColorOptions : [],
    camoColorOption: Array.isArray((sanityProduct as any).camoColorOption) ? (sanityProduct as any).camoColorOption : [],
    pricing,
    productOptions: [],
    priceTier: (sanityProduct as any).priceTier || 'Tier 1', // Add price tier to Sanity products
  };

  // Debug logging
  console.log('Sanity product data for', slug, ':', {
    name: resultFromSanity.name,
    mainImageUrl: resultFromSanity.mainImage.url,
    itemDataCount: resultFromSanity.itemData.length,
  });

  // Also load product options (from Webflow) so options are available for Sanity products too
  try {
    const productOptionsData = await fetchProductOptions();
    const processedOptions: ProductOption[] = productOptionsData.map((option) => {
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
    resultFromSanity.productOptions = processedOptions;
  } catch (e) {
    // If Webflow options are unavailable, leave options empty
  }

  return resultFromSanity;
}

export default async function CustomizePage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const { slug } = await params; // Await params to resolve slug
  const query = await searchParams;
  const product = await fetchProduct(slug);
  const orderId = typeof query.orderId === 'string' ? query.orderId : undefined;
  const isReorder = typeof query.reorder === 'string' ? (query.reorder === '1' || query.reorder === 'true') : false;

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <main className="container mx-auto px-4 py-8">
        <ProductClient product={product} prefillOrderId={orderId} reorder={isReorder} />
      </main>
    </div>
  );
}

