import React from 'react';
import CapStyleSection from './CapStyleSection';
import CustomizationSection from './CustomizationSection';
import DeliverySection from './DeliverySection';
import CostBreakdownSection from './CostBreakdownSection';
import { OrderBuilderStatus } from '../types';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: any;
}

interface OrderBuilderProps {
  isVisible: boolean;
  orderBuilderStatus: OrderBuilderStatus;
  currentQuoteData: any;
  collapsedBlocks: Record<string, boolean>;
  leadTimeData: any;
  messages?: Message[];
  onToggleCollapse: (block: 'capStyle' | 'customization' | 'delivery' | 'costBreakdown') => void;
  onQuoteOrder: () => void;
  canQuoteOrder: () => boolean;
  onAcceptQuote?: () => void;
  onRejectQuote?: () => void;
  onSelectVersion?: (versionId: string) => void;
}

const OrderBuilder = ({
  isVisible,
  orderBuilderStatus,
  currentQuoteData,
  collapsedBlocks,
  leadTimeData,
  messages,
  onToggleCollapse,
  onQuoteOrder,
  canQuoteOrder,
  onAcceptQuote,
  onRejectQuote,
  onSelectVersion
}: OrderBuilderProps) => {
  if (!isVisible) return null;

  return (
    <section className="bg-black/20 backdrop-blur-md border border-stone-800 rounded-2xl shadow-[0_20px_70px_-10px_rgba(0,0,0,0.3)] p-4 sm:p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white tracking-tight">Order Builder</h3>
          <p className="text-xs text-white/60 mt-0.5">Comprehensive quote generation with detailed breakdown</p>
          {/* DEBUG: Show data status */}
          <div className="text-[10px] text-yellow-400 mt-1">
            DEBUG: Quote Data: {currentQuoteData ? '✅ Available' : '❌ None'} |
            Cap: {orderBuilderStatus.capStyle.status} |
            Custom: {orderBuilderStatus.customization.status} |
            Delivery: {orderBuilderStatus.delivery.status}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className={`h-2.5 w-2.5 rounded-full ${
            orderBuilderStatus.capStyle.status === 'green' && orderBuilderStatus.delivery.status === 'green'
              ? 'bg-green-400'
              : 'bg-red-400'
          }`} />
          <span className="text-xs text-white/70">
            {(() => {
              const completedSteps = [
                orderBuilderStatus.capStyle.status,
                orderBuilderStatus.customization.status,
                orderBuilderStatus.delivery.status,
                orderBuilderStatus.costBreakdown.status
              ].filter(status => status === 'green').length;

              return `${completedSteps}/4 Steps Complete`;
            })()}
          </span>
        </div>
      </div>

      {/* Enhanced Progress Indicator */}
      <div className="mb-4 grid grid-cols-4 gap-1">
        {[
          { key: 'capStyle', status: orderBuilderStatus.capStyle.status, label: 'Cap Style' },
          { key: 'customization', status: orderBuilderStatus.customization.status, label: 'Customization' },
          { key: 'delivery', status: orderBuilderStatus.delivery.status, label: 'Delivery' },
          { key: 'costBreakdown', status: orderBuilderStatus.costBreakdown.status, label: 'Cost Breakdown' }
        ].map((step) => (
          <div key={step.key} className="relative">
            <div
              className={`h-1.5 rounded-full transition-colors ${
                step.status === 'green'
                  ? 'bg-green-400'
                  : step.status === 'yellow'
                  ? 'bg-yellow-400'
                  : 'bg-red-400/30'
              }`}
            />
            <div className="text-[9px] text-white/50 mt-1 text-center truncate">{step.label}</div>
          </div>
        ))}
      </div>

      {/* Sections */}
      <div className="space-y-3">
        <CapStyleSection
          orderBuilderStatus={orderBuilderStatus}
          currentQuoteData={currentQuoteData}
          messages={messages}
          isCollapsed={collapsedBlocks.capStyle}
          onToggleCollapse={() => onToggleCollapse('capStyle')}
        />

        <CustomizationSection
          orderBuilderStatus={orderBuilderStatus}
          currentQuoteData={currentQuoteData}
          isCollapsed={collapsedBlocks.customization}
          onToggleCollapse={() => onToggleCollapse('customization')}
        />

        <DeliverySection
          orderBuilderStatus={orderBuilderStatus}
          currentQuoteData={currentQuoteData}
          leadTimeData={leadTimeData}
          isCollapsed={collapsedBlocks.delivery}
          onToggleCollapse={() => onToggleCollapse('delivery')}
        />

        <CostBreakdownSection
          orderBuilderStatus={orderBuilderStatus}
          currentQuoteData={currentQuoteData}
          leadTimeData={leadTimeData}
          isCollapsed={collapsedBlocks.costBreakdown}
          onToggleCollapse={() => onToggleCollapse('costBreakdown')}
          onSelectVersion={onSelectVersion}
        />
      </div>

      {/* Action Buttons */}
      <div className="mt-6 pt-4 border-t border-stone-600">
        {orderBuilderStatus.costBreakdown.completed && orderBuilderStatus.costBreakdown.versions && orderBuilderStatus.costBreakdown.versions.length > 0 ? (
          /* Quote Actions */
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={onAcceptQuote}
              disabled={!canQuoteOrder()}
              className={`px-4 py-2 rounded-full text-sm font-medium tracking-tight border transition-all duration-300 flex-1 ${
                canQuoteOrder()
                  ? 'border-green-400/30 bg-green-400/10 text-green-300 hover:bg-green-400/15 hover:border-green-300/50 hover:text-green-200'
                  : 'border-stone-600 text-white/50 cursor-not-allowed bg-black/30 backdrop-blur-sm'
              }`}
            >
              Accept Quote
            </button>
            <button
              onClick={onRejectQuote}
              disabled={!canQuoteOrder()}
              className={`px-4 py-2 rounded-full text-sm font-medium tracking-tight border transition-all duration-300 flex-1 ${
                canQuoteOrder()
                  ? 'border-red-400/30 bg-red-400/10 text-red-300 hover:bg-red-400/15 hover:border-red-300/50 hover:text-red-200'
                  : 'border-stone-600 text-white/50 cursor-not-allowed bg-black/30 backdrop-blur-sm'
              }`}
            >
              Reject Quote
            </button>
          </div>
        ) : (
          /* Generate Quote Button */
          <button
            onClick={onQuoteOrder}
            disabled={!canQuoteOrder()}
            className="w-full h-12 rounded-xl bg-lime-400 text-black hover:bg-lime-500 transition-colors flex items-center justify-center gap-2 font-medium tracking-tight disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_10px_40px_-10px_rgba(132,204,22,0.6)] hover:-translate-y-0.5"
          >
            Generate Quote
          </button>
        )}
        <div className="mt-2 text-[10px] text-white/50 text-center">
          {!canQuoteOrder() && 'Complete Cap Style & Delivery sections to enable quote actions'}
          {canQuoteOrder() && orderBuilderStatus.costBreakdown.completed && 'Quote ready - accept to save or reject to start over'}
          {canQuoteOrder() && !orderBuilderStatus.costBreakdown.completed && 'Ready to generate quote'}
        </div>
      </div>
    </section>
  );
};

export default OrderBuilder;