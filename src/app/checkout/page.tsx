'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCart } from '@/components/cart/CartContext';
import { useAuth } from '@/components/auth/AuthContext';
import { calculateGrandTotal, getDisplayTotal, CostBreakdown } from '@/lib/pricing';

interface CheckoutForm {
  // Shipping Information
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  
  // Payment Information
  cardNumber: string;
  cardName: string;
  expiryDate: string;
  cvv: string;
  
  // Additional
  saveInfo: boolean;
  sameAsShipping: boolean;
  specialInstructions: string;
}

export default function CheckoutPage() {
  const router = useRouter();
  const { cart, clearCart, addToCart, getCartTotal, getItemCount } = useCart();
  const { user, isAuthenticated } = useAuth();

  const [formData, setFormData] = useState<CheckoutForm>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    company: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'United States',
    cardNumber: '',
    cardName: '',
    expiryDate: '',
    cvv: '',
    saveInfo: false,
    sameAsShipping: true,
    specialInstructions: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderSubmittedSuccessfully, setOrderSubmittedSuccessfully] = useState(false);
  const hasPrefilledRef = useRef(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [itemCostBreakdowns, setItemCostBreakdowns] = useState<Record<string, any>>({});
  const [isReorderCheckout, setIsReorderCheckout] = useState(false);
  const hasLoadedSavedOrderRef = useRef(false);
  
  // Refs for form inputs to avoid controlled component re-renders
  const formRefs = useRef<Record<string, HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>>({});

  // Create a stable cart items hash to prevent unnecessary re-renders
  const cartItemsHash = useMemo(() => {
    return cart.items.map(item => item.id).join(',');
  }, [cart.items]);

  // Pre-fill form with user data if authenticated (only once)
  useEffect(() => {
    if (isAuthenticated && user && !hasPrefilledRef.current) {
      // Pre-fill form refs with user data
      if (formRefs.current.firstName) {
        (formRefs.current.firstName as HTMLInputElement).value = user.name?.split(' ')[0] || '';
      }
      if (formRefs.current.lastName) {
        (formRefs.current.lastName as HTMLInputElement).value = user.name?.split(' ').slice(1).join(' ') || '';
      }
      if (formRefs.current.email) {
        (formRefs.current.email as HTMLInputElement).value = user.email || '';
      }
      hasPrefilledRef.current = true;
    }
  }, [isAuthenticated, user]);

  // If coming from a saved order, prefill cart with that order's items (single-order checkout)
  useEffect(() => {
    const prefillFromSavedOrder = async () => {
      const params = new URLSearchParams(window.location.search);
      const orderId = params.get('orderId');
      if (!orderId || hasLoadedSavedOrderRef.current) return;
      
      hasLoadedSavedOrderRef.current = true; // Set early to prevent race conditions
      setIsReorderCheckout(true);
      
      try {
        const res = await fetch(`/api/orders/${orderId}`);
        if (!res.ok) {
          console.error('Failed to fetch saved order:', res.statusText);
          return;
        }
        const data = await res.json();
        const order = data.order;
        if (!order) {
          console.error('No order data received');
          return;
        }

        // Clear existing cart first and wait for it to complete
        clearCart();
        
        // Use setTimeout to ensure cart is cleared before adding new item
        setTimeout(() => {
          const cartItem = {
            id: `saved-order-${orderId}`, // Unique ID to prevent duplicates
            productId: order.productName.toLowerCase().replace(/\s+/g, '-'),
            productName: order.productName,
            productSlug: order.productName.toLowerCase().replace(/\s+/g, '-'),
            priceTier: order.priceTier || 'Tier 1', // Default tier for saved orders (will be improved when database includes tier)
            selectedColors: order.selectedColors || {},
            logoSetupSelections: order.logoSetupSelections || {},
            selectedOptions: order.selectedOptions || {},
            multiSelectOptions: order.multiSelectOptions || {},
            customizations: {
              selectedColors: order.selectedColors || {},
              logoSetupSelections: order.logoSetupSelections || {},
              selectedOptions: order.selectedOptions || {},
              multiSelectOptions: order.multiSelectOptions || {},
              colorSummary: Object.keys(order.selectedColors || {}).join(', '),
              logoSummary: Object.keys(order.logoSetupSelections || {}).join(', '),
              optionsSummary: Object.values(order.selectedOptions || {}).join(', '),
            },
            pricing: {
              unitPrice: order.itemTotal || 0,
              totalPrice: order.itemTotal || 0,
              volume: Object.values(order.selectedColors || {}).reduce((total: number, colorData: any) => {
                return total + Object.values(colorData.sizes || {}).reduce((sum: number, qty: any) => sum + (qty || 0), 0);
              }, 0)
            }
          };

          // Add the saved order to cart
          addToCart(cartItem);
          console.log('✅ Saved order loaded into cart:', orderId);
        }, 100);
        
      } catch (error) {
        console.error('Error loading saved order into cart:', error);
        hasLoadedSavedOrderRef.current = false; // Reset on error to allow retry
      }
    };
    
    // Only run once and only on client side
    if (typeof window !== 'undefined' && !hasLoadedSavedOrderRef.current) {
      prefillFromSavedOrder();
    }
  }, []); // Remove dependencies to prevent re-running

  // Redirect to cart if empty and not checking out a saved order
  useEffect(() => {
    const hasSavedOrder = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('orderId');
    // Don't redirect if we're in the process of submitting an order or if order was just submitted successfully
    if (cart.items.length === 0 && !hasSavedOrder && !isProcessing && !orderSubmittedSuccessfully) {
      router.push('/cart');
    }
  }, [cart.items.length, router, isProcessing, orderSubmittedSuccessfully]);

  // Calculate cost breakdowns for cart items
  useEffect(() => {
    const loadOrCalculateCostBreakdowns = async () => {
      // Skip if no cart items or already calculating
      if (cart.items.length === 0) return;
      
      // First try to load pre-calculated costs from cart page
      try {
        const savedBreakdowns = sessionStorage.getItem('cart_cost_breakdowns');
        if (savedBreakdowns) {
          const parsedBreakdowns = JSON.parse(savedBreakdowns);
          // Verify all cart items have cost breakdowns
          const hasAllBreakdowns = cart.items.every(item => parsedBreakdowns[item.id]);
          if (hasAllBreakdowns) {
            console.log('✅ Using pre-calculated cost breakdowns from cart');
            setItemCostBreakdowns(parsedBreakdowns);
            // Clear the session storage to prevent stale data
            sessionStorage.removeItem('cart_cost_breakdowns');
            return;
          }
        }
      } catch (error) {
        console.warn('Failed to load pre-calculated costs:', error);
      }

      // For saved orders, use existing pricing data if available
      if (isReorderCheckout && cart.items.length === 1) {
        const item = cart.items[0];
        if (item.pricing.totalPrice > 0) {
          console.log('✅ Using saved order pricing data');
          const savedOrderBreakdown = {
            [item.id]: {
              baseProductCost: item.pricing.totalPrice,
              logoSetupCosts: [],
              accessoriesCosts: [],
              closureCosts: [],
              deliveryCosts: [],
              totalCost: item.pricing.totalPrice,
              totalUnits: item.pricing.volume
            }
          };
          setItemCostBreakdowns(savedOrderBreakdown);
          return;
        }
      }

      // Fallback: calculate costs on checkout page with consistent base pricing
      console.log('🔄 Calculating cost breakdowns on checkout page');
      const breakdowns: Record<string, any> = {};
      
      // Import centralized pricing for consistent base product pricing
      const { getBaseProductPricing } = await import('@/lib/pricing');
      
      for (const item of cart.items) {
        try {
          // Get consistent base product pricing
          const baseProductPricing = getBaseProductPricing(item.priceTier || 'Tier 1');
          
          const response = await fetch('/api/calculate-cost', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              selectedColors: item.selectedColors,
              logoSetupSelections: item.logoSetupSelections,
              selectedOptions: item.selectedOptions,
              multiSelectOptions: item.multiSelectOptions,
              baseProductPricing: baseProductPricing, // Include base pricing for consistency
              priceTier: item.priceTier || 'Tier 1', // Ensure tier consistency
            }),
          });

          if (response.ok) {
            const costData = await response.json();
            breakdowns[item.id] = costData;
          } else {
            // Use consistent fallback pricing calculation
            const { calculateUnitPrice } = await import('@/lib/pricing');
            const unitPrice = calculateUnitPrice(item.pricing.volume, item.priceTier || 'Tier 1');
            const baseProductCost = unitPrice * item.pricing.volume;
            
            breakdowns[item.id] = {
              baseProductCost: baseProductCost,
              logoSetupCosts: [],
              accessoriesCosts: [],
              closureCosts: [],
              deliveryCosts: [],
              totalCost: baseProductCost,
              totalUnits: item.pricing.volume || 1
            };
          }
        } catch (error) {
          console.error('Error calculating costs for item:', item.id, error);
          // Use consistent fallback pricing calculation
          const { calculateUnitPrice } = await import('@/lib/pricing');
          const unitPrice = calculateUnitPrice(item.pricing.volume, item.priceTier || 'Tier 1');
          const baseProductCost = unitPrice * item.pricing.volume;
          
          breakdowns[item.id] = {
            baseProductCost: baseProductCost,
            logoSetupCosts: [],
            accessoriesCosts: [],
            closureCosts: [],
            deliveryCosts: [],
            totalCost: baseProductCost,
            totalUnits: item.pricing.volume || 1
          };
        }
      }
      
      setItemCostBreakdowns(breakdowns);
    };

    // Add a small delay to ensure cart is properly loaded first
    const timeoutId = setTimeout(() => {
      if (cart.items.length > 0) {
        loadOrCalculateCostBreakdowns();
      }
    }, 200);

    return () => clearTimeout(timeoutId);
  }, [cartItemsHash, isReorderCheckout]); // Add isReorderCheckout as dependency

  const hasAllBreakdowns = useMemo(() => (
    cart.items.length > 0 && cart.items.every((item) => itemCostBreakdowns[item.id])
  ), [cartItemsHash, itemCostBreakdowns]);

  const subtotal = useMemo(() => {
    return getDisplayTotal(cart.items, itemCostBreakdowns);
  }, [cart.items, itemCostBreakdowns]);

  const additionalCosts = useMemo(() => {
    if (hasAllBreakdowns) return 0; // Already included in breakdown totalCost
    return Object.values(itemCostBreakdowns).reduce((sum: number, breakdown: any) => {
      if (!breakdown) return sum;
      return sum +
        (breakdown.logoSetupCosts?.reduce((logoSum: number, cost: any) => logoSum + cost.cost, 0) || 0) +
        (breakdown.accessoriesCosts?.reduce((accSum: number, cost: any) => accSum + cost.cost, 0) || 0) +
        (breakdown.closureCosts?.reduce((servSum: number, cost: any) => servSum + cost.cost, 0) || 0) +
        (breakdown.premiumFabricCosts?.reduce((fabricSum: number, cost: any) => fabricSum + cost.cost, 0) || 0) +
        (breakdown.deliveryCosts?.reduce((delSum: number, cost: any) => delSum + cost.cost, 0) || 0);
    }, 0);
  }, [hasAllBreakdowns, itemCostBreakdowns]);

  // Consistent total calculation to match cart page logic
  const shipping = useMemo(() => {
    // Only add shipping if we don't have delivery costs in breakdowns
    if (hasAllBreakdowns) {
      const hasDeliveryCosts = Object.values(itemCostBreakdowns).some(
        (b: any) => b.deliveryCosts && b.deliveryCosts.length > 0
      );
      return hasDeliveryCosts ? 0 : 15;
    }
    return 15;
  }, [hasAllBreakdowns, itemCostBreakdowns]);
  
  const total = useMemo(() => {
    // Use consistent calculation: if we have all breakdowns, use those totals
    // Otherwise add additional costs and shipping to subtotal
    if (hasAllBreakdowns) {
      return calculateGrandTotal(itemCostBreakdowns);
    }
    return subtotal + additionalCosts + shipping;
  }, [hasAllBreakdowns, itemCostBreakdowns, subtotal, additionalCosts, shipping]);

  // Clear errors when user starts typing
  const handleInputChange = useCallback((fieldName: string) => {
    setErrors(prev => {
      if (prev[fieldName]) {
        return { ...prev, [fieldName]: '' };
      }
      return prev;
    });
  }, []);

  // Get form data from refs
  const getFormDataFromRefs = useCallback(() => {
    const data: Partial<CheckoutForm> = {};
    Object.entries(formRefs.current).forEach(([name, ref]) => {
      if (ref) {
        if (ref.type === 'checkbox') {
          data[name as keyof CheckoutForm] = (ref as HTMLInputElement).checked as any;
        } else {
          data[name as keyof CheckoutForm] = ref.value as any;
        }
      }
    });
    return data as CheckoutForm;
  }, []);

  const validateStep = (step: number) => {
    const currentFormData = getFormDataFromRefs();
    const newErrors: Record<string, string> = {};

    if (step === 1) {
      // Validate shipping information
      if (!currentFormData.firstName?.trim()) newErrors.firstName = 'First name is required';
      if (!currentFormData.lastName?.trim()) newErrors.lastName = 'Last name is required';
      if (!currentFormData.email) newErrors.email = 'Email is required';
      else if (!/\S+@\S+\.\S+/.test(currentFormData.email)) newErrors.email = 'Email is invalid';
      if (!currentFormData.phone?.trim()) newErrors.phone = 'Phone number is required';
      if (!currentFormData.address?.trim()) newErrors.address = 'Address is required';
      if (!currentFormData.city?.trim()) newErrors.city = 'City is required';
      if (!currentFormData.state?.trim()) newErrors.state = 'State is required';
      if (!currentFormData.zipCode?.trim()) newErrors.zipCode = 'ZIP code is required';
    }

    if (step === 2) {
      // Validate payment information
      if (!currentFormData.cardNumber?.trim()) newErrors.cardNumber = 'Card number is required';
      else if (currentFormData.cardNumber.replace(/\s/g, '').length < 13) newErrors.cardNumber = 'Invalid card number';
      if (!currentFormData.cardName?.trim()) newErrors.cardName = 'Cardholder name is required';
      if (!currentFormData.expiryDate?.trim()) newErrors.expiryDate = 'Expiry date is required';
      if (!currentFormData.cvv?.trim()) newErrors.cvv = 'CVV is required';
      else if (currentFormData.cvv.length < 3) newErrors.cvv = 'Invalid CVV';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = async () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => prev + 1);
    }
  };


  const handleBack = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateStep(currentStep)) return;

    // Prevent double submission
    if (isProcessing) {
      console.log('⚠️ Order submission already in progress, ignoring duplicate call');
      return;
    }

    console.log('🚀 Starting order submission...');
    setIsProcessing(true);
    
    try {
      const currentFormData = getFormDataFromRefs();
      
      // Create a single consolidated order for all cart items
      const firstItem = cart.items[0]; // Use first item as primary product
      const allCostBreakdowns = cart.items.map(item => itemCostBreakdowns[item.id]).filter(Boolean);
      
      // Consolidate all uploaded logo files from cart items
      const allUploadedLogoFiles = cart.items.flatMap(item => item.uploadedLogoFiles || []);
      console.log('📁 Consolidated uploaded logo files:', allUploadedLogoFiles.length, 'files');

      // Consolidate shipment data - use shipment if all items have the same one
      const cartShipments = cart.items.map(item => item.shipmentId).filter(Boolean);
      const uniqueShipments = [...new Set(cartShipments)];
      const consolidatedShipmentId = uniqueShipments.length === 1 && cartShipments.length === cart.items.length ? uniqueShipments[0] : null;
      console.log('🚢 Shipment consolidation:', { 
        totalItems: cart.items.length, 
        itemsWithShipment: cartShipments.length, 
        uniqueShipments: uniqueShipments.length,
        consolidatedShipmentId 
      });

      // Consolidate all cart items into a single order
      const consolidatedOrderData = {
        productName: cart.items.length === 1 ? firstItem.productName : `Custom Order (${cart.items.length} items)`,
        selectedColors: cart.items.reduce((acc, item) => ({ ...acc, ...item.selectedColors }), {}),
        logoSetupSelections: cart.items.reduce((acc, item) => ({ ...acc, ...item.logoSetupSelections }), {}),
        selectedOptions: cart.items.reduce((acc, item) => ({ ...acc, ...item.selectedOptions }), {}),
        multiSelectOptions: cart.items.reduce((acc, item) => ({ ...acc, ...item.multiSelectOptions }), {}),
        tempLogoFiles: allUploadedLogoFiles, // Add uploaded logo files for processing
        additionalInstructions: cart.items.map(item => item.additionalInstructions).filter(Boolean).join(' | '), // Consolidate additional instructions
        costBreakdown: allCostBreakdowns.length > 0 ? {
          baseProductCost: allCostBreakdowns.reduce((sum, breakdown) => sum + (breakdown.baseProductCost || 0), 0),
          logoSetupCosts: allCostBreakdowns.flatMap(breakdown => breakdown.logoSetupCosts || []),
          accessoriesCosts: allCostBreakdowns.flatMap(breakdown => breakdown.accessoriesCosts || []),
          closureCosts: allCostBreakdowns.flatMap(breakdown => breakdown.closureCosts || []),
          premiumFabricCosts: allCostBreakdowns.flatMap(breakdown => breakdown.premiumFabricCosts || []),
          deliveryCosts: allCostBreakdowns.flatMap(breakdown => breakdown.deliveryCosts || []),
          totalCost: total,
          totalUnits: allCostBreakdowns.reduce((sum, breakdown) => sum + (breakdown.totalUnits || 0), 0)
        } : {
          baseProductCost: subtotal,
          logoSetupCosts: [],
          accessoriesCosts: [],
          closureCosts: [],
          premiumFabricCosts: [],
          deliveryCosts: [],
          totalCost: total,
          totalUnits: cart.items.reduce((sum, item) => sum + (item.pricing.volume || 1), 0)
        },
        customerInfo: {
          name: `${currentFormData.firstName} ${currentFormData.lastName}`,
          email: currentFormData.email,
          phone: currentFormData.phone,
          company: currentFormData.company,
          address: {
            street: currentFormData.address,
            city: currentFormData.city,
            state: currentFormData.state,
            zipCode: currentFormData.zipCode,
            country: currentFormData.country
          }
        },
        userId: isAuthenticated && user ? user.id : null,
        userEmail: isAuthenticated && user ? user.email : currentFormData.email,
        orderType: isAuthenticated ? 'AUTHENTICATED' : 'GUEST',
        specialInstructions: currentFormData.specialInstructions,
        paymentInfo: {
          cardLast4: currentFormData.cardNumber?.slice(-4) || '',
          cardName: currentFormData.cardName,
        },
        orderTotal: total,
        itemTotal: subtotal,
        status: 'CONFIRMED', // Mark as confirmed order
        isDraft: false, // Final order, not a draft
        orderSource: (isReorderCheckout ? 'REORDER' : 'PRODUCT_CUSTOMIZATION'),
        paymentProcessed: true, // Indicate payment was processed
        processedAt: new Date().toISOString(),
        // Include shipment assignment if all items have the same shipment
        shipmentId: consolidatedShipmentId,
        // Add cart items details for reference
        cartItems: cart.items.map(item => ({
          id: item.id,
          productName: item.productName,
          selectedColors: item.selectedColors,
          logoSetupSelections: item.logoSetupSelections,
          selectedOptions: item.selectedOptions,
          multiSelectOptions: item.multiSelectOptions,
          pricing: item.pricing,
          shipmentId: item.shipmentId,
          shipment: item.shipment
        }))
      };

      // Generate unique idempotency key to prevent duplicate orders
      const idempotencyKey = `checkout_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      console.log('📝 Submitting order with idempotency key:', idempotencyKey);

      // Submit single consolidated order
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey
        },
        body: JSON.stringify({
          ...consolidatedOrderData,
          idempotencyKey
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit order');
      }

      const orderResult = await response.json();
      
      console.log('✅ Consolidated order placed successfully:', orderResult);
      
      // Set flag to prevent cart redirect after clearing
      setOrderSubmittedSuccessfully(true);
      
      // Clear cart after successful order
      clearCart();
      
      // Redirect to success page with single order ID
      router.push(`/checkout/success?orders=${orderResult.orderId}&total=${total.toFixed(2)}`);
      
    } catch (error) {
      console.error('Checkout failed:', error);
      setErrors({ general: 'Order submission failed. Please try again.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const formatCardNumber = useCallback((value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(' ');
    } else {
      return v;
    }
  }, []);

  const handleCardNumberChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCardNumber(e.target.value);
    e.target.value = formatted;
    handleInputChange('cardNumber');
  }, [formatCardNumber, handleInputChange]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  if (cart.items.length === 0) {
    return (
      <div className="relative min-h-screen overflow-x-hidden text-slate-200">
        {/* Background: dark gradient + accent glows */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-[linear-gradient(180deg,#000,rgba(5,7,14,1)_40%,#000)]" />
          <div className="absolute inset-x-0 top-0 h-[40vh] bg-[radial-gradient(60%_30%_at_50%_0%,rgba(255,255,255,0.06),transparent)]" />
          <div className="absolute -top-10 -left-20 h-80 w-80 rounded-full bg-lime-400/10 blur-3xl" />
          <div className="absolute top-40 -right-24 h-96 w-96 rounded-full bg-orange-400/10 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 h-96 w-96 -translate-x-1/2 rounded-full bg-purple-500/10 blur-3xl" />
        </div>

        <main className="mx-auto max-w-[1800px] px-6 md:px-10 pt-16 md:pt-24 lg:pt-28 pb-24">
          <div className="mx-auto max-w-xl text-center">
            <div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-full border border-white/10 bg-white/5 backdrop-blur-xl ring-1 ring-white/5">
              <svg className="h-10 w-10 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-1.1 5H19M7 13v8a2 2 0 002 2h6a2 2 0 002-2v-8m-8 0V9a2 2 0 012-2h4a2 2 0 012 2v4.01" />
              </svg>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-white">Your cart is empty</h1>
            <p className="mt-3 text-slate-300">Add some items to your cart before proceeding to checkout.</p>
            <div className="mt-8">
              <Link 
                href="/store" 
                className="inline-flex items-center gap-2 rounded-full bg-lime-400 px-6 py-3 font-semibold text-black shadow-[0_0_30px_rgba(163,230,53,0.25)] transition-transform hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-400/60"
              >
                Continue Shopping
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // --- UI helpers ---
  const GlassCard: React.FC<React.PropsWithChildren<{ className?: string }>> = ({ className = '', children }) => (
    <div className={`rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl ring-1 ring-white/5 ${className}`}>
      {children}
    </div>
  );

  const SectionTitle: React.FC<React.PropsWithChildren<{ icon?: string; accent?: string }>> = ({ icon = '🧩', accent = 'text-slate-200', children }) => (
    <div className="flex items-center gap-2 mb-4">
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-black/40 text-sm" aria-hidden>{icon}</span>
      <h4 className={`text-base font-semibold ${accent}`}>{children}</h4>
    </div>
  );

  return (
    <div className="relative min-h-screen overflow-x-hidden text-slate-200">
      {/* Background: dark gradient + accent glows */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#000,rgba(5,7,14,1)_40%,#000)]" />
        <div className="absolute inset-x-0 top-0 h-[40vh] bg-[radial-gradient(60%_30%_at_50%_0%,rgba(255,255,255,0.06),transparent)]" />
        <div className="absolute -top-10 -left-20 h-80 w-80 rounded-full bg-lime-400/10 blur-3xl" />
        <div className="absolute top-40 -right-24 h-96 w-96 rounded-full bg-orange-400/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-96 w-96 -translate-x-1/2 rounded-full bg-purple-500/10 blur-3xl" />
      </div>

      <main className="mx-auto max-w-[1800px] px-6 md:px-10 pt-16 md:pt-24 lg:pt-28 pb-10 md:pb-14">
        {/* Sticky page heading */}
        <div className="sticky top-16 z-10 mb-8 md:mb-10">
          <GlassCard className="px-5 py-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <Link href="/cart" className="text-lime-400 hover:text-lime-300 font-medium transition-colors duration-200 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back to Cart
                </Link>
                <h1 className="mt-2 text-2xl md:text-3xl font-bold text-white">Checkout</h1>
                <p className="mt-1 text-sm md:text-base text-slate-300">{getItemCount()} items in your order</p>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <GlassCard className="px-6 py-4">
            <div className="flex items-center justify-center">
              {[1, 2, 3].map((step) => (
                <div key={step} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium border-2 transition-all duration-300 ${
                    currentStep >= step 
                      ? 'bg-lime-400 text-black border-lime-400 shadow-[0_0_20px_rgba(163,230,53,0.3)]' 
                      : 'bg-white/10 text-slate-300 border-white/20'
                  }`}>
                    {step}
                  </div>
                  {step < 3 && (
                    <div className={`w-16 h-1 mx-2 rounded-full transition-all duration-300 ${
                      currentStep > step ? 'bg-lime-400' : 'bg-white/20'
                    }`} />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-center mt-4 text-sm">
              <span className={`transition-colors duration-300 ${currentStep >= 1 ? 'text-lime-400 font-medium' : 'text-slate-300'}`}>Shipping</span>
              <span className="mx-4 text-slate-400">→</span>
              <span className={`transition-colors duration-300 ${currentStep >= 2 ? 'text-lime-400 font-medium' : 'text-slate-300'}`}>Payment</span>
              <span className="mx-4 text-slate-400">→</span>
              <span className={`transition-colors duration-300 ${currentStep >= 3 ? 'text-lime-400 font-medium' : 'text-slate-300'}`}>Review</span>
            </div>
          </GlassCard>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Checkout Form */}
          <div className="lg:col-span-2">
            <GlassCard className="p-4 md:p-6 lg:p-8">
              <form onSubmit={handleSubmit}>
                {/* Step 1: Shipping Information */}
                {currentStep === 1 && (
                  <div className="space-y-8">
                    <SectionTitle icon="📦" accent="text-lime-300">Shipping Information</SectionTitle>
                    
                    {isAuthenticated && user && (
                      <div className="rounded-xl border border-lime-400/20 bg-lime-400/10 p-4 ring-1 ring-lime-400/10">
                        <div className="flex items-center space-x-2">
                          <div className="w-5 h-5 bg-lime-400 rounded-full flex items-center justify-center">
                            <span className="text-black text-xs">✓</span>
                          </div>
                          <span className="text-sm font-medium text-lime-200">
                            Signed in as {user.email} - Some fields have been pre-filled
                          </span>
                        </div>
                      </div>
                    )}

                    {errors.general && (
                      <div className="rounded-xl border border-red-400/30 bg-red-400/10 p-4 ring-1 ring-red-400/20">
                        <div className="flex items-center space-x-2">
                          <div className="w-5 h-5 bg-red-400 rounded-full flex items-center justify-center">
                            <span className="text-white text-xs">!</span>
                          </div>
                          <span className="text-sm font-medium text-red-300">
                            {errors.general}
                          </span>
                        </div>
                      </div>
                    )}
                    
                    <div className="rounded-xl border border-white/10 bg-white/5 p-4 md:p-6 ring-1 ring-white/5">
                      <div key="shipping-form-grid" className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div key="firstName">
                          <label htmlFor="firstName" className="block text-sm font-medium text-slate-200 mb-2">
                            First Name *
                          </label>
                          <input
                            type="text"
                            id="firstName"
                            name="firstName"
                            ref={(el) => {
                              if (el) formRefs.current.firstName = el;
                            }}
                            defaultValue={formData.firstName}
                            onChange={() => handleInputChange('firstName')}
                            autoComplete="given-name"
                            className={errors.firstName 
                              ? 'w-full rounded-lg border border-red-400/60 bg-black/40 px-3 py-2.5 text-white outline-none ring-0 transition focus:border-red-300/60 focus:ring-2 focus:ring-red-400/50' 
                              : 'w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2.5 text-white outline-none ring-0 transition focus:border-lime-300/60 focus:ring-2 focus:ring-lime-400/50'
                            }
                          />
                          {errors.firstName && <p className="mt-1 text-sm text-red-300">{errors.firstName}</p>}
                        </div>

                        <div key="lastName">
                          <label htmlFor="lastName" className="block text-sm font-medium text-slate-200 mb-2">
                            Last Name *
                          </label>
                          <input
                            type="text"
                            id="lastName"
                            name="lastName"
                            ref={(el) => {
                              if (el) formRefs.current.lastName = el;
                            }}
                            defaultValue={formData.lastName}
                            onChange={() => handleInputChange('lastName')}
                            autoComplete="family-name"
                            className={errors.lastName 
                              ? 'w-full rounded-lg border border-red-400/60 bg-black/40 px-3 py-2.5 text-white outline-none ring-0 transition focus:border-red-300/60 focus:ring-2 focus:ring-red-400/50' 
                              : 'w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2.5 text-white outline-none ring-0 transition focus:border-lime-300/60 focus:ring-2 focus:ring-lime-400/50'
                            }
                          />
                          {errors.lastName && <p className="mt-1 text-sm text-red-300">{errors.lastName}</p>}
                        </div>

                        <div key="email">
                          <label htmlFor="email" className="block text-sm font-medium text-slate-200 mb-2">
                            Email *
                          </label>
                          <input
                            type="email"
                            id="email"
                            name="email"
                            ref={(el) => {
                              if (el) formRefs.current.email = el;
                            }}
                            defaultValue={formData.email}
                            onChange={() => handleInputChange('email')}
                            autoComplete="email"
                            className={errors.email 
                              ? 'w-full rounded-lg border border-red-400/60 bg-black/40 px-3 py-2.5 text-white outline-none ring-0 transition focus:border-red-300/60 focus:ring-2 focus:ring-red-400/50' 
                              : 'w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2.5 text-white outline-none ring-0 transition focus:border-lime-300/60 focus:ring-2 focus:ring-lime-400/50'
                            }
                          />
                          {errors.email && <p className="mt-1 text-sm text-red-300">{errors.email}</p>}
                        </div>

                        <div key="phone">
                          <label htmlFor="phone" className="block text-sm font-medium text-slate-200 mb-2">
                            Phone *
                          </label>
                          <input
                            type="tel"
                            id="phone"
                            name="phone"
                            ref={(el) => {
                              if (el) formRefs.current.phone = el;
                            }}
                            defaultValue={formData.phone}
                            onChange={() => handleInputChange('phone')}
                            autoComplete="tel"
                            className={errors.phone 
                              ? 'w-full rounded-lg border border-red-400/60 bg-black/40 px-3 py-2.5 text-white outline-none ring-0 transition focus:border-red-300/60 focus:ring-2 focus:ring-red-400/50' 
                              : 'w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2.5 text-white outline-none ring-0 transition focus:border-lime-300/60 focus:ring-2 focus:ring-lime-400/50'
                            }
                          />
                          {errors.phone && <p className="mt-1 text-sm text-red-300">{errors.phone}</p>}
                        </div>

                        <div key="company" className="md:col-span-2">
                          <label htmlFor="company" className="block text-sm font-medium text-slate-200 mb-2">
                            Company (Optional)
                          </label>
                          <input
                            type="text"
                            id="company"
                            name="company"
                            ref={(el) => {
                              if (el) formRefs.current.company = el;
                            }}
                            defaultValue={formData.company}
                            onChange={() => handleInputChange('company')}
                            autoComplete="organization"
                            className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2.5 text-white outline-none ring-0 transition focus:border-lime-300/60 focus:ring-2 focus:ring-lime-400/50"
                          />
                        </div>

                        <div key="address" className="md:col-span-2">
                          <label htmlFor="address" className="block text-sm font-medium text-slate-200 mb-2">
                            Address *
                          </label>
                          <input
                            type="text"
                            id="address"
                            name="address"
                            ref={(el) => {
                              if (el) formRefs.current.address = el;
                            }}
                            defaultValue={formData.address}
                            onChange={() => handleInputChange('address')}
                            autoComplete="street-address"
                            className={errors.address 
                              ? 'w-full rounded-lg border border-red-400/60 bg-black/40 px-3 py-2.5 text-white outline-none ring-0 transition focus:border-red-300/60 focus:ring-2 focus:ring-red-400/50' 
                              : 'w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2.5 text-white outline-none ring-0 transition focus:border-lime-300/60 focus:ring-2 focus:ring-lime-400/50'
                            }
                          />
                          {errors.address && <p className="mt-1 text-sm text-red-300">{errors.address}</p>}
                        </div>

                        <div key="city">
                          <label htmlFor="city" className="block text-sm font-medium text-slate-200 mb-2">
                            City *
                          </label>
                          <input
                            type="text"
                            id="city"
                            name="city"
                            ref={(el) => {
                              if (el) formRefs.current.city = el;
                            }}
                            defaultValue={formData.city}
                            onChange={() => handleInputChange('city')}
                            autoComplete="address-level2"
                            className={errors.city 
                              ? 'w-full rounded-lg border border-red-400/60 bg-black/40 px-3 py-2.5 text-white outline-none ring-0 transition focus:border-red-300/60 focus:ring-2 focus:ring-red-400/50' 
                              : 'w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2.5 text-white outline-none ring-0 transition focus:border-lime-300/60 focus:ring-2 focus:ring-lime-400/50'
                            }
                          />
                          {errors.city && <p className="mt-1 text-sm text-red-300">{errors.city}</p>}
                        </div>

                        <div key="state">
                          <label htmlFor="state" className="block text-sm font-medium text-slate-200 mb-2">
                            State *
                          </label>
                          <input
                            type="text"
                            id="state"
                            name="state"
                            ref={(el) => {
                              if (el) formRefs.current.state = el;
                            }}
                            defaultValue={formData.state}
                            onChange={() => handleInputChange('state')}
                            autoComplete="address-level1"
                            className={errors.state 
                              ? 'w-full rounded-lg border border-red-400/60 bg-black/40 px-3 py-2.5 text-white outline-none ring-0 transition focus:border-red-300/60 focus:ring-2 focus:ring-red-400/50' 
                              : 'w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2.5 text-white outline-none ring-0 transition focus:border-lime-300/60 focus:ring-2 focus:ring-lime-400/50'
                            }
                          />
                          {errors.state && <p className="mt-1 text-sm text-red-300">{errors.state}</p>}
                        </div>

                        <div key="zipCode">
                          <label htmlFor="zipCode" className="block text-sm font-medium text-slate-200 mb-2">
                            ZIP Code *
                          </label>
                          <input
                            type="text"
                            id="zipCode"
                            name="zipCode"
                            ref={(el) => {
                              if (el) formRefs.current.zipCode = el;
                            }}
                            defaultValue={formData.zipCode}
                            onChange={() => handleInputChange('zipCode')}
                            autoComplete="postal-code"
                            className={errors.zipCode 
                              ? 'w-full rounded-lg border border-red-400/60 bg-black/40 px-3 py-2.5 text-white outline-none ring-0 transition focus:border-red-300/60 focus:ring-2 focus:ring-red-400/50' 
                              : 'w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2.5 text-white outline-none ring-0 transition focus:border-lime-300/60 focus:ring-2 focus:ring-lime-400/50'
                            }
                          />
                          {errors.zipCode && <p className="mt-1 text-sm text-red-300">{errors.zipCode}</p>}
                        </div>

                        <div key="country">
                          <label htmlFor="country" className="block text-sm font-medium text-slate-200 mb-2">
                            Country
                          </label>
                          <select
                            id="country"
                            name="country"
                            ref={(el) => {
                              if (el) formRefs.current.country = el;
                            }}
                            defaultValue={formData.country}
                            onChange={() => handleInputChange('country')}
                            autoComplete="country"
                            className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2.5 text-white outline-none ring-0 transition focus:border-lime-300/60 focus:ring-2 focus:ring-lime-400/50"
                          >
                            <option value="United States">United States</option>
                            <option value="Canada">Canada</option>
                            <option value="United Kingdom">United Kingdom</option>
                          </select>
                        </div>

                        <div key="specialInstructions" className="md:col-span-2">
                          <label htmlFor="specialInstructions" className="block text-sm font-medium text-slate-200 mb-2">
                            Special Instructions (Optional)
                          </label>
                          <textarea
                            id="specialInstructions"
                            name="specialInstructions"
                            ref={(el) => {
                              if (el) formRefs.current.specialInstructions = el;
                            }}
                            defaultValue={formData.specialInstructions}
                            onChange={() => handleInputChange('specialInstructions')}
                            rows={3}
                            className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2.5 text-white outline-none ring-0 transition focus:border-lime-300/60 focus:ring-2 focus:ring-lime-400/50"
                            placeholder="Any special delivery or customization instructions..."
                          />
                        </div>
                      </div>
                    </div>

                    <div className="mt-8">
                      <button
                        type="button"
                        onClick={handleNext}
                        className="w-full rounded-full bg-lime-400 px-6 py-3 font-semibold text-black shadow-[0_0_30px_rgba(163,230,53,0.25)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_0_40px_rgba(163,230,53,0.4)] focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-400/60"
                      >
                        Continue to Payment
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 2: Payment Information */}
                {currentStep === 2 && (
                  <div className="space-y-8">
                    <SectionTitle icon="💳" accent="text-orange-300">Payment Information</SectionTitle>
                    
                    <div className="rounded-xl border border-yellow-400/20 bg-yellow-400/10 p-4 ring-1 ring-yellow-400/10">
                      <div className="flex items-center space-x-2">
                        <div className="w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center">
                          <span className="text-black text-xs">!</span>
                        </div>
                        <span className="text-sm font-medium text-yellow-200">
                          Demo Mode: Payment processing is simulated. No actual charges will be made.
                        </span>
                      </div>
                    </div>
                    
                    <div className="rounded-xl border border-white/10 bg-white/5 p-4 md:p-6 ring-1 ring-white/5">
                      <div className="space-y-6">
                        <div>
                          <label htmlFor="cardNumber" className="block text-sm font-medium text-slate-200 mb-2">
                            Card Number *
                          </label>
                          <input
                            type="text"
                            id="cardNumber"
                            name="cardNumber"
                            ref={(el) => {
                              if (el) formRefs.current.cardNumber = el;
                            }}
                            defaultValue={formData.cardNumber}
                            onChange={handleCardNumberChange}
                            placeholder="1234 5678 9012 3456"
                            maxLength={19}
                            autoComplete="cc-number"
                            className={`w-full rounded-lg border bg-black/40 px-3 py-2.5 text-white outline-none ring-0 transition focus:ring-2 placeholder:text-slate-400 ${
                              errors.cardNumber 
                                ? 'border-red-400/60 focus:border-red-300/60 focus:ring-red-400/50' 
                                : 'border-white/10 focus:border-lime-300/60 focus:ring-lime-400/50'
                            }`}
                          />
                          {errors.cardNumber && <p className="mt-1 text-sm text-red-300">{errors.cardNumber}</p>}
                        </div>

                        <div>
                          <label htmlFor="cardName" className="block text-sm font-medium text-slate-200 mb-2">
                            Cardholder Name *
                          </label>
                          <input
                            type="text"
                            id="cardName"
                            name="cardName"
                            ref={(el) => {
                              if (el) formRefs.current.cardName = el;
                            }}
                            defaultValue={formData.cardName}
                            onChange={() => handleInputChange('cardName')}
                            autoComplete="cc-name"
                            className={`w-full rounded-lg border bg-black/40 px-3 py-2.5 text-white outline-none ring-0 transition focus:ring-2 ${
                              errors.cardName 
                                ? 'border-red-400/60 focus:border-red-300/60 focus:ring-red-400/50' 
                                : 'border-white/10 focus:border-lime-300/60 focus:ring-lime-400/50'
                            }`}
                          />
                          {errors.cardName && <p className="mt-1 text-sm text-red-300">{errors.cardName}</p>}
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                          <div>
                            <label htmlFor="expiryDate" className="block text-sm font-medium text-slate-200 mb-2">
                              Expiry Date *
                            </label>
                            <input
                              type="text"
                              id="expiryDate"
                              name="expiryDate"
                              ref={(el) => {
                                if (el) formRefs.current.expiryDate = el;
                              }}
                              defaultValue={formData.expiryDate}
                              onChange={() => handleInputChange('expiryDate')}
                              placeholder="MM/YY"
                              maxLength={5}
                              autoComplete="cc-exp"
                              className={`w-full rounded-lg border bg-black/40 px-3 py-2.5 text-white outline-none ring-0 transition focus:ring-2 placeholder:text-slate-400 ${
                                errors.expiryDate 
                                  ? 'border-red-400/60 focus:border-red-300/60 focus:ring-red-400/50' 
                                  : 'border-white/10 focus:border-lime-300/60 focus:ring-lime-400/50'
                              }`}
                            />
                            {errors.expiryDate && <p className="mt-1 text-sm text-red-300">{errors.expiryDate}</p>}
                          </div>

                          <div>
                            <label htmlFor="cvv" className="block text-sm font-medium text-slate-200 mb-2">
                              CVV *
                            </label>
                            <input
                              type="text"
                              id="cvv"
                              name="cvv"
                              ref={(el) => {
                                if (el) formRefs.current.cvv = el;
                              }}
                              defaultValue={formData.cvv}
                              onChange={() => handleInputChange('cvv')}
                              placeholder="123"
                              maxLength={4}
                              autoComplete="cc-csc"
                              className={`w-full rounded-lg border bg-black/40 px-3 py-2.5 text-white outline-none ring-0 transition focus:ring-2 placeholder:text-slate-400 ${
                                errors.cvv 
                                  ? 'border-red-400/60 focus:border-red-300/60 focus:ring-red-400/50' 
                                  : 'border-white/10 focus:border-lime-300/60 focus:ring-lime-400/50'
                              }`}
                            />
                            {errors.cvv && <p className="mt-1 text-sm text-red-300">{errors.cvv}</p>}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-8 flex space-x-4">
                      <button
                        type="button"
                        onClick={handleBack}
                        className="flex-1 rounded-full border border-white/10 bg-white/5 px-6 py-3 font-medium text-white transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-400/60"
                      >
                        Back
                      </button>
                      <button
                        type="button"
                        onClick={handleNext}
                        className="flex-1 rounded-full bg-lime-400 px-6 py-3 font-semibold text-black shadow-[0_0_30px_rgba(163,230,53,0.25)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_0_40px_rgba(163,230,53,0.4)] focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-400/60"
                      >
                        Continue to Review
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 3: Order Review */}
                {currentStep === 3 && (() => {
                  const reviewFormData = getFormDataFromRefs();
                  return (
                    <div className="space-y-8">
                      <SectionTitle icon="📋" accent="text-lime-300">Review Your Order</SectionTitle>
                      
                      <div className="space-y-6">
                        {/* Shipping Information */}
                        <div className="rounded-xl border border-white/10 bg-white/5 p-4 md:p-6 ring-1 ring-white/5">
                          <SectionTitle icon="📦" accent="text-cyan-200">Shipping Information</SectionTitle>
                          <div className="rounded-lg border border-white/10 bg-black/30 p-4">
                            <p className="text-sm font-medium text-white">
                              {reviewFormData.firstName} {reviewFormData.lastName}
                            </p>
                            <p className="text-sm text-slate-300">{reviewFormData.email}</p>
                            <p className="text-sm text-slate-300">{reviewFormData.phone}</p>
                            {reviewFormData.company && (
                              <p className="text-sm text-slate-300">{reviewFormData.company}</p>
                            )}
                            <p className="text-sm text-slate-300">
                              {reviewFormData.address}, {reviewFormData.city}, {reviewFormData.state} {reviewFormData.zipCode}
                            </p>
                            <p className="text-sm text-slate-300">{reviewFormData.country}</p>
                            {reviewFormData.specialInstructions && (
                              <div className="mt-3 pt-3 border-t border-white/10">
                                <p className="text-xs text-slate-400">Special Instructions:</p>
                                <p className="text-sm text-slate-300">{reviewFormData.specialInstructions}</p>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Order Items */}
                      <div className="rounded-xl border border-white/10 bg-white/5 p-4 md:p-6 ring-1 ring-white/5">
                        <SectionTitle icon="🛍️" accent="text-lime-300">Order Items</SectionTitle>
                        <div className="space-y-4">
                          {cart.items.map((item) => {
                            const breakdown = itemCostBreakdowns[item.id];
                            const itemTotal = breakdown?.totalCost || item.pricing.totalPrice;
                            
                            return (
                              <div key={item.id} className="rounded-lg border border-white/10 bg-black/30 p-4">
                                <div className="flex justify-between items-start mb-3">
                                  <div className="flex-1">
                                    <h4 className="font-medium text-white">{item.productName}</h4>
                                    <p className="text-sm text-slate-300">
                                      Quantity: {item.pricing.volume} units
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <p className="font-semibold text-lime-300">{formatPrice(itemTotal)}</p>
                                  </div>
                                </div>
                                
                                {/* Color Summary */}
                                <div className="text-xs text-slate-400 space-y-1">
                                  <p><span className="font-medium text-slate-300">Colors:</span> {Object.keys(item.selectedColors).join(', ')}</p>
                                  {Object.keys(item.selectedOptions).length > 0 && (
                                    <p><span className="font-medium text-slate-300">Options:</span> {Object.values(item.selectedOptions).join(', ')}</p>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      </div>
                    </div>
                  );
                })()}

                {currentStep === 3 && (
                  <div className="mt-8 flex space-x-4">
                      <button
                        type="button"
                        onClick={handleBack}
                        className="flex-1 rounded-full border border-white/10 bg-white/5 px-6 py-3 font-medium text-white transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-400/60"
                      >
                        Back
                      </button>
                      <button
                        type="submit"
                        disabled={isProcessing}
                        className="flex-1 rounded-full bg-lime-400 px-6 py-3 font-semibold text-black shadow-[0_0_30px_rgba(163,230,53,0.25)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_0_40px_rgba(163,230,53,0.4)] focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-400/60 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isProcessing ? (
                          <div className="flex items-center justify-center">
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Processing Order...
                          </div>
                        ) : (
                          `Place Order - ${formatPrice(total)}`
                        )}
                      </button>
                    </div>
                )}
              </form>
            </GlassCard>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <GlassCard className="p-5 md:p-6">
                <h2 className="mb-5 text-lg md:text-xl font-bold text-white">Order Summary</h2>
                <div className="space-y-5">
                  <div className="rounded-lg border border-white/10 bg-black/30 p-4">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-sm font-bold text-white">{cart.items.length}</div>
                      <div>
                        <h3 className="text-base font-semibold text-white">Cart Summary</h3>
                        <p className="text-xs text-slate-300">{getItemCount()} total units</p>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      {cart.items.map((item) => {
                        const breakdown = itemCostBreakdowns[item.id];
                        const itemTotal = breakdown?.totalCost || item.pricing.totalPrice;
                        
                        return (
                          <div key={item.id} className="border-b border-white/10 pb-4 last:border-b-0 last:pb-0">
                            <div className="flex justify-between text-sm">
                              <div className="flex-1 pr-2">
                                <p className="text-white font-medium">{item.productName}</p>
                                <p className="text-slate-300">Qty: {item.pricing.volume}</p>
                                <p className="text-xs text-slate-400">
                                  {Object.keys(item.selectedColors).join(', ')}
                                </p>
                              </div>
                              <p className="text-lime-300 font-semibold">{formatPrice(itemTotal)}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                
                  {/* Totals */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between rounded-lg bg-transparent p-2">
                      <span className="text-sm text-slate-300">Base Products</span>
                      <span className="text-sm font-semibold text-white">{formatPrice(hasAllBreakdowns ? cart.items.reduce((sum, item) => sum + (itemCostBreakdowns[item.id]?.baseProductCost || 0), 0) : subtotal)}</span>
                    </div>

                    {hasAllBreakdowns && Object.keys(itemCostBreakdowns).length > 0 && (
                      <>
                        {Object.values(itemCostBreakdowns).some((b) => b.logoSetupCosts?.length > 0) && (
                          <div className="flex items-center justify-between rounded-lg p-2">
                            <span className="text-sm text-slate-300">Logo Setup</span>
                            <span className="text-sm font-semibold text-white">
                              {formatPrice(
                                Object.values(itemCostBreakdowns).reduce((sum, b) => sum + (b.logoSetupCosts?.reduce((s, c) => s + c.cost, 0) || 0), 0)
                              )}
                            </span>
                          </div>
                        )}
                        {Object.values(itemCostBreakdowns).some((b) => b.accessoriesCosts?.length > 0) && (
                          <div className="flex items-center justify-between rounded-lg p-2">
                            <span className="text-sm text-slate-300">Accessories</span>
                            <span className="text-sm font-semibold text-white">
                              {formatPrice(
                                Object.values(itemCostBreakdowns).reduce((sum, b) => sum + (b.accessoriesCosts?.reduce((s, c) => s + c.cost, 0) || 0), 0)
                              )}
                            </span>
                          </div>
                        )}
                        {Object.values(itemCostBreakdowns).some((b) => b.premiumFabricCosts?.length > 0) && (
                          <div className="flex items-center justify-between rounded-lg p-2">
                            <span className="text-sm text-slate-300">Premium Fabric</span>
                            <span className="text-sm font-semibold text-white">
                              {formatPrice(
                                Object.values(itemCostBreakdowns).reduce((sum, b) => sum + (b.premiumFabricCosts?.reduce((s, c) => s + c.cost, 0) || 0), 0)
                              )}
                            </span>
                          </div>
                        )}
                        {Object.values(itemCostBreakdowns).some((b) => b.deliveryCosts?.length > 0) && (
                          <div className="flex items-center justify-between rounded-lg p-2">
                            <span className="text-sm text-slate-300">Delivery</span>
                            <span className="text-sm font-semibold text-white">
                              {formatPrice(
                                Object.values(itemCostBreakdowns).reduce((sum, b) => sum + (b.deliveryCosts?.reduce((s, c) => s + c.cost, 0) || 0), 0)
                              )}
                            </span>
                          </div>
                        )}
                        {Object.values(itemCostBreakdowns).some((b) => b.closureCosts?.length > 0) && (
                          <div className="flex items-center justify-between rounded-lg p-2">
                            <span className="text-sm text-slate-300">Services</span>
                            <span className="text-sm font-semibold text-white">
                              {formatPrice(
                                Object.values(itemCostBreakdowns).reduce((sum, b) => sum + (b.closureCosts?.reduce((s, c) => s + c.cost, 0) || 0), 0)
                              )}
                            </span>
                          </div>
                        )}
                      </>
                    )}

                    {!hasAllBreakdowns && additionalCosts > 0 && (
                      <div className="flex items-center justify-between rounded-lg p-2">
                        <span className="text-sm text-slate-300">Customizations</span>
                        <span className="text-sm font-semibold text-white">{formatPrice(additionalCosts)}</span>
                      </div>
                    )}

                    {(!hasAllBreakdowns || !Object.values(itemCostBreakdowns).some((b) => b.deliveryCosts?.length > 0)) && shipping > 0 && (
                      <div className="flex items-center justify-between rounded-lg p-2">
                        <span className="text-sm text-slate-300">Shipping</span>
                        <span className="text-sm font-semibold text-white">{formatPrice(shipping)}</span>
                      </div>
                    )}
                  </div>

                  {/* Grand Total */}
                  <div className="border-t border-white/10 pt-4">
                    <div className="flex items-baseline justify-between">
                      <div>
                        <span className="text-lg md:text-xl font-bold text-white">Total</span>
                        <p className="text-xs text-slate-400">
                          {hasAllBreakdowns && Object.keys(itemCostBreakdowns).length > 0 ? 'Including all additional costs' : 'Base products only'}
                        </p>
                      </div>
                      <span className="text-2xl md:text-3xl font-extrabold text-lime-300">
                        {formatPrice(total)}
                      </span>
                    </div>
                  </div>
                </div>
              </GlassCard>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}