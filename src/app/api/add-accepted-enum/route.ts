import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Adding ACCEPTED enum value to QuoteOrderStatus...');
    
    // Use raw SQL to add the enum value
    // Supabase supports raw SQL queries through the REST API
    const query = `ALTER TYPE "QuoteOrderStatus" ADD VALUE IF NOT EXISTS 'ACCEPTED';`;
    
    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY
      },
      body: JSON.stringify({
        query: query
      })
    });
    
    if (!response.ok) {
      // Try alternative method using a manual SQL command
      console.log('❌ Direct SQL failed, trying alternative approach...');
      
      // Create a temporary stored procedure to add the enum
      const { error: procError } = await supabaseAdmin.rpc('create_enum_value', {
        enum_name: 'QuoteOrderStatus',
        new_value: 'ACCEPTED'
      });
      
      if (procError) {
        console.log('❌ Stored procedure failed, manual approach...');
        
        // Last resort - try to update directly through a different method
        throw new Error('Unable to add enum value through available methods');
      }
    }
    
    console.log('✅ Successfully added ACCEPTED to QuoteOrderStatus enum');
    
    // Test that it works now
    const testResult = await fetch('http://localhost:3000/api/test-accepted', {
      method: 'POST'
    });
    const testData = await testResult.json();
    
    return NextResponse.json({
      success: true,
      message: 'ACCEPTED enum value added successfully',
      testResult: testData
    });
    
  } catch (error) {
    console.error('❌ Error adding enum value:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to add enum value',
        details: error.message,
        suggestion: 'Please run the following SQL manually in your Supabase dashboard: ALTER TYPE "QuoteOrderStatus" ADD VALUE \'ACCEPTED\';'
      },
      { status: 500 }
    );
  }
}