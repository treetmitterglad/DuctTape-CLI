#!/usr/bin/env node
/**
 * DuctTape CLI - Standalone Entry Point
 * AI-powered terminal assistant using Mistral
 * 
 * Usage:
 *   export MISTRAL_API_KEY="your-key"
 *   node ducttape-standalone.js
 */

import * as readline from 'readline';

// ============= Mistral API Types =============

interface MistralMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  tool_calls?: MistralToolCall[];
  tool_call_id?: string;
}

interface MistralToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

interface MistralTool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

interface MistralStreamChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    delta: {
      role?: string;
      content?: string;
      tool_calls?: MistralToolCall[];
    };
    finish_reason: string | null;
  }[];
}

// ============= Constants =============

const MISTRAL_MODELS_WITH_TOOLS = [
  'mistral-large-latest',
  'mistral-medium-latest',
  'mistral-small-latest',
  'open-mixtral-8x22b',
  'open-mixtral-8x7b',
];

const DEFAULT_MODEL = 'mistral-medium-latest';

const SYSTEM_PROMPT = `You are DuctTape, a helpful AI assistant running in a terminal. 
You help users with coding tasks, system operations, and general questions.
Be concise and direct in your responses. Use markdown formatting when helpful.
When asked to perform tasks, explain what you would do step by step.`;

const ASCII_LOGO = `
       ╭──────────────╮
      ╱ ╭────────────╮ ╲     ██████╗ ██╗   ██╗ ██████╗████████╗████████╗ █████╗ ██████╗ ███████╗
     ╱ ╱              ╲ ╲    ██╔══██╗██║   ██║██╔════╝╚══██╔══╝╚══██╔══╝██╔══██╗██╔══██╗██╔════╝
    │ │    ╭──────╮    │ │   ██║  ██║██║   ██║██║        ██║      ██║   ███████║██████╔╝█████╗  
    │ │    │ TAPE │    │ │   ██║  ██║██║   ██║██║        ██║      ██║   ██╔══██║██╔═══╝ ██╔══╝  
     ╲ ╲   ╰──────╯   ╱ ╱    ██████╔╝╚██████╔╝╚██████╗   ██║      ██║   ██║  ██║██║     ███████╗
      ╲ ╰────────────╯ ╱     ╚═════╝  ╚═════╝  ╚═════╝   ╚═╝      ╚═╝   ╚═╝  ╚═╝╚═╝     ╚══════╝
       ╰──────────────╯
`;

// ============= Mistral Chat Class =============

class MistralChat {
  private history: MistralMessage[] = [];
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly systemPrompt: string;
  private tools: MistralTool[] = [];

  constructor(apiKey: string, systemPrompt: string = '', baseUrl?: string) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl || 'https://api.mistral.ai/v1';
    this.systemPrompt = systemPrompt;
  }

  setTools(tools: MistralTool[]) {
    this.tools = tools;
  }

  clearHistory() {
    this.history = [];
  }

  async *sendMessageStream(
    model: string,
    message: string,
    signal?: AbortSignal,
  ): AsyncGenerator<MistralStreamChunk> {
    const userMessage: MistralMessage = { role: 'user', content: message };
    this.history.push(userMessage);

    const messages: MistralMessage[] = [];
    
    if (this.systemPrompt) {
      messages.push({ role: 'system', content: this.systemPrompt });
    }
    messages.push(...this.history);

    const body: Record<string, unknown> = {
      model,
      messages,
      stream: true,
    };

    if (this.tools.length > 0) {
      body.tools = this.tools;
      body.tool_choice = 'auto';
    }

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
      signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Mistral API error: ${response.status} - ${errorText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let assistantContent = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();
          if (data === '[DONE]') continue;
          
          try {
            const chunk: MistralStreamChunk = JSON.parse(data);
            
            if (chunk.choices[0]?.delta?.content) {
              assistantContent += chunk.choices[0].delta.content;
            }
            
            yield chunk;
          } catch {
            // Skip invalid JSON
          }
        }
      }
    }

    // Add assistant response to history
    if (assistantContent) {
      this.history.push({
        role: 'assistant',
        content: assistantContent,
      });
    }
  }
}

