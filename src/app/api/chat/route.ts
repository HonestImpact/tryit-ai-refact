import { NextRequest, NextResponse } from 'next/server';
import { AI_CONFIG } from '@/lib/ai-config';
import { createLogger } from '@/lib/logger';
import { ArtifactService } from '@/lib/artifact-service';
import { withLogging, LoggingContext } from '@/lib/logging-middleware';
import { createLLMProvider } from '@/lib/providers/provider-factory';

const logger = createLogger('noah-chat');

// Timeout configuration
const NOAH_TIMEOUT = 10000; // 10 seconds max

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
  memory: 'low' | 'medium' | 'high';
  responseTime?: number;
  timestamp: string;
}

/**
 * Timeout wrapper for Noah's processing
 */
async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('Request timeout')), timeoutMs);
  });
  
  return Promise.race([promise, timeoutPromise]);
}

/**
 * Detect if a request needs complex tool creation (should go to Tinkerer)
 */
function shouldDelegateToTinkerer(content: string): boolean {
  const lowerContent = content.toLowerCase();
  
  // Complex tool indicators
  const complexIndicators = [
    'database', 'api', 'backend', 'server', 'authentication', 'login',
    'multi-step', 'workflow', 'integration', 'advanced', 'sophisticated',
    'dashboard', 'analytics', 'real-time', 'websocket', 'framework',
    'react', 'vue', 'angular', 'node.js', 'python', 'full-stack'
  ];
  
  // Simple tool indicators (Noah can handle these)
  const simpleIndicators = [
    'calculator', 'timer', 'converter', 'form', 'checklist', 'tracker',
    'simple', 'basic', 'quick', 'small', 'minimal'
  ];
  
  const hasComplexIndicators = complexIndicators.some(indicator => 
    lowerContent.includes(indicator)
  );
  
  const hasSimpleIndicators = simpleIndicators.some(indicator => 
    lowerContent.includes(indicator)
  );
  
  // If explicitly simple, Noah handles it
  if (hasSimpleIndicators && !hasComplexIndicators) {
    return false;
  }
  
  // If complex indicators present, delegate to Tinkerer
  return hasComplexIndicators;
}

/**
 * Delegate complex tool requests to Tinkerer via build endpoint
 */
async function delegateToTinkerer(messages: any[], context: LoggingContext): Promise<NextResponse<ChatResponse> | null> {
  try {
    const buildResponse = await fetch(`${process.env.VERCEL_URL || 'http://localhost:3000'}/api/chat/build`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-session-id': context.sessionId
      },
      body: JSON.stringify({ messages })
    });

    if (!buildResponse.ok) {
      throw new Error(`Tinkerer delegation failed: ${buildResponse.status}`);
    }

    const buildData = await buildResponse.json();
    
    // Convert Tinkerer response to Noah response format
    return NextResponse.json({
      content: buildData.content,
      status: 'success',
      agent: 'noah-delegated-to-tinkerer',
      artifact: buildData.artifact
    });

  } catch (error) {
    logger.warn('Tinkerer delegation failed, falling back to Noah', { error });
    // Fall back to Noah handling it directly
    return null;
  }
}

/**
 * User-friendly error messages that match Noah's persona
 */
function getErrorMessage(error: unknown): string {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  
  if (errorMessage.includes('timeout')) {
    return `I'm taking longer than usual to respond. This happens sometimes when I'm processing complex thoughts. Want to try rephrasing your question, or should we start with something simpler?`;
  }
  
  if (errorMessage.includes('rate limit')) {
    return `I'm hitting some rate limits right now - the infrastructure is getting a workout. Give me a moment and try again?`;
  }
  
  if (errorMessage.includes('network') || errorMessage.includes('connection')) {
    return `I'm having trouble connecting to my AI services. This is exactly the kind of moment where most tools would give you a generic error. Instead, I'll tell you: something in the network isn't cooperating. Try refreshing?`;
  }
  
  return `I'm experiencing technical difficulties, but I'm designed to be transparent about that. Something unexpected happened that I can't process right now. If you're testing this system, this failure mode is actually valuable data.`;
}

/**
 * Rock-solid Noah-only chat handler with full logging and artifact support
 * Preserves all established functionality while maintaining reliability
 */
