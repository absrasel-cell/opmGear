'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthContext';
import { Send, ShoppingCart, User, Bot, DollarSign, Package, Calculator, Zap, Sparkles, Trash2, RefreshCw } from 'lucide-react';
import SharedLogoUploader from '@/components/ui/SharedLogoUploader';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  typing?: boolean;
}

export default function OrderPage() {
  const { user } = useAuth();
  const router = useRouter();
  
  // Core conversation state
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Order-specific state
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);
  const [showUploader, setShowUploader] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');
  
  // Order confirmation button state
  const [showOrderButton, setShowOrderButton] = useState(false);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [latestQuoteData, setLatestQuoteData] = useState<any>(null);
  
  // Conversation context for order continuity
  const [conversationContext, setConversationContext] = useState<any>({});
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isDeletingHistory, setIsDeletingHistory] = useState(false);
  
  // CSV-based pricing data
  const [pricingData, setPricingData] = useState<any>(null);
  const [isLoadingPricing, setIsLoadingPricing] = useState(true);
  const [csvError, setCsvError] = useState<string>('');

  // Generate conversion-focused initial message
  const getInitialMessage = (): Message => ({
    id: 'initial',
    content: `🛒 **Welcome to US Custom Cap Orders!**

I'm your dedicated order assistant, designed to get you maximum value for your budget.

**Quick Order Examples:**
• "200 caps with 3D logo for $800"
• "Maximum caps possible with $1000 budget"  
• "100 black caps, embroidered logo"

**What I'll help you with:**
✅ Budget optimization (get the most caps for your money)
✅ Tier-based pricing (volume discounts)
✅ Logo setup recommendations
✅ Order finalization and quotes

Ready to place your order? Tell me your requirements!`,
    sender: 'ai',
    timestamp: new Date(),
  });

  // Load conversation history on mount
  useEffect(() => {
    if (user?.id) {
      loadConversationHistory();
    } else {
      setMessages([getInitialMessage()]);
    }
  }, [user?.id]);

  // Load existing conversation history
  const loadConversationHistory = async () => {
    if (!user?.id) {
      setMessages([getInitialMessage()]);
      return;
    }

    setIsLoadingHistory(true);
    try {
      console.log('🧠 [ORDER-PAGE] Loading conversation history for user:', user.id);
      
      const response = await fetch('/api/order-ai/history', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ [ORDER-PAGE] Loaded conversation:', data.conversationId, 'with', data.messages.length, 'messages');
        
        if (data.messages.length > 0) {
          // Convert database messages to UI messages
          const historyMessages: Message[] = data.messages.map((msg: any) => ({
            id: msg.id,
            content: msg.content,
            sender: msg.role === 'USER' ? 'user' : 'ai',
            timestamp: new Date(msg.createdAt)
          }));
          
          setMessages(historyMessages);
          setConversationId(data.conversationId);
        } else {
          setMessages([getInitialMessage()]);
        }
      } else {
        console.warn('⚠️ [ORDER-PAGE] No conversation history found, starting fresh');
        setMessages([getInitialMessage()]);
      }
    } catch (error) {
      console.error('❌ [ORDER-PAGE] Failed to load conversation history:', error);
      setMessages([getInitialMessage()]);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Delete conversation history
  const deleteConversationHistory = async () => {
    if (!user?.id || !conversationId) {
      console.log('🗑️ [ORDER-PAGE] No conversation to delete');
      return;
    }

    const confirmDelete = window.confirm('Are you sure you want to clear your conversation history? This action cannot be undone.');
    if (!confirmDelete) return;

    setIsDeletingHistory(true);
    try {
      console.log('🗑️ [ORDER-PAGE] Deleting conversation:', conversationId);
      
      const response = await fetch('/api/order-ai/history', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ conversationId })
      });

      if (response.ok) {
        console.log('✅ [ORDER-PAGE] Conversation deleted successfully');
        setMessages([getInitialMessage()]);
        setConversationId(null);
        setConversationContext({});
      } else {
        console.error('❌ [ORDER-PAGE] Failed to delete conversation');
        alert('Failed to delete conversation history. Please try again.');
      }
    } catch (error) {
      console.error('❌ [ORDER-PAGE] Error deleting conversation:', error);
      alert('Error deleting conversation history. Please try again.');
    } finally {
      setIsDeletingHistory(false);
    }
  };

  // Load CSV pricing data
  useEffect(() => {
    async function loadPricingData() {
      try {
        console.log('📊 [ORDER-PAGE] Loading CSV pricing data');
        const response = await fetch('/api/order-ai/products');
        if (response.ok) {
          const data = await response.json();
          setPricingData(data);
          setCsvError('');
          console.log(`✅ [ORDER-PAGE] Loaded ${data.products.length} products with CSV pricing`);
          console.log('📊 [ORDER-PAGE] Product summary:', data.summary);
        } else {
          const errorText = await response.text();
          setCsvError(`Failed to load product data: ${response.status}`);
          console.error('❌ [ORDER-PAGE] Failed to load CSV pricing data:', errorText);
        }
      } catch (error) {
        setCsvError(`Error loading product data: ${error instanceof Error ? error.message : 'Unknown error'}`);
        console.error('❌ [ORDER-PAGE] Error loading CSV pricing data:', error);
      } finally {
        setIsLoadingPricing(false);
      }
    }

    loadPricingData();
  }, []);

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  };

  // Detect if AI response contains a complete order quote and extract data
  const detectOrderQuote = (aiResponse: string): boolean => {
    const response = aiResponse || '';
    
    // Look for complete quote patterns
    const quotePatterns = [
      /Total Cost:\s*\*?\*?\$\d+/i,
      /total of \*?\*?\$\d+/i,
      /Base Product.*\$\d+/i,
      /Logo Setup.*\$\d+/i,
      /Delivery.*\$\d+/i,
      /\$\d+\.\d{2}.*per cap/i,
      /\$\d+\.\d{2}.*for all \d+ caps/i
    ];
    
    // Check for recent ordering keywords in conversation or current response
    const orderKeywords = [
      /place order/i,
      /create order/i,
      /proceed.*order/i,
      /finalize.*order/i,
      /ready.*order/i,
      /confirm/i,
      /let's do it/i,
      /all good/i,
      /go ahead/i
    ];
    
    const hasQuotePattern = quotePatterns.some(pattern => pattern.test(response));
    const hasOrderKeyword = orderKeywords.some(pattern => pattern.test(response)) ||
      messages.slice(-3).some(msg => orderKeywords.some(pattern => pattern.test(msg.content)));
    
    return hasQuotePattern && hasOrderKeyword;
  };
  
  // Extract quote data from AI response for order creation
  const extractQuoteData = (aiResponse: string, userMessage: string): any => {
    const response = aiResponse || '';
    
    // Extract total cost (handle multiple formats)
    const totalCostMatch = response.match(/Total Cost:\s*\*?\*?\$(\d+(?:,\d{3})*(?:\.\d{2})?)/i) ||
                          response.match(/total of \*?\*?\$(\d+(?:,\d{3})*(?:\.\d{2})?)/i) ||
                          response.match(/\*?\*?\$(\d+(?:,\d{3})*(?:\.\d{2})?)\*?\*?.*which breaks down/i);
    const totalCost = totalCostMatch ? parseFloat(totalCostMatch[1].replace(/,/g, '')) : null;
    
    // Extract quantity
    const quantityMatch = response.match(/(\d+)\s*(?:caps?|pieces?)/i) ||
                         userMessage.match(/(\d+)\s*(?:caps?|pieces?)/i);
    const quantity = quantityMatch ? parseInt(quantityMatch[1]) : null;
    
    // Extract color information
    const colorMatch = response.match(/(black|white|red|blue|navy|brown|green|gray|grey|yellow|orange|purple|pink)/i) ||
                      userMessage.match(/(black|white|red|blue|navy|brown|green|gray|grey|yellow|orange|purple|pink)/i);
    const color = colorMatch ? colorMatch[1] : 'Brown';
    
    // Extract logo type
    const logoTypeMatch = response.match(/(3D embroidery|embroidery|sublimated print|heat transfer)/i);
    const logoType = logoTypeMatch ? logoTypeMatch[1] : 'Embroidery';
    
    return {
      quantity: quantity || 150,
      color,
      logoType,
      totalCost,
      requirements: {
        quantity: quantity || 150,
        color,
        logoType
      },
      costBreakdown: {
        totalCost
      },
      originalResponse: response,
      extractedAt: new Date().toISOString()
    };
  };

  // Detect order completion and extract order ID from AI response
  const detectOrderCompletion = (aiResponse: string): { isOrderCompleted: boolean; orderId?: string } => {
    const response = aiResponse || '';
    
    // Check for order completion indicators
    const orderCompletionPatterns = [
      /Order Created Successfully/i,
      /🎉.*Order Created/i,
      /Order Reference:/i
    ];
    
    const isOrderCompleted = orderCompletionPatterns.some(pattern => pattern.test(response));
    
    if (isOrderCompleted) {
      // Extract order ID from receipt link pattern: /checkout/success?orderId=${orderId}
      const orderIdMatch = response.match(/\/checkout\/success\?orderId=([a-zA-Z0-9-_]+)/);
      if (orderIdMatch && orderIdMatch[1]) {
        console.log('✅ [ORDER-PAGE] Order completion detected with orderId:', orderIdMatch[1]);
        return { isOrderCompleted: true, orderId: orderIdMatch[1] };
      }
      
      // Fallback: Look for any order reference patterns
      const orderRefMatch = response.match(/Order Reference:\s*([A-Z0-9-]+)/i);
      if (orderRefMatch && orderRefMatch[1]) {
        console.log('⚠️ [ORDER-PAGE] Order completion detected with orderRef:', orderRefMatch[1]);
        // Note: This won't redirect since we need the actual database orderId
        return { isOrderCompleted: true };
      }
      
      console.log('⚠️ [ORDER-PAGE] Order completion detected but no orderId found in response');
      return { isOrderCompleted: true };
    }
    
    return { isOrderCompleted: false };
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleLogoUploadComplete = (files: any[]) => {
    console.log('✅ Logo files uploaded for order:', files);
    setUploadedFiles(files);
    setUploadError('');
    setUploadSuccess(`${files.length} logo file(s) ready for order!`);
    setTimeout(() => setUploadSuccess(''), 3000);
  };

  const handleLogoUploadError = (error: string) => {
    console.error('❌ Logo upload error:', error);
    setUploadError(error);
    setUploadSuccess('');
    setTimeout(() => setUploadError(''), 5000);
  };

  // Handle order confirmation button click
  const confirmOrderSubmission = async () => {
    if (!latestQuoteData || isCreatingOrder) return;
    
    setIsCreatingOrder(true);
    
    // Add confirmation message to chat
    const confirmMessage: Message = {
      id: Date.now().toString(),
      content: 'Confirm Order Submission - Create my actual order with the specifications above',
      sender: 'user',
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, confirmMessage]);
    
    // Add processing indicator
    const processingMessage: Message = {
      id: 'order-processing',
      content: '🔄 Processing your order submission...',
      sender: 'ai',
      timestamp: new Date(),
      typing: true,
    };
    setMessages(prev => [...prev, processingMessage]);
    
    try {
      const response = await fetch('/api/order-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: 'Confirm Order Submission - Create my actual order with the specifications above',
          context: 'order-conversion',
          conversationId: conversationId,
          uploadedFiles: uploadedFiles.length > 0 ? uploadedFiles : undefined,
          conversationContext: conversationContext,
          forceOrderCreation: true, // Special flag to force real order creation
          quoteData: latestQuoteData, // Include the quote data for reference
        }),
      });
      
      const data = await response.json();
      
      // Update conversation context
      if (data.conversationContext) {
        setConversationContext(data.conversationContext);
      }
      
      if (data.conversationId) {
        setConversationId(data.conversationId);
      }
      
      const aiResponse = data.response || "I'm having trouble processing your order. Please try again or contact support.";
      
      // Check for order completion
      const orderCompletion = detectOrderCompletion(aiResponse);
      
      // Remove processing message and add final response
      setMessages(prev => {
        const filtered = prev.filter(msg => msg.id !== 'order-processing');
        return [
          ...filtered,
          {
            id: Date.now().toString(),
            content: aiResponse,
            sender: 'ai',
            timestamp: new Date(),
          }
        ];
      });
      
      // Hide order button after submission attempt
      setShowOrderButton(false);
      setLatestQuoteData(null);
      
      // Handle automatic redirection for completed orders
      if (orderCompletion.isOrderCompleted && orderCompletion.orderId) {
        console.log('🚀 [ORDER-PAGE] Order created, redirecting to receipt:', orderCompletion.orderId);
        
        setTimeout(() => {
          router.push(`/checkout/success?orderId=${orderCompletion.orderId}`);
        }, 2000);
      }
      
    } catch (error) {
      console.error('❌ Order confirmation error:', error);
      
      // Remove processing message and show error
      setMessages(prev => {
        const filtered = prev.filter(msg => msg.id !== 'order-processing');
        return [
          ...filtered,
          {
            id: Date.now().toString(),
            content: "❌ There was an error processing your order. Please try again or contact our support team at orders@uscustomcap.com",
            sender: 'ai',
            timestamp: new Date(),
          }
        ];
      });
      
      // Hide button on error
      setShowOrderButton(false);
      setLatestQuoteData(null);
    } finally {
      setIsCreatingOrder(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input.trim(),
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Add typing indicator
    const typingMessage: Message = {
      id: 'typing',
      content: 'Optimizing your order...',
      sender: 'ai',
      timestamp: new Date(),
      typing: true,
    };
    setMessages(prev => [...prev, typingMessage]);

    try {
      const response = await fetch('/api/order-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: input.trim(),
          context: 'order-conversion',
          conversationId: conversationId,
          uploadedFiles: uploadedFiles.length > 0 ? uploadedFiles : undefined,
          conversationContext: conversationContext,
        }),
      });

      const data = await response.json();

      // Update conversation context from API response
      if (data.conversationContext) {
        setConversationContext(data.conversationContext);
      }

      // Update conversation ID from API response
      if (data.conversationId) {
        setConversationId(data.conversationId);
      }

      const aiResponse = data.response || "I'm having trouble processing your order right now. Could you please try again with your budget and quantity? For example: 'I need 200 caps for $800'";
      
      // Check for order completion and handle automatic redirection
      const orderCompletion = detectOrderCompletion(aiResponse);
      
      // Remove typing indicator and add AI response
      setMessages(prev => {
        const filtered = prev.filter(msg => msg.id !== 'typing');
        return [
          ...filtered,
          {
            id: Date.now().toString(),
            content: aiResponse,
            sender: 'ai',
            timestamp: new Date(),
          }
        ];
      });
      
      // Check if this response contains a quote and show order button
      const isQuote = detectOrderQuote(aiResponse);
      if (isQuote && !orderCompletion.isOrderCompleted) {
        console.log('📋 Quote detected, showing order confirmation button');
        const extractedQuoteData = extractQuoteData(aiResponse, input.trim());
        setShowOrderButton(true);
        setLatestQuoteData({
          ...extractedQuoteData,
          aiResponse,
          conversationContext,
          timestamp: new Date(),
          userMessage: input.trim()
        });
        console.log('📊 Extracted quote data:', extractedQuoteData);
      } else if (orderCompletion.isOrderCompleted) {
        // Hide button if order was completed
        setShowOrderButton(false);
        setLatestQuoteData(null);
      }

      // Handle automatic redirection for completed orders
      if (orderCompletion.isOrderCompleted && orderCompletion.orderId) {
        console.log('🚀 [ORDER-PAGE] Redirecting to receipt page for order:', orderCompletion.orderId);
        
        // Add a brief notification about the upcoming redirect
        setTimeout(() => {
          const redirectMessage: Message = {
            id: 'redirect-notification',
            content: '🚀 **Taking you to your order receipt...** \n\nRedirecting to your order details page automatically.',
            sender: 'ai',
            timestamp: new Date(),
            typing: true, // Show as "loading" style
          };
          
          setMessages(prev => [...prev, redirectMessage]);
          
          // Redirect to receipt page after showing the notification
          setTimeout(() => {
            try {
              router.push(`/checkout/success?orderId=${orderCompletion.orderId}`);
            } catch (redirectError) {
              console.error('❌ [ORDER-PAGE] Redirect failed:', redirectError);
              // Update message to show manual link if redirect fails
              setMessages(prev => prev.map(msg => 
                msg.id === 'redirect-notification' 
                  ? { ...msg, content: '⚠️ **Automatic redirect failed.** \n\n🧾 **[Click here to view your order receipt →](/checkout/success?orderId=' + orderCompletion.orderId + ')**', typing: false }
                  : msg
              ));
            }
          }, 2000);
        }, 1000);
      } else if (orderCompletion.isOrderCompleted) {
        console.log('ℹ️ [ORDER-PAGE] Order completed but no orderId found - showing message without redirect');
      }
    } catch (error) {
      console.error('Order AI error:', error);
      setMessages(prev => {
        const filtered = prev.filter(msg => msg.id !== 'typing');
        return [
          ...filtered,
          {
            id: Date.now().toString(),
            content: "I'm experiencing technical difficulties with order processing. Please try again or contact our order team at orders@uscustomcap.com for immediate assistance.",
            sender: 'ai',
            timestamp: new Date(),
          }
        ];
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Dynamic quick actions based on CSV data
  const getQuickOrderActions = () => {
    const baseActions = [
      { text: "Get quote for 100 caps", icon: "💰", description: "Quick pricing for 100 units" },
      { text: "Maximum caps for $500", icon: "📈", description: "Budget optimization" },
      { text: "200 caps with 3D embroidery", icon: "🎨", description: "Popular configuration" },
      { text: "Upload logo and finalize", icon: "✅", description: "Complete your order" },
    ];

    // Add CSV-based suggestions if data is available
    if (pricingData?.summary) {
      const csvActions = [
        { 
          text: `${pricingData.summary.profiles[0] || 'High'} profile caps for $800`, 
          icon: "🧢", 
          description: `Popular ${pricingData.summary.profiles[0] || 'High'} crown option` 
        },
        { 
          text: `${pricingData.summary.panelCounts[0] || '5-Panel'} caps with Tier 1 pricing`, 
          icon: "🔄", 
          description: `${pricingData.summary.panelCounts[0] || '5-Panel'} construction style` 
        },
      ];
      return [...baseActions.slice(0, 2), ...csvActions, ...baseActions.slice(2)];
    }
    
    return [
      ...baseActions,
      { text: "Custom logo pricing", icon: "🏷️", description: "Logo setup costs" },
      { text: "Volume discount pricing", icon: "📦", description: "Bulk order savings" },
    ];
  };

  const quickOrderActions = getQuickOrderActions();

  return (
    <div className="min-h-screen bg-[#07070b] text-white">
      {/* Background effects */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-lime-500/5 via-transparent to-orange-500/5"></div>
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-lime-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Header - Order Focused */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-lime-500/20 to-orange-500/20 rounded-2xl mb-4 backdrop-blur-sm border border-lime-500/30">
            <ShoppingCart className="w-8 h-8 text-lime-400" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-lime-400 via-white to-orange-400 bg-clip-text text-transparent mb-2">
            Place Your Order
          </h1>
          <p className="text-gray-400 text-lg">
            Get maximum caps for your budget with AI-optimized pricing
          </p>
        </div>

        <div className="max-w-[2100px] mx-auto">
          <div className="grid lg:grid-cols-4 gap-6">
            
            {/* Sidebar - Order Actions */}
            <div className="lg:col-span-1 space-y-6">
              
              {/* Quick Order Actions */}
              <div className="bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/10 min-w-[320px]">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-lime-400" />
                  Quick Order Actions
                </h3>
                <div className="space-y-2">
                  {quickOrderActions.map((action, index) => (
                    <button
                      key={index}
                      onClick={() => setInput(action.text)}
                      className="w-full text-left p-3 rounded-lg bg-white/5 hover:bg-lime-500/10 transition-all duration-200 border border-white/10 hover:border-lime-500/30 group"
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-lg flex-shrink-0">{action.icon}</span>
                        <div>
                          <div className="text-gray-200 group-hover:text-white font-medium">{action.text}</div>
                          <div className="text-xs text-gray-400 group-hover:text-gray-300">{action.description}</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Product Catalog Info */}
              {pricingData?.summary && (
                <div className="bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/10 min-w-[320px]">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Package className="w-5 h-5 text-lime-400" />
                    Available Products
                  </h3>
                  <div className="space-y-3 text-sm">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-lime-500/10 rounded-lg p-3 border border-lime-500/20">
                        <div className="text-lime-400 font-medium text-lg">{pricingData.summary.totalProducts}</div>
                        <div className="text-gray-300 text-xs">Total Products</div>
                      </div>
                      <div className="bg-orange-500/10 rounded-lg p-3 border border-orange-500/20">
                        <div className="text-orange-400 font-medium text-lg">{pricingData.summary.availableTiers.length}</div>
                        <div className="text-gray-300 text-xs">Price Tiers</div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="text-gray-300 font-medium text-xs">Cap Profiles Available:</div>
                      <div className="flex flex-wrap gap-1">
                        {pricingData.summary.profiles.slice(0, 3).map((profile: string) => (
                          <span key={profile} className="bg-white/10 text-gray-300 px-2 py-1 rounded text-xs">
                            {profile}
                          </span>
                        ))}
                        {pricingData.summary.profiles.length > 3 && (
                          <span className="text-gray-400 text-xs">+{pricingData.summary.profiles.length - 3} more</span>
                        )}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="text-gray-300 font-medium text-xs">Panel Options:</div>
                      <div className="flex flex-wrap gap-1">
                        {pricingData.summary.panelCounts.map((panel: string) => (
                          <span key={panel} className="bg-lime-500/10 text-lime-400 px-2 py-1 rounded text-xs border border-lime-500/20">
                            {panel}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Order Benefits */}
              <div className="bg-gradient-to-br from-lime-500/10 to-orange-500/10 backdrop-blur-md rounded-2xl p-6 border border-lime-500/20">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-orange-400" />
                  Order Benefits
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Calculator className="w-4 h-4 text-lime-400" />
                    <span className="text-gray-200">AI Budget Optimization</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-orange-400" />
                    <span className="text-gray-200">Volume Discount Pricing</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-lime-400" />
                    <span className="text-gray-200">Instant Quote Generation</span>
                  </div>
                  <div className="pt-3 border-t border-white/10">
                    {isLoadingPricing ? (
                      <div className="animate-pulse">
                        <div className="h-4 bg-gray-600 rounded mb-2"></div>
                        <div className="h-3 bg-gray-700 rounded w-3/4"></div>
                      </div>
                    ) : csvError ? (
                      <div className="text-red-400 text-sm">
                        <div className="flex items-center gap-2 mb-2">
                          <span>⚠️</span>
                          <span>CSV Data Error</span>
                        </div>
                        <p className="text-xs text-red-300">{csvError}</p>
                        <p className="text-gray-400 text-xs mt-2">Using fallback pricing: $2.84-$3.60 per cap</p>
                      </div>
                    ) : pricingData?.pricing ? (
                      <>
                        <p className="text-gray-300 font-medium">
                          Tier 1 Pricing: ${pricingData.pricing['Tier 1']?.price144?.toFixed(2) || '3.00'}-${pricingData.pricing['Tier 1']?.price48?.toFixed(2) || '3.60'} per cap
                        </p>
                        <p className="text-gray-400 text-xs">
                          Volume discounts: 144+ caps (${pricingData.pricing['Tier 1']?.price144?.toFixed(2)}) → 576+ caps (${pricingData.pricing['Tier 1']?.price576?.toFixed(2)})
                        </p>
                        <p className="text-gray-400 text-xs mt-1">
                          {pricingData.summary?.totalProducts || 0} blank cap options available
                        </p>
                        <div className="mt-2 p-2 bg-lime-500/10 rounded-lg border border-lime-500/20">
                          <p className="text-xs text-lime-400 font-medium">📊 CSV Data Loaded Successfully</p>
                          <p className="text-xs text-gray-400">
                            {pricingData.summary?.availableTiers?.length || 0} pricing tiers • {pricingData.summary?.profiles?.length || 0} cap profiles
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <p className="text-gray-300 font-medium">Tier 1 Pricing: $2.84-$3.60 per cap</p>
                        <p className="text-gray-400 text-xs">Volume discounts start at 144+ caps</p>
                        <p className="text-orange-400 text-xs mt-1">⚠️ CSV data not loaded, using fallback pricing</p>
                      </>
                    )}
                  </div>
                </div>
              </div>

            </div>

            {/* Chat Interface - Order Focused */}
            <div className="lg:col-span-3">
              <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 min-h-[calc(100vh-200px)] flex flex-col">
                
                {/* Chat Header - Order Theme */}
                <div className="p-6 border-b border-white/10 bg-gradient-to-r from-lime-500/10 to-orange-500/10 rounded-t-2xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-lime-500 to-orange-500 rounded-full flex items-center justify-center">
                        <Bot className="w-5 h-5 text-black" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-white">Order AI Assistant</h3>
                        <p className="text-sm text-gray-400">
                          {isLoadingHistory ? 'Loading conversation...' : 
                           conversationId ? `Conversation loaded • ${messages.length} messages` : 
                           'Optimizing orders • Fast quotes • Best pricing'}
                        </p>
                      </div>
                    </div>
                    
                    {/* Header Actions */}
                    <div className="flex items-center gap-3">
                      {/* Refresh History Button */}
                      {user?.id && (
                        <button
                          onClick={loadConversationHistory}
                          disabled={isLoadingHistory}
                          className="p-2 bg-white/10 hover:bg-lime-500/20 rounded-lg transition-all duration-200 disabled:opacity-50"
                          title="Refresh conversation history"
                        >
                          <RefreshCw className={`w-4 h-4 text-lime-400 ${isLoadingHistory ? 'animate-spin' : ''}`} />
                        </button>
                      )}
                      
                      {/* Delete Conversation Button */}
                      {user?.id && conversationId && (
                        <button
                          onClick={deleteConversationHistory}
                          disabled={isDeletingHistory}
                          className="p-2 bg-white/10 hover:bg-red-500/20 rounded-lg transition-all duration-200 disabled:opacity-50"
                          title="Clear conversation history"
                        >
                          <Trash2 className={`w-4 h-4 text-red-400 ${isDeletingHistory ? 'animate-pulse' : ''}`} />
                        </button>
                      )}
                      
                      {/* Order Status Indicator */}
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-lime-400 rounded-full animate-pulse"></div>
                        <span className="text-xs text-lime-400">Ready for Orders</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* History Status */}
                  {user?.id && (
                    <div className="mt-3 pt-3 border-t border-white/10">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-400">
                          {conversationId ? 
                            `Conversation ID: ${conversationId.slice(-8)}` : 
                            'New conversation will be created when you send a message'
                          }
                        </span>
                        {conversationId && (
                          <span className="text-lime-400">
                            History saved • {messages.length} messages
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {!user?.id && (
                    <div className="mt-3 pt-3 border-t border-white/10">
                      <div className="text-xs text-orange-400">
                        ⚠️ Not logged in - conversations will not be saved
                      </div>
                    </div>
                  )}
                </div>

                {/* Messages */}
                <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`flex items-start gap-2 max-w-[85%] ${message.sender === 'user' ? 'flex-row-reverse' : ''}`}>
                        
                        {/* Avatar */}
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                          message.sender === 'user' 
                            ? 'bg-gradient-to-r from-blue-500 to-purple-500' 
                            : 'bg-gradient-to-r from-lime-500 to-orange-500'
                        }`}>
                          {message.sender === 'user' ? (
                            <User className="w-4 h-4 text-white" />
                          ) : (
                            <ShoppingCart className="w-4 h-4 text-black" />
                          )}
                        </div>

                        {/* Message Bubble */}
                        <div className={`rounded-2xl px-4 py-3 ${
                          message.sender === 'user'
                            ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white'
                            : 'bg-white/10 backdrop-blur-sm text-white border border-white/20'
                        } ${message.typing ? 'animate-pulse' : ''}`}>
                          {message.typing ? (
                            <div className="flex items-center gap-1">
                              <div className="w-2 h-2 bg-lime-400 rounded-full animate-bounce"></div>
                              <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                              <div className="w-2 h-2 bg-lime-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                            </div>
                          ) : (
                            <div className="whitespace-pre-wrap">{message.content}</div>
                          )}
                          <div className={`text-xs mt-2 opacity-70 ${
                            message.sender === 'user' ? 'text-white/70' : 'text-gray-400'
                          }`}>
                            {formatTime(message.timestamp)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
                
                {/* Order Confirmation Button */}
                {showOrderButton && !isCreatingOrder && (
                  <div className="px-4 py-3 border-t border-white/10 bg-gradient-to-r from-lime-500/10 to-orange-500/10">
                    <div className="flex flex-col items-center space-y-3">
                      <div className="text-center">
                        <p className="text-sm text-gray-300 mb-1">
                          📋 Quote ready! Ready to create your actual order?
                        </p>
                        <p className="text-xs text-gray-400">
                          This will submit your order with the specifications above
                        </p>
                      </div>
                      
                      <button
                        onClick={confirmOrderSubmission}
                        disabled={isCreatingOrder}
                        className="group relative px-6 py-3 bg-gradient-to-r from-lime-500 to-orange-500 text-black font-semibold rounded-xl hover:from-lime-600 hover:to-orange-600 transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 shadow-lg"
                      >
                        <div className="flex items-center space-x-2">
                          🎆 <span>Confirm Order Submission</span>
                        </div>
                        
                        {/* Animated border effect */}
                        <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-lime-400 to-orange-400 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
                      </button>
                      
                      <div className="flex items-center space-x-4 text-xs text-gray-400">
                        <div className="flex items-center space-x-1">
                          <div className="w-2 h-2 bg-lime-400 rounded-full"></div>
                          <span>Real order creation</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                          <span>Instant processing</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Order Processing Indicator */}
                {isCreatingOrder && (
                  <div className="px-4 py-3 border-t border-white/10 bg-gradient-to-r from-lime-500/20 to-orange-500/20">
                    <div className="flex flex-col items-center space-y-2">
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-lime-400 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-lime-400 font-medium">Creating your order...</span>
                      </div>
                      <p className="text-xs text-gray-400 text-center">
                        Processing your order with the exact specifications discussed above
                      </p>
                    </div>
                  </div>
                )}

                {/* Input Section - Order Focused */}
                <div className="p-4 border-t border-white/10 bg-white/5">
                  
                  {/* Logo Upload Button */}
                  <div className="flex items-center space-x-2 mb-3">
                    <button
                      onClick={() => setShowUploader(!showUploader)}
                      className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                        showUploader
                          ? 'bg-lime-500/20 text-lime-400 border border-lime-500/30'
                          : 'bg-white/10 text-white/80 border border-white/20 hover:bg-lime-500/10 hover:text-lime-400 hover:border-lime-500/30'
                      }`}
                    >
                      <Package className="w-4 h-4" />
                      <span>Upload Logo</span>
                      {uploadedFiles.length > 0 && (
                        <span className="bg-lime-500 text-black rounded-full text-xs px-2 py-0.5 min-w-[20px] h-5 flex items-center justify-center">
                          {uploadedFiles.length}
                        </span>
                      )}
                    </button>
                    
                    {/* Quick Budget Buttons */}
                    {['$500', '$1000', '$1500'].map((budget) => (
                      <button
                        key={budget}
                        onClick={() => setInput(`Maximum caps for ${budget} budget`)}
                        className="px-3 py-2 text-xs bg-orange-500/20 text-orange-400 rounded-lg border border-orange-500/30 hover:bg-orange-500/30 transition-all duration-200"
                      >
                        {budget}
                      </button>
                    ))}
                  </div>
                  
                  <div className="flex items-end gap-3">
                    <div className="flex-1 relative">
                      <input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="e.g., '200 caps with 3D logo for $800' or 'Maximum caps for $1000'"
                        disabled={isLoading}
                        className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-lime-500 focus:border-lime-500 transition-all duration-200 disabled:opacity-50 text-white placeholder-gray-400"
                      />
                    </div>
                    <button
                      onClick={sendMessage}
                      disabled={!input.trim() || isLoading}
                      className="p-3 bg-gradient-to-r from-lime-500 to-orange-500 text-black rounded-xl hover:from-lime-600 hover:to-orange-600 focus:outline-none focus:ring-2 focus:ring-lime-500 focus:ring-offset-2 focus:ring-offset-[#07070b] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    Press Enter to send • AI-optimized order processing
                  </p>
                </div>

                {/* Logo Uploader Section */}
                {showUploader && (
                  <div className="p-4 border-t border-white/10 space-y-3 bg-white/5 rounded-b-2xl">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Package className="w-4 h-4 text-lime-400" />
                        <span className="text-sm font-medium text-white">Logo Upload for Order</span>
                      </div>
                      <button
                        onClick={() => {
                          setShowUploader(false);
                          setUploadedFiles([]);
                          setUploadError('');
                          setUploadSuccess('');
                        }}
                        className="text-white/60 hover:text-white text-sm"
                      >
                        ✕
                      </button>
                    </div>
                    
                    <SharedLogoUploader
                      onUploadComplete={handleLogoUploadComplete}
                      onError={handleLogoUploadError}
                      variant="order"
                      compact={true}
                    />
                    
                    {/* Upload Status Messages */}
                    {uploadSuccess && (
                      <div className="text-sm text-lime-400 bg-lime-500/20 p-3 rounded-lg border border-lime-500/30">
                        ✅ {uploadSuccess}
                      </div>
                    )}
                    
                    {uploadError && (
                      <div className="text-sm text-red-400 bg-red-500/20 p-3 rounded-lg border border-red-500/30">
                        ❌ {uploadError}
                      </div>
                    )}
                    
                    {uploadedFiles.length > 0 && (
                      <div className="text-sm text-lime-400 bg-lime-500/20 p-3 rounded-lg border border-lime-500/30">
                        📎 {uploadedFiles.length} file{uploadedFiles.length > 1 ? 's' : ''} ready for order processing
                      </div>
                    )}
                  </div>
                )}

              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}