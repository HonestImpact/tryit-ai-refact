// OpenAI LLM Provider using Vercel AI SDK
// Built on the existing TryIt-AI foundation

import { openai } from '@ai-sdk/openai';
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

export class OpenAIProvider extends BaseLLMProvider {
  private rateLimitRemaining: number = 1000; // Track rate limits
  private apiKey: string;

  constructor(apiKey?: string) {
    const capabilities: LLMCapability[] = [
      {
        name: 'gpt-4o',
        maxTokens: 128000,
        supportsStreaming: true,
        supportsTools: true,
        costPerToken: 0.000005 // $5 per million tokens (approximate)
      },
      {
        name: 'gpt-4o-mini',
        maxTokens: 128000,
        supportsStreaming: true,
        supportsTools: true,
        costPerToken: 0.00000015 // $0.15 per million tokens
      },
      {
        name: 'gpt-4-turbo',
        maxTokens: 128000,
        supportsStreaming: true,
        supportsTools: true,
        costPerToken: 0.00001 // $10 per million tokens
      },
      {
        name: 'gpt-3.5-turbo',
        maxTokens: 16385,
        supportsStreaming: true,
        supportsTools: true,
        costPerToken: 0.0000005 // $0.5 per million tokens
      }
    ];

    super('OpenAI', capabilities);
    
    this.apiKey = apiKey || process.env.OPENAI_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('OpenAI API key is required');
    }
  }

  protected async executeGeneration(request: TextGenerationRequest): Promise<TextGenerationResponse> {
    this.validateRequest(request);
    await this.applyRateLimit();

    try {
      // Use environment-configured model as default
      const modelToUse = request.model || AI_CONFIG.getModel();
      
      const response = await generateText({
        model: openai(modelToUse),
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
        model: openai(modelToUse),
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
    // OpenAI pricing (approximate, varies by model)
    return {
      promptCostPerToken: 0.000005,
      completionCostPerToken: 0.000015,
      currency: 'USD'
    };
  }

  private async applyRateLimit(): Promise<void> {
    // OpenAI has different rate limits based on tier
    // This is a simple implementation - could be more sophisticated
    if (this.rateLimitRemaining <= 0) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
      this.rateLimitRemaining = 100; // Reset
    }
  }
}
