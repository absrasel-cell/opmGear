const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkTables() {
  console.log('🔍 Checking what tables exist in Supabase...\n');

  try {
    // Try to get schema information
    const { data, error } = await supabase
      .rpc('get_tables_info', {})
      .single();

    if (error) {
      console.log('❌ RPC call failed, trying direct table queries...\n');

      // Try individual table checks
      const tables = [
        'pricing_tiers',
        'products',
        'logo_methods',
        'mold_charges',
        'premium_fabrics',
        'premium_closures',
        'accessories',
        'delivery_methods',
        'pricing_cache',
        'ai_pricing_context'
      ];

      for (const table of tables) {
        try {
          const { data: tableData, error: tableError } = await supabase
            .from(table)
            .select('*')
            .limit(1);

          if (tableError) {
            console.log(`❌ ${table}: ${tableError.message}`);
          } else {
            console.log(`✅ ${table}: Table exists (${tableData.length} sample records)`);
          }
        } catch (err) {
          console.log(`❌ ${table}: ${err.message}`);
        }
      }
    } else {
      console.log('✅ Schema info retrieved:', data);
    }

  } catch (error) {
    console.error('❌ Error checking tables:', error);
  }
}

checkTables();