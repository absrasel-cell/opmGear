export class QuoteParsingService {
  static parseQuoteFromMessage(message: string, preservedContext?: any): any {
    try {
      console.log('🔍 [QUOTE-PARSER] Parsing message for quote data:', message.substring(0, 200));
      console.log('🔍 [QUOTE-PARSER] Has preserved context:', !!preservedContext);

      // Extract key pricing information from the AI message
      const priceRegex = /Total Order:\s*\$([0-9,]+\.?\d*)/i;
      const quantityRegex = /(\d+)\s*pieces?/i;
      const blankCapRegex = /Blank Cap[s]?.*?:\s*\$([0-9,]+\.?\d*)/i;
      const customizationRegex = /Customization.*?:\s*\$([0-9,]+\.?\d*)/i;
      const deliveryRegex = /Delivery.*?:\s*\$([0-9,]+\.?\d*)/i;

      const totalMatch = message.match(priceRegex);
      const quantityMatch = message.match(quantityRegex);
      const blankCapMatch = message.match(blankCapRegex);
      const customizationMatch = message.match(customizationRegex);
      const deliveryMatch = message.match(deliveryRegex);

      if (!totalMatch || !quantityMatch) {
        console.log('❌ [QUOTE-PARSER] No pricing/quantity found');
        return null;
      }

      const total = parseFloat(totalMatch[1].replace(/,/g, ''));
      const quantity = parseInt(quantityMatch[1]);
      const blankCapCost = blankCapMatch ? parseFloat(blankCapMatch[1].replace(/,/g, '')) : 0;
      const customizationCost = customizationMatch ? parseFloat(customizationMatch[1].replace(/,/g, '')) : 0;
      const deliveryCost = deliveryMatch ? parseFloat(deliveryMatch[1].replace(/,/g, '')) : 0;

      // Extract product details
      const productRegex = /(?:Product:|Cap).*?(\w+.*?(?:Cap|112|Era))/i;
      const productMatch = message.match(productRegex);
      const productName = productMatch ? productMatch[1].trim() : 'Custom Cap';

      console.log('✅ [QUOTE-PARSER] Extracted pricing:', { total, quantity, blankCapCost, customizationCost, deliveryCost });

      // CRITICAL FIX: Merge with preserved context when available
      const baseQuoteData = {
        capDetails: {
          productName,
          quantity,
          size: this.extractSize(message),
          colors: this.extractColors(message),
          profile: this.extractProfile(message),
          billShape: this.extractBillShape(message),
          structure: this.extractStructure(message),
          fabric: this.extractFabric(message),
          closure: this.extractClosure(message),
          stitch: 'Standard' // Default
        },
        customization: {
          logos: this.extractLogos(message),
          accessories: this.extractAccessories(message),
          logoSetup: 'Custom Logo Setup',
          moldCharges: customizationCost > 0 ? `$${customizationCost.toFixed(2)}` : null
        },
        delivery: {
          method: 'Regular Delivery',
          leadTime: this.extractLeadTime(message),
          cost: deliveryCost
        },
        pricing: {
          baseProductCost: blankCapCost,
          logosCost: customizationCost,
          deliveryCost: deliveryCost,
          total: total,
          quantity: quantity
        }
      };

      // Merge with preserved context if available
      const quoteData = preservedContext ? this.mergeWithPreservedContext(baseQuoteData, preservedContext) : baseQuoteData;

      console.log('✅ [QUOTE-PARSER] Successfully parsed quote data:', quoteData);
      return quoteData;

    } catch (error) {
      console.error('❌ [QUOTE-PARSER] Error parsing quote:', error);
      return null;
    }
  }

  private static extractFabric(text: string): string {
    console.log('🧵 [FABRIC-EXTRACTION] Analyzing text for fabric patterns:', text.substring(0, 200));

    // IMPORTANT: Order matters! More specific patterns first to prevent partial matches
    const fabricPatterns = [
      // Complex fabric combinations (HIGHEST PRIORITY)
      /(Polyester\/Laser Cut|Laser Cut\/Polyester|Polyester\s+Laser Cut|Laser Cut\s+Polyester)/i,
      /(Acrylic\/Air Mesh|Air Mesh\/Acrylic|Acrylic\/Airmesh|Airmesh\/Acrylic)/i,
      /(Duck Camo\/Air Mesh|Air Mesh\/Duck Camo)/i,
      // Premium Fabric section
      /🧵\s*Premium Fabric\s*\(([^)]+)\)/i,
      /Premium Fabric\s*\(([^)]+)\)/i,
      /🧵[^:]*Premium Fabric[^:]*\(([^)]+)\)[^:]*:/i,
      // Direct fabric specification
      /(?:Fabric|Material):\s*([A-Za-z][A-Za-z\s\/\+]*?)(?:\s|$|,|\n|\.)/i,
      // User change requests
      /(?:change|changing).*?fabric.*?to\s+([^,\n.!?]+)/i,
      // Premium fabric combinations
      /(Suede Cotton|Cotton Suede)/i,
      /(Genuine Leather|Real Leather|Leather)/i,
      // General fabric detection
      /(?:made from|constructed from|featuring)\s+([^,\n]*(?:Acrylic|Air Mesh|Suede Cotton|Camo|Leather|Polyester|Cotton)[^,\n]*)/i,
      // Standalone fabric mentions (LOWEST PRIORITY)
      /\b(Laser Cut|Acrylic|Air Mesh|Trucker Mesh|Suede|Leather|Polyester|Cotton)\b/i
    ];

    for (let i = 0; i < fabricPatterns.length; i++) {
      const pattern = fabricPatterns[i];
      const match = text.match(pattern);
      if (match) {
        let fabricValue = match[1] || match[0];
        fabricValue = fabricValue.trim();

        // Skip invalid values
        if (fabricValue.includes('$') || fabricValue.includes('*') || fabricValue.includes('\n') || fabricValue.length > 50) {
          console.log(`⚠️ [FABRIC-EXTRACTION] Invalid fabric value: "${fabricValue.substring(0, 50)}..."`);
          continue;
        }

        // Clean up and normalize
        const lowerFabric = fabricValue.toLowerCase();
        if (lowerFabric.includes('polyester') && lowerFabric.includes('laser cut')) {
          fabricValue = 'Polyester/Laser Cut';
        } else if (lowerFabric.includes('acrylic') && lowerFabric.includes('air mesh')) {
          fabricValue = 'Acrylic/Air Mesh';
        } else if (lowerFabric.includes('duck camo') && lowerFabric.includes('air mesh')) {
          fabricValue = 'Duck Camo/Air Mesh';
        } else if (lowerFabric.includes('suede')) {
          fabricValue = 'Suede Cotton';
        } else if (lowerFabric.includes('leather')) {
          fabricValue = 'Genuine Leather';
        }

        console.log(`✅ [FABRIC-EXTRACTION] Found fabric: "${fabricValue}"`);
        return fabricValue;
      }
    }

    console.log('⚠️ [FABRIC-EXTRACTION] No fabric found, using fallback');
    return 'Standard Cotton';
  }

  private static extractColors(text: string): string[] {
    console.log('🎨 [COLOR-EXTRACTION] Analyzing text for color patterns:', text.substring(0, 200));

    // Look for AI response format "• Color: pieces × $price"
    const aiResponseColorPattern = /•\s*([^:]+?):\s*\d+\s*pieces/gi;
    const aiColorMatches = [...text.matchAll(aiResponseColorPattern)];
    if (aiColorMatches.length > 0) {
      const colorFromAI = aiColorMatches[0][1].trim();
      console.log(`✅ [COLOR-EXTRACTION] Found AI response color: "${colorFromAI}"`);
      return colorFromAI.includes('/') ? [colorFromAI] : [colorFromAI];
    }

    // Look for explicit color specifications
    const colorPatterns = [
      /(?:color|colours?):\s*([^,\n]+)/i,
      /Colors?:\s*([^,\n]+)/i,
    ];

    for (const pattern of colorPatterns) {
      const match = text.match(pattern);
      if (match) {
        const rawColorString = match[1].trim();

        if (rawColorString.includes('/')) {
          const splitColors = rawColorString.split('/').map(c => c.trim()).filter(c => c.length > 0);
          if (splitColors.length === 2) {
            console.log(`✅ [COLOR-EXTRACTION] Found split colors: ${splitColors.join('/')}`);
            return [splitColors.join('/')];
          }
        }

        const colors = rawColorString.split(/[,&]/).map(c => c.trim()).filter(c => c.length > 0);
        const cleanColors = colors.filter(color =>
          !color.toLowerCase().includes('camo') &&
          !color.toLowerCase().includes('mesh') &&
          !color.toLowerCase().includes('fabric')
        );

        if (cleanColors.length > 0) {
          console.log(`✅ [COLOR-EXTRACTION] Found explicit colors: ${cleanColors.join(', ')}`);
          return cleanColors;
        }
      }
    }

    // Look for split color patterns (e.g., "Red/White")
    const splitColorPattern = /\b([A-Z][a-z]+)\/([A-Z][a-z]+)\b/g;
    const splitColorMatches = [...text.matchAll(splitColorPattern)];
    if (splitColorMatches.length > 0) {
      const splitColor = `${splitColorMatches[0][1]}/${splitColorMatches[0][2]}`;
      console.log(`✅ [COLOR-EXTRACTION] Found split color: ${splitColor}`);
      return [splitColor];
    }

    // Look for common colors
    const commonColors = ['Black', 'White', 'Navy', 'Red', 'Blue', 'Gray', 'Grey', 'Green', 'Brown'];
    const foundColors = commonColors.filter(color => {
      const regex = new RegExp(`\\b${color}\\b`, 'i');
      return regex.test(text) && !new RegExp(`${color}\\s+(?:camo|mesh|fabric)`, 'i').test(text);
    });

    console.log(`✅ [COLOR-EXTRACTION] Found colors: ${foundColors.join(', ')}`);
    return foundColors.length > 0 ? foundColors : ['Black'];
  }

  private static extractAccessories(text: string): string[] {
    const accessories: string[] = [];
    console.log('🎁 [ACCESSORIES-EXTRACTION] Analyzing text:', text.substring(0, 300));

    // Look for accessories in 🎁 Accessories section
    const accessoriesSection = text.match(/🎁\s*\*\*?Accessories:?\*\*?([\s\S]*?)(?=🚚|\*\*|$)/i);

    if (accessoriesSection) {
      const accessoriesContent = accessoriesSection[1];
      console.log('🎁 [ACCESSORIES-EXTRACTION] Found section:', accessoriesContent.substring(0, 200));

      const accessoryPatterns = [
        /•\s*([^:]+?):\s*\d+\s*pieces/gi,
        /([A-Za-z\s\-()]+?):\s*\d+\s*pieces/gi,
        /•\s*([^:]+?)(?:\s*\([^)]*\))?:\s*\d+/gi,
      ];

      for (const pattern of accessoryPatterns) {
        const matches = [...accessoriesContent.matchAll(pattern)];
        matches.forEach(match => {
          let accessoryName = String(match[1]).trim();

          if (accessoryName.includes('(Inside Label)')) {
            accessoryName = 'Label';
          }

          if (accessoryName && accessoryName !== 'undefined' && accessoryName !== 'null' && !accessories.includes(accessoryName)) {
            accessories.push(accessoryName);
            console.log('✅ [ACCESSORIES-EXTRACTION] Found:', accessoryName);
          }
        });
      }
    }

    // Fallback: common accessories
    if (accessories.length === 0) {
      const commonAccessories = [
        { name: 'Hang Tag', patterns: [/hang\s*tag/gi] },
        { name: 'Sticker', patterns: [/sticker/gi] },
        { name: 'Inside Label', patterns: [/inside\s*label/gi] },
        { name: 'Label', patterns: [/label(?!\s*\([^)]*inside[^)]*\))/gi] }
      ];

      commonAccessories.forEach(accessory => {
        accessory.patterns.forEach(pattern => {
          if (pattern.test(text) && !accessories.includes(accessory.name)) {
            accessories.push(accessory.name);
            console.log('✅ [ACCESSORIES-EXTRACTION] Found common:', accessory.name);
          }
        });
      });
    }

    return accessories.filter(acc => acc && typeof acc === 'string');
  }

  private static extractLogos(text: string): Array<{ location: string; type: string; size: string }> {
    const logos: Array<{ location: string; type: string; size: string }> = [];
    console.log('🏷️ [LOGO-EXTRACTION] Analyzing text:', text.substring(0, 300));

    const logoPatterns = [
      // Pattern: [Size] [Type] [Position]
      /(Large|Small)\s+(Leather\s+Patch|3D\s+Embroidery|Flat\s+Embroidery|Rubber\s+Patch|Screen\s+Print)\s+(Front|Left|Right|Back|Upper\s+Bill|Under\s+Bill)/gi,
      // Pattern: [Position]: [Description]
      /(Front|Left|Right|Back|Upper\s+Bill|Under\s+Bill):\s*([^:\n]+?)(?=\s*\d+|$|\n|•)/gi,
      // Pattern: [Type] at [Position]
      /(Leather\s+Patch|3D\s+Embroidery|Flat\s+Embroidery|Rubber\s+Patch|Screen\s+Print)\s+(?:at|on)\s+(Front|Left|Right|Back|Upper\s+Bill|Under\s+Bill)/gi
    ];

    for (const pattern of logoPatterns) {
      const matches = [...text.matchAll(pattern)];
      matches.forEach(match => {
        let position, logoType, size;

        if (match[3]) {
          // [Size] [Type] [Position]
          size = match[1].trim();
          logoType = `${size} ${match[2].trim()}`;
          position = match[3].trim();
        } else if (match[2] && !match[3]) {
          // [Position]: [Description] or [Type] at [Position]
          if (match[0].includes(':')) {
            position = match[1].trim();
            const description = match[2].trim();
            logoType = description;
            size = description.toLowerCase().includes('large') ? 'Large' : 'Small';
          } else {
            logoType = match[1].trim();
            position = match[2].trim();
            size = logoType.toLowerCase().includes('large') ? 'Large' : 'Small';
          }
        }

        if (position && logoType) {
          // Normalize position names
          position = position.replace(/\s+/g, ' ').trim();
          if (position.toLowerCase().includes('upper bill')) {
            position = 'Upper Bill';
          } else if (position.toLowerCase().includes('under bill')) {
            position = 'Under Bill';
          } else {
            position = position.charAt(0).toUpperCase() + position.slice(1).toLowerCase();
          }

          const logo = {
            location: position,
            type: logoType,
            size: size || 'Medium'
          };

          // Avoid duplicates
          const isDuplicate = logos.some(existingLogo =>
            existingLogo.location === logo.location && existingLogo.type === logo.type
          );

          if (!isDuplicate) {
            logos.push(logo);
            console.log('✅ [LOGO-EXTRACTION] Found logo:', logo);
          }
        }
      });
    }

    // Fallback: generic logo mentions
    if (logos.length === 0) {
      if (text.includes('3D Embroidery')) {
        logos.push({ location: 'Front', type: 'Large 3D Embroidery', size: 'Large' });
      }
      if (text.includes('Leather Patch')) {
        logos.push({ location: 'Front', type: 'Large Leather Patch', size: 'Large' });
      }
    }

    return logos;
  }

  private static extractProfile(text: string): string {
    if (/(?:high|tall)\s*profile/i.test(text)) return 'High';
    if (/(?:mid|medium)\s*profile/i.test(text)) return 'Mid';
    if (/low\s*profile/i.test(text)) return 'Low';
    return 'High';
  }

  private static extractStructure(text: string): string {
    if (/unstructured/i.test(text)) return 'Unstructured';
    if (/structured/i.test(text)) return 'Structured';
    return 'Structured';
  }

  private static extractClosure(text: string): string {
    const closurePatterns = [
      /(?:Closure|Fit):\s*(Fitted|Snapback|Adjustable|Velcro|Buckle|Elastic)\b/i,
      /Premium Closure\s*\((Fitted|Snapback|Adjustable|Velcro|Buckle|Elastic)\)/i,
      /\b(Fitted|Snapback|Adjustable|Velcro|Buckle|Elastic)\b/i
    ];

    for (const pattern of closurePatterns) {
      const match = text.match(pattern);
      if (match) {
        let closureValue = match[1] || match[0];
        closureValue = closureValue.replace(/[\$\*\n,]+.*$/, '').trim();

        // Normalize
        const lower = closureValue.toLowerCase();
        if (lower.includes('fitted')) return 'Fitted';
        if (lower.includes('snapback')) return 'Snapback';
        if (lower.includes('adjustable')) return 'Adjustable';
        if (lower.includes('velcro')) return 'Velcro';
        if (lower.includes('buckle')) return 'Buckle';
        if (lower.includes('elastic')) return 'Elastic';

        return closureValue;
      }
    }

    return 'Snapback';
  }

  private static extractBillShape(text: string): string {
    const shapePatterns = [
      /(?:Shape|Bill):\s*([^,\n]+)/i,
      /(?:change|changing)\s*shape\s*to\s*([^,\n]+)/i,
      /\b(Flat|Curved|Slight\s*Curved)\s*(?:Caps?|Bill)?/i,
      /flat\s*bill/i,
      /curved\s*bill/i
    ];

    for (const pattern of shapePatterns) {
      const match = text.match(pattern);
      if (match) {
        let shapeValue = match[1] || match[0];
        shapeValue = shapeValue.trim();

        const lower = shapeValue.toLowerCase();
        if (lower.includes('flat')) return 'Flat';
        if (lower.includes('slight') && lower.includes('curved')) return 'Curved'; // CRITICAL FIX: Normalize to "Curved"
        if (lower.includes('curved')) return 'Curved';

        return shapeValue;
      }
    }

    return 'Curved';
  }

  private static extractSize(text: string): string {
    const sizePatterns = [
      /Size:\s*([^,\n]+)/i,
      /\b(Small|Medium|Large|XL|XXL|One Size|Adjustable)\b/i
    ];

    for (const pattern of sizePatterns) {
      const match = text.match(pattern);
      if (match) {
        return match[1] || match[0];
      }
    }

    return 'One Size';
  }

  private static extractLeadTime(text: string): string {
    const leadTimePatterns = [
      /Lead Time:\s*([^,\n]+)/i,
      /(\d+[-–]\d+)\s*(?:business\s*)?days/i,
      /(\d+)\s*(?:business\s*)?days/i
    ];

    for (const pattern of leadTimePatterns) {
      const match = text.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return '10-14 business days';
  }

  /**
   * CRITICAL FIX: Merge extracted data with preserved context for conversation continuity
   */
  private static mergeWithPreservedContext(baseQuoteData: any, preservedContext: any): any {
    console.log('🔄 [QUOTE-PARSER] Merging with preserved context:', {
      baseKeys: Object.keys(baseQuoteData),
      contextKeys: Object.keys(preservedContext),
      preservedQuantity: preservedContext.quantity,
      baseQuantity: baseQuoteData.capDetails?.quantity
    });

    const merged = JSON.parse(JSON.stringify(baseQuoteData)); // Deep copy

    // CRITICAL FIX: ALWAYS preserve context values when available (higher priority than new extractions)
    if (preservedContext.quantity && preservedContext.quantity > 0) {
      merged.capDetails.quantity = preservedContext.quantity;
      merged.pricing.quantity = preservedContext.quantity;
      console.log('🔄 [QUOTE-PARSER] MANDATORY preserved quantity:', preservedContext.quantity);
    }

    if (preservedContext.colors) {
      merged.capDetails.colors = Array.isArray(preservedContext.colors)
        ? preservedContext.colors
        : [preservedContext.colors];
      console.log('🔄 [QUOTE-PARSER] MANDATORY preserved colors:', merged.capDetails.colors);
    }

    if (preservedContext.logos && preservedContext.logos.length > 0) {
      // CRITICAL FIX: Preserve logos with all their properties including mold charges
      merged.customization.logos = preservedContext.logos.map(logo => ({
        location: logo.position || logo.location,
        type: logo.type,
        size: logo.size,
        moldCharge: logo.moldCharge || 0, // Preserve mold charges
        hasMoldCharge: logo.hasMoldCharge || false,
        totalCost: logo.totalCost || logo.cost || 0,
        unitPrice: logo.unitPrice || 0
      }));
      console.log('🔄 [QUOTE-PARSER] MANDATORY preserved logos with mold charges:', merged.customization.logos.length);
    }

    if (preservedContext.accessories && preservedContext.accessories.length > 0) {
      merged.customization.accessories = preservedContext.accessories;
      console.log('🔄 [QUOTE-PARSER] MANDATORY preserved accessories:', merged.customization.accessories);
    }

    if (preservedContext.fabric) {
      merged.capDetails.fabric = preservedContext.fabric;
      console.log('🔄 [QUOTE-PARSER] MANDATORY preserved fabric:', merged.capDetails.fabric);
    }

    if (preservedContext.closure) {
      merged.capDetails.closure = preservedContext.closure;
      console.log('🔄 [QUOTE-PARSER] MANDATORY preserved closure:', merged.capDetails.closure);
    }

    if (preservedContext.size) {
      merged.capDetails.size = preservedContext.size;
      console.log('🔄 [QUOTE-PARSER] MANDATORY preserved size:', merged.capDetails.size);
    }

    console.log('✅ [QUOTE-PARSER] Context merge completed with mandatory preservation');
    return merged;
  }
}