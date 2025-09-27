// System Configuration for Multi-Agent System
// Built on the existing TryIt-AI foundation

import { NoahAgent } from './noah-agent';
import { PracticalAgent } from './practical-agent';
import { WandererAgent } from './wanderer-agent';
import { MultiAgentOrchestrator } from './orchestrator';
import { ProviderManager } from '../providers/provider-manager';
import { AnthropicProvider } from '../providers/anthropic-provider';
import { contentFilter } from '../safety/content-filter';
import type {
  Agent,
  AgentOrchestrator,
  OrchestratorConfig,
  AgentConfig
} from './types';
import type { ProviderConfig, RoutingStrategy } from '../providers/provider-manager';

export interface SystemConfig {
  readonly providers: {
    anthropic: {
      enabled: boolean;
      apiKey?: string;
      config: ProviderConfig;
    };
    // Future providers can be added here
  };
  readonly agents: {
    noah: AgentConfig;
    tinkerer: AgentConfig;
    wanderer: AgentConfig;
  };
  readonly orchestrator: OrchestratorConfig;
  readonly routing: RoutingStrategy;
}

export class MultiAgentSystem {
  private providerManager: ProviderManager;
  private orchestrator: AgentOrchestrator;
  private agents: Map<string, Agent> = new Map();
  private isInitialized: boolean = false;
  private isShutdown: boolean = false;

  constructor(private config: SystemConfig) {
    this.providerManager = new ProviderManager(config.routing);
    this.orchestrator = new MultiAgentOrchestrator(config.orchestrator);
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized || this.isShutdown) {
      throw new Error('System is already initialized or shutdown');
    }

