'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { 
  ChevronLeftIcon,
  ChevronRightIcon,
  ShoppingCartIcon,
  SparklesIcon,
  TagIcon,
  TruckIcon,
} from '@heroicons/react/24/outline';

interface ProductPreviewData {
  id: string;
  name: string;
  description?: string;
  mainImage?: string;
  gallery?: string[];
  priceTier: string;
  basePrice?: number;
  sellingPrice?: number;
  colors?: Array<{
    name: string;
    value: string;
    image?: string;
  }>;
  quantities?: {
    [color: string]: {
      [size: string]: number;
    };
  };
  customization?: {
    logoType?: string;
    logoPosition?: string;
    logoSize?: string;
    accessories?: string[];
    premiumOptions?: string[];
  };
  pricing?: {
    tier1: { price48: number; price144: number; price576: number; price1152: number; price2880: number; price10000: number; };
    tier2: { price48: number; price144: number; price576: number; price1152: number; price2880: number; price10000: number; };
    tier3: { price48: number; price144: number; price576: number; price1152: number; price2880: number; price10000: number; };
  };
}

interface QuoteProductPreviewProps {
  products: ProductPreviewData[];
  onAddToQuote?: (product: ProductPreviewData) => void;
  className?: string;
}

export const QuoteProductPreview: React.FC<QuoteProductPreviewProps> = ({
  products,
  onAddToQuote,
  className = '',
}) => {
  const [currentProductIndex, setCurrentProductIndex] = useState(0);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [selectedQuantity, setSelectedQuantity] = useState(48);

  const currentProduct = products[currentProductIndex];

  if (!currentProduct) return null;

  const images = currentProduct.gallery && currentProduct.gallery.length > 0 
    ? [currentProduct.mainImage, ...currentProduct.gallery].filter(Boolean) 
    : [currentProduct.mainImage].filter(Boolean);

  const getTierPricing = (tier: string, quantity: number) => {
    if (!currentProduct.pricing) return null;
    
    const tierKey = `tier${tier.split(' ')[1]}` as keyof typeof currentProduct.pricing;
    const tierPricing = currentProduct.pricing[tierKey];
    
    if (!tierPricing) return null;
    
    // CRITICAL FIX: Correct tier boundaries for quote pricing
    // Tier boundaries: 1-47→price48, 48-143→price144, 144-575→price576, 576-1151→price1152, 1152-2879→price2880, 2880-9999→price10000, 10000+→price20000
    if (quantity >= 10000) return tierPricing.price10000;
    if (quantity >= 2880) return tierPricing.price10000;
    if (quantity >= 1152) return tierPricing.price2880;
    if (quantity >= 576) return tierPricing.price1152;
    if (quantity >= 144) return tierPricing.price576;
    if (quantity >= 48) return tierPricing.price144;
    return tierPricing.price48;
  };

  const currentPrice = getTierPricing(currentProduct.priceTier, selectedQuantity);
  const totalPrice = currentPrice ? (currentPrice * selectedQuantity) : null;

  const nextProduct = () => {
    setCurrentProductIndex((prev) => (prev + 1) % products.length);
    setCurrentImageIndex(0);
  };

  const prevProduct = () => {
    setCurrentProductIndex((prev) => (prev - 1 + products.length) % products.length);
    setCurrentImageIndex(0);
  };

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <div className={`bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6 space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <SparklesIcon className="w-5 h-5 text-lime-400" />
          <h3 className="text-lg font-semibold text-white">
            AI Recommended Products
          </h3>
        </div>
        {products.length > 1 && (
          <div className="flex items-center space-x-2">
            <button
              onClick={prevProduct}
              className="p-1 hover:bg-white/10 rounded-md transition-colors"
            >
              <ChevronLeftIcon className="w-4 h-4 text-slate-300" />
            </button>
            <span className="text-xs text-slate-400">
              {currentProductIndex + 1} / {products.length}
            </span>
            <button
              onClick={nextProduct}
              className="p-1 hover:bg-white/10 rounded-md transition-colors"
            >
              <ChevronRightIcon className="w-4 h-4 text-slate-300" />
            </button>
          </div>
        )}
      </div>

      {/* Product Image Gallery */}
      <div className="relative">
        <div className="aspect-square bg-white/5 rounded-lg overflow-hidden">
          {images.length > 0 && images[currentImageIndex] ? (
            <Image
              src={images[currentImageIndex] || '/placeholder-cap.jpg'}
              alt={currentProduct.name}
              width={400}
              height={400}
              className="w-full h-full object-cover"
              onError={() => {
                // Fallback to placeholder on error
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-700 to-slate-800">
              <div className="text-center text-slate-400">
                <div className="w-16 h-16 mx-auto mb-2 bg-white/10 rounded-full flex items-center justify-center">
                  <TagIcon className="w-8 h-8" />
                </div>
                <p className="text-sm">Product Image</p>
              </div>
            </div>
          )}
        </div>

        {/* Image Navigation */}
        {images.length > 1 && (
          <div className="absolute inset-y-0 left-0 right-0 flex items-center justify-between pointer-events-none">
            <button
              onClick={prevImage}
              className="ml-2 p-2 bg-black/50 backdrop-blur-sm rounded-full text-white hover:bg-black/70 transition-colors pointer-events-auto"
            >
              <ChevronLeftIcon className="w-4 h-4" />
            </button>
            <button
              onClick={nextImage}
              className="mr-2 p-2 bg-black/50 backdrop-blur-sm rounded-full text-white hover:bg-black/70 transition-colors pointer-events-auto"
            >
              <ChevronRightIcon className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Image Dots */}
        {images.length > 1 && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
            {images.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentImageIndex(index)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentImageIndex ? 'bg-lime-400' : 'bg-white/30'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="space-y-4">
        <div>
          <h4 className="text-xl font-bold text-white">{currentProduct.name}</h4>
          {currentProduct.description && (
            <p className="text-sm text-slate-300 mt-1 line-clamp-2">
              {currentProduct.description}
            </p>
          )}
        </div>

        {/* Price Tier Badge */}
        <div className="inline-flex items-center px-3 py-1 bg-gradient-to-r from-lime-500/20 to-emerald-500/20 border border-lime-500/30 rounded-full">
          <span className="text-sm font-medium text-lime-400">
            {currentProduct.priceTier}
          </span>
        </div>

        {/* Quantity Selector */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-200">Quantity</label>
          <div className="flex flex-wrap gap-2">
            {[48, 144, 576, 1152, 2880, 10000].map((qty) => {
              const price = getTierPricing(currentProduct.priceTier, qty);
              return (
                <button
                  key={qty}
                  onClick={() => setSelectedQuantity(qty)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    selectedQuantity === qty
                      ? 'bg-gradient-to-r from-lime-500 to-emerald-500 text-white'
                      : 'bg-white/10 text-slate-300 hover:bg-white/20'
                  }`}
                >
                  <div>{qty}+</div>
                  {price && (
                    <div className="text-xs opacity-75">
                      ${price.toFixed(2)}/ea
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Pricing Display */}
        {currentPrice && totalPrice && (
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-slate-300">Unit Price</div>
                <div className="text-lg font-bold text-lime-400">
                  ${currentPrice.toFixed(2)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-slate-300">Total ({selectedQuantity} units)</div>
                <div className="text-xl font-bold text-white">
                  ${totalPrice.toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Customization Preview */}
        {currentProduct.customization && (
          <div className="space-y-3">
            <h5 className="font-semibold text-slate-200">Suggested Customization</h5>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {currentProduct.customization.logoType && (
                <div>
                  <span className="text-slate-400">Logo:</span>
                  <span className="ml-2 text-slate-200">{currentProduct.customization.logoType}</span>
                </div>
              )}
              {currentProduct.customization.logoPosition && (
                <div>
                  <span className="text-slate-400">Position:</span>
                  <span className="ml-2 text-slate-200">{currentProduct.customization.logoPosition}</span>
                </div>
              )}
              {currentProduct.customization.accessories && currentProduct.customization.accessories.length > 0 && (
                <div className="col-span-2">
                  <span className="text-slate-400">Accessories:</span>
                  <span className="ml-2 text-slate-200">{currentProduct.customization.accessories.join(', ')}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-3 pt-2">
          <button
            onClick={() => onAddToQuote?.(currentProduct)}
            className="flex-1 flex items-center justify-center px-4 py-3 bg-gradient-to-r from-lime-500 to-emerald-500 text-white font-semibold rounded-lg hover:from-lime-400 hover:to-emerald-400 transition-all duration-200 shadow-lg hover:shadow-lime-500/25"
          >
            <ShoppingCartIcon className="w-4 h-4 mr-2" />
            Add to Quote
          </button>
          <button className="px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 text-slate-200 font-medium rounded-lg hover:bg-white/20 transition-colors">
            <TruckIcon className="w-4 h-4 mx-auto" />
          </button>
        </div>
      </div>
    </div>
  );
};