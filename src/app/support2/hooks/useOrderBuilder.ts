import { useState, useCallback, useEffect } from 'react';
import { OrderBuilderStatus, LeadTimeData, QuoteVersion } from '../types/orderBuilder';

const initialOrderBuilderStatus: OrderBuilderStatus = {
  capStyle: {
    completed: false,
    items: {
      size: false,
      color: false,
      profile: false,
      shape: false,
      structure: false,
      fabric: false,
      stitch: false
    },
    status: 'red'
  },
  customization: {
    completed: false,
    items: {
      logoSetup: false,
      accessories: false,
      moldCharges: false
    },
    logoPositions: [],
    status: 'empty'
  },
  delivery: {
    completed: false,
    status: 'red'
  },
  costBreakdown: {
    available: false,
    versions: [],
    selectedVersionId: null
  }
};

export const useOrderBuilder = () => {
  const [orderBuilderStatus, setOrderBuilderStatus] = useState<OrderBuilderStatus>(initialOrderBuilderStatus);
  const [leadTimeData, setLeadTimeData] = useState<LeadTimeData | null>(null);
  const [isOrderBuilderVisible, setIsOrderBuilderVisible] = useState(false);
  const [collapsedBlocks, setCollapsedBlocks] = useState({
    capStyle: true,
    customization: true,
    delivery: true,
    costBreakdown: true
  });
  const [isCalculatingLeadTime, setIsCalculatingLeadTime] = useState(false);

  const updateOrderBuilderStatus = useCallback((quoteData: any) => {
    if (!quoteData) return;

    const newStatus = { ...orderBuilderStatus };
    
    // Update cost breakdown with new quote versions
    const newVersion: QuoteVersion = {
      id: `version-${Date.now()}`,
      version: newStatus.costBreakdown.versions.length + 1,
      timestamp: new Date(),
      pricing: {
        baseProductCost: quoteData.baseProductCost || 0,
        logosCost: quoteData.logosCost || 0,
        deliveryCost: quoteData.deliveryCost || 0,
        total: quoteData.total || 0,
        quantity: quoteData.quantity || 0
      },
      quoteData
    };

    newStatus.costBreakdown.versions.push(newVersion);
    newStatus.costBreakdown.available = true;
    newStatus.costBreakdown.selectedVersionId = newVersion.id;

    // Update cap style status based on quote data
    if (quoteData.capDetails) {
      const capDetails = quoteData.capDetails;
      newStatus.capStyle.items = {
        size: !!capDetails.size,
        color: !!capDetails.color,
        profile: !!capDetails.profile,
        shape: !!capDetails.shape,
        structure: !!capDetails.structure,
        fabric: !!capDetails.fabric,
        stitch: !!capDetails.stitch
      };
      
      const completedItems = Object.values(newStatus.capStyle.items).filter(Boolean).length;
      newStatus.capStyle.completed = completedItems === 7;
      newStatus.capStyle.status = completedItems === 7 ? 'green' : completedItems > 3 ? 'yellow' : 'red';
    }

    // Update customization status
    if (quoteData.customization) {
      const customization = quoteData.customization;
      newStatus.customization.items = {
        logoSetup: !!customization.logos?.length,
        accessories: !!customization.accessories?.length,
        moldCharges: !!customization.moldCharges
      };
      
      const completedCustomization = Object.values(newStatus.customization.items).filter(Boolean).length;
      newStatus.customization.completed = completedCustomization > 0;
      newStatus.customization.status = completedCustomization === 3 ? 'green' : completedCustomization > 0 ? 'yellow' : 'empty';
    }

    // Update delivery status
    if (quoteData.delivery) {
      newStatus.delivery.completed = true;
      newStatus.delivery.status = 'green';
    }

    setOrderBuilderStatus(newStatus);
    setIsOrderBuilderVisible(true);
  }, [orderBuilderStatus]);

  const calculateLeadTime = useCallback(async () => {
    const selectedVersion = orderBuilderStatus.costBreakdown.versions.find(
      v => v.id === orderBuilderStatus.costBreakdown.selectedVersionId
    );

    if (!selectedVersion) return;

    setIsCalculatingLeadTime(true);
    try {
      const response = await fetch('/api/support/lead-time-calculator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quoteData: selectedVersion.quoteData,
          quantity: selectedVersion.pricing.quantity
        })
      });

      if (response.ok) {
        const data = await response.json();
        setLeadTimeData(data);
      }
    } catch (error) {
      console.error('Error calculating lead time:', error);
    } finally {
      setIsCalculatingLeadTime(false);
    }
  }, [orderBuilderStatus.costBreakdown]);

  const selectQuoteVersion = useCallback((versionId: string) => {
    setOrderBuilderStatus(prev => ({
      ...prev,
      costBreakdown: {
        ...prev.costBreakdown,
        selectedVersionId: versionId
      }
    }));
  }, []);

  const getSelectedVersion = useCallback(() => {
    return orderBuilderStatus.costBreakdown.versions.find(
      v => v.id === orderBuilderStatus.costBreakdown.selectedVersionId
    );
  }, [orderBuilderStatus.costBreakdown]);

  const toggleBlockCollapse = useCallback((blockName: keyof typeof collapsedBlocks) => {
    setCollapsedBlocks(prev => ({
      ...prev,
      [blockName]: !prev[blockName]
    }));
  }, []);

  const resetOrderBuilder = useCallback(() => {
    setOrderBuilderStatus(initialOrderBuilderStatus);
    setLeadTimeData(null);
    setIsOrderBuilderVisible(false);
    setCollapsedBlocks({
      capStyle: true,
      customization: true,
      delivery: true,
      costBreakdown: true
    });
  }, []);

  // Auto-calculate lead time when version changes
  useEffect(() => {
    if (orderBuilderStatus.costBreakdown.available && orderBuilderStatus.costBreakdown.selectedVersionId) {
      calculateLeadTime();
    }
  }, [orderBuilderStatus.costBreakdown.selectedVersionId, calculateLeadTime]);

  return {
    orderBuilderStatus,
    leadTimeData,
    isOrderBuilderVisible,
    collapsedBlocks,
    isCalculatingLeadTime,
    updateOrderBuilderStatus,
    calculateLeadTime,
    selectQuoteVersion,
    getSelectedVersion,
    toggleBlockCollapse,
    resetOrderBuilder,
    setOrderBuilderStatus,
    setLeadTimeData,
    setIsOrderBuilderVisible
  };
};