// Plugin Architecture Types - Extensible system for adding new capabilities
// Built on the existing TryIt-AI foundation

export interface Plugin {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly description: string;
  readonly author: string;
  readonly category: PluginCategory;
  readonly dependencies: PluginDependency[];
  readonly permissions: PluginPermission[];
  readonly config: PluginConfig;
  readonly lifecycle: PluginLifecycle;
}

export type PluginCategory = 
  | 'agent' 
  | 'tool-generator' 
  | 'knowledge-source' 
  | 'llm-provider' 
  | 'ui-component' 
  | 'analytics' 
  | 'middleware'
  | 'integration';

export interface PluginDependency {
  readonly pluginId: string;
  readonly version: string;
  readonly optional: boolean;
}

export type PluginPermission = 
  | 'network-access'
  | 'file-system'
  | 'environment-variables'
  | 'database-access'
  | 'llm-provider-access'
  | 'session-data'
  | 'user-data'
  | 'system-config';

export interface PluginConfig {
  readonly schema: ConfigSchema;
  readonly defaults: Record<string, any>;
  readonly required: string[];
  readonly validation: ConfigValidation[];
}

export interface ConfigSchema {
  readonly type: 'object';
  readonly properties: Record<string, ConfigProperty>;
}

export interface ConfigProperty {
  readonly type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  readonly description: string;
  readonly default?: any;
  readonly enum?: any[];
  readonly pattern?: string;
  readonly minimum?: number;
  readonly maximum?: number;
  readonly items?: ConfigProperty;
  readonly properties?: Record<string, ConfigProperty>;
}

export interface ConfigValidation {
  readonly field: string;
  readonly rule: 'required' | 'unique' | 'format' | 'range' | 'custom';
  readonly value?: any;
  readonly message: string;
}

export interface PluginLifecycle {
  onLoad?(context: PluginContext): Promise<void>;
  onUnload?(context: PluginContext): Promise<void>;
  onConfigChange?(config: Record<string, any>, context: PluginContext): Promise<void>;
  onSystemEvent?(event: SystemEvent, context: PluginContext): Promise<void>;
}

export interface PluginContext {
  readonly pluginId: string;
  readonly config: Record<string, any>;
  readonly logger: PluginLogger;
  readonly storage: PluginStorage;
  readonly events: PluginEventBus;
  readonly system: SystemAPI;
}

export interface PluginLogger {
  info(message: string, metadata?: Record<string, any>): void;
  warn(message: string, metadata?: Record<string, any>): void;
  error(message: string, metadata?: Record<string, any>): void;
  debug(message: string, metadata?: Record<string, any>): void;
}

export interface PluginStorage {
  get<T = any>(key: string): Promise<T | null>;
  set<T = any>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
  list(): Promise<string[]>;
}

export interface PluginEventBus {
  emit(event: string, data?: any): void;
  on(event: string, handler: (data?: any) => void): () => void;
  off(event: string, handler: (data?: any) => void): void;
  once(event: string, handler: (data?: any) => void): void;
}

export interface SystemAPI {
  readonly agents: AgentAPI;
  readonly knowledge: KnowledgeAPI;
  readonly tools: ToolAPI;
  readonly analytics: AnalyticsAPI;
  readonly config: ConfigAPI;
}

export interface AgentAPI {
  register(agent: any): Promise<void>;
  unregister(agentId: string): Promise<void>;
  sendMessage(agentId: string, message: any): Promise<any>;
  getAgent(agentId: string): any | null;
  listAgents(): any[];
}

export interface KnowledgeAPI {
  addSource(source: any): Promise<void>;
  removeSource(sourceId: string): Promise<void>;
  search(query: string, options?: any): Promise<any[]>;
  index(content: string, metadata: any): Promise<string>;
}

export interface ToolAPI {
  registerGenerator(generator: any): Promise<void>;
  unregisterGenerator(type: string): Promise<void>;
  generateTool(spec: any): Promise<any>;
  listGenerators(): any[];
}

export interface AnalyticsAPI {
  track(event: string, data: any): Promise<void>;
  getMetrics(query: any): Promise<any>;
  createDashboard(config: any): Promise<string>;
}

