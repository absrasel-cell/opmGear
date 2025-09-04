import { NextRequest, NextResponse } from 'next/server';

interface LLMRequest {
 messages: Array<{
  role: 'system' | 'user' | 'assistant';
  content: string;
 }>;
 model?: string;
 temperature?: number;
 max_tokens?: number;
}

interface LLMResponse {
 id: string;
 object: string;
 created: number;
 model: string;
 choices: Array<{
  index: number;
  message: {
   role: string;
   content: string;
  };
  finish_reason: string;
 }>;
 usage: {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
 };
}

// Function to clean up function call syntax from LLM responses
function cleanFunctionCallSyntax(content: string): string {
 // Remove function call patterns
 let cleaned = content;
 
 // Remove function call JSON blocks
 cleaned = cleaned.replace(/\{\s*"name"\s*:\s*"[^"]*"\s*,\s*"arguments"\s*:\s*\{[^}]*\}\s*\}/g, '');
 
 // Remove function call patterns with read_file, write_file, etc.
 cleaned = cleaned.replace(/\{\s*"name"\s*:\s*"(read_file|write_file|search_replace|edit_file|delete_file)"[^}]*\}/g, '');
 
 // Remove any remaining JSON-like function call structures
 cleaned = cleaned.replace(/\{\s*"[^"]*"\s*:\s*"[^"]*"[^}]*\}/g, '');
 
 // Clean up extra whitespace and newlines
 cleaned = cleaned.replace(/\n\s*\n/g, '\n').trim();
 
 // If the response is empty after cleaning, provide a default response
 if (!cleaned || cleaned.length < 10) {
  return "I apologize, but I'm unable to provide a proper response at the moment. Please try rephrasing your question or ask me something else.";
 }
 
 return cleaned;
}

export async function POST(request: NextRequest) {
 try {
  const body: LLMRequest = await request.json();
  
  // Use local Ollama directly for now
  const llmUrl = process.env.NGROK_LLM_URL || 'http://localhost:11434';
  
  // Prepare the request for the custom LLM with a stronger system prompt
  const llmRequest = {
   model: body.model || 'qwen2.5-coder:14b',
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
    ...body.messages
   ],
   temperature: body.temperature || 0.7,
   max_tokens: body.max_tokens || 1000,
   stream: false,
   tools: [], // Disable function calling
   tool_choice: "none" // Explicitly disable tool usage
  };

  console.log('Sending request to LLM:', {
   url: llmUrl,
   model: llmRequest.model,
   messageCount: llmRequest.messages.length
  });

  // Make request to the custom LLM
  const response = await fetch(`${llmUrl}/v1/chat/completions`, {
   method: 'POST',
   headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.LLM_API_KEY || 'dummy-key'}`,
   },
   body: JSON.stringify(llmRequest),
  });

  if (!response.ok) {
   const errorText = await response.text();
   console.error('LLM API Error:', {
    status: response.status,
    statusText: response.statusText,
    error: errorText
   });
   
   return NextResponse.json({
    error: 'LLM API request failed',
    details: errorText,
    status: response.status
   }, { status: response.status });
  }

  const llmResponse: LLMResponse = await response.json();
  
  // Clean up the response content to remove function call syntax
  const originalContent = llmResponse.choices[0]?.message?.content || '';
  const cleanedContent = cleanFunctionCallSyntax(originalContent);
  
  // Update the response with cleaned content
  if (llmResponse.choices[0]?.message) {
   llmResponse.choices[0].message.content = cleanedContent;
  }
  
  console.log('LLM Response received:', {
   model: llmResponse.model,
   usage: llmResponse.usage,
   finishReason: llmResponse.choices[0]?.finish_reason,
   originalLength: originalContent.length,
   cleanedLength: cleanedContent.length,
   wasCleaned: originalContent !== cleanedContent
  });

  return NextResponse.json(llmResponse);

 } catch (error) {
  console.error('LLM API Error:', error);
  return NextResponse.json({
   error: 'Internal server error',
   details: error instanceof Error ? error.message : 'Unknown error'
  }, { status: 500 });
 }
}

// Test endpoint to verify LLM connection
export async function GET() {
 try {
  const llmUrl = process.env.NGROK_LLM_URL || 'http://localhost:11434';
  
  console.log('Testing LLM connection to:', llmUrl);
  
  // Test the connection with a simple request
  const testResponse = await fetch(`${llmUrl}/v1/models`, {
   method: 'GET',
   headers: {
    'Authorization': `Bearer ${process.env.LLM_API_KEY || 'dummy-key'}`,
   },
  });

  if (!testResponse.ok) {
   const errorText = await testResponse.text();
   return NextResponse.json({
    success: false,
    error: 'LLM connection failed',
    status: testResponse.status,
    details: errorText
   });
  }

  const models = await testResponse.json();
  
  return NextResponse.json({
   success: true,
   message: 'LLM connection successful',
   llmUrl,
   availableModels: models.data || [],
   timestamp: new Date().toISOString()
  });

 } catch (error) {
  console.error('LLM connection test failed:', error);
  return NextResponse.json({
   success: false,
   error: 'LLM connection test failed',
   details: error instanceof Error ? error.message : 'Unknown error'
  }, { status: 500 });
 }
}
