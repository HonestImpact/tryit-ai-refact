import { NextRequest, NextResponse } from 'next/server';
import { AI_CONFIG } from '@/lib/ai-config';
import { createLogger } from '@/lib/logger';
import { ArtifactService } from '@/lib/artifact-service';
import { withLogging, LoggingContext } from '@/lib/logging-middleware';
import { createLLMProvider } from '@/lib/providers/provider-factory';
import { WandererAgent } from '@/lib/agents/wanderer-agent';
import { PracticalAgent } from '@/lib/agents/practical-agent';
import { sharedResourceManager } from '@/lib/agents/shared-resources';

const logger = createLogger('noah-chat');

// 🚀 MODULE-LEVEL AGENT CACHING - Initialize ONCE, reuse forever
let wandererInstance: WandererAgent | null = null;
let tinkererInstance: PracticalAgent | null = null;
let sharedResourcesCache: any = null;
let agentInitializationPromise: Promise<void> | null = null;

// Timeout configuration for Noah Direct
const NOAH_TIMEOUT = 30000; // 30 seconds max for Noah responses

interface ChatResponse {
  content: string;
  status?: string;
  agent?: string;
  artifact?: {
    title: string;
    content: string;
  };
}

interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  agent: string;
  capabilities: string[];
  model: string;
  avg_response_time: string;
}

/**
 * Timeout wrapper for async operations
 */
async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs);
  });
  
  return Promise.race([promise, timeoutPromise]);
}

/**
 * Noah's internal analysis - determines if he needs help from other agents
 * Following the exact pattern suggested by user
 */
function analyzeRequest(content: string): {
  needsResearch: boolean;
  needsBuilding: boolean;
  confidence: number;
  reasoning: string;
} {
  const contentLower = content.toLowerCase();
  
  // Research indicators
  const researchKeywords = [
    'research', 'investigate', 'analyze', 'study', 'explore', 'compare',
    'what are the best', 'how do I choose', 'pros and cons', 'options',
    'best practices', 'state of the art', 'current trends', 'approaches'
  ];
  
  // Building indicators  
  const buildingKeywords = [
    'build', 'create', 'make', 'develop', 'implement', 'code', 'write',
    'app', 'website', 'component', 'tool', 'system', 'solution',
    'react', 'python', 'javascript', 'html', 'css', 'database'
  ];
  
  const needsResearch = researchKeywords.some(keyword => contentLower.includes(keyword));
  const needsBuilding = buildingKeywords.some(keyword => contentLower.includes(keyword));
  
  // Calculate confidence based on keyword matches
  const researchMatches = researchKeywords.filter(keyword => contentLower.includes(keyword)).length;
  const buildingMatches = buildingKeywords.filter(keyword => contentLower.includes(keyword)).length;
  const confidence = Math.min(0.9, (researchMatches + buildingMatches) * 0.2 + 0.3);
  
  let reasoning = '';
  if (needsResearch && needsBuilding) {
    reasoning = 'Complex request requiring research then implementation';
  } else if (needsResearch) {
    reasoning = 'Research and analysis needed';
  } else if (needsBuilding) {
    reasoning = 'Direct implementation requested';
  } else {
    reasoning = 'Simple conversation or tool creation';
  }
  
  return { needsResearch, needsBuilding, confidence, reasoning };
}

/**
 * 🚀 SMART AGENT INITIALIZATION - Initialize once, reuse forever
 * This eliminates the 5s+ initialization overhead on every request
 */
async function ensureAgentsInitialized(): Promise<void> {
  // If already initialized, return immediately
  if (wandererInstance && tinkererInstance && sharedResourcesCache) {
    return;
  }

  // If initialization is in progress, wait for it
  if (agentInitializationPromise) {
    return agentInitializationPromise;
  }

  // Start initialization (only happens once per module load)
  agentInitializationPromise = (async () => {
    try {
      logger.info('🚀 Initializing agents (one-time setup)...');
      const startTime = Date.now();
      
      const llmProvider = createLLMProvider();
      
      // Initialize shared resources once
      if (!sharedResourcesCache) {
        sharedResourcesCache = await withTimeout(
          sharedResourceManager.initializeResources(llmProvider),
          8000 // Longer timeout for one-time initialization
        );
        logger.info('✅ Shared resources cached');
      }

      // Initialize Wanderer once
      if (!wandererInstance) {
        wandererInstance = new WandererAgent(
          llmProvider,
          {
            model: AI_CONFIG.getModel(),
            temperature: 0.75,
            maxTokens: 2500
          },
          {
            knowledgeService: sharedResourcesCache.knowledgeService
          }
        );
        logger.info('✅ Wanderer agent cached');
      }

      // Initialize Tinkerer once
      if (!tinkererInstance) {
        tinkererInstance = new PracticalAgent(
          llmProvider,
          {
            model: AI_CONFIG.getModel(),
            temperature: 0.3,
            maxTokens: 4000
          },
          {
            ragIntegration: sharedResourcesCache.ragIntegration,
            solutionGenerator: sharedResourcesCache.solutionGenerator
          }
        );
        logger.info('✅ Tinkerer agent cached');
      }

      const initTime = Date.now() - startTime;
      logger.info('🎉 All agents initialized and cached', { initTime });
      
    } catch (error) {
      logger.error('💥 Agent initialization failed', { error });
      // Reset so next request can try again
      wandererInstance = null;
      tinkererInstance = null;
      sharedResourcesCache = null;
      agentInitializationPromise = null;
      throw error;
    }
  })();

  return agentInitializationPromise;
}

