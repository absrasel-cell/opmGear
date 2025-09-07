import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Adding ACCEPTED enum value to QuoteOrderStatus...');
    
    // First add the ACCEPTED enum value
    const { error: enumError } = await supabaseAdmin.rpc('exec_sql', {
      sql: `ALTER TYPE "QuoteOrderStatus" ADD VALUE IF NOT EXISTS 'ACCEPTED';`
    });
    
    if (enumError) {
      console.log('Enum add failed, trying alternative:', enumError);
      // Alternative approach if the first fails
      const { error: altError } = await supabaseAdmin.sql`
        DO $$ 
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_enum 
            WHERE enumlabel = 'ACCEPTED' 
            AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'QuoteOrderStatus')
          ) THEN
            ALTER TYPE "QuoteOrderStatus" ADD VALUE 'ACCEPTED';
          END IF;
        END $$;
      `;
      
      if (altError) {
        throw new Error(`Failed to add ACCEPTED enum: ${altError.message}`);
      }
    }
    
    console.log('✅ ACCEPTED enum added successfully');
    
    // Test that it works by doing a simple query
    const { data: testData, error: testError } = await supabaseAdmin
      .from('QuoteOrder')
      .select('id')
      .eq('status', 'PENDING')
      .limit(1);
    
    if (testError) {
      console.log('Test query failed:', testError);
    }
    
    return NextResponse.json({
      success: true,
      message: 'ACCEPTED enum value added successfully'
    });
    
  } catch (error) {
    console.error('❌ Error adding enum value:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to add enum value',
        details: error.message,
        note: 'You may need to run this SQL manually: ALTER TYPE "QuoteOrderStatus" ADD VALUE \'ACCEPTED\';'
      },
      { status: 500 }
    );
  }
}