# Cursor + Local Qwen2.5-Coder-14B Setup Guide

## ✅ Current Status
- ✅ Ollama installed and running
- ✅ Qwen2.5-Coder-14B model downloaded (9.0 GB)
- ✅ API accessible at http://localhost:11434/v1
- ✅ Model responding correctly

## 🔧 Cursor Configuration

### Step 1: Open Cursor Settings
1. Open Cursor
2. Go to **Settings** (Ctrl/Cmd + ,)
3. Navigate to **Models** section

### Step 2: Add Custom Model
1. Click **"Add Custom Model"**
2. Enable **"Override OpenAI Base URL"**
3. Set **Base URL** to: `http://localhost:11434/v1`
4. Set **API Key** to: `local-llm` (any non-empty text)
5. Set **Model Name/ID** to: `qwen2.5-coder:14b`

### Step 3: Test Connection
1. Click **"Verify/Test"** button
2. If verification fails, try using `http://127.0.0.1:11434/v1` instead

## 🚀 Recommended Settings

### System Prompt (Optional)
```
You are a senior Next.js (App Router) + TypeScript engineer. Prefer concise, copy-pastable answers with file paths and unified diffs when changing code. Follow ESLint/Prettier defaults. Ask brief clarifying questions only when required.
```

### Sampling Parameters
- **Temperature**: 0.1-0.3 (for coding tasks)
- **Top P**: 0.9
- **Max Tokens**: 600-1500

### Stop Tokens (Optional)
```
["```", "```tsx", "```ts"]
```

## 🧪 Quick Test Commands

### Test API (PowerShell)
```powershell
# Test models endpoint
Invoke-RestMethod -Uri "http://localhost:11434/v1/models" -Method GET

# Test chat completion
Invoke-RestMethod -Uri "http://localhost:11434/v1/chat/completions" -Method POST -Headers @{"Content-Type"="application/json"} -Body '{"model":"qwen2.5-coder:14b","messages":[{"role":"user","content":"Write a Next.js API route in TS returning { ok: true }."}],"temperature":0.2,"max_tokens":400}'
```

### Test API (curl - if available)
```bash
# Test models endpoint
curl http://localhost:11434/v1/models

# Test chat completion
curl http://localhost:11434/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"qwen2.5-coder:14b","messages":[{"role":"user","content":"Write a Next.js API route in TS returning { ok: true }."}],"temperature":0.2,"max_tokens":400}'
```

## 🔧 Troubleshooting

### If Cursor won't accept localhost:
1. Try `http://127.0.0.1:11434/v1` instead
2. Use ngrok tunnel: `ngrok http 11434 --host-header="localhost:11434"`

### If model is slow:
- The 14B model requires significant GPU memory
- Consider using a smaller model like `qwen2.5-coder:7b` for faster responses

### If you get OOM errors:
- Close other GPU-intensive applications
- The model uses ~9GB VRAM, leaving ~3GB for other processes

## 📁 Model Location
The model is stored in: `C:\Users\[YourUsername]\.ollama\models`

## 🎯 Next Steps
1. Configure Cursor with the settings above
2. Test with a simple coding task
3. Adjust temperature and other parameters as needed
4. Consider setting up the system prompt for better coding responses

## 🔄 Alternative: vLLM Setup (if needed)
If you want maximum performance and control, you can switch to vLLM:
1. Install WSL2 with Ubuntu
2. Install vLLM in the Ubuntu environment
3. Use the AWQ quantized model for better performance
4. Connect Cursor to `http://localhost:8000/v1`

## 📊 Performance Notes
- **RTX 4070 (12GB)**: Perfect for 14B models with Q4 quantization
- **Response Time**: ~2-5 seconds for typical coding tasks
- **Memory Usage**: ~9GB VRAM for the model
- **Context Length**: Supports up to 32K tokens
