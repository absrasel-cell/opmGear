import React from 'react';
import { CheckIcon, TruckIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { OrderBuilderStatus } from '../types';

interface DeliverySectionProps {
  orderBuilderStatus: OrderBuilderStatus;
  currentQuoteData: any;
  leadTimeData: any;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

const DeliverySection = ({
  orderBuilderStatus,
  currentQuoteData,
  leadTimeData,
  isCollapsed,
  onToggleCollapse
}: DeliverySectionProps) => {
  const status = orderBuilderStatus.delivery.status;

  return (
    <div className={`p-3 rounded-xl border transition-all duration-300 ${
      status === 'green'
        ? 'border-green-400/30 bg-green-400/10'
        : 'border-red-400/30 bg-red-400/10'
    }`}>
      <div className="flex items-start gap-3">
        <div className={`h-7 w-7 rounded-full border grid place-items-center text-[11px] font-medium transition-colors ${
          status === 'green'
            ? 'border-green-400/30 bg-green-400/10 text-green-300'
            : 'border-red-400/30 bg-red-400/10 text-red-300'
        }`}>
          {orderBuilderStatus.delivery.completed ? (
            <CheckIcon className="h-4 w-4" />
          ) : (
            <TruckIcon className="h-4 w-4" />
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-medium tracking-tight text-white">Delivery</h4>
              <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                status === 'green'
                  ? 'border-green-400/30 bg-green-400/10 text-green-300'
                  : 'border-red-400/30 bg-red-400/10 text-red-300'
              }`}>
                {orderBuilderStatus.delivery.completed ? 'Ready' : 'Required'}
              </span>
            </div>
            <button
              onClick={onToggleCollapse}
              className="p-1 rounded-lg border border-stone-600 bg-black/30 backdrop-blur-sm hover:bg-black/40 transition-all duration-200"
            >
              <ChevronDownIcon
                className={`h-4 w-4 text-stone-300 transition-transform duration-200 ${
                  isCollapsed ? 'rotate-180' : ''
                }`}
              />
            </button>
          </div>
          {!isCollapsed && (
            <>
              {/* Professional Delivery Display */}
              {currentQuoteData?.delivery && (
                <div className="mt-2 space-y-3">
                  {(() => {
                    const quantity = currentQuoteData?.quantity || currentQuoteData?.pricing?.quantity || 0;
                    let messageContent = currentQuoteData?.message || currentQuoteData?.content || currentQuoteData?.originalMessage || '';

                    // Also try to get message from other possible sources
                    if (!messageContent && currentQuoteData?.aiResponse) {
                      messageContent = currentQuoteData.aiResponse;
                    }
                    if (!messageContent && currentQuoteData?.rawMessage) {
                      messageContent = currentQuoteData.rawMessage;
                    }

                    // Parse delivery costs from AI message
                    const deliveryMethods = [];
                    let totalDeliveryCost = 0;

                    console.log('🔍 [DELIVERY-DEBUG] Initial data check:', {
                      hasMessageContent: !!messageContent,
                      messageLength: messageContent?.length || 0,
                      quantity,
                      deliveryData: currentQuoteData?.delivery,
                      pricingData: currentQuoteData?.pricing,
                      keys: Object.keys(currentQuoteData || {})
                    });

                    if (messageContent && typeof messageContent === 'string' && quantity > 0) {
                      console.log('🔍 [DELIVERY] Parsing delivery costs from message...');

                      // Extract delivery costs (like "Regular Delivery: 288 pieces × $0.50 = $144.00")
                      const deliverySection = messageContent.match(/🚚 Delivery:(.*?)(?=💰|$)/s);
                      if (deliverySection) {
                        console.log('🔍 [DELIVERY] Found delivery section:', deliverySection[1]);
                        const deliveryText = deliverySection[1];

                        // Match delivery patterns
                        const deliveryMatches = deliveryText.match(/•(.*?):\s*\d+\s*pieces?\s*×\s*\$?([\d,]+\.?\d*)\s*=\s*\$?([\d,]+\.?\d*)/gi);
                        console.log('🔍 [DELIVERY] Delivery matches:', deliveryMatches);

                        if (deliveryMatches) {
                          deliveryMatches.forEach(match => {
                            const deliveryMatch = match.match(/•(.*?):\s*\d+\s*pieces?\s*×\s*\$?([\d,]+\.?\d*)\s*=\s*\$?([\d,]+\.?\d*)/i);
                            if (deliveryMatch) {
                              const methodName = deliveryMatch[1].trim();
                              const unitPrice = parseFloat(deliveryMatch[2].replace(',', ''));
                              const totalCost = parseFloat(deliveryMatch[3].replace(',', ''));

                              deliveryMethods.push({
                                name: methodName,
                                unitPrice,
                                totalCost: unitPrice * quantity
                              });

                              totalDeliveryCost += unitPrice * quantity;
                            }
                          });
                        }

                        // Also check for subtotal
                        const subtotalMatch = deliveryText.match(/Subtotal\s+Delivery:\s*\$?([\d,]+\.?\d*)/i);
                        if (subtotalMatch && deliveryMethods.length === 0) {
                          totalDeliveryCost = parseFloat(subtotalMatch[1].replace(',', ''));
                        }
                      }
                    }

                    // Fallback: Try to get delivery cost from structured data
                    if (deliveryMethods.length === 0 && totalDeliveryCost === 0 && quantity > 0) {
                      console.log('🔍 [DELIVERY-FALLBACK] No costs found via parsing, trying structured data...');

                      // Check for structured delivery cost data
                      if (currentQuoteData?.delivery?.cost && parseFloat(currentQuoteData.delivery.cost) > 0) {
                        totalDeliveryCost = parseFloat(currentQuoteData.delivery.cost);
                        const method = currentQuoteData?.delivery?.method || 'Regular Delivery';
                        deliveryMethods.push({
                          name: method,
                          unitPrice: totalDeliveryCost / quantity,
                          totalCost: totalDeliveryCost
                        });
                        console.log('🔍 [DELIVERY-FALLBACK] Found structured delivery cost:', totalDeliveryCost);
                      }
                      // Check pricing data
                      else if (currentQuoteData?.pricing?.deliveryCost && parseFloat(currentQuoteData.pricing.deliveryCost) > 0) {
                        totalDeliveryCost = parseFloat(currentQuoteData.pricing.deliveryCost);
                        deliveryMethods.push({
                          name: 'Regular Delivery',
                          unitPrice: totalDeliveryCost / quantity,
                          totalCost: totalDeliveryCost
                        });
                        console.log('🔍 [DELIVERY-FALLBACK] Found pricing delivery cost:', totalDeliveryCost);
                      }
                      // Standard fallback based on quantity ranges
                      else if (currentQuoteData?.delivery?.method || currentQuoteData?.delivery) {
                        console.log('🔍 [DELIVERY-FALLBACK] Using standard delivery rates...');
                        const standardRate = 0.50; // Standard rate per piece
                        totalDeliveryCost = standardRate * quantity;
                        deliveryMethods.push({
                          name: currentQuoteData?.delivery?.method || 'Regular Delivery',
                          unitPrice: standardRate,
                          totalCost: totalDeliveryCost
                        });
                        console.log('🔍 [DELIVERY-FALLBACK] Applied standard rate:', { standardRate, totalDeliveryCost });
                      }
                    }

                    console.log('🔍 [DELIVERY] Final results:', {
                      deliveryMethods,
                      totalDeliveryCost,
                      quantity,
                      hasDeliveryData: !!currentQuoteData?.delivery
                    });

                    return (
                      <>
                        {/* Delivery Methods & Cost Section */}
                        {(deliveryMethods.length > 0 || totalDeliveryCost > 0) ? (
                          <div className="p-3 rounded-lg border border-cyan-400/20 bg-cyan-400/5">
                            <div className="flex items-center gap-2 mb-2">
                              <TruckIcon className="h-4 w-4 text-cyan-400" />
                              <h5 className="text-xs font-medium text-cyan-300">Delivery Options</h5>
                            </div>

                            {deliveryMethods.length > 0 ? (
                              <div className="space-y-2">
                                {deliveryMethods.map((method, index) => (
                                  <div key={index} className="bg-black/20 rounded-md p-2">
                                    <div className="flex justify-between items-center mb-1">
                                      <span className="text-xs font-medium text-white">{method.name}</span>
                                      <span className="text-xs text-green-400 font-medium">${method.totalCost.toFixed(2)}</span>
                                    </div>
                                    <div className="text-[10px] text-white/70">
                                      ${method.unitPrice.toFixed(2)} × {quantity} pieces
                                      {method.name.includes('Standard') && quantity > 0 && (
                                        <span className="text-yellow-400/70 ml-2">(estimated)</span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="bg-black/20 rounded-md p-2">
                                <div className="flex justify-between items-center">
                                  <span className="text-xs font-medium text-white">Delivery Cost</span>
                                  <span className="text-xs text-green-400 font-medium">${totalDeliveryCost.toFixed(2)}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          /* Fallback for basic delivery info */
                          <div className="p-3 rounded-lg border border-cyan-400/20 bg-cyan-400/5">
                            <div className="flex items-center gap-2 mb-2">
                              <TruckIcon className="h-4 w-4 text-cyan-400" />
                              <h5 className="text-xs font-medium text-cyan-300">Current AI Values</h5>
                            </div>
                            <div className="bg-black/20 rounded-md p-2">
                              <div className="space-y-1 text-[10px]">
                                {currentQuoteData.delivery.method && (
                                  <div className="text-white/70">Method: <span className="text-white">{currentQuoteData.delivery.method}</span></div>
                                )}
                                {currentQuoteData.delivery.leadTime && (
                                  <div className="text-white/70">Lead Time: <span className="text-white">{currentQuoteData.delivery.leadTime}</span></div>
                                )}
                                {currentQuoteData.delivery.cost && (
                                  <div className="text-white/70">Cost: <span className="text-green-400 font-medium">${currentQuoteData.delivery.cost}</span></div>
                                )}
                                {currentQuoteData.delivery.address && (
                                  <div className="text-white/70">Address: <span className="text-white">{currentQuoteData.delivery.address}</span></div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}

              {/* Professional Lead Time Section */}
              {leadTimeData && (
                <div className="p-3 rounded-lg border border-indigo-400/20 bg-indigo-400/5">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="h-4 w-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h5 className="text-xs font-medium text-indigo-300">Lead Time Calculator</h5>
                  </div>

                  <div className="space-y-2">
                    {/* Main Lead Time Display */}
                    {leadTimeData.estimatedDays && (
                      <div className="bg-black/20 rounded-md p-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-medium text-white">Estimated Production Time</span>
                          <span className="text-sm font-bold text-indigo-400">{leadTimeData.estimatedDays} days</span>
                        </div>
                        {leadTimeData.deliveryDate && (
                          <div className="text-[10px] text-white/70 mt-1">
                            Estimated delivery: {leadTimeData.deliveryDate}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Breakdown Details */}
                    {leadTimeData.breakdown && Object.keys(leadTimeData.breakdown).length > 0 && (
                      <div className="bg-black/20 rounded-md p-2">
                        <div className="text-xs font-medium text-white mb-2">Production Breakdown</div>
                        <div className="space-y-1">
                          {Object.entries(leadTimeData.breakdown).map(([key, value]: [string, any]) => (
                            <div key={key} className="flex justify-between text-[10px] text-white/70">
                              <span>{key.charAt(0).toUpperCase() + key.slice(1)}:</span>
                              <span className="text-white">{value} days</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Additional Lead Time Info */}
                    {leadTimeData.details && leadTimeData.details.length > 0 && (
                      <div className="bg-black/20 rounded-md p-2">
                        <div className="text-xs font-medium text-white mb-2">Production Steps</div>
                        <div className="space-y-1">
                          {leadTimeData.details.map((detail: any, index: number) => (
                            <div key={index} className="text-[10px] text-white/70">
                              • {typeof detail === 'string' ? detail : detail.step || detail.description || 'Production step'}
                              {(detail.days || detail.time) && (
                                <span className="text-white ml-2">({detail.days || detail.time} days)</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Status Grid */}
              <div className="mt-2 grid grid-cols-3 gap-1 text-[10px]">
                {[
                  { key: 'method', label: 'Method' },
                  { key: 'leadTime', label: 'Lead Time' },
                  { key: 'address', label: 'Address' }
                ].map((item) => (
                  <div key={item.key} className="flex items-center gap-1">
                    {orderBuilderStatus.delivery.items[item.key as keyof typeof orderBuilderStatus.delivery.items] ? (
                      <CheckIcon className="h-3 w-3 text-green-400" />
                    ) : (
                      <div className="h-3 w-3 rounded-full border border-stone-500" />
                    )}
                    <span className="text-stone-300">{item.label}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default DeliverySection;