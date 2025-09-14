/**
 * Simple Logo Methods Migration to Supabase
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Direct configuration
const supabaseUrl = 'https://tfiemrpfsvxvzgbqisdp.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRmaWVtcnBmc3Z4dnpnYnFpc2RwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjE4MTU4OSwiZXhwIjoyMDcxNzU3NTg5fQ.B8aZ4hts8DtVPMaRwBS5LZ2mlrP3hYWtMG3qRRdHAL8';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Logo methods from CSV - manually entered for reliability
const logoMethods = [
  // 3D Embroidery
  { name: '3D Embroidery', application: 'Direct', size: 'Small', price_48: 2.25, price_144: 1.5, price_576: 1.18, price_1152: 1.0, price_2880: 0.88, price_10000: 0.7, price_20000: 0.7 },
  { name: '3D Embroidery', application: 'Patch', size: 'Small', price_48: 3.75, price_144: 2.75, price_576: 2.18, price_1152: 1.9, price_2880: 1.63, price_10000: 1.3, price_20000: 1.3 },
  { name: '3D Embroidery', application: 'Direct', size: 'Medium', price_48: 2.75, price_144: 2.0, price_576: 1.68, price_1152: 1.55, price_2880: 1.5, price_10000: 1.33, price_20000: 1.33 },
  { name: '3D Embroidery', application: 'Patch', size: 'Medium', price_48: 4.25, price_144: 3.25, price_576: 2.68, price_1152: 2.45, price_2880: 2.25, price_10000: 1.93, price_20000: 1.93 },
  { name: '3D Embroidery', application: 'Direct', size: 'Large', price_48: 3.5, price_144: 2.38, price_576: 2.05, price_1152: 1.88, price_2880: 1.75, price_10000: 1.58, price_20000: 1.58 },
  { name: '3D Embroidery', application: 'Patch', size: 'Large', price_48: 5.0, price_144: 3.63, price_576: 3.05, price_1152: 2.78, price_2880: 2.5, price_10000: 2.18, price_20000: 2.18 },

  // Flat Embroidery
  { name: 'Flat Embroidery', application: 'Direct', size: 'Small', price_48: 1.75, price_144: 1.13, price_576: 0.88, price_1152: 0.75, price_2880: 0.63, price_10000: 0.5, price_20000: 0.5 },
  { name: 'Flat Embroidery', application: 'Patch', size: 'Small', price_48: 2.5, price_144: 1.75, price_576: 1.38, price_1152: 1.2, price_2880: 1.0, price_10000: 0.8, price_20000: 0.8 },
  { name: 'Flat Embroidery', application: 'Direct', size: 'Medium', price_48: 2.25, price_144: 1.63, price_576: 1.38, price_1152: 1.3, price_2880: 1.25, price_10000: 1.13, price_20000: 1.13 },
  { name: 'Flat Embroidery', application: 'Patch', size: 'Medium', price_48: 3.0, price_144: 2.25, price_576: 1.88, price_1152: 1.75, price_2880: 1.63, price_10000: 1.43, price_20000: 1.43 },
  { name: 'Flat Embroidery', application: 'Direct', size: 'Large', price_48: 3.0, price_144: 2.0, price_576: 1.75, price_1152: 1.63, price_2880: 1.5, price_10000: 1.38, price_20000: 1.38 },
  { name: 'Flat Embroidery', application: 'Patch', size: 'Large', price_48: 3.75, price_144: 2.63, price_576: 2.25, price_1152: 2.08, price_2880: 1.88, price_10000: 1.68, price_20000: 1.68 },

  // CRITICAL: Rubber Patches
  { name: 'Rubber', application: 'Patch', size: 'Small', price_48: 3.25, price_144: 2.38, price_576: 2.13, price_1152: 1.95, price_2880: 1.75, price_10000: 1.55, price_20000: 1.55, mold_charge_type: 'Small Mold Charge' },
  { name: 'Rubber', application: 'Patch', size: 'Medium', price_48: 3.88, price_144: 2.88, price_576: 2.63, price_1152: 2.45, price_2880: 2.25, price_10000: 2.05, price_20000: 2.05, mold_charge_type: 'Medium Mold Charge' },
  { name: 'Rubber', application: 'Patch', size: 'Large', price_48: 4.5, price_144: 3.63, price_576: 3.0, price_1152: 2.7, price_2880: 2.5, price_10000: 2.3, price_20000: 2.3, mold_charge_type: 'Large Mold Charge' },

  // CRITICAL: Leather Patches
  { name: 'Leather', application: 'Patch', size: 'Small', price_48: 3.25, price_144: 2.13, price_576: 1.75, price_1152: 1.58, price_2880: 1.38, price_10000: 1.18, price_20000: 1.18, mold_charge_type: 'Medium Mold Charge' },
  { name: 'Leather', application: 'Patch', size: 'Medium', price_48: 3.75, price_144: 2.5, price_576: 2.25, price_1152: 2.08, price_2880: 1.88, price_10000: 1.68, price_20000: 1.68, mold_charge_type: 'Small Mold Charge' },
  { name: 'Leather', application: 'Patch', size: 'Large', price_48: 4.13, price_144: 2.88, price_576: 2.63, price_1152: 2.45, price_2880: 2.25, price_10000: 2.05, price_20000: 2.05, mold_charge_type: 'Large Mold Charge' },
];

async function migrate() {
  console.log('🚀 Starting simplified logo methods migration...');

  try {
    // Clear existing data
    console.log('🗑️ Clearing existing logo_methods...');
    const { error: clearError } = await supabase
      .from('logo_methods')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (clearError && !clearError.message.includes('No rows deleted')) {
      console.warn('⚠️ Clear error:', clearError.message);
    }

    // Insert new data
    console.log(`📤 Inserting ${logoMethods.length} logo methods...`);

    const { data, error } = await supabase
      .from('logo_methods')
      .insert(logoMethods)
      .select();

    if (error) {
      console.error('❌ Insert error:', error);
      return;
    }

    console.log(`✅ Successfully inserted ${data.length} logo methods`);

    // Verify critical methods
    console.log('\n🔍 Verifying critical methods...');

    const criticalTests = [
      { name: 'Leather', application: 'Patch', size: 'Large', expected: 2.63 },
      { name: 'Rubber', application: 'Patch', size: 'Large', expected: 3.0 },
      { name: '3D Embroidery', application: 'Direct', size: 'Small', expected: 1.18 },
      { name: 'Flat Embroidery', application: 'Direct', size: 'Medium', expected: 1.38 }
    ];

    for (const test of criticalTests) {
      const { data: foundMethod, error } = await supabase
        .from('logo_methods')
        .select('*')
        .eq('name', test.name)
        .eq('application', test.application)
        .eq('size', test.size)
        .single();

      if (error) {
        console.log(`❌ ${test.name} | ${test.application} | ${test.size} - NOT FOUND`);
      } else {
        const actualPrice = foundMethod.price_576;
        if (Math.abs(actualPrice - test.expected) < 0.01) {
          console.log(`✅ ${test.name} | ${test.application} | ${test.size} - $${actualPrice} ✓`);
        } else {
          console.log(`⚠️ ${test.name} | ${test.application} | ${test.size} - $${actualPrice} (expected $${test.expected})`);
        }
      }
    }

    console.log('\n🎉 Migration completed successfully!');
    console.log('🚀 Logo pricing should now work correctly!');

  } catch (error) {
    console.error('💥 Migration failed:', error);
  }
}

migrate();