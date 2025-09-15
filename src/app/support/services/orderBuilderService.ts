import { OrderBuilderStatus } from '../types';

interface QuoteVersion {
  id: string;
  version: number;
  timestamp: Date;
  pricing: {
    baseProductCost: number;
    logosCost: number;
    deliveryCost: number;
    total: number;
    quantity: number;
  };
  quoteData: any;
  label?: string;
}

export class OrderBuilderService {
  static updateOrderBuilderStatus(
    quoteData: any,
    currentStatus: OrderBuilderStatus,
    setOrderBuilderStatus: React.Dispatch<React.SetStateAction<OrderBuilderStatus>>
  ): void {
    console.log('🔧 updateOrderBuilderStatus called with ENHANCED context preservation check:', {
      hasQuoteData: !!quoteData,
      quoteDataKeys: quoteData ? Object.keys(quoteData) : [],
      hasPricing: !!(quoteData?.pricing),
      pricingTotal: quoteData?.pricing?.total,
      capDetails: quoteData?.capDetails,
      customization: quoteData?.customization,
      delivery: quoteData?.delivery,
      // CRITICAL: Enhanced logging for context-preserved data
      isQuantityUpdate: quoteData?.metadata?.requirements?.isQuantityUpdate,
      contextPreservation: quoteData?.metadata?.requirements?.contextPreservation,
      premiumUpgrades: quoteData?.premiumUpgrades,
      moldCharges: quoteData?.customization?.totalMoldCharges,
      logoCount: quoteData?.customization?.logos?.length || 0,
      accessoryCount: quoteData?.customization?.accessories?.length || 0,
      fullQuoteData: quoteData
    });

    console.log('🔧 [CRITICAL] OrderBuilderService data validation:', {
      quoteDataIsNull: quoteData === null,
      quoteDataIsUndefined: quoteData === undefined,
      capDetailsExists: !!quoteData?.capDetails,
      capDetailsHasQuantity: !!quoteData?.capDetails?.quantity,
      capDetailsHasColor: !!quoteData?.capDetails?.color,
      customizationExists: !!quoteData?.customization,
      customizationHasLogos: !!(quoteData?.customization?.logos && quoteData.customization.logos.length > 0),
      deliveryExists: !!quoteData?.delivery,
      pricingExists: !!quoteData?.pricing,
      // Enhanced validation for conversation context preservation
      hasConversationContinuation: !!quoteData?.conversationContinuation,
      contextPreserved: !!quoteData?.conversationContinuation?.hasContext,
      changedSections: quoteData?.conversationContinuation?.changedSections || []
    });

    const { capDetails, customization, delivery, pricing } = quoteData || {};

    // Additional debugging for data structure
    console.log('🔧 [DEBUG] Destructured data:', {
      capDetails,
      customization,
      delivery,
      pricing,
      quoteDataType: typeof quoteData,
      isNull: quoteData === null,
      isUndefined: quoteData === undefined
    });

    // Update cap style status
    const capStyleItems = {
      size: !!(capDetails?.size || (capDetails?.sizes && capDetails.sizes.length > 0)),
      color: !!(capDetails?.color || (capDetails?.colors && capDetails.colors.length > 0)),
      profile: !!capDetails?.profile,
      shape: !!capDetails?.billShape,
      structure: !!capDetails?.structure,
      fabric: !!capDetails?.fabric,
      stitch: !!(capDetails?.stitching || capDetails?.stitch || capDetails?.closure)
    };

    const compulsoryCapItems = capStyleItems.size && capStyleItems.color && capStyleItems.shape;
    const allCapItems = Object.values(capStyleItems).every(item => item);

    let capStyleStatus: 'red' | 'yellow' | 'green' = 'red';
    if (allCapItems) {
      capStyleStatus = 'green';
    } else if (compulsoryCapItems) {
      capStyleStatus = 'yellow';
    }

    // Update customization status
    const customizationItems = {
      logoSetup: !!(customization?.logos && customization.logos.length > 0),
      accessories: !!(customization?.accessories && customization.accessories.length > 0),
      moldCharges: !!(customization?.totalMoldCharges !== undefined)
    };

    const logoPositions = customization?.logos?.map((logo: any) => logo.location) || [];
    const hasCustomization = Object.values(customizationItems).some(item => item);

    // Update delivery status
    const deliveryItems = {
      method: !!delivery?.method,
      leadTime: !!delivery?.leadTime,
      address: !!delivery?.address
    };
    const deliveryCompleted = !!(delivery?.method && delivery?.totalCost !== undefined);

    // Update cost breakdown status - manages versions
    const costBreakdownAvailable = !!(pricing && pricing.total !== undefined);

    setOrderBuilderStatus(prev => {
      // Ensure versions array exists and is properly initialized
      const existingVersions = prev.costBreakdown?.versions || [];
      let newVersions = [...existingVersions];
      let selectedVersionId = prev.costBreakdown?.selectedVersionId || null;

      if (costBreakdownAvailable) {
        // CRITICAL FIX: Enhanced quote comparison for conversation changes
        const isDifferentQuote = !newVersions.some(v => {
          const totalMatch = Math.abs(v.pricing.total - pricing.total) < 0.01;
          const quantityMatch = v.pricing.quantity === pricing.quantity;
          const logosCostMatch = Math.abs(v.pricing.logosCost - pricing.logosCost) < 0.01;
          const baseProductMatch = Math.abs(v.pricing.baseProductCost - pricing.baseProductCost) < 0.01;

          // For conversation changes, also compare key specifications
          const sameSpecs = JSON.stringify(v.quoteData?.capDetails) === JSON.stringify(quoteData?.capDetails) &&
                           JSON.stringify(v.quoteData?.customization) === JSON.stringify(quoteData?.customization);

          return totalMatch && quantityMatch && logosCostMatch && baseProductMatch && sameSpecs;
        });

        if (isDifferentQuote) {
          // Generate a descriptive label based on the quote differences
          const label = this.generateQuoteLabel(quoteData, newVersions.length + 1);

          // CRITICAL FIX: Include conversation continuation metadata
          const newVersion: QuoteVersion = {
            id: `version_${Date.now()}_${newVersions.length + 1}`,
            version: newVersions.length + 1,
            timestamp: new Date(),
            pricing: {
              baseProductCost: pricing.baseProductCost || 0,
              logosCost: pricing.logosCost || 0,
              deliveryCost: pricing.deliveryCost || 0,
              total: pricing.total || 0,
              quantity: pricing.quantity || 1
            },
            quoteData: {
              ...quoteData,
              // Preserve conversation context for version tracking
              versionMetadata: {
                isConversationUpdate: !!quoteData?.conversationContinuation?.hasContext,
                changedSections: quoteData?.conversationContinuation?.changedSections || [],
                preservedContext: quoteData?.conversationContinuation?.hasContext || false
              }
            },
            label: label
          };

          newVersions.push(newVersion);
          selectedVersionId = newVersion.id; // Auto-select the latest version

          console.log('🔧 [ORDER-BUILDER] Created new version with conversation context:', {
            versionId: newVersion.id,
            isConversationUpdate: newVersion.quoteData.versionMetadata?.isConversationUpdate,
            changedSections: newVersion.quoteData.versionMetadata?.changedSections
          });
        } else {
          console.log('🔧 [ORDER-BUILDER] Quote unchanged, reusing existing version');
        }
      }

      return {
        capStyle: {
          completed: allCapItems,
          items: capStyleItems,
          status: capStyleStatus
        },
        customization: {
          completed: hasCustomization,
          items: customizationItems,
          logoPositions: logoPositions,
          status: hasCustomization ? 'yellow' : 'red'
        },
        delivery: {
          completed: deliveryCompleted,
          items: deliveryItems,
          status: deliveryCompleted ? 'green' : 'red'
        },
        costBreakdown: {
          completed: costBreakdownAvailable,
          status: costBreakdownAvailable ? 'green' : 'red',
          selectedVersionId: selectedVersionId,
          versions: newVersions
        }
      };
    });
  }

