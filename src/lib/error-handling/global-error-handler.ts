// Global Error Handler - Comprehensive error handling and monitoring
// Built on the existing TryIt-AI foundation

import { SystemMonitor } from '@/lib/analytics/system-monitor';

interface ErrorContext {
  readonly component: string;
  readonly operation: string;
  readonly sessionId?: string;
  readonly agentId?: string;
  readonly userId?: string;
  readonly requestId?: string;
  readonly timestamp: Date;
  readonly metadata?: Record<string, any>;
}

interface ErrorRecoveryStrategy {
  readonly name: string;
  readonly condition: (error: Error, context: ErrorContext) => boolean;
  readonly action: (error: Error, context: ErrorContext) => Promise<any>;
  readonly fallback?: (error: Error, context: ErrorContext) => Promise<any>;
}

export class GlobalErrorHandler {
  private static instance: GlobalErrorHandler;
  private systemMonitor?: SystemMonitor;
  private errorCounts: Map<string, number> = new Map();
  private recoveryStrategies: ErrorRecoveryStrategy[] = [];
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();

  constructor(systemMonitor?: SystemMonitor) {
    this.systemMonitor = systemMonitor;
    this.setupRecoveryStrategies();
    this.setupGlobalHandlers();
  }

  public static getInstance(systemMonitor?: SystemMonitor): GlobalErrorHandler {
    if (!GlobalErrorHandler.instance) {
      GlobalErrorHandler.instance = new GlobalErrorHandler(systemMonitor);
    }
    return GlobalErrorHandler.instance;
  }

  /**
   * Handle an error with context and recovery attempts
   */
  public async handleError(
    error: Error,
    context: ErrorContext,
    attemptRecovery: boolean = true
  ): Promise<any> {
    const errorId = this.generateErrorId();
    const errorKey = `${context.component}:${error.name}`;

    // Track error frequency
    this.errorCounts.set(errorKey, (this.errorCounts.get(errorKey) || 0) + 1);

    // Log error
    this.logError(error, context, errorId);

    // Report to monitoring system
    if (this.systemMonitor) {
      this.systemMonitor.recordError(
        context.component,
        error.message,
        this.getErrorSeverity(error, context)
      );
    }

    // Check circuit breaker
    const circuitBreaker = this.getCircuitBreaker(context.component);
    if (circuitBreaker.isOpen()) {
      throw new Error(`Circuit breaker open for ${context.component}: ${error.message}`);
    }

    // Attempt recovery if enabled
    if (attemptRecovery) {
      try {
        const recovery = this.findRecoveryStrategy(error, context);
        if (recovery) {
          console.log(`[ErrorHandler] Attempting recovery: ${recovery.name}`, { errorId });
          const result = await recovery.action(error, context);
          
          // Recovery successful
          circuitBreaker.recordSuccess();
          console.log(`[ErrorHandler] Recovery successful: ${recovery.name}`, { errorId });
          return result;
        }
      } catch (recoveryError) {
        console.error(`[ErrorHandler] Recovery failed: ${recoveryError}`, { errorId });
        
        // Try fallback if available
        const recovery = this.findRecoveryStrategy(error, context);
        if (recovery?.fallback) {
          try {
            return await recovery.fallback(error, context);
          } catch (fallbackError) {
            console.error(`[ErrorHandler] Fallback failed: ${fallbackError}`, { errorId });
          }
        }
      }
    }

    // Record failure
    circuitBreaker.recordFailure();

    // Re-throw if no recovery
    throw error;
  }

