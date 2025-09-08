import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Checking Invoice table schema...');

    // Try to get table schema information
    const { data, error } = await supabaseAdmin
      .from('Invoice')
      .select('*')
      .limit(1);

    if (error) {
      console.error('Invoice table error:', error);
      return NextResponse.json({
        error: error.message,
        details: error
      }, { status: 500 });
    }

    console.log('Invoice table data:', data);

    // Get real Order and User IDs from database
    const { data: realOrder } = await supabaseAdmin
      .from('Order')
      .select('id, userId')
      .limit(1)
      .single();

    if (!realOrder) {
      return NextResponse.json({
        success: false,
        error: 'No orders found in database to test with'
      }, { status: 400 });
    }

    console.log('Using real order for test:', realOrder);

    // Try different possible column names based on error patterns
    const now = new Date().toISOString();
    const possibleFields = [
      { 
        number: 'TEST-001', 
        orderId: realOrder.id, 
        customerId: realOrder.userId, 
        subtotal: 100.00, 
        tax: 10.00, 
        total: 110.00, 
        status: 'DRAFT',
        createdAt: now,
        updatedAt: now
      },
      { 
        invoiceNumber: 'TEST-001', 
        orderId: realOrder.id, 
        userId: realOrder.userId, 
        subtotal: 100.00, 
        taxAmount: 10.00, 
        total: 110.00, 
        status: 'DRAFT',
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'test-id-' + Date.now(), 
        number: 'TEST-001', 
        orderId: realOrder.id, 
        customerId: realOrder.userId, 
        subtotal: 100.00, 
        tax: 10.00, 
        total: 110.00, 
        status: 'DRAFT',
        createdAt: now,
        updatedAt: now
      }
    ];

    let workingSchema = null;
    let lastError = null;

    for (let i = 0; i < possibleFields.length; i++) {
      const testInsert = possibleFields[i];
      console.log(`Testing schema ${i + 1}:`, testInsert);

      const { data: insertData, error: insertError } = await supabaseAdmin
        .from('Invoice')
        .insert(testInsert)
        .select('*');

      if (insertError) {
        console.error(`Schema ${i + 1} failed:`, insertError.message);
        lastError = insertError;
        continue;
      }

      // Success! Found working schema
      workingSchema = testInsert;
      console.log(`✅ Schema ${i + 1} works!`, testInsert);

      // Clean up test record
      if (insertData && insertData[0]) {
        await supabaseAdmin
          .from('Invoice')
          .delete()
          .eq('id', insertData[0].id);
      }
      break;
    }

    if (!workingSchema) {
      return NextResponse.json({
        success: false,
        message: 'No working schema found',
        lastError: lastError?.message || 'Unknown error',
        testedSchemas: possibleFields
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Found working Invoice schema',
      workingSchema,
      columnNames: Object.keys(workingSchema)
    });

  } catch (error) {
    console.error('Error checking Invoice schema:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}