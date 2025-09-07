import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Adding ACCEPTED enum value to QuoteOrderStatus...');
    
    // First, let's check what enum values currently exist
    const { data: currentEnums, error: checkError } = await supabaseAdmin.rpc('sql', {
      query: `
        SELECT enumlabel 
        FROM pg_enum 
        WHERE enumtypid = (
          SELECT oid FROM pg_type WHERE typname = 'QuoteOrderStatus'
        )
        ORDER BY enumlabel;
      `
    });
    
    if (checkError) {
      console.log('Current enum check failed:', checkError);
      // Try alternative approach - just attempt to add the enum value
      const { error: addError } = await supabaseAdmin.rpc('sql', {
        query: `ALTER TYPE "QuoteOrderStatus" ADD VALUE IF NOT EXISTS 'ACCEPTED';`
      });
      
      if (addError) {
        throw new Error(`Failed to add ACCEPTED enum: ${addError.message}`);
      }
    } else {
      console.log('Current QuoteOrderStatus values:', currentEnums);
      
      // Check if ACCEPTED already exists
      const hasAccepted = currentEnums?.some((e: any) => e.enumlabel === 'ACCEPTED');
      
      if (!hasAccepted) {
        const { error: addError } = await supabaseAdmin.rpc('sql', {
          query: `ALTER TYPE "QuoteOrderStatus" ADD VALUE 'ACCEPTED';`
        });
        
        if (addError) {
          throw new Error(`Failed to add ACCEPTED enum: ${addError.message}`);
        }
      } else {
        console.log('✅ ACCEPTED enum value already exists');
      }
    }
    
    console.log('✅ Successfully added ACCEPTED to QuoteOrderStatus enum');
    
    return NextResponse.json({
      success: true,
      message: 'ACCEPTED enum value added successfully'
    });
    
  } catch (error) {
    console.error('❌ Error adding enum value:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to add enum value',
        details: error.message
      },
      { status: 500 }
    );
  }
}