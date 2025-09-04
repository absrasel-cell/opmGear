'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '../auth/AuthContext';

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

interface CartItem {
  id: string;
  productId: string;
  productName: string;
  productSlug?: string;
  priceTier?: string; // Add price tier information
  selectedColors: Record<string, { sizes: Record<string, number>; customName?: string; isCustom?: boolean }>;
  logoSetupSelections: Record<string, { position?: string; size?: string; application?: string }>;
  selectedOptions: Record<string, string>;
  multiSelectOptions: Record<string, string[]>;
  logoFile?: File | null; // Legacy field - kept for backward compatibility
  uploadedLogoFiles?: UploadedLogoFile[]; // New field for prepared logo files
  additionalInstructions?: string;
  customizations: {
    colorSummary: string;
    logoSummary: string;
    optionsSummary: string;
  };
  pricing: {
    unitPrice: number;
    totalPrice: number;
    volume: number;
  };
  addedAt: Date;
  updatedAt: Date;
  // Shipment assignment fields
  shipmentId?: string | null;
  shipment?: {
    id: string;
    buildNumber: string;
  } | null;
}

interface CartState {
  items: CartItem[];
  totalItems: number;
  totalPrice: number;
  userId?: string;
  guestId?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface CartContextType {
  cart: CartState;
  addToCart: (item: Omit<CartItem, 'id' | 'addedAt' | 'updatedAt'>) => void;
  removeFromCart: (itemId: string) => void;
  updateQuantity: (itemId: string, colorType: string, size: string, quantity: number) => void;
  clearCart: () => void;
  getCartTotal: () => number;
  getItemCount: () => number;
  isInCart: (productId: string, customizations: any) => boolean;
  isLoading: boolean;
  debugClearLocalStorage: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  
  const [cart, setCart] = useState<CartState>({
    items: [],
    totalItems: 0,
    totalPrice: 0,
    userId: undefined,
    guestId: undefined,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  // Generate guest ID for non-authenticated users
  const getGuestId = () => {
    let guestId = localStorage.getItem('customcap_guest_id');
    if (!guestId) {
      guestId = 'guest_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('customcap_guest_id', guestId);
    }
    return guestId;
  };

  // Load cart from localStorage or database
  useEffect(() => {
    loadCart();
  }, [isAuthenticated, user]);

  const loadCart = async () => {
    setIsLoading(true);
    try {
      if (isAuthenticated && user) {
        // Load cart from database for authenticated users
        await loadCartFromDatabase();
      } else {
        // Load cart from localStorage for guests
        loadCartFromLocalStorage();
      }
    } catch (error) {
      console.error('Error loading cart:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadCartFromDatabase = async () => {
    try {
      const response = await fetch(`/api/cart?userId=${user?.id}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.cart) {
          setCart({
            ...data.cart,
            userId: user?.id,
            createdAt: new Date(data.cart.createdAt),
            updatedAt: new Date(data.cart.updatedAt)
          });
        }
      }
    } catch (error) {
      console.error('Error loading cart from database:', error);
      // Fallback to localStorage
      loadCartFromLocalStorage();
    }
  };

  const loadCartFromLocalStorage = () => {
    try {
      const savedCart = localStorage.getItem('customcap_cart');
      if (process.env.NODE_ENV === 'development') {
        console.log('💾 Cart Debug - loading from localStorage:', savedCart ? 'data found' : 'no data');
      }
      
      if (savedCart) {
        const parsedCart = JSON.parse(savedCart);
        if (process.env.NODE_ENV === 'development') {
          console.log('💾 Cart Debug - parsed cart:', {
            itemsCount: parsedCart.items?.length || 0,
            totalItems: parsedCart.totalItems,
            items: parsedCart.items?.map((item: any) => ({
              id: item.id,
              name: item.productName,
              volume: item.pricing?.volume
            })) || []
          });
        }
        
        setCart({
          ...parsedCart,
          guestId: getGuestId(),
          createdAt: new Date(parsedCart.createdAt),
          updatedAt: new Date(parsedCart.updatedAt)
        });
      } else {
        setCart(prev => ({
          ...prev,
          guestId: getGuestId()
        }));
      }
    } catch (error) {
      console.error('Error loading cart from localStorage:', error);
      setCart(prev => ({
        ...prev,
        guestId: getGuestId()
      }));
    }
  };

  const saveCart = async (updatedCart: CartState) => {
    const cartToSave = {
      ...updatedCart,
      updatedAt: new Date()
    };

    setCart(cartToSave);

    if (isAuthenticated && user) {
      // Save to database for authenticated users
      try {
        await fetch('/api/cart', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            cart: cartToSave
          })
        });
      } catch (error) {
        console.error('Error saving cart to database:', error);
      }
    }

    // Always save to localStorage as backup
    try {
      localStorage.setItem('customcap_cart', JSON.stringify(cartToSave));
    } catch (error) {
      console.error('Error saving cart to localStorage:', error);
    }
  };

  const generateCartItemId = () => {
    return 'cart_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  };

  const calculateTotals = (items: CartItem[]) => {
    let totalItems = 0;
    let totalPrice = 0;

    items.forEach(item => {
      if (process.env.NODE_ENV === 'development') {
        console.log('📊 Cart Debug - calculating totals for item:', {
          itemName: item.productName,
          volume: item.pricing.volume,
          price: item.pricing.totalPrice,
          isValidVolume: typeof item.pricing.volume === 'number' && !isNaN(item.pricing.volume)
        });
      }
      
      totalItems += item.pricing.volume || 0;
      totalPrice += item.pricing.totalPrice || 0;
    });

    if (process.env.NODE_ENV === 'development') {
      console.log('📊 Cart Debug - calculateTotals result:', {
        itemCount: items.length,
        totalItems,
        totalPrice
      });
    }

    return { totalItems, totalPrice };
  };

  const generateCustomizationSummary = (item: Omit<CartItem, 'id' | 'addedAt' | 'updatedAt' | 'customizations'>) => {
    // Generate color summary with custom names
    const colorEntries = Object.entries(item.selectedColors);
    const colorSummary = colorEntries.map(([colorType, data]) => {
      const sizeEntries = Object.entries(data.sizes);
      const totalQty = sizeEntries.reduce((sum, [_, qty]) => sum + qty, 0);
      // Use custom name if available, otherwise use original color type
      const displayName = data.customName || colorType;
      const customBadge = data.isCustom ? ' (Custom)' : '';
      return `${displayName}${customBadge}: ${totalQty} items`;
    }).join(', ');

    // Generate logo summary
    const logoEntries = Object.entries(item.logoSetupSelections);
    const logoSetupSummary = logoEntries.map(([logoName, setup]) => {
      const parts = [];
      if (setup.position) parts.push(`Position: ${setup.position}`);
      if (setup.size) parts.push(`Size: ${setup.size}`);
      if (setup.application) parts.push(`Method: ${setup.application}`);
      return `${logoName} (${parts.join(', ')})`;
    }).join(', ');
    
    // Add logo file info (legacy support)
    const logoFilePart = item.logoFile ? `Logo File: ${item.logoFile.name}` : '';
    
    // Add uploaded logo files info
    const uploadedFilesPart = item.uploadedLogoFiles && item.uploadedLogoFiles.length > 0 
      ? `Uploaded Files: ${item.uploadedLogoFiles.map(f => `${f.name} (${f.kind}${f.position ? `, ${f.position}` : ''})`).join(', ')}`
      : '';
    
    const logoSummary = [logoSetupSummary, logoFilePart, uploadedFilesPart].filter(Boolean).join(' | ');

    // Generate options summary
    const optionEntries = Object.entries(item.selectedOptions);
    const multiOptionEntries = Object.entries(item.multiSelectOptions);
    const optionParts = [
      ...optionEntries.map(([key, value]) => `${key}: ${value}`),
      ...multiOptionEntries.map(([key, values]) => `${key}: ${values.join(', ')}`)
    ];
    
    // Add additional instructions
    if (item.additionalInstructions && item.additionalInstructions.trim()) {
      optionParts.push(`Instructions: ${item.additionalInstructions.trim()}`);
    }
    
    const optionsSummary = optionParts.join(', ');

    return {
      colorSummary: colorSummary || 'No colors selected',
      logoSummary: logoSummary || 'No logo setup',
      optionsSummary: optionsSummary || 'No additional options'
    };
  };

  const addToCart = (itemData: Omit<CartItem, 'id' | 'addedAt' | 'updatedAt'>) => {
    const customizations = generateCustomizationSummary(itemData);
    
    const newItem: CartItem = {
      ...itemData,
      id: generateCartItemId(),
      customizations,
      addedAt: new Date(),
      updatedAt: new Date()
    };

    const updatedItems = [...cart.items, newItem];
    const { totalItems, totalPrice } = calculateTotals(updatedItems);

    const updatedCart: CartState = {
      ...cart,
      items: updatedItems,
      totalItems,
      totalPrice,
      userId: isAuthenticated && user ? user.id : undefined,
      guestId: !isAuthenticated ? cart.guestId : undefined
    };

    saveCart(updatedCart);
  };

  const removeFromCart = (itemId: string) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🗑️ Cart Debug - removeFromCart called:', {
        itemIdToRemove: itemId,
        currentItems: cart.items.length,
        itemExists: cart.items.some(item => item.id === itemId)
      });
    }
    
    const updatedItems = cart.items.filter(item => item.id !== itemId);
    if (process.env.NODE_ENV === 'development') {
      console.log('🗑️ Cart Debug - after filter:', {
        originalLength: cart.items.length,
        newLength: updatedItems.length,
        removed: cart.items.length - updatedItems.length
      });
    }
    
    const { totalItems, totalPrice } = calculateTotals(updatedItems);

    const updatedCart: CartState = {
      ...cart,
      items: updatedItems,
      totalItems,
      totalPrice
    };

    if (process.env.NODE_ENV === 'development') {
      console.log('🗑️ Cart Debug - saving updated cart:', {
        newTotalItems: totalItems,
        newItemsLength: updatedItems.length
      });
    }

    saveCart(updatedCart);
  };

  const updateQuantity = (itemId: string, colorType: string, size: string, quantity: number) => {
    const updatedItems = cart.items.map(item => {
      if (item.id === itemId) {
        const updatedColors = { ...item.selectedColors };
        if (updatedColors[colorType] && updatedColors[colorType].sizes[size] !== undefined) {
          if (quantity <= 0) {
            delete updatedColors[colorType].sizes[size];
            // Remove color type if no sizes left
            if (Object.keys(updatedColors[colorType].sizes).length === 0) {
              delete updatedColors[colorType];
            }
          } else {
            updatedColors[colorType].sizes[size] = quantity;
          }
        }

        // Recalculate pricing
        const totalVolume = Object.values(updatedColors).reduce((sum, colorData) => {
          return sum + Object.values(colorData.sizes).reduce((sizeSum, qty) => sizeSum + qty, 0);
        }, 0);

        const updatedItem = {
          ...item,
          selectedColors: updatedColors,
          pricing: {
            ...item.pricing,
            volume: totalVolume,
            totalPrice: item.pricing.unitPrice * totalVolume
          },
          updatedAt: new Date()
        };

        // Regenerate customization summary
        updatedItem.customizations = generateCustomizationSummary(updatedItem);

        return updatedItem;
      }
      return item;
    });

    // Remove items with no colors/quantities
    const filteredItems = updatedItems.filter(item => 
      Object.keys(item.selectedColors).length > 0 && 
      item.pricing.volume > 0
    );

    const { totalItems, totalPrice } = calculateTotals(filteredItems);

    const updatedCart: CartState = {
      ...cart,
      items: filteredItems,
      totalItems,
      totalPrice
    };

    saveCart(updatedCart);
  };

  const clearCart = () => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🧹 Cart Debug - clearCart called');
    }
    
    const clearedCart: CartState = {
      items: [],
      totalItems: 0,
      totalPrice: 0,
      userId: isAuthenticated && user ? user.id : undefined,
      guestId: !isAuthenticated ? cart.guestId : undefined,
      createdAt: cart.createdAt,
      updatedAt: new Date()
    };

    if (process.env.NODE_ENV === 'development') {
      console.log('🧹 Cart Debug - clearing cart, new state:', clearedCart);
    }
    saveCart(clearedCart);
  };

  // Debug function to force clear localStorage
  const debugClearLocalStorage = () => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔧 Cart Debug - Clearing localStorage');
    }
    localStorage.removeItem('customcap_cart');
    setCart({
      items: [],
      totalItems: 0,
      totalPrice: 0,
      userId: undefined,
      guestId: getGuestId(),
      createdAt: new Date(),
      updatedAt: new Date()
    });
  };

  const getCartTotal = () => cart.totalPrice;

  const getItemCount = () => {
    // Removed debug logging to prevent build noise - this gets called frequently during SSR/SSG
    return cart.totalItems;
  };

  const isInCart = (productId: string, customizations: any) => {
    return cart.items.some(item => 
      item.productId === productId && 
      JSON.stringify(item.selectedColors) === JSON.stringify(customizations.selectedColors)
    );
  };

  const value: CartContextType = {
    cart,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getCartTotal,
    getItemCount,
    isInCart,
    isLoading,
    debugClearLocalStorage
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
