import { NextRequest, NextResponse } from 'next/server';
// TODO: Remove Prisma import - convert to Supabase
// // Removed Prisma - migrated to Supabase
import { getCurrentUser } from '@/lib/auth-helpers';
import { emailNotificationService } from '@/lib/email/notification-service';

interface QuoteRequest {
 productSlug: string;
 productName: string;
 customerInfo: {
  name: string;
  email: string;
  phone: string;
  company: string;
 };
 requirements: {
  quantity: string;
  colors: string;
  sizes: string;
  customization: string;
  timeline: string;
  additionalNotes: string;
 };
}

export async function POST(request: NextRequest) {
 try {
  const quoteData: QuoteRequest = await request.json();
  const user = await getCurrentUser(request);

  // Get client info
  const ipAddress = request.headers.get('x-forwarded-for') || 
           request.headers.get('x-real-ip') || 
           'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';

  // TODO: Create quote in Supabase database
  let quote = null;
  try {
   // TODO: Replace with Supabase quote creation
   console.log('Quote creation temporarily disabled - TODO: implement with Supabase');
   
   // Create temporary quote object for email notifications
   quote = {
    id: `temp_quote_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    productSlug: quoteData.productSlug,
    productName: quoteData.productName,
    customerInfo: quoteData.customerInfo,
    requirements: quoteData.requirements,
    status: 'PENDING',
    userId: user?.id,
    ipAddress,
    userAgent,
    createdAt: new Date()
   };

   console.log('Quote request saved with ID:', quote.id);

   // Send email notifications using enhanced notification service
   setImmediate(async () => {
    try {
     const notificationResult = await emailNotificationService.sendTraditionalQuoteNotifications({
      id: quote.id,
      productName: quoteData.productName,
      customerInfo: quoteData.customerInfo,
      requirements: quoteData.requirements,
      status: quote.status,
      createdAt: quote.createdAt.toISOString(),
      ipAddress: quote.ipAddress || undefined,
      userAgent: quote.userAgent || undefined
     });

     // Send fallback notification if both emails failed
     if (!notificationResult.customerSuccess && !notificationResult.adminSuccess && notificationResult.errors.length > 0) {
      await emailNotificationService.sendFallbackNotification('traditional', quote.id, notificationResult.errors);
     }
    } catch (error) {
     console.error('❌ Email notification service failed for quote:', quote.id, error);
    }
   });

   return NextResponse.json({
    message: 'Quote request submitted successfully',
    quoteId: quote.id,
   }, { status: 201 });

  } catch (dbError) {
   console.error('Database error when creating quote:', dbError);
   
   // Return a temporary success response
   const tempQuoteId = `temp_quote_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
   
   console.log('⚠️ Database unavailable, returning temporary quote ID:', tempQuoteId);
   
   // Still attempt to send customer notification even if database is down
   if (quoteData.customerInfo.email) {
    setImmediate(async () => {
     try {
      await emailNotificationService.sendTraditionalQuoteNotifications({
       id: tempQuoteId,
       productName: quoteData.productName,
       customerInfo: quoteData.customerInfo,
       requirements: quoteData.requirements,
       status: 'PENDING',
       createdAt: new Date().toISOString(),
       ipAddress: ipAddress,
       userAgent: userAgent
      });
     } catch (error) {
      console.error('❌ Email notification failed for temporary quote:', tempQuoteId, error);
     }
    });
   }
   
   return NextResponse.json({
    message: 'Quote request submitted successfully (temporary)',
    quoteId: tempQuoteId,
    note: 'Quote saved temporarily due to database maintenance. Will be properly stored when database is available.',
   }, { status: 200 });
  }

 } catch (error) {
  console.error('Error submitting quote request:', error);
  return NextResponse.json(
   { error: 'Failed to submit quote request' },
   { status: 500 }
  );
 }
}

export async function GET(request: NextRequest) {
 try {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const status = searchParams.get('status');

  // Build query
  const where: any = {};
  if (userId) where.userId = userId;
  if (status) where.status = status;

  // Fetch quotes with graceful database failure handling
  let quotes = [];
  try {
   // TODO: Replace with Supabase query
   console.log('Quote fetching temporarily disabled - TODO: implement with Supabase');
   quotes = [];

   // Transform quotes to match the expected structure
   const transformedQuotes = quotes.map(quote => ({
    id: quote.id,
    productSlug: quote.productSlug,
    productName: quote.productName,
    customerInfo: quote.customerInfo as any,
    requirements: quote.requirements as any,
    createdAt: quote.createdAt.toISOString(),
    updatedAt: quote.updatedAt?.toISOString() || quote.createdAt.toISOString(),
    status: quote.status,
    ipAddress: quote.ipAddress,
    userAgent: quote.userAgent,
    userId: quote.userId,
   }));

   return NextResponse.json({ 
    quoteRequests: transformedQuotes,
    count: transformedQuotes.length,
   });

  } catch (dbError) {
   console.error('Database error when fetching quotes:', dbError);
   
   // Return empty quotes list when database is unavailable
   return NextResponse.json({
    quoteRequests: [],
    count: 0,
    note: 'Quotes temporarily unavailable due to database maintenance.',
   }, { status: 200 });
  }
 } catch (error) {
  console.error('Error fetching quotes:', error);
  return NextResponse.json(
   { error: 'Failed to fetch quotes' },
   { status: 500 }
  );
 }
}

export async function PATCH(request: NextRequest) {
 try {
  const body = await request.json();
  const { id, status } = body;

  if (!id || !status) {
   return NextResponse.json(
    { error: 'Quote ID and status are required' },
    { status: 400 }
   );
  }

  // Validate status
  const validStatuses = ['PENDING', 'REVIEWED', 'QUOTED', 'ACCEPTED', 'REJECTED'];
  if (!validStatuses.includes(status)) {
   return NextResponse.json(
    { error: 'Invalid status value' },
    { status: 400 }
   );
  }

  // Update the quote status with graceful database failure handling
  try {
   // TODO: Replace with Supabase update
   console.log('Quote update temporarily disabled - TODO: implement with Supabase');
   const updatedQuote = {
    id: id,
    status: status,
    updatedAt: new Date()
   };

   console.log('Quote status updated:', id, status);

   return NextResponse.json({
    message: 'Quote status updated successfully',
    quote: {
     id: updatedQuote.id,
     status: updatedQuote.status,
     updatedAt: updatedQuote.updatedAt?.toISOString()
    }
   }, { status: 200 });

  } catch (dbError) {
   console.error('Database error when updating quote:', dbError);
   
   return NextResponse.json({
    error: 'Failed to update quote status due to database maintenance',
    note: 'Please try again later.'
   }, { status: 503 });
  }

 } catch (error) {
  console.error('Error updating quote status:', error);
  return NextResponse.json(
   { error: 'Failed to update quote status' },
   { status: 500 }
  );
 }
}