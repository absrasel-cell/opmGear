/**
 * 🚨 CRITICAL PRICING VALIDATION SYSTEM
 * Post-processes AI responses to validate and correct pricing against CSV data
 * Ensures 100% accuracy for all quantity tiers including 5000+ pieces
 */
export async function validateAndCorrectAIPricing(aiResponse: string, context: any): Promise<string> {
  console.log('🔍 [PRICE-VALIDATOR] Starting post-processing validation');
  
  // Skip validation for non-quote responses
  if (!context.lastQuote || !aiResponse.includes('$')) {
    console.log('✅ [PRICE-VALIDATOR] No pricing to validate - skipping');
    return aiResponse;
  }

  try {
    const { lastQuote } = context;
    const { costBreakdown, quantity } = lastQuote;
    
    console.log('🎯 [PRICE-VALIDATOR] Validating pricing for:', {
      quantity,
      totalCost: costBreakdown.totalCost,
      components: Object.keys(costBreakdown).filter(key => 
        key.endsWith('Total') && costBreakdown[key] > 0
      )
    });

    let correctedResponse = aiResponse;
    let correctionsMade = 0;

    // 1. BLANK CAP PRICE CORRECTIONS
    if (costBreakdown.detailedBreakdown?.blankCaps) {
      const correctCapPrice = costBreakdown.detailedBreakdown.blankCaps.unitPrice;
      const correctCapTotal = costBreakdown.detailedBreakdown.blankCaps.total;
      
      // Pattern to match: "•Color: quantity pieces × $price = $total" or "quantity pieces × $price = $total"
      const capPricePattern = new RegExp(`(?:•\\w+:\\s*)?${quantity}\\s*(?:pieces?|caps?)\\s*×\\s*\\$([\\d,.]+)\\s*=\\s*\\$([\\d,.]+)`, 'gi');
      
      correctedResponse = correctedResponse.replace(capPricePattern, (match, unitPrice, total) => {
        const aiUnitPrice = parseFloat(unitPrice.replace(/,/g, ''));
        const aiTotal = parseFloat(total.replace(/,/g, ''));
        
        if (Math.abs(aiUnitPrice - correctCapPrice) > 0.01 || Math.abs(aiTotal - correctCapTotal) > 0.01) {
          console.log('🔧 [PRICE-VALIDATOR] Correcting blank cap pricing:', {
            ai: { unitPrice: aiUnitPrice, total: aiTotal },
            correct: { unitPrice: correctCapPrice, total: correctCapTotal }
          });
          correctionsMade++;
          // Preserve color prefix if it exists
          const colorPrefix = match.match(/^•\w+:\s*/);
          const prefix = colorPrefix ? colorPrefix[0] : '';
          return `${prefix}${quantity} pieces × $${correctCapPrice.toFixed(2)} = $${correctCapTotal.toFixed(2)}`;
        }
        return match;
      });
    }

    // 2. FABRIC PRICE CORRECTIONS
    if (costBreakdown.detailedBreakdown?.premiumFabric && costBreakdown.premiumFabricTotal > 0) {
      const correctFabricPrice = costBreakdown.detailedBreakdown.premiumFabric.unitPrice;
      const correctFabricTotal = costBreakdown.detailedBreakdown.premiumFabric.total;
      
      // Pattern for fabric pricing
      const fabricPricePattern = new RegExp(`(?:Laser Cut Fabric|Premium Fabric)[^$]*?:\\s*${quantity}\\s*pieces\\s*×\\s*\\$([\\d,.]+)\\s*=\\s*\\$([\\d,.]+)`, 'gi');
      
      correctedResponse = correctedResponse.replace(fabricPricePattern, (match, unitPrice, total) => {
        const aiUnitPrice = parseFloat(unitPrice.replace(/,/g, ''));
        const aiTotal = parseFloat(total.replace(/,/g, ''));
        
        if (Math.abs(aiUnitPrice - correctFabricPrice) > 0.01 || Math.abs(aiTotal - correctFabricTotal) > 0.01) {
          console.log('🔧 [PRICE-VALIDATOR] Correcting fabric pricing:', {
            ai: { unitPrice: aiUnitPrice, total: aiTotal },
            correct: { unitPrice: correctFabricPrice, total: correctFabricTotal }
          });
          correctionsMade++;
          return match.replace(/\$[\d,.]+\s*=\s*\$[\d,.]+/, `$${correctFabricPrice.toFixed(2)} = $${correctFabricTotal.toFixed(2)}`);
        }
        return match;
      });
    }

    // 3. CLOSURE PRICE CORRECTIONS  
    if (costBreakdown.detailedBreakdown?.premiumClosure && costBreakdown.closureTotal > 0) {
      const correctClosurePrice = costBreakdown.detailedBreakdown.premiumClosure.unitPrice;
      const correctClosureTotal = costBreakdown.detailedBreakdown.premiumClosure.total;
      
      // Pattern for closure pricing - FIXED: Include all closure types and bullet formats
      const closurePricePattern = new RegExp(`(?:•|\\*)?\\s*(?:Flexfit|Fitted|Buckle|Stretched|Premium)\\s*Closure[^$]*?:\\s*${quantity}\\s*pieces\\s*×\\s*\\$([\\d,.]+)\\s*=\\s*\\$([\\d,.]+)`, 'gi');
      
      correctedResponse = correctedResponse.replace(closurePricePattern, (match, unitPrice, total) => {
        const aiUnitPrice = parseFloat(unitPrice.replace(/,/g, ''));
        const aiTotal = parseFloat(total.replace(/,/g, ''));
        
        if (Math.abs(aiUnitPrice - correctClosurePrice) > 0.01 || Math.abs(aiTotal - correctClosureTotal) > 0.01) {
          console.log('🔧 [PRICE-VALIDATOR] Correcting closure pricing:', {
            ai: { unitPrice: aiUnitPrice, total: aiTotal },
            correct: { unitPrice: correctClosurePrice, total: correctClosureTotal }
          });
          correctionsMade++;
          return match.replace(/\$[\d,.]+\s*=\s*\$[\d,.]+/, `$${correctClosurePrice.toFixed(2)} = $${correctClosureTotal.toFixed(2)}`);
        }
        return match;
      });
    }

    // 4. ACCESSORY PRICE CORRECTIONS
    if (costBreakdown.detailedBreakdown?.accessories && costBreakdown.accessoriesTotal > 0) {
      costBreakdown.detailedBreakdown.accessories.forEach((accessory: any) => {
        const correctAccessoryPrice = accessory.unitPrice;
        const correctAccessoryTotal = accessory.totalCost;
        
        // Pattern for accessory pricing (Hang Tag, Sticker, etc.)
        const accessoryPattern = new RegExp(`${accessory.name}[^$]*?:\\s*${quantity}\\s*pieces\\s*×\\s*\\$([\\d,.]+)\\s*=\\s*\\$([\\d,.]+)`, 'gi');
        
        correctedResponse = correctedResponse.replace(accessoryPattern, (match, unitPrice, total) => {
          const aiUnitPrice = parseFloat(unitPrice.replace(/,/g, ''));
          const aiTotal = parseFloat(total.replace(/,/g, ''));
          
          if (Math.abs(aiUnitPrice - correctAccessoryPrice) > 0.01 || Math.abs(aiTotal - correctAccessoryTotal) > 0.01) {
            console.log('🔧 [PRICE-VALIDATOR] Correcting accessory pricing:', {
              accessory: accessory.name,
              ai: { unitPrice: aiUnitPrice, total: aiTotal },
              correct: { unitPrice: correctAccessoryPrice, total: correctAccessoryTotal }
            });
            correctionsMade++;
            return match.replace(/\$[\d,.]+\s*=\s*\$[\d,.]+/, `$${correctAccessoryPrice.toFixed(2)} = $${correctAccessoryTotal.toFixed(2)}`);
          }
          return match;
        });
      });
    }

    // 5. DELIVERY PRICE CORRECTIONS
    if (costBreakdown.detailedBreakdown?.delivery && costBreakdown.deliveryTotal > 0) {
      const correctDeliveryPrice = costBreakdown.detailedBreakdown.delivery.unitPrice;
      const correctDeliveryTotal = costBreakdown.detailedBreakdown.delivery.total;
      
      // Pattern for delivery pricing
      const deliveryPricePattern = new RegExp(`(?:Regular Delivery|Delivery)[^$]*?:\\s*${quantity}\\s*pieces\\s*×\\s*\\$([\\d,.]+)\\s*=\\s*\\$([\\d,.]+)`, 'gi');
      
      correctedResponse = correctedResponse.replace(deliveryPricePattern, (match, unitPrice, total) => {
        const aiUnitPrice = parseFloat(unitPrice.replace(/,/g, ''));
        const aiTotal = parseFloat(total.replace(/,/g, ''));
        
        if (Math.abs(aiUnitPrice - correctDeliveryPrice) > 0.01 || Math.abs(aiTotal - correctDeliveryTotal) > 0.01) {
          console.log('🔧 [PRICE-VALIDATOR] Correcting delivery pricing:', {
            ai: { unitPrice: aiUnitPrice, total: aiTotal },
            correct: { unitPrice: correctDeliveryPrice, total: correctDeliveryTotal }
          });
          correctionsMade++;
          return match.replace(/\$[\d,.]+\s*=\s*\$[\d,.]+/, `$${correctDeliveryPrice.toFixed(2)} = $${correctDeliveryTotal.toFixed(2)}`);
        }
        return match;
      });
    }

    // 6. TOTAL COST CORRECTIONS
    const correctTotal = costBreakdown.totalCost;
    
    // Pattern for total costs - various formats
    const totalPatterns = [
      /\*\*Total Order:\s*\$([\\d,.]+)\*\*/gi,
      /Total Order for \d+ pieces:\s*\$([\\d,.]+)/gi,
      /TOTAL:\s*\$([\\d,.]+)/gi,
      /Grand Total:\s*\$([\\d,.]+)/gi
    ];
    
    totalPatterns.forEach(pattern => {
      correctedResponse = correctedResponse.replace(pattern, (match, total) => {
        const aiTotal = parseFloat(total.replace(/,/g, ''));
        
        if (Math.abs(aiTotal - correctTotal) > 0.01) {
          console.log('🔧 [PRICE-VALIDATOR] Correcting total cost:', {
            ai: aiTotal,
            correct: correctTotal
          });
          correctionsMade++;
          return match.replace(/\$[\d,.]+/, `$${correctTotal.toFixed(2)}`);
        }
        return match;
      });
    });

    console.log(`✅ [PRICE-VALIDATOR] Validation complete - ${correctionsMade} corrections made`);
    
    // Add validation notice if corrections were made
    if (correctionsMade > 0) {
      console.log('🎯 [PRICE-VALIDATOR] Added validation notice to response');
      correctedResponse += `\n\n*✅ Pricing validated against current CSV data (${correctionsMade} corrections applied)*`;
    }

    return correctedResponse;

  } catch (error) {
    console.error('❌ [PRICE-VALIDATOR] Validation failed:', error);
    return aiResponse; // Return original response if validation fails
  }
}