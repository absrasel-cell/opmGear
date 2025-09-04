/**
 * Test LogoCraft Pro → Quote Creator Integration
 * 
 * This script tests the enhanced integration between LogoCraft Pro and Quote Creator
 * to ensure seamless logo analysis → complete quote workflow.
 */

const fetch = require('node-fetch');

const API_BASE = 'http://localhost:3002/api/support';

// Test conversation data with LogoCraft Pro analysis
const mockConversationWithLogoCraftPro = [
  {
    role: 'user',
    content: 'I uploaded my company logo for analysis'
  },
  {
    role: 'assistant',
    content: `I've analyzed your logo and here are my professional recommendations:

**Logo Analysis Results:**
- **Logo Type:** Text + Symbol combination
- **Detected Text:** "TECH SOLUTIONS"
- **Colors:** Black, Blue, White (3 colors total)
- **Recommended Method:** Large 3D Embroidery for premium finish
- **Best Position:** Front center for maximum impact
- **Production Notes:** Clean text design perfect for embroidery

**Cost Analysis:**
- Large 3D Embroidery: $0.20 per piece (for 500+ caps)
- No mold charges required
- Estimated timeline: 7-10 business days

This logo will look fantastic on your custom caps with the recommended 3D embroidery treatment!`,
    metadata: {
      assistant: 'LOGO_EXPERT',
      model: 'gpt-4o',
      imageAnalysisResults: [
        {
          analysis: {
            logoType: 'Text + Symbol Logo',
            detectedText: 'TECH SOLUTIONS',
            colorCount: 3,
            colors: ['Black', 'Blue', 'White'],
            recommendedMethod: '3D Embroidery',
            recommendedSize: 'Large',
            recommendedPosition: 'Front',
            complexity: 'Medium',
            moldChargeRequired: false,
            productionNotes: 'Clean text design suitable for 3D embroidery with excellent definition'
          }
        }
      ]
    }
  }
];

