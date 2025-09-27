// Base LLM Provider abstraction for multi-provider support
// Built on the existing TryIt-AI foundation

import type {
  LLMProvider,
  LLMCapability,
  TextGenerationRequest,
  TextGenerationResponse,
  TextChunk,
  ProviderCosts,
  ProviderStatus
} from '../agents/types';
import { createLogger } from '@/lib/logger';

// Re-export LLMProvider for external use
export type { LLMProvider };

export abstract class BaseLLMProvider implements LLMProvider {
  public readonly name: string;
  public readonly capabilities: LLMCapability[];
  
  protected requestCount: number = 0;
  protected totalResponseTime: number = 0;
  protected errorCount: number = 0;
  protected lastChecked: Date = new Date();
  protected isShutdown: boolean = false;
  protected logger = createLogger('BaseLLMProvider');

  constructor(name: string, capabilities: LLMCapability[]) {
    this.name = name;
    this.capabilities = capabilities;
  }

  public async generateText(request: TextGenerationRequest): Promise<TextGenerationResponse> {
    if (this.isShutdown) {
      throw new Error(`Provider ${this.name} is shutdown`);
    }

    const startTime = Date.now();
    this.requestCount++;
    this.lastChecked = new Date();

    try {
      const response = await this.executeGeneration(request);
      this.totalResponseTime += Date.now() - startTime;
      return response;
    } catch (error) {
      this.errorCount++;
      this.logError('Text generation failed', error as Error, { request });
      throw error;
    }
  }

  public async *streamText(request: TextGenerationRequest): AsyncIterableIterator<TextChunk> {
    if (this.isShutdown) {
      throw new Error(`Provider ${this.name} is shutdown`);
    }

    const startTime = Date.now();
    this.requestCount++;
    this.lastChecked = new Date();

    try {
      yield* this.executeStreamGeneration(request);
      this.totalResponseTime += Date.now() - startTime;
    } catch (error) {
      this.errorCount++;
      this.logError('Stream generation failed', error as Error, { request });
      throw error;
    }
  }

  public getStatus(): ProviderStatus {
    const avgResponseTime = this.requestCount > 0 
      ? this.totalResponseTime / this.requestCount 
      : 0;
    
    const errorRate = this.requestCount > 0 
      ? this.errorCount / this.requestCount 
      : 0;

    return {
      isAvailable: !this.isShutdown && errorRate < 0.2, // Less than 20% error rate
      responseTime: avgResponseTime,
      errorRate,
      rateLimitRemaining: this.getRateLimitRemaining(),
      lastChecked: this.lastChecked
    };
  }

  public async shutdown(): Promise<void> {
    this.isShutdown = true;
    await this.onShutdown();
  }

  // ===== ABSTRACT METHODS =====

  /**
   * Execute text generation - must be implemented by each provider
   */
  protected abstract executeGeneration(request: TextGenerationRequest): Promise<TextGenerationResponse>;

  /**
   * Execute streaming text generation - must be implemented by each provider
   */
  protected abstract executeStreamGeneration(request: TextGenerationRequest): AsyncIterableIterator<TextChunk>;

  /**
   * Get provider-specific costs
   */
  public abstract getCosts(): ProviderCosts;

  /**
   * Get remaining rate limit - provider-specific
   */
  protected abstract getRateLimitRemaining(): number;

  // ===== HOOK METHODS =====

  /**
   * Called when provider is being shutdown
   */
  protected async onShutdown(): Promise<void> {
    // Default: no shutdown logic
  }

  // ===== HELPER METHODS =====

  /**
   * Validate request before processing
   */
  protected validateRequest(request: TextGenerationRequest): void {
    if (!request.model) {
      throw new Error('Model is required');
    }

    if (!request.messages || request.messages.length === 0) {
      throw new Error('Messages are required');
    }

    // Check token limits
    const capability = this.capabilities.find(cap => 
      cap.name === request.model || cap.name === 'default'
    );
    
    if (capability && request.maxTokens && request.maxTokens > capability.maxTokens) {
      throw new Error(`Max tokens ${request.maxTokens} exceeds capability ${capability.maxTokens}`);
    }
  }

  /**
   * Log provider activity
   */
  protected log(level: 'info' | 'warn' | 'error', message: string, metadata?: Record<string, unknown>): void {
    const logData = {
      provider: this.name,
      level,
      message,
      timestamp: new Date().toISOString(),
      ...metadata
    };

    this.logger[level](message, metadata);
  }

  /**
   * Log errors with additional context
   */
  protected logError(message: string, error: Error, metadata?: Record<string, unknown>): void {
    this.log('error', message, {
      error: error.message,
      stack: error.stack,
      ...metadata
    });
  }

  /**
   * Estimate token count (basic implementation)
   */
  protected estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  /**
   * Build error response for failed requests
   */
  protected buildErrorResponse(error: Error, model: string): TextGenerationResponse {
    return {
      content: 'I encountered an issue processing your request. Please try again.',
      usage: {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0
      },
      model,
      finishReason: 'error'
    };
  }

  /**
   * Apply rate limiting (basic implementation)
   */
  protected async applyRateLimit(): Promise<void> {
    // Basic rate limiting - implement provider-specific logic
    const rateLimit = this.getRateLimitRemaining();
    if (rateLimit <= 0) {
      throw new Error(`Rate limit exceeded for provider ${this.name}`);
    }
  }

  /**
   * Retry with exponential backoff
   */
  protected async retryWithBackoff<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === maxRetries) {
          break;
        }
        
        // Exponential backoff
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        this.log('warn', `Retry attempt ${attempt + 1} after error`, { 
          error: lastError.message 
        });
      }
    }
    
    throw lastError!;
  }
}
