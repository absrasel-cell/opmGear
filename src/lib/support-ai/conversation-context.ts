/**
 * COMPREHENSIVE CONVERSATION CONTEXT SERVICE
 *
 * Provides intelligent change detection and context preservation
 * for the complete conversational quote system
 *
 * Handles ALL quote aspects: quantity, fabric, colors, logos, accessories,
 * closures, delivery, size, stitching - maintaining conversational continuity
 */

export interface QuoteSpecifications {
  quantity: number;

  // Cap Style
  productName?: string;
  panelCount?: string;
  profile?: string;
  billShape?: string;
  structure?: string;

  // Colors and Appearance
  colors?: string;
  color?: string;
  size?: string;
  stitching?: string;

  // Fabric and Materials
  fabric?: string;
  fabrics?: string[];
  premiumFabrics?: { [key: string]: any };

  // Closure
  closure?: string;

  // Logos and Customization
  logos?: LogoRequirement[];
  logoSetup?: string;

  // Accessories
  accessories?: string[];
  accessoryItems?: { [key: string]: any };

  // Delivery
  deliveryMethod?: string;
  deliveryType?: string;
  urgency?: string;

  // Pricing Context
  totalCost?: number;
  unitCost?: number;
  breakdown?: { [key: string]: number };
}

export interface LogoRequirement {
  position: string;  // Front, Back, Left, Right, Bills
  type: string;      // 3D Embroidery, Screen Print, Rubber Patch, etc.
  size: string;      // Small, Medium, Large
  application: string; // Direct, Satin, etc.
  moldCharge?: number;
  cost?: number;
}

export interface ConversationChange {
  type: 'quantity' | 'fabric' | 'color' | 'logo' | 'accessories' | 'closure' | 'delivery' | 'size' | 'stitching' | 'mixed';
  aspect: string;
  oldValue?: any;
  newValue: any;
  confidence: number; // 0-1 confidence score
  changeDescription: string;
}

export interface ContextualRequest {
  contextualRequest: string;
  hasContext: boolean;
  detectedChanges: ConversationChange[];
  mergedSpecifications: QuoteSpecifications;
  orderBuilderDelta?: {
    changedSections: string[];
    costImpact: {
      previousTotal: number;
      newTotal: number;
      difference: number;
    };
    visualIndicators: { [key: string]: 'updated' | 'added' | 'removed' };
  };
}

export class ConversationContextService {

  /**
   * Main entry point - builds smart contextual request with change detection
   */
  static async buildSmartContextualRequest(
    currentMessage: string,
    conversationHistory: Array<{ role: string; content: string }>,
    conversationId?: string
  ): Promise<ContextualRequest> {

    console.log('🧠 [CONTEXT-SERVICE] Starting intelligent context analysis');
    console.log('📝 Current message:', currentMessage.substring(0, 100));
    console.log('💬 History messages:', conversationHistory.length);

    // Extract previous specifications from conversation history
    const previousSpecs = await this.extractPreviousSpecifications(conversationHistory);
    console.log('📋 Previous specifications:', previousSpecs);

    // Detect what the user wants to change
    const detectedChanges = await this.detectConversationChanges(currentMessage, previousSpecs);
    console.log('🔍 Detected changes:', detectedChanges);

    // Merge changes with previous specifications
    const mergedSpecs = await this.mergeSpecifications(previousSpecs, detectedChanges, currentMessage);
    console.log('🔧 Merged specifications:', mergedSpecs);

    // Build comprehensive contextual request
    const contextualRequest = await this.buildContextualRequest(currentMessage, mergedSpecs, detectedChanges);

    // Calculate Order Builder delta for visual indicators
    const orderBuilderDelta = await this.calculateOrderBuilderDelta(previousSpecs, mergedSpecs, detectedChanges);

    return {
      contextualRequest,
      hasContext: detectedChanges.length > 0 || Object.keys(previousSpecs).length > 2, // More than just quantity
      detectedChanges,
      mergedSpecifications: mergedSpecs,
      orderBuilderDelta
    };
  }

  /**
   * Extract complete specifications from conversation history
   */
  private static async extractPreviousSpecifications(
    conversationHistory: Array<{ role: string; content: string }>
  ): Promise<QuoteSpecifications> {

    const specs: QuoteSpecifications = { quantity: 144 };

    // Look through conversation history in reverse (most recent first)
    for (let i = conversationHistory.length - 1; i >= 0; i--) {
      const message = conversationHistory[i];

      // Only analyze assistant messages that contain structured quotes
      if (message.role === 'assistant' && message.content) {
        const content = message.content;

        // Check if this is a structured quote response
        if (content.includes('Cap Style Setup') || content.includes('📊') || content.includes('💰 Total Investment')) {
          console.log('📋 [EXTRACT] Found structured quote in message', i);

          // Extract all specifications from this structured response
          await this.extractSpecificationsFromQuote(content, specs);

          // Stop at first complete quote found (most recent)
          break;
        }

        // Also check original user message for initial specifications
        if (i > 0 && conversationHistory[i-1]?.role === 'user') {
          const userMessage = conversationHistory[i-1].content;
          await this.extractSpecificationsFromUserMessage(userMessage, specs);
        }
      }
    }

    // Also extract from the most recent user messages for additional context
    const recentUserMessages = conversationHistory
      .filter(msg => msg.role === 'user')
      .slice(-3); // Last 3 user messages

    for (const userMsg of recentUserMessages) {
      await this.extractSpecificationsFromUserMessage(userMsg.content, specs);
    }

    console.log('📋 [EXTRACT] Final extracted specifications:', specs);
    return specs;
  }

