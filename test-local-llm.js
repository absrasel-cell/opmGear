const testLocalLLM = async () => {
  try {
    console.log('Testing local LLM connection...');
    
    // Test direct connection to Ollama
    const response = await fetch('http://localhost:11434/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'qwen2.5-coder:14b',
        messages: [
          {
            role: 'system',
            content: `You are a helpful coding assistant. You must respond ONLY in natural language. 

IMPORTANT RULES:
- NEVER use function calls, tools, or JSON responses
- NEVER respond with {"name": "function_name", "arguments": {...}}
- NEVER use any tool or function syntax
- ALWAYS provide direct, helpful answers in plain text
- If you need to read files or perform actions, just explain what you would do instead
- Keep responses conversational and helpful

Your role is to help with coding questions, debugging, and technical explanations. Respond naturally as if you're having a conversation.`
          },
          {
            role: 'user',
            content: 'Hello! Can you help me with a simple coding question? What is 2 + 2?'
          }
        ],
        max_tokens: 100,
        temperature: 0.1,
        tools: [],
        tool_choice: "none"
      }),
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Local LLM test successful!');
      console.log('Response:', data.choices[0].message.content);
      
      // Check if response contains function call syntax
      const content = data.choices[0].message.content;
      if (content.includes('"name"') && content.includes('"arguments"')) {
        console.log('❌ Still getting function call syntax');
      } else {
        console.log('✅ Natural language response received');
      }
    } else {
      console.log('❌ Local LLM test failed:', data);
    }
  } catch (error) {
    console.error('❌ Local LLM test failed:', error.message);
  }
};

testLocalLLM();
