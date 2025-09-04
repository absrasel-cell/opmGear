import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-helpers';
import prisma from '@/lib/prisma';

interface OrderCreationData {
 productName: string;
 priceTier: string;
 quantity: number;
 customizations: {
  logos?: Array<{
   type: string;
   size: string;
   positions: string[];
   description?: string;
  }>;
  accessories?: string[];
  services?: string[];
  shipping?: {
   method: string;
   destination?: string;
  };
  colors?: {
   primary?: string;
   secondary?: string;
   tertiary?: string;
   stitching?: string;
  };
 };
 specialInstructions?: string;
 estimatedCost: number;
 isQuoteRequest?: boolean;
}

export async function POST(request: NextRequest) {
 try {
  const user = await getCurrentUser(request);
  
  if (!user) {
   return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const orderData: OrderCreationData = await request.json();

  // Validate required fields
  if (!orderData.productName || !orderData.quantity) {
   return NextResponse.json(
    { error: 'Product name and quantity are required' },
    { status: 400 }
   );
  }

  // Check minimum quantity for regular orders
  if (!orderData.isQuoteRequest && orderData.quantity < 48) {
   return NextResponse.json(
    { error: 'Minimum order quantity is 48 units. Consider submitting as a quote request for smaller quantities.' },
    { status: 400 }
   );
  }

  // Generate order configuration
  const orderConfiguration = {
   productName: orderData.productName,
   priceTier: orderData.priceTier || 'Tier 2',
   customizations: orderData.customizations,
   isQuoteRequest: orderData.isQuoteRequest || false,
   estimatedLeadTime: '7-14 business days',
   createdVia: 'AI Assistant'
  };

  // Generate product details string
  const productDetails = `${orderData.productName} - ${orderData.priceTier || 'Tier 2'}\n` +
   `Quantity: ${orderData.quantity}\n` +
   (orderData.customizations.logos ? 
    `Logos: ${orderData.customizations.logos.map(l => `${l.type} ${l.size} on ${l.positions.join(', ')}`).join('; ')}\n` : '') +
   (orderData.customizations.accessories?.length ? 
    `Accessories: ${orderData.customizations.accessories.join(', ')}\n` : '') +
   (orderData.customizations.services?.length ? 
    `Services: ${orderData.customizations.services.join(', ')}\n` : '') +
   (orderData.customizations.colors ? 
    `Colors: ${Object.entries(orderData.customizations.colors).filter(([_, v]) => v).map(([k, v]) => `${k}: ${v}`).join(', ')}\n` : '') +
   (orderData.specialInstructions ? `Special Instructions: ${orderData.specialInstructions}` : '');

  // Create the order/quote
  const newOrder = await prisma.order.create({
   data: {
    userId: user.id,
    productName: orderData.productName,
    productDetails: productDetails,
    totalUnits: orderData.quantity,
    calculatedTotal: orderData.estimatedCost,
    priceTier: orderData.priceTier || 'Tier 2',
    status: orderData.isQuoteRequest ? 'PENDING' : 'PENDING',
    orderConfiguration: JSON.stringify(orderConfiguration),
    specialInstructions: orderData.specialInstructions || null,
    createdAt: new Date(),
    updatedAt: new Date(),
   }
  });

  // If it's a quote request, also create a quote record
  if (orderData.isQuoteRequest) {
   await prisma.quote.create({
    data: {
     userId: user.id,
     orderId: newOrder.id,
     productName: orderData.productName,
     quantity: orderData.quantity,
     specifications: productDetails,
     estimatedPrice: orderData.estimatedCost,
     status: 'PENDING',
     priority: 'NORMAL',
     requestedDeliveryDate: null,
     createdAt: new Date(),
     updatedAt: new Date(),
    }
   });
  }

  return NextResponse.json({
   success: true,
   order: {
    id: newOrder.id,
    productName: newOrder.productName,
    quantity: newOrder.totalUnits,
    estimatedCost: newOrder.calculatedTotal,
    status: newOrder.status,
    type: orderData.isQuoteRequest ? 'Quote Request' : 'Order',
    createdAt: newOrder.createdAt,
   },
   message: orderData.isQuoteRequest 
    ? 'Quote request submitted successfully! Our team will review and provide a detailed quote within 24 hours.'
    : 'Order created successfully! You will receive a confirmation email shortly.',
   nextSteps: orderData.isQuoteRequest
    ? [
      'Our team will review your specifications',
      'You\'ll receive a detailed quote within 24 hours',
      'Upon approval, we\'ll convert this to a production order'
     ]
    : [
      'Order confirmation email will be sent',
      'Design proof will be created for approval',
      'Production begins after design approval',
      'Estimated delivery: 7-14 business days'
     ]
  });

 } catch (error) {
  console.error('Internal API Error - Order Creation:', error);
  return NextResponse.json(
   { error: 'Failed to create order' },
   { status: 500 }
  );
 }
}