    try {
      // Initialize providers
      await this.initializeProviders();
      
      // Initialize agents
      await this.initializeAgents();
      
      // Register agents with orchestrator
      this.registerAgents();
      
      this.isInitialized = true;
      this.log('info', 'Multi-agent system initialized successfully');
    } catch (error) {
      this.log('error', 'Failed to initialize multi-agent system:', { error });
      throw error;
    }
  }

  public async processRequest(
    content: string,
    sessionId: string,
    context?: {
      conversationHistory?: Array<{
        role: 'user' | 'assistant';
        content: string;
        timestamp: Date;
      }>;
      userPreferences?: Record<string, unknown>;
    }
  ): Promise<any> {
    // SAFETY CHECK: Verify session is not terminated
    if (!contentFilter.shouldRespond(sessionId)) {
      // Complete radio silence for terminated sessions
      return {
        requestId: this.generateRequestId(),
        agentId: 'system',
        content: '',
        confidence: 1.0,
        timestamp: new Date(),
        metadata: { terminated: true }
      };
    }
    if (!this.isInitialized) {
      throw new Error('System not initialized');
    }

    const request = {
      id: this.generateRequestId(),
      sessionId,
      content,
      context: context ? {
        conversationHistory: context.conversationHistory || [],
        userPreferences: context.userPreferences,
        sessionData: {}
      } : undefined,
      timestamp: new Date()
    };

    try {
      this.log('info', `Processing request: ${request.id}`, { sessionId, contentLength: content.length });
      return await this.orchestrator.routeRequest(request);
    } catch (error) {
      this.log('error', `Failed to process request ${request.id}:`, { error });
      throw error;
    }
  }

  public getSystemStatus() {
    if (!this.isInitialized) {
      return { status: 'not-initialized' };
    }

    const providers = this.providerManager.getAllProviders();
    const agents = this.orchestrator.getAllAgents().map(agent => ({
      id: agent.id,
      name: agent.name,
      status: agent.getStatus(),
      capabilities: agent.capabilities
    }));

    return {
      status: 'initialized',
      providers,
      agents,
      isHealthy: this.isSystemHealthy(),
      canFallback: this.canFallbackToSingleAgent()
    };
  }

  public async shutdown(): Promise<void> {
    if (this.isShutdown) return;

    this.log('info', 'Shutting down multi-agent system...');
    
    try {
      await this.orchestrator.shutdown();
      await this.providerManager.shutdown();
      this.agents.clear();
      this.isShutdown = true;
      this.log('info', 'Multi-agent system shutdown complete');
    } catch (error) {
      this.log('error', 'Error during shutdown:', { error });
      throw error;
    }
  }

  // ===== PRIVATE METHODS =====

  private async initializeProviders(): Promise<void> {
    // Initialize Anthropic provider
    if (this.config.providers.anthropic.enabled) {
      try {
        const anthropicProvider = new AnthropicProvider(
          this.config.providers.anthropic.apiKey
        );
        
        this.providerManager.registerProvider(
          anthropicProvider,
          this.config.providers.anthropic.config
        );
        
        this.log('info', 'Anthropic provider initialized');
      } catch (error) {
        this.log('error', 'Failed to initialize Anthropic provider:', { error });
        // Don't throw - allow system to continue with degraded functionality
        this.log('warn', 'System will continue with degraded functionality');
      }
    }

    // Future providers can be initialized here
  }

  private async initializeAgents(): Promise<void> {
    // Get primary provider for agents
    const primaryProvider = this.getPrimaryProvider();
    
    // Initialize Noah agent (coordinator)
    try {
      const noahAgent = new NoahAgent(primaryProvider, this.config.agents.noah);
      this.agents.set('noah', noahAgent);
      this.log('info', 'Noah agent initialized');
    } catch (error) {
      this.log('error', 'Failed to initialize Noah agent:', { error });
      throw error;
    }

    // Initialize Tinkerer agent (technical implementation)
    try {
      const tinkererAgent = new PracticalAgent(primaryProvider, this.config.agents.tinkerer);
      this.agents.set('tinkerer', tinkererAgent);
      this.log('info', 'Tinkerer agent initialized');
    } catch (error) {
      this.log('error', 'Failed to initialize Tinkerer agent:', { error });
      this.log('warn', 'System will continue without Tinkerer capabilities');
    }

    // Initialize Wanderer agent (research specialist)
    try {
      const wandererAgent = new WandererAgent(primaryProvider, this.config.agents.wanderer);
      this.agents.set('wanderer', wandererAgent);
      this.log('info', 'Wanderer agent initialized');
    } catch (error) {
      this.log('error', 'Failed to initialize Wanderer agent:', { error });
      this.log('warn', 'System will continue without Wanderer capabilities');
    }

    // Connect Noah with orchestrator for delegation
    const noahAgent = this.agents.get('noah') as NoahAgent;
    if (noahAgent && 'setOrchestrator' in noahAgent) {
      (noahAgent as any).setOrchestrator(this.orchestrator);
      this.log('info', 'Noah delegation system activated');
    }
  }

  private registerAgents(): void {
    for (const agent of this.agents.values()) {
      this.orchestrator.registerAgent(agent);
    }
  }

  private getPrimaryProvider() {
    const providers = this.providerManager.getAllProviders();
    const enabledProviders = providers.filter(p => p.config.enabled && p.status.isAvailable);
    
    if (enabledProviders.length === 0) {
      throw new Error('No healthy providers available');
    }

    // Return the highest priority provider
    const sorted = enabledProviders.sort((a, b) => b.config.priority - a.config.priority);
    const primaryProviderName = sorted[0].name;
    
    // Return the actual provider instance
    // This is a workaround - in a real implementation, you'd have better provider access
    const anthropicProviders = this.providerManager.getAllProviders()
      .filter(p => p.name === primaryProviderName);
    
    if (anthropicProviders.length === 0) {
      throw new Error(`Primary provider ${primaryProviderName} not found`);
    }

    // Create a wrapper that implements the LLMProvider interface
    return this.createProviderWrapper(primaryProviderName);
  }

  private createProviderWrapper(providerName: string) {
    // This creates a wrapper that routes through the provider manager
    return {
      name: providerName,
      capabilities: [],
      generateText: (request: any) => this.providerManager.generateText(request),
      streamText: (request: any) => this.providerManager.streamText(request),
      getCosts: () => ({ promptCostPerToken: 0, completionCostPerToken: 0, currency: 'USD' }),
      getStatus: () => this.providerManager.getProviderStatus(providerName) || {
        isAvailable: false,
        responseTime: 0,
        errorRate: 1,
        rateLimitRemaining: 0,
        lastChecked: new Date()
      },
      shutdown: async () => {}
    };
  }

  private isSystemHealthy(): boolean {
    const providers = this.providerManager.getAllProviders();
    const hasHealthyProvider = providers.some(p => p.config.enabled && p.status.isAvailable);
    
    const agents = this.orchestrator.getAllAgents();
    const hasHealthyAgent = agents.some(a => a.getStatus().isHealthy);
    
    return hasHealthyProvider && hasHealthyAgent;
  }

  private canFallbackToSingleAgent(): boolean {
    // Even if multi-agent system fails, can we fall back to single-agent mode?
    return process.env.ANTHROPIC_API_KEY != null;
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private log(level: 'info' | 'warn' | 'error', message: string, metadata?: Record<string, unknown>): void {
    const logData = {
      component: 'multi-agent-system',
      level,
      message,
      timestamp: new Date().toISOString(),
      ...metadata
    };

    console.log(`[${level.toUpperCase()}] MultiAgentSystem:`, logData);
  }
}

