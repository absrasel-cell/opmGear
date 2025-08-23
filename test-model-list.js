const testAvailableModels = async () => {
  try {
    console.log('Checking available models...');
    
    const response = await fetch('http://localhost:3000/api/llm', {
      method: 'GET',
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Available models:');
      console.log(data.availableModels);
      
      // Test with a different model if available
      if (data.availableModels && data.availableModels.length > 0) {
        const alternativeModel = data.availableModels.find(m => 
          m.id && !m.id.includes('qwen') && m.id.includes('coder')
        ) || data.availableModels[0];
        
        console.log(`\nTesting with alternative model: ${alternativeModel.id}`);
        
        const testResponse = await fetch('http://localhost:3000/api/llm', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: alternativeModel.id,
            messages: [
              {
                role: 'user',
                content: 'Hello, can you help me with coding?'
              }
            ],
            max_tokens: 100,
            temperature: 0.1
          }),
        });

        const testData = await testResponse.json();
        
        if (testResponse.ok) {
          console.log('✅ Alternative model response:');
          console.log(testData.choices[0].message.content);
        } else {
          console.log('❌ Alternative model failed:', testData);
        }
      }
    } else {
      console.log('❌ Error getting models:', data);
    }
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
};

testAvailableModels();