/**
 * 🔬 Cached Wanderer research - uses pre-initialized instance
 */
async function wandererResearch(messages: any[], context: LoggingContext): Promise<{ content: string }> {
  await ensureAgentsInitialized();
  
  if (!wandererInstance) {
    throw new Error('Wanderer agent not initialized');
  }

  logger.info('🔬 Using cached Wanderer for research...');
  const lastMessage = messages[messages.length - 1]?.content || '';
  
  const research = await wandererInstance.process({
    id: `research_${Date.now()}`,
    sessionId: context.sessionId,
    content: lastMessage,
    timestamp: new Date()
  });

  return { content: (research as any).content };
}

/**
 * 🔧 Cached Tinkerer build - uses pre-initialized instance
 */
async function tinkererBuild(messages: any[], research: { content: string } | null, context: LoggingContext): Promise<{ content: string }> {
  await ensureAgentsInitialized();
  
  if (!tinkererInstance) {
    throw new Error('Tinkerer agent not initialized');
  }

  logger.info('🔧 Using cached Tinkerer for building...');
  const lastMessage = messages[messages.length - 1]?.content || '';
  const buildContent = research 
    ? `${lastMessage}\n\nResearch Context:\n${research.content}`
    : lastMessage;

  const tool = await tinkererInstance.process({
    id: `build_${Date.now()}`,
    sessionId: context.sessionId,
    content: buildContent,
    timestamp: new Date()
  });

  return { content: (tool as any).content };
}

/**
 * User-friendly error messages that match Noah's persona
 */
function getErrorMessage(error: unknown): string {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  
  if (errorMessage.includes('timeout')) {
    return `I'm taking longer than usual to respond. This might be a good time to tell me to get my act together. The technical issue is: ${errorMessage}`;
  }
  
  if (errorMessage.includes('Model is required')) {
    return `Something's wrong with my language model configuration. The technical issue is: ${errorMessage}`;
  }
  
  return `I'm experiencing technical difficulties, but I'm designed to be transparent about that. Something unexpected happened that I can't process right now. If you're testing this system, this failure mode is actually valuable data.`;
}

/**
 * Clean Noah-only chat handler - handles simple tools and general conversation
 * Part of the 4 approved workflows: Noah Direct for simple tools and conversation
 * Frontend routes complex requests to appropriate specialized endpoints
 */
