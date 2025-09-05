/**
 * Order Builder State Management Library
 * Handles serialization, validation, and restoration of Order Builder state
 * for conversation history system in US Custom Cap platform
 */

export interface CapStyleSetup {
  style?: string;
  profile?: string;
  color?: string;
  size?: string;
  quantity?: number;
  basePrice?: number;
  selectedOptions?: Record<string, any>;
}

export interface LogoDetails {
  id?: string;
  location: string;
  type: string;
  size?: string;
  colors?: string[];
  setupCost?: number;
  unitCost?: number;
  quantity?: number;
  fileUploaded?: boolean;
  fileName?: string;
  instructions?: string;
}

export interface CustomizationOptions {
  logoDetails?: LogoDetails[];
  additionalOptions?: Record<string, any>;
  accessories?: Record<string, any>;
  closures?: Record<string, any>;
  totalCustomizationCost?: number;
}

export interface DeliveryOptions {
  method?: string;
  timeframe?: string;
  cost?: number;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  };
  urgency?: 'standard' | 'rush' | 'express';
}

export interface CostBreakdown {
  baseCost?: number;
  logoSetupCosts?: number;
  logoUnitCosts?: number;
  additionalOptionsCosts?: number;
  accessoriesCosts?: number;
  closuresCosts?: number;
  deliveryCost?: number;
  subtotal?: number;
  discounts?: number;
  taxes?: number;
  total?: number;
  savings?: number;
  tierDiscountApplied?: string;
}

export interface ProductionTimeline {
  setupTime?: string;
  productionTime?: string;
  shippingTime?: string;
  totalTime?: string;
  estimatedDelivery?: string;
  urgencyLevel?: string;
}

export interface PackagingOptions {
  type?: string;
  individualWrapping?: boolean;
  giftWrapping?: boolean;
  customLabeling?: boolean;
  additionalInstructions?: string;
  cost?: number;
}

export interface QuoteData {
  quoteId?: string;
  sessionId?: string;
  status?: string;
  generatedAt?: string;
  expiresAt?: string;
  pricing?: CostBreakdown;
  terms?: string[];
  notes?: string;
  customerInfo?: {
    name?: string;
    email?: string;
    phone?: string;
    company?: string;
  };
}

export interface OrderBuilderState {
  // Core Order Builder components
  capStyleSetup?: CapStyleSetup;
  customization?: CustomizationOptions;
  delivery?: DeliveryOptions;
  costBreakdown?: CostBreakdown;
  productionTimeline?: ProductionTimeline;
  packaging?: PackagingOptions;
  quoteData?: QuoteData;

  // State metadata
  currentStep?: string;
  isCompleted?: boolean;
  completedAt?: string;
  totalCost?: number;
  totalUnits?: number;
  stateVersion?: string;
  
  // Session and tracking
  sessionId?: string;
  lastUpdated?: string;
  validationErrors?: string[];
  metadata?: Record<string, any>;
}

/**
 * Validates Order Builder state structure and data integrity
 */
