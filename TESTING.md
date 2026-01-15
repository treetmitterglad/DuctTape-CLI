# DuctTape-CLI Testing Guide

Welcome to DuctTape-CLI! This guide will help you test the Mistral AI integration.

## 🎯 Quick Start

### 1. Set up your Mistral API Key

```bash
export MISTRAL_API_KEY="your-mistral-api-key-here"
```

You can get a Mistral API key by signing up at [https://mistral.ai](https://mistral.ai)

### 2. Install dependencies

```bash
npm install
npm install node-fetch@2  # Required for HTTP requests
```

### 3. Run the test script

```bash
node test-ducttape-cli.js
```

## 🚀 What the Test Script Does

The test script performs the following checks:

1. **🔍 Model Discovery**: Lists available Mistral models
2. **🧮 Token Counting**: Tests token counting functionality
3. **🤖 Content Generation**: Tests basic content generation
4. **🌊 Streaming**: Tests real-time streaming responses

## 📋 Expected Output

```
🚀 DuctTape-CLI Test Script
=================================
✅ Mistral API key found

🔍 Discovering available Mistral models...
📋 Available models: mistral-tiny, mistral-small, mistral-medium, mistral-large

🧮 Testing token counting...
📊 Token count: 12 tokens

🤖 Testing content generation...
💬 Mistral AI Response:
─────────────────────────────────────────────────────────────────
Hello! I'm an AI assistant created by Mistral AI...
─────────────────────────────────────────────────────────────────
📊 Usage: 45 total tokens

🌊 Testing streaming content generation...
📜 Streaming response:
Once upon a time, there was a robot named DuctTape...

✅ Stream completed
📊 Usage: 28 total tokens

🎉 All tests completed successfully!

📋 Summary:
✅ Model discovery works
✅ Token counting works
✅ Content generation works
✅ Streaming generation works

🚀 DuctTape-CLI is ready to use with Mistral AI!
```

## 🔧 Troubleshooting

### Common Issues

1. **API Key Not Found**
   ```
   ❌ Error: MISTRAL_API_KEY environment variable is not set.
   ```
   **Solution**: Set your API key as shown above.

2. **Authentication Failed**
   ```
   ❌ Test failed: Mistral API error: 401 Unauthorized
   ```
   **Solution**: Check your API key is correct and hasn't expired.

3. **Network Issues**
   ```
   ❌ Test failed: Failed to fetch
   ```
   **Solution**: Check your internet connection and firewall settings.

4. **Rate Limiting**
   ```
   ❌ Test failed: Mistral API error: 429 Too Many Requests
   ```
   **Solution**: Wait a few minutes and try again, or check your API plan limits.

## 🎉 Next Steps

Once the test script runs successfully, you can:

1. **Use DuctTape-CLI in your projects**:
   ```javascript
   import { MistralClient } from './packages/core/src/mistral/mistralClient.js';
   
   const client = new MistralClient(process.env.MISTRAL_API_KEY);
   const response = await client.generateContent(yourRequest);
   ```

2. **Explore advanced features**:
   - Model switching
   - Custom temperature and settings
   - Context management with DUCTTAPE.md files
   - Streaming responses for real-time applications

3. **Integrate with your existing workflows**:
   - Add DuctTape-CLI to your CI/CD pipelines
   - Use it for documentation generation
   - Build AI-powered tools and utilities

## 📚 API Reference

### MistralClient Methods

```typescript
// Initialize client
new MistralClient(apiKey, httpOptions, baseUrl, defaultModel)

// Generate content
client.generateContent(request, userPromptId)

// Stream content
client.generateContentStream(request, userPromptId)

// Count tokens
client.countTokens(request)

// Create embeddings
client.embedContent(request)

// List available models
client.getAvailableModels()
```

## 🤝 Support

If you encounter any issues or have questions:

1. Check the [Mistral API documentation](https://docs.mistral.ai/)
2. Verify your API key and account status
3. Review the error messages for specific guidance
4. Ensure you're using a supported Node.js version (v18+ recommended)

## 🚀 Ready to Go!

Your DuctTape-CLI is now fully integrated with Mistral AI and ready for production use!