// ============= Main Function =============

async function main() {
  const apiKey = process.env['MISTRAL_API_KEY'];
  
  if (!apiKey) {
    console.error('\x1b[31mError: MISTRAL_API_KEY environment variable is required\x1b[0m');
    console.error('Set it with: export MISTRAL_API_KEY="your-api-key"');
    process.exit(1);
  }

  const model = process.env['MISTRAL_MODEL'] || DEFAULT_MODEL;
  const baseUrl = process.env['MISTRAL_API_BASE_URL'];
  const supportsTools = MISTRAL_MODELS_WITH_TOOLS.some(m => model.includes(m));
  
  console.log(ASCII_LOGO);
  console.log(`  \x1b[36mModel:\x1b[0m ${model}`);
  console.log(`  \x1b[36mTools:\x1b[0m ${supportsTools ? 'enabled' : 'disabled'}`);
  console.log('');
  console.log('  Commands:');
  console.log('    \x1b[33m/quit\x1b[0m   - Exit the CLI');
  console.log('    \x1b[33m/clear\x1b[0m  - Clear chat history');
  console.log('    \x1b[33m/model\x1b[0m  - Show current model');
  console.log('');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const chat = new MistralChat(apiKey, SYSTEM_PROMPT, baseUrl);

  const prompt = () => {
    rl.question('\x1b[36m❯\x1b[0m ', async (input) => {
      const trimmed = input.trim();
      
      if (!trimmed) {
        prompt();
        return;
      }

      // Handle commands
      if (trimmed.startsWith('/')) {
        const cmd = trimmed.toLowerCase();
        
        if (cmd === '/quit' || cmd === '/exit' || cmd === '/q') {
          console.log('\n\x1b[33mGoodbye! 👋\x1b[0m');
          rl.close();
          process.exit(0);
        }

        if (cmd === '/clear') {
          chat.clearHistory();
          console.log('\x1b[32mChat history cleared.\x1b[0m\n');
          prompt();
          return;
        }

        if (cmd === '/model') {
          console.log(`\x1b[36mCurrent model:\x1b[0m ${model}\n`);
          prompt();
          return;
        }

        if (cmd === '/help') {
          console.log('\n  Commands:');
          console.log('    \x1b[33m/quit\x1b[0m   - Exit the CLI');
          console.log('    \x1b[33m/clear\x1b[0m  - Clear chat history');
          console.log('    \x1b[33m/model\x1b[0m  - Show current model');
          console.log('    \x1b[33m/help\x1b[0m   - Show this help\n');
          prompt();
          return;
        }

        console.log(`\x1b[31mUnknown command: ${trimmed}\x1b[0m`);
        console.log('Type \x1b[33m/help\x1b[0m for available commands.\n');
        prompt();
        return;
      }

      try {
        process.stdout.write('\n\x1b[33m');
        
        const controller = new AbortController();
        
        // Handle Ctrl+C during streaming
        const sigintHandler = () => {
          controller.abort();
          process.stdout.write('\x1b[0m\n\n\x1b[31m(interrupted)\x1b[0m\n\n');
        };
        process.on('SIGINT', sigintHandler);
        
        try {
          for await (const chunk of chat.sendMessageStream(model, trimmed, controller.signal)) {
            const content = chunk.choices[0]?.delta?.content;
            if (content) {
              process.stdout.write(content);
            }
          }
        } finally {
          process.removeListener('SIGINT', sigintHandler);
        }
        
        process.stdout.write('\x1b[0m\n\n');
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          // Already handled above
        } else {
          console.error('\n\x1b[31mError:', error instanceof Error ? error.message : error, '\x1b[0m\n');
        }
      }

      prompt();
    });
  };

  // Handle Ctrl+C when not streaming
  rl.on('SIGINT', () => {
    console.log('\n\x1b[33mGoodbye! 👋\x1b[0m');
    process.exit(0);
  });

  prompt();
}

main().catch((error) => {
  console.error('\x1b[31mFatal error:', error, '\x1b[0m');
  process.exit(1);
});
