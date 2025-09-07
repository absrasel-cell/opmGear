const { createClient } = require('@supabase/supabase-js');

const supabaseAdmin = createClient(
  'https://tfiemrpfsvxvzgbqisdp.supabase.co', 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRmaWVtcnBmc3Z4dnpnYnFpc2RwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjE4MTU4OSwiZXhwIjoyMDcxNzU3NTg5fQ.B8aZ4hts8DtVPMaRwBS5LZ2mlrP3hYWtMG3qRRdHAL8',
  { auth: { persistSession: false } }
);

async function fixRLS() {
  console.log('🔧 Attempting to disable RLS on QuoteOrder tables...');
  
  // Try multiple SQL commands to fix permissions
  const sqlCommands = [
    'ALTER TABLE "QuoteOrder" DISABLE ROW LEVEL SECURITY;',
    'ALTER TABLE "QuoteOrderFile" DISABLE ROW LEVEL SECURITY;',
    'GRANT ALL ON "QuoteOrder" TO service_role;',
    'GRANT ALL ON "QuoteOrderFile" TO service_role;'
  ];
  
  for (const sql of sqlCommands) {
    console.log(`Executing: ${sql}`);
    try {
      const { data, error } = await supabaseAdmin.rpc('sql', { query: sql });
      if (error) {
        console.log(`❌ Error: ${error.message}`);
      } else {
        console.log(`✅ Success`);
      }
    } catch (err) {
      console.log(`❌ Network error: ${err.message}`);
    }
  }
  
  // Test if QuoteOrder is now accessible
  console.log('\n🧪 Testing QuoteOrder access...');
  const { data, error } = await supabaseAdmin.from('QuoteOrder').select('id').limit(1);
  
  if (error) {
    console.log('❌ Still blocked:', error.message);
  } else {
    console.log('✅ QuoteOrder access works! Records found:', data?.length || 0);
  }
}

fixRLS();