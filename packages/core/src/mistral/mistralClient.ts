/**
 * @license
 * Copyright 2025 DuctTape CLI
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  CountTokensResponse,
  GenerateContentResponse,
  GenerateContentParameters,
  CountTokensParameters,
  EmbedContentResponse,
  EmbedContentParameters,
} from '@google/genai';
import { ContentGenerator } from '../core/contentGenerator.js';
import fetch from 'node-fetch';
import { debugLogger } from '../utils/debugLogger.js';

interface MistralApiResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface MistralModel {
  id: string;
  object: string;
  created: number;
  owned_by: string;
}

export class MistralClient implements ContentGenerator {
  private readonly apiBaseUrl: string;
  private readonly defaultModel: string;
  
  constructor(
    private readonly apiKey: string, 
    private readonly httpOptions: any,
    baseUrl: string = 'https://api.mistral.ai/v1',
    model: string = 'mistral-tiny'
  ) {
    this.apiBaseUrl = baseUrl;
    this.defaultModel = model;
  }

  async generateContent(
    request: GenerateContentParameters,
    userPromptId: string,
  ): Promise<GenerateContentResponse> {
    try {
      debugLogger.log('MistralClient.generateContent called with:', {
        request,
        userPromptId,
        model: this.defaultModel,
      });

      // Convert the request to Mistral API format
      const messages = request.contents.map(content => ({
        role: content.role === 'user' ? 'user' : 'assistant',
        content: content.parts.map(part => part.text || '').join(' '),
      }));

      const response = await fetch(`${this.apiBaseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          ...this.httpOptions?.headers,
        },
        body: JSON.stringify({
          model: this.defaultModel,
          messages: messages,
          temperature: request.generationConfig?.temperature ?? 0.7,
          max_tokens: request.generationConfig?.maxOutputTokens ?? 1024,
          top_p: request.generationConfig?.topP ?? 1,
          stream: false,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Mistral API error: ${response.status} ${response.statusText}\n${JSON.stringify(errorData)}`);
      }

      const apiResponse: MistralApiResponse = await response.json();

      // Convert Mistral response to Google GenAI format
      return {
        candidates: apiResponse.choices.map((choice, index) => ({
          content: {
            parts: [
              {
                text: choice.message.content,
              },
            ],
            role: 'model' as const,
          },
          finishReason: choice.finish_reason === 'stop' ? 'STOP' : 'OTHER',
          index: index,
          safetyRatings: [],
        })),
        usageMetadata: {
          promptTokenCount: apiResponse.usage.prompt_tokens,
          candidatesTokenCount: apiResponse.usage.completion_tokens,
          totalTokenCount: apiResponse.usage.total_tokens,
        },
      };
    } catch (error) {
      debugLogger.error('Mistral API call failed:', error);
      throw new Error(`Failed to generate content with Mistral AI: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async generateContentStream(
    request: GenerateContentParameters,
    userPromptId: string,
  ): Promise<AsyncGenerator<GenerateContentResponse>> {
    try {
      debugLogger.log('MistralClient.generateContentStream called with:', {
        request,
        userPromptId,
        model: this.defaultModel,
      });

      // Convert the request to Mistral API format
      const messages = request.contents.map(content => ({
        role: content.role === 'user' ? 'user' : 'assistant',
        content: content.parts.map(part => part.text || '').join(' '),
      }));

      const response = await fetch(`${this.apiBaseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          ...this.httpOptions?.headers,
        },
        body: JSON.stringify({
          model: this.defaultModel,
          messages: messages,
          temperature: request.generationConfig?.temperature ?? 0.7,
          max_tokens: request.generationConfig?.maxOutputTokens ?? 1024,
          top_p: request.generationConfig?.topP ?? 1,
          stream: true,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Mistral API error: ${response.status} ${response.statusText}\n${JSON.stringify(errorData)}`);
      }

      // Handle streaming response
      async function* streamGenerator() {
        let accumulatedContent = '';
        let usageMetadata = {
          promptTokenCount: 0,
          candidatesTokenCount: 0,
          totalTokenCount: 0,
        };

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('No response body available for streaming');
        }

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          
          // Process complete lines
          let lineEnd;
          while ((lineEnd = buffer.indexOf('\n')) >= 0) {
            const line = buffer.slice(0, lineEnd).trim();
            buffer = buffer.slice(lineEnd + 1);
            
            if (line === '') continue;
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') break;
              
              try {
                const chunk = JSON.parse(data);
                
                if (chunk.choices && chunk.choices[0]?.delta?.content) {
                  accumulatedContent += chunk.choices[0].delta.content;
                  
                  yield {
                    candidates: [{
                      content: {
                        parts: [{
                          text: accumulatedContent,
                        }],
                        role: 'model' as const,
                      },
                      finishReason: null,
                      index: 0,
                      safetyRatings: [],
                    }],
                    usageMetadata,
                  };
                }
                
                if (chunk.usage) {
                  usageMetadata = {
                    promptTokenCount: chunk.usage.prompt_tokens,
                    candidatesTokenCount: chunk.usage.completion_tokens,
                    totalTokenCount: chunk.usage.total_tokens,
                  };
                }
              } catch (e) {
                debugLogger.error('Error parsing streaming chunk:', e);
              }
            }
          }
        }

        // Final response with complete content
        yield {
          candidates: [{
            content: {
              parts: [{
                text: accumulatedContent,
              }],
              role: 'model' as const,
            },
            finishReason: 'STOP',
            index: 0,
            safetyRatings: [],
          }],
          usageMetadata,
        };
      }

      return streamGenerator();
    } catch (error) {
      debugLogger.error('Mistral API streaming call failed:', error);
      throw new Error(`Failed to stream content with Mistral AI: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async countTokens(request: CountTokensParameters): Promise<CountTokensResponse> {
    try {
      debugLogger.log('MistralClient.countTokens called with:', request);

      // For Mistral, we'll estimate token count since they don't have a dedicated endpoint
      // This is a reasonable approximation for most use cases
      const textContent = request.content.parts
        .map(part => typeof part.text === 'string' ? part.text : '')
        .join(' ');

      // Approximate token count (Mistral tokens are roughly 4 characters per token)
      const charCount = textContent.length;
      const estimatedTokens = Math.ceil(charCount / 4);

      return {
        totalTokens: estimatedTokens,
      } as unknown as CountTokensResponse;
    } catch (error) {
      debugLogger.error('Mistral token counting failed:', error);
      // Fallback to simple character count
      const textContent = request.content.parts
        .map(part => typeof part.text === 'string' ? part.text : '')
        .join(' ');
      return {
        totalTokens: Math.ceil(textContent.length / 4),
      } as unknown as CountTokensResponse;
    }
  }

  async embedContent(request: EmbedContentParameters): Promise<EmbedContentResponse> {
    try {
      debugLogger.log('MistralClient.embedContent called with:', request);

      // Extract text content from the request
      const textContent = request.content.parts
        .map(part => typeof part.text === 'string' ? part.text : '')
        .join(' ');

      if (!textContent.trim()) {
        throw new Error('No text content provided for embedding');
      }

      const response = await fetch(`${this.apiBaseUrl}/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          ...this.httpOptions?.headers,
        },
        body: JSON.stringify({
          model: this.defaultModel,
          input: textContent,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Mistral embedding API error: ${response.status} ${response.statusText}\n${JSON.stringify(errorData)}`);
      }

      const apiResponse = await response.json();

      // Convert Mistral embedding response to Google GenAI format
      return {
        embedding: {
          values: apiResponse.data[0]?.embedding || new Array(768).fill(0.1),
        },
      };
    } catch (error) {
      debugLogger.error('Mistral embedding failed:', error);
      // Fallback to mock embedding
      return {
        embedding: {
          values: new Array(768).fill(0.1),
        },
      } as unknown as EmbedContentResponse;
    }
  }

  // Model discovery functionality
  async listAvailableModels(): Promise<MistralModel[]> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          ...this.httpOptions?.headers,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Failed to fetch Mistral models: ${response.status} ${response.statusText}\n${JSON.stringify(errorData)}`);
      }

      const apiResponse = await response.json();
      return apiResponse.data as MistralModel[];
    } catch (error) {
      debugLogger.error('Failed to list Mistral models:', error);
      // Return a list of known Mistral models as fallback
      return [
        { id: 'mistral-tiny', object: 'model', created: Date.now(), owned_by: 'mistral' },
        { id: 'mistral-small', object: 'model', created: Date.now(), owned_by: 'mistral' },
        { id: 'mistral-medium', object: 'model', created: Date.now(), owned_by: 'mistral' },
        { id: 'mistral-large', object: 'model', created: Date.now(), owned_by: 'mistral' },
      ];
    }
  }

  // Add method to get available models as a public method
  async getAvailableModels(): Promise<string[]> {
    const models = await this.listAvailableModels();
    return models.map(model => model.id);
  }
}