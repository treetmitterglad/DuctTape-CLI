/**
 * DuctTape CLI - Mistral API Integration
 * Forked from Gemini CLI
 */

import type { Config } from '../config/config.js';
import { retryWithBackoff, isRetryableError } from '../utils/retry.js';
import { coreEvents } from '../utils/events.js';

export interface MistralMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  tool_calls?: MistralToolCall[];
  tool_call_id?: string;
}

export interface MistralToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface MistralTool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface MistralStreamChunk {
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
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface MistralResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: MistralMessage;
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export enum StreamEventType {
  CHUNK = 'chunk',
  RETRY = 'retry',
  AGENT_EXECUTION_STOPPED = 'agent_execution_stopped',
  AGENT_EXECUTION_BLOCKED = 'agent_execution_blocked',
}

export type StreamEvent =
  | { type: StreamEventType.CHUNK; value: MistralStreamChunk }
  | { type: StreamEventType.RETRY }
  | { type: StreamEventType.AGENT_EXECUTION_STOPPED; reason: string }
  | { type: StreamEventType.AGENT_EXECUTION_BLOCKED; reason: string };

export class MistralChat {
  private history: MistralMessage[] = [];
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(
    private readonly config: Config,
    private systemInstruction: string = '',
    private tools: MistralTool[] = [],
    history: MistralMessage[] = [],
  ) {
    this.history = history;
    this.apiKey = process.env['MISTRAL_API_KEY'] || '';
    this.baseUrl = process.env['MISTRAL_API_BASE_URL'] || 'https://api.mistral.ai/v1';
    
    if (!this.apiKey) {
      throw new Error('MISTRAL_API_KEY environment variable is required');
    }
  }

  setSystemInstruction(sysInstr: string) {
    this.systemInstruction = sysInstr;
  }

  setTools(tools: MistralTool[]) {
    this.tools = tools;
  }

  getHistory(): MistralMessage[] {
    return [...this.history];
  }

  async *sendMessageStream(
    model: string,
    message: string,
    signal: AbortSignal,
  ): AsyncGenerator<StreamEvent> {
    const userMessage: MistralMessage = { role: 'user', content: message };
    this.history.push(userMessage);

    const messages: MistralMessage[] = [];
    
    if (this.systemInstruction) {
      messages.push({ role: 'system', content: this.systemInstruction });
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

    try {
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
      let toolCalls: MistralToolCall[] = [];

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
              
              if (chunk.choices[0]?.delta?.tool_calls) {
                for (const tc of chunk.choices[0].delta.tool_calls) {
                  const existing = toolCalls.find(t => t.id === tc.id);
                  if (existing) {
                    existing.function.arguments += tc.function.arguments;
                  } else {
                    toolCalls.push({
                      id: tc.id,
                      type: 'function',
                      function: {
                        name: tc.function.name,
                        arguments: tc.function.arguments,
                      },
                    });
                  }
                }
              }
              
              yield { type: StreamEventType.CHUNK, value: chunk };
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }

      // Add assistant response to history
      const assistantMessage: MistralMessage = {
        role: 'assistant',
        content: assistantContent,
      };
      if (toolCalls.length > 0) {
        assistantMessage.tool_calls = toolCalls;
      }
      this.history.push(assistantMessage);

    } catch (error) {
      if (signal.aborted) {
        throw new Error('Request aborted');
      }
      throw error;
    }
  }

  async sendMessage(
    model: string,
    message: string,
    signal: AbortSignal,
  ): Promise<MistralResponse> {
    const userMessage: MistralMessage = { role: 'user', content: message };
    this.history.push(userMessage);

    const messages: MistralMessage[] = [];
    
    if (this.systemInstruction) {
      messages.push({ role: 'system', content: this.systemInstruction });
    }
    messages.push(...this.history);

    const body: Record<string, unknown> = {
      model,
      messages,
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

    const result: MistralResponse = await response.json();
    
    if (result.choices[0]?.message) {
      this.history.push(result.choices[0].message);
    }

    return result;
  }

  addToolResult(toolCallId: string, result: string) {
    this.history.push({
      role: 'tool',
      content: result,
      tool_call_id: toolCallId,
    });
  }

  clearHistory() {
    this.history = [];
  }
}