async function noahChatHandler(req: NextRequest, context: LoggingContext): Promise<NextResponse<ChatResponse>> {
  const startTime = Date.now();
  console.log("🚀 API call started");
  logger.info('🦉 Noah-only handler started');
  
  try {
    // Parse request with timeout protection
    console.log("⏱️ Starting request parsing");
    const parsePromise = req.json();
    const { messages, skepticMode } = await withTimeout(parsePromise, 2000); // 2s timeout for parsing
    console.log("✅ Request parsed successfully");
    
    // Store parsed body in context for logging middleware
    context.requestBody = { messages, skepticMode };
    
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({
        content: "I didn't receive any messages to respond to. Want to try sending me something?",
        status: 'error',
        agent: 'noah'
      });
    }

    const lastMessage = messages[messages.length - 1]?.content || '';
    console.log("⏱️ Starting message analysis");
    logger.info('📝 Processing Noah request', { 
      messageCount: messages.length,
      messageLength: lastMessage.length 
    });

    // Noah analyzes and decides internally - following user's exact pattern
    const analysis = analyzeRequest(lastMessage);
    console.log("✅ Analysis complete", analysis);
    logger.info('🧠 Noah analysis complete', { 
      needsResearch: analysis.needsResearch,
      needsBuilding: analysis.needsBuilding,
      reasoning: analysis.reasoning,
      confidence: analysis.confidence
    });

    let result: { content: string };

    try {
      if (analysis.needsResearch) {
        console.log("⏱️ Starting agent check for research");
        logger.info('🔬 Noah delegating to Wanderer for research...');
        const research = await withTimeout(wandererResearch(messages, context), 25000);
        console.log("✅ Research complete");
        if (analysis.needsBuilding) {
          console.log("⏱️ Starting agent check for building");
          logger.info('🔧 Noah chaining to Tinkerer for building...');
          const tool = await withTimeout(tinkererBuild(messages, research, context), 30000);
          console.log("✅ Building complete");
          result = { content: tool.content };
        } else {
          result = { content: research.content };
        }
      } else if (analysis.needsBuilding) {
        console.log("⏱️ Starting agent check for building");
        logger.info('🔧 Noah delegating to Tinkerer for building...');
        const tool = await withTimeout(tinkererBuild(messages, null, context), 30000);
        console.log("✅ Building complete");
        result = { content: tool.content };
      } else {
        // Noah handles directly
        console.log("⏱️ Starting LLM call");
        logger.info('🦉 Noah handling directly...');
        const llmProvider = createLLMProvider();
        const generatePromise = llmProvider.generateText({
          messages: messages.map((msg: any) => ({ 
            role: msg.role, 
            content: msg.content 
          })),
          system: AI_CONFIG.CHAT_SYSTEM_PROMPT,
          model: AI_CONFIG.getModel(),
          temperature: 0.7
        });
        result = await withTimeout(generatePromise, NOAH_TIMEOUT);
        console.log("✅ LLM response received");
      }
    } catch (agentError) {
      console.log("❌ Agent orchestration failed, falling back to Noah direct");
      console.error("Agent error details:", agentError);
      logger.error('🚨 Agent orchestration failed, Noah handling directly', { error: agentError });
      // Fallback to Noah Direct if orchestration fails
      console.log("⏱️ Starting fallback LLM call");
      const llmProvider = createLLMProvider();
      const generatePromise = llmProvider.generateText({
        messages: messages.map((msg: any) => ({ 
          role: msg.role, 
          content: msg.content 
        })),
        system: AI_CONFIG.CHAT_SYSTEM_PROMPT,
        model: AI_CONFIG.getModel(),
        temperature: 0.7
      });
      result = await withTimeout(generatePromise, NOAH_TIMEOUT);
      console.log("✅ Fallback LLM response received");
    }
    
    const responseTime = Date.now() - startTime;
    console.log("⏱️ Starting artifact processing");
    logger.info('✅ Noah response generated', { 
      responseLength: result.content.length,
      responseTime 
    });

    // Process for artifacts using established workflow
    const parsed = await ArtifactService.handleArtifactWorkflow(
      result.content,
      lastMessage,
      context.sessionId
    );
    console.log("✅ Artifact processing complete");

    let noahContent = result.content;
    
    // If artifact was created, show first 5 lines in chat and redirect to toolbox
    if (parsed.hasArtifact && parsed.title && parsed.content) {
      const lines = result.content.split('\n');
      const firstFiveLines = lines.slice(0, 5).join('\n');
      const hasMoreContent = lines.length > 5;

      if (hasMoreContent) {
        noahContent = `${firstFiveLines}\n\n*I've created a tool for you! Check your toolbox for the complete "${parsed.title}" with all the details.*`;
      } else {
        noahContent = `${result.content}\n\n*This tool has been saved to your toolbox as "${parsed.title}" for easy access.*`;
      }
    }

    const response: ChatResponse = {
      content: noahContent,
      status: 'success',
      agent: 'noah'
    };

    // Include artifact in response for frontend processing
    if (parsed.hasArtifact && parsed.title && parsed.content) {
      response.artifact = {
        title: parsed.title,
        content: parsed.content
      };
    }

    console.log("✅ Response ready, sending to client");
    return NextResponse.json(response);

  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.log("❌ FATAL ERROR in Noah handler");
    console.error("Fatal error details:", error);
    logger.error('💥 Noah handler error', { 
      error: error instanceof Error ? error.message : error,
      responseTime 
    });

    return NextResponse.json({
      content: getErrorMessage(error),
      status: 'error',
      agent: 'noah'
    }, { status: 500 });
  }
}

/**
 * Health check for Noah endpoint - GET /api/chat
 */
async function healthCheck(): Promise<NextResponse<HealthResponse>> {
  const startTime = Date.now();
  
  try {
    const llmProvider = createLLMProvider();
    const testPromise = llmProvider.generateText({
      messages: [{ role: 'user', content: 'test' }],
      system: 'Respond with just "ok"',
      model: AI_CONFIG.getModel() // Use configured model
    });

    await withTimeout(testPromise, 5000);
    const responseTime = Date.now() - startTime;

    return NextResponse.json({
      status: 'healthy',
      agent: 'noah',
      capabilities: [
        'General conversation',
        'Simple tool creation',
        'Artifact generation',
        'Skeptical dialogue'
      ],
      model: AI_CONFIG.getModel(),
      avg_response_time: `${responseTime}ms`
    });

  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    return NextResponse.json({
      status: 'unhealthy',
      agent: 'noah',
      capabilities: [],
      model: 'unknown',
      avg_response_time: `${responseTime}ms (failed)`
    }, { status: 500 });
  }
}

// Export handlers with logging middleware
export const POST = withLogging(noahChatHandler);
export const GET = healthCheck;