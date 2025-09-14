// Support page shared types
export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  timestamp?: Date;
  attachments?: Attachment[];
  isLoading?: boolean;
  routingType?: 'order_builder' | 'general_inquiry' | 'quote_request' | 'order_status' | null;
  model?: string;
}

export interface Attachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
}

export interface Conversation {
  id: string;
  title: string;
  lastMessage?: string;
  lastMessageAt: Date;
  isActive?: boolean;
  messageCount: number;
  hasUnread?: boolean;
}

export interface OrderBuilderState {
  selectedProduct: string | null;
  quantity: number;
  selectedOptions: Record<string, any>;
  pricing: PricingInfo | null;
  isCalculating: boolean;
}

export interface OrderBuilderStatus {
  capStyle: {
    completed: boolean;
    status: 'green' | 'yellow' | 'red';
    items: {
      size: boolean;
      color: boolean;
      profile: boolean;
      shape: boolean;
      structure: boolean;
      fabric: boolean;
      stitch: boolean;
    };
  };
  customization: {
    completed: boolean;
    status: 'green' | 'yellow' | 'red';
    items: {
      logoSetup: boolean;
      accessories: boolean;
      moldCharges: boolean;
    };
    logoPositions: string[];
  };
  delivery: {
    completed: boolean;
    status: 'green' | 'yellow' | 'red';
    items: {
      method: boolean;
      leadTime: boolean;
      address: boolean;
    };
  };
  costBreakdown: {
    completed: boolean;
    status: 'green' | 'yellow' | 'red';
    selectedVersionId: string | null;
    versions: any[];
  };
}

export interface PricingInfo {
  basePrice: number;
  optionsPrice: number;
  totalPrice: number;
  discounts?: Discount[];
  breakdown: PriceBreakdown[];
}

export interface PriceBreakdown {
  item: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Discount {
  type: string;
  amount: number;
  description: string;
}

export interface QuoteRequest {
  id?: string;
  customerName: string;
  customerEmail: string;
  orderDetails: OrderBuilderState;
  additionalNotes?: string;
  status: 'pending' | 'quoted' | 'approved' | 'rejected';
  createdAt?: Date;
}

export interface SupportPageProps {
  initialConversationId?: string;
  initialMode?: 'chat' | 'order_builder';
}

export interface ChatInterfaceProps {
  messages: Message[];
  isLoading: boolean;
  onSendMessage: (content: string, attachments?: File[]) => Promise<void>;
  onRetry: (messageId: string) => void;
  typingIndicator: boolean;
}

export interface ConversationSidebarProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  isLoading: boolean;
}

export interface OrderBuilderProps {
  state: OrderBuilderState;
  onStateChange: (state: Partial<OrderBuilderState>) => void;
  onSubmitQuote: (quoteRequest: QuoteRequest) => Promise<void>;
  isSubmitting: boolean;
}

export interface MessageBubbleProps {
  message: Message;
  onRetry?: (messageId: string) => void;
  showTimestamp?: boolean;
}

export interface RoutingMessageProps {
  content: string;
  options: Array<{
    id: string;
    label: string;
    description?: string;
    action: () => void;
  }>;
}