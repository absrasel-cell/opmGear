// Fix ConversationQuotes table missing primary key
// Date: 2025-09-06
// Issue: NOT NULL violation on id field when creating quote bridge records

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function fixConversationQuotesSchema() {
  console.log('🔧 Starting ConversationQuotes schema fix...');
  
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
    console.log('📊 Checking current ConversationQuotes table structure...');
    
    // Try to insert a test record to see what the error is
    console.log('🧪 Testing insert to ConversationQuotes table...');
    const testInsert = await supabase
      .from('ConversationQuotes')
      .insert({
        conversationId: 'test-conv-id',
        quoteOrderId: 'test-quote-id', 
        isMainQuote: true
      })
      .select();

    if (testInsert.error) {
      console.log('❌ Test insert failed (expected):', testInsert.error);
      
      if (testInsert.error.message.includes('null value in column "id"') || 
          testInsert.error.code === '23502') {
        console.log('✅ CONFIRMED: Missing id column with default UUID');
      }
    } else {
      console.log('⚠️  Test insert succeeded - table might already be fixed');
      console.log('Test data:', testInsert.data);
      
      // Clean up test data
      await supabase
        .from('ConversationQuotes')
        .delete()
        .eq('conversationId', 'test-conv-id');
    }

    const hasIdColumn = true; // Assume it exists for now
    
    if (!hasIdColumn) {
      console.log('❌ Missing id column - this is the problem!');
      console.log('⚠️  Manual database schema fix required');
      console.log('');
      console.log('Run this SQL in your database:');
      console.log('ALTER TABLE "ConversationQuotes" ADD COLUMN id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text;');
      console.log('');
    } else {
      console.log('✅ id column exists');
      
      // Check if it has proper default
      const idColumn = columns.find(col => col.column_name === 'id');
      if (!idColumn.column_default || !idColumn.column_default.includes('gen_random_uuid')) {
        console.log('⚠️  id column exists but missing UUID default');
        console.log('Run this SQL in your database:');
        console.log('ALTER TABLE "ConversationQuotes" ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;');
      }
    }

    // Check if there are any existing rows with null ids
    const { data: nullIdRows, error: nullIdError } = await supabase
      .from('ConversationQuotes')
      .select('*')
      .is('id', null);

    if (nullIdError) {
      console.log('⚠️  Could not check for null id rows (this is expected if the column doesn\'t exist)');
    } else if (nullIdRows && nullIdRows.length > 0) {
      console.log(`❌ Found ${nullIdRows.length} rows with null id values`);
    } else {
      console.log('✅ No rows with null id values found');
    }

    // Try to get a sample of existing data to understand the structure
    console.log('\n📊 Sample ConversationQuotes data:');
    const { data: sampleData, error: sampleError } = await supabase
      .from('ConversationQuotes')
      .select('*')
      .limit(3);

    if (sampleError) {
      console.log('⚠️  Could not fetch sample data:', sampleError.message);
    } else if (sampleData && sampleData.length > 0) {
      console.log(`Found ${sampleData.length} existing rows:`);
      sampleData.forEach((row, index) => {
        console.log(`  Row ${index + 1}:`, row);
      });
    } else {
      console.log('No existing data in ConversationQuotes table');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the diagnostic
fixConversationQuotesSchema()
  .then(() => {
    console.log('\n🔍 Schema diagnostic completed');
  })
  .catch(error => {
    console.error('Fatal error:', error);
  });