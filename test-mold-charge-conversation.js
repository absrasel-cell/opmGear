/**
 * QUICK CONVERSATION CONTEXT TEST
 *
 * Simple test using the support-ai API endpoint to test the exact scenario:
 * Step 1: 144 pieces -> should show logos and mold charges
 * Step 2: 600 pieces -> should PRESERVE logos and mold charges
 * Step 3: Color change -> should PRESERVE logos and mold charges
 */

const fs = require('fs');
const path = require('path');

async function testConversationApi() {
  console.log('🧪 TESTING CONVERSATION CONTEXT PRESERVATION VIA API');
  console.log('=' .repeat(60));

  const baseUrl = 'http://localhost:3005';

  // Step 1: Initial request with logos
  console.log('📊 Step 1: Initial request (144 pieces) - should show logos and mold charges');
  console.log('-'.repeat(50));

  const step1Response = await fetch(`${baseUrl}/api/support-ai`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: "I need a quote for 144 pieces, 7P Elite Seven HFS, polyester fabric, laser cut, black/white. Add back rubber patch medium size with $80 mold charge, front leather patch large size with $120 mold charge, left side 3D embroidery small, right side 3D embroidery small.",
      conversationHistory: []
    })
  });

  const step1Data = await step1Response.json();
  console.log('Response (first 500 chars):', step1Data.message?.substring(0, 500) + '...');

  const step1HasMoldCharges = step1Data.message?.includes('$80') && step1Data.message?.includes('$120');
  console.log(`✅ Step 1 Mold Charges Present: ${step1HasMoldCharges ? 'PASS' : 'FAIL'}`);

  // Build conversation history for step 2
  const conversationAfterStep1 = [
    {
      role: 'user',
      content: "I need a quote for 144 pieces, 7P Elite Seven HFS, polyester fabric, laser cut, black/white. Add back rubber patch medium size with $80 mold charge, front leather patch large size with $120 mold charge, left side 3D embroidery small, right side 3D embroidery small."
    },
    {
      role: 'assistant',
      content: step1Data.message || ''
    }
  ];

  console.log('');
  console.log('📊 Step 2: Quantity change (600 pieces) - should PRESERVE logos and mold charges');
  console.log('-'.repeat(50));

  const step2Response = await fetch(`${baseUrl}/api/support-ai`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: "change quantity to 600 pieces",
      conversationHistory: conversationAfterStep1
    })
  });

  const step2Data = await step2Response.json();
  console.log('Response (first 500 chars):', step2Data.message?.substring(0, 500) + '...');

  const step2HasMoldCharges = step2Data.message?.includes('$80') && step2Data.message?.includes('$120');
  const step2HasLogos = step2Data.message?.toLowerCase().includes('rubber') && step2Data.message?.toLowerCase().includes('leather') && step2Data.message?.toLowerCase().includes('3d');
  const step2HasCorrectProduct = step2Data.message?.includes('7P Elite Seven');

  console.log(`✅ Step 2 Mold Charges Preserved: ${step2HasMoldCharges ? 'PASS' : 'FAIL'}`);
  console.log(`✅ Step 2 Logos Preserved: ${step2HasLogos ? 'PASS' : 'FAIL'}`);
  console.log(`✅ Step 2 Product Preserved: ${step2HasCorrectProduct ? 'PASS' : 'FAIL'}`);

  // Build conversation history for step 3
  const conversationAfterStep2 = [
    ...conversationAfterStep1,
    {
      role: 'user',
      content: "change quantity to 600 pieces"
    },
    {
      role: 'assistant',
      content: step2Data.message || ''
    }
  ];

  console.log('');
  console.log('📊 Step 3: Color change - should PRESERVE logos and mold charges');
  console.log('-'.repeat(50));

  const step3Response = await fetch(`${baseUrl}/api/support-ai`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: "change color to red/blue",
      conversationHistory: conversationAfterStep2
    })
  });

  const step3Data = await step3Response.json();
  console.log('Response (first 500 chars):', step3Data.message?.substring(0, 500) + '...');

  const step3HasMoldCharges = step3Data.message?.includes('$80') && step3Data.message?.includes('$120');
  const step3HasLogos = step3Data.message?.toLowerCase().includes('rubber') && step3Data.message?.toLowerCase().includes('leather') && step3Data.message?.toLowerCase().includes('3d');
  const step3HasCorrectProduct = step3Data.message?.includes('7P Elite Seven');

  console.log(`✅ Step 3 Mold Charges Preserved: ${step3HasMoldCharges ? 'PASS' : 'FAIL'}`);
  console.log(`✅ Step 3 Logos Preserved: ${step3HasLogos ? 'PASS' : 'FAIL'}`);
  console.log(`✅ Step 3 Product Preserved: ${step3HasCorrectProduct ? 'PASS' : 'FAIL'}`);

  console.log('');
  console.log('📊 OVERALL TEST RESULTS');
  console.log('-'.repeat(50));

  const allMoldChargesPreserved = step1HasMoldCharges && step2HasMoldCharges && step3HasMoldCharges;
  const allLogosPreserved = step2HasLogos && step3HasLogos;
  const allProductsPreserved = step2HasCorrectProduct && step3HasCorrectProduct;

  console.log(`🎯 Mold Charges: ${allMoldChargesPreserved ? 'ALL PRESERVED ✅' : 'LOST IN CONVERSATION ❌'}`);
  console.log(`🎯 Logos: ${allLogosPreserved ? 'ALL PRESERVED ✅' : 'LOST IN CONVERSATION ❌'}`);
  console.log(`🎯 Product: ${allProductsPreserved ? 'ALL PRESERVED ✅' : 'LOST IN CONVERSATION ❌'}`);

  if (allMoldChargesPreserved && allLogosPreserved && allProductsPreserved) {
    console.log('');
    console.log('🎉 SUCCESS: All conversation context preserved correctly!');
  } else {
    console.log('');
    console.log('❌ FAILURE: Conversation context preservation is broken');
    console.log('');
    console.log('🔧 ISSUES TO FIX:');
    if (!allMoldChargesPreserved) console.log('  - Mold charges being lost during conversation updates');
    if (!allLogosPreserved) console.log('  - Logo specifications being lost during conversation updates');
    if (!allProductsPreserved) console.log('  - Product specifications being lost during conversation updates');
  }

  // Save detailed results for debugging
  const results = {
    step1: { hasMoldCharges: step1HasMoldCharges, response: step1Data.message?.substring(0, 1000) },
    step2: { hasMoldCharges: step2HasMoldCharges, hasLogos: step2HasLogos, hasCorrectProduct: step2HasCorrectProduct, response: step2Data.message?.substring(0, 1000) },
    step3: { hasMoldCharges: step3HasMoldCharges, hasLogos: step3HasLogos, hasCorrectProduct: step3HasCorrectProduct, response: step3Data.message?.substring(0, 1000) }
  };

  fs.writeFileSync(path.join(__dirname, 'test-result.json'), JSON.stringify(results, null, 2));
  console.log('');
  console.log('📁 Detailed results saved to test-result.json');
}

// Utility function to make fetch work in Node.js
global.fetch = global.fetch || require('node-fetch');

// Run the test
testConversationApi().catch(console.error);