  static enhanceQuoteDataFromUserInput(userMessage: string, currentCapDetails: any): any {
    console.log('🔍 [USER-SPEC-EXTRACT] Processing user message:', userMessage.substring(0, 100));

    const enhancements: any = {};

    // CRITICAL FIX: Extract color specifications with support for slash patterns like "Black/Grey"
    // Priority 1: Check for slash patterns (Black/Grey, Red/White, etc.)
    const slashColorMatch = userMessage.match(/(\b\w+)\/(\w+\b)/gi);
    if (slashColorMatch && slashColorMatch.length > 0) {
      const combinedColors = slashColorMatch[0].split('/').map(color =>
        color.charAt(0).toUpperCase() + color.slice(1).toLowerCase()
      );
      enhancements.colors = combinedColors;
      enhancements.color = slashColorMatch[0]; // Preserve the original slash format
      console.log('✅ [USER-SPEC] FIXED: Extracted slash colors:', slashColorMatch[0], combinedColors);
    } else {
      // Fallback: Individual color matching
      const colorMatch = userMessage.match(/\b(red|blue|black|white|green|yellow|navy|gray|grey|brown|khaki|orange|purple)\b/gi);
      if (colorMatch && colorMatch.length > 0) {
        const uniqueColors = [...new Set(colorMatch.map(color =>
          color.charAt(0).toUpperCase() + color.slice(1).toLowerCase()
        ))];
        if (uniqueColors.length === 1) {
          enhancements.colors = uniqueColors;
          enhancements.color = uniqueColors[0];
        } else {
          // Multiple individual colors - join with slash
          enhancements.colors = uniqueColors;
          enhancements.color = uniqueColors.join('/');
        }
        console.log('✅ [USER-SPEC] Extracted individual colors:', uniqueColors);
      }
    }

    // Extract size specifications
    const sizePatterns = [
      /\b(small|medium|large|xl|xxl|fitted)\b/gi,
      /\b(one size|adjustable|universal)\b/gi,
      /\b(\d+\s*cm|\d+\.\d+\s*cm)\b/gi,
      /\b(7\s*1\/8|7\s*1\/4|7\s*3\/8|7\s*1\/2|7\s*5\/8|7\s*3\/4|7\s*7\/8|8)\b/gi
    ];

    for (const pattern of sizePatterns) {
      const sizeMatch = userMessage.match(pattern);
      if (sizeMatch && sizeMatch.length > 0) {
        let extractedSize = sizeMatch[0].toLowerCase();

        if (extractedSize === 'fitted') {
          continue; // This is a closure type
        } else if (['small', 'medium', 'large', 'xl', 'xxl'].includes(extractedSize)) {
          extractedSize = extractedSize.charAt(0).toUpperCase() + extractedSize.slice(1);
        } else if (extractedSize.includes('one size') || extractedSize.includes('adjustable')) {
          extractedSize = 'One Size';
        }

        enhancements.size = extractedSize;
        console.log('✅ [USER-SPEC] Extracted size:', extractedSize);
        break;
      }
    }

    // Extract quantity specifications
    const quantityMatch = userMessage.match(/\b(\d+)\s*(?:pieces?|caps?|hats?|units?)\b/gi);
    if (quantityMatch && quantityMatch.length > 0) {
      const quantity = parseInt(quantityMatch[0].match(/\d+/)![0]);
      if (quantity > 0 && quantity <= 10000) { // Reasonable limits
        enhancements.quantity = quantity;
        console.log('✅ [USER-SPEC] Extracted quantity:', quantity);
      }
    }

    // Extract fabric specifications
    const fabricPatterns = [
      /\b(cotton|polyester|acrylic|mesh|suede|leather|canvas|denim|wool)\b/gi,
      /\b(trucker mesh|air mesh|laser cut)\b/gi
    ];

    for (const pattern of fabricPatterns) {
      const fabricMatch = userMessage.match(pattern);
      if (fabricMatch && fabricMatch.length > 0) {
        let extractedFabric = fabricMatch[0];
        extractedFabric = extractedFabric.charAt(0).toUpperCase() + extractedFabric.slice(1).toLowerCase();

        // Normalize fabric names
        if (extractedFabric.toLowerCase().includes('trucker mesh')) {
          extractedFabric = 'Trucker Mesh';
        } else if (extractedFabric.toLowerCase().includes('air mesh')) {
          extractedFabric = 'Air Mesh';
        } else if (extractedFabric.toLowerCase().includes('laser cut')) {
          extractedFabric = 'Laser Cut';
        }

        enhancements.fabric = extractedFabric;
        console.log('✅ [USER-SPEC] Extracted fabric:', extractedFabric);
        break;
      }
    }

    // Extract closure specifications
    const closureMatch = userMessage.match(/\b(fitted|snapback|adjustable|velcro|buckle|elastic)\b/gi);
    if (closureMatch && closureMatch.length > 0) {
      let extractedClosure = closureMatch[0];
      extractedClosure = extractedClosure.charAt(0).toUpperCase() + extractedClosure.slice(1).toLowerCase();
      enhancements.closure = extractedClosure;
      console.log('✅ [USER-SPEC] Extracted closure:', extractedClosure);
    }

    // Extract bill shape specifications
    const shapeMatch = userMessage.match(/\b(flat|curved|slight curved)\b/gi);
    if (shapeMatch && shapeMatch.length > 0) {
      let extractedShape = shapeMatch[0];
      if (extractedShape.toLowerCase() === 'flat') {
        extractedShape = 'Flat';
      } else if (extractedShape.toLowerCase() === 'curved') {
        extractedShape = 'Curved';
      } else if (extractedShape.toLowerCase().includes('slight')) {
        extractedShape = 'Curved'; // CRITICAL FIX: Normalize "Slight Curved" to "Curved"
      }
      enhancements.billShape = extractedShape;
      console.log('✅ [USER-SPEC] Extracted bill shape:', extractedShape);
    }

    console.log('🔧 [USER-SPEC-EXTRACT] Final enhancements:', enhancements);
    return enhancements;
  }