async function noahChatHandler(req: NextRequest, context: LoggingContext): Promise<NextResponse<ChatResponse>> {
  const startTime = Date.now();
  logger.info('🦉 Noah-only handler started');
  
  try {
    // Parse request with timeout protection
    const parsePromise = req.json();
    const { messages, skepticMode } = await withTimeout(parsePromise, 2000); // 2s timeout for parsing
    
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
    logger.info('📝 Processing Noah request', { 
      messageCount: messages.length,
      messageLength: lastMessage.length 
    });

    // Check if this needs complex tool creation (delegate to Tinkerer)
    if (shouldDelegateToTinkerer(lastMessage)) {
      logger.info('🔄 Delegating complex tool request to Tinkerer');
      const delegationResult = await delegateToTinkerer(messages, context);
      if (delegationResult) {
        return delegationResult;
      }
      // If delegation failed, continue with Noah handling it directly
      logger.info('🦉 Tinkerer delegation failed, Noah handling directly');
    }

    // Call LLM provider (respects LLM environment variable)
    logger.info('🧠 Calling LLM provider...');
    const llmProvider = createLLMProvider();
    const generatePromise = llmProvider.generateText({
      messages: messages.map((msg: any) => ({ role: msg.role, content: msg.content })),
      system: AI_CONFIG.CHAT_SYSTEM_PROMPT, // Noah's full persona
      model: AI_CONFIG.getModel(), // Use configured model
      temperature: 0.7
    });

    const result = await withTimeout(generatePromise, NOAH_TIMEOUT);
    
    const responseTime = Date.now() - startTime;
    logger.info('✅ Noah response generated', { 
      responseLength: result.content.length,
      responseTime 
    });

    // Process response for artifacts using existing system
    const parsed = await ArtifactService.handleArtifactWorkflow(
      result.content,
      lastMessage,
      context.sessionId
    );

    // Prepare Noah's response content
    let noahContent = result.content;
    
    // If artifact detected, show first 5 lines + redirect message
    if (parsed.hasArtifact && parsed.title && parsed.content) {
      const lines = result.content.split('\n');
      const firstFiveLines = lines.slice(0, 5).join('\n');
      const hasMoreContent = lines.length > 5;
      
      if (hasMoreContent) {
        noahContent = `${firstFiveLines}\n\n*I've created a tool for you! Check your toolbox for the complete "${parsed.title}" with all the details.*`;
      } else {
        // If content is short, keep it all but still mention the toolbox
        noahContent = `${result.content}\n\n*This tool has been saved to your toolbox as "${parsed.title}" for easy access.*`;
      }
    }

    const response: ChatResponse = {
      content: noahContent,
      status: 'success',
      agent: 'noah'
    };

    // Add artifact if detected
    if (parsed.hasArtifact && parsed.title && parsed.content) {
      response.artifact = {
        title: parsed.title,
        content: parsed.content
      };
    }

    return NextResponse.json(response);

  } catch (error) {
    const responseTime = Date.now() - startTime;
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
 * Health check endpoint - GET /api/chat
 */
async function healthCheck(): Promise<NextResponse<HealthResponse>> {
  const startTime = Date.now();
  
  try {
    // Quick test of LLM provider
    const llmProvider = createLLMProvider();
    const testPromise = llmProvider.generateText({
      messages: [{ role: 'user', content: 'test' }],
      system: 'Respond with just "ok"',
      model: AI_CONFIG.getModel() // Use configured model
    });

    await withTimeout(testPromise, 5000); // 5s timeout for health check
    const responseTime = Date.now() - startTime;

    return NextResponse.json({
      status: 'healthy',
      agent: 'noah',
      memory: 'low',
      responseTime,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    const responseTime = Date.now() - startTime;
    logger.warn('⚠️ Health check failed', { error, responseTime });

    return NextResponse.json({
      status: responseTime > 8000 ? 'unhealthy' : 'degraded',
      agent: 'noah',
      memory: 'low',
      responseTime,
      timestamp: new Date().toISOString()
    }, { status: responseTime > 8000 ? 503 : 200 });
  }
}

// Export handlers with logging middleware to restore Supabase logging
export const POST = withLogging(noahChatHandler);
export const GET = healthCheck;

// Simple OPTIONS handler for CORS
export async function OPTIONS() {
  return new NextResponse(null, { 
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }
  });
}
