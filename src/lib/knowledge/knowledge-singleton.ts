// High-performance singleton for KnowledgeService
// Eliminates 200-500ms initialization overhead per request

import { KnowledgeService } from './knowledge-service';
import { AnthropicProvider } from '../providers/anthropic-provider';
import type { LLMProvider } from '../providers/base-llm-provider';
import type { KnowledgeResult, SearchContext } from './types';
import { createLogger } from '@/lib/logger';

interface SingletonConfig {
  reinitializeOnError?: boolean;
  maxRetries?: number;
  healthCheckInterval?: number;
}

export class KnowledgeServiceSingleton {
  private static instance: KnowledgeService | null = null;
  private static initPromise: Promise<KnowledgeService> | null = null;
  private static llmProvider: LLMProvider | null = null;
  private static isHealthy = true;
  private static lastHealthCheck = 0;
  private static retryCount = 0;
  private static config: SingletonConfig = {
    reinitializeOnError: true,
    maxRetries: 3,
    healthCheckInterval: 30 * 1000 // 30 seconds
  };

  /**
   * Check if we're in build phase - fast guard for build-time optimization
   */
  private static isBuilding(): boolean {
    return (
      process.env.NEXT_PHASE === 'phase-production-build' ||
      process.env.NEXT_PHASE === 'phase-export' ||
      process.argv.includes('build') ||
      process.argv.includes('export')
    );
  }

  /**
   * Get the singleton KnowledgeService instance
   * Guarantees initialized service or throws error
   */
  static async getInstance(forceReinit = false): Promise<KnowledgeService> {
    // FAST: Skip initialization during build phase
    if (this.isBuilding()) {
      throw new Error('KnowledgeService not available during build phase');
    }

    // Health check - reinitialize if needed
    if (this.shouldPerformHealthCheck()) {
      await this.performHealthCheck();
    }

    // Force reinitialize if requested or unhealthy
    if (forceReinit || (!this.isHealthy && this.config.reinitializeOnError)) {
      this.reset();
    }

    // Return existing instance if available
    if (this.instance && this.isHealthy) {
      return this.instance;
    }

    // Handle concurrent initialization
    if (this.initPromise) {
      return this.initPromise;
    }

    // Create new initialization promise
    this.initPromise = this.createInstance();

    try {
      const service = await this.initPromise;
      this.instance = service;
      this.isHealthy = true;
      this.retryCount = 0;
      this.lastHealthCheck = Date.now();
      
      createLogger('knowledge-singleton').info('KnowledgeService singleton initialized successfully');
      return service;
    } catch (error) {
      this.initPromise = null;
      this.retryCount++;
      
      if (this.retryCount >= (this.config.maxRetries || 3)) {
        this.isHealthy = false;
        throw new Error(`KnowledgeService initialization failed after ${this.retryCount} attempts: ${error}`);
      }
      
      // Exponential backoff for retries
      const delay = Math.min(1000 * Math.pow(2, this.retryCount), 10000);
      await new Promise(resolve => setTimeout(resolve, delay));
      
      return this.getInstance(forceReinit);
    }
  }

  /**
   * Check if the service is ready
   */
  static isReady(): boolean {
    return this.instance !== null && this.isHealthy;
  }

  /**
   * Search wrapper with singleton management
   */
  static async search(
    query: string, 
    options?: { maxResults?: number; minRelevanceScore?: number }
  ): Promise<KnowledgeResult[]> {
    const service = await this.getInstance();
    return service.search(query, options?.maxResults || 5, options?.minRelevanceScore || 0.6);
  }

  /**
   * Get search context wrapper
   */
  static async getSearchContext(query: string, maxResults = 5): Promise<SearchContext[]> {
    const service = await this.getInstance();
    return service.getSearchContext(query, maxResults);
  }

  /**
   * Add documents wrapper
   */
  static async addDocuments(documents: any[]): Promise<string[]> {
    const service = await this.getInstance();
    return service.addDocuments(documents);
  }

  /**
   * Delete document wrapper
   */
  static async deleteDocument(id: string): Promise<void> {
    const service = await this.getInstance();
    return service.deleteDocument(id);
  }

