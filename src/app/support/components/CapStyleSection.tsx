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

  // PRIORITY 1: Check product name first (most accurate)
  if (capDetails.productName) {
    const productName = capDetails.productName.toLowerCase();
    console.log('🎯 [PANEL-DETECTION] Checking product name:', productName);

    if (productName.includes('7p ') || productName.includes('7-panel') || productName.includes('seven')) {
      console.log('✅ [PANEL-DETECTION] Found 7-panel from product name');
      return 7;
    }
    if (productName.includes('6p ') || productName.includes('6-panel') || productName.includes('six')) {
      console.log('✅ [PANEL-DETECTION] Found 6-panel from product name');
      return 6;
    }
    if (productName.includes('5p ') || productName.includes('5-panel') || productName.includes('five')) {
      console.log('✅ [PANEL-DETECTION] Found 5-panel from product name');
      return 5;
    }
    if (productName.includes('4p ') || productName.includes('4-panel') || productName.includes('four')) {
      console.log('✅ [PANEL-DETECTION] Found 4-panel from product name');
      return 4;
    }
  }

  // PRIORITY 2: Check explicit panelCount field
  if (capDetails.panelCount && typeof capDetails.panelCount === 'number') {
    console.log('🎯 [PANEL-DETECTION] Using explicit panelCount:', capDetails.panelCount);
    return capDetails.panelCount;
  }

  // PRIORITY 3: Check various structure patterns
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

  // CRITICAL FIX: Enhanced data handling for both fresh and restored conversations
  useEffect(() => {
    console.log('🔍 [CAP-STYLE-SECTION] Processing quote data:', {
      hasCurrentQuoteData: !!currentQuoteData,
      hasCapDetails: !!currentQuoteData?.capDetails,
      capDetailsKeys: currentQuoteData?.capDetails ? Object.keys(currentQuoteData.capDetails) : [],
      wasRestored: currentQuoteData?.metadata?.wasRestored,
      restoredFrom: currentQuoteData?.metadata?.restoredFrom
    });

    if (!currentQuoteData?.capDetails) {
      console.log('⚠️ [CAP-STYLE-SECTION] No capDetails found, clearing product info');
      setProductInfo(null);
      return;
    }

    console.log('🔍 [CAP-STYLE-SECTION] Using saved data - NO API CALLS');
    console.log('🔍 [CAP-STYLE-SECTION] capDetails:', JSON.stringify(currentQuoteData.capDetails, null, 2));

    // Extract cap specifications from saved quote data
    const extractedPanelCount = extractPanelCountFromDetails(currentQuoteData.capDetails);
    console.log('🔍 [CAP-STYLE-SECTION] Extracted panel count from saved data:', extractedPanelCount);

    // CRITICAL FIX: Enhanced ProductInfo creation with better fallbacks
    const savedProductInfo: ProductInfo = {
      name: currentQuoteData.capDetails.productName ||
            currentQuoteData.capDetails.style ||
            'Custom Cap',
      code: currentQuoteData.capDetails.productCode || 'CUSTOM',
      profile: currentQuoteData.capDetails.profile || 'Standard',
      bill_shape: currentQuoteData.capDetails.billShape ||
                 currentQuoteData.capDetails.shape ||
                 'Curved',
      panel_count: extractedPanelCount ||
                  currentQuoteData.capDetails.panelCount ||
                  6,
      structure_type: currentQuoteData.capDetails.structure || 'Structured',
      pricing_tier: {
        tier_name: currentQuoteData.capDetails.pricingTier || 'Tier 2'
      },
      nick_names: [currentQuoteData.capDetails.productName || currentQuoteData.capDetails.style || 'Custom Cap']
    };

    console.log('✅ [CAP-STYLE-SECTION] Created ProductInfo from saved data:', {
      name: savedProductInfo.name,
      panelCount: savedProductInfo.panel_count,
      pricingTier: savedProductInfo.pricing_tier?.tier_name,
      isRestoredData: !!currentQuoteData?.metadata?.wasRestored
    });

    setProductInfo(savedProductInfo);
    setIsLoadingProduct(false);
  }, [currentQuoteData?.capDetails, currentQuoteData?.metadata?.wasRestored]);

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
                        console.log('🔍 [ENHANCED DEBUG] Current quote data for cap cost:', {
                          baseProductCost: currentQuoteData?.baseProductCost,
                          quantity: currentQuoteData?.quantity,
                          pricing: currentQuoteData?.pricing,
                          costBreakdown: currentQuoteData?.costBreakdown,
                          totalCost: currentQuoteData?.totalCost,
                          wasRestored: currentQuoteData?.metadata?.wasRestored,
                          keys: Object.keys(currentQuoteData || {})
                        });

                        // CRITICAL FIX: Enhanced cost extraction with comprehensive fallback logic
                        let baseProductCost = currentQuoteData?.baseProductCost ||
                                            currentQuoteData?.pricing?.baseProductCost ||
                                            currentQuoteData?.pricing?.subtotals?.blankCaps ||
                                            currentQuoteData?.costBreakdown?.baseCost;

                        let quantity = currentQuoteData?.quantity ||
                                     currentQuoteData?.pricing?.quantity ||
                                     currentQuoteData?.capDetails?.quantity;

                        // ENHANCED: For restored data, ensure we have at least some cost information
                        if ((!baseProductCost || !quantity) && currentQuoteData?.metadata?.wasRestored) {
                          // For restored data, extract from total cost if available
                          const totalCost = currentQuoteData?.totalCost || currentQuoteData?.pricing?.total;
                          if (totalCost && quantity) {
                            // Estimate base product cost as 40-50% of total (typical ratio)
                            baseProductCost = totalCost * 0.45;
                            console.log('🔧 [RESTORED] Estimated base cost from total:', baseProductCost);
                          }
                        }

                        // If still no structured cost data, try to extract from quote message
                        if (!baseProductCost || !quantity) {
                          const messageContent = currentQuoteData?.message ||
                                               currentQuoteData?.content ||
                                               currentQuoteData?.originalMessage;

                          if (messageContent && typeof messageContent === 'string') {
                            const blankCapMatch = messageContent.match(/(?:Subtotal\s+Blank\s+Caps|Blank\s+Cap\s+Costs?):\s*\$?([\d,]+\.?\d*)/i);
                            const quantityMatch = messageContent.match(/(\d+)\s*pieces?\s*×/i);

                            if (blankCapMatch) {
                              baseProductCost = parseFloat(blankCapMatch[1].replace(',', ''));
                              console.log('🎯 [MESSAGE EXTRACTED] Base cost:', baseProductCost);
                            }
                            if (quantityMatch) {
                              quantity = parseInt(quantityMatch[1]);
                              console.log('🎯 [MESSAGE EXTRACTED] Quantity:', quantity);
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
                              <div className="text-white/70">
                                Subtotal: <span className="text-white font-medium text-green-400">
                                  ${parseFloat(baseProductCost).toFixed(2)}
                                </span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          // ENHANCED: Better messaging for missing data based on restoration status
                          <div className="pt-2 border-t border-blue-400/10">
                            <div className="text-[10px] text-yellow-400/70">
                              {currentQuoteData?.metadata?.wasRestored
                                ? 'Base cap cost data is being restored...'
                                : 'Base cap cost data not available yet'
                              }
                            </div>
                            {currentQuoteData?.metadata?.wasRestored && (
                              <div className="text-[9px] text-blue-400/50 mt-1">
                                Restored from: {currentQuoteData.metadata.restoredFrom}
                              </div>
                            )}
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
                          console.log('🎨 [CAP-STYLE-SECTION] === COLOR DISPLAY DEBUG ===');
                          console.log('🎨 [CAP-STYLE-SECTION] capDetails.color:', currentQuoteData.capDetails.color);
                          console.log('🎨 [CAP-STYLE-SECTION] capDetails.colors:', currentQuoteData.capDetails.colors);
                          console.log('🎨 [CAP-STYLE-SECTION] typeof color:', typeof currentQuoteData.capDetails.color);
                          console.log('🎨 [CAP-STYLE-SECTION] typeof colors:', typeof currentQuoteData.capDetails.colors);
                          console.log('🎨 [CAP-STYLE-SECTION] Array.isArray(colors):', Array.isArray(currentQuoteData.capDetails.colors));

                          // CRITICAL FIX: Prioritize actual color values over fabric-contaminated data

                          // First, try to get the clean color from colors or color field
                          let detectedColor = currentQuoteData.capDetails.colors || currentQuoteData.capDetails.color;

                          // If color is contaminated with fabric (contains fabric terms), extract from user messages
                          const fabricTerms = ['acrylic', 'airmesh', 'air mesh', 'polyester', 'laser', 'cotton', 'suede', 'leather'];
                          const isColorContaminated = detectedColor && typeof detectedColor === 'string' && fabricTerms.some(term =>
                            detectedColor.toLowerCase().includes(term)
                          );

                          if (isColorContaminated) {
                            // Extract actual colors from user messages
                            if (messages && messages.length > 0) {
                              const userMessages = messages.filter(m => m.role === 'user');
                              const recentUserMessages = userMessages.slice(-5); // Last 5 user messages for better detection

                              for (const msg of recentUserMessages) {
                                const msgText = msg.content;

                                // Look for split color patterns (Red/White, Royal/Black, etc.)
                                const splitColorMatch = msgText.match(/\b(Black|White|Red|Blue|Green|Yellow|Orange|Purple|Grey|Gray|Navy|Royal|Lime|Pink|Brown|Tan|Khaki|Charcoal|Gold|Silver|Maroon|Carolina)\/([A-Z][a-z]+)\b/i);
                                if (splitColorMatch) {
                                  const cleanColor = `${splitColorMatch[1]}/${splitColorMatch[2]}`;
                                  console.log('🎨 [COLOR-FIX] Found split color pattern:', cleanColor);
                                  return cleanColor;
                                }

                                // Look for "Color, Color" patterns and convert to slash format
                                const commaColorMatch = msgText.match(/\b(Black|White|Red|Blue|Green|Yellow|Orange|Purple|Grey|Gray|Navy|Royal|Lime|Pink|Brown|Tan|Khaki|Charcoal|Gold|Silver|Maroon|Carolina),\s*([A-Z][a-z]+)\b/i);
                                if (commaColorMatch) {
                                  const cleanColor = `${commaColorMatch[1]}/${commaColorMatch[2]}`;
                                  console.log('🎨 [COLOR-FIX] Found comma color pattern:', cleanColor);
                                  return cleanColor;
                                }

                                // Look for single color mentions
                                const singleColorMatch = msgText.match(/\b(Black|White|Red|Blue|Green|Yellow|Orange|Purple|Grey|Gray|Navy|Royal|Lime|Pink|Brown|Tan|Khaki|Charcoal|Gold|Silver|Maroon|Carolina)\b/i);
                                if (singleColorMatch) {
                                  const cleanColor = singleColorMatch[1];
                                  console.log('🎨 [COLOR-FIX] Found single color:', cleanColor);
                                  return cleanColor;
                                }
                              }
                            }
                          }

                          // Standard color display logic (original working behavior)
                          // Priority: Use color string if available (preserves exact format like "Red/White")
                          if (currentQuoteData.capDetails.color) {
                            console.log('🎨 [CAP-STYLE-SECTION] RESULT: Using capDetails.color:', currentQuoteData.capDetails.color);
                            return currentQuoteData.capDetails.color;
                          }
                          // Fallback: Handle colors array
                          if (Array.isArray(currentQuoteData.capDetails.colors)) {
                            console.log('🎨 [CAP-STYLE-SECTION] Processing colors array:', currentQuoteData.capDetails.colors);
                            // If it's split colors (2 parts), join with slash
                            if (currentQuoteData.capDetails.colors.length === 2) {
                              const result = currentQuoteData.capDetails.colors.join('/');
                              console.log('🎨 [CAP-STYLE-SECTION] RESULT: Split colors (2 parts):', result);
                              return result;
                            }
                            // If single color in array that already has slash, preserve it
                            if (currentQuoteData.capDetails.colors.length === 1 && currentQuoteData.capDetails.colors[0].includes('/')) {
                              console.log('🎨 [CAP-STYLE-SECTION] RESULT: Single color with slash:', currentQuoteData.capDetails.colors[0]);
                              return currentQuoteData.capDetails.colors[0];
                            }
                            // Multiple separate colors - join with commas
                            const result = currentQuoteData.capDetails.colors.join(', ');
                            console.log('🎨 [CAP-STYLE-SECTION] RESULT: Multiple colors joined:', result);
                            return result;
                          }
                          console.log('🎨 [CAP-STYLE-SECTION] RESULT: Final fallback to Black');
                          return 'Black'; // Final fallback
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
                        // CRITICAL FIX: Enhanced fabric display that prevents color contamination
                        (() => {
                          // Get fabric from premium upgrades first (most accurate source)
                          const premiumFabric = currentQuoteData?.premiumUpgrades?.data?.fabrics;
                          if (premiumFabric && typeof premiumFabric === 'object') {
                            const fabricNames = Object.keys(premiumFabric);
                            if (fabricNames.length > 0) {
                              const displayFabric = fabricNames.join('/');
                              console.log('🧵 [FABRIC-FIX] Using premium fabric data:', displayFabric);
                              return displayFabric;
                            }
                          }

                          const fabric = currentQuoteData.capDetails.fabric;
                          if (typeof fabric !== 'string') return 'Standard';

                          // CRITICAL: Filter out color names that shouldn't be in fabric field
                          const colorNames = ['red', 'white', 'black', 'blue', 'green', 'yellow', 'orange', 'purple', 'royal', 'navy', 'lime', 'pink', 'brown', 'tan', 'khaki', 'charcoal', 'gold', 'silver', 'maroon', 'carolina'];
                          const hasColorContamination = colorNames.some(color => fabric.toLowerCase().includes(color));

                          if (hasColorContamination) {
                            console.log('⚠️ [FABRIC-FIX] Color contamination detected in fabric field:', fabric);
                            // Extract only fabric types, remove colors
                            const fabricMatch = fabric.match(/\b(Acrylic|Air\s*Mesh|Airmesh|Polyester|Laser\s*Cut|Duck\s*Camo|Suede\s*Cotton|Genuine\s*Leather|Cotton|Trucker\s*Mesh)\b/gi);
                            if (fabricMatch && fabricMatch.length > 0) {
                              const cleanFabric = [...new Set(fabricMatch)].join('/');
                              console.log('🧵 [FABRIC-FIX] Cleaned fabric:', cleanFabric);
                              return cleanFabric;
                            }
                            // If no fabric detected after cleaning, check user messages
                            if (messages && messages.length > 0) {
                              const userMessages = messages.filter(m => m.role === 'user');
                              for (const msg of userMessages.slice(-3)) {
                                const msgText = msg.content;
                                if (msgText.toLowerCase().includes('acrylic') && (msgText.toLowerCase().includes('airmesh') || msgText.toLowerCase().includes('air mesh'))) {
                                  return 'Acrylic/Airmesh';
                                }
                                if (msgText.toLowerCase().includes('polyester') && msgText.toLowerCase().includes('laser cut')) {
                                  return 'Polyester/Laser Cut';
                                }
                                const singleFabricMatch = msgText.match(/\b(Cotton|Polyester|Acrylic|Air\s*Mesh|Trucker\s*Mesh|Laser\s*Cut|Suede|Leather)\b/i);
                                if (singleFabricMatch) {
                                  return singleFabricMatch[1];
                                }
                              }
                            }
                            return 'Standard'; // Default if contaminated and can't extract
                          }

                          // If fabric is generic, try to extract from user messages
                          if ((fabric.toLowerCase() === 'standard' || fabric.toLowerCase() === 'acrylic') && messages && messages.length > 0) {
                            const userMessages = messages.filter(m => m.role === 'user');
                            for (const msg of userMessages.slice(-3)) {
                              const msgText = msg.content;
                              if (msgText.toLowerCase().includes('acrylic') && (msgText.toLowerCase().includes('airmesh') || msgText.toLowerCase().includes('air mesh'))) {
                                return 'Acrylic/Airmesh';
                              }
                              if (msgText.toLowerCase().includes('polyester') && msgText.toLowerCase().includes('laser cut')) {
                                return 'Polyester/Laser Cut';
                              }
                              const fabricMatch = msgText.match(/\b(Cotton|Polyester|Acrylic|Air\s*Mesh|Trucker\s*Mesh|Laser\s*Cut|Suede\s*Cotton|Genuine\s*Leather)\b/i);
                              if (fabricMatch) {
                                return fabricMatch[1];
                              }
                            }
                          }

                          // Clean up corrupted fabric data that might contain pricing or other info
                          if (fabric.includes('$') || fabric.includes('*') || fabric.includes('\n') || fabric.length > 50) {
                            const cleanFabricMatch = fabric.match(/\b(Acrylic\/Airmesh|Acrylic\/Air\s*Mesh|Polyester\/Laser\s*Cut|Duck\s*Camo\/Air\s*Mesh|Suede\s*Cotton|Genuine\s*Leather|Cotton|Polyester|Acrylic|Leather)\b/i);
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