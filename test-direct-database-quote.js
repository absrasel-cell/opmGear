const { PrismaClient } = require('@prisma/client');
const { nanoid } = require('nanoid');

async function testDirectDatabaseQuote() {
  console.log('🎯 TESTING: Direct Database Quote Operation...\n');
  
  const prisma = new PrismaClient();
  
  try {
    console.log('📊 Testing QuoteOrder table access...');
    
    // First, let's see if we can query the QuoteOrder table at all
    const existingQuotesCount = await prisma.quoteOrder.count();
    console.log('✅ Existing quotes in database:', existingQuotesCount);
    
    // Test finding a quote by sessionId (the same operation that's failing)
    const testSessionId = `test-session-${Date.now()}`;
    console.log('\n🔍 Testing findUnique operation with sessionId:', testSessionId);
    
    const existingQuote = await prisma.quoteOrder.findUnique({
      where: { sessionId: testSessionId },
      include: { QuoteOrderFile: true }
    });
    
    if (!existingQuote) {
      console.log('✅ findUnique returned null as expected (no quote with that sessionId)');
    } else {
      console.log('🟠 Found existing quote:', existingQuote.id);
    }
    
    // Test creating a quote (the next operation in the failing flow)
    const quoteId = `QUO-${nanoid(8).toUpperCase()}`;
    console.log('\n💾 Testing quote creation...');
    console.log('Quote ID:', quoteId);
    
    const testQuoteData = {
      id: quoteId,
      sessionId: testSessionId,
      status: 'QUOTED',
      title: 'Direct Test Quote',
      customerEmail: 'test@example.com',
      customerName: 'Test Customer',
      productType: 'Test Custom Cap',
      quantities: { quantity: 50 },
      colors: { colors: ['Navy', 'White'] },
      logoRequirements: {
        logos: [{
          position: 'Front Center',
          technique: 'Embroidery',
          colors: 2
        }]
      },
      customizationOptions: {
        accessories: [],
        moldCharges: 0,
        delivery: {
          method: 'Standard',
          timeframe: '14-21 business days'
        }
      },
      extractedSpecs: {
        profile: '6-Panel',
        billShape: 'Flat',
        structure: 'Structured',
        closure: 'Snapback',
        fabric: 'Cotton',
        sizes: ['One Size']
      },
      estimatedCosts: {
        baseProductCost: 8.50,
        logosCost: 150.00,
        deliveryCost: 25.00,
        total: 575.00
      },
      aiSummary: 'Direct database test quote for 50 Test Custom Caps with total cost of $575.00',
      uploadedFiles: [],
      logoFiles: [],
      attachments: [],
      complexity: 'SIMPLE',
      priority: 'NORMAL',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const newQuote = await prisma.quoteOrder.create({
      data: testQuoteData
    });
    
    console.log('✅ Quote created successfully!');
    console.log('Created quote ID:', newQuote.id);
    console.log('Session ID:', newQuote.sessionId);
    console.log('Status:', newQuote.status);
    
    // Verify the quote was created
    const verifyQuote = await prisma.quoteOrder.findUnique({
      where: { id: quoteId }
    });
    
    if (verifyQuote) {
      console.log('✅ Quote verification successful - found in database');
      
      // Clean up - delete the test quote
      await prisma.quoteOrder.delete({
        where: { id: quoteId }
      });
      console.log('🧹 Test quote cleaned up');
    } else {
      console.log('❌ Quote verification failed - not found in database');
    }
    
    console.log('\n🎊 DIRECT DATABASE TEST SUCCESSFUL!');
    console.log('The database connection and QuoteOrder operations are working correctly.');
    console.log('The issue must be in the API request handling or environment loading.');
    
  } catch (error) {
    console.error('❌ Direct database test failed:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      code: error.code
    });
    
    if (error.message.includes("Can't reach database server")) {
      console.log('\n🔍 Database connectivity issue confirmed');
      console.log('This matches the API error we saw earlier');
    }
  } finally {
    await prisma.$disconnect();
  }
}

testDirectDatabaseQuote();