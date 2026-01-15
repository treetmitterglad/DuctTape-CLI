#!/usr/bin/env node
/**
 * DuctTape CLI - Main Entry Point
 * AI-powered terminal assistant using Mistral
 */

import { MistralChat, StreamEventType } from './mistralChat.js';
import { DEFAULT_MISTRAL_MODEL, supportsTools } from './mistralContentGenerator.js';
import * as readline from 'readline';

const SYSTEM_PROMPT = `You are DuctTape, a helpful AI assistant running in a terminal. 
You help users with coding tasks, system operations, and general questions.
Be concise and direct in your responses. Use markdown formatting when helpful.`;

async function main() {
  const apiKey = process.env['MISTRAL_API_KEY'];
  
  if (!apiKey) {
    console.error('Error: MISTRAL_API_KEY environment variable is required');
    console.error('Set it with: export MISTRAL_API_KEY="your-api-key"');
    process.exit(1);
  }

  const model = process.env['MISTRAL_MODEL'] || DEFAULT_MISTRAL_MODEL;
  
  console.log(`
       ╭──────────────╮
      ╱ ╭────────────╮ ╲     ██████╗ ██╗   ██╗ ██████╗████████╗████████╗ █████╗ ██████╗ ███████╗
     ╱ ╱              ╲ ╲    ██╔══██╗██║   ██║██╔════╝╚══██╔══╝╚══██╔══╝██╔══██╗██╔══██╗██╔════╝
    │ │    ╭──────╮    │ │   ██║  ██║██║   ██║██║        ██║      ██║   ███████║██████╔╝█████╗  
    │ │    │ TAPE │    │ │   ██║  ██║██║   ██║██║        ██║      ██║   ██╔══██║██╔═══╝ ██╔══╝  
     ╲ ╲   ╰──────╯   ╱ ╱    ██████╔╝╚██████╔╝╚██████╗   ██║      ██║   ██║  ██║██║     ███████╗
      ╲ ╰────────────╯ ╱     ╚═════╝  ╚═════╝  ╚═════╝   ╚═╝      ╚═╝   ╚═╝  ╚═╝╚═╝     ╚══════╝
       ╰──────────────╯
`);
  console.log(`  Model: ${model}`);
  console.log(`  Tools: ${supportsTools(model) ? 'enabled' : 'disabled'}`);
  console.log('  Type /quit to exit\n');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const chat = new MistralChat(
    {} as any, // Config placeholder
    SYSTEM_PROMPT,
    [], // Tools - can be added later
    [],
  );

  const prompt = () => {
    rl.question('\x1b[36m❯\x1b[0m ', async (input) => {
      const trimmed = input.trim();
      
      if (!trimmed) {
        prompt();
        return;
      }

      if (trimmed === '/quit' || trimmed === '/exit') {
        console.log('\nGoodbye! 👋');
        rl.close();
        process.exit(0);
      }

      if (trimmed === '/clear') {
        chat.clearHistory();
        console.log('Chat history cleared.\n');
        prompt();
        return;
      }

      try {
        process.stdout.write('\x1b[33m');
        
        const controller = new AbortController();
        
        for await (const event of chat.sendMessageStream(model, trimmed, controller.signal)) {
          if (event.type === StreamEventType.CHUNK) {
            const content = event.value.choices[0]?.delta?.content;
            if (content) {
              process.stdout.write(content);
            }
          }
        }
        
        process.stdout.write('\x1b[0m\n\n');
      } catch (error) {
        console.error('\x1b[31mError:', error instanceof Error ? error.message : error, '\x1b[0m\n');
      }

      prompt();
    });
  };

  prompt();
}

main().catch(console.error);
