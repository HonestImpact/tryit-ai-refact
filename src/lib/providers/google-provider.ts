// Google AI Studio (Gemini) LLM Provider using Vercel AI SDK
// Built on the existing TryIt-AI foundation

import { google } from '@ai-sdk/google';
import { generateText, streamText } from 'ai';
import { BaseLLMProvider } from './base-llm-provider';
import { AI_CONFIG } from '../ai-config';
import type {
  LLMCapability,
  TextGenerationRequest,
  TextGenerationResponse,
  TextChunk,
  ProviderCosts
} from '../agents/types';

export class GoogleProvider extends BaseLLMProvider {
  private rateLimitRemaining: number = 1000; // Track rate limits
  private apiKey: string;

  constructor(apiKey?: string) {
    const capabilities: LLMCapability[] = [
      {
        name: 'gemini-1.5-pro',
        maxTokens: 2097152, // 2M tokens context
        supportsStreaming: true,
        supportsTools: true,
        costPerToken: 0.00000125 // $1.25 per million tokens (approximate)
      },
      {
        name: 'gemini-1.5-flash',
        maxTokens: 1048576, // 1M tokens context
        supportsStreaming: true,
        supportsTools: true,
        costPerToken: 0.000000075 // $0.075 per million tokens
      },
      {
        name: 'gemini-pro',
        maxTokens: 32768,
        supportsStreaming: true,
        supportsTools: true,
        costPerToken: 0.0000005 // $0.5 per million tokens
      },
      {
        name: 'gemini-pro-vision',
        maxTokens: 16384,
        supportsStreaming: true,
        supportsTools: false,
        costPerToken: 0.00000025 // $0.25 per million tokens
      }
    ];

    super('Google AI Studio', capabilities);
    
    this.apiKey = apiKey || process.env.GOOGLE_API_KEY || process.env.AISTUDIO_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('Google AI Studio API key is required (GOOGLE_API_KEY or AISTUDIO_API_KEY)');
    }
  }

  protected async executeGeneration(request: TextGenerationRequest): Promise<TextGenerationResponse> {
    this.validateRequest(request);
    await this.applyRateLimit();

    try {
      // Use environment-configured model as default
      const modelToUse = request.model || AI_CONFIG.getModel();
      
      const response = await generateText({
        model: google(modelToUse, {
          apiKey: this.apiKey,
        }),
        messages: request.messages.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        maxRetries: 3,
        temperature: request.temperature,
        maxTokens: request.maxTokens,
      });

      // Update rate limit tracking
      this.rateLimitRemaining = Math.max(0, this.rateLimitRemaining - 1);

      return {
        content: response.text,
        usage: {
          promptTokens: response.usage?.promptTokens || 0,
          completionTokens: response.usage?.completionTokens || 0,
          totalTokens: response.usage?.totalTokens || 0
        },
        model: modelToUse,
        finishReason: response.finishReason || 'stop'
      };
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  protected async *executeStreamGeneration(request: TextGenerationRequest): AsyncIterableIterator<TextChunk> {
    this.validateRequest(request);
    await this.applyRateLimit();

    try {
      const modelToUse = request.model || AI_CONFIG.getModel();
      
      const stream = await streamText({
        model: google(modelToUse, {
          apiKey: this.apiKey,
        }),
        messages: request.messages.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        temperature: request.temperature,
        maxTokens: request.maxTokens,
      });

      for await (const chunk of stream.textStream) {
        yield {
          content: chunk,
          finishReason: null
        };
      }

      // Final chunk with finish reason
      yield {
        content: '',
        finishReason: 'stop'
      };

    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  public getCosts(): ProviderCosts {
    // Google AI Studio pricing (approximate, varies by model)
    return {
      promptCostPerToken: 0.00000125,
      completionCostPerToken: 0.00000375,
      currency: 'USD'
    };
  }

  private async applyRateLimit(): Promise<void> {
    // Google AI Studio rate limits
    if (this.rateLimitRemaining <= 0) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
      this.rateLimitRemaining = 100; // Reset
    }
  }
}
