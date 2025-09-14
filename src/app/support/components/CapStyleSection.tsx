import React, { useState, useEffect } from 'react';
import { CheckIcon, ClipboardDocumentListIcon, ChevronDownIcon, CpuChipIcon } from '@heroicons/react/24/outline';
import { OrderBuilderStatus } from '../types';

// Define ProductInfo interface locally since we're using API now
interface ProductInfo {
  name: string;
  code: string;
  profile: string;
  bill_shape: string;
  panel_count: number;
  structure_type: string;
  pricing_tier?: {
    tier_name: string;
  };
  nick_names: string[];
}

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: any;
}

interface CapStyleSectionProps {
  orderBuilderStatus: OrderBuilderStatus;
  currentQuoteData: any;
  messages?: Message[];
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

/**
 * Helper function to extract panel count from cap details with enhanced detection
 */
function extractPanelCountFromDetails(capDetails: any): number | undefined {
  if (!capDetails) {
    console.log('⚠️ [PANEL-DETECTION] No capDetails provided');
    return undefined;
  }

  console.log('🔍 [PANEL-DETECTION] Input capDetails:', JSON.stringify(capDetails, null, 2));

  // Check various possible structure patterns
  const structure = (capDetails.structure?.toLowerCase() || '').replace(/[-\s]/g, '');
  const profile = (capDetails.profile?.toLowerCase() || '').replace(/[-\s]/g, '');
  const billShape = (capDetails.billShape?.toLowerCase() || '').replace(/[-\s]/g, '');

  // Also check the full object string for panel mentions
  const fullDetailsStr = JSON.stringify(capDetails).toLowerCase().replace(/[-\s]/g, '');

  console.log('🔍 [PANEL-DETECTION] Processed fields:', { structure, profile, billShape });
  console.log('🔍 [PANEL-DETECTION] Full details string:', fullDetailsStr);

  // Look for explicit panel count mentions with various patterns
  const patterns = [
    /7panel/g, /7p/g, /seven/g,
    /6panel/g, /6p/g, /six/g,
    /5panel/g, /5p/g, /five/g,
    /4panel/g, /4p/g, /four/g
  ];

  const searchText = `${structure} ${profile} ${billShape} ${fullDetailsStr}`;

  console.log('🔍 [PANEL-DETECTION] Final search text:', searchText);

  if (patterns.slice(0, 3).some(pattern => pattern.test(searchText))) {
    console.log('✅ [PANEL-DETECTION] Found 7-panel');
    return 7;
  }
  if (patterns.slice(3, 6).some(pattern => pattern.test(searchText))) {
    console.log('✅ [PANEL-DETECTION] Found 6-panel');
    return 6;
  }
  if (patterns.slice(6, 9).some(pattern => pattern.test(searchText))) {
    console.log('✅ [PANEL-DETECTION] Found 5-panel');
    return 5;
  }
  if (patterns.slice(9, 12).some(pattern => pattern.test(searchText))) {
    console.log('✅ [PANEL-DETECTION] Found 4-panel');
    return 4;
  }

  // Default fallback based on bill shape (business rules)
  if (billShape.includes('flat')) {
    console.log('🔄 [PANEL-DETECTION] Default fallback: 6-panel for flat bill');
    return 6; // 6-panel flat is common
  }

  console.log('⚠️ [PANEL-DETECTION] No panel count detected');
  return undefined; // Let the service determine from other factors
}

const CapStyleSection = ({
  orderBuilderStatus,
  currentQuoteData,
  messages,
  isCollapsed,
  onToggleCollapse
}: CapStyleSectionProps) => {
  const status = orderBuilderStatus.capStyle.status;
  const [productInfo, setProductInfo] = useState<ProductInfo | null>(null);
  const [isLoadingProduct, setIsLoadingProduct] = useState(false);

  // Fetch product information when cap details are available
  useEffect(() => {
    const fetchProductInfo = async () => {
      if (!currentQuoteData?.capDetails) return;

      console.log('🔍 [CAP-STYLE-SECTION] Full currentQuoteData:', JSON.stringify(currentQuoteData, null, 2));
      console.log('🔍 [CAP-STYLE-SECTION] capDetails:', JSON.stringify(currentQuoteData.capDetails, null, 2));

      setIsLoadingProduct(true);

      // Extract cap specifications from quote data with enhanced panel detection
      const extractedPanelCount = extractPanelCountFromDetails(currentQuoteData.capDetails);
      console.log('🔍 [CAP-STYLE-SECTION] Extracted panel count:', extractedPanelCount);

      // CRITICAL FIX: Always fetch accurate product data from Supabase
      const aiProductName = currentQuoteData.capDetails.productName;

      if (aiProductName && aiProductName !== 'Custom Cap') {
        console.log('✅ [CAP-STYLE-SECTION] AI extracted product name:', aiProductName);

        // Fetch the actual product from Supabase by name instead of creating synthetic data
        try {
          const response = await fetch('/api/product-info', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              productName: aiProductName, // Pass the exact product name for lookup
              size: currentQuoteData.capDetails.size,
              color: currentQuoteData.capDetails.color || currentQuoteData.capDetails.colors,
              profile: currentQuoteData.capDetails.profile,
              billShape: currentQuoteData.capDetails.billShape || currentQuoteData.capDetails.shape,
              structure: currentQuoteData.capDetails.structure,
              fabric: currentQuoteData.capDetails.fabric,
              closure: currentQuoteData.capDetails.closure,
              stitch: currentQuoteData.capDetails.stitching || currentQuoteData.capDetails.stitch,
              panelCount: extractedPanelCount,
              quantity: currentQuoteData.quantity,
              unitPrice: currentQuoteData.baseProductCost ?
                        parseFloat(currentQuoteData.baseProductCost) / (currentQuoteData.quantity || 1) :
                        undefined,
              totalPrice: currentQuoteData.baseProductCost ?
                         parseFloat(currentQuoteData.baseProductCost) :
                         undefined,
              _timestamp: Date.now()
            }),
          });

          const result = await response.json();
          if (result.success && result.data) {
            console.log('✅ [CAP-STYLE-SECTION] Found exact product in Supabase:', result.data);
            setProductInfo(result.data);
            setIsLoadingProduct(false);
            return;
          } else {
            console.log('⚠️ [CAP-STYLE-SECTION] Product not found by name, falling back to specs matching');
          }
        } catch (error) {
          console.error('❌ [CAP-STYLE-SECTION] Error fetching product by name:', error);
        }
      }

      const capSpecs = {
        size: currentQuoteData.capDetails.size,
        color: currentQuoteData.capDetails.color || currentQuoteData.capDetails.colors,
        profile: currentQuoteData.capDetails.profile,
        billShape: currentQuoteData.capDetails.billShape,
        structure: currentQuoteData.capDetails.structure === 'undefined' || !currentQuoteData.capDetails.structure ? 'Structured' : currentQuoteData.capDetails.structure,
        fabric: currentQuoteData.capDetails.fabric,
        closure: currentQuoteData.capDetails.closure,
        stitch: currentQuoteData.capDetails.stitching || currentQuoteData.capDetails.stitch,
        panelCount: currentQuoteData.capDetails.panelCount ||
                   currentQuoteData.panelCount ||
                   extractedPanelCount,
        // Add pricing context for better matching
        quantity: currentQuoteData.quantity,
        unitPrice: currentQuoteData.baseProductCost ?
                  parseFloat(currentQuoteData.baseProductCost) / (currentQuoteData.quantity || 1) :
                  undefined,
        totalPrice: currentQuoteData.baseProductCost ?
                   parseFloat(currentQuoteData.baseProductCost) :
                   undefined,
        // Add timestamp to force re-fetch when quote updates
        _timestamp: Date.now()
      };

      console.log('🔍 [CAP-STYLE-SECTION] Final capSpecs for API:', JSON.stringify(capSpecs, null, 2));

      try {
        const response = await fetch('/api/product-info', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(capSpecs),
        });

        const result = await response.json();
        console.log('✅ [CAP-STYLE-SECTION] API response received:', result);
        if (result.success) {
          setProductInfo(result.data);
        } else {
          console.error('❌ [CAP-STYLE-SECTION] API returned error:', result.error);
          setProductInfo(null);
        }
      } catch (error) {
        console.error('❌ [CAP-STYLE-SECTION] Error fetching product info:', error);
        setProductInfo(null);
      } finally {
        setIsLoadingProduct(false);
      }
    };

    fetchProductInfo();
  }, [currentQuoteData, JSON.stringify(currentQuoteData?.capDetails)]);

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
          {status === 'green' ? (
            <CheckIcon className="h-4 w-4" />
          ) : (
            <ClipboardDocumentListIcon className="h-4 w-4" />
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-medium tracking-tight text-white">Cap Style Setup</h4>
              <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                status === 'green'
                  ? 'border-green-400/30 bg-green-400/10 text-green-300'
                  : status === 'yellow'
                  ? 'border-yellow-400/30 bg-yellow-400/10 text-yellow-300'
                  : 'border-red-400/30 bg-red-400/10 text-red-300'
              }`}>
                {status === 'green' ? 'Complete' :
                 status === 'yellow' ? 'Partial' : 'Required'}
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
              {/* Product Information Section */}
              {currentQuoteData?.capDetails && (
                <div className="mt-2 p-2 rounded-lg border border-blue-400/20 bg-blue-400/5">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <CpuChipIcon className="h-4 w-4 text-blue-400" />
                      <h5 className="text-xs font-medium text-blue-300">Product Information</h5>
                      {isLoadingProduct && (
                        <div className="h-3 w-3 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin"></div>
                      )}
                    </div>
                    {/* ENHANCED: Show context preservation status */}
                    {currentQuoteData?.metadata?.requirements?.isQuantityUpdate && (
                      <div className="text-[9px] px-2 py-0.5 rounded-full bg-blue-400/20 text-blue-300 border border-blue-400/30">
                        Context Preserved
                      </div>
                    )}
                  </div>
                  {productInfo ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[10px]">
                        <div className="text-white/70">
                          Product Name: <span className="text-white font-medium">{productInfo.name}</span>
                        </div>
                        <div className="text-white/70">
                          Price Tier: <span className="text-white font-medium">{productInfo.pricing_tier?.tier_name || 'Unknown'}</span>
                        </div>
                        <div className="text-white/70">
                          Panel Count: <span className="text-white font-medium">{productInfo.panel_count}-Panel</span>
                        </div>
                      </div>

                      {/* Base Cap Cost Information */}
                      {(() => {
                        console.log('🔍 [DEBUG] Current quote data for cap cost:', {
                          baseProductCost: currentQuoteData?.baseProductCost,
                          quantity: currentQuoteData?.quantity,
                          pricing: currentQuoteData?.pricing,
                          costBreakdown: currentQuoteData?.costBreakdown,
                          totalCost: currentQuoteData?.totalCost,
                          message: currentQuoteData?.message ? 'Has message content' : 'No message',
                          keys: Object.keys(currentQuoteData || {})
                        });

                        // Try multiple possible data sources for base product cost
                        let baseProductCost = currentQuoteData?.baseProductCost ||
                                            currentQuoteData?.pricing?.baseProductCost ||
                                            currentQuoteData?.pricing?.subtotals?.blankCaps ||
                                            currentQuoteData?.costBreakdown?.baseCost;

                        let quantity = currentQuoteData?.quantity ||
                                     currentQuoteData?.pricing?.quantity ||
                                     currentQuoteData?.capDetails?.quantity;

                        // If no structured cost data, try to extract from quote message
                        if (!baseProductCost || !quantity) {
                          // Check if there's a raw message or content in the quote data
                          const messageContent = currentQuoteData?.message ||
                                               currentQuoteData?.content ||
                                               currentQuoteData?.originalMessage;

                          if (messageContent && typeof messageContent === 'string') {
                            const blankCapMatch = messageContent.match(/(?:Subtotal\s+Blank\s+Caps|Blank\s+Cap\s+Costs?):\s*\$?([\d,]+\.?\d*)/i);
                            const quantityMatch = messageContent.match(/(\d+)\s*pieces?\s*×/i);

                            if (blankCapMatch) {
                              baseProductCost = parseFloat(blankCapMatch[1].replace(',', ''));
                              console.log('🎯 [EXTRACTED] Base cost from message:', baseProductCost);
                            }
                            if (quantityMatch) {
                              quantity = parseInt(quantityMatch[1]);
                              console.log('🎯 [EXTRACTED] Quantity from message:', quantity);
                            }
                          }
                        }

                        return baseProductCost && quantity ? (
                          <div className="pt-2 border-t border-blue-400/10">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[10px]">
                              <div className="text-white/70">
                                Unit Price: <span className="text-white font-medium">
                                  ${(parseFloat(baseProductCost) / quantity).toFixed(2)}
                                </span>
                              </div>
                              <div className="text-white/70">
                                Quantity: <span className="text-white font-medium">{quantity} pieces</span>
                                {/* ENHANCED: Show if quantity was updated */}
                                {currentQuoteData?.metadata?.requirements?.isQuantityUpdate && (
                                  <span className="ml-1 text-[8px] text-yellow-400">• Updated</span>
                                )}
                              </div>
                              </div>
                              <div className="text-white/70">
                                Subtotal: <span className="text-white font-medium text-green-400">
                                  ${parseFloat(baseProductCost).toFixed(2)}
                                </span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          // Show debug info when data is missing
                          <div className="pt-2 border-t border-blue-400/10">
                            <div className="text-[10px] text-yellow-400/70">
                              Base cap cost data not available yet
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  ) : (
                    !isLoadingProduct && (
                      <div className="text-[10px] text-white/50">
                        Product matching in progress...
                      </div>
                    )
                  )}
                </div>
              )}

              {/* AI Values Section */}
              {currentQuoteData?.capDetails && (
                <div className="mt-2 p-2 rounded-lg border border-lime-400/20 bg-lime-400/5">
                  <h5 className="text-xs font-medium text-lime-300 mb-1">Current AI Values</h5>
                  <div className="grid grid-cols-2 gap-1 text-[10px]">
                    {currentQuoteData.capDetails.size && (
                      <div className="text-white/70">Size: <span className="text-white">{currentQuoteData.capDetails.size}</span></div>
                    )}
                    {(currentQuoteData.capDetails.color || currentQuoteData.capDetails.colors) && (
                      <div className="text-white/70">Color: <span className="text-white">
                        {(() => {
                          // Priority: Use color string if available (preserves exact format like "Red/White")
                          if (currentQuoteData.capDetails.color) {
                            const color = currentQuoteData.capDetails.color;

                            // Enhanced color parsing - if single color but user requested combination, try to extract from conversation
                            if ((color === 'Black' || color.includes('Polyester')) && messages && messages.length > 0) {
                              const userMessages = messages.filter(m => m.role === 'user');
                              const recentUserMessages = userMessages.slice(-3); // Last 3 user messages

                              for (const msg of recentUserMessages) {
                                const msgText = msg.content;
                                // Look for color combinations in user messages (prioritize actual colors over fabric)
                                const colorOnlyMatch = msgText.match(/\b(Black|White|Red|Blue|Green|Yellow|Orange|Purple|Grey|Gray|Navy|Royal|Lime|Pink|Brown|Tan|Khaki|Charcoal)\/([A-Z][a-z]+)\b/i);
                                if (colorOnlyMatch) {
                                  return `${colorOnlyMatch[1]}/${colorOnlyMatch[2]}`;
                                }
                                // Look for general color combinations
                                const colorComboMatch = msgText.match(/\b([A-Z][a-z]+)\/([A-Z][a-z]+)\b/i);
                                if (colorComboMatch && !colorComboMatch[0].toLowerCase().includes('polyester') && !colorComboMatch[0].toLowerCase().includes('laser')) {
                                  return `${colorComboMatch[1]}/${colorComboMatch[2]}`;
                                }
                                // Look for "Color, Color" patterns
                                const colorListMatch = msgText.match(/\b(Black|White|Red|Blue|Green|Yellow|Orange|Purple|Grey|Gray|Navy|Royal|Lime|Pink|Brown|Tan|Khaki|Charcoal),\s*([A-Z][a-z]+)\b/i);
                                if (colorListMatch) {
                                  return `${colorListMatch[1]}/${colorListMatch[2]}`;
                                }
                              }
                            }

                            return color;
                          }
                          // Fallback: Handle colors array
                          if (Array.isArray(currentQuoteData.capDetails.colors)) {
                            // If it's split colors (2 parts), join with slash
                            if (currentQuoteData.capDetails.colors.length === 2) {
                              return currentQuoteData.capDetails.colors.join('/');
                            }
                            // If single color in array that already has slash, preserve it
                            if (currentQuoteData.capDetails.colors.length === 1 && currentQuoteData.capDetails.colors[0].includes('/')) {
                              return currentQuoteData.capDetails.colors[0];
                            }
                            // Multiple separate colors - join with commas
                            return currentQuoteData.capDetails.colors.join(', ');
                          }
                          return 'Black'; // Fallback
                        })()}
                      </span></div>
                    )}
                    {currentQuoteData.capDetails.profile && (
                      <div className="text-white/70">Profile: <span className="text-white">{currentQuoteData.capDetails.profile}</span></div>
                    )}
                    {currentQuoteData.capDetails.billShape && (
                      <div className="text-white/70">Shape: <span className="text-white">{currentQuoteData.capDetails.billShape}</span></div>
                    )}
                    {currentQuoteData.capDetails.structure && currentQuoteData.capDetails.structure !== 'undefined' && (
                      <div className="text-white/70">Structure: <span className="text-white">{currentQuoteData.capDetails.structure === 'undefined' ? 'Structured' : currentQuoteData.capDetails.structure}</span></div>
                    )}
                    {currentQuoteData.capDetails.fabric && (
                      <div className="text-white/70">Fabric: <span className="text-white">{
                        // Enhanced fabric display logic with dual fabric support
                        (() => {
                          const fabric = currentQuoteData.capDetails.fabric;
                          if (typeof fabric !== 'string') return 'Standard';

                          // If fabric is generic "Standard" or "Acrylic" alone, try to extract full fabric from user messages
                          if ((fabric.toLowerCase() === 'standard' || fabric.toLowerCase() === 'acrylic') && messages && messages.length > 0) {
                            const userMessages = messages.filter(m => m.role === 'user');
                            const recentUserMessages = userMessages.slice(-3); // Last 3 user messages

                            for (const msg of recentUserMessages) {
                              const msgText = msg.content;
                              // Look for dual fabric patterns in user messages (highest priority)
                              if (msgText.toLowerCase().includes('acrylic') && (msgText.toLowerCase().includes('airmesh') || msgText.toLowerCase().includes('air mesh'))) {
                                return 'Acrylic/Airmesh';
                              }
                              if (msgText.toLowerCase().includes('polyester') && msgText.toLowerCase().includes('laser cut')) {
                                return 'Polyester/Laser Cut';
                              }
                              if (msgText.toLowerCase().includes('duck camo') && msgText.toLowerCase().includes('air mesh')) {
                                return 'Duck Camo/Air Mesh';
                              }
                              if (msgText.toLowerCase().includes('suede')) {
                                return 'Suede Cotton';
                              }
                              if (msgText.toLowerCase().includes('leather')) {
                                return 'Genuine Leather';
                              }
                              // Other single fabric types
                              const fabricMatch = msgText.match(/\b(Cotton|Polyester|Acrylic|Air Mesh|Trucker Mesh|Laser Cut)\b/i);
                              if (fabricMatch) {
                                return fabricMatch[1];
                              }
                            }
                          }

                          // Clean up corrupted fabric data that might contain pricing or other info
                          if (fabric.includes('$') || fabric.includes('*') || fabric.includes('\n') || fabric.length > 50) {
                            // Try to extract fabric type from corrupted data
                            const cleanFabricMatch = fabric.match(/\b(Acrylic\/Airmesh|Acrylic\/Air Mesh|Polyester\/Laser Cut|Duck Camo\/Air Mesh|Suede Cotton|Genuine Leather|Cotton|Polyester|Acrylic|Leather)\b/i);
                            return cleanFabricMatch ? cleanFabricMatch[0] : 'Standard';
                          }

                          return fabric;
                        })()
                      }</span></div>
                    )}
                    {currentQuoteData.capDetails.closure && (
                      <div className="text-white/70">Closure: <span className="text-white">{
                        // Clean up corrupted closure data that might contain pricing information
                        (() => {
                          const closure = currentQuoteData.capDetails.closure;
                          if (typeof closure !== 'string') return 'Snapback';

                          // If closure contains pricing symbols or markdown, extract just the closure type
                          if (closure.includes('$') || closure.includes('*') || closure.includes('\n') || closure.length > 20) {
                            // Try to extract closure type from corrupted data
                            const cleanClosureMatch = closure.match(/\b(Fitted|Snapback|Adjustable|Velcro|Buckle|Elastic)\b/i);
                            return cleanClosureMatch ? cleanClosureMatch[0] : 'Snapback';
                          }

                          return closure;
                        })()
                      }</span></div>
                    )}
                    {(currentQuoteData.capDetails.stitching || currentQuoteData.capDetails.stitch) && (
                      <div className="text-white/70">Stitching: <span className="text-white">{
                        // Enhanced stitching display logic to extract actual stitching details
                        (() => {
                          const stitching = currentQuoteData.capDetails.stitching || currentQuoteData.capDetails.stitch;
                          if (typeof stitching !== 'string') return 'Matching';

                          // If stitching is generic "Standard", try to extract from user messages or default to "Matching"
                          if (stitching.toLowerCase() === 'standard' && messages && messages.length > 0) {
                            const userMessages = messages.filter(m => m.role === 'user');
                            const recentUserMessages = userMessages.slice(-3); // Last 3 user messages

                            for (const msg of recentUserMessages) {
                              const msgText = msg.content;
                              // Look for stitching patterns in user messages
                              const stitchingPatterns = [
                                /\b(Contrast Stitching|Matching Stitching|Double Stitching|Flat Stitching|Overlock Stitching)\b/i,
                                /\b(Red Stitching|White Stitching|Black Stitching|Navy Stitching|Blue Stitching)\b/i,
                                /\b([A-Z][a-z]+\s+Stitching)\b/i,
                                /Stitching[:\s]*([^,\n.!?]+)/i
                              ];

                              for (const pattern of stitchingPatterns) {
                                const match = msgText.match(pattern);
                                if (match) {
                                  return match[1] || match[0];
                                }
                              }
                            }
                            // Default to "Matching" if no specific stitching found in user messages
                            return 'Matching';
                          }

                          // Convert "Standard" to "Matching" as default
                          if (stitching.toLowerCase() === 'standard') {
                            return 'Matching';
                          }

                          // Clean up corrupted stitching data that might contain pricing information
                          if (stitching.includes('$') || stitching.includes('*') || stitching.includes('\n') || stitching.length > 30) {
                            // Try to extract stitching type from corrupted data
                            const cleanStitchingMatch = stitching.match(/\b(Contrast|Matching|Double|Flat|Overlock|Standard)\s*Stitching\b/i);
                            return cleanStitchingMatch ? cleanStitchingMatch[0] : 'Matching';
                          }

                          return stitching;
                        })()
                      }</span></div>
                    )}
                  </div>

                  {/* Premium Cost Information */}
                  {(() => {
                    const quantity = currentQuoteData?.quantity || currentQuoteData?.pricing?.quantity || 0;
                    let messageContent = currentQuoteData?.message || currentQuoteData?.content || currentQuoteData?.originalMessage || '';

                    // Extract premium costs from AI message
                    const fabricCosts = [];
                    const closureCosts = [];

                    // ENHANCED: Try to get premium costs from new structured data first (dual fabric support)
                    // Check for new dual fabric structure from updated step-by-step pricing
                    if (currentQuoteData?.premiumUpgrades?.data?.fabrics && Object.keys(currentQuoteData.premiumUpgrades.data.fabrics).length > 0) {
                      console.log('🧵 [PREMIUM-COSTS] Using new dual fabric structure:', currentQuoteData.premiumUpgrades.data.fabrics);

                      Object.entries(currentQuoteData.premiumUpgrades.data.fabrics).forEach(([fabricName, fabricInfo]: [string, any]) => {
                        fabricCosts.push({
                          type: fabricName,
                          unitPrice: fabricInfo.unitPrice,
                          totalCost: fabricInfo.cost
                        });
                      });
                    }
                    // Fallback to old structured data
                    else if (currentQuoteData?.pricing?.premiumFabricCost && currentQuoteData?.pricing?.premiumFabricCost > 0) {
                      const fabricType = currentQuoteData?.capDetails?.fabric;
                      if (fabricType && /polyester|laser\s*cut|acrylic|suede|leather|mesh|camo/i.test(fabricType)) {
                        fabricCosts.push({
                          type: fabricType,
                          unitPrice: currentQuoteData.pricing.premiumFabricCost / quantity,
                          totalCost: currentQuoteData.pricing.premiumFabricCost
                        });
                      }
                    }

                    if (currentQuoteData?.pricing?.premiumClosureCost && currentQuoteData?.pricing?.premiumClosureCost > 0) {
                      const closureType = currentQuoteData?.capDetails?.closure;
                      if (closureType && /fitted|flexfit|buckle|elastic|stretched/i.test(closureType)) {
                        closureCosts.push({
                          type: closureType,
                          unitPrice: currentQuoteData.pricing.premiumClosureCost / quantity,
                          totalCost: currentQuoteData.pricing.premiumClosureCost
                        });
                      }
                    }

                    // Also try to get message from different possible sources
                    if (!messageContent && currentQuoteData?.aiResponse) {
                      messageContent = currentQuoteData.aiResponse;
                    }

                    if (messageContent && typeof messageContent === 'string' && quantity > 0) {
                      console.log('🔍 [PREMIUM-COSTS] Analyzing message content for costs:', {
                        hasMessage: !!messageContent,
                        quantity,
                        messageLength: messageContent.length,
                        messagePreview: messageContent.substring(0, 300)
                      });

                      // Extract premium fabric costs (like "Polyester: 288 pieces × $0.50 = $144.00")
                      const fabricMatches = messageContent.match(/•(.*?):\s*\d+\s*pieces?\s*×\s*\$?([\d,]+\.?\d*)\s*=\s*\$?([\d,]+\.?\d*)/gi);
                      console.log('🔍 [PREMIUM-COSTS] Fabric matches found:', fabricMatches);

                      if (fabricMatches) {
                        fabricMatches.forEach(match => {
                          const fabricMatch = match.match(/•(.*?):\s*\d+\s*pieces?\s*×\s*\$?([\d,]+\.?\d*)\s*=\s*\$?([\d,]+\.?\d*)/i);
                          if (fabricMatch) {
                            const fabricType = fabricMatch[1].trim();
                            const unitPrice = parseFloat(fabricMatch[2].replace(',', ''));
                            const totalCost = parseFloat(fabricMatch[3].replace(',', ''));

                            // Calculate the actual total cost based on current quantity
                            const adjustedTotalCost = unitPrice * quantity;

                            console.log('🎯 [PREMIUM-COSTS] Processing match:', {
                              fabricType,
                              unitPrice,
                              originalTotalCost: totalCost,
                              adjustedTotalCost,
                              quantity,
                              isFabric: /polyester|laser\s*cut|acrylic|suede|leather|mesh|camo/i.test(fabricType),
                              isClosure: /fitted|flexfit|buckle|elastic|stretched/i.test(fabricType)
                            });

                            // Check if it's a fabric type (not closure, not cap color)
                            if (/polyester|laser\s*cut|acrylic|suede|leather|mesh|camo/i.test(fabricType) && unitPrice > 0) {
                              fabricCosts.push({
                                type: fabricType,
                                unitPrice,
                                totalCost: adjustedTotalCost
                              });
                            }

                            // Check if it's a premium closure type
                            if (/fitted|flexfit|buckle|elastic|stretched/i.test(fabricType) && unitPrice > 0) {
                              closureCosts.push({
                                type: fabricType,
                                unitPrice,
                                totalCost: adjustedTotalCost
                              });
                            }
                          }
                        });
                      }
                    }


                    const hasPremiumCosts = fabricCosts.length > 0 || closureCosts.length > 0;

                    console.log('🔍 [PREMIUM-COSTS] Final results:', {
                      fabricCosts,
                      closureCosts,
                      hasPremiumCosts,
                      fabricType: currentQuoteData?.capDetails?.fabric,
                      closureType: currentQuoteData?.capDetails?.closure
                    });

                    return hasPremiumCosts ? (
                      <div className="mt-2 pt-2 border-t border-lime-400/10">
                        <h6 className="text-[10px] font-medium text-lime-200 mb-1">Premium Costs</h6>
                        <div className="flex flex-wrap gap-3 text-[10px]">
                          {fabricCosts.map((fabric, index) => (
                            <div key={`fabric-${index}`} className="flex items-center gap-1 px-2 py-1 rounded border border-lime-400/20 bg-lime-400/5">
                              <span className="text-white/80">{fabric.type}:</span>
                              <span className="text-lime-300 font-medium">${fabric.unitPrice.toFixed(2)}/cap</span>
                            </div>
                          ))}
                          {closureCosts.map((closure, index) => (
                            <div key={`closure-${index}`} className="flex items-center gap-1 px-2 py-1 rounded border border-lime-400/20 bg-lime-400/5">
                              <span className="text-white/80">{closure.type}:</span>
                              <span className="text-lime-300 font-medium">${closure.unitPrice.toFixed(2)}/cap</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null;
                  })()}
                </div>
              )}

              {/* Status Grid - Horizontal Layout */}
              <div className="mt-2 grid grid-cols-4 sm:grid-cols-7 gap-1 text-[10px]">
                {[
                  { key: 'size', label: 'Size' },
                  { key: 'color', label: 'Color' },
                  { key: 'profile', label: 'Profile' },
                  { key: 'shape', label: 'Shape' },
                  { key: 'structure', label: 'Structure' },
                  { key: 'fabric', label: 'Fabric' },
                  { key: 'stitch', label: 'Stitch' }
                ].map((item) => (
                  <div key={item.key} className="flex items-center gap-1">
                    {orderBuilderStatus.capStyle.items[item.key as keyof typeof orderBuilderStatus.capStyle.items] ? (
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

export default CapStyleSection;