export interface ConfigAPI {
  get(key: string): any;
  set(key: string, value: any): Promise<void>;
  watch(key: string, callback: (value: any) => void): () => void;
}

export type SystemEvent = 
  | 'agent-interaction'
  | 'tool-generation'
  | 'knowledge-update'
  | 'session-start'
  | 'session-end'
  | 'error-occurred'
  | 'config-changed'
  | 'plugin-loaded'
  | 'plugin-unloaded';

export interface PluginRegistry {
  register(plugin: Plugin): Promise<void>;
  unregister(pluginId: string): Promise<void>;
  load(pluginId: string): Promise<void>;
  unload(pluginId: string): Promise<void>;
  get(pluginId: string): Plugin | null;
  list(): Plugin[];
  findByCategory(category: PluginCategory): Plugin[];
  isLoaded(pluginId: string): boolean;
  getDependencies(pluginId: string): Plugin[];
  checkDependencies(pluginId: string): PluginValidationResult;
}

export interface PluginValidationResult {
  readonly isValid: boolean;
  readonly errors: PluginValidationError[];
  readonly warnings: PluginValidationError[];
}

export interface PluginValidationError {
  readonly code: string;
  readonly message: string;
  readonly field?: string;
  readonly severity: 'error' | 'warning';
}

export interface PluginManager {
  registry: PluginRegistry;
  loadPlugin(pluginId: string): Promise<void>;
  unloadPlugin(pluginId: string): Promise<void>;
  configurePlugin(pluginId: string, config: Record<string, any>): Promise<void>;
  getPluginStatus(pluginId: string): PluginStatus;
  installPlugin(plugin: Plugin): Promise<void>;
  updatePlugin(pluginId: string, newVersion: Plugin): Promise<void>;
  removePlugin(pluginId: string): Promise<void>;
  listLoadedPlugins(): Plugin[];
  validatePlugin(plugin: Plugin): Promise<PluginValidationResult>;
  checkPermissions(pluginId: string, permission: PluginPermission): boolean;
}

export interface PluginStatus {
  readonly pluginId: string;
  readonly loaded: boolean;
  readonly enabled: boolean;
  readonly version: string;
  readonly lastLoaded?: Date;
  readonly loadTime?: number;
  readonly errors: string[];
  readonly warnings: string[];
  readonly resourceUsage: {
    memory: number;
    cpu: number;
    networkRequests: number;
  };
}

// Specific plugin types

export interface AgentPlugin extends Plugin {
  readonly category: 'agent';
  readonly agentClass: new (...args: any[]) => any;
  readonly capabilities: string[];
  readonly defaultConfig: {
    temperature?: number;
    maxTokens?: number;
    systemPrompt?: string;
  };
}

export interface ToolGeneratorPlugin extends Plugin {
  readonly category: 'tool-generator';
  readonly generatorClass: new (...args: any[]) => any;
  readonly supportedTypes: string[];
  readonly outputFormats: string[];
}

export interface KnowledgeSourcePlugin extends Plugin {
  readonly category: 'knowledge-source';
  readonly sourceClass: new (...args: any[]) => any;
  readonly supportedFormats: string[];
  readonly indexingCapabilities: string[];
}

export interface LLMProviderPlugin extends Plugin {
  readonly category: 'llm-provider';
  readonly providerClass: new (...args: any[]) => any;
  readonly supportedModels: string[];
  readonly features: {
    streaming: boolean;
    functionCalling: boolean;
    vision: boolean;
    multimodal: boolean;
  };
}

export interface MiddlewarePlugin extends Plugin {
  readonly category: 'middleware';
  readonly middlewareClass: new (...args: any[]) => any;
  readonly order: number;
  readonly applicableTo: ('request' | 'response' | 'error')[];
}

export interface IntegrationPlugin extends Plugin {
  readonly category: 'integration';
  readonly integrationClass: new (...args: any[]) => any;
  readonly platform: string;
  readonly webhook?: {
    path: string;
    methods: string[];
  };
}
