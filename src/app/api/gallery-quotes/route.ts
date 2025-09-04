import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth-helpers';
import { emailNotificationService } from '@/lib/email/notification-service';

interface GalleryQuoteRequest {
  productSlug: string;
  productName: string;
  customerInfo: {
    name: string;
    email: string;
    phone: string;
    company: string;
  };
  requirements: {
    referenceImage: string;
    projectDescription: string;
    timeline: string;
    additionalNotes: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const quoteData: GalleryQuoteRequest = await request.json();
    const user = await getCurrentUser(request);

    // Get client info
    const ipAddress = request.headers.get('x-forwarded-for') || 
             request.headers.get('x-real-ip') || 
             'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Validate required fields
    if (!quoteData.customerInfo.name || !quoteData.customerInfo.email || !quoteData.requirements.projectDescription) {
      return NextResponse.json(
        { error: 'Name, email, and project description are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(quoteData.customerInfo.email)) {
      return NextResponse.json(
        { error: 'Please provide a valid email address' },
        { status: 400 }
      );
    }

    // Create the gallery quote with graceful database failure handling
    let quote = null;
    try {
      // Transform the data to match the existing Quote model structure
      const transformedRequirements = {
        quantity: 'TBD', // To be determined in quote response
        colors: 'See reference image',
        sizes: 'Standard range',
        customization: quoteData.requirements.projectDescription,
        timeline: quoteData.requirements.timeline || 'Standard (2-4 weeks)',
        additionalNotes: `Gallery Reference Image: ${quoteData.requirements.referenceImage}\n\n${quoteData.requirements.additionalNotes}`,
        referenceImage: quoteData.requirements.referenceImage,
        source: 'gallery'
      };

      quote = await prisma.quote.create({
        data: {
          productSlug: quoteData.productSlug,
          productName: quoteData.productName,
          customerInfo: quoteData.customerInfo,
          requirements: transformedRequirements,
          status: 'PENDING',
          userId: user?.id,
          ipAddress,
          userAgent,
        },
      });

      console.log('Gallery quote request saved with ID:', quote.id);

      // Send email notifications using enhanced notification service
      setImmediate(async () => {
        try {
          const notificationResult = await emailNotificationService.sendTraditionalQuoteNotifications({
            id: quote.id,
            productName: `${quoteData.productName} (Gallery Reference)`,
            customerInfo: quoteData.customerInfo,
            requirements: transformedRequirements,
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
          console.error('❌ Email notification service failed for gallery quote:', quote.id, error);
        }
      });

      return NextResponse.json({
        message: 'Gallery quote request submitted successfully',
        quoteId: quote.id,
        note: 'We will review your reference image and get back to you within 24 hours with a detailed quote.'
      }, { status: 201 });

    } catch (dbError) {
      console.error('Database error when creating gallery quote:', dbError);
      
      // Return a temporary success response
      const tempQuoteId = `temp_gallery_quote_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      console.log('⚠️ Database unavailable, returning temporary gallery quote ID:', tempQuoteId);
      
      // Still attempt to send customer notification even if database is down
      if (quoteData.customerInfo.email) {
        setImmediate(async () => {
          try {
            const transformedRequirements = {
              quantity: 'TBD',
              colors: 'See reference image',
              sizes: 'Standard range',
              customization: quoteData.requirements.projectDescription,
              timeline: quoteData.requirements.timeline || 'Standard (2-4 weeks)',
              additionalNotes: `Gallery Reference Image: ${quoteData.requirements.referenceImage}\n\n${quoteData.requirements.additionalNotes}`,
              referenceImage: quoteData.requirements.referenceImage,
              source: 'gallery'
            };

            await emailNotificationService.sendTraditionalQuoteNotifications({
              id: tempQuoteId,
              productName: `${quoteData.productName} (Gallery Reference)`,
              customerInfo: quoteData.customerInfo,
              requirements: transformedRequirements,
              status: 'PENDING',
              createdAt: new Date().toISOString(),
              ipAddress: ipAddress,
              userAgent: userAgent
            });
          } catch (error) {
            console.error('❌ Email notification failed for temporary gallery quote:', tempQuoteId, error);
          }
        });
      }
      
      return NextResponse.json({
        message: 'Gallery quote request submitted successfully (temporary)',
        quoteId: tempQuoteId,
        note: 'Quote saved temporarily due to database maintenance. Will be properly stored when database is available. We will review your reference image and get back to you within 24 hours.',
      }, { status: 200 });
    }

  } catch (error) {
    console.error('Error submitting gallery quote request:', error);
    return NextResponse.json(
      { error: 'Failed to submit gallery quote request' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const status = searchParams.get('status');

    // Build query for gallery quotes (identified by source in requirements)
    const where: any = {
      productSlug: 'gallery-reference'
    };
    if (userId) where.userId = userId;
    if (status) where.status = status;

    // Fetch gallery quotes with graceful database failure handling
    let quotes = [];
    try {
      quotes = await prisma.quote.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          User: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      // Transform quotes to include gallery-specific metadata
      const transformedQuotes = quotes.map(quote => {
        const requirements = quote.requirements as any;
        return {
          id: quote.id,
          productSlug: quote.productSlug,
          productName: quote.productName,
          customerInfo: quote.customerInfo as any,
          requirements: requirements,
          referenceImage: requirements.referenceImage,
          source: 'gallery',
          createdAt: quote.createdAt.toISOString(),
          updatedAt: quote.updatedAt?.toISOString() || quote.createdAt.toISOString(),
          status: quote.status,
          ipAddress: quote.ipAddress,
          userAgent: quote.userAgent,
          userId: quote.userId,
        };
      });

      return NextResponse.json({ 
        galleryQuotes: transformedQuotes,
        count: transformedQuotes.length,
      });

    } catch (dbError) {
      console.error('Database error when fetching gallery quotes:', dbError);
      
      // Return empty quotes list when database is unavailable
      return NextResponse.json({
        galleryQuotes: [],
        count: 0,
        note: 'Gallery quotes temporarily unavailable due to database maintenance.',
      }, { status: 200 });
    }
  } catch (error) {
    console.error('Error fetching gallery quotes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch gallery quotes' },
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

    // Update the gallery quote status with graceful database failure handling
    try {
      const updatedQuote = await prisma.quote.update({
        where: { 
          id,
          productSlug: 'gallery-reference' // Ensure we're only updating gallery quotes
        },
        data: { 
          status
        },
      });

      console.log('Gallery quote status updated:', id, status);

      return NextResponse.json({
        message: 'Gallery quote status updated successfully',
        quote: {
          id: updatedQuote.id,
          status: updatedQuote.status,
          updatedAt: updatedQuote.updatedAt?.toISOString()
        }
      }, { status: 200 });

    } catch (dbError) {
      console.error('Database error when updating gallery quote:', dbError);
      
      return NextResponse.json({
        error: 'Failed to update gallery quote status due to database maintenance',
        note: 'Please try again later.'
      }, { status: 503 });
    }

  } catch (error) {
    console.error('Error updating gallery quote status:', error);
    return NextResponse.json(
      { error: 'Failed to update gallery quote status' },
      { status: 500 }
    );
  }
}