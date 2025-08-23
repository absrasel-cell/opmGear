const https = require('https');
const http = require('http');

// Test configuration for Cursor LLM
const config = {
  baseUrl: 'http://localhost:11434/v1',
  apiKey: 'local-llm',
  model: 'codellama:13b'
};

// Test 1: Check if Ollama is running
function testOllamaConnection() {
  console.log('🔍 Testing Ollama connection...');
  
  const req = http.get(`${config.baseUrl}/models`, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      try {
        const models = JSON.parse(data);
        const hasCodeLlama = models.data.some(model => model.id === config.model);
        
        if (hasCodeLlama) {
          console.log('✅ Ollama is running and CodeLlama:13B is available!');
          console.log('📋 Available models:', models.data.map(m => m.id).join(', '));
          return true;
        } else {
          console.log('❌ CodeLlama:13B not found in available models');
          return false;
        }
      } catch (error) {
        console.log('❌ Failed to parse models response:', error.message);
        return false;
      }
    });
  });
  
  req.on('error', (error) => {
    console.log('❌ Failed to connect to Ollama:', error.message);
    return false;
  });
}

// Test 2: Test model generation
function testModelGeneration() {
  console.log('\n🧠 Testing model generation...');
  
  const requestData = JSON.stringify({
    model: config.model,
    messages: [
      {
        role: 'user',
        content: 'Write a simple "Hello World" function in JavaScript'
      }
    ],
    temperature: 0.7,
    max_tokens: 100
  });
  
  const options = {
    hostname: 'localhost',
    port: 11434,
    path: '/v1/chat/completions',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(requestData)
    }
  };
  
  const req = http.request(options, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      try {
        const response = JSON.parse(data);
        if (response.choices && response.choices[0] && response.choices[0].message) {
          console.log('✅ Model generation successful!');
          console.log('📝 Response:', response.choices[0].message.content);
          return true;
        } else {
          console.log('❌ Unexpected response format:', response);
          return false;
        }
      } catch (error) {
        console.log('❌ Failed to parse response:', error.message);
        return false;
      }
    });
  });
  
  req.on('error', (error) => {
    console.log('❌ Failed to test model generation:', error.message);
    return false;
  });
  
  req.write(requestData);
  req.end();
}

// Test 3: Verify Cursor configuration
function verifyCursorConfig() {
  console.log('\n⚙️  Cursor Configuration Summary:');
  console.log('=====================================');
  console.log(`Base URL: ${config.baseUrl}`);
  console.log(`API Key: ${config.apiKey}`);
  console.log(`Model: ${config.model}`);
  console.log('\n📋 Cursor Setup Steps:');
  console.log('1. Open Cursor Settings (Ctrl/Cmd + ,)');
  console.log('2. Navigate to Models section');
  console.log('3. Click "Add Custom Model"');
  console.log('4. Enable "Override OpenAI Base URL"');
  console.log(`5. Set Base URL to: ${config.baseUrl}`);
  console.log(`6. Set API Key to: ${config.apiKey}`);
  console.log(`7. Set Model Name/ID to: ${config.model}`);
  console.log('8. Click "Verify/Test" button');
  console.log('\n✅ If all tests pass above, your Cursor should work with CodeLlama:13B!');
}

// Run all tests
console.log('🚀 Testing CodeLlama:13B Configuration for Cursor');
console.log('================================================\n');

testOllamaConnection();

// Wait a bit then test generation
setTimeout(() => {
  testModelGeneration();
  
  // Wait a bit then show config
  setTimeout(() => {
    verifyCursorConfig();
  }, 2000);
}, 1000);
