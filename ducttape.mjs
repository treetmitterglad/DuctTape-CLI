#!/usr/bin/env node
/**
 * DuctTape CLI - AI-powered terminal assistant using Mistral
 */

import * as readline from 'readline';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
let currentModel = 'mistral-small-latest';

const ASCII_LOGO = `\x1b[90m           ┌─────────────────┐
          ╱\x1b[37m░░░░░░░░░░░░░░░░░\x1b[90m╲
         ╱\x1b[37m░░░\x1b[90m┌───────────┐\x1b[37m░░░\x1b[90m╲
        │\x1b[37m░░░\x1b[90m│           │\x1b[37m░░░\x1b[90m│      \x1b[36m╺━━╸\x1b[0m \x1b[1mDUCTTAPE\x1b[0m \x1b[36m╺━━╸\x1b[0m
\x1b[90m        │\x1b[37m░░░\x1b[90m│   \x1b[33m◉\x1b[90m       │\x1b[37m░░░\x1b[90m│      \x1b[90mAI Terminal Assistant\x1b[0m
\x1b[90m        │\x1b[37m░░░\x1b[90m│           │\x1b[37m░░░\x1b[90m│      \x1b[90mPowered by Mistral\x1b[0m
\x1b[90m         ╲\x1b[37m░░░\x1b[90m└───────────┘\x1b[37m░░░\x1b[90m╱
          ╲\x1b[37m░░░░░░░░░░░░░░░░░\x1b[90m╱
           └─────────────────┘\x1b[0m`;

const COMMANDS = [
  { cmd: '/help', desc: 'Show this help' },
  { cmd: '/model', desc: 'Change AI model' },
  { cmd: '/init', desc: 'Create DUCTTAPE.md' },
  { cmd: '/clear', desc: 'Clear screen & history' },
  { cmd: '/quit', desc: 'Exit' },
];

const TOOLS = [
  { type: 'function', function: { name: 'read_file', description: 'Read file contents', parameters: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] } } },
  { type: 'function', function: { name: 'write_file', description: 'Write to file', parameters: { type: 'object', properties: { path: { type: 'string' }, content: { type: 'string' } }, required: ['path', 'content'] } } },
  { type: 'function', function: { name: 'list_directory', description: 'List directory', parameters: { type: 'object', properties: { path: { type: 'string' } }, required: [] } } },
  { type: 'function', function: { name: 'run_command', description: 'Run shell command', parameters: { type: 'object', properties: { command: { type: 'string' } }, required: ['command'] } } },
];

async function executeTool(name, args) {
  process.stdout.write(`\x1b[35m  ⚙ ${name}\x1b[0m\n`);
  try {
    switch (name) {
      case 'read_file': return await fs.promises.readFile(path.resolve(args.path), 'utf-8');
      case 'write_file': await fs.promises.writeFile(path.resolve(args.path), args.content, 'utf-8'); return `Wrote to ${args.path}`;
      case 'list_directory': return (await fs.promises.readdir(path.resolve(args.path || '.'), { withFileTypes: true })).map(e => `${e.isDirectory() ? '📁' : '📄'} ${e.name}`).join('\n');
      case 'run_command': const { stdout, stderr } = await execAsync(args.command, { timeout: 30000 }); return stdout + (stderr ? `\nStderr: ${stderr}` : '');
      default: return `Unknown tool: ${name}`;
    }
  } catch (e) { return `Error: ${e.message}`; }
}