  private static generateQuoteLabel(quoteData: any, version: number): string {
    const { capDetails, customization, pricing } = quoteData;

    let labelParts: string[] = [];

    // Add fabric if unique/premium
    if (capDetails?.fabric && !capDetails.fabric.toLowerCase().includes('cotton')) {
      labelParts.push(capDetails.fabric);
    }

    // Add primary color
    if (capDetails?.colors && capDetails.colors.length > 0) {
      labelParts.push(capDetails.colors[0]);
    } else if (capDetails?.color) {
      labelParts.push(capDetails.color);
    }

    // Add logo count if any
    if (customization?.logos && customization.logos.length > 0) {
      labelParts.push(`${customization.logos.length} Logo${customization.logos.length > 1 ? 's' : ''}`);
    }

    // Add accessories if any
    if (customization?.accessories && customization.accessories.length > 0) {
      labelParts.push('Accessories');
    }

    // Add quantity
    if (pricing?.quantity > 1) {
      labelParts.push(`${pricing.quantity} pcs`);
    }

    // If no specific features, use generic label
    if (labelParts.length === 0) {
      labelParts.push('Custom Quote');
    }

    return `Version ${version}: ${labelParts.join(' • ')}`;
  }

  static canQuoteOrder(orderBuilderStatus: OrderBuilderStatus): boolean {
    return orderBuilderStatus.capStyle.status === 'green' &&
           orderBuilderStatus.delivery.status === 'green';
  }

  static toggleBlockCollapse(
    block: string,
    collapsedBlocks: Record<string, boolean>,
    setCollapsedBlocks: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
  ): void {
    setCollapsedBlocks(prev => ({
      ...prev,
      [block]: !prev[block]
    }));
  }
}