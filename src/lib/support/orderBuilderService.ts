import { OrderBuilderStatus, LeadTimeData, QuoteVersion } from '@/app/support2/types/orderBuilder';

export class OrderBuilderService {
  private static instance: OrderBuilderService;
  
  public static getInstance(): OrderBuilderService {
    if (!OrderBuilderService.instance) {
      OrderBuilderService.instance = new OrderBuilderService();
    }
    return OrderBuilderService.instance;
  }

  parseQuoteDataToOrderBuilder(quoteData: any): Partial<OrderBuilderStatus> {
    if (!quoteData) return {};

    const updates: Partial<OrderBuilderStatus> = {};

    // Parse cap style data
    if (quoteData.capDetails) {
      const capDetails = quoteData.capDetails;
      const items = {
        size: !!capDetails.size,
        color: !!capDetails.color,
        profile: !!capDetails.profile,
        shape: !!capDetails.shape,
        structure: !!capDetails.structure,
        fabric: !!capDetails.fabric,
        stitch: !!capDetails.stitch
      };
      
      const completedItems = Object.values(items).filter(Boolean).length;
      const completed = completedItems === 7;
      const status = completed ? 'green' : (completedItems > 3 ? 'yellow' : 'red') as any;

      updates.capStyle = {
        completed,
        items,
        status
      };
    }

    // Parse customization data
    if (quoteData.customization) {
      const customization = quoteData.customization;
      const items = {
        logoSetup: !!(customization.logos?.length),
        accessories: !!(customization.accessories?.length),
        moldCharges: !!customization.moldCharges
      };
      
      const completedCustomization = Object.values(items).filter(Boolean).length;
      const completed = completedCustomization > 0;
      const status = completedCustomization === 3 ? 'green' : (completedCustomization > 0 ? 'yellow' : 'empty') as any;
      
      const logoPositions = customization.logos?.map((logo: any) => logo.position).filter(Boolean) || [];

      updates.customization = {
        completed,
        items,
        logoPositions,
        status
      };
    }

    // Parse delivery data
    if (quoteData.delivery) {
      updates.delivery = {
        completed: true,
        status: 'green' as any
      };
    }

    return updates;
  }

