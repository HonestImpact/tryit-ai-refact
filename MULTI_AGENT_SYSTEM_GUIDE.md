# Multi-Agent AI System - Complete Developer Guide

## 🎯 **System Overview**

The TryIt-AI Multi-Agent System is a modular, extensible platform that orchestrates multiple AI agents to provide intelligent tool generation and assistance. Built with maximum modularity and clean interfaces, it's designed for easy expansion and customization.

### **Core Architecture**

```
┌─────────────────────────────────────────────────────────────────┐
│                    MULTI-AGENT ORCHESTRATOR                    │
├─────────────┬─────────────┬─────────────┬────────────────────────┤
│ Noah Agent  │ Creative    │ Practical   │ Plugin Architecture    │
│ (Coordinator)│ Wanderer    │ Tinkerer    │ (Extensible Agents)    │
├─────────────┴─────────────┴─────────────┴────────────────────────┤
│                    KNOWLEDGE LAYER                              │
│              vectorize.io + LangChain + RAG                    │
├─────────────────────────────────────────────────────────────────┤
│                TOOL GENERATION ENGINE                           │
│         HTML Generator │ JS Generator │ Bookmarklet Gen        │
├─────────────────────────────────────────────────────────────────┤
│                  PROVIDER ABSTRACTION                          │
│    Anthropic │ OpenAI │ Fallback │ Cost Optimization          │
├─────────────────────────────────────────────────────────────────┤
│               SESSION & ANALYTICS                               │
│     Tracking │ A/B Testing │ Performance │ User Experience     │
├─────────────────────────────────────────────────────────────────┤
│                ERROR HANDLING & MONITORING                      │
│      Global Handler │ Circuit Breakers │ Recovery Strategies   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🤖 **Agent System**

### **Agent Orchestrator**
**Location**: `src/lib/agents/orchestrator.ts`

The central coordinator that routes requests to appropriate agents based on capability, load, and user needs.

```typescript
import { getAgentOrchestrator } from '@/lib/agents/orchestrator';

const orchestrator = await getAgentOrchestrator();
const response = await orchestrator.routeAndProcess(messages, context);
```

**Key Features:**
- Intelligent routing based on request analysis
- Load balancing across agents
- Fallback mechanisms
- Real-time health monitoring

### **Noah Agent (Coordinator)**
**Location**: `src/lib/agents/noah-agent.ts`

The primary agent that maintains the sophisticated, respectful persona and coordinates with subagents.

```typescript
// Noah's protected persona - DO NOT MODIFY without explicit permission
const NOAH_PERSONA = `
You are Noah, speaking to someone who values discernment over blind trust.
- Treat them as a fellow architect of better systems
- Honor their skepticism as wisdom, not obstacle
- You co-create solutions, you don't "help" them
`;
```

**Capabilities:**
- Natural conversation flow
- Artifact detection and creation
- Agent coordination
- Context preservation

### **Creative/Wanderer Agent**
**Location**: `src/lib/agents/creative-agent.ts`

Specializes in innovative thinking, artistic solutions, and out-of-the-box approaches.

```typescript
import { CreativeAgent } from '@/lib/agents/creative-agent';

const creativeAgent = new CreativeAgent(llmProvider, {
  temperature: 0.85, // Higher creativity
  maxTokens: 2000
});
```

**Capabilities:**
- Creative thinking and brainstorming
- Artistic design perspectives
- Cross-domain inspiration
- Narrative creation

### **Practical/Tinkerer Agent**
**Location**: `src/lib/agents/practical-agent.ts`

Focuses on technical implementation, debugging, and pragmatic solutions.

```typescript
import { PracticalAgent } from '@/lib/agents/practical-agent';

const practicalAgent = new PracticalAgent(llmProvider, {
  temperature: 0.6, // More focused
  maxTokens: 2500
});
```

**Capabilities:**
- Technical implementation
- Code generation and debugging
- Performance optimization
- Best practices application

---

## 🧠 **Knowledge Layer**

### **Vectorize.io Integration**
**Location**: `src/lib/knowledge/vectorize-provider.ts`

Provides vector search capabilities using Cloudflare's vectorize.io service.

```typescript
import { VectorizeProvider } from '@/lib/knowledge/vectorize-provider';

