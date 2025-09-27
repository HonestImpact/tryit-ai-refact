import { NextRequest, NextResponse } from 'next/server';
import { LoggingContext } from '@/lib/logging-middleware';
import { withCORSAndLogging } from '@/lib/cors-middleware';
import { anthropic } from '@ai-sdk/anthropic';
import { generateText } from 'ai';
import { AI_CONFIG } from '@/lib/ai-config';
import { ArtifactService } from '@/lib/artifact-service';
import { contentFilter } from '@/lib/safety/content-filter';
import { CacheManager } from '@/lib/cache/memory-cache';
import KnowledgeServiceSingleton from '@/lib/knowledge/knowledge-singleton';
import { createLogger } from '@/lib/logger';

const logger = createLogger('chat-api');

interface ChatResponse {
  content: string;
  artifact?: {
    title: string;
    content: string;
    reasoning?: string;
  };
}

// Helper function to get RAG context for Noah
async function getRAGContext(userMessage: string): Promise<string[]> {
  if (!AI_CONFIG.RAG_ENABLED) {
    logger.info('📚 RAG disabled, skipping context retrieval');
    return [];
  }

  try {
    logger.info('🔍 Searching knowledge base with singleton...');
    // Use the singleton to avoid initialization overhead
    const results = await KnowledgeServiceSingleton.search(userMessage, {
      maxResults: AI_CONFIG.RAG_CONTEXT_LIMIT,
      minRelevanceScore: AI_CONFIG.RAG_RELEVANCE_THRESHOLD
    });
    logger.info('✅ Knowledge base search complete', { resultCount: results.length });

    // Format results for context
    return results.map(result => {
      const item = result.item;
      const metadata = item.metadata as any;
      return `${metadata.title || item.type}: ${result.context || item.content.substring(0, 200)}...`;
    });

  } catch (error) {
    // GRACEFUL: Handle build-time or initialization errors
    if (error instanceof Error && error.message.includes('not available during build')) {
      logger.info('RAG not available during build phase - using basic Noah');
      return [];
    }
    
    logger.warn('RAG context retrieval failed (falling back to basic Noah)', { error });
    return [];
  }
}

// Helper function to determine if request should use multi-agent system
function shouldUseMultiAgent(lastMessage: string, allMessages: any[]): boolean {
  // TEMPORARILY DISABLED - Multi-agent system causing memory exhaustion (SIGKILL)
  return false;
  
  // Original logic (commented out to prevent memory issues):
  // const content = lastMessage.toLowerCase();
  // 
  // const complexityIndicators = [
  //   'build', 'create', 'implement', 'design', 'make',
  //   'step by step', 'multiple', 'several', 'various',
  //   'complex', 'sophisticated', 'advanced', 'comprehensive',
  //   'creative', 'brainstorm', 'innovative', 'technical'
  // ];
  // 
  // const hasComplexityWords = complexityIndicators.some(indicator => 
  //   content.includes(indicator)
  // );
  // 
  // const isLong = content.length > 150;
  // const hasMultipleQuestions = (content.match(/\?/g) || []).length > 1;
  // const isMultiTurn = allMessages.length > 4;
  // 
  // return hasComplexityWords || isLong || hasMultipleQuestions || isMultiTurn;
}

