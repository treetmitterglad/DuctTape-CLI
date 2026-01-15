#!/usr/bin/env node

/**
 * DuctTape-CLI - Main Entry Point
 * 
 * This is the main executable for DuctTape-CLI with Mistral AI integration.
 * 
 * Usage:
 * 1. Set your Mistral API key: export MISTRAL_API_KEY="your-api-key"
 * 2. Run the CLI: node ducttape-cli.js
 * 3. Or make it executable: chmod +x ducttape-cli.js && ./ducttape-cli.js
 */

import fetch from 'node-fetch';
import readline from 'readline';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, existsSync } from 'fs';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Simple Mistral API Client
class SimpleMistralClient {
  constructor(apiKey, model = 'mistral-tiny') {
    this.apiKey = apiKey;
    this.model = model;
    this.baseUrl = 'https://api.mistral.ai/v1';
  }

  async generateContent(messages, options = {}) {
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: messages,
          temperature: options.temperature ?? 0.7,
          max_tokens: options.maxTokens ?? 1024,
          stream: options.stream ?? false,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Mistral API error: ${response.status} ${response.statusText}\n${JSON.stringify(errorData)}`);
      }

      return await response.json();
    } catch (error) {
      console.error('❌ Mistral API error:', error.message);
      throw error;
    }
  }

  async listModels() {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        return ['mistral-tiny', 'mistral-small', 'mistral-medium'];
      }

      const data = await response.json();
      return data.data.map(model => model.id);
    } catch (error) {
      console.error('❌ Could not fetch models:', error.message);
      return ['mistral-tiny', 'mistral-small', 'mistral-medium'];
    }
  }
}

// Load DUCTTAPE.md context if available
function loadContext() {
  const contextFile = join(process.cwd(), 'DUCTTAPE.md');
  if (existsSync(contextFile)) {
    try {
      return readFileSync(contextFile, 'utf8');
    } catch (error) {
      console.error('❌ Could not read DUCTTAPE.md:', error.message);
      return null;
    }
  }
  return null;
}

// Main CLI function
async function runDuctTapeCLI() {
  console.log('🚀 DuctTape-CLI with Mistral AI');
  console.log('================================');
  
  // Check API key
  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) {
    console.error('❌ Error: MISTRAL_API_KEY environment variable is not set.');
    console.log('Please set your Mistral API key:');
    console.log('export MISTRAL_API_KEY="your-api-key-here"');
    process.exit(1);
  }

  // Initialize client
  const client = new SimpleMistralClient(apiKey);
  
  // Load context
  const context = loadContext();
  if (context) {
    console.log('📋 Loaded context from DUCTTAPE.md');
  }
  
  // Show available models
  console.log('🔍 Discovering available models...');
  const models = await client.listModels();
  console.log('📋 Available models:', models.join(', '));
  
  // Set up readline interface
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: 'ducttape> '
  });

  console.log('💬 DuctTape-CLI ready! Type your message or /help for commands.');
  console.log('Type /exit to quit.');
  
  // Add context to initial message if available
  const initialMessages = context ? [
    { role: 'system', content: `Context: ${context}` }
  ] : [];
  
  rl.prompt();

  rl.on('line', async (line) => {
    const input = line.trim();
    
    if (input === '/exit') {
      console.log('👋 Goodbye!');
      rl.close();
      return;
    }
    
    if (input === '/help') {
      console.log('📖 Available commands:');
      console.log('  /exit - Exit DuctTape-CLI');
      console.log('  /help - Show this help message');
      console.log('  /models - List available models');
      console.log('  /context - Show current context');
      console.log('  /clear - Clear conversation history');
      rl.prompt();
      return;
    }
    
    if (input === '/models') {
      console.log('📋 Available models:', models.join(', '));
      rl.prompt();
      return;
    }
    
    if (input === '/context') {
      if (context) {
        console.log('📄 Current context:');
        console.log(context);
      } else {
        console.log('📄 No DUCTTAPE.md context file found.');
      }
      rl.prompt();
      return;
    }
    
    if (input === '/clear') {
      initialMessages.length = 0;
      if (context) {
        initialMessages.push({ role: 'system', content: `Context: ${context}` });
      }
      console.log('🧹 Conversation history cleared.');
      rl.prompt();
      return;
    }
    
    // Add user message
    initialMessages.push({ role: 'user', content: input });
    
    try {
      // Show typing indicator
      process.stdout.write('🤖 Thinking... ');
      
      // Generate response
      const response = await client.generateContent(initialMessages, {
        temperature: 0.7,
        maxTokens: 1024
      });
      
      // Add assistant response
      const assistantMessage = response.choices[0].message.content;
      initialMessages.push({ role: 'assistant', content: assistantMessage });
      
      // Clear typing indicator
      process.stdout.write('\r');
      process.stdout.write(' '.repeat(50));
      process.stdout.write('\r');
      
      // Show response
      console.log('💬 DuctTape:');
      console.log(assistantMessage);
      console.log(`📊 Tokens used: ${response.usage.total_tokens}`);
      
    } catch (error) {
      console.error('❌ Error:', error.message);
    }
    
    rl.prompt();
  }).on('close', () => {
    console.log('👋 Have a great day!');
    process.exit(0);
  });
}

// Run the CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  runDuctTapeCLI().catch(error => {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  });
}

export { runDuctTapeCLI, SimpleMistralClient };