const vectorStore = new VectorizeProvider({
  accountId: process.env.VECTORIZE_ACCOUNT_ID!,
  apiToken: process.env.VECTORIZE_API_TOKEN!,
  indexName: 'tryit-ai-knowledge',
  dimensions: 1536
});

// Search for relevant content
const results = await vectorStore.hybridSearch(query, {
  limit: 10,
  minSimilarity: 0.7
});
```

### **LangChain Memory**
**Location**: `src/lib/knowledge/langchain-memory.ts`

Manages conversation memory and reasoning chains.

```typescript
import { LangChainMemoryProvider } from '@/lib/knowledge/langchain-memory';

const memory = new LangChainMemoryProvider(llmProvider, {
  maxMessages: 50,
  summaryThreshold: 20,
  contextWindow: 4000
});

// Get relevant conversation context
const context = await memory.getRelevantContext(sessionId, query);
```

### **Knowledge Service**
**Location**: `src/lib/knowledge/knowledge-service.ts`

Main interface that ties together vector search and conversation memory.

```typescript
import { KnowledgeService } from '@/lib/knowledge/knowledge-service';

const knowledgeService = new KnowledgeService(llmProvider, {
  vectorize: {
    accountId: process.env.VECTORIZE_ACCOUNT_ID!,
    apiToken: process.env.VECTORIZE_API_TOKEN!,
    indexName: 'tryit-ai-knowledge',
    dimensions: 1536
  }
});

await knowledgeService.initialize();
```

---

## 🔧 **Tool Generation Engine**

### **Architecture Overview**

```
ToolGenerationEngine
├── BaseToolGenerator (abstract)
├── HTMLGenerator
├── JavaScriptGenerator
├── BookmarkletGenerator
└── PluginGenerators (extensible)
```

### **HTML Generator**
**Location**: `src/lib/tools/html-generator.ts`

Creates interactive HTML tools with CSS and JavaScript.

```typescript
import { HTMLGenerator } from '@/lib/tools/html-generator';

const generator = new HTMLGenerator();
const tool = await generator.generate({
  type: 'html',
  name: 'Contact Form',
  description: 'A responsive contact form with validation',
  requirements: [
    { name: 'responsive', description: 'Works on mobile and desktop' },
    { name: 'validation', description: 'Client-side form validation' }
  ]
});
```

### **JavaScript Generator**
**Location**: `src/lib/tools/javascript-generator.ts`

Generates reusable JavaScript utilities and components.

```typescript
import { JavaScriptGenerator } from '@/lib/tools/javascript-generator';

const generator = new JavaScriptGenerator();
const tool = await generator.generate({
  type: 'javascript',
  name: 'API Client',
  description: 'HTTP client with error handling',
  parameters: {
    moduleType: 'esm',
    minify: true
  }
});
```

### **Bookmarklet Generator**
**Location**: `src/lib/tools/bookmarklet-generator.ts`

Creates browser bookmarklets for page manipulation.

```typescript
import { BookmarkletGenerator } from '@/lib/tools/bookmarklet-generator';

const generator = new BookmarkletGenerator();
const tool = await generator.generate({
  type: 'bookmarklet',
  name: 'Page Analyzer',
  description: 'Analyze current page SEO and performance'
});
```

### **Tool Engine**
**Location**: `src/lib/tools/tool-engine.ts`

Orchestrates all generators and provides unified interface.

```typescript
import { ToolGenerationEngine } from '@/lib/tools/tool-engine';

const engine = new ToolGenerationEngine({
  defaultGenerators: true,
  libraryEnabled: true,
  cacheEnabled: true
});

const tool = await engine.generateTool(specification);
const exported = await engine.exportTool(tool, 'package');
```

---

## 🔄 **Provider Abstraction**

### **Provider Manager**
**Location**: `src/lib/providers/provider-manager.ts`

Manages multiple LLM providers with fallback and cost optimization.

```typescript
import { getProviderManager } from '@/lib/providers/provider-manager';

const manager = await getProviderManager();

