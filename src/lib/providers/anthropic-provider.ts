// Anthropic LLM Provider using Vercel AI SDK
// Built on the existing TryIt-AI foundation

import { anthropic } from '@ai-sdk/anthropic';
import { generateText, streamText } from 'ai';
import { BaseLLMProvider } from './base-llm-provider';
import type {
  LLMCapability,
  TextGenerationRequest,
  TextGenerationResponse,
  TextChunk,
  ProviderCosts
} from '../agents/types';

export class AnthropicProvider extends BaseLLMProvider {
  private rateLimitRemaining: number = 1000; // Track rate limits
  private apiKey: string;

  constructor(apiKey?: string) {
    const capabilities: LLMCapability[] = [
      {
        name: 'claude-3-5-sonnet-20241022',
        maxTokens: 200000,
        supportsStreaming: true,
        supportsTools: true,
        costPerToken: 0.000003 // $3 per million tokens (approximate)
      },
      {
        name: 'claude-sonnet-4-20250514',
        maxTokens: 200000,
        supportsStreaming: true,
        supportsTools: true,
        costPerToken: 0.000003
      },
      {
        name: 'claude-3-haiku-20240307',
        maxTokens: 200000,
        supportsStreaming: true,
        supportsTools: false,
        costPerToken: 0.00000025 // $0.25 per million tokens
      }
    ];

    super('anthropic', capabilities);
    
    this.apiKey = apiKey || process.env.ANTHROPIC_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('Anthropic API key is required');
    }
  }

  protected async executeGeneration(request: TextGenerationRequest): Promise<TextGenerationResponse> {
    this.validateRequest(request);
    await this.applyRateLimit();

    try {
      const response = await generateText({
        model: anthropic(request.model),
        messages: request.messages.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        maxTokens: request.maxTokens,
        temperature: request.temperature,
      });

      // Update rate limit tracking (Anthropic returns rate limit info in headers)
      this.rateLimitRemaining = Math.max(0, this.rateLimitRemaining - 1);

      return {
        content: response.text,
        usage: {
          promptTokens: response.usage.promptTokens,
          completionTokens: response.usage.completionTokens,
          totalTokens: response.usage.totalTokens
        },
        model: request.model,
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
      const stream = await streamText({
        model: anthropic(request.model),
        messages: request.messages.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        maxTokens: request.maxTokens,
        temperature: request.temperature,
      });

      for await (const chunk of stream.textStream) {
        yield {
          content: chunk,
          isComplete: false
        };
      }

      // Final chunk
      yield {
        content: '',
        isComplete: true,
        metadata: {
          usage: await stream.usage
        }
      };

      this.rateLimitRemaining = Math.max(0, this.rateLimitRemaining - 1);
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  public getCosts(): ProviderCosts {
    return {
      promptCostPerToken: 0.000003,
      completionCostPerToken: 0.000015,
      currency: 'USD'
    };
  }

  protected getRateLimitRemaining(): number {
    return this.rateLimitRemaining;
  }

  // ===== ANTHROPIC-SPECIFIC METHODS =====

  private handleError(error: Error): void {
    // Handle Anthropic-specific errors
    if (error.message.includes('rate_limit')) {
      this.rateLimitRemaining = 0;
      this.logError('Rate limit exceeded', error);
    } else if (error.message.includes('invalid_api_key')) {
      this.logError('Invalid API key', error);
    } else if (error.message.includes('model_not_found')) {
      this.logError('Model not found', error);
    } else {
      this.logError('Unknown Anthropic error', error);
    }
  }

  protected validateRequest(request: TextGenerationRequest): void {
    super.validateRequest(request);

    // Anthropic-specific validations
    if (request.temperature && (request.temperature < 0 || request.temperature > 1)) {
      throw new Error('Temperature must be between 0 and 1');
    }

    // Check if model is supported
    const isSupported = this.capabilities.some(cap => cap.name === request.model);
    if (!isSupported) {
      throw new Error(`Model ${request.model} is not supported by Anthropic provider`);
    }
  }

  /**
   * Check if streaming is supported for the given model
   */
  public supportsStreaming(model: string): boolean {
    const capability = this.capabilities.find(cap => cap.name === model);
    return capability?.supportsStreaming || false;
  }

  /**
   * Check if tools are supported for the given model
   */
  public supportsTools(model: string): boolean {
    const capability = this.capabilities.find(cap => cap.name === model);
    return capability?.supportsTools || false;
  }

  /**
   * Get the maximum context length for a model
   */
  public getMaxTokens(model: string): number {
    const capability = this.capabilities.find(cap => cap.name === model);
    return capability?.maxTokens || 100000;
  }

  /**
   * Estimate costs for a request
   */
  public estimateCost(request: TextGenerationRequest): number {
    const capability = this.capabilities.find(cap => cap.name === request.model);
    if (!capability) return 0;

    const promptTokens = this.estimateTokens(
      request.messages.map(m => m.content).join(' ')
    );
    const maxCompletionTokens = request.maxTokens || 1000;

    return (promptTokens * this.getCosts().promptCostPerToken) + 
           (maxCompletionTokens * this.getCosts().completionCostPerToken);
  }

  protected async onShutdown(): Promise<void> {
    this.log('info', 'Anthropic provider shutting down');
    // Any cleanup specific to Anthropic provider
  }
}
