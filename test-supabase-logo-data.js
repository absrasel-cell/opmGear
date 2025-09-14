/**
 * Test script to check what logo methods are actually in Supabase
 * Compares with CSV data to find missing entries
 */

import { loadLogoMethods } from './src/lib/pricing/pricing-service.js';

// Expected logo methods from CSV
const expectedMethods = [
  // 3D Embroidery
  { name: '3D Embroidery', application: 'Direct', size: 'Small', price576: 1.18 },
  { name: '3D Embroidery', application: 'Patch', size: 'Small', price576: 2.18 },
  { name: '3D Embroidery', application: 'Direct', size: 'Medium', price576: 1.68 },
  { name: '3D Embroidery', application: 'Patch', size: 'Medium', price576: 2.68 },
  { name: '3D Embroidery', application: 'Direct', size: 'Large', price576: 2.05 },
  { name: '3D Embroidery', application: 'Patch', size: 'Large', price576: 3.05 },

  // Flat Embroidery
  { name: 'Flat Embroidery', application: 'Direct', size: 'Small', price576: 0.88 },
  { name: 'Flat Embroidery', application: 'Patch', size: 'Small', price576: 1.38 },
  { name: 'Flat Embroidery', application: 'Direct', size: 'Medium', price576: 1.38 },
  { name: 'Flat Embroidery', application: 'Patch', size: 'Medium', price576: 1.88 },
  { name: 'Flat Embroidery', application: 'Direct', size: 'Large', price576: 1.75 },
  { name: 'Flat Embroidery', application: 'Patch', size: 'Large', price576: 2.25 },

  // Screen Print
  { name: 'Screen Print', application: 'Direct', size: 'Small', price576: 0.88 },
  { name: 'Screen Print', application: 'Patch', size: 'Small', price576: 1.38 },
  { name: 'Screen Print', application: 'Direct', size: 'Medium', price576: 1.38 },
  { name: 'Screen Print', application: 'Patch', size: 'Medium', price576: 1.88 },
  { name: 'Screen Print', application: 'Direct', size: 'Large', price576: 1.75 },
  { name: 'Screen Print', application: 'Patch', size: 'Large', price576: 2.25 },

  // Sublimation
  { name: 'Sublimation', application: 'Direct', size: 'Small', price576: 0.88 },
  { name: 'Sublimation', application: 'Patch', size: 'Small', price576: 1.38 },
  { name: 'Sublimation', application: 'Direct', size: 'Medium', price576: 1.38 },
  { name: 'Sublimation', application: 'Patch', size: 'Medium', price576: 1.88 },
  { name: 'Sublimation', application: 'Direct', size: 'Large', price576: 1.75 },
  { name: 'Sublimation', application: 'Patch', size: 'Large', price576: 2.25 },

  // Woven Patches
  { name: 'Woven', application: 'Patch', size: 'Small', price576: 1.50 },
  { name: 'Woven', application: 'Patch', size: 'Medium', price576: 2.00 },
  { name: 'Woven', application: 'Patch', size: 'Large', price576: 2.50 },

  // CRITICAL MISSING PATCHES
  { name: 'Rubber', application: 'Patch', size: 'Small', price576: 2.13, moldCharge: 'Small Mold Charge' },
  { name: 'Rubber', application: 'Patch', size: 'Medium', price576: 2.63, moldCharge: 'Medium Mold Charge' },
  { name: 'Rubber', application: 'Patch', size: 'Large', price576: 3.00, moldCharge: 'Large Mold Charge' },

  { name: 'Leather', application: 'Patch', size: 'Small', price576: 1.75, moldCharge: 'Medium Mold Charge' },
  { name: 'Leather', application: 'Patch', size: 'Medium', price576: 2.25, moldCharge: 'Small Mold Charge' },
  { name: 'Leather', application: 'Patch', size: 'Large', price576: 2.63, moldCharge: 'Large Mold Charge' },
];

async function testSupabaseLogoData() {
  console.log('🔍 [LOGO-DATA-TEST] Testing Supabase logo_methods table...');

  try {
    // Load all logo methods from Supabase
    const supabaseMethods = await loadLogoMethods();

    console.log(`📊 [LOGO-DATA-TEST] Found ${supabaseMethods.length} logo methods in Supabase`);

    if (supabaseMethods.length === 0) {
      console.error('❌ [LOGO-DATA-TEST] NO LOGO METHODS FOUND IN SUPABASE!');
      return;
    }

    console.log('\n📋 [LOGO-DATA-TEST] Supabase logo methods:');
    supabaseMethods.forEach(method => {
      console.log(`  - ${method.name} | ${method.application} | ${method.size} | $${method.price_576} (576 tier)`);
    });

    console.log('\n🔍 [LOGO-DATA-TEST] Checking for missing methods...');

    const missingMethods = [];

    expectedMethods.forEach(expected => {
      const found = supabaseMethods.find(supabase =>
        supabase.name.toLowerCase() === expected.name.toLowerCase() &&
        supabase.application.toLowerCase() === expected.application.toLowerCase() &&
        supabase.size.toLowerCase() === expected.size.toLowerCase()
      );

      if (!found) {
        missingMethods.push(expected);
        console.log(`❌ [MISSING] ${expected.name} | ${expected.application} | ${expected.size} | $${expected.price576}`);
      } else {
        // Check if price matches
        const expectedPrice = expected.price576;
        const actualPrice = found.price_576;
        if (Math.abs(expectedPrice - actualPrice) > 0.01) {
          console.log(`⚠️ [PRICE-MISMATCH] ${expected.name} | ${expected.application} | ${expected.size} | Expected: $${expectedPrice}, Got: $${actualPrice}`);
        } else {
          console.log(`✅ [FOUND] ${expected.name} | ${expected.application} | ${expected.size} | $${actualPrice}`);
        }
      }
    });

    console.log(`\n📊 [LOGO-DATA-TEST] Summary:`);
    console.log(`  - Total expected: ${expectedMethods.length}`);
    console.log(`  - Found in Supabase: ${supabaseMethods.length}`);
    console.log(`  - Missing: ${missingMethods.length}`);

    if (missingMethods.length > 0) {
      console.log(`\n❌ [CRITICAL] Missing logo methods:`);
      missingMethods.forEach(missing => {
        console.log(`  - ${missing.name} | ${missing.application} | ${missing.size} | $${missing.price576}`);
      });
    }

    // Test specific methods that were problematic
    console.log('\n🎯 [SPECIFIC-TEST] Testing problem logo methods...');

    const problemMethods = [
      { name: 'Leather Patch', searchName: 'Leather', application: 'Patch', size: 'Large' },
      { name: 'Rubber Patch', searchName: 'Rubber', application: 'Patch', size: 'Large' },
      { name: '3D Embroidery', searchName: '3D Embroidery', application: 'Direct', size: 'Small' },
      { name: 'Flat Embroidery', searchName: 'Flat Embroidery', application: 'Direct', size: 'Small' }
    ];

    for (const problem of problemMethods) {
      const found = supabaseMethods.find(method =>
        method.name.toLowerCase().includes(problem.searchName.toLowerCase()) &&
        method.size.toLowerCase() === problem.size.toLowerCase() &&
        method.application.toLowerCase() === problem.application.toLowerCase()
      );

      if (found) {
        console.log(`✅ [FOUND] ${problem.name}: $${found.price_576} (576 tier)`);
      } else {
        console.log(`❌ [MISSING] ${problem.name}: Not found in Supabase`);
      }
    }

  } catch (error) {
    console.error('💥 [LOGO-DATA-TEST] Error:', error);
  }
}

// Run the test
testSupabaseLogoData();