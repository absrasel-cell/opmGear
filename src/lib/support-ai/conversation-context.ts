/**
 * INTELLIGENT CONVERSATION CONTEXT SERVICE
 *
 * Provides smart conversation continuation with:
 * - Complete order state retrieval from Supabase conversations
 * - Intelligent change detection and application
 * - Precise Order Builder updates with visual indicators
 * - Context-aware pricing recalculation
 */

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client for conversation context
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export interface ConversationContext {
  conversationId: string;
  previousOrderBuilder?: any;
  previousQuoteData?: any;
  userProfile?: any;
  changeHistory: ChangeEvent[];
  lastInteraction: string;
}

export interface ChangeEvent {
  type: 'quantity' | 'closure' | 'fabric' | 'logo' | 'accessory' | 'delivery' | 'cap_style';
  field: string;
  previousValue: any;
  newValue: any;
  timestamp: string;
  reason?: string;
}

export interface OrderBuilderDelta {
  changedSections: string[];
  preservedSections: string[];
  costImpact: {
    previousTotal: number;
    newTotal: number;
    difference: number;
  };
  visualIndicators: {
    [section: string]: {
      hasChanges: boolean;
      changeType: 'updated' | 'added' | 'removed';
      specific?: string[];
    };
  };
}

export class ConversationContextService {

  /**
   * Load complete conversation context from Supabase
   */
  static async loadConversationContext(
    conversationId: string,
    currentMessage: string
  ): Promise<ConversationContext | null> {
    try {
      console.log('🔄 [CONTEXT] Loading conversation context for:', conversationId);

      // Load conversation with messages and metadata
      const { data: conversation, error } = await supabase
        .from('conversations')
        .select(`
          *,
          conversation_messages (
            id,
            content,
            role,
            created_at,
            model,
            metadata
          )
        `)
        .eq('id', conversationId)
        .single();

      if (error) {
        console.error('❌ [CONTEXT] Failed to load conversation:', error);
        return null;
      }

      if (!conversation) {
        console.log('⚠️ [CONTEXT] Conversation not found');
        return null;
      }

      console.log('✅ [CONTEXT] Conversation loaded:', {
        id: conversation.id,
        messageCount: conversation.conversation_messages?.length || 0,
        hasOrderBuilder: !!(conversation.metadata?.orderBuilder || conversation.order_builder_state)
      });

      // Extract Order Builder state from conversation metadata
      const orderBuilderData = conversation.order_builder_state || conversation.metadata?.orderBuilder;

      return {
        conversationId,
        previousOrderBuilder: orderBuilderData?.orderBuilderStatus,
        previousQuoteData: {
          capDetails: orderBuilderData?.capDetails,
          customization: orderBuilderData?.customization,
          delivery: orderBuilderData?.delivery,
          pricing: orderBuilderData?.pricing
        },
        userProfile: conversation.metadata?.userProfile,
        changeHistory: this.extractChangeHistory(conversation.conversation_messages || []),
        lastInteraction: conversation.updated_at
      };

    } catch (error) {
      console.error('❌ [CONTEXT] Error loading conversation context:', error);
      return null;
    }
  }

