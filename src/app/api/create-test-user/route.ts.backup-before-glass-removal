import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    // Create a test user
    const testUser = await prisma.user.create({
      data: {
        email: `testuser${Date.now()}@example.com`,
        name: `Test User ${Date.now()}`,
        role: 'CUSTOMER',
        phone: '+1234567890',
        company: 'Test Company',
      },
    });

    // Create a test order
    const testOrder = await prisma.order.create({
      data: {
        productName: 'Custom Baseball Cap',
        selectedColors: {
          'Navy Blue': { 'S': 10, 'M': 15, 'L': 20, 'XL': 5 }
        },
        logoSetupSelections: {
          'Front': { position: 'Center', size: 'Medium', application: 'Embroidery' }
        },
        selectedOptions: {
          'Cap Style': '6-Panel',
          'Material': 'Cotton'
        },
        multiSelectOptions: {
          'Features': ['Moisture Wicking', 'UV Protection']
        },
        customerInfo: {
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+1234567890',
          company: 'Test Company',
          address: {
            street: '123 Test St',
            city: 'Test City',
            state: 'TS',
            zipCode: '12345',
            country: 'USA'
          }
        },
        userId: testUser.id,
        userEmail: testUser.email,
        orderType: 'AUTHENTICATED',
        orderSource: 'PRODUCT_CUSTOMIZATION',
        status: 'PENDING',
        ipAddress: '127.0.0.1',
        userAgent: 'Test Browser',
      },
    });

    // Create a test quote
    const testQuote = await prisma.quote.create({
      data: {
        productSlug: 'custom-baseball-cap',
        productName: 'Custom Baseball Cap',
        customerInfo: {
          name: 'Jane Smith',
          email: 'jane@example.com',
          phone: '+1234567890',
          company: 'Another Company',
        },
        requirements: {
          quantity: '100',
          colors: 'Navy Blue, Red',
          sizes: 'S, M, L, XL',
          customization: 'Embroidery',
          timeline: '2 weeks',
          additionalNotes: 'Need logo on front and back',
        },
        status: 'PENDING',
        userId: testUser.id,
        ipAddress: '127.0.0.1',
        userAgent: 'Test Browser',
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Test data created successfully',
      data: {
        user: testUser,
        order: testOrder,
        quote: testQuote,
      },
    });
  } catch (error) {
    console.error('Error creating test data:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to create test data',
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
