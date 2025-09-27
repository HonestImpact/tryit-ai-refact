import { NextRequest, NextResponse } from 'next/server';
import { AI_CONFIG } from '@/lib/ai-config';
import { createLogger } from '@/lib/logger';
import { ArtifactService } from '@/lib/artifact-service';
import { withLogging, LoggingContext } from '@/lib/logging-middleware';
import { createLLMProvider } from '@/lib/providers/provider-factory';

const logger = createLogger('noah-chat');

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

    // Call LLM provider (respects LLM environment variable)
    logger.info('🧠 Calling LLM provider...');
    const llmProvider = createLLMProvider();
    const generatePromise = llmProvider.generateText({
      messages: messages.map((msg: any) => ({ 
        role: msg.role, 
        content: msg.content 
      })),
      system: AI_CONFIG.CHAT_SYSTEM_PROMPT,
      model: AI_CONFIG.getModel(), // Use configured model
      temperature: 0.7
    });

    const result = await withTimeout(generatePromise, NOAH_TIMEOUT);
    
    const responseTime = Date.now() - startTime;
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