  /**
   * Detect and analyze changes from current message
   */
  static detectOrderChanges(
    currentMessage: string,
    previousContext: ConversationContext
  ): ChangeEvent[] {
    const changes: ChangeEvent[] = [];
    const message = currentMessage.toLowerCase();
    const timestamp = new Date().toISOString();

    console.log('🔍 [CONTEXT] Analyzing message for changes:', currentMessage.substring(0, 100));

    // Quantity changes
    const quantityMatch = message.match(/(\d+)\s*(pieces?|pcs?|caps?|units?)/i);
    if (quantityMatch) {
      const newQuantity = parseInt(quantityMatch[1]);
      const previousQuantity = previousContext.previousQuoteData?.capDetails?.quantity || 144;

      if (newQuantity !== previousQuantity) {
        changes.push({
          type: 'quantity',
          field: 'quantity',
          previousValue: previousQuantity,
          newValue: newQuantity,
          timestamp,
          reason: `User requested ${newQuantity} pieces instead of ${previousQuantity}`
        });
      }
    }

    // Closure changes
    const closureKeywords = ['closure', 'back', 'closing', 'fit'];
    const closureTypes = ['velcro', 'snapback', 'fitted', 'flexfit', 'buckle', 'velcro', 'strap'];

    if (closureKeywords.some(keyword => message.includes(keyword))) {
      const detectedClosure = closureTypes.find(type => message.includes(type));
      if (detectedClosure) {
        const previousClosure = previousContext.previousQuoteData?.customization?.closure || 'Snapback';
        const newClosure = this.normalizeClosure(detectedClosure);

        if (newClosure.toLowerCase() !== previousClosure.toLowerCase()) {
          changes.push({
            type: 'closure',
            field: 'closure',
            previousValue: previousClosure,
            newValue: newClosure,
            timestamp,
            reason: `User requested ${newClosure} closure instead of ${previousClosure}`
          });
        }
      }
    }

    // Fabric changes
    const fabricKeywords = ['fabric', 'material', 'canvas', 'cotton', 'mesh', 'suede'];
    const fabricTypes = ['chino twill', 'canvas', 'suede cotton', 'air mesh', 'acrylic', 'leather'];

    if (fabricKeywords.some(keyword => message.includes(keyword))) {
      const detectedFabric = fabricTypes.find(type => message.includes(type.replace(' ', '')));
      if (detectedFabric) {
        const previousFabric = previousContext.previousQuoteData?.customization?.fabric || 'Chino Twill';
        const newFabric = this.normalizeFabric(detectedFabric);

        if (newFabric.toLowerCase() !== previousFabric.toLowerCase()) {
          changes.push({
            type: 'fabric',
            field: 'fabric',
            previousValue: previousFabric,
            newValue: newFabric,
            timestamp,
            reason: `User requested ${newFabric} fabric instead of ${previousFabric}`
          });
        }
      }
    }

    // Logo changes
    if (message.includes('logo') || message.includes('embroidery') || message.includes('patch')) {
      const logoAction = this.detectLogoAction(message);
      if (logoAction) {
        changes.push({
          type: 'logo',
          field: logoAction.field,
          previousValue: logoAction.previous,
          newValue: logoAction.new,
          timestamp,
          reason: logoAction.reason
        });
      }
    }

    // Accessory changes
    const accessoryKeywords = ['accessory', 'accessories', 'hang tag', 'label', 'sticker', 'rope'];
    if (accessoryKeywords.some(keyword => message.includes(keyword))) {
      const accessoryAction = this.detectAccessoryAction(message);
      if (accessoryAction) {
        changes.push({
          type: 'accessory',
          field: 'accessories',
          previousValue: accessoryAction.previous,
          newValue: accessoryAction.new,
          timestamp,
          reason: accessoryAction.reason
        });
      }
    }

    // Delivery changes
    if (message.includes('delivery') || message.includes('shipping') || message.includes('freight')) {
      const deliveryAction = this.detectDeliveryAction(message);
      if (deliveryAction) {
        changes.push({
          type: 'delivery',
          field: 'delivery_method',
          previousValue: deliveryAction.previous,
          newValue: deliveryAction.new,
          timestamp,
          reason: deliveryAction.reason
        });
      }
    }

    console.log('✅ [CONTEXT] Detected changes:', changes.length, 'changes found');
    changes.forEach((change, i) => {
      console.log(`  ${i + 1}. ${change.type}: ${change.previousValue} → ${change.newValue}`);
    });

    return changes;
  }

