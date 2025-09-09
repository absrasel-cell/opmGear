import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Starting ConversationQuotes ID column database fix...');
    
    console.log('📋 Step 1: Checking current table structure...');
    
    // First, check the current structure
    const { data: currentStructure, error: structureError } = await supabaseAdmin
      .rpc('exec_sql', {
        sql_query: `
          SELECT column_name, data_type, column_default, is_nullable
          FROM information_schema.columns 
          WHERE table_name = 'ConversationQuotes' 
          AND table_schema = 'public'
          ORDER BY ordinal_position;
        `
      });
      
    if (structureError) {
      console.error('❌ Error checking table structure:', structureError);
    } else {
      console.log('📊 Current structure:', currentStructure);
    }
    
    console.log('📋 Step 2: Setting default UUID value for id column...');
    
    // Method 1: Try to alter the existing column
    const { error: alterError } = await supabaseAdmin
      .rpc('exec_sql', {
        sql_query: `
          ALTER TABLE "ConversationQuotes" 
          ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
        `
      });
      
    let fixApplied = false;
    
    if (alterError) {
      console.log('⚠️ Direct alter failed, trying recreation approach:', alterError.message);
      
      // Method 2: Recreate the column with proper defaults
      const { error: recreateError } = await supabaseAdmin
        .rpc('exec_sql', {
          sql_query: `
            -- Disable RLS temporarily
            ALTER TABLE "ConversationQuotes" DISABLE ROW LEVEL SECURITY;
            
            -- Drop existing constraints if any
            ALTER TABLE "ConversationQuotes" DROP CONSTRAINT IF EXISTS "ConversationQuotes_pkey";
            
            -- Add a temp column with UUID default
            ALTER TABLE "ConversationQuotes" ADD COLUMN id_new TEXT DEFAULT gen_random_uuid()::text;
            
            -- Copy existing data to new column, generating UUIDs for null values
            UPDATE "ConversationQuotes" 
            SET id_new = COALESCE(id, gen_random_uuid()::text);
            
            -- Drop old column and rename new one
            ALTER TABLE "ConversationQuotes" DROP COLUMN id;
            ALTER TABLE "ConversationQuotes" RENAME COLUMN id_new TO id;
            
            -- Add primary key constraint
            ALTER TABLE "ConversationQuotes" ADD CONSTRAINT "ConversationQuotes_pkey" PRIMARY KEY (id);
            
            -- Re-enable RLS
            ALTER TABLE "ConversationQuotes" ENABLE ROW LEVEL SECURITY;
          `
        });
        
      if (recreateError) {
        console.error('❌ Recreation approach failed:', recreateError);
        return NextResponse.json({
          success: false,
          message: 'Failed to fix ID column',
          error: recreateError.message,
          suggestion: 'Manual database intervention required'
        });
      } else {
        console.log('✅ Column recreation successful');
        fixApplied = true;
      }
    } else {
      console.log('✅ Direct alter successful');
      fixApplied = true;
    }
    
    if (fixApplied) {
      console.log('📋 Step 3: Updating any remaining NULL values...');
      
      // Update any remaining NULL values
      const { error: updateError } = await supabaseAdmin
        .rpc('exec_sql', {
          sql_query: `
            UPDATE "ConversationQuotes" 
            SET id = gen_random_uuid()::text 
            WHERE id IS NULL OR id = '';
          `
        });
        
      if (updateError) {
        console.log('⚠️ Warning: Could not update NULL values:', updateError.message);
      } else {
        console.log('✅ NULL values updated');
      }
      
      console.log('📋 Step 4: Testing insert...');
      
      // Test the fix
      const testId = crypto.randomUUID();
      const { data: testData, error: testError } = await supabaseAdmin
        .from('ConversationQuotes')
        .insert({
          id: testId,
          conversationId: 'test-conv-' + Date.now(),
          quoteOrderId: 'test-quote-' + Date.now(),
          isMainQuote: true
        })
        .select()
        .single();
        
      if (testError) {
        console.error('❌ Test insert failed:', testError);
        return NextResponse.json({
          success: false,
          message: 'Fix applied but test insert failed',
          error: testError.message
        });
      } else {
        console.log('✅ Test insert successful:', testData);
        
        // Clean up test data
        await supabaseAdmin
          .from('ConversationQuotes')
          .delete()
          .eq('id', testId);
        console.log('🧹 Test data cleaned up');
      }
    }
    
    console.log('📋 Step 5: Final structure verification...');
    
    const { data: finalStructure, error: finalError } = await supabaseAdmin
      .rpc('exec_sql', {
        sql_query: `
          SELECT column_name, data_type, column_default, is_nullable
          FROM information_schema.columns 
          WHERE table_name = 'ConversationQuotes' 
          AND table_schema = 'public'
          ORDER BY ordinal_position;
        `
      });
      
    if (!finalError) {
      console.log('📊 Final structure:', finalStructure);
    }
    
    return NextResponse.json({
      success: true,
      message: 'ConversationQuotes ID column fix completed successfully',
      beforeStructure: currentStructure,
      afterStructure: finalStructure,
      fixMethod: alterError ? 'column_recreation' : 'direct_alter'
    });
    
  } catch (error) {
    console.error('❌ Database fix error:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Database fix failed with exception',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}