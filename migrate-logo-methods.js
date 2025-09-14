/**
 * CRITICAL MIGRATION: Logo Methods CSV to Supabase
 * Migrates ALL 37 logo methods from Logo.csv to Supabase database
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl);
  console.error('SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Parse CSV data
function parseCSV(csvText) {
  const lines = csvText.trim().split('\n');
  const headers = lines[0].split(',');

  const data = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    if (values.length >= headers.length) {
      const row = {};
      headers.forEach((header, index) => {
        row[header.trim()] = values[index]?.trim() || '';
      });
      data.push(row);
    }
  }

  return data;
}

// Convert CSV row to Supabase logo_methods format
function convertToSupabaseFormat(csvRow) {
  return {
    name: csvRow.Name,
    application: csvRow.Application,
    size: csvRow.Size,
    size_example: csvRow['Size Example'],
    price_48: parseFloat(csvRow.price48) || 0,
    price_144: parseFloat(csvRow.price144) || 0,
    price_576: parseFloat(csvRow.price576) || 0,
    price_1152: parseFloat(csvRow.price1152) || 0,
    price_2880: parseFloat(csvRow.price2880) || 0,
    price_10000: parseFloat(csvRow.price10000) || 0,
    price_20000: parseFloat(csvRow.price20000) || 0,
    mold_charge_type: csvRow['Mold Charge'] || null,
    tags: {
      category: getLogoCategory(csvRow.Name),
      hasDirectApplication: csvRow.Application === 'Direct',
      hasPatchApplication: csvRow.Application === 'Patch',
      requiresMoldCharge: !!csvRow['Mold Charge']
    }
  };
}

function getLogoCategory(name) {
  if (name.includes('Embroidery')) return 'embroidery';
  if (name.includes('Print')) return 'print';
  if (name.includes('Sublimation')) return 'print';
  if (name.includes('Woven')) return 'patch';
  if (name.includes('Rubber')) return 'patch';
  if (name.includes('Leather')) return 'patch';
  if (name.includes('Mold')) return 'charge';
  return 'other';
}

async function migrateLogoMethods() {
  console.log('🚀 [LOGO-MIGRATION] Starting critical logo methods migration...');

  try {
    // Read CSV file
    const csvPath = path.join(process.cwd(), 'src', 'app', 'ai', 'Options', 'Logo.csv');
    console.log('📂 Reading CSV file:', csvPath);

    if (!fs.existsSync(csvPath)) {
      throw new Error(`CSV file not found: ${csvPath}`);
    }

    const csvContent = fs.readFileSync(csvPath, 'utf8');
    const csvData = parseCSV(csvContent);

    console.log(`📊 Found ${csvData.length} logo methods in CSV`);

    // Clear existing data (optional - comment out if you want to preserve existing data)
    console.log('🗑️ Clearing existing logo_methods table...');
    const { error: clearError } = await supabase
      .from('logo_methods')
      .delete()
      .gte('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (clearError) {
      console.warn('⚠️ Could not clear existing data:', clearError.message);
    } else {
      console.log('✅ Existing data cleared');
    }

    // Convert and insert data
    const supabaseRecords = csvData.map(convertToSupabaseFormat);
    const successfulInserts = [];
    const failedInserts = [];

    console.log('📤 Inserting logo methods into Supabase...');

    // Insert records in batches to handle large datasets
    const batchSize = 10;
    for (let i = 0; i < supabaseRecords.length; i += batchSize) {
      const batch = supabaseRecords.slice(i, i + batchSize);

      const { data, error } = await supabase
        .from('logo_methods')
        .insert(batch)
        .select();

      if (error) {
        console.error(`❌ Batch ${Math.floor(i / batchSize) + 1} failed:`, error.message);
        failedInserts.push(...batch.map(record => ({ record, error: error.message })));
      } else {
        console.log(`✅ Batch ${Math.floor(i / batchSize) + 1} inserted successfully (${data.length} records)`);
        successfulInserts.push(...data);
      }

      // Add small delay between batches
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Summary
    console.log('\n📊 MIGRATION SUMMARY:');
    console.log(`  📂 CSV Records: ${csvData.length}`);
    console.log(`  ✅ Successfully Inserted: ${successfulInserts.length}`);
    console.log(`  ❌ Failed Inserts: ${failedInserts.length}`);

    if (failedInserts.length > 0) {
      console.log('\n❌ FAILED INSERTIONS:');
      failedInserts.forEach((failure, index) => {
        console.log(`  ${index + 1}. ${failure.record.name} | ${failure.record.application} | ${failure.record.size}`);
        console.log(`     Error: ${failure.error}`);
      });
    }

    // Verify critical methods
    console.log('\n🔍 Verifying critical logo methods...');

    const criticalMethods = [
      { name: '3D Embroidery', application: 'Direct', size: 'Small' },
      { name: 'Flat Embroidery', application: 'Direct', size: 'Medium' },
      { name: 'Leather', application: 'Patch', size: 'Large' },
      { name: 'Rubber', application: 'Patch', size: 'Large' }
    ];

    for (const critical of criticalMethods) {
      const { data, error } = await supabase
        .from('logo_methods')
        .select('*')
        .eq('name', critical.name)
        .eq('application', critical.application)
        .eq('size', critical.size)
        .single();

      if (error) {
        console.log(`❌ Critical method NOT FOUND: ${critical.name} | ${critical.application} | ${critical.size}`);
      } else {
        console.log(`✅ Critical method verified: ${critical.name} | ${critical.application} | ${critical.size} | $${data.price_576} (576 tier)`);
      }
    }

    console.log('\n🎉 Logo methods migration completed!');

    if (successfulInserts.length === csvData.length) {
      console.log('✅ ALL RECORDS MIGRATED SUCCESSFULLY!');
      console.log('🚀 System is now ready for production with complete logo pricing');
    } else {
      console.log('⚠️ PARTIAL MIGRATION - Some records failed');
      console.log('❗ Manual review required for failed records');
    }

  } catch (error) {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
migrateLogoMethods();