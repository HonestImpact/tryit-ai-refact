// Core type definitions for the multi-agent system
// Built on the existing TryIt-AI foundation

export type AgentId = string;
export type SessionId = string;
export type RequestId = string;

// ===== AGENT SYSTEM TYPES =====

export interface AgentCapability {
  readonly name: string;
  readonly description: string;
  readonly version: string;
}

export interface AgentConfig {
  readonly model?: string;
  readonly temperature?: number;
  readonly maxTokens?: number;
  readonly systemPrompt?: string;
  readonly tools?: string[];
  readonly knowledgeSources?: string[];
  readonly [key: string]: unknown;
}

export interface AgentStatus {
  readonly id: AgentId;
  readonly isHealthy: boolean;
  readonly lastActivity: Date;
  readonly requestsProcessed: number;
  readonly averageResponseTime: number;
  readonly errorRate: number;
}

export interface AgentRequest {
  readonly id: RequestId;
  readonly sessionId: SessionId;
  readonly content: string;
  readonly context?: AgentContext;
  readonly metadata?: Record<string, unknown>;
  readonly timestamp: Date;
}

export interface AgentResponse {
  readonly requestId: RequestId;
  readonly agentId: AgentId;
  readonly content: string;
  readonly reasoning?: string;
  readonly confidence: number;
  readonly tools?: GeneratedTool[];
  readonly knowledge?: KnowledgeResult[];
  metadata?: Record<string, unknown>; // Make mutable for agent updates
  readonly timestamp: Date;
}

export interface AgentContext {
  readonly conversationHistory: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
  }>;
  readonly userPreferences?: Record<string, unknown>;
  readonly sessionData?: Record<string, unknown>;
}

// ===== KNOWLEDGE SYSTEM TYPES =====

export interface KnowledgeItem {
  readonly id: string;
  readonly type: KnowledgeType;
  readonly content: string;
  readonly metadata: Record<string, unknown>;
  readonly embedding?: number[];
  readonly tags: string[];
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface KnowledgeResult {
  readonly item: KnowledgeItem;
  readonly relevanceScore: number;
  readonly context?: string;
}

export interface SearchContext {
  readonly sessionId?: SessionId;
  readonly userQuery?: string;
  readonly domainFilter?: string[];
  readonly maxResults?: number;
  readonly minRelevanceScore?: number;
}

export type KnowledgeType = 
  | 'component'
  | 'pattern'
  | 'example'
  | 'documentation'
  | 'best-practice'
  | 'conversation';

// ===== TOOL GENERATION TYPES =====

export interface ToolSpec {
  readonly type: ToolType;
  readonly name: string;
  readonly description: string;
  readonly requirements: ToolRequirement[];
  readonly parameters: Record<string, unknown>;
}

export interface ToolRequirement {
  readonly name: string;
  readonly type: 'input' | 'output' | 'behavior';
  readonly description: string;
  readonly required: boolean;
  readonly defaultValue?: unknown;
}

export interface GeneratedTool {
  readonly id: string;
  readonly spec: ToolSpec;
  readonly code: string;
  readonly assets?: Record<string, string>; // CSS, images, etc.
  readonly documentation: string;
  readonly testCases?: ToolTestCase[];
  readonly createdAt: Date;
}

export interface ToolTestCase {
  readonly name: string;
  readonly input: Record<string, unknown>;
  readonly expectedOutput: unknown;
  readonly description: string;
}

export interface ValidationResult {
  readonly isValid: boolean;
  readonly errors: ValidationError[];
  readonly warnings: ValidationWarning[];
  readonly suggestions: string[];
}

export interface ValidationError {
  readonly code: string;
  readonly message: string;
  readonly line?: number;
  readonly severity: 'error' | 'warning';
}

export type ValidationWarning = ValidationError;

export type ToolType = 'html' | 'javascript' | 'bookmarklet' | 'css' | 'component';
export type ExportFormat = 'file' | 'url' | 'embed' | 'package';

// ===== LLM PROVIDER TYPES =====

export interface LLMCapability {
  readonly name: string;
  readonly maxTokens: number;
  readonly supportsStreaming: boolean;
  readonly supportsTools: boolean;
  readonly costPerToken: number;
}

export interface TextGenerationRequest {
  readonly model: string;
  readonly messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  readonly maxTokens?: number;
  readonly temperature?: number;
  readonly streaming?: boolean;
  readonly tools?: unknown[];
}

export interface TextGenerationResponse {
  readonly content: string;
  readonly usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  readonly model: string;
  readonly finishReason: string;
}

export interface TextChunk {
  readonly content: string;
  readonly isComplete: boolean;
  readonly metadata?: Record<string, unknown>;
}

export interface ProviderCosts {
  readonly promptCostPerToken: number;
  readonly completionCostPerToken: number;
  readonly currency: string;
}

export interface ProviderStatus {
  readonly isAvailable: boolean;
  readonly responseTime: number;
  readonly errorRate: number;
  readonly rateLimitRemaining: number;
  readonly lastChecked: Date;
}

// ===== ORCHESTRATOR TYPES =====

export interface OrchestratorConfig {
  readonly agents: Record<AgentId, AgentConfig>;
  readonly routing: RoutingConfig;
  readonly fallback: FallbackConfig;
  readonly monitoring: MonitoringConfig;
}

export interface RoutingConfig {
  readonly strategy: 'round-robin' | 'load-based' | 'capability-based';
  readonly weights?: Record<AgentId, number>;
  readonly rules?: RoutingRule[];
}

export interface RoutingRule {
  readonly condition: string; // e.g., "content.includes('creative')"
  readonly targetAgent: AgentId;
  readonly priority: number;
}

export interface FallbackConfig {
  readonly enabled: boolean;
  readonly maxRetries: number;
  readonly backoffStrategy: 'linear' | 'exponential';
  readonly fallbackAgents: AgentId[];
}

export interface MonitoringConfig {
  readonly healthCheckInterval: number;
  readonly metricsRetention: number;
  readonly alertThresholds: {
    errorRate: number;
    responseTime: number;
    availability: number;
  };
}

// ===== PLUGIN SYSTEM TYPES =====

export interface Plugin {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly description: string;
  readonly dependencies: string[];
  
