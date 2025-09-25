# 🤖 TryIt-AI Multi-Agent System - Developer Guide

## 📋 Quick Start

The multi-agent system is built on your existing TryIt-AI foundation and provides a modular, extensible architecture for AI agent coordination.

### Basic Usage

```typescript
import { getMultiAgentSystem } from '@/lib/agents';

// Get the system (auto-initializes with default config)
const system = await getMultiAgentSystem();

// Process a user request
const response = await system.processRequest(
  "Help me build a todo app",
  "session_123",
  {
    conversationHistory: [...],
    userPreferences: { trustLevel: 75, skepticMode: true }
  }
);

console.log(response.content); // Noah's response
console.log(response.agentId); // Which agent handled it
```

### API Integration

Two ways to use the multi-agent system:

#### 1. New Chat API (Recommended)
```bash
POST /api/chat-v2
```

Enhanced with multi-agent support, provider fallback, and detailed metadata.

#### 2. Existing Chat API
```bash
POST /api/chat
```

Continues to work as before - no breaking changes.

### System Monitoring

```bash
GET /api/system-status
```

Returns detailed health and performance metrics for all agents and providers.

## 🏗️ Architecture Overview

### Core Components

```
MultiAgentSystem
├── ProviderManager (LLM routing & fallback)
│   └── AnthropicProvider (using AI SDK)
├── AgentOrchestrator (agent coordination)
│   └── NoahAgent (preserves original persona)
└── SystemConfig (configuration management)
```

### Key Design Principles

1. **Interface-Driven**: All components implement clear interfaces
2. **Provider Agnostic**: Easy to add OpenAI, Google, etc.
3. **Graceful Degradation**: System continues working if components fail
4. **Backward Compatible**: Existing functionality preserved
5. **Extensible**: Add new agents without changing core system

## 🔧 Configuration

### Environment Variables

```bash
# Required
ANTHROPIC_API_KEY=your_api_key_here
MODEL_ID=claude-sonnet-4-20250514

# Optional
LOCAL_FAKE_LLM=true  # For testing without API calls
```

### Custom Configuration

```typescript
import { createDefaultConfig, MultiAgentSystem } from '@/lib/agents';

const customConfig = {
  ...createDefaultConfig(),
  routing: {
    type: 'performance-optimized', // or 'cost-optimized', 'round-robin'
    fallbackEnabled: true,
    maxRetries: 3,
    healthCheckInterval: 30000
  },
  agents: {
    noah: {
      temperature: 0.8,
      maxTokens: 2000
    }
  }
};

const system = new MultiAgentSystem(customConfig);
await system.initialize();
```

## 🤖 Adding New Agents

### 1. Create Agent Class

```typescript
import { BaseAgent } from '@/lib/agents/base-agent';
import type { AgentRequest, AgentResponse, LLMProvider } from '@/lib/agents/types';

export class CreativeAgent extends BaseAgent {
  constructor(llmProvider: LLMProvider) {
    super(
      'creative-wanderer',
      'Creative Wanderer',
      [
        {
          name: 'creative-thinking',
          description: 'Generates innovative and artistic solutions',
          version: '1.0.0'
        }
      ],
      llmProvider
    );
  }

  protected async processRequest(request: AgentRequest): Promise<AgentResponse> {
    const messages = this.buildMessages(request);
    const response = await this.generateText(messages);

    return {
      requestId: request.id,
      agentId: this.id,
      content: response.content,
      confidence: this.calculateConfidence(response.content, request),
      timestamp: new Date()
    };
  }

  protected getSystemPrompt(): string {
    return `You are a creative AI that thinks outside the box...`;
  }
}
```

### 2. Register with System

```typescript
import { getMultiAgentSystem } from '@/lib/agents';
import { CreativeAgent } from './creative-agent';

const system = await getMultiAgentSystem();
const creativeAgent = new CreativeAgent(primaryProvider);
system.orchestrator.registerAgent(creativeAgent);
```

### 3. Add Routing Rules

```typescript
const config = {
  orchestrator: {
    routing: {
      rules: [
        {
          condition: 'creative',
          targetAgent: 'creative-wanderer',
          priority: 1
        }
      ]
    }
  }
};
```

## 🔌 Adding New LLM Providers

### 1. Implement Provider

```typescript
import { BaseLLMProvider } from '@/lib/providers/base-llm-provider';

export class OpenAIProvider extends BaseLLMProvider {
  constructor(apiKey: string) {
    const capabilities = [
      {
        name: 'gpt-4',
        maxTokens: 128000,
        supportsStreaming: true,
        supportsTools: true,
        costPerToken: 0.00003
      }
    ];
    
    super('openai', capabilities);
  }

  protected async executeGeneration(request: TextGenerationRequest) {
    // Implement OpenAI API call
    const response = await openai.chat.completions.create({
      model: request.model,
      messages: request.messages,
      max_tokens: request.maxTokens,
      temperature: request.temperature
    });

    return {
      content: response.choices[0].message.content,
      usage: response.usage,
      model: response.model,
      finishReason: response.choices[0].finish_reason
    };
  }

  // ... implement other required methods
}
```

