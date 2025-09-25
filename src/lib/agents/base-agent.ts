// Base Agent implementation providing common functionality for all agents
// Built on the existing TryIt-AI foundation

import type {
  Agent,
  AgentId,
  AgentCapability,
  AgentConfig,
  AgentStatus,
  AgentRequest,
  AgentResponse,
  LLMProvider
} from './types';

export abstract class BaseAgent implements Agent {
  public readonly id: AgentId;
  public readonly name: string;
  public readonly capabilities: AgentCapability[];

  protected config: AgentConfig;
  protected llmProvider: LLMProvider;
  protected requestsProcessed: number = 0;
  protected totalResponseTime: number = 0;
  protected errorCount: number = 0;
  protected lastActivity: Date = new Date();
  protected isShutdown: boolean = false;

  constructor(
    id: AgentId,
    name: string,
    capabilities: AgentCapability[],
    llmProvider: LLMProvider,
    initialConfig: AgentConfig = {}
  ) {
    this.id = id;
    this.name = name;
    this.capabilities = capabilities;
    this.llmProvider = llmProvider;
    this.config = {
      temperature: 0.7,
      maxTokens: 1000,
      ...initialConfig
    };
  }

  public async process(request: AgentRequest): Promise<AgentResponse> {
    if (this.isShutdown) {
      throw new Error(`Agent ${this.id} is shutdown`);
    }

    const startTime = Date.now();
    this.lastActivity = new Date();

    try {
      // Pre-processing hook
      await this.preProcess(request);

      // Core processing (implemented by subclasses)
      const response = await this.processRequest(request);

      // Post-processing hook
      const finalResponse = await this.postProcess(request, response);

      // Update metrics
      this.requestsProcessed++;
      this.totalResponseTime += Date.now() - startTime;

      return finalResponse;
    } catch (error) {
      this.errorCount++;
      console.error(`Agent ${this.id} processing error:`, error);
      
      // Return error response instead of throwing
      return {
        requestId: request.id,
        agentId: this.id,
        content: this.getErrorResponse(error as Error),
        confidence: 0,
        timestamp: new Date(),
        metadata: {
          error: true,
          errorMessage: (error as Error).message
        }
      };
    }
  }

  public getStatus(): AgentStatus {
    const avgResponseTime = this.requestsProcessed > 0 
      ? this.totalResponseTime / this.requestsProcessed 
      : 0;
    
    const errorRate = this.requestsProcessed > 0 
      ? this.errorCount / this.requestsProcessed 
      : 0;

    return {
      id: this.id,
      isHealthy: !this.isShutdown && errorRate < 0.1, // Less than 10% error rate
      lastActivity: this.lastActivity,
      requestsProcessed: this.requestsProcessed,
      averageResponseTime: avgResponseTime,
      errorRate: errorRate
    };
  }

  public configure(config: AgentConfig): void {
    this.config = {
      ...this.config,
      ...config
    };
  }

  public async shutdown(): Promise<void> {
    this.isShutdown = true;
    await this.onShutdown();
  }

  // ===== ABSTRACT METHODS (to be implemented by subclasses) =====

  /**
   * Core processing logic - must be implemented by each agent type
   */
  protected abstract processRequest(request: AgentRequest): Promise<AgentResponse>;

  /**
   * Get the system prompt for this agent
   */
  protected abstract getSystemPrompt(): string;

  // ===== HOOK METHODS (can be overridden by subclasses) =====

  /**
   * Called before processing each request
   */
  protected async preProcess(request: AgentRequest): Promise<void> {
    // Default: no pre-processing
  }

  /**
   * Called after processing each request
   */
  protected async postProcess(
    request: AgentRequest, 
    response: AgentResponse
  ): Promise<AgentResponse> {
    // Default: return response as-is
    return response;
  }

  /**
   * Called when agent is being shutdown
   */
  protected async onShutdown(): Promise<void> {
    // Default: no shutdown logic
  }

  /**
   * Generate error response for user-facing display
   */
  protected getErrorResponse(error: Error): string {
    return "I encountered an issue processing your request. Let me try a different approach.";
  }

  // ===== HELPER METHODS =====

  /**
   * Generate text using the configured LLM provider
   */
  protected async generateText(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    options: {
      temperature?: number;
      maxTokens?: number;
      streaming?: boolean;
    } = {}
  ) {
    const request = {
      model: this.config.model || 'default',
      messages,
      temperature: options.temperature ?? this.config.temperature,
      maxTokens: options.maxTokens ?? this.config.maxTokens,
      streaming: options.streaming ?? false
    };

    if (options.streaming) {
      return this.llmProvider.streamText(request);
    } else {
      return this.llmProvider.generateText(request);
    }
  }

  /**
   * Build messages array with system prompt
   */
  protected buildMessages(request: AgentRequest): Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }> {
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      {
        role: 'system',
        content: this.config.systemPrompt || this.getSystemPrompt()
      }
    ];

    // Add conversation history if available
    if (request.context?.conversationHistory) {
      for (const msg of request.context.conversationHistory.slice(-10)) { // Last 10 messages
        messages.push({
          role: msg.role,
          content: msg.content
        });
      }
    }

    // Add current request
    messages.push({
      role: 'user',
      content: request.content
    });

    return messages;
  }

  /**
   * Calculate confidence score based on response characteristics
   */
  protected calculateConfidence(
    response: string,
    request: AgentRequest
  ): number {
    // Basic confidence calculation - can be overridden
    let confidence = 0.8; // Base confidence

    // Reduce confidence for very short responses
    if (response.length < 50) {
      confidence -= 0.2;
    }

    // Reduce confidence if response contains uncertainty phrases
    const uncertaintyPhrases = [
      'i think', 'maybe', 'perhaps', 'not sure', 
      'unclear', 'difficult to say'
    ];
    
    const lowerResponse = response.toLowerCase();
    const uncertaintyCount = uncertaintyPhrases.filter(phrase => 
      lowerResponse.includes(phrase)
    ).length;
    
    confidence -= uncertaintyCount * 0.1;

    // Ensure confidence is between 0 and 1
    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Generate unique request ID
   */
  protected generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Log agent activity (integrates with existing logging system)
   */
  protected log(level: 'info' | 'warn' | 'error', message: string, metadata?: Record<string, unknown>): void {
    const logData = {
      agent: this.id,
      level,
      message,
      timestamp: new Date().toISOString(),
      ...metadata
    };

    console.log(`[${level.toUpperCase()}] Agent ${this.id}:`, logData);
  }
}
