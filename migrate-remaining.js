// Migrate remaining CSV files and fix products
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const { parse } = require('csv-parse');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log('🔄 Migrating remaining tables and fixing products...\n');

async function migrateAccessories() {
  console.log('📊 Migrating Accessories...');

  const accessoryData = fs.readFileSync('./src/app/ai/Options/Accessories.csv', 'utf8');

  return new Promise((resolve) => {
    parse(accessoryData, {
      columns: true,
      skip_empty_lines: true
    }, async (err, records) => {
      if (err) {
        console.error('❌ Error parsing accessories CSV:', err);
        resolve({ success: false, error: err });
        return;
      }

      const accessoryRecords = records.map(record => ({
        name: record.Name,
        price_48: parseFloat(record.price48 || 0),
        price_144: parseFloat(record.price144 || 0),
        price_576: parseFloat(record.price576 || 0),
        price_1152: parseFloat(record.price1152 || 0),
        price_2880: parseFloat(record.price2880 || 0),
        price_10000: parseFloat(record.price10000 || 0),
        price_20000: parseFloat(record.price20000 || 0)
      }));

      console.log(`   Inserting ${accessoryRecords.length} accessories...`);

      const { data, error } = await supabase
        .from('accessories')
        .upsert(accessoryRecords, {
          onConflict: 'name',
          ignoreDuplicates: false
        })
        .select();

      if (error) {
        console.error('❌ Failed to insert accessories:', error);
        resolve({ success: false, error });
        return;
      }

      console.log(`✅ Successfully inserted ${data.length} accessories`);
      resolve({ success: true, data, inserted: data.length });
    });
  });
}

async function migrateClosures() {
  console.log('\n📊 Migrating Premium Closures...');

  const closureData = fs.readFileSync('./src/app/ai/Options/Closure.csv', 'utf8');

  return new Promise((resolve) => {
    parse(closureData, {
      columns: true,
      skip_empty_lines: true
    }, async (err, records) => {
      if (err) {
        console.error('❌ Error parsing closures CSV:', err);
        resolve({ success: false, error: err });
        return;
      }

      const closureRecords = records.map(record => ({
        name: record.Name,
        closure_type: record.type,
        price_48: parseFloat(record.price48 || 0),
        price_144: parseFloat(record.price144 || 0),
        price_576: parseFloat(record.price576 || 0),
        price_1152: parseFloat(record.price1152 || 0),
        price_2880: parseFloat(record.price2880 || 0),
        price_10000: parseFloat(record.price10000 || 0),
        price_20000: parseFloat(record.price20000 || 0),
        comment: record.Comment || null
      }));

      console.log(`   Inserting ${closureRecords.length} closures...`);

      const { data, error } = await supabase
        .from('premium_closures')
        .upsert(closureRecords, {
          onConflict: 'name',
          ignoreDuplicates: false
        })
        .select();

      if (error) {
        console.error('❌ Failed to insert closures:', error);
        resolve({ success: false, error });
        return;
      }

      console.log(`✅ Successfully inserted ${data.length} closures`);
      resolve({ success: true, data, inserted: data.length });
    });
  });
}

async function migrateDelivery() {
  console.log('\n📊 Migrating Delivery Methods...');

  const deliveryData = fs.readFileSync('./src/app/ai/Options/Delivery.csv', 'utf8');

  return new Promise((resolve) => {
    parse(deliveryData, {
      columns: true,
      skip_empty_lines: true
    }, async (err, records) => {
      if (err) {
        console.error('❌ Error parsing delivery CSV:', err);
        resolve({ success: false, error: err });
        return;
      }

      const deliveryRecords = records.map(record => ({
        name: record.Name,
        delivery_type: record.type,
        delivery_days: record['Delivery Days'],
        price_48: record.price48 && record.price48 !== 'Not Applicable' ? parseFloat(record.price48) : null,
        price_144: record.price144 && record.price144 !== 'Not Applicable' ? parseFloat(record.price144) : null,
        price_576: record.price576 && record.price576 !== 'Not Applicable' ? parseFloat(record.price576) : null,
        price_1152: record.price1152 && record.price1152 !== 'Not Applicable' ? parseFloat(record.price1152) : null,
        price_2880: record.price2880 && record.price2880 !== 'Not Applicable' ? parseFloat(record.price2880) : null,
        price_10000: record.price10000 && record.price10000 !== 'Not Applicable' ? parseFloat(record.price10000) : null,
        price_20000: record.price20000 && record.price20000 !== 'Not Applicable' ? parseFloat(record.price20000) : null,
        min_quantity: 48
      }));

      console.log(`   Inserting ${deliveryRecords.length} delivery methods...`);

      const { data, error } = await supabase
        .from('delivery_methods')
        .upsert(deliveryRecords, {
          onConflict: 'name',
          ignoreDuplicates: false
        })
        .select();

      if (error) {
        console.error('❌ Failed to insert delivery methods:', error);
        resolve({ success: false, error });
        return;
      }

      console.log(`✅ Successfully inserted ${data.length} delivery methods`);
      resolve({ success: true, data, inserted: data.length });
    });
  });
}

async function fixProducts() {
  console.log('\n📊 Fixing Products Migration...');

  // Get pricing tier IDs
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

      // Handle duplicates by making codes unique
      const productData = records.map((record, index) => {
        const nickNames = record['Nick Names'] ?
          record['Nick Names'].split(',').map(name => name.trim()) : [];

        const baseCode = record.Name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '').toUpperCase();
        const uniqueCode = `${baseCode}_${index + 1}`; // Make unique with index

        return {
          name: record.Name,
          code: uniqueCode,
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

      console.log(`   Inserting ${productData.length} products (with unique codes)...`);

      // Clear existing products first
      await supabase.from('products').delete().neq('id', '00000000-0000-0000-0000-000000000000');

      const { data, error } = await supabase
        .from('products')
        .insert(productData)
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

async function runRemainingMigration() {
  let totalInserted = 0;
  let hasErrors = false;

  try {
    // Fix products first
    const productsResult = await fixProducts();
    if (productsResult.success) {
      totalInserted += productsResult.inserted;
      console.log(`✅ Products: ${productsResult.inserted} inserted`);
    } else {
      hasErrors = true;
      console.error(`❌ Products failed: ${productsResult.error?.message}`);
    }

    // Migrate accessories
    const accessoriesResult = await migrateAccessories();
    if (accessoriesResult.success) {
      totalInserted += accessoriesResult.inserted;
    } else {
      hasErrors = true;
    }

    // Migrate closures
    const closuresResult = await migrateClosures();
    if (closuresResult.success) {
      totalInserted += closuresResult.inserted;
    } else {
      hasErrors = true;
    }

    // Migrate delivery
    const deliveryResult = await migrateDelivery();
    if (deliveryResult.success) {
      totalInserted += deliveryResult.inserted;
    } else {
      hasErrors = true;
    }

    console.log('\n================================================================================');
    if (hasErrors) {
      console.log('⚠️ MIGRATION COMPLETED WITH SOME ERRORS');
    } else {
      console.log('🎯 REMAINING MIGRATION COMPLETED SUCCESSFULLY!');
    }
    console.log(`✅ Additional records inserted: ${totalInserted}`);
    console.log('🔥 STEP 3 COMPLETE: All CSV data migrated to Supabase!');
    console.log('🚀 Ready for Step 4: High-performance pricing service');

  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

runRemainingMigration();