export interface QuoteVersion {
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

export interface OrderBuilderStatus {
  capStyle: {
    completed: boolean;
    items: {
      size: boolean;
      color: boolean;
      profile: boolean;
      shape: boolean;
      structure: boolean;
      fabric: boolean;
      stitch: boolean;
    };
    status: 'red' | 'yellow' | 'green';
  };
  customization: {
    completed: boolean;
    items: {
      logoSetup: boolean;
      accessories: boolean;
      moldCharges: boolean;
    };
    logoPositions: string[];
    status: 'empty' | 'red' | 'yellow' | 'green';
  };
  delivery: {
    completed: boolean;
    status: 'red' | 'yellow' | 'green';
  };
  costBreakdown: {
    available: boolean;
    versions: QuoteVersion[];
    selectedVersionId: string | null;
  };
}

export interface LeadTimeData {
  leadTime?: {
    totalDays: number;
    deliveryDate: string;
    details: string[];
  };
  boxes?: {
    lines: Array<{
      label: string;
      count: number;
      pieces: number;
      dimensions: string;
      volume: number;
    }>;
    totalBoxes: number;
    netWeightKg: number;
    chargeableWeightKg: number;
  };
}