'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircleIcon, DocumentArrowDownIcon, PrinterIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/components/auth/AuthContext';
import { calculateGrandTotal } from '@/lib/pricing';

// Detailed cost calculation function - matches checkout logic exactly
async function calculateDetailedCostBreakdown(cartItem: any): Promise<DetailedCostBreakdown> {
  console.log(`🔧 calculateDetailedCostBreakdown called for item ${cartItem.id}`);
  
  try {
    // Import the same function checkout uses
    const { getBaseProductPricing } = await import('@/lib/pricing');
    
    // Get consistent base product pricing - same as checkout
    const baseProductPricing = getBaseProductPricing(cartItem.priceTier || 'Tier 2');
    
    const requestBody = {
      selectedColors: cartItem.selectedColors,
      logoSetupSelections: cartItem.logoSetupSelections,
      selectedOptions: cartItem.selectedOptions,
      multiSelectOptions: cartItem.multiSelectOptions,
      baseProductPricing, // Include base product pricing like checkout does
      priceTier: cartItem.priceTier || 'Tier 2'
    };
    
    console.log(`🔧 API request for ${cartItem.id}:`, requestBody);
    
    const response = await fetch('/api/calculate-cost', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    console.log(`🔧 API response status for ${cartItem.id}:`, response.status, response.ok);

    if (response.ok) {
      const result = await response.json();
      console.log(`🔧 API result for ${cartItem.id}:`, result);
      
      // Calculate base unit price from total units and base cost
      const baseUnitPrice = result.totalUnits > 0 ? result.baseProductCost / result.totalUnits : 0;
      
      const breakdown = {
        baseProductCost: result.baseProductCost || 0,
        baseProductUnitPrice: baseUnitPrice,
        logoSetupCosts: result.logoSetupCosts || [],
        accessoriesCosts: result.accessoriesCosts || [],
        closureCosts: result.closureCosts || [],
        deliveryCosts: result.deliveryCosts || [],
        totalUnits: result.totalUnits || 0,
        subtotal: result.totalCost || 0,
        totalCost: result.totalCost || 0, // Use the API calculated total, not order.orderTotal
        volumeDiscountApplied: (result.totalUnits || 0) >= 144,
        priceTier: cartItem.priceTier || 'Tier 2'
      };
      
      console.log(`🔧 Final breakdown for ${cartItem.id}:`, breakdown);
      return breakdown;
    } else {
      const errorText = await response.text();
      console.error(`🔧 API error for ${cartItem.id}:`, response.status, errorText);
    }
  } catch (error) {
    console.error(`🔧 Error calculating detailed breakdown for ${cartItem.id}:`, error);
  }

  // Fallback breakdown if API fails
  const fallbackUnits = cartItem.pricing?.volume || 0;
  console.log(`🔧 Using fallback breakdown for ${cartItem.id} with ${fallbackUnits} units`);
    
  return {
    baseProductCost: 0,
    baseProductUnitPrice: 0,
    logoSetupCosts: [],
    accessoriesCosts: [],
    closureCosts: [],
    deliveryCosts: [],
    totalUnits: fallbackUnits,
    subtotal: 0,
    totalCost: 0,
    volumeDiscountApplied: fallbackUnits >= 144,
    priceTier: cartItem.priceTier || 'Tier 2'
  };
}

interface OrderData {
  id: string;
  productName: string;
  customerInfo: any;
  selectedColors: any;
  selectedOptions: any;
  multiSelectOptions: any;
  logoSetupSelections: any;
  status: string;
  createdAt: string;
  orderTotal?: number;
}

interface DetailedCostBreakdown {
  baseProductCost: number;
  baseProductUnitPrice: number;
  logoSetupCosts: Array<{
    name: string;
    cost: number;
    unitPrice: number;
    details?: string;
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
  totalUnits: number;
  subtotal: number;
  totalCost: number;
  volumeDiscountApplied: boolean;
  priceTier: string;
}

interface InvoiceData {
  id: string;
  number: string;
  status: string;
  total: number;
  orderId: string;
}

function SuccessPageContent() {
  const searchParams = useSearchParams();
  const { user, isAuthenticated } = useAuth();
  const orderId = searchParams.get('orderId');
  const orders = searchParams.get('orders'); // Multiple order IDs from cart
  const total = searchParams.get('total'); // Total amount paid
  const [orderDetails, setOrderDetails] = useState<OrderData[]>([]);
  const [costBreakdowns, setCostBreakdowns] = useState<Record<string, DetailedCostBreakdown>>({});
  const [invoices, setInvoices] = useState<InvoiceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingInvoice, setCreatingInvoice] = useState<string | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState<string | null>(null);

  const orderIds = orders ? orders.split(',') : (orderId ? [orderId] : []);
  const isMultipleOrders = orderIds.length > 1;

  useEffect(() => {
    const fetchOrderDetails = async () => {
      if (orderIds.length === 0) {
        console.log('❌ No order IDs found in URL params');
        setLoading(false);
        return;
      }

      console.log('🔍 Fetching order details for IDs:', orderIds);
      console.log('📝 URL search params:', {
        orderId: searchParams.get('orderId'),
        orders: searchParams.get('orders'),
        total: searchParams.get('total')
      });

      try {
        const orderPromises = orderIds.map(id => 
          fetch(`/api/orders/${id}`).then(res => res.json())
        );
        const orderResults = await Promise.all(orderPromises);
        
        console.log('📋 Order API results:', orderResults);
        
        const validOrders = orderResults
          .filter(result => result.order)
          .map(result => result.order);
        
        setOrderDetails(validOrders);

        // Calculate detailed cost breakdowns for each order
        console.log('💰 Starting cost breakdown calculation for', validOrders.length, 'orders');
        const breakdowns: Record<string, DetailedCostBreakdown> = {};
        for (const order of validOrders) {
          // Convert order to cart item format for consistent pricing
          const volume = order.selectedColors ? 
            Object.values(order.selectedColors).reduce((sum: number, colorData: any) => 
              sum + Object.values((colorData as any).sizes || {}).reduce((colorSum: number, qty: any) => colorSum + (qty as number), 0), 0
            ) : 0;

          const cartItem = {
            id: order.id,
            productName: order.productName,
            selectedColors: order.selectedColors,
            selectedOptions: order.selectedOptions,
            multiSelectOptions: order.multiSelectOptions,
            logoSetupSelections: order.logoSetupSelections,
            priceTier: 'Tier 2', // Use same tier as checkout
            pricing: {
              volume: volume
            }
          };
          
          console.log(`💰 Calculating costs for order ${order.id} with ${volume} units:`, cartItem);
          breakdowns[order.id] = await calculateDetailedCostBreakdown(cartItem);
          console.log(`💰 Cost breakdown result for ${order.id}:`, breakdowns[order.id]);
        }
        setCostBreakdowns(breakdowns);
        console.log('💰 All cost breakdowns completed:', breakdowns);

        // Check for existing invoices for these orders
        if (isAuthenticated && validOrders.length > 0) {
          try {
            const invoiceResponse = await fetch('/api/user/invoices');
            if (invoiceResponse.ok) {
              const invoiceData = await invoiceResponse.json();
              const orderInvoices = invoiceData.invoices?.filter((invoice: InvoiceData) => 
                orderIds.includes(invoice.orderId)
              ) || [];
              setInvoices(orderInvoices);
            }
          } catch (error) {
            console.log('Could not fetch invoices:', error);
          }
        }
      } catch (error) {
        console.error('Error fetching order details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrderDetails();
  }, [orderId, orders, isAuthenticated]);

  const createInvoice = async (orderId: string) => {
    if (!isAuthenticated || creatingInvoice) return;
    
    setCreatingInvoice(orderId);
    try {
      const response = await fetch('/api/user/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId })
      });

      if (response.ok) {
        const result = await response.json();
        setInvoices(prev => [...prev, result.invoice]);
      } else {
        const error = await response.json();
        console.error('Error creating invoice:', error);
        alert('Unable to create invoice. Please contact support.');
      }
    } catch (error) {
      console.error('Error creating invoice:', error);
      alert('Unable to create invoice. Please try again later.');
    } finally {
      setCreatingInvoice(null);
    }
  };

  const downloadPdf = async (invoiceId: string, invoiceNumber: string) => {
    if (downloadingPdf) return;
    
    setDownloadingPdf(invoiceId);
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/pdf`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `invoice-${invoiceNumber}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert('Unable to download PDF. Please try again.');
      }
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('Unable to download PDF. Please try again.');
    } finally {
      setDownloadingPdf(null);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  const getStatusBadge = (status: string) => {
    const statusColors = {
      PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
      CONFIRMED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
      PROCESSING: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400',
      SHIPPED: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
      DELIVERED: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
      CANCELLED: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
    };
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        statusColors[status as keyof typeof statusColors] || statusColors.PENDING
      }`}>
        {status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="relative min-h-screen overflow-x-hidden text-slate-200">
        {/* Background: dark gradient + accent glows */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-[linear-gradient(180deg,#000,rgba(5,7,14,1)_40%,#000)]" />
          <div className="absolute inset-x-0 top-0 h-[40vh] bg-[radial-gradient(60%_30%_at_50%_0%,rgba(255,255,255,0.06),transparent)]" />
          <div className="absolute -top-10 -left-20 h-80 w-80 rounded-full bg-lime-400/10 blur-3xl" />
          <div className="absolute top-40 -right-24 h-96 w-96 rounded-full bg-orange-400/10 blur-3xl" />
        </div>
        
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-lime-400 mx-auto"></div>
            <p className="mt-4 text-slate-300">Loading your order receipt...</p>
          </div>
        </div>
      </div>
    );
  }

  const GlassCard: React.FC<React.PropsWithChildren<{ className?: string }>> = ({ className = '', children }) => (
    <div className={`rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl ring-1 ring-white/5 ${className}`}>
      {children}
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

      <main className="mx-auto max-w-[1200px] px-6 md:px-10 pt-16 md:pt-24 lg:pt-28 pb-24">
        <GlassCard className="p-8 md:p-12">
          {/* Success Header */}
          <div className="text-center mb-10">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-lime-400/20 bg-lime-400/10 backdrop-blur-xl ring-1 ring-lime-400/10">
              <CheckCircleIcon className="h-10 w-10 text-lime-400" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Order Receipt
            </h1>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto">
              {isMultipleOrders 
                ? `Thank you for your ${orderIds.length} orders! Here's your receipt with all the details.`
                : 'Thank you for your order! Here\'s your receipt with all the details.'
              }
            </p>
            
            {/* DEBUG INFO */}
            <div className="mt-8 p-4 bg-red-900/20 border border-red-500/30 rounded-lg text-left text-xs">
              <p className="text-red-300 font-bold mb-2">🔍 DEBUG INFO:</p>
              <p className="text-red-200">URL Order IDs: {JSON.stringify(orderIds)}</p>
              <p className="text-red-200">URL Total: {searchParams.get('total')}</p>
              <p className="text-red-200">Orders Found: {orderDetails.length}</p>
              <p className="text-red-200">Cost Breakdowns: {Object.keys(costBreakdowns).length}</p>
              <p className="text-red-200">Breakdown IDs: {Object.keys(costBreakdowns).join(', ')}</p>
              {Object.entries(costBreakdowns).map(([id, breakdown]) => (
                <p key={id} className="text-red-200">Order {id}: ${breakdown.totalCost}</p>
              ))}
            </div>
          </div>

          {/* Order Details */}
          {orderDetails.map((order, index) => (
            <div key={order.id} className="mb-8">
              <GlassCard className="p-6 md:p-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-2">
                      {isMultipleOrders ? `Order ${index + 1}` : 'Order Details'}
                    </h2>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-slate-300">
                      <span>Order #{order.id}</span>
                      <span>•</span>
                      <span>{new Date(order.createdAt).toLocaleDateString()}</span>
                      <span>•</span>
                      {getStatusBadge(order.status)}
                    </div>
                  </div>
                  
                  {/* Invoice Actions */}
                  <div className="mt-4 md:mt-0 flex gap-3">
                    {(() => {
                      const invoice = invoices.find(inv => inv.orderId === order.id);
                      if (invoice) {
                        return (
                          <button
                            onClick={() => downloadPdf(invoice.id, invoice.number)}
                            disabled={downloadingPdf === invoice.id}
                            className="inline-flex items-center gap-2 rounded-full bg-lime-400 px-4 py-2 text-sm font-semibold text-black shadow-[0_0_30px_rgba(163,230,53,0.25)] transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-50"
                          >
                            {downloadingPdf === invoice.id ? (
                              <>
                                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Downloading...
                              </>
                            ) : (
                              <>
                                <DocumentArrowDownIcon className="h-4 w-4" />
                                Download Invoice
                              </>
                            )}
                          </button>
                        );
                      } else if (isAuthenticated) {
                        return (
                          <button
                            onClick={() => createInvoice(order.id)}
                            disabled={creatingInvoice === order.id}
                            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10 disabled:opacity-50"
                          >
                            {creatingInvoice === order.id ? (
                              <>
                                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Creating...
                              </>
                            ) : (
                              <>
                                <PrinterIcon className="h-4 w-4" />
                                Create Invoice
                              </>
                            )}
                          </button>
                        );
                      }
                      return null;
                    })()}
                  </div>
                </div>

                {/* Product Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <h3 className="text-lg font-semibold text-lime-300 mb-4">Product Information</h3>
                    <div className="space-y-3 text-sm">
                      <div>
                        <span className="text-slate-400">Product:</span>
                        <span className="ml-2 text-white font-medium">{order.productName}</span>
                      </div>
                      
                      {/* Colors */}
                      {order.selectedColors && Object.keys(order.selectedColors).length > 0 && (
                        <div>
                          <span className="text-slate-400">Colors:</span>
                          <div className="ml-2 mt-1">
                            {Object.entries(order.selectedColors).map(([color, data]: [string, any]) => (
                              <div key={color} className="text-white text-xs mb-1">
                                <span className="font-medium">{color}:</span>
                                {data.sizes && Object.entries(data.sizes).map(([size, qty]: [string, any]) => (
                                  qty > 0 && <span key={size} className="ml-2">{size}: {qty}</span>
                                ))}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Options */}
                      {order.selectedOptions && Object.keys(order.selectedOptions).length > 0 && (
                        <div>
                          <span className="text-slate-400">Options:</span>
                          <div className="ml-2 text-white">
                            {Object.entries(order.selectedOptions).map(([key, value]: [string, any]) => (
                              <div key={key} className="text-xs">{key}: {value}</div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Logo Setup */}
                      {order.logoSetupSelections && Object.keys(order.logoSetupSelections).length > 0 && (
                        <div>
                          <span className="text-slate-400">Logo Setup:</span>
                          <div className="ml-2 text-white">
                            {Object.entries(order.logoSetupSelections).map(([key, value]: [string, any]) => (
                              <div key={key} className="text-xs">{key}: {typeof value === 'object' ? JSON.stringify(value) : value}</div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-lime-300 mb-4">Customer Information</h3>
                    <div className="space-y-3 text-sm">
                      {order.customerInfo && (
                        <>
                          <div>
                            <span className="text-slate-400">Name:</span>
                            <span className="ml-2 text-white">{order.customerInfo.name}</span>
                          </div>
                          <div>
                            <span className="text-slate-400">Email:</span>
                            <span className="ml-2 text-white">{order.customerInfo.email}</span>
                          </div>
                          {order.customerInfo.phone && (
                            <div>
                              <span className="text-slate-400">Phone:</span>
                              <span className="ml-2 text-white">{order.customerInfo.phone}</span>
                            </div>
                          )}
                          {order.customerInfo.address && (
                            <div>
                              <span className="text-slate-400">Address:</span>
                              <div className="ml-2 text-white text-xs">
                                <div>{order.customerInfo.address.street}</div>
                                <div>{order.customerInfo.address.city}, {order.customerInfo.address.state} {order.customerInfo.address.zipCode}</div>
                                <div>{order.customerInfo.address.country}</div>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* This section is replaced by the detailed cost breakdown above */}
              </GlassCard>
            </div>
          ))}

          {/* Summary for Multiple Orders */}
          {isMultipleOrders && Object.values(costBreakdowns).length > 0 && (
            <GlassCard className="p-6 md:p-8 mb-8">
              <h3 className="text-xl font-bold text-white mb-6">Order Summary</h3>
              <div className="space-y-4">
                {/* Individual Order Totals */}
                {orderDetails.map((order, index) => {
                  const breakdown = costBreakdowns[order.id];
                  return breakdown ? (
                    <div key={order.id} className="flex justify-between items-center py-2 border-b border-white/10">
                      <span className="text-slate-300">Order {index + 1} (#{order.id})</span>
                      <span className="text-white font-medium">{formatPrice(breakdown.totalCost)}</span>
                    </div>
                  ) : null;
                })}
                
                {/* Grand Total using calculateGrandTotal like checkout */}
                <div className="flex justify-between items-center pt-4 border-t border-white/20">
                  <div>
                    <span className="text-xl font-bold text-white">Grand Total</span>
                    <div className="text-sm text-slate-300">
                      {orderIds.length} orders • {Object.values(costBreakdowns).reduce((sum, breakdown) => sum + breakdown.totalUnits, 0)} total units
                    </div>
                  </div>
                  <span className="text-3xl font-bold text-lime-300">
                    {formatPrice(calculateGrandTotal(costBreakdowns))}
                  </span>
                </div>
              </div>
            </GlassCard>
          )}

          {/* Next Steps */}
          <GlassCard className="p-6 md:p-8 mb-8">
            <h3 className="text-xl font-bold text-lime-300 mb-6">What happens next?</h3>
            <div className="space-y-4">
              {[
                {
                  step: '1',
                  title: 'Order Review',
                  description: 'Our team will review your order and confirm all details within 24 hours.'
                },
                {
                  step: '2', 
                  title: 'Production Planning',
                  description: 'We\'ll prepare your custom caps according to your specifications.'
                },
                {
                  step: '3',
                  title: 'Quality Check & Shipping',
                  description: 'After quality control, we\'ll ship your order with tracking information.'
                },
                {
                  step: '4',
                  title: 'Order Tracking', 
                  description: 'You\'ll receive tracking information and can monitor your order status in your dashboard.'
                }
              ].map((item) => (
                <div key={item.step} className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-lime-400 rounded-full flex items-center justify-center">
                    <span className="text-black text-sm font-bold">{item.step}</span>
                  </div>
                  <div>
                    <p className="font-medium text-white mb-1">{item.title}</p>
                    <p className="text-sm text-slate-300">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>

          {/* Contact Information */}
          <GlassCard className="p-6 md:p-8 mb-8">
            <h3 className="text-xl font-bold text-orange-300 mb-4">Need Help?</h3>
            <p className="text-slate-300 mb-4">
              If you have any questions about your order, please don't hesitate to contact us.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-white">Email:</span>
                <span className="ml-2 text-slate-300">orders@opmgear.com</span>
              </div>
              <div>
                <span className="font-medium text-white">Phone:</span>
                <span className="ml-2 text-slate-300">(555) 123-4567</span>
              </div>
              <div className="md:col-span-2">
                <span className="font-medium text-white">Reference:</span>
                <span className="ml-2 text-slate-300">
                  {isMultipleOrders 
                    ? `Orders ${orderIds.map(id => `#${id}`).join(', ')}`
                    : `Order #${orderIds[0]}`
                  }
                </span>
              </div>
            </div>
          </GlassCard>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href="/store"
              className="flex-1 px-8 py-4 bg-lime-400 hover:bg-lime-500 text-black font-semibold rounded-full transition-all duration-200 hover:-translate-y-0.5 text-center shadow-[0_0_30px_rgba(163,230,53,0.25)]"
            >
              Continue Shopping
            </Link>
            <Link
              href={isAuthenticated ? "/dashboard" : "/login"}
              className="flex-1 px-8 py-4 border border-white/10 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-full transition-colors duration-200 text-center"
            >
              {isAuthenticated ? 'View Dashboard' : 'Sign In to Track Orders'}
            </Link>
          </div>
        </GlassCard>
      </main>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SuccessPageContent />
    </Suspense>
  );
}