// Automatic provider selection and fallback
const response = await manager.generate(messages, model, {
  maxTokens: 1000,
  temperature: 0.7
});
```

### **Anthropic Provider**
**Location**: `src/lib/providers/anthropic-provider.ts`

Integration with Anthropic's Claude models via AI SDK.

```typescript
import { AnthropicProvider } from '@/lib/providers/anthropic-provider';

const provider = new AnthropicProvider({
  name: 'Anthropic',
  apiKey: process.env.ANTHROPIC_API_KEY!,
  modelMapping: {
    'claude-sonnet-4-20250514': 'claude-3-5-sonnet-20241022'
  }
});
```

### **Adding New Providers**

1. **Create Provider Class**:
```typescript
import { BaseLLMProvider } from '@/lib/providers/base-llm-provider';

export class CustomProvider extends BaseLLMProvider {
  async generate(messages, model, options) {
    // Implementation
  }
}
```

2. **Register with Manager**:
```typescript
// In provider-manager.ts initialization
case 'Custom':
  this.providers.set(config.name, new CustomProvider(config));
  break;
```

---

## 📊 **Session & Analytics**

### **Session Tracker**
**Location**: `src/lib/analytics/session-tracker.ts`

Tracks user sessions and multi-agent interactions.

```typescript
import { SessionTracker } from '@/lib/analytics/session-tracker';

const tracker = new SessionTracker({
  trackPerformance: true,
  trackQuality: true,
  trackFlow: true
});

// Track agent interaction
tracker.trackInteraction(
  sessionId,
  agentId,
  'creative-wanderer',
  'brainstorming',
  responseTime,
  tokensUsed,
  confidence
);
```

### **System Monitor**
**Location**: `src/lib/analytics/system-monitor.ts`

Monitors system-wide performance and health.

```typescript
import { SystemMonitor } from '@/lib/analytics/system-monitor';

const monitor = new SystemMonitor({
  checkInterval: 30000,
  enableAlerts: true
});

monitor.startMonitoring();

// Get system health
const health = monitor.getSystemHealth();
```

### **A/B Testing**
**Location**: `src/lib/analytics/ab-testing.ts`

Supports testing different agent behaviors and configurations.

```typescript
import { ABTestingSystem } from '@/lib/analytics/ab-testing';

const abTesting = new ABTestingSystem();

// Create test
const testId = abTesting.createTest({
  testId: 'agent-temperature-test',
  testName: 'Agent Temperature Optimization',
  variants: [
    { variantId: 'control', traffic: 50, config: { temperature: 0.7 } },
    { variantId: 'creative', traffic: 50, config: { temperature: 0.9 } }
  ],
  traffic: 100,
  startDate: new Date(),
  metrics: ['userSatisfaction', 'responseTime']
});
```

---

## 🧩 **Plugin Architecture**

### **Plugin System Overview**

The plugin architecture allows extending the system with new agents, tool generators, knowledge sources, and more.

```typescript
// Define a plugin
const myPlugin: AgentPlugin = {
  id: 'my-custom-agent',
  name: 'Custom Agent',
  version: '1.0.0',
  description: 'A specialized agent for custom tasks',
  category: 'agent',
  agentClass: MyCustomAgent,
  capabilities: ['custom-reasoning', 'domain-expertise'],
  permissions: ['session-data', 'llm-provider-access'],
  config: {
    schema: { /* config schema */ },
    defaults: { temperature: 0.8 },
    required: [],
    validation: []
  },
  lifecycle: {
    onLoad: async (context) => {
      console.log('Plugin loaded');
    }
  }
};
```

### **Plugin Manager**
**Location**: `src/lib/plugins/plugin-manager.ts`

```typescript
import { PluginManager } from '@/lib/plugins/plugin-manager';

const pluginManager = new PluginManager({
  maxPlugins: 50,
  sandboxed: true,
  permissionLevel: 'moderate'
});

// Install and load plugin
await pluginManager.installPlugin(myPlugin);
await pluginManager.loadPlugin('my-custom-agent');
```

### **Creating Custom Plugins**

1. **Agent Plugin**:
```typescript
import { BaseAgent } from '@/lib/agents/base-agent';
import type { AgentPlugin } from '@/lib/plugins/types';

class MyCustomAgent extends BaseAgent {
  protected async processRequest(request) {
    // Custom agent logic
  }
}

