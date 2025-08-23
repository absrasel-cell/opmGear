const testAppLLM = async () => {
  try {
    console.log('Testing LLM through Next.js API...');
    
    const response = await fetch('http://localhost:3000/api/llm', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'qwen2.5-coder:14b',
        messages: [
          {
            role: 'user',
            content: 'Hello Qwen, can you analyze my project status?'
          }
        ],
        max_tokens: 200,
        temperature: 0.1
      }),
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Next.js API test successful!');
      console.log('Response:', data.choices[0].message.content);
      
      // Check if response contains function call syntax
      const content = data.choices[0].message.content;
      if (content.includes('"name"') && content.includes('"arguments"')) {
        console.log('❌ Still getting function call syntax');
      } else {
        console.log('✅ Natural language response received');
      }
    } else {
      console.log('❌ Next.js API test failed:', data);
    }
  } catch (error) {
    console.error('❌ Next.js API test failed:', error.message);
  }
};

testAppLLM();