export function validateOrderBuilderState(state: any): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!state) {
    errors.push('State object is null or undefined');
    return { isValid: false, errors, warnings };
  }

  // Validate cap style setup
  if (state.capStyleSetup) {
    const caps = state.capStyleSetup;
    if (caps.quantity && (caps.quantity <= 0 || caps.quantity > 100000)) {
      errors.push('Invalid quantity: must be between 1 and 100,000');
    }
    if (caps.basePrice && caps.basePrice < 0) {
      errors.push('Invalid base price: cannot be negative');
    }
  }

  // Validate customization
  if (state.customization?.logoDetails) {
    state.customization.logoDetails.forEach((logo: LogoDetails, index: number) => {
      if (!logo.location) {
        errors.push(`Logo ${index + 1}: Location is required`);
      }
      if (!logo.type) {
        errors.push(`Logo ${index + 1}: Type is required`);
      }
      if (logo.setupCost && logo.setupCost < 0) {
        errors.push(`Logo ${index + 1}: Setup cost cannot be negative`);
      }
      if (logo.unitCost && logo.unitCost < 0) {
        errors.push(`Logo ${index + 1}: Unit cost cannot be negative`);
      }
    });
  }

  // Validate cost breakdown
  if (state.costBreakdown) {
    const costs = state.costBreakdown;
    const numericFields = ['baseCost', 'logoSetupCosts', 'logoUnitCosts', 'subtotal', 'total'];
    numericFields.forEach(field => {
      if (costs[field] && costs[field] < 0) {
        errors.push(`Cost breakdown: ${field} cannot be negative`);
      }
    });

    // Check if total cost makes sense
    if (costs.total && costs.subtotal && costs.total < costs.subtotal) {
      warnings.push('Total cost is less than subtotal - please verify calculations');
    }
  }

  // Validate delivery options
  if (state.delivery?.cost && state.delivery.cost < 0) {
    errors.push('Delivery cost cannot be negative');
  }

  // Validate quote data
  if (state.quoteData) {
    if (state.quoteData.expiresAt) {
      try {
        const expiryDate = new Date(state.quoteData.expiresAt);
        if (expiryDate < new Date()) {
          warnings.push('Quote has expired');
        }
      } catch (e) {
        errors.push('Invalid quote expiry date format');
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Serializes Order Builder state for database storage
 */
export function serializeOrderBuilderState(state: OrderBuilderState): {
  capStyleSetup: string | null;
  customization: string | null;
  delivery: string | null;
  costBreakdown: string | null;
  productionTimeline: string | null;
  packaging: string | null;
  quoteData: string | null;
  metadata: string | null;
} {
  const safeStringify = (obj: any): string | null => {
    if (!obj) return null;
    try {
      return JSON.stringify(obj);
    } catch (error) {
      console.error('Failed to serialize state component:', error);
      return null;
    }
  };

  return {
    capStyleSetup: safeStringify(state.capStyleSetup),
    customization: safeStringify(state.customization),
    delivery: safeStringify(state.delivery),
    costBreakdown: safeStringify(state.costBreakdown),
    productionTimeline: safeStringify(state.productionTimeline),
    packaging: safeStringify(state.packaging),
    quoteData: safeStringify(state.quoteData),
    metadata: safeStringify({
      currentStep: state.currentStep,
      stateVersion: state.stateVersion || '1.0',
      lastUpdated: new Date().toISOString(),
      originalMetadata: state.metadata
    })
  };
}

/**
 * Deserializes Order Builder state from database storage
 */
export function deserializeOrderBuilderState(serializedState: {
  capStyleSetup: string | null;
  customization: string | null;
  delivery: string | null;
  costBreakdown: string | null;
  productionTimeline: string | null;
  packaging: string | null;
  quoteData: string | null;
  metadata: string | null;
}): OrderBuilderState {
  const safeParse = (jsonString: string | null): any => {
    if (!jsonString) return undefined;
    try {
      return JSON.parse(jsonString);
    } catch (error) {
      console.error('Failed to parse state component:', error);
      return undefined;
    }
  };

  const parsedMetadata = safeParse(serializedState.metadata);

  return {
    capStyleSetup: safeParse(serializedState.capStyleSetup),
    customization: safeParse(serializedState.customization),
    delivery: safeParse(serializedState.delivery),
    costBreakdown: safeParse(serializedState.costBreakdown),
    productionTimeline: safeParse(serializedState.productionTimeline),
    packaging: safeParse(serializedState.packaging),
    quoteData: safeParse(serializedState.quoteData),
    currentStep: parsedMetadata?.currentStep || 'setup',
    stateVersion: parsedMetadata?.stateVersion || '1.0',
    lastUpdated: parsedMetadata?.lastUpdated,
    metadata: parsedMetadata?.originalMetadata
  };
}

/**
 * Extracts key information for conversation title generation
 */
export function extractStateForTitleGeneration(state: OrderBuilderState): {
  quantity?: number;
  capStyle?: string;
  logoCount?: number;
  totalCost?: number;
  urgency?: string;
  customerName?: string;
  company?: string;
} {
  return {
    quantity: state.capStyleSetup?.quantity,
    capStyle: state.capStyleSetup?.style,
    logoCount: state.customization?.logoDetails?.length || 0,
    totalCost: state.costBreakdown?.total,
    urgency: state.delivery?.urgency,
    customerName: state.quoteData?.customerInfo?.name,
    company: state.quoteData?.customerInfo?.company
  };
}

/**
 * Calculates state completion percentage
 */
export function calculateStateCompleteness(state: OrderBuilderState): {
  percentage: number;
  completedSections: string[];
  missingSections: string[];
} {
  const sections = [
    { name: 'Cap Style Setup', key: 'capStyleSetup', required: ['style', 'quantity'] },
    { name: 'Customization', key: 'customization', required: ['logoDetails'] },
    { name: 'Delivery', key: 'delivery', required: ['method'] },
    { name: 'Cost Breakdown', key: 'costBreakdown', required: ['total'] },
    { name: 'Production Timeline', key: 'productionTimeline', required: ['totalTime'] },
    { name: 'Quote Data', key: 'quoteData', required: ['status'] }
  ];

  const completedSections: string[] = [];
  const missingSections: string[] = [];

  sections.forEach(section => {
    const sectionData = state[section.key as keyof OrderBuilderState];
    if (sectionData && typeof sectionData === 'object') {
      const hasRequiredFields = section.required.every(field => 
        (sectionData as any)[field] !== undefined && (sectionData as any)[field] !== null
      );
      if (hasRequiredFields) {
        completedSections.push(section.name);
      } else {
        missingSections.push(section.name);
      }
    } else {
      missingSections.push(section.name);
    }
  });

  const percentage = Math.round((completedSections.length / sections.length) * 100);

  return {
    percentage,
    completedSections,
    missingSections
  };
}

/**
 * Creates a state snapshot for comparison and rollback
 */
export function createStateSnapshot(state: OrderBuilderState): {
  timestamp: string;
  stateHash: string;
  snapshot: OrderBuilderState;
} {
  const timestamp = new Date().toISOString();
  
  // Create a deep copy to avoid mutations
  const snapshot = JSON.parse(JSON.stringify(state));
  
  // Generate a simple hash for comparison
  const stateHash = btoa(JSON.stringify(snapshot)).slice(0, 16);

  return {
    timestamp,
    stateHash,
    snapshot
  };
}

/**
 * Compares two states and returns differences
 */
export function compareStates(oldState: OrderBuilderState, newState: OrderBuilderState): {
  hasChanges: boolean;
  changedSections: string[];
  changes: Record<string, any>;
} {
  const sections = ['capStyleSetup', 'customization', 'delivery', 'costBreakdown', 'productionTimeline', 'packaging', 'quoteData'];
  
  const changedSections: string[] = [];
  const changes: Record<string, any> = {};
  
  sections.forEach(section => {
    const oldValue = oldState[section as keyof OrderBuilderState];
    const newValue = newState[section as keyof OrderBuilderState];
    
    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      changedSections.push(section);
      changes[section] = {
        old: oldValue,
        new: newValue
      };
    }
  });

  return {
    hasChanges: changedSections.length > 0,
    changedSections,
    changes
  };
}