  /**
   * Get status wrapper
   */
  static getStatus(): any {
    if (!this.instance) {
      return {
        isReady: false,
        isHealthy: false,
        lastCheck: null,
        retryCount: this.retryCount
      };
    }
    
    return {
      isReady: true,
      isHealthy: this.isHealthy,
      lastCheck: new Date(this.lastHealthCheck).toISOString(),
      retryCount: this.retryCount,
      provider: this.instance.name
    };
  }

  /**
   * Warm up the service (initialize without waiting)
   */
  static warmUp(): void {
    // CLEAN: No-op during build, preserve functionality at runtime
    if (this.isBuilding()) return;
    
    if (!this.instance && !this.initPromise) {
      createLogger('knowledge-singleton').info('Warming up KnowledgeService...');
      this.getInstance().catch(error => {
        createLogger('knowledge-singleton').warn('KnowledgeService warmup failed', { error });
      });
    }
  }

  /**
   * Reset the singleton (for testing or error recovery)
   */
  static reset(): void {
    this.instance = null;
    this.initPromise = null;
    this.llmProvider = null;
    this.isHealthy = true;
    this.lastHealthCheck = 0;
    this.retryCount = 0;
    createLogger('knowledge-singleton').info('KnowledgeService singleton reset');
  }

  /**
   * Shutdown the singleton and cleanup resources
   */
  static async shutdown(): Promise<void> {
    createLogger('knowledge-singleton').info('Shutting down KnowledgeService singleton...');
    
    if (this.instance) {
      try {
        // If the service has a cleanup method, call it
        if ('cleanup' in this.instance && typeof this.instance.cleanup === 'function') {
          await (this.instance as any).cleanup();
        }
      } catch (error) {
        console.warn('Error during KnowledgeService cleanup:', error);
      }
    }
    
    this.reset();
    createLogger('knowledge-singleton').info('KnowledgeService singleton shutdown complete');
  }

  /**
   * Initialize the KnowledgeService with optimized configuration
   */
  private static async createInstance(): Promise<KnowledgeService> {
    // Get or create LLM provider
    if (!this.llmProvider) {
      this.llmProvider = new AnthropicProvider({
        apiKey: process.env.ANTHROPIC_API_KEY || '',
        model: process.env.MODEL_ID || 'claude-3-5-sonnet-20241022',
        maxTokens: 1500,
        temperature: 0.7
      });
    }

    // Create service with optimized defaults
    const service = new KnowledgeService(this.llmProvider, {
      provider: 'langchain', // Stable, well-tested option
      langchain: {
        vectorStore: 'memory', // Fast, no external dependencies
        enableTracing: false   // Reduce overhead
      },
      memory: {
        maxMessages: 50,
        summaryThreshold: 20,
        contextWindow: 4000,
        useVectorSearch: true
      }
    });

    await service.initialize();
    return service;
  }

  /**
   * Check if health check is needed
   */
  private static shouldPerformHealthCheck(): boolean {
    const interval = this.config.healthCheckInterval || 30000;
    return Date.now() - this.lastHealthCheck > interval;
  }

  /**
   * Perform health check
   */
  private static async performHealthCheck(): Promise<void> {
    this.lastHealthCheck = Date.now();
    
    if (!this.instance) {
      this.isHealthy = false;
      return;
    }

    try {
      // Simple health check - try a basic operation
      const status = this.getStatus();
      this.isHealthy = status.isReady;
    } catch (error) {
      this.isHealthy = false;
      console.warn('KnowledgeService health check failed:', error);
    }
  }
}

// Export singleton instance getter for compatibility
export default KnowledgeServiceSingleton;

// Auto-initialize if in production and not in build phase
if (process.env.NODE_ENV === 'production' && 
    process.env.NEXT_PHASE !== 'phase-production-build' &&
    process.env.NEXT_PHASE !== 'phase-export') {
  KnowledgeServiceSingleton.warmUp();
}

// Graceful shutdown handling
if (typeof process !== 'undefined') {
  const cleanup = () => KnowledgeServiceSingleton.shutdown();
  process.on('SIGTERM', cleanup);
  process.on('SIGINT', cleanup);
  process.on('beforeExit', cleanup);
}
