import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Applying ConversationQuotes schema fix...');
    
    // Apply the schema fix using raw SQL
    const { error: schemaError } = await supabaseAdmin
      .rpc('exec_sql', {
        sql_query: `
          -- Fix ConversationQuotes id column default
          ALTER TABLE "ConversationQuotes" ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
          
          -- Ensure other columns have proper defaults
          ALTER TABLE "ConversationQuotes" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;
          ALTER TABLE "ConversationQuotes" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;  
          ALTER TABLE "ConversationQuotes" ALTER COLUMN "isMainQuote" SET DEFAULT false;
          
          -- Update any existing rows with null ids
          UPDATE "ConversationQuotes" 
          SET id = gen_random_uuid()::text 
          WHERE id IS NULL;
        `
      });

    if (schemaError) {
      console.log('⚠️  RPC approach failed, trying direct SQL execution...');
      
      // Try individual operations
      const fixes = [
        `ALTER TABLE "ConversationQuotes" ALTER COLUMN id SET DEFAULT gen_random_uuid()::text`,
        `ALTER TABLE "ConversationQuotes" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP`, 
        `ALTER TABLE "ConversationQuotes" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP`,
        `ALTER TABLE "ConversationQuotes" ALTER COLUMN "isMainQuote" SET DEFAULT false`,
        `UPDATE "ConversationQuotes" SET id = gen_random_uuid()::text WHERE id IS NULL`
      ];

      const results = [];
      for (const sql of fixes) {
        try {
          const { error } = await supabaseAdmin.rpc('exec_sql', { sql_query: sql });
          results.push({ sql, success: !error, error: error?.message });
        } catch (err) {
          results.push({ sql, success: false, error: err instanceof Error ? err.message : 'Unknown error' });
        }
      }

      console.log('Individual fix results:', results);
    }

    // Test if the fix worked by attempting an insert
    console.log('🧪 Testing insert after fix...');
    const testInsert = await supabaseAdmin
      .from('ConversationQuotes')
      .insert({
        conversationId: 'test-conv-id-fix',
        quoteOrderId: 'test-quote-id-fix',
        isMainQuote: true
      })
      .select();

    if (testInsert.error) {
      console.error('❌ Test insert still failing:', testInsert.error);
      
      return NextResponse.json({
        success: false,
        message: 'Schema fix did not work',
        error: testInsert.error,
        instructions: [
          'Manual fix required in Supabase SQL Editor:',
          'ALTER TABLE "ConversationQuotes" ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;',
          'ALTER TABLE "ConversationQuotes" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;',
          'ALTER TABLE "ConversationQuotes" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;',
          'ALTER TABLE "ConversationQuotes" ALTER COLUMN "isMainQuote" SET DEFAULT false;',
          'UPDATE "ConversationQuotes" SET id = gen_random_uuid()::text WHERE id IS NULL;'
        ]
      });
    }

    console.log('✅ Test insert succeeded:', testInsert.data);

    // Clean up test data
    await supabaseAdmin
      .from('ConversationQuotes')
      .delete()
      .eq('conversationId', 'test-conv-id-fix');

    return NextResponse.json({
      success: true,
      message: 'ConversationQuotes schema fixed successfully',
      testData: testInsert.data
    });

  } catch (error) {
    console.error('❌ Schema fix error:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Schema fix failed with exception',
      error: error instanceof Error ? error.message : 'Unknown error',
      instructions: [
        'Manual fix required in Supabase SQL Editor:',
        'ALTER TABLE "ConversationQuotes" ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;',
        'ALTER TABLE "ConversationQuotes" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;',
        'ALTER TABLE "ConversationQuotes" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;', 
        'ALTER TABLE "ConversationQuotes" ALTER COLUMN "isMainQuote" SET DEFAULT false;',
        'UPDATE "ConversationQuotes" SET id = gen_random_uuid()::text WHERE id IS NULL;'
      ]
    });
  }
}