class MistralClient {
  constructor(apiKey, baseUrl) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl || 'https://api.mistral.ai/v1';
    this.history = [];
  }
  clearHistory() { this.history = []; }

  getSystemPrompt() {
    let prompt = `You are DuctTape, a helpful AI assistant. Be concise and direct. You have tools: read_file, write_file, list_directory, run_command.`;
    try { prompt += `\n\n--- Project Context ---\n${fs.readFileSync('DUCTTAPE.md', 'utf-8')}`; } catch {}
    return prompt;
  }

  async fetchModels() {
    const res = await fetch(`${this.baseUrl}/models`, { headers: { 'Authorization': `Bearer ${this.apiKey}` } });
    if (!res.ok) throw new Error('Failed to fetch models');
    const exclude = ['embed', 'moderation', 'classify', 'voxtral'];
    const models = (await res.json()).data.filter(m => !exclude.some(e => m.id.includes(e))).map(m => m.id);
    const latest = models.filter(m => m.endsWith('-latest'));
    const numbered = models.filter(m => /\d{4}/.test(m) && (m.includes('codestral') || m.includes('devstral')));
    const bestNumbered = {};
    for (const m of numbered) {
      const base = m.replace(/-\d{4}-\d{2}(-\d{2})?$/, '');
      if (!bestNumbered[base] || m > bestNumbered[base]) bestNumbered[base] = m;
    }
    return [...new Set([...latest, ...Object.values(bestNumbered)])].sort();
  }

  async chatStream(model, userMessage) {
    this.history.push({ role: 'user', content: userMessage });
    await this.streamResponse(model);
  }

  async streamResponse(model) {
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.apiKey}` },
      body: JSON.stringify({ model, messages: [{ role: 'system', content: this.getSystemPrompt() }, ...this.history], tools: TOOLS, tool_choice: 'auto', stream: true }),
    });
    if (!res.ok) throw new Error(res.status === 429 ? 'Rate limited - wait and retry' : `API error: ${res.status}`);

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '', content = '', toolCalls = [];

    process.stdout.write('\n  \x1b[33m');
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();
      for (const line of lines) {
        if (!line.startsWith('data: ') || line === 'data: [DONE]') continue;
        try {
          const delta = JSON.parse(line.slice(6)).choices[0]?.delta;
          if (delta?.content) { content += delta.content; process.stdout.write(delta.content); }
          if (delta?.tool_calls) for (const tc of delta.tool_calls) {
            if (tc.id) toolCalls.push({ id: tc.id, function: { name: tc.function?.name || '', arguments: '' } });
            if (tc.function?.arguments) toolCalls[toolCalls.length - 1].function.arguments += tc.function.arguments;
          }
        } catch {}
      }
    }
    process.stdout.write('\x1b[0m\n\n');

    if (toolCalls.length) {
      this.history.push({ role: 'assistant', content, tool_calls: toolCalls });
      for (const tc of toolCalls) {
        const result = await executeTool(tc.function.name, JSON.parse(tc.function.arguments));
        this.history.push({ role: 'tool', content: result, tool_call_id: tc.id });
      }
      await this.streamResponse(model);
    } else {
      this.history.push({ role: 'assistant', content });
    }
  }
}

const clearScreen = () => process.stdout.write('\x1b[2J\x1b[3J\x1b[H');

const box = (title, lines) => {
  const w = Math.max(title.length + 4, ...lines.map(l => l.replace(/\x1b\[[0-9;]*m/g, '').length + 4));
  return `\x1b[90m┌─ \x1b[1m${title}\x1b[0m\x1b[90m ${'─'.repeat(Math.max(0, w - title.length - 4))}┐
${lines.map(l => `│ ${l}${' '.repeat(Math.max(0, w - l.replace(/\x1b\[[0-9;]*m/g, '').length - 2))} │`).join('\n')}
└${'─'.repeat(w)}┘\x1b[0m`;
};

function showCommandMenu() {
  const menu = COMMANDS.map(c => `\x1b[33m${c.cmd.padEnd(10)}\x1b[0m\x1b[90m${c.desc}\x1b[0m`);
  console.log('\n' + box('Commands', menu) + '\n');
}

async function selectModel(client, rl) {
  console.log('\n\x1b[90m  Fetching models...\x1b[0m');
  try {
    const models = await client.fetchModels();
    console.log('\n' + box('Available Models', models.map((m, i) => 
      `\x1b[33m${(i + 1).toString().padStart(2)}.\x1b[0m ${m}${m === currentModel ? ' \x1b[32m(current)\x1b[0m' : ''}`
    )));
    
    return new Promise(resolve => {
      rl.question('\n  \x1b[90mEnter number or name:\x1b[0m ', answer => {
        const num = parseInt(answer.trim());
        if (num >= 1 && num <= models.length) {
          currentModel = models[num - 1];
          console.log(`\n  \x1b[32m✓ Model: ${currentModel}\x1b[0m\n`);
        } else if (models.includes(answer.trim())) {
          currentModel = answer.trim();
          console.log(`\n  \x1b[32m✓ Model: ${currentModel}\x1b[0m\n`);
        } else if (answer.trim()) {
          console.log(`\n  \x1b[31m✗ Invalid selection\x1b[0m\n`);
        } else {
          console.log(`\n  \x1b[90mCancelled\x1b[0m\n`);
        }
        resolve();
      });
    });
  } catch (e) {
    console.log(`\n  \x1b[31m✗ Error: ${e.message}\x1b[0m\n`);
  }
}

async function initDucttape() {
  if (fs.existsSync('DUCTTAPE.md')) { console.log('\n  \x1b[33m⚠ DUCTTAPE.md already exists\x1b[0m\n'); return; }
  fs.writeFileSync('DUCTTAPE.md', `# DUCTTAPE.md\n\n## Project Overview\n\n## Tech Stack\n\n## Key Files\n\n## Notes\n`);
  console.log('\n  \x1b[32m✓ Created DUCTTAPE.md\x1b[0m\n');
}

function showStatus() {
  const status = [`\x1b[90mModel:\x1b[0m ${currentModel}`];
  if (fs.existsSync('DUCTTAPE.md')) status.push(`\x1b[32m✓\x1b[0m \x1b[90mDUCTTAPE.md\x1b[0m`);
  console.log(`\n  ${status.join('  │  ')}  │  \x1b[90mType\x1b[0m \x1b[33m/\x1b[0m \x1b[90mfor commands\x1b[0m\n`);
}

async function main() {
  let apiKey = process.env['MISTRAL_API_KEY'];
  clearScreen();
  console.log('\n' + ASCII_LOGO + '\n');

  if (!apiKey) {
    const rlSetup = readline.createInterface({ input: process.stdin, output: process.stdout });
    console.log(box('Setup', ['\x1b[90mEnter your Mistral API key to get started\x1b[0m']));
    apiKey = await new Promise(r => rlSetup.question('\n  \x1b[33mAPI Key:\x1b[0m ', a => { rlSetup.close(); r(a.trim()); }));
    if (!apiKey) { console.log('\n  \x1b[31m✗ API key required\x1b[0m\n'); process.exit(1); }
    console.log('\n  \x1b[90mTip: export MISTRAL_API_KEY="..." to skip this\x1b[0m');
  }

  currentModel = process.env['MISTRAL_MODEL'] || currentModel;
  clearScreen();
  console.log('\n' + ASCII_LOGO);
  showStatus();

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const client = new MistralClient(apiKey, process.env['MISTRAL_API_BASE_URL']);

  const prompt = () => {
    rl.question('\x1b[36m  ❯\x1b[0m ', async (input) => {
      const cmd = input.trim();
      const cmdLower = cmd.toLowerCase();
      if (!cmd) return prompt();

      if (cmd === '/') { showCommandMenu(); return prompt(); }
      if (cmdLower === '/quit' || cmdLower === '/q') { console.log('\n  \x1b[33mGoodbye! 👋\x1b[0m\n'); process.exit(0); }
      if (cmdLower === '/clear') { clearScreen(); console.log('\n' + ASCII_LOGO); showStatus(); client.clearHistory(); return prompt(); }
      if (cmdLower === '/model') { await selectModel(client, rl); return prompt(); }
      if (cmdLower === '/init') { await initDucttape(); return prompt(); }
      if (cmdLower === '/help') { showCommandMenu(); return prompt(); }
      if (cmd.startsWith('/')) { console.log(`\n  \x1b[31m✗ Unknown: ${cmd}\x1b[0m\n`); return prompt(); }

      try { await client.chatStream(currentModel, cmd); } 
      catch (e) { console.error(`\n  \x1b[31m✗ ${e.message}\x1b[0m\n`); }
      prompt();
    });
  };

  rl.on('SIGINT', () => { console.log('\n\n  \x1b[33mGoodbye! 👋\x1b[0m\n'); process.exit(0); });
  rl.on('close', () => process.exit(0));
  prompt();
}

main().catch(e => { console.error(`\x1b[31mFatal: ${e}\x1b[0m`); process.exit(1); });
