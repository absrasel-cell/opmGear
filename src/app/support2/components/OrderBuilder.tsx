import React from 'react';
import { OrderBuilderStatus, LeadTimeData, QuoteVersion } from '../types/orderBuilder';
import {
  CheckIcon,
  ClipboardDocumentListIcon,
  CogIcon,
  TruckIcon,
  CurrencyDollarIcon,
  CalculatorIcon,
  ArchiveBoxIcon,
  CalendarDaysIcon,
  ScaleIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline';

interface OrderBuilderProps {
  orderBuilderStatus: OrderBuilderStatus;
  leadTimeData: LeadTimeData | null;
  collapsedBlocks: Record<string, boolean>;
  isCalculatingLeadTime: boolean;
  onToggleBlock: (blockName: string) => void;
  onSelectQuoteVersion: (versionId: string) => void;
  onSaveQuote: () => void;
  onQuoteOrder?: () => void;
  onPlaceOrder?: () => void;
  canQuoteOrder?: boolean;
  canPlaceOrder?: boolean;
  isVisible: boolean;
}

export const OrderBuilder: React.FC<OrderBuilderProps> = ({
  orderBuilderStatus,
  leadTimeData,
  collapsedBlocks,
  isCalculatingLeadTime,
  onToggleBlock,
  onSelectQuoteVersion,
  onSaveQuote,
  onQuoteOrder,
  onPlaceOrder,
  canQuoteOrder,
  canPlaceOrder,
  isVisible
}) => {
  if (!isVisible) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'green': return 'text-green-400 bg-green-500/20 border-green-500/30';
      case 'yellow': return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30';
      case 'red': return 'text-red-400 bg-red-500/20 border-red-500/30';
      default: return 'text-gray-400 bg-gray-500/20 border-gray-500/30';
    }
  };

  const BlockHeader: React.FC<{
    title: string;
    icon: React.ReactNode;
    status: string;
    isCollapsed: boolean;
    onToggle: () => void;
  }> = ({ title, icon, status, isCollapsed, onToggle }) => (
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
    >
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg border ${getStatusColor(status)}`}>
          {icon}
        </div>
        <h3 className="font-semibold text-white">{title}</h3>
      </div>
      <ChevronDownIcon 
        className={`w-5 h-5 text-gray-400 transition-transform ${isCollapsed ? '' : 'rotate-180'}`} 
      />
    </button>
  );

  const selectedVersion = orderBuilderStatus.costBreakdown.versions.find(
    v => v.id === orderBuilderStatus.costBreakdown.selectedVersionId
  );

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Order Builder</h2>
        <p className="text-gray-300">Configure your custom cap order</p>
      </div>

      {/* Cap Style Setup */}
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl overflow-hidden">
        <BlockHeader
          title="Cap Style Setup"
          icon={<ClipboardDocumentListIcon className="w-5 h-5" />}
          status={orderBuilderStatus.capStyle.status}
          isCollapsed={collapsedBlocks.capStyle}
          onToggle={() => onToggleBlock('capStyle')}
        />
        {!collapsedBlocks.capStyle && (
          <div className="px-4 pb-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(orderBuilderStatus.capStyle.items).map(([key, completed]) => (
                <div key={key} className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                    completed ? 'bg-green-500 border-green-500' : 'border-gray-400'
                  }`}>
                    {completed && <CheckIcon className="w-3 h-3 text-white" />}
                  </div>
                  <span className="text-sm text-gray-300 capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Customization Options */}
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl overflow-hidden">
        <BlockHeader
          title="Customization Options"
          icon={<CogIcon className="w-5 h-5" />}
          status={orderBuilderStatus.customization.status}
          isCollapsed={collapsedBlocks.customization}
          onToggle={() => onToggleBlock('customization')}
        />
        {!collapsedBlocks.customization && (
          <div className="px-4 pb-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {Object.entries(orderBuilderStatus.customization.items).map(([key, completed]) => (
                <div key={key} className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                    completed ? 'bg-green-500 border-green-500' : 'border-gray-400'
                  }`}>
                    {completed && <CheckIcon className="w-3 h-3 text-white" />}
                  </div>
                  <span className="text-sm text-gray-300 capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </span>
                </div>
              ))}
            </div>
            {orderBuilderStatus.customization.logoPositions.length > 0 && (
              <div className="mt-3 pt-3 border-t border-white/10">
                <p className="text-sm text-gray-300 mb-2">Logo Positions:</p>
                <div className="flex gap-2 flex-wrap">
                  {orderBuilderStatus.customization.logoPositions.map((position, index) => (
                    <span key={index} className="bg-lime-500/20 text-lime-400 px-3 py-1 rounded-full text-xs">
                      {position}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Delivery Options */}
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl overflow-hidden">
        <BlockHeader
          title="Delivery Options"
          icon={<TruckIcon className="w-5 h-5" />}
          status={orderBuilderStatus.delivery.status}
          isCollapsed={collapsedBlocks.delivery}
          onToggle={() => onToggleBlock('delivery')}
        />
        {!collapsedBlocks.delivery && (
          <div className="px-4 pb-4">
            <div className="flex items-center gap-2">
              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                orderBuilderStatus.delivery.completed ? 'bg-green-500 border-green-500' : 'border-gray-400'
              }`}>
                {orderBuilderStatus.delivery.completed && <CheckIcon className="w-3 h-3 text-white" />}
              </div>
              <span className="text-sm text-gray-300">
                Delivery method configured
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Cost Breakdown & Production Timeline */}
      {orderBuilderStatus.costBreakdown.available && (
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl overflow-hidden">
          <BlockHeader
            title="Cost Breakdown & Production Timeline"
            icon={<CurrencyDollarIcon className="w-5 h-5" />}
            status="green"
            isCollapsed={collapsedBlocks.costBreakdown}
            onToggle={() => onToggleBlock('costBreakdown')}
          />
          {!collapsedBlocks.costBreakdown && (
            <div className="px-4 pb-4 space-y-4">
              {/* Quote Versions */}
              {orderBuilderStatus.costBreakdown.versions.length > 1 && (
                <div>
                  <p className="text-sm text-gray-300 mb-2">Quote Versions:</p>
                  <div className="flex gap-2 flex-wrap">
                    {orderBuilderStatus.costBreakdown.versions.map((version) => (
                      <button
                        key={version.id}
                        onClick={() => onSelectQuoteVersion(version.id)}
                        className={`px-3 py-1 rounded-full text-xs transition-colors ${
                          orderBuilderStatus.costBreakdown.selectedVersionId === version.id
                            ? 'bg-lime-500/30 text-lime-400 border border-lime-500/50'
                            : 'bg-white/10 text-gray-300 border border-white/20 hover:bg-white/20'
                        }`}
                      >
                        Version {version.version} - ${version.pricing.total.toLocaleString()}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Cost Details */}
              {selectedVersion && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white/5 rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <CalculatorIcon className="w-4 h-4 text-blue-400" />
                      <span className="text-xs text-gray-400">Base Cost</span>
                    </div>
                    <p className="text-lg font-semibold text-white">
                      ${selectedVersion.pricing.baseProductCost.toLocaleString()}
                    </p>
                  </div>
                  
                  <div className="bg-white/5 rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <CogIcon className="w-4 h-4 text-purple-400" />
                      <span className="text-xs text-gray-400">Logos</span>
                    </div>
                    <p className="text-lg font-semibold text-white">
                      ${selectedVersion.pricing.logosCost.toLocaleString()}
                    </p>
                  </div>
                  
                  <div className="bg-white/5 rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <TruckIcon className="w-4 h-4 text-orange-400" />
                      <span className="text-xs text-gray-400">Delivery</span>
                    </div>
                    <p className="text-lg font-semibold text-white">
                      ${selectedVersion.pricing.deliveryCost.toLocaleString()}
                    </p>
                  </div>
                  
                  <div className="bg-lime-500/20 border border-lime-500/30 rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <CurrencyDollarIcon className="w-4 h-4 text-lime-400" />
                      <span className="text-xs text-lime-400">Total</span>
                    </div>
                    <p className="text-lg font-semibold text-lime-400">
                      ${selectedVersion.pricing.total.toLocaleString()}
                    </p>
                  </div>
                </div>
              )}

              {/* Production Timeline & Packaging */}
              {(leadTimeData?.leadTime || leadTimeData?.boxes || isCalculatingLeadTime) && (
                <div className="space-y-4">
                  {/* Lead Time */}
                  {leadTimeData?.leadTime && (
                    <div className="bg-white/5 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <CalendarDaysIcon className="w-5 h-5 text-blue-400" />
                        <h4 className="font-semibold text-white">Production Timeline</h4>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-300 mb-1">Total Production Time</p>
                          <p className="text-lg font-semibold text-white">
                            {leadTimeData.leadTime.totalDays} days
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-300 mb-1">Estimated Delivery</p>
                          <p className="text-lg font-semibold text-white">
                            {new Date(leadTimeData.leadTime.deliveryDate).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      {leadTimeData.leadTime.details.length > 0 && (
                        <div className="mt-3">
                          <p className="text-sm text-gray-300 mb-2">Production Steps:</p>
                          <ul className="space-y-1">
                            {leadTimeData.leadTime.details.map((detail, index) => (
                              <li key={index} className="text-sm text-gray-400 flex items-center gap-2">
                                <div className="w-1.5 h-1.5 bg-lime-400 rounded-full"></div>
                                {detail}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Packaging Details */}
                  {leadTimeData?.boxes && (
                    <div className="bg-white/5 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <ArchiveBoxIcon className="w-5 h-5 text-orange-400" />
                        <h4 className="font-semibold text-white">Packaging Details</h4>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div>
                          <p className="text-sm text-gray-300">Total Boxes</p>
                          <p className="text-lg font-semibold text-white">
                            {leadTimeData.boxes.totalBoxes}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-300">Net Weight</p>
                          <p className="text-lg font-semibold text-white">
                            {leadTimeData.boxes.netWeightKg}kg
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-300">Chargeable Weight</p>
                          <p className="text-lg font-semibold text-white">
                            {leadTimeData.boxes.chargeableWeightKg}kg
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-300">Box Lines</p>
                          <p className="text-lg font-semibold text-white">
                            {leadTimeData.boxes.lines.length}
                          </p>
                        </div>
                      </div>
                      {leadTimeData.boxes.lines.length > 0 && (
                        <div>
                          <p className="text-sm text-gray-300 mb-2">Box Breakdown:</p>
                          <div className="space-y-2">
                            {leadTimeData.boxes.lines.map((line, index) => (
                              <div key={index} className="bg-white/5 rounded-lg p-3 flex justify-between items-center">
                                <div>
                                  <p className="text-sm font-medium text-white">{line.label}</p>
                                  <p className="text-xs text-gray-400">{line.dimensions}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm text-white">{line.count} boxes</p>
                                  <p className="text-xs text-gray-400">{line.pieces} pieces</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {isCalculatingLeadTime && (
                    <div className="bg-white/5 rounded-xl p-4 text-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-lime-400 mx-auto mb-2"></div>
                      <p className="text-sm text-gray-300">Calculating production timeline...</p>
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons - Integrated in Order Builder */}
              {(onQuoteOrder || onPlaceOrder || onSaveQuote) && (
                <div className="pt-4 border-t border-stone-600">
                  <div className="space-y-3">
                    {/* Quote Order and Place Order Buttons */}
                    {(onQuoteOrder || onPlaceOrder) && (
                      <div className="flex items-center justify-between gap-3">
                        {onQuoteOrder && (
                          <button 
                            onClick={onQuoteOrder}
                            disabled={!canQuoteOrder}
                            className={`px-4 py-2 rounded-full text-sm font-medium tracking-tight border transition-all duration-300 flex-1 ${
                              canQuoteOrder
                                ? 'border-green-400/30 bg-green-400/10 text-green-300 hover:bg-green-400/15 hover:border-green-300/50 hover:text-green-200'
                                : 'border-stone-600 text-white/50 cursor-not-allowed bg-black/30 backdrop-blur-sm'
                            }`}
                          >
                            Accept Quote
                          </button>
                        )}
                        
                        {onPlaceOrder && (
                          <button
                            onClick={onPlaceOrder}
                            disabled={!canPlaceOrder}
                            className={`px-4 py-2 rounded-full text-sm font-medium tracking-tight border transition-all duration-300 flex-1 ${
                              canPlaceOrder
                                ? 'border-blue-400/30 bg-blue-400/10 text-blue-300 hover:bg-blue-400/15 hover:border-blue-300/50 hover:text-blue-200'
                                : 'border-stone-600 text-white/50 cursor-not-allowed bg-black/30 backdrop-blur-sm'
                            }`}
                          >
                            Place Order
                          </button>
                        )}
                      </div>
                    )}
                    
                    {/* Save Quote Button */}
                    {onSaveQuote && (
                      <div className="flex justify-center">
                        <button
                          onClick={onSaveQuote}
                          className="bg-lime-500/20 hover:bg-lime-500/30 border border-lime-500/30 text-lime-400 font-medium px-6 py-3 rounded-xl transition-all duration-200 flex items-center gap-2"
                        >
                          <CheckIcon className="w-5 h-5" />
                          Save Quote to Dashboard
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};