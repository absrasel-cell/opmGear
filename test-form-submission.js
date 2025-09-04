// Test script for form submission system
const testFormSubmission = async () => {
  const testData = {
    formType: 'CONTACT',
    name: 'John Doe',
    email: 'john.doe@example.com',
    subject: 'custom-order',
    message: 'I am interested in ordering custom caps for my team of 100 people. Please provide a quote.',
    phone: '555-123-4567',
    company: 'Test Company Inc.',
    metadata: {
      source: 'test_script',
      timestamp: new Date().toISOString()
    }
  };

  try {
    console.log('Testing form submission...');
    console.log('Data:', JSON.stringify(testData, null, 2));

    const response = await fetch('http://localhost:3000/api/form-submissions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });

    console.log('Response status:', response.status);
    
    const result = await response.json();
    console.log('Response body:', JSON.stringify(result, null, 2));

    if (response.ok) {
      console.log('✅ Form submission successful!');
      console.log('Submission ID:', result.submissionId);

      // Test retrieval
      console.log('\nTesting form retrieval...');
      const getResponse = await fetch('http://localhost:3000/api/form-submissions');
      const submissions = await getResponse.json();
      console.log('Retrieved submissions:', submissions.submissions?.length || 0);

    } else {
      console.log('❌ Form submission failed');
    }

  } catch (error) {
    console.error('Error testing form submission:', error);
  }
};

// Run the test if this script is executed directly
if (require.main === module) {
  testFormSubmission();
}

module.exports = { testFormSubmission };