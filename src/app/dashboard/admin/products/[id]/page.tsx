"use client";
import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/components/auth/AuthContext';

interface ProductImage {
 url: string;
 alt: string;
}

interface TextOption {
 label: string;
 price?: number;
}

interface ProductOptionImage extends ProductImage {
 title?: string;
 description?: string;
 price?: number;
}

interface CustomOption {
 name: string;
 type: 'text' | 'image';
 images: ProductOptionImage[];
 textOptions?: TextOption[];
}

interface ProductData {
 _id: string;
 name: string;
 description: string;
 mainImage: ProductImage;
 itemData: ProductImage[];
 capColorImage: ProductImage[];
 priceTier: string;
 productType: 'factory' | 'resale';
 sellingPrice?: number;
 categoryTags?: string[];
 customOptions?: CustomOption[];
 createdBy?: {
  userId: string;
  name: string;
  email: string;
  role?: string;
  company?: string;
 };
}

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
 const router = useRouter();
 const { user } = useAuth();
 const resolvedParams = use(params);
 const [product, setProduct] = useState<ProductData | null>(null);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);
 const [selectedColor, setSelectedColor] = useState<string>('');
 const [quantity, setQuantity] = useState<number>(1);
 const [selectedMainImage, setSelectedMainImage] = useState<ProductImage | null>(null);
 const [selectedOptions, setSelectedOptions] = useState<{ [optionIndex: number]: string }>({});

 // Calculate total cost including base price and selected options
 const calculateTotalCost = () => {
  let total = product?.sellingPrice || 0;
  
  if (product?.customOptions) {
   product.customOptions.forEach((option, optionIndex) => {
    const selectedValue = selectedOptions[optionIndex];
    if (!selectedValue) return;
    
    if (option.type === 'text' && option.textOptions) {
     const selectedTextOption = option.textOptions.find(textOpt => textOpt.label === selectedValue);
     if (selectedTextOption?.price) {
      total += selectedTextOption.price;
     }
    } else if (option.type === 'image' && option.images) {
     const selectedImageOption = option.images.find(img => (img.title || img.alt) === selectedValue);
     if (selectedImageOption?.price) {
      total += selectedImageOption.price;
     }
    }
   });
  }
  
  return total * quantity;
 };

 useEffect(() => {
  async function fetchProduct() {
   try {
    const response = await fetch(`/api/sanity/products/${resolvedParams.id}`);
    
    if (!response.ok) {
     throw new Error('Product not found');
    }
    
    const productData = await response.json();
    setProduct(productData);
    
    // Set default main image
    if (productData.mainImage) {
     setSelectedMainImage(productData.mainImage);
    }
    
    // Set default color if available
    if (productData.capColorImage && productData.capColorImage.length > 0) {
     setSelectedColor(productData.capColorImage[0].alt || 'Default');
    }
   } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to load product');
   } finally {
    setLoading(false);
   }
  }

  fetchProduct();
 }, [resolvedParams.id]);

 const handleAddToCart = () => {
  // Implement add to cart logic
  console.log('Adding to cart:', {
   productId: product?._id,
   color: selectedColor,
   quantity
  });
  
  // Show success message or redirect
  alert('Product added to cart!');
 };

 const handleCustomize = () => {
  // Navigate to customize page
  if (product) {
   router.push(`/customize/${product.name.toLowerCase().replace(/\s+/g, '-')}`);
  }
 };

 const handleRequestQuote = () => {
  // Navigate to quote request page with product info
  if (product) {
   const productSlug = product.slug?.current || product.name.toLowerCase().replace(/\s+/g, '-');
   const queryParams = new URLSearchParams({
    product: productSlug,
    name: product.name,
   });
   router.push(`/quote-request?${queryParams.toString()}`);
  }
 };

 if (loading) {
  return (
   <div className="min-h-screen bg-black text-slate-200 flex items-center justify-center">
    <div className="w-8 h-8 border-2 border-lime-400/30 border-t-lime-400 rounded-full animate-spin"></div>
   </div>
  );
 }

 if (error || !product) {
  return (
   <div className="min-h-screen bg-black text-slate-200 flex items-center justify-center">
    <div className="text-center">
     <h1 className="text-2xl font-bold text-white mb-2">Product Not Found</h1>
     <p className="text-slate-400 mb-4">{error || 'The product you\'re looking for doesn\'t exist.'}</p>
     <button
      onClick={() => router.back()}
      className="px-6 py-2 bg-lime-500 text-black rounded-lg hover:bg-lime-400 transition"
     >
      Go Back
     </button>
    </div>
   </div>
  );
 }

 return (
  <div className="min-h-screen bg-black text-slate-200">
   {/* Background Layers */}
   <div className="fixed inset-0 -z-50">
    <div className="absolute inset-0 bg-gradient-to-b from-black via-[#05070e] to-black"></div>
    <div className="absolute inset-0 opacity-30 mix-blend-soft-light pointer-events-none" style={{
     backgroundImage: 'radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)',
     backgroundSize: '12px 12px',
     maskImage: 'radial-gradient(600px 300px at 50% 0%, black 0%, transparent 70%)',
     WebkitMaskImage: 'radial-gradient(600px 300px at 50% 0%, black 0%, transparent 70%)'
    }}></div>
    <div className="absolute -top-32 -left-24 w-[40rem] h-[40rem] rounded-full bg-[#84cc16]/15 blur-3xl opacity-80 animate-pulse"></div>
    <div className="absolute top-1/3 -right-32 w-[44rem] h-[44rem] rounded-full bg-[#fb923c]/12 blur-3xl opacity-70 animate-pulse" style={{animationDelay: '1s'}}></div>
   </div>

   <div className="relative z-10">
    {/* Header */}
    <div className="max-w-7xl mx-auto px-6 lg:px-10 pt-16 md:pt-24">
     <div className="flex items-center justify-between mb-8">
      <div className="flex items-center gap-4">
       <button
        onClick={() => router.back()}
        className="p-2 rounded-xl bg-stone-700 border border-stone-600 hover:bg-stone-600 transition"
       >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
       </button>
       <div>
        <h1 className="text-3xl md:text-4xl font-bold text-white">{product.name}</h1>
        <p className="text-slate-400 mt-1">Product Details</p>
       </div>
      </div>
      <button
       onClick={() => router.push('/dashboard/admin')}
       className="px-6 py-2 rounded-xl bg-lime-500 text-black font-semibold hover:bg-lime-400 transition-all duration-300"
      >
       Back to Dashboard
      </button>
     </div>
    </div>

    {/* Main Content */}
    <div className="max-w-7xl mx-auto px-6 lg:px-10 pb-16">
     <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
      {/* Images Section */}
      <div className="space-y-6">
       {/* Main Image */}
       <div className="rounded-2xl bg-white/[0.08] border border-stone-500 ring-1 ring-white/[0.08] overflow-hidden shadow-2xl">
        <div className="aspect-square">
         <Image
          src={selectedMainImage?.url || product.mainImage.url}
          alt={selectedMainImage?.alt || product.mainImage.alt}
          width={600}
          height={600}
          className="w-full h-full object-cover"
         />
        </div>
       </div>

       {/* Item Data Images */}
       {product.itemData && product.itemData.length > 0 && (
        <div className="space-y-4">
         <h3 className="text-lg font-semibold text-white">Product Images</h3>
         <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {/* Main Image Thumbnail */}
          <button
           onClick={() => setSelectedMainImage(product.mainImage)}
           className={`rounded-xl bg-white/[0.08] border-2 ring-1 ring-white/[0.08] overflow-hidden shadow-xl transition-all duration-200 hover:border-lime-400/50 hover:shadow-2xl hover:-translate-y-1 ${
            selectedMainImage?.url === product.mainImage.url 
             ? 'border-lime-400 shadow-[0_0_0_2px_rgba(132,204,22,0.3)]'
             : 'border-stone-500'
           }`}
          >
           <div className="aspect-square">
            <Image
             src={product.mainImage.url}
             alt={product.mainImage.alt}
             width={200}
             height={200}
             className="w-full h-full object-cover"
            />
           </div>
          </button>
          
          {/* Item Data Images */}
          {product.itemData.map((image, index) => (
           <button
            key={index}
            onClick={() => setSelectedMainImage(image)}
            className={`rounded-xl bg-white/[0.08] border-2 ring-1 ring-white/[0.08] overflow-hidden shadow-xl transition-all duration-200 hover:border-lime-400/50 hover:shadow-2xl hover:-translate-y-1 ${
             selectedMainImage?.url === image.url 
              ? 'border-lime-400 shadow-[0_0_0_2px_rgba(132,204,22,0.3)]'
              : 'border-stone-500'
            }`}
           >
            <div className="aspect-square">
             <Image
              src={image.url}
              alt={image.alt}
              width={200}
              height={200}
              className="w-full h-full object-cover"
             />
            </div>
           </button>
          ))}
         </div>
        </div>
       )}
      </div>

      {/* Product Info Section */}
      <div className="space-y-8">
       {/* Basic Info */}
       <div className="rounded-2xl bg-white/[0.08] border border-stone-500 ring-1 ring-white/[0.08] p-6 shadow-2xl">
        <div className="space-y-4">
         <div className="flex items-center gap-3">
          <span className={`px-3 py-1 rounded-full text-sm font-medium border ${
           product.productType === 'factory' 
            ? 'bg-purple-500/20 text-purple-400 border-purple-500'
            : 'bg-orange-500/20 text-orange-400 border-orange-500'
          }`}>
           {product.productType === 'factory' ? 'Factory Product' : 'Resale Product'}
          </span>
          <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-500/20 text-blue-400 border border-blue-500">
           {product.priceTier}
          </span>
         </div>

         {product.sellingPrice && (
          <div className="text-2xl font-bold text-lime-400">
           ${product.sellingPrice}
          </div>
         )}

         <div className="text-slate-300">
          <h3 className="font-semibold text-white mb-2">Description</h3>
          <div dangerouslySetInnerHTML={{ __html: product.description }} />
         </div>

         {product.categoryTags && product.categoryTags.length > 0 && (
          <div>
           <h3 className="font-semibold text-white mb-2">Tags</h3>
           <div className="flex flex-wrap gap-2">
            {product.categoryTags.map((tag, index) => (
             <span
              key={index}
              className="px-3 py-1 rounded-full text-sm bg-stone-700 border border-stone-600 text-slate-300"
             >
              {tag}
             </span>
            ))}
           </div>
          </div>
         )}
        </div>
       </div>

       {/* Color Options */}
       {product.capColorImage && product.capColorImage.length > 0 && (
        <div className="rounded-2xl bg-white/[0.08] border border-stone-500 ring-1 ring-white/[0.08] p-6 shadow-2xl">
         <h3 className="font-semibold text-white mb-4">Available Colors</h3>
         <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {product.capColorImage.map((colorImage, index) => (
           <label key={index} className="cursor-pointer">
            <input
             type="radio"
             name="color"
             value={colorImage.alt}
             checked={selectedColor === colorImage.alt}
             onChange={(e) => setSelectedColor(e.target.value)}
             className="sr-only"
            />
            <div className={`relative rounded-xl overflow-hidden border-2 transition-all duration-200 ${
             selectedColor === colorImage.alt 
              ? 'border-lime-400 shadow-[0_0_0_2px_rgba(132,204,22,0.3)]'
              : 'border-stone-500 hover:border-white/40'
            }`}>
             <div className="aspect-square">
              <Image
               src={colorImage.url}
               alt={colorImage.alt}
               width={120}
               height={120}
               className="w-full h-full object-cover"
              />
             </div>
             <div className="absolute inset-x-0 bottom-0 bg-black p-2">
              <span className="text-xs font-medium text-white block text-center">
               {colorImage.alt}
              </span>
             </div>
            </div>
           </label>
          ))}
         </div>
        </div>
       )}

       {/* Custom Options */}
       {product.customOptions && product.customOptions.length > 0 && (
        <div className="space-y-6">
         {product.customOptions.map((option, optionIndex) => (
          <div key={optionIndex} className="rounded-2xl bg-white/[0.08] border border-stone-500 ring-1 ring-white/[0.08] p-6 shadow-2xl">
           <div className="flex items-center space-x-3 mb-4">
            <h3 className="font-semibold text-white">{option.name}</h3>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
             option.type === 'text' 
              ? 'bg-green-500/20 text-green-400 border border-green-500'
              : 'bg-blue-500/20 text-blue-400 border border-blue-500'
            }`}>
             {option.type === 'text' ? 'Text Options' : 'Image Options'}
            </span>
           </div>

           {option.type === 'text' ? (
            /* Text Options Display */
            option.textOptions && option.textOptions.length > 0 && (
             <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {option.textOptions
               .filter(textOpt => textOpt.label && textOpt.label.trim() !== '' && textOpt.label.toLowerCase() !== 'undefined' && textOpt.label.toLowerCase() !== 'null')
               .map((textOpt, textIndex) => (
               <div key={textIndex} className="relative">
                <label className="cursor-pointer">
                 <input
                  type="radio"
                  name={`option-${optionIndex}`}
                  value={textOpt.label}
                  checked={selectedOptions[optionIndex] === textOpt.label}
                  onChange={() => setSelectedOptions(prev => ({
                   ...prev,
                   [optionIndex]: textOpt.label
                  }))}
                  className="sr-only"
                 />
                 <div className={`p-3 rounded-xl border-2 transition-all duration-200 ${
                  selectedOptions[optionIndex] === textOpt.label
                   ? 'border-lime-400 bg-lime-400/20 shadow-[0_0_0_2px_rgba(132,204,22,0.3)]'
                   : 'border-stone-500 hover:border-white/40 bg-white/[0.05] hover:bg-white/[0.1]'
                 }`}>
                  <div className="text-center">
                   <span className="text-sm font-medium text-white block">
                    {textOpt.label}
                   </span>
                   {textOpt.price && textOpt.price > 0 ? (
                    <span className="text-xs text-lime-400 mt-1 block">
                     +${textOpt.price}
                    </span>
                   ) : (
                    <span className="text-xs text-slate-400 mt-1 block">
                     No extra cost
                    </span>
                   )}
                  </div>
                 </div>
                </label>
               </div>
              ))}
             </div>
            )
           ) : (
            /* Image Options Display */
            option.images && option.images.length > 0 && (
             <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {option.images
               .filter(image => image.url && (image.title || image.alt) && (image.title || image.alt).toLowerCase() !== 'undefined' && (image.title || image.alt).toLowerCase() !== 'null')
               .map((image, imgIndex) => (
               <div key={imgIndex} className="relative">
                <label className="cursor-pointer">
                 <input
                  type="radio"
                  name={`option-${optionIndex}`}
                  value={image.title || image.alt}
                  checked={selectedOptions[optionIndex] === (image.title || image.alt)}
                  onChange={() => setSelectedOptions(prev => ({
                   ...prev,
                   [optionIndex]: image.title || image.alt
                  }))}
                  className="sr-only"
                 />
                 <div className={`rounded-xl border-2 transition-all duration-200 overflow-hidden ${
                  selectedOptions[optionIndex] === (image.title || image.alt)
                   ? 'border-lime-400 shadow-[0_0_0_2px_rgba(132,204,22,0.3)]'
                   : 'border-stone-500 hover:border-white/40'
                 }`}>
                  <div className="aspect-square">
                   <Image
                    src={image.url}
                    alt={image.alt}
                    width={150}
                    height={150}
                    className="w-full h-full object-cover"
                   />
                  </div>
                  <div className="p-3 bg-black ">
                   <div className="text-center">
                    <span className="text-xs font-medium text-white block">
                     {image.title || image.alt}
                    </span>
                    {image.description && (
                     <span className="text-xs text-slate-300 block mt-1">
                      {image.description}
                     </span>
                    )}
                    {image.price && image.price > 0 ? (
                     <span className="text-xs text-lime-400 mt-1 block">
                      +${image.price}
                     </span>
                    ) : (
                     <span className="text-xs text-slate-400 mt-1 block">
                      No extra cost
                     </span>
                    )}
                   </div>
                  </div>
                 </div>
                </label>
               </div>
              ))}
             </div>
            )
           )}
          </div>
         ))}
        </div>
       )}

       {/* Purchase Section */}
       <div className="rounded-2xl bg-white/[0.08] border border-stone-500 ring-1 ring-white/[0.08] p-6 shadow-2xl">
        <div className="space-y-6">
         {/* Quantity and Cost Calculation */}
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
           <label className="block text-sm font-medium text-slate-300 mb-2">
            Quantity
           </label>
           <input
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
            className="w-full px-3 py-2 border border-stone-600 bg-black/30 text-white rounded-lg focus:ring-2 focus:ring-lime-400 focus:border-lime-400"
           />
          </div>
          
          {/* Total Cost Display */}
          <div>
           <label className="block text-sm font-medium text-slate-300 mb-2">
            Total Cost
           </label>
           <div className="bg-black/40 border border-lime-400/30 rounded-lg p-3">
            <div className="text-2xl font-bold text-lime-400">
             ${calculateTotalCost().toFixed(2)}
            </div>
            <div className="text-xs text-slate-400 mt-1">
             {quantity > 1 && product?.sellingPrice && (
              <>Base: ${product.sellingPrice} x {quantity} = ${(product.sellingPrice * quantity).toFixed(2)}</>
             )}
            </div>
           </div>
          </div>
         </div>

         {/* Cost Breakdown */}
         {(product?.sellingPrice || Object.keys(selectedOptions).length > 0) && (
          <div className="bg-black/20 rounded-lg p-4">
           <h4 className="text-sm font-semibold text-white mb-3">Cost Breakdown:</h4>
           <div className="space-y-2 text-sm">
            {product?.sellingPrice && (
             <div className="flex justify-between text-slate-300">
              <span>Base Price (×{quantity}):</span>
              <span>${(product.sellingPrice * quantity).toFixed(2)}</span>
             </div>
            )}
            
            {/* Show selected options and their costs */}
            {product?.customOptions?.map((option, optionIndex) => {
             const selectedValue = selectedOptions[optionIndex];
             if (!selectedValue) return null;
             
             let optionPrice = 0;
             if (option.type === 'text' && option.textOptions) {
              const selectedTextOption = option.textOptions.find(textOpt => textOpt.label === selectedValue);
              optionPrice = selectedTextOption?.price || 0;
             } else if (option.type === 'image' && option.images) {
              const selectedImageOption = option.images.find(img => (img.title || img.alt) === selectedValue);
              optionPrice = selectedImageOption?.price || 0;
             }
             
             if (optionPrice > 0) {
              return (
               <div key={optionIndex} className="flex justify-between text-slate-300">
                <span>{option.name}: {selectedValue} (×{quantity}):</span>
                <span>+${(optionPrice * quantity).toFixed(2)}</span>
               </div>
              );
             }
             return null;
            })}
            
            <div className="border-t border-stone-600 pt-2 mt-2">
             <div className="flex justify-between font-semibold text-lime-400">
              <span>Total:</span>
              <span>${calculateTotalCost().toFixed(2)}</span>
             </div>
            </div>
           </div>
          </div>
         )}

         {/* Button Layout: Request Quote and Add to Cart in same row */}
         <div className="space-y-3">
          <div className="flex gap-3">
           <button
            onClick={handleRequestQuote}
            className="flex-1 h-12 px-6 rounded-xl bg-gradient-to-r from-[#f59e0b] to-[#d97706] text-black font-bold text-sm shadow-[0_0_0_2px_rgba(255,255,255,0.1)] hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(245,158,11,0.5)] transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#f59e0b]/60 flex items-center justify-center"
           >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Request Quote
           </button>
           
           <button
            onClick={handleAddToCart}
            className="flex-1 h-12 px-6 rounded-xl bg-white/[0.08] border border-stone-500 text-white font-semibold text-sm hover:bg-white/[0.15] hover:border-stone-400 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 flex items-center justify-center shadow-lg hover:shadow-xl hover:-translate-y-0.5"
           >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.293 2.293C4.512 15.488 4.756 16 5.207 16H8M8 16v4a2 2 0 004 0v-4M8 16h8" />
            </svg>
            Add to Cart
           </button>
          </div>
          
          {/* Customize button below - only show if product is customizable */}
          {product.productReadiness?.includes('Customizable') && (
           <button
            onClick={handleCustomize}
            className="w-full h-12 px-6 rounded-xl bg-gradient-to-r from-[#84cc16] to-[#65a30d] text-black font-bold text-sm shadow-[0_0_0_2px_rgba(255,255,255,0.1)] hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(132,204,22,0.5)] transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#84cc16]/60 flex items-center justify-center"
           >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 011-1h1a2 2 0 100-4H7a1 1 0 01-1-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
            </svg>
            Customize Product
           </button>
          )}
         </div>
        </div>
       </div>

      </div>
     </div>
    </div>
   </div>
  </div>
 );
}