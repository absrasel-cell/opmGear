import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const testOrderData = {
      productName: 'Test Product',
      selectedColors: { 'Red': { 'S': 10, 'M': 20, 'L': 15 } },
      logoSetupSelections: { 'Logo1': { position: 'Front', size: 'Medium' } },
      selectedOptions: { 'Closure': 'Snapback' },
      multiSelectOptions: { 'Accessories': ['Sticker', 'Tag'] },
      customerInfo: {
        name: 'Test User',
        email: 'test@example.com',
        phone: '1234567890',
        company: 'Test Company',
        address: {
          street: '123 Test St',
          city: 'Test City',
          state: 'Test State',
          zipCode: '12345',
          country: 'Test Country'
        }
      },
      userId: 'test-user-id',
      userEmail: 'test@example.com',
      orderType: 'AUTHENTICATED' as const,
      orderSource: 'PRODUCT_CUSTOMIZATION' as const,
      status: 'PENDING' as const,
      ipAddress: '127.0.0.1',
      userAgent: 'Test User Agent'
    };

    console.log('Testing order submission with data:', testOrderData);

    // Test database connection with order creation
    let order = null;
    try {
      order = await prisma.order.create({
        data: testOrderData,
      });

      console.log('✅ Test order created successfully with ID:', order.id);

      // Clean up - delete the test order
      await prisma.order.delete({
        where: { id: order.id },
      });

      console.log('✅ Test order cleaned up successfully');

      return NextResponse.json({
        success: true,
        message: 'Order submission test successful',
        testOrderId: order.id,
        note: 'Test order was created and then deleted for cleanup'
      });

    } catch (dbError) {
      console.error('❌ Database error during order submission test:', dbError);
      
      return NextResponse.json({
        success: false,
        error: 'Database connection failed during order submission test',
        details: dbError.message,
        note: 'This confirms the order submission issue is database-related'
      }, { status: 503 });
    }

  } catch (error: any) {
    console.error('❌ General error during order submission test:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'General error during order submission test',
        details: error.message 
      },
      { status: 500 }
    );
  }
}
