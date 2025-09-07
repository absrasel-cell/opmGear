const fetch = require('node-fetch');
const { PrismaClient } = require('@prisma/client');

async function testQuoteCreation() {
  const prisma = new PrismaClient();
  
  console.log('🎯 TESTING: Quote Creation on Support Page...\n');

  try {
    // Get the test user
    const testUser = await prisma.user.findFirst({
      where: { email: 'absrasel@gmail.com' }
    });
    
    if (!testUser) {
      console.error('❌ Test user not found');
      return;
    }
    
    console.log('👤 Test user:', testUser.email);
    
    // Test quote data matching the structure from errorReport
    const testQuoteData = {
      capDetails: {
        productName: 'Test Custom Cap',
        colors: ['Navy', 'White'],
        profile: '6-Panel',
        billShape: 'Flat',
        structure: 'Structured',
        closure: 'Snapback',
        fabric: 'Cotton',
        sizes: ['One Size']
      },
      customization: {
        logos: [{
          position: 'Front Center',
          technique: 'Embroidery',
          colors: 2
        }],
        accessories: [],
        totalMoldCharges: 0
      },
      delivery: {
        method: 'Standard',
        timeframe: '14-21 business days'
      },
      pricing: {
        quantity: 50,
        baseProductCost: 8.50,
        logosCost: 150.00,
        deliveryCost: 25.00,
        total: 575.00
      }
    };
    
    const sessionId = `quote-${Date.now()}-test`;
    
    console.log('📤 Sending quote creation request...');
    console.log('Session ID:', sessionId);
    
    const response = await fetch('http://localhost:3016/api/support/save-quote', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        quoteData: testQuoteData,
        conversationId: null,
        sessionId: sessionId,
        userProfile: {
          id: testUser.id,
          email: testUser.email,
          name: testUser.name,
          phone: testUser.phone,
          company: testUser.company
        },
        uploadedFiles: []
      })
    });

    console.log('📥 Response status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Quote creation successful!');
      console.log('Quote ID:', data.quoteId);
      console.log('Success:', data.success);
      console.log('Message:', data.message);
      
      // Verify in database
      console.log('\n🔍 Verifying quote in database...');
      
      const quoteOrder = await prisma.quoteOrder.findUnique({
        where: { id: data.quoteId },
        include: { QuoteOrderFile: true }
      });
      
      if (quoteOrder) {
        console.log('✅ Quote found in database!');
        console.log('   ID:', quoteOrder.id);
        console.log('   Session ID:', quoteOrder.sessionId);
        console.log('   Status:', quoteOrder.status);
        console.log('   Product Type:', quoteOrder.productType);
        console.log('   Customer Email:', quoteOrder.customerEmail);
        console.log('   Total Cost:', JSON.stringify(quoteOrder.estimatedCosts));
        
        console.log('\n🎊 COMPLETE SUCCESS! Quote created and stored in database!');
        
      } else {
        console.log('❌ Quote not found in database despite success response');
      }
    } else {
      const errorData = await response.json();
      console.error('❌ Quote creation failed:', response.status);
      console.error('Error details:', errorData);
      
      if (response.status === 503 && errorData.fallback) {
        console.log('\n🔍 Database connectivity issue detected - this matches the error report');
        console.log('Fallback response returned as expected');
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testQuoteCreation();