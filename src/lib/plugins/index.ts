// Plugin Architecture - Main Exports
// Built on the existing TryIt-AI foundation

// Core Types
export type * from './types';

// Main Classes
export { PluginManager } from './plugin-manager';
export { PluginRegistryImpl as PluginRegistry } from './plugin-registry';
export { createPluginContext } from './plugin-context';

// Commonly used types
export type {
  Plugin,
  PluginManager as IPluginManager,
  PluginRegistry as IPluginRegistry,
  PluginContext,
  PluginStatus,
  PluginCategory,
  PluginPermission,
  AgentPlugin,
  ToolGeneratorPlugin,
  KnowledgeSourcePlugin,
  LLMProviderPlugin,
  MiddlewarePlugin,
  IntegrationPlugin
} from './types';
