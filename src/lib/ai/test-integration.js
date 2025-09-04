// Simple test script to verify AI Support system integration
const fs = require('fs');
const path = require('path');

console.log('🔍 Testing AI Support System Integration...\n');

// Test 1: Check if all required files exist
const requiredFiles = [
  'src/app/support/page.tsx',
  'src/app/api/support/intent/route.ts',
  'src/app/api/support/profile/route.ts', 
  'src/app/api/support/public-queries/route.ts',
  'src/app/api/support/order-creation/route.ts',
  'src/lib/ai/csv-loader.ts',
  'src/app/ai/instructions/gpt-4o-mini-intent-detection.md',
  'src/app/ai/instructions/gpt-5o-order-creation.md',
  'src/app/ai/instructions/gpt-4o-mini-public-queries.md'
];

console.log('📁 Checking required files...');
let allFilesExist = true;

requiredFiles.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - MISSING`);
    allFilesExist = false;
  }
});

// Test 2: Check CSV data files
console.log('\n📊 Checking CSV data files...');
const csvFiles = [
  'src/app/ai/Blank Cap/Customer Products.csv',
  'src/app/ai/Blank Cap/priceTier.csv',
  'src/app/ai/Options/Logo.csv',
  'src/app/ai/Options/Colors.csv',
  'src/app/ai/Options/Size.csv',
  'src/app/ai/Options/Accessories.csv',
  'src/app/ai/Options/Closure.csv',
  'src/app/ai/Options/Fabric.csv',
  'src/app/ai/Options/Delivery.csv'
];

let allCsvExist = true;
csvFiles.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  if (fs.existsSync(filePath)) {
    const stats = fs.statSync(filePath);
    console.log(`✅ ${file} (${stats.size} bytes)`);
  } else {
    console.log(`❌ ${file} - MISSING`);
    allCsvExist = false;
  }
});

// Test 3: Check environment variables
console.log('\n🔧 Checking environment variables...');
const requiredEnvVars = [
  'OPENAI_API_KEY',
  'DATABASE_URL',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY'
];

let allEnvVarsSet = true;
requiredEnvVars.forEach(envVar => {
  if (process.env[envVar]) {
    console.log(`✅ ${envVar} is set`);
  } else {
    console.log(`⚠️ ${envVar} is NOT set`);
    allEnvVarsSet = false;
  }
});

// Test 4: Check package dependencies
console.log('\n📦 Checking package dependencies...');
const packageJsonPath = path.join(process.cwd(), 'package.json');
if (fs.existsSync(packageJsonPath)) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const requiredDeps = [
    'csv-parser',
    'uuid',
    '@types/uuid',
    '@supabase/supabase-js',
    '@prisma/client'
  ];
  
  let allDepsInstalled = true;
  requiredDeps.forEach(dep => {
    if (packageJson.dependencies?.[dep] || packageJson.devDependencies?.[dep]) {
      console.log(`✅ ${dep} is installed`);
    } else {
      console.log(`❌ ${dep} is NOT installed`);
      allDepsInstalled = false;
    }
  });
} else {
  console.log('❌ package.json not found');
}

// Summary
console.log('\n📋 Integration Test Summary:');
console.log(`Files: ${allFilesExist ? '✅' : '❌'}`);
console.log(`CSV Data: ${allCsvExist ? '✅' : '❌'}`);
console.log(`Environment: ${allEnvVarsSet ? '✅' : '⚠️'}`);

if (allFilesExist && allCsvExist) {
  console.log('\n🎉 AI Support System is ready for testing!');
  console.log('\nNext steps:');
  console.log('1. Set OPENAI_API_KEY environment variable');
  console.log('2. Start the development server: npm run dev');
  console.log('3. Navigate to /support to test the system');
  console.log('4. Try different types of queries:');
  console.log('   - "I need 100 navy caps with logo" (ORDER_CREATION)');
  console.log('   - "What\'s my order status?" (PUBLIC_QUERY)');
  console.log('   - "Help me with shipping" (GENERAL_SUPPORT)');
} else {
  console.log('\n❌ Integration test failed. Please fix the missing components.');
}

console.log('\n' + '='.repeat(60));