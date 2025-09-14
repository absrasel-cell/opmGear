import React from 'react';
import {
  CheckIcon,
  CalculatorIcon,
  ChevronDownIcon,
  CurrencyDollarIcon,
  CalendarDaysIcon,
  ArchiveBoxIcon,
  ScaleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { OrderBuilderStatus } from '../types';

interface CostBreakdownSectionProps {
  orderBuilderStatus: OrderBuilderStatus;
  currentQuoteData: any;
  leadTimeData: any;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onSelectVersion?: (versionId: string) => void;
}

const CostBreakdownSection = ({
  orderBuilderStatus,
  currentQuoteData,
  leadTimeData,
  isCollapsed,
  onToggleCollapse,
  onSelectVersion
}: CostBreakdownSectionProps) => {
  // Only show if there are quote versions available
  if (!orderBuilderStatus.costBreakdown.completed || orderBuilderStatus.costBreakdown.versions.length === 0) {
    return null;
  }

  return (
    <div className="p-3 rounded-xl border transition-all duration-300 border-blue-400/30 bg-blue-400/10">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CurrencyDollarIcon className="h-4 w-4 text-blue-400" />
            <h4 className="text-sm font-medium tracking-tight text-white">Cost Breakdown</h4>
            <span className="text-[10px] px-2 py-0.5 rounded-full border border-blue-400/30 bg-blue-400/10 text-blue-300">
              {orderBuilderStatus.costBreakdown.versions.length} Quote{orderBuilderStatus.costBreakdown.versions.length !== 1 ? 's' : ''}
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
            {/* Quote Version Cards */}
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {orderBuilderStatus.costBreakdown.versions.map((version: any) => {
                const isSelected = version.id === orderBuilderStatus.costBreakdown.selectedVersionId;

                return (
                  <div
                    key={version.id}
                    className={`p-3 rounded-xl border cursor-pointer transition-all duration-300 ${
                      isSelected
                        ? 'border-blue-400/40 bg-blue-400/15 ring-1 ring-blue-400/20'
                        : 'border-stone-600 bg-black/30 backdrop-blur-sm hover:border-blue-400/20 hover:bg-blue-400/5'
                    }`}
                    onClick={() => onSelectVersion?.(version.id)}
                  >
                    {/* Version Header */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`h-5 w-5 rounded-full border grid place-items-center transition-colors ${
                          isSelected
                            ? 'border-blue-400/40 bg-blue-400/20 text-blue-300'
                            : 'border-stone-500 bg-black/30 backdrop-blur-sm text-stone-300'
                        }`}>
                          {isSelected ? (
                            <CheckIcon className="h-3 w-3" />
                          ) : (
                            <span className="text-[10px] font-medium">V{version.version}</span>
                          )}
                        </div>
                        <span className={`text-xs font-medium ${
                          isSelected ? 'text-white/95' : 'text-stone-200'
                        }`}>
                          {version.label || `Version ${version.version}`}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className={`text-sm font-bold ${
                          isSelected ? 'text-blue-300' : 'text-white/70'
                        }`}>
                          ${version.pricing.total.toFixed(2)}
                        </div>
                        <div className={`text-[10px] ${
                          isSelected ? 'text-lime-300' : 'text-white/50'
                        }`}>
                          ${(version.pricing.total / version.pricing.quantity).toFixed(2)}/cap
                        </div>
                      </div>
                    </div>

                    {/* Quick Cost Overview */}
                    <div className="grid grid-cols-3 gap-2 text-[10px]">
                      <div className="text-center">
                        <div className={`font-medium ${
                          isSelected ? 'text-emerald-300' : 'text-stone-300'
                        }`}>
                          ${version.pricing.baseProductCost.toFixed(2)}
                        </div>
                        <div className={`${isSelected ? 'text-white/70' : 'text-white/50'}`}>Caps</div>
                      </div>
                      <div className="text-center">
                        <div className={`font-medium ${
                          isSelected ? 'text-amber-300' : 'text-stone-300'
                        }`}>
                          ${version.pricing.logosCost.toFixed(2)}
                        </div>
                        <div className={`${isSelected ? 'text-white/70' : 'text-white/50'}`}>Logos</div>
                      </div>
                      <div className="text-center">
                        <div className={`font-medium ${
                          isSelected ? 'text-cyan-300' : 'text-stone-300'
                        }`}>
                          ${version.pricing.deliveryCost.toFixed(2)}
                        </div>
                        <div className={`${isSelected ? 'text-white/70' : 'text-white/50'}`}>Delivery</div>
                      </div>
                    </div>

                    {/* Quantity Info */}
                    <div className={`mt-2 text-[10px] text-center ${
                      isSelected ? 'text-white/70' : 'text-white/50'
                    }`}>
                      {version.pricing.quantity} pieces total
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Selection Helper */}
            {orderBuilderStatus.costBreakdown.versions.length > 1 && (
              <div className="text-[10px] text-white/50 text-center pt-2 border-t border-stone-600">
                Click on a quote version to select it for ordering
              </div>
            )}

            {/* Production Timeline & Packaging (only show for selected version) */}
            {orderBuilderStatus.costBreakdown.selectedVersionId && (leadTimeData?.leadTime || leadTimeData?.boxes) && (
              <div className="mt-4 pt-4 border-t border-blue-400/20 space-y-3">
                {/* Production Timeline */}
                {leadTimeData?.leadTime && (
                  <div className="p-3 rounded-xl border border-purple-400/20 bg-purple-400/5">
                    <div className="flex items-center gap-2 mb-2">
                      <CalendarDaysIcon className="h-4 w-4 text-purple-400" />
                      <h5 className="text-xs font-medium text-purple-300">Production Timeline</h5>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <div className="text-white/70">
                        <ClockIcon className="h-3 w-3 inline mr-1 text-purple-300" />
                        Total Time: <span className="text-white">{leadTimeData.leadTime.totalDays} days</span>
                      </div>
                      <div className="text-white/70">
                        Delivery: <span className="text-white">{leadTimeData.leadTime.deliveryDate}</span>
                      </div>
                    </div>
                    {leadTimeData.leadTime.details && leadTimeData.leadTime.details.length > 0 && (
                      <div className="mt-2 space-y-1 text-[9px] text-white/60">
                        {leadTimeData.leadTime.details.map((detail: string, index: number) => (
                          <div key={index} className="flex items-start gap-1">
                            <div className="w-1 h-1 rounded-full bg-purple-400 mt-1.5 shrink-0" />
                            <span>{detail}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Packaging Information */}
                {leadTimeData?.boxes && (
                  <div className="p-3 rounded-xl border border-orange-400/20 bg-orange-400/5">
                    <div className="flex items-center gap-2 mb-2">
                      <ArchiveBoxIcon className="h-4 w-4 text-orange-400" />
                      <h5 className="text-xs font-medium text-orange-300">Packaging & Shipping</h5>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <div className="text-white/70">
                        Total Boxes: <span className="text-white">{leadTimeData.boxes.totalBoxes}</span>
                      </div>
                      <div className="text-white/70">
                        <ScaleIcon className="h-3 w-3 inline mr-1 text-orange-300" />
                        Net Weight: <span className="text-white">{leadTimeData.boxes.netWeightKg}kg</span>
                      </div>
                    </div>
                    {leadTimeData.boxes.lines && leadTimeData.boxes.lines.length > 0 && (
                      <div className="mt-2 space-y-1 text-[9px] text-white/60">
                        {leadTimeData.boxes.lines.map((line: any, index: number) => (
                          <div key={index} className="flex items-center justify-between">
                            <span>{line.label}</span>
                            <span>{line.pieces} pcs • {line.dimensions}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default CostBreakdownSection;