  createQuoteVersion(quoteData: any, existingVersions: QuoteVersion[] = []): QuoteVersion {
    return {
      id: `version-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      version: existingVersions.length + 1,
      timestamp: new Date(),
      pricing: {
        baseProductCost: quoteData.baseProductCost || 0,
        logosCost: quoteData.logosCost || 0,
        deliveryCost: quoteData.deliveryCost || 0,
        total: quoteData.total || 0,
        quantity: quoteData.quantity || 0
      },
      quoteData,
      label: quoteData.label || `Quote ${existingVersions.length + 1}`
    };
  }

  async createMultipleQuantityVersions(baseQuoteData: any): Promise<QuoteVersion[]> {
    try {
      // Extract requirements from base quote data
      const baseRequirements = this.extractRequirementsFromQuoteData(baseQuoteData);
      
      if (!baseRequirements) {
        console.warn('Could not extract requirements from quote data');
        return [];
      }

      console.log('🔢 Creating multiple quantity versions with requirements:', baseRequirements);

      // Call the dedicated quantity pricing endpoint
      const response = await fetch('/api/support/quantity-pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseRequirements
        })
      });

      if (!response.ok) {
        console.error('Quantity pricing API failed:', response.status, response.statusText);
        return [];
      }

      const data = await response.json();
      
      if (!data.success || !data.pricingOptions) {
        console.error('Invalid response from quantity pricing API:', data);
        return [];
      }

      // Convert pricing options to quote versions
      const versions: QuoteVersion[] = data.pricingOptions.map((option: any, index: number) => ({
        id: `qty-${option.quantity}-${Date.now()}`,
        version: index + 1,
        timestamp: new Date(),
        pricing: {
          baseProductCost: option.pricing.baseProductCost,
          logosCost: option.pricing.logosCost,
          deliveryCost: option.pricing.deliveryCost,
          total: option.pricing.total,
          quantity: option.quantity
        },
        quoteData: {
          ...baseQuoteData,
          quantity: option.quantity,
          costBreakdown: option.pricing,
          orderEstimate: option.orderEstimate,
          tier: option.tier
        },
        label: `${option.quantity} pieces - $${option.pricing.total.toLocaleString()} ($${option.costPerUnit.toFixed(2)}/pc)`
      }));

      console.log(`✅ Created ${versions.length} quantity versions`);
      return versions;

    } catch (error) {
      console.error('Error creating multiple quantity versions:', error);
      return [];
    }
  }

  private extractRequirementsFromQuoteData(quoteData: any): any {
    if (!quoteData) return null;

    try {
      // Build requirements object from quote data
      const requirements: any = {
        quantity: quoteData.quantity || 576, // Default quantity
        logoType: 'Embroidery', // Default
        color: 'Black/White', // Default
        panelCount: 5 // Default
      };

      // Extract cap details
      if (quoteData.capDetails) {
        const cap = quoteData.capDetails;
        if (cap.panelCount) {
          requirements.panelCount = parseInt(cap.panelCount.replace('-Panel', ''));
        }
        if (cap.color) requirements.color = cap.color;
        if (cap.profile) requirements.profile = cap.profile;
        if (cap.shape) requirements.billStyle = cap.shape;
        if (cap.closure) requirements.closureType = cap.closure;
        if (cap.fabric) requirements.fabricType = cap.fabric;
        if (cap.structure) requirements.structure = cap.structure;
        if (cap.size) requirements.capSize = cap.size;
      }

      // Extract logo details
      if (quoteData.customization?.logos && quoteData.customization.logos.length > 0) {
        const primaryLogo = quoteData.customization.logos[0];
        requirements.logoType = primaryLogo.type || 'Embroidery';
        requirements.logoPosition = primaryLogo.position || 'Front';
        requirements.logoSize = primaryLogo.size || 'Large';
        requirements.logoApplication = primaryLogo.application || 'Direct';

        // Handle multi-logo setup
        if (quoteData.customization.logos.length > 1) {
          requirements.multiLogoSetup = {};
          quoteData.customization.logos.forEach((logo: any) => {
            const position = logo.position?.toLowerCase() || 'front';
            requirements.multiLogoSetup[position] = {
              type: logo.type || 'Embroidery',
              size: logo.size || 'Large',
              application: logo.application || 'Direct'
            };
          });
        }
      }

      // Extract accessories
      if (quoteData.customization?.accessories) {
        requirements.accessories = quoteData.customization.accessories;
      }

      console.log('📝 Extracted requirements:', requirements);
      return requirements;

    } catch (error) {
      console.error('Error extracting requirements from quote data:', error);
      return null;
    }
  }

  private buildSpecsFromQuoteData(quoteData: any): string {
    const specs = [];
    
    if (quoteData.capDetails) {
      const cap = quoteData.capDetails;
      if (cap.panelCount) specs.push(`${cap.panelCount} panel`);
      if (cap.fabric) specs.push(cap.fabric);
      if (cap.color) specs.push(cap.color);
      if (cap.profile) specs.push(`${cap.profile} profile`);
      if (cap.shape) specs.push(`${cap.shape} shape`);
      if (cap.closure) specs.push(`${cap.closure} closure`);
    }
    
    if (quoteData.customization?.logos) {
      quoteData.customization.logos.forEach((logo: any) => {
        specs.push(`${logo.type} on ${logo.position}`);
      });
    }
    
    if (quoteData.customization?.accessories) {
      specs.push(`accessories: ${quoteData.customization.accessories.join(', ')}`);
    }
    
    return specs.join(', ') || 'custom cap';
  }

  async calculateLeadTime(quoteData: any, quantity: number): Promise<LeadTimeData | null> {
    try {
      const response = await fetch('/api/support/lead-time-calculator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quoteData, quantity })
      });

      if (response.ok) {
        const data = await response.json();
        return this.parseLeadTimeResponse(data);
      }
    } catch (error) {
      console.error('Error calculating lead time:', error);
    }
    
    return null;
  }

  private parseLeadTimeResponse(response: any): LeadTimeData {
    const leadTimeData: LeadTimeData = {};

    // Parse lead time information
    if (response.leadTime || response.timeline) {
      const timeline = response.leadTime || response.timeline;
      leadTimeData.leadTime = {
        totalDays: timeline.totalDays || timeline.days || 0,
        deliveryDate: timeline.deliveryDate || timeline.estimatedDelivery || '',
        details: timeline.details || timeline.steps || []
      };
    }

    // Parse packaging information
    if (response.boxes || response.packaging) {
      const packaging = response.boxes || response.packaging;
      leadTimeData.boxes = {
        lines: packaging.lines || packaging.boxLines || [],
        totalBoxes: packaging.totalBoxes || packaging.total || 0,
        netWeightKg: packaging.netWeightKg || packaging.netWeight || 0,
        chargeableWeightKg: packaging.chargeableWeightKg || packaging.chargeableWeight || 0
      };
    }

    return leadTimeData;
  }

  generateOrderBuilderSnapshot(
    orderBuilderStatus: OrderBuilderStatus,
    leadTimeData: LeadTimeData | null,
    selectedVersion: QuoteVersion | null
  ) {
    return {
      orderBuilderStatus,
      leadTimeData,
      selectedVersion,
      costBreakdown: {
        available: orderBuilderStatus.costBreakdown.available,
        totalVersions: orderBuilderStatus.costBreakdown.versions.length,
        selectedVersionId: orderBuilderStatus.costBreakdown.selectedVersionId
      },
      timestamp: new Date().toISOString()
    };
  }

  validateOrderBuilder(orderBuilderStatus: OrderBuilderStatus): {
    isValid: boolean;
    missingItems: string[];
    warnings: string[];
  } {
    const missingItems: string[] = [];
    const warnings: string[] = [];

    // Check cap style completion
    if (!orderBuilderStatus.capStyle.completed) {
      const incompleteItems = Object.entries(orderBuilderStatus.capStyle.items)
        .filter(([_, completed]) => !completed)
        .map(([item, _]) => item);
      
      if (incompleteItems.length > 0) {
        missingItems.push(`Cap style: ${incompleteItems.join(', ')}`);
      }
    }

    // Check customization
    if (orderBuilderStatus.customization.status === 'empty') {
      warnings.push('No customization options selected');
    } else if (!orderBuilderStatus.customization.completed) {
      warnings.push('Customization setup incomplete');
    }

    // Check delivery
    if (!orderBuilderStatus.delivery.completed) {
      missingItems.push('Delivery options not configured');
    }

    // Check cost breakdown
    if (!orderBuilderStatus.costBreakdown.available) {
      missingItems.push('No quote data available');
    }

    return {
      isValid: missingItems.length === 0,
      missingItems,
      warnings
    };
  }

  async saveOrderBuilder(
    conversationId: string,
    orderBuilderStatus: OrderBuilderStatus,
    leadTimeData: LeadTimeData | null,
    selectedVersion: QuoteVersion | null,
    session?: any
  ): Promise<void> {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };

      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const snapshot = this.generateOrderBuilderSnapshot(
        orderBuilderStatus,
        leadTimeData,
        selectedVersion
      );

      await fetch(`/api/conversations/${conversationId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          metadata: {
            orderBuilder: snapshot
          }
        })
      });
    } catch (error) {
      console.error('Error saving order builder:', error);
      throw error;
    }
  }
}