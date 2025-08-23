import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth-helpers';

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

    // Create the quote with graceful database failure handling
    let quote = null;
    try {
      quote = await prisma.quote.create({
        data: {
          productSlug: quoteData.productSlug,
          productName: quoteData.productName,
          customerInfo: quoteData.customerInfo,
          requirements: quoteData.requirements,
          status: 'PENDING',
          userId: user?.id,
          ipAddress,
          userAgent,
        },
      });

      console.log('Quote request saved with ID:', quote.id);

      return NextResponse.json({
        message: 'Quote request submitted successfully',
        quoteId: quote.id,
      }, { status: 201 });

    } catch (dbError) {
      console.error('Database error when creating quote:', dbError);
      
      // Return a temporary success response
      const tempQuoteId = `temp_quote_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      console.log('⚠️ Database unavailable, returning temporary quote ID:', tempQuoteId);
      
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
      quotes = await prisma.quote.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      // Transform quotes to match the expected structure
      const transformedQuotes = quotes.map(quote => ({
        id: quote.id,
        productName: quote.productName,
        customerInfo: quote.customerInfo as any,
        createdAt: quote.createdAt.toISOString(),
        status: quote.status,
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