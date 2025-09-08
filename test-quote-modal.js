const fetch = require('node-fetch');
require('dotenv').config();

async function testQuoteModal() {
  console.log('🧪 Testing Footer quote modal form submission...');
  
  // Simulate the data that would be sent from the Footer quote modal
  const quoteModalData = {
    formType: 'CUSTOM_ORDER',
    name: 'John Doe',
    email: 'john.doe@example.com',
    phone: '+1234567890',
    company: 'Example Corp',
    subject: 'Embroidery Services - Quote Request',
    message: 'Service: Embroidery Services\nProject Description: Need custom embroidered caps for our company team\nTimeline: 2-3 weeks',
    metadata: {
      source: 'footer_quote_modal',
      service: 'Embroidery Services',
      timeline: '2-3 weeks',
      timestamp: new Date().toISOString()
    }
  };
  
  try {
    console.log('📤 Sending quote modal form submission...');
    
    const response = await fetch('http://localhost:3001/api/form-submissions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(quoteModalData)
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Quote modal submission successful!');
      console.log('📝 Submission ID:', result.submissionId);
      console.log('📧 Response:', result.message);
    } else {
      console.log('❌ Quote modal submission failed!');
      console.log('Status:', response.status);
      console.log('Error:', result);
    }
    
    // Check the admin dashboard to see if it shows up
    console.log('\n📥 Checking form submissions in admin dashboard...');
    
    const getResponse = await fetch('http://localhost:3001/api/form-submissions?limit=10');
    const getResult = await getResponse.json();
    
    if (getResponse.ok) {
      console.log('✅ Form submissions retrieved successfully!');
      console.log('📊 Total submissions:', getResult.pagination?.total || 0);
      
      if (getResult.submissions && getResult.submissions.length > 0) {
        console.log('\n📋 Recent submissions:');
        getResult.submissions.forEach((submission, index) => {
          console.log(`${index + 1}. ${submission.name} (${submission.formType}) - ${submission.subject} - ${submission.createdAt}`);
        });
      }
    } else {
      console.log('❌ Failed to retrieve form submissions!');
      console.log('Status:', getResponse.status);
      console.log('Error:', getResult);
    }
    
  } catch (error) {
    console.log('💥 Test failed with error:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.log('\n🚨 Make sure the Next.js development server is running:');
      console.log('   npm run dev');
    }
  }
}

testQuoteModal();