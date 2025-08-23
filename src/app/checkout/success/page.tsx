'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircleIcon } from '@heroicons/react/24/outline';

export default function SuccessPage() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');
  const orders = searchParams.get('orders'); // Multiple order IDs from cart
  const total = searchParams.get('total'); // Total amount paid
  const [orderDetails, setOrderDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (orderId || orders) {
      // Handle both single order and multiple orders from cart
      const orderData = {
        orderId: orderId,
        orderIds: orders ? orders.split(',') : [orderId],
        total: total ? parseFloat(total) : null,
        isMultipleOrders: !!orders
      };
      setOrderDetails(orderData);
      setLoading(false);
    }
  }, [orderId, orders, total]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-3xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
          {/* Success Header */}
          <div className="text-center mb-8">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/20 mb-4">
              <CheckCircleIcon className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              {orderDetails?.isMultipleOrders ? 'Orders Submitted Successfully!' : 'Order Submitted Successfully!'}
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              {orderDetails?.isMultipleOrders 
                ? `Thank you for your ${orderDetails.orderIds.length} orders. We'll process them and get back to you soon.`
                : 'Thank you for your order. We\'ll process it and get back to you soon.'
              }
            </p>
          </div>

          {/* Order Details */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Order Details
            </h2>
            <div className="space-y-3">
              {orderDetails?.isMultipleOrders ? (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Order IDs:</span>
                    <div className="text-right">
                      {orderDetails.orderIds.map((id: string, index: number) => (
                        <div key={id} className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                          #{id}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Total Items:</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {orderDetails.orderIds.length} orders
                    </span>
                  </div>
                  {orderDetails.total && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Total Amount:</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        ${orderDetails.total.toFixed(2)}
                      </span>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Order ID:</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {orderDetails?.orderId || 'N/A'}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Status:</span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">
                  Pending
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Submitted:</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}
                </span>
              </div>
            </div>
          </div>

          {/* Next Steps */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 mb-8">
            <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-4">
              What happens next?
            </h3>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">1</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    Order Review
                  </p>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    Our team will review your order and confirm all details.
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">2</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    Confirmation Email
                  </p>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    You'll receive a confirmation email with order details and timeline.
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">3</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    Production & Shipping
                  </p>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    We'll begin production and keep you updated on progress.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Need Help?
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              If you have any questions about your order, please don't hesitate to contact us.
            </p>
            <div className="space-y-2">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <span className="font-medium">Email:</span> orders@customcap.com
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <span className="font-medium">Phone:</span> (555) 123-4567
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <span className="font-medium">Reference:</span> 
                {orderDetails?.isMultipleOrders 
                  ? ` Orders #${orderDetails.orderIds.join(', #')}`
                  : ` Order #${orderDetails?.orderId || orderId}`
                }
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href="/store"
              className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200 text-center"
            >
              Continue Shopping
            </Link>
            <Link
              href="/dashboard"
              className="flex-1 px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors duration-200 text-center"
            >
              View Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
