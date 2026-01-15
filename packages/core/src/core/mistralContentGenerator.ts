/**
 * DuctTape CLI - Mistral Content Generator
 * Replaces Google's content generator with Mistral API
 */

import type { Config } from '../config/config.js';

export interface MistralContentRequest {
  model: string;
  messages: MistralMessage[];
  tools?: MistralTool[];
  tool_choice?: 'auto' | 'none' | 'any';
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

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
}

export interface ContentGenerator {
  generateContent(request: MistralContentRequest): Promise<MistralResponse>;
  generateContentStream(request: MistralContentRequest): AsyncGenerator<MistralStreamChunk>;
}

export enum AuthType {
  MISTRAL_API_KEY = 'mistral-api-key',
}

export interface ContentGeneratorConfig {
  apiKey?: string;
  authType?: AuthType;
  baseUrl?: string;
}

export async function createContentGeneratorConfig(): Promise<ContentGeneratorConfig> {
  const apiKey = process.env['MISTRAL_API_KEY'];
  const baseUrl = process.env['MISTRAL_API_BASE_URL'] || 'https://api.mistral.ai/v1';

  return {
    apiKey,
    authType: AuthType.MISTRAL_API_KEY,
    baseUrl,
  };
}

export class MistralContentGenerator implements ContentGenerator {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: ContentGeneratorConfig) {
    if (!config.apiKey) {
      throw new Error('MISTRAL_API_KEY is required');
    }
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.mistral.ai/v1';
  }

  async generateContent(request: MistralContentRequest): Promise<MistralResponse> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        ...request,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Mistral API error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  async *generateContentStream(request: MistralContentRequest): AsyncGenerator<MistralStreamChunk> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        ...request,
        stream: true,
      }),
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
            yield chunk;
          } catch {
            // Skip invalid JSON
          }
        }
      }
    }
  }
}

export async function createContentGenerator(
  config: ContentGeneratorConfig,
): Promise<ContentGenerator> {
  return new MistralContentGenerator(config);
}

// Mistral models that support tools
export const MISTRAL_MODELS_WITH_TOOLS = [
  'mistral-large-latest',
  'mistral-medium-latest', 
  'mistral-small-latest',
  'open-mixtral-8x22b',
  'open-mixtral-8x7b',
];

export const DEFAULT_MISTRAL_MODEL = 'mistral-medium-latest';

export function supportsTools(model: string): boolean {
  return MISTRAL_MODELS_WITH_TOOLS.some(m => model.includes(m) || m.includes(model));
}
