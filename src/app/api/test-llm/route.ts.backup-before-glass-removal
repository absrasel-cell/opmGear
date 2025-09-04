import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const ngrokUrl = process.env.NGROK_LLM_URL || 'https://98e07e09a8e6.ngrok-free.app';
    const apiKey = process.env.LLM_API_KEY || 'dummy-key';
    
    console.log('🔍 Testing LLM connection...');
    console.log('📡 Ngrok URL:', ngrokUrl);
    console.log('🔑 API Key configured:', !!apiKey);
    
    // Test 1: Check if ngrok endpoint is reachable
    console.log('🧪 Test 1: Checking ngrok endpoint reachability...');
    
    try {
      const healthCheck = await fetch(`${ngrokUrl}`, {
        method: 'GET',
        headers: {
          'User-Agent': 'CustomCap-LLM-Test/1.0',
        },
      });
      
      console.log('✅ Ngrok endpoint reachable:', healthCheck.status);
    } catch (error) {
      console.log('❌ Ngrok endpoint not reachable:', error);
      return NextResponse.json({
        success: false,
        error: 'Ngrok endpoint not reachable',
        details: error instanceof Error ? error.message : 'Unknown error',
        ngrokUrl
      }, { status: 503 });
    }
    
    // Test 2: Check OpenAI-compatible API endpoint
    console.log('🧪 Test 2: Checking OpenAI-compatible API...');
    
    try {
      const modelsResponse = await fetch(`${ngrokUrl}/v1/models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });
      
      console.log('📊 Models endpoint status:', modelsResponse.status);
      
      if (!modelsResponse.ok) {
        const errorText = await modelsResponse.text();
        console.log('❌ Models endpoint failed:', errorText);
        
        return NextResponse.json({
          success: false,
          error: 'OpenAI-compatible API not working',
          status: modelsResponse.status,
          details: errorText,
          ngrokUrl
        }, { status: modelsResponse.status });
      }
      
      const modelsData = await modelsResponse.json();
      console.log('✅ Models endpoint working, available models:', modelsData.data?.length || 0);
      
      // Test 3: Try a simple chat completion
      console.log('🧪 Test 3: Testing chat completion...');
      
      const chatResponse = await fetch(`${ngrokUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'qwen-coder:14b',
          messages: [
            {
              role: 'user',
              content: 'Hello, this is a test message. Please respond with "Test successful" if you can see this.'
            }
          ],
          max_tokens: 50,
          temperature: 0.1
        }),
      });
      
      console.log('📊 Chat completion status:', chatResponse.status);
      
      if (!chatResponse.ok) {
        const errorText = await chatResponse.text();
        console.log('❌ Chat completion failed:', errorText);
        
        return NextResponse.json({
          success: false,
          error: 'Chat completion test failed',
          status: chatResponse.status,
          details: errorText,
          ngrokUrl,
          modelsAvailable: modelsData.data || []
        }, { status: chatResponse.status });
      }
      
      const chatData = await chatResponse.json();
      console.log('✅ Chat completion successful');
      
      return NextResponse.json({
        success: true,
        message: 'LLM connection and functionality verified',
        ngrokUrl,
        apiKeyConfigured: !!apiKey,
        modelsAvailable: modelsData.data || [],
        chatTestResponse: chatData.choices?.[0]?.message?.content || 'No response content',
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.log('❌ API test failed:', error);
      return NextResponse.json({
        success: false,
        error: 'API test failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        ngrokUrl
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('❌ LLM test failed:', error);
    return NextResponse.json({
      success: false,
      error: 'LLM test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