### 2. Register Provider

```typescript
import { getMultiAgentSystem } from '@/lib/agents';
import { OpenAIProvider } from './openai-provider';

const system = await getMultiAgentSystem();
const openaiProvider = new OpenAIProvider(process.env.OPENAI_API_KEY);

system.providerManager.registerProvider(openaiProvider, {
  name: 'openai',
  priority: 2,
  costWeight: 1.2,
  enabled: true
});
```

## 📊 Monitoring & Debugging

### System Health

```typescript
const system = await getMultiAgentSystem();
const status = system.getSystemStatus();

console.log('System Health:', status.isHealthy);
console.log('Providers:', status.providers);
console.log('Agents:', status.agents);
```

### Agent Performance

```typescript
const agents = system.orchestrator.getAllAgents();
for (const agent of agents) {
  const status = agent.getStatus();
  console.log(`${agent.name}:`, {
    healthy: status.isHealthy,
    requests: status.requestsProcessed,
    avgTime: status.averageResponseTime,
    errorRate: status.errorRate
  });
}
```

### Provider Metrics

```typescript
const providers = system.providerManager.getAllProviders();
for (const provider of providers) {
  console.log(`${provider.name}:`, {
    available: provider.status.isAvailable,
    responseTime: provider.status.responseTime,
    errorRate: provider.status.errorRate,
    rateLimit: provider.status.rateLimitRemaining
  });
}
```

## 🚨 Error Handling

### Graceful Degradation

The system automatically handles failures:

1. **Provider Failure**: Switches to backup provider
2. **Agent Failure**: Uses fallback agent (usually Noah)
3. **System Failure**: Falls back to original chat system

### Custom Error Handling

```typescript
try {
  const response = await system.processRequest(content, sessionId);
} catch (error) {
  if (error.message.includes('rate_limit')) {
    // Handle rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
    // Retry with different provider
  } else {
    // Log error and use fallback
    console.error('Agent system error:', error);
    // Fallback to original system
  }
}
```

## 🔧 Testing

### Local Testing

```bash
# Use fake LLM responses for testing
LOCAL_FAKE_LLM=true pnpm dev
```

### Unit Testing

```typescript
import { NoahAgent } from '@/lib/agents';
import { MockLLMProvider } from './mocks';

describe('NoahAgent', () => {
  it('should preserve original persona', async () => {
    const mockProvider = new MockLLMProvider();
    const noah = new NoahAgent(mockProvider);
    
    const request = {
      id: 'test-1',
      sessionId: 'session-1',
      content: 'Hello Noah',
      timestamp: new Date()
    };
    
    const response = await noah.process(request);
    expect(response.content).toContain('discernment');
  });
});
```

## 🚀 Deployment

### Environment Setup

```bash
# Production environment variables
ANTHROPIC_API_KEY=your_production_key
MODEL_ID=claude-sonnet-4-20250514
NODE_ENV=production
```

### Health Checks

Configure your load balancer to use:
```bash
HEAD /api/system-status  # Returns 200 if healthy, 503 if not
```

### Scaling Considerations

- Agents are stateless and can be horizontally scaled
- Provider manager handles rate limiting automatically
- Use caching for knowledge retrieval (future enhancement)

## 📈 Performance Optimization

### Cost Optimization

```typescript
const config = {
  routing: {
    type: 'cost-optimized', // Routes to cheapest provider
    fallbackEnabled: true
  },
  providers: {
    anthropic: {
      config: {
        costWeight: 1.0 // Higher = prefer for cost
      }
    }
  }
};
```

### Performance Optimization

```typescript
const config = {
  routing: {
    type: 'performance-optimized', // Routes to fastest provider
    fallbackEnabled: true
  }
};
```

## 🔮 Roadmap

### Phase 2: Knowledge Layer
- vectorize.io integration for RAG
- LangChain for complex reasoning chains
- Component library system

### Phase 3: Additional Agents
- Creative/Wanderer agent for artistic tasks
- Practical/Tinkerer agent for technical implementation
- Specialized tool generators

### Phase 4: Advanced Features
- A/B testing framework
- Advanced analytics
- Plugin architecture
- Multi-modal support

## 💡 Best Practices

1. **Always check system health** before critical operations
2. **Use appropriate routing strategies** for your use case
3. **Monitor error rates** and adjust fallback configs
4. **Test with fake LLM** during development
5. **Preserve Noah's persona** when making changes
6. **Use interface contracts** when extending the system

## 🆘 Troubleshooting

### Common Issues

**System not initializing**
- Check ANTHROPIC_API_KEY is set
- Verify network connectivity
- Check console for detailed error messages

**High error rates**
- Review provider rate limits
- Check API key validity
- Monitor system health endpoint

**Agent not responding**
- Verify agent registration
- Check routing rules
- Review agent-specific logs

**Performance issues**
- Switch to performance-optimized routing
- Check provider response times
- Consider provider priorities

For more help, check the logs or open an issue in the repository.
