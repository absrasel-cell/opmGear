require('dotenv').config();

const testOpenAI = async () => {
  try {
    console.log('Testing OpenAI API connectivity...');
    console.log('API Key present:', !!process.env.OPENAI_API_KEY);
    console.log('API Key starts with:', process.env.OPENAI_API_KEY?.substring(0, 20) + '...');
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{
          role: 'user',
          content: 'Hello! Just testing the API connection. Please respond with "API working".'
        }],
        max_tokens: 20
      })
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ OpenAI API is working!');
      console.log('Response:', data.choices[0].message.content);
    } else {
      console.log('❌ OpenAI API error:');
      console.log('Status:', response.status);
      console.log('Error:', data.error);
    }
  } catch (error) {
    console.log('❌ Network or connection error:');
    console.log(error.message);
  }
};

testOpenAI();