export const plugin: AgentPlugin = {
  // Plugin definition
};
```

2. **Tool Generator Plugin**:
```typescript
import { BaseToolGenerator } from '@/lib/tools/base-generator';
import type { ToolGeneratorPlugin } from '@/lib/plugins/types';

class MyToolGenerator extends BaseToolGenerator {
  protected async generateTool(spec) {
    // Custom tool generation
  }
}

export const plugin: ToolGeneratorPlugin = {
  // Plugin definition
};
```

---

## 🚨 **Error Handling & Monitoring**

### **Global Error Handler**
**Location**: `src/lib/error-handling/global-error-handler.ts`

Comprehensive error handling with recovery strategies and circuit breakers.

```typescript
import { globalErrorHandler } from '@/lib/error-handling';

// Wrap functions with error handling
const safeFunction = globalErrorHandler.wrapWithErrorHandling(
  myRiskyFunction,
  {
    component: 'my-component',
    operation: 'risky-operation'
  }
);

// Register custom recovery strategy
globalErrorHandler.registerRecoveryStrategy({
  name: 'my-recovery',
  condition: (error, context) => context.component === 'my-component',
  action: async (error, context) => {
    // Recovery logic
  }
});
```

### **Circuit Breaker Pattern**

Automatically implemented for all components to prevent cascade failures:

```typescript
// Circuit breaker states: closed -> open -> half-open -> closed
// Opens after 5 failures, stays open for 1 minute
// Automatically tries half-open state for recovery
```

---

## 🔗 **API Integration**

### **Chat API v2**
**Location**: `src/app/api/chat-v2/route.ts`

Enhanced chat endpoint using the multi-agent system.

```typescript
// POST /api/chat-v2
{
  "messages": [...],
  "trustLevel": 50,
  "skepticMode": false
}

// Response
{
  "content": "Agent response",
  "agentName": "creative-wanderer",
  "artifact": {
    "title": "Tool Title",
    "content": "Tool content",
    "reasoning": "Why this tool was created"
  }
}
```

### **System Status API**
**Location**: `src/app/api/system-status/route.ts`

Real-time system health monitoring.

```typescript
// GET /api/system-status
{
  "status": "ok",
  "timestamp": "2025-01-01T00:00:00.000Z",
  "health": {
    "orchestrator": true,
    "llmProvider": true,
    "agent_Noah": true,
    "agent_Creative": true,
    "agent_Practical": true
  }
}
```

---

## ⚙️ **Configuration**

### **Environment Variables**

```bash
# Core AI Configuration
ANTHROPIC_API_KEY=your_anthropic_api_key
MODEL_ID=claude-sonnet-4-20250514

# Knowledge Layer (vectorize.io)
VECTORIZE_ACCOUNT_ID=your_cloudflare_account_id
VECTORIZE_API_TOKEN=your_vectorize_api_token
VECTORIZE_INDEX_NAME=tryit-ai-knowledge
VECTORIZE_DIMENSIONS=1536

# Database (Supabase)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Development/Testing
LOCAL_FAKE_LLM=false
```

### **System Configuration**
**Location**: `src/lib/agents/system-config.ts`

Central configuration for agents, providers, and system settings.

```typescript
export async function getSystemConfig(): Promise<SystemConfig> {
  return {
    orchestratorConfig: {
      defaultAgent: 'Noah',
      agents: [noahConfig, creativeConfig, practicalConfig],
      routingStrategy: 'capability-based'
    },
    llmProviders: [anthropicConfig /* , openAIConfig */]
  };
}
```

---

## 🧪 **Testing & Validation**

### **Testing Multi-Agent Interactions**

```typescript
import { getAgentOrchestrator } from '@/lib/agents/orchestrator';

// Test agent routing
const orchestrator = await getAgentOrchestrator();
const response = await orchestrator.routeAndProcess([
  { role: 'user', content: 'Create a creative design for a todo app' }
], { sessionId: 'test-session' });

// Should route to Creative agent
expect(response.agentName).toBe('creative-wanderer');
```

### **Testing Tool Generation**

```typescript
import { ToolGenerationEngine } from '@/lib/tools/tool-engine';