  /**
   * Wrap a function with error handling
   */
  public wrapWithErrorHandling<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    context: Omit<ErrorContext, 'timestamp'>
  ): T {
    return (async (...args: any[]) => {
      try {
        return await fn(...args);
      } catch (error) {
        return await this.handleError(error as Error, {
          ...context,
          timestamp: new Date()
        });
      }
    }) as T;
  }

  /**
   * Create a safe async function that handles errors gracefully
   */
  public createSafeFunction<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    context: Omit<ErrorContext, 'timestamp'>,
    defaultValue?: any
  ): T {
    return (async (...args: any[]) => {
      try {
        return await fn(...args);
      } catch (error) {
        try {
          return await this.handleError(error as Error, {
            ...context,
            timestamp: new Date()
          });
        } catch (unrecoverableError) {
          console.error(`[ErrorHandler] Unrecoverable error in ${context.component}:`, unrecoverableError);
          return defaultValue;
        }
      }
    }) as T;
  }

  /**
   * Get error statistics
   */
  public getErrorStatistics() {
    const stats = {
      totalErrors: Array.from(this.errorCounts.values()).reduce((sum, count) => sum + count, 0),
      errorsByComponent: Object.fromEntries(this.errorCounts),
      circuitBreakerStates: Object.fromEntries(
        Array.from(this.circuitBreakers.entries()).map(([component, cb]) => [
          component,
          { state: cb.getState(), failures: cb.getFailureCount() }
        ])
      )
    };

    return stats;
  }

  /**
   * Register a custom recovery strategy
   */
  public registerRecoveryStrategy(strategy: ErrorRecoveryStrategy): void {
    this.recoveryStrategies.push(strategy);
    console.log(`[ErrorHandler] Registered recovery strategy: ${strategy.name}`);
  }

  /**
   * Reset error counts and circuit breakers
   */
  public reset(): void {
    this.errorCounts.clear();
    this.circuitBreakers.clear();
    console.log('[ErrorHandler] Error statistics reset');
  }

  // ===== PRIVATE METHODS =====

  private setupRecoveryStrategies(): void {
    // LLM Provider fallback
    this.recoveryStrategies.push({
      name: 'llm-provider-fallback',
      condition: (error, context) => 
        context.component.includes('provider') && error.message.includes('rate limit'),
      action: async (error, context) => {
        // Switch to fallback provider
        console.log('[ErrorHandler] Switching to fallback LLM provider');
        // Implementation would integrate with actual provider manager
        throw error; // For now, let it bubble up
      }
    });

    // Agent retry strategy
    this.recoveryStrategies.push({
      name: 'agent-retry',
      condition: (error, context) => 
        context.component.includes('agent') && error.message.includes('timeout'),
      action: async (error, context) => {
        console.log('[ErrorHandler] Retrying agent request with reduced parameters');
        // Implementation would retry with simpler parameters
        throw error; // For now, let it bubble up
      }
    });

    // Knowledge search fallback
    this.recoveryStrategies.push({
      name: 'knowledge-fallback',
      condition: (error, context) => 
        context.component.includes('knowledge') && !error.message.includes('not found'),
      action: async (error, context) => {
        console.log('[ErrorHandler] Using basic knowledge fallback');
        return { results: [], fallback: true };
      }
    });

    // Tool generation simplification
    this.recoveryStrategies.push({
      name: 'tool-simplification',
      condition: (error, context) => 
        context.component.includes('tool') && error.message.includes('complexity'),
      action: async (error, context) => {
        console.log('[ErrorHandler] Generating simplified tool version');
        // Implementation would generate a simpler version
        throw error; // For now, let it bubble up
      }
    });
  }

  private setupGlobalHandlers(): void {
    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      console.error('[ErrorHandler] Unhandled Promise Rejection:', reason);
      this.handleError(
        new Error(`Unhandled Promise Rejection: ${reason}`),
        {
          component: 'global',
          operation: 'promise-rejection',
          timestamp: new Date()
        },
        false // Don't attempt recovery for unhandled rejections
      ).catch(console.error);
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('[ErrorHandler] Uncaught Exception:', error);
      this.handleError(
        error,
        {
          component: 'global',
          operation: 'uncaught-exception',
          timestamp: new Date()
        },
        false // Don't attempt recovery for uncaught exceptions
      ).catch(console.error);
    });
  }

  private findRecoveryStrategy(error: Error, context: ErrorContext): ErrorRecoveryStrategy | null {
    return this.recoveryStrategies.find(strategy => strategy.condition(error, context)) || null;
  }

  private getCircuitBreaker(component: string): CircuitBreaker {
    if (!this.circuitBreakers.has(component)) {
      this.circuitBreakers.set(component, new CircuitBreaker(component));
    }
    return this.circuitBreakers.get(component)!;
  }

  private getErrorSeverity(error: Error, context: ErrorContext): 'low' | 'medium' | 'high' {
    // Critical components get higher severity
    if (['noah-agent', 'orchestrator', 'provider-manager'].includes(context.component)) {
      return 'high';
    }

    // Rate limiting and timeout errors are medium severity
    if (error.message.includes('rate limit') || error.message.includes('timeout')) {
      return 'medium';
    }

    // Default to low
    return 'low';
  }

  private logError(error: Error, context: ErrorContext, errorId: string): void {
    const logData = {
      errorId,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      context,
      timestamp: context.timestamp.toISOString()
    };

    console.error('[ErrorHandler] Error occurred:', logData);
  }

  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Simple Circuit Breaker implementation
 */
class CircuitBreaker {
  private failureCount = 0;
  private lastFailureTime?: Date;
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  private readonly threshold = 5; // failures before opening
  private readonly timeout = 60000; // 1 minute

  constructor(private component: string) {}

  public recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = new Date();

    if (this.failureCount >= this.threshold) {
      this.state = 'open';
      console.warn(`[CircuitBreaker] Opened for ${this.component} after ${this.failureCount} failures`);
    }
  }

  public recordSuccess(): void {
    this.failureCount = 0;
    this.state = 'closed';
  }

  public isOpen(): boolean {
    if (this.state === 'closed') return false;

    if (this.state === 'open' && this.lastFailureTime) {
      const timeSinceLastFailure = Date.now() - this.lastFailureTime.getTime();
      if (timeSinceLastFailure > this.timeout) {
        this.state = 'half-open';
        return false;
      }
    }

    return this.state === 'open';
  }

  public getState(): string {
    return this.state;
  }

  public getFailureCount(): number {
    return this.failureCount;
  }
}

// Export singleton instance
export const globalErrorHandler = GlobalErrorHandler.getInstance();
