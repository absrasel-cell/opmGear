const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

// Create Supabase client
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false }
});

async function verifySchema() {
  console.log('🔍 Verifying Supabase Pricing Schema...');
  console.log('📍 URL:', supabaseUrl);

  try {
    // Test connection and verify each table exists and is accessible
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

    console.log('\n📋 Verifying table access...');

    let successCount = 0;
    let errorCount = 0;

    for (const table of tables) {
      try {
        console.log(`\n📊 Testing table: ${table}`);

        // Try to select from table (should return empty result, not error)
        const { data, error, count } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });

        if (error) {
          console.log(`❌ ${table}: ${error.message}`);
          errorCount++;
        } else {
          console.log(`✅ ${table}: Accessible (${count || 0} rows)`);
          successCount++;
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));

      } catch (err) {
        console.log(`❌ ${table}: ${err.message}`);
        errorCount++;
      }
    }

    console.log('\n🎯 Schema Verification Summary:');
    console.log(`✅ Accessible tables: ${successCount}`);
    console.log(`❌ Failed tables: ${errorCount}`);
    console.log(`📊 Success rate: ${((successCount / tables.length) * 100).toFixed(1)}%`);

    if (successCount === tables.length) {
      console.log('\n🚀 PRICING SCHEMA VERIFICATION SUCCESSFUL!');
      console.log('✅ All tables are properly created and accessible');
      console.log('🔄 Ready for Step 3: CSV data migration');

      // Test a few basic operations
      console.log('\n🧪 Testing basic operations...');

      // Test inserting a sample pricing tier
      console.log('📝 Testing insert operation...');
      const { data: insertData, error: insertError } = await supabase
        .from('pricing_tiers')
        .insert({
          tier_name: 'TEST_TIER',
          description: 'Test tier for verification',
          price_48: 10.00,
          price_144: 9.50,
          price_576: 9.00,
          price_1152: 8.50,
          price_2880: 8.00,
          price_10000: 7.50
        })
        .select();

      if (insertError) {
        console.log('❌ Insert test failed:', insertError.message);
      } else {
        console.log('✅ Insert test successful');

        // Clean up test data
        await supabase
          .from('pricing_tiers')
          .delete()
          .eq('tier_name', 'TEST_TIER');
        console.log('🧹 Test data cleaned up');
      }

    } else {
      console.log('\n⚠️  Schema verification incomplete');
      console.log('🔧 Please check the failed tables and ensure the SQL was executed correctly');
    }

  } catch (error) {
    console.error('💥 Verification error:', error.message);
    process.exit(1);
  }
}

// Run verification
verifySchema();