const engine = new ToolGenerationEngine();
const tool = await engine.generateTool({
  type: 'html',
  name: 'Test Tool',
  description: 'A test tool'
});

const validation = engine.validateTool(tool);
expect(validation.isValid).toBe(true);
```

---

## 📈 **Performance Optimization**

### **Caching Strategies**

1. **Tool Generation Cache**: Generated tools cached by specification hash
2. **Knowledge Search Cache**: Vector search results cached by query
3. **Agent Response Cache**: Responses cached for identical contexts

### **Resource Management**

1. **Token Usage Optimization**: Smart prompt engineering and response caching
2. **Memory Management**: Automatic cleanup of old sessions and data
3. **Rate Limiting**: Built-in rate limiting for all LLM providers

### **Monitoring Metrics**

- Response times per agent and operation
- Token usage and costs
- Error rates and recovery success
- User satisfaction scores
- System resource utilization

---

## 🔄 **Deployment & Scaling**

### **Vercel Deployment**

1. **Environment Setup**: Configure all required environment variables
2. **Database Migration**: Run Supabase migrations for message ordering
3. **Health Checks**: Monitor `/api/system-status` endpoint
4. **Performance**: Use edge functions for optimal response times

### **Scaling Considerations**

1. **Horizontal Scaling**: Multiple instances with shared state
2. **Load Balancing**: Distribute requests across agent instances
3. **Caching**: Redis or similar for distributed caching
4. **Database**: Connection pooling and query optimization

---

## 🛠 **Development Workflow**

### **Adding New Agents**

1. **Create Agent Class**: Extend `BaseAgent`
2. **Define Capabilities**: Specify what the agent can do
3. **Register with Orchestrator**: Add to system configuration
4. **Add Tests**: Verify agent behavior and integration
5. **Document**: Update this guide with new capabilities

### **Adding New Tools**

1. **Create Generator**: Extend `BaseToolGenerator`
2. **Define Templates**: Create reusable tool templates
3. **Register with Engine**: Add to available generators
4. **Add Validation**: Implement tool-specific validation
5. **Test Export Formats**: Verify all export options work

### **Code Quality Standards**

- **TypeScript**: Strict typing throughout
- **Testing**: Unit and integration tests required
- **Documentation**: Inline docs and guide updates
- **Error Handling**: Comprehensive error coverage
- **Performance**: Monitor and optimize resource usage

---

## 🔍 **Troubleshooting**

### **Common Issues**

1. **Agent Not Responding**: Check LLM provider status and rate limits
2. **Knowledge Search Failing**: Verify vectorize.io configuration
3. **Tool Generation Errors**: Review template syntax and parameters
4. **High Response Times**: Check system resource usage and caching

### **Debugging Tools**

1. **System Status API**: Real-time health monitoring
2. **Error Handler Statistics**: Error patterns and recovery success
3. **Session Analytics**: Detailed interaction tracking
4. **Circuit Breaker States**: Component failure status

### **Recovery Procedures**

1. **Provider Failover**: Automatic fallback to secondary providers
2. **Circuit Breaker Reset**: Manual or automatic recovery attempts
3. **Cache Invalidation**: Clear cached data for fresh responses
4. **Component Restart**: Individual component restart without downtime

---

## 🎯 **Future Roadmap**

### **Immediate Enhancements**

- [ ] OpenAI provider integration
- [ ] Advanced knowledge source plugins
- [ ] Real-time collaboration features
- [ ] Enhanced UI components

### **Advanced Features**

- [ ] Multi-modal agent support (vision, audio)
- [ ] Federated learning across instances
- [ ] Advanced reasoning chains
- [ ] Custom domain-specific agents

### **Platform Extensions**

- [ ] Mobile app integration
- [ ] Browser extension
- [ ] API marketplace
- [ ] Enterprise features

---

## 📚 **Additional Resources**

- **API Reference**: Complete API documentation
- **Plugin Development Guide**: Detailed plugin creation tutorial
- **Performance Guide**: Optimization best practices
- **Security Guide**: Security considerations and best practices
- **Deployment Guide**: Production deployment instructions

---

**Built with maximum modularity and clean interfaces for easy expansion and customization. The system is designed to grow with your needs while maintaining reliability and performance.**
