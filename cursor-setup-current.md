# Cursor Local LLM Setup - Current Interface

## 🔍 Finding the Model Settings in Cursor

The model settings location has changed in recent Cursor versions. Here are the current ways to access it:

### Method 1: Settings Menu
1. Open Cursor
2. Press `Ctrl + ,` (or `Cmd + ,` on Mac) to open Settings
3. Look for one of these sections:
   - **AI** or **AI Models**
   - **Models** 
   - **Chat Models**
   - **LLM Settings**

### Method 2: Command Palette
1. Press `Ctrl + Shift + P` (or `Cmd + Shift + P` on Mac)
2. Type "model" or "AI" to search for model-related commands
3. Look for options like:
   - "Configure AI Models"
   - "Set Model Provider"
   - "Add Custom Model"

### Method 3: Chat Interface
1. Open the Chat panel in Cursor (usually `Ctrl + L` or `Cmd + L`)
2. Look for a model selector dropdown in the chat interface
3. Click on it to see model options

### Method 4: Direct Settings File
If the UI doesn't show the option, you can edit Cursor's settings directly:

1. Press `Ctrl + Shift + P` and type "Preferences: Open Settings (JSON)"
2. Add this configuration to your settings.json:

```json
{
  "cursor.chat.model": "qwen2.5-coder:14b",
  "cursor.chat.baseUrl": "http://localhost:11434/v1",
  "cursor.chat.apiKey": "local-llm",
  "cursor.chat.provider": "openai"
}
```

## 🔧 Alternative: Environment Variables

You can also set up the local model using environment variables:

1. Create a `.env` file in your project root (or set system environment variables)
2. Add these variables:

```env
CURSOR_CHAT_MODEL=qwen2.5-coder:14b
CURSOR_CHAT_BASE_URL=http://localhost:11434/v1
CURSOR_CHAT_API_KEY=local-llm
CURSOR_CHAT_PROVIDER=openai
```

## 🔍 What to Look For

In the Cursor interface, look for these terms:
- **Model Provider** or **AI Provider**
- **Custom Endpoint** or **Custom API**
- **Base URL** or **API URL**
- **Model Selection** or **Chat Model**

## 🚨 If You Still Can't Find It

The local LLM feature might be:
1. **In a different location** - try searching the settings for "local", "custom", or "endpoint"
2. **Behind a feature flag** - check if there's a "Experimental Features" section
3. **Not available in your version** - try updating Cursor to the latest version

## 🔄 Alternative: Use Cursor's Built-in Local Support

Some versions of Cursor have built-in support for local models:

1. Look for **"Local Models"** or **"Ollama"** in the settings
2. Cursor might automatically detect Ollama if it's running
3. Check if there's an **"Ollama Integration"** option

## 📞 Need Help?

If you still can't find the option, please:
1. Check your Cursor version (Help > About)
2. Look for any "Experimental" or "Advanced" settings sections
3. Try searching the Cursor documentation for "local models" or "Ollama"

## 🧪 Test Your Setup

Once you find the right setting, test it with:

```powershell
# Verify Ollama is still running
Invoke-RestMethod -Uri "http://localhost:11434/v1/models" -Method GET
```

The model should show up as `qwen2.5-coder:14b` in the response.
