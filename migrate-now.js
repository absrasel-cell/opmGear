// Direct migration script for CSV to Supabase
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const { parse } = require('csv-parse');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log('🚀 US Custom Cap - Direct CSV Migration');
console.log('================================================================================\n');

async function migratePricingTiers() {
  console.log('📊 Step 1: Migrating Pricing Tiers...');

  const pricingData = fs.readFileSync('./src/app/csv/Blank Cap Pricings.csv', 'utf8');

  return new Promise((resolve) => {
    parse(pricingData, {
      columns: true,
      skip_empty_lines: true
    }, async (err, records) => {
      if (err) {
        console.error('❌ Error parsing pricing CSV:', err);
        resolve({ success: false, error: err });
        return;
      }

      const tierData = records.map(record => ({
        tier_name: record.Name,
        description: `${record.Name} - Volume-based pricing`,
        price_48: parseFloat(record.price48),
        price_144: parseFloat(record.price144),
        price_576: parseFloat(record.price576),
        price_1152: parseFloat(record.price1152),
        price_2880: parseFloat(record.price2880),
        price_10000: parseFloat(record.price10000)
      }));

      console.log(`   Inserting ${tierData.length} pricing tiers...`);

      const { data, error } = await supabase
        .from('pricing_tiers')
        .upsert(tierData, {
          onConflict: 'tier_name',
          ignoreDuplicates: false
        })
        .select();

      if (error) {
        console.error('❌ Failed to insert pricing tiers:', error);
        resolve({ success: false, error });
        return;
      }

      console.log(`✅ Successfully inserted ${data.length} pricing tiers`);
      resolve({ success: true, data, inserted: data.length });
    });
  });
}

async function migrateProducts() {
  console.log('\n📊 Step 2: Migrating Products...');

  // First get pricing tier IDs
  const { data: tiers, error: tierError } = await supabase
    .from('pricing_tiers')
    .select('id, tier_name');

  if (tierError) {
    console.error('❌ Failed to get pricing tiers:', tierError);
    return { success: false, error: tierError };
  }

  const tierMap = {};
  tiers.forEach(tier => {
    tierMap[tier.tier_name] = tier.id;
  });

  const productsData = fs.readFileSync('./src/app/csv/Customer Products.csv', 'utf8');

  return new Promise((resolve) => {
    parse(productsData, {
      columns: true,
      skip_empty_lines: true
    }, async (err, records) => {
      if (err) {
        console.error('❌ Error parsing products CSV:', err);
        resolve({ success: false, error: err });
        return;
      }

      const productData = records.map(record => {
        const nickNames = record['Nick Names'] ?
          record['Nick Names'].split(',').map(name => name.trim()) : [];

        return {
          name: record.Name,
          code: record.Name.replace(/\s+/g, '_').toUpperCase(),
          profile: record.Profile,
          bill_shape: record['Bill Shape'],
          panel_count: parseInt(record['Panel Count'].replace('P', '').replace('-Panel', '')),
          structure_type: record['Structure Type'],
          pricing_tier_id: tierMap[record.priceTier],
          nick_names: nickNames,
          tags: {
            panel_count: record['Panel Count'],
            profile: record.Profile,
            bill_shape: record['Bill Shape'],
            structure: record['Structure Type']
          },
          is_active: true
        };
      });

      console.log(`   Inserting ${productData.length} products...`);

      const { data, error } = await supabase
        .from('products')
        .upsert(productData, {
          onConflict: 'name',
          ignoreDuplicates: false
        })
        .select();

      if (error) {
        console.error('❌ Failed to insert products:', error);
        resolve({ success: false, error });
        return;
      }

      console.log(`✅ Successfully inserted ${data.length} products`);
      resolve({ success: true, data, inserted: data.length });
    });
  });
}

async function migrateLogoMethods() {
  console.log('\n📊 Step 3: Migrating Logo Methods...');

  const logoData = fs.readFileSync('./src/app/ai/Options/Logo.csv', 'utf8');

  return new Promise((resolve) => {
    parse(logoData, {
      columns: true,
      skip_empty_lines: true
    }, async (err, records) => {
      if (err) {
        console.error('❌ Error parsing logo CSV:', err);
        resolve({ success: false, error: err });
        return;
      }

      // Filter out mold charges (they go in separate table)
      const logoMethods = records.filter(record => record.Name !== 'Mold Charge');

      const logoData = logoMethods.map(record => ({
        name: record.Name,
        application: record.Application,
        size: record.Size,
        size_example: record['Size Example'],
        price_48: parseFloat(record.price48 || 0),
        price_144: parseFloat(record.price144 || 0),
        price_576: parseFloat(record.price576 || 0),
        price_1152: parseFloat(record.price1152 || 0),
        price_2880: parseFloat(record.price2880 || 0),
        price_10000: parseFloat(record.price10000 || 0),
        price_20000: parseFloat(record.price20000 || 0),
        mold_charge_type: record['Mold Charge'] || null,
        tags: {
          method: record.Name,
          application: record.Application,
          size_category: record.Size
        }
      }));

      console.log(`   Inserting ${logoData.length} logo methods...`);

      const { data, error } = await supabase
        .from('logo_methods')
        .upsert(logoData, {
          onConflict: 'name,application,size',
          ignoreDuplicates: false
        })
        .select();

      if (error) {
        console.error('❌ Failed to insert logo methods:', error);
        resolve({ success: false, error });
        return;
      }

      console.log(`✅ Successfully inserted ${data.length} logo methods`);
      resolve({ success: true, data, inserted: data.length });
    });
  });
}

