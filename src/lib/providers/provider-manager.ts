// Provider Manager - handles multiple LLM providers with fallback and routing
// Built on the existing TryIt-AI foundation

import type {
  LLMProvider,
  TextGenerationRequest,
  TextGenerationResponse,
  TextChunk,
  ProviderCosts,
  ProviderStatus
} from '../agents/types';

export interface ProviderConfig {
  readonly name: string;
  readonly priority: number;
  readonly costWeight: number; // Higher = prefer for cost optimization
  readonly enabled: boolean;
}

export interface RoutingStrategy {
  readonly type: 'cost-optimized' | 'performance-optimized' | 'round-robin' | 'priority';
  readonly fallbackEnabled: boolean;
  readonly maxRetries: number;
  readonly healthCheckInterval: number;
}

export class ProviderManager {
  private providers: Map<string, LLMProvider> = new Map();
  private configs: Map<string, ProviderConfig> = new Map();
  private routingStrategy: RoutingStrategy;
  private requestCounts: Map<string, number> = new Map();
  private lastUsedIndex: number = 0;
  private isShutdown: boolean = false;

  constructor(routingStrategy: RoutingStrategy = {
    type: 'cost-optimized',
    fallbackEnabled: true,
    maxRetries: 3,
    healthCheckInterval: 60000 // 1 minute
  }) {
    this.routingStrategy = routingStrategy;
    this.startHealthMonitoring();
  }

  public registerProvider(
    provider: LLMProvider, 
    config: ProviderConfig
  ): void {
    if (this.isShutdown) {
      throw new Error('Provider manager is shutdown');
    }

    this.providers.set(provider.name, provider);
    this.configs.set(provider.name, config);
    this.requestCounts.set(provider.name, 0);
    
    this.log('info', `Registered provider: ${provider.name}`, { config });
  }

  public unregisterProvider(providerName: string): void {
    const provider = this.providers.get(providerName);
    if (provider) {
      provider.shutdown().catch(error => 
        this.log('warn', `Error shutting down provider ${providerName}:`, { error })
      );
      
      this.providers.delete(providerName);
      this.configs.delete(providerName);
      this.requestCounts.delete(providerName);
      
      this.log('info', `Unregistered provider: ${providerName}`);
    }
  }

  public async generateText(request: TextGenerationRequest): Promise<TextGenerationResponse> {
    if (this.isShutdown) {
      throw new Error('Provider manager is shutdown');
    }

    const provider = this.selectProvider(request);
    if (!provider) {
      throw new Error('No available providers');
    }

    return this.executeWithFallback(
      () => provider.generateText(request),
      request,
      provider.name
    );
  }

  public async *streamText(request: TextGenerationRequest): AsyncIterableIterator<TextChunk> {
    if (this.isShutdown) {
      throw new Error('Provider manager is shutdown');
    }

    const provider = this.selectProvider(request);
    if (!provider) {
      throw new Error('No available providers');
    }

    // Check if provider supports streaming
    const supportsStreaming = provider.capabilities.some(cap => cap.supportsStreaming);
    if (!supportsStreaming) {
      // Fallback to regular generation and simulate streaming
      const response = await this.generateText(request);
      yield {
        content: response.content,
        isComplete: true,
        metadata: { usage: response.usage }
      };
      return;
    }

    try {
      this.incrementRequestCount(provider.name);
      yield* provider.streamText(request);
    } catch (error) {
      this.log('error', `Provider ${provider.name} streaming failed:`, { error });
      
      if (this.routingStrategy.fallbackEnabled) {
        const fallbackProvider = this.selectFallbackProvider(provider.name, request);
        if (fallbackProvider) {
          this.log('info', `Falling back to provider: ${fallbackProvider.name}`);
          yield* this.streamText(request); // Recursive fallback
          return;
        }
      }
      
      throw error;
    }
  }

  public getProviderStatus(providerName: string): ProviderStatus | null {
    const provider = this.providers.get(providerName);
    return provider ? provider.getStatus() : null;
  }

  public getAllProviders(): Array<{ name: string; status: ProviderStatus; config: ProviderConfig }> {
    return Array.from(this.providers.entries()).map(([name, provider]) => ({
      name,
      status: provider.getStatus(),
      config: this.configs.get(name)!
    }));
  }

  public getOptimalProvider(request: TextGenerationRequest): string | null {
    const provider = this.selectProvider(request);
    return provider ? provider.name : null;
  }

  public async shutdown(): Promise<void> {
    this.isShutdown = true;
    
    const shutdownPromises = Array.from(this.providers.values()).map(provider =>
      provider.shutdown().catch(error =>
        this.log('warn', `Error shutting down provider ${provider.name}:`, { error })
      )
    );
    
    await Promise.all(shutdownPromises);
    this.providers.clear();
    this.configs.clear();
    this.requestCounts.clear();
    
    this.log('info', 'Provider manager shutdown complete');
  }

  // ===== PRIVATE METHODS =====

