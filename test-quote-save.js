const fetch = require('node-fetch');

async function testQuoteSave() {
  console.log('🧪 Testing save-quote API with mock data...');
  
  const mockQuoteData = {
    quoteData: {
      capDetails: {
        productName: 'Test Cap',
        colors: ['Navy', 'White'],
        profile: 'Structured',
        billShape: 'Flat',
        structure: 'Structured',
        closure: 'Snapback',
        fabric: 'Cotton',
        sizes: ['One Size']
      },
      customization: {
        logos: [{
          name: 'Test Logo',
          placement: 'Front',
          colors: ['Red']
        }],
        accessories: [],
        totalMoldCharges: 0
      },
      delivery: {
        method: 'Standard',
        timeframe: '2-3 weeks'
      },
      pricing: {
        quantity: 25,
        baseProductCost: 12.50,
        logosCost: 2.00,
        deliveryCost: 5.00,
        total: 487.50
      }
    },
    conversationId: null,
    sessionId: `test-${Date.now()}`,
    userProfile: {
      name: 'Test User',
      email: 'test@example.com',
      company: 'Test Company'
    },
    uploadedFiles: []
  };

  try {
    const response = await fetch('http://localhost:3003/api/support/save-quote', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(mockQuoteData)
    });

    const result = await response.json();
    
    console.log('📊 Response Status:', response.status);
    console.log('📋 Response Body:', JSON.stringify(result, null, 2));
    
    if (response.ok) {
      console.log('✅ Quote save test PASSED!');
      return true;
    } else {
      console.log('❌ Quote save test FAILED!');
      return false;
    }
  } catch (error) {
    console.error('💥 Test error:', error.message);
    return false;
  }
}

testQuoteSave().then(() => {
  console.log('🏁 Test completed');
  process.exit(0);
}).catch(error => {
  console.error('💥 Unexpected error:', error);
  process.exit(1);
});