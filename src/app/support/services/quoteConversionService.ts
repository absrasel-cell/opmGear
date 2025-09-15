import { UtilitiesService } from './utilitiesService';

export interface QuoteConversionData {
  conversationId: string;
  currentQuoteData: any;
  orderBuilderStatus: any;
  leadTimeData: any;
  userProfile: any;
  authUser: any;
  sessionId: string;
  uploadedFiles: string[];
  messages: any[];
}

export class QuoteConversionService {
  /**
   * Converts Order Builder data to QuoteOrder format for database storage
   */
  static async convertOrderBuilderToQuote(data: QuoteConversionData) {
    try {
      console.log('🔄 Converting Order Builder data to QuoteOrder format');

      const {
        conversationId,
        currentQuoteData,
        orderBuilderStatus,
        leadTimeData,
        userProfile,
        authUser,
        sessionId,
        uploadedFiles,
        messages
      } = data;

      if (!currentQuoteData || !orderBuilderStatus) {
        throw new Error('Missing quote data or order builder status');
      }

      // Extract customer information
      const customerInfo = this.extractCustomerInfo(userProfile, authUser, messages);

      // Convert cap style details
      const capDetails = this.convertCapStyleData(currentQuoteData, orderBuilderStatus);

      // Convert customization details
      const customization = this.convertCustomizationData(currentQuoteData, orderBuilderStatus);

      // Convert delivery details
      const delivery = this.convertDeliveryData(currentQuoteData, orderBuilderStatus, leadTimeData);

      // Extract cost breakdown
      const costBreakdown = this.extractCostBreakdown(currentQuoteData, orderBuilderStatus);

      // Generate quote ID
      const quoteId = `QUOTE-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      const quoteOrderData = {
        id: quoteId,
        customerId: authUser?.id || sessionId,
        customerName: customerInfo.name,
        customerEmail: customerInfo.email,
        customerPhone: customerInfo.phone || '',
        customerCompany: customerInfo.company || '',

        // Product details
        productType: capDetails.style || 'Custom Cap',
        colors: capDetails.colors,
        quantities: capDetails.quantities,

        // Customization
        logoRequirements: customization.logos,
        customizationOptions: {
          accessories: customization.accessories,
          closures: customization.closures,
          premiumFabrics: customization.premiumFabrics
        },

        // Delivery
        deliveryMethod: delivery.method,
        deliveryAddress: delivery.address,
        expectedDeliveryDate: delivery.expectedDate,
        leadTimeEstimate: delivery.leadTime,

        // Costs
        estimatedCosts: costBreakdown,

        // Metadata
        priority: 'NORMAL',
        status: 'COMPLETED',
        orderSource: 'SUPPORT_AI',
        additionalRequirements: this.extractAdditionalRequirements(messages),
        uploadedFiles: uploadedFiles,

        // Timestamps
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),

        // Internal tracking
        conversationId: conversationId,
        sessionId: sessionId,
        orderBuilderData: {
          status: orderBuilderStatus,
          rawQuoteData: currentQuoteData,
          leadTimeData: leadTimeData
        }
      };

      console.log('✅ Quote conversion completed:', {
        quoteId,
        customerName: customerInfo.name,
        totalCost: costBreakdown?.total || 'N/A'
      });

      return quoteOrderData;

    } catch (error) {
      console.error('❌ Error converting Order Builder data to quote:', error);
      throw error;
    }
  }

  /**
   * Extract customer information from various sources
   */
  private static extractCustomerInfo(userProfile: any, authUser: any, messages: any[]) {
    // Priority order: userProfile -> authUser -> messages -> defaults
    let customerInfo = {
      name: 'Customer',
      email: '',
      phone: '',
      company: ''
    };

    // From user profile
    if (userProfile) {
      customerInfo.name = userProfile.fullName || userProfile.name || customerInfo.name;
      customerInfo.email = userProfile.email || customerInfo.email;
      customerInfo.phone = userProfile.phone || customerInfo.phone;
      customerInfo.company = userProfile.company || customerInfo.company;
    }

    // From auth user
    if (authUser) {
      customerInfo.email = authUser.email || customerInfo.email;
      customerInfo.name = authUser.name || authUser.displayName || customerInfo.name;
    }

    // From messages (look for contact info)
    if (messages && messages.length > 0) {
      const contactMessages = messages.filter(msg =>
        msg.content && typeof msg.content === 'string' &&
        (msg.content.includes('@') || msg.content.includes('phone') || msg.content.includes('company'))
      );

      contactMessages.forEach(msg => {
        const content = msg.content;

        // Extract email
        const emailMatch = content.match(/[\w\.-]+@[\w\.-]+\.\w+/);
        if (emailMatch && !customerInfo.email) {
          customerInfo.email = emailMatch[0];
        }

        // Extract phone
        const phoneMatch = content.match(/(?:phone|tel|call)[:\s]*([+\d\s\-\(\)\.]+)/i);
        if (phoneMatch && !customerInfo.phone) {
          customerInfo.phone = phoneMatch[1].trim();
        }

        // Extract company
        const companyMatch = content.match(/(?:company|business|organization)[:\s]*([^\n\r,\.!?]+)/i);
        if (companyMatch && !customerInfo.company) {
          customerInfo.company = companyMatch[1].trim();
        }
      });
    }

    return customerInfo;
  }

  /**
   * Convert cap style data from Order Builder
   */
  private static convertCapStyleData(currentQuoteData: any, orderBuilderStatus: any) {
    const capStyle = orderBuilderStatus?.capStyle || {};

    return {
      style: currentQuoteData?.capStyle?.name || 'Custom Cap',
      colors: currentQuoteData?.colors || {},
      quantities: currentQuoteData?.quantities || {},
      fabric: currentQuoteData?.fabric || {},
      structure: currentQuoteData?.structure || {},
      profile: currentQuoteData?.profile || {},
      size: currentQuoteData?.size || {},
      details: {
        completed: capStyle.completed,
        items: capStyle.items || {}
      }
    };
  }

  /**
   * Convert customization data from Order Builder
   */
  private static convertCustomizationData(currentQuoteData: any, orderBuilderStatus: any) {
    const customization = orderBuilderStatus?.customization || {};

    return {
      logos: currentQuoteData?.logos || [],
      logoPositions: customization.logoPositions || [],
      accessories: currentQuoteData?.accessories || [],
      closures: currentQuoteData?.closures || [],
      premiumFabrics: currentQuoteData?.premiumFabrics || [],
      moldCharges: currentQuoteData?.moldCharges || [],
      details: {
        completed: customization.completed,
        items: customization.items || {}
      }
    };
  }

  /**
   * Convert delivery data from Order Builder
   */
  private static convertDeliveryData(currentQuoteData: any, orderBuilderStatus: any, leadTimeData: any) {
    const delivery = orderBuilderStatus?.delivery || {};

    return {
      method: currentQuoteData?.delivery?.method || 'Standard Shipping',
      address: currentQuoteData?.delivery?.address || {},
      leadTime: leadTimeData?.selectedLeadTime || '14-21 days',
      expectedDate: this.calculateExpectedDate(leadTimeData),
      details: {
        completed: delivery.completed,
        items: delivery.items || {}
      }
    };
  }

  /**
   * Extract cost breakdown from current quote data
   */
  private static extractCostBreakdown(currentQuoteData: any, orderBuilderStatus: any) {
    const costBreakdown = orderBuilderStatus?.costBreakdown || {};
    const selectedVersion = costBreakdown.versions?.find(
      (v: any) => v.id === costBreakdown.selectedVersionId
    ) || costBreakdown.versions?.[0];

    if (!selectedVersion) {
      return {
        total: 0,
        breakdown: {},
        version: null
      };
    }

    return {
      total: selectedVersion.finalPrice || 0,
      subtotal: selectedVersion.subtotal || 0,
      discountAmount: selectedVersion.discountAmount || 0,
      discountPercentage: selectedVersion.discountPercentage || 0,
      breakdown: {
        caps: selectedVersion.capCosts || 0,
        logos: selectedVersion.logoCosts || 0,
        accessories: selectedVersion.accessoryCosts || 0,
        delivery: selectedVersion.deliveryCosts || 0,
        setup: selectedVersion.setupFees || 0
      },
      version: selectedVersion,
      currency: 'USD'
    };
  }

  /**
   * Extract additional requirements from conversation messages
   */
  private static extractAdditionalRequirements(messages: any[]): string {
    if (!messages || messages.length === 0) return '';

    // Look for user messages that contain requirements, specifications, or special requests
    const requirementMessages = messages
      .filter(msg =>
        msg.role === 'user' &&
        msg.content &&
        typeof msg.content === 'string' &&
        msg.content.length > 10 // Ignore very short messages
      )
      .map(msg => msg.content)
      .slice(0, 5) // Take first 5 relevant messages
      .join(' | ');

    return requirementMessages;
  }

  /**
   * Calculate expected delivery date based on lead time
   */
  private static calculateExpectedDate(leadTimeData: any): string | null {
    if (!leadTimeData?.selectedLeadTime) return null;

    try {
      const leadTimeStr = leadTimeData.selectedLeadTime;
      let daysToAdd = 14; // Default

      // Extract days from lead time string (e.g., "7-10 days", "2-3 weeks")
      const daysMatch = leadTimeStr.match(/(\d+)(?:-\d+)?\s*days?/i);
      const weeksMatch = leadTimeStr.match(/(\d+)(?:-\d+)?\s*weeks?/i);

      if (daysMatch) {
        daysToAdd = parseInt(daysMatch[1]);
      } else if (weeksMatch) {
        daysToAdd = parseInt(weeksMatch[1]) * 7;
      }

      const expectedDate = new Date();
      expectedDate.setDate(expectedDate.getDate() + daysToAdd);

      return expectedDate.toISOString();
    } catch (error) {
      console.error('Error calculating expected date:', error);
      return null;
    }
  }

  /**
   * Save the converted quote to database via support API
   */
  static async saveQuoteToDatabase(data: QuoteConversionData): Promise<{ success: boolean; quoteId?: string; conversationId?: string; error?: string }> {
    try {
      console.log('🔄 Saving quote to database via support API');

      // Convert Order Builder data to the format expected by support API
      const supportAPIPayload = this.convertToSupportAPIFormat(data);

      const response = await fetch('/api/support/save-quote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(supportAPIPayload)
      });

      const result = await response.json();

      if (response.ok && result.success) {
        console.log('✅ Quote saved successfully:', result.quoteId);
        return {
          success: true,
          quoteId: result.quoteId,
          conversationId: result.conversationId
        };
      } else {
        console.error('❌ Failed to save quote:', result.error);
        return { success: false, error: result.error || 'Failed to save quote' };
      }

    } catch (error) {
      console.error('❌ Error saving quote to database:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Convert Order Builder data to the format expected by the support save-quote API
   */
  private static convertToSupportAPIFormat(data: QuoteConversionData) {
    const {
      conversationId,
      currentQuoteData,
      orderBuilderStatus,
      leadTimeData,
      userProfile,
      authUser,
      sessionId,
      uploadedFiles
    } = data;

    // Extract cap details from Order Builder
    const capDetails = this.extractCapDetailsForAPI(currentQuoteData, orderBuilderStatus);

    // Extract customization details
    const customization = this.extractCustomizationForAPI(currentQuoteData, orderBuilderStatus);

    // Extract delivery details
    const delivery = this.extractDeliveryForAPI(currentQuoteData, orderBuilderStatus, leadTimeData);

    // Extract pricing details
    const pricing = this.extractPricingForAPI(currentQuoteData, orderBuilderStatus);

    return {
      conversationId,
      sessionId,
      userProfile,
      uploadedFiles,
      quoteData: {
        capDetails,
        customization,
        delivery,
        pricing
      }
    };
  }

  /**
   * Extract cap details in the format expected by support API
   */
  private static extractCapDetailsForAPI(currentQuoteData: any, orderBuilderStatus: any) {
    return {
      productName: currentQuoteData?.capStyle?.name || 'Custom Cap',
      style: currentQuoteData?.capStyle?.name || 'Custom Cap',
      profile: currentQuoteData?.profile || currentQuoteData?.capStyle?.profile,
      billShape: currentQuoteData?.billShape || currentQuoteData?.shape,
      structure: currentQuoteData?.structure || currentQuoteData?.capStyle?.structure,
      closure: currentQuoteData?.closure || currentQuoteData?.capStyle?.closure,
      fabric: currentQuoteData?.fabric || currentQuoteData?.capStyle?.fabric,
      size: currentQuoteData?.size || currentQuoteData?.capStyle?.size,
      sizes: currentQuoteData?.sizes || (currentQuoteData?.size ? [currentQuoteData.size] : []),
      color: currentQuoteData?.color || currentQuoteData?.colors?.[0],
      colors: currentQuoteData?.colors || (currentQuoteData?.color ? [currentQuoteData.color] : []),
      stitching: currentQuoteData?.stitching || currentQuoteData?.stitch
    };
  }

  /**
   * Extract customization details in the format expected by support API
   */
  private static extractCustomizationForAPI(currentQuoteData: any, orderBuilderStatus: any) {
    const logos = currentQuoteData?.logos || [];
    const accessories = currentQuoteData?.accessories || [];

    return {
      logos: logos.map((logo: any) => ({
        location: logo.location || logo.position,
        type: logo.type || logo.logoType,
        size: logo.size,
        setupCost: logo.setupCost || logo.moldCost || 0,
        unitCost: logo.unitCost || logo.cost || 0,
        totalCost: logo.totalCost || 0,
        application: logo.application || 'Direct',
        description: logo.description || `${logo.size || 'Standard'} ${logo.type || 'Logo'} at ${logo.location || 'Front'} position`
      })),
      accessories: accessories.map((acc: any) => ({
        type: acc.type || acc.name,
        quantity: acc.quantity || 1,
        unitCost: acc.unitCost || acc.cost || 0,
        totalCost: acc.totalCost || acc.cost || 0,
        description: acc.description || `${acc.type || acc.name} accessory`
      })),
      logoSetup: orderBuilderStatus?.customization?.logoSetup || {},
      totalMoldCharges: currentQuoteData?.moldCharges || 0
    };
  }

  /**
   * Extract delivery details in the format expected by support API
   */
  private static extractDeliveryForAPI(currentQuoteData: any, orderBuilderStatus: any, leadTimeData: any) {
    return {
      method: currentQuoteData?.delivery?.method || 'Standard Shipping',
      leadTime: leadTimeData?.selectedLeadTime || '14-21 days',
      timeframe: leadTimeData?.selectedLeadTime || '14-21 days',
      urgency: currentQuoteData?.delivery?.urgency || 'standard',
      estimatedDelivery: this.calculateExpectedDate(leadTimeData),
      description: currentQuoteData?.delivery?.description || `${currentQuoteData?.delivery?.method || 'Standard'} delivery service`
    };
  }

  /**
   * Extract pricing details in the format expected by support API
   */
  private static extractPricingForAPI(currentQuoteData: any, orderBuilderStatus: any) {
    const costBreakdown = orderBuilderStatus?.costBreakdown || {};
    const selectedVersion = costBreakdown.versions?.find(
      (v: any) => v.id === costBreakdown.selectedVersionId
    ) || costBreakdown.versions?.[0];

    if (!selectedVersion) {
      return {
        quantity: 1,
        total: 0,
        baseProductCost: 0,
        logosCost: 0,
        accessoriesCost: 0,
        deliveryCost: 0,
        moldCharge: 0
      };
    }

    return {
      quantity: selectedVersion.quantity || currentQuoteData?.quantity || 1,
      total: selectedVersion.finalPrice || selectedVersion.total || 0,
      baseProductCost: selectedVersion.capCosts || 0,
      logosCost: selectedVersion.logoCosts || 0,
      accessoriesCost: selectedVersion.accessoryCosts || 0,
      deliveryCost: selectedVersion.deliveryCosts || 0,
      moldCharge: selectedVersion.setupFees || 0,
      premiumFabricCost: selectedVersion.premiumFabricCost || 0,
      premiumClosureCost: selectedVersion.premiumClosureCost || 0
    };
  }
}