  /**
   * Apply detected changes to create new contextual request
   */
  static applyChangesToContext(
    originalMessage: string,
    detectedChanges: ChangeEvent[],
    previousContext: ConversationContext
  ): string {
    if (detectedChanges.length === 0) {
      return originalMessage; // No changes detected, return original
    }

    console.log('🔧 [CONTEXT] Applying changes to create contextual request');

    // Build comprehensive contextual request
    const contextParts = [
      '**CONVERSATION CONTINUATION REQUEST**',
      '',
      '**Previous Order State:**'
    ];

    // Add previous order details
    if (previousContext.previousQuoteData?.capDetails) {
      contextParts.push(`• Cap Style: ${previousContext.previousQuoteData.capDetails.productName || 'Custom Cap'}`);
      contextParts.push(`• Quantity: ${previousContext.previousQuoteData.capDetails.quantity || 144} pieces`);
    }

    if (previousContext.previousQuoteData?.customization) {
      const custom = previousContext.previousQuoteData.customization;
      if (custom.closure) contextParts.push(`• Closure: ${custom.closure}`);
      if (custom.fabric) contextParts.push(`• Fabric: ${custom.fabric}`);
      if (custom.logos) {
        Object.entries(custom.logos).forEach(([position, logo]: [string, any]) => {
          if (logo) contextParts.push(`• Logo (${position}): ${logo.type} ${logo.size || ''}`);
        });
      }
    }

    if (previousContext.previousQuoteData?.delivery) {
      contextParts.push(`• Delivery: ${previousContext.previousQuoteData.delivery.method || 'Regular Delivery'}`);
    }

    contextParts.push('', '**Requested Changes:**');

    // Add detected changes
    detectedChanges.forEach(change => {
      contextParts.push(`• ${change.reason || `Change ${change.field} from ${change.previousValue} to ${change.newValue}`}`);
    });

    contextParts.push('', '**Current User Message:**', originalMessage);
    contextParts.push('', '**INSTRUCTION:** Apply the requested changes to the previous order state and recalculate pricing. Preserve all unchanged components.');

    return contextParts.join('\n');
  }

  /**
   * Calculate Order Builder delta for visual indicators
   */
  static calculateOrderBuilderDelta(
    detectedChanges: ChangeEvent[],
    previousTotal: number,
    newTotal: number
  ): OrderBuilderDelta {
    const changedSections: Set<string> = new Set();
    const visualIndicators: any = {};

    detectedChanges.forEach(change => {
      switch (change.type) {
        case 'quantity':
          changedSections.add('capStyle');
          changedSections.add('customization');
          changedSections.add('delivery');
          changedSections.add('costBreakdown');
          break;
        case 'closure':
        case 'fabric':
          changedSections.add('customization');
          changedSections.add('costBreakdown');
          break;
        case 'logo':
          changedSections.add('customization');
          changedSections.add('costBreakdown');
          break;
        case 'accessory':
          changedSections.add('customization');
          changedSections.add('costBreakdown');
          break;
        case 'delivery':
          changedSections.add('delivery');
          changedSections.add('costBreakdown');
          break;
        case 'cap_style':
          changedSections.add('capStyle');
          changedSections.add('costBreakdown');
          break;
      }
    });

    // Create visual indicators for each changed section
    const allSections = ['capStyle', 'customization', 'delivery', 'costBreakdown'];

    allSections.forEach(section => {
      const hasChanges = changedSections.has(section);
      visualIndicators[section] = {
        hasChanges,
        changeType: hasChanges ? 'updated' : undefined,
        specific: hasChanges ? detectedChanges
          .filter(c => this.getAffectedSection(c.type).includes(section))
          .map(c => c.field) : []
      };
    });

    return {
      changedSections: Array.from(changedSections),
      preservedSections: allSections.filter(s => !changedSections.has(s)),
      costImpact: {
        previousTotal,
        newTotal,
        difference: newTotal - previousTotal
      },
      visualIndicators
    };
  }

  /**
   * Enhanced buildContextualRequest that uses conversation context
   */
  static async buildSmartContextualRequest(
    currentMessage: string,
    conversationHistory: any[],
    conversationId?: string
  ): Promise<{
    contextualRequest: string;
    hasContext: boolean;
    detectedChanges: ChangeEvent[];
    orderBuilderDelta?: OrderBuilderDelta;
  }> {
    // If no conversation ID, fall back to basic context building
    if (!conversationId) {
      return {
        contextualRequest: this.buildBasicContextualRequest(currentMessage, conversationHistory),
        hasContext: conversationHistory.length > 0,
        detectedChanges: [],
        orderBuilderDelta: undefined
      };
    }

    // Load full conversation context from Supabase
    const context = await this.loadConversationContext(conversationId, currentMessage);

    if (!context || !context.previousOrderBuilder) {
      return {
        contextualRequest: this.buildBasicContextualRequest(currentMessage, conversationHistory),
        hasContext: conversationHistory.length > 0,
        detectedChanges: [],
        orderBuilderDelta: undefined
      };
    }

    // Detect changes in current message
    const detectedChanges = this.detectOrderChanges(currentMessage, context);

    // Apply changes to create smart contextual request
    const contextualRequest = this.applyChangesToContext(currentMessage, detectedChanges, context);

    // Calculate Order Builder delta for UI updates
    const orderBuilderDelta = detectedChanges.length > 0 ?
      this.calculateOrderBuilderDelta(detectedChanges, 0, 0) : undefined;

    return {
      contextualRequest,
      hasContext: true,
      detectedChanges,
      orderBuilderDelta
    };
  }