async function migrateMoldCharges() {
  console.log('\n📊 Step 4: Migrating Mold Charges...');

  const logoData = fs.readFileSync('./src/app/ai/Options/Logo.csv', 'utf8');

  return new Promise((resolve) => {
    parse(logoData, {
      columns: true,
      skip_empty_lines: true
    }, async (err, records) => {
      if (err) {
        console.error('❌ Error parsing logo CSV:', err);
        resolve({ success: false, error: err });
        return;
      }

      // Only mold charges
      const moldCharges = records.filter(record => record.Name === 'Mold Charge');

      const moldData = moldCharges.map(record => ({
        size: record.Size,
        size_example: record['Size Example'],
        charge_amount: parseFloat(record.price48 || 0) // Mold charges are flat fees
      }));

      console.log(`   Inserting ${moldData.length} mold charges...`);

      const { data, error } = await supabase
        .from('mold_charges')
        .upsert(moldData, {
          onConflict: 'size',
          ignoreDuplicates: false
        })
        .select();

      if (error) {
        console.error('❌ Failed to insert mold charges:', error);
        resolve({ success: false, error });
        return;
      }

      console.log(`✅ Successfully inserted ${data.length} mold charges`);
      resolve({ success: true, data, inserted: data.length });
    });
  });
}

async function migrateFabrics() {
  console.log('\n📊 Step 5: Migrating Premium Fabrics...');

  const fabricData = fs.readFileSync('./src/app/ai/Options/Fabric.csv', 'utf8');

  return new Promise((resolve) => {
    parse(fabricData, {
      columns: true,
      skip_empty_lines: true
    }, async (err, records) => {
      if (err) {
        console.error('❌ Error parsing fabric CSV:', err);
        resolve({ success: false, error: err });
        return;
      }

      const fabricRecords = records.map(record => {
        const colors = record['Color Note'] && record['Color Note'] !== 'All' ?
          record['Color Note'].split(',').map(c => c.trim()) : [];

        return {
          name: record.Name,
          cost_type: record.costType,
          color_note: record['Color Note'],
          price_48: parseFloat(record.price48 || 0),
          price_144: parseFloat(record.price144 || 0),
          price_576: parseFloat(record.price576 || 0),
          price_1152: parseFloat(record.price1152 || 0),
          price_2880: parseFloat(record.price2880 || 0),
          price_10000: parseFloat(record.price10000 || 0),
          available_colors: colors,
          tags: {
            fabric_type: record.Name,
            cost_category: record.costType
          }
        };
      });

      console.log(`   Inserting ${fabricRecords.length} fabrics...`);

      const { data, error } = await supabase
        .from('premium_fabrics')
        .upsert(fabricRecords, {
          onConflict: 'name',
          ignoreDuplicates: false
        })
        .select();

      if (error) {
        console.error('❌ Failed to insert fabrics:', error);
        resolve({ success: false, error });
        return;
      }

      console.log(`✅ Successfully inserted ${data.length} fabrics`);
      resolve({ success: true, data, inserted: data.length });
    });
  });
}

async function runFullMigration() {
  console.log('🔄 Starting complete CSV data migration...\n');

  let totalInserted = 0;
  let hasErrors = false;

  try {
    // Step 1: Pricing Tiers
    const tiersResult = await migratePricingTiers();
    if (tiersResult.success) {
      totalInserted += tiersResult.inserted;
    } else {
      hasErrors = true;
    }

    // Step 2: Products
    const productsResult = await migrateProducts();
    if (productsResult.success) {
      totalInserted += productsResult.inserted;
    } else {
      hasErrors = true;
    }

    // Step 3: Logo Methods
    const logoResult = await migrateLogoMethods();
    if (logoResult.success) {
      totalInserted += logoResult.inserted;
    } else {
      hasErrors = true;
    }

    // Step 4: Mold Charges
    const moldResult = await migrateMoldCharges();
    if (moldResult.success) {
      totalInserted += moldResult.inserted;
    } else {
      hasErrors = true;
    }

    // Step 5: Fabrics
    const fabricsResult = await migrateFabrics();
    if (fabricsResult.success) {
      totalInserted += fabricsResult.inserted;
    } else {
      hasErrors = true;
    }

    console.log('\n================================================================================');
    if (hasErrors) {
      console.log('⚠️ MIGRATION COMPLETED WITH SOME ERRORS');
    } else {
      console.log('🎯 MIGRATION COMPLETED SUCCESSFULLY!');
    }
    console.log(`✅ Total records inserted: ${totalInserted}`);
    console.log('🔄 Ready for Step 4: High-performance pricing service');

  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

// Run the migration
runFullMigration();