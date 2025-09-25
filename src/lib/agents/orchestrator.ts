// Agent Orchestrator - coordinates multiple agents and handles routing
// Built on the existing TryIt-AI foundation

import type {
  Agent,
  AgentId,
  AgentOrchestrator,
  AgentRequest,
  AgentResponse,
  AgentStatus,
  OrchestratorConfig,
  RoutingRule,
  FallbackConfig
} from './types';

export class MultiAgentOrchestrator implements AgentOrchestrator {
  private agents: Map<AgentId, Agent> = new Map();
  private config: OrchestratorConfig;
  private isShutdown: boolean = false;

  constructor(initialConfig: Partial<OrchestratorConfig> = {}) {
    this.config = {
      agents: {},
      routing: {
        strategy: 'capability-based',
        rules: []
      },
      fallback: {
        enabled: true,
        maxRetries: 3,
        backoffStrategy: 'exponential',
        fallbackAgents: []
      },
      monitoring: {
        healthCheckInterval: 30000, // 30 seconds
        metricsRetention: 24 * 60 * 60 * 1000, // 24 hours
        alertThresholds: {
          errorRate: 0.1,
          responseTime: 5000,
          availability: 0.95
        }
      },
      ...initialConfig
    };

    // Start health monitoring
    this.startHealthMonitoring();
  }

  public registerAgent(agent: Agent): void {
    if (this.isShutdown) {
      throw new Error('Orchestrator is shutdown');
    }

    this.agents.set(agent.id, agent);
    this.log('info', `Registered agent: ${agent.id} (${agent.name})`);
  }

  public unregisterAgent(agentId: AgentId): void {
    const agent = this.agents.get(agentId);
    if (agent) {
      this.agents.delete(agentId);
      agent.shutdown().catch(error => 
        this.log('warn', `Error shutting down agent ${agentId}:`, { error })
      );
      this.log('info', `Unregistered agent: ${agentId}`);
    }
  }

  public async routeRequest(request: AgentRequest): Promise<AgentResponse> {
    if (this.isShutdown) {
      throw new Error('Orchestrator is shutdown');
    }

    if (this.agents.size === 0) {
      throw new Error('No agents available');
    }

    // Determine target agent
    const targetAgent = this.selectAgent(request);
    if (!targetAgent) {
      throw new Error('No suitable agent found for request');
    }

    // Process with primary agent
    try {
      this.log('info', `Routing request ${request.id} to agent ${targetAgent.id}`);
      const response = await targetAgent.process(request);
      
      // Check response quality and potentially trigger fallback
      if (this.shouldFallback(response, targetAgent)) {
        return this.handleFallback(request, targetAgent, response);
      }

      return response;
    } catch (error) {
      this.log('error', `Agent ${targetAgent.id} failed to process request:`, { error });
      
      if (this.config.fallback.enabled) {
        return this.handleFallback(request, targetAgent, null, error as Error);
      }
      
      throw error;
    }
  }

  public getAgentStatus(agentId: AgentId): AgentStatus | null {
    const agent = this.agents.get(agentId);
    return agent ? agent.getStatus() : null;
  }

  public getAllAgents(): Agent[] {
    return Array.from(this.agents.values());
  }

  public configure(config: OrchestratorConfig): void {
    this.config = { ...this.config, ...config };
    
    // Apply agent-specific configurations
    for (const [agentId, agentConfig] of Object.entries(config.agents)) {
      const agent = this.agents.get(agentId);
      if (agent) {
        agent.configure(agentConfig);
      }
    }
  }

  public async shutdown(): Promise<void> {
    this.isShutdown = true;
    
    // Shutdown all agents
    const shutdownPromises = Array.from(this.agents.values()).map(agent => 
      agent.shutdown().catch(error => 
        this.log('warn', `Error shutting down agent ${agent.id}:`, { error })
      )
    );
    
    await Promise.all(shutdownPromises);
    this.agents.clear();
    
    this.log('info', 'Orchestrator shutdown complete');
  }

  // ===== PRIVATE METHODS =====

  private selectAgent(request: AgentRequest): Agent | null {
    switch (this.config.routing.strategy) {
      case 'capability-based':
        return this.selectByCapability(request);
      case 'round-robin':
        return this.selectRoundRobin();
      case 'load-based':
        return this.selectByLoad();
      default:
        return this.selectByCapability(request);
    }
  }

  private selectByCapability(request: AgentRequest): Agent | null {
    // First, check routing rules
    for (const rule of this.config.routing.rules || []) {
      if (this.evaluateRoutingRule(rule, request)) {
        const agent = this.agents.get(rule.targetAgent);
        if (agent && this.isAgentHealthy(agent)) {
          return agent;
        }
      }
    }

    // Default: find the best agent based on content analysis
    const agents = Array.from(this.agents.values()).filter(this.isAgentHealthy);
    
    if (agents.length === 0) return null;
    if (agents.length === 1) return agents[0];

    // Content-based selection logic
    const content = request.content.toLowerCase();
    
    // Creative/artistic content
    if (this.isCreativeRequest(content)) {
      return this.findAgentByName(agents, 'creative') || 
             this.findAgentByName(agents, 'wanderer') || 
             agents[0];
    }
    
    // Technical/practical content
    if (this.isPracticalRequest(content)) {
      return this.findAgentByName(agents, 'practical') || 
             this.findAgentByName(agents, 'tinkerer') || 
             agents[0];
    }
    
    // Default to Noah (coordinator) or first available agent
    return this.findAgentByName(agents, 'noah') || agents[0];
  }

