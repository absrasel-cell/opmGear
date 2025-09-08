import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
 try {
  // Create a test user
  const { data: testUser, error: userError } = await supabaseAdmin
    .from('users')
    .insert({
      email: `testuser${Date.now()}@example.com`,
      name: `Test User ${Date.now()}`,
      role: 'CUSTOMER',
      phone: '+1234567890',
      company: 'Test Company',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })
    .select()
    .single();

  if (userError) {
    console.error('Error creating test user:', userError);
    return NextResponse.json({ error: 'Failed to create test user' }, { status: 500 });
  }

  // Create a test order
  const { data: testOrder, error: orderError } = await supabaseAdmin
    .from('orders')
    .insert({
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
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })
    .select()
    .single();

  if (orderError) {
    console.error('Error creating test order:', orderError);
    return NextResponse.json({ error: 'Failed to create test order' }, { status: 500 });
  }

  // Create a test quote
  const { data: testQuote, error: quoteError } = await supabaseAdmin
    .from('quotes')
    .insert({
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
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })
    .select()
    .single();

  if (quoteError) {
    console.error('Error creating test quote:', quoteError);
    return NextResponse.json({ error: 'Failed to create test quote' }, { status: 500 });
  }

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
