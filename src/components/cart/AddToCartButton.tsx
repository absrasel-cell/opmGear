'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from './CartContext';

interface UploadedLogoFile {
  id: string;
  name: string;
  size: number;
  type: string;
  kind: 'LOGO' | 'ACCESSORY' | 'OTHER';
  position?: string;
  base64Data: string;
  preview?: string;
}

interface AddToCartButtonProps {
  productId: string;
  productName: string;
  productSlug?: string;
  priceTier?: string; // Add price tier information
  selectedColors: Record<string, { sizes: Record<string, number> }>;
  logoSetupSelections: Record<string, { position?: string; size?: string; application?: string }>;
  selectedOptions: Record<string, string>;
  multiSelectOptions: Record<string, string[]>;
  logoFile?: File | null; // Legacy field - kept for backward compatibility
  uploadedLogoFiles?: UploadedLogoFile[]; // New field for prepared logo files
  additionalInstructions?: string;
  pricing: {
    unitPrice: number;
    totalPrice: number;
    volume: number;
  };
  disabled?: boolean;
  className?: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export default function AddToCartButton({
  productId,
  productName,
  productSlug,
  priceTier,
  selectedColors,
  logoSetupSelections,
  selectedOptions,
  multiSelectOptions,
  logoFile,
  uploadedLogoFiles,
  additionalInstructions,
  pricing,
  disabled = false,
  className = '',
  onSuccess,
  onError
}: AddToCartButtonProps) {
  const { addToCart, isInCart } = useCart();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  const validateSelections = () => {
    // Check if at least one color and size is selected
    const hasColors = Object.keys(selectedColors).length > 0;
    const hasQuantities = Object.values(selectedColors).some(colorData => 
      Object.values(colorData.sizes).some(qty => qty > 0)
    );

    if (!hasColors || !hasQuantities) {
      return 'Please select at least one color and size with quantity.';
    }

    if (pricing.volume <= 0) {
      return 'Please specify quantities for your selections.';
    }

    return null;
  };

  const handleAddToCart = async () => {
    setIsLoading(true);
    
    try {
      // Validate selections
      const validationError = validateSelections();
      if (validationError) {
        onError?.(validationError);
        return;
      }

      // Check if item is already in cart with same customizations
      const alreadyInCart = isInCart(productId, { selectedColors });
      if (alreadyInCart) {
        onError?.('This item with the same customizations is already in your cart.');
        return;
      }

      // Add to cart
      addToCart({
        productId,
        productName,
        productSlug,
        priceTier,
        selectedColors,
        logoSetupSelections,
        selectedOptions,
        multiSelectOptions,
        logoFile,
        uploadedLogoFiles,
        additionalInstructions,
        pricing
      });

      // Show success feedback
      setJustAdded(true);
      onSuccess?.();

      // Reset success state after 5 seconds to give user time to click "Check Out"
      setTimeout(() => {
        setJustAdded(false);
      }, 5000);

    } catch (error) {
      console.error('Error adding to cart:', error);
      onError?.('Failed to add item to cart. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const isAlreadyInCart = isInCart(productId, { selectedColors });

  const handleButtonClick = () => {
    if (justAdded) {
      // Navigate to checkout when button shows "Check Out"
      router.push('/checkout');
    } else {
      // Add to cart when button shows "Add to Cart"
      handleAddToCart();
    }
  };

  return (
    <button
      onClick={handleButtonClick}
      disabled={disabled || isLoading}
      className={`
        relative overflow-hidden transition-all duration-300 px-6 py-3 rounded-lg font-medium text-black
        ${justAdded 
          ? 'bg-lime-400 hover:bg-lime-500 ring-2 ring-lime-300 ring-opacity-50 animate-pulse shadow-lg shadow-lime-400/25' 
          : isAlreadyInCart
            ? 'bg-lime-500 hover:bg-lime-600 shadow-lg shadow-lime-500/25'
            : 'bg-lime-500 hover:bg-lime-600 shadow-lg shadow-lime-500/25'
        }
        ${disabled || isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-lg hover:shadow-lime-500/40 transform hover:scale-105'}
        ${className}
      `}
    >
      {/* Loading Spinner */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-lime-500">
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-black border-t-transparent"></div>
        </div>
      )}

      {/* Button Content */}
      <div className={`flex items-center space-x-2 ${isLoading ? 'opacity-0' : 'opacity-100'}`}>
        {justAdded ? (
          <>
            {/* Checkout Icon */}
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
            <span>Check Out</span>
          </>
        ) : (
          <>
            {/* Cart Icon */}
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-1.1 5H19M7 13v8a2 2 0 002 2h6a2 2 0 002-2v-8m-8 0V9a2 2 0 012-2h4a2 2 0 012 2v4.01" />
            </svg>
            <span>
              {isAlreadyInCart ? 'Update Cart' : 'Add to Cart'}
            </span>
          </>
        )}
      </div>
    </button>
  );
}