  private selectRoundRobin(): Agent | null {
    const healthyAgents = Array.from(this.agents.values()).filter(this.isAgentHealthy);
    if (healthyAgents.length === 0) return null;
    
    // Simple round-robin (in production, you'd track last used index)
    const randomIndex = Math.floor(Math.random() * healthyAgents.length);
    return healthyAgents[randomIndex];
  }

  private selectByLoad(): Agent | null {
    const healthyAgents = Array.from(this.agents.values()).filter(this.isAgentHealthy);
    if (healthyAgents.length === 0) return null;
    
    // Select agent with lowest response time
    return healthyAgents.reduce((best, current) => {
      const bestStatus = best.getStatus();
      const currentStatus = current.getStatus();
      return currentStatus.averageResponseTime < bestStatus.averageResponseTime ? current : best;
    });
  }

  private evaluateRoutingRule(rule: RoutingRule, request: AgentRequest): boolean {
    try {
      // Simple condition evaluation - in production, use a proper expression evaluator
      const content = request.content.toLowerCase();
      
      if (rule.condition.includes('creative')) {
        return this.isCreativeRequest(content);
      }
      if (rule.condition.includes('practical')) {
        return this.isPracticalRequest(content);
      }
      if (rule.condition.includes('technical')) {
        return this.isTechnicalRequest(content);
      }
      
      return false;
    } catch {
      return false;
    }
  }

  private isCreativeRequest(content: string): boolean {
    const creativeKeywords = [
      'creative', 'design', 'artistic', 'brainstorm', 'inspiration',
      'innovative', 'imaginative', 'original', 'unique', 'beautiful'
    ];
    return creativeKeywords.some(keyword => content.includes(keyword));
  }

  private isPracticalRequest(content: string): boolean {
    const practicalKeywords = [
      'build', 'implement', 'code', 'function', 'tool', 'fix',
      'practical', 'solution', 'technical', 'debug', 'optimize'
    ];
    return practicalKeywords.some(keyword => content.includes(keyword));
  }

  private isTechnicalRequest(content: string): boolean {
    const technicalKeywords = [
      'javascript', 'html', 'css', 'api', 'database', 'algorithm',
      'performance', 'security', 'architecture', 'framework'
    ];
    return technicalKeywords.some(keyword => content.includes(keyword));
  }

  private findAgentByName(agents: Agent[], namePattern: string): Agent | null {
    return agents.find(agent => 
      agent.name.toLowerCase().includes(namePattern.toLowerCase()) ||
      agent.id.toLowerCase().includes(namePattern.toLowerCase())
    ) || null;
  }

  private isAgentHealthy = (agent: Agent): boolean => {
    const status = agent.getStatus();
    return status.isHealthy && 
           status.errorRate < this.config.monitoring.alertThresholds.errorRate &&
           status.averageResponseTime < this.config.monitoring.alertThresholds.responseTime;
  };

  private shouldFallback(
    response: AgentResponse, 
    agent: Agent
  ): boolean {
    if (!this.config.fallback.enabled) return false;
    
    // Check response quality indicators
    if (response.confidence < 0.3) return true;
    if (response.metadata?.error) return true;
    
    // Check agent health
    const status = agent.getStatus();
    if (status.errorRate > this.config.monitoring.alertThresholds.errorRate) return true;
    
    return false;
  }

  private async handleFallback(
    request: AgentRequest,
    failedAgent: Agent,
    failedResponse: AgentResponse | null,
    error?: Error
  ): Promise<AgentResponse> {
    const fallbackAgents = this.config.fallback.fallbackAgents
      .map(id => this.agents.get(id))
      .filter((agent): agent is Agent => agent !== null && agent !== failedAgent)
      .filter(this.isAgentHealthy);

    if (fallbackAgents.length === 0) {
      if (failedResponse) {
        return failedResponse; // Return the failed response if no fallback available
      }
      throw error || new Error('All agents failed and no fallback available');
    }

    // Try each fallback agent
    for (const agent of fallbackAgents) {
      try {
        this.log('info', `Attempting fallback to agent ${agent.id} for request ${request.id}`);
        return await agent.process(request);
      } catch (fallbackError) {
        this.log('warn', `Fallback agent ${agent.id} also failed:`, { error: fallbackError });
        continue;
      }
    }

    // All fallbacks failed
    if (failedResponse) {
      return failedResponse;
    }
    throw error || new Error('All agents including fallbacks failed');
  }

  private startHealthMonitoring(): void {
    const interval = this.config.monitoring.healthCheckInterval;
    
    setInterval(() => {
      if (this.isShutdown) return;
      
      for (const agent of this.agents.values()) {
        const status = agent.getStatus();
        
        // Log unhealthy agents
        if (!status.isHealthy) {
          this.log('warn', `Agent ${agent.id} is unhealthy`, { status });
        }
        
        // Alert on high error rates
        if (status.errorRate > this.config.monitoring.alertThresholds.errorRate) {
          this.log('warn', `Agent ${agent.id} has high error rate: ${status.errorRate}`);
        }
        
        // Alert on slow response times
        if (status.averageResponseTime > this.config.monitoring.alertThresholds.responseTime) {
          this.log('warn', `Agent ${agent.id} has slow response time: ${status.averageResponseTime}ms`);
        }
      }
    }, interval);
  }

  private log(level: 'info' | 'warn' | 'error', message: string, metadata?: Record<string, unknown>): void {
    const logData = {
      component: 'orchestrator',
      level,
      message,
      timestamp: new Date().toISOString(),
      ...metadata
    };

    console.log(`[${level.toUpperCase()}] Orchestrator:`, logData);
  }
}