  // Private helper methods
  private static buildBasicContextualRequest(currentMessage: string, conversationHistory: any[]): string {
    if (!conversationHistory || conversationHistory.length === 0) {
      return currentMessage;
    }

    const previousContext = conversationHistory
      .filter(msg => msg.role === 'user')
      .map(msg => msg.content)
      .join(' ');

    return `
Previous context: ${previousContext}

Current request: ${currentMessage}

Please interpret the current request in the context of the previous conversation. If the current request is a modification, apply it to the previous specifications.
    `.trim();
  }

  private static extractChangeHistory(messages: any[]): ChangeEvent[] {
    // Extract change history from conversation messages
    // This could be enhanced to parse previous AI responses for change tracking
    return [];
  }

  private static normalizeClosure(closure: string): string {
    const closureMap: { [key: string]: string } = {
      'snapback': 'Snapback',
      'fitted': 'Fitted',
      'flexfit': 'Flexfit',
      'buckle': 'Buckle',
      'velcro': 'Velcro',
      'strap': 'Strap Back'
    };
    return closureMap[closure.toLowerCase()] || closure;
  }

  private static normalizeFabric(fabric: string): string {
    const fabricMap: { [key: string]: string } = {
      'chinotwill': 'Chino Twill',
      'canvas': 'Canvas',
      'suedecotton': 'Suede Cotton',
      'airmesh': 'Air Mesh',
      'acrylic': 'Acrylic',
      'leather': 'Genuine Leather'
    };
    return fabricMap[fabric.toLowerCase().replace(' ', '')] || fabric;
  }

  private static detectLogoAction(message: string): { field: string; previous: any; new: any; reason: string } | null {
    const lowerMessage = message.toLowerCase();

    // Add logo
    if (lowerMessage.includes('add') && (lowerMessage.includes('logo') || lowerMessage.includes('back'))) {
      if (lowerMessage.includes('back')) {
        return {
          field: 'backLogo',
          previous: null,
          new: { position: 'Back', type: '3D Embroidery', size: 'Large' },
          reason: 'User requested to add a back logo'
        };
      }
    }

    // Remove logo/accessories
    if (lowerMessage.includes('remove') || lowerMessage.includes('without')) {
      if (lowerMessage.includes('logo')) {
        return {
          field: 'logos',
          previous: 'existing',
          new: null,
          reason: 'User requested to remove logos'
        };
      }
    }

    return null;
  }

  private static detectAccessoryAction(message: string): { previous: any; new: any; reason: string } | null {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('remove') || lowerMessage.includes('without')) {
      if (lowerMessage.includes('accessories') || lowerMessage.includes('accessory')) {
        return {
          previous: 'existing',
          new: null,
          reason: 'User requested to remove accessories'
        };
      }
    }

    return null;
  }

  private static detectDeliveryAction(message: string): { previous: string; new: string; reason: string } | null {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('priority')) {
      return {
        previous: 'Regular Delivery',
        new: 'Priority Delivery',
        reason: 'User requested priority delivery'
      };
    }

    if (lowerMessage.includes('freight')) {
      const method = lowerMessage.includes('air') ? 'Air Freight' : 'Sea Freight';
      return {
        previous: 'Regular Delivery',
        new: method,
        reason: `User requested ${method.toLowerCase()}`
      };
    }

    return null;
  }

  private static getAffectedSection(changeType: string): string[] {
    const sectionMap: { [key: string]: string[] } = {
      'quantity': ['capStyle', 'customization', 'delivery', 'costBreakdown'],
      'closure': ['customization', 'costBreakdown'],
      'fabric': ['customization', 'costBreakdown'],
      'logo': ['customization', 'costBreakdown'],
      'accessory': ['customization', 'costBreakdown'],
      'delivery': ['delivery', 'costBreakdown'],
      'cap_style': ['capStyle', 'costBreakdown']
    };

    return sectionMap[changeType] || [];
  }
}