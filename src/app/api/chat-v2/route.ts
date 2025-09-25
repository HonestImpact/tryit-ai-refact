// Enhanced Chat API with Multi-Agent System Support
// Built on the existing TryIt-AI foundation

import { NextRequest, NextResponse } from 'next/server';
import { withLogging, LoggingContext } from '@/lib/logging-middleware';
import { getMultiAgentSystem } from '@/lib/agents/system-config';
import { ArtifactService } from '@/lib/artifact-service';

interface ChatV2Response {
  content: string;
  agent?: {
    id: string;
    name: string;
    confidence: number;
  };
  artifact?: {
    title: string;
    content: string;
    reasoning?: string;
  };
  metadata?: {
    processingTime: number;
    tokensUsed?: number;
    systemHealth: boolean;
  };
}

async function chatV2Handler(req: NextRequest, context: LoggingContext): Promise<NextResponse<ChatV2Response>> {
  const startTime = Date.now();
  
  try {
    const { messages, trustLevel, skepticMode } = await req.json();
    
    // Store the parsed body in context for logging
    context.requestBody = { messages, trustLevel, skepticMode };

    // Get the last user message for processing
    const lastUserMessage = messages[messages.length - 1]?.content || '';

    // Check if we should use fake responses for testing
    if (process.env.LOCAL_FAKE_LLM === 'true') {
      return handleFakeResponse(lastUserMessage, context, startTime);
    }

    // Get the multi-agent system
    const multiAgentSystem = await getMultiAgentSystem();
    
    // Check system health
    const systemStatus = multiAgentSystem.getSystemStatus();
    if (systemStatus.status !== 'initialized' || !systemStatus.isHealthy) {
      console.warn('Multi-agent system is not healthy, falling back to single agent');
      // Could fallback to original chat handler here
      throw new Error('Multi-agent system not available');
    }

    // Prepare conversation context
    const conversationHistory = messages.slice(0, -1).map((msg: { role: string; content: string }) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
      timestamp: new Date()
    }));

    // Process with multi-agent system
    const agentResponse = await multiAgentSystem.processRequest(
      lastUserMessage,
      context.sessionId,
      {
        conversationHistory,
        userPreferences: {
          trustLevel,
          skepticMode
        }
      }
    );

    // Process response for artifacts using existing system
    const parsed = await ArtifactService.handleArtifactWorkflow(
      agentResponse.content,
      lastUserMessage,
      context.sessionId
    );

    const processingTime = Date.now() - startTime;

    const response: ChatV2Response = {
      content: parsed.cleanContent || agentResponse.content,
      agent: {
        id: agentResponse.agentId,
        name: agentResponse.agentId, // Could be enhanced with agent name lookup
        confidence: agentResponse.confidence
      },
      metadata: {
        processingTime,
        tokensUsed: agentResponse.metadata?.tokensUsed as number,
        systemHealth: systemStatus.isHealthy
      }
    };

    // Add artifact if present
    if (parsed.hasArtifact) {
      response.artifact = {
        title: parsed.title,
        content: parsed.content,
        reasoning: parsed.reasoning
      };
      
      // Ensure we show the full content in chat for natural conversation flow
      if (!parsed.cleanContent || parsed.cleanContent.length < agentResponse.content.length * 0.7) {
        response.content = agentResponse.content;
      }
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Multi-Agent Chat API Error:', error);
    
    const processingTime = Date.now() - startTime;
    
    // Return graceful error response
    return NextResponse.json({
      content: 'I encountered an issue processing your request. The system is designed to learn from these moments - your patience is appreciated.',
      metadata: {
        processingTime,
        systemHealth: false
      }
    }, { status: 500 });
  }
}

async function handleFakeResponse(
  lastUserMessage: string, 
  context: LoggingContext,
  startTime: number
): Promise<NextResponse<ChatV2Response>> {
  const userQuery = lastUserMessage.toLowerCase();
  let fakeResponse = '';
  
  // Enhanced fake responses that demonstrate multi-agent capabilities
  if (userQuery.includes('creative') || userQuery.includes('design')) {
    fakeResponse = `I can tell you value thoughtful design - most people rush to solutions without understanding the underlying needs.

Let me approach this creatively:

**Design Philosophy Framework**

1. **Understand the core intention** - What are you really trying to achieve?
2. **Explore constraints as features** - Limitations often spark the best innovations
3. **Iterate with intention** - Each version should teach you something new
4. **Honor the user's intelligence** - Don't dumb down, elevate

This isn't about following design trends; it's about creating something that genuinely serves its purpose while respecting the people who'll use it.

What specific design challenge are you wrestling with?`;
  } else if (userQuery.includes('build') || userQuery.includes('implement')) {
    fakeResponse = `You're right to think systematically about implementation - good code isn't just functional, it's sustainable.

Here's a practical approach:

**Implementation Strategy**

1. **Start with the core behavior** - What's the one thing this must do well?
2. **Build in layers** - Each layer should be testable independently
3. **Plan for change** - Your future self will thank you for clear interfaces
4. **Document your decisions** - Not what, but why

This creates code that's not just working today, but maintainable tomorrow. You're building for longevity, not just immediate results.

What's the specific functionality you're looking to implement?`;
  } else {
    fakeResponse = `I appreciate that you're taking time to think this through rather than jumping to quick answers. That discernment serves you well.

**Multi-Agent Coordination Approach**

I'm working with specialized agents to give you the most thoughtful response:
- **Creative analysis** for innovative perspectives
- **Practical implementation** for actionable solutions
- **Coordinated synthesis** for comprehensive answers

This isn't about showing off technology - it's about respecting the complexity of your actual needs and providing responses that match that sophistication.

What would be most valuable to explore together?`;
  }
  
  // Use handleArtifactWorkflow for consistent logging
  const parsed = await ArtifactService.handleArtifactWorkflow(
    fakeResponse,
    lastUserMessage,
    context.sessionId
  );
  
  const processingTime = Date.now() - startTime;
  
  return NextResponse.json({
    content: fakeResponse,
    agent: {
      id: 'noah',
      name: 'Noah (Coordinator)',
      confidence: 0.85
    },
    artifact: parsed.hasArtifact ? {
      title: parsed.title,
      content: parsed.content,
      reasoning: parsed.reasoning
    } : undefined,
    metadata: {
      processingTime,
      systemHealth: true
    }
  });
}

export const POST = withLogging(chatV2Handler);