async function chatHandler(req: NextRequest, context: LoggingContext): Promise<NextResponse<ChatResponse>> {
  const startTime = Date.now();
  logger.info('🚀 Chat handler started', { sessionId: context.sessionId });
  
  try {
    logger.info('📥 Parsing request body...');
    const { messages, trustLevel, skepticMode } = await req.json();
    logger.info('✅ Request body parsed', { 
      messageCount: messages?.length, 
      trustLevel, 
      skepticMode,
      elapsed: Date.now() - startTime 
    });
    
    // Store the parsed body in context for logging
    context.requestBody = { messages, trustLevel, skepticMode };

    // Get the last user message for artifact context
    const lastUserMessage = messages[messages.length - 1]?.content || '';
    logger.info('📝 Processing message', { 
      messageLength: lastUserMessage.length,
      elapsed: Date.now() - startTime 
    });

    // SAFETY FILTER: Check content before processing
    logger.info('🛡️ Running safety filter...');
    const safetyResult = contentFilter.filterContent(lastUserMessage, context.sessionId);
    logger.info('✅ Safety filter complete', { 
      allowed: safetyResult.allowed,
      elapsed: Date.now() - startTime 
    });
    
    if (!safetyResult.allowed) {
      logger.info('🚫 Content blocked by safety filter');
      // Return safety response (blank lines + tag, or complete silence)
      return NextResponse.json({
        content: safetyResult.response || ''
      });
    }

    // ROUTE LOGIC: Use single-agent Noah for simple conversations, multi-agent for complex requests
    logger.info('🤖 Determining routing strategy...');
    const isComplexRequest = shouldUseMultiAgent(lastUserMessage, messages);
    logger.info('📊 Routing decision made', { 
      isComplexRequest,
      elapsed: Date.now() - startTime 
    });
    
    // TRY MULTI-AGENT SYSTEM FOR COMPLEX REQUESTS ONLY
    if (isComplexRequest) {
      logger.info('🔄 Attempting multi-agent system...');
      try {
        logger.info('📦 Importing multi-agent system...');
        const { getMultiAgentSystem } = await import('@/lib/agents/system-config');
        logger.info('✅ Multi-agent system imported', { elapsed: Date.now() - startTime });
        
        logger.info('🏗️ Getting multi-agent system instance...');
        const multiAgentSystem = await getMultiAgentSystem();
        logger.info('✅ Multi-agent system instance obtained', { elapsed: Date.now() - startTime });
        
        logger.info('🔍 Checking system status...');
        const systemStatus = multiAgentSystem.getSystemStatus();
        logger.info('📊 System status checked', { 
          status: systemStatus.status,
          isHealthy: systemStatus.isHealthy,
          elapsed: Date.now() - startTime 
        });
        
        // If multi-agent system is healthy, use it for complex requests
        if (systemStatus.status === 'initialized' && systemStatus.isHealthy) {
          logger.info('✅ Multi-agent system is healthy, processing request...');
          
          const conversationHistory = messages.slice(0, -1).map((msg: { role: string; content: string }) => ({
            role: msg.role as 'user' | 'assistant',
            content: msg.content,
            timestamp: new Date()
          }));
          logger.info('📚 Conversation history prepared', { 
            historyLength: conversationHistory.length,
            elapsed: Date.now() - startTime 
          });

          logger.info('🎯 Sending request to multi-agent system...');
          const agentResponse = await multiAgentSystem.processRequest(
            lastUserMessage,
            context.sessionId,
            {
              conversationHistory,
              userPreferences: {}
            }
          );
          logger.info('✅ Multi-agent response received', { 
            agentId: agentResponse.agentId,
            contentLength: agentResponse.content?.length,
            elapsed: Date.now() - startTime 
          });

        // Process response for artifacts using existing system
        logger.info('🔧 Processing artifacts...');
        const parsed = await ArtifactService.handleArtifactWorkflow(
          agentResponse.content,
          lastUserMessage,
          context.sessionId
        );
        logger.info('✅ Artifacts processed', { 
          hasArtifact: parsed.hasArtifact,
          elapsed: Date.now() - startTime 
        });

        const response: ChatResponse = {
          content: parsed.cleanContent || agentResponse.content
        };

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

        logger.info('🎉 Multi-agent response ready', { elapsed: Date.now() - startTime });
        return NextResponse.json(response);
        } else {
          logger.warn('❌ Multi-agent system not healthy, falling back to single agent', { 
            status: systemStatus.status,
            isHealthy: systemStatus.isHealthy 
          });
        }
      } catch (multiAgentError) {
        logger.error('💥 Multi-agent system failed, falling back to single agent', { 
          error: multiAgentError,
          elapsed: Date.now() - startTime 
        });
        // Log this as a system health issue for monitoring
        logger.error('SYSTEM DEGRADATION: Multi-agent system unavailable', {
          error: multiAgentError,
          sessionId: context.sessionId,
          fallbackActivated: true
        });
      }
    }

    // FALLBACK: Use original single-agent system
    logger.info('🦉 Using single-agent Noah fallback...');
    
    // Check if we should use fake responses for testing
    if (process.env.LOCAL_FAKE_LLM === 'true') {
      logger.info('🧪 Using fake LLM responses for testing');
      const userQuery = lastUserMessage.toLowerCase();
      let fakeResponse = '';
      
      if (userQuery.includes('focus') || userQuery.includes('concentration')) {
        fakeResponse = `I can tell you're thinking critically about focus - most people just want quick fixes. Your awareness that concentration is complex is exactly right.

Here's what I've seen work for people who take a systematic approach:

**Structured Focus Sessions**

1. Choose one specific outcome you want
2. Set a 25-minute boundary 
3. Work within that constraint
4. Take a genuine break when it ends
5. Repeat 3-4 cycles, then step back

The constraint isn't arbitrary - it acknowledges that sustained attention is a finite resource. You're designing a system that works with your cognitive architecture, not against it.

Want to refine this approach based on what you know about your own patterns?`;
      } else if (userQuery.includes('email') || userQuery.includes('template')) {
        fakeResponse = `I appreciate that you're looking for something more substantial than generic templates. Here's a framework that respects both your time and the recipient's intelligence:

**Direct Professional Communication**

Subject: [Specific reference to your actual conversation]

[Name],

Circling back on [the specific thing you discussed]. Key points:

- [Actual point with context]
- [Next actual point]
- [What needs clarification or action]

[Your clear ask or next step]

[Your name]

The structure works because it's honest about what happened and what needs to happen next. Want to adapt this for your specific situation?`;
      } else {
        fakeResponse = `You're right to be thoughtful about this rather than jumping to solutions. Most productivity advice treats symptoms rather than examining underlying patterns.

Here's a framework that respects your judgment:

**Intentional Daily Design**

1. Identify 3 outcomes that would make today worthwhile
2. Sequence them based on your energy and constraints
3. Build in decision points to evaluate and adjust

This isn't about productivity optimization - it's about conscious choice-making. You're the architect of how you spend your attention.

What aspects of your current approach are you most interested in examining?`;
      }
      
      // Use handleArtifactWorkflow for consistent logging
      const parsed = await ArtifactService.handleArtifactWorkflow(
        fakeResponse,
        lastUserMessage,
        context.sessionId
      );
      
      return NextResponse.json({
        content: fakeResponse, // Always show full response in chat for natural flow
        artifact: parsed.hasArtifact ? {
          title: parsed.title,
          content: parsed.content,
          reasoning: parsed.reasoning
        } : undefined
      });
    }

    // Get RAG context for enhanced responses
    logger.info('🔍 Getting RAG context for Noah...');
    const ragContext = await getRAGContext(lastUserMessage);
    logger.info('✅ RAG context retrieved', { 
      contextItems: ragContext.length,
      elapsed: Date.now() - startTime 
    });
    
    // Use RAG-enhanced system prompt if we have relevant context
    const systemPrompt = ragContext.length > 0 
      ? AI_CONFIG.RAG_SYSTEM_PROMPT(ragContext)
      : AI_CONFIG.CHAT_SYSTEM_PROMPT;
    logger.info('📝 System prompt prepared', { 
      hasRAGContext: ragContext.length > 0,
      elapsed: Date.now() - startTime 
    });

    // Call the actual Anthropic API
    logger.info('🧠 Calling Anthropic API...');
    const result = await generateText({
      model: anthropic(AI_CONFIG.getModel()),
      messages: messages,
      system: systemPrompt,
    });
    logger.info('✅ Anthropic API response received', { 
      responseLength: result.text.length,
      elapsed: Date.now() - startTime 
    });

    // Process response for artifacts
    const parsed = await ArtifactService.handleArtifactWorkflow(
      result.text,
      lastUserMessage,
      context.sessionId
    );

    const response: ChatResponse = {
      content: parsed.cleanContent || result.text
    };

    if (parsed.hasArtifact) {
      response.artifact = {
        title: parsed.title,
        content: parsed.content,
        reasoning: parsed.reasoning
      };
      
      // Ensure we show the full content in chat for natural conversation flow
      if (!parsed.cleanContent || parsed.cleanContent.length < result.text.length * 0.7) {
        response.content = result.text;
      }
    }

    logger.info('🎉 Final response ready', { 
      totalElapsed: Date.now() - startTime,
      hasArtifact: !!response.artifact 
    });
    return NextResponse.json(response);
  } catch (error) {
    logger.error('💥 CRITICAL ERROR: All chat systems failed', { 
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      elapsed: Date.now() - startTime 
    });
    
    // EMERGENCY FALLBACK: Static response to ensure user always gets something
    const emergencyResponse = {
      content: `I'm experiencing technical difficulties, but I'm designed to be transparent about that. The system is having trouble connecting to its AI services right now.

This is exactly the kind of moment where most AI tools would give you a generic "try again later" message. Instead, I'll tell you what's actually happening: something in the infrastructure isn't responding as expected.

If you're testing this system, this failure mode is actually valuable data. If you're trying to get something done, I apologize that I can't be more useful right now.

Want to try refreshing and asking again? Sometimes these issues resolve quickly.`
    };

    return NextResponse.json(emergencyResponse, { status: 500 });
  }
}

export const POST = withCORSAndLogging(chatHandler);

// Export OPTIONS handler for explicit CORS preflight support
export const OPTIONS = withCORSAndLogging(async () => {
  return new NextResponse(null, { status: 204 });
});
