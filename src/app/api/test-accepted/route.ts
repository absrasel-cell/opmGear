import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 Testing ACCEPTED enum value...');
    
    // Try to create a test QuoteOrder with ACCEPTED status
    const testId = `test-${Date.now()}`;
    
    const { data, error } = await supabaseAdmin
      .from('QuoteOrder')
      .insert({
        id: testId,
        status: 'ACCEPTED',
        title: 'Test Quote',
        productType: 'Test Cap',
        quantities: { quantity: 1 },
        colors: { colors: ['red'] },
        logoRequirements: { logos: [] },
        customizationOptions: {},
        extractedSpecs: {},
        estimatedCosts: { total: 0 },
        aiSummary: 'Test quote',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) {
      console.log('❌ ACCEPTED enum test failed:', error.message);
      
      if (error.message.includes('invalid input value for enum')) {
        return NextResponse.json({
          success: false,
          needsEnumFix: true,
          error: 'ACCEPTED enum value does not exist',
          message: 'Need to add ACCEPTED to QuoteOrderStatus enum'
        });
      }
      
      return NextResponse.json({
        success: false,
        needsEnumFix: false,
        error: error.message
      });
    }
    
    // Clean up test record
    await supabaseAdmin
      .from('QuoteOrder')
      .delete()
      .eq('id', testId);
    
    console.log('✅ ACCEPTED enum value works correctly');
    
    return NextResponse.json({
      success: true,
      message: 'ACCEPTED enum value is working'
    });
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    
    return NextResponse.json(
      { 
        error: 'Test failed',
        details: error.message
      },
      { status: 500 }
    );
  }
}