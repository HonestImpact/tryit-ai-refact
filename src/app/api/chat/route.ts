import { NextRequest, NextResponse } from 'next/server';
import { anthropic } from '@ai-sdk/anthropic';
import { generateText } from 'ai';
import { AI_CONFIG } from '@/lib/ai-config';
import { createLogger } from '@/lib/logger';
import { ArtifactService } from '@/lib/artifact-service';
import { withLogging, LoggingContext } from '@/lib/logging-middleware';

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

    // Call Anthropic API with timeout protection
    logger.info('🧠 Calling Anthropic API...');
    const generatePromise = generateText({
      model: anthropic(AI_CONFIG.getModel()),
      messages: messages,
      system: AI_CONFIG.CHAT_SYSTEM_PROMPT, // Noah's full persona
      temperature: 0.7
    });

    const result = await withTimeout(generatePromise, NOAH_TIMEOUT);
    
    const responseTime = Date.now() - startTime;
    logger.info('✅ Noah response generated', { 
      responseLength: result.text.length,
      responseTime 
    });

    // Process response for artifacts using existing system
    const parsed = await ArtifactService.handleArtifactWorkflow(
      result.text,
      lastMessage,
      context.sessionId
    );

    const response: ChatResponse = {
      content: parsed.cleanContent || result.text,
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
    // Quick test of Anthropic API
    const testPromise = generateText({
      model: anthropic(AI_CONFIG.getModel()),
      messages: [{ role: 'user', content: 'test' }],
      system: 'Respond with just "ok"'
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