  /**
   * Extract specifications from structured AI quote response
   */
  private static async extractSpecificationsFromQuote(content: string, specs: QuoteSpecifications): Promise<void> {

    // Extract quantity
    const quantityMatches = [
      /Base cost: \$[\d,]+\.?\d* \(\$[\d.]+\/cap\) for (\d+) caps?/i,
      /Quantity: (\d+,?\d*) pieces/i,
      /(\d+,?\d*) pieces/i
    ];

    for (const pattern of quantityMatches) {
      const match = content.match(pattern);
      if (match && match[1]) {
        specs.quantity = parseInt(match[1].replace(/,/g, ''));
        console.log('🔢 [EXTRACT] Quantity from quote:', specs.quantity);
        break;
      }
    }

    // Extract product name
    const productMatch = content.match(/•([^•\n]+(?:Panel|AirFrame|ProFit|Urban|Elite)[^•\n]*)/i);
    if (productMatch) {
      specs.productName = productMatch[1].trim();
      console.log('🎯 [EXTRACT] Product from quote:', specs.productName);
    }

    // Extract fabrics
    const fabricPatterns = [
      /Premium (Acrylic|Air Mesh|Suede Cotton|Genuine Leather|Duck Camo|Laser Cut|Polyester): \(\+\$[\d,]+\.?\d*\)/gi,
      /•(Acrylic|Air Mesh|Airmesh|Suede Cotton|Genuine Leather|Duck Camo|Laser Cut|Polyester): \(\+\$[\d,]+\.?\d*\)/gi
    ];

    const detectedFabrics = [];
    for (const pattern of fabricPatterns) {
      const matches = [...content.matchAll(pattern)];
      for (const match of matches) {
        detectedFabrics.push(match[1]);
      }
    }

    if (detectedFabrics.length > 0) {
      specs.fabric = detectedFabrics.join('/');
      specs.fabrics = detectedFabrics;
      console.log('🧵 [EXTRACT] Fabrics from quote:', specs.fabric);
    }

    // CRITICAL FIX: Enhanced logo extraction with comprehensive patterns
    const logoPatterns = [
      // Pattern 1: Standard format - •Front: Rubber Patch (Large) - $xxx
      /•(Front|Back|Left|Right|Bills): ([^-\n]+) - \$[\d,]+\.?\d*/gi,

      // Pattern 2: Alternative format - •Position Logo: Type (Size) - $xxx
      /•(Front|Back|Left|Right|Bills)\s*(?:Logo)?:\s*([^-\n]+)\s*\(([^)]+)\)\s*[-–]\s*\$[\d,]+\.?\d*/gi,

      // Pattern 3: Embroidery specific - •Left Embroidery: (Small) - $xxx
      /•(Front|Back|Left|Right|Bills)\s*(Embroidery|Print|Patch):\s*\(([^)]+)\)\s*[-–]\s*\$[\d,]+\.?\d*/gi,

