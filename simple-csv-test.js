const fs = require('fs');
const { parse } = require('csv-parse');

console.log('🧪 Simple CSV Validation Test\n');

// Test 1: Blank Cap Pricings
console.log('📊 Reading Blank Cap Pricings CSV...');
const pricingData = fs.readFileSync('./src/app/csv/Blank Cap Pricings.csv', 'utf8');

parse(pricingData, {
  columns: true,
  skip_empty_lines: true
}, (err, records) => {
  if (err) {
    console.error('❌ Error:', err);
    return;
  }

  console.log(`✅ Parsed ${records.length} pricing tier records:`);
  records.forEach((record, i) => {
    console.log(`   ${i+1}. ${record.Name}: $${record.price48} → $${record.price10000}`);
  });

  console.log('\n✅ Pricing CSV validation successful!');

  // Test 2: Customer Products
  testProducts();
});

function testProducts() {
  console.log('\n📊 Reading Customer Products CSV...');
  const productsData = fs.readFileSync('./src/app/csv/Customer Products.csv', 'utf8');

  parse(productsData, {
    columns: true,
    skip_empty_lines: true
  }, (err, records) => {
    if (err) {
      console.error('❌ Error:', err);
      return;
    }

    console.log(`✅ Parsed ${records.length} product records`);

    // Show tier distribution
    const tierCounts = records.reduce((acc, record) => {
      const tier = record.priceTier;
      acc[tier] = (acc[tier] || 0) + 1;
      return acc;
    }, {});

    console.log('✅ Tier distribution:', tierCounts);

    // Test 3: Logo options
    testLogo();
  });
}

function testLogo() {
  console.log('\n📊 Reading Logo Options CSV...');
  const logoData = fs.readFileSync('./src/app/ai/Options/Logo.csv', 'utf8');

  parse(logoData, {
    columns: true,
    skip_empty_lines: true
  }, (err, records) => {
    if (err) {
      console.error('❌ Error:', err);
      return;
    }

    console.log(`✅ Parsed ${records.length} logo method records`);

    const methods = [...new Set(records.map(r => r.Name))];
    console.log('✅ Unique logo methods:', methods);

    console.log('\n🎯 All CSV files are readable and valid!');
    console.log('✅ Ready to proceed with database migration');
  });
}