import React from 'react';
import { CheckIcon, CogIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { OrderBuilderStatus } from '../types';

interface CustomizationSectionProps {
  orderBuilderStatus: OrderBuilderStatus;
  currentQuoteData: any;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

const CustomizationSection = ({
  orderBuilderStatus,
  currentQuoteData,
  isCollapsed,
  onToggleCollapse
}: CustomizationSectionProps) => {
  const status = orderBuilderStatus.customization.status;

  return (
    <div className={`p-3 rounded-xl border transition-all duration-300 ${
      status === 'green'
        ? 'border-green-400/30 bg-green-400/10'
        : status === 'yellow'
        ? 'border-yellow-400/30 bg-yellow-400/10'
        : 'border-red-400/30 bg-red-400/10'
    }`}>
      <div className="flex items-start gap-3">
        <div className={`h-7 w-7 rounded-full border grid place-items-center text-[11px] font-medium transition-colors ${
          status === 'green'
            ? 'border-green-400/30 bg-green-400/10 text-green-300'
            : status === 'yellow'
            ? 'border-yellow-400/30 bg-yellow-400/10 text-yellow-300'
            : 'border-red-400/30 bg-red-400/10 text-red-300'
        }`}>
          {orderBuilderStatus.customization.completed ? (
            <CheckIcon className="h-4 w-4" />
          ) : (
            <CogIcon className="h-4 w-4" />
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-medium tracking-tight text-white">Customization</h4>
              <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                status === 'green'
                  ? 'border-green-400/30 bg-green-400/10 text-green-300'
                  : status === 'yellow'
                  ? 'border-yellow-400/30 bg-yellow-400/10 text-yellow-300'
                  : 'border-red-400/30 bg-red-400/10 text-red-300'
              }`}>
                {status === 'green' ? 'Complete' :
                 status === 'yellow' ? 'Optional' : 'Empty'}
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
              {/* Professional Customization Display - Use structured data */}
              {currentQuoteData?.customization && (
                <div className="mt-2 space-y-3">
                  {(() => {
                    console.log('🔍 [CUSTOMIZATION] Using structured data:', currentQuoteData.customization);

                    const quantity = currentQuoteData?.capDetails?.quantity || 100;
                    const logos = currentQuoteData?.customization?.logos || [];
                    const accessories = currentQuoteData?.customization?.accessories || [];

                    // Use structured data instead of parsing message
                    const logoCosts = logos.map(logo => ({
                      name: typeof logo.type === 'string' ? logo.type : (logo.type ? String(logo.type) : 'Unknown'),
                      position: typeof logo.location === 'object'
                        ? Object.keys(logo.location)[0]
                        : logo.location || (typeof logo.position === 'object'
                          ? Object.keys(logo.position)[0]
                          : logo.position) || 'Unknown', // Ensure always a string
                      size: typeof logo.size === 'string' ? logo.size : (logo.size ? String(logo.size) : 'Unknown'),
                      unitPrice: logo.unitPrice,
                      totalCost: logo.totalCost,
                      moldCharge: logo.moldCharge || 0,
                      quantity: quantity
                    }));

                    const accessoryCosts = accessories.map(accessory => ({
                      name: typeof accessory.name === 'string' ? accessory.name : (accessory.name ? String(accessory.name) : 'Unknown'),
                      unitPrice: accessory.unitPrice,
                      totalCost: accessory.totalCost,
                      quantity: quantity
                    }));

                    const moldCharges = logos.reduce((sum, logo) => sum + (logo.moldCharge || 0), 0);

                    console.log('🔍 [CUSTOMIZATION] Using structured data:', {
                      logoCosts,
                      accessoryCosts,
                      moldCharges,
                      quantity
                    });

                    return (
                      <>
                        {/* Logo Setup Section */}
                        {logoCosts.length > 0 && (
                          <div className="p-3 rounded-lg border border-amber-400/20 bg-amber-400/5">
                            <div className="flex items-center gap-2 mb-2">
                              <CogIcon className="h-4 w-4 text-amber-400" />
                              <h5 className="text-xs font-medium text-amber-300">Logo Setup</h5>
                            </div>
                            <div className="space-y-2">
                              {logoCosts.map((logo, index) => (
                                <div key={index} className="bg-black/20 rounded-md p-2">
                                  <div className="flex justify-between items-start mb-1">
                                    <span className="text-xs font-medium text-white">
                                      {logo.position || 'Unknown'}: {logo.name || 'Unknown'} ({logo.size || 'Unknown'})
                                    </span>
                                    <span className="text-xs text-green-400 font-medium">${logo.totalCost.toFixed(2)}</span>
                                  </div>
                                  <div className="grid grid-cols-2 gap-2 text-[10px] text-white/70">
                                    <div>Unit Cost: <span className="text-white">${logo.unitPrice.toFixed(2)}</span></div>
                                    <div>Base Cost: <span className="text-white">${(logo.unitPrice * quantity).toFixed(2)}</span></div>
                                    {logo.moldCharge > 0 && (
                                      <>
                                        <div>Mold Charge: <span className="text-orange-400">${logo.moldCharge.toFixed(2)}</span></div>
                                        <div>Quantity: <span className="text-white">{quantity} pieces</span></div>
                                      </>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Accessories Section */}
                        {accessoryCosts.length > 0 && (
                          <div className="p-3 rounded-lg border border-purple-400/20 bg-purple-400/5">
                            <div className="flex items-center gap-2 mb-2">
                              <svg className="h-4 w-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                              </svg>
                              <h5 className="text-xs font-medium text-purple-300">Accessories</h5>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {accessoryCosts.map((accessory, index) => (
                                <div key={index} className="bg-black/20 rounded-md p-2">
                                  <div className="flex justify-between items-center mb-1">
                                    <span className="text-xs font-medium text-white">{accessory.name}</span>
                                    <span className="text-xs text-green-400 font-medium">${accessory.totalCost.toFixed(2)}</span>
                                  </div>
                                  <div className="text-[10px] text-white/70">
                                    ${accessory.unitPrice.toFixed(2)} × {quantity} pieces
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Mold Charges Section */}
                        {moldCharges > 0 && (
                          <div className="p-3 rounded-lg border border-orange-400/20 bg-orange-400/5">
                            <div className="flex items-center gap-2 mb-2">
                              <svg className="h-4 w-4 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                              </svg>
                              <h5 className="text-xs font-medium text-orange-300">Mold Charges</h5>
                            </div>
                            <div className="bg-black/20 rounded-md p-2">
                              <div className="flex justify-between items-center">
                                <span className="text-xs text-white/70">One-time setup fees</span>
                                <span className="text-sm font-bold text-orange-400">${moldCharges.toFixed(2)}</span>
                              </div>
                              <div className="text-[10px] text-white/50 mt-1">
                                Applied to logo methods requiring custom molds
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Enhanced Fallback Display with Professional Styling */}
                        {logoCosts.length === 0 && accessoryCosts.length === 0 && moldCharges === 0 && (
                          <>
                            {console.log('🔍 [CUSTOMIZATION-FALLBACK] Using fallback display:', {
                              customizationKeys: Object.keys(currentQuoteData.customization || {}),
                              logosCount: currentQuoteData.customization?.logos?.length || 0,
                              accessoriesCount: currentQuoteData.customization?.accessories?.length || 0
                            })}

                            {/* Logo Setup Section - Professional Style */}
                            {currentQuoteData.customization.logos && currentQuoteData.customization.logos.length > 0 && (
                              <div className="p-3 rounded-lg border border-amber-400/20 bg-amber-400/5">
                                <div className="flex items-center gap-2 mb-2">
                                  <CogIcon className="h-4 w-4 text-amber-400" />
                                  <h5 className="text-xs font-medium text-amber-300">Logo Setup</h5>
                                </div>
                                <div className="space-y-2">
                                  {currentQuoteData.customization.logos.map((logo: any, index: number) => {
                                    // Extract costs if available in the logo object
                                    const unitCost = logo.unitCost || logo.cost || 0;
                                    const moldCharge = logo.moldCharge || 0;
                                    const totalCost = logo.totalCost || (unitCost * quantity) + moldCharge;

                                    return (
                                      <div key={index} className="bg-black/20 rounded-md p-2">
                                        <div className="flex justify-between items-start mb-1">
                                          <span className="text-xs font-medium text-white">
                                            {typeof logo.location === 'object' ? Object.keys(logo.location)[0] : (logo.location || 'Unknown')}: {typeof logo.type === 'string' ? logo.type : String(logo.type || 'Unknown')} ({typeof logo.size === 'string' ? logo.size : String(logo.size || 'Unknown')})
                                          </span>
                                          {totalCost > 0 && (
                                            <span className="text-xs text-green-400 font-medium">${totalCost.toFixed(2)}</span>
                                          )}
                                        </div>
                                        {(unitCost > 0 || moldCharge > 0) && (
                                          <div className="grid grid-cols-2 gap-2 text-[10px] text-white/70">
                                            {unitCost > 0 && (
                                              <>
                                                <div>Unit Cost: <span className="text-white">${unitCost.toFixed(2)}</span></div>
                                                <div>Base Cost: <span className="text-white">${(unitCost * quantity).toFixed(2)}</span></div>
                                              </>
                                            )}
                                            {moldCharge > 0 && (
                                              <>
                                                <div>Mold Charge: <span className="text-orange-400">${moldCharge.toFixed(2)}</span></div>
                                                <div>Quantity: <span className="text-white">{quantity} pieces</span></div>
                                              </>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* Accessories Section - Professional Style */}
                            {currentQuoteData.customization.accessories && currentQuoteData.customization.accessories.length > 0 && (
                              <div className="p-3 rounded-lg border border-purple-400/20 bg-purple-400/5">
                                <div className="flex items-center gap-2 mb-2">
                                  <svg className="h-4 w-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                  </svg>
                                  <h5 className="text-xs font-medium text-purple-300">Accessories</h5>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {currentQuoteData.customization.accessories.map((accessory: any, idx: number) => {
                                    // Handle different accessory data types and extract costs
                                    let name, unitCost, totalCost, qty;

                                    if (typeof accessory === 'string') {
                                      name = accessory;
                                      unitCost = 0;
                                      totalCost = 0;
                                      qty = quantity;
                                    } else if (accessory && typeof accessory === 'object') {
                                      name = accessory.accessoryType || accessory.name || accessory.type || 'Unknown Accessory';
                                      qty = accessory.qty || accessory.quantity || quantity;
                                      unitCost = accessory.unitCost || accessory.cost || 0;
                                      totalCost = accessory.subtotal || (unitCost * qty);
                                    } else {
                                      name = 'Unknown Accessory';
                                      unitCost = 0;
                                      totalCost = 0;
                                      qty = quantity;
                                    }

                                    return (
                                      <div key={idx} className="bg-black/20 rounded-md p-2">
                                        <div className="flex justify-between items-center mb-1">
                                          <span className="text-xs font-medium text-white">{name}</span>
                                          {totalCost > 0 && (
                                            <span className="text-xs text-green-400 font-medium">${totalCost.toFixed(2)}</span>
                                          )}
                                        </div>
                                        {unitCost > 0 && (
                                          <div className="text-[10px] text-white/70">
                                            ${unitCost.toFixed(2)} × {qty} pieces
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* Generic Setup Info if no specific data */}
                            {(!currentQuoteData.customization.logos || currentQuoteData.customization.logos.length === 0) &&
                             (!currentQuoteData.customization.accessories || currentQuoteData.customization.accessories.length === 0) &&
                             currentQuoteData.customization.logoSetup && (
                              <div className="p-3 rounded-lg border border-amber-400/20 bg-amber-400/5">
                                <div className="flex items-center gap-2 mb-2">
                                  <CogIcon className="h-4 w-4 text-amber-400" />
                                  <h5 className="text-xs font-medium text-amber-300">Current AI Values</h5>
                                </div>
                                <div className="text-[10px] text-white/70">
                                  Logo Setup: <span className="text-white">{
                                    typeof currentQuoteData.customization.logoSetup === 'string'
                                      ? currentQuoteData.customization.logoSetup
                                      : typeof currentQuoteData.customization.logoSetup === 'object' && currentQuoteData.customization.logoSetup !== null
                                        ? JSON.stringify(currentQuoteData.customization.logoSetup)
                                        : 'Not specified'
                                  }</span>
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}

              {/* Status Grid - Horizontal Layout */}
              <div className="mt-2 grid grid-cols-3 gap-1 text-[10px]">
                {[
                  { key: 'logoSetup', label: 'Logo Setup' },
                  { key: 'accessories', label: 'Accessories' },
                  { key: 'moldCharges', label: 'Mold Charges' }
                ].map((item) => (
                  <div key={item.key} className="flex items-center gap-1">
                    {orderBuilderStatus.customization.items[item.key as keyof typeof orderBuilderStatus.customization.items] ? (
                      <CheckIcon className="h-3 w-3 text-green-400" />
                    ) : (
                      <div className="h-3 w-3 rounded-full border border-stone-500" />
                    )}
                    <span className="text-stone-300">{item.label}</span>
                  </div>
                ))}
              </div>
              {orderBuilderStatus.customization.logoPositions.length > 0 && (
                <div className="mt-1 text-[9px] text-white/50">
                  Logo positions: {orderBuilderStatus.customization.logoPositions.map(pos =>
                    typeof pos === 'object' ? Object.keys(pos)[0] : (pos || 'Unknown')
                  ).join(', ')}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomizationSection;