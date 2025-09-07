// Apply ConversationQuotes id column default fix
// Date: 2025-09-06
// Issue: id column exists but missing UUID default generator

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function applyConversationQuotesFix() {
  console.log('🔧 Applying ConversationQuotes schema fix...');
  
  // Use service role key for admin operations
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );

  try {
    console.log('📝 Applying SQL fixes directly through RPC...');
    
    // Apply the fix using Supabase RPC (SQL function approach)
    const sqlFix = `
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
    `;

    console.log('📊 SQL to be executed:');
    console.log(sqlFix);
    console.log('');
    
    // Since we can't execute DDL through Supabase client, let's try a different approach
    // We'll create a test to verify the fix works
    
    console.log('🧪 Testing if fix is needed...');
    const testInsertBefore = await supabase
      .from('ConversationQuotes')
      .insert({
        conversationId: 'test-conv-before-fix',
        quoteOrderId: 'test-quote-before-fix',
        isMainQuote: true
      })
      .select();

    if (testInsertBefore.error && testInsertBefore.error.code === '23502') {
      console.log('❌ Fix still needed - id column missing default UUID');
      console.log('');
      console.log('🚨 MANUAL ACTION REQUIRED:');
      console.log('Run this SQL in your Supabase SQL Editor:');
      console.log('');
      console.log('ALTER TABLE "ConversationQuotes" ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;');
      console.log('ALTER TABLE "ConversationQuotes" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;');
      console.log('ALTER TABLE "ConversationQuotes" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;');
      console.log('ALTER TABLE "ConversationQuotes" ALTER COLUMN "isMainQuote" SET DEFAULT false;');
      console.log('');
      console.log('Then run:');
      console.log('UPDATE "ConversationQuotes" SET id = gen_random_uuid()::text WHERE id IS NULL;');
      
    } else if (testInsertBefore.data) {
      console.log('✅ Fix already applied - test insert succeeded!');
      console.log('Test data:', testInsertBefore.data);
      
      // Clean up test data
      await supabase
        .from('ConversationQuotes')
        .delete()
        .eq('conversationId', 'test-conv-before-fix');
        
      console.log('🧹 Cleaned up test data');
      
    } else {
      console.log('⚠️  Unexpected result:', testInsertBefore);
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the fix
applyConversationQuotesFix()
  .then(() => {
    console.log('\n✅ ConversationQuotes fix process completed');
    console.log('\n📋 Next Steps:');
    console.log('1. Apply the SQL commands shown above in Supabase SQL Editor');  
    console.log('2. Test quote creation from /support page');
    console.log('3. Verify no more 23502 errors occur');
  })
  .catch(error => {
    console.error('Fatal error:', error);
  });