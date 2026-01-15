#!/usr/bin/env node

/**
 * DuctTape-CLI Test Script
 * 
 * This script demonstrates how to test the DuctTape-CLI with Mistral AI integration.
 * 
 * Usage:
 * 1. Set your Mistral API key: export MISTRAL_API_KEY="your-api-key"
 * 2. Run this script: node test-ducttape-cli.js
 */

import { MistralClient } from './packages/core/src/mistral/mistralClient.js';

async function testDuctTapeCLI() {
  console.log('🚀 DuctTape-CLI Test Script');
  console.log('=================================');
  
  // Check if Mistral API key is set
  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) {
    console.error('❌ Error: MISTRAL_API_KEY environment variable is not set.');
    console.log('Please set your Mistral API key:');
    console.log('export MISTRAL_API_KEY="your-api-key-here"');
    process.exit(1);
  }
  
  console.log('✅ Mistral API key found');
  
  // Create Mistral client
  const mistralClient = new MistralClient(apiKey, {}, 'https://api.mistral.ai/v1', 'mistral-tiny');
  
  try {
    // Test model discovery
    console.log('\n🔍 Discovering available Mistral models...');
    const availableModels = await mistralClient.getAvailableModels();
    console.log('📋 Available models:', availableModels.join(', '));
    
    // Test token counting
    console.log('\n🧮 Testing token counting...');
    const testContent = {
      content: {
        parts: [{ text: 'Hello, this is a test message for DuctTape-CLI!' }],
      },
    };
    
    const tokenCount = await mistralClient.countTokens(testContent);
    console.log(`📊 Token count: ${tokenCount.totalTokens} tokens`);
    
    // Test content generation
    console.log('\n🤖 Testing content generation...');
    const generateRequest = {
      contents: [
        {
          role: 'user',
          parts: [{ text: 'Hello! I am testing DuctTape-CLI with Mistral AI. Can you tell me about yourself?' }],
        },
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 100,
      },
    };
    
    const response = await mistralClient.generateContent(generateRequest, 'test-001');
    const generatedText = response.candidates[0].content.parts[0].text;
    
    console.log('💬 Mistral AI Response:');
    console.log('─'.repeat(50));
    console.log(generatedText);
    console.log('─'.repeat(50));
    console.log(`📊 Usage: ${response.usageMetadata.totalTokenCount} total tokens`);
    
    // Test streaming
    console.log('\n🌊 Testing streaming content generation...');
    const streamRequest = {
      contents: [
        {
          role: 'user',
          parts: [{ text: 'Tell me a short story about a robot named DuctTape in 3 sentences.' }],
        },
      ],
      generationConfig: {
        temperature: 0.8,
        maxOutputTokens: 50,
      },
    };
    
    const stream = await mistralClient.generateContentStream(streamRequest, 'test-002');
    console.log('📜 Streaming response:');
    
    for await (const chunk of stream) {
      if (chunk.candidates[0].finishReason === 'STOP') {
        console.log('\n✅ Stream completed');
        console.log(`📊 Usage: ${chunk.usageMetadata.totalTokenCount} total tokens`);
        break;
      }
      
      const text = chunk.candidates[0].content.parts[0].text;
      if (text) {
        process.stdout.write(text);
      }
    }
    
    console.log('\n🎉 All tests completed successfully!');
    console.log('\n📋 Summary:');
    console.log('✅ Model discovery works');
    console.log('✅ Token counting works');
    console.log('✅ Content generation works');
    console.log('✅ Streaming generation works');
    console.log('\n🚀 DuctTape-CLI is ready to use with Mistral AI!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n🔍 Debugging info:');
    console.log('1. Check your MISTRAL_API_KEY is correct');
    console.log('2. Verify your internet connection');
    console.log('3. Check Mistral API status: https://status.mistral.ai');
    console.log('4. Try with a different model if available');
    process.exit(1);
  }
}

// Run the test
if (import.meta.url === `file://${process.argv[1]}`) {
  testDuctTapeCLI();
}

export { testDuctTapeCLI };