async function testLogoCraftProIntegration() {
  console.log('🧪 Testing LogoCraft Pro → Quote Creator Integration\n');

  try {
    // Step 1: Test Quote Creator with LogoCraft Pro conversation history
    console.log('1️⃣ Testing Quote Creator with LogoCraft Pro analysis data...');
    
    const quoteRequest = {
      message: 'I need a complete quote for 500 custom baseball caps with my logo. Black caps with the logo we analyzed earlier on the front.',
      intent: 'ORDER_CREATION',
      conversationHistory: mockConversationWithLogoCraftPro,
      userProfile: {
        name: 'John Smith',
        email: 'john@techsolutions.com',
        company: 'Tech Solutions Inc.'
      },
      sessionId: 'test-session-' + Date.now(),
      conversationId: 'test-conv-' + Date.now()
    };

    console.log('📡 Making request to:', `${API_BASE}/order-creation`);
    console.log('📤 Request body:', JSON.stringify(quoteRequest, null, 2).substring(0, 500) + '...');
    
    const response = await fetch(`${API_BASE}/order-creation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(quoteRequest)
    });

    console.log('📥 Response status:', response.status);
    console.log('📥 Response headers:', Object.fromEntries(response.headers));
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API Error Response:', errorText);
      throw new Error(`API Error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();
    
    console.log('✅ Quote Creator Response Received');
    console.log('📋 Assistant:', result.assistant?.displayName || result.assistant?.name);
    console.log('🎯 Integration Status:', result.metadata?.logoCraftProIntegration ? 'INTEGRATED' : 'NOT INTEGRATED');
    
    if (result.metadata?.logoCraftProIntegration) {
      const integration = result.metadata.logoCraftProIntegration;
      console.log('🔍 Data Source:', integration.dataSource);
      console.log('📊 Analysis Items:', integration.analysisItemCount);
      console.log('✨ Quote Generated:', integration.completedQuote ? 'YES' : 'NO');
    }

    console.log('\n💬 Customer Message:');
    console.log(result.message.substring(0, 500) + '...\n');

    if (result.quoteData) {
      console.log('📝 Quote Data Generated:');
      console.log('- Quote ID:', result.quoteData.quoteId);
      console.log('- Quantity:', result.quoteData.pricing?.quantity);
      console.log('- Total Cost: $' + result.quoteData.pricing?.total);
      
      if (result.quoteData.customization?.logos?.length > 0) {
        console.log('🎨 Logo Customization:');
        result.quoteData.customization.logos.forEach((logo, index) => {
          console.log(`  ${index + 1}. ${logo.size} ${logo.type} on ${logo.location} - $${logo.totalCost}`);
        });
      }

      console.log('💰 Pricing Breakdown:');
      console.log('- Base Product: $' + result.quoteData.pricing?.baseProductCost);
      console.log('- Logo Customization: $' + result.quoteData.pricing?.logosCost);
      console.log('- Delivery: $' + result.quoteData.pricing?.deliveryCost);
      console.log('- TOTAL: $' + result.quoteData.pricing?.total);
    }

    // Step 2: Validation checks
    console.log('\n🔍 Integration Validation:');
    
    const validations = [
      {
        test: 'LogoCraft Pro data detected',
        passed: !!result.metadata?.logoCraftProIntegration,
        details: result.metadata?.logoCraftProIntegration?.dataSource || 'No integration detected'
      },
      {
        test: 'Complete quote generated',
        passed: !!result.quoteData && !!result.quoteData.pricing?.total,
        details: result.quoteData ? `Total: $${result.quoteData.pricing?.total}` : 'No quote data'
      },
      {
        test: 'Logo customization included',
        passed: !!result.quoteData?.customization?.logos?.length,
        details: result.quoteData?.customization?.logos?.length + ' logos' || 'No logos'
      },
      {
        test: 'References LogoCraft Pro analysis',
        passed: result.message?.toLowerCase().includes('logo') && 
                result.message?.toLowerCase().includes('analysis'),
        details: result.message?.includes('LogoCraft') ? 'References LogoCraft Pro' : 'Generic response'
      },
      {
        test: '3D Embroidery method used (as per LogoCraft Pro)',
        passed: result.quoteData?.customization?.logos?.some(logo => 
          logo.type?.includes('3D Embroidery')),
        details: result.quoteData?.customization?.logos?.[0]?.type || 'No logo type'
      }
    ];

    validations.forEach(validation => {
      const status = validation.passed ? '✅' : '❌';
      console.log(`${status} ${validation.test}: ${validation.details}`);
    });

    const passedCount = validations.filter(v => v.passed).length;
    const totalCount = validations.length;
    
    console.log(`\n📊 Integration Score: ${passedCount}/${totalCount} (${Math.round(passedCount/totalCount*100)}%)`);

    if (passedCount === totalCount) {
      console.log('🎉 Perfect Integration! LogoCraft Pro → Quote Creator workflow is working seamlessly.');
    } else if (passedCount >= totalCount * 0.8) {
      console.log('✅ Good Integration! Minor improvements may be needed.');
    } else {
      console.log('⚠️  Integration Issues Detected! Please review the implementation.');
    }

  } catch (error) {
    console.error('❌ Test Failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

async function testWithoutLogoCraftPro() {
  console.log('\n🧪 Testing Quote Creator WITHOUT LogoCraft Pro data (baseline)...');
  
  try {
    const quoteRequest = {
      message: 'I need a quote for 500 black baseball caps with a logo on the front.',
      intent: 'ORDER_CREATION',
      conversationHistory: [],
      userProfile: {
        name: 'Jane Doe',
        email: 'jane@example.com'
      },
      sessionId: 'test-session-baseline-' + Date.now()
    };

    const response = await fetch(`${API_BASE}/order-creation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(quoteRequest)
    });

    const result = await response.json();
    
    console.log('📋 Baseline Response (without LogoCraft Pro):');
    console.log('🎯 Integration Status:', result.metadata?.logoCraftProIntegration ? 'INTEGRATED' : 'NO INTEGRATION (EXPECTED)');
    console.log('💬 Uses default logo setup:', 
      result.quoteData?.customization?.logos?.some(logo => 
        logo.type?.includes('3D Embroidery') && logo.location === 'Front'
      ) ? 'YES' : 'NO'
    );

    console.log('✅ Baseline test completed');

  } catch (error) {
    console.error('❌ Baseline test failed:', error.message);
  }
}

// Run the tests
async function runAllTests() {
  console.log('🚀 Starting LogoCraft Pro Integration Tests...\n');
  
  await testLogoCraftProIntegration();
  await testWithoutLogoCraftPro();
  
  console.log('\n✨ All tests completed!');
}

runAllTests().catch(console.error);