  initialize(config: PluginConfig): Promise<void>;
  shutdown(): Promise<void>;
  getHealth(): PluginHealth;
}

export interface PluginConfig {
  readonly [key: string]: unknown;
}

export interface PluginHealth {
  readonly status: 'healthy' | 'degraded' | 'unhealthy';
  readonly message?: string;
  readonly lastCheck: Date;
}

// ===== CORE INTERFACES =====

export interface Agent {
  readonly id: AgentId;
  readonly name: string;
  readonly capabilities: AgentCapability[];
  
  process(request: AgentRequest): Promise<AgentResponse>;
  getStatus(): AgentStatus;
  configure(config: AgentConfig): void;
  shutdown(): Promise<void>;
}

export interface KnowledgeProvider {
  readonly id: string;
  readonly name: string;
  
  search(query: string, context?: SearchContext): Promise<KnowledgeResult[]>;
  addKnowledge(item: KnowledgeItem): Promise<string>;
  updateKnowledge(id: string, item: Partial<KnowledgeItem>): Promise<void>;
  deleteKnowledge(id: string): Promise<void>;
  getHealth(): ProviderStatus;
}

export interface ToolGenerator {
  readonly type: ToolType;
  readonly name: string;
  readonly version: string;
  
  generate(specification: ToolSpec): Promise<GeneratedTool>;
  validate(tool: GeneratedTool): ValidationResult;
  export(tool: GeneratedTool, format: ExportFormat): Promise<string>;
  getCapabilities(): string[];
}

export interface LLMProvider {
  readonly name: string;
  readonly capabilities: LLMCapability[];
  
  generateText(request: TextGenerationRequest): Promise<TextGenerationResponse>;
  streamText(request: TextGenerationRequest): AsyncIterableIterator<TextChunk>;
  getCosts(): ProviderCosts;
  getStatus(): ProviderStatus;
  shutdown(): Promise<void>;
}

export interface AgentOrchestrator {
  registerAgent(agent: Agent): void;
  unregisterAgent(agentId: AgentId): void;
  routeRequest(request: AgentRequest): Promise<AgentResponse>;
  getAgentStatus(agentId: AgentId): AgentStatus | null;
  getAllAgents(): Agent[];
  configure(config: OrchestratorConfig): void;
  shutdown(): Promise<void>;
}
