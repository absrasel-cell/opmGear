'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useCart } from '@/components/cart/CartContext';
import { useAuth } from '@/components/auth/AuthContext';
import CustomerInfoForm from '@/components/forms/CustomerInfoForm';
import { useRouter } from 'next/navigation';

interface CostBreakdown {
  baseProductCost: number;
  logoSetupCosts: Array<{
    name: string;
    cost: number;
    unitPrice: number;
    details: string;
  }>;
  accessoriesCosts: Array<{
    name: string;
    cost: number;
    unitPrice: number;
  }>;
  closureCosts: Array<{
    name: string;
    cost: number;
    unitPrice: number;
  }>;
  deliveryCosts: Array<{
  name: string;
    cost: number;
    unitPrice: number;
  }>;
  totalCost: number;
  totalUnits: number;
}

export default function CartPage() {
  const { cart, removeFromCart, updateQuantity, clearCart, getCartTotal, getItemCount, debugClearLocalStorage } = useCart();
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();

  const [itemCostBreakdowns, setItemCostBreakdowns] = useState<Record<string, CostBreakdown>>({});
  const [isCalculatingCosts, setIsCalculatingCosts] = useState(false);
  
  // Refs to track input elements for validation styling
  const inputRefs = useRef<Record<string, HTMLInputElement>>({});
  
  // State to track if there are pending changes
  const [hasPendingChanges, setHasPendingChanges] = useState(false);
  
  // Handle input changes to detect modifications
  const handleInputChange = useCallback(() => {
    setHasPendingChanges(true);
  }, []);

  // Handle input blur to apply changes to cart
  const handleQuantityBlur = useCallback(async (e: React.FocusEvent<HTMLInputElement>, itemId: string, colorName: string, size: string) => {
    const currentValue = parseInt(e.target.value) || 0;
    // Enforce minimum quantity of 48
    const finalQuantity = currentValue > 0 && currentValue < 48 ? 48 : currentValue;
    
    // Update the input value if it was corrected
    if (finalQuantity !== currentValue) {
      e.target.value = finalQuantity.toString();
    }
    
    // Clear pending changes flag
    setHasPendingChanges(false);
    
    // Update the cart only on blur
    updateQuantity(itemId, colorName, size, finalQuantity);
  }, [updateQuantity]);

  // Handle Enter key press to apply changes
  const handleKeyPress = useCallback((e: React.KeyboardEvent<HTMLInputElement>, itemId: string, colorName: string, size: string) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur(); // This will trigger the blur handler
    }
  }, []);

  // Calculate costs for all cart items - trigger when quantities change
  useEffect(() => {
    if (cart.items.length > 0) {
      calculateAllItemsCosts();
    }
  }, [cart.items.length, cart.items.map(item => `${item.id}:${item.pricing.volume}`).join(',')]);


  const calculateAllItemsCosts = useCallback(async () => {
    setIsCalculatingCosts(true);
    const newCostBreakdowns: Record<string, CostBreakdown> = {};

    try {
      for (const item of cart.items) {
        const costBreakdown = await calculateItemCost(item);
        if (costBreakdown) {
          newCostBreakdowns[item.id] = costBreakdown;
        }
      }
      setItemCostBreakdowns(newCostBreakdowns);
    } catch (error) {
      console.error('Error calculating costs:', error);
    } finally {
      setIsCalculatingCosts(false);
    }
  }, [cart.items]);

  const calculateItemCost = async (item: any): Promise<CostBreakdown | null> => {
    try {
      // Get the base product pricing based on the product's price tier (logic unchanged)
      const getBaseProductPricing = async (priceTier: string = 'Tier 1') => {
        try {
          const response = await fetch('/api/blank-cap-pricing', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ priceTier }),
          });

          if (response.ok) {
            const pricing = await response.json();
            return pricing;
          }
        } catch (error) {
          console.error('Error fetching blank cap pricing:', error);
        }

        // Fallback to default pricing if API call fails
        return {
          price48: 2.4,
          price144: 1.7,
          price576: 1.6,
          price1152: 1.47,
          price2880: 1.44,
          price10000: 1.41,
        };
      };

      const baseProductPricing = await getBaseProductPricing(item.priceTier);

      const response = await fetch('/api/calculate-cost', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          selectedColors: item.selectedColors,
          logoSetupSelections: item.logoSetupSelections,
          multiSelectOptions: item.multiSelectOptions,
          selectedOptions: item.selectedOptions,
          baseProductPricing: baseProductPricing,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to calculate cost');
      }

      return await response.json();
    } catch (error) {
      console.error('Error calculating cost for item:', item.id, error);
      return null;
    }
  };

  const getGrandTotal = () =>
    Object.values(itemCostBreakdowns).reduce((total, b) => total + b.totalCost, 0);

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price);

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

  if (cart.items.length === 0) {
    return (
      <div className="min-h-screen overflow-x-hidden bg-[radial-gradient(60%_30%_at_50%_0%,rgba(255,255,255,0.06),transparent)] before:pointer-events-none before:absolute before:inset-0 before:bg-[linear-gradient(180deg,#000,rgba(5,7,14,1)_40%,#000)] before:z-[-1] relative">
        <main className="mx-auto max-w-[1800px] px-6 md:px-10 pt-16 md:pt-24 lg:pt-28 pb-24">
          <div className="mx-auto max-w-xl text-center">
            <div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-full border border-white/10 bg-white/5 backdrop-blur-xl ring-1 ring-white/5">
              <svg className="h-10 w-10 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-1.1 5H19M7 13v8a2 2 0 002 2h6a2 2 0 002-2v-8m-8 0V9a2 2 0 012-2h4a2 2 0 012 2v4.01" />
              </svg>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-white">Your cart is empty</h1>
            <p className="mt-3 text-slate-300">Start customizing caps and adding them to your cart to see them here.</p>
            <div className="mt-8">
              <Link href="/store" className="inline-flex items-center gap-2 rounded-full bg-lime-400 px-6 py-3 font-semibold text-black shadow-[0_0_30px_rgba(163,230,53,0.25)] transition-transform hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-400/60">
                Browse Products
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

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
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-white">Shopping Cart</h1>
                <p className="mt-1 text-sm md:text-base text-slate-300">{getItemCount()} items in your cart</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={clearCart}
                  className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-red-300 transition hover:bg-red-400/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-400/60"
                >
                  Clear Cart
                </button>
                <button
                  onClick={() => {
                    console.log('🔍 Current cart state:', cart);
                    console.log('🔍 localStorage cart:', localStorage.getItem('customcap_cart'));
                  }}
                  className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-blue-300 transition hover:bg-blue-400/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-400/60"
                >
                  Debug Cart
                </button>
                <button
                  onClick={debugClearLocalStorage}
                  className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-purple-300 transition hover:bg-purple-400/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-400/60"
                >
                  Clear localStorage
                </button>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Grid: 12 columns */}
        <div className="grid grid-cols-12 gap-6 md:gap-8">
          {/* Left: items (span 8-9) */}
          <div className="col-span-12 lg:col-span-8 xl:col-span-9 space-y-6 md:space-y-8">
            <GlassCard className="p-4 md:p-6 lg:p-8">
              <div className="space-y-8">
                {cart.items.map((item) => (
                  <div key={item.id} className="border-t border-white/10 pt-8 first:border-t-0 first:pt-0">
                    <div className="flex items-start gap-4 md:gap-6">
                      {/* Content */}
                      <div className="flex-1">
                        {/* Header */}
                        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                          <h3 className="text-lg md:text-xl font-semibold text-white">{item.productName}</h3>
                          <div className="text-right">
                            <div className="text-xs md:text-sm text-slate-300">{item.pricing.volume} units</div>
                            <div className="text-sm md:text-base font-semibold text-slate-200">
                              Base: {formatPrice(item.pricing.totalPrice)}
                            </div>
                            {itemCostBreakdowns[item.id] && (
                              <div className="mt-1 text-base md:text-lg font-bold text-lime-300">
                                Total: {formatPrice(itemCostBreakdowns[item.id].totalCost)}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Colors & Quantities */}
                        <div className="rounded-xl border border-white/10 bg-white/5 p-4 md:p-5 ring-1 ring-white/5">
                          <SectionTitle icon="🎨" accent="text-cyan-200">Colors & Quantities</SectionTitle>
                          <div className="space-y-4">
                            {Object.entries(item.selectedColors).map(([colorName, colorData]: any) => {
                              const sizeEntries = Object.entries(colorData.sizes);
                              return (
                                <div key={colorName} className="rounded-lg border border-white/10 bg-black/30 p-4">
                                  <div className="mb-3 flex items-center justify-between">
                                    <h5 className="text-sm font-semibold text-white">{colorName}</h5>
                                    <span className="rounded-full bg-white/5 px-2 py-0.5 text-xs text-slate-300">{sizeEntries.length} sizes</span>
                                  </div>
                                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                    {sizeEntries.map(([size, quantity]: any) => {
                                      const key = `${item.id}-${colorName}-${size}`;
                                      
                                      return (
                                        <div key={`${colorName}-${size}`} className="rounded-lg border border-white/10 bg-black/20 p-3">
                                          <label className="mb-2 block text-xs font-medium text-slate-300">
                                            {String(size).charAt(0).toUpperCase() + String(size).slice(1)}
                                            <span className="ml-1 text-xs text-slate-400">(Min: 48)</span>
                                          </label>
                                          <input
                                            key={key}
                                            ref={(el) => {
                                              if (el) inputRefs.current[key] = el;
                                            }}
                                            type="number"
                                            min={0}
                                            defaultValue={quantity}
                                            onChange={handleInputChange}
                                            onBlur={(e) => handleQuantityBlur(e, item.id, colorName as string, size as string)}
                                            onKeyDown={(e) => handleKeyPress(e, item.id, colorName as string, size as string)}
                                            className="w-full rounded-lg border border-white/10 bg-black/40 p-2.5 text-center text-sm text-white outline-none ring-0 transition focus:border-lime-300/60 focus:ring-2 focus:ring-lime-400/50"
                                            placeholder="Min 48"
                                          />
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Cost Sections */}
                        <div className="mt-6 space-y-6">
                          {/* Logo Setup */}
                          {Object.keys(item.logoSetupSelections).length > 0 && (
                            <div className="rounded-xl border border-white/10 bg-white/5 p-4 md:p-5 ring-1 ring-white/5">
                              <div className="mb-3 flex items-center justify-between">
                                <SectionTitle icon="⚙️" accent="text-lime-200">Logo Setup</SectionTitle>
                                {isCalculatingCosts ? (
                                  <div className="flex items-center gap-2 text-sm text-lime-200">
                                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-lime-300 border-t-transparent" />
                                    Calculating...
                                  </div>
                                ) : itemCostBreakdowns[item.id] ? (
                                  <div className="text-right">
                                    <div className="text-sm font-bold text-lime-300">
                                      {formatPrice(itemCostBreakdowns[item.id].logoSetupCosts.reduce((s, c) => s + c.cost, 0))}
                                    </div>
                                    <div className="text-xs text-lime-200/80">Total Logo Cost</div>
                                  </div>
                                ) : (
                                  <span className="rounded-full bg-white/5 px-2 py-1 text-xs text-lime-200">Additional Cost</span>
                                )}
                              </div>

                              <div className="space-y-3">
                                {itemCostBreakdowns[item.id]
                                  ? itemCostBreakdowns[item.id].logoSetupCosts.map((logoCost, index) => (
                                      <div key={index} className="flex items-center justify-between rounded-lg border border-white/10 bg-black/30 p-3">
                                        <div>
                                          <p className="font-medium text-white">{logoCost.name}</p>
                                          <p className="text-xs text-slate-300">{logoCost.details}</p>
                                        </div>
                                        <div className="text-right">
                                          <p className="text-sm font-semibold text-white">{formatPrice(logoCost.cost)}</p>
                                          <p className="text-xs text-lime-200/80">{formatPrice(logoCost.unitPrice)} per unit</p>
                                        </div>
                                      </div>
                                    ))
                                  : Object.entries(item.logoSetupSelections).map(([logoKey, logoConfig]: any) => (
                                      <div key={logoKey} className="flex items-center justify-between rounded-lg border border-white/10 bg-black/30 p-3">
                                        <div>
                                          <p className="font-medium text-white">{logoKey.includes('-') ? logoKey.split('-')[0] : logoKey}{logoKey.includes('-') && <span className="text-xs text-slate-300"> (Copy)</span>}</p>
                                          <p className="text-xs text-slate-300">
                                            {logoConfig.position && `Position: ${logoConfig.position}`} {logoConfig.size && `• Size: ${logoConfig.size}`} {logoConfig.application && `• Method: ${logoConfig.application}`}
                                          </p>
                                        </div>
                                        <div className="text-right text-sm font-semibold text-slate-200">Calculating...</div>
                                      </div>
                                    ))}
                              </div>
                            </div>
                          )}

                          {/* Accessories */}
                          {item.multiSelectOptions.accessories && item.multiSelectOptions.accessories.length > 0 && (
                            <div className="rounded-xl border border-white/10 bg-white/5 p-4 md:p-5 ring-1 ring-white/5">
                              <div className="mb-3 flex items-center justify-between">
                                <SectionTitle icon="🎒" accent="text-purple-200">Accessories</SectionTitle>
                                {isCalculatingCosts ? (
                                  <div className="flex items-center gap-2 text-sm text-purple-200">
                                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-purple-300 border-t-transparent" />
                                    Calculating...
                                  </div>
                                ) : itemCostBreakdowns[item.id] ? (
                                  <div className="text-right">
                                    <div className="text-sm font-bold text-purple-300">
                                      {formatPrice(itemCostBreakdowns[item.id].accessoriesCosts.reduce((s, c) => s + c.cost, 0))}
                                    </div>
                                    <div className="text-xs text-purple-200/80">Total Accessories Cost</div>
                                  </div>
                                ) : (
                                  <span className="rounded-full bg-white/5 px-2 py-1 text-xs text-purple-200">Additional Cost</span>
                                )}
                              </div>
                              <div className="space-y-3">
                                {itemCostBreakdowns[item.id]
                                  ? itemCostBreakdowns[item.id].accessoriesCosts.map((acc, i) => (
                                      <div key={i} className="flex items-center justify-between rounded-lg border border-white/10 bg-black/30 p-3">
                                        <div>
                                          <p className="font-medium text-white">{acc.name}</p>
                                          <p className="text-xs text-slate-300">{item.pricing.volume} units</p>
                                        </div>
                                        <div className="text-right">
                                          <p className="text-sm font-semibold text-white">{formatPrice(acc.cost)}</p>
                                          <p className="text-xs text-purple-200/80">{formatPrice(acc.unitPrice)} per unit</p>
                                        </div>
                                      </div>
                                    ))
                                  : item.multiSelectOptions.accessories.map((acc: string, i: number) => (
                                      <div key={i} className="flex items-center justify-between rounded-lg border border-white/10 bg-black/30 p-3">
                                        <p className="font-medium text-white">{acc}</p>
                                        <div className="text-right text-sm font-semibold text-slate-200">Calculating...</div>
                                      </div>
                                    ))}
                              </div>
                            </div>
                          )}

                          {/* Delivery Type */}
                          {item.selectedOptions['delivery-type'] && item.selectedOptions['delivery-type'] !== 'regular' && (
                            <div className="rounded-xl border border-white/10 bg-white/5 p-4 md:p-5 ring-1 ring-white/5">
                              <div className="mb-3 flex items-center justify-between">
                                <SectionTitle icon="🚚" accent="text-orange-200">Delivery Type</SectionTitle>
                                {isCalculatingCosts ? (
                                  <div className="flex items-center gap-2 text-sm text-orange-200">
                                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-orange-300 border-t-transparent" />
                                    Calculating...
                                  </div>
                                ) : itemCostBreakdowns[item.id] ? (
                                  <div className="text-right">
                                    <div className="text-sm font-bold text-orange-300">
                                      {formatPrice(itemCostBreakdowns[item.id].deliveryCosts.reduce((s, c) => s + c.cost, 0))}
                                    </div>
                                    <div className="text-xs text-orange-200/80">Total Delivery Cost</div>
                                  </div>
                                ) : (
                                  <span className="rounded-full bg-white/5 px-2 py-1 text-xs text-orange-200">Additional Cost</span>
                                )}
                              </div>

                              <div className="space-y-3">
                                {itemCostBreakdowns[item.id] && itemCostBreakdowns[item.id].deliveryCosts.length > 0 ? (
                                  itemCostBreakdowns[item.id].deliveryCosts.map((d, i) => (
                                    <div key={i} className="flex items-center justify-between rounded-lg border border-white/10 bg-black/30 p-3">
                                      <div>
                                        <p className="font-medium text-white">{d.name}</p>
                                        <p className="text-xs text-slate-300">Express delivery service</p>
                                      </div>
                                      <div className="text-right">
                                        <p className="text-sm font-semibold text-white">{formatPrice(d.cost)}</p>
                                        <p className="text-xs text-orange-200/80">{formatPrice(d.unitPrice)} per unit</p>
                                      </div>
                                    </div>
                                  ))
                                ) : (
                                  <div className="flex items-center justify-between rounded-lg border border-white/10 bg-black/30 p-3">
                                    <div>
                                      <p className="font-medium text-white">{item.selectedOptions['delivery-type']}</p>
                                      <p className="text-xs text-slate-300">Express delivery service</p>
                                    </div>
                                    <div className="text-right text-sm font-semibold text-slate-200">Calculating...</div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Additional Services */}
                          {item.multiSelectOptions.services && item.multiSelectOptions.services.length > 0 && (
                            <div className="rounded-xl border border-white/10 bg-white/5 p-4 md:p-5 ring-1 ring-white/5">
                              <div className="mb-3 flex items-center justify-between">
                                <SectionTitle icon="⭐" accent="text-cyan-200">Additional Services</SectionTitle>
                                {isCalculatingCosts ? (
                                  <div className="flex items-center gap-2 text-sm text-cyan-200">
                                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-cyan-300 border-t-transparent" />
                                    Calculating...
                                  </div>
                                ) : itemCostBreakdowns[item.id] ? (
                                  <div className="text-right">
                                    <div className="text-sm font-bold text-cyan-300">
                                      {formatPrice(itemCostBreakdowns[item.id].closureCosts.reduce((s, c) => s + c.cost, 0))}
                                    </div>
                                    <div className="text-xs text-cyan-200/80">Total Services Cost</div>
                                  </div>
                                ) : (
                                  <span className="rounded-full bg-white/5 px-2 py-1 text-xs text-cyan-200">Additional Cost</span>
                                )}
                              </div>

                              <div className="space-y-3">
                                {itemCostBreakdowns[item.id] && itemCostBreakdowns[item.id].closureCosts.length > 0 ? (
                                  itemCostBreakdowns[item.id].closureCosts.map((s, i) => (
                                    <div key={i} className="flex items-center justify-between rounded-lg border border-white/10 bg-black/30 p-3">
                                      <div>
                                        <p className="font-medium text-white">{s.name}</p>
                                        <p className="text-xs text-slate-300">Premium service add-on</p>
                                      </div>
                                      <div className="text-right">
                                        <p className="text-sm font-semibold text-white">{formatPrice(s.cost)}</p>
                                        <p className="text-xs text-cyan-200/80">{formatPrice(s.unitPrice)} per unit</p>
                                      </div>
                                    </div>
                                  ))
                                ) : (
                                  item.multiSelectOptions.services.map((service: string, i: number) => (
                                    <div key={i} className="flex items-center justify-between rounded-lg border border-white/10 bg-black/30 p-3">
                                      <p className="font-medium text-white">{service}</p>
                                      <div className="text-right text-sm font-semibold text-slate-200">Calculating...</div>
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>
                          )}

                          {/* Cap Style Setup (always included) */}
                          {(item.selectedOptions['bill-shape'] || item.selectedOptions['profile'] || item.selectedOptions['closure-type'] || item.selectedOptions['structure']) && (
                            <div className="rounded-xl border border-white/10 bg-white/5 p-4 md:p-5 ring-1 ring-white/5">
                              <div className="mb-3 flex items-center gap-2">
                                <SectionTitle icon="🧢" accent="text-indigo-200">Cap Style Setup</SectionTitle>
                                <span className="rounded-full bg-white/5 px-2 py-0.5 text-xs text-indigo-200">Included</span>
                              </div>
                              <div className="grid grid-cols-2 gap-3 md:gap-4">
                                {item.selectedOptions['bill-shape'] && (
                                  <div className="rounded-lg border border-white/10 bg-black/30 p-3 text-center">
                                    <p className="mb-1 text-xs font-medium text-indigo-200">Bill Shape</p>
                                    <p className="text-sm font-semibold text-white">{item.selectedOptions['bill-shape']}</p>
                                  </div>
                                )}
                                {item.selectedOptions['profile'] && (
                                  <div className="rounded-lg border border-white/10 bg-black/30 p-3 text-center">
                                    <p className="mb-1 text-xs font-medium text-indigo-200">Profile</p>
                                    <p className="text-sm font-semibold text-white">{item.selectedOptions['profile']}</p>
                                  </div>
                                )}
                                {item.selectedOptions['closure-type'] && (
                                  <div className="rounded-lg border border-white/10 bg-black/30 p-3 text-center">
                                    <p className="mb-1 text-xs font-medium text-indigo-200">Closure Type</p>
                                    <p className="text-sm font-semibold text-white">{item.selectedOptions['closure-type']}</p>
                                  </div>
                                )}
                                {item.selectedOptions['structure'] && (
                                  <div className="rounded-lg border border-white/10 bg-black/30 p-3 text-center">
                                    <p className="mb-1 text-xs font-medium text-indigo-200">Structure</p>
                                    <p className="text-sm font-semibold text-white">{item.selectedOptions['structure']}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Additional Instructions */}
                          {item.additionalInstructions && (
                            <div className="rounded-xl border border-white/10 bg-white/5 p-4 md:p-5 ring-1 ring-white/5">
                              <SectionTitle icon="📝" accent="text-amber-200">Additional Instructions</SectionTitle>
                              <div className="rounded-lg border border-white/10 bg-black/30 p-4">
                                <p className="text-sm text-slate-200 whitespace-pre-wrap">{item.additionalInstructions}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Remove */}
                      <button
                        onClick={() => removeFromCart(item.id)}
                        title="Remove from cart"
                        className="ml-2 inline-flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-red-300 transition hover:bg-red-400/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-400/60"
                        aria-label={`Remove ${item.productName} from cart`}
                      >
                        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>

          {/* Right: summary (span 3-4) */}
          <div className="col-span-12 lg:col-span-4 xl:col-span-3">
            <div className="sticky top-24">
              <GlassCard className="p-5 md:p-6">
                <h2 className="mb-5 text-lg md:text-xl font-bold text-white">Order Summary</h2>
                <div className="space-y-5">
                  <div className="rounded-lg border border-white/10 bg-black/30 p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-sm font-bold">{cart.items.length}</div>
                      <div>
                        <h3 className="text-base font-semibold text-white">Cart Summary</h3>
                        <p className="text-xs text-slate-300">{getItemCount()} total units</p>
                      </div>
                    </div>
                  </div>

                  {/* Totals */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between rounded-lg bg-transparent p-2">
                      <span className="text-sm text-slate-300">Base Products</span>
                      <span className="text-sm font-semibold text-white">{formatPrice(getCartTotal())}</span>
                    </div>

                    {Object.keys(itemCostBreakdowns).length > 0 && (
                      <>
                        {Object.values(itemCostBreakdowns).some((b) => b.logoSetupCosts.length > 0) && (
                          <div className="flex items-center justify-between rounded-lg p-2">
                            <span className="text-sm text-slate-300">Logo Setup</span>
                            <span className="text-sm font-semibold text-white">
                              {formatPrice(
                                Object.values(itemCostBreakdowns).reduce((sum, b) => sum + b.logoSetupCosts.reduce((s, c) => s + c.cost, 0), 0)
                              )}
                            </span>
                          </div>
                        )}
                        {Object.values(itemCostBreakdowns).some((b) => b.accessoriesCosts.length > 0) && (
                          <div className="flex items-center justify-between rounded-lg p-2">
                            <span className="text-sm text-slate-300">Accessories</span>
                            <span className="text-sm font-semibold text-white">
                              {formatPrice(
                                Object.values(itemCostBreakdowns).reduce((sum, b) => sum + b.accessoriesCosts.reduce((s, c) => s + c.cost, 0), 0)
                              )}
                            </span>
                          </div>
                        )}
                        {Object.values(itemCostBreakdowns).some((b) => b.deliveryCosts.length > 0) && (
                          <div className="flex items-center justify-between rounded-lg p-2">
                            <span className="text-sm text-slate-300">Delivery</span>
                            <span className="text-sm font-semibold text-white">
                              {formatPrice(
                                Object.values(itemCostBreakdowns).reduce((sum, b) => sum + b.deliveryCosts.reduce((s, c) => s + c.cost, 0), 0)
                              )}
                            </span>
                          </div>
                        )}
                        {Object.values(itemCostBreakdowns).some((b) => b.closureCosts.length > 0) && (
                          <div className="flex items-center justify-between rounded-lg p-2">
                            <span className="text-sm text-slate-300">Services</span>
                            <span className="text-sm font-semibold text-white">
                              {formatPrice(
                                Object.values(itemCostBreakdowns).reduce((sum, b) => sum + b.closureCosts.reduce((s, c) => s + c.cost, 0), 0)
                              )}
                            </span>
                          </div>
                        )}
                      </>
                    )}

                    {isCalculatingCosts && (
                      <div className="flex items-center justify-center rounded-lg p-2 text-sm text-slate-300">
                        <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-transparent" />
                        Calculating additional costs...
                      </div>
                    )}
                  </div>

                  {/* Grand Total */}
                  <div className="border-t border-white/10 pt-4">
                    <div className="flex items-baseline justify-between">
                      <div>
                        <span className="text-lg md:text-xl font-bold text-white">Total</span>
                        <p className="text-xs text-slate-400">
                          {hasPendingChanges ? (
                            <span className="text-yellow-300">
                              ⏱️ Changes pending - click away to update
                            </span>
                          ) : (
                            Object.keys(itemCostBreakdowns).length > 0 ? 'Including all additional costs' : 'Base products only'
                          )}
                        </p>
                      </div>
                      <span className={`text-2xl md:text-3xl font-extrabold transition-colors ${
                        hasPendingChanges ? 'text-yellow-300' : 'text-lime-300'
                      }`}>
                        {Object.keys(itemCostBreakdowns).length > 0 ? formatPrice(getGrandTotal()) : formatPrice(getCartTotal())}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-4 space-y-3">
                    <button
                      onClick={() => {
                        // Store calculated costs in sessionStorage to pass to checkout
                        sessionStorage.setItem('cart_cost_breakdowns', JSON.stringify(itemCostBreakdowns));
                        router.push('/checkout');
                      }}
                      className="block w-full rounded-full bg-lime-400 px-6 py-3 text-center font-semibold text-black shadow-[0_0_30px_rgba(163,230,53,0.25)] transition hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-400/60"
                      disabled={isCalculatingCosts}
                    >
                      {isCalculatingCosts ? 'Calculating...' : 'Proceed to Checkout'}
                    </button>
                    <Link
                      href="/store"
                      className="block w-full rounded-full border border-white/10 bg-white/5 px-6 py-3 text-center font-semibold text-white transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-400/60"
                    >
                      Continue Shopping
                    </Link>
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
