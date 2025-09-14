const { supabaseAdmin } = require('./src/lib/supabase');
const fs = require('fs');
const { parse } = require('csv-parse');

// Test migration in validation mode
async function testMigration() {
  console.log('🧪 Testing CSV Migration in Validation Mode...\n');

  try {
    // Test 1: Read Blank Cap Pricings CSV
    console.log('📊 Testing Blank Cap Pricings CSV...');
    const pricingData = fs.readFileSync('./src/app/csv/Blank Cap Pricings.csv', 'utf8');
    const pricingRecords = [];

    parse(pricingData, {
      columns: true,
      skip_empty_lines: true
    }, (err, records) => {
      if (err) {
        console.error('❌ Error parsing pricing CSV:', err);
        return;
      }

      console.log(`✅ Parsed ${records.length} pricing tier records:`);
      records.forEach((record, i) => {
        console.log(`   ${i+1}. ${record.Name}: $${record.price48} → $${record.price10000}`);
      });

      // Transform for Supabase
      const transformedTiers = records.map(record => ({
        tier_name: record.Name,
        description: `${record.Name} pricing tier`,
        price_48: parseFloat(record.price48),
        price_144: parseFloat(record.price144),
        price_576: parseFloat(record.price576),
        price_1152: parseFloat(record.price1152),
        price_2880: parseFloat(record.price2880),
        price_10000: parseFloat(record.price10000)
      }));

      console.log('✅ Transformation successful!\n');

      // Test 2: Read Customer Products CSV
      testProductsCSV();
    });

  } catch (error) {
    console.error('❌ Migration test failed:', error);
  }
}

async function testProductsCSV() {
  console.log('📊 Testing Customer Products CSV...');

  try {
    const productsData = fs.readFileSync('./src/app/csv/Customer Products.csv', 'utf8');

    parse(productsData, {
      columns: true,
      skip_empty_lines: true
    }, (err, records) => {
      if (err) {
        console.error('❌ Error parsing products CSV:', err);
        return;
      }

      console.log(`✅ Parsed ${records.length} product records`);
      console.log(`   Sample: ${records[0]?.Name} (${records[0]?.priceTier})`);

      // Test tier distribution
      const tierCounts = records.reduce((acc, record) => {
        const tier = record.priceTier;
        acc[tier] = (acc[tier] || 0) + 1;
        return acc;
      }, {});

      console.log('✅ Tier distribution:', tierCounts);
      console.log('✅ Products CSV test successful!\n');

      // Test 3: Logo options
      testLogoCSV();
    });

  } catch (error) {
    console.error('❌ Products CSV test failed:', error);
  }
}

async function testLogoCSV() {
  console.log('📊 Testing Logo Options CSV...');

  try {
    const logoData = fs.readFileSync('./src/app/ai/Options/Logo.csv', 'utf8');

    parse(logoData, {
      columns: true,
      skip_empty_lines: true
    }, (err, records) => {
      if (err) {
        console.error('❌ Error parsing logo CSV:', err);
        return;
      }

      console.log(`✅ Parsed ${records.length} logo method records`);

      // Group by method type
      const methodCounts = records.reduce((acc, record) => {
        const method = record.Name;
        acc[method] = (acc[method] || 0) + 1;
        return acc;
      }, {});

      console.log('✅ Logo methods:', Object.keys(methodCounts));

      // Test mold charges
      const moldCharges = records.filter(r => r.Name === 'Mold Charge');
      console.log(`✅ Found ${moldCharges.length} mold charge entries`);
      console.log('✅ Logo CSV test successful!\n');

      // Test database connection
      testDatabaseConnection();
    });

  } catch (error) {
    console.error('❌ Logo CSV test failed:', error);
  }
}

async function testDatabaseConnection() {
  console.log('🔌 Testing Supabase Connection...');

  try {
    // Test table access
    const { data: tiers, error: tierError } = await supabaseAdmin
      .from('pricing_tiers')
      .select('*')
      .limit(1);

    if (tierError) {
      console.error('❌ Pricing tiers table error:', tierError);
      return;
    }

    console.log('✅ Pricing tiers table accessible');

    const { data: products, error: productError } = await supabaseAdmin
      .from('products')
      .select('*')
      .limit(1);

    if (productError) {
      console.error('❌ Products table error:', productError);
      return;
    }

    console.log('✅ Products table accessible');
    console.log('✅ Database connection successful!\n');

    console.log('🎯 VALIDATION TEST COMPLETE');
    console.log('✅ All CSV files are readable and parseable');
    console.log('✅ Data transformation logic is working');
    console.log('✅ Database tables are accessible');
    console.log('✅ Ready for full migration!');

  } catch (error) {
    console.error('❌ Database connection test failed:', error);
  }
}

// Run the test
testMigration();