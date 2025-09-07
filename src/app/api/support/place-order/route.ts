import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
// Removed Prisma - migrated to Supabase
import { nanoid } from 'nanoid';

export async function POST(request: NextRequest) {
 try {
  const { quoteData, conversationId, sessionId, userProfile, uploadedFiles = [] } = await request.json();

  if (!quoteData) {
   return NextResponse.json(
    { error: 'Quote data is required' },
    { status: 400 }
   );
  }

  // Get user from auth header
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader?.startsWith('Bearer ')) {
   return NextResponse.json(
    { error: 'Authentication required to place orders' },
    { status: 401 }
   );
  }

  const token = authHeader.split(' ')[1];
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  
  if (error || !user?.id) {
   return NextResponse.json(
    { error: 'Authentication required to place orders' },
    { status: 401 }
   );
  }

  // Generate unique order ID
  const orderId = `ORD-${nanoid(8).toUpperCase()}`;

  // Extract key information from quote data
  const { capDetails, customization, delivery, pricing } = quoteData;

  // Create order record in database using existing schema
  const order = await prisma.order.create({
   data: {
    id: orderId,
    userId: user.id,
    userEmail: user.email,
    
    // Order details
    productName: capDetails?.productName || 'Custom Cap',
    
    // Use existing fields that match the schema
    selectedColors: {
     colors: capDetails?.colors || [],
     profile: capDetails?.profile,
     fabric: capDetails?.fabric
    },
    logoSetupSelections: {
     logos: customization?.logos || []
    },
    selectedOptions: {
     billShape: capDetails?.billShape,
     structure: capDetails?.structure,
     closure: capDetails?.closure,
     sizes: capDetails?.sizes || []
    },
    multiSelectOptions: {
     accessories: customization?.accessories || [],
     delivery: delivery || {}
    },
    customerInfo: {
     email: userProfile?.email || user.email,
     name: userProfile?.name || user.user_metadata?.name,
     phone: userProfile?.phone,
     address: typeof userProfile?.address === 'string' ? userProfile.address : 
      (userProfile?.address ? `${userProfile.address.street || ''} ${userProfile.address.city || ''} ${userProfile.address.state || ''}`.trim() : null),
     company: userProfile?.company,
     userId: user.id
    },
    
    // Logo files from support chat
    uploadedLogoFiles: uploadedFiles.length > 0 ? uploadedFiles.map((url: string) => ({
     url: url,
     originalName: url.split('/').pop() || 'uploaded_file',
     fileType: url.includes('.pdf') ? 'application/pdf' : 'image',
     category: url.includes('.pdf') ? 'document' : 'logo',
     uploadSource: 'support_chat'
    })) : null,
    
    // Cost breakdown matching existing schema
    costBreakdown: {
     baseProductCost: pricing?.baseProductCost || 0,
     logosCost: pricing?.logosCost || 0,
     deliveryCost: pricing?.deliveryCost || 0,
     total: pricing?.total || 0,
     moldCharges: customization?.totalMoldCharges || 0
    },
    customerTotal: pricing?.total || 0,
    calculatedTotal: pricing?.total || 0,
    totalUnits: pricing?.quantity || 1,
    
    // Order metadata
    orderType: 'CUSTOM',
    orderSource: 'AI_SUPPORT',
    status: 'PENDING',
    marginApplied: true,
    lastCalculatedAt: new Date()
   }
  });

  // Update QuoteOrder to mark as converted
  const quoteOrder = await prisma.quoteOrder.findUnique({
   where: { sessionId: sessionId }
  });

  if (quoteOrder) {
   await prisma.quoteOrder.update({
    where: { id: quoteOrder.id },
    data: {
     status: 'CONVERTED',
     convertedToOrderId: order.id,
     conversionDate: new Date(),
     conversionValue: pricing?.total || 0,
     completedAt: new Date()
    }
   });
  }

  return NextResponse.json({
   success: true,
   orderId: order.id,
   quoteId: quoteOrder?.id,
   message: 'Order placed successfully'
  });

 } catch (error) {
  console.error('Error placing order:', error);
  return NextResponse.json(
   { error: 'Failed to place order' },
   { status: 500 }
  );
 }
}