  private selectProvider(request: TextGenerationRequest): LLMProvider | null {
    const availableProviders = this.getHealthyProviders();
    if (availableProviders.length === 0) return null;

    switch (this.routingStrategy.type) {
      case 'cost-optimized':
        return this.selectCostOptimized(availableProviders, request);
      case 'performance-optimized':
        return this.selectPerformanceOptimized(availableProviders);
      case 'round-robin':
        return this.selectRoundRobin(availableProviders);
      case 'priority':
        return this.selectByPriority(availableProviders);
      default:
        return availableProviders[0];
    }
  }

  private selectCostOptimized(
    providers: LLMProvider[], 
    request: TextGenerationRequest
  ): LLMProvider {
    // Calculate cost for each provider
    const providerCosts = providers.map(provider => {
      const costs = provider.getCosts();
      const config = this.configs.get(provider.name)!;
      
      // Estimate total cost for this request
      const estimatedTokens = this.estimateTokens(
        request.messages.map(m => m.content).join(' ')
      );
      const maxCompletion = request.maxTokens || 1000;
      
      const totalCost = (estimatedTokens * costs.promptCostPerToken) + 
                       (maxCompletion * costs.completionCostPerToken);
      
      // Apply cost weight from config
      const weightedCost = totalCost / config.costWeight;
      
      return { provider, cost: weightedCost };
    });

    // Sort by cost and return the cheapest
    providerCosts.sort((a, b) => a.cost - b.cost);
    return providerCosts[0].provider;
  }

  private selectPerformanceOptimized(providers: LLMProvider[]): LLMProvider {
    // Select provider with best response time
    return providers.reduce((best, current) => {
      const bestStatus = best.getStatus();
      const currentStatus = current.getStatus();
      return currentStatus.responseTime < bestStatus.responseTime ? current : best;
    });
  }

  private selectRoundRobin(providers: LLMProvider[]): LLMProvider {
    this.lastUsedIndex = (this.lastUsedIndex + 1) % providers.length;
    return providers[this.lastUsedIndex];
  }

  private selectByPriority(providers: LLMProvider[]): LLMProvider {
    // Sort by priority and return highest priority
    const sorted = providers.sort((a, b) => {
      const priorityA = this.configs.get(a.name)?.priority || 0;
      const priorityB = this.configs.get(b.name)?.priority || 0;
      return priorityB - priorityA; // Higher priority first
    });
    
    return sorted[0];
  }

  private selectFallbackProvider(
    excludeName: string, 
    request: TextGenerationRequest
  ): LLMProvider | null {
    const availableProviders = this.getHealthyProviders()
      .filter(provider => provider.name !== excludeName);
    
    return availableProviders.length > 0 
      ? this.selectProvider(request) 
      : null;
  }

  private getHealthyProviders(): LLMProvider[] {
    return Array.from(this.providers.values()).filter(provider => {
      const config = this.configs.get(provider.name);
      const status = provider.getStatus();
      return config?.enabled && status.isAvailable;
    });
  }

  private async executeWithFallback<T>(
    operation: () => Promise<T>,
    request: TextGenerationRequest,
    providerName: string
  ): Promise<T> {
    let lastError: Error;
    let retries = 0;

    while (retries <= this.routingStrategy.maxRetries) {
      try {
        this.incrementRequestCount(providerName);
        return await operation();
      } catch (error) {
        lastError = error as Error;
        retries++;

        this.log('warn', `Provider ${providerName} attempt ${retries} failed:`, { 
          error: lastError.message 
        });

        if (retries <= this.routingStrategy.maxRetries && this.routingStrategy.fallbackEnabled) {
          const fallbackProvider = this.selectFallbackProvider(providerName, request);
          if (fallbackProvider) {
            this.log('info', `Attempting fallback to provider: ${fallbackProvider.name}`);
            return this.executeWithFallback(
              () => fallbackProvider.generateText(request),
              request,
              fallbackProvider.name
            );
          }
        }
      }
    }

    throw lastError!;
  }

  private incrementRequestCount(providerName: string): void {
    const current = this.requestCounts.get(providerName) || 0;
    this.requestCounts.set(providerName, current + 1);
  }

  private estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  private startHealthMonitoring(): void {
    setInterval(() => {
      if (this.isShutdown) return;

      for (const [name, provider] of this.providers) {
        const status = provider.getStatus();
        const config = this.configs.get(name)!;

        // Log unhealthy providers
        if (config.enabled && !status.isAvailable) {
          this.log('warn', `Provider ${name} is unavailable`, { status });
        }

        // Log high error rates
        if (status.errorRate > 0.2) {
          this.log('warn', `Provider ${name} has high error rate: ${status.errorRate}`);
        }
      }
    }, this.routingStrategy.healthCheckInterval);
  }

  private log(level: 'info' | 'warn' | 'error', message: string, metadata?: Record<string, unknown>): void {
    const logData = {
      component: 'provider-manager',
      level,
      message,
      timestamp: new Date().toISOString(),
      ...metadata
    };

    console.log(`[${level.toUpperCase()}] ProviderManager:`, logData);
  }
}
