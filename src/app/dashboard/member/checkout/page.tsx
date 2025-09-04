'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/auth/AuthContext';
import {
  ArrowLeft,
  CreditCard,
  CheckCircle,
  Package,
  Shield,
  AlertTriangle,
  FileText,
  ShoppingCart,
  User,
  MapPin,
  Phone,
  Mail,
  Building2,
  Loader2
} from 'lucide-react';

// Import design system components
import {
  DashboardShell,
  DashboardContent,
  GlassCard,
  Button
} from '@/components/ui/dashboard';

// Types
interface Order {
  id: string;
  productName: string;
  status: string;
  orderSource: 'PRODUCT_CUSTOMIZATION' | 'REORDER' ;
  createdAt: string;
  updatedAt: string;
  customerInfo: {
    name: string;
    email: string;
    phone?: string;
    company?: string;
  };
  orderTotal?: number;
  itemTotal?: number;
  selectedColors: Record<string, any>;
  selectedOptions: Record<string, string>;
  multiSelectOptions: Record<string, string[]>;
  logoSetupSelections: Record<string, {
    position?: string;
    size?: string;
    application?: string;
  }>;
}

interface CostBreakdown {
  baseProductCost: number;
  logoSetupCosts: Array<{
    name: string;
    cost: number;
    unitPrice: number;
    details: string;
    baseUnitPrice?: number;
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

function MemberCheckoutPageContent() {
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');

  // State
  const [order, setOrder] = useState<Order | null>(null);
  const [loadingOrder, setLoadingOrder] = useState(true);
  const [processingCheckout, setProcessingCheckout] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [costBreakdown, setCostBreakdown] = useState<CostBreakdown | null>(null);
  const [loadingPricing, setLoadingPricing] = useState(false);
  
  // Customer info form state
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'US'
    }
  });

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && (!user || !isAuthenticated)) {
      router.replace('/login?redirect=' + encodeURIComponent(`/dashboard/member/checkout?orderId=${orderId}`));
    }
  }, [loading, user, isAuthenticated, router, orderId]);

  // Redirect if no order ID
  useEffect(() => {
    if (!orderId) {
      router.replace('/dashboard/member');
    }
  }, [orderId, router]);

  // Fetch order data
  useEffect(() => {
    if (isAuthenticated && user && orderId) {
      fetchOrder();
    }
  }, [isAuthenticated, user, orderId]);

  // Initialize customer info from user data
  useEffect(() => {
    if (user && order) {
      setCustomerInfo({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        company: user.company || '',
        address: {
          street: user.address?.street || '',
          city: user.address?.city || '',
          state: user.address?.state || '',
          zipCode: user.address?.zipCode || '',
          country: user.address?.country || 'US'
        }
      });
    }
  }, [user, order]);

  const fetchOrder = async () => {
    try {
      setLoadingOrder(true);
      setError(null);
      
      const response = await fetch(`/api/orders/${orderId}/checkout?userId=${user?.id}&email=${user?.email}`);
      if (!response.ok) {
        throw new Error('Failed to fetch order');
      }
      
      const data = await response.json();
      if (data.order) {
        // Only allow checkout of saved orders (PRODUCT_CUSTOMIZATION)
        if (data.order.orderSource !== 'PRODUCT_CUSTOMIZATION') {
          setError('This order cannot be checked out. Only saved orders can be processed.');
          return;
        }
        setOrder(data.order);
        // Calculate pricing for the order
        await calculatePricing(data.order);
      } else {
        setError('Order not found');
      }
    } catch (error) {
      console.error('Error fetching order:', error);
      setError('Failed to load order details');
    } finally {
      setLoadingOrder(false);
    }
  };

  const handleCheckout = async () => {
    if (!order) return;

    try {
      setProcessingCheckout(true);
      setError(null);

      // Update the order to convert it from saved to checked out
      const response = await fetch(`/api/orders/${orderId}/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerInfo: customerInfo,
          userId: user?.id,
          userEmail: user?.email,
          orderTotal: costBreakdown?.totalCost || order?.orderTotal
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process checkout');
      }

      const data = await response.json();
      
      // Redirect to success page or back to dashboard with success message
      router.push(`/dashboard/member?checkout=success&orderId=${orderId}`);
      
    } catch (error) {
      console.error('Error processing checkout:', error);
      setError(error instanceof Error ? error.message : 'Failed to process checkout');
    } finally {
      setProcessingCheckout(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  const calculateTotalUnits = (selectedColors: Record<string, any>) => {
    return Object.values(selectedColors).reduce((sum: number, colorData: any) => 
      sum + Object.values((colorData as any).sizes || {}).reduce((colorSum: number, qty: any) => colorSum + (qty as number), 0), 0
    );
  };

  const calculatePricing = async (orderData: Order) => {
    try {
      setLoadingPricing(true);
      
      // Determine pricing tier based on user role
      let priceTier = 'Tier 1'; // Default tier
      if (user?.customerRole === 'WHOLESALE') {
        priceTier = 'Tier 2';
      } else if (user?.customerRole === 'SUPPLIER') {
        priceTier = 'Tier 3';
      }
      
      // First, get the blank cap pricing for the product
      const blankCapResponse = await fetch('/api/blank-cap-pricing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceTier: priceTier
        }),
      });

      let baseProductPricing = {
        price48: 1.80,
        price144: 1.50,
        price576: 1.45,
        price1152: 1.42,
        price2880: 1.38,
        price10000: 1.35
      };

      if (blankCapResponse.ok) {
        const blankCapData = await blankCapResponse.json();
        baseProductPricing = blankCapData;
      }

      // Calculate costs using the calculate-cost API
      const costResponse = await fetch('/api/calculate-cost', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          selectedColors: orderData.selectedColors,
          logoSetupSelections: orderData.logoSetupSelections,
          multiSelectOptions: orderData.multiSelectOptions,
          selectedOptions: orderData.selectedOptions,
          baseProductPricing: baseProductPricing
        }),
      });

      if (costResponse.ok) {
        const costData: CostBreakdown = await costResponse.json();
        setCostBreakdown(costData);
      } else {
        console.error('Failed to calculate costs');
        setError('Failed to calculate pricing. Please try again.');
      }
    } catch (error) {
      console.error('Error calculating pricing:', error);
      setError('Failed to calculate pricing. Please try again.');
    } finally {
      setLoadingPricing(false);
    }
  };

  if (loading || loadingOrder) {
    return (
      <DashboardShell>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-lime-400 mx-auto"></div>
            <p className="mt-4 text-slate-300">Loading checkout...</p>
          </div>
        </div>
      </DashboardShell>
    );
  }

  if (!user || !isAuthenticated) {
    return (
      <DashboardShell>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-lime-400 mx-auto"></div>
            <p className="mt-4 text-slate-300">Redirecting to login...</p>
          </div>
        </div>
      </DashboardShell>
    );
  }

  if (error && !order) {
    return (
      <DashboardShell>
        <div className="flex items-center justify-center min-h-screen">
          <GlassCard className="p-8 text-center max-w-md mx-auto">
            <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">Error Loading Order</h2>
            <p className="text-slate-300 mb-4">{error}</p>
            <Link href="/dashboard/member">
              <Button variant="primary">Back to Dashboard</Button>
            </Link>
          </GlassCard>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <DashboardContent>
        {/* Header */}
        <header className="sticky top-0 z-20 backdrop-blur-xl mt-6">
          <div className="px-6 md:px-10 pt-4">
            <GlassCard className="p-5">
              <div className="flex items-center gap-4">
                <Link href="/dashboard/member">
                  <button className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/5 transition hover:bg-white/10">
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                </Link>
                
                <div className="flex-1">
                  <h1 className="text-2xl font-bold text-white">
                    Order Checkout
                  </h1>
                  <p className="text-slate-300/80">
                    Review and complete your order
                  </p>
                </div>

                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-lime-400/10 border border-lime-400/20 text-lime-400 text-sm font-medium">
                  <Shield className="h-4 w-4" />
                  Secure Checkout
                </div>
              </div>
            </GlassCard>
          </div>
        </header>

        {error && (
          <div className="px-6 md:px-10 mt-4">
            <GlassCard className="p-4 border-red-400/20 bg-red-400/10">
              <div className="flex items-center gap-3 text-red-100">
                <AlertTriangle className="h-5 w-5" />
                <p>{error}</p>
              </div>
            </GlassCard>
          </div>
        )}

        {/* Main Content */}
        <div className="px-6 md:px-10 mt-6 pb-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Customer Information Form */}
            <div className="space-y-6">
              <GlassCard className="p-6">
                <div className="mb-6 flex items-center gap-3 text-white">
                  <User className="h-5 w-5" />
                  <h2 className="text-xl font-semibold">Customer Information</h2>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-white mb-2">
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={customerInfo.name}
                        onChange={(e) => setCustomerInfo(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-slate-400 backdrop-blur-xl focus:border-lime-400/50 focus:outline-none focus:ring-2 focus:ring-lime-400/20"
                        placeholder="Enter your full name"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-white mb-2">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={customerInfo.email}
                        onChange={(e) => setCustomerInfo(prev => ({ ...prev, email: e.target.value }))}
                        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-slate-400 backdrop-blur-xl focus:border-lime-400/50 focus:outline-none focus:ring-2 focus:ring-lime-400/20"
                        placeholder="Enter your email"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-white mb-2">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        value={customerInfo.phone}
                        onChange={(e) => setCustomerInfo(prev => ({ ...prev, phone: e.target.value }))}
                        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-slate-400 backdrop-blur-xl focus:border-lime-400/50 focus:outline-none focus:ring-2 focus:ring-lime-400/20"
                        placeholder="(555) 123-4567"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-white mb-2">
                        Company (Optional)
                      </label>
                      <input
                        type="text"
                        value={customerInfo.company}
                        onChange={(e) => setCustomerInfo(prev => ({ ...prev, company: e.target.value }))}
                        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-slate-400 backdrop-blur-xl focus:border-lime-400/50 focus:outline-none focus:ring-2 focus:ring-lime-400/20"
                        placeholder="Your company name"
                      />
                    </div>
                  </div>
                </div>
              </GlassCard>

              {/* Shipping Address */}
              <GlassCard className="p-6">
                <div className="mb-6 flex items-center gap-3 text-white">
                  <MapPin className="h-5 w-5" />
                  <h2 className="text-xl font-semibold">Shipping Address</h2>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      Street Address
                    </label>
                    <input
                      type="text"
                      value={customerInfo.address.street}
                      onChange={(e) => setCustomerInfo(prev => ({ 
                        ...prev, 
                        address: { ...prev.address, street: e.target.value }
                      }))}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-slate-400 backdrop-blur-xl focus:border-lime-400/50 focus:outline-none focus:ring-2 focus:ring-lime-400/20"
                      placeholder="123 Main Street"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-white mb-2">
                        City
                      </label>
                      <input
                        type="text"
                        value={customerInfo.address.city}
                        onChange={(e) => setCustomerInfo(prev => ({ 
                          ...prev, 
                          address: { ...prev.address, city: e.target.value }
                        }))}
                        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-slate-400 backdrop-blur-xl focus:border-lime-400/50 focus:outline-none focus:ring-2 focus:ring-lime-400/20"
                        placeholder="City"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-white mb-2">
                        State
                      </label>
                      <input
                        type="text"
                        value={customerInfo.address.state}
                        onChange={(e) => setCustomerInfo(prev => ({ 
                          ...prev, 
                          address: { ...prev.address, state: e.target.value }
                        }))}
                        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-slate-400 backdrop-blur-xl focus:border-lime-400/50 focus:outline-none focus:ring-2 focus:ring-lime-400/20"
                        placeholder="CA"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-white mb-2">
                        ZIP Code
                      </label>
                      <input
                        type="text"
                        value={customerInfo.address.zipCode}
                        onChange={(e) => setCustomerInfo(prev => ({ 
                          ...prev, 
                          address: { ...prev.address, zipCode: e.target.value }
                        }))}
                        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-slate-400 backdrop-blur-xl focus:border-lime-400/50 focus:outline-none focus:ring-2 focus:ring-lime-400/20"
                        placeholder="12345"
                      />
                    </div>
                  </div>
                </div>
              </GlassCard>
            </div>

            {/* Order Summary */}
            {order && (
              <div className="space-y-6">
                <GlassCard className="p-6">
                  <div className="mb-6 flex items-center gap-3 text-white">
                    <Package className="h-5 w-5" />
                    <h2 className="text-xl font-semibold">Order Summary</h2>
                  </div>

                  <div className="space-y-4">
                    {/* Product Info */}
                    <div className="border border-white/10 rounded-xl p-4">
                      <h3 className="text-lg font-semibold text-white mb-2">{order.productName}</h3>
                      
                      {/* Colors and Sizes */}
                      {order.selectedColors && Object.keys(order.selectedColors).length > 0 && (
                        <div className="mb-3">
                          <h4 className="text-sm font-medium text-slate-300 mb-2">Colors & Quantities</h4>
                          {Object.entries(order.selectedColors).map(([colorName, colorData]: [string, any]) => (
                            <div key={colorName} className="mb-2">
                              <div className="text-sm font-medium text-white">{colorName}:</div>
                              <div className="ml-4 text-sm text-slate-400">
                                {Object.entries((colorData as any).sizes || {}).map(([size, qty]: [string, any]) => (
                                  qty > 0 && <span key={size} className="mr-3">{size}: {qty}</span>
                                ))}
                              </div>
                            </div>
                          ))}
                          <div className="pt-2 border-t border-white/10 text-sm">
                            <strong className="text-white">
                              Total Units: {calculateTotalUnits(order.selectedColors)}
                            </strong>
                          </div>
                        </div>
                      )}

                      {/* Selected Options */}
                      {order.selectedOptions && Object.keys(order.selectedOptions).length > 0 && (
                        <div className="mb-3">
                          <h4 className="text-sm font-medium text-slate-300 mb-2">Options</h4>
                          {Object.entries(order.selectedOptions).map(([optionName, optionValue]: [string, string]) => (
                            <div key={optionName} className="flex justify-between text-sm">
                              <span className="text-slate-400 capitalize">{optionName.replace(/[-_]/g, ' ')}:</span>
                              <span className="text-white">{optionValue}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Multi-select Options */}
                      {order.multiSelectOptions && Object.entries(order.multiSelectOptions).some(([key, values]) => Array.isArray(values) && values.length > 0) && (
                        <div className="mb-3">
                          <h4 className="text-sm font-medium text-slate-300 mb-2">Additional Options</h4>
                          {Object.entries(order.multiSelectOptions).map(([optionName, optionValues]: [string, any]) => (
                            Array.isArray(optionValues) && optionValues.length > 0 && (
                              <div key={optionName} className="mb-2">
                                <span className="text-sm text-slate-400 capitalize">{optionName.replace(/[-_]/g, ' ')}:</span>
                                <ul className="ml-4 text-sm text-white">
                                  {optionValues.map((value: string) => (
                                    <li key={value} className="list-disc">• {value}</li>
                                  ))}
                                </ul>
                              </div>
                            )
                          ))}
                        </div>
                      )}

                      {/* Pricing Loading */}
                      {loadingPricing && (
                        <div className="pt-4 border-t border-white/10">
                          <div className="flex items-center justify-center gap-2 text-slate-300">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Calculating pricing...</span>
                          </div>
                        </div>
                      )}

                      {/* Detailed Pricing Breakdown */}
                      {costBreakdown && !loadingPricing && (
                        <div className="pt-4 border-t border-white/10 space-y-4">
                          {/* Pricing Tier Info */}
                          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                            <span>
                              Pricing Tier: {user?.customerRole === 'WHOLESALE' ? 'Tier 2 (Wholesale)' : 
                                          user?.customerRole === 'SUPPLIER' ? 'Tier 3 (Supplier)' : 
                                          'Tier 1 (Retail)'}
                            </span>
                            <span>Volume discount applied</span>
                          </div>

                          {/* Base Product Cost */}
                          <div className="space-y-2">
                            <h4 className="text-sm font-medium text-slate-300">Base Product Cost</h4>
                            <div className="flex justify-between items-center text-sm">
                              <span className="text-slate-400">{costBreakdown.totalUnits} units × Base Price</span>
                              <span className="text-white font-medium">{formatPrice(costBreakdown.baseProductCost)}</span>
                            </div>
                          </div>

                          {/* Logo Setup Costs */}
                          {costBreakdown.logoSetupCosts.length > 0 && (
                            <div className="space-y-2">
                              <h4 className="text-sm font-medium text-slate-300">Logo Setup Costs</h4>
                              {costBreakdown.logoSetupCosts.map((logo, index) => (
                                <div key={index} className="flex justify-between items-center text-sm">
                                  <span className="text-slate-400">
                                    {logo.details} ({formatPrice(logo.unitPrice)}/unit)
                                  </span>
                                  <span className="text-white font-medium">{formatPrice(logo.cost)}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Accessories Costs */}
                          {costBreakdown.accessoriesCosts.length > 0 && (
                            <div className="space-y-2">
                              <h4 className="text-sm font-medium text-slate-300">Accessories</h4>
                              {costBreakdown.accessoriesCosts.map((accessory, index) => (
                                <div key={index} className="flex justify-between items-center text-sm">
                                  <span className="text-slate-400">
                                    {accessory.name} ({formatPrice(accessory.unitPrice)}/unit)
                                  </span>
                                  <span className="text-white font-medium">{formatPrice(accessory.cost)}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Closure Costs */}
                          {costBreakdown.closureCosts.length > 0 && (
                            <div className="space-y-2">
                              <h4 className="text-sm font-medium text-slate-300">Premium Closures</h4>
                              {costBreakdown.closureCosts.map((closure, index) => (
                                <div key={index} className="flex justify-between items-center text-sm">
                                  <span className="text-slate-400">
                                    {closure.name} ({formatPrice(closure.unitPrice)}/unit)
                                  </span>
                                  <span className="text-white font-medium">{formatPrice(closure.cost)}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Delivery Costs */}
                          {costBreakdown.deliveryCosts.length > 0 && (
                            <div className="space-y-2">
                              <h4 className="text-sm font-medium text-slate-300">Delivery Options</h4>
                              {costBreakdown.deliveryCosts.map((delivery, index) => (
                                <div key={index} className="flex justify-between items-center text-sm">
                                  <span className="text-slate-400">
                                    {delivery.name} ({formatPrice(delivery.unitPrice)}/unit)
                                  </span>
                                  <span className="text-white font-medium">{formatPrice(delivery.cost)}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Total */}
                          <div className="pt-3 border-t border-white/20">
                            <div className="flex justify-between items-center">
                              <span className="text-lg font-semibold text-white">Total Order Cost:</span>
                              <span className="text-2xl font-bold text-lime-400">{formatPrice(costBreakdown.totalCost)}</span>
                            </div>
                            <div className="text-xs text-slate-400 text-right mt-1">
                              {costBreakdown.totalUnits} total units
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Pricing Error */}
                      {!costBreakdown && !loadingPricing && error && error.includes('pricing') && (
                        <div className="pt-4 border-t border-white/10">
                          <div className="text-center space-y-3">
                            <p className="text-sm text-red-300">Failed to load pricing information</p>
                            <button
                              onClick={() => calculatePricing(order)}
                              className="text-sm text-lime-400 hover:text-lime-300 underline"
                            >
                              Try again
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Fallback for existing order total */}
                      {!costBreakdown && !loadingPricing && !error && order.orderTotal && (
                        <div className="pt-4 border-t border-white/10">
                          <div className="flex justify-between items-center">
                            <span className="text-lg font-semibold text-white">Total:</span>
                            <span className="text-2xl font-bold text-lime-400">{formatPrice(order.orderTotal)}</span>
                          </div>
                        </div>
                      )}

                      {/* No pricing available */}
                      {!costBreakdown && !loadingPricing && !error && !order.orderTotal && (
                        <div className="pt-4 border-t border-white/10">
                          <div className="text-center">
                            <p className="text-sm text-slate-400">Pricing will be calculated during checkout</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </GlassCard>

                {/* Checkout Actions */}
                <GlassCard className="p-6">
                  <div className="space-y-4">
                    <Button
                      variant="primary"
                      onClick={handleCheckout}
                      disabled={processingCheckout || !customerInfo.name || !customerInfo.email}
                      className="w-full py-4 text-lg"
                    >
                      {processingCheckout ? (
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="h-5 w-5 animate-spin" />
                          Processing Order...
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-2">
                          <CheckCircle className="h-5 w-5" />
                          Complete Order
                        </div>
                      )}
                    </Button>

                    <div className="text-center">
                      <p className="text-xs text-slate-400">
                        By completing this order, you agree to our terms and conditions.
                        Your order will be processed and you'll receive a confirmation email.
                      </p>
                    </div>
                  </div>
                </GlassCard>
              </div>
            )}
          </div>
        </div>
      </DashboardContent>
    </DashboardShell>
  );
}

export default function MemberCheckoutPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <MemberCheckoutPageContent />
    </Suspense>
  );
}