      // Pattern 4: Screen Print format - •Back Screen Print (Small) - $xxx
      /•(Front|Back|Left|Right|Bills)\s*(Screen\s*Print|Rubber\s*Patch|Leather\s*Patch|Woven\s*Patch|3D\s*Embroidery|Flat\s*Embroidery|Sublimation)\s*\(([^)]+)\)\s*[-–]\s*\$[\d,]+\.?\d*/gi,

      // Pattern 5: Generic position: type (size) format
      /•([^:]+):\s*([^(]+)\s*\(([^)]+)\)\s*[-–]\s*\$[\d,]+\.?\d*/gi
    ];

    specs.logos = [];
    for (const pattern of logoPatterns) {
      const matches = [...content.matchAll(pattern)];
      console.log(`🔍 [EXTRACT] Logo pattern "${pattern.source}" found ${matches.length} matches`);

      for (const match of matches) {
        let position = match[1];
        let logoType = match[2];
        let logoSize = match[3];

        // Handle different match structures based on pattern
        if (pattern.source.includes('Embroidery|Print|Patch')) {
          // Pattern 3: position + type detected
          logoType = match[2];
          logoSize = match[3];
        } else if (pattern.source.includes('Screen\\s*Print|Rubber')) {
          // Pattern 4: position + specific type
          logoType = match[2];
          logoSize = match[3];
        } else if (!logoSize && match[2]) {
          // Pattern 1: extract type and size from combined string
          const logoInfo = match[2];
          const logoTypeMatch = logoInfo.match(/(3D\s*Embroidery|Flat\s*Embroidery|Screen\s*Print|Rubber\s*Patch|Woven\s*Patch|Leather\s*Patch|Sublimation|Embroidery|Print|Patch)\s*\(([^)]+)\)/i);
          if (logoTypeMatch) {
            logoType = logoTypeMatch[1];
            logoSize = logoTypeMatch[2];
          } else {
            // Try to extract just the type
            logoType = logoInfo.trim();
            logoSize = 'Medium'; // Default size
          }
        }

        // Clean up extracted data
        position = position.trim();
        logoType = logoType ? logoType.trim() : 'Embroidery';
        logoSize = logoSize ? logoSize.trim() : 'Medium';

        // Normalize position names
        if (position.toLowerCase().includes('front')) position = 'Front';
        else if (position.toLowerCase().includes('back')) position = 'Back';
        else if (position.toLowerCase().includes('left')) position = 'Left';
        else if (position.toLowerCase().includes('right')) position = 'Right';

        // Normalize logo types
        if (logoType.toLowerCase().includes('rubber') && logoType.toLowerCase().includes('patch')) {
          logoType = 'Rubber Patch';
        } else if (logoType.toLowerCase().includes('leather') && logoType.toLowerCase().includes('patch')) {
          logoType = 'Leather Patch';
        } else if (logoType.toLowerCase().includes('screen') && logoType.toLowerCase().includes('print')) {
          logoType = 'Screen Print';
        } else if (logoType.toLowerCase().includes('3d') && logoType.toLowerCase().includes('embroidery')) {
          logoType = '3D Embroidery';
        } else if (logoType.toLowerCase().includes('flat') && logoType.toLowerCase().includes('embroidery')) {
          logoType = 'Flat Embroidery';
        } else if (logoType.toLowerCase().includes('embroidery')) {
          logoType = 'Embroidery';
        }

        // Check for duplicates before adding
        const isDuplicate = specs.logos.some(existing =>
          existing.position.toLowerCase() === position.toLowerCase() &&
          existing.type.toLowerCase() === logoType.toLowerCase()
        );

        if (!isDuplicate && position && logoType) {
          specs.logos.push({
            position: position,
            type: logoType,
            size: logoSize,
            application: 'Direct' // Default, will be refined later
          });
          console.log(`✅ [EXTRACT] Added logo: ${position}: ${logoType} (${logoSize})`);
        } else if (isDuplicate) {
          console.log(`⚠️ [EXTRACT] Skipping duplicate logo: ${position}: ${logoType}`);
        }
      }
    }

    if (specs.logos.length > 0) {
      console.log('🎨 [EXTRACT] Final logos from quote:', specs.logos.map(l => `${l.position}: ${l.type} (${l.size})`));
    }

    // CRITICAL FIX: Enhanced accessory extraction with comprehensive patterns
    const accessoryPatterns = [
      // Pattern 1: Direct accessory format - •Inside Label: $xxx
      /•\s*(Hang\s*Tag|Inside\s*Label|B-Tape\s*Print|B-Tape|Sticker):\s*\$[\d,]+\.?\d*/gi,

      // Pattern 2: Accessory with per-cap pricing - •Inside Label: $xxx ($x.xx/cap)
      /•\s*(Hang\s*Tag|Inside\s*Label|B-Tape\s*Print|B-Tape|Sticker):\s*\$[\d,]+\.?\d*\s*\(\$[\d.]+\/cap\)/gi,

      // Pattern 3: Accessories section with bullet points
      /Accessories[^•\n]*\n[\s\S]*?•\s*([^:\n]*(?:Hang\s*Tag|Inside\s*Label|B-Tape\s*Print|B-Tape|Sticker)[^:\n]*)/gi,

      // Pattern 4: Generic accessory pattern in accessories section
      /(?:🏷️.*Accessories.*\n)([\s\S]*?)(?:\n\n|\n🚚|\n💰|$)/gi
    ];

    specs.accessories = [];
    for (const pattern of accessoryPatterns) {
      const matches = [...content.matchAll(pattern)];
      console.log(`🔍 [EXTRACT] Accessory pattern "${pattern.source.substring(0, 50)}..." found ${matches.length} matches`);

      for (const match of matches) {
        let accessory = match[1];

        if (pattern.source.includes('Accessories.*\\n')) {
          // Pattern 4: Extract individual accessories from accessories section
          const accessoriesSection = match[1];
          const individualAccessoryMatches = [...accessoriesSection.matchAll(/•\s*([^:\n$]+?):/g)];

          for (const accessoryMatch of individualAccessoryMatches) {
            const individualAccessory = accessoryMatch[1].trim();
            if (individualAccessory && !specs.accessories.includes(individualAccessory)) {
              specs.accessories.push(individualAccessory);
              console.log(`✅ [EXTRACT] Added accessory from section: ${individualAccessory}`);
            }
          }
        } else {
          // Patterns 1-3: Direct accessory extraction
          if (accessory) {
            accessory = accessory.trim();

            // Normalize accessory names
            if (accessory.toLowerCase().includes('inside') && accessory.toLowerCase().includes('label')) {
              accessory = 'Inside Label';
            } else if (accessory.toLowerCase().includes('b-tape')) {
              accessory = 'B-Tape Print';
            } else if (accessory.toLowerCase().includes('hang') && accessory.toLowerCase().includes('tag')) {
              accessory = 'Hang Tag';
            } else if (accessory.toLowerCase().includes('sticker')) {
              accessory = 'Sticker';
            }

            if (!specs.accessories.includes(accessory)) {
              specs.accessories.push(accessory);
              console.log(`✅ [EXTRACT] Added accessory: ${accessory}`);
            }
          }
        }
      }
    }

    // Additional fallback: look for specific accessory mentions in the entire content
    const accessoryFallbackPatterns = [
      /Inside\s*Label/gi,
      /B-Tape\s*Print/gi,
      /Hang\s*Tag/gi,
      /Sticker/gi
    ];

    for (const fallbackPattern of accessoryFallbackPatterns) {
      const matches = [...content.matchAll(fallbackPattern)];
      for (const match of matches) {
        let accessoryName = match[0];

        // Normalize name
        if (accessoryName.toLowerCase().includes('inside') && accessoryName.toLowerCase().includes('label')) {
          accessoryName = 'Inside Label';
        } else if (accessoryName.toLowerCase().includes('b-tape')) {
          accessoryName = 'B-Tape Print';
        } else if (accessoryName.toLowerCase().includes('hang') && accessoryName.toLowerCase().includes('tag')) {
          accessoryName = 'Hang Tag';
        } else if (accessoryName.toLowerCase().includes('sticker')) {
          accessoryName = 'Sticker';
        }

        // Only add if we found it in a pricing context (has $ nearby)
        const contextStart = Math.max(0, match.index - 50);
        const contextEnd = Math.min(content.length, match.index + accessoryName.length + 50);
        const context = content.substring(contextStart, contextEnd);

        if (context.includes('$') && !specs.accessories.includes(accessoryName)) {
          specs.accessories.push(accessoryName);
          console.log(`✅ [EXTRACT] Added accessory via fallback: ${accessoryName}`);
        }
      }
    }

    if (specs.accessories.length > 0) {
      console.log('🏷️ [EXTRACT] Final accessories from quote:', specs.accessories);
    }

    // Extract closure
    const closureMatch = content.match(/Closure: ([^(\n]+)/i);
    if (closureMatch) {
      specs.closure = closureMatch[1].trim();
      console.log('🔒 [EXTRACT] Closure from quote:', specs.closure);
    }

    // Extract delivery method
    const deliveryMatch = content.match(/Method: ([^\n$]+)/i);
    if (deliveryMatch) {
      specs.deliveryMethod = deliveryMatch[1].trim();
      console.log('🚚 [EXTRACT] Delivery from quote:', specs.deliveryMethod);
    }

    // Extract total cost
    const costMatch = content.match(/Total Investment: \$([0-9,]+\.?\d*)/i);
    if (costMatch) {
      specs.totalCost = parseFloat(costMatch[1].replace(/,/g, ''));
      console.log('💰 [EXTRACT] Total cost from quote:', specs.totalCost);
    }
  }

  /**
   * Extract specifications from user message text
   */
  private static async extractSpecificationsFromUserMessage(content: string, specs: QuoteSpecifications): Promise<void> {

    // Extract colors (handles Red/White patterns)
    const colorMatches = [
      /(\w+)\/(\w+)/i, // Royal/Black pattern
      /(?:color:?\s*|in\s+|cap\s+)(\w+)/i,
      /(?:^|\s)(black|white|red|blue|green|yellow|orange|purple|pink|brown|gray|grey|navy|lime|olive|royal|maroon|gold|charcoal|khaki|carolina)(?:\s|$|,)/i
    ];

    for (const pattern of colorMatches) {
      const match = content.match(pattern);
      if (match) {
        if (match[2]) {
          // Split color pattern like "Red/White"
          specs.colors = `${match[1]}/${match[2]}`;
          specs.color = specs.colors;
        } else {
          specs.color = match[1] || match[0].trim();
          specs.colors = specs.color;
        }
        console.log('🎨 [EXTRACT] Colors from user message:', specs.colors);
        break;
      }
    }

    // Extract size (handles "Size: 57 cm" patterns)
    const sizePatterns = [
      /size:?\s*(\d{2})\s*cm/i,
      /(\d{2})\s*cm/i,
      /size:?\s*([67](?:\s*\d+\/\d+|\.\d+)?)/i,
      /\b([67]\s*\d+\/\d+)\s*(?:hat|cap|size|fitted)/i
    ];

    for (const pattern of sizePatterns) {
      const match = content.match(pattern);
      if (match && match[1]) {
        const sizeValue = match[1];
        // Convert CM to hat size if needed
        if (pattern.source.includes('cm')) {
          const cm = parseInt(sizeValue);
          specs.size = this.convertCmToHatSize(cm);
        } else {
          specs.size = sizeValue;
        }
        console.log('📏 [EXTRACT] Size from user message:', specs.size);
        break;
      }
    }

    // Extract fabric mentions
    const fabricMentions = [
      'acrylic', 'airmesh', 'air mesh', 'suede cotton', 'genuine leather',
      'duck camo', 'laser cut', 'polyester', 'cotton twill'
    ];

    for (const fabric of fabricMentions) {
      if (content.toLowerCase().includes(fabric)) {
        if (!specs.fabric || !specs.fabric.includes(fabric)) {
          const normalizedFabric = fabric.charAt(0).toUpperCase() + fabric.slice(1);
          specs.fabric = specs.fabric ? `${specs.fabric}/${normalizedFabric}` : normalizedFabric;
        }
      }
    }

    if (specs.fabric) {
      console.log('🧵 [EXTRACT] Fabric from user message:', specs.fabric);
    }
  }

  /**
   * Detect what changes the user wants to make
   */
  private static async detectConversationChanges(
    currentMessage: string,
    previousSpecs: QuoteSpecifications
  ): Promise<ConversationChange[]> {

    const changes: ConversationChange[] = [];
    const lowerMessage = currentMessage.toLowerCase();

    console.log('🔍 [DETECT] Analyzing message for changes:', currentMessage);
    console.log('📋 [DETECT] Previous specs for comparison:', previousSpecs);

    // 1. QUANTITY CHANGES
    const quantityPatterns = [
      { pattern: /how\s+much\s+for\s+(\d+,?\d*)/i, confidence: 0.95 },
      { pattern: /what\s+about\s+(\d+,?\d*)\s*(?:pieces|caps?)?/i, confidence: 0.9 },
      { pattern: /(\d+,?\d*)\s*(?:pieces|caps?)/i, confidence: 0.85 },
      { pattern: /i\s+want\s+(\d+,?\d*)/i, confidence: 0.9 },
      { pattern: /for\s+(\d+,?\d*)/i, confidence: 0.8 }
    ];

    for (const { pattern, confidence } of quantityPatterns) {
      const match = currentMessage.match(pattern);
      if (match && match[1]) {
        const newQuantity = parseInt(match[1].replace(/,/g, ''));
        if (newQuantity !== previousSpecs.quantity) {
          changes.push({
            type: 'quantity',
            aspect: 'quantity',
            oldValue: previousSpecs.quantity,
            newValue: newQuantity,
            confidence,
            changeDescription: `Change quantity from ${previousSpecs.quantity} to ${newQuantity} pieces`
          });
          console.log('🔢 [DETECT] Quantity change detected:', previousSpecs.quantity, '->', newQuantity);
        }
      }
    }

    // 2. FABRIC CHANGES
    const fabricChangePatterns = [
      { pattern: /change\s+fabric\s+to\s+([^\n.,]+)/i, confidence: 0.95 },
      { pattern: /make\s+it\s+([^.,\n]*(?:acrylic|cotton|leather|suede|mesh)[^.,\n]*)/i, confidence: 0.85 },
      { pattern: /use\s+([^.,\n]*(?:acrylic|cotton|leather|suede|mesh)[^.,\n]*)/i, confidence: 0.8 }
    ];

    for (const { pattern, confidence } of fabricChangePatterns) {
      const match = currentMessage.match(pattern);
      if (match && match[1]) {
        const newFabric = match[1].trim();
        if (newFabric.toLowerCase() !== previousSpecs.fabric?.toLowerCase()) {
          changes.push({
            type: 'fabric',
            aspect: 'fabric',
            oldValue: previousSpecs.fabric,
            newValue: newFabric,
            confidence,
            changeDescription: `Change fabric from ${previousSpecs.fabric || 'standard'} to ${newFabric}`
          });
          console.log('🧵 [DETECT] Fabric change detected:', previousSpecs.fabric, '->', newFabric);
        }
      }
    }

    // 3. COLOR CHANGES
    const colorChangePatterns = [
      { pattern: /make\s+it\s+((?:\w+\/\w+)|(?:black|white|red|blue|green|yellow|orange|purple|pink|brown|gray|grey|navy|lime|olive|royal|maroon|gold|charcoal|khaki|carolina)(?:\s+and\s+\w+)?)/i, confidence: 0.9 },
      { pattern: /change\s+(?:color\s+)?to\s+((?:\w+\/\w+)|(?:\w+(?:\s+and\s+\w+)?))/i, confidence: 0.95 },
      { pattern: /in\s+((?:\w+\/\w+)|(?:\w+(?:\s+and\s+\w+)?))/i, confidence: 0.8 }
    ];

    for (const { pattern, confidence } of colorChangePatterns) {
      const match = currentMessage.match(pattern);
      if (match && match[1]) {
        const newColor = match[1].trim();
        // Normalize "and" to "/"
        const normalizedColor = newColor.replace(/\s+and\s+/gi, '/');

        if (normalizedColor.toLowerCase() !== previousSpecs.colors?.toLowerCase()) {
          changes.push({
            type: 'color',
            aspect: 'colors',
            oldValue: previousSpecs.colors,
            newValue: normalizedColor,
            confidence,
            changeDescription: `Change color from ${previousSpecs.colors || 'current'} to ${normalizedColor}`
          });
          console.log('🎨 [DETECT] Color change detected:', previousSpecs.colors, '->', normalizedColor);
        }
      }
    }

    // 4. LOGO MODIFICATIONS
    const logoChangePatterns = [
      { pattern: /change\s+front\s+to\s+([^.,\n]+)/i, position: 'Front', confidence: 0.95 },
      { pattern: /front\s+should\s+be\s+([^.,\n]+)/i, position: 'Front', confidence: 0.9 },
      { pattern: /remove\s+(?:the\s+)?back\s+logo/i, position: 'Back', type: 'remove', confidence: 0.95 },
      { pattern: /add\s+([^.,\n]+)\s+(?:on\s+)?(?:the\s+)?(left|right|front|back)/i, confidence: 0.9 },
      { pattern: /(embroidery|screen\s+print|patch)\s+instead/i, confidence: 0.85 }
    ];

    for (const { pattern, position, confidence } of logoChangePatterns) {
      const match = currentMessage.match(pattern);
      if (match) {
        let changeType = 'modify';
        let newValue = match[1]?.trim();
        let targetPosition = position || match[2];

        if (pattern.source.includes('remove')) {
          changeType = 'remove';
          newValue = null;
        } else if (pattern.source.includes('add')) {
          changeType = 'add';
          targetPosition = match[2];
        }

        changes.push({
          type: 'logo',
          aspect: `logo_${targetPosition?.toLowerCase()}`,
          oldValue: previousSpecs.logos?.find(l => l.position.toLowerCase() === targetPosition?.toLowerCase()),
          newValue: newValue,
          confidence,
          changeDescription: `${changeType === 'remove' ? 'Remove' : changeType === 'add' ? 'Add' : 'Change'} ${targetPosition} logo${newValue ? ` to ${newValue}` : ''}`
        });
        console.log('🎨 [DETECT] Logo change detected:', changeType, targetPosition, newValue);
      }
    }

    // 5. SIZE CHANGES
    const sizeChangePatterns = [
      { pattern: /make\s+it\s+size\s+(\d{2}cm|[67](?:\s*\d+\/\d+|\.\d+)?|small|medium|large)/i, confidence: 0.9 },
      { pattern: /change\s+(?:to\s+)?size\s+(\d{2}cm|[67](?:\s*\d+\/\d+|\.\d+)?|small|medium|large)/i, confidence: 0.95 }
    ];

    for (const { pattern, confidence } of sizeChangePatterns) {
      const match = currentMessage.match(pattern);
      if (match && match[1]) {
        let newSize = match[1].trim();

        // Convert CM to hat size if needed
        if (newSize.includes('cm')) {
          const cm = parseInt(newSize);
          newSize = this.convertCmToHatSize(cm);
        }

        if (newSize !== previousSpecs.size) {
          changes.push({
            type: 'size',
            aspect: 'size',
            oldValue: previousSpecs.size,
            newValue: newSize,
            confidence,
            changeDescription: `Change size from ${previousSpecs.size || 'current'} to ${newSize}`
          });
          console.log('📏 [DETECT] Size change detected:', previousSpecs.size, '->', newSize);
        }
      }
    }

    // 6. CLOSURE CHANGES
    const closureChangePatterns = [
      { pattern: /make\s+it\s+(snapback|fitted|flexfit|buckle)/i, confidence: 0.9 },
      { pattern: /change\s+(?:to\s+)?(snapback|fitted|flexfit|buckle)/i, confidence: 0.95 },
      { pattern: /(snapback|fitted|flexfit|buckle)\s+instead/i, confidence: 0.85 }
    ];

    for (const { pattern, confidence } of closureChangePatterns) {
      const match = currentMessage.match(pattern);
      if (match && match[1]) {
        const newClosure = match[1].trim();
        if (newClosure.toLowerCase() !== previousSpecs.closure?.toLowerCase()) {
          changes.push({
            type: 'closure',
            aspect: 'closure',
            oldValue: previousSpecs.closure,
            newValue: newClosure,
            confidence,
            changeDescription: `Change closure from ${previousSpecs.closure || 'snapback'} to ${newClosure}`
          });
          console.log('🔒 [DETECT] Closure change detected:', previousSpecs.closure, '->', newClosure);
        }
      }
    }

    // 7. DELIVERY CHANGES
    const deliveryChangePatterns = [
      { pattern: /rush\s+delivery/i, newValue: 'Priority Delivery', confidence: 0.9 },
      { pattern: /priority\s+delivery/i, newValue: 'Priority Delivery', confidence: 0.95 },
      { pattern: /standard\s+shipping/i, newValue: 'Regular Delivery', confidence: 0.9 },
      { pattern: /regular\s+delivery/i, newValue: 'Regular Delivery', confidence: 0.95 }
    ];

    for (const { pattern, newValue, confidence } of deliveryChangePatterns) {
      if (pattern.test(currentMessage)) {
        if (newValue !== previousSpecs.deliveryMethod) {
          changes.push({
            type: 'delivery',
            aspect: 'deliveryMethod',
            oldValue: previousSpecs.deliveryMethod,
            newValue: newValue,
            confidence,
            changeDescription: `Change delivery from ${previousSpecs.deliveryMethod || 'regular'} to ${newValue}`
          });
          console.log('🚚 [DETECT] Delivery change detected:', previousSpecs.deliveryMethod, '->', newValue);
        }
      }
    }

    // 8. ACCESSORY CHANGES
    const accessoryChangePatterns = [
      { pattern: /remove\s+(?:the\s+)?label/i, type: 'remove', item: 'Inside Label', confidence: 0.9 },
      { pattern: /add\s+(hang\s+tag|label|sticker|b-tape)/i, type: 'add', confidence: 0.85 },
      { pattern: /(hang\s+tag|label|sticker|b-tape)\s+instead/i, type: 'replace', confidence: 0.8 }
    ];

    for (const { pattern, type, item, confidence } of accessoryChangePatterns) {
      const match = currentMessage.match(pattern);
      if (match) {
        const accessoryItem = item || match[1];

        changes.push({
          type: 'accessories',
          aspect: 'accessories',
          oldValue: previousSpecs.accessories,
          newValue: { action: type, item: accessoryItem },
          confidence,
          changeDescription: `${type === 'remove' ? 'Remove' : type === 'add' ? 'Add' : 'Change'} accessory: ${accessoryItem}`
        });
        console.log('🏷️ [DETECT] Accessory change detected:', type, accessoryItem);
      }
    }

    console.log('🔍 [DETECT] Total changes detected:', changes.length);
    return changes;
  }

  /**
   * Merge detected changes with previous specifications
   */
  private static async mergeSpecifications(
    previousSpecs: QuoteSpecifications,
    detectedChanges: ConversationChange[],
    currentMessage: string
  ): Promise<QuoteSpecifications> {

    // Start with previous specifications as base
    const mergedSpecs = { ...previousSpecs };

    console.log('🔧 [MERGE] Starting with previous specs:', previousSpecs);
    console.log('🔧 [MERGE] Applying changes:', detectedChanges);

    // Apply each detected change
    for (const change of detectedChanges) {
      switch (change.type) {
        case 'quantity':
          mergedSpecs.quantity = change.newValue;
          console.log('🔧 [MERGE] Applied quantity change:', change.newValue);
          break;

        case 'fabric':
          mergedSpecs.fabric = change.newValue;
          mergedSpecs.fabrics = change.newValue.split('/').map((f: string) => f.trim());
          console.log('🔧 [MERGE] Applied fabric change:', change.newValue);
          break;

        case 'color':
          mergedSpecs.colors = change.newValue;
          mergedSpecs.color = change.newValue;
          console.log('🔧 [MERGE] Applied color change:', change.newValue);
          break;

        case 'logo':
          // Handle logo modifications
          if (!mergedSpecs.logos) mergedSpecs.logos = [];

          if (change.aspect.includes('logo_')) {
            const position = change.aspect.replace('logo_', '').charAt(0).toUpperCase() + change.aspect.replace('logo_', '').slice(1);

            // Find existing logo at this position
            const existingLogoIndex = mergedSpecs.logos.findIndex(l => l.position.toLowerCase() === position.toLowerCase());

            if (change.newValue === null) {
              // Remove logo
              if (existingLogoIndex >= 0) {
                mergedSpecs.logos.splice(existingLogoIndex, 1);
                console.log('🔧 [MERGE] Removed logo at position:', position);
              }
            } else {
              // Add/modify logo
              const newLogo: LogoRequirement = {
                position: position,
                type: this.extractLogoType(change.newValue) || '3D Embroidery',
                size: this.extractLogoSize(change.newValue) || 'Medium',
                application: 'Direct'
              };

              if (existingLogoIndex >= 0) {
                mergedSpecs.logos[existingLogoIndex] = newLogo;
                console.log('🔧 [MERGE] Modified logo at position:', position, newLogo);
              } else {
                mergedSpecs.logos.push(newLogo);
                console.log('🔧 [MERGE] Added logo at position:', position, newLogo);
              }
            }
          }
          break;

        case 'size':
          mergedSpecs.size = change.newValue;
          console.log('🔧 [MERGE] Applied size change:', change.newValue);
          break;

        case 'closure':
          mergedSpecs.closure = change.newValue;
          console.log('🔧 [MERGE] Applied closure change:', change.newValue);
          break;

        case 'delivery':
          mergedSpecs.deliveryMethod = change.newValue;
          console.log('🔧 [MERGE] Applied delivery change:', change.newValue);
          break;

        case 'accessories':
          if (!mergedSpecs.accessories) mergedSpecs.accessories = [];

          const { action, item } = change.newValue;
          if (action === 'remove') {
            mergedSpecs.accessories = mergedSpecs.accessories.filter(a => a !== item);
            console.log('🔧 [MERGE] Removed accessory:', item);
          } else if (action === 'add') {
            if (!mergedSpecs.accessories.includes(item)) {
              mergedSpecs.accessories.push(item);
              console.log('🔧 [MERGE] Added accessory:', item);
            }
          }
          break;
      }
    }

    // If no specific changes detected but we have context, extract any new information
    if (detectedChanges.length === 0 && Object.keys(previousSpecs).length > 2) {
      console.log('🔧 [MERGE] No changes detected, preserving all previous specifications');
    } else if (detectedChanges.length === 0) {
      // Extract fresh specifications from current message
      await this.extractSpecificationsFromUserMessage(currentMessage, mergedSpecs);
      console.log('🔧 [MERGE] No previous context, extracted fresh specifications');
    }

    console.log('🔧 [MERGE] Final merged specifications:', mergedSpecs);
    return mergedSpecs;
  }

  /**
   * Build comprehensive contextual request string
   */
  private static async buildContextualRequest(
    currentMessage: string,
    mergedSpecs: QuoteSpecifications,
    detectedChanges: ConversationChange[]
  ): Promise<string> {

    if (detectedChanges.length === 0 && Object.keys(mergedSpecs).length <= 2) {
      // No context, return original message
      return currentMessage;
    }

    let contextualRequest = '';

    if (detectedChanges.length > 0) {
      // Build contextual request with changes
      contextualRequest = `CONVERSATIONAL UPDATE REQUEST:

Customer's current message: "${currentMessage}"

Previous order specifications:
${this.formatSpecificationsForAI(mergedSpecs, true)}

Detected changes:
${detectedChanges.map(change => `• ${change.changeDescription} (${change.confidence > 0.9 ? 'High' : change.confidence > 0.8 ? 'Medium' : 'Low'} confidence)`).join('\n')}

INSTRUCTION: Apply ONLY the detected changes while preserving ALL other specifications from the previous order. Provide a complete quote with the updated specifications.`;
    } else {
      // Build contextual request with preserved context
      contextualRequest = `CONTEXTUAL REQUEST WITH PRESERVED SPECIFICATIONS:

Customer's current message: "${currentMessage}"

Context from previous conversation:
${this.formatSpecificationsForAI(mergedSpecs, false)}

INSTRUCTION: Interpret the current message in the context of the previous specifications. If the customer is making modifications, apply them while preserving all other details. If it's a general inquiry about the existing order, provide information based on the context.`;
    }

    console.log('📝 [CONTEXTUAL-REQUEST] Built contextual request:', contextualRequest.substring(0, 200) + '...');
    return contextualRequest;
  }

  /**
   * Format specifications for AI consumption
   */
  private static formatSpecificationsForAI(specs: QuoteSpecifications, showChanges: boolean): string {
    const lines = [];

    if (specs.quantity) lines.push(`Quantity: ${specs.quantity} pieces`);
    if (specs.productName) lines.push(`Product: ${specs.productName}`);
    if (specs.colors) lines.push(`Colors: ${specs.colors}`);
    if (specs.size) lines.push(`Size: ${specs.size}`);
    if (specs.fabric) lines.push(`Fabric: ${specs.fabric}`);
    if (specs.closure) lines.push(`Closure: ${specs.closure}`);

    if (specs.logos && specs.logos.length > 0) {
      lines.push(`Logos:`);
      for (const logo of specs.logos) {
        lines.push(`  • ${logo.position}: ${logo.type} (${logo.size})`);
      }
    }

    if (specs.accessories && specs.accessories.length > 0) {
      lines.push(`Accessories: ${specs.accessories.join(', ')}`);
    }

    if (specs.deliveryMethod) lines.push(`Delivery: ${specs.deliveryMethod}`);
    if (specs.totalCost) lines.push(`Previous Total: $${specs.totalCost.toFixed(2)}`);

    return lines.join('\n');
  }

  /**
   * Calculate Order Builder delta for visual indicators
   */
  private static async calculateOrderBuilderDelta(
    previousSpecs: QuoteSpecifications,
    mergedSpecs: QuoteSpecifications,
    detectedChanges: ConversationChange[]
  ): Promise<any> {

    const changedSections = [];
    const visualIndicators: { [key: string]: 'updated' | 'added' | 'removed' } = {};

    // Determine which Order Builder sections were affected
    for (const change of detectedChanges) {
      switch (change.type) {
        case 'quantity':
        case 'fabric':
        case 'color':
        case 'size':
          changedSections.push('capStyle');
          visualIndicators.capStyle = 'updated';
          break;

        case 'logo':
          changedSections.push('customization');
          visualIndicators.customization = change.newValue === null ? 'removed' : change.oldValue ? 'updated' : 'added';
          break;

        case 'accessories':
          changedSections.push('accessories');
          visualIndicators.accessories = change.newValue.action === 'remove' ? 'removed' : 'added';
          break;

        case 'closure':
          changedSections.push('customization');
          visualIndicators.customization = 'updated';
          break;

        case 'delivery':
          changedSections.push('delivery');
          visualIndicators.delivery = 'updated';
          break;
      }
    }

    // Calculate cost impact (will be updated after pricing calculation)
    const costImpact = {
      previousTotal: previousSpecs.totalCost || 0,
      newTotal: 0, // Will be calculated later
      difference: 0 // Will be calculated later
    };

    return {
      changedSections: [...new Set(changedSections)], // Remove duplicates
      costImpact,
      visualIndicators
    };
  }

  // Helper methods
  private static convertCmToHatSize(cm: number): string {
    const sizeMap: { [key: number]: string } = {
      54: '6 3/4', 55: '6 7/8', 56: '7', 57: '7 1/8',
      58: '7 1/4', 59: '7 3/8', 60: '7 1/2', 61: '7 5/8',
      62: '7 3/4', 63: '7 7/8', 64: '8'
    };

    if (sizeMap[cm]) return sizeMap[cm];

    // Find closest match
    const sizes = Object.keys(sizeMap).map(Number).sort((a, b) => a - b);
    let closest = sizes[0];
    let minDiff = Math.abs(cm - closest);

    for (const size of sizes) {
      const diff = Math.abs(cm - size);
      if (diff < minDiff) {
        minDiff = diff;
        closest = size;
      }
    }

    return sizeMap[closest] || '7 1/4';
  }

  private static extractLogoType(description: string): string | null {
    const lowerDesc = description.toLowerCase();
    if (lowerDesc.includes('embroidery')) return '3D Embroidery';
    if (lowerDesc.includes('screen') || lowerDesc.includes('print')) return 'Screen Print';
    if (lowerDesc.includes('rubber') || lowerDesc.includes('patch')) return 'Rubber Patch';
    if (lowerDesc.includes('woven')) return 'Woven Patch';
    if (lowerDesc.includes('leather')) return 'Leather Patch';
    return null;
  }

  private static extractLogoSize(description: string): string | null {
    const lowerDesc = description.toLowerCase();
    if (lowerDesc.includes('large')) return 'Large';
    if (lowerDesc.includes('medium')) return 'Medium';
    if (lowerDesc.includes('small')) return 'Small';
    return null;
  }
}