// Multi-Agent System - Main Exports
// Built on the existing TryIt-AI foundation

// Core Types
export type * from './types';

// Base Classes
export { BaseAgent } from './base-agent';

// Concrete Agents
export { NoahAgent } from './noah-agent';

// System Components
export { MultiAgentOrchestrator } from './orchestrator';
export { 
  MultiAgentSystem, 
  getMultiAgentSystem, 
  shutdownMultiAgentSystem,
  createDefaultConfig 
} from './system-config';

// Providers
export { BaseLLMProvider } from '../providers/base-llm-provider';
export { AnthropicProvider } from '../providers/anthropic-provider';
export { ProviderManager } from '../providers/provider-manager';

// Re-export commonly used types
export type {
  Agent,
  AgentRequest,
  AgentResponse,
  AgentOrchestrator,
  LLMProvider,
  SystemConfig
} from './types';
