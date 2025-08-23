# LLM Integration Setup Guide

## 🚀 **Custom LLM Integration with Qwen-coder:14b**

This guide will help you set up and troubleshoot the integration of your custom Qwen-coder:14b model via ngrok.

## 📋 **Prerequisites**

1. **Ollama installed and running** with qwen-coder:14b model
2. **ngrok configured** and accessible
3. **Next.js development server** running

## 🔧 **Environment Configuration**

Add these variables to your `.env.local` file:

```env
# LLM Configuration
NGROK_LLM_URL=https://98e07e09a8e6.ngrok-free.app
LLM_API_KEY=dummy-key
```

## 🧪 **Testing the Integration**

### 1. **Test LLM Connection**
Visit: `http://localhost:3000/test-llm`

This page provides:
- Connection testing
- Chat completion testing
- Detailed error reporting
- Troubleshooting guidance

### 2. **API Endpoints**

#### Test Connection
```bash
GET /api/test-llm
```

#### Chat Completion
```bash
POST /api/llm
Content-Type: application/json

{
  "model": "qwen-coder:14b",
  "messages": [
    {
      "role": "user",
      "content": "Hello, how are you?"
    }
  ],
  "max_tokens": 100,
  "temperature": 0.7
}
```

## 🔍 **Troubleshooting Common Issues**

### **Issue 1: Verification Toggle Not Working**

**Symptoms:**
- Clicking verify doesn't enable the OpenAI API toggle
- No error messages displayed

**Solutions:**
1. **Check ngrok URL format:**
   - Ensure URL starts with `https://`
   - Remove trailing slashes
   - Verify the URL is accessible in browser

2. **Verify Ollama is running:**
   ```bash
   # Check if Ollama is running
   curl http://localhost:11434/api/tags
   
   # Check if qwen-coder:14b is available
   ollama list
   ```

3. **Test ngrok endpoint:**
   ```bash
   curl https://98e07e09a8e6.ngrok-free.app
   # Should return "Ollama is running"
   ```

### **Issue 2: Model Not Found**

**Symptoms:**
- Error: "Model not found" or similar
- 404 responses from API

**Solutions:**
1. **Verify model name:**
   - Exact name should be: `qwen-coder:14b`
   - Check for typos or extra spaces

2. **Pull the model if not available:**
   ```bash
   ollama pull qwen-coder:14b
   ```

3. **Check available models:**
   ```bash
   curl https://98e07e09a8e6.ngrok-free.app/v1/models
   ```

### **Issue 3: Network Connectivity Issues**

**Symptoms:**
- Timeout errors
- Connection refused
- CORS errors

**Solutions:**
1. **Check ngrok status:**
   ```bash
   # Verify ngrok is running
   ngrok status
   
   # Check ngrok logs
   ngrok logs
   ```

2. **Test local Ollama:**
   ```bash
   curl http://localhost:11434/api/chat -d '{
     "model": "qwen-coder:14b",
     "messages": [{"role": "user", "content": "test"}]
   }'
   ```

3. **Check firewall settings:**
   - Ensure port 11434 is accessible
   - Check if ngrok is blocked

### **Issue 4: API Format Mismatch**

**Symptoms:**
- 400 Bad Request errors
- "Invalid request format" messages

**Solutions:**
1. **Verify OpenAI-compatible format:**
   - Use `/v1/chat/completions` endpoint
   - Include proper headers
   - Use correct JSON structure

2. **Check request format:**
   ```json
   {
     "model": "qwen-coder:14b",
     "messages": [
       {
         "role": "user",
         "content": "Your message here"
       }
     ],
     "max_tokens": 1000,
     "temperature": 0.7
   }
   ```

## 🛠 **Advanced Configuration**

### **Custom ngrok Configuration**

If you need to use a different ngrok URL:

1. **Update environment variable:**
   ```env
   NGROK_LLM_URL=https://your-new-ngrok-url.ngrok-free.app
   ```

2. **Restart your Next.js server:**
   ```bash
   npm run dev
   ```

### **Model Parameters**

You can customize the model behavior:

```json
{
  "model": "qwen-coder:14b",
  "messages": [...],
  "temperature": 0.1,        // Lower = more deterministic
  "max_tokens": 2000,        // Maximum response length
  "top_p": 0.9,             // Nucleus sampling
  "frequency_penalty": 0.0,  // Reduce repetition
  "presence_penalty": 0.0    // Encourage new topics
}
```

## 📊 **Monitoring and Debugging**

### **Enable Debug Logging**

Add to your `.env.local`:
```env
DEBUG=llm:*
```

### **Check Server Logs**

Monitor your Next.js server console for:
- Request/response logs
- Error messages
- Connection status

### **Test Endpoints**

Use these endpoints to verify functionality:

1. **Health Check:**
   ```
   GET https://98e07e09a8e6.ngrok-free.app
   ```

2. **Models List:**
   ```
   GET https://98e07e09a8e6.ngrok-free.app/v1/models
   ```

3. **Chat Completion:**
   ```
   POST https://98e07e09a8e6.ngrok-free.app/v1/chat/completions
   ```

## ✅ **Verification Checklist**

Before using the LLM integration:

- [ ] Ollama is running with qwen-coder:14b model
- [ ] ngrok is accessible and forwarding correctly
- [ ] Environment variables are set
- [ ] Test page shows successful connection
- [ ] Chat completion test works
- [ ] No errors in server logs

## 🆘 **Getting Help**

If you're still experiencing issues:

1. **Check the test page:** `http://localhost:3000/test-llm`
2. **Review server logs** for detailed error messages
3. **Verify ngrok status** and Ollama logs
4. **Test with curl** commands to isolate the issue

## 📝 **Example Usage**

```javascript
// Example of using the LLM API in your application
const response = await fetch('/api/llm', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'qwen-coder:14b',
    messages: [
      {
        role: 'system',
        content: 'You are a helpful coding assistant.'
      },
      {
        role: 'user',
        content: 'Write a function to calculate fibonacci numbers.'
      }
    ],
    max_tokens: 500,
    temperature: 0.1
  }),
});

const data = await response.json();
console.log(data.choices[0].message.content);
```