// ===== DEFAULT CONFIGURATION =====

export function createDefaultConfig(): SystemConfig {
  return {
    providers: {
      anthropic: {
        enabled: true,
        apiKey: process.env.ANTHROPIC_API_KEY,
        config: {
          name: 'anthropic',
          priority: 1,
          costWeight: 1.0,
          enabled: true
        }
      }
    },
    agents: {
      noah: {
        model: process.env.MODEL_ID || 'claude-sonnet-4-20250514',
        temperature: 0.7,
        maxTokens: 1500
      },
      tinkerer: {
        model: process.env.MODEL_ID || 'claude-sonnet-4-20250514',
        temperature: 0.3,
        maxTokens: 4000
      },
      wanderer: {
        model: process.env.MODEL_ID || 'claude-sonnet-4-20250514',
        temperature: 0.75,
        maxTokens: 2500
      }
    },
    orchestrator: {
      agents: {},
      routing: {
        strategy: 'capability-based',
        rules: [
          {
            condition: 'creative',
            targetAgent: 'creative-wanderer',
            priority: 1
          },
          {
            condition: 'practical',
            targetAgent: 'practical-tinkerer',
            priority: 1
          }
        ]
      },
      fallback: {
        enabled: true,
        maxRetries: 2,
        backoffStrategy: 'exponential',
        fallbackAgents: ['noah']
      },
      monitoring: {
        healthCheckInterval: 30000,
        metricsRetention: 24 * 60 * 60 * 1000,
        alertThresholds: {
          errorRate: 0.1,
          responseTime: 5000,
          availability: 0.95
        }
      }
    },
    routing: {
      type: 'cost-optimized',
      fallbackEnabled: true,
      maxRetries: 3,
      healthCheckInterval: 60000
    }
  };
}

// ===== SINGLETON INSTANCE =====

let systemInstance: MultiAgentSystem | null = null;

export async function getMultiAgentSystem(config?: SystemConfig): Promise<MultiAgentSystem> {
  if (!systemInstance) {
    const systemConfig = config || createDefaultConfig();
    systemInstance = new MultiAgentSystem(systemConfig);
    await systemInstance.initialize();
  }
  return systemInstance;
}

export function getSystemConfig(): SystemConfig {
  return createDefaultConfig();
}

export async function shutdownMultiAgentSystem(): Promise<void> {
  if (systemInstance) {
    await systemInstance.shutdown();